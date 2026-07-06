// 渲染模块：world
import { W, H } from '../config.js';
import { drawLostPerson } from './scenes_street.js';

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
