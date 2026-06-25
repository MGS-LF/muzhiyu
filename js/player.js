// 玩家 — 火柴人
import { COLORS } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 6;
    this.speed = 1.8;
    this.runSpeed = 3.2;
    this.isMoving = false;
    this.direction = 'down';
    this.walkCycle = 0;
    this.blinkTimer = 3000;
    this.blinking = false;
    this.blinkEnd = 0;
    this.hasClothes = false;
  }

  update(dt, input, scene) {
    // 眨眼
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinking = true;
      this.blinkEnd = performance.now() + 150;
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
      this.walkCycle += dt * 0.012;

      const newX = this.x + nx * sp;
      if (!scene.collides(newX, this.y, this.r)) this.x = newX;
      const newY = this.y + ny * sp;
      if (!scene.collides(this.x, newY, this.r)) this.y = newY;
    }
  }

  draw(ctx, cam) {
    const s = cam.worldToScreen(this.x, this.y);
    const bob = this.isMoving ? Math.sin(this.walkCycle * 2) * 1 : 0;
    const bodyColor = this.hasClothes ? COLORS.bright : '#888';

    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';

    // 头
    ctx.beginPath();
    ctx.arc(s.x, s.y - 14 + bob, 4.5, 0, Math.PI * 2);
    ctx.stroke();
    // 眼睛
    if (!this.blinking) {
      ctx.fillStyle = bodyColor;
      ctx.fillRect(s.x - 1.5, s.y - 15 + bob, 1, 1);
      ctx.fillRect(s.x + 0.5, s.y - 15 + bob, 1, 1);
    }
    // 身体
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 10 + bob);
    ctx.lineTo(s.x, s.y + 3 + bob);
    ctx.stroke();
    // 手臂
    const armSwing = this.isMoving ? Math.sin(this.walkCycle * 2) * 3 : 0;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 6 + bob);
    ctx.lineTo(s.x - 5, s.y + bob + armSwing);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 6 + bob);
    ctx.lineTo(s.x + 5, s.y + bob - armSwing);
    ctx.stroke();
    // 腿
    const leg1 = this.isMoving ? Math.sin(this.walkCycle * 2) * 4 : 0;
    const leg2 = this.isMoving ? Math.sin(this.walkCycle * 2 + Math.PI) * 4 : 0;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + 3 + bob);
    ctx.lineTo(s.x - 3 + leg1, s.y + 13 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + 3 + bob);
    ctx.lineTo(s.x + 3 + leg2, s.y + 13 + bob);
    ctx.stroke();
  }
}
