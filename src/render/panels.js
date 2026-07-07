// 渲染模块：panels
import { W, H } from '../config.js';
import { roundRect, wrapText } from './util.js';
import { listSaves, summarize } from '../save.js';

// ============================================================
// UI 面板：任务列表 / 地图 / 调试传送
// ============================================================
export function drawUIPanel(ctx, game, gameTime) {
  // 半透明遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.min(560, W - 40);
  const panelH = Math.min(440, H - 40);
  const px = (W - panelW) / 2;
  const py = (H - panelH) / 2;

  // 面板背景
  ctx.fillStyle = 'rgba(20,18,28,0.95)';
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeStyle = 'rgba(200,180,140,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, panelW, panelH);

  if (game.uiPanel === 'quest') drawQuestPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'map') drawMapPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'inventory')
    drawInventoryPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'debug') drawDebugPanel(ctx, game, px, py, panelW, panelH, gameTime);
}

export function drawQuestPanel(ctx, game, px, py, pw, ph, gameTime) {
  const quests = game._questList();
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  ctx.fillText('任 务 列 表', px + pw / 2, py + 30);
  ctx.textAlign = 'left';

  const catColors = {
    主线: '#ffd870',
    可选: '#b8c7ff',
    支线: '#80d8ff',
    收集: '#a0ffa0',
    倾向: '#ffa0d0',
    刻字: '#d0a0ff',
    余烬: '#ffb070',
    规则: '#ff80ff',
  };
  let yy = py + 58;
  let curCat = '';
  const maxY = py + ph - 34;
  for (const q of quests) {
    if (q.cat !== curCat) {
      curCat = q.cat;
      if (yy > maxY - 26) break;
      ctx.fillStyle = catColors[q.cat] || '#ccc';
      ctx.font = 'bold 12px serif';
      ctx.fillText(q.cat, px + 30, yy);
      ctx.strokeStyle = 'rgba(210,190,150,0.18)';
      ctx.beginPath();
      ctx.moveTo(px + 82, yy - 4);
      ctx.lineTo(px + pw - 30, yy - 4);
      ctx.stroke();
      yy += 18;
    }
    if (yy > maxY - 24) {
      ctx.fillStyle = 'rgba(180,170,150,0.55)';
      ctx.font = '12px serif';
      ctx.fillText('…还有更多条目', px + 50, maxY);
      break;
    }
    const badge = q.done ? '完成' : q.optional ? '可选' : '进行中';
    const badgeColor = q.done
      ? 'rgba(100,190,120,0.72)'
      : q.optional
        ? 'rgba(120,145,230,0.72)'
        : 'rgba(255,210,100,0.75)';
    ctx.fillStyle = badgeColor;
    roundRect(ctx, px + 48, yy - 12, 44, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#101018';
    ctx.font = 'bold 10px serif';
    ctx.textAlign = 'center';
    ctx.fillText(badge, px + 70, yy + 1);
    ctx.textAlign = 'left';

    ctx.fillStyle = q.done
      ? 'rgba(155,215,155,0.72)'
      : q.optional
        ? 'rgba(210,215,245,0.8)'
        : 'rgba(238,225,190,0.9)';
    ctx.font = q.cat === '主线' && !q.done ? 'bold 13px serif' : '13px serif';
    const lines = wrapText(ctx, q.text, pw - 150);
    for (let i = 0; i < Math.min(lines.length, 2); i++) {
      ctx.fillText(lines[i], px + 104, yy + i * 17);
    }
    yy += Math.max(24, Math.min(lines.length, 2) * 17 + 6);
  }
  ctx.fillStyle = 'rgba(180,170,150,0.5)';
  ctx.font = '11px serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    '主线是通关所需；可选目标提供复活点、补给或剧情记录。按 Q / Esc 关闭',
    px + pw / 2,
    py + ph - 16
  );
  ctx.textAlign = 'left';
}

