import { test, expect } from 'vitest';
import { DIALOGS } from '../src/data/dialogs.js';
import { POEM_LINES, PUZZLES } from '../src/data/puzzles.js';
import { scenes, DROP_TABLES, DEFAULT_DROPS } from '../src/scenes.js';
import { SCENE_TRANSITIONS } from '../src/data/scene_transitions.js';

test('DIALOGS 是非空对象，含多个对话', () => {
  expect(DIALOGS).toBeTruthy();
  expect(Object.keys(DIALOGS).length).toBeGreaterThan(10);
});

test('DIALOGS 每个条目是数组', () => {
  for (const [key, lines] of Object.entries(DIALOGS)) {
    expect(Array.isArray(lines), `${key} 应为数组`).toBe(true);
  }
});

test('DIALOGS 文本节点有 s 和 t 字段', () => {
  for (const [key, lines] of Object.entries(DIALOGS)) {
    for (const node of lines) {
      if (node.t !== undefined) {
        expect(typeof node.s, `${key} 节点 s 应为字符串`).toBe('string');
        expect(typeof node.t, `${key} 节点 t 应为字符串`).toBe('string');
      }
    }
  }
});

test('POEM_LINES 是非空诗句数组', () => {
  expect(Array.isArray(POEM_LINES)).toBe(true);
  expect(POEM_LINES.length).toBeGreaterThan(0);
  for (const line of POEM_LINES) {
    expect(typeof line).toBe('string');
    expect(line.length).toBeGreaterThan(0);
  }
});

test('PUZZLES 每个谜题有必需字段', () => {
  expect(Object.keys(PUZZLES).length).toBeGreaterThan(0);
  for (const [id, p] of Object.entries(PUZZLES)) {
    expect(p.title, `${id}.title`).toBeTruthy();
    expect(Array.isArray(p.lines), `${id}.lines 应为数组`).toBe(true);
    expect(Array.isArray(p.answer), `${id}.answer 应为数组`).toBe(true);
    expect(Array.isArray(p.decoys), `${id}.decoys 应为数组`).toBe(true);
  }
});

test('scenes 包含起始场景 freeze_center', () => {
  expect(scenes.freeze_center).toBeTruthy();
  expect(scenes.freeze_center.id).toBe('freeze_center');
  expect(scenes.freeze_center.name).toBeTruthy();
});

test('每个场景有必需字段', () => {
  const ids = Object.keys(scenes);
  expect(ids.length).toBeGreaterThanOrEqual(10);
  for (const [id, s] of Object.entries(scenes)) {
    expect(s.id, `${id}.id 应匹配`).toBe(id);
    expect(s.name, `${id}.name`).toBeTruthy();
    expect(Array.isArray(s.walls), `${id}.walls 应为数组`).toBe(true);
    expect(s.spawn, `${id}.spawn 应存在`).toBeTruthy();
    expect(typeof s.spawn.x).toBe('number');
    expect(typeof s.spawn.y).toBe('number');
  }
});

test('DROP_TABLES 与 DEFAULT_DROPS 结构正确', () => {
  expect(typeof DROP_TABLES).toBe('object');
  expect(Array.isArray(DEFAULT_DROPS)).toBe(true);
  expect(DEFAULT_DROPS.length).toBeGreaterThan(0);
  for (const [sceneId, drops] of Object.entries(DROP_TABLES)) {
    expect(Array.isArray(drops), `${sceneId} 掉落表应为数组`).toBe(true);
  }
});

test('SCENE_TRANSITIONS 每个条目有 objective 文案', () => {
  expect(Object.keys(SCENE_TRANSITIONS).length).toBeGreaterThan(5);
  for (const [target, trans] of Object.entries(SCENE_TRANSITIONS)) {
    expect(trans.objective, `${target}.objective`).toBeTruthy();
    expect(typeof trans.objective).toBe('string');
  }
});

test('SCENE_TRANSITIONS 的 target 与 scenes 的 id 对应', () => {
  for (const target of Object.keys(SCENE_TRANSITIONS)) {
    // target 应是 scenes 中存在的场景 id（或反向跳转目标）
    expect(scenes[target], `${target} 应在 scenes 中定义`).toBeTruthy();
  }
});
