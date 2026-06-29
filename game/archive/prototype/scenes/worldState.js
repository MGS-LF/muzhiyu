// 世界场景的运行时状态（提取出来供 worldDrawing.js 引用，避免循环依赖）

export const worldState = {
    typewriterRead: false,
    typewriterNoisePlayed: false,
    typewriterFxTimer: 0,
    // 打字机触发后，北门的淡入进度（0=隐形，1=完全可见）
    typewriterGateAlpha: 0
};
