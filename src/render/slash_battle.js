// 划墨切梗战斗渲染
import { W, H } from '../config.js';
import { roundRect } from './util.js';
import { UI, font } from '../ui/tokens.js';
import { SLASH_LAYOUT } from '../slash_battle.js';

function drawGengEnemy(ctx, x, y, gameTime, mouthOpen, hpRatio) {
  const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
  const bob = Math.sin(gameTime * 0.004) * 4;
  ctx.save();
  ctx.translate(x, y + bob);

  // 外发光
  ctx.shadowColor = 'rgba(80,220,100,0.75)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = `rgba(50,120,70,${0.2 + pulse * 0.1})`;
  ctx.beginPath();
  ctx.ellipse(0, 8, 42, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 身体
  const g = 80 + Math.floor(hpRatio * 90);
  ctx.fillStyle = `rgba(50,${g},70,0.55)`;
  ctx.beginPath();
  ctx.moveTo(-10, -20);
  ctx.lineTo(-32, 38);
  ctx.lineTo(32, 38);
  ctx.lineTo(10, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,255,150,0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 头
  ctx.fillStyle = `rgba(55,${g + 10},75,0.6)`;
  ctx.beginPath();
  ctx.ellipse(0, -32, 28, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,255,160,0.9)';
  ctx.stroke();

  // 大嘴（吐字时张大）
  const mouthH = 8 + mouthOpen * 14;
  ctx.fillStyle = 'rgba(15,30,18,0.95)';
  ctx.beginPath();
  ctx.ellipse(0, -22, 16 + mouthOpen * 4, mouthH, 0, 0, Math.PI * 2);
  ctx.fill();
  // 牙
  ctx.fillStyle = 'rgba(220,255,220,0.85)';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4 - 1.2, -28);
    ctx.lineTo(i * 4, -22 + mouthOpen * 4);
    ctx.lineTo(i * 4 + 1.2, -28);
    ctx.closePath();
    ctx.fill();
  }

  // 名
  ctx.fillStyle = `rgba(160,255,180,${0.5 + pulse * 0.3})`;
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'center';
  ctx.fillText('吐出烂梗……', 0, -72);

  ctx.restore();
}

