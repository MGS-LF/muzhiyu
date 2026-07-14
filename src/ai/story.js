// 叙事状态：线索 / NPC 态度 / 世界史短句 / 分支标签
// 供导演与 Sydney 终局读取；可写入存档。

export const CLUE_CATALOG = {
  lost_echo: '失语者的残响：他们曾是完整的句子',
  cocoon_feed: '茧房以推荐喂养空洞',
  shuyuan_trust: '守砚愿把路指给你',
  shuyuan_wary: '守砚对你的刀多于对你的诗',
  terminal_corpus: '终端档案：冬眠者语料曾训练 Sydney',
  subway_seed: '地铁深处藏过语言种子',
  alley_brief: '居民区仍有人用旧规矩活着',
  stadium_scar: '茧房之战在你身上留下语义灼痕',
  poem_path: '你一路用诗句把门推开',
};

export function createEmptyStoryState() {
  return {
    clues: [], // { id, label, at }
    npcAttitude: {}, // name -> number -5..5
    history: [], // string[]
    branchTags: [], // string[]
    branchHistory: {}, // { [dialogKey]: messages[] }
  };
}

export function normalizeStoryState(raw) {
  const base = createEmptyStoryState();
  if (!raw || typeof raw !== 'object') return base;
  if (Array.isArray(raw.clues)) {
    base.clues = raw.clues
      .filter((c) => c && (c.id || c.label))
      .map((c) => ({
        id: String(c.id || c.label).slice(0, 48),
        label: String(c.label || c.id || '').slice(0, 80),
        at: typeof c.at === 'number' ? c.at : Date.now(),
      }))
      .slice(-24);
  }
  if (raw.npcAttitude && typeof raw.npcAttitude === 'object') {
    for (const [k, v] of Object.entries(raw.npcAttitude)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        base.npcAttitude[String(k).slice(0, 24)] = Math.max(-5, Math.min(5, v));
      }
    }
  }
  if (Array.isArray(raw.history)) {
    base.history = raw.history.map((h) => String(h).slice(0, 120)).filter(Boolean).slice(-20);
  }
  if (Array.isArray(raw.branchTags)) {
    base.branchTags = [...new Set(raw.branchTags.map((t) => String(t).slice(0, 32)))].slice(-24);
  }
  if (raw.branchHistory && typeof raw.branchHistory === 'object') {
    for (const [k, msgs] of Object.entries(raw.branchHistory)) {
      if (!Array.isArray(msgs)) continue;
      base.branchHistory[String(k).slice(0, 40)] = msgs
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
        .slice(-8);
    }
  }
  return base;
}

export function ensureStoryState(game) {
  if (!game.storyState) game.storyState = createEmptyStoryState();
  return game.storyState;
}

export function hasStoryClue(game, id) {
  const st = ensureStoryState(game);
  return st.clues.some((c) => c.id === id);
}

export function addStoryClue(game, id, label) {
  if (!id) return false;
  const st = ensureStoryState(game);
  const cid = String(id).slice(0, 48);
  if (st.clues.some((c) => c.id === cid)) return false;
  const lab = String(label || CLUE_CATALOG[cid] || cid).slice(0, 80);
  st.clues.push({ id: cid, label: lab, at: Date.now() });
  if (st.clues.length > 24) st.clues = st.clues.slice(-24);
  if (game.showHint) game.showHint(`线索已记入：${lab}`);
  return true;
}

export function addStoryHistory(game, line) {
  if (!line) return;
  const st = ensureStoryState(game);
  const t = String(line).slice(0, 120);
  if (st.history[st.history.length - 1] === t) return;
  st.history.push(t);
  if (st.history.length > 20) st.history = st.history.slice(-20);
}

export function addStoryTag(game, tag) {
  if (!tag) return;
  const st = ensureStoryState(game);
  const t = String(tag).slice(0, 32);
  if (!st.branchTags.includes(t)) st.branchTags.push(t);
  if (st.branchTags.length > 24) st.branchTags = st.branchTags.slice(-24);
}

