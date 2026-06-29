import { store, addWord, hasWord, removeWord, takeDamage, heal } from '../store.js';
import { drawRect, drawText, drawGlowText, drawLine, setPixelFont } from './renderer.js';
import { particles } from './particles.js';
import { clamp, rand, randInt, choice } from '../utils/easing.js';
import AudioSys from '../utils/audio.js';

// 正向词：触碰后缩短净化时间、恢复语义值
const POSITIVE_WORDS = ['光', '真', '慢', '问', '路', '听', '安', '静', '醒', '开'];

export class BattleSystem {
    constructor(config) {
        this.config = config;
        this.bullets = [];
        this.items = [];
        this.timer = 0;
        this.phase = 0;
        this.phaseTimer = 0;
        this.finished = false;
        this.box = { x: store.width * 0.2, y: store.height * 0.2, w: store.width * 0.6, h: store.height * 0.6 };
        this.purifyWords = config.wordsNeeded || [];
        this.collectedCount = 0; // 收集到的正向词数
        this.poetry = '';
        this.poetryLine = 0;
        this.poetryTimer = 0;
        this.shake = 0;
        this.monsterHP = config.monsterHP || 100;
        this.title = config.title;
        this.monster = config.monster;
        this.danmaku = config.danmaku || [];
        // 生存时长（帧）：撑过所有阶段后自动净化；收集正向词可加速
        this.survivalTarget = config.survivalTarget || this.calcSurvivalTarget();
        this.timeBonus = 0; // 由正向词累积，每词 -150 帧
        this.hint = '';
        this.hintTimer = 0;
        this.flashTimer = 0; // 受击时屏幕闪红
        this.dmgVignette = 0; // 屏幕边缘红雾
        this.positiveCollected = []; // 显示已收集的正向词
        this.counterCooldown = 0; // 反击冷却帧
        this.lastCounterSlot = -1; // 上一帧处理的反击槽位

        store.player.battleSoul.x = this.box.x + this.box.w * 0.2;

        store.player.battleSoul.y = this.box.y + this.box.h * 0.5;
        store.player.battleSoul.r = 8;
    }

    calcSurvivalTarget() {
        let total = 0;
        for (const ph of this.danmaku) total += ph.duration;
        return total || 900;
    }

    update() {
        if (this.finished) {
            this.updatePoetryPhase();
            return;
        }

        // 玩家死亡：直接结束战斗并触发 gameOver
        if (store.dead || store.semanticHP <= 0) {
            this.failBattle();
            return;
        }

        this.timer++;
        this.phaseTimer++;
        if (this.shake > 0) this.shake--;
        if (this.flashTimer > 0) this.flashTimer--;
        if (this.dmgVignette > 0) this.dmgVignette--;
        if (this.counterCooldown > 0) this.counterCooldown--;

        this.updatePlayer();
        this.handleCounterInput();
        this.spawnBullets();
        this.updateBullets();
        this.spawnPositive();
        this.updateItems();
        this.checkPhase();

        // 阶段提示
        if (this.timer === 60) this.setHint('用方向键 / WASD 躲避弹幕。');
        if (this.timer === 240) this.setHint('金色「正向词」会缩短净化——去碰它们！');
        if (this.timer === 480) this.setHint('按 1-6 用装备中的字反击对应弹幕。');
        if (this.timer === 900) this.setHint('慢一点没关系——每一次躲避都是一次真心。');
        const lastPhase = this.phase === this.danmaku.length - 1;
        if (lastPhase && this.phaseTimer === 60) this.setHint('最后一段——别放弃！');

        // 撑过所有阶段 → 自动净化
        const effectiveTarget = Math.max(60, this.survivalTarget - this.timeBonus);
        if (this.timer >= effectiveTarget) {
            this.startPurity();
        }
    }

    setHint(t) { this.hint = t; this.hintTimer = 240; }

