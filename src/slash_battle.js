// 言锋对决 · 无限墨刃为基础攻击，收集的汉字提供周期性强化
// 操作：WASD 移动 · 空格/左键 连发墨刃 · E 净化收尾 · K 清明爆发
import { W, H } from './config.js';
import { input } from './input.js';
import * as audio from './audio.js';
import * as fx from './fx.js';
import * as difficulty from './difficulty.js';
import { getFirstAvailableUltimate } from './poem_ultimate.js';
import { PACE } from './pacing.js';
import { selectSlashGlyph } from './slash_rules.js';

const MEME_WORDS = [
  'YYDS',
  '绝绝子',
  '蚌埠住了',
  '啊对对对',
  '泰裤辣',
  'emo',
  '栓Q',
  '好家伙',
  '破防了',
  '直接封神',
  '家人们',
  '纯纯的',
];

export const SLASH_LAYOUT = {
  enemyX: () => W / 2,
  enemyY: () => 108,
  guardR: 22,
  arenaTop: () => 200,
  arenaBottom: () => H - 88,
  arenaLeft: () => 80,
  arenaRight: () => W - 80,
};

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class SlashBattle {
  constructor(enemy, player, onEnd, game = null) {
    const mul = difficulty.currentMul();
    const ng = player.ngPlus ? 1.25 : 1;
    const baseHp = enemy.hp || 30;
    const baseMax = enemy.maxHp || 30;
    const typeId = enemy.typeId || 'geng_weak';
    // 不再 4~6 倍虚血：一场弱怪约 12~25 秒
    let hpMul = 1.15;
    if (enemy.boss || typeId === 'geng_boss') hpMul = 1.55;
    else if (typeId === 'geng_medium' || typeId === 'geng_elite' || (baseMax || 0) >= 50) hpMul = 1.35;
    const hp = Math.max(18, Math.round(baseHp * mul.enemyHp * ng * hpMul));
    const maxHp = Math.max(hp, Math.round(baseMax * mul.enemyHp * ng * hpMul));

    this.isSlash = true;
    this.mode = 'word'; // 言锋对决
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

    this.px = W / 2;
    this.py = H * 0.68;
    this.pSpeed = 3.1;
    this.dashCd = 0;
    this.invuln = 0;
    this.fireCd = 0;
    this.shotCount = 0;
    this.glyphCursor = 0;

    this.aimX = W / 2;
    this.aimY = 160;

    this.shots = []; // 玩家墨刃/强化字锋 {x,y,vx,vy,char,life,r,empowered}
    this.words = []; // 敌方烂梗 {text,x,y,vx,vy,r,life,tough,hp,...}
    this.spawnTimer = 280;
    this.spawnEvery = this.isBoss ? 480 : 620;

    this.particles = [];
    this.floats = [];
    this.shards = [];
    this.spitFx = [];
    this.rings = [];
    this.slashBursts = []; // 兼容旧渲染字段

    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.breaks = 0; // 击碎梗词数
    this.clarity = 0; // 满可 E 净化
    this.clarityMax = this.isBoss ? 7 : 5;

    this.mouthOpen = 0;
    this.enemyText = '';
    this.enemyTextTimer = 0;
    this.hint = 'WASD 移动 · 空格/左键 连发墨刃 · Shift 闪避 · E 净化 · K 清场';

    this.ultimate = getFirstAvailableUltimate(player.collectedCharsAll);
    this.ultimateUsed = false;
    this.carve = null; // 兼容旧渲染

    // 环绕字：仅作视觉弹药指示，不自动格挡（避免「莫名其妙扣血」）
    this.orbit = [];
    this.shieldRot = 0;
    this._syncOrbit();

    this.setEnemyText('……嘴一张，烂梗喷出来了……');
  }

  _memoryChars() {
    return this.player.collectedChars || [];
  }

  _syncOrbit() {
    const bag = (this.player.collectedChars || []).slice(-6);
    this.orbit = bag.map((ch, i) => ({
      char: ch,
      ang: (i / Math.max(1, bag.length)) * Math.PI * 2,
      state: 'orbit',
      x: this.px,
      y: this.py,
    }));
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
    return { x: m.x, y: m.y, down: input.mouseDown() };
  }

  update(dt) {
    if (this.game && (this.game.uiPanel || this.game._saveMenu)) return;
    this.timer += dt;
    this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 0.003);
    if (this.enemyTextTimer > 0) this.enemyTextTimer -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.mouthOpen > 0) this.mouthOpen = Math.max(0, this.mouthOpen - dt * 0.004);

    this._tickFx(dt);

    if (this.phase === 'intro') {
      if (this.timer > 850) {
        this.phase = 'fight';
        this.timer = 0;
        this.setEnemyText('用你记得的字——把它顶回去！');
        for (let i = 0; i < 2; i++) this.spawnWord(0.9 + i * 0.15);
      }
      return;
    }
    if (this.phase === 'result') {
      if (this.timer > (PACE.battle?.resultMs || 950)) this.finish();
      return;
    }
    if (this.phase === 'fight') this.updateFight(dt);
  }

  _tickFx(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += (p.vx || 0) * (dt / 16);
      p.y += (p.vy || 0) * (dt / 16);
      p.vx = (p.vx || 0) * 0.96;
      p.vy = (p.vy || 0) * 0.96;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      if (!s) {
        this.shards.splice(i, 1);
        continue;
      }
      s.x += (s.vx || 0) * (dt / 16);
      s.y += (s.vy || 0) * (dt / 16);
      s.rot = (s.rot || 0) + (s.vr || 0) * (dt / 16);
      s.vy = (s.vy || 0) + 0.12 * (dt / 16);
      s.life -= dt;
      if (s.life <= 0) this.shards.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      if (!this.floats[i]) {
        this.floats.splice(i, 1);
        continue;
      }
      this.floats[i].y -= 0.4 * (dt / 16);
      this.floats[i].life -= dt;
      if (this.floats[i].life <= 0) this.floats.splice(i, 1);
    }
    for (let i = this.spitFx.length - 1; i >= 0; i--) {
      this.spitFx[i].life -= dt;
      this.spitFx[i].y += 0.3 * (dt / 16);
      if (this.spitFx[i].life <= 0) this.spitFx.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += (dt / 16) * 5;
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.slashBursts.length - 1; i >= 0; i--) {
      this.slashBursts[i].life -= dt;
      if (this.slashBursts[i].life <= 0) this.slashBursts.splice(i, 1);
    }
  }

  updateFight(dt) {
    if (this.result) return;
    const L = SLASH_LAYOUT;
    const ptr = this._pointer();

    // 瞄准：鼠标优先，否则对准最近烂梗 / 敌人
    if (Number.isFinite(ptr.x) && Number.isFinite(ptr.y) && (ptr.x > 0 || ptr.y > 0)) {
      this.aimX = ptr.x;
      this.aimY = ptr.y;
    } else {
      const nearest = this._nearestWord();
      if (nearest) {
        this.aimX = nearest.x;
        this.aimY = nearest.y;
      } else {
        this.aimX = L.enemyX();
        this.aimY = L.enemyY() + 40;
      }
    }

    // 移动
    let mx = 0;
    let my = 0;
    if (input.isDown('a') || input.isDown('arrowleft')) mx -= 1;
    if (input.isDown('d') || input.isDown('arrowright')) mx += 1;
    if (input.isDown('w') || input.isDown('arrowup')) my -= 1;
    if (input.isDown('s') || input.isDown('arrowdown')) my += 1;
    // 触屏摇杆
    if (typeof input.getTouchMove === 'function') {
      const t = input.getTouchMove();
      if (t) {
        mx += t.x || 0;
        my += t.y || 0;
      }
    }
    const mlen = Math.hypot(mx, my) || 1;
    if (mx || my) {
      const sp = this.pSpeed * (this.invuln > 0 ? 1.25 : 1);
      this.px += (mx / mlen) * sp * (dt / 16) * 10;
      this.py += (my / mlen) * sp * (dt / 16) * 10;
    }
    this.px = clamp(this.px, L.arenaLeft(), L.arenaRight());
    this.py = clamp(this.py, L.arenaTop(), L.arenaBottom());

    // 闪避
    if ((input.wasPressed('shift') || input.wasPressed('control')) && this.dashCd <= 0) {
      const dx = mx || 0;
      const dy = my || -1;
      const dlen = Math.hypot(dx, dy) || 1;
      this.px = clamp(this.px + (dx / dlen) * 64, L.arenaLeft(), L.arenaRight());
      this.py = clamp(this.py + (dy / dlen) * 64, L.arenaTop(), L.arenaBottom());
      this.dashCd = 650;
      this.invuln = 280;
      audio.playSfx('ui');
    }

    // 墨刃支持按住连发；冷却限制射速，触屏沿用左键状态。
    if (input.isDown(' ') || input.isDown('j') || input.mouseDown()) {
      this.tryFire();
    }

    // E 净化收尾
    if (input.wasPressed('e') && this.clarity >= this.clarityMax && !this.result) {
      this.win('purify');
      this.setEnemyText('你用完整的字，把它劝退了……');
      return;
    }

    // K 大招
    if (input.wasPressed('k')) this.tryUltimate();

    this.shieldRot += 0.002 * dt;
    this._syncOrbit();
    for (let i = 0; i < this.orbit.length; i++) {
      const o = this.orbit[i];
      const n = this.orbit.length || 1;
      o.ang = this.shieldRot + (i / n) * Math.PI * 2;
      o.x = this.px + Math.cos(o.ang) * 36;
      o.y = this.py + Math.sin(o.ang) * 36;
    }

    // 吐梗
    this.spawnTimer += dt;
    const hpRatio = this.enemy.maxHp > 0 ? this.enemy.hp / this.enemy.maxHp : 1;
    const pressure = 1 + (1 - hpRatio) * 0.85 + Math.min(0.4, this.breaks * 0.02);
    const every = this.spawnEvery / pressure;
    const maxWords = Math.floor((this.isBoss ? 10 : 7) * (this.mul.bulletCount || 1));
    if (this.spawnTimer > every && this.words.length < maxWords) {
      this.spawnTimer = 0;
      this.spawnWord(pressure);
      if (this.isBoss && Math.random() < 0.35) this.spawnWord(pressure * 1.1);
    }

    // 更新烂梗
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      if (!w) {
        this.words.splice(i, 1);
        continue;
      }
      // 轻度追踪
      const pull = 0.00009 + (1 - hpRatio) * 0.00006;
      w.vx += (this.px - w.x) * pull * (dt / 16);
      w.vy += (this.py - w.y) * pull * (dt / 16);
      const spd = Math.hypot(w.vx, w.vy);
      const cap = (this.isBoss ? 2.6 : 2.1) * (this.mul.bulletSpeed || 1);
      if (spd > cap) {
        w.vx = (w.vx / spd) * cap;
        w.vy = (w.vy / spd) * cap;
      }
      w.x += w.vx * (dt / 16);
      w.y += w.vy * (dt / 16);
      w.rot += w.vr * (dt / 16);
      if (w.scaleIn < 1) w.scaleIn = Math.min(1, w.scaleIn + 0.12);
      w.life -= dt;
      if (w.hitFlash > 0) w.hitFlash -= dt;

      if (this.invuln <= 0 && Math.hypot(w.x - this.px, w.y - this.py) < L.guardR + (w.r || 16) * 0.45) {
        this.hitPlayer(w);
        this.words.splice(i, 1);
        continue;
      }
      if (w.life <= 0 || w.x < -140 || w.x > W + 140 || w.y < -140 || w.y > H + 140) {
        this.words.splice(i, 1);
      }
    }

    // 更新字弹（win/lose 可能中途清空 shots，必须做空项守卫并提前退出）
    for (let i = this.shots.length - 1; i >= 0; i--) {
      if (this.result) break;
      const s = this.shots[i];
      if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) {
        this.shots.splice(i, 1);
        continue;
      }
      s.x += (s.vx || 0) * (dt / 16);
      s.y += (s.vy || 0) * (dt / 16);
      s.life -= dt;
      if (Math.random() < 0.4) {
        this.particles.push({
          x: s.x,
          y: s.y,
          vx: -(s.vx || 0) * 0.08,
          vy: -(s.vy || 0) * 0.08,
          life: 180,
          maxLife: 180,
          color: '255,220,120',
          size: 2,
        });
      }

      let dead = false;
      // 撞烂梗：对消
      for (let j = this.words.length - 1; j >= 0; j--) {
        const w = this.words[j];
        if (!w || !Number.isFinite(w.x)) continue;
        if (Math.hypot(w.x - s.x, w.y - s.y) < (w.r || 16) * 0.7 + 14) {
          this.breakWord(w, j, s);
          dead = true;
          break;
        }
      }
      if (this.result) break;
      if (dead) {
        // win() 可能已 this.shots = []，避免对空数组 splice 出空洞
        if (this.shots[i] === s) this.shots.splice(i, 1);
        continue;
      }

      // 撞怪本体
      const ex = L.enemyX();
      const ey = L.enemyY();
      if (Math.hypot(s.x - ex, s.y - ey) < 48) {
        const dmg = (s.empowered ? 7 : 4) + Math.floor(Math.min(this.combo, 6) * 0.6);
        this.damageEnemy(dmg, ex, ey + 36, s.char);
        if (this.result) break;
        if (this.shots[i] === s) this.shots.splice(i, 1);
        continue;
      }

      if (s.life <= 0 || s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) {
        if (this.shots[i] === s) this.shots.splice(i, 1);
      }
    }

    // 提示
    if (this.clarity >= this.clarityMax) {
      this.hint = 'E · 净化收尾（慈悲） · 或继续打散';
    } else {
      const memory = this._memoryChars();
      this.hint = memory.length
        ? `按住空格/左键连发墨刃 · 每 4 发强化字锋 · 清明 ${this.clarity}/${this.clarityMax}`
        : `按住空格/左键连发无限墨刃 · 击碎烂梗积累清明 ${this.clarity}/${this.clarityMax}`;
    }
  }

  _nearestWord() {
    let best = null;
    let bd = Infinity;
    for (const w of this.words) {
      if (!w) continue;
      const d = Math.hypot(w.x - this.px, w.y - this.py);
      if (d < bd) {
        bd = d;
        best = w;
      }
    }
    return best;
  }

  tryFire() {
    if (this.result || this.fireCd > 0) return;
    const memory = this._memoryChars();
    this.shotCount += 1;
    const selected = selectSlashGlyph(memory, this.shotCount, this.glyphCursor);
    const { char: ch, empowered } = selected;
    this.glyphCursor = selected.nextGlyphCursor;
    this.fireCd = empowered ? 230 : 165;

    const ang = Math.atan2(this.aimY - this.py, this.aimX - this.px);
    const speed = empowered ? 7 : 6.4;
    this.shots.push({
      x: this.px + Math.cos(ang) * 18,
      y: this.py + Math.sin(ang) * 18,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      char: ch,
      empowered,
      life: 1400,
      r: 12,
    });
    audio.playSfx('purifyWave');
    this.floats.push({
      x: this.px,
      y: this.py - 28,
      text: empowered ? `记忆字锋「${ch}」` : '墨刃',
      life: 400,
      color: empowered ? '255,230,150' : '210,220,205',
    });
  }

  spawnWord(pressure = 1) {
    const ex = SLASH_LAYOUT.enemyX();
    const ey = SLASH_LAYOUT.enemyY() + 36;
    const text = MEME_WORDS[Math.floor(Math.random() * MEME_WORDS.length)];
    const sp = (this.isBoss ? 1.15 : 0.95) * (this.mul.bulletSpeed || 1) * (0.85 + pressure * 0.2);
    const ang = Math.atan2(this.py - ey, this.px - ex) + rand(-0.7, 0.7);
    const speed = rand(0.85, 1.55) * sp;
    const tough = this.isBoss ? Math.random() < 0.28 : Math.random() < 0.18;

    this.mouthOpen = 1;
    this.spitFx.push({ x: ex, y: ey, life: 280, text, maxLife: 280 });
    for (let i = 0; i < 8; i++) {
      const a = ang + rand(-0.5, 0.5);
      this.particles.push({
        x: ex,
        y: ey,
        vx: Math.cos(a) * rand(1.2, 3.5),
        vy: Math.sin(a) * rand(1.2, 3.5),
        life: 300,
        maxLife: 300,
        color: '90,255,130',
        size: rand(2, 4),
      });
    }

    this.words.push({
      text,
      x: ex + Math.cos(ang) * 12,
      y: ey + Math.sin(ang) * 12,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: 14 + text.length * 4.5,
      rot: rand(-0.2, 0.2),
      vr: rand(-0.04, 0.04),
      life: 12000,
      hp: tough ? 2 : 1,
      tough,
      hitFlash: 0,
      scaleIn: 0,
    });
  }

  breakWord(w, index, shot) {
    if (!w || this.result) return;
    const byChar = shot && shot.char ? shot.char : '言';
    const empowered = !!(shot && shot.empowered);
    let idx = this.words.indexOf(w);
    if (idx < 0) idx = index;
    if (idx < 0) return;

    if (w.hp > 1 && !empowered) {
      w.hp -= 1;
      w.hitFlash = 200;
      w.vx *= 0.35;
      w.vy *= 0.35;
      this.floats.push({ x: w.x, y: w.y - 10, text: '裂！', life: 380, color: '180,255,160' });
      this.damageEnemy(2, w.x, w.y, byChar, true);
      return;
    }

    this.words.splice(idx, 1);
    this.breaks += 1;
    this.combo += 1;
    this.comboTimer = 1400;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.clarity = Math.min(this.clarityMax, this.clarity + 1);

    for (const side of [-1, 1]) {
      this.shards.push({
        text: w.text,
        x: w.x,
        y: w.y,
        vx: side * rand(2.2, 4.5),
        vy: rand(-3, -1),
        rot: w.rot,
        vr: side * 0.15,
        life: 500,
        half: side,
      });
    }
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x: w.x,
        y: w.y,
        vx: Math.cos(a) * rand(1.5, 4.5),
        vy: Math.sin(a) * rand(1.5, 4.5),
        life: 360,
        maxLife: 360,
        color: i % 2 === 0 ? '255,220,120' : '100,255,140',
        size: rand(2, 4),
      });
    }

    let dmg = 3 + Math.min(this.combo, 8) * 0.7 + (w.tough ? 1.5 : 0) + (empowered ? 2 : 0);
    dmg = Math.floor(dmg);
    this.damageEnemy(dmg, w.x, w.y - 12, byChar, true);
    audio.playSfx('hit');

    if (this.combo > 0 && this.combo % 4 === 0) {
      this.rings.push({ x: this.px, y: this.py, r: 16, life: 360, maxLife: 360 });
      fx.flash('#ffd866', 0.18, 120);
      this.setEnemyText(`${this.combo} 连对！字在发光！`);
      // 清近弹
      for (let j = this.words.length - 1; j >= 0; j--) {
        const ww = this.words[j];
        if (ww && Math.hypot(ww.x - this.px, ww.y - this.py) < 100) {
          this.words.splice(j, 1);
          this.enemy.hp = Math.max(0, this.enemy.hp - 2);
        }
      }
      if (this.enemy.hp <= 0) this.win('purify');
    }

    if (this.clarity >= this.clarityMax) {
      this.setEnemyText('它晃了——按 E 用诗意净化！');
    }
  }

  damageEnemy(dmg, fxX, fxY, glyph, fromBreak = false) {
    if (this.result) return;
    this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
    this.floats.push({
      x: fxX,
      y: fxY,
      text: fromBreak ? `顶 -${dmg}` : `-${dmg}`,
      life: 600,
      color: '255,220,120',
    });
    if (glyph && !fromBreak) {
      this.slashBursts.push({
        x: fxX,
        y: fxY,
        life: 200,
        maxLife: 200,
        ang: rand(0, Math.PI),
      });
    }
    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      // 字弹击杀偏 purify；近身刀偏 win
      this.win(glyph === '刀' ? 'win' : 'purify');
    }
  }

  hitPlayer(w) {
    if (this.result || this.invuln > 0) return;
    const mul = this.mul.sanDamage || 1;
    const dmg = Math.round((8 + (w && w.tough ? 3 : 0)) * mul);
    this.san = Math.max(0, this.san - dmg);
    this.player.san = this.san;
    this.combo = 0;
    this.invuln = 420;
    audio.playSfx('bulletHit');
    fx.shake(6, 160);
    fx.flash('#cc4444', 0.25, 140);
    this.floats.push({
      x: this.px,
      y: this.py,
      text: `理性-${dmg}`,
      life: 650,
      color: '255,100,100',
    });
    if (this.san <= 0) {
      this.san = 0;
      this.result = 'lose';
      this.phase = 'result';
      this.timer = 0;
      this.words = [];
      this.shots = [];
      this.setEnemyText('你的语言……被吞噬了……');
      audio.playSfx('death');
    }
  }

  tryUltimate() {
    if (this.result || this.ultimateUsed) {
      if (this.ultimateUsed) this.setEnemyText('本场大招已用过。');
      return;
    }
    // 有完整诗则大招；否则消耗战内清明做小清场，不消耗探索所得汉字。
    if (this.ultimate) {
      this.ultimateUsed = true;
      const dmg = Math.max(18, Math.floor(this.enemy.maxHp * 0.28));
      this.words = [];
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        this.particles.push({
          x: W / 2,
          y: H / 2,
          vx: Math.cos(a) * rand(2, 7),
          vy: Math.sin(a) * rand(2, 7),
          life: 700,
          maxLife: 700,
          color: '255,220,120',
          size: 4,
          glyph: i % 4 === 0 ? '诗' : null,
        });
      }
      audio.playSfx('purifyWave');
      fx.flash('#ffd866', 0.65, 450);
      fx.shake(10, 350);
      fx.purifyWave(W / 2, H / 2, 650);
      this.floats.push({
        x: W / 2,
        y: H / 2 - 40,
        text: this.ultimate.title || '诗词大招',
        life: 900,
        color: '255,230,150',
      });
      this.setEnemyText('诗句扫过——噪声断了一截！');
      if (this.enemy.hp <= 0) this.win('purify');
      return;
    }
    if (this.clarity >= 2) {
      this.clarity -= 2;
      this.words = [];
      this.damageEnemy(Math.max(5, Math.floor(this.enemy.maxHp * 0.1)), W / 2, 160, '墨');
      fx.purifyWave(this.px, this.py, 400);
      audio.playSfx('purifyWave');
      this.setEnemyText('清明化作墨潮——噪声暂时退开！');
    } else {
      this.setEnemyText('击碎烂梗积累 2 点清明，才能发动墨潮。');
      audio.playSfx('uiCancel');
    }
  }

  win(kind) {
    if (this.result) return;
    this.result = kind === 'purify' ? 'purify' : 'win';
    this.phase = 'result';
    this.timer = 0;
    this.words = [];
    this.shots = [];
    this.setEnemyText(
      this.bestCombo >= 6
        ? `连对 ${this.bestCombo}……它说不出梗了……`
        : kind === 'purify'
          ? '烂梗……被完整的字顶散了……'
          : '不……可能……'
    );
    audio.playSfx('victory');
    fx.flash('#ffd866', 0.5, 400);
  }
}
