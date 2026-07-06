// 诗词连击大招系统 —— 集齐完整诗句后释放全屏净化波
// 设计：当玩家 collectedCharsAll 中包含某首诗的全部字时，战斗中可按 K 释放大招
// 大招效果：全屏金色净化波 + 大量伤害 + 特殊视觉
// 诗词定义：完整诗句所需汉字 + 大招伤害 + 特效类型

export const POEM_ULTIMATES = [
  {
    id: 'guanju',
    chars: ['洲', '逑'],
    damage: 80,
    color: '#ffd866',
    text: '关关雎鸠，在河之洲。窈窕淑女，君子好逑。',
  },
  {
    id: 'tengwang',
    chars: ['鹜', '天', '气', '形'],
    damage: 120,
    color: '#ffaa44',
    text: '落霞与孤鹜齐飞，秋水共长天一色。',
  },
  {
    id: 'zhengqi',
    chars: ['天', '地', '气', '形'],
    damage: 120,
    color: '#ff6644',
    text: '天地有正气，杂然赋流形。',
  },
  {
    id: 'yueyang',
    chars: ['岳', '星', '然', '冥'],
    damage: 150,
    color: '#66ddff',
    text: '庆历四年春，滕子京谪守巴陵郡。越明年，政通人和，百废具兴。',
  },
  {
    id: 'voidverse',
    chars: ['岳', '星', '然', '冥', '月', '秋'],
    damage: 200,
    color: '#ddaaff',
    text: '星河旋落，岳色苍苍；万籁俱冥，吾心了然。',
  },
  // ===== 第五章新诗词大招 =====
  {
    id: 'jiangjinjiu',
    chars: ['河', '海'],
    damage: 130,
    color: '#ffcc66',
    text: '君不见黄河之水天上来，奔流到海不复回。',
  },
  {
    id: 'chunwang',
    chars: ['山', '春'],
    damage: 130,
    color: '#88ee88',
    text: '国破山河在，城春草木深。',
  },
  {
    id: 'yueye',
    chars: ['月', '秋'],
    damage: 140,
    color: '#aaccff',
    text: '今夜月明人尽望，不知秋思落谁家。',
  },
];

function canUseUltimate(collectedCharsAll, poem) {
  const have = [...collectedCharsAll];
  for (const c of poem.chars) {
    const idx = have.indexOf(c);
    if (idx === -1) return false;
    have.splice(idx, 1);
  }
  return true;
}
// 获取第一个可用的大招（快捷键 K 释放）
export function getFirstAvailableUltimate(collectedCharsAll) {
  return POEM_ULTIMATES.find((p) => canUseUltimate(collectedCharsAll, p)) || null;
}
