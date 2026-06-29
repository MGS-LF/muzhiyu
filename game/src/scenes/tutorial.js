import { store, showDialogue, resetPlayerPos, takeDamage, setObjective } from '../store.js';
import { clear, drawText, drawGlowText, drawCircle, setPixelFont } from '../canvas/renderer.js';
import { particles } from '../canvas/particles.js';
import { updatePlayerPhysics2D, updateCamera2D, drawPlayer25D, project, drawBlock } from '../canvas/player.js';
import { drawKeystone, interactKeystone, isKeystoneActive, checkZonePurified } from '../canvas/keystone.js';
import { clamp, rand, choice } from '../utils/easing.js';
import AudioSys from '../utils/audio.js';

// ===== 房间1：苏醒之室（横向，左→右） =====
const ROOM1 = { minX: -260, maxX: 1500, minY: -180, maxY: 220, exitX: 1340 };
const ROOM1_STORY = [
    { side: 'top', x: 60,   text: '语言曾是文明的呼吸——柔软、起伏、像心跳。' },
    { side: 'top', x: 360,  text: '后来，词语被嚼碎成弹幕：「绝」「笑死」「破防」。' },
    { side: 'top', x: 660,  text: '世界被绷成一条死线，然后断了。' },
    { side: 'top', x: 960,  text: '你从断口里站起来——还会说话的，只剩你。' },
    { side: 'top', x: 1240, text: '出口在东边。但噪音挡住了它。' }
];
const ROOM1_KEYSTONE = { x: 150, y: 0, zoneId: 'tutorial' };

// ===== 房间2：记忆长廊（横向，左→右，打完弹幕后进入） =====
const ROOM2 = { minX: -260, maxX: 1400, minY: -180, maxY: 220, exitX: 1240 };
const ROOM2_STORY = [
    { side: 'top', x: 80,   text: '（你撑过了第一阵噪音。）' },
    { side: 'top', x: 380,  text: '语墟很大。三幕灾难在等着你：噪音、茧房、终焉。' },
    { side: 'top', x: 700,  text: '每净化一片土地，那里的「要石」就会苏醒。' },
    { side: 'top', x: 1000, text: '把真心话刻在石头上——它就有了不被遗忘的可能。' },
    { side: 'top', x: 1240, text: '前方就是语墟。去吧，记录者。' }
];

