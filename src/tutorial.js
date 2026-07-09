// Tutorial and first-visit guidance copy.
// Keep text data outside Game so the core state machine stays smaller.

export const SCENE_INTROS = {
  freeze_center: '左上角是你的目标。靠近发光物体按 E 互动。',
  street_01: '废墟街道很大——跟着金色箭头走，沿途按 E 拾取发光的汉字碎片。',
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
  title: '刻 痕 · 遗 忘 的 文 字',
  keys: [
    { k: 'WASD', d: '移动　·　Shift 奔跑' },
    { k: 'E', d: '交互 / 拾取 / 推进对话' },
    { k: '方向键', d: '战斗中移动红心 / 选菜单' },
    { k: 'Q', d: '任务面板' },
    { k: 'Space', d: '战斗确认 / 攻击瞄准确认 / 大地图冲刺' },
    { k: 'K', d: '战斗中释放诗词大招（需集齐完整诗句）' },
    { k: 'I', d: '背包' },
    { k: 'O', d: '设置 / 无障碍选项' },
    { k: 'Tab', d: '小地图开关' },
    { k: 'F5/F9', d: '快速存档 / 读档' },
    { k: 'N', d: '静音切换' },
  ],
  tip: '左上角是当前目标，金色箭头指向下一步。靠近发光物按 E，靠近绿色梗鬼会进入战斗。',
};

export function createStartTutorial() {
  return {
    ...START_TUTORIAL,
    keys: START_TUTORIAL.keys.map((key) => ({ ...key })),
  };
}
