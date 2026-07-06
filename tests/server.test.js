import { test, expect } from 'vitest';
import { ttsKey, LLM_OK, TTS_OK, CFG, sendJSON, MIME } from '../server/config.js';

test('ttsKey 相同输入生成相同 key', () => {
  const opts = { text: '你好世界', voice: 'Chloe', style: '平静', model: 'mimo-v2.5-tts' };
  expect(ttsKey(opts)).toBe(ttsKey(opts));
});

test('ttsKey 不同文本生成不同 key', () => {
  const base = { voice: 'Chloe', style: '平静', model: 'mimo-v2.5-tts' };
  const k1 = ttsKey({ ...base, text: '你好' });
  const k2 = ttsKey({ ...base, text: '再见' });
  expect(k1).not.toBe(k2);
});

test('ttsKey 返回十六进制字符串', () => {
  const key = ttsKey({ text: '测试', voice: 'Chloe', style: '平静', model: 'mimo-v2.5-tts' });
  expect(typeof key).toBe('string');
  expect(key).toMatch(/^[0-9a-f]+$/);
});

test('LLM/TTS 在未配置 key 时返回 false', () => {
  expect(LLM_OK()).toBe(false);
  expect(TTS_OK()).toBe(false);
});

test('CFG 有 llm 和 tts 配置块', () => {
  expect(CFG.llm).toBeTruthy();
  expect(CFG.tts).toBeTruthy();
  expect(CFG.llm.baseUrl).toBeTruthy();
  expect(CFG.tts.model).toBeTruthy();
});

test('MIME 映射包含常见类型', () => {
  expect(MIME['.html']).toContain('text/html');
  expect(MIME['.js']).toContain('javascript');
  expect(MIME['.mp3']).toBe('audio/mpeg');
  expect(MIME['.json']).toContain('json');
});

test('sendJSON 写入 JSON 响应', () => {
  const headers = {};
  let ended = false;
  let written = null;
  const fakeRes = {
    writeHead(code, h) {
      headers.code = code;
      Object.assign(headers, h);
    },
    end(buf) {
      ended = true;
      written = buf;
    },
  };
  sendJSON(fakeRes, 200, { ok: true });
  expect(headers.code).toBe(200);
  expect(headers['Content-Type']).toContain('application/json');
  expect(ended).toBe(true);
  expect(JSON.parse(written.toString())).toEqual({ ok: true });
});