// 简化版弹幕引导战
class TutorialBattle {
    constructor() {
        this.bullets = [];
        this.timer = 0;
        this.duration = 420;
        this.finished = false;
        this.shake = 0;
        this.intro = 0;
        this.box = { x: store.width * 0.25, y: store.height * 0.22, w: store.width * 0.5, h: store.height * 0.56 };
        store.player.battleSoul.x = this.box.x + this.box.w * 0.5;
        store.player.battleSoul.y = this.box.y + this.box.h * 0.75;
        store.player.battleSoul.r = 8;
        this.hint = '';
        this.hintTimer = 0;
    }
    update() {
        if (this.finished) return;
        this.timer++;
        if (this.intro < 1) { this.intro += 0.04; return; }
        const s = store.player.battleSoul;
        const speed = 4.2;
        if (store.input.left) s.x -= speed;
        if (store.input.right) s.x += speed;
        if (store.input.up) s.y -= speed;
        if (store.input.down) s.y += speed;
        s.x = clamp(s.x, this.box.x + s.r, this.box.x + this.box.w - s.r);
        s.y = clamp(s.y, this.box.y + s.r, this.box.y + this.box.h - s.r);
        if (this.timer === 60) this.setHint('用 WASD / 方向键躲避飞来的字。');
        if (this.timer === 240) this.setHint('它们是「噪音」——碰到会受伤，但不会致命。');
        if (this.timer === 360) this.setHint('坚持住……');
        if (this.timer >= this.duration) {
            this.finished = true;
            this.hint = '';
            AudioSys.ding();
            setTimeout(() => {
                showDialogue([
                    '你撑住了第一阵噪音。',
                    '穿过这道门，是记忆长廊——再之后，就是真正的语墟。'
                ], () => {
                    // 进入房间2：必须清空 battle，否则会卡在战斗分支
                    TUTORIAL.battle = null;
                    store.player.x = -180;
                    store.player.y = 0;
                    store.camera.x = -180;
                    store.camera.y = 0;
                    TUTORIAL.room = 2;
                    TUTORIAL.readCount2 = 0;
                    setObjective('阅读记忆长廊墙上的文字（至少 3 段）');
                });
            }, 400);
        }
        const interval = this.timer < 180 ? 50 : this.timer < 360 ? 34 : 24;
        if (this.timer % interval === 0) {
            const texts = ['绝', '笑', '死', '破', '防', 'awsl'];
            const side = choice(['top', 'left', 'right']);
            let bx, by, vx, vy;
            const sp = 2 + rand(0, 1.2);
            if (side === 'top') {
                bx = this.box.x + rand(20, this.box.w - 20); by = this.box.y - 10;
                vx = rand(-0.6, 0.6); vy = sp;
            } else if (side === 'left') {
                bx = this.box.x - 10; by = this.box.y + rand(20, this.box.h - 20);
                vx = sp; vy = rand(-0.6, 0.6);
            } else {
                bx = this.box.x + this.box.w + 10; by = this.box.y + rand(20, this.box.h - 20);
                vx = -sp; vy = rand(-0.6, 0.6);
            }
            this.bullets.push({ x: bx, y: by, vx, vy, text: choice(texts), size: 16 + rand(0, 6), color: choice(['#ff00cc', '#39ff14', '#ffcc00']), life: 400 });
            AudioSys.pop(220 + rand(-40, 40));
        }
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx; b.y += b.vy; b.life--;
            const dx = b.x - s.x, dy = b.y - s.y;
            if (Math.sqrt(dx * dx + dy * dy) < s.r + b.size * 0.4) {
                takeDamage(4); this.shake = 8; AudioSys.hit();
                particles.emit(b.x, b.y, 6, b.color, 'spark');
                this.bullets.splice(i, 1); continue;
            }
            if (b.life <= 0 || b.x < this.box.x - 40 || b.x > this.box.x + this.box.w + 40 || b.y < this.box.y - 40 || b.y > this.box.y + this.box.h + 40) {
                this.bullets.splice(i, 1);
            }
        }
        if (this.shake > 0) this.shake--;
        if (this.hintTimer > 0) this.hintTimer--;
    }
    setHint(t) { this.hint = t; this.hintTimer = 240; }
    draw(ctx, frameT) {
        ctx.save();
        if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
        clear(ctx, store.width, store.height, '#000');
        const a = clamp(this.intro, 0, 1);
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.strokeRect(this.box.x, this.box.y, this.box.w, this.box.h);
        drawText(ctx, '噪音 · 引导', this.box.x + this.box.w / 2, this.box.y - 22, '#fff', 15);
        for (const b of this.bullets) {
            ctx.save();
            ctx.shadowColor = b.color; ctx.shadowBlur = 8;
            ctx.fillStyle = b.color; setPixelFont(ctx, b.size);
            ctx.textAlign = 'center'; ctx.fillText(b.text, b.x, b.y);
            ctx.restore();
        }
        const s = store.player.battleSoul;
        ctx.save();
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
        ctx.restore();
        const pct = clamp(this.timer / this.duration, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(this.box.x, this.box.y + this.box.h + 16, this.box.w, 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.box.x, this.box.y + this.box.h + 16, this.box.w * pct, 4);
        if (this.hint && this.hintTimer > 0) {
            ctx.globalAlpha = clamp(this.hintTimer / 60, 0, 1);
            drawText(ctx, this.hint, store.width / 2, this.box.y + this.box.h + 44, 'rgba(255,255,255,0.8)', 13);
        }
        ctx.globalAlpha = 1; ctx.restore();
    }
}

