// 渲染模块：scenes_freeze
import { W, H } from '../config.js';
import { roundRect } from './util.js';

// ============================================================
// 冷冻中心
// ============================================================
export function drawFreezeCenter(ctx, W2S, scene, gameTime, game) {
  drawTileFloor(ctx, W2S, scene, '#1c2024', '#262a30', 60);
  drawCeilingLightStrips(ctx, W2S, gameTime);
  drawRoomWalls(ctx, W2S, scene);
  drawPlayerPod(ctx, W2S, gameTime);
  drawOtherPods(ctx, W2S, scene, gameTime);
  drawTerminal(ctx, W2S, scene, gameTime);
  drawLockerArea(ctx, W2S, gameTime);
  drawExitDoor(ctx, W2S, gameTime, game);
}

export function drawTileFloor(ctx, W2S, scene, base, line, step) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const offY = ((W2S(0, 0).y % step) + step) % step;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  for (let y = -offY; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const offX = ((W2S(0, 0).x % step) + step) % step;
  for (let x = -offX; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  // 地面污渍（固定世界坐标，人物移动时保持静止）
  for (let i = 0; i < 14; i++) {
    const wx = (i * 173 + 23) % scene.width;
    const wy = (i * 91 + 17) % scene.height;
    const p = W2S(wx, wy);
    if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCeilingLightStrips(ctx, W2S, gameTime) {
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 200;
    const y = 24;
    const s = W2S(x, y);
    const flicker = Math.sin(gameTime * 0.005 + i) * 0.3;
    const broken = i === 2 && Math.sin(gameTime * 0.01) > 0.7;
    const a = broken ? 0.15 : 0.5 + flicker * 0.4;
    ctx.fillStyle = `rgba(240,230,200,${a})`;
    ctx.fillRect(s.x - 60, s.y - 5, 120, 8);
    ctx.strokeStyle = 'rgba(80,70,50,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - 60, s.y - 5, 120, 8);
    const grad = ctx.createLinearGradient(0, s.y, 0, s.y + 360);
    grad.addColorStop(0, `rgba(240,230,200,${a * 0.18})`);
    grad.addColorStop(1, 'rgba(240,230,200,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(s.x - 80, s.y + 3, 160, 360);
  }
}

export function drawRoomWalls(ctx, W2S, scene) {
  for (const wall of scene.walls) {
    const s = W2S(wall.x, wall.y);
    if (wall.h < 12) {
      ctx.fillStyle = '#3a3a3e';
      ctx.fillRect(s.x, s.y, wall.w, Math.max(wall.h, 2));
      ctx.fillStyle = '#1c1c1e';
      ctx.fillRect(s.x, s.y + Math.max(wall.h, 2) - 2, wall.w, 2);
    } else if (wall.w < 12) {
      ctx.fillStyle = '#3a3a3e';
      ctx.fillRect(s.x, s.y, Math.max(wall.w, 2), wall.h);
      ctx.fillStyle = '#1c1c1e';
      ctx.fillRect(s.x, s.y, 2, wall.h);
    } else {
      ctx.fillStyle = '#3a3a3e';
      ctx.fillRect(s.x, s.y, wall.w, wall.h);
      ctx.strokeStyle = '#1c1c1e';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x, s.y, wall.w, wall.h);
    }
  }
}

export function drawPlayerPod(ctx, W2S, gameTime) {
  const cx = 360,
    cy = 440,
    w = 80,
    h = 130;
  const s = W2S(cx, cy);

  // 机械底座
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(s.x - w / 2 - 6, s.y - 4, w + 12, 18);
  ctx.fillStyle = '#4a4a4e';
  ctx.fillRect(s.x - w / 2 - 6, s.y - 4, w + 12, 4);
  ctx.strokeStyle = '#1a1a1c';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(s.x - w / 2 - 6, s.y - 4, w + 12, 18);
  ctx.fillStyle = '#1a1a1c';
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(s.x + i * 14 - 2, s.y + 4, 4, 6);
  }

  // 玻璃舱
  const podTop = s.y - h;
  const podH = h - 14;
  const podGrad = ctx.createLinearGradient(0, podTop, 0, s.y - 4);
  podGrad.addColorStop(0, 'rgba(150,200,220,0.18)');
  podGrad.addColorStop(0.4, 'rgba(180,210,220,0.25)');
  podGrad.addColorStop(1, 'rgba(120,160,180,0.18)');
  ctx.fillStyle = podGrad;
  roundRect(ctx, s.x - w / 2, podTop, w, podH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,200,220,0.8)';
  ctx.lineWidth = 2;
  roundRect(ctx, s.x - w / 2, podTop, w, podH, 8);
  ctx.stroke();

  // 玻璃高光
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x - w / 2 + 8, podTop + 8);
  ctx.lineTo(s.x - w / 2 + 8, podTop + 20);
  ctx.moveTo(s.x - w / 2 + 8, podTop + 8);
  ctx.lineTo(s.x - w / 2 + 22, podTop + 8);
  ctx.stroke();

  // 仓内人影
  ctx.strokeStyle = 'rgba(200,180,140,0.35)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(s.x, s.y - h + 32, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - h + 40);
  ctx.lineTo(s.x, s.y - h + 75);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - h + 50);
  ctx.lineTo(s.x - 8, s.y - h + 75);
  ctx.moveTo(s.x, s.y - h + 50);
  ctx.lineTo(s.x + 8, s.y - h + 75);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - h + 75);
  ctx.lineTo(s.x - 6, s.y - 8);
  ctx.moveTo(s.x, s.y - h + 75);
  ctx.lineTo(s.x + 6, s.y - 8);
  ctx.stroke();

  // 霜
  ctx.strokeStyle = 'rgba(200,220,240,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const fy = podTop + 8 + i * 14;
    const fl = 6 + ((i * 7) % 14);
    ctx.beginPath();
    ctx.moveTo(s.x - w / 2 + 2, fy);
    ctx.lineTo(s.x - w / 2 + 2 + fl, fy);
    ctx.moveTo(s.x + w / 2 - 2, fy + 4);
    ctx.lineTo(s.x + w / 2 - 2 - fl, fy + 4);
    ctx.stroke();
  }

  // 状态指示灯
  const pulse = 0.7 + Math.sin(gameTime * 0.005) * 0.3;
  ctx.fillStyle = `rgba(80,220,140,${pulse})`;
  ctx.shadowColor = `rgba(80,220,140,${pulse * 0.8})`;
  ctx.shadowBlur = 8 * pulse;
  ctx.beginPath();
  ctx.arc(s.x + w / 2 - 8, s.y - 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 标记「我」
  ctx.fillStyle = 'rgba(255,220,140,0.95)';
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('我', s.x, podTop - 12);
  ctx.textAlign = 'left';
}

