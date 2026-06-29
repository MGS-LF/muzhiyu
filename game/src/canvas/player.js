import { store } from '../store.js';
import { drawCircle, drawGlowText } from './renderer.js';
import { lerp, clamp } from '../utils/easing.js';

// 2.5D 斜俯视投影：世界 (wx, wy) -> 屏幕 (sx, sy)
// y 方向压缩 0.5 形成俯视斜角，玩家固定在屏幕中央偏下
const Y_SQUASH = 0.5;

export function project(wx, wy) {
    const sx = store.width / 2 + (wx - store.camera.x);
    const sy = store.height * 0.62 + (wy - store.camera.y) * Y_SQUASH;
    return { sx, sy };
}

export function drawBlock(ctx, sx, sy, w, d, h, colTop, colFront, colSide) {
    const dy = d * Y_SQUASH;
    // 侧面（右侧）
    ctx.fillStyle = colSide;
    ctx.beginPath();
    ctx.moveTo(sx + w / 2, sy);
    ctx.lineTo(sx + w / 2, sy - h);
    ctx.lineTo(sx + w / 2, sy - h - dy);
    ctx.lineTo(sx + w / 2, sy - dy);
    ctx.closePath();
    ctx.fill();
    // 正面
    ctx.fillStyle = colFront;
    ctx.fillRect(sx - w / 2, sy - h, w, h);
    // 顶面
    ctx.fillStyle = colTop;
    ctx.beginPath();
    ctx.moveTo(sx - w / 2, sy - h);
    ctx.lineTo(sx + w / 2, sy - h);
    ctx.lineTo(sx + w / 2, sy - h - dy);
    ctx.lineTo(sx - w / 2, sy - h - dy);
    ctx.closePath();
    ctx.fill();
}

export function updatePlayerPhysics2D(dt) {
    const p = store.player;
    const baseSpeed = 3.4;
    const speed = baseSpeed * (store.speedMul || 1);
    const accel = 0.4;
    const friction = 0.78;

    let tx = 0, ty = 0;
    if (store.input.left) tx -= 1;
    if (store.input.right) tx += 1;
    if (store.input.up) ty -= 1;
    if (store.input.down) ty += 1;

    if (tx !== 0 && ty !== 0) { tx *= 0.707; ty *= 0.707; }

    p.vx += (tx * speed - p.vx) * accel;
    p.vy += (ty * speed - p.vy) * accel;
    p.vx *= friction;
    p.vy *= friction;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
    if (Math.abs(p.vy) < 0.05) p.vy = 0;

    p.x += p.vx;
    p.y += p.vy;

    if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) {
        p.walkPhase += 0.2;
        if (Math.abs(p.vx) > Math.abs(p.vy)) p.dir = p.vx > 0 ? 'right' : 'left';
        else p.dir = p.vy > 0 ? 'down' : 'up';
    } else {
        p.walkPhase = 0;
    }

    if (p.invincible > 0) p.invincible -= dt * 60;
}

export function updateCamera2D() {
    store.camera.x = lerp(store.camera.x, store.player.x, 0.12);
    store.camera.y = lerp(store.camera.y, store.player.y, 0.12);
}

export function drawPlayer25D(ctx, t) {
    const p = store.player;
    const { sx, sy } = project(p.x, p.y);

    // 影子
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const sway = Math.sin(p.walkPhase) * 2;
    const legSwing = Math.sin(p.walkPhase) * 5;
    const headY = sy - 44 + sway;
    const bodyTop = sy - 36 + sway;
    const bodyBot = sy - 16;
    const lineWidth = 2 + p.evolution * 0.4;

    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 头
    drawCircle(ctx, sx, headY, 7, '#fff', false);
    if (p.evolution >= 2) {
        if (p.dir === 'down') {
            drawCircle(ctx, sx - 3, headY, 1.4, '#fff', true);
            drawCircle(ctx, sx + 3, headY, 1.4, '#fff', true);
        } else if (p.dir === 'up') {
            // 背面无脸
        } else {
            const sgn = p.dir === 'right' ? 1 : -1;
            drawCircle(ctx, sx + sgn * 3, headY, 1.4, '#fff', true);
        }
    }

    // 身体
    ctx.beginPath();
    ctx.moveTo(sx, bodyTop);
    ctx.lineTo(sx, bodyBot);
    ctx.stroke();

    // 手臂
    const armSpread = p.evolution >= 1 ? 5 : 2;
    const armSwing = Math.sin(p.walkPhase) * armSpread;
    ctx.beginPath();
    ctx.moveTo(sx, bodyTop + 4);
    ctx.lineTo(sx - 9, bodyBot - 4 + armSwing);
    ctx.moveTo(sx, bodyTop + 4);
    ctx.lineTo(sx + 9, bodyBot - 4 - armSwing);
    ctx.stroke();

    // 腿
    ctx.beginPath();
    ctx.moveTo(sx, bodyBot);
    ctx.lineTo(sx - 5 + legSwing, sy);
    ctx.moveTo(sx, bodyBot);
    ctx.lineTo(sx + 5 - legSwing, sy);
    ctx.stroke();

    // 心口光点
    if (p.evolution >= 1) {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(t * 0.08) * 0.25;
        drawCircle(ctx, sx, bodyTop + 10, 2.5, '#fff', true);
        ctx.restore();
    }

    // 词汇光环
    if (p.evolution >= 2) {
        const words = ['光', '路', '听', '慢', '真'];
        ctx.save();
        ctx.globalAlpha = 0.7;
        words.forEach((word, i) => {
            const a = (t * 0.015 + i * (Math.PI * 2 / words.length));
            const hx = sx + Math.cos(a) * 26;
            const hy = headY + 6 + Math.sin(a) * 14;
            drawGlowText(ctx, word, hx, hy, 'rgba(255,255,255,0.85)', 10, 6);
        });
        ctx.restore();
    }

    ctx.restore();
}

export function drawPlayerSoul(ctx, t) {
    const s = store.player.battleSoul;
    ctx.save();
    ctx.globalAlpha = 0.6 + Math.sin(t * 0.12) * 0.2;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    ctx.restore();
}
