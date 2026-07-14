import { drawLostPerson } from './scenes.js';
import { roundRect } from './util.js';
import { W, H, FEATURES } from '../config.js';

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
    if (!isInteractableVisible(it, game)) continue;
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
export function drawInteractHints(ctx, W2S, scene, player, collected, gameTime, game = null) {
  for (const it of scene.interactables) {
    if (!isInteractableVisible(it, game)) continue;
    const d = Math.hypot(it.x - player.x, it.y - player.y);
    if (d > 60) continue;
    const s = W2S(it.x, it.y);
    const pulse = 0.5 + Math.sin(gameTime * 0.005) * 0.3;
    const isPurify = it.type === 'purify';
    const isWall =
      isPurify &&
      (it.purifyKind === 'meme_wall' ||
        /墙|招牌|路牌|梗/.test((it.purifyKind || '') + (it.label || '') + (it.pollutedLabel || '')));

    // 环：净化物抬高，避免盖住招牌/气泡
    const ringY = isWall ? s.y - 8 : s.y;
    ctx.strokeStyle = `rgba(255,220,140,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(s.x, ringY, isWall ? 18 : 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    let text;
    // 提示条高度：招牌把「F」放在牌顶上方；普通交互仍在脚边上方
    let tipY = s.y - 38;
    if (isPurify) {
      const done = !!(it.doneFlag && game && game.flags && game.flags[it.doneFlag]);
      if (done) {
        text = isWall
          ? '按 E 查看「' + (it.cleansedLabel || it.label || '路名') + '」'
          : '已唤醒 · 按 E 交谈';
        tipY = isWall ? s.y - 78 : s.y - 52;
      } else {
        const name = it.label || it.pollutedLabel || (isWall ? '招牌' : '失语者');
        text = isWall ? '按 F 补诗净化' + name : '按 F 补诗唤醒' + name;
        tipY = isWall ? s.y - 78 : s.y - 54;
      }
    } else {
      text = 'E · ' + (it.label || '');
    }
    ctx.font = 'bold 11px serif';
    const w = ctx.measureText(text).width + 16;
    const boxH = 18;
    const boxY = tipY - boxH / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(s.x - w / 2, boxY, w, boxH);
    ctx.strokeStyle = 'rgba(255,220,140,0.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - w / 2, boxY, w, boxH);
    ctx.fillStyle = `rgba(255,220,140,${0.9 + pulse * 0.1})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, s.x, tipY);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }
}

