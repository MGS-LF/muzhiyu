// 渲染模块：battle（传说之下式弹幕菜单战）
// 重构：使用 UI tokens，废墟诗意美学
import { W, H } from '../config.js';
import { roundRect } from './util.js';
import { UI, font, panelFrame, RADIUS, SPACE } from '../ui/tokens.js';
import { CONTROL_HINTS } from '../data/controls.js';

export const BOX_W = 300;
export const BOX_H = 210;

// ─── 颜色常量（战斗专用，基于 tokens 派生）───
const C = {
  bg1: '#08080c',
  bg2: '#0e0c08',
  gengGlow: 'rgba(80,210,100,0.75)',
  gengBody: 'rgba(60,180,90,0.42)',
  gengHead: 'rgba(60,180,90,0.48)',
  gengOutline: 'rgba(110,240,140,0.75)',
  gengTeeth: 'rgba(210,245,210,0.85)',
  gengMouth: 'rgba(12,30,16,0.92)',
  gengText: 'rgba(110,240,140,0.45)',
  bulletWarn: 'rgba(255,220,100,0.7)',
  bulletGlow: 'rgba(80,210,100,0.65)',
  bulletTextWarn: 'rgba(255,230,150,0.6)',
  bulletText: 'rgba(170,245,175,0.95)',
  boxBorder: 'rgba(224,178,98,0.55)',
  boxBorderActive: 'rgba(224,178,98,0.8)',
  boxFill: 'rgba(8,8,10,0.95)',
};

