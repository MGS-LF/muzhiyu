// UI 设计令牌：Canvas 与 DOM 共用语义色 / 字体 / 间距
import { W, H } from '../config.js';

export const UI = {
  ink: 'rgba(235, 230, 220, 0.98)', // 拓片骨白，对比度极高且字重显厚
  inkSoft: 'rgba(150, 155, 165, 0.95)', // 废墟水泥灰
  inkFaint: 'rgba(100, 105, 115, 0.85)', // 次要终端说明字
  gold: 'rgba(217, 155, 66, 0.95)', // 琥珀古金
  goldBright: 'rgba(255, 200, 120, 0.98)', // 高亮古金
  goldSoft: 'rgba(217, 155, 66, 0.08)', // 极淡金色区域背景
  goldLine: 'rgba(217, 155, 66, 0.35)', // 辅助修饰金线
  panelBg: 'rgba(7, 8, 10, 0.98)', // 终端炭黑背景
  panelLine: 'rgba(94, 99, 107, 0.45)', // 终端细线框 (1px 直角)
  panelMask: 'rgba(3, 4, 5, 0.92)', // 黑暗环境遮罩
  ok: 'rgba(0, 240, 255, 0.95)', // 荧光青蓝 (AI与纯净色)
  warn: 'rgba(217, 155, 66, 0.95)', // 琥珀古金 (警告)
  danger: 'rgba(211, 54, 54, 0.98)', // 朱砂红 (理性流失/梗污染)
  dangerSoft: 'rgba(211, 54, 54, 0.15)', // 朱砂流砂底色
  barBg: 'rgba(20, 22, 26, 0.9)', // 终端能量底色
  // toast 分级
  toast: {
    info: { bar: 'rgba(0, 240, 255, 0.95)', bg: 'rgba(7, 8, 10, 0.98)' },
    success: { bar: 'rgba(0, 240, 255, 0.95)', bg: 'rgba(7, 8, 10, 0.98)' },
    warn: { bar: 'rgba(217, 155, 66, 0.95)', bg: 'rgba(7, 8, 10, 0.98)' },
    danger: { bar: 'rgba(211, 54, 54, 0.98)', bg: 'rgba(7, 8, 10, 0.98)' },
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

export const RADIUS = 0; // 彻底直角美学
export const STROKE = 1.0; // 像素级细线

/** UI 缩放因子：以短边 760 为基准 */
export function uiScale() {
  return Math.min(W, H) / 760;
}

/** 竖屏判定 */
export function isPortrait() {
  return H > W;
}

export function font(size, bold = true) {
  // 中文全部加粗以提高清晰度，强制加粗
  return `bold ${size}px ${TYPE.font}`;
}

export function fontMono(size, bold = true) {
  return `${bold ? 'bold ' : ''}${size}px ${TYPE.fontMono}`;
}

/** 统一面板外框 + 可选标题 */
export function panelFrame(ctx, x, y, w, h, { title, highContrast = false } = {}) {
  const bg = UI.panelBg;
  const line = UI.panelLine;

  ctx.save();
  // 1. 直角框投影
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12 * uiScale();

  // 2. 绘制面板背景板
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // 3. 绘制外框细线
  ctx.strokeStyle = line;
  ctx.lineWidth = STROKE;
  ctx.strokeRect(x, y, w, h);

  // 4. ASCII角标字符装饰：┌ ┐ └ ┘
  ctx.fillStyle = UI.inkSoft;
  ctx.font = fontMono(11, false);
  ctx.fillText('┌', x + 3, y + 11);
  ctx.fillText('┐', x + w - 10, y + 11);
  ctx.fillText('└', x + 3, y + h - 3);
  ctx.fillText('┘', x + w - 10, y + h - 3);

  // 5. 顶线装饰：由渐变金改为带科技感像素断续的灰/青细线
  ctx.strokeStyle = UI.ok;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 20, y);
  ctx.lineTo(x + w - 20, y);
  ctx.stroke();

  if (title) {
    ctx.fillStyle = UI.ok;
    ctx.font = font(17, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`── [ ${title} ] ──`, x + w / 2, y + 26);
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
      --ink: rgba(235, 230, 220, 0.98);
      --ink-soft: rgba(150, 155, 165, 0.95);
      --ink-faint: rgba(100, 105, 115, 0.85);
      --gold: rgba(217, 155, 66, 0.95);
      --gold-bright: rgba(255, 200, 120, 0.98);
      --gold-soft: rgba(217, 155, 66, 0.08);
      --gold-line: rgba(217, 155, 66, 0.35);
      --panel-bg: rgba(7, 8, 10, 0.98);
      --panel-line: rgba(94, 99, 107, 0.45);
      --ok: rgba(0, 240, 255, 0.95);
      --warn: rgba(217, 155, 66, 0.95);
      --danger: rgba(211, 54, 54, 0.98);
      --danger-soft: rgba(211, 54, 54, 0.15);
    }
  `;
}
