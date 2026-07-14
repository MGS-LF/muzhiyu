// 娓叉煋鍣ㄥ叆鍙?鈥?缂栨帓鍚勫瓙妯″潡鐨勭粯鍒惰皟鐢?
import { W, H } from './config.js';
import * as fx from './fx.js';
import { isMuted } from './audio.js';
import { drawMinimap } from './minimap.js';
import { getDifficultyDef } from './difficulty.js';
import { drawBattle } from './render/battle.js';
import { drawSlashBattle } from './render/slash_battle.js';
import { drawHackingBattle } from './hacking/render.js';
import {
  drawFreezeCenter,
  drawStreet,
  drawKeystones,
  drawRiverside,
  drawSubway,
  drawSubwayDepth,
  drawAlley,
  drawHouse,
  drawStadium,
  drawDataCenter,
  drawGenericScene,
} from './render/scenes.js';
import {
  drawItems,
  drawCureNPCs,
  drawPurifyProps,
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
import { drawUtterance } from './render/utterance.js';
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
// 涓绘覆鏌?
// ============================================================
export function render(game, gameTime) {
  const { ctx, camera, scene, player, dialogState, hints, tutorial, objective } = game;

  // 战斗模式：独立渲染，但系统菜单/存档菜单仍要盖在上面
  if (game.battle) {
    if (game.battle.isHack || game.battle.mode === 'hack') {
      drawHackingBattle(ctx, game.battle, gameTime);
    } else if (game.battle.isSlash || game.battle.mode === 'slash') {
      drawSlashBattle(ctx, game.battle, gameTime);
    } else {
      drawBattle(ctx, game.battle, gameTime);
    }
    if (game.uiPanel) drawUIPanel(ctx, game, gameTime);
    if (game._saveMenu) drawSaveMenu(ctx, game, gameTime);
    // 开场介绍时不叠 toast，避免挡住操作说明
    if (hints.length && !(game.battle.isHack && game.battle.phase === 'intro')) {
      drawHints(ctx, hints);
    }
    return;
  }

  if (game.endless) {
    game.endless.render(ctx, gameTime);
    return;
  }

  // 閫犲彞妯″紡锛氱嫭绔嬫覆鏌?
  if (game.compose) {
    drawCompose(ctx, game.compose, gameTime);
    return;
  }

  // Sydney鑷敱瀵硅瘽锛氱嫭绔嬫覆鏌?
  if (game.converse) {
    drawConverse(ctx, game.converse, gameTime);
    return;
  }

  // 姹熷牑妯増鍏冲崱锛氱嫭绔嬫覆鏌擄紙鍙犲姞瀵硅瘽/鎻愮ず锛?
  if (game.sidescroll) {
    game.sidescroll.render(ctx, gameTime);
    if (dialogState) drawDialog(ctx, dialogState, gameTime, game);
    if (hints.length) drawHints(ctx, hints);
    if (game.aiThinking) drawThinking(ctx, gameTime, game.aiThinkingText, game);
    if (game._uiOverlay) drawThinking(ctx, gameTime, game._uiOverlay.text, game);
    if (game.uiPanel) drawUIPanel(ctx, game, gameTime);
    if (game.engraveState) {
      drawEngraving(ctx, game.engraveState, gameTime, game);
      ensureEngraveInput(game);
    }
    return;
  }

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = scene.bgColor;
  ctx.fillRect(0, 0, W, H);

  // 灞忓箷闇囧姩鍋忕Щ锛堜粎鍦ㄩ潪鎴樻枟/闈炲璇濈殑鎺㈢储妯″紡涓嬪簲鐢紝閬垮厤褰卞搷鐙珛妯″紡锛?
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
  else if (scene.id === 'subway_depth') drawSubwayDepth(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'alley_district') drawAlley(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'house_a' || scene.id === 'house_b')
    drawHouse(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'stadium') drawStadium(ctx, W2S, scene, gameTime, game);
  else if (scene.id === 'data_center') drawDataCenter(ctx, W2S, scene, gameTime, game);
  // 绗簲绔犳柊鍦烘櫙锛氬鐢ㄩ€氱敤娓叉煋锛坧rops/walls/瑁呴グ鐗╃敱閫氱敤灞傜粯鍒讹級
  else if (
    scene.id === 'ruined_library' ||
    scene.id === 'network_nexus' ||
    scene.id === 'memory_abyss' ||
    scene.id === 'lost_village' ||
    scene.id === 'dream_tutorial'
  ) {
    drawGenericScene(ctx, W2S, scene, gameTime, game);
  }

  // 浜や簰鐐硅繙璺濈瑙嗚鏍囪瘑锛堜负浠呮湁闈犺繎瑙﹀彂鍦堛€佸嵈鏃犲疄浣撴ā鍨嬬殑浜や簰鐐硅ˉ鍙鐗╋級
  drawInteractableMarkers(ctx, W2S, scene, game, gameTime);

  // 绔犺妭闂ㄧ鐨勫彲瑙嗗寲锛堝睆闅?鍏夋煴锛?
  drawGates(ctx, W2S, scene, game, gameTime);

  // 净化物先画，靠近提示后画，避免 F·组句 与招牌字重叠
  drawPurifyProps(ctx, W2S, scene, game, gameTime);

  drawInteractHints(ctx, W2S, scene, player, game.collected, gameTime, game);

  if (scene.enemies) drawEnemies(ctx, W2S, scene.enemies, gameTime, game);
  drawItems(ctx, W2S, scene, gameTime, game.collected);
  drawCureNPCs(ctx, W2S, scene, game, gameTime);

  // 要石
  drawKeystones(ctx, W2S, scene, game.activatedKeystones, gameTime);

  // 鐜╁锛堝彧鏈夌湡姝ｅ彈浼ゆ椂鎵嶉棯鐑侊級
  const hurt = game.player.invulnerable > 0 && game.player.hurtFlash;
  player.draw(ctx, camera, gameTime, hurt);

  // 绮掑瓙
  if (game.combat.particles.length && !(game.settings && game.settings.reducedFx))
    drawParticles(ctx, W2S, game.combat.particles);

  // 鐩爣鎸囧紩绠ご
  drawObjectiveArrow(ctx, W2S, game, gameTime);

  // 姘涘洿灞傦紙灏樺焹 / 闆炬皵 / 鑹插僵鍒嗙骇锛?
  drawAtmosphere(ctx, scene, gameTime, camera);

  drawLighting(ctx, player, camera, scene.id);

  // 鍙椾激绾㈠睆锛堝彧鏈夌湡姝ｅ彈浼ゆ椂锛?
  if (game.player.hurtFlash && game.player.invulnerable > 0)
    drawDamageOverlay(ctx, player, gameTime);

  drawHUD(ctx, player, game, objective);

  // 恢复抖动偏移的 save（HUD 之后的内容不受抖动影响）
  ctx.restore();

  if (dialogState) drawDialog(ctx, dialogState, gameTime, game);

  if (hints.length) drawHints(ctx, hints);

  if (tutorial) drawTutorial(ctx, gameTime, tutorial);

  if (game.aiThinking) drawThinking(ctx, gameTime, game.aiThinkingText, game);
  if (game._uiOverlay)
    drawThinking(ctx, gameTime, game._uiOverlay.text || game._uiOverlay.kind, game);

  // 组句面板（探索 overlay，盖在 HUD 之上）
  if (game.utteranceState) {
    drawUtterance(ctx, game, gameTime);
  }

  // 刻字模式
  if (game.engraveState) {
    drawEngraving(ctx, game.engraveState, gameTime, game);
    ensureEngraveInput(game);
  } else if (game._engraveInput && game._engraveInput.parentNode) {
    game._engraveInput.parentNode.removeChild(game._engraveInput);
    game._engraveInput = null;
  }

  // 缁撳眬鍗★紙瀵硅瘽缁撴潫鍚庯紝game_complete 鏃惰鐩栨樉绀猴級
  if (game.flags && game.flags.game_complete && !dialogState && !game.engraveState) {
    drawEnding(ctx, game.ending, gameTime, game.endingEpilogue, game);
  }

  // UI 闈㈡澘锛堜换鍔?鍦板浘/璋冭瘯锛?
  if (game.uiPanel) drawUIPanel(ctx, game, gameTime);

  // === 瑙嗚鐗规晥鍙犲姞灞傦紙闇囧姩鍋忕Щ宸插湪涓婃柟 ctx.save/translate 搴旂敤锛屾澶勪粎鐢昏鐩栫墿锛?==
  if (!(game.settings && game.settings.reducedFx)) fx.drawOverlay(ctx, gameTime);

  // 瀛樻。鎴愬姛闂儊鎻愮ず
  if (game._saveFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game._saveFlash / 500);
    ctx.fillStyle = '#ffd866';
    ctx.font = '14px "SimSun","Songti SC",serif';
    ctx.textAlign = 'right';
    ctx.fillText('✓ 已存档', W - 12, 30);
    ctx.restore();
  }

  // 闈欓煶鎸囩ず
  if (isMuted()) {
    ctx.save();
    ctx.fillStyle = 'rgba(200,200,200,0.6)';
    ctx.font = '11px "SimSun",serif';
    ctx.textAlign = 'right';
    ctx.fillText('静音中 (N 取消)', W - 12, 50);
    ctx.restore();
  }

  // 灏忓湴鍥撅紙鍙充笂瑙掞紝Tab 鍒囨崲鏄剧ず锛岄潪闈㈡澘/瀵硅瘽/鎴樻枟鏃舵樉绀猴級
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
    !game.engraveState &&
    !game.utteranceState
  ) {
    drawMinimap(ctx, game, gameTime);
  }

  // 闅惧害鎸囩ず锛堝乏涓嬭灏忓瓧锛?
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

  // 瀛樻。鑿滃崟
  if (game._saveMenu) drawSaveMenu(ctx, game, gameTime);
}
