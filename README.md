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

它会扫描 `js/game.js` 里的静态台词，逐条请求 `/api/tts` 把音频生成并落盘。

## 调参

- 语速听感不对：改 `ai_keys.local.json` 的 `tts.sampleRate`（默认 24000）。
- 角色语气 / 音色 / 模型路由：改 `js/ai/voices.config.js`。
  每个说话人配置 `{ model, voice, style }`：
  - `model` 可选 `mimo-v2.5-tts`（预置精品音色）、`mimo-v2.5-tts-voicedesign`（文本描述造音色）、`mimo-v2.5-tts-voiceclone`（音频样本复刻）
  - `voice` 预置音色（中文：冰糖/茉莉/苏打/白桦；英文：Mia/Chloe/Milo/Dean；缺省 `mimo_default`）
  - `style` 驱动 TTS 语气/情绪/节奏的 prompt
  `speakers.js` 仅做"按名字取配置 + 回退链"，实际数据全部集中在 `voices.config.js`。
  服务端 `/api/tts` 已支持 `model` 字段；TTS 缓存 key 把 `model` 算进去，
  改 model/voice/style 都不会读到错误的旧音频。
- 是否自动续播：`js/ai/config.js` 的 `AI.autoplay`。
