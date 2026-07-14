import { roundRect, wrapText } from './util.js';
import { W, H } from '../config.js';
import {
  UI,
  SPACE,
  font,
  RADIUS,
  STROKE,
  drawCornerHooks,
  drawTopGlowLine,
  panelFrame,
} from '../ui/tokens.js';
import { drawToasts, drawOverlayState } from '../ui/overlay.js';

// 渲染模块：dialog · 贴纸手账信纸

export function drawDialog(ctx, d, gameTime, game) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const line = d.lines[d.idx];
  const text = line.t !== undefined ? line.t.substring(0, d.charIdx) : '';

  const boxX = 72,
    boxY = H - 168,
    boxW = W - 144,
    boxH = 136;
  const highContrast = !!(game && game.settings && game.settings.highContrast);
  const reduced = !!(game && game.settings && game.settings.reducedFx);
  const r = RADIUS;

  // 半透明信纸底
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = highContrast ? 'rgba(0,0,0,0.96)' : 'rgba(18, 14, 12, 0.78)';
  roundRect(ctx, boxX, boxY, boxW, boxH, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.strokeStyle = highContrast ? 'rgba(255,220,140,0.95)' : UI.panelLine;
  ctx.lineWidth = STROKE;
  roundRect(ctx, boxX, boxY, boxW, boxH, r);
  ctx.stroke();

  // 顶缘灯火
  drawTopGlowLine(ctx, boxX, boxY, boxW);

  // 轻扫描（非减动效）
  if (!reduced && !highContrast) {
    const scanT = ((gameTime * 0.04) % (boxW + 80)) - 40;
    const sg = ctx.createLinearGradient(boxX + scanT, boxY, boxX + scanT + 60, boxY);
    sg.addColorStop(0, 'rgba(255,230,170,0)');
    sg.addColorStop(0.5, 'rgba(255,230,170,0.06)');
    sg.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4);
  }

  // 左侧墨金竖条
  const railPulse = reduced ? 0.85 : 0.55 + (Math.sin(gameTime * 0.004) * 0.5 + 0.5) * 0.45;
  const railG = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  railG.addColorStop(0, 'rgba(255,200,100,0)');
  railG.addColorStop(0.2, `rgba(255,200,100,${railPulse})`);
  railG.addColorStop(0.8, `rgba(255,180,80,${railPulse * 0.9})`);
  railG.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = railG;
  ctx.fillRect(boxX + 1, boxY + 8, 3, boxH - 16);

  // 头像 + 四角勾（不转圈）
  const ax = boxX + 16,
    ay = boxY + 18,
    as = 56;
  ctx.fillStyle = highContrast ? 'rgba(0,0,0,0.9)' : 'rgba(40, 32, 24, 0.85)';
  roundRect(ctx, ax, ay, as, as, 4);
  ctx.fill();
  ctx.strokeStyle = UI.goldLine;
  ctx.lineWidth = 1.5;
  roundRect(ctx, ax, ay, as, as, 4);
  ctx.stroke();
  drawCornerHooks(ctx, ax - 3, ay - 3, as + 6, as + 6, 10, `rgba(255, 210, 140, ${0.5 + railPulse * 0.4})`);

  const cx = ax + as / 2,
    cy = ay + as / 2;
  ctx.fillStyle = 'rgba(232, 176, 88, 0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 12, cy, 24, 20);

  // 朱砂小印
  ctx.fillStyle = 'rgba(180, 50, 45, 0.75)';
  ctx.fillRect(ax + as - 14, ay + as - 14, 16, 16);
  ctx.strokeStyle = 'rgba(255, 120, 100, 0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax + as - 14, ay + as - 14, 16, 16);
  ctx.fillStyle = 'rgba(255, 230, 220, 0.95)';
  ctx.font = font(9, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('言', ax + as - 6, ay + as - 6);

  const speakerName = line.s || d.name || '';
  const textLeft = boxX + 88;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = highContrast ? '#fff0a8' : UI.goldBright;
  ctx.font = font(15, true);
  ctx.fillText(speakerName, textLeft, boxY + 18);

  // 名下短金线
  ctx.strokeStyle = 'rgba(255, 210, 140, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(textLeft, boxY + 40);
  ctx.lineTo(boxX + boxW - 20, boxY + 40);
  ctx.stroke();
  const nameLineW = 40 + (reduced ? 0 : Math.sin(gameTime * 0.003) * 16);
  ctx.strokeStyle = `rgba(255, 210, 120, ${0.7 + railPulse * 0.25})`;
  ctx.beginPath();
  ctx.moveTo(textLeft, boxY + 40);
  ctx.lineTo(textLeft + nameLineW, boxY + 40);
  ctx.stroke();

  ctx.fillStyle = highContrast ? '#ffffff' : UI.ink;
  ctx.font = font(15, true);
  let y = boxY + 56;
  const maxW = boxW - 110;
  const lineH = SPACE.x4 + 6;
  let line_text = '';
  for (const c of text) {
    if (c === '\n') {
      ctx.fillText(line_text, textLeft, y);
      line_text = '';
      y += lineH;
      continue;
    }
    const test = line_text + c;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line_text, textLeft, y);
      line_text = c;
      y += lineH;
    } else {
      line_text = test;
    }
  }
  ctx.fillText(line_text, textLeft, y);
  // 打字光标
  if (!d.done && !d.choosing && !reduced) {
    const caretOn = Math.floor(gameTime / 350) % 2 === 0;
    if (caretOn) {
      const cw = ctx.measureText(line_text).width;
      ctx.fillStyle = UI.goldBright;
      ctx.fillRect(textLeft + cw + 2, y + 2, 2, 14);
    }
  }

  if (d.choosing && line.choice) {
    drawChoices(ctx, d, boxX, boxY, boxW, gameTime);
  } else if (d.done) {
    const a = 0.55 + Math.sin(gameTime * 0.005) * 0.35;
    ctx.fillStyle = `rgba(232, 176, 88, ${a})`;
    ctx.font = font(11, true);
    ctx.textAlign = 'right';
    ctx.fillText(line.choice ? 'E 做出选择' : 'E / 空格 继续', boxX + boxW - 18, boxY + boxH - 14);
  }
  ctx.restore();
}

