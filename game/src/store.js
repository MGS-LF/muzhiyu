import { VOCABULARY, getWord } from './data/vocabulary.js';
import { NPCS } from './data/npcs.js';

export const store = {
    width: 1280,
    height: 720,
    canvas: null,
    ctx: null,

    scene: 'opening',
    frameCount: 0,
    lastTime: 0,

    player: {
        x: 0,
        y: 300,
        w: 18,
        h: 18,
        vx: 0,
        vy: 0,
        dir: 'down',
        evolution: 0,
        invincible: 0,
        walkPhase: 0,
        battleSoul: { x: 0, y: 0, r: 8 }
    },

    camera: { x: 0, y: 300 },

    collectedWords: [], // 当前装备在身上（最多 6 个）
    backpackWords: [], // 背包，可存放更多字
    vocabSlots: 6,
    backpackOpen: false,
    semanticHP: 100,
    maxSemanticHP: 100,

    npcs: JSON.parse(JSON.stringify(NPCS)),

    input: {
        left: false,
        right: false,
        up: false,
        down: false,
        action: false,
        justAction: false,
        justInteract: false,
        map: false,
        counterSlot: -1
    },

    dialogue: { active: false, queue: [], onComplete: null, typing: '', index: 0, charIdx: 0 },

    mapOpen: false,

    keystones: {},
    keystoneUI: null,

    battle: null,

    world: {
        currentZone: 'ruins',
        transition: null
    },

    // 当前目标提示（屏幕左上方常驻显示，让玩家始终知道该干什么）
    objective: '',

    // 语义碎片（地图探索资源），收集到一定数量可在特定地点兑换奖励
    semanticShards: 0,

    // 玩家移动速度倍率（可由区域效果临时改变）
    speedMul: 1,

    flags: {
        openingDone: false,
        tutorialDone: false,
        littleBlueSaved: false,
        oldTreeSaved: false,
        sanctuaryBuilt: false,
        usedWordI: false,
        rubbleExcavated: {},  // 已翻过的碎石 id
        secretFound: false,   // 发现隐藏区域
        inkResolved: false,   // 墨水支线完成
        typewriterRead: false  // 打字机已读
    }
};

export function setObjective(text) {
    store.objective = text || '';
    const box = document.getElementById('objective-box');
    const el = document.getElementById('objective-text');
    if (el) el.textContent = store.objective;
    if (box) {
        if (store.objective) box.classList.remove('hidden');
        else box.classList.add('hidden');
    }
}

export function addWord(id) {
    const word = getWord(id);
    if (!word) return false;
    if (store.collectedWords.find(w => w.id === id) || store.backpackWords.some(w => w.id === id)) return false;
    if (store.collectedWords.length < store.vocabSlots) {
        store.collectedWords.push({ ...word });
    } else {
        store.backpackWords.push({ ...word });
    }
    updateVocabBar();
    updateBackpackUI();
    if (id === 'I') store.flags.usedWordI = true;
    return true;
}

export function addWordToBackpack(id) {
    const word = getWord(id);
    if (!word) return false;
    if (hasWord(id) || store.backpackWords.some(w => w.id === id)) return false;
    store.backpackWords.push({ ...word });
    return true;
}

export function equipWord(id) {
    // 从背包装备到身上
    const idx = store.backpackWords.findIndex(w => w.id === id);
    if (idx < 0) return false;
    if (store.collectedWords.length >= store.vocabSlots) {
        // 身上满了，把最后装备的塞回背包
        const overflow = store.collectedWords.pop();
        store.backpackWords.push({ ...overflow });
    }
    const word = store.backpackWords.splice(idx, 1)[0];
    store.collectedWords.push({ ...word });
    updateVocabBar();
    updateBackpackUI();
    return true;
}

export function unequipWord(id) {
    // 从身上卸下到背包
    const idx = store.collectedWords.findIndex(w => w.id === id);
    if (idx < 0) return false;
    const word = store.collectedWords.splice(idx, 1)[0];
    store.backpackWords.push({ ...word });
    updateVocabBar();
    updateBackpackUI();
    return true;
}

export function moveWordToBackpack(id) {
    if (!hasWord(id)) return false;
    return unequipWord(id);
}

export function isEquipped(id) {
    return store.collectedWords.some(w => w.id === id);
}

export function toggleBackpack() {
    store.backpackOpen = !store.backpackOpen;
    const panel = document.getElementById('backpack-panel');
    if (panel) {
        if (store.backpackOpen) panel.classList.remove('hidden');
        else panel.classList.add('hidden');
    }
    updateBackpackUI();
    return store.backpackOpen;
}

export function hasWord(id) {
    return store.collectedWords.some(w => w.id === id)
        || store.backpackWords.some(w => w.id === id);
}

export function removeWord(id) {
    const idx = store.collectedWords.findIndex(w => w.id === id);
    if (idx >= 0) {
        store.collectedWords.splice(idx, 1);
        return true;
    }
    return false;
}

