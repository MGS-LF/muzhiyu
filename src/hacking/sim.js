import { W, H } from '../config.js';
import { SPAM } from './theme.js';

export const STEP_MS = 1000 / 60;
export const MARGIN = 28;
export const LAYER_MAX = 4;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function createSimState(opts = {}) {
  const shortRoute = !!opts.shortRoute;
  const hpMul = opts.hpMul ?? 1;
  const dmgMul = opts.dmgMul ?? 1;
  const spdMul = opts.spdMul ?? 1;
  const sanHit = opts.sanHit ?? 14;
  const layerMax = Math.max(1, Math.min(6, opts.layerMax ?? LAYER_MAX));
  let startLayer = opts.startLayer != null ? opts.startLayer : shortRoute ? Math.min(2, layerMax) : 1;
  startLayer = Math.max(1, Math.min(layerMax, startLayer));

  return {
    shortRoute,
    trial: !!opts.trial,
    bossLabel: opts.bossLabel || null,
    hpMul,
    dmgMul,
    spdMul,
    sanHit,
    frame: 0,
    layer: startLayer,
    layerMax,
    clearWait: 0,
    bossPhase: 1,
    player: {
      x: W * 0.5,
      y: H * 0.72,
      vx: 0,
      vy: 0,
      r: 14,
      fire: 0,
      dash: 0,
      dashCd: 0,
      inv: 0,
      aim: -Math.PI / 2,
      lastMx: 0,
      lastMy: -1,
    },
    enemies: [],
    bullets: [],
    shots: [],
    particles: [],
    trails: [],
    beams: [],
    spamFloats: [],
    rings: [],
    shake: 0,
    flash: 0,
    score: 0,
    pollution: 0,
    boss: null,
    done: null,
    banner: null,
    // 开局缓冲：敌人暂不射击、玩家短暂无敌
    grace: 0,
    summonCount: 0,
  };
}

function enemyStats(type, layer, hpMul) {
  const L = layer;
  const table = {
    turret: { s: 40, hp: Math.round((5 + L * 1.2) * hpMul) },
    chaser: { s: 30, hp: Math.round((3 + L * 0.7) * hpMul) },
    spinner: { s: 40, hp: Math.round((6 + L) * hpMul) },
    sniper: { s: 36, hp: Math.round((5 + L * 0.8) * hpMul) },
    elite: { s: 52, hp: Math.round((14 + L * 2) * hpMul) },
    mini: { s: 22, hp: Math.round(2 * hpMul) },
    boss: { s: 120, hp: Math.round((90 + L * 12) * hpMul) },
  };
  return table[type] || table.chaser;
}

export function spawnEnemy(state, type, x, y) {
  const st = enemyStats(type, state.layer, state.hpMul);
  const e = {
    type,
    x,
    y,
    vx: rand(-0.5, 0.5) * state.spdMul,
    vy: rand(-0.25, 0.25) * state.spdMul,
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.02, 0.02),
    cool: rand(40, 100) / state.spdMul,
    spiral: rand(0, Math.PI * 2),
    flash: 0,
    phase: 0,
    s: st.s,
    hp: st.hp,
    maxHp: st.hp,
  };
  state.enemies.push(e);
  if (type === 'boss') state.boss = e;
  return e;
}

