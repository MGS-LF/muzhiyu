// 小地图 + 战争迷雾系统
// 功能：
//   1. 右上角实时迷你地图（显示当前场景的已探索区域/玩家/要石/NPC/目标/敌人）
//   2. 战争迷雾：未探索区域灰雾覆盖，已探索区域保持可见
// 探索记录：基于网格的位图（每格代表世界坐标的一个区块），持久化到 localStorage 按场景存储

import { W, H } from './config.js';
// 渲染：在 render.js 的 HUD 层之后调用 drawMinimap() 叠加

const GRID_SIZE = 40; // 每格代表 40x40 像素的世界区域
const MINIMAP_W = 160;
const MINIMAP_H = 120;
const MINIMAP_MARGIN = 12;

// 每个场景的探索网格缓存：{ sceneId: Set<"gx,gy"> }
const exploredCache = {};

// 离屏 Canvas 缓存系统，用于加速战争迷雾绘制，避免每帧拆分坐标字符串和遍历大量 fillRect
const fogCanvasCache = {};

// 标记一个世界坐标为已探索
export function markExplored(sceneId, x, y, radius = 80) {
  if (!exploredCache[sceneId]) exploredCache[sceneId] = new Set();
  const set = exploredCache[sceneId];
  const r = Math.ceil(radius / GRID_SIZE);
  const gx = Math.floor(x / GRID_SIZE);
  const gy = Math.floor(y / GRID_SIZE);
  let changed = false;
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      if (dx * dx + dy * dy <= r * r) {
        const key = `${gx + dx},${gy + dy}`;
        if (!set.has(key)) {
          set.add(key);
          changed = true;
        }
      }
    }
  }
  if (changed && fogCanvasCache[sceneId]) {
    // 如果发生新的区域探索，使当前场景的迷雾缓存失效，触发重绘
    fogCanvasCache[sceneId].dirty = true;
  }
}
// 持久化（供存档系统调用）
export function snapshotExplored() {
  const out = {};
  for (const sid in exploredCache) {
    out[sid] = Array.from(exploredCache[sid]);
  }
  return out;
}

export function restoreExplored(data) {
  for (const sid in exploredCache) delete exploredCache[sid];
  if (!data) return;
  for (const sid in data) {
    exploredCache[sid] = new Set(data[sid]);
  }
}
// ============================================================
// 渲染：右上角小地图
// ============================================================
export function drawMinimap(ctx, game, gameTime) {
  if (!game.scene) return;
  const scene = game.scene;
  const cam = game.camera;

  // 小地图位置（右上角）
  const mx = W - MINIMAP_W - MINIMAP_MARGIN;
  const my = MINIMAP_MARGIN;
  const mw = MINIMAP_W;
  const mh = MINIMAP_H;

  ctx.save();

  // 背景框
  ctx.fillStyle = 'rgba(10,12,16,0.85)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(200,200,200,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);

  // 标题
  ctx.fillStyle = 'rgba(200,200,200,0.6)';
  ctx.font = '9px "SimSun",serif';
  ctx.textAlign = 'left';
  ctx.fillText(scene.name || scene.id, mx + 4, my + 11);

  // 场景尺寸缩放
  const sx = mw / scene.width;
  const sy = mh / scene.height;
  const scale = Math.min(sx, sy);
  const offX = mx + (mw - scene.width * scale) / 2;
  const offY = my + (mh - scene.height * scale) / 2 + 4;

  const W2M = (x, y) => ({ x: offX + x * scale, y: offY + y * scale });

  // === 战争迷雾：绘制未探索区域的灰色覆盖 ===
  const set = exploredCache[scene.id];

  // 初始化离屏 Canvas 缓存迷雾区域
  let fogCache = fogCanvasCache[scene.id];
  if (!fogCache) {
    const cCanvas = document.createElement('canvas');
    cCanvas.width = mw;
    cCanvas.height = mh;
    fogCache = { canvas: cCanvas, ctx: cCanvas.getContext('2d'), dirty: true };
    fogCanvasCache[scene.id] = fogCache;
  }

  // 若迷雾发生变动，重新渲染离屏迷雾 Canvas
  if (fogCache.dirty) {
    const fctx = fogCache.ctx;
    fctx.clearRect(0, 0, mw, mh);

    // 用反向方式绘制迷雾：遍历场景所有网格，未探索的在离屏 Canvas 上画灰
    fctx.fillStyle = 'rgba(20,22,28,0.75)';
    const gridW = Math.ceil(scene.width / GRID_SIZE);
    const gridH = Math.ceil(scene.height / GRID_SIZE);
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        if (!set || !set.has(`${gx},${gy}`)) {
          const p = W2M(gx * GRID_SIZE, gy * GRID_SIZE);
          // 在小地图相对坐标系中绘制
          fctx.fillRect(p.x - mx, p.y - my, GRID_SIZE * scale + 1, GRID_SIZE * scale + 1);
        }
      }
    }
    fogCache.dirty = false;
  }

  // 1. 先用剪裁方式绘制已探索区域的真实场景内容
  if (set) {
    ctx.save();
    ctx.beginPath();
    // 已探索的网格路径
    for (const key of set) {
      const [gx, gy] = key.split(',').map(Number);
      const wx = gx * GRID_SIZE;
      const wy = gy * GRID_SIZE;
      const p = W2M(wx, wy);
      ctx.rect(p.x, p.y, GRID_SIZE * scale + 1, GRID_SIZE * scale + 1);
    }
    ctx.clip();
    drawMinimapContent(ctx, game, W2M, scale, gameTime);
    ctx.restore();
  } else {
    // 尚未探索任何网格，但一般至少会探索玩家所在格，回退逻辑
    drawMinimapContent(ctx, game, W2M, scale, gameTime);
  }

  // 2. 将离屏 Canvas 上缓存好的未探索迷雾直接贴图绘制上去（无需每帧循环 fillRect 和 split）
  ctx.drawImage(fogCache.canvas, mx, my);

  // 玩家位置（白色三角形，带朝向）
  const pp = W2M(game.player.x, game.player.y);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  let ang = 0;
  if (game.player.direction === 'up') ang = -Math.PI / 2;
  else if (game.player.direction === 'down') ang = Math.PI / 2;
  else if (game.player.direction === 'left') ang = Math.PI;
  ctx.moveTo(pp.x + Math.cos(ang) * 3, pp.y + Math.sin(ang) * 3);
  ctx.lineTo(pp.x + Math.cos(ang + 2.5) * 2.5, pp.y + Math.sin(ang + 2.5) * 2.5);
  ctx.lineTo(pp.x + Math.cos(ang - 2.5) * 2.5, pp.y + Math.sin(ang - 2.5) * 2.5);
  ctx.closePath();
  ctx.fill();

  // 相机视口框（黄色细框）
  const viewW = W * scale;
  const viewH = H * scale;
  const vx = pp.x - viewW / 2;
  const vy = pp.y - viewH / 2;
  ctx.strokeStyle = 'rgba(255,220,100,0.25)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(vx, vy, viewW, viewH);

  ctx.restore();
}

