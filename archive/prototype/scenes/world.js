// 世界场景主逻辑：状态机 / 实体更新 / 输入分发
// 物件定义见 ./zones/，剧本见 ./narrative.js，绘制见 ./worldDrawing.js

import { store, addWord, hasWord, removeWord, showDialogue, takeDamage, updateVocabBar, transitionToZone, setObjective, updateHP } from '../store.js';
import { getWord } from '../data/vocabulary.js';
import { drawText } from '../canvas/renderer.js';
import { particles } from '../canvas/particles.js';
import { updatePlayerPhysics2D, updateCamera2D, drawPlayer25D, project, drawBlock } from '../canvas/player.js';
import { createParrotBattle } from '../canvas/battle.js';
import { interactKeystone, isKeystoneActive } from '../canvas/keystone.js';
import { rand, clamp } from '../utils/easing.js';
import AudioSys from '../utils/audio.js';

import { ZONES, ZONE_ENV, RUBBLE_POOLS, RUBBLE_STORIES, WORD_CHAR } from './zones/index.js';
import { SANCTUARY } from './sanctuary.js';
import {
    TYPEWRITER_DIALOGUE, TYPEWRITER_REPEAT, TYPEWRITER_GENERIC,
    LITTLE_BLUE_PURIFIED, LITTLE_BLUE_PURIFY_DONE, LITTLE_BLUE_PURIFY_HINT, LITTLE_BLUE_TALKS,
    OLD_TREE_PURIFIED, OLD_TREE_PURIFY_INTRO, OLD_TREE_PURIFY_HINT, OLD_TREE_TALKS,
    WORLD_ENTER_DIALOGUE, GATE_OPENED, GATE_HINT,
    SECRET_GATE_BLOCKED, SECRET_GATE_OPEN,
    RUBBLE_FOUND_WORD, RUBBLE_STORY_FOUND, RUBBLE_SHARDS_FOUND, RUBBLE_REVISIT,
    WORD_SPIRIT_CAUGHT, STELE_FIRST_READ, STELE_REVISIT,
    ALTAR_HEAL, ALTAR_HINT,
    INK_TALKS, INK_RESOLVE, ECHO_TALKS
} from './narrative.js';
import {
    drawGround, drawObject, drawExits, drawWordSpiritForRender
} from './worldDrawing.js';
import { worldState } from './worldState.js';

// ---- 运行时状态 ----
let pollutions = [];
let initialized = false;
let worldEntered = false;
let wordSpirits = [];

// ============== 初始化 ==============
function initWorld() {
    if (initialized) return;
    initialized = true;
    pollutions = [];
    for (let i = 0; i < 40; i++) {
        pollutions.push({
            zone: ['corridor', 'clearing'][Math.floor(Math.random() * 2)],
            x: rand(-400, 400),
            y: rand(-200, 1000),
            vx: rand(-0.3, 0.3),
            vy: rand(-0.3, 0.3),
            text: ['绝', '笑', '死', '破', '防', 'YYDS', 'awsl'][Math.floor(Math.random() * 7)],
            size: rand(11, 16),
            color: ['#ff00cc', '#39ff14', '#ffcc00'][Math.floor(Math.random() * 3)]
        });
    }
    // 词灵：从 zone 静态定义生成运行时实例
    wordSpirits = [];
    for (const z of Object.values(ZONES)) {
        for (const obj of z.objects) {
            if (obj.type === 'wordSpirit' && !obj.collected) {
                wordSpirits.push({
                    zone: z.id, x: obj.x, y: obj.y,
                    id: obj.id, patrol: obj.patrol,
                    collected: false,
                    vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5),
                    fleeTimer: 0
                });
            }
        }
    }
}

function curZone() {
    return ZONES[store.world.currentZone];
}

// ============== 语义碎片 ==============
export function updateShardCount() {
    const el = document.getElementById('shard-count');
    if (el) el.textContent = `◇ ${store.semanticShards}`;
}

