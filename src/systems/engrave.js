import { input } from '../input.js';
import * as audio from '../audio.js';
import * as fx from '../fx.js';
import { autoSave } from '../save.js';
import { AI } from '../ai/config.js';
import { callLLM } from '../ai/llm.js';

export const methods = {
  // ============================================
  // 刻字系统（要石 / 残碑 · 预设 + 自定义 · localStorage 持久化）
  // ============================================
  _loadEngravings() {
    try {
      const raw = localStorage.getItem('keheng_engravings');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }
    return [];
  },
  _saveEngravings() {
    try {
      localStorage.setItem('keheng_engravings', JSON.stringify(this.engravings));
    } catch (e) {
      /* ignore */
    }
  },
  _addEngraving(rec) {
    this.engravings.push(rec);
    this._saveEngravings();
  },
  // 启动刻字模式：type='keystone'|'stele'
  startEngraving(target, type) {
    const presets =
      type === 'keystone'
        ? ['活着', '记得', '归来', '不语', '此心', '故人', '归途', '在此']
        : ['关关', '雎鸠', '窈窕', '好逑', '落霞', '正气', 'Sydney', '守砚'];
    this.engraveState = {
      target,
      type,
      presets,
      sel: 0,
      mode: 'select', // 'select' | 'input'
      input: '',
    };
  },
  updateEngraving(dt) {
    const e = this.engraveState;
    if (!e) return;
    if (e.mode === 'select') {
      const n = e.presets.length + 1; // 末项为"自定义输入"
      if (
        input.wasPressed('arrowup') ||
        input.wasPressed('w') ||
        input.wasPressed('arrowleft') ||
        input.wasPressed('a')
      )
        e.sel = (e.sel - 1 + n) % n;
      if (
        input.wasPressed('arrowdown') ||
        input.wasPressed('s') ||
        input.wasPressed('arrowright') ||
        input.wasPressed('d')
      )
        e.sel = (e.sel + 1) % n;
      if (input.wasPressed('e') || input.wasPressed('enter')) {
        if (e.sel < e.presets.length) {
          this._commitEngraving(e.presets[e.sel]);
        } else {
          e.mode = 'input';
          e.input = '';
          setTimeout(() => {
            if (this._engraveInput) this._engraveInput.focus();
          }, 30);
        }
      }
      if (input.wasPressed('escape') || input.wasPressed('q')) {
        this.engraveState = null;
        this.showHint('你收回了刻刀。');
      }
    } else {
      // input 模式由 DOM 输入框处理（在 render 时创建）
      if (input.wasPressed('escape')) {
        e.mode = 'select';
        e.input = '';
        if (this._engraveInput && this._engraveInput.parentNode) {
          this._engraveInput.parentNode.removeChild(this._engraveInput);
          this._engraveInput = null;
        }
      }
    }
    this.updateParticles(dt);
  },
  _commitEngraving(text) {
    const t = (text || '').trim().slice(0, 12);
    if (!t) {
      this.showHint('没有刻下任何字。');
      this.engraveState = null;
      return;
    }
    const e = this.engraveState;
    const rec = {
      text: t,
      type: e.type,
      targetId: e.target.id,
      scene: this.scene.id,
      time: Date.now(),
      custom: !e.presets.includes(t),
    };
    const isDream = !!(this.scene?.isDream || this.scene?.id === 'dream_tutorial');
    // 梦境刻字只用于教学演出，不写入永久刻字列表或覆盖正式存档。
    if (!isDream) this._addEngraving(rec);
    if (e.type === 'keystone') this.activatedKeystones.add(e.target.id);
    this.activatedKeystones.add(e.target.id);
    // 记录刻字内容到目标对象，供渲染显示
    e.target.engraved = t;
    this.engraveState = null;
    // 要石激活：音效 + 金色闪光 + 净化波 + 自动存档（天然存档点）
    if (e.type === 'keystone') {
      audio.playSfx('keystone');
      audio.playBGM('__keystone__'); // 要石激活净化BGM
      fx.flash('#ffd866', 0.4, 500);
      fx.purifyWave(e.target.x, e.target.y, 300);
      if (!isDream) autoSave(this); // 要石刻字是天然存档点
    } else {
      audio.playSfx('uiConfirm');
    }
    this.startDialog(
      [
        { s: '系统', t: `顾言用刻刀刻下「${t}」。` },
        { s: '系统', t: '金色的微光从刻痕里渗出，像是一个被重新点燃的坐标。' },
        { s: '系统', t: isDream ? '（梦境刻字不会覆盖正式存档）' : '（已刻下并保存）' },
      ],
      e.type === 'keystone' ? '要石' : '残碑'
    );
  },
  _submitEngraveInput() {
    const text = (this._engraveInput ? this._engraveInput.value : this.engraveState.input).trim();
    if (this._engraveInput && this._engraveInput.parentNode) {
      this._engraveInput.parentNode.removeChild(this._engraveInput);
      this._engraveInput = null;
    }
    this._commitEngraving(text);
  },
  // ============================================
  // 结局：刻字汇总评价（仅 AI 可用时）
  // ============================================
  async summarizeEngravings() {
    if (!this.engravings.length) return null;
    if (!AI.llm) return null; // 降级则跳过
    this.aiThinking = true;
    this.aiThinkingText = '正在凝视你刻下的每一个字……';
    try {
      const list = this.engravings
        .map(
          (e, i) =>
            `${i + 1}. 「${e.text}」(${e.type === 'keystone' ? '要石' : '残碑'}${e.custom ? '·自定义' : ''})`
        )
        .join('\n');
      const prompt = `玩家在一款关于"语言消亡与文字守护"的游戏中，于各处要石与残碑上刻下了以下文字：\n${list}\n\n请以一位历经沧桑的叙事者口吻，对玩家刻下的这些字进行简短的汇总、分析与评价（120字以内）。可点评其用词倾向、情感内核，以及这些字在这个失语的世界里意味着什么。不要复述列表，直接给出评价。`;
      const reply = await callLLM([{ role: 'user', content: prompt }], {
        temperature: 0.7,
        max_tokens: 200,
      });
      this.aiThinking = false;
      return (reply || '').trim();
    } catch (e) {
      this.aiThinking = false;
      return null;
    }
  },
};
