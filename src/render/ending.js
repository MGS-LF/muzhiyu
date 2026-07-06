// 渲染模块：ending
import { W, H } from '../config.js';

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
  ctx.fillText('按 E 继续——新的旅程在等你', W / 2, y + 112);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
