import { store, resize, updateVocabBar, updateHP, advanceDialogue, toggleBackpack, equipWord, unequipWord } from './store.js';
import { OPENING } from './scenes/opening.js';
import { TUTORIAL } from './scenes/tutorial.js';
import { updateWorld, drawWorld } from './scenes/world.js';
import { SANCTUARY } from './scenes/sanctuary.js';
import { drawMap } from './canvas/map.js';
import { drawKeystoneUI, handleKeystoneInput } from './canvas/keystone.js';
import { particles } from './canvas/particles.js';
import AudioSys from './utils/audio.js';

// 调试模式：F1 开关面板，0~6 跳地图
const DEBUG_TELEPORTS = [
    { key: '0', label: '打字机废墟',  zone: 'ruins',    x: 0,    y: 0   },
    { key: '1', label: '垃圾回廊',   zone: 'corridor', x: 0,    y: 1000 },
    { key: '2', label: '嘎吱空地',   zone: 'clearing', x: 0,    y: 500 },
    { key: '3', label: '废墟东隅',   zone: 'depths',   x: -200, y: 0  },
    { key: '4', label: '荧光河床',   zone: 'riverbed', x: 0,    y: 0   },
    { key: '5', label: '石碑密室',   zone: 'steles',   x: 0,    y: 0   },
    { key: '6', label: '语言避难所', zone: 'sanctuary', x: 0,   y: 300 }
];
let debugPanelOpen = false;

// 全局错误捕获，便于诊断白屏
window.addEventListener('error', e => {
    console.error('[GAME ERROR]', e.message, e.filename, e.lineno);
    document.body.insertAdjacentHTML('beforeend',
        `<div style="position:fixed;top:0;left:0;right:0;background:#400;color:#f88;padding:8px;font:12px monospace;z-index:9999">${e.message} @ ${e.filename}:${e.lineno}</div>`);
});

let ctx = null;
let running = true;

function init() {
    store.canvas = document.getElementById('game-canvas');
    ctx = store.canvas.getContext('2d');
    resize();
    updateVocabBar();
    updateHP();
    bindInput();
    requestAnimationFrame(loop);
}

