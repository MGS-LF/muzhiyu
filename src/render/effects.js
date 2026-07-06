// 渲染模块：effects
import { W, H } from '../config.js';

// ============================================================
// 章节门禁可视化：未解锁→能量屏障+锁；已解锁→金色光柱+去向
// ============================================================
export function drawGates(ctx, W2S, scene, game, gameTime) {
  for (const it of scene.interactables) {
    if (it.type !== 'scene_change' || !it.gate) continue;
    const g = it.gate;
    const charsOk = game.meetsGate(g).ok;
    const puzzleDone = !g.puzzle || game.solvedPuzzles.has(g.puzzle);
    const locked = !charsOk || !puzzleDone;
    // 字已集齐但谜题未解：进入交互范围会触发造句
    const readyToCompose = charsOk && !puzzleDone;
    const s = W2S(it.x, it.y);
    if (s.y < -160 || s.y > H + 160) continue;
    const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;

    if (locked) {
      // 红绿交织的能量屏障
      const bw = 150,
        bh = 90;
      const flow = (gameTime * 0.05) % 18;
      // 雾团
      const grad = ctx.createRadialGradient(s.x, s.y - 10, 6, s.x, s.y - 10, 90);
      grad.addColorStop(0, `rgba(90,210,110,${0.22 + pulse * 0.12})`);
      grad.addColorStop(0.6, `rgba(70,150,120,${0.12})`);
      grad.addColorStop(1, 'rgba(40,60,60,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 10, 90, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      // 竖向能量线
      ctx.strokeStyle = `rgba(150,255,170,${0.35 + pulse * 0.25})`;
      ctx.lineWidth = 1.5;
      for (let x = -bw / 2; x <= bw / 2; x += 18) {
        ctx.beginPath();
        for (let y = -bh / 2; y <= bh / 2; y += 6) {
          const wob = Math.sin((y + flow * 6 + x) * 0.12 + gameTime * 0.005) * 4;
          const px = s.x + x + wob,
            py = s.y - 10 + y;
          if (y === -bh / 2) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      // 锁图标
      ctx.fillStyle = `rgba(255,90,90,${0.7 + pulse * 0.3})`;
      ctx.shadowColor = 'rgba(255,80,80,0.8)';
      ctx.shadowBlur = 8;
      const lx = s.x,
        ly = s.y - 46;
      ctx.fillRect(lx - 7, ly, 14, 11);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,120,120,${0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ly, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,10,10,0.9)';
      ctx.fillRect(lx - 1.2, ly + 3, 2.4, 5);
      // 文字
      ctx.fillStyle = `rgba(255,150,150,${0.7 + pulse * 0.3})`;
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.fillText(readyToCompose ? 'E 复原诗句，破除封锁' : '此路被污染封锁', s.x, s.y - 56);
      ctx.textAlign = 'left';
    } else {
      // 解锁：金色光柱 + 去向
      const grad = ctx.createLinearGradient(0, s.y - 70, 0, s.y + 24);
      grad.addColorStop(0, 'rgba(255,225,150,0)');
      grad.addColorStop(0.5, `rgba(255,225,150,${pulse * 0.3})`);
      grad.addColorStop(1, 'rgba(255,225,150,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(s.x - 44, s.y - 70, 88, 94);
      ctx.fillStyle = `rgba(255,225,150,${pulse * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 34, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,230,160,${0.7 + pulse * 0.3})`;
      ctx.font = 'bold 13px serif';
      ctx.textAlign = 'center';
      ctx.fillText('→ ' + (it.label || '前进'), s.x, s.y - 24);
      ctx.textAlign = 'left';
    }
  }
}

export function drawObjectiveArrow(ctx, W2S, game, gameTime) {
  const obj = game.objective;
  if (!obj || obj.done || !obj.target) return;
  const tx = obj.target.x,
    ty = obj.target.y;
  const dist = Math.hypot(tx - game.player.x, ty - game.player.y);
  if (dist < 70) return; // 已在目标附近，无需箭头
  const s = W2S(tx, ty);
  const cx = W / 2,
    cy = H / 2;
  const dx = s.x - cx,
    dy = s.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d,
    ny = dy / d;
  const margin = 92;
  const ax = cx + nx * margin,
    ay = cy + ny * margin;
  const pulse = 0.6 + Math.sin(gameTime * 0.006) * 0.4;
  const angle = Math.atan2(ny, nx);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);
  // 箭羽形箭头
  ctx.fillStyle = `rgba(255,228,150,${pulse})`;
  ctx.shadowColor = `rgba(255,228,150,${pulse * 0.8})`;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // 距离
  ctx.rotate(-angle);
  ctx.fillStyle = `rgba(255,228,150,${pulse})`;
  ctx.font = 'bold 11px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.floor(dist)}`, 0, -17);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.restore();
}

// ============================================================
// 受伤红屏
// ============================================================
export function drawDamageOverlay(ctx, player, gameTime) {
  const a = Math.min(0.35, (player.invulnerable / 800) * 0.35);
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
  grad.addColorStop(0, 'rgba(220,40,40,0)');
  grad.addColorStop(1, `rgba(220,40,40,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // 抖动
  if (Math.random() < 0.3) {
    ctx.fillStyle = 'rgba(255,100,100,0.04)';
    ctx.fillRect(0, 0, W, H);
  }
}

// ============================================================
// 死亡画面
// ============================================================
export function drawDeathScreen(ctx, gameTime) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(220,60,60,0.95)';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('理性崩溃', W / 2, H / 2 - 30);
  ctx.fillStyle = 'rgba(220,200,180,0.8)';
  ctx.font = '14px serif';
  ctx.fillText('你被烂梗的海洋吞没，失去了语言。', W / 2, H / 2 + 10);
  const blink = 0.5 + Math.sin(gameTime * 0.005) * 0.5;
  ctx.fillStyle = `rgba(255,220,140,${blink})`;
  ctx.font = 'bold 16px serif';
  ctx.fillText('▼ 按 E 在最近的要石醒来', W / 2, H / 2 + 60);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}