export function drawMapPanel(ctx, game, px, py, pw, ph, gameTime) {
  // 标题
  ctx.fillStyle = 'rgba(255,220,140,0.9)';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  ctx.fillText('世 界 地 图', px + pw / 2, py + 30);
  ctx.textAlign = 'left';

  // 场景节点布局（简化关系图，与 scenes.js 的 scene_change 连接一致）
  const nodes = [
    { id: 'freeze_center', name: '冷冻中心', x: 0.1, y: 0.75 },
    { id: 'street_01', name: '废弃街道', x: 0.28, y: 0.55 },
    { id: 'subway', name: '地铁站', x: 0.28, y: 0.85 },
    { id: 'riverside', name: '江堤', x: 0.28, y: 0.3 },
    { id: 'alley_district', name: '居民区', x: 0.46, y: 0.45 },
    { id: 'house_a', name: '民居A', x: 0.46, y: 0.25 },
    { id: 'house_b', name: '民居B', x: 0.46, y: 0.65 },
    { id: 'stadium', name: '体育馆', x: 0.64, y: 0.5 },
    { id: 'data_center', name: '数据中心', x: 0.78, y: 0.5 },
    // 第五章·余烬
    { id: 'ruined_library', name: '废图书馆', x: 0.64, y: 0.78 },
    { id: 'network_nexus', name: '网络中枢', x: 0.78, y: 0.78 },
    { id: 'memory_abyss', name: '记忆深渊', x: 0.9, y: 0.65 },
    { id: 'lost_village', name: '失语者村落', x: 0.52, y: 0.88 },
  ];
  const links = [
    ['freeze_center', 'street_01'],
    ['street_01', 'subway'],
    ['street_01', 'riverside'],
    ['riverside', 'alley_district'],
    ['alley_district', 'house_a'],
    ['alley_district', 'house_b'],
    ['alley_district', 'stadium'],
    // 第五章连接：体育馆→废图书馆→网络中枢→记忆深渊；废图书馆→失语者村落
    ['stadium', 'ruined_library'],
    ['ruined_library', 'network_nexus'],
    ['network_nexus', 'memory_abyss'],
    ['memory_abyss', 'data_center'],
    ['ruined_library', 'lost_village'],
  ];

  const toX = (n) => px + 40 + n.x * (pw - 80);
  const toY = (n) => py + 60 + n.y * (ph - 120);

  // 连线
  ctx.strokeStyle = 'rgba(150,140,120,0.3)';
  ctx.lineWidth = 1.5;
  for (const [a, b] of links) {
    const na = nodes.find((n) => n.id === a),
      nb = nodes.find((n) => n.id === b);
    ctx.beginPath();
    ctx.moveTo(toX(na), toY(na));
    ctx.lineTo(toX(nb), toY(nb));
    ctx.stroke();
  }

  // 节点
  const curId = game.scene ? game.scene.id : '';
  const visited = game.visitedScenes || new Set();
  for (const n of nodes) {
    const nx = toX(n),
      ny = toY(n);
    const isCur = n.id === curId;
    const isVisited = visited.has(n.id);
    // 节点圆
    ctx.beginPath();
    ctx.arc(nx, ny, isCur ? 10 : 7, 0, Math.PI * 2);
    if (isCur) {
      const pulse = 0.6 + Math.sin(gameTime * 0.005) * 0.3;
      ctx.fillStyle = `rgba(255,220,100,${pulse})`;
    } else if (isVisited) {
      ctx.fillStyle = 'rgba(120,200,140,0.6)';
    } else {
      ctx.fillStyle = 'rgba(80,80,90,0.5)';
    }
    ctx.fill();
    ctx.strokeStyle = isCur ? '#ffdd66' : 'rgba(150,140,120,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 标签
    ctx.fillStyle = isCur
      ? '#ffdd66'
      : isVisited
        ? 'rgba(180,200,180,0.8)'
        : 'rgba(120,115,105,0.5)';
    ctx.font = isCur ? 'bold 11px serif' : '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, nx, ny - 14);
    ctx.textAlign = 'left';
  }

  // 底部提示
  ctx.fillStyle = 'rgba(180,170,150,0.5)';
  ctx.font = '11px serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    '当前: ' + (game.scene ? game.scene.name : '?') + '   ·   按 M / Esc 关闭',
    px + pw / 2,
    py + ph - 16
  );
  ctx.textAlign = 'left';
}

export function drawDebugPanel(ctx, game, px, py, pw, ph, gameTime) {
  // 标题
  ctx.fillStyle = 'rgba(255,100,100,0.9)';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('调 试 传 送  [F2]', px + pw / 2, py + 30);
  ctx.textAlign = 'left';

  const scenes = game._debugSceneList();
  let yy = py + 60;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const sel = i === game._debugSel;
    // 选中高亮
    if (sel) {
      ctx.fillStyle = 'rgba(255,220,100,0.15)';
      ctx.fillRect(px + 20, yy - 14, pw - 40, 24);
    }
    ctx.fillStyle = sel ? '#ffdd66' : 'rgba(200,200,200,0.7)';
    ctx.font = sel ? 'bold 14px monospace' : '13px monospace';
    const mark = sel ? '▶ ' : '  ';
    const cur = game.scene && game.scene.id === s.id ? ' [当前]' : '';
    ctx.fillText(mark + s.name + cur, px + 40, yy);
    yy += 28;
  }

  // 底部提示
  ctx.fillStyle = 'rgba(180,170,150,0.5)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ 选择   E 传送   F2/Esc 关闭', px + pw / 2, py + ph - 16);
  ctx.textAlign = 'left';
}

