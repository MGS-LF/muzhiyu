// 角色语音配置（统一在此管理）
// 一个文件 = 全部说话人的 { model, voice, style }。
// model 可选：
//   - "mimo-v2.5-tts"          预置精品音色（默认）
//   - "mimo-v2.5-tts-voicedesign" 自然语言描述定制音色
//   - "mimo-v2.5-tts-voiceclone"  音频样本复刻
// voice 可选（mimo-v2.5-tts 预置音色）：
//   中文：冰糖、茉莉、苏打、白桦、mimo_default
//   英文：Mia、Chloe、Milo、Dean
// style = TTS user 消息里的语气 prompt，驱动声音的情感/节奏/音色细节

// -------- 工具：基于预置音色 + prompt 微调 --------
const STYLE = {
  // 旁白用低音男性预置音色（白桦），再压一句让语调更沉
  '系统': {
    model: 'mimo-v2.5-tts',
    voice: '白桦',
    style:
      '低沉、克制、略带沙哑的旁白语气，缓慢而有画面感，像在讲述一段废墟里的往事。' +
      '（冷静、留白、像纪录片解说的低音男声）',
  },

  // 顾言 = 苏打（青年男性），疲惫但清醒
  '顾言': {
    model: 'mimo-v2.5-tts',
    voice: '苏打',
    style:
      '一个沉睡百年刚醒来的青年男人，声音略带沙哑与疲惫，但思路清醒、语气平静克制。' +
      '（青年男性、中低音、像久病初愈的讲述者）',
  },

  // 终端机 = voicedesign 自己造一个金属感女声
  '终端机': {
    model: 'mimo-v2.5-tts-voicedesign',
    voice: 'mimo_default',
    style:
      '一个冰冷、机械、没有情感的合成女声，吐字平直，字与字之间有微小停顿，像 80 年代的语音合成器。' +
      '（无情绪、金属质感的早期 TTS）',
  },

  // 书远 = 白桦（苍老男声），再压 prompt 让它更老
  '书远': {
    model: 'mimo-v2.5-tts',
    voice: '白桦',
    style:
      '一位年过七旬的苍老温厚老者，语速缓慢，字句之间有岁月的重量与一丝悲悯，气息略弱，' +
      '偶尔轻咳。（苍老男声、低沉沙哑、像在风雪里讲了一辈子的故事）',
  },

  // 听雨 = 冰糖（清冷少女），叠加哀伤
  '听雨': {
    model: 'mimo-v2.5-tts',
    voice: '冰糖',
    style:
      '一个清冷、空灵、略带哀伤的少女声音，像信号不稳的全息投影在说话，孤独而通透。' +
      '偶尔有轻微的电波失真感。（少女音、清冷、末尾带一点颤抖与叹息）',
  },

  // 梗鬼 = voicedesign 造一个刺耳、亢奋的失真人声
  '梗鬼': {
    model: 'mimo-v2.5-tts-voicedesign',
    voice: 'mimo_default',
    style:
      '聒噪、刺耳、亢奋而变调的声音，像劣质广告在循环播放，令人不适。' +
      '（尖锐的、过度活跃的失真人声，像被卡住的复读机）',
  },

  // 路边被茧捕获的男人 = Milo（成年男声），压得涣散
  '男人': {
    model: 'mimo-v2.5-tts',
    voice: 'Milo',
    style:
      '一个眼神涣散、喃喃自语、被抽空了神志的成年男人，气若游丝，' +
      '像在梦游中说话，每个字都咬不实。（涣散男声、虚弱、语速极慢）',
  },

  // 失语者 = voicedesign 造空洞机械声
  '失语者': {
    model: 'mimo-v2.5-tts-voicedesign',
    voice: 'mimo_default',
    style:
      '空洞、断续、机械重复单字的声音，像电池快耗尽的劣质玩偶，' +
      '没有完整句子的情感。（空洞、断续、失语般的重复音节）',
  },

  // 手账 = 茉莉（温柔女声），怀旧哽咽
  '手账': {
    model: 'mimo-v2.5-tts',
    voice: '茉莉',
    style:
      '像在轻声读一段泛黄旧字迹，怀旧、温柔、略带哽咽，' +
      '语速缓慢，像在追念很久以前的人。（温柔女声、怀旧、压低略带哭腔）',
  },

  // 路人A/B/C（空壳复读机）= voicedesign 造
  '路人': {
    model: 'mimo-v2.5-tts-voicedesign',
    voice: 'mimo_default',
    style:
      '空洞、麻木、像复读机一样吐出无意义音节的声音，' +
      '没有灵魂，没有情绪起伏。（机械、空洞、麻木的人声复读机）',
  },
};

// -------- 默认兜底（系统旁白用同款） --------
const FALLBACK = {
  model: 'mimo-v2.5-tts',
  voice: '白桦',
  style: '平静、自然的中文叙述语气，吐字清晰。',
};

// 精确 → 前缀/包含 → 兜底
export function speakerVoice(name) {
  const s = (name || '').toString().trim();

  // 1) 精确匹配
  if (STYLE[s]) return { ...STYLE[s] };

  // 2) 前缀/包含匹配
  if (s.startsWith('路人'))  return { ...STYLE['路人'] };
  if (s.includes('失语'))    return { ...STYLE['失语者'] };
  if (s.includes('梗鬼'))    return { ...STYLE['梗鬼'] };

  // 3) 兜底
  return { ...FALLBACK };
}

// 给 server.js / prewarm 用：列出全部会出现在请求里的 (model, voice) 组合
export function listAllVoices() {
  const set = new Map();
  for (const k of Object.keys(STYLE)) {
    const v = STYLE[k];
    set.set(`${v.model}::${v.voice}`, { model: v.model, voice: v.voice, style: v.style });
  }
  return [...set.values()];
}
