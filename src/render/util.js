// 渲染模块：util
import { W, H } from '../config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.smooth = 0.18;
  }
  follow(px, py) {
    this.x += (px - W / 2 - this.x) * this.smooth;
    this.y += (py - H / 2 - this.y) * this.smooth;
  }
  snap(px, py, sceneW, sceneH) {
    this.x = px - W / 2;
    this.y = py - H / 2;
    this.clamp(sceneW, sceneH);
  }
  clamp(sceneW, sceneH) {
    this.x = Math.max(-100, Math.min(this.x, sceneW - W + 100));
    this.y = Math.max(-100, Math.min(this.y, sceneH - H + 100));
  }
  worldToScreen(x, y) {
    return {
      x: Math.round((x - this.x) * 10) / 10,
      y: Math.round((y - this.y) * 10) / 10,
    };
  }
}

// 通用：圆角矩形路径
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// ============================================================
// Sydney自由对话（结局）
// ============================================================
// 文字测量缓存，避免每帧重复进行高消耗的 measureText 运算
const wrapTextCache = new Map();

export function wrapText(ctx, text, maxW) {
  // 结合当前的文字字体、宽度和文本内容作为唯一缓存 Key
  const fontStr = ctx.font || '';
  const key = `${fontStr}_${maxW}_${text}`;
  if (wrapTextCache.has(key)) {
    return wrapTextCache.get(key);
  }

  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    if (ctx.measureText(line + ch).width > maxW) {
      lines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);

  // 缓存上限控制（LRU 释放以防内存无限增大）
  if (wrapTextCache.size > 2000) {
    const firstKey = wrapTextCache.keys().next().value;
    wrapTextCache.delete(firstKey);
  }
  wrapTextCache.set(key, lines);
  return lines;
}
