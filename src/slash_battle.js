// 划墨切梗 · 可移动护持 + 字盾发射 + 连切反馈
import { W, H } from './config.js';
import { input } from './input.js';
import * as audio from './audio.js';
import * as fx from './fx.js';
import * as difficulty from './difficulty.js';
import { PACE } from './pacing.js';

const MEME_WORDS = ['YYDS', '绝绝子', '蚌埠住了', '啊对对对', '泰裤辣', 'emo', '栓Q', '6', '绝了', '好家伙'];
const CARVE_GLYPHS = ['关', '雎', '洲', '逑', '浩', '然', '正', '气'];

export const SLASH_LAYOUT = {
  enemyX: () => W / 2,
  enemyY: () => 96,
  guardR: 40,
  shieldR: 72,
  arenaTop: () => 160,
  arenaBottom: () => H - 70,
};

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function segIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
  if (![x1, y1, x2, y2, cx, cy, r].every((n) => Number.isFinite(n))) return false;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  const dist = Math.hypot(cx - px, cy - py);
  return { hit: dist <= r, dist, t };
}

export class SlashBattle {
  constructor(enemy, player, onEnd, game = null) {
    const mul = difficulty.currentMul();
    const ng = player.ngPlus ? 1.4 : 1;
    const baseHp = enemy.hp || 30;
    const baseMax = enemy.maxHp || 30;
    const typeId = enemy.typeId || 'geng_weak';
    let slashHpMul = 4.5;
    if (enemy.boss || typeId === 'geng_boss') slashHpMul = 5.8;
    else if (typeId === 'geng_medium' || typeId === 'geng_elite' || (baseMax || 0) >= 50) slashHpMul = 5.1;
    const hp = Math.round(baseHp * mul.enemyHp * ng * slashHpMul);
    const maxHp = Math.round(baseMax * mul.enemyHp * ng * slashHpMul);

    this.isSlash = true;
    this.mode = 'slash';
    this.enemy = { ...enemy, hp, maxHp, name: enemy.name || '梗鬼', typeId };
    this.player = player;
    this.onEnd = onEnd;
    this.game = game;
    this.isBoss = !!enemy.boss;
    this.mul = mul;

    this.phase = 'intro';
    this.timer = 0;
    this.result = null;
    this.fadeAlpha = 1;

    this.san = player.san;
    this.maxSan = player.maxSan || 100;

    // 可移动护持（你）
    this.px = W / 2;
    this.py = H * 0.62;
    this.pSpeed = 2.85;
    this.dashCd = 0;
    this.invuln = 0;

    // 字盾：环绕 + 可发射
    this.shieldRot = 0;
    this.orbit = []; // {char, ang, state:'orbit'|'fly'|'return', x,y,vx,vy, life}
    this._rebuildOrbit(true);

    this.stroke = [];
    this.slashing = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.cuts = 0;
    this.cutIFrame = 0;
    this.bestCombo = 0;
    this.perfects = 0;

    this.words = [];
    this.spawnTimer = 0;
    this.spawnEvery = this.isBoss ? 320 : 420;

    this.shards = [];
    this.particles = [];
    this.floats = [];
    this.spitFx = [];
    this.slashBursts = [];
    this.rings = []; // 连切金环 {x,y,r,life,maxLife}

    this.carve = null;
    this.timeScale = 1; // 连切顿帧
    this.hint = 'WASD 移动 · 拖动切开 · 右键/F 发射字盾 · 空格闪避 · K 大招';
    this.enemyText = '……嘴一张，烂梗喷出来了……';
    this.enemyTextTimer = 2000;
    this._pointerDown = false;
    this.mouthOpen = 0;
    this._rDown = false;
  }

  _rebuildOrbit(initial = false) {
    const bag = (this.player.collectedCharsAll || []).slice(0, 6);
    // 保留飞行中的字
    const flying = this.orbit.filter((o) => o.state !== 'orbit');
    const n = Math.max(bag.length, initial && bag.length === 0 ? 0 : bag.length);
    this.orbit = bag.map((ch, i) => {
      const prev = this.orbit && this.orbit.find((o) => o.char === ch && o.state === 'orbit');
      return {
        char: ch,
        ang: prev ? prev.ang : (i / Math.max(1, n)) * Math.PI * 2,
        state: 'orbit',
        x: this.px,
        y: this.py,
        vx: 0,
        vy: 0,
        life: 0,
      };
    });
    // 飞行中的补回（弹药字）
    for (const f of flying) {
      if (f.state !== 'orbit') this.orbit.push(f);
    }
  }

