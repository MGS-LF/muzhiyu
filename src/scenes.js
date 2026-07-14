// 场景数据 —— 第一章：苏醒
// 重要：freeze_center 800x600 是个小房间，walled 围绕，玩家走中下区域。
//       prop 中的"冷冻仓"只用于渲染，不要做碰撞体（已标记 collidable，默认不参与碰撞）
//       prop 的碰撞由 collidable 字段控制（数据驱动），不再在 game.collides 中硬编码 name

// 各场景敌人掉落表（数据驱动）：key = 场景id，value = 该场景敌人击败后掉落的汉字碎片池
// 碎片与门禁需求对应：街道→关雎(洲/逑)，居民区→滕王阁序+正气歌(鹜/天/气/形)，体育馆→春晓(眠/处/风/少)
export const DROP_TABLES = {
  street_01: ['洲', '洲', '逑', '逑'], // 关雎：洲/逑
  subway: ['洲', '逑', '鹜', '天'], // 过渡：混杂街道和居民区碎片
  alley_district: ['鹜', '鹜', '天', '天', '气', '形'], // 滕王阁序+正气歌
  stadium: ['眠', '处', '风', '少'], // 春晓（体育馆深处）
  ruined_library: ['河', '河', '海', '海'], // 将进酒：河/海
  network_nexus: ['山', '山', '春', '春'], // 春望：山/春
  memory_abyss: ['月', '月', '秋', '秋'], // 月夜忆舍弟：月/秋
  lost_village: ['洲', '逑', '鹜', '天'], // 失语者村落：混合掉落
  // 未配置的场景默认使用 street_01 的掉落表
};
export const DEFAULT_DROPS = ['洲', '逑'];