// ─── 梗鬼绘制 ───
export function drawBattleEnemy(ctx, x, y, enemy, gameTime) {
  const bob = Math.sin(gameTime * 0.004) * 4;
  y += bob;
  const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
  const hpRatio = Math.max(0, enemy.hp / Math.max(1, enemy.maxHp));

  // 底部投影
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 42, 28, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // 外发光
  ctx.save();
  ctx.shadowColor = C.gengGlow;
  ctx.shadowBlur = 22 + pulse * 8;
  ctx.fillStyle = `rgba(50,160,80,${0.12 + pulse * 0.06})`;
  ctx.beginPath();
  ctx.ellipse(x, y, 38, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 身体（梯形）
  const g = 70 + Math.floor(hpRatio * 80);
  ctx.fillStyle = `rgba(45,${g},60,0.5)`;
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 22);
  ctx.lineTo(x - 28, y + 34);
  ctx.lineTo(x + 28, y + 34);
  ctx.lineTo(x + 9, y - 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.gengOutline;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 头
  ctx.fillStyle = `rgba(50,${g + 10},65,0.55)`;
  ctx.beginPath();
  ctx.ellipse(x, y - 32, 24, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.gengOutline;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 嘴（椭圆黑洞）
  ctx.fillStyle = C.gengMouth;
  ctx.beginPath();
  ctx.ellipse(x, y - 26, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // 牙齿
  ctx.fillStyle = C.gengTeeth;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 3.8 - 1.2, y - 32);
    ctx.lineTo(x + i * 3.8, y - 22);
    ctx.lineTo(x + i * 3.8 + 1.2, y - 32);
    ctx.closePath();
    ctx.fill();
  }

  // 浮动烂梗文字装饰
  ctx.fillStyle = `rgba(100,230,130,${0.3 + pulse * 0.15})`;
  ctx.font = font(9);
  ctx.textAlign = 'center';
  const t1 = Math.sin(gameTime * 0.003) * 8;
  const t2 = Math.cos(gameTime * 0.0025) * 6;
  ctx.fillText('YYDS', x - 38 + t1, y - 8);
  ctx.fillText('绝绝子', x + 40 + t2, y - 18);
  ctx.textAlign = 'left';
}

// ─── 红心 ───
export function drawHeart(ctx, x, y, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(230,60,60,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#e33';
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.bezierCurveTo(x - r, y - r * 0.3, x - r, y - r, x, y - r * 0.3);
  ctx.bezierCurveTo(x + r, y - r, x + r, y - r * 0.3, x, y + r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── 主绘制 ───
export function drawBattle(ctx, battle, gameTime) {
  const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;

  // 渐变背景（不再纯黑）
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, C.bg1);
  bg.addColorStop(0.5, '#0a0a0e');
  bg.addColorStop(1, C.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 淡入
  if (battle.fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${battle.fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 顶部：敌人 ──
  const enemyCX = W / 2;
  const enemyCY = 150;
  drawBattleEnemy(ctx, enemyCX, enemyCY, battle.enemy, gameTime);

  // 敌人名字
  ctx.fillStyle = UI.gold;
  ctx.font = font(14, true);
  ctx.textAlign = 'center';
  ctx.fillText(battle.enemy.name, enemyCX, enemyCY + 68);

  // HP 条（圆角，渐变）
  const eBarW = 160;
  const eBarH = 10;
  const eBarX = enemyCX - eBarW / 2;
  const eBarY = enemyCY + 76;
  ctx.fillStyle = UI.barBg;
  roundRect(ctx, eBarX, eBarY, eBarW, eBarH, 4);
  ctx.fill();
  const hpRatio = Math.max(0, battle.enemy.hp / battle.enemy.maxHp);
  const hpGrad = ctx.createLinearGradient(eBarX, 0, eBarX + eBarW * hpRatio, 0);
  if (hpRatio > 0.3) {
    hpGrad.addColorStop(0, 'rgba(80,200,110,0.95)');
    hpGrad.addColorStop(1, 'rgba(120,230,140,0.9)');
  } else {
    hpGrad.addColorStop(0, 'rgba(200,70,70,0.95)');
    hpGrad.addColorStop(1, 'rgba(230,90,90,0.9)');
  }
  ctx.fillStyle = hpGrad;
  roundRect(ctx, eBarX, eBarY, eBarW * hpRatio, eBarH, 4);
  ctx.fill();
  ctx.strokeStyle = UI.goldLine;
  ctx.lineWidth = 1;
  roundRect(ctx, eBarX, eBarY, eBarW, eBarH, 4);
  ctx.stroke();
  // HP 数字
  ctx.fillStyle = UI.inkSoft;
  ctx.font = font(10);
  ctx.fillText(`${Math.ceil(battle.enemy.hp)} / ${battle.enemy.maxHp}`, enemyCX, eBarY + eBarH + 12);

  // 清醒条
  if (battle.clarityMax) {
    const cBarW = 120;
    const cBarY = eBarY + eBarH + 20;
    ctx.fillStyle = UI.barBg;
    roundRect(ctx, enemyCX - cBarW / 2, cBarY, cBarW, 6, 3);
    ctx.fill();
    const cRatio = Math.min(1, battle.clarity / battle.clarityMax);
    const full = battle.clarity >= battle.clarityMax;
    ctx.fillStyle = full ? UI.goldBright : 'rgba(180,200,150,0.8)';
    roundRect(ctx, enemyCX - cBarW / 2, cBarY, cBarW * cRatio, 6, 3);
    ctx.fill();
    ctx.strokeStyle = UI.goldLine;
    ctx.lineWidth = 0.8;
    roundRect(ctx, enemyCX - cBarW / 2, cBarY, cBarW, 6, 3);
    ctx.stroke();
    ctx.fillStyle = full ? UI.goldBright : UI.inkFaint;
    ctx.font = font(9);
    ctx.fillText(
      full ? '清醒：可宽恕' : `清醒 ${battle.clarity}/${battle.clarityMax}`,
      enemyCX,
      cBarY + 16
    );
  }

  // 敌人文字气泡
  if (battle.enemyText && battle.enemyTextTimer > 0) {
    const a = Math.min(1, battle.enemyTextTimer / 400);
    ctx.globalAlpha = a;
    ctx.font = font(12);
    const tw = Math.min(440, ctx.measureText(battle.enemyText).width + 32);
    ctx.fillStyle = 'rgba(14,20,16,0.92)';
    roundRect(ctx, enemyCX - tw / 2, enemyCY + 120, tw, 28, RADIUS);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,200,110,0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, enemyCX - tw / 2, enemyCY + 120, tw, 28, RADIUS);
    ctx.stroke();
    ctx.fillStyle = 'rgba(140,245,160,0.92)';
    ctx.textBaseline = 'middle';
    ctx.fillText(battle.enemyText, enemyCX, enemyCY + 134);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }

  // ── 中部：弹幕框 ──
  const boxCX = W / 2;
  const boxCY = H / 2 + 55;

  ctx.save();
  ctx.translate(boxCX, boxCY);

  // 弹幕框（双层描边，金色调，圆角）
  const isActive = battle.phase === 'enemyTurn';
  ctx.fillStyle = C.boxFill;
  roundRect(ctx, -BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 8);
  ctx.fill();
  ctx.strokeStyle = isActive ? C.boxBorderActive : C.boxBorder;
  ctx.lineWidth = isActive ? 2.5 : 1.8;
  roundRect(ctx, -BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H, 8);
  ctx.stroke();
  // 内框装饰
  ctx.strokeStyle = 'rgba(224,178,98,0.1)';
  ctx.lineWidth = 0.8;
  roundRect(ctx, -BOX_W / 2 + 3, -BOX_H / 2 + 3, BOX_W - 6, BOX_H - 6, 6);
  ctx.stroke();

  if (battle.phase === 'enemyTurn') {
    // 红心
    const heartBlink =
      battle.heartInvulnerable > 0 && Math.floor(battle.heartInvulnerable / 90) % 2 === 0;
    if (!heartBlink) {
      drawHeart(ctx, battle.heart.x, battle.heart.y, battle.heart.r);
    }
    // 弹幕
    for (const b of battle.bullets) {
      const warning = b.warn > 0;
      ctx.save();
      ctx.shadowColor = warning ? C.bulletWarn : C.bulletGlow;
      ctx.shadowBlur = warning ? 4 : 8;
      // 弹幕体（圆角小方块而非纯圆）
      const bw = Math.max(18, (b.text || '').length * 8 + 8);
      const bh = 16;
      if (warning) {
        ctx.strokeStyle = 'rgba(255,220,120,0.5)';
        ctx.lineWidth = 1;
        roundRect(ctx, b.x - bw / 2, b.y - bh / 2, bw, bh, 3);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(30,60,38,0.8)';
        roundRect(ctx, b.x - bw / 2, b.y - bh / 2, bw, bh, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,230,130,0.55)';
        ctx.lineWidth = 1;
        roundRect(ctx, b.x - bw / 2, b.y - bh / 2, bw, bh, 3);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = warning ? C.bulletTextWarn : C.bulletText;
      ctx.font = font(10, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, b.x, b.y);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.restore();
    }
  } else if (battle.phase === 'attack_aim' && battle.attackBar) {
    // 攻击瞄准条
    const barW = BOX_W - 30;
    const barH = 28;
    ctx.fillStyle = UI.barBg;
    roundRect(ctx, -barW / 2, -barH / 2, barW, barH, 5);
    ctx.fill();
    // 暴击区（金色半透明带）
    ctx.fillStyle = 'rgba(224,178,98,0.18)';
    roundRect(ctx, -barW * 0.1, -barH / 2, barW * 0.2, barH, 3);
    ctx.fill();
    ctx.strokeStyle = UI.goldLine;
    ctx.lineWidth = 1;
    roundRect(ctx, -barW / 2, -barH / 2, barW, barH, 5);
    ctx.stroke();
    // 光标
    const ix = -barW / 2 + battle.attackBar.pos * barW;
    ctx.fillStyle = UI.goldBright;
    roundRect(ctx, ix - 3, -barH / 2 - 2, 6, barH + 4, 2);
    ctx.fill();
    // 提示
    ctx.fillStyle = UI.ink;
    ctx.font = font(12, true);
    ctx.textAlign = 'center';
    ctx.fillText('居中暴击！按 E / 空格 砍下', 0, -barH / 2 - 16);
    ctx.textAlign = 'left';
  } else if (battle.phase === 'poem' || battle.phase === 'purify_cast') {
    // 念诗：四句逐行亮起
    const lines = battle.poemLines || ['关关雎鸠', '在河之洲', '窈窕淑女', '君子好逑'];
    const idx = battle.poemIndex | 0;
    const beat = battle.poemBeat || 0;
    const beatLen = battle.poemBeatLen || 720;
    const t = Math.min(1, beat / beatLen);
    const canHit = t >= 0.22 && t <= 0.88;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      const y = -34 + i * 24;
      if (i < idx) {
        ctx.fillStyle = UI.goldBright;
        ctx.font = font(15, true);
      } else if (i === idx) {
        const glow = canHit ? 0.6 + Math.sin(beat * 0.018) * 0.3 : 0.2 + t * 0.35;
        ctx.fillStyle = `rgba(255,240,180,${glow})`;
        ctx.font = font(17, true);
        if (canHit) {
          ctx.strokeStyle = `rgba(224,178,98,${0.4 + glow * 0.3})`;
          ctx.lineWidth = 1.2;
          roundRect(ctx, -72, y - 12, 144, 24, 4);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = UI.inkFaint;
        ctx.font = font(14);
      }
      ctx.fillText(lines[i], 0, y);
    }
    ctx.fillStyle = canHit ? UI.ok : UI.inkSoft;
    ctx.font = font(12, true);
    ctx.fillText(canHit ? '▶ 按 E 接唱！' : '等金光亮起……', 0, 60);
    ctx.fillStyle = UI.inkFaint;
    ctx.font = font(10);
    ctx.fillText(`接唱 ${battle.poemHits || 0}/4`, 0, 78);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  } else if (battle.phase === 'attack_resolve') {
    if (battle.lastDamage) {
      const a = Math.max(0, 1 - battle.timer / 1200);
      ctx.fillStyle = `rgba(255,220,120,${a})`;
      ctx.font = font(28, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`-${battle.lastDamage}`, 0, -40 - (1 - a) * 18);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
  }

  // 粒子
  for (const p of battle.particles) {
    const a = p.life / p.maxLife;
    ctx.fillStyle = `rgba(${p.color},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // ── 底部 UI ──

  // 底部半透明面板背景
  ctx.fillStyle = 'rgba(10,10,8,0.7)';
  roundRect(ctx, 20, H - 145, W - 40, 135, 8);
  ctx.fill();
  ctx.strokeStyle = UI.goldLine;
  ctx.lineWidth = 1;
  roundRect(ctx, 20, H - 145, W - 40, 135, 8);
  ctx.stroke();

  // 玩家理性条
  const pBarX = 40;
  const pBarY = H - 132;
  const pBarW = 180;
  const pBarH = 12;
  ctx.fillStyle = UI.gold;
  ctx.font = font(12, true);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('顾言', pBarX, pBarY + pBarH / 2);
  const barStartX = pBarX + 48;
  ctx.fillStyle = UI.barBg;
  roundRect(ctx, barStartX, pBarY, pBarW, pBarH, 4);
  ctx.fill();
  const ratio = Math.max(0, battle.heartHp / battle.heartMaxHp);
  const sanGrad = ctx.createLinearGradient(barStartX, 0, barStartX + pBarW * ratio, 0);
  if (ratio > 0.3) {
    sanGrad.addColorStop(0, 'rgba(90,190,120,0.95)');
    sanGrad.addColorStop(1, 'rgba(120,220,140,0.9)');
  } else {
    sanGrad.addColorStop(0, 'rgba(200,60,60,0.95)');
    sanGrad.addColorStop(1, 'rgba(230,80,80,0.9)');
  }
  ctx.fillStyle = sanGrad;
  roundRect(ctx, barStartX, pBarY, pBarW * ratio, pBarH, 4);
  ctx.fill();
  ctx.strokeStyle = UI.goldLine;
  ctx.lineWidth = 0.8;
  roundRect(ctx, barStartX, pBarY, pBarW, pBarH, 4);
  ctx.stroke();
  ctx.fillStyle = UI.ink;
  ctx.font = font(10);
  ctx.fillText(`${Math.floor(battle.heartHp)} / ${battle.heartMaxHp}`, barStartX + pBarW + 8, pBarY + pBarH / 2);
  ctx.textBaseline = 'alphabetic';

  // 菜单
  if (battle.phase === 'menu') {
    _drawMenu(ctx, battle, gameTime);
  } else if (battle.phase === 'ultimate') {
    _drawUltimate(ctx, battle, gameTime);
  } else if (battle.phase === 'enemyTurn') {
    _drawEnemyTurnHint(ctx, battle);
  } else if (battle.phase === 'attack_aim') {
    ctx.fillStyle = UI.goldBright;
    ctx.font = font(12, true);
    ctx.textAlign = 'center';
    ctx.fillText(CONTROL_HINTS.battleAim, W / 2, H - 18);
    ctx.textAlign = 'left';
  }

  // 结果画面
  if (battle.phase === 'result') {
    _drawResult(ctx, battle);
  }
}

// ─── 菜单绘制 ───
function _drawMenu(ctx, battle, gameTime) {
  const menuY = H - 88;
  const items = battle.menuItems;
  const itemW = 120;
  const gap = 14;
  const totalW = itemW * items.length + gap * (items.length - 1);
  const startX = W / 2 - totalW / 2;
  const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;

  for (let i = 0; i < items.length; i++) {
    const ix = startX + i * (itemW + gap);
    const sel = i === battle.menuIndex;

    ctx.fillStyle = sel ? 'rgba(224,178,98,0.12)' : 'rgba(20,18,14,0.7)';
    roundRect(ctx, ix, menuY, itemW, 38, RADIUS);
    ctx.fill();

    ctx.strokeStyle = sel ? UI.gold : 'rgba(224,178,98,0.2)';
    ctx.lineWidth = sel ? 2 : 1;
    roundRect(ctx, ix, menuY, itemW, 38, RADIUS);
    ctx.stroke();

    if (sel) {
      // 内框呼吸
      ctx.strokeStyle = `rgba(255,215,142,${0.12 + pulse * 0.1})`;
      ctx.lineWidth = 0.8;
      roundRect(ctx, ix + 2, menuY + 2, itemW - 4, 34, RADIUS - 1);
      ctx.stroke();
    }

    ctx.fillStyle = sel ? UI.goldBright : UI.inkSoft;
    ctx.font = sel ? font(15, true) : font(14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(items[i], ix + itemW / 2, menuY + 19);

    // 选中箭头
    if (sel) {
      ctx.fillStyle = UI.goldBright;
      ctx.beginPath();
      ctx.moveTo(ix - 10, menuY + 19);
      ctx.lineTo(ix - 4, menuY + 15);
      ctx.lineTo(ix - 4, menuY + 23);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // 底部提示
  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(10);
  ctx.textAlign = 'center';
  let hint = CONTROL_HINTS.battleConfirm;
  if (battle.ultimateReady && !battle.ultimateUsed) {
    hint += `  ·  ${battle.availableUltimate ? battle.availableUltimate.name : CONTROL_HINTS.battleUltimate}`;
  }
  ctx.fillText(hint, W / 2, H - 18);
  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(9);
  ctx.fillText('调查→清醒→宽恕（仁慈脱战）  ·  净化消耗汉字', W / 2, H - 6);

  // 大招指示
  if (battle.ultimateReady && !battle.ultimateUsed) {
    ctx.fillStyle = `rgba(255,200,80,${0.6 + pulse * 0.3})`;
    ctx.font = font(11, true);
    ctx.textAlign = 'right';
    const name = battle.availableUltimate ? battle.availableUltimate.name : '诗词大招';
    ctx.fillText(`★ ${name} (K)`, W - 36, H - 132);
    ctx.textAlign = 'left';
  }

  // 触屏提示
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    ctx.fillStyle = UI.inkFaint;
    ctx.font = font(9);
    ctx.textAlign = 'center';
    ctx.fillText('触屏：E 确认 · Space 闪避 · K 大招', W / 2, H - 42);
    ctx.textAlign = 'left';
  }
}

// ─── 大招特效 ───
function _drawUltimate(ctx, battle, gameTime) {
  const ult = battle._ultimateDef;
  if (!ult) return;
  ctx.fillStyle = ult.color;
  ctx.globalAlpha = 0.12 + Math.sin(gameTime * 0.01) * 0.08;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  // 诗句
  ctx.save();
  ctx.shadowColor = ult.color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = `rgba(255,240,180,${0.75 + Math.sin(gameTime * 0.008) * 0.25})`;
  ctx.font = font(24, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ult.text, W / 2, H / 2 - 40);
  ctx.restore();
  ctx.fillStyle = UI.goldSoft === 'rgba(224, 178, 98, 0.08)' ? UI.gold : `rgba(224,178,98,0.6)`;
  ctx.font = font(13);
  ctx.textAlign = 'center';
  ctx.fillText(`「${ult.desc}」`, W / 2, H / 2 - 8);
  if (battle._ultimateResolved) {
    ctx.fillStyle = `rgba(255,100,80,${0.85 + Math.sin(gameTime * 0.01) * 0.15})`;
    ctx.font = font(36, true);
    ctx.fillText(`-${ult.damage}`, W / 2, H / 2 + 44);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

// ─── 敌人回合提示 ───
function _drawEnemyTurnHint(ctx, battle) {
  const ammo = battle.player?.collectedChars?.length || 0;
  const canF = !battle.dodgePurifyUsed && ammo > 0;
  ctx.fillStyle = UI.ink;
  ctx.font = font(12, true);
  ctx.textAlign = 'center';
  ctx.fillText(
    canF
      ? `${CONTROL_HINTS.battleDodge}  ·  F 清屏（汉字 ×${ammo}）`
      : battle.dodgePurifyUsed
        ? `${CONTROL_HINTS.battleDodge}  ·  本波已清屏`
        : CONTROL_HINTS.battleDodge,
    W / 2,
    H - 18
  );
  ctx.textAlign = 'left';
}

// ─── 结果画面 ───
function _drawResult(ctx, battle) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  const a = Math.min(1, battle.timer / 500);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (battle.result === 'win') {
    ctx.fillStyle = `rgba(255,220,120,${a})`;
    ctx.font = font(32, true);
    ctx.fillText('梗鬼消散了', W / 2, H / 2 - 20);
    ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
    ctx.font = font(13);
    ctx.fillText('绿色的光点四散，留下一个金色的汉字碎片。', W / 2, H / 2 + 20);
  } else if (battle.result === 'lose') {
    ctx.fillStyle = `rgba(220,60,60,${a})`;
    ctx.font = font(32, true);
    ctx.fillText('理性崩溃', W / 2, H / 2 - 20);
    ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
    ctx.font = font(13);
    ctx.fillText('你的语言被吞噬了……', W / 2, H / 2 + 20);
  } else if (battle.result === 'spare') {
    ctx.fillStyle = `rgba(255,210,150,${a})`;
    ctx.font = font(32, true);
    ctx.fillText('你宽恕了它', W / 2, H / 2 - 20);
    ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
    ctx.font = font(13);
    ctx.fillText('绿光褪成暖色，它想起了自己曾是个会说话的人。', W / 2, H / 2 + 20);
  } else if (battle.result === 'purify') {
    ctx.fillStyle = `rgba(255,230,150,${a})`;
    ctx.font = font(32, true);
    ctx.fillText('净 化', W / 2, H / 2 - 20);
    ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
    ctx.font = font(13);
    ctx.fillText('诗句钉进它的身体，烂梗化作了完整的字。', W / 2, H / 2 + 20);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}
