// 薄 LLM 客户端：经服务器 /api/llm 调 DeepSeek（key 藏在服务端）
import { AI } from './config.js';

// 返回助手文本；json:true 时尝试解析为对象（容错提取 ```json 代码块/裸 JSON）
export async function callLLM(messages, opts = {}) {
  if (!AI.llm) throw new Error('LLM 不可用');
  const r = await fetch(AI.apiBase + '/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: opts.temperature ?? 0.9,
      max_tokens: opts.max_tokens ?? 800,
      stream: false,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!r.ok) throw new Error('llm http ' + r.status);
  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content ?? '';
  if (!opts.json) return text;
  return extractJSON(text);
}

export function extractJSON(text) {
  if (!text) return null;
  // 优先 ```json ... ``` 代码块
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  try {
    return JSON.parse(candidate);
  } catch {
    /* ignore */
  }
  // 退而求其次：截取第一个 { 到最后一个 }
  const a = candidate.indexOf('{'),
    b = candidate.lastIndexOf('}');
  if (a >= 0 && b > a) {
    try {
      return JSON.parse(candidate.slice(a, b + 1));
    } catch {
      /* ignore */
    }
  }
  return null;
}
