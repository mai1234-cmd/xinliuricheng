const date = require('./date');

const CN_NUM = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function cn2num(s) {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let sum = 0;
  let cur = 0;
  for (const ch of String(s)) {
    if (ch === '十') {
      cur = cur === 0 ? 1 : cur;
      sum += cur * 10;
      cur = 0;
    } else if (CN_NUM[ch] !== undefined) {
      cur = CN_NUM[ch];
    }
  }
  return sum + cur;
}

const SEGMENT_DEFAULT = {
  凌晨: '05:00',
  早上: '08:00',
  上午: '09:00',
  中午: '12:00',
  下午: '15:00',
  傍晚: '18:00',
  晚上: '20:00',
  夜里: '22:00'
};

function applySegment(segment, hour) {
  let h = hour;
  if (h === null) return null;
  if (segment && /下午|傍晚|晚上|夜里/.test(segment) && h < 12) {
    h += 12;
  } else if (segment === '中午' && h === 12) {
    h = 12;
  } else if (segment === '凌晨' && h === 12) {
    h = 0;
  }
  return h;
}

function nextWeekdayDate(dayIdx, includeToday) {
  const now = new Date();
  const todayIdx = now.getDay();
  let diff = dayIdx - todayIdx;
  if (diff <= 0 || (!includeToday && diff === 0)) diff += 7;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return date.fmtDate(d);
}

const WEEK_MAP = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6,
  日: 0, 天: 0
};

function parseNatural(input) {
  let text = String(input || '').trim();
  const today = date.todayStr();
  if (!text) {
    return { title: '', dateStr: today, time: '' };
  }
  let cleaned = text.replace(/[，。！？、；，,!?;]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  let dateStr = null;
  let time = '';
  const segRe = /凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|夜里|半夜|今晚|明早/g;
  let segMatch = cleaned.match(segRe);

  // 时间：先找 点/分/半，再找 12:30 形式
  let timePhrase = cleaned.match(/(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|夜里|半夜)?\s*([0-9一二两三四五六七八九十]+)\s*点\s*(半|([0-9一二两三四五六七八九十]+)\s*分?)?/);
  if (timePhrase && timePhrase[0]) {
    const segment = timePhrase[1] || '';
    const hourRaw = cn2num(timePhrase[2]);
    let minute = 0;
    if (timePhrase[3] === '半') {
      minute = 30;
    } else if (timePhrase[4]) {
      minute = cn2num(timePhrase[4]);
    }
    let hour = applySegment(segment, hourRaw);
    if (hour === null) hour = hourRaw;
    if (hour > 23) hour = hour % 24;
    if (minute > 59) minute = 0;
    time = date.pad2(hour) + ':' + date.pad2(minute);
    cleaned = cleaned.replace(timePhrase[0], ' ');
  } else {
    const colon = cleaned.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/);
    if (colon) {
      let hour = Math.min(parseInt(colon[1], 10), 23);
      const minute = Math.min(parseInt(colon[2], 10), 59);
      const before = cleaned.slice(0, colon.index);
      const seg = before.match(/(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|夜里)$/);
      if (seg) {
        const h = applySegment(seg[1], hour);
        if (h !== null) hour = h;
        cleaned = cleaned.replace(seg[0], ' ');
      }
      time = date.pad2(hour) + ':' + date.pad2(minute);
      cleaned = cleaned.replace(colon[0], ' ');
    }
  }

  // 时间词但没给具体钟点 -> 使用时段默认时间
  if (!time && segMatch && segMatch.length) {
    let key = segMatch[0];
    if (key === '今晚') key = '晚上';
    if (key === '明早') key = '早上';
    if (SEGMENT_DEFAULT[key]) {
      time = SEGMENT_DEFAULT[key];
      cleaned = cleaned.replace(segMatch[0], ' ');
    }
  }

  // 日期词
  const dateWords = [
    { re: /大后天/, n: 3 },
    { re: /后天/, n: 2 },
    { re: /明天|明日|明早|明晚/, n: 1 },
    { re: /今天|今日|今早|今晚/, n: 0 },
    { re: /昨天|昨日/, n: -1 }
  ];
  for (const item of dateWords) {
    if (item.re.test(cleaned)) {
      dateStr = date.addDaysStr(today, item.n);
      cleaned = cleaned.replace(item.re, ' ');
      break;
    }
  }

  if (!dateStr) {
    const weekRe = cleaned.match(/(下?周|星期|礼拜)([一二三四五六日天])/);
    if (weekRe) {
      dateStr = nextWeekdayDate(WEEK_MAP[weekRe[2]], true);
      cleaned = cleaned.replace(weekRe[0], ' ');
    }
  }

  if (!dateStr) {
    const md = cleaned.match(/(\d{1,2})月(\d{1,2})[日号]/);
    if (md) {
      const now = new Date();
      const d = new Date(now.getFullYear(), parseInt(md[1], 10) - 1, parseInt(md[2], 10));
      dateStr = date.fmtDate(d);
      cleaned = cleaned.replace(md[0], ' ');
    }
  }

  if (!dateStr) {
    const dd = cleaned.match(/(\d{1,2})[日号]/);
    if (dd) {
      const now = new Date();
      const target = parseInt(dd[1], 10);
      const d = new Date(now.getFullYear(), now.getMonth(), target);
      if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        d.setMonth(d.getMonth() + 1);
      }
      dateStr = date.fmtDate(d);
      cleaned = cleaned.replace(dd[0], ' ');
    }
  }

  if (!dateStr) dateStr = today;

  let title = cleaned.replace(/\s+/g, ' ').trim();
  title = title.replace(/^(我要|我想|记得|请记得|提醒我|帮我|麻烦|去|要|做|完成)/, '').trim();
  return { title, dateStr, time };
}

module.exports = { parseNatural };
