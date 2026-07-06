# 《刻痕：遗忘的文字》HTML5 Canvas 2D 大世界探索游戏 - 详细设计文档

本项目是基于科幻小说《刻痕》改编的 HTML5 Canvas 2D 开放世界探索游戏。玩家将扮演主角"顾言"，在充斥着"烂梗污染"与"算法茧房"的废墟世界中自由探索，躲避绿色的"烂梗弹幕"，收集散落的"诗词字符碎片"作为武器进行反击，找回被遗忘的语言与文明的火种。

---

## 1. 游戏世界观与核心设定

### 1.1 背景设定
*   **时间**：公元2147年，人类文明在一场由语言优化模型"泛言"和无节制的"烂梗病毒"引发的失语灾难中化为废墟。
*   **污染**：人们失去了组织复杂句子的能力，脑海中充斥着"YYDS"、"绝绝子"、"啊对对对"等无意义的声波，并会聚集成半透明、散发病态绿光的"梗鬼"。
*   **武器**：写满中国古代经典诗词的泛黄纸片。诗词中的意境与情感（浩然正气）能抵消烂梗的侵蚀。
*   **目标**：主角顾言在老人书远的指引下，探索废墟世界，前往网络深处回答良心 AI "Sydney"（后化为听雨）的终极提问，重新在世界各地刻下要石，传播文字火种。

### 1.2 核心玩法概述
这是一个 **2D 俯视角开放世界探索游戏**，类似早期《塞尔达传说》或《星露谷物语》的视角。玩家控制一个小人角色在废墟大地图上自由移动、探索、战斗、收集。

---

## 2. 大世界地图设计

### 2.1 地图设计理念
地图 **不是矩形拼接**，而是由**自然地形、建筑、道路、水域**等元素组成的有机世界。

- **地形层**：草地、泥土、柏油路、碎石地、水面、泥地等不同地表
- **建筑层**：可以进入的建筑（内部独立场景）和不可进入的废墟背景
- **装饰层**：树木、草丛、路灯、废弃车辆、碎石堆、芦苇等
- **水域**：黄浦江、小河、水坑——玩家不能走进水里
- **地形高低差**：江堤台阶、高架桥、地下入口——营造立体感

### 2.2 世界整体布局（俯视角概念图）

```
                          北 ↑
                          
     ╔═══════════════════════════════════════════════╗
     ║          灰白色天空 · 压抑的云层               ║
     ║                                               ║
     ║    ┌─────────────┐                            ║
     ║    │  冷冻中心    │   ← 起始点(室内)            ║
     ║    │  [建筑物]    │                            ║
     ║    └──────┬──────┘                            ║
     ║           │ 柏油路                              ║
     ║     ╔═════╧══════════════════════╗             ║
     ║     ║      废弃主干道             ║             ║
     ║     ║   ~~~ ~~~ 杂草 ~~~ ~~~    ║             ║
     ║     ║ [失语者]    [失语者]       ║             ║
     ║     ║   🏚️废弃店铺  🏚️坍塌大楼  ║             ║
     ║     ╚══════════╤══════════════╝             ║
     ║                │ 旧地铁站入口(↓地下)           ║
     ║     ┌──────────┴──────────┐                   ║
     ║     │     居民区废墟        │                   ║
     ║     │  🏚️  🏚️  🏚️       │                   ║
     ║     │  ┌──┐ ┌──┐ ┌──┐   │                   ║
     ║     │  │可│ │可│ │可│   │ ← 可进入的废弃民居  ║
     ║     │  │进│ │进│ │进│   │                   ║
     ║     │  └──┘ └──┘ └──┘   │                   ║
     ║     └──────────┬──────────┘                   ║
     ║                │ 窄巷                            ║
     ║         ╔══════╧══════════╗                    ║
     ║         ║    梗鬼游荡区    ║                    ║
     ║         ║  👻  👻  👻    ║                    ║
     ║         ║  [烂梗鬼巢穴]   ║                    ║
     ║         ╚══════╤══════════╝                    ║
     ║                │                                 ║
     ║         ┌──────┴──────┐                         ║
     ║         │  高架桥废墟   │                         ║
     ║         │  ≡≡≡≡≡≡≡≡  │ ← 断裂的高架               ║
     ║         └──────┬──────┘                         ║
     ║                │                                 ║
     ║    ╔═══════════╧══════════════════════╗        ║
     ║    ║         黄 浦 江                 ║        ║
     ║    ║  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈  ║        ║
     ║    ║  ≈≈≈ 灰色江水 ≈≈≈ 垃圾漂浮 ≈≈≈ ║        ║
     ║    ║  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈  ║        ║
     ║    ╠══════════════════════════════╣        ║
     ║    ║    江堤步道                    ║        ║
     ║    ║  🌾芦苇  🪨要石  👴书远       ║        ║
     ║    ║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ║        ║
     ║    ╚══════════════════════════════╝        ║
     ║                │                                 ║
     ║         ┌──────┴──────┐                         ║
     ║         │   体育馆     │  ← 大型建筑(内部迷宫)     ║
     ║         │  ╭────────╮ │                         ║
     ║         │  │ 茧房   │ │                         ║
     ║         │  │ 迷宫   │ │                         ║
     ║         │  ╰────────╯ │                         ║
     ║         └──────┬──────┘                         ║
     ║                │ 荒芜小路                          ║
     ║         ┌──────┴──────┐                         ║
     ║         │  数据中心    │  ← 最终区域               ║
     ║         │  ··桥··     │                         ║
     ║         │  ≈深渊≈     │                         ║
     ║         │  💙Sydney   │                         ║
     ║         └─────────────┘                         ║
     ╚═══════════════════════════════════════════════╝
```