export function spawnLayer(state) {
  state.enemies.length = 0;
  state.bullets.length = 0;
  state.beams.length = 0;
  state.shots.length = 0;
  state.boss = null;
  state.clearWait = 0;
  state.bossPhase = 1;
  state.summonCount = 0;
  // ~1.4s 缓冲，让玩家看清局面
  state.grace = 85;
  state.player.inv = Math.max(state.player.inv, 85);
  state.player.x = W * 0.5;
  state.player.y = H * 0.72;
  state.player.vx = 0;
  state.player.vy = 0;
  const L = state.layer;
  const cx = W * 0.5;
  const top = H * 0.2;

  // 最后一层固定终核（试炼 2/3 层时也能出 Boss）
  if (L >= state.layerMax) {
    const bossHpMul = state.shortRoute ? 0.72 : 1;
    const b = spawnEnemy(state, 'boss', cx, H * 0.22);
    b.hp = Math.round(b.hp * bossHpMul * (0.85 + state.layerMax * 0.05));
    b.maxHp = b.hp;
    // 一阶段不召唤；过载后再增殖
    b.summonCd = 9999;
    setBanner(state, state.bossLabel || '算法核心·复读巨像', 90);
    return;
  }

  if (L === 1) {
    spawnEnemy(state, 'turret', cx - 180, top + 20);
    spawnEnemy(state, 'turret', cx + 180, top + 20);
    spawnEnemy(state, 'chaser', cx, top + 90);
  } else if (L === 2) {
    spawnEnemy(state, 'turret', cx - 220, top);
    spawnEnemy(state, 'turret', cx + 220, top);
    spawnEnemy(state, 'spinner', cx, top + 40);
    spawnEnemy(state, 'chaser', cx - 100, top + 120);
    spawnEnemy(state, 'chaser', cx + 100, top + 120);
  } else {
    // L === 3 且非终层：精英包
    spawnEnemy(state, 'elite', cx - 140, top + 30);
    spawnEnemy(state, 'elite', cx + 140, top + 30);
    spawnEnemy(state, 'sniper', cx, top + 10);
    spawnEnemy(state, 'spinner', cx, top + 100);
  }
}

export function setBanner(state, text, life = 70) {
  state.banner = { text, life };
}

export function burst(state, x, y, n, color, speed = 4) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(0.5, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 18 + ((Math.random() * 20) | 0),
      color,
    });
  }
}

