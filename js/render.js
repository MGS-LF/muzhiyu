// 渲染器 — 矢量线稿 + 块面填充，明暗对比强，统一协调
import { COLORS, W, H } from './config.js';

export class Camera {
  constructor() {
    this.x = 0; this.y = 0;
    this.smooth = 0.18;
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
    this.x = Math.max(-100, Math.min(this.x, sceneW - W + 100));
    this.y = Math.max(-100, Math.min(this.y, sceneH - H + 100));
  }
  worldToScreen(x, y) {
    return {
      x: Math.round((x - this.x) * 10) / 10,
      y: Math.round((y - this.y) * 10) / 10
    };
  }
}

// 通用：圆角矩形路径
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// ============================================================
// 主渲染
// ============================================================
export function render(game, gameTime) {
  const { ctx, camera, scene, player, dialogState, hints, tutorial, objective } = game;

  // 战斗模式：独立渲染
  if (game.battle) {
    drawBattle(ctx, game.battle, gameTime);
    return;
  }

  // 造句模式：独立渲染
  if (game.compose) {
    drawCompose(ctx, game.compose, gameTime);
    return;
  }

  // 听雨自由对话：独立渲染
  if (game.converse) {
    drawConverse(ctx, game.converse, gameTime);
    return;
  }

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = scene.bgColor;
  ctx.fillRect(0, 0, W, H);

  camera.follow(player.x, player.y);
  camera.clamp(scene.width, scene.height);

  const W2S = (x, y) => camera.worldToScreen(x, y);

  if (scene.id === 'freeze_center') drawFreezeCenter(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'street_01') drawStreet(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'riverside') drawRiverside(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'subway') drawSubway(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'alley_district') drawAlley(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'house_a' || scene.id === 'house_b') drawHouse(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'stadium') drawStadium(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'data_center') drawDataCenter(ctx, W2S, scene, gameTime, game);

  // 章节门禁的可视化（屏障/光柱）
  drawGates(ctx, W2S, scene, game, gameTime);

  drawInteractHints(ctx, W2S, scene, player, game.collected, gameTime);

  // 敌人（在玩家之下，大地图上显示位置）
  if (scene.enemies) drawEnemies(ctx, W2S, scene.enemies, gameTime, game);

  // 掉落物
  drawItems(ctx, W2S, scene, gameTime, game.collected);

  // 失语者支线 NPC
  drawCureNPCs(ctx, W2S, scene, game, gameTime);

  // 要石
  drawKeystones(ctx, W2S, scene, game.activatedKeystones, gameTime);

  // 玩家（只有真正受伤时才闪烁）
  const hurt = game.player.invulnerable > 0 && game.player.hurtFlash;
  player.draw(ctx, camera, gameTime, hurt);

  // 粒子
  if (game.combat.particles.length) drawParticles(ctx, W2S, game.combat.particles);

  // 目标指引箭头
  drawObjectiveArrow(ctx, W2S, game, gameTime);

  // 氛围层（尘埃 / 雾气 / 色彩分级）
  drawAtmosphere(ctx, scene, gameTime, camera);

  drawLighting(ctx, player, camera, scene.id);

  // 受伤红屏（只有真正受伤时）
  if (game.player.hurtFlash && game.player.invulnerable > 0) drawDamageOverlay(ctx, player, gameTime);

  drawHUD(ctx, player, game, objective);

  if (dialogState) drawDialog(ctx, dialogState, gameTime);

  if (hints.length) drawHints(ctx, hints);

  if (tutorial) drawTutorial(ctx, gameTime, tutorial);

  // 等待 LLM 的提示
  if (game.aiThinking) drawThinking(ctx, gameTime, game.aiThinkingText);

  // 结局卡（对话结束后，game_complete 时覆盖显示）
  if (game.flags && game.flags.game_complete && !dialogState) {
    drawEnding(ctx, game.ending, gameTime, game.endingEpilogue);
  }
}

// ============================================================
// 结局卡
// ============================================================
function drawEnding(ctx, ending, gameTime, epilogue) {
  const cfgs = {
    fire: { title: '火 种', col: '255,210,120', sub: '语言的火种被重新点亮。只要还有一个人记得怎么说话，世界就还没有真的失语。' },
    silence: { title: '沉 默', col: '170,180,185', sub: '你完成了旅程，却没能在对的时候，留下一句话。世界停在一片灰白的安静里。' },
    burnout: { title: '燃 尽', col: '110,210,130', sub: '最后一个会说完整句子的人安静了。绿雾温柔地覆盖城市——再没有谁，会因一句诗而难受。' },
  };
  const c = cfgs[ending] || cfgs.silence;
  const subText = (epilogue && epilogue.trim()) ? epilogue.trim() : c.sub;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
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
  ctx.fillText(c.title, W / 2, H / 2 - 50);
  ctx.restore();
  // 副标题（换行）
  ctx.fillStyle = 'rgba(225,218,205,0.9)';
  ctx.font = '15px serif';
  const maxW = 560;
  let line = '', y = H / 2 + 10;
  for (const ch of subText) {
    if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, W / 2, y); line = ch; y += 26; }
    else line += ch;
  }
  ctx.fillText(line, W / 2, y);
  // 结语
  ctx.fillStyle = 'rgba(180,170,150,0.7)';
  ctx.font = '12px serif';
  ctx.fillText('—— 刻 痕 ·  遗 忘 的 文 字 ——', W / 2, y + 50);
  const blink = 0.4 + Math.sin(gameTime * 0.004) * 0.4;
  ctx.fillStyle = `rgba(${c.col},${blink})`;
  ctx.font = '12px serif';
  ctx.fillText('刷新页面，可换一种走法重新开始', W / 2, y + 76);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ============================================================