function collectShard(obj) {
    obj.collected = true;
    const mul = ZONE_ENV[store.world.currentZone]?.effect === 'focus' ? 2 : 1;
    store.semanticShards += mul;
    updateShardCount();
    AudioSys.collect();
    particles.emit(obj.x, obj.y, 10, '#ffd87a', 'spark');
}

// ============== 交互处理器 ==============

function handleRubbleInteract(obj) {
    if (obj._excavated) {
        showDialogue(RUBBLE_REVISIT);
        return;
    }
    obj._excavated = true;
    store.flags.rubbleExcavated[obj._id] = true;
    AudioSys.pop(330);

    const roll = Math.random();
    const pool = RUBBLE_POOLS[store.world.currentZone] || RUBBLE_POOLS.ruins;
    const wordCandidate = pool.find(item => roll < item.rate);
    if (wordCandidate && !hasWord(wordCandidate.id) && !store.backpackWords.some(w => w.id === wordCandidate.id)) {
        const w = getWord(wordCandidate.id);
        addWord(wordCandidate.id);
        updateVocabBar();
        showDialogue(RUBBLE_FOUND_WORD(w ? w.char : wordCandidate.id));
    } else if (roll < 0.7) {
        const story = RUBBLE_STORIES[Math.floor(Math.random() * RUBBLE_STORIES.length)];
        store.semanticShards += 2;
        updateShardCount();
        showDialogue(RUBBLE_STORY_FOUND(story));
    } else {
        store.semanticShards += 1;
        updateShardCount();
        showDialogue(RUBBLE_SHARDS_FOUND);
    }
}

function handleSecretGate(obj) {
    if (!hasWord(obj.require)) {
        const c = WORD_CHAR[obj.require] || obj.require;
        showDialogue(SECRET_GATE_BLOCKED(c));
        return;
    }
    store.flags.secretFound = true;
    AudioSys.ding();
    particles.emit(obj.x, obj.y, 40, '#aabbff', 'spark');
    showDialogue(SECRET_GATE_OPEN, () => {
        transitionToZone(obj.toZone, obj.toX, obj.toY);
    });
}

function handleSteleInteract(obj) {
    if (obj._read) {
        showDialogue(STELE_REVISIT(obj.content));
    } else {
        obj._read = true;
        store.semanticShards += 3;
        updateShardCount();
        AudioSys.ding();
        showDialogue(STELE_FIRST_READ(obj.content));
    }
}

function handleAltarInteract(obj) {
    const cost = 8;
    const healAmt = 30;
    if (store.semanticShards >= cost) {
        store.semanticShards -= cost;
        updateShardCount();
        store.semanticHP = Math.min(store.maxSemanticHP, store.semanticHP + healAmt);
        updateHP();
        AudioSys.ding();
        particles.emit(obj.x, obj.y, 30, '#ffd87a', 'spark');
        showDialogue(ALTAR_HEAL(cost, healAmt, store.semanticShards));
    } else {
        showDialogue(ALTAR_HINT(cost, store.semanticShards));
    }
}

// ============== 词灵 ==============
function updateWordSpirits() {
    const px = store.player.x, py = store.player.y;
    for (const sp of wordSpirits) {
        if (sp.zone !== store.world.currentZone || sp.collected) continue;
        const dx = sp.x - px, dy = sp.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) sp.fleeTimer = 60;
        if (sp.fleeTimer > 0) {
            sp.fleeTimer--;
            const nx = dx / (dist + 0.1), ny = dy / (dist + 0.1);
            sp.vx += nx * 0.08;
            sp.vy += ny * 0.08;
        } else {
            const pdx = sp.patrol.cx - sp.x, pdy = sp.patrol.cy - sp.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pdist > sp.patrol.r) {
                sp.vx += (pdx / pdist) * 0.04;
                sp.vy += (pdy / pdist) * 0.04;
            } else {
                sp.vx += (-pdy / pdist) * 0.015;
                sp.vy += (pdx / pdist) * 0.015;
            }
        }
        sp.vx *= 0.95;
        sp.vy *= 0.93;
        sp.vx = clamp(sp.vx, -2, 2);
        sp.vy = clamp(sp.vy, -2, 2);
        sp.x += sp.vx;
        sp.y += sp.vy;

        if (dist < 32) {
            sp.collected = true;
            addWord(sp.id);
            updateVocabBar();
            store.semanticShards += 2;
            updateShardCount();
            AudioSys.collect();
            particles.emit(sp.x, sp.y, 20, '#88ffcc', 'spark');
            const w = getWord(sp.id);
            showDialogue(WORD_SPIRIT_CAUGHT(w ? w.char : sp.id));
        }
    }
    wordSpirits = wordSpirits.filter(sp => !sp.collected);
}

