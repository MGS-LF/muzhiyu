// EdgeOne Pages Node Function — POST /api/tts (MiMo TTS 代理 + 内存 LRU 缓存)
import { CFG, TTS_OK, sendJSON, rateLimit, cacheGet, cacheSet, ttsKey } from '../_config.js';

const ALLOWED_MODELS = new Set([
  'mimo-v2.5-tts',
  'mimo-v2.5-tts-voicedesign',
  'mimo-v2.5-tts-voiceclone',
]);

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  // 速率限制
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`tts:${ip}`, 20, 60000)) {
    return sendJSON(null, 429, { error: '请求过于频繁，请稍后再试' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return sendJSON(null, 400, { error: 'bad json' });
  }

  const text = (body.text || '').toString();
  if (!text.trim()) {
    return sendJSON(null, 400, { error: 'empty text' });
  }
  const voice = (body.voice || CFG.tts.defaultVoice).toString();
  const style = (body.style || '平静、自然的中文叙述语气。').toString();
  const reqModel = (body.model || '').toString();
  const model = ALLOWED_MODELS.has(reqModel) ? reqModel : CFG.tts.model;
  const key = ttsKey({ text, voice, style, model });

  // 内存缓存命中
  const cached = cacheGet(key);
  if (cached) {
    // _cacheOnly 模式：只缓存不返回流（预热用）
    if (body._cacheOnly) {
      return sendJSON(null, 200, { cached: true });
    }
    return new Response(cached, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Cache': 'HIT',
        'X-Sample-Rate': String(CFG.tts.sampleRate),
        'Cache-Control': 'no-store',
      },
    });
  }

  if (!TTS_OK()) {
    return sendJSON(null, 503, { error: 'TTS 未配置 key（请在 EOP 控制台设置 MIMO_API_KEY）' });
  }

  // 未命中：调 MiMo API
  const audio = { format: 'pcm16' };
  if (model !== 'mimo-v2.5-tts-voicedesign') audio.voice = voice;
  const payload = {
    model,
    messages: [
      { role: 'user', content: style },
      { role: 'assistant', content: text },
    ],
    audio,
    stream: true,
  };

  const upstreamUrl = CFG.tts.baseUrl.replace(/\/$/, '') + '/chat/completions';

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': CFG.tts.apiKey,
        Authorization: 'Bearer ' + CFG.tts.apiKey,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
    });

    if (upstream.status !== 200) {
      const detail = await upstream.text().catch(() => '');
      return sendJSON(null, 502, {
        error: 'tts upstream ' + upstream.status,
        detail: detail.slice(0, 300),
      });
    }

    // 收集完整 PCM 用于缓存
    const pcmChunks = [];
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // 后台异步解析 SSE
    parseSSE(upstream.body, writer, pcmChunks).catch((e) => {
      writer.close().catch(() => {});
    });

    // _cacheOnly 模式：只缓存不返回流，节省带宽
    if (body._cacheOnly) {
      // 等待流结束，缓存后返回简单确认
      const allPcm = await collectStream(readable);
      if (allPcm && allPcm.length > 0) {
        cacheSet(key, allPcm);
      }
      return sendJSON(null, 200, { cached: true });
    }

    // 正常模式：流式返回，同时后台缓存
    const response = new Response(readable, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Cache': 'MISS',
        'X-Sample-Rate': String(CFG.tts.sampleRate),
        'Cache-Control': 'no-store',
      },
    });

    // 流结束后缓存完整 PCM
    response.clone().arrayBuffer().then((buf) => {
      if (buf && buf.byteLength > 0) {
        cacheSet(key, new Uint8Array(buf));
      }
    }).catch(() => {});

    return response;
  } catch (e) {
    return sendJSON(null, 502, { error: 'tts connect: ' + e.message });
  }
}

// 收集整个 ReadableStream 为 Uint8Array
async function collectStream(readable) {
  const reader = readable.getReader();
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length > 0) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (chunks.length === 0) return null;
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const full = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    full.set(c, offset);
    offset += c.length;
  }
  return full;
}

// 解析 MiMo SSE 流，提取 base64 PCM16 音频数据
async function parseSSE(readable, writer, pcmChunks) {
  const decoder = new TextDecoder();
  const reader = readable.getReader();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);

        if (!line.startsWith('data:')) continue;
        const payloadStr = line.slice(5).trim();
        if (payloadStr === '[DONE]') continue;

        let obj;
        try {
          obj = JSON.parse(payloadStr);
        } catch {
          continue;
        }
        const b64 = obj?.choices?.[0]?.delta?.audio?.data;
        if (b64) {
          const pcm = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          pcmChunks.push(pcm);
          await writer.write(pcm);
        }
      }
    }
  } catch (e) {
    // 流被中断，忽略
  } finally {
    try {
      await writer.close();
    } catch {
      /* ignore */
    }
    reader.releaseLock();
  }
}
