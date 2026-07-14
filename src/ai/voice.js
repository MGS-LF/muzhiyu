// 流式语音播放器：低延迟边下边播 + 抢断 + 播完回调（自动续播）
// 服务器 /api/tts 返回连续的 PCM16(单声道,小端) 字节流；这里拼成 Web Audio 播放。

import { AI } from './config.js';

class VoicePlayer {
  constructor() {
    this.ctx = null;
    this.token = 0; // 每次 speak 自增；用于丢弃被抢断的旧回调
    this.playing = false;
    this.sources = [];
    this.nextStartTime = 0;
    this.scheduled = 0;
    this.ended = 0;
    this.streamDone = false;
    this.finishedFired = false;
    this.onEnded = null;
    this.abort = null;
    this.leftover = null; // 跨 chunk 的半个 Int16 字节
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

  // 停止/抢断：掐断网络与所有已排期音频，不触发 onEnded
  stop() {
    this.token++;
    this.playing = false;
    this.streamDone = true;
    this.finishedFired = true;
    if (this.abort) {
      try {
        this.abort.abort();
      } catch {
        /* ignore */
      }
      this.abort = null;
    }
    for (const s of this.sources) {
      try {
        s.onended = null;
        s.stop();
        s.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.sources = [];
    this.nextStartTime = 0;
    this.scheduled = 0;
    this.ended = 0;
    this.leftover = null;
    this.onEnded = null;
  }

  // 念一句。onEnded 在自然播完时触发（被抢断/失败不触发）。
  speak(text, { voice, style, model } = {}, onEnded) {
    if (!AI.tts || !text || !text.trim()) {
      return;
    }
    this.stop(); // 先掐掉上一句
    const myToken = ++this.token;
    this.playing = true;
    this.streamDone = false;
    this.finishedFired = false;
    this.onEnded = onEnded || null;
    this.scheduled = 0;
    this.ended = 0;
    this.nextStartTime = 0;
    this.leftover = null;
    this._ensureCtx();

    this.abort = new AbortController();
    fetch(AI.apiBase + '/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, style, model }),
      signal: this.abort.signal,
    })
      .then(async (resp) => {
        if (!resp.ok || !resp.body) throw new Error('tts http ' + resp.status);
        const sr = Number(resp.headers.get('X-Sample-Rate')) || AI.sampleRate || 24000;
        const reader = resp.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (myToken !== this.token) return; // 已被抢断
          if (done) break;
          if (value && value.length) this._enqueue(value, sr, myToken);
        }
        this.streamDone = true;
        this._maybeFinish(myToken);
      })
      .catch((e) => {
        if (myToken !== this.token) return; // 抢断引发的 abort，忽略
        // 失败：不自动续播，交由玩家手动按 E（保持不卡死）
        console.warn('[voice] 播放失败，降级为手动推进：', e.message);
        this.playing = false;
        this.streamDone = true;
      });
  }

  // 把一段 PCM 字节排期播放
  _enqueue(bytes, sampleRate, myToken) {
    // 处理跨 chunk 的半个采样
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

    // 复制成对齐缓冲，规避 chunk 的 byteOffset 不是 2 的倍数导致 Int16Array 抛错
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
      // 与 BGM 共用设置中的播放倍速（若可用）
      // 动态 import 避免循环依赖；失败则 1x
      const r = window.__kehengPlaybackRate;
      if (typeof r === 'number' && r > 0) rate = Math.max(0.5, Math.min(2, r));
    } catch {
      /* ignore */
    }
    src.playbackRate.value = rate;
    const startAt = Math.max(
      this.nextStartTime,
      ctx.currentTime + (this.scheduled === 0 ? 0.08 : 0.005)
    );
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
