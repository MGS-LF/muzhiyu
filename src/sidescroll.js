// 江堤 · 2D横版关卡（三段式）
// 前段：老人交付武器 + 基础踩踏/挥刀教学
// 中段：梯子攀爬 + 核心要石（存档点/刻字）
// 后段：精准平台跳跃 + 精英梗鬼 + 出口通向居民区
// 重力 + 普通跳跃 + 平台 + 梯子；J 键挥剑近战；空格跳跃踩踏
import { W, H } from './config.js';
import { DIALOGS } from './data/dialogs.js';
import { CONTROL_HINTS } from './data/controls.js';
import * as audio from './audio.js';
import { directorEnabled } from './ai/director.js';

// === 物理参数（按 60fps 设计，用 dt 归一）===
const FRAME = 16.67;
const GRAVITY = 0.55; // 每帧重力（再乘 dt/FRAME）
const MOVE_SPD = 3.2; // 地面横移 px/帧
const AIR_SPD = 3.4; // 空中横移（略快，前冲更明显）
const CLIMB_SPD = 2.0;
const GROUND_Y = 624;
const LEVEL_W = 3400;
const KNIFE_COOLDOWN = 260;
const KNIFE_DMG = 34;
const ATTACK_DURATION = 300; // 剑挥砍动画总时长（ms）
const ATTACK_ACTIVE_START = 0.16;
const ATTACK_ACTIVE_END = 0.72;
const KNIFE_ARM_LEN = 22;
const KNIFE_BLADE_LEN = 38;
const KNIFE_HIT_RADIUS = 13;
const COYOTE_TIME = 100;
const JUMP_BUFFER = 120;

// === 普通跳跃（无蓄力）===
// 逐级上台阶：地面624→530(差94)→460(差70)，约 -11.5 抬高 ~127px，够一级、不能越级
const JUMP_V = -11.5;
const JUMP_MAX_VY = 16;
// 起跳瞬间额外水平冲量（按住 A/D 时）
const JUMP_FORWARD = 1.2;

// 段落分界
const SEG1_END = 1100; // 前段结束
const SEG2_END = 2300; // 中段结束

// 老人交付小刀的对白
const KNIFE_DIALOG = [
  { s: '守砚', t: '江堤这条路，被梗鬼堵了。它们在堤面与石板上来回踱步，碰到你就咬你的字。' },
  { s: '守砚', t: '近身的东西，诗一时半刻念不利索。这把小刀给你——记忆合金打的，专破那层绿皮。' },
  { s: '系统', t: '（A/D 左右走；空格/W 跳跃可上台阶；从上方落下可踩死梗鬼；按 J 挥刀近战）' },
  { s: '守砚', t: '砍通这条堤，东头就是去居民区的路。我在出口等你。' },
  { s: '顾言', t: '……多谢。' },
  { s: '系统', t: '（获得：记忆合金小刀）' },
];

const EXIT_DIALOG = [
  { s: '系统', t: '你穿过长堤，踩过最后一片芦苇。东面的路口通向废墟居民区。' },
  { s: '系统', t: '身后远远传来守砚的声音——' },
  { s: '守砚', t: '路通了！好孩子。居民区里还有你要找的东西，我在那边的老巷子等你——我知道另一条路。' },
];

const KEYSTONE_DIALOG = [
  { s: '系统', t: '江堤中段立着一块要石，上面还留着前人刻的半个字。' },
  { s: '顾言', t: '……「浩然」。是谁先来过这里？' },
  { s: '系统', t: '（要石已激活。死亡后会在此复活。走近按 E 可刻字留念。）' },
];

const LADDER_HINT = '靠近梯子按 W 攀爬，松开则滑落';

const RETURN_DIALOG = [
  { s: '守砚', t: '这盏提灯借你。灯亮着的地方，你能随时回到街道歇脚——江堤的入口不会消失。' },
  { s: '系统', t: '（获得：守砚的提灯 · 站在老人旁边的光圈按 E 可返回街道）' },
];

