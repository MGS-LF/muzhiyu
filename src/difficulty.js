// 难度系统 —— 全局难度选择，影响弹幕/敌人HP/SAN消耗/掉落
// 三档：easy(简单) / normal(普通) / hard(困难)
// 持久化到 localStorage，主菜单/游戏内可切换
// 设计：所有数值倍率集中在此处，battle.js 和 game.js 读取 difficulty.mul 应用

const DIFF_KEY = 'keheng_difficulty';

// 难度配置：每个倍率相对于 normal(1.0) 的比例
const DIFFICULTY_DEFS = {
  easy: {
    id: 'easy',
    name: '简单',
    desc: '弹幕稀疏，敌人较弱，适合体验剧情',
    mul: {
      bulletSpeed: 0.7, // 弹幕速度倍率
      bulletCount: 0.6, // 弹幕数量倍率
      enemyHp: 0.7, // 敌人血量倍率
      sanDamage: 0.5, // 玩家受到的SAN伤害倍率
      enemyDamage: 0.6, // 敌人攻击伤害倍率
      sanMax: 120, // SAN上限
      clarityMax: -1, // 宽恕所需调查次数减少1
    },
    color: '#66dd66',
  },
  normal: {
    id: 'normal',
    name: '普通',
    desc: '标准难度，推荐首次游玩',
    mul: {
      bulletSpeed: 1.0,
      bulletCount: 1.0,
      enemyHp: 1.0,
      sanDamage: 1.0,
      enemyDamage: 1.0,
      sanMax: 100,
      clarityMax: 0,
    },
    color: '#d4a85a',
  },
  hard: {
    id: 'hard',
    name: '困难',
    desc: '弹幕密集，敌人凶猛，SAN 值吃紧',
    mul: {
      bulletSpeed: 1.35,
      bulletCount: 1.4,
      enemyHp: 1.3,
      sanDamage: 1.5,
      enemyDamage: 1.4,
      sanMax: 80,
      clarityMax: 1,
    },
    color: '#cc4444',
  },
};

const ORDER = ['easy', 'normal', 'hard'];

// 读取持久化的难度（默认 normal）
export function loadDifficulty() {
  try {
    const id = localStorage.getItem(DIFF_KEY);
    if (id && DIFFICULTY_DEFS[id]) return id;
  } catch (e) {
    /* ignore */
  }
  return 'normal';
}

// 保存难度选择
export function saveDifficulty(id) {
  try {
    localStorage.setItem(DIFF_KEY, id);
  } catch (e) {
    /* ignore */
  }
}

// 获取难度定义
export function getDifficultyDef(id) {
  return DIFFICULTY_DEFS[id] || DIFFICULTY_DEFS.normal;
}
// 全局当前难度实例（游戏启动时设置，供 battle.js / game.js 读取）
let _current = 'normal';
export function setCurrent(id) {
  _current = id;
  saveDifficulty(id);
}
export function currentDef() {
  return DIFFICULTY_DEFS[_current];
}
export function currentMul() {
  return DIFFICULTY_DEFS[_current].mul;
}
