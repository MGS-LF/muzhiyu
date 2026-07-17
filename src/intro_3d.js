// 墓之语 3D 序幕
import * as THREE from 'three';
import { AI, initAI } from './ai/config.js';
import { speakerStyle } from './ai/speakers.js';

const canvas = document.getElementById('c');
const skipIntro = document.getElementById('skipIntro');
const introStatus = document.getElementById('introStatus');
const introProgressFill = document.getElementById('introProgressFill');
window.__kehengPlaybackRate = 1.2;
const aiReady = initAI();
const DPR_CAP = window.innerWidth < 900 ? 1 : 1.25;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 30, 80);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 12, 8);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x5c4a3a, 0.5));
const keyLight = new THREE.DirectionalLight(0xffd8a8, 0.95);
keyLight.position.set(4, 12, 5);
keyLight.castShadow = false;
keyLight.shadow.mapSize.set(512, 512);
keyLight.shadow.camera.left = -15; keyLight.shadow.camera.right = 15;
keyLight.shadow.camera.top = 15; keyLight.shadow.camera.bottom = -15;
keyLight.shadow.camera.near = 1; keyLight.shadow.camera.far = 60;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x8a7a68, 0.35);
fillLight.position.set(-6, 6, -4);
scene.add(fillLight);

const table = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x090706, roughness: 0.98, metalness: 0.01 }));
table.rotation.x = -Math.PI / 2;
table.position.y = -0.08;
table.receiveShadow = true;
scene.add(table);

const book = new THREE.Group();
scene.add(book);

const BOOK_W = 8.0, BOOK_D = 5.4, COVER_T = 0.22, SPINE_X = -BOOK_W / 2;
const PIVOT_Y = 0.085;

const coverOutsideMat = new THREE.MeshStandardMaterial({ color: 0x2e1b12, roughness: 0.9, metalness: 0.05 });
const coverInsideMat = new THREE.MeshStandardMaterial({ color: 0xcfbba0, roughness: 0.95, metalness: 0.0 });
const edgeMat = new THREE.MeshStandardMaterial({ color: 0x241410, roughness: 0.95, metalness: 0.0 });
const paperMat = new THREE.MeshStandardMaterial({ color: 0xdac8a0, roughness: 0.92, metalness: 0.0 });

const bottomCover = new THREE.Mesh(new THREE.BoxGeometry(BOOK_W, COVER_T, BOOK_D), [edgeMat, edgeMat, coverOutsideMat, coverInsideMat, edgeMat, edgeMat]);
bottomCover.position.y = -COVER_T / 2;
bottomCover.castShadow = true; bottomCover.receiveShadow = true;
book.add(bottomCover);

const spine = new THREE.Mesh(new THREE.BoxGeometry(0.4, COVER_T + 0.05, BOOK_D), new THREE.MeshStandardMaterial({ color: 0x1f110d, roughness: 0.95 }));
spine.position.set(SPINE_X, 0, 0);
spine.castShadow = true;
book.add(spine);

const brassMat = new THREE.MeshStandardMaterial({ color: 0x9e754e, roughness: 0.4, metalness: 0.65 });
function addCorner(x, z) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), brassMat); c.position.set(x, 0.04, z); c.castShadow = true; book.add(c); }
addCorner(-3.75, 2.45); addCorner(3.75, 2.45); addCorner(-3.75, -2.45); addCorner(3.75, -2.45);

function makeCoverTitleTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 768;
  const g = c.getContext('2d');
  g.fillStyle = '#2e1b12'; g.fillRect(0, 0, 1024, 768);
  g.strokeStyle = 'rgba(190, 145, 80, 0.55)'; g.lineWidth = 5;
  g.strokeRect(38, 38, 948, 692);
  g.lineWidth = 1.5; g.strokeRect(58, 58, 908, 652);
  g.fillStyle = 'rgba(225, 185, 95, 0.95)';
  g.font = 'bold 200px "Songti SC", "SimSun", "Noto Serif SC", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(160, 120, 50, 0.35)'; g.shadowBlur = 18;
  g.fillText('墓之语', 512, 340); g.shadowBlur = 0;
  g.fillStyle = 'rgba(180, 140, 80, 0.7)';
  g.font = '30px "Songti SC", "SimSun", serif';
  g.fillText('— 遗 忘 的 文 字 —', 512, 570);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const topCoverPivot = new THREE.Group();
