// 嘎吱空地 — 第一幕高潮
// 角色：玩家净化老树桩（鹦鹉螺），完成第一章主线
// 关键物：老树桩（鹦鹉螺）、要石、词汇
// 设计意图：环绕的汉字树丛（之前 8 棵减到 6 棵）形成"空地"围合感
// 词汇三选一后触发战斗，更聚焦

export const clearingZone = {
    id: 'clearing',
    name: '嘎吱空地',
    ground: '#0d0d0d',
    grid: 'rgba(255,255,255,0.05)',
    bounds: { minX: -600, maxX: 600, minY: -250, maxY: 1050 },

    exits: [
        { x: 0, y: 1000, w: 120, h: 80, toZone: 'corridor', toX: 0, toY: -100, label: '南 → 垃圾回廊' },
        { x: -500, y: 0, w: 120, h: 80, toZone: 'riverbed', toX: 0, toY: -200, label: '西 → 荧光河床' },
        // 完成第一章主线（净化老树桩）后开放：通往语言避难所
        { x: 0, y: -200, w: 140, h: 90, toScene: 'sanctuary', toX: 0, toY: 300, label: '北 → 语言避难所（已完成第一章后可自由进出）', lock: { flag: 'oldTreeSaved' } }
    ],

    objects: [
        // ---- 汉字树丛（6 棵围合，从 8 减到 6） ----
        { type: 'tree', x: -380, y: 200, s: 1.2 },
        { type: 'tree', x: 400, y: 100, s: 1 },
        { type: 'tree', x: -300, y: 700, s: 1.1 },
        { type: 'tree', x: 360, y: 760, s: 0.9 },
        { type: 'tree', x: -520, y: 480, s: 1 },
        { type: 'tree', x: 520, y: 460, s: 1.1 },

        // ---- 核心 NPC：老树桩（鹦鹉螺） ----
        { type: 'npc', id: 'oldTree', x: 0, y: 560 },

        // ---- 核心词汇（沿空地边缘分布，三选一触发战斗） ----
        { type: 'word', id: 'slow', x: -260, y: 360 },
        { type: 'word', id: 'true', x: 0, y: 260 },
        { type: 'word', id: 'ask', x: 260, y: 420 },
        // 隐藏词：火
        { type: 'word', id: 'fire', x: -460, y: 640 },

        // ---- 要石（净化老树桩后激活） ----
        { type: 'keystone', x: 300, y: 560, zoneId: 'clearing' },

        // ---- 探索：2 块可翻碎石（之前 3 块） ----
        { type: 'rubble', x: -120, y: 600, _interact: true, _id: 'clr_r1' },
        { type: 'rubble', x: 360, y: 540, _interact: true, _id: 'clr_r2' },

        // ---- 收集：2 枚语义碎片 ----
        { type: 'shard', x: -200, y: 400 },
        { type: 'shard', x: 250, y: 650 },

        // ---- 引导提示（精简到 2 块） ----
        { type: 'sign', x: 200, y: 300, text: '收集「慢·真·问」三个字，再去净化它。' },
        { type: 'sign', x: -360, y: 540, text: '（树后藏着「火」字——避难所用得上。）' }
    ]
};
