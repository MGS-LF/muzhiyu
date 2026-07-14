// 方案1：刻刀划墨 · 切开烂梗（视觉动作战，替代 UT 框主战斗）
import { W, H } from './config.js';
import { input } from './input.js';
import * as audio from './audio.js';
import * as fx from './fx.js';
import * as difficulty from './difficulty.js';
import { PACE } from './pacing.js';

const MEME_WORDS = ['YYDS', '绝绝子', '蚌埠住了', '啊对对对', '泰裤辣', 'emo', '栓Q', '6', '绝了', '好家伙'];
const CARVE_GLYPHS = ['关', '雎', '洲', '逑', '浩', '然', '正', '气'];

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function segIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
  // 点到线段距离
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
    // 划墨战独立血量：原 UT 战数值太低，一刀一片；按类型拉长战局
    const typeId = enemy.typeId || 'geng_weak';
    let slashHpMul = 4.2; // 弱梗约 30→126
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

    this.phase = 'intro'; // intro | fight | carve | result
    this.timer = 0;
    this.result = null; // win | purify | lose | spare
    this.fadeAlpha = 1;

    this.san = player.san;
    this.maxSan = player.maxSan || 100;

    // 方案 2 环绕字盾：捡到的汉字碎片变成护盾绕着你转
    this.shieldRot = 0;
    this.shieldChars = (player.collectedCharsAll || []).slice(0, 6);

    // 划线轨迹
    this.stroke = []; // {x,y,t}
    this.slashing = false;
    this.slashCooldown = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.cuts = 0;
    this.cutIFrame = 0; // 同帧多切节流，防一划清屏

    // 飞字：更密更快
    this.words = [];
    this.spawnTimer = 0;
    this.spawnEvery = this.isBoss ? 280 : 380;
    this.wave = 0;

    // 切开碎片 / 粒子
    this.shards = [];
    this.particles = [];
    this.floats = []; // 飘字 -12

    // 描字大招
    this.carve = null; // { glyph, progress, points[], needed }
    this.carveReady = (player.collectedCharsAll || []).length >= 2;

    this.hint = '按住鼠标左键划出金线，切开绿色烂梗！';
    this.enemyText = 'YYDS……绝绝子……';
    this.enemyTextTimer = 1800;

    this._pointerDown = false;
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

  // —— 输入：鼠标/触控划线 ——
  _pointer() {
    const m = input.mouseCanvas();
    return { x: m.x, y: m.y, down: input.mouseDown() };
  }

  update(dt) {
    if (this.game && (this.game.uiPanel || this.game._saveMenu)) return;
    this.timer += dt;
    this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 0.003);
    if (this.enemyTextTimer > 0) this.enemyTextTimer -= dt;
    if (this.slashCooldown > 0) this.slashCooldown -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.cutIFrame > 0) this.cutIFrame -= dt;

    // 粒子
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
      s.vy += 0.12 * (dt / 16);
      s.life -= dt;
      if (s.life <= 0) this.shards.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      this.floats[i].y -= 0.4 * (dt / 16);
      this.floats[i].life -= dt;
      if (this.floats[i].life <= 0) this.floats.splice(i, 1);
    }
    // 轨迹老化
    const now = this.timer;
    this.stroke = this.stroke.filter((p) => now - p.t < 180);

    if (this.phase === 'intro') {
      if (this.timer > 700) {
        this.phase = 'fight';
        this.timer = 0;
        this.setEnemyText('蚌埠住了！把字切开啊！');
        this.hint = '拖动切开烂梗 · 集字后按 K 描字大招';
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

    if (this.phase === 'fight') {
      this.updateFight(dt);
    }
  }

  updateFight(dt) {
    const ptr = this._pointer();
    
    // 方案 2：盾随时间盘旋
    this.shieldRot += 0.0016 * dt;
    this.shieldChars = (this.player.collectedCharsAll || []).slice(0, 6);

    // 划线
    if (ptr.down) {
      if (!this._pointerDown) {
        this._pointerDown = true;
        this.slashing = true;
        this.stroke = [{ x: ptr.x, y: ptr.y, t: this.timer }];
      } else {
        const last = this.stroke[this.stroke.length - 1];
        if (!last || Math.hypot(ptr.x - last.x, ptr.y - last.y) > 4) {
          this.stroke.push({ x: ptr.x, y: ptr.y, t: this.timer });
          this.tryCutWithStroke();
        }
      }
    } else {
      if (this._pointerDown) {
        this._pointerDown = false;
        this.slashing = false;
      }
    }

    // K 描字大招
    if (input.wasPressed('k')) {
      this.tryStartCarve();
    }

    // 生成飞字：更密；越打越急
    this.spawnTimer += dt;
    const pressure = 1 + Math.min(1.2, this.cuts * 0.04 + (1 - this.enemy.hp / this.enemy.maxHp) * 0.8);
    const every = this.spawnEvery / pressure;
    const maxWords = Math.floor((this.isBoss ? 16 : 12) * (this.mul.bulletCount || 1));
    if (this.spawnTimer > every && this.words.length < maxWords) {
      this.spawnTimer = 0;
      this.spawnWord(pressure);
      // 高压时偶尔双吐
      if (pressure > 1.5 && Math.random() < 0.35) this.spawnWord(pressure);
    }

    // 更新飞字
    const cx = W / 2;
    const cy = H / 2 - 20;
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      w.x += w.vx * (dt / 16);
      w.y += w.vy * (dt / 16);
      w.rot += w.vr * (dt / 16);
      // 吸向护持圈，压力随残血加大
      const pull = 0.00018 + (1 - this.enemy.hp / this.enemy.maxHp) * 0.00012;
      w.vx += (cx - w.x) * pull * (dt / 16);
      w.vy += (cy - w.y) * pull * (dt / 16);
      w.life -= dt;
      // 坚固字：需切 2 次
      if (w.hitFlash > 0) w.hitFlash -= dt;
      if (Math.hypot(w.x - cx, w.y - cy) < 36 + (w.r || 14) * 0.15) {
        this.hitPlayer(w);
        this.words.splice(i, 1);
        continue;
      }
      if (w.life <= 0 || w.x < -80 || w.x > W + 80 || w.y < -80 || w.y > H + 80) {
        this.words.splice(i, 1);
      }
    }
  }

  spawnWord(pressure = 1) {
    // 从梗鬼口中吐出；高压时更偏中心、更快
    const x = W / 2 + rand(-40, 40);
    const y = 110;
    const text = MEME_WORDS[Math.floor(Math.random() * MEME_WORDS.length)];
    const sp = (this.isBoss ? 1.55 : 1.15) * (this.mul.bulletSpeed || 1) * (0.85 + pressure * 0.35);
    const ang = Math.atan2(H / 2 - 20 - y, W / 2 - x) + rand(-0.55, 0.55);
    const speed = rand(1.15, 2.15) * sp;
    // 约 28% 坚固字（需两刀）
    const tough = Math.random() < 0.28;
    this.words.push({
      text,
      x,
      y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      r: 15 + text.length * 5,
      rot: rand(-0.3, 0.3),
      vr: rand(-0.04, 0.04),
      life: 9000,
      hp: tough ? 2 : 1,
      tough,
      hitFlash: 0,
    });
  }

  tryCutWithStroke() {
    if (this.stroke.length < 2) return;
    // 一划最多切 2 个字，避免横扫秒杀
    if (this.cutIFrame > 0) return;
    const a = this.stroke[this.stroke.length - 2];
    const b = this.stroke[this.stroke.length - 1];
    let any = false;
    let cutCount = 0;
    for (let i = this.words.length - 1; i >= 0 && cutCount < 2; i--) {
      const w = this.words[i];
      if (segIntersectsCircle(a.x, a.y, b.x, b.y, w.x, w.y, w.r + 4)) {
        this.cutWord(w, i);
        any = true;
        cutCount += 1;
      }
    }
    if (any) {
      this.cutIFrame = 55; // ms 级节流
      audio.playSfx('hit');
    }
  }

  cutWord(w, index) {
    // 坚固字第一次只裂痕
    if (w.hp > 1) {
      w.hp -= 1;
      w.hitFlash = 200;
      w.vx *= 0.4;
      w.vy *= 0.4;
      this.combo += 1;
      this.comboTimer = 1000;
      this.floats.push({ x: w.x, y: w.y - 10, text: '裂！', life: 400, color: '180,255,160' });
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        this.particles.push({
          x: w.x,
          y: w.y,
          vx: Math.cos(a) * rand(1, 3),
          vy: Math.sin(a) * rand(1, 3),
          life: 280,
          maxLife: 280,
          color: '100,255,140',
          size: rand(2, 3),
        });
      }
      // 轻伤
      const chip = Math.floor(1 + Math.min(this.combo, 6) * 0.35);
      this.enemy.hp = Math.max(0, this.enemy.hp - chip);
      if (this.enemy.hp <= 0) this.win('purify');
      return;
    }

    this.words.splice(index, 1);
    this.cuts += 1;
    this.combo += 1;
    this.comboTimer = 1100;

    const ang = rand(0, Math.PI);
    for (const side of [-1, 1]) {
      this.shards.push({
        text: w.text,
        x: w.x,
        y: w.y,
        vx: Math.cos(ang) * side * rand(2, 4) + rand(-1, 1),
        vy: Math.sin(ang) * side * rand(1, 3) - rand(1, 2),
        rot: w.rot,
        vr: side * rand(0.08, 0.18),
        life: 500,
        half: side,
        scale: 1,
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x: w.x,
        y: w.y,
        vx: Math.cos(a) * rand(1, 4),
        vy: Math.sin(a) * rand(1, 4),
        life: 350,
        maxLife: 350,
        color: '100,255,140',
        size: rand(2, 4),
      });
    }

    // 低伤 + 弱连击：约需切 15~25 个完整字才清弱怪
    const dmg = Math.floor(2.2 + Math.min(this.combo, 10) * 0.55 + (w.tough ? 1 : 0));
    this.enemy.hp -= dmg;
    this.floats.push({ x: w.x, y: w.y - 10, text: `-${dmg}`, life: 600, color: '255,220,120' });

    if (this.combo >= 6 && this.combo % 6 === 0) {
      this.setEnemyText(`${this.combo} 连切！继续！`);
      fx.shake(3, 80);
    }

    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.win('purify');
    }
  }

  hitPlayer(w) {
    const mul = this.mul.sanDamage || 1;
    // 挨打更疼，逼玩家认真切
    const dmg = Math.round((10 + (w.tough ? 4 : 0)) * mul);
    this.san = Math.max(0, this.san - dmg);
    this.player.san = this.san;
    this.combo = 0;
    audio.playSfx('bulletHit');
    fx.shake(7, 180);
    fx.flash('#cc4444', 0.28, 160);
    this.floats.push({ x: W / 2, y: H / 2, text: `理性-${dmg}`, life: 700, color: '255,100,100' });
    if (this.san <= 0) {
      this.san = 0;
      this.result = 'lose';
      this.phase = 'result';
      this.timer = 0;
      this.setEnemyText('你的语言……被吞噬了……');
      audio.playSfx('death');
    }
  }

  tryStartCarve() {
    if ((this.player.collectedChars || []).length < 1) {
      this.setEnemyText('没有字可刻！先去捡汉字。');
      audio.playSfx('uiCancel');
      return;
    }
    // 消耗一字开大
    const ch =
      this.player.collectedChars.pop() ||
      CARVE_GLYPHS[Math.floor(Math.random() * CARVE_GLYPHS.length)];
    this.phase = 'carve';
    this.timer = 0;
    this.words = []; // 清场专注描字
    this.carve = {
      glyph: ch,
      progress: 0,
      trail: [],
      needed: 0.88,
      cx: W / 2,
      cy: H / 2 - 10,
      size: 160,
    };
    this.hint = `描摹「${ch}」——顺着金色虚线划！`;
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
    // 简化：在字中心半径内拖动累计进度（模拟描边）
    const dist = Math.hypot(ptr.x - c.cx, ptr.y - c.cy);
    const onRing = dist > c.size * 0.18 && dist < c.size * 0.52;
    if (ptr.down && onRing) {
      c.trail.push({ x: ptr.x, y: ptr.y, t: this.timer });
      // 描边更慢，大招不那么随便
      c.progress = Math.min(1, c.progress + dt * 0.00072);
      if (c.trail.length > 80) c.trail.shift();
    }
    // 超时失败回战斗
    if (this.timer > 3800 && c.progress < c.needed) {
      this.setEnemyText('刻偏了……字被冲散！');
      this.phase = 'fight';
      this.carve = null;
      this.hint = '拖动切开烂梗 · K 描字大招';
      // 失败惩罚：吐一波
      for (let i = 0; i < 3; i++) this.spawnWord(1.4);
      return;
    }
    if (c.progress >= c.needed) {
      this.resolveCarve();
    }
  }

  resolveCarve() {
    const glyph = this.carve?.glyph || '正';
    this.carve = null;
    // 大招：清屏 + 中等比例伤（不再一口秒）
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
    this.floats.push({ x: W / 2, y: H / 2 - 40, text: `「${glyph}」-${dmg}`, life: 900, color: '255,230,150' });
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
    this.result = kind === 'purify' ? 'purify' : 'win';
    this.phase = 'result';
    this.timer = 0;
    this.words = [];
    this.setEnemyText(kind === 'purify' ? '烂梗……被切开了……' : '不……可能……');
    audio.playSfx('victory');
    fx.flash('#ffd866', 0.5, 400);
  }
}
