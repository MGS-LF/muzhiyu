export function setPixelFont(ctx, size = 16) {
    ctx.font = `${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
}

export function clear(ctx, width, height, color = '#000') {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
}

export function shake(ctx, intensity) {
    if (intensity <= 0) return;
    const dx = (Math.random() - 0.5) * intensity;
    const dy = (Math.random() - 0.5) * intensity;
    ctx.save();
    ctx.translate(dx, dy);
}

export function restoreShake(ctx, intensity) {
    if (intensity > 0) ctx.restore();
}

export function drawLine(ctx, x1, y1, x2, y2, color = '#fff', width = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

export function drawRect(ctx, x, y, w, h, color = '#fff', fill = false) {
    if (fill) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
    } else {
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, w, h);
    }
}

export function drawText(ctx, text, x, y, color = '#fff', size = 16, align = 'center') {
    setPixelFont(ctx, size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
}

export function drawGlowText(ctx, text, x, y, color, size, glow = 16) {
    ctx.save();
    setPixelFont(ctx, size);
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
}

export function drawCircle(ctx, x, y, r, color = '#fff', fill = false) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = color;
        ctx.fill();
    } else {
        ctx.strokeStyle = color;
        ctx.stroke();
    }
}

export function drawGlitchText(ctx, text, x, y, color, size, t) {
    ctx.save();
    setPixelFont(ctx, size);
    ctx.fillStyle = color;
    for (let i = 0; i < text.length; i++) {
        const offset = Math.sin(t * 0.1 + i * 0.7) * 3;
        ctx.fillText(text[i], x + (i - text.length / 2) * size + offset, y + Math.cos(t * 0.13 + i) * 2);
    }
    ctx.restore();
}
