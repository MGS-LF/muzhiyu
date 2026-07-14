// 渲染模块：battle
import { W, H } from '../config.js';
import { roundRect } from './util.js';
import { CONTROL_HINTS } from '../data/controls.js';

// ============================================================
// 战斗界面（Undertale 风格）
// ============================================================
export const BOX_W = 280;

export const BOX_H = 200;

function drawUtTutorial(ctx, battle) {
  const x = W - 350;
  const y = 276;
  const w = 318;
  const h = 270;
  const phaseHelp = {
    intro: ['等待战斗展开', '先观察敌人、理性值和清醒值。'],
    menu: [
      '选择本回合行动',
      'A / D 或 ← / → 选择，E / 空格确认。',
      '攻击：直接削减生命，击杀增加残忍。',
      '调查：增加清醒，满后可以宽恕。',
      '净化：按节奏接唱，削弱敌人与弹幕。',
      '宽恕：清醒满后结束战斗，增加慈悲。',
    ],
    attack_aim: ['攻击判定', '光标接近中央金色区域时按 E / 空格。'],
    attack_resolve: ['准备躲避', '攻击完成。敌人即将反击，注意弹幕框。'],
    enemyTurn: [
      '躲避敌方弹幕',
      '用 WASD / 方向键移动红心。',
      '碰到文字会损失理性。',
      '本波可按 F 消耗一个当前字清除弹幕。',
    ],
    poem: ['净化接唱', '每句出现金色边框时按 E，连续命中效果更强。'],
    purify_cast: ['净化接唱', '每句出现金色边框时按 E，连续命中效果更强。'],
    ultimate: ['诗词大招', '集齐完整诗句后，K 可释放本场一次的大招。'],
    result: ['教学完成', '正式旅途中可以根据敌人与经历决定消灭或宽恕。'],
  };
  const lines = phaseHelp[battle.phase] || ['观察战场', '根据界面提示继续。'];

  ctx.fillStyle = 'rgba(10,12,16,0.94)';
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,120,0.72)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 6);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,226,150,0.98)';
  ctx.font = 'bold 16px serif';
  ctx.fillText('弹幕菜单战 · 新手指引', x + 18, y + 28);
  ctx.fillStyle = 'rgba(120,220,150,0.95)';
  ctx.font = 'bold 13px serif';
  ctx.fillText(lines[0], x + 18, y + 56);
  ctx.fillStyle = 'rgba(220,215,200,0.9)';
  ctx.font = '12px serif';
  for (let i = 1; i < lines.length; i++) {
    ctx.fillText(lines[i], x + 18, y + 56 + i * 28);
  }

  const clarityReady = battle.clarity >= battle.clarityMax;
  ctx.fillStyle = clarityReady ? 'rgba(255,220,120,0.14)' : 'rgba(255,255,255,0.04)';
  roundRect(ctx, x + 16, y + h - 46, w - 32, 30, 4);
  ctx.fill();
  ctx.fillStyle = clarityReady ? 'rgba(255,230,150,0.98)' : 'rgba(175,175,180,0.78)';
  ctx.font = 'bold 11px serif';
  ctx.fillText(
    clarityReady
      ? '清醒已满：回到菜单选择「宽恕」'
      : `当前清醒 ${battle.clarity}/${battle.clarityMax}：先用「调查」观察回声`,
    x + 28,
    y + h - 26
  );
}

