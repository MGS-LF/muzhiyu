// 江堤 · 2D横版关卡（魂斗罗式）
// 重力 + 跳跃 + 平台；鼠标左键小刀近战；老人开局交付武器；右端出口通向居民区
import { W, H } from './config.js';

const GRAVITY = 0.55;
const JUMP_V = -12.5;
const MOVE_SPD = 3.4;
const GROUND_Y = 624;
const LEVEL_W = 3200;
const KNIFE_REACH = 46;
const KNIFE_COOLDOWN = 320;
const KNIFE_DMG = 34;

// 老人交付小刀的对白
const KNIFE_DIALOG = [
  { s: '书远', t: '江堤这条路，被梗鬼堵了。它们贴着芦苇丛飘，碰到你就咬你的字。' },
  { s: '书远', t: '近身的东西，诗一时半刻念不利索。这把小刀给你——记忆合金打的，专破那层绿皮。' },
  { s: '系统', t: '（A/D 左右走，W 或空格跳跃，鼠标左键挥刀近战）' },
  { s: '书远', t: '砍通这条堤，东头就是去居民区的路。我在出口等你。' },
  { s: '顾言', t: '……多谢。' },
  { s: '系统', t: '（获得：记忆合金小刀）' },
];

const EXIT_DIALOG = [
  { s: '系统', t: '你穿过长堤，踩过最后一片芦苇。东面的路口通向废墟居民区。' },
  { s: '书远', t: '（远处传来老人的声音）我在前面等你——居民区里，有更深的的东西。' },
];

