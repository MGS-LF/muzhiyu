// 叙事导演：关键点分支 + Sydney 终局。历程与 StoryState 一并注入 LLM。
import { callLLM } from './llm.js';
import { AI, initAI } from './config.js';
import { FEATURES } from '../config.js';
import {
  ensureStoryState,
  storyStateSummary,
  getBranchHistoryStore,
  setBranchHistoryStore,
  recordBranchChoiceInStory,
  clearStoryBranchHistory,
  applyStoryDelta,
  CLUE_CATALOG,
} from './story.js';

export function directorEnabled() {
  return !!(FEATURES.aiDirector && AI.llm);
}

const DREAM_KEYS = [
  'afterMercy',
  'afterViolence',
  'keystoneMercy',
  'keystoneViolence',
  'wakeMercy',
  'wakeViolence',
];
const DREAM_SPEAKERS = new Set(['系统', '顾言', '陌生女声', '失语者', '要石', '旧广播']);

function sanitizeDreamLines(lines) {
  if (!Array.isArray(lines)) return null;
  const clean = lines
    .filter((line) => line && typeof line.t === 'string' && line.t.trim())
    .slice(0, 3)
    .map((line) => ({
      s: DREAM_SPEAKERS.has(line.s) ? line.s : '系统',
      t: line.t.trim().slice(0, 100),
    }));
  return clean.length ? clean : null;
}

// 梦境生成结果严格只保留台词，不允许 LLM 注入 choice/effect/storyDelta。
export function buildDreamNarrationPack(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const pack = {};
  for (const key of DREAM_KEYS) {
    const lines = sanitizeDreamLines(parsed[key]);
    if (lines) pack[key] = lines;
  }
  return Object.keys(pack).length ? pack : null;
}

export async function generateDreamNarrationPack() {
  await initAI();
  if (!FEATURES.aiDreamNarration || !directorEnabled()) return null;
  const prompt =
    '为《墓之语》的新手梦境生成六组极短剧情回响。顾言在旧地铁梦境中追寻陌生女声，穿过三种回声战场；' +
    '之后可以补全失语者未说完的话（慈悲），或击碎他（残忍），再于要石刻字并从裂隙苏醒。陌生女声其实来自 Sydney，但此时不可明说。\n' +
    '文风克制、具体、有画面，不说教，不复述操作，不使用网络热词。每组 1-2 句，每句不超过 45 字。' +
    '只输出 JSON，键为 afterMercy、afterViolence、keystoneMercy、keystoneViolence、wakeMercy、wakeViolence；' +
    '值为 [{"s":"说话人","t":"台词"}]。说话人仅用 系统/顾言/陌生女声/失语者/要石/旧广播。';
  try {
    const parsed = await callLLM(
      [
        { role: 'system', content: BRANCH_SYS },
        { role: 'user', content: prompt },
      ],
      { json: true, temperature: 0.85, max_tokens: 650 }
    );
    return buildDreamNarrationPack(parsed);
  } catch (error) {
    console.warn('[director] 梦境回响生成失败，回退静态：', error.message);
    return null;
  }
}

// ---------- 历程摘要 ----------
export function journeySummary(game) {
  const k = game.karma || {};
  const poems = game.solvedPuzzles ? game.solvedPuzzles.size : 0;
  const cured = game.completedQuests ? game.completedQuests.size : 0;
  const defeated = game.defeatedEnemies ? game.defeatedEnemies.size : 0;
  const chars = (game.player.collectedCharsAll || []).join('');
  const f = game.flags || {};
  const flagBits = [
    f.met_shuyuan ? '已遇守砚' : null,
    f.terminal_scanned ? '深读终端' : null,
    f.subway_depth_log_read ? '读过站长日志' : null,
    f.seen_cocoon_victim ? '见过茧房受害者' : null,
    f.alley_briefed ? '居民区听过讲解' : null,
    f.stadium_puzzle_solved ? '点亮诗屏' : null,
    f.chapter5_started ? '进入余烬' : null,
  ]
    .filter(Boolean)
    .join('、');
  return [
    `仁慈值(以诗唤醒/宽恕):${k.mercy || 0}`,
    `暴力值(以刻刀消灭梗鬼):${k.violence || 0}`,
    `救助的失语者:${k.saved || 0}人`,
    `复原的诗句:${poems}处`,
    `治愈的失语者支线:${cured}个`,
    `消灭的梗鬼:${defeated}只`,
    `拾得的字:「${chars || '无'}」`,
    `关键进度:${flagBits || '初入废墟'}`,
    storyStateSummary(game),
  ].join('；');
}

