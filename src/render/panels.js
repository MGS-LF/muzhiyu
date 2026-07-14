// 渲染模块：panels
import { W, H } from '../config.js';
import { roundRect, wrapText } from './util.js';
import { loadAllSaves, SAVE_SLOTS, summarize } from '../save.js';
import { CONTROL_HINTS } from '../data/controls.js';
import { UI, SPACE, font, fontMono, panelFrame, selectionPulse } from '../ui/tokens.js';

// ============================================================
// UI 面板：任务列表 / 地图 / 调试传送
// ============================================================
export function drawUIPanel(ctx, game, gameTime) {
  // 赛博碑拓环境：采用炭黑到渐变暗蓝的细致遮罩
  const maskGrad = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.18,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.72
  );
  maskGrad.addColorStop(0, 'rgba(7, 8, 10, 0.5)');
  maskGrad.addColorStop(1, 'rgba(3, 4, 5, 0.95)');
  ctx.fillStyle = maskGrad;
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.min(560, W - 40);
  const panelH = Math.min(440, H - 40);
  const px = (W - panelW) / 2;
  const py = (H - panelH) / 2;

  // 入场动画：淡入 + 轻微上移
  const reduced = !!(game.settings && game.settings.reducedFx);
  const openT =
    game._uiPanelOpenAt !== null && game._uiPanelOpenAt !== undefined
      ? Math.min(1, (gameTime - game._uiPanelOpenAt) / 120)
      : 1;
  const ease = reduced ? 1 : openT * openT * (3 - 2 * openT);
  const offsetY = reduced ? 0 : (1 - ease) * 4;
  ctx.save();
  ctx.globalAlpha = ease;
  ctx.translate(0, offsetY);

  const titles = {
    quest: '任 务 列 表',
    map: '世 界 地 图',
    inventory: '背 包',
    settings: '设 置',
    system: '系 统',
    controls: '按 键 说 明',
    debug: '调 试 传 送  [F2]',
  };
  const title = titles[game.uiPanel] || '';
  panelFrame(ctx, px, py, panelW, panelH, {
    title: game.uiPanel === 'debug' ? null : title,
    highContrast: !!(game.settings && game.settings.highContrast),
  });
  if (game.uiPanel === 'debug') {
    ctx.fillStyle = UI.danger;
    ctx.font = fontMono(18, true);
    ctx.textAlign = 'center';
    ctx.fillText(`── [ ${title} ] ──`, px + panelW / 2, py + 26);
    ctx.textAlign = 'left';
  }

  if (game.uiPanel === 'quest') drawQuestPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'map') drawMapPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'inventory')
    drawInventoryPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'settings')
    drawSettingsPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'system') drawSystemPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'controls')
    drawControlsPanel(ctx, game, px, py, panelW, panelH, gameTime);
  else if (game.uiPanel === 'debug') drawDebugPanel(ctx, game, px, py, panelW, panelH, gameTime);

  ctx.restore();
}

