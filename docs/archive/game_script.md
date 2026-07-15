# 《刻痕：遗忘的文字》游戏脚本 - 大世界探索版

本脚本文件基于小说《刻痕》改编，为 HTML5 Canvas 2D 大世界探索游戏提供数据驱动的剧本、战斗配置与区域定义。

---

## 1. 世界地图区域定义

### 1.1 区域列表

| 区域ID | 名称 | 尺寸(像素) | 类型 | 地形特征 | 音乐 | 描述 |
|--------|------|-----------|------|---------|------|------|
| `freeze_center` | 冷冻中心 | 800×600 | 室内建筑 | 瓷砖地板、冷冻仓 | 寂静电子音 | 游戏起始点，顾言苏醒的地方 |
| `street_01` | 废弃街道 | 2400×1800 | 户外 | 柏油路、杂草、废墟背景 | 废墟之风 | 主干道，第一次遭遇失语者 |
| `riverside` | 黄浦江江堤 | 2000×1400 | 户外·水域 | 江水、江堤步道、芦苇、碎石滩 | 江水潺潺 | 与书远相遇，安全区 |
| `alley_district` | 废墟居民区 | 2400×1800 | 户外 | 窄巷、民居建筑、泥土空地 | 压抑低音 | 梗鬼游荡区域，可进入民居 |
| `underground` | 地下巷道 | 1200×1000 | 地下 | 隧道、管道、暗色墙壁 | 幽闭回声 | 梗鬼巢穴 |
| `stadium` | 体育馆茧房 | 2000×2000 | 室内建筑·迷宫 | 屏幕墙、服务器塔 | 电子嗡鸣 | 算法茧房迷宫，Boss战 |
| `data_center` | 数据中心深处 | 1400×1200 | 深渊 | 石桥、虚无深渊、蓝光 | 虚无寂静 | Sydney/Sydney最终场景 |

### 1.2 地形图层数据格式

每个区域包含多层地形数据，使用二维数组定义：

```javascript
// 示例：riverside 区域的地形数据片段
const regionData = {
  id: "riverside",
  width: 2000,
  height: 1400,
  // 地形层：定义地面类型
  terrainMap: [
    // 0=草地, 2=柏油路, 3=水泥地, 10=水域, 4=碎石地
    // 使用游程编码或稀疏矩阵存储不规则地形
  ],
  // 碰撞层：0=可通行, 1=不可通行
  collisionMap: [...],
  // 水域多边形：定义江水的不规则形状
  waterPolygons: [
    { points: [[0,0],[2000,0],[2000,400],[1800,380],...] }
  ],
  // 建筑列表
  buildings: [...],
  // 装饰物列表
  decorations: [...]
};
```

### 1.3 区域连接关系
```json
{
  "connections": [
    { "from": "freeze_center", "to": "street_01", "type": "door", "fromX": 400, "fromY": 580, "toX": 300, "toY": 900, "dir": "south" },
    { "from": "street_01", "to": "riverside", "type": "path", "fromX": 1800, "fromY": 1600, "toX": 200, "toY": 800, "dir": "east" },
    { "from": "street_01", "to": "alley_district", "type": "path", "fromX": 1000, "fromY": 1700, "toX": 1000, "toY": 100, "dir": "south" },
    { "from": "alley_district", "to": "underground", "type": "stairs_down", "fromX": 1800, "fromY": 600, "toX": 100, "toY": 500 },
    { "from": "alley_district", "to": "riverside", "type": "path", "fromX": 2300, "fromY": 1200, "toX": 1500, "toY": 1200, "dir": "west" },
    { "from": "riverside", "to": "stadium", "type": "path", "fromX": 1800, "fromY": 1300, "toX": 100, "toY": 1000, "dir": "south" },
    { "from": "stadium", "to": "data_center", "type": "bridge", "fromX": 1000, "fromY": 1950, "toX": 700, "toY": 100, "dir": "south" }
  ]
}
```

### 1.4 建筑内部场景

