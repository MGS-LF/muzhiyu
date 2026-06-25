// 启动入口
import { Game } from './game.js';

const canvas = document.getElementById('c');
const game = new Game(canvas);
game.start();

console.log('[刻痕] 启动');
