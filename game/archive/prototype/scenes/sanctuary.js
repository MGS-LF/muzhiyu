import { store, showDialogue, setObjective, resetPlayerPos } from '../store.js';
import { clear, drawText, drawCircle } from '../canvas/renderer.js';
import { particles } from '../canvas/particles.js';
import { updatePlayerPhysics2D, updateCamera2D, drawPlayer25D, project, drawBlock } from '../canvas/player.js';
import { clamp } from '../utils/easing.js';
import AudioSys from '../utils/audio.js';

// 语言避难所：第一幕终点，玩家用收集的词汇"种"出家园
const BOUNDS = { minX: -520, maxX: 520, minY: -240, maxY: 360 };

// 可种植的建筑点：走到上面按 E，消耗对应词汇种出建筑
// 出口：南边靠近（0, 320）处放一个返回空地的传送光点（任意时刻可走回）
const EXIT_RETURN = { x: 0, y: 320, w: 80, h: 60, label: '南 → 嘎吱空地（返回）' };
let nearExit = false;

const BUILD_SPOTS = [
    { id: 'lamp',    need: 'light', x: -220, y: 80,  label: '种一盏灯',  built: false },
    { id: 'path',    need: 'road',  x: 60,   y: 160, label: '铺一条路',  built: false },
    { id: 'campfire',need: 'fire',  x: 0,    y: 60,  label: '燃一堆火',  built: false },
    { id: 'blueHut', need: 'safe',  x: 240,  y: 120, label: '搭小蓝的屋', built: false },
    { id: 'oldTree', need: null,    x: -120, y: 220, label: '种下老树桩', built: false }
];

let entered = false;
let builtCount = 0;
let nearSpot = null;
let endingStarted = false;
let endingTimer = 0;
let blueLightT = 0; // 蓝色光栅伏笔动画