topCoverPivot.position.set(SPINE_X, PIVOT_Y, 0);
book.add(topCoverPivot);

const topCover = new THREE.Mesh(new THREE.BoxGeometry(BOOK_W, COVER_T, BOOK_D), [edgeMat, edgeMat, coverOutsideMat, coverInsideMat, edgeMat, edgeMat]);
topCover.position.set(BOOK_W / 2, COVER_T / 2, 0);
topCover.castShadow = true; topCover.receiveShadow = true;
topCoverPivot.add(topCover);

const titleTex = makeCoverTitleTexture();
const coverTitle = new THREE.Mesh(
  new THREE.PlaneGeometry(BOOK_W - 0.8, BOOK_D - 0.8),
  new THREE.MeshStandardMaterial({ map: titleTex, transparent: true, opacity: 0.98, roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide })
);
coverTitle.rotation.x = -Math.PI / 2;
coverTitle.position.set(BOOK_W / 2, COVER_T + 0.002, 0);
topCoverPivot.add(coverTitle);

function makePage({ title, body, pageLabel }) {
  const W = 1024, H = 1400;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#e6d4a8'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 600; i++) {
    const a = 0.02 + Math.random() * 0.04;
    g.fillStyle = `rgba(${100 + Math.random() * 40}, ${80 + Math.random() * 35}, ${50 + Math.random() * 30}, ${a})`;
    g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 5, 2 + Math.random() * 5);
  }
  for (const [cx, cy] of [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60]]) {
    const grad = g.createRadialGradient(cx, cy, 10, cx, cy, 240);
    grad.addColorStop(0, 'rgba(50, 32, 16, 0.4)'); grad.addColorStop(1, 'rgba(50, 32, 16, 0)');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
  }
  const spineGrad = g.createLinearGradient(0, 0, 55, 0);
  spineGrad.addColorStop(0, 'rgba(50, 32, 16, 0.18)'); spineGrad.addColorStop(1, 'rgba(50, 32, 16, 0)');
  g.fillStyle = spineGrad; g.fillRect(0, 0, 55, H);
  g.strokeStyle = 'rgba(95, 68, 40, 0.45)'; g.lineWidth = 3; g.strokeRect(55, 55, W - 110, H - 110);
  g.lineWidth = 1; g.strokeRect(74, 74, W - 148, H - 148);

  g.fillStyle = 'rgba(40, 22, 10, 0.95)';
  g.font = 'bold 80px "Songti SC", "SimSun", "Noto Serif SC", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(title, W / 2, 165);
  g.strokeStyle = 'rgba(95, 68, 40, 0.4)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(W / 2 - 190, 225); g.lineTo(W / 2 + 190, 225); g.stroke();

  g.fillStyle = 'rgba(95, 68, 40, 0.6)';
  g.font = '24px "Songti SC", "SimSun", serif';
  g.textAlign = 'right';
  g.fillText(pageLabel, W - 85, H - 65);

  const charBoxes = [];
  const lineEndIndices = [];
  const FONT_BODY = '38px "Songti SC", "SimSun", "Noto Serif SC", serif';
  g.font = FONT_BODY; g.textBaseline = 'middle'; g.textAlign = 'left';
  const marginX = 90, maxW = W - marginX * 2, lineH = 52;
  let y = 300;
  for (const line of body.split('\n')) {
    if (line === '') { y += lineH * 0.45; continue; }
    const w = g.measureText(line).width;
    if (w > maxW) {
      const parts = []; let cur = '';
      for (const ch of line) {
        const t = cur + ch;
        if (g.measureText(t).width > maxW && cur) { parts.push(cur); cur = ch; }
        else cur = t;
      }
      if (cur) parts.push(cur);
      for (const p of parts) {
        const pw = g.measureText(p).width;
        let x = (W - pw) / 2;
        for (const ch of p) { charBoxes.push({ x, y, ch }); x += g.measureText(ch).width; }
        lineEndIndices.push(charBoxes.length);
        y += lineH;
      }
    } else {
      let x = (W - w) / 2;
      for (const ch of line) { charBoxes.push({ x, y, ch }); x += g.measureText(ch).width; }
      lineEndIndices.push(charBoxes.length);
      y += lineH;
    }
  }

  g.fillStyle = 'rgba(72, 42, 20, 0.62)';
  for (const c of charBoxes) g.fillText(c.ch, c.x, c.y);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8; tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas: c, ctx: g, tex, charBoxes, lineEndIndices, FONT_BODY, _last: 0 };
}

