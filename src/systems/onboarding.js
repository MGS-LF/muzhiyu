// 独立梦境教学：残缺留言 → 拾字补句 → 三重回声 → 选择 → 要石 → 醒来
import { DIALOGS } from '../data/dialogs.js';
import * as fx from '../fx.js';
import { generateDreamNarrationPack } from '../ai/director.js';

export const DREAM_SCENE_ID = 'dream_tutorial';

const DREAM_ENEMY_IDS = ['dream_geng_1', 'dream_geng_2', 'dream_geng_3'];
const DREAM_ITEM_PREFIX = 'dream_';
const NEED_CHARS = ['言', '语'];

function startDreamNarration(game) {
  const runtime = { pack: null };
  game._dreamNarrationRuntime = runtime;
  generateDreamNarrationPack().then((pack) => {
    if (game._dreamNarrationRuntime === runtime) runtime.pack = pack;
  });
}

function dreamNarration(game, key, fallback) {
  const generated = game._dreamNarrationRuntime?.pack?.[key];
  if (!generated?.length) return fallback;
  // 操作说明始终来自静态脚本，LLM 只替换剧情回响。
  const instructions = (fallback || []).filter(
    (line) => line?.s === '系统' && /^（.*）$/.test(String(line.t || '').trim())
  );
  return [...generated, ...instructions];
}

// 门洞封板：与 scenes.js 隔断对齐（y 200–310）
const DOOR_SEALS = {
  a: { x: 400, y: 200, w: 12, h: 110, id: 'dream_seal_a' },
  b: { x: 800, y: 200, w: 12, h: 110, id: 'dream_seal_b' },
  c: { x: 1200, y: 200, w: 12, h: 110, id: 'dream_seal_c' },
  d: { x: 1700, y: 200, w: 12, h: 110, id: 'dream_seal_d' },
  e: { x: 2100, y: 200, w: 12, h: 110, id: 'dream_seal_e' },
};

// wall1 → collect → wall3 → battle → wall4/keystone → wall5 → wake
const STEPS = [
  'intro',
  'wall1',
  'collect',
  'wall3',
  'battle',
  'wall4',
  'wall5',
  'wake_gate',
  'done',
];

function hasChar(game, c) {
  return (game.player.collectedCharsAll || []).includes(c);
}

function allChars(game) {
  return NEED_CHARS.every((c) => hasChar(game, c));
}

function defeatedCount(game) {
  return DREAM_ENEMY_IDS.filter((id) => game.defeatedEnemies.has(id)).length;
}

