import { test, expect } from 'vitest';
import {
  createEmptyStoryState,
  normalizeStoryState,
  addStoryClue,
  addStoryHistory,
  adjustNpcAttitude,
  applyStoryDelta,
  storyStateSummary,
  hasStoryClue,
} from '../src/ai/story.js';
import {
  buildBranchDialog,
  buildDreamNarrationPack,
  journeySummary,
  tingyuFallbackEpilogue,
  tingyuOpening,
  tingyuTurnPolicy,
} from '../src/ai/director.js';

test('createEmptyStoryState 结构正确', () => {
  const s = createEmptyStoryState();
  expect(Array.isArray(s.clues)).toBe(true);
  expect(Array.isArray(s.history)).toBe(true);
  expect(s.branchHistory).toEqual({});
});

test('addStoryClue 去重并记入', () => {
  const game = { storyState: createEmptyStoryState(), showHint: () => {} };
  expect(addStoryClue(game, 'lost_echo')).toBe(true);
  expect(addStoryClue(game, 'lost_echo')).toBe(false);
  expect(hasStoryClue(game, 'lost_echo')).toBe(true);
  expect(game.storyState.clues[0].label).toBeTruthy();
});

test('applyStoryDelta 白名单字段生效', () => {
  const game = { storyState: createEmptyStoryState(), showHint: () => {}, hints: [] };
  applyStoryDelta(game, {
    unlockClue: 'terminal_corpus',
    npcAttitude: { 守砚: 2 },
    historyAdd: '测试史',
    tagsAdd: ['t1'],
  });
  expect(hasStoryClue(game, 'terminal_corpus')).toBe(true);
  expect(game.storyState.npcAttitude['守砚']).toBe(2);
  expect(game.storyState.history).toContain('测试史');
  expect(game.storyState.branchTags).toContain('t1');
});

test('normalizeStoryState 截断异常输入', () => {
  const n = normalizeStoryState({
    clues: [{ id: 'a'.repeat(100), label: 'b'.repeat(200) }],
    history: ['x'.repeat(300)],
    npcAttitude: { 守砚: 99 },
  });
  expect(n.clues[0].id.length).toBeLessThanOrEqual(48);
  expect(n.npcAttitude['守砚']).toBe(5);
});

test('buildBranchDialog 解析 choice 与 storyDelta', () => {
  const built = buildBranchDialog({
    narration: [
      { s: '系统', t: '雾气散开。' },
      { s: '顾言', t: '……' },
    ],
    choice: [
      { label: '宽恕', effect: { mercy: 1 }, unlockClue: 'lost_echo' },
      { label: '走开', effect: { violence: 1 } },
    ],
    storyDelta: { historyAdd: '世界记下一笔' },
  });
  expect(built).toBeTruthy();
  expect(built.lines.length).toBe(2);
  expect(built.lines[1].choice.length).toBe(2);
  expect(built.lines[1].choice[0].effect._storyDelta.unlockClue).toBe('lost_echo');
  expect(built.storyDelta.historyAdd).toBe('世界记下一笔');
});

test('journeySummary 与 tingyuOpening 不抛错', () => {
  const game = {
    karma: { mercy: 2, violence: 0, saved: 1 },
    solvedPuzzles: new Set(['guanju']),
    completedQuests: new Set(),
    defeatedEnemies: new Set(['a']),
    player: { collectedCharsAll: ['洲', '逑'] },
    flags: { met_shuyuan: true, terminal_scanned: true },
    storyState: createEmptyStoryState(),
    engravings: [{ text: '记得' }],
  };
  addStoryClue(game, 'terminal_corpus');
  adjustNpcAttitude(game, '守砚', 1);
  addStoryHistory(game, '一笔史');
  const j = journeySummary(game);
  expect(j).toContain('仁慈');
  expect(j).toContain('线索');
  const open = tingyuOpening(game);
  expect(typeof open).toBe('string');
  expect(open.length).toBeGreaterThan(10);
  expect(storyStateSummary(game)).toContain('守砚');
});

test('buildDreamNarrationPack 只保留安全的梦境台词', () => {
  const pack = buildDreamNarrationPack({
    afterMercy: [
      { s: '失语者', t: '我终于把那句话说完了。', choice: [{ label: '非法选项' }] },
      { s: '越权角色', t: '越权说话人会被替换。', effect: { violence: 5 } },
    ],
    wakeMercy: [{ s: '陌生女声', t: '把话带到醒来的地方。' }],
    storyDelta: { historyAdd: '不得写入' },
  });
  expect(pack.afterMercy).toEqual([
    { s: '失语者', t: '我终于把那句话说完了。' },
    { s: '系统', t: '越权说话人会被替换。' },
  ]);
  expect(pack.wakeMercy[0].s).toBe('陌生女声');
  expect(pack.storyDelta).toBeUndefined();
});

test('Sydney 对话严格在第 3 至 8 轮之间收束', () => {
  expect(tingyuTurnPolicy(1)).toMatchObject({ allowEnd: false, mustConclude: false, stage: '试探' });
  expect(tingyuTurnPolicy(2).allowEnd).toBe(false);
  expect(tingyuTurnPolicy(3)).toMatchObject({ allowEnd: true, mustConclude: false, stage: '深入对质' });
  expect(tingyuTurnPolicy(7)).toMatchObject({ allowEnd: true, mustConclude: false, stage: '逼近选择' });
  expect(tingyuTurnPolicy(8)).toMatchObject({ allowEnd: true, mustConclude: true, stage: '收束' });
});

test('Sydney 本地结语会保留玩家最后的话与刻字', () => {
  const text = tingyuFallbackEpilogue(
    { engravings: [{ text: '记得' }] },
    'fire',
    '我们重新学着把话说完。'
  );
  expect(text).toContain('我们重新学着把话说完');
  expect(text).toContain('记得');
});
