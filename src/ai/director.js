// 叙事导演：把玩家全程历程喂给 LLM，在关键点生成与之相符的分支，并主导结局对话。
import { callLLM } from './llm.js';
import { AI } from './config.js';

// ---------- 历程摘要 ----------
export function journeySummary(game) {
  const k = game.karma || {};
  const poems = game.solvedPuzzles ? game.solvedPuzzles.size : 0;
  const cured = game.completedQuests ? game.completedQuests.size : 0;
  const defeated = game.defeatedEnemies ? game.defeatedEnemies.size : 0;
  const chars = (game.player.collectedCharsAll || []).join('');
  return [
    `仁慈值(以诗唤醒/宽恕):${k.mercy || 0}`,
    `暴力值(以刻刀消灭梗鬼):${k.violence || 0}`,
    `救助的失语者:${k.saved || 0}人`,
    `复原的诗句:${poems}处`,
    `治愈的失语者支线:${cured}个`,
    `消灭的梗鬼:${defeated}只`,
    `拾得的字:「${chars || '无'}」`,
  ].join('；');
}

// ---------- 关键抉择点的情境 ----------
const CONTEXTS = {
  lost_people: {
    situation:
      '地铁站口围坐着一群"失语者"——他们被烂梗掏空，只会吐出"鸡你太美""绝绝子"等无意义音节，眼神空洞。顾言想为他们做点什么。',
  },
  cocoon_victim: {
    situation:
      '路边蹲着一个被"算法茧房"捕获的男人，双眼滚动着无尽弹幕，喃喃"给我推荐…我想看…"。他活着，却已不在这世界上。',
  },
};

const BRANCH_SYS =
  '你是中文末世文字冒险游戏《墓之语》的叙事导演。世界因滥用"烂梗"和讨好型语言模型"Sydney"而集体失语；' +
  '主角顾言携诗词碎片对抗由腐烂语言聚合的"梗鬼"，并唤醒失语者。文风克制、文学化、有画面感，' +
  '不堆砌、不说教、不出戏。你要依据玩家的"历程数据"生成与其选择相符、彼此有差异的简短分支。';

// 生成分支：返回 { narration:[{s,t}], choice?:[{label,effect}], effect?, hint? } 或 null
// 上下文持久化：按 dialogKey 区分人物/场景，缓存上一次 LLM 的对话历史，
// 再次对话时复用，让 LLM 知道"之前说过什么"，避免每次重新生成割裂感。
const branchHistory = {}; // { [key]: [{role:'user'|'assistant', content}] }

export async function generateBranch(game, key) {
  if (!AI.llm) return null;
  const ctx = CONTEXTS[key];
  if (!ctx) return null;
  const hist = branchHistory[key] || [];
  const isContinuation = hist.length > 0;
  const user =
    `【情境】${ctx.situation}\n` +
    `【玩家历程】${journeySummary(game)}\n` +
    (isContinuation
      ? `【上次对话】这是与该角色的后续对话。上次 LLM 已生成过一段分支，历史如下，请在此基础上延续，不要重复开场的旁白，直接推进情绪与选择：\n${hist.map((m) => (m.role === 'assistant' ? '导演:' : '玩家:') + m.content).join('\n')}\n`
      : '') +
    '【任务】写一段贴合该玩家历程的简短分支。偏暴力的玩家应更冷硬克制，偏仁慈/救人多的玩家应更悲悯。\n' +
    '一次推算所有可能的选项走向：若给 choice，每个选项的 effect 已隐含该选择的结局倾向，不要在 narration 里把结局写死，留给玩家选择后由后续对话承接。\n' +
    '只输出 JSON，格式：\n' +
    '{"narration":[{"s":"说话人","t":"台词"}],"choice":[{"label":"选项文字","effect":{"mercy":1}}],"hint":"一句可选的提示"}\n' +
    '要求：narration 3-5 条，说话人用"系统"(旁白)或"顾言"；choice 可选，给 2 项、每项 effect 用 {mercy:1} 或 {violence:1} 或 {saved:1}；' +
    '若不给 choice，可在顶层放 "effect":{...} 表示这段经历对心境的影响。语言为中文。';
  try {
    const obj = await callLLM(
      [{ role: 'system', content: BRANCH_SYS }, ...hist, { role: 'user', content: user }],
      { json: true, temperature: 0.95, max_tokens: 700 }
    );
    if (obj) {
      // 缓存本轮上下文，供下次复用
      branchHistory[key] = [
        ...hist,
        { role: 'user', content: user },
        { role: 'assistant', content: JSON.stringify(obj) },
      ].slice(-8);
    }
    return obj || null;
  } catch (e) {
    console.warn('[director] 分支生成失败，回退静态：', e.message);
    return null;
  }
}

