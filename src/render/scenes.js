import { roundRect } from './util.js';
import { W, H } from '../config.js';

// ===== from scenes_freeze.js =====
// 渲染模块：scenes_freeze

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

// ===== from scenes_street.js =====
// 渲染模块：scenes_street

// ============================================================
// 街道
// ============================================================
export function drawStreet(ctx, W2S, scene, gameTime, game) {
  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, 280);
  sky.addColorStop(0, '#2a2620');
  sky.addColorStop(0.5, '#3a342a');
  sky.addColorStop(1, '#4a4030');
  ctx.fillStyle = sky;
  const skyH = Math.max(W2S(0, 280).y, 0);
  ctx.fillRect(0, 0, W, Math.min(skyH, H));

  // 远景天际线
  for (const b of scene.props.filter((p) => p.name === '高楼')) {
    const s = W2S(b.x, b.y);
    ctx.fillStyle = '#2a2826';
    ctx.fillRect(s.x, s.y, b.w, b.h);
    ctx.fillStyle = '#3a3630';
    ctx.fillRect(s.x + b.w * 0.7, s.y, b.w * 0.3, b.h);
    for (let wy = s.y + 12; wy < s.y + b.h - 8; wy += 16) {
      for (let wx = s.x + 6; wx < s.x + b.w - 6; wx += 12) {
        const seed = (wx * 31 + wy * 17) % 100;
        if (seed < 6) {
          ctx.fillStyle = seed < 3 ? 'rgba(220,180,100,0.6)' : 'rgba(180,200,220,0.4)';
          ctx.fillRect(wx, wy, 5, 7);
        } else if (seed < 12) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }
    if (b.h > 250) {
      ctx.strokeStyle = '#1a1816';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x + b.w * 0.5, s.y);
      ctx.lineTo(s.x + b.w * 0.5, s.y - 14);
      ctx.stroke();
      const blink = Math.sin(gameTime * 0.003) > 0;
      ctx.fillStyle = blink ? '#cc3333' : '#661111';
      ctx.fillRect(s.x + b.w * 0.5 - 1, s.y - 16, 2, 2);
    }
  }

  // 地面
  const walkY = W2S(0, 420).y;
  const groundY = W2S(0, 540).y;
  ctx.fillStyle = '#5a5048';
  ctx.fillRect(0, 0, W, walkY);
  ctx.fillStyle = '#2a2622';
  ctx.fillRect(0, walkY, W, groundY - walkY);

  // 路面裂缝（固定世界坐标，不随摄像机滚动）
  ctx.strokeStyle = 'rgba(15,12,10,0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const wx = (i * 173 + 37) % scene.width;
    const wy = 430 + ((i * 23) % 100);
    const p = W2S(wx, wy);
    if (p.x < -40 || p.x > W + 40) continue;
    let cx = p.x,
      cy = p.y;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += 8 + ((i + s) % 6);
      cy += 4 + ((i * 3 + s) % 7);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // 褪色双黄线
  ctx.strokeStyle = 'rgba(180,160,80,0.3)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([20, 16]);
  const centerY = (walkY + groundY) / 2;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(W, centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 杂草（固定世界坐标，人物移动时保持静止）
  ctx.strokeStyle = '#5a6a30';
  ctx.lineWidth = 1;
  for (let i = 0; i < 50; i++) {
    const wx = (i * 41 + 17) % scene.width;
    const wy = 424 + ((i * 11) % 8);
    const p = W2S(wx, wy);
    if (p.x < -20 || p.x > W + 20) continue;
    const gx = p.x,
      gy = p.y;
    const sway = Math.sin(gameTime * 0.002 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + 2 + sway, gy - 6, gx + 4, gy - 12);
    ctx.stroke();
    ctx.strokeStyle = '#4a5a28';
    ctx.beginPath();
    ctx.moveTo(gx + 4, gy);
    ctx.quadraticCurveTo(gx + 6 + sway, gy - 7, gx + 8, gy - 14);
    ctx.stroke();
    ctx.strokeStyle = '#5a6a30';
  }

  // 落叶（固定世界坐标）
  for (let i = 0; i < 30; i++) {
    const wx = (i * 67 + 29) % scene.width;
    const wy = 424 + ((i * 19) % 108);
    const p = W2S(wx, wy);
    if (p.x < -10 || p.x > W + 10) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(i * 0.7);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(160,140,90,0.6)' : 'rgba(180,170,140,0.5)';
    ctx.fillRect(-2, -1, 4, 2);
    ctx.restore();
  }

  // 地铁站入口
  const subway = scene.props.find((p) => p.name === '地铁站入口');
  if (subway) {
    const s = W2S(subway.x + subway.w / 2, subway.y + subway.h / 2);
    ctx.fillStyle = '#5a5550';
    ctx.fillRect(s.x - subway.w / 2, s.y - subway.h / 2, subway.w, subway.h);
    ctx.fillStyle = '#6a655e';
    ctx.fillRect(s.x - subway.w / 2, s.y - subway.h / 2, subway.w, 8);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(s.x - 50, s.y - 5, 100, subway.h);
    ctx.strokeStyle = '#3a3530';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(s.x - 50 + i * 25, s.y - 5 + i * 4);
      ctx.lineTo(s.x + 50 - i * 25, s.y - 5 + i * 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(s.x - 30, s.y - subway.h / 2 - 18, 60, 14);
    ctx.fillStyle = 'rgba(220,200,140,0.9)';
    ctx.font = '9px serif';
    ctx.textAlign = 'center';
    ctx.fillText('METRO', s.x, s.y - subway.h / 2 - 8);
    ctx.textAlign = 'left';
  }

  // 废弃车辆
  for (const car of scene.props.filter((p) => p.name === '废弃车辆')) {
    drawAbandonedCar(ctx, W2S, car, gameTime);
  }

  // 碎石堆
  for (const rubble of scene.props.filter((p) => p.name === '碎石堆')) {
    drawRubble(ctx, W2S, rubble);
  }

  // 失语者群
  const lp = W2S(800, 700);
  if (lp.x > -150 && lp.x < W + 150) {
    for (let i = 0; i < 6; i++) {
      const px = lp.x + (i - 3) * 22;
      const py = lp.y + Math.sin(gameTime * 0.002 + i) * 1.5;
      drawLostPerson(ctx, px, py, i);
    }
  }

  // 路灯
  drawStreetLamps(ctx, W2S, gameTime);
}

export function drawAbandonedCar(ctx, W2S, car, gameTime) {
  const s = W2S(car.x + car.w / 2, car.y + car.h / 2);
  const w = car.w,
    h = car.h;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + h / 2 + 4, w * 0.7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a2a';
  roundRect(ctx, s.x - w / 2, s.y - h / 2, w, h, 3);
  ctx.fill();
  ctx.fillStyle = '#3a2018';
  roundRect(ctx, s.x - w / 2 + 6, s.y - h / 2 - 6, w - 12, 8, 3);
  ctx.fill();
  ctx.fillStyle = '#1a1a1c';
  ctx.fillRect(s.x - w / 2 + 4, s.y - h / 2 - 4, w - 8, 6);
  ctx.strokeStyle = 'rgba(200,200,200,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(s.x - w / 2 + 6, s.y - h / 2 - 4);
  ctx.lineTo(s.x, s.y - h / 2 + 2);
  ctx.lineTo(s.x + 6, s.y - h / 2 - 3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(140,60,30,0.4)';
  ctx.beginPath();
  ctx.ellipse(s.x - w / 4, s.y + h / 4, 8, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s.x + w / 4, s.y - h / 4, 6, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a0e08';
  ctx.lineWidth = 1;
  roundRect(ctx, s.x - w / 2, s.y - h / 2, w, h, 3);
  ctx.stroke();
  roundRect(ctx, s.x - w / 2 + 6, s.y - h / 2 - 6, w - 12, 8, 3);
  ctx.stroke();
  ctx.fillStyle = '#0a0a0a';
  for (const off of [-w / 2 + 6, w / 2 - 6]) {
    ctx.beginPath();
    ctx.arc(s.x + off, s.y + h / 2 + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(s.x + off, s.y + h / 2 + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
  }
}

export function drawRubble(ctx, W2S, rubble) {
  const s = W2S(rubble.x + rubble.w / 2, rubble.y + rubble.h / 2);
  ctx.fillStyle = '#4a4540';
  ctx.beginPath();
  ctx.moveTo(s.x - rubble.w / 2, s.y + rubble.h / 2);
  ctx.lineTo(s.x - rubble.w / 2 + 5, s.y - 5);
  ctx.lineTo(s.x - rubble.w / 4, s.y - rubble.h / 3);
  ctx.lineTo(s.x + rubble.w / 6, s.y - rubble.h / 2);
  ctx.lineTo(s.x + rubble.w / 3, s.y - rubble.h / 4);
  ctx.lineTo(s.x + rubble.w / 2 - 5, s.y - 3);
  ctx.lineTo(s.x + rubble.w / 2, s.y + rubble.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1816';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const rx = s.x - rubble.w / 2 + 8 + i * 11;
    const ry = s.y - 5 + (i % 3) * 4;
    ctx.fillStyle = i % 2 ? '#5a554e' : '#3a3530';
    ctx.beginPath();
    ctx.arc(rx, ry, 3 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawLostPerson(ctx, x, y, idx) {
  ctx.fillStyle = 'rgba(60,50,40,0.85)';
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,65,50,0.9)';
  ctx.beginPath();
  ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,15,10,1)';
  ctx.beginPath();
  ctx.arc(x - 2, y - 9, 1.2, 0, Math.PI * 2);
  ctx.arc(x + 2, y - 9, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,10,10,0.8)';
  ctx.beginPath();
  ctx.arc(x, y - 5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y - 8, 5, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawStreetLamps(ctx, W2S, gameTime) {
  const lamps = [
    { x: 300, y: 380, broken: false },
    { x: 700, y: 380, broken: false },
    { x: 1100, y: 380, broken: false },
    { x: 1500, y: 380, broken: true },
    { x: 1900, y: 380, broken: false },
  ];
  for (const lamp of lamps) {
    const s = W2S(lamp.x, lamp.y);
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(s.x - 2, s.y, 4, 80);
    ctx.fillStyle = '#4a4540';
    ctx.fillRect(s.x - 3, s.y, 1, 80);
    ctx.fillRect(s.x - 1, s.y - 10, 14, 2);
    ctx.fillStyle = '#5a5550';
    ctx.beginPath();
    ctx.moveTo(s.x + 8, s.y - 18);
    ctx.lineTo(s.x + 20, s.y - 10);
    ctx.lineTo(s.x + 8, s.y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1816';
    ctx.fillRect(s.x + 10, s.y - 10, 8, 2);

    if (!lamp.broken) {
      const flicker = 0.5 + Math.sin(gameTime * 0.01 + lamp.x) * 0.2;
      ctx.fillStyle = `rgba(255,220,140,${flicker})`;
      ctx.shadowColor = `rgba(255,220,140,${flicker * 0.6})`;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(s.x + 14, s.y - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      const grad = ctx.createRadialGradient(s.x + 14, s.y - 8, 2, s.x + 14, s.y - 8, 80);
      grad.addColorStop(0, `rgba(255,220,140,${flicker * 0.15})`);
      grad.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(s.x + 14, s.y - 6);
      ctx.lineTo(s.x + 90, s.y + 90);
      ctx.lineTo(s.x - 60, s.y + 90);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(40,30,20,0.7)';
      ctx.beginPath();
      ctx.arc(s.x + 14, s.y - 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawKeystones(ctx, W2S, scene, activated, gameTime) {
  for (const it of scene.interactables.filter((i) => i.type === 'keystone')) {
    const s = W2S(it.x, it.y);
    const active = activated.has(it.id);
    const glow = active ? 0.5 + Math.sin(gameTime * 0.004) * 0.3 : 0.15;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 2, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(s.x - 14, s.y + 4, 28, 6);
    const stoneGrad = ctx.createLinearGradient(0, s.y - 30, 0, s.y + 4);
    stoneGrad.addColorStop(0, active ? '#5a5040' : '#3a3a3a');
    stoneGrad.addColorStop(1, '#2a2a2a');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.moveTo(s.x - 12, s.y + 4);
    ctx.lineTo(s.x - 12, s.y - 24);
    ctx.lineTo(s.x - 8, s.y - 30);
    ctx.lineTo(s.x + 8, s.y - 30);
    ctx.lineTo(s.x + 12, s.y - 24);
    ctx.lineTo(s.x + 12, s.y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = active ? `rgba(255,210,90,${0.9 + glow})` : 'rgba(100,100,100,0.5)';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (active) {
      ctx.shadowColor = 'rgba(255,210,90,0.8)';
      ctx.shadowBlur = 8;
    }
    ctx.fillText(it.text, s.x, s.y - 13);
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    if (active) {
      ctx.fillStyle = `rgba(255,210,90,${glow * 0.2})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y - 12, 32, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ===== from scenes_places.js =====
// 渲染模块：scenes_places

// ============================================================
// 江堤
// ============================================================
export function drawRiverside(ctx, W2S, scene, gameTime, game) {
  const sky = ctx.createLinearGradient(0, 0, 0, W2S(0, 380).y);
  sky.addColorStop(0, '#1a1418');
  sky.addColorStop(0.5, '#3a2818');
  sky.addColorStop(1, '#5a3a20');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 落日
  const sunS = W2S(1000, 320);
  if (sunS.y > -50 && sunS.y < H + 50) {
    const sunGrad = ctx.createRadialGradient(sunS.x, sunS.y, 0, sunS.x, sunS.y, 60);
    sunGrad.addColorStop(0, 'rgba(255,200,120,0.9)');
    sunGrad.addColorStop(0.5, 'rgba(255,160,80,0.4)');
    sunGrad.addColorStop(1, 'rgba(255,100,40,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunS.x, sunS.y, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,0.9)';
    ctx.beginPath();
    ctx.arc(sunS.x, sunS.y, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // 对岸
  for (const b of scene.props.filter((p) => p.name === '对岸高楼')) {
    const s = W2S(b.x, b.y);
    ctx.fillStyle = 'rgba(15,10,8,0.85)';
    ctx.fillRect(s.x, s.y, b.w, b.h);
    if (b.h > 200) {
      ctx.fillRect(s.x + b.w * 0.5 - 1, s.y - 12, 2, 12);
      const blink = Math.sin(gameTime * 0.005) > 0;
      ctx.fillStyle = blink ? 'rgba(220,40,40,0.9)' : 'rgba(120,20,20,0.6)';
      ctx.beginPath();
      ctx.arc(s.x + b.w * 0.5, s.y - 14, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let wy = s.y + 12; wy < s.y + b.h - 8; wy += 18) {
      for (let wx = s.x + 8; wx < s.x + b.w - 6; wx += 16) {
        const seed = (wx * 31 + wy * 17) % 100;
        if (seed < 4) {
          ctx.fillStyle = 'rgba(255,180,80,0.6)';
          ctx.fillRect(wx, wy, 4, 5);
        }
      }
    }
  }

  // 黄浦江
  const waterTop = W2S(0, 420).y;
  const waterBottom = W2S(0, 800).y;
  const waterH = waterBottom - waterTop;
  const riverGrad = ctx.createLinearGradient(0, waterTop, 0, waterBottom);
  riverGrad.addColorStop(0, '#3a3024');
  riverGrad.addColorStop(0.4, '#2a2820');
  riverGrad.addColorStop(1, '#1a1814');
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, waterTop, W, waterH);

  if (sunS.y > -50 && sunS.y < H + 50) {
    const reflectGrad = ctx.createLinearGradient(0, waterTop, 0, waterTop + 200);
    reflectGrad.addColorStop(0, 'rgba(255,200,120,0.4)');
    reflectGrad.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = reflectGrad;
    ctx.fillRect(sunS.x - 60, waterTop, 120, 200);
  }

  ctx.strokeStyle = 'rgba(200,180,140,0.25)';
  ctx.lineWidth = 1;
  const t = gameTime * 0.04;
  for (let y = waterTop + 8; y < waterBottom; y += 18) {
    ctx.beginPath();
    let started = false;
    for (let x = 0; x < W; x += 6) {
      const waveY = y + Math.sin((x + t * 20) * 0.04 + y * 0.1) * 3;
      if (!started) {
        ctx.moveTo(x, waveY);
        started = true;
      } else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const lx = ((i * 271 - gameTime * 0.02) % (W + 100)) - 50;
    const ly = waterTop + 30 + ((i * 31) % (waterH - 60));
    ctx.fillStyle = 'rgba(50,40,30,0.5)';
    ctx.fillRect(lx, ly, 4 + (i % 3), 2);
  }

  // 步道
  const walkY = W2S(0, 800).y;
  ctx.fillStyle = '#4a4540';
  ctx.fillRect(0, walkY, W, H - walkY);
  ctx.strokeStyle = 'rgba(30,28,25,0.5)';
  ctx.lineWidth = 1;
  for (let y = walkY + 8; y < H; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // 栏杆
  const railY = walkY - 4;
  ctx.fillStyle = '#2a2520';
  ctx.fillRect(0, railY - 16, W, 4);
  for (let x = 0; x < W; x += 40) {
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(x, railY - 18, 4, 22);
    ctx.fillStyle = '#1a1815';
    ctx.fillRect(x + 3, railY - 18, 1, 22);
  }
  ctx.fillStyle = '#3a3530';
  ctx.fillRect(0, railY - 14, W, 2);
  ctx.fillStyle = '#4a4540';
  ctx.fillRect(0, railY - 8, W, 2);

  // 芦苇（固定世界坐标，人物移动时保持静止）
  for (let i = 0; i < 60; i++) {
    const wx = (i * 47 + 13) % scene.width;
    const wy = 810 + ((i * 13) % 80);
    const p = W2S(wx, wy);
    if (p.x < -20 || p.x > W + 20) continue;
    const bx = p.x,
      by = p.y;
    const sway = Math.sin(gameTime * 0.002 + i) * 3;
    ctx.strokeStyle = '#6a6a30';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + sway * 0.5, by - 14, bx + sway, by - 30);
    ctx.stroke();
    ctx.fillStyle = '#8a7a40';
    ctx.beginPath();
    ctx.ellipse(bx + sway, by - 32, 2.5, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a09050';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  for (let i = 0; i < 20; i++) {
    const wx = (i * 113 + 7) % scene.width;
    const wy = 796 + ((i * 7) % 12);
    const p = W2S(wx, wy);
    if (p.x < -15 || p.x > W + 15) continue;
    const bx = p.x,
      by = p.y;
    const sway = Math.sin(gameTime * 0.002 + i + 1) * 2;
    ctx.strokeStyle = '#5a5028';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + sway * 0.5, by - 10, bx + sway, by - 20);
    ctx.stroke();
  }

  drawShuyuan(ctx, W2S, gameTime);

  // 守砚位置标记光柱（如果还没遇见过）
  if (game.flags && !game.flags.met_shuyuan) {
    const markS = W2S(400, 900);
    if (markS.y > -100 && markS.y < H + 100) {
      const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;
      const grad = ctx.createLinearGradient(0, markS.y - 50, 0, markS.y + 20);
      grad.addColorStop(0, `rgba(255,220,140,0)`);
      grad.addColorStop(0.5, `rgba(255,220,140,${pulse * 0.2})`);
      grad.addColorStop(1, `rgba(255,220,140,0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(markS.x - 30, markS.y - 50, 60, 70);
      ctx.fillStyle = `rgba(255,220,140,${0.6 + pulse * 0.3})`;
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.fillText('? 老人', markS.x, markS.y - 35);
      ctx.textAlign = 'left';
    }
  }
}

// ============================================================
// 地铁站（地下）
// ============================================================
export function drawSubway(ctx, W2S, scene, gameTime, game) {
  // 底色：深蓝黑
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  // 月台地面（深灰瓷砖）
  const tileY = W2S(0, 0).y;
  ctx.fillStyle = '#1a1a20';
  ctx.fillRect(0, 0, W, W2S(0, 600).y - tileY);
  // 瓷砖缝
  ctx.strokeStyle = '#0a0a10';
  ctx.lineWidth = 1;
  for (let y = tileY; y < W2S(0, 600).y; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = ((W2S(0, 0).x % 40) + 40) % 40; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, tileY);
    ctx.lineTo(x, W2S(0, 600).y);
    ctx.stroke();
  }

  // 月台边缘（黄色警示线）
  const edgeY = W2S(0, 580).y;
  ctx.fillStyle = '#3a3520';
  ctx.fillRect(0, edgeY, W, 20);
  ctx.fillStyle = 'rgba(200,170,60,0.4)';
  for (let x = 0; x < W; x += 30) {
    ctx.fillRect(x, edgeY + 6, 18, 4);
  }

  // 隧道（轨道区域，黑色深渊）
  const trackY = W2S(0, 600).y;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, trackY, W, H - trackY);
  // 轨道
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 2;
  for (const off of [20, 60]) {
    const ry = trackY + off;
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(W, ry);
    ctx.stroke();
  }
  // 枕木
  ctx.fillStyle = '#1a1410';
  for (let x = ((W2S(0, 0).x % 50) + 50) % 50; x < W; x += 50) {
    ctx.fillRect(x, trackY + 10, 30, 50);
  }

  // 天花板灯管（昏暗、闪烁）
  for (let i = 0; i < 5; i++) {
    const lx = 140 + i * 280;
    const ly = 40;
    const s = W2S(lx, ly);
    const flicker = Math.sin(gameTime * 0.008 + i * 1.7) * 0.4;
    const broken = i === 2 && Math.sin(gameTime * 0.015) > 0.5;
    const a = broken ? 0.1 : 0.35 + flicker * 0.3;
    ctx.fillStyle = `rgba(120,140,180,${a})`;
    ctx.fillRect(s.x - 40, s.y, 80, 4);
    // 投射光
    const grad = ctx.createLinearGradient(0, s.y, 0, s.y + 280);
    grad.addColorStop(0, `rgba(120,140,180,${a * 0.15})`);
    grad.addColorStop(1, 'rgba(120,140,180,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(s.x - 50, s.y + 4, 100, 280);
  }

  // 立柱
  for (const p of scene.walls.filter((w) => w.name === '立柱')) {
    const s = W2S(p.x + p.w / 2, p.y + p.h / 2);
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(s.x - p.w / 2, s.y - p.h / 2, p.w, p.h);
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(s.x - p.w / 2, s.y - p.h / 2, p.w, 4);
    ctx.strokeStyle = '#0a0a0e';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - p.w / 2, s.y - p.h / 2, p.w, p.h);
    // 立柱阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(s.x - p.w / 2 + 2, s.y - p.h / 2 + 4, p.w - 2, p.h - 4);
  }

  // 废弃列车车厢
  for (const car of scene.props.filter((p) => p.name === '列车车厢')) {
    const s = W2S(car.x + car.w / 2, car.y + car.h / 2);
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + car.h / 2 + 4, car.w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 车身
    ctx.fillStyle = '#3a4a5a';
    roundRect(ctx, s.x - car.w / 2, s.y - car.h / 2, car.w, car.h, 6);
    ctx.fill();
    // 车顶
    ctx.fillStyle = '#2a3a4a';
    roundRect(ctx, s.x - car.w / 2 + 4, s.y - car.h / 2 - 6, car.w - 8, 8, 4);
    ctx.fill();
    // 车窗（破碎）
    ctx.fillStyle = '#0a0a10';
    for (let wx = s.x - car.w / 2 + 10; wx < s.x + car.w / 2 - 10; wx += 30) {
      ctx.fillRect(wx, s.y - car.h / 2 + 8, 22, 18);
    }
    // 裂纹
    ctx.strokeStyle = 'rgba(180,200,220,0.3)';
    ctx.lineWidth = 0.5;
    for (let wx = s.x - car.w / 2 + 12; wx < s.x + car.w / 2 - 12; wx += 30) {
      ctx.beginPath();
      ctx.moveTo(wx, s.y - car.h / 2 + 10);
      ctx.lineTo(wx + 8, s.y - car.h / 2 + 22);
      ctx.stroke();
    }
    // 车门
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(s.x - 8, s.y - car.h / 2 + 30, 16, car.h - 35);
    // 边框
    ctx.strokeStyle = '#1a2028';
    ctx.lineWidth = 1.5;
    roundRect(ctx, s.x - car.w / 2, s.y - car.h / 2, car.w, car.h, 6);
    ctx.stroke();
    // 锈迹
    ctx.fillStyle = 'rgba(140,80,40,0.3)';
    ctx.beginPath();
    ctx.ellipse(s.x - car.w / 4, s.y, 10, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 隧道深处的绿色微光
  const deepS = W2S(1300, 800);
  if (deepS.x > -100 && deepS.x < W + 100) {
    const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;
    const grad = ctx.createRadialGradient(deepS.x, deepS.y, 0, deepS.x, deepS.y, 120);
    grad.addColorStop(0, `rgba(80,220,100,${pulse * 0.25})`);
    grad.addColorStop(1, 'rgba(80,220,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(deepS.x - 120, deepS.y - 120, 240, 240);
  }

  // 出口标记（地面方向）
  const exitS = W2S(100, 100);
  if (exitS.y > -100 && exitS.y < H + 100) {
    const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;
    const grad = ctx.createLinearGradient(0, exitS.y - 50, 0, exitS.y + 20);
    grad.addColorStop(0, `rgba(255,220,140,0)`);
    grad.addColorStop(0.5, `rgba(255,220,140,${pulse * 0.2})`);
    grad.addColorStop(1, `rgba(255,220,140,0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(exitS.x - 30, exitS.y - 50, 60, 70);
    ctx.fillStyle = `rgba(255,220,140,${0.6 + pulse * 0.3})`;
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('↑ 地面', exitS.x, exitS.y - 35);
    ctx.textAlign = 'left';
  }
}

// ============================================================
// 废墟居民区
// ============================================================
export function drawAlley(ctx, W2S, scene, gameTime, game) {
  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#1a1410');
  sky.addColorStop(1, '#2a2218');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 远景高楼
  for (const b of scene.props.filter((p) => p.name === '高楼')) {
    const s = W2S(b.x, b.y);
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(s.x, s.y, b.w, b.h);
    ctx.fillStyle = '#2a2620';
    ctx.fillRect(s.x + b.w * 0.7, s.y, b.w * 0.3, b.h);
    for (let wy = s.y + 12; wy < s.y + b.h - 8; wy += 18) {
      for (let wx = s.x + 6; wx < s.x + b.w - 6; wx += 14) {
        if ((wx * 31 + wy * 17) % 100 < 4) {
          ctx.fillStyle = 'rgba(180,140,60,0.4)';
          ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }
  }

  // 地面（泥土 + 碎石）
  const groundY = W2S(0, 380).y;
  ctx.fillStyle = '#2a2218';
  ctx.fillRect(0, Math.max(0, groundY), W, H);
  // 碎石纹理（固定世界坐标，人物移动时保持静止）
  ctx.fillStyle = 'rgba(60,50,40,0.5)';
  for (let i = 0; i < 80; i++) {
    const wx = (i * 67 + 11) % scene.width;
    const wy = 384 + ((i * 23) % (scene.height - 384));
    const p = W2S(wx, wy);
    if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // 民居建筑
  for (const b of scene.props.filter((p) => p.name && p.name.includes('民居'))) {
    const s = W2S(b.x, b.y);
    // 屋顶
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(s.x, s.y, b.w, 10);
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(s.x, s.y + 8, b.w, 2);
    // 墙体
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(s.x + 4, s.y + 10, b.w - 8, b.h - 10);
    // 窗户
    ctx.fillStyle = '#1a0a00';
    for (let wx = s.x + 14; wx < s.x + b.w - 14; wx += 30) {
      ctx.fillRect(wx, s.y + 20, 14, 16);
    }
    // 门（暖光）
    ctx.fillStyle = 'rgba(200,160,80,0.15)';
    ctx.fillRect(s.x + b.w / 2 - 12, s.y + b.h - 20, 24, 20);
    // 边框
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x, s.y, b.w, b.h);
  }

  // 碎石堆
  for (const r of scene.props.filter((p) => p.name === '碎石堆')) {
    drawRubble(ctx, W2S, r);
  }

  // 废弃花坛
  const planter = scene.props.find((p) => p.name === '废弃花坛');
  if (planter) {
    const s = W2S(planter.x, planter.y);
    ctx.fillStyle = '#3a3020';
    ctx.fillRect(s.x, s.y, planter.w, planter.h);
    ctx.strokeStyle = '#1a1410';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x, s.y, planter.w, planter.h);
    // 枯草
    ctx.strokeStyle = '#5a5028';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const gx = s.x + 5 + ((i * 9) % (planter.w - 10));
      const gy = s.y + 5 + ((i * 7) % (planter.h - 10));
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 2, gy - 8);
      ctx.stroke();
    }
  }

  // 窄巷墙壁
  for (const w of scene.walls.filter((w) => !w.name)) continue;
  ctx.strokeStyle = '#3a3028';
  ctx.lineWidth = 3;
  for (const w of scene.walls.filter((w) => w.w === 6 && w.h > 100)) {
    const s = W2S(w.x, w.y);
    ctx.fillStyle = '#3a3028';
    ctx.fillRect(s.x, s.y, 6, w.h);
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(s.x, s.y, 2, w.h);
  }
}

// ============================================================
// 室内民居
// ============================================================
export function drawHouse(ctx, W2S, scene, gameTime, game) {
  // 木地板
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(0, 0, W, H);
  // 地板缝
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 1;
  for (let y = 40; y < H; y += 30) {
    const sy = y - (W2S(0, 0).y % 30);
    if (sy > 0 && sy < H) {
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(W, sy);
      ctx.stroke();
    }
  }

  // 墙壁
  for (const wall of scene.walls) {
    const s = W2S(wall.x, wall.y);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(s.x, s.y, wall.w, wall.h);
  }

  // 桌子
  for (const t of scene.props.filter((p) => p.name === '桌子')) {
    const s = W2S(t.x, t.y);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(s.x, s.y, t.w, t.h);
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(s.x, s.y, t.w, 4);
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x, s.y, t.w, t.h);
  }

  // 旧收音机
  for (const r of scene.props.filter((p) => p.name === '收音机')) {
    const s = W2S(r.x, r.y);
    ctx.fillStyle = '#1b1712';
    ctx.fillRect(s.x, s.y, r.w, r.h);
    ctx.strokeStyle = '#6f5a38';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x, s.y, r.w, r.h);
    ctx.fillStyle = '#6f5a38';
    ctx.fillRect(s.x + 5, s.y + 5, 12, 8);
    ctx.beginPath();
    ctx.arc(s.x + r.w - 7, s.y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    const pulse = 0.4 + Math.sin(gameTime * 0.006) * 0.25;
    ctx.strokeStyle = `rgba(255,220,120,${pulse})`;
    ctx.beginPath();
    ctx.moveTo(s.x + 8, s.y - 2);
    ctx.lineTo(s.x + 24, s.y - 14);
    ctx.stroke();
  }

  // 书架
  for (const b of scene.props.filter((p) => p.name === '书架')) {
    const s = W2S(b.x, b.y);
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(s.x, s.y, b.w, b.h);
    // 隔层
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + i * (b.h / 4));
      ctx.lineTo(s.x + b.w, s.y + i * (b.h / 4));
      ctx.stroke();
    }
    // 书
    const colors = ['#5a3a2a', '#4a3a4a', '#3a4a3a', '#5a4a3a'];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if ((row * 4 + col) % 3 === 0) continue;
        ctx.fillStyle = colors[(row + col) % 4];
        ctx.fillRect(s.x + 4 + col * 18, s.y + row * (b.h / 4) + 2, 14, b.h / 4 - 4);
      }
    }
  }

  // 出口标记
  const exitS = W2S(240, 360);
  if (exitS.y > -50 && exitS.y < H + 50) {
    const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;
    ctx.fillStyle = `rgba(255,220,140,${pulse * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(exitS.x, exitS.y, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// 体育馆茧房
// ============================================================
export function drawStadium(ctx, W2S, scene, gameTime, game) {
  // 深色背景
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  // 地面
  ctx.fillStyle = '#12121a';
  ctx.fillRect(0, 0, W, H);

  // 屏幕墙（发光）
  for (const p of scene.props.filter((p) => p.name === '屏幕墙')) {
    const s = W2S(p.x, p.y);
    const pulse = 0.4 + Math.sin(gameTime * 0.005 + p.x * 0.01) * 0.3;
    // 光晕
    ctx.shadowColor = `rgba(120,180,255,${pulse * 0.6})`;
    ctx.shadowBlur = 15;
    ctx.fillStyle = `rgba(80,120,200,${pulse * 0.3})`;
    ctx.fillRect(s.x, s.y, p.w, p.h);
    ctx.shadowBlur = 0;
    // 屏幕内容（噪点）
    ctx.fillStyle = `rgba(180,200,255,${pulse * 0.5})`;
    for (let i = 0; i < 8; i++) {
      const nx = s.x + ((i * 23) % p.w);
      const ny = s.y + ((i * 17) % p.h);
      ctx.fillRect(nx, ny, 2, 2);
    }
    // 边框
    ctx.strokeStyle = `rgba(100,160,220,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x, s.y, p.w, p.h);
  }
}

// ============================================================
// 数据中心深渊
// ============================================================
export function drawDataCenter(ctx, W2S, scene, gameTime, game) {
  // 纯黑
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // 深渊（两侧）
  for (const p of scene.props.filter((p) => p.name === '深渊')) {
    const s = W2S(p.x, p.y);
    // 旋转的虚无
    const t = gameTime * 0.001;
    for (let i = 0; i < 20; i++) {
      const a = t + i * 0.3;
      const r = 30 + i * 8;
      const cx = s.x + p.w / 2 + Math.cos(a) * r;
      const cy = s.y + p.h / 2 + Math.sin(a) * r * 0.3;
      ctx.fillStyle = `rgba(40,40,80,${0.1 - i * 0.003})`;
      if (cy > 0 && cy < H && cx > 0 && cx < W) {
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 石桥
  const bridgeX = W2S(506, 0).x;
  const bridgeEndX = W2S(900, 0).x;
  if (bridgeEndX > 0 && bridgeX < W) {
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(bridgeX, 0, bridgeEndX - bridgeX, H);
    // 桥面纹理
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(bridgeX, y);
      ctx.lineTo(bridgeEndX, y);
      ctx.stroke();
    }
    // 桥两侧边缘
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(bridgeX - 2, 0, 2, H);
    ctx.fillRect(bridgeEndX, 0, 2, H);
  }

  // Sydney（蓝色光影）
  const tyS = W2S(700, 700);
  if (tyS.y > -100 && tyS.y < H + 100) {
    const pulse = 0.5 + Math.sin(gameTime * 0.003) * 0.3;
    // 光晕
    const grad = ctx.createRadialGradient(tyS.x, tyS.y, 0, tyS.x, tyS.y, 80);
    grad.addColorStop(0, `rgba(120,180,255,${pulse * 0.4})`);
    grad.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(tyS.x - 80, tyS.y - 80, 160, 160);
    // 人形轮廓
    ctx.fillStyle = `rgba(150,200,255,${pulse * 0.6})`;
    // 头
    ctx.beginPath();
    ctx.arc(tyS.x, tyS.y - 16, 6, 0, Math.PI * 2);
    ctx.fill();
    // 身体
    ctx.beginPath();
    ctx.moveTo(tyS.x - 8, tyS.y - 8);
    ctx.lineTo(tyS.x - 10, tyS.y + 12);
    ctx.lineTo(tyS.x + 10, tyS.y + 12);
    ctx.lineTo(tyS.x + 8, tyS.y - 8);
    ctx.closePath();
    ctx.fill();
    // 标签
    ctx.fillStyle = `rgba(150,200,255,${0.7 + pulse * 0.3})`;
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('? Sydney', tyS.x, tyS.y - 30);
    ctx.textAlign = 'left';
  }
}

// ============================================================
export function drawShuyuan(ctx, W2S, gameTime) {
  const s = W2S(400, 900);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 4, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5a7888';
  ctx.beginPath();
  ctx.moveTo(s.x - 10, s.y - 6);
  ctx.lineTo(s.x - 14, s.y + 8);
  ctx.lineTo(s.x + 14, s.y + 8);
  ctx.lineTo(s.x + 10, s.y - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4a6878';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - 6);
  ctx.lineTo(s.x, s.y + 8);
  ctx.stroke();

  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath();
  ctx.arc(s.x, s.y - 13, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#888880';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(100,90,80,0.5)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(s.x - 4, s.y - 13);
  ctx.lineTo(s.x - 2, s.y - 9);
  ctx.moveTo(s.x + 4, s.y - 13);
  ctx.lineTo(s.x + 2, s.y - 9);
  ctx.stroke();
  ctx.strokeStyle = '#3a3530';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x - 3, s.y - 14);
  ctx.lineTo(s.x - 1, s.y - 14);
  ctx.moveTo(s.x + 1, s.y - 14);
  ctx.lineTo(s.x + 3, s.y - 14);
  ctx.stroke();

  ctx.fillStyle = 'rgba(220,220,210,0.7)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y - 9, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#5a7888';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s.x - 8, s.y - 2);
  ctx.lineTo(s.x - 12, s.y + 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s.x + 8, s.y - 2);
  ctx.lineTo(s.x + 14, s.y - 4);
  ctx.stroke();

  const paperX = s.x + 14,
    paperY = s.y - 4;
  const pulse = 0.6 + Math.sin(gameTime * 0.005) * 0.3;
  ctx.shadowColor = `rgba(255,220,140,${pulse})`;
  ctx.shadowBlur = 8 * pulse;
  ctx.fillStyle = `rgba(255,240,200,${0.85 * pulse})`;
  ctx.fillRect(paperX - 3, paperY - 5, 6, 8);
  ctx.strokeStyle = '#806020';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(paperX - 3, paperY - 5, 6, 8);
  ctx.fillStyle = 'rgba(80,40,20,0.8)';
  ctx.font = '5px serif';
  ctx.textAlign = 'center';
  ctx.fillText('雎', paperX, paperY - 1);
  ctx.textAlign = 'left';
  ctx.shadowBlur = 0;
}

// ============================================================
// 通用场景渲染（第五章新场景：废图书馆/网络中枢/记忆深渊/失语者聚居地）
// 绘制背景/墙壁/props/道具等基础元素，无场景专属装饰
// ============================================================
export function drawGenericScene(ctx, W2S, scene, gameTime, game) {
  // 背景渐变（基于场景 bgColor）
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, scene.bgColor || '#0a0a0e');
  bgGrad.addColorStop(1, '#000');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 氛围光斑（基于场景 atmosphere）
  if (scene.atmosphere && scene.atmosphere.tint) {
    ctx.fillStyle = scene.atmosphere.tint;
    ctx.fillRect(0, 0, W, H);
  }

  // 墙壁
  ctx.fillStyle = 'rgba(50,48,44,0.85)';
  for (const w of scene.walls) {
    const s = W2S(w.x, w.y);
    ctx.fillRect(s.x, s.y, w.w, w.h);
  }
  ctx.strokeStyle = 'rgba(100,90,70,0.4)';
  ctx.lineWidth = 1;
  for (const w of scene.walls) {
    const s = W2S(w.x, w.y);
    ctx.strokeRect(s.x, s.y, w.w, w.h);
  }

  // Props（带 collidable 的画实心，否则画半透明轮廓）
  for (const p of scene.props) {
    const s = W2S(p.x, p.y);
    if (s.x + p.w < -50 || s.x > W + 50) continue;
    if (s.y + p.h < -50 || s.y > H + 50) continue;
    if (p.collidable) {
      ctx.fillStyle = 'rgba(60,55,48,0.8)';
      ctx.fillRect(s.x, s.y, p.w, p.h);
      ctx.strokeStyle = 'rgba(120,100,70,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x, s.y, p.w, p.h);
    } else {
      // 装饰性 prop：半透明
      ctx.fillStyle = 'rgba(80,75,65,0.3)';
      ctx.fillRect(s.x, s.y, p.w, p.h);
    }
    // 名称标签（小字）
    if (p.name && Math.hypot(s.x - W / 2, s.y - H / 2) < 400) {
      ctx.fillStyle = 'rgba(200,180,140,0.4)';
      ctx.font = '9px serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, s.x + p.w / 2, s.y - 4);
      ctx.textAlign = 'left';
    }
  }

  // 场景专属氛围
  if (scene.id === 'network_nexus') {
    // 网络中枢：数据流光柱
    ctx.fillStyle = 'rgba(80,130,230,0.06)';
    for (let i = 0; i < 5; i++) {
      const x = 200 + i * 320;
      const s = W2S(x, 0);
      ctx.fillRect(s.x, 0, 60, H);
    }
  } else if (scene.id === 'memory_abyss') {
    // 记忆深渊：飘浮光点
    for (let i = 0; i < 30; i++) {
      const wx = (i * 137 + 50) % scene.width;
      const wy = ((i * 89 + 30) % scene.height) + Math.sin(gameTime * 0.001 + i) * 10;
      const s = W2S(wx, wy);
      const pulse = 0.3 + Math.sin(gameTime * 0.003 + i * 2) * 0.3;
      ctx.fillStyle = `rgba(150,180,255,${pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (scene.id === 'ruined_library') {
    // 废图书馆：书页飘落
    for (let i = 0; i < 12; i++) {
      const wx = (i * 173 + 80) % scene.width;
      const wy = (i * 97 + gameTime * 0.02) % scene.height;
      const s = W2S(wx, wy);
      ctx.fillStyle = 'rgba(200,180,120,0.15)';
      ctx.fillRect(s.x, s.y, 8, 10);
    }
  }
}
