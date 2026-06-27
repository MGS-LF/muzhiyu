// 说话人 → { model, voice, style }
// 实际配置全部在 ./voices.config.js；本文件保留旧名以兼容调用方，
// 并对外仍提供 speakerStyle(name) 接口（与旧版同名同形）。

import { speakerVoice } from './voices.config.js';

export function speakerStyle(name) {
  return speakerVoice(name);
}