export const TUTORIAL = {
    battle: null,
    battleTriggered: false,
    room: 1,
    readCount: 0,
    readCount2: 0,
    entered: false,
    _nearWall: null,
    _nearKeystone: false,

    reset() {
        this.battle = null; this.battleTriggered = false;
        this.room = 1; this.readCount = 0; this.readCount2 = 0;
        this.entered = false; this._nearWall = null; this._nearKeystone = false;
    },

    update() {
        if (!this.entered) {
            this.entered = true;
            store.player.x = -180; store.player.y = 0;
            store.camera.x = -180; store.camera.y = 0;
            setObjective('阅读墙上的文字（至少 3 段），寻找出口');
            setTimeout(() => {
                showDialogue([
                    '（你在狭小的房间里醒来。出口在东边。）',
                    '墙上有字。走近后按 E 或 空格 阅读。',
                    '角落有一块灰白的「要石」——按 E 看看。',
                    '（按 M 查看地图。）'
                ]);
            }, 300);
        }

        if (this.battle) { this.battle.update(); return; }
        if (store.dialogue.active) return;
        if (store.keystoneUI && store.keystoneUI.open) return;

        updatePlayerPhysics2D(1 / 60);
        const room = this.room === 1 ? ROOM1 : ROOM2;
        store.player.x = clamp(store.player.x, room.minX + 24, room.maxX - 24);
        store.player.y = clamp(store.player.y, room.minY + 24, room.maxY - 24);
        updateCamera2D();

        const story = this.room === 1 ? ROOM1_STORY : ROOM2_STORY;

        // 最近墙文字
        this._nearWall = null;
        let bestD = 90;
        const dy = store.player.y - room.minY;       // 玩家到顶墙的距离
        // 玩家必须在顶墙附近（200 像素内）才算"靠近墙字"
        // 同时水平距离要近（80 像素内），避免走过路过就误触
        if (dy >= 0 && dy < 200) {
            for (const w of story) {
                const dx = Math.abs(store.player.x - w.x);
                if (dx < 80 && dx < bestD) { bestD = dx; this._nearWall = w; }
            }
        }

        // 要石（仅房间1）
        this._nearKeystone = false;
        if (this.room === 1) {
            const dx = store.player.x - ROOM1_KEYSTONE.x;
            const dy = store.player.y - ROOM1_KEYSTONE.y;
            if (Math.sqrt(dx * dx + dy * dy) < 70) this._nearKeystone = true;
        }

        // E / 空格 交互
        if (store.input.justInteract) {
            store.input.justInteract = false;
            if (this._nearKeystone) {
                interactKeystone('tutorial');
                return;
            }
            if (this._nearWall) {
                const w = this._nearWall;
                const isRoom2 = this.room === 2;
                if (!w._read) {
                    w._read = true;
                    if (isRoom2) this.readCount2++; else this.readCount++;
                    AudioSys.pop(660);
                    showDialogue([`墙上写着：「${w.text}」`]);
                } else {
                    w._reads = (w._reads || 1) + 1;
                    AudioSys.pop(440 + w._reads * 40);
                    if (w._reads === 2) showDialogue([`（再看一遍：「${w.text}」）`, '……字迹似乎在发抖。']);
                    else if (w._reads === 3) showDialogue([`（第三遍：「${w.text}」）`, '墙裂开一条缝，透出微光。']);
                    else showDialogue([`（第 ${w._reads} 遍：「${w.text}」）`, '它不说话了。但你听见了。']);
                }
                return;
            }
            // 房间1出口 → 触发弹幕
            if (this.room === 1 && !this.battleTriggered && store.player.x >= ROOM1.exitX) {
                if (this.readCount >= 3) {
                    this.battleTriggered = true;
                    this.battle = new TutorialBattle();
                    setObjective('躲避噪音弹幕，撑过这一波');
                    AudioSys.thud();
                } else {
                    showDialogue(['出口被噪音堵住了。先把墙上的话读完（至少 3 段）。']);
                    store.player.x = ROOM1.exitX - 30;
                }
                return;
            }
            // 房间2出口 → 进入大世界
            if (this.room === 2 && store.player.x >= ROOM2.exitX) {
                if (this.readCount2 >= 3) {
                    store.flags.tutorialDone = true;
                    store.world.currentZone = 'ruins';
                    store.scene = 'world';
                    resetPlayerPos(0, 300);
                    setObjective('探索打字机废墟');
                    AudioSys.ding();
                } else {
                    showDialogue(['门还没开。把长廊墙上的话读完（至少 3 段）。']);
                    store.player.x = ROOM2.exitX - 30;
                }
                return;
            }
        }

        particles.update();
    },

    draw(ctx, t) {
        if (this.battle) { this.battle.draw(ctx, t); return; }

        const room = this.room === 1 ? ROOM1 : ROOM2;
        const story = this.room === 1 ? ROOM1_STORY : ROOM2_STORY;
        const name = this.room === 1 ? '苏醒之室' : '记忆长廊';
        const readN = this.room === 1 ? this.readCount : this.readCount2;

        clear(ctx, store.width, store.height, '#0a0a0a');

        // 地面网格
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let gx = room.minX; gx <= room.maxX; gx += 80) {
            const a = project(gx, room.minY), c = project(gx, room.maxY);
            ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
        }
        for (let gy = room.minY; gy <= room.maxY; gy += 80) {
            const a = project(room.minX, gy), c = project(room.maxX, gy);
            ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
        }
        ctx.restore();

        // 上下墙
        drawWall(ctx, room.minX, room.maxX, room.minY, 'h');
        drawWall(ctx, room.minX, room.maxX, room.maxY, 'h');

        // 墙文字
        for (const w of story) {
            const { sx, sy } = project(w.x, room.minY);
            const near = this._nearWall === w;
            ctx.save();
            ctx.globalAlpha = w._read ? (near ? 1.0 : 0.85) : (near ? 0.95 : 0.45);
            ctx.shadowColor = w._read ? '#fff' : 'rgba(255,255,255,0.3)';
            ctx.shadowBlur = w._read ? 8 : (near ? 4 : 0);
            ctx.fillStyle = '#fff';
            ctx.font = '15px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(w.text, sx, sy - 56);
            ctx.restore();
            if (near) {
                drawText(ctx, w._read ? 'E / 空格 重读' : 'E / 空格 阅读', sx, sy - 80, 'rgba(255,255,255,0.85)', 11, 'center');
            }
        }

        // 要石（房间1）
        if (this.room === 1) {
            const { sx, sy } = project(ROOM1_KEYSTONE.x, ROOM1_KEYSTONE.y);
            drawKeystone(ctx, sx, sy, ROOM1_KEYSTONE, t);
            if (this._nearKeystone) {
                const k = isKeystoneActive('tutorial');
                drawText(ctx, k ? 'E / 空格 查看刻文' : 'E / 空格 触碰要石', sx, sy - 100, 'rgba(255,216,122,0.9)', 12, 'center');
            }
        }

        // 出口门
        const exitRead = readN >= 3;
        const { sx: ex, sy: ey } = project(room.exitX, 0);
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(t * 0.08) * 0.2;
        ctx.fillStyle = exitRead ? 'rgba(120,180,255,0.3)' : 'rgba(120,80,80,0.3)';
        ctx.strokeStyle = exitRead ? 'rgba(150,200,255,0.8)' : 'rgba(200,100,100,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 40, 60, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        if (!exitRead) drawText(ctx, '噪音封门', ex, ey - 80, 'rgba(255,120,120,0.8)', 12, 'center');
        else drawText(ctx, this.room === 1 ? '门后：引导战' : '门后：语墟', ex, ey - 80, 'rgba(180,210,255,0.9)', 12, 'center');

        drawPlayer25D(ctx, t);
        particles.draw(ctx, store.camera);

        // HUD
        drawText(ctx, name, 24, 28, 'rgba(255,255,255,0.4)', 13, 'left');
        drawText(ctx, `墙上文字 ${readN} / ${story.length}`, 24, 48, 'rgba(255,255,255,0.3)', 11, 'left');

        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '11px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('WASD 移动 · E/空格 阅读/刻石 · M 地图', store.width - 16, store.height - 14);
        ctx.restore();
    }
};

// 横向墙：沿 x 方向分段画方块
function drawWall(ctx, xStart, xEnd, wy, orient) {
    const step = 50;
    ctx.save();
    for (let x = xStart; x <= xEnd; x += step) {
        const { sx, sy } = project(x, wy);
        drawBlock(ctx, sx, sy, step, 24, 46, '#2a2a2a', '#1a1a1a', '#0e0e0e');
    }
    ctx.restore();
}
