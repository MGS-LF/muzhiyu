const AudioSys = (() => {
    let ctx = null;
    let enabled = true;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }

    function resume() {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();
    }

    function tone(freq, dur, type = 'square', vol = 0.05, fade = true) {
        if (!enabled) return;
        resume();
        const c = getCtx();
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, c.currentTime);
        g.gain.setValueAtTime(vol, c.currentTime);
        if (fade) g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        o.connect(g).connect(c.destination);
        o.start();
        o.stop(c.currentTime + dur);
    }

    function pop(freq = 440) { tone(freq, 0.08, 'square', 0.06); }
    function collect() { tone(880, 0.12, 'sine', 0.05); setTimeout(() => tone(1320, 0.12, 'sine', 0.05), 60); }
    function hit() { tone(120, 0.25, 'sawtooth', 0.1); }
    function snap() { tone(220, 0.18, 'square', 0.08); }
    function heartbeat() { tone(60, 0.3, 'sine', 0.08); }
    function thud() { tone(80, 0.2, 'sawtooth', 0.08); }
    function ding() { tone(1760, 0.3, 'sine', 0.05); }

    function noise(duration, vol = 0.08) {
        if (!enabled) return;
        resume();
        const c = getCtx();
        const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * vol;
        const s = c.createBufferSource();
        s.buffer = buffer;
        const g = c.createGain();
        g.gain.setValueAtTime(vol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        s.connect(g).connect(c.destination);
        s.start();
    }

    return { tone, pop, collect, hit, snap, heartbeat, thud, ding, noise, resume };
})();

export default AudioSys;