// 等待 LLM 的提示（覆盖在大地图上）
// ============================================================
function drawThinking(ctx, gameTime, text) {
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

// ============================================================
// 听雨自由对话（结局）
// ============================================================
function wrapText(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

function drawConverse(ctx, c, gameTime) {
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

  // 听雨投影（淡蓝、信号不稳的少女轮廓）
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

  // 听雨当前台词
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
    ctx.fillText('听雨正在凝视你' + dots, W / 2, H - 96);
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

// ============================================================
function drawEnemies(ctx, W2S, enemies, gameTime, game) {
  for (const e of enemies) {
    // 已击败的敌人不显示
    if (game && game.defeatedEnemies && game.defeatedEnemies.has(e.id)) continue;
    const s = W2S(e.x, e.y);
    if (!e.floating) e.floating = 0;
    e.floating += 0.05;
    const float = Math.sin(e.floating) * 3;
    const sy = s.y + float;

    // 提示标记：靠近会进入战斗
    const d = Math.hypot(e.x - (game ? game.player.x : 0), e.y - (game ? game.player.y : 0));
    const near = d < 80;
    if (near) {
      const pulse = 0.5 + Math.sin(gameTime * 0.008) * 0.4;
      ctx.fillStyle = `rgba(255,80,80,${pulse})`;
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.fillText('! 战斗', s.x, sy - 55);
      ctx.textAlign = 'left';
    }

    // 外发光
    ctx.shadowColor = 'rgba(80,220,100,0.8)';
    ctx.shadowBlur = near ? 22 : 12;
    ctx.fillStyle = `rgba(80,220,100,${near ? 0.18 : 0.1})`;
    ctx.beginPath();
    ctx.ellipse(s.x, sy - 4, 26, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 身体
    ctx.fillStyle = `rgba(80,220,100,${near ? 0.4 : 0.32})`;
    ctx.beginPath();
    ctx.moveTo(s.x - 4, sy - 16);
    ctx.lineTo(s.x - 18, sy + 18);
    ctx.lineTo(s.x + 18, sy + 18);
    ctx.lineTo(s.x + 4, sy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(120,255,140,${near ? 0.9 : 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 头
    ctx.fillStyle = `rgba(80,220,100,${near ? 0.5 : 0.4})`;
    ctx.beginPath();
    ctx.ellipse(s.x, sy - 22, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(120,255,140,${near ? 1 : 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 大嘴
    ctx.fillStyle = 'rgba(20,40,20,0.9)';
    ctx.beginPath();
    ctx.ellipse(s.x, sy - 18, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,255,220,0.85)';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(s.x + i * 3 - 1, sy - 21);
      ctx.lineTo(s.x + i * 3, sy - 17);
      ctx.lineTo(s.x + i * 3 + 1, sy - 21);
      ctx.closePath();
      ctx.fill();
    }

    // 文字残影
    const t = gameTime * 0.005;
    ctx.fillStyle = `rgba(120,255,140,${0.5 + Math.sin(t * 3) * 0.3})`;
    ctx.font = '8px serif';
    ctx.textAlign = 'center';
    ctx.fillText('YYDS', s.x - 22, sy - 8);
    ctx.fillText('绝绝子', s.x + 24, sy - 14);
    ctx.fillText('蚌', s.x, sy + 30);
    ctx.textAlign = 'left';
  }
}

// ============================================================
// 弹幕
// ============================================================
function drawBullets(ctx, W2S, bullets) {
  for (const b of bullets) {
    const s = W2S(b.x, b.y);
    const alpha = Math.min(1, b.life / 800);
    // 拖尾
    ctx.strokeStyle = `rgba(80,220,100,${alpha * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x - b.vx * 4, s.y - b.vy * 4);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    // 光晕
    ctx.shadowColor = 'rgba(80,220,100,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(80,220,100,${alpha * 0.25})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 文字
    ctx.fillStyle = `rgba(180,255,180,${alpha})`;
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, s.x, s.y);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }
}

// ============================================================
// 粒子
// ============================================================
function drawParticles(ctx, W2S, particles) {
  for (const p of particles) {
    const s = W2S(p.x, p.y);
    const a = p.life / p.maxLife;
    ctx.fillStyle = `rgba(${p.color},${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// 章节门禁可视化：未解锁→能量屏障+锁；已解锁→金色光柱+去向
// ============================================================
function drawGates(ctx, W2S, scene, game, gameTime) {
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
      const bw = 150, bh = 90;
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
          const px = s.x + x + wob, py = s.y - 10 + y;
          if (y === -bh / 2) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      // 锁图标
      ctx.fillStyle = `rgba(255,90,90,${0.7 + pulse * 0.3})`;
      ctx.shadowColor = 'rgba(255,80,80,0.8)';
      ctx.shadowBlur = 8;
      const lx = s.x, ly = s.y - 46;
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


function drawObjectiveArrow(ctx, W2S, game, gameTime) {
  const obj = game.objective;
  if (!obj || obj.done || !obj.target) return;
  const tx = obj.target.x, ty = obj.target.y;
  const dist = Math.hypot(tx - game.player.x, ty - game.player.y);
  if (dist < 70) return; // 已在目标附近，无需箭头
  const s = W2S(tx, ty);
  const cx = W / 2, cy = H / 2;
  const dx = s.x - cx, dy = s.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  const margin = 92;
  const ax = cx + nx * margin, ay = cy + ny * margin;
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
function drawDamageOverlay(ctx, player, gameTime) {
  const a = Math.min(0.35, player.invulnerable / 800 * 0.35);
  const grad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.7);
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
function drawDeathScreen(ctx, gameTime) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(220,60,60,0.95)';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('理性崩溃', W/2, H/2 - 30);
  ctx.fillStyle = 'rgba(220,200,180,0.8)';
  ctx.font = '14px serif';
  ctx.fillText('你被烂梗的海洋吞没，失去了语言。', W/2, H/2 + 10);
  const blink = 0.5 + Math.sin(gameTime * 0.005) * 0.5;
  ctx.fillStyle = `rgba(255,220,140,${blink})`;
  ctx.font = 'bold 16px serif';
  ctx.fillText('▼ 按 E 在最近的要石醒来', W/2, H/2 + 60);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

// ============================================================
// 战斗界面（Undertale 风格）
// ============================================================
const BOX_W = 280;
const BOX_H = 200;

export function drawBattle(ctx, battle, gameTime) {
  // 全黑背景
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // 淡入遮罩
  if (battle.fadeAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${battle.fadeAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // === 顶部：敌人立绘 ===
  const enemyCX = W / 2;
  const enemyCY = 160;
  drawBattleEnemy(ctx, enemyCX, enemyCY, battle.enemy, gameTime);

  // 敌人名字 + HP 条
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.fillText(battle.enemy.name, enemyCX, enemyCY + 70);
  // HP 条
  const eBarW = 120;
  ctx.fillStyle = '#400';
  ctx.fillRect(enemyCX - eBarW/2, enemyCY + 78, eBarW, 8);
  ctx.fillStyle = '#e44';
  ctx.fillRect(enemyCX - eBarW/2, enemyCY + 78, eBarW * (battle.enemy.hp / battle.enemy.maxHp), 8);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(enemyCX - eBarW/2, enemyCY + 78, eBarW, 8);
  ctx.fillStyle = '#ccc';
  ctx.font = '10px serif';
  ctx.fillText(`${battle.enemy.hp} / ${battle.enemy.maxHp}`, enemyCX, enemyCY + 95);

  // 清醒值（调查累积，满了可宽恕）
  if (battle.clarityMax) {
    const cw = 120, cyc = enemyCY + 103;
    ctx.fillStyle = 'rgba(40,40,20,0.8)';
    ctx.fillRect(enemyCX - cw/2, cyc, cw, 6);
    ctx.fillStyle = 'rgba(255,210,140,0.95)';
    ctx.fillRect(enemyCX - cw/2, cyc, cw * (battle.clarity / battle.clarityMax), 6);
    ctx.strokeStyle = 'rgba(255,210,140,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(enemyCX - cw/2, cyc, cw, 6);
    ctx.fillStyle = battle.clarity >= battle.clarityMax ? 'rgba(255,225,150,0.95)' : 'rgba(200,190,160,0.7)';
    ctx.font = '9px serif';
    ctx.fillText(battle.clarity >= battle.clarityMax ? '清醒：可宽恕' : `清醒 ${battle.clarity}/${battle.clarityMax}`, enemyCX, cyc + 14);
  }

  // 敌人文字气泡
  if (battle.enemyText && battle.enemyTextTimer > 0) {
    ctx.font = '13px serif';
    const tw = ctx.measureText(battle.enemyText).width + 30;
    ctx.fillStyle = 'rgba(20,20,30,0.9)';
    roundRect(ctx, enemyCX - tw/2, enemyCY + 124, tw, 26, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,220,100,0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, enemyCX - tw/2, enemyCY + 124, tw, 26, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,255,140,0.9)';
    ctx.textBaseline = 'middle';
    ctx.fillText(battle.enemyText, enemyCX, enemyCY + 137);
    ctx.textBaseline = 'alphabetic';
  }

  // === 中部：弹幕框 / 攻击条 ===
  const boxCX = W / 2;
  const boxCY = H / 2 + 60;

  ctx.save();
  ctx.translate(boxCX, boxCY);

  // 弹幕框边框
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(-BOX_W/2, -BOX_H/2, BOX_W, BOX_H);
  ctx.fillStyle = '#000';
  ctx.fillRect(-BOX_W/2, -BOX_H/2, BOX_W, BOX_H);

  if (battle.phase === 'enemyTurn') {
    // 红心
    ctx.fillStyle = '#e33';
    drawHeart(ctx, battle.heart.x, battle.heart.y, battle.heart.r);
    // 弹幕
    for (const b of battle.bullets) {
      // 光晕
      ctx.shadowColor = 'rgba(80,220,100,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = 'rgba(80,220,100,0.3)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 文字
      ctx.fillStyle = 'rgba(180,255,180,0.95)';
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, b.x, b.y);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
  } else if (battle.phase === 'attack_aim' && battle.attackBar) {
    // 攻击条
    const barW = BOX_W - 20;
    const barH = 30;
    ctx.fillStyle = '#222';
    ctx.fillRect(-barW/2, -barH/2, barW, barH);
    // 中心区域（高伤害区）
    ctx.fillStyle = 'rgba(255,220,120,0.3)';
    ctx.fillRect(-barW * 0.1, -barH/2, barW * 0.2, barH);
    // 移动指示器
    const ix = -barW/2 + battle.attackBar.pos * barW;
    ctx.fillStyle = '#ff4';
    ctx.fillRect(ix - 3, -barH/2, 6, barH);
    // 标签
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 J 攻击', 0, -barH/2 - 14);
    ctx.textAlign = 'left';
  } else if (battle.phase === 'poem') {
    // 诗词特效：金色光幕
    const t = battle.timer / 3000;
    const a = Math.sin(t * Math.PI) * 0.5;
    ctx.fillStyle = `rgba(255,220,120,${a})`;
    ctx.fillRect(-BOX_W/2, -BOX_H/2, BOX_W, BOX_H);
    // 诗句
    ctx.fillStyle = `rgba(255,240,180,${0.7 + a})`;
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('关关雎鸠', 0, -20);
    ctx.fillText('在河之洲', 0, 0);
    ctx.fillText('窈窕淑女', 0, 20);
    ctx.fillText('君子好逑', 0, 40);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  } else if (battle.phase === 'attack_resolve') {
    // 显示伤害数字
    if (battle.lastDamage) {
      const a = Math.max(0, 1 - battle.timer / 1200);
      ctx.fillStyle = `rgba(255,220,120,${a})`;
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`-${battle.lastDamage}`, 0, -40 - (1 - a) * 20);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
  }

  // 粒子
  for (const p of battle.particles) {
    const a = p.life / p.maxLife;
    ctx.fillStyle = `rgba(${p.color},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // === 底部：菜单 / HP / 提示 ===
  const uiY = H - 130;

  // 玩家 HP（SAN）
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('理性', W/2 - 200, uiY);
  const pBarW = 140;
  ctx.fillStyle = '#400';
  ctx.fillRect(W/2 - 160, uiY - 6, pBarW, 12);
  const ratio = Math.max(0, battle.heartHp / battle.heartMaxHp);
  ctx.fillStyle = ratio > 0.3 ? '#7ad07a' : '#e44';
  ctx.fillRect(W/2 - 160, uiY - 6, pBarW * ratio, 12);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(W/2 - 160, uiY - 6, pBarW, 12);
  ctx.fillStyle = '#ccc';
  ctx.font = '10px serif';
  ctx.fillText(`${Math.floor(battle.heartHp)} / ${battle.heartMaxHp}`, W/2 - 155, uiY);
  ctx.textBaseline = 'alphabetic';

  // 菜单（玩家回合时显示）
  if (battle.phase === 'menu') {
    const menuY = H - 70;
    const items = battle.menuItems;
    const itemW = 130;
    const totalW = itemW * items.length + 20 * (items.length - 1);
    const startX = W/2 - totalW/2;
    for (let i = 0; i < items.length; i++) {
      const ix = startX + i * (itemW + 20);
      const selected = i === battle.menuIndex;
      // 按钮背景
      ctx.fillStyle = selected ? 'rgba(255,220,120,0.15)' : 'rgba(20,20,30,0.6)';
      roundRect(ctx, ix, menuY, itemW, 36, 5);
      ctx.fill();
      ctx.strokeStyle = selected ? 'rgba(255,220,120,0.9)' : 'rgba(120,120,140,0.5)';
      ctx.lineWidth = selected ? 2 : 1;
      roundRect(ctx, ix, menuY, itemW, 36, 5);
      ctx.stroke();
      // 文字
      ctx.fillStyle = selected ? 'rgba(255,230,140,1)' : 'rgba(200,200,210,0.7)';
      ctx.font = selected ? 'bold 15px serif' : '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(items[i], ix + itemW/2, menuY + 18);
      // 选中指示
      if (selected) {
        ctx.fillStyle = 'rgba(255,220,120,0.9)';
        ctx.beginPath();
        ctx.moveTo(ix - 12, menuY + 18);
        ctx.lineTo(ix - 6, menuY + 14);
        ctx.lineTo(ix - 6, menuY + 22);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    // 提示
    ctx.fillStyle = 'rgba(180,180,190,0.6)';
    ctx.font = '11px serif';
    ctx.textAlign = 'center';
    ctx.fillText('← → 选择    E / 空格 确认', W/2, H - 20);
    ctx.fillStyle = 'rgba(150,150,160,0.5)';
    ctx.font = '10px serif';
    ctx.fillText('调查＝看清它残存的"人"，集满清醒可宽恕（不沾血也能脱战）', W/2, H - 6);
    ctx.textAlign = 'left';
  } else if (battle.phase === 'enemyTurn') {
    ctx.fillStyle = 'rgba(255,100,100,0.8)';
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ 躲避弹幕！用 WASD / 方向键移动红心', W/2, H - 30);
    ctx.textAlign = 'left';
  } else if (battle.phase === 'attack_aim') {
    ctx.fillStyle = 'rgba(255,220,120,0.8)';
    ctx.font = 'bold 13px serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 J 在中心位置停下，造成最大伤害', W/2, H - 30);
    ctx.textAlign = 'left';
  }

  // 结果画面
  if (battle.phase === 'result') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    const a = Math.min(1, battle.timer / 500);
    if (battle.result === 'win') {
      ctx.fillStyle = `rgba(255,220,120,${a})`;
      ctx.font = 'bold 32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('梗鬼消散了', W/2, H/2 - 20);
      ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
      ctx.font = '14px serif';
      ctx.fillText('绿色的光点四散，留下一个金色的汉字碎片。', W/2, H/2 + 20);
    } else if (battle.result === 'lose') {
      ctx.fillStyle = `rgba(220,60,60,${a})`;
      ctx.font = 'bold 32px serif';
      ctx.fillText('理性崩溃', W/2, H/2 - 20);
      ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
      ctx.font = '14px serif';
      ctx.fillText('你的语言被吞噬了……', W/2, H/2 + 20);
    } else if (battle.result === 'spare') {
      ctx.fillStyle = `rgba(255,210,150,${a})`;
      ctx.font = 'bold 32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('你宽恕了它', W/2, H/2 - 20);
      ctx.fillStyle = `rgba(200,200,200,${a * 0.8})`;
      ctx.font = '14px serif';
      ctx.fillText('绿光褪成暖色，它想起了自己曾是个会说话的人。', W/2, H/2 + 20);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }
}

function drawBattleEnemy(ctx, x, y, enemy, gameTime) {
  const float = Math.sin(gameTime * 0.004) * 5;
  y += float;
  // 外发光
  ctx.shadowColor = 'rgba(80,220,100,0.8)';
  ctx.shadowBlur = 25;
  ctx.fillStyle = 'rgba(80,220,100,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y, 40, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 身体
  ctx.fillStyle = 'rgba(80,220,100,0.4)';
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 25);
  ctx.lineTo(x - 30, y + 30);
  ctx.lineTo(x + 30, y + 30);
  ctx.lineTo(x + 8, y - 25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,255,140,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 头
  ctx.fillStyle = 'rgba(80,220,100,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y - 35, 26, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,255,140,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 大嘴
  ctx.fillStyle = 'rgba(20,40,20,0.9)';
  ctx.beginPath();
  ctx.ellipse(x, y - 30, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // 牙齿
  ctx.fillStyle = 'rgba(220,255,220,0.85)';
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 4 - 1.5, y - 35);
    ctx.lineTo(x + i * 4, y - 25);
    ctx.lineTo(x + i * 4 + 1.5, y - 35);
    ctx.closePath();
    ctx.fill();
  }
  // 文字
  ctx.fillStyle = `rgba(120,255,140,${0.4 + Math.sin(gameTime * 0.005) * 0.2})`;
  ctx.font = '10px serif';
  ctx.textAlign = 'center';
  ctx.fillText('YYDS', x - 40, y - 10);
  ctx.fillText('绝绝子', x + 42, y - 20);
  ctx.textAlign = 'left';
}

function drawHeart(ctx, x, y, r) {
  // 简单红心
  ctx.fillStyle = '#e33';
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.bezierCurveTo(x - r, y - r * 0.3, x - r, y - r, x, y - r * 0.3);
  ctx.bezierCurveTo(x + r, y - r, x + r, y - r * 0.3, x, y + r);
  ctx.closePath();
  ctx.fill();
}

// ============================================================
// 造句界面（复原诗句）
// ============================================================
function drawCompose(ctx, c, gameTime) {
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
    const x = (i * 137 + gameTime * 0.02 * ((i % 2) ? 1 : -1)) % (W + 80) - 40;
    const y = (i * 263 % H);
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
      if (ch === '_') { const s = c.slots[bc]; disp += s ? s.char : '＿'; blankFlags.push({ i: disp.length - 1, filled: !!s }); bc++; }
      else disp += ch;
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
          ? (winGlow ? 'rgba(255,235,150,1)' : 'rgba(255,225,140,1)')
          : 'rgba(120,200,130,0.7)';
        if (filled && winGlow) { ctx.shadowColor = 'rgba(255,220,140,0.9)'; ctx.shadowBlur = 14; }
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
  const tileW = 46, gap = 10;
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
    ctx.strokeStyle = sel ? 'rgba(255,214,124,1)' : (isDecoy ? 'rgba(90,180,110,0.5)' : 'rgba(150,130,90,0.6)');
    ctx.lineWidth = sel ? 2.5 : 1.2;
    roundRect(ctx, tx, ty, tileW, tileW, 6);
    ctx.stroke();
    ctx.fillStyle = sel ? 'rgba(255,236,170,1)' : 'rgba(220,210,190,0.92)';
    ctx.font = (c.pool[i].length > 1) ? 'bold 13px serif' : 'bold 22px serif';
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

// ============================================================
// 冷冻中心
// ============================================================
function drawFreezeCenter(ctx, W2S, scene, gameTime, game) {
  drawTileFloor(ctx, W2S, scene, '#1c2024', '#262a30', 60);
  drawCeilingLightStrips(ctx, W2S, gameTime);
  drawRoomWalls(ctx, W2S, scene);
  drawPlayerPod(ctx, W2S, gameTime);
  drawOtherPods(ctx, W2S, scene, gameTime);
  drawTerminal(ctx, W2S, scene, gameTime);
  drawLockerArea(ctx, W2S, gameTime);
  drawExitDoor(ctx, W2S, gameTime, game);
}

function drawTileFloor(ctx, W2S, scene, base, line, step) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const offY = (W2S(0, 0).y % step + step) % step;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  for (let y = -offY; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();
  }
  const offX = (W2S(0, 0).x % step + step) % step;
  for (let x = -offX; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const sx = ((i * 173) % (W + 200)) - 100;
    const sy = ((i * 91) % (H + 200)) - 100;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(sx, sy, 4 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCeilingLightStrips(ctx, W2S, gameTime) {
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 200;
    const y = 24;
    const s = W2S(x, y);
    const flicker = Math.sin(gameTime * 0.005 + i) * 0.3;
    const broken = (i === 2) && Math.sin(gameTime * 0.01) > 0.7;
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

function drawRoomWalls(ctx, W2S, scene) {
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

function drawPlayerPod(ctx, W2S, gameTime) {
  const cx = 360, cy = 440, w = 80, h = 130;
  const s = W2S(cx, cy);

  // 机械底座
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(s.x - w/2 - 6, s.y - 4, w + 12, 18);
  ctx.fillStyle = '#4a4a4e';
  ctx.fillRect(s.x - w/2 - 6, s.y - 4, w + 12, 4);
  ctx.strokeStyle = '#1a1a1c';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(s.x - w/2 - 6, s.y - 4, w + 12, 18);
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
  roundRect(ctx, s.x - w/2, podTop, w, podH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,200,220,0.8)';
  ctx.lineWidth = 2;
  roundRect(ctx, s.x - w/2, podTop, w, podH, 8);
  ctx.stroke();

  // 玻璃高光
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x - w/2 + 8, podTop + 8);
  ctx.lineTo(s.x - w/2 + 8, podTop + 20);
  ctx.moveTo(s.x - w/2 + 8, podTop + 8);
  ctx.lineTo(s.x - w/2 + 22, podTop + 8);
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
    ctx.moveTo(s.x - w/2 + 2, fy);
    ctx.lineTo(s.x - w/2 + 2 + fl, fy);
    ctx.moveTo(s.x + w/2 - 2, fy + 4);
    ctx.lineTo(s.x + w/2 - 2 - fl, fy + 4);
    ctx.stroke();
  }

  // 状态指示灯
  const pulse = 0.7 + Math.sin(gameTime * 0.005) * 0.3;
  ctx.fillStyle = `rgba(80,220,140,${pulse})`;
  ctx.shadowColor = `rgba(80,220,140,${pulse * 0.8})`;
  ctx.shadowBlur = 8 * pulse;
  ctx.beginPath();
  ctx.arc(s.x + w/2 - 8, s.y - 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 标记「我」
  ctx.fillStyle = 'rgba(255,220,140,0.95)';
  ctx.font = 'bold 14px serif';
  ctx.textAlign = 'center';
  ctx.fillText('我', s.x, podTop - 12);
  ctx.textAlign = 'left';
}

function drawOtherPods(ctx, W2S, scene, gameTime) {
  const topRow = [
    { x: 80, w: 130 }, { x: 225, w: 130 }, { x: 370, w: 130 },
    { x: 515, w: 130 }, { x: 660, w: 100 }
  ];
  for (let i = 0; i < topRow.length; i++) {
    const pod = topRow[i];
    const s = W2S(pod.x + pod.w/2, 140);
    const h = 80;
    // 底座
    ctx.fillStyle = '#222226';
    ctx.fillRect(s.x - pod.w/2 - 4, s.y - 4, pod.w + 8, 14);
    ctx.strokeStyle = '#111114';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - pod.w/2 - 4, s.y - 4, pod.w + 8, 14);
    // 玻璃
    const top = s.y - h + 10;
    const grad = ctx.createLinearGradient(0, top, 0, s.y - 4);
    grad.addColorStop(0, 'rgba(120,150,170,0.18)');
    grad.addColorStop(1, 'rgba(80,110,130,0.15)');
    ctx.fillStyle = grad;
    roundRect(ctx, s.x - pod.w/2, top, pod.w, h - 14, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,170,190,0.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, s.x - pod.w/2, top, pod.w, h - 14, 6);
    ctx.stroke();
    // 霜
    ctx.strokeStyle = 'rgba(180,200,220,0.3)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const fy = top + 6 + k * 12;
      const fl = 8 + (k * 11) % 18;
      ctx.beginPath();
      ctx.moveTo(s.x - pod.w/2 + 3, fy);
      ctx.lineTo(s.x - pod.w/2 + 3 + fl, fy);
      ctx.stroke();
    }
    // 灯（灭）
    ctx.fillStyle = '#1a1a1e';
    ctx.beginPath();
    ctx.arc(s.x + pod.w/2 - 8, s.y - 9, 2.5, 0, Math.PI * 2);
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
    const s = W2S(pod.x + pod.w/2, 270);
    ctx.fillStyle = '#1a1a1c';
    ctx.fillRect(s.x - pod.w/2 - 4, s.y - 4, pod.w + 8, 14);
    const top = s.y - pod.h + 14;
    ctx.fillStyle = 'rgba(20,15,18,0.6)';
    roundRect(ctx, s.x - pod.w/2, top, pod.w, pod.h - 18, 6);
    ctx.fill();
    // 红色碎裂
    ctx.strokeStyle = 'rgba(120,40,40,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - pod.w/2 + 10, top + 5);
    ctx.lineTo(s.x + 5, top + 20);
    ctx.lineTo(s.x - 10, top + 40);
    ctx.lineTo(s.x + 15, top + 55);
    ctx.lineTo(s.x - 5, top + pod.h - 25);
    ctx.stroke();
    // 绿色荧光
    ctx.strokeStyle = 'rgba(80,220,120,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - pod.w/2 + 30, top + 12);
    ctx.lineTo(s.x + 20, top + 30);
    ctx.lineTo(s.x + 35, top + 50);
    ctx.stroke();
    // 边框
    ctx.strokeStyle = 'rgba(80,60,60,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - pod.w/2, top + 8);
    ctx.lineTo(s.x - pod.w/2, s.y - 4);
    ctx.lineTo(s.x + pod.w/2, s.y - 4);
    ctx.lineTo(s.x + pod.w/2, top + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - pod.w/2 + 20, top);
    ctx.lineTo(s.x - pod.w/2 + 8, top + 8);
    ctx.lineTo(s.x - pod.w/2 + 14, top + 18);
    ctx.stroke();
  }
}

function drawTerminal(ctx, W2S, scene, gameTime) {
  const it = scene.props.find(p => p.name === '终端机');
  if (!it) return;
  const cx = it.x + it.w/2;
  const cy = it.y + it.h/2;
  const s = W2S(cx, cy);
  const w = it.w, h = it.h;

  // 桌子
  ctx.fillStyle = '#3a3530';
  ctx.fillRect(s.x - w/2 - 6, s.y - 4, w + 12, h + 8);
  ctx.fillStyle = '#4a4540';
  ctx.fillRect(s.x - w/2 - 6, s.y - 4, w + 12, 3);
  ctx.strokeStyle = '#1a1815';
  ctx.lineWidth = 1;
  ctx.strokeRect(s.x - w/2 - 6, s.y - 4, w + 12, h + 8);

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
  const monTop = s.y - h/2 - 32;
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

function drawLockerArea(ctx, W2S, gameTime) {
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

function drawExitDoor(ctx, W2S, gameTime, game) {
  const doorX = 270, doorY = 580, doorW = 210, doorH = 14;
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
  ctx.fillRect(s.x + doorW/2 - 4, s.y + 3, 8, 8);
  ctx.strokeStyle = 'rgba(120,90,40,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(s.x + doorW/2 - 4, s.y + 3, 8, 8);
}

// ============================================================
// 街道
// ============================================================
function drawStreet(ctx, W2S, scene, gameTime, game) {
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

  // 路面裂缝
  ctx.strokeStyle = 'rgba(15,12,10,0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const baseX = (i * 173 - W2S(0,0).x * 0.3) % (W + 200) - 100;
    const baseY = walkY + 10 + (i * 23) % (groundY - walkY - 20);
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    let cx = baseX, cy = baseY;
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

  // 杂草
  ctx.strokeStyle = '#5a6a30';
  ctx.lineWidth = 1;
  for (let i = 0; i < 50; i++) {
    const gx = (i * 41 - W2S(0,0).x) % (W + 100) - 50;
    const gy = walkY + 4 + (i * 11) % 8;
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

  // 落叶
  for (let i = 0; i < 30; i++) {
    const lx = (i * 67 - W2S(0,0).x) % (W + 60) - 30;
    const ly = walkY + 4 + (i * 19) % (groundY - walkY - 8);
    ctx.save();
    ctx.translate(lx, ly);
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

function drawAbandonedCar(ctx, W2S, car, gameTime) {
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

function drawRubble(ctx, W2S, rubble) {
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

function drawLostPerson(ctx, x, y, idx) {
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

function drawStreetLamps(ctx, W2S, gameTime) {
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

function drawGengGhost(ctx, x, y, gameTime, alpha = 1) {
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

function drawKeystones(ctx, W2S, scene, activated, gameTime) {
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

// ============================================================
// 江堤
// ============================================================
function drawRiverside(ctx, W2S, scene, gameTime, game) {
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
  for (const b of scene.props.filter(p => p.name === '对岸高楼')) {
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
      if (!started) { ctx.moveTo(x, waveY); started = true; }
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const lx = (i * 271 - gameTime * 0.02) % (W + 100) - 50;
    const ly = waterTop + 30 + (i * 31) % (waterH - 60);
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
    ctx.moveTo(0, y); ctx.lineTo(W, y);
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

  // 芦苇
  for (let i = 0; i < 60; i++) {
    const bx = (i * 47 - W2S(0,0).x * 0.3) % (W + 100) - 50;
    const by = walkY + 10 + (i * 13) % 80;
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
    const bx = (i * 113) % (W + 80) - 40;
    const by = railY - 4 + (i * 7) % 12;
    const sway = Math.sin(gameTime * 0.002 + i + 1) * 2;
    ctx.strokeStyle = '#5a5028';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + sway * 0.5, by - 10, bx + sway, by - 20);
    ctx.stroke();
  }

  drawShuyuan(ctx, W2S, gameTime);

  // 书远位置标记光柱（如果还没遇见过）
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
function drawSubway(ctx, W2S, scene, gameTime, game) {
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
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = (W2S(0,0).x % 40 + 40) % 40; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, tileY); ctx.lineTo(x, W2S(0, 600).y);
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
    ctx.moveTo(0, ry); ctx.lineTo(W, ry);
    ctx.stroke();
  }
  // 枕木
  ctx.fillStyle = '#1a1410';
  for (let x = (W2S(0,0).x % 50 + 50) % 50; x < W; x += 50) {
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
  for (const p of scene.walls.filter(w => w.name === '立柱')) {
    const s = W2S(p.x + p.w/2, p.y + p.h/2);
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(s.x - p.w/2, s.y - p.h/2, p.w, p.h);
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(s.x - p.w/2, s.y - p.h/2, p.w, 4);
    ctx.strokeStyle = '#0a0a0e';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - p.w/2, s.y - p.h/2, p.w, p.h);
    // 立柱阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(s.x - p.w/2 + 2, s.y - p.h/2 + 4, p.w - 2, p.h - 4);
  }

  // 废弃列车车厢
  for (const car of scene.props.filter(p => p.name === '列车车厢')) {
    const s = W2S(car.x + car.w/2, car.y + car.h/2);
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + car.h/2 + 4, car.w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 车身
    ctx.fillStyle = '#3a4a5a';
    roundRect(ctx, s.x - car.w/2, s.y - car.h/2, car.w, car.h, 6);
    ctx.fill();
    // 车顶
    ctx.fillStyle = '#2a3a4a';
    roundRect(ctx, s.x - car.w/2 + 4, s.y - car.h/2 - 6, car.w - 8, 8, 4);
    ctx.fill();
    // 车窗（破碎）
    ctx.fillStyle = '#0a0a10';
    for (let wx = s.x - car.w/2 + 10; wx < s.x + car.w/2 - 10; wx += 30) {
      ctx.fillRect(wx, s.y - car.h/2 + 8, 22, 18);
    }
    // 裂纹
    ctx.strokeStyle = 'rgba(180,200,220,0.3)';
    ctx.lineWidth = 0.5;
    for (let wx = s.x - car.w/2 + 12; wx < s.x + car.w/2 - 12; wx += 30) {
      ctx.beginPath();
      ctx.moveTo(wx, s.y - car.h/2 + 10);
      ctx.lineTo(wx + 8, s.y - car.h/2 + 22);
      ctx.stroke();
    }
    // 车门
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(s.x - 8, s.y - car.h/2 + 30, 16, car.h - 35);
    // 边框
    ctx.strokeStyle = '#1a2028';
    ctx.lineWidth = 1.5;
    roundRect(ctx, s.x - car.w/2, s.y - car.h/2, car.w, car.h, 6);
    ctx.stroke();
    // 锈迹
    ctx.fillStyle = 'rgba(140,80,40,0.3)';
    ctx.beginPath();
    ctx.ellipse(s.x - car.w/4, s.y, 10, 5, 0.3, 0, Math.PI * 2);
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
function drawAlley(ctx, W2S, scene, gameTime, game) {
  // 天空
  const sky = ctx.createLinearGradient(0, 0, 0, 300);
  sky.addColorStop(0, '#1a1410');
  sky.addColorStop(1, '#2a2218');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 远景高楼
  for (const b of scene.props.filter(p => p.name === '高楼')) {
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
  // 碎石纹理
  ctx.fillStyle = 'rgba(60,50,40,0.5)';
  for (let i = 0; i < 80; i++) {
    const gx = (i * 67 - W2S(0,0).x) % (W + 60) - 30;
    const gy = groundY + (i * 23) % (H - groundY);
    ctx.beginPath();
    ctx.arc(gx, gy, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // 民居建筑
  for (const b of scene.props.filter(p => p.name && p.name.includes('民居'))) {
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
    ctx.fillRect(s.x + b.w/2 - 12, s.y + b.h - 20, 24, 20);
    // 边框
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x, s.y, b.w, b.h);
  }

  // 碎石堆
  for (const r of scene.props.filter(p => p.name === '碎石堆')) {
    drawRubble(ctx, W2S, r);
  }

  // 废弃花坛
  const planter = scene.props.find(p => p.name === '废弃花坛');
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
      const gx = s.x + 5 + (i * 9) % (planter.w - 10);
      const gy = s.y + 5 + (i * 7) % (planter.h - 10);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 2, gy - 8);
      ctx.stroke();
    }
  }

  // 窄巷墙壁
  for (const w of scene.walls.filter(w => !w.name)) continue;
  ctx.strokeStyle = '#3a3028';
  ctx.lineWidth = 3;
  for (const w of scene.walls.filter(w => w.w === 6 && w.h > 100)) {
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
function drawHouse(ctx, W2S, scene, gameTime, game) {
  // 木地板
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(0, 0, W, H);
  // 地板缝
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 1;
  for (let y = 40; y < H; y += 30) {
    const sy = y - W2S(0,0).y % 30;
    if (sy > 0 && sy < H) {
      ctx.beginPath();
      ctx.moveTo(0, sy); ctx.lineTo(W, sy);
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
  for (const t of scene.props.filter(p => p.name === '桌子')) {
    const s = W2S(t.x, t.y);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(s.x, s.y, t.w, t.h);
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(s.x, s.y, t.w, 4);
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x, s.y, t.w, t.h);
  }

  // 书架
  for (const b of scene.props.filter(p => p.name === '书架')) {
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
    const colors = ['#5a3a2a','#4a3a4a','#3a4a3a','#5a4a3a'];
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
function drawStadium(ctx, W2S, scene, gameTime, game) {
  // 深色背景
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, W, H);

  // 地面
  ctx.fillStyle = '#12121a';
  ctx.fillRect(0, 0, W, H);

  // 屏幕墙（发光）
  for (const p of scene.props.filter(p => p.name === '屏幕墙')) {
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
      const nx = s.x + (i * 23) % p.w;
      const ny = s.y + (i * 17) % p.h;
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
function drawDataCenter(ctx, W2S, scene, gameTime, game) {
  // 纯黑
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // 深渊（两侧）
  for (const p of scene.props.filter(p => p.name === '深渊')) {
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

  // 听雨（蓝色光影）
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
    ctx.fillText('? 听雨', tyS.x, tyS.y - 30);
    ctx.textAlign = 'left';
  }
}

function drawShuyuan(ctx, W2S, gameTime) {
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

  const paperX = s.x + 14, paperY = s.y - 4;
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
// 物品
// ============================================================
function drawItems(ctx, W2S, scene, gameTime, collected) {
  for (const it of scene.items) {
    if (collected && collected.has(it.id)) continue;
    const s = W2S(it.x, it.y);
    const bob = Math.sin(gameTime * 0.004 + it.x) * 1.5;
    const dy = s.y + bob;

    if (it.type === 'char_fragment') {
      const pulse = 0.6 + Math.sin(gameTime * 0.006 + it.x) * 0.4;
      ctx.shadowColor = 'rgba(255,200,80,0.9)';
      ctx.shadowBlur = 14 * pulse;
      ctx.fillStyle = `rgba(255,200,80,${0.18 * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, dy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,230,140,${0.9 + pulse * 0.1})`;
      ctx.font = 'bold 18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(it.char, s.x, dy);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(s.x, dy + 6, 8, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d4b86a';
      ctx.fillRect(s.x - 6, dy - 8, 12, 14);
      ctx.fillStyle = '#e8cc88';
      ctx.fillRect(s.x - 6, dy - 8, 12, 3);
      ctx.fillStyle = '#a08840';
      ctx.beginPath();
      ctx.moveTo(s.x + 6, dy - 8);
      ctx.lineTo(s.x + 6, dy - 4);
      ctx.lineTo(s.x + 2, dy - 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#604020';
      ctx.lineWidth = 0.5;
      for (let l = 0; l < 2; l++) {
        ctx.beginPath();
        ctx.moveTo(s.x - 4, dy - 3 + l * 4);
        ctx.lineTo(s.x + 4, dy - 3 + l * 4);
        ctx.stroke();
      }
      ctx.strokeStyle = '#806020';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x - 6, dy - 8, 12, 14);
    }
  }
}

// ============================================================
// 失语者支线 NPC
// ============================================================
function drawCureNPCs(ctx, W2S, scene, game, gameTime) {
  for (const it of scene.interactables) {
    if (it.type !== 'cure') continue;
    const s = W2S(it.x, it.y);
    if (s.x < -60 || s.x > W + 60 || s.y < -60 || s.y > H + 60) continue;
    const cured = game.completedQuests && game.completedQuests.has(it.id);
    if (cured) {
      // 被唤醒：站起来的暖色人影 + 音符
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 6, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(205,178,138,0.95)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 2, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(232,205,165,1)';
      ctx.beginPath();
      ctx.arc(s.x, s.y - 12, 5, 0, Math.PI * 2);
      ctx.fill();
      const pulse = 0.4 + Math.sin(gameTime * 0.004 + it.x) * 0.3;
      ctx.fillStyle = `rgba(255,220,150,${pulse})`;
      ctx.font = '11px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♪', s.x, s.y - 24);
      ctx.textAlign = 'left';
    } else {
      const bob = Math.sin(gameTime * 0.002 + it.x) * 1.2;
      drawLostPerson(ctx, s.x, s.y + bob, 0);
      const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.4;
      ctx.fillStyle = `rgba(255,220,140,${pulse})`;
      ctx.font = 'bold 14px serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', s.x, s.y - 20);
      ctx.textAlign = 'left';
    }
  }
}

// ============================================================
// 互动提示
// ============================================================
function drawInteractHints(ctx, W2S, scene, player, collected, gameTime) {
  for (const it of scene.interactables) {
    const d = Math.hypot(it.x - player.x, it.y - player.y);
    if (d > 60) continue;
    const s = W2S(it.x, it.y);
    const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
    ctx.strokeStyle = `rgba(255,220,140,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const label = it.label || '';
    ctx.font = 'bold 11px serif';
    const text = 'E · ' + label;
    const w = ctx.measureText(text).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(s.x - w/2, s.y - 38, w, 18);
    ctx.strokeStyle = 'rgba(255,220,140,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - w/2, s.y - 38, w, 18);
    ctx.fillStyle = `rgba(255,220,140,${0.9 + pulse * 0.1})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, s.x, s.y - 29);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }
}

// ============================================================
// 氛围层：色彩分级 + 边缘雾气 + 飘浮尘埃
// ============================================================
function drawAtmosphere(ctx, scene, gameTime, camera) {
  const cfg = scene.atmosphere;
  if (!cfg) return;
  // 色彩分级（极淡，统一画面色温、提高对比）
  if (cfg.tint) {
    ctx.fillStyle = cfg.tint;
    ctx.fillRect(0, 0, W, H);
  }
  const c = (cfg.motes && cfg.motes.color) || '180,180,190';
  // 边缘雾气
  if (cfg.fog) {
    const f = cfg.fog;
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.34);
    top.addColorStop(0, `rgba(${c},${0.10 * f})`);
    top.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.34);
    const bot = ctx.createLinearGradient(0, H * 0.68, 0, H);
    bot.addColorStop(0, `rgba(${c},0)`);
    bot.addColorStop(1, `rgba(${c},${0.12 * f})`);
    ctx.fillStyle = bot;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);
  }
  // 飘浮尘埃 / 灰烬 / 水汽
  if (cfg.motes) {
    const m = cfg.motes;
    const speed = m.speed || 0.3;
    for (let i = 0; i < m.n; i++) {
      const hx = (i * 73 % 100) / 100;
      const hy = (i * 149 % 100) / 100;
      const phase = gameTime * 0.001 * speed + i;
      let x = hx * (W + 100) - 50 + Math.sin(phase) * 25 - camera.x * 0.03;
      let y = (hy * (H + 100) + gameTime * 0.012 * speed) % (H + 100) - 50;
      x = ((x % (W + 100)) + (W + 100)) % (W + 100) - 50;
      const twk = 0.35 + Math.abs(Math.sin(phase * 1.7)) * 0.65;
      const sz = m.size * (0.5 + (i % 4) * 0.2);
      ctx.fillStyle = `rgba(${m.color},${0.14 * twk})`;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ============================================================
// 光照（更明亮：柔和暗角 + 玩家暖光叠加）
// ============================================================
function drawLighting(ctx, player, camera, sceneId) {
  let r = 320, dark = 0.5, warm = 0.10;
  if (sceneId === 'freeze_center') { r = 380; dark = 0.42; warm = 0.06; }
  else if (sceneId === 'subway') { r = 250; dark = 0.66; warm = 0.10; }
  else if (sceneId === 'stadium') { r = 300; dark = 0.6; warm = 0.07; }
  else if (sceneId === 'data_center') { r = 240; dark = 0.72; warm = 0.05; }
  else if (sceneId === 'house_a' || sceneId === 'house_b') { r = 340; dark = 0.45; warm = 0.12; }
  const s = camera.worldToScreen(player.x, player.y);
  // 柔和暗角
  const grad = ctx.createRadialGradient(s.x, s.y, r * 0.45, s.x, s.y, r * 1.5);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.75, `rgba(0,0,0,${dark * 0.4})`);
  grad.addColorStop(1, `rgba(0,0,0,${dark})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // 玩家周围暖光（叠加增亮，增强层次与电影感）
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const warmGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 0.7);
  warmGrad.addColorStop(0, `rgba(255,226,172,${warm})`);
  warmGrad.addColorStop(1, 'rgba(255,226,172,0)');
  ctx.fillStyle = warmGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ============================================================
// HUD
// ============================================================
function drawHUD(ctx, player, game, objective) {
  const sanW = 140;
  const sanH = 14;
  const sx = 16, sy = 14;
  const ratio = Math.max(0, player.san / player.maxSan);
  ctx.fillStyle = 'rgba(20,15,10,0.8)';
  roundRect(ctx, sx, sy, sanW, sanH, 3);
  ctx.fill();
  const barColor = ratio > 0.6 ? '#7ad07a' : ratio > 0.3 ? '#e0b850' : '#d04040';
  ctx.fillStyle = barColor;
  roundRect(ctx, sx + 1, sy + 1, (sanW - 2) * ratio, sanH - 2, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,200,150,0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, sx, sy, sanW, sanH, 3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  ctx.font = 'bold 10px serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('理性', sx + 5, sy + sanH/2);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.font = '9px serif';
  ctx.fillText(`${Math.floor(player.san)}/${player.maxSan}`, sx + sanW - 36, sy + sanH/2);
  ctx.textBaseline = 'alphabetic';

  // 章节碎片进度面板（直接回答"还要做什么"）
  const prog = game.objective && game.objective.progress;
  const ammo = (player.collectedChars || []).length;
  const poemY = sy + sanH + 14;
  if (prog) {
    const panelW = 250, panelH = 40;
    ctx.fillStyle = 'rgba(22,17,10,0.78)';
    roundRect(ctx, sx, poemY, panelW, panelH, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,160,90,0.55)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, poemY, panelW, panelH, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,160,90,0.4)';
    ctx.fillRect(sx, poemY, panelW, 2);
    // 标题
    ctx.fillStyle = 'rgba(255,215,130,0.92)';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('碎片 · ' + prog.title, sx + 8, poemY + 12);
    // 字格
    let cxp = sx + 10;
    const cy2 = poemY + 28;
    for (const { c, have } of prog.chars) {
      ctx.fillStyle = have ? 'rgba(70,55,25,0.9)' : 'rgba(40,40,44,0.8)';
      roundRect(ctx, cxp, cy2 - 9, 18, 18, 3);
      ctx.fill();
      ctx.strokeStyle = have ? 'rgba(255,215,130,0.9)' : 'rgba(110,110,120,0.6)';
      ctx.lineWidth = 1;
      roundRect(ctx, cxp, cy2 - 9, 18, 18, 3);
      ctx.stroke();
      ctx.fillStyle = have ? 'rgba(255,232,150,1)' : 'rgba(120,120,128,0.7)';
      ctx.font = 'bold 12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(c, cxp + 9, cy2);
      if (have) {
        ctx.fillStyle = 'rgba(120,220,140,1)';
        ctx.font = 'bold 9px serif';
        ctx.fillText('✓', cxp + 15, cy2 - 6);
      }
      cxp += 24;
    }
    // 弹药计数
    ctx.fillStyle = 'rgba(200,200,210,0.8)';
    ctx.font = '10px serif';
    ctx.textAlign = 'right';
    ctx.fillText('诗词弹药 ×' + ammo, sx + panelW - 8, poemY + 12);
  } else {
    // 无章节目标时仅显示弹药数
    const panelW = 250;
    ctx.fillStyle = 'rgba(22,17,10,0.7)';
    roundRect(ctx, sx, poemY, panelW, 22, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,140,80,0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, poemY, panelW, 22, 3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,120,0.9)';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('诗词弹药 ×' + ammo, sx + 8, poemY + 11);
  }
  ctx.textBaseline = 'alphabetic';

  // 任务目标（顶部中央）
  if (objective && !objective.done) {
    const ox = W / 2, oy = 14;
    const ow = 360, oh = 30;
    ctx.fillStyle = 'rgba(20,15,10,0.85)';
    roundRect(ctx, ox - ow/2, oy, ow, oh, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,170,80,0.7)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, ox - ow/2, oy, ow, oh, 4);
    ctx.stroke();
    // 顶部金色边
    ctx.fillStyle = 'rgba(220,170,80,0.5)';
    ctx.fillRect(ox - ow/2, oy, ow, 2);
    // 任务文字
    ctx.fillStyle = 'rgba(255,210,120,0.95)';
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('目  标', ox - ow/2 + 40, oy + oh/2);
    ctx.fillStyle = 'rgba(232,220,200,0.95)';
    ctx.font = '13px serif';
    ctx.textAlign = 'left';
    ctx.fillText(objective.text, ox - ow/2 + 80, oy + oh/2);
    ctx.textBaseline = 'alphabetic';
  }

  const scene = game.scene;
  ctx.fillStyle = 'rgba(20,15,10,0.7)';
  const mx = W - 200, my = 14;
  roundRect(ctx, mx, my, 184, 60, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,80,0.4)';
  ctx.lineWidth = 1;
  roundRect(ctx, mx, my, 184, 60, 4);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,210,120,0.9)';
  ctx.font = 'bold 11px serif';
  ctx.textAlign = 'left';
  ctx.fillText(scene.name, mx + 10, my + 16);

  ctx.fillStyle = 'rgba(200,200,200,0.7)';
  ctx.font = '9px serif';
  const saved = game.karma ? game.karma.saved : 0;
  ctx.fillText(saved > 0 ? `已唤醒失语者 ${saved}` : '尚未唤醒失语者', mx + 10, my + 32);

  ctx.fillStyle = player.hasClothes ? 'rgba(120,200,140,0.9)' : 'rgba(220,120,120,0.9)';
  ctx.fillText(player.hasClothes ? '已穿装备' : '未穿装备', mx + 10, my + 46);
  ctx.textAlign = 'left';

  // 语言之火：隐性倾向指示（暖=守护/慈悲，冷绿=武力侵蚀）。不显示数值，避免剧透分支。
  if (game.karma) {
    const warm = game.karma.mercy + game.karma.saved;
    const cold = game.karma.violence;
    const fl = Math.max(0.25, Math.min(1, 0.45 + (warm - cold) * 0.12));
    const fx = mx + 168, fy = my + 26;
    const fcol = cold > warm + 1 ? '120,210,130' : '255,185,95';
    ctx.save();
    ctx.shadowColor = `rgba(${fcol},${fl})`;
    ctx.shadowBlur = 9 * fl;
    ctx.fillStyle = `rgba(${fcol},${0.5 + fl * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 9);
    ctx.quadraticCurveTo(fx + 6, fy - 1, fx + 3, fy + 5);
    ctx.quadraticCurveTo(fx, fy + 8, fx - 3, fy + 5);
    ctx.quadraticCurveTo(fx - 6, fy - 1, fx, fy - 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// 对话
// ============================================================
function drawDialog(ctx, d, gameTime) {
  const curT = d.lines[d.idx].t;
  d.charTimer += 16;
  if (!d.done && curT !== undefined && d.charTimer > 25) {
    d.charTimer = 0;
    d.charIdx++;
    if (d.charIdx >= curT.length) {
      d.charIdx = curT.length;
      d.done = true;
    }
  }
  const line = d.lines[d.idx];
  const text = (line.t !== undefined) ? line.t.substring(0, d.charIdx) : '';

  const boxX = 80, boxY = H - 170, boxW = W - 160, boxH = 130;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(boxX + 4, boxY + 4, boxW, boxH);
  ctx.fillStyle = 'rgba(15,12,8,0.95)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = 'rgba(180,140,80,0.5)';
  ctx.fillRect(boxX, boxY, boxW, 3);
  ctx.strokeStyle = 'rgba(180,140,80,0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = 'rgba(40,30,20,0.6)';
  ctx.fillRect(boxX + 16, boxY + 16, 60, 60);
  ctx.strokeStyle = 'rgba(180,140,80,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 16, boxY + 16, 60, 60);
  const cx = boxX + 46, cy = boxY + 46;
  ctx.fillStyle = 'rgba(180,140,80,0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 12, cy, 24, 20);

  ctx.fillStyle = 'rgba(255,210,120,0.95)';
  ctx.font = 'bold 16px serif';
  ctx.textBaseline = 'top';
  ctx.fillText(d.name || line.s, boxX + 90, boxY + 18);

  ctx.strokeStyle = 'rgba(180,140,80,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boxX + 90, boxY + 40);
  ctx.lineTo(boxX + boxW - 20, boxY + 40);
  ctx.stroke();

  ctx.fillStyle = 'rgba(232,220,200,0.95)';
  ctx.font = '15px serif';
  let y = boxY + 60;
  const maxW = boxW - 110;
  let line_text = '';
  for (const c of text) {
    if (c === '\n') {
      ctx.fillText(line_text, boxX + 90, y);
      line_text = '';
      y += 22;
      continue;
    }
    const test = line_text + c;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line_text, boxX + 90, y);
      line_text = c;
      y += 22;
    } else {
      line_text = test;
    }
  }
  ctx.fillText(line_text, boxX + 90, y);

  if (d.choosing && line.choice) {
    drawChoices(ctx, d, boxX, boxY, boxW, gameTime);
  } else if (d.done) {
    const a = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
    ctx.fillStyle = `rgba(255,210,120,${a})`;
    ctx.font = '11px serif';
    ctx.textAlign = 'right';
    const hint = line.choice ? '▼ E 做出选择' : '▼ E / 空格 继续';
    ctx.fillText(hint, boxX + boxW - 20, boxY + boxH - 14);
    ctx.textAlign = 'left';
  }
}

// 选项菜单（浮在对话框上方）
function drawChoices(ctx, d, boxX, boxY, boxW, gameTime) {
  const opts = d.lines[d.idx].choice;
  const ow = 460, oh = 30, gap = 6;
  const totalH = opts.length * (oh + gap);
  const ox = boxX + boxW - ow - 16;
  const oy = boxY - totalH - 8;
  ctx.textBaseline = 'middle';
  for (let i = 0; i < opts.length; i++) {
    const sel = i === d.choiceIndex;
    const ry = oy + i * (oh + gap);
    ctx.fillStyle = sel ? 'rgba(45,33,16,0.96)' : 'rgba(15,12,8,0.9)';
    roundRect(ctx, ox, ry, ow, oh, 5);
    ctx.fill();
    ctx.strokeStyle = sel ? 'rgba(255,212,124,0.95)' : 'rgba(120,100,70,0.6)';
    ctx.lineWidth = sel ? 2 : 1;
    roundRect(ctx, ox, ry, ow, oh, 5);
    ctx.stroke();
    if (sel) {
      ctx.fillStyle = 'rgba(255,212,124,0.95)';
      ctx.beginPath();
      ctx.moveTo(ox + 11, ry + oh / 2);
      ctx.lineTo(ox + 17, ry + oh / 2 - 4);
      ctx.lineTo(ox + 17, ry + oh / 2 + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = sel ? 'rgba(255,236,172,1)' : 'rgba(200,190,175,0.8)';
    ctx.font = sel ? 'bold 14px serif' : '14px serif';
    ctx.textAlign = 'left';
    ctx.fillText(opts[i].label, ox + 28, ry + oh / 2);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = `rgba(255,212,124,${0.5 + Math.sin(gameTime * 0.005) * 0.3})`;
  ctx.font = '11px serif';
  ctx.textAlign = 'right';
  ctx.fillText('↑ ↓ 选择 · E 确认', boxX + boxW - 16, oy - 8);
  ctx.textAlign = 'left';
}

// ============================================================
// 浮动提示
// ============================================================
function drawHints(ctx, hints) {
  let y = H - 220;
  for (let i = hints.length - 1; i >= 0; i--) {
    const h = hints[i];
    h.life -= 16;
    if (h.life <= 0) { hints.splice(i, 1); continue; }
    const a = Math.min(1, h.life / 500);
    ctx.font = '12px serif';
    const w = ctx.measureText(h.t).width + 20;
    ctx.fillStyle = `rgba(0,0,0,${a * 0.6})`;
    ctx.fillRect(W/2 - w/2, y - 12, w, 20);
    ctx.strokeStyle = `rgba(255,210,120,${a * 0.6})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(W/2 - w/2, y - 12, w, 20);
    ctx.fillStyle = `rgba(255,230,160,${a})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(h.t, W/2, y - 2);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    y -= 26;
  }
}

// ============================================================
// 教程覆盖层
// ============================================================
function drawTutorial(ctx, gameTime, tutorial) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  const px = 200, py = 160, pw = 400, ph = 300;
  ctx.fillStyle = 'rgba(15,12,8,0.96)';
  roundRect(ctx, px, py, pw, ph, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,140,80,0.7)';
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pw, ph, 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,140,80,0.6)';
  ctx.fillRect(px, py, pw, 3);

  ctx.fillStyle = 'rgba(255,210,120,0.95)';
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(tutorial.title || '刻痕 · 遗 忘 的 文 字', px + pw/2, py + 18);

  ctx.fillStyle = 'rgba(200,200,180,0.7)';
  ctx.font = '11px serif';
  ctx.fillText('公元 2147 · 上海废墟', px + pw/2, py + 50);

  ctx.strokeStyle = 'rgba(180,140,80,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 40, py + 78);
  ctx.lineTo(px + pw - 40, py + 78);
  ctx.stroke();

  ctx.fillStyle = 'rgba(232,220,200,0.95)';
  ctx.font = '14px serif';
  ctx.textAlign = 'left';
  const keys = tutorial.keys || [
    { k: 'WASD', d: '移动' },
    { k: 'Shift', d: '奔跑' },
    { k: 'Space', d: '冲刺闪避' },
    { k: 'E', d: '交互 / 拾取' },
    { k: 'J', d: '诗词净化波（需先收集）' },
  ];
  let yy = py + 95;
  for (const row of keys) {
    ctx.fillStyle = 'rgba(60,50,40,0.9)';
    roundRect(ctx, px + 50, yy - 13, 90, 22, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,140,80,0.6)';
    ctx.lineWidth = 1;
    roundRect(ctx, px + 50, yy - 13, 90, 22, 3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,210,120,0.95)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.k, px + 95, yy - 2);
    ctx.fillStyle = 'rgba(232,220,200,0.9)';
    ctx.font = '14px serif';
    ctx.textAlign = 'left';
    ctx.fillText(row.d, px + 155, yy);
    yy += 26;
  }

  ctx.fillStyle = 'rgba(180,180,160,0.7)';
  ctx.font = '11px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tip = tutorial.tip || '提示：靠近发光的物体按 E 交互。';
  ctx.fillText(tip, px + pw/2, py + ph - 36);

  // 开始提示（闪烁）
  const blink = 0.5 + Math.sin(gameTime * 0.004) * 0.4;
  ctx.fillStyle = `rgba(255,210,120,${blink})`;
  ctx.font = 'bold 14px serif';
  ctx.fillText('▼ 按 E 或 空格 开始', px + pw/2, py + ph - 18);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
