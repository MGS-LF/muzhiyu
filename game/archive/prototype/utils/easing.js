export const EASINGS = {
    linear: t => t,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutBack: t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeOutElastic: t => {
        const c4 = (2 * Math.PI) / 3;
        if (t === 0) return 0;
        if (t >= 1) return 1;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

export function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function rand(min, max) {
    return Math.random() * (max - min) + min;
}

export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
