// 启动入口
import { Game } from './game.js';
import { initAI } from './ai/config.js';

const canvas = document.getElementById('c');
const game = new Game(canvas);
initAI(); // 后台探测 AI 服务（失败则自动降级为纯文字），不阻塞启动
game.start();

console.log('[刻痕] 启动');
