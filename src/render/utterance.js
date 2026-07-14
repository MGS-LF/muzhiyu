import { W, H } from '../config.js';
import * as cfg from '../config.js';
import { roundRect } from './util.js';
import { UI, font, panelFrame, selectionPulse } from '../ui/tokens.js';

/** 诗句/成语补空面板：点字填空，填对自动完成 */
export function drawUtterance(ctx, game, gameTime) {
  const u = game.utteranceState;
  if (!u) return;

  const slots = u.slots || [];
  const pool = u.pool || [];
  const sel = u.sel | 0;
  const blanks = u.blanks || [];
  const parts = (u.cloze && u.cloze.parts) || [''];
  const blankSel = u.blankSel | 0;
  const title = u.title || '补全';

  const pw = Math.min(640, W - 36);
  const ph = 220 + (u.message ? 22 : 0);
  const px = (W - pw) / 2;
  const py = H - ph - 18;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  panelFrame(ctx, px, py, pw, ph, { title: null });

  ctx.fillStyle = UI.goldBright;
  ctx.font = font(16, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('补全 · ' + title, px + pw / 2, py + 20);

  const targetName =
    u.target && (u.target.label || u.target.pollutedLabel)
      ? u.target.label || u.target.pollutedLabel
      : '';
  ctx.fillStyle = UI.inkSoft;
  ctx.font = font(11);
  ctx.fillText(targetName ? '对象：' + targetName : '未锁定对象', px + pw / 2, py + 40);

  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(11);
  ctx.textAlign = 'left';
  ctx.fillText('点击候选字填入□，全部填对自动完成', px + 22, py + 60);

  ctx.font = font(18, true);
  const box = 30;
  const gap = 4;
  const units = [];
  for (let i = 0; i < blanks.length; i++) {
    if (parts[i]) units.push({ type: 'text', t: parts[i] });
    units.push({ type: 'blank', i });
  }
  if (parts[blanks.length]) units.push({ type: 'text', t: parts[blanks.length] });
  if (!blanks.length && parts[0]) units.push({ type: 'text', t: parts[0] });

  const widths = units.map((u0) => {
    if (u0.type === 'blank') return box;
    return ctx.measureText(u0.t).width;
  });
  const rowW = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, units.length - 1);
  let x = px + (pw - rowW) / 2;
  const lineY = py + 88;
  const pulse = selectionPulse(gameTime);
  const blankHits = [];

  for (let ui = 0; ui < units.length; ui++) {
    const u0 = units[ui];
    const w = widths[ui];
    if (u0.type === 'text') {
      ctx.fillStyle = UI.ink;
      ctx.font = font(18, true);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(u0.t, x, lineY);
    } else {
      const filled = slots[u0.i];
      const activeBlank = blankSel === u0.i;
      const bx = x;
      const by = lineY - box / 2;
      blankHits.push({ x: bx, y: by, w: box, h: box, i: u0.i });
      ctx.fillStyle = filled ? 'rgba(70,55,25,0.95)' : 'rgba(22,20,16,0.95)';
      roundRect(ctx, bx, by, box, box, 4);
      ctx.fill();
      ctx.strokeStyle = activeBlank ? UI.goldBright : filled ? UI.gold : 'rgba(140,130,110,0.7)';
      ctx.lineWidth = activeBlank ? 2 : 1.5;
      if (!filled) ctx.setLineDash([3, 3]);
      roundRect(ctx, bx, by, box, box, 4);
      ctx.stroke();
      ctx.setLineDash([]);
      if (activeBlank) {
        ctx.fillStyle = `rgba(255,220,140,${0.1 + pulse})`;
        roundRect(ctx, bx, by, box, box, 4);
        ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (filled) {
        ctx.fillStyle = 'rgba(255,232,150,1)';
        ctx.font = font(17, true);
        ctx.fillText(filled, x + box / 2, lineY);
      } else {
        ctx.fillStyle = 'rgba(120,110,95,0.55)';
        ctx.font = font(14, true);
        ctx.fillText('□', x + box / 2, lineY);
      }
    }
    x += w + gap;
  }
  u._blankHits = blankHits;

  ctx.fillStyle = UI.inkSoft;
  ctx.font = font(11);
  ctx.textAlign = 'left';
  ctx.fillText('候选字（点击或 ←→ 选择后 E 填入）', px + 22, lineY + 36);

  const chipH = 36;
  const chipGap = 10;
  const chips = [];
  for (let i = 0; i < pool.length; i++) chips.push({ t: pool[i], i });

  ctx.font = font(16, true);
  const cWidths = chips.map((c) => Math.max(40, ctx.measureText(c.t).width + 22));
  const crowW = cWidths.reduce((a, b) => a + b, 0) + chipGap * Math.max(0, chips.length - 1);
  let cx = px + Math.max(18, (pw - crowW) / 2);
  const cy = lineY + 48;
  const chipHits = [];

  if (!pool.length) {
    ctx.fillStyle = UI.warn;
    ctx.font = font(12, true);
    ctx.textAlign = 'center';
    ctx.fillText('没有候选字——先去捡地上的汉字碎片', px + pw / 2, cy + chipH / 2);
  }

  for (let i = 0; i < chips.length; i++) {
    const c = chips[i];
    const w = cWidths[i];
    const active = sel === c.i;
    chipHits.push({ x: cx, y: cy, w, h: chipH, i: c.i });
    ctx.fillStyle = active ? 'rgba(80,62,28,0.98)' : 'rgba(32,28,22,0.95)';
    roundRect(ctx, cx, cy, w, chipH, 5);
    ctx.fill();
    ctx.strokeStyle = active ? UI.goldBright : 'rgba(130,120,100,0.55)';
    ctx.lineWidth = active ? 2 : 1;
    roundRect(ctx, cx, cy, w, chipH, 5);
    ctx.stroke();
    if (active) {
      ctx.fillStyle = `rgba(255,220,140,${0.08 + pulse * 0.5})`;
      roundRect(ctx, cx, cy, w, chipH, 5);
      ctx.fill();
    }
    ctx.fillStyle = active ? 'rgba(255,232,150,1)' : UI.ink;
    ctx.font = font(16, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.t, cx + w / 2, cy + chipH / 2);
    cx += w + chipGap;
  }
  u._chipHits = chipHits;

  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(10);
  ctx.textAlign = 'center';
  ctx.fillText(
    '鼠标点字  ·  Tab 切换空位  ·  ←→ 选字  ·  E 填入  ·  Backspace 清除  ·  Esc 关闭',
    px + pw / 2,
    py + ph - 16 - (u.message ? 16 : 0)
  );

  if (u.message) {
    ctx.fillStyle = UI.warn;
    ctx.font = font(12, true);
    ctx.fillText(u.message, px + pw / 2, py + ph - 14);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
