// 预热 TTS 缓存：扫描 src/game.js 里的静态台词，逐条请求 /api/tts 生成并落盘。
// 用法：先 `node server.js`，再另开终端 `node scripts/prewarm.mjs`
//      指定端口：`PORT=9000 node scripts/prewarm.mjs`
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { speakerStyle } from '../src/ai/speakers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const BASE = `http://localhost:${PORT}`;

function unescape(s) {
  return s.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

// 从 game.js 文本里提取 { s: '说话人', t: '台词' } 对
function extractLines() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'game.js'), 'utf8');
  const re = /\{\s*s:\s*'((?:[^'\\]|\\.)*)'\s*,\s*t:\s*'((?:[^'\\]|\\.)*)'/g;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const s = unescape(m[1]);
    const t = unescape(m[2]).trim();
    if (!t) continue;
    const key = s + '|' + t;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ s, t });
  }
  return out;
}

async function warm(line) {
  const { voice, style, model } = speakerStyle(line.s);
  const r = await fetch(BASE + '/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: line.t, voice, style, model }),
  });
  if (!r.ok) throw new Error('http ' + r.status);
  const cache = r.headers.get('X-Cache') || '?';
  // 读完整流（落盘在服务端完成）
  await r.arrayBuffer();
  return cache;
}

async function main() {
  // 健康检查
  try {
    const h = await (await fetch(BASE + '/api/health')).json();
    if (!h.ai || !h.ai.tts) {
      console.error('TTS 未配置或服务器未就绪，无法预热。');
      process.exit(1);
    }
  } catch (e) {
    console.error(`连不上 ${BASE} ——请先 \`node server.js\`。`, e.message);
    process.exit(1);
  }
  const lines = extractLines();
  console.log(`待预热台词：${lines.length} 条`);
  let hit = 0,
    miss = 0,
    fail = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    try {
      const c = await warm(ln);
      if (c === 'HIT') hit++;
      else miss++;
      process.stdout.write(`\r[${i + 1}/${lines.length}] HIT=${hit} MISS=${miss} FAIL=${fail}  `);
    } catch (e) {
      fail++;
      console.warn(`\n失败：「${ln.t.slice(0, 16)}…」 ${e.message}`);
    }
  }
  console.log(`\n完成。HIT=${hit} MISS=${miss} FAIL=${fail}`);
}

main();
