// 维度裂隙 · 3D 第一人称关卡
// Three.js FPS：WASD + 鼠标视角，鼠标左键开枪，搜集物资/击怪/找出口
// 入口与出口在同一地图不同位置，形成探索闭环
// v2：提升模型精细度与环境细节；提高整体亮度避免误判加载失败
import * as THREE from 'three';
import { W, H } from './config.js';

const CELL = 2.6;
const SPEED = 5.2;
const PLAYER_R = 0.42;
const EYE_H = 1.6;
const SHOOT_CD = 220;
const BULLET_DMG = 50;
const GUN_RANGE = 60;

// 地图网格：# 墙  . 空  E 入口  X 出口  G 枪  M 怪  A 弹药  H 血包  K 关键道具(裂隙之钥)  | 门洞(可通行)  P 支柱  L 灯
const MAP = [
  '#########################',
  '#E.....P...#............#',
  '#..G.......#....M.....L.#',
  '#..........#............#',
  '#....######.####........#',
  '#....#...P....#..A....P.#',
  '#....#..M.....#.L.....K.#',
  '#....|........|..M......#',
  '#....#.L......#.........#',
  '#....######.####........#',
  '#..L.......#......P.....#',
  '#..M.....P.#....A..M....#',
  '#..........#..........L.#',
  '#..........#........X...#',
  '#########################',
];
const MAP_W = MAP[0].length, MAP_H = MAP.length;
const ORIGIN_X = -MAP_W * CELL / 2, ORIGIN_Z = -MAP_H * CELL / 2;
const cellToWorld = (gx, gy) => ({ x: ORIGIN_X + (gx + 0.5) * CELL, z: ORIGIN_Z + (gy + 0.5) * CELL });
const isWall = (gx, gy) => gy < 0 || gy >= MAP_H || gx < 0 || gx >= MAP_W || MAP[gy][gx] === '#';

const INTRO_TEXT = '维度裂隙：WASD 移动 · 鼠标视角 · 左键射击 · 找到出口回到地铁站';

