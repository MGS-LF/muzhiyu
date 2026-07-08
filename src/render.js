// 渲染器入口 — 编排各子模块的绘制调用
import { W, H } from './config.js';
import * as fx from './fx.js';
import { isMuted } from './audio.js';
import { drawMinimap } from './minimap.js';
import { getDifficultyDef } from './difficulty.js';
import { drawBattle } from './render/battle.js';
import {
  drawFreezeCenter,
  drawStreet,
  drawKeystones,
  drawRiverside,
  drawSubway,
  drawAlley,
  drawHouse,
  drawStadium,
  drawDataCenter,
  drawGenericScene,
} from './render/scenes.js';
import {
  drawItems,
  drawCureNPCs,
  drawInteractHints,
  drawAtmosphere,
  drawLighting,
  drawInteractableMarkers,
  drawEnemies,
  drawEngraving,
  ensureEngraveInput,
  drawParticles,
} from './render/world.js';
import { drawHUD, drawGates, drawObjectiveArrow, drawDamageOverlay } from './render/hud.js';
import {
  drawDialog,
  drawHints,
  drawTutorial,
  drawConverse,
  drawThinking,
  drawEnding,
  drawCompose,
} from './render/dialog.js';
import { drawUIPanel, drawSaveMenu } from './render/panels.js';

export { Camera } from './render/util.js';