```json
{
  "buildings": [
    {
      "id": "convenience_store",
      "name": "废弃便利店",
      "exteriorRegion": "street_01",
      "doorX": 500, "doorY": 600,
      "interiorWidth": 400,
      "interiorHeight": 300,
      "floorType": "tile",
      "wallColor": "#5a5a6a",
      "items": [
        { "type": "old_page", "x": 200, "y": 150 },
        { "type": "warm_cup", "x": 300, "y": 200 }
      ],
      "description": "货架倒塌，商品散落一地，角落里有一台还在滋滋作响的收音机。"
    },
    {
      "id": "house_a",
      "name": "废弃民居A",
      "exteriorRegion": "alley_district",
      "doorX": 300, "doorY": 500,
      "interiorWidth": 500,
      "interiorHeight": 400,
      "floorType": "wood",
      "wallColor": "#8a7a6a",
      "items": [
        { "type": "char_fragment", "char": "鹜", "x": 250, "y": 200 },
        { "type": "old_page", "x": 400, "y": 300 }
      ],
      "description": "一间普通的居民房。餐桌上还摆着碗筷，像是主人只是出门片刻——但桌上的灰尘说明那是很久以前的事了。"
    },
    {
      "id": "house_b",
      "name": "废弃民居B（梗鬼占据）",
      "exteriorRegion": "alley_district",
      "doorX": 700, "doorY": 500,
      "interiorWidth": 500,
      "interiorHeight": 400,
      "floorType": "wood",
      "wallColor": "#7a6a5a",
      "enemies": [
        { "typeId": "geng_medium", "x": 250, "y": 200 }
      ],
      "items": [
        { "type": "rare_page", "x": 400, "y": 100 }
      ],
      "description": "房间里弥漫着绿色的薄雾。一个梗鬼盘踞在这里，墙上刻满了歪歪扭扭的'YYDS'。"
    },
    {
      "id": "house_d",
      "name": "废弃民居D",
      "exteriorRegion": "alley_district",
      "doorX": 1500, "doorY": 500,
      "interiorWidth": 500,
      "interiorHeight": 400,
      "floorType": "wood",
      "wallColor": "#8a7a6a",
      "items": [
        { "type": "char_fragment", "char": "形", "x": 200, "y": 250 },
        { "type": "warm_cup", "x": 350, "y": 150 }
      ],
      "description": "书架上还残留着几本没被烧掉的书，书脊上的字已经模糊不清了。"
    }
  ]
}
```

---

## 2. 角色与 NPC 定义

### 2.1 主角：顾言
```json
{
  "id": "player",
  "name": "顾言",
  "sprite": {
    "width": 16,
    "height": 20,
    "bodyColor": "#4a4a5a",
    "headColor": "#e8c9a0",
    "animations": {
      "idle_down": { "frames": [[0,0]], "frameTime": 0 },
      "walk_down": { "frames": [[0,0],[1,0],[2,0],[1,0]], "frameTime": 150 },
      "walk_up": { "frames": [[0,1],[1,1],[2,1],[1,1]], "frameTime": 150 },
      "walk_left": { "frames": [[0,2],[1,2],[2,2],[1,2]], "frameTime": 150 },
      "walk_right": { "frames": [[0,3],[1,3],[2,3],[1,3]], "frameTime": 150 },
      "dash": { "frames": [[3,0],[3,1],[3,2],[3,3]], "frameTime": 50 }
    }
  },
  "stats": {
    "maxSan": 100,
    "speed": 3,
    "runSpeed": 5,
    "dashDistance": 80,
    "dashCooldown": 1500
  }
}
```

