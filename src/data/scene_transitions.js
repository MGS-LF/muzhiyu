// 场景切换后的目标文案与对话配置（数据驱动）
// dialog: 切换后播放的对话 key（DIALOGS 中的 key）
// dialogCond: 对话播放条件（需该 flag 为 true）
// flag: 切换后设置的 flag
// objective: 切换后的目标文案
export const SCENE_TRANSITIONS = {
  riverside: { objective: '前往江堤，与守砚对话', dialog: 'street_to_riverside' },
  street_01: { objective: '继续探索街道，收集「关雎」碎片' },
  freeze_center: { objective: '返回冷冻中心' },
  subway: { objective: '探索地铁站，小心梗鬼' },
  alley_district: {
    objective: '在废墟居民区找到守砚',
    dialog: 'riverside_to_alley',
    dialogCond: 'met_shuyuan',
  },
  house_a: { objective: '搜刮民居A' },
  house_b: { objective: '清除民居B里的梗鬼' },
  stadium: { objective: '与守砚对话', dialog: 'alley_to_stadium' },
  ruined_library: {
    objective: '在废图书馆找到方知远的终端',
    dialog: 'chapter5_intro',
    dialogOnceFlag: 'chapter5_started',
    flag: 'chapter5_started',
  },
  data_center: { objective: '走向石桥尽头的蓝色光影' },
  network_nexus: { objective: '在网络中枢找到守卷人' },
  memory_abyss: { objective: '在记忆深渊找到幼年Sydney' },
  lost_village: { objective: '唤醒失语者聚居地中的失语者' },
};
