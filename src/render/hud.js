import { roundRect } from './util.js';
import { CONTROL_HINTS } from '../data/controls.js';
import { W, H } from '../config.js';
import * as cfg from '../config.js';
import { UI, font, fontMono, isPortrait } from '../ui/tokens.js';
import { AI } from '../ai/config.js';

const FEATURES = cfg.FEATURES || {};

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
  if (
    game._lastSanHud !== null &&
    game._lastSanHud !== undefined &&
    game._lastSanHud !== player.san
  ) {
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
  ctx.fillRect(sx, sy, sanW, sanH);
  let barColor = ratio > 0.6 ? UI.ok : ratio > 0.3 ? UI.warn : UI.danger;
  if (game._sanPulse > 0) {
    const p = game._sanPulse / 200;
    if (game._sanPulseDir > 0) barColor = `rgba(0,240,255,${0.7 + p * 0.3})`;
    else if (game._sanPulseDir < 0) barColor = `rgba(211,54,54,${0.7 + p * 0.3})`;
  }
  ctx.fillStyle = barColor;
  ctx.fillRect(sx, sy, sanW * ratio, sanH);
  ctx.strokeStyle = UI.panelLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(sx, sy, sanW, sanH);
  ctx.fillStyle = '#000000';
  ctx.font = font(11, true);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('理性', sx + 5, sy + sanH / 2);

  // 将具体数值 100/100 移出理性条本身，改到右侧作为白字呈现，防止与能量条颜色冲突影响阅读
  ctx.fillStyle = UI.ink;
  ctx.font = font(11, true);
  ctx.fillText(`${Math.floor(game._displaySan)}/${player.maxSan}`, sx + sanW + 8, sy + sanH / 2);
  ctx.textBaseline = 'alphabetic';

  const prog = game.objective && game.objective.progress;
  const ammo = (player.collectedChars || []).length;
  const poemY = sy + sanH + 14;
  if (prog) {
    const panelW = 250,
      panelH = 40;
    ctx.fillStyle = UI.panelBg;
    ctx.fillRect(sx, poemY, panelW, panelH);
    ctx.strokeStyle = UI.panelLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, poemY, panelW, panelH);
    ctx.fillStyle = UI.ok;
    ctx.font = font(11, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('碎片 · ' + prog.title, sx + 8, poemY + 12);
    let cxp = sx + 10;
    const cy2 = poemY + 28;
    for (const { c, have } of prog.chars) {
      ctx.fillStyle = have ? 'rgba(217,155,66,0.2)' : 'rgba(20,22,26,0.9)';
      ctx.fillRect(cxp, cy2 - 9, 18, 18);
      ctx.strokeStyle = have ? UI.gold : 'rgba(94,99,107,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cxp, cy2 - 9, 18, 18);
      ctx.fillStyle = have ? UI.ink : 'rgba(100,105,115,0.7)';
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
    ctx.font = font(11, true);
    ctx.textAlign = 'right';
    ctx.fillText('弹药 ×' + ammo, sx + panelW - 8, poemY + 12);
  } else {
    const panelW = 250;
    ctx.fillStyle = UI.panelBg;
    ctx.fillRect(sx, poemY, panelW, 22);
    ctx.strokeStyle = UI.panelLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, poemY, panelW, 22);
    ctx.fillStyle = UI.gold;
    ctx.font = font(11, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('诗词弹药 ×' + ammo, sx + 8, poemY + 11);
  }
  ctx.textBaseline = 'alphabetic';

  // 词袋：你「记得」的字（补诗用）
  if (FEATURES.utterance) {
    const bagMax = (cfg.UTTERANCE && cfg.UTTERANCE.beltMax) || 6;
    const bag = [...new Set(player.collectedCharsAll || [])].slice(0, bagMax);
    const bagY = poemY + (prog ? 48 : 30);
    const bagW = 250;
    const bagH = 28;
    ctx.fillStyle = UI.panelBg;
    ctx.fillRect(sx, bagY, bagW, bagH);
    ctx.strokeStyle = UI.panelLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, bagY, bagW, bagH);
    ctx.fillStyle = UI.ok;
    ctx.font = font(11, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('词袋', sx + 8, bagY + bagH / 2);
    let bx = sx + 38;
    for (let i = 0; i < bagMax; i++) {
      const ch = bag[i];
      ctx.fillStyle = ch ? 'rgba(0,240,255,0.08)' : 'rgba(20,22,26,0.9)';
      ctx.fillRect(bx, bagY + 5, 18, 18);
      ctx.strokeStyle = ch ? UI.ok : 'rgba(94,99,107,0.3)';
      ctx.lineWidth = 1;
      if (!ch) ctx.setLineDash([2, 2]);
      ctx.strokeRect(bx, bagY + 5, 18, 18);
      ctx.setLineDash([]);
      if (ch) {
        ctx.fillStyle = UI.ink;
        ctx.font = font(12, true);
        ctx.textAlign = 'center';
        ctx.fillText(ch, bx + 9, bagY + bagH / 2);
      }
      bx += 22;
    }
    ctx.fillStyle = UI.inkFaint;
    ctx.font = font(10, true);
    ctx.textAlign = 'right';
    ctx.fillText('F 补诗', sx + bagW - 8, bagY + bagH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // 任务目标（顶部中央）— 文案随 refreshObjective 更新
  if (objective && !objective.done) {
    const ox = W / 2,
      oy = 14;
    const text = objective.text || '';
    ctx.font = font(12, true);
    const textW = Math.min(ctx.measureText(text).width + 100, W - 48);
    const ow = Math.max(280, Math.min(420, textW));
    const oh = 32;

    ctx.fillStyle = UI.panelBg;
    ctx.fillRect(ox - ow / 2, oy, ow, oh);
    ctx.strokeStyle = UI.panelLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - ow / 2, oy, ow, oh);

    ctx.fillStyle = UI.ok;
    ctx.fillRect(ox - ow / 2 + 6, oy + 5, 2, oh - 10);
    ctx.fillRect(ox + ow / 2 - 8, oy + 5, 2, oh - 10);

    ctx.fillStyle = UI.ok;
    ctx.font = font(12, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('目标', ox - ow / 2 + 36, oy + oh / 2);
    ctx.fillStyle = UI.ink;
    ctx.font = font(13, true);
    ctx.textAlign = 'left';
    // 过长截断
    let drawText = text;
    const maxTw = ow - 88;
    if (ctx.measureText(drawText).width > maxTw) {
      while (drawText.length > 4 && ctx.measureText(drawText + '…').width > maxTw) {
        drawText = drawText.slice(0, -1);
      }
      drawText += '…';
    }
    ctx.fillText(drawText, ox - ow / 2 + 58, oy + oh / 2);
    ctx.textBaseline = 'alphabetic';
  }

  const scene = game.scene;
  // 竖屏：场景信息与火苗放到底部；横屏：右上（避开小地图）
  let mx,
    my,
    panelH = FEATURES.aiDirector ? 88 : 74;
  if (portrait) {
    mx = 16;
    my = H - (panelH + 12);
  } else {
    const miniH = game._showMinimap ? 132 + 12 : 0;
    mx = W - 200;
    my = 14 + miniH;
  }
  ctx.fillStyle = UI.panelBg;
  ctx.fillRect(mx, my, 184, panelH);
  ctx.strokeStyle = UI.panelLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, 184, panelH);

  ctx.fillStyle = UI.ok;
  ctx.font = font(13, true);
  ctx.textAlign = 'left';
  ctx.fillText(scene.name, mx + 10, my + 18);

  const mercy = (game.karma && game.karma.mercy) || 0;
  const violence = (game.karma && game.karma.violence) || 0;
  const saved = (game.karma && game.karma.saved) || 0;
  ctx.font = font(10, true);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.95)';
  ctx.fillText(`慈悲 ${mercy}`, mx + 10, my + 34);
  ctx.fillStyle = 'rgba(211, 54, 54, 0.95)';
  ctx.fillText(`残忍 ${violence}`, mx + 78, my + 34);
  ctx.fillStyle = UI.inkSoft;
  ctx.font = font(10, true);
  ctx.fillText(saved > 0 ? `已唤醒 ${saved}` : '尚未唤醒失语者', mx + 10, my + 48);

  ctx.fillStyle = player.hasClothes ? UI.ok : 'rgba(211, 54, 54, 0.9)';
  ctx.fillText(player.hasClothes ? '已穿装备' : '未穿装备', mx + 10, my + 62);

  // 叙事导演 / 配音在线状态（参赛演示可见）
  if (FEATURES.aiDirector) {
    const llmOn = !!(AI.ready && AI.llm);
    const ttsOn = !!(AI.ready && AI.tts);
    ctx.fillStyle = llmOn ? UI.ok : UI.inkFaint;
    ctx.font = font(9, true);
    const bits = [];
    bits.push(llmOn ? '导演在线' : '导演离线');
    bits.push(ttsOn ? '配音在线' : '配音离线');
    const clueN = (game.storyState && game.storyState.clues && game.storyState.clues.length) || 0;
    if (clueN) bits.push(`线索${clueN}`);
    ctx.fillText(bits.join(' · '), mx + 10, my + 76);
  }
  ctx.textAlign = 'left';

  // 语言之火
  if (game.karma) {
    const warm = game.karma.mercy + game.karma.saved;
    const cold = game.karma.violence;
    const fl = Math.max(0.25, Math.min(1, 0.45 + (warm - cold) * 0.12));
    const fx = mx + 168,
      fy = my + 26;
    const fcol = cold > warm + 1 ? '211,54,54' : '0,240,255';
    ctx.save();
    ctx.shadowColor = `rgba(${fcol},${fl})`;
    ctx.shadowBlur = 9 * fl;
    ctx.fillStyle = `rgba(${fcol},${0.5 + fl * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 9);
    ctx.lineTo(fx + 6, fy + 3);
    ctx.lineTo(fx - 6, fy + 3);
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
      // 赛博碑刻：采用水泥灰和朱砂红的极简硬派条纹遮罩
      const fogA = '7, 8, 10'; // 炭黑
      const fogB = '110, 115, 122'; // 水泥灰
      const lineC = '94, 99, 107'; // 细线框色
      const lockC = '211, 54, 54'; // 朱砂红
      const lockStroke = '255, 100, 100';
      const textC = '235, 230, 220';

      const grad = ctx.createRadialGradient(s.x, s.y - 10, 6, s.x, s.y - 10, 90);
      grad.addColorStop(0, `rgba(${fogA},${0.4 + pulse * 0.2})`);
      grad.addColorStop(0.6, `rgba(${fogB},0.2)`);
      grad.addColorStop(1, 'rgba(7, 8, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 10, 90, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${lineC},${0.4 + pulse * 0.3})`;
      ctx.lineWidth = 1.0;
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
      // 锁图标 (直角化)
      const lx = s.x,
        ly = s.y - 46;
      ctx.fillStyle = `rgba(${lockC},${0.8 + pulse * 0.2})`;
      ctx.fillRect(lx - 7, ly, 14, 11);
      ctx.strokeStyle = `rgba(${lockStroke},0.9)`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(lx - 5, ly - 6, 10, 6);
      ctx.fillStyle = 'rgba(7,8,10,0.95)';
      ctx.fillRect(lx - 1.2, ly + 3, 2.4, 5);

      ctx.fillStyle = `rgba(${textC},${0.8 + pulse * 0.2})`;
      ctx.font = font(12, true);
      ctx.textAlign = 'center';
      ctx.fillText(readyToCompose ? 'E 复原诗句，破除封锁' : '此路被污染封锁', s.x, s.y - 56);
      ctx.textAlign = 'left';
    } else {
      // 优化通路开启：直角鎏金微光粒子与光环
      ctx.save();
      ctx.fillStyle = `rgba(217, 155, 66, ${pulse * 0.3})`;
      ctx.fillRect(s.x - 40, s.y - 60, 80, 80);

      ctx.fillStyle = `rgba(217, 155, 66, ${pulse * 0.2})`;
      ctx.fillRect(s.x - 30, s.y - 2, 60, 4);
      ctx.restore();

      ctx.fillStyle = `rgba(235, 230, 220, ${0.8 + pulse * 0.2})`;
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
  ctx.fillStyle = `rgba(0,240,255,${pulse})`;
  ctx.shadowColor = `rgba(0,240,255,${pulse * 0.8})`;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-8, -8);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.rotate(-angle);
  ctx.fillStyle = `rgba(0,240,255,${pulse})`;
  ctx.font = font(12, true);
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
  grad.addColorStop(0, 'rgba(211,54,54,0)');
  grad.addColorStop(1, `rgba(211,54,54,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (Math.random() < 0.3) {
    ctx.fillStyle = 'rgba(211,54,54,0.04)';
    ctx.fillRect(0, 0, W, H);
  }
}