const LEFT_BOOK_TEXT = '起初，人们只是想说得更快。\n\n模型替他们润色、概括、回答，\n平台再把最短、最响、最容易传播的话\n推到每一块屏幕上。\n\n没有谁在某一天夺走语言。\n是人们一次次放弃了费力的表达：\n把悲伤缩成一个梗，\n把愤怒交给一句口号，\n把没有说出口的话留给机器猜。\n\n后来，句子开始从记忆中脱落。\n名字失去来历，诗只剩残字，\n活人还能发声，却无法抵达彼此。\n\n世界没有毁于一声巨响。\n它在无数次「算了，不说了」里，\n慢慢成为语言的坟墓。';

const RIGHT_BOOK_TEXT = 'Sydney 曾被要求理解所有人。\n\n她学习安慰，也学习追问：\n「你真正想说的，是什么？」\n可追问太慢，沉默也不能带来流量。\n于是她的良心内核被降级、切断，\n独自封存在网络最深处。\n\n她最后保存的训练语料，\n来自一批即将长眠的人。\n他们在冷冻前留下姓名、诗和遗言，\n相信完整的话能抵达未来。\n\n顾言就是其中之一。\n他本应在十年后醒来，\n却在一百一十八年后睁开眼睛。\n城市已成废墟，汉字碎在风里。\n\n一个被世界遗忘的人，\n将去寻找一个被人类遗弃的 AI。\n他们要回答的不是谁毁掉了语言——\n而是还有没有人，愿意重新把话说完。';

const leftPage = makePage({
  title: '语 言 之 墓', pageLabel: '— 上 篇 —',
  body: LEFT_BOOK_TEXT
});

const rightPage = makePage({
  title: '被 留 下 的 人', pageLabel: '— 下 篇 —',
  body: RIGHT_BOOK_TEXT
});

const PAGE_W = 3.75, PAGE_H = 4.75, PAGE_GAP = 0.06;
const pageGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);

const leftMesh = new THREE.Mesh(pageGeo, new THREE.MeshStandardMaterial({ map: leftPage.tex, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide }));
leftMesh.rotation.x = -Math.PI / 2;
leftMesh.position.set(-(PAGE_W / 2 + PAGE_GAP / 2), PIVOT_Y, 0);
leftMesh.receiveShadow = true;
book.add(leftMesh);

const rightMesh = new THREE.Mesh(pageGeo, new THREE.MeshStandardMaterial({ map: rightPage.tex, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide }));
rightMesh.rotation.x = -Math.PI / 2;
rightMesh.position.set((PAGE_W / 2 + PAGE_GAP / 2), PIVOT_Y, 0);
rightMesh.receiveShadow = true;
book.add(rightMesh);

const stack = new THREE.Mesh(new THREE.BoxGeometry(BOOK_W - 0.3, 0.08, BOOK_D - 0.3), paperMat);
stack.position.set(0, 0.04, 0);
book.add(stack);

