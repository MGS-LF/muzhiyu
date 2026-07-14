import { describe, it, expect } from 'vitest';
import {
  uniqueCharsFrom,
  matchRequired,
  matchBlanks,
  parseClozePrompt,
  getBlanks,
  findNearestPurifyTarget,
} from '../src/systems/utterance_logic.js';

describe('utterance helpers', () => {
  it('uniqueCharsFrom keeps first-seen order', () => {
    expect(uniqueCharsFrom(['洲', '逑', '洲', '关'])).toEqual(['洲', '逑', '关']);
    expect(uniqueCharsFrom([])).toEqual([]);
  });

  it('matchRequired accepts any order and reports missing', () => {
    expect(matchRequired(['逑', '洲'], ['洲', '逑']).ok).toBe(true);
    expect(matchRequired(['洲'], ['洲', '逑']).missing).toEqual(['逑']);
  });

  it('matchBlanks is ordered', () => {
    expect(matchBlanks(['洲', '逑'], ['洲', '逑']).ok).toBe(true);
    expect(matchBlanks(['逑', '洲'], ['洲', '逑']).ok).toBe(false);
    expect(matchBlanks(['洲', null], ['洲', '逑']).missing).toEqual(['逑']);
  });

  it('parseClozePrompt splits on □', () => {
    const { parts, blankCount } = parseClozePrompt('在河之□。君子好□。', ['洲', '逑']);
    expect(blankCount).toBe(2);
    expect(parts[0]).toContain('在河之');
    expect(parts[1]).toContain('君子好');
  });

  it('getBlanks prefers blanks over required', () => {
    expect(getBlanks({ blanks: ['洲'], required: ['逑'] })).toEqual(['洲']);
    expect(getBlanks({ required: ['逑'] })).toEqual(['逑']);
  });

  it('findNearestPurifyTarget skips done and respects range', () => {
    const game = {
      flags: { utter_meme_wall_01: true },
      player: { x: 100, y: 100 },
      scene: {
        interactables: [
          {
            id: 'done',
            type: 'purify',
            x: 105,
            y: 105,
            doneFlag: 'utter_meme_wall_01',
          },
          { id: 'near', type: 'purify', x: 120, y: 100, doneFlag: 'utter_aphasic_01' },
          { id: 'far', type: 'purify', x: 500, y: 500, doneFlag: 'other' },
        ],
      },
    };
    const t = findNearestPurifyTarget(game, 70);
    expect(t && t.id).toBe('near');
    expect(findNearestPurifyTarget(game, 10)).toBe(null);
  });
});
