# 墓之语

HTML5 Canvas 2D 废墟探索 RPG。玩家扮演从冷冻仓醒来的**顾言**，在 2147 年的上海废墟中收集汉字、用诗词对抗「梗」污染、唤醒失语者，并追寻良心 AI **Sydney** 与方知远留下的记忆。

## 当前可玩主循环

```text
看见梗化（招牌 / 失语者 / 梗鬼）
  → 捡汉字碎片
  → 靠近目标按 F 补全诗句（净化 / 唤醒）
  → 接触梗鬼进入 UT 弹幕菜单战（攻击 / 调查 / 净化 / 宽恕）
  → 场景与 karma 反馈 → 推门禁、见 NPC、走向多结局
```

- **主线探索**：梦境教学 → 冷冻中心 → 废弃街道 → 江堤（横版）→ 居民区 → 体育馆茧房 → 数据中心。
- **核心操作**：捡字 + **F 补诗** + **弹幕战**；江堤为跳跃 / 挥刀横版关。
- **余烬（可选）**：通关后可进废图书馆等，找回记忆碎片与扩展结局。
- **其它**：要石刻字与存档、难度、小地图、移动端触控、诗词大招 K、AI 对话 / TTS（可降级）。

功能开关见 `src/config.js` 的 `FEATURES`（主线关闭：3D 裂隙、Slash 战、骇入战）。

## 运行方式

需要 Node.js 18+。

```bash
npm install
npm run dev          # Vite + AI/静态服务
npm start            # 仅 Node 服务 → http://localhost:8080
```

兼容入口：`node server.js`。改端口：`PORT=9000 npm start`。

## AI 接入（可选）

同源服务提供 LLM / TTS 代理；无密钥则自动降级为纯文字。

- **叙事导演**：中段关键 NPC（守砚、失语者、茧房等）可生成分支，写入线索/态度/世界史（`StoryState`，可存档）。
- **Sydney 终局**：自由对话 + 快捷句，注入玩家历程与线索，个性化 epilogue；TTS 配音保留。
- 配置：`ai_keys.local.json`（模板 `ai_keys.example.json`）
- 或环境变量：`DEEPSEEK_API_KEY`、`MIMO_API_KEY`
- 接口：`GET /api/health`、`POST /api/llm`、`POST /api/tts`
- 预热 TTS：`node scripts/prewarm.mjs`
- 开关：`src/config.js` → `FEATURES.aiDirector`

## 操作

| 按键 | 功能 |
|------|------|
| `WASD` / 方向键 | 移动；战斗中躲弹幕 / 选菜单 |
| `Shift` | 奔跑 |
| `E` | 交互 / 拾取 / 对话 |
| **`F`** | **补全诗句**（靠近招牌或失语者） |
| `Space` | 对话确认 / 冲刺 / 战斗确认 |
| `Ctrl` | 对话快进 |
| `J` | 江堤横版挥刀 |
| `K` | 诗词大招（需完整诗句） |
| `Q` / `I` / `M` / `Tab` | 任务 / 背包 / 地图 / 小地图 |
| `O` | 设置 |
| `F4` / `F6` / `F9` | 快存 / 存档菜单 / 快读 |
| `N` | 静音 |
| `Esc` | 系统菜单 |

触屏：左侧摇杆 + `E` / `K` / `Space`。

## 流程概览

1. **标题页** → 开始游戏 → **3D 序幕**（`intro_3d.html`）
2. **梦境教学**（`dream_tutorial`）：移动、捡字、弹幕战 → 醒来
3. **冷冻中心**：换衣服 → 出门
4. **街道**：捡「洲」「逑」→ F 净化 / 唤醒 → 江堤
5. **江堤横版**：见守砚 → 居民区
6. **居民区 / 民居**：继续收字与 F 玩法 → 体育馆
7. **茧房**：迷宫、诗屏、Boss → **数据中心** 终局
8. 通关后可选 **余烬** 与 **二周目**；标题页有 **言锋试炼**（无尽）

## 开发命令

```bash
npm run build
npm test
npm run lint
npm run format:check
```

## 项目结构

```text
.
├─ index.html / intro_3d.html
├─ server/                 # 静态服务与 AI 代理
├─ src/
│  ├─ game.js              # 主状态机
│  ├─ scenes.js            # 场景与交互
│  ├─ config.js            # FEATURES / 画布
│  ├─ battle.js            # UT 弹幕菜单战
│  ├─ sidescroll.js        # 江堤横版
│  ├─ systems/             # 交互、引导、补诗、对话、刻字
│  ├─ data/                # 对话、谜题、键位文案
│  ├─ render/              # 渲染
│  └─ ai/                  # LLM / TTS 前端
├─ tests/
├─ docs/                   # 文档（见 docs/README.md）
└─ cache/tts/
```

## 文档

可运行真相以 **`src/` + 本 README** 为准。设计说明与归档见 [`docs/README.md`](docs/README.md)。
