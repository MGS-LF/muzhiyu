// 输入管理
const keys = {};
const justPressed = {};

// 鼠标状态
const mouse = {
  x: 0,
  y: 0, // 相对视口的坐标
  canvasX: 0,
  canvasY: 0, // 相对 canvas 的坐标
  down: false, // 左键当前是否按下
  pressed: false, // 左键本帧是否刚按下（单次触发）
  movementX: 0,
  movementY: 0, // pointer lock 偏移量（每帧消费）
  rightDown: false,
};

const touchMove = { x: 0, y: 0 };
let mobileControlsMounted = false;

// 焦点在输入框/文本域时，完全不拦截（供Sydney对话的文字输入使用）
function inField(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

window.addEventListener('keydown', (e) => {
  if (inField(e)) return;
  const k = e.key.toLowerCase();
  if (!keys[k]) justPressed[k] = true;
  keys[k] = true;
  if (
    ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'backspace', 'tab', 'f2', 'f4', 'f6', 'f9'].includes(k)
  )
    e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  if (inField(e)) return;
  keys[e.key.toLowerCase()] = false;
});
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
});

function pressKey(k) {
  const key = k.toLowerCase();
  if (!keys[key]) justPressed[key] = true;
  keys[key] = true;
}

function releaseKey(k) {
  keys[k.toLowerCase()] = false;
}

// 鼠标事件
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (document.pointerLockElement) {
    mouse.movementX += e.movementX || 0;
    mouse.movementY += e.movementY || 0;
  }
});
window.addEventListener('mousedown', (e) => {
  if (inField(e)) return;
  if (e.button === 0) {
    if (!mouse.down) mouse.pressed = true;
    mouse.down = true;
  } else if (e.button === 2) {
    mouse.rightDown = true;
  }
});
window.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.down = false;
  else if (e.button === 2) mouse.rightDown = false;
});
window.addEventListener('contextmenu', (e) => {
  // 3D 模式下禁用右键菜单
  if (document.pointerLockElement) e.preventDefault();
});
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) {
    mouse.down = false;
    mouse.rightDown = false;
  }
});

// 供外部更新 canvas 相对坐标（每帧由 Game 调用）
let _canvas = null;
export function bindCanvas(canvas) {
  _canvas = canvas;
  mountMobileControls();
}
function refreshCanvasCoord() {
  if (!_canvas) return;
  const r = _canvas.getBoundingClientRect();
  const W = 1200; // 游戏的固定逻辑画布宽度
  const H = 760;  // 游戏的固定逻辑画布高度
  mouse.canvasX = (mouse.x - r.left) * (W / r.width);
  mouse.canvasY = (mouse.y - r.top) * (H / r.height);
}