// ============================================================
// 组句净化物：梗墙 / 失语者
// ============================================================
export function drawPurifyProps(ctx, W2S, scene, game, gameTime) {
  if (!scene || !scene.interactables) return;
  for (const it of scene.interactables) {
    if (!isInteractableVisible(it, game)) continue;
    if (it.type !== 'purify') continue;
    const s = W2S(it.x, it.y);
    if (s.x < -80 || s.x > W + 80 || s.y < -100 || s.y > H + 80) continue;
    const done = !!(it.doneFlag && game && game.flags && game.flags[it.doneFlag]);
    const pulse = 0.5 + Math.sin(gameTime * 0.004 + it.x * 0.01) * 0.3;
    const kind = it.purifyKind || '';
    // 语言即维度：未净化「塌平」；净化后「立起」——只压扁形体，文字保持正常比例
    const scaleY = done ? 1 : 0.55;
    const scaleX = done ? 1 : 1.12;

    if (kind === 'meme_wall' || /墙|招牌|路牌|梗/.test(kind + (it.label || '') + (it.pollutedLabel || ''))) {
      const text = done
        ? it.cleansedLabel || it.label || '正名'
        : it.pollutedLabel || it.label || '梗';
      ctx.font = 'bold 13px serif';
      const tw = ctx.measureText(text).width;
      const w = Math.max(72, tw + 24);
      const h = 36;
      // 塌平后牌面视觉高度 ≈ h * scaleY，文字仍按正常高度排版
      const boardTop = s.y - (done ? h + 14 : h * scaleY + 18);
      const boardCy = boardTop + (done ? h / 2 : (h * scaleY) / 2);

      // 地面塌陷/立起圈
      ctx.strokeStyle = done
        ? `rgba(224,178,98,${0.25 + pulse * 0.2})`
        : `rgba(80,160,100,${0.2 + pulse * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 6, done ? 28 : 34, done ? 7 : 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 形体（杆+牌）可塌平
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-s.x, -s.y);

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 4, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      const bodyTop = s.y - h - 14;
      ctx.fillStyle = done ? '#3a3228' : '#1a1814';
      ctx.fillRect(s.x - 2, bodyTop + h - 4, 4, s.y - (bodyTop + h) + 6);
      ctx.fillStyle = done ? 'rgba(48,38,20,0.98)' : 'rgba(18,28,20,0.92)';
      ctx.fillRect(s.x - w / 2, bodyTop, w, h);
      ctx.strokeStyle = done ? 'rgba(224,178,98,0.85)' : `rgba(80,200,100,${0.45 + pulse * 0.35})`;
      ctx.lineWidth = done ? 2 : 1.5;
      ctx.strokeRect(s.x - w / 2, bodyTop, w, h);
      if (!done) {
        ctx.strokeStyle = `rgba(100,220,120,${0.12 + pulse * 0.1})`;
        ctx.lineWidth = 1;
        for (let ly = 0; ly < 3; ly++) {
          const yy = bodyTop + 8 + ly * 10 + Math.sin(gameTime * 0.008 + ly) * 1.5;
          ctx.beginPath();
          ctx.moveTo(s.x - w / 2 + 4, yy);
          ctx.lineTo(s.x + w / 2 - 4, yy);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 文字在 scale 外绘制，避免被压扁
      ctx.font = 'bold 13px serif';
      ctx.fillStyle = done
        ? `rgba(255,220,140,${0.92 + pulse * 0.08})`
        : `rgba(120,230,140,${0.85 + pulse * 0.15})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, s.x, boardCy);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    } else {
      const bob = Math.sin(gameTime * 0.002 + it.x) * 1.2;
      ctx.strokeStyle = done
        ? `rgba(224,178,98,${0.22 + pulse * 0.15})`
        : `rgba(80,160,100,${0.18 + pulse * 0.12})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 8, done ? 16 : 20, done ? 5 : 3, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 人影可塌平
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-s.x, -s.y);

      if (done) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + 6, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(205,178,138,0.95)';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 2 + bob * 0.3, 6, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(232,205,165,1)';
        ctx.beginPath();
        ctx.arc(s.x, s.y - 12 + bob * 0.3, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawLostPerson(ctx, s.x, s.y + bob, 0);
        ctx.fillStyle = `rgba(40,60,45,${0.12 + pulse * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - 4, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 气泡文字在 scale 外，正常比例
      const bubbleText = done
        ? it.cleansedLabel || '…'
        : it.pollutedSpeech || it.pollutedLabel || '…';
      ctx.font = '11px serif';
      const bw = Math.min(120, Math.max(36, ctx.measureText(bubbleText).width + 14));
      const bx = s.x - bw / 2;
      // 塌平后人更矮，气泡略抬高一点避免叠人
      const by = s.y - (done ? 36 : 28);
      const bh = 18;
      ctx.fillStyle = done ? 'rgba(20,16,10,0.85)' : 'rgba(12,20,14,0.88)';
      roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill();
      ctx.strokeStyle = done
        ? 'rgba(224,178,98,0.55)'
        : `rgba(80,200,100,${0.45 + pulse * 0.3})`;
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bw, bh, 4);
      ctx.stroke();
      ctx.fillStyle = done
        ? `rgba(255,220,140,${0.8 + pulse * 0.2})`
        : `rgba(150,235,160,${0.85 + pulse * 0.15})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubbleText, s.x, by + bh / 2);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }
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

export function isInteractableVisible(it, game) {
  if (!it) return false;
  if (it._hidden) return false;
  // 功能开关：如 level3d 关闭时隐藏维度裂隙
  if (it._feature === 'level3d' && !FEATURES.level3d) return false;
  if (it._cond) return !!(game && game.flags && game.flags[it._cond]);
  return true;
}

export function markerKind(it) {
  if (it.type === 'scene_change' || it.type === 'exit' || it.type === 'dream_wake') return 'portal';
  const k = (it.dialogKey || '') + (it.label || '') + (it.type || '');
  if (/广播|收音机|radio/.test(k)) return 'radio';
  if (it.type === 'dream_wall' || it.type === 'dream_door') return 'sign';
  if (/屏幕|内壁|screen/.test(k)) return 'screen';
  if (/线路图|map/.test(k)) return 'map';
  if (/守砚|老人|蹲|victim|失语|人/.test(k)) return 'person';
  if (/告示|标牌|乱涂|graffiti|poster|sign|残破|破碎|小龛|墙上/.test(k)) return 'sign';
  return 'sign';
}

export function drawInteractableMarkers(ctx, W2S, scene, game, gameTime) {
  for (const it of scene.interactables) {
    if (!isInteractableVisible(it, game)) continue;
    // 已有独立渲染的类型跳过
    if (it.type === 'keystone') continue; // drawKeystones
    if (it.type === 'cure') continue; // drawCureNPCs
    if (it.type === 'purify') continue; // drawPurifyProps
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
    else if (kind === 'radio') drawRadioMarker(ctx, cx, cy + bob, it, gameTime, pulse);
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

// 破损旧广播 / 收音机：机身 + 喇叭网 + 天线 + 微光
export function drawRadioMarker(ctx, x, y, it, gameTime, pulse) {
  const w = 30;
  const h = 20;
  const top = y - h - 2;
  // 机身
  ctx.fillStyle = '#2c2824';
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.strokeStyle = 'rgba(180,150,90,0.55)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x - w / 2, top, w, h);
  // 锈蚀/破损缺口
  ctx.fillStyle = '#1a1612';
  ctx.fillRect(x + w / 2 - 7, top + 3, 5, 8);
  // 喇叭网
  ctx.strokeStyle = `rgba(200,180,120,${0.35 + pulse * 0.25})`;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(x - 4, top + h / 2, 3 + i * 1.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 旋钮
  ctx.fillStyle = `rgba(255,220,140,${0.55 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(x + 9, top + 7, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 9, top + 13, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // 天线（弯曲感）
  ctx.strokeStyle = '#8a8070';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 4, top);
  ctx.lineTo(x - w / 2 - 2, top - 12);
  ctx.stroke();
  // 信号微光
  ctx.strokeStyle = `rgba(120,200,255,${0.2 + pulse * 0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x - w / 2 - 2, top - 12, 4 + pulse * 2, -0.8, 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - w / 2 - 2, top - 12, 7 + pulse * 2, -0.7, 0.25);
  ctx.stroke();
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

    // 体育馆 Boss：算法茧房核心（屏幕塔），不是绿色梗鬼
    if (e.boss || e.typeId === 'geng_boss' || e.combat === 'hack') {
      drawCocoonBoss(ctx, s.x, sy, gameTime, e, game);
      continue;
    }

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

    const t = gameTime * 0.005 + (e.x + e.y) * 0.001;
    const breathe = 0.5 + Math.sin(t * 2.6) * 0.5;
    const lean = (e.dir || 1) * (2 + Math.sin(t * 3.4) * 0.8);

    // 外发光
    const useReduced = game && game.settings && game.settings.reducedFx;
    if (!useReduced) {
      ctx.shadowColor = 'rgba(80,220,100,0.8)';
      ctx.shadowBlur = near ? 22 : 12;
    }
    const aura = ctx.createRadialGradient(s.x, sy - 10, 0, s.x, sy - 10, near ? 42 : 34);
    aura.addColorStop(0, `rgba(125,255,145,${near ? 0.3 : 0.2})`);
    aura.addColorStop(0.45, 'rgba(50,190,90,0.12)');
    aura.addColorStop(1, 'rgba(80,220,100,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(s.x, sy - 9, 31, 38, Math.sin(t) * 0.12, 0, Math.PI * 2);
    ctx.fill();
    if (!useReduced) {
      ctx.shadowBlur = 0;
    }

    // 噪声光环
    ctx.strokeStyle = `rgba(130,255,155,${near ? 0.26 : 0.16})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const r = 20 + i * 7 + breathe * 2;
      ctx.beginPath();
      ctx.ellipse(s.x, sy - 9, r * 0.72, r, Math.sin(t + i) * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 幽灵身体
    const body = ctx.createLinearGradient(s.x - 18, sy - 36, s.x + 18, sy + 20);
    body.addColorStop(0, `rgba(165,255,175,${near ? 0.68 : 0.52})`);
    body.addColorStop(0.5, `rgba(68,212,100,${near ? 0.56 : 0.44})`);
    body.addColorStop(1, `rgba(22,86,50,${near ? 0.7 : 0.58})`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(s.x - 5 + lean, sy - 34);
    ctx.bezierCurveTo(s.x - 23, sy - 30, s.x - 24, sy - 2, s.x - 14, sy + 17);
    ctx.bezierCurveTo(s.x - 8, sy + 11, s.x - 3, sy + 22, s.x + 3, sy + 15);
    ctx.bezierCurveTo(s.x + 9, sy + 22, s.x + 15, sy + 10, s.x + 18, sy + 17);
    ctx.bezierCurveTo(s.x + 27, sy - 4, s.x + 20, sy - 31, s.x + 5 + lean, sy - 34);
    ctx.bezierCurveTo(s.x + 2, sy - 30, s.x - 2, sy - 30, s.x - 5 + lean, sy - 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(145,255,165,${near ? 0.95 : 0.7})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 面部暗腔
    ctx.fillStyle = 'rgba(9,26,14,0.78)';
    ctx.beginPath();
    ctx.ellipse(s.x + 1, sy - 17, 13, 7 + breathe * 2, 0.06, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#061406';
    ctx.beginPath();
    ctx.ellipse(s.x - 6, sy - 25, 2.4, 4, -0.25, 0, Math.PI * 2);
    ctx.ellipse(s.x + 7, sy - 25, 2.4, 4, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(215,255,205,${0.42 + breathe * 0.28})`;
    ctx.beginPath();
    ctx.arc(s.x - 6.6, sy - 26.4, 0.8, 0, Math.PI * 2);
    ctx.arc(s.x + 6.4, sy - 26.4, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // 断齿
    ctx.fillStyle = 'rgba(220,255,220,0.76)';
    for (let i = -3; i <= 3; i++) {
      const toothX = s.x + i * 3.5;
      ctx.beginPath();
      ctx.moveTo(toothX - 1, sy - 20);
      ctx.lineTo(toothX, sy - 15.5 + Math.sin(t * 3 + i) * 0.8);
      ctx.lineTo(toothX + 1, sy - 20);
      ctx.closePath();
      ctx.fill();
    }

    // 文字残影
    ctx.fillStyle = `rgba(150,255,165,${near ? 0.58 : 0.42})`;
    ctx.font = '8px serif';
    ctx.textAlign = 'center';
    ctx.fillText('YYDS', s.x - 26, sy - 9 + Math.sin(t * 1.8) * 2);
    ctx.fillText('绝绝子', s.x + 29, sy - 16 + Math.cos(t * 2.2) * 2);
    ctx.fillText('梗', s.x - 4, sy + 31 + Math.sin(t * 2.5) * 1.5);
    ctx.textAlign = 'left';
  }
}

/** 算法茧房核心：推荐之神巨像（屏幕王冠 + 数据环 + 蓝核面） */
function drawCocoonBoss(ctx, sx, sy, gameTime, e, game) {
  const t = gameTime * 0.004;
  const pulse = 0.5 + Math.sin(t * 2.2) * 0.5;
  const d = game ? Math.hypot(e.x - game.player.x, e.y - game.player.y) : 999;
  const near = d < 120;
  const reduced = game && game.settings && game.settings.reducedFx;
  const bob = Math.sin(t * 1.6) * 2.5;
  const by = sy + bob;

  // 宽阔底座阴影 + 污染光池
  const ground = ctx.createRadialGradient(sx, sy + 10, 4, sx, sy + 10, 70);
  ground.addColorStop(0, `rgba(60,140,255,${0.28 + pulse * 0.12})`);
  ground.addColorStop(0.45, 'rgba(40,80,180,0.12)');
  ground.addColorStop(1, 'rgba(20,40,80,0)');
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 12, 62, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 外圈数据环（旋转）
  if (!reduced) {
    ctx.save();
    ctx.translate(sx, by - 48);
    ctx.rotate(t * 0.7);
    ctx.strokeStyle = `rgba(100,190,255,${0.22 + pulse * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-t * 1.4);
    ctx.strokeStyle = `rgba(180,120,255,${0.18 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 16, 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 肩部侧翼屏幕（左右悬浮）
  for (const side of [-1, 1]) {
    const wx = sx + side * (38 + Math.sin(t * 2 + side) * 3);
    const wy = by - 52 + Math.cos(t * 1.8 + side) * 4;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(side * 0.18 + Math.sin(t) * 0.05);
    // 面板
    const pw = 22;
    const ph = 36;
    const g = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
    g.addColorStop(0, 'rgba(18,28,55,0.95)');
    g.addColorStop(1, 'rgba(8,14,30,0.98)');
    ctx.fillStyle = g;
    roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 3);
    ctx.fill();
    ctx.strokeStyle = `rgba(120,180,255,${0.55 + pulse * 0.25})`;
    ctx.lineWidth = 1.2;
    roundRect(ctx, -pw / 2, -ph / 2, pw, ph, 3);
    ctx.stroke();
    // 小屏光
    ctx.fillStyle = `rgba(80,160,255,${0.25 + Math.sin(t * 4 + side) * 0.15})`;
    ctx.fillRect(-pw / 2 + 3, -ph / 2 + 4, pw - 6, ph - 10);
    ctx.fillStyle = `rgba(200,230,255,${0.5 + pulse * 0.3})`;
    ctx.font = 'bold 7px serif';
    ctx.textAlign = 'center';
    ctx.fillText(side < 0 ? '荐' : '推', 0, 2);
    ctx.restore();
  }

  // 主躯干：梯形铠甲 + 内发光
  const bodyTop = by - 78;
  const bodyBot = by + 6;
  const bodyGrad = ctx.createLinearGradient(sx, bodyTop, sx, bodyBot);
  bodyGrad.addColorStop(0, 'rgba(30,50,90,0.98)');
  bodyGrad.addColorStop(0.45, 'rgba(14,22,48,0.98)');
  bodyGrad.addColorStop(1, 'rgba(8,12,28,0.98)');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(sx - 18, bodyTop + 8);
  ctx.lineTo(sx + 18, bodyTop + 8);
  ctx.lineTo(sx + 32, bodyBot);
  ctx.lineTo(sx - 32, bodyBot);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(130,190,255,${0.55 + pulse * 0.2})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 胸甲屏幕阵列（斜切）
  for (let i = 0; i < 5; i++) {
    const ry = bodyTop + 16 + i * 12;
    const w = 28 + i * 2;
    const glow = 0.4 + Math.sin(t * 3.5 + i * 0.9) * 0.35;
    ctx.fillStyle = `rgba(40,110,220,${0.2 + glow * 0.45})`;
    ctx.beginPath();
    ctx.moveTo(sx - w / 2, ry);
    ctx.lineTo(sx + w / 2, ry);
    ctx.lineTo(sx + w / 2 - 2, ry + 9);
    ctx.lineTo(sx - w / 2 + 2, ry + 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(160,210,255,${0.25 + glow * 0.4})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // 头部：多面屏幕王冠
  const hx = sx;
  const hy = bodyTop - 4;
  // 后冠光晕
  if (!reduced) {
    ctx.shadowColor = 'rgba(80,160,255,0.85)';
    ctx.shadowBlur = 22 + pulse * 12;
  }
  ctx.fillStyle = `rgba(60,140,255,${0.15 + pulse * 0.1})`;
  ctx.beginPath();
  ctx.arc(hx, hy - 8, 28, 0, Math.PI * 2);
  ctx.fill();
  if (!reduced) ctx.shadowBlur = 0;

  // 主脸屏
  const fw = 36;
  const fh = 42;
  const faceG = ctx.createLinearGradient(hx, hy - fh / 2, hx, hy + fh / 2);
  faceG.addColorStop(0, 'rgba(20,40,80,0.98)');
  faceG.addColorStop(0.5, 'rgba(12,24,55,0.98)');
  faceG.addColorStop(1, 'rgba(8,16,40,0.98)');
  ctx.fillStyle = faceG;
  roundRect(ctx, hx - fw / 2, hy - fh / 2, fw, fh, 6);
  ctx.fill();
  ctx.strokeStyle = `rgba(150,200,255,${0.7 + pulse * 0.25})`;
  ctx.lineWidth = 2;
  roundRect(ctx, hx - fw / 2, hy - fh / 2, fw, fh, 6);
  ctx.stroke();

  // 双眼（竖瞳 + 扫描线）
  const eyeY = hy - 6;
  for (const side of [-1, 1]) {
    const ex = hx + side * 9;
    ctx.fillStyle = 'rgba(0,10,30,0.95)';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!reduced) {
      ctx.shadowColor = 'rgba(100,220,255,0.95)';
      ctx.shadowBlur = 10 + pulse * 6;
    }
    ctx.fillStyle = `rgba(120,230,255,${0.75 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 2.2, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!reduced) ctx.shadowBlur = 0;
    // 瞳心
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(ex, eyeY - 1.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // 口：滚动推荐条
  const mouthWords = ['为你推荐', '下一首', '猜你喜欢', '别划走', '热榜'];
  const mw = mouthWords[Math.floor(gameTime / 700) % mouthWords.length];
  ctx.fillStyle = 'rgba(20,50,120,0.85)';
  roundRect(ctx, hx - 14, hy + 8, 28, 10, 2);
  ctx.fill();
  ctx.fillStyle = `rgba(180,220,255,${0.65 + pulse * 0.3})`;
  ctx.font = 'bold 7px serif';
  ctx.textAlign = 'center';
  ctx.fillText(mw, hx, hy + 15);

  // 头顶悬浮碎片屏（王冠）
  for (let i = -2; i <= 2; i++) {
    const cx = hx + i * 11;
    const cy = hy - fh / 2 - 10 - Math.abs(i) * 2 + Math.sin(t * 2.5 + i) * 2;
    const cw = 9;
    const ch = 12;
    ctx.fillStyle = i === 0 ? `rgba(80,160,255,${0.45 + pulse * 0.3})` : 'rgba(30,50,90,0.9)';
    ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    ctx.strokeStyle = `rgba(160,210,255,${0.5 + pulse * 0.2})`;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);
  }

  // 两侧轨道弹幕字
  const floatWords = [
    { t: '荐', ox: -48, oy: -20 },
    { t: '推', ox: 50, oy: -8 },
    { t: '茧', ox: -44, oy: 18 },
    { t: '核', ox: 46, oy: 24 },
  ];
  ctx.font = 'bold 10px serif';
  for (let i = 0; i < floatWords.length; i++) {
    const fw = floatWords[i];
    const fx = sx + fw.ox + Math.sin(t * 1.8 + i) * 4;
    const fy = by - 40 + fw.oy + Math.cos(t * 2 + i) * 3;
    ctx.fillStyle = `rgba(140,200,255,${0.35 + pulse * 0.25})`;
    ctx.fillText(fw.t, fx, fy);
  }

  // 名牌 + 交互
  const nameY = hy - fh / 2 - 28;
  ctx.fillStyle = 'rgba(10,16,32,0.82)';
  const label = e.name || '算法茧房·推荐之核';
  ctx.font = 'bold 11px serif';
  const lw = Math.min(160, ctx.measureText(label).width + 16);
  roundRect(ctx, sx - lw / 2, nameY - 10, lw, 18, 4);
  ctx.fill();
  ctx.strokeStyle = `rgba(120,180,255,${0.45 + pulse * 0.2})`;
  ctx.lineWidth = 1;
  roundRect(ctx, sx - lw / 2, nameY - 10, lw, 18, 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(200,230,255,0.95)';
  ctx.fillText(label, sx, nameY);

  if (near) {
    const p2 = 0.55 + Math.sin(gameTime * 0.009) * 0.4;
    ctx.fillStyle = `rgba(140,200,255,${p2})`;
    ctx.font = 'bold 11px serif';
    ctx.fillText('! 侵入茧房核心', sx, nameY - 18);
  }
  ctx.textAlign = 'left';
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