export function drawOtherPods(ctx, W2S, scene, gameTime) {
  const topRow = [
    { x: 80, w: 130 },
    { x: 225, w: 130 },
    { x: 370, w: 130 },
    { x: 515, w: 130 },
    { x: 660, w: 100 },
  ];
  for (let i = 0; i < topRow.length; i++) {
    const pod = topRow[i];
    const s = W2S(pod.x + pod.w / 2, 140);
    const h = 80;
    // 底座
    ctx.fillStyle = '#222226';
    ctx.fillRect(s.x - pod.w / 2 - 4, s.y - 4, pod.w + 8, 14);
    ctx.strokeStyle = '#111114';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - pod.w / 2 - 4, s.y - 4, pod.w + 8, 14);
    // 玻璃
    const top = s.y - h + 10;
    const grad = ctx.createLinearGradient(0, top, 0, s.y - 4);
    grad.addColorStop(0, 'rgba(120,150,170,0.18)');
    grad.addColorStop(1, 'rgba(80,110,130,0.15)');
    ctx.fillStyle = grad;
    roundRect(ctx, s.x - pod.w / 2, top, pod.w, h - 14, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,170,190,0.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, s.x - pod.w / 2, top, pod.w, h - 14, 6);
    ctx.stroke();
    // 霜
    ctx.strokeStyle = 'rgba(180,200,220,0.3)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const fy = top + 6 + k * 12;
      const fl = 8 + ((k * 11) % 18);
      ctx.beginPath();
      ctx.moveTo(s.x - pod.w / 2 + 3, fy);
      ctx.lineTo(s.x - pod.w / 2 + 3 + fl, fy);
      ctx.stroke();
    }
    // 灯（灭）
    ctx.fillStyle = '#1a1a1e';
    ctx.beginPath();
    ctx.arc(s.x + pod.w / 2 - 8, s.y - 9, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 编号
    ctx.fillStyle = 'rgba(180,180,180,0.5)';
    ctx.font = '11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('#' + (i + 1).toString().padStart(2, '0'), s.x, top - 6);
    ctx.textAlign = 'left';
  }

  // 损坏的冷冻仓
  for (const [i, x] of [410, 565].entries()) {
    const pod = { x, w: 140, h: 100 };
    const s = W2S(pod.x + pod.w / 2, 270);
    ctx.fillStyle = '#1a1a1c';
    ctx.fillRect(s.x - pod.w / 2 - 4, s.y - 4, pod.w + 8, 14);
    const top = s.y - pod.h + 14;
    ctx.fillStyle = 'rgba(20,15,18,0.6)';
    roundRect(ctx, s.x - pod.w / 2, top, pod.w, pod.h - 18, 6);
    ctx.fill();
    // 红色碎裂
    ctx.strokeStyle = 'rgba(120,40,40,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - pod.w / 2 + 10, top + 5);
    ctx.lineTo(s.x + 5, top + 20);
    ctx.lineTo(s.x - 10, top + 40);
    ctx.lineTo(s.x + 15, top + 55);
    ctx.lineTo(s.x - 5, top + pod.h - 25);
    ctx.stroke();
    // 绿色荧光
    ctx.strokeStyle = 'rgba(80,220,120,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - pod.w / 2 + 30, top + 12);
    ctx.lineTo(s.x + 20, top + 30);
    ctx.lineTo(s.x + 35, top + 50);
    ctx.stroke();
    // 边框
    ctx.strokeStyle = 'rgba(80,60,60,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - pod.w / 2, top + 8);
    ctx.lineTo(s.x - pod.w / 2, s.y - 4);
    ctx.lineTo(s.x + pod.w / 2, s.y - 4);
    ctx.lineTo(s.x + pod.w / 2, top + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - pod.w / 2 + 20, top);
    ctx.lineTo(s.x - pod.w / 2 + 8, top + 8);
    ctx.lineTo(s.x - pod.w / 2 + 14, top + 18);
    ctx.stroke();
  }
}

