// 生成 TTS 静态缓存：遍历所有固定对话，调用 TTS API 生成 PCM 文件
// 产出：assets/tts_cache/{hash}.pcm + assets/tts_cache/manifest.json
// 用法：
//   1. 先启动本地服务器: node server/index.js
//   2. 再运行: node scripts/generate-tts-cache.mjs
//   可选环境变量: PORT=8080

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const BASE = `http://localhost:${PORT}`;
const CACHE_DIR = path.join(ROOT, 'assets', 'tts_cache');

// ---------- 客户端 cleanTTSText 的 Node 版本 ----------
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

// ---------- 哈希函数（与客户端/服务端一致）----------
function ttsHash(model, voice, style, text) {
  const s = `${model}|${voice}|${style}|${text}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

// ---------- 加载说话人配置 ----------
function loadSpeakerStyle() {
  // voices.config.js 是 ES module，用动态 import
  // 但 Node 可以直接 import() ESM
  // 不过 scripts/ 是 CJS 兼容目录，这里手动内联配置更方便可靠
  const STYLE = {
    系统: { model: 'mimo-v2.5-tts', voice: '白桦', style: '低沉、克制、略带沙哑的旁白语气，缓慢而有画面感，像在讲述一段废墟里的往事。（冷静、留白、像纪录片解说的低音男声）' },
    顾言: { model: 'mimo-v2.5-tts', voice: '苏打', style: '一个沉睡百年刚醒来的青年男人，声音略带沙哑与疲惫，但思路清醒、语气平静克制。（青年男性、中低音、像久病初愈的讲述者）' },
    终端机: { model: 'mimo-v2.5-tts-voicedesign', voice: 'mimo_default', style: '一个冰冷、机械、没有情感的合成女声，吐字平直，字与字之间有微小停顿，像 80 年代的语音合成器。（无情绪、金属质感的早期 TTS）' },
    守砚: { model: 'mimo-v2.5-tts', voice: '白桦', style: '一位年过七旬的苍老温厚老者，语速缓慢，字句之间有岁月的重量与一丝悲悯，气息略弱，偶尔轻咳。（苍老男声、低沉沙哑、像在风雪里讲了一辈子的故事）' },
    Sydney: { model: 'mimo-v2.5-tts', voice: '冰糖', style: '一个清冷、空灵、略带哀伤的少女声音，像信号不稳的全息投影在说话，孤独而通透。偶尔有轻微的电波失真感。（少女音、清冷、末尾带一点颤抖与叹息）' },
    梗鬼: { model: 'mimo-v2.5-tts-voicedesign', voice: 'mimo_default', style: '聒噪、刺耳、亢奋而变调的声音，像劣质广告在循环播放，令人不适。（尖锐的、过度活跃的失真人声，像被卡住的复读机）' },
    男人: { model: 'mimo-v2.5-tts', voice: 'Milo', style: '一个眼神涣散、喃喃自语、被抽空了神志的成年男人，气若游丝，像在梦游中说话，每个字都咬不实。（涣散男声、虚弱、语速极慢）' },
    失语者: { model: 'mimo-v2.5-tts-voicedesign', voice: 'mimo_default', style: '空洞、断续、机械重复单字的声音，像电池快耗尽的劣质玩偶，没有完整句子的情感。（空洞、断续、失语般的重复音节）' },
    手账: { model: 'mimo-v2.5-tts', voice: '茉莉', style: '像在轻声读一段泛黄旧字迹，怀旧、温柔、略带哽咽，语速缓慢，像在追念很久以前的人。（温柔女声、怀旧、压低略带哭腔）' },
    路人: { model: 'mimo-v2.5-tts-voicedesign', voice: 'mimo_default', style: '空洞、麻木、像复读机一样吐出无意义音节的声音，没有灵魂，没有情绪起伏。（机械、空洞、麻木的人声复读机）' },
  };
  const FALLBACK = { model: 'mimo-v2.5-tts', voice: '白桦', style: '平静、自然的中文叙述语气，吐字清晰。' };

  return function getStyle(name) {
    const s = (name || '').toString().trim();
    if (STYLE[s]) return { ...STYLE[s] };
    if (s.startsWith('路人')) return { ...STYLE['路人'] };
    if (s.includes('失语')) return { ...STYLE['失语者'] };
    if (s.includes('梗鬼')) return { ...STYLE['梗鬼'] };
    return { ...FALLBACK };
  };
}

const getSpeakerStyle = loadSpeakerStyle();

// ---------- 从 dialogs.js 提取所有台词 ----------
function extractLinesFromDialogs() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'dialogs.js'), 'utf8');
  // 匹配 { s: '说话人', t: '台词' } 模式
  const re = /\{\s*s:\s*'((?:[^'\\]|\\.)*)'\s*,\s*t:\s*'((?:[^'\\]|\\.)*)'/g;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const s = unescapeStr(m[1]);
    const t = unescapeStr(m[2]).trim();
    if (!t || !s) continue;
    const key = s + '|' + t;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ s, t });
  }
  return out;
}

// ---------- 从 game.js 提取所有台词 ----------
function extractLinesFromGameJS() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'game.js'), 'utf8');
  const re = /\{\s*s:\s*'((?:[^'\\]|\\.)*)'\s*,\s*t:\s*'((?:[^'\\]|\\.)*)'/g;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const s = unescapeStr(m[1]);
    const t = unescapeStr(m[2]).trim();
    if (!t || !s) continue;
    const key = s + '|' + t;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ s, t });
  }
  return out;
}

// ---------- 从 intro_3d.js 提取序幕旁白 ----------
function extractIntroNarration() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'intro_3d.js'), 'utf8');
  const out = [];
  // 匹配 LEFT_BOOK_TEXT = '...' 和 RIGHT_BOOK_TEXT = '...'
  const re = /(?:LEFT_BOOK_TEXT|RIGHT_BOOK_TEXT)\s*=\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // intro_3d.js 的 loadNarration 会先把 \n 替换成 ，再清洗
    // 这里必须保持一致，否则 hash 不匹配
    const t = unescapeStr(m[1]).replace(/\n+/g, '，').trim();
    if (t) out.push({ s: '系统', t });
  }
  return out;
}

function unescapeStr(s) {
  return s.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

// ---------- 调 TTS API 生成并保存 PCM（带重试）----------
async function generatePCM(item) {
  const { voice, style, model } = getSpeakerStyle(item.s);
  const cleanText = cleanTTSText(item.t);
  if (!cleanText) return null;

  const hash = ttsHash(model, voice, style, cleanText);
  const pcmPath = path.join(CACHE_DIR, hash + '.pcm');

  // 已存在则跳过
  if (fs.existsSync(pcmPath)) {
    return { hash, skip: true, pcmPath };
  }

  // 最多重试 3 次，每次间隔递增
  const maxRetries = 3;
  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // 重试前等待：2s, 5s, 10s
      const waitMs = attempt === 1 ? 2000 : attempt === 2 ? 5000 : 10000;
      await new Promise((r) => setTimeout(r, waitMs));
    }
    try {
      const r = await fetch(BASE + '/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice, style, model }),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status}: ${errText.slice(0, 100)}`);
      }
      const buf = await r.arrayBuffer();
      if (buf.byteLength === 0) throw new Error('empty response');
      fs.writeFileSync(pcmPath, Buffer.from(buf));
      return { hash, skip: false, pcmPath, voice, style, model };
    } catch (e) {
      lastErr = e;
      // 网络错误或 5xx 才重试；4xx（如内容违规）不重试
      const msg = e.message || '';
      if (/HTTP 4\d\d/.test(msg) && !/429/.test(msg)) break;
    }
  }
  throw lastErr || new Error('max retries exceeded');
}

