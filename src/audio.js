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

// ---------- 真实 mp3 BGM 系统 ----------
// 场景/事件 ID -> BGM 曲目文件名映射（10 首真实音乐，多场景复用）
// 缺省回退到下方 BGM_DEFS 的合成 drone
const BGM_FILES = {
  bgm_01_prologue: 'assets/audio/bgm/bgm_01_prologue.mp3',
  bgm_02_battle: 'assets/audio/bgm/bgm_02_battle.mp3',
  bgm_03_purify: 'assets/audio/bgm/bgm_03_purify.mp3',
  bgm_04_tingyu: 'assets/audio/bgm/bgm_04_tingyu.mp3',
  bgm_05_ending: 'assets/audio/bgm/bgm_05_ending.mp3',
  bgm_06_void: 'assets/audio/bgm/bgm_06_void.mp3',
  bgm_07_ruins: 'assets/audio/bgm/bgm_07_ruins.mp3',
  bgm_08_stealth: 'assets/audio/bgm/bgm_08_stealth.mp3',
  bgm_09_river: 'assets/audio/bgm/bgm_09_river.mp3',
  bgm_10_ember: 'assets/audio/bgm/bgm_10_ember.mp3',
};

// 场景/事件 ID -> BGM 曲目 ID 映射（见 README 的 BGM 说明）
// 真实场景ID（来自 scenes.js）直接映射；事件用 __xxx__ 前缀避免冲突
const SCENE_TO_BGM = {
  // BGM-01 序章主题：3D序幕 + 金门标题
  __intro__: 'bgm_01_prologue',
  __title__: 'bgm_01_prologue',
  // BGM-02 战斗：普通战斗 + BOSS战
  __battle__: 'bgm_02_battle',
  __boss__: 'bgm_02_battle',
  // BGM-03 净化与希望：治愈/要石/火种结局
  __cure__: 'bgm_03_purify',
  __keystone__: 'bgm_03_purify',
  __ending_fire__: 'bgm_03_purify',
  // BGM-04 遇Sydney
  __meet_tingyu__: 'bgm_04_tingyu',
  // BGM-05 黯淡结局：沉默/燃尽
  __ending_silence__: 'bgm_05_ending',
  __ending_burnout__: 'bgm_05_ending',
  // BGM-06 虚空：冷冻中心/数据中心/记忆深渊/网络中枢
  freeze_center: 'bgm_06_void',
  data_center: 'bgm_06_void',
  memory_abyss: 'bgm_06_void',
  network_nexus: 'bgm_06_void',
  // BGM-07 废墟探索：街道/居民区/民居A/民居B
  street_01: 'bgm_07_ruins',
  alley_district: 'bgm_07_ruins',
  house_a: 'bgm_07_ruins',
  house_b: 'bgm_07_ruins',
  // BGM-08 幽闭潜行：地铁站/体育馆潜行/3D关卡
  subway: 'bgm_08_stealth',
  stadium: 'bgm_08_stealth',
  __level3d__: 'bgm_08_stealth',
  // BGM-09 江堤黄昏：江堤（横版）
  riverside: 'bgm_09_river',
  // BGM-10 图书馆余烬：废图书馆/失语者村落
  ruined_library: 'bgm_10_ember',
  lost_village: 'bgm_10_ember',
};

const bgmBufferCache = new Map(); // bgmId -> AudioBuffer（已解码完整缓存，二次播放用）
const bgmLoading = new Map(); // bgmId -> Promise（完整解码加载）
const bgmAudioEls = new Map(); // bgmId -> HTMLAudioElement（流式播放元素池，循环复用）
const bgmStreamNodes = new Map(); // bgmId -> { source, gain }（MediaElementSource 节点）
let currentMp3El = null; // 当前流式播放的 audio 元素
let currentMp3Gain = null; // 当前 mp3 的增益节点

// 优先级：首场景 > 高频 > 其余。用于提前缓存排序
const BGM_PRELOAD_PRIORITY = [
  'bgm_01_prologue',
  'bgm_06_void',
  'bgm_07_ruins', // 冷冻中心+街道（开局必经）
  'bgm_02_battle',
  'bgm_08_stealth', // 战斗+地铁（高频）
  'bgm_09_river',
  'bgm_10_ember',
  'bgm_03_purify',
  'bgm_04_tingyu',
  'bgm_05_ending',
];