export function drawTerminal(ctx, W2S, scene, gameTime) {
  const it = scene.props.find((p) => p.name === '终端机');
  if (!it) return;
  const cx = it.x + it.w / 2;
  const cy = it.y + it.h / 2;
  const s = W2S(cx, cy);
  const w = it.w,
    h = it.h;

  // 桌子
  ctx.fillStyle = '#3a3530';
  ctx.fillRect(s.x - w / 2 - 6, s.y - 4, w + 12, h + 8);
  ctx.fillStyle = '#4a4540';
  ctx.fillRect(s.x - w / 2 - 6, s.y - 4, w + 12, 3);
  ctx.strokeStyle = '#1a1815';
  ctx.lineWidth = 1;
  ctx.strokeRect(s.x - w / 2 - 6, s.y - 4, w + 12, h + 8);

  // 主机
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(s.x - 18, s.y - 2, 36, 18);
  ctx.strokeStyle = '#0a0a0c';
  ctx.lineWidth = 1;
  ctx.strokeRect(s.x - 18, s.y - 2, 36, 18);
  ctx.fillStyle = '#0a0';
  ctx.fillRect(s.x - 14, s.y + 2, 2, 2);
  const blink = Math.sin(gameTime * 0.005) > 0;
  ctx.fillStyle = blink ? '#ff8800' : '#552200';
  ctx.fillRect(s.x - 8, s.y + 2, 2, 2);

  // CRT 显示器
  const monTop = s.y - h / 2 - 32;
  ctx.fillStyle = '#1a1a1c';
  roundRect(ctx, s.x - 30, monTop, 60, 30, 4);
  ctx.fill();
  ctx.strokeStyle = '#0a0a0c';
  ctx.lineWidth = 1.5;
  roundRect(ctx, s.x - 30, monTop, 60, 30, 4);
  ctx.stroke();

  // 屏幕
  ctx.fillStyle = '#0a1416';
  ctx.fillRect(s.x - 26, monTop + 3, 52, 22);
  const scan = Math.sin(gameTime * 0.01) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(100,220,160,${scan})`;
  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  for (let i = 0; i < 3; i++) {
    const labels = ['> WAKING', '> 2087.10', '> AI.SIG'];
    ctx.fillText(labels[i], s.x - 24, monTop + 10 + i * 7);
  }
  // 扫描线
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let yy = monTop + 3; yy < monTop + 25; yy += 3) {
    ctx.fillRect(s.x - 26, yy, 52, 1);
  }
  // 光晕
  ctx.shadowColor = 'rgba(100,220,160,0.6)';
  ctx.shadowBlur = 6;
  ctx.strokeStyle = `rgba(100,220,160,${scan * 0.6})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(s.x - 26, monTop + 3, 52, 22);
  ctx.shadowBlur = 0;

  // 键盘
  ctx.fillStyle = '#222';
  ctx.fillRect(s.x - 22, s.y + 20, 44, 8);
  ctx.strokeStyle = '#0a0a0a';
  ctx.strokeRect(s.x - 22, s.y + 20, 44, 8);
  ctx.fillStyle = '#333';
  for (let i = 0; i < 5; i++) ctx.fillRect(s.x - 20 + i * 8, s.y + 22, 6, 4);
}

