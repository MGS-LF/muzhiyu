// 场景数据 — 冷冻中心 + 废弃街道

export const scenes = {
  // ==========================================
  // 冷冻中心
  // ==========================================
  freeze_center: {
    id: 'freeze_center',
    name: '冷冻中心',
    width: 800,
    height: 600,
    bgColor: '#0c0e12',

    walls: [
      // 外墙
      { x: 20, y: 20, w: 760, h: 6 },
      { x: 20, y: 574, w: 250, h: 6 },
      { x: 480, y: 574, w: 300, h: 6 },
      { x: 20, y: 20, w: 6, h: 560 },
      { x: 774, y: 20, w: 6, h: 560 },
      // 更衣室
      { x: 580, y: 380, w: 200, h: 6 },
      { x: 580, y: 380, w: 6, h: 100 },
      { x: 774, y: 380, w: 6, h: 130 },
      { x: 580, y: 510, w: 200, h: 6 },
    ],

    props: [
      { x: 80,  y: 100, w: 130, h: 80, name: '冷冻仓 A' },
      { x: 225, y: 100, w: 130, h: 80, name: '冷冻仓 B' },
      { x: 370, y: 100, w: 130, h: 80, name: '冷冻仓 C' },
      { x: 515, y: 100, w: 130, h: 80, name: '冷冻仓 D' },
      { x: 660, y: 100, w: 100, h: 80, name: '冷冻仓 E' },
      { x: 100, y: 220, w: 140, h: 100, name: '冷冻仓 F' },
      { x: 255, y: 220, w: 140, h: 100, name: '冷冻仓 G' },
      { x: 410, y: 220, w: 140, h: 100, name: '冷冻仓 H' },
      { x: 565, y: 220, w: 140, h: 100, name: '冷冻仓 I' },
      { x: 280, y: 380, w: 160, h: 130, name: '我的冷冻仓', isPlayerPod: true },
      { x: 480, y: 380, w: 80, h: 40, name: '终端机' },
    ],

    interactables: [
      { id: 'player_pod', x: 360, y: 530, label: '我的冷冻仓', type: 'pod' },
      { id: 'terminal', x: 520, y: 435, label: '终端机', type: 'terminal' },
      { id: 'locker', x: 650, y: 495, label: '储物柜', type: 'locker' },
      { id: 'exit_door', x: 380, y: 560, label: '推开大门', type: 'exit' },
    ],

    items: [
      { id: 'page1', x: 180, y: 540, type: 'page' },
    ],

    spawn: { x: 360, y: 540 },
  },

  // ==========================================
  // 废弃街道
  // ==========================================
  street_01: {
    id: 'street_01',
    name: '废弃街道',
    width: 1600,
    height: 1200,
    bgColor: '#1a1812',

    walls: [
      // 4 边
      { x: 0, y: 0, w: 1600, h: 6 },
      { x: 0, y: 1194, w: 700, h: 6 },
      { x: 900, y: 1194, w: 700, h: 6 },
      { x: 0, y: 0, w: 6, h: 1200 },
      { x: 1594, y: 0, w: 6, h: 1200 },
      // 返回冷冻中心门口（北侧）
      { x: 350, y: 0, w: 6, h: 200 },
      { x: 540, y: 0, w: 6, h: 200 },
    ],

    props: [
      // 远处高楼废墟（线条轮廓）
      { x: 100, y: 100, w: 100, h: 250, name: '高楼' },
      { x: 230, y: 80, w: 130, h: 320, name: '高楼' },
      { x: 1100, y: 90, w: 120, h: 350, name: '高楼' },
      { x: 1280, y: 70, w: 100, h: 380, name: '高楼' },
      { x: 1400, y: 110, w: 150, h: 280, name: '高楼' },
      // 废弃车辆
      { x: 700, y: 600, w: 50, h: 30, name: '废弃车辆' },
    ],

    interactables: [
      // 回到冷冻中心
      { id: 'back_door', x: 440, y: 40, label: '回到冷冻中心', type: 'scene_change', target: 'freeze_center', spawn: { x: 380, y: 500 } },
      // 失语者群
      { id: 'lost_people', x: 800, y: 700, label: '失语者群', type: 'dialog', dialogKey: 'lost_people' },
      // 继续向南
      { id: 'go_south', x: 800, y: 1150, label: '继续向南', type: 'scene_change', target: 'street_01', spawn: { x: 800, y: 100 } },
    ],

    items: [],

    spawn: { x: 440, y: 100 },
  },
};
