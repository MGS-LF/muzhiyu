// 渲染模块：hud
import { W, H } from '../config.js';
import { roundRect } from './util.js';

// ============================================================
// HUD
// ============================================================
export function drawHUD(ctx, player, game, objective) {
  const sanW = 140;
  const sanH = 14;
  const sx = 16, sy = 14;
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
  ctx.fillText('理性', sx + 5, sy + sanH/2);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.font = '9px serif';
  ctx.fillText(`${Math.floor(player.san)}/${player.maxSan}`, sx + sanW - 36, sy + sanH/2);
  ctx.textBaseline = 'alphabetic';

  // 章节碎片进度面板（直接回答"还要做什么"）
  const prog = game.objective && game.objective.progress;
  const ammo = (player.collectedChars || []).length;
  const poemY = sy + sanH + 14;
  if (prog) {
    const panelW = 250, panelH = 40;
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
    const ox = W / 2, oy = 14;
    const ow = 360, oh = 30;
    ctx.fillStyle = 'rgba(20,15,10,0.85)';
    roundRect(ctx, ox - ow/2, oy, ow, oh, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,170,80,0.7)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, ox - ow/2, oy, ow, oh, 4);
    ctx.stroke();
    // 顶部金色边
    ctx.fillStyle = 'rgba(220,170,80,0.5)';
    ctx.fillRect(ox - ow/2, oy, ow, 2);
    // 任务文字
    ctx.fillStyle = 'rgba(255,210,120,0.95)';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('目  标', ox - ow/2 + 40, oy + oh/2);
    ctx.fillStyle = 'rgba(232,220,200,0.95)';
    ctx.font = '13px serif';
    ctx.textAlign = 'left';
    ctx.fillText(objective.text, ox - ow/2 + 80, oy + oh/2);
    ctx.textBaseline = 'alphabetic';
  }

  const scene = game.scene;
  // 右上角场景信息面板：当小地图显示时下移到小地图下方，避免重叠
  const miniH = game._showMinimap ? 132 + 12 : 0; // 小地图高度 120 + margin 12
  ctx.fillStyle = 'rgba(20,15,10,0.7)';
  const mx = W - 200, my = 14 + miniH;
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
    const fx = mx + 168, fy = my + 26;
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
  ctx.font = '9px monospace'; ctx.textAlign = 'right';
  ctx.fillText('J 任务 · M 地图 · F2 调试', W - 12, H - 8);
  ctx.textAlign = 'left';
}