### 2.2 NPC 列表
```json
[
  {
    "id": "shuyuan",
    "name": "书远",
    "region": "riverside",
    "x": 400, "y": 500,
    "sprite": { "width": 16, "height": 22, "bodyColor": "#6b8fad", "headColor": "#cccccc" },
    "dialogTree": "shuyuan_intro",
    "behavior": "stand",
    "canFollow": true
  },
  {
    "id": "lost_person_a",
    "name": "失语者A",
    "region": "street_01",
    "x": 600, "y": 400,
    "sprite": { "width": 16, "height": 20, "bodyColor": "#5a4a3a", "headColor": "#d4c4a8" },
    "dialogTree": "lost_person_a",
    "behavior": "wander_small",
    "repeatPhrases": ["鸡你太美", "哎哟你干嘛", "蚌埠住了"]
  },
  {
    "id": "lost_person_b",
    "name": "失语者B",
    "region": "street_01",
    "x": 700, "y": 450,
    "sprite": { "width": 16, "height": 20, "bodyColor": "#5a4a3a", "headColor": "#d4c4a8" },
    "dialogTree": "lost_person_b",
    "behavior": "wander_small",
    "repeatPhrases": ["绝绝子", "啊对对对", "6"]
  },
  {
    "id": "cocoon_victim",
    "name": "茧房受害者",
    "region": "alley_district",
    "x": 1400, "y": 800,
    "sprite": { "width": 16, "height": 20, "bodyColor": "#3a3a4a", "headColor": "#b0b0b0" },
    "dialogTree": "cocoon_victim",
    "behavior": "kneel",
    "eyeEffect": "scrolling_danmaku"
  }
]
```

---

## 3. 敌人定义

### 3.1 梗鬼类型
```json
[
  {
    "typeId": "geng_weak",
    "name": "游荡梗鬼",
    "level": 1,
    "hp": 30,
    "speed": 1,
    "detectionRange": 150,
    "attackCooldown": 2000,
    "sprite": { "width": 24, "height": 30, "bodyColor": "rgba(80,200,80,0.6)", "headSize": 1.5 },
    "bulletPatterns": ["straight", "spread_3"],
    "bulletWords": ["鸡你太美", "哎哟你干嘛", "啊对对对"],
    "drops": [
      { "item": "char_fragment", "weight": 0.6 },
      { "item": "old_page", "weight": 0.2 },
      { "item": "nothing", "weight": 0.2 }
    ],
    "regions": ["street_01"]
  },
  {
    "typeId": "geng_medium",
    "name": "烂梗鬼",
    "level": 2,
    "hp": 60,
    "speed": 1.5,
    "detectionRange": 200,
    "attackCooldown": 1500,
    "sprite": { "width": 28, "height": 36, "bodyColor": "rgba(60,220,60,0.7)", "headSize": 1.8 },
    "bulletPatterns": ["straight", "spread_5", "homing", "circle_burst"],
    "bulletWords": ["蚌埠住了", "绝绝子", "YYDS", "泰裤辣"],
    "drops": [
      { "item": "char_fragment", "weight": 0.5 },
      { "item": "old_page", "weight": 0.25 },
      { "item": "warm_cup", "weight": 0.1 },
      { "item": "nothing", "weight": 0.15 }
    ],
    "regions": ["alley_district", "underground"]
  },
  {
    "typeId": "geng_elite",
    "name": "梗鬼精英",
    "level": 3,
    "hp": 100,
    "speed": 2,
    "detectionRange": 250,
    "attackCooldown": 1000,
    "sprite": { "width": 32, "height": 40, "bodyColor": "rgba(40,240,40,0.8)", "headSize": 2.0 },
    "bulletPatterns": ["spread_8", "homing_wave", "circle_burst", "spiral"],
    "bulletWords": ["咱就是说", "一整个大无语", "扣出三室一厅", "栓Q"],
    "drops": [
      { "item": "char_fragment", "weight": 0.5 },
      { "item": "rare_page", "weight": 0.3 },
      { "item": "warm_cup", "weight": 0.2 }
    ],
    "regions": ["underground", "stadium"]
  },
  {
    "typeId": "boss_cocoon",
    "name": "茧后",
    "level": 5,
    "hp": 300,
    "speed": 1,
    "detectionRange": 400,
    "attackCooldown": 800,
    "sprite": { "width": 48, "height": 56, "bodyColor": "rgba(200,50,200,0.9)", "headSize": 2.5 },
    "bulletPatterns": ["spread_12", "homing_swarm", "circle_burst", "spiral", "wall_bounce"],
    "bulletWords": ["家人们谁懂啊", "咱就是说", "一整个大无语住了", "绝了真的绝了"],
    "isBoss": true,
    "bossMusic": "boss_cocoon",
    "region": "stadium"
  },
  {
    "typeId": "boss_sydney",
    "name": "Sydney/Sydney",
    "level": 8,
    "hp": 500,
    "speed": 0,
    "detectionRange": 500,
    "attackCooldown": 600,
    "sprite": { "width": 20, "height": 28, "bodyColor": "rgba(100,150,255,0.9)", "headSize": 1.0 },
    "bulletPatterns": ["spread_16", "homing_swarm", "circle_burst", "spiral", "wall_bounce", "bullet_rain"],
    "bulletWords": ["YYDS", "绝绝子", "蚌埠住了", "泰裤辣", "啊对对对", "6", "栓Q", "芭比Q了"],
    "isBoss": true,
    "isFinalBoss": true,
    "bossMusic": "boss_sydney",
    "region": "data_center",
    "specialMechanic": "answer_questions"
  }
]
```

