// 提示气泡：手账浮签 · 中文印章 + 暖纸软卡
import { W, H } from '../config.js';
import { UI, font, RADIUS } from './tokens.js';
import { roundRect } from '../render/util.js';

const TOAST_LIFE = { info: 2500, success: 2800, warn: 3500, danger: 5000 };
export const SCENE_INTRO_LIFE = 4500;
export const ONBOARDING_HINT_LIFE = 6000;
const MAX_TOASTS = 3;

const LEVEL_META = {
  info: { tag: '记', color: UI.gold, soft: 'rgba(232, 176, 88, 0.18)' },
  success: { tag: '愈', color: UI.ok, soft: 'rgba(110, 200, 150, 0.18)' },
  warn: { tag: '警', color: UI.warn, soft: 'rgba(232, 176, 88, 0.2)' },
  danger: { tag: '危', color: UI.danger, soft: 'rgba(220, 86, 86, 0.18)' },
};

export function makeToast(text, level = 'info', duration) {
  const lv = TOAST_LIFE[level] ? level : 'info';
  const life = typeof duration === 'number' && duration > 0 ? duration : TOAST_LIFE[lv];
  return {
    t: text,
    level: lv,
    life,
    maxLife: life,
  };
}

export function pushToast(hints, text, level = 'info', duration) {
  if (!Array.isArray(hints)) return;
  hints.push(makeToast(text, level, duration));
  while (hints.length > MAX_TOASTS) hints.shift();
  mirrorAriaLive(text, level);
}

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
    requestAnimationFrame(() => {
      if (_liveEl) _liveEl.textContent = text;
    });
  } catch (_) {
    /* ignore */
  }
}

function wrapToastLines(ctx, text, maxW, maxLines = 2) {
  const lines = [];
  let line = '';
  for (const ch of String(text || '')) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxW) {
      last = last.slice(0, -1);
    }
    const used = lines.slice(0, maxLines - 1).join('').length + last.length;
    if (used < String(text || '').length) lines[maxLines - 1] = last + '…';
    else lines[maxLines - 1] = last;
  }
  return lines.length ? lines : [''];
}

/** 左下浮签：圆角软卡 + 中文印 */
export function drawToasts(ctx, hints) {
  if (!hints || !hints.length) return;

  const visible = hints.slice(-MAX_TOASTS);
  const gap = 10;
  const maxBoxW = Math.min(400, W - 40);
  const padL = 10;
  const padR = 14;
  const seal = 28;
  const lineH = 18;
  let yBottom = H - 200;

  for (let i = visible.length - 1; i >= 0; i--) {
    const h = visible[i];
    if (h.life <= 0) continue;

    const maxLife = h.maxLife || 2500;
    const fadeIn = Math.min(1, (maxLife - h.life) / 200);
    const fadeOut = Math.min(1, h.life / 380);
    const a = Math.min(fadeIn, fadeOut);
    const lifeRatio = Math.max(0, Math.min(1, h.life / maxLife));
    const meta = LEVEL_META[h.level] || LEVEL_META.info;

    ctx.font = font(13, true);
    const textMaxW = maxBoxW - padL - padR - seal - 12;
    const lines = wrapToastLines(ctx, h.t, textMaxW, 2);
    const boxH = Math.max(40, 16 + lines.length * lineH + 12);
    const bodyW = Math.max(...lines.map((ln) => ctx.measureText(ln).width), 48);
    const boxW = Math.min(maxBoxW, padL + seal + 10 + bodyW + padR);
    const bx = 16;
    const by = Math.floor(yBottom - boxH);
    const r = Math.min(RADIUS, 8);

    ctx.save();
    ctx.globalAlpha = a;

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = UI.panelBg;
    roundRect(ctx, bx, by, boxW, boxH, r);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = meta.color;
    ctx.globalAlpha = a * 0.55;
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, boxW, boxH, r);
    ctx.stroke();
    ctx.globalAlpha = a;

    const cx = bx + padL + seal / 2;
    const cy = by + boxH / 2;
    ctx.fillStyle = meta.soft;
    ctx.beginPath();
    ctx.arc(cx, cy, seal / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, seal / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = meta.color;
    ctx.font = font(13, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.tag, cx, cy + 0.5);

    ctx.fillStyle = UI.ink;
    ctx.font = font(13, true);
    ctx.textAlign = 'left';
    const textX = bx + padL + seal + 8;
    const textBlockH = lines.length * lineH;
    let ty = by + (boxH - textBlockH) / 2 + lineH / 2;
    for (const ln of lines) {
      ctx.fillText(ln, textX, ty);
      ty += lineH;
    }

    const barPad = 10;
    const barY = by + boxH - 4;
    const barFull = boxW - barPad * 2;
    ctx.fillStyle = 'rgba(80, 70, 55, 0.35)';
    roundRect(ctx, bx + barPad, barY, barFull, 2, 1);
    ctx.fill();
    ctx.fillStyle = meta.color;
    ctx.globalAlpha = a * 0.85;
    if (lifeRatio > 0.02) {
      roundRect(ctx, bx + barPad, barY, barFull * lifeRatio, 2, 1);
      ctx.fill();
    }

    ctx.restore();
    yBottom = by - gap;
  }
}

export function drawOverlayState(ctx, gameTime, overlay) {
  if (!overlay || !overlay.kind) return;
  const reduced = !!overlay.reducedFx;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 6, 5, 0.48)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2 - 10;
  const r = 20;

  if (!reduced) {
    const rot = (gameTime * 0.004) % (Math.PI * 2);
    ctx.strokeStyle = UI.gold;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, rot, rot + Math.PI * 1.35);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232, 176, 88, 0.22)';
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
  const label = overlay.text || (overlay.kind === 'loading' ? '加载中…' : '正在思考');
  ctx.fillStyle = UI.ink;
  ctx.font = font(15, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label + dots, cx, cy + r + 28);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