function bindInput() {
    window.addEventListener('resize', resize);

    window.addEventListener('keydown', e => {
        AudioSys.resume();
        // 要石刻文 UI 优先处理键盘
        if (store.keystoneUI && store.keystoneUI.open) {
            if (handleKeystoneInput(e)) { e.preventDefault(); return; }
        }
        if (store.dialogue.active) {
            if (e.code === 'Space' || e.code === 'Enter') advanceDialogue();
            return;
        }
        if (e.code === 'KeyB') {
            if (store.scene !== 'battle') {
                AudioSys.pop(880);
                toggleBackpack();
            } else {
                AudioSys.pop(220);
            }
            e.preventDefault();
            return;
        }
        // 调试模式：F1 切换面板
        if (e.code === 'F2') {
            debugPanelOpen = !debugPanelOpen;
            AudioSys.pop(660);
            e.preventDefault();
            return;
        }
        // 调试模式：0~6 快速跳转
        if (debugPanelOpen && e.code.startsWith('Digit')) {
            const idx = parseInt(e.code.slice(5), 10);
            const t = DEBUG_TELEPORTS.find(x => parseInt(x.key, 10) === idx);
            if (t) {
                if (t.zone === 'sanctuary') {
                    store.scene = 'sanctuary';
                    SANCTUARY.reset();
                    store.player.x = t.x; store.player.y = t.y;
                    store.camera.x = t.x; store.camera.y = t.y;
                } else {
                    store.world.currentZone = t.zone;
                    store.world.transition = null;
                    store.player.x = t.x; store.player.y = t.y;
                    store.camera.x = t.x; store.camera.y = t.y;
                }
                AudioSys.ding();
                e.preventDefault();
                return;
            }
        }
        if (store.backpackOpen && store.scene !== 'battle') {
            if (e.code.startsWith('Digit')) {
                const idx = parseInt(e.code.slice(5), 10) - 1;
                if (idx >= 0 && idx < store.vocabSlots) {
                    const w = store.collectedWords[idx];
                    if (w) unequipWord(w.id);
                }
            }
            return;
        }
        if (store.scene === 'battle' && e.code.startsWith('Digit')) {
            const idx = parseInt(e.code.slice(5), 10) - 1;
            if (idx >= 0 && idx < 6) {
                store.input.counterSlot = idx;
            }
            return;
        }
        switch (e.code) {
            case 'ArrowLeft': case 'KeyA': store.input.left = true; break;
            case 'ArrowRight': case 'KeyD': store.input.right = true; break;
            case 'ArrowUp': case 'KeyW': store.input.up = true; break;
            case 'ArrowDown': case 'KeyS': store.input.down = true; break;
            case 'Space': store.input.action = true; store.input.justAction = true; store.input.justInteract = true; break;
            case 'KeyE': store.input.justInteract = true; break;
            case 'KeyM': store.mapOpen = !store.mapOpen; AudioSys.pop(440); break;
        }
    });

    window.addEventListener('keyup', e => {
        switch (e.code) {
            case 'ArrowLeft': case 'KeyA': store.input.left = false; break;
            case 'ArrowRight': case 'KeyD': store.input.right = false; break;
            case 'ArrowUp': case 'KeyW': store.input.up = false; break;
            case 'ArrowDown': case 'KeyS': store.input.down = false; break;
            case 'Space': store.input.action = false; break;
        }
    });

    const actionZone = document.getElementById('action-zone');
    actionZone.addEventListener('pointerdown', e => {
        e.preventDefault();
        AudioSys.resume();
        if (store.dialogue.active) { advanceDialogue(); return; }
        store.input.action = true;
        store.input.justAction = true;
        store.input.justInteract = true;
    });
    actionZone.addEventListener('pointerup', e => {
        e.preventDefault();
        store.input.action = false;
    });
    actionZone.addEventListener('pointercancel', () => { store.input.action = false; });

    document.getElementById('game-wrapper').addEventListener('click', e => {
        if (e.target.closest('#joystick-zone') || e.target.closest('#action-zone')) return;
        if (store.dialogue.active) advanceDialogue();
    });
    document.getElementById('game-wrapper').addEventListener('pointerdown', e => {
        if (e.target.closest('#joystick-zone') || e.target.closest('#action-zone')) return;
        AudioSys.resume();
        if (store.dialogue.active) {
            advanceDialogue();
        } else if (store.mapOpen) {
            store.mapOpen = false; AudioSys.pop(440);
        } else {
            store.input.action = true;
            store.input.justAction = true;
            store.input.justInteract = true;
        }
    });
    document.getElementById('game-wrapper').addEventListener('pointerup', e => {
        if (e.target.closest('#joystick-zone') || e.target.closest('#action-zone')) return;
        store.input.action = false;
    });

    // 移动端虚拟摇杆（2D 四方向）
    const joyZone = document.getElementById('joystick-zone');
    const joyKnob = document.getElementById('joystick-knob');
    let joyTouch = null;

    joyZone.addEventListener('pointerdown', e => {
        e.preventDefault();
        joyTouch = e.pointerId;
        joyKnob.setPointerCapture(e.pointerId);
        updateJoystick(e);
    });
    joyKnob.addEventListener('pointermove', e => {
        if (joyTouch !== e.pointerId) return;
        updateJoystick(e);
    });
    joyKnob.addEventListener('pointerup', e => {
        if (joyTouch !== e.pointerId) return;
        joyTouch = null;
        joyKnob.style.transform = 'translate(-50%, -50%)';
        store.input.left = store.input.right = store.input.up = store.input.down = false;
    });

    function updateJoystick(e) {
        const rect = joyZone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), rect.width / 2 - 22);
        const angle = Math.atan2(dy, dx);
        const nx = Math.cos(angle) * dist;
        const ny = Math.sin(angle) * dist;
        joyKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
        const TH = 12;
        store.input.left = nx < -TH;
        store.input.right = nx > TH;
        store.input.up = ny < -TH;
        store.input.down = ny > TH;
    }
}