### 2.3 地图图层系统

地图由多个图层叠加而成：

```
┌────────────────────────────┐
│  第5层：特效层（粒子、光照） │  ← 最上层
├────────────────────────────┤
│  第4层：实体层（NPC/敌人/玩家）│
├────────────────────────────┤
│  第3层：装饰层（树/路灯/碎石） │
├────────────────────────────┤
│  第2层：建筑层（可进入/背景）  │
├────────────────────────────┤
│  第1层：地形层（地面/水面）    │  ← 最底层
├────────────────────────────┤
│  第0层：碰撞层（不可见）      │  ← 逻辑层
└────────────────────────────┘
```

### 2.4 地形类型定义

```javascript
// 地形瓦片枚举
const TERRAIN = {
  GRASS:       0,   // 草地（可通行，深绿色）
  DIRT:        1,   // 泥土路（可通行，棕色）
  ASPHALT:     2,   // 柏油路（可通行，深灰色）
  CONCRETE:    3,   // 水泥地（可通行，浅灰色）
  GRAVEL:      4,   // 碎石地（可通行，灰棕色）
  WOOD_FLOOR:  5,   // 木地板（可通行，室内）
  TILE_FLOOR:  6,   // 瓷砖地（可通行，室内）
  WATER:       10,  // 水域（不可通行，灰绿色）
  DEEP_WATER:  11,  // 深水/江水（不可通行，暗绿色）
  WALL:        20,  // 墙壁（不可通行，碰撞体）
  RUBBLE:      21,  // 废墟堆（不可通行）
  CLIFF:       22,  // 悬崖/高差（不可通行）
  BUILDING:    30,  // 建筑物外墙（不可通行）
  BRIDGE:      40,  // 桥面（可通行，石灰色）
  STAIRS_UP:   50,  // 上楼梯（切换楼层）
  STAIRS_DOWN: 51,  // 下楼梯（切换楼层/地下）
  DOOR:        60,  // 门（可交互，进入建筑内部）
};
```

### 2.5 建筑系统

建筑分为两类：

#### A. 背景建筑（不可进入）
- 用深色矩形 + 窗户细节绘制的建筑轮廓
- 作为地图边界的自然屏障
- 例如：远处摩天大楼废墟、坍塌的商场

#### B. 可进入建筑
玩家走到门口按 E 键进入，切换到**建筑内部场景**：

| 建筑 | 外部位置 | 内部场景 | 内容 |
|------|---------|---------|------|
| 冷冻中心 | 地图北端 | 800×600 室内 | 起始点、冷冻仓、更衣室、终端机 |
| 废弃便利店 | 主干道旁 | 400×300 室内 | 可搜刮道具（旧书页、温水杯） |
| 废弃民居A | 居民区 | 500×400 室内 | 散落的诗词碎片、旧书 |
| 废弃民居B | 居民区 | 500×400 室内 | 被梗鬼占据的小型战斗空间 |
| 旧地铁站入口 | 主干道南 | 地下场景 1000×800 | 通往地下巷道的入口 |
| 体育馆 | 江堤南 | 2000×2000 室内迷宫 | 茧房Boss战 |
| 数据中心 | 最南端 | 1200×1200 深渊 | 最终Boss战 |

### 2.6 各区域详细地形设计

#### 区域1：冷冻中心（室内起始点）
```
┌────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓                                   ▓▓ │
│ ▓▓  [冷冻仓1] [冷冻仓2] [冷冻仓3]    ▓▓ │
│ ▓▓     (空)     (空)    [顾言醒来]    ▓▓ │
│ ▓▓                                   ▓▓ │
│ ▓▓  ┌──更衣室──┐    ┌──终端机──┐    ▓▓ │
│ ▓▓  │ 储物柜   │    │ 日志碎片  │    ▓▓ │
│ ▓▓  └────┬─────┘    └──────────┘    ▓▓ │
│ ▓▓       │                           ▓▓ │
│ ▓▓       └────────── 通道 ────────── ▓▓ │
│ ▓▓                                   ▓▓ │
│ ▓▓                          ┌──门──┐ ▓▓ │
│ ▓▓                          │ 出口 │ ▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓└─────┘ ▓▓ │
└────────────────────────────────────────────┘
```

#### 区域2：废弃街道（户外 · 不规则形状）
```
                          北
    ┌──────────────────────────────────────────┐
    │  🏢摩天楼废墟(背景)                        │
    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │                                          │
    │  ╔══════════════════════════════╗        │
    │  ║    废弃主干道 (柏油路)        ║        │
    │  ║  ┌─便利店─┐    [失语者A]    ║        │
    │  ║  │可进入 │    [失语者B]    ║        │
    │  ║  └───────┘                 ║        │
    │  ║      🌿杂草🌿     🌿杂草🌿  ║        │
    │  ╚══════════╤═════════════════╝        │
    │             │ 泥土小路                    │
    │     ┌───────┴───────┐                   │
    │     │  废弃车辆      │                   │
    │     │  🚗 (残骸)     │                   │
    │     └───────┬───────┘                   │
    │             │                             │
    │   ╔═════════╧═══════════════╗            │
    │   ║   旧地铁站入口广场       ║            │
    │   ║  ┌──────────────┐      ║            │
    │   ║  │  ↓ 地铁入口   │      ║            │
    │   ║  │   (通地下)    │      ║            │
    │   ║  └──────────────┘      ║            │
    │   ╚═════════════════════════╝            │
    │              │                             │
    │     ┌────────┴────────┐                   │
    │     │  通往居民区 →    │                   │
    │     └─────────────────┘                   │
    └──────────────────────────────────────────┘
```