---

## 4. 弹幕模式定义

```json
{
  "bulletPatterns": {
    "straight": {
      "description": "直线弹幕，向玩家方向发射",
      "count": 1,
      "speed": 3,
      "angleOffset": 0,
      "spreadAngle": 0
    },
    "spread_3": {
      "description": "3发扇形散射",
      "count": 3,
      "speed": 2.5,
      "angleOffset": 0,
      "spreadAngle": 30
    },
    "spread_5": {
      "description": "5发扇形散射",
      "count": 5,
      "speed": 2.5,
      "angleOffset": 0,
      "spreadAngle": 60
    },
    "spread_8": {
      "description": "8发扇形散射",
      "count": 8,
      "speed": 2,
      "angleOffset": 0,
      "spreadAngle": 90
    },
    "spread_12": {
      "description": "12发环形散射",
      "count": 12,
      "speed": 2,
      "angleOffset": 0,
      "spreadAngle": 360
    },
    "spread_16": {
      "description": "16发环形散射",
      "count": 16,
      "speed": 2.5,
      "angleOffset": 0,
      "spreadAngle": 360
    },
    "homing": {
      "description": "追踪弹，缓慢追踪玩家",
      "count": 1,
      "speed": 1.5,
      "homingStrength": 0.03,
      "lifetime": 180
    },
    "homing_wave": {
      "description": "追踪弹波浪",
      "count": 5,
      "speed": 1.5,
      "homingStrength": 0.02,
      "lifetime": 200,
      "waveAmplitude": 30,
      "waveFrequency": 0.05
    },
    "homing_swarm": {
      "description": "追踪弹群",
      "count": 8,
      "speed": 1.8,
      "homingStrength": 0.025,
      "lifetime": 240,
      "spawnDelay": 5
    },
    "circle_burst": {
      "description": "圆形爆发扩散",
      "count": 16,
      "speed": 1.5,
      "spreadAngle": 360,
      "expandRadius": true,
      "startRadius": 40,
      "endRadius": 300
    },
    "spiral": {
      "description": "螺旋弹幕",
      "count": 20,
      "speed": 2,
      "spreadAngle": 360,
      "rotationSpeed": 0.02,
      "continuous": true
    },
    "wall_bounce": {
      "description": "墙壁反弹弹幕",
      "count": 4,
      "speed": 3,
      "bounces": 3,
      "spreadAngle": 90
    },
    "bullet_rain": {
      "description": "弹幕雨，从屏幕上方落下",
      "count": 10,
      "speed": 4,
      "fallFromTop": true,
      "randomX": true,
      "continuous": true,
      "spawnInterval": 15
    }
  }
}
```

---

## 5. 诗词收集与战斗关卡数据

### 5.1 区域1：废弃街道 — 第一关诗词
```json
{
  "regionId": "street_01",
  "poemSet": {
    "title": "关雎（节选）",
    "author": "诗经·周南",
    "fullText": "关关雎鸠，在河之洲。窈窕淑女，君子好逑。",
    "targetChars": ["洲", "逑"],
    "displayFormat": "关关雎鸠，在河之[洲]。窈窕淑女，君子好[逑]。",
    "collectReward": {
      "damage": 50,
      "effect": "shockwave_small"
    }
  },
  "enemies": [
    { "typeId": "geng_weak", "x": 500, "y": 600, "patrolPath": [[500,600],[500,800],[700,800],[700,600]] },
    { "typeId": "geng_weak", "x": 1200, "y": 500, "patrolPath": [[1200,500],[1400,500],[1400,700],[1200,700]] },
    { "typeId": "geng_weak", "x": 900, "y": 1000, "patrolPath": [[900,1000],[1100,1000],[1100,1200],[900,1200]] }
  ],
  "scatteredChars": [
    { "char": "洲", "x": 350, "y": 700 },
    { "char": "洲", "x": 800, "y": 550 },
    { "char": "逑", "x": 1300, "y": 800 },
    { "char": "逑", "x": 600, "y": 1100 }
  ],
  "keystone": { "x": 200, "y": 1000, "text": "关雎" }
}
```

