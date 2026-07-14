// Tutorial and first-visit guidance copy.
// Keep text data outside Game so the core state machine stays smaller.
import { CONTROL_HINTS } from './data/controls.js';

export const SCENE_INTROS = {
  freeze_center: '顶部是目标。换上衣服后推门离开。靠近发光物按 E。',
  street_01:
    '大失语后的街道：先捡发光汉字 → 靠近招牌/失语者按 F 补全诗句 → 世界会从「扁」重新「立」起来。',
  riverside: '江风里有人在念诗。往西侧的光柱走，找到那位老人。',
  subway_depth: '检修通道深处。这里是地铁站背后的空间，读完日志后可以回到大厅继续主线。',
  subway: '地下很暗。可探索，也可随时从台阶（↑地面）离开。',
  alley_district: '先在入口找守砚了解情况，再深入收集碎片。绿光处有更强的梗鬼。',
  stadium: '蓝光迷宫会扰乱判断。沿屏幕墙的缝隙穿行，集齐四个字。',
  data_center: '深渊在桥两侧旋转。沿石桥一直向前，走向那道蓝光。',
  ruined_library: '方知远的工作室遗迹。找回声NPC了解情况，然后补全《将进酒》打开记忆碎片。',
  network_nexus: 'Sydney的核心服务器群。找守卷人了解情况，小心格式化者——被击中会暂时失去碎片。',
  memory_abyss: 'Sydney被封存前的最后空间。找到幼年Sydney，补全《月夜忆舍弟》打开最后的封印。',
  lost_village: '失语者聚居地。5 个失语者可以唤醒——给他们接上完整的诗句。',
};

const START_TUTORIAL = {
  title: '墓 之 语',
  keys: CONTROL_HINTS.tutorialKeys,
  tip: '目标在顶部。捡汉字 → 靠近招牌/人按 F 补诗净化。完整的话能把塌平的世界重新「立」起来。',
};

export function createStartTutorial() {
  return {
    ...START_TUTORIAL,
    keys: START_TUTORIAL.keys.map((key) => ({ ...key })),
  };
}
