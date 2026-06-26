// 输入管理
const keys = {};
const justPressed = {};

// 焦点在输入框/文本域时，完全不拦截（供听雨对话的文字输入使用）
function inField(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

window.addEventListener('keydown', e => {
  if (inField(e)) return;
  const k = e.key.toLowerCase();
  if (!keys[k]) justPressed[k] = true;
  keys[k] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' ','backspace'].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => { if (inField(e)) return; keys[e.key.toLowerCase()] = false; });
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
