# 《墓之语》前端 UI 优化方案

> 文档定位：可落地的 UI 美化与易用性改造方案，覆盖现有痛点、优化策略、交互体验提升与效果评估。
> 适用范围：游戏内 Canvas 2D 即时 UI（`src/render/panels.js`、`hud.js`、`dialog.js`、`battle.js`）、DOM 注入 UI（`src/start_menu.js`、`index.html` 的 `#bootLoader`）、HUD 与 `showHint` 提示系统。
> 设计基调：保留现有"废墟暖金 + 玄黑"美术风格（`#e8dcc8` 米白墨色 / `rgba(212,168,90,…)` 金 / `#d04040` 警示红），不改动玩法、代码结构与世界渲染。

---

## 〇、现状架构速览（便于决策）

| 模块 | 渲染方式 | 当前问题权重 |
| --- | --- | --- |
| 开始菜单 / 关于 / 存档选择 | DOM + 注入 `<style>` | 已较完善，仅移动端细调 |
| 启动加载页 `#bootLoader` | DOM + CSS | 假进度，无真实加载反馈 |
| 任务 / 地图 / 背包 / 设置 / 存档菜单 | **Canvas 2D 即时绘制** | 高：色彩硬编码、布局魔法数字、含崩溃 Bug |
| HUD（理性条 / 碎片 / 目标 / 场景信息 / 火苗） | **Canvas 2D 即时绘制** | 中：信息密度高、无过渡、无响应式 |
| 对话框 / 选项 | **Canvas 2D 即时绘制** | 中：字体/对比不一致 |
| `showHint` 提示 toast | Canvas 队列（`game.js:1822`） | 中：无分级、互相覆盖、无无障碍 |

---

## 一、现有 UI 痛点分析

### 1.1 布局问题
- **两套调色板割裂**：`config.js` 的 `COLORS`（用于世界渲染）与 UI 面板各自写死颜色。对话框描边 `rgba(180,140,80,0.7)`、HUD 描边 `rgba(200,160,90,0.55)`、存档菜单 `#3a3d44`、DOM 菜单 `rgba(212,168,90,…)`——同一"金"有 4 种写法，风格难统一。
- **固定虚拟分辨率，零响应式**：所有 Canvas UI 写死在 1200×760 坐标系（`config.js:17`）。大屏被 CSS 拉伸发虚；竖屏/手机完全未适配。DOM 菜单虽有 `@media (max-width:720px)`，但 Canvas 内内容无对应重排。
- **HUD 信息密度过高**：左上理性条 + 碎片进度 + 顶部中央目标条 + 右上场景信息 + 火苗 + 底部快捷键，同时存在且缺乏分组留白，边缘元素易与游戏世界重叠（已用 `miniH` 下移避开小地图，但拥挤未根治）。
- ** panels 布局靠魔法数字**：`px+30`、`py+58`、`yy+=18` 散布，无 4/8 间距体系；各面板内边距不一（任务 30 / 设置 34 / 背包 ~28）。

### 1.2 交互问题
- **设置面板致命 Bug（优先级最高）**：`panels.js` 第 291–295 行 `notes` 数组被注释，但第 299 行 `for (const note of notes)` 仍引用 → 按 `O` 打开设置面板即抛 `ReferenceError: notes is not defined`，面板渲染崩溃、游戏卡死。
- **加载/等待无指示**：`Level3D` 用 `await import('./level3d.js')`（`game.js:471`）、Sydney/导演用 `await llm.chat`（`systems/dialog.js:111`，期间世界被冻结注释"冻结世界"），但无任何"加载中 / 思考中"视觉反馈，玩家按键像无响应。
- **数值变化无过渡**：HUD 理性条、碎片格、"完成"徽章都是瞬时跳变，无缓动，弱化了反馈感。

### 1.3 视觉层次与排版
- **字体栈混乱**：UI 内 `serif`、`"SimSun","Songti SC",serif`、`monospace`（debug）混用；字号按 px 硬编码，无排版比例（标题/正文/辅助/微）。
- **对比度不足（默认态）**：对话框默认 `rgba(0,0,0,0.5)` 半透明、文字 `rgba(232,220,200,0.95)`，暗场景下层次偏平；虽有 `highContrast` 开关，但默认未开且不少面板未消费它。
- **无统一圆角/描边/阴影语言**：圆角有 3/4/5 多种，描边粗细 1/1.5/2 混用，缺乏可复用面板骨架函数。

### 1.4 异常反馈与无障碍
- **错误提示不统一**：DOM 侧存档失败有粉色 `.start-menu__error`；游戏内异常（如 3D 加载失败）仅 `showHint` 一行普通文字，无醒目样式、无重试入口。
- **`showHint` 队列缺陷**：`hints` 数组 push + 2.5s 消失（`game.js:1823`），多次连发会互相覆盖，长文本（日记集齐提示）可能溢出，无 info/success/warn/danger 分级。
- **无障碍缺位**：`colorblind` 开关仅存 flag，UI 几乎未消费；canvas 文本对屏幕阅读器不可见；未对接 `prefers-reduced-motion`（reducedFx 为手动开关）。

