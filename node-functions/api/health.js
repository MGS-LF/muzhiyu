// EdgeOne Pages Node Function — GET /api/health
import { CFG, LLM_OK, TTS_OK, sendJSON } from '../_config.js';

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'GET') {
    return new Response(null, { status: 405 });
  }
  return sendJSON(null, 200, {
    ok: true,
    ai: { llm: LLM_OK(), tts: TTS_OK() },
    sampleRate: CFG.tts.sampleRate,
  });
}