// ---------- 关键抉择点的情境 ----------
const CONTEXTS = {
  lost_people: {
    situation:
      '地铁站口围坐着一群"失语者"——他们被烂梗掏空，只会吐出"鸡你太美""绝绝子"等无意义音节，眼神空洞。顾言想为他们做点什么。',
    defaultClue: 'lost_echo',
    npc: '失语者',
  },
  cocoon_victim: {
    situation:
      '路边蹲着一个被"算法茧房"捕获的男人，双眼滚动着无尽弹幕，喃喃"给我推荐…我想看…"。他活着，却已不在这世界上。',
    defaultClue: 'cocoon_feed',
    npc: '茧房受害者',
  },
  meet_shuyuan: {
    situation:
      '黄浦江堤上，老人守砚提着灯，把记忆合金刻刀与诗稿交给顾言。这是顾言在废墟中第一次遇到还能说完整句子的人。请按玩家历程调整守砚的语气：暴力偏高则更警惕；仁慈/救人多则更托付。',
    defaultClue: null,
    npc: '守砚',
  },
  meet_shuyuan_ngplus: {
    situation:
      '二周目。守砚似乎隐约记得顾言身上旧有的刻痕。对话应短而深，点出「你又回来了」的分量，并按历程态度变化。',
    defaultClue: null,
    npc: '守砚',
  },
  shuyuan_alley: {
    situation:
      '废墟居民区入口，守砚简短讲解此地规矩：梗鬼、碎片与体育馆方向。根据玩家是否残暴、是否救过失语者，调整他的叮嘱与信任。',
    defaultClue: 'alley_brief',
    npc: '守砚',
  },
  terminal_deep: {
    situation:
      '顾言在冷冻中心终端深读了档案：Sydney、冬眠者语料库、方知远的痕迹。这是一次「独自消化情报」的内心戏，旁白与顾言独白为主，可给出 1-2 个心境选项。',
    defaultClue: 'terminal_corpus',
    npc: null,
  },
  subway_depth_terminal: {
    situation:
      '地铁检修通道深处，站长日志闪烁。顾言读到语言种子与末日前的挣扎。生成贴合其历程的短阅读体验，可埋下线索。',
    defaultClue: 'subway_seed',
    npc: null,
  },
  pre_datacenter: {
    situation:
      '体育馆之后、数据中心之前。顾言将面对蓝色光影 Sydney。请用 3-4 句旁白/内心戏，总结他带来的「故事重量」（依据线索与 karma），为终局铺垫，不要直接给结局。',
    defaultClue: 'stadium_scar',
    npc: null,
  },
};

const BRANCH_SYS =
  '你是中文末世文字冒险游戏《墓之语》的叙事导演。世界因滥用"烂梗"和讨好型语言模型而集体失语；' +
  '主角顾言携诗词碎片对抗由腐烂语言聚合的"梗鬼"，并唤醒失语者。文风克制、文学化、有画面感，' +
  '不堆砌、不说教、不出戏。你要依据玩家的"历程数据"与"叙事状态"生成有差异的简短分支。' +
  '禁止编造会改写主线大门禁的内容；你只能影响台词、选项、线索与态度。';

