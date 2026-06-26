// 说话人 → 语音音色 + 语气指令（TTS 的 messages[0].content 即语气）
// 目前仅确认音色 "Chloe"，主要靠语气 prompt 区分角色；若有更多音色在此改 voice。

const DEFAULT_VOICE = 'Chloe';

// 精确匹配优先，其次前缀/包含匹配
const STYLES = {
  '系统': '低沉、克制、略带沙哑的旁白语气，缓慢而有画面感，像在讲述一段废墟里的往事。',
  '顾言': '一个沉睡百年刚醒来的男人，声音略带沙哑与疲惫，但思路清醒、语气平静克制。',
  '终端机': '冰冷、机械的合成女声，吐字平直、字与字之间有轻微停顿，没有情绪。',
  '书远': '一位苍老温厚的老者，语速缓慢，字句之间有岁月的重量与一丝悲悯。',
  '听雨': '一个清冷、空灵、略带哀伤的少女声音，像信号不稳的全息影像，孤独而通透。',
  '梗鬼': '聒噪、刺耳、亢奋而变调的声音，像劣质广告在循环播放，令人不适。',
  '男人': '涣散、喃喃自语、被抽空了神志的声音，气若游丝。',
  '失语者': '空洞、断续、机械重复单字的声音，没有完整句子的情感。',
  '手账': '像在轻声读一段泛黄旧字迹，怀旧、温柔、略带哽咽。',
  '路人': '空洞、麻木、像复读机一样吐出无意义音节，没有灵魂。',
};

// 默认旁白/物件
const FALLBACK = '平静、自然的中文叙述语气，吐字清晰。';

export function speakerStyle(name) {
  const s = (name || '').toString().trim();
  let style = STYLES[s];
  if (!style) {
    // 前缀/包含匹配（路人A/路人B、失语者…）
    if (s.startsWith('路人')) style = STYLES['路人'];
    else if (s.includes('失语')) style = STYLES['失语者'];
    else if (s.includes('梗鬼')) style = STYLES['梗鬼'];
  }
  return { voice: DEFAULT_VOICE, style: style || FALLBACK };
}
