// 方案1：刻刀划墨 · 切开烂梗（视觉动作战）
import { W, H } from './config.js';
import { input } from './input.js';
import * as audio from './audio.js';
import * as fx from './fx.js';
import * as difficulty from './difficulty.js';
import { PACE } from './pacing.js';

const MEME_WORDS = ['YYDS', '绝绝子', '蚌埠住了', '啊对对对', '泰裤辣', 'emo', '栓Q', '6', '绝了', '好家伙'];
const CARVE_GLYPHS = ['关', '雎', '洲', '逑', '浩', '然', '正', '气'];

// 布局常量：梗鬼在上，玩家护持在下半区
export const SLASH_LAYOUT = {
  enemyX: () => W / 2,
  enemyY: () => 100,
  playerX: () => W / 2,
  playerY: () => H * 0.62,
  guardR: 42,
  shieldR: 78,
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
  return Math.hypot(cx - px, cy - py) <= r;
}

export class SlashBattle {
  constructor(enemy, player, onEnd, game = null) {
    const mul = difficulty.currentMul();
    const ng = player.ngPlus ? 1.4 : 1;
    const baseHp = enemy.hp || 30;
    const baseMax = enemy.maxHp || 30;
    const typeId = enemy.typeId || 'geng_weak';
    let slashHpMul = 4.2;
    if (enemy.boss || typeId === 'geng_boss') slashHpMul = 5.5;
    else if (typeId === 'geng_medium' || typeId === 'geng_elite' || (baseMax || 0) >= 50) slashHpMul = 4.8;
    const hp = Math.round(baseHp * mul.enemyHp * ng * slashHpMul);
    const maxHp = Math.round(baseMax * mul.enemyHp * ng * slashHpMul);

    this.isSlash = true;
    this.mode = 'slash';
    this.enemy = {
      ...enemy,
      hp,
      maxHp,
      name: enemy.name || '梗鬼',
      typeId,
    };
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

    this.shieldRot = 0;
    this.shieldChars = (player.collectedCharsAll || []).slice(0, 6);

    this.stroke = [];
    this.slashing = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.cuts = 0;
    this.cutIFrame = 0;

    this.words = [];
    this.spawnTimer = 0;
    this.spawnEvery = this.isBoss ? 300 : 400;

    this.shards = [];
    this.particles = [];
    this.floats = [];
    this.spitFx = []; // 吐字瞬间特效 {x,y,life,text}
    this.slashBursts = []; // 切开爆点 {x,y,life,ang}

    this.carve = null;
    this.hint = '按住拖动金线，切开飞来的烂梗字！';
    this.enemyText = '……嘴一张，烂梗喷出来了……';
    this.enemyTextTimer = 2000;
    this._pointerDown = false;
    this.mouthOpen = 0; // 0~1 吐字张嘴动画
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
    if (this.cutIFrame > 0) this.cutIFrame -= dt;
    if (this.mouthOpen > 0) this.mouthOpen = Math.max(0, this.mouthOpen - dt * 0.004);

    this._tickFx(dt);
    this.stroke = this.stroke.filter((p) => this.timer - p.t < 200);

    if (this.phase === 'intro') {
      if (this.timer > 800) {
        this.phase = 'fight';
        this.timer = 0;
        this.setEnemyText('从它嘴里喷出来的字——一刀切开！');
        this.hint = '拖动切开烂梗 · 连切有加成 · K 描字大招';
        // 开场连吐 3 个，建立「从哪来」的印象
        for (let i = 0; i < 3; i++) this.spawnWord(1 + i * 0.15);
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
    if (this.phase === 'fight') this.updateFight(dt);
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
      this.spitFx[i].y += 0.3 * (dt / 16);
      if (this.spitFx[i].life <= 0) this.spitFx.splice(i, 1);
    }
    for (let i = this.slashBursts.length - 1; i >= 0; i--) {
      this.slashBursts[i].life -= dt;
      if (this.slashBursts[i].life <= 0) this.slashBursts.splice(i, 1);
    }
  }

  updateFight(dt) {
    if (this.result) return;
    const ptr = this._pointer();
    const L = SLASH_LAYOUT;
    const px = L.playerX();
    const py = L.playerY();

    this.shieldRot += 0.0016 * dt;
    this.shieldChars = (this.player.collectedCharsAll || []).slice(0, 6);

    if (ptr.down && Number.isFinite(ptr.x) && Number.isFinite(ptr.y)) {
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
    const pressure = 1 + Math.min(1.2, this.cuts * 0.035 + (1 - hpRatio) * 0.85);
    const every = this.spawnEvery / pressure;
    const maxWords = Math.floor((this.isBoss ? 14 : 11) * (this.mul.bulletCount || 1));
    if (this.spawnTimer > every && this.words.length < maxWords) {
      this.spawnTimer = 0;
      this.spawnWord(pressure);
      if (pressure > 1.45 && Math.random() < 0.3) this.spawnWord(pressure);
    }

    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      if (!w) {
        this.words.splice(i, 1);
        continue;
      }
      w.x += w.vx * (dt / 16);
      w.y += w.vy * (dt / 16);
      w.rot += w.vr * (dt / 16);
      const pull = 0.00016 + (1 - hpRatio) * 0.0001;
      w.vx += (px - w.x) * pull * (dt / 16);
      w.vy += (py - w.y) * pull * (dt / 16);
      w.life -= dt;
      if (w.hitFlash > 0) w.hitFlash -= dt;
      if (Math.hypot(w.x - px, w.y - py) < L.guardR + (w.r || 14) * 0.12) {
        this.hitPlayer(w);
        this.words.splice(i, 1);
        continue;
      }
      if (w.life <= 0 || w.x < -100 || w.x > W + 100 || w.y < -100 || w.y > H + 100) {
        this.words.splice(i, 1);
      }
    }
  }

  spawnWord(pressure = 1) {
    const L = SLASH_LAYOUT;
    const ex = L.enemyX();
    const ey = L.enemyY() + 28; // 嘴边
    const px = L.playerX();
    const py = L.playerY();
    const text = MEME_WORDS[Math.floor(Math.random() * MEME_WORDS.length)];
    const sp = (this.isBoss ? 1.5 : 1.12) * (this.mul.bulletSpeed || 1) * (0.9 + pressure * 0.3);
    const ang = Math.atan2(py - ey, px - ex) + rand(-0.5, 0.5);
    const speed = rand(1.1, 2.0) * sp;
    const tough = Math.random() < 0.28;

    this.mouthOpen = 1;
    this.spitFx.push({ x: ex, y: ey, life: 280, text, maxLife: 280 });
    // 吐出瞬间绿粒子
    for (let i = 0; i < 8; i++) {
      const a = ang + rand(-0.5, 0.5);
      this.particles.push({
        x: ex,
        y: ey,
        vx: Math.cos(a) * rand(1.5, 4),
        vy: Math.sin(a) * rand(1.5, 4),
        life: 320,
        maxLife: 320,
        color: '90,255,130',
        size: rand(2, 5),
      });
    }

    this.words.push({
      text,
      x: ex + Math.cos(ang) * 12,
      y: ey + Math.sin(ang) * 12,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: 15 + text.length * 5,
      rot: rand(-0.25, 0.25),
      vr: rand(-0.05, 0.05),
      life: 10000,
      hp: tough ? 2 : 1,
      tough,
      hitFlash: 0,
      scaleIn: 0, // 弹出缩放 0→1
    });
  }

  tryCutWithStroke() {
    if (this.result || this.phase !== 'fight') return;
    if (this.stroke.length < 2 || this.cutIFrame > 0) return;
    const a = this.stroke[this.stroke.length - 2];
    const b = this.stroke[this.stroke.length - 1];
    if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(b.x)) return;

    let any = false;
    let cutCount = 0;
    // 复制索引列表，避免 splice 后乱序
    const targets = [];
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      if (!w || !Number.isFinite(w.x) || !Number.isFinite(w.y)) continue;
      if (segIntersectsCircle(a.x, a.y, b.x, b.y, w.x, w.y, (w.r || 16) + 6)) {
        targets.push(i);
        if (targets.length >= 2) break;
      }
    }
    for (const i of targets) {
      if (this.result) break;
      const w = this.words[i];
      if (!w) continue;
      this.cutWord(w, i);
      any = true;
      cutCount += 1;
    }
    if (any) {
      this.cutIFrame = 50;
      audio.playSfx('hit');
    }
  }

  cutWord(w, index) {
    if (!w || this.result) return;
    // 索引可能已失效：用对象引用找
    let idx = this.words.indexOf(w);
    if (idx < 0) idx = index;
    if (idx < 0 || idx >= this.words.length) return;

    if (w.hp > 1) {
      w.hp -= 1;
      w.hitFlash = 220;
      w.vx *= 0.35;
      w.vy *= 0.35;
      this.combo += 1;
      this.comboTimer = 1000;
      this.slashBursts.push({ x: w.x, y: w.y, life: 200, maxLife: 200, ang: rand(0, Math.PI) });
      this.floats.push({ x: w.x, y: w.y - 12, text: '裂！', life: 420, color: '180,255,160' });
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        this.particles.push({
          x: w.x,
          y: w.y,
          vx: Math.cos(a) * rand(1, 3.5),
          vy: Math.sin(a) * rand(1, 3.5),
          life: 300,
          maxLife: 300,
          color: '120,255,150',
          size: rand(2, 4),
        });
      }
      const chip = Math.floor(1 + Math.min(this.combo, 6) * 0.35);
      this.enemy.hp = Math.max(0, this.enemy.hp - chip);
      if (this.enemy.hp <= 0) this.win('purify');
      return;
    }

    this.words.splice(idx, 1);
    this.cuts += 1;
    this.combo += 1;
    this.comboTimer = 1100;

    // 切开方向：沿刀锋
    const strokeA = this.stroke[this.stroke.length - 2];
    const strokeB = this.stroke[this.stroke.length - 1];
    let cutAng = rand(0, Math.PI);
    if (strokeA && strokeB) cutAng = Math.atan2(strokeB.y - strokeA.y, strokeB.x - strokeA.x);

    this.slashBursts.push({ x: w.x, y: w.y, life: 280, maxLife: 280, ang: cutAng });

    for (const side of [-1, 1]) {
      this.shards.push({
        text: w.text,
        x: w.x,
        y: w.y,
        vx: Math.cos(cutAng + side * 0.9) * rand(2.5, 5) + rand(-0.5, 0.5),
        vy: Math.sin(cutAng + side * 0.9) * rand(1.5, 3.5) - rand(1.5, 3),
        rot: w.rot,
        vr: side * rand(0.1, 0.22),
        life: 550,
        half: side,
      });
    }
    // 金色墨点 + 绿色噪声
    for (let i = 0; i < 14; i++) {
      const a = cutAng + rand(-1.2, 1.2);
      this.particles.push({
        x: w.x,
        y: w.y,
        vx: Math.cos(a) * rand(1.5, 5),
        vy: Math.sin(a) * rand(1.5, 5),
        life: 400,
        maxLife: 400,
        color: i % 2 === 0 ? '255,220,120' : '100,255,140',
        size: rand(2, 5),
      });
    }

    const dmg = Math.floor(2.2 + Math.min(this.combo, 10) * 0.55 + (w.tough ? 1 : 0));
    this.enemy.hp -= dmg;
    this.floats.push({ x: w.x, y: w.y - 14, text: `-${dmg}`, life: 650, color: '255,220,120' });

    if (this.combo >= 6 && this.combo % 6 === 0) {
      this.setEnemyText(`${this.combo} 连切！`);
      fx.shake(3, 80);
    }
    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.win('purify');
    }
  }

  hitPlayer(w) {
    if (this.result) return;
    const mul = this.mul.sanDamage || 1;
    const dmg = Math.round((10 + (w && w.tough ? 4 : 0)) * mul);
    this.san = Math.max(0, this.san - dmg);
    this.player.san = this.san;
    this.combo = 0;
    audio.playSfx('bulletHit');
    fx.shake(7, 180);
    fx.flash('#cc4444', 0.28, 160);
    const L = SLASH_LAYOUT;
    this.floats.push({
      x: L.playerX(),
      y: L.playerY(),
      text: `理性-${dmg}`,
      life: 700,
      color: '255,100,100',
    });
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
      needed: 0.88,
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
      c.progress = Math.min(1, c.progress + dt * 0.00072);
      if (c.trail.length > 80) c.trail.shift();
    }
    if (this.timer > 3800 && c.progress < c.needed) {
      this.setEnemyText('刻偏了……字被冲散！');
      this.phase = 'fight';
      this.carve = null;
      this.hint = '拖动切开烂梗 · K 描字大招';
      for (let i = 0; i < 3; i++) this.spawnWord(1.4);
      return;
    }
    if (c.progress >= c.needed) this.resolveCarve();
  }

  resolveCarve() {
    const glyph = this.carve?.glyph || '正';
    this.carve = null;
    const pct = this.isBoss ? 0.14 : 0.22;
    const dmg = Math.max(12, Math.floor(this.enemy.maxHp * pct));
    this.enemy.hp -= dmg;
    this.words = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
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
    this.hint = '拖动切开烂梗 · K 描字大招';
    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.win('purify');
    } else {
      this.setEnemyText(`「${glyph}」钉进它身体！`);
    }
  }

  win(kind) {
    if (this.result) return;
    this.result = kind === 'purify' ? 'purify' : 'win';
    this.phase = 'result';
    this.timer = 0;
    this.words = [];
    this.setEnemyText(kind === 'purify' ? '烂梗……被切开了……' : '不……可能……');
    audio.playSfx('victory');
    fx.flash('#ffd866', 0.5, 400);
  }
}