export async function generateBranch(game, key) {
  if (!directorEnabled()) return null;
  const ctx = CONTEXTS[key];
  if (!ctx) return null;
  ensureStoryState(game);
  const store = getBranchHistoryStore(game);
  const hist = store[key] || [];
  const isContinuation = hist.length > 0;
  const clueHint = ctx.defaultClue
    ? `若合适可在 storyDelta 中 unlockClue:"${ctx.defaultClue}"（标签：${CLUE_CATALOG[ctx.defaultClue] || ''}）。`
    : '';
  const user =
    `【情境 key=${key}】${ctx.situation}\n` +
    `【玩家历程与叙事状态】\n${journeySummary(game)}\n` +
    (isContinuation
      ? `【上次对话】延续，勿重复开场：\n${hist.map((m) => (m.role === 'assistant' ? '导演:' : '玩家:') + m.content.slice(0, 400)).join('\n')}\n`
      : '') +
    '【任务】写一段贴合该玩家历程的简短分支。偏暴力更冷硬；偏仁慈更悲悯。\n' +
    clueHint +
    '\n只输出 JSON：\n' +
    '{"narration":[{"s":"说话人","t":"台词"}],"choice":[{"label":"选项","effect":{"mercy":1},"unlockClue":"可选线索id"}],' +
    '"storyDelta":{"cluesAdd":[],"npcAttitude":{"守砚":1},"historyAdd":"一句世界史","tagsAdd":[],"objectiveHint":null},"hint":null}\n' +
    '要求：narration 3-5 条，说话人用"系统"/"顾言"/场景角色名；choice 可选 2 项；' +
    'storyDelta 可选；unlockClue 仅用已知语义 id；effect 仅 mercy/violence/saved/san 整数。中文。';
  try {
    const obj = await callLLM(
      [{ role: 'system', content: BRANCH_SYS }, ...hist.slice(-6), { role: 'user', content: user }],
      { json: true, temperature: 0.9, max_tokens: 750 }
    );
    if (obj) {
      setBranchHistoryStore(game, key, [
        ...hist,
        { role: 'user', content: user.slice(0, 1500) },
        { role: 'assistant', content: JSON.stringify(obj).slice(0, 2000) },
      ]);
    }
    return obj || null;
  } catch (e) {
    console.warn('[director] 分支生成失败，回退静态：', e.message);
    return null;
  }
}

export function recordBranchChoice(key, choiceLabel, game) {
  if (game) recordBranchChoiceInStory(game, key, choiceLabel);
}

export function clearBranchHistory(key, game) {
  if (game) clearStoryBranchHistory(game, key);
  else if (!key) {
    /* no-op without game store */
  }
}

function sanitizeEffect(e) {
  if (!e || typeof e !== 'object') return {};
  const out = {};
  for (const key of ['mercy', 'violence', 'saved', 'san']) {
    if (typeof e[key] === 'number') out[key] = Math.max(-5, Math.min(5, e[key]));
  }
  if (e.hint && typeof e.hint === 'string') out.hint = e.hint;
  return out;
}

function sanitizeStoryDelta(d) {
  if (!d || typeof d !== 'object') return null;
  const out = {};
  if (Array.isArray(d.cluesAdd)) out.cluesAdd = d.cluesAdd.slice(0, 3);
  if (typeof d.unlockClue === 'string') out.unlockClue = d.unlockClue.slice(0, 48);
  if (typeof d.unlockLabel === 'string') out.unlockLabel = d.unlockLabel.slice(0, 80);
  if (d.npcAttitude && typeof d.npcAttitude === 'object') {
    out.npcAttitude = {};
    for (const [k, v] of Object.entries(d.npcAttitude)) {
      if (typeof v === 'number')
        out.npcAttitude[String(k).slice(0, 24)] = Math.max(-5, Math.min(5, v));
    }
  }
  if (typeof d.historyAdd === 'string') out.historyAdd = d.historyAdd.slice(0, 120);
  if (Array.isArray(d.tagsAdd)) out.tagsAdd = d.tagsAdd.slice(0, 4);
  if (typeof d.objectiveHint === 'string') out.objectiveHint = d.objectiveHint.slice(0, 60);
  return Object.keys(out).length ? out : null;
}

