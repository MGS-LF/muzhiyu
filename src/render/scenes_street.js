// 渲染模块：scenes_street
import { W, H } from '../config.js';
import { roundRect } from './util.js';

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
  for (const b of scene.props.filter(p => p.name === '高楼')) {
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
    const wy = 430 + (i * 23) % 100;
    const p = W2S(wx, wy);
    if (p.x < -40 || p.x > W + 40) continue;
    let cx = p.x, cy = p.y;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += 8 + (i + s) % 6;
      cy += 4 + (i * 3 + s) % 7;
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
    const wy = 424 + (i * 11) % 8;
    const p = W2S(wx, wy);
    if (p.x < -20 || p.x > W + 20) continue;
    const gx = p.x, gy = p.y;
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
    const wy = 424 + (i * 19) % 108;
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
  const subway = scene.props.find(p => p.name === '地铁站入口');
  if (subway) {
    const s = W2S(subway.x + subway.w/2, subway.y + subway.h/2);
    ctx.fillStyle = '#5a5550';
    ctx.fillRect(s.x - subway.w/2, s.y - subway.h/2, subway.w, subway.h);
    ctx.fillStyle = '#6a655e';
    ctx.fillRect(s.x - subway.w/2, s.y - subway.h/2, subway.w, 8);
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
    ctx.fillRect(s.x - 30, s.y - subway.h/2 - 18, 60, 14);
    ctx.fillStyle = 'rgba(220,200,140,0.9)';
    ctx.font = '9px serif';
    ctx.textAlign = 'center';
    ctx.fillText('METRO', s.x, s.y - subway.h/2 - 8);
    ctx.textAlign = 'left';
  }

  // 废弃车辆
  for (const car of scene.props.filter(p => p.name === '废弃车辆')) {
    drawAbandonedCar(ctx, W2S, car, gameTime);
  }

  // 碎石堆
  for (const rubble of scene.props.filter(p => p.name === '碎石堆')) {
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
  const s = W2S(car.x + car.w/2, car.y + car.h/2);
  const w = car.w, h = car.h;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + h/2 + 4, w * 0.7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a2a';
  roundRect(ctx, s.x - w/2, s.y - h/2, w, h, 3);
  ctx.fill();
  ctx.fillStyle = '#3a2018';
  roundRect(ctx, s.x - w/2 + 6, s.y - h/2 - 6, w - 12, 8, 3);
  ctx.fill();
  ctx.fillStyle = '#1a1a1c';
  ctx.fillRect(s.x - w/2 + 4, s.y - h/2 - 4, w - 8, 6);
  ctx.strokeStyle = 'rgba(200,200,200,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(s.x - w/2 + 6, s.y - h/2 - 4);
  ctx.lineTo(s.x, s.y - h/2 + 2);
  ctx.lineTo(s.x + 6, s.y - h/2 - 3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(140,60,30,0.4)';
  ctx.beginPath();
  ctx.ellipse(s.x - w/4, s.y + h/4, 8, 4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s.x + w/4, s.y - h/4, 6, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a0e08';
  ctx.lineWidth = 1;
  roundRect(ctx, s.x - w/2, s.y - h/2, w, h, 3);
  ctx.stroke();
  roundRect(ctx, s.x - w/2 + 6, s.y - h/2 - 6, w - 12, 8, 3);
  ctx.stroke();
  ctx.fillStyle = '#0a0a0a';
  for (const off of [-w/2 + 6, w/2 - 6]) {
    ctx.beginPath();
    ctx.arc(s.x + off, s.y + h/2 + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(s.x + off, s.y + h/2 + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
  }
}

export function drawRubble(ctx, W2S, rubble) {
  const s = W2S(rubble.x + rubble.w/2, rubble.y + rubble.h/2);
  ctx.fillStyle = '#4a4540';
  ctx.beginPath();
  ctx.moveTo(s.x - rubble.w/2, s.y + rubble.h/2);
  ctx.lineTo(s.x - rubble.w/2 + 5, s.y - 5);
  ctx.lineTo(s.x - rubble.w/4, s.y - rubble.h/3);
  ctx.lineTo(s.x + rubble.w/6, s.y - rubble.h/2);
  ctx.lineTo(s.x + rubble.w/3, s.y - rubble.h/4);
  ctx.lineTo(s.x + rubble.w/2 - 5, s.y - 3);
  ctx.lineTo(s.x + rubble.w/2, s.y + rubble.h/2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1816';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const rx = s.x - rubble.w/2 + 8 + i * 11;
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

export function drawGengGhost(ctx, x, y, gameTime, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const t = gameTime * 0.005;
  const float = Math.sin(t) * 4;
  y += float;

  ctx.shadowColor = 'rgba(80,220,100,0.8)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(80,220,100,0.12)';
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 26, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(80,220,100,0.35)';
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 16);
  ctx.lineTo(x - 18, y + 18);
  ctx.lineTo(x + 18, y + 18);
  ctx.lineTo(x + 4, y - 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,255,140,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(80,220,100,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y - 22, 16, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,255,140,0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(20,40,20,0.85)';
  ctx.beginPath();
  ctx.ellipse(x, y - 18, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,255,220,0.8)';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 3 - 1, y - 21);
    ctx.lineTo(x + i * 3, y - 17);
    ctx.lineTo(x + i * 3 + 1, y - 21);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = `rgba(120,255,140,${0.4 + Math.sin(t * 3) * 0.2})`;
  ctx.font = '8px serif';
  ctx.textAlign = 'center';
  ctx.fillText('YYDS', x - 22, y - 8);
  ctx.fillText('绝绝子', x + 24, y - 14);
  ctx.fillText('蚌', x, y + 30);
  ctx.textAlign = 'left';

  ctx.restore();
}

export function drawKeystones(ctx, W2S, scene, activated, gameTime) {
  for (const it of scene.interactables.filter(i => i.type === 'keystone')) {
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