function loop() {
    if (!running) return;
    store.frameCount++;
    const t = store.frameCount;

    if (store.dialogue.active) {
        const d = store.dialogue;
        if (d.charIdx < d.queue[d.index].length) {
            d.charIdx++;
            d.typing = d.queue[d.index].slice(0, d.charIdx);
        }
        const el = document.getElementById('dialogue-text');
        if (el) el.textContent = d.typing;
    }

    if (store.mapOpen) {
        // 地图打开时只画地图，不更新场景
        ctx.clearRect(0, 0, store.width, store.height);
        drawMap(ctx);
        // 关闭地图用 M（在 keydown 已处理）或点击
        requestAnimationFrame(loop);
        return;
    }

    if (store.scene === 'opening') {
        OPENING.update();
    } else if (store.scene === 'tutorial') {
        TUTORIAL.update();
    } else if (store.scene === 'world') {
        updateWorld();
    } else if (store.scene === 'sanctuary') {
        SANCTUARY.update();
    } else if (store.scene === 'battle') {
        if (store.battle) store.battle.update();
    }

    ctx.clearRect(0, 0, store.width, store.height);

    if (store.scene === 'opening') {
        OPENING.draw(ctx);
    } else if (store.scene === 'tutorial') {
        TUTORIAL.draw(ctx, t);
    } else if (store.scene === 'world') {
        drawWorld(ctx, t);
    } else if (store.scene === 'sanctuary') {
        SANCTUARY.draw(ctx, t);
    } else if (store.scene === 'battle') {
        if (store.battle) store.battle.draw(ctx);
    }

    // 要石刻文 UI 覆盖层
    if (store.keystoneUI && store.keystoneUI.open) {
        drawKeystoneUI(ctx, t);
    }

    // 调试模式面板（F1 切换）
    if (debugPanelOpen) drawDebugPanel(ctx, t);

    // 战斗结束 → 胜利进入语言避难所，失败回世界起点
    if (store.scene === 'battle' && store.battle && store.battle.finished && !store.battle.transitioning) {
        store.battle.transitioning = true;
        setTimeout(() => {
            if (store.battle.failed) {
                // 失败已在 failBattle 中触发 gameOver，这里只清理战场
                store.battle = null;
                return;
            }
            store.npcs.oldTree.purified = true;
            store.npcs.oldTree.following = true;
            store.player.evolution = Math.max(store.player.evolution, 2);
            store.flags.oldTreeSaved = true;
            store.battle = null;
            SANCTUARY.reset();
            store.scene = 'sanctuary';
            // 避难所的 intro 对话由 SANCTUARY.update 自行处理
        }, 5200);
    }

    requestAnimationFrame(loop);
}

function drawDebugPanel(ctx, t) {
    // 半透明黑底
    const W = 280, H = DEBUG_TELEPORTS.length * 28 + 56;
    const x = store.width - W - 16, y = 60;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.strokeStyle = 'rgba(120,180,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, W, H, 8);
    else ctx.rect(x, y, W, H);
    ctx.fill();
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#ffd87a';
    ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('调试模式 · 快速传送 (F1 关闭)', x + 12, y + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText('按数字键瞬移到对应地图', x + 12, y + 30);

    // 列表
    const curZoneId = store.scene === 'sanctuary' ? 'sanctuary' : store.world.currentZone;
    for (let i = 0; i < DEBUG_TELEPORTS.length; i++) {
        const tp = DEBUG_TELEPORTS[i];
        const ly = y + 56 + i * 28;
        const isCurrent = tp.zone === curZoneId;
        // 当前地图高亮
        if (isCurrent) {
            ctx.fillStyle = 'rgba(255,216,122,0.18)';
            ctx.fillRect(x + 6, ly - 4, W - 12, 24);
        }
        // 数字键标记
        ctx.fillStyle = isCurrent ? '#ffd87a' : 'rgba(150,200,255,0.95)';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`[${tp.key}]`, x + 12, ly);
        // 名称
        ctx.fillStyle = isCurrent ? '#ffd87a' : 'rgba(255,255,255,0.85)';
        ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.fillText(tp.label, x + 48, ly);
        // 当前位置标记
        if (isCurrent) {
            ctx.fillStyle = '#ffd87a';
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('◀ 当前', x + W - 12, ly);
        }
    }
    ctx.restore();
}

init();