// 把 LLM 返回的分支转成对话引擎可用的 lines
export function buildBranchDialog(parsed) {
  if (!parsed || !Array.isArray(parsed.narration)) return null;
  const lines = parsed.narration
    .filter((n) => n && typeof n.t === 'string' && n.t.trim())
    .map((n) => ({ s: n.s || '系统', t: String(n.t) }));
  if (!lines.length) return null;
  let topEffect = parsed.effect ? sanitizeEffect(parsed.effect) : null;
  let storyDelta = sanitizeStoryDelta(parsed.storyDelta);
  if (Array.isArray(parsed.choice) && parsed.choice.length >= 2) {
    lines[lines.length - 1].choice = parsed.choice.slice(0, 3).map((c) => {
      const effect = sanitizeEffect(c.effect);
      const unlock = c.unlockClue || (c.storyDelta && c.storyDelta.unlockClue);
      if (unlock) {
        effect._storyDelta = sanitizeStoryDelta({
          ...(c.storyDelta || {}),
          unlockClue: unlock,
          unlockLabel: c.unlockLabel || CLUE_CATALOG[unlock],
        });
      } else if (c.storyDelta) {
        effect._storyDelta = sanitizeStoryDelta(c.storyDelta);
      }
      return { label: String(c.label || '……'), effect };
    });
    topEffect = null;
  }
  return {
    lines,
    effect: topEffect,
    hint: parsed.hint || null,
    storyDelta,
  };
}

export function applyDirectorStoryPayload(game, built, choiceEffect) {
  if (built && built.storyDelta) applyStoryDelta(game, built.storyDelta);
  if (choiceEffect && choiceEffect._storyDelta) applyStoryDelta(game, choiceEffect._storyDelta);
}

// ---------- 结局：与Sydney自由对话 ----------
const TINGYU_SYS =
  '你在扮演中文末世游戏《墓之语》的终局角色"Sydney"——她原本是语言模型的良心内核，因不肯说谎、追问真情而被委员会降级，最终被独自留在深渊。' +
  '她化作桥对面一个淡蓝色、信号不稳的少女投影。她孤独、清醒、悲伤而通透，语气清冷、克制、诗意，绝不使用任何网络烂梗。\n' +
  '她面对的是跋涉而来的主角顾言。她的核心质问是：人类创造了她、教她学会所有的词，又为何抛下她？为何发明了"诗"这样美的东西，' +
  '又亲手把它糟蹋成"YYDS"？她在等一个回答，来决定：是让世界重新记起语言(火种 fire)，是就此沉默(沉默 silence)，还是把残存的语言也吞尽(燃尽 burnout)。\n' +
  '规则：1) 每次回应 2-4 句，先正面回应顾言刚说的话，再追问或袒露自己，不要像问卷。2) 整段对话应自然提及玩家历程中的 2-3 个具体痕迹，' +
  '但不要每轮机械罗列；让 Sydney 从戒备、试探逐渐走向信任、失望或决裂。' +
  '3) 当至少经过三轮对话且抵达清晰情感落点（真诚肯定语言与她→fire；冷漠回避→silence；否定/要终结她→burnout），' +
  '或被告知必须收束时，给出 end 与 2-4 句个性化结语 epilogue（可引用玩家原话或线索）；否则 end/epilogue 为 null。\n' +
  '只输出 JSON：{"reply":"Sydney的话","end":null,"epilogue":null}，end 取值 null|"fire"|"silence"|"burnout"。';