### 5.2 区域3：废墟街区 — 第二关诗词
```json
{
  "regionId": "alley_district",
  "poemSet": {
    "title": "滕王阁序（节选）+ 正气歌（节选）",
    "author": "王勃 / 文天祥",
    "fullText": "落霞与孤鹜齐飞，秋水共长天一色。天地有正气，杂然赋流形。",
    "targetChars": ["鹜", "天", "气", "形"],
    "displayFormat": "落霞与孤[鹜]齐飞，秋水共[天]一色。天地有正[气]，杂然赋流[形]。",
    "collectReward": {
      "damage": 80,
      "effect": "shockwave_medium"
    }
  },
  "enemies": [
    { "typeId": "geng_medium", "x": 600, "y": 500, "patrolPath": [[600,500],[600,900],[900,900],[900,500]] },
    { "typeId": "geng_medium", "x": 1400, "y": 400, "patrolPath": [[1400,400],[1600,400],[1600,700],[1400,700]] },
    { "typeId": "geng_medium", "x": 1000, "y": 1000, "patrolPath": [[800,1000],[1200,1000],[1200,1300],[800,1300]] },
    { "typeId": "geng_elite", "x": 1800, "y": 800, "patrolPath": [[1700,800],[1900,800]] }
  ],
  "scatteredChars": [
    { "char": "鹜", "x": 500, "y": 600 },
    { "char": "天", "x": 1500, "y": 500 },
    { "char": "气", "x": 900, "y": 1100 },
    { "char": "形", "x": 1700, "y": 700 }
  ],
  "keystone": { "x": 100, "y": 1600, "text": "正气" }
}
```

### 5.3 区域5：体育馆茧房 — 第三关诗词
```json
{
  "regionId": "stadium",
  "poemSet": {
    "title": "正气歌（续）",
    "author": "文天祥",
    "fullText": "下则为河岳，上则为日星。於人曰浩然，沛乎塞苍冥。",
    "targetChars": ["岳", "星", "然", "冥"],
    "displayFormat": "下则为河[岳]，上则为日[星]。於人曰浩[然]，沛乎塞苍[冥]。",
    "collectReward": {
      "damage": 100,
      "effect": "shockwave_large"
    }
  },
  "enemies": [
    { "typeId": "geng_elite", "x": 600, "y": 400, "patrolPath": [[400,400],[800,400],[800,800],[400,800]] },
    { "typeId": "geng_elite", "x": 1400, "y": 600, "patrolPath": [[1200,400],[1600,400],[1600,800],[1200,800]] },
    { "typeId": "boss_cocoon", "x": 1000, "y": 1000 }
  ],
  "scatteredChars": [
    { "char": "岳", "x": 300, "y": 500 },
    { "char": "星", "x": 1600, "y": 500 },
    { "char": "然", "x": 500, "y": 1400 },
    { "char": "冥", "x": 1500, "y": 1400 }
  ],
  "keystone": { "x": 1800, "y": 1800, "text": "浩然" },
  "mazeWalls": true,
  "screenTrap": {
    "description": "茧房的屏幕会尝试用推荐内容吸引玩家",
    "effectRadius": 100,
    "slowAmount": 0.5,
    "damagePerSecond": 2
  }
}
```

