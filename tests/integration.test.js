import { test, expect, afterAll, beforeAll } from 'vitest';
import { spawn } from 'node:child_process';

const TEST_PORT = 18080;
let serverProc;

beforeAll(async () => {
  serverProc = spawn('node', ['server/index.js'], {
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'pipe',
  });
  // 等待服务就绪
  await new Promise((r) => setTimeout(r, 800));
});

afterAll(() => {
  if (serverProc) serverProc.kill();
});

test('GET /api/health 返回正常状态', async () => {
  const res = await fetch(`http://localhost:${TEST_PORT}/api/health`);
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.ok).toBe(true);
  expect(data.ai).toBeDefined();
  expect(typeof data.ai.llm).toBe('boolean');
  expect(typeof data.ai.tts).toBe('boolean');
  expect(typeof data.sampleRate).toBe('number');
});

test('GET / 返回 index.html', async () => {
  const res = await fetch(`http://localhost:${TEST_PORT}/`);
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain('<!DOCTYPE html>');
  expect(html).toContain('墓之语');
});

test('GET /api/unknown 返回 404', async () => {
  const res = await fetch(`http://localhost:${TEST_PORT}/api/unknown`);
  expect(res.status).toBe(404);
  const data = await res.json();
  expect(data.error).toBeTruthy();
});

test('GET /ai_keys.local.json 被禁止访问', async () => {
  const res = await fetch(`http://localhost:${TEST_PORT}/ai_keys.local.json`);
  expect(res.status).toBe(404);
});

test('POST /api/llm 未配置时返回 503', async () => {
  const res = await fetch(`http://localhost:${TEST_PORT}/api/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [] }),
  });
  expect(res.status).toBe(503);
});
