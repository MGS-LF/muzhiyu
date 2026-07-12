import { roundRect } from './util.js';
import { CONTROL_HINTS } from '../data/controls.js';
import { W, H } from '../config.js';
import { UI, font, fontMono, isPortrait } from '../ui/tokens.js';

// ============================================================
// HUD
// ============================================================
export function drawHUD(ctx, player, game, objective) {
  // 理性条缓动显示
  if (game._displaySan === null || game._displaySan === undefined) game._displaySan = player.san;
  game._displaySan += (player.san - game._displaySan) * 0.15;
  if (Math.abs(game._displaySan - player.san) < 0.05) game._displaySan = player.san;

  // 变化脉冲
  if (game._sanPulse === null || game._sanPulse === undefined) game._sanPulse = 0;
  if (game._lastSanHud !== null && game._lastSanHud !== undefined && game._lastSanHud !== player.san) {
    game._sanPulse = 200;
    game._sanPulseDir = player.san > game._lastSanHud ? 1 : player.san < game._lastSanHud ? -1 : 0;
  }
  game._lastSanHud = player.san;
  if (game._sanPulse > 0) game._sanPulse = Math.max(0, game._sanPulse - 16);

  const portrait = isPortrait();
  const sanW = 140;
  const sanH = 14;
  const sx = 16,
    sy = 14;
  const ratio = Math.max(0, game._displaySan / player.maxSan);
  ctx.fillStyle = UI.barBg;
  roundRect(ctx, sx, sy, sanW, sanH, 3);
  ctx.fill();
  let barColor = ratio > 0.6 ? UI.ok : ratio > 0.3 ? UI.warn : UI.danger;
  if (game._sanPulse > 0) {
    const p = game._sanPulse / 200;
    if (game._sanPulseDir > 0) barColor = `rgba(120,220,140,${0.7 + p * 0.3})`;
    else if (game._sanPulseDir < 0) barColor = `rgba(224,80,80,${0.7 + p * 0.3})`;
  }
  ctx.fillStyle = barColor;
  roundRect(ctx, sx + 1, sy + 1, (sanW - 2) * ratio, sanH - 2, 2);
  ctx.fill();
  ctx.strokeStyle = UI.goldLine;
  ctx.lineWidth = 1;
  roundRect(ctx, sx, sy, sanW, sanH, 3);
  ctx.stroke();
  ctx.fillStyle = UI.goldBright;
  ctx.font = font(10, true);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('理性', sx + 5, sy + sanH / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.font = font(9);
  ctx.fillText(
    `${Math.floor(game._displaySan)}/${player.maxSan}`,
    sx + sanW - 36,
    sy + sanH / 2
  );
  ctx.textBaseline = 'alphabetic';

  const prog = game.objective && game.objective.progress;
  const ammo = (player.collectedChars || []).length;
  const poemY = sy + sanH + 14;
  if (prog) {
    const panelW = 250,
      panelH = 40;
    ctx.fillStyle = 'rgba(22,17,10,0.78)';
    roundRect(ctx, sx, poemY, panelW, panelH, 4);
    ctx.fill();
    ctx.strokeStyle = UI.goldLine;
    ctx.lineWidth = 1;
    roundRect(ctx, sx, poemY, panelW, panelH, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(212,168,90,0.4)';
    ctx.fillRect(sx, poemY, panelW, 2);
    ctx.fillStyle = UI.goldBright;
    ctx.font = font(10, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('碎片 · ' + prog.title, sx + 8, poemY + 12);
    let cxp = sx + 10;
    const cy2 = poemY + 28;
    for (const { c, have } of prog.chars) {
      ctx.fillStyle = have ? 'rgba(70,55,25,0.9)' : 'rgba(40,40,44,0.8)';
      roundRect(ctx, cxp, cy2 - 9, 18, 18, 3);
      ctx.fill();
      ctx.strokeStyle = have ? UI.goldBright : 'rgba(110,110,120,0.6)';
      ctx.lineWidth = 1;
      roundRect(ctx, cxp, cy2 - 9, 18, 18, 3);
      ctx.stroke();
      ctx.fillStyle = have ? 'rgba(255,232,150,1)' : 'rgba(120,120,128,0.7)';
      ctx.font = font(12, true);
      ctx.textAlign = 'center';
      ctx.fillText(c, cxp + 9, cy2);
      if (have) {
        ctx.fillStyle = UI.ok;
        ctx.font = font(9, true);
        ctx.fillText('✓', cxp + 15, cy2 - 6);
      }
      cxp += 24;
    }
    ctx.fillStyle = UI.inkSoft;
    ctx.font = font(10);
    ctx.textAlign = 'right';
    ctx.fillText('诗词弹药 ×' + ammo, sx + panelW - 8, poemY + 12);
  } else {
    const panelW = 250;
    ctx.fillStyle = 'rgba(22,17,10,0.7)';
    roundRect(ctx, sx, poemY, panelW, 22, 3);
    ctx.fill();
    ctx.strokeStyle = UI.goldLine;
    ctx.lineWidth = 1;
    roundRect(ctx, sx, poemY, panelW, 22, 3);
    ctx.stroke();
    ctx.fillStyle = UI.gold;
    ctx.font = font(10, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('诗词弹药 ×' + ammo, sx + 8, poemY + 11);
  }
  ctx.textBaseline = 'alphabetic';

  // 任务目标（顶部中央）
  if (objective && !objective.done) {
    const ox = W / 2,
      oy = 14;
    const ow = Math.min(360, W - 40),
      oh = 30;
    ctx.fillStyle = 'rgba(20,15,10,0.85)';
    roundRect(ctx, ox - ow / 2, oy, ow, oh, 4);
    ctx.fill();
    ctx.strokeStyle = UI.gold;
    ctx.lineWidth = 1.5;
    roundRect(ctx, ox - ow / 2, oy, ow, oh, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(212,168,90,0.5)';
    ctx.fillRect(ox - ow / 2, oy, ow, 2);
    ctx.fillStyle = UI.gold;
    ctx.font = font(12, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('目  标', ox - ow / 2 + 40, oy + oh / 2);
    ctx.fillStyle = UI.ink;
    ctx.font = font(13);
    ctx.textAlign = 'left';
    ctx.fillText(objective.text, ox - ow / 2 + 80, oy + oh / 2);
    ctx.textBaseline = 'alphabetic';
  }

  const scene = game.scene;
  // 竖屏：场景信息与火苗放到底部；横屏：右上（避开小地图）
  let mx, my, panelH = 60;
  if (portrait) {
    mx = 16;
    my = H - 72;
  } else {
    const miniH = game._showMinimap ? 132 + 12 : 0;
    mx = W - 200;
    my = 14 + miniH;
  }
  ctx.fillStyle = 'rgba(20,15,10,0.7)';
  roundRect(ctx, mx, my, 184, panelH, 4);
  ctx.fill();
  ctx.strokeStyle = UI.goldLine;
  ctx.lineWidth = 1;
  roundRect(ctx, mx, my, 184, panelH, 4);
  ctx.stroke();

  ctx.fillStyle = UI.gold;
  ctx.font = font(11, true);
  ctx.textAlign = 'left';
  ctx.fillText(scene.name, mx + 10, my + 16);

  ctx.fillStyle = 'rgba(200,200,200,0.7)';
  ctx.font = font(9);
  const saved = game.karma ? game.karma.saved : 0;
  ctx.fillText(saved > 0 ? `已唤醒失语者 ${saved}` : '尚未唤醒失语者', mx + 10, my + 32);

  ctx.fillStyle = player.hasClothes ? UI.ok : 'rgba(220,120,120,0.9)';
  ctx.fillText(player.hasClothes ? '已穿装备' : '未穿装备', mx + 10, my + 46);
  ctx.textAlign = 'left';

  // 语言之火
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

  ctx.fillStyle = UI.inkFaint;
  ctx.font = fontMono(9);
  ctx.textAlign = 'right';
  ctx.fillText(CONTROL_HINTS.worldFooter, W - 12, H - 8);
  ctx.textAlign = 'left';
}

// ============================================================
// 章节门禁可视化
// ============================================================
export function drawGates(ctx, W2S, scene, game, gameTime) {
  for (const it of scene.interactables) {
    if (it.type !== 'scene_change' || !it.gate) continue;
    const g = it.gate;
    const charsOk = game.meetsGate(g).ok;
    const puzzleDone = !g.puzzle || game.solvedPuzzles.has(g.puzzle);
    const locked = !charsOk || !puzzleDone;
    const readyToCompose = charsOk && !puzzleDone;
    const s = W2S(it.x, it.y);
    if (s.y < -160 || s.y > H + 160) continue;
    const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;

    if (locked) {
      const bw = 150,
        bh = 90;
      const flow = (gameTime * 0.05) % 18;
      const fogA = '90,210,110';
      const fogB = '70,150,120';
      const lineC = '150,255,170';
      const lockC = '255,90,90';
      const lockStroke = '255,120,120';
      const textC = '255,150,150';

      const grad = ctx.createRadialGradient(s.x, s.y - 10, 6, s.x, s.y - 10, 90);
      grad.addColorStop(0, `rgba(${fogA},${0.22 + pulse * 0.12})`);
      grad.addColorStop(0.6, `rgba(${fogB},0.12)`);
      grad.addColorStop(1, 'rgba(40,60,60,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 10, 90, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${lineC},${0.35 + pulse * 0.25})`;
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
      const lx = s.x,
        ly = s.y - 46;
      ctx.fillStyle = `rgba(${lockC},${0.7 + pulse * 0.3})`;
      ctx.shadowColor = 'rgba(255,80,80,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillRect(lx - 7, ly, 14, 11);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(${lockStroke},0.8)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ly, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,10,10,0.9)';
      ctx.fillRect(lx - 1.2, ly + 3, 2.4, 5);
      ctx.fillStyle = `rgba(${textC},${0.7 + pulse * 0.3})`;
      ctx.font = font(11, true);
      ctx.textAlign = 'center';
      ctx.fillText(readyToCompose ? 'E 复原诗句，破除封锁' : '此路被污染封锁', s.x, s.y - 56);
      ctx.textAlign = 'left';
    } else {
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
      ctx.font = font(13, true);
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
  if (dist < 70) return;
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
  ctx.rotate(-angle);
  ctx.fillStyle = `rgba(255,228,150,${pulse})`;
  ctx.font = font(11, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.floor(dist)}`, 0, -17);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.restore();
}

export function drawDamageOverlay(ctx, player, gameTime) {
  void gameTime;
  const a = Math.min(0.35, (player.invulnerable / 800) * 0.35);
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
  grad.addColorStop(0, 'rgba(220,40,40,0)');
  grad.addColorStop(1, `rgba(220,40,40,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (Math.random() < 0.3) {
    ctx.fillStyle = 'rgba(255,100,100,0.04)';
    ctx.fillRect(0, 0, W, H);
  }
}
