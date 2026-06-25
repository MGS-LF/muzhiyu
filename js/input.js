// 输入管理
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!keys[k]) justPressed[k] = true;
  keys[k] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

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
};