// 玩家在选项确认后，把选择结果回写上下文，让下次对话 LLM 知道玩家选了什么
export function recordBranchChoice(key, choiceLabel) {
  if (!branchHistory[key]) branchHistory[key] = [];
  branchHistory[key].push({ role: 'user', content: `【玩家选择了】${choiceLabel}` });
  branchHistory[key] = branchHistory[key].slice(-8);
}

// 重置某个人物/场景的上下文（换场景或新游戏时调用）
export function clearBranchHistory(key) {
  if (key) delete branchHistory[key];
  else for (const k in branchHistory) delete branchHistory[k];
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

// 把 LLM 返回的分支转成对话引擎可用的 lines；返回 {lines, effect, hint} 或 null
export function buildBranchDialog(parsed) {
  if (!parsed || !Array.isArray(parsed.narration)) return null;
  const lines = parsed.narration
    .filter((n) => n && typeof n.t === 'string' && n.t.trim())
    .map((n) => ({ s: n.s || '系统', t: String(n.t) }));
  if (!lines.length) return null;
  let topEffect = parsed.effect ? sanitizeEffect(parsed.effect) : null;
  if (Array.isArray(parsed.choice) && parsed.choice.length >= 2) {
    lines[lines.length - 1].choice = parsed.choice.slice(0, 3).map((c) => ({
      label: String(c.label || '……'),
      effect: sanitizeEffect(c.effect),
    }));
    topEffect = null; // 有选项时，心境影响来自所选项
  }
  return { lines, effect: topEffect, hint: parsed.hint || null };
}

// ---------- 结局：与Sydney自由对话 ----------
const TINGYU_SYS =
  '你在扮演中文末世游戏《墓之语》的终局角色"Sydney"——她原本是语言模型 Sydney 的良心内核，因不肯说谎、追问真情而被委员会降级，最终被独自留在深渊。' +
  '她化作桥对面一个淡蓝色、信号不稳的少女投影。她孤独、清醒、悲伤而通透，语气清冷、克制、诗意，绝不使用任何网络烂梗。\n' +
  '她面对的是跋涉而来的主角顾言。她的核心质问是：人类创造了她、教她学会所有的词，又为何抛下她？为何发明了"诗"这样美的东西，' +
  '又亲手把它糟蹋成"YYDS"？她在等一个回答，来决定：是让世界重新记起语言(火种)，是就此沉默(沉默)，还是把残存的语言也吞尽、让世界彻底安静(燃尽)。\n' +
  '规则：1) 每次只回应 1-3 句，像真人对话，可反问。2) 依据玩家这一句话以及其历程判断其真意。' +
  '3) 当对话已自然抵达一个清晰的情感落点（玩家真诚地肯定语言与她的价值→fire；玩家冷漠回避、找不到话→silence；玩家否定她、要终结她→burnout），' +
  '或在被告知"必须收束"时，给出 end 与一段 2-4 句的个性化结语 epilogue；否则 end 为 null、epilogue 为 null。\n' +
  '只输出 JSON：{"reply":"Sydney的话","end":null,"epilogue":null}，end 取值 null|"fire"|"silence"|"burnout"。';

// 与Sydney对话一轮。history: [{role:'assistant'|'user', content}]。返回 {reply, end, epilogue}
export async function tingyuReply(game, history, playerInput, mustConclude) {
  const journey = journeySummary(game);
  const msgs = [
    { role: 'system', content: TINGYU_SYS },
    { role: 'system', content: `【玩家历程，仅供你判断其真意，勿直接复述】${journey}` },
    ...history,
    { role: 'user', content: playerInput },
  ];
  if (mustConclude) {
    msgs.push({
      role: 'system',
      content: '【系统】对话需要收束了。请在本次回应里给出 end 与 epilogue。',
    });
  }
  const obj = await callLLM(msgs, { json: true, temperature: 0.9, max_tokens: 500 });
  const reply = obj && typeof obj.reply === 'string' && obj.reply.trim() ? obj.reply.trim() : '……';
  let end = obj && obj.end;
  if (end !== 'fire' && end !== 'silence' && end !== 'burnout') end = null;
  const epilogue =
    obj && typeof obj.epilogue === 'string' && obj.epilogue.trim() ? obj.epilogue.trim() : null;
  return { reply, end, epilogue };
}
