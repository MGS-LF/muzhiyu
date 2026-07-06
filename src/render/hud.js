import { roundRect } from './util.js';
import { W, H } from '../config.js';

// ===== from hud.js =====
// 渲染模块：hud

// ============================================================
// HUD
// ============================================================
export function drawHUD(ctx, player, game, objective) {
  const sanW = 140;
  const sanH = 14;
  const sx = 16,
    sy = 14;
  const ratio = Math.max(0, player.san / player.maxSan);
  ctx.fillStyle = 'rgba(20,15,10,0.8)';
  roundRect(ctx, sx, sy, sanW, sanH, 3);
  ctx.fill();
  const barColor = ratio > 0.6 ? '#7ad07a' : ratio > 0.3 ? '#e0b850' : '#d04040';
  ctx.fillStyle = barColor;
  roundRect(ctx, sx + 1, sy + 1, (sanW - 2) * ratio, sanH - 2, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,200,150,0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, sx, sy, sanW, sanH, 3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  ctx.font = 'bold 10px serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('理性', sx + 5, sy + sanH / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.font = '9px serif';
  ctx.fillText(`${Math.floor(player.san)}/${player.maxSan}`, sx + sanW - 36, sy + sanH / 2);
  ctx.textBaseline = 'alphabetic';

  // 章节碎片进度面板（直接回答"还要做什么"）
  const prog = game.objective && game.objective.progress;
  const ammo = (player.collectedChars || []).length;
  const poemY = sy + sanH + 14;
  if (prog) {
    const panelW = 250,
      panelH = 40;
    ctx.fillStyle = 'rgba(22,17,10,0.78)';
    roundRect(ctx, sx, poemY, panelW, panelH, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,160,90,0.55)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, poemY, panelW, panelH, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,160,90,0.4)';
    ctx.fillRect(sx, poemY, panelW, 2);
    // 标题
    ctx.fillStyle = 'rgba(255,215,130,0.92)';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('碎片 · ' + prog.title, sx + 8, poemY + 12);
    // 字格
    let cxp = sx + 10;
    const cy2 = poemY + 28;
    for (const { c, have } of prog.chars) {
      ctx.fillStyle = have ? 'rgba(70,55,25,0.9)' : 'rgba(40,40,44,0.8)';
      roundRect(ctx, cxp, cy2 - 9, 18, 18, 3);
      ctx.fill();
      ctx.strokeStyle = have ? 'rgba(255,215,130,0.9)' : 'rgba(110,110,120,0.6)';
      ctx.lineWidth = 1;
      roundRect(ctx, cxp, cy2 - 9, 18, 18, 3);
      ctx.stroke();
      ctx.fillStyle = have ? 'rgba(255,232,150,1)' : 'rgba(120,120,128,0.7)';
      ctx.font = 'bold 12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(c, cxp + 9, cy2);
      if (have) {
        ctx.fillStyle = 'rgba(120,220,140,1)';
        ctx.font = 'bold 9px serif';
        ctx.fillText('✓', cxp + 15, cy2 - 6);
      }
      cxp += 24;
    }
    // 弹药计数
    ctx.fillStyle = 'rgba(200,200,210,0.8)';
    ctx.font = '10px serif';
    ctx.textAlign = 'right';
    ctx.fillText('诗词弹药 ×' + ammo, sx + panelW - 8, poemY + 12);
  } else {
    // 无章节目标时仅显示弹药数
    const panelW = 250;
    ctx.fillStyle = 'rgba(22,17,10,0.7)';
    roundRect(ctx, sx, poemY, panelW, 22, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,140,80,0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, poemY, panelW, 22, 3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,120,0.9)';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('诗词弹药 ×' + ammo, sx + 8, poemY + 11);
  }
  ctx.textBaseline = 'alphabetic';

  // 任务目标（顶部中央）
  if (objective && !objective.done) {
    const ox = W / 2,
      oy = 14;
    const ow = 360,
      oh = 30;
    ctx.fillStyle = 'rgba(20,15,10,0.85)';
    roundRect(ctx, ox - ow / 2, oy, ow, oh, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,170,80,0.7)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, ox - ow / 2, oy, ow, oh, 4);
    ctx.stroke();
    // 顶部金色边
    ctx.fillStyle = 'rgba(220,170,80,0.5)';
    ctx.fillRect(ox - ow / 2, oy, ow, 2);
    // 任务文字
    ctx.fillStyle = 'rgba(255,210,120,0.95)';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('目  标', ox - ow / 2 + 40, oy + oh / 2);
    ctx.fillStyle = 'rgba(232,220,200,0.95)';
    ctx.font = '13px serif';
    ctx.textAlign = 'left';
    ctx.fillText(objective.text, ox - ow / 2 + 80, oy + oh / 2);
    ctx.textBaseline = 'alphabetic';
  }

  const scene = game.scene;
  // 右上角场景信息面板：当小地图显示时下移到小地图下方，避免重叠
  const miniH = game._showMinimap ? 132 + 12 : 0; // 小地图高度 120 + margin 12
  ctx.fillStyle = 'rgba(20,15,10,0.7)';
  const mx = W - 200,
    my = 14 + miniH;
  roundRect(ctx, mx, my, 184, 60, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,80,0.4)';
  ctx.lineWidth = 1;
  roundRect(ctx, mx, my, 184, 60, 4);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,210,120,0.9)';
  ctx.font = 'bold 11px serif';
  ctx.textAlign = 'left';
  ctx.fillText(scene.name, mx + 10, my + 16);

  ctx.fillStyle = 'rgba(200,200,200,0.7)';
  ctx.font = '9px serif';
  const saved = game.karma ? game.karma.saved : 0;
  ctx.fillText(saved > 0 ? `已唤醒失语者 ${saved}` : '尚未唤醒失语者', mx + 10, my + 32);

  ctx.fillStyle = player.hasClothes ? 'rgba(120,200,140,0.9)' : 'rgba(220,120,120,0.9)';
  ctx.fillText(player.hasClothes ? '已穿装备' : '未穿装备', mx + 10, my + 46);
  ctx.textAlign = 'left';

  // 语言之火：隐性倾向指示（暖=守护/慈悲，冷绿=武力侵蚀）。不显示数值，避免剧透分支。
  if (game.karma) {
    const warm = game.karma.mercy + game.karma.saved;
    const cold = game.karma.violence;
    const fl = Math.max(0.25, Math.min(1, 0.45 + (warm - cold) * 0.12));
    const fx = mx + 168,
      fy = my + 26;
    const fcol = cold > warm + 1 ? '120,210,130' : '255,185,95';
    ctx.save();
    ctx.shadowColor = `rgba(${fcol},${fl})`;
    ctx.shadowBlur = 9 * fl;
    ctx.fillStyle = `rgba(${fcol},${0.5 + fl * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 9);
    ctx.quadraticCurveTo(fx + 6, fy - 1, fx + 3, fy + 5);
    ctx.quadraticCurveTo(fx, fy + 8, fx - 3, fy + 5);
    ctx.quadraticCurveTo(fx - 6, fy - 1, fx, fy - 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 面板快捷键提示（右下角）
  ctx.fillStyle = 'rgba(180,170,150,0.4)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('J 任务 · M 地图 · F2 调试', W - 12, H - 8);
  ctx.textAlign = 'left';
}

// ===== from effects.js =====
// 渲染模块：effects

// ============================================================
// 章节门禁可视化：未解锁→能量屏障+锁；已解锁→金色光柱+去向
// ============================================================
export function drawGates(ctx, W2S, scene, game, gameTime) {
  for (const it of scene.interactables) {
    if (it.type !== 'scene_change' || !it.gate) continue;
    const g = it.gate;
    const charsOk = game.meetsGate(g).ok;
    const puzzleDone = !g.puzzle || game.solvedPuzzles.has(g.puzzle);
    const locked = !charsOk || !puzzleDone;
    // 字已集齐但谜题未解：进入交互范围会触发造句
    const readyToCompose = charsOk && !puzzleDone;
    const s = W2S(it.x, it.y);
    if (s.y < -160 || s.y > H + 160) continue;
    const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;

    if (locked) {
      // 红绿交织的能量屏障
      const bw = 150,
        bh = 90;
      const flow = (gameTime * 0.05) % 18;
      // 雾团
      const grad = ctx.createRadialGradient(s.x, s.y - 10, 6, s.x, s.y - 10, 90);
      grad.addColorStop(0, `rgba(90,210,110,${0.22 + pulse * 0.12})`);
      grad.addColorStop(0.6, `rgba(70,150,120,${0.12})`);
      grad.addColorStop(1, 'rgba(40,60,60,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 10, 90, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      // 竖向能量线
      ctx.strokeStyle = `rgba(150,255,170,${0.35 + pulse * 0.25})`;
      ctx.lineWidth = 1.5;
      for (let x = -bw / 2; x <= bw / 2; x += 18) {
        ctx.beginPath();
        for (let y = -bh / 2; y <= bh / 2; y += 6) {
          const wob = Math.sin((y + flow * 6 + x) * 0.12 + gameTime * 0.005) * 4;
          const px = s.x + x + wob,
            py = s.y - 10 + y;
          if (y === -bh / 2) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      // 锁图标
      ctx.fillStyle = `rgba(255,90,90,${0.7 + pulse * 0.3})`;
      ctx.shadowColor = 'rgba(255,80,80,0.8)';
      ctx.shadowBlur = 8;
      const lx = s.x,
        ly = s.y - 46;
      ctx.fillRect(lx - 7, ly, 14, 11);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,120,120,${0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ly, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,10,10,0.9)';
      ctx.fillRect(lx - 1.2, ly + 3, 2.4, 5);
      // 文字
      ctx.fillStyle = `rgba(255,150,150,${0.7 + pulse * 0.3})`;
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.fillText(readyToCompose ? 'E 复原诗句，破除封锁' : '此路被污染封锁', s.x, s.y - 56);
      ctx.textAlign = 'left';
    } else {
      // 解锁：金色光柱 + 去向
      const grad = ctx.createLinearGradient(0, s.y - 70, 0, s.y + 24);
      grad.addColorStop(0, 'rgba(255,225,150,0)');
      grad.addColorStop(0.5, `rgba(255,225,150,${pulse * 0.3})`);
      grad.addColorStop(1, 'rgba(255,225,150,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(s.x - 44, s.y - 70, 88, 94);
      ctx.fillStyle = `rgba(255,225,150,${pulse * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 34, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,230,160,${0.7 + pulse * 0.3})`;
      ctx.font = 'bold 13px serif';
      ctx.textAlign = 'center';
      ctx.fillText('→ ' + (it.label || '前进'), s.x, s.y - 24);
      ctx.textAlign = 'left';
    }
  }
}

export function drawObjectiveArrow(ctx, W2S, game, gameTime) {
  const obj = game.objective;
  if (!obj || obj.done || !obj.target) return;
  const tx = obj.target.x,
    ty = obj.target.y;
  const dist = Math.hypot(tx - game.player.x, ty - game.player.y);
  if (dist < 70) return; // 已在目标附近，无需箭头
  const s = W2S(tx, ty);
  const cx = W / 2,
    cy = H / 2;
  const dx = s.x - cx,
    dy = s.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d,
    ny = dy / d;
  const margin = 92;
  const ax = cx + nx * margin,
    ay = cy + ny * margin;
  const pulse = 0.6 + Math.sin(gameTime * 0.006) * 0.4;
  const angle = Math.atan2(ny, nx);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);
  // 箭羽形箭头
  ctx.fillStyle = `rgba(255,228,150,${pulse})`;
  ctx.shadowColor = `rgba(255,228,150,${pulse * 0.8})`;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // 距离
  ctx.rotate(-angle);
  ctx.fillStyle = `rgba(255,228,150,${pulse})`;
  ctx.font = 'bold 11px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.floor(dist)}`, 0, -17);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.restore();
}

// ============================================================
// 受伤红屏
// ============================================================
export function drawDamageOverlay(ctx, player, gameTime) {
  const a = Math.min(0.35, (player.invulnerable / 800) * 0.35);
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
  grad.addColorStop(0, 'rgba(220,40,40,0)');
  grad.addColorStop(1, `rgba(220,40,40,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // 抖动
  if (Math.random() < 0.3) {
    ctx.fillStyle = 'rgba(255,100,100,0.04)';
    ctx.fillRect(0, 0, W, H);
  }
}

// ============================================================
// 死亡画面（已移除 drawDeathScreen — 未使用）