export class Level3D {
  constructor(game) {
    this.game = game;
    this.done = false;
    this.disposed = false;

    // === WebGL canvas（覆盖全屏）===
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '50', cursor: 'none' });
    document.body.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25; // 提亮，避免初始过暗误判

    this.scene = new THREE.Scene();
    // 提亮：从近黑改为带蓝紫调的深色，雾更远更淡
    this.scene.background = new THREE.Color(0x161828);
    this.scene.fog = new THREE.Fog(0x161828, 12, 40);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 100);

    // === 玩家状态 ===
    this.pos = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.gun = { have: false, ammo: 0, maxAmmo: 30 };
    this.hasKey = false; // 裂隙之钥（推进关卡的关键道具）
    this.shootCD = 0;
    this.muzzleFlash = 0;
    this.hp = Math.max(40, game.player.san); // 用 SAN 作为 HP
    this.maxHp = game.player.maxSan;
    this.hurtFlash = 0;
    this.exitReached = false;
    this._hintText = '';
    this._paused = false;

    // raycaster（射击）
    this.raycaster = new THREE.Raycaster();

    // 资源容器
    this.walls = [];
    this.enemies = [];
    this.pickups = [];
    this.lights = [];
    this.dust = null;
    this.exitMesh = null;
    this.gunViewModel = null;

    // === 建关 ===
    this._buildLevel();

    // 玩家放到入口
    const entry = this._findChar('E');
    const ew = cellToWorld(entry.x, entry.y);
    this.pos.set(ew.x, EYE_H, ew.z);
    this.yaw = Math.PI / 2; // 朝东

    // === HUD ===
    this._buildHUD();
    this._resize = () => this._onResize();
    window.addEventListener('resize', this._resize);

    // 请求 pointer lock
    setTimeout(() => { try { this.canvas.requestPointerLock(); } catch (e) {} }, 50);
    this.game.showHint(INTRO_TEXT);
  }

  // ============================================
  // 建关
  // ============================================
  _buildLevel() {
    // === 灯光（大幅提亮）===
    this.scene.add(new THREE.AmbientLight(0x6a6088, 0.95));
    const dir = new THREE.DirectionalLight(0xb0c0ff, 0.75);
    dir.position.set(10, 22, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -20; dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20; dir.shadow.camera.bottom = -20;
    dir.shadow.camera.near = 1; dir.shadow.camera.far = 60;
    dir.shadow.bias = -0.0005;
    this.scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffaa66, 0.3);
    dir2.position.set(-8, 10, -6); this.scene.add(dir2);

    // === 地面（带纹理感）===
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2632, roughness: 0.92, metalness: 0.08 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W * CELL, MAP_H * CELL), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    this.scene.add(floor);
    // 地面网格线（提亮）
    const grid = new THREE.GridHelper(MAP_W * CELL, MAP_W, 0x4a4068, 0x2a2540);
    grid.position.y = 0.01; grid.material.opacity = 0.5; grid.material.transparent = true;
    this.scene.add(grid);
    // 地面拼接缝（增强细节：沿网格画细线）
    const seamMat = new THREE.LineBasicMaterial({ color: 0x1a1622, transparent: true, opacity: 0.6 });
    for (let i = 0; i <= MAP_W; i++) {
      const x = ORIGIN_X + i * CELL;
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0.02, ORIGIN_Z), new THREE.Vector3(x, 0.02, ORIGIN_Z + MAP_H * CELL)]);
      this.scene.add(new THREE.Line(g, seamMat));
    }
    for (let i = 0; i <= MAP_H; i++) {
      const z = ORIGIN_Z + i * CELL;
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ORIGIN_X, 0.02, z), new THREE.Vector3(ORIGIN_X + MAP_W * CELL, 0.02, z)]);
      this.scene.add(new THREE.Line(g, seamMat));
    }

    // === 天花板（带管道细节）===
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1a1822, roughness: 1 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W * CELL, MAP_H * CELL), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.4; this.scene.add(ceil);
    // 天花板管道
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3a3a48, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 4; i++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, MAP_W * CELL, 8), pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 3.1, ORIGIN_Z + (i + 0.5) * (MAP_H * CELL / 4));
      this.scene.add(pipe);
    }

    // === 墙壁（精细：分上下两段 + 边缘条）===
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3548, roughness: 0.78, metalness: 0.18 });
    const wallTrimMat = new THREE.MeshStandardMaterial({ color: 0x1f1c2a, roughness: 0.9 });
    const wallGeo = new THREE.BoxGeometry(CELL, 3.4, CELL);
    const trimGeo = new THREE.BoxGeometry(CELL, 0.18, CELL);
    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const ch = MAP[gy][gx];
        if (ch === '#') {
          const w = cellToWorld(gx, gy);
          const m = new THREE.Mesh(wallGeo, wallMat);
          m.position.set(w.x, 1.7, w.z);
          m.castShadow = m.receiveShadow = true;
          this.scene.add(m); this.walls.push(m);
          // 墙脚踢脚线
          const trim = new THREE.Mesh(trimGeo, wallTrimMat);
          trim.position.set(w.x, 0.09, w.z); this.scene.add(trim);
          // 墙顶线条
          const trim2 = new THREE.Mesh(trimGeo, wallTrimMat);
          trim2.position.set(w.x, 3.31, w.z); this.scene.add(trim2);
        }
      }
    }

    // === 支柱（装饰，可碰撞由网格'#'决定，此处纯视觉）===
    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        if (MAP[gy][gx] === 'P') {
          const w = cellToWorld(gx, gy);
          this._addPillar(w);
        }
      }
    }

    // === 壁灯 L（点光源 + 灯具模型）===
    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        if (MAP[gy][gx] === 'L') {
          const w = cellToWorld(gx, gy);
          this._addWallLamp(w);
        }
      }
    }

    // === 出口（光柱传送门，精细）===
    const ex = this._findChar('X');
    const ew = cellToWorld(ex.x, ex.y);
    this.exitMesh = new THREE.Group();
    const portalGeo = new THREE.CylinderGeometry(0.9, 0.9, 3.2, 32, 1, true);
    const portalMat = new THREE.MeshBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.y = 1.6; this.exitMesh.add(portal);
    // 内层光柱
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    inner.position.y = 1.6; this.exitMesh.add(inner);
    // 地面光环
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.1, 32), new THREE.MeshBasicMaterial({ color: 0x66ddff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; this.exitMesh.add(ring);
    this.exitRing = ring;
    const pl = new THREE.PointLight(0x66ddff, 3.0, 10); pl.position.y = 1.6; this.exitMesh.add(pl);
    this.exitMesh.position.set(ew.x, 0, ew.z);
    this.scene.add(this.exitMesh);
    this.exitPos = new THREE.Vector3(ew.x, 0, ew.z);

    // === 枪、弹药、血包、怪物 ===
    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const ch = MAP[gy][gx];
        const w = cellToWorld(gx, gy);
        if (ch === 'G') this._spawnGun(w);
        else if (ch === 'A') this._spawnPickup(w, 'ammo');
        else if (ch === 'H') this._spawnPickup(w, 'health');
        else if (ch === 'K') this._spawnKeyItem(w);
        else if (ch === 'M') this._spawnEnemy(w);
      }
    }

    // === 浮尘粒子 ===
    this._addDust();

    // === 手臂/枪的视图模型（始终在相机前）===
    this._buildViewModel();
  }

  _addPillar(w) {
    const grp = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x444052, roughness: 0.85 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.0, 12), baseMat);
    shaft.position.y = 1.5; grp.add(shaft);
    // 柱头柱础
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), baseMat);
    cap.position.y = 3.1; grp.add(cap);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), baseMat);
    foot.position.y = 0.1; grp.add(foot);
    grp.position.set(w.x, 0, w.z);
    grp.castShadow = true;
    this.scene.add(grp);
  }

  _addWallLamp(w) {
    const grp = new THREE.Group();
    // 灯臂
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.3), new THREE.MeshStandardMaterial({ color: 0x2a2830, metalness: 0.6 }));
    arm.position.z = -0.15; grp.add(arm);
    // 灯罩
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.25, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a3848, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }));
    shade.position.y = 0.05; grp.add(shade);
    // 灯泡（发光）
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffddaa }));
    bulb.position.y = -0.02; grp.add(bulb);
    const light = new THREE.PointLight(0xffcc88, 1.6, 6, 1.5);
    light.position.y = -0.1; grp.add(light);
    grp.position.set(w.x, 2.6, w.z);
    this.scene.add(grp);
    this.lights.push({ grp, bulb, light, base: 1.6 });
  }

  _addDust() {
    const N = 220;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const vel = [];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * MAP_W * CELL;
      pos[i * 3 + 1] = Math.random() * 3.0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * MAP_H * CELL;
      vel.push(0.02 + Math.random() * 0.04);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x88a0c0, size: 0.05, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    this.dust = new THREE.Points(geo, mat);
    this.dust.userData.vel = vel;
    this.scene.add(this.dust);
  }

  _buildViewModel() {
    // 右下角的枪/手臂，作为相机子物体
    const grp = new THREE.Group();
    // 手臂
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.8 }));
    arm.position.set(0.28, -0.26, -0.5); grp.add(arm);
    // 枪身
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.5), new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.7, roughness: 0.3 }));
    gun.position.set(0.28, -0.22, -0.7); grp.add(gun);
    // 枪管
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.8 }));
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0.28, -0.22, -0.95); grp.add(barrel);
    // 枪口闪光（默认隐藏）
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0 }));
    flash.position.set(0.28, -0.22, -1.15); grp.add(flash);
    this.muzzleFlashMesh = flash;
    grp.visible = false; // 拿到枪后显示
    this.camera.add(grp);
    this.scene.add(this.camera);
    this.gunViewModel = grp;
  }

  _findChar(ch) { for (let y = 0; y < MAP_H; y++) { const x = MAP[y].indexOf(ch); if (x >= 0) return { x, y }; } return { x: 1, y: 1 }; }

  _spawnGun(w) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.6), new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.7, roughness: 0.3 }));
    g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.8 }));
    barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.4; g.add(barrel);
    // 握把
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 }));
    grip.position.set(0, -0.16, 0.18); grip.rotation.x = 0.3; g.add(grip);
    // 光环提示
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 20), new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.55; g.add(halo);
    g.position.set(w.x, 0.6, w.z); g.userData = { type: 'gun', taken: false, baseY: 0.6 };
    this.scene.add(g); this.pickups.push(g);
  }

  _spawnPickup(w, type) {
    const color = type === 'ammo' ? 0xddaa30 : 0xcc3333;
    const grp = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.5 }));
    grp.add(m);
    // 光环
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 18), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.25; grp.add(ring);
    grp.position.set(w.x, 0.5, w.z); grp.userData = { type, taken: false, baseY: 0.5 };
    this.scene.add(grp); this.pickups.push(grp);
  }

  // 裂隙之钥：推进关卡的关键道具，必须拾取后才能通过出口
  _spawnKeyItem(w) {
    const grp = new THREE.Group();
    // 八面体核心（金色发光）
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28),
      new THREE.MeshStandardMaterial({ color: 0xffdd66, emissive: 0xffaa22, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2 })
    );
    grp.add(core);
    // 外环
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.7 }));
    ring.rotation.x = Math.PI / 2; grp.add(ring);
    // 地面光圈
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.65, 24), new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.45; grp.add(halo);
    const pl = new THREE.PointLight(0xffcc44, 1.5, 4); pl.position.y = 0.3; grp.add(pl);
    grp.position.set(w.x, 0.7, w.z); grp.userData = { type: 'key', taken: false, baseY: 0.7 };
    this.scene.add(grp); this.pickups.push(grp);
  }

  _spawnEnemy(w) {
    const grp = new THREE.Group();
    // 主体（多面体，更精细 subdivision 2）
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), new THREE.MeshStandardMaterial({ color: 0x55dd55, emissive: 0x33aa33, emissiveIntensity: 0.7, roughness: 0.35, transparent: true, opacity: 0.88 }));
    grp.add(body);
    // 内核（更亮的小球）
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshBasicMaterial({ color: 0xaaffaa }));
    grp.add(core);
    // 眼睛
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x002200 });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat); e1.position.set(-0.16, 0.06, 0.4); grp.add(e1);
    const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat); e2.position.set(0.16, 0.06, 0.4); grp.add(e2);
    // 眼内高光
    const hl = new THREE.MeshBasicMaterial({ color: 0x88ff88 });
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), hl); h1.position.set(-0.14, 0.08, 0.46); grp.add(h1);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), hl); h2.position.set(0.18, 0.08, 0.46); grp.add(h2);
    const light = new THREE.PointLight(0x55dd55, 1.4, 4.5); grp.add(light);
    grp.position.set(w.x, 0.9, w.z);
    this.scene.add(grp);
    this.enemies.push({ mesh: grp, body, core, hp: 100, maxHp: 100, alive: true, speed: 1.6 + Math.random() * 0.8, hitFlash: 0, attackCD: 0, t: Math.random() * 6 });
  }

  // ============================================
  // HUD（DOM overlay）
  // ============================================
  _buildHUD() {
    this.hud = document.createElement('div');
    Object.assign(this.hud.style, { position: 'fixed', inset: '0', zIndex: '60', pointerEvents: 'none', fontFamily: 'monospace' });
    this.hud.innerHTML = `
      <div id="l3d_crosshair" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);">
        <div style="position:absolute;left:-9px;top:-1px;width:7px;height:2px;background:rgba(255,255,255,0.8);"></div>
        <div style="position:absolute;left:3px;top:-1px;width:7px;height:2px;background:rgba(255,255,255,0.8);"></div>
        <div style="position:absolute;left:-1px;top:-9px;width:2px;height:7px;background:rgba(255,255,255,0.8);"></div>
        <div style="position:absolute;left:-1px;top:3px;width:2px;height:7px;background:rgba(255,255,255,0.8);"></div>
        <div style="position:absolute;left:-2px;top:-2px;width:4px;height:4px;background:rgba(255,120,120,0.9);border-radius:50%;"></div>
      </div>
      <div style="position:absolute;left:20px;bottom:20px;color:#e8d8b8;font-size:14px;">
        <div id="l3d_hp"></div>
        <div id="l3d_ammo" style="margin-top:6px;"></div>
        <div id="l3d_key" style="margin-top:6px;color:#ffcc44;"></div>
      </div>
      <div id="l3d_hint" style="position:absolute;left:50%;bottom:60px;transform:translateX(-50%);color:#88ccff;font-size:13px;text-shadow:0 0 4px #000;"></div>
      <div id="l3d_pause" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);color:#ddd;font-size:20px;cursor:pointer;">点击恢复</div>
    `;
    document.body.appendChild(this.hud);
  }

  _updateHUD() {
    const hpEl = this.hud.querySelector('#l3d_hp');
    hpEl.textContent = `理性 ${Math.ceil(this.hp)}/${this.maxHp}`;
    hpEl.style.color = this.hp > this.maxHp * 0.4 ? '#7ad07a' : '#d04040';
    this.hud.querySelector('#l3d_ammo').textContent = this.gun.have ? `弹药 ${this.gun.ammo}` : '无武器';
    const keyEl = this.hud.querySelector('#l3d_key');
    keyEl.textContent = this.hasKey ? '🔑 裂隙之钥 已获得' : '🔒 出口被维度锁封住';
    keyEl.style.color = this.hasKey ? '#ffdd66' : '#888';
    this.hud.querySelector('#l3d_hint').textContent = this._hintText;
    this.hud.querySelector('#l3d_pause').style.display = this._paused ? 'flex' : 'none';
  }

  // ============================================
  // 更新
  // ============================================
  update(dt, input) {
    if (this.done || this.disposed) return;
    input.tick();
    const locked = input.isPointerLocked();
    this._paused = !locked;

    if (!locked) {
      if (input.mousePressed()) { try { this.canvas.requestPointerLock(); } catch (e) {} }
      this._updateHUD();
      return;
    }

    // === 视角 ===
    const mv = input.mouseMovement();
    this.yaw -= mv.x * 0.0024;
    this.pitch -= mv.y * 0.0024;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));

    // === 移动 ===
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const rgt = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (input.isDown('w')) move.sub(fwd);
    if (input.isDown('s')) move.add(fwd);
    if (input.isDown('a')) move.sub(rgt);
    if (input.isDown('d')) move.add(rgt);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(SPEED * dt / 1000);
      this._tryMove(move.x, move.z);
    }

    // === 射击 ===
    if (this.shootCD > 0) this.shootCD -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
    if (input.mousePressed() && this.gun.have && this.gun.ammo > 0 && this.shootCD <= 0) {
      this._shoot();
    } else if (input.mousePressed() && (!this.gun.have || this.gun.ammo <= 0)) {
      this._hintText = this.gun.have ? '弹药耗尽！寻找补给' : '你需要一把武器';
    }
    // 枪口闪光衰减
    if (this.muzzleFlashMesh) {
      this.muzzleFlashMesh.material.opacity = Math.max(0, this.muzzleFlash / 80);
      const s = 1 + (this.muzzleFlash / 80) * 0.8;
      this.muzzleFlashMesh.scale.set(s, s, s);
    }

    // === 怪物 AI ===
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.attackCD > 0) e.attackCD -= dt;
      e.t += dt * 0.001;
      const dir = new THREE.Vector3(this.pos.x - e.mesh.position.x, 0, this.pos.z - e.mesh.position.z);
      const dist = dir.length();
      if (dist < 14 && dist > 0.6) {
        dir.normalize();
        const nx = e.mesh.position.x + dir.x * e.speed * dt / 1000;
        const nz = e.mesh.position.z + dir.z * e.speed * dt / 1000;
        if (this._canGo(nx, nz)) { e.mesh.position.x = nx; e.mesh.position.z = nz; }
        e.mesh.lookAt(this.pos.x, e.mesh.position.y, this.pos.z);
      }
      if (dist < 1.0 && e.attackCD <= 0) {
        this.hp = Math.max(0, this.hp - 10);
        e.attackCD = 800;
        this.hurtFlash = 400;
        if (this.hp <= 0) { this._onDeath(); return; }
      }
      e.mesh.position.y = 0.9 + Math.sin(performance.now() * 0.003 + e.mesh.position.x) * 0.12;
      // 旋转内核
      if (e.core) { e.core.rotation.y += dt * 0.003; e.core.rotation.x += dt * 0.002; }
      if (e.hitFlash > 0) e.body.material.emissiveIntensity = 1.6;
      else e.body.material.emissiveIntensity = 0.7 + Math.sin(e.t * 4) * 0.15;
    }

    // === 物资拾取 ===
    for (const p of this.pickups) {
      if (p.userData.taken) continue;
      p.rotation.y += dt * 0.003;
      p.position.y = p.userData.baseY + Math.sin(performance.now() * 0.003) * 0.1;
      const d = Math.hypot(p.position.x - this.pos.x, p.position.z - this.pos.z);
      if (d < 0.8) {
        p.userData.taken = true;
        this.scene.remove(p);
        if (p.userData.type === 'gun') {
          this.gun.have = true; this.gun.ammo = 15; this._hintText = '捡到「刻字枪」！左键射击';
          if (this.gunViewModel) this.gunViewModel.visible = true;
        } else if (p.userData.type === 'ammo') {
          this.gun.ammo = Math.min(this.gun.maxAmmo, this.gun.ammo + 10); this._hintText = '弹药 +10';
        } else if (p.userData.type === 'health') {
          this.hp = Math.min(this.maxHp, this.hp + 25); this._hintText = '理性 +25';
        } else if (p.userData.type === 'key') {
          this.hasKey = true; this._hintText = '获得「裂隙之钥」！现在可以穿过出口了。';
        }
      }
    }

    // === 出口检测（需持有裂隙之钥）===
    const dex = Math.hypot(this.exitPos.x - this.pos.x, this.exitPos.z - this.pos.z);
    if (dex < 1.2 && !this.exitReached) {
      if (!this.hasKey) {
        if (!this._keyWarned) { this._keyWarned = true; this._hintText = '出口被维度锁封住。需要找到「裂隙之钥」才能通过。'; }
      } else {
        this.exitReached = true;
        this._hintText = '裂隙之钥共鸣！穿过维度裂隙，回到地铁站……';
        this.done = true;
      }
    }
    if (this.exitMesh) this.exitMesh.rotation.y += dt * 0.001;
    if (this.exitRing) this.exitRing.rotation.z += dt * 0.002;

    // === 浮尘更新 ===
    if (this.dust) {
      const pos = this.dust.geometry.attributes.position;
      const vel = this.dust.userData.vel;
      for (let i = 0; i < vel.length; i++) {
        pos.array[i * 3 + 1] += vel[i] * dt / 16;
        if (pos.array[i * 3 + 1] > 3.0) pos.array[i * 3 + 1] = 0;
      }
      pos.needsUpdate = true;
    }

    // === 壁灯呼吸 ===
    for (const l of this.lights) {
      l.light.intensity = l.base + Math.sin(performance.now() * 0.003 + l.grp.position.x) * 0.3;
    }

    // === 受伤闪烁衰减 ===
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    // === 相机同步 ===
    this.camera.position.copy(this.pos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // === 视图模型摆动（走路时）===
    if (this.gunViewModel && this.gunViewModel.visible) {
      const moving = move.lengthSq() > 0;
      const sway = moving ? Math.sin(performance.now() * 0.012) * 0.012 : 0;
      this.gunViewModel.position.y = sway;
      this.gunViewModel.position.x = moving ? Math.cos(performance.now() * 0.012) * 0.008 : 0;
    }

    this._updateHUD();
  }

  _tryMove(dx, dz) {
    if (this._canGo(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
    if (this._canGo(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
  }

  _canGo(x, z) {
    for (const [ox, oz] of [[-PLAYER_R, -PLAYER_R], [PLAYER_R, -PLAYER_R], [-PLAYER_R, PLAYER_R], [PLAYER_R, PLAYER_R]]) {
      const gx = Math.floor((x + ox - ORIGIN_X) / CELL);
      const gz = Math.floor((z + oz - ORIGIN_Z) / CELL);
      if (isWall(gx, gz)) return false;
    }
    return true;
  }

  _shoot() {
    this.gun.ammo--;
    this.shootCD = SHOOT_CD;
    this.muzzleFlash = 80;
    this._hintText = '';
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = GUN_RANGE;
    const targets = this.enemies.filter(e => e.alive).map(e => e.mesh);
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && !this._findEnemyByMesh(obj)) obj = obj.parent;
      const e = this._findEnemyByMesh(obj);
      if (e) {
        e.hp -= BULLET_DMG;
        e.hitFlash = 150;
        if (e.hp <= 0) {
          e.alive = false;
          this.scene.remove(e.mesh);
          this._hintText = '击破一只梗鬼！';
        }
      }
    }
    // 弹道线（短暂）
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.camera.position.clone();
    const end = origin.clone().add(dir.multiplyScalar(GUN_RANGE));
    const lineGeo = new THREE.BufferGeometry().setFromPoints([origin.clone().add(dir.clone().normalize().multiplyScalar(0.5)), end]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0.5 }));
    this.scene.add(line);
    setTimeout(() => { if (!this.disposed) this.scene.remove(line); }, 60);
  }

  _findEnemyByMesh(mesh) {
    for (const e of this.enemies) { if (e.alive && (e.mesh === mesh || e.body === mesh || (e.core && e.core === mesh))) return e; }
    return null;
  }

  _onDeath() {
    this.done = true;
    this._dead = true;
    this.game.showHint('你在维度裂隙中倒下了……');
  }

  isDead() { return !!this._dead; }
  isDone() { return this.done; }

  // ============================================
  // 渲染
  // ============================================
  render() {
    if (this.disposed) return;
    // 受伤红屏（通过 fog 颜色模拟），平时保持提亮
    if (this.hurtFlash > 0) {
      const u = this.hurtFlash / 400;
      this.scene.fog.color.setRGB(0.4 * u + 0.086 * (1 - u), 0.1 * u + 0.094 * (1 - u), 0.1 * u + 0.157 * (1 - u));
      this.scene.background.copy(this.scene.fog.color);
    } else {
      this.scene.fog.color.setRGB(0.086, 0.094, 0.157);
      this.scene.background.setRGB(0.086, 0.094, 0.157);
    }
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    if (this.disposed) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
    window.removeEventListener('resize', this._resize);
    if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
    if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.renderer.dispose();
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
    });
  }
}