export function drawBattle(ctx, battle, gameTime) {
  // 全黑背景
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // 淡入遮罩
  if (battle.fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${battle.fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // === 顶部：敌人立绘 ===
  const enemyCX = W / 2;
  const enemyCY = 160;
  drawBattleEnemy(ctx, enemyCX, enemyCY, battle.enemy, gameTime);

  // 敌人名字 + HP 条
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.fillText(battle.enemy.name, enemyCX, enemyCY + 70);
  // HP 条
  const eBarW = 120;
  ctx.fillStyle = '#400';
  ctx.fillRect(enemyCX - eBarW / 2, enemyCY + 78, eBarW, 8);
  ctx.fillStyle = '#e44';
  ctx.fillRect(
    enemyCX - eBarW / 2,
    enemyCY + 78,
    eBarW * (battle.enemy.hp / battle.enemy.maxHp),
    8
  );
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(enemyCX - eBarW / 2, enemyCY + 78, eBarW, 8);
  ctx.fillStyle = '#ccc';
  ctx.font = '10px serif';
  ctx.fillText(`${battle.enemy.hp} / ${battle.enemy.maxHp}`, enemyCX, enemyCY + 95);

  // 清醒值（调查累积，满了可宽恕）
  if (battle.clarityMax) {
    const cw = 120,
      cyc = enemyCY + 103;
    ctx.fillStyle = 'rgba(40,40,20,0.8)';
    ctx.fillRect(enemyCX - cw / 2, cyc, cw, 6);
    ctx.fillStyle = 'rgba(255,210,140,0.95)';
    ctx.fillRect(enemyCX - cw / 2, cyc, cw * (battle.clarity / battle.clarityMax), 6);
    ctx.strokeStyle = 'rgba(255,210,140,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(enemyCX - cw / 2, cyc, cw, 6);
    ctx.fillStyle =
      battle.clarity >= battle.clarityMax ? 'rgba(255,225,150,0.95)' : 'rgba(200,190,160,0.7)';
    ctx.font = '9px serif';
    ctx.fillText(
      battle.clarity >= battle.clarityMax
        ? '清醒：可宽恕'
        : `清醒 ${battle.clarity}/${battle.clarityMax}`,
      enemyCX,
      cyc + 14
    );
  }

  // 敌人文字气泡
  if (battle.enemyText && battle.enemyTextTimer > 0) {
    ctx.font = '13px serif';
    const tw = ctx.measureText(battle.enemyText).width + 30;
    ctx.fillStyle = 'rgba(20,20,30,0.9)';
    roundRect(ctx, enemyCX - tw / 2, enemyCY + 124, tw, 26, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,220,100,0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, enemyCX - tw / 2, enemyCY + 124, tw, 26, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,255,140,0.9)';
    ctx.textBaseline = 'middle';
    ctx.fillText(battle.enemyText, enemyCX, enemyCY + 137);
    ctx.textBaseline = 'alphabetic';
  }

  // === 中部：弹幕框 / 攻击条 ===
  const boxCX = W / 2;
  const boxCY = H / 2 + 60;

  ctx.save();
  ctx.translate(boxCX, boxCY);

  // 弹幕框边框
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H);
  ctx.fillStyle = '#000';
  ctx.fillRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H);

  if (battle.phase === 'enemyTurn') {
    // 红心
    const heartBlink =
      battle.heartInvulnerable > 0 && Math.floor(battle.heartInvulnerable / 90) % 2 === 0;
    ctx.fillStyle = heartBlink ? 'rgba(255,120,120,0.45)' : '#e33';
    drawHeart(ctx, battle.heart.x, battle.heart.y, battle.heart.r);
    // 弹幕
    for (const b of battle.bullets) {
      const warning = b.warn > 0;
      // 光晕
      ctx.shadowColor = warning ? 'rgba(255,220,100,0.7)' : 'rgba(80,220,100,0.8)';
      ctx.shadowBlur = warning ? 3 : 6;
      ctx.fillStyle = warning ? 'rgba(255,210,90,0.10)' : 'rgba(80,220,100,0.3)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + (warning ? 7 : 2), 0, Math.PI * 2);
      ctx.fill();
      if (warning) {
        ctx.strokeStyle = 'rgba(255,220,120,0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // 文字
      ctx.fillStyle = warning ? 'rgba(255,230,150,0.65)' : 'rgba(180,255,180,0.95)';
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, b.x, b.y);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
  } else if (battle.phase === 'attack_aim' && battle.attackBar) {
    // 攻击准星条（打怪主手感）
    const barW = BOX_W - 20;
    const barH = 30;
    ctx.fillStyle = '#222';
    ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
    ctx.fillStyle = 'rgba(255,220,120,0.32)';
    ctx.fillRect(-barW * 0.1, -barH / 2, barW * 0.2, barH);
    const ix = -barW / 2 + battle.attackBar.pos * barW;
    ctx.fillStyle = '#ff4';
    ctx.fillRect(ix - 3, -barH / 2, 6, barH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 E / 空格 砍下！', 0, -barH / 2 - 14);
    ctx.textAlign = 'left';
  } else if (battle.phase === 'poem' || battle.phase === 'purify_cast') {
    // 念诗：四句逐行亮起，亮起时按 E 接唱
    const lines = battle.poemLines || ['关关雎鸠', '在河之洲', '窈窕淑女', '君子好逑'];
    const idx = battle.poemIndex | 0;
    const beat = battle.poemBeat || 0;
    const beatLen = battle.poemBeatLen || 720;
    const t = Math.min(1, beat / beatLen);
    const canHit = t >= 0.22 && t <= 0.88;
    ctx.fillStyle = 'rgba(20,16,10,0.55)';
    ctx.fillRect(-BOX_W / 2, -BOX_H / 2, BOX_W, BOX_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      const y = -36 + i * 22;
      if (i < idx) {
        ctx.fillStyle = 'rgba(255,230,150,0.95)';
        ctx.font = 'bold 15px serif';
      } else if (i === idx) {
        const glow = canHit ? 0.55 + Math.sin(beat * 0.02) * 0.35 : 0.25 + t * 0.3;
        ctx.fillStyle = `rgba(255,240,180,${glow})`;
        ctx.font = 'bold 17px serif';
        if (canHit) {
          ctx.strokeStyle = `rgba(255,220,120,${0.5 + glow * 0.3})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(-70, y - 11, 140, 20);
        }
      } else {
        ctx.fillStyle = 'rgba(140,130,110,0.45)';
        ctx.font = '14px serif';
      }
      ctx.fillText(lines[i], 0, y);
    }
    ctx.fillStyle = canHit ? 'rgba(120,230,150,0.95)' : 'rgba(200,190,160,0.7)';
    ctx.font = 'bold 12px serif';
    ctx.fillText(canHit ? '▶ 按 E 接唱！' : '等金光亮起……', 0, 58);
    ctx.fillStyle = 'rgba(180,170,140,0.7)';
    ctx.font = '11px serif';
    ctx.fillText(`接唱 ${battle.poemHits || 0}/4`, 0, 76);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  } else if (battle.phase === 'attack_resolve') {
    // 显示伤害数字
    if (battle.lastDamage) {
      const a = Math.max(0, 1 - battle.timer / 1200);
      ctx.fillStyle = `rgba(255,220,120,${a})`;
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`-${battle.lastDamage}`, 0, -40 - (1 - a) * 20);
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

  // === 底部：菜单 / HP / 提示 ===
  const uiY = H - 130;

  // 玩家 HP（SAN）
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('理性', W / 2 - 200, uiY);
  const pBarW = 140;
  ctx.fillStyle = '#400';
  ctx.fillRect(W / 2 - 160, uiY - 6, pBarW, 12);
  const ratio = Math.max(0, battle.heartHp / battle.heartMaxHp);
  ctx.fillStyle = ratio > 0.3 ? '#7ad07a' : '#e44';
  ctx.fillRect(W / 2 - 160, uiY - 6, pBarW * ratio, 12);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(W / 2 - 160, uiY - 6, pBarW, 12);
  ctx.fillStyle = '#ccc';
  ctx.font = '10px serif';
  ctx.fillText(`${Math.floor(battle.heartHp)} / ${battle.heartMaxHp}`, W / 2 - 155, uiY);
  ctx.textBaseline = 'alphabetic';

  // 菜单（玩家回合时显示）
  if (battle.phase === 'menu') {
    const menuY = H - 70;
    const items = battle.menuItems;
    const itemW = 130;
    const totalW = itemW * items.length + 20 * (items.length - 1);
    const startX = W / 2 - totalW / 2;
    for (let i = 0; i < items.length; i++) {
      const ix = startX + i * (itemW + 20);
      const selected = i === battle.menuIndex;
      // 按钮背景
      ctx.fillStyle = selected ? 'rgba(255,220,120,0.15)' : 'rgba(20,20,30,0.6)';
      roundRect(ctx, ix, menuY, itemW, 36, 5);
      ctx.fill();
      ctx.strokeStyle = selected ? 'rgba(255,220,120,0.9)' : 'rgba(120,120,140,0.5)';
      ctx.lineWidth = selected ? 2 : 1;
      roundRect(ctx, ix, menuY, itemW, 36, 5);
      ctx.stroke();
      // 文字
      ctx.fillStyle = selected ? 'rgba(255,230,140,1)' : 'rgba(200,200,210,0.7)';
      ctx.font = selected ? 'bold 15px serif' : '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(items[i], ix + itemW / 2, menuY + 18);
      // 选中指示
      if (selected) {
        ctx.fillStyle = 'rgba(255,220,120,0.9)';
        ctx.beginPath();
        ctx.moveTo(ix - 12, menuY + 18);
        ctx.lineTo(ix - 6, menuY + 14);
        ctx.lineTo(ix - 6, menuY + 22);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // 提示
    ctx.fillStyle = 'rgba(180,180,190,0.6)';
    ctx.font = '11px serif';
    ctx.textAlign = 'center';
    let hintText = CONTROL_HINTS.battleConfirm;
    if (battle.ultimateReady && !battle.ultimateUsed) {
      hintText += `    ${battle.availableUltimate ? battle.availableUltimate.name : CONTROL_HINTS.battleUltimate}`;
    }
    ctx.fillText(hintText, W / 2, H - 20);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches
    ) {
      ctx.fillStyle = 'rgba(255,230,150,0.72)';
      ctx.font = '10px serif';
      ctx.fillText('触屏：右侧 E/Space/K 按钮对应确认、闪避与诗词大招', W / 2, H - 34);
    }
    ctx.fillStyle = 'rgba(150,150,160,0.5)';
    ctx.font = '10px serif';
    ctx.fillText('调查＝看清它残存的"人"，集满清醒可宽恕（不沾血也能脱战）', W / 2, H - 6);
    // 大招就绪指示（菜单右上角）
    if (battle.ultimateReady && !battle.ultimateUsed) {
      const pulse = 0.5 + Math.sin(gameTime * 0.006) * 0.4;
      ctx.fillStyle = `rgba(255,200,80,${pulse})`;
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'right';
      const name = battle.availableUltimate ? battle.availableUltimate.name : '诗词大招';
      ctx.fillText(`★ ${name} 就绪 (K)`, W - 20, H - 50);
      ctx.textAlign = 'left';
    }
    ctx.textAlign = 'left';
  } else if (battle.phase === 'ultimate') {
    // 诗词大招全屏特效
    const ult = battle._ultimateDef;
    if (ult) {
      const prog = 1 - battle.ultimateAnim / (battle.ultimateDuration || 2000);
      // 全屏金色光幕
      ctx.fillStyle = `${ult.color}`;
      ctx.globalAlpha = 0.15 + Math.sin(gameTime * 0.01) * 0.1;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      // 中央诗句文字
      ctx.fillStyle = `rgba(255,240,180,${0.7 + Math.sin(gameTime * 0.008) * 0.3})`;
      ctx.font = 'bold 24px "SimSun","Songti SC",serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = ult.color;
      ctx.shadowBlur = 20;
      ctx.fillText(ult.text, W / 2, H / 2 - 40);
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,220,140,${0.6})`;
      ctx.font = '14px serif';
      ctx.fillText(`「${ult.desc}」`, W / 2, H / 2 - 10);
      // 伤害数字
      if (battle._ultimateResolved) {
        ctx.fillStyle = `rgba(255,100,80,${0.8 + Math.sin(gameTime * 0.01) * 0.2})`;
        ctx.font = 'bold 36px serif';
        ctx.fillText(`-${ult.damage}`, W / 2, H / 2 + 40);
      }
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
  } else if (battle.phase === 'enemyTurn') {
    ctx.fillStyle = 'rgba(255,100,100,0.85)';
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    const ammo = (battle.player && battle.player.collectedChars
      ? battle.player.collectedChars.length
      : 0);
    const canF = !battle.dodgePurifyUsed && ammo > 0;
    ctx.fillText(
      canF
        ? `${CONTROL_HINTS.battleDodge}  ·  F 清屏（字×${ammo}）`
        : battle.dodgePurifyUsed
          ? `${CONTROL_HINTS.battleDodge}  ·  本波已清屏`
          : CONTROL_HINTS.battleDodge,
      W / 2,
      H - 30
    );
    ctx.textAlign = 'left';
  } else if (battle.phase === 'attack_aim') {
    ctx.fillStyle = 'rgba(255,220,120,0.8)';
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.fillText(CONTROL_HINTS.battleAim, W / 2, H - 30);
    ctx.textAlign = 'left';
  }

  // 结果画面
  if (battle.phase === 'result') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    const a = Math.min(1, battle.timer / 500);
    if (battle.result === 'win') {
      ctx.fillStyle = `rgba(255,220,120,${a})`;
      ctx.font = 'bold 32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('梗鬼消散了', W / 2, H / 2 - 20);
      ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
      ctx.font = '14px serif';
      ctx.fillText('绿色的光点四散，留下一个金色的汉字碎片。', W / 2, H / 2 + 20);
    } else if (battle.result === 'lose') {
      ctx.fillStyle = `rgba(220,60,60,${a})`;
      ctx.font = 'bold 32px serif';
      ctx.fillText('理性崩溃', W / 2, H / 2 - 20);
      ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
      ctx.font = '14px serif';
      ctx.fillText('你的语言被吞噬了……', W / 2, H / 2 + 20);
    } else if (battle.result === 'spare') {
      ctx.fillStyle = `rgba(255,210,150,${a})`;
      ctx.font = 'bold 32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('你宽恕了它', W / 2, H / 2 - 20);
      ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
      ctx.font = '14px serif';
      ctx.fillText('绿光褪成暖色，它想起了自己曾是个会说话的人。', W / 2, H / 2 + 20);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }
  if (battle.isTutorial) drawUtTutorial(ctx, battle);
}

export function drawBattleEnemy(ctx, x, y, enemy, gameTime) {
  const float = Math.sin(gameTime * 0.004) * 5;
  y += float;
  // 外发光
  ctx.shadowColor = 'rgba(80,220,100,0.8)';
  ctx.shadowBlur = 25;
  ctx.fillStyle = 'rgba(80,220,100,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y, 40, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 身体
  ctx.fillStyle = 'rgba(80,220,100,0.4)';
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 25);
  ctx.lineTo(x - 30, y + 30);
  ctx.lineTo(x + 30, y + 30);
  ctx.lineTo(x + 8, y - 25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,255,140,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 头
  ctx.fillStyle = 'rgba(80,220,100,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y - 35, 26, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,255,140,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 大嘴
  ctx.fillStyle = 'rgba(20,40,20,0.9)';
  ctx.beginPath();
  ctx.ellipse(x, y - 30, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // 牙齿
  ctx.fillStyle = 'rgba(220,255,220,0.85)';
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 4 - 1.5, y - 35);
    ctx.lineTo(x + i * 4, y - 25);
    ctx.lineTo(x + i * 4 + 1.5, y - 35);
    ctx.closePath();
    ctx.fill();
  }
  // 文字
  ctx.fillStyle = `rgba(120,255,140,${0.4 + Math.sin(gameTime * 0.005) * 0.2})`;
  ctx.font = '10px serif';
  ctx.textAlign = 'center';
  ctx.fillText('YYDS', x - 40, y - 10);
  ctx.fillText('绝绝子', x + 42, y - 20);
  ctx.textAlign = 'left';
}

export function drawHeart(ctx, x, y, r) {
  // 简单红心
  ctx.fillStyle = '#e33';
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.bezierCurveTo(x - r, y - r * 0.3, x - r, y - r, x, y - r * 0.3);
  ctx.bezierCurveTo(x + r, y - r, x + r, y - r * 0.3, x, y + r);
  ctx.closePath();
  ctx.fill();
}
