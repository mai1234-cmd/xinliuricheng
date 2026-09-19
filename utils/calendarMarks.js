const holidays = require('./holidays');

// 24 节气（1900-2100 通用近似算法）、法定节假日与纪念日标记
const TERMS = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
const BASE = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758];
const FIXED = {
  '01-01': '元旦', '02-14': '情人节', '03-08': '妇女节', '03-12': '植树节', '04-01': '愚人节',
  '05-01': '劳动节', '05-04': '青年节', '06-01': '儿童节', '07-01': '建党节', '08-01': '建军节',
  '09-10': '教师节', '10-01': '国庆节', '12-25': '圣诞节',
  '01-10': '中国人民警察节', '03-03': '全国爱耳日', '03-15': '消费者权益日', '03-21': '世界睡眠日',
  '03-22': '世界水日', '04-07': '世界卫生日', '04-22': '世界地球日', '04-23': '世界读书日',
  '05-08': '世界红十字日', '05-12': '全国防灾减灾日', '05-18': '国际博物馆日', '05-31': '世界无烟日',
  '06-05': '世界环境日', '06-06': '全国爱眼日', '06-26': '国际禁毒日', '08-08': '全民健身日',
  '09-03': '抗战胜利纪念日', '09-18': '九一八事变纪念日', '09-30': '烈士纪念日', '10-16': '世界粮食日',
  '11-09': '全国消防日', '12-01': '世界艾滋病日', '12-02': '全国交通安全日', '12-04': '国家宪法日',
  '12-13': '国家公祭日'
};

function termDay(year, index) {
  const ms = Date.UTC(1900, 0, 6, 2, 5) + 31556925974.7 * (year - 1900) + BASE[index] * 60000;
  const d = new Date(ms);
  return d.getUTCDate();
}

function solarTermsOfMonth(year, month) {
  const days = new Date(year, month, 0).getDate();
  const map = {};
  [month * 2 - 2, month * 2 - 1].forEach((idx) => {
    if (idx < 0 || idx >= TERMS.length) return;
    const day = termDay(year, idx);
    if (day >= 1 && day <= days) map[day] = TERMS[idx];
  });
  return map;
}

function marksFor(dateStr) {
  const p = String(dateStr).split('-').map(Number);
  if (p.length < 3 || !p[0]) return [];
  const marks = [];
  const key = String(p[1]).padStart(2, '0') + '-' + String(p[2]).padStart(2, '0');
  const holiday = holidays.holidayOf(dateStr);
  if (holiday && holiday.festival) marks.push({ type: 'festival', text: holiday.name });
  else if (holiday) marks.push({ type: 'holiday', text: holiday.off ? '休' : '班' });
  else if (FIXED[key]) marks.push({ type: 'festival', text: FIXED[key] });
  const term = solarTermsOfMonth(p[0], p[1])[p[2]];
  if (term && !(holiday && holiday.festival && holiday.name.indexOf(term) >= 0)) marks.push({ type: 'term', text: term });
  return marks;
}

module.exports = { marksFor, solarTermsOfMonth };