export const methods = {
  beginDreamOnboarding({ skipStory = false } = {}) {
    if (this.flags.onboarding_all_done || this.flags.onboarding_skipped) {
      this._enterRealGameAfterOnboarding();
      return;
    }
    if (this.flags._in_dream_onboarding && this.scene?.id === DREAM_SCENE_ID) return;

    if (this.flags.new_game_plus && !this.flags.onboarding_force) {
      this.flags.onboarding_skipped = true;
      this.flags.onboarding_all_done = true;
      this._enterRealGameAfterOnboarding();
      return;
    }

    this.tutorial = null;
    this.flags.wake_done = true;
    this.flags._in_dream_onboarding = true;
    this.flags.onboarding_step = 'intro';
    this.flags.onboarding_dream_done = false;
    this.flags.onboarding_wall1 = false;
    this.flags.onboarding_wall2 = false;
    this.flags.onboarding_wall3 = false;
    this.flags.onboarding_wall4 = false;
    this.flags.onboarding_wall5 = false;
    this.flags.onboarding_keystone = false;
    this.flags.onboarding_pickup_done = false;
    this.flags.onboarding_battle_done = false;
    this.flags.onboarding_battle_intro_done = false;
    this.flags.onboarding_chose_mercy = false;
    this.flags.onboarding_chose_violence = false;
    this.flags.onboarding_doors = { a: false, b: false, c: false, d: false, e: false };
    startDreamNarration(this);

    this._dreamSnapshot = {
      chars: this.player.collectedChars.slice(),
      charsAll: this.player.collectedCharsAll.slice(),
      san: this.player.san,
      maxSan: this.player.maxSan,
      hasClothes: !!this.player.hasClothes,
      inventory: this.player.inventory.slice(),
      karma: { ...(this.karma || {}) },
    };

    this.player.collectedChars = [];
    this.player.collectedCharsAll = [];
    this.player.hasClothes = true;
    this.player.san = this.player.maxSan;
    // 教学中可演示慈悲/残忍，结束后恢复
    this.karma = { mercy: 0, violence: 0, saved: 0 };
    this.defeatedEnemies = new Set(
      [...this.defeatedEnemies].filter((id) => !DREAM_ENEMY_IDS.includes(id))
    );
    for (const id of [...this.collected]) {
      if (String(id).startsWith(DREAM_ITEM_PREFIX)) this.collected.delete(id);
    }

    this.loadScene(DREAM_SCENE_ID);
    this._dreamApplyWorld();
    this._dreamRefreshObjective();

    if (skipStory) {
      this.flags.onboarding_dream_done = true;
      this._dreamSetStep('wall1');
      return;
    }

    setTimeout(() => {
      if (!this.flags._in_dream_onboarding || this.scene?.id !== DREAM_SCENE_ID) return;
      this.startDialog(DIALOGS.onboarding_dream, '', () => {
        if (this._pendingSkipOnboarding || this.flags.onboarding_skip_choice) {
          this._pendingSkipOnboarding = false;
          this.skipDreamOnboarding();
          return;
        }
        this.flags.onboarding_dream_done = true;
        this._dreamSetStep('wall1');
      });
    }, 220);
  },

  skipDreamOnboarding() {
    this.flags.onboarding_skipped = true;
    this.flags.onboarding_all_done = true;
    this.flags._in_dream_onboarding = false;
    this.flags.onboarding_step = 'done';
    this._cleanupDreamProgress();
    this._enterRealGameAfterOnboarding();
    this.showHint('已跳过梦境。左上角目标会指引你。', 'warn');
  },

  completeDreamOnboarding() {
    if (!this.flags._in_dream_onboarding && this.scene?.id !== DREAM_SCENE_ID) return;
    const mercy = !!this.flags.onboarding_chose_mercy;
    const wakeLines = dreamNarration(
      this,
      mercy ? 'wakeMercy' : 'wakeViolence',
      DIALOGS.onboarding_wake
    );
    this.flags.onboarding_all_done = true;
    this.flags._in_dream_onboarding = false;
    this.flags.onboarding_step = 'done';
    this._cleanupDreamProgress();
    this._enterRealGameAfterOnboarding();
    this.startDialog(wakeLines, '', () => {
      this.showHint('先换衣服，再离开冷冻中心。慈悲与残忍会跟着你。', 'success');
    });
  },

  _enterRealGameAfterOnboarding() {
    this.tutorial = null;
    this.flags.wake_done = true;
    this.loadScene('freeze_center');
    this.objective = {
      text: '换上衣服，离开冷冻中心',
      done: false,
      target: { x: 642, y: 448 },
    };
  },

  _cleanupDreamProgress() {
    this._dreamNarrationRuntime = null;
    if (this._dreamSnapshot) {
      this.player.collectedChars = this._dreamSnapshot.chars.slice();
      this.player.collectedCharsAll = this._dreamSnapshot.charsAll.slice();
      this.player.san = this._dreamSnapshot.san;
      this.player.maxSan = this._dreamSnapshot.maxSan;
      this.player.hasClothes = this._dreamSnapshot.hasClothes;
      this.player.inventory = this._dreamSnapshot.inventory.slice();
      if (this._dreamSnapshot.karma) this.karma = { ...this._dreamSnapshot.karma };
      this._dreamSnapshot = null;
    } else {
      this.player.collectedChars = [];
      this.player.collectedCharsAll = [];
      this.player.hasClothes = false;
    }
    for (const id of DREAM_ENEMY_IDS) this.defeatedEnemies.delete(id);
    for (const id of [...this.collected]) {
      if (String(id).startsWith(DREAM_ITEM_PREFIX)) this.collected.delete(id);
    }
    this.visitedScenes.delete(DREAM_SCENE_ID);
    this.activatedKeystones.delete('dream_keystone');
  },

  isDreamOnboarding() {
    return !!(this.flags._in_dream_onboarding || this.scene?.id === DREAM_SCENE_ID);
  },

  _dreamStep() {
    return this.flags.onboarding_step || 'intro';
  },

  _dreamSetStep(step) {
    if (!STEPS.includes(step)) return;
    this.flags.onboarding_step = step;
    this._dreamApplyWorld();
    this._dreamRefreshObjective();
  },

  _dreamApplyWorld() {
    if (!this.scene || this.scene.id !== DREAM_SCENE_ID) return;
    const step = this._dreamStep();
    const doors = this.flags.onboarding_doors || {
      a: false,
      b: false,
      c: false,
      d: false,
      e: false,
    };

    // 逐步开门（注意：开门条件要比「到达该房间」略宽，避免卡在门外）
    if (['collect', 'wall3', 'battle', 'wall4', 'wall5', 'wake_gate'].includes(step)) doors.a = true;
    // 字齐后即可进「三战场」墙；不必等 step 先变成 wall3
    if (
      ['wall3', 'battle', 'wall4', 'wall5', 'wake_gate'].includes(step) ||
      this.flags.onboarding_pickup_done ||
      allChars(this)
    )
      doors.b = true;
    if (['battle', 'wall4', 'wall5', 'wake_gate'].includes(step) || this.flags.onboarding_wall3)
      doors.c = true;
    if (
      (['wall4', 'wall5', 'wake_gate'].includes(step) && this.flags.onboarding_battle_done) ||
      this.flags.onboarding_battle_done
    )
      doors.d = true;
    if (
      (['wall5', 'wake_gate'].includes(step) && this.flags.onboarding_wall4) ||
      this.flags.onboarding_keystone ||
      this.flags.onboarding_wall5
    )
      doors.e = true;
    if (step === 'wake_gate' && this.flags.onboarding_wall5) doors.e = true;
    this.flags.onboarding_doors = doors;

    this.scene.walls = (this.scene.walls || []).filter(
      (w) => !String(w.id || '').startsWith('dream_seal_')
    );
    for (const [key, seal] of Object.entries(DOOR_SEALS)) {
      if (!doors[key]) this.scene.walls.push({ ...seal });
    }

    // 拾字区
    if (['collect', 'wall3', 'battle', 'wall4', 'wall5', 'wake_gate'].includes(step)) {
      if (!this.scene.items.some((i) => i.id === 'dream_char_yan')) {
        this.scene.items.push(
          { id: 'dream_char_yan', x: 560, y: 220, type: 'char_fragment', char: '言' },
          { id: 'dream_char_yu', x: 700, y: 320, type: 'char_fragment', char: '语' }
        );
      }
    }

    // 同一个回声的三种形态。每次只出现下一形态，保证教学顺序固定且清楚。
    const spawnBattle = ['battle', 'wall4', 'wall5', 'wake_gate'].includes(step);
    if (spawnBattle) {
      const specs = [
        {
          id: 'dream_geng_1',
          x: 1340,
          y: 250,
          name: '回声·弹幕',
          forceCombat: 'ut',
          utTutorial: true,
        },
        { id: 'dream_geng_2', x: 1450, y: 270, name: '回声·言锋', forceCombat: 'slash' },
        {
          id: 'dream_geng_3',
          x: 1560,
          y: 250,
          name: '回声·噪声核',
          forceCombat: 'hack',
          hackOpts: {
            finishAfterLayer: 1,
            title: '骇入教学·第一层',
            subtitle: '击破三个噪声节点即可退出',
          },
        },
      ];
      const next = specs.find((s) => !this.defeatedEnemies.has(s.id));
      if (next && !(this.scene.enemies || []).some((e) => e.id === next.id)) {
        const s = next;
        this.scene.enemies.push({
          id: s.id,
          typeId: 'geng_weak',
          name: s.name,
          forceCombat: s.forceCombat,
          utTutorial: s.utTutorial,
          hackOpts: s.hackOpts,
          x: s.x,
          y: s.y,
          hp: 16,
          maxHp: 16,
          floating: 0,
          walkPhase: 0,
          dir: -1,
          vx: -0.35,
          vy: 0,
          onGround: true,
          homeX: s.x,
          range: 45,
          stompCD: 0,
        });
      }
    }

    const wake = this.scene.interactables.find((i) => i.id === 'dream_wake');
    if (wake) wake._hidden = step !== 'wake_gate';
  },

  _dreamRefreshObjective() {
    if (!this.scene || this.scene.id !== DREAM_SCENE_ID) return;
    const step = this._dreamStep();
    const it = (id) => this.scene.interactables.find((i) => i.id === id);
    const nearestChar = () => {
      let best = null,
        bd = Infinity;
      for (const item of this.scene.items || []) {
        if (this.collected.has(item.id)) continue;
        if (item.type === 'char_fragment' && NEED_CHARS.includes(item.char)) {
          const d = Math.hypot(item.x - this.player.x, item.y - this.player.y);
          if (d < bd) {
            bd = d;
            best = item;
          }
        }
      }
      return best;
    };
    const nearestEnemy = () => {
      for (const id of DREAM_ENEMY_IDS) {
        if (this.defeatedEnemies.has(id)) continue;
        const e = (this.scene.enemies || []).find((x) => x.id === id);
        if (e) return e;
      }
      return null;
    };

    if (step === 'intro' || step === 'wall1') {
      const w = it('dream_wall_1');
      this.objective = {
        text: '靠近破损的旧广播，按 E 调查',
        done: false,
        target: w ? { x: w.x, y: w.y } : { x: 220, y: 180 },
        progress: null,
      };
      return;
    }
    if (step === 'collect') {
      if (!this.flags.onboarding_wall2) {
        const w = it('dream_wall_2');
        this.objective = {
          text: '调查广播旁残缺的留言',
          done: false,
          target: w ? { x: w.x, y: w.y } : { x: 600, y: 180 },
          progress: null,
        };
        return;
      }
      this.objective = {
        text: '拾取发光的字：言、语',
        done: false,
        target: nearestChar()
          ? { x: nearestChar().x, y: nearestChar().y }
          : { x: 630, y: 250 },
        progress: {
          title: '梦境·句子',
          chars: NEED_CHARS.map((c) => ({ c, have: hasChar(this, c) })),
        },
      };
      return;
    }
    if (step === 'wall3') {
      const w = it('dream_wall_3');
      this.objective = {
        text: '把「言」「语」带到留言前',
        done: false,
        target: w ? { x: w.x, y: w.y } : { x: 1000, y: 180 },
        progress: null,
      };
      return;
    }
    if (step === 'battle') {
      const e = nearestEnemy();
      const n = defeatedCount(this);
      const names = ['弹幕形态', '言锋形态', '骇入形态'];
      this.objective = {
        text: n >= 3 ? '决定如何处理失去反抗的回声' : `穿过三重回声：${names[n]}（${n}/3）`,
        done: false,
        target: e ? { x: e.x, y: e.y } : { x: 1400, y: 260 },
        progress: null,
      };
      return;
    }
    if (step === 'wall4') {
      if (!this.flags.onboarding_wall4) {
        const w = it('dream_wall_4');
        this.objective = {
          text: '阅读要石上的刻痕',
          done: false,
          target: w ? { x: w.x, y: w.y } : { x: 1450, y: 180 },
          progress: null,
        };
        return;
      }
      if (!this.flags.onboarding_keystone) {
        const k = it('dream_keystone');
        this.objective = {
          text: '靠近要石，按 E 激活/刻字',
          done: false,
          target: k ? { x: k.x, y: k.y } : { x: 1550, y: 300 },
          progress: null,
        };
        return;
      }
      this.objective = {
        text: '继续向前，寻找最后的广播',
        done: false,
        target: { x: 1900, y: 180 },
        progress: null,
      };
      return;
    }
    if (step === 'wall5') {
      const w = it('dream_wall_5');
      this.objective = {
        text: '听完最后一段广播',
        done: false,
        target: w ? { x: w.x, y: w.y } : { x: 1900, y: 180 },
        progress: null,
      };
      return;
    }
    if (step === 'wake_gate') {
      const wake = it('dream_wake');
      this.objective = {
        text: '走向金色裂隙，带着「记得」醒来',
        done: false,
        target: wake ? { x: wake.x, y: wake.y } : { x: 2400, y: 260 },
        progress: null,
      };
    }
  },

  notifyOnboarding(event, detail = {}) {
    if (!this.isDreamOnboarding() || this.scene?.id !== DREAM_SCENE_ID) return;
    const step = this._dreamStep();

    if (event === 'wall_read') {
      const id = detail.wallId;
      if (id === 1 && (step === 'wall1' || step === 'intro')) {
        this.flags.onboarding_wall1 = true;
        this._dreamSetStep('collect');
        this.showHint('下一面墙会教你如何把碎字捡回来。', 'info');
        return;
      }
      if (id === 2 && step === 'collect') {
        this.flags.onboarding_wall2 = true;
        this._dreamRefreshObjective();
        this.showHint('拾取地上发光的「言」「语」。', 'info');
        return;
      }
      if (id === 3 && step === 'wall3') {
        this.flags.onboarding_wall3 = true;
        this._dreamSetStep('battle');
        this.showHint('回声分成三种形态。先靠近弹幕形态。', 'info');
        return;
      }
      if (id === 4 && (step === 'wall4' || step === 'battle')) {
        this.flags.onboarding_wall4 = true;
        this._dreamSetStep('wall4');
        this._dreamRefreshObjective();
        this.showHint('去触摸那块发光的要石。', 'info');
        return;
      }
      if (id === 5 && (step === 'wall5' || step === 'wall4')) {
        this.flags.onboarding_wall5 = true;
        this._dreamSetStep('wake_gate');
        fx.flash('#ffd866', 0.35, 400);
        this.showHint('慈悲与残忍已写在你身上。裂隙开了。', 'success');
        return;
      }
      return;
    }

    if (event === 'keystone') {
      this.flags.onboarding_keystone = true;
      this.activatedKeystones.add('dream_keystone');
      if (step === 'wall4') {
        const mercy = !!this.flags.onboarding_chose_mercy;
        const lines = dreamNarration(
          this,
          mercy ? 'keystoneMercy' : 'keystoneViolence',
          DIALOGS.onboarding_keystone || []
        );
        this.startDialog(lines, '要石', () => {
          this._dreamSetStep('wall5');
          this.showHint('最后一面墙：慈悲与残忍。', 'info');
        });
      }
      return;
    }

    if (event === 'pickup_char') {
      if (step !== 'collect') return;
      this._dreamRefreshObjective();
      if (allChars(this)) {
        this.flags.onboarding_pickup_done = true;
        this._dreamSetStep('wall3');
        this.showHint('字齐了。去把「言」「语」带到留言前。', 'success');
        fx.flash('#ffd866', 0.25, 280);
      } else {
        this.showHint(`获得「${detail.char || ''}」。还差另一枚。`, 'info');
      }
      return;
    }

    if (event === 'door_blocked') {
      const door = detail.door;
      if (door === 'a' && (step === 'intro' || step === 'wall1')) {
        this.showHint('先靠近破损的旧广播，按 E 调查。', 'warn');
      } else if (door === 'b' && step === 'collect') {
        this.showHint('先调查广播旁残缺的留言，或捡齐「言」「语」。', 'warn');
      } else if (door === 'c' && step === 'wall3') {
        this.showHint('先把「言」「语」带到留言前读完。', 'warn');
      } else if (door === 'd' && step === 'battle') {
        this.showHint('先与至少一只梗鬼交手。', 'warn');
      } else if (door === 'e') {
        this.showHint('先调查要石与最后的广播。', 'warn');
      } else {
        this.showHint('还不是时候。', 'warn');
      }
      this._dreamRefreshObjective();
      return;
    }

    if (event === 'battle_end') {
      const { result, enemy } = detail;
      if (!enemy || !DREAM_ENEMY_IDS.includes(enemy.id)) return;
      if (step !== 'battle' && step !== 'wall4') return;

      const n = defeatedCount(this);
      if (n < DREAM_ENEMY_IDS.length) {
        this._dreamApplyWorld();
        this._dreamRefreshObjective();
        const nextName = n === 1 ? '言锋形态：墨刃无限，记忆字会强化攻击。' : '骇入形态：击破噪声节点并保持移动。';
        this.showHint(result === 'lose' ? `梦境托住了你。继续：${nextName}` : `形态破裂。下一重：${nextName}`, result === 'lose' ? 'warn' : 'success');
        return;
      }

      if (this.flags.onboarding_battle_done) return;
      this.flags.onboarding_battle_done = true;
      this.startDialog(DIALOGS.onboarding_after_menu || [], '', () => {
        const mercy = !!this.flags.onboarding_chose_mercy;
        const fallback = mercy ? DIALOGS.onboarding_after_mercy : DIALOGS.onboarding_after_violence;
        const aftermath = dreamNarration(this, mercy ? 'afterMercy' : 'afterViolence', fallback);
        this.startDialog(aftermath || [], '', () => this._dreamSetStep('wall4'));
      });
      return;
    }

    if (event === 'skip_request') {
      this.skipDreamOnboarding();
    }
  },
};