// ============== 打字机事件 ==============
function handleTypewriter() {
    if (!worldState.typewriterRead) {
        worldState.typewriterRead = true;
        store.flags.typewriterRead = true;
        worldState.typewriterNoisePlayed = true;
        worldState.typewriterFxTimer = 240;
        AudioSys.thud();
        showDialogue(TYPEWRITER_DIALOGUE, () => {
            AudioSys.ding();
            particles.emit(0, 0, 50, '#fff', 'spark');
        });
        return;
    }
    const idx = (handleTypewriter._reads = (handleTypewriter._reads || 1) + 1);
    AudioSys.pop(440 + idx * 30);
    const script = TYPEWRITER_REPEAT[idx - 1];
    if (script) {
        showDialogue(script);
    } else {
        showDialogue(TYPEWRITER_GENERIC(idx));
    }
}

// ============== NPC 对话 ==============
function handleNpc(obj) {
    const npc = store.npcs[obj.id];
    if (!npc) return;
    if (obj.id === 'littleBlue') {
        handleLittleBlue(obj, npc);
    } else if (obj.id === 'oldTree') {
        handleOldTree(obj, npc);
    } else if (obj.id === 'ink') {
        handleInk(obj, npc);
    } else if (obj.id === 'echo') {
        handleEcho(obj, npc);
    }
}

function handleInk(obj, npc) {
    npc.talkCount = (npc.talkCount || 0) + 1;
    AudioSys.pop(520 + npc.talkCount * 30);
    const idx = Math.min(npc.talkCount, INK_TALKS.length);

    // 第 4 次对话赠送语义碎片
    if (npc.talkCount === 4) {
        showDialogue(INK_TALKS[idx - 1], () => {
            store.semanticShards += 5;
            particles.emit(obj.x, obj.y, 24, '#4488ff', 'spark');
        });
    } else if (npc.talkCount >= INK_TALKS.length) {
        // 超出后触发 resolve（如果还没触发过）
        if (!store.flags.inkResolved) {
            store.flags.inkResolved = true;
            showDialogue(INK_RESOLVE, () => {
                // 墨水消散后，在河床留一个永久 sign
                const zone = curZone();
                zone.objects.push({ type: 'sign', x: -100, y: 220, text: '「——而阳光落在纸上的时候，就够了。」' });
                particles.emit(obj.x, obj.y, 50, '#88ccff', 'spark');
                AudioSys.ding();
            });
        } else {
            showDialogue(INK_TALKS[INK_TALKS.length - 1]);
        }
    } else {
        showDialogue(INK_TALKS[idx - 1]);
    }
}

function handleEcho(obj, npc) {
    npc.talkCount = (npc.talkCount || 0) + 1;
    AudioSys.pop(380 + npc.talkCount * 25); // 更低的音调
    const idx = Math.min(npc.talkCount, ECHO_TALKS.length);
    showDialogue(ECHO_TALKS[idx - 1]);
}

