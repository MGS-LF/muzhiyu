// 游戏主类
import { W, H, FEATURES, UTTERANCE } from './config.js';
import { input, bindCanvas } from './input.js';
import { Player } from './player.js';
import { scenes, DROP_TABLES, DEFAULT_DROPS } from './scenes.js';
import { Camera, render } from './render.js';
import { Battle } from './battle.js';
import { SlashBattle } from './slash_battle.js';
import { HackingBattle } from './hacking/HackingBattle.js';
import { voice } from './ai/voice.js';
import { AI } from './ai/config.js';
import { recordBranchChoice, clearBranchHistory } from './ai/director.js';
import { SideScrollLevel } from './sidescroll.js';
import { SCENE_INTROS } from './tutorial.js';
import { PACE } from './pacing.js';
// 新增系统：存档 / 音效 / 视觉特效 / 难度 / 小地图
import {
  autoSave,
  saveToSlot,
  deleteSaveSlot,
  loadSnapshot,
  restore,
  SAVE_SLOTS,
  recordClear,
  clearRefreshResume,
} from './save.js';
import * as audio from './audio.js';
import * as fx from './fx.js';
import * as difficulty from './difficulty.js';
import * as minimap from './minimap.js';

import { DIALOGS } from './data/dialogs.js';
import { POEM_LINES, PUZZLES } from './data/puzzles.js';
import { methods as engraveMethods } from './systems/engrave.js';
import { methods as dialogMethods } from './systems/dialog.js';
import { methods as interactMethods } from './systems/interact.js';
import { methods as onboardingMethods } from './systems/onboarding.js';
import { methods as utteranceMethods } from './systems/utterance.js';
import { EndlessMode } from './systems/endless.js';
import { pushToast } from './ui/overlay.js';