  setEnemyText(t) {
    this.enemyText = t;
    this.enemyTextTimer = 1600;
  }

  isDone() {
    return this.phase === 'result' && this.timer > (PACE.battle?.resultMs || 950);
  }

  finish() {
    if (this.onEnd) this.onEnd(this.result, this.enemy);
  }

  _pointer() {
    const m = input.mouseCanvas();
    return { x: m.x, y: m.y, down: input.mouseDown(), rdown: input.mouseRightDown() };
  }

  update(dt) {
    if (this.game && (this.game.uiPanel || this.game._saveMenu)) return;
    // 顿帧
    const raw = dt;
    if (this.timeScale < 1) {
      this.timeScale = Math.min(1, this.timeScale + raw * 0.004);
    }
    dt = raw * this.timeScale;

    this.timer += raw;
    this.fadeAlpha = Math.max(0, this.fadeAlpha - raw * 0.003);
    if (this.enemyTextTimer > 0) this.enemyTextTimer -= raw;
    if (this.comboTimer > 0) {
      this.comboTimer -= raw;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.cutIFrame > 0) this.cutIFrame -= raw;
    if (this.dashCd > 0) this.dashCd -= raw;
    if (this.invuln > 0) this.invuln -= raw;
    if (this.mouthOpen > 0) this.mouthOpen = Math.max(0, this.mouthOpen - raw * 0.004);

    this._tickFx(raw);
    this.stroke = this.stroke.filter((p) => this.timer - p.t < 220);

    if (this.phase === 'intro') {
      if (this.timer > 900) {
        this.phase = 'fight';
        this.timer = 0;
        this.setEnemyText('字从我嘴里喷——你有刀，也有盾！');
        this.hint = 'WASD 移动 · 拖动切开 · 右键/F 射字 · 空格闪避 · K 大招';
        for (let i = 0; i < 3; i++) this.spawnWord(1 + i * 0.12);
      }
      return;
    }
    if (this.phase === 'result') {
      if (this.timer > (PACE.battle?.resultMs || 950)) this.finish();
      return;
    }
    if (this.phase === 'carve') {
      this.updateCarve(dt);
      return;
    }
    if (this.phase === 'fight') this.updateFight(dt, raw);
  }

  _tickFx(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.x += s.vx * (dt / 16);
      s.y += s.vy * (dt / 16);
      s.rot += s.vr * (dt / 16);
      s.vy += 0.14 * (dt / 16);
      s.life -= dt;
      if (s.life <= 0) this.shards.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      this.floats[i].y -= 0.45 * (dt / 16);
      this.floats[i].life -= dt;
      if (this.floats[i].life <= 0) this.floats.splice(i, 1);
    }
    for (let i = this.spitFx.length - 1; i >= 0; i--) {
      this.spitFx[i].life -= dt;
      this.spitFx[i].y += 0.35 * (dt / 16);
      if (this.spitFx[i].life <= 0) this.spitFx.splice(i, 1);
    }
    for (let i = this.slashBursts.length - 1; i >= 0; i--) {
      this.slashBursts[i].life -= dt;
      if (this.slashBursts[i].life <= 0) this.slashBursts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += (dt / 16) * 6;
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
  }

