// 输入管理
const keys = {};
const justPressed = {};

// 鼠标状态
const mouse = {
  x: 0, y: 0,            // 相对视口的坐标
  canvasX: 0, canvasY: 0, // 相对 canvas 的坐标
  down: false,            // 左键当前是否按下
  pressed: false,         // 左键本帧是否刚按下（单次触发）
  movementX: 0, movementY: 0, // pointer lock 偏移量（每帧消费）
  rightDown: false,
};

// 焦点在输入框/文本域时，完全不拦截（供Sydney对话的文字输入使用）
function inField(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

window.addEventListener('keydown', e => {
  if (inField(e)) return;
  const k = e.key.toLowerCase();
  if (!keys[k]) justPressed[k] = true;
  keys[k] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' ','backspace','tab'].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => { if (inField(e)) return; keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });

// 鼠标事件
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (document.pointerLockElement) {
    mouse.movementX += e.movementX || 0;
    mouse.movementY += e.movementY || 0;
  }
});
window.addEventListener('mousedown', e => {
  if (inField(e)) return;
  if (e.button === 0) {
    if (!mouse.down) mouse.pressed = true;
    mouse.down = true;
  } else if (e.button === 2) {
    mouse.rightDown = true;
  }
});
window.addEventListener('mouseup', e => {
  if (e.button === 0) mouse.down = false;
  else if (e.button === 2) mouse.rightDown = false;
});
window.addEventListener('contextmenu', e => {
  // 3D 模式下禁用右键菜单
  if (document.pointerLockElement) e.preventDefault();
});
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) { mouse.down = false; mouse.rightDown = false; }
});

// 供外部更新 canvas 相对坐标（每帧由 Game 调用）
let _canvas = null;
export function bindCanvas(canvas) { _canvas = canvas; }
function refreshCanvasCoord() {
  if (!_canvas) return;
  const r = _canvas.getBoundingClientRect();
  mouse.canvasX = (mouse.x - r.left) * (_canvas.width / r.width);
  mouse.canvasY = (mouse.y - r.top) * (_canvas.height / r.height);
}

export const input = {
  isDown(k) { return !!keys[k.toLowerCase()]; },
  wasPressed(k) {
    const v = !!justPressed[k.toLowerCase()];
    justPressed[k.toLowerCase()] = false;
    return v;
  },
  moveVec() {
    let x = 0, y = 0;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    return { x, y };
  },
  // 鼠标 API
  tick() { refreshCanvasCoord(); },
  mouseDown() { return mouse.down; },
  mousePressed() { const v = mouse.pressed; mouse.pressed = false; return v; },
  rightMouseDown() { return mouse.rightDown; },
  mouseX() { return mouse.canvasX; },
  mouseY() { return mouse.canvasY; },
  mouseMovement() {
    const m = { x: mouse.movementX, y: mouse.movementY };
    mouse.movementX = 0; mouse.movementY = 0;
    return m;
  },
  isPointerLocked() { return !!document.pointerLockElement; },
  requestPointerLock(el) { if (el.requestPointerLock) el.requestPointerLock(); },
  exitPointerLock() { if (document.exitPointerLock) document.exitPointerLock(); },
};
