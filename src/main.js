// 启动入口
import { Game } from './game.js';
import { initAI } from './ai/config.js';
import * as difficulty from './difficulty.js';
import * as audio from './audio.js';
import { mountStartMenu } from './start_menu.js';
import {
  clearRefreshResume,
  loadMeta,
  loadRefreshResume,
  restore,
  saveRefreshResume,
} from './save.js';

const canvas = document.getElementById('c');
const game = new Game(canvas);
initAI(); // 后台探测 AI 服务（失败则自动降级为纯文字），不阻塞启动

// 初始化难度系统（从 localStorage 读取上次选择）
difficulty.setCurrent(difficulty.loadDifficulty());

// 来自序幕（intro_3d.html）？序幕已经把"世界背景+前情提要+苏醒"演完了，
// 主屏里再播一遍 wake 长对白就重复了。无感衔接：直接把 wake_done 置位，
// 让 checkAutoTriggers 跳过开局叙述，玩家直接控制顾言。
const FROM_INTRO = sessionStorage.getItem('keheng_from') === 'intro';
if (FROM_INTRO) {
  game.flags.wake_done = true;
  sessionStorage.removeItem('keheng_from');
}

const NG_PLUS = localStorage.getItem('keheng_new_game_plus') === '1';
const REFRESH_RESUME = !FROM_INTRO ? loadRefreshResume() : null;
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

let startMenu = null;
let introFrame = null;
let didRestoreRefreshResume = false;

function shouldWriteRefreshResume() {
  if (!game.scene) return false;
  if (game.endless) return false;
  return game.scene.id !== 'freeze_center' || !!game.flags.wake_done;
}

function writeRefreshResume() {
  if (shouldWriteRefreshResume()) saveRefreshResume(game);
}

function restoreRefreshResumeIfNeeded() {
  if (!REFRESH_RESUME || didRestoreRefreshResume) return false;
  const ok = restore(game, REFRESH_RESUME);
  if (!ok || !game._pendingScene) {
    clearRefreshResume();
    return false;
  }
  game.loadScene(game._pendingScene, game._pendingSpawn);
  game._pendingScene = null;
  game._pendingSpawn = null;
  didRestoreRefreshResume = true;
  clearRefreshResume();
  game.showHint('已恢复刷新前的位置');
  return true;
}

function finishIntroOverlay() {
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
  window.removeEventListener('keydown', skipIntroFromParent, true);
  introFrame = null;
  game.flags.wake_done = true;
}

function skipIntroFromParent(e) {
  const key = e.key.toLowerCase();
  if (key !== 'escape' && key !== 's') return;
  e.preventDefault();
  e.stopPropagation();
  if (introFrame && introFrame.contentWindow) {
    introFrame.contentWindow.postMessage({ type: 'intro:skip' }, '*');
  } else {
    finishIntroOverlay();
  }
}

// === 启动加载页 ===
// 音频不再一次性全部下载：仅预加载标题曲，其余 BGM 按场景按需加载（流式边下边播）。
// 加载页覆盖到标题曲就绪（或超时兜底）后淡出，再启动游戏/显示开始菜单，
// 避免加载期间游戏在幕后接收输入或触发开场对话。
const bootLoader = document.getElementById('bootLoader');
const bootFill = document.getElementById('bootProgressFill');
const bootStatus = document.getElementById('bootStatus');
let _bootDone = false;
function finishBoot() {
  if (_bootDone) return;
  _bootDone = true;
  if (bootFill) {
    bootFill.style.animation = 'none';
    bootFill.style.width = '100%';
  }
  if (bootStatus) bootStatus.textContent = '即 将 开 始';
  setTimeout(() => {
    game.start();
    const restoredRefresh = restoreRefreshResumeIfNeeded();
    if (bootLoader) {
      bootLoader.style.opacity = '0';
      setTimeout(() => { bootLoader.style.display = 'none'; }, 420);
    }
    if (!FROM_INTRO && !restoredRefresh && !startMenu) {
      startMenu = mountStartMenu(game, { fromIntro: false });
    }
  }, 280);
}
if (bootStatus) bootStatus.textContent = '正 在 加 载 资 源 …';
audio.preloadEssential().then(finishBoot).catch(finishBoot);
// 兜底：音频加载过慢或失败时最多等 4 秒即放行，避免卡死
setTimeout(finishBoot, 4000);

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
  introFrame = iframe;
  window.addEventListener('keydown', skipIntroFromParent, true);

  if (startMenu && startMenu.close) startMenu.close();
});

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'intro:done') {
    finishIntroOverlay();
  }
});

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'f5' || ((e.ctrlKey || e.metaKey) && key === 'r')) writeRefreshResume();
}, true);
window.addEventListener('pagehide', writeRefreshResume);
window.addEventListener('beforeunload', writeRefreshResume);

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