    updatePlayer() {
        const s = store.player.battleSoul;
        const speed = 4;
        if (store.input.left) s.x -= speed;
        if (store.input.right) s.x += speed;
        if (store.input.up) s.y -= speed;
        if (store.input.down) s.y += speed;

        s.x = clamp(s.x, this.box.x + s.r, this.box.x + this.box.w - s.r);
        s.y = clamp(s.y, this.box.y + s.r, this.box.y + this.box.h - s.r);
    }

    spawnBullets() {
        const phase = this.danmaku[this.phase] || this.danmaku[0];
        if (!phase) return;

        const s = store.player.battleSoul;
        if (this.timer % phase.interval === 0) {
            const text = choice(phase.texts);
            const bx = this.box.x + rand(20, this.box.w - 20);
            const by = this.box.y + rand(20, this.box.h - 20);
            const angle = Math.atan2(s.y - by, s.x - bx) + rand(-0.2, 0.2);
            const speed = phase.speed + rand(-0.5, 0.5);

            this.bullets.push({
                x: bx, y: by,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                text, size: phase.size || 18,
                color: phase.color || '#ff00ff',
                life: 300,
                type: phase.type || 'normal',
                frozen: false,
                counterWord: this.resolveCounterWord(text)
            });
            AudioSys.pop(220 + rand(-50, 50));
        }
    }

    updateBullets() {
        const s = store.player.battleSoul;
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (!b.frozen) {
                b.x += b.vx;
                b.y += b.vy;
            }
            b.life--;

            if (b.x < this.box.x || b.x > this.box.x + this.box.w) b.vx *= -1;
            if (b.y < this.box.y || b.y > this.box.y + this.box.h) b.vy *= -1;

            const dx = b.x - s.x;
            const dy = b.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < s.r + b.size * 0.5) {
                takeDamage(5);
                this.shake = 10;
                this.flashTimer = 8;
                this.dmgVignette = 30;
                AudioSys.hit();
                particles.emit(b.x, b.y, 8, b.color, 'spark');
                this.bullets.splice(i, 1);
                continue;
            }

