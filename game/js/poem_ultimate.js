// 诗词连击大招系统 —— 集齐完整诗句后释放全屏净化波
// 设计：当玩家 collectedCharsAll 中包含某首诗的全部字时，战斗中可按 K 释放大招
// 大招效果：全屏金色净化波 + 大量伤害 + 特殊视觉
// 诗词定义：完整诗句所需汉字 + 大招伤害 + 特效类型

export const POEM_ULTIMATES = [
  {
    id: 'guanju',
    name: '关雎',
    chars: ['洲', '逑'],           // 所需汉字（关雎：关关雎鸠...在河之洲...君子好逑）
    damage: 80,                     // 大招伤害
    color: '#ffd866',               // 金色
    effect: 'purify_wave',          // 净化波特效
    text: '关关雎鸠，在河之洲。窈窕淑女，君子好逑。',
    desc: '《关雎》·浩然正气',
  },
  {
    id: 'tengwang',
    name: '滕王阁序',
    chars: ['鹜', '天', '气', '形'], // 落霞与孤鹜齐飞...秋水共长天一色...气凌云...形胜地
    damage: 120,
    color: '#ffaa44',
    effect: 'golden_birds',         // 金色飞鸟弹幕
    text: '落霞与孤鹜齐飞，秋水共长天一色。',
    desc: '《滕王阁序》·天地浩然',
  },
  {
    id: 'zhengqi',
    name: '正气歌',
    chars: ['天', '地', '气', '形'], // 天地有正气，杂然赋流形
    damage: 120,
    color: '#ff6644',
    effect: 'fire_storm',           // 火焰风暴
    text: '天地有正气，杂然赋流形。',
    desc: '《正气歌》·浩然正气',
  },
  {
    id: 'yueyang',
    name: '岳阳楼记',
    chars: ['岳', '星', '然', '冥'], // 衔远山，吞长江...星辰隐...冥然兀坐
    damage: 150,
    color: '#66ddff',
    effect: 'ice_storm',            // 冰霜风暴
    text: '庆历四年春，滕子京谪守巴陵郡。越明年，政通人和，百废具兴。',
    desc: '《岳阳楼记》·先忧后乐',
  },
  {
    id: 'voidverse',
    name: '太虚',
    chars: ['岳', '星', '然', '冥'], // 同岳阳楼记碎片，但为终极诗词
    damage: 200,
    color: '#ddaaff',
    effect: 'void_collapse',        // 虚空坍缩
    text: '道可道，非常道。名可名，非常名。',
    desc: '终极·太虚之力',
  },
];

// 检查玩家是否拥有某首诗的全部汉字
export function canUseUltimate(collectedCharsAll, poem) {
  const have = [...collectedCharsAll];
  for (const c of poem.chars) {
    const idx = have.indexOf(c);
    if (idx === -1) return false;
    have.splice(idx, 1); // 每个字只匹配一次（去重）
  }
  return true;
}

// 获取玩家当前可用的大招列表
export function getAvailableUltimates(collectedCharsAll) {
  return POEM_ULTIMATES.filter(p => canUseUltimate(collectedCharsAll, p));
}

// 获取第一个可用的大招（快捷键 K 释放）
export function getFirstAvailableUltimate(collectedCharsAll) {
  return POEM_ULTIMATES.find(p => canUseUltimate(collectedCharsAll, p)) || null;
}
