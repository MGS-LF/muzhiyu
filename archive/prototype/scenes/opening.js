import { store, showDialogue, resetPlayerPos } from '../store.js';
import { clear, drawCircle, drawGlowText } from '../canvas/renderer.js';
import { particles } from '../canvas/particles.js';
import { lerp } from '../utils/easing.js';
import AudioSys from '../utils/audio.js';

export const OPENING = {
    phase: 0, // 0 blank, 1 wave, 2 sick, 3 straight, 4 title, 5 shatter, 6 stand, 7 done
    timer: 0,
    titleScale: 0,
    titleOpacity: 0,
    shatterPieces: [],
    standProgress: 0,

    update() {
        this.timer++;

        if (this.phase === 0 && this.timer > 120) { // 2s blank
            this.phase = 1;
            this.timer = 0;
        }

        if (this.phase === 1 && this.timer > 180) { // 3s wave
            this.phase = 2;
            this.timer = 0;
        }

        if (this.phase === 2 && this.timer > 120) { // 2s sick
            this.phase = 3;
            this.timer = 0;
            AudioSys.snap();
        }

        if (this.phase === 3 && this.timer > 60) { // 1s straight + collision
            this.phase = 4;
            this.timer = 0;
            AudioSys.ding();
        }

        if (this.phase === 4 && this.timer > 180) { // 3s title
            this.phase = 5;
            this.timer = 0;
            AudioSys.thud();
            this.createShatter();
        }

        if (this.phase === 5 && this.timer > 120) { // 2s shatter
            this.phase = 6;
            this.timer = 0;
            AudioSys.heartbeat();
        }

        if (this.phase === 6 && this.timer > 120) { // 2s stand
            this.phase = 7;
            this.timer = 0;
            setTimeout(() => {
                showDialogue(store.flags.openingDone ? [] : [
                    '每一句真心话都曾是文明的火种。',
                    '你从一条绷直又断裂的线中站了起来。'
                ], () => {
                    store.flags.openingDone = true;
                    store.scene = 'tutorial';
                    resetPlayerPos(0, -40);
                });
            }, 500);
        }

        if (this.phase === 4 && this.titleScale < 1) {
            this.titleScale = lerp(this.titleScale, 1.15, 0.08);
            if (this.titleScale > 1) this.titleScale = 1;
        }
        if (this.phase === 4) this.titleOpacity = lerp(this.titleOpacity, 1, 0.05);

        if (this.phase === 5) {
            for (let i = this.shatterPieces.length - 1; i >= 0; i--) {
                const p = this.shatterPieces[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.08;
                p.life -= 0.015;
                if (p.life <= 0) this.shatterPieces.splice(i, 1);
            }
        }

        if (this.phase === 6) {
            this.standProgress += 0.015;
        }
    },

    createShatter() {
        const cx = store.width / 2;
        const cy = store.height / 2;
        for (let i = 0; i < 80; i++) {
            this.shatterPieces.push({
                x: cx + (Math.random() - 0.5) * 400,
                y: cy + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                size: 4 + Math.random() * 8,
                life: 1
            });
        }
        particles.emit(cx, cy, 60, '#fff', 'spark');
    },

    draw(ctx) {
        clear(ctx, store.width, store.height, '#fff');
        const cx = store.width / 2;
        const cy = store.height / 2;

        if (this.phase >= 1) this.drawWave(ctx, cx, cy);
        if (this.phase >= 4) this.drawTitle(ctx, cx, cy);
        if (this.phase >= 5) this.drawShatter(ctx);
        if (this.phase >= 6) this.drawPlayerRise(ctx, cx, cy);
    },

    drawWave(ctx, cx, cy) {
        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const t = this.timer;
        const width = 600;
        const startX = cx - width / 2;
        const endX = cx + width / 2;
        const baseY = cy;

        ctx.moveTo(startX, baseY);

        for (let x = 0; x <= width; x += 4) {
            let y = 0;
            if (this.phase === 1) {
                const p = Math.min(t / 180, 1);
                y = Math.sin((x / 60) + t * 0.05) * 40 * p;
                if (Math.random() < 0.05) y += (Math.random() - 0.5) * 8;
            } else if (this.phase === 2) {
                y = Math.sin((x / 60) + t * 0.08) * 40;
                // Add glitchy square wave bits
                if (Math.random() < 0.15) y = Math.sign(y) * (40 + Math.random() * 20);
                if (Math.random() < 0.02) {
                    ctx.fillStyle = '#ff00cc';
                    ctx.fillRect(startX + x, baseY + y - 2, 3, 3);
                }
                if (Math.random() < 0.02) {
                    ctx.strokeStyle = '#000';
                    ctx.beginPath();
                    ctx.moveTo(startX + x, baseY + y);
                    ctx.lineTo(startX + x + 15, baseY + y - 20);
                    ctx.stroke();
                }
            } else {
                y = 0;
            }
            ctx.lineTo(startX + x, baseY + y);
        }
        ctx.stroke();

        if (this.phase === 3) {
            const p = Math.min(t / 60, 1);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 8;
            drawCircle(ctx, startX + (width * p), baseY, 4, '#fff', true);
            drawCircle(ctx, endX - (width * p), baseY, 4, '#fff', true);
            ctx.restore();
        }
        ctx.restore();
    },

    drawTitle(ctx, cx, cy) {
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${this.titleOpacity})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${60 * this.titleScale}px "Microsoft YaHei", sans-serif`;
        ctx.fillText('墓之语', cx, cy - 20);
        ctx.font = `14px "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = `rgba(0,0,0,${this.titleOpacity * 0.7})`;
        ctx.fillText('——每一句真心话都曾是文明的火种。', cx, cy + 30);
        ctx.restore();
    },

    drawShatter(ctx) {
        ctx.save();
        for (const p of this.shatterPieces) {
            ctx.fillStyle = `rgba(0,0,0,${p.life})`;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.restore();
    },

    drawPlayerRise(ctx, cx, cy) {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, store.width, store.height);
        const progress = Math.min(this.standProgress, 1);
        const y = cy + 80 - progress * 80;
        const alpha = progress;

        ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, y - 32, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, y - 24);
        ctx.lineTo(cx, y - 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, y - 18);
        ctx.lineTo(cx - 10, y - 10);
        ctx.moveTo(cx, y - 18);
        ctx.lineTo(cx + 10, y - 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, y - 6);
        ctx.lineTo(cx - 6, y);
        ctx.moveTo(cx, y - 6);
        ctx.lineTo(cx + 6, y);
        ctx.stroke();
        ctx.restore();
    }
};
