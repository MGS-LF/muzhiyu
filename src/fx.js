// 视觉特效系统 —— 屏幕级反馈：震动、闪烁、过渡、SAN 值低扭曲
// 设计：单例状态，由 render.js 每帧消费并叠加到画面
// 触发点：受伤(hit)、净化(purify)、场景切换(transition)、死亡(death)、低SAN(lowSan)

const state = {
  // 屏幕震动 { intensity, duration, elapsed }
  shake: null,
  // 全屏闪光 { color, alpha, duration, elapsed }
  flash: null,
  // 场景过渡 { phase: 'out'|'in', alpha, duration, callback }
  transition: null,
  // 持续视觉扭曲（SAN低时）{ intensity: 0-1 }
  distortion: 0,
  // 净化波动画 { radius, maxRadius, x, y, alpha }
  purifyWave: null,
  // 受伤红色边缘 { alpha, duration, elapsed }
  hurtVignette: null,
};

// ---------- 屏幕震动 ----------
export function shake(intensity = 8, duration = 300) {
  // 取更强的震动（不覆盖进行中的更强震动）
  if (state.shake && state.shake.intensity > intensity) return;
  state.shake = { intensity, duration, elapsed: 0 };
}

// ---------- 全屏闪光 ----------
export function flash(color = '#ffffff', alpha = 0.6, duration = 200) {
  state.flash = { color, alpha, duration, elapsed: 0 };
}

// ---------- 场景过渡 ----------
// 用法：transition(600, () => game.loadScene(...))
export function transition(duration = 500, callback) {
  state.transition = { phase: 'out', alpha: 0, duration: duration / 2, callback, elapsed: 0 };
}

// ---------- 净化波 ----------
export function purifyWave(x, y, maxRadius = 600) {
  state.purifyWave = { radius: 0, maxRadius, x, y, alpha: 1 };
}

// ---------- 受伤边缘红光 ----------
export function hurtVignette(duration = 400) {
  state.hurtVignette = { alpha: 0.5, duration, elapsed: 0 };
}

// ---------- 设置持续扭曲强度（SAN低时调用）----------
export function setDistortion(intensity) {
  state.distortion = Math.max(0, Math.min(1, intensity));
}

// ---------- 每帧更新（由 game loop 调用）----------
export function update(dt) {
  if (state.shake) {
    state.shake.elapsed += dt;
    if (state.shake.elapsed >= state.shake.duration) state.shake = null;
  }
  if (state.flash) {
    state.flash.elapsed += dt;
    if (state.flash.elapsed >= state.flash.duration) state.flash = null;
  }
  if (state.transition) {
    const tr = state.transition;
    tr.elapsed += dt;
    const p = Math.min(1, tr.elapsed / tr.duration);
    tr.alpha = tr.phase === 'out' ? p : (1 - p);
    if (p >= 1) {
      if (tr.phase === 'out') {
        tr.phase = 'in';
        tr.elapsed = 0;
        if (tr.callback) { tr.callback(); tr.callback = null; }
      } else {
        state.transition = null;
      }
    }
  }
  if (state.purifyWave) {
    const pw = state.purifyWave;
    pw.radius += dt * 1.2;
    pw.alpha = Math.max(0, 1 - pw.radius / pw.maxRadius);
    if (pw.radius >= pw.maxRadius) state.purifyWave = null;
  }
  if (state.hurtVignette) {
    state.hurtVignette.elapsed += dt;
    const p = state.hurtVignette.elapsed / state.hurtVignette.duration;
    state.hurtVignette.alpha = 0.5 * (1 - p);
    if (p >= 1) state.hurtVignette = null;
  }
}

// ---------- 渲染叠加层（由 render.js 在最后调用）----------
// offset: 已计算的震动偏移，返回给调用方应用到画面
export function getShakeOffset() {
  if (!state.shake) return { x: 0, y: 0 };
  const p = state.shake.elapsed / state.shake.duration;
  const decay = 1 - p;
  const i = state.shake.intensity * decay;
  return {
    x: (Math.random() * 2 - 1) * i,
    y: (Math.random() * 2 - 1) * i,
  };
}

export function drawOverlay(ctx, gameTime) {
  const { W, H } = { W: 1200, H: 760 };

  // 全屏闪光
  if (state.flash) {
    const p = 1 - state.flash.elapsed / state.flash.duration;
    ctx.save();
    ctx.globalAlpha = state.flash.alpha * Math.max(0, p);
    ctx.fillStyle = state.flash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 净化波（金色扩散圆环）
  if (state.purifyWave) {
    const pw = state.purifyWave;
    ctx.save();
    ctx.globalAlpha = pw.alpha * 0.6;
    ctx.strokeStyle = '#ffd866';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ffcc44';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(pw.x, pw.y, pw.radius, 0, Math.PI * 2);
    ctx.stroke();
    // 内层柔光
    ctx.globalAlpha = pw.alpha * 0.15;
    ctx.fillStyle = '#ffe899';
    ctx.beginPath();
    ctx.arc(pw.x, pw.y, pw.radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 受伤红色边缘
  if (state.hurtVignette && state.hurtVignette.alpha > 0) {
    ctx.save();
    const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 700);
    g.addColorStop(0, 'rgba(204,68,68,0)');
    g.addColorStop(1, `rgba(204,68,68,${state.hurtVignette.alpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // SAN 值低持续扭曲：绿色噪点 + 边缘渐变
  if (state.distortion > 0) {
    ctx.save();
    const a = state.distortion;
    // 边缘绿色渐变
    const g = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 750);
    g.addColorStop(0, 'rgba(68,221,102,0)');
    g.addColorStop(1, `rgba(68,221,102,${0.25 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 随机绿色噪点
    const noiseCount = Math.floor(40 * a);
    ctx.fillStyle = `rgba(68,221,102,${0.4 * a})`;
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }

  // 场景过渡黑幕
  if (state.transition) {
    ctx.save();
    ctx.globalAlpha = state.transition.alpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// 查询：是否正在场景过渡中（过渡中禁止输入）
export function isTransitioning() {
  return state.transition !== null && state.transition.phase === 'out';
}

// 重置所有特效（场景切换/读档时）
export function reset() {
  state.shake = null;
  state.flash = null;
  state.purifyWave = null;
  state.hurtVignette = null;
  state.distortion = 0;
  // transition 不重置（让过渡动画自然完成）
}

export function getDistortion() { return state.distortion; }