export class SideScrollLevel {
  constructor(game) {
    this.game = game;
    // 玩家（横版）
    this.p = {
      x: 90,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      w: 14,
      h: 30,
      onGround: true,
      facing: 1,
      walkCycle: 0,
      attacking: 0,
      attackCD: 0,
      attackHitIds: new Set(),
      attackDidHit: false,
      hasKnife: !!game.flags.sidescroll_knife,
      hurt: 0,
      onLadder: false,
      // 手感缓冲
      coyote: 0,
      jumpBuffer: 0,
      wasOnGround: true,
      landTimer: 0,
    };
    this.cameraX = 0;
    this.shake = 0;
    this._jumpHintShown = false;

    // === 平台 {x,y,w,h} —— y 是平台顶面 ===
    // 前段：基础跳跃教学平台
    // 中段：高低差大的攀爬平台
    // 后段：精准跳跃的间距平台
    this.platforms = [
      // 前段：递进台阶（地面 624 → 530 → 460 → 500），普通跳可连上
      { x: 320, y: 530, w: 140, h: 14 },
      { x: 520, y: 460, w: 120, h: 14 },
      { x: 740, y: 500, w: 140, h: 14 },
      // 中段（梯子攀爬区）
      { x: 1200, y: 540, w: 100, h: 14 },
      { x: 1380, y: 430, w: 100, h: 14 },
      { x: 1560, y: 360, w: 110, h: 14 },
      { x: 1740, y: 300, w: 120, h: 14 },
      { x: 1950, y: 400, w: 110, h: 14 },
      { x: 2100, y: 500, w: 130, h: 14 },
      // 后段
      { x: 2400, y: 490, w: 90, h: 14 },
      { x: 2560, y: 420, w: 80, h: 14 },
      { x: 2720, y: 470, w: 80, h: 14 },
      { x: 2880, y: 390, w: 90, h: 14 },
      { x: 3060, y: 450, w: 100, h: 14 },
      { x: 3220, y: 520, w: 110, h: 14 },
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
    this.hitSparks = [];

    // === 探索元素 ===
    // 返回传送点（老人旁边的光圈）
    this.returnPortal = {
      x: 120,
      y: GROUND_Y,
      active: !!game.flags.sidescroll_lantern,
      cooldown: 0,
    };
    // 隐藏书页（散落，拾取恢复 SAN）
    this.pages = [
      { x: 600, y: 410, taken: false },
      { x: 1600, y: 300, taken: false },
      { x: 1790, y: 230, taken: false },
      { x: 2900, y: 320, taken: false },
      { x: 3260, y: 490, taken: false },
    ];
    // 核心要石（中段，存档点 + 刻字）
    // 注意：必须有 id 字段，供 game.activatedKeystones 和 _commitEngraving 使用
    this.keystone = {
      id: 'keystone_riverside',
      x: 1900,
      y: GROUND_Y,
      activated: !!game.activatedKeystones?.has('keystone_riverside'),
      engraved: game.flags.riverside_engraved || null,
    };
    // 段落提示标记
    this._segHinted = { 1: false, 2: false, 3: false };
  }

  _mkGeng(x, y, range) {
    // 地面行走型梗鬼（超级玛丽式）：脚踩地面/平台，巡逻 + 重力 + 可踩踏
    return {
      x,
      baseX: x,
      y: GROUND_Y,
      vy: 0,
      vx: 0.7,
      dir: 1,
      range,
      w: 18,
      h: 22,
      onGround: true,
      walkPhase: Math.random() * 6,
      hp: 60,
      maxHp: 60,
      alive: true,
      t: Math.random() * 6,
      hitFlash: 0,
      hurtKick: 0,
      stompCD: 0,
    };
  }

  createResumeSnapshot() {
    return {
      x: Math.round(this.p.x),
      y: Math.round(this.p.y),
      facing: this.p.facing,
      hasKnife: !!this.p.hasKnife,
      cameraX: Math.round(this.cameraX),
      npcTalked: !!(this.npc && this.npc.talked),
      exitTriggered: !!this.exitTriggered,
      segHinted: { ...this._segHinted },
      returnPortal: this.returnPortal
        ? {
            active: !!this.returnPortal.active,
            cooldown: this.returnPortal.cooldown || 0,
          }
        : null,
      pages: this.pages.map((p) => !!p.taken),
      keystone: this.keystone
        ? {
            activated: !!this.keystone.activated,
            engraved: this.keystone.engraved || null,
          }
        : null,
      enemies: this.enemies.map((e) => ({
        x: Math.round(e.x),
        y: Math.round(e.y),
        hp: e.hp,
        alive: !!e.alive,
        dir: e.dir,
        baseX: Math.round(e.baseX),
        range: e.range,
      })),
    };
  }

  restoreFromResumeSnapshot(snap) {
    if (!snap) return;
    this.p.x = Number.isFinite(snap.x) ? snap.x : this.p.x;
    this.p.y = Number.isFinite(snap.y) ? snap.y : this.p.y;
    this.p.vx = 0;
    this.p.vy = 0;
    this.p.facing = snap.facing === -1 ? -1 : 1;
    this.p.hasKnife = snap.hasKnife !== undefined ? !!snap.hasKnife : this.p.hasKnife;
    this.p.attacking = 0;
    this.p.attackCD = 0;
    this.p.hurt = 0;
    this.p.attackHitIds.clear();
    this.p.attackDidHit = false;
    this.p.onGround = this.p.y >= GROUND_Y - 1;
    this.p.wasOnGround = this.p.onGround;
    this.cameraX = Number.isFinite(snap.cameraX) ? snap.cameraX : this.p.x - W / 2;
    if (this.npc && snap.npcTalked !== undefined) this.npc.talked = !!snap.npcTalked;
    if (snap.exitTriggered !== undefined) this.exitTriggered = !!snap.exitTriggered;
    if (snap.segHinted) this._segHinted = { ...this._segHinted, ...snap.segHinted };
    if (this.returnPortal && snap.returnPortal) {
      this.returnPortal.active = !!snap.returnPortal.active;
      this.returnPortal.cooldown = snap.returnPortal.cooldown || 0;
    }
    if (Array.isArray(snap.pages)) {
      for (let i = 0; i < Math.min(this.pages.length, snap.pages.length); i++) {
        this.pages[i].taken = !!snap.pages[i];
      }
    }
    if (this.keystone && snap.keystone) {
      this.keystone.activated = !!snap.keystone.activated;
      this.keystone.engraved = snap.keystone.engraved || null;
    }
    if (Array.isArray(snap.enemies)) {
      for (let i = 0; i < Math.min(this.enemies.length, snap.enemies.length); i++) {
        const src = snap.enemies[i];
        const e = this.enemies[i];
        e.x = Number.isFinite(src.x) ? src.x : e.x;
        e.y = Number.isFinite(src.y) ? src.y : e.y;
        e.hp = Number.isFinite(src.hp) ? src.hp : e.hp;
        e.alive = !!src.alive;
        e.dir = src.dir === -1 ? -1 : 1;
        e.baseX = Number.isFinite(src.baseX) ? src.baseX : e.baseX;
        e.range = Number.isFinite(src.range) ? src.range : e.range;
        e.vx = 0;
        e.vy = 0;
        e.hitFlash = 0;
        e.hurtKick = 0;
        e.stompCD = 0;
      }
    }
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
      // 使用完整剧情对话（支持二周目分支）
      let dialogKey = 'meet_shuyuan';
      if (this.game.flags.new_game_plus && !this.game.flags.ngplus_shuyuan_seen) {
        dialogKey = 'meet_shuyuan_ngplus';
        this.game.flags.ngplus_shuyuan_seen = true;
      }
      const afterShuyuan = () => {
        if (typeof this.game._afterDirectorDialog === 'function') {
          this.game._afterDirectorDialog(dialogKey);
        } else if (typeof this.game._grantShuyuanItems === 'function') {
          this.game._grantShuyuanItems();
        } else if (!this.game.flags.met_shuyuan) {
          this.game.flags.met_shuyuan = true;
          this.game.player.inventory.push({ id: 'knife', name: '记忆合金刻刀' });
          this.game.player.inventory.push({ id: 'poem_guanju', name: '诗词纸片《关雎》' });
          this.game.showHint('获得：刻刀、诗词纸片《关雎》');
          this.game.objective = { text: '穿过江堤，前往废墟居民区', done: false };
        }
        this.p.hasKnife = true;
        this.game.flags.sidescroll_knife = true;
        this.returnPortal.active = true;
        this.game.flags.sidescroll_lantern = true;
        this.game.startDialog(RETURN_DIALOG, '守砚', () => {
          this.game.showHint(
            '空格跳跃踩踏梗鬼 · J 挥刀 · 老人旁光圈按 E 返回街道 · 中段有要石'
          );
        });
      };
      if (directorEnabled() && typeof this.game._runDirectorBranch === 'function') {
        this.game._runDirectorBranch(dialogKey, DIALOGS[dialogKey] || [], '守砚', afterShuyuan);
      } else {
        this.game.startDialog(DIALOGS[dialogKey], '守砚', afterShuyuan);
      }
      return;
    }
    if (!this.p.hasKnife) {
      if (p.x > this.npc.x + 60) p.x = this.npc.x + 60;
    }

    // === 要石交互（中段）—— 优先于返回传送点，避免 e 键被抢 ===
    // 注意：不强制要求 onGround，因为物理更新在后面，落地帧的 onGround 还是旧值
    // 只要玩家在要石附近（水平距离 < 46，垂直距离 < 50）且不在梯子上即可
    if (
      input.wasPressed('e') &&
      !p.onLadder &&
      Math.abs(p.x - this.keystone.x) < 46 &&
      Math.abs(p.y - this.keystone.y) < 50
    ) {
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

    // === 梯子检测 ===
    p.onLadder = false;
    let onLadderZone = false;
    for (const lad of this.ladders) {
      if (Math.abs(p.x - lad.x) < 16 && p.y > lad.yTop - 10 && p.y < lad.yBottom + 10) {
        onLadderZone = true;
        // 按 W 或 S 在梯子上
        if (
          input.isDown('w') ||
          input.isDown('s') ||
          input.isDown('arrowup') ||
          input.isDown('arrowdown')
        ) {
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
    const t = Math.min(dt, 40) / FRAME; // 归一到 60fps 帧
    let mx = 0;
    if (input.isDown('a') || input.isDown('arrowleft')) mx -= 1;
    if (input.isDown('d') || input.isDown('arrowright')) mx += 1;

    // 跳跃：空格为主；W 仅在不爬梯时跳（避免与攀爬抢键）
    const jumpPressed =
      input.wasPressed(' ') ||
      ((!p.onLadder && !p._wasOnLadder) &&
        (input.wasPressed('w') || input.wasPressed('arrowup')));

    if (p.coyote > 0) p.coyote -= dt;
    if (p.jumpBuffer > 0) p.jumpBuffer -= dt;
    if (p.landTimer > 0) p.landTimer -= dt;

    if (p.onLadder) {
      p.vy = 0;
      let my = 0;
      if (input.isDown('w') || input.isDown('arrowup')) my -= 1;
      if (input.isDown('s') || input.isDown('arrowdown')) my += 1;
      p.y += my * CLIMB_SPD * t;
      p.vx = mx * MOVE_SPD * 0.65 * t;
      p.x += p.vx;
      if (input.wasPressed(' ')) {
        p.vy = JUMP_V;
        p.onLadder = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        if (mx !== 0) {
          p.vx = mx * AIR_SPD * JUMP_FORWARD;
          p.facing = mx;
        }
      }
      p.walkCycle += dt * 0.015;
    } else {
      const spd = p.onGround ? MOVE_SPD : AIR_SPD;
      if (mx !== 0) {
        p.vx = mx * spd; // 目标速度（每帧），下面再 * t 积分
        p.facing = mx;
        if (p.onGround) p.walkCycle += dt * 0.02;
      } else if (p.onGround) {
        p.vx *= 0.65;
        if (Math.abs(p.vx) < 0.15) p.vx = 0;
      } else {
        p.vx *= 0.88;
        if (Math.abs(p.vx) < 0.08) p.vx = 0;
      }

      const doJump = () => {
        p.vy = JUMP_V;
        p.onGround = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        if (mx !== 0) {
          // 按住方向：空中满速 + 前冲加成
          p.vx = mx * AIR_SPD * JUMP_FORWARD;
          p.facing = mx;
        } else if (Math.abs(p.vx) > 0.2) {
          // 保留起跳前冲
          p.vx *= 1.15;
        } else if (p.facing) {
          p.vx = p.facing * AIR_SPD * 0.45;
        }
      };
      const canJump = p.onGround || p.coyote > 0;
      if (jumpPressed && canJump) doJump();
      else if (jumpPressed && !canJump) p.jumpBuffer = JUMP_BUFFER;
      else if (p.onGround && p.jumpBuffer > 0) doJump();
    }
    p._wasOnLadder = p.onLadder;

    // 小刀攻击
    if (p.attackCD > 0) p.attackCD -= dt;
    if (p.attacking > 0) {
      p.attacking -= dt;
      this._doKnifeHit();
      if (p.attacking <= 0) {
        p.attacking = 0;
        p.attackHitIds.clear();
        p.attackDidHit = false;
      }
    }
    if (p.hasKnife && input.wasPressed('j') && p.attackCD <= 0) {
      p.attacking = ATTACK_DURATION;
      p.attackCD = KNIFE_COOLDOWN;
      p.attackHitIds.clear();
      p.attackDidHit = false;
      if (p.onGround && !p.onLadder) p.vx += p.facing * 1.4;
      audio.playSfx('ui');
      this._doKnifeHit();
    }

    // === 物理（位移统一乘 t）===
    if (!p.onLadder) {
      p.vy += GRAVITY * t;
      if (p.vy > JUMP_MAX_VY) p.vy = JUMP_MAX_VY;
    }
    p.x += p.vx * t;
    p.y += p.vy * t;
    // 关卡边界
    if (p.x < 16) p.x = 16;
    if (p.x > LEVEL_W - 16) p.x = LEVEL_W - 16;
    // 地面
    p.onGround = false;
    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
      p.onGround = true;
    }
    // 平台碰撞（仅从上方落下时，梯子上时穿透）
    if (!p.onLadder) {
      for (const pl of this.platforms) {
        const px1 = p.x - p.w / 2,
          px2 = p.x + p.w / 2;
        if (px2 > pl.x && px1 < pl.x + pl.w) {
          const feet = p.y;
          const prevFeet = p.y - p.vy;
          if (p.vy >= 0 && prevFeet <= pl.y + 2 && feet >= pl.y) {
            p.y = pl.y;
            p.vy = 0;
            p.onGround = true;
          }
        }
      }
    }
    // 土狼时间与落地反馈
    if (p.wasOnGround && !p.onGround) p.coyote = COYOTE_TIME;
    if (!p.wasOnGround && p.onGround) p.landTimer = 120;
    p.wasOnGround = p.onGround;

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
      if (e.x < 16) {
        e.x = 16;
        e.dir = 1;
      }
      if (e.x > LEVEL_W - 16) {
        e.x = LEVEL_W - 16;
        e.dir = -1;
      }
      // 重力 + 地面 / 平台碰撞
      e.vy += GRAVITY;
      if (e.vy > 16) e.vy = 16;
      e.y += e.vy;
      e.onGround = false;
      if (e.y >= GROUND_Y) {
        e.y = GROUND_Y;
        e.vy = 0;
        e.onGround = true;
      }
      for (const pl of this.platforms) {
        if (e.x + e.w / 2 > pl.x && e.x - e.w / 2 < pl.x + pl.w) {
          const feet = e.y,
            prevFeet = e.y - e.vy;
          if (e.vy >= 0 && prevFeet <= pl.y + 2 && feet >= pl.y) {
            e.y = pl.y;
            e.vy = 0;
            e.onGround = true;
          }
        }
      }

      // 踩踏判定
      const headTop = e.y - e.h;
      const prevFeet = p.y - p.vy;
      const horizOverlap = Math.abs(e.x - p.x) < e.w / 2 + p.w / 2;
      if (
        e.stompCD <= 0 &&
        p.vy > 0 &&
        horizOverlap &&
        prevFeet <= headTop + 4 &&
        p.y >= headTop - 2
      ) {
        e.alive = false;
        e.stompCD = 9999;
        p.vy = JUMP_V * 0.55; // 踩踏后轻弹
        p.onGround = false;
        this.shake = 100;
        this.game.player.san = Math.min(this.game.player.maxSan, this.game.player.san + 6);
        if (!this._stompHint) {
          this._stompHint = true;
          this.game.showHint('踩中梗鬼！从上方落下可踩死地面行走的梗鬼');
        } else this.game.showHint('踩中！理性 +6');
        continue;
      }

      // 侧向接触伤害
      const playerThreatening = p.attacking > 0 && (e.x - p.x) * p.facing > -12;
      if (
        e.alive &&
        e.hurtKick <= 0 &&
        !playerThreatening &&
        p.hurt <= 0 &&
        horizOverlap &&
        p.y > headTop + 6
      ) {
        this.game.player.san = Math.max(0, this.game.player.san - 8);
        p.hurt = 700;
        p.vx = e.x >= p.x ? -4 : 4;
        this.game.player.invulnerable = 500;
        this.game.player.hurtFlash = true;
        if (this.game.player.san <= 0) {
          this._onDeath();
          return;
        }
      }
    }

    // === 摄像机 ===
    if (this.shake > 0) this.shake -= dt;
    for (let i = this.hitSparks.length - 1; i >= 0; i--) {
      const s = this.hitSparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.88;
      s.vy *= 0.88;
      s.life -= dt;
      if (s.life <= 0) this.hitSparks.splice(i, 1);
    }
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
    if (!this._isKnifeActive()) return false;
    const blade = this._knifeBladeSegment();
    let hitAny = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (p.attackHitIds.has(e)) continue;
      if (this._enemyIntersectsKnife(e, blade)) {
        e.hp -= KNIFE_DMG;
        e.hitFlash = 170;
        e.hurtKick = 190;
        e.vx = p.facing * 3.4;
        e.dir = -p.facing;
        p.attackHitIds.add(e);
        p.attackDidHit = true;
        hitAny = true;
        this._spawnKnifeSparks(e.x, e.y - e.h / 2, p.facing);
        audio.playSfx('hit');
        if (e.hp <= 0) {
          e.alive = false;
          this.game.player.san = Math.min(this.game.player.maxSan, this.game.player.san + 6);
          this.game.showHint('砍倒梗鬼！理性 +6');
        }
      }
    }
    if (hitAny) this.shake = 120;
    return hitAny;
  }

  _attackProgress() {
    if (this.p.attacking <= 0) return 1;
    return 1 - this.p.attacking / ATTACK_DURATION;
  }

  _isKnifeActive() {
    const t = this._attackProgress();
    return this.p.attacking > 0 && t >= ATTACK_ACTIVE_START && t <= ATTACK_ACTIVE_END;
  }

  _knifeBladeSegment() {
    const p = this.p;
    const t = this._attackProgress();
    let local;
    if (t < 0.2) {
      const u = t / 0.2;
      local = -0.3 - u * 0.8;
    } else if (t < 0.5) {
      const u = (t - 0.2) / 0.3;
      local = -1.1 + u * 1.9;
    } else {
      const u = (t - 0.5) / 0.5;
      local = 0.8 - u * 1.1;
    }
    const fwd = p.facing > 0 ? 0 : Math.PI;
    const angle = fwd + p.facing * local;
    const shoulderX = p.x + p.facing * 3;
    const shoulderY = p.y - 15;
    const handX = shoulderX + Math.cos(angle) * KNIFE_ARM_LEN;
    const handY = shoulderY + Math.sin(angle) * KNIFE_ARM_LEN;
    const tipX = handX + Math.cos(angle) * KNIFE_BLADE_LEN;
    const tipY = handY + Math.sin(angle) * KNIFE_BLADE_LEN;
    return {
      x1: handX,
      y1: handY,
      x2: tipX,
      y2: tipY,
      facing: p.facing,
    };
  }

  _enemyIntersectsKnife(e, blade) {
    const enemyAhead = (e.x - this.p.x) * blade.facing;
    if (enemyAhead < -10) return false;

    const targets = [
      { x: e.x, y: e.y - e.h * 0.72 },
      { x: e.x, y: e.y - e.h * 0.42 },
      { x: e.x, y: e.y - e.h * 0.16 },
    ];
    const hitRadius = KNIFE_HIT_RADIUS + e.w * 0.35;
    return targets.some((pt) => this._pointToSegmentDistance(pt.x, pt.y, blade) <= hitRadius);
  }

  _pointToSegmentDistance(x, y, seg) {
    const vx = seg.x2 - seg.x1;
    const vy = seg.y2 - seg.y1;
    const lenSq = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - seg.x1) * vx + (y - seg.y1) * vy) / lenSq));
    const px = seg.x1 + vx * t;
    const py = seg.y1 + vy * t;
    return Math.hypot(x - px, y - py);
  }

  _spawnKnifeSparks(x, y, facing) {
    for (let i = 0; i < 9; i++) {
      this.hitSparks.push({
        x,
        y,
        vx: facing * (1.2 + Math.random() * 2.2),
        vy: -1.8 + Math.random() * 3.6,
        life: 220 + Math.random() * 120,
        maxLife: 340,
      });
    }
  }

  _onDeath() {
    // 死亡：交给 game 处理复活（已激活的要石或出生点）
    this.game.showHint('你的理性在江堤上耗尽了……');
    this.game.flags.sidescroll_failed = true;
    this.intent = 'dead';
    this.done = true;
  }

  isDone() {
    return this.done;
  }
  getIntent() {
    return this.intent;
  }
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
    const sunX = 820 - cam * 0.2,
      sunY = 300;
    if (sunX > -80 && sunX < W + 80) {
      const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 90);
      sg.addColorStop(0, 'rgba(255,200,120,0.95)');
      sg.addColorStop(0.4, 'rgba(255,150,70,0.5)');
      sg.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
      ctx.fillStyle = 'rgba(255,220,150,0.95)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    // 远景对岸
    ctx.fillStyle = 'rgba(15,10,8,0.85)';
    for (let i = 0; i < 10; i++) {
      const bx = i * 280 - cam * 0.4;
      const bw = 80 + ((i * 37) % 60),
        bh = 180 + ((i * 53) % 120);
      ctx.fillRect(bx, GROUND_Y - bh - 60, bw, bh);
    }
    // 江水
    const waterY = GROUND_Y + 8;
    const wg = ctx.createLinearGradient(0, waterY, 0, H);
    wg.addColorStop(0, '#3a3024');
    wg.addColorStop(1, '#1a1814');
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
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    if (sunX > -80 && sunX < W + 80) {
      const rg = ctx.createLinearGradient(0, waterY, 0, waterY + 120);
      rg.addColorStop(0, 'rgba(255,200,120,0.3)');
      rg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(sunX - 50, waterY, 100, 120);
    }

    // 屏幕震动（仅世界层）
    const shakeAmp = Math.max(0, this.shake / 120) * 3;
    const shakeX = (Math.random() - 0.5) * shakeAmp;
    const shakeY = (Math.random() - 0.5) * shakeAmp;
    ctx.save();
    ctx.translate(shakeX, shakeY);

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
      const sy = GROUND_Y + 6 + ((i * 7) % 6);
      ctx.beginPath();
      ctx.arc(sx, sy, 2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }

    // === 平台 ===
    for (const pl of this.platforms) {
      const sx = pl.x - cam;
      if (sx + pl.w < 0 || sx > W) continue;
      ctx.fillStyle = '#3a3530';
      ctx.fillRect(sx, pl.y, pl.w, pl.h);
      ctx.fillStyle = '#4a4540';
      ctx.fillRect(sx, pl.y, pl.w, 3);
      ctx.strokeStyle = '#2a2520';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, pl.y, pl.w, pl.h);
      ctx.strokeStyle = '#5a6a30';
      ctx.lineWidth = 1;
      for (let gx = sx + 6; gx < sx + pl.w - 4; gx += 10) {
        const sway = Math.sin(this.gameTime * 0.002 + gx) * 1.5;
        ctx.beginPath();
        ctx.moveTo(gx, pl.y);
        ctx.quadraticCurveTo(gx + sway, pl.y - 6, gx + sway * 2, pl.y - 10);
        ctx.stroke();
      }
    }

    // === 梯子 ===
    for (const lad of this.ladders) {
      const sx = lad.x - cam;
      if (sx < -20 || sx > W + 20) continue;
      const h = lad.yBottom - lad.yTop;
      // 两根立柱
      ctx.strokeStyle = '#6a5a3a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx - 7, lad.yBottom);
      ctx.lineTo(sx - 7, lad.yTop);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + 7, lad.yBottom);
      ctx.lineTo(sx + 7, lad.yTop);
      ctx.stroke();
      // 横档
      ctx.strokeStyle = '#7a6a4a';
      ctx.lineWidth = 1.8;
      for (let yy = lad.yBottom - 12; yy > lad.yTop; yy -= 14) {
        ctx.beginPath();
        ctx.moveTo(sx - 7, yy);
        ctx.lineTo(sx + 7, yy);
        ctx.stroke();
      }
      // 顶部提示
      if (Math.abs(this.p.x - lad.x) < 20) {
        const pulse = 0.6 + Math.sin(gameTime * 0.006) * 0.3;
        ctx.fillStyle = `rgba(255,220,140,${pulse})`;
        ctx.font = 'bold 9px serif';
        ctx.textAlign = 'center';
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
      ctx.strokeStyle = '#6a6a30';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx, by);
      ctx.quadraticCurveTo(sx + sway * 0.5, by - 16, sx + sway, by - 34);
      ctx.stroke();
      ctx.fillStyle = '#8a7a40';
      ctx.beginPath();
      ctx.ellipse(sx + sway, by - 36, 2.5, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // === 老人 NPC ===
    {
      const sx = this.npc.x - cam;
      if (sx > -30 && sx < W + 30) {
        this._drawShuyuan(ctx, sx, this.npc.y, gameTime);
        if (!this.npc.talked) {
          const pulse = 0.6 + Math.sin(gameTime * 0.005) * 0.3;
          ctx.fillStyle = `rgba(255,220,140,${pulse})`;
          ctx.font = 'bold 11px serif';
          ctx.textAlign = 'center';
          ctx.fillText(CONTROL_HINTS.interactElder, sx, this.npc.y - 56);
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
        ctx.beginPath();
        ctx.ellipse(sx, GROUND_Y - 2, 36, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,230,160,${0.6 + pulse * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.ellipse(sx, GROUND_Y - 2, 22, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const near = Math.abs(this.p.x - this.returnPortal.x) < 46;
        if (near) {
          ctx.fillStyle = `rgba(255,235,160,${0.85 + pulse * 0.15})`;
          ctx.font = 'bold 11px serif';
          ctx.textAlign = 'center';
          ctx.fillText(CONTROL_HINTS.interactReturn, sx, GROUND_Y - 30);
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
      ctx.fillStyle = g;
      ctx.fillRect(sx - 14, pg.y + bob - 14, 28, 28);
      ctx.fillStyle = '#d4b86a';
      ctx.fillRect(sx - 5, pg.y + bob - 7, 10, 13);
      ctx.fillStyle = '#e8cc88';
      ctx.fillRect(sx - 5, pg.y + bob - 7, 10, 3);
      ctx.strokeStyle = '#806020';
      ctx.lineWidth = 0.5;
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
          ctx.fillStyle = g;
          ctx.fillRect(sx - 40, GROUND_Y - 56, 80, 60);
        }
        // 石体
        ctx.fillStyle = ks.activated ? '#8a7a58' : '#4a4540';
        ctx.beginPath();
        ctx.moveTo(sx - 12, GROUND_Y);
        ctx.lineTo(sx - 10, GROUND_Y - 38);
        ctx.lineTo(sx + 10, GROUND_Y - 40);
        ctx.lineTo(sx + 12, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2a2520';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // 刻字
        if (ks.engraved) {
          ctx.fillStyle = `rgba(255,230,160,${0.8 + Math.sin(gameTime * 0.003) * 0.2})`;
          ctx.font = 'bold 11px serif';
          ctx.textAlign = 'center';
          ctx.fillText(ks.engraved, sx, GROUND_Y - 18);
          ctx.textAlign = 'left';
        } else {
          ctx.fillStyle = `rgba(180,160,120,${0.4 + pulse * 0.3})`;
          ctx.font = '9px serif';
          ctx.textAlign = 'center';
          ctx.fillText('要石', sx, GROUND_Y - 20);
          ctx.textAlign = 'left';
        }
        // 提示
        if (Math.abs(this.p.x - ks.x) < 40) {
          ctx.fillStyle = `rgba(255,220,140,${0.8 + pulse * 0.2})`;
          ctx.font = 'bold 10px serif';
          ctx.textAlign = 'center';
          ctx.fillText(ks.activated ? CONTROL_HINTS.interactEngrave : CONTROL_HINTS.interactKeystone, sx, GROUND_Y - 50);
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

    // === 命中火花 ===
    for (const s of this.hitSparks) {
      const sx = s.x - cam;
      if (sx < -20 || sx > W + 20) continue;
      const a = Math.max(0, s.life / s.maxLife);
      ctx.fillStyle = `rgba(255,230,150,${a})`;
      ctx.beginPath();
      ctx.arc(sx, s.y, 1.5 + a * 2.5, 0, Math.PI * 2);
      ctx.fill();
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
        ctx.fillStyle = g;
        ctx.fillRect(sx - 30, 0, 60, GROUND_Y);
        ctx.fillStyle = `rgba(255,230,160,${0.6 + pulse * 0.3})`;
        ctx.font = 'bold 12px serif';
        ctx.textAlign = 'center';
        ctx.fillText('→ 居民区', sx, GROUND_Y - 60);
        ctx.textAlign = 'left';
      }
    }

    ctx.restore();

    // === HUD ===
    this._drawHUD(ctx);
  }

  _drawPlayer(ctx, sx, sy, gameTime) {
    const p = this.p;
    if (p.hurt > 0 && Math.floor(gameTime / 60) % 2 === 0) return;

    const t = gameTime * 0.001;
    const onGround = p.onGround;
    const facing = p.facing;
    const vx = p.vx;
    const vy = p.vy;

    // 落地时的轻微挤压 & 扬起尘土
    let squash = 0;
    if (p.landTimer > 0) {
      squash = (p.landTimer / 120) * 2.5;
      const u = p.landTimer / 120;
      ctx.fillStyle = `rgba(200,190,170,${0.45 * u})`;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.arc(sx + side * (10 + u * 12), sy - u * 4, 2 + u * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const walkBob = onGround && Math.abs(vx) > 0.1 ? Math.sin(p.walkCycle * 2) * 1.5 : 0;
    const cy = sy + walkBob - squash;

    // 阴影（空中缩小）
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    const shadowR = Math.max(4, 10 - Math.abs(vy) * 0.25);
    ctx.ellipse(sx, sy + 2, shadowR, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 攻击进度（挥砍发生在 0.2-0.5）
    let aProg = 0;
    let slashProg = 0;
    if (p.attacking > 0) {
      aProg = 1 - p.attacking / ATTACK_DURATION;
      slashProg = Math.max(0, Math.min(1, (aProg - 0.2) / 0.3));
    }

    // 身体前倾 / 起跳倾斜
    let lean = 0;
    if (p.attacking > 0) {
      lean = facing * (1.2 + slashProg * 1.2);
    } else if (!onGround) {
      lean = facing * 2 + vx * 0.6;
    } else if (Math.abs(vx) > 0.1) {
      lean = facing * 1.2;
    }

    // 攻击时轻微前冲（不影响判定）
    let lunge = 0;
    if (p.attacking > 0) {
      lunge = facing * Math.sin(slashProg * Math.PI) * 4;
    }
    const cx = sx + lunge;

    const hipY = cy - 6;
    const torsoTop = cy - 20;
    const shoulderY = cy - 15;
    const headY = cy - 24;
    const armY = cy - 14;

    // 配色 (与 top-down 同步)
    const bodyColor = '#4e5156'; // 焦炭墨灰生存连体服 (sidescroll 里玩家始终已穿好衣服)
    const trimColor = '#36383c'; // 褶皱/腰带焦墨黑
    const gearColor = '#5c4e40'; // 战术包带/挂带皮革褐
    const goldLockColor = '#e0b262'; // 发光鎏金扣
    const gloveColor = '#322e2a'; // 战术防尘手套
    const headColor = '#ecdab9'; // 羊脂玉肤色
    const hairColor = '#2a2018'; // 暗褐黑发
    const bootColor = '#24201c'; // 深褐皮生存靴

    // 围巾/衣摆在身后飘动 (修改为鎏金红发热围巾，并使用更柔和的动态摆动)
    ctx.strokeStyle = 'rgba(204, 73, 73, 0.82)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // 围巾飘动方向在 vx 加速时拉伸
    const tailX = cx - facing * (14 + Math.abs(vx) * 3) + Math.sin(t * 6 + facing) * 2;
    const tailY = torsoTop + 10 + Math.cos(t * 5) * 3 - vy * 0.5;
    ctx.moveTo(cx - facing * 3, shoulderY + 2);
    ctx.quadraticCurveTo(cx - facing * 8 - vx * 1.5, shoulderY + 5 - vy * 0.3, tailX, tailY);
    ctx.stroke();

    // 腿：带膝盖弯曲的二次曲线
    const drawLeg = (hipX, footX, footY, bend) => {
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      const kneeX = (hipX + footX) / 2 + bend;
      const kneeY = (hipY + footY) / 2 - 4;
      ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
      ctx.stroke();

      // 绘制深褐皮生存靴底
      ctx.fillStyle = bootColor;
      ctx.beginPath();
      ctx.ellipse(footX, footY, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    if (p.onLadder) {
      const climbSwing = Math.sin(p.walkCycle * 2) * 3;
      drawLeg(cx - 3, cx - 3 + climbSwing, sy, 0);
      drawLeg(cx + 3, cx + 3 - climbSwing, sy, 0);
    } else if (onGround) {
      const swing = Math.sin(p.walkCycle * 2) * 7;
      const leftFootX = cx - 4 + swing;
      const rightFootX = cx + 4 - swing;
      drawLeg(cx - 3, leftFootX, sy, -Math.abs(swing) * 0.35);
      drawLeg(cx + 3, rightFootX, sy, Math.abs(swing) * 0.35);
    } else {
      const airPhase = Math.sin(gameTime * 0.012) * 0.4;
      const rising = vy < 0;
      // 前腿蜷起，后腿拖后
      const frontFootX = cx + facing * (rising ? 7 : 5) + airPhase * 2;
      const frontFootY = cy - (rising ? 8 : 2);
      const backFootX = cx - facing * (rising ? 4 : 6) - airPhase * 2;
      const backFootY = cy - (rising ? 3 : 4);
      drawLeg(cx + facing * 2, frontFootX, frontFootY, facing * (rising ? -3 : 2));
      drawLeg(cx - facing * 2, backFootX, backFootY, -facing * (rising ? -2 : 3));
    }

    // 躯干
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(cx - 5 + lean, torsoTop);
    ctx.lineTo(cx - 6 - lean * 0.3, cy - 6);
    ctx.lineTo(cx + 6 - lean * 0.3, cy - 6);
    ctx.lineTo(cx + 5 + lean, torsoTop);
    ctx.closePath();
    ctx.fill();

    // 绘制前胸的战术斜跨挂带细节 (两侧同步)
    ctx.strokeStyle = gearColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 4 + lean, torsoTop + 2);
    ctx.lineTo(cx + 4 - lean * 0.3, cy - 8);
    ctx.stroke();
    // 斜挎带的鎏金合金扣
    ctx.fillStyle = goldLockColor;
    ctx.beginPath();
    ctx.arc(cx - 1 + lean * 0.5, torsoTop + 6, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 腰带
    ctx.fillStyle = trimColor;
    ctx.fillRect(cx - 6, cy - 11, 12, 2);

    // 头
    const headX = cx + lean * 0.6;
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(headX, headY, 5, 0, Math.PI * 2);
    ctx.fill();
    // 头发
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(headX, headY - 2, 5.2, Math.PI, 0);
    ctx.fill();
    // 刘海与碎发随风摆动
    ctx.beginPath();
    ctx.moveTo(headX - 4, headY - 2);
    ctx.quadraticCurveTo(headX - 6 - facing - vx * 0.3, headY - 5, headX - 2, headY - 7);
    ctx.fill();

    // 凌乱翘起碎发
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(headX - 1, headY - 7.5);
    ctx.quadraticCurveTo(headX - 2 - facing, headY - 9, headX - 3, headY - 6.5);
    ctx.stroke();

    // 眼 (战术护目镜或眼睛)
    ctx.fillStyle = '#1a1612';
    ctx.beginPath();
    ctx.arc(headX + facing * 2.5, headY + 1, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // 手臂 + 剑
    if (p.attacking > 0) {
      // 以朝向为基准的局部角度：0=正前方，负=后上方，正=前下方
      const fwd = facing > 0 ? 0 : Math.PI;
      const ang = (local) => fwd + facing * local;
      // 三段：蓄力(0-0.2) → 挥砍(0.2-0.5) → 收回(0.5-1)
      let local;
      if (aProg < 0.2) {
        const u = aProg / 0.2;
        local = -0.3 - u * 0.8; // 待机 → 后上方抬起
      } else if (aProg < 0.5) {
        const u = (aProg - 0.2) / 0.3;
        local = -1.1 + u * 1.9; // 后上 → 前下挥落（约 110°）
      } else {
        const u = (aProg - 0.5) / 0.5;
        local = 0.8 - u * 1.1; // 前下 → 收回待机
      }
      const armAngle = ang(local);
      const armLen = KNIFE_ARM_LEN;
      const bladeLen = KNIFE_BLADE_LEN;
      const shoulderX = cx + facing * 3;
      const handX = shoulderX + Math.cos(armAngle) * armLen;
      const handY = shoulderY + Math.sin(armAngle) * armLen;
      const tipX = handX + Math.cos(armAngle) * bladeLen;
      const tipY = handY + Math.sin(armAngle) * bladeLen;

      // 短刀反光：修改为合金刻刀发光，产生金色流光净化感
      if (slashProg > 0 && slashProg < 1) {
        const peak = Math.sin(slashProg * Math.PI);
        const flashStartX = handX + Math.cos(armAngle) * bladeLen * 0.55;
        const flashStartY = handY + Math.sin(armAngle) * bladeLen * 0.55;
        ctx.strokeStyle = `rgba(255, 215, 142, ${peak * 0.85})`; // 金色发光
        ctx.lineWidth = 3.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(flashStartX, flashStartY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // 额外的泼墨弧形光效粒子
        ctx.fillStyle = `rgba(224, 178, 98, ${peak * 0.28})`;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 6 * peak, 0, Math.PI * 2);
        ctx.fill();
      }

      // 持剑手臂 (战术手套配色)
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // 剑刃 (记忆合金发光刻刀)
      ctx.strokeStyle = '#e0b262'; // 鎏金色刀身
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      // 刃光高亮
      ctx.strokeStyle = 'rgba(255, 235, 180, 0.95)';
      ctx.lineWidth = 1.2;
      const gx = -Math.sin(armAngle);
      const gy = Math.cos(armAngle);
      ctx.beginPath();
      ctx.moveTo(handX + gx, handY + gy);
      ctx.lineTo(tipX + gx, tipY + gy);
      ctx.stroke();

      // 护手
      ctx.strokeStyle = '#9a8a70';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(handX - Math.sin(armAngle) * 3.5, handY + Math.cos(armAngle) * 3.5);
      ctx.lineTo(handX + Math.sin(armAngle) * 3.5, handY - Math.cos(armAngle) * 3.5);
      ctx.stroke();
    } else {
      let handX, handY;
      if (!onGround) {
        const airArm = Math.sin(gameTime * 0.015) * 2;
        handX = cx + facing * 10 + airArm;
        handY = armY - 3 + (vy < 0 ? -4 : 2);
      } else {
        const armSwing = Math.abs(vx) > 0.1 ? Math.sin(p.walkCycle * 2 + Math.PI) * 5 : 0;
        handX = cx + facing * 9;
        handY = armY + 4 + armSwing;
      }
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + facing * 3, shoulderY);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // 战术防尘手套
      ctx.fillStyle = gloveColor;
      ctx.beginPath();
      ctx.arc(handX, handY, 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (p.hasKnife) {
        // 待机/行走的剑
        const bladeLen = 18;
        const tipX = handX + facing * bladeLen;
        const tipY = handY - 1;
        ctx.strokeStyle = '#d4a86a'; // 金色待机刀刃
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.strokeStyle = '#fff0c0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(handX, handY - 1);
        ctx.lineTo(tipX, tipY - 1);
        ctx.stroke();
        ctx.strokeStyle = '#9a8a70';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(handX, handY - 3);
        ctx.lineTo(handX, handY + 3);
        ctx.stroke();
      }
    }
  }

  _drawGeng(ctx, sx, sy, e, gameTime) {
    const flash = e.hitFlash > 0;
    const t = gameTime * 0.001 + e.t;
    const wob = e.onGround ? Math.sin(e.walkPhase * 2) * 1.5 : 0;
    const breathe = 0.5 + Math.sin(t * 3.2) * 0.5;
    const lean = e.dir * (1.5 + Math.sin(t * 4) * 0.8);
    const cy = sy - 11 + wob;
    ctx.save();
    ctx.translate(sx, cy);

    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(0, sy - cy + 2, 13, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
    g.addColorStop(0, flash ? 'rgba(255,255,255,0.7)' : `rgba(105,255,145,${0.34 + breathe * 0.12})`);
    g.addColorStop(0.5, 'rgba(38,170,80,0.16)');
    g.addColorStop(1, 'rgba(80,220,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-34, -34, 68, 68);

    ctx.strokeStyle = `rgba(120,255,150,${0.15 + breathe * 0.18})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const r = 18 + i * 5 + breathe * 2;
      ctx.beginPath();
      ctx.ellipse(0, -1, r * 0.8, r, Math.sin(t + i) * 0.25, 0, Math.PI * 2);
      ctx.stroke();
    }

    const legSwing = e.onGround ? Math.sin(e.walkPhase * 2) * 4 : 2;
    ctx.strokeStyle = 'rgba(44,140,62,0.75)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, 8);
    ctx.lineTo(-6 + legSwing, sy - cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, 8);
    ctx.lineTo(6 - legSwing, sy - cy);
    ctx.stroke();

    const body = ctx.createLinearGradient(-12, -16, 14, 16);
    body.addColorStop(0, flash ? 'rgba(230,255,230,0.92)' : 'rgba(145,255,160,0.72)');
    body.addColorStop(0.45, 'rgba(64,205,96,0.68)');
    body.addColorStop(1, 'rgba(24,92,50,0.78)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-3 + lean, -17);
    ctx.bezierCurveTo(-17, -14, -16, 2, -10, 10);
    ctx.bezierCurveTo(-6, 16, 7, 17, 12, 8);
    ctx.bezierCurveTo(18, -3, 12, -16, 3 + lean, -18);
    ctx.bezierCurveTo(1, -15, -1, -15, -3 + lean, -17);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(150,255,170,${flash ? 0.95 : 0.55 + breathe * 0.25})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(20,40,20,0.9)';
    ctx.beginPath();
    ctx.ellipse(1, 3, 8.5, 4.6 + breathe * 1.4, 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(215,255,215,0.72)';
    for (let i = 0; i < 5; i++) {
      const tx = -7 + i * 3.5;
      ctx.beginPath();
      ctx.moveTo(tx, 1);
      ctx.lineTo(tx + 1, 6 + Math.sin(t * 6 + i) * 0.8);
      ctx.lineTo(tx + 2, 1.5);
      ctx.fill();
    }

    ctx.fillStyle = '#061406';
    ctx.beginPath();
    ctx.ellipse(-5, -5, 2.2, 3.1, -0.2, 0, Math.PI * 2);
    ctx.ellipse(5, -5, 2.2, 3.1, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(210,255,200,${0.5 + breathe * 0.3})`;
    ctx.beginPath();
    ctx.arc(-5.5, -6.2, 0.7, 0, Math.PI * 2);
    ctx.arc(4.5, -6.2, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '8px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(170,255,180,${0.34 + breathe * 0.24})`;
    ctx.fillText('梗', -17, -7 + Math.sin(t * 2) * 2);
    ctx.fillText('梗', 18, 1 + Math.cos(t * 2.4) * 2);
    ctx.fillText('噪', 1, 21 + Math.sin(t * 2.8) * 1.5);
    ctx.textAlign = 'left';

    ctx.restore();
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx - 12, cy - 20, 24, 3);
      ctx.fillStyle = '#80dd80';
      ctx.fillRect(sx - 12, cy - 20, 24 * (e.hp / e.maxHp), 3);
    }
  }

  _drawShuyuan(ctx, sx, sy, gameTime) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 2, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a7888';
    ctx.beginPath();
    ctx.moveTo(sx - 10, sy - 8);
    ctx.lineTo(sx - 13, sy + 2);
    ctx.lineTo(sx + 13, sy + 2);
    ctx.lineTo(sx + 10, sy - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath();
    ctx.arc(sx, sy - 15, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(sx, sy - 16, 6, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy - 13);
    ctx.lineTo(sx - 1, sy - 10);
    ctx.moveTo(sx + 2, sy - 13);
    ctx.lineTo(sx + 1, sy - 10);
    ctx.stroke();
    const pulse = 0.6 + Math.sin(gameTime * 0.004) * 0.3;
    ctx.fillStyle = `rgba(255,220,140,${pulse})`;
    ctx.beginPath();
    ctx.arc(sx + 12, sy - 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawHUD(ctx) {
    // SAN 条
    const sanW = 140,
      sanH = 12,
      sx = 16,
      sy = 14;
    const ratio = Math.max(0, this.game.player.san / this.game.player.maxSan);
    ctx.fillStyle = 'rgba(20,15,10,0.8)';
    ctx.fillRect(sx, sy, sanW, sanH);
    const col = ratio > 0.5 ? '#7ad07a' : ratio > 0.25 ? '#e0b850' : '#d04040';
    ctx.fillStyle = col;
    ctx.fillRect(sx + 1, sy + 1, (sanW - 2) * ratio, sanH - 2);
    ctx.strokeStyle = 'rgba(220,200,150,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, sanW, sanH);
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.font = 'bold 9px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('理性', sx + 5, sy + sanH / 2);
    ctx.textBaseline = 'alphabetic';
    // 武器提示
    if (this.p.hasKnife) {
      ctx.fillStyle = 'rgba(255,220,140,0.7)';
      ctx.font = 'bold 11px serif';
      ctx.fillText('记忆合金小刀 · J 挥刀', sx, sy + sanH + 18);
    } else {
      ctx.fillStyle = 'rgba(200,200,200,0.6)';
      ctx.font = '11px serif';
      ctx.fillText('向前走，找老人……', sx, sy + sanH + 18);
    }
    // 剩余敌人计数 + 段落标识
    const left = this.enemies.filter((e) => e.alive).length;
    ctx.fillStyle = 'rgba(120,220,120,0.7)';
    ctx.font = 'bold 11px serif';
    ctx.textAlign = 'right';
    ctx.fillText(`梗鬼 ${left}`, W - 16, sy + 12);
    // 当前段落
    const px = this.p.x;
    const segName = px < SEG1_END ? '前段·教学' : px < SEG2_END ? '中段·攀爬' : '后段·跳跃';
    ctx.fillStyle = 'rgba(255,220,140,0.6)';
    ctx.font = '10px serif';
    ctx.fillText(segName, W - 16, sy + 28);
    if (px > SEG2_END && !this._jumpHintShown) {
      ctx.fillStyle = 'rgba(255,220,140,0.5)';
      ctx.font = '9px serif';
      ctx.textAlign = 'right';
      ctx.fillText('空格/W 跳跃上台阶', W - 16, sy + 44);
    }
    ctx.textAlign = 'left';
  }
}