function mountMobileControls() {
  if (mobileControlsMounted || typeof document === 'undefined') return;
  mobileControlsMounted = true;
  const wrap = document.getElementById('wrap') || document.body;
  const root = document.createElement('div');
  root.id = 'mobile-controls';
  root.innerHTML = `
    <div id="joystick-zone" aria-label="移动摇杆"><div id="joystick-knob"></div></div>
    <button id="action-zone" type="button" aria-label="交互">E</button>
    <button id="ultimate-zone" type="button" aria-label="诗词大招">K</button>
    <button id="jump-zone" type="button" aria-label="跳跃或冲刺">Space</button>
    <button id="settings-zone" type="button" aria-label="设置">O</button>
  `;
  const style = document.createElement('style');
  style.textContent = `
    #mobile-controls{position:absolute;inset:0;z-index:9;pointer-events:none}
    #joystick-zone,#action-zone,#jump-zone,#ultimate-zone,#settings-zone{display:none}
    @media (pointer:coarse){
      #joystick-zone,#action-zone,#jump-zone,#ultimate-zone,#settings-zone{display:block;position:absolute;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none}
      #joystick-zone{left:max(18px,env(safe-area-inset-left));bottom:max(20px,env(safe-area-inset-bottom));width:132px;height:132px;border:2px solid rgba(255,220,160,.26);border-radius:50%;background:rgba(0,0,0,.24)}
      #joystick-knob{position:absolute;left:50%;top:50%;width:46px;height:46px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(255,220,160,.28);box-shadow:0 0 18px rgba(255,210,120,.18)}
      #action-zone,#jump-zone,#ultimate-zone,#settings-zone{right:max(20px,env(safe-area-inset-right));width:82px;height:82px;border-radius:50%;border:1px solid rgba(255,220,160,.42);color:rgba(255,235,190,.9);background:rgba(0,0,0,.38);font:700 14px serif;letter-spacing:.02em}
      #action-zone{bottom:calc(max(20px,env(safe-area-inset-bottom)) + 184px)}
      #ultimate-zone{bottom:calc(max(20px,env(safe-area-inset-bottom)) + 92px)}
      #jump-zone{bottom:max(20px,env(safe-area-inset-bottom))}
      #settings-zone{right:auto;left:max(22px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));width:54px;height:54px;font-size:16px}
    }
  `;
  document.head.appendChild(style);
  wrap.appendChild(root);

  const joy = /** @type {HTMLElement} */ (root.querySelector('#joystick-zone'));
  const knob = /** @type {HTMLElement} */ (root.querySelector('#joystick-knob'));
  const action = /** @type {HTMLElement} */ (root.querySelector('#action-zone'));
  const ultimate = /** @type {HTMLElement} */ (root.querySelector('#ultimate-zone'));
  const jump = /** @type {HTMLElement} */ (root.querySelector('#jump-zone'));
  const settings = /** @type {HTMLElement} */ (root.querySelector('#settings-zone'));
  let joyPointer = null;

  const setStick = (clientX, clientY) => {
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width / 2 - 24;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    touchMove.x = Math.abs(dx) < 8 ? 0 : dx / max;
    touchMove.y = Math.abs(dy) < 8 ? 0 : dy / max;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  const clearStick = () => {
    touchMove.x = 0;
    touchMove.y = 0;
    joyPointer = null;
    knob.style.transform = 'translate(-50%,-50%)';
  };

  joy.addEventListener('pointerdown', (e) => {
    joyPointer = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    setStick(e.clientX, e.clientY);
    e.preventDefault();
  });
  joy.addEventListener('pointermove', (e) => {
    if (joyPointer === e.pointerId) setStick(e.clientX, e.clientY);
    e.preventDefault();
  });
  joy.addEventListener('pointerup', clearStick);
  joy.addEventListener('pointercancel', clearStick);

  const bindButton = (el, key) => {
    const down = (e) => {
      pressKey(key);
      e.preventDefault();
    };
    const up = (e) => {
      releaseKey(key);
      e.preventDefault();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  };
  bindButton(action, 'e');
  bindButton(ultimate, 'k');
  bindButton(jump, ' ');
  bindButton(settings, 'o');
}

const KEY_ALIASES = { ctrl: 'control', esc: 'escape' };
function normKey(k) {
  const key = k.toLowerCase();
  return KEY_ALIASES[key] || key;
}

export const input = {
  isDown(k) {
    const key = normKey(k);
    if (key === 'w' || key === 'arrowup') return !!keys[key] || touchMove.y < -0.35;
    if (key === 's' || key === 'arrowdown') return !!keys[key] || touchMove.y > 0.35;
    if (key === 'a' || key === 'arrowleft') return !!keys[key] || touchMove.x < -0.35;
    if (key === 'd' || key === 'arrowright') return !!keys[key] || touchMove.x > 0.35;
    return !!keys[key];
  },
  wasPressed(k) {
    const key = normKey(k);
    const v = !!justPressed[key];
    justPressed[key] = false;
    return v;
  },
  moveVec() {
    let x = 0,
      y = 0;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    if (touchMove.x || touchMove.y) {
      x = touchMove.x;
      y = touchMove.y;
    }
    return { x, y };
  },
  // 鼠标 API
  tick() {
    refreshCanvasCoord();
  },
  mousePressed() {
    const v = mouse.pressed;
    mouse.pressed = false;
    return v;
  },
  mouseMovement() {
    const m = { x: mouse.movementX, y: mouse.movementY };
    mouse.movementX = 0;
    mouse.movementY = 0;
    return m;
  },
  isPointerLocked() {
    return !!document.pointerLockElement;
  },
};