function drawPlayerCore(ctx, x, y, gameTime) {
  const pulse = 0.5 + Math.sin(gameTime * 0.006) * 0.3;
  // 护持圈
  ctx.strokeStyle = `rgba(255,200,120,${0.25 + pulse * 0.2})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, SLASH_LAYOUT.guardR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,220,140,${0.05 + pulse * 0.03})`;
  ctx.beginPath();
  ctx.arc(x, y, SLASH_LAYOUT.guardR - 4, 0, Math.PI * 2);
  ctx.fill();

  // 小人剪影
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,220,190,0.95)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  // 身
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x, y - 6);
  ctx.stroke();
  // 头
  ctx.fillStyle = 'rgba(236,218,185,0.95)';
  ctx.beginPath();
  ctx.arc(x, y - 14, 7, 0, Math.PI * 2);
  ctx.fill();
  // 腿
  ctx.strokeStyle = 'rgba(200,190,170,0.9)';
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x - 6, y + 22);
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x + 6, y + 22);
  ctx.stroke();
  // 刻刀提示
  ctx.strokeStyle = `rgba(255,220,120,${0.5 + pulse * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 2);
  ctx.lineTo(x + 18, y - 14);
  ctx.stroke();
}

export function drawSlashBattle(ctx, battle, gameTime) {
  const L = SLASH_LAYOUT;
  const ex = L.enemyX();
  const ey = L.enemyY();
  const px = L.playerX();
  const py = L.playerY();
  const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
  const hpRatio = battle.enemy.hp / Math.max(1, battle.enemy.maxHp);
  const mouthOpen = battle.mouthOpen || 0;

  // 背景：上绿下金的对抗色
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0c1810');
  bg.addColorStop(0.35, '#0a0c10');
  bg.addColorStop(1, '#12100c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 从嘴到玩家的淡引导线（说明「字从哪来」）
  if (battle.phase === 'fight' || battle.phase === 'intro') {
    ctx.strokeStyle = `rgba(100,220,130,${0.08 + mouthOpen * 0.12})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(ex, ey + 30);
    ctx.lineTo(px, py - 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 敌人（上方）
  drawGengEnemy(ctx, ex, ey, gameTime, mouthOpen, hpRatio);

  // 吐字瞬间：嘴里喷出的残影
  for (const s of battle.spitFx || []) {
    const a = Math.max(0, s.life / (s.maxLife || 280));
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(140,255,160,0.9)';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.text, s.x + (1 - a) * 8, s.y + (1 - a) * 20);
    ctx.globalAlpha = 1;
  }

  // 玩家核心 + 字盾
  drawPlayerCore(ctx, px, py, gameTime);

  const chars = battle.shieldChars || [];
  const rot = battle.shieldRot || 0;
  const radius = L.shieldR + Math.sin(gameTime * 0.003) * 4;
  const charPos = [];
  for (let i = 0; i < chars.length; i++) {
    const a = rot + (i / Math.max(1, chars.length)) * Math.PI * 2;
    charPos.push({
      x: px + Math.cos(a) * radius,
      y: py + Math.sin(a) * radius,
      char: chars[i],
    });
  }
  if (charPos.length > 1) {
    ctx.strokeStyle = 'rgba(255,215,140,0.2)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(charPos[0].x, charPos[0].y);
    for (let i = 1; i < charPos.length; i++) ctx.lineTo(charPos[i].x, charPos[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const cp of charPos) {
    ctx.shadowColor = 'rgba(255,215,142,0.85)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(32,24,18,0.92)';
    roundRect(ctx, cp.x - 11, cp.y - 11, 22, 22, 4);
    ctx.fill();
    ctx.strokeStyle = UI.goldLine;
    ctx.lineWidth = 1;
    roundRect(ctx, cp.x - 11, cp.y - 11, 22, 22, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = UI.goldBright;
    ctx.fillText(cp.char, cp.x, cp.y);
  }
  ctx.textBaseline = 'alphabetic';

  // 飞字
  for (const w of battle.words || []) {
    if (!w || !Number.isFinite(w.x)) continue;
    if (w.scaleIn < 1) w.scaleIn = Math.min(1, (w.scaleIn || 0) + 0.08);
    const sc = 0.4 + 0.6 * (w.scaleIn || 1);
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.rot || 0);
    ctx.scale(sc, sc);
    const flash = w.hitFlash > 0;
    ctx.shadowColor = flash ? 'rgba(255,255,180,0.95)' : 'rgba(80,255,120,0.85)';
    ctx.shadowBlur = flash ? 18 : 14;
    ctx.fillStyle = w.tough ? 'rgba(28,55,38,0.9)' : 'rgba(36,68,42,0.82)';
    const tw = Math.max(44, w.text.length * 17);
    roundRect(ctx, -tw / 2, -17, tw, 34, 5);
    ctx.fill();
    ctx.strokeStyle = w.tough
      ? `rgba(180,255,200,${0.9})`
      : `rgba(120,255,150,${0.75 + pulse * 0.2})`;
    ctx.lineWidth = w.tough ? 2.5 : 1.8;
    roundRect(ctx, -tw / 2, -17, tw, 34, 5);
    ctx.stroke();
    if (w.tough && w.hp > 1) {
      ctx.fillStyle = 'rgba(255,240,160,0.9)';
      ctx.font = 'bold 9px serif';
      ctx.textAlign = 'center';
      ctx.fillText('坚', 0, -24);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = flash ? 'rgba(255,255,220,1)' : 'rgba(190,255,200,0.98)';
    ctx.font = 'bold 17px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(w.text, 0, 0);
    ctx.restore();
  }

  // 切开爆点（刀锋金线一闪）
  for (const b of battle.slashBursts || []) {
    const a = Math.max(0, b.life / (b.maxLife || 280));
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang || 0);
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,230,150,0.95)';
    ctx.lineWidth = 3 * a;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(28, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(100,255,140,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(18, 8);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 切开碎片
  for (const s of battle.shards || []) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.beginPath();
    if (s.half < 0) ctx.rect(-48, -18, 48, 36);
    else ctx.rect(0, -18, 48, 36);
    ctx.clip();
    ctx.globalAlpha = Math.max(0, s.life / 550);
    ctx.fillStyle = 'rgba(120,255,150,0.95)';
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, 0, 0);
    // 切面金边
    ctx.strokeStyle = 'rgba(255,220,120,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();
  }

  // 金墨刀锋轨迹
  const stroke = battle.stroke || [];
  if (stroke.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1];
      const b = stroke[i];
      if (!a || !b) continue;
      const age = Math.min(1, (battle.timer - b.t) / 200);
      ctx.strokeStyle = `rgba(255,220,120,${0.98 - age * 0.9})`;
      ctx.shadowColor = 'rgba(255,200,80,0.95)';
      ctx.shadowBlur = 12 * (1 - age);
      ctx.lineWidth = 6 * (1 - age) + 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // 刀尖光点
    const tip = stroke[stroke.length - 1];
    if (tip && battle.slashing) {
      ctx.fillStyle = 'rgba(255,245,200,0.95)';
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 粒子
  for (const p of battle.particles || []) {
    const a = p.life / (p.maxLife || 400);
    ctx.globalAlpha = Math.max(0, a);
    if (p.glyph) {
      ctx.fillStyle = `rgba(${p.color},1)`;
      ctx.font = 'bold 14px serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.glyph, p.x, p.y);
    } else {
      ctx.fillStyle = `rgba(${p.color},1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.size || 3) * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

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
    ctx.fillStyle = 'rgba(30,26,20,0.94)';
    roundRect(ctx, c.cx - 140, c.cy - 140, 280, 280, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,140,0.55)';
    ctx.lineWidth = 2;
    roundRect(ctx, c.cx - 140, c.cy - 140, 280, 280, 8);
    ctx.stroke();
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
    if (c.trail && c.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,220,120,0.95)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.trail[0].x, c.trail[0].y);
      for (let i = 1; i < c.trail.length; i++) ctx.lineTo(c.trail[i].x, c.trail[i].y);
      ctx.stroke();
    }
    ctx.fillStyle = UI.gold;
    ctx.font = font(13, true);
    ctx.fillText(`描摹「${c.glyph}」 ${Math.floor(c.progress * 100)}%`, c.cx, c.cy + 160);
  }

  // HUD 血条
  const barW = 300;
  const bx = (W - barW) / 2;
  const by = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, bx, by, barW, 16, 4);
  ctx.fill();
  ctx.fillStyle = hpRatio > 0.3 ? 'rgba(120,230,140,0.9)' : 'rgba(230,90,90,0.9)';
  roundRect(ctx, bx + 1, by + 1, (barW - 2) * Math.max(0, hpRatio), 14, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,140,0.45)';
  ctx.strokeRect(bx, by, barW, 16);
  ctx.fillStyle = 'rgba(255,230,180,0.95)';
  ctx.font = 'bold 12px serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${battle.enemy.name || '梗鬼'}  ${Math.ceil(battle.enemy.hp)}/${battle.enemy.maxHp}`,
    W / 2,
    by + 9
  );

  // 理性
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 12px serif';
  ctx.fillText('理性', 24, H - 52);
  ctx.fillStyle = '#400';
  ctx.fillRect(60, H - 60, 140, 12);
  const sr = Math.max(0, battle.san / Math.max(1, battle.maxSan));
  ctx.fillStyle = sr > 0.3 ? '#7ad07a' : '#e44';
  ctx.fillRect(60, H - 60, 140 * sr, 12);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(60, H - 60, 140, 12);

  if (battle.combo > 1) {
    ctx.fillStyle = `rgba(255,220,120,${0.75 + pulse * 0.25})`;
    ctx.font = 'bold 24px serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${battle.combo} 连切`, W - 28, 52);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(220,210,180,0.8)';
  ctx.font = '12px serif';
  if (battle.phase === 'intro') {
    ctx.fillStyle = 'rgba(255,230,160,0.98)';
    ctx.font = 'bold 20px serif';
    ctx.fillText('刻 刀 · 划 墨', W / 2, H * 0.42);
    ctx.font = '14px serif';
    ctx.fillText('梗鬼在上方吐字 · 拖动金线切开它们', W / 2, H * 0.42 + 28);
  } else if (battle.phase === 'fight') {
    ctx.fillText(battle.hint || '拖动切开 · K 描字大招', W / 2, H - 24);
    const ammo = (battle.player.collectedChars || []).length;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,220,140,0.75)';
    ctx.fillText(`字弹药 ×${ammo}  ·  K 描字`, W - 24, H - 24);
  }

  if (battle.enemyText && battle.enemyTextTimer > 0) {
    const a = Math.min(1, battle.enemyTextTimer / 400);
    ctx.globalAlpha = a;
    ctx.font = '13px serif';
    const tw = Math.min(400, ctx.measureText(battle.enemyText).width + 28);
    ctx.fillStyle = 'rgba(18,28,20,0.9)';
    roundRect(ctx, W / 2 - tw / 2, 48, tw, 28, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,255,170,0.95)';
    ctx.textAlign = 'center';
    ctx.fillText(battle.enemyText, W / 2, 62);
    ctx.globalAlpha = 1;
  }

  if (battle.phase === 'result') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    const ok = battle.result === 'win' || battle.result === 'purify' || battle.result === 'spare';
    ctx.fillStyle = ok ? 'rgba(255,230,150,0.98)' : 'rgba(255,120,120,0.95)';
    ctx.font = 'bold 34px serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      battle.result === 'purify' ? '净 化' : battle.result === 'lose' ? '失 语' : '胜 利',
      W / 2,
      H / 2
    );
  }

  if (battle.fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${battle.fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
