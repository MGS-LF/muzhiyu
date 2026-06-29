import { store, showDialogue } from '../store.js';
import { drawText, setPixelFont } from './renderer.js';

// 要石系统：每个章节区域净化后激活，玩家刻上两句话或自输入一段话（留给后续 AI）
// 刻文保存在 store.keystones[zoneId] = { line1, line2, custom, chapter }

export const KEYSTONE_PRESETS = {
    tutorial: [
        ['语言是火的最初形态。', '我把它重新点燃。'],
        ['寂静里能听见心跳。', '那是文明还活着的声音。'],
        ['把字刻在石头上，', '它就有了不被遗忘的可能。']
    ],
    corridor: [
        ['噪音退去的地方，', '晚霞会回来。'],
        ['我喊了一千遍「绝」，', '其实只想说一句喜欢。'],
        ['有人在听，', '字就活了。']
    ],
    clearing: [
        ['绝字碎成光，', '光聚成人。'],
        ['慢些走，真话在泥土里。', '问风不如问自己的影子。'],
        ['我复制了千万遍，', '这是第一句我自己的话。']
    ],
    chapter1: [
        ['废墟里第一棵树是我种的。', '它叫「听」。'],
        ['噪音退去的地方，', '晚霞会回来。'],
        ['绝字碎成光，', '光聚成人。']
    ]
};

export function getKeystone(zoneId) {
    return store.keystones && store.keystones[zoneId];
}

export function isKeystoneActive(zoneId) {
    const k = getKeystone(zoneId);
    return k && k.activated;
}

// 检查某区域是否已净化完成（用于激活要石）
export function checkZonePurified(zoneId) {
    if (zoneId === 'tutorial') return true; // 教学用，默认可刻
    if (zoneId === 'corridor') return store.flags.littleBlueSaved;
    if (zoneId === 'clearing') return store.flags.oldTreeSaved;
    return false;
}

// 触发要石交互：若已净化但未激活 → 进入刻文界面；已激活 → 显示刻文
export function interactKeystone(zoneId) {
    const purified = checkZonePurified(zoneId);
    const existing = getKeystone(zoneId);
    if (!purified && !existing) {
        showDialogue([
            '一块灰白的要石立在原地，毫无反应。',
            '「这片土地还没有被真心话净化。」'
        ]);
        return;
    }
    if (existing && existing.activated) {
        const lines = [existing.custom
            ? existing.custom
            : `${existing.line1}\n${existing.line2}`];
        lines.push('（要石上的字微微发光。这是你留下的。它不会被遗忘。）');
        showDialogue(lines);
        return;
    }
    // 进入刻文选择界面
    store.keystoneUI = { zoneId, open: true, mode: 'choose', presetIdx: 0, customText: '', cursor: 0, typing: false };
}

// 绘制要石实体（2.5D）
export function drawKeystone(ctx, sx, sy, obj, t) {
    const zoneId = obj.zoneId;
    const active = isKeystoneActive(zoneId);
    const purified = checkZonePurified(zoneId);

    // 石碑本体
    const topCol = active ? '#d8d8d8' : (purified ? '#a8a8a8' : '#555');
    const frontCol = active ? '#9a9a9a' : (purified ? '#6a6a6a' : '#333');
    const sideCol = active ? '#6a6a6a' : (purified ? '#3a3a3a' : '#222');
    // 底座
    drawBlockImg(ctx, sx, sy, 50, 30, 14, '#444', '#2a2a2a', '#1a1a1a');
    // 碑身
    drawBlockImg(ctx, sx, sy - 14, 40, 24, 60, topCol, frontCol, sideCol);

    // 顶部「要」字标记
    ctx.save();
    ctx.fillStyle = active ? '#ffd87a' : (purified ? '#fff' : '#777');
    ctx.shadowColor = active ? '#ffd87a' : 'transparent';
    ctx.shadowBlur = active ? 12 + Math.sin(t * 0.08) * 4 : 0;
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('要', sx, sy - 14 - 30);
    ctx.restore();

    // 已激活：显示刻文
    if (active) {
        const k = getKeystone(zoneId);
        ctx.save();
        ctx.fillStyle = 'rgba(255,216,122,0.85)';
        ctx.font = '11px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = k.custom ? k.custom : `${k.line1} ${k.line2}`;
        wrapText(ctx, text, sx, sy - 14 - 14, 56, 13);
        ctx.restore();
    } else if (purified) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 0.1) * 0.3})`;
        ctx.font = '11px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('可激活 · E 刻文', sx, sy - 14 - 14);
        ctx.restore();
    } else {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '11px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('沉默', sx, sy - 14 - 14);
        ctx.restore();
    }
}

// 刻文 UI（全屏覆盖层）
export function drawKeystoneUI(ctx, t) {
    const ui = store.keystoneUI;
    if (!ui || !ui.open) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, store.width, store.height);

    const cx = store.width / 2;
    const cy = store.height / 2;

    drawText(ctx, '要石 · 刻文', cx, cy - 180, '#ffd87a', 22);
    drawText(ctx, '把字刻在石头上，才有不被遗忘的可能。', cx, cy - 150, 'rgba(255,255,255,0.5)', 12);

    if (ui.mode === 'choose') {
        const presets = KEYSTONE_PRESETS[ui.zoneId] || KEYSTONE_PRESETS.chapter1;
        drawText(ctx, '选择两句真心话，或按 T 自行刻写：', cx, cy - 110, 'rgba(255,255,255,0.7)', 13);

        presets.forEach((p, i) => {
            const y = cy - 70 + i * 56;
            const sel = ui.presetIdx === i;
            ctx.fillStyle = sel ? 'rgba(255,216,122,0.15)' : 'rgba(255,255,255,0.04)';
            ctx.strokeStyle = sel ? '#ffd87a' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = sel ? 2 : 1;
            ctx.fillRect(cx - 260, y - 22, 520, 46);
            ctx.strokeRect(cx - 260, y - 22, 520, 46);
            ctx.fillStyle = sel ? '#ffd87a' : '#fff';
            ctx.font = '15px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${i + 1}. ${p[0]}`, cx, y - 8);
            ctx.fillStyle = sel ? 'rgba(255,216,122,0.85)' : 'rgba(255,255,255,0.7)';
            ctx.font = '13px "Microsoft YaHei", sans-serif';
            ctx.fillText(p[1], cx, y + 12);
        });

        drawText(ctx, '↑↓ 选择 · Enter 确认 · T 切换自刻', cx, cy + 130, 'rgba(255,255,255,0.4)', 11);
    } else if (ui.mode === 'custom') {
        drawText(ctx, '自行刻写（回车完成，Esc 返回）：', cx, cy - 110, 'rgba(255,255,255,0.7)', 13);
        ctx.strokeStyle = 'rgba(255,216,122,0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 280, cy - 50, 560, 100);
        ctx.fillStyle = '#fff';
        ctx.font = '17px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        wrapText(ctx, ui.customText + (Math.floor(t / 30) % 2 ? '│' : ''), cx - 270, cy - 40, 540, 22, 'left');
        drawText(ctx, `${ui.customText.length} / 40`, cx + 260, cy + 60, 'rgba(255,255,255,0.4)', 11, 'right');
    }

    ctx.restore();
}

