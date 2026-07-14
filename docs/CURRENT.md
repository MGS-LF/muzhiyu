# 墓之语 · 当前实现总览

> 对应代码主干：`main`（拉取后以本地 HEAD 为准）  
> 目的：一页说清「现在能玩什么」，避免旧文档误导。

## 1. 一句话

在 2147 上海废墟里，用**汉字与诗词**对抗失语与梗污染：捡字、**F 补诗**、**三种随机战斗**、**慈悲/残忍**选择，走向多结局；通关后可选「余烬」。

## 2. 功能开关（`src/config.js`）

| Flag | 默认 | 说明 |
|------|------|------|
| `utterance` | **开** | F 键补空净化招牌 / 唤醒失语者 |
| `battleRoll` | **开** | 每次开战在 UT / 斩击 / 骇入 中随机 |
| `slashBattle` | **开** | 斩击·言锋对决参与随机 |
| `hacking` | **开** | 骇入·逻辑空间参与随机 |
| `sidescrollLong` | **开** | 江堤横版 |
| `aiDirector` | **开** | 叙事导演 |
| `level3d` | **关** | 维度裂隙 3D 主线关闭 |

`enemy.forceCombat` / `enemy.combat` 可强制指定模式（`ut`/`slash`/`hack`）。

## 3. 战斗

| 模式 | 操作要点 |
|------|----------|
| UT 弹幕菜单 | 选菜单、躲弹幕、K 大招 |
| 斩击·言锋 | WASD、发射汉字顶回烂梗 |
| 骇入·逻辑 | 逻辑空间射击/躲避 |

消灭 → **残忍**；净化/宽恕/救助 → **慈悲**（右上角常显）。LLM 对话选项也可改这两个值。

## 4. 场景与进度

```text
标题 → 3D 序幕(intro_3d)
  → dream_tutorial（墙字引导 + 三战 + 要石 + 慈悲/残忍）
  → freeze_center
  → street_01 ──→ subway ──→ subway_depth
  → riverside（横版）→ alley_district ── house_a / house_b
  → stadium → data_center（主线终局）
  → ruined_library → network_nexus → memory_abyss（余烬）
  → lost_village
```

## 5. 系统对照

| 系统 | 关键代码 | 状态 |
|------|----------|------|
| 探索 / 目标箭头 | `game.js` | 活跃 |
| F 补诗 | `systems/utterance*.js` | 活跃 |
| 三模式随机战 | `game.startBattle` + battle/slash/hacking | 活跃 |
| 江堤横版 | `sidescroll.js` | 活跃 |
| 梦境引导 | `systems/onboarding.js` | 活跃（未完成留言 + 三重回声） |
| 要石 / 刻字 | interact + engrave | 活跃 |
| 设置·音频倍速 | settings.playbackRate | 活跃 |
| AI 导演 / Sydney / TTS | `ai/*` + server | 可选降级 |

## 6. 新手引导

1. 序幕结束 → `beginDreamOnboarding()`  
2. 追寻残缺广播，拾取「言」「语」并补全留言  
3. 依次完成弹幕、言锋、骇入三种回声形态  
4. 选择补全或击碎回声；激活要石后从金色裂隙醒来  
5. LLM 在线时生成选择、要石与苏醒回响；不可用时使用静态剧情  
4. 教学 karma 结束后恢复，习惯与理解留下  

## 7. AI 叙事

见 `src/ai/story.js`、`director.js`：线索/态度/世界史 + Sydney 终局。

## 8. 文档边界

可运行真相以 **`src/` + 根 README** 为准。
