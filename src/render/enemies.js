// 渲染模块：enemies
import { W, H } from '../config.js';
import { roundRect } from './util.js';

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
// 弹幕
// ============================================================
export function drawBullets(ctx, W2S, bullets) {
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
