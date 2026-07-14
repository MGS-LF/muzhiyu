import { test, expect } from 'vitest';
import { createSimState, spawnLayer, stepSim } from '../src/hacking/sim.js';

const idleInput = { mx: 0, my: 0, dash: false, fire: false, aimX: null, aimY: null };

function clearCurrentLayer(state) {
  state.enemies = [];
  state.bullets = [];
  state.frame = 41;
  const heart = { hp: 100 };
  for (let i = 0; i < 56; i++) stepSim(state, idleInput, heart);
}

test('梦境骇入配置只完成正常第一层，不生成终核', () => {
  const state = createSimState({ layerMax: 4, finishAfterLayer: 1 });
  spawnLayer(state);
  expect(state.layer).toBe(1);
  expect(state.enemies).toHaveLength(3);
  expect(state.boss).toBeNull();
  clearCurrentLayer(state);
  expect(state.done).toBe('win');
});

test('正式骇入未配置 finishAfterLayer 时仍进入第二层', () => {
  const state = createSimState({ layerMax: 4 });
  spawnLayer(state);
  clearCurrentLayer(state);
  expect(state.done).toBeNull();
  expect(state.layer).toBe(2);
  expect(state.enemies.length).toBeGreaterThan(0);
});
