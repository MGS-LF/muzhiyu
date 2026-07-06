// 《墓之语》AI 接入服务器 —— 零依赖（仅 Node 内置模块）
// 职责：1) 托管静态游戏文件  2) 代理 DeepSeek LLM（藏 key）
//       3) 代理小米 MiMo TTS，并按 hash 持久缓存音频（生成一次，全员复用）
//
// 运行：node server.js   然后浏览器打开 http://localhost:8080
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CACHE_DIR = path.join(ROOT, 'cache', 'tts');
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// ---------- 配置加载 ----------
function looksReal(k) {
  return typeof k === 'string' && k.length > 12 && !/在此填入|填入/.test(k);
}
function expandEnv(obj) {
  if (typeof obj === 'string')
    return obj.replace(/\$\{(\w+)\}/g, (_, n) => (process.env[n] != null ? process.env[n] : ''));
  if (Array.isArray(obj)) return obj.map(expandEnv);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k in obj) out[k] = expandEnv(obj[k]);
    return out;
  }
  return obj;
}
function loadConfig() {
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'ai_keys.local.json'), 'utf8'));
  } catch {
    try { cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'ai_keys.example.json'), 'utf8')); }
    catch { cfg = {}; }
  }
  cfg = expandEnv(cfg);
  cfg.llm = cfg.llm || {};
  cfg.tts = cfg.tts || {};
  // 环境变量覆盖
  if (process.env.DEEPSEEK_API_KEY) cfg.llm.apiKey = process.env.DEEPSEEK_API_KEY;
  if (process.env.MIMO_API_KEY) cfg.tts.apiKey = process.env.MIMO_API_KEY;
  cfg.llm.baseUrl = cfg.llm.baseUrl || 'https://api.deepseek.com';
  cfg.llm.model = cfg.llm.model || 'deepseek-chat';
  cfg.tts.baseUrl = cfg.tts.baseUrl || 'https://token-plan-cn.xiaomimimo.com/v1';
  cfg.tts.model = cfg.tts.model || 'mimo-v2.5-tts';
  cfg.tts.defaultVoice = cfg.tts.defaultVoice || 'Chloe';
  cfg.tts.sampleRate = cfg.tts.sampleRate || 24000;
  return cfg;
}
let CFG = loadConfig();
const LLM_OK = () => looksReal(CFG.llm.apiKey);
const TTS_OK = () => looksReal(CFG.tts.apiKey);

fs.mkdirSync(CACHE_DIR, { recursive: true });

// ---------- 工具 ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.map': 'application/json',
};

function readBody(req, limit = 1 << 20) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJSON(res, code, obj) {
  const buf = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': buf.length });
  res.end(buf);
}

function ttsKey({ text, voice, style, model }) {
  const h = crypto.createHash('sha1');
  h.update(`${model || CFG.tts.model}|${voice}|${style}|${text}`);
  return h.digest('hex');
}

// ---------- /api/health ----------
function handleHealth(res) {
  sendJSON(res, 200, {
    ok: true,
    ai: { llm: LLM_OK(), tts: TTS_OK() },
    sampleRate: CFG.tts.sampleRate,
  });
}

// ---------- /api/llm （代理 DeepSeek）----------
async function handleLLM(req, res) {
  if (!LLM_OK()) { sendJSON(res, 503, { error: 'LLM 未配置 key' }); return; }
  let body;
  try { body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); }
  catch { sendJSON(res, 400, { error: 'bad json' }); return; }

  const payload = {
    model: body.model || CFG.llm.model,
    messages: body.messages || [],
    temperature: body.temperature ?? 0.9,
    max_tokens: body.max_tokens ?? 800,
    stream: !!body.stream,
  };
  if (body.response_format) payload.response_format = body.response_format;

  const u = new URL(CFG.llm.baseUrl.replace(/\/$/, '') + '/chat/completions');
  const data = Buffer.from(JSON.stringify(payload));
  const up = https.request({
    hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + CFG.llm.apiKey,
      'Content-Length': data.length,
      'Accept': payload.stream ? 'text/event-stream' : 'application/json',
    },
  }, (upRes) => {
    res.writeHead(upRes.statusCode || 200, {
      'Content-Type': upRes.headers['content-type'] || 'application/json',
      'Cache-Control': 'no-store',
    });
    upRes.pipe(res);
  });
  up.on('error', (e) => { if (!res.headersSent) sendJSON(res, 502, { error: 'llm upstream: ' + e.message }); else res.end(); });
  req.on('close', () => up.destroy());
  up.end(data);
}

