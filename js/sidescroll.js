// 江堤 · 2D横版关卡（三段式）
// 前段：老人交付武器 + 基础踩踏/挥刀教学
// 中段：梯子攀爬 + 核心要石（存档点/刻字）
// 后段：精准平台跳跃 + 精英梗鬼 + 出口通向居民区
// 重力 + 跳跃 + 平台 + 梯子；鼠标左键小刀近战；空格跳跃踩踏
import { W, H } from './config.js';

const GRAVITY = 0.55;
const JUMP_V = -12.5;
const MOVE_SPD = 2.5;   // 江堤区域专属移速（低于大地图，仅本关卡生效）
const CLIMB_SPD = 2.0;
const GROUND_Y = 624;
const LEVEL_W = 3400;
const KNIFE_REACH = 46;
const KNIFE_COOLDOWN = 320;
const KNIFE_DMG = 34;

// 段落分界
const SEG1_END = 1100;  // 前段结束
const SEG2_END = 2300;  // 中段结束

// 老人交付小刀的对白
const KNIFE_DIALOG = [
  { s: '书远', t: '江堤这条路，被梗鬼堵了。它们在堤面与石板上来回踱步，碰到你就咬你的字。' },
  { s: '书远', t: '近身的东西，诗一时半刻念不利索。这把小刀给你——记忆合金打的，专破那层绿皮。' },
  { s: '系统', t: '（A/D 左右走，W 或空格跳跃；从上方落下可踩死梗鬼，鼠标左键挥刀近战）' },
  { s: '书远', t: '砍通这条堤，东头就是去居民区的路。我在出口等你。' },
  { s: '顾言', t: '……多谢。' },
  { s: '系统', t: '（获得：记忆合金小刀）' },
];

const EXIT_DIALOG = [
  { s: '系统', t: '你穿过长堤，踩过最后一片芦苇。东面的路口通向废墟居民区。' },
  { s: '书远', t: '（远处传来老人的声音）我在前面等你——居民区里，有更深的的东西。' },
];

const KEYSTONE_DIALOG = [
  { s: '系统', t: '江堤中段立着一块要石，上面还留着前人刻的半个字。' },
  { s: '顾言', t: '……「浩然」。是谁先来过这里？' },
  { s: '系统', t: '（要石已激活。死亡后会在此复活。走近按 E 可刻字留念。）' },
];

const LADDER_HINT = '靠近梯子按 W 攀爬，松开则滑落';

const RETURN_DIALOG = [
  { s: '书远', t: '这盏提灯借你。灯亮着的地方，你能随时回到街道歇脚——江堤的入口不会消失。' },
  { s: '系统', t: '（获得：书远的提灯 · 站在老人旁边的光圈按 E 可返回街道）' },
];

