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
const FROM_INTRO = sessionStorage.getItem('keheng_from') === 'intro';
if (FROM_INTRO) {
  game.flags.wake_done = true;
  sessionStorage.removeItem('keheng_from');
}

const NG_PLUS = localStorage.getItem('keheng_new_game_plus') === '1';
if (NG_PLUS) {
  const meta = loadMeta();
  game.flags.new_game_plus = true;
  game.player.ngPlus = true;
  game.flags.ngplus_last_ending = meta.lastEnding || null;
  game.flags.ngplus_clear_count = meta.clearCount || 0;
  game.flags.ngplus_cleared_endings = meta.clearedEndings || [];
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
let startMenu = null;
if (!FROM_INTRO) {
  startMenu = mountStartMenu(game, { fromIntro: false });
}

window.addEventListener('keheng:startIntro', () => {
  const wrap = document.getElementById('introWrap');
  if (!wrap) return;
  // 不透明幕布：立刻盖住下方游戏画面，避免 3D 加载前露出游戏而闪烁
  wrap.style.cssText = 'display:block; position:fixed; inset:0; z-index:2000; background:#050403;';
  wrap.innerHTML = '';

  // 加载提示（3D 文档就绪前显示，背景与序幕一致，无缝衔接）
  const loader = document.createElement('div');
  loader.style.cssText =
    'position:absolute; inset:0; display:flex; align-items:center; justify-content:center;' +
    'background:#050403; color:rgba(238,218,178,0.6); font-family:"Songti SC","SimSun",serif;' +
    'font-size:22px; letter-spacing:0.3em; transition:opacity 300ms ease;';
  loader.textContent = '序 幕 正 在 开 启';
  wrap.appendChild(loader);

  const iframe = document.createElement('iframe');
  iframe.src = 'intro_3d.html';
  iframe.allow = 'autoplay';
  iframe.style.cssText =
    'position:fixed; inset:0; border:0; width:100%; height:100%; opacity:0; transition:opacity 420ms ease;';
  // 文档加载完成后再淡入，避免白屏/硬切
  iframe.addEventListener('load', () => {
    requestAnimationFrame(() => {
      iframe.style.opacity = '1';
      setTimeout(() => {
        if (loader.parentNode) {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 320);
        }
      }, 440);
    });
  });
  wrap.appendChild(iframe);

  if (startMenu && startMenu.close) startMenu.close();
});

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'intro:done') {
    const wrap = document.getElementById('introWrap');
    if (wrap) {
      // 淡出幕布，避免结束硬切闪烁
      wrap.style.transition = 'opacity 340ms ease';
      wrap.style.opacity = '0';
      setTimeout(() => {
        wrap.style.display = 'none';
        wrap.style.opacity = '';
        wrap.style.transition = '';
        wrap.innerHTML = '';
      }, 360);
    }
    game.flags.wake_done = true;
  }
});

if (FROM_INTRO && NG_PLUS) {
  setTimeout(() => {
    const count = game.flags.ngplus_clear_count || 0;
    const endings = Array.isArray(game.flags.ngplus_cleared_endings)
      ? game.flags.ngplus_cleared_endings.length
      : 0;
    game.showHint(`二周目：刻字记录与上次旅程的倾向已继承，通关 ${count} 次，见证 ${endings} 种结局。`);
  }, 500);
}

console.log(
  '[墓之语] 启动' + (FROM_INTRO ? '（接序幕）' : '') + `（难度：${difficulty.currentDef().name}）`
);