export function drawLockerArea(ctx, W2S, gameTime) {
  // 标牌
  const signPos = W2S(640, 380);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(signPos.x + 10, signPos.y - 12, 90, 18);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.strokeRect(signPos.x + 10, signPos.y - 12, 90, 18);
  ctx.fillStyle = 'rgba(220,200,140,0.85)';
  ctx.font = 'bold 12px serif';
  ctx.textAlign = 'center';
  ctx.fillText('更衣室', signPos.x + 55, signPos.y + 1);
  ctx.textAlign = 'left';

  // 隔间墙
  const wallTop = W2S(580, 386);
  ctx.fillStyle = '#4a4035';
  ctx.fillRect(wallTop.x, wallTop.y, 200, 4);

  // 储物柜
  for (let col = 0; col < 4; col++) {
    const lx = 600 + col * 42;
    const ly = 405;
    const s = W2S(lx, ly);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(s.x, s.y, 36, 50);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(s.x + 2, s.y + 2, 32, 46);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x, s.y, 36, 50);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let v = 0; v < 4; v++) {
      ctx.beginPath();
      ctx.moveTo(s.x + 4, s.y + 5 + v * 3);
      ctx.lineTo(s.x + 32, s.y + 5 + v * 3);
      ctx.stroke();
    }
    ctx.fillStyle = col === 0 ? '#d4b86a' : '#666';
    ctx.fillRect(s.x + 28, s.y + 28, 3, 4);
    ctx.fillStyle = 'rgba(200,200,200,0.5)';
    ctx.font = '8px serif';
    ctx.textAlign = 'center';
    ctx.fillText((col + 1).toString().padStart(2, '0'), s.x + 18, s.y + 12);
    ctx.textAlign = 'left';

    if (col === 0) {
      // 第一个柜子：打开 + 挂着衣服
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(s.x + 14, s.y + 5, 22, 40);
      ctx.fillStyle = '#888';
      ctx.fillRect(s.x + 18, s.y + 8, 14, 22);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(s.x + 18, s.y + 8, 14, 4);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x + 12, s.y + 6);
      ctx.lineTo(s.x + 38, s.y + 6);
      ctx.stroke();
    }
  }
}

export function drawExitDoor(ctx, W2S, gameTime, game) {
  const doorX = 270,
    doorY = 580,
    doorW = 210,
    doorH = 14;
  const s = W2S(doorX, doorY);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(s.x - 4, s.y - 4, doorW + 8, doorH + 8);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(s.x - 2, s.y - 2, doorW + 4, doorH + 4);
  ctx.fillStyle = 'rgba(255,200,100,0.08)';
  ctx.fillRect(s.x, s.y, doorW, doorH);
  const grad = ctx.createLinearGradient(0, s.y, 0, s.y + 60);
  grad.addColorStop(0, 'rgba(255,200,100,0.18)');
  grad.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(s.x, s.y + doorH, doorW, 60);
  const glow = 0.4 + Math.sin(gameTime * 0.003) * 0.3;
  ctx.fillStyle = `rgba(220,180,80,${glow})`;
  ctx.fillRect(s.x + doorW / 2 - 4, s.y + 3, 8, 8);
  ctx.strokeStyle = 'rgba(120,90,40,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(s.x + doorW / 2 - 4, s.y + 3, 8, 8);
}
