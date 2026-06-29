// 打字机废墟 — 序章
// 角色：玩家第一次被引导「倾听」字
// 关键物：打字机（首次倾听会触发噪音事件，开放北行）
// 设计意图：简洁空旷，让打字机成为视觉焦点；树与碎石点缀
// 避免杂物，留出仪式感

export const ruinsZone = {
    id: 'ruins',
    name: '打字机废墟',
    ground: '#1a1a1a',
    grid: 'rgba(255,255,255,0.06)',
    bounds: { minX: -700, maxX: 700, minY: -500, maxY: 900 },

    // 北出口需先读打字机（typewriterRead）
    // toX/toY 是玩家在目标区域出现的位置，刻意放在目标传送门的外侧（远离回程门），避免立刻折返
    exits: [
        { x: 0, y: -440, w: 120, h: 80, toZone: 'corridor', toX: 0, toY: 1110, label: '北 → 垃圾回廊', lock: { flag: 'typewriterRead' } },
        { x: 650, y: 0, w: 120, h: 80, toZone: 'depths', toX: -540, toY: 60, label: '东 → 废墟东隅' }
    ],

    objects: [
        // ---- 视觉焦点：打字机 ----
        { type: 'typewriter', x: 0, y: 0 },

        // ---- 引导：少量提示牌，避免信息噪音 ----
        { type: 'sign', x: -40, y: -120, text: '你……还……在……吗……' },
        { type: 'sign', x: 200, y: 60, text: '北行 → 垃圾回廊（寻找「听」字）' },
        { type: 'sign', x: -80, y: 80, text: '打字机还在打字。按 E 倾听。', isTypewriterHint: true },

        // ---- 氛围：树丛与低语（克制数量） ----
        { type: 'tree', x: -260, y: 120, s: 1 },
        { type: 'tree', x: 280, y: -80, s: 1.1 },
        { type: 'tree', x: -320, y: -260, s: 0.9 },
        { type: 'tree', x: 340, y: 260, s: 1 },
        { type: 'sign', x: 460, y: -200, text: '（地上的字迹：我曾是一首诗。）' },
        { type: 'sign', x: -560, y: -300, text: '（树后有人写过诗，没人看。）' },

        // ---- 探索：2 块可翻碎石（之前是 4 块，减半） ----
        { type: 'rubble', x: -200, y: -380, _interact: true, _id: 'ruins_r1' },
        { type: 'rubble', x: 160, y: -180, _interact: true, _id: 'ruins_r2' },

        // ---- 收集：2 枚语义碎片（之前 3 枚） ----
        { type: 'shard', x: -300, y: 180 },
        { type: 'shard', x: 100, y: 450 },

        // ---- 词灵 ----
        { type: 'wordSpirit', x: 300, y: 280, id: 'ask', patrol: { cx: 300, cy: 200, r: 150 } },

        // ---- 隐藏词：废墟深处的「光」字 ----
        { type: 'word', id: 'light', x: -580, y: -360 }
    ]
};
