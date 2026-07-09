import { W, H } from '../config.js';
import * as audio from '../audio.js';

const ENEMY_POOLS = [
  { wave: 1, typeId: 'geng_weak', name: '游荡梗鬼', hp: 28, maxHp: 28 },
  { wave: 3, typeId: 'geng_medium', name: '裂口梗鬼', hp: 52, maxHp: 52 },
  { wave: 6, typeId: 'geng_elite', name: '回声梗鬼', hp: 84, maxHp: 84 },
  { wave: 9, typeId: 'formatter', name: '格式化者', hp: 96, maxHp: 96 },
  { wave: 12, typeId: 'memory_guard', name: '记忆守卫', hp: 120, maxHp: 120 },
];

function pickTemplate(wave) {
  let chosen = ENEMY_POOLS[0];
  for (const tpl of ENEMY_POOLS) {
    if (wave >= tpl.wave) chosen = tpl;
  }
  return chosen;
}

function makeEnemy(wave, totalScore) {
  const tpl = pickTemplate(wave);
  const bossWave = wave % 5 === 0;
  const scale = 1 + Math.min(1.1, (wave - 1) * 0.09 + totalScore * 0.001);
  const hp = Math.max(18, Math.round(tpl.hp * scale));
  return {
    id: `endless_${wave}_${tpl.typeId}_${Date.now()}`,
    typeId: tpl.typeId,
    name: bossWave ? `无尽回响·第 ${wave} 波` : tpl.name,
    hp,
    maxHp: hp,
    boss: bossWave,
    acts: [
      '这股回声还在变强。',
      '你听见自己的脚步声，在更远的地方返回。',
      '每一场战斗都在为下一场战斗热身。',
      '如果语言没有尽头，守住它也没有尽头。',
    ],
  };
}

export class EndlessMode {
  constructor(game) {
    this.game = game;
    this.state = 'idle';
    this.wave = 0;
    this.score = 0;
    this.bestWave = 0;
    this.intermissionMs = 0;
    this.summaryText = '';
    this.lastEnemy = null;
    this._exitQueued = false;
  }

  start() {
    this.state = 'intermission';
    this.wave = 0;
    this.score = 0;
    this.bestWave = 0;
    this.intermissionMs = 300;
    this.summaryText = '无尽回响已开始。';
    this.lastEnemy = null;
    this.game.hints = [];
    this.game.player.san = this.game.player.maxSan;
    this.game.player.invulnerable = 0;
    this.game.player.hurtFlash = false;
    this.game.dialogState = null;
    this.game.compose = null;
    this.game.converse = null;
    this.game.sidescroll = null;
    this.game.level3d = null;
    this.game.uiPanel = null;
    this.game._saveMenu = null;
    this.game.battle = null;
    this.game.showHint('无尽回响：回合不会结束，直到你倒下。');
  }

  update(dt) {
    if (this.state !== 'intermission') return;
    this.intermissionMs -= dt;
    if (this.intermissionMs > 0) return;
    this._startNextBattle();
  }

  _startNextBattle() {
    if (this._exitQueued || this.state === 'gameover') return;
    this.wave += 1;
    const enemy = makeEnemy(this.wave, this.score);
    this.lastEnemy = enemy;
    this.state = 'battle';
    this.summaryText = `第 ${this.wave} 波：${enemy.name}`;
    this.game.showHint(this.summaryText);
    this.game.startBattle(enemy);
  }

  onBattleEnd(result, enemy) {
    this.lastEnemy = enemy || this.lastEnemy;
    if (result !== 'win') {
      this.state = 'gameover';
      this.bestWave = Math.max(this.bestWave, this.wave - (result === 'lose' ? 0 : 1));
      this.summaryText = result === 'lose' ? '无尽回响结束。' : '本轮无尽回响已中止。';
      this.game.showHint(this.summaryText);
      return;
    }

    this.bestWave = Math.max(this.bestWave, this.wave);
    const reward = 120 + this.wave * 20 + Math.round((enemy && enemy.maxHp) || 0);
    this.score += reward;
    this.game.player.san = Math.min(
      this.game.player.maxSan,
      this.game.player.san + 8 + Math.min(18, Math.floor(this.wave / 2))
    );
    this.state = 'intermission';
    this.intermissionMs = Math.max(240, 900 - this.wave * 18);
    this.summaryText = `已击退第 ${this.wave} 波，得分 +${reward}`;
  }

  render(ctx, gameTime) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, W, H);

    const glow = 0.32 + Math.sin(gameTime * 0.003) * 0.08;
    ctx.fillStyle = `rgba(160, 125, 255, ${glow})`;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f3e8d0';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px "SimSun","Songti SC",serif';
    ctx.fillText('无尽回响', W / 2, 120);

    ctx.font = '16px "SimSun","Songti SC",serif';
    ctx.fillStyle = 'rgba(235,225,210,0.84)';
    ctx.fillText(`波次 ${this.wave}  ·  分数 ${this.score}`, W / 2, 168);

    const boxW = Math.min(640, W - 48);
    const boxH = 210;
    const x = (W - boxW) / 2;
    const y = 210;
    ctx.fillStyle = 'rgba(10, 11, 18, 0.84)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = 'rgba(220, 200, 150, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxW, boxH);

    ctx.fillStyle = 'rgba(235,225,210,0.9)';
    ctx.font = '18px "SimSun","Songti SC",serif';
    ctx.fillText(this.summaryText || '准备下一波。', W / 2, y + 56);

    ctx.font = '14px "SimSun","Songti SC",serif';
    ctx.fillStyle = 'rgba(220,210,190,0.72)';
    ctx.fillText(`最佳波次 ${this.bestWave}  ·  当前场景为独立模式`, W / 2, y + 98);

    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(255,220,160,0.92)';
      ctx.font = 'bold 17px "SimSun","Songti SC",serif';
      ctx.fillText('按 E / Space / Esc 返回标题', W / 2, y + 154);
    } else {
      ctx.fillStyle = 'rgba(255,220,160,0.82)';
      ctx.font = 'bold 16px "SimSun","Songti SC",serif';
      ctx.fillText('下一波正在靠近。', W / 2, y + 154);
    }

    ctx.textAlign = 'left';
  }

  quit() {
    if (this._exitQueued) return;
    this._exitQueued = true;
    try {
      audio.stopBGM();
    } catch (e) {
      console.warn('[无尽模式] 退出时停止 BGM 失败', e);
    }
    window.location.reload();
  }
}
