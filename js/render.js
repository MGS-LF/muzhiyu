// 渲染器 — 线条画风，矢量清晰
import { COLORS, W, H } from './config.js';

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.smooth = 0.15;
  }
  follow(px, py) {
    this.x += (px - W/2 - this.x) * this.smooth;
    this.y += (py - H/2 - this.y) * this.smooth;
  }
  snap(px, py, sceneW, sceneH) {
    this.x = px - W/2;
    this.y = py - H/2;
    this.clamp(sceneW, sceneH);
  }
  clamp(sceneW, sceneH) {
    this.x = Math.max(-200, Math.min(this.x, sceneW - W + 200));
    this.y = Math.max(-200, Math.min(this.y, sceneH - H + 200));
  }
  worldToScreen(x, y) { return { x: x - this.x, y: y - this.y }; }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ============================================================
// 主渲染函数
// ============================================================
export function render(game, gameTime) {
  const { ctx, camera, scene, player, dialogState, hints } = game;
  ctx.clearRect(0, 0, W, H);

  // 背景
  ctx.fillStyle = scene.bgColor;
  ctx.fillRect(0, 0, W, H);

  // 相机跟随
  camera.follow(player.x, player.y);
  camera.clamp(scene.width, scene.height);

  const W2S = (x, y) => camera.worldToScreen(x, y);

  // 按场景类型渲染
  if (scene.id === 'freeze_center') {
    drawFreezeCenter(ctx, W2S, scene, gameTime, game.collected);
  } else if (scene.id === 'street_01') {
    drawStreet(ctx, W2S, scene, gameTime);
    drawItems(ctx, W2S, scene, gameTime, game.collected);
  }

  // 互动提示
  drawInteractHints(ctx, W2S, scene, player, game.collected);

  // 玩家
  player.draw(ctx, camera);

  // 光照
  drawLighting(ctx, player, camera);

  // HUD
  drawHUD(ctx, player);

  // 对话
  if (dialogState) drawDialog(ctx, dialogState, gameTime);

  // 浮动提示
  if (hints.length) drawHints(ctx, hints);
}

// ============================================================
// 冷冻中心场景绘制
// ============================================================
function drawFreezeCenter(ctx, W2S, scene, gameTime, collected) {
  drawFloor(ctx, W2S, scene);
  drawRoomWalls(ctx, W2S, scene);
  drawCeilingLights(ctx, W2S, gameTime);
  drawPods(ctx, W2S, scene, gameTime);
  drawTerminalObj(ctx, W2S, scene, gameTime);
  drawLockerRoom(ctx, W2S);
  drawExitDoor(ctx, W2S, gameTime);
  drawItems(ctx, W2S, scene, gameTime, collected);
}

function drawFloor(ctx, W2S, scene) {
  ctx.strokeStyle = 'rgba(60,64,72,0.18)';
  ctx.lineWidth = 0.5;
  for (let y = 50; y < scene.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y - W2S(0,0).y);
    ctx.lineTo(W, y - W2S(0,0).y);
    ctx.stroke();
  }
  for (let x = 0; x < scene.width; x += 80) {
    const s = W2S(x, 0);
    ctx.beginPath();
    ctx.moveTo(s.x, -W2S(0,0).y);
    ctx.lineTo(s.x, scene.height - W2S(0,0).y);
    ctx.stroke();
  }
}

function drawRoomWalls(ctx, W2S, scene) {
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2.5;
  for (const wall of scene.walls) {
    const s = W2S(wall.x, wall.y);
    ctx.strokeRect(s.x, s.y, wall.w, wall.h);
  }
}

