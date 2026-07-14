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
  ctx.shadowColor = 'rgba(80,220,100,0.8)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = `rgba(50,120,70,${0.22 + pulse * 0.1})`;
  ctx.beginPath();
  ctx.ellipse(0, 8, 44, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  const g = 80 + Math.floor(hpRatio * 90);
  ctx.fillStyle = `rgba(50,${g},70,0.55)`;
  ctx.beginPath();
  ctx.moveTo(-10, -20);
  ctx.lineTo(-34, 40);
  ctx.lineTo(34, 40);
  ctx.lineTo(10, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,255,150,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = `rgba(55,${g + 10},75,0.62)`;
  ctx.beginPath();
  ctx.ellipse(0, -34, 30, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,255,160,0.9)';
  ctx.stroke();
  const mouthH = 9 + mouthOpen * 16;
  ctx.fillStyle = 'rgba(12,28,16,0.96)';
  ctx.beginPath();
  ctx.ellipse(0, -22, 17 + mouthOpen * 5, mouthH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,255,220,0.9)';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4.2 - 1.2, -30);
    ctx.lineTo(i * 4.2, -20 + mouthOpen * 5);
    ctx.lineTo(i * 4.2 + 1.2, -30);
    ctx.closePath();
    ctx.fill();
  }
  // 吐字时嘴外绿雾
  if (mouthOpen > 0.2) {
    ctx.fillStyle = `rgba(100,255,140,${mouthOpen * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(0, -8, 12 + mouthOpen * 10, 8 + mouthOpen * 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = `rgba(160,255,180,${0.55 + pulse * 0.3})`;
  ctx.font = 'bold 12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ 烂梗从嘴里喷出', 0, -78);
  ctx.restore();
}

function drawPlayerCore(ctx, x, y, gameTime, invuln) {
  const pulse = 0.5 + Math.sin(gameTime * 0.006) * 0.3;
  const flash = invuln > 0 && Math.floor(gameTime / 60) % 2 === 0;
  if (flash) return;
  ctx.strokeStyle = `rgba(255,200,120,${0.3 + pulse * 0.25})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(x, y, SLASH_LAYOUT.guardR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(255,220,140,${0.06 + pulse * 0.04})`;
  ctx.beginPath();
  ctx.arc(x, y, SLASH_LAYOUT.guardR - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,220,190,0.95)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x, y - 6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(236,218,185,0.95)';
  ctx.beginPath();
  ctx.arc(x, y - 14, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,190,170,0.9)';
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x - 7, y + 22);
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x + 7, y + 22);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,220,120,${0.55 + pulse * 0.35})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 2);
  ctx.lineTo(x + 20, y - 16);
  ctx.stroke();
}

export function drawSlashBattle(ctx, battle, gameTime) {
  const L = SLASH_LAYOUT;
  const ex = L.enemyX();
  const ey = L.enemyY();
  const px = battle.px ?? W / 2;
  const py = battle.py ?? H * 0.62;
  const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
  const hpRatio = battle.enemy.hp / Math.max(1, battle.enemy.maxHp);
  const mouthOpen = battle.mouthOpen || 0;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a1610');
  bg.addColorStop(0.4, '#0a0c10');
  bg.addColorStop(1, '#14110c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 引导：嘴 → 玩家
  if (battle.phase === 'fight' || battle.phase === 'intro') {
    ctx.strokeStyle = `rgba(100,220,130,${0.1 + mouthOpen * 0.15})`;
    ctx.setLineDash([5, 9]);
    ctx.beginPath();
    ctx.moveTo(ex, ey + 36);
    ctx.lineTo(px, py - 24);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawGengEnemy(ctx, ex, ey, gameTime, mouthOpen, hpRatio);

  for (const s of battle.spitFx || []) {
    const a = Math.max(0, s.life / (s.maxLife || 300));
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(150,255,170,0.95)';
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.text, s.x, s.y + (1 - a) * 24);
    ctx.globalAlpha = 1;
  }

  // 连切金环
  for (const r of battle.rings || []) {
    const a = Math.max(0, r.life / (r.maxLife || 400));
    ctx.strokeStyle = `rgba(255,220,120,${a * 0.7})`;
    ctx.lineWidth = 3 * a;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawPlayerCore(ctx, px, py, gameTime, battle.invuln || 0);

  // 字盾 orbit + fly
  for (const o of battle.orbit || []) {
    if (!o) continue;
    const flying = o.state === 'fly' || o.state === 'return';
    ctx.save();
    ctx.translate(o.x, o.y);
    if (flying) {
      ctx.shadowColor = 'rgba(255,220,100,0.95)';
      ctx.shadowBlur = 14;
    } else {
      ctx.shadowColor = 'rgba(255,215,142,0.75)';
      ctx.shadowBlur = 7;
    }
    ctx.fillStyle = flying ? 'rgba(50,40,18,0.95)' : 'rgba(32,24,18,0.92)';
    roundRect(ctx, -12, -12, 24, 24, 4);
    ctx.fill();
    ctx.strokeStyle = flying ? 'rgba(255,230,150,0.95)' : UI.goldLine;
    ctx.lineWidth = flying ? 2 : 1;
    roundRect(ctx, -12, -12, 24, 24, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = UI.goldBright;
    ctx.font = 'bold 14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.char, 0, 0);
    ctx.restore();
  }
  // 字盾连线（仅 orbit）
  const orbs = (battle.orbit || []).filter((o) => o.state === 'orbit');
  if (orbs.length > 1) {
    ctx.strokeStyle = 'rgba(255,215,140,0.22)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(orbs[0].x, orbs[0].y);
    for (let i = 1; i < orbs.length; i++) ctx.lineTo(orbs[i].x, orbs[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 飞字
  for (const w of battle.words || []) {
    if (!w || !Number.isFinite(w.x)) continue;
    if (w.scaleIn < 1) w.scaleIn = Math.min(1, (w.scaleIn || 0) + 0.08);
    const sc = 0.45 + 0.55 * (w.scaleIn || 1);
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.rot || 0);
    ctx.scale(sc, sc);
    const flash = w.hitFlash > 0;
    ctx.shadowColor = flash ? 'rgba(255,255,180,0.95)' : 'rgba(80,255,120,0.9)';
    ctx.shadowBlur = flash ? 18 : 14;
    ctx.fillStyle = w.tough ? 'rgba(28,55,38,0.92)' : 'rgba(36,68,42,0.85)';
    const tw = Math.max(46, w.text.length * 17);
    roundRect(ctx, -tw / 2, -17, tw, 34, 5);
    ctx.fill();
    ctx.strokeStyle = w.tough ? 'rgba(180,255,200,0.95)' : `rgba(120,255,150,${0.8})`;
    ctx.lineWidth = w.tough ? 2.5 : 1.8;
    roundRect(ctx, -tw / 2, -17, tw, 34, 5);
    ctx.stroke();
    if (w.tough && w.hp > 1) {
      ctx.fillStyle = 'rgba(255,240,160,0.95)';
      ctx.font = 'bold 9px serif';
      ctx.textAlign = 'center';
      ctx.fillText('坚', 0, -24);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = flash ? '#fffff0' : 'rgba(195,255,205,0.98)';
    ctx.font = 'bold 17px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(w.text, 0, 0);
    ctx.restore();
  }

  for (const b of battle.slashBursts || []) {
    const a = Math.max(0, b.life / (b.maxLife || 300));
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang || 0);
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,235,160,0.98)';
    ctx.lineWidth = 4 * a;
    ctx.beginPath();
    ctx.moveTo(-32, 0);
    ctx.lineTo(32, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,255,150,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -10);
    ctx.lineTo(20, 10);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  for (const s of battle.shards || []) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.beginPath();
    if (s.half < 0) ctx.rect(-50, -18, 50, 36);
    else ctx.rect(0, -18, 50, 36);
    ctx.clip();
    ctx.globalAlpha = Math.max(0, s.life / 580);
    ctx.fillStyle = 'rgba(130,255,155,0.95)';
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, 0, 0);
    ctx.strokeStyle = 'rgba(255,220,120,0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();
  }

  const stroke = battle.stroke || [];
  if (stroke.length > 1) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1];
      const b = stroke[i];
      if (!a || !b) continue;
      const age = Math.min(1, (battle.timer - b.t) / 220);
      ctx.strokeStyle = `rgba(255,220,120,${0.98 - age * 0.92})`;
      ctx.shadowColor = 'rgba(255,200,80,0.95)';
      ctx.shadowBlur = 14 * (1 - age);
      ctx.lineWidth = 7 * (1 - age) + 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    const tip = stroke[stroke.length - 1];
    if (tip && battle.slashing) {
      ctx.fillStyle = 'rgba(255,250,220,0.98)';
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

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
    ctx.strokeStyle = `rgba(255,220,140,${0.4 + pulse * 0.2})`;
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

  // HUD
  const barW = 300;
  const bx = (W - barW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, bx, 16, barW, 16, 4);
  ctx.fill();
  ctx.fillStyle = hpRatio > 0.3 ? 'rgba(120,230,140,0.9)' : 'rgba(230,90,90,0.9)';
  roundRect(ctx, bx + 1, 17, (barW - 2) * Math.max(0, hpRatio), 14, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,140,0.45)';
  ctx.strokeRect(bx, 16, barW, 16);
  ctx.fillStyle = 'rgba(255,230,180,0.95)';
  ctx.font = 'bold 12px serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${battle.enemy.name || '梗鬼'}  ${Math.ceil(battle.enemy.hp)}/${battle.enemy.maxHp}`,
    W / 2,
    25
  );

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 12px serif';
  ctx.fillText('理性', 24, H - 56);
  ctx.fillStyle = '#400';
  ctx.fillRect(60, H - 64, 140, 12);
  const sr = Math.max(0, battle.san / Math.max(1, battle.maxSan));
  ctx.fillStyle = sr > 0.3 ? '#7ad07a' : '#e44';
  ctx.fillRect(60, H - 64, 140 * sr, 12);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(60, H - 64, 140, 12);

  if (battle.combo > 1) {
    ctx.fillStyle = `rgba(255,220,120,${0.8 + pulse * 0.2})`;
    ctx.font = 'bold 26px serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${battle.combo} 连切`, W - 28, 52);
    if (battle.combo >= 5) {
      ctx.font = '11px serif';
      ctx.fillStyle = 'rgba(255,240,180,0.85)';
      ctx.fillText('每 5 连切：顿帧清场！', W - 28, 72);
    }
  }

  ctx.textAlign = 'center';
  if (battle.phase === 'intro') {
    ctx.fillStyle = 'rgba(255,230,160,0.98)';
    ctx.font = 'bold 22px serif';
    ctx.fillText('刻 刀 · 字 盾', W / 2, H * 0.4);
    ctx.font = '13px serif';
    ctx.fillText('上：梗鬼吐字  ·  下：你移动、切开、发射', W / 2, H * 0.4 + 30);
  } else if (battle.phase === 'fight') {
    ctx.fillStyle = 'rgba(220,210,180,0.82)';
    ctx.font = '12px serif';
    ctx.fillText(battle.hint || '', W / 2, H - 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,220,140,0.8)';
    const ammo = (battle.player.collectedChars || []).length;
    const shieldN = (battle.orbit || []).filter((o) => o.state === 'orbit').length;
    ctx.fillText(`盾字 ${shieldN}  ·  弹药 ×${ammo}  ·  K 大招`, W - 20, H - 22);
  }

  if (battle.enemyText && battle.enemyTextTimer > 0) {
    const a = Math.min(1, battle.enemyTextTimer / 400);
    ctx.globalAlpha = a;
    ctx.font = '13px serif';
    const tw = Math.min(420, ctx.measureText(battle.enemyText).width + 28);
    ctx.fillStyle = 'rgba(18,28,20,0.9)';
    roundRect(ctx, W / 2 - tw / 2, 46, tw, 28, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,255,170,0.95)';
    ctx.textAlign = 'center';
    ctx.fillText(battle.enemyText, W / 2, 60);
    ctx.globalAlpha = 1;
  }

  if (battle.phase === 'result') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    const ok = battle.result !== 'lose';
    ctx.fillStyle = ok ? 'rgba(255,230,150,0.98)' : 'rgba(255,120,120,0.95)';
    ctx.font = 'bold 34px serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      battle.result === 'purify' ? '净 化' : battle.result === 'lose' ? '失 语' : '胜 利',
      W / 2,
      H / 2 - 10
    );
    if (ok && battle.bestCombo) {
      ctx.font = '14px serif';
      ctx.fillStyle = 'rgba(220,210,180,0.9)';
      ctx.fillText(`最高连切 ${battle.bestCombo}`, W / 2, H / 2 + 28);
    }
  }

  if (battle.fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${battle.fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
