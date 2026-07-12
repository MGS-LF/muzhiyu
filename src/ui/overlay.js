// 统一加载 / 思考覆盖层 + toast 队列辅助
import { W, H } from '../config.js';
import { UI, font } from './tokens.js';
import { roundRect } from '../render/util.js';

const TOAST_LIFE = { info: 2500, success: 2800, warn: 3500, danger: 5000 };
const MAX_TOASTS = 3;

export function makeToast(text, level = 'info') {
  const lv = TOAST_LIFE[level] ? level : 'info';
  return {
    t: text,
    level: lv,
    life: TOAST_LIFE[lv],
    maxLife: TOAST_LIFE[lv],
  };
}

export function pushToast(hints, text, level = 'info') {
  if (!Array.isArray(hints)) return;
  hints.push(makeToast(text, level));
  while (hints.length > MAX_TOASTS) hints.shift();
  mirrorAriaLive(text, level);
}

/** DOM aria-live 镜像关键提示，供读屏感知 */
let _liveEl = null;
function mirrorAriaLive(text, level) {
  if (typeof document === 'undefined') return;
  if (level !== 'success' && level !== 'danger' && level !== 'warn') return;
  try {
    if (!_liveEl) {
      _liveEl = document.createElement('div');
      _liveEl.id = 'ui-aria-live';
      _liveEl.setAttribute('aria-live', 'polite');
      _liveEl.setAttribute('role', 'status');
      _liveEl.style.cssText =
        'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
      document.body.appendChild(_liveEl);
    }
    _liveEl.textContent = '';
    // 强制触发读屏更新
    requestAnimationFrame(() => {
      if (_liveEl) _liveEl.textContent = text;
    });
  } catch (_) {
    /* ignore */
  }
}

/** 分级 toast 绘制：最多 3 条，新在下、旧上移，左色条区分 */
export function drawToasts(ctx, hints) {
  if (!hints || !hints.length) return;
  let y = H - 220;
  const visible = hints.slice(-MAX_TOASTS);
  for (let i = visible.length - 1; i >= 0; i--) {
    const h = visible[i];
    if (h.life <= 0) continue;
    const maxLife = h.maxLife || 2500;
    const fadeIn = Math.min(1, (maxLife - h.life) / 200);
    const fadeOut = Math.min(1, h.life / 400);
    const a = Math.min(fadeIn, fadeOut);
    const style = UI.toast[h.level] || UI.toast.info;
    ctx.font = font(12);
    const padX = 16;
    const maxTextW = Math.min(420, W - 80);
    const tw = Math.min(maxTextW, ctx.measureText(h.t).width);
    const boxW = tw + padX * 2 + 8;
    const boxH = 28;
    const bx = W / 2 - boxW / 2;
    const by = y - boxH + 4;

    ctx.fillStyle = style.bg.replace(/[\d.]+\)$/, `${a * 0.92})`);
    roundRect(ctx, bx, by, boxW, boxH, 4);
    ctx.fill();
    ctx.fillStyle = style.bar.replace(/[\d.]+\)$/, `${a})`);
    ctx.fillRect(bx, by + 3, 3, boxH - 6);
    ctx.strokeStyle = `rgba(212,168,90,${a * 0.35})`;
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, boxW, boxH, 4);
    ctx.stroke();

    const icon =
      h.level === 'danger' ? '⚠ ' : h.level === 'success' ? '✓ ' : h.level === 'warn' ? '！' : '';
    ctx.fillStyle = `rgba(255,230,160,${a})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon + h.t, W / 2 + 2, by + boxH / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    y -= boxH + 8;
  }
}

/** 中央 spinner 覆盖层：loading / thinking */
export function drawOverlayState(ctx, gameTime, overlay) {
  if (!overlay || !overlay.kind) return;
  const reduced = !!(overlay.reducedFx);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2 - 10;
  const r = 22;

  if (!reduced) {
    const rot = (gameTime * 0.004) % (Math.PI * 2);
    ctx.strokeStyle = UI.gold;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, rot, rot + Math.PI * 1.35);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(212,168,90,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = UI.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const dots = reduced ? '' : '.'.repeat(1 + (Math.floor(gameTime / 350) % 3));
  const label =
    overlay.text ||
    (overlay.kind === 'loading' ? '展开维度裂隙' : '正在思考');
  ctx.fillStyle = UI.ink;
  ctx.font = font(15);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label + dots, cx, cy + r + 28);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