// ============================================================
// 存档菜单（F6 打开）
// ============================================================
export function drawSaveMenu(ctx, game, gameTime) {
  if (!game._saveMenu) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  const pw = 540,
    ph = 500;
  const px = (W - pw) / 2,
    py = (H - ph) / 2;
  ctx.fillStyle = '#1a1d22';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#3a3d44';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.fillStyle = '#e8dcc8';
  ctx.font = 'bold 20px "SimSun","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.fillText('📜 存档管理', px + pw / 2, py + 38);

  const saves = _readSavesForMenu();
  const items = [...saves, { slot: 'new', isNew: true }];
  let yy = py + 70;
  const lineH = 72;
  game._saveMenuIdx = Math.min(game._saveMenuIdx, items.length - 1);

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const sel = i === game._saveMenuIdx;
    const iy = yy + i * lineH;
    if (sel) {
      ctx.fillStyle = 'rgba(255,220,100,0.12)';
      ctx.fillRect(px + 20, iy - 6, pw - 40, lineH - 10);
      ctx.strokeStyle = 'rgba(255,220,100,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 20, iy - 6, pw - 40, lineH - 10);
    }
    if (it.isNew) {
      ctx.fillStyle = sel ? '#ffdd66' : 'rgba(200,200,200,0.6)';
      ctx.font = sel ? 'bold 15px "SimSun",serif' : '14px "SimSun",serif';
      ctx.textAlign = 'left';
      ctx.fillText((sel ? '▶ ' : '  ') + '＋ 新建存档（存入第一个空槽位）', px + 40, iy + 28);
    } else {
      const tag = it.slot === 'auto' ? '自动' : '槽位 ' + it.slot;
      ctx.fillStyle = sel ? '#ffdd66' : '#e8dcc8';
      ctx.font = 'bold 14px "SimSun",serif';
      ctx.textAlign = 'left';
      ctx.fillText((sel ? '▶ ' : '  ') + `[${tag}]  ${it.scene}`, px + 40, iy + 22);
      ctx.fillStyle = 'rgba(180,170,150,0.7)';
      ctx.font = '11px "SimSun",serif';
      ctx.fillText(
        `时间 ${it.time}  ·  SAN ${it.san}  ·  碎片 ${it.chars}  ·  仁慈${it.karma.mercy}/武力${it.karma.violence}`,
        px + 40,
        iy + 42
      );
    }
  }

  ctx.fillStyle = 'rgba(180,170,150,0.5)';
  ctx.font = '11px "SimSun",serif';
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ 选择   E 读取/新建   F6/Esc 关闭', px + pw / 2, py + ph - 16);
  ctx.textAlign = 'left';
  ctx.restore();
}

// 从存档系统读取菜单摘要，避免渲染层复制存档格式细节。
function _readSavesForMenu() {
  return listSaves()
    .map((snap) => {
      const summary = summarize(snap);
      return summary ? { slot: snap.slot, ...summary } : null;
    })
    .filter(Boolean);
}

