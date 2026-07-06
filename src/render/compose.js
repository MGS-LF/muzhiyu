// 渲染模块：compose
import { W, H } from '../config.js';
import { roundRect } from './util.js';

// ============================================================
// 造句界面（复原诗句）
// ============================================================
export function drawCompose(ctx, c, gameTime) {
  // 背景：深色 + 流动绿/蓝噪点
  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.6);
  bg.addColorStop(0, 'rgba(30,40,30,0.5)');
  bg.addColorStop(1, 'rgba(5,6,9,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // 漂浮烂梗噪点
  for (let i = 0; i < 22; i++) {
    const x = ((i * 137 + gameTime * 0.02 * (i % 2 ? 1 : -1)) % (W + 80)) - 40;
    const y = (i * 263) % H;
    ctx.fillStyle = `rgba(90,200,110,${0.05 + 0.05 * Math.abs(Math.sin(gameTime * 0.002 + i))})`;
    ctx.font = '12px serif';
    ctx.fillText(['YYDS', '绝绝子', '6', '栓Q', 'emo'][i % 5], x, y);
  }

  // 标题
  ctx.fillStyle = 'rgba(255,224,150,0.95)';
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.def.title, W / 2, 90);
  ctx.fillStyle = 'rgba(200,190,175,0.75)';
  ctx.font = '13px serif';
  ctx.fillText(c.def.intro, W / 2, 122);

  // 诗句（把已填的字嵌回空格；未填显示 ＿）
  const shakeX = c.shake > 0 ? Math.sin(gameTime * 0.08) * 6 : 0;
  let bc = 0;
  const winGlow = c.status === 'win';
  ctx.font = 'bold 30px serif';
  let ly = H / 2 - 40;
  for (const lineStr of c.def.lines) {
    // 先算整行宽度以居中
    let disp = '';
    const blankFlags = [];
    for (const ch of lineStr) {
      if (ch === '_') {
        const s = c.slots[bc];
        disp += s ? s.char : '＿';
        blankFlags.push({ i: disp.length - 1, filled: !!s });
        bc++;
      } else disp += ch;
    }
    const tw = ctx.measureText(disp).width;
    let x = W / 2 - tw / 2 + shakeX;
    // 逐字绘制，空格位高亮
    let bi = 0;
    for (let k = 0; k < disp.length; k++) {
      const ch = disp[k];
      const isBlank = blankFlags[bi] && blankFlags[bi].i === k;
      const cw = ctx.measureText(ch).width;
      if (isBlank) {
        const filled = blankFlags[bi].filled;
        ctx.fillStyle = filled
          ? winGlow
            ? 'rgba(255,235,150,1)'
            : 'rgba(255,225,140,1)'
          : 'rgba(120,200,130,0.7)';
        if (filled && winGlow) {
          ctx.shadowColor = 'rgba(255,220,140,0.9)';
          ctx.shadowBlur = 14;
        }
        ctx.fillText(ch, x + cw / 2, ly);
        ctx.shadowBlur = 0;
        bi++;
      } else {
        ctx.fillStyle = 'rgba(220,210,190,0.9)';
        ctx.fillText(ch, x + cw / 2, ly);
      }
      x += cw;
    }
    ly += 48;
  }

  // 字盘
  const poolY = H - 150;
  ctx.font = 'bold 13px serif';
  ctx.fillStyle = 'rgba(200,190,175,0.7)';
  ctx.fillText('字　盘', W / 2, poolY - 28);
  const tileW = 46,
    gap = 10;
  const totalW = c.pool.length * (tileW + gap) - gap;
  let tx = W / 2 - totalW / 2;
  for (let i = 0; i < c.pool.length; i++) {
    const used = c.used[i];
    const sel = i === c.sel && c.status === 'input';
    const isDecoy = !c.def.answer.includes(c.pool[i]);
    const ty = poolY - tileW / 2;
    ctx.globalAlpha = used ? 0.25 : 1;
    ctx.fillStyle = sel ? 'rgba(50,38,18,0.95)' : 'rgba(18,16,12,0.9)';
    roundRect(ctx, tx, ty, tileW, tileW, 6);
    ctx.fill();
    ctx.strokeStyle = sel
      ? 'rgba(255,214,124,1)'
      : isDecoy
        ? 'rgba(90,180,110,0.5)'
        : 'rgba(150,130,90,0.6)';
    ctx.lineWidth = sel ? 2.5 : 1.2;
    roundRect(ctx, tx, ty, tileW, tileW, 6);
    ctx.stroke();
    ctx.fillStyle = sel ? 'rgba(255,236,170,1)' : 'rgba(220,210,190,0.92)';
    ctx.font = c.pool[i].length > 1 ? 'bold 13px serif' : 'bold 22px serif';
    ctx.fillText(c.pool[i], tx + tileW / 2, poolY);
    ctx.globalAlpha = 1;
    tx += tileW + gap;
  }

  // 提示 / 结果
  ctx.font = '13px serif';
  if (c.status === 'win') {
    ctx.fillStyle = `rgba(255,224,150,${Math.min(1, c.timer / 400)})`;
    ctx.font = 'bold 26px serif';
    ctx.fillText('诗句复原', W / 2, H - 70);
    ctx.font = '13px serif';
    ctx.fillStyle = 'rgba(220,210,190,0.85)';
    ctx.fillText(c.def.solveText || '', W / 2, H - 42);
  } else if (c.status === 'wrong') {
    ctx.fillStyle = 'rgba(230,90,90,0.95)';
    ctx.font = 'bold 18px serif';
    ctx.fillText('不对……烂梗的噪声更响了（理性 -8）', W / 2, H - 60);
  } else {
    ctx.fillStyle = 'rgba(180,180,190,0.7)';
    ctx.fillText('← → 选字　·　E 填入/确认　·　Backspace 撤销　·　Q 退开', W / 2, H - 40);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
