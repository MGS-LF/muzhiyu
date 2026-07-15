// EdgeOne Pages Node Functions 共享配置
// 密钥通过环境变量注入（EOP 控制台设置 DEEPSEEK_API_KEY, MIMO_API_KEY）

function looksReal(k) {
  return typeof k === 'string' && k.length > 12 && !/在此填入|填入/.test(k);
}

function envStr(key, fallback = '') {
  return (typeof process !== 'undefined' && process.env[key]) || fallback;
}

export const CFG = {
  llm: {
    apiKey: envStr('DEEPSEEK_API_KEY', ''),
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  tts: {
    apiKey: envStr('MIMO_API_KEY', ''),
    baseUrl: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.5-tts',
    defaultVoice: 'Chloe',
    sampleRate: 24000,
  },
};

export const LLM_OK = () => looksReal(CFG.llm.apiKey);
export const TTS_OK = () => looksReal(CFG.tts.apiKey);

// ---------- 内存 LRU 缓存（替代本地文件缓存，适用于 Serverless）----------
const CACHE = new Map();
const CACHE_MAX = 50;

export function cacheGet(key) {
  if (!CACHE.has(key)) return null;
  const val = CACHE.get(key);
  // 移到末尾（最近使用）
  CACHE.delete(key);
  CACHE.set(key, val);
  return val;
}

export function cacheSet(key, pcmBuffer) {
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    CACHE.delete(oldest);
  }
  CACHE.set(key, pcmBuffer);
}

// ---------- 速率限制 ----------
const rateBuckets = new Map();
export function rateLimit(key, max, windowMs = 60000) {
  // 本地生成 TTS 缓存时不限速（环境变量 SKIP_RATE_LIMIT=1）
  if (process.env.SKIP_RATE_LIMIT === '1') return true;
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }
  bucket.count++;
  return bucket.count <= max;
}

// ---------- 辅助函数 ----------
export function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  return new Response(body, {
    status: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function ttsKey({ text, voice, style, model }) {
  const s = `${model || CFG.tts.model}|${voice}|${style}|${text}`;
  // 简单 hash（Node Functions 可能没有 crypto，用基本字符串 hash）
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}