function nearestEnemy(state, x, y) {
  let best = null;
  let bestD = 1e12;
  for (const e of state.enemies) {
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function hurtPlayer(state, heart) {
  if (state.player.inv > 0 || state.done) return false;
  const p = state.player;
  p.inv = 90;
  state.shake = 14;
  state.flash = 18;
  burst(state, p.x, p.y, 16, '#cc4444', 5);
  heart.hp = Math.max(0, heart.hp - state.sanHit);
  state.pollution = Math.min(100, state.pollution + 12);
  if (heart.hp <= 0) {
    state.done = 'lose';
    setBanner(state, '理性崩坏', 120);
  }
  return true;
}

export function stepSim(state, inputSnap, heart) {
  if (state.done) {
    state.frame++;
    tickFx(state);
    return;
  }

  state.frame++;
  if (state.grace > 0) state.grace--;
  const p = state.player;
  const k = state.spdMul;
  // 跟手：目标速度插值，松键快速刹车（不再沿用 last 方向漂移）
  const MAX = 7.2;
  const LERP = 0.28;
  const BRAKE = 0.78;
  const mx = inputSnap.mx || 0;
  const my = inputSnap.my || 0;
  if (mx || my) {
    p.lastMx = mx;
    p.lastMy = my;
  }

  if (p.dash > 0) {
    p.dash--;
    const a = mx || my ? Math.atan2(my, mx) : Math.atan2(p.vy, p.vx) || -Math.PI / 2;
    p.vx = Math.cos(a) * 16;
    p.vy = Math.sin(a) * 16;
  } else if (mx || my) {
    const len = Math.hypot(mx, my) || 1;
    const tx = (mx / len) * MAX;
    const ty = (my / len) * MAX;
    p.vx += (tx - p.vx) * LERP;
    p.vy += (ty - p.vy) * LERP;
  } else {
    p.vx *= BRAKE;
    p.vy *= BRAKE;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
    if (Math.abs(p.vy) < 0.05) p.vy = 0;
  }
  if (p.dashCd > 0) p.dashCd--;
  if (inputSnap.dash && p.dashCd <= 0 && p.dash <= 0) {
    p.dash = 10;
    p.dashCd = 48;
    p.inv = Math.max(p.inv, 14);
    burst(state, p.x, p.y, 6, 'rgba(232,220,200,0.5)', 3);
  }

  p.x = Math.max(MARGIN, Math.min(W - MARGIN, p.x + p.vx));
  p.y = Math.max(MARGIN, Math.min(H - MARGIN, p.y + p.vy));
  if (p.inv > 0) p.inv--;

  // 瞄准：鼠标优先 → 移动方向 → 上一帧朝向（不拿 last 当移动）
  if (inputSnap.aimX != null && inputSnap.aimY != null) {
    p.aim = Math.atan2(inputSnap.aimY - p.y, inputSnap.aimX - p.x);
  } else if (mx || my) {
    p.aim = Math.atan2(my, mx);
  } else if (Math.hypot(p.vx, p.vy) > 0.4) {
    p.aim = Math.atan2(p.vy, p.vx);
  }

  // 缓冲期也可射击，便于就位；敌人此时不射
  if (inputSnap.fire) {
    if (--p.fire <= 0) {
      p.fire = 5;
      const a = p.aim;
      const sp = 12.5;
      state.shots.push({
        x: p.x + Math.cos(a) * 18,
        y: p.y + Math.sin(a) * 18,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 90,
        dmg: 1,
      });
    }
  } else {
    p.fire = 0;
  }

  if (Math.hypot(p.vx, p.vy) > 4.5 || p.dash > 0) {
    state.trails.push({ x: p.x, y: p.y, a: p.aim, life: 12 });
  }
  state.trails = state.trails.filter((t) => --t.life > 0);

  updateShots(state);
  updateEnemies(state, heart, k);
  updateBeams(state, heart);
  updateBullets(state, heart);
  tickFx(state);

  if (state.enemies.length === 0 && state.frame > 40) {
    state.clearWait++;
    if (state.clearWait === 1) {
      state.rings.push({ x: p.x, y: p.y, r: 16, life: 40 });
      setBanner(state, state.layer < state.layerMax ? '协议层突破' : '核心崩解', 70);
    }
    if (state.clearWait > 55) {
      if (state.layer >= state.layerMax) {
        state.done = 'win';
      } else {
        state.layer++;
        spawnLayer(state);
        setBanner(state, `协议层 ${String(state.layer).padStart(2, '0')}`, 60);
      }
    }
  }

  if (state.frame % 220 === 0) {
    const left = Math.random() < 0.5;
    state.spamFloats.push({
      text: pick(SPAM),
      x: left ? -280 : W + 280,
      y: rand(H * 0.12, H * 0.75),
      vx: (left ? 1 : -1) * rand(0.6, 1.1),
      life: 0,
    });
  }
  state.spamFloats = state.spamFloats.filter((s) => {
    s.x += s.vx;
    s.life++;
    return s.x > -420 && s.x < W + 420;
  });
}

function tickFx(state) {
  if (state.shake > 0) state.shake *= 0.88;
  if (state.shake < 0.3) state.shake = 0;
  if (state.flash > 0) state.flash--;
  if (state.banner && --state.banner.life <= 0) state.banner = null;
  state.particles = state.particles.filter((pt) => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vx *= 0.95;
    pt.vy *= 0.95;
    return --pt.life > 0;
  });
  state.rings = state.rings.filter((r) => {
    r.r += 12;
    return --r.life > 0;
  });
}

function updateShots(state) {
  const next = [];
  for (const g of state.shots) {
    g.x += g.vx;
    g.y += g.vy;
    if (g.life != null) g.life--;
    let hit = false;
    for (const e of state.enemies) {
      const hitR = e.s * 0.55 + 6;
      if ((g.x - e.x) ** 2 + (g.y - e.y) ** 2 < hitR * hitR) {
        e.hp -= g.dmg || 1;
        e.flash = 5;
        burst(state, g.x, g.y, 4, '#e8dcc8', 3);
        state.score += 10;
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        if (b.kind === 'geng' && (g.x - b.x) ** 2 + (g.y - b.y) ** 2 < 20 * 20) {
          state.bullets.splice(i, 1);
          burst(state, b.x, b.y, 5, '#d4a85a', 3);
          state.score += 2;
          hit = true;
          break;
        }
      }
    }
    if (
      !hit &&
      (g.life == null || g.life > 0) &&
      g.x > -40 &&
      g.x < W + 40 &&
      g.y > -40 &&
      g.y < H + 40
    ) {
      next.push(g);
    }
  }
  state.shots = next;
}

function updateEnemies(state, heart, k) {
  const p = state.player;
  const born = [];
  const live = [];

  for (const g of state.enemies) {
    g.rot += g.vr;
    g.phase = (g.phase + 1) % 210;
    if (g.flash > 0) g.flash--;

    if (g.type === 'chaser' || g.type === 'mini') {
      const a = Math.atan2(p.y - g.y, p.x - g.x);
      const acc = g.type === 'mini' ? 0.14 : 0.09;
      g.vx += Math.cos(a) * acc * k;
      g.vy += Math.sin(a) * acc * k;
      g.vx *= 0.982;
      g.vy *= 0.982;
    }

    if (g.type === 'boss') {
      g.x = W * 0.5 + Math.sin(state.frame * 0.008) * 90;
      g.y = H * 0.22 + Math.sin(state.frame * 0.013) * 24;
      if (g.hp <= g.maxHp * 0.5 && state.bossPhase === 1) {
        state.bossPhase = 2;
        g.summonCd = 120;
        state.summonCount = 0;
        setBanner(state, '核心过载——节点开始增殖', 90);
        state.shake = 18;
        burst(state, g.x, g.y, 40, '#cc4444', 7);
      }
    } else {
      g.x += g.vx;
      g.y += g.vy;
      if (g.x < g.s || g.x > W - g.s) g.vx *= -1;
      if (g.y < g.s || g.y > H * 0.86) g.vy *= -1;
    }

    // 开局缓冲：只移动，不射击
    const canFire = state.grace <= 0;

    if (canFire && g.type === 'turret' && --g.cool <= 0) {
      g.cool = Math.max(42, rand(70, 120) / k);
      const n = 8 + Math.min(6, state.layer * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + g.rot;
        pushBullet(state, g.x, g.y, Math.cos(a) * 1.8 * k, Math.sin(a) * 1.8 * k, 'geng');
      }
    }

    if (canFire && g.type === 'spinner') {
      g.spiral += 0.2;
      if (state.frame % 4 === 0) {
        pushBullet(state, g.x, g.y, Math.cos(g.spiral) * 2.1 * k, Math.sin(g.spiral) * 2.1 * k, 'geng');
      }
    }

    if (canFire && g.type === 'sniper' && --g.cool <= 0) {
      g.cool = rand(130, 190) / k;
      state.beams.push({
        x: g.x,
        y: g.y,
        a: Math.atan2(p.y - g.y, p.x - g.x),
        t: 38,
        sx: g.x,
        sy: g.y,
      });
    }

    if (canFire && g.type === 'elite' && --g.cool <= 0) {
      g.cool = Math.max(48, rand(80, 130) / k);
      const a = Math.atan2(p.y - g.y, p.x - g.x);
      for (const off of [-0.22, 0, 0.22]) {
        pushBullet(state, g.x, g.y, Math.cos(a + off) * 2.7 * k, Math.sin(a + off) * 2.7 * k, 'silent');
      }
    }

    if (g.type === 'boss') {
      // 仅二阶段增殖，CD 拉长，全场最多 2 次提示
      if (state.bossPhase >= 2) {
        if (g.summonCd == null || g.summonCd > 2000) g.summonCd = 160;
        if (--g.summonCd <= 0) {
          const adds = state.enemies.filter((e) => e !== g).length;
          const cap = 4;
          g.summonCd = Math.max(220, 280 / k);
          if (adds < cap) {
            born.push({ type: 'mini', x: g.x - 60, y: g.y + 40 });
            born.push({ type: 'mini', x: g.x + 60, y: g.y + 40 });
            if (adds < 2) born.push({ type: 'chaser', x: g.x, y: g.y + 70 });
            state.summonCount = (state.summonCount || 0) + 1;
            if (state.summonCount <= 2) {
              setBanner(state, '节点增殖——协议体涌出', 50);
            }
            burst(state, g.x, g.y + 30, 14, '#c96f3b', 4);
          }
        }
      }

      if (canFire && --g.cool <= 0) {
        const mode = (g.spiral++ | 0) % (state.bossPhase === 2 ? 4 : 3);
        g.cool = Math.max(32, (state.bossPhase === 2 ? 52 : 75) / k);
        if (mode === 0) {
          for (let ring = 0; ring < 2; ring++) {
            for (let i = 0; i < 14; i++) {
              const a = (i / 14) * Math.PI * 2 + ring * 0.18 + g.rot;
              const sp = (1.5 + ring * 0.65) * k;
              pushBullet(state, g.x, g.y, Math.cos(a) * sp, Math.sin(a) * sp, 'geng');
            }
          }
        } else if (mode === 1) {
          const a = Math.atan2(p.y - g.y, p.x - g.x);
          for (const off of [-0.35, -0.18, 0, 0.18, 0.35]) {
            pushBullet(state, g.x, g.y, Math.cos(a + off) * 3 * k, Math.sin(a + off) * 3 * k, 'silent');
          }
        } else if (mode === 2) {
          for (let i = 0; i < 18; i++) {
            const a = rand(0, Math.PI * 2);
            const sp = rand(1.1, 2.5) * k;
            pushBullet(state, g.x, g.y, Math.cos(a) * sp, Math.sin(a) * sp, 'geng', true);
          }
        } else if (mode === 3) {
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + state.frame * 0.02;
            pushBullet(state, g.x, g.y, Math.cos(a) * 2.4 * k, Math.sin(a) * 2.4 * k, 'silent');
          }
        }
      }
    }

    if (p.inv <= 0 && Math.abs(p.x - g.x) < g.s / 2 + 10 && Math.abs(p.y - g.y) < g.s / 2 + 10) {
      hurtPlayer(state, heart);
    }

    if (g.hp <= 0) {
      const big = g.type === 'boss';
      burst(state, g.x, g.y, big ? 70 : 22, big ? '#cc4444' : '#d4a85a', big ? 9 : 5);
      state.score += big ? 1000 : g.type === 'elite' ? 280 : 100;
      state.shake = Math.max(state.shake, big ? 20 : 8);
      if (big) {
        state.rings.push({ x: g.x, y: g.y, r: 28, life: 55 });
        state.boss = null;
      }
      continue;
    }
    live.push(g);
  }

  state.enemies = live;
  for (const b of born) spawnEnemy(state, b.type, b.x, b.y);
}

