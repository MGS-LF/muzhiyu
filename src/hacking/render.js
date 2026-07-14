import { W, H } from '../config.js';
import { HACK, STR } from './theme.js';
import { LAYER_MAX } from './sim.js';

/** 字锋航行体：舱体 + 双翼 + 尾焰（诗句凝成的刃） */
function drawShip(ctx, x, y, size, aim, invBlink, alpha = 1) {
  if (invBlink) return;
  const s = size;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(aim + Math.PI / 2);

  // 尾焰
  ctx.fillStyle = 'rgba(212,168,90,0.55)';
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, s * 0.55);
  ctx.lineTo(0, s * 1.35 + Math.sin(performance.now() / 40) * 2);
  ctx.lineTo(s * 0.22, s * 0.55);
  ctx.closePath();
  ctx.fill();

  // 双翼
  ctx.fillStyle = HACK.gold;
  ctx.strokeStyle = HACK.void;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.15, s * 0.1);
  ctx.lineTo(-s * 1.35, s * 0.55);
  ctx.lineTo(-s * 0.2, s * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.15, s * 0.1);
  ctx.lineTo(s * 1.35, s * 0.55);
  ctx.lineTo(s * 0.2, s * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 主舱
  ctx.fillStyle = HACK.parchment;
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.55);
  ctx.lineTo(s * 0.55, s * 0.15);
  ctx.lineTo(s * 0.28, s * 0.7);
  ctx.lineTo(-s * 0.28, s * 0.7);
  ctx.lineTo(-s * 0.55, s * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = HACK.void;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 座舱窗
  ctx.fillStyle = 'rgba(12,14,18,0.85)';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.35, s * 0.22, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = HACK.gold;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 机首灯
  ctx.fillStyle = HACK.gold;
  ctx.beginPath();
  ctx.arc(0, -s * 1.25, s * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemy(ctx, e, frame) {
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.type === 'boss') {
    // 推荐之核：悬浮屏幕巨神（蓝青霓虹，非绿梗）
    const s = e.s;
    const flash = !!e.flash;
    const pulse = 0.5 + Math.sin(frame * 0.08) * 0.5;
    ctx.rotate(e.rot * 0.12);

    // 外光晕
    const aura = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.95);
    aura.addColorStop(0, flash ? 'rgba(255,160,80,0.35)' : `rgba(80,160,255,${0.28 + pulse * 0.12})`);
    aura.addColorStop(0.55, 'rgba(40,90,200,0.12)');
    aura.addColorStop(1, 'rgba(10,20,40,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // 旋转数据环
    ctx.strokeStyle = `rgba(120,200,255,${0.35 + pulse * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.ellipse(0, 4, s * 0.72, s * 0.28, frame * 0.02, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 肩屏
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * s * 0.55, -s * 0.05);
      ctx.rotate(side * 0.25);
      ctx.fillStyle = flash ? 'rgba(200,100,40,0.9)' : 'rgba(12,22,48,0.95)';
      ctx.strokeStyle = 'rgba(140,200,255,0.75)';
      ctx.lineWidth = 1.5;
      const pw = s * 0.28;
      const ph = s * 0.42;
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
      ctx.fillStyle = `rgba(60,140,255,${0.35 + pulse * 0.25})`;
      ctx.fillRect(-pw / 2 + 3, -ph / 2 + 4, pw - 6, ph - 12);
      ctx.fillStyle = 'rgba(200,230,255,0.9)';
      ctx.font = `bold ${Math.max(9, s * 0.12)}px ${HACK.font}`;
      ctx.textAlign = 'center';
      ctx.fillText(side < 0 ? '荐' : '推', 0, 4);
      ctx.restore();
    }

    // 躯干
    ctx.fillStyle = flash ? 'rgba(180,90,40,0.95)' : 'rgba(10,18,40,0.96)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, -s * 0.35);
    ctx.lineTo(s * 0.22, -s * 0.35);
    ctx.lineTo(s * 0.38, s * 0.45);
    ctx.lineTo(-s * 0.38, s * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,200,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 胸屏阵列
    for (let i = 0; i < 4; i++) {
      const y = -s * 0.18 + i * s * 0.14;
      const w = s * (0.28 + i * 0.03);
      ctx.fillStyle = `rgba(40,110,220,${0.25 + Math.sin(frame * 0.1 + i) * 0.2})`;
      ctx.fillRect(-w / 2, y, w, s * 0.1);
      ctx.strokeStyle = 'rgba(160,210,255,0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-w / 2, y, w, s * 0.1);
    }

    // 头屏
    const fw = s * 0.42;
    const fh = s * 0.48;
    ctx.fillStyle = flash ? 'rgba(220,120,50,0.95)' : 'rgba(14,28,60,0.98)';
    ctx.beginPath();
    // 圆角近似
    ctx.rect(-fw / 2, -s * 0.78, fw, fh);
    ctx.fill();
    ctx.strokeStyle = `rgba(160,220,255,${0.75 + pulse * 0.2})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 竖瞳双眼
    for (const side of [-1, 1]) {
      const ex = side * s * 0.1;
      const ey = -s * 0.58;
      ctx.fillStyle = 'rgba(0,8,24,0.95)';
      ctx.beginPath();
      ctx.ellipse(ex, ey, s * 0.055, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? HACK.orange : `rgba(100,230,255,${0.8 + pulse * 0.2})`;
      ctx.shadowColor = flash ? HACK.orange : 'rgba(80,200,255,0.9)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(ex, ey, s * 0.025, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 口：滚动词
    const words = ['为你推荐', '下一首', '别划走', '热榜'];
    const mw = words[Math.floor(frame / 18) % words.length];
    ctx.fillStyle = 'rgba(20,50,120,0.9)';
    ctx.fillRect(-s * 0.14, -s * 0.42, s * 0.28, s * 0.1);
    ctx.fillStyle = 'rgba(200,230,255,0.95)';
    ctx.font = `bold ${Math.max(8, s * 0.09)}px ${HACK.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(mw, 0, -s * 0.35);

    // 顶冠小屏
    for (let i = -2; i <= 2; i++) {
      const cx = i * s * 0.1;
      const cy = -s * 0.85 - Math.abs(i) * s * 0.02;
      ctx.fillStyle = i === 0 ? `rgba(80,160,255,${0.5 + pulse * 0.3})` : 'rgba(20,40,80,0.9)';
      ctx.fillRect(cx - s * 0.04, cy - s * 0.05, s * 0.08, s * 0.1);
      ctx.strokeStyle = 'rgba(160,210,255,0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - s * 0.04, cy - s * 0.05, s * 0.08, s * 0.1);
    }

    ctx.fillStyle = 'rgba(180,220,255,0.9)';
    ctx.font = `bold ${Math.max(10, s * 0.11)}px ${HACK.font}`;
    ctx.fillText('核', 0, s * 0.38);
  } else {
    ctx.rotate(e.rot);
    const s = e.s;
    ctx.fillStyle = e.flash ? HACK.orange : HACK.void;
    ctx.strokeStyle = e.type === 'elite' ? HACK.orange : HACK.parchment;
    ctx.lineWidth = e.type === 'elite' ? 2.5 : 2;
    if (e.type === 'spinner') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * s * 0.55;
        const py = Math.sin(a) * s * 0.55;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.strokeRect(-s / 2, -s / 2, s, s);
    }
    if (e.type === 'sniper') {
      ctx.strokeStyle = HACK.parchment;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = e.type === 'chaser' || e.type === 'mini' ? 'transparent' : HACK.gold;
    if (e.type === 'chaser' || e.type === 'mini') {
      ctx.strokeStyle = HACK.gold;
      ctx.strokeRect(-s * 0.18, -s * 0.18, s * 0.36, s * 0.36);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCorners(ctx) {
  const s = 20;
  const m = 16;
  ctx.strokeStyle = 'rgba(232,220,200,0.38)';
  ctx.lineWidth = 1;
  // TL
  ctx.beginPath();
  ctx.moveTo(m, m + s);
  ctx.lineTo(m, m);
  ctx.lineTo(m + s, m);
  ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(W - m - s, m);
  ctx.lineTo(W - m, m);
  ctx.lineTo(W - m, m + s);
  ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(m, H - m - s);
  ctx.lineTo(m, H - m);
  ctx.lineTo(m + s, H - m);
  ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(W - m - s, H - m);
  ctx.lineTo(W - m, H - m);
  ctx.lineTo(W - m, H - m - s);
  ctx.stroke();
}

/** 原版风格顶栏：层数 · 协议刻度 · 分数；底栏：SAN菱形 · 闪避条 · 提示 */
function drawHud(ctx, battle, state) {
  const p = state.player;
  const layerMax = state.layerMax || LAYER_MAX;
  const mono = HACK.fontMono || 'monospace';
  const ink = HACK.parchment;
  const inkDim = 'rgba(232,220,200,0.42)';
  const inkSoft = 'rgba(232,220,200,0.55)';
  const accent = HACK.orange;

  ctx.save();
  drawCorners(ctx);

  // —— 顶栏 ——
  const topY = 28;
  const leftPad = 44;
  const rightPad = 44;
  ctx.font = `12px ${mono}`;
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const displayLayerMax = state.finishAfterLayer || layerMax;
  const waveLabel = `W ${String(state.layer).padStart(2, '0')}/${String(displayLayerMax).padStart(2, '0')}`;
  ctx.fillText(waveLabel, leftPad, topY);
  const waveW = ctx.measureText(waveLabel).width;

  const scoreLabel = `SCORE ${String(Math.min(999999, state.score | 0)).padStart(6, '0')}`;
  ctx.textAlign = 'right';
  ctx.fillText(scoreLabel, W - rightPad, topY);
  const scoreW = ctx.measureText(scoreLabel).width;

  // 协议层刻度条（原版 g-ticks）
  const tickLeft = leftPad + waveW + 22;
  const tickRight = W - rightPad - scoreW - 22;
  const tickW = Math.max(80, tickRight - tickLeft);
  const gap = 3;
  const n = layerMax;
  const cell = (tickW - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = tickLeft + i * (cell + gap);
    const isBoss = i === n - 1;
    const finished = state.done === 'win' || i < state.layer - 1;
    const current = !finished && i === state.layer - 1;
    const h = isBoss ? 10 : 4;
    const y = topY - h / 2;
    if (finished) {
      ctx.fillStyle = isBoss ? accent : ink;
    } else if (current) {
      ctx.fillStyle = isBoss ? 'rgba(201,111,59,0.65)' : 'rgba(232,220,200,0.55)';
    } else {
      ctx.fillStyle = 'rgba(232,220,200,0.16)';
    }
    ctx.fillRect(x, y, Math.max(2, cell), h);
  }

  // —— Boss 血条（居中细线，原版 g-boss）——
  if (state.boss) {
    const bw = Math.min(520, W * 0.55);
    const bx = (W - bw) / 2;
    const by = 54;
    const br = Math.max(0, state.boss.hp / Math.max(1, state.boss.maxHp));
    ctx.font = `10px ${mono}`;
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.fillText((battle.uiBossCore || STR.bossCore).toUpperCase(), W / 2, by);
    // track
    ctx.fillStyle = 'rgba(201,111,59,0.2)';
    ctx.fillRect(bx, by + 10, bw, 3);
    // fill + shimmer-ish
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(0.5, state.bossPhase > 1 ? HACK.red : '#e0894e');
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by + 10, bw * br, 3);
  }

  // —— 底栏 ——
  const botY = H - 26;
  // SAN 菱形（按比例显示 3 格）
  const maxSan = Math.max(1, battle.heartMaxHp || 100);
  const san = Math.max(0, battle.heartHp || 0);
  const segs = 3;
  const filled = Math.ceil((san / maxSan) * segs);
  let hpStr = '';
  for (let i = 0; i < segs; i++) hpStr += i < filled ? '◆' : '◇';
  ctx.font = `17px ${mono}`;
  ctx.fillStyle = san / maxSan < 0.34 ? HACK.red : ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(hpStr, leftPad, botY);

  // 闪避 CD 条
  const dashX = leftPad + 78;
  const dashW = 64;
  const dashH = 3;
  const cd = Math.max(0, Math.min(1, 1 - p.dashCd / 48));
  ctx.fillStyle = 'rgba(232,220,200,0.16)';
  ctx.fillRect(dashX, botY - dashH / 2, dashW, dashH);
  ctx.fillStyle = p.dash > 0 ? accent : ink;
  ctx.fillRect(dashX, botY - dashH / 2, dashW * cd, dashH);
  ctx.font = `10px ${mono}`;
  ctx.fillStyle = inkSoft;
  ctx.fillText(STR.dash, dashX + dashW + 10, botY);

  // 污染（小字）
  ctx.fillStyle = inkDim;
  ctx.fillText(`${STR.pollution} ${state.pollution | 0}%`, dashX + dashW + 52, botY);

  // 右侧提示
  ctx.textAlign = 'right';
  ctx.fillStyle = inkDim;
  ctx.font = `10px ${mono}`;
  ctx.fillText('SHIFT ── 闪避  ／  左键 ── 射击  ／  ESC ── 系统', W - rightPad, botY);

  ctx.restore();
}

export function drawHackingBattle(ctx, battle, gameTime = 0) {
  const state = battle.sim;
  if (!state) return;

  ctx.save();
  const sh = state.shake || 0;
  if (sh > 0) {
    ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  }

  ctx.fillStyle = HACK.void;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  ctx.strokeStyle = HACK.grid;
  ctx.lineWidth = 1;
  const g = 64;
  const ox = (state.frame * 0.25) % g;
  ctx.beginPath();
  for (let x = -g + ox; x <= W + g; x += g) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = 0; y <= H; y += g) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();

  for (const r of state.rings) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = Math.min(1, r.life / 28) * 0.75;
    ctx.strokeStyle = HACK.parchment;
    ctx.lineWidth = 2;
    ctx.strokeRect(-r.r, -r.r, r.r * 2, r.r * 2);
    ctx.strokeStyle = HACK.gold;
    ctx.lineWidth = 1;
    ctx.strokeRect(-r.r * 0.8, -r.r * 0.8, r.r * 1.6, r.r * 1.6);
    ctx.restore();
  }

  ctx.font = `13px ${HACK.font}`;
  ctx.textAlign = 'left';
  for (const s of state.spamFloats) {
    ctx.globalAlpha = Math.min(1, s.life / 50) * 0.45;
    ctx.fillStyle = HACK.parchment;
    ctx.fillText(s.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;

  for (const bm of state.beams) {
    const hot = bm.t < 12;
    ctx.strokeStyle = hot ? HACK.red : 'rgba(232,220,200,0.25)';
    ctx.lineWidth = hot ? 2 : 1;
    ctx.setLineDash(hot ? [] : [6, 8]);
    ctx.beginPath();
    ctx.moveTo(bm.sx, bm.sy);
    ctx.lineTo(bm.sx + Math.cos(bm.a) * 2800, bm.sy + Math.sin(bm.a) * 2800);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const e of state.enemies) drawEnemy(ctx, e, state.frame);

  for (const b of state.bullets) {
    if (b.text) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillStyle = b.kind === 'geng' ? HACK.gold : HACK.parchment;
      ctx.font = `bold 12px ${HACK.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text.slice(0, 2), 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = b.kind === 'geng' ? HACK.gold : HACK.parchment;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const s of state.shots) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.atan2(s.vy, s.vx));
    // 亮色激光弹：外晕 + 内芯，避免和网格糊在一起
    ctx.fillStyle = 'rgba(255, 232, 160, 0.35)';
    ctx.fillRect(-14, -5, 28, 10);
    ctx.fillStyle = HACK.gold;
    ctx.fillRect(-12, -2.5, 24, 5);
    ctx.fillStyle = '#fff8e0';
    ctx.fillRect(-8, -1.2, 16, 2.4);
    ctx.restore();
  }

  const p = state.player;
  const blink = p.inv > 0 && ((state.frame / 4) | 0) % 2 === 0;
  const shipSize = Math.max(11, p.r);
  for (const t of state.trails) {
    drawShip(ctx, t.x, t.y, shipSize * 0.85, t.a, false, (t.life / 12) * 0.28);
  }
  if (p.dash > 0) {
    drawShip(ctx, p.x - p.vx * 1.4, p.y - p.vy * 1.4, shipSize, p.aim, false, 0.4);
  }
  drawShip(ctx, p.x, p.y, shipSize, p.aim, blink, 1);

  for (const pt of state.particles) {
    ctx.globalAlpha = Math.min(1, pt.life / 24);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(204,68,68,${(state.flash / 18) * 0.28})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 介绍阶段只画说明面板，不画 HUD / 横幅，避免叠字
  if (battle.phase !== 'intro') {
    drawHud(ctx, battle, state);
    if (state.banner) {
      const a = Math.min(1, state.banner.life / 20);
      ctx.globalAlpha = a;
      ctx.fillStyle = HACK.parchment;
      ctx.font = `bold 36px ${HACK.font}`;
      ctx.textAlign = 'center';
      ctx.fillText(state.banner.text, W / 2, H * 0.42);
      ctx.globalAlpha = 1;
    }
  }

  if (battle.phase === 'intro') {
    ctx.fillStyle = 'rgba(8,9,12,0.78)';
    ctx.fillRect(0, 0, W, H);

    // 面板
    const pw = Math.min(560, W - 80);
    const ph = 360;
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;
    ctx.fillStyle = 'rgba(12,14,18,0.94)';
    ctx.strokeStyle = 'rgba(212,168,90,0.45)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeRect(px, py, pw, ph);

    ctx.fillStyle = HACK.gold;
    ctx.font = `bold 24px ${HACK.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(battle.uiTitle || STR.title, W / 2, py + 42);

    ctx.fillStyle = HACK.inkSoft;
    ctx.font = `14px ${HACK.font}`;
    ctx.fillText(battle.uiSubtitle || STR.subtitle, W / 2, py + 72);

    // 操作说明（分行）
    const lines = Array.isArray(STR.controls) ? STR.controls : [String(STR.controls)];
    ctx.font = `15px ${HACK.fontMono || HACK.font}`;
    ctx.fillStyle = HACK.parchment;
    let yy = py + 118;
    for (const line of lines) {
      ctx.fillText(line, W / 2, yy);
      yy += 26;
    }

    ctx.font = `13px ${HACK.font}`;
    ctx.fillStyle = HACK.orange;
    ctx.fillText(STR.hintOrange, W / 2, yy + 12);
    ctx.fillStyle = HACK.inkSoft;
    ctx.fillText(STR.hintBoss || '', W / 2, yy + 34);

    const pulse = 0.55 + Math.sin(gameTime * 0.006) * 0.35;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = HACK.gold;
    ctx.font = `bold 15px ${HACK.font}`;
    ctx.fillText(STR.startHint, W / 2, py + ph - 36);
    ctx.globalAlpha = 1;
  }

  // 开局缓冲提示
  if (battle.phase === 'play' && state.grace > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.grace / 40);
    ctx.fillStyle = HACK.gold;
    ctx.font = `bold 22px ${HACK.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(STR.ready || '准备——', W / 2, H * 0.45);
    ctx.font = `13px ${HACK.font}`;
    ctx.fillStyle = HACK.parchment;
    ctx.fillText('敌人暂缓射击 · 就位后开始', W / 2, H * 0.45 + 28);
    ctx.restore();
  }

  if (battle.phase === 'result') {
    ctx.fillStyle = `rgba(8,9,12,${Math.min(0.75, battle.timer / 400)})`;
    ctx.fillRect(0, 0, W, H);
    const win = battle.result === 'win';
    ctx.fillStyle = win ? HACK.gold : HACK.red;
    ctx.font = `bold 34px ${HACK.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(win ? STR.winTitle : STR.loseTitle, W / 2, H * 0.42);
    ctx.fillStyle = HACK.parchment;
    ctx.font = `16px ${HACK.font}`;
    ctx.fillText(win ? STR.winSub : STR.loseSub, W / 2, H * 0.5);
  }

  if (battle.fadeAlpha > 0) {
    ctx.fillStyle = `rgba(12,14,18,${battle.fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}