  updateFight(dt, rawDt) {
    if (this.result) return;
    const ptr = this._pointer();
    const L = SLASH_LAYOUT;

    // —— 移动 ——
    let mx = 0,
      my = 0;
    if (input.isDown('a') || input.isDown('arrowleft')) mx -= 1;
    if (input.isDown('d') || input.isDown('arrowright')) mx += 1;
    if (input.isDown('w') || input.isDown('arrowup')) my -= 1;
    if (input.isDown('s') || input.isDown('arrowdown')) my += 1;
    const mlen = Math.hypot(mx, my) || 1;
    const sp = this.pSpeed * (this.invuln > 0 ? 1.35 : 1);
    this.px += (mx / mlen) * sp * (dt / 16) * 10;
    this.py += (my / mlen) * sp * (dt / 16) * 10;
    this.px = Math.max(50, Math.min(W - 50, this.px));
    this.py = Math.max(L.arenaTop(), Math.min(L.arenaBottom(), this.py));

    // 空格闪避
    if ((input.wasPressed(' ') || input.wasPressed('shift')) && this.dashCd <= 0) {
      const dx = mx || 0;
      const dy = my || -1;
      const dlen = Math.hypot(dx, dy) || 1;
      this.px += (dx / dlen) * 70;
      this.py += (dy / dlen) * 70;
      this.px = Math.max(50, Math.min(W - 50, this.px));
      this.py = Math.max(L.arenaTop(), Math.min(L.arenaBottom(), this.py));
      this.dashCd = 700;
      this.invuln = 320;
      audio.playSfx('ui');
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: this.px,
          y: this.py,
          vx: rand(-3, 3),
          vy: rand(-3, 3),
          life: 280,
          maxLife: 280,
          color: '255,220,140',
          size: 3,
        });
      }
    }

    // 字盾环绕
    this.shieldRot += 0.0018 * dt;
    this._updateOrbit(dt);

    // 右键 / F 发射字盾
    const rdown = ptr.rdown;
    if ((rdown && !this._rDown) || input.wasPressed('f')) {
      this.fireShield(ptr.x, ptr.y);
    }
    this._rDown = rdown;

    // 划线
    if (ptr.down && Number.isFinite(ptr.x)) {
      if (!this._pointerDown) {
        this._pointerDown = true;
        this.slashing = true;
        this.stroke = [{ x: ptr.x, y: ptr.y, t: this.timer }];
      } else {
        const last = this.stroke[this.stroke.length - 1];
        if (!last || Math.hypot(ptr.x - last.x, ptr.y - last.y) > 3) {
          this.stroke.push({ x: ptr.x, y: ptr.y, t: this.timer });
          this.tryCutWithStroke();
        }
      }
    } else if (this._pointerDown) {
      this._pointerDown = false;
      this.slashing = false;
    }

    if (input.wasPressed('k')) this.tryStartCarve();

    // 吐字
    this.spawnTimer += dt;
    const hpRatio = this.enemy.maxHp > 0 ? this.enemy.hp / this.enemy.maxHp : 1;
    const pressure = 1 + Math.min(1.25, this.cuts * 0.03 + (1 - hpRatio) * 0.9);
    const every = this.spawnEvery / pressure;
    const maxWords = Math.floor((this.isBoss ? 14 : 11) * (this.mul.bulletCount || 1));
    if (this.spawnTimer > every && this.words.length < maxWords) {
      this.spawnTimer = 0;
      this.spawnWord(pressure);
      if (pressure > 1.5 && Math.random() < 0.32) this.spawnWord(pressure);
    }

    // 飞字
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      if (!w) {
        this.words.splice(i, 1);
        continue;
      }
      w.x += w.vx * (dt / 16);
      w.y += w.vy * (dt / 16);
      w.rot += w.vr * (dt / 16);
      if (w.scaleIn < 1) w.scaleIn = Math.min(1, w.scaleIn + 0.1);
      const pull = 0.00014 + (1 - hpRatio) * 0.0001;
      w.vx += (this.px - w.x) * pull * (dt / 16);
      w.vy += (this.py - w.y) * pull * (dt / 16);
      w.life -= dt;
      if (w.hitFlash > 0) w.hitFlash -= dt;

      // 字盾环绕格挡
      if (this._orbitBlocks(w)) {
        this._popWord(w, i, true);
        continue;
      }

      if (this.invuln <= 0 && Math.hypot(w.x - this.px, w.y - this.py) < L.guardR) {
        this.hitPlayer(w);
        this.words.splice(i, 1);
        continue;
      }
      if (w.life <= 0 || w.x < -120 || w.x > W + 120 || w.y < -120 || w.y > H + 120) {
        this.words.splice(i, 1);
      }
    }

    // 飞行字碰撞
    this._updateFlyingChars(dt);
  }

  _updateOrbit(dt) {
    const bag = (this.player.collectedCharsAll || []).slice(0, 6);
    // 同步数量：只增不减飞行中的
    while (this.orbit.filter((o) => o.state === 'orbit').length < bag.length) {
      const ch = bag[this.orbit.filter((o) => o.state === 'orbit').length] || '言';
      this.orbit.push({
        char: ch,
        ang: Math.random() * Math.PI * 2,
        state: 'orbit',
        x: this.px,
        y: this.py,
        vx: 0,
        vy: 0,
        life: 0,
      });
    }
    // 更新 orbit 位置
    const orbs = this.orbit.filter((o) => o.state === 'orbit');
    const n = orbs.length || 1;
    let k = 0;
    for (const o of this.orbit) {
      if (o.state !== 'orbit') continue;
      o.ang = this.shieldRot + (k / n) * Math.PI * 2;
      o.x = this.px + Math.cos(o.ang) * SLASH_LAYOUT.shieldR;
      o.y = this.py + Math.sin(o.ang) * SLASH_LAYOUT.shieldR;
      // 刷新显示字
      if (bag[k]) o.char = bag[k];
      k++;
    }
  }

  _orbitBlocks(w) {
    for (const o of this.orbit) {
      if (o.state !== 'orbit') continue;
      if (Math.hypot(w.x - o.x, w.y - o.y) < (w.r || 16) * 0.55 + 14) {
        // 格挡：字盾震一下，清掉该弹，轻伤怪
        this.enemy.hp = Math.max(0, this.enemy.hp - 1);
        this.particles.push({
          x: o.x,
          y: o.y,
          vx: rand(-2, 2),
          vy: rand(-2, 2),
          life: 300,
          maxLife: 300,
          color: '255,220,120',
          size: 4,
          glyph: o.char,
        });
        this.floats.push({ x: o.x, y: o.y - 10, text: '格挡', life: 400, color: '255,230,150' });
        if (this.enemy.hp <= 0) this.win('purify');
        return true;
      }
    }
    return false;
  }

  fireShield(tx, ty) {
    if (this.result) return;
    const orb = this.orbit.find((o) => o.state === 'orbit');
    if (!orb) {
      this.setEnemyText('字盾空了——多捡汉字！');
      audio.playSfx('uiCancel');
      return;
    }
    // 消耗弹药槽一个 collectedChars（若有）
    if (this.player.collectedChars && this.player.collectedChars.length) {
      this.player.collectedChars.pop();
    }
    const aimX = Number.isFinite(tx) ? tx : W / 2;
    const aimY = Number.isFinite(ty) ? ty : 100;
    const ang = Math.atan2(aimY - this.py, aimX - this.px);
    orb.state = 'fly';
    orb.vx = Math.cos(ang) * 5.2;
    orb.vy = Math.sin(ang) * 5.2;
    orb.life = 900;
    orb.x = this.px + Math.cos(ang) * 20;
    orb.y = this.py + Math.sin(ang) * 20;
    audio.playSfx('purifyWave');
    this.setEnemyText(`「${orb.char}」飞出！`);
  }

  _updateFlyingChars(dt) {
    for (let i = this.orbit.length - 1; i >= 0; i--) {
      const o = this.orbit[i];
      if (o.state === 'orbit') continue;
      if (o.state === 'fly') {
        o.x += o.vx * (dt / 16);
        o.y += o.vy * (dt / 16);
        o.life -= dt;
        // 拖尾
        if (Math.random() < 0.5) {
          this.particles.push({
            x: o.x,
            y: o.y,
            vx: -o.vx * 0.1,
            vy: -o.vy * 0.1,
            life: 200,
            maxLife: 200,
            color: '255,220,120',
            size: 2,
          });
        }
        // 撞飞字
        for (let j = this.words.length - 1; j >= 0; j--) {
          const w = this.words[j];
          if (!w) continue;
          if (Math.hypot(w.x - o.x, w.y - o.y) < (w.r || 16) + 12) {
            this.cutWord(w, j, true);
            o.state = 'return';
            o.life = 600;
            break;
          }
        }
        // 撞敌人本体
        const ex = SLASH_LAYOUT.enemyX();
        const ey = SLASH_LAYOUT.enemyY();
        if (Math.hypot(o.x - ex, o.y - ey) < 40) {
          const dmg = 8 + Math.floor(Math.random() * 5);
          this.enemy.hp -= dmg;
          this.floats.push({ x: ex, y: ey + 30, text: `-${dmg}`, life: 600, color: '255,220,120' });
          fx.shake(4, 100);
          audio.playSfx('hit');
          o.state = 'return';
          o.life = 600;
          if (this.enemy.hp <= 0) this.win('purify');
        }
        if (o.life <= 0 || o.x < -40 || o.x > W + 40 || o.y < -40 || o.y > H + 40) {
          o.state = 'return';
          o.life = 500;
        }
      } else if (o.state === 'return') {
        const dx = this.px - o.x;
        const dy = this.py - o.y;
        const d = Math.hypot(dx, dy) || 1;
        o.vx = (dx / d) * 4.5;
        o.vy = (dy / d) * 4.5;
        o.x += o.vx * (dt / 16);
        o.y += o.vy * (dt / 16);
        o.life -= dt;
        if (d < 24 || o.life <= 0) {
          o.state = 'orbit';
          o.vx = 0;
          o.vy = 0;
        }
      }
    }
  }

  spawnWord(pressure = 1) {
    const ex = SLASH_LAYOUT.enemyX();
    const ey = SLASH_LAYOUT.enemyY() + 32;
    const text = MEME_WORDS[Math.floor(Math.random() * MEME_WORDS.length)];
    const sp = (this.isBoss ? 1.5 : 1.12) * (this.mul.bulletSpeed || 1) * (0.9 + pressure * 0.28);
    const ang = Math.atan2(this.py - ey, this.px - ex) + rand(-0.55, 0.55);
    const speed = rand(1.05, 1.95) * sp;
    const tough = Math.random() < 0.3;

    this.mouthOpen = 1;
    this.spitFx.push({ x: ex, y: ey, life: 300, text, maxLife: 300 });
    for (let i = 0; i < 10; i++) {
      const a = ang + rand(-0.6, 0.6);
      this.particles.push({
        x: ex,
        y: ey,
        vx: Math.cos(a) * rand(1.5, 4.5),
        vy: Math.sin(a) * rand(1.5, 4.5),
        life: 340,
        maxLife: 340,
        color: '90,255,130',
        size: rand(2, 5),
      });
    }

    this.words.push({
      text,
      x: ex + Math.cos(ang) * 14,
      y: ey + Math.sin(ang) * 14,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: 15 + text.length * 5,
      rot: rand(-0.25, 0.25),
      vr: rand(-0.05, 0.05),
      life: 10000,
      hp: tough ? 2 : 1,
      tough,
      hitFlash: 0,
      scaleIn: 0,
    });
  }

  tryCutWithStroke() {
    if (this.result || this.phase !== 'fight') return;
    if (this.stroke.length < 2 || this.cutIFrame > 0) return;
    const a = this.stroke[this.stroke.length - 2];
    const b = this.stroke[this.stroke.length - 1];
    if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(b.x)) return;

    const targets = [];
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      if (!w || !Number.isFinite(w.x)) continue;
      const hit = segIntersectsCircle(a.x, a.y, b.x, b.y, w.x, w.y, (w.r || 16) + 8);
      if (hit.hit) {
        targets.push({ i, perfect: hit.dist < (w.r || 16) * 0.35 });
        if (targets.length >= 3) break;
      }
    }
    let any = false;
    for (const t of targets) {
      if (this.result) break;
      const w = this.words[t.i];
      if (!w) continue;
      this.cutWord(w, t.i, false, t.perfect);
      any = true;
    }
    if (any) {
      this.cutIFrame = 45;
      audio.playSfx('hit');
    }
  }

  cutWord(w, index, fromProjectile = false, perfect = false) {
    if (!w || this.result) return;
    let idx = this.words.indexOf(w);
    if (idx < 0) idx = index;
    if (idx < 0 || idx >= this.words.length) return;

    if (w.hp > 1 && !fromProjectile) {
      w.hp -= 1;
      w.hitFlash = 220;
      w.vx *= 0.3;
      w.vy *= 0.3;
      this.combo += 1;
      this.comboTimer = 1200;
      this.slashBursts.push({ x: w.x, y: w.y, life: 200, maxLife: 200, ang: rand(0, Math.PI) });
      this.floats.push({ x: w.x, y: w.y - 12, text: '裂！', life: 420, color: '180,255,160' });
      const chip = Math.floor(1.2 + Math.min(this.combo, 8) * 0.4);
      this.enemy.hp = Math.max(0, this.enemy.hp - chip);
      if (this.enemy.hp <= 0) this.win('purify');
      return;
    }

    this.words.splice(idx, 1);
    this.cuts += 1;
    this.combo += 1;
    this.comboTimer = 1300;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    if (perfect) this.perfects += 1;

    const strokeA = this.stroke[this.stroke.length - 2];
    const strokeB = this.stroke[this.stroke.length - 1];
    let cutAng = rand(0, Math.PI);
    if (strokeA && strokeB) cutAng = Math.atan2(strokeB.y - strokeA.y, strokeB.x - strokeA.x);

    this.slashBursts.push({ x: w.x, y: w.y, life: 300, maxLife: 300, ang: cutAng });
    for (const side of [-1, 1]) {
      this.shards.push({
        text: w.text,
        x: w.x,
        y: w.y,
        vx: Math.cos(cutAng + side * 0.95) * rand(2.8, 5.5),
        vy: Math.sin(cutAng + side * 0.95) * rand(1.5, 3.5) - rand(1.5, 3.2),
        rot: w.rot,
        vr: side * rand(0.12, 0.24),
        life: 580,
        half: side,
      });
    }
    for (let i = 0; i < 16; i++) {
      const a = cutAng + rand(-1.3, 1.3);
      this.particles.push({
        x: w.x,
        y: w.y,
        vx: Math.cos(a) * rand(1.5, 5.5),
        vy: Math.sin(a) * rand(1.5, 5.5),
        life: 420,
        maxLife: 420,
        color: i % 2 === 0 ? '255,220,120' : '100,255,140',
        size: rand(2, 5),
      });
    }

    let dmg = Math.floor(2.4 + Math.min(this.combo, 12) * 0.6 + (w.tough ? 1.2 : 0));
    if (perfect) dmg = Math.floor(dmg * 1.45);
    if (fromProjectile) dmg = Math.floor(dmg * 1.15);
    this.enemy.hp -= dmg;
    this.floats.push({
      x: w.x,
      y: w.y - 14,
      text: perfect ? `完美 -${dmg}` : `-${dmg}`,
      life: 650,
      color: perfect ? '255,240,180' : '255,220,120',
    });

    // 连切里程碑
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.timeScale = 0.25;
      this.rings.push({ x: this.px, y: this.py, r: 20, life: 400, maxLife: 400 });
      fx.shake(5, 120);
      fx.flash('#ffd866', 0.25, 150);
      this.setEnemyText(`${this.combo} 连切！诗意炸裂！`);
      // 清周边近弹
      for (let j = this.words.length - 1; j >= 0; j--) {
        const ww = this.words[j];
        if (ww && Math.hypot(ww.x - this.px, ww.y - this.py) < 110) {
          this.words.splice(j, 1);
          this.enemy.hp -= 2;
        }
      }
    }

    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.win('purify');
    }
  }

  _popWord(w, i, blocked) {
    this.words.splice(i, 1);
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x: w.x,
        y: w.y,
        vx: Math.cos(a) * 2,
        vy: Math.sin(a) * 2,
        life: 250,
        maxLife: 250,
        color: blocked ? '255,220,120' : '100,255,140',
        size: 3,
      });
    }
  }

  hitPlayer(w) {
    if (this.result || this.invuln > 0) return;
    const mul = this.mul.sanDamage || 1;
    const dmg = Math.round((9 + (w && w.tough ? 4 : 0)) * mul);
    this.san = Math.max(0, this.san - dmg);
    this.player.san = this.san;
    this.combo = 0;
    this.invuln = 400;
    audio.playSfx('bulletHit');
    fx.shake(7, 180);
    fx.flash('#cc4444', 0.28, 160);
    this.floats.push({ x: this.px, y: this.py, text: `理性-${dmg}`, life: 700, color: '255,100,100' });
    if (this.san <= 0) {
      this.san = 0;
      this.result = 'lose';
      this.phase = 'result';
      this.timer = 0;
      this.words = [];
      this.setEnemyText('你的语言……被吞噬了……');
      audio.playSfx('death');
    }
  }

  tryStartCarve() {
    if (this.result) return;
    if ((this.player.collectedChars || []).length < 1) {
      this.setEnemyText('没有字可刻！先去捡汉字。');
      audio.playSfx('uiCancel');
      return;
    }
    const ch =
      this.player.collectedChars.pop() ||
      CARVE_GLYPHS[Math.floor(Math.random() * CARVE_GLYPHS.length)];
    this.phase = 'carve';
    this.timer = 0;
    this.words = [];
    this.carve = {
      glyph: ch,
      progress: 0,
      trail: [],
      needed: 0.86,
      cx: W / 2,
      cy: H / 2 - 10,
      size: 160,
    };
    this.hint = `描摹「${ch}」——在金环上拖动！`;
    this.setEnemyText(`刻下「${ch}」！`);
    audio.playSfx('ui');
    fx.flash('#ffffff', 0.3, 200);
  }

  updateCarve(dt) {
    const c = this.carve;
    if (!c) {
      this.phase = 'fight';
      return;
    }
    const ptr = this._pointer();
    const dist = Math.hypot(ptr.x - c.cx, ptr.y - c.cy);
    const onRing = dist > c.size * 0.18 && dist < c.size * 0.52;
    if (ptr.down && onRing && Number.isFinite(ptr.x)) {
      c.trail.push({ x: ptr.x, y: ptr.y, t: this.timer });
      c.progress = Math.min(1, c.progress + dt * 0.00078);
      if (c.trail.length > 80) c.trail.shift();
    }
    if (this.timer > 4000 && c.progress < c.needed) {
      this.setEnemyText('刻偏了……字被冲散！');
      this.phase = 'fight';
      this.carve = null;
      this.hint = 'WASD 移动 · 拖动切开 · 右键/F 射字 · 空格闪避 · K 大招';
      for (let i = 0; i < 3; i++) this.spawnWord(1.4);
      return;
    }
    if (c.progress >= c.needed) this.resolveCarve();
  }

  resolveCarve() {
    const glyph = this.carve?.glyph || '正';
    this.carve = null;
    const pct = this.isBoss ? 0.15 : 0.24;
    const dmg = Math.max(14, Math.floor(this.enemy.maxHp * pct));
    this.enemy.hp -= dmg;
    this.words = [];
    for (let i = 0; i < 42; i++) {
      const a = (i / 42) * Math.PI * 2;
      this.particles.push({
        x: W / 2,
        y: H / 2,
        vx: Math.cos(a) * rand(2, 7),
        vy: Math.sin(a) * rand(2, 7),
        life: 800,
        maxLife: 800,
        color: '255,220,120',
        size: 4,
        glyph: i % 3 === 0 ? glyph : null,
      });
    }
    audio.playSfx('purifyWave');
    fx.flash('#ffd866', 0.7, 500);
    fx.shake(12, 400);
    fx.purifyWave(W / 2, H / 2, 700);
    this.floats.push({
      x: W / 2,
      y: H / 2 - 40,
      text: `「${glyph}」-${dmg}`,
      life: 900,
      color: '255,230,150',
    });
    this.phase = 'fight';
    this.timer = 0;
    this.hint = 'WASD 移动 · 拖动切开 · 右键/F 射字 · 空格闪避 · K 大招';
    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.win('purify');
    } else this.setEnemyText(`「${glyph}」钉进它身体！`);
  }

  win(kind) {
    if (this.result) return;
    this.result = kind === 'purify' ? 'purify' : 'win';
    this.phase = 'result';
    this.timer = 0;
    this.words = [];
    this.setEnemyText(
      this.bestCombo >= 8
        ? `连切 ${this.bestCombo}……它彻底散了……`
        : kind === 'purify'
          ? '烂梗……被切开了……'
          : '不……可能……'
    );
    audio.playSfx('victory');
    fx.flash('#ffd866', 0.5, 400);
  }
}
