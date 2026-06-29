// 世界场景所有物件的渲染函数集合

import { store, hasWord } from '../store.js';
import { getWord } from '../data/vocabulary.js';
import { drawText, drawCircle } from '../canvas/renderer.js';
import { project, drawBlock } from '../canvas/player.js';
import { drawKeystone } from '../canvas/keystone.js';
import { WORD_CHAR } from './zones/index.js';
import { worldState } from './worldState.js';

export function drawGround(ctx, zone, t) {
    const b = zone.bounds;
    ctx.save();
    ctx.fillStyle = zone.ground;
    ctx.fillRect(0, 0, store.width, store.height);

    // 网格地面（投影后菱形网格）
    ctx.strokeStyle = zone.grid;
    ctx.lineWidth = 1;
    const step = 80;
    for (let gx = Math.floor(b.minX / step) * step; gx <= b.maxX; gx += step) {
        const a = project(gx, b.minY), c = project(gx, b.maxY);
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
    }
    for (let gy = Math.floor(b.minY / step) * step; gy <= b.maxY; gy += step) {
        const a = project(b.minX, gy), c = project(b.maxX, gy);
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
    }
    ctx.restore();
}

export function drawObject(ctx, obj, t) {
    const { sx, sy } = project(obj.x, obj.y);
    switch (obj.type) {
        case 'tree': drawTree(ctx, sx, sy, obj.s || 1, t); break;
        case 'rubble': drawRubble(ctx, sx, sy, obj._interact); break;
        case 'typewriter': drawTypewriter(ctx, sx, sy, t); break;
        case 'tomb': drawTomb(ctx, sx, sy, obj, t); break;
        case 'word': if (!obj.collected) drawWordPickup(ctx, sx, sy, obj, t); break;
        case 'npc': drawNpc(ctx, sx, sy, obj, t); break;
        case 'sign': drawSign(ctx, sx, sy, obj); break;
        case 'keystone': drawKeystone(ctx, sx, sy, obj, t); break;
        case 'gate': drawGate(ctx, sx, sy, obj, t); break;
        case 'shard': if (!obj.collected) drawShard(ctx, sx, sy, t); break;
        case 'stele': drawStele(ctx, sx, sy, obj, t); break;
        case 'altar': drawAltar(ctx, sx, sy, t); break;
        case 'secretGate': drawSecretGate(ctx, sx, sy, obj, t); break;
    }
}

function drawTree(ctx, sx, sy, s, t) {
    drawBlock(ctx, sx, sy, 10 * s, 10 * s, 20 * s, '#5a3a1a', '#3a2410', '#2a1808');
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${14 * s}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
        const yy = sy - 20 * s - i * 12 * s;
        ctx.fillText('木', sx, yy);
        ctx.fillText('木', sx - 10 * s, yy + 4 * s);
        ctx.fillText('木', sx + 10 * s, yy + 4 * s);
    }
    ctx.restore();
}

