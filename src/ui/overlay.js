// 统一加载 / 思考覆盖层 + toast 队列辅助
// 提示气泡：「终端刻痕」——等宽等级签 + 拓片正文 + 寿命进度线
import { W, H } from '../config.js';
import { UI, font, fontMono } from './tokens.js';

const TOAST_LIFE = { info: 2500, success: 2800, warn: 3500, danger: 5000 };
const MAX_TOASTS = 3;

/** 等级元数据：标签 / 主色 / 微光 */
const LEVEL_META = {
  info: { tag: 'REC', color: 'rgba(0, 240, 255, 0.95)', glow: 'rgba(0, 240, 255, 0.18)' },
  success: { tag: 'OK', color: 'rgba(0, 240, 255, 0.95)', glow: 'rgba(0, 240, 255, 0.18)' },
  warn: { tag: 'ALERT', color: 'rgba(217, 155, 66, 0.98)', glow: 'rgba(217, 155, 66, 0.16)' },
  danger: { tag: 'CRIT', color: 'rgba(211, 54, 54, 0.98)', glow: 'rgba(211, 54, 54, 0.18)' },
};

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
    requestAnimationFrame(() => {
      if (_liveEl) _liveEl.textContent = text;
    });
  } catch (_) {
    /* ignore */
  }
}

/** 正文最多两行，超长省略 */
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
    // 还有未排完的字则加省略
    const used = lines.slice(0, maxLines - 1).join('').length + last.length;
    if (used < String(text || '').length) lines[maxLines - 1] = last + '…';
    else lines[maxLines - 1] = last;
  }
  return lines.length ? lines : [''];
}

/**
 * 分级 toast：底部居中「终端刻痕」条
 * 结构：┌ tag ┐  正文…          底缘寿命线
 */
export function drawToasts(ctx, hints) {
  if (!hints || !hints.length) return;

  const visible = hints.slice(-MAX_TOASTS);
  const gap = 10;
  const maxBoxW = Math.min(520, W - 48);
  const padL = 12;
  const padR = 14;
  const tagW = 52;
  const lineH = 18;
  // 抬高锚点，避开底部对话框（约 H-170）
  let yBottom = H - 200;

  for (let i = visible.length - 1; i >= 0; i--) {
    const h = visible[i];
    if (h.life <= 0) continue;

    const maxLife = h.maxLife || 2500;
    const fadeIn = Math.min(1, (maxLife - h.life) / 180);
    const fadeOut = Math.min(1, h.life / 360);
    const a = Math.min(fadeIn, fadeOut);
    const lifeRatio = Math.max(0, Math.min(1, h.life / maxLife));
    const meta = LEVEL_META[h.level] || LEVEL_META.info;

    ctx.font = font(13, true);
    const textMaxW = maxBoxW - padL - padR - tagW - 10;
    const lines = wrapToastLines(ctx, h.t, textMaxW, 2);
    const boxH = Math.max(36, 14 + lines.length * lineH + 10);
    const bodyW = Math.max(
      ...lines.map((ln) => ctx.measureText(ln).width),
      40
    );
    const boxW = Math.min(maxBoxW, padL + tagW + 10 + bodyW + padR);
    const bx = 16;
    const by = Math.floor(yBottom - boxH);

    ctx.save();
    ctx.globalAlpha = a;

    // 投影
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(7, 8, 10, 0.97)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.shadowBlur = 0;

    // 外框
    ctx.strokeStyle = 'rgba(94, 99, 107, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

    // 左侧等级色带（极窄，非通用「粗色条」）
    ctx.fillStyle = meta.color;
    ctx.fillRect(bx, by, 2, boxH);

    // 顶缘微光
    ctx.fillStyle = meta.glow;
    ctx.fillRect(bx + 2, by, boxW - 2, 1);

    // 等级签：等宽终端标签
    const tagX = bx + padL;
    const tagY = by + boxH / 2;
    ctx.fillStyle = 'rgba(20, 22, 26, 0.95)';
    ctx.fillRect(tagX, tagY - 10, tagW - 6, 20);
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(tagX + 0.5, tagY - 9.5, tagW - 7, 19);
    ctx.fillStyle = meta.color;
    ctx.font = fontMono(10, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.tag, tagX + (tagW - 6) / 2, tagY + 0.5);

    // 正文
    ctx.fillStyle = UI.ink;
    ctx.font = font(13, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textX = tagX + tagW + 4;
    const textBlockH = lines.length * lineH;
    let ty = by + (boxH - textBlockH) / 2 + lineH / 2;
    for (const ln of lines) {
      ctx.fillText(ln, textX, ty);
      ty += lineH;
    }

    // 底缘寿命进度线（随剩余时间缩短）
    const barPad = 8;
    const barY = by + boxH - 2;
    const barFull = boxW - barPad * 2;
    ctx.fillStyle = 'rgba(94, 99, 107, 0.25)';
    ctx.fillRect(bx + barPad, barY, barFull, 1);
    ctx.fillStyle = meta.color;
    ctx.globalAlpha = a * 0.9;
    ctx.fillRect(bx + barPad, barY, barFull * lifeRatio, 1);

    // 角标像素点
    ctx.globalAlpha = a;
    ctx.fillStyle = meta.color;
    ctx.fillRect(bx + boxW - 3, by + 1, 2, 2);
    ctx.fillRect(bx + 3, by + boxH - 3, 2, 2);

    ctx.restore();
    yBottom = by - gap;
  }
}

/** 中央 spinner 覆盖层：loading / thinking */
export function drawOverlayState(ctx, gameTime, overlay) {
  if (!overlay || !overlay.kind) return;
  const reduced = !!overlay.reducedFx;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2 - 10;
  const r = 20;

  if (!reduced) {
    const rot = (gameTime * 0.004) % (Math.PI * 2);
    ctx.strokeStyle = UI.ok;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, rot, rot + Math.PI * 1.35);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = UI.ok;
    ctx.lineWidth = 1.5;
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