function handleLittleBlue(obj, npc) {
    if (!npc.purified) {
        showDialogue(LITTLE_BLUE_PURIFIED, () => {
            if (hasWord('listen')) {
                removeWord('listen');
                npc.purified = true;
                npc.following = true;
                store.player.evolution = Math.max(store.player.evolution, 1);
                store.flags.littleBlueSaved = true;
                updateVocabBar();
                AudioSys.ding();
                particles.emit(obj.x, obj.y, 40, '#fff', 'spark');
                showDialogue(LITTLE_BLUE_PURIFY_DONE);
            } else {
                showDialogue(LITTLE_BLUE_PURIFY_HINT);
            }
        });
    } else {
        obj._talks = (obj._talks || 0) + 1;
        AudioSys.pop(660 + obj._talks * 20);
        const idx = Math.min(obj._talks, LITTLE_BLUE_TALKS.length);
        const lines = LITTLE_BLUE_TALKS[idx - 1];
        if (obj._talks === 3) {
            // 第 3 次对话会送"安"字
            showDialogue(lines, () => {
                addWord('safe');
                updateVocabBar();
                particles.emit(obj.x, obj.y, 20, '#4488ff', 'spark');
            });
        } else {
            showDialogue(lines);
        }
    }
}

function handleOldTree(obj, npc) {
    if (!npc.purified) {
        showDialogue(OLD_TREE_PURIFIED, () => {
            if (hasWord('slow') && hasWord('true') && hasWord('ask')) {
                showDialogue(OLD_TREE_PURIFY_INTRO, () => {
                    store.scene = 'battle';
                    store.battle = createParrotBattle();
                });
            } else {
                const need = [];
                if (!hasWord('slow')) need.push('慢');
                if (!hasWord('true')) need.push('真');
                if (!hasWord('ask')) need.push('问');
                const lines = [...OLD_TREE_PURIFY_HINT];
                lines[2] = `「${need.join('·')}」`;
                showDialogue(lines);
            }
        });
    } else {
        obj._talks = (obj._talks || 0) + 1;
        AudioSys.pop(440 + obj._talks * 20);
        const idx = Math.min(obj._talks, OLD_TREE_TALKS.length);
        showDialogue(OLD_TREE_TALKS[idx - 1]);
    }
}

// ============== 目标提示 ==============
function updateZoneObjective() {
    const zone = store.world.currentZone;
    if (zone === 'ruins') {
        if (!hasWord('light')) setObjective('探索废墟，收集散落的词汇（留意「光」字）');
        else setObjective('向北前往垃圾回廊');
    } else if (zone === 'corridor') {
        if (!store.flags.littleBlueSaved) {
            if (!hasWord('listen')) setObjective('寻找「听」字，再去救小蓝');
            else setObjective('用「听」字净化小蓝');
        } else if (!isKeystoneActive('corridor')) {
            setObjective('去触碰南边的「要石」，刻下真心话');
        } else {
            setObjective('向北前往嘎吱空地');
        }
    } else if (zone === 'clearing') {
        if (!store.flags.oldTreeSaved) {
            const need = [];
            if (!hasWord('slow')) need.push('慢');
            if (!hasWord('true')) need.push('真');
            if (!hasWord('ask')) need.push('问');
            if (need.length > 0) setObjective(`收集「${need.join('·')}」`);
            else setObjective('去净化空地中央的鹦鹉螺');
        } else {
            setObjective('净化完成——走向北边的光');
        }
    } else if (zone === 'depths') {
        setObjective('废墟深处有黑暗阻挡，带上「光」寻找遗失的词');
    } else if (zone === 'riverbed') {
        if (!store.flags.inkResolved) setObjective('河床有人在等一个答案——去水边看看');
        else setObjective('沿荧光河床收集散落的词（「开」「我」）');
    } else if (zone === 'steles') {
        setObjective('阅读石碑；这里有一个由删除消息拼成的"人"');
    }
}