export const SANCTUARY = {
    reset() {
        entered = false;
        builtCount = 0;
        nearSpot = null;
        endingStarted = false;
        endingTimer = 0;
        blueLightT = 0;
        for (const s of BUILD_SPOTS) { s.built = false; }
    },

    update() {
        if (!entered) {
            entered = true;
            store.player.evolution = Math.max(store.player.evolution, 2);
            resetPlayerPos(0, 300);
            setObjective('走到光点处，用词汇「种」出避难所');
            setTimeout(() => {
                showDialogue([
                    '鹦鹉螺的旋转越来越慢。',
                    '环上的字脱落、化成尘埃。',
                    '最后剩下一圈安静的木制年轮。',
                    '老树桩从里面走了出来。',
                    '',
                    '「……我复制了千万遍。却从未说过自己的话。」',
                    '「带我去吧。我想种一棵真正的树。」',
                    '',
                    '——老树桩加入了你们。',
                    '',
                    '向北穿过一片汉字树林，脚下冒出白色光点涟漪。',
                    '终于来到一片灰白色的空地。',
                    '',
                    '「这里好安静……」小蓝小声说。',
                    '老树桩：「不是等。是要种。」',
                    '「把字种进土里。它们就会长出来。」',
                    '',
                    '地上有 5 个发着淡金色光的圆点。',
                    '「用你身上的字去种。然后这里就是我们的家。」',
                    '',
                    '（走到光点旁按 E 种建筑；缺字时会有提示。）'
                ]);
            }, 400);
        }

        if (store.dialogue.active) return;

        // 结局演出
        if (endingStarted) {
            endingTimer++;
            blueLightT += 0.01;
            particles.update();
            if (endingTimer === 180) {
                showDialogue([
                    '最后一处建筑也立起来了。',
                    '避难所——完工。',
                    '',
                    '小蓝第一个冲过去，绕着篝火转圈。',
                    '「有家了！有家了！」',
                    '「这里有光！有路！有火！有屋顶！」',
                    '「——有我自己！」',
                    '',
                    '老树桩慢慢旋转年轮。',
                    '它看着那堆篝火，看了很久。',
                    '然后它说——',
                    '「……慢，真好。」',
                    '「这一句话，我转了一万遍才说出来。」',
                    '「但——这一句是我自己的。」',
                    '',
                    '它看向你。',
                    '「记录者，你低头看看自己。」',
                    '',
                    '你低头。',
                    '你的肩膀上——多了一件由词汇织成的风衣。',
                    '「光」「路」「听」「慢」「真」「问」「安」……',
                    '它们绕着你飞，每个字都在微微发烫。',
                    '',
                    '你迈出一步。',
                    '脚下——',
                    '冒出了淡淡的草色光点。',
                    '像刚下过雨的草地。',
                    '',
                    '小蓝看见了，跑过来，蹲下。',
                    '「哇……你每走一步，都在种草。」',
                    '「——我们住在这里，草会越种越密。」',
                    '',
                    '……',
                    '……',
                    '',
                    '你抬头看向远方。',
                    '天边——有一丝极淡的蓝色。',
                    '像是蓝色的光栅。',
                    '光栅上滚动着极小的白字。',
                    '「猜你喜欢」「为你推荐」「同类推荐」「更多相似」……',
                    '',
                    '它还很远。',
                    '但你看见了。',
                    '它在——',
                    '逼近。',
                    '',
                    '老树桩：「第二幕要来了。」',
                    '小蓝：「……它好大。」',
                    '老树桩：「嗯。比我们大得多。」',
                    '小蓝：「但我们有人啊。」',
                    '老树桩：「对。我们有人。」',
                    '小蓝：「还有家。」',
                    '老树桩：「还有家。」',
                    '',
                    '它们回头看你。',
                    '你看着远处那堵慢慢逼近的蓝色光栅。',
                    '你胸口的词汇们——',
                    '一个接一个地亮起来。',
                    '像在等命令。',
                    '',
                    '（第一幕 · 噪音荒漠 —— 完成）',
                    '（第二幕 · 算法茧房 —— 即将到来）'
                ], () => {
                    setObjective('第一幕 · 噪音荒漠 —— 完成');
                });
            }
            return;
        }

        updatePlayerPhysics2D(1 / 60);
        store.player.x = clamp(store.player.x, BOUNDS.minX + 20, BOUNDS.maxX - 20);
        store.player.y = clamp(store.player.y, BOUNDS.minY + 20, BOUNDS.maxY - 20);
        updateCamera2D();

        // 检测最近的可种植点
        nearSpot = null;
        let bestD = 70;
        for (const s of BUILD_SPOTS) {
            if (s.built) continue;
            const dx = s.x - store.player.x;
            const dy = s.y - store.player.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestD) { bestD = d; nearSpot = s; }
        }

        // 交互
        if (store.input.justInteract) {
            store.input.justInteract = false;
            if (nearExit) {
                // 返回世界场景（clearing 空地）
                store.scene = 'world';
                store.world.currentZone = 'clearing';
                store.player.x = 0;
                store.player.y = -120;
                store.camera.x = 0; store.camera.y = -120;
                setObjective('避难所：自由出入');
                AudioSys.ding();
                return;
            }
            if (nearSpot) {
                this.tryBuild(nearSpot);
                return;
            }
        }

        // 检测是否在返回空地的出口附近
        const edx = EXIT_RETURN.x - store.player.x;
        const edy = EXIT_RETURN.y - store.player.y;
        nearExit = Math.abs(edx) < EXIT_RETURN.w / 2 && Math.abs(edy) < EXIT_RETURN.h / 2;

        // 全部建完 → 触发结局
        if (builtCount >= BUILD_SPOTS.length && !endingStarted) {
            endingStarted = true;
            endingTimer = 0;
            store.flags.sanctuaryBuilt = true;
            AudioSys.ding();
            particles.emit(0, 60, 50, '#ffd87a', 'spark');
        }

        particles.update();
    },

    tryBuild(spot) {
        // 老树桩自动种下（不需词汇）
        if (spot.id === 'oldTree') {
            spot.built = true;
            builtCount++;
            AudioSys.collect();
            particles.emit(spot.x, spot.y, 24, '#caa', 'spark');
            showDialogue([
                '老树桩慢慢蹲下。',
                '它的年轮——开始往下扎根。',
                '「咔。」',
                '根须扎进灰白的泥土里。',
                '',
                '年轮截面在地面上浮现出来——',
                '一圈、两圈、三圈……',
                '每一圈都向外扩一点。',
                '',
                '老树桩：「这里就是中心了。」',
                '「以后大家可以围着我坐。」',
                '「我把所有听过的真心话，都刻在年轮里。」',
                '「这样——」',
                '「——就不会被遗忘了。」',
                '',
                '它抬头看着你，眼睛里有了神采。',
                '「谢谢你，记录者。」',
                '「让我又可以慢慢长了。」'
            ]);
            this.updateObjective();
            return;
        }
        // 需要对应词汇（小蓝的屋：有小蓝跟随也可建）
        const has = store.collectedWords.some(w => w.id === spot.need)
            || (spot.id === 'blueHut' && store.flags.littleBlueSaved);
        if (!has) {
            const needChar = { light: '光', road: '路', fire: '火', safe: '安' }[spot.need];
            showDialogue([
                `你伸手按在光点上——`,
                '它没有反应。',
                '',
                '老树桩：「少一个字。」',
                `「需要「${needChar}」——${({light:'光是从地里长出来的，黑暗里要先有光。',road:'路是走出来的方向，没有路，世界只是一片灰。',fire:'火是温度，是夜晚的依靠，是不让心冷下去的东西。',safe:'安是停下来的地方，是可以写诗的地方。'})[spot.need]}」`,
                '',
                `你低头看自己的胸口——没有「${needChar}」字。`,
                '（也许在某个地方，你能再找到它。）'
            ]);
            return;
        }
        spot.built = true;
        builtCount++;
        AudioSys.collect();
        setTimeout(() => AudioSys.ding(), 120);
        particles.emit(spot.x, spot.y, 30, '#fff', 'spark');

        const lines = {
            lamp: [
                '你把「光」字按进土里。',
                '它先沉下去。',
                '然后——',
                '一根细细的白色茎从土里冒出来，',
                '茎的顶端，开出了一盏灯。',
                '',
                '路灯在原地亮了起来。',
                '它的光照亮了周围 5 米。',
                '——黑暗退了一步。',
                '',
                '小蓝：「哇——」',
                '「有光以后，我才发现：原来周围有这么多字。」',
                '「它们都躲在黑暗里。现在能看见了。」'
            ],
            path: [
                '「路」字落到地面。',
                '它没有生根。',
                '而是——铺开。',
                '',
                '一条由细密白线组成的小径从避难所中央向外延伸。',
                '它没有尽头。',
                '但它有一个方向。',
                '',
                '老树桩：「有路，就有家。」',
                '「有家，就有人会回来。」',
                '小蓝：「我以后出门看晚霞，就顺着这条路走。」',
                '「——走多远都不怕。因为知道有路能回来。」'
            ],
            campfire: [
                '「火」字落入地面。',
                '它剧烈地——烧了起来。',
                '',
                '一堆篝火在避难所中央燃起。',
                '火光在每个 NPC 的脸上跳动。',
                '暖意在空地上散开。',
                '',
                '小蓝凑过去烤手。',
                '「嗯——」',
                '「我想起来我第一次写诗的那天。」',
                '「也是这样的火。这样的夜。」',
                '「我写：『夜深了，火还亮着。我也是。』」',
                '',
                '老树桩笑了。',
                '「好诗。」',
                '「以前没人说吗？」',
                '小蓝：「没人看。」',
                '老树桩：「那现在有人看了。」',
                '「——我看见了。」'
            ],
            blueHut: [
                '小蓝从你手里接过「安」字。',
                '它的手有点抖。',
                '',
                '「这是我……第一次盖房子。」',
                '它小声说。',
                '「以前……都是借住别人的地方写诗。」',
                '「图书馆。地铁站。24 小时便利店。」',
                '「没人在意我，但也没人——」',
                '「——把我当成『家』。」',
                '',
                '它把「安」字按在地面上。',
                '蓝白色的小屋拔地而起——',
                '三角形的屋顶，方方的窗户，',
                '门口有一块小石头，上面写着：',
                '「蓝 · 安」',
                '',
                '小蓝推开门，探头进去。',
                '「——哇。」',
                '它回头，眼睛亮亮的。',
                '「记录者，我有一个家了。」',
                '「一个——我自己写诗的地方。」',
                '「谢谢你。」',
                '',
                '它小声补充：',
                '「以后你来，我念诗给你听。」'
            ]
        }[spot.id];
        showDialogue(lines);
        this.updateObjective();
    },

    updateObjective() {
        const left = BUILD_SPOTS.length - builtCount;
        if (left > 0) {
            setObjective(`继续种建筑（剩余 ${left} 处）`);
        } else {
            setObjective('避难所已成——感受这一切');
        }
    },

    draw(ctx, t) {
        // 米白+淡灰色调
        clear(ctx, store.width, store.height, '#d8d4cc');

        // 地面网格（淡）
        ctx.save();
        ctx.strokeStyle = 'rgba(80,70,60,0.12)';
        ctx.lineWidth = 1;
        const step = 80;
        for (let gx = Math.floor(BOUNDS.minX / step) * step; gx <= BOUNDS.maxX; gx += step) {
            const a = project(gx, BOUNDS.minY), c = project(gx, BOUNDS.maxY);
            ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
        }
        for (let gy = Math.floor(BOUNDS.minY / step) * step; gy <= BOUNDS.maxY; gy += step) {
            const a = project(BOUNDS.minX, gy), c = project(BOUNDS.maxX, gy);
            ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(c.sx, c.sy); ctx.stroke();
        }
        ctx.restore();

        // 环绕的汉字树林（避难所边界）
        const trees = [
            { x: -420, y: 40, s: 1.1 }, { x: 400, y: 80, s: 1 },
            { x: -360, y: 300, s: 1 }, { x: 380, y: 280, s: 1.1 },
            { x: -460, y: 200, s: 0.9 }, { x: 440, y: 200, s: 1 }
        ];
        for (const tr of trees) this.drawTree(ctx, tr.x, tr.y, tr.s, t);

        // 收集实体并按 y 排序
        const ents = [];
        for (const s of BUILD_SPOTS) ents.push({ kind: 'spot', s, y: s.y });
        ents.push({ kind: 'npc', id: 'littleBlue', x: -80, y: 100, y2: 100 });
        ents.push({ kind: 'npc', id: 'oldTree', x: 120, y: 240, y2: 240 });
        ents.push({ kind: 'player', y: store.player.y });

        ents.sort((a, b) => a.y - b.y);

        for (const e of ents) {
            if (e.kind === 'spot') this.drawSpot(ctx, e.s, t);
            else if (e.kind === 'npc') this.drawNpc(ctx, e.id, e.x, e.y2, t);
            else if (e.kind === 'player') drawPlayer25D(ctx, t);
        }

        particles.draw(ctx, store.camera);

        // 建好的建筑
        for (const s of BUILD_SPOTS) {
            if (s.built) this.drawBuilding(ctx, s, t);
        }

        // 蓝色光栅伏笔（结局演出时逐渐显现）
        if (endingStarted) {
            const alpha = clamp(blueLightT, 0, 0.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = 'rgba(80,140,220,0.6)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 8; i++) {
                const x = (i / 8) * store.width + Math.sin(t * 0.02 + i) * 20;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, store.height);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(180,210,255,0.5)';
            ctx.font = '12px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('猜你喜欢', store.width * 0.3, 40 + Math.sin(t * 0.05) * 6);
            ctx.fillText('为你推荐', store.width * 0.7, 60 + Math.cos(t * 0.05) * 6);
            ctx.restore();

            if (blueLightT > 1.5) {
                ctx.save();
                ctx.fillStyle = `rgba(80,140,220,${clamp((blueLightT - 1.5) * 0.3, 0, 0.7)})`;
                ctx.font = '13px "Microsoft YaHei", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('……远方有蓝色的光栅在逼近。第二幕，正在到来。', store.width / 2, store.height - 60);
                ctx.restore();
            }
        }

        // 区域名 + 操作提示
        drawText(ctx, '语言避难所', 24, 28, 'rgba(60,50,40,0.6)', 14, 'left');

        if (!endingStarted) {
            ctx.save();
            ctx.fillStyle = 'rgba(60,50,40,0.3)';
            ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText('WASD 移动  ·  E/空格 种建筑 / 返回', store.width - 16, store.height - 14);
            ctx.restore();
        }

        // 返回空地的出口（南边）—— 用淡蓝色传送光圈表示
        if (!endingStarted) {
            const { sx, sy } = project(EXIT_RETURN.x, EXIT_RETURN.y);
            const pulse = 0.5 + Math.sin(t * 0.08) * 0.3;
            ctx.save();
            ctx.globalAlpha = 0.4 + pulse * 0.3;
            ctx.fillStyle = 'rgba(120,180,255,0.25)';
            ctx.strokeStyle = 'rgba(150,200,255,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(sx, sy, EXIT_RETURN.w / 2, EXIT_RETURN.h / 2 * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            drawText(ctx, EXIT_RETURN.label, sx, sy - 20, 'rgba(180,210,255,0.85)', 12, 'center');
            if (nearExit) {
                drawText(ctx, 'E / 空格 返回嘎吱空地', sx, sy - 38, 'rgba(255,216,122,0.95)', 12, 'center');
            }
        }
    },

    drawSpot(ctx, s, t) {
        if (s.built) return;
        const { sx, sy } = project(s.x, s.y);
        const pulse = 0.5 + Math.sin(t * 0.08 + s.x) * 0.3;
        ctx.save();
        // 光圈
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = 'rgba(255,216,122,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 28, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        // 中心光点
        ctx.fillStyle = 'rgba(255,216,122,0.5)';
        ctx.beginPath();
        ctx.arc(sx, sy - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 需要的词
        const needChar = { light: '光', road: '路', fire: '火', safe: '安' }[s.need];
        const canBuild = !s.need || store.collectedWords.some(w => w.id === s.need)
            || (s.id === 'blueHut' && store.flags.littleBlueSaved);
        let label;
        if (s.id === 'oldTree') label = s.label;
        else if (s.id === 'blueHut' && store.flags.littleBlueSaved) label = '小蓝的屋';
        else label = `需要「${needChar}」`;
        drawText(ctx, label, sx, sy - 28,
            nearSpot === s ? 'rgba(255,216,122,1)' : 'rgba(120,100,70,0.7)', 11, 'center');
        if (nearSpot === s) {
            drawText(ctx, canBuild ? 'E / 空格 种下' : '缺少词汇', sx, sy - 48,
                canBuild ? 'rgba(255,216,122,0.95)' : 'rgba(200,120,120,0.8)', 12, 'center');
        }
    },

    drawBuilding(ctx, s, t) {
        const { sx, sy } = project(s.x, s.y);
        switch (s.id) {
            case 'lamp': {
                drawBlock(ctx, sx, sy, 8, 8, 50, '#666', '#444', '#333');
                ctx.save();
                ctx.fillStyle = '#ffd87a';
                ctx.shadowColor = '#ffd87a';
                ctx.shadowBlur = 16 + Math.sin(t * 0.1) * 4;
                ctx.beginPath();
                ctx.arc(sx, sy - 56, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                break;
            }
            case 'path': {
                ctx.save();
                ctx.fillStyle = 'rgba(200,190,170,0.7)';
                for (let i = 0; i < 5; i++) {
                    const { sx: px, sy: py } = project(s.x + (i - 2) * 30, s.y + i * 20);
                    ctx.fillRect(px - 12, py - 4, 24, 8);
                }
                ctx.restore();
                break;
            }
            case 'campfire': {
                drawBlock(ctx, sx, sy, 30, 20, 8, '#555', '#3a3a3a', '#222');
                ctx.save();
                const flick = 0.7 + Math.sin(t * 0.2) * 0.3;
                ctx.fillStyle = `rgba(255,140,40,${flick})`;
                ctx.shadowColor = '#ff8c28';
                ctx.shadowBlur = 18;
                ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('火', sx, sy - 16 + Math.sin(t * 0.15) * 2);
                ctx.restore();
                break;
            }
            case 'blueHut': {
                ctx.save();
                ctx.fillStyle = '#4488ff';
                ctx.beginPath();
                ctx.moveTo(sx - 24, sy);
                ctx.lineTo(sx, sy - 32);
                ctx.lineTo(sx + 24, sy);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '10px "Microsoft YaHei", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('安', sx, sy - 12);
                ctx.restore();
                break;
            }
            case 'oldTree': {
                drawBlock(ctx, sx, sy, 28, 28, 18, '#6a4a2a', '#3a2a1a', '#241208');
                ctx.save();
                ctx.strokeStyle = '#8a6a3a';
                ctx.lineWidth = 1.5;
                for (let r = 6; r <= 16; r += 5) {
                    ctx.beginPath();
                    ctx.ellipse(sx, sy - 18, r, r * 0.4, t * 0.005, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
                break;
            }
        }
    },

    drawNpc(ctx, id, x, y, t) {
        const { sx, sy } = project(x, y);
        if (id === 'littleBlue') {
            // 开心的小蓝：举高双手
            ctx.save();
            ctx.strokeStyle = '#4488ff';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            const sway = Math.sin(t * 0.12) * 2;
            drawCircle(ctx, sx, sy - 40 + sway, 6, '#4488ff', false);
            ctx.beginPath();
            ctx.moveTo(sx, sy - 34 + sway); ctx.lineTo(sx, sy - 14);
            // 双臂高举
            ctx.moveTo(sx, sy - 30 + sway); ctx.lineTo(sx - 9, sy - 44 + sway);
            ctx.moveTo(sx, sy - 30 + sway); ctx.lineTo(sx + 9, sy - 44 + sway);
            ctx.moveTo(sx, sy - 14); ctx.lineTo(sx - 5, sy);
            ctx.moveTo(sx, sy - 14); ctx.lineTo(sx + 5, sy);
            ctx.stroke();
            ctx.restore();
            drawText(ctx, '小蓝', sx, sy - 56, '#4488ff', 11);
        } else if (id === 'oldTree') {
            drawBlock(ctx, sx, sy, 26, 26, 18, '#6a4a2a', '#3a2a1a', '#241208');
            ctx.save();
            ctx.strokeStyle = '#8a6a3a';
            ctx.lineWidth = 1.5;
            for (let r = 6; r <= 16; r += 5) {
                ctx.beginPath();
                ctx.ellipse(sx, sy - 18, r, r * 0.4, t * 0.003, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
            drawText(ctx, '老树桩', sx, sy - 48, '#8a6a3a', 11);
        }
    },

    drawTree(ctx, wx, wy, s, t) {
        const { sx, sy } = project(wx, wy);
        drawBlock(ctx, sx, sy, 10 * s, 10 * s, 20 * s, '#5a3a1a', '#3a2410', '#2a1808');
        ctx.save();
        ctx.fillStyle = 'rgba(60,50,40,0.7)';
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
};