export class SideScrollLevel {
  constructor(game) {
    this.game = game;
    // 玩家（横版）
    this.p = {
      x: 90, y: GROUND_Y, vx: 0, vy: 0,
      w: 14, h: 30, onGround: true,
      facing: 1, walkCycle: 0,
      attacking: 0, attackCD: 0,
      hasKnife: !!game.flags.sidescroll_knife,
      hurt: 0,
      onLadder: false,
    };
    this.cameraX = 0;

    // === 平台 {x,y,w,h} —— y 是平台顶面 ===
    // 前段：基础跳跃教学平台
    // 中段：高低差大的攀爬平台
    // 后段：精准跳跃的间距平台
    this.platforms = [
      // 前段
      { x: 340, y: 520, w: 120, h: 14 },
      { x: 560, y: 440, w: 100, h: 14 },
      { x: 780, y: 500, w: 130, h: 14 },
      // 中段（梯子攀爬区）
      { x: 1200, y: 540, w: 100, h: 14 },
      { x: 1380, y: 420, w: 90, h: 14 },
      { x: 1560, y: 340, w: 100, h: 14 },
      { x: 1740, y: 260, w: 110, h: 14 },
      { x: 1950, y: 380, w: 100, h: 14 },
      { x: 2100, y: 500, w: 120, h: 14 },
      // 后段（精准跳跃）
      { x: 2400, y: 480, w: 80, h: 14 },
      { x: 2560, y: 400, w: 70, h: 14 },
      { x: 2720, y: 460, w: 70, h: 14 },
      { x: 2880, y: 360, w: 80, h: 14 },
      { x: 3060, y: 440, w: 90, h: 14 },
      { x: 3220, y: 520, w: 100, h: 14 },
    ];

    // === 梯子 {x, yTop, yBottom} —— 玩家重叠时可上下攀爬 ===
    this.ladders = [
      // 中段主梯：从地面到上层平台
      { x: 1480, yTop: 340, yBottom: GROUND_Y },
      // 中段副梯
      { x: 1850, yTop: 260, yBottom: 380 },
      // 后段梯子
      { x: 2640, yTop: 400, yBottom: GROUND_Y },
      { x: 2980, yTop: 360, yBottom: 480 },
    ];

    // === 梗鬼（地面行走 · 可踩踏）===
    // 前段：少量弱敌，教学性质
    // 中段：中等密度，配合梯子战术
    // 后段：精英密集，考验操作
    this.enemies = [
      // 前段
      this._mkGeng(420, 560, 80),
      this._mkGeng(700, 460, 70),
      this._mkGeng(920, 520, 90),
      // 中段
      this._mkGeng(1250, 540, 70),
      this._mkGeng(1600, 350, 60),
      this._mkGeng(2000, 390, 70),
      this._mkGeng(2150, 510, 80),
      // 后段
      this._mkGeng(2440, 490, 60),
      this._mkGeng(2760, 470, 70),
      this._mkGeng(3100, 450, 80),
      this._mkGeng(3280, 530, 60),
    ];

    // 老人 NPC（前段入口）
    this.npc = { x: 175, y: GROUND_Y, talked: this.p.hasKnife, t: 0 };
    // 出口（后段末端）
    this.exitX = 3320;
    this.done = false;
    this.exitTriggered = false;
    this.intent = 'forward'; // forward | back | dead
    this.gameTime = 0;

    // === 探索元素 ===
    // 返回传送点（老人旁边的光圈）
    this.returnPortal = { x: 120, y: GROUND_Y, active: !!game.flags.sidescroll_lantern, cooldown: 0 };
    // 隐藏书页（散落，拾取恢复 SAN）
    this.pages = [
      { x: 600, y: 410, taken: false },
      { x: 1600, y: 300, taken: false },
      { x: 1790, y: 230, taken: false },
      { x: 2900, y: 320, taken: false },
      { x: 3260, y: 490, taken: false },
    ];
    // 核心要石（中段，存档点 + 刻字）
    this.keystone = {
      x: 1900, y: GROUND_Y, activated: !!game.activatedKeystones?.has('keystone_riverside'),
      engraved: game.flags.riverside_engraved || null,
    };
    // 段落提示标记
    this._segHinted = { 1: false, 2: false, 3: false };
  }

  _mkGeng(x, y, range) {
    // 地面行走型梗鬼（超级玛丽式）：脚踩地面/平台，巡逻 + 重力 + 可踩踏
    return {
      x, baseX: x, y: GROUND_Y, vy: 0, vx: 0.7, dir: 1, range,
      w: 18, h: 22, onGround: true, walkPhase: Math.random() * 6,
      hp: 60, maxHp: 60, alive: true, t: Math.random() * 6,
      hitFlash: 0, hurtKick: 0, stompCD: 0,
    };
  }

