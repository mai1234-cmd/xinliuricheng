const store = require('../../utils/store');
const date = require('../../utils/date');

function modeBestText(mode) {
  const b = store.bestFor('schulte', mode, null);
  if (!b) return '—';
  const sizeCn = { 3: '3×3', 4: '4×4', 5: '5×5' }[b.size] || '';
  return ((sizeCn ? sizeCn + ' ' : '') + (b.timeMs / 1000).toFixed(1) + 's').trim();
}

Page({
  data: {
    current: 0,
    longest: 0,
    todayDone: 0,
    todayTotal: 0,
    weekBars: [],
    heatWeeks: [],
    habitRows: [],
    recCount: 0,
    games: [],
    scatterText: '—'
  },

  onShow() {
    this.refresh();
    this.markTab(3);
  },

  markTab(n) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: n });
    }
  },

  refresh() {
    const today = date.todayStr();
    const todayTasks = store.tasksByDate(today).map((t) => Object.assign({}, t, { done: store.isTaskDone(t.id, today) }));
    const todayHabits = store.habitsWithStatus(today);
    const todayDone = todayTasks.filter((t) => t.done).length + todayHabits.filter((h) => h.status).length;
    const todayTotal = todayTasks.length + todayHabits.length;

    const weekBars = [];
    const now = new Date();
    const monday = date.addDaysStr(today, -((now.getDay() + 6) % 7));
    for (let i = 0; i < 7; i += 1) {
      const s = date.addDaysStr(monday, i);
      const ts = store.tasksByDate(s).map((t) => Object.assign({}, t, { done: store.isTaskDone(t.id, s) }));
      const hs = store.habitsWithStatus(s);
      const done = ts.filter((t) => t.done).length + hs.filter((h) => h.status).length;
      const total = ts.length + hs.length;
      weekBars.push({
        label: '日一二三四五六'[date.parseStr(s).getDay()],
        done,
        total,
        pct: total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100)),
        isToday: s === today
      });
    }

    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const heatWeeks = date.monthMatrix(y, m).map((week) => week.map((cell) => {
      if (!cell) return null;
      const count = store.monthDoneCount(cell.dateStr);
      let level = 0;
      if (count >= 3) level = 3;
      else if (count === 2) level = 2;
      else if (count === 1) level = 1;
      return { day: cell.day, level, isToday: cell.isToday };
    }));

    const monthPrefix = y + '-' + date.pad2(m);
    const habitRows = store.getHabits().map((h) => Object.assign({}, h, {
      count: store.habitDoneCountThisMonth(h.id, monthPrefix)
    })).sort((a, b) => b.count - a.count);

    const scatter = store.bestFor('scatter', null, null);
    const streaks = store.calcStreaks();
    this.setData({
      current: streaks.current,
      longest: streaks.longest,
      todayDone,
      todayTotal,
      weekBars,
      heatWeeks,
      habitRows,
      recCount: store.getRecords().length,
      games: [
        { name: '正规舒尔特', text: modeBestText('regular') },
        { name: '彩色数字舒尔特', text: modeBestText('color') },
        { name: '不规则舒尔特', text: modeBestText('irregular') }
      ],
      scatterText: scatter ? (scatter.timeMs / 1000).toFixed(1) + 's' : '—'
    });
  }
});
