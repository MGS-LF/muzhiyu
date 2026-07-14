// UI 设计令牌：贴纸手账 · 透明废墟便签
import { W, H } from '../config.js';
import { roundRect } from '../render/util.js';

export const UI = {
  ink: 'rgba(255, 248, 235, 0.98)',
  inkSoft: 'rgba(220, 200, 165, 0.88)',
  inkFaint: 'rgba(170, 150, 120, 0.7)',
  gold: 'rgba(232, 176, 88, 0.95)',
  goldBright: 'rgba(255, 214, 130, 0.98)',
  goldSoft: 'rgba(232, 176, 88, 0.14)',
  goldLine: 'rgba(232, 176, 88, 0.42)',
  panelBg: 'rgba(18, 14, 12, 0.72)',
  panelBgSolid: 'rgba(18, 14, 12, 0.94)',
  panelLine: 'rgba(232, 176, 88, 0.4)',
  panelMask: 'rgba(8, 6, 5, 0.82)',
  ok: 'rgba(110, 200, 150, 0.95)',
  warn: 'rgba(232, 176, 88, 0.95)',
  danger: 'rgba(220, 86, 86, 0.96)',
  dangerSoft: 'rgba(220, 86, 86, 0.14)',
  barBg: 'rgba(28, 22, 18, 0.85)',
  spirit: 'rgba(120, 190, 210, 0.85)',
  toast: {
    info: { bar: 'rgba(232, 176, 88, 0.95)', bg: 'rgba(18, 14, 12, 0.78)' },
    success: { bar: 'rgba(110, 200, 150, 0.95)', bg: 'rgba(14, 20, 16, 0.78)' },
    warn: { bar: 'rgba(232, 176, 88, 0.95)', bg: 'rgba(22, 16, 10, 0.8)' },
    danger: { bar: 'rgba(220, 86, 86, 0.96)', bg: 'rgba(24, 12, 12, 0.82)' },
  },
};

export const TYPE = {
  font: "'SimSun','Songti SC','Noto Serif SC',serif",
  fontMono: "monospace, 'Courier New'",
  tTitle: 'bold 21px',
  tHead: 'bold 17px',
  tBody: 'bold 15px',
  tSmall: 'bold 13px',
  tMicro: 'bold 11px',
};

export const SPACE = { x1: 4, x2: 8, x3: 12, x4: 16, x6: 24 };

export const RADIUS = 6;
export const STROKE = 1.5;

export function uiScale() {
  return Math.min(W, H) / 760;
}

export function isPortrait() {
  return H > W;
}

export function font(size, bold = true) {
  return `${bold ? 'bold ' : ''}${size}px ${TYPE.font}`;
}

export function fontMono(size, bold = false) {
  return `${bold ? 'bold ' : ''}${size}px ${TYPE.fontMono}`;
}

/** 便签角勾（四角短 L） */
export function drawCornerHooks(ctx, x, y, w, h, size = 10, color = UI.gold) {
  const s = size;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // TL
  ctx.moveTo(x, y + s);
  ctx.lineTo(x, y);
  ctx.lineTo(x + s, y);
  // TR
  ctx.moveTo(x + w - s, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + s);
  // BL
  ctx.moveTo(x, y + h - s);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + s, y + h);
  // BR
  ctx.moveTo(x + w - s, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - s);
  ctx.stroke();
}

/** 顶缘灯火渐变线 */
export function drawTopGlowLine(ctx, x, y, w, color = 'rgba(255, 210, 120, 0.85)') {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, 'rgba(255, 210, 120, 0)');
  g.addColorStop(0.5, color);
  g.addColorStop(1, 'rgba(255, 210, 120, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x + 8, y + 1, w - 16, 2);
}

/** 统一面板：半透明暖纸 + 金线 + 四角勾 + 顶胶带感 */
export function panelFrame(ctx, x, y, w, h, { title, highContrast = false, solid = false } = {}) {
  const bg = highContrast
    ? 'rgba(0,0,0,0.96)'
    : solid
      ? UI.panelBgSolid
      : UI.panelBg;
  const line = highContrast ? 'rgba(255,220,140,0.95)' : UI.panelLine;
  const r = RADIUS;
  const s = uiScale();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 16 * s;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = line;
  ctx.lineWidth = STROKE;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();

  if (!highContrast) {
    ctx.strokeStyle = 'rgba(232, 176, 88, 0.12)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, Math.max(2, r - 2));
    ctx.stroke();
  }

  drawCornerHooks(
    ctx,
    x + 5,
    y + 5,
    w - 10,
    h - 10,
    9 * s,
    highContrast ? 'rgba(255,220,140,0.9)' : 'rgba(255, 210, 140, 0.75)'
  );

  // 顶「胶带」小条
  if (!highContrast) {
    const tw = Math.min(48, w * 0.12);
    ctx.fillStyle = 'rgba(255, 180, 120, 0.22)';
    ctx.fillRect(x + w / 2 - tw / 2, y - 3, tw, 8);
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + w / 2 - tw / 2, y - 3, tw, 8);
  }

  drawTopGlowLine(ctx, x, y, w, highContrast ? 'rgba(255,230,160,0.9)' : 'rgba(255, 210, 120, 0.8)');

  if (title) {
    ctx.fillStyle = highContrast ? '#fff0a8' : UI.goldBright;
    ctx.font = font(17, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + w / 2, y + 28);
    const mw = Math.min(w * 0.35, ctx.measureText(title).width + 20);
    ctx.strokeStyle = 'rgba(232, 176, 88, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - mw / 2, y + 40);
    ctx.lineTo(x + w / 2 + mw / 2, y + 40);
    ctx.stroke();
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

export function selectionPulse(gameTime, reduced = false) {
  if (reduced) return 0.12;
  return 0.08 + (Math.sin(gameTime * 0.004) * 0.5 + 0.5) * 0.1;
}

export function cssVarsBlock() {
  return `
    :root {
      --ink: rgba(255, 248, 235, 0.98);
      --ink-soft: rgba(220, 200, 165, 0.88);
      --ink-faint: rgba(170, 150, 120, 0.7);
      --gold: rgba(232, 176, 88, 0.95);
      --gold-bright: rgba(255, 214, 130, 0.98);
      --gold-soft: rgba(232, 176, 88, 0.14);
      --gold-line: rgba(232, 176, 88, 0.42);
      --panel-bg: rgba(18, 14, 12, 0.78);
      --panel-line: rgba(232, 176, 88, 0.4);
      --ok: rgba(110, 200, 150, 0.95);
      --warn: rgba(232, 176, 88, 0.95);
      --danger: rgba(220, 86, 86, 0.96);
      --danger-soft: rgba(220, 86, 86, 0.14);
      --spirit: rgba(120, 190, 210, 0.85);
      --radius: 6px;
    }
  `;
}
