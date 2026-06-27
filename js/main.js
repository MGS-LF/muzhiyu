// 启动入口
import { Game } from './game.js';
import { initAI } from './ai/config.js';

const canvas = document.getElementById('c');
const game = new Game(canvas);
initAI(); // 后台探测 AI 服务（失败则自动降级为纯文字），不阻塞启动

// 来自序幕（intro_3d.html）？序幕已经把"世界背景+前情提要+苏醒"演完了，
// 主屏里再播一遍 wake 长对白就重复了。无感衔接：直接把 wake_done 置位，
// 让 checkAutoTriggers 跳过开局叙述，玩家直接控制顾言。
const FROM_INTRO = new URLSearchParams(location.search).get('from') === 'intro';
if (FROM_INTRO) game.flags.wake_done = true;

game.start();

console.log('[刻痕] 启动' + (FROM_INTRO ? '（接序幕）' : ''));
