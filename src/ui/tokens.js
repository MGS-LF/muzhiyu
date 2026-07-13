// UI 设计令牌：Canvas 与 DOM 共用语义色 / 字体 / 间距
import { W, H } from '../config.js';
import { roundRect } from '../render/util.js';

export const UI = {
  ink: 'rgba(240, 233, 218, 0.96)',      // 宣纸白，温润古朴，高可读性
  inkSoft: 'rgba(178, 169, 152, 0.8)',   // 烟尘灰，次要文字
  inkFaint: 'rgba(140, 132, 116, 0.55)', // 昏暗提示字
  gold: 'rgba(224, 178, 98, 0.92)',      // 鎏金黄，古风主色调
  goldBright: 'rgba(255, 215, 142, 0.98)',// 璀璨金，高亮提示
  goldSoft: 'rgba(224, 178, 98, 0.08)',   // 极淡金色区域背景
  goldLine: 'rgba(224, 178, 98, 0.28)',   // 辅助装饰金线
  panelBg: 'rgba(15, 14, 12, 0.96)',      // 玄石黑，古籍封面质感
  panelLine: 'rgba(224, 178, 98, 0.35)',  // 面板装饰线框
  panelMask: 'rgba(6, 5, 4, 0.88)',       // 暗角遮罩
  ok: 'rgba(108, 178, 132, 0.95)',       // 翡翠绿，温润典雅的成功色
  warn: 'rgba(217, 163, 61, 0.95)',      // 琥珀黄，警告色
  danger: 'rgba(204, 73, 73, 0.95)',      // 朱砂红，理性流失危机色
  dangerSoft: 'rgba(204, 73, 73, 0.12)',  // 危险柔和底色
  barBg: 'rgba(25, 23, 20, 0.85)',        // 理性槽底槽色
  // toast 分级
  toast: {
    info: { bar: 'rgba(224, 178, 98, 0.9)', bg: 'rgba(15, 14, 12, 0.92)' },
    success: { bar: 'rgba(108, 178, 132, 0.95)', bg: 'rgba(12, 16, 14, 0.94)' },
    warn: { bar: 'rgba(217, 163, 61, 0.95)', bg: 'rgba(18, 15, 10, 0.94)' },
    danger: { bar: 'rgba(204, 73, 73, 0.95)', bg: 'rgba(22, 12, 12, 0.94)' },
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

  ctx.save();
  // 1. 物理玄黑漫反射阴影（非低配置时绘制）
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 16 * uiScale();

  // 2. 绘制面板背景板
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, RADIUS);
  ctx.fill();

  // 清除阴影，以防边框线产生毛刺
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // 3. 绘制外框
  ctx.strokeStyle = line;
  ctx.lineWidth = STROKE;
  roundRect(ctx, x, y, w, h, RADIUS);
  ctx.stroke();

  // 4. 绘制内缩 3.5px 的低透明度鎏金内框，增加双层线框古籍质感（高对比度时不绘制）
  if (!highContrast) {
    ctx.strokeStyle = 'rgba(224, 178, 98, 0.16)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 3.5, y + 3.5, w - 7, h - 7, RADIUS - 2);
    ctx.stroke();
  }

  // 5. 渐变顶部横金线装饰：左右淡出，中间聚焦微光
  const topGrad = ctx.createLinearGradient(x, y, x + w, y);
  topGrad.addColorStop(0, 'rgba(224, 178, 98, 0)');
  topGrad.addColorStop(0.5, highContrast ? 'rgba(255, 235, 160, 0.85)' : 'rgba(224, 178, 98, 0.75)');
  topGrad.addColorStop(1, 'rgba(224, 178, 98, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(x + 1, y + 1, w - 2, 2);

  if (title) {
    ctx.fillStyle = highContrast ? '#fff0a8' : UI.goldBright;
    ctx.font = font(18, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, x + w / 2, y + 32);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

/** 选中行呼吸高亮，优化频率和范围使其更柔和 */
export function selectionPulse(gameTime, reduced = false) {
  if (reduced) return 0.12;
  return 0.08 + (Math.sin(gameTime * 0.004) * 0.5 + 0.5) * 0.08;
}

/** DOM 用 CSS 变量字符串（与 UI 令牌镜像） */
export function cssVarsBlock() {
  return `
    :root {
      --ink: rgba(240, 233, 218, 0.96);
      --ink-soft: rgba(178, 169, 152, 0.8);
      --ink-faint: rgba(140, 132, 116, 0.55);
      --gold: rgba(224, 178, 98, 0.92);
      --gold-bright: rgba(255, 215, 142, 0.98);
      --gold-soft: rgba(224, 178, 98, 0.08);
      --gold-line: rgba(224, 178, 98, 0.28);
      --panel-bg: rgba(15, 14, 12, 0.96);
      --panel-line: rgba(224, 178, 98, 0.35);
      --ok: rgba(108, 178, 132, 0.95);
      --warn: rgba(217, 163, 61, 0.95);
      --danger: rgba(204, 73, 73, 0.95);
      --danger-soft: rgba(204, 73, 73, 0.12);
    }
  `;
}