---

## 二、具体优化策略

### 2.1 色彩搭配——建立统一设计令牌（Design Tokens）
新增 `src/ui/tokens.js`（Canvas 与 DOM 共用同一语义色），把散落的硬编码收敛为语义变量：

```js
// src/ui/tokens.js
export const UI = {
  // 语义色（Canvas 用 rgba 字符串，DOM 用 CSS 变量镜像）
  ink:        'rgba(232,220,200,0.95)',  // 主文字 米白墨
  inkSoft:    'rgba(232,220,200,0.62)',  // 次级文字
  inkFaint:   'rgba(180,170,150,0.5)',   // 辅助/提示
  gold:       'rgba(212,168,90,0.92)',   // 主题金（统一旧 4 种写法）
  goldBright: 'rgba(255,222,142,0.95)',
  goldSoft:   'rgba(212,168,90,0.14)',   // 选中/高亮底
  panelBg:    'rgba(12,11,9,0.95)',      // 面板底（取代 20,18,28 / 1a1d22 混用）
  panelLine:  'rgba(212,168,90,0.42)',   // 面板描边（统一）
  ok:         'rgba(120,200,140,0.9)',
  warn:       'rgba(224,184,80,0.95)',
  danger:     'rgba(224,64,64,0.95)',
  dangerSoft: 'rgba(224,64,64,0.12)',
};
// DOM 镜像：start_menu.js 的 ensureStyle 顶部注入同值 CSS 变量 --gold / --ink …
```
- **色盲辅助落地**：`colorblind` 开启时，战斗/门禁提示把"红绿依赖"改为"蓝黄 + 形状（▲/●）"双编码（复用 HUD 火苗的冷暖逻辑）。
- **对比度**：默认对话框底色由 `0.5` 提到 `0.72`，文字提到 `1.0`；`highContrast` 维持纯黑底 + 全亮金。

### 2.2 字体排版——单一字体栈 + 字号比例
```js
export const TYPE = {
  font: "'SimSun','Songti SC','Noto Serif SC',serif", // 取代 serif/乱序
  tTitle:  'bold 20px', tHead: 'bold 16px', tBody: '14px',
  tSmall:  '12px', tMicro: '11px',
};
```
- debug 面板保留 `monospace` 但单独常量 `fontMono`，不混进主字号体系。
- 所有 `ctx.font` 改为 `${TYPE.tBody} ${TYPE.font}` 形式，杜绝散串。

### 2.3 组件间距与面板骨架
- 建立间距尺度 `SPACE = { x1:4, x2:8, x3:12, x4:16, x6:24 }`。
- 新增复用骨架，统一圆角（固定 6）、描边（固定 1.5）、标题写法：
```js
// src/ui/frame.js
export function panelFrame(ctx, x, y, w, h, { title }) {
  ctx.fillStyle = UI.panelBg; roundRect(ctx, x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = UI.panelLine; ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 6); ctx.stroke();
  if (title) { /* 统一顶部金线 + 居中标题 */ }
}
```
- 各面板改用 `panelFrame`，内边距统一为 `SPACE.x6`，行高统一 `rowH`。

### 2.4 响应式适配
- **缩放因子**：以 `s = Math.min(W, H) / 760` 为基准，字号、间距、控件尺寸统一乘 `s`，使 UI 在大屏/小屏等比缩放不破版。
- **竖屏/小屏重排**：当 `H > W`（竖屏）时，把"右上场景信息面板"与"火苗"下移到底部状态条，HUD 顶部仅留理性条 + 碎片，避免横向拥挤。
- **DOM 镜像**：`#wrap` 已用 `aspect-ratio:30/19`，为 canvas 包裹层加 `role="application"` + `aria-label`，并在窄屏降低 `#hint` 字号。

---

## 三、交互体验提升建议

### 3.1 加载状态（真实进度 + 思考指示）
- **启动加载**：`#bootLoader` 的假进度条改为真实进度——`main.js` 用 `Promise.all([import 核心模块, 音频上下文解锁, 首场景预载])`，按完成比例驱动 `#bootProgressFill` 宽度；完成后才淡出。
- **动态模块/AI 等待**：`Level3D` 的 `await import` 与 LLM `await chat` 期间，调用统一 `game.setOverlay('loading'|'thinking')`，在屏幕中央显示金圈 spinner + 文案（"展开维度裂隙…" / "Sydney 正在思考…"），结束后自动清除。避免"世界冻结却无反馈"。

