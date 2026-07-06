// 启动入口
import { Game } from './game.js';
import { initAI } from './ai/config.js';
import * as difficulty from './difficulty.js';
import * as audio from './audio.js';
import { mountStartMenu } from './start_menu.js';
import { loadMeta } from './save.js';

const canvas = document.getElementById('c');
const game = new Game(canvas);
initAI(); // 后台探测 AI 服务（失败则自动降级为纯文字），不阻塞启动

// 初始化难度系统（从 localStorage 读取上次选择）
difficulty.setCurrent(difficulty.loadDifficulty());

// 预加载全部 BGM mp3（后台异步，不阻塞启动）
audio.preloadBGM();

// 来自序幕（intro_3d.html）？序幕已经把"世界背景+前情提要+苏醒"演完了，
// 主屏里再播一遍 wake 长对白就重复了。无感衔接：直接把 wake_done 置位，
// 让 checkAutoTriggers 跳过开局叙述，玩家直接控制顾言。
const FROM_INTRO = new URLSearchParams(location.search).get('from') === 'intro';
if (FROM_INTRO) game.flags.wake_done = true;

const NG_PLUS = localStorage.getItem('keheng_new_game_plus') === '1';
if (NG_PLUS) {
  const meta = loadMeta();
  game.flags.new_game_plus = true;
  game.player.ngPlus = true;
  if (meta.lastKarma) game.karma = { ...game.karma, ...meta.lastKarma };
  game.objective = { text: '二周目：带着旧刻痕重新醒来', done: false };
}

// 标题页/序幕BGM：首次用户交互后播放序章主题
const _playTitleBGM = () => {
  audio.unlockAudio();
  audio.playBGM('__title__');
  window.removeEventListener('pointerdown', _playTitleBGM);
  window.removeEventListener('keydown', _playTitleBGM);
};
window.addEventListener('pointerdown', _playTitleBGM, { once: true });
window.addEventListener('keydown', _playTitleBGM, { once: true });

game.start();
mountStartMenu(game, { fromIntro: FROM_INTRO });
if (FROM_INTRO && NG_PLUS) {
  setTimeout(() => game.showHint('二周目：刻字记录与上次旅程的倾向已继承，敌人也更危险。'), 500);
}

console.log(
  '[墓之语] 启动' + (FROM_INTRO ? '（接序幕）' : '') + `（难度：${difficulty.currentDef().name}）`
);
