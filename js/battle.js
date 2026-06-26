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
    this.menuIndex = 0; // 0=战斗 1=诗词 2=道具 3=宽恕
    this.menuItems = ['战 斗', '诗 词', '道 具', '宽 恕'];

    // 红心（玩家在弹幕框里的位置）
    this.heart = { x: 0, y: 0, r: 6 };
    this.heartMaxHp = player.san;
    this.heartHp = player.san;

    // 弹幕
    this.bullets = [];
    this.bulletTimer = 0;
    this.enemyTurnDuration = 5000; // 敌人回合 5 秒

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
    if (input.wasPressed('arrowleft') || input.wasPressed('a')) {
      this.menuIndex = (this.menuIndex - 1 + 4) % 4;
    }
    if (input.wasPressed('arrowright') || input.wasPressed('d')) {
      this.menuIndex = (this.menuIndex + 1) % 4;
    }
    if (input.wasPressed('e') || input.wasPressed('enter') || input.wasPressed(' ')) {
      input.wasPressed(' '); // 消费
      if (this.menuIndex === 0) this.startAttack();
      else if (this.menuIndex === 1) this.startPoem();
      else if (this.menuIndex === 2) this.useItem();
      else if (this.menuIndex === 3) this.trySpare();
    }
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
    // 梗鬼无法宽恕（它们是腐烂语言，只能消灭）
    this.setEnemyText('梗鬼听不懂「宽恕」。它只会「YYDS」。');
    this.phase = 'attack_resolve';
    this.timer = 0;
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
    if (this.bulletTimer > 400) {
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
    const words = ['YYDS', '绝绝子', '蚌', '啊对', '6', '栓Q', '泰裤辣'];
    const word = words[Math.floor(Math.random() * words.length)];
    const pattern = Math.floor(Math.random() * 3);
    if (pattern === 0) {
      // 从左侧射出
      this.bullets.push({
        x: -BOX_W/2 - 10, y: (Math.random() - 0.5) * BOX_H * 0.6,
        vx: 3, vy: 0, r: 8, text: word, life: 4000
      });
    } else if (pattern === 1) {
      // 从上方落下
      this.bullets.push({
        x: (Math.random() - 0.5) * BOX_W * 0.6, y: -BOX_H/2 - 10,
        vx: 0, vy: 3, r: 8, text: word, life: 4000
      });
    } else {
      // 追踪
      const dx = this.heart.x, dy = this.heart.y;
      const d = Math.hypot(dx, dy) || 1;
      this.bullets.push({
        x: -BOX_W/2 - 10, y: -BOX_H/2 - 10,
        vx: (dx / d) * 2.5, vy: (dy / d) * 2.5,
        r: 8, text: word, life: 4000
      });
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