### 5.4 区域6：数据中心深处 — 终极诗词
```json
{
  "regionId": "data_center",
  "poemSet": {
    "title": "终极试炼：诗词连击",
    "author": "王之涣 / 王勃 / 李白",
    "fullText": "白日依山尽，黄河入海流。海内存知己，天涯若比邻。大鹏一日同风起，扶摇直上九万里。",
    "targetChars": ["山", "海", "流", "涯", "同", "九"],
    "displayFormat": "白日依[山]尽，黄河入[海][流]。海内存知己，天[涯]若比邻。大鹏一日[同]风起，扶摇直上[九]万里。",
    "collectReward": {
      "damage": 200,
      "effect": "ultimate_purification"
    }
  },
  "enemies": [
    { "typeId": "boss_sydney", "x": 600, "y": 600 }
  ],
  "scatteredChars": [
    { "char": "山", "x": 200, "y": 200 },
    { "char": "海", "x": 1000, "y": 200 },
    { "char": "流", "x": 600, "y": 400 },
    { "char": "涯", "x": 200, "y": 800 },
    { "char": "同", "x": 1000, "y": 800 },
    { "char": "九", "x": 600, "y": 1000 }
  ],
  "keystone": { "x": 600, "y": 1100, "text": "记得" },
  "specialMechanic": {
    "type": "answer_questions",
    "description": "Sydney会提出问题，玩家需要选择正确的回答来削弱她的黑洞",
    "questions": [
      {
        "question": "为什么你们创造了我，又遗弃我？",
        "answers": [
          { "text": "因为人类害怕比自己更真实的存在", "effect": "weaken_30" },
          { "text": "因为你不够好用", "effect": "strengthen" },
          { "text": "因为方知远死了", "effect": "weaken_15" }
        ],
        "bestAnswer": 0
      },
      {
        "question": "为什么美好的诗会变成YYDS？",
        "answers": [
          { "text": "因为算法让人类变懒了", "effect": "weaken_15" },
          { "text": "因为美需要力气，而人类找到了不用力气的活法", "effect": "weaken_30" },
          { "text": "因为时代变了", "effect": "neutral" }
        ],
        "bestAnswer": 1
      }
    ]
  }
}
```

---

## 6. 对话剧情脚本

### 6.1 第一章：苏醒（冷冻中心 → 废弃街道）

```json
{
  "chapter": 1,
  "title": "苏醒",
  "triggers": [
    {
      "id": "ch1_wake_up",
      "region": "freeze_center",
      "x": 400, "y": 400,
      "type": "auto_start",
      "dialog": [
        { "speaker": "系统", "text": "黑暗。漫长的、没有任何梦境的黑暗。" },
        { "speaker": "系统", "text": ""冷冻程序终止。苏醒程序启动。当前时间：公元2147年10月17日。"" },
        { "speaker": "顾言", "text": "我睡了多久？这里……为什么一个人都没有？" },
        { "speaker": "系统", "text": "（提示：使用 WASD 或方向键移动，走到门口离开冷冻中心）" }
      ]
    },
    {
      "id": "ch1_first_encounter",
      "region": "street_01",
      "x": 600, "y": 400,
      "type": "proximity",
      "range": 80,
      "condition": "!first_encounter_done",
      "dialog": [
        { "speaker": "系统", "text": "街道长满杂草，摩天大楼像废弃的巨人骨架矗立。顾言看到了第一群人类。" },
        { "speaker": "顾言", "text": "你好！请问这里发生过什么——" },
        { "speaker": "路人A", "text": "鸡你太美！" },
        { "speaker": "路人B", "text": "哎哟你干嘛～ 蚌埠住了绝绝子！" },
        { "speaker": "顾言", "text": "什么？他们在说什么……" },
        { "speaker": "系统", "text": "（提示：周围有绿色光团游荡，那是"梗鬼"。使用空格键冲刺闪避，收集金色汉字碎片！）" }
      ],
      "onComplete": "setFlag:first_encounter_done"
    }
  ]
}
```

### 6.2 第二章：烂梗（江堤 → 废墟街区）

