import { W, H } from '../config.js';
import * as audio from '../audio.js';

/** 言锋试炼：每波一场主题化协议侵入，难度递进 */
function makeTrialEnemy(wave) {
  // 波次越后：层数越多、数值越高
  let layerMax = 2;
  if (wave >= 2) layerMax = 3;
  if (wave >= 3) layerMax = 4;
  if (wave >= 6) layerMax = 4;

  const scale = 1 + Math.min(1.4, (wave - 1) * 0.12);
  const names = [
    '试炼·噪点节点',
    '试炼·复读残影',
    '试炼·协议茧',
    '试炼·推荐洪流',
    '试炼·格式化核',
    '试炼·茧房回响',
  ];
  const name = names[Math.min(names.length - 1, wave - 1)] + (wave > names.length ? `·第${wave}波` : '');

  return {
    id: `trial_${wave}_${Date.now()}`,
    typeId: 'trial_core',
    name,
    hp: Math.round(100 * scale),
    maxHp: Math.round(100 * scale),
    boss: wave >= 3,
    combat: 'hack',
    hackTrial: true,
    hackOpts: {
      layerMax,
      startLayer: 1,
      shortRoute: wave === 1,
      hpMul: scale,
      spdMul: 1 + Math.min(0.55, (wave - 1) * 0.06),
      dmgMul: 1 + Math.min(0.4, (wave - 1) * 0.05),
      title: wave === 1 ? '言锋试炼——入门协议' : `言锋试炼·第 ${wave} 波`,
      subtitle:
        wave < 3
          ? '驾驶言锋，击穿当前协议层'
          : '终核苏醒——击破复读巨像的试炼投影',
      bossName: wave >= 3 ? '试炼·复读巨像' : '协议节点',
      bossCore: wave >= 3 ? '试炼核心·复读巨像' : '协议节点',
    },
    acts: [
      '试炼场里没有真实的茧房，只有被剥离出来的算法回声。',
      '言锋的尾焰在虚空中划出一行未写完的诗。',
      '每一波协议都比上一波更会模仿你想听的话。',
      '守住语言，也守住方向。',
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
    this.modeName = '言锋试炼';
  }

  start() {
    this.state = 'intermission';
    this.wave = 0;
    this.score = 0;
    this.bestWave = 0;
    this.intermissionMs = 700;
    this.summaryText = '言锋试炼已开启。';
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
    this.game.showHint('言锋试炼：驾驶飞行器突破协议层，倒下即结束。');
    try {
      audio.playBGM('__boss__');
    } catch (_) {}
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
    const enemy = makeTrialEnemy(this.wave);
    this.lastEnemy = enemy;
    this.state = 'battle';
    this.summaryText = `第 ${this.wave} 波：${enemy.name}`;
    // 不在开战瞬间 showHint，避免盖住操作介绍
    this.game.startBattle(enemy);
  }

  onBattleEnd(result, enemy) {
    this.lastEnemy = enemy || this.lastEnemy;
    if (result !== 'win') {
      this.state = 'gameover';
      this.bestWave = Math.max(this.bestWave, this.wave - (result === 'lose' ? 0 : 1));
      this.summaryText =
        result === 'lose' ? '言锋失联——试炼结束。' : '本轮言锋试炼已中止。';
      this.game.showHint(this.summaryText);
      return;
    }

    this.bestWave = Math.max(this.bestWave, this.wave);
    const reward = 140 + this.wave * 35 + Math.round((enemy && enemy.maxHp) || 0);
    this.score += reward;
    this.game.player.san = Math.min(
      this.game.player.maxSan,
      this.game.player.san + 10 + Math.min(20, Math.floor(this.wave / 2))
    );
    this.state = 'intermission';
    this.intermissionMs = Math.max(500, 1100 - this.wave * 40);
    this.summaryText = `协议突破 · 第 ${this.wave} 波 · 得分 +${reward}`;
  }

  render(ctx, gameTime) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08090c';
    ctx.fillRect(0, 0, W, H);

    // 网格底
    ctx.strokeStyle = 'rgba(232,220,200,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const glow = 0.18 + Math.sin(gameTime * 0.003) * 0.06;
    ctx.fillStyle = `rgba(212, 168, 90, ${glow})`;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#e8dcc8';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px "SimSun","Songti SC",serif';
    ctx.fillText('言 锋 试 炼', W / 2, 118);

    ctx.font = '15px "SimSun","Songti SC",serif';
    ctx.fillStyle = 'rgba(212,168,90,0.9)';
    ctx.fillText(`波次 ${this.wave}  ·  得分 ${this.score}  ·  最佳 ${this.bestWave}`, W / 2, 162);

    const boxW = Math.min(640, W - 48);
    const boxH = 220;
    const x = (W - boxW) / 2;
    const y = 210;
    ctx.fillStyle = 'rgba(12, 14, 18, 0.9)';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = 'rgba(212, 168, 90, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, boxW, boxH);

    ctx.fillStyle = 'rgba(232,220,200,0.92)';
    ctx.font = '18px "SimSun","Songti SC",serif';
    ctx.fillText(this.summaryText || '言锋整备中…', W / 2, y + 58);

    ctx.font = '14px "SimSun","Songti SC",serif';
    ctx.fillStyle = 'rgba(178,169,152,0.85)';
    ctx.fillText('驾驶诗句凝成的飞行器，击穿算法协议层。', W / 2, y + 100);
    ctx.fillText('金色梗弹可击落 · 白色静默弹不可销毁 · Esc 系统菜单', W / 2, y + 128);

    if (this.state === 'gameover') {
      ctx.fillStyle = 'rgba(255,220,160,0.95)';
      ctx.font = 'bold 17px "SimSun","Songti SC",serif';
      ctx.fillText('按 E / Space / Esc 返回标题', W / 2, y + 170);
    } else {
      ctx.fillStyle = 'rgba(212,168,90,0.9)';
      ctx.font = 'bold 16px "SimSun","Songti SC",serif';
      ctx.fillText('下一层协议正在展开…', W / 2, y + 170);
    }

    ctx.textAlign = 'left';
  }

  quit() {
    if (this._exitQueued) return;
    this._exitQueued = true;
    try {
      audio.stopBGM();
    } catch (e) {
      console.warn('[言锋试炼] 退出时停止 BGM 失败', e);
    }
    try {
      sessionStorage.setItem('keheng_to_title', '1');
    } catch (_) {}
    window.location.reload();
  }
}