function pushBullet(state, x, y, vx, vy, kind, withText = false) {
  const b = { x, y, vx, vy, kind, r: kind === 'geng' ? 8 : 7 };
  if (withText || (kind === 'geng' && Math.random() < 0.35)) b.text = pick(SPAM);
  state.bullets.push(b);
}

function updateBeams(state, heart) {
  const p = state.player;
  state.beams = state.beams.filter((bm) => {
    bm.t--;
    if (bm.t === 0) {
      state.bullets.push({
        x: bm.sx,
        y: bm.sy,
        vx: Math.cos(bm.a) * 8.2 * state.spdMul,
        vy: Math.sin(bm.a) * 8.2 * state.spdMul,
        kind: 'silent',
        r: 7,
      });
      return false;
    }
    return true;
  });
}

function updateBullets(state, heart) {
  const p = state.player;
  state.bullets = state.bullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    if (p.inv <= 0 && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + 8) ** 2) {
      hurtPlayer(state, heart);
      return false;
    }
    return b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30;
  });
}

let _rmbWasDown = false;

export function readInput(input) {
  const mv = input.moveVec();
  let mx = mv.x;
  let my = mv.y;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  // 原版手感：按住左键射击；空格/E/K 也可；Shift / 右键闪避
  const fire =
    (typeof input.mouseDown === 'function' && input.mouseDown()) ||
    input.isDown(' ') ||
    input.isDown('e') ||
    input.isDown('k');

  let dash = input.wasPressed('shift');
  if (typeof input.mouseRightDown === 'function') {
    const rmb = input.mouseRightDown();
    if (rmb && !_rmbWasDown) dash = true;
    _rmbWasDown = rmb;
  }

  let aimX = null;
  let aimY = null;
  if (typeof input.mouseCanvas === 'function') {
    const m = input.mouseCanvas();
    if (m && Number.isFinite(m.x) && Number.isFinite(m.y)) {
      aimX = m.x;
      aimY = m.y;
    }
  }
  return { mx, my, fire, dash, aimX, aimY };
}
