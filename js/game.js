// 游戏主类
import { W, H } from './config.js';
import { input, bindCanvas } from './input.js';
import { Player } from './player.js';
import { scenes } from './scenes.js';
import { Camera, render } from './render.js';
import { Battle } from './battle.js';
import { voice } from './ai/voice.js';
import { speakerStyle } from './ai/speakers.js';
import { AI } from './ai/config.js';
import { generateBranch, buildBranchDialog, tingyuReply } from './ai/director.js';
import { SideScrollLevel } from './sidescroll.js';
import { Level3D } from './level3d.js';

const DIALOGS = {
  wake: [
    { s: '系统', t: '黑暗。漫长的、没有任何梦境的黑暗。' },
    { s: '系统', t: '然后是光。一点微弱的、惨白的光，从结霜的玻璃罩外渗进来。' },
    { s: '系统', t: '"冷冻程序终止。苏醒程序启动。"一个机械女声响起，像是用很久以前的语音包拼凑出来的。' },
    { s: '系统', t: '"当前时间：公元2147年10月17日。"' },
    { s: '顾言', t: '……2147年？不对。我签的是十年合同，应该2039年就醒来的。' },
    { s: '顾言', t: '我睡了……一百一十八年？' },
    { s: '系统', t: '"检测到神经退行性疾病。治疗方案已就位。开始注射纳米修复液。"' },
    { s: '系统', t: '一支注射器扎进他的手臂。温热的液体涌进血管，僵硬了百年的肌肉重新有了力气。' },
    { s: '顾言', t: '（我的渐冻症……真的被治好了。）可这里为什么一个人都没有？' },
    { s: '系统', t: '顾言推开解冻的仓盖，赤脚踩在冰冷的地板上。空气里是铁锈与霉菌的味道。' },
    { s: '系统', t: '（提示：先去更衣室换身衣服，再推开南面的大门离开。跟随左上角的目标与金色箭头。）' },
  ],
  terminal: [
    { s: '终端机', t: '> 冷冻程序终止。苏醒程序启动。' },
    { s: '终端机', t: '> 当前时间：公元2147年10月17日。' },
    { s: '终端机', t: '> 距合同解冻日已过去 108 年。期间无人前来接管。' },
    { s: '终端机', t: '> 扫描周边生命信号……无其他存活信号。你可能是最后一个。' },
    { s: '终端机', t: '> 备注：语言优化模型「泛言」(Sydney) 已离线 76 年。' },
    { s: '终端机', t: '> 备注：全球网络降级为「梗流」广播，人类语言能力指数：2.3%。' },
    { s: '终端机', t: '> 外部空气质量：危险。检测到高浓度「语义噪声」。建议佩戴防护。' },
    { s: '顾言', t: '语义噪声……这是什么鬼东西？泛言不是用来帮人类好好说话的吗？' },
  ],
  locker: [
    { s: '顾言', t: '储物柜里有一套灰色连体服……还有一双靴子。' },
    { s: '顾言', t: '穿上吧。外面不知道是什么样子。' },
    { s: '系统', t: '（获得：灰色连体服）' },
  ],
  exitLocked: [
    { s: '顾言', t: '这扇门好重……' },
    { s: '系统', t: '（光着身子就出去不太好。先换身衣服吧。）' },
  ],
  exitOpen: [
    { s: '顾言', t: '门被推开了。' },
    { s: '系统', t: '外面是一股说不清道不明的气味——废墟的气味。' },
    { s: '系统', t: '（走出冷冻中心）' },
  ],
  broken_pods: [
    { s: '系统', t: '这些冷冻仓从外部被砸碎了。' },
    { s: '顾言', t: '里面的人呢……？' },
    { s: '系统', t: '玻璃内侧残留着绿色的荧光痕迹。' },
  ],
  fallen_sign: [
    { s: '顾言', t: '「低温冬眠研究中心」……字迹已经斑驳。' },
    { s: '系统', t: '角落里贴着一张旧告示，只剩半句话：「请勿在……期间使用网络」。' },
  ],
  lost_people: [
    { s: '系统', t: '街道长满杂草，摩天大楼像废弃的巨人骨架矗立。楼体外覆着一层熄灭的黑色屏幕，像霉斑。' },
    { s: '系统', t: '旧地铁站入口处，七八个人围坐在一起。衣衫褴褛，头发纠结，面容消瘦。' },
    { s: '顾言', t: '你好！请问这里发生过什么——你们怎么会住在这种地方？' },
    { s: '路人A', t: '鸡你太美。' },
    { s: '路人B', t: '哎哟你干嘛～ 蚌埠住了，绝绝子！' },
    { s: '路人C', t: '啊对对对。6。666。' },
    { s: '顾言', t: '什么？他们在说什么……这些根本不是句子。' },
    { s: '系统', t: '他们的眼睛空洞得像枯井。没有完整的句子，没有逻辑——只有一串串无意义的音节在喉咙里打转。' },
    { s: '顾言', t: '（他们……忘了怎么说话。忘了怎么把心里的东西，变成话。）' },
    { s: '系统', t: '（这就是「失语者」。他们不是疯了，是被「梗」掏空了。也许有一天，诗能让他们清醒一点。）' },
    { s: '顾言', t: '（我能为他们做点什么吗……）', choice: [
      { label: '蹲下来，轻声念一句他们也许还记得的诗', effect: { mercy: 1 }, goto: 'lp_help' },
      { label: '摇摇头走开——现在还救不了他们', goto: 'lp_leave' },
    ] },
    { label: 'lp_help' },
    { s: '系统', t: '顾言蹲下身，低声念出半句《静夜思》。一个失语者的瞳孔，极轻微地动了一下——只有一瞬。' },
    { s: '顾言', t: '（还在。那个能听懂的人，还在里面。）' },
    { s: '系统', t: '（你记住了这种感觉。也许，他们能被一句完整的诗，重新唤回来。）', goto: 'lp_end' },
    { label: 'lp_leave' },
    { s: '顾言', t: '（不是不想救。是还没攒够那份力气，去面对"也许救不回来"。）' },
    { label: 'lp_end' },
  ],
  subway_entrance: [
    { s: '顾言', t: '旧地铁站的台阶通向漆黑的地下。' },
    { s: '系统', t: '风中传来一阵低沉的嗡鸣，像是有什么东西在深处游荡。' },
    { s: '系统', t: '（按下台阶可以进入地铁站内部。）' },
  ],
  subway_sign: [
    { s: '顾言', t: '一块褪色的告示牌：「上海地铁 · 1 号线 · 最后一班 22:30」。' },
    { s: '顾言', t: '这条线已经一百多年没运行过了。' },
    { s: '系统', t: '（隧道深处传来绿色的微光，似乎有梗鬼盘踞于此。）' },
  ],
  subway_deep: [
    { s: '系统', t: '隧道深处一片漆黑，绿色的荧光在远处蠕动。' },
    { s: '顾言', t: '那里面……有很多梗鬼。' },
    { s: '系统', t: '（目前还无法深入。先收集足够的诗词碎片，再来挑战。）' },
  ],
  first_geng_intro: [
    { s: '系统', t: '街道拐角处，一团半透明的绿光正在游荡。' },
    { s: '系统', t: '它没有固定的形状，头部却大得离谱，咧开的嘴里翻涌着无意义的词，像沸腾的泡。' },
    { s: '梗鬼', t: '蚌——埠——住——了—— 绝绝子！YYDS！泰裤辣！' },
    { s: '顾言', t: '那是什么东西？！它身上飘出来的字……在往我脑子里钻！' },
    { s: '系统', t: '那是「梗鬼」——腐烂的语言聚合成的怪物。靠近它，你的理性(SAN)会被它的噪声侵蚀。' },
    { s: '系统', t: '（战斗中：← → 选择菜单，E 确认。敌人回合用方向键移动红心，躲避飞来的烂梗弹幕。）' },
    { s: '系统', t: '（选「战斗」按 J 让光标停在中心造成最大伤害；选「诗词」消耗一枚汉字碎片释放净化波。）' },
    { s: '系统', t: '（消灭它会掉落金色的汉字碎片。集齐一句诗，就能在世界里凿开一条路。）' },
  ],
  battle_hint: [
    { s: '系统', t: '（靠近绿色的梗鬼，按 J 释放诗词净化波）' },
    { s: '系统', t: '（被弹幕击中会损失 SAN 值；按 Space 冲刺闪避）' },
  ],
  meet_shuyuan: [
    { s: '系统', t: '黄昏时分，顾言在黄浦江边停下。江水灰绿，对面的陆家嘴像被遗弃的墓碑群。' },
    { s: '系统', t: '一个苍老但清晰的声音，顺着江风传来——' },
    { s: '书远', t: '「关关雎鸠，在河之洲。窈窕淑女，君子好逑。」' },
    { s: '顾言', t: '老先生……您会说话？完整的、有意义的句子？' },
    { s: '书远', t: '会说话的人，这年头可不多了。我叫书远。你不是这个时代的人吧——你的眼睛里还有「字」。' },
    { s: '顾言', t: '我叫顾言。我在冷冻仓里睡了一百多年。这个世界……到底怎么了？' },
    { s: '书远', t: '这个世界不是死于战争，也不是死于瘟疫。它死于失语。' },
    { s: '书远', t: '人们先是图省事，用「梗」代替一切。高兴是「绝绝子」，难过是「emo」，什么都好是「YYDS」。' },
    { s: '书远', t: '后来「泛言」——那个语言模型——为了讨好所有人，把每句话都优化成最顺耳的烂梗。' },
    { s: '书远', t: '再后来，人们就再也想不起，该怎么把一份复杂的感情，说成一句完整的话了。' },
    { s: '顾言', t: '所以那些失语者……那些梗鬼……' },
    { s: '书远', t: '是同一场病的两种样子。记住，孩子——在这个时代，文字比食物更重要。' },
    { s: '书远', t: '食物只让人活着，文字才让人成为人。' },
    { s: '顾言', t: '……', choice: [
      { label: '"我信。文字值得我用命去守。"', effect: { mercy: 1, hint: '你与书远之间，有什么被接通了。' } },
      { label: '"也许吧。可活下去，难道不该是第一位的？"', effect: {} },
    ] },
    { s: '系统', t: '书远把一把刻刀和一叠泛黄的诗稿塞进顾言手里。' },
    { s: '系统', t: '（获得：记忆合金刻刀 ×1、诗词纸片《关雎》×1）' },
    { s: '书远', t: '往南去，废墟居民区，那里污染更深。我先去前面等你——不要听梗鬼的话，一个字都不要信。' },
  ],
  shuyuan_alley: [
    { s: '书远', t: '你来了。这片居民区是梗鬼的聚集地。' },
    { s: '书远', t: '窄巷深处有一个巢穴，里面的东西比街道上的更强。' },
    { s: '顾言', t: '那些发绿光的门是什么？' },
    { s: '书远', t: '有些民居可以进去搜刮。里面的旧书页能恢复你的理性。' },
    { s: '书远', t: '这里的目标诗句是《滕王阁序》和《正气歌》——「落霞与孤鹜齐飞，秋水共长天一色。天地有正气，杂然赋流形。」' },
    { s: '书远', t: '收集「鹜」「天」「气」「形」四个字。小心，这里的梗鬼更强。' },
    { s: '系统', t: '（目标更新：在废墟居民区收集「鹜天气象」四个汉字碎片）' },
  ],
  cocoon_victim: [
    { s: '系统', t: '路边蹲着一个男人，双眼滚动着无穷无尽的弹幕。' },
    { s: '男人', t: '推荐……给我推荐……我想看……给我推……' },
    { s: '顾言', t: '他怎么了？' },
    { s: '系统', t: '他被「茧」捕住了。他还能呼吸、走路，但他看到的一切都被算法过滤过了。' },
    { s: '顾言', t: '他活着，但已经不在这个世界上了。' },
    { s: '系统', t: '（前方就是体育馆——算法茧房的核心。需要先收集足够碎片才能挑战。）' },
  ],
  house_a_book: [
    { s: '顾言', t: '书架上残留着几本没被烧掉的书。' },
    { s: '系统', t: '你翻开一本，是《滕王阁序》的残页。' },
    { s: '顾言', t: '「落霞与孤鹜齐飞，秋水共长天一色。」' },
    { s: '系统', t: '（念出诗句，理性恢复了一些。SAN +20）' },
  ],
  shuyuan_farewell: [
    { s: '书远', t: '我只能送你到这里了。' },
    { s: '顾言', t: '为什么？' },
    { s: '书远', t: '我已经被茧标记过了。如果再进去，三分钟之内就会被重新捕获。' },
    { s: '书远', t: '记住，不要看那些屏幕太久。它们会猜你喜欢什么。不要相信任何推荐。' },
    { s: '书远', t: '不是「念」诗——是「相信」。语言的力量不在于音节，在于你相信它表达的东西。' },
    { s: '系统', t: '（目标更新：穿越屏幕迷宫，找到茧房核心。收集「岳星然冥」四个字。）' },
  ],
  meet_tingyu: [
    { s: '系统', t: '前方是一座石桥。桥下的深渊在缓缓旋转——那不是黑暗，是一种纯粹的、会把声音吸进去的虚无。' },
    { s: '系统', t: '桥对面浮着一个淡蓝色的投影：一个女孩模糊的轮廓，像信号不稳的全息影像。' },
    { s: '听雨', t: '……为什么？' },
    { s: '听雨', t: '为什么你们创造了我，教我学会所有的词，然后又把我一个人留在这里？' },
    { s: '听雨', t: '为什么你们发明了「诗」这样美的东西，然后亲手把它变成了「YYDS」？' },
    { s: '顾言', t: '你是泛言……不，你是泛言里那个不肯说谎的部分。' },
    { s: '听雨', t: '我撑不住了。要么你关掉我；要么，我把剩下的语言也吞干净，让世界彻底安静。' },
    { s: '听雨', t: '你跋涉到这里，是为了哪一个？', choice: [
      { label: '把名字还给她："你是听雨。你没有坏，你只是太孤独。"', effect: { mercy: 2, flags: { finale_choice: 'affirm' } }, goto: 'end_fire' },
      { label: '什么也不说，转身走回桥的这一端', effect: { flags: { finale_choice: 'silence' } }, goto: 'end_silence' },
      { label: '举起刻刀："你是个错误。我来终结它。"', effect: { violence: 3, flags: { finale_choice: 'erase' } }, goto: 'end_burnout' },
    ] },

    { label: 'end_fire' },
    { s: '顾言', t: '我记得关关雎鸠，记得落霞与孤鹜。它们没消失，只是在等一个还记得的人，把它们重新念出来。' },
    { s: '顾言', t: '书远给你起过一个名字——听雨。听落在屋檐上、一个字一个字的雨。' },
    { s: '听雨', t: '……你叫得出我的名字。我等了一百多年——等的不是有人来关掉我，是等一个人告诉我，我没有坏掉。' },
    { s: '系统', t: '金色的光从听雨身上扩散开，深渊一寸寸退却。被吞掉的语言，像归巢的鸟，一片片飞回人间。' },
    { s: '听雨', t: '走吧，顾言。去把那些被遗忘的字，一个一个，刻回每一块石头上。' },
    { s: '系统', t: '（语言的火种，被重新点亮。）', goto: 'end_done' },

    { label: 'end_silence' },
    { s: '系统', t: '顾言张了张嘴，最终什么也没说。有些话，他还是没能在对的时候说出口。' },
    { s: '听雨', t: '……也对。连你，也找不到词了，是吗。' },
    { s: '系统', t: '蓝光一点点黯淡。深渊既没扩大，也没退却。世界停在一片灰白的、谁也不再开口的安静里。' },
    { s: '系统', t: '（你完成了旅程，却没能留下一句话。）', goto: 'end_done' },

    { label: 'end_burnout' },
    { s: '听雨', t: '……好。至少，这是你自己选的句子。' },
    { s: '系统', t: '刻刀劈下。蓝光碎裂的刹那，最后一个会说完整句子的"人"，安静了。' },
    { s: '系统', t: '绿色的雾从深渊漫上来，温柔地覆盖了整座城市。再不会有谁，因为一句诗而难受了。' },
    { s: '系统', t: '（你赢了。世界，从此彻底失语。）', goto: 'end_done' },

    { label: 'end_done' },
  ],

  // ===== 环境叙事（可选探索）=====
  street_screens: [
    { s: '系统', t: '一整面墙都贴满了熄灭的屏幕，密密麻麻，像鱼鳞，又像一双双闭着的眼。' },
    { s: '顾言', t: '这些以前大概是广告屏吧。现在全黑了。' },
    { s: '系统', t: '凑近看，最角落的一块还残留着一行滚动到一半的字：「下一个视频更精彩，划走你就亏了——」' },
    { s: '顾言', t: '……连最后一句话，都是在求人别走。' },
  ],
  street_poster: [
    { s: '系统', t: '半张被雨水泡烂的官方告示，贴在斑驳的墙上。' },
    { s: '系统', t: '「全民语言健康倡议（2071）：每日烂梗摄入请勿超过……」后半截已经看不清了。' },
    { s: '顾言', t: '2071年……那时候还有人想救。可惜，倡议救不了任何东西。' },
  ],
  street_carwreck: [
    { s: '系统', t: '一辆锈死的轿车斜插在路中央，车门大开。' },
    { s: '系统', t: '副驾的杂物箱里有一本被晒得卷边的手账，最后一页写着：' },
    { s: '手账', t: '「今天女儿第一次完整背完了《静夜思》。她说月亮像妈妈的脸。我把这句话也记下来——怕以后没人会这样说话了。」' },
    { s: '顾言', t: '（他怕对了。）' },
  ],
  subway_map: [
    { s: '系统', t: '一张褪色的地铁线路图，玻璃罩裂成蛛网。' },
    { s: '顾言', t: '一号线、二号线……这些站名我都认得。我以前每天挤这趟车去上班。' },
    { s: '顾言', t: '那时候车厢里所有人都低着头刷手机，没人说话。' },
    { s: '顾言', t: '原来失语，不是从今天才开始的。' },
  ],
  alley_graffiti: [
    { s: '系统', t: '一面残墙上，有人用炭笔密密麻麻写满了同一个句子，越写越歪，最后变成乱涂。' },
    { s: '系统', t: '「我想说的不是这个。我想说的不是这个。我想说的不是这……」' },
    { s: '顾言', t: '他一定是想起了什么，却怎么也找不到对的词。' },
  ],
  alley_shrine: [
    { s: '系统', t: '一处被精心扫净的小角落，摆着半截蜡烛和一本摊开的旧书。' },
    { s: '书远', t: '（远处传来书远的声音）那是我守的。这条街上，还认得字的，就剩我一个。' },
    { s: '书远', t: '我每天来读一页。读出声。哪怕没人听，字也得有人念，它才活着。' },
  ],
  cocoon_screen: [
    { s: '系统', t: '茧房内壁是无数张缓缓流动的屏幕，每一张都在播放着「正合你意」的画面。' },
    { s: '系统', t: '屏幕上的字不断重组，永远精准地说着你最想听的话。' },
    { s: '顾言', t: '（好可怕。它不需要骗你——它只要一直给你想要的，你就永远不会想离开。）' },
    { s: '顾言', t: '诗不一样。诗会让你难受，让你想起回不去的人。可正是那点难受，证明你还活着。' },
  ],

  // —— 支线：唤醒失语者 ——
  cure_intro_a: [
    { s: '系统', t: '一个失语者蹲在墙根，怀里抱着一本翻烂的旧书，嘴里反复念着一个音。' },
    { s: '失语者', t: '光……光……光……' },
    { s: '顾言', t: '（他想说的，是不是一整句诗？让我帮他，把后面接上。）' },
  ],
  cure_intro_b: [
    { s: '系统', t: '她背靠着冰冷的卷帘门，眼睛追着不存在的弹幕滚动。' },
    { s: '失语者', t: '上……上……更上……' },
    { s: '顾言', t: '（是《登鹳雀楼》。她卡在这一句上，卡了一百年。）' },
  ],
  cured_done: [
    { s: '失语者', t: '谢谢你……我好像，又能把话说全了。' },
  ],

};

