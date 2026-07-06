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
    introMs: 520,
    actionResolveMs: 850,
    resultMs: 950,
    poemCastMs: 1900,
    ultimateMs: 1700,
    normalTurnMs: 4200,
    bossTurnMs: 6200,
    bossPhaseExtraMs: 1200,
    attackBarSpeed: 0.0031,
  },
  ambient: {
    firstDelayMs: 45000,
    cooldownMs: 35000,
    varianceMs: 25000,
    maxAmbientEnemies: 4,
  },
};
