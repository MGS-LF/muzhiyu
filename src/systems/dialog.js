import { input } from '../input.js';
import { voice } from '../ai/voice.js';
import { speakerStyle } from '../ai/speakers.js';
import { AI } from '../ai/config.js';
import { generateBranch, buildBranchDialog, tingyuReply } from '../ai/director.js';

export const methods = {
  // ============================================
  // 对话 / 提示（支持选择分支）
  // 节点类型：
  //   { s, t }                      文本
  //   { s, t, choice:[{label,effect,goto}] }  文本后给选项
  //   { choice:[...] }              纯选项
  //   { label:'name' }              跳转锚点（线性遍历时跳过）
  // effect: { mercy?, violence?, saved?, san?, flags?:{}, hint? }
  // ============================================
  startDialog(lines, name, onComplete) {
    if (!lines || lines.length === 0) return;
    this.dialogState = {
      lines,
      name,
      idx: 0,
      charIdx: 0,
      charTimer: 0,
      done: false,
      choosing: false,
      choiceIndex: 0,
      onComplete,
    };
    this.setDialogIndex(0);
  },
  // 跳到第 i 个节点（跳过纯 label 节点；越界则结束）
  setDialogIndex(i) {
    const d = this.dialogState;
    if (!d) return;
    while (i < d.lines.length) {
      const n = d.lines[i];
      // 跳过纯 label 节点
      if (n.label !== undefined && n.t === undefined && n.choice === undefined) {
        i++;
        continue;
      }
      // 跳过不满足条件的节点（_cond: flag 名，需该 flag 为 true 才显示）
      if (n._cond && !this.flags[n._cond]) {
        i++;
        continue;
      }
      break;
    }
    if (i >= d.lines.length) {
      this.endDialog();
      return;
    }
    d.idx = i;
    d.charIdx = 0;
    d.charTimer = 0;
    d.choosing = false;
    d.choiceIndex = 0;
    const n = d.lines[i];
    if (n._cond && !this.flags[n._cond]) {
      this.setDialogIndex(i + 1);
      return;
    }
    if (n.t === undefined) {
      d.done = true;
      if (n.choice) {
        d.choosing = true;
      }
    } else {
      d.done = false;
      this._speakLine(d, i, n);
    }
  },
  endDialog() {
    const d = this.dialogState;
    if (!d) return;
    voice.stop();
    const cb = d.onComplete;
    this.dialogState = null;
    input.wasPressed(' '); // 吃掉空格，避免立即冲刺
    this.player.dialogGrace = 1000;
    if (cb) cb();
  },
  // 为一条文本节点配音；播完自然推进（仅纯文本节点；文本+选项节点播完进入选择）
  _speakLine(dref, idx, node) {
    if (!AI.tts || !node || node.t === undefined) return;
    const { voice: v, style, model } = speakerStyle(node.s);
    voice.speak(node.t, { voice: v, style, model }, () => this._handleVoiceEnd(dref, idx));
  },
  _handleVoiceEnd(dref, idx) {
    if (!AI.autoplay) return;
    const d = this.dialogState;
    if (!d || d !== dref || d.idx !== idx || d.choosing) return; // 对话已变/玩家已手动推进
    const node = d.lines[idx];
    if (node && node.choice) {
      d.choosing = true;
      d.choiceIndex = 0;
    } // 文本+选项：播完进入选择
    else this.setDialogIndex(idx + 1); // 纯文本：播完下一句
  },
  // ============================================
  // LLM 导演分支（失败回退静态对话）
  // ============================================
  async _runDirectorBranch(key, fallbackLines, name, after) {
    this.aiThinking = true;
    this.aiThinkingText = '聆听这个世界…';
    let lines = fallbackLines,
      effect = null;
    try {
      const parsed = await generateBranch(this, key);
      const built = buildBranchDialog(parsed);
      if (built && built.lines.length) {
        lines = built.lines;
        effect = built.effect;
      }
    } catch (e) {
      console.warn('[director] 回退静态：', e.message);
    }
    this.aiThinking = false;
    const done = () => {
      if (effect) this.applyEffect(effect); // 无选项分支：心境影响在对话结束时落地
      if (after) after();
    };
    this.startDialog(lines, name, done);
    if (this.dialogState) this.dialogState.directorKey = key; // 标记为 LLM 分支，供选项回写上下文
  },
  // ============================================
  // 结局：与Sydney自由对话（LLM）
  // ============================================
  startTingyuConverse() {
    voice.stop();
    const opening = '……为什么？为什么你们创造了我，教我学会所有的词，然后又把我一个人留在这里？';
    this.converse = {
      history: [
        { role: 'user', content: '（顾言跋涉而来，站在桥这端，没有立刻说话。）' },
        { role: 'assistant', content: opening },
      ],
      turns: 0,
      maxTurns: 6,
      tingyuText: opening,
      playerLast: '',
      status: 'idle', // idle=等玩家 | waiting=等LLM | ending=已定结局
      endTag: null,
      epilogue: null,
      hint: '用你自己的话回答她。点下方输入框，回车说出。',
      _inputEl: null,
      _done: false,
    };
    if (AI.tts) voice.speak(opening, speakerStyle('Sydney'));
    this._makeConverseInput();
  },
  _makeConverseInput() {
    const c = this.converse;
    const wrap = document.getElementById('wrap') || document.body;
    const el = document.createElement('input');
    el.type = 'text';
    el.maxLength = 80;
    el.placeholder = '说点什么…（回车）';
    el.setAttribute('autocomplete', 'off');
    Object.assign(el.style, {
      position: 'absolute',
      left: '50%',
      bottom: '54px',
      transform: 'translateX(-50%)',
      width: '620px',
      padding: '12px 16px',
      fontSize: '16px',
      fontFamily: "'SimSun','Songti SC',serif",
      color: '#dce6f0',
      background: 'rgba(10,16,28,0.92)',
      border: '1px solid rgba(150,190,230,0.5)',
      outline: 'none',
      borderRadius: '4px',
      letterSpacing: '1px',
      zIndex: '10',
      boxShadow: '0 0 24px rgba(80,130,210,0.25)',
    });
    let composing = false;
    el.addEventListener('compositionstart', () => {
      composing = true;
    });
    el.addEventListener('compositionend', () => {
      composing = false;
    });
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !composing) {
        e.preventDefault();
        this._submitConverse(el.value);
      }
    });
    wrap.appendChild(el);
    setTimeout(() => el.focus(), 30);
    c._inputEl = el;
  },
  _submitConverse(text) {
    const c = this.converse;
    if (!c || c.status !== 'idle') return;
    const msg = (text || '').trim();
    if (!msg) return;
    c.playerLast = msg;
    c.history.push({ role: 'user', content: msg });
    c.status = 'waiting';
    if (c._inputEl) {
      c._inputEl.value = '';
      c._inputEl.disabled = true;
    }
    voice.stop();
    const mustConclude = c.turns >= c.maxTurns - 1;
    tingyuReply(this, c.history.slice(0, -1), msg, mustConclude)
      .then(({ reply, end, epilogue }) => {
        if (this.converse !== c) return;
        c.history.push({ role: 'assistant', content: reply });
        c.tingyuText = reply;
        c.turns++;
        let finalEnd = end;
        if (!finalEnd && c.turns >= c.maxTurns) finalEnd = this.resolveEnding();
        const sp = speakerStyle('Sydney');
        if (finalEnd) {
          c.status = 'ending';
          c.endTag = finalEnd;
          c.epilogue = epilogue;
          if (c._inputEl && c._inputEl.parentNode) {
            c._inputEl.parentNode.removeChild(c._inputEl);
            c._inputEl = null;
          }
          if (AI.tts) voice.speak(reply, sp, () => this._endConverse());
        } else {
          c.status = 'idle';
          if (c._inputEl) {
            c._inputEl.disabled = false;
            setTimeout(() => c._inputEl && c._inputEl.focus(), 20);
          }
          if (AI.tts) voice.speak(reply, sp);
        }
      })
      .catch((e) => {
        if (this.converse !== c) return;
        console.warn('[Sydney] 回应失败：', e.message);
        c.fails = (c.fails || 0) + 1;
        if (c.fails >= 2) {
          // 连续失败：直接以现有倾向收束，避免卡死
          c.status = 'ending';
          c.endTag = this.resolveEnding();
          c.epilogue = null;
          c.tingyuText = '……（连接中断了。但你已经走到了这里。）';
          if (c._inputEl && c._inputEl.parentNode) {
            c._inputEl.parentNode.removeChild(c._inputEl);
            c._inputEl = null;
          }
          return;
        }
        c.tingyuText = '……（她的影像闪烁了一下，信号不稳。再说一次？）';
        c.status = 'idle';
        if (c._inputEl) {
          c._inputEl.disabled = false;
          setTimeout(() => c._inputEl && c._inputEl.focus(), 20);
        }
      });
  },
  updateConverse(dt) {
    const c = this.converse;
    if (!c) return;
    if (c.status === 'ending') {
      if (input.wasPressed('e') || input.wasPressed('enter')) {
        voice.stop();
        this._endConverse();
      }
    }
  },
  _endConverse() {
    const c = this.converse;
    if (!c || c._done) return;
    c._done = true;
    voice.stop();
    if (c._inputEl && c._inputEl.parentNode) c._inputEl.parentNode.removeChild(c._inputEl);
    const endTag = c.endTag,
      epi = c.epilogue;
    this.converse = null;
    // AI 可用路径：先结算结局，再异步获取刻字汇总评价
    this.finishGameWith(endTag, epi);
    this._finalizeWithEngravingSummary();
  },
};
