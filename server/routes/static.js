// 静态文件 + 健康检查
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { ROOT, MIME, CFG, LLM_OK, TTS_OK, sendJSON } from '../config.js';

export function handleHealth(res) {
  sendJSON(res, 200, {
    ok: true,
    ai: { llm: LLM_OK(), tts: TTS_OK() },
    sampleRate: CFG.tts.sampleRate,
  });
}

export async function handleStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(ROOT, safe);
  if (!full.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  if (/(^|[/\\])(ai_keys\.local\.json|cache)([/\\]|$)/.test(safe)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  try {
    const stat = await fsp.stat(full);
    if (stat.isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(full).pipe(res);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}
