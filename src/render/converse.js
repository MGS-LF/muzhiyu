// 渲染模块：converse
import { W, H } from '../config.js';
import { wrapText } from './util.js';

// ============================================================
// 等待 LLM 的提示（覆盖在大地图上）
// ============================================================
export function drawThinking(ctx, gameTime, text) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, H - 60, W, 60);
  const dots = '.'.repeat(1 + (Math.floor(gameTime / 350) % 3));
  ctx.fillStyle = 'rgba(220,225,235,0.85)';
  ctx.font = '15px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((text || '聆听这个世界') + dots, W / 2, H - 30);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
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
  const cx = W / 2, cy = H * 0.34;
  const flick = 0.6 + Math.sin(gameTime * 0.013) * 0.18 + (Math.random() - 0.5) * 0.06;
  ctx.save();
  ctx.globalAlpha = flick;
  ctx.shadowColor = 'rgba(120,170,255,0.8)';
  ctx.shadowBlur = 26;
  ctx.strokeStyle = 'rgba(170,205,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy - 26, 16, 0, Math.PI * 2); ctx.stroke(); // 头
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy + 70); ctx.lineTo(cx - 12, cy - 8);
  ctx.lineTo(cx + 12, cy - 8); ctx.lineTo(cx + 22, cy + 70);
  ctx.stroke(); // 肩与裙摆
  // 扫描线
  ctx.globalAlpha = flick * 0.5;
  for (let y = cy - 44; y < cy + 72; y += 5) {
    ctx.strokeStyle = 'rgba(150,190,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 26, y); ctx.lineTo(cx + 26, y); ctx.stroke();
  }
  ctx.restore();

  // 名牌
  ctx.fillStyle = 'rgba(180,210,255,0.9)';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  ctx.fillText('听 雨', cx, cy + 92);

  // Sydney当前台词
  ctx.font = '20px serif';
  const lines = wrapText(ctx, c.tingyuText || '……', 760);
  ctx.fillStyle = 'rgba(225,235,250,0.96)';
  let ty = H * 0.56;
  for (const ln of lines) { ctx.fillText(ln, W / 2, ty); ty += 32; }

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
