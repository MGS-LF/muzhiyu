import { listSaves, loadSnapshot, restore, summarize, loadMeta } from './save.js';
import { CONTROL_HINTS } from './data/controls.js';
import { cssVarsBlock } from './ui/tokens.js';

const STYLE_ID = 'start-menu-style';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent =
    cssVarsBlock() +
    `
    .start-menu {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: grid;
      place-items: center;
      overflow: hidden;
      color: var(--ink, #e8dcc8);
      background-color: #050403;
      background-image:
        radial-gradient(circle at 50% 42%, rgba(180, 135, 70, 0.13), transparent 34%),
        linear-gradient(90deg, #000000, #050609 46%, #000000);
      font-family: 'SimSun', 'Songti SC', 'Noto Serif SC', serif;
    }
    .start-menu.is-hidden {
      opacity: 0;
      pointer-events: none;
      transition: opacity 360ms ease;
    }
    .start-menu [hidden] {
      display: none !important;
    }
    .start-menu__panel {
      width: min(980px, calc(100vw - 48px));
      min-height: 520px;
      padding: 44px 52px 38px;
      border: 1px solid rgba(212, 168, 90, 0.48);
      background: rgba(8, 7, 5, 0.88);
      box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.1), 0 30px 80px rgba(0, 0, 0, 0.52);
    }
    .start-menu__kicker {
      color: rgba(212, 168, 90, 0.72);
      font-size: 12px;
      letter-spacing: 0.36em;
      text-align: center;
    }
    .start-menu__title {
      margin: 14px 0 8px;
      color: #f0dfbd;
      font-size: 42px;
      font-weight: 700;
      letter-spacing: 0.34em;
      text-align: center;
      text-indent: 0.34em;
      text-shadow: 0 0 22px rgba(212, 168, 90, 0.32);
    }
    .start-menu__subtitle {
      margin-bottom: 34px;
      color: rgba(232, 220, 200, 0.58);
      font-size: 13px;
      letter-spacing: 0.14em;
      text-align: center;
    }
    .start-menu__view {
      display: none;
    }
    .start-menu__view.is-active {
      display: block;
    }
    .start-menu__intro-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) 300px;
      gap: 42px;
      align-items: start;
    }
    .start-menu__intro {
      padding-top: 2px;
      border-top: 1px solid rgba(212, 168, 90, 0.22);
    }
    .start-menu__intro-label,
    .start-menu__menu-label {
      margin-bottom: 18px;
      color: rgba(212, 168, 90, 0.78);
      font-size: 12px;
      letter-spacing: 0.28em;
    }
    .start-menu__intro h2 {
      margin-bottom: 16px;
      color: #f0dfbd;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.16em;
      line-height: 1.45;
    }
    .start-menu__intro p {
      max-width: 58ch;
      margin: 0 0 14px;
      color: rgba(232, 220, 200, 0.72);
      font-size: 14px;
      line-height: 1.9;
      letter-spacing: 0.05em;
    }
    .start-menu__notes {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 26px;
    }
    .start-menu__note {
      padding: 12px 10px;
      border: 1px solid rgba(212, 168, 90, 0.22);
      background: rgba(212, 168, 90, 0.045);
      color: rgba(232, 220, 200, 0.68);
      font-size: 12px;
      line-height: 1.6;
      letter-spacing: 0.08em;
      text-align: center;
    }
    .start-menu__menu {
      padding: 2px 0 0 28px;
      border-left: 1px solid rgba(212, 168, 90, 0.22);
    }
    .start-menu__actions {
      display: grid;
      gap: 14px;
      width: 100%;
      margin: 0;
    }
    .start-menu button {
      min-height: 46px;
      border: 1px solid rgba(212, 168, 90, 0.42);
      color: #e8dcc8;
      background: rgba(212, 168, 90, 0.08);
      font: inherit;
      font-size: 15px;
      letter-spacing: 0.2em;
      cursor: pointer;
      transition: transform 140ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease;
    }
    .start-menu button:hover,
    .start-menu button:focus-visible {
      color: #fff8e8;
      border-color: var(--gold-bright, rgba(255, 222, 142, 0.9));
      background: rgba(212, 168, 90, 0.16);
      outline: 2px solid var(--gold-bright, rgba(255, 222, 142, 0.9));
      outline-offset: 2px;
    }
    .start-menu button:active {
      transform: translateY(1px) scale(0.97);
    }
    @media (prefers-reduced-motion: reduce) {
      .start-menu.is-hidden { transition: none; }
      .start-menu button { transition: none; }
    }
    .start-menu__back {
      width: 96px;
      min-height: 34px;
      margin-bottom: 20px;
      font-size: 12px;
      letter-spacing: 0.16em;
    }
    .start-menu__heading {
      margin-bottom: 18px;
      color: #f0dfbd;
      font-size: 22px;
      letter-spacing: 0.2em;
      text-align: center;
    }
    .start-menu__saves {
      display: grid;
      gap: 10px;
      max-height: 290px;
      overflow: auto;
      padding-right: 4px;
    }
    .start-menu__save {
      width: 100%;
      min-height: 64px;
      padding: 10px 16px;
      text-align: left;
      letter-spacing: 0.04em;
    }
    .start-menu__save-title {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: #f0dfbd;
      font-size: 14px;
      line-height: 1.5;
    }
    .start-menu__save-meta {
      margin-top: 4px;
      color: rgba(232, 220, 200, 0.58);
      font-size: 12px;
      line-height: 1.5;
    }
    .start-menu__empty,
    .start-menu__about,
    .start-menu__error {
      min-height: 156px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(212, 168, 90, 0.18);
      color: rgba(232, 220, 200, 0.54);
      background: rgba(255, 255, 255, 0.025);
      font-size: 14px;
      letter-spacing: 0.08em;
    }
    .start-menu__error {
      min-height: auto;
      margin-top: 12px;
      padding: 10px 12px;
      color: #f0b0a0;
    }
    .start-menu__about {
      display: block;
      padding: 20px 24px;
      line-height: 1.9;
      place-items: initial;
    }
    .start-menu__about p {
      margin: 0 0 12px;
      color: rgba(232, 220, 200, 0.72);
      font-size: 14px;
      letter-spacing: 0.04em;
    }
    .start-menu__about ul {
      margin: 10px 0 0;
      padding-left: 1.2em;
      color: rgba(232, 220, 200, 0.66);
      font-size: 13px;
      line-height: 1.9;
    }
    .start-menu__team {
      display: grid;
      gap: 12px;
      margin-top: 8px;
    }
    .start-menu__member {
      display: grid;
      grid-template-columns: 56px 1fr;
      gap: 4px 14px;
      align-items: center;
      padding: 12px 14px;
      border: 1px solid rgba(212, 168, 90, 0.2);
      background: rgba(255, 255, 255, 0.03);
    }
    .start-menu__avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(212, 168, 90, 0.45);
      box-shadow: 0 0 12px rgba(212, 168, 90, 0.18);
      grid-row: 1 / span 2;
      background: rgba(0, 0, 0, 0.35);
    }
    .start-menu__member-body {
      min-width: 0;
    }
    .start-menu__member-role {
      color: rgba(212, 168, 90, 0.85);
      font-size: 11px;
      letter-spacing: 0.12em;
    }
    .start-menu__member-name {
      color: #f0dfbd;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin-top: 2px;
    }
    .start-menu__member-desc {
      margin-top: 4px;
      color: rgba(232, 220, 200, 0.62);
      font-size: 13px;
      line-height: 1.7;
      letter-spacing: 0.03em;
      grid-column: 2;
    }
    .start-menu__team-note {
      margin-top: 16px !important;
      color: rgba(232, 220, 200, 0.5) !important;
      font-size: 12px !important;
      letter-spacing: 0.06em !important;
    }
    @media (max-width: 720px) {
      .start-menu__panel {
        width: calc(100vw - 28px);
        min-height: 0;
        padding: 34px 24px 28px;
      }
      .start-menu__title {
        font-size: 32px;
      }
      .start-menu__intro-layout,
      .start-menu__notes {
        grid-template-columns: 1fr;
      }
      .start-menu__menu {
        padding-left: 0;
        border-left: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

function saveLabel(slot) {
  return slot === 'auto' ? '自动存档' : `槽位 ${slot}`;
}

function makeSaveButton(save, onLoad) {
  const info = summarize(save);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'start-menu__save';
  button.innerHTML = `
    <span class="start-menu__save-title">
      <span>${saveLabel(save.slot)} · ${info.scene}</span>
      <span>SAN ${Math.floor(info.san ?? 0)}</span>
    </span>
    <span class="start-menu__save-meta">${info.time} · 碎片 ${info.chars}</span>
  `;
  button.addEventListener('click', () => onLoad(save.slot));
  return button;
}

/** @param {any} game @param {{ fromIntro?: boolean }} [opts] */
export function mountStartMenu(game, { fromIntro } = {}) {
  if (fromIntro) return null;

  ensureStyle();
  game.tutorial = null;

  const root = document.createElement('div');
  root.className = 'start-menu';
  root.innerHTML = `
    <section class="start-menu__panel" aria-label="开始页面">
      <div class="start-menu__view is-active" data-view="main">
        <div class="start-menu__kicker">公元 2147 · 上海废墟</div>
        <h1 class="start-menu__title">墓之语</h1>
        <div class="start-menu__subtitle">在遗忘的文字里醒来</div>
        <div class="start-menu__intro-layout">
          <section class="start-menu__intro" aria-label="游戏介绍">
            <div class="start-menu__intro-label">游戏介绍</div>
            <h2>人类失去了完整表达，城市只剩下腐烂的短句。</h2>
            <p>你将扮演从冷冻仓中醒来的顾言，在被语义噪声吞没的上海废墟中探索、战斗、拾起散落的诗词碎片。</p>
            <p>完整的句子能抵抗梗鬼，刻下的文字能钉住坍塌的世界。沿着老人守砚留下的线索，走向算法茧房深处，回答那个被遗忘的良心 AI。</p>
            <div class="start-menu__notes" aria-label="玩法要点">
              <div class="start-menu__note">探索废墟</div>
              <div class="start-menu__note">收集诗词</div>
              <div class="start-menu__note">守住语言</div>
            </div>
          </section>
          <nav class="start-menu__menu" aria-label="主菜单">
            <div class="start-menu__menu-label">菜单</div>
            <div class="start-menu__actions">
              <button type="button" data-action="start">开始游戏</button>
              <button type="button" data-action="ngplus" data-ngplus hidden>二周目</button>
              <!-- <button type="button" data-action="endless">言锋试炼</button> -->
              <button type="button" data-action="saves">存档</button>
              <button type="button" data-action="about">关于</button>
            </div>
          </nav>
        </div>
      </div>
      <div class="start-menu__view" data-view="saves">
        <button type="button" class="start-menu__back" data-action="back">返回</button>
        <h2 class="start-menu__heading">读取存档</h2>
        <div class="start-menu__saves" data-saves></div>
        <div class="start-menu__error" data-error hidden></div>
      </div>
      <div class="start-menu__view" data-view="about">
        <button type="button" class="start-menu__back" data-action="back">返回</button>
        <h2 class="start-menu__heading">关于</h2>
        <div class="start-menu__about">
          <p>我们是一支围绕「语言与记忆」主题做叙事游戏的小团队。用文字、关卡与一点点 AI，在废墟里重温完整的句子。</p>
          <div class="start-menu__team" aria-label="团队成员">
            <div class="start-menu__member">
              <img class="start-menu__avatar" src="/assets/team/langfeng.jpg" alt="浪疯" width="56" height="56" loading="lazy" />
              <div class="start-menu__member-body">
                <div class="start-menu__member-role">游戏主要设计人</div>
                <div class="start-menu__member-name">浪疯</div>
              </div>
              <div class="start-menu__member-desc">主导游戏叙事架构与关卡设计。</div>
            </div>
            <div class="start-menu__member">
              <img class="start-menu__avatar" src="/assets/team/yunzhuyu.png" alt="云煮鱼" width="56" height="56" loading="lazy" />
              <div class="start-menu__member-body">
                <div class="start-menu__member-role">核心程序 / 技术架构</div>
                <div class="start-menu__member-name">云煮鱼</div>
              </div>
              <div class="start-menu__member-desc">负责核心程序开发与技术架构搭建。</div>
            </div>
            <div class="start-menu__member">
              <img class="start-menu__avatar" src="/assets/team/xingyao.png" alt="星遥" width="56" height="56" loading="lazy" />
              <div class="start-menu__member-body">
                <div class="start-menu__member-role">美术风格</div>
                <div class="start-menu__member-name">星遥</div>
              </div>
              <div class="start-menu__member-desc">负责游戏美术风格设计。</div>
            </div>
          </div>
          <p style="margin-top:18px">《墓之语》是一款废墟探索与诗词弹幕战斗游戏。你将扮演顾言，在 2147 年的上海废墟中收集散落文字，唤醒失语者，并追寻 Sydney 与方知远留下的记忆。</p>
          <p>主线：俯视角探索、捡字补诗、江堤横版关卡、弹幕战斗与多结局。余烬章节为可选内容。</p>
          <ul>
            ${CONTROL_HINTS.startMenu.map((line) => `<li>${line}</li>`).join('')}
          </ul>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(root);

  const views = /** @type {HTMLElement[]} */ (Array.from(root.querySelectorAll('.start-menu__view')));
  const savesBox = /** @type {HTMLElement} */ (root.querySelector('[data-saves]'));
  const errorBox = /** @type {HTMLElement} */ (root.querySelector('[data-error]'));
  const ngPlusButton = /** @type {HTMLElement} */ (root.querySelector('[data-ngplus]'));
  const meta = loadMeta();
  if (ngPlusButton && meta.clearCount > 0) {
    ngPlusButton.hidden = false;
    const endings = Array.isArray(meta.clearedEndings) ? new Set(meta.clearedEndings).size : 0;
    ngPlusButton.textContent = `二周目（已通关 ${meta.clearCount} 次，见证 ${endings} 种结局）`;
  }

  const showView = (name) => {
    for (const view of views) {
      view.classList.toggle('is-active', view.dataset.view === name);
    }
    errorBox.hidden = true;
    errorBox.textContent = '';
    if (name === 'saves') renderSaves();
  };

  const dismiss = () => {
    document.removeEventListener('keydown', blockGameKeys, true);
    root.classList.add('is-hidden');
    setTimeout(() => root.remove(), 380);
  };

  const loadGame = (slot) => {
    const snap = loadSnapshot(slot);
    if (!snap) {
      errorBox.textContent = '这个存档已经不存在。';
      errorBox.hidden = false;
      renderSaves();
      return;
    }
    const ok = restore(game, snap);
    if (!ok || !game._pendingScene) {
      errorBox.textContent = '读取失败，存档数据无法恢复。';
      errorBox.hidden = false;
      return;
    }
    if (game.flags.new_game_plus) localStorage.setItem('keheng_new_game_plus', '1');
    else localStorage.removeItem('keheng_new_game_plus');
    game.loadScene(game._pendingScene, game._pendingSpawn);
    game._pendingScene = null;
    game._pendingSpawn = null;
    game.tutorial = null;
    game._saveMenu = null;
    game.uiPanel = null;
    game.showHint(`已读取${saveLabel(slot)}`);
    dismiss();
  };

  function renderSaves() {
    savesBox.replaceChildren();
    const saves = listSaves();
    if (!saves.length) {
      const empty = document.createElement('div');
      empty.className = 'start-menu__empty';
      empty.textContent = '暂无存档';
      savesBox.appendChild(empty);
      return;
    }
    for (const save of saves) {
      savesBox.appendChild(makeSaveButton(save, loadGame));
    }
  }

  function blockGameKeys(e) {
    if (!root.isConnected) return;
    if (['F2', 'F4', 'F6', 'F9', 'Tab', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'Escape') {
      const active = /** @type {HTMLElement} */ (root.querySelector('.start-menu__view.is-active'));
      if (active && active.dataset.view !== 'main') showView('main');
    }
    e.stopPropagation();
  }

  root.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const action = target && target.dataset ? target.dataset.action : null;
    if (!action) return;
    if (action === 'start') {
      localStorage.removeItem('keheng_new_game_plus');
      window.dispatchEvent(new CustomEvent('keheng:startIntro'));
    } else if (action === 'ngplus') {
      localStorage.setItem('keheng_new_game_plus', '1');
      window.dispatchEvent(new CustomEvent('keheng:startIntro'));
    } else if (action === 'endless') {
      if (game.startEndlessMode()) dismiss();
    } else if (action === 'saves') {
      showView('saves');
    } else if (action === 'about') {
      showView('about');
    } else if (action === 'back') {
      showView('main');
    }
  });

  document.addEventListener('keydown', blockGameKeys, true);
  return { close: dismiss };
}
