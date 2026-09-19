const RULES = [
  { re: /健身|力量|撸铁|哑铃|俯卧撑|仰卧起坐/, icon: '🏋️' },
  { re: /跑步|晨跑|夜跑|慢跑|快走|走路|散步|运动/, icon: '🏃' },
  { re: /游泳/, icon: '🏊' },
  { re: /瑜伽|拉伸|冥想|打坐|正念/, icon: '🧘' },
  { re: /骑行|单车|自行车/, icon: '🚴' },
  { re: /球|篮球|足球|羽毛球|乒乓/, icon: '⚽' },
  { re: /早起|起床|早睡|作息/, icon: '🌅' },
  { re: /喝水|饮水|水/, icon: '💧' },
  { re: /阅读|读书|看书|背单词|学习|课程|写作业/, icon: '📚' },
  { re: /写作|日记|复盘|记录/, icon: '✍️' },
  { re: /画画|绘画|美术|设计/, icon: '🎨' },
  { re: /音乐|练琴|钢琴|吉他|唱歌/, icon: '🎵' },
  { re: /做饭|烹饪|下厨/, icon: '🍳' },
  { re: /打扫|家务|整理|洗衣|洗碗/, icon: '🧹' },
  { re: /吃药|服药|健康|体检|养生/, icon: '💊' },
  { re: /睡觉|午休|睡眠/, icon: '😴' },
  { re: /存钱|记账|理财/, icon: '💰' },
  { re: /社交|聚会|联系|沟通/, icon: '👥' },
  { re: /遛狗|宠物|猫|狗/, icon: '🐾' }
];

function habitIcon(name) {
  const text = String(name || '');
  for (let i = 0; i < RULES.length; i += 1) {
    if (RULES[i].re.test(text)) return RULES[i].icon;
  }
  return '';
}

module.exports = { habitIcon };
