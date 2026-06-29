import { rand } from '../utils/easing.js';

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, color, type = 'spark') {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: rand(-2, 2),
                vy: rand(-3, -0.5),
                life: 1,
                decay: rand(0.01, 0.03),
                color,
                size: rand(2, 5),
                type
            });
        }
    }

    emitText(x, y, text, color) {
        for (let i = 0; i < text.length; i++) {
            this.particles.push({
                x: x + i * 12 - text.length * 6,
                y,
                vx: rand(-1, 1),
                vy: rand(-2, -0.5),
                life: 1,
                decay: rand(0.005, 0.015),
                color,
                text: text[i],
                size: 14,
                type: 'text'
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, camera) {
        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            if (p.type === 'text') {
                ctx.fillStyle = p.color;
                ctx.font = `${p.size}px "Microsoft YaHei", sans-serif`;
                ctx.fillText(p.text, p.x - camera.x, p.y - camera.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - camera.x - p.size / 2, p.y - camera.y - p.size / 2, p.size, p.size);
            }
        }
        ctx.restore();
    }
}

export const particles = new ParticleSystem();
