import { FEATURES, UTTERANCE } from '../config.js';
import { input } from '../input.js';
import * as audio from '../audio.js';
import * as fx from '../fx.js';
import { DIALOGS } from '../data/dialogs.js';
import {
  uniqueCharsFrom,
  matchBlanks,
  matchRequired,
  getBlanks,
  parseClozePrompt,
  findNearestPurifyTarget,
  buildPool,
} from './utterance_logic.js';

export {
  uniqueCharsFrom,
  matchBlanks,
  matchRequired,
  getBlanks,
  parseClozePrompt,
  findNearestPurifyTarget,
  buildPool,
};

export const methods = {
  openUtterance() {
    if (!FEATURES.utterance) return;
    if (
      this.utteranceState ||
      this.battle ||
      this.dialogState ||
      this.compose ||
      this.engraveState ||
      this.converse ||
      this.aiThinking ||
      this.uiPanel ||
      this._saveMenu ||
      this.level3d ||
      this.sidescroll
    )
      return;

    const target = findNearestPurifyTarget(this, UTTERANCE.range);
    if (!target) {
      this.showHint('靠近招牌或失语者，再按 F 补全诗句/成语');
      return;
    }

    const all = this.player.collectedCharsAll || [];
    const ammo = this.player.collectedChars || [];
    const collected = all.length ? all : ammo;
    const blanks = getBlanks(target);
    const pool = buildPool(collected, target);

    if (!pool.length) {
      this.showHint('还没有可填的字……先去捡发光的汉字碎片');
      return;
    }

    const missingOwned = blanks.filter((c) => !collected.includes(c));
    if (missingOwned.length) {
      this.showHint(
        `还缺字：${missingOwned.map((c) => '「' + c + '」').join('')}——先在附近捡齐再补全`
      );
      // 仍允许打开，便于看题；释放时会再拦
    }

    const cloze = parseClozePrompt(target.prompt || target.cloze || '', blanks);
    this.utteranceState = {
      mode: 'cloze',
      slots: blanks.map(() => null),
      pool: [...pool],
      sel: 0,
      blankSel: 0,
      target,
      blanks,
      cloze,
      title: target.poemTitle || target.idiomTitle || '补全',
      message: null,
    };
    audio.playSfx('ui');
  },

  closeUtterance() {
    this.utteranceState = null;
  },

  updateUtterance(dt) {
    const u = this.utteranceState;
    if (!u) return;

    if (input.wasPressed('escape') || input.wasPressed(UTTERANCE.key)) {
      this.closeUtterance();
      return;
    }

    // 空格位选择：Q/E 不占用；用 [ ] 或 1-9；简化：Tab 切换空位
    if (input.wasPressed('tab')) {
      const n = u.slots.length || 1;
      u.blankSel = ((u.blankSel || 0) + 1) % n;
      audio.playSfx('ui');
    }

    const nOpts = u.pool.length + 1;
    if (
      input.wasPressed('arrowleft') ||
      input.wasPressed('a') ||
      input.wasPressed('arrowup') ||
      input.wasPressed('w')
    ) {
      u.sel = (u.sel - 1 + nOpts) % nOpts;
      audio.playSfx('ui');
    }
    if (
      input.wasPressed('arrowright') ||
      input.wasPressed('d') ||
      input.wasPressed('arrowdown') ||
      input.wasPressed('s')
    ) {
      u.sel = (u.sel + 1) % nOpts;
      audio.playSfx('ui');
    }

    if (input.wasPressed('backspace')) {
      // 删当前空位，或从右往左删
      let i = u.blankSel | 0;
      if (u.slots[i]) {
        u.slots[i] = null;
      } else {
        for (let j = u.slots.length - 1; j >= 0; j--) {
          if (u.slots[j]) {
            u.slots[j] = null;
            u.blankSel = j;
            break;
          }
        }
      }
      u.message = null;
      audio.playSfx('ui');
    }

    if (input.wasPressed('e') || input.wasPressed('enter') || input.wasPressed(' ')) {
      if (u.sel >= u.pool.length) {
        this.tryReleaseUtterance();
      } else {
        const ch = u.pool[u.sel];
        // 填入第一个空位，或 blankSel 指向的空位
        let idx = u.slots.findIndex((s) => !s);
        if (u.slots[u.blankSel] == null) idx = u.blankSel | 0;
        if (idx < 0) {
          this.showHint('空位已满，可 Backspace 修改，或选「确认」');
        } else {
          u.slots[idx] = ch;
          u.blankSel = Math.min(idx + 1, u.slots.length - 1);
          u.message = null;
          audio.playSfx('ui');
        }
      }
    }

    this.updateParticles(dt);
  },

  tryReleaseUtterance() {
    const u = this.utteranceState;
    if (!u) return;

    const target = findNearestPurifyTarget(this, UTTERANCE.range) || u.target;
    u.target = target;
    if (!target) {
      this.showHint('靠近需要被语言钉住的人或物，再按 F');
      audio.playSfx('uiCancel');
      return;
    }

    const blanks = getBlanks(target);
    const filled = u.slots || [];
    if (filled.some((c) => !c) || filled.length < blanks.length) {
      const miss = blanks.filter((_, i) => !filled[i]);
      const fail = `还有空没填：${miss.map((c) => '「' + c + '」').join('') || '请补全'}`;
      this.showHint(fail);
      u.message = fail;
      audio.playSfx('uiCancel');
      return;
    }

    const { ok, wrong } = matchBlanks(filled, blanks);
    if (!ok) {
      const fail =
        target.failHint ||
        (wrong.length
          ? `第 ${wrong[0].i + 1} 个空应为「${wrong[0].expect}」`
          : '字句不对，再想想这句诗/成语。');
      this.showHint(fail);
      u.message = fail;
      audio.playSfx('uiCancel');
      fx.shake(3, 180);
      return;
    }

    this.applyPurifySuccess(target);
  },

  applyPurifySuccess(target) {
    if (!target) return;
    if (target.doneFlag) this.flags[target.doneFlag] = true;
    target.completed = true;

    if (target.purifyKind === 'meme_wall') {
      this.karma.mercy += 1;
    } else if (target.purifyKind === 'aphasic') {
      this.karma.saved += 1;
      this.karma.mercy += 1;
    } else {
      this.karma.mercy += 1;
    }

    audio.playSfx('purifyWave');
    fx.flash('#ffd866', 0.45, 500);
    fx.purifyWave(target.x, target.y, 280);

    if (target.successHint) this.showHint(target.successHint);

    if (typeof this.refreshObjective === 'function') this.refreshObjective();

    this.closeUtterance();

    if (target.dialogKey && DIALOGS[target.dialogKey]) {
      this.startDialog(DIALOGS[target.dialogKey], target.label || '补全');
    }
  },
};
