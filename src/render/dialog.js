// 渲染模块：dialog
import { W, H } from '../config.js';
import { roundRect } from './util.js';

// ============================================================
export function drawDialog(ctx, d, gameTime, game) {
  const line = d.lines[d.idx];
  const curT = line.t;
  d.charTimer += 16;
  if (!d.done && curT !== undefined && d.charTimer > 25) {
    d.charTimer = 0;
    d.charIdx++;
    if (d.charIdx >= curT.length) {
      d.charIdx = curT.length;
      d.done = true;
    }
  }
  const text = (line.t !== undefined) ? line.t.substring(0, d.charIdx) : '';

  const boxX = 80, boxY = H - 170, boxW = W - 160, boxH = 130;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(boxX + 4, boxY + 4, boxW, boxH);
  ctx.fillStyle = 'rgba(15,12,8,0.95)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = 'rgba(180,140,80,0.5)';
  ctx.fillRect(boxX, boxY, boxW, 3);
  ctx.strokeStyle = 'rgba(180,140,80,0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = 'rgba(40,30,20,0.6)';
  ctx.fillRect(boxX + 16, boxY + 16, 60, 60);
  ctx.strokeStyle = 'rgba(180,140,80,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 16, boxY + 16, 60, 60);
  const cx = boxX + 46, cy = boxY + 46;
  ctx.fillStyle = 'rgba(180,140,80,0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 12, cy, 24, 20);

  ctx.fillStyle = 'rgba(255,210,120,0.95)';
  ctx.font = 'bold 16px serif';
  ctx.textBaseline = 'top';
  ctx.fillText(d.name || line.s, boxX + 90, boxY + 18);

  ctx.strokeStyle = 'rgba(180,140,80,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boxX + 90, boxY + 40);
  ctx.lineTo(boxX + boxW - 20, boxY + 40);
  ctx.stroke();

  ctx.fillStyle = 'rgba(232,220,200,0.95)';
  ctx.font = '15px serif';
  let y = boxY + 60;
  const maxW = boxW - 110;
  let line_text = '';
  for (const c of text) {
    if (c === '\n') {
      ctx.fillText(line_text, boxX + 90, y);
      line_text = '';
      y += 22;
      continue;
    }
    const test = line_text + c;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line_text, boxX + 90, y);
      line_text = c;
      y += 22;
    } else {
      line_text = test;
    }
  }
  ctx.fillText(line_text, boxX + 90, y);

  if (d.choosing && line.choice) {
    drawChoices(ctx, d, boxX, boxY, boxW, gameTime);
  } else if (d.done) {
    const a = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
    ctx.fillStyle = `rgba(255,210,120,${a})`;
    ctx.font = '11px serif';
    ctx.textAlign = 'right';
    const hint = line.choice ? '▼ E 做出选择' : '▼ E / 空格 继续';
    ctx.fillText(hint, boxX + boxW - 20, boxY + boxH - 14);
    ctx.textAlign = 'left';
  }
}

