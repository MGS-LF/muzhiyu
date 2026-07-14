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
  slashBattle: false, // 已废弃：全部走 UT 弹幕菜单战
  level3d: false, // 主线关闭；调试可改 true
  hacking: false, // 主线关闭；Boss 走 UT 弹幕
  sidescrollLong: false, // 江堤改俯视角
  aiDirector: true,
};

export const UTTERANCE = {
  beltMax: 6,
  slotMax: 4,
  range: 70,
  key: 'f',
};
