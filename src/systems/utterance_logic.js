// 纯逻辑：诗句/成语补空；可在 Node 测试，不依赖 DOM

export function uniqueCharsFrom(list) {
  const seen = new Set();
  const out = [];
  if (!list) return out;
  for (const c of list) {
    if (typeof c !== 'string' || !c) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/** 目标需要填的字：优先 blanks（有序），否则 required */
export function getBlanks(target) {
  if (!target) return [];
  if (Array.isArray(target.blanks) && target.blanks.length) return target.blanks.slice();
  if (Array.isArray(target.required) && target.required.length) return target.required.slice();
  return [];
}

/**
 * 将 prompt 按 blanks 数量拆成片段，便于 UI 渲染。
 * prompt 用 □ 或 __ 标空，数量应与 blanks 一致；不一致时退化为「前缀+空+后缀」。
 * @returns {{ parts: string[], blankCount: number }}
 */
export function parseClozePrompt(prompt, blanks) {
  const n = (blanks && blanks.length) || 0;
  if (!prompt || !n) {
    return { parts: [prompt || ''], blankCount: n };
  }
  const normalized = String(prompt).replace(/__/g, '□');
  const chunks = normalized.split('□');
  if (chunks.length === n + 1) {
    return { parts: chunks, blankCount: n };
  }
  // 回退：整句作前缀，空格接在后面
  const parts = [normalized];
  for (let i = 0; i < n; i++) parts.push(i < n - 1 ? ' ' : '');
  return { parts, blankCount: n };
}

/** 有序匹配：填入字必须与 blanks 一一对应 */
export function matchBlanks(filled, blanks) {
  const need = blanks || [];
  const got = filled || [];
  const missing = [];
  const wrong = [];
  for (let i = 0; i < need.length; i++) {
    if (!got[i]) missing.push(need[i]);
    else if (got[i] !== need[i]) wrong.push({ i, expect: need[i], got: got[i] });
  }
  return {
    ok: missing.length === 0 && wrong.length === 0 && got.length >= need.length,
    missing,
    wrong,
  };
}

/** @deprecated 兼容旧名：无序包含匹配 */
export function matchRequired(selectedChars, required) {
  const req = required || [];
  const pool = selectedChars ? [...selectedChars] : [];
  const missing = [];
  for (const ch of req) {
    const i = pool.indexOf(ch);
    if (i === -1) missing.push(ch);
    else pool.splice(i, 1);
  }
  return { ok: missing.length === 0, missing };
}

export function findNearestPurifyTarget(game, range) {
  if (!game || !game.scene || !game.scene.interactables) return null;
  const px = game.player.x;
  const py = game.player.y;
  let best = null;
  let bd = range;
  for (const it of game.scene.interactables) {
    if (it.type !== 'purify') continue;
    if (it.doneFlag && game.flags[it.doneFlag]) continue;
    if (it.completed) continue;
    if (it._cond && !game.flags[it._cond]) continue;
    const d = Math.hypot(it.x - px, it.y - py);
    if (d < bd) {
      bd = d;
      best = it;
    }
  }
  return best;
}

/** 合并玩家已收集字 + 目标干扰项（干扰项也需已收集才进池，避免无字可点） */
export function buildPool(collectedAll, target) {
  const base = uniqueCharsFrom(collectedAll || []);
  const blanks = getBlanks(target);
  // 保证空缺字若已收集则出现在池中（unique 已处理）
  const distractors = (target && target.distractors) || [];
  const extra = uniqueCharsFrom(
    distractors.filter((c) => base.includes(c) || (collectedAll || []).includes(c))
  );
  return uniqueCharsFrom([
    ...base,
    ...extra,
    ...blanks.filter((c) => (collectedAll || []).includes(c)),
  ]);
}
