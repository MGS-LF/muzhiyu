// 渲染模块：scenes_places
import { W, H } from '../config.js';
import { roundRect } from './util.js';
import { drawRubble } from './scenes_street.js';

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