// 处理要石 UI 输入
export function handleKeystoneInput(e) {
    const ui = store.keystoneUI;
    if (!ui || !ui.open) return false;
    const code = e.code;
    const presets = KEYSTONE_PRESETS[ui.zoneId] || KEYSTONE_PRESETS.chapter1;

    if (ui.mode === 'choose') {
        if (code === 'ArrowUp' || code === 'KeyW') {
            ui.presetIdx = (ui.presetIdx - 1 + presets.length) % presets.length;
            return true;
        }
        if (code === 'ArrowDown' || code === 'KeyS') {
            ui.presetIdx = (ui.presetIdx + 1) % presets.length;
            return true;
        }
        if (code === 'Enter' || code === 'Space') {
            const p = presets[ui.presetIdx];
            confirmKeystone(ui.zoneId, { line1: p[0], line2: p[1], custom: null });
            return true;
        }
        if (code === 'KeyT') {
            ui.mode = 'custom';
            ui.customText = '';
            return true;
        }
        if (code === 'Escape') {
            ui.open = false;
            store.keystoneUI = null;
            return true;
        }
        // 数字键快速选
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= presets.length) {
            const p = presets[n - 1];
            confirmKeystone(ui.zoneId, { line1: p[0], line2: p[1], custom: null });
            return true;
        }
    } else if (ui.mode === 'custom') {
        if (code === 'Enter') {
            const txt = ui.customText.trim();
            if (txt.length > 0) confirmKeystone(ui.zoneId, { line1: null, line2: null, custom: txt });
            return true;
        }
        if (code === 'Escape') {
            ui.mode = 'choose';
            return true;
        }
        if (code === 'Backspace') {
            ui.customText = ui.customText.slice(0, -1);
            return true;
        }
        if (e.key && e.key.length === 1 && ui.customText.length < 40) {
            ui.customText += e.key;
            return true;
        }
    }
    return false;
}

function confirmKeystone(zoneId, data) {
    if (!store.keystones) store.keystones = {};
    store.keystones[zoneId] = { ...data, activated: true, chapter: currentChapter(zoneId) };
    store.keystoneUI = null;
    showDialogue([
        '字落石上，微微发光，然后沉静下来。',
        '——它不会被遗忘了。'
    ]);
}

function currentChapter(zoneId) {
    if (zoneId === 'tutorial') return 0;
    if (zoneId === 'corridor' || zoneId === 'clearing') return 1;
    return 2;
}

// ---- 小工具 ----
function drawBlockImg(ctx, sx, sy, w, d, h, top, front, side) {
    const dy = d * 0.5;
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(sx + w / 2, sy);
    ctx.lineTo(sx + w / 2, sy - h);
    ctx.lineTo(sx + w / 2, sy - h - dy);
    ctx.lineTo(sx + w / 2, sy - dy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = front;
    ctx.fillRect(sx - w / 2, sy - h, w, h);
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(sx - w / 2, sy - h);
    ctx.lineTo(sx + w / 2, sy - h);
    ctx.lineTo(sx + w / 2, sy - h - dy);
    ctx.lineTo(sx - w / 2, sy - h - dy);
    ctx.closePath();
    ctx.fill();
}

function wrapText(ctx, text, x, y, maxW, lh, align = 'center') {
    const chars = Array.from(text);
    let line = '';
    let yy = y;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    const xx = align === 'center' ? x : x;
    for (const ch of chars) {
        if (ch === '\n') {
            ctx.fillText(line, xx, yy);
            line = '';
            yy += lh;
            continue;
        }
        const test = line + ch;
        if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line, xx, yy);
            line = ch;
            yy += lh;
        } else {
            line = test;
        }
    }
    if (line) ctx.fillText(line, xx, yy);
}