#### 区域3：黄浦江江堤（户外 · 水域 + 自然景观）
```
    ╔══════════════════════════════════════════╗
    ║           黄  浦  江  (水域·不可通行)     ║
    ║  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈  ║
    ║  ≈≈≈ 灰色江水  ≈≈≈  垃圾漂浮  ≈≈≈≈≈≈  ║
    ║  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈  ║
    ║  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈  ║
    ╠══════════════════════════════════════════╣  ← 江岸线
    ║  江堤步道 (水泥地)                        ║
    ║  ┌────────────────────────────────────┐  ║
    ║  │ 🌾芦苇丛    🪨要石(存档点)         │  ║
    ║  │                                    │  ║
    ║  │      👴书远(坐在这里)              │  ║
    ║  │                                    │  ║
    ║  │ 🌾芦苇丛          🌾芦苇丛         │  ║
    ║  └────────────────────────────────────┘  ║
    ╠══════════════════════════════════════════╣  ← 江堤边缘
    ║  江堤下方 · 碎石滩                        ║
    ║  ·········· 碎石  ···················   ║
    ║      (通往体育馆方向 →)                   ║
    ╚══════════════════════════════════════════╝
    
    远背景：对岸陆家嘴废墟轮廓（不可到达）
    🏙️🏙️🏙️ (暗色剪影)
```

#### 区域4：废墟居民区（户外 · 窄巷 + 可进入建筑）
```
    ┌──────────────────────────────────────────────┐
    │  居民区入口(来自主干道)                        │
    │  ┌──────────────────────────────────────┐    │
    │  │        居民区中心空地 (泥土)           │    │
    │  │    🪨碎石  🌿枯草  🪨碎石            │    │
    │  │                                      │    │
    │  │  ┌───┐  ┌───┐  ┌───┐  ┌───┐       │    │
    │  │  │民 │  │民 │  │民 │  │民 │       │    │
    │  │  │居 │  │居 │  │居 │  │居 │       │    │
    │  │  │ A │  │ B │  │ C │  │ D │       │    │
    │  │  │可 │  │可 │  │废 │  │可 │       │    │
    │  │  │进 │  │进 │  │墟 │  │进 │       │    │
    │  │  └───┘  └───┘  └───┘  └───┘       │    │
    │  │                                      │    │
    │  │         ┌──废弃花坛──┐                │    │
    │  │         │  🌿枯草    │                │    │
    │  │         └────────────┘                │    │
    │  └──────────────┬───────────────────────┘    │
    │                 │ 窄巷入口                      │
    │         ╔═══════╧═══════════╗                 │
    │         ║    狭窄巷道        ║                 │
    │         ║  ▓▓▓▓   ▓▓▓▓     ║                 │
    │         ║  ▓墙▓   ▓墙▓     ║ ← 两侧高楼废墟    │
    │         ║  ▓▓▓▓   ▓▓▓▓     ║                 │
    │         ║   👻 梗鬼游荡     ║                 │
    │         ║                  ║                 │
    │         ║  ┌──梗鬼巢穴入口─┐ ║                 │
    │         ║  │  ↓ 通往地下  │ ║                 │
    │         ║  └─────────────┘ ║                 │
    │         ╚═══════╤═══════════╝                 │
    │                 │                              │
    │          ┌──────┴──────┐                       │
    │          │  高架桥废墟   │                       │
    │          │  ≡≡断裂≡≡   │                       │
    │          │  (可通行)    │                       │
    │          └──────┬──────┘                       │
    │                 │ 通往江堤/体育馆                │
    └──────────────────────────────────────────────┘
```

#### 区域5：体育馆茧房（室内 · 屏幕迷宫）
```
    ┌────────────────────────────────────────────┐
    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
    │ ▓▓           体育馆内部            ▓▓ │
    │ ▓▓                                ▓▓ │
    │ ▓▓  ┌入口┐                        ▓▓ │
    │ ▓▓  │    │                        ▓▓ │
    │ ▓▓  └────┘                        ▓▓ │
    │ ▓▓                                ▓▓ │
    │ ▓▓  [📺]══[📺]══[📺]══[📺]     ▓▓ │  ← 屏幕墙壁
    │ ▓▓   ║    ║    ║    ║           ▓▓ │
    │ ▓▓  [📺]  [📺]  [📺]  [📺]     ▓▓ │    屏幕会发光
    │ ▓▓   ║    ║    ║    ║           ▓▓ │    吸引玩家
    │ ▓▓  [📺]══[📺]══[📺]══[📺]     ▓▓ │
    │ ▓▓   ║         ║    ║           ▓▓ │
    │ ▓▓  [📺]  ┌────┘    [📺]        ▓▓ │
    │ ▓▓   ║    │          ║           ▓▓ │
    │ ▓▓  [📺]══╧══[📺]══[📺]        ▓▓ │
    │ ▓▓   ║         ║                 ▓▓ │
    │ ▓▓  [📺]    ┌──┴──────────┐      ▓▓ │
    │ ▓▓   ║      │  茧后 Boss  │      ▓▓ │
    │ ▓▓  [📺]    │   👾        │      ▓▓ │
    │ ▓▓          │  (核心区域)  │      ▓▓ │
    │ ▓▓          └─────────────┘      ▓▓ │
    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
    └────────────────────────────────────────────┘
    
    📺 = 发光的屏幕墙（碰撞体，吸引效果）
    屏幕会随玩家位置变换推荐内容
```

