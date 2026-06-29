// 音效系统 —— Web Audio API 纯合成，零外部资源依赖
// 分两类：BGM（区域氛围曲，循环）+ SFX（一次性短音效）
// 设计原则：所有声音用 OscillatorNode + GainNode + 滤波器实时合成，不加载任何音频文件
// 降级：AudioContext 创建失败或用户未交互前，所有接口静默返回，不抛错

let ctx = null;
let masterGain = null;
let bgmGain = null;
let sfxGain = null;
let currentBGM = null; // 当前 BGM 的节点集合 { oscs, gain, stop }
let currentBgmId = null;
let muted = false;
let bgmVolume = 0.25;
let sfxVolume = 0.35;

// 延迟初始化（浏览器要求用户交互后才能创建 AudioContext）
function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = bgmVolume;
    bgmGain.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(masterGain);
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

// 用户首次交互时调用（解封音频）
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(m) {
  muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : 1;
}
export function isMuted() { return muted; }
export function setBgmVolume(v) { bgmVolume = v; if (bgmGain) bgmGain.gain.value = v; }
export function setSfxVolume(v) { sfxVolume = v; if (sfxGain) sfxGain.gain.value = v; }

// ---------- SFX 合成 ----------
// 通用单音：频率/时长/波形/包络
function tone(freq, dur, type = 'sine', vol = 1, attack = 0.005, release = 0.05) {
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t);
  osc.stop(t + dur + release);
}

// 频率扫描（用于滑音效果）
function toneSweep(f1, f2, dur, type = 'sine', vol = 1) {
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f1, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// 噪声脉冲（用于打击/爆炸）
function noiseBurst(dur, vol = 1, filterFreq = 2000, filterType = 'lowpass') {
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const bufferSize = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxGain);
  src.start(t);
}

// SFX 字典
const SFX = {
  pickup: () => { tone(660, 0.08, 'triangle', 0.5); setTimeout(() => tone(880, 0.1, 'triangle', 0.4), 60); },
  ui: () => tone(440, 0.05, 'square', 0.2),
  uiConfirm: () => { tone(523, 0.06, 'square', 0.25); setTimeout(() => tone(784, 0.08, 'square', 0.25), 50); },
  uiCancel: () => tone(300, 0.08, 'square', 0.2),
  hit: () => { noiseBurst(0.12, 0.6, 800); toneSweep(220, 80, 0.15, 'sawtooth', 0.3); },
  hurt: () => { toneSweep(400, 100, 0.2, 'sawtooth', 0.5); noiseBurst(0.08, 0.3, 500); },
  dash: () => toneSweep(800, 200, 0.15, 'sine', 0.3),
  purify: () => {
    tone(523, 0.15, 'sine', 0.3);
    setTimeout(() => tone(659, 0.15, 'sine', 0.3), 80);
    setTimeout(() => tone(784, 0.3, 'sine', 0.35), 160);
  },
  bulletHit: () => tone(200, 0.05, 'square', 0.15),
  footstep: () => tone(80 + Math.random() * 20, 0.04, 'sine', 0.08),
  save: () => { tone(523, 0.08, 'sine', 0.3); setTimeout(() => tone(659, 0.08, 'sine', 0.3), 70); setTimeout(() => tone(880, 0.12, 'sine', 0.3), 140); },
  load: () => { tone(880, 0.08, 'sine', 0.3); setTimeout(() => tone(659, 0.08, 'sine', 0.3), 70); setTimeout(() => tone(523, 0.12, 'sine', 0.3), 140); },
  death: () => { toneSweep(300, 50, 0.6, 'sawtooth', 0.4); noiseBurst(0.3, 0.3, 300); },
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.3), i * 100));
  },
  spare: () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.25), i * 120));
  },
  gate: () => toneSweep(200, 600, 0.4, 'sine', 0.3),
  keystone: () => { tone(440, 0.1, 'sine', 0.3); setTimeout(() => tone(660, 0.2, 'sine', 0.3), 80); },
  purifyWave: () => {
    toneSweep(200, 1200, 0.5, 'sine', 0.4);
    noiseBurst(0.4, 0.2, 4000, 'highpass');
  },
};

export function playSfx(name) {
  if (muted) return;
  const fn = SFX[name];
  if (fn) { try { fn(); } catch (e) {} }
}