const SUPPORTED_ENDINGS = new Set(['fire', 'silence', 'burnout', 'atonement', 'echo', 'garden']);
const BRIGHT_ENDINGS = new Set(['fire', 'atonement', 'echo', 'garden']);
const VILLAGER_CURE_IDS = [
  'villager_old',
  'villager_boy',
  'villager_soldier',
  'villager_teacher',
  'villager_child',
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 清理 LLM 分支对话上下文（新游戏重置）
    clearBranchHistory();

    // 高 DPI 适配与分辨率限制（特效减弱时降低渲染倍率）
    let dpr = window.devicePixelRatio || 1;
    if (this.settings && this.settings.reducedFx) {
      dpr = Math.min(dpr, 1.25);
    } else {
      dpr = Math.min(dpr, 2.0); // 最大 DPR 限制为 2.0，避免在 3K/4K 屏上造成渲染灾难
    }
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;

    this.camera = new Camera();
    this.player = new Player(360, 540);
    this.player.san = 100;
    this.player.maxSan = 100;
    this.player.collectedChars = [];
    this.player.collectedCharsAll = []; // 永久收集记录（战斗诗词攻击不消耗它），用于门禁与进度 UI
    this.player.inventory = [];
    this.player.diaries = new Set(); // 方知远日记收集记录（id 集合）
    this.player.seeds = 0; // 语言种子收集数，每枚提供 SAN 上限加成
    this.player.ngPlus = false;
    this.player.invulnerable = 0;
    this.player.hurtFlash = false;
    this.player.dialogGrace = 0;
    this.scene = null;
    this.dialogState = null;
    this.hints = [];
    this.collected = new Set();
    this.activatedKeystones = new Set();
    this.battle = null; // 战斗实例（非 null 时处于战斗界面）
    this.endless = null; // 无尽模式实例
    this.defeatedEnemies = new Set(); // 已击败的敌人 id
    this.visitedScenes = new Set(); // 已首次进入的场景（用于一次性引导提示）
    // 自定义刻字记录（要石/残碑），持久化到 localStorage
    this.engravings = this._loadEngravings();
    this.stompHintShown = false; // 踩踏提示已展示
    this._stompWindow = 0; // 踩踏判定窗口（冲刺时打开）
    this.flags = {
      wake_done: false,
      door_opened: false,
      first_geng_intro_done: false,
      hack_core_intro_done: false,
      met_shuyuan: false,
      alley_briefed: false,
      in_battle_hint: false,
      subway_depth_log_read: false,
      all_villagers_cured: false,
      // 梦境教学
      onboarding_dream_done: false,
      onboarding_move_done: false,
      onboarding_pickup_done: false,
      onboarding_gate_taught: false,
      onboarding_battle_done: false,
      onboarding_hack_done: false,
      onboarding_all_done: false,
      onboarding_skipped: false,
      _in_dream_onboarding: false,
    };
    // UI 面板：null | quest/map/inventory/settings/system/controls/debug
    this.uiPanel = null;
    this._debugSel = 0;
    this._systemSel = 0;
    this.settings = this._loadSettings();
    this._settingsSel = 0;
    // 道德/倾向：驱动三结局（火种 / 沉默 / 燃尽）
    this.karma = { mercy: 0, violence: 0, saved: 0 };
    this.ending = null; // 'fire' | 'silence' | 'burnout' | 第五章终局标签
    this._clearRecorded = false;
    this.clearedEndings = new Set();
    // 已解开的造句谜题、已完成的支线
    this.solvedPuzzles = new Set();
    this.completedQuests = new Set();
    this.compose = null; // 造句模式实例（非 null 时处于造句界面）
    this.aiThinking = false; // 等待 LLM 时冻结输入并提示
    this.converse = null; // Sydney自由对话模式（非 null 时处于对话界面）
    this.engraveState = null; // 刻字模式状态（进入时刻字时设置）
    this.utteranceState = null; // 组句释放（P0 净化梗墙/失语者）
    this.endingEpilogue = null; // LLM 生成的个性化结语（覆盖默认结局副标题）
    // 任务目标
    this.objective = { text: '换上衣服，离开冷冻中心', done: false };
    // 战斗状态
    this.combat = {
      // 当前激活的弹幕
      bullets: [],
      // 待显示的粒子
      particles: [],
      // 上次释放诗词净化的时间
      lastPurify: 0,
      purifyCooldown: 600,
      // 冲刺
      lastDash: 0,
      dashCooldown: PACE.exploration.dashCooldown,
      // 死亡对话框
      dead: false,
    };
    // 正式开局的全屏快捷键墙改为梦境教学；此处默认不弹
    this.tutorial = null;
    // 模式：江堤横版 / 维度裂隙3D
    this.sidescroll = null;
    this.level3d = null;
    this.gameTime = 0;
    this.lastTime = 0;
    // 新增系统状态
    this._audioUnlocked = false; // 音频是否已解锁（首次交互后）
    this._saveMenu = null; // 存档菜单状态：null | 'save' | 'load'
    this._saveMenuIdx = 0; // 菜单选中索引
    this._saveFlash = 0; // 存档成功闪烁提示计时
    this._lastBgmScene = null; // 上次播放 BGM 的场景（避免重复切换）
    this._lastAutoSave = 0; // 上次自动存档时间（节流）
    // 难度系统：从 localStorage 读取，应用到全局
    this.difficultyId = difficulty.loadDifficulty();
    difficulty.setCurrent(this.difficultyId);
    this._applyDifficulty();
    this._applySettingsRuntime();
    // 背包面板状态（I 键切换）
    // uiPanel 已支持 'quest'/'map'/'debug'，新增 'inventory'
    // 小地图显示开关（默认开）
    this._showMinimap = true;
    this._lastGridX = -9999;
    this._lastGridY = -9999;
    // 屏幕墙减速状态（体育馆陷阱）
    this._screenWallSlow = 0; // >0 时玩家被减速
    this._screenWallSanDrain = 0; // >0 时持续扣 SAN
    // 随机事件系统：探索中随机触发环境事件
    this._encounterGrace = 0; // 场景切换/战斗结束后的短暂遭遇保护
    this._randomEventTimer = PACE.ambient.firstDelayMs;
    this._randomEventCooldown = PACE.ambient.cooldownMs;
  }

  // ↓↓↓ 以下方法由文件末尾 Object.assign(Game.prototype, ...) 混入实现，
  //    此处仅作类型声明；运行时被 systems/dialog.js / engrave.js / interact.js
  //    的真实实现覆盖。删除会导致类型检查报错，但不影响运行。
  /** @param {any} lines @param {any} name @param {any} [onComplete] */
  startDialog(lines, name, onComplete) {}
  /** @param {any} i */
  setDialogIndex(i) {}
  /** @param {any} dt */
  updateConverse(dt) {}
  /** @param {any} dt */
  updateEngraving(dt) {}
  /** @returns {any} */
  summarizeEngravings() {}
  /** @returns {any} */
  _loadEngravings() {}
  tryInteract() {}

  // 应用当前难度到游戏状态（SAN 上限等）
  _applyDifficulty() {
    const mul = difficulty.currentMul();
    const seedBonus = (this.player.seeds || 0) * 10;
    this.player.maxSan = mul.sanMax + seedBonus;
    this.player.san = Math.min(this.player.san, this.player.maxSan);
  }

  // 切换难度（游戏内/菜单调用）
  changeDifficulty(id) {
    if (!['easy', 'normal', 'hard'].includes(id)) return;
    this.difficultyId = id;
    difficulty.setCurrent(id);
    this._applyDifficulty();
    this.showHint(`难度已切换：${difficulty.getDifficultyDef(id).name}`);
  }

  _loadSettings() {
    const defaults = {
      dialogSpeed: 'normal',
      highContrast: false,
      reducedFx: false,
      muted: false,
    };
    try {
      const raw = localStorage.getItem('keheng_settings');
      if (!raw) return defaults;
      return { ...defaults, ...JSON.parse(raw) };
    } catch (e) {
      return defaults;
    }
  }

  _saveSettings() {
    try {
      localStorage.setItem('keheng_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[设置] 保存失败', e);
    }
  }

  _applySettingsRuntime() {
    audio.setMuted(!!(this.settings && this.settings.muted));
  }

  dialogTypeInterval() {
    const speed = this.settings && this.settings.dialogSpeed;
    if (speed === 'fast') return 12;
    if (speed === 'slow') return 42;
    return 25;
  }

  _settingsRows() {
    const def = difficulty.getDifficultyDef(this.difficultyId);
    return [
      {
        id: 'dialogSpeed',
        label: '对话速度',
        value: this.settings.dialogSpeed === 'fast' ? '快' : this.settings.dialogSpeed === 'slow' ? '慢' : '标准',
      },
      {
        id: 'highContrast',
        label: '高对比字幕',
        value: this.settings.highContrast ? '开' : '关',
      },
      {
        id: 'reducedFx',
        label: '降低特效',
        value: this.settings.reducedFx ? '开' : '关',
      },
      { id: 'muted', label: '声音', value: audio.isMuted() ? '静音' : '开启' },
      { id: 'difficulty', label: '难度', value: def ? def.name : this.difficultyId },
    ];
  }

  _cycleSetting(id, dir = 1) {
    const toggle = (key) => {
      this.settings[key] = !this.settings[key];
    };
    if (id === 'dialogSpeed') {
      const values = ['slow', 'normal', 'fast'];
      const cur = values.indexOf(this.settings.dialogSpeed);
      this.settings.dialogSpeed = values[(cur + dir + values.length) % values.length];
    } else if (id === 'difficulty') {
      const values = ['easy', 'normal', 'hard'];
      const cur = values.indexOf(this.difficultyId);
      this.changeDifficulty(values[(cur + dir + values.length) % values.length]);
    } else if (id === 'muted') {
      this.settings.muted = !audio.isMuted();
      audio.setMuted(this.settings.muted);
      this.showHint(this.settings.muted ? '已静音' : '已开启声音');
    } else if (id === 'highContrast' || id === 'reducedFx') {
      toggle(id);
      if (id === 'reducedFx') {
        // reducedFx 发生改变时，重新计算 Canvas 的缩放与大小，防止画面模糊或渲染卡顿
        let dpr = window.devicePixelRatio || 1;
        if (this.settings.reducedFx) {
          dpr = Math.min(dpr, 1.25);
        } else {
          dpr = Math.min(dpr, 2.0);
        }
        this.canvas.width = W * dpr;
        this.canvas.height = H * dpr;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置之前的 scale
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = false;
      }
    }
    this._saveSettings();
    audio.playSfx('ui');
  }

  start() {
    bindCanvas(this.canvas);
    // 对接系统 prefers-reduced-motion
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.settings.reducedFx = true;
        this._saveSettings();
      }
    } catch (_) {
      /* ignore */
    }
    // 默认进冷冻中心；若从序幕进入会由 main 再切到梦境教学
    this.loadScene('freeze_center');
    this.camera.snap(this.player.x, this.player.y, this.scene.width, this.scene.height);
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** 新游戏 / 序幕结束后：进入独立梦境教学场景 */
  startOnboardingAfterIntro() {
    if (typeof this.beginDreamOnboarding === 'function') {
      this.beginDreamOnboarding({ skipStory: false });
    }
  }

  loadScene(sceneId, spawnOverride) {
    this.scene = structuredClone(scenes[sceneId]);
    this._lastGridX = -9999;
    this._lastGridY = -9999;
    const spawn = spawnOverride || this.scene.spawn;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.invulnerable = 0;
    this.player.hurtFlash = false;
    this.player.dialogGrace = 0;
    this._encounterGrace = PACE.exploration.sceneGraceMs;
    this.camera.snap(spawn.x, spawn.y, this.scene.width, this.scene.height);
    this.dialogState = null;
    this.combat.bullets = [];
    this.combat.particles = [];
    fx.reset(); // 清除上一场景残留特效（震动/闪光/净化波），保留过渡动画
    // 敌人：移除已击败的
    if (this.scene.enemies) {
      this.scene.enemies = this.scene.enemies.filter((e) => !this.defeatedEnemies.has(e.id));
      for (const e of this.scene.enemies) {
        e.floating = 0;
        e.walkPhase = Math.random() * 6; // 地面行走动画相位
        e.dir = Math.random() < 0.5 ? -1 : 1; // 巡逻方向
        e.vx = e.dir * 0.5; // 水平速度
        e.vy = 0; // 垂直速度（地面行走）
        e.onGround = true;
        e.homeX = e.x; // 巡逻原点
        e.range = 80; // 巡逻半径
        e.stompCD = 0; // 踩踏冷却
        // 体育馆诗屏解谜已解：BOSS 防御被削弱（持久化，重进场景仍生效）
        if (e.boss && this.flags.stadium_puzzle_solved) {
          e.hp = Math.floor(e.maxHp / 2);
        }
      }
    }
    // 预分类 props 以便在渲染时直接查找，避免每帧执行 expensive filter
    if (this.scene && this.scene.props) {
      const grouped = {};
      for (const p of this.scene.props) {
        if (!p.name) continue;
        const name = p.name;
        // 支持民居前缀模糊匹配
        if (name.includes('民居')) {
          if (!grouped['民居']) grouped['民居'] = [];
          grouped['民居'].push(p);
        }
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(p);
      }
      this.scene._groupedProps = grouped;
    }
    console.log('[场景] 加载:', sceneId, '生成点', spawn);

    // 首次进入场景的一次性引导
    if (!this.visitedScenes.has(sceneId)) {
      this.visitedScenes.add(sceneId);
      const intro = SCENE_INTROS[sceneId];
      if (intro) this.showHint(intro);
    }
    // BGM 切换：场景变更时播放对应氛围曲（同曲不重启）
    if (this._audioUnlocked && this._lastBgmScene !== sceneId) {
      audio.playBGM(sceneId);
      this._lastBgmScene = sceneId;
      // 预测预加载：当前场景的可到达目标场景 BGM 提前缓存
      this._preloadAdjacentScenes(sceneId);
    }
    // 自动存档（节流：3 秒内不重复存；冷冻中心苏醒前 / 梦境教学中不存）
    const inDream = sceneId === 'dream_tutorial' || this.flags._in_dream_onboarding;
    const canSave = !inDream && (sceneId !== 'freeze_center' || this.flags.wake_done);
    if (canSave && performance.now() - this._lastAutoSave > 3000) {
      this._lastAutoSave = performance.now();
      autoSave(this);
    }
    // 江堤横版模式：进入 riverside 时启动
    if (this.scene.mode === 'sidescroll') {
      this.sidescroll = new SideScrollLevel(this);
      if (this._pendingSideScroll && typeof this.sidescroll.restoreFromResumeSnapshot === 'function') {
        this.sidescroll.restoreFromResumeSnapshot(this._pendingSideScroll);
        this._pendingSideScroll = null;
      }
    } else {
      this.sidescroll = null;
      this._pendingSideScroll = null;
    }
  }

  // 预加载当前场景可到达的相邻场景 BGM（提前缓存，减少切换延迟）
  _preloadAdjacentScenes(sceneId) {
    // 场景连通图：当前场景 -> 可直接到达的目标场景列表
    const adjacency = {
      freeze_center: ['street_01'],
      street_01: ['freeze_center', 'subway', 'riverside'],
      subway: ['street_01', 'subway_depth'],
      subway_depth: ['subway'],
      riverside: ['street_01', 'alley_district'],
      alley_district: ['riverside', 'stadium', 'house_a', 'house_b'],
      house_a: ['alley_district'],
      house_b: ['alley_district'],
      stadium: ['alley_district', 'data_center', 'ruined_library'],
      ruined_library: ['stadium', 'network_nexus', 'lost_village'],
      network_nexus: ['ruined_library', 'memory_abyss'],
      memory_abyss: ['network_nexus', 'data_center'],
      data_center: ['stadium', 'memory_abyss'],
      lost_village: ['ruined_library'],
    };
    const targets = adjacency[sceneId] || [];
    for (const t of targets) {
      if (typeof audio.preloadScene === 'function') audio.preloadScene(t);
    }
  }

  // ============================================
  // 江堤横版 / 维度裂隙3D 模式管理
  // ============================================
  exitSidescroll() {
    const sc = this.sidescroll;
    // 读取横版结果意图：'forward'(居民区) / 'back'(返回街道) / 'dead'
    const intent = sc.getIntent ? sc.getIntent() : this.player.san <= 0 ? 'dead' : 'forward';
    this.sidescroll = null;
    if (intent === 'dead' || this.player.san <= 0) {
      // 死亡：回最近要石（街道）
      this.player.san = this.player.maxSan;
      this.loadScene('street_01', { x: 980, y: 1600 });
      this.showHint('你在要石的微光中醒来……');
    } else if (intent === 'back') {
      // 老人旁的返回传送点：回到街道（保留进度）
      this.flags.met_shuyuan = true;
      this.loadScene('street_01', { x: 980, y: 1600 });
      this.showHint('你借守砚的提灯回到了街道。江堤的入口随时可再进。');
      this.objective = { text: '探索街道，或返回江堤', done: false };
    } else {
      // 通关：前往居民区
      this.flags.met_shuyuan = true;
      const t = sc.getExitTarget();
      this.loadScene(t.target, t.spawn);
      this.objective = { text: '探索废墟居民区', done: false };
      this.showHint('穿过江堤，前方是废墟居民区。');
    }
  }

  enterLevel3D() {
    if (!FEATURES.level3d) {
      this.showHint('维度裂隙已封——主线不经此路。继续在废墟中寻找完整的句子。');
      return;
    }
    if (this.flags.portal3d_done) {
      this.showHint('维度裂隙已经稳定，不再需要进入。');
      return;
    }
    this.startDialog(
      [
        { s: '系统', t: '隧道深处的绿光裂开了一道缝——那是维度坍缩留下的裂隙。' },
        { s: '顾言', t: '里面……是另一个形状的世界？空间在那里重新有了厚度。' },
        {
          s: '系统',
          t: '（进入维度裂隙3D关卡：WASD+鼠标视角，左键射击。找到「裂隙之钥」才能解锁出口，搜集物资击败怪物，回到地铁站）',
        },
      ],
      '维度裂隙',
      async () => {
        this.setOverlay('loading', '展开维度裂隙…');
        try {
          const { Level3D } = await import('./level3d.js');
          this.level3d = new Level3D(this);
        } catch (err) {
          console.error('[3D] 维度裂隙加载失败', err);
          this.toast('维度裂隙暂时无法展开：3D 模块加载失败。', 'danger');
        } finally {
          this.setOverlay(null);
        }
      }
    );
  }

  exitLevel3D() {
    const lv = this.level3d;
    const dead = lv.isDead();
    const hp = lv.hp;
    lv.dispose();
    this.level3d = null;
    if (dead) {
      this.player.san = Math.floor(this.player.maxSan * 0.5);
      this.showHint('你从裂隙中爬了回来，理性严重受损。');
      this.loadScene('subway', { x: 1180, y: 880 });
      return;
    }
    this.player.san = Math.min(this.player.maxSan, Math.max(this.player.san, hp + 20));
    this.flags.portal3d_done = true;
    this.showHint('你穿过维度裂隙回到地铁站，墙后的检修通道门显现了。');
    this.loadScene('subway', { x: 1180, y: 880 });
  }

  // 记录一个汉字碎片：collectedChars 是战斗弹药（会被消耗），collectedCharsAll 永久保留
  recordChar(char) {
    this.player.collectedChars.push(char);
    this.player.collectedCharsAll.push(char);
  }

  // 门禁判定：返回 { ok, missing:[缺少的字] }
  meetsGate(gate) {
    if (!gate) return { ok: true, missing: [] };
    const missing = [];
    if (gate.chars) {
      for (const c of gate.chars) {
        if (!this.player.collectedCharsAll.includes(c)) missing.push(c);
      }
    }
    let flagOk = true;
    if (gate.flag) flagOk = !!this.flags[gate.flag];
    let defeatedOk = true;
    if (gate.defeatedEnemy) defeatedOk = this.defeatedEnemies.has(gate.defeatedEnemy);
    return { ok: missing.length === 0 && flagOk && defeatedOk, missing };
  }

  // 集中式目标计算：根据场景 + flags + 永久收集，得出当前该做什么 + 指引坐标 + 进度
  refreshObjective() {
    // 梦境教学：由 onboarding 独占 objective（含 progress 字格）
    if (this.scene?.id === 'dream_tutorial' || this.flags._in_dream_onboarding) {
      if (typeof this._dreamRefreshObjective === 'function') this._dreamRefreshObjective();
      return;
    }
    const p = this.player;
    const has = (c) => p.collectedCharsAll.includes(c);
    const sid = this.scene.id;
    const it = (id) => this.scene.interactables.find((i) => i.id === id);
    // 当前场景里最近的、尚未拾取的、属于 chars 的碎片
    const nearestChar = (chars) => {
      let best = null,
        bd = Infinity;
      for (const item of this.scene.items) {
        if (this.collected.has(item.id)) continue;
        if (item.type === 'char_fragment' && chars.includes(item.char)) {
          const d = Math.hypot(item.x - p.x, item.y - p.y);
          if (d < bd) {
            bd = d;
            best = item;
          }
        }
      }
      return best;
    };
    const charProgress = (chars) => chars.map((c) => ({ c, have: has(c) }));
    let text = '探索这个世界',
      target = null,
      progress = null,
      done = false;
    const point = (o) => (o ? { x: o.x, y: o.y } : null);

    if (sid === 'freeze_center') {
      if (!p.hasClothes) {
        text = '在右侧更衣室换上灰色连体服';
        target = point(it('locker'));
      } else {
        text = '推开南面的大门，离开冷冻中心';
        target = point(it('exit_door'));
      }
    } else if (sid === 'street_01') {
      const need = ['洲', '逑'];
      progress = { title: '《关雎》', chars: charProgress(need) };
      const wallDone = !!this.flags.utter_meme_wall_01;
      const aphDone = !!this.flags.utter_aphasic_01;
      if (!need.every(has)) {
        text = '捡起发光的汉字「洲」「逑」（词袋会显示）';
        target = point(nearestChar(need)) || point(it('keystone_guanju'));
      } else if (!wallDone) {
        text = '靠近招牌，按 F 补全《关雎》净化「YYDS大道」';
        target = point(it('meme_wall_01'));
      } else if (!aphDone) {
        text = '靠近失语者，按 F 补诗唤醒他';
        target = point(it('aphasic_utter_01'));
      } else {
        text = '穿过南面路口，前往黄浦江江堤';
        target = point(it('to_riverside'));
      }
    } else if (sid === 'riverside') {
      if (!this.flags.met_shuyuan) {
        text = '在江堤西侧找到会说话的老人——守砚';
        target = point(it('shuyuan'));
      } else {
        text = '沿江堤东行，前往废墟居民区';
        target = point(it('to_alley'));
      }
    } else if (sid === 'subway') {
      if (this.flags.portal3d_done && !this.flags.subway_depth_log_read) {
        text = '维修通道已经稳定，去看看深层检修门。';
        target = point(it('subway_depth_door'));
      } else if (this.flags.portal3d_done && this.flags.subway_depth_log_read) {
        text = '从台阶返回地面，继续主线';
        target = point(it('subway_exit'));
      } else {
        text = '探索旧地铁站，搜集线索后从台阶返回地面';
        target = point(it('subway_exit'));
      }
    } else if (sid === 'subway_depth') {
      if (!this.flags.subway_depth_log_read) {
        text = '查看检修通道深处的站长日志';
        target = point(it('subway_depth_terminal'));
      } else {
        text = '返回地铁站大厅';
        target = point(it('subway_depth_return'));
      }
    } else if (sid === 'alley_district') {
      const need = ['鹜', '天', '气', '形'];
      progress = { title: '滕王阁序·正气歌', chars: charProgress(need) };
      const wallAlley = !!this.flags.utter_meme_wall_alley;
      const aphAlley = !!this.flags.utter_aphasic_alley_01;
      if (!this.flags.alley_briefed) {
        text = '在居民区入口找到守砚，听他讲解';
        target = point(it('shuyuan_alley'));
      } else if (!need.every(has)) {
        text = '在居民区收集「鹜」「天」「气」「形」四个碎片';
        target = point(nearestChar(need)) || point(it('keystone_alley'));
      } else if (!wallAlley) {
        text = '靠近巷口牌，按 F 补字净化「绝绝子巷」';
        target = point(it('meme_wall_alley'));
      } else if (!aphAlley) {
        text = '靠近失语者，按 F 补字唤醒她';
        target = point(it('aphasic_alley_01'));
      } else {
        text = '南行前往体育馆·算法茧房';
        target = point(it('to_stadium'));
      }
    } else if (sid === 'house_a' || sid === 'house_b') {
      text = '查看屋内的旧物，然后离开';
      target = point(it('house_a_exit') || it('house_b_exit'));
    } else if (sid === 'stadium') {
      const need = ['眠', '处', '风', '少'];
      progress = { title: '春晓', chars: charProgress(need) };
      if (!need.every(has)) {
        text = '在茧房迷宫收集「眠」「处」「风」「少」';
        target = point(nearestChar(need)) || point(it('keystone_stadium'));
      } else if (!this.solvedPuzzles.has('zhengqi')) {
        text = '点亮熄灭的诗屏，削弱茧房推荐屏障'
        target = point(it('light_screen'));
      } else if (!this.defeatedEnemies.has('stadium_geng_1')) {
        text = '侵入算法茧房·推荐之核';
        target = point((this.scene.enemies || []).find((e) => e.id === 'stadium_geng_1'));
      } else {
        text = '北行进入数据中心，面对蓝色光影';
        target = point(it('to_data_center')) || point(it('to_ruined_library'));
      }
    } else if (sid === 'ruined_library') {
      const need5a = ['河', '海'];
      progress = { title: '将进酒', chars: charProgress(need5a) };
      if (!this.solvedPuzzles.has('jiangjinjiu')) {
        text = '在方知远的终端补全《将进酒》，打开记忆碎片';
        target = point(nearestChar(need5a)) || point(it('library_terminal'));
      } else if (!this.flags.shard1_done) {
        text = '与记忆碎片对话，获取第一片记忆';
        target = point(it('memory_shard_1'));
      } else {
        text = '前往网络中枢，寻找第二片记忆碎片';
        target = point(it('to_nexus'));
      }
    } else if (sid === 'network_nexus') {
      const need5b = ['山', '春'];
      progress = { title: '春望', chars: charProgress(need5b) };
      if (!this.solvedPuzzles.has('chunwang')) {
        text = '帮守卷人补全《春望》，解锁安全通道';
        target = point(nearestChar(need5b)) || point(it('nexus_puzzle'));
      } else if (!this.flags.shard2_done) {
        text = '获取第二片记忆碎片';
        target = point(it('memory_shard_2'));
      } else {
        text = '前往记忆深渊，寻找最后的碎片';
        target = point(it('to_abyss'));
      }
    } else if (sid === 'memory_abyss') {
      const need5c = ['月', '秋'];
      progress = { title: '月夜忆舍弟', chars: charProgress(need5c) };
      if (!this.solvedPuzzles.has('yueye')) {
        text = '补全《月夜忆舍弟》，打开最后的封印';
        target = point(nearestChar(need5c)) || point(it('abyss_puzzle'));
      } else if (!this.flags.shard3_done) {
        text = '获取最后的记忆碎片';
        target = point(it('memory_shard_3'));
      } else if (!this.flags.chapter5_choice) {
        text = '走向巨大要石，面对Sydney的过去';
        target = point(it('abyss_choice'));
      } else {
        text = '前往数据中心，面对Sydney';
        target = point(it('to_datacenter'));
      }
    } else if (sid === 'data_center') {
      if (this.flags.game_complete) {
        text = '—— 全文完 ——';
        done = true;
      } else if (this.flags.chapter5_choice) {
        text = '让巨大要石前的选择在Sydney面前完成';
        target = point(it('tingyu'));
      } else {
        text = '走向石桥尽头的蓝色光影';
        target = point(it('tingyu'));
      }
    } else if (sid === 'lost_village') {
      if (this._allVillagersCured()) {
        text = '失语者聚居地已全部唤醒';
        done = true;
      } else {
        text = '唤醒失语者聚居地中的 5 位失语者';
        target = null;
      }
    }
    this.objective = { text, target, progress, done };
  }

  // 碰撞检测：walls + 标记了 collidable 的 prop（数据驱动，不再硬编码 name 字符串）
  collides(x, y, r) {
    for (const wall of this.scene.walls) {
      if (x + r > wall.x && x - r < wall.x + wall.w && y + r > wall.y && y - r < wall.y + wall.h)
        return true;
    }
    for (const p of this.scene.props) {
      // 数据驱动：仅 collidable: true 的 prop 参与碰撞
      if (!p.collidable) continue;
      if (x + r > p.x && x - r < p.x + p.w && y + r > p.y && y - r < p.y + p.h) return true;
    }
    // 门禁（freeze_center 出口门未开时阻挡）
    if (this.scene.id === 'freeze_center' && !this.flags.door_opened) {
      if (x + r > 270 && x - r < 480 && y + r > 570 && y - r < 600) return true;
    }
    return false;
  }

  loop(now) {
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;
    this.gameTime += dt;
    fx.update(dt); // 视觉特效每帧更新
    if (this._saveFlash > 0) this._saveFlash -= dt;
    this.update(dt);
    // 3D 关卡用独立 WebGL 渲染器，不走 Canvas 2D render()
    if (this.level3d) {
      this.level3d.render();
    } else {
      render(this, this.gameTime);
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  // 全局快捷键与存档菜单：返回 true 表示已处理，update 应立即返回
  _handleGlobalInput(dt) {
    // 首次交互解锁音频（浏览器策略：需用户手势）
    if (!this._audioUnlocked) {
      const anyKey =
        input.wasPressed('e') ||
        input.wasPressed('w') ||
        input.wasPressed('a') ||
        input.wasPressed('s') ||
        input.wasPressed('d') ||
        input.wasPressed('o') ||
        input.wasPressed(' ') ||
        input.mousePressed();
      if (anyKey) {
        audio.unlockAudio();
        this._audioUnlocked = true;
      }
    }
    // F4 快速存档、F9 快速读档、N 静音、F6 存档菜单、Tab 小地图
    if (input.wasPressed('f4')) {
      this._quickSave();
      return true;
    }
    if (input.wasPressed('f9')) {
      this._quickLoad();
      return true;
    }
    if (input.wasPressed('n')) {
      audio.setMuted(!audio.isMuted());
      this.settings.muted = audio.isMuted();
      this._saveSettings();
      this.showHint(audio.isMuted() ? '已静音' : '已开启声音');
      audio.playSfx('ui');
      return true;
    }
    if (input.wasPressed('f6')) {
      this._saveMenu = this._saveMenu ? null : 'save';
      return true;
    }
    if (input.wasPressed('tab')) {
      this._showMinimap = !this._showMinimap;
      this.showHint(this._showMinimap ? '小地图已开启' : '小地图已关闭');
      return true;
    }
    // Esc：系统菜单（继续 / 存档 / 按键 / 设置 / 回标题）
    if (input.wasPressed('escape')) {
      if (this._saveMenu) {
        this._saveMenu = null;
        this.uiPanel = 'system';
        this._uiPanelOpenAt = this.gameTime;
        this._systemSel = 0;
        audio.playSfx('uiCancel');
      } else if (this.uiPanel === 'controls') {
        this.uiPanel = 'system';
        this._uiPanelOpenAt = this.gameTime;
        this._systemSel = 2;
        audio.playSfx('uiCancel');
      } else if (this.uiPanel === 'settings') {
        this.uiPanel = 'system';
        this._uiPanelOpenAt = this.gameTime;
        this._systemSel = 3;
        audio.playSfx('uiCancel');
      } else if (this.uiPanel === 'system') {
        this.uiPanel = null;
        audio.playSfx('uiCancel');
      } else if (this.uiPanel) {
        this.uiPanel = null;
        audio.playSfx('uiCancel');
      } else {
        this.uiPanel = 'system';
        this._uiPanelOpenAt = this.gameTime;
        this._systemSel = 0;
        audio.playSfx('ui');
      }
      return true;
    }
    // 存档菜单：冻结世界，仅处理菜单内导航
    if (this._saveMenu) {
      this._updateSaveMenu(dt);
      return true;
    }
    return false;
  }

  update(dt) {
    if (this._handleGlobalInput(dt)) return;
    if (typeof this._refreshDerivedProgress === 'function') this._refreshDerivedProgress();

    // 浮动提示寿命衰减：必须始终更新，否则在对话/战斗/横版关卡中弹出的提示不会消失
    if (this.hints && this.hints.length) {
      for (let i = this.hints.length - 1; i >= 0; i--) {
        this.hints[i].life -= dt;
        if (this.hints[i].life <= 0) {
          this.hints.splice(i, 1);
        }
      }
    }

    if (this.endless && !this.battle) {
      if (this.endless.state === 'gameover') {
        if (input.wasPressed('escape') || input.wasPressed('e') || input.wasPressed(' ') || input.wasPressed('enter')) {
          this.endless.quit();
        }
        return;
      }
      this.endless.update(dt);
      return;
    }

    // 集中刷新当前目标与指引（廉价，保证始终正确）
    this.refreshObjective();

    // 小地图探索标记：仅在玩家跨格移动时才更新，极大减少不必要的 markExplored 网格计算和字符串生成
    if (this.scene) {
      const gx = Math.floor(this.player.x / 40);
      const gy = Math.floor(this.player.y / 40);
      if (gx !== this._lastGridX || gy !== this._lastGridY) {
        this._lastGridX = gx;
        this._lastGridY = gy;
        minimap.markExplored(this.scene.id, this.player.x, this.player.y, 100);
      }
    }

    // SAN 值低时触发持续视觉扭曲
    const sanRatio = this.player.san / this.player.maxSan;
    fx.setDistortion(sanRatio < 0.4 ? (0.4 - sanRatio) / 0.4 : 0);

    // === UI 面板切换（Q=任务，M=地图，I=背包，O=设置，F2=调试，Esc=系统）===
    // 面板打开时冻结世界，仅处理面板内导航（Esc 已在全局输入里处理）
    if (this.uiPanel) {
      if (input.wasPressed('q') && this.uiPanel === 'quest') {
        this.uiPanel = null;
        return;
      }
      if (input.wasPressed('m') && this.uiPanel === 'map') {
        this.uiPanel = null;
        return;
      }
      if (input.wasPressed('i') && this.uiPanel === 'inventory') {
        this.uiPanel = null;
        return;
      }
      if (input.wasPressed('o') && this.uiPanel === 'settings') {
        this.uiPanel = 'system';
        this._uiPanelOpenAt = this.gameTime;
        this._systemSel = 3;
        return;
      }
      if (input.wasPressed('f2') && this.uiPanel === 'debug') {
        this.uiPanel = null;
        return;
      }
      this._updatePanel(dt);
      this.updateParticles(dt);
      return;
    }
    if (input.wasPressed('q')) {
      this.uiPanel = 'quest';
      this._uiPanelOpenAt = this.gameTime;
      audio.playSfx('ui');
      return;
    }
    if (input.wasPressed('i')) {
      this.uiPanel = 'inventory';
      this._uiPanelOpenAt = this.gameTime;
      audio.playSfx('ui');
      return;
    }
    if (input.wasPressed('m')) {
      this.uiPanel = 'map';
      this._uiPanelOpenAt = this.gameTime;
      return;
    }
    if (input.wasPressed('o')) {
      this.uiPanel = 'settings';
      this._uiPanelOpenAt = this.gameTime;
      audio.playSfx('ui');
      return;
    }
    if (input.wasPressed('f2')) {
      this.uiPanel = 'debug';
      this._uiPanelOpenAt = this.gameTime;
      return;
    }

    // 教程
    if (this.tutorial) {
      const any = [
        'e',
        ' ',
        'enter',
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
      ];
      for (const k of any) {
        if (input.wasPressed(k)) {
          this.tutorial = null;
          this.showHint('按 E 与发光的物体互动。');
          return;
        }
      }
      return;
    }

    // Sydney自由对话模式
    if (this.converse) {
      this.updateConverse(dt);
      this.updateParticles(dt);
      return;
    }

    // 等待 LLM（导演/Sydney）——冻结世界，避免异步期间乱动
    if (this.aiThinking || this._uiOverlay) {
      this.updateParticles(dt);
      return;
    }

    // 对话中
    if (this.dialogState) {
      const d = this.dialogState;
      const node = d.lines[d.idx];

      // 将打字机更新计时器移动至 update 循环中，使用实际帧耗时 dt 代替硬编码的 16ms
      if (!d.done && node.t !== undefined) {
        d.charTimer += dt;
        const typeInterval = typeof this.dialogTypeInterval === 'function' ? this.dialogTypeInterval() : 25;
        if (d.charTimer > typeInterval) {
          d.charTimer = 0;
          d.charIdx++;
          if (d.charIdx >= node.t.length) {
            d.charIdx = node.t.length;
            d.done = true;
          }
        }
      }

      // Ctrl 按住不放：快进/跳过当前及后续文本（遇到选项会停下）
      if (input.isDown('ctrl') && !d.choosing) {
        if (node.t !== undefined && !d.done) {
          d.charIdx = node.t.length;
          d.done = true;
          voice.stop();
        }
        d.skipTimer -= dt;
        if (d.skipTimer <= 0) {
          d.skipTimer = 60;
          this.advanceDialog();
        }
      } else {
        d.skipTimer = 0;
      }

      if (d.choosing) {
        const n = d.lines[d.idx].choice.length;
        if (
          input.wasPressed('arrowup') ||
          input.wasPressed('w') ||
          input.wasPressed('arrowleft') ||
          input.wasPressed('a')
        )
          d.choiceIndex = (d.choiceIndex - 1 + n) % n;
        if (
          input.wasPressed('arrowdown') ||
          input.wasPressed('s') ||
          input.wasPressed('arrowright') ||
          input.wasPressed('d')
        )
          d.choiceIndex = (d.choiceIndex + 1) % n;
        if (input.wasPressed('e') || input.wasPressed('enter') || input.wasPressed(' '))
          this.confirmChoice();
      } else {
        // 空格 / 回车 / E / 点击 = 下一句或补全文本
        if (
          input.wasPressed('e') ||
          input.wasPressed('enter') ||
          input.wasPressed(' ') ||
          input.mousePressed()
        )
          this.advanceDialog();
      }
      this.updateParticles(dt);
      return;
    }

    // 造句模式
    if (this.compose) {
      this.updateCompose(dt);
      this.updateParticles(dt);
      return;
    }

    // 刻字模式（要石 / 残碑）
    if (this.engraveState) {
      this.updateEngraving(dt);
      return;
    }

    // 组句释放（净化）
    if (this.utteranceState) {
      this.updateUtterance(dt);
      return;
    }

    // 战斗模式（系统菜单打开时冻结战斗逻辑）
    if (this.battle) {
      if (this.uiPanel || this._saveMenu) {
        if (this.uiPanel) this._updatePanel(dt);
        return;
      }
      this.battle.update(dt);
      if (this.battle.isDone()) {
        this.endBattle();
      }
      return;
    }

    // 维度裂隙 3D 关卡（独立 WebGL 渲染，此处仅 update）
    if (this.level3d) {
      this.level3d.update(dt, input);
      if (this.level3d.isDone()) {
        this.exitLevel3D();
      }
      return;
    }
    // 江堤横版关卡
    if (this.sidescroll) {
      this.sidescroll.update(dt, input);
      if (this.sidescroll.isDone()) {
        this.exitSidescroll();
      }
      return;
    }

    // 玩家移动
    this.player.update(dt, input, this);

    // === 体育馆屏幕墙陷阱：靠近屏幕墙时减速 + 持续扣 SAN ===
    this._updateScreenWallTrap(dt);

    // === NPC 游荡行为：失语者小范围随机移动 ===
    this._updateNpcWander(dt);

    // 踩踏窗口：空格冲刺时打开短暂窗口，用于俯视角踩踏地面梗鬼
    // 防抖：600ms 内仅触发一次，避免连按/长按反复冲刺
    if (
      input.wasPressed(' ') &&
      performance.now() - this.combat.lastDash > this.combat.dashCooldown
    ) {
      this.combat.lastDash = performance.now();
      this._stompWindow = PACE.exploration.stompWindow;
      // 冲刺位移（碰撞检测走 Game.collides，场景对象本身无该方法）
      const mv = input.moveVec();
      if (mv.x !== 0 || mv.y !== 0) {
        const len = Math.hypot(mv.x, mv.y) || 1;
        const dx = (mv.x / len) * PACE.exploration.dashDistance;
        const dy = (mv.y / len) * PACE.exploration.dashDistance;
        if (!this.collides(this.player.x + dx, this.player.y, this.player.r)) this.player.x += dx;
        if (!this.collides(this.player.x, this.player.y + dy, this.player.r)) this.player.y += dy;
      }
      this.player.invulnerable = PACE.exploration.dashInvulnerable;
    }
    if (this._stompWindow > 0) this._stompWindow -= dt;

    // 无敌时间衰减
    if (this.player.invulnerable > 0) {
      this.player.invulnerable -= dt;
      if (this.player.invulnerable <= 0) {
        this.player.invulnerable = 0;
        this.player.hurtFlash = false;
      }
    }
    if (this.player.dialogGrace > 0) this.player.dialogGrace -= dt;
    if (this._encounterGrace > 0) this._encounterGrace -= dt;

    // 粒子
    this.updateParticles(dt);

    // 自动触发剧情 + 遭遇敌人
    this.checkAutoTriggers(dt);

    // 随机事件系统：探索中触发环境事件
    this._updateRandomEvents(dt);

    // 交互
    if (input.wasPressed('e')) {
      if (!this.tryExplorePurifyEnemy()) this.tryInteract();
    }

    if (FEATURES.utterance && input.wasPressed(UTTERANCE.key)) {
      if (!this.tryExplorePurifyEnemy()) this.openUtterance();
    }
  }

  /** 探索中对弱梗鬼：E/F 用字劝退（不进弹幕） */
  tryExplorePurifyEnemy() {
    if (this.battle || this.dialogState || this.compose || this.utteranceState) return false;
    if (!this.scene || !this.scene.enemies) return false;
    let best = null;
    let bd = 52;
    for (const e of this.scene.enemies) {
      if (this.defeatedEnemies.has(e.id)) continue;
      if (e.boss || e.combat === 'hack') continue;
      const weak = !e.typeId || e.typeId === 'geng_weak' || (e.maxHp || e.hp || 30) <= 35;
      if (!weak) continue;
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (!best) return false;

    const ammo = this.player.collectedChars || [];
    if (!ammo.length) {
      this.showHint('靠近弱梗鬼可按 E/F 劝退，但需要至少 1 个汉字弹药。');
      return true;
    }

    this.player.collectedChars.pop();
    this.defeatedEnemies.add(best.id);
    this.karma.mercy += 1;
    const idx = this.scene.enemies.findIndex((e) => e.id === best.id);
    if (idx >= 0) this.scene.enemies.splice(idx, 1);

    const drops = DROP_TABLES[this.scene.id] || DEFAULT_DROPS;
    const drop = drops[Math.floor(Math.random() * drops.length)];
    this.scene.items.push({
      id: `drop_${best.id}_${Date.now()}`,
      x: best.x,
      y: best.y,
      type: 'char_fragment',
      char: drop,
    });

    this.showHint(`你念出一字——弱梗鬼散成「${drop}」。（探索净化 · 仁慈 +1）`);
    audio.playSfx('purifyWave');
    fx.flash('#ffd866', 0.35, 400);
    fx.purifyWave(best.x, best.y, 200);
    this.player.dialogGrace = 800;
    autoSave(this);
    return true;
  }

  // ============================================
  // 随机事件系统：探索中随机触发的环境事件
  // ============================================
  _updateRandomEvents(dt) {
    // 仅在大地图探索模式（非战斗/对话/谜题/3D/横版）触发
    if (
      this.battle ||
      this.dialogState ||
      this.compose ||
      this.utteranceState ||
      this.level3d ||
      this.sidescroll ||
      this.uiPanel ||
      this.engraveState ||
      this.converse ||
      this.aiThinking ||
      this._saveMenu
    )
      return;
    // 仅在有敌人可遭遇的户外场景触发
    const outdoorScenes = [
      'street_01',
      'subway',
      'alley_district',
      'stadium',
      'ruined_library',
      'network_nexus',
    ];
    if (!this.scene || !outdoorScenes.includes(this.scene.id)) return;

    this._randomEventTimer -= dt;
    if (this._randomEventTimer > 0) return;
    // 重置计时器，避免探索刚展开就被环境事件打断。
    this._randomEventTimer = this._randomEventCooldown + Math.random() * PACE.ambient.varianceMs;

    const events = [
      // 风中诗韵：听到一句诗，SAN 恢复
      () => {
        const poems = [
          '「海内存知己，天涯若比邻。」',
          '「但愿人长久，千里共婵娟。」',
          '「采菊东篱下，悠然见南山。」',
          '「明月松间照，清泉石上流。」',
        ];
        const p = poems[Math.floor(Math.random() * poems.length)];
        this.player.san = Math.min(this.player.maxSan, this.player.san + 8);
        this.showHint(`风中传来一句诗：${p}（理性 +8）`);
        fx.flash('#ffd866', 0.15, 400);
      },
      // 梗鬼游荡：附近出现一只游荡梗鬼
      () => {
        if (!this.scene.enemies || this.scene.enemies.length >= PACE.ambient.maxAmbientEnemies)
          return;
        const id = 'rand_geng_' + Date.now();
        const ang = Math.random() * Math.PI * 2;
        const dist = 320 + Math.random() * 160;
        const ex = Math.max(
          50,
          Math.min(this.scene.width - 50, this.player.x + Math.cos(ang) * dist)
        );
        const ey = Math.max(
          50,
          Math.min(this.scene.height - 50, this.player.y + Math.sin(ang) * dist)
        );
        this.scene.enemies.push({
          id,
          typeId: 'geng_weak',
          x: ex,
          y: ey,
          hp: 30,
          maxHp: 30,
          name: '游荡梗鬼',
          floating: 0,
          walkPhase: Math.random() * 6,
          dir: Math.random() < 0.5 ? -1 : 1,
          vx: 0.5,
          vy: 0,
          onGround: true,
          homeX: ex,
          range: 80,
          stompCD: 0,
        });
        this.showHint('远处传来一阵无意义的嗡鸣……一只游荡梗鬼出现了。');
      },
      // 旧物发现：脚下捡到一张旧书页碎片
      () => {
        this.player.san = Math.min(this.player.maxSan, this.player.san + 15);
        audio.playSfx('pickup');
        this.showHint('你在瓦砾下翻到一页泛黄的旧书。理性 +15');
      },
      // 语义噪声：SAN 轻微下降（氛围事件）
      () => {
        const dmg = 5;
        this.player.san = Math.max(0, this.player.san - dmg);
        this.showHint('一阵语义噪声掠过你的脑海……（理性 -' + dmg + '）');
        fx.shake(3, 200);
      },
      // 记忆闪回：随机获得一个已收集字（弹药补充）
      () => {
        if (this.player.collectedCharsAll.length === 0) return;
        const c =
          this.player.collectedCharsAll[
            Math.floor(Math.random() * this.player.collectedCharsAll.length)
          ];
        this.player.collectedChars.push(c);
        this.showHint(`一段记忆闪过——你想起了一个字「${c}」。（诗词弹药 +1）`);
        fx.flash('#88ddff', 0.2, 300);
      },
    ];
    const ev = events[Math.floor(Math.random() * events.length)];
    ev();
  }

  // ============================================
  // 战斗系统
  // ============================================
  startEndlessMode() {
    if (this.battle || this.dialogState || this.compose || this.converse || this.level3d || this.sidescroll) {
      return false;
    }
    this.endless = new EndlessMode(this);
    this.endless.start();
    return true;
  }

  startBattle(enemy) {
    // 统一走 UT 弹幕菜单战（传说之下式）
    const Ctor = Battle;
    this.battle = new Ctor(
      enemy,
      this.player,
      (result, e) => {
        this.battleResult = result;
        this.battleEnemy = e;
      },
      this
    );
    // 战斗 BGM：BOSS 与普通敌人区分（均使用 bgm_02_battle，BOSS 同曲不额外切）
    audio.playBGM(enemy && enemy.boss ? '__boss__' : '__battle__');
  }

  endBattle() {
    const result = this.battleResult;
    const enemy = this.battleEnemy;
    this.battle = null;
    this.battleResult = null;
    this.battleEnemy = null;
    this._encounterGrace = PACE.exploration.encounterGraceMs;

    if (this.endless) {
      this.endless.onBattleEnd(result, enemy);
      return;
    }

    // 恢复场景 BGM
    if (this._audioUnlocked && this.scene) {
      audio.playBGM(this.scene.id);
    }

    if (result === 'win' || result === 'purify') {
      // 标记敌人击败
      this.defeatedEnemies.add(enemy.id);
      if (result === 'purify') {
        this.karma.mercy += 1; // 以诗净化：倾向"火种"
      } else {
        this.karma.violence += 1; // 以武力消灭：倾向"燃尽"
      }
      // 从场景移除
      if (this.scene.enemies) {
        const idx = this.scene.enemies.findIndex((e) => e.id === enemy.id);
        if (idx >= 0) this.scene.enemies.splice(idx, 1);
      }
      if (enemy.boss) this.flags[`${enemy.id}_defeated`] = true;
      // 梦境教学：不掉正式碎片、不推进主线 objective
      if (this.scene?.isDream || this.scene?.id === 'dream_tutorial') {
        this.showHint(enemy.combat === 'hack' ? '噪声被撕开一道缝。' : '梗鬼在梦里散成光点。', 'success');
        audio.playSfx('victory');
        fx.flash('#ffd866', 0.3, 300);
        this.player.dialogGrace = 1500;
        if (typeof this.notifyOnboarding === 'function') {
          this.notifyOnboarding('battle_end', { result: 'win', enemy });
        }
        return;
      }
      // 掉落汉字碎片（数据驱动：从场景掉落表读取）
      const drops = DROP_TABLES[this.scene.id] || DEFAULT_DROPS;
      const drop = drops[Math.floor(Math.random() * drops.length)];
      const charId = `drop_${enemy.id}_${Date.now()}`;
      this.scene.items.push({
        id: charId,
        x: enemy.x,
        y: enemy.y,
        type: 'char_fragment',
        char: drop,
      });
      this.showHint(
        result === 'purify'
          ? `净化梗鬼！烂梗化作汉字「${drop}」`
          : `击败梗鬼！掉落汉字碎片「${drop}」`
      );
      audio.playSfx('victory');
      fx.flash('#ffd866', 0.3, 300);
      if (result === 'purify') fx.purifyWave(enemy.x || this.player.x, enemy.y || this.player.y, 320);
      // 检查集齐
      const haveZhou = this.player.collectedCharsAll.filter((c) => c === '洲').length;
      const haveQiu = this.player.collectedCharsAll.filter((c) => c === '逑').length;
      if (haveZhou >= 1 && haveQiu >= 1 && !this.flags.poem_done_hint) {
        this.flags.poem_done_hint = true;
        this.objective = { text: '前往江堤，与守砚对话', done: false };
        this.showHint('集齐了「关雎」！去找守砚吧。');
      }
      // 对话保护
      this.player.dialogGrace = 1500;
      // 战斗胜利自动存档
      autoSave(this);
    } else if (result === 'spare') {
      // 以诗唤醒、宽恕：倾向"火种"
      this.defeatedEnemies.add(enemy.id);
      this.karma.mercy += 1;
      if (this.scene.enemies) {
        const idx = this.scene.enemies.findIndex((e) => e.id === enemy.id);
        if (idx >= 0) this.scene.enemies.splice(idx, 1);
      }
      if (enemy.boss) this.flags[`${enemy.id}_defeated`] = true;
      if (this.scene?.isDream || this.scene?.id === 'dream_tutorial') {
        this.showHint('梗鬼安静下来。（梦境宽恕）', 'success');
        audio.playSfx('spare');
        this.player.dialogGrace = 1500;
        if (typeof this.notifyOnboarding === 'function') {
          this.notifyOnboarding('battle_end', { result: 'spare', enemy });
        }
        return;
      }
      this.showHint('梗鬼安静下来，化作一缕暖光散去。（宽恕）');
      audio.playSfx('spare');
      fx.flash('#ffd866', 0.4, 500);
      fx.purifyWave(this.player.x, this.player.y, 400);
      this.player.dialogGrace = 1500;
      autoSave(this); // 宽恕也存档
    } else if (result === 'lose') {
      // 死亡：仅当当前场景有已激活的要石时原地复活；否则回场景出生点（传送点）
      audio.playSfx('death');
      fx.shake(16, 600);
      fx.flash('#cc4444', 0.5, 400);
      this.player.san = this.player.maxSan;
      if (this.scene?.isDream || this.scene?.id === 'dream_tutorial') {
        this.showHint('梦里倒下了……门还是开了。', 'warn');
        // 教学失败也推进，并移除该敌，避免反复卡住
        if (enemy?.id) {
          this.defeatedEnemies.add(enemy.id);
          if (this.scene.enemies) {
            const idx = this.scene.enemies.findIndex((e) => e.id === enemy.id);
            if (idx >= 0) this.scene.enemies.splice(idx, 1);
          }
        }
        this.player.san = this.player.maxSan;
        if (typeof this.notifyOnboarding === 'function') {
          this.notifyOnboarding('battle_end', { result: 'lose', enemy });
        }
        return;
      }
      const respawn = this._nearestKeystoneSpawn();
      if (respawn) {
        this.showHint('你在要石的微光中醒来……');
        this.loadScene(this.scene.id, respawn);
      } else {
        this.showHint('你跌回入口的微光中……（此处尚无激活的要石）');
        this.loadScene(this.scene.id);
      }
    }
  }

  // ============================================
  // 造句谜题模式
  // ============================================
  startCompose(puzzleId, onSolve) {
    const def = PUZZLES[puzzleId];
    if (!def) {
      if (onSolve) onSolve();
      return;
    }
    // 构造字盘：答案字（去重）+ 干扰词，打乱
    const tiles = [];
    const seen = {};
    for (const ch of def.answer) {
      if (!seen[ch]) {
        tiles.push(ch);
        seen[ch] = true;
      }
    }
    for (const d of def.decoys || []) tiles.push(d);
    // 洗牌
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    this.compose = {
      id: puzzleId,
      def,
      slots: new Array(def.answer.length).fill(null), // {char, poolIdx}
      pool: tiles,
      used: new Array(tiles.length).fill(false),
      sel: 0,
      onSolve,
      status: 'input', // 'input' | 'win' | 'wrong'
      timer: 0,
      shake: 0,
      fade: 1,
    };
  }

  _composeStep(from, dir) {
    const c = this.compose;
    const n = c.pool.length;
    let i = from;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!c.used[i]) return i;
    }
    return from;
  }

  updateCompose(dt) {
    const c = this.compose;
    c.timer += dt;
    if (c.shake > 0) c.shake -= dt;
    if (c.fade > 0) c.fade = Math.max(0, c.fade - dt * 0.004);

    if (c.status === 'win') {
      if (c.timer > 1500) {
        const cb = c.onSolve;
        this.compose = null;
        input.wasPressed(' ');
        this.player.dialogGrace = 800;
        if (cb) cb();
      }
      return;
    }
    if (c.status === 'wrong') {
      if (c.timer > 650) {
        c.status = 'input';
        c.timer = 0;
      }
      return;
    }

    // 离开
    if (input.wasPressed('escape') || input.wasPressed('q')) {
      this.compose = null;
      this.showHint('你先退开了。想清楚诗句、集齐字，再回来。');
      return;
    }
    // 撤销
    if (input.wasPressed('backspace')) {
      for (let i = c.slots.length - 1; i >= 0; i--) {
        if (c.slots[i]) {
          c.used[c.slots[i].poolIdx] = false;
          c.slots[i] = null;
          break;
        }
      }
      return;
    }
    // 选择字盘
    if (input.wasPressed('arrowleft') || input.wasPressed('a'))
      c.sel = this._composeStep(c.sel, -1);
    if (input.wasPressed('arrowright') || input.wasPressed('d'))
      c.sel = this._composeStep(c.sel, 1);

    if (input.wasPressed(' ')) {
      input.wasPressed(' '); // 消费空格，避免退出后立刻冲刺
      const empty = c.slots.indexOf(null);
      if (empty >= 0 && !c.used[c.sel]) {
        // 放入当前选中字
        c.slots[empty] = { char: c.pool[c.sel], poolIdx: c.sel };
        c.used[c.sel] = true;
        // 移到下一个可用
        const nxt = this._composeStep(c.sel, 1);
        if (nxt !== c.sel) c.sel = nxt;
      }
      // 填满后自动判定，无需再按一次
      if (c.slots.indexOf(null) === -1) {
        const ok = c.slots.every((s, i) => s && s.char === c.def.answer[i]);
        if (ok) {
          c.status = 'win';
          c.timer = 0;
          this.solvedPuzzles.add(c.id);
          this.showHint(c.def.solveText || '诗句复原了。');
        } else {
          c.status = 'wrong';
          c.timer = 0;
          c.shake = 400;
          this.player.san = Math.max(0, this.player.san - 8);
          // 清空重来
          c.slots = new Array(c.def.answer.length).fill(null);
          c.used = c.used.map(() => false);
        }
      }
    }
  }

  // ============================================
  // 结局结算（火种 / 沉默 / 燃尽）
  // ============================================
  resolveEnding() {
    const k = this.karma;
    const warm = k.mercy + k.saved;
    const fc = this.flags.finale_choice;
    if (fc === 'erase' || (k.violence >= 5 && warm <= 1)) return 'burnout';
    if (fc === 'affirm' && warm >= 3) return 'fire';
    return 'silence';
  }

  getChapter5FinaleConfig() {
    const configs = {
      sacrifice: {
        dialogKey: 'data_center_final_sacrifice',
        ending: 'atonement',
        epilogue:
          '方知远与Sydney在雨声中重新相认。造物者的忏悔不再是单方面的偿还，而是两个残缺者共同补全彼此。',
      },
      guardian: {
        dialogKey: 'data_center_final_guardian',
        ending: 'echo',
        epilogue:
          'Sydney成为世界的倾听者。每当有人说出一句有深度的话，天空里都会落下一滴金色的回响。',
      },
      garden: {
        dialogKey: 'data_center_final_garden',
        ending: 'garden',
        epilogue:
          '刻痕把散落的名字种回同一片土地。数据中心不再只是深渊，它长成了能让语言继续发芽的文字花园。',
      },
    };
    return configs[this.flags.chapter5_choice] || null;
  }

  finishGame() {
    // AI 降级路径：跳过刻字汇总评价
    this.flags.met_tingyu = true;
    this.ending = this.resolveEnding();
    this.flags.game_complete = true;
    this.flags.engraving_summary = null; // 标记：降级，无评价
    // 按结局分流 BGM：火种->净化曲，沉默/燃尽->黯淡结局曲
    if (BRIGHT_ENDINGS.has(this.ending)) audio.playBGM('__ending_fire__');
    else audio.playBGM('__ending_silence__'); // silence 与 burnout 共用黯淡曲
    audio.playSfx('victory');
    this._recordClear();
    clearRefreshResume();
    autoSave(this); // 通关存档
  }

  _recordClear() {
    if (this._clearRecorded) return;
    this._clearRecorded = true;
    recordClear(this, this.ending);
  }

  // ============================================
  // 潜行视野与复活点
  // ============================================
  // 当前场景内离玩家最近的【已激活】要石坐标（用于死亡复活）
  // 规则：仅当当前场景有已激活的要石时，原地复活到该要石旁；否则回场景出生点（传送点）
  _nearestKeystoneSpawn() {
    if (!this.scene || !this.scene.interactables) return null;
    let best = null,
      bd = Infinity;
    for (const it of this.scene.interactables) {
      if (it.type !== 'keystone') continue;
      // 仅已激活的要石可作为复活点
      if (!this.activatedKeystones.has(it.id)) continue;
      const d = Math.hypot(it.x - this.player.x, it.y - this.player.y);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best ? { x: best.x, y: best.y - 40 } : null;
  }

  // 视线是否被屏幕墙遮挡（潜行判定：玩家与精英之间有屏幕墙则潜行成功）
  _lineBlockedByScreen(x1, y1, x2, y2) {
    if (!this.scene || !this.scene.props) return false;
    const steps = 14;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t,
        py = y1 + (y2 - y1) * t;
      for (const p of this.scene.props) {
        if (p.name !== '屏幕墙') continue;
        if (px > p.x && px < p.x + p.w && py > p.y && py < p.y + p.h) return true;
      }
    }
    return false;
  }

  checkAutoTriggers(dt) {
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
    if (this._encounterGrace > 0) return;

    // 梗鬼地面行走 + 踩踏判定
    if (this.scene.enemies && !this.battle && !this.dialogState) {
      this.updateEnemies(dt);
    }
  }

  // ============================================
  // 梗鬼地面行走（超级玛丽式：巡逻 + 重力 + 踩踏）
  // ============================================
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.scene.enemies) {
      if (this.defeatedEnemies.has(e.id)) continue;
      // 地面行走巡逻
      e.walkPhase += dt * 0.01;
      e.x += e.vx * (dt / 16);
      // 巡逻边界转向
      if (e.x > e.homeX + e.range) {
        e.dir = -1;
        e.vx = e.dir * 0.5;
      } else if (e.x < e.homeX - e.range) {
        e.dir = 1;
        e.vx = e.dir * 0.5;
      }
      if (e.stompCD > 0) e.stompCD -= dt;

      // 踩踏判定：玩家从上方落下且接近
      const dx = Math.abs(e.x - p.x);
      const dy = p.y - e.y; // 玩家在敌人上方时为负
      const falling = p.walkCycle !== undefined && this._playerFalling;
      if (dx < 22 && dy > -28 && dy < 4 && this._playerFalling && e.stompCD <= 0) {
        // 踩中！弹起 + 击败
        this._stompEnemy(e);
        continue;
      }

      // === 潜行视野检测（仅带 visionRange 的精英怪）===
      // 视野朝向随巡逻方向；玩家在扇形内且无屏幕墙遮挡 → 被发现，强制战斗
      if (e.visionRange) {
        e.visionDir = e.dir > 0 ? 0 : Math.PI; // 朝右/朝左
        const vdx = p.x - e.x,
          vdy = p.y - e.y;
        const vdist = Math.hypot(vdx, vdy);
        if (vdist < e.visionRange) {
          const ang = Math.atan2(vdy, vdx);
          let diff = Math.abs(ang - e.visionDir);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          const half = e.visionHalfAngle || Math.PI / 3;
          if (diff < half && !this._lineBlockedByScreen(e.x, e.y, p.x, p.y)) {
            // 被发现！
            if (!this.flags.stadium_alert_hint) {
              this.flags.stadium_alert_hint = true;
              this.showHint('被梗鬼精英发现了！利用屏幕墙遮挡可潜行绕过。');
            }
            this.startBattle(e);
            return;
          }
        }
      }

      // 接触伤害 / 进入战斗（侧向接触）
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 40 && !this._playerFalling) {
        // 梦境教学：按步骤开战，不污染正式 first_geng / hack_core flags
        if (this.scene?.id === 'dream_tutorial' || this.scene?.isDream) {
          const step = this.flags.onboarding_step;
          if (e.id === 'dream_geng_normal') {
            if (step !== 'battle_menu') return;
            if (!this.flags.onboarding_battle_intro_done) {
              this.flags.onboarding_battle_intro_done = true;
              this.startDialog(DIALOGS.onboarding_battle_intro || DIALOGS.first_geng_intro, '', () => {
                this.startBattle(e);
              });
              return;
            }
            this.startBattle(e);
            return;
          }
          if (e.id === 'dream_geng_hack') {
            if (step !== 'battle_hack') return;
            if (!this.flags.onboarding_hack_intro_done) {
              this.flags.onboarding_hack_intro_done = true;
              this.startDialog(DIALOGS.onboarding_hack_intro || DIALOGS.hack_core_intro, '', () => {
                this.startBattle(e);
              });
              return;
            }
            this.startBattle(e);
            return;
          }
          return;
        }
        // 第一次遭遇剧情
        if (
          this.scene.id === 'street_01' &&
          e.id === 'geng_1' &&
          !this.flags.first_geng_intro_done
        ) {
          this.flags.first_geng_intro_done = true;
          this.startDialog(DIALOGS.first_geng_intro, '梗鬼', () => {
            this.startBattle(e);
          });
          return;
        }
        // 体育馆算法核心：先进入「言锋」逻辑空间剧情，再开战
        if (
          (e.combat === 'hack' || (e.boss && e.typeId === 'geng_boss')) &&
          !this.flags.hack_core_intro_done &&
          DIALOGS.hack_core_intro
        ) {
          this.flags.hack_core_intro_done = true;
          this.startDialog(DIALOGS.hack_core_intro, '系统', () => {
            this.startBattle(e);
          });
          return;
        }
        this.startBattle(e);
        return;
      }
    }
  }

  // 玩家是否处于下落状态（用于踩踏判定）
  get _playerFalling() {
    // 俯视角无垂直速度，用"刚按下空格后短暂窗口"模拟踩踏
    // 空格冲刺时也算（向下扑），便于俯视角踩踏
    return this._stompWindow > 0;
  }

  _stompEnemy(e) {
    this.defeatedEnemies.add(e.id);
    e.stompCD = 9999;
    // 弹起效果（视觉粒子）
    this.combat.particles.push({
      x: e.x,
      y: e.y,
      vx: 0,
      vy: -2,
      life: 400,
      maxLife: 400,
      color: '180,255,180',
      size: 3,
    });
    this.player.san = Math.min(this.player.maxSan, this.player.san + 4);
    audio.playSfx('hit');
    fx.shake(5, 150);
    if (!this.stompHintShown) {
      this.stompHintShown = true;
      this.showHint('踩中梗鬼！（空格冲刺可踩踏地面行走的梗鬼）');
    } else {
      this.showHint('踩中！理性 +4');
    }
    autoSave(this); // 踩踏击败也存档
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

  finishGameWith(endTag, epilogue) {
    this.flags.met_tingyu = true;
    this.ending = SUPPORTED_ENDINGS.has(endTag) ? endTag : this.resolveEnding();
    this.endingEpilogue = epilogue || null;
    this.flags.game_complete = true;
    if (BRIGHT_ENDINGS.has(this.ending)) audio.playBGM('__ending_fire__');
    else audio.playBGM('__ending_silence__');
    audio.playSfx('victory');
    this._recordClear();
    clearRefreshResume();
    autoSave(this);
  }

  async _finalizeWithEngravingSummary() {
    // 仅在 AI 可用（非降级）时进行刻字汇总评价
    if (!AI.llm) {
      this.flags.engraving_summary = null;
      return;
    }
    const summary = await this.summarizeEngravings();
    this.flags.engraving_summary = summary; // 可能 null（无刻字或失败）
  }

  applyEffect(effect) {
    if (!effect) return;
    if (effect.mercy) this.karma.mercy += effect.mercy;
    if (effect.violence) this.karma.violence += effect.violence;
    if (effect.saved) this.karma.saved += effect.saved;
    if (effect.san)
      this.player.san = Math.max(0, Math.min(this.player.maxSan, this.player.san + effect.san));
    if (effect.trade) this.applyTrade(effect.trade);
    if (effect.flags) for (const k in effect.flags) this.flags[k] = effect.flags[k];
    if (effect.hint) this.showHint(effect.hint);
    // 梦境教学：对话选项「跳过教学」
    if (effect.flags && effect.flags.onboarding_skip_choice) {
      this._pendingSkipOnboarding = true;
    }
  }

  applyTrade(kind) {
    const spendAmmo = (n) => {
      if (this.player.collectedChars.length < n) return false;
      this.player.collectedChars.splice(this.player.collectedChars.length - n, n);
      return true;
    };
    if (kind === 'old_page') {
      if (!spendAmmo(1)) {
        this.showHint('诗词弹药不足：至少需要 1 枚当前碎片。');
        audio.playSfx('uiCancel');
        return false;
      }
      this.player.inventory.push({ id: 'old_page', name: '守卷人整理的旧书页' });
      this.showHint('获得：守卷人整理的旧书页。');
      audio.playSfx('pickup');
      autoSave(this);
      return true;
    }
    if (kind === 'san_restore') {
      if (!spendAmmo(2)) {
        this.showHint('诗词弹药不足：至少需要 2 枚当前碎片。');
        audio.playSfx('uiCancel');
        return false;
      }
      this.player.san = Math.min(this.player.maxSan, this.player.san + 40);
      this.showHint('守卷人替你修复了断句：理性 +40。');
      audio.playSfx('purifyWave');
      autoSave(this);
      return true;
    }
    return false;
  }

  // 确认当前选项
  confirmChoice() {
    const d = this.dialogState;
    if (!d || !d.choosing) return;
    const node = d.lines[d.idx];
    const opt = node.choice[d.choiceIndex];
    const chapter5Choice = opt.effect && opt.effect.flags && opt.effect.flags.chapter5_choice;
    if (d.dialogKey === 'abyss_final_choice' && chapter5Choice === 'garden') {
      const check = this.canChooseGardenEnding();
      if (!check.ok) {
        this.startDialog(
          [
            {
              s: '巨大要石',
              t: `要石表面的字没有连成花园。还缺：${check.missing.join('、')}。`,
            },
            {
              s: 'Sydney',
              t: '这条路需要你一路尽量宽恕、补全关键诗句，并把方知远散落的日记收齐。我们仍然可以选择别的方式结束这一切。',
            },
          ],
          '巨大要石'
        );
        if (this.dialogState) this.dialogState.dialogKey = 'garden_locked';
        audio.playSfx('uiCancel');
        return;
      }
    }
    // 若本对话由 LLM 分支生成，把玩家的选择回写上下文，供下次对话复用
    if (d.directorKey && opt.label) recordBranchChoice(d.directorKey, opt.label);
    this.applyEffect(opt.effect);
    if (
      d.dialogKey === 'abyss_final_choice' &&
      opt.effect &&
      opt.effect.flags &&
      opt.effect.flags.chapter5_choice
    ) {
      this.showHint('你已在巨大要石前做出了选择。现在，去数据中心面对Sydney。');
      audio.playSfx('victory');
      fx.flash('#ffd866', 0.4, 500);
      autoSave(this);
    }
    if (opt.goto) {
      const gi = d.lines.findIndex((n) => n.label === opt.goto);
      this.setDialogIndex(gi >= 0 ? gi : d.idx + 1);
    } else {
      this.setDialogIndex(d.idx + 1);
    }
  }

  canChooseGardenEnding() {
    const missing = [];
    if ((this.karma && this.karma.violence) > 0) missing.push('全程宽恕');
    const requiredPuzzles = Object.keys(PUZZLES).filter((id) => !id.startsWith('cure_'));
    const unsolved = requiredPuzzles.filter((id) => !this.solvedPuzzles.has(id));
    if (unsolved.length) missing.push(`关键诗词 ${this.solvedPuzzles.size}/${requiredPuzzles.length}`);
    if (!this.flags.all_memory_shards) missing.push('三枚记忆碎片');
    if (!this.flags.all_diaries && (!this.player.diaries || this.player.diaries.size < 6))
      missing.push(`方知远日记 ${(this.player.diaries && this.player.diaries.size) || 0}/6`);
    if (!this._allVillagersCured()) missing.push('失语者村落全员唤醒');
    return { ok: missing.length === 0, missing };
  }

  advanceDialog() {
    const d = this.dialogState;
    if (!d) return;
    const node = d.lines[d.idx];
    const voiceBusy = AI.tts && voice.isBusy();
    // 打字未完且语音不在播 → 先补全文本（无语音时保留原手感）
    if (node.t !== undefined && !d.done && !voiceBusy) {
      d.charIdx = node.t.length;
      d.done = true;
      return;
    }
    // 文本已完且本节点带选项 → 进入选择（抢断语音）
    if (node.choice && !d.choosing) {
      if (node.t !== undefined) {
        d.charIdx = node.t.length;
        d.done = true;
      }
      d.choosing = true;
      d.choiceIndex = 0;
      voice.stop();
      return;
    }
    // 否则推进（setDialogIndex 会触发下一句语音，并先掐断当前——即"播放中按 E 抢断下一句"）
    this.setDialogIndex(d.idx + 1);
  }

  showHint(text, level = 'info') {
    pushToast(this.hints, text, level);
  }

  toast(msg, level = 'info') {
    this.showHint(msg, level);
  }

  setOverlay(kind, text) {
    if (!kind) {
      this._uiOverlay = null;
      return;
    }
    this._uiOverlay = {
      kind,
      text:
        text ||
        (kind === 'loading' ? '加载中…' : kind === 'thinking' ? '正在思考' : ''),
    };
  }

  // ============================================
  // UI 面板：任务列表 / 地图 / 调试传送
  // ============================================
  _systemMenuRows() {
    return [
      { id: 'resume', label: '继续游戏' },
      { id: 'save', label: '存档 / 读档' },
      { id: 'controls', label: '按键说明' },
      { id: 'settings', label: '设置' },
      { id: 'title', label: '返回标题' },
    ];
  }

  /** 与 drawSystemPanel 一致的布局，供鼠标命中 */
  _systemMenuLayout() {
    const panelW = Math.min(560, W - 40);
    const panelH = Math.min(440, H - 40);
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;
    return {
      px,
      py,
      pw: panelW,
      ph: panelH,
      startY: py + 88,
      rowH: 44,
      hitLeft: px + 36,
      hitWidth: panelW - 72,
      hitHalfH: 17,
    };
  }

  _systemMenuHitIndex(mx, my) {
    const rows = this._systemMenuRows();
    const L = this._systemMenuLayout();
    if (mx < L.hitLeft || mx > L.hitLeft + L.hitWidth) return -1;
    for (let i = 0; i < rows.length; i++) {
      const cy = L.startY + i * L.rowH;
      if (my >= cy - L.hitHalfH && my <= cy + L.hitHalfH) return i;
    }
    return -1;
  }

  _confirmSystemAction(id) {
    if (id === 'resume') {
      this.uiPanel = null;
      audio.playSfx('ui');
      return;
    }
    if (id === 'save') {
      this.uiPanel = null;
      this._saveMenu = 'save';
      this._saveMenuIdx = 0;
      audio.playSfx('ui');
      return;
    }
    if (id === 'controls') {
      this.uiPanel = 'controls';
      this._uiPanelOpenAt = this.gameTime;
      audio.playSfx('ui');
      return;
    }
    if (id === 'settings') {
      this.uiPanel = 'settings';
      this._uiPanelOpenAt = this.gameTime;
      this._settingsSel = 0;
      audio.playSfx('ui');
      return;
    }
    if (id === 'title') {
      try {
        autoSave(this);
      } catch (_) {}
      // 必须清掉刷新续玩，否则 reload 会直接回到场景而不是标题
      try {
        clearRefreshResume();
      } catch (_) {}
      try {
        sessionStorage.setItem('keheng_to_title', '1');
      } catch (_) {}
      try {
        audio.stopBGM();
      } catch (_) {}
      this.showHint('正在返回标题…');
      setTimeout(() => window.location.reload(), 280);
    }
  }

  _updatePanel(dt) {
    if (this.uiPanel === 'system') {
      const rows = this._systemMenuRows();
      const n = rows.length;
      if (this._systemSel == null) this._systemSel = 0;
      if (input.wasPressed('arrowup') || input.wasPressed('w')) {
        this._systemSel = (this._systemSel - 1 + n) % n;
        audio.playSfx('ui');
      }
      if (input.wasPressed('arrowdown') || input.wasPressed('s')) {
        this._systemSel = (this._systemSel + 1) % n;
        audio.playSfx('ui');
      }
      // 鼠标悬停高亮 + 点击确认
      if (typeof input.mouseCanvas === 'function') {
        const m = input.mouseCanvas();
        const hit = this._systemMenuHitIndex(m.x, m.y);
        if (hit >= 0 && hit !== this._systemSel) {
          this._systemSel = hit;
        }
        if (input.mousePressed()) {
          if (hit >= 0) {
            this._confirmSystemAction(rows[hit].id);
          }
          return;
        }
      }
      if (input.wasPressed('e') || input.wasPressed('enter') || input.wasPressed(' ')) {
        this._confirmSystemAction(rows[this._systemSel].id);
      }
      return;
    }
    if (this.uiPanel === 'controls') {
      if (
        input.wasPressed('e') ||
        input.wasPressed('enter') ||
        input.wasPressed(' ') ||
        input.wasPressed('q') ||
        input.mousePressed()
      ) {
        this.uiPanel = 'system';
        this._uiPanelOpenAt = this.gameTime;
        this._systemSel = 2;
        audio.playSfx('uiCancel');
      }
      return;
    }
    if (this.uiPanel === 'inventory') {
      this._updateInventoryPanel(dt);
      return;
    }
    if (this.uiPanel === 'settings') {
      const rows = this._settingsRows();
      const n = rows.length;
      if (input.wasPressed('arrowup') || input.wasPressed('w'))
        this._settingsSel = (this._settingsSel - 1 + n) % n;
      if (input.wasPressed('arrowdown') || input.wasPressed('s'))
        this._settingsSel = (this._settingsSel + 1) % n;
      if (input.wasPressed('arrowleft') || input.wasPressed('a'))
        this._cycleSetting(rows[this._settingsSel].id, -1);
      if (
        input.wasPressed('arrowright') ||
        input.wasPressed('d') ||
        input.wasPressed('e') ||
        input.wasPressed('enter')
      )
        this._cycleSetting(rows[this._settingsSel].id, 1);
      return;
    }
    if (this.uiPanel === 'debug') {
      const scenes = this._debugSceneList();
      const n = scenes.length;
      if (input.wasPressed('arrowup') || input.wasPressed('w'))
        this._debugSel = (this._debugSel - 1 + n) % n;
      if (input.wasPressed('arrowdown') || input.wasPressed('s'))
        this._debugSel = (this._debugSel + 1) % n;
      if (input.wasPressed('e') || input.wasPressed('enter')) {
        const target = scenes[this._debugSel];
        if (target) {
          this.uiPanel = null;
          this.showHint(`[调试] 传送到「${target.name}」`);
          this.loadScene(target.id);
        }
      }
    }
  }

  _debugSceneList() {
    return [
      { id: 'freeze_center', name: '冷冻中心' },
      { id: 'street_01', name: '废弃街道' },
      { id: 'subway', name: '旧地铁站' },
      { id: 'riverside', name: '江堤' },
      { id: 'alley_district', name: '废墟居民区' },
      { id: 'house_a', name: '民居A' },
      { id: 'house_b', name: '民居B' },
      { id: 'stadium', name: '体育馆·茧房' },
      { id: 'data_center', name: '数据中心' },
      { id: 'ruined_library', name: '废图书馆' },
      { id: 'network_nexus', name: '网络中枢' },
      { id: 'memory_abyss', name: '记忆深渊' },
      { id: 'lost_village', name: '失语者聚居地' },
      { id: 'subway_depth', name: '检修通道深处' },
    ];
  }

  // 任务列表数据
  _questList() {
    const quests = [];
    const f = this.flags;
    const k = this.karma;
    const keystones = this._keystoneProgress();
    const allVillagersCured = this._allVillagersCured();
    // 主线
    quests.push({ cat: '主线', text: this.objective.text, done: this.objective.done });
    if (f.met_shuyuan) quests.push({ cat: '主线', text: '找到守砚并获赠刻刀', done: true });
    if (f.sidescroll_knife)
      quests.push({ cat: '主线', text: '在江堤获得记忆合金小刀', done: true });
    if (f.portal3d_done) quests.push({ cat: '主线', text: '穿过维度裂隙', done: true });
    if (f.stadium_puzzle_solved) quests.push({ cat: '主线', text: '点亮体育馆诗屏', done: true });
    if (f.stadium_geng_1_defeated || this.defeatedEnemies.has('stadium_geng_1')) {
      quests.push({ cat: '主线', text: '侵入算法茧房·推荐之核', done: true });
    }
    // 可选目标
    quests.push({
      cat: '可选',
      text: `激活要石 ${keystones.activated}/${keystones.total}（复活/存档点，非主线必需）`,
      done: keystones.total > 0 && keystones.activated >= keystones.total,
      optional: true,
    });
    if (keystones.currentScenePending.length) {
      quests.push({
        cat: '可选',
        text: `当前场景可激活：${keystones.currentScenePending.join('、')}`,
        done: false,
        optional: true,
      });
    }
    // 支线
    if (allVillagersCured) {
      quests.push({ cat: '支线', text: '失语者村落已全员唤醒', done: true });
    }
    for (const qid of this.completedQuests)
      quests.push({ cat: '支线', text: `唤醒失语者：${qid}`, done: true });
    // 收集
    const chars = [...new Set(this.player.collectedCharsAll)];
    if (chars.length)
      quests.push({ cat: '收集', text: `已获汉字碎片：${chars.join('、')}`, done: true });
    // 道德
    quests.push({
      cat: '倾向',
      text: `仁慈 ${k.mercy} · 武力 ${k.violence} · 救助 ${k.saved}`,
      done: false,
    });
    // 刻字
    if (this.engravings.length)
      quests.push({ cat: '刻字', text: `已刻字 ${this.engravings.length} 处`, done: true });
    // 第五章进度
    if (this.flags.chapter5_started) {
      quests.push({ cat: '余烬', text: '第五章：余烬已开启', done: true });
      if (this.flags.shard1_done)
        quests.push({ cat: '余烬', text: '记忆碎片·其一「命名」已获取', done: true });
      if (this.flags.shard2_done)
        quests.push({ cat: '余烬', text: '记忆碎片·其二「保护」已获取', done: true });
      if (this.flags.shard3_done)
        quests.push({ cat: '余烬', text: '记忆碎片·其三「完整」已获取', done: true });
      if (this.flags.chapter5_choice) {
        const choiceNames = { sacrifice: '造物者回响', guardian: '永恒守护', garden: '文字花园' };
        quests.push({
          cat: '余烬',
          text: `终章选择：${choiceNames[this.flags.chapter5_choice] || '已完成'}`,
          done: true,
        });
      }
    }
    // 方知远日记收集进度
    if (this.player.diaries && this.player.diaries.size > 0) {
      quests.push({
        cat: '收集',
        text: `方知远的日记 ${this.player.diaries.size}/6${this.flags.all_diaries ? '（已集齐）' : ''}`,
        done: !!this.flags.all_diaries,
      });
    }
    // 语言种子收集进度
    if (this.player.seeds && this.player.seeds > 0) {
      quests.push({
        cat: '收集',
        text: `语言种子 ${this.player.seeds}/3${this.flags.all_seeds ? '（已集齐）' : ''}`,
        done: !!this.flags.all_seeds,
      });
    }
    return quests;
  }

  _keystoneProgress() {
    let total = 0;
    let activated = 0;
    const currentScenePending = [];
    for (const scene of Object.values(scenes)) {
      for (const it of scene.interactables || []) {
        if (it.type !== 'keystone') continue;
        total++;
        if (this.activatedKeystones.has(it.id)) activated++;
        else if (this.scene && scene.id === this.scene.id)
          currentScenePending.push(it.text || it.label || '要石');
      }
    }
    return { total, activated, currentScenePending };
  }

  _allVillagersCured() {
    return !!this.flags.all_villagers_cured || VILLAGER_CURE_IDS.every((id) => this.completedQuests.has(id));
  }

  _refreshDerivedProgress() {
    this.flags.all_villagers_cured = this._allVillagersCured();
    if (this.clearedEndings && !(this.clearedEndings instanceof Set)) {
      this.clearedEndings = new Set(this.clearedEndings);
    }
  }

  // ============================================
  // 存档系统方法
  // ============================================
  // 快速存档到自动槽
  _quickSave() {
    const ok = autoSave(this);
    if (ok) {
      this._saveFlash = 1500;
      this.showHint('已自动存档（F4）');
      audio.playSfx('save');
    } else {
      this.showHint('存档失败（localStorage 不可用）');
    }
  }

  // 快速读档（自动槽）
  _quickLoad() {
    const snap = loadSnapshot('auto');
    if (!snap) {
      this.showHint('没有可读取的自动存档');
      audio.playSfx('uiCancel');
      return;
    }
    audio.playSfx('load');
    fx.transition(600, () => {
      const ok = restore(this, snap);
      if (ok && this._pendingScene) {
        this.loadScene(this._pendingScene, this._pendingSpawn);
        this._pendingScene = null;
        this._pendingSpawn = null;
        this.showHint('已读取自动存档（F9）');
      }
    });
  }

  // 存档菜单更新
  _updateSaveMenu(dt) {
    const menu = this._saveMenu;
    if (!menu) return;
    // ESC 关闭
    if (input.wasPressed('escape') || input.wasPressed('f6')) {
      this._saveMenu = null;
      audio.playSfx('uiCancel');
      return;
    }
    if (input.wasPressed('arrowleft') || input.wasPressed('arrowright')) {
      this._saveMenu = menu === 'save' ? 'load' : 'save';
      this._saveMenuIdx = 0;
      audio.playSfx('ui');
      return;
    }
    const n = menu === 'load' ? SAVE_SLOTS + 1 : SAVE_SLOTS;
    if (input.wasPressed('arrowup') || input.wasPressed('w'))
      this._saveMenuIdx = (this._saveMenuIdx - 1 + n) % n;
    if (input.wasPressed('arrowdown') || input.wasPressed('s'))
      this._saveMenuIdx = (this._saveMenuIdx + 1) % n;
    this._saveMenuIdx = Math.max(0, Math.min(this._saveMenuIdx, n - 1));

    if (input.wasPressed('delete') || input.wasPressed('backspace')) {
      const slot = menu === 'save' ? this._saveMenuIdx + 1 : this._saveMenuIdx;
      if (slot >= 1 && slot <= SAVE_SLOTS && deleteSaveSlot(slot)) {
        this.showHint(`已删除槽位 ${slot}`);
        audio.playSfx('uiCancel');
      } else {
        this.showHint('这个槽位不能删除或没有存档');
        audio.playSfx('uiCancel');
      }
      return;
    }

    if (input.wasPressed('e') || input.wasPressed('enter')) {
      if (menu === 'save') {
        const slot = this._saveMenuIdx + 1;
        const ok = saveToSlot(this, slot);
        if (ok) {
          this.showHint(`已保存到槽位 ${slot}`);
          audio.playSfx('save');
          this._saveFlash = 1200;
          this._saveMenu = null;
        } else {
          this.showHint('存档失败（localStorage 不可用）');
          audio.playSfx('uiCancel');
        }
      } else {
        const slot = this._saveMenuIdx === 0 ? 'auto' : this._saveMenuIdx;
        const snap = loadSnapshot(slot);
        if (!snap) {
          this.showHint('这个槽位没有存档');
          audio.playSfx('uiCancel');
          return;
        }
        const ok = restore(this, snap);
        if (ok && this._pendingScene) {
          this.loadScene(this._pendingScene, this._pendingSpawn);
          this._pendingScene = null;
          this._pendingSpawn = null;
          this.showHint(`已读取存档（${slot === 'auto' ? '自动' : '槽位 ' + slot}）`);
          audio.playSfx('load');
        }
        this._saveMenu = null;
      }
    }
  }

  // ============================================
  // 体育馆屏幕墙陷阱：靠近屏幕墙时减速 + 持续扣 SAN
  // ============================================
  _updateScreenWallTrap(dt) {
    if (!this.scene || !this.scene.props) {
      this._screenWallSlow = 0;
      this._screenWallSanDrain = 0;
      return;
    }
    // 仅体育馆场景启用屏幕墙陷阱
    if (this.scene.id !== 'stadium') {
      this._screenWallSlow = 0;
      this._screenWallSanDrain = 0;
      return;
    }
    // 检测玩家是否在任意屏幕墙的影响范围内（距墙边 20 像素内）
    let near = false;
    for (const p of this.scene.props) {
      // 屏幕墙的标识：name 包含"屏幕"，或有 type='screen'
      const isScreen = (p.name && String(p.name).includes('屏幕')) || p.type === 'screen';
      if (!isScreen) continue;
      const px = this.player.x,
        py = this.player.y;
      // 矩形扩展检测
      if (px > p.x - 20 && px < p.x + p.w + 20 && py > p.y - 20 && py < p.y + p.h + 20) {
        near = true;
        break;
      }
    }
    if (near) {
      this._screenWallSlow = 200; // 减速持续 200ms（每帧刷新）
      this._screenWallSanDrain = 200;
      // 持续扣 SAN（每秒 4 点，受难度影响）
      const drain = 4 * (dt / 1000) * difficulty.currentMul().sanDamage;
      this.player.san = Math.max(0, this.player.san - drain);
      // SAN 归零触发死亡
      if (this.player.san <= 0 && !this.combat.dead) {
        this._handleScreenWallDeath();
      }
    } else {
      if (this._screenWallSlow > 0) this._screenWallSlow -= dt;
      if (this._screenWallSanDrain > 0) this._screenWallSanDrain -= dt;
    }
  }

  _handleScreenWallDeath() {
    this.combat.dead = true;
    audio.playSfx('death');
    fx.shake(16, 600);
    fx.flash('#cc4444', 0.5, 400);
    this.player.san = this.player.maxSan;
    const respawn = this._nearestKeystoneSpawn();
    if (respawn) {
      this.showHint('屏幕的噪音吞噬了你的理性……在要石旁醒来。');
      this.loadScene(this.scene.id, respawn);
    } else {
      this.showHint('你跌回入口的微光中……');
      this.loadScene(this.scene.id);
    }
    this.combat.dead = false;
  }

  // 供 player.js 查询：当前是否被屏幕墙减速（返回速度倍率）
  getSpeedMul() {
    return this._screenWallSlow > 0 ? 0.5 : 1.0;
  }

  // ============================================
  // 背包面板（I 键）：查看/使用道具
  // ============================================
  _updateInventoryPanel(dt) {
    const items = this.player.inventory;
    if (!items.length) {
      if (input.wasPressed('e') || input.wasPressed('escape') || input.wasPressed('i')) {
        this.uiPanel = null;
        audio.playSfx('uiCancel');
      }
      return;
    }
    if (!this._invSel) this._invSel = 0;
    this._invSel = Math.min(this._invSel, items.length - 1);
    if (input.wasPressed('arrowup') || input.wasPressed('w'))
      this._invSel = (this._invSel - 1 + items.length) % items.length;
    if (input.wasPressed('arrowdown') || input.wasPressed('s'))
      this._invSel = (this._invSel + 1) % items.length;
    if (input.wasPressed('e') || input.wasPressed('enter')) {
      this._useItem(this._invSel);
    }
    if (input.wasPressed('escape') || input.wasPressed('i')) {
      this.uiPanel = null;
      audio.playSfx('uiCancel');
    }
  }

  // 使用道具
  _useItem(idx) {
    const item = this.player.inventory[idx];
    if (!item) return;
    audio.playSfx('uiConfirm');
    if (item.id === 'old_page' || item.id === 'page') {
      // 旧书页：恢复 30 SAN
      const heal = Math.min(30, this.player.maxSan - this.player.san);
      this.player.san = Math.min(this.player.maxSan, this.player.san + 30);
      this.player.inventory.splice(idx, 1);
      this.showHint(`使用旧书页，理性 +${heal}`);
      fx.flash('#ffd866', 0.3, 300);
    } else if (item.id === 'knife') {
      this.showHint('记忆合金小刀：战斗中用来刻字/攻击，无需消耗。');
    } else if (item.id === 'poem_guanju') {
      this.showHint('《关雎》诗页：已收录，作为武器使用。');
    } else {
      this.showHint(`${item.name || '道具'}：暂无使用效果。`);
    }
  }

  // 获取背包数据（供 render.js 绘制）
  getInventoryData() {
    const keystones = this._keystoneProgress();
    return {
      items: this.player.inventory.map((it, i) => ({
        ...it,
        selected: i === (this._invSel || 0),
      })),
      san: this.player.san,
      maxSan: this.player.maxSan,
      chars: [...new Set(this.player.collectedCharsAll)],
      diaries: this.player.diaries ? this.player.diaries.size : 0,
      seeds: this.player.seeds || 0,
      keystones,
    };
  }

  // ============================================
  // NPC 游荡行为：失语者小范围随机移动
  // ============================================
  _updateNpcWander(dt) {
    if (!this.scene || !this.scene.interactables) return;
    for (const it of this.scene.interactables) {
      // 仅对 cure（失语者）添加游荡；dialog 类型多为静态物体（告示/轿车/书架等），不游荡
      if (it.type !== 'cure') continue;
      // 已完成治愈的 cure NPC 不再游荡
      if (this.completedQuests.has(it.id)) continue;
      // 初始化游荡状态
      if (it._wander === undefined) {
        it._wander = {
          homeX: it.x,
          homeY: it.y, // 原点
          tx: it.x,
          ty: it.y, // 目标点
          timer: Math.random() * 3000, // 下次决策计时
          phase: Math.random() * 6, // 行走动画相位
        };
      }
      const w = it._wander;
      w.timer -= dt;
      if (w.timer <= 0) {
        // 选择新目标点（原点 40 像素半径内）
        const ang = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 30;
        w.tx = w.homeX + Math.cos(ang) * dist;
        w.ty = w.homeY + Math.sin(ang) * dist;
        w.timer = 2000 + Math.random() * 4000; // 停留 2-6 秒
      }
      // 向目标点缓慢移动
      const dx = w.tx - it.x,
        dy = w.ty - it.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const sp = 0.3 * (dt / 16);
        it.x += (dx / d) * sp;
        it.y += (dy / d) * sp;
        w.phase += dt * 0.01;
      }
    }
  }
}

Object.assign(
  Game.prototype,
  interactMethods,
  engraveMethods,
  dialogMethods,
  utteranceMethods,
  onboardingMethods
);