  update(dt, input) {
    this.gameTime += dt;
    const p = this.p;

    // === 段落进入提示 ===
    if (!this._segHinted[2] && p.x > SEG1_END) {
      this._segHinted[2] = true;
      this.game.showHint('中段·梯子攀爬区：靠近梯子按 W 上下攀爬。中段有要石存档点。');
    }
    if (!this._segHinted[3] && p.x > SEG2_END) {
      this._segHinted[3] = true;
      this.game.showHint('后段·精准跳跃区：平台间距大，小心精英梗鬼。');
    }

    // 老人对话触发
    if (!this.npc.talked && Math.abs(p.x - this.npc.x) < 50 && p.onGround) {
      this.npc.talked = true;
      this.p.hasKnife = true;
      this.game.flags.sidescroll_knife = true;
      this.game.startDialog(KNIFE_DIALOG, '书远', () => {
        // 刀给完后，再交付提灯（返回传送点）
        this.returnPortal.active = true;
        this.game.flags.sidescroll_lantern = true;
        this.game.startDialog(RETURN_DIALOG, '书远', () => {
          this.game.showHint('空格跳跃踩踏梗鬼 · 鼠标左键挥刀 · 老人旁光圈按 E 返回街道 · 中段有要石');
        });
      });
      return;
    }
    if (!this.p.hasKnife) {
      if (p.x > this.npc.x + 60) p.x = this.npc.x + 60;
    }

    // === 返回传送点 ===
    if (this.returnPortal.cooldown > 0) this.returnPortal.cooldown -= dt;
    if (this.returnPortal.active && input.wasPressed('e')) {
      const dx = p.x - this.returnPortal.x;
      if (Math.abs(dx) < 46 && this.returnPortal.cooldown <= 0) {
        this.intent = 'back';
        this.done = true;
        return;
      }
    }

    // === 隐藏书页拾取 ===
    for (const pg of this.pages) {
      if (pg.taken) continue;
      if (Math.hypot(pg.x - p.x, pg.y - p.y + 6) < 22) {
        pg.taken = true;
        this.game.player.san = Math.min(this.game.player.maxSan, this.game.player.san + 15);
        this.game.showHint('拾得一页旧书 · 理性 +15');
      }
    }

    // === 要石交互（中段）===
    if (input.wasPressed('e') && Math.abs(p.x - this.keystone.x) < 40 && p.onGround) {
      if (!this.keystone.activated) {
        this.keystone.activated = true;
        this.game.activatedKeystones.add('keystone_riverside');
        this.game.startDialog(KEYSTONE_DIALOG, '要石', () => {
          // 激活后允许刻字
          this.game.startEngraving(this.keystone, 'keystone');
        });
      } else {
        this.game.startEngraving(this.keystone, 'keystone');
      }
      return;
    }

    // === 梯子检测 ===
    p.onLadder = false;
    let onLadderZone = false;
    for (const lad of this.ladders) {
      if (Math.abs(p.x - lad.x) < 16 && p.y > lad.yTop - 10 && p.y < lad.yBottom + 10) {
        onLadderZone = true;
        // 按 W 或 S 在梯子上
        if (input.isDown('w') || input.isDown('s') || input.isDown('arrowup') || input.isDown('arrowdown')) {
          p.onLadder = true;
          break;
        }
        // 如果已经在梯子上且没跳，保持吸附
        if (p._wasOnLadder && !p.onGround) {
          p.onLadder = true;
          break;
        }
      }
    }

    // === 玩家输入 ===
    let mx = 0;
    if (input.isDown('a') || input.isDown('arrowleft')) mx -= 1;
    if (input.isDown('d') || input.isDown('arrowright')) mx += 1;

    if (p.onLadder) {
      // 梯子上：忽略重力，上下移动
      p.vy = 0;
      let my = 0;
      if (input.isDown('w') || input.isDown('arrowup')) my -= 1;
      if (input.isDown('s') || input.isDown('arrowdown')) my += 1;
      p.y += my * CLIMB_SPD * (dt / 16.67);
      p.vx = mx * MOVE_SPD * 0.6 * (dt / 16.67);
      p.x += p.vx;
      // 跳跃脱离梯子
      if (input.wasPressed(' ') || input.wasPressed('w')) {
        if (input.wasPressed(' ')) {
          p.vy = JUMP_V;
          p.onLadder = false;
        }
      }
      p.walkCycle += dt * 0.015;
    } else {
      if (mx !== 0) {
        p.vx = mx * MOVE_SPD * (dt / 16.67);
        p.facing = mx;
        p.walkCycle += dt * 0.02;
      } else {
        p.vx *= 0.7;
        if (Math.abs(p.vx) < 0.1) p.vx = 0;
      }
      // 跳跃
      if ((input.wasPressed('w') || input.wasPressed(' ') || input.wasPressed('arrowup')) && p.onGround) {
        p.vy = JUMP_V;
        p.onGround = false;
      }
    }
    p._wasOnLadder = p.onLadder;

    // 小刀攻击
    if (p.attackCD > 0) p.attackCD -= dt;
    if (p.attacking > 0) p.attacking -= dt;
    if (p.hasKnife && input.mousePressed() && p.attackCD <= 0) {
      p.attacking = 200;
      p.attackCD = KNIFE_COOLDOWN;
      this._doKnifeHit();
    }

    // === 物理 ===
    if (!p.onLadder) {
      p.vy += GRAVITY;
      if (p.vy > 16) p.vy = 16;
    }
    p.x += p.vx;
    p.y += p.vy;
    // 关卡边界
    if (p.x < 16) p.x = 16;
    if (p.x > LEVEL_W - 16) p.x = LEVEL_W - 16;
    // 地面
    p.onGround = false;
    if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.vy = 0; p.onGround = true; }
    // 平台碰撞（仅从上方落下时，梯子上时穿透）
    if (!p.onLadder) {
      for (const pl of this.platforms) {
        const px1 = p.x - p.w / 2, px2 = p.x + p.w / 2;
        if (px2 > pl.x && px1 < pl.x + pl.w) {
          const feet = p.y;
          const prevFeet = p.y - p.vy;
          if (p.vy >= 0 && prevFeet <= pl.y + 2 && feet >= pl.y) {
            p.y = pl.y; p.vy = 0; p.onGround = true;
          }
        }
      }
    }
    if (p.hurt > 0) p.hurt -= dt;