// 小地图内容绘制（在已探索剪裁区内）
function drawMinimapContent(ctx, game, W2M, scale, gameTime) {
  const scene = game.scene;

  // 墙壁/碰撞体（暗色点）
  if (scene.walls) {
    ctx.fillStyle = 'rgba(80,80,90,0.6)';
    for (const w of scene.walls) {
      const p = W2M(w.x, w.y);
      ctx.fillRect(p.x, p.y, w.w * scale, w.h * scale);
    }
  }

  // 要石（金色点）
  if (scene.interactables) {
    for (const it of scene.interactables) {
      if (it.type === 'keystone') {
        const p = W2M(it.x, it.y);
        const activated = game.activatedKeystones.has(it.id);
        ctx.fillStyle = activated ? '#ffd866' : 'rgba(180,160,100,0.4)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 道具（小绿点，仅未拾取）
  if (scene.items) {
    ctx.fillStyle = 'rgba(100,220,120,0.7)';
    for (const it of scene.items) {
      if (game.collected.has(it.id)) continue;
      const p = W2M(it.x, it.y);
      ctx.fillRect(p.x - 0.5, p.y - 0.5, 1.5, 1.5);
    }
  }

  // 敌人（红色点）
  if (scene.enemies) {
    ctx.fillStyle = '#cc4444';
    for (const e of scene.enemies) {
      if (game.defeatedEnemies.has(e.id)) continue;
      const p = W2M(e.x, e.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, e.boss ? 3 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // NPC/交互点（蓝色点）
  if (scene.interactables) {
    ctx.fillStyle = 'rgba(100,160,220,0.8)';
    for (const it of scene.interactables) {
      if (it.type === 'keystone') continue;
      if (it.type === 'dialog' || it.type === 'cure' || it.type === 'npc') {
        const p = W2M(it.x, it.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 目标指引（黄色脉冲点）
  if (game.objective && game.objective.target) {
    const t = game.objective.target;
    const p = W2M(t.x, t.y);
    const pulse = 0.5 + 0.5 * Math.sin(gameTime * 0.005);
    ctx.fillStyle = `rgba(255,220,100,${pulse})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
