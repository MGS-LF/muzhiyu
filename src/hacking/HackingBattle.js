import { input } from '../input.js';
import * as audio from '../audio.js';
import * as difficulty from '../difficulty.js';
import { createSimState, spawnLayer, stepSim, readInput, STEP_MS } from './sim.js';

export class HackingBattle {
  constructor(enemy, player, onEnd, game = null) {
    this.mode = 'hack';
    this.isHack = true;
    this.enemy = enemy;
    this.player = player;
    this.onEnd = onEnd;
    this.game = game;

    this.phase = 'intro';
    this.timer = 0;
    this.fadeAlpha = 1;
    this.result = null;
    this._finished = false;
    this.menuIndex = 0;

    this.heartMaxHp = player.maxSan || player.san || 100;
    this.heartHp = player.san;

    const mul = difficulty.currentMul();
    const flags = game?.flags || {};
    const opts = (enemy && enemy.hackOpts) || {};
    const trial = !!(enemy && enemy.hackTrial);
    const shortRoute =
      opts.shortRoute != null
        ? !!opts.shortRoute
        : !!flags.stadium_puzzle_solved ||
          (enemy && enemy.hp != null && enemy.maxHp != null && enemy.hp <= enemy.maxHp * 0.55);

    this.hackOpts = opts;
    this.isTrial = trial;
    this.uiTitle = opts.title || null;
    this.uiSubtitle = opts.subtitle || null;
    this.uiBossCore = opts.bossCore || opts.bossName || null;

    this.sim = createSimState({
      shortRoute,
      layerMax: opts.layerMax,
      startLayer: opts.startLayer,
      hpMul: (mul.enemyHp ?? 1) * (opts.hpMul ?? 1),
      spdMul: (mul.bulletSpeed ?? 1) * (opts.spdMul ?? 1),
      dmgMul: (mul.enemyDamage ?? 1) * (opts.dmgMul ?? 1),
      sanHit: Math.round(14 * (mul.sanDamage ?? 1) * (opts.dmgMul ?? 1)),
      bossLabel: opts.bossName || opts.bossCore || null,
      trial,
    });
    this.acc = 0;
    this._prevDone = null;

    // 清掉进战前 toast，避免挡住介绍
    if (game && Array.isArray(game.hints)) game.hints.length = 0;
  }

  update(dt) {
    this.timer += dt;
    this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 0.003);

    if (this.phase === 'intro') {
      // 必须玩家确认才开打，不自动开始
      if (
        this.timer > 500 &&
        (input.wasPressed(' ') ||
          input.wasPressed('e') ||
          input.wasPressed('enter') ||
          input.mousePressed())
      ) {
        this.beginPlay();
      }
      return;
    }

    if (this.phase === 'result') {
      if (!this._finished && this.timer > 50) {
        this.finish();
      }
      return;
    }

    if (this.phase === 'play') {
      // Esc 交给全局系统菜单；战斗内不再单独做简陋暂停
      if (this.game && this.game.uiPanel) return;
      if (this.game && this.game._saveMenu) return;

      this.acc += dt;
      const heart = { hp: this.heartHp };
      let steps = 0;
      while (this.acc >= STEP_MS && steps < 5) {
        this.acc -= STEP_MS;
        steps++;
        const snap = readInput(input);
        stepSim(this.sim, snap, heart);
        this.heartHp = heart.hp;
      }

      if (this.sim.done && this.sim.done !== this._prevDone) {
        this._prevDone = this.sim.done;
        this.endWith(this.sim.done);
      }
    }
  }

  beginPlay() {
    this.phase = 'play';
    this.timer = 0;
    spawnLayer(this.sim);
    try {
      audio.playSfx('ui');
    } catch (_) {}
  }

  endWith(result) {
    if (this.phase === 'result') return;
    this.result = result;
    this.phase = 'result';
    this.timer = 0;
    try {
      audio.playSfx(result === 'win' ? 'victory' : 'death');
    } catch (_) {}
  }

  finish() {
    if (this._finished) return;
    this._finished = true;
    this.player.san = Math.max(0, this.heartHp);
    if (this.onEnd) this.onEnd(this.result, this.enemy);
  }

  isDone() {
    return this.phase === 'result' && this.timer > 900;
  }
}

export { drawHackingBattle } from './render.js';