### 3.2 微交互
- **数值缓动**：HUD 理性条 / 弹药数用 `displaySan = lerp(displaySan, san, 0.15)` 平滑过渡；变化时叠加一次颜色脉冲（绿/黄/红闪 200ms）。
- **选择项呼吸高亮**：canvas 选中行底色用 `sin(t)` 轻微明暗呼吸（复用 map 节点脉冲写法），替代静态 `0.14` 填充。
- **按钮反馈**：DOM 按钮已有 `:active translateY(1px)`，补充 `:focus-visible` 金色描边（已部分实现）；canvas 内"使用/确认"按钮加按下缩放 0.97 反馈。
- **入场动画**：面板打开时整体做 120ms 淡入 + 4px 上移（`alpha`/`offsetY` 由 gameTime 驱动），关闭反向。

### 3.3 异常反馈机制
- **统一错误样式**：新增 `game.toast(msg, 'danger')` 封装，错误用 `danger` 红底 + ⚠ 图标 + 可选"重试"按钮（如 3D 加载失败可重新 import）。替换散落的 `showHint('…加载失败')`。
- **`showHint` 分级队列重构**：
  - 分级：`info` / `success`(金绿) / `warn`(黄) / `danger`(红)，左色条区分；
  - 队列：最多叠 3 条，新提示淡入、旧提示上移，互不覆盖；
  - 时长按级别（info 2.5s / warn 3.5s / danger 5s）；
  - 无障碍：用 DOM `aria-live="polite"` 镜像关键提示（成功/失败），使读屏可感知。

### 3.4 对话与可读性
- 对话"思考中"显示省略号动画；长台词按 `wrapText` 已处理，补充行高统一为 `SPACE.x4`。
- 选项菜单与对话框间距规范化，选中和未选中用 `gold` 描边粗细区分。

---

## 四、优化后预期效果评估标准

### 4.1 量化指标
| 指标 | 现状 | 目标 |
| --- | --- | --- |
| 设置面板崩溃率 | 100%（O 键必崩） | **0**（修 notes Bug） |
| 首屏可交互时间 | 假进度 2.6s | 真实进度 ≤ 2.5s，且进度可信 |
| 动态加载无反馈时段 | 0 指示 | 100% 覆盖（spinner 显示率 100%） |
| 文本对比度（默认态） | ~4.0:1 | ≥ 7:1（WCAG AAA 段落文字） |
| 窄屏（≤720px）UI 破版 | 未适配 | 0 处横向溢出 |
| `showHint` 覆盖丢失率 | 连发即丢 | 0（队列化） |

### 4.2 主观/体验指标
- 视觉一致性：三套调色板收敛为 1 套语义令牌，盲测下主菜单与游戏内面板"像同一款游戏"。
- 反馈可感知：理性增减、加载、错误均有明确视觉/动效回应，玩家"知道系统在干什么"。
- 易上手：新玩家无需查攻略即可看懂 HUD 分组与提示分级。

---

## 五、落地实施步骤（里程碑）

### M1 · 紧急修复 + 令牌地基（约 0.5 天）
1. **[P0] 修 `panels.js` `notes` Bug**：恢复 `notes` 数组（或改为 `drawSettingsPanel` 内联常量），消除设置面板崩溃。
2. 新增 `src/ui/tokens.js`（色彩 + 字体 + 间距 + 面板骨架 `panelFrame`）。
3. DOM `start_menu.js` 注入同名 CSS 变量，与 Canvas 令牌对齐。

### M2 · 排版 / 间距 / 响应式（约 1 天）
4. 全量替换 `panels.js`/`hud.js`/`dialog.js` 硬编码色与字体为 `UI`/`TYPE` 常量。
5. 用 `panelFrame` 统一五个面板外框；行高/内边距接入 `SPACE`。
6. 引入缩放因子 `s` 与竖屏重排分支。

### M3 · 微交互 + 加载态 + 异常反馈（约 1 天）
7. `setOverlay('loading'|'thinking')` + bootLoader 真实进度。
8. HUD 数值 `lerp` 缓动 + 颜色脉冲；选中项呼吸高亮；面板入场动画。
9. `toast()` 分级 + `showHint` 队列化 + `aria-live` 镜像。

### M4 · 无障碍与收尾（约 0.5 天）
10. `colorblind` 双编码（蓝黄 + 形状）在战斗/门禁落地。
11. `prefers-reduced-motion` 对接 reducedFx；DOM 包裹层 `aria-label`。
12. 回归测试：O 设置、M 地图、I 背包、Q 任务、F6 存档、3D 入口、AI 对话等待。

> 实施原则：每个里程碑结束即手动走查上述"量化指标"表，确保不引入新回归。改动仅限 UI 层（`src/ui/*`、`src/render/panels|hud|dialog|battle.js`、`start_menu.js`、`index.html` 样式），不触及玩法/世界渲染逻辑。
