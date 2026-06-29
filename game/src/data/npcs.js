export const NPCS = {
  littleBlue: {
    id: 'littleBlue',
    name: '小蓝',
    pollutedLines: ['awsl……好……好……绝……', '救……救……'], 
    trueLine: '谢谢你……我一直在喊「绝」，其实我只是想说我好喜欢这里的晚霞。',
    wordsNeeded: ['listen'],
    x: 1400,
    y: 0,
    purified: false,
    following: false
  },
  oldTree: {
    id: 'oldTree',
    name: '老树桩',
    pollutedLines: ['绝……子……绝……子……'],
    trueLine: '我复制了千万遍，却从未说过一句自己的话。带我去村庄吧，我想种一棵真正的树。',
    wordsNeeded: ['slow', 'true', 'ask'],
    x: 3200,
    y: 0,
    purified: false,
    following: false
  },
  // 新角色：墨水 —— 荧光河床的写作者，手稿被数字洪流冲散
  ink: {
    id: 'ink',
    name: '墨水',
    pollutedLines: [],
    trueLine: '',
    wordsNeeded: [],
    x: -100,
    y: 200,
    purified: false,
    following: false,
    talkCount: 0
  },
  // 新角色：回声 —— 石碑密室的幽灵，由被删除的消息拼成
  echo: {
    id: 'echo',
    name: '回声',
    pollutedLines: [],
    trueLine: '',
    wordsNeeded: [],
    x: 0,
    y: -50,
    purified: false,
    following: false,
    talkCount: 0
  }
};

export const DIALOGUES = {
  opening: [
    '每一句真心话都曾是文明的火种。',
    '人类文明曾经是一条呼吸着的、柔软的曲线。',
    '语言被滥用至僵化，文明被「绷直」成笔直的信息洪流。',
    '你是这条直线断裂后，从废墟中诞生的第一个「反叛者」。'
  ]
};
