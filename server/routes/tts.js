// /api/tts — 缓存 + 代理小米 MiMo TTS
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import { URL } from 'node:url';
import {
  CFG,
  TTS_OK,
  CACHE_DIR,
  sendJSON,
  readBody,
  ttsKey,
  rateLimit,
} from '../config.js';

const ALLOWED_MODELS = new Set([
  'mimo-v2.5-tts',
  'mimo-v2.5-tts-voicedesign',
  'mimo-v2.5-tts-voiceclone',
]);

export async function handleTTS(req, res) {
  const ip = req.socket.remoteAddress || 'unknown';
  if (!rateLimit(`tts:${ip}`, 20, 60000)) {
    sendJSON(res, 429, { error: '请求过于频繁，请稍后再试' });
    return;
  }
  let body;
  try {
    body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
  } catch {
    sendJSON(res, 400, { error: 'bad json' });
    return;
  }

  const text = (body.text || '').toString();
  if (!text.trim()) {
    sendJSON(res, 400, { error: 'empty text' });
    return;
  }
  const voice = (body.voice || CFG.tts.defaultVoice).toString();
  const style = (body.style || '平静、自然的中文叙述语气。').toString();
  const reqModel = (body.model || '').toString();
  const model = ALLOWED_MODELS.has(reqModel) ? reqModel : CFG.tts.model;
  const key = ttsKey({ text, voice, style, model });
  const file = path.join(CACHE_DIR, key + '.pcm');

  // 命中：直接流文件
  try {
    const stat = await fsp.stat(file);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
      'X-Cache': 'HIT',
      'X-Sample-Rate': String(CFG.tts.sampleRate),
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
    return;
  } catch {
    /* 未命中，继续生成 */
  }

  if (!TTS_OK()) {
    sendJSON(res, 503, { error: 'TTS 未配置 key' });
    return;
  }

  // 未命中：调 MiMo 流式，边发客户端边落盘
  const tmp = file + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  const out = fs.createWriteStream(tmp);
  let wroteHeader = false;
  let aborted = false;
  let sseBuf = '';

  const cleanupTmp = () => {
    out.close(() => fs.unlink(tmp, () => {}));
  };

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
  const u = new URL(CFG.tts.baseUrl.replace(/\/$/, '') + '/chat/completions');
  const data = Buffer.from(JSON.stringify(payload));

  const up = https.request(
    {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': CFG.tts.apiKey,
        Authorization: 'Bearer ' + CFG.tts.apiKey,
        'Content-Length': data.length,
        Accept: 'text/event-stream',
      },
    },
    (upRes) => {
      if ((upRes.statusCode || 0) !== 200) {
        let errBuf = '';
        upRes.on('data', (d) => (errBuf += d.toString()));
        upRes.on('end', () => {
          cleanupTmp();
          if (!res.headersSent)
            sendJSON(res, 502, {
              error: 'tts upstream ' + upRes.statusCode,
              detail: errBuf.slice(0, 300),
            });
          else res.end();
        });
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'X-Cache': 'MISS',
        'X-Sample-Rate': String(CFG.tts.sampleRate),
        'Cache-Control': 'no-store',
      });
      wroteHeader = true;

      upRes.setEncoding('utf8');
      upRes.on('data', (chunk) => {
        sseBuf += chunk;
        let nl;
        while ((nl = sseBuf.indexOf('\n')) >= 0) {
          let line = sseBuf.slice(0, nl);
          sseBuf = sseBuf.slice(nl + 1);
          line = line.trim();
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
            const pcm = Buffer.from(b64, 'base64');
            out.write(pcm);
            res.write(pcm);
          }
        }
      });
      upRes.on('end', () => {
        if (aborted) {
          cleanupTmp();
          return;
        }
        out.end(() => {
          fs.rename(tmp, file, (err) => {
            if (err) fs.unlink(tmp, () => {});
          });
        });
        res.end();
      });
      upRes.on('error', () => {
        cleanupTmp();
        res.end();
      });
    }
  );

  up.on('error', (e) => {
    cleanupTmp();
    if (!wroteHeader && !res.headersSent)
      sendJSON(res, 502, { error: 'tts connect: ' + e.message });
    else res.end();
  });
  req.on('close', () => {
    if (res.writableEnded) return;
    aborted = true;
    up.destroy();
    cleanupTmp();
  });
  up.end(data);
}
