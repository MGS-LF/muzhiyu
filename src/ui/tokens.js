// UI 设计令牌：Canvas 与 DOM 共用语义色 / 字体 / 间距
import { W, H } from '../config.js';
import { roundRect } from '../render/util.js';

export const UI = {
  ink: 'rgba(232,220,200,0.95)',
  inkSoft: 'rgba(232,220,200,0.62)',
  inkFaint: 'rgba(180,170,150,0.5)',
  gold: 'rgba(212,168,90,0.92)',
  goldBright: 'rgba(255,222,142,0.95)',
  goldSoft: 'rgba(212,168,90,0.14)',
  goldLine: 'rgba(212,168,90,0.42)',
  panelBg: 'rgba(12,11,9,0.95)',
  panelLine: 'rgba(212,168,90,0.42)',
  panelMask: 'rgba(0,0,0,0.78)',
  ok: 'rgba(120,200,140,0.9)',
  warn: 'rgba(224,184,80,0.95)',
  danger: 'rgba(224,64,64,0.95)',
  dangerSoft: 'rgba(224,64,64,0.12)',
  barBg: 'rgba(20,15,10,0.8)',
  // toast 分级
  toast: {
    info: { bar: 'rgba(212,168,90,0.9)', bg: 'rgba(12,11,9,0.88)' },
    success: { bar: 'rgba(120,200,140,0.95)', bg: 'rgba(10,16,12,0.9)' },
    warn: { bar: 'rgba(224,184,80,0.95)', bg: 'rgba(18,14,8,0.9)' },
    danger: { bar: 'rgba(224,64,64,0.95)', bg: 'rgba(20,8,8,0.92)' },
  },
};

export const TYPE = {
  font: "'SimSun','Songti SC','Noto Serif SC',serif",
  fontMono: 'monospace',
  tTitle: 'bold 20px',
  tHead: 'bold 16px',
  tBody: '14px',
  tSmall: '12px',
  tMicro: '11px',
};

export const SPACE = { x1: 4, x2: 8, x3: 12, x4: 16, x6: 24 };

export const RADIUS = 6;
export const STROKE = 1.5;

/** UI 缩放因子：以短边 760 为基准 */
export function uiScale() {
  return Math.min(W, H) / 760;
}

/** 竖屏判定 */
export function isPortrait() {
  return H > W;
}

export function font(size, bold = false) {
  return `${bold ? 'bold ' : ''}${size}px ${TYPE.font}`;
}

export function fontMono(size, bold = false) {
  return `${bold ? 'bold ' : ''}${size}px ${TYPE.fontMono}`;
}

/** 统一面板外框 + 可选标题 */
export function panelFrame(ctx, x, y, w, h, { title, highContrast = false } = {}) {
  const bg = highContrast ? 'rgba(0,0,0,0.98)' : UI.panelBg;
  const line = highContrast ? 'rgba(255,235,160,0.95)' : UI.panelLine;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, RADIUS);
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = STROKE;
  roundRect(ctx, x, y, w, h, RADIUS);
  ctx.stroke();
  // 顶部金线
  ctx.fillStyle = highContrast ? 'rgba(255,235,160,0.7)' : 'rgba(212,168,90,0.5)';
  ctx.fillRect(x + 1, y + 1, w - 2, 2);
  if (title) {
    ctx.fillStyle = highContrast ? '#fff0a8' : UI.goldBright;
    ctx.font = font(18, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, x + w / 2, y + 32);
    ctx.textAlign = 'left';
  }
}

/** 选中行呼吸高亮 */
export function selectionPulse(gameTime, reduced = false) {
  if (reduced) return 0.14;
  return 0.1 + (Math.sin(gameTime * 0.005) * 0.5 + 0.5) * 0.1;
}

/** DOM 用 CSS 变量字符串（与 UI 令牌镜像） */
export function cssVarsBlock() {
  return `
    :root {
      --ink: rgba(232,220,200,0.95);
      --ink-soft: rgba(232,220,200,0.62);
      --ink-faint: rgba(180,170,150,0.5);
      --gold: rgba(212,168,90,0.92);
      --gold-bright: rgba(255,222,142,0.95);
      --gold-soft: rgba(212,168,90,0.14);
      --gold-line: rgba(212,168,90,0.42);
      --panel-bg: rgba(12,11,9,0.95);
      --panel-line: rgba(212,168,90,0.42);
      --ok: rgba(120,200,140,0.9);
      --warn: rgba(224,184,80,0.95);
      --danger: rgba(224,64,64,0.95);
      --danger-soft: rgba(224,64,64,0.12);
    }
  `;
}
