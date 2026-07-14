import { DIALOGS } from '../data/dialogs.js';
import { POEM_LINES } from '../data/puzzles.js';
import { SCENE_TRANSITIONS } from '../data/scene_transitions.js';
import { FEATURES } from '../config.js';
import * as audio from '../audio.js';
import * as fx from '../fx.js';
import { AI } from '../ai/config.js';
import { directorEnabled } from '../ai/director.js';
import { addStoryClue, addStoryHistory, adjustNpcAttitude, addStoryTag } from '../ai/story.js';

export const methods = {
  applySceneTransition(sceneId) {
    const trans = SCENE_TRANSITIONS[sceneId];
    if (!trans) return;
    const shouldPlayDialog =
      trans.dialog &&
      (!trans.dialogCond || this.flags[trans.dialogCond]) &&
      (!trans.dialogOnceFlag || !this.flags[trans.dialogOnceFlag]);
    if (shouldPlayDialog) {
      this.startDialog(DIALOGS[trans.dialog] || [], '系统');
    }
    if (trans.flag) this.flags[trans.flag] = true;
    this.objective = { text: trans.objective, done: false };
    // 进入数据中心前：可选 AI 铺垫（仅一次）
    if (
      sceneId === 'data_center' &&
      directorEnabled() &&
      !this.flags._ai_pre_datacenter &&
      !this.flags.game_complete
    ) {
      this.flags._ai_pre_datacenter = true;
      this._runDirectorBranch(
        'pre_datacenter',
        [
          {
            s: '系统',
            t: '石桥在前方展开。你带来的字、刀与沉默，都将被桥对面那道蓝光一一称量。',
          },
          { s: '顾言', t: '……该说的话，得在她面前说完。' },
        ],
        '系统',
        () => {
          addStoryTag(this, 'pre_datacenter');
          addStoryHistory(this, '顾言走向数据中心，准备面对 Sydney。');
        }
      );
    }
  },

  // ============================================
  // 交互
  // ============================================
  tryInteract() {
    let best = null,
      bd = 55;
    for (const it of this.scene.interactables) {
      // _cond 条件检查：未满足 flag 条件的交互点不可触发（如记忆碎片需先解谜）
      if (it._cond && !this.flags[it._cond]) continue;
      if (it._hidden) continue;
      const d = Math.hypot(it.x - this.player.x, it.y - this.player.y);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }

    if (best) {
      if (best.type === 'exit') {
        if (!this.player.hasClothes) {
          this.startDialog(DIALOGS.exitLocked, '大门');
          return;
        }
        this.startDialog(DIALOGS.exitOpen, '大门', () => {
          this.flags.door_opened = true;
          this.loadScene('street_01', { x: 440, y: 160 });
          this.objective = {
            text: '捡汉字 → 按 F 补诗，净化招牌与失语者',
            done: false,
          };
          this.showHint('外面是大失语后的废墟。捡发光的字，靠近招牌按 F 补全诗句。');
        });
        return;
      }
      if (best.type === 'terminal') {
        // 已深读过且导演在线：可再听一轮 AI 内心戏（只一次）
        if (directorEnabled() && this.flags.terminal_scanned && !this.flags._ai_terminal_deep) {
          this.flags._ai_terminal_deep = true;
          this._runDirectorBranch('terminal_deep', DIALOGS.terminal || [], '终端机', () => {
            addStoryClue(this, 'terminal_corpus');
            addStoryHistory(this, '顾言在终端读到了 Sydney 与冬眠语料的秘密。');
          });
          return;
        }
        const hadScan = !!this.flags.terminal_scanned;
        this.startDialog(DIALOGS.terminal, '终端机', () => {
          if (this.flags.terminal_scanned && !hadScan) {
            addStoryClue(this, 'terminal_corpus');
            addStoryHistory(this, '顾言在终端读到了 Sydney 与冬眠语料的秘密。');
          }
        });
        return;
      }
      if (best.type === 'locker') {
        if (this.player.hasClothes) {
          this.showHint('已经换过衣服了。');
        } else {
          this.startDialog(DIALOGS.locker, '储物柜', () => {
            this.player.hasClothes = true;
            this.showHint('获得：灰色连体服');
            this.objective = { text: '推门离开冷冻中心', done: false };
          });
        }
        return;
      }
      if (best.type === 'keystone') {
        const already = this.activatedKeystones.has(best.id);
        const engraved = best.engraved || (already ? best.text : null);
        if (engraved) {
          this.showHint(`要石上刻着「${engraved}」。这里是存档点。（可重新刻字）`);
        }
        if (!already) this.activatedKeystones.add(best.id);
        if (
          (this.scene?.id === 'dream_tutorial' || this.scene?.isDream) &&
          typeof this.notifyOnboarding === 'function'
        ) {
          this.notifyOnboarding('keystone', { id: best.id });
        }
        // 启动刻字模式（已刻过也允许重刻）
        this.startEngraving(best, 'keystone');
        return;
      }
      if (best.type === 'portal3d') {
        if (best._feature === 'level3d' && !FEATURES.level3d) {
          this.showHint('裂隙已封闭。主线不经此路。');
          return;
        }
        if (typeof this.enterLevel3D === 'function') this.enterLevel3D();
        else this.showHint('裂隙已封。');
        return;
      }
      if (best.type === 'puzzle') {
        if (this.solvedPuzzles.has(best.puzzleId)) {
          this.showHint(best.solvedHint || '已解开。');
          return;
        }
        this.startCompose(best.puzzleId, () => {
          // 体育馆诗屏：削弱 BOSS
          if (best.puzzleId === 'zhengqi') {
            this.flags.stadium_puzzle_solved = true;
            const boss = this.scene.enemies.find((e) => e.boss && !this.defeatedEnemies.has(e.id));
            if (boss) {
              boss.hp = Math.floor(boss.hp / 2);
              this.showHint('浩然之气贯穿茧房！推荐之核的屏障裂开了一半！');
            } else {
              this.showHint('诗屏亮起金光，浩然之气萦绕不散。');
            }
            this.objective = { text: '茧房已被削弱，前往上层侵入推荐之核', done: false };
          }
          // 第五章谜题完成标记
          if (best.puzzleId === 'jiangjinjiu') this.flags.puzzle_jiangjinjiu_solved = true;
          if (best.puzzleId === 'chunwang') this.flags.puzzle_chunwang_solved = true;
          if (best.puzzleId === 'yueye') this.flags.puzzle_yueye_solved = true;
        });
        return;
      }
      if (best.type === 'dream_wall') {
        const wallId = best.wallId;
        const key = best.dialogKey || `onboarding_wall_${wallId}`;
        this.startDialog(DIALOGS[key] || [], best.label, () => {
          if (typeof this.notifyOnboarding === 'function') {
            this.notifyOnboarding('wall_read', { wallId });
          }
        });
        return;
      }
      if (best.type === 'dream_door') {
        const doors = this.flags.onboarding_doors || {};
        const key = best.door;
        if (!doors[key]) {
          if (typeof this.notifyOnboarding === 'function') {
            this.notifyOnboarding('door_blocked', { door: key });
          } else {
            this.showHint('门还没开。', 'warn');
          }
          return;
        }
        // 已开门：把玩家推到门另一侧（向右）
        const nx = (best.x || 0) + 40;
        this.player.x = nx;
        this.player.y = best.y || this.player.y;
        if (typeof this.notifyOnboarding === 'function') {
          this.notifyOnboarding('door_open', { door: key });
        }
        return;
      }
      if (best.type === 'dream_wake') {
        if (best._hidden) return;
        if (this.flags.onboarding_step !== 'wake_gate') {
          this.showHint('裂隙还没稳定。', 'warn');
          return;
        }
        if (typeof this.completeDreamOnboarding === 'function') this.completeDreamOnboarding();
        return;
      }
      if (best.type === 'scene_change') {
        // 章节门禁：前进型出口需满足条件
        if (best.gate) {
          const res = this.meetsGate(best.gate);
          if (!res.ok) {
            if (typeof this.notifyOnboarding === 'function') this.notifyOnboarding('gate_blocked');
            this.startDialog(
              [
                { s: '系统', t: best.gate.msg },
                ...(res.missing.length
                  ? [
                      {
                        s: '系统',
                        t: `（还差：${res.missing.map((c) => '「' + c + '」').join('')}）`,
                      },
                    ]
                  : []),
              ],
              '前方受阻'
            );
            return;
          }
          // 字已集齐：触发造句谜题（未解过的）
          if (best.gate.puzzle && !this.solvedPuzzles.has(best.gate.puzzle)) {
            const tgt = best.target,
              spawn = best.spawn;
            this.startCompose(best.gate.puzzle, () => {
              this.loadScene(tgt, spawn);
              this.applySceneTransition(tgt);
            });
            return;
          }
          if (typeof this.notifyOnboarding === 'function') this.notifyOnboarding('gate_opened');
        }
        this.loadScene(best.target, best.spawn);
        this.applySceneTransition(best.target);
        return;
      }
      if (best.type === 'dialog') {
        let key = best.dialogKey;
        if (key === 'house_a_book' && this.flags.house_a_book_read) key = 'house_a_book_done';
        if (key === 'house_b_radio' && this.flags.house_b_radio_read) key = 'house_b_radio_done';
        if (key === 'meet_shuyuan' && this.flags.new_game_plus && !this.flags.ngplus_shuyuan_seen) {
          key = 'meet_shuyuan_ngplus';
          this.flags.ngplus_shuyuan_seen = true;
        }
        if (key === 'subway_depth_terminal') {
          this.flags.subway_depth_log_read = true;
          this.objective = { text: '返回地铁站，继续主线', done: false };
        }
        // 结局：与Sydney自由对话（AI 可用时）
        if (key === 'meet_tingyu') {
          if (this.flags.game_complete) {
            this.startDialog(
              [{ s: 'Sydney', t: '……（结局已至。刷新页面可重新开始一段旅程。）' }],
              'Sydney'
            );
            return;
          }
          audio.playBGM('__meet_tingyu__'); // 遇Sydney专属BGM
          const chapter5Finale = this.getChapter5FinaleConfig && this.getChapter5FinaleConfig();
          if (chapter5Finale) {
            this.startDialog(DIALOGS[chapter5Finale.dialogKey] || [], best.label, () =>
              this.finishGameWith(chapter5Finale.ending, chapter5Finale.epilogue)
            );
            return;
          }
          if (AI.llm) {
            this.startTingyuConverse();
            return;
          }
          // 降级：静态三选一结局
          this.startDialog(DIALOGS[key] || [], best.label, () => this.finishGame());
          return;
        }
        // 导演分支：中段 AI 节点（失败回退静态）
        const directorKeys = new Set([
          'lost_people',
          'cocoon_victim',
          'meet_shuyuan',
          'meet_shuyuan_ngplus',
          'shuyuan_alley',
          'subway_depth_terminal',
        ]);
        if (directorEnabled() && directorKeys.has(key)) {
          const after = () => this._afterDirectorDialog(key);
          this._runDirectorBranch(key, DIALOGS[key] || [], best.label, after);
          return;
        }
        this.startDialog(DIALOGS[key] || [], best.label, () => this._afterDirectorDialog(key));
        if (this.dialogState) this.dialogState.dialogKey = key;
        if (key === 'house_a_book') {
          this.flags.house_a_book_read = true;
          this.player.san = Math.min(this.player.maxSan, this.player.san + 20);
          this.showHint('念出诗句，SAN +20');
        }
        if (key === 'house_b_radio') {
          this.flags.house_b_radio_read = true;
          this.player.san = Math.min(this.player.maxSan, this.player.san + 10);
          this.showHint('听见旧广播，SAN +10');
        }
        if (key === 'shuyuan_farewell') {
          this.objective = { text: '潜行穿越迷宫 → 点亮诗屏削弱茧房 → 侵入推荐之核', done: false };
        }
        // 第五章记忆碎片：完成后设置标志
        if (key === 'memory_shard_1') {
          this.flags.shard1_done = true;
        }
        if (key === 'memory_shard_2') {
          this.flags.shard2_done = true;
        }
        if (key === 'memory_shard_3') {
          this.flags.shard3_done = true;
          this.flags.all_memory_shards = true;
        }
        return;
      }
      if (best.type === 'purify') {
        const done = best.doneFlag && this.flags[best.doneFlag];
        if (done) {
          const name =
            best.cleansedLabel || (best.purifyKind === 'aphasic' ? '被唤醒的人' : best.label);
          this.showHint(
            best.purifyKind === 'meme_wall'
              ? `招牌上写着「${name}」。字还在。`
              : '他安静地站着，好像在回想一句完整的话。'
          );
          return;
        }
        const lookKey =
          best.purifyKind === 'meme_wall'
            ? 'utter_meme_wall_look'
            : best.purifyKind === 'aphasic'
              ? 'utter_aphasic_look'
              : null;
        if (lookKey && DIALOGS[lookKey]) {
          this.startDialog(DIALOGS[lookKey], best.label);
        } else {
          this.showHint('按 F 组句，用完整的汉字改写这里。');
        }
        return;
      }
      if (best.type === 'cure') {
        if (this.completedQuests.has(best.id)) {
          this.startDialog(DIALOGS[best.doneKey] || DIALOGS.cured_done, best.label);
          return;
        }
        const reward = () => {
          this.completedQuests.add(best.id);
          this.karma.saved += 1;
          this.player.maxSan += 10;
          this.player.san = this.player.maxSan;
          this.showHint('你唤醒了一个失语者！理性上限 +10。（救助 +1）');
          audio.playBGM('__cure__'); // 治愈净化BGM（短暂氛围，结束后由场景恢复）
          // 检查失语者村落全唤醒
          if (this._allVillagersCured && !this.flags.all_villagers_cured) {
            this.flags.all_villagers_cured = true;
            setTimeout(() => this.showHint?.('失语者村落全员唤醒！文字花园的种子已埋下。'), 600);
          }
        };
        this.startDialog(
          DIALOGS[best.introKey] || [{ s: '系统', t: '你在他面前蹲下。' }],
          best.label,
          () => {
            this.startCompose(best.puzzle, reward);
          }
        );
        return;
      }
      if (best.type === 'pod') {
        this.showHint('这是我苏醒的冷冻仓。');
        return;
      }
    }

    // 拾取
    for (const it of this.scene.items) {
      if (this.collected.has(it.id)) continue;
      if (Math.hypot(it.x - this.player.x, it.y - this.player.y) < 30) {
        this.collected.add(it.id);
        if (it.type === 'char_fragment') {
          this.recordChar(it.char);
          audio.playSfx('pickup');
          this.showHint(`获得：汉字碎片「${it.char}」`);
          if (this.scene?.isDream || this.scene?.id === 'dream_tutorial') {
            if (typeof this.notifyOnboarding === 'function')
              this.notifyOnboarding('pickup_char', { char: it.char });
            return;
          }
          // 检查是否集齐
          const haveZhou = this.player.collectedCharsAll.filter((c) => c === '洲').length;
          const haveQiu = this.player.collectedCharsAll.filter((c) => c === '逑').length;
          if (haveZhou >= 1 && haveQiu >= 1 && !this.flags.poem_done_hint) {
            this.flags.poem_done_hint = true;
            this.objective = { text: '前往江堤，与守砚对话', done: false };
            this.showHint('集齐了「关雎」！去找守砚吧。');
          }
        } else if (it.type === 'page') {
          this.player.san = Math.min(this.player.maxSan, this.player.san + 30);
          audio.playSfx('pickup');
          const line = POEM_LINES[Math.floor(Math.random() * POEM_LINES.length)];
          this.showHint('旧书页：' + line + '（理性 +30）');
        } else if (it.type === 'diary') {
          // 方知远日记：独立收集计数，集齐 6 页触发「造物者的忏悔」
          this.player.diaries.add(it.id);
          this.player.san = Math.min(this.player.maxSan, this.player.san + 15);
          audio.playSfx('pickup');
          this.showHint(`获得：${it.name}（理性 +15）`);
          const TOTAL_DIARIES = 6;
          if (this.player.diaries.size >= TOTAL_DIARIES && !this.flags.all_diaries) {
            this.flags.all_diaries = true;
            this.showHint('方知远的日记已集齐！造物者的秘密在你手中。');
            audio.playSfx('victory');
            fx.flash('#ffd866', 0.4, 500);
          }
        } else if (it.type === 'language_seed') {
          // 语言种子：永久 SAN 上限提升 + 收集计数
          this.player.seeds = (this.player.seeds || 0) + 1;
          this.player.maxSan += 10;
          this.player.san = Math.min(this.player.maxSan, this.player.san + 20);
          audio.playSfx('pickup');
          fx.flash('#88ddff', 0.3, 400);
          this.showHint(`${it.name}：理性上限 +10，理性 +20`);
          if (this.player.seeds >= 3 && !this.flags.all_seeds) {
            this.flags.all_seeds = true;
            this.showHint('三枚语言种子已集齐！你的话语有了重量。');
            audio.playSfx('victory');
          }
        } else {
          this.showHint(`获得：${it.name || '物品'}`);
        }
      }
    }
  },

  _grantShuyuanItems() {
    if (this.flags.met_shuyuan) return;
    this.flags.met_shuyuan = true;
    this.flags.sidescroll_knife = true;
    this.flags.sidescroll_lantern = true;
    this.player.inventory.push({ id: 'knife', name: '记忆合金刻刀' });
    this.player.inventory.push({ id: 'poem_guanju', name: '诗词纸片《关雎》' });
    this.showHint('获得：刻刀、诗词纸片《关雎》');
    this.objective = { text: '穿过江堤，前往废墟居民区', done: false };
    const k = this.karma || {};
    if ((k.violence || 0) > (k.mercy || 0) + 1) {
      this.showHint('守砚多看了你一眼：「……你的刀，比你的诗更响。」');
      adjustNpcAttitude(this, '守砚', -1);
      addStoryClue(this, 'shuyuan_wary');
    } else if ((k.mercy || 0) >= 2) {
      this.showHint('守砚点头：「你用字劝退过鬼。路会记得你。」');
      adjustNpcAttitude(this, '守砚', 1);
      addStoryClue(this, 'shuyuan_trust');
    } else {
      adjustNpcAttitude(this, '守砚', 1);
    }
    addStoryHistory(this, '顾言在江堤遇见守砚，接过刻刀与诗。');
    addStoryTag(this, 'met_shuyuan');
  },

  _afterDirectorDialog(key) {
    if (key === 'first_geng_intro') this.flags.first_geng_intro_done = true;
    if (key === 'meet_shuyuan' || key === 'meet_shuyuan_ngplus') this._grantShuyuanItems();
    if (key === 'shuyuan_alley') {
      this.flags.alley_briefed = true;
      addStoryClue(this, 'alley_brief');
      addStoryHistory(this, '守砚在居民区讲明了规矩与体育馆的方向。');
    }
    if (key === 'cocoon_victim') {
      this.flags.seen_cocoon_victim = true;
      addStoryClue(this, 'cocoon_feed');
      addStoryHistory(this, '顾言看见被推荐茧房吞掉的人。');
    }
    if (key === 'lost_people') {
      addStoryClue(this, 'lost_echo');
      addStoryHistory(this, '失语者群用残响提醒顾言：句子曾经完整。');
    }
    if (key === 'subway_depth_terminal') {
      this.flags.subway_depth_log_read = true;
      addStoryClue(this, 'subway_seed');
      addStoryHistory(this, '站长日志提到语言种子与末日前的挣扎。');
    }
  },
};
