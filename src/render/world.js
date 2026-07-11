import { drawLostPerson } from './scenes.js';
import { roundRect } from './util.js';
import { W, H } from '../config.js';

// ===== from world.js =====
// 渲染模块：world

// ============================================================
// 物品
// ============================================================
export function drawItems(ctx, W2S, scene, gameTime, collected) {
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
export function drawCureNPCs(ctx, W2S, scene, game, gameTime) {
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
export function drawInteractHints(ctx, W2S, scene, player, collected, gameTime) {
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
    ctx.fillRect(s.x - w / 2, s.y - 38, w, 18);
    ctx.strokeStyle = 'rgba(255,220,140,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - w / 2, s.y - 38, w, 18);
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
export function drawAtmosphere(ctx, scene, gameTime, camera) {
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
    top.addColorStop(0, `rgba(${c},${0.1 * f})`);
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
      const hx = ((i * 73) % 100) / 100;
      const hy = ((i * 149) % 100) / 100;
      const phase = gameTime * 0.001 * speed + i;
      let x = hx * (W + 100) - 50 + Math.sin(phase) * 25 - camera.x * 0.03;
      let y = ((hy * (H + 100) + gameTime * 0.012 * speed) % (H + 100)) - 50;
      x = (((x % (W + 100)) + (W + 100)) % (W + 100)) - 50;
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
export function drawLighting(ctx, player, camera, sceneId) {
  let r = 320,
    dark = 0.5,
    warm = 0.1;
  if (sceneId === 'freeze_center') {
    r = 380;
    dark = 0.42;
    warm = 0.06;
  } else if (sceneId === 'subway') {
    r = 250;
    dark = 0.66;
    warm = 0.1;
  } else if (sceneId === 'stadium') {
    r = 300;
    dark = 0.6;
    warm = 0.07;
  } else if (sceneId === 'data_center') {
    r = 240;
    dark = 0.72;
    warm = 0.05;
  } else if (sceneId === 'house_a' || sceneId === 'house_b') {
    r = 340;
    dark = 0.45;
    warm = 0.12;
  }
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

// ===== from markers.js =====
// 渲染模块：markers

// ============================================================
// 交互点远距离视觉标识
// 为「仅有靠近后触发的交互圈、却没有实际物体模型」的交互点
// 补上可见的实体/标识，使玩家无需靠近即可远距离识别。
// 已有独立渲染的交互点（要石/失语者/门禁/场景内专门绘制）会跳过。
// ============================================================

// 已在各自场景函数中专门绘制了实体的交互点，不再补标识
export const INTERACTABLES_WITH_VISUAL = new Set([
  // freeze_center：冷冻仓/终端机/储物柜/大门均由 drawFreezeCenter 绘制
  'player_pod',
  'terminal',
  'locker',
  'exit_door',
  // street_01：失语者群、地铁站入口、锈死轿车、要石、失语者支线
  'lost_people',
  'subway_entrance',
  'street_carwreck',
  // riverside：守砚由 drawShuyuan 绘制
  'shuyuan',
  // subway：出口有专门的光柱
  'subway_exit',
  // house_a：书架已绘制
  'house_a_book',
  // data_center：Sydney蓝色光影已绘制
  'tingyu',
]);

export function markerKind(it) {
  if (it.type === 'scene_change' || it.type === 'exit') return 'portal';
  const k = (it.dialogKey || '') + (it.label || '');
  if (/屏幕|内壁|screen/.test(k)) return 'screen';
  if (/线路图|map/.test(k)) return 'map';
  if (/守砚|老人|蹲|victim|失语|人/.test(k)) return 'person';
  if (/告示|标牌|乱涂|graffiti|poster|sign|残破|破碎|小龛/.test(k)) return 'sign';
  return 'sign';
}

export function drawInteractableMarkers(ctx, W2S, scene, game, gameTime) {
  for (const it of scene.interactables) {
    // 已有独立渲染的类型跳过
    if (it.type === 'keystone') continue; // drawKeystones
    if (it.type === 'cure') continue; // drawCureNPCs
    if (it.type === 'scene_change' && it.gate) continue; // drawGates
    // 已在场景函数中专门绘制的交互点跳过
    if (INTERACTABLES_WITH_VISUAL.has(it.id)) continue;

    const s = W2S(it.x, it.y);
    if (s.x < -120 || s.x > W + 120 || s.y < -160 || s.y > H + 120) continue;

    const pulse = 0.5 + Math.sin(gameTime * 0.004 + it.x * 0.01) * 0.3;
    const bob = Math.sin(gameTime * 0.003 + it.x) * 1.5;
    const cx = s.x,
      cy = s.y;

    // 地面光晕（远距离即可看到）
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 44);
    halo.addColorStop(0, `rgba(255,220,140,${0.26 * pulse + 0.12})`);
    halo.addColorStop(0.6, `rgba(255,200,110,${0.1 * pulse})`);
    halo.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 44, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // 地面阴影
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const kind = markerKind(it);
    if (kind === 'portal') drawPortalMarker(ctx, cx, cy + bob, it, gameTime, pulse);
    else if (kind === 'person') drawPersonMarker(ctx, cx, cy + bob, it, gameTime, pulse);
    else if (kind === 'screen') drawScreenMarker(ctx, cx, cy + bob, it, gameTime, pulse);
    else if (kind === 'map') drawMapMarker(ctx, cx, cy + bob, it, gameTime, pulse);
    else drawSignMarker(ctx, cx, cy + bob, it, gameTime, pulse);

    // 标签（远距离半透明可见；靠近后 drawInteractHints 会强化为 E·标签）
    ctx.fillStyle = `rgba(255,228,150,${0.55 + pulse * 0.2})`;
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillText(it.label || '◆', cx, cy - 46);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }
}

// 通道门（普通场景切换 / 出口）：拱门 + 门洞光 + 箭头
export function drawPortalMarker(ctx, x, y, it, gameTime, pulse) {
  const w = 28,
    h = 42;
  // 两根门柱
  ctx.fillStyle = '#3a3a3e';
  ctx.fillRect(x - w / 2 - 3, y - h, 6, h);
  ctx.fillRect(x + w / 2 - 3, y - h, 6, h);
  ctx.strokeStyle = '#1a1a1c';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2 - 3, y - h, 6, h);
  ctx.strokeRect(x + w / 2 - 3, y - h, 6, h);
  // 拱顶横梁
  ctx.fillStyle = '#42424a';
  ctx.fillRect(x - w / 2 - 3, y - h - 5, w + 6, 5);
  ctx.strokeRect(x - w / 2 - 3, y - h - 5, w + 6, 5);
  // 门洞透光
  const grad = ctx.createLinearGradient(0, y - h, 0, y);
  grad.addColorStop(0, `rgba(255,220,140,${0.5 + pulse * 0.3})`);
  grad.addColorStop(1, `rgba(255,200,100,${0.12 + pulse * 0.1})`);
  ctx.fillStyle = grad;
  ctx.fillRect(x - w / 2 + 3, y - h + 3, w - 6, h - 3);
  // 上升箭头
  ctx.fillStyle = `rgba(255,235,160,${0.85 + pulse * 0.15})`;
  ctx.shadowColor = `rgba(255,220,140,${pulse * 0.8})`;
  ctx.shadowBlur = 6 * pulse;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 - 8);
  ctx.lineTo(x - 6, y - h / 2 + 1);
  ctx.lineTo(x - 2, y - h / 2 + 1);
  ctx.lineTo(x - 2, y - h / 2 + 8);
  ctx.lineTo(x + 2, y - h / 2 + 8);
  ctx.lineTo(x + 2, y - h / 2 + 1);
  ctx.lineTo(x + 6, y - h / 2 + 1);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

// 人物对话点：人影 + 问号
export function drawPersonMarker(ctx, x, y, it, gameTime, pulse) {
  ctx.fillStyle = 'rgba(60,55,50,0.9)';
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(95,82,70,0.95)';
  ctx.beginPath();
  ctx.arc(x, y - 14, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,32,28,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y - 14, 5, 0, Math.PI * 2);
  ctx.stroke();
  // 问号
  ctx.fillStyle = `rgba(255,220,140,${0.7 + pulse * 0.3})`;
  ctx.shadowColor = `rgba(255,220,140,${pulse})`;
  ctx.shadowBlur = 8 * pulse;
  ctx.font = 'bold 15px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x, y - 27);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.shadowBlur = 0;
}

// 屏幕类对话点：发光屏幕 + 噪点
export function drawScreenMarker(ctx, x, y, it, gameTime, pulse) {
  const w = 32,
    h = 24;
  // 支架
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(x - 2, y - 7, 4, 7);
  ctx.fillRect(x - 9, y - 1, 18, 3);
  // 背板
  ctx.fillStyle = '#1a1a20';
  ctx.fillRect(x - w / 2, y - 7 - h, w, h);
  ctx.strokeStyle = '#0a0a10';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - 7 - h, w, h);
  // 发光屏面
  const scan = 0.6 + Math.sin(gameTime * 0.008) * 0.3;
  ctx.fillStyle = `rgba(120,180,255,${scan * 0.55})`;
  ctx.fillRect(x - w / 2 + 2, y - 7 - h + 2, w - 4, h - 4);
  ctx.shadowColor = `rgba(120,180,255,${pulse})`;
  ctx.shadowBlur = 10 * pulse;
  ctx.strokeStyle = `rgba(150,200,255,${0.6 + pulse * 0.3})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - 7 - h, w, h);
  ctx.shadowBlur = 0;
  // 噪点
  ctx.fillStyle = `rgba(200,220,255,${scan * 0.7})`;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x - w / 2 + 3 + ((i * 7) % (w - 6)), y - 7 - h + 3 + ((i * 5) % (h - 6)), 2, 2);
  }
}

// 线路图类对话点：墙挂图板 + 站点
export function drawMapMarker(ctx, x, y, it, gameTime, pulse) {
  const w = 30,
    h = 36;
  ctx.fillStyle = '#3a3530';
  ctx.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
  ctx.fillStyle = '#1a1814';
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.strokeStyle = '#100c08';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - h, w, h);
  // 线路
  ctx.strokeStyle = `rgba(220,180,80,${0.6 + pulse * 0.3})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 4, y - h + 7);
  ctx.lineTo(x - 2, y - h + 15);
  ctx.lineTo(x + w / 2 - 4, y - h + 11);
  ctx.moveTo(x - w / 2 + 4, y - h + 20);
  ctx.lineTo(x + 4, y - h + 26);
  ctx.lineTo(x + w / 2 - 4, y - h + 22);
  ctx.stroke();
  // 站点
  ctx.fillStyle = `rgba(255,220,140,${0.85 + pulse * 0.15})`;
  for (const [dx, dy] of [
    [-w / 2 + 4, -h + 7],
    [-2, -h + 15],
    [w / 2 - 4, -h + 11],
    [4, -h + 26],
    [w / 2 - 4, -h + 22],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 标牌/告示/乱涂/小龛类对话点：杆 + 牌
export function drawSignMarker(ctx, x, y, it, gameTime, pulse) {
  const w = 28,
    h = 22;
  // 杆
  ctx.fillStyle = '#2a2520';
  ctx.fillRect(x - 1.5, y - h, 3, h);
  // 牌
  ctx.fillStyle = '#3a3025';
  ctx.fillRect(x - w / 2, y - h - 5, w, h);
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(x - w / 2, y - h - 5, w, 3);
  ctx.strokeStyle = '#1a140e';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - h - 5, w, h);
  // 泛光内容
  ctx.fillStyle = `rgba(220,180,90,${0.35 + pulse * 0.3})`;
  ctx.fillRect(x - w / 2 + 2, y - h - 1, w - 4, h - 7);
  ctx.fillStyle = `rgba(255,220,140,${0.7 + pulse * 0.3})`;
  ctx.font = 'bold 9px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('※', x, y - h + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

// ===== from enemies.js =====
// 渲染模块：enemies

// ============================================================
export function drawEnemies(ctx, W2S, enemies, gameTime, game) {
  for (const e of enemies) {
    // 已击败的敌人不显示
    if (game && game.defeatedEnemies && game.defeatedEnemies.has(e.id)) continue;
    const s = W2S(e.x, e.y);
    // 地面行走：不再上下浮动，改为左右迈步微动
    if (e.walkPhase === undefined) e.walkPhase = 0;
    e.walkPhase += 0.05;
    const stepBob = Math.abs(Math.sin(e.walkPhase)) * 2;
    const sy = s.y - stepBob; // 脚踏地，整体微抬模拟迈步

    // 提示标记：靠近会进入战斗 / 可踩踏
    const d = Math.hypot(e.x - (game ? game.player.x : 0), e.y - (game ? game.player.y : 0));
    const near = d < 80;
    if (near) {
      const pulse = 0.5 + Math.sin(gameTime * 0.008) * 0.4;
      ctx.fillStyle = `rgba(255,80,80,${pulse})`;
      ctx.font = 'bold 11px serif';
      ctx.textAlign = 'center';
      ctx.fillText('! 战斗 / 空格踩踏', s.x, sy - 55);
      ctx.textAlign = 'left';
    }

    // 脚下阴影（地面行走标志）
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 4, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // === 潜行怪视野扇形（精英怪）===
    if (e.visionRange) {
      const vdir = e.visionDir !== undefined ? e.visionDir : e.dir > 0 ? 0 : Math.PI;
      const half = e.visionHalfAngle || Math.PI / 3;
      // 用 W2S 缩放比换算视野半径到屏幕像素
      const edge = W2S(e.x + e.visionRange, e.y);
      const rad = Math.max(20, Math.abs(edge.x - s.x));
      // 是否发现玩家（在视野内且无遮挡）
      let spotted = false;
      if (game) {
        const pdx = game.player.x - e.x,
          pdy = game.player.y - e.y;
        const pd = Math.hypot(pdx, pdy);
        if (pd < e.visionRange) {
          const pang = Math.atan2(pdy, pdx);
          let diff = Math.abs(pang - vdir);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < half && !game._lineBlockedByScreen(e.x, e.y, game.player.x, game.player.y))
            spotted = true;
        }
      }
      const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.15;
      ctx.fillStyle = spotted
        ? `rgba(255,70,70,${0.22 + pulse * 0.1})`
        : `rgba(255,200,70,${0.08 + pulse * 0.04})`;
      ctx.beginPath();
      ctx.moveTo(s.x, sy - 10);
      ctx.arc(s.x, sy - 10, rad, vdir - half, vdir + half);
      ctx.closePath();
      ctx.fill();
      // 视野边缘线
      ctx.strokeStyle = spotted ? 'rgba(255,90,90,0.5)' : 'rgba(255,200,70,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 外发光
    const useReduced = game && game.settings && game.settings.reducedFx;
    if (!useReduced) {
      ctx.shadowColor = 'rgba(80,220,100,0.8)';
      ctx.shadowBlur = near ? 22 : 12;
    }
    ctx.fillStyle = `rgba(80,220,100,${near ? 0.18 : 0.1})`;
    ctx.beginPath();
    ctx.ellipse(s.x, sy - 4, 26, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!useReduced) {
      ctx.shadowBlur = 0;
    }

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
// 刻字模式 UI
// ============================================================
export function drawEngraving(ctx, e, gameTime, game) {
  if (!e) return;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2,
    cy = H / 2;
  // 面板
  const pw = 420,
    ph = e.mode === 'input' ? 220 : 360;
  ctx.fillStyle = 'rgba(20,16,10,0.95)';
  roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,180,90,0.6)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 8);
  ctx.stroke();
  // 标题
  ctx.fillStyle = 'rgba(255,220,140,0.95)';
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.fillText(e.type === 'keystone' ? '在要石上刻字' : '在残碑上刻字', cx, cy - ph / 2 + 36);
  ctx.fillStyle = 'rgba(200,170,110,0.6)';
  ctx.font = '11px serif';
  ctx.fillText('方向键选择预设，或选择"自定义"输入。Esc 取消', cx, cy - ph / 2 + 56);

  if (e.mode === 'select') {
    const n = e.presets.length + 1;
    ctx.font = 'bold 16px serif';
    for (let i = 0; i < n; i++) {
      const y = cy - ph / 2 + 90 + i * 32;
      const sel = i === e.sel;
      if (sel) {
        ctx.fillStyle = 'rgba(255,220,140,0.12)';
        ctx.fillRect(cx - pw / 2 + 20, y - 14, pw - 40, 26);
        ctx.fillStyle = 'rgba(255,230,160,1)';
      } else {
        ctx.fillStyle = 'rgba(200,180,140,0.75)';
      }
      const label = i < e.presets.length ? '「' + e.presets[i] + '」' : '✎  自定义输入…';
      ctx.fillText(label, cx, y);
    }
  }
  // input 模式由 DOM 输入框处理，这里只画提示
  ctx.textAlign = 'left';
}

// 为主渲染创建刻字输入框（input 模式时）
export function ensureEngraveInput(game) {
  const e = game.engraveState;
  if (!e || e.mode !== 'input') {
    if (game._engraveInput && game._engraveInput.parentNode) {
      game._engraveInput.parentNode.removeChild(game._engraveInput);
      game._engraveInput = null;
    }
    return;
  }
  if (game._engraveInput) return;
  const wrap = document.getElementById('wrap') || document.body;
  const el = document.createElement('input');
  el.type = 'text';
  el.maxLength = 12;
  el.placeholder = '刻下你想留的字…（回车确认，Esc 返回）';
  el.setAttribute('autocomplete', 'off');
  Object.assign(el.style, {
    position: 'absolute',
    left: '50%',
    top: '52%',
    transform: 'translateX(-50%)',
    width: '360px',
    padding: '12px 16px',
    fontSize: '18px',
    textAlign: 'center',
    fontFamily: "'SimSun','Songti SC',serif",
    color: '#fff',
    background: 'rgba(10,10,16,0.95)',
    border: '1px solid rgba(220,180,90,0.6)',
    outline: 'none',
    borderRadius: '4px',
    zIndex: '20',
  });
  let composing = false;
  el.addEventListener('compositionstart', () => {
    composing = true;
  });
  el.addEventListener('compositionend', () => {
    composing = false;
  });
  el.addEventListener('keydown', (ev) => {
    if (composing) return;
    if (ev.key === 'Enter') {
      ev.preventDefault();
      game._submitEngraveInput();
    }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      e.mode = 'select';
    }
  });
  wrap.appendChild(el);
  game._engraveInput = el;
}

// ============================================================
// 弹幕（已移除 drawBullets — 未使用）
// ============================================================

// ============================================================
// 粒子
// ============================================================
export function drawParticles(ctx, W2S, particles) {
  for (const p of particles) {
    const s = W2S(p.x, p.y);
    const a = p.life / p.maxLife;
    ctx.fillStyle = `rgba(${p.color},${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.size * a, 0, Math.PI * 2);
    ctx.fill();
  }
}