// ============== 主更新循环 ==============
export function updateWorld() {
    initWorld();

    if (!worldEntered) {
        worldEntered = true;
        updateShardCount();
        setTimeout(() => showDialogue(WORLD_ENTER_DIALOGUE), 400);
    }

    updateZoneObjective();
    if (store.backpackOpen) return;

    // 区域环境效果
    const env = ZONE_ENV[store.world.currentZone];
    store.speedMul = 1;
    if (env && env.effect === 'swift') store.speedMul = 1.35;
    if (env && env.effect === 'regen' && store.frameCount % 180 === 0) {
        store.semanticHP = Math.min(store.maxSemanticHP, store.semanticHP + 1);
        updateHP();
    }

    updatePlayerPhysics2D(1 / 60);

    const b = curZone().bounds;
    store.player.x = clamp(store.player.x, b.minX + 20, b.maxX - 20);
    store.player.y = clamp(store.player.y, b.minY + 20, b.maxY - 20);
    updateCamera2D();

    // 打字机门淡入动画：读打字机后，在打字机特效倒计时内慢慢淡入
    // typewriterFxTimer 从 240 倒数到 0，对应"打字机碎裂/全息"期间
    // 门在 fxTimer 倒数到 ~120（剩一半特效时间）时开始淡入，配合全息文字消逝
    if (worldState.typewriterRead && worldState.typewriterGateAlpha < 1) {
        // 当 fxTimer 还在 240 时，alpha=0；fxTimer 跌到 0 时，alpha=1
        // 即：alpha = 1 - fxTimer/240（钳制在 [0,1]）
        const target = clamp(1 - worldState.typewriterFxTimer / 120, 0, 1);
        // 平滑过渡，每帧向 target 推进一点
        if (target > worldState.typewriterGateAlpha) {
            worldState.typewriterGateAlpha = Math.min(target, worldState.typewriterGateAlpha + 0.015);
        }
    }

    // 传送门冷却：刚传送到新区域时，给 0.6s 缓冲，避免按键还按着导致立刻又穿回去
    if (worldState.portalCooldown === undefined) worldState.portalCooldown = 0;
    if (worldState.portalCooldown > 0) worldState.portalCooldown--;

    // 传送门
    if (!store.world.transition && worldState.portalCooldown === 0) {
        for (const ex of curZone().exits) {
            if (store.world.currentZone === 'ruins' && ex.toZone === 'corridor') {
                // 门在读完打字机前完全隐形（alpha=0）；读完后从 0 淡入到 1
                // 只要读过打字机就放行（alpha 仅控制渲染可见度，不阻塞通行）
                if (!store.flags.typewriterRead) continue;
            }
            // 通用 lock 条件：ex.lock = { flag: 'someFlag' } 时，必须该 flag 为 true 才放行
            if (ex.lock && ex.lock.flag && !store.flags[ex.lock.flag]) continue;
            if (Math.abs(store.player.x - ex.x) < ex.w / 2 && Math.abs(store.player.y - ex.y) < ex.h / 2) {
                // 目标可能是 zone（默认），也可能是独立 scene（如 sanctuary）
                if (ex.toScene) {
                    AudioSys.ding();
                    store.scene = ex.toScene;
                    if (ex.toScene === 'sanctuary' && typeof SANCTUARY !== 'undefined' && SANCTUARY.reset) SANCTUARY.reset();
                    if (typeof ex.toX === 'number') store.player.x = ex.toX;
                    if (typeof ex.toY === 'number') store.player.y = ex.toY;
                    worldState.portalCooldown = 36;
                    break;
                }
                transitionToZone(ex.toZone, ex.toX, ex.toY);
                AudioSys.ding();
                break;
            }
        }
    }

    // 区域切换淡入淡出
    if (store.world.transition) {
        const tr = store.world.transition;
        tr.t += 0.04;
        if (tr.phase === 'out' && tr.t >= 1) {
            store.world.currentZone = tr.to;
            store.player.x = tr.x; store.player.y = tr.y;
            store.camera.x = tr.x; store.camera.y = tr.y;
            tr.phase = 'in';
        } else if (tr.phase === 'in' && tr.t >= 2) {
            store.world.transition = null;
            // 传送门冷却：0.6s 缓冲（约 36 帧 @60fps）
            worldState.portalCooldown = 36;
        }
        return;
    }

    // 污染粒子
    for (const p of pollutions) {
        if (p.zone !== store.world.currentZone) continue;
        p.x += p.vx; p.y += p.vy;
        const dx = p.x - store.player.x, dy = p.y - store.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 28) {
            const dmg = (env && env.effect === 'corrupt') ? 2 : 1;
            takeDamage(dmg);
            particles.emit(p.x, p.y, 6, p.color, 'spark');
            p.x += rand(-60, 60); p.y += rand(-60, 60);
        }
    }

    // 语义碎片
    for (const obj of curZone().objects) {
        if (obj.type !== 'shard' || obj.collected) continue;
        const dx = obj.x - store.player.x, dy = obj.y - store.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) collectShard(obj);
    }

    // 词汇
    for (const obj of curZone().objects) {
        if (obj.type !== 'word' || obj.collected) continue;
        const dx = obj.x - store.player.x, dy = obj.y - store.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 36) {
            obj.collected = true;
            addWord(obj.id);
            updateVocabBar();
            AudioSys.collect();
            particles.emit(obj.x, obj.y, 16, '#fff', 'spark');
        }
    }

    // 词灵
    updateWordSpirits();

    // 黑暗屏障
    for (const obj of curZone().objects) {
        if (obj.type !== 'gate' || obj.open || store.dialogue.active) continue;
        const dx = obj.x - store.player.x, dy = obj.y - store.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 80) {
            if (hasWord(obj.require)) {
                obj.open = true;
                const w = obj.wordBehind;
                if (w) curZone().objects.push({ type: 'word', id: w.id, x: w.x, y: w.y });
                AudioSys.ding();
                particles.emit(obj.x, obj.y, 24, '#fff', 'spark');
                const reqWord = getWord(obj.require);
                showDialogue(GATE_OPENED(reqWord ? reqWord.char : obj.require));
            } else if (store.input.justInteract) {
                store.input.justInteract = false;
                const reqWord = getWord(obj.require);
                showDialogue(GATE_HINT(reqWord ? reqWord.char : obj.require));
            }
        }
    }

    // 主动交互
    if (store.input.justInteract) {
        store.input.justInteract = false;
        const zone = curZone();

        // 打字机
        if (store.world.currentZone === 'ruins') {
            const tw = zone.objects.find(o => o.type === 'typewriter');
            if (tw && Math.hypot(tw.x - store.player.x, tw.y - store.player.y) < 90) {
                handleTypewriter();
                return;
            }
        }

        // 交互碎石
        let bestRubble = null, bestD = 60;
        for (const obj of zone.objects) {
            if (obj.type !== 'rubble' || !obj._interact || obj._excavated) continue;
            const d = Math.hypot(obj.x - store.player.x, obj.y - store.player.y);
            if (d < bestD) { bestD = d; bestRubble = obj; }
        }
        if (bestRubble) { handleRubbleInteract(bestRubble); return; }

        // 隐藏入口
        for (const obj of zone.objects) {
            if (obj.type !== 'secretGate') continue;
            if (Math.hypot(obj.x - store.player.x, obj.y - store.player.y) < 70) {
                handleSecretGate(obj);
                return;
            }
        }

        // 石碑
        for (const obj of zone.objects) {
            if (obj.type !== 'stele') continue;
            if (Math.hypot(obj.x - store.player.x, obj.y - store.player.y) < 70) {
                handleSteleInteract(obj);
                return;
            }
        }

        // 祭坛
        for (const obj of zone.objects) {
            if (obj.type !== 'altar') continue;
            if (Math.hypot(obj.x - store.player.x, obj.y - store.player.y) < 80) {
                handleAltarInteract(obj);
                return;
            }
        }

        // NPC + 要石
        let best = null, bestDD = 80, bestType = null;
        for (const obj of zone.objects) {
            if (obj.type !== 'npc' && obj.type !== 'keystone') continue;
            const d = Math.hypot(obj.x - store.player.x, obj.y - store.player.y);
            if (d < bestDD) { bestDD = d; best = obj; bestType = obj.type; }
        }
        if (bestType === 'keystone') interactKeystone(best.zoneId);
        else if (best) handleNpc(best);
    }

    particles.update();
    if (worldState.typewriterFxTimer > 0) worldState.typewriterFxTimer--;
}

