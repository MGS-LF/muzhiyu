import { W, H } from '../config.js';
import * as cfg from '../config.js';
import { roundRect } from './util.js';
import { UI, font, panelFrame, selectionPulse } from '../ui/tokens.js';

const UTTERANCE = cfg.UTTERANCE || { slotMax: 4 };

/** 诗句/成语补空面板 */
export function drawUtterance(ctx, game, gameTime) {
  const u = game.utteranceState;
  if (!u) return;

  const slots = u.slots || [];
  const pool = u.pool || [];
  const sel = u.sel | 0;
  const speakIdx = pool.length;
  const blanks = u.blanks || [];
  const parts = (u.cloze && u.cloze.parts) || [''];
  const blankSel = u.blankSel | 0;
  const title = u.title || '补全';

  const pw = Math.min(640, W - 36);
  const ph = 236 + (u.message ? 22 : 0);
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

  // —— 诗句/成语正文 + 空格 ——
  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(11);
  ctx.textAlign = 'left';
  ctx.fillText('将正确的字填入□中', px + 22, py + 60);

  // 单行居中排版：文字 + 空格盒
  ctx.font = font(18, true);
  const box = 30;
  const gap = 4;
  let units = [];
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
      ctx.fillStyle = filled ? 'rgba(70,55,25,0.95)' : 'rgba(22,20,16,0.95)';
      roundRect(ctx, x, lineY - box / 2, box, box, 4);
      ctx.fill();
      ctx.strokeStyle = activeBlank ? UI.goldBright : filled ? UI.gold : 'rgba(140,130,110,0.7)';
      ctx.lineWidth = activeBlank ? 2 : 1.5;
      if (!filled) ctx.setLineDash([3, 3]);
      roundRect(ctx, x, lineY - box / 2, box, box, 4);
      ctx.stroke();
      ctx.setLineDash([]);
      if (activeBlank) {
        ctx.fillStyle = `rgba(255,220,140,${0.1 + pulse})`;
        roundRect(ctx, x, lineY - box / 2, box, box, 4);
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

  // —— 候选字 ——
  ctx.fillStyle = UI.inkSoft;
  ctx.font = font(11);
  ctx.textAlign = 'left';
  ctx.fillText('候选字（←→ 选择，E 填入当前空）', px + 22, lineY + 36);

  const chipH = 32;
  const chipGap = 8;
  const chips = [];
  for (let i = 0; i < pool.length; i++) chips.push({ t: pool[i], speak: false, i });
  chips.push({ t: '确认', speak: true, i: speakIdx });

  ctx.font = font(15, true);
  const cWidths = chips.map((c) => Math.max(c.speak ? 60 : 36, ctx.measureText(c.t).width + 18));
  const crowW = cWidths.reduce((a, b) => a + b, 0) + chipGap * Math.max(0, chips.length - 1);
  let cx = px + Math.max(18, (pw - crowW) / 2);
  const cy = lineY + 48;

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
    if (c.speak) {
      ctx.fillStyle = active ? 'rgba(100,78,28,0.98)' : 'rgba(55,45,20,0.95)';
      roundRect(ctx, cx, cy, w, chipH, 5);
      ctx.fill();
      ctx.strokeStyle = active ? UI.goldBright : UI.gold;
      ctx.lineWidth = active ? 2 : 1.2;
      roundRect(ctx, cx, cy, w, chipH, 5);
      ctx.stroke();
      ctx.fillStyle = active ? UI.goldBright : UI.gold;
      ctx.font = font(14, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.t, cx + w / 2, cy + chipH / 2);
    } else {
      ctx.fillStyle = active ? 'rgba(80,62,28,0.98)' : 'rgba(32,28,22,0.95)';
      roundRect(ctx, cx, cy, w, chipH, 5);
      ctx.fill();
      ctx.strokeStyle = active ? UI.goldBright : 'rgba(130,120,100,0.55)';
      ctx.lineWidth = active ? 2 : 1;
      roundRect(ctx, cx, cy, w, chipH, 5);
      ctx.stroke();
      ctx.fillStyle = active ? 'rgba(255,232,150,1)' : UI.ink;
      ctx.font = font(16, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.t, cx + w / 2, cy + chipH / 2);
    }
    cx += w + chipGap;
  }

  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(10);
  ctx.textAlign = 'center';
  ctx.fillText(
    'Tab 切换空位  ·  ←→ 选字  ·  E 填入  ·  Backspace 清除  ·  选「确认」提交  ·  Esc 关闭',
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
