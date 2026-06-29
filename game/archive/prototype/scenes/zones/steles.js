// 石碑密室 — 隐藏区域
// 进入条件：在废墟东隅持有「静」字
// 角色：核心叙事装置（三块石碑）+ 回声（由被删除的消息拼成的幽灵）
// 设计意图：纯净、低密度，给玩家"喘息"空间；隐藏世界真相的线索

export const stelesZone = {
    id: 'steles',
    name: '石碑密室',
    ground: '#0c0c0c',
    grid: 'rgba(180,160,255,0.04)',
    bounds: { minX: -500, maxX: 500, minY: -300, maxY: 600 },

    exits: [
        { x: -480, y: 0, w: 80, h: 80, toZone: 'depths', toX: 480, toY: -300, label: '西 → 废墟东隅' }
    ],

    objects: [
        // ---- 核心实体：回声（幽灵NPC） ----
        { type: 'npc', id: 'echo', x: 0, y: -50 },

        // ---- 三块石碑（核心叙事装置） ----
        { type: 'stele', x: 0, y: -200, text: '第一块石碑', content: '石碑上刻着古老的文字：「真心话是最初的语言。当语言被污染，回来这里——这里的话，没人能删。」' },
        { type: 'stele', x: -200, y: 100, text: '第二块石碑', content: '「每一个被遗忘的字都没有消失——它们在黑暗里等着一个人重新叫出它们的名字。」' },
        { type: 'stele', x: 200, y: 150, text: '第三块石碑', content: '「你不是来修复废墟的——你是来接住那些话的。」' },

        // ---- 词汇：真·慢·火 ----
        { type: 'word', id: 'true', x: -200, y: 0 },
        { type: 'word', id: 'slow', x: 200, y: -100 },
        { type: 'word', id: 'fire', x: 0, y: 280 },

        // ---- 祭坛（碎片兑换） ----
        { type: 'altar', x: 0, y: 400 },

        // ---- 大量语义碎片（区域效果 focus：双倍产出） ----
        { type: 'shard', x: -300, y: -150 },
        { type: 'shard', x: 300, y: -150 },
        { type: 'shard', x: -150, y: 200 },
        { type: 'shard', x: 150, y: 200 },
        { type: 'shard', x: 0, y: -50 },
        { type: 'shard', x: -280, y: 100 },
        { type: 'shard', x: 280, y: 100 },

        // ---- 少量碎石 ----
        { type: 'rubble', x: -80, y: -200, _interact: true, _id: 'stl_r1' },
        { type: 'rubble', x: 80, y: 200, _interact: true, _id: 'stl_r2' },

        // ---- 环境叙事 ----
        { type: 'sign', x: -380, y: -220, text: '（墙壁上有许多划痕——像是无数人用指甲留下的。）' },
        { type: 'sign', x: 360, y: -220, text: '（空气中飘着极淡的文字碎片：「已删除」「撤回""未送达」……）' }
    ]
};
