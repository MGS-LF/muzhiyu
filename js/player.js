// 玩家 — 精致小人
import { COLORS } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 7;
    this.speed = 2.2;
    this.runSpeed = 3.6;
    this.isMoving = false;
    this.direction = 'down';
    this.walkCycle = 0;
    this.blinkTimer = 3000;
    this.blinking = false;
    this.blinkEnd = 0;
    this.hasClothes = false;
  }

  update(dt, input, scene) {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinking = true;
      this.blinkEnd = performance.now() + 140;
      this.blinkTimer = 2500 + Math.random() * 3000;
    }
    if (this.blinking && performance.now() > this.blinkEnd) this.blinking = false;

    const mv = input.moveVec();
    const isRun = input.isDown('shift');
    const sp = isRun ? this.runSpeed : this.speed;
    this.isMoving = mv.x !== 0 || mv.y !== 0;

    if (this.isMoving) {
      const len = Math.hypot(mv.x, mv.y) || 1;
      const nx = mv.x / len, ny = mv.y / len;
      if (Math.abs(nx) > Math.abs(ny)) this.direction = nx > 0 ? 'right' : 'left';
      else this.direction = ny > 0 ? 'down' : 'up';
      this.walkCycle += dt * 0.014 * (isRun ? 1.6 : 1);

      const newX = this.x + nx * sp;
      if (!scene.collides(newX, this.y, this.r)) this.x = newX;
      const newY = this.y + ny * sp;
      if (!scene.collides(this.x, newY, this.r)) this.y = newY;
    }
  }

  draw(ctx, cam, gameTime, isInvulnerable) {
    const s = cam.worldToScreen(this.x, this.y);
    const bob = this.isMoving ? Math.sin(this.walkCycle * 2) * 1.5 : Math.sin(gameTime * 0.003) * 0.4;
    const sx = Math.round(s.x);
    const sy = Math.round(s.y + bob);

    // 受伤闪烁
    if (isInvulnerable && Math.floor(gameTime / 80) % 2 === 0) return;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 4, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 配色
    const bodyColor = this.hasClothes ? '#5a6878' : '#aaa';
    const trimColor = this.hasClothes ? '#3a4858' : '#888';
    const headColor = '#e8c9a0';
    const hairColor = '#2a2018';

    // === 腿 ===
    const legSwing = this.isMoving ? Math.sin(this.walkCycle * 2) * 5 : 0;
    const legSwing2 = this.isMoving ? Math.sin(this.walkCycle * 2 + Math.PI) * 5 : 0;
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy - 2);
    ctx.lineTo(sx - 4 + legSwing, sy + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 3, sy - 2);
    ctx.lineTo(sx + 4 + legSwing2, sy + 10);
    ctx.stroke();
    // 靴子
    ctx.fillStyle = '#1a1612';
    ctx.beginPath();
    ctx.ellipse(sx - 4 + legSwing, sy + 10, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 4 + legSwing2, sy + 10, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // === 躯干 ===
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 6);
    ctx.lineTo(sx - 6, sy + 0);
    ctx.lineTo(sx + 6, sy + 0);
    ctx.lineTo(sx + 5, sy - 6);
    ctx.closePath();
    ctx.fill();
    // 衣领
    ctx.fillStyle = trimColor;
    ctx.fillRect(sx - 3, sy - 8, 6, 3);
    // 腰带
    ctx.fillStyle = trimColor;
    ctx.fillRect(sx - 6, sy - 4, 12, 1.5);

    // === 手臂 ===
    const armSwing = this.isMoving ? Math.sin(this.walkCycle * 2) * 4 : 0;
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 5);
    ctx.lineTo(sx - 8, sy + 2 + armSwing);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 5, sy - 5);
    ctx.lineTo(sx + 8, sy + 2 - armSwing);
    ctx.stroke();
    // 手
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(sx - 8, sy + 2 + armSwing, 1.5, 0, Math.PI * 2);
    ctx.arc(sx + 8, sy + 2 - armSwing, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // === 头 ===
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(sx, sy - 11, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a08860';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // 头发
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(sx, sy - 13, 5, Math.PI, 0);
    ctx.lineTo(sx + 4, sy - 11);
    ctx.lineTo(sx - 4, sy - 11);
    ctx.closePath();
    ctx.fill();
    // 眼睛
    if (!this.blinking) {
      ctx.fillStyle = '#1a1612';
      const eyeY = sy - 11;
      ctx.beginPath();
      ctx.arc(sx - 1.8, eyeY, 0.9, 0, Math.PI * 2);
      ctx.arc(sx + 1.8, eyeY, 0.9, 0, Math.PI * 2);
      ctx.fill();
      // 眼白
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx - 2.2, eyeY - 0.5, 0.6, 0.4);
      ctx.fillRect(sx + 1.4, eyeY - 0.5, 0.6, 0.4);
    } else {
      ctx.strokeStyle = '#1a1612';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx - 2.5, sy - 11);
      ctx.lineTo(sx - 1, sy - 11);
      ctx.moveTo(sx + 1, sy - 11);
      ctx.lineTo(sx + 2.5, sy - 11);
      ctx.stroke();
    }
    // 鼻子（小三角）
    ctx.fillStyle = 'rgba(160,120,90,0.4)';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 10);
    ctx.lineTo(sx - 0.6, sy - 8.5);
    ctx.lineTo(sx + 0.6, sy - 8.5);
    ctx.closePath();
    ctx.fill();

    // === 朝向指示（轻微）===
    if (this.direction === 'left' || this.direction === 'right') {
      // 朝向面颊略亮
      const cx = this.direction === 'right' ? 2 : -2;
      ctx.fillStyle = 'rgba(220,180,150,0.3)';
      ctx.beginPath();
      ctx.arc(sx + cx, sy - 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
