// 区域共享配置：词池 / 故事片段 / 环境效果

export const WORD_CHAR = {
    listen: '听', slow: '慢', true: '真', ask: '问', light: '光',
    road: '路', fire: '火', quiet: '静', safe: '安', open: '开',
    real: '实', I: '我', blue: '蓝', wake: '醒'
};

// 可翻碎石中的隐藏词汇池（每个区域不同）
export const RUBBLE_POOLS = {
    ruins:    [{ id: 'wake', rate: 0.30 }, { id: 'I',    rate: 0.40 }],
    corridor: [{ id: 'fire', rate: 0.25 }, { id: 'quiet', rate: 0.35 }],
    clearing: [{ id: 'blue', rate: 0.30 }, { id: 'open',  rate: 0.40 }],
    depths:   [{ id: 'real', rate: 0.30 }, { id: 'road',  rate: 0.35 }],
    riverbed: [{ id: 'light', rate: 0.30 }, { id: 'safe', rate: 0.35 }],
    steles:   [{ id: 'true', rate: 0.40 }, { id: 'ask',   rate: 0.50 }]
};

// 碎石翻出的短叙事文本
export const RUBBLE_STORIES = [
    '碎石下压着一张纸条：「明天见。」没有署名，没有日期。',
    '（你翻出来一张沾了墨水的纸片，上面写着「记得带伞」。）',
    '石缝里有一行粉笔字：「我在等你。第 37 天。」',
    '翻开石头，一张褪色的照片掉了出来——两个人的模糊影子。',
    '（石头下面有半句诗：「风吹过……」后面被水浸湿了。）',
    '一张撕了一半的便签：「别忘了给妈打电话。」',
    '（碎石间卡着一枚别针，上面别着三个字：「对不起」。）'
];

// 区域环境效果（effect 名称要和 world.js 中的逻辑对应）
export const ZONE_ENV = {
    ruins:    { name: '打字机废墟', effect: 'none',   desc: '' },
    corridor: { name: '垃圾回廊',   effect: 'corrupt', desc: '污染密集·触碰受伤加倍' },
    clearing: { name: '嘎吱空地',   effect: 'regen',   desc: '语义缓慢恢复' },
    depths:   { name: '废墟东隅',   effect: 'dark',    desc: '视野受限' },
    riverbed: { name: '荧光河床',   effect: 'swift',   desc: '移动加速' },
    steles:   { name: '石碑密室',   effect: 'focus',   desc: '语义碎片双倍' }
};
