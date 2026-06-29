// 废墟东隅 — 支线 / 第二章伏笔
// 角色：玩家用「光」揭开黑暗屏障，拾取「实」字；持有「静」字则可进入石碑密室
// 关键物：黑暗屏障（gate）、隐藏入口（secretGate）、「静」词灵
// 设计意图：相比回廊，物件更稀疏；营造「深入」感

export const depthsZone = {
    id: 'depths',
    name: '废墟东隅',
    ground: '#111',
    grid: 'rgba(255,255,255,0.04)',
    bounds: { minX: -600, maxX: 600, minY: -400, maxY: 800 },

    exits: [
        { x: -550, y: 0, w: 120, h: 80, toZone: 'ruins', toX: 540, toY: 60, label: '西 → 打字机废墟' }
    ],

    objects: [
        // ---- 黑暗屏障：核心谜题 ----
        { type: 'gate', x: 150, y: -120, require: 'light', open: false, label: '黑暗屏障', wordBehind: { id: 'real', x: 220, y: -160 } },

        // ---- 词汇：屏障后才有"实"；"静"由词灵承载（不要静态 word 重复出现） ----

        // ---- 隐藏入口：通往石碑密室 ----
        { type: 'secretGate', x: 500, y: -300, require: 'quiet', toZone: 'steles', toX: -400, toY: 0, label: '石碑密室' },

        // ---- 氛围：少量树与碎石 ----
        { type: 'tree', x: -300, y: -100, s: 1 },
        { type: 'tree', x: 350, y: 150, s: 1.1 },

        // ---- 探索：2 块可翻碎石（之前 2 块，保留） ----
        { type: 'rubble', x: -120, y: -200, _interact: true, _id: 'dep_r1' },
        { type: 'rubble', x: 200, y: 250, _interact: true, _id: 'dep_r2' },

        // ---- 收集：2 枚语义碎片 ----
        { type: 'shard', x: -400, y: 100 },
        { type: 'shard', x: 0, y: 400 },

        // ---- 词灵：核心词"静" ----
        { type: 'wordSpirit', x: -350, y: 300, id: 'quiet', patrol: { cx: -250, cy: 200, r: 180 } },

        // ---- 引导提示 + 环境叙事 ----
        { type: 'sign', x: 120, y: -220, text: '"光"在这里不是照明，是钥匙。' },
        { type: 'sign', x: 400, y: -250, text: '（东南角好像还有路——但需要沉静的心才能看见。）' },
        { type: 'sign', x: -450, y: -300, text: '（墙壁上刻着一句话，被黑暗吞了一半：）' },
        { type: 'sign', x: -440, y: -270, text: '「……当所有人都在喊叫的时候……」' },
    ]
};
