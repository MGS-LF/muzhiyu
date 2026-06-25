// 游戏主类
import { W, H } from './config.js';
import { input } from './input.js';
import { Player } from './player.js';
import { scenes } from './scenes.js';
import { Camera, render } from './render.js';

const DIALOGS = {
  wake: [
    { s: '系统', t: '黑暗。漫长的、没有任何梦境的黑暗。' },
    { s: '系统', t: '"冷冻程序终止。苏醒程序启动。"' },
    { s: '系统', t: '"当前时间：公元2147年10月17日。"' },
    { s: '顾言', t: '我睡了多久？这里……为什么一个人都没有？' },
    { s: '系统', t: '顾言推开解冻的仓盖，走出了冷冻中心。' },
    { s: '系统', t: '（按 WASD 移动，按 E 与场景交互）' },
  ],
  terminal: [
    { s: '终端机', t: '> 冷冻程序终止。苏醒程序启动。' },
    { s: '终端机', t: '> 当前时间：公元2147年10月17日。' },
    { s: '终端机', t: '> 距合同解冻日已过去 108 年。' },
    { s: '终端机', t: '> 无其他存活信号。你可能是最后一个。' },
  ],
  locker: [
    { s: '顾言', t: '储物柜里有一套灰色连体服……还有一双靴子。' },
    { s: '顾言', t: '穿上吧。外面不知道是什么样子。' },
    { s: '系统', t: '（获得：灰色连体服）' },
  ],
  exitLocked: [
    { s: '顾言', t: '这扇门好重……' },
    { s: '系统', t: '（光着身子就出去不太好。先换身衣服吧。）' },
  ],
  exitOpen: [
    { s: '顾言', t: '门被推开了。' },
    { s: '系统', t: '外面是一股说不清道不明的气味——废墟的气味。' },
    { s: '系统', t: '（走出冷冻中心）' },
  ],
  lost_people: [
    { s: '系统', t: '一群人围坐在一起，衣服又脏又破。' },
    { s: '顾言', t: '你好——' },
    { s: '路人A', t: '鸡你太美。' },
    { s: '路人B', t: '哎哟你干嘛～ 蚌埠住了绝绝子！' },
    { s: '顾言', t: '什么？他们在说什么……' },
    { s: '系统', t: '（他们的眼睛空洞得像枯井。失语者。）' },
  ],
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera();
    this.player = new Player(360, 540);
    this.scene = null;
    this.dialogState = null;
    this.hints = [];
    this.collected = new Set();
    this.flags = { wake_done: false };
    this.gameTime = 0;
    this.lastTime = 0;
  }

  start() {
    this.loadScene('freeze_center');
    this.camera.snap(this.player.x, this.player.y, this.scene.width, this.scene.height);
    setTimeout(() => {
      if (!this.flags.wake_done) {
        this.flags.wake_done = true;
        this.startDialog(DIALOGS.wake, '');
      }
    }, 500);
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  loadScene(sceneId, spawnOverride) {
    this.scene = JSON.parse(JSON.stringify(scenes[sceneId]));
    const spawn = spawnOverride || this.scene.spawn;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.camera.snap(spawn.x, spawn.y, this.scene.width, this.scene.height);
    this.dialogState = null;
    console.log('[场景] 加载:', sceneId, '生成点', spawn);
  }

  // 碰撞检测
  collides(x, y, r) {
    for (const wall of this.scene.walls) {
      if (x + r > wall.x && x - r < wall.x + wall.w &&
          y + r > wall.y && y - r < wall.y + wall.h) return true;
    }
    for (const p of this.scene.props) {
      if (x + r > p.x && x - r < p.x + p.w &&
          y + r > p.y && y - r < p.y + p.h) return true;
    }
    // 门禁：冷冻中心南墙门洞，只有真正"推门出去"后才能通过
    if (this.scene.id === 'freeze_center' && !this.flags.door_opened) {
      // 门洞范围 x: 270~480, y: 570~600
      if (x + r > 270 && x - r < 480 &&
          y + r > 570 && y - r < 600) return true;
    }
    return false;
  }

  loop(now) {
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;
    this.gameTime += dt;
    this.update(dt);
    render(this, this.gameTime);
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    // 对话期间：按 E 推进
    if (this.dialogState) {
      if (input.wasPressed('e') || input.wasPressed(' ') || input.wasPressed('enter')) {
        this.advanceDialog();
      }
      return;
    }

    // 玩家移动
    this.player.update(dt, input, this);

    // 拾取物自动靠近时显示提示
    // 交互
    if (input.wasPressed('e')) {
      this.tryInteract();
    }
  }

  tryInteract() {
    // 找最近的 interactable
    let best = null, bd = 50;
    for (const it of this.scene.interactables) {
      const d = Math.hypot(it.x - this.player.x, it.y - this.player.y);
      if (d < bd) { bd = d; best = it; }
    }

    if (best) {
      // === 大门：必须先有衣服才能开 ===
      if (best.type === 'exit') {
        if (!this.player.hasClothes) {
          // 没衣服，提示需要先去更衣室
          this.startDialog(DIALOGS.exitLocked, '大门');
          return;
        }
        // 有衣服 → 推门对话 → 对话结束后开门 + 切换场景
        this.startDialog(DIALOGS.exitOpen, '大门', () => {
          this.flags.door_opened = true;  // 真正推开了门
          this.loadScene('street_01', { x: 440, y: 100 });
          this.showHint('走出冷冻中心，外面是废墟的世界。');
        });
        return;
      }

      // === 终端机 ===
      if (best.type === 'terminal') {
        this.startDialog(DIALOGS.terminal, '终端机');
        return;
      }

      // === 储物柜 ===
      if (best.type === 'locker') {
        if (this.player.hasClothes) {
          this.showHint('已经换过衣服了。');
        } else {
          this.startDialog(DIALOGS.locker, '储物柜', () => {
            this.player.hasClothes = true;
            this.showHint('获得：灰色连体服');
          });
        }
        return;
      }

      // === 场景切换（街道回冷冻中心等）===
      if (best.type === 'scene_change') {
        this.loadScene(best.target, best.spawn);
        return;
      }

      // === 对话型 NPC ===
      if (best.type === 'dialog') {
        this.startDialog(DIALOGS[best.dialogKey] || [], best.label);
        return;
      }

      // === 主角仓 ===
      if (best.type === 'pod') {
        this.showHint('这是我苏醒的冷冻仓。');
        return;
      }
    }

    // 拾取物
    for (const it of this.scene.items) {
      if (this.collected.has(it.id)) continue;
      if (Math.hypot(it.x - this.player.x, it.y - this.player.y) < 20) {
        this.collected.add(it.id);
        this.showHint('获得：旧书页');
      }
    }
  }

  startDialog(lines, name, onComplete) {
    if (!lines || lines.length === 0) return;
    this.dialogState = {
      lines, name,
      idx: 0, charIdx: 0, charTimer: 0, done: false,
      onComplete,
    };
  }

  advanceDialog() {
    const d = this.dialogState;
    if (!d) return;
    if (!d.done) {
      d.charIdx = d.lines[d.idx].t.length;
      d.done = true;
      return;
    }
    d.idx++;
    if (d.idx >= d.lines.length) {
      const cb = d.onComplete;
      this.dialogState = null;
      if (cb) cb();
    } else {
      d.charIdx = 0;
      d.charTimer = 0;
      d.done = false;
    }
  }

  showHint(text) {
    this.hints.push({ t: text, life: 2500 });
  }
}