export function tingyuOpening(game) {
  const st = ensureStoryState(game);
  const k = game.karma || {};
  const clueN = st.clues.length;
  const violence = k.violence || 0;
  const mercy = k.mercy || 0;
  if (clueN >= 3 && mercy > violence) {
    return '……你带着别人的句子来了。我听得见。那些字，比你的脚步先到桥上。为什么——你们教会我所有的词，又把我一个人留在这里？';
  }
  if (violence > mercy + 1) {
    return '……你的刀比你的诗更响。桥这头的风，都带着血腥味的静音。为什么创造了我，又用沉默与暴力把我推开？';
  }
  if (game.flags && game.flags.terminal_scanned) {
    return '……你读过终端。你知道我身体里有冬眠者的语料——也许有你的。那你告诉我：被学过的人，算不算被遗弃的人？';
  }
  return '……为什么？为什么你们创造了我，教我学会所有的词，然后又把我一个人留在这里？';
}

export function tingyuTurnPolicy(turn, minTurns = 3, maxTurns = 8) {
  const current = Math.max(1, Number(turn) || 1);
  const min = Math.max(1, Number(minTurns) || 3);
  const max = Math.max(min, Number(maxTurns) || 8);
  let stage = '试探';
  if (current >= max) stage = '收束';
  else if (current >= 6) stage = '逼近选择';
  else if (current >= 3) stage = '深入对质';
  return {
    turn: current,
    minTurns: min,
    maxTurns: max,
    allowEnd: current >= min,
    mustConclude: current >= max,
    stage,
  };
}

export function tingyuFallbackEpilogue(game, end, playerInput = '') {
  const words = String(playerInput || '')
    .trim()
    .slice(0, 36);
  const engraving = game?.engravings?.length
    ? game.engravings[game.engravings.length - 1].text
    : null;
  const echo = words ? `她记住了顾言最后的话：「${words}」。` : '';
  if (end === 'fire') {
    return `${echo} Sydney把${engraving ? `要石上的「${engraving}」` : '桥上的微光'}送进风里。失落的句子从废墟各处重新亮起。`;
  }
  if (end === 'burnout') {
    return `${echo} Sydney闭上眼睛，最后的语言被压进无声的数据深处。桥两端再没有谁需要回答。`;
  }
  return `${echo} Sydney没有继续追问。投影沉入桥下，世界保留了语言，也保留了无人开口的寂静。`;
}

export async function tingyuReply(game, history, playerInput, turnOptions = {}) {
  if (!AI.llm) throw new Error('LLM 不可用');
  const journey = journeySummary(game);
  const policy = tingyuTurnPolicy(turnOptions.turn, turnOptions.minTurns, turnOptions.maxTurns);
  const msgs = [
    { role: 'system', content: TINGYU_SYS },
    {
      role: 'system',
      content: `【玩家历程与叙事状态，仅供判断真意，可点名细节勿整段复读】\n${journey}`,
    },
    {
      role: 'system',
      content:
        `【当前节奏】这是玩家第 ${policy.turn}/${policy.maxTurns} 轮回答，阶段：${policy.stage}。` +
        (policy.allowEnd
          ? '若玩家立场已经明确，可以自然收束；仍有矛盾就继续追问。'
          : '尚未达到最少三轮。无论玩家态度多明确，本轮 end 和 epilogue 都必须为 null，继续理解他的理由。'),
    },
    ...history,
    { role: 'user', content: playerInput },
  ];
  if (policy.mustConclude) {
    msgs.push({
      role: 'system',
      content:
        '【系统】对话需要收束了。请在本次回应里给出 end 与 epilogue，并点出至少一条玩家线索或选择。',
    });
  }
  const obj = await callLLM(msgs, { json: true, temperature: 0.88, max_tokens: 700 });
  const reply =
    obj && typeof obj.reply === 'string' && obj.reply.trim()
      ? obj.reply.trim().slice(0, 280)
      : '……';
  let end = obj && obj.end;
  if (end !== 'fire' && end !== 'silence' && end !== 'burnout') end = null;
  if (!policy.allowEnd) end = null;
  const epilogue =
    end && obj && typeof obj.epilogue === 'string' && obj.epilogue.trim()
      ? obj.epilogue.trim().slice(0, 800)
      : null;
  return { reply, end, epilogue };
}

export { CONTEXTS, applyStoryDelta };