export function drawQuestPanel(ctx, game, px, py, pw, ph, gameTime) {
  const quests = game._questList();
  // 标题由 panelFrame 绘制
  void gameTime;

  // 使用优雅的低饱和度古风色卡替换高亮度霓虹色
  const catColors = {
    主线: 'rgba(232, 176, 88, 0.95)',
    可选: 'rgba(170, 150, 120, 0.95)',
    支线: 'rgba(110, 200, 150, 0.95)',
    收集: 'rgba(232, 176, 88, 0.9)',
    倾向: 'rgba(170, 150, 120, 0.95)',
    刻字: 'rgba(200, 185, 155, 0.95)',
    余烬: 'rgba(220, 86, 86, 0.95)',
    线索: 'rgba(120, 190, 210, 0.95)',
    世界史: 'rgba(170, 150, 120, 0.95)',
    规则: 'rgba(150, 140, 125, 0.95)',
  };
  let yy = py + 58;
  let curCat = '';
  const maxY = py + ph - 34;
  const pad = SPACE.x6;
  for (const q of quests) {
    if (q.cat !== curCat) {
      curCat = q.cat;
      if (yy > maxY - 26) break;
      ctx.fillStyle = catColors[q.cat] || '#ccc';
      ctx.font = font(12, true);
      ctx.fillText(q.cat, px + pad, yy);
      ctx.strokeStyle = 'rgba(232, 176, 88, 0.18)';
      ctx.beginPath();
      ctx.moveTo(px + 82, yy - 4);
      ctx.lineTo(px + pw - pad, yy - 4);
      ctx.stroke();
      yy += 18;
    }
    if (yy > maxY - 24) {
      ctx.fillStyle = UI.inkFaint;
      ctx.font = font(12, true);
      ctx.fillText('…还有更多条目', px + 50, maxY);
      break;
    }
    const badge = q.done ? '完成' : q.optional ? '可选' : '进行中';

    // 任务状态微章：直角、加粗高清晰文字对比
    let badgeBg, badgeBorder, badgeText;
    if (q.done) {
      badgeBg = 'rgba(110, 200, 150, 0.12)';
      badgeBorder = 'rgba(110, 200, 150, 0.4)';
      badgeText = UI.ok;
    } else if (q.optional) {
      badgeBg = 'rgba(170, 150, 120, 0.1)';
      badgeBorder = 'rgba(170, 150, 120, 0.4)';
      badgeText = 'rgba(200, 185, 155, 0.95)';
    } else {
      badgeBg = 'rgba(232, 176, 88, 0.1)';
      badgeBorder = 'rgba(232, 176, 88, 0.4)';
      badgeText = 'rgba(255, 214, 130, 0.95)';
    }

    ctx.fillStyle = badgeBg;
    roundRect(ctx, px + 48, yy - 12, 44, 18, 4);
    ctx.fill();
    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, px + 48, yy - 12, 44, 18, 4);
    ctx.stroke();

    ctx.fillStyle = badgeText;
    ctx.font = font(10, true);
    ctx.textAlign = 'center';
    ctx.fillText(badge, px + 70, yy + 1);
    ctx.textAlign = 'left';

    ctx.fillStyle = q.done
      ? UI.inkSoft // 已完成任务显示废墟水泥灰
      : q.optional
        ? 'rgba(210, 215, 225, 0.95)'
        : UI.ink;
    ctx.font = font(13, true);
    const lines = wrapText(ctx, q.text, pw - 150);
    for (let i = 0; i < Math.min(lines.length, 2); i++) {
      ctx.fillText(lines[i], px + 104, yy + i * 17);
    }
    yy += Math.max(24, Math.min(lines.length, 2) * 17 + 6);
  }
  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(11, true);
  ctx.textAlign = 'center';
  ctx.fillText(
    '主线是通关所需；可选目标提供复活点、补给或剧情记录。按 Q / Esc 关闭',
    px + pw / 2,
    py + ph - 16
  );
  ctx.textAlign = 'left';
}