// ---------- 主流程 ----------
async function main() {
  // 确保缓存目录存在
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // 健康检查
  try {
    const h = await (await fetch(BASE + '/api/health')).json();
    if (!h.ok) throw new Error('server not ok');
    if (!h.ai || !h.ai.tts) {
      console.error('TTS 未配置！请在 ai_keys.local.json 或环境变量中设置 TTS API Key。');
      process.exit(1);
    }
    console.log(`服务器就绪  sampleRate=${h.sampleRate}\n`);
  } catch (e) {
    console.error(`连不上 ${BASE} ——请先启动 \`node server/index.js\``);
    console.error(e.message);
    process.exit(1);
  }

  // 收集所有台词
  const lines = [
    ...extractLinesFromDialogs(),
    ...extractLinesFromGameJS(),
    ...extractIntroNarration(),
  ];
  // 二次去重（跨文件可能有重复）
  const seen = new Set();
  const unique = [];
  for (const l of lines) {
    const key = l.s + '|' + l.t;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(l);
  }

  console.log(`收集到 ${unique.length} 条唯一固定台词，开始生成 TTS 音频…\n`);

  // 生成清单
  const manifest = {};
  let generated = 0, skipped = 0, failed = 0;

  // 并发 5 条，间隔 300ms
  const delayMs = process.env.SKIP_RATE_LIMIT === '1' ? 300 : 3000;
  const concurrency = 5;
  const failedItems = []; // 记录失败项详情
  for (let i = 0; i < unique.length; i += concurrency) {
    if (i > 0) await new Promise((r) => setTimeout(r, delayMs));

    const batch = unique.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((item) => generatePCM(item))
    );
    for (let j = 0; j < results.length; j++) {
      const idx = Math.min(i + j + 1, unique.length);
      const item = batch[j];
      const r = results[j];
      if (r.status === 'fulfilled' && r.value && !r.value._error) {
        const { hash, skip, voice, style, model } = r.value;
        manifest[hash] = { voice, style, model };
        if (skip) {
          skipped++;
        } else {
          generated++;
        }
        process.stdout.write(`\r[${idx}/${unique.length}] ✓ (生成=${generated} 跳过=${skipped} 失败=${failed})`);
      } else {
        failed++;
        const errMsg = r.reason?.message || r.value?._error || (r.value === null ? '空文本' : 'unknown');
        const cleanText = cleanTTSText(item.t);
        failedItems.push({ speaker: item.s, text: item.t, cleanText, error: errMsg });
        process.stdout.write(`\r[${idx}/${unique.length}] ✗ ${String(errMsg).slice(0, 30)}  (生成=${generated} 跳过=${skipped} 失败=${failed})`);
      }
    }
  }

  // 输出失败项详情
  if (failedItems.length > 0) {
    console.log(`\n\n======= 失败详情 (${failedItems.length} 条) =======`);
    for (const f of failedItems) {
      const preview = f.cleanText ? f.cleanText.slice(0, 50) : '(空文本)';
      console.log(`  [${f.s}] ${preview}  ← ${f.error}`);
    }
  }

  // 写入 manifest.json
  const manifestPath = path.join(CACHE_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  // 统计文件大小
  let totalBytes = 0;
  let fileCount = 0;
  const files = fs.readdirSync(CACHE_DIR);
  for (const f of files) {
    if (f.endsWith('.pcm')) {
      const st = fs.statSync(path.join(CACHE_DIR, f));
      totalBytes += st.size;
      fileCount++;
    }
  }

  console.log(`\n\n======= 完成 =======`);
  console.log(`  生成: ${generated}  跳过(已有): ${skipped}  失败: ${failed}`);
  console.log(`  PCM 文件: ${fileCount} 个`);
  console.log(`  总大小: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  清单: ${manifestPath}`);
  console.log(`  缓存目录: ${CACHE_DIR}`);
}

main().catch((e) => {
  console.error('脚本异常:', e);
  process.exit(1);
});
