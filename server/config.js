// 服务器配置与工具函数
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const CACHE_DIR = path.join(ROOT, 'cache', 'tts');
export const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// ---------- 配置加载 ----------
function looksReal(k) {
  return typeof k === 'string' && k.length > 12 && !/在此填入|填入/.test(k);
}

function expandEnv(obj) {
  if (typeof obj === 'string')
    return obj.replace(/\$\{(\w+)\}/g, (_, n) =>
      Object.hasOwn(process.env, n) ? process.env[n] : ''
    );
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
    try {
      cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'ai_keys.example.json'), 'utf8'));
    } catch {
      cfg = {};
    }
  }
  cfg = expandEnv(cfg);
  cfg.llm = cfg.llm || {};
  cfg.tts = cfg.tts || {};
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

export const CFG = loadConfig();
export const LLM_OK = () => looksReal(CFG.llm.apiKey);
export const TTS_OK = () => looksReal(CFG.tts.apiKey);

fs.mkdirSync(CACHE_DIR, { recursive: true });

// ---------- 工具 ----------
export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.map': 'application/json',
};

export function readBody(req, limit = 1 << 20) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function sendJSON(res, code, obj) {
  const buf = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buf.length,
  });
  res.end(buf);
}

export function ttsKey({ text, voice, style, model }) {
  const h = crypto.createHash('sha1');
  h.update(`${model || CFG.tts.model}|${voice}|${style}|${text}`);
  return h.digest('hex');
}

// ---------- 速率限制（内存计数，按 key 维度，时间窗口）----------
const rateBuckets = new Map();
export function rateLimit(key, max, windowMs = 60000) {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= max;
}