// ============================================================
// 背包面板（I 键）
// ============================================================
export function drawInventoryPanel(ctx, game, px, py, pw, ph, gameTime) {
  const data = game.getInventoryData();

  ctx.fillStyle = '#e8dcc8';
  ctx.font = 'bold 18px "SimSun","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.fillText('背 包', px + pw / 2, py + 34);

  const barX = px + 32,
    barY = py + 54,
    barW = pw - 64,
    barH = 12;
  ctx.fillStyle = 'rgba(60,60,60,0.8)';
  ctx.fillRect(barX, barY, barW, barH);
  const sanRatio = Math.max(0, Math.min(1, data.san / data.maxSan));
  const sanColor = sanRatio > 0.6 ? '#66dd66' : sanRatio > 0.3 ? '#d4a85a' : '#cc4444';
  ctx.fillStyle = sanColor;
  ctx.fillRect(barX, barY, barW * sanRatio, barH);
  ctx.strokeStyle = 'rgba(200,200,200,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = '#fff';
  ctx.font = '11px "SimSun",serif';
  ctx.textAlign = 'center';
  ctx.fillText(`理性 ${Math.floor(data.san)} / ${data.maxSan}`, px + pw / 2, barY + 9);

  const gap = 18;
  const leftX = px + 28;
  const topY = py + 92;
  const leftW = Math.floor((pw - 70) * 0.55);
  const rightX = leftX + leftW + gap;
  const rightW = pw - 56 - leftW - gap;
  const bottomY = py + ph - 38;

  ctx.strokeStyle = 'rgba(210,190,150,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightX - gap / 2, topY - 8);
  ctx.lineTo(rightX - gap / 2, bottomY - 8);
  ctx.stroke();

  const ITEM_NAMES = {
    knife: '记忆合金小刀',
    poem_guanju: '《关雎》诗页',
    old_page: '旧书页',
    page: '旧书页',
  };
  const ITEM_DESCS = {
    knife: '刻字与战斗的必备工具',
    poem_guanju: '已收录的诗词，战斗中可作武器',
    old_page: '可使用：恢复 30 点理性',
    page: '可使用：恢复 30 点理性',
  };

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,220,140,0.85)';
  ctx.font = 'bold 13px "SimSun",serif';
  ctx.fillText('道具', leftX, topY);

  let yy = topY + 24;
  if (!data.items.length) {
    ctx.fillStyle = 'rgba(180,170,150,0.6)';
    ctx.font = '13px "SimSun",serif';
    ctx.fillText('（背包是空的）', leftX, yy + 8);
  } else {
    const rowH = 42;
    const maxRows = Math.max(1, Math.floor((bottomY - yy - 22) / rowH));
    const selected = Math.max(
      0,
      data.items.findIndex((it) => it.selected)
    );
    let start = Math.max(0, selected - Math.floor(maxRows / 2));
    start = Math.min(start, Math.max(0, data.items.length - maxRows));
    const end = Math.min(data.items.length, start + maxRows);
    for (let i = start; i < end; i++) {
      const it = data.items[i];
      const sel = it.selected;
      if (sel) {
        ctx.fillStyle = 'rgba(255,220,100,0.12)';
        ctx.fillRect(leftX - 8, yy - 15, leftW, 36);
        ctx.strokeStyle = 'rgba(255,220,100,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(leftX - 8, yy - 15, leftW, 36);
      }
      ctx.fillStyle = sel ? '#ffdd66' : '#e8dcc8';
      ctx.font = sel ? 'bold 14px "SimSun",serif' : '13px "SimSun",serif';
      const mark = sel ? '▶ ' : '  ';
      const name = mark + (it.name || ITEM_NAMES[it.id] || it.id);
      ctx.fillText(name, leftX, yy);
      ctx.fillStyle = 'rgba(180,170,150,0.6)';
      ctx.font = '10px "SimSun",serif';
      ctx.fillText(ITEM_DESCS[it.id] || '', leftX + 16, yy + 14);
      yy += rowH;
    }
    if (data.items.length > maxRows) {
      ctx.fillStyle = 'rgba(180,170,150,0.55)';
      ctx.font = '11px "SimSun",serif';
      ctx.fillText(`显示 ${start + 1}-${end} / ${data.items.length}`, leftX, bottomY - 10);
    }
  }

  let ry = topY;
  ctx.fillStyle = 'rgba(255,220,140,0.85)';
  ctx.font = 'bold 13px "SimSun",serif';
  ctx.fillText('诗词与记录', rightX, ry);
  ry += 24;

  ctx.fillStyle = 'rgba(200,200,200,0.58)';
  ctx.font = '11px "SimSun",serif';
  ctx.fillText('已收集汉字', rightX, ry);
  ry += 18;
  if (data.chars.length) {
    ctx.font = 'bold 15px "SimSun",serif';
    ctx.fillStyle = '#ffd866';
    const charLines = wrapText(ctx, data.chars.join('  '), rightW);
    for (let i = 0; i < Math.min(charLines.length, 4); i++) {
      ctx.fillText(charLines[i], rightX, ry + i * 19);
    }
    ry += Math.min(charLines.length, 4) * 19 + 10;
    if (charLines.length > 4) {
      ctx.fillStyle = 'rgba(180,170,150,0.55)';
      ctx.font = '10px "SimSun",serif';
      ctx.fillText('…更多汉字已收录', rightX, ry - 2);
      ry += 14;
    }
  } else {
    ctx.fillStyle = 'rgba(180,170,150,0.5)';
    ctx.font = '12px "SimSun",serif';
    ctx.fillText('（尚无）', rightX, ry);
    ry += 24;
  }

  const lines = [
    `方知远日记：${data.diaries}/6`,
    `语言种子：${data.seeds}/3`,
    `要石：${data.keystones.activated}/${data.keystones.total}（可选）`,
  ];
  ctx.font = '12px "SimSun",serif';
  for (const line of lines) {
    if (ry > bottomY - 18) break;
    ctx.fillStyle = 'rgba(225,215,190,0.78)';
    ctx.fillText(line, rightX, ry);
    ry += 22;
  }

  ctx.fillStyle = 'rgba(180,170,150,0.5)';
  ctx.font = '11px "SimSun",serif';
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ 选择   E 使用   I/Esc 关闭', px + pw / 2, py + ph - 16);
  ctx.textAlign = 'left';
}
