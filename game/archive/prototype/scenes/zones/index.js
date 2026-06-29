// 区域聚合：把每个独立 zone 文件合并到 ZONES dict

import { ruinsZone } from './ruins.js';
import { corridorZone } from './corridor.js';
import { clearingZone } from './clearing.js';
import { depthsZone } from './depths.js';
import { riverbedZone } from './riverbed.js';
import { stelesZone } from './steles.js';

export const ZONES = {
    ruins:    ruinsZone,
    corridor: corridorZone,
    clearing: clearingZone,
    depths:   depthsZone,
    riverbed: riverbedZone,
    steles:   stelesZone
};

export { WORD_CHAR, RUBBLE_POOLS, RUBBLE_STORIES, ZONE_ENV } from './_shared.js';