            if (b.life <= 0) this.bullets.splice(i, 1);
        }
    }

    spawnPositive() {
        // 每 ~3.5 秒生成一个正向词（在 box 内随机位置）
        // 频率随阶段提升
        const interval = Math.max(120, 220 - this.phase * 30);
        if (this.timer % interval === 0) {
            const word = choice(POSITIVE_WORDS);
            // 避免和最近的正向词重叠
            let x, y, tries = 0;
            do {
                x = this.box.x + rand(40, this.box.w - 40);
                y = this.box.y + rand(40, this.box.h - 40);
                tries++;
            } while (tries < 5 && this.items.some(it => Math.abs(it.x - x) < 40 && Math.abs(it.y - y) < 40));
            this.items.push({
                x, y,
                type: 'positive',
                word,
                life: 480, // 8 秒不碰则消失
                born: this.timer
            });
        }
    }

    updateItems() {
        const s = store.player.battleSoul;
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.life--;
            if (item.life <= 0) {
                this.items.splice(i, 1);
                continue;
            }
            const dx = item.x - s.x;
            const dy = item.y - s.y;
            if (Math.sqrt(dx * dx + dy * dy) < s.r + 14) {
                this.collectPositive(item);
                this.items.splice(i, 1);
            }
        }
    }

    collectPositive(item) {
        this.collectedCount++;
        this.timeBonus += 150; // 每词提前 2.5 秒
        this.positiveCollected.push(item.word);
        // 视觉反馈：金色粒子爆发
        particles.emit(item.x, item.y, 24, '#ffd87a', 'spark');
        particles.emit(item.x, item.y, 12, '#fff8b0', 'spark');
        AudioSys.collect();
        // 恢复少量语义值（鼓励收集）
        heal(8);
        // 浮字提示
        this.floatTexts = this.floatTexts || [];
        this.floatTexts.push({
            x: item.x, y: item.y - 8,
            text: '-2.5s',
            color: '#ffd87a',
            life: 50,
            born: this.timer
        });
    }

    resolveCounterWord(text) {
        // 根据弹幕文字返回可被反击的反向词（汉字）
        if (text.includes('绝')) return '真';
        if (text === '子') return '实';
        if (text === '你行你上') return '静';
        if (text === '笑死') return '安';
        if (text === '急了') return '慢';
        if (text === '典') return '实';
        if (text === '震惊！') return '实';
        if (text === '速看') return '慢';
        if (text === '秒删') return '真';
        if (text === '内幕') return '问';
        return null;
    }

    handleCounterInput() {
        const slot = store.input.counterSlot;
        store.input.counterSlot = -1;
        if (slot < 0 || this.counterCooldown > 0) return;
        const word = store.collectedWords[slot];
        if (!word) return;

        const s = store.player.battleSoul;
        let nearest = null;
        let nearestDist = Infinity;
        let nearestIdx = -1;
        for (let i = 0; i < this.bullets.length; i++) {
            const b = this.bullets[i];
            if (b.frozen || !b.counterWord) continue;
            const dx = b.x - s.x;
            const dy = b.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = b;
                nearestIdx = i;
            }
        }
        if (!nearest) return;

        // 反击判定：最近的弹幕反向词与玩家使用的词匹配
        if (nearest.counterWord === word.char) {
            // 成功：反弹并造成高额伤害
            this.counterCooldown = 20;
            const dmg = 30; // 高伤害，3-4 次可击败 100HP 的 Boss
            this.monsterHP -= dmg;
            this.timeBonus += 200; // 同时推进净化进度
            this.shake = 14;
            AudioSys.ding();
            particles.emit(nearest.x, nearest.y, 30, '#ffd87a', 'spark');
            particles.emit(nearest.x, nearest.y, 16, '#fff', 'spark');
            this.bullets.splice(nearestIdx, 1);
            this.floatTexts = this.floatTexts || [];
            this.floatTexts.push({
                x: s.x, y: s.y - 20,
                text: `反击 -${dmg}`,
                color: '#ffd87a',
                life: 60,
                born: this.timer
            });
            if (this.monsterHP <= 0) {
                this.startPurity();
            }
        } else {
            // 失败：罚 3 点语义值作为误用代价
            takeDamage(3);
            this.floatTexts = this.floatTexts || [];
            this.floatTexts.push({
                x: s.x, y: s.y - 20,
                text: '词不对应',
                color: '#ff6666',
                life: 40,
                born: this.timer
            });
        }
    }

    checkPhase() {
        const phase = this.danmaku[this.phase];
        if (!phase) return;
        if (this.phaseTimer > phase.duration) {
            this.phaseTimer = 0;
            // 最后一个阶段不再循环，持续到净化
            if (this.phase < this.danmaku.length - 1) {
                this.phase++;
            }
        }
    }


    failBattle() {
        this.finished = true;
        this.failed = true;
        if (!store.dead) takeDamage(999);
        // 立即切回世界，让 gameOver 在世界场景中显示并重生
        store.battle = null;
        store.scene = 'world';
    }


    startPurity() {
        this.finished = true;
        AudioSys.ding();
        this.poetry = this.config.poetry || '慢些走，真话在泥土里，问风不如问自己的影子。';
        this.poetryLine = 0;
        this.poetryTimer = 0;
        this.bullets.forEach(b => { b.frozen = true; b.color = '#555'; });
    }

    updatePoetryPhase() {
        this.poetryTimer++;
        if (this.poetryTimer > 3 && this.poetryLine < this.poetry.length) {
            this.poetryLine++;
            this.poetryTimer = 0;
            AudioSys.pop(880 + Math.sin(this.poetryLine * 0.1) * 200);
        }
    }

    draw(ctx) {
        if (this.shake > 0) {
            ctx.save();
            ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
        }

        // Battle box
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.box.x, this.box.y, this.box.w, this.box.h);
        ctx.restore();

        // Monster projection
        this.drawMonster(ctx);

        // Bullets
        ctx.save();
        for (const b of this.bullets) {
            ctx.globalAlpha = b.frozen ? 0.3 : 1;
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 8;
            drawGlowText(ctx, b.text, b.x, b.y, b.color, b.size, 10);
        }
        ctx.restore();

        // 正向词道具（金色发光块）
        const t = this.timer;
        for (const item of this.items) {
            const age = t - item.born;
            const float = Math.sin(age * 0.08) * 4;
            const pulse = 0.7 + Math.sin(age * 0.15) * 0.3;
            // 淡出
            const fadeOut = item.life < 90 ? item.life / 90 : 1;
            ctx.save();
            ctx.globalAlpha = fadeOut;
            // 旋转的金色方块底
            ctx.translate(item.x, item.y + float);
            ctx.rotate(age * 0.04);
            ctx.shadowColor = '#ffd87a';
            ctx.shadowBlur = 18;
            ctx.fillStyle = `rgba(255,216,122,${0.5 * pulse})`;
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = `rgba(255,255,255,${0.9 * pulse})`;
            ctx.fillRect(-6, -6, 12, 12);
            ctx.rotate(-age * 0.04); // 反向旋转让字保持正面
            ctx.fillStyle = '#5a3a00';
            ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.word, 0, 1);
            ctx.restore();
            // 接近时的吸引光环
            const s = store.player.battleSoul;
            const dx = item.x - s.x;
            const dy = item.y - s.y;
            if (Math.sqrt(dx * dx + dy * dy) < 60) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255,216,122,0.6)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(item.x, item.y + float, 16 + Math.sin(age * 0.2) * 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 浮字提示
        if (this.floatTexts) {
            for (let i = this.floatTexts.length - 1; i >= 0; i--) {
                const ft = this.floatTexts[i];
                ft.y -= 1;
                ft.life--;
                if (ft.life <= 0) { this.floatTexts.splice(i, 1); continue; }
                ctx.save();
                ctx.globalAlpha = clamp(ft.life / 30, 0, 1);
                ctx.shadowColor = ft.color;
                ctx.shadowBlur = 10;
                ctx.fillStyle = ft.color;
                ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ft.text, ft.x, ft.y);
                ctx.restore();
            }
        }

        // Player soul
        ctx.save();
        const s = store.player.battleSoul;
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 12;
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        ctx.restore();

        // 屏幕边缘红雾（受击）
        if (this.dmgVignette > 0) {
            const v = this.dmgVignette / 30;
            const grad = ctx.createRadialGradient(store.width/2, store.height/2, store.width*0.3, store.width/2, store.height/2, store.width*0.7);
            grad.addColorStop(0, 'rgba(255,0,0,0)');
            grad.addColorStop(1, `rgba(255,0,0,${0.5 * v})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, store.width, store.height);
        }
        // 受击时全屏闪红
        if (this.flashTimer > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255,50,50,${this.flashTimer / 16})`;
            ctx.fillRect(0, 0, store.width, store.height);
            ctx.restore();
        }

        // HUD
        drawText(ctx, this.title, this.box.x + this.box.w / 2, this.box.y - 20, '#fff', 16);

        // 生存进度条（含正向词加速后的实际时间）
        if (!this.finished) {
            const effectiveTarget = Math.max(60, this.survivalTarget - this.timeBonus);
            const pct = clamp(this.timer / effectiveTarget, 0, 1);
            const barY = this.box.y + this.box.h + 18;
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(this.box.x, barY, this.box.w, 5);
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.box.x, barY, this.box.w * pct, 5);
            // 加速标记
            if (this.timeBonus > 0) {
                ctx.fillStyle = '#ffd87a';
                ctx.fillRect(this.box.x, barY, this.box.w * (this.timeBonus / this.survivalTarget), 5);
            }
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('净化进度', this.box.x + this.box.w / 2, barY + 20);
            ctx.restore();

            // 已装备词（战斗中显示 1-6 快捷键）
            const equippedText = store.collectedWords.map((w, i) => `${i + 1}.${w ? w.char : '·'}`).join(' ');
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '12px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(equippedText, this.box.x + this.box.w, barY + 20);
            ctx.restore();

            // 已收集正向词

            if (this.positiveCollected.length > 0) {
                const collectedText = this.positiveCollected.slice(-8).join('·');
                ctx.save();
                ctx.fillStyle = 'rgba(255,216,122,0.85)';
                ctx.font = '12px "Microsoft YaHei", sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('「' + collectedText + '」-2.5s/词', this.box.x, barY + 38);
                ctx.restore();
            }

            // 提示文字
            if (this.hint && this.hintTimer > 0) {
                ctx.save();
                ctx.globalAlpha = clamp(this.hintTimer / 60, 0, 1);
                drawText(ctx, this.hint, store.width / 2, this.box.y + this.box.h + 48, 'rgba(255,255,255,0.8)', 13);
                ctx.restore();
            }
            if (this.hintTimer > 0) this.hintTimer--;
        }

        if (this.finished) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, store.width, store.height);
            const shown = this.poetry.slice(0, this.poetryLine);
            drawGlowText(ctx, shown, store.width / 2, store.height / 2, '#ffd700', 22, 20);
            ctx.restore();
        }

        if (this.shake > 0) ctx.restore();
    }

    drawMonster(ctx) {
        const cx = this.box.x + this.box.w / 2;
        const cy = this.box.y - 40;
        ctx.save();
        ctx.strokeStyle = '#ff00aa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ff00aa';
        ctx.fillText(this.monster, cx, cy);
        // 血条
        const hpPct = clamp(this.monsterHP / 100, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(cx - 36, cy - 52, 72, 6);
        ctx.fillStyle = '#ff00aa';
        ctx.fillRect(cx - 36, cy - 52, 72 * hpPct, 6);
        ctx.restore();
    }
}

