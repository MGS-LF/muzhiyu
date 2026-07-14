// 全局配置与颜色
export const COLORS = {
  bg: '#0c0e12',
  line: '#3a3d44',
  bright: '#e8dcc8',
  faint: '#1a1d22',
  green: '#44dd66',
  warm: '#d4a85a',
  frost: '#8aa0a8',
  red: '#cc4444',
  sky: '#2a2820',
  asphalt: '#2a2a2a',
  grass: '#3a4a2a',
  concrete: '#4a4a4a',
};

export const W = 1200;
export const H = 760;

export const FEATURES = {
  utterance: true,
  // 战斗：每次开战在 UT / 斩击 / 骇入 中随机（enemy.forceCombat 可强制）
  battleRoll: true,
  slashBattle: true,
  level3d: false, // 主线关闭；调试可改 true
  hacking: true,
  sidescrollLong: true, // 江堤横版关卡
  aiDirector: true,
  aiDreamNarration: true,
};

/** 三种可随机的战斗模式 */
export const BATTLE_MODES = ['ut', 'slash', 'hack'];

export const UTTERANCE = {
  beltMax: 6,
  slotMax: 4,
  range: 70,
  key: 'f',
};