export function drawMapPanel(ctx, game, px, py, pw, ph, gameTime) {
  // 标题由 panelFrame 绘制

  // 场景节点布局（简化关系图，与 scenes.js 的 scene_change 连接一致）
  const nodes = [
    { id: 'freeze_center', name: '冷冻中心', x: 0.1, y: 0.75 },
    { id: 'street_01', name: '废弃街道', x: 0.28, y: 0.55 },
    { id: 'subway', name: '地铁站', x: 0.28, y: 0.85 },
    { id: 'subway_depth', name: '检修通道深处', x: 0.37, y: 0.91 },
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
    ['subway', 'subway_depth'],
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

  // 连线：水墨古风淡灰线条
  ctx.strokeStyle = 'rgba(178, 169, 152, 0.28)';
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
    ctx.arc(nx, ny, isCur ? 9 : 6, 0, Math.PI * 2);
    if (isCur) {
      // 玩家当前节点：带微光呼吸晕染发光效果，更具动感与厚度
      ctx.save();
      const pulseVal = Math.sin(gameTime * 0.005) * 0.5 + 0.5;
      const glowGrad = ctx.createRadialGradient(nx, ny, 3, nx, ny, 16);
      glowGrad.addColorStop(0, 'rgba(255, 215, 142, 1)');
      glowGrad.addColorStop(0.5, `rgba(224, 178, 98, ${0.4 + pulseVal * 0.3})`);
      glowGrad.addColorStop(1, 'rgba(224, 178, 98, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(nx, ny, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = UI.goldBright;
    } else if (isVisited) {
      ctx.fillStyle = 'rgba(108, 178, 132, 0.75)'; // 翡翠绿已访问节点
    } else {
      ctx.fillStyle = 'rgba(80, 80, 85, 0.5)';
    }

    ctx.beginPath();
    ctx.arc(nx, ny, isCur ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isCur ? '#ffdd66' : 'rgba(224, 178, 98, 0.3)';
    ctx.lineWidth = isCur ? 1.5 : 1;
    ctx.stroke();

    // 标签
    ctx.fillStyle = isCur
      ? UI.goldBright
      : isVisited
        ? 'rgba(180, 200, 180, 0.85)'
        : 'rgba(140, 132, 116, 0.45)';
    ctx.font = isCur ? font(11, true) : font(10);
    ctx.textAlign = 'center';
    ctx.fillText(n.name, nx, ny - 14);
    ctx.textAlign = 'left';
  }

  // 底部提示
  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(11);
  ctx.textAlign = 'center';
  ctx.fillText(
    '当前: ' + (game.scene ? game.scene.name : '?') + '   ·   按 M / Esc 关闭',
    px + pw / 2,
    py + ph - 16
  );
  ctx.textAlign = 'left';
}

export function drawSystemPanel(ctx, game, px, py, pw, ph, gameTime) {
  const rows = game._systemMenuRows ? game._systemMenuRows() : [];
  const reduced = !!(game.settings && game.settings.reducedFx);
  const startY = py + 88;
  const rowH = 44;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const y = startY + i * rowH;
    const sel = i === (game._systemSel || 0);
    if (sel) {
      const pulse = selectionPulse(gameTime, reduced);
      const rowGrad = ctx.createLinearGradient(px + 36, y - 22, px + pw - 36, y - 22);
      rowGrad.addColorStop(0, `rgba(224, 178, 98, ${pulse * 2.2})`);
      rowGrad.addColorStop(0.3, `rgba(224, 178, 98, ${pulse * 1.2})`);
      rowGrad.addColorStop(1, 'rgba(224, 178, 98, 0)');
      ctx.fillStyle = rowGrad;
      ctx.fillRect(px + 36, y - 22, pw - 72, 34);
      ctx.fillStyle = UI.goldBright;
      ctx.fillRect(px + 36, y - 22, 2.5, 34);
    }
    ctx.fillStyle = sel ? UI.goldBright : UI.ink;
    ctx.font = sel ? font(17, true) : font(16);
    ctx.textAlign = 'center';
    ctx.fillText(`${sel ? '› ' : ''}${row.label}`, px + pw / 2, y);
  }
  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(12);
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ 选择 · 鼠标点击确认 · E / Space 确认 · Esc 关闭', px + pw / 2, py + ph - 18);
  ctx.textAlign = 'left';
}

export function drawControlsPanel(ctx, game, px, py, pw, ph, gameTime) {
  void gameTime;
  void game;
  const lines = CONTROL_HINTS.tutorialKeys || [];
  let yy = py + 64;
  const maxY = py + ph - 40;
  for (const row of lines) {
    if (yy > maxY) break;
    ctx.fillStyle = UI.gold;
    ctx.font = font(13, true);
    ctx.textAlign = 'left';
    ctx.fillText(row.k, px + 40, yy);
    ctx.fillStyle = UI.inkSoft;
    ctx.font = font(13);
    const wrapped = wrapText(ctx, row.d, pw - 200);
    ctx.fillText(wrapped[0] || row.d, px + 160, yy);
    yy += 26 + Math.max(0, wrapped.length - 1) * 16;
  }
  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(12);
  ctx.textAlign = 'center';
  ctx.fillText('点击 / E / Esc 返回系统菜单', px + pw / 2, py + ph - 18);
  ctx.textAlign = 'left';
}

export function drawDebugPanel(ctx, game, px, py, pw, ph, gameTime) {
  // 标题由 drawUIPanel 绘制
  const reduced = !!(game.settings && game.settings.reducedFx);
  const scenes = game._debugSceneList();
  let yy = py + 60;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const sel = i === game._debugSel;
    if (sel) {
      const pulse = selectionPulse(gameTime, reduced);
      // 选中项效果：左侧鎏金垂直短线 + 水平两端渐变呼吸背景，不再是单调的纯色方块遮罩
      const rowGrad = ctx.createLinearGradient(px + 20, yy - 14, px + pw - 20, yy - 14);
      rowGrad.addColorStop(0, `rgba(224, 178, 98, ${pulse * 2.2})`);
      rowGrad.addColorStop(0.3, `rgba(224, 178, 98, ${pulse * 1.2})`);
      rowGrad.addColorStop(1, 'rgba(224, 178, 98, 0)');
      ctx.fillStyle = rowGrad;
      ctx.fillRect(px + 20, yy - 14, pw - 40, 24);

      // 左侧鎏金指示线条
      ctx.fillStyle = UI.goldBright;
      ctx.fillRect(px + 20, yy - 14, 2.5, 24);
    }
    ctx.fillStyle = sel ? UI.goldBright : 'rgba(240, 233, 218, 0.72)';
    ctx.font = sel ? fontMono(14, true) : fontMono(13);
    const mark = sel ? '▶ ' : '  ';
    const cur = game.scene && game.scene.id === s.id ? ' [当前]' : '';
    ctx.fillText(mark + s.name + cur, px + 40, yy);
    yy += 28;
  }

  ctx.fillStyle = UI.inkFaint;
  ctx.font = fontMono(11);
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ 选择   E 传送   F2/Esc 关闭', px + pw / 2, py + ph - 16);
  ctx.textAlign = 'left';
}

