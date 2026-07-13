// 玩家 — 精致小人
import { PACE } from './pacing.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 7;
    this.speed = PACE.exploration.walkSpeed;
    this.runSpeed = PACE.exploration.runSpeed;
    this.isMoving = false;
    this.direction = 'down';
    this.walkCycle = 0;
    this.blinkTimer = 3000;
    this.blinking = false;
    this.blinkEnd = 0;
    this.hasClothes = false;
    // 以下属性由 Game 在运行时赋值，此处声明默认值以便类型检查与安全访问
    this.san = 100;
    this.maxSan = 100;
    this.collectedChars = [];
    this.collectedCharsAll = [];
    this.inventory = [];
    this.diaries = new Set();
    this.seeds = 0;
    this.ngPlus = false;
    this.invulnerable = 0;
    this.hurtFlash = false;
    this.dialogGrace = 0;
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
    let sp = isRun ? this.runSpeed : this.speed;
    // 屏幕墙减速：若场景对象提供 getSpeedMul()，应用减速倍率
    if (scene && typeof scene.getSpeedMul === 'function') {
      sp *= scene.getSpeedMul();
    }
    this.isMoving = mv.x !== 0 || mv.y !== 0;

    if (this.isMoving) {
      const len = Math.hypot(mv.x, mv.y) || 1;
      const nx = mv.x / len,
        ny = mv.y / len;
      if (Math.abs(nx) > Math.abs(ny)) this.direction = nx > 0 ? 'right' : 'left';
      else this.direction = ny > 0 ? 'down' : 'up';
      this.walkCycle += dt * 0.014 * (isRun ? 1.6 : 1);

      // 帧率无关位移：以 60fps 为基准，确保不同刷新率下手感一致、平滑可控
      const step = sp * (dt / 16.67);
      const newX = this.x + nx * step;
      if (!scene.collides(newX, this.y, this.r)) this.x = newX;
      const newY = this.y + ny * step;
      if (!scene.collides(this.x, newY, this.r)) this.y = newY;
    }
  }

  draw(ctx, cam, gameTime, isInvulnerable) {
    const s = cam.worldToScreen(this.x, this.y);
    const bob = this.isMoving
      ? Math.sin(this.walkCycle * 2) * 1.5
      : Math.sin(gameTime * 0.003) * 0.4;
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
    const bodyColor = this.hasClothes ? '#4e5156' : '#ece5d8'; // 焦炭墨灰 / 浅米灰冬眠服
    const trimColor = this.hasClothes ? '#36383c' : '#c5bcae'; // 褶皱/接缝辅色
    const gearColor = '#5c4e40'; // 战术皮带绑带褐色
    const goldLockColor = '#e0b262'; // 鎏金合金扣
    const gloveColor = '#322e2a'; // 战术手套
    const headColor = '#ecdab9'; // 羊脂玉肤色
    const hairColor = '#2a2018'; // 暗褐黑发
    const bootColor = this.hasClothes ? '#24201c' : '#ecdab9'; // 生存短靴 / 赤脚肤色

    // === 腿 ===
    const legSwing = this.isMoving ? Math.sin(this.walkCycle * 2) * 5 : 0;
    const legSwing2 = this.isMoving ? Math.sin(this.walkCycle * 2 + Math.PI) * 5 : 0;
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy - 2);
    ctx.lineTo(sx - 4 + legSwing, sy + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx + 3, sy - 2);
    ctx.lineTo(sx + 4 + legSwing2, sy + 10);
    ctx.stroke();
    // 鞋子或赤脚
    ctx.fillStyle = bootColor;
    ctx.beginPath();
    if (this.hasClothes) {
      // 生存靴
      ctx.ellipse(sx - 4 + legSwing, sy + 10, 3, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + 4 + legSwing2, sy + 10, 3, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // 鞋底轮廓
      ctx.fillStyle = '#141210';
      ctx.fillRect(sx - 7 + legSwing, sy + 10.8, 5, 1);
      ctx.fillRect(sx + 1 + legSwing2, sy + 10.8, 5, 1);
    } else {
      // 赤脚
      ctx.ellipse(sx - 4 + legSwing, sy + 10, 2.2, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + 4 + legSwing2, sy + 10, 2.2, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // === 躯干 ===
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(sx - 5, sy - 6);
    ctx.lineTo(sx - 6, sy + 0);
    ctx.lineTo(sx + 6, sy + 0);
    ctx.lineTo(sx + 5, sy - 6);
    ctx.closePath();
    ctx.fill();

    // 衣物折痕与拼色细节
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy - 6);
    ctx.lineTo(sx - 3, sy); // 左缝线
    ctx.moveTo(sx + 3, sy - 6);
    ctx.lineTo(sx + 3, sy); // 右缝线
    ctx.stroke();

    if (this.hasClothes) {
      // 右胸口袋与拉链点
      ctx.fillStyle = '#3f4246';
      ctx.fillRect(sx + 1, sy - 5, 3.5, 2.5);
      ctx.fillStyle = '#9aa0a6';
      ctx.fillRect(sx + 1, sy - 5.5, 2, 0.6); // 拉链头

      // 斜跨战术背带
      ctx.strokeStyle = gearColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy - 5);
      ctx.lineTo(sx + 5, sy - 1);
      ctx.stroke();

      // 发光鎏金扣
      ctx.fillStyle = goldLockColor;
      ctx.beginPath();
      ctx.arc(sx, sy - 3, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 腰带
      ctx.fillStyle = trimColor;
      ctx.fillRect(sx - 6, sy - 1.5, 12, 1.5);
    } else {
      // 病服衣领
      ctx.fillStyle = trimColor;
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy - 6);
      ctx.lineTo(sx, sy - 3);
      ctx.lineTo(sx + 3, sy - 6);
      ctx.stroke();
    }

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
    // 手 (手套或肉色)
    ctx.fillStyle = this.hasClothes ? gloveColor : headColor;
    ctx.beginPath();
    ctx.arc(sx - 8, sy + 2 + armSwing, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
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

    // 头发与碎发
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(sx, sy - 13, 5, Math.PI, 0);
    ctx.lineTo(sx + 4, sy - 11);
    ctx.lineTo(sx - 4, sy - 11);
    ctx.closePath();
    ctx.fill();

    // 凌乱翘起碎发
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy - 17);
    ctx.quadraticCurveTo(sx - 4, sy - 18, sx - 5, sy - 16);
    ctx.moveTo(sx + 1, sy - 17.5);
    ctx.quadraticCurveTo(sx + 3, sy - 19, sx + 2, sy - 15);
    ctx.stroke();

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