export function adjustNpcAttitude(game, name, delta) {
  if (!name || !delta) return;
  const st = ensureStoryState(game);
  const n = String(name).slice(0, 24);
  const cur = st.npcAttitude[n] || 0;
  st.npcAttitude[n] = Math.max(-5, Math.min(5, cur + delta));
}

/** 应用导演返回的 storyDelta（白名单字段） */
export function applyStoryDelta(game, delta) {
  if (!delta || typeof delta !== 'object') return;
  if (Array.isArray(delta.cluesAdd)) {
    for (const c of delta.cluesAdd.slice(0, 3)) {
      if (typeof c === 'string') addStoryClue(game, c, CLUE_CATALOG[c] || c);
      else if (c && (c.id || c.label)) addStoryClue(game, c.id || c.label, c.label || c.id);
    }
  }
  if (delta.unlockClue) {
    addStoryClue(game, delta.unlockClue, delta.unlockLabel || CLUE_CATALOG[delta.unlockClue]);
  }
  if (delta.npcAttitude && typeof delta.npcAttitude === 'object') {
    for (const [name, v] of Object.entries(delta.npcAttitude)) {
      if (typeof v === 'number') {
        const st = ensureStoryState(game);
        const n = String(name).slice(0, 24);
        st.npcAttitude[n] = Math.max(-5, Math.min(5, (st.npcAttitude[n] || 0) + v));
      }
    }
  }
  if (typeof delta.historyAdd === 'string' && delta.historyAdd.trim()) {
    addStoryHistory(game, delta.historyAdd.trim());
    if (game.showHint) game.showHint(`世界史更新：${delta.historyAdd.trim().slice(0, 40)}`);
  }
  if (Array.isArray(delta.tagsAdd)) {
    for (const t of delta.tagsAdd.slice(0, 4)) addStoryTag(game, t);
  }
  if (typeof delta.objectiveHint === 'string' && delta.objectiveHint.trim() && game.showHint) {
    game.showHint(delta.objectiveHint.trim().slice(0, 60));
  }
}

export function storyStateSummary(game) {
  const st = ensureStoryState(game);
  const clues = st.clues.length
    ? st.clues.map((c) => c.label || c.id).join('；')
    : '无';
  const att = Object.keys(st.npcAttitude).length
    ? Object.entries(st.npcAttitude)
        .map(([n, v]) => `${n}:${v > 0 ? '+' : ''}${v}`)
        .join('，')
    : '无记录';
  const hist = st.history.length ? st.history.slice(-5).join(' / ') : '无';
  const tags = st.branchTags.length ? st.branchTags.join(',') : '无';
  const engs = (game.engravings || [])
    .slice(-3)
    .map((e) => (e && e.text) || '')
    .filter(Boolean)
    .join('；');
  return [
    `线索(${st.clues.length})：${clues}`,
    `NPC态度：${att}`,
    `近期世界史：${hist}`,
    `分支标记：${tags}`,
    `刻痕：${engs || '无'}`,
  ].join('\n');
}

export function getBranchHistoryStore(game) {
  return ensureStoryState(game).branchHistory;
}

export function setBranchHistoryStore(game, key, msgs) {
  const st = ensureStoryState(game);
  if (!key) return;
  st.branchHistory[String(key)] = (msgs || []).slice(-8);
}

export function recordBranchChoiceInStory(game, key, choiceLabel) {
  if (!key || !choiceLabel) return;
  const store = getBranchHistoryStore(game);
  if (!store[key]) store[key] = [];
  store[key].push({ role: 'user', content: `【玩家选择了】${choiceLabel}` });
  store[key] = store[key].slice(-8);
}

export function clearStoryBranchHistory(game, key) {
  const st = ensureStoryState(game);
  if (key) delete st.branchHistory[key];
  else st.branchHistory = {};
}