export function drawSettingsPanel(ctx, game, px, py, pw, ph, gameTime) {
  const rows = game._settingsRows ? game._settingsRows() : [];
  const reduced = !!(game.settings && game.settings.reducedFx);
  // 标题由 panelFrame 绘制

  const startY = py + 76;
  const rowH = 46;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const y = startY + i * rowH;
    const sel = i === (game._settingsSel || 0);
    if (sel) {
      const pulse = selectionPulse(gameTime, reduced);
      // 选中项效果：左侧鎏金垂直短线 + 水平两端渐变呼吸背景
      const rowGrad = ctx.createLinearGradient(px + 32, y - 24, px + pw - 32, y - 24);
      rowGrad.addColorStop(0, `rgba(224, 178, 98, ${pulse * 2.2})`);
      rowGrad.addColorStop(0.3, `rgba(224, 178, 98, ${pulse * 1.2})`);
      rowGrad.addColorStop(1, 'rgba(224, 178, 98, 0)');
      ctx.fillStyle = rowGrad;
      ctx.fillRect(px + 32, y - 24, pw - 64, 34);

      ctx.strokeStyle = `rgba(224, 178, 98, ${0.12 + pulse * 1.5})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 32, y - 24, pw - 64, 34);

      // 左侧指示条
      ctx.fillStyle = UI.goldBright;
      ctx.fillRect(px + 32, y - 24, 2.5, 34);
    }
    ctx.fillStyle = sel ? UI.goldBright : UI.ink;
    ctx.font = sel ? font(15, true) : font(14);
    ctx.fillText(row.label, px + 52, y);

    const valueW = 132;
    const valueX = px + pw - valueW - 52;
    ctx.fillStyle = sel ? 'rgba(224, 178, 98, 0.15)' : 'rgba(140, 132, 116, 0.15)'; // 按钮底框改淡雅色，防止喧宾夺主
    roundRect(ctx, valueX, y - 22, valueW, 26, 4);
    ctx.fill();
    ctx.strokeStyle = sel ? 'rgba(224, 178, 98, 0.5)' : 'rgba(140, 132, 116, 0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, valueX, y - 22, valueW, 26, 4);
    ctx.stroke();

    ctx.fillStyle = sel ? UI.goldBright : UI.inkSoft;
    ctx.font = font(12, true);
    ctx.textAlign = 'center';
    ctx.fillText(row.value, valueX + valueW / 2, y - 4);
    ctx.textAlign = 'left';
  }

  const notes = [
    '高对比字幕会加深对话框并提高文字亮度。',
    '降低特效会关闭强闪光、扭曲与部分粒子叠加。',
  ];
  let ny = py + ph - 92;
  ctx.fillStyle = 'rgba(190,180,155,0.68)';
  ctx.font = font(11);
  for (const note of notes) {
    ctx.fillText(note, px + 44, ny);
    ny += 18;
  }
  ctx.fillStyle = UI.inkFaint;
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ 选择   ←→ / E 调整   O/Esc 关闭', px + pw / 2, py + ph - 16);
  ctx.textAlign = 'left';
}

// ============================================================
// 存档菜单（F6 打开）
// ============================================================
export function drawSaveMenu(ctx, game, gameTime) {
  if (!game._saveMenu) return;
  const mode = game._saveMenu === 'load' ? 'load' : 'save';
  const reduced = !!(game.settings && game.settings.reducedFx);
  ctx.save();
  ctx.fillStyle = UI.panelMask;
  ctx.fillRect(0, 0, W, H);
  const pw = 540,
    ph = 500;
  const px = (W - pw) / 2,
    py = (H - ph) / 2;
  panelFrame(ctx, px, py, pw, ph, {
    title: '存档管理',
    highContrast: !!(game.settings && game.settings.highContrast),
  });

  const tabY = py + 58;
  const tabW = 110;
  for (const [i, tab] of ['save', 'load'].entries()) {
    const selected = mode === tab;
    const tx = px + pw / 2 - tabW + i * tabW;
    ctx.fillStyle = selected ? UI.goldSoft : 'rgba(20,20,30,0.55)';
    ctx.fillRect(tx, tabY, tabW, 28);
    ctx.strokeStyle = selected ? UI.gold : 'rgba(120,120,140,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, tabY, tabW, 28);
    ctx.fillStyle = selected ? UI.goldBright : 'rgba(200,200,200,0.65)';
    ctx.font = selected ? font(13, true) : font(13);
    ctx.fillText(tab === 'save' ? '保存' : '读取', tx + tabW / 2, tabY + 18);
  }

  const items = _readSaveMenuItems(mode);
  let yy = py + 105;
  const lineH = 76;
  game._saveMenuIdx = Math.min(game._saveMenuIdx, items.length - 1);

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const sel = i === game._saveMenuIdx;
    const iy = yy + i * lineH;
    if (sel) {
      const pulse = selectionPulse(gameTime, reduced);
      // 选中项效果：左侧垂直金线条 + 水平渐变鎏金微光呼吸
      const rowGrad = ctx.createLinearGradient(px + 20, iy - 6, px + pw - 20, iy - 6);
      rowGrad.addColorStop(0, `rgba(224, 178, 98, ${pulse * 2.2})`);
      rowGrad.addColorStop(0.3, `rgba(224, 178, 98, ${pulse * 1.2})`);
      rowGrad.addColorStop(1, 'rgba(224, 178, 98, 0)');
      ctx.fillStyle = rowGrad;
      ctx.fillRect(px + 20, iy - 6, pw - 40, lineH - 10);

      ctx.strokeStyle = `rgba(224, 178, 98, ${0.12 + pulse * 1.5})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 20, iy - 6, pw - 40, lineH - 10);

      // 左侧指示条
      ctx.fillStyle = UI.goldBright;
      ctx.fillRect(px + 20, iy - 6, 2.5, lineH - 10);
    }
    ctx.textAlign = 'left';
    if (it.empty) {
      const tag = it.slot === 'auto' ? '自动' : '槽位 ' + it.slot;
      ctx.fillStyle = sel ? UI.goldBright : 'rgba(240, 233, 218, 0.48)';
      ctx.font = sel ? font(14, true) : font(14);
      ctx.fillText((sel ? '> ' : '  ') + `[${tag}]  空`, px + 40, iy + 24);
      ctx.fillStyle = 'rgba(178, 169, 152, 0.48)';
      ctx.font = font(11);
      ctx.fillText(mode === 'save' ? '按 E 写入此槽位' : '没有可读取的记录', px + 40, iy + 46);
    } else {
      const tag = it.slot === 'auto' ? '自动' : '槽位 ' + it.slot;
      ctx.fillStyle = sel ? UI.goldBright : UI.ink;
      ctx.font = font(14, true);
      ctx.fillText((sel ? '> ' : '  ') + `[${tag}]  ${it.scene}`, px + 40, iy + 22);
      ctx.fillStyle = 'rgba(178, 169, 152, 0.75)';
      ctx.font = font(11);
      ctx.fillText(
        `时间 ${it.time}  ·  SAN ${it.san}  ·  碎片 ${it.chars}  ·  慈悲${it.karma.mercy}/残忍${it.karma.violence}`,
        px + 40,
        iy + 42
      );
      if (mode === 'save' && it.slot !== 'auto') {
        ctx.fillStyle = 'rgba(224, 178, 98, 0.55)'; // 优化字体颜色，与鎏金呼应
        ctx.fillText('按 E 覆盖此槽位', px + 40, iy + 60);
      }
    }
  }

  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(11);
  ctx.textAlign = 'center';
  const hint = mode === 'save' ? CONTROL_HINTS.saveMenuSave : CONTROL_HINTS.saveMenuLoad;
  const hintLines = wrapText(ctx, hint, pw - 48).slice(0, 2);
  const hintStartY = py + ph - 16 - (hintLines.length - 1) * 12;
  for (let i = 0; i < hintLines.length; i++) {
    ctx.fillText(hintLines[i], px + pw / 2, hintStartY + i * 13);
  }
  ctx.textAlign = 'left';
  ctx.restore();
}