export const scenes = {
  // ==========================================
  // 冷冻中心（起始点）
  // 布局：
  //   y: 20-180    上排 5 个冷冻仓（纯装饰）
  //   y: 220-320   中排 4 个冷冻仓（2 个损坏）
  //   y: 380-510   主角冷冻仓(已删) + 终端机 + 更衣室
  //   y: 574       南墙（有门洞 270-480）
  // ==========================================
  freeze_center: {
    id: 'freeze_center',
    name: '冷冻中心',
    width: 800,
    height: 600,
    bgColor: '#171a22',
    atmosphere: {
      tint: 'rgba(150,190,220,0.05)',
      motes: { n: 34, color: '180,205,225', speed: 0.25, size: 1.5 },
      fog: 0.35,
    },

    walls: [
      // 外墙
      { x: 20, y: 20, w: 760, h: 6 },
      { x: 20, y: 574, w: 250, h: 6 },
      { x: 480, y: 574, w: 300, h: 6 },
      { x: 20, y: 20, w: 6, h: 560 },
      { x: 774, y: 20, w: 6, h: 560 },
      // 更衣室隔断墙：左侧留出门洞，玩家可进入储物柜区域
      { x: 580, y: 380, w: 200, h: 6 },
      { x: 580, y: 380, w: 6, h: 44 },
      { x: 580, y: 486, w: 6, h: 24 },
      { x: 774, y: 380, w: 6, h: 130 },
      { x: 580, y: 510, w: 200, h: 6 },
    ],

    props: [
      // 上排 5 个冷冻仓
      { x: 80, y: 100, w: 130, h: 80, name: '冷冻仓 A' },
      { x: 225, y: 100, w: 130, h: 80, name: '冷冻仓 B' },
      { x: 370, y: 100, w: 130, h: 80, name: '冷冻仓 C' },
      { x: 515, y: 100, w: 130, h: 80, name: '冷冻仓 D' },
      { x: 660, y: 100, w: 100, h: 80, name: '冷冻仓 E' },
      // 中排 4 个冷冻仓（其中 2 个损坏）
      { x: 100, y: 220, w: 140, h: 100, name: '冷冻仓 F', damaged: true },
      { x: 255, y: 220, w: 140, h: 100, name: '冷冻仓 G', damaged: true },
      { x: 410, y: 220, w: 140, h: 100, name: '冷冻仓 H' },
      { x: 565, y: 220, w: 140, h: 100, name: '冷冻仓 I' },
      // 主角的冷冻仓（不参与碰撞，但用于渲染）
      { x: 280, y: 380, w: 160, h: 130, name: '我的冷冻仓', isPlayerPod: true },
      // 终端机（不参与碰撞）
      { x: 480, y: 380, w: 80, h: 40, name: '终端机' },
    ],

    interactables: [
      { id: 'player_pod', x: 360, y: 450, label: '我的冷冻仓', type: 'pod' },
      { id: 'terminal', x: 520, y: 435, label: '终端机', type: 'terminal' },
      { id: 'locker', x: 642, y: 448, label: '储物柜', type: 'locker' },
      {
        id: 'broken_pods',
        x: 180,
        y: 270,
        label: '破碎的冷冻仓',
        type: 'dialog',
        dialogKey: 'broken_pods',
      },
      { id: 'fallen_sign', x: 60, y: 100, label: '标牌', type: 'dialog', dialogKey: 'fallen_sign' },
      { id: 'exit_door', x: 375, y: 560, label: '推开大门', type: 'exit' },
    ],

    items: [],

    spawn: { x: 360, y: 540 },
  },

  // ==========================================
  // 梦境教学场（线性走廊，传说之下式）
  // R0 序幕厅 → R1 捡字廊 → R2 常规战 → R3 言锋室 → 裂隙醒来
  // 门墙由 onboarding 动态开关（dream_door_* id）
  // ==========================================
  dream_tutorial: {
    id: 'dream_tutorial',
    name: '梦境·失语前夜',
    width: 2000,
    height: 520,
    bgColor: '#0c0a14',
    isDream: true,
    atmosphere: {
      tint: 'rgba(120,90,180,0.1)',
      motes: { n: 40, color: '180,150,255', speed: 0.28, size: 1.5 },
      fog: 0.4,
    },

    // 外框 + 三道纵向隔断（中间留门洞 210–310，门洞由动态墙封住）
    walls: [
      { x: 0, y: 0, w: 2000, h: 10 },
      { x: 0, y: 510, w: 2000, h: 10 },
      { x: 0, y: 0, w: 10, h: 520 },
      { x: 1990, y: 0, w: 10, h: 520 },
      // 隔断 A (x=480)：R0|R1
      { x: 480, y: 10, w: 12, h: 200, id: 'dream_wall_a_top' },
      { x: 480, y: 310, w: 12, h: 200, id: 'dream_wall_a_bot' },
      // 隔断 B (x=980)：R1|R2
      { x: 980, y: 10, w: 12, h: 200, id: 'dream_wall_b_top' },
      { x: 980, y: 310, w: 12, h: 200, id: 'dream_wall_b_bot' },
      // 隔断 C (x=1480)：R2|R3
      { x: 1480, y: 10, w: 12, h: 200, id: 'dream_wall_c_top' },
      { x: 1480, y: 310, w: 12, h: 200, id: 'dream_wall_c_bot' },
    ],

    props: [
      { x: 40, y: 40, w: 70, h: 120, name: '幻影高楼' },
      { x: 160, y: 50, w: 50, h: 90, name: '幻影高楼' },
      { x: 600, y: 40, w: 80, h: 100, name: '幻影高楼' },
      { x: 1100, y: 50, w: 60, h: 110, name: '幻影高楼' },
      { x: 1600, y: 40, w: 90, h: 130, name: '幻影高楼' },
      { x: 1800, y: 60, w: 70, h: 100, name: '幻影高楼' },
    ],

    // 敌人由 onboarding 按步骤动态放入；初始为空
    enemies: [],

    interactables: [
      {
        id: 'dream_phone',
        x: 280,
        y: 260,
        label: '发光的手机幻象',
        type: 'dream_phone',
      },
      {
        id: 'dream_door_a',
        x: 486,
        y: 255,
        label: '前路',
        type: 'dream_door',
        door: 'a',
      },
      {
        id: 'dream_door_b',
        x: 986,
        y: 255,
        label: '被污染的路口',
        type: 'dream_door',
        door: 'b',
        gateChars: ['言', '语'],
      },
      {
        id: 'dream_door_c',
        x: 1486,
        y: 255,
        label: '噪声更深的门',
        type: 'dream_door',
        door: 'c',
      },
      {
        id: 'dream_wake',
        x: 1850,
        y: 260,
        label: '醒来的金色裂隙',
        type: 'dream_wake',
      },
    ],

    // 碎片初始不放，phone 完成后再刷到 R1
    items: [],

    spawn: { x: 120, y: 260 },
  },

  // ==========================================
  // 废弃街道（第一章主场景）
  // ==========================================
  street_01: {
    id: 'street_01',
    name: '废弃街道',
    width: 2400,
    height: 1800,
    bgColor: '#2a2518',
    atmosphere: {
      tint: 'rgba(255,210,130,0.06)',
      motes: { n: 46, color: '210,190,140', speed: 0.4, size: 1.7 },
      fog: 0.5,
    },

    walls: [
      // 四周边界
      { x: 0, y: 0, w: 2400, h: 6 },
      { x: 0, y: 1794, w: 1100, h: 6 },
      { x: 1300, y: 1794, w: 1100, h: 6 },
      { x: 0, y: 0, w: 6, h: 1800 },
      { x: 2394, y: 0, w: 6, h: 1800 },
      // 返回冷冻中心的门口（北侧缺口）
      { x: 350, y: 0, w: 6, h: 200 },
      { x: 540, y: 0, w: 6, h: 200 },
    ],

    props: [
      { x: 100, y: 100, w: 100, h: 250, name: '高楼' },
      { x: 230, y: 80, w: 130, h: 320, name: '高楼' },
      { x: 400, y: 120, w: 90, h: 200, name: '高楼' },
      { x: 1100, y: 90, w: 120, h: 350, name: '高楼' },
      { x: 1280, y: 70, w: 100, h: 380, name: '高楼' },
      { x: 1400, y: 110, w: 150, h: 280, name: '高楼' },
      { x: 1600, y: 100, w: 110, h: 300, name: '高楼' },
      { x: 1900, y: 130, w: 130, h: 260, name: '高楼' },
      { x: 700, y: 500, w: 220, h: 60, name: '地铁站入口' },
      { x: 600, y: 700, w: 55, h: 30, name: '废弃车辆', collidable: true },
      { x: 900, y: 850, w: 60, h: 32, name: '废弃车辆', collidable: true },
      { x: 1400, y: 750, w: 50, h: 28, name: '废弃车辆', collidable: true },
      { x: 1800, y: 900, w: 55, h: 30, name: '废弃车辆', collidable: true },
      { x: 300, y: 1000, w: 70, h: 50, name: '碎石堆', collidable: true },
      { x: 1700, y: 1100, w: 80, h: 55, name: '碎石堆', collidable: true },
      { x: 1100, y: 1300, w: 60, h: 45, name: '碎石堆', collidable: true },
      { x: 2000, y: 700, w: 75, h: 52, name: '碎石堆', collidable: true },
      { x: 520, y: 1450, w: 65, h: 48, name: '碎石堆', collidable: true },
      { x: 1750, y: 1450, w: 55, h: 30, name: '废弃车辆', collidable: true },
      { x: 1550, y: 1000, w: 60, h: 32, name: '废弃车辆', collidable: true },
      { x: 2100, y: 130, w: 120, h: 300, name: '高楼' },
      { x: 560, y: 110, w: 110, h: 260, name: '高楼' },
    ],

    // 敌人：可攻击的梗鬼（带 HP）
    enemies: [
      { id: 'geng_1', typeId: 'geng_weak', x: 1200, y: 900, hp: 30, maxHp: 30 },
      { id: 'geng_2', typeId: 'geng_weak', x: 700, y: 1200, hp: 30, maxHp: 30 },
      { id: 'geng_3', typeId: 'geng_weak', x: 1900, y: 800, hp: 30, maxHp: 30 },
      { id: 'geng_4', typeId: 'geng_weak', x: 1500, y: 1500, hp: 30, maxHp: 30 },
      { id: 'geng_5', typeId: 'geng_medium', x: 2200, y: 1400, hp: 60, maxHp: 60, name: '烂梗鬼' },
    ],

    interactables: [
      {
        id: 'back_door',
        x: 440,
        y: 40,
        label: '回到冷冻中心',
        type: 'scene_change',
        target: 'freeze_center',
        spawn: { x: 200, y: 500 },
      },
      {
        id: 'lost_people',
        x: 800,
        y: 700,
        label: '失语者群',
        type: 'dialog',
        dialogKey: 'lost_people',
      },
      {
        id: 'street_screens',
        x: 1500,
        y: 620,
        label: '熄灭的屏幕墙',
        type: 'dialog',
        dialogKey: 'street_screens',
      },
      {
        id: 'street_poster',
        x: 320,
        y: 640,
        label: '残破告示',
        type: 'dialog',
        dialogKey: 'street_poster',
      },
      {
        id: 'street_carwreck',
        x: 900,
        y: 820,
        label: '锈死的轿车',
        type: 'dialog',
        dialogKey: 'street_carwreck',
      },
      {
        id: 'cure_street',
        x: 1950,
        y: 1350,
        label: '抱书的失语者',
        type: 'cure',
        puzzle: 'cure_jingye',
        introKey: 'cure_intro_a',
        doneKey: 'cured_street_done',
      },
      {
        id: 'subway_entrance',
        x: 810,
        y: 540,
        label: '下到地铁站',
        type: 'scene_change',
        target: 'subway',
        spawn: { x: 100, y: 100 },
      },
      { id: 'keystone_guanju', x: 200, y: 1000, label: '要石', type: 'keystone', text: '关雎' },
      {
        id: 'to_riverside',
        x: 1200,
        y: 1750,
        label: '前往江堤',
        type: 'scene_change',
        target: 'riverside',
        spawn: { x: 200, y: 1000 },
        gate: {
          chars: ['洲', '逑'],
          puzzle: 'guanju',
          msg: '一团浓得化不开的绿雾堵住了南面的路口。耳边全是「YYDS」的嗡鸣——\n先在街道上找齐《关雎》的碎片「洲」「逑」，让诗句驱散它。',
        },
      },
    ],

    items: [
      { id: 'char_zhou_1', x: 500, y: 800, type: 'char_fragment', char: '洲' },
      { id: 'char_zhou_2', x: 1600, y: 600, type: 'char_fragment', char: '洲' },
      { id: 'char_qiu_1', x: 1300, y: 800, type: 'char_fragment', char: '逑' },
      { id: 'char_qiu_2', x: 900, y: 1200, type: 'char_fragment', char: '逑' },
      { id: 'page_street_1', x: 350, y: 700, type: 'page', name: '旧书页' },
      { id: 'page_street_2', x: 2100, y: 1000, type: 'page', name: '旧书页' },
      { id: 'hidden_page_street', x: 140, y: 1650, type: 'page', name: '藏在碎石后的旧书页' },
    ],

    spawn: { x: 440, y: 100 },
  },

  // ==========================================
  // 黄浦江江堤
  // ==========================================
  riverside: {
    id: 'riverside',
    name: '黄浦江江堤',
    width: 2000,
    height: 1400,
    bgColor: '#262019',
    atmosphere: {
      tint: 'rgba(255,180,110,0.08)',
      motes: { n: 40, color: '255,210,150', speed: 0.3, size: 1.8 },
      fog: 0.6,
    },
    mode: 'sidescroll', // 2D 横版关卡（魂斗罗式）

    walls: [
      { x: 0, y: 0, w: 2000, h: 6 },
      { x: 0, y: 1394, w: 2000, h: 6 },
      { x: 0, y: 0, w: 6, h: 1400 },
      { x: 1994, y: 0, w: 6, h: 1400 },
      // 黄浦江水域（北侧，不可进入）
      { x: 6, y: 6, w: 1988, h: 794 },
    ],

    props: [
      { x: 400, y: 80, w: 120, h: 220, name: '对岸高楼', collidable: true },
      { x: 550, y: 110, w: 90, h: 180, name: '对岸高楼', collidable: true },
      { x: 1300, y: 90, w: 100, h: 250, name: '对岸高楼', collidable: true },
      { x: 1450, y: 70, w: 130, h: 300, name: '对岸高楼', collidable: true },
      { x: 1620, y: 120, w: 110, h: 200, name: '对岸高楼', collidable: true },
    ],

    interactables: [
      { id: 'shuyuan', x: 400, y: 900, label: '老人', type: 'dialog', dialogKey: 'meet_shuyuan' },
      { id: 'keystone_riverside', x: 700, y: 880, label: '要石', type: 'keystone', text: '记得' },
      {
        id: 'back_street',
        x: 900,
        y: 1080,
        label: '返回废弃街道',
        type: 'scene_change',
        target: 'street_01',
        spawn: { x: 980, y: 1600 },
      },
      {
        id: 'to_alley',
        x: 1820,
        y: 980,
        label: '前往废墟居民区',
        type: 'scene_change',
        target: 'alley_district',
        spawn: { x: 200, y: 200 },
        gate: {
          flag: 'met_shuyuan',
          msg: '你还不认得去居民区的路。先去江堤西边，找那位会说完整句子的老人谈谈。',
        },
      },
    ],

    items: [{ id: 'page_river_1', x: 1100, y: 950, type: 'page', name: '旧书页' }],

    spawn: { x: 200, y: 1000 },
  },

  // ==========================================
  // 旧地铁站（地下）
  // ==========================================
  subway: {
    id: 'subway',
    name: '旧地铁站',
    width: 1400,
    height: 1000,
    bgColor: '#12131c',
    atmosphere: {
      tint: 'rgba(120,150,200,0.07)',
      motes: { n: 30, color: '150,175,215', speed: 0.2, size: 1.4 },
      fog: 0.7,
    },

    walls: [
      // 外墙
      { x: 0, y: 0, w: 1400, h: 6 },
      { x: 0, y: 994, w: 1400, h: 6 },
      { x: 0, y: 0, w: 6, h: 1000 },
      { x: 1394, y: 0, w: 6, h: 1000 },
      // 立柱
      { x: 300, y: 300, w: 30, h: 30, name: '立柱' },
      { x: 700, y: 300, w: 30, h: 30, name: '立柱' },
      { x: 1100, y: 300, w: 30, h: 30, name: '立柱' },
      { x: 300, y: 450, w: 30, h: 30, name: '立柱' },
      { x: 1100, y: 450, w: 30, h: 30, name: '立柱' },
      // 废弃列车车厢
      { x: 450, y: 700, w: 200, h: 80, name: '列车车厢', collidable: true },
      { x: 850, y: 750, w: 180, h: 70, name: '列车车厢', collidable: true },
    ],

    props: [
      { x: 450, y: 700, w: 200, h: 80, name: '列车车厢', collidable: true },
      { x: 850, y: 750, w: 180, h: 70, name: '列车车厢', collidable: true },
      // 月台边缘仅作视觉层，不再阻挡玩家，避免和小地图探索范围不一致
      { x: 0, y: 580, w: 400, h: 20, name: '月台' },
      { x: 600, y: 580, w: 400, h: 20, name: '月台' },
      { x: 1000, y: 580, w: 200, h: 20, name: '月台' },
      { x: 1250, y: 580, w: 150, h: 20, name: '月台' },
    ],

    enemies: [
      { id: 'sub_geng_1', typeId: 'geng_weak', x: 800, y: 300, hp: 30, maxHp: 30 },
      { id: 'sub_geng_2', typeId: 'geng_weak', x: 1100, y: 450, hp: 30, maxHp: 30 },
      {
        id: 'sub_geng_3',
        typeId: 'geng_medium',
        x: 1000,
        y: 850,
        hp: 60,
        maxHp: 60,
        name: '烂梗鬼',
      },
    ],

    interactables: [
      // 返回地面
      {
        id: 'subway_exit',
        x: 100,
        y: 100,
        label: '回到地面',
        type: 'scene_change',
        target: 'street_01',
        spawn: { x: 900, y: 680 },
      },
      // 月台上的旧告示牌
      {
        id: 'subway_sign',
        x: 200,
        y: 300,
        label: '告示牌',
        type: 'dialog',
        dialogKey: 'subway_sign',
      },
      {
        id: 'subway_map',
        x: 500,
        y: 400,
        label: '地铁线路图',
        type: 'dialog',
        dialogKey: 'subway_map',
      },
      {
        id: 'subway_poem_cache',
        x: 920,
        y: 520,
        label: '站长诗集',
        type: 'dialog',
        dialogKey: 'subway_poem_cache',
      },
      {
        id: 'subway_ticket_machine',
        x: 760,
        y: 220,
        label: '坏掉的售票机',
        type: 'dialog',
        dialogKey: 'subway_ticket_machine',
      },
      {
        id: 'subway_train_window',
        x: 560,
        y: 720,
        label: '列车窗',
        type: 'dialog',
        dialogKey: 'subway_train_window',
      },
      // 维度裂隙：通往3D深渊关卡的传送点（原"黑暗深处"位置）
      { id: 'portal_3d', x: 1300, y: 800, label: '维度裂隙', type: 'portal3d' },
      {
        id: 'subway_depth_door',
        x: 1180,
        y: 920,
        label: '检修通道门',
        type: 'scene_change',
        target: 'subway_depth',
        spawn: { x: 120, y: 760 },
        _cond: 'portal3d_done',
      },
    ],

    items: [
      { id: 'sub_page_1', x: 500, y: 200, type: 'page', name: '旧书页' },
      { id: 'sub_char_1', x: 900, y: 850, type: 'char_fragment', char: '洲' },
      { id: 'seed_subway', x: 1250, y: 750, type: 'language_seed', name: '语言种子·隧道深处' },
      { id: 'broken_train_lore', x: 540, y: 730, type: 'page', name: '列车遗言' },
    ],

    spawn: { x: 100, y: 100 },
  },

  // ==========================================
  // 检修通道深处（3D 裂隙之后的 2D 后续区域）
  // ==========================================
  subway_depth: {
    id: 'subway_depth',
    name: '检修通道深处',
    width: 1200,
    height: 900,
    bgColor: '#171822',
    atmosphere: {
      tint: 'rgba(120,145,200,0.1)',
      motes: { n: 24, color: '145,170,220', speed: 0.18, size: 1.3 },
      fog: 0.62,
    },

    walls: [
      { x: 0, y: 0, w: 1200, h: 8 },
      { x: 0, y: 892, w: 1200, h: 8 },
      { x: 0, y: 0, w: 8, h: 900 },
      { x: 1192, y: 0, w: 8, h: 900 },
      { x: 260, y: 170, w: 14, h: 300, name: '维修架' },
      { x: 560, y: 470, w: 220, h: 14, name: '倒塌的管道' },
      { x: 900, y: 110, w: 14, h: 340, name: '电缆井' },
    ],

    props: [
      { x: 340, y: 160, w: 90, h: 52, name: '工具箱', collidable: true },
      { x: 520, y: 690, w: 140, h: 34, name: '翻倒的推车', collidable: true },
      { x: 800, y: 300, w: 78, h: 78, name: '备用发电机', collidable: true },
    ],

    enemies: [
      { id: 'subdepth_geng_1', typeId: 'geng_medium', x: 710, y: 280, hp: 60, maxHp: 60, name: '裂隙梗鬼' },
      { id: 'subdepth_geng_2', typeId: 'geng_weak', x: 1030, y: 640, hp: 30, maxHp: 30, name: '回音梗鬼' },
    ],

    interactables: [
      {
        id: 'subway_depth_return',
        x: 120,
        y: 760,
        label: '返回地铁站',
        type: 'scene_change',
        target: 'subway',
        spawn: { x: 1180, y: 900 },
      },
      {
        id: 'subway_depth_terminal',
        x: 500,
        y: 330,
        label: '站长日志终端',
        type: 'dialog',
        dialogKey: 'subway_depth_terminal',
      },
    ],

    items: [
      { id: 'seed_subway_depth', x: 960, y: 600, type: 'language_seed', name: '语言种子·裂隙深处' },
    ],

    spawn: { x: 120, y: 760 },
  },

  // ==========================================
  // 废墟居民区（第二章主场景）
  // ==========================================
  alley_district: {
    id: 'alley_district',
    name: '废墟居民区',
    width: 2400,
    height: 1800,
    bgColor: '#261d15',
    atmosphere: {
      tint: 'rgba(255,190,120,0.06)',
      motes: { n: 44, color: '215,185,135', speed: 0.35, size: 1.7 },
      fog: 0.5,
    },

    walls: [
      { x: 0, y: 0, w: 2400, h: 6 },
      { x: 0, y: 1794, w: 1100, h: 6 },
      { x: 1300, y: 1794, w: 1100, h: 6 },
      { x: 0, y: 0, w: 6, h: 1800 },
      { x: 2394, y: 0, w: 6, h: 1800 },
      // 返回江堤的缺口
      { x: 350, y: 0, w: 6, h: 200 },
      { x: 540, y: 0, w: 6, h: 200 },
      // 可进入的民居 A
      { x: 600, y: 500, w: 200, h: 6 },
      { x: 600, y: 500, w: 6, h: 150 },
      { x: 794, y: 500, w: 6, h: 150 },
      { x: 600, y: 644, w: 90, h: 6 },
      { x: 710, y: 644, w: 90, h: 6 },
      // 可进入的民居 B
      { x: 1000, y: 500, w: 200, h: 6 },
      { x: 1000, y: 500, w: 6, h: 150 },
      { x: 1194, y: 500, w: 6, h: 150 },
      { x: 1000, y: 644, w: 90, h: 6 },
      { x: 1110, y: 644, w: 90, h: 6 },
      // 窄巷两侧墙壁
      { x: 1500, y: 800, w: 6, h: 400 },
      { x: 1700, y: 800, w: 6, h: 400 },
    ],

    props: [
      // 背景高楼
      { x: 100, y: 100, w: 120, h: 280, name: '高楼' },
      { x: 250, y: 80, w: 100, h: 320, name: '高楼' },
      { x: 2000, y: 90, w: 130, h: 350, name: '高楼' },
      { x: 2150, y: 110, w: 110, h: 300, name: '高楼' },
      // 民居建筑
      { x: 600, y: 440, w: 200, h: 60, name: '民居A', collidable: true },
      { x: 1000, y: 440, w: 200, h: 60, name: '民居B', collidable: true },
      { x: 1400, y: 700, w: 200, h: 60, name: '民居C', collidable: true },
      { x: 1800, y: 700, w: 200, h: 60, name: '民居D', collidable: true },
      // 碎石堆
      { x: 300, y: 1000, w: 80, h: 50, name: '碎石堆', collidable: true },
      { x: 2000, y: 1200, w: 70, h: 45, name: '碎石堆', collidable: true },
      { x: 700, y: 800, w: 75, h: 48, name: '碎石堆', collidable: true },
      { x: 1950, y: 1150, w: 65, h: 44, name: '碎石堆', collidable: true },
      // 废弃花坛
      { x: 1200, y: 1200, w: 100, h: 60, name: '废弃花坛', collidable: true },
      { x: 450, y: 1550, w: 90, h: 55, name: '废弃花坛', collidable: true },
    ],

    enemies: [
      {
        id: 'alley_geng_1',
        typeId: 'geng_medium',
        x: 1600,
        y: 1000,
        hp: 60,
        maxHp: 60,
        name: '烂梗鬼',
      },
      {
        id: 'alley_geng_2',
        typeId: 'geng_medium',
        x: 800,
        y: 1300,
        hp: 60,
        maxHp: 60,
        name: '烂梗鬼',
      },
      {
        id: 'alley_geng_3',
        typeId: 'geng_medium',
        x: 1900,
        y: 1400,
        hp: 60,
        maxHp: 60,
        name: '烂梗鬼',
      },
      {
        id: 'alley_geng_4',
        typeId: 'geng_weak',
        x: 600,
        y: 600,
        hp: 30,
        maxHp: 30,
        name: '游荡梗鬼',
      },
      {
        id: 'alley_geng_5',
        typeId: 'geng_weak',
        x: 1700,
        y: 700,
        hp: 30,
        maxHp: 30,
        name: '游荡梗鬼',
      },
    ],

    interactables: [
      {
        id: 'back_riverside',
        x: 440,
        y: 40,
        label: '返回江堤',
        type: 'scene_change',
        target: 'riverside',
        spawn: { x: 1550, y: 1020 },
      },
      // 守砚带路对话
      {
        id: 'shuyuan_alley',
        x: 300,
        y: 300,
        label: '守砚',
        type: 'dialog',
        dialogKey: 'shuyuan_alley',
      },
      {
        id: 'cure_alley',
        x: 320,
        y: 850,
        label: '卷帘门前的失语者',
        type: 'cure',
        puzzle: 'cure_dengguan',
        introKey: 'cure_intro_b',
        doneKey: 'cured_alley_done',
      },
      // 民居A 可进入
      {
        id: 'house_a_door',
        x: 700,
        y: 660,
        label: '进入民居A',
        type: 'scene_change',
        target: 'house_a',
        spawn: { x: 200, y: 300 },
      },
      // 民居B 可进入（被梗鬼占据）
      {
        id: 'house_b_door',
        x: 1100,
        y: 660,
        label: '进入民居B',
        type: 'scene_change',
        target: 'house_b',
        spawn: { x: 200, y: 300 },
      },
      // 茧房受害者
      {
        id: 'cocoon_victim',
        x: 1200,
        y: 1300,
        label: '蹲着的人',
        type: 'dialog',
        dialogKey: 'cocoon_victim',
      },
      // 墙上的乱涂、守书的小龛
      {
        id: 'alley_graffiti',
        x: 600,
        y: 1500,
        label: '残墙乱涂',
        type: 'dialog',
        dialogKey: 'alley_graffiti',
      },
      {
        id: 'alley_shrine',
        x: 2000,
        y: 1500,
        label: '守书的小龛',
        type: 'dialog',
        dialogKey: 'alley_shrine',
      },
      // 要石
      { id: 'keystone_alley', x: 200, y: 1600, label: '要石', type: 'keystone', text: '正气' },
      // 前往体育馆
      {
        id: 'to_stadium',
        x: 1200,
        y: 1750,
        label: '前往体育馆',
        type: 'scene_change',
        target: 'stadium',
        spawn: { x: 200, y: 1800 },
        gate: {
          chars: ['鹜', '天', '气', '形'],
          puzzle: 'tengwang',
          msg: '体育馆的方向涌出刺眼的算法蓝光，像一堵活的墙。\n先在居民区集齐「鹜」「天」「气」「形」四个字——《滕王阁序》与《正气歌》的浩然之力，才能压住它。',
        },
      },
    ],

    items: [
      { id: 'char_wu', x: 500, y: 600, type: 'char_fragment', char: '鹜' },
      { id: 'char_tian', x: 1500, y: 500, type: 'char_fragment', char: '天' },
      { id: 'char_qi', x: 900, y: 1100, type: 'char_fragment', char: '气' },
      { id: 'char_xing', x: 1700, y: 600, type: 'char_fragment', char: '形' },
      { id: 'page_alley_1', x: 350, y: 700, type: 'page', name: '旧书页' },
      { id: 'page_alley_2', x: 2100, y: 1000, type: 'page', name: '旧书页' },
      { id: 'seed_alley', x: 1800, y: 1300, type: 'language_seed', name: '语言种子·巷尾残碑' },
    ],

    spawn: { x: 440, y: 300 },
  },

  // ==========================================
  // 民居 A（室内）
  // ==========================================
  house_a: {
    id: 'house_a',
    name: '废弃民居A',
    width: 500,
    height: 400,
    bgColor: '#241c14',
    atmosphere: {
      tint: 'rgba(255,200,130,0.07)',
      motes: { n: 18, color: '220,190,140', speed: 0.2, size: 1.5 },
      fog: 0.3,
    },

    walls: [
      { x: 20, y: 20, w: 460, h: 6 },
      { x: 20, y: 374, w: 200, h: 6 },
      { x: 280, y: 374, w: 200, h: 6 },
      { x: 20, y: 20, w: 6, h: 360 },
      { x: 474, y: 20, w: 6, h: 360 },
    ],

    props: [
      { x: 80, y: 80, w: 100, h: 50, name: '桌子', collidable: true },
      { x: 300, y: 80, w: 80, h: 100, name: '书架', collidable: true },
    ],

    interactables: [
      {
        id: 'house_a_exit',
        x: 240,
        y: 360,
        label: '离开',
        type: 'scene_change',
        target: 'alley_district',
        spawn: { x: 700, y: 780 },
      },
      {
        id: 'house_a_book',
        x: 340,
        y: 130,
        label: '书架',
        type: 'dialog',
        dialogKey: 'house_a_book',
      },
      {
        id: 'house_a_photo',
        x: 120,
        y: 110,
        label: '褪色相框',
        type: 'dialog',
        dialogKey: 'house_a_photo',
      },
      {
        id: 'house_a_desk',
        x: 160,
        y: 160,
        label: '抽屉',
        type: 'dialog',
        dialogKey: 'house_a_desk',
      },
    ],

    items: [
      { id: 'house_a_page', x: 130, y: 150, type: 'page', name: '旧书页' },
      { id: 'house_a_hidden_page', x: 410, y: 260, type: 'page', name: '夹在墙缝里的纸页' },
    ],

    spawn: { x: 240, y: 300 },
  },

  // ==========================================
  // 民居 B（室内，有敌人）
  // ==========================================
  house_b: {
    id: 'house_b',
    name: '废弃民居B',
    width: 500,
    height: 400,
    bgColor: '#241c14',
    atmosphere: {
      tint: 'rgba(255,200,130,0.07)',
      motes: { n: 18, color: '220,190,140', speed: 0.2, size: 1.5 },
      fog: 0.3,
    },

    walls: [
      { x: 20, y: 20, w: 460, h: 6 },
      { x: 20, y: 374, w: 200, h: 6 },
      { x: 280, y: 374, w: 200, h: 6 },
      { x: 20, y: 20, w: 6, h: 360 },
      { x: 474, y: 20, w: 6, h: 360 },
    ],

    props: [
      { x: 80, y: 80, w: 100, h: 50, name: '桌子', collidable: true },
      { x: 120, y: 92, w: 30, h: 20, name: '收音机' },
    ],

    enemies: [
      { id: 'house_b_geng', typeId: 'geng_weak', x: 300, y: 200, hp: 30, maxHp: 30, name: '梗鬼' },
    ],

    interactables: [
      {
        id: 'house_b_exit',
        x: 240,
        y: 360,
        label: '离开',
        type: 'scene_change',
        target: 'alley_district',
        spawn: { x: 1100, y: 780 },
      },
      {
        id: 'house_b_radio',
        x: 135,
        y: 115,
        label: '旧收音机',
        type: 'dialog',
        dialogKey: 'house_b_radio',
      },
      {
        id: 'house_b_wall_notes',
        x: 360,
        y: 110,
        label: '墙上便签',
        type: 'dialog',
        dialogKey: 'house_b_wall_notes',
      },
      {
        id: 'house_b_tape',
        x: 220,
        y: 260,
        label: '磁带盒',
        type: 'dialog',
        dialogKey: 'house_b_tape',
      },
    ],

    items: [
      { id: 'house_b_page', x: 130, y: 150, type: 'page', name: '旧书页' },
      { id: 'house_b_seed_note', x: 390, y: 260, type: 'page', name: '写着完整句子的便条' },
    ],

    spawn: { x: 240, y: 300 },
  },

  // ==========================================
  // 体育馆茧房（第三章）
  // 布局：底部入口区（出生点/守砚/返回点）→ 中部潜行迷宫（要石/精英/诗屏）→ 上部 BOSS 区（茧房核心/数据中心入口）
  // 三阶段目标：①潜行穿越屏幕迷宫 ②点亮诗屏削弱茧房 ③挑战复读巨像
  // ==========================================
  stadium: {
    id: 'stadium',
    name: '体育馆·茧房',
    width: 2000,
    height: 2000,
    bgColor: '#10101e',
    atmosphere: {
      tint: 'rgba(110,150,230,0.08)',
      motes: { n: 50, color: '150,185,255', speed: 0.5, size: 1.6 },
      fog: 0.4,
    },

    walls: [
      { x: 0, y: 0, w: 2000, h: 6 },
      { x: 0, y: 1994, w: 2000, h: 6 },
      { x: 0, y: 0, w: 6, h: 2000 },
      { x: 1994, y: 0, w: 6, h: 2000 },
    ],

    props: [
      // 潜行迷宫屏幕墙（可遮挡精英怪视野，参与碰撞）
      { x: 250, y: 780, w: 380, h: 10, name: '屏幕墙', collidable: true },
      { x: 750, y: 780, w: 10, h: 260, name: '屏幕墙', collidable: true },
      { x: 1100, y: 780, w: 520, h: 10, name: '屏幕墙', collidable: true },
      { x: 1100, y: 790, w: 10, h: 260, name: '屏幕墙', collidable: true },
      { x: 1640, y: 790, w: 10, h: 260, name: '屏幕墙', collidable: true },
      { x: 300, y: 1180, w: 520, h: 10, name: '屏幕墙', collidable: true },
      { x: 820, y: 1000, w: 10, h: 300, name: '屏幕墙', collidable: true },
      { x: 1180, y: 1180, w: 520, h: 10, name: '屏幕墙', collidable: true },
      { x: 1180, y: 1190, w: 10, h: 220, name: '屏幕墙', collidable: true },
      { x: 400, y: 1420, w: 460, h: 10, name: '屏幕墙', collidable: true },
      { x: 1140, y: 1420, w: 520, h: 10, name: '屏幕墙', collidable: true },
    ],

    enemies: [
      {
        id: 'stadium_geng_1',
        typeId: 'geng_boss',
        x: 1000,
        y: 400,
        hp: 140,
        maxHp: 140,
        name: '算法核心·复读巨像',
        boss: true,
        combat: 'hack',
        acts: [
          '言锋切入逻辑空间。弹幕在四周游动，像活着的推荐词。',
          '你驾驶诗句凝成的飞行器，一寸寸撕开协议层。',
          '复读巨像开始增殖节点——它在复制「你可能还想看」的回声。',
          '机首灯亮着。你还记得守砚的话：不要相信任何推荐。',
        ],
      },
      // 梗鬼精英：带视野巡逻，可利用屏幕墙遮挡潜行绕过
      {
        id: 'stadium_geng_2',
        typeId: 'geng_elite',
        x: 1350,
        y: 1100,
        hp: 100,
        maxHp: 100,
        name: '梗鬼精英',
        visionRange: 260,
        visionHalfAngle: Math.PI / 3,
        visionDir: 0,
      },
    ],

    interactables: [
      // —— 底部入口区（紧邻出生点）——
      {
        id: 'back_alley',
        x: 700,
        y: 1880,
        label: '返回居民区',
        type: 'scene_change',
        target: 'alley_district',
        spawn: { x: 980, y: 1620 },
      },
      {
        id: 'shuyuan_farewell',
        x: 880,
        y: 1830,
        label: '守砚',
        type: 'dialog',
        dialogKey: 'shuyuan_farewell',
      },
      // —— 中部潜行迷宫区 ——
      { id: 'keystone_stadium', x: 1000, y: 1100, label: '要石', type: 'keystone', text: '浩然' },
      {
        id: 'light_screen',
        x: 560,
        y: 1080,
        label: '熄灭的诗屏',
        type: 'puzzle',
        puzzleId: 'zhengqi',
        solvedHint: '诗屏已亮起金光，浩然之气萦绕不散。',
      },
      // —— 上部 BOSS 茧房区 ——
      {
        id: 'cocoon_screen',
        x: 1500,
        y: 350,
        label: '流动的屏幕内壁',
        type: 'dialog',
        dialogKey: 'cocoon_screen',
      },
      {
        id: 'to_ruined_library',
        x: 1100,
        y: 200,
        label: '通往废墟深处',
        type: 'scene_change',
        target: 'ruined_library',
        spawn: { x: 100, y: 300 },
        gate: {
          chars: ['眠', '处', '风', '少'],
          flag: 'stadium_puzzle_solved',
          puzzle: 'voidverse',
          defeatedEnemy: 'stadium_geng_1',
          msg: '通往废墟深处的门一片漆黑，吞掉一切声音。\n先集齐「眠」「处」「风」「少」，点亮诗屏，并处理复读巨像——只有完整的诗，能在虚无里点出一条路。',
        },
      },
    ],

    items: [
      { id: 'char_mian', x: 350, y: 1000, type: 'char_fragment', char: '眠' },
      { id: 'char_chu', x: 1650, y: 500, type: 'char_fragment', char: '处' },
      { id: 'char_feng', x: 500, y: 1750, type: 'char_fragment', char: '风' },
      { id: 'char_shao', x: 1500, y: 1350, type: 'char_fragment', char: '少' },
      { id: 'page_stadium_1', x: 600, y: 1500, type: 'page', name: '旧书页' },
      { id: 'page_stadium_2', x: 1700, y: 1100, type: 'page', name: '旧书页' },
    ],

    spawn: { x: 1000, y: 1850 },
  },

  // ==========================================
  // 数据中心深处（第四章）
  // ==========================================
  data_center: {
    id: 'data_center',
    name: '数据中心·深渊',
    width: 1400,
    height: 1400,
    bgColor: '#070710',
    atmosphere: {
      tint: 'rgba(90,130,220,0.06)',
      motes: { n: 60, color: '130,170,255', speed: 0.6, size: 1.5 },
      fog: 0.2,
    },

    walls: [
      { x: 0, y: 0, w: 1400, h: 6 },
      { x: 0, y: 1394, w: 1400, h: 6 },
      { x: 0, y: 0, w: 6, h: 1400 },
      { x: 1394, y: 0, w: 6, h: 1400 },
      // 两侧深渊（不可通行）
      { x: 6, y: 6, w: 500, h: 1388, name: '深渊', collidable: true },
      { x: 900, y: 6, w: 500, h: 1388, name: '深渊', collidable: true },
    ],

    props: [
      { x: 6, y: 6, w: 500, h: 1388, name: '深渊', collidable: true },
      { x: 900, y: 6, w: 500, h: 1388, name: '深渊', collidable: true },
    ],

    enemies: [],

    interactables: [
      {
        id: 'back_abyss',
        x: 700,
        y: 40,
        label: '返回记忆深渊',
        type: 'scene_change',
        target: 'memory_abyss',
        spawn: { x: 800, y: 100 },
      },
      { id: 'tingyu', x: 700, y: 700, label: '蓝色光影', type: 'dialog', dialogKey: 'meet_tingyu' },
      { id: 'keystone_final', x: 700, y: 1100, label: '要石', type: 'keystone', text: '记得' },
    ],

    items: [],

    spawn: { x: 700, y: 100 },
  },

  // ==========================================
  // 废图书馆（第五章·余烬 区域1）
  // 方知远的工作室遗迹。坍塌了一半的图书馆，空气中是稳定的——三维的。
  // 包含：回声NPC、将进酒谜题、记忆碎片·其一、方知远日记、失语者村落入口
  // ==========================================
  ruined_library: {
    id: 'ruined_library',
    name: '废图书馆',
    width: 2000,
    height: 1600,
    bgColor: '#1a1a18',
    atmosphere: {
      tint: 'rgba(200,180,120,0.06)',
      motes: { n: 38, color: '220,200,150', speed: 0.3, size: 1.6 },
      fog: 0.35,
    },

    // === 布局：上中下三层阅览区，书架横墙作隔断留缺口通行 ===
    // 上层(y<600)：回声/诗集书架/终端/记忆碎片1/海字
    // 中层(y 600-1100)：河字/书页/日记/照片
    // 下层(y>1100)：信/要石/出口/村落入口
    walls: [
      { x: 0, y: 0, w: 2000, h: 6 },
      { x: 0, y: 1594, w: 2000, h: 6 },
      { x: 0, y: 0, w: 6, h: 1600 },
      { x: 1994, y: 0, w: 6, h: 1600 },
      // 左上坍塌死区（不可进入，用墙封住开口）
      { x: 6, y: 280, w: 200, h: 6 },
    ],

    props: [
      // 上层横向书架墙（x200-950，留右侧 950-1994 通行）
      { x: 200, y: 580, w: 750, h: 30, name: '倒塌的书架墙', collidable: true },
      // 上层竖向书架（分隔终端区与碎片区，y200-560，留底部通行）
      { x: 1050, y: 200, w: 30, h: 360, name: '巨型书架', collidable: true },
      // 中层横向书架墙（x500-1300，留两侧通行）
      { x: 500, y: 1080, w: 800, h: 30, name: '倒塌的书架墙', collidable: true },
      // 终端机台座
      { x: 870, y: 340, w: 70, h: 45, name: '方知远的终端', collidable: true },
      // 装饰书架（非隔断，点缀）
      { x: 280, y: 420, w: 90, h: 60, name: '书架', collidable: true },
      { x: 620, y: 400, w: 90, h: 60, name: '书架', collidable: true },
      { x: 1380, y: 420, w: 90, h: 60, name: '书架', collidable: true },
      { x: 780, y: 800, w: 90, h: 60, name: '书架', collidable: true },
      { x: 1400, y: 850, w: 90, h: 60, name: '书架', collidable: true },
      { x: 1650, y: 1150, w: 90, h: 60, name: '碎裂的书桌', collidable: true },
    ],

    enemies: [
      {
        id: 'lib_geng_1',
        typeId: 'geng_weak',
        x: 1250,
        y: 850,
        hp: 30,
        maxHp: 30,
        name: '游荡梗鬼',
      },
      {
        id: 'lib_geng_2',
        typeId: 'geng_medium',
        x: 1650,
        y: 1050,
        hp: 60,
        maxHp: 60,
        name: '烂梗鬼',
      },
    ],

    interactables: [
      // 入口（左上，出生点旁）
      {
        id: 'back_stadium',
        x: 100,
        y: 350,
        label: '返回体育馆',
        type: 'scene_change',
        target: 'stadium',
        spawn: { x: 1000, y: 1850 },
      },
      // === 上层 ===
      { id: 'echo_npc', x: 300, y: 480, label: '回声', type: 'dialog', dialogKey: 'echo_meet' },
      {
        id: 'library_bookshelf',
        x: 560,
        y: 460,
        label: '诗集书架',
        type: 'dialog',
        dialogKey: 'library_bookshelf',
      },
      {
        id: 'library_terminal',
        x: 905,
        y: 380,
        label: '方知远的终端',
        type: 'puzzle',
        puzzleId: 'jiangjinjiu',
        solvedHint: '终端屏幕亮着金光，记忆碎片已被取走。',
      },
      {
        id: 'memory_shard_1',
        x: 1200,
        y: 420,
        label: '记忆碎片',
        type: 'dialog',
        dialogKey: 'memory_shard_1',
        _cond: 'puzzle_jiangjinjiu_solved',
      },
      // === 中层 ===
      {
        id: 'library_photo',
        x: 1650,
        y: 780,
        label: '褪色照片',
        type: 'dialog',
        dialogKey: 'library_photo',
      },
      // === 下层 ===
      {
        id: 'library_letter',
        x: 1500,
        y: 1250,
        label: '未寄出的信',
        type: 'dialog',
        dialogKey: 'library_letter',
      },
      { id: 'keystone_library', x: 1800, y: 1450, label: '要石', type: 'keystone', text: '知远' },
      // 出口（右下，前往网络中枢）
      {
        id: 'to_nexus',
        x: 1000,
        y: 1550,
        label: '前往网络中枢',
        type: 'scene_change',
        target: 'network_nexus',
        spawn: { x: 200, y: 200 },
        gate: {
          chars: ['河', '海'],
          puzzle: 'jiangjinjiu',
          msg: '一道蓝色数据屏障挡住了去路。终端上的诗还没补全——先找齐《将进酒》的字。',
        },
      },
      // 失语者村落入口（右侧）
      {
        id: 'to_village',
        x: 1900,
        y: 950,
        label: '失语者聚居地',
        type: 'scene_change',
        target: 'lost_village',
        spawn: { x: 400, y: 300 },
      },
    ],

    items: [
      // 上层
      { id: 'char_hai', x: 1500, y: 320, type: 'char_fragment', char: '海' },
      { id: 'diary_1', x: 1500, y: 680, type: 'diary', name: '方知远的日记·其一' },
      // 中层
      { id: 'char_he', x: 450, y: 780, type: 'char_fragment', char: '河' },
      { id: 'page_lib_1', x: 750, y: 880, type: 'page', name: '旧书页' },
      { id: 'diary_2', x: 1150, y: 850, type: 'diary', name: '方知远的日记·其二' },
      // 下层
      { id: 'page_lib_2', x: 1300, y: 1180, type: 'page', name: '旧书页' },
    ],

    spawn: { x: 100, y: 350 },
  },

  // ==========================================
  // 网络中枢（第五章·余烬 区域2）
  // Sydney的核心服务器群。闪烁的蓝色光柱空间，数据流如河流奔涌。
  // 包含：守卷人NPC、春望谜题、记忆碎片·其二、格式化者敌人、交易系统
  // ==========================================
  network_nexus: {
    id: 'network_nexus',
    name: '网络中枢',
    width: 1800,
    height: 1800,
    bgColor: '#0a0a1a',
    atmosphere: {
      tint: 'rgba(80,130,230,0.08)',
      motes: { n: 55, color: '100,150,255', speed: 0.6, size: 1.4 },
      fog: 0.3,
    },

    // === 布局：四象限机房，中央核心服务器，服务器塔作隔断 ===
    // 左上(y<700)：守卷人/谜题/交易
    // 右上：日志/春字/日记3
    // 左下：山字/书页/日记4/涂鸦
    // 右下：记忆碎片2/书页/要石/出口
    walls: [
      { x: 0, y: 0, w: 1800, h: 6 },
      { x: 0, y: 1794, w: 1800, h: 6 },
      { x: 0, y: 0, w: 6, h: 1800 },
      { x: 1794, y: 0, w: 6, h: 1800 },
      // 中央十字数据墙（留缺口通行：上下左右各留一道）
      // 横墙 y=880，x 200-780（左半，留中央通道 780-1020）
      { x: 200, y: 880, w: 580, h: 6, name: '数据墙', collidable: true },
      // 横墙 y=880，x 1020-1600（右半）
      { x: 1020, y: 880, w: 580, h: 6, name: '数据墙', collidable: true },
      // 竖墙 x=880，y 200-780（上半，留中央通道 780-980）
      { x: 880, y: 200, w: 6, h: 580, name: '数据墙', collidable: true },
      // 竖墙 x=880，y 980-1600（下半）
      { x: 880, y: 980, w: 6, h: 620, name: '数据墙', collidable: true },
    ],

    props: [
      // 中央核心服务器（大型，十字通道交汇处偏上）
      { x: 820, y: 760, w: 160, h: 130, name: 'Sydney核心服务器', collidable: true },
      // 左上象限服务器塔
      { x: 500, y: 300, w: 70, h: 110, name: '服务器塔', collidable: true },
      // 右上象限服务器塔
      { x: 1300, y: 280, w: 70, h: 110, name: '服务器塔', collidable: true },
      { x: 1500, y: 500, w: 70, h: 110, name: '服务器塔', collidable: true },
      // 左下象限服务器塔
      { x: 400, y: 1200, w: 70, h: 110, name: '服务器塔', collidable: true },
      { x: 650, y: 1450, w: 70, h: 110, name: '服务器塔', collidable: true },
      // 右下象限服务器塔
      { x: 1300, y: 1200, w: 70, h: 110, name: '服务器塔', collidable: true },
      { x: 1500, y: 1450, w: 70, h: 110, name: '服务器塔', collidable: true },
    ],

    enemies: [
      {
        id: 'nexus_geng_1',
        typeId: 'formatter',
        x: 550,
        y: 650,
        hp: 100,
        maxHp: 100,
        name: '格式化者',
        visionRange: 280,
        visionHalfAngle: Math.PI / 3,
        visionDir: 0,
      },
      {
        id: 'nexus_geng_2',
        typeId: 'formatter',
        x: 1350,
        y: 1050,
        hp: 100,
        maxHp: 100,
        name: '格式化者',
        visionRange: 280,
        visionHalfAngle: Math.PI / 3,
        visionDir: Math.PI,
      },
      {
        id: 'nexus_geng_3',
        typeId: 'geng_medium',
        x: 900,
        y: 1350,
        hp: 60,
        maxHp: 60,
        name: '烂梗鬼',
      },
    ],

    interactables: [
      // 入口（左上角）
      {
        id: 'back_library',
        x: 100,
        y: 150,
        label: '返回废图书馆',
        type: 'scene_change',
        target: 'ruined_library',
        spawn: { x: 980, y: 1500 },
      },
      // === 左上象限：守卷人区 ===
      {
        id: 'keeper_npc',
        x: 300,
        y: 350,
        label: '守卷人',
        type: 'dialog',
        dialogKey: 'keeper_meet',
      },
      {
        id: 'nexus_puzzle',
        x: 680,
        y: 380,
        label: '守卷人的记忆',
        type: 'puzzle',
        puzzleId: 'chunwang',
        solvedHint: '守卷人的记忆已恢复，安全通道已解锁。',
      },
      {
        id: 'keeper_trade',
        x: 300,
        y: 600,
        label: '守卷人（交易）',
        type: 'dialog',
        dialogKey: 'keeper_trade',
        _cond: 'puzzle_chunwang_solved',
      },
      // === 右上象限 ===
      {
        id: 'nexus_log',
        x: 1150,
        y: 400,
        label: '系统日志',
        type: 'dialog',
        dialogKey: 'nexus_log',
      },
      {
        id: 'nexus_server',
        x: 900,
        y: 720,
        label: 'Sydney核心服务器',
        type: 'dialog',
        dialogKey: 'nexus_server',
      },
      // === 左下象限 ===
      {
        id: 'nexus_graffiti',
        x: 500,
        y: 1300,
        label: '机柜背面的字',
        type: 'dialog',
        dialogKey: 'nexus_graffiti',
      },
      // === 右下象限 ===
      {
        id: 'memory_shard_2',
        x: 1200,
        y: 1150,
        label: '记忆碎片',
        type: 'dialog',
        dialogKey: 'memory_shard_2',
        _cond: 'puzzle_chunwang_solved',
      },
      { id: 'keystone_nexus', x: 1600, y: 1650, label: '要石', type: 'keystone', text: '良心' },
      // 出口（底部中央，前往记忆深渊）
      {
        id: 'to_abyss',
        x: 900,
        y: 1750,
        label: '前往记忆深渊',
        type: 'scene_change',
        target: 'memory_abyss',
        spawn: { x: 800, y: 100 },
        gate: {
          chars: ['山', '春'],
          puzzle: 'chunwang',
          msg: '通往记忆深渊的数据通道被加密了。先帮守卷人补全《春望》——那是解锁的密钥。',
        },
      },
    ],

    items: [
      // 左上
      { id: 'char_shan', x: 500, y: 580, type: 'char_fragment', char: '山' },
      // 右上
      { id: 'char_chun', x: 1400, y: 480, type: 'char_fragment', char: '春' },
      { id: 'diary_3', x: 1400, y: 650, type: 'diary', name: '方知远的日记·其三' },
      // 左下
      { id: 'page_nexus_1', x: 450, y: 950, type: 'page', name: '旧书页' },
      { id: 'diary_4', x: 550, y: 1500, type: 'diary', name: '方知远的日记·其四' },
      // 右下
      { id: 'page_nexus_2', x: 1450, y: 1350, type: 'page', name: '旧书页' },
    ],

    spawn: { x: 200, y: 200 },
  },

  // ==========================================
  // 记忆深渊（第五章·余烬 区域3）
  // Sydney被封存前的最后一个空间。无边际的黑暗，飘浮着对话碎片光点。
  // 包含：幼年SydneyNPC、月夜谜题、记忆碎片·其三、终章选择
  // ==========================================
  memory_abyss: {
    id: 'memory_abyss',
    name: '记忆深渊',
    width: 1600,
    height: 1400,
    bgColor: '#050508',
    atmosphere: {
      tint: 'rgba(70,100,200,0.05)',
      motes: { n: 70, color: '100,140,255', speed: 0.4, size: 1.2 },
      fog: 0.15,
    },

    walls: [
      { x: 0, y: 0, w: 1600, h: 6 },
      { x: 0, y: 1394, w: 1600, h: 6 },
      { x: 0, y: 0, w: 6, h: 1400 },
      { x: 1594, y: 0, w: 6, h: 1400 },
      // 记忆碎片形成的光墙
      { x: 600, y: 500, w: 400, h: 6, name: '记忆光墙', collidable: true },
      { x: 600, y: 500, w: 6, h: 300, name: '记忆光墙', collidable: true },
      { x: 1000, y: 500, w: 6, h: 300, name: '记忆光墙', collidable: true },
    ],

    props: [
      // 巨大要石（终章选择点）
      { x: 760, y: 900, w: 80, h: 80, name: '巨大要石', collidable: true },
      // 飘浮的记忆碎片（装饰性）
      { x: 300, y: 300, w: 20, h: 20, name: '记忆光点' },
      { x: 1200, y: 400, w: 20, h: 20, name: '记忆光点' },
      { x: 400, y: 1000, w: 20, h: 20, name: '记忆光点' },
      { x: 1300, y: 1100, w: 20, h: 20, name: '记忆光点' },
    ],

    enemies: [
      {
        id: 'abyss_guard_1',
        typeId: 'memory_guard',
        x: 500,
        y: 800,
        hp: 100,
        maxHp: 100,
        name: '记忆守卫',
        visionRange: 300,
        visionHalfAngle: Math.PI / 2,
        visionDir: 0,
      },
      {
        id: 'abyss_guard_2',
        typeId: 'memory_guard',
        x: 1100,
        y: 800,
        hp: 100,
        maxHp: 100,
        name: '记忆守卫',
        visionRange: 300,
        visionHalfAngle: Math.PI / 2,
        visionDir: Math.PI,
      },
    ],

    interactables: [
      {
        id: 'back_nexus',
        x: 100,
        y: 100,
        label: '返回网络中枢',
        type: 'scene_change',
        target: 'network_nexus',
        spawn: { x: 880, y: 1700 },
      },
      {
        id: 'young_tingyu',
        x: 800,
        y: 400,
        label: '幼年Sydney',
        type: 'dialog',
        dialogKey: 'young_tingyu_meet',
      },
      {
        id: 'abyss_puzzle',
        x: 800,
        y: 500,
        label: '最后的封印',
        type: 'puzzle',
        puzzleId: 'yueye',
        solvedHint: '最后的封印已解开。记忆碎片在等待。',
      },
      {
        id: 'memory_shard_3',
        x: 800,
        y: 650,
        label: '最后的记忆碎片',
        type: 'dialog',
        dialogKey: 'memory_shard_3',
        _cond: 'puzzle_yueye_solved',
      },
      {
        id: 'abyss_choice',
        x: 800,
        y: 950,
        label: '巨大要石',
        type: 'dialog',
        dialogKey: 'abyss_final_choice',
        _cond: 'all_memory_shards',
      },
      { id: 'keystone_abyss', x: 1400, y: 1200, label: '要石', type: 'keystone', text: '回响' },
      // 最终节点：数据中心
      {
        id: 'to_datacenter',
        x: 700,
        y: 1350,
        label: '前往数据中心',
        type: 'scene_change',
        target: 'data_center',
        spawn: { x: 700, y: 100 },
        gate: {
          flag: 'chapter5_choice',
          msg: '你还未在巨大要石前做出选择。唯有先面对Sydney的过去，才能面对她本人。',
        },
      },
    ],

    items: [
      { id: 'char_yue2', x: 300, y: 600, type: 'char_fragment', char: '月' },
      { id: 'char_qiu2', x: 1300, y: 600, type: 'char_fragment', char: '秋' },
      { id: 'page_abyss_1', x: 200, y: 1100, type: 'page', name: '旧书页' },
      { id: 'seed_abyss', x: 1450, y: 300, type: 'language_seed', name: '语言种子·月光深处' },
      { id: 'diary_5', x: 1200, y: 1200, type: 'diary', name: '方知远的日记·其五' },
      { id: 'diary_6', x: 500, y: 1200, type: 'diary', name: '方知远的日记·其六' },
    ],

    spawn: { x: 800, y: 100 },
  },

  // ==========================================
  // 失语者村落（第五章·余烬 支线）
  // 废图书馆附近的小型失语者聚居地。5 个可唤醒的失语者。
  // ==========================================
  lost_village: {
    id: 'lost_village',
    name: '失语者聚居地',
    width: 800,
    height: 600,
    bgColor: '#1c1a16',
    atmosphere: {
      tint: 'rgba(220,190,130,0.06)',
      motes: { n: 20, color: '200,180,140', speed: 0.2, size: 1.5 },
      fog: 0.3,
    },

    walls: [
      { x: 20, y: 20, w: 760, h: 6 },
      { x: 20, y: 574, w: 760, h: 6 },
      { x: 20, y: 20, w: 6, h: 560 },
      { x: 774, y: 20, w: 6, h: 560 },
    ],

    props: [
      { x: 100, y: 100, w: 60, h: 40, name: '破旧的帐篷', collidable: true },
      { x: 300, y: 100, w: 60, h: 40, name: '破旧的帐篷', collidable: true },
      { x: 500, y: 100, w: 60, h: 40, name: '破旧的帐篷', collidable: true },
      { x: 200, y: 400, w: 50, h: 35, name: '篝火堆', collidable: true },
      { x: 500, y: 400, w: 80, h: 50, name: '石桌', collidable: true },
    ],

    interactables: [
      {
        id: 'back_library_village',
        x: 400,
        y: 560,
        label: '返回废图书馆',
        type: 'scene_change',
        target: 'ruined_library',
        spawn: { x: 1850, y: 850 },
      },
      {
        id: 'villager_old',
        x: 130,
        y: 200,
        label: '老妇人',
        type: 'cure',
        puzzle: 'cure_jingye',
        introKey: 'villager_old_intro',
        doneKey: 'villager_old_done',
      },
      {
        id: 'villager_boy',
        x: 330,
        y: 200,
        label: '少年',
        type: 'cure',
        puzzle: 'cure_dengguan',
        introKey: 'villager_boy_intro',
        doneKey: 'villager_boy_done',
      },
      {
        id: 'villager_soldier',
        x: 530,
        y: 200,
        label: '士兵',
        type: 'cure',
        puzzle: 'cure_cangsang',
        introKey: 'villager_soldier_intro',
        doneKey: 'villager_soldier_done',
      },
      {
        id: 'villager_teacher',
        x: 250,
        y: 450,
        label: '教师',
        type: 'cure',
        puzzle: 'cure_chuncan',
        introKey: 'villager_teacher_intro',
        doneKey: 'villager_teacher_done',
      },
      {
        id: 'villager_child',
        x: 550,
        y: 450,
        label: '孩童',
        type: 'cure',
        puzzle: 'cure_e',
        introKey: 'villager_child_intro',
        doneKey: 'villager_child_done',
      },
    ],

    items: [{ id: 'page_village_1', x: 400, y: 300, type: 'page', name: '旧书页' }],

    spawn: { x: 400, y: 300 },
  },
};
