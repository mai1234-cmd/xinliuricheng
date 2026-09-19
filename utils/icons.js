const { catById } = require('./palette');

const RULES = [
  { re: /上课|课堂|课|学习|写作业|做作业|看书|阅读|读书|背书|复习|考试|自习|背单词/, icon: '📖' },
  { re: /跑步|晨跑|健身|锻炼|瑜伽|游泳|打球|篮球|足球|羽毛球|运动|散步/, icon: '⚽' },
  { re: /吃饭|早餐|午餐|晚餐|吃[饭面粉]|用餐|聚餐|外卖|做饭/, icon: '🍽️' },
  { re: /休息|午休|睡觉|小睡|放松|冥想|放空/, icon: '🌙' },
  { re: /会议|开会|汇报|面试|周会|例会|讨论|沟通|对接/, icon: '💼' },
  { re: /购物|买菜|超市|逛街|买/, icon: '🛒' },
  { re: /家务|打扫|洗碗|洗衣|整理|收拾|大扫除/, icon: '🧹' },
  { re: /练琴|钢琴|吉他|音乐|唱歌/, icon: '🎵' },
  { re: /画画|美术|设计|手绘/, icon: '🎨' },
  { re: /电影|看剧|追剧|综艺/, icon: '🎬' },
  { re: /游戏|打游戏|开黑/, icon: '🎮' },
  { re: /喝水|吃药|养生/, icon: '💧' }
];

const CAT_FALLBACK = {
  work: '💼',
  study: '📖',
  sport: '⚽',
  life: '🏠',
  other: '⭐'
};

function taskIcon(title, category) {
  const text = String(title || '');
  for (let i = 0; i < RULES.length; i += 1) {
    if (RULES[i].re.test(text)) return RULES[i].icon;
  }
  return catById(category).icon || '⭐';
}

const BRIGHT = ['#FF5A5F', '#FF9F1C', '#2EC4B6', '#3D7BFF', '#8B5CF6', '#FF6BA9', '#2BB673', '#FFC53D'];

module.exports = { taskIcon, BRIGHT };