// ============== 绘制 ==============
export function drawWorld(ctx, t) {
    const zone = curZone();
    clearBg(ctx);
    drawGround(ctx, zone, t);
    drawExits(ctx, t, zone);

    // 实体收集
    const ents = [];
    for (const obj of zone.objects) {
        if (obj.type === 'wordSpirit') continue;  // 静态占位不渲染，由动态 wordSpirits 接管
        ents.push({ ...obj, _kind: obj.type });
    }
    for (const p of pollutions) {
        if (p.zone === store.world.currentZone) ents.push({ type: 'pollution', x: p.x, y: p.y, _p: p, _kind: 'pollution' });
    }
    for (const sp of wordSpirits) {
        if (sp.zone === store.world.currentZone && !sp.collected) ents.push({ type: 'wordSpirit', x: sp.x, y: sp.y, _sp: sp, _kind: 'wordSpirit' });
    }
    ents.push({ type: 'player', x: store.player.x, y: store.player.y, _kind: 'player' });
    ents.sort((a, b) => a.y - b.y);

    for (const e of ents) {
        if (e._kind === 'player') drawPlayer25D(ctx, t);
        else if (e._kind === 'pollution') drawPollution(ctx, e._p);
        else if (e._kind === 'wordSpirit') drawWordSpiritForRender(ctx, e._sp, t);
        else drawObject(ctx, e, t);
    }

    particles.draw(ctx, store.camera);

    // 区域效果：暗视野；玩家持有「光」字时迷雾散去
    if (ZONE_ENV[store.world.currentZone]?.effect === 'dark') {
        // 强度 0~1：0=无迷雾，1=完全黑暗
        // 持有「光」字 → 强度 0（光字驱散黑暗）
        // 未持有 → 强度 1
        const hasLight = hasWord('light');
        const darkStrength = hasLight ? 0 : 1;
        if (darkStrength > 0) {
            // 未持光：屏幕四边浓黑、中心略亮（仅一小圈可见），整体能强烈感知到迷雾
            ctx.save();
            const cx = store.width / 2, cy = store.height / 2;
            // 中心可见半径与持光/未持光都关联——未持光时很小
            const visR = 160;
            // 1) 大范围全屏暗化（最外层 50% 黑）
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, store.width, store.height);
            // 2) 中心小圈"擦亮"——让玩家能看见脚下
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, visR);
            grad.addColorStop(0, 'rgba(0,0,0,0.95)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(cx, cy, visR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            // 3) 玩家脚下加一圈微光（暖色），增强"暗处"氛围
            const pulse = 0.6 + Math.sin(store.frameCount * 0.06) * 0.2;
            const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
            halo.addColorStop(0, `rgba(255,216,122,${0.18 * pulse})`);
            halo.addColorStop(1, 'rgba(255,216,122,0)');
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, store.width, store.height);
            ctx.restore();
        } else if (hasLight) {
            // 持有「光」字时：全屏不再有迷雾，显示一行暖色提示
            ctx.save();
            const pulse = 0.5 + Math.sin(store.frameCount * 0.05) * 0.3;
            drawText(ctx, '「光」正在驱散黑暗……', store.width / 2, store.height - 60, `rgba(255,216,122,${0.4 + pulse * 0.4})`, 12, 'center');
            ctx.restore();
        }
    }

    // 区域名 + 效果
    drawText(ctx, zone.name, 24, 28, 'rgba(255,255,255,0.5)', 14, 'left');
    const env = ZONE_ENV[store.world.currentZone];
    if (env && env.desc) {
        const envColor = { corrupt: '#ff6666', regen: '#66ff66', dark: '#6666ff', swift: '#66ffff', focus: '#ffd87a' }[env.effect] || 'rgba(255,255,255,0.3)';
        drawText(ctx, env.desc, 24, 46, envColor, 10, 'left');
    }

    // 操作提示
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('WASD 移动  ·  E/空格 交互  ·  B 背包  ·  M 地图', store.width - 16, store.height - 14);
    ctx.restore();

    // 交互提示
    drawInteractionHints(ctx, zone);

    // 打字机提示
    if (store.world.currentZone === 'ruins') {
        const tw = zone.objects.find(o => o.type === 'typewriter');
        if (tw && Math.hypot(tw.x - store.player.x, tw.y - store.player.y) < 90) {
            const { sx, sy } = project(tw.x, tw.y);
            drawText(ctx, worldState.typewriterRead ? 'E / 空格 查看碎片' : 'E / 空格 倾听打字机', sx, sy - 60, 'rgba(255,255,255,0.8)', 12, 'center');
        }
    }

    // 区域切换遮罩
    if (store.world.transition) {
        const tr = store.world.transition;
        const alpha = tr.phase === 'out' ? tr.t : 2 - tr.t;
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${clamp(alpha, 0, 1)})`;
        ctx.fillRect(0, 0, store.width, store.height);
        ctx.restore();
    }
}

function clearBg(ctx) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, store.width, store.height);
    ctx.restore();
}

function drawPollution(ctx, p) {
    const { sx, sy } = project(p.x, p.y);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(store.frameCount * 0.05 + p.x) * 0.2;
    ctx.fillStyle = p.color;
    ctx.font = `${p.size}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, sx, sy);
    ctx.restore();
}

