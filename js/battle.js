// 独立战斗系统 — 类似《传说之下》的回合制弹幕躲避
// 流程：遭遇 → 玩家回合(菜单) → 敌人回合(弹幕躲避) → 循环 → 胜利/失败

import { W, H } from './config.js';
import { input } from './input.js';

// 弹幕框尺寸（战斗界面中央的躲避区域）
const BOX_W = 280;
const BOX_H = 200;

export class Battle {
  constructor(enemy, player, onEnd) {
    this.enemy = {
      ...enemy,
      hp: enemy.hp || 30,
      maxHp: enemy.maxHp || 30,
      name: enemy.name || '梗鬼',
    };
    this.player = player;
    this.onEnd = onEnd;

    // 战斗状态机
    // intro → menu → act → enemyTurn → result
    this.phase = 'intro';
    this.timer = 0;
    this.fadeAlpha = 1;

    // 菜单
    this.menuIndex = 0; // 0=战斗 1=调查 2=诗词 3=宽恕
    this.menuItems = ['战 斗', '调 查', '诗 词', '宽 恕'];

    // 清醒值（调查累积；满了才能宽恕）
    this.isBoss = !!enemy.boss;
    this.clarity = 0;
    this.clarityMax = this.isBoss ? 4 : 3;
    this.attacked = false;
    this.acts = enemy.acts || [
      '你凑近看它。绿光里浮着半张人脸，像谁褪色的旧照片。',
      '你轻声念了半句诗。它的复读卡顿了一下，像在努力想起什么。',
      '你问：「你原本，也会好好说话的吧？」它的嘴角颤了颤。',
      '它发出一声很轻的、不像烂梗的音节——几乎是一个「谢」字。',
    ];
    // 弹幕难度
    this.diff = this.isBoss ? 2 : (this.enemy.maxHp >= 60 ? 1.4 : 1);

    // 红心（玩家在弹幕框里的位置）
    this.heart = { x: 0, y: 0, r: 6 };
    this.heartMaxHp = player.san;
    this.heartHp = player.san;

    // 弹幕
    this.bullets = [];
    this.bulletTimer = 0;
    this.enemyTurnDuration = enemy.boss ? 7000 : 5000; // 敌人回合时长

    // 战斗条（攻击时）
    this.attackBar = null;

    // 结果
    this.result = null; // 'win' | 'lose' | 'spare' | 'flee'

    // 文字气泡（敌人说话）
    this.enemyText = '';
    this.enemyTextTimer = 0;

    // 粒子
    this.particles = [];

    // 初始化红心位置
    this.heart.x = 0;
    this.heart.y = 0;
  }

  // 主更新
  update(dt) {
    this.timer += dt;
    this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 0.003);

