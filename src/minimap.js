// 小地图 + 战争迷雾系统
// 功能：
//   1. 右上角实时迷你地图（显示当前场景的已探索区域/玩家/要石/NPC/目标/敌人）
//   2. 战争迷雾：未探索区域灰雾覆盖，已探索区域保持可见
// 探索记录：基于网格的位图（每格代表世界坐标的一个区块），持久化到 localStorage 按场景存储
// 渲染：在 render.js 的 HUD 层之后调用 drawMinimap() 叠加

const GRID_SIZE = 40; // 每格代表 40x40 像素的世界区域
const MINIMAP_W = 160;
const MINIMAP_H = 120;
const MINIMAP_MARGIN = 12;

// 每个场景的探索网格缓存：{ sceneId: Set<"gx,gy"> }
const exploredCache = {};

// 标记一个世界坐标为已探索
export function markExplored(sceneId, x, y, radius = 80) {
  if (!exploredCache[sceneId]) exploredCache[sceneId] = new Set();
  const set = exploredCache[sceneId];
  const r = Math.ceil(radius / GRID_SIZE);
  const gx = Math.floor(x / GRID_SIZE);
  const gy = Math.floor(y / GRID_SIZE);
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      if (dx * dx + dy * dy <= r * r) {
        set.add(`${gx + dx},${gy + dy}`);
      }
    }
  }
}

// 检查世界坐标是否已探索
export function isExplored(sceneId, x, y) {
  const set = exploredCache[sceneId];
  if (!set) return false;
  const gx = Math.floor(x / GRID_SIZE);
  const gy = Math.floor(y / GRID_SIZE);
  return set.has(`${gx},${gy}`);
}

// 获取场景的探索覆盖率（0-1）
export function exploredRatio(sceneId, sceneW, sceneH) {
  const set = exploredCache[sceneId];
  if (!set || !sceneW || !sceneH) return 0;
  const total = Math.ceil(sceneW / GRID_SIZE) * Math.ceil(sceneH / GRID_SIZE);
  return Math.min(1, set.size / total);
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

// 重置（新游戏时）
export function resetExplored() {
  for (const sid in exploredCache) delete exploredCache[sid];
}

// ============================================================
// 渲染：右上角小地图
// ============================================================
export function drawMinimap(ctx, game, gameTime) {
  if (!game.scene) return;
  const scene = game.scene;
  const cam = game.camera;

  // 小地图位置（右上角）
  const mx = 1200 - MINIMAP_W - MINIMAP_MARGIN;
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
  if (set) {
    // 用剪裁方式：先画全灰，再用已探索区域"挖洞"
    ctx.save();
    ctx.beginPath();
    // 已探索的网格
    for (const key of set) {
      const [gx, gy] = key.split(',').map(Number);
      const wx = gx * GRID_SIZE;
      const wy = gy * GRID_SIZE;
      const p = W2M(wx, wy);
      ctx.rect(p.x, p.y, GRID_SIZE * scale + 1, GRID_SIZE * scale + 1);
    }
    ctx.clip();
    // 在已探索区域内绘制内容
    drawMinimapContent(ctx, game, W2M, scale, gameTime);
    ctx.restore();
  } else {
    drawMinimapContent(ctx, game, W2M, scale, gameTime);
  }

  // 未探索区域灰色覆盖（在内容之上，已探索区域已被剪裁掉）
  ctx.fillStyle = 'rgba(20,22,28,0.75)';
  // 用反向方式：遍历场景所有网格，未探索的画灰
  const gridW = Math.ceil(scene.width / GRID_SIZE);
  const gridH = Math.ceil(scene.height / GRID_SIZE);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (!set || !set.has(`${gx},${gy}`)) {
        const p = W2M(gx * GRID_SIZE, gy * GRID_SIZE);
        ctx.fillRect(p.x, p.y, GRID_SIZE * scale + 1, GRID_SIZE * scale + 1);
      }
    }
  }

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
  const viewW = 1200 * scale;
  const viewH = 760 * scale;
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