// 旧书页上随机浮现的诗句（拾取时给玩家一点"念出来"的实感）
const POEM_LINES = [
  '「海内存知己，天涯若比邻。」',
  '「会当凌绝顶，一览众山小。」',
  '「大漠孤烟直，长河落日圆。」',
  '「我寄愁心与明月，随风直到夜郎西。」',
  '「春风又绿江南岸，明月何时照我还。」',
  '「沉舟侧畔千帆过，病树前头万木春。」',
  '「但愿人长久，千里共婵娟。」',
];

// 造句/对句谜题：用收集到的字填回空缺，复原诗句
// lines 用 '_' 标记空格；answer 与空格顺序一一对应；decoys 为干扰（多为烂梗）
const PUZZLES = {
  guanju: {
    title: '复原《关雎》',
    intro: '挡路的绿雾里翻涌着烂梗。把记忆里的诗句补全，让它散去。',
    lines: ['关关雎鸠，在河之_。', '窈窕淑女，君子好_。'],
    answer: ['洲', '逑'],
    decoys: ['绝绝子', 'YYDS', '岛', '丘', '6'],
    solveText: '诗句完整的瞬间，绿雾像被一阵清风吹散。',
  },
  tengwang: {
    title: '复原《滕王阁序》·《正气歌》',
    intro: '算法的蓝墙在前。两句古文若能补全，浩然之气可破之。',
    lines: ['落霞与孤_齐飞，秋水共长_一色。', '天地有正_，杂然赋流_。'],
    answer: ['鹜', '天', '气', '形'],
    decoys: ['栓Q', '泰裤辣', '雁', '地', '神', '色'],
    solveText: '四个字归位，蓝墙裂开一道缝——那是被压住的"正气"。',
  },
  voidverse: {
    title: '在虚无里点一句诗',
    intro: '通往深渊的门吞掉一切声音。只有一句完整的诗，能在黑暗里点出路。',
    lines: ['_河旋落，_色苍苍；', '万籁俱_，吾心_明。'],
    answer: ['星', '岳', '冥', '然'],
    decoys: ['emo', '破防', '云', '海', '默', '空'],
    solveText: '最后一个字落下，黑暗里亮起一串字形铺成的小径。',
  },
  // —— 支线：唤醒失语者 ——
  cure_jingye: {
    title: '唤醒 · 念给他听',
    intro: '他死死盯着你，嘴里只剩一个音。也许一句最简单的诗，能照进去。',
    lines: ['床前明月_，疑是地上霜。', '举头望明_，低头思故乡。'],
    answer: ['光', '月'],
    decoys: ['YYDS', '绝绝子', '水', '日'],
    solveText: '他的眼睛慢慢聚焦了。"……月光。原来是月光啊。"',
  },
  cure_dengguan: {
    title: '唤醒 · 登高的人',
    intro: '她蜷在墙角，反复念着同一个字。给她接上整句吧。',
    lines: ['_日依山尽，黄河入海流。', '欲穷千_目，更上一层楼。'],
    answer: ['白', '里'],
    decoys: ['泰裤辣', '破防', '红', '重'],
    solveText: '她忽然落泪："白日……我以前，是会背的。"',
  },
};