function drawRubble(ctx, sx, sy, interactive = false) {
    if (interactive) {
        ctx.save();
        const pulse = 0.2 + Math.sin(store.frameCount * 0.05) * 0.15;
        ctx.shadowColor = '#ffd87a';
        ctx.shadowBlur = 8 * pulse;
        ctx.fillStyle = `rgba(255,216,122,${pulse})`;
        ctx.beginPath();
        ctx.arc(sx, sy - 14, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    drawBlock(ctx, sx, sy, 22, 16, 10, '#3a3a3a', '#222', '#151515');
}

function drawTypewriter(ctx, sx, sy, t) {
    // 外部提供 typewriterRead / typewriterNoisePlayed / typewriterFxTimer
    if (worldState.typewriterRead && worldState.typewriterNoisePlayed) {
        drawTypewriterBroken(ctx, sx, sy, t);
        drawTypewriterHologram(ctx, sx, sy, t, worldState.typewriterFxTimer);
        return;
    }
    const rotY = Math.sin(t * 0.025) * 0.12;
    const rotX = Math.cos(t * 0.02) * 0.05;
    const float = Math.sin(t * 0.04) * 2;

    ctx.save();
    ctx.translate(sx, sy + float);
    const scaleX = Math.cos(rotY);
    ctx.scale(scaleX, 1);
    ctx.translate(0, Math.sin(rotX) * 4);

    const baseTop = '#bdbdbd', baseFront = '#8a8a8a', baseSide = '#525252';
    ctx.fillStyle = baseTop;
    ctx.beginPath();
    ctx.moveTo(-32, -26);
    ctx.lineTo(32, -26);
    ctx.lineTo(32, -26 - 24 * 0.55);
    ctx.lineTo(-32, -26 - 24 * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = baseFront;
    ctx.fillRect(-32, -26 - 24 * 0.55, 64, 24);

    ctx.fillStyle = baseSide;
    ctx.beginPath();
    ctx.moveTo(32, -26);
    ctx.lineTo(32, -50 * 0.55);
    ctx.lineTo(32, -50 * 0.55 + 24);
    ctx.lineTo(32, -26 + 24);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-26, -28 - 24 * 0.55 - 2, 52, 6);

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 6; j++) {
            const kx = -24 + j * 8 + (i % 2 ? 4 : 0);
            const ky = -26 - 24 * 0.55 - 1;
            ctx.fillStyle = i % 2 ? '#444' : '#3a3a3a';
            ctx.fillRect(kx, ky, 6, 3);
        }
    }

    // 卷纸
    ctx.save();
    ctx.fillStyle = '#f0ebe0';
    ctx.beginPath();
    ctx.moveTo(-22, -26 - 24 * 0.55);
    ctx.lineTo(22, -26 - 24 * 0.55);
    ctx.lineTo(20, -26 - 24 * 0.55 - 18);
    ctx.lineTo(-20, -26 - 24 * 0.55 - 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8d2c4';
    ctx.fillRect(-20, -44, 40, 3);
    const typing = worldState.typewriterRead ? '' : '你……还……在……吗……';
    const visibleChars = Math.floor((t * 0.6) % (typing.length + 30));
    let text = '';
    if (visibleChars < typing.length) {
        text = typing.slice(0, visibleChars);
    } else if (visibleChars < typing.length + 20) {
        text = typing;
    } else {
        text = typing.slice(0, (visibleChars - 20) % (typing.length + 1));
    }
    ctx.fillStyle = '#222';
    ctx.font = '11px "Microsoft YaHei", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, -26 - 24 * 0.55 - 10);
    if (visibleChars < typing.length && Math.floor(t / 15) % 2 === 0) {
        ctx.fillRect(0 + text.length * 5.5 - 8, -26 - 24 * 0.55 - 13, 1.5, 6);
    }
    ctx.restore();

    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAIX · 1986', 0, -26 - 24 * 0.55 + 12);

    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(-26, -16, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(26, -16, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (!worldState.typewriterRead) {
        ctx.save();
        const pulse = 0.3 + Math.sin(t * 0.05) * 0.2;
        ctx.shadowColor = '#ffd87a';
        ctx.shadowBlur = 18 * pulse;
        ctx.fillStyle = `rgba(255,216,122,${0.4 * pulse})`;
        ctx.beginPath();
        ctx.arc(sx, sy + float - 38, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawTypewriterBroken(ctx, sx, sy, t) {
    const baseY = sy;
    ctx.save();
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(sx - 24, baseY - 8, 48, 8);
    ctx.fillStyle = '#222';
    ctx.fillRect(sx - 28, baseY - 4, 56, 4);
    const pieces = [
        { x: sx - 36, y: baseY - 2, r: 0.5, s: 6 },
        { x: sx - 18, y: baseY + 4, r: -0.3, s: 5 },
        { x: sx + 8, y: baseY - 1, r: 0.8, s: 7 },
        { x: sx + 28, y: baseY + 3, r: -0.6, s: 5 },
        { x: sx + 42, y: baseY - 3, r: 0.2, s: 6 }
    ];
    for (const p of pieces) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = '#555';
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(['你', '在', '吗', '记', '得'][pieces.indexOf(p) % 5], 0, 0);
        ctx.restore();
    }
    ctx.restore();
}

function drawTypewriterHologram(ctx, sx, sy, t, fxTimer) {
    if (fxTimer <= 0) return;
    const lines = [
        { ch: '你', col: '#ff6ec7', yOff: -50 },
        { ch: '在', col: '#39ff14', yOff: -65 },
        { ch: '吗', col: '#ffd87a', yOff: -78 }
    ];
    const tNorm = fxTimer / 240;
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(t * 0.05) * 0.3 * tNorm;
    for (const l of lines) {
        const rotY = Math.sin(t * 0.04 + l.yOff) * 0.3;
        const float = Math.sin(t * 0.08 + l.yOff) * 4;
        const xOff = Math.sin(t * 0.06 + l.yOff) * 3;
        const scaleX = Math.cos(rotY);
        for (let layer = 0; layer < 3; layer++) {
            const dx = (layer - 1) * 4;
            const dy = (layer - 1) * 2;
            ctx.save();
            ctx.translate(sx + dx, sy + l.yOff + float + dy);
            ctx.scale(scaleX, 1);
            ctx.fillStyle = l.col;
            ctx.shadowColor = l.col;
            ctx.shadowBlur = 14 - Math.abs(layer - 1) * 4;
            ctx.font = `bold ${28 - layer * 2}px "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(l.ch, xOff, 0);
            ctx.restore();
        }
    }
    ctx.restore();
}

function drawTomb(ctx, sx, sy, obj, t) {
    const flicker = 0.6 + Math.sin(t * 0.1 + obj.x) * 0.3;
    drawBlock(ctx, sx, sy, 36, 14, 56, '#222', '#111', '#080808');
    ctx.save();
    ctx.shadowColor = obj.color;
    ctx.shadowBlur = 14 * flicker;
    ctx.fillStyle = obj.color;
    ctx.globalAlpha = flicker;
    ctx.font = 'bold 30px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.text, sx, sy - 32);
    ctx.restore();
}

function drawWordPickup(ctx, sx, sy, obj, t) {
    const float = Math.sin(t * 0.08 + obj.x) * 4;
    ctx.save();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12 + Math.sin(t * 0.1 + obj.x) * 4;
    drawBlock(ctx, sx, sy + float, 24, 24, 24, 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)');
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(WORD_CHAR[obj.id] || obj.id, sx, sy - 12 + float);
    ctx.restore();
}

function drawGate(ctx, sx, sy, obj, t) {
    if (obj.open) return;
    const pulse = 0.5 + Math.sin(t * 0.06 + obj.x) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.55 + pulse * 0.25;
    ctx.fillStyle = 'rgba(15,15,25,0.88)';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 18;
    ctx.fillRect(sx - 44, sy - 130, 88, 130);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 6; i++) {
        ctx.fillRect(sx - 40 + i * 15, sy - 120 + Math.sin(t * 0.1 + i) * 10, 2, 100);
    }
    const reqWord = getWord(obj.require);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`需要「${reqWord ? reqWord.char : obj.require}」`, sx, sy - 65);
    ctx.restore();
}

function drawNpc(ctx, sx, sy, obj, t) {
    const npc = store.npcs[obj.id];
    if (!npc) return;
    if (obj.id === 'littleBlue') {
        if (!npc.purified) {
            ctx.save();
            ctx.fillStyle = '#ff00cc';
            ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('绝绝子', sx, sy - 30);
            ctx.fillStyle = '#4488ff';
            ctx.fillRect(sx - 18, sy - 14, 36, 8);
            ctx.restore();
        } else {
            drawStickFigure(ctx, sx, sy, '#4488ff', t);
            drawText(ctx, '小蓝', sx, sy - 56, '#4488ff', 11);
        }
    } else if (obj.id === 'oldTree') {
        if (!npc.purified) {
            ctx.save();
            ctx.strokeStyle = '#ff00aa';
            ctx.lineWidth = 2;
            ctx.translate(sx, sy - 30);
            ctx.rotate(t * 0.02);
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ff00cc';
            ctx.font = '14px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                ctx.fillText(i % 2 ? '子' : '绝', Math.cos(a) * 26, Math.sin(a) * 26);
            }
            ctx.restore();
        } else {
            drawBlock(ctx, sx, sy, 26, 26, 18, '#6a4a2a', '#3a2a1a', '#241208');
            ctx.save();
            ctx.strokeStyle = '#8a6a3a';
            ctx.lineWidth = 1.5;
            for (let r = 6; r <= 16; r += 5) {
                ctx.beginPath();
                ctx.ellipse(sx, sy - 18, r, r * 0.4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
            drawText(ctx, '老树桩', sx, sy - 48, '#caa', 11);
        }
    } else if (obj.id === 'ink') {
        // 墨水：半干的墨渍团，有微弱呼吸感
        ctx.save();
        const breath = 1 + Math.sin(t * 0.04) * 0.06;
        // 墨渍主体（不规则椭圆）
        ctx.fillStyle = 'rgba(30, 40, 60, 0.85)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 22 * breath, 14 / breath, 0.15, 0, Math.PI * 2);
        ctx.fill();
        // 表面文字碎片飘浮
        ctx.fillStyle = 'rgba(100,140,200,0.4)';
        ctx.font = '9px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
            const ox = Math.sin(t * 0.03 + i * 2.1) * 12;
            const oy = Math.cos(t * 0.025 + i * 1.7) * 6;
            ctx.fillText(['稿','诗','字'][i], sx + ox, sy + oy);
        }
        ctx.restore();
        drawText(ctx, '墨水', sx, sy - 32, 'rgba(100,140,200,0.8)', 11);
    } else if (obj.id === 'echo') {
        // 回声：由细小文字碎片拼成的人形轮廓
        ctx.save();
        const flicker = 0.5 + Math.sin(t * 0.08) * 0.3;
        ctx.globalAlpha = 0.5 + flicker * 0.3;
        // 轮廓用密集的小字组成
        const fragments = ['删','除','撤回','已','未送达'];
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        // 头
        ctx.fillStyle = 'rgba(160,140,220,0.7)';
        for (let a = 0; a < Math.PI * 2; a += 0.5) {
            const r = 10;
            ctx.fillText(fragments[Math.floor(a * 3) % fragments.length],
                sx + Math.cos(a) * r, sy - 38 + Math.sin(a) * r * 0.6);
        }
        // 身体（简化）
        ctx.strokeStyle = 'rgba(160,140,220,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, sy - 28); ctx.lineTo(sx, sy - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - 20); ctx.lineTo(sx - 8, sy - 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - 20); ctx.lineTo(sx + 8, sy - 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx - 6, sy + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx + 6, sy + 6); ctx.stroke();
        ctx.restore();
        drawText(ctx, '回声', sx, sy - 54, 'rgba(180,160,255,0.7)', 11);
    }
}

function drawStickFigure(ctx, sx, sy, color, t) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const sway = Math.sin(t * 0.1) * 1.5;
    drawCircle(ctx, sx, sy - 40 + sway, 6, color, false);
    ctx.beginPath();
    ctx.moveTo(sx, sy - 34 + sway); ctx.lineTo(sx, sy - 14);
    ctx.moveTo(sx, sy - 28 + sway); ctx.lineTo(sx - 8, sy - 18);
    ctx.moveTo(sx, sy - 28 + sway); ctx.lineTo(sx + 8, sy - 18);
    ctx.moveTo(sx, sy - 14); ctx.lineTo(sx - 5, sy);
    ctx.moveTo(sx, sy - 14); ctx.lineTo(sx + 5, sy);
    ctx.stroke();
    ctx.restore();
}

function drawSign(ctx, sx, sy, obj) {
    drawBlock(ctx, sx, sy, 4, 4, 40, '#444', '#2a2a2a', '#1a1a1a');
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.text, sx, sy - 50);
    ctx.restore();
}

function drawShard(ctx, sx, sy, t) {
    const float = Math.sin(t * 0.06) * 3;
    ctx.save();
    ctx.shadowColor = '#ffd87a';
    ctx.shadowBlur = 10 + Math.sin(t * 0.1) * 4;
    ctx.fillStyle = '#ffd87a';
    ctx.translate(sx, sy + float - 8);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
}

export function drawWordSpiritForRender(ctx, sp, t) {
    const { sx, sy } = project(sp.x, sp.y);
    const w = getWord(sp.id);
    const flicker = 0.6 + Math.sin(t * 0.08 + sp.x * 0.01) * 0.2;
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.shadowColor = '#88ffcc';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#88ffcc';
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(w ? w.char : sp.id, sx, sy);
    ctx.globalAlpha = flicker * 0.3;
    ctx.fillText(w ? w.char : sp.id, sx - sp.vx * 3, sy - sp.vy * 3);
    ctx.fillText(w ? w.char : sp.id, sx - sp.vx * 6, sy - sp.vy * 6);
    ctx.restore();
}

function drawStele(ctx, sx, sy, obj, t) {
    drawBlock(ctx, sx, sy, 24, 12, 60, '#3a3a5a', '#2a2a4a', '#1a1a3a');
    ctx.save();
    const pulse = 0.3 + Math.sin(t * 0.04 + obj.x * 0.01) * 0.2;
    ctx.shadowColor = '#aabbff';
    ctx.shadowBlur = 8 * pulse;
    ctx.fillStyle = `rgba(170,180,255,${0.5 + pulse})`;
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.text, sx, sy - 36);
    ctx.restore();
}

function drawAltar(ctx, sx, sy, t) {
    drawBlock(ctx, sx, sy, 30, 30, 14, '#4a3a2a', '#3a2a1a', '#2a1a0a');
    const pulse = 0.5 + Math.sin(t * 0.05) * 0.3;
    ctx.save();
    ctx.shadowColor = '#ffd87a';
    ctx.shadowBlur = 16 * pulse;
    ctx.fillStyle = `rgba(255,216,122,${0.6 * pulse})`;
    ctx.beginPath();
    ctx.arc(sx, sy - 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawText(ctx, '语义祭坛', sx, sy - 44, 'rgba(255,216,122,0.8)', 10, 'center');
}

function drawSecretGate(ctx, sx, sy, obj, t) {
    if (!hasWord(obj.require)) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(t * 0.06) * 0.15;
        ctx.fillStyle = 'rgba(40,40,60,0.7)';
        ctx.fillRect(sx - 36, sy - 90, 72, 90);
        ctx.strokeStyle = 'rgba(170,160,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 90);
        ctx.lineTo(sx + 10, sy);
        ctx.stroke();
        ctx.restore();
        drawText(ctx, '?', sx, sy - 50, 'rgba(180,180,220,0.5)', 16, 'center');
    } else {
        const pulse = 0.5 + Math.sin(t * 0.08) * 0.3;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#aabbff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#aabbff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(sx, sy - 30, 35, 45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        drawText(ctx, '石碑密室', sx, sy - 60, 'rgba(170,180,255,0.9)', 12, 'center');
    }
}

export function drawExits(ctx, t, zone) {
    for (const ex of zone.exits) {
        // 打字机废墟的北门：未读打字机时完全不画；读完后按 typewriterGateAlpha 淡入
        let alpha = 0.4 + Math.sin(t * 0.08) * 0.2;
        if (zone.id === 'ruins' && ex.toZone === 'corridor') {
            alpha *= worldState.typewriterGateAlpha;
        }
        if (alpha <= 0.01) continue;
        const { sx, sy } = project(ex.x, ex.y);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(120,180,255,0.25)';
        ctx.strokeStyle = 'rgba(150,200,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx, sy, ex.w / 2, ex.h / 2 * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = alpha;
        drawText(ctx, ex.label, sx, sy - 24, 'rgba(180,210,255,0.8)', 12);
        ctx.restore();
    }
}
