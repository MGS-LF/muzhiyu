// 流式语音播放器
// 固定对话 → 从 assets/tts_cache/{hash}.pcm 本地加载（零延迟，不耗 API）
// LLM 生成文本 → 实时调 /api/tts（流式边下边播）

import { AI } from './config.js';

// -------- 文本清洗：去除 TTS 不该读出来的标点 --------
function cleanTTSText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/（[^）]*?）/g, '')
    .replace(/\([^)]*?\)/g, '')
    .replace(/《[^》]*?》/g, '')
    .replace(/「/g, '').replace(/」/g, '')
    .replace(/"/g, '')
    .replace(/>[^<]*?</g, '')
    .replace(/[\s\n\r]+/g, ' ')
    .trim();
}

// -------- 哈希函数（与服务端 node-functions/_config.js 的 ttsKey 算法一致）--------
function ttsHash(model, voice, style, text) {
  const s = `${model}|${voice}|${style}|${text}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

class VoicePlayer {
  constructor() {
    this.ctx = null;
    this.token = 0;
    this.playing = false;
    this.sources = [];
    this.nextStartTime = 0;
    this.scheduled = 0;
    this.ended = 0;
    this.streamDone = false;
    this.finishedFired = false;
    this.onEnded = null;
    this.abort = null;
    this.leftover = null;

    // 静态 TTS 缓存清单（{ hash: { voice, style, model } }）
    this._manifest = null;
    this._manifestPromise = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  isBusy() {
    return this.playing;
  }

  stop() {
    this.token++;
    this.playing = false;
    this.streamDone = true;
    this.finishedFired = true;
    if (this.abort) {
      try { this.abort.abort(); } catch { /* ignore */ }
      this.abort = null;
    }
    for (const s of this.sources) {
      try { s.onended = null; s.stop(); s.disconnect(); } catch { /* ignore */ }
    }
    this.sources = [];
    this.nextStartTime = 0;
    this.scheduled = 0;
    this.ended = 0;
    this.leftover = null;
    this.onEnded = null;
  }

  // -------- 加载静态缓存清单（assets/tts_cache/manifest.json）--------
  _loadManifest() {
    if (this._manifestPromise) return this._manifestPromise;
    this._manifestPromise = (async () => {
      try {
        const r = await fetch('assets/tts_cache/manifest.json');
        if (!r.ok) throw new Error('manifest not found');
        this._manifest = await r.json();
      } catch {
        this._manifest = {}; // 没有缓存清单，降级为纯 API 模式
      }
    })();
    return this._manifestPromise;
  }

  // -------- 主入口：speak --------
  // 优先从 assets/tts_cache/ 加载本地 PCM；未命中则调 /api/tts
  speak(text, { voice: v, style, model } = {}, onEnded) {
    const cleanText = cleanTTSText(text);
    if (!AI.tts || !cleanText) return;

    this.stop(); // 先停掉上一句（内部会 ++token）
    const myToken = ++this.token; // 再取新 token，确保不会被 stop 抢断

    // 尝试本地静态缓存
    const hash = ttsHash(model || 'mimo-v2.5-tts', v, style, cleanText);
    const localUrl = `assets/tts_cache/${hash}.pcm`;
    this._tryPlayLocal(localUrl, onEnded, myToken, cleanText, { voice: v, style, model });
  }

  // 尝试从本地加载 PCM，失败则回退到 API
  async _tryPlayLocal(localUrl, onEnded, myToken, cleanText, voiceCfg) {
    // 等待 manifest 加载（如果有的话）
    await this._loadManifest();

    if (myToken !== this.token) return; // 已被抢断

    // 检查 manifest 中是否有这个 hash
    const hash = localUrl.match(/([a-f0-9]+)\.pcm$/)?.[1];
    if (hash && this._manifest && this._manifest[hash]) {
      try {
        const r = await fetch(localUrl);
        if (r.ok) {
          const buf = await r.arrayBuffer();
          if (myToken !== this.token) return;
          this._playLocalPcm(new Uint8Array(buf), onEnded, myToken);
          return;
        }
      } catch {
        // 本地文件不存在，走 API 回退
      }
    }

    // 回退：调 /api/tts
    if (myToken !== this.token) return;
    this._playFromAPI(cleanText, voiceCfg, onEnded, myToken);
  }

  // 播放完整的本地 PCM 音频（非流式，一次性加载）
  _playLocalPcm(pcmBytes, onEnded, myToken) {
    const ctx = this._ensureCtx();
    if (!ctx) return;

    this.playing = true;
    this.streamDone = true;
    this.finishedFired = false;
    this.onEnded = onEnded || null;
    this.scheduled = 1;
    this.ended = 0;
    this.nextStartTime = 0;
    this.leftover = null;

    // 处理对齐
    const usableLen = pcmBytes.length - (pcmBytes.length % 2);
    const aligned = new Uint8Array(usableLen);
    aligned.set(pcmBytes.subarray(0, usableLen));
    const int16 = new Int16Array(aligned.buffer, 0, usableLen / 2);
    const sampleRate = AI.sampleRate || 24000;
    const n = int16.length;
    const f32 = new Float32Array(n);
    for (let i = 0; i < n; i++) f32[i] = int16[i] / 32768;

    const audioBuf = ctx.createBuffer(1, n, sampleRate);
    audioBuf.getChannelData(0).set(f32);
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);

    let rate = 1;
    try {
      const r = window.__kehengPlaybackRate;
      if (typeof r === 'number' && r > 0) rate = Math.max(0.5, Math.min(2, r));
    } catch { /* ignore */ }
    src.playbackRate.value = rate;

    src.start(0);
    this.sources.push(src);
    src.onended = () => {
      if (myToken !== this.token) return;
      this.ended++;
      this._maybeFinish(myToken);
    };
  }

  // 从 /api/tts 流式播放（用于 LLM 生成的动态文本）
  _playFromAPI(cleanText, { voice: v, style, model }, onEnded, myToken) {
    this.playing = true;
    this.streamDone = false;
    this.finishedFired = false;
    this.onEnded = onEnded || null;
    this.scheduled = 0;
    this.ended = 0;
    this.nextStartTime = 0;
    this.leftover = null;

    this.abort = new AbortController();
    fetch(AI.apiBase + '/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, voice: v, style, model }),
      signal: this.abort.signal,
    })
      .then(async (resp) => {
        if (!resp.ok || !resp.body) throw new Error('tts http ' + resp.status);
        const sr = Number(resp.headers.get('X-Sample-Rate')) || AI.sampleRate || 24000;
        const reader = resp.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (myToken !== this.token) return;
          if (done) break;
          if (value && value.length) this._enqueue(value, sr, myToken);
        }
        this.streamDone = true;
        this._maybeFinish(myToken);
      })
      .catch((e) => {
        if (myToken !== this.token) return;
        console.warn('[voice] API 播放失败，降级为手动推进：', e.message);
        this.playing = false;
        this.streamDone = true;
      });
  }

  // 把一段 PCM 字节排期播放（流式用）
  _enqueue(bytes, sampleRate, myToken) {
    let buf = bytes;
    if (this.leftover) {
      const merged = new Uint8Array(this.leftover.length + bytes.length);
      merged.set(this.leftover, 0);
      merged.set(bytes, this.leftover.length);
      buf = merged;
      this.leftover = null;
    }
    const usableLen = buf.length - (buf.length % 2);
    if (usableLen < buf.length) this.leftover = buf.slice(usableLen);
    if (usableLen <= 0) return;

    const aligned = new Uint8Array(usableLen);
    aligned.set(buf.subarray(0, usableLen));
    const int16 = new Int16Array(aligned.buffer, 0, usableLen / 2);
    const n = int16.length;
    const f32 = new Float32Array(n);
    for (let i = 0; i < n; i++) f32[i] = int16[i] / 32768;

    const ctx = this.ctx;
    const audioBuf = ctx.createBuffer(1, n, sampleRate);
    audioBuf.getChannelData(0).set(f32);
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);

    let rate = 1;
    try {
      const r = window.__kehengPlaybackRate;
      if (typeof r === 'number' && r > 0) rate = Math.max(0.5, Math.min(2, r));
    } catch { /* ignore */ }
    src.playbackRate.value = rate;
    const startAt = Math.max(this.nextStartTime, ctx.currentTime + (this.scheduled === 0 ? 0.08 : 0.005));
    src.start(startAt);
    this.nextStartTime = startAt + audioBuf.duration / rate;
    this.scheduled++;
    this.sources.push(src);
    src.onended = () => {
      if (myToken !== this.token) return;
      this.ended++;
      this._maybeFinish(myToken);
    };
  }

  _maybeFinish(myToken) {
    if (myToken !== this.token) return;
    if (this.finishedFired) return;
    if (this.streamDone && this.ended >= this.scheduled) {
      this.finishedFired = true;
      this.playing = false;
      const cb = this.onEnded;
      this.onEnded = null;
      if (cb) cb();
    }
  }
}

export const voice = new VoicePlayer();
