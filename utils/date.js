function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function fmtDate(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function todayStr() {
  return fmtDate(new Date());
}

function parseStr(s) {
  const p = String(s).split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

function addDaysStr(s, n) {
  const d = parseStr(s);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

function fmtShort(s) {
  const p = String(s).split('-').map(Number);
  return p[1] + '月' + p[2] + '日';
}

function weekdayCn(s) {
  return '日一二三四五六'[parseStr(s).getDay()];
}

function todayTitle(s) {
  return '周' + weekdayCn(s) + ' ' + fmtShort(s);
}

function monthMatrix(y, m) {
  const firstDow = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const t = todayStr();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) {
    cells.push(null);
  }
  for (let d = 1; d <= days; d += 1) {
    const ds = fmtDate(new Date(y, m - 1, d));
    cells.push({ dateStr: ds, day: d, inMonth: true, isToday: ds === t });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function fmtMonth(y, m) {
  return y + '年' + m + '月';
}

function addMinutes(time, mins) {
  const m = String(time || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return '';
  const total = ((parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + mins) % 1440 + 1440) % 1440;
  return pad2(Math.floor(total / 60)) + ':' + pad2(total % 60);
}

function hourGreet(h) {
  if (h < 5) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

module.exports = {
  pad2,
  fmtDate,
  todayStr,
  parseStr,
  addDaysStr,
  fmtShort,
  weekdayCn,
  todayTitle,
  monthMatrix,
  fmtMonth,
  addMinutes,
  hourGreet
};