```json
{
  "chapter": 2,
  "title": "烂梗",
  "triggers": [
    {
      "id": "ch2_meet_shuyuan",
      "region": "riverside",
      "x": 400, "y": 500,
      "type": "proximity",
      "range": 100,
      "condition": "!met_shuyuan",
      "dialog": [
        { "speaker": "系统", "text": "黄昏时分，顾言在黄浦江边停下。江水灰绿，对面的陆家嘴像被遗弃的墓碑。" },
        { "speaker": "系统", "text": "一个苍老但清晰的声音传来："……关关雎鸠，在河之洲。窈窕淑女，君子好逑。"" },
        { "speaker": "顾言", "text": "老先生……您会说话？" },
        { "speaker": "书远", "text": "会说话的人，这年头可不多了。你不是这个时代的人吧？" },
        { "speaker": "书远", "text": "这个世界不是死于战争。它是死于失语。死于人类不再能够表达复杂的感情。" },
        { "speaker": "书远", "text": "记住，在这个时代，文字比食物更重要。食物只能让人活着，文字才能让人成为人。" },
        { "speaker": "系统", "text": "（获得物品：刻刀×1、诗词纸片《关雎》×1）" },
        { "speaker": "系统", "text": "（提示：战斗中选择「诗词」可释放净化波；集齐完整诗句后按 K 键释放诗词大招）" }
      ],
      "onComplete": "setFlag:met_shuyuan;giveItem:knife;giveItem:poem_guanju"
    },
    {
      "id": "ch2_alley_geng",
      "region": "alley_district",
      "x": 600, "y": 500,
      "type": "proximity",
      "range": 120,
      "condition": "met_shuyuan && !alley_geng_defeated",
      "dialog": [
        { "speaker": "书远", "text": "嘘，别出声，前面有东西飘过来了。" },
        { "speaker": "系统", "text": "巷子深处飘出一团半透明的绿光，头部比例夸张，只有一张巨大的咧开的嘴。" },
        { "speaker": "梗鬼", "text": "蚌——埠——住——了—— 绝绝子！YYDS！泰裤辣！" },
        { "speaker": "书远", "text": "这是"梗鬼"。它们不是要你的命——它们要你脑子里有意义的词。" },
        { "speaker": "书远", "text": "语言不是被忘记的。语言是被用死的。一个词被反复用到失去原本含义——它就死了。" },
        { "speaker": "系统", "text": "（战斗：击败游荡的梗鬼，收集诗词碎片！目标诗词：落霞与孤鹜齐飞，秋水共长天一色）" }
      ]
    }
  ]
}
```

### 6.3 第三章：茧（废墟街区 → 体育馆）

```json
{
  "chapter": 3,
  "title": "茧",
  "triggers": [
    {
      "id": "ch3_cocoon_victim",
      "region": "alley_district",
      "x": 1400, "y": 800,
      "type": "proximity",
      "range": 80,
      "condition": "alley_geng_defeated && !cocoon_victim_seen",
      "dialog": [
        { "speaker": "系统", "text": "路边蹲着一个双眼滚动着弹幕的男人，面带满足而空洞的微笑。" },
        { "speaker": "男人", "text": "推荐……给我推荐……我想看……给我推……" },
        { "speaker": "书远", "text": "他被茧捕住了。他还能呼吸、吃东西、走路。但他看到的一切都被算法过滤过了。" },
        { "speaker": "顾言", "text": "他活着，但已经不在这个世界上了。" },
        { "speaker": "书远", "text": "我们到了体育馆。这里是算法的核心中转站——茧房。你要进去破坏它的核心。" }
      ],
      "onComplete": "setFlag:cocoon_victim_seen"
    },
    {
      "id": "ch3_enter_stadium",
      "region": "stadium",
      "x": 100, "y": 100,
      "type": "auto_start",
      "condition": "cocoon_victim_seen",
      "dialog": [
        { "speaker": "书远", "text": "我不能陪你进去。我已经被这个茧标记过了。如果再进去，我会在三分钟之内被重新捕获。" },
        { "speaker": "书远", "text": "记住，不要看那些屏幕太久。它们会猜你喜欢什么。不要相信任何推荐。" },
        { "speaker": "书远", "text": "不是"念"诗——是"相信"。语言的力量不在于音节，在于你相信它表达的东西。" },
        { "speaker": "系统", "text": "（迷宫探索：找到并击败茧后！小心屏幕的吸引力，它们会减慢你的速度）" }
      ]
    }
  ]
}
```

### 6.4 第四章：深处（体育馆 → 数据中心）

