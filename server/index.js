// 《墓之语》AI 接入服务器入口
// 职责：1) 托管静态游戏文件  2) 代理 LLM  3) 代理 TTS + 缓存
import http from 'node:http';
import path from 'node:path';
import { PORT, CFG, LLM_OK, TTS_OK, CACHE_DIR, ROOT, sendJSON } from './config.js';
import { handleLLM } from './routes/llm.js';
import { handleTTS } from './routes/tts.js';
import { handleHealth, handleStatic } from './routes/static.js';

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const p = u.pathname;
    if (p === '/api/health') return handleHealth(res);
    if (p === '/api/llm' && req.method === 'POST') return await handleLLM(req, res);
    if (p === '/api/tts' && req.method === 'POST') return await handleTTS(req, res);
    if (p.startsWith('/api/')) return sendJSON(res, 404, { error: 'unknown api' });
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end();
      return;
    }
    return await handleStatic(req, res, p);
  } catch (e) {
    if (!res.headersSent) sendJSON(res, 500, { error: String((e && e.message) || e) });
    else
      try {
        res.end();
      } catch {
        /* ignore */
      }
  }
});

server.listen(PORT, () => {
  console.log(`\n  墓之语 · AI 服务器已启动`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(
    `  LLM(${CFG.llm.model}): ${LLM_OK() ? '已配置' : '未配置(降级)'}   TTS(${CFG.tts.model}): ${TTS_OK() ? '已配置' : '未配置(降级)'}`
  );
  console.log(`  TTS 缓存目录: ${path.relative(ROOT, CACHE_DIR)}\n`);
});