// 获取/创建流式 audio 元素（浏览器原生边下边播+缓冲，无需等完整下载）
function getStreamAudioEl(bgmId) {
  if (bgmAudioEls.has(bgmId)) return bgmAudioEls.get(bgmId);
  const url = BGM_FILES[bgmId];
  if (!url) return null;
  const el = new Audio();
  el.src = url;
  el.loop = true;
  el.preload = 'auto'; // 浏览器自动缓冲
  el.crossOrigin = 'anonymous';
  bgmAudioEls.set(bgmId, el);
  return el;
}

// 异步完整加载 mp3 为 AudioBuffer（用于提前缓存，二次播放零延迟）
async function loadBgmFile(bgmId) {
  if (bgmBufferCache.has(bgmId)) return bgmBufferCache.get(bgmId);
  if (bgmLoading.has(bgmId)) return bgmLoading.get(bgmId);
  const url = BGM_FILES[bgmId];
  if (!url) return null;
  const p = (async () => {
    const c = ensureCtx();
    if (!c) return null;
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const arr = await resp.arrayBuffer();
      const buf = await c.decodeAudioData(arr);
      bgmBufferCache.set(bgmId, buf);
      return buf;
    } catch (e) {
      return null;
    }
  })();
  bgmLoading.set(bgmId, p);
  return p;
}

// 预加载：按优先级提前缓存（游戏启动时调用）
// 优先用 fetch 预热浏览器 HTTP 缓存 + 解码为 AudioBuffer
export async function preloadBGM() {
  // 第一阶段：立即为所有 BGM 创建 audio 元素触发浏览器流式预缓冲（非阻塞）
  for (const id of Object.keys(BGM_FILES)) {
    getStreamAudioEl(id); // 创建即触发 preload='auto' 缓冲
  }
  // 第二阶段：按优先级解码完整 AudioBuffer（用于后续无缝切换）
  for (const id of BGM_PRELOAD_PRIORITY) {
    loadBgmFile(id).catch(() => {});
  }
}

// 预加载单个 BGM（场景切换前预测调用）
export function preloadScene(sceneId) {
  const bgmId = SCENE_TO_BGM[sceneId];
  if (bgmId) loadBgmFile(bgmId).catch(() => {});
}

