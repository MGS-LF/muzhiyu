import { DIALOGS } from '../data/dialogs.js';
import { POEM_LINES } from '../data/puzzles.js';
import { SCENE_TRANSITIONS } from '../data/scene_transitions.js';
import * as audio from '../audio.js';
import * as fx from '../fx.js';
import { AI } from '../ai/config.js';

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
          this.objective = { text: '探索废弃街道，找到「关雎」的所有碎片', done: false };
          this.showHint('走出冷冻中心，外面是废墟的世界。');
        });
        return;
      }
      if (best.type === 'terminal') {
        this.startDialog(DIALOGS.terminal, '终端机');
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
        // 启动刻字模式（已刻过也允许重刻）
        this.startEngraving(best, 'keystone');
        return;
      }
      if (best.type === 'portal3d') {
        this.enterLevel3D();
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
              this.showHint('浩然之气贯穿茧房！复读巨像的防御被削弱一半！');
            } else {
              this.showHint('诗屏亮起金光，浩然之气萦绕不散。');
            }
            this.objective = { text: '茧房已被削弱，前往上层挑战复读巨像', done: false };
          }
          // 第五章谜题完成标记
          if (best.puzzleId === 'jiangjinjiu') this.flags.puzzle_jiangjinjiu_solved = true;
          if (best.puzzleId === 'chunwang') this.flags.puzzle_chunwang_solved = true;
          if (best.puzzleId === 'yueye') this.flags.puzzle_yueye_solved = true;
        });
        return;
      }
      if (best.type === 'scene_change') {
        // 章节门禁：前进型出口需满足条件
        if (best.gate) {
          const res = this.meetsGate(best.gate);
          if (!res.ok) {
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
        // 导演分支（AI 可用时）：失语者群 / 茧房受害者
        if (AI.llm && (key === 'lost_people' || key === 'cocoon_victim')) {
          const after =
            key === 'cocoon_victim'
              ? () => {
                  this.flags.seen_cocoon_victim = true;
                }
              : null;
          this._runDirectorBranch(key, DIALOGS[key] || [], best.label, after);
          return;
        }
        this.startDialog(DIALOGS[key] || [], best.label);
        if (this.dialogState) this.dialogState.dialogKey = key;
        if (key === 'first_geng_intro') {
          this.flags.first_geng_intro_done = true;
        }
        if ((key === 'meet_shuyuan' || key === 'meet_shuyuan_ngplus') && !this.flags.met_shuyuan) {
          this.flags.met_shuyuan = true;
          this.player.inventory.push({ id: 'knife', name: '记忆合金刻刀' });
          this.player.inventory.push({ id: 'poem_guanju', name: '诗词纸片《关雎》' });
          this.showHint('获得：刻刀、诗词纸片《关雎》');
          this.objective = { text: '前往废墟居民区，跟随守砚', done: false };
        }
        if (key === 'shuyuan_alley') {
          this.flags.alley_briefed = true;
        }
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
          this.objective = { text: '潜行穿越迷宫 → 点亮诗屏削弱茧房 → 挑战复读巨像', done: false };
        }
        if (key === 'cocoon_victim') {
          this.flags.seen_cocoon_victim = true;
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
};