#### 区域6：数据中心深处（深渊 · 最终场景）
```
    从体育馆南侧出口进入...
    
    ╔══════════════════════════════════════════╗
    ║          绝 对 黑 暗                     ║
    ║          ·  ·  ·  ·                     ║
    ║     ·   淡蓝色光点飘浮    ·              ║
    ║          ·  ·  ·  ·                     ║
    ║                                         ║
    ║  ┌──────────────────────────────┐       ║
    ║  │       石 桥 (唯一通道)       │       ║
    ║  │  ═══════════════════════    │       ║
    ║  │         (可通行)             │       ║
    ║  └──────────────────────────────┘       ║
    ║                                         ║
    ║  ≈≈≈≈≈ 虚 无 深 渊 ≈≈≈≈≈≈≈≈≈≈≈≈    ║
    ║  ≈≈≈ (不可通行 · 掉落即死) ≈≈≈≈≈≈≈   ║
    ║  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈    ║
    ║                                         ║
    ║               ┌──────────┐              ║
    ║               │ 💙听雨    │              ║
    ║               │ (Sydney) │              ║
    ║               │ 核心     │              ║
    ║               └──────────┘              ║
    ║                                         ║
    ╚══════════════════════════════════════════╝
```

### 2.7 建筑内部场景切换

当玩家走到可进入建筑的门口并按 E 键：
1. 屏幕淡出（黑色过渡，约0.5秒）
2. 加载建筑内部地图
3. 屏幕淡入
4. 玩家出现在建筑内部的入口位置
5. 离开建筑时同理，回到外部地图的建筑门口位置

### 2.8 水域与自然边界

- **江水/河流**：用深灰绿色填充 + 波浪线条纹理，不可通行
- **江岸线**：用不规则曲线分隔水域和陆地
- **芦苇丛**：装饰性植物，玩家可以穿过但会微微减速
- **碎石滩**：江堤下方的过渡地带
- **悬崖/高差**：用深色边缘表示，不可直接通行，需要走楼梯/坡道
- **枯树**：装饰性障碍物，不可通行

### 2.9 世界边界处理

地图边界不是矩形切割，而是用自然元素作为边界：
- 北侧：摩天大楼废墟群（背景建筑，不可通行）
- 东侧：黄浦江延伸（水域，不可通行）
- 南侧：逐渐变暗的荒野（黑色渐变，走到边界会有文字提示"前方一片虚无..."）
- 西侧：坍塌的高架桥和废墟山（不可通行）

玩家在地图边缘会看到画面逐渐变暗或遇到自然障碍物，而不是生硬的矩形边界。

---

## 3. 核心玩法系统

### 3.1 角色控制
玩家控制一个约 16×20 像素的小人角色（简单像素风），在大地图上自由移动。

- **移动**：WASD / 方向键控制上下左右移动
- **奔跑**：按住 Shift 键加速移动
- **冲刺闪避**：空格键向当前移动方向冲刺一小段距离，短暂无敌（0.3秒），有冷却时间（1.5秒）
- **交互**：E键 / 鼠标点击与 NPC 对话、捡拾物品、调查物体
- **攻击/净化**：战斗中选择「战斗」后可按 E / 空格完成攻击瞄准；选择「诗词」消耗碎片释放净化波

### 3.2 探索系统

#### 小地图
- 屏幕右上角显示小地图，标记已探索区域
- 重要位置有图标标记：要石位置、NPC位置、当前目标

#### 可交互物体
| 物体 | 交互效果 |
|------|---------|
| 金色汉字碎片（地面） | 收集到诗词槽中 |
| 旧书页 | 恢复 SAN 值 30 点 |
| 温水杯 | 提供 3 秒无敌护盾 |
| 要石（石碑） | 刻字记录，存档点 |
| 损坏的终端机 | 查看世界观日志碎片 |
| NPC（书远等） | 触发对话/剧情 |
| 发绿光的门/入口 | 进入下一区域 |

#### 迷雾与探索
- 未探索的地图区域被灰色迷雾覆盖
- 玩家走近时迷雾消散，已探索区域保持可见
- 鼓励玩家探索每一个角落

### 3.3 战斗系统（实时大世界战斗）

与原来"进入独立战斗画面"不同，现在战斗直接在 **大地图上实时进行**。

#### 梗鬼 AI 行为
梗鬼在世界中游荡，有自己的感知范围：

```
状态机：
  闲置(Idle) → 巡逻(Patrol) → 发现玩家(Alert) → 攻击(Attack) → 被击败/逃跑
```

- **闲置**：原地浮动，偶尔吐出几个无意义的词
- **巡逻**：在固定路线上缓慢移动
- **发现玩家**：玩家进入感知范围（约150像素），梗鬼变色变亮，发出警告音效
- **攻击**：
  - 向玩家方向发射绿色"烂梗弹幕"（如"YYDS""绝绝子"）
  - 弹幕有多种模式：直线弹、追踪弹、扇形散射、环形扩散
  - 被弹幕击中扣除 SAN 值
- **被击败**：SAN 值归零后，梗鬼爆炸消散，掉落汉字碎片和道具