function drawInteractionHints(ctx, zone) {
    // NPC / 要石 / 石碑 / 祭坛 / 隐藏入口
    for (const obj of zone.objects) {
        if (!['npc', 'keystone', 'stele', 'altar', 'secretGate'].includes(obj.type)) continue;
        const d = Math.hypot(obj.x - store.player.x, obj.y - store.player.y);
        const range = obj.type === 'altar' ? 80 : obj.type === 'secretGate' ? 70 : 80;
        if (d >= range) continue;
        const { sx, sy } = project(obj.x, obj.y);
        if (obj.type === 'keystone') {
            const k = isKeystoneActive(obj.zoneId);
            drawText(ctx, k ? 'E / 空格 查看刻文' : 'E / 空格 触碰要石', sx, sy - 110, 'rgba(255,216,122,0.9)', 12, 'center');
        } else if (obj.type === 'stele') {
            drawText(ctx, `E / 空格 阅读「${obj.text}」`, sx, sy - 80, 'rgba(170,180,255,0.8)', 11, 'center');
        } else if (obj.type === 'altar') {
            drawText(ctx, 'E / 空格 使用祭坛', sx, sy - 54, 'rgba(255,216,122,0.9)', 12, 'center');
        } else if (obj.type === 'secretGate') {
            const prompt = hasWord(obj.require) ? 'E / 空格 穿过裂隙' : `（需要「${WORD_CHAR[obj.require] || obj.require}」）`;
            drawText(ctx, prompt, sx, sy - 70, 'rgba(170,180,255,0.8)', 11, 'center');
        } else if (obj.type === 'npc') {
            const npc = store.npcs[obj.id];
            if (npc) {
                const label = npc.purified ? 'E / 空格 对话' : 'E / 空格 交互';
                drawText(ctx, label, sx, sy - 90, 'rgba(255,255,255,0.7)', 12, 'center');
            }
        }
    }
    // 碎石
    for (const obj of zone.objects) {
        if (obj.type !== 'rubble' || !obj._interact || obj._excavated) continue;
        if (Math.hypot(obj.x - store.player.x, obj.y - store.player.y) < 60) {
            const { sx, sy } = project(obj.x, obj.y);
            drawText(ctx, 'E / 空格 翻找碎石', sx, sy - 26, 'rgba(255,216,122,0.8)', 11, 'center');
            break;
        }
    }
}

// 兼容旧 API：导出 drawExits 给主循环
export { drawExits };
