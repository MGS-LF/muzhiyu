// EdgeOne Pages Node Function — POST /api/llm (DeepSeek 代理)
import { CFG, LLM_OK, sendJSON, rateLimit } from '../_config.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  // 频率限制
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`llm:${ip}`, 10, 60000)) {
    return sendJSON(null, 429, { error: '请求过于频繁，请稍后再试' });
  }

  if (!LLM_OK()) {
    return sendJSON(null, 503, { error: 'LLM 未配置 key（请在 EOP 控制台设置 DEEPSEEK_API_KEY）' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return sendJSON(null, 400, { error: 'bad json' });
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
  if (/v4/.test(payload.model)) {
    payload.extra_body = { thinking: { type: 'disabled' } };
  }

  const upstreamUrl = CFG.llm.baseUrl.replace(/\/$/, '') + '/chat/completions';

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + CFG.llm.apiKey,
        Accept: payload.stream ? 'text/event-stream' : 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseHeaders = new Headers({
      'Cache-Control': 'no-store',
    });
    // 透传上游 Content-Type
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) {
      responseHeaders.set('Content-Type', upstreamContentType);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (e) {
    return sendJSON(null, 502, { error: 'llm upstream: ' + e.message });
  }
}