#### 玩家战斗能力
- **诗词净化波（战斗菜单「诗词」）**：消耗已收集的诗词碎片，释放圆形金色波纹，清除范围内的弹幕并对梗鬼造成伤害
- **大声朗读（K键）**：消耗 SAN 值，释放持续范围减速光环，周围弹幕速度降低 50%，持续 3 秒
- **刻刀近战（靠近自动）**：极度靠近梗鬼时，自动用小刻刀攻击，伤害低但有击退效果

#### 诗词收集与连击
- 击败梗鬼后掉落金色汉字碎片
- 屏幕底部显示当前诗词进度条，例如：
  ```
  [落][霞][与][孤][鹜] ← 已收集 → 还需收集: [齐][飞]
  进度: ████████░░░░░░░░ 5/7
  ```
- 集齐完整诗句后，可释放 **诗词大招**：全屏金色光幕，对视野内所有敌人造成巨额伤害

### 3.4 SAN 值系统
- SAN 值 = 玩家生命值 / 理性值
- 被烂梗弹幕击中扣除 SAN 值
- SAN 值低于 30% 时屏幕边缘出现绿色噪点（视觉反馈）
- SAN 值归零 = 游戏结束，从最近的要石（存档点）重新开始
- 在要石附近或使用道具可恢复 SAN 值

### 3.5 道具与背包系统
- 按 I 键打开背包界面
- 背包显示当前持有的道具和诗词碎片
- 可使用道具恢复 SAN 值或获得临时增益

---

## 4. 视觉风格设计

### 4.1 整体风格
- **Canvas 2D 像素风格**：所有图形用 Canvas API 绘制，保持手工绘制的温暖质感
- **俯视角（Top-Down）**：类似经典 2D RPG 的视角
- **色调**：
  - 废墟区域：灰黄、暗红、铁锈色为主调
  - 安全区域：带有暖黄色灯光
  - 污染区域：病态绿色光晕
  - 净化后：金色、暖白

### 4.2 角色设计
- **顾言（玩家）**：约 16×20 像素的简单小人
  - 身体：深灰色连体服
  - 头部：简单圆形，肤色
  - 移动时小人身体微微上下浮动
  - 冲刺时身后留下淡红色残影
- **书远（NPC）**：白发蓝色布衫老人，约 16×22 像素
- **梗鬼（敌人）**：半透明绿色人形轮廓，头部比例夸张，大嘴，约 24×30 像素
- **听雨（Sydney）**：淡蓝色半透明少女轮廓，约 16×24 像素

### 4.3 环境绘制

#### 不规则地形渲染
不使用纯矩形瓦片，而是采用 **多层绘制 + 形状混合**：

**地形绘制流程**：
1. 先绘制大面积底色（如草地）
2. 用 Canvas `bezierCurveTo` / `quadraticCurveTo` 绘制道路的不规则边缘
3. 用半透明渐变在两种地形交界处做柔和过渡
4. 叠加噪点纹理增加废墟质感

```javascript
// 绘制不规则道路
function drawIrregularRoad(ctx, points, width) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 2; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = width;
  ctx.stroke();
}
```

#### 水域渲染
江水/河流使用 **多层动画叠加**：

```javascript
function drawWater(ctx, waterPolygon, time) {
  // 1. 基础水面填充
  ctx.fillStyle = '#4a6a5a';
  ctx.fill(waterPolygon);

  // 2. 波浪线条动画
  ctx.strokeStyle = 'rgba(120,160,140,0.4)';
  ctx.lineWidth = 2;
  for (let y = waterTop; y < waterBottom; y += 30) {
    ctx.beginPath();
    for (let x = waterLeft; x < waterRight; x += 5) {
      const waveY = y + Math.sin((x + time * 0.5) * 0.02) * 8;
      if (x === waterLeft) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }

  // 3. 水面反光
  const gradient = ctx.createLinearGradient(0, waterTop, 0, waterBottom);
  gradient.addColorStop(0, 'rgba(180,200,190,0.15)');
  gradient.addColorStop(0.5, 'rgba(60,90,80,0.3)');
  gradient.addColorStop(1, 'rgba(40,60,50,0.5)');
  ctx.fillStyle = gradient;
  ctx.fill(waterPolygon);
}
```

#### 建筑绘制
建筑分为 **背景建筑** 和 **可进入建筑** 两种绘制方式：

**背景建筑**（不可进入的废墟轮廓）：
- 用深色矩形 + 窗户孔洞 + 破损边缘
- 放置在远景层，颜色更暗，作为地图边界
- 添加裂纹和藤蔓装饰

**可进入建筑**：
- 独立的矩形建筑体，有明确的门口标识
- 门口有微弱的暖光（如果内部有光源）
- 玩家靠近时建筑轮廓高亮，提示可以进入
- 建筑屋顶使用半透明或不同的颜色（区别于地面）

```javascript
function drawBuilding(ctx, building, isNearPlayer) {
  const { x, y, w, h, enterable } = building;

  // 建筑主体
  ctx.fillStyle = enterable ? '#6a5a4a' : '#3a3a3a';
  ctx.fillRect(x, y, w, h);

  // 破损边缘
  ctx.strokeStyle = '#4a3a2a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // 窗户
  const winColor = enterable ? '#888800' : '#222222';  // 可进入的有灯光
  for (let wy = y + 10; wy < y + h - 20; wy += 25) {
    for (let wx = x + 10; wx < x + w - 15; wx += 25) {
      ctx.fillStyle = Math.random() > 0.3 ? winColor : '#111111';
      ctx.fillRect(wx, wy, 10, 12);
    }
  }

  // 门口
  if (enterable) {
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(x + w / 2 - 12, y + h - 30, 24, 30);
    // 靠近时门口发光
    if (isNearPlayer) {
      ctx.fillStyle = 'rgba(255,200,100,0.3)';
      ctx.fillRect(x + w / 2 - 14, y + h - 32, 28, 34);
    }
  }
}
```