    // === 敌人（地面行走 · 重力 · 可踩踏）===
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t += dt * 0.003;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.stompCD > 0) e.stompCD -= dt;
      // 移动：被击退时反向滑行，否则地面巡逻
      if (e.hurtKick > 0) {
        e.hurtKick -= dt;
        e.x += e.vx * (dt / 16);
      } else {
        e.walkPhase += dt * 0.01;
        e.x += 1.1 * e.dir * (dt / 16);
        if (e.x > e.baseX + e.range) e.dir = -1;
        else if (e.x < e.baseX - e.range) e.dir = 1;
      }
      if (e.x < 16) { e.x = 16; e.dir = 1; }
      if (e.x > LEVEL_W - 16) { e.x = LEVEL_W - 16; e.dir = -1; }
      // 重力 + 地面 / 平台碰撞
      e.vy += GRAVITY;
      if (e.vy > 16) e.vy = 16;
      e.y += e.vy;
      e.onGround = false;
      if (e.y >= GROUND_Y) { e.y = GROUND_Y; e.vy = 0; e.onGround = true; }
      for (const pl of this.platforms) {
        if (e.x + e.w / 2 > pl.x && e.x - e.w / 2 < pl.x + pl.w) {
          const feet = e.y, prevFeet = e.y - e.vy;
          if (e.vy >= 0 && prevFeet <= pl.y + 2 && feet >= pl.y) {
            e.y = pl.y; e.vy = 0; e.onGround = true;
          }
        }
      }

      // 踩踏判定
      const headTop = e.y - e.h;
      const prevFeet = p.y - p.vy;
      const horizOverlap = Math.abs(e.x - p.x) < (e.w / 2 + p.w / 2);
      if (e.stompCD <= 0 && p.vy > 0 && horizOverlap && prevFeet <= headTop + 4 && p.y >= headTop - 2) {
        e.alive = false;
        e.stompCD = 9999;
        p.vy = JUMP_V * 0.62;
        p.onGround = false;
        this.game.player.san = Math.min(this.game.player.maxSan, this.game.player.san + 6);
        if (!this._stompHint) { this._stompHint = true; this.game.showHint('踩中梗鬼！从上方落下可踩死地面行走的梗鬼'); }
        else this.game.showHint('踩中！理性 +6');
        continue;
      }

      // 侧向接触伤害
      if (e.alive && p.hurt <= 0 && horizOverlap && p.y > headTop + 6) {
        this.game.player.san = Math.max(0, this.game.player.san - 8);
        p.hurt = 700;
        p.vx = -p.facing * 4;
        this.game.player.invulnerable = 500;
        this.game.player.hurtFlash = true;
        if (this.game.player.san <= 0) { this._onDeath(); return; }
      }
    }

    // === 摄像机 ===
    const targetCam = p.x - W / 2;
    this.cameraX += (targetCam - this.cameraX) * 0.12;
    this.cameraX = Math.max(0, Math.min(this.cameraX, LEVEL_W - W));

    // === 出口 ===
    if (p.hasKnife && p.x > this.exitX && !this.exitTriggered) {
      this.exitTriggered = true;
      this.game.startDialog(EXIT_DIALOG, '系统', () => {
        this.done = true;
      });
    }
  }

  _doKnifeHit() {
    const p = this.p;
    const hx = p.x + p.facing * 18;
    const hy = p.y - 14;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ecy = e.y - e.h / 2;
      const dx = e.x - hx, dy = ecy - hy;
      if (Math.hypot(dx, dy) < KNIFE_REACH && (Math.sign(dx) === p.facing || Math.abs(dx) < 14)) {
        e.hp -= KNIFE_DMG;
        e.hitFlash = 120;
        e.hurtKick = 160;
        e.vx = -p.facing * 3;
        e.dir = -p.facing;
        if (e.hp <= 0) {
          e.alive = false;
          this.game.player.san = Math.min(this.game.player.maxSan, this.game.player.san + 6);
        }
      }
    }
  }

  _onDeath() {
    // 死亡：交给 game 处理复活（已激活的要石或出生点）
    this.game.showHint('你的理性在江堤上耗尽了……');
    this.game.flags.sidescroll_failed = true;
    this.intent = 'dead';
    this.done = true;
  }

  isDone() { return this.done; }
  getIntent() { return this.intent; }
  getExitTarget() {
    return { target: 'alley_district', spawn: { x: 200, y: 200 } };
  }

  render(ctx, gameTime) {
    const cam = this.cameraX;
    // === 天空（落日）===
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a1418');
    sky.addColorStop(0.45, '#3a2818');
    sky.addColorStop(0.7, '#6a3a20');
    sky.addColorStop(1, '#3a2818');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // 落日
    const sunX = 820 - cam * 0.2, sunY = 300;
    if (sunX > -80 && sunX < W + 80) {
      const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 90);
      sg.addColorStop(0, 'rgba(255,200,120,0.95)');
      sg.addColorStop(0.4, 'rgba(255,150,70,0.5)');
      sg.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
      ctx.fillStyle = 'rgba(255,220,150,0.95)';
      ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI * 2); ctx.fill();
    }
    // 远景对岸
    ctx.fillStyle = 'rgba(15,10,8,0.85)';
    for (let i = 0; i < 10; i++) {
      const bx = i * 280 - cam * 0.4;
      const bw = 80 + (i * 37) % 60, bh = 180 + (i * 53) % 120;
      ctx.fillRect(bx, GROUND_Y - bh - 60, bw, bh);
    }
    // 江水
    const waterY = GROUND_Y + 8;
    const wg = ctx.createLinearGradient(0, waterY, 0, H);
    wg.addColorStop(0, '#3a3024'); wg.addColorStop(1, '#1a1814');
    ctx.fillStyle = wg;
    ctx.fillRect(0, waterY, W, H - waterY);
    // 江水波纹
    ctx.strokeStyle = 'rgba(200,180,140,0.18)';
    ctx.lineWidth = 1;
    const t = this.gameTime * 0.04;
    for (let y = waterY + 8; y < H; y += 16) {
      ctx.beginPath();
      for (let x = 0; x < W; x += 8) {
        const wy = y + Math.sin((x + t * 20) * 0.04 + y) * 2;
        if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    if (sunX > -80 && sunX < W + 80) {
      const rg = ctx.createLinearGradient(0, waterY, 0, waterY + 120);
      rg.addColorStop(0, 'rgba(255,200,120,0.3)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = rg; ctx.fillRect(sunX - 50, waterY, 100, 120);
    }

    // === 段落分界标记（地面颜色变化）===
    ctx.fillStyle = '#4a4540';
    ctx.fillRect(0, GROUND_Y, W, 8);
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(0, GROUND_Y + 8, W, 4);
    // 段落分界柱
    for (const segX of [SEG1_END, SEG2_END]) {
      const sx = segX - cam;
      if (sx > -10 && sx < W + 10) {
        ctx.fillStyle = 'rgba(80,70,50,0.5)';
        ctx.fillRect(sx - 2, GROUND_Y - 80, 4, 80);
      }
    }
    // 地面碎石
    ctx.fillStyle = 'rgba(60,50,40,0.6)';
    for (let i = 0; i < 65; i++) {
      const wx = (i * 53 + 11) % LEVEL_W;
      const sx = wx - cam;
      if (sx < -10 || sx > W + 10) continue;
      const sy = GROUND_Y + 6 + (i * 7) % 6;
      ctx.beginPath(); ctx.arc(sx, sy, 2 + (i % 2), 0, Math.PI * 2); ctx.fill();
    }

    // === 平台 ===
    for (const pl of this.platforms) {
      const sx = pl.x - cam;
      if (sx + pl.w < 0 || sx > W) continue;
      ctx.fillStyle = '#3a3530';
      ctx.fillRect(sx, pl.y, pl.w, pl.h);
      ctx.fillStyle = '#4a4540';
      ctx.fillRect(sx, pl.y, pl.w, 3);
      ctx.strokeStyle = '#2a2520'; ctx.lineWidth = 1;
      ctx.strokeRect(sx, pl.y, pl.w, pl.h);
      ctx.strokeStyle = '#5a6a30'; ctx.lineWidth = 1;
      for (let gx = sx + 6; gx < sx + pl.w - 4; gx += 10) {
        const sway = Math.sin(this.gameTime * 0.002 + gx) * 1.5;
        ctx.beginPath(); ctx.moveTo(gx, pl.y); ctx.quadraticCurveTo(gx + sway, pl.y - 6, gx + sway * 2, pl.y - 10); ctx.stroke();
      }
    }

    // === 梯子 ===
    for (const lad of this.ladders) {
      const sx = lad.x - cam;
      if (sx < -20 || sx > W + 20) continue;
      const h = lad.yBottom - lad.yTop;
      // 两根立柱
      ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx - 7, lad.yBottom); ctx.lineTo(sx - 7, lad.yTop); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 7, lad.yBottom); ctx.lineTo(sx + 7, lad.yTop); ctx.stroke();
      // 横档
      ctx.strokeStyle = '#7a6a4a'; ctx.lineWidth = 1.8;
      for (let yy = lad.yBottom - 12; yy > lad.yTop; yy -= 14) {
        ctx.beginPath(); ctx.moveTo(sx - 7, yy); ctx.lineTo(sx + 7, yy); ctx.stroke();
      }
      // 顶部提示
      if (Math.abs(this.p.x - lad.x) < 20) {
        const pulse = 0.6 + Math.sin(gameTime * 0.006) * 0.3;
        ctx.fillStyle = `rgba(255,220,140,${pulse})`;
        ctx.font = 'bold 9px serif'; ctx.textAlign = 'center';
        ctx.fillText('W 攀爬', sx, lad.yTop - 6);
        ctx.textAlign = 'left';
      }
    }

    // === 芦苇（前景装饰）===
    for (let i = 0; i < 45; i++) {
      const wx = (i * 79 + 23) % LEVEL_W;
      const sx = wx - cam;
      if (sx < -20 || sx > W + 20) continue;
      const by = GROUND_Y + 4;
      const sway = Math.sin(this.gameTime * 0.002 + i) * 3;
      ctx.strokeStyle = '#6a6a30'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(sx, by); ctx.quadraticCurveTo(sx + sway * 0.5, by - 16, sx + sway, by - 34); ctx.stroke();
      ctx.fillStyle = '#8a7a40';
      ctx.beginPath(); ctx.ellipse(sx + sway, by - 36, 2.5, 5, 0.2, 0, Math.PI * 2); ctx.fill();
    }

    // === 老人 NPC ===
    {
      const sx = this.npc.x - cam;
      if (sx > -30 && sx < W + 30) {
        this._drawShuyuan(ctx, sx, this.npc.y, gameTime);
        if (!this.npc.talked) {
          const pulse = 0.6 + Math.sin(gameTime * 0.005) * 0.3;
          ctx.fillStyle = `rgba(255,220,140,${pulse})`;
          ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
          ctx.fillText('E · 老人', sx, this.npc.y - 56);
          ctx.textAlign = 'left';
        }
      }
    }

    // === 返回传送点 ===
    if (this.returnPortal.active) {
      const sx = this.returnPortal.x - cam;
      if (sx > -40 && sx < W + 40) {
        const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;
        const g = ctx.createRadialGradient(sx, GROUND_Y - 4, 0, sx, GROUND_Y - 4, 36);
        g.addColorStop(0, `rgba(255,220,140,${0.45 * pulse + 0.2})`);
        g.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(sx, GROUND_Y - 2, 36, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,230,160,${0.6 + pulse * 0.3})`;
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.ellipse(sx, GROUND_Y - 2, 22, 9, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        const near = Math.abs(this.p.x - this.returnPortal.x) < 46;
        if (near) {
          ctx.fillStyle = `rgba(255,235,160,${0.85 + pulse * 0.15})`;
          ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
          ctx.fillText('E · 返回街道', sx, GROUND_Y - 30);
          ctx.textAlign = 'left';
        }
      }
    }

    // === 隐藏书页 ===
    for (const pg of this.pages) {
      if (pg.taken) continue;
      const sx = pg.x - cam;
      if (sx < -20 || sx > W + 20) continue;
      const bob = Math.sin(gameTime * 0.004 + pg.x) * 2;
      const g = ctx.createRadialGradient(sx, pg.y + bob, 0, sx, pg.y + bob, 14);
      g.addColorStop(0, 'rgba(255,220,140,0.4)');
      g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 14, pg.y + bob - 14, 28, 28);
      ctx.fillStyle = '#d4b86a';
      ctx.fillRect(sx - 5, pg.y + bob - 7, 10, 13);
      ctx.fillStyle = '#e8cc88';
      ctx.fillRect(sx - 5, pg.y + bob - 7, 10, 3);
      ctx.strokeStyle = '#806020'; ctx.lineWidth = 0.5;
      ctx.strokeRect(sx - 5, pg.y + bob - 7, 10, 13);
    }

    // === 要石（中段）===
    {
      const sx = this.keystone.x - cam;
      if (sx > -30 && sx < W + 30) {
        const ks = this.keystone;
        const pulse = ks.activated ? 0.6 + Math.sin(gameTime * 0.003) * 0.3 : 0.2;
        // 光晕
        if (ks.activated) {
          const g = ctx.createRadialGradient(sx, GROUND_Y - 16, 0, sx, GROUND_Y - 16, 40);
          g.addColorStop(0, `rgba(255,220,140,${0.3 * pulse})`);
          g.addColorStop(1, 'rgba(255,220,140,0)');
          ctx.fillStyle = g; ctx.fillRect(sx - 40, GROUND_Y - 56, 80, 60);
        }
        // 石体
        ctx.fillStyle = ks.activated ? '#8a7a58' : '#4a4540';
        ctx.beginPath();
        ctx.moveTo(sx - 12, GROUND_Y); ctx.lineTo(sx - 10, GROUND_Y - 38);
        ctx.lineTo(sx + 10, GROUND_Y - 40); ctx.lineTo(sx + 12, GROUND_Y);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2a2520'; ctx.lineWidth = 1.5; ctx.stroke();
        // 刻字
        if (ks.engraved) {
          ctx.fillStyle = `rgba(255,230,160,${0.8 + Math.sin(gameTime * 0.003) * 0.2})`;
          ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
          ctx.fillText(ks.engraved, sx, GROUND_Y - 18);
          ctx.textAlign = 'left';
        } else {
          ctx.fillStyle = `rgba(180,160,120,${0.4 + pulse * 0.3})`;
          ctx.font = '9px serif'; ctx.textAlign = 'center';
          ctx.fillText('要石', sx, GROUND_Y - 20);
          ctx.textAlign = 'left';
        }
        // 提示
        if (Math.abs(this.p.x - ks.x) < 40) {
          ctx.fillStyle = `rgba(255,220,140,${0.8 + pulse * 0.2})`;
          ctx.font = 'bold 10px serif'; ctx.textAlign = 'center';
          ctx.fillText(ks.activated ? 'E · 刻字' : 'E · 激活要石', sx, GROUND_Y - 50);
          ctx.textAlign = 'left';
        }
      }
    }

    // === 梗鬼 ===
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const sx = e.x - cam;
      if (sx < -40 || sx > W + 40) continue;
      this._drawGeng(ctx, sx, e.y, e, gameTime);
    }

    // === 玩家 ===
    this._drawPlayer(ctx, this.p.x - cam, this.p.y, gameTime);

    // === 出口光柱 ===
    if (this.p.hasKnife) {
      const sx = this.exitX - cam;
      if (sx > -60 && sx < W + 60) {
        const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;
        const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        g.addColorStop(0, 'rgba(255,225,150,0)');
        g.addColorStop(0.6, `rgba(255,225,150,${pulse * 0.25})`);
        g.addColorStop(1, `rgba(255,225,150,${pulse * 0.5})`);
        ctx.fillStyle = g; ctx.fillRect(sx - 30, 0, 60, GROUND_Y);
        ctx.fillStyle = `rgba(255,230,160,${0.6 + pulse * 0.3})`;
        ctx.font = 'bold 12px serif'; ctx.textAlign = 'center';
        ctx.fillText('→ 居民区', sx, GROUND_Y - 60);
        ctx.textAlign = 'left';
      }
    }

    // === HUD ===
    this._drawHUD(ctx);
  }

  _drawPlayer(ctx, sx, sy, gameTime) {
    const p = this.p;
    if (p.hurt > 0 && Math.floor(gameTime / 60) % 2 === 0) return;
    const bob = p.onGround && p.vx !== 0 ? Math.sin(p.walkCycle * 2) * 1.5 : 0;
    const y = sy + bob;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 2, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    // 腿
    const legSwing = p.onLadder ? Math.sin(p.walkCycle * 2) * 3 : (p.onGround && p.vx !== 0 ? Math.sin(p.walkCycle * 2) * 6 : (p.onGround ? 0 : 4));
    ctx.strokeStyle = '#3a4858'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx - 3, y - 6); ctx.lineTo(sx - 4 + legSwing, y + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 3, y - 6); ctx.lineTo(sx + 4 - legSwing, y + 10); ctx.stroke();
    // 躯干
    ctx.fillStyle = '#5a6878';
    ctx.beginPath();
    ctx.moveTo(sx - 5, y - 18); ctx.lineTo(sx - 6, y - 4); ctx.lineTo(sx + 6, y - 4); ctx.lineTo(sx + 5, y - 18);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a4858'; ctx.fillRect(sx - 6, y - 10, 12, 1.5);
    // 头
    ctx.fillStyle = '#e8c9a0';
    ctx.beginPath(); ctx.arc(sx + p.facing * 1, y - 23, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2018';
    ctx.beginPath(); ctx.arc(sx + p.facing * 1, y - 25, 5, Math.PI, 0); ctx.fill();
    // 眼
    ctx.fillStyle = '#1a1612';
    ctx.beginPath(); ctx.arc(sx + p.facing * 3, y - 23, 0.9, 0, Math.PI * 2); ctx.fill();
    // 手 + 小刀
    const armY = y - 12;
    if (p.attacking > 0) {
      const prog = 1 - p.attacking / 200;
      const ang = (p.facing > 0 ? -0.6 : Math.PI + 0.6) + prog * (p.facing > 0 ? 1.6 : -1.6);
      const hx = sx + Math.cos(ang) * 22, hy = armY + Math.sin(ang) * 22;
      ctx.strokeStyle = '#5a6878'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(sx + p.facing * 4, armY); ctx.lineTo(hx, hy); ctx.stroke();
      const tx = hx + Math.cos(ang) * 16, ty = hy + Math.sin(ang) * 16;
      ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = `rgba(255,240,200,${0.5 * (1 - prog)})`; ctx.lineWidth = 3;
      ctx.beginPath();
      const a0 = ang - p.facing * 0.8, a1 = ang + p.facing * 0.2;
      ctx.arc(sx + p.facing * 4, armY, 30, a0, a1, p.facing < 0); ctx.stroke();
    } else {
      const armSwing = p.onGround && p.vx !== 0 ? Math.sin(p.walkCycle * 2 + Math.PI) * 5 : 0;
      ctx.strokeStyle = '#5a6878'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(sx + p.facing * 4, armY); ctx.lineTo(sx + p.facing * 9, armY + 4 + armSwing); ctx.stroke();
      if (p.hasKnife) {
        ctx.strokeStyle = '#b8b8c0'; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sx + p.facing * 9, armY + 4 + armSwing);
        ctx.lineTo(sx + p.facing * 20, armY + 2 + armSwing);
        ctx.stroke();
      }
    }
  }

  _drawGeng(ctx, sx, sy, e, gameTime) {
    const flash = e.hitFlash > 0;
    const wob = e.onGround ? Math.sin(e.walkPhase * 2) * 1.5 : 0;
    const cy = sy - 11 + wob;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 2, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(sx, cy, 0, sx, cy, 28);
    g.addColorStop(0, flash ? 'rgba(255,255,255,0.5)' : 'rgba(80,220,100,0.3)');
    g.addColorStop(1, 'rgba(80,220,100,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 28, cy - 28, 56, 56);
    const legSwing = e.onGround ? Math.sin(e.walkPhase * 2) * 4 : 2;
    ctx.strokeStyle = 'rgba(40,120,50,0.85)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx - 4, cy + 6); ctx.lineTo(sx - 5 + legSwing, sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 4, cy + 6); ctx.lineTo(sx + 5 - legSwing, sy); ctx.stroke();
    ctx.fillStyle = flash ? 'rgba(200,255,200,0.9)' : 'rgba(80,210,90,0.78)';
    ctx.beginPath(); ctx.ellipse(sx, cy, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20,40,20,0.9)';
    ctx.beginPath(); ctx.ellipse(sx, cy + 3, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180,255,180,0.5)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(sx - 6 + i * 4, cy + 3); ctx.lineTo(sx - 5 + i * 4, cy + 7); ctx.lineTo(sx - 4 + i * 4, cy + 3); ctx.fill();
    }
    ctx.fillStyle = '#0a1a0a';
    ctx.beginPath(); ctx.arc(sx - 4, cy - 4, 2, 0, Math.PI * 2); ctx.arc(sx + 4, cy - 4, 2, 0, Math.PI * 2); ctx.fill();
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 12, cy - 20, 24, 3);
      ctx.fillStyle = '#80dd80'; ctx.fillRect(sx - 12, cy - 20, 24 * (e.hp / e.maxHp), 3);
    }
  }

  _drawShuyuan(ctx, sx, sy, gameTime) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 2, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a7888';
    ctx.beginPath();
    ctx.moveTo(sx - 10, sy - 8); ctx.lineTo(sx - 13, sy + 2); ctx.lineTo(sx + 13, sy + 2); ctx.lineTo(sx + 10, sy - 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath(); ctx.arc(sx, sy - 15, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.beginPath(); ctx.arc(sx, sy - 16, 6, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - 2, sy - 13); ctx.lineTo(sx - 1, sy - 10); ctx.moveTo(sx + 2, sy - 13); ctx.lineTo(sx + 1, sy - 10); ctx.stroke();
    const pulse = 0.6 + Math.sin(gameTime * 0.004) * 0.3;
    ctx.fillStyle = `rgba(255,220,140,${pulse})`;
    ctx.beginPath(); ctx.arc(sx + 12, sy - 6, 3, 0, Math.PI * 2); ctx.fill();
  }

  _drawHUD(ctx) {
    // SAN 条
    const sanW = 140, sanH = 12, sx = 16, sy = 14;
    const ratio = Math.max(0, this.game.player.san / this.game.player.maxSan);
    ctx.fillStyle = 'rgba(20,15,10,0.8)';
    ctx.fillRect(sx, sy, sanW, sanH);
    const col = ratio > 0.5 ? '#7ad07a' : ratio > 0.25 ? '#e0b850' : '#d04040';
    ctx.fillStyle = col; ctx.fillRect(sx + 1, sy + 1, (sanW - 2) * ratio, sanH - 2);
    ctx.strokeStyle = 'rgba(220,200,150,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, sanW, sanH);
    ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.font = 'bold 9px serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('理性', sx + 5, sy + sanH / 2);
    ctx.textBaseline = 'alphabetic';
    // 武器提示
    if (this.p.hasKnife) {
      ctx.fillStyle = 'rgba(255,220,140,0.7)'; ctx.font = 'bold 11px serif';
      ctx.fillText('记忆合金小刀 · 鼠标左键', sx, sy + sanH + 18);
    } else {
      ctx.fillStyle = 'rgba(200,200,200,0.6)'; ctx.font = '11px serif';
      ctx.fillText('向前走，找老人……', sx, sy + sanH + 18);
    }
    // 剩余敌人计数 + 段落标识
    const left = this.enemies.filter(e => e.alive).length;
    ctx.fillStyle = 'rgba(120,220,120,0.7)'; ctx.font = 'bold 11px serif'; ctx.textAlign = 'right';
    ctx.fillText(`梗鬼 ${left}`, W - 16, sy + 12);
    // 当前段落
    const px = this.p.x;
    const segName = px < SEG1_END ? '前段·教学' : px < SEG2_END ? '中段·攀爬' : '后段·跳跃';
    ctx.fillStyle = 'rgba(255,220,140,0.6)'; ctx.font = '10px serif';
    ctx.fillText(segName, W - 16, sy + 28);
    ctx.textAlign = 'left';
  }
}