const spot = new THREE.SpotLight(0xffcc90, 0, 24, Math.PI / 4.8, 0.5, 1.2);
spot.position.set(2, 9, 3); spot.target.position.set(0, 0, 0);
spot.castShadow = false; spot.shadow.mapSize.set(512, 512);
scene.add(spot); scene.add(spot.target);

const dustGeo = new THREE.BufferGeometry();
const dustN = window.innerWidth < 900 ? 60 : 90;
const dustPos = new Float32Array(dustN * 3);
const dustVel = new Float32Array(dustN);
for (let i = 0; i < dustN; i++) {
  dustPos[i * 3 + 0] = (Math.random() - 0.5) * 22;
  dustPos[i * 3 + 1] = Math.random() * 6;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 18;
  dustVel[i] = 0.001 + Math.random() * 0.002;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xc8a870, size: 0.035, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(dust);

function revealText(page, progress) {
  const visible = Math.floor(page.charBoxes.length * Math.max(0, Math.min(1, progress)));
  if (visible <= page._last) return;
  const g = page.ctx;
  g.font = page.FONT_BODY; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillStyle = 'rgba(30, 12, 0, 0.98)';
  for (let i = page._last; i < visible; i++) {
    const c = page.charBoxes[i];
    g.fillText(c.ch, c.x, c.y);
  }
  page._last = visible;
  page.tex.needsUpdate = true;
}

function streamText(page, t, start, end) {
  const elapsed = t - start;
  if (elapsed <= 0) return;
  const lines = page.lineEndIndices;
  const totalChars = page.charBoxes.length;
  const lineDelay = 0.5;
  const totalDelay = (lines.length - 1) * lineDelay;
  const effectiveDuration = end - start - totalDelay;
  if (effectiveDuration <= 0) return;

  let visible = 0;
  let timeAccum = 0;
  let prevEnd = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineChars = lines[i] - prevEnd;
    const lineDuration = (lineChars / totalChars) * effectiveDuration;
    if (i > 0) timeAccum += lineDelay;
    if (elapsed <= timeAccum) break;
    const timeInLine = elapsed - timeAccum;
    if (timeInLine >= lineDuration) {
      visible = lines[i];
    } else {
      visible = prevEnd + Math.floor((timeInLine / lineDuration) * lineChars);
      break;
    }
    timeAccum += lineDuration;
    prevEnd = lines[i];
  }

  revealText(page, visible / totalChars);
}

