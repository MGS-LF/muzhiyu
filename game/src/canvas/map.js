import { store } from '../store.js';
import { clear, drawText, drawGlowText, drawRect } from './renderer.js';
import { isKeystoneActive } from './keystone.js';

// 区域在地图上的相对位置（归一化坐标 0~1，用于小地图布局）
const MAP_LAYOUT = {
    tutorial:  { x: 0.5,  y: 0.92, label: '苏醒之室',   color: '#8ab' },
    ruins:     { x: 0.5,  y: 0.74, label: '打字机废墟', color: '#888' },
    corridor:  { x: 0.5,  y: 0.52, label: '垃圾回廊',   color: '#ff00cc' },
    depths:    { x: 0.78, y: 0.52, label: '废墟东隅',   color: '#6644aa' },
    riverbed:  { x: 0.22, y: 0.52, label: '荧光河床',   color: '#44aaff' },
    clearing:  { x: 0.5,  y: 0.30, label: '嘎吱空地',   color: '#caa' },
    sanctuary: { x: 0.5,  y: 0.06, label: '语言避难所', color: '#ffd87a' }
};

const CONNECTIONS = [
    ['tutorial', 'ruins'],
    ['ruins', 'corridor'],
    ['ruins', 'depths'],
    ['corridor', 'clearing'],
    ['corridor', 'riverbed'],
    ['clearing', 'sanctuary']
];

export function drawMap(ctx) {
    clear(ctx, store.width, store.height, 'rgba(0,0,0,0.85)');

    const pad = 80;
    const mapW = store.width - pad * 2;
    const mapH = store.height - pad * 2;
    const mx = pad, my = pad;

    // 面板边框
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, mapW, mapH);
    ctx.restore();

    drawText(ctx, '语墟 · 地图', store.width / 2, my - 28, '#fff', 18);
    drawText(ctx, '按 M 关闭', store.width / 2, my + mapH + 24, 'rgba(255,255,255,0.4)', 12);

    // 连接线
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    for (const [a, b] of CONNECTIONS) {
        const pa = MAP_LAYOUT[a], pb = MAP_LAYOUT[b];
        ctx.beginPath();
        ctx.moveTo(mx + pa.x * mapW, my + pa.y * mapH);
        ctx.lineTo(mx + pb.x * mapW, my + pb.y * mapH);
        ctx.stroke();
    }
    ctx.restore();

    // 区域节点
    let curId;
    if (store.scene === 'tutorial') curId = 'tutorial';
    else if (store.scene === 'sanctuary') curId = 'sanctuary';
    else curId = store.world.currentZone;
    for (const id in MAP_LAYOUT) {
        const z = MAP_LAYOUT[id];
        const px = mx + z.x * mapW;
        const py = my + z.y * mapH;
        const isCurrent = curId === id;
        ctx.save();
        ctx.fillStyle = isCurrent ? z.color : 'rgba(120,120,120,0.4)';
        ctx.shadowColor = isCurrent ? z.color : 'transparent';
        ctx.shadowBlur = isCurrent ? 16 : 0;
        ctx.beginPath();
        ctx.arc(px, py, isCurrent ? 12 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawText(ctx, z.label, px, py + 28, isCurrent ? '#fff' : 'rgba(255,255,255,0.5)', 13);
        if (isCurrent) drawText(ctx, '你在这里', px, py - 26, z.color, 11);
    }

    // 玩家在大世界中的进度（已净化 NPC + 要石）
    const lines = [];
    if (isKeystoneActive('tutorial')) lines.push('✓ 苏醒之室 要石已刻');
    if (store.flags.littleBlueSaved) lines.push('✓ 小蓝已净化');
    if (isKeystoneActive('corridor')) lines.push('✓ 垃圾回廊 要石已刻');
    if (store.flags.oldTreeSaved) lines.push('✓ 老树桩已净化');
    if (isKeystoneActive('clearing')) lines.push('✓ 嘎吱空地 要石已刻');
    if (store.flags.sanctuaryBuilt) lines.push('✓ 语言避难所 已建成');
    if (lines.length) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((l, i) => ctx.fillText(l, mx + 16, my + 16 + i * 18));
        ctx.restore();
    }
}
