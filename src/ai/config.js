// 客户端 AI 配置与可用性探测
// 同源调用服务器的 /api/*；探活失败则全部降级（不配音、不调 LLM）。

export const AI = {
  ready: false, // 探活完成
  enabled: false, // 服务器在线
  llm: false, // LLM 可用
  tts: false, // TTS 可用
  sampleRate: 24000, // PCM 采样率（由 /api/health 校准）
  autoplay: true, // 语音播完自动推进对话
  apiBase: '', // 同源
};

export async function initAI() {
  try {
    const r = await fetch(AI.apiBase + '/api/health', { method: 'GET' });
    if (!r.ok) throw new Error('health ' + r.status);
    const j = await r.json();
    AI.enabled = !!j.ok;
    AI.llm = !!(j.ai && j.ai.llm);
    AI.tts = !!(j.ai && j.ai.tts);
    if (j.sampleRate) AI.sampleRate = j.sampleRate;
    AI.ready = true;
    console.log('[AI] 在线', { llm: AI.llm, tts: AI.tts, sampleRate: AI.sampleRate });
  } catch (e) {
    AI.enabled = AI.llm = AI.tts = false;
    AI.ready = true;
    console.log('[AI] 离线，降级为纯文字体验：', e.message);
  }
  return AI;
}