export function createParrotBattle() {
    return new BattleSystem({
        title: '复读机鹦鹉螺',
        monster: '绝',
        monsterHP: 100,
        wordsNeeded: ['slow', 'true', 'ask'],
        poetry: '慢些走，真话在泥土里，问风不如问自己的影子。',
        danmaku: [
            { texts: ['绝', '绝', '子'], speed: 2, size: 22, color: '#ff00cc', interval: 55, duration: 2400, type: 'homing' },
            { texts: ['绝', '子', '绝子'], speed: 2.8, size: 20, color: '#39ff14', interval: 42, duration: 3000, type: 'homing' },
            { texts: ['绝', '绝绝子', '子', '绝'], speed: 3.4, size: 18, color: '#ff00cc', interval: 32, duration: 3600, type: 'homing' }
        ]
    });
}

export function createKeyboardBattle() {
    return new BattleSystem({
        title: '键盘侠',
        monster: '刺',
        monsterHP: 100,
        wordsNeeded: ['quiet'],
        poetry: '静下来的时候，所有尖刺都会认出自己原本只是沉默。',
        danmaku: [
            { texts: ['你行你上'], speed: 1.5, size: 26, color: '#ff2222', interval: 90, duration: 600, type: 'slow' },
            { texts: ['笑死', '急了', '典'], speed: 4, size: 16, color: '#ff4444', interval: 25, duration: 500, type: 'fast' }
        ]
    });
}

export function createClickbaitBattle() {
    return new BattleSystem({
        title: '标题党',
        monster: '！',
        monsterHP: 100,
        wordsNeeded: ['real', 'true', 'light'],
        poetry: '真相不需要感叹号，光自然会在黑暗中自己说出名字。',
        danmaku: [
            { texts: ['震惊！'], speed: 2, size: 36, color: '#ffaa00', interval: 100, duration: 600, type: 'topdown' },
            { texts: ['速看', '秒删', '内幕'], speed: 2.5, size: 20, color: '#ffdd00', interval: 45, duration: 500, type: 'homing' }
        ]
    });
}