// 流式播放 mp3（边下边播，无需等完整下载），返回 true 表示成功
function playMp3BGM(bgmId) {
  const c = ensureCtx();
  if (!c) return false;

  stopBGM(); // 先停掉当前所有 BGM

  // 优先用已解码的完整 AudioBuffer（零延迟，已缓存时）
  const buf = bgmBufferCache.get(bgmId);
  if (buf) {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 1.2);
    src.connect(g);
    g.connect(bgmGain);
    src.start(t);
    currentBgmId = bgmId;
    currentBGM = {
      isMp3: true,
      masterBgGain: g,
      stop: (fadeDur = 0.8) => {
        const st = c.currentTime;
        g.gain.cancelScheduledValues(st);
        g.gain.setValueAtTime(g.gain.value, st);
        g.gain.linearRampToValueAtTime(0, st + fadeDur);
        try {
          src.stop(st + fadeDur + 0.1);
        } catch (e) {
          /* ignore */
        }
      },
    };
    return true;
  }

  // 回退：流式播放（HTMLAudioElement 边下边播）
  const el = getStreamAudioEl(bgmId);
  if (!el) return false;

  // 创建 MediaElementSource 接入 Web Audio 图（仅一次，复用）
  let node = bgmStreamNodes.get(bgmId);
  if (!node) {
    try {
      const source = c.createMediaElementSource(el);
      const g = c.createGain();
      source.connect(g);
      g.connect(bgmGain);
      node = { source, gain: g };
      bgmStreamNodes.set(bgmId, node);
    } catch (e) {
      return false;
    }
  }

  const g = node.gain;
  const t = c.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + 1.2); // 淡入
  el.currentTime = 0;
  el.play().catch(() => {});

  currentMp3El = el;
  currentMp3Gain = g;
  currentBgmId = bgmId;
  currentBGM = {
    isMp3: true,
    isStream: true,
    masterBgGain: g,
    stop: (fadeDur = 0.8) => {
      const st = c.currentTime;
      g.gain.cancelScheduledValues(st);
      g.gain.setValueAtTime(g.gain.value, st);
      g.gain.linearRampToValueAtTime(0, st + fadeDur);
      setTimeout(
        () => {
          try {
            el.pause();
          } catch (e) {
            /* ignore */
          }
        },
        fadeDur * 1000 + 100
      );
    },
  };

  // 流式播放期间，后台继续解码完整 AudioBuffer；完成后若仍是该曲则无缝切换（消除循环间隙）
  if (!bgmBufferCache.has(bgmId) && !bgmLoading.has(bgmId)) {
    loadBgmFile(bgmId)
      .then((b) => {
        if (b && currentBgmId === bgmId && currentBGM && currentBGM.isStream) {
          // 切换到 buffer 源（循环更平滑），保留当前播放位置近似
          const resumeTime = el.currentTime;
          stopBGM();
          const src = c.createBufferSource();
          src.buffer = b;
          src.loop = true;
          src.start(0, resumeTime % b.duration);
          const ng = c.createGain();
          const nt = c.currentTime;
          ng.gain.setValueAtTime(0, nt);
          ng.gain.linearRampToValueAtTime(1, nt + 0.5);
          src.connect(ng);
          ng.connect(bgmGain);
          currentBgmId = bgmId;
          currentBGM = {
            isMp3: true,
            masterBgGain: ng,
            stop: (fadeDur = 0.8) => {
              const st = c.currentTime;
              ng.gain.cancelScheduledValues(st);
              ng.gain.setValueAtTime(ng.gain.value, st);
              ng.gain.linearRampToValueAtTime(0, st + fadeDur);
              try {
                src.stop(st + fadeDur + 0.1);
              } catch (e) {
                /* ignore */
              }
            },
          };
        }
      })
      .catch(() => {});
  }
  return true;
}

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
export function isMuted() {
  return muted;
}
export function setBgmVolume(v) {
  bgmVolume = v;
  if (bgmGain) bgmGain.gain.value = v;
}
export function setSfxVolume(v) {
  sfxVolume = v;
  if (sfxGain) sfxGain.gain.value = v;
}

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
  pickup: () => {
    tone(660, 0.08, 'triangle', 0.5);
    setTimeout(() => tone(880, 0.1, 'triangle', 0.4), 60);
  },
  ui: () => tone(440, 0.05, 'square', 0.2),
  uiConfirm: () => {
    tone(523, 0.06, 'square', 0.25);
    setTimeout(() => tone(784, 0.08, 'square', 0.25), 50);
  },
  uiCancel: () => tone(300, 0.08, 'square', 0.2),
  hit: () => {
    noiseBurst(0.12, 0.6, 800);
    toneSweep(220, 80, 0.15, 'sawtooth', 0.3);
  },
  hurt: () => {
    toneSweep(400, 100, 0.2, 'sawtooth', 0.5);
    noiseBurst(0.08, 0.3, 500);
  },
  dash: () => toneSweep(800, 200, 0.15, 'sine', 0.3),
  purify: () => {
    tone(523, 0.15, 'sine', 0.3);
    setTimeout(() => tone(659, 0.15, 'sine', 0.3), 80);
    setTimeout(() => tone(784, 0.3, 'sine', 0.35), 160);
  },
  bulletHit: () => tone(200, 0.05, 'square', 0.15),
  footstep: () => tone(80 + Math.random() * 20, 0.04, 'sine', 0.08),
  save: () => {
    tone(523, 0.08, 'sine', 0.3);
    setTimeout(() => tone(659, 0.08, 'sine', 0.3), 70);
    setTimeout(() => tone(880, 0.12, 'sine', 0.3), 140);
  },
  load: () => {
    tone(880, 0.08, 'sine', 0.3);
    setTimeout(() => tone(659, 0.08, 'sine', 0.3), 70);
    setTimeout(() => tone(523, 0.12, 'sine', 0.3), 140);
  },
  death: () => {
    toneSweep(300, 50, 0.6, 'sawtooth', 0.4);
    noiseBurst(0.3, 0.3, 300);
  },
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.15, 'triangle', 0.3), i * 100)
    );
  },
  spare: () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.25), i * 120));
  },
  gate: () => toneSweep(200, 600, 0.4, 'sine', 0.3),
  keystone: () => {
    tone(440, 0.1, 'sine', 0.3);
    setTimeout(() => tone(660, 0.2, 'sine', 0.3), 80);
  },
  purifyWave: () => {
    toneSweep(200, 1200, 0.5, 'sine', 0.4);
    noiseBurst(0.4, 0.2, 4000, 'highpass');
  },
};