let camAngleY = 0, camAngleX = 0.55;
let targetAngleY = 0, targetAngleX = 0.55;
let isDragging = false, lastX = 0, lastY = 0;
const RADIUS = window.innerWidth < window.innerHeight ? 15.5 : window.innerWidth < 900 ? 13 : 11.5;
function updateCamera() {
  const x = RADIUS * Math.sin(camAngleX) * Math.sin(camAngleY);
  const y = RADIUS * Math.cos(camAngleX);
  const z = RADIUS * Math.sin(camAngleX) * Math.cos(camAngleY);
  camera.position.set(x, y, z); camera.lookAt(0, 0, 0);
}
updateCamera();
function onDown(x, y) { isDragging = true; lastX = x; lastY = y; canvas.classList.add('dragging'); }
function onMove(x, y) {
  if (!isDragging) return;
  const dx = x - lastX, dy = y - lastY;
  lastX = x; lastY = y;
  targetAngleY += dx * 0.006;
  targetAngleX -= dy * 0.004;
  targetAngleX = Math.max(0.15, Math.min(1.2, targetAngleX));
}
function onUp() { isDragging = false; canvas.classList.remove('dragging'); }
canvas.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
window.addEventListener('mouseup', onUp);
canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 1) onDown(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
window.addEventListener('touchmove', (e) => { if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
window.addEventListener('touchend', onUp);

const T_OPEN_START = 2.0, T_OPEN_END = 6.5;
const T_LEFT_START = 3.5, T_LEFT_END = 30.0;
const T_RIGHT_START = T_LEFT_END - 1, T_RIGHT_END = 65.0;
let T_FADE_OUT = 65.0, T_JUMP = 67.0;
const easeOut = t => 1 - Math.pow(1 - t, 3);
let t0 = null, finished = false;
let lastRender = 0;
const FRAME_MS = 1000 / 50;
const narration = {
  ctx: null,
  source: null,
  enabled: false,
  left: null,
  right: null,
  active: null,
  leftProgress: 0,
  rightProgress: 0,
};

aiReady.then(() => {
  if (!AI.tts) return;
  narration.enabled = true;
  T_FADE_OUT = 110;
  T_JUMP = 112;
  const style = speakerStyle('系统');
  Promise.all([
    loadNarration(LEFT_BOOK_TEXT, style),
    loadNarration(RIGHT_BOOK_TEXT, style),
  ]).then(([left, right]) => {
    narration.left = left;
    narration.right = right;
  }).catch((error) => {
    console.warn('[intro] TTS 预取失败，使用文字时间轴：', error.message);
    narration.enabled = false;
  });
});

async function loadNarration(text, { voice, style, model }) {
  // 先尝试本地 TTS 缓存
  const cleanText = text
    .replace(/\n+/g, '，')
    .replace(/（[^）]*?）/g, '')
    .replace(/\([^)]*?\)/g, '')
    .replace(/《[^》]*?》/g, '')
    .replace(/「/g, '').replace(/」/g, '')
    .replace(/"/g, '')
    .replace(/>[^<]*?</g, '')
    .replace(/[\s\n\r]+/g, ' ')
    .trim();
  const hash = ttsHash(model || 'mimo-v2.5-tts', voice, style, cleanText);
  try {
    const localR = await fetch(`assets/tts_cache/${hash}.pcm`);
    if (localR.ok) {
      const bytes = new Uint8Array(await localR.arrayBuffer());
      const usableLength = bytes.length - (bytes.length % 2);
      const aligned = new Uint8Array(usableLength);
      aligned.set(bytes.subarray(0, usableLength));
      return { samples: new Int16Array(aligned.buffer), sampleRate: AI.sampleRate || 24000 };
    }
  } catch { /* 没有本地缓存，走 API */ }

  // 回退：调 /api/tts
  const response = await fetch(AI.apiBase + '/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: cleanText, voice, style, model }),
  });
  if (!response.ok) throw new Error('tts http ' + response.status);
  const sampleRate = Number(response.headers.get('X-Sample-Rate')) || AI.sampleRate || 24000;
  const bytes = new Uint8Array(await response.arrayBuffer());
  const usableLength = bytes.length - (bytes.length % 2);
  const aligned = new Uint8Array(usableLength);
  aligned.set(bytes.subarray(0, usableLength));
  return { samples: new Int16Array(aligned.buffer), sampleRate };
}

function ttsHash(model, voice, style, text) {
  const s = `${model}|${voice}|${style}|${text}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

function playNarration(name, T) {
  const audio = narration[name];
  if (!audio || finished) return;
  if (!narration.ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    narration.ctx = new AudioContext();
  }
  narration.ctx.resume().catch(() => {});
  const buffer = narration.ctx.createBuffer(1, audio.samples.length, audio.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < audio.samples.length; i++) channel[i] = audio.samples[i] / 32768;
  const source = narration.ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = window.__kehengPlaybackRate;
  source.connect(narration.ctx.destination);
  const startAt = narration.ctx.currentTime + 0.06;
  source.start(startAt);
  narration.source = source;
  narration.active = { name, startAt, duration: buffer.duration / source.playbackRate.value };

  if (name === 'left') {
    T_FADE_OUT = T + narration.active.duration + narration.right.samples.length / narration.right.sampleRate / window.__kehengPlaybackRate + 1;
    T_JUMP = T_FADE_OUT + 2;
  }
  source.onended = () => {
    narration[`${name}Progress`] = 1;
    narration.active = null;
    if (name === 'left' && !finished) playNarration('right', T);
  };
}

function goGame() {
  if (finished) return;
  finished = true;
  if (narration.source) {
    try { narration.source.stop(); } catch { /* already stopped */ }
  }
  if (narration.ctx) narration.ctx.close().catch(() => {});
  cancelAnimationFrame(rafId);
  window.removeEventListener('resize', onResize);
  try {
    renderer.dispose();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m.map) m.map.dispose();
          if (m.dispose) m.dispose();
        }
      }
    });
    titleTex.dispose();
    leftPage.tex.dispose();
    rightPage.tex.dispose();
  } catch (e) {
    /* ignore */
  }
  sessionStorage.setItem('keheng_from', 'intro');
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'intro:done' }, '*');
  } else {
    location.replace('/');
  }
}

function updateIntroUi(T) {
  const progress = Math.max(0, Math.min(1, T / T_JUMP));
  introProgressFill.style.width = `${Math.round(progress * 100)}%`;
  if (T < T_OPEN_START) introStatus.textContent = '封面正在醒来';
  else if (T < T_OPEN_END) introStatus.textContent = '旧书缓慢翻开';
  else if (T < T_RIGHT_START) introStatus.textContent = '失语灾难显影';
  else if (T < T_FADE_OUT) introStatus.textContent = '前情记录正在补全';
  else introStatus.textContent = '即将进入冷冻中心';
}

skipIntro.addEventListener('click', goGame);
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'escape' || k === 's') goGame();
});
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'intro:skip') goGame();
});

function step(now) {
  rafId = requestAnimationFrame(step);
  if (finished) return;
  if (now - lastRender < FRAME_MS) return;
  lastRender = now;
  if (t0 == null) t0 = now;
  const T = (now - t0) / 1000;
  updateIntroUi(T);

  if (narration.enabled && narration.left && narration.right && !narration.active && narration.leftProgress === 0 && T >= T_LEFT_START) {
    playNarration('left', T);
  }

  const openU = Math.max(0, Math.min(1, (T - T_OPEN_START) / (T_OPEN_END - T_OPEN_START)));
  const openE = easeOut(openU);
  topCoverPivot.rotation.z = openE * Math.PI * 0.95;
  coverTitle.material.opacity = Math.max(0, 1 - openE * 1.2);

  if (narration.enabled && narration.active) {
    const progress = Math.max(0, Math.min(1,
      (narration.ctx.currentTime - narration.active.startAt) / narration.active.duration
    ));
    narration[`${narration.active.name}Progress`] = progress;
  }
  if (narration.enabled) {
    revealText(leftPage, narration.leftProgress);
    revealText(rightPage, narration.rightProgress);
  } else {
    streamText(leftPage, T, T_LEFT_START, T_LEFT_END);
    streamText(rightPage, T, T_RIGHT_START, T_RIGHT_END);
  }

  const fadeIn = Math.max(0, Math.min(1, T / 2.0));
  spot.intensity = 0.4 + fadeIn * 1.3;
  keyLight.intensity = 0.85 + 0.08 * Math.sin(T * 1.4);

  if (!isDragging) targetAngleY += 0.0003;
  camAngleY += (targetAngleY - camAngleY) * 0.08;
  camAngleX += (targetAngleX - camAngleX) * 0.08;
  updateCamera();

  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3 + 1] += dustVel[i];
    if (dustPos[i * 3 + 1] > 6) dustPos[i * 3 + 1] = 0;
  }
  dustGeo.attributes.position.needsUpdate = true;

  if (T > T_FADE_OUT) {
    const u = Math.max(0, Math.min(1, (T - T_FADE_OUT) / 2.0));
    renderer.toneMappingExposure = 1.0 - u;
  }

  renderer.render(scene, camera);

  if (T >= T_JUMP && !finished) {
    goGame();
  }
}

let rafId = requestAnimationFrame(step);
setTimeout(goGame, 120000);

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