// ============================================================
// 主渲染
// ============================================================
export function render(game, gameTime) {
  const { ctx, camera, scene, player, dialogState, hints, tutorial, objective } = game;

  // 战斗模式：独立渲染
  if (game.battle) {
    drawBattle(ctx, game.battle, gameTime);
    return;
  }

  // 造句模式：独立渲染
  if (game.compose) {
    drawCompose(ctx, game.compose, gameTime);
    return;
  }

  // Sydney自由对话：独立渲染
  if (game.converse) {
    drawConverse(ctx, game.converse, gameTime);
    return;
  }

  // 江堤横版关卡：独立渲染（叠加对话/提示）
  if (game.sidescroll) {
    game.sidescroll.render(ctx, gameTime);
    if (dialogState) drawDialog(ctx, dialogState, gameTime, game);
    if (hints.length) drawHints(ctx, hints);
    if (game.aiThinking) drawThinking(ctx, gameTime, game.aiThinkingText);
    if (game.uiPanel) drawUIPanel(ctx, game, gameTime);
    return;
  }

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = scene.bgColor;
  ctx.fillRect(0, 0, W, H);

  // 屏幕震动偏移（仅在非战斗/非对话的探索模式下应用，避免影响独立模式）
  const shakeOff = fx.getShakeOffset();
  ctx.save();
  if (shakeOff.x !== 0 || shakeOff.y !== 0) {
    ctx.translate(shakeOff.x, shakeOff.y);
  }

  camera.follow(player.x, player.y);
  camera.clamp(scene.width, scene.height);

  const W2S = (x, y) => camera.worldToScreen(x, y);

  if (scene.id === 'freeze_center') drawFreezeCenter(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'street_01') drawStreet(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'riverside') drawRiverside(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'subway') drawSubway(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'alley_district') drawAlley(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'house_a' || scene.id === 'house_b')
    drawHouse(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'stadium') drawStadium(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'data_center') drawDataCenter(ctx, W2S, scene, gameTime, game);
  // 第五章新场景：复用通用渲染（props/walls/装饰物由通用层绘制）
  else if (
    scene.id === 'ruined_library' ||
    scene.id === 'network_nexus' ||
    scene.id === 'memory_abyss' ||
    scene.id === 'lost_village'
  ) {
    drawGenericScene(ctx, W2S, scene, gameTime, game);
  }

  // 交互点远距离视觉标识（为仅有靠近触发圈、却无实体模型的交互点补可见物）
  drawInteractableMarkers(ctx, W2S, scene, game, gameTime);

  // 章节门禁的可视化（屏障/光柱）
  drawGates(ctx, W2S, scene, game, gameTime);

  drawInteractHints(ctx, W2S, scene, player, game.collected, gameTime);

  // 敌人（在玩家之下，大地图上显示位置）
  if (scene.enemies) drawEnemies(ctx, W2S, scene.enemies, gameTime, game);

  // 掉落物
  drawItems(ctx, W2S, scene, gameTime, game.collected);

  // 失语者支线 NPC
  drawCureNPCs(ctx, W2S, scene, game, gameTime);

  // 要石
  drawKeystones(ctx, W2S, scene, game.activatedKeystones, gameTime);

  // 玩家（只有真正受伤时才闪烁）
  const hurt = game.player.invulnerable > 0 && game.player.hurtFlash;
  player.draw(ctx, camera, gameTime, hurt);

  // 粒子
  if (game.combat.particles.length && !(game.settings && game.settings.reducedFx))
    drawParticles(ctx, W2S, game.combat.particles);

  // 目标指引箭头
  drawObjectiveArrow(ctx, W2S, game, gameTime);

  // 氛围层（尘埃 / 雾气 / 色彩分级）
  drawAtmosphere(ctx, scene, gameTime, camera);

  drawLighting(ctx, player, camera, scene.id);

  // 受伤红屏（只有真正受伤时）
  if (game.player.hurtFlash && game.player.invulnerable > 0)
    drawDamageOverlay(ctx, player, gameTime);

  drawHUD(ctx, player, game, objective);

  // 恢复震动偏移的 save（HUD 之后的内容不受震动影响）
  ctx.restore();

  if (dialogState) drawDialog(ctx, dialogState, gameTime, game);

  if (hints.length) drawHints(ctx, hints);

  if (tutorial) drawTutorial(ctx, gameTime, tutorial);

  // 等待 LLM 的提示
  if (game.aiThinking) drawThinking(ctx, gameTime, game.aiThinkingText);

  // 刻字模式
  if (game.engraveState) {
    drawEngraving(ctx, game.engraveState, gameTime, game);
    ensureEngraveInput(game);
  } else if (game._engraveInput && game._engraveInput.parentNode) {
    game._engraveInput.parentNode.removeChild(game._engraveInput);
    game._engraveInput = null;
  }

  // 结局卡（对话结束后，game_complete 时覆盖显示）
  if (game.flags && game.flags.game_complete && !dialogState && !game.engraveState) {
    drawEnding(ctx, game.ending, gameTime, game.endingEpilogue, game);
  }

  // UI 面板（任务/地图/调试）
  if (game.uiPanel) drawUIPanel(ctx, game, gameTime);

  // === 视觉特效叠加层（震动偏移已在上方 ctx.save/translate 应用，此处仅画覆盖物）===
  if (!(game.settings && game.settings.reducedFx)) fx.drawOverlay(ctx, gameTime);

  // 存档成功闪烁提示
  if (game._saveFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game._saveFlash / 500);
    ctx.fillStyle = '#ffd866';
    ctx.font = '14px "SimSun","Songti SC",serif';
    ctx.textAlign = 'right';
    ctx.fillText('✓ 已存档', W - 12, 30);
    ctx.restore();
  }

  // 静音指示
  if (isMuted()) {
    ctx.save();
    ctx.fillStyle = 'rgba(200,200,200,0.6)';
    ctx.font = '11px "SimSun",serif';
    ctx.textAlign = 'right';
    ctx.fillText('🔇 静音中 (N 取消)', W - 12, 50);
    ctx.restore();
  }

  // 小地图（右上角，Tab 切换显示，非面板/对话/战斗时显示）
  if (
    game._showMinimap &&
    !game.uiPanel &&
    !game.battle &&
    !game.compose &&
    !game.converse &&
    !game.sidescroll &&
    !game.level3d &&
    !game._saveMenu &&
    game.scene &&
    !game.dialogState &&
    !game.tutorial &&
    !game.engraveState
  ) {
    drawMinimap(ctx, game, gameTime);
  }

  // 难度指示（左下角小字）
  if (game.difficultyId) {
    ctx.save();
    const def = getDifficultyDef(game.difficultyId);
    ctx.fillStyle = def.color;
    ctx.font = '10px "SimSun",serif';
    ctx.textAlign = 'left';
    ctx.globalAlpha = 0.6;
    ctx.fillText(`难度：${def.name}`, 12, H - 12);
    ctx.restore();
  }

  // 存档菜单
  if (game._saveMenu) drawSaveMenu(ctx, game, gameTime);
}