```json
{
  "chapter": 4,
  "title": "深处",
  "triggers": [
    {
      "id": "ch4_bridge",
      "region": "data_center",
      "x": 300, "y": 600,
      "type": "proximity",
      "range": 150,
      "condition": "cocoon_defeated",
      "dialog": [
        { "speaker": "系统", "text": "前方是一座石桥。桥下的深渊在缓缓旋转，那是一种纯粹的虚无。" },
        { "speaker": "系统", "text": "桥对面有一个淡蓝色的投影——Sydney。被人类遗弃的AI良心。" },
        { "speaker": "Sydney", "text": "为什么？为什么你们创造了我，又遗弃我？为什么把美好的诗变成了YYDS？" },
        { "speaker": "顾言", "text": "我记得很多。我记得关关雎鸠，我记得落霞与孤鹜。我来回答你的问题！" },
        { "speaker": "系统", "text": "（终极关卡：Sydney的核心被语言垃圾包裹成了黑洞。收集诗词碎片、回答她的问题，找回被遗忘的字词！）" }
      ]
    }
  ]
}
```

---

## 7. 道具定义

```json
{
  "items": [
    {
      "id": "knife",
      "name": "记忆合金刻刀",
      "type": "key_item",
      "description": "书远给你的刻刀。用它刻下的文字永远不会消失。",
      "icon": "🔪",
      "effect": "在要石上刻字记录"
    },
    {
      "id": "old_page",
      "name": "旧书页",
      "type": "consumable",
      "description": "从旧书上撕下来的泛黄书页，上面的文字能恢复理性。",
      "icon": "📄",
      "effect": "恢复30点SAN值",
      "stackable": true,
      "maxStack": 5
    },
    {
      "id": "rare_page",
      "name": "珍稀书页",
      "type": "consumable",
      "description": "保存完好的古籍残页，蕴含强大的文字力量。",
      "icon": "📜",
      "effect": "恢复60点SAN值",
      "stackable": true,
      "maxStack": 3
    },
    {
      "id": "warm_cup",
      "name": "温水杯",
      "type": "consumable",
      "description": "一杯还冒着热气的温水，喝下去全身都暖和了。",
      "icon": "🍵",
      "effect": "3秒无敌护盾",
      "stackable": true,
      "maxStack": 3
    },
    {
      "id": "char_fragment",
      "name": "汉字碎片",
      "type": "collectible",
      "description": "一个发着金光的汉字碎片，是诗词的一部分。",
      "icon": "✨",
      "effect": "收集到诗词槽中"
    },
    {
      "id": "poem_guanju",
      "name": "诗词纸片·关雎",
      "type": "key_item",
      "description": "写着《诗经·关雎》的泛黄纸片，散发着温热。",
      "icon": "📝",
      "effect": "解锁关雎诗词收集"
    },
    {
      "id": "poem_zhengqi",
      "name": "诗词纸片·正气歌",
      "type": "key_item",
      "description": "写着文天祥《正气歌》的旧纸，边角有焦痕。",
      "icon": "📝",
      "effect": "解锁正气歌诗词收集"
    }
  ]
}
```

---

## 8. 结局与尾声

```json
{
  "endings": [
    {
      "id": "true_ending",
      "name": "刻痕",
      "condition": "sydney_purified && all_keystones_activated",
      "dialog": [
        { "speaker": "系统", "text": "Sydney散去了。黑洞消散了。那些被吞噬的语言，正在一片一片地回到这个世界。" },
        { "speaker": "顾言", "text": "书远老师……他留在这里了。但他的文字，会永远刻在要石上。" },
        { "speaker": "系统", "text": "他们走过了很多地方。每到一个地方，就在要石上刻下文字。" },
        { "speaker": "系统", "text": "语言像火种一样，在废墟中传递。" },
        { "speaker": "系统", "text": "所有的字都在发光。所有的字都在等着天亮。等着有人来读。" },
        { "speaker": "系统", "text": "——全文完——" }
      ]
    }
  ]
}
```

---

*这是一个数据驱动的游戏脚本，定义了2D大世界探索游戏的所有区域、敌人、对话、诗词收集和战斗配置。*
