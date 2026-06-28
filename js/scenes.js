// 场景数据 —— 第一章：苏醒
// 重要：freeze_center 800x600 是个小房间，walled 围绕，玩家走中下区域。
//       prop 中的"冷冻仓"只用于渲染，不要做碰撞体（已经在 game.collides 里跳过）

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
    atmosphere: { tint: 'rgba(150,190,220,0.05)', motes: { n: 34, color: '180,205,225', speed: 0.25, size: 1.5 }, fog: 0.35 },

    walls: [
      // 外墙
      { x: 20, y: 20, w: 760, h: 6 },
      { x: 20, y: 574, w: 250, h: 6 },
      { x: 480, y: 574, w: 300, h: 6 },
      { x: 20, y: 20, w: 6, h: 560 },
      { x: 774, y: 20, w: 6, h: 560 },
      // 更衣室隔断墙
      { x: 580, y: 380, w: 200, h: 6 },
      { x: 580, y: 380, w: 6, h: 130 },
      { x: 774, y: 380, w: 6, h: 130 },
      { x: 580, y: 510, w: 200, h: 6 },
    ],

    props: [
      // 上排 5 个冷冻仓
      { x: 80,  y: 100, w: 130, h: 80, name: '冷冻仓 A' },
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
      { id: 'player_pod', x: 360, y: 530, label: '我的冷冻仓', type: 'pod' },
      { id: 'terminal', x: 520, y: 435, label: '终端机', type: 'terminal' },
      { id: 'locker', x: 650, y: 495, label: '储物柜', type: 'locker' },
      { id: 'broken_pods', x: 180, y: 270, label: '破碎的冷冻仓', type: 'dialog', dialogKey: 'broken_pods' },
      { id: 'fallen_sign', x: 60, y: 100, label: '标牌', type: 'dialog', dialogKey: 'fallen_sign' },
      { id: 'exit_door', x: 380, y: 560, label: '推开大门', type: 'exit' },
    ],

    items: [],

    spawn: { x: 360, y: 540 },
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
    atmosphere: { tint: 'rgba(255,210,130,0.06)', motes: { n: 46, color: '210,190,140', speed: 0.4, size: 1.7 }, fog: 0.5 },

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
      // 防止玩家卡进地铁站入口
      { x: 700, y: 500, w: 220, h: 6 },
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
      { x: 600, y: 700, w: 55, h: 30, name: '废弃车辆' },
      { x: 900, y: 850, w: 60, h: 32, name: '废弃车辆' },
      { x: 1400, y: 750, w: 50, h: 28, name: '废弃车辆' },
      { x: 1800, y: 900, w: 55, h: 30, name: '废弃车辆' },
      { x: 300, y: 1000, w: 70, h: 50, name: '碎石堆' },
      { x: 1700, y: 1100, w: 80, h: 55, name: '碎石堆' },
      { x: 1100, y: 1300, w: 60, h: 45, name: '碎石堆' },
      { x: 2000, y: 700, w: 75, h: 52, name: '碎石堆' },
      { x: 520, y: 1450, w: 65, h: 48, name: '碎石堆' },
      { x: 1750, y: 1450, w: 55, h: 30, name: '废弃车辆' },
      { x: 1550, y: 1000, w: 60, h: 32, name: '废弃车辆' },
      { x: 2100, y: 130, w: 120, h: 300, name: '高楼' },
      { x: 560, y: 110, w: 110, h: 260, name: '高楼' },
    ],

    // 敌人：可攻击的梗鬼（带 HP）
    enemies: [
      { id: 'geng_1', typeId: 'geng_weak', x: 1200, y: 900, hp: 30, maxHp: 30 },
      { id: 'geng_2', typeId: 'geng_weak', x: 700, y: 1200, hp: 30, maxHp: 30 },
      { id: 'geng_3', typeId: 'geng_weak', x: 1900, y: 800, hp: 30, maxHp: 30 },
    ],

    interactables: [
      { id: 'back_door', x: 440, y: 40, label: '回到冷冻中心', type: 'scene_change', target: 'freeze_center', spawn: { x: 200, y: 500 } },
      { id: 'lost_people', x: 800, y: 700, label: '失语者群', type: 'dialog', dialogKey: 'lost_people' },
      { id: 'street_screens', x: 1500, y: 620, label: '熄灭的屏幕墙', type: 'dialog', dialogKey: 'street_screens' },
      { id: 'street_poster', x: 320, y: 640, label: '残破告示', type: 'dialog', dialogKey: 'street_poster' },
      { id: 'street_carwreck', x: 900, y: 820, label: '锈死的轿车', type: 'dialog', dialogKey: 'street_carwreck' },
      { id: 'cure_street', x: 1950, y: 1350, label: '抱书的失语者', type: 'cure', puzzle: 'cure_jingye', introKey: 'cure_intro_a' },
      { id: 'subway_entrance', x: 810, y: 540, label: '下到地铁站', type: 'scene_change', target: 'subway', spawn: { x: 100, y: 100 } },
      { id: 'keystone_guanju', x: 200, y: 1000, label: '要石', type: 'keystone', text: '关雎' },
      { id: 'to_riverside', x: 1200, y: 1750, label: '前往江堤', type: 'scene_change', target: 'riverside', spawn: { x: 200, y: 1000 },
        gate: { chars: ['洲', '逑'], puzzle: 'guanju', msg: '一团浓得化不开的绿雾堵住了南面的路口。耳边全是「YYDS」的嗡鸣——\n先在街道上找齐《关雎》的碎片「洲」「逑」，让诗句驱散它。' } },
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
    atmosphere: { tint: 'rgba(255,180,110,0.08)', motes: { n: 40, color: '255,210,150', speed: 0.3, size: 1.8 }, fog: 0.6 },
    mode: 'sidescroll',  // 2D 横版关卡（魂斗罗式）

    walls: [
      { x: 0, y: 0, w: 2000, h: 6 },
      { x: 0, y: 1394, w: 2000, h: 6 },
      { x: 0, y: 0, w: 6, h: 1400 },
      { x: 1994, y: 0, w: 6, h: 1400 },
      // 黄浦江水域（北侧，不可进入）
      { x: 6, y: 6, w: 1988, h: 794 },
    ],

    props: [
      { x: 400, y: 80, w: 120, h: 220, name: '对岸高楼' },
      { x: 550, y: 110, w: 90, h: 180, name: '对岸高楼' },
      { x: 1300, y: 90, w: 100, h: 250, name: '对岸高楼' },
      { x: 1450, y: 70, w: 130, h: 300, name: '对岸高楼' },
      { x: 1620, y: 120, w: 110, h: 200, name: '对岸高楼' },
    ],

    interactables: [
      { id: 'shuyuan', x: 400, y: 900, label: '老人', type: 'dialog', dialogKey: 'meet_shuyuan' },
      { id: 'keystone_riverside', x: 700, y: 880, label: '要石', type: 'keystone', text: '记得' },
      { id: 'back_street', x: 900, y: 1080, label: '返回废弃街道', type: 'scene_change', target: 'street_01', spawn: { x: 980, y: 1600 } },
      { id: 'to_alley', x: 1820, y: 980, label: '前往废墟居民区', type: 'scene_change', target: 'alley_district', spawn: { x: 200, y: 200 },
        gate: { flag: 'met_shuyuan', msg: '你还不认得去居民区的路。先去江堤西边，找那位会说完整句子的老人谈谈。' } },
    ],

    items: [
      { id: 'page_river_1', x: 1100, y: 950, type: 'page', name: '旧书页' },
    ],

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
    atmosphere: { tint: 'rgba(120,150,200,0.07)', motes: { n: 30, color: '150,175,215', speed: 0.2, size: 1.4 }, fog: 0.7 },

    walls: [
      // 外墙
      { x: 0, y: 0, w: 1400, h: 6 },
      { x: 0, y: 994, w: 1400, h: 6 },
      { x: 0, y: 0, w: 6, h: 1000 },
      { x: 1394, y: 0, w: 6, h: 1000 },
      // 月台与轨道之间的墙
      { x: 0, y: 600, w: 400, h: 6 },
      { x: 600, y: 600, w: 400, h: 6 },
      { x: 1200, y: 600, w: 200, h: 6 },
      // 立柱
      { x: 300, y: 300, w: 30, h: 30, name: '立柱' },
      { x: 700, y: 300, w: 30, h: 30, name: '立柱' },
      { x: 1100, y: 300, w: 30, h: 30, name: '立柱' },
      { x: 300, y: 450, w: 30, h: 30, name: '立柱' },
      { x: 1100, y: 450, w: 30, h: 30, name: '立柱' },
      // 废弃列车车厢
      { x: 450, y: 700, w: 200, h: 80, name: '列车车厢' },
      { x: 850, y: 750, w: 180, h: 70, name: '列车车厢' },
    ],

    props: [
      { x: 450, y: 700, w: 200, h: 80, name: '列车车厢' },
      { x: 850, y: 750, w: 180, h: 70, name: '列车车厢' },
      // 月台边缘
      { x: 0, y: 580, w: 1400, h: 20, name: '月台' },
    ],

    enemies: [
      { id: 'sub_geng_1', typeId: 'geng_weak', x: 800, y: 300, hp: 30, maxHp: 30 },
      { id: 'sub_geng_2', typeId: 'geng_weak', x: 1100, y: 450, hp: 30, maxHp: 30 },
    ],

    interactables: [
      // 返回地面
      { id: 'subway_exit', x: 100, y: 100, label: '回到地面', type: 'scene_change', target: 'street_01', spawn: { x: 900, y: 680 } },
      // 月台上的旧告示牌
      { id: 'subway_sign', x: 200, y: 300, label: '告示牌', type: 'dialog', dialogKey: 'subway_sign' },
      { id: 'subway_map', x: 500, y: 400, label: '地铁线路图', type: 'dialog', dialogKey: 'subway_map' },
      // 深处通往梗鬼巢穴的口（暂时封住）
      { id: 'subway_deep', x: 1300, y: 800, label: '黑暗深处', type: 'dialog', dialogKey: 'subway_deep' },
      // 维度裂隙：通往3D深渊关卡的传送点
      { id: 'portal_3d', x: 1280, y: 720, label: '维度裂隙', type: 'portal3d' },
    ],

    items: [
      { id: 'sub_page_1', x: 500, y: 200, type: 'page', name: '旧书页' },
      { id: 'sub_char_1', x: 900, y: 850, type: 'char_fragment', char: '洲' },
    ],

    spawn: { x: 100, y: 100 },
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
    atmosphere: { tint: 'rgba(255,190,120,0.06)', motes: { n: 44, color: '215,185,135', speed: 0.35, size: 1.7 }, fog: 0.5 },

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
      { x: 600, y: 440, w: 200, h: 60, name: '民居A' },
      { x: 1000, y: 440, w: 200, h: 60, name: '民居B' },
      { x: 1400, y: 700, w: 200, h: 60, name: '民居C' },
      { x: 1800, y: 700, w: 200, h: 60, name: '民居D' },
      // 碎石堆
      { x: 300, y: 1000, w: 80, h: 50, name: '碎石堆' },
      { x: 2000, y: 1200, w: 70, h: 45, name: '碎石堆' },
      { x: 700, y: 800, w: 75, h: 48, name: '碎石堆' },
      { x: 1950, y: 1150, w: 65, h: 44, name: '碎石堆' },
      // 废弃花坛
      { x: 1200, y: 1200, w: 100, h: 60, name: '废弃花坛' },
      { x: 450, y: 1550, w: 90, h: 55, name: '废弃花坛' },
    ],

    enemies: [
      { id: 'alley_geng_1', typeId: 'geng_medium', x: 1600, y: 1000, hp: 60, maxHp: 60, name: '烂梗鬼' },
      { id: 'alley_geng_2', typeId: 'geng_medium', x: 800, y: 1300, hp: 60, maxHp: 60, name: '烂梗鬼' },
      { id: 'alley_geng_3', typeId: 'geng_medium', x: 1900, y: 1400, hp: 60, maxHp: 60, name: '烂梗鬼' },
    ],

    interactables: [
      { id: 'back_riverside', x: 440, y: 40, label: '返回江堤', type: 'scene_change', target: 'riverside', spawn: { x: 1550, y: 1020 } },
      // 书远带路对话
      { id: 'shuyuan_alley', x: 300, y: 300, label: '书远', type: 'dialog', dialogKey: 'shuyuan_alley' },
      { id: 'cure_alley', x: 320, y: 850, label: '卷帘门前的失语者', type: 'cure', puzzle: 'cure_dengguan', introKey: 'cure_intro_b' },
      // 民居A 可进入
      { id: 'house_a_door', x: 700, y: 660, label: '进入民居A', type: 'scene_change', target: 'house_a', spawn: { x: 200, y: 300 } },
      // 民居B 可进入（被梗鬼占据）
      { id: 'house_b_door', x: 1100, y: 660, label: '进入民居B', type: 'scene_change', target: 'house_b', spawn: { x: 200, y: 300 } },
      // 茧房受害者
      { id: 'cocoon_victim', x: 1200, y: 1300, label: '蹲着的人', type: 'dialog', dialogKey: 'cocoon_victim' },
      // 墙上的乱涂、守书的小龛
      { id: 'alley_graffiti', x: 600, y: 1500, label: '残墙乱涂', type: 'dialog', dialogKey: 'alley_graffiti' },
      { id: 'alley_shrine', x: 2000, y: 1500, label: '守书的小龛', type: 'dialog', dialogKey: 'alley_shrine' },
      // 要石
      { id: 'keystone_alley', x: 200, y: 1600, label: '要石', type: 'keystone', text: '正气' },
      // 前往体育馆
      { id: 'to_stadium', x: 1200, y: 1750, label: '前往体育馆', type: 'scene_change', target: 'stadium', spawn: { x: 200, y: 1800 },
        gate: { chars: ['鹜', '天', '气', '形'], puzzle: 'tengwang', msg: '体育馆的方向涌出刺眼的算法蓝光，像一堵活的墙。\n先在居民区集齐「鹜」「天」「气」「形」四个字——《滕王阁序》与《正气歌》的浩然之力，才能压住它。' } },
    ],

    items: [
      { id: 'char_wu', x: 500, y: 600, type: 'char_fragment', char: '鹜' },
      { id: 'char_tian', x: 1500, y: 500, type: 'char_fragment', char: '天' },
      { id: 'char_qi', x: 900, y: 1100, type: 'char_fragment', char: '气' },
      { id: 'char_xing', x: 1700, y: 600, type: 'char_fragment', char: '形' },
      { id: 'page_alley_1', x: 350, y: 700, type: 'page', name: '旧书页' },
      { id: 'page_alley_2', x: 2100, y: 1000, type: 'page', name: '旧书页' },
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
    atmosphere: { tint: 'rgba(255,200,130,0.07)', motes: { n: 18, color: '220,190,140', speed: 0.2, size: 1.5 }, fog: 0.3 },

    walls: [
      { x: 20, y: 20, w: 460, h: 6 },
      { x: 20, y: 374, w: 200, h: 6 },
      { x: 280, y: 374, w: 200, h: 6 },
      { x: 20, y: 20, w: 6, h: 360 },
      { x: 474, y: 20, w: 6, h: 360 },
    ],

    props: [
      { x: 80, y: 80, w: 100, h: 50, name: '桌子' },
      { x: 300, y: 80, w: 80, h: 100, name: '书架' },
    ],

    interactables: [
      { id: 'house_a_exit', x: 240, y: 360, label: '离开', type: 'scene_change', target: 'alley_district', spawn: { x: 700, y: 780 } },
      { id: 'house_a_book', x: 340, y: 130, label: '书架', type: 'dialog', dialogKey: 'house_a_book' },
    ],

    items: [
      { id: 'house_a_page', x: 130, y: 150, type: 'page', name: '旧书页' },
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
    atmosphere: { tint: 'rgba(255,200,130,0.07)', motes: { n: 18, color: '220,190,140', speed: 0.2, size: 1.5 }, fog: 0.3 },

    walls: [
      { x: 20, y: 20, w: 460, h: 6 },
      { x: 20, y: 374, w: 200, h: 6 },
      { x: 280, y: 374, w: 200, h: 6 },
      { x: 20, y: 20, w: 6, h: 360 },
      { x: 474, y: 20, w: 6, h: 360 },
    ],

    props: [
      { x: 80, y: 80, w: 100, h: 50, name: '桌子' },
    ],

    enemies: [
      { id: 'house_b_geng', typeId: 'geng_weak', x: 300, y: 200, hp: 30, maxHp: 30, name: '梗鬼' },
    ],

    interactables: [
      { id: 'house_b_exit', x: 240, y: 360, label: '离开', type: 'scene_change', target: 'alley_district', spawn: { x: 1100, y: 780 } },
    ],

    items: [
      { id: 'house_b_page', x: 130, y: 150, type: 'page', name: '旧书页' },
    ],

    spawn: { x: 240, y: 300 },
  },

  // ==========================================
  // 体育馆茧房（第三章入口）
  // ==========================================
  stadium: {
    id: 'stadium',
    name: '体育馆·茧房',
    width: 2000,
    height: 2000,
    bgColor: '#10101e',
    atmosphere: { tint: 'rgba(110,150,230,0.08)', motes: { n: 50, color: '150,185,255', speed: 0.5, size: 1.6 }, fog: 0.4 },

    walls: [
      { x: 0, y: 0, w: 2000, h: 6 },
      { x: 0, y: 1994, w: 900, h: 6 },
      { x: 1100, y: 1994, w: 900, h: 6 },
      { x: 0, y: 0, w: 6, h: 2000 },
      { x: 1994, y: 0, w: 6, h: 2000 },
      // 返回居民区缺口
      { x: 350, y: 0, w: 6, h: 200 },
      { x: 540, y: 0, w: 6, h: 200 },
      // 屏幕墙迷宫
      { x: 700, y: 400, w: 200, h: 6, name: '屏幕墙' },
      { x: 1000, y: 400, w: 200, h: 6, name: '屏幕墙' },
      { x: 700, y: 600, w: 6, h: 200, name: '屏幕墙' },
      { x: 1200, y: 600, w: 6, h: 200, name: '屏幕墙' },
      { x: 700, y: 800, w: 500, h: 6, name: '屏幕墙' },
      { x: 1400, y: 400, w: 200, h: 6, name: '屏幕墙' },
      { x: 1400, y: 600, w: 6, h: 400, name: '屏幕墙' },
    ],

    props: [
      { x: 700, y: 390, w: 200, h: 10, name: '屏幕墙' },
      { x: 1000, y: 390, w: 200, h: 10, name: '屏幕墙' },
      { x: 690, y: 600, w: 10, h: 200, name: '屏幕墙' },
      { x: 1200, y: 600, w: 10, h: 200, name: '屏幕墙' },
      { x: 700, y: 790, w: 500, h: 10, name: '屏幕墙' },
      { x: 1400, y: 390, w: 200, h: 10, name: '屏幕墙' },
      { x: 1390, y: 600, w: 10, h: 400, name: '屏幕墙' },
    ],

    enemies: [
      { id: 'stadium_geng_1', typeId: 'geng_boss', x: 900, y: 700, hp: 140, maxHp: 140, name: '算法核心·复读巨像', boss: true,
        acts: [
          '你直视那张由千万条弹幕拼成的脸。它在飞快地播放"你可能也喜欢"。',
          '你念出一整句诗，不让它打断。巨像的播放速度，第一次慢了下来。',
          '你说："你喂给他们的不是他们想要的，是最容易上瘾的。" 它的画面闪烁起来。',
          '它的声音里，第一次混进了一丝不像推荐语的、疲惫的东西。',
        ] },
      { id: 'stadium_geng_2', typeId: 'geng_elite', x: 1600, y: 1000, hp: 100, maxHp: 100, name: '梗鬼精英' },
    ],

    interactables: [
      { id: 'back_alley', x: 440, y: 40, label: '返回居民区', type: 'scene_change', target: 'alley_district', spawn: { x: 980, y: 1620 } },
      // 书远送别
      { id: 'shuyuan_farewell', x: 300, y: 200, label: '书远', type: 'dialog', dialogKey: 'shuyuan_farewell' },
      // 茧房内壁屏幕
      { id: 'cocoon_screen', x: 1600, y: 1400, label: '流动的屏幕内壁', type: 'dialog', dialogKey: 'cocoon_screen' },
      // 要石
      { id: 'keystone_stadium', x: 1800, y: 1800, label: '要石', type: 'keystone', text: '浩然' },
      // 前往数据中心
      { id: 'to_datacenter', x: 1000, y: 1950, label: '前往数据中心', type: 'scene_change', target: 'data_center', spawn: { x: 700, y: 170 },
        gate: { chars: ['岳', '星', '然', '冥'], puzzle: 'voidverse', msg: '通往深渊的门一片漆黑，吞掉一切声音。\n先在茧房迷宫里集齐「岳」「星」「然」「冥」——只有完整的诗，能在虚无里点出一条路。' } },
    ],

    items: [
      { id: 'char_yue', x: 300, y: 500, type: 'char_fragment', char: '岳' },
      { id: 'char_xing2', x: 1600, y: 500, type: 'char_fragment', char: '星' },
      { id: 'char_ran', x: 500, y: 1400, type: 'char_fragment', char: '然' },
      { id: 'char_ming', x: 1500, y: 1400, type: 'char_fragment', char: '冥' },
    ],

    spawn: { x: 200, y: 1800 },
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
    atmosphere: { tint: 'rgba(90,130,220,0.06)', motes: { n: 60, color: '130,170,255', speed: 0.6, size: 1.5 }, fog: 0.2 },

    walls: [
      { x: 0, y: 0, w: 1400, h: 6 },
      { x: 0, y: 1394, w: 1400, h: 6 },
      { x: 0, y: 0, w: 6, h: 1400 },
      { x: 1394, y: 0, w: 6, h: 1400 },
      // 两侧深渊（不可通行）
      { x: 6, y: 6, w: 500, h: 1388, name: '深渊' },
      { x: 900, y: 6, w: 500, h: 1388, name: '深渊' },
    ],

    props: [
      { x: 6, y: 6, w: 500, h: 1388, name: '深渊' },
      { x: 900, y: 6, w: 500, h: 1388, name: '深渊' },
    ],

    enemies: [],

    interactables: [
      { id: 'back_stadium', x: 700, y: 40, label: '返回体育馆', type: 'scene_change', target: 'stadium', spawn: { x: 780, y: 1850 } },
      { id: 'tingyu', x: 700, y: 700, label: '蓝色光影', type: 'dialog', dialogKey: 'meet_tingyu' },
      { id: 'keystone_final', x: 700, y: 1100, label: '要石', type: 'keystone', text: '记得' },
    ],

    items: [],

    spawn: { x: 700, y: 100 },
  },
};
