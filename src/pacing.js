// P2: gameplay pacing knobs. Keep feel-related timings together.
export const PACE = {
  exploration: {
    walkSpeed: 1.85,
    runSpeed: 3.05,
    dashDistance: 46,
    dashCooldown: 720,
    dashInvulnerable: 260,
    stompWindow: 230,
    sceneGraceMs: 1000,
    encounterGraceMs: 1800,
  },
  battle: {
    introMs: 420,
    actionResolveMs: 550,
    resultMs: 750,
    poemCastMs: 1400,
    ultimateMs: 1400,
    normalTurnMs: 2400,
    bossTurnMs: 5200,
    bossPhaseExtraMs: 1000,
    attackBarSpeed: 0.0038,
    // UT 弹幕统一降速；斩击与骇入使用各自参数，不受影响。
    utBulletSpeedMul: 0.82,
  },
  ambient: {
    firstDelayMs: 45000,
    cooldownMs: 35000,
    varianceMs: 25000,
    maxAmbientEnemies: 4,
  },
};