export function updateVocabBar() {
    const bar = document.getElementById('vocab-bar');
    if (!bar) return;
    bar.innerHTML = '';
    for (let i = 0; i < store.vocabSlots; i++) {
        const w = store.collectedWords[i];
        const el = document.createElement('div');
        el.className = 'vocab-chip';
        if (w) {
            el.textContent = w.char;
            el.dataset.index = i;
            el.dataset.id = w.id;
            const key = i + 1;
            el.title = `[${key}] ${w.id}`;
        }
        bar.appendChild(el);
    }
}

export function updateBackpackUI() {
    const panel = document.getElementById('backpack-panel');
    if (!panel) return;
    const list = document.getElementById('backpack-list');
    if (!list) return;
    list.innerHTML = '';
    if (store.backpackWords.length === 0) {
        list.innerHTML = '<div class="backpack-empty">背包里空空如也。</div>';
    } else {
        for (let i = 0; i < store.backpackWords.length; i++) {
            const w = store.backpackWords[i];
            const el = document.createElement('div');
            el.className = 'backpack-chip';
            el.textContent = w.char;
            el.dataset.id = w.id;
            el.title = '点击装备';
            el.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                equipWord(w.id);
            });
            list.appendChild(el);
        }
    }
    const equipped = document.getElementById('backpack-equipped');
    if (equipped) {
        equipped.innerHTML = '';
        for (const w of store.collectedWords) {
            const el = document.createElement('div');
            el.className = 'backpack-chip equipped';
            el.textContent = w.char;
            el.dataset.id = w.id;
            el.title = '点击卸下到背包';
            el.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                unequipWord(w.id);
            });
            equipped.appendChild(el);
        }
    }
}

export function updateHP() {
    const fill = document.getElementById('hp-fill');
    if (fill) {
        const pct = Math.max(0, store.semanticHP / store.maxSemanticHP * 100);
        fill.style.width = `${pct}%`;
        fill.style.background = pct < 30 ? '#ff4444' : '#fff';
    }
}

export function closeBackpack() {
    store.backpackOpen = false;
    const panel = document.getElementById('backpack-panel');
    if (panel) panel.classList.add('hidden');
}

export function showDialogue(lines, onComplete = null) {
    closeBackpack();
    store.dialogue.active = true;
    store.dialogue.queue = Array.isArray(lines) ? lines : [lines];
    store.dialogue.onComplete = onComplete;
    store.dialogue.index = 0;
    store.dialogue.charIdx = 0;
    store.dialogue.typing = '';
    const box = document.getElementById('dialogue-box');
    if (box) box.classList.remove('hidden');
}


export function advanceDialogue() {
    const d = store.dialogue;
    if (d.charIdx < d.queue[d.index].length) {
        d.charIdx = d.queue[d.index].length;
        d.typing = d.queue[d.index];
    } else {
        d.index++;
        d.charIdx = 0;
        d.typing = '';
        if (d.index >= d.queue.length) {
            closeDialogue();
        }
    }
}

export function closeDialogue() {
    store.dialogue.active = false;
    const box = document.getElementById('dialogue-box');
    if (box) box.classList.add('hidden');
    if (store.dialogue.onComplete) {
        const cb = store.dialogue.onComplete;
        store.dialogue.onComplete = null;
        cb();
    }
}

export function resize() {
    const canvas = store.canvas;
    if (!canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    store.width = w;
    store.height = h;
}

export function takeDamage(amount) {
    // 无敌帧只做视觉反馈，不再吞掉所有伤害
    // 真实伤害 = 原始值，无敌时伤害减半（让玩家能持续感受到压力）
    if (store.player.invincible > 0) {
        amount = Math.max(1, Math.floor(amount * 0.5));
    }
    store.semanticHP = Math.max(0, store.semanticHP - amount);
    store.player.invincible = 30; // 短暂无敌避免连续扣血（约 0.5s）
    updateHP();
    if (store.semanticHP <= 0) {
        gameOver();
    }
}

export function gameOver(reason = 'semantic') {
    if (store.dead) return;
    store.dead = true;
    showDialogue([
        '你的语义值耗尽了。',
        '语言在黑暗中碎裂，你退回最后一个醒来的地方。',
        '按空格 / 点击重新开始这一段。'
    ], () => {
        resetRun();
    });
}

export function resetRun() {
    store.dead = false;
    store.semanticHP = store.maxSemanticHP;
    store.player.invincible = 0;
    updateHP();
    resetPlayerPos(0, 300);
    // 不重置已收集的词与进度，只回复语义值并回起点
}




export function heal(amount) {
    store.semanticHP = Math.min(store.maxSemanticHP, store.semanticHP + amount);
    updateHP();
}

export function resetPlayerPos(x, y) {
    store.player.x = x;
    store.player.y = y;
    store.player.dir = 'down';
    store.camera.x = x;
    store.camera.y = y;
    store.player.battleSoul.x = x;
    store.player.battleSoul.y = y;
}

export function transitionToZone(zoneId, x, y) {
    store.world.transition = { from: store.world.currentZone, to: zoneId, x, y, t: 0, phase: 'out' };
}
