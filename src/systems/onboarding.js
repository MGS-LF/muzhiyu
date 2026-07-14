// 独立梦境教学：线性走廊（传说之下式），结束后清空进度送回冷冻中心
import { DIALOGS } from '../data/dialogs.js';
import * as fx from '../fx.js';

export const DREAM_SCENE_ID = 'dream_tutorial';

const DREAM_ENEMY_IDS = ['dream_geng_normal', 'dream_geng_hack'];
const DREAM_ITEM_PREFIX = 'dream_';
const NEED_CHARS = ['言', '语'];

// 门洞封板：与 scenes.js 隔断门洞对齐（y 200–310）
const DOOR_SEALS = {
  a: { x: 480, y: 200, w: 12, h: 110, id: 'dream_seal_a' },
  b: { x: 980, y: 200, w: 12, h: 110, id: 'dream_seal_b' },
  c: { x: 1480, y: 200, w: 12, h: 110, id: 'dream_seal_c' },
};

const STEPS = ['intro', 'phone', 'collect', 'battle_menu', 'battle_hack', 'wake_gate', 'done'];

function hasChar(game, c) {
  return (game.player.collectedCharsAll || []).includes(c);
}

function allChars(game) {
  return NEED_CHARS.every((c) => hasChar(game, c));
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
    this.flags.onboarding_move_done = false;
    this.flags.onboarding_pickup_done = false;
    this.flags.onboarding_gate_taught = false;
    this.flags.onboarding_battle_done = false;
    this.flags.onboarding_hack_done = false;
    this.flags.onboarding_battle_intro_done = false;
    this.flags.onboarding_hack_intro_done = false;
    this.flags.onboarding_doors = { a: false, b: false, c: false };

    this._dreamSnapshot = {
      chars: this.player.collectedChars.slice(),
      charsAll: this.player.collectedCharsAll.slice(),
      san: this.player.san,
      maxSan: this.player.maxSan,
      hasClothes: !!this.player.hasClothes,
      inventory: this.player.inventory.slice(),
    };

    this.player.collectedChars = [];
    this.player.collectedCharsAll = [];
    this.player.hasClothes = true;
    this.player.san = this.player.maxSan;
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
      this._dreamSetStep('phone');
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
        this._dreamSetStep('phone');
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
    this.flags.onboarding_all_done = true;
    this.flags._in_dream_onboarding = false;
    this.flags.onboarding_step = 'done';
    this._cleanupDreamProgress();
    this._enterRealGameAfterOnboarding();
    this.startDialog(DIALOGS.onboarding_wake, '', () => {
      this.showHint('先换衣服，再离开冷冻中心。', 'success');
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
    if (this._dreamSnapshot) {
      this.player.collectedChars = this._dreamSnapshot.chars.slice();
      this.player.collectedCharsAll = this._dreamSnapshot.charsAll.slice();
      this.player.san = this._dreamSnapshot.san;
      this.player.maxSan = this._dreamSnapshot.maxSan;
      this.player.hasClothes = this._dreamSnapshot.hasClothes;
      this.player.inventory = this._dreamSnapshot.inventory.slice();
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

  /** 按步骤：封门、刷字、刷怪、裂隙 */
  _dreamApplyWorld() {
    if (!this.scene || this.scene.id !== DREAM_SCENE_ID) return;
    const step = this._dreamStep();
    const doors = this.flags.onboarding_doors || { a: false, b: false, c: false };

    // 步骤解锁门
    if (step === 'collect' || step === 'battle_menu' || step === 'battle_hack' || step === 'wake_gate') {
      doors.a = true;
    }
    if (step === 'battle_menu' || step === 'battle_hack' || step === 'wake_gate') {
      doors.b = true;
    }
    if (step === 'battle_hack' || step === 'wake_gate') {
      doors.c = true;
    }
    this.flags.onboarding_doors = doors;

    // 动态封板
    this.scene.walls = (this.scene.walls || []).filter((w) => !String(w.id || '').startsWith('dream_seal_'));
    for (const [key, seal] of Object.entries(DOOR_SEALS)) {
      if (!doors[key]) {
        this.scene.walls.push({ ...seal });
      }
    }

    // R1 碎片：phone 完成后出现
    if (step === 'collect' || step === 'battle_menu' || step === 'battle_hack' || step === 'wake_gate') {
      if (!this.scene.items.some((i) => i.id === 'dream_char_yan')) {
        this.scene.items.push(
          { id: 'dream_char_yan', x: 620, y: 200, type: 'char_fragment', char: '言' },
          { id: 'dream_char_yu', x: 820, y: 340, type: 'char_fragment', char: '语' }
        );
      }
    }

    // 常规怪：仅 battle_menu 起
    const hasNormal = (this.scene.enemies || []).some((e) => e.id === 'dream_geng_normal');
    if ((step === 'battle_menu' || step === 'battle_hack' || step === 'wake_gate') && !hasNormal) {
      if (!this.defeatedEnemies.has('dream_geng_normal')) {
        this.scene.enemies.push({
          id: 'dream_geng_normal',
          typeId: 'geng_weak',
          name: '弱梗鬼',
          x: 1220,
          y: 260,
          hp: 16,
          maxHp: 16,
          floating: 0,
          walkPhase: 0,
          dir: -1,
          vx: -0.4,
          vy: 0,
          onGround: true,
          homeX: 1220,
          range: 50,
          stompCD: 0,
        });
      }
    }

    // 黑客怪：仅 battle_hack 起
    const hasHack = (this.scene.enemies || []).some((e) => e.id === 'dream_geng_hack');
    if ((step === 'battle_hack' || step === 'wake_gate') && !hasHack) {
      if (!this.defeatedEnemies.has('dream_geng_hack')) {
        this.scene.enemies.push({
          id: 'dream_geng_hack',
          typeId: 'geng_weak',
          name: '噪声核',
          x: 1680,
          y: 260,
          hp: 20,
          maxHp: 20,
          combat: 'hack',
          hackTrial: true,
          hackOpts: {
            title: '言锋·梦境',
            subtitle: '在噪声里保住句子',
            layerMax: 1,
            startLayer: 0,
            shortRoute: true,
            hpMul: 0.5,
            spdMul: 0.7,
            dmgMul: 0.5,
            bossName: '噪声核',
          },
          floating: 0,
          walkPhase: 0,
          dir: -1,
          vx: -0.35,
          vy: 0,
          onGround: true,
          homeX: 1680,
          range: 40,
          stompCD: 0,
        });
      }
    }

    // 裂隙：仅 wake_gate
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
    const enemy = (id) => (this.scene.enemies || []).find((e) => e.id === id);

    if (step === 'intro' || step === 'phone') {
      const phone = it('dream_phone');
      this.objective = {
        text: '靠近发光的手机，按 E',
        done: false,
        target: phone ? { x: phone.x, y: phone.y } : null,
        progress: null,
      };
      return;
    }

    if (step === 'collect') {
      this.objective = {
        text: '拾取发光的字：言、语',
        done: false,
        target: nearestChar() ? { x: nearestChar().x, y: nearestChar().y } : { x: 986, y: 255 },
        progress: {
          title: '梦境·句子',
          chars: NEED_CHARS.map((c) => ({ c, have: hasChar(this, c) })),
        },
      };
      return;
    }

    if (step === 'battle_menu') {
      const e = enemy('dream_geng_normal');
      this.objective = {
        text: '靠近绿色梗鬼',
        done: false,
        target: e ? { x: e.x, y: e.y } : { x: 1220, y: 260 },
        progress: null,
      };
      return;
    }

    if (step === 'battle_hack') {
      const e = enemy('dream_geng_hack');
      this.objective = {
        text: '靠近噪声终端',
        done: false,
        target: e ? { x: e.x, y: e.y } : { x: 1680, y: 260 },
        progress: null,
      };
      return;
    }

    if (step === 'wake_gate') {
      const wake = it('dream_wake');
      this.objective = {
        text: '走向金色裂隙，醒来',
        done: false,
        target: wake ? { x: wake.x, y: wake.y } : { x: 1850, y: 260 },
        progress: null,
      };
    }
  },

  /** 线性事件推进 */
  notifyOnboarding(event, detail = {}) {
    if (!this.isDreamOnboarding() || this.scene?.id !== DREAM_SCENE_ID) return;
    const step = this._dreamStep();

    if (event === 'phone_ghost') {
      if (step !== 'phone' && step !== 'intro') return;
      this.flags.onboarding_move_done = true;
      this._dreamSetStep('collect');
      this.showHint('地上有碎掉的字。靠近，按 E 拾取。', 'info');
      return;
    }

    if (event === 'pickup_char') {
      if (step !== 'collect') return;
      this._dreamRefreshObjective();
      if (allChars(this)) {
        this.flags.onboarding_pickup_done = true;
        this.flags.onboarding_gate_taught = true;
        this._dreamSetStep('battle_menu');
        this.showHint('绿雾退了……前面有东西在动。', 'success');
        fx.flash('#ffd866', 0.25, 280);
      } else {
        this.showHint(`获得「${detail.char || ''}」。还差另一枚。`, 'info');
      }
      return;
    }

    if (event === 'door_blocked') {
      const door = detail.door;
      if (door === 'b' && step === 'collect') {
        this.showHint('还缺字。先拾取地上发光的「言」「语」。', 'warn');
        this._dreamRefreshObjective();
      } else if (door === 'a' && (step === 'intro' || step === 'phone')) {
        this.showHint('先看看那部发光的手机。', 'warn');
      } else if (door === 'c' && step === 'battle_menu') {
        this.showHint('先解决这只绿影。', 'warn');
      } else {
        this.showHint('还不是时候。', 'warn');
      }
      return;
    }

    if (event === 'door_open') {
      // 走过已开的门时轻微提示即可
      return;
    }

    if (event === 'battle_end') {
      const { result, enemy } = detail;
      if (enemy?.id === 'dream_geng_normal' && step === 'battle_menu') {
        this.flags.onboarding_battle_done = true;
        // 败：弱化提示后仍推进，避免卡死
        if (result === 'lose') {
          this.showHint('梦里倒下了……不过门开了。再往前。', 'warn');
        } else {
          this.showHint('完整的句子，它会怕。', 'success');
        }
        this.startDialog(DIALOGS.onboarding_after_menu || [], '', () => {
          this._dreamSetStep('battle_hack');
        });
        return;
      }
      if (enemy?.id === 'dream_geng_hack' && step === 'battle_hack') {
        this.flags.onboarding_hack_done = true;
        if (result === 'lose') {
          this.showHint('噪声散了一点。裂隙开了。', 'warn');
        } else {
          this.showHint('两种战场，都见过了。', 'success');
        }
        fx.flash('#ffd866', 0.35, 400);
        this.startDialog(DIALOGS.onboarding_after_hack || [], '', () => {
          this._dreamSetStep('wake_gate');
        });
      }
      return;
    }

    if (event === 'skip_request') {
      this.skipDreamOnboarding();
    }
  },
};
