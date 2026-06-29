// 垃圾回廊 — 第一幕
// 角色：玩家救下小蓝，刻下第一块要石
// 关键物：小蓝（被绝绝子压住）、要石、墓碑群
// 设计意图：纵向走廊（南北长条），墓碑群放在路两侧形成压迫感
// 词汇集中在玩家路径上，避免散落

export const corridorZone = {
    id: 'corridor',
    name: '垃圾回廊',
    ground: '#070707',
    grid: 'rgba(255,255,255,0.04)',
    bounds: { minX: -600, maxX: 600, minY: -250, maxY: 1250 },

    exits: [
        { x: 0, y: 1180, w: 120, h: 80, toZone: 'ruins', toX: 0, toY: -380, label: '南 → 打字机废墟' },
        { x: 0, y: -180, w: 120, h: 80, toZone: 'clearing', toX: 0, toY: 920, label: '北 → 嘎吱空地' },
        { x: -550, y: 0, w: 120, h: 80, toZone: 'riverbed', toX: 470, toY: 0, label: '西 → 荧光河床' }
    ],

    objects: [
        // ---- 墓碑群（路两侧各 5 块，压迫感） ----
        // 左侧
        { type: 'tomb', x: -340, y: 280, text: '绝', color: '#ff00cc' },
        { type: 'tomb', x: -120, y: 420, text: '笑', color: '#39ff14' },
        { type: 'tomb', x: -420, y: 540, text: '笑', color: '#39ff14' },
        { type: 'tomb', x: -200, y: 620, text: '防', color: '#ffcc00' },
        { type: 'tomb', x: -80, y: 760, text: '死', color: '#39ff14' },
        // 右侧
        { type: 'tomb', x: 90, y: 320, text: '死', color: '#ff00cc' },
        { type: 'tomb', x: 280, y: 460, text: '破', color: '#39ff14' },
        { type: 'tomb', x: 220, y: 700, text: '绝', color: '#ff00cc' },
        { type: 'tomb', x: 420, y: 560, text: '破', color: '#ffcc00' },
        { type: 'tomb', x: 340, y: 820, text: '防', color: '#ff00cc' },

        // ---- 核心 NPC：小蓝（被压在墓碑群尽头） ----
        { type: 'npc', id: 'littleBlue', x: 160, y: 820 },

        // ---- 词汇（沿主路径） ----
        { type: 'word', id: 'listen', x: -260, y: 540 },
        { type: 'word', id: 'road', x: 380, y: 920 },

        // ---- 要石（净化小蓝后激活） ----
        { type: 'keystone', x: 0, y: 1060, zoneId: 'corridor' },

        // ---- 探索：2 块可翻碎石（之前 3 块） ----
        { type: 'rubble', x: -60, y: 360, _interact: true, _id: 'cor_r1' },
        { type: 'rubble', x: -300, y: 700, _interact: true, _id: 'cor_r2' },

        // ---- 收集：2 枚语义碎片 ----
        { type: 'shard', x: -400, y: 300 },
        { type: 'shard', x: 0, y: 900 },

        // ---- 词灵 ----
        { type: 'wordSpirit', x: -300, y: 600, id: 'open', patrol: { cx: -200, cy: 500, r: 160 } },

        // ---- 引导提示 + 环境叙事 ----
        { type: 'sign', x: 0, y: 200, text: '小心：墓碑大字会嗡嗡作响。' },
        { type: 'sign', x: 320, y: 640, text: '（前方有人被压住了。）' },
        { type: 'sign', x: -480, y: 1000, text: '（回廊尽头的风里夹着细碎的声音——像是有人在念诗。）' },
    ]
};
