# 刻痕 · 遗忘的文字 —— AI 接入说明

在原有纯前端游戏基础上接入了两套 AI：

- **LLM 导演（DeepSeek）**：在关键抉择点动态生成与玩家历程相符的分支；结局处可与良心 AI「听雨」自由打字对话，生成**个性化结局**。
- **流式配音（小米 MiMo TTS）**：每条对白都有语音；播完自动续播下一条；播放中按 `E` 推进则**抢断**当前语音、立即念下一句。
- **语音缓存**：每条台词按 `hash(模型|音色|语气|文本)` 持久缓存到 `cache/tts/`，**生成一次、全员复用**，绝不重复生成。

## 运行

需要 Node（已验证 v24）。在项目根目录：

```bash
node server.js
```

然后浏览器打开 **http://localhost:8080** 。

- 改端口：`PORT=9000 node server.js`
- 密钥放在 `ai_keys.local.json`（已 gitignore，不会提交）。模板见 `ai_keys.example.json`。
  也可用环境变量覆盖：`DEEPSEEK_API_KEY`、`MIMO_API_KEY`。

## 降级

不经 `server.js`、用任意静态服务器（或停掉服务器）打开时，前端探测 `/api/health` 失败会**自动降级**为纯文字 + 静态三结局，即原版体验，不报错、不卡死。

## 接口（同源）

- `GET  /api/health` → `{ ok, ai:{ llm, tts }, sampleRate }`
- `POST /api/llm`    → 转发 DeepSeek（隐藏 key），body 同 OpenAI chat/completions。
- `POST /api/tts`    → body `{ text, voice, style }`；返回连续 PCM16 字节流，头含 `X-Cache: HIT|MISS`、`X-Sample-Rate`。

## 可选：预热语音缓存

让第一个玩家也无需等待生成。先启动服务器，另开一个终端：

```bash
node scripts/prewarm.mjs            # 默认连 http://localhost:8080
PORT=9000 node scripts/prewarm.mjs  # 指定端口
```

它会扫描 `src/game.js` 里的静态台词，逐条请求 `/api/tts` 把音频生成并落盘。

## 调参

- 语速听感不对：改 `ai_keys.local.json` 的 `tts.sampleRate`（默认 24000）。
- 角色语气 / 音色 / 模型路由：改 `src/ai/voices.config.js`。
  每个说话人配置 `{ model, voice, style }`：
  - `model` 可选 `mimo-v2.5-tts`（预置精品音色）、`mimo-v2.5-tts-voicedesign`（文本描述造音色）、`mimo-v2.5-tts-voiceclone`（音频样本复刻）
  - `voice` 预置音色（中文：冰糖/茉莉/苏打/白桦；英文：Mia/Chloe/Milo/Dean；缺省 `mimo_default`）
  - `style` 驱动 TTS 语气/情绪/节奏的 prompt
  `speakers.js` 仅做"按名字取配置 + 回退链"，实际数据全部集中在 `voices.config.js`。
  服务端 `/api/tts` 已支持 `model` 字段；TTS 缓存 key 把 `model` 算进去，
  改 model/voice/style 都不会读到错误的旧音频。
- 是否自动续播：`src/ai/config.js` 的 `AI.autoplay`。

## 游戏系统（v2 新增）

### 存档系统

- **自动存档**：场景切换、要石激活、战斗胜利/宽恕、踩踏击败、通关时自动存入自动槽
- **手动存档**：`F5` 快速存档（自动槽）、`F6` 存档菜单（3 个手动槽位）
- **读档**：`F9` 快速读档（自动槽）、存档菜单内可选择读取
- 序列化：场景/坐标/flags/karma/收集物/击败记录/已激活要石/刻字/难度/探索区域

### 音效系统

- 纯 Web Audio API 合成，零外部音频文件
- 10 首区域 BGM + 16 种 SFX
- `N` 键静音切换

### 视觉特效

- 屏幕震动、全屏闪光、场景过渡、净化波、受伤边缘红光
- SAN 值低于 40% 时绿色噪点 + 边缘扭曲

### 难度系统

- 三档：简单 / 普通 / 困难
- 影响弹幕速度/数量、敌人 HP、SAN 伤害、SAN 上限、宽恕所需调查次数
- 持久化到 localStorage，存档包含难度设置

### 小地图 + 战争迷雾

- 右上角实时迷你地图（`Tab` 切换显示）
- 显示玩家/要石/道具/敌人/NPC/目标
- 未探索区域灰雾覆盖，已探索区域保持可见
- 探索记录按场景持久化到存档

### 背包系统

- `I` 键打开背包面板
- 查看道具、诗词碎片收集进度
- 旧书页可主动使用（恢复 30 点理性）

### 体育馆屏幕墙陷阱

- 靠近屏幕墙时玩家减速 50%
- 持续扣除 SAN（受难度影响）
- SAN 归零时在最近要石复活

### 战斗增强

- Boss 第二阶段（血量<50% 触发，难度提升 + 回合延长）
- 新增 3 种弹幕模式：追踪波浪、墙壁反弹、螺旋连续
- 全流程音效与视觉特效集成

### NPC 游荡行为

- 失语者在原点 40 像素半径内随机游荡
- 已治愈的失语者停止游荡

## 快捷键一览

| 按键 | 功能 |
|------|------|
| `WASD` | 移动 |
| `Shift` | 奔跑 |
| `E` | 交互 / 拾取 / 推进对话 |
| `Space` | 冲刺 / 战斗确认 |
| `J` | 任务面板 / 战斗攻击瞄准 |
| `I` | 背包 |
| `M` | 世界地图 |
| `Tab` | 小地图开关 |
| `F2` | 调试面板（场景传送） |
| `F5` / `F9` | 快速存档 / 读档 |
| `F6` | 存档菜单 |
| `N` | 静音切换 |