// 从存档系统读取菜单摘要，避免渲染层复制存档格式细节。
function _readSaveMenuItems(mode) {
  const saves = loadAllSaves();
  const manual = [];
  for (let i = 1; i <= SAVE_SLOTS; i++) {
    const snap = saves.slots[i - 1];
    const summary = summarize(snap);
    manual.push(summary ? { slot: i, ...summary } : { slot: i, empty: true });
  }
  if (mode === 'save') return manual;

  const autoSummary = summarize(saves.auto);
  return [
    autoSummary ? { slot: 'auto', ...autoSummary } : { slot: 'auto', empty: true },
    ...manual,
  ];
}

// ============================================================
// 背包面板（I 键）
// ============================================================
export function drawInventoryPanel(ctx, game, px, py, pw, ph, gameTime) {
  const data = game.getInventoryData();
  const reduced = !!(game.settings && game.settings.reducedFx);
  // 标题由 panelFrame 绘制

  const barX = px + 32,
    barY = py + 54,
    barW = pw - 64,
    barH = 12;
  ctx.fillStyle = 'rgba(60,60,60,0.8)';
  ctx.fillRect(barX, barY, barW, barH);
  const sanRatio = Math.max(0, Math.min(1, data.san / data.maxSan));
  const sanColor = sanRatio > 0.6 ? UI.ok : sanRatio > 0.3 ? UI.warn : UI.danger;
  ctx.fillStyle = sanColor;
  ctx.fillRect(barX, barY, barW * sanRatio, barH);
  ctx.strokeStyle = 'rgba(200,200,200,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = '#fff';
  ctx.font = font(11);
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
  ctx.fillStyle = UI.gold;
  ctx.font = font(13, true);
  ctx.fillText('道具', leftX, topY);

  let yy = topY + 24;
  if (!data.items.length) {
    ctx.fillStyle = UI.inkSoft;
    ctx.font = font(13);
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
        const pulse = selectionPulse(gameTime, reduced);
        // 选中项效果：左侧鎏金垂直短线 + 水平两端渐变呼吸背景，不再是单调的纯色方块遮罩
        const rowGrad = ctx.createLinearGradient(leftX - 8, yy - 15, leftX - 8 + leftW, yy - 15);
        rowGrad.addColorStop(0, `rgba(224, 178, 98, ${pulse * 2.2})`);
        rowGrad.addColorStop(0.3, `rgba(224, 178, 98, ${pulse * 1.2})`);
        rowGrad.addColorStop(1, 'rgba(224, 178, 98, 0)');
        ctx.fillStyle = rowGrad;
        ctx.fillRect(leftX - 8, yy - 15, leftW, 36);

        ctx.strokeStyle = `rgba(224, 178, 98, ${0.12 + pulse * 1.5})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(leftX - 8, yy - 15, leftW, 36);

        // 左侧指示条
        ctx.fillStyle = UI.goldBright;
        ctx.fillRect(leftX - 8, yy - 15, 2.5, 36);
      }
      ctx.fillStyle = sel ? UI.goldBright : UI.ink;
      ctx.font = sel ? font(14, true) : font(13);
      const mark = sel ? '▶ ' : '  ';
      const name = mark + (it.name || ITEM_NAMES[it.id] || it.id);
      ctx.fillText(name, leftX, yy);
      ctx.fillStyle = UI.inkSoft;
      ctx.font = font(10);
      ctx.fillText(ITEM_DESCS[it.id] || '', leftX + 16, yy + 14);
      yy += rowH;
    }
    if (data.items.length > maxRows) {
      ctx.fillStyle = UI.inkFaint;
      ctx.font = font(11);
      ctx.fillText(`显示 ${start + 1}-${end} / ${data.items.length}`, leftX, bottomY - 10);
    }
  }

  let ry = topY;
  ctx.fillStyle = UI.gold;
  ctx.font = font(13, true);
  ctx.fillText('诗词与记录', rightX, ry);
  ry += 24;

  ctx.fillStyle = 'rgba(200,200,200,0.58)';
  ctx.font = font(11);
  ctx.fillText('已收集汉字', rightX, ry);
  ry += 18;
  if (data.chars.length) {
    ctx.font = font(15, true);
    ctx.fillStyle = UI.goldBright;
    const charLines = wrapText(ctx, data.chars.join('  '), rightW);
    for (let i = 0; i < Math.min(charLines.length, 4); i++) {
      ctx.fillText(charLines[i], rightX, ry + i * 19);
    }
    ry += Math.min(charLines.length, 4) * 19 + 10;
    if (charLines.length > 4) {
      ctx.fillStyle = UI.inkFaint;
      ctx.font = font(10);
      ctx.fillText('…更多汉字已收录', rightX, ry - 2);
      ry += 14;
    }
  } else {
    ctx.fillStyle = UI.inkFaint;
    ctx.font = font(12);
    ctx.fillText('（尚无）', rightX, ry);
    ry += 24;
  }

  const lines = [
    `方知远日记：${data.diaries}/6`,
    `语言种子：${data.seeds}/3`,
    `要石：${data.keystones.activated}/${data.keystones.total}（可选）`,
  ];
  ctx.font = font(12);
  for (const line of lines) {
    if (ry > bottomY - 18) break;
    ctx.fillStyle = 'rgba(225,215,190,0.78)';
    ctx.fillText(line, rightX, ry);
    ry += 22;
  }

  ctx.fillStyle = UI.inkFaint;
  ctx.font = font(11);
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ 选择   E 使用   I/Esc 关闭', px + pw / 2, py + ph - 16);
  ctx.textAlign = 'left';
}
