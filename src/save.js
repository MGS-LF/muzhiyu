// 存档系统 —— localStorage 持久化游戏进度
// 策略：自动存档（场景切换/要石激活/刻字/解谜/击败敌人）+ 手动存档（F5）+ 多槽位
// 序列化范围：场景/坐标/flags/karma/收集物/击败记录/已激活要石/已解谜题/已完成的支线/难度/探索区域
// 反序列化时重建运行时对象（Set/数组/玩家属性），保持游戏状态机一致性

import * as minimap from './minimap.js';

const SAVE_KEY = 'keheng_saves';
const AUTOSAVE_SLOT = 'auto';
const SLOT_COUNT = 3; // 手动槽位 1-3，外加自动槽
const SAVE_VERSION = 1;

// 仅序列化可持久化的状态字段，剔除运行时临时对象（camera/dialog/battle/compose/sidescroll/level3d 等）
function snapshot(game) {
  return {
    version: SAVE_VERSION,
    time: Date.now(),
    sceneId: game.scene ? game.scene.id : 'freeze_center',
    playerX: Math.round(game.player.x),
    playerY: Math.round(game.player.y),
    san: game.player.san,
    maxSan: game.player.maxSan,
    hasClothes: game.player.hasClothes,
    collectedChars: game.player.collectedChars.slice(),
    collectedCharsAll: game.player.collectedCharsAll.slice(),
    inventory: game.player.inventory.slice(),
    diaries: game.player.diaries ? Array.from(game.player.diaries) : [],
    flags: { ...game.flags },
    karma: { ...game.karma },
    collected: Array.from(game.collected),
    activatedKeystones: Array.from(game.activatedKeystones),
    defeatedEnemies: Array.from(game.defeatedEnemies),
    solvedPuzzles: Array.from(game.solvedPuzzles),
    completedQuests: Array.from(game.completedQuests),
    visitedScenes: Array.from(game.visitedScenes),
    engravings: Array.isArray(game.engravings) ? game.engravings.slice() : [],
    gameTime: game.gameTime || 0,
    difficultyId: game.difficultyId || 'normal',
    explored: minimap.snapshotExplored(),
  };
}

// 读取全部存档槽位
export function loadAllSaves() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { auto: null, slots: [null, null, null] };
    const data = JSON.parse(raw);
    return {
      auto: data.auto || null,
      slots: data.slots || [null, null, null],
    };
  } catch (e) {
    return { auto: null, slots: [null, null, null] };
  }
}

function persist(saves) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    return true;
  } catch (e) {
    console.warn('[存档] 写入失败', e);
    return false;
  }
}

// 自动存档（覆盖自动槽）
export function autoSave(game) {
  const saves = loadAllSaves();
  const snap = snapshot(game);
  saves.auto = snap;
  return persist(saves);
}

// 手动存档到指定槽位（1-3）
export function saveToSlot(game, slot) {
  if (slot < 1 || slot > SLOT_COUNT) return false;
  const saves = loadAllSaves();
  const snap = snapshot(game);
  saves.slots[slot - 1] = snap;
  return persist(saves);
}

// 读取指定槽位的快照（'auto' 或 1-3）
export function loadSnapshot(slot) {
  const saves = loadAllSaves();
  if (slot === AUTOSAVE_SLOT) return saves.auto;
  if (typeof slot === 'number' && slot >= 1 && slot <= SLOT_COUNT) return saves.slots[slot - 1];
  return null;
}

// 列出所有可用存档（用于菜单展示）
export function listSaves() {
  const saves = loadAllSaves();
  const list = [];
  if (saves.auto) list.push({ slot: 'auto', ...saves.auto });
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (saves.slots[i]) list.push({ slot: i + 1, ...saves.slots[i] });
  }
  return list;
}

// 删除指定槽位
export function deleteSave(slot) {
  const saves = loadAllSaves();
  if (slot === AUTOSAVE_SLOT) saves.auto = null;
  else if (typeof slot === 'number' && slot >= 1 && slot <= SLOT_COUNT) saves.slots[slot - 1] = null;
  return persist(saves);
}

// 将快照恢复到游戏实例
// 注意：调用方需在恢复后调用 loadScene(sceneId, {x, y}) 重建场景
export function restore(game, snap) {
  if (!snap || snap.version !== SAVE_VERSION) return false;
  try {
    // 玩家状态
    game.player.san = snap.san ?? game.player.maxSan;
    game.player.maxSan = snap.maxSan ?? 100;
    game.player.hasClothes = !!snap.hasClothes;
    game.player.collectedChars = (snap.collectedChars || []).slice();
    game.player.collectedCharsAll = (snap.collectedCharsAll || []).slice();
    game.player.inventory = (snap.inventory || []).slice();
    game.player.diaries = new Set(snap.diaries || []);
    game.player.invulnerable = 0;
    game.player.hurtFlash = false;
    game.player.dialogGrace = 0;

    // 游戏状态
    game.flags = { ...game.flags, ...(snap.flags || {}) };
    game.karma = { ...game.karma, ...(snap.karma || {}) };
    game.collected = new Set(snap.collected || []);
    game.activatedKeystones = new Set(snap.activatedKeystones || []);
    game.defeatedEnemies = new Set(snap.defeatedEnemies || []);
    game.solvedPuzzles = new Set(snap.solvedPuzzles || []);
    game.completedQuests = new Set(snap.completedQuests || []);
    game.visitedScenes = new Set(snap.visitedScenes || []);
    if (snap.engravings) game.engravings = Array.isArray(snap.engravings) ? snap.engravings.slice() : [];
    game.gameTime = snap.gameTime || 0;

    // 难度与探索区域
    if (snap.difficultyId) {
      game.difficultyId = snap.difficultyId;
      game._applyDifficulty();
    }
    minimap.restoreExplored(snap.explored);

    // 清空运行时临时状态
    game.dialogState = null;
    game.battle = null;
    game.compose = null;
    game.converse = null;
    game.sidescroll = null;
    game.level3d = null;
    game.combat.bullets = [];
    game.combat.particles = [];
    game.combat.dead = false;
    game.hints = [];

    // 场景与坐标由调用方通过 loadScene 恢复
    game._pendingScene = snap.sceneId;
    game._pendingSpawn = { x: snap.playerX, y: snap.playerY };
    return true;
  } catch (e) {
    console.error('[存档] 恢复失败', e);
    return false;
  }
}

// 存档摘要（用于菜单展示，不包含完整数据）
export function summarize(snap) {
  if (!snap) return null;
  const date = new Date(snap.time);
  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const sceneNames = {
    freeze_center: '冷冻中心', street_01: '废弃街道', riverside: '江堤',
    subway: '地铁站', alley_district: '居民区', house_a: '民居A', house_b: '民居B',
    stadium: '体育馆', data_center: '数据中心',
  };
  return {
    scene: sceneNames[snap.sceneId] || snap.sceneId,
    time: timeStr,
    san: snap.san,
    chars: (snap.collectedCharsAll || []).length,
    karma: snap.karma || { mercy: 0, violence: 0, saved: 0 },
    saved: snap.saved || false,
  };
}

export const SAVE_SLOTS = SLOT_COUNT;
