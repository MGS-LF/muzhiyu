import { test, expect } from 'vitest';
import { selectSlashGlyph } from '../src/slash_rules.js';

test('言锋战在没有汉字时仍能发射无限墨刃', () => {
  expect(selectSlashGlyph([], 1, 0)).toEqual({
    char: '墨',
    empowered: false,
    nextGlyphCursor: 0,
  });
});

test('记忆字强化攻击不会消耗收集的汉字', () => {
  const chars = ['言', '语'];
  const shot = selectSlashGlyph(chars, 4, 0);
  expect(shot).toEqual({ char: '言', empowered: true, nextGlyphCursor: 1 });
  expect(chars).toEqual(['言', '语']);
});
