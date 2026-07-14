// 划墨切梗战斗渲染
import { W, H } from '../config.js';
import { roundRect } from './util.js';
import { UI, font } from '../ui/tokens.js';

export function drawSlashBattle(ctx, battle, gameTime) {
  // 底
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, '#1a1510');
  g.addColorStop(1, '#07080c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 淡网格（宣纸感）
  ctx.strokeStyle = 'rgba(255,220,160,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // 敌人位置移到上方顶端，不再占死中央，让出战斗舞台
  const cx = W / 2;
  const cy = 110;
  const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;

  // 敌人剪影
  ctx.save();
  ctx.translate(cx, cy);
  const hurt = battle.enemy.hp / Math.max(1, battle.enemy.maxHp);
  ctx.fillStyle = `rgba(60,${80 + Math.floor(hurt * 80)},60,0.85)`;
  ctx.beginPath();
  ctx.ellipse(0, 10, 24, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(100,255,140,${0.35 + pulse * 0.2})`;
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.fillText(battle.enemy.name || '梗鬼', 0, -40);
  ctx.restore();

  // 方案 2 视觉效果：文字护盾盘旋在玩家中心点（屏幕中央 H/2 - 20）
  const px_center = W / 2;
  const py_center = H / 2 - 20;
  
  // 中心护持圈
  ctx.strokeStyle = `rgba(255,200,120,${0.18 + pulse * 0.12})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px_center, py_center, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,220,140,${0.04 + pulse * 0.03})`;
  ctx.beginPath();
  ctx.arc(px_center, py_center, 36, 0, Math.PI * 2);
  ctx.fill();

  // 盘旋的字盾（金色发光字，两两电弧连线）
  const chars = battle.shieldChars || [];
  const rot = battle.shieldRot || 0;
  const radius = 90 + Math.sin(gameTime * 0.003) * 5;
  const charPos = [];
  
  for (let i = 0; i < chars.length; i++) {
    const a = rot + (i / chars.length) * Math.PI * 2;
    const x = px_center + Math.cos(a) * radius;
    const y = py_center + Math.sin(a) * radius;
    charPos.push({ x, y, char: chars[i] });
  }

  // 绘制电弧（诗意连线）
  if (charPos.length > 1) {
    ctx.strokeStyle = 'rgba(255,215,140,0.18)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(charPos[0].x, charPos[0].y);
    for (let i = 1; i < charPos.length; i++) {
      ctx.lineTo(charPos[i].x, charPos[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 绘制环绕的汉字
  ctx.font = 'bold 15px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const cp of charPos) {
    ctx.shadowColor = 'rgba(255,215,142,0.85)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(32,24,18,0.92)';
    roundRect(ctx, cp.x - 12, cp.y - 12, 24, 24, 4);
    ctx.fill();
    ctx.strokeStyle = UI.goldLine;
    ctx.lineWidth = 1;
    roundRect(ctx, cp.x - 12, cp.y - 12, 24, 24, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = UI.goldBright;
    ctx.fillText(cp.char, cp.x, cp.y);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // 飞字
  for (const w of battle.words || []) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.rot || 0);
    const flash = w.hitFlash > 0;
    ctx.shadowColor = flash ? 'rgba(255,255,180,0.95)' : 'rgba(80,255,120,0.8)';
    ctx.shadowBlur = flash ? 16 : 12;
    ctx.fillStyle = w.tough ? 'rgba(28,55,38,0.88)' : 'rgba(40,70,45,0.75)';
    const tw = Math.max(40, w.text.length * 16);
    roundRect(ctx, -tw / 2, -16, tw, 32, 4);
    ctx.fill();
    ctx.strokeStyle = w.tough
      ? `rgba(180,255,200,${0.85 + pulse * 0.15})`
      : `rgba(120,255,150,${0.7 + pulse * 0.2})`;
    ctx.lineWidth = w.tough ? 2.5 : 1.5;
    roundRect(ctx, -tw / 2, -16, tw, 32, 4);
    ctx.stroke();
    if (w.tough && w.hp > 1) {
      ctx.fillStyle = 'rgba(255,240,160,0.85)';
      ctx.font = 'bold 9px serif';
      ctx.textAlign = 'center';
      ctx.fillText('坚', 0, -22);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = flash ? 'rgba(255,255,220,0.98)' : 'rgba(180,255,190,0.95)';
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(w.text, 0, 0);
    ctx.restore();
  }

  // 切开碎片
  for (const s of battle.shards || []) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.beginPath();
    // 半片裁剪感
    if (s.half < 0) ctx.rect(-40, -16, 40, 32);
    else ctx.rect(0, -16, 40, 32);
    ctx.clip();
    ctx.globalAlpha = Math.max(0, s.life / 500);
    ctx.fillStyle = 'rgba(100,255,140,0.9)';
    ctx.font = 'bold 15px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, 0, 0);
    ctx.restore();
  }

  // 划线金墨
  const stroke = battle.stroke || [];
  if (stroke.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1];
      const b = stroke[i];
      const age = Math.min(1, (battle.timer - b.t) / 180);
      const w = 5 * (1 - age) + 1;
      ctx.strokeStyle = `rgba(255,220,120,${0.95 - age * 0.85})`;
      ctx.shadowColor = 'rgba(255,200,80,0.9)';
      ctx.shadowBlur = 8 * (1 - age);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // 粒子
  for (const p of battle.particles || []) {
    const a = p.life / (p.maxLife || 400);
    ctx.globalAlpha = a;
    if (p.glyph) {
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.font = 'bold 14px serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.glyph, p.x, p.y);
    } else {
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.size || 3) * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 飘字伤害
  for (const f of battle.floats || []) {
    ctx.globalAlpha = Math.max(0, f.life / 700);
    ctx.fillStyle = f.color || '#ffd';
    ctx.font = 'bold 18px serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  // 描字大招
  if (battle.phase === 'carve' && battle.carve) {
    const c = battle.carve;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    // 宣纸
    ctx.fillStyle = 'rgba(30,26,20,0.92)';
    roundRect(ctx, c.cx - 140, c.cy - 140, 280, 280, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,140,0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, c.cx - 140, c.cy - 140, 280, 280, 8);
    ctx.stroke();
    // 虚线目标字
    ctx.strokeStyle = `rgba(255,220,140,${0.35 + pulse * 0.2})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.font = `bold ${c.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(c.glyph, c.cx, c.cy);
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255,230,150,${0.15 + c.progress * 0.7})`;
    ctx.fillText(c.glyph, c.cx, c.cy);
    // 玩家轨迹
    if (c.trail && c.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,220,120,0.9)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.trail[0].x, c.trail[0].y);
      for (let i = 1; i < c.trail.length; i++) ctx.lineTo(c.trail[i].x, c.trail[i].y);
      ctx.stroke();
    }
    // 进度
    ctx.fillStyle = UI.gold;
    ctx.font = font(13, true);
    ctx.fillText(`描摹「${c.glyph}」 ${Math.floor(c.progress * 100)}%`, c.cx, c.cy + 160);
  }

  // HUD
  // 敌人血条
  const barW = 280;
  const bx = (W - barW) / 2;
  const by = 28;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, bx, by, barW, 16, 4);
  ctx.fill();
  const ratio = Math.max(0, battle.enemy.hp / Math.max(1, battle.enemy.maxHp));
  ctx.fillStyle = ratio > 0.3 ? 'rgba(120,230,140,0.9)' : 'rgba(230,90,90,0.9)';
  roundRect(ctx, bx + 1, by + 1, (barW - 2) * ratio, 14, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,140,0.4)';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, barW, 16, 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,180,0.9)';
  ctx.font = 'bold 12px serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${battle.enemy.name || '梗鬼'}  ${Math.ceil(battle.enemy.hp)}/${battle.enemy.maxHp}`, W / 2, by + 8);

  // 理性
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 12px serif';
  ctx.fillText('理性', 24, H - 48);
  ctx.fillStyle = '#400';
  ctx.fillRect(60, H - 56, 140, 12);
  const sr = Math.max(0, battle.san / Math.max(1, battle.maxSan));
  ctx.fillStyle = sr > 0.3 ? '#7ad07a' : '#e44';
  ctx.fillRect(60, H - 56, 140 * sr, 12);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(60, H - 56, 140, 12);

  // 连击
  if (battle.combo > 1) {
    ctx.fillStyle = `rgba(255,220,120,${0.7 + pulse * 0.3})`;
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${battle.combo} 连切`, W - 28, 56);
  }

  // 提示
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,210,180,0.75)';
  ctx.font = '12px serif';
  if (battle.phase === 'intro') {
    ctx.fillStyle = 'rgba(255,230,160,0.95)';
    ctx.font = 'bold 18px serif';
    ctx.fillText('刻 刀 · 划 墨', W / 2, H / 2 - 10);
    ctx.font = '13px serif';
    ctx.fillText('拖动切开绿色烂梗', W / 2, H / 2 + 18);
  } else if (battle.phase === 'fight') {
    ctx.fillText(battle.hint || '拖动切开烂梗 · K 描字大招', W / 2, H - 22);
    const ammo = (battle.player.collectedChars || []).length;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,220,140,0.7)';
    ctx.fillText(`字弹药 ×${ammo}  ·  K 描字`, W - 24, H - 22);
  }

  // 敌人气泡
  if (battle.enemyText && battle.enemyTextTimer > 0) {
    const a = Math.min(1, battle.enemyTextTimer / 400);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,30,22,0.88)';
    const tw = Math.min(360, ctx.measureText(battle.enemyText).width + 24);
    roundRect(ctx, W / 2 - tw / 2, 56, tw, 28, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,255,170,0.95)';
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.fillText(battle.enemyText, W / 2, 70);
    ctx.globalAlpha = 1;
  }

  // 结果
  if (battle.phase === 'result') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    const ok = battle.result === 'win' || battle.result === 'purify' || battle.result === 'spare';
    ctx.fillStyle = ok ? 'rgba(255,230,150,0.95)' : 'rgba(255,120,120,0.95)';
    ctx.font = 'bold 32px serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      battle.result === 'purify' ? '净 化' : battle.result === 'lose' ? '失 语' : '胜 利',
      W / 2,
      H / 2
    );
  }

  // intro 淡入
  if (battle.fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${battle.fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
