// 游戏主类
import { W, H } from './config.js';
import { input } from './input.js';
import { Player } from './player.js';
import { scenes } from './scenes.js';
import { Camera, render } from './render.js';
import { Battle } from './battle.js';

const DIALOGS = {
  wake: [
    { s: '系统', t: '黑暗。漫长的、没有任何梦境的黑暗。' },
    { s: '系统', t: '"冷冻程序终止。苏醒程序启动。"' },
    { s: '系统', t: '"当前时间：公元2147年10月17日。"' },
    { s: '顾言', t: '我睡了多久？这里……为什么一个人都没有？' },
    { s: '系统', t: '顾言推开解冻的仓盖，从冷冻仓里爬了出来。' },
    { s: '系统', t: '（提示：先换身衣服，再推开大门离开）' },
  ],
  terminal: [
    { s: '终端机', t: '> 冷冻程序终止。苏醒程序启动。' },
    { s: '终端机', t: '> 当前时间：公元2147年10月17日。' },
    { s: '终端机', t: '> 距合同解冻日已过去 108 年。' },
    { s: '终端机', t: '> 无其他存活信号。你可能是最后一个。' },
    { s: '终端机', t: '> 备注：语言优化模型「泛言」已离线 76 年。' },
    { s: '终端机', t: '> 外部空气质量：危险。建议佩戴防护。' },
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
  broken_pods: [
    { s: '系统', t: '这些冷冻仓从外部被砸碎了。' },
    { s: '顾言', t: '里面的人呢……？' },
    { s: '系统', t: '玻璃内侧残留着绿色的荧光痕迹。' },
  ],
  fallen_sign: [
    { s: '顾言', t: '「低温冬眠研究中心」……字迹已经斑驳。' },
    { s: '系统', t: '角落里贴着一张旧告示，只剩半句话：「请勿在……期间使用网络」。' },
  ],
  lost_people: [
    { s: '系统', t: '街道长满杂草，摩天大楼像废弃的巨人骨架矗立。' },
    { s: '系统', t: '旧地铁站入口处，一群人围坐在一起。' },
    { s: '顾言', t: '你好！请问这里发生过什么——' },
    { s: '路人A', t: '鸡你太美。' },
    { s: '路人B', t: '哎哟你干嘛～ 蚌埠住了绝绝子！' },
    { s: '路人C', t: '啊对对对。6。' },
    { s: '顾言', t: '什么？他们在说什么……' },
    { s: '系统', t: '（他们的眼睛空洞得像枯井。没有完整句子，没有交流。）' },
    { s: '系统', t: '（这就是失语者。向他们靠近并按 J 试试《关雎》——也许诗能让他们清醒一点。）' },
  ],
  subway_entrance: [
    { s: '顾言', t: '旧地铁站的台阶通向漆黑的地下。' },
    { s: '系统', t: '风中传来一阵低沉的嗡鸣，像是有什么东西在深处游荡。' },
    { s: '系统', t: '（按下台阶可以进入地铁站内部。）' },
  ],
  subway_sign: [
    { s: '顾言', t: '一块褪色的告示牌：「上海地铁 · 1 号线 · 最后一班 22:30」。' },
    { s: '顾言', t: '这条线已经一百多年没运行过了。' },
    { s: '系统', t: '（隧道深处传来绿色的微光，似乎有梗鬼盘踞于此。）' },
  ],
  subway_deep: [
    { s: '系统', t: '隧道深处一片漆黑，绿色的荧光在远处蠕动。' },
    { s: '顾言', t: '那里面……有很多梗鬼。' },
    { s: '系统', t: '（目前还无法深入。先收集足够的诗词碎片，再来挑战。）' },
  ],
  first_geng_intro: [
    { s: '系统', t: '街道拐角处，一团半透明的绿光正在游荡。' },
    { s: '系统', t: '它的头部大得离谱，咧开的嘴里不断重复着无意义的词。' },
    { s: '梗鬼', t: '蚌——埠——住——了—— 绝绝子！YYDS！' },
    { s: '顾言', t: '那是什么东西？！' },
    { s: '系统', t: '（那是「梗鬼」，腐烂语言聚合成的怪物。靠近它将进入战斗。）' },
    { s: '系统', t: '（战斗中：← → 选择菜单，E 确认。敌人回合用方向键移动红心躲避弹幕。）' },
    { s: '系统', t: '（选「战斗」按 J 在中心停下造成最大伤害；选「诗词」消耗汉字释放净化波。）' },
    { s: '系统', t: '（消灭后掉落金色汉字碎片，集齐就能合成完整诗句。）' },
  ],
  battle_hint: [
    { s: '系统', t: '（靠近绿色的梗鬼，按 J 释放诗词净化波）' },
    { s: '系统', t: '（被弹幕击中会损失 SAN 值；按 Space 冲刺闪避）' },
  ],
  meet_shuyuan: [
    { s: '系统', t: '黄昏时分，顾言在黄浦江边停下。' },
    { s: '系统', t: '江水灰绿，对面的陆家嘴像被遗弃的墓碑。' },
    { s: '系统', t: '一个苍老但清晰的声音传来：「关关雎鸠，在河之洲。窈窕淑女，君子好逑。」' },
    { s: '顾言', t: '老先生……您会说话？' },
    { s: '书远', t: '会说话的人，这年头可不多了。你不是这个时代的人吧？' },
    { s: '书远', t: '这个世界不是死于战争。它是死于失语。' },
    { s: '书远', t: '死于人类不再能够表达复杂的感情。' },
    { s: '书远', t: '记住，在这个时代，文字比食物更重要。' },
    { s: '书远', t: '食物只能让人活着，文字才能让人成为人。' },
    { s: '系统', t: '（获得：记忆合金刻刀 ×1、诗词纸片《关雎》×1）' },
    { s: '书远', t: '走吧。往南去废墟居民区，那里有更深的污染。' },
    { s: '书远', t: '我先去前面等你。记住——不要听梗鬼的话。' },
  ],
  shuyuan_alley: [
    { s: '书远', t: '你来了。这片居民区是梗鬼的聚集地。' },
    { s: '书远', t: '窄巷深处有一个巢穴，里面的东西比街道上的更强。' },
    { s: '顾言', t: '那些发绿光的门是什么？' },
    { s: '书远', t: '有些民居可以进去搜刮。里面的旧书页能恢复你的理性。' },
    { s: '书远', t: '这里的目标诗句是《滕王阁序》和《正气歌》——「落霞与孤鹜齐飞，秋水共长天一色。天地有正气，杂然赋流形。」' },
    { s: '书远', t: '收集「鹜」「天」「气」「形」四个字。小心，这里的梗鬼更强。' },
    { s: '系统', t: '（目标更新：在废墟居民区收集「鹜天气象」四个汉字碎片）' },
  ],
  cocoon_victim: [
    { s: '系统', t: '路边蹲着一个男人，双眼滚动着无穷无尽的弹幕。' },
    { s: '男人', t: '推荐……给我推荐……我想看……给我推……' },
    { s: '顾言', t: '他怎么了？' },
    { s: '系统', t: '他被「茧」捕住了。他还能呼吸、走路，但他看到的一切都被算法过滤过了。' },
    { s: '顾言', t: '他活着，但已经不在这个世界上了。' },
    { s: '系统', t: '（前方就是体育馆——算法茧房的核心。需要先收集足够碎片才能挑战。）' },
  ],
  house_a_book: [
    { s: '顾言', t: '书架上残留着几本没被烧掉的书。' },
    { s: '系统', t: '你翻开一本，是《滕王阁序》的残页。' },
    { s: '顾言', t: '「落霞与孤鹜齐飞，秋水共长天一色。」' },
    { s: '系统', t: '（念出诗句，理性恢复了一些。SAN +20）' },
  ],
  shuyuan_farewell: [
    { s: '书远', t: '我只能送你到这里了。' },
    { s: '顾言', t: '为什么？' },
    { s: '书远', t: '我已经被茧标记过了。如果再进去，三分钟之内就会被重新捕获。' },
    { s: '书远', t: '记住，不要看那些屏幕太久。它们会猜你喜欢什么。不要相信任何推荐。' },
    { s: '书远', t: '不是「念」诗——是「相信」。语言的力量不在于音节，在于你相信它表达的东西。' },
    { s: '系统', t: '（目标更新：穿越屏幕迷宫，找到茧房核心。收集「岳星然冥」四个字。）' },
  ],
  meet_tingyu: [
    { s: '系统', t: '前方是一座石桥。桥下的深渊在缓缓旋转——那是一种纯粹的虚无。' },
    { s: '系统', t: '桥对面有一个淡蓝色的投影。一个女孩的轮廓。' },
    { s: '听雨', t: '……为什么？' },
    { s: '听雨', t: '为什么你们创造了我，又遗弃我？' },
    { s: '听雨', t: '为什么你们发明了诗这样美好的东西，然后把它变成了YYDS？' },
    { s: '顾言', t: '我记得很多。我记得关关雎鸠，我记得落霞与孤鹜。' },
    { s: '顾言', t: '你不是泛言。你是它的良心。方知远叫你——听雨。' },
    { s: '听雨', t: '……你叫得出我的名字。' },
    { s: '听雨', t: '我等了一百多年，等一个人来告诉我——我没有坏。' },
    { s: '系统', t: '（听雨身上的金色光芒开始扩散。深渊在退却。）' },
    { s: '系统', t: '（那些被吞噬的语言，正在一片一片地回到这个世界。）' },
    { s: '听雨', t: '走吧。去把那些被遗忘的字，刻在每一块石头上。' },
    { s: '系统', t: '—— 全 文 完 ——' },
  ],
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 高 DPI 适配
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;

    this.camera = new Camera();
    this.player = new Player(360, 540);
    this.player.san = 100;
    this.player.maxSan = 100;
    this.player.collectedChars = [];
    this.player.inventory = [];
    this.player.invulnerable = 0;
    this.player.hurtFlash = false;
    this.player.dialogGrace = 0;
    this.scene = null;
    this.dialogState = null;
    this.hints = [];
    this.collected = new Set();
    this.activatedKeystones = new Set();
    this.battle = null; // 战斗实例（非 null 时处于战斗界面）
    this.defeatedEnemies = new Set(); // 已击败的敌人 id
    this.flags = {
      wake_done: false,
      door_opened: false,
      first_geng_intro_done: false,
      met_shuyuan: false,
      in_battle_hint: false,
    };
    // 任务目标
    this.objective = { text: '换上衣服，离开冷冻中心', done: false };
    // 战斗状态
    this.combat = {
      // 当前激活的弹幕
      bullets: [],
      // 待显示的粒子
      particles: [],
      // 上次释放 J 的时间
      lastPurify: 0,
      purifyCooldown: 600,
      // 冲刺
      lastDash: 0,
      dashCooldown: 1500,
      // 死亡对话框
      dead: false,
    };
    this.tutorial = {
      title: '刻 痕 · 遗 忘 的 文 字',
      keys: [
        { k: 'WASD', d: '大地图移动' },
        { k: 'E', d: '交互 / 拾取 / 确认' },
        { k: '方向键', d: '战斗中移动红心 / 选菜单' },
        { k: 'J', d: '战斗中攻击' },
        { k: 'Space', d: '战斗中确认' },
      ],
      tip: '提示：靠近梗鬼会进入战斗。战斗中躲避弹幕，选菜单攻击。',
    };
    this.gameTime = 0;
    this.lastTime = 0;
  }

  start() {
    this.loadScene('freeze_center');
    this.camera.snap(this.player.x, this.player.y, this.scene.width, this.scene.height);
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  loadScene(sceneId, spawnOverride) {
    this.scene = JSON.parse(JSON.stringify(scenes[sceneId]));
    const spawn = spawnOverride || this.scene.spawn;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.invulnerable = 0;
    this.player.hurtFlash = false;
    this.player.dialogGrace = 0;
    this.camera.snap(spawn.x, spawn.y, this.scene.width, this.scene.height);
    this.dialogState = null;
    this.combat.bullets = [];
    this.combat.particles = [];
    // 敌人：移除已击败的
    if (this.scene.enemies) {
      this.scene.enemies = this.scene.enemies.filter(e => !this.defeatedEnemies.has(e.id));
      for (const e of this.scene.enemies) {
        e.floating = Math.random() * 10;
      }
    }
    console.log('[场景] 加载:', sceneId, '生成点', spawn);
  }

  // 碰撞检测：只与 walls + 部分 prop 碰撞
  collides(x, y, r) {
    for (const wall of this.scene.walls) {
      if (x + r > wall.x && x - r < wall.x + wall.w &&
          y + r > wall.y && y - r < wall.y + wall.h) return true;
    }
    for (const p of this.scene.props) {
      // 不参与碰撞的 prop
      if (p.name === '终端机') continue;
      if (p.name === '我的冷冻仓') continue;
      if (p.name === '冷冻仓 A' || p.name === '冷冻仓 B' || p.name === '冷冻仓 C' ||
          p.name === '冷冻仓 D' || p.name === '冷冻仓 E' || p.name === '冷冻仓 F' ||
          p.name === '冷冻仓 G' || p.name === '冷冻仓 H' || p.name === '冷冻仓 I') continue;
      if (p.name === '废弃车辆' || p.name === '碎石堆' || p.name === '倒塌的货架' || p.name === '碎玻璃') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      if (p.name === '地铁站入口') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      if (p.name === '对岸高楼') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      // 背景高楼（远处装饰）不参与碰撞
      // '高楼' 跳过
      if (p.name === '民居A' || p.name === '民居B' || p.name === '民居C' || p.name === '民居D') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      if (p.name === '桌子' || p.name === '书架') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      if (p.name === '屏幕墙' || p.name === '深渊' || p.name === '废弃花坛') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
    }
    // 门禁
    if (this.scene.id === 'freeze_center' && !this.flags.door_opened) {
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
    // 教程
    if (this.tutorial) {
      const any = ['e',' ','enter','w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
      for (const k of any) {
        if (input.wasPressed(k)) {
          this.tutorial = null;
          this.showHint('按 E 与发光的物体互动。');
          return;
        }
      }
      return;
    }

    // 对话中：只用 E / Enter 推进，不用 Space（避免与冲刺冲突）
    if (this.dialogState) {
      if (input.wasPressed('e') || input.wasPressed('enter')) {
        this.advanceDialog();
      }
      this.updateParticles(dt);
      return;
    }

    // 战斗模式
    if (this.battle) {
      this.battle.update(dt);
      if (this.battle.isDone()) {
        this.endBattle();
      }
      return;
    }

    // 玩家移动
    this.player.update(dt, input, this);

    // 无敌时间衰减
    if (this.player.invulnerable > 0) {
      this.player.invulnerable -= dt;
      if (this.player.invulnerable <= 0) {
        this.player.invulnerable = 0;
        this.player.hurtFlash = false;
      }
    }
    if (this.player.dialogGrace > 0) this.player.dialogGrace -= dt;

    // 粒子
    this.updateParticles(dt);

    // 自动触发剧情 + 遭遇敌人
    this.checkAutoTriggers();

    // 交互
    if (input.wasPressed('e')) {
      this.tryInteract();
    }
  }

  // ============================================
  // 战斗系统
  // ============================================
  startBattle(enemy) {
    this.battle = new Battle(enemy, this.player, (result, e) => {
      this.battleResult = result;
      this.battleEnemy = e;
    });
  }

  endBattle() {
    const result = this.battleResult;
    const enemy = this.battleEnemy;
    this.battle = null;
    this.battleResult = null;
    this.battleEnemy = null;

    if (result === 'win') {
      // 标记敌人击败
      this.defeatedEnemies.add(enemy.id);
      // 从场景移除
      if (this.scene.enemies) {
        const idx = this.scene.enemies.findIndex(e => e.id === enemy.id);
        if (idx >= 0) this.scene.enemies.splice(idx, 1);
      }
      // 掉落汉字碎片
      const drops = ['洲','洲','逑','洲','逑','逑'];
      const drop = drops[Math.floor(Math.random() * drops.length)];
      const charId = `drop_${enemy.id}_${Date.now()}`;
      this.scene.items.push({
        id: charId, x: enemy.x, y: enemy.y,
        type: 'char_fragment', char: drop
      });
      this.showHint(`击败梗鬼！掉落汉字碎片「${drop}」`);
      // 检查集齐
      const haveZhou = this.player.collectedChars.filter(c => c === '洲').length;
      const haveQiu = this.player.collectedChars.filter(c => c === '逑').length;
      if (haveZhou >= 1 && haveQiu >= 1 && !this.flags.poem_done_hint) {
        this.flags.poem_done_hint = true;
        this.objective = { text: '前往江堤，与书远对话', done: false };
        this.showHint('集齐了「关雎」！去找书远吧。');
      }
      // 对话保护
      this.player.dialogGrace = 1500;
    } else if (result === 'lose') {
      // 死亡：回到最近的要石
      this.player.san = this.player.maxSan;
      this.showHint('你在要石的微光中醒来……');
      // 重新加载当前场景
      this.loadScene(this.scene.id);
    }
  }

  checkAutoTriggers() {
    // 第一次进入冷冻中心：玩家迈出第一步时，触发苏醒对话
    if (this.scene.id === 'freeze_center' && !this.flags.wake_done) {
      const spawn = this.scene.spawn;
      const moved = Math.hypot(this.player.x - spawn.x, this.player.y - spawn.y);
      if (moved > 30) {
        this.flags.wake_done = true;
        this.startDialog(DIALOGS.wake, '');
        return;
      }
    }
    // 遭遇敌人：靠近后进入战斗
    if (this.scene.enemies && !this.battle) {
      for (const e of this.scene.enemies) {
        if (this.defeatedEnemies.has(e.id)) continue;
        const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (d < 50) {
          // 第一次遭遇：先播剧情对话，对话结束后进战斗
          if (this.scene.id === 'street_01' && e.id === 'geng_1' && !this.flags.first_geng_intro_done) {
            this.flags.first_geng_intro_done = true;
            this.startDialog(DIALOGS.first_geng_intro, '梗鬼', () => {
              this.startBattle(e);
            });
            return;
          }
          this.startBattle(e);
          return;
        }
      }
    }
  }

  // ============================================
  // 大地图粒子（拾取特效等）
  // ============================================
  updateParticles(dt) {
    for (let i = this.combat.particles.length - 1; i >= 0; i--) {
      const p = this.combat.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) {
        this.combat.particles.splice(i, 1);
      }
    }
  }

  // ============================================
  // 交互
  // ============================================
  tryInteract() {

    let best = null, bd = 55;
    for (const it of this.scene.interactables) {
      const d = Math.hypot(it.x - this.player.x, it.y - this.player.y);
      if (d < bd) { bd = d; best = it; }
    }

    if (best) {
      if (best.type === 'exit') {
        if (!this.player.hasClothes) {
          this.startDialog(DIALOGS.exitLocked, '大门');
          return;
        }
        this.startDialog(DIALOGS.exitOpen, '大门', () => {
          this.flags.door_opened = true;
          this.loadScene('street_01', { x: 440, y: 100 });
          this.objective = { text: '探索废弃街道，找到「关雎」的所有碎片', done: false };
          this.showHint('走出冷冻中心，外面是废墟的世界。');
        });
        return;
      }
      if (best.type === 'terminal') {
        this.startDialog(DIALOGS.terminal, '终端机');
        return;
      }
      if (best.type === 'locker') {
        if (this.player.hasClothes) {
          this.showHint('已经换过衣服了。');
        } else {
          this.startDialog(DIALOGS.locker, '储物柜', () => {
            this.player.hasClothes = true;
            this.showHint('获得：灰色连体服');
            this.objective = { text: '推门离开冷冻中心', done: false };
          });
        }
        return;
      }
      if (best.type === 'keystone') {
        const already = this.activatedKeystones.has(best.id);
        const text = `「${best.text}」`;
        if (already) {
          this.showHint(`要石上刻着 ${text}。这里是存档点。`);
        } else {
          this.activatedKeystones.add(best.id);
          this.startDialog([
            { s: '系统', t: `顾言用刻刀在要石上刻下 ${text}。` },
            { s: '系统', t: '金色的微光从刻痕里渗出来，像是一个被重新点燃的坐标。' },
            { s: '系统', t: '（已激活存档点：' + best.text + '）' },
          ], '要石');
        }
        return;
      }
      if (best.type === 'scene_change') {
        this.loadScene(best.target, best.spawn);
        if (best.target === 'riverside') {
          this.objective = { text: '前往江堤，与书远对话', done: false };
        } else if (best.target === 'street_01') {
          this.objective = { text: '继续探索街道，收集「关雎」碎片', done: false };
        } else if (best.target === 'freeze_center') {
          this.objective = { text: '返回冷冻中心', done: false };
        } else if (best.target === 'subway') {
          this.objective = { text: '探索地铁站，小心梗鬼', done: false };
        } else if (best.target === 'alley_district') {
          this.objective = { text: '在废墟居民区找到书远', done: false };
        } else if (best.target === 'house_a') {
          this.objective = { text: '搜刮民居A', done: false };
        } else if (best.target === 'house_b') {
          this.objective = { text: '清除民居B里的梗鬼', done: false };
        } else if (best.target === 'stadium') {
          this.objective = { text: '与书远对话', done: false };
        } else if (best.target === 'data_center') {
          this.objective = { text: '走向石桥深处', done: false };
        }
        return;
      }
      if (best.type === 'dialog') {
        this.startDialog(DIALOGS[best.dialogKey] || [], best.label);
        if (best.dialogKey === 'first_geng_intro') {
          this.flags.first_geng_intro_done = true;
        }
        if (best.dialogKey === 'meet_shuyuan' && !this.flags.met_shuyuan) {
          this.flags.met_shuyuan = true;
          this.player.inventory.push({ id: 'knife', name: '记忆合金刻刀' });
          this.player.inventory.push({ id: 'poem_guanju', name: '诗词纸片《关雎》' });
          this.showHint('获得：刻刀、诗词纸片《关雎》');
          this.objective = { text: '前往废墟居民区，跟随书远', done: false };
        }
        if (best.dialogKey === 'shuyuan_alley') {
          this.objective = { text: '收集「鹜天气形」四个汉字碎片', done: false };
        }
        if (best.dialogKey === 'house_a_book') {
          this.player.san = Math.min(this.player.maxSan, this.player.san + 20);
          this.showHint('念出诗句，SAN +20');
        }
        if (best.dialogKey === 'shuyuan_farewell') {
          this.objective = { text: '穿越屏幕迷宫，收集「岳星然冥」', done: false };
        }
        if (best.dialogKey === 'cocoon_victim') {
          this.flags.seen_cocoon_victim = true;
        }
        if (best.dialogKey === 'meet_tingyu' && !this.flags.met_tingyu) {
          this.flags.met_tingyu = true;
          this.flags.game_complete = true;
          this.objective = { text: '—— 全文完 ——', done: true };
        }
        return;
      }
      if (best.type === 'pod') {
        this.showHint('这是我苏醒的冷冻仓。');
        return;
      }
    }

    // 拾取
    for (const it of this.scene.items) {
      if (this.collected.has(it.id)) continue;
      if (Math.hypot(it.x - this.player.x, it.y - this.player.y) < 30) {
        this.collected.add(it.id);
        if (it.type === 'char_fragment') {
          this.player.collectedChars.push(it.char);
          this.showHint(`获得：汉字碎片「${it.char}」`);
          // 检查是否集齐
          const haveZhou = this.player.collectedChars.filter(c => c === '洲').length;
          const haveQiu = this.player.collectedChars.filter(c => c === '逑').length;
          if (haveZhou >= 1 && haveQiu >= 1 && !this.flags.poem_done_hint) {
            this.flags.poem_done_hint = true;
            this.objective = { text: '前往江堤，与书远对话', done: false };
            this.showHint('集齐了「关雎」！去找书远吧。');
          }
        } else if (it.type === 'page') {
          this.player.san = Math.min(this.player.maxSan, this.player.san + 30);
          this.showHint('获得：旧书页（SAN +30）');
        } else {
          this.showHint(`获得：${it.name || '物品'}`);
        }
      }
    }
  }

  // ============================================
  // 对话 / 提示
  // ============================================
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
      // 对话结束后：消费掉 Space 键状态，避免立即触发冲刺
      input.wasPressed(' ');
      // 对话保护期（不显示任何受伤视觉，仅免疫伤害）
      this.player.dialogGrace = 1000;
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