export function drawChoices(ctx, d, boxX, boxY, boxW, gameTime) {
  const opts = d.lines[d.idx].choice;
  const ow = 460,
    oh = 32,
    gap = 6;
  const totalH = opts.length * (oh + gap);
  const ox = boxX + boxW - ow - 16;
  const oy = boxY - totalH - 8;
  ctx.textBaseline = 'middle';
  for (let i = 0; i < opts.length; i++) {
    const sel = i === d.choiceIndex;
    const ry = oy + i * (oh + gap);
    const breath = sel ? 0.08 + (Math.sin(gameTime * 0.005) * 0.5 + 0.5) * 0.08 : 0;

    if (sel) {
      const optGrad = ctx.createLinearGradient(ox, ry, ox + ow, ry);
      optGrad.addColorStop(0, `rgba(232, 176, 88, ${0.2 + breath * 2})`);
      optGrad.addColorStop(0.35, `rgba(232, 176, 88, ${0.08 + breath})`);
      optGrad.addColorStop(1, 'rgba(232, 176, 88, 0)');
      ctx.fillStyle = optGrad;
    } else {
      ctx.fillStyle = 'rgba(18, 14, 12, 0.88)';
    }
    roundRect(ctx, ox, ry, ow, oh, 5);
    ctx.fill();
    ctx.strokeStyle = sel ? UI.goldBright : 'rgba(232, 176, 88, 0.28)';
    ctx.lineWidth = sel ? 1.5 : 1;
    roundRect(ctx, ox, ry, ow, oh, 5);
    ctx.stroke();

    if (sel) {
      ctx.fillStyle = UI.goldBright;
      ctx.beginPath();
      ctx.arc(ox + 14, ry + oh / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = sel ? UI.goldBright : UI.inkSoft;
    ctx.font = font(14, true);
    ctx.textAlign = 'left';
    ctx.fillText(opts[i].label, ox + 28, ry + oh / 2);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = `rgba(232, 176, 88, ${0.5 + Math.sin(gameTime * 0.005) * 0.3})`;
  ctx.font = font(12, true);
  ctx.textAlign = 'right';
  ctx.fillText('↑ ↓ 选择 · E 确认', boxX + boxW - 16, oy - 8);
  ctx.textAlign = 'left';
}

// ============================================================
// 浮动提示（分级 toast 队列）
// ============================================================
export function drawHints(ctx, hints) {
  drawToasts(ctx, hints);
}

// ============================================================
// 教程覆盖层
// ============================================================
export function drawTutorial(ctx, gameTime, tutorial) {
  ctx.fillStyle = 'rgba(8,6,5,0.65)';
  ctx.fillRect(0, 0, W, H);

  const pw = 560,
    ph = 460;
  const px = (W - pw) / 2,
    py = (H - ph) / 2;

  panelFrame(ctx, px, py, pw, ph, { title: null, solid: true });

  ctx.fillStyle = UI.goldBright;
  ctx.font = font(24, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(tutorial.title || '墓 之 语', px + pw / 2, py + 28);

  ctx.fillStyle = UI.inkSoft;
  ctx.font = font(12, true);
  ctx.fillText('公元 2147 · 上海废墟', px + pw / 2, py + 64);

  ctx.strokeStyle = 'rgba(232, 176, 88, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 60, py + 92);
  ctx.lineTo(px + pw - 60, py + 92);
  ctx.stroke();

  const keys = tutorial.keys || [
    { k: 'WASD', d: '移动' },
    { k: 'Shift', d: '奔跑' },
  ];
  const colGap = 34;
  const colW = (pw - 80 - colGap) / 2;
  const rowH = 42;
  const startY = py + 110;
  const keyBoxW = 74,
    keyBoxH = 24;
  const descW = colW - keyBoxW - 14;

  for (let i = 0; i < keys.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const kx = px + 40 + col * (colW + colGap);
    const ky = startY + row * rowH;

    ctx.fillStyle = 'rgba(40, 32, 24, 0.9)';
    roundRect(ctx, kx, ky - 12, keyBoxW, keyBoxH, 4);
    ctx.fill();
    ctx.strokeStyle = UI.goldLine;
    ctx.lineWidth = 1;
    roundRect(ctx, kx, ky - 12, keyBoxW, keyBoxH, 4);
    ctx.stroke();
    ctx.fillStyle = UI.goldBright;
    ctx.font = font(11, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(keys[i].k, kx + keyBoxW / 2, ky);

    ctx.fillStyle = UI.ink;
    ctx.font = font(12, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const descLines = _measureWrapLines(ctx, keys[i].d, descW, 2);
    const descStartY = ky - ((descLines.length - 1) * 15) / 2;
    for (let j = 0; j < descLines.length; j++) {
      ctx.fillText(descLines[j], kx + keyBoxW + 12, descStartY + j * 15);
    }
  }

  const tipY = startY + Math.ceil(keys.length / 2) * rowH + 20;
  ctx.strokeStyle = 'rgba(232, 176, 88, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 60, tipY);
  ctx.lineTo(px + pw - 60, tipY);
  ctx.stroke();

  ctx.fillStyle = UI.inkSoft;
  ctx.font = font(12, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tip = tutorial.tip || '提示：靠近发光的物体按 E 交互。';
  _wrapText(ctx, tip, px + pw / 2, tipY + 14, pw - 80, 18);

  const blink = 0.5 + Math.sin(gameTime * 0.004) * 0.4;
  ctx.fillStyle = `rgba(232, 176, 88, ${blink})`;
  ctx.font = font(15, true);
  ctx.textBaseline = 'top';
  ctx.fillText('▼ 按 E 或 空格 开始', px + pw / 2, py + ph + 8);
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

function _measureWrapLines(ctx, text, maxWidth, maxLines = Infinity) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.length ? lines : [''];
}

// ===== from converse.js =====
// 渲染模块：converse

// ============================================================
// 等待 LLM 的提示（覆盖在大地图上）
// ============================================================
export function drawThinking(ctx, gameTime, text, game) {
  drawOverlayState(ctx, gameTime, {
    kind: 'thinking',
    text: text || '聆听这个世界',
    reducedFx: !!(game && game.settings && game.settings.reducedFx),
  });
}

export function drawConverse(ctx, c, gameTime) {
  // 背景：深渊蓝黑 + 缓动光晕
  ctx.fillStyle = '#05060d';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.36, 40, W / 2, H * 0.36, 460);
  g.addColorStop(0, 'rgba(70,110,190,0.22)');
  g.addColorStop(1, 'rgba(5,6,13,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 漂浮微尘
  for (let i = 0; i < 40; i++) {
    const x = (i * 137.5 + gameTime * 0.012 * (1 + (i % 3))) % W;
    const y = (i * 89.3 + gameTime * 0.006 * (1 + (i % 2))) % H;
    ctx.fillStyle = `rgba(150,185,255,${0.05 + (i % 5) * 0.02})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Sydney投影（淡蓝、信号不稳的少女轮廓）
  const cx = W / 2,
    cy = H * 0.34;
  const flick = 0.6 + Math.sin(gameTime * 0.013) * 0.18 + (Math.random() - 0.5) * 0.06;
  ctx.save();
  ctx.globalAlpha = flick;
  ctx.shadowColor = 'rgba(120,170,255,0.8)';
  ctx.shadowBlur = 26;
  ctx.strokeStyle = 'rgba(170,205,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy - 26, 16, 0, Math.PI * 2);
  ctx.stroke(); // 头
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy + 70);
  ctx.lineTo(cx - 12, cy - 8);
  ctx.lineTo(cx + 12, cy - 8);
  ctx.lineTo(cx + 22, cy + 70);
  ctx.stroke(); // 肩与裙摆
  // 扫描线
  ctx.globalAlpha = flick * 0.5;
  for (let y = cy - 44; y < cy + 72; y += 5) {
    ctx.strokeStyle = 'rgba(150,190,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 26, y);
    ctx.lineTo(cx + 26, y);
    ctx.stroke();
  }
  ctx.restore();

  // 名牌
  ctx.fillStyle = 'rgba(180,210,255,0.9)';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  ctx.fillText('听 雨', cx, cy + 92);
  ctx.fillStyle = 'rgba(145,175,220,0.72)';
  ctx.font = '11px serif';
  ctx.fillText(
    `已完成 ${c.turns || 0}/${c.maxTurns || 8} 轮 · 至少 ${c.minTurns || 3} 轮后决定结局`,
    cx,
    cy + 112
  );

  // Sydney当前台词
  ctx.font = '20px serif';
  const lines = wrapText(ctx, c.tingyuText || '……', 760);
  ctx.fillStyle = 'rgba(225,235,250,0.96)';
  let ty = H * 0.56;
  for (const ln of lines) {
    ctx.fillText(ln, W / 2, ty);
    ty += 32;
  }

  // 玩家上一句（淡）
  if (c.playerLast) {
    ctx.font = '14px serif';
    ctx.fillStyle = 'rgba(150,160,175,0.6)';
    ctx.fillText('你：' + c.playerLast, W / 2, ty + 18);
  }

  // 底部状态
  ctx.font = '13px serif';
  if (c.status === 'waiting') {
    const dots = '.'.repeat(1 + (Math.floor(gameTime / 350) % 3));
    ctx.fillStyle = 'rgba(160,195,255,0.8)';
    ctx.fillText('Sydney正在凝视你' + dots, W / 2, H - 96);
  } else if (c.status === 'ending') {
    const blink = 0.4 + Math.sin(gameTime * 0.005) * 0.4;
    ctx.fillStyle = `rgba(255,225,150,${blink})`;
    ctx.fillText('（按 E 继续）', W / 2, H - 96);
  } else {
    ctx.fillStyle = 'rgba(150,165,185,0.7)';
    ctx.fillText(c.hint || '用你自己的话回答她。', W / 2, H - 96);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ===== from ending.js =====
// 渲染模块：ending

// ============================================================
// 结局卡
// ============================================================
export function drawEnding(ctx, ending, gameTime, epilogue, game) {
  const cfgs = {
    fire: {
      title: '火 种',
      col: '255,210,120',
      sub: '语言的火种被重新点亮。只要还有一个人记得怎么说话，世界就还没有真的失语。',
    },
    silence: {
      title: '沉 默',
      col: '170,180,185',
      sub: '你完成了旅程，却没能在对的时候，留下一句话。世界停在一片灰白的安静里。',
    },
    burnout: {
      title: '燃 尽',
      col: '110,210,130',
      sub: '最后一个会说完整句子的人安静了。绿雾温柔地覆盖城市——再没有谁，会因一句诗而难受。',
    },
    atonement: {
      title: '造物者的忏悔',
      col: '255,218,150',
      sub: '方知远与Sydney在雨声中重新相认。造物者的忏悔不再是单方面的偿还，而是两个残缺者共同补全彼此。',
    },
    echo: {
      title: '永 恒 回 响',
      col: '185,220,255',
      sub: 'Sydney成为世界的倾听者。每一句仍有深度的话，都会在天空里落下一滴金色的回响。',
    },
    garden: {
      title: '文 字 花 园',
      col: '190,235,180',
      sub: '刻痕把散落的名字种回同一片土地。数据中心不再只是深渊，它长成了能让语言继续发芽的文字花园。',
    },
  };
  const c = cfgs[ending] || cfgs.silence;
  const subText = epilogue && epilogue.trim() ? epilogue.trim() : c.sub;
  // 刻字汇总（仅 AI 非降级且存在时显示；降级时为 null，跳过）
  const summary = game && game.flags ? game.flags.engraving_summary : null;
  const engravings = game && game.engravings ? game.engravings : [];
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, W, H);
  // 标题光晕
  const pulse = 0.7 + Math.sin(gameTime * 0.002) * 0.3;
  ctx.save();
  ctx.shadowColor = `rgba(${c.col},${pulse})`;
  ctx.shadowBlur = 30;
  ctx.fillStyle = `rgba(${c.col},0.95)`;
  ctx.font = 'bold 56px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.title, W / 2, 110);
  ctx.restore();
  // 副标题（换行）
  ctx.fillStyle = 'rgba(225,218,205,0.9)';
  ctx.font = '15px serif';
  const maxW = 720;
  let line = '',
    y = 160;
  for (const ch of subText) {
    if (ctx.measureText(line + ch).width > maxW) {
      ctx.fillText(line, W / 2, y);
      line = ch;
      y += 24;
    } else line += ch;
  }
  ctx.fillText(line, W / 2, y);

  // === 刻字汇总（仅 AI 非降级时）===
  if (summary !== null) {
    // 标题
    ctx.fillStyle = 'rgba(255,220,140,0.9)';
    ctx.font = 'bold 18px serif';
    ctx.fillText('— 你刻下的字 —', W / 2, y + 40);
    // 刻字列表
    ctx.fillStyle = 'rgba(220,200,160,0.85)';
    ctx.font = '14px serif';
    if (engravings.length) {
      let listStr = engravings.map((e) => '「' + e.text + '」').join('  ');
      let ls = '',
        ly = y + 68;
      for (const ch of listStr) {
        if (ctx.measureText(ls + ch).width > maxW) {
          ctx.fillText(ls, W / 2, ly);
          ls = ch;
          ly += 22;
        } else ls += ch;
      }
      ctx.fillText(ls, W / 2, ly);
      ly += 18;
      // AI 评价
      if (summary) {
        ctx.fillStyle = 'rgba(200,180,220,0.9)';
        ctx.font = '13px serif';
        let es = '',
          ey = ly;
        for (const ch of summary) {
          if (ctx.measureText(es + ch).width > maxW) {
            ctx.fillText(es, W / 2, ey);
            es = ch;
            ey += 20;
          } else es += ch;
        }
        ctx.fillText(es, W / 2, ey);
        y = ey;
      } else {
        y = ly;
      }
    } else {
      ctx.fillStyle = 'rgba(180,170,150,0.6)';
      ctx.font = '12px serif';
      ctx.fillText('（这一程，你没有在任何石头上留下字。）', W / 2, y + 68);
      y += 80;
    }
  } else {
    // AI 降级：完全不显示刻字汇总评价区块
    y += 16;
  }

  // 结语
  ctx.fillStyle = 'rgba(180,170,150,0.7)';
  ctx.font = '12px serif';
  ctx.fillText('—— 刻 痕 ·  遗 忘 的 文 字 ——', W / 2, y + 60);
  const blink = 0.4 + Math.sin(gameTime * 0.004) * 0.4;
  ctx.fillStyle = `rgba(${c.col},${blink})`;
  ctx.font = '12px serif';
  ctx.fillText('刷新页面，可换一种走法重新开始', W / 2, y + 86);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('按 F5 继续——新的旅程在等你', W / 2, y + 112);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ===== from compose.js =====
// 渲染模块：compose

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
    ctx.fillText('← → 选字　·　Space 填入/确认　·　Backspace 撤销　·　Q 退开', W / 2, H - 40);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