    // 粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.phase === 'intro') {
      // 淡入 0.8 秒后进入菜单
      if (this.timer > 800) {
        this.phase = 'menu';
        this.timer = 0;
        this.setEnemyText('蚌埠住了！YYDS！');
      }
      return;
    }

    if (this.phase === 'menu') {
      this.updateMenu();
      return;
    }

    if (this.phase === 'attack_aim') {
      this.updateAttackAim(dt);
      return;
    }

    if (this.phase === 'attack_resolve') {
      if (this.timer > 1200) {
        this.startEnemyTurn();
      }
      return;
    }

    if (this.phase === 'enemyTurn') {
      this.updateEnemyTurn(dt);
      return;
    }

    if (this.phase === 'poem') {
      this.updatePoem(dt);
      return;
    }

    if (this.phase === 'result') {
      if (this.timer > 1500) {
        this.finish();
      }
      return;
    }
  }

  // 菜单选择
  updateMenu() {
    const n = this.menuItems.length;
    if (input.wasPressed('arrowleft') || input.wasPressed('a')) {
      this.menuIndex = (this.menuIndex - 1 + n) % n;
    }
    if (input.wasPressed('arrowright') || input.wasPressed('d')) {
      this.menuIndex = (this.menuIndex + 1) % n;
    }
    if (input.wasPressed('e') || input.wasPressed('enter') || input.wasPressed(' ')) {
      input.wasPressed(' '); // 消费
      const label = this.menuItems[this.menuIndex];
      if (label === '战 斗') this.startAttack();
      else if (label === '调 查') this.startAct();
      else if (label === '诗 词') this.startPoem();
      else if (label === '宽 恕') this.trySpare();
    }
  }

  // 调查：看清梗鬼里残存的"人"，累积清醒值
  startAct() {
    const idx = Math.min(this.clarity, this.acts.length - 1);
    this.setEnemyText(this.acts[idx]);
    this.clarity = Math.min(this.clarityMax, this.clarity + 1);
    this.lastDamage = null;
    this.phase = 'attack_resolve';
    this.timer = 0;
  }

  // 攻击：移动条瞄准
  startAttack() {
    this.phase = 'attack_aim';
    this.timer = 0;
    this.attackBar = { pos: 0, dir: 1, speed: 0.0028, hit: false };
    this.setEnemyText('顾言举起了刻刀……');
  }

  updateAttackAim(dt) {
    if (!this.attackBar) return;
    this.attackBar.pos += this.attackBar.dir * this.attackBar.speed * dt;
    if (this.attackBar.pos >= 1) { this.attackBar.pos = 1; this.attackBar.dir = -1; }
    if (this.attackBar.pos <= 0) { this.attackBar.pos = 0; this.attackBar.dir = 1; }
    // 按 J 停下
    if (input.wasPressed('j') || input.wasPressed('e') || input.wasPressed(' ')) {
      input.wasPressed(' ');
      this.resolveAttack();
    }
  }

  resolveAttack() {
    // 越接近中心伤害越高（0.5 是中心）
    const accuracy = 1 - Math.abs(this.attackBar.pos - 0.5) * 2; // 0~1
    const damage = Math.floor(8 + accuracy * 22); // 8~30
    this.enemy.hp -= damage;
    this.attacked = true; // 动用了武力
    this.attackBar.hit = true;
    this.lastDamage = damage;
    // 粒子
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x: 0, y: -40,
        vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
        life: 500, maxLife: 500,
        color: '255,220,120', size: 3
      });
    }
    this.phase = 'attack_resolve';
    this.timer = 0;
    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0;
      this.result = 'win';
      this.setEnemyText('不……不可能……');
    } else {
      this.setEnemyText(`啊！(${damage} 伤害)`);
    }
  }

  // 诗词攻击（消耗汉字）
  startPoem() {
    if (this.player.collectedChars.length === 0) {
      this.setEnemyText('没有诗词碎片可用！');
      this.phase = 'attack_resolve';
      this.timer = 0;
      return;
    }
    this.phase = 'poem';
    this.timer = 0;
    this.poemChars = [...this.player.collectedChars];
    this.poemIndex = 0;
    this.setEnemyText('顾言念出诗句……');
  }

  updatePoem(dt) {
    // 3 秒后结算
    if (this.timer > 3000) {
      const damage = 35;
      this.enemy.hp -= damage;
      this.lastDamage = damage;
      // 消耗一个汉字
      if (this.player.collectedChars.length > 0) {
        this.player.collectedChars.pop();
      }
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        this.particles.push({
          x: 0, y: -40,
          vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
          life: 700, maxLife: 700,
          color: '255,220,120', size: 4
        });
      }
      if (this.enemy.hp <= 0) {
        this.enemy.hp = 0;
        this.result = 'win';
        this.setEnemyText('那些字……好烫……');
      } else {
        this.setEnemyText(`浩然正气！(${damage} 伤害)`);
      }
      this.phase = 'attack_resolve';
      this.timer = 0;
    }
  }

  // 道具
  useItem() {
    if (this.player.inventory.find(i => i.id === 'old_page') || this.heartHp < this.heartMaxHp) {
      this.heartHp = Math.min(this.heartMaxHp, this.heartHp + 30);
      this.setEnemyText('顾言翻开旧书页，理性恢复 30。');
    } else {
      this.setEnemyText('没有可用的道具。');
    }
    this.phase = 'attack_resolve';
    this.timer = 0;
  }

  // 宽恕
  trySpare() {
    if (this.clarity >= this.clarityMax) {
      this.result = 'spare';
      this.setEnemyText('它安静下来，绿光褪成一缕暖色……「谢……谢你。」');
      this.phase = 'result';
      this.timer = 0;
    } else {
      const left = this.clarityMax - this.clarity;
      this.setEnemyText(`它还听不进去。再「调查」${left}次，让它想起自己是谁。`);
      this.lastDamage = null;
      this.phase = 'attack_resolve';
      this.timer = 0;
    }
  }

  // 敌人回合：弹幕躲避
  startEnemyTurn() {
    if (this.result) {
      this.phase = 'result';
      this.timer = 0;
      return;
    }
    this.phase = 'enemyTurn';
    this.timer = 0;
    this.bullets = [];
    this.bulletTimer = 0;
    this.heart.x = 0;
    this.heart.y = 0;
    this.setEnemyText('绝绝子！YYDS！泰裤辣！');
  }

  updateEnemyTurn(dt) {
    // 红心移动
    const speed = 0.18 * dt;
    let hx = 0, hy = 0;
    if (input.isDown('arrowleft') || input.isDown('a')) hx -= 1;
    if (input.isDown('arrowright') || input.isDown('d')) hx += 1;
    if (input.isDown('arrowup') || input.isDown('w')) hy -= 1;
    if (input.isDown('arrowdown') || input.isDown('s')) hy += 1;
    const len = Math.hypot(hx, hy) || 1;
    this.heart.x += (hx / len) * speed;
    this.heart.y += (hy / len) * speed;
    // 限制在弹幕框内
    this.heart.x = Math.max(-BOX_W/2 + this.heart.r, Math.min(BOX_W/2 - this.heart.r, this.heart.x));
    this.heart.y = Math.max(-BOX_H/2 + this.heart.r, Math.min(BOX_H/2 - this.heart.r, this.heart.y));

    // 生成弹幕
    this.bulletTimer += dt;
    if (this.bulletTimer > (this.isBoss ? 300 : 420)) {
      this.bulletTimer = 0;
      this.spawnBulletWave();
    }

    // 更新弹幕
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt * 0.06;
      b.y += b.vy * dt * 0.06;
      b.life -= dt;
      if (b.life <= 0) { this.bullets.splice(i, 1); continue; }
      // 出框清除
      if (Math.abs(b.x) > BOX_W/2 + 30 || Math.abs(b.y) > BOX_H/2 + 30) {
        this.bullets.splice(i, 1);
        continue;
      }
      // 碰撞红心
      const d = Math.hypot(b.x - this.heart.x, b.y - this.heart.y);
      if (d < this.heart.r + b.r) {
        this.heartHp -= 6;
        this.bullets.splice(i, 1);
        // 受伤粒子
        for (let k = 0; k < 6; k++) {
          const a = Math.random() * Math.PI * 2;
          this.particles.push({
            x: this.heart.x, y: this.heart.y,
            vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
            life: 300, maxLife: 300,
            color: '220,60,60', size: 2
          });
        }
        if (this.heartHp <= 0) {
          this.heartHp = 0;
          this.result = 'lose';
          this.setEnemyText('你的语言……被吞噬了……');
          this.phase = 'result';
          this.timer = 0;
          return;
        }
      }
    }

    // 敌人回合结束
    if (this.timer > this.enemyTurnDuration) {
      this.bullets = [];
      this.phase = 'menu';
      this.timer = 0;
      this.setEnemyText('蚌埠住了？再来！');
    }
  }

  spawnBulletWave() {
    const words = ['YYDS', '绝绝子', '蚌', '啊对', '6', '栓Q', '泰裤辣', 'emo'];
    const word = () => words[Math.floor(Math.random() * words.length)];
    const d = this.diff;
    const sp = 0.9 + d * 0.35;        // 速度系数
    const r = 8;
    const pick = Math.floor(Math.random() * (this.isBoss ? 5 : 4));

    if (pick === 0) {
      // 左侧扫射（难度越高越多发）
      const count = 1 + Math.floor(d);
      for (let i = 0; i < count; i++) {
        this.bullets.push({ x: -BOX_W/2 - 10, y: (Math.random() - 0.5) * BOX_H * 0.7, vx: 3 * sp, vy: 0, r, text: word(), life: 4000 });
      }
    } else if (pick === 1) {
      // 顶部落雨
      const count = 1 + Math.floor(d);
      for (let i = 0; i < count; i++) {
        this.bullets.push({ x: (Math.random() - 0.5) * BOX_W * 0.7, y: -BOX_H/2 - 10, vx: 0, vy: 3 * sp, r, text: word(), life: 4000 });
      }
    } else if (pick === 2) {
      // 锁定红心的瞄准弹
      const sx = (Math.random() - 0.5) * BOX_W, sy = -BOX_H/2 - 10;
      const ax = this.heart.x - sx, ay = this.heart.y - sy;
      const m = Math.hypot(ax, ay) || 1;
      this.bullets.push({ x: sx, y: sy, vx: (ax / m) * 3 * sp, vy: (ay / m) * 3 * sp, r, text: word(), life: 4000 });
    } else if (pick === 3) {
      // 中心螺旋爆发
      const k = 6 + Math.floor(d * 2);
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < k; i++) {
        const a = base + (i / k) * Math.PI * 2;
        this.bullets.push({ x: 0, y: 0, vx: Math.cos(a) * 2.2 * sp, vy: Math.sin(a) * 2.2 * sp, r: 7, text: '6', life: 3500 });
      }
    } else {
      // Boss：带缺口的横墙
      const gap = (Math.random() - 0.5) * BOX_W * 0.5;
      for (let gx = -BOX_W/2; gx < BOX_W/2; gx += 26) {
        if (Math.abs(gx - gap) < 28) continue;
        this.bullets.push({ x: gx, y: -BOX_H/2 - 10, vx: 0, vy: 2.6 * sp, r: 7, text: '卡', life: 4200 });
      }
    }
  }

  setEnemyText(text) {
    this.enemyText = text;
    this.enemyTextTimer = 2500;
  }

  finish() {
    // 把 heartHp 同步回 player.san
    this.player.san = Math.max(0, this.heartHp);
    if (this.onEnd) this.onEnd(this.result, this.enemy);
  }

  // 是否结束
  isDone() {
    return this.phase === 'result' && this.timer > 1500;
  }
}