#### 自然装饰物
```javascript
// 芦苇丛
function drawReeds(ctx, x, y, count) {
  for (let i = 0; i < count; i++) {
    const rx = x + i * 8 + Math.random() * 4;
    const sway = Math.sin(Date.now() * 0.002 + i) * 3;
    ctx.strokeStyle = '#8a7a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, y);
    ctx.quadraticCurveTo(rx + sway, y - 15, rx + sway * 2, y - 25);
    ctx.stroke();
    // 芦苇穗
    ctx.fillStyle = '#a09060';
    ctx.beginPath();
    ctx.arc(rx + sway * 2, y - 25, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 枯树
function drawDeadTree(ctx, x, y) {
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 40);
  ctx.stroke();
  // 枯枝
  ctx.lineWidth = 2;
  for (const angle of [-0.6, -0.3, 0.4, 0.7]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 25);
    ctx.lineTo(x + Math.cos(angle) * 20, y - 35 - Math.random() * 10);
    ctx.stroke();
  }
}

// 碎石堆
function drawRubble(ctx, x, y, size) {
  ctx.fillStyle = '#6a6a6a';
  for (let i = 0; i < size; i++) {
    const rx = x + (Math.random() - 0.5) * 30;
    const ry = y + (Math.random() - 0.5) * 20;
    ctx.beginPath();
    ctx.arc(rx, ry, 2 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

#### 光照系统
- 玩家周围有一个**圆形光照区域**（径向渐变），半径约 200 像素
- 光照外区域变暗（半透明黑色遮罩）
- 室内场景整体偏暗，灯光区域更集中
- 要石（存档点）周围有温暖的金色光圈
- SAN 值低时，光照范围缩小，边缘出现绿色噪点

### 4.4 特效系统
- **冲刺特效**：红色残影粒子
- **弹幕飞行**：绿色文字带着拖尾光晕
- **诗词净化波**：金色同心圆扩散
- **文字湮灭**：金绿粒子对撞消散
- **大招释放**：全屏金色光幕扫描
- **SAN值低**：屏幕边缘绿色噪点 + 画面微微抖动

---

## 5. 技术架构设计

### 5.1 游戏引擎结构
```
┌────────────────────────────────────────────┐
│              Game Engine                    │
│  ┌──────────────────────────────────────┐  │
│  │     requestAnimationFrame 主循环      │  │
│  └──────────────────────────────────────┘  │
│                    │                        │
│     ┌──────────────┼──────────────┐        │
│     ▼              ▼              ▼        │
│  ┌──────┐    ┌──────────┐   ┌────────┐    │
│  │Input │    │  Update   │   │ Render │    │
│  │Manager│   │  Manager  │   │ Manager│    │
│  └──────┘    └──────────┘   └────────┘    │
│                    │                        │
│     ┌──────────────┼──────────────┐        │
│     ▼              ▼              ▼        │
│  ┌──────┐    ┌──────────┐   ┌────────┐    │
│  │World │    │ Entity   │   │Particle│    │
│  │Map   │    │ Manager  │   │ System │    │
│  └──────┘    └──────────┘   └────────┘    │
│     │              │              │        │
│     ▼              ▼              ▼        │
│  ┌──────┐    ┌──────────┐   ┌────────┐    │
│  │Camera│    │Collision │   │   UI   │    │
│  │System│    │ System   │   │ System │    │
│  └──────┘    └──────────┘   └────────┘    │
└────────────────────────────────────────────┘
```

### 5.2 核心类设计

```javascript
// 玩家类
class Player {
  constructor(x, y) {
    this.x = x;                    // 世界坐标 X
    this.y = y;                    // 世界坐标 Y
    this.width = 16;
    this.height = 20;
    this.speed = 3;                // 移动速度 (像素/帧)
    this.runSpeed = 5;             // 奔跑速度
    this.san = 100;                // 理性值/生命值
    this.maxSan = 100;
    this.direction = 'down';       // 朝向: up/down/left/right
    this.isMoving = false;
    this.isDashing = false;
    this.dashCooldown = 0;
    this.invulnerable = false;
    this.invulnerableTimer = 0;
    this.collectedChars = [];      // 已收集的汉字碎片
    this.inventory = [];           // 道具背包
  }
  
  update(deltaTime, inputState) { /* 移动、状态更新 */ }
  draw(ctx, camera) { /* 绘制小人 */ }
  dash() { /* 冲刺 */ }
  takeDamage(amount) { /* 受伤 */ }
  collectChar(char) { /* 收集汉字 */ }
  useItem(index) { /* 使用道具 */ }
}

// 梗鬼敌人类
class GengGhost {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 30;
    this.level = level;            // 1=低级, 2=中级, 3=Boss
    this.hp = 30 * level;
    this.maxHp = 30 * level;
    this.state = 'idle';           // idle/patrol/alert/attack
    this.detectionRange = 150;
    this.attackCooldown = 0;
    this.bullets = [];             // 弹幕数组
    this.patrolPath = [];          // 巡逻路径点
    this.patrolIndex = 0;
  }
  
  update(deltaTime, player) { /* AI状态机 */ }
  draw(ctx, camera) { /* 绘制梗鬼 */ }
  fireBullet(targetX, targetY, word) { /* 发射烂梗弹幕 */ }
  takeDamage(amount) { /* 受伤 */ }
  dropLoot() { /* 掉落物品 */ }
}

