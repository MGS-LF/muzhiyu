// 荧光河床 — 支线 / 第二章伏笔
// 角色：墨水（被数字洪流冲散手稿的写作者）、玩家获得「开」与「我」字；移动速度提升（区域效果 swift）
// 设计意图：开阔水域，物件散布但有距离感，不显拥挤；有独立支线角色

export const riverbedZone = {
    id: 'riverbed',
    name: '荧光河床',
    ground: '#0a1a1a',
    grid: 'rgba(120,220,255,0.05)',
    bounds: { minX: -600, maxX: 600, minY: -400, maxY: 800 },

    exits: [
        { x: 550, y: 0, w: 120, h: 80, toZone: 'corridor', toX: -470, toY: 60, label: '东 → 垃圾回廊' },
        { x: 0, y: -300, w: 120, h: 80, toZone: 'clearing', toX: -350, toY: 60, label: '北 → 嘎吱空地' }
    ],

    objects: [
        // ---- 核心 NPC：墨水（写作者） ----
        { type: 'npc', id: 'ink', x: -100, y: 200 },

        // ---- 词汇：开 + 我（"我"是第二章伏笔） ----
        { type: 'word', id: 'open', x: -300, y: -100 },
        { type: 'word', id: 'I', x: 250, y: 200 },

        // ---- 氛围：少量树 ----
        { type: 'tree', x: -350, y: 100, s: 1 },
        { type: 'tree', x: 380, y: -100, s: 1.1 },

        // ---- 收集：3 枚语义碎片（河床散落） ----
        { type: 'shard', x: -480, y: 300 },
        { type: 'shard', x: 400, y: -280 },
        { type: 'shard', x: 0, y: 0 },

        // ---- 探索：2 块可翻碎石 ----
        { type: 'rubble', x: -200, y: 400, _interact: true, _id: 'riv_r1' },
        { type: 'rubble', x: 300, y: -200, _interact: true, _id: 'riv_r2' },

        // ---- 词灵：核心词"醒" ----
        { type: 'wordSpirit', x: 180, y: -180, id: 'wake', patrol: { cx: 180, cy: -180, r: 120 } },

        // ---- 环境叙事 sign（增加故事感） ----
        { type: 'sign', x: -250, y: -200, text: '水还在流，但水里的字已经不会说话了。' },
        { type: 'sign', x: 150, y: 350, text: '（也许"我"是第二章才能用上的词。）' },
        { type: 'sign', x: -400, y: 50, text: '河边有人坐了很久。墨渍还没干透。' },
        { type: 'sign', x: 350, y: 50, text: '（水底沉着一台碎裂的键盘。按键上刻着「发送」。）' }
    ]
};
