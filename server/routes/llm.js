// /api/llm — 代理 DeepSeek LLM
import https from 'node:https';
import { URL } from 'node:url';
import { CFG, LLM_OK, sendJSON, readBody, rateLimit } from '../config.js';

export async function handleLLM(req, res) {
  const ip = req.socket.remoteAddress || 'unknown';
  if (!rateLimit(`llm:${ip}`, 10, 60000)) {
    sendJSON(res, 429, { error: '请求过于频繁，请稍后再试' });
    return;
  }
  if (!LLM_OK()) {
    sendJSON(res, 503, { error: 'LLM 未配置 key' });
    return;
  }
  let body;
  try {
    body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
  } catch {
    sendJSON(res, 400, { error: 'bad json' });
    return;
  }

  const payload = {
    model: body.model || CFG.llm.model,
    messages: body.messages || [],
    temperature: body.temperature ?? 0.9,
    max_tokens: body.max_tokens ?? 800,
    stream: !!body.stream,
  };
  if (body.response_format) payload.response_format = body.response_format;
  // v4 推理模型默认开启思考，游戏需要稳定 JSON 输出，关闭思考模式
  // thinking 必须放在请求体顶层（不是 extra_body 嵌套）
  if (/v4/.test(payload.model)) {
    payload.thinking = { type: 'disabled' };
  }

  const u = new URL(CFG.llm.baseUrl.replace(/\/$/, '') + '/chat/completions');
  const data = Buffer.from(JSON.stringify(payload));
  const up = https.request(
    {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + CFG.llm.apiKey,
        'Content-Length': data.length,
        Accept: payload.stream ? 'text/event-stream' : 'application/json',
      },
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 200, {
        'Content-Type': upRes.headers['content-type'] || 'application/json',
        'Cache-Control': 'no-store',
      });
      upRes.pipe(res);
    }
  );
  up.on('error', (e) => {
    if (!res.headersSent) sendJSON(res, 502, { error: 'llm upstream: ' + e.message });
    else res.end();
  });
  req.on('close', () => up.destroy());
  up.end(data);
}