// 世界地图类
class WorldMap {
  constructor() {
    this.regions = [];             // 区域数组
    this.currentRegion = null;
    this.width = 0;               // 当前区域宽度
    this.height = 0;              // 当前区域高度

    // === 不规则地形数据 ===
    this.terrainPolygons = [];    // 地形多边形数组 [{type: 'road', points: [...]}, ...]
    this.waterPolygons = [];      // 水域多边形数组
    this.collisionPolygons = [];  // 碰撞多边形数组 (不规则障碍物)

    // === 建筑 ===
    this.buildings = [];          // 建筑列表 [{x,y,w,h, enterable, interiorId, ...}]
    this.currentBuilding = null;  // 当前进入的建筑 (null=户外)

    // === 实体 ===
    this.entities = [];           // 实体列表(NPC, 敌人, 道具)
    this.decorations = [];        // 装饰物列表 (树、芦苇、碎石等)

    // === 迷雾 ===
    this.fogOfWar = [];           // 战争迷雾 (基于探索范围的位图)

    // === 光照 ===
    this.lightSources = [];       // 光源列表 [{x, y, radius, color, intensity}]
  }

  // 加载区域的不规则地形数据
  loadRegion(regionData) {
    this.width = regionData.width;
    this.height = regionData.height;
    this.terrainPolygons = regionData.terrainPolygons;
    this.waterPolygons = regionData.waterPolygons;
    this.collisionPolygons = regionData.collisionPolygons;
    this.buildings = regionData.buildings;
    this.decorations = regionData.decorations;
    this.lightSources = regionData.lightSources;
  }

  // 碰撞检测：判断某点是否可通行
  isWalkable(x, y, radius = 8) {
    // 1. 检查是否在水域内
    for (const wp of this.waterPolygons) {
      if (isPointInPolygon(x, y, wp.points)) return false;
    }
    // 2. 检查是否在碰撞多边形内
    for (const cp of this.collisionPolygons) {
      if (isPointInPolygon(x, y, cp.points)) return false;
    }
    // 3. 检查是否在建筑范围内
    for (const b of this.buildings) {
      if (x + radius > b.x && x - radius < b.x + b.w &&
          y + radius > b.y && y - radius < b.y + b.h) {
        // 如果是可进入建筑，检查是否在门口区域
        if (b.enterable && isNearDoor(x, y, b)) return true;
        return false;
      }
    }
    // 4. 检查世界边界
    if (x - radius < 0 || x + radius > this.width ||
        y - radius < 0 || y + radius > this.height) return false;
    return true;
  }

  // 获取某位置的地形类型
  getTerrainAt(x, y) {
    for (const tp of this.terrainPolygons) {
      if (isPointInPolygon(x, y, tp.points)) return tp.type;
    }
    return 'grass'; // 默认草地
  }
  
  loadRegion(regionId) { /* 加载区域 */ }
  isWalkable(x, y) { /* 检查可通行 */ }
  getEntitiesInRange(x, y, range) { /* 获取范围内实体 */ }
}

// 相机系统
class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.target = null;           // 跟随目标(玩家)
    this.width = 800;             // 视口宽度
    this.height = 600;            // 视口高度
    this.smoothSpeed = 0.1;       // 平滑跟随系数
  }
  
  follow(target) { /* 平滑跟随 */ }
  worldToScreen(wx, wy) { /* 世界坐标→屏幕坐标 */ }
  screenToWorld(sx, sy) { /* 屏幕坐标→世界坐标 */ }
  isVisible(wx, wy, w, h) { /* 是否在视口内 */ }
}

// 弹幕类
class Bullet {
  constructor(x, y, vx, vy, text, type) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.text = text;              // 弹幕文字 e.g. "YYDS"
    this.type = type;              // 'green'=烂梗, 'gold'=诗词
    this.radius = 12;
    this.lifetime = 300;          // 帧数
    this.trail = [];              // 拖尾粒子
  }
  
  update() { /* 移动、拖尾 */ }
  draw(ctx, camera) { /* 绘制文字弹幕 */ }
}

// 粒子类
class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
  }
  update() { /* 移动、衰减 */ }
  draw(ctx, camera) { /* 绘制 */ }
}

