// 独立战斗系统 — 类似《传说之下》的回合制弹幕躲避
// 流程：遭遇 → 玩家回合(菜单) → 敌人回合(弹幕躲避) → 循环 → 胜利/失败

import { W, H } from './config.js';
import { input } from './input.js';
import * as audio from './audio.js';
import * as fx from './fx.js';
import * as difficulty from './difficulty.js';
import { getFirstAvailableUltimate, canUseUltimate, POEM_ULTIMATES } from './poem_ultimate.js';

// 弹幕框尺寸（战斗界面中央的躲避区域）
const BOX_W = 280;
const BOX_H = 200;

export class Battle {
  constructor(enemy, player, onEnd) {
    // 应用全局难度倍率到敌人 HP
    const mul = difficulty.currentMul();
    const baseHp = enemy.hp || 30;
    const baseMaxHp = enemy.maxHp || 30;
    this.enemy = {
      ...enemy,
      hp: Math.round(baseHp * mul.enemyHp),
      maxHp: Math.round(baseMaxHp * mul.enemyHp),
      name: enemy.name || '梗鬼',
      typeId: enemy.typeId || 'geng_weak',
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

    // 清醒值（调查累积；满了才能宽恕）—— 受难度影响
    this.isBoss = !!enemy.boss;
    this.clarity = 0;
    this.clarityMax = Math.max(1, (this.isBoss ? 4 : 3) + mul.clarityMax);
    this.attacked = false;
    this.acts = enemy.acts || [
      '你凑近看它。绿光里浮着半张人脸，像谁褪色的旧照片。',
      '你轻声念了半句诗。它的复读卡顿了一下，像在努力想起什么。',
      '你问：「你原本，也会好好说话的吧？」它的嘴角颤了颤。',
      '它发出一声很轻的、不像烂梗的音节——几乎是一个「谢」字。',
    ];
    // 弹幕难度
    this.diff = this.isBoss ? 2 : (this.enemy.maxHp >= 60 ? 1.4 : 1);

    // Boss 阶段系统：血量过半切换到更激进的弹幕模式
    this.bossPhase = 1; // 1=第一阶段, 2=第二阶段（血量<50%）
    this.bossPhaseTriggered = false;

    // 诗词连击大招系统：集齐完整诗句可按 K 释放全屏大招（每场限一次）
    this.ultimateReady = canUseUltimate(player.collectedCharsAll, POEM_ULTIMATES[0]);
    this.ultimateUsed = false;
    this.ultimateAnim = 0; // 大招动画计时

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

    if (this.phase === 'ultimate') {
      this.updateUltimate(dt);
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
    // 诗词连击大招：K 键释放（需集齐完整诗句且本场未用过）
    if (input.wasPressed('k')) {
      this.tryUltimate();
      return;
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

  // 诗词连击大招：集齐完整诗句 → 全屏净化波 → 大量伤害
  tryUltimate() {
    if (this.ultimateUsed) {
      this.setEnemyText('本场战斗已用过诗词大招！');
      audio.playSfx('uiCancel');
      return;
    }
    const ult = getFirstAvailableUltimate(this.player.collectedCharsAll);
    if (!ult) {
      this.setEnemyText('尚未集齐任何完整诗句！');
      audio.playSfx('uiCancel');
      return;
    }
    // 释放大招
    this.ultimateUsed = true;
    this.ultimateAnim = 2000; // 2 秒全屏特效
    this.phase = 'ultimate';
    this.timer = 0;
    this._ultimateDef = ult;
    this.setEnemyText(`「${ult.text}」`);
    audio.playSfx('purifyWave');
    fx.flash(ult.color, 0.8, 1000);
    fx.shake(12, 800);
    fx.purifyWave(W / 2, H / 2, 800);
  }

  // 大招阶段更新
  updateUltimate(dt) {
    this.ultimateAnim -= dt;
    // 1 秒后结算伤害
    if (this.ultimateAnim <= 1000 && !this._ultimateResolved) {
      this._ultimateResolved = true;
      const ult = this._ultimateDef;
      this.enemy.hp -= ult.damage;
      this.lastDamage = ult.damage;
      // 消耗所有对应汉字（collectedChars 弹药）
      for (const c of ult.chars) {
        const idx = this.player.collectedChars.indexOf(c);
        if (idx !== -1) this.player.collectedChars.splice(idx, 1);
      }
      // 粒子爆发
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        this.particles.push({
          x: 0, y: -40,
          vx: Math.cos(a) * 6, vy: Math.sin(a) * 6,
          life: 1000, maxLife: 1000,
          color: '255,220,120', size: 5,
        });
      }
      if (this.enemy.hp <= 0) {
        this.enemy.hp = 0;
        this.result = 'win';
        audio.playSfx('victory');
        this.setEnemyText('那些字……好烫……');
      } else {
        this.setEnemyText(`浩然正气！(${ult.damage} 伤害)`);
      }
    }
    // 动画结束 → 进入结算
    if (this.ultimateAnim <= 0) {
      this._ultimateResolved = false;
      if (this.result === 'win') {
        this.phase = 'result';
      } else {
        this.phase = 'attack_resolve';
      }
      this.timer = 0;
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
    audio.playSfx('hit');
    fx.shake(4, 150);
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
      audio.playSfx('victory');
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
      audio.playSfx('purifyWave');
      fx.flash('#ffd866', 0.5, 500);
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
        audio.playSfx('victory');
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
      audio.playSfx('spare');
      fx.flash('#ffd866', 0.4, 600);
      this.setEnemyText('它安静下来，绿光褪成一缕暖色……「谢……谢你。」');
      this.phase = 'result';
      this.timer = 0;
    } else {
      audio.playSfx('uiCancel');
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
      // 反弹弹幕：碰到弹幕框边界反弹
      if (b.bounce) {
        if (b.x < -BOX_W/2) { b.x = -BOX_W/2; b.vx = Math.abs(b.vx); }
        if (b.x > BOX_W/2) { b.x = BOX_W/2; b.vx = -Math.abs(b.vx); }
        if (b.y < -BOX_H/2) { b.y = -BOX_H/2; b.vy = Math.abs(b.vy); }
        if (b.y > BOX_H/2) { b.y = BOX_H/2; b.vy = -Math.abs(b.vy); }
      } else if (Math.abs(b.x) > BOX_W/2 + 30 || Math.abs(b.y) > BOX_H/2 + 30) {
        // 出框清除
        this.bullets.splice(i, 1);
        continue;
      }
      // 碰撞红心
      const d = Math.hypot(b.x - this.heart.x, b.y - this.heart.y);
      if (d < this.heart.r + b.r) {
        this.heartHp -= Math.round(6 * difficulty.currentMul().sanDamage);
        // 格式化者弹幕：被击中时偷走一个已收集的汉字碎片（仅 collectedChars 弹药，不影响 collectedCharsAll 永久记录）
        if (b.stealFragment && this.player.collectedChars && this.player.collectedChars.length > 0) {
          const stolen = this.player.collectedChars.pop();
          this.setEnemyText(`「${stolen}」已被格式化！`);
        }
        this.bullets.splice(i, 1);
        audio.playSfx('bulletHit');
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
          audio.playSfx('death');
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
    // Boss 阶段检测：血量过半时切换到第二阶段
    if (this.isBoss && !this.bossPhaseTriggered && this.enemy.hp <= this.enemy.maxHp / 2) {
      this.bossPhaseTriggered = true;
      this.bossPhase = 2;
      this.diff += 0.5; // 难度提升
      this.enemyTurnDuration += 2000; // 第二阶段更长
      this.setEnemyText('……你……竟敢……！！');
      audio.playSfx('hit');
      fx.shake(10, 300);
      fx.flash('#ff4444', 0.3, 300);
    }

    const words = ['YYDS', '绝绝子', '蚌', '啊对', '6', '栓Q', '泰裤辣', 'emo'];
    const word = () => words[Math.floor(Math.random() * words.length)];
    const d = this.diff;
    const mul = difficulty.currentMul();
    const sp = (0.9 + d * 0.35) * mul.bulletSpeed; // 速度系数 × 难度倍率
    const r = 8;

    // ===== 第五章新敌人：独立弹幕模式 =====
    const typeId = this.enemy.typeId;
    if (typeId === 'formatter') {
      // 格式化者：发射 404/NULL/ERROR 代码弹幕，被击中会偷走一个已收集的汉字碎片
      this._spawnFormatterBullets(sp, r);
      return;
    }
    if (typeId === 'memory_guard') {
      // 记忆守卫：诗句阵型弹幕——汉字排成诗句形状推进
      this._spawnMemoryGuardBullets(sp, r);
      return;
    }

    // 第二阶段 Boss 有更多弹幕模式可选
    const maxPick = this.isBoss ? (this.bossPhase === 2 ? 8 : 5) : 4;
    const pick = Math.floor(Math.random() * maxPick);

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
    } else if (pick === 4) {
      // Boss：带缺口的横墙
      const gap = (Math.random() - 0.5) * BOX_W * 0.5;
      for (let gx = -BOX_W/2; gx < BOX_W/2; gx += 26) {
        if (Math.abs(gx - gap) < 28) continue;
        this.bullets.push({ x: gx, y: -BOX_H/2 - 10, vx: 0, vy: 2.6 * sp, r: 7, text: '卡', life: 4200 });
      }
    } else if (pick === 5) {
      // 【新】追踪弹波浪：从两侧交替发射瞄准弹
      const fromLeft = Math.random() < 0.5;
      const sx = fromLeft ? -BOX_W/2 - 10 : BOX_W/2 + 10;
      const ax = this.heart.x - sx, ay = this.heart.y;
      const m = Math.hypot(ax, ay) || 1;
      for (let i = 0; i < 3; i++) {
        this.bullets.push({
          x: sx, y: (i - 1) * 30,
          vx: (ax / m) * 2.5 * sp, vy: (ay / m) * 2.5 * sp + (i - 1) * 0.3,
          r: 7, text: word(), life: 4000,
        });
      }
    } else if (pick === 6) {
      // 【新】墙壁反弹弹：从角落发射，碰墙反弹
      const corners = [[-BOX_W/2,-BOX_H/2],[BOX_W/2,-BOX_H/2],[-BOX_W/2,BOX_H/2],[BOX_W/2,BOX_H/2]];
      const c = corners[Math.floor(Math.random() * 4)];
      const ang = Math.atan2(this.heart.y - c[1], this.heart.x - c[0]) + (Math.random() - 0.5) * 0.5;
      this.bullets.push({
        x: c[0], y: c[1],
        vx: Math.cos(ang) * 2.8 * sp, vy: Math.sin(ang) * 2.8 * sp,
        r: 8, text: '弹', life: 5000, bounce: true, // 反弹标记
      });
    } else {
      // 【新】螺旋连续弹：多波次螺旋，时间偏移
      const waves = 2;
      const k = 5;
      for (let w = 0; w < waves; w++) {
        const base = (this.timer * 0.001 + w * Math.PI / waves) % (Math.PI * 2);
        for (let i = 0; i < k; i++) {
          const a = base + (i / k) * Math.PI * 2;
          this.bullets.push({
            x: 0, y: 0,
            vx: Math.cos(a) * 2 * sp, vy: Math.sin(a) * 2 * sp,
            r: 6, text: '6', life: 3500,
          });
        }
      }
    }
  }

  // ===== 格式化者弹幕：404/NULL/ERROR 代码弹，被击中偷走一个汉字碎片 =====
  _spawnFormatterBullets(sp, r) {
    const codes = ['404', 'NULL', 'ERROR', '404', 'NULL'];
    const code = () => codes[Math.floor(Math.random() * codes.length)];
    const pick = Math.floor(Math.random() * 3);
    if (pick === 0) {
      // 数据删除弹幕：从四面涌入的 NULL 弹
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
        const edge = Math.max(BOX_W, BOX_H) / 2 + 20;
        this.bullets.push({
          x: Math.cos(a) * edge, y: Math.sin(a) * edge,
          vx: -Math.cos(a) * 2.4 * sp, vy: -Math.sin(a) * 2.4 * sp,
          r: 9, text: code(), life: 4000, stealFragment: true,
        });
      }
    } else if (pick === 1) {
      // ERROR 弹幕墙：带缺口的横墙
      const gap = (Math.random() - 0.5) * BOX_W * 0.4;
      for (let gx = -BOX_W / 2; gx < BOX_W / 2; gx += 32) {
        if (Math.abs(gx - gap) < 34) continue;
        this.bullets.push({
          x: gx, y: -BOX_H / 2 - 10, vx: 0, vy: 2.8 * sp,
          r: 8, text: 'ERR', life: 4200, stealFragment: true,
        });
      }
    } else {
      // 追踪 404 弹幕：瞄准红心
      const sx = (Math.random() - 0.5) * BOX_W, sy = -BOX_H / 2 - 10;
      const ax = this.heart.x - sx, ay = this.heart.y - sy;
      const m = Math.hypot(ax, ay) || 1;
      for (let i = 0; i < 2; i++) {
        this.bullets.push({
          x: sx + (i - 0.5) * 40, y: sy,
          vx: (ax / m) * 3 * sp, vy: (ay / m) * 3 * sp,
          r: 8, text: '404', life: 4000, stealFragment: true,
        });
      }
    }
  }

  // ===== 记忆守卫弹幕：诗句阵型——汉字排成诗句形状向红心推进 =====
  _spawnMemoryGuardBullets(sp, r) {
    const poemChars = ['月', '夜', '忆', '舍', '弟', '秋', '思'];
    const pick = Math.floor(Math.random() * 3);
    if (pick === 0) {
      // 诗句横列：一排汉字从顶部缓慢下落
      const line = poemChars.slice(0, 4 + Math.floor(Math.random() * 3));
      const startX = -((line.length - 1) * 28) / 2;
      for (let i = 0; i < line.length; i++) {
        this.bullets.push({
          x: startX + i * 28, y: -BOX_H / 2 - 10,
          vx: 0, vy: 1.8 * sp,
          r: 9, text: line[i], life: 5000,
        });
      }
    } else if (pick === 1) {
      // 诗句旋涡：汉字绕中心旋转扩散
      const k = 6;
      const base = this.timer * 0.002;
      for (let i = 0; i < k; i++) {
        const a = base + (i / k) * Math.PI * 2;
        this.bullets.push({
          x: 0, y: 0,
          vx: Math.cos(a) * 1.8 * sp, vy: Math.sin(a) * 1.8 * sp,
          r: 8, text: poemChars[i % poemChars.length], life: 4000,
        });
      }
    } else {
      // 记忆碎片弹：两侧交替发射诗句字
      const fromLeft = Math.random() < 0.5;
      const sx = fromLeft ? -BOX_W / 2 - 10 : BOX_W / 2 + 10;
      const dir = fromLeft ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        this.bullets.push({
          x: sx, y: (i - 1) * 35,
          vx: dir * 2.6 * sp, vy: (Math.random() - 0.5) * 0.5,
          r: 8, text: poemChars[Math.floor(Math.random() * poemChars.length)], life: 4500,
        });
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
