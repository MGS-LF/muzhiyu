// 渲染模块：markers
import { W, H } from '../config.js';

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