// UI管理器
class UIManager {
  drawHUD(ctx, player) { /* SAN条、诗词进度、小地图 */ }
  drawDialog(ctx, text, speaker) { /* 对话气泡 */ }
  drawInventory(ctx, inventory) { /* 背包界面 */ }
  drawMinimap(ctx, worldMap, player) { /* 小地图 */ }
}
```

### 5.3 游戏主循环
```javascript
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = new Player(/*起始位置*/);
    this.worldMap = new WorldMap();
    this.camera = new Camera();
    this.particleSystem = new ParticleSystem();
    this.uiManager = new UIManager();
    this.inputManager = new InputManager();
    this.gameState = 'exploring'; // exploring/dialog/battle/paused/inventory
    this.lastTime = 0;
  }
  
  gameLoop(timestamp) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    
    // 1. 处理输入
    this.inputManager.update();
    
    // 2. 更新游戏状态
    if (this.gameState === 'exploring' || this.gameState === 'battle') {
      this.player.update(deltaTime, this.inputManager);
      this.worldMap.updateEntities(deltaTime, this.player);
      this.camera.follow(this.player);
      this.particleSystem.update(deltaTime);
    }
    
    // 3. 碰撞检测
    this.checkCollisions();
    
    // 4. 渲染（按图层顺序）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderTerrain();       // 第1层：地形（不规则地面+水域）
    this.renderDecorations();   // 第2层：装饰物（树、芦苇、碎石）
    this.renderBuildings();     // 第3层：建筑
    this.renderEntities();      // 第4层：实体（玩家/NPC/敌人/道具）
    this.renderBullets();       // 第4.5层：弹幕
    this.renderParticles();     // 第5层：粒子特效
    this.renderLighting();      // 第5层：光照叠加
    this.renderFogOfWar();      // 第5层：战争迷雾
    this.uiManager.drawHUD(this.ctx, this.player);
    this.uiManager.drawMinimap(this.ctx, this.worldMap, this.player);
    
    requestAnimationFrame((t) => this.gameLoop(t));
  }
  
  // 渲染不规则地形
  renderTerrain() {
    const ctx = this.ctx;
    const cam = this.camera;
    
    // 1. 先填充大地色（草地）
    ctx.fillStyle = '#4a5a3a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 2. 绘制不规则地形多边形
    for (const tp of this.worldMap.terrainPolygons) {
      if (!cam.isVisiblePolygon(tp.points)) continue;
      ctx.beginPath();
      const p0 = cam.worldToScreen(tp.points[0].x, tp.points[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < tp.points.length; i++) {
        const p = cam.worldToScreen(tp.points[i].x, tp.points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = TERRAIN_COLORS[tp.type];
      ctx.fill();
      // 地形边缘过渡
      if (tp.feather) {
        ctx.strokeStyle = TERRAIN_EDGE_COLORS[tp.type];
        ctx.lineWidth = tp.feather;
        ctx.stroke();
      }
    }
    
    // 3. 绘制水域（动画波浪）
    for (const wp of this.worldMap.waterPolygons) {
      this.drawWaterPolygon(ctx, cam, wp);
    }
  }
  
  // 渲染建筑
  renderBuildings() {
    for (const b of this.worldMap.buildings) {
      const screenPos = this.camera.worldToScreen(b.x, b.y);
      if (!this.camera.isVisible(b.x, b.y, b.w, b.h)) continue;
      const isNearPlayer = this.player.distanceTo(b) < 50;
      drawBuilding(this.ctx, b, isNearPlayer, screenPos);
    }
  }
}
```

---

## 6. 数据流与脚本系统

### 6.1 对话与剧情数据
使用 JSON 格式存储，包含触发条件和位置信息：

```json
{
  "regionId": "street_01",
  "triggerX": 400,
  "triggerY": 300,
  "triggerType": "proximity",
  "triggerRange": 60,
  "condition": "!met_shuyuan",
  "dialog": [
    { "speaker": "顾言", "text": "你好！请问这里发生过什么——" },
    { "speaker": "路人A", "text": "鸡你太美！" },
    ...
  ],
  "onComplete": "startBattle_tutorial"
}
```

### 6.2 关卡/区域配置
```json
{
  "regions": [
    {
      "id": "freeze_center",
      "name": "冷冻中心",
      "width": 800,
      "height": 600,
      "tilemap": "freeze_center.tmj",
      "bgm": "ambient_cold",
      "entities": [...],
      "exits": [
        { "to": "street_01", "x": 750, "y": 300, "direction": "right" }
      ]
    }
  ]
}
```

---

## 7. UI布局

```
┌─────────────────────────────────────────────────────┐
│ [小地图]                                   [SAN条]  │
│  ┌─────────┐                              ████░░   │
│  │         │                              80/100   │
│  └─────────┘                                       │
│                                                     │
│                                                     │
│              ┌──────────────────┐                   │
│              │                  │                   │
│              │   游戏主视口      │                   │
│              │   (800×600)     │                   │
│              │                  │                   │
│              │    小人走动       │                   │
│              │    梗鬼游荡       │                   │
│              │    弹幕飞舞       │                   │
│              │                  │                   │
│              └──────────────────┘                   │
│                                                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 诗词进度: [落][霞][与][孤][鹜]  ← 5/7        │    │
│  │ 当前诗句: 落霞与孤鹜齐飞，秋水共长天一色        │    │
│  │ 道具栏: [旧书页×2] [温水杯×1]                │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 8. 开发计划

### Phase 1: 核心框架
- Canvas 初始化与渲染循环
- 玩家移动控制
- 相机系统
- 基础地图渲染（瓦片地图）

### Phase 2: 世界与探索
- 多区域地图制作
- 碰撞检测
- 战争迷雾
- 区域切换
- 小地图

### Phase 3: 战斗系统
- 梗鬼 AI 状态机
- 弹幕系统
- 玩家受伤与 SAN 值
- 诗词收集与释放
- 粒子特效

### Phase 4: NPC 与剧情
- 对话系统
- 剧情触发
- NPC 行为
- 任务追踪

### Phase 5: 完善
- 道具/背包系统
- 存档系统
- 音效
- Boss 战
- 结局

---

*这是一个完整的 2D 大世界探索游戏设计，保持 Canvas 手绘风格，玩家控制一个小人在废墟世界中自由探索、战斗、收集诗词碎片。*