// 碑文解谜：玩家需在场景中找到 3 块残碑，拼出诗句后开启上层捷径（跳过部分敌人）
const STELE_HINT = [
  '一块半埋在沙里的石碑，刻着残缺的字：「关关__鸠」',
  '一块倾斜的石碑，刻着：「在河之__」',
  '一块断裂的石碑，刻着：「君子好__」',
];
const STELE_SOLVED = '三块残碑在你心中连成一句：「关关雎鸠，在河之洲，君子好逑。」金光从碑缝里渗出，一条石阶从江堤升起，通向上层的捷径。';
const STELE_DIALOG = [
  { s: '系统', t: '石碑上刻着残缺的诗句。你蹲下来辨认……' },
  { s: '顾言', t: '是《关雎》。书远教过我。' },
  { s: '系统', t: '（已记录这块残碑。集齐三块，或许能打开什么。）' },
];

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
    };
    this.cameraX = 0;
    // 平台 {x,y,w,h} —— y 是平台顶面
    this.platforms = [
      { x: 460, y: 500, w: 150, h: 14 },
      { x: 720, y: 420, w: 140, h: 14 },
      { x: 980, y: 490, w: 160, h: 14 },
      { x: 1280, y: 380, w: 150, h: 14 },
      { x: 1520, y: 470, w: 140, h: 14 },
      { x: 1800, y: 400, w: 160, h: 14 },
      { x: 2100, y: 490, w: 150, h: 14 },
      { x: 2380, y: 410, w: 150, h: 14 },
      { x: 2660, y: 480, w: 170, h: 14 },
    ];
    // 梗鬼 {x,y,vy,vx,hp,maxHp,range,baseX,alive,t}
    this.enemies = [
      this._mkGeng(380, 560, 120),
      this._mkGeng(640, 380, 90),
      this._mkGeng(1060, 430, 110),
      this._mkGeng(1350, 330, 100),
      this._mkGeng(1620, 420, 90),
      this._mkGeng(1880, 350, 100),
      this._mkGeng(2200, 440, 120),
      this._mkGeng(2480, 360, 100),
      this._mkGeng(2780, 430, 130),
      this._mkGeng(2980, 540, 80),
    ];
    // 老人 NPC
    this.npc = { x: 175, y: GROUND_Y, talked: this.p.hasKnife, t: 0 };
    // 出口
    this.exitX = 3080;
    this.done = false;
    this.exitTriggered = false;
    this.intent = 'forward'; // forward | back | dead
    this.gameTime = 0;

    // === 探索元素 ===
    // 返回传送点（老人旁边的光圈）
    this.returnPortal = { x: 120, y: GROUND_Y, active: !!game.flags.sidescroll_lantern, cooldown: 0 };
    // 隐藏书页（散落，拾取恢复 SAN）
    this.pages = [
      { x: 540, y: 470, taken: false },
      { x: 1340, y: 350, taken: false },
      { x: 1850, y: 370, taken: false },
      { x: 2430, y: 380, taken: false },
      { x: 2720, y: 450, taken: false },
    ];
    // 三块残碑（解谜）
    this.steles = [
      { x: 880, y: GROUND_Y, idx: 0, found: false },
      { x: 1640, y: GROUND_Y, idx: 1, found: false },
      { x: 2560, y: GROUND_Y, idx: 2, found: false },
    ];
    this.steleSolved = !!game.flags.sidescroll_stele;
    // 上层捷径平台（解谜完成后激活）
    this.upperPath = [
      { x: 2900, y: 300, w: 120, h: 12 },
      { x: 3040, y: 240, w: 120, h: 12 },
    ];
  }

  _mkGeng(x, y, range) {
    return { x, y, baseX: x, baseY: y, vx: 0.8, vy: 0, range, hp: 60, maxHp: 60, alive: true, t: Math.random() * 6, hitFlash: 0 };
  }

  update(dt, input) {
    this.gameTime += dt;
    const p = this.p;
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
          this.game.showHint('鼠标左键：挥刀  ·  老人旁光圈按 E 返回街道  ·  留意残碑与书页');
        });
      });
      return;
    }
    if (!this.p.hasKnife) {
      // 没刀时只能往老人方向走，不能越过
      if (p.x > this.npc.x + 60) p.x = this.npc.x + 60;
    }

    // === 返回传送点（老人旁光圈，按 E 返回街道）===
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

    // === 残碑解谜（按 E 辨认 + 刻字）===
    if (input.wasPressed('e') && !this.steleSolved) {
      for (const st of this.steles) {
        if (st.found) continue;
        if (Math.abs(st.x - p.x) < 36 && p.onGround) {
          st.found = true;
          const remain = this.steles.filter(s => !s.found).length;
          if (remain === 0) {
            this.steleSolved = true;
            this.game.flags.sidescroll_stele = true;
            this.game.startDialog([
              { s: '系统', t: STELE_SOLVED },
              { s: '系统', t: '（三碑已齐。现在你可以在任意残碑上刻字留念——走近按 E）' },
            ], '残碑', () => {
              // 解谜完成后，允许在已辨认的残碑上刻字
            });
          } else {
            this.game.startDialog([
              { s: '系统', t: STELE_HINT[st.idx] },
              ...STELE_DIALOG,
            ], '残碑');
          }
          return;
        }
      }
    }
    // 残碑刻字（解谜完成后，在已辨认残碑上按 E 刻字）
    if (input.wasPressed('e') && this.steleSolved) {
      for (const st of this.steles) {
        if (Math.abs(st.x - p.x) < 36 && p.onGround) {
          // 用 game 的刻字系统
          this.game.startEngraving(st, 'stele');
          return;
        }
      }
    }

    // === 玩家输入 ===
    let mx = 0;
    if (input.isDown('a') || input.isDown('arrowleft')) mx -= 1;
    if (input.isDown('d') || input.isDown('arrowright')) mx += 1;
    if (mx !== 0) {
      p.vx = mx * MOVE_SPD;
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
    // 小刀攻击
    if (p.attackCD > 0) p.attackCD -= dt;
    if (p.attacking > 0) p.attacking -= dt;
    if (p.hasKnife && input.mousePressed() && p.attackCD <= 0) {
      p.attacking = 200;
      p.attackCD = KNIFE_COOLDOWN;
      this._doKnifeHit();
    }

    // === 物理 ===
    p.vy += GRAVITY;
    if (p.vy > 16) p.vy = 16;
    p.x += p.vx;
    p.y += p.vy;
    // 关卡边界
    if (p.x < 16) p.x = 16;
    if (p.x > LEVEL_W - 16) p.x = LEVEL_W - 16;
    // 地面
    p.onGround = false;
    if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.vy = 0; p.onGround = true; }
    // 平台碰撞（仅从上方落下时）
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
    // 上层捷径平台（仅解谜后激活）
    if (this.steleSolved) {
      for (const pl of this.upperPath) {
        const px1 = p.x - p.w / 2, px2 = p.x + p.w / 2;
        if (px2 > pl.x && px1 < pl.x + pl.w) {
          const feet = p.y, prevFeet = p.y - p.vy;
          if (p.vy >= 0 && prevFeet <= pl.y + 2 && feet >= pl.y) {
            p.y = pl.y; p.vy = 0; p.onGround = true;
          }
        }
      }
    }
    if (p.hurt > 0) p.hurt -= dt;

    // === 敌人 ===
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t += dt * 0.003;
      // 巡逻：左右飘
      e.x = e.baseX + Math.sin(e.t) * e.range;
      e.y = e.baseY + Math.sin(e.t * 1.7) * 14;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      // 接触玩家造成伤害
      const dx = e.x - p.x, dy = e.y - p.y + 10;
      if (Math.hypot(dx, dy) < 26 && p.hurt <= 0) {
        this.game.player.san = Math.max(0, this.game.player.san - 8);
        p.hurt = 700;
        p.vx = -p.facing * 4; // 击退
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
      const dx = e.x - hx, dy = e.y - hy;
      if (Math.hypot(dx, dy) < KNIFE_REACH && (Math.sign(dx) === p.facing || Math.abs(dx) < 14)) {
        e.hp -= KNIFE_DMG;
        e.hitFlash = 120;
        e.baseX += p.facing * 6; // 击退
        if (e.hp <= 0) {
          e.alive = false;
          this.game.player.san = Math.min(this.game.player.maxSan, this.game.player.san + 6);
        }
      }
    }
  }

  _onDeath() {
    // 死亡：回最近要石（交给 game 处理）
    this.game.showHint('你的理性在江堤上耗尽了……');
    this.game.flags.sidescroll_failed = true;
    this.intent = 'dead';
    this.done = true; // 退出横版，由 game 处理复活
  }

  isDone() { return this.done; }
  getIntent() { return this.intent; }
  getExitTarget() {
    // 通关 → 居民区
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
    // 落日（视差 0.2）
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
    // 远景对岸（视差 0.4）
    ctx.fillStyle = 'rgba(15,10,8,0.85)';
    for (let i = 0; i < 8; i++) {
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
    // 落日倒影
    if (sunX > -80 && sunX < W + 80) {
      const rg = ctx.createLinearGradient(0, waterY, 0, waterY + 120);
      rg.addColorStop(0, 'rgba(255,200,120,0.3)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = rg; ctx.fillRect(sunX - 50, waterY, 100, 120);
    }

    // === 江堤地面 ===
    ctx.fillStyle = '#4a4540';
    ctx.fillRect(0, GROUND_Y, W, 8);
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(0, GROUND_Y + 8, W, 4);
    // 地面碎石（固定世界坐标）
    ctx.fillStyle = 'rgba(60,50,40,0.6)';
    for (let i = 0; i < 60; i++) {
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
      // 石板平台
      ctx.fillStyle = '#3a3530';
      ctx.fillRect(sx, pl.y, pl.w, pl.h);
      ctx.fillStyle = '#4a4540';
      ctx.fillRect(sx, pl.y, pl.w, 3);
      ctx.strokeStyle = '#2a2520'; ctx.lineWidth = 1;
      ctx.strokeRect(sx, pl.y, pl.w, pl.h);
      // 草
      ctx.strokeStyle = '#5a6a30'; ctx.lineWidth = 1;
      for (let gx = sx + 6; gx < sx + pl.w - 4; gx += 10) {
        const sway = Math.sin(this.gameTime * 0.002 + gx) * 1.5;
        ctx.beginPath(); ctx.moveTo(gx, pl.y); ctx.quadraticCurveTo(gx + sway, pl.y - 6, gx + sway * 2, pl.y - 10); ctx.stroke();
      }
    }

    // === 芦苇（前景装饰，固定世界坐标）===
    for (let i = 0; i < 40; i++) {
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
    if (!this.npc.talked || this.gameTime < 99999) {
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

    // === 返回传送点（老人旁光圈）===
    if (this.returnPortal.active) {
      const sx = this.returnPortal.x - cam;
      if (sx > -40 && sx < W + 40) {
        const pulse = 0.5 + Math.sin(gameTime * 0.004) * 0.3;
        const g = ctx.createRadialGradient(sx, GROUND_Y - 4, 0, sx, GROUND_Y - 4, 36);
        g.addColorStop(0, `rgba(255,220,140,${0.45 * pulse + 0.2})`);
        g.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(sx, GROUND_Y - 2, 36, 14, 0, 0, Math.PI * 2); ctx.fill();
        // 内圈
        ctx.strokeStyle = `rgba(255,230,160,${0.6 + pulse * 0.3})`;
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.ellipse(sx, GROUND_Y - 2, 22, 9, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        // 标签
        const near = Math.abs(this.p.x - this.returnPortal.x) < 46;
        if (near) {
          ctx.fillStyle = `rgba(255,235,160,${0.85 + pulse * 0.15})`;
          ctx.font = 'bold 11px serif'; ctx.textAlign = 'center';
          ctx.fillText('E · 返回街道', sx, GROUND_Y - 30);
          ctx.textAlign = 'left';
        } else {
          ctx.fillStyle = `rgba(255,220,140,${0.4 + pulse * 0.2})`;
          ctx.font = '10px serif'; ctx.textAlign = 'center';
          ctx.fillText('← 街道', sx, GROUND_Y - 30);
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
      // 光晕
      const g = ctx.createRadialGradient(sx, pg.y + bob, 0, sx, pg.y + bob, 14);
      g.addColorStop(0, 'rgba(255,220,140,0.4)');
      g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 14, pg.y + bob - 14, 28, 28);
      // 书页
      ctx.fillStyle = '#d4b86a';
      ctx.fillRect(sx - 5, pg.y + bob - 7, 10, 13);
      ctx.fillStyle = '#e8cc88';
      ctx.fillRect(sx - 5, pg.y + bob - 7, 10, 3);
      ctx.strokeStyle = '#806020'; ctx.lineWidth = 0.5;
      ctx.strokeRect(sx - 5, pg.y + bob - 7, 10, 13);
    }

    // === 残碑 ===
    for (const st of this.steles) {
      const sx = st.x - cam;
      if (sx < -30 || sx > W + 30) continue;
      const found = st.found;
      // 碑体
      ctx.fillStyle = found ? '#6a6048' : '#3a3530';
      ctx.beginPath();
      ctx.moveTo(sx - 8, GROUND_Y); ctx.lineTo(sx - 6, GROUND_Y - 30);
      ctx.lineTo(sx + 6, GROUND_Y - 32); ctx.lineTo(sx + 8, GROUND_Y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1a1612'; ctx.lineWidth = 1; ctx.stroke();
      // 刻字（残缺）
      ctx.fillStyle = found ? `rgba(255,220,140,${0.7 + Math.sin(gameTime * 0.004) * 0.2})` : 'rgba(180,160,120,0.5)';
      ctx.font = 'bold 9px serif'; ctx.textAlign = 'center';
      ctx.fillText(['關關', '河之', '好逑'][st.idx], sx, GROUND_Y - 18);
      ctx.textAlign = 'left';
      // 提示
      if (!found) {
        const near = Math.abs(this.p.x - st.x) < 36;
        if (near) {
          const pulse = 0.6 + Math.sin(gameTime * 0.006) * 0.3;
          ctx.fillStyle = `rgba(255,220,140,${pulse})`;
          ctx.font = 'bold 10px serif'; ctx.textAlign = 'center';
          ctx.fillText('E · 辨认残碑', sx, GROUND_Y - 44);
          ctx.textAlign = 'left';
        }
      }
    }

    // === 上层捷径平台（解谜后显示）===
    if (this.steleSolved) {
      for (const pl of this.upperPath) {
        const sx = pl.x - cam;
        if (sx + pl.w < 0 || sx > W) continue;
        ctx.fillStyle = '#5a4a30'; ctx.fillRect(sx, pl.y, pl.w, pl.h);
        ctx.fillStyle = '#7a6a40'; ctx.fillRect(sx, pl.y, pl.w, 3);
        ctx.strokeStyle = '#3a3020'; ctx.lineWidth = 1; ctx.strokeRect(sx, pl.y, pl.w, pl.h);
        // 金光边缘
        ctx.strokeStyle = `rgba(255,220,140,${0.4 + Math.sin(gameTime * 0.003) * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(sx, pl.y); ctx.lineTo(sx + pl.w, pl.y); ctx.stroke();
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
    const legSwing = p.onGround && p.vx !== 0 ? Math.sin(p.walkCycle * 2) * 6 : (p.onGround ? 0 : 4);
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
      // 挥刀动画
      const prog = 1 - p.attacking / 200;
      const ang = (p.facing > 0 ? -0.6 : Math.PI + 0.6) + prog * (p.facing > 0 ? 1.6 : -1.6);
      const hx = sx + Math.cos(ang) * 22, hy = armY + Math.sin(ang) * 22;
      ctx.strokeStyle = '#5a6878'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(sx + p.facing * 4, armY); ctx.lineTo(hx, hy); ctx.stroke();
      // 刀
      const tx = hx + Math.cos(ang) * 16, ty = hy + Math.sin(ang) * 16;
      ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      // 刀光弧
      ctx.strokeStyle = `rgba(255,240,200,${0.5 * (1 - prog)})`; ctx.lineWidth = 3;
      ctx.beginPath();
      const a0 = ang - p.facing * 0.8, a1 = ang + p.facing * 0.2;
      ctx.arc(sx + p.facing * 4, armY, 30, a0, a1, p.facing < 0); ctx.stroke();
    } else {
      const armSwing = p.onGround && p.vx !== 0 ? Math.sin(p.walkCycle * 2 + Math.PI) * 5 : 0;
      ctx.strokeStyle = '#5a6878'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.moveTo(sx + p.facing * 4, armY); ctx.lineTo(sx + p.facing * 9, armY + 4 + armSwing); ctx.stroke();
      if (p.hasKnife) {
        // 持刀
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
    const wob = Math.sin(e.t * 3) * 3;
    // 光晕
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30);
    g.addColorStop(0, flash ? 'rgba(255,255,255,0.5)' : 'rgba(80,220,100,0.3)');
    g.addColorStop(1, 'rgba(80,220,100,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 30, sy - 30, 60, 60);
    // 身体（半透明绿团）
    ctx.fillStyle = flash ? 'rgba(200,255,200,0.9)' : 'rgba(80,210,90,0.7)';
    ctx.beginPath(); ctx.ellipse(sx, sy + wob, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
    // 大嘴
    ctx.fillStyle = 'rgba(20,40,20,0.9)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 4 + wob, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180,255,180,0.5)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(sx - 7 + i * 4, sy + 4 + wob); ctx.lineTo(sx - 6 + i * 4, sy + 9 + wob); ctx.lineTo(sx - 5 + i * 4, sy + 4 + wob); ctx.fill();
    }
    // 眼
    ctx.fillStyle = '#0a1a0a';
    ctx.beginPath(); ctx.arc(sx - 4, sy - 4 + wob, 2, 0, Math.PI * 2); ctx.arc(sx + 4, sy - 4 + wob, 2, 0, Math.PI * 2); ctx.fill();
    // HP 条
    if (e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 12, sy - 22, 24, 3);
      ctx.fillStyle = '#80dd80'; ctx.fillRect(sx - 12, sy - 22, 24 * (e.hp / e.maxHp), 3);
    }
  }

  _drawShuyuan(ctx, sx, sy, gameTime) {
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 2, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    // 袍
    ctx.fillStyle = '#5a7888';
    ctx.beginPath();
    ctx.moveTo(sx - 10, sy - 8); ctx.lineTo(sx - 13, sy + 2); ctx.lineTo(sx + 13, sy + 2); ctx.lineTo(sx + 10, sy - 8);
    ctx.closePath(); ctx.fill();
    // 头
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath(); ctx.arc(sx, sy - 15, 6, 0, Math.PI * 2); ctx.fill();
    // 白发
    ctx.fillStyle = '#ccc';
    ctx.beginPath(); ctx.arc(sx, sy - 16, 6, Math.PI, 0); ctx.fill();
    // 胡子
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx - 2, sy - 13); ctx.lineTo(sx - 1, sy - 10); ctx.moveTo(sx + 2, sy - 13); ctx.lineTo(sx + 1, sy - 10); ctx.stroke();
    // 提灯
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
    // 剩余敌人计数
    const left = this.enemies.filter(e => e.alive).length;
    ctx.fillStyle = 'rgba(120,220,120,0.7)'; ctx.font = 'bold 11px serif'; ctx.textAlign = 'right';
    ctx.fillText(`梗鬼 ${left}`, W - 16, sy + 12);
    // 残碑进度
    const found = this.steles.filter(s => s.found).length;
    if (!this.steleSolved) {
      ctx.fillStyle = 'rgba(255,220,140,0.6)'; ctx.font = '10px serif';
      ctx.fillText(`残碑 ${found}/3`, W - 16, sy + 28);
    } else {
      ctx.fillStyle = 'rgba(255,220,140,0.8)'; ctx.font = 'bold 10px serif';
      ctx.fillText('捷径已开', W - 16, sy + 28);
    }
    ctx.textAlign = 'left';
  }
}