export function playSfx(name) {
  if (muted) return;
  const fn = SFX[name];
  if (fn) {
    try {
      fn();
    } catch (e) {
      /* ignore */
    }
  }
}

// ---------- BGM 合成 ----------
// 每个区域一首氛围曲：低频 drone + 缓慢变化的和声层
// 用多个 OscillatorNode 叠加，通过 LFO 调制音量制造呼吸感

const BGM_DEFS = {
  freeze_center: {
    // 冷冻中心：冰冷、空旷
    freqs: [55, 110, 165],
    type: 'sine',
    lfo: 0.08,
    filter: 400,
  },
  street_01: {
    // 废弃街道：风声、荒凉
    freqs: [73.4, 146.8, 220],
    type: 'triangle',
    lfo: 0.12,
    filter: 600,
  },
  riverside: {
    // 江堤：宁静、水声
    freqs: [65.4, 130.8, 196],
    type: 'sine',
    lfo: 0.06,
    filter: 800,
  },
  subway: {
    // 地铁站：幽闭回响
    freqs: [49, 98, 147],
    type: 'sawtooth',
    lfo: 0.15,
    filter: 300,
  },
  alley_district: {
    // 居民区：压抑低音
    freqs: [41.2, 82.4, 123.5],
    type: 'triangle',
    lfo: 0.1,
    filter: 500,
  },
  house_a: { freqs: [65.4, 130.8], type: 'sine', lfo: 0.07, filter: 700 },
  house_b: { freqs: [65.4, 130.8], type: 'sine', lfo: 0.07, filter: 700 },
  stadium: {
    // 体育馆：电子嗡鸣、紧张
    freqs: [55, 110, 220, 330],
    type: 'sawtooth',
    lfo: 0.2,
    filter: 350,
  },
  data_center: {
    // 数据中心：虚无寂静、高频
    freqs: [110, 220, 440, 880],
    type: 'sine',
    lfo: 0.05,
    filter: 1200,
  },
  battle: {
    // 战斗：紧张、快节奏
    freqs: [110, 165, 220],
    type: 'sawtooth',
    lfo: 0.25,
    filter: 500,
  },
  ending: {
    // 结局：空灵、悠远
    freqs: [130.8, 196, 261.6, 392],
    type: 'sine',
    lfo: 0.04,
    filter: 1500,
  },
};

export function playBGM(sceneId) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  if (currentBgmId === sceneId && currentBGM) return; // 同曲不重启

  // 1) 优先查找场景对应的真实 mp3 BGM
  const bgmId = SCENE_TO_BGM[sceneId];
  if (bgmId) {
    // playMp3BGM 内部：已缓存AudioBuffer零延迟播放；未缓存则流式边下边播；
    // 流式播放期间后台继续解码完整缓存，完成后无缝切换消除循环间隙
    if (playMp3BGM(bgmId)) return;
    // 流式也失败（如AudioContext未就绪）：回退合成 drone
  }

  // 2) 回退：合成 drone（原有逻辑）
  const def = BGM_DEFS[sceneId];
  if (!def) return;

  stopBGM();
  currentBgmId = sceneId;
  _startDrone(def, c);
}

// 合成 drone 启动（过渡/回退共用）
function _startDrone(def, c) {
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
      oscs.forEach(({ osc }) => {
        try {
          osc.stop(st + fadeDur + 0.1);
        } catch (e) {
          /* ignore */
        }
      });
      try {
        lfo.stop(st + fadeDur + 0.1);
      } catch (e) {
        /* ignore */
      }
    },
  };
}

export function stopBGM(fadeDur = 0.8) {
  if (currentBGM) {
    try {
      currentBGM.stop(fadeDur);
    } catch (e) {
      /* ignore */
    }
    currentBGM = null;
    currentBgmId = null;
  }
  if (currentMp3El) {
    currentMp3El = null;
    currentMp3Gain = null;
  }
}

export function getCurrentBgmId() {
  return currentBgmId;
}