// ---------- /api/tts （缓存 + 代理 MiMo）----------
async function handleTTS(req, res) {
  let body;
  try { body = JSON.parse((await readBody(req)).toString('utf8') || '{}'); }
  catch { sendJSON(res, 400, { error: 'bad json' }); return; }

  const text = (body.text || '').toString();
  if (!text.trim()) { sendJSON(res, 400, { error: 'empty text' }); return; }
  const voice = (body.voice || CFG.tts.defaultVoice).toString();
  const style = (body.style || '平静、自然的中文叙述语气。').toString();
  // 允许请求体覆盖 model（按说话人路由到不同 TTS 模型）：
  //   mimo-v2.5-tts             预置音色
  //   mimo-v2.5-tts-voicedesign 文本描述生成音色
  //   mimo-v2.5-tts-voiceclone  音频样本复刻
  const ALLOWED_MODELS = new Set([
    'mimo-v2.5-tts',
    'mimo-v2.5-tts-voicedesign',
    'mimo-v2.5-tts-voiceclone',
  ]);
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
  } catch { /* 未命中，继续生成 */ }

  if (!TTS_OK()) { sendJSON(res, 503, { error: 'TTS 未配置 key' }); return; }

  // 未命中：调 MiMo 流式，边发客户端边落盘
  const tmp = file + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  const out = fs.createWriteStream(tmp);
  let wroteHeader = false;
  let aborted = false;
  let sseBuf = '';

  const cleanupTmp = () => { out.close(() => fs.unlink(tmp, () => {})); };

  // 不同 model 对 audio 字段的要求不同：
  //   mimo-v2.5-tts             必须有 audio.voice
  //   mimo-v2.5-tts-voicedesign 不能有 audio.voice（音色由 user prompt 描述）
  //   mimo-v2.5-tts-voiceclone  audio.voice 必填且必须是 data:audio/...;base64,...
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

  const up = https.request({
    hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': CFG.tts.apiKey,
      'Content-Length': data.length,
      'Accept': 'text/event-stream',
    },
  }, (upRes) => {
    if ((upRes.statusCode || 0) !== 200) {
      let errBuf = '';
      upRes.on('data', (d) => errBuf += d.toString());
      upRes.on('end', () => {
        cleanupTmp();
        if (!res.headersSent) sendJSON(res, 502, { error: 'tts upstream ' + upRes.statusCode, detail: errBuf.slice(0, 300) });
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
        try { obj = JSON.parse(payloadStr); } catch { continue; }
        const b64 = obj?.choices?.[0]?.delta?.audio?.data;
        if (b64) {
          const pcm = Buffer.from(b64, 'base64');
          out.write(pcm);
          res.write(pcm);
        }
      }
    });
    upRes.on('end', () => {
      if (aborted) { cleanupTmp(); return; }
      out.end(() => {
        // 原子落盘：完整生成才转正
        fs.rename(tmp, file, (err) => { if (err) fs.unlink(tmp, () => {}); });
      });
      res.end();
    });
    upRes.on('error', () => { cleanupTmp(); res.end(); });
  });

  up.on('error', (e) => {
    cleanupTmp();
    if (!wroteHeader && !res.headersSent) sendJSON(res, 502, { error: 'tts connect: ' + e.message });
    else res.end();
  });
  req.on('close', () => { // 客户端抢断 → 掐上游、弃半截缓存
    if (res.writableEnded) return;
    aborted = true;
    up.destroy();
    cleanupTmp();
  });
  up.end(data);
}

// ---------- 静态文件 ----------
async function handleStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  // 根路径默认进入介绍页；点击"开始游戏"后再进入 intro_3d.html。
  if (rel === '/' || rel === '') rel = '/index.html';
  // 防目录穿越
  const safe = path.normalize(rel).replace(/^(\.\.[\/\\])+/, '');
  const full = path.join(ROOT, safe);
  if (!full.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  // 不外泄密钥/缓存
  if (/(^|[\/\\])(ai_keys\.local\.json|cache)([\/\\]|$)/.test(safe)) { res.writeHead(404); res.end('not found'); return; }
  try {
    const stat = await fsp.stat(full);
    if (stat.isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-cache' });
    fs.createReadStream(full).pipe(res);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}

// ---------- 路由 ----------
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const p = u.pathname;
    if (p === '/api/health') return handleHealth(res);
    if (p === '/api/llm' && req.method === 'POST') return await handleLLM(req, res);
    if (p === '/api/tts' && req.method === 'POST') return await handleTTS(req, res);
    if (p.startsWith('/api/')) return sendJSON(res, 404, { error: 'unknown api' });
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    return await handleStatic(req, res, p);
  } catch (e) {
    if (!res.headersSent) sendJSON(res, 500, { error: String(e && e.message || e) });
    else try { res.end(); } catch {}
  }
});

server.listen(PORT, () => {
  console.log(`\n  墓之语 · AI 服务器已启动`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  LLM(${CFG.llm.model}): ${LLM_OK() ? '已配置' : '未配置(降级)'}   TTS(${CFG.tts.model}): ${TTS_OK() ? '已配置' : '未配置(降级)'}`);
  console.log(`  TTS 缓存目录: ${path.relative(ROOT, CACHE_DIR)}\n`);
});