// ---------- BGM 合成 ----------
// 每个区域一首氛围曲：低频 drone + 缓慢变化的和声层
// 用多个 OscillatorNode 叠加，通过 LFO 调制音量制造呼吸感

const BGM_DEFS = {
  freeze_center: { // 冷冻中心：冰冷、空旷
    freqs: [55, 110, 165],
    type: 'sine',
    lfo: 0.08,
    filter: 400,
  },
  street_01: { // 废弃街道：风声、荒凉
    freqs: [73.4, 146.8, 220],
    type: 'triangle',
    lfo: 0.12,
    filter: 600,
  },
  riverside: { // 江堤：宁静、水声
    freqs: [65.4, 130.8, 196],
    type: 'sine',
    lfo: 0.06,
    filter: 800,
  },
  subway: { // 地铁站：幽闭回响
    freqs: [49, 98, 147],
    type: 'sawtooth',
    lfo: 0.15,
    filter: 300,
  },
  alley_district: { // 居民区：压抑低音
    freqs: [41.2, 82.4, 123.5],
    type: 'triangle',
    lfo: 0.1,
    filter: 500,
  },
  house_a: { freqs: [65.4, 130.8], type: 'sine', lfo: 0.07, filter: 700 },
  house_b: { freqs: [65.4, 130.8], type: 'sine', lfo: 0.07, filter: 700 },
  stadium: { // 体育馆：电子嗡鸣、紧张
    freqs: [55, 110, 220, 330],
    type: 'sawtooth',
    lfo: 0.2,
    filter: 350,
  },
  data_center: { // 数据中心：虚无寂静、高频
    freqs: [110, 220, 440, 880],
    type: 'sine',
    lfo: 0.05,
    filter: 1200,
  },
  battle: { // 战斗：紧张、快节奏
    freqs: [110, 165, 220],
    type: 'sawtooth',
    lfo: 0.25,
    filter: 500,
  },
  ending: { // 结局：空灵、悠远
    freqs: [130.8, 196, 261.6, 392],
    type: 'sine',
    lfo: 0.04,
    filter: 1500,
  },
};

export function playBGM(sceneId) {
  if (muted) return;
  const def = BGM_DEFS[sceneId];
  if (!def) return;
  const c = ensureCtx();
  if (!c) return;
  if (currentBgmId === sceneId && currentBGM) return; // 同曲不重启

  stopBGM();
  currentBgmId = sceneId;

  const t = c.currentTime;
  const oscs = [];
  const masterBgGain = c.createGain();
  masterBgGain.gain.setValueAtTime(0, t);
  masterBgGain.gain.linearRampToValueAtTime(1, t + 1.5); // 淡入
  masterBgGain.connect(bgmGain);

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = def.filter;
  filter.connect(masterBgGain);

  // 和声层
  def.freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    osc.type = def.type;
    osc.frequency.value = f;
    osc.detune.value = (i - def.freqs.length / 2) * 3; // 轻微失谐增加厚度
    const g = c.createGain();
    g.gain.value = 0.5 / def.freqs.length;
    osc.connect(g);
    g.connect(filter);
    osc.start(t);
    oscs.push({ osc, g });
  });

  // LFO 调制总音量（呼吸感）
  const lfo = c.createOscillator();
  lfo.frequency.value = def.lfo;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.3;
  lfo.connect(lfoGain);
  lfoGain.connect(masterBgGain.gain);
  lfo.start(t);

  currentBGM = {
    oscs,
    lfo,
    masterBgGain,
    stop: (fadeDur = 0.8) => {
      const st = c.currentTime;
      masterBgGain.gain.cancelScheduledValues(st);
      masterBgGain.gain.setValueAtTime(masterBgGain.gain.value, st);
      masterBgGain.gain.linearRampToValueAtTime(0, st + fadeDur);
      oscs.forEach(({ osc }) => { try { osc.stop(st + fadeDur + 0.1); } catch (e) {} });
      try { lfo.stop(st + fadeDur + 0.1); } catch (e) {}
    },
  };
}

export function stopBGM(fadeDur = 0.8) {
  if (currentBGM) {
    try { currentBGM.stop(fadeDur); } catch (e) {}
    currentBGM = null;
    currentBgmId = null;
  }
}

export function getCurrentBgmId() { return currentBgmId; }