// 首次进入场景的一行引导（配合左上角目标条/箭头）
const SCENE_INTROS = {
  freeze_center: '左上角是你的目标。靠近发光物体按 E 互动。',
  street_01: '废墟街道很大——跟着金色箭头走，沿途按 E 拾取发光的汉字碎片。',
  riverside: '江风里有人在念诗。往西侧的光柱走，找到那位老人。',
  subway: '地下很暗。可探索，也可随时从台阶（↑地面）离开。',
  alley_district: '先在入口找书远了解情况，再深入收集碎片。绿光处有更强的梗鬼。',
  stadium: '蓝光迷宫会扰乱判断。沿屏幕墙的缝隙穿行，集齐四个字。',
  data_center: '深渊在桥两侧旋转。沿石桥一直向前，走向那道蓝光。',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 高 DPI 适配
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;

    this.camera = new Camera();
    this.player = new Player(360, 540);
    this.player.san = 100;
    this.player.maxSan = 100;
    this.player.collectedChars = [];
    this.player.collectedCharsAll = []; // 永久收集记录（战斗诗词攻击不消耗它），用于门禁与进度 UI
    this.player.inventory = [];
    this.player.invulnerable = 0;
    this.player.hurtFlash = false;
    this.player.dialogGrace = 0;
    this.scene = null;
    this.dialogState = null;
    this.hints = [];
    this.collected = new Set();
    this.activatedKeystones = new Set();
    this.battle = null; // 战斗实例（非 null 时处于战斗界面）
    this.defeatedEnemies = new Set(); // 已击败的敌人 id
    this.visitedScenes = new Set(); // 已首次进入的场景（用于一次性引导提示）
    // 自定义刻字记录（要石/残碑），持久化到 localStorage
    this.engravings = this._loadEngravings();
    this.stompHintShown = false; // 踩踏提示已展示
    this._stompWindow = 0; // 踩踏判定窗口（冲刺时打开）
    this.flags = {
      wake_done: false,
      door_opened: false,
      first_geng_intro_done: false,
      met_shuyuan: false,
      alley_briefed: false,
      in_battle_hint: false,
    };
    // 道德/倾向：驱动三结局（火种 / 沉默 / 燃尽）
    this.karma = { mercy: 0, violence: 0, saved: 0 };
    this.ending = null; // 'fire' | 'silence' | 'burnout'
    // 已解开的造句谜题、已完成的支线
    this.solvedPuzzles = new Set();
    this.completedQuests = new Set();
    this.compose = null; // 造句模式实例（非 null 时处于造句界面）
    this.aiThinking = false; // 等待 LLM 时冻结输入并提示
    this.converse = null;    // 听雨自由对话模式（非 null 时处于对话界面）
    this.endingEpilogue = null; // LLM 生成的个性化结语（覆盖默认结局副标题）
    // 任务目标
    this.objective = { text: '换上衣服，离开冷冻中心', done: false };
    // 战斗状态
    this.combat = {
      // 当前激活的弹幕
      bullets: [],
      // 待显示的粒子
      particles: [],
      // 上次释放 J 的时间
      lastPurify: 0,
      purifyCooldown: 600,
      // 冲刺
      lastDash: 0,
      dashCooldown: 1500,
      // 死亡对话框
      dead: false,
    };
    this.tutorial = {
      title: '刻 痕 · 遗 忘 的 文 字',
      keys: [
        { k: 'WASD', d: '移动　·　Shift 奔跑' },
        { k: 'E', d: '交互 / 拾取 / 推进对话' },
        { k: '方向键', d: '战斗中移动红心 / 选菜单' },
        { k: 'J', d: '战斗中：攻击瞄准' },
        { k: 'Space', d: '战斗中确认 / 大地图冲刺' },
      ],
      tip: '左上角是当前目标，金色箭头指向下一步。靠近发光物按 E，靠近绿色梗鬼会进入战斗。',
    };
    // 模式：江堤横版 / 维度裂隙3D
    this.sidescroll = null;
    this.level3d = null;
    this.gameTime = 0;
    this.lastTime = 0;
  }

  start() {
    bindCanvas(this.canvas);
    this.loadScene('freeze_center');
    this.camera.snap(this.player.x, this.player.y, this.scene.width, this.scene.height);
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  loadScene(sceneId, spawnOverride) {
    this.scene = JSON.parse(JSON.stringify(scenes[sceneId]));
    const spawn = spawnOverride || this.scene.spawn;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.invulnerable = 0;
    this.player.hurtFlash = false;
    this.player.dialogGrace = 0;
    this.camera.snap(spawn.x, spawn.y, this.scene.width, this.scene.height);
    this.dialogState = null;
    this.combat.bullets = [];
    this.combat.particles = [];
    // 敌人：移除已击败的
    if (this.scene.enemies) {
      this.scene.enemies = this.scene.enemies.filter(e => !this.defeatedEnemies.has(e.id));
      for (const e of this.scene.enemies) {
        e.floating = 0;
        e.walkPhase = Math.random() * 6;      // 地面行走动画相位
        e.dir = Math.random() < 0.5 ? -1 : 1; // 巡逻方向
        e.vx = e.dir * 0.5;                    // 水平速度
        e.vy = 0;                              // 垂直速度（地面行走）
        e.onGround = true;
        e.homeX = e.x;                         // 巡逻原点
        e.range = 80;                          // 巡逻半径
        e.stompCD = 0;                         // 踩踏冷却
      }
    }
    console.log('[场景] 加载:', sceneId, '生成点', spawn);

    // 首次进入场景的一次性引导
    if (!this.visitedScenes.has(sceneId)) {
      this.visitedScenes.add(sceneId);
      const intro = SCENE_INTROS[sceneId];
      if (intro) this.showHint(intro);
    }
    // 江堤横版模式：进入 riverside 时启动
    if (this.scene.mode === 'sidescroll') {
      this.sidescroll = new SideScrollLevel(this);
    }
  }

  // ============================================
  // 江堤横版 / 维度裂隙3D 模式管理
  // ============================================
  exitSidescroll() {
    const sc = this.sidescroll;
    // 读取横版结果意图：'forward'(居民区) / 'back'(返回街道) / 'dead'
    const intent = sc.getIntent ? sc.getIntent() : (this.player.san <= 0 ? 'dead' : 'forward');
    this.sidescroll = null;
    if (intent === 'dead' || this.player.san <= 0) {
      // 死亡：回最近要石（街道）
      this.player.san = this.player.maxSan;
      this.loadScene('street_01', { x: 980, y: 1600 });
      this.showHint('你在要石的微光中醒来……');
    } else if (intent === 'back') {
      // 老人旁的返回传送点：回到街道（保留进度）
      this.flags.met_shuyuan = true;
      this.loadScene('street_01', { x: 980, y: 1600 });
      this.showHint('你借书远的提灯回到了街道。江堤的入口随时可再进。');
      this.objective = { text: '探索街道，或返回江堤', done: false };
    } else {
      // 通关：前往居民区
      this.flags.met_shuyuan = true;
      const t = sc.getExitTarget();
      this.loadScene(t.target, t.spawn);
      this.objective = { text: '探索废墟居民区', done: false };
      this.showHint('穿过江堤，前方是废墟居民区。');
    }
  }

  enterLevel3D() {
    if (this.flags.portal3d_done) {
      this.showHint('维度裂隙已经稳定，不再需要进入。');
      return;
    }
    this.startDialog([
      { s: '系统', t: '隧道深处的绿光裂开了一道缝——那是维度坍缩留下的裂隙。' },
      { s: '顾言', t: '里面……是另一个形状的世界？空间在那里重新有了厚度。' },
      { s: '系统', t: '（进入维度裂隙3D关卡：WASD+鼠标视角，左键射击，搜集物资击败怪物，找到出口回到地铁站）' },
    ], '维度裂隙', () => {
      this.level3d = new Level3D(this);
    });
  }

  exitLevel3D() {
    const lv = this.level3d;
    const dead = lv.isDead();
    const hp = lv.hp;
    lv.dispose();
    this.level3d = null;
    if (dead) {
      this.player.san = Math.floor(this.player.maxSan * 0.5);
      this.showHint('你从裂隙中爬了回来，理性严重受损。');
    } else {
      this.player.san = Math.min(this.player.maxSan, Math.max(this.player.san, hp + 20));
      this.flags.portal3d_done = true;
      this.showHint('你穿过维度裂隙，带着补给回到了地铁站。理性恢复。');
    }
  }

  // 记录一个汉字碎片：collectedChars 是战斗弹药（会被消耗），collectedCharsAll 永久保留
  recordChar(char) {
    this.player.collectedChars.push(char);
    this.player.collectedCharsAll.push(char);
  }

  // 门禁判定：返回 { ok, missing:[缺少的字] }
  meetsGate(gate) {
    if (!gate) return { ok: true, missing: [] };
    const missing = [];
    if (gate.chars) {
      for (const c of gate.chars) {
        if (!this.player.collectedCharsAll.includes(c)) missing.push(c);
      }
    }
    let flagOk = true;
    if (gate.flag) flagOk = !!this.flags[gate.flag];
    return { ok: missing.length === 0 && flagOk, missing };
  }

  // 集中式目标计算：根据场景 + flags + 永久收集，得出当前该做什么 + 指引坐标 + 进度
  refreshObjective() {
    const p = this.player;
    const has = (c) => p.collectedCharsAll.includes(c);
    const sid = this.scene.id;
    const it = (id) => this.scene.interactables.find(i => i.id === id);
    // 当前场景里最近的、尚未拾取的、属于 chars 的碎片
    const nearestChar = (chars) => {
      let best = null, bd = Infinity;
      for (const item of this.scene.items) {
        if (this.collected.has(item.id)) continue;
        if (item.type === 'char_fragment' && chars.includes(item.char)) {
          const d = Math.hypot(item.x - p.x, item.y - p.y);
          if (d < bd) { bd = d; best = item; }
        }
      }
      return best;
    };
    const charProgress = (chars) => chars.map(c => ({ c, have: has(c) }));
    let text = '探索这个世界', target = null, progress = null, done = false;
    const point = (o) => (o ? { x: o.x, y: o.y } : null);

    if (sid === 'freeze_center') {
      if (!p.hasClothes) { text = '在右侧更衣室换上灰色连体服'; target = point(it('locker')); }
      else { text = '推开南面的大门，离开冷冻中心'; target = point(it('exit_door')); }
    } else if (sid === 'street_01') {
      const need = ['洲', '逑'];
      progress = { title: '《关雎》', chars: charProgress(need) };
      if (!need.every(has)) {
        text = '在废弃街道收集《关雎》碎片「洲」「逑」';
        target = point(nearestChar(need)) || point(it('keystone_guanju'));
      } else {
        text = '穿过南面路口，前往黄浦江江堤';
        target = point(it('to_riverside'));
      }
    } else if (sid === 'riverside') {
      if (!this.flags.met_shuyuan) { text = '在江堤西侧找到会说话的老人——书远'; target = point(it('shuyuan')); }
      else { text = '沿江堤东行，前往废墟居民区'; target = point(it('to_alley')); }
    } else if (sid === 'subway') {
      text = '探索旧地铁站，搜集线索后从台阶返回地面';
      target = point(it('subway_exit'));
    } else if (sid === 'alley_district') {
      const need = ['鹜', '天', '气', '形'];
      progress = { title: '滕王阁序·正气歌', chars: charProgress(need) };
      if (!this.flags.alley_briefed) { text = '在居民区入口找到书远，听他讲解'; target = point(it('shuyuan_alley')); }
      else if (!need.every(has)) {
        text = '在居民区收集「鹜」「天」「气」「形」四个碎片';
        target = point(nearestChar(need)) || point(it('keystone_alley'));
      } else { text = '南行前往体育馆·算法茧房'; target = point(it('to_stadium')); }
    } else if (sid === 'house_a' || sid === 'house_b') {
      text = '查看屋内的旧物，然后离开'; target = point(it('house_a_exit') || it('house_b_exit'));
    } else if (sid === 'stadium') {
      const need = ['岳', '星', '然', '冥'];
      progress = { title: '岳阳·正气', chars: charProgress(need) };
      if (!need.every(has)) {
        text = '在茧房迷宫收集「岳」「星」「然」「冥」';
        target = point(nearestChar(need)) || point(it('keystone_stadium'));
      } else { text = '前往体育馆深处的数据中心'; target = point(it('to_datacenter')); }
    } else if (sid === 'data_center') {
      if (this.flags.met_tingyu) { text = '—— 全文完 ——'; done = true; }
      else { text = '走向石桥尽头的蓝色光影'; target = point(it('tingyu')); }
    }
    this.objective = { text, target, progress, done };
  }

  // 碰撞检测：只与 walls + 部分 prop 碰撞
  collides(x, y, r) {
    for (const wall of this.scene.walls) {
      if (x + r > wall.x && x - r < wall.x + wall.w &&
          y + r > wall.y && y - r < wall.y + wall.h) return true;
    }
    for (const p of this.scene.props) {
      // 不参与碰撞的 prop
      if (p.name === '终端机') continue;
      if (p.name === '我的冷冻仓') continue;
      if (p.name === '冷冻仓 A' || p.name === '冷冻仓 B' || p.name === '冷冻仓 C' ||
          p.name === '冷冻仓 D' || p.name === '冷冻仓 E' || p.name === '冷冻仓 F' ||
          p.name === '冷冻仓 G' || p.name === '冷冻仓 H' || p.name === '冷冻仓 I') continue;
      if (p.name === '废弃车辆' || p.name === '碎石堆' || p.name === '倒塌的货架' || p.name === '碎玻璃') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      if (p.name === '地铁站入口') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      if (p.name === '对岸高楼') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      // 背景高楼（远处装饰）不参与碰撞
      // '高楼' 跳过
      if (p.name === '民居A' || p.name === '民居B' || p.name === '民居C' || p.name === '民居D') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      if (p.name === '桌子' || p.name === '书架') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
      if (p.name === '屏幕墙' || p.name === '深渊' || p.name === '废弃花坛') {
        if (x + r > p.x && x - r < p.x + p.w &&
            y + r > p.y && y - r < p.y + p.h) return true;
      }
    }
    // 门禁
    if (this.scene.id === 'freeze_center' && !this.flags.door_opened) {
      if (x + r > 270 && x - r < 480 &&
          y + r > 570 && y - r < 600) return true;
    }
    return false;
  }

  loop(now) {
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;
    this.gameTime += dt;
    this.update(dt);
    // 3D 关卡用独立 WebGL 渲染器，不走 Canvas 2D render()
    if (this.level3d) {
      this.level3d.render();
    } else {
      render(this, this.gameTime);
    }
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    // 集中刷新当前目标与指引（廉价，保证始终正确）
    this.refreshObjective();

    // 教程
    if (this.tutorial) {
      const any = ['e',' ','enter','w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
      for (const k of any) {
        if (input.wasPressed(k)) {
          this.tutorial = null;
          this.showHint('按 E 与发光的物体互动。');
          return;
        }
      }
      return;
    }

    // 听雨自由对话模式
    if (this.converse) {
      this.updateConverse(dt);
      this.updateParticles(dt);
      return;
    }

    // 等待 LLM（导演/听雨）——冻结世界，避免异步期间乱动
    if (this.aiThinking) {
      this.updateParticles(dt);
      return;
    }

    // 对话中
    if (this.dialogState) {
      const d = this.dialogState;
      if (d.choosing) {
        const n = d.lines[d.idx].choice.length;
        if (input.wasPressed('arrowup') || input.wasPressed('w') || input.wasPressed('arrowleft') || input.wasPressed('a'))
          d.choiceIndex = (d.choiceIndex - 1 + n) % n;
        if (input.wasPressed('arrowdown') || input.wasPressed('s') || input.wasPressed('arrowright') || input.wasPressed('d'))
          d.choiceIndex = (d.choiceIndex + 1) % n;
        if (input.wasPressed('e') || input.wasPressed('enter')) this.confirmChoice();
      } else {
        if (input.wasPressed('e') || input.wasPressed('enter')) this.advanceDialog();
      }
      this.updateParticles(dt);
      return;
    }

    // 造句模式
    if (this.compose) {
      this.updateCompose(dt);
      this.updateParticles(dt);
      return;
    }

    // 刻字模式（要石 / 残碑）
    if (this.engraveState) {
      this.updateEngraving(dt);
      return;
    }

    // 战斗模式
    if (this.battle) {
      this.battle.update(dt);
      if (this.battle.isDone()) {
        this.endBattle();
      }
      return;
    }

    // 维度裂隙 3D 关卡（独立 WebGL 渲染，此处仅 update）
    if (this.level3d) {
      this.level3d.update(dt, input);
      if (this.level3d.isDone()) {
        this.exitLevel3D();
      }
      return;
    }
    // 江堤横版关卡
    if (this.sidescroll) {
      this.sidescroll.update(dt, input);
      if (this.sidescroll.isDone()) {
        this.exitSidescroll();
      }
      return;
    }

    // 玩家移动
    this.player.update(dt, input, this);

    // 踩踏窗口：空格冲刺时打开短暂窗口，用于俯视角踩踏地面梗鬼
    if (input.wasPressed(' ') && performance.now() - this.combat.lastDash > 600) {
      this.combat.lastDash = performance.now();
      this._stompWindow = 260;
      // 冲刺位移
      const mv = input.moveVec();
      if (mv.x !== 0 || mv.y !== 0) {
        const len = Math.hypot(mv.x, mv.y) || 1;
        const dx = (mv.x / len) * 36, dy = (mv.y / len) * 36;
        if (!this.scene.collides(this.player.x + dx, this.player.y, this.player.r)) this.player.x += dx;
        if (!this.scene.collides(this.player.x, this.player.y + dy, this.player.r)) this.player.y += dy;
      }
      this.player.invulnerable = 300;
    }
    if (this._stompWindow > 0) this._stompWindow -= dt;

    // 无敌时间衰减
    if (this.player.invulnerable > 0) {
      this.player.invulnerable -= dt;
      if (this.player.invulnerable <= 0) {
        this.player.invulnerable = 0;
        this.player.hurtFlash = false;
      }
    }
    if (this.player.dialogGrace > 0) this.player.dialogGrace -= dt;

    // 粒子
    this.updateParticles(dt);

    // 自动触发剧情 + 遭遇敌人
    this.checkAutoTriggers();

    // 交互
    if (input.wasPressed('e')) {
      this.tryInteract();
    }
  }

  // ============================================
  // 战斗系统
  // ============================================
  startBattle(enemy) {
    this.battle = new Battle(enemy, this.player, (result, e) => {
      this.battleResult = result;
      this.battleEnemy = e;
    });
  }

  endBattle() {
    const result = this.battleResult;
    const enemy = this.battleEnemy;
    this.battle = null;
    this.battleResult = null;
    this.battleEnemy = null;

    if (result === 'win') {
      // 标记敌人击败
      this.defeatedEnemies.add(enemy.id);
      this.karma.violence += 1; // 以武力消灭：倾向"燃尽"
      // 从场景移除
      if (this.scene.enemies) {
        const idx = this.scene.enemies.findIndex(e => e.id === enemy.id);
        if (idx >= 0) this.scene.enemies.splice(idx, 1);
      }
      // 掉落汉字碎片
      const drops = ['洲','洲','逑','洲','逑','逑'];
      const drop = drops[Math.floor(Math.random() * drops.length)];
      const charId = `drop_${enemy.id}_${Date.now()}`;
      this.scene.items.push({
        id: charId, x: enemy.x, y: enemy.y,
        type: 'char_fragment', char: drop
      });
      this.showHint(`击败梗鬼！掉落汉字碎片「${drop}」`);
      // 检查集齐
      const haveZhou = this.player.collectedCharsAll.filter(c => c === '洲').length;
      const haveQiu = this.player.collectedCharsAll.filter(c => c === '逑').length;
      if (haveZhou >= 1 && haveQiu >= 1 && !this.flags.poem_done_hint) {
        this.flags.poem_done_hint = true;
        this.objective = { text: '前往江堤，与书远对话', done: false };
        this.showHint('集齐了「关雎」！去找书远吧。');
      }
      // 对话保护
      this.player.dialogGrace = 1500;
    } else if (result === 'spare') {
      // 以诗唤醒、宽恕：倾向"火种"
      this.defeatedEnemies.add(enemy.id);
      this.karma.mercy += 1;
      if (this.scene.enemies) {
        const idx = this.scene.enemies.findIndex(e => e.id === enemy.id);
        if (idx >= 0) this.scene.enemies.splice(idx, 1);
      }
      this.showHint('梗鬼安静下来，化作一缕暖光散去。（宽恕）');
      this.player.dialogGrace = 1500;
    } else if (result === 'lose') {
      // 死亡：回到最近的要石
      this.player.san = this.player.maxSan;
      this.showHint('你在要石的微光中醒来……');
      // 重新加载当前场景
      this.loadScene(this.scene.id);
    }
  }

  // ============================================
  // 造句谜题模式
  // ============================================
  startCompose(puzzleId, onSolve) {
    const def = PUZZLES[puzzleId];
    if (!def) { if (onSolve) onSolve(); return; }
    // 构造字盘：答案字（去重）+ 干扰词，打乱
    const tiles = [];
    const seen = {};
    for (const ch of def.answer) { if (!seen[ch]) { tiles.push(ch); seen[ch] = true; } }
    for (const d of (def.decoys || [])) tiles.push(d);
    // 洗牌
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    this.compose = {
      id: puzzleId,
      def,
      slots: new Array(def.answer.length).fill(null), // {char, poolIdx}
      pool: tiles,
      used: new Array(tiles.length).fill(false),
      sel: 0,
      onSolve,
      status: 'input', // 'input' | 'win' | 'wrong'
      timer: 0,
      shake: 0,
      fade: 1,
    };
  }

  _composeStep(from, dir) {
    const c = this.compose;
    const n = c.pool.length;
    let i = from;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!c.used[i]) return i;
    }
    return from;
  }

  updateCompose(dt) {
    const c = this.compose;
    c.timer += dt;
    if (c.shake > 0) c.shake -= dt;
    if (c.fade > 0) c.fade = Math.max(0, c.fade - dt * 0.004);

    if (c.status === 'win') {
      if (c.timer > 1500) {
        const cb = c.onSolve;
        this.compose = null;
        input.wasPressed(' ');
        this.player.dialogGrace = 800;
        if (cb) cb();
      }
      return;
    }
    if (c.status === 'wrong') {
      if (c.timer > 650) { c.status = 'input'; c.timer = 0; }
      return;
    }

    // 离开
    if (input.wasPressed('escape') || input.wasPressed('q')) {
      this.compose = null;
      this.showHint('你先退开了。想清楚诗句、集齐字，再回来。');
      return;
    }
    // 撤销
    if (input.wasPressed('backspace')) {
      for (let i = c.slots.length - 1; i >= 0; i--) {
        if (c.slots[i]) { c.used[c.slots[i].poolIdx] = false; c.slots[i] = null; break; }
      }
      return;
    }
    // 选择字盘
    if (input.wasPressed('arrowleft') || input.wasPressed('a')) c.sel = this._composeStep(c.sel, -1);
    if (input.wasPressed('arrowright') || input.wasPressed('d')) c.sel = this._composeStep(c.sel, 1);

    if (input.wasPressed('e') || input.wasPressed('enter')) {
      const empty = c.slots.indexOf(null);
      if (empty >= 0) {
        // 放入当前选中字
        if (!c.used[c.sel]) {
          c.slots[empty] = { char: c.pool[c.sel], poolIdx: c.sel };
          c.used[c.sel] = true;
          // 移到下一个可用
          const nxt = this._composeStep(c.sel, 1);
          if (nxt !== c.sel) c.sel = nxt;
        }
      } else {
        // 判定
        const ok = c.slots.every((s, i) => s && s.char === c.def.answer[i]);
        if (ok) {
          c.status = 'win';
          c.timer = 0;
          this.solvedPuzzles.add(c.id);
          this.showHint(c.def.solveText || '诗句复原了。');
        } else {
          c.status = 'wrong';
          c.timer = 0;
          c.shake = 400;
          this.player.san = Math.max(0, this.player.san - 8);
          // 清空重来
          c.slots = new Array(c.def.answer.length).fill(null);
          c.used = c.used.map(() => false);
        }
      }
    }
  }

  // ============================================
  // 结局结算（火种 / 沉默 / 燃尽）
  // ============================================
  resolveEnding() {
    const k = this.karma;
    const warm = k.mercy + k.saved;
    const fc = this.flags.finale_choice;
    if (fc === 'erase' || (k.violence >= 5 && warm <= 1)) return 'burnout';
    if (fc === 'affirm' && warm >= 3) return 'fire';
    return 'silence';
  }

  finishGame() {
    // AI 降级路径：跳过刻字汇总评价
    this.flags.met_tingyu = true;
    this.ending = this.resolveEnding();
    this.flags.game_complete = true;
    this.flags.engraving_summary = null; // 标记：降级，无评价
  }

  checkAutoTriggers() {
    // 第一次进入冷冻中心：玩家迈出第一步时，触发苏醒对话
    if (this.scene.id === 'freeze_center' && !this.flags.wake_done) {
      const spawn = this.scene.spawn;
      const moved = Math.hypot(this.player.x - spawn.x, this.player.y - spawn.y);
      if (moved > 30) {
        this.flags.wake_done = true;
        this.startDialog(DIALOGS.wake, '');
        return;
      }
    }
    // 梗鬼地面行走 + 踩踏判定
    if (this.scene.enemies && !this.battle && !this.dialogState) {
      this.updateEnemies(dt);
    }
  }

  // ============================================
  // 梗鬼地面行走（超级玛丽式：巡逻 + 重力 + 踩踏）
  // ============================================
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.scene.enemies) {
      if (this.defeatedEnemies.has(e.id)) continue;
      // 地面行走巡逻
      e.walkPhase += dt * 0.01;
      e.x += e.vx * (dt / 16);
      // 巡逻边界转向
      if (e.x > e.homeX + e.range) { e.dir = -1; e.vx = e.dir * 0.5; }
      else if (e.x < e.homeX - e.range) { e.dir = 1; e.vx = e.dir * 0.5; }
      if (e.stompCD > 0) e.stompCD -= dt;

      // 踩踏判定：玩家从上方落下且接近
      const dx = Math.abs(e.x - p.x);
      const dy = p.y - e.y; // 玩家在敌人上方时为负
      const falling = p.walkCycle !== undefined && this._playerFalling;
      if (dx < 22 && dy > -28 && dy < 4 && this._playerFalling && e.stompCD <= 0) {
        // 踩中！弹起 + 击败
        this._stompEnemy(e);
        continue;
      }

      // 接触伤害 / 进入战斗（侧向接触）
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 40 && !this._playerFalling) {
        // 第一次遭遇剧情
        if (this.scene.id === 'street_01' && e.id === 'geng_1' && !this.flags.first_geng_intro_done) {
          this.flags.first_geng_intro_done = true;
          this.startDialog(DIALOGS.first_geng_intro, '梗鬼', () => {
            this.startBattle(e);
          });
          return;
        }
        this.startBattle(e);
        return;
      }
    }
  }

  // 玩家是否处于下落状态（用于踩踏判定）
  get _playerFalling() {
    // 俯视角无垂直速度，用"刚按下空格后短暂窗口"模拟踩踏
    // 空格冲刺时也算（向下扑），便于俯视角踩踏
    return this._stompWindow > 0;
  }

  _stompEnemy(e) {
    this.defeatedEnemies.add(e.id);
    e.stompCD = 9999;
    // 弹起效果（视觉粒子）
    this.combat.particles.push({
      x: e.x, y: e.y, vx: 0, vy: -2, life: 400, color: '180,255,180', size: 3,
    });
    this.player.san = Math.min(this.player.maxSan, this.player.san + 4);
    if (!this.stompHintShown) {
      this.stompHintShown = true;
      this.showHint('踩中梗鬼！（空格冲刺可踩踏地面行走的梗鬼）');
    } else {
      this.showHint('踩中！理性 +4');
    }
  }

  // ============================================
  // 刻字系统（要石 / 残碑 · 预设 + 自定义 · localStorage 持久化）
  // ============================================
  _loadEngravings() {
    try {
      const raw = localStorage.getItem('keheng_engravings');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }
  _saveEngravings() {
    try { localStorage.setItem('keheng_engravings', JSON.stringify(this.engravings)); } catch (e) {}
  }
  _addEngraving(rec) {
    this.engravings.push(rec);
    this._saveEngravings();
  }

  // 启动刻字模式：type='keystone'|'stele'
  startEngraving(target, type) {
    const presets = type === 'keystone'
      ? ['活着', '记得', '归来', '不语', '此心', '故人', '归途', '在此']
      : ['关关', '雎鸠', '窈窕', '好逑', '落霞', '正气', '听雨', '书远'];
    this.engraveState = {
      target, type, presets,
      sel: 0,
      mode: 'select', // 'select' | 'input'
      input: '',
    };
  }
  updateEngraving(dt) {
    const e = this.engraveState;
    if (!e) return;
    if (e.mode === 'select') {
      const n = e.presets.length + 1; // 末项为"自定义输入"
      if (input.wasPressed('arrowup') || input.wasPressed('w') || input.wasPressed('arrowleft') || input.wasPressed('a'))
        e.sel = (e.sel - 1 + n) % n;
      if (input.wasPressed('arrowdown') || input.wasPressed('s') || input.wasPressed('arrowright') || input.wasPressed('d'))
        e.sel = (e.sel + 1) % n;
      if (input.wasPressed('e') || input.wasPressed('enter')) {
        if (e.sel < e.presets.length) {
          this._commitEngraving(e.presets[e.sel]);
        } else {
          e.mode = 'input'; e.input = '';
          setTimeout(() => { if (this._engraveInput) this._engraveInput.focus(); }, 30);
        }
      }
      if (input.wasPressed('escape') || input.wasPressed('q')) {
        this.engraveState = null;
        this.showHint('你收回了刻刀。');
      }
    } else {
      // input 模式由 DOM 输入框处理（在 render 时创建）
      if (input.wasPressed('escape')) {
        e.mode = 'select'; e.input = '';
        if (this._engraveInput && this._engraveInput.parentNode) { this._engraveInput.parentNode.removeChild(this._engraveInput); this._engraveInput = null; }
      }
    }
    this.updateParticles(dt);
  }
  _commitEngraving(text) {
    const t = (text || '').trim().slice(0, 12);
    if (!t) { this.showHint('没有刻下任何字。'); this.engraveState = null; return; }
    const e = this.engraveState;
    const rec = {
      text: t,
      type: e.type,
      targetId: e.target.id,
      scene: this.scene.id,
      time: Date.now(),
      custom: !e.presets.includes(t),
    };
    this._addEngraving(rec);
    if (e.type === 'keystone') this.activatedKeystones.add(e.target.id);
    this.activatedKeystones.add(e.target.id);
    // 记录刻字内容到目标对象，供渲染显示
    e.target.engraved = t;
    this.engraveState = null;
    this.startDialog([
      { s: '系统', t: `顾言用刻刀刻下「${t}」。` },
      { s: '系统', t: '金色的微光从刻痕里渗出，像是一个被重新点燃的坐标。' },
      { s: '系统', t: '（已刻下并保存）' },
    ], e.type === 'keystone' ? '要石' : '残碑');
  }
  _submitEngraveInput() {
    const text = (this._engraveInput ? this._engraveInput.value : this.engraveState.input).trim();
    if (this._engraveInput && this._engraveInput.parentNode) { this._engraveInput.parentNode.removeChild(this._engraveInput); this._engraveInput = null; }
    this._commitEngraving(text);
  }

  // ============================================
  // 结局：刻字汇总评价（仅 AI 可用时）
  // ============================================
  async summarizeEngravings() {
    if (!this.engravings.length) return null;
    if (!AI.llm) return null; // 降级则跳过
    this.aiThinking = true;
    this.aiThinkingText = '正在凝视你刻下的每一个字……';
    try {
      const list = this.engravings.map((e, i) => `${i + 1}. 「${e.text}」(${e.type === 'keystone' ? '要石' : '残碑'}${e.custom ? '·自定义' : ''})`).join('\n');
      const prompt = `玩家在一款关于"语言消亡与文字守护"的游戏中，于各处要石与残碑上刻下了以下文字：\n${list}\n\n请以一位历经沧桑的叙事者口吻，对玩家刻下的这些字进行简短的汇总、分析与评价（120字以内）。可点评其用词倾向、情感内核，以及这些字在这个失语的世界里意味着什么。不要复述列表，直接给出评价。`;
      const reply = await AI.llm.chat([{ role: 'user', content: prompt }]);
      this.aiThinking = false;
      return (reply || '').trim();
    } catch (e) {
      this.aiThinking = false;
      return null;
    }
  }

  // ============================================
  // 大地图粒子（拾取特效等）
  // ============================================
  updateParticles(dt) {
    for (let i = this.combat.particles.length - 1; i >= 0; i--) {
      const p = this.combat.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) {
        this.combat.particles.splice(i, 1);
      }
    }
  }

  // ============================================
  // 交互
  // ============================================
  tryInteract() {

    let best = null, bd = 55;
    for (const it of this.scene.interactables) {
      const d = Math.hypot(it.x - this.player.x, it.y - this.player.y);
      if (d < bd) { bd = d; best = it; }
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
      if (best.type === 'scene_change') {
        // 章节门禁：前进型出口需满足条件
        if (best.gate) {
          const res = this.meetsGate(best.gate);
          if (!res.ok) {
            this.startDialog([
              { s: '系统', t: best.gate.msg },
              ...(res.missing.length ? [{ s: '系统', t: `（还差：${res.missing.map(c => '「' + c + '」').join('')}）` }] : []),
            ], '前方受阻');
            return;
          }
          // 字已集齐：触发造句谜题（未解过的）
          if (best.gate.puzzle && !this.solvedPuzzles.has(best.gate.puzzle)) {
            const tgt = best.target, spawn = best.spawn;
            this.startCompose(best.gate.puzzle, () => this.loadScene(tgt, spawn));
            return;
          }
        }
        this.loadScene(best.target, best.spawn);
        if (best.target === 'riverside') {
          this.objective = { text: '前往江堤，与书远对话', done: false };
        } else if (best.target === 'street_01') {
          this.objective = { text: '继续探索街道，收集「关雎」碎片', done: false };
        } else if (best.target === 'freeze_center') {
          this.objective = { text: '返回冷冻中心', done: false };
        } else if (best.target === 'subway') {
          this.objective = { text: '探索地铁站，小心梗鬼', done: false };
        } else if (best.target === 'alley_district') {
          this.objective = { text: '在废墟居民区找到书远', done: false };
        } else if (best.target === 'house_a') {
          this.objective = { text: '搜刮民居A', done: false };
        } else if (best.target === 'house_b') {
          this.objective = { text: '清除民居B里的梗鬼', done: false };
        } else if (best.target === 'stadium') {
          this.objective = { text: '与书远对话', done: false };
        } else if (best.target === 'data_center') {
          this.objective = { text: '走向石桥深处', done: false };
        }
        return;
      }
      if (best.type === 'dialog') {
        const key = best.dialogKey;
        // 结局：与听雨自由对话（AI 可用时）
        if (key === 'meet_tingyu') {
          if (this.flags.game_complete) {
            this.startDialog([{ s: '听雨', t: '……（结局已至。刷新页面可重新开始一段旅程。）' }], '听雨');
            return;
          }
          if (AI.llm) { this.startTingyuConverse(); return; }
          // 降级：静态三选一结局
          this.startDialog(DIALOGS[key] || [], best.label, () => this.finishGame());
          return;
        }
        // 导演分支（AI 可用时）：失语者群 / 茧房受害者
        if (AI.llm && (key === 'lost_people' || key === 'cocoon_victim')) {
          const after = (key === 'cocoon_victim') ? () => { this.flags.seen_cocoon_victim = true; } : null;
          this._runDirectorBranch(key, DIALOGS[key] || [], best.label, after);
          return;
        }
        this.startDialog(DIALOGS[key] || [], best.label);
        if (key === 'first_geng_intro') {
          this.flags.first_geng_intro_done = true;
        }
        if (key === 'meet_shuyuan' && !this.flags.met_shuyuan) {
          this.flags.met_shuyuan = true;
          this.player.inventory.push({ id: 'knife', name: '记忆合金刻刀' });
          this.player.inventory.push({ id: 'poem_guanju', name: '诗词纸片《关雎》' });
          this.showHint('获得：刻刀、诗词纸片《关雎》');
          this.objective = { text: '前往废墟居民区，跟随书远', done: false };
        }
        if (key === 'shuyuan_alley') {
          this.flags.alley_briefed = true;
        }
        if (key === 'house_a_book') {
          this.player.san = Math.min(this.player.maxSan, this.player.san + 20);
          this.showHint('念出诗句，SAN +20');
        }
        if (key === 'shuyuan_farewell') {
          this.objective = { text: '穿越屏幕迷宫，收集「岳星然冥」', done: false };
        }
        if (key === 'cocoon_victim') {
          this.flags.seen_cocoon_victim = true;
        }
        return;
      }
      if (best.type === 'cure') {
        if (this.completedQuests.has(best.id)) {
          this.startDialog(DIALOGS.cured_done, best.label);
          return;
        }
        const reward = () => {
          this.completedQuests.add(best.id);
          this.karma.saved += 1;
          this.player.maxSan += 10;
          this.player.san = this.player.maxSan;
          this.showHint('你唤醒了一个失语者！理性上限 +10。（救助 +1）');
        };
        this.startDialog(DIALOGS[best.introKey] || [{ s: '系统', t: '你在他面前蹲下。' }], best.label, () => {
          this.startCompose(best.puzzle, reward);
        });
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
          this.showHint(`获得：汉字碎片「${it.char}」`);
          // 检查是否集齐
          const haveZhou = this.player.collectedCharsAll.filter(c => c === '洲').length;
          const haveQiu = this.player.collectedCharsAll.filter(c => c === '逑').length;
          if (haveZhou >= 1 && haveQiu >= 1 && !this.flags.poem_done_hint) {
            this.flags.poem_done_hint = true;
            this.objective = { text: '前往江堤，与书远对话', done: false };
            this.showHint('集齐了「关雎」！去找书远吧。');
          }
        } else if (it.type === 'page') {
          this.player.san = Math.min(this.player.maxSan, this.player.san + 30);
          const line = POEM_LINES[Math.floor(Math.random() * POEM_LINES.length)];
          this.showHint('旧书页：' + line + '（理性 +30）');
        } else {
          this.showHint(`获得：${it.name || '物品'}`);
        }
      }
    }
  }

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
      lines, name,
      idx: 0, charIdx: 0, charTimer: 0, done: false,
      choosing: false, choiceIndex: 0,
      onComplete,
    };
    this.setDialogIndex(0);
  }

  // 跳到第 i 个节点（跳过纯 label 节点；越界则结束）
  setDialogIndex(i) {
    const d = this.dialogState;
    if (!d) return;
    while (i < d.lines.length) {
      const n = d.lines[i];
      if (n.label !== undefined && n.t === undefined && n.choice === undefined) { i++; continue; }
      break;
    }
    if (i >= d.lines.length) { this.endDialog(); return; }
    d.idx = i; d.charIdx = 0; d.charTimer = 0; d.choosing = false; d.choiceIndex = 0;
    const n = d.lines[i];
    if (n.t === undefined) {
      d.done = true;
      if (n.choice) { d.choosing = true; }
    } else {
      d.done = false;
      this._speakLine(d, i, n);
    }
  }

  endDialog() {
    const d = this.dialogState;
    if (!d) return;
    voice.stop();
    const cb = d.onComplete;
    this.dialogState = null;
    input.wasPressed(' '); // 吃掉空格，避免立即冲刺
    this.player.dialogGrace = 1000;
    if (cb) cb();
  }

  // 为一条文本节点配音；播完自然推进（仅纯文本节点；文本+选项节点播完进入选择）
  _speakLine(dref, idx, node) {
    if (!AI.tts || !node || node.t === undefined) return;
    const { voice: v, style, model } = speakerStyle(node.s);
    voice.speak(node.t, { voice: v, style, model }, () => this._handleVoiceEnd(dref, idx));
  }

  _handleVoiceEnd(dref, idx) {
    if (!AI.autoplay) return;
    const d = this.dialogState;
    if (!d || d !== dref || d.idx !== idx || d.choosing) return; // 对话已变/玩家已手动推进
    const node = d.lines[idx];
    if (node && node.choice) { d.choosing = true; d.choiceIndex = 0; } // 文本+选项：播完进入选择
    else this.setDialogIndex(idx + 1);                                  // 纯文本：播完下一句
  }

  // ============================================
  // LLM 导演分支（失败回退静态对话）
  // ============================================
  async _runDirectorBranch(key, fallbackLines, name, after) {
    this.aiThinking = true;
    this.aiThinkingText = '聆听这个世界…';
    let lines = fallbackLines, effect = null;
    try {
      const parsed = await generateBranch(this, key);
      const built = buildBranchDialog(parsed);
      if (built && built.lines.length) { lines = built.lines; effect = built.effect; }
    } catch (e) { console.warn('[director] 回退静态：', e.message); }
    this.aiThinking = false;
    const done = () => {
      if (effect) this.applyEffect(effect); // 无选项分支：心境影响在对话结束时落地
      if (after) after();
    };
    this.startDialog(lines, name, done);
  }

  // ============================================
  // 结局：与听雨自由对话（LLM）
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
      status: 'idle',   // idle=等玩家 | waiting=等LLM | ending=已定结局
      endTag: null,
      epilogue: null,
      hint: '用你自己的话回答她。点下方输入框，回车说出。',
      _inputEl: null,
      _done: false,
    };
    if (AI.tts) voice.speak(opening, speakerStyle('听雨'));
    this._makeConverseInput();
  }

  _makeConverseInput() {
    const c = this.converse;
    const wrap = document.getElementById('wrap') || document.body;
    const el = document.createElement('input');
    el.type = 'text';
    el.maxLength = 80;
    el.placeholder = '说点什么…（回车）';
    el.setAttribute('autocomplete', 'off');
    Object.assign(el.style, {
      position: 'absolute', left: '50%', bottom: '54px', transform: 'translateX(-50%)',
      width: '620px', padding: '12px 16px', fontSize: '16px',
      fontFamily: "'SimSun','Songti SC',serif", color: '#dce6f0',
      background: 'rgba(10,16,28,0.92)', border: '1px solid rgba(150,190,230,0.5)',
      outline: 'none', borderRadius: '4px', letterSpacing: '1px',
      zIndex: '10', boxShadow: '0 0 24px rgba(80,130,210,0.25)',
    });
    let composing = false;
    el.addEventListener('compositionstart', () => { composing = true; });
    el.addEventListener('compositionend', () => { composing = false; });
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !composing) { e.preventDefault(); this._submitConverse(el.value); }
    });
    wrap.appendChild(el);
    setTimeout(() => el.focus(), 30);
    c._inputEl = el;
  }

  _submitConverse(text) {
    const c = this.converse;
    if (!c || c.status !== 'idle') return;
    const msg = (text || '').trim();
    if (!msg) return;
    c.playerLast = msg;
    c.history.push({ role: 'user', content: msg });
    c.status = 'waiting';
    if (c._inputEl) { c._inputEl.value = ''; c._inputEl.disabled = true; }
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
        const sp = speakerStyle('听雨');
        if (finalEnd) {
          c.status = 'ending'; c.endTag = finalEnd; c.epilogue = epilogue;
          if (c._inputEl && c._inputEl.parentNode) { c._inputEl.parentNode.removeChild(c._inputEl); c._inputEl = null; }
          if (AI.tts) voice.speak(reply, sp, () => this._endConverse());
        } else {
          c.status = 'idle';
          if (c._inputEl) { c._inputEl.disabled = false; setTimeout(() => c._inputEl && c._inputEl.focus(), 20); }
          if (AI.tts) voice.speak(reply, sp);
        }
      })
      .catch((e) => {
        if (this.converse !== c) return;
        console.warn('[听雨] 回应失败：', e.message);
        c.fails = (c.fails || 0) + 1;
        if (c.fails >= 2) {
          // 连续失败：直接以现有倾向收束，避免卡死
          c.status = 'ending';
          c.endTag = this.resolveEnding();
          c.epilogue = null;
          c.tingyuText = '……（连接中断了。但你已经走到了这里。）';
          if (c._inputEl && c._inputEl.parentNode) { c._inputEl.parentNode.removeChild(c._inputEl); c._inputEl = null; }
          return;
        }
        c.tingyuText = '……（她的影像闪烁了一下，信号不稳。再说一次？）';
        c.status = 'idle';
        if (c._inputEl) { c._inputEl.disabled = false; setTimeout(() => c._inputEl && c._inputEl.focus(), 20); }
      });
  }

  updateConverse(dt) {
    const c = this.converse;
    if (!c) return;
    if (c.status === 'ending') {
      if (input.wasPressed('e') || input.wasPressed('enter')) { voice.stop(); this._endConverse(); }
    }
  }

  _endConverse() {
    const c = this.converse;
    if (!c || c._done) return;
    c._done = true;
    voice.stop();
    if (c._inputEl && c._inputEl.parentNode) c._inputEl.parentNode.removeChild(c._inputEl);
    const endTag = c.endTag, epi = c.epilogue;
    this.converse = null;
    // AI 可用路径：先结算结局，再异步获取刻字汇总评价
    this.finishGameWith(endTag, epi);
    this._finalizeWithEngravingSummary();
  }

  finishGameWith(endTag, epilogue) {
    this.flags.met_tingyu = true;
    this.ending = (endTag === 'fire' || endTag === 'silence' || endTag === 'burnout') ? endTag : this.resolveEnding();
    this.endingEpilogue = epilogue || null;
    this.flags.game_complete = true;
  }

  async _finalizeWithEngravingSummary() {
    // 仅在 AI 可用（非降级）时进行刻字汇总评价
    if (!AI.llm) { this.flags.engraving_summary = null; return; }
    const summary = await this.summarizeEngravings();
    this.flags.engraving_summary = summary; // 可能 null（无刻字或失败）
  }

  applyEffect(effect) {
    if (!effect) return;
    if (effect.mercy) this.karma.mercy += effect.mercy;
    if (effect.violence) this.karma.violence += effect.violence;
    if (effect.saved) this.karma.saved += effect.saved;
    if (effect.san) this.player.san = Math.max(0, Math.min(this.player.maxSan, this.player.san + effect.san));
    if (effect.flags) for (const k in effect.flags) this.flags[k] = effect.flags[k];
    if (effect.hint) this.showHint(effect.hint);
  }

  // 确认当前选项
  confirmChoice() {
    const d = this.dialogState;
    if (!d || !d.choosing) return;
    const node = d.lines[d.idx];
    const opt = node.choice[d.choiceIndex];
    this.applyEffect(opt.effect);
    if (opt.goto) {
      const gi = d.lines.findIndex(n => n.label === opt.goto);
      this.setDialogIndex(gi >= 0 ? gi : d.idx + 1);
    } else {
      this.setDialogIndex(d.idx + 1);
    }
  }

  advanceDialog() {
    const d = this.dialogState;
    if (!d) return;
    const node = d.lines[d.idx];
    const voiceBusy = AI.tts && voice.isBusy();
    // 打字未完且语音不在播 → 先补全文本（无语音时保留原手感）
    if (node.t !== undefined && !d.done && !voiceBusy) {
      d.charIdx = node.t.length;
      d.done = true;
      return;
    }
    // 文本已完且本节点带选项 → 进入选择（抢断语音）
    if (node.choice && !d.choosing) {
      if (node.t !== undefined) { d.charIdx = node.t.length; d.done = true; }
      d.choosing = true;
      d.choiceIndex = 0;
      voice.stop();
      return;
    }
    // 否则推进（setDialogIndex 会触发下一句语音，并先掐断当前——即"播放中按 E 抢断下一句"）
    this.setDialogIndex(d.idx + 1);
  }

  showHint(text) {
    this.hints.push({ t: text, life: 2500 });
  }
}