function drawCeilingLights(ctx, W2S, gameTime) {
  const flicker = Math.sin(gameTime * 0.007) * 0.3 + 0.5;
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 200;
    const y = 30;
    const s = W2S(x, y);
    ctx.strokeStyle = `rgba(200,220,240,${0.4 + flicker * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x - 50, s.y); ctx.lineTo(s.x + 50, s.y);
    ctx.stroke();
    ctx.strokeStyle = COLORS.faint;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(s.x - 50, s.y); ctx.lineTo(s.x - 55, s.y + 5);
    ctx.moveTo(s.x + 50, s.y); ctx.lineTo(s.x + 55, s.y + 5);
    ctx.stroke();
    ctx.fillStyle = `rgba(180,200,220,${0.04 + flicker * 0.06})`;
    ctx.fillRect(s.x - 60, s.y - 20, 120, 40);
  }
}

function drawPods(ctx, W2S, scene, gameTime) {
  for (const c of scene.props.filter(p => p.name && p.name.includes('冷冻仓'))) {
    const s = W2S(c.x + c.w/2, c.y + c.h/2);
    const isPlayer = c.isPlayerPod;
    const damaged = c.name === '冷冻仓 F';

    ctx.strokeStyle = damaged ? 'rgba(120,60,60,0.5)' : 'rgba(120,130,140,0.6)';
    ctx.lineWidth = 1.8;
    roundRect(ctx, s.x - c.w/2, s.y - c.h/2, c.w, c.h, 12);
    ctx.stroke();

    // 霜
    ctx.strokeStyle = 'rgba(160,180,200,0.2)';
    ctx.lineWidth = 0.4;
    for (let gy = s.y - c.h/2 + 10; gy < s.y + c.h/2 - 8; gy += 10) {
      const len = 15 + ((gy * 7) % 25);
      ctx.beginPath();
      ctx.moveTo(s.x - len/2, gy); ctx.lineTo(s.x + len/2, gy);
      ctx.stroke();
    }

    // 主角仓
    if (isPlayer) {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(s.x - 20, s.y - 10, 40, 30);
      ctx.strokeStyle = 'rgba(200,180,140,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - 20, s.y - 20);
      ctx.lineTo(s.x - 25, s.y - 35);
      ctx.lineTo(s.x + 25, s.y - 35);
      ctx.lineTo(s.x + 20, s.y - 20);
      ctx.stroke();
      drawStickFigureSimple(ctx, s.x, s.y + 15, 1, COLORS.frost, 0.3);
    }

    // 指示灯
    if (isPlayer) {
      const on = Math.sin(gameTime * 0.015) > -0.6;
      ctx.fillStyle = on ? 'rgba(80,220,140,0.9)' : 'rgba(80,220,140,0.15)';
      ctx.beginPath();
      ctx.arc(s.x + c.w/2 - 12, s.y - c.h/2 + 10, 3, 0, Math.PI * 2);
      ctx.fill();
      if (on) {
        ctx.fillStyle = 'rgba(80,220,140,0.15)';
        ctx.beginPath();
        ctx.arc(s.x + c.w/2 - 12, s.y - c.h/2 + 10, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(60,60,60,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.x + c.w/2 - 12, s.y - c.h/2 + 10, 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (damaged) {
      ctx.strokeStyle = 'rgba(120,60,60,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(s.x - 15, s.y - 10);
      ctx.lineTo(s.x - 5, s.y);
      ctx.lineTo(s.x - 12, s.y + 8);
      ctx.lineTo(s.x, s.y + 15);
      ctx.stroke();
    }
  }
}

function drawTerminalObj(ctx, W2S, scene, gameTime) {
  // 视觉用的终端机实体来自 props
  const it = scene.props.find(p => p.name === '终端机');
  if (!it) return;
  const s = W2S(it.x + it.w/2, it.y + it.h/2);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(s.x - it.w/2, s.y - it.h/2, it.w, it.h);
  const on = Math.sin(gameTime * 0.01) > -0.3;
  ctx.fillStyle = on ? 'rgba(80,180,160,0.08)' : 'rgba(30,40,40,0.3)';
  ctx.fillRect(s.x - it.w/2 + 6, s.y - it.h/2 + 4, it.w - 12, 18);
  ctx.strokeStyle = on ? 'rgba(100,200,180,0.6)' : 'rgba(50,80,80,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(s.x - it.w/2 + 6, s.y - it.h/2 + 4, it.w - 12, 18);
  if (on) {
    ctx.strokeStyle = 'rgba(120,220,200,0.3)';
    ctx.lineWidth = 0.5;
    for (let l = 0; l < 3; l++) {
      ctx.beginPath();
      ctx.moveTo(s.x - it.w/2 + 10, s.y - it.h/2 + 8 + l * 4);
      ctx.lineTo(s.x + it.w/2 - 10, s.y - it.h/2 + 8 + l * 4);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(80,80,90,0.6)';
  ctx.lineWidth = 0.4;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.strokeRect(s.x - 18 + c * 8, s.y + 4 + r * 6, 6, 4);
    }
  }
}

function drawLockerRoom(ctx, W2S) {
  const label = W2S(640, 380);
  ctx.fillStyle = 'rgba(140,140,150,0.5)';
  ctx.font = '10px serif';
  ctx.textAlign = 'center';
  ctx.fillText('更衣室', label.x + 40, label.y - 4);
  ctx.textAlign = 'left';

  for (let col = 0; col < 3; col++) {
    const lx = 720 + col * 18;
    const ly = 415;
    const s = W2S(lx, ly);
    ctx.strokeStyle = 'rgba(100,100,110,0.5)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(s.x, s.y, 15, 35);
    ctx.beginPath();
    ctx.moveTo(s.x + 10, s.y + 18);
    ctx.lineTo(s.x + 13, s.y + 18);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120,120,130,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(W2S(640, 495).x, W2S(640, 495).y);
  ctx.quadraticCurveTo(W2S(670, 502).x, W2S(670, 502).y, W2S(700, 495).x, W2S(700, 495).y);
  ctx.stroke();
  // 门洞标记
  const door = W2S(580, 480);
  ctx.strokeStyle = 'rgba(200,180,120,0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(door.x, door.y); ctx.lineTo(door.x, door.y + 30);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawExitDoor(ctx, W2S, gameTime) {
  const doorX = 270, doorY = 580, doorW = 210, doorH = 14;
  const s = W2S(doorX, doorY);
  const glowGrad = ctx.createLinearGradient(0, s.y, 0, s.y + 30);
  glowGrad.addColorStop(0, 'rgba(200,180,140,0.1)');
  glowGrad.addColorStop(1, 'rgba(80,60,40,0.4)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(s.x, s.y, doorW, 30);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - 2); ctx.lineTo(s.x + doorW, s.y - 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,140,150,0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(s.x + 5, s.y); ctx.lineTo(s.x + 5, s.y + 8);
  ctx.moveTo(s.x + doorW - 5, s.y); ctx.lineTo(s.x + doorW - 5, s.y + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s.x + 10, s.y + 4, 1.5, 0, Math.PI * 2);
  ctx.arc(s.x + doorW - 10, s.y + 4, 1.5, 0, Math.PI * 2);
  ctx.stroke();
  const glow = 0.05 + Math.sin(gameTime * 0.003) * 0.03;
  ctx.fillStyle = `rgba(200,180,140,${glow})`;
  ctx.fillRect(s.x + doorW/2 - 3, s.y + 2, 6, 8);
}

function drawItems(ctx, W2S, scene, gameTime, collected) {
  for (const it of scene.items) {
    if (collected && collected.has(it.id)) continue;
    const s = W2S(it.x, it.y);
    const bob = Math.sin(gameTime * 0.004 + it.x) * 1.5;
    ctx.strokeStyle = COLORS.warm;
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - 5, s.y + bob - 6, 10, 12);
    ctx.strokeStyle = 'rgba(140,110,60,0.6)';
    ctx.lineWidth = 0.4;
    for (let l = 0; l < 2; l++) {
      ctx.beginPath();
      ctx.moveTo(s.x - 3, s.y + bob - 2 + l * 4);
      ctx.lineTo(s.x + 3, s.y + bob - 2 + l * 4);
      ctx.stroke();
    }
  }
}

// ============================================================
// 街道场景绘制
// ============================================================
function drawStreet(ctx, W2S, scene, gameTime) {
  // 天空（渐变）
  const sky = ctx.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#2a2820');
  sky.addColorStop(1, '#1a1812');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 远景高楼
  for (const b of scene.props.filter(p => p.name === '高楼')) {
    const s = W2S(b.x, b.y);
    ctx.strokeStyle = 'rgba(80,80,90,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x, s.y, b.w, b.h);
    // 窗户
    ctx.strokeStyle = 'rgba(50,50,60,0.3)';
    ctx.lineWidth = 0.4;
    for (let wy = s.y + 10; wy < s.y + b.h - 10; wy += 18) {
      for (let wx = s.x + 8; wx < s.x + b.w - 8; wx += 14) {
        ctx.strokeRect(wx, wy, 8, 10);
      }
    }
    // 楼体裂缝
    ctx.strokeStyle = 'rgba(40,40,40,0.4)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(s.x + b.w * 0.3, s.y);
    ctx.lineTo(s.x + b.w * 0.4, s.y + b.h * 0.4);
    ctx.lineTo(s.x + b.w * 0.35, s.y + b.h);
    ctx.stroke();
  }

  // 地面（柏油路 + 裂缝 + 杂草）
  const groundY = W2S(0, 400).y;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, groundY, W, H - groundY);

  // 路面裂缝
  ctx.strokeStyle = 'rgba(40,40,40,0.5)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 20; i++) {
    const x = (i * 80 - W2S(0,0).x % 80) % W;
    const y1 = groundY + 50 + (i * 30) % 300;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x + 20, y1 + 30);
    ctx.lineTo(x + 10, y1 + 60);
    ctx.stroke();
  }

  // 杂草
  ctx.strokeStyle = 'rgba(60,80,40,0.5)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 60; i++) {
    const gx = (i * 27 - W2S(0,0).x % 27) % W;
    const gy = groundY + 50 + (i * 17) % 400;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + 3, gy - 6, gx + 6, gy - 12);
    ctx.stroke();
  }

  // 废弃车辆
  for (const car of scene.props.filter(p => p.name === '废弃车辆')) {
    const s = W2S(car.x, car.y);
    ctx.strokeStyle = 'rgba(100,60,60,0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x, s.y, car.w, car.h);
    // 车窗
    ctx.strokeStyle = 'rgba(40,40,40,0.6)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(s.x + 5, s.y - 8, car.w - 10, 8);
    // 轮子
    ctx.beginPath();
    ctx.arc(s.x + 10, s.y + car.h + 3, 4, 0, Math.PI * 2);
    ctx.arc(s.x + car.w - 10, s.y + car.h + 3, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 失语者群（简单的火柴人群）
  const lp = W2S(800, 700);
  if (lp.x > -100 && lp.x < W + 100) {
    for (let i = 0; i < 6; i++) {
      const px = lp.x + (i - 3) * 20;
      const py = lp.y + Math.sin(gameTime * 0.005 + i) * 2;
      ctx.strokeStyle = 'rgba(120,100,80,0.6)';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      // 头
      ctx.beginPath();
      ctx.arc(px, py - 8, 3, 0, Math.PI * 2);
      ctx.stroke();
      // 身体
      ctx.beginPath();
      ctx.moveTo(px, py - 5); ctx.lineTo(px, py + 5);
      ctx.stroke();
      // 蹲坐的腿
      ctx.beginPath();
      ctx.moveTo(px, py + 5); ctx.lineTo(px - 4, py + 10);
      ctx.moveTo(px, py + 5); ctx.lineTo(px + 4, py + 10);
      ctx.stroke();
    }
  }
}

// ============================================================
// 通用绘制函数
// ============================================================
function drawInteractHints(ctx, W2S, scene, player, collected) {
  for (const it of scene.interactables) {
    const d = Math.hypot(it.x - player.x, it.y - player.y);
    if (d > 50) continue;
    const s = W2S(it.x, it.y);
    ctx.fillStyle = 'rgba(200,200,210,0.7)';
    ctx.font = '11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 E · ' + it.label, s.x, s.y - 25);
    ctx.textAlign = 'left';
  }
  for (const it of scene.items) {
    if (collected && collected.has(it.id)) continue;
    if (Math.hypot(it.x - player.x, it.y - player.y) > 25) continue;
    const s = W2S(it.x, it.y);
    ctx.fillStyle = 'rgba(220,180,100,0.7)';
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 E 拾取', s.x, s.y - 12);
    ctx.textAlign = 'left';
  }
}

function drawLighting(ctx, player, camera) {
  const s = camera.worldToScreen(player.x, player.y);
  const r = 220;
  const grad = ctx.createRadialGradient(s.x, s.y, r * 0.4, s.x, s.y, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawHUD(ctx, player) {
  ctx.fillStyle = 'rgba(200,200,210,0.5)';
  ctx.font = '11px serif';
  ctx.fillText(`位置: ${Math.floor(player.x)}, ${Math.floor(player.y)}  衣服: ${player.hasClothes ? '已穿' : '无'}`, 10, 18);
}

function drawDialog(ctx, d, gameTime) {
  d.charTimer += 16;
  if (!d.done && d.charTimer > 25) {
    d.charTimer = 0;
    d.charIdx++;
    if (d.charIdx >= d.lines[d.idx].t.length) {
      d.charIdx = d.lines[d.idx].t.length;
      d.done = true;
    }
  }
  const line = d.lines[d.idx];
  const text = line.t.substring(0, d.charIdx);

  const boxX = 60, boxY = H - 150, boxW = W - 120, boxH = 110;
  ctx.fillStyle = 'rgba(10,8,5,0.95)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#c8a860';
  ctx.font = 'bold 14px serif';
  ctx.fillText(d.name || line.s, boxX + 20, boxY + 28);

  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(boxX + 20, boxY + 36);
  ctx.lineTo(boxX + boxW - 20, boxY + 36);
  ctx.stroke();

  ctx.fillStyle = '#d4c4a0';
  ctx.font = '14px serif';
  let y = boxY + 60;
  const maxW = boxW - 40;
  let line_text = '';
  for (const c of text) {
    const test = line_text + c;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line_text, boxX + 20, y);
      line_text = c;
      y += 22;
    } else {
      line_text = test;
    }
  }
  ctx.fillText(line_text, boxX + 20, y);

  if (d.done) {
    const a = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
    ctx.fillStyle = `rgba(180,150,100,${a})`;
    ctx.font = '11px serif';
    ctx.fillText('▼ 按 E 继续', boxX + boxW - 130, boxY + boxH - 15);
  }
}

function drawHints(ctx, hints) {
  let y = H - 220;
  for (let i = hints.length - 1; i >= 0; i--) {
    const h = hints[i];
    h.life -= 16;
    if (h.life <= 0) { hints.splice(i, 1); continue; }
    const a = Math.min(1, h.life / 500);
    ctx.fillStyle = `rgba(220,180,100,${a})`;
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.fillText(h.t, W/2, y);
    ctx.textAlign = 'left';
    y -= 22;
  }
}

function drawStickFigureSimple(ctx, x, y, scale, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y - 14 * scale, 4.5 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 10 * scale); ctx.lineTo(x, y + 3 * scale);
  ctx.moveTo(x, y - 6 * scale); ctx.lineTo(x - 5 * scale, y);
  ctx.moveTo(x, y - 6 * scale); ctx.lineTo(x + 5 * scale, y);
  ctx.moveTo(x, y + 3 * scale); ctx.lineTo(x - 3 * scale, y + 13 * scale);
  ctx.moveTo(x, y + 3 * scale); ctx.lineTo(x + 3 * scale, y + 13 * scale);
  ctx.stroke();
  ctx.restore();
}