// 选项菜单（浮在对话框上方）
export function drawChoices(ctx, d, boxX, boxY, boxW, gameTime) {
  const opts = d.lines[d.idx].choice;
  const ow = 460, oh = 30, gap = 6;
  const totalH = opts.length * (oh + gap);
  const ox = boxX + boxW - ow - 16;
  const oy = boxY - totalH - 8;
  ctx.textBaseline = 'middle';
  for (let i = 0; i < opts.length; i++) {
    const sel = i === d.choiceIndex;
    const ry = oy + i * (oh + gap);
    ctx.fillStyle = sel ? 'rgba(45,33,16,0.96)' : 'rgba(15,12,8,0.9)';
    roundRect(ctx, ox, ry, ow, oh, 5);
    ctx.fill();
    ctx.strokeStyle = sel ? 'rgba(255,212,124,0.95)' : 'rgba(120,100,70,0.6)';
    ctx.lineWidth = sel ? 2 : 1;
    roundRect(ctx, ox, ry, ow, oh, 5);
    ctx.stroke();
    if (sel) {
      ctx.fillStyle = 'rgba(255,212,124,0.95)';
      ctx.beginPath();
      ctx.moveTo(ox + 11, ry + oh / 2);
      ctx.lineTo(ox + 17, ry + oh / 2 - 4);
      ctx.lineTo(ox + 17, ry + oh / 2 + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = sel ? 'rgba(255,236,172,1)' : 'rgba(200,190,175,0.8)';
    ctx.font = sel ? 'bold 14px serif' : '14px serif';
    ctx.textAlign = 'left';
    ctx.fillText(opts[i].label, ox + 28, ry + oh / 2);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = `rgba(255,212,124,${0.5 + Math.sin(gameTime * 0.005) * 0.3})`;
  ctx.font = '11px serif';
  ctx.textAlign = 'right';
  ctx.fillText('↑ ↓ 选择 · E 确认', boxX + boxW - 16, oy - 8);
  ctx.textAlign = 'left';
}

// ============================================================
// 浮动提示
// ============================================================
export function drawHints(ctx, hints) {
  let y = H - 220;
  for (let i = hints.length - 1; i >= 0; i--) {
    const h = hints[i];
    h.life -= 16;
    if (h.life <= 0) { hints.splice(i, 1); continue; }
    const a = Math.min(1, h.life / 500);
    ctx.font = '12px serif';
    const w = ctx.measureText(h.t).width + 20;
    ctx.fillStyle = `rgba(0,0,0,${a * 0.6})`;
    ctx.fillRect(W/2 - w/2, y - 12, w, 20);
    ctx.strokeStyle = `rgba(255,210,120,${a * 0.6})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(W/2 - w/2, y - 12, w, 20);
    ctx.fillStyle = `rgba(255,230,160,${a})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(h.t, W/2, y - 2);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    y -= 26;
  }
}

// ============================================================
// 教程覆盖层
// ============================================================
export function drawTutorial(ctx, gameTime, tutorial) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  // 面板尺寸：加宽加高，适配 9 个快捷键 + 充足留白
  const pw = 560, ph = 460;
  const px = (W - pw) / 2, py = (H - ph) / 2;

  // 面板背景 + 双层边框
  ctx.fillStyle = 'rgba(15,12,8,0.97)';
  roundRect(ctx, px, py, pw, ph, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,80,0.7)';
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pw, ph, 10);
  ctx.stroke();
  // 顶部金色装饰条
  ctx.fillStyle = 'rgba(180,140,80,0.6)';
  ctx.fillRect(px + 2, py, pw - 4, 3);

  // === 标题区 ===
  ctx.fillStyle = 'rgba(255,210,120,0.95)';
  ctx.font = 'bold 26px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(tutorial.title || '墓 之 语', px + pw / 2, py + 28);

  ctx.fillStyle = 'rgba(200,200,180,0.65)';
  ctx.font = '12px serif';
  ctx.fillText('公元 2147 · 上海废墟', px + pw / 2, py + 64);

  // 分隔线
  ctx.strokeStyle = 'rgba(180,140,80,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 60, py + 92);
  ctx.lineTo(px + pw - 60, py + 92);
  ctx.stroke();

  // === 快捷键列表（双列布局，避免拥挤）===
  const keys = tutorial.keys || [
    { k: 'WASD', d: '移动' },
    { k: 'Shift', d: '奔跑' },
  ];
  const colW = (pw - 80) / 2; // 两列各占一半宽度（减去左右边距）
  const rowH = 30;            // 行高加大
  const startY = py + 110;
  const keyBoxW = 80, keyBoxH = 24;

  for (let i = 0; i < keys.length; i++) {
    const col = i % 2;          // 0=左列, 1=右列
    const row = Math.floor(i / 2);
    const kx = px + 40 + col * colW;
    const ky = startY + row * rowH;

    // 按键标签框
    ctx.fillStyle = 'rgba(60,50,40,0.9)';
    roundRect(ctx, kx, ky - 12, keyBoxW, keyBoxH, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,140,80,0.6)';
    ctx.lineWidth = 1;
    roundRect(ctx, kx, ky - 12, keyBoxW, keyBoxH, 3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,120,0.95)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(keys[i].k, kx + keyBoxW / 2, ky);

    // 描述文字
    ctx.fillStyle = 'rgba(232,220,200,0.9)';
    ctx.font = '13px serif';
    ctx.textAlign = 'left';
    ctx.fillText(keys[i].d, kx + keyBoxW + 12, ky);
  }

  // === 底部提示区 ===
  const tipY = startY + Math.ceil(keys.length / 2) * rowH + 20;
  ctx.strokeStyle = 'rgba(180,140,80,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 60, tipY);
  ctx.lineTo(px + pw - 60, tipY);
  ctx.stroke();

  ctx.fillStyle = 'rgba(180,180,160,0.75)';
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tip = tutorial.tip || '提示：靠近发光的物体按 E 交互。';
  // 长提示自动换行
  _wrapText(ctx, tip, px + pw / 2, tipY + 14, pw - 80, 18);

  // 开始提示（闪烁）
  const blink = 0.5 + Math.sin(gameTime * 0.004) * 0.4;
  ctx.fillStyle = `rgba(255,210,120,${blink})`;
  ctx.font = 'bold 15px serif';
  ctx.textBaseline = 'top';
  ctx.fillText('▼ 按 E 或 空格 开始', px + pw / 2, py + ph - 32);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// 简单的文本自动换行（供 drawTutorial 使用）
function _wrapText(ctx, text, cx, startY, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  let y = startY;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, y);
      line = ch;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, y);
}
