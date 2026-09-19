const store = require('../../utils/store');
const date = require('../../utils/date');
const safety = require('../../utils/contentSafety');
const calendarMarks = require('../../utils/calendarMarks');

const REPEAT_CN = { daily: '每天', workday: '工作日', weekend: '周末·节假日', custom: '自定义' };

function toMin(t) {
  const m = String(t || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

Page({
  data: {
    year: 0,
    month: 0,
    monthLabel: '',
    weeks: [],
    weekHead: ['日', '一', '二', '三', '四', '五', '六'],
    selected: '',
    selectedLabel: '',
    dayLabel: '',
    tasks: [],
    miniBlocks: [],
    dayMarks: [],
    dayHolidayBadge: '',
    showDay: false
  },

  onShow() {
    const now = new Date();
    this.initMonth(now.getFullYear(), now.getMonth() + 1, date.todayStr());
    this.markTab(1);
  },

  markTab(n) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: n });
    }
  },

  initMonth(y, m, selected) {
    this.setData({
      year: y,
      month: m,
      monthLabel: date.fmtMonth(y, m),
      selected: selected || date.todayStr()
    }, () => {
      this.renderMonth();
      this.closeDay();
    });
  },

  closeDay() {
    this.setData({ showDay: false });
  },

  renderMonth() {
    const y = this.data.year;
    const m = this.data.month;
    const prefix = y + '-' + date.pad2(m);
    const last = new Date(y, m, 0).getDate();
    const weeks = date.monthMatrix(y, m).map((week) => week.map((cell) => {
      if (!cell) return null;
      const list = store.tasksByDate(cell.dateStr);
      const preview = list.slice(0, 2);
      const marks = calendarMarks.marksFor(cell.dateStr);
      const badge = marks.find((m) => m.type === 'holiday');
      return Object.assign({}, cell, {
        holidayBadge: badge ? badge.text : '',
        marks: marks.filter((m) => m.type !== 'holiday'),
        events: preview.map((t) => ({
          color: store.catOf(t.category).color,
          icon: store.catOf(t.category).icon,
          text: t.title,
          done: store.isTaskDone(t.id, cell.dateStr)
        })),
        extra: Math.max(0, list.length - 2)
      });
    }));
    this.setData({ weeks });
  },

  loadSelected(sel) {
    const s = sel || this.data.selected;
    const raw = store.tasksByDate(s).map((t) => {
      const start = toMin(t.time);
      const end = toMin(t.endTime) !== null ? toMin(t.endTime) : (start !== null ? start + 60 : null);
      return Object.assign({}, t, {
        done: store.isTaskDone(t.id, s),
        color: store.catOf(t.category).color,
        categoryName: store.catOf(t.category).name,
        repeatIcon: t.repeat && t.repeat !== 'once' ? '↻' : '',
        timeText: start === null ? '全天' : (t.endTime ? t.time + '-' + t.endTime : t.time),
        _start: start === null ? 24 * 60 : start,
        _end: end === null ? 24 * 60 : end,
        conflict: false
      });
    });
    raw.forEach((a, i) => {
      raw.slice(i + 1).forEach((b) => {
        if (a._start < b._end && b._start < a._end) {
          a.conflict = true;
          b.conflict = true;
        }
      });
    });
    const tasks = raw.sort((a, b) => (a.done === b.done ? a._start - b._start : (a.done ? 1 : -1)));
    const miniBlocks = raw.filter((t) => t.time).map((t) => ({
      left: Math.max(0, Math.min(100, (t._start / 1440) * 100)),
      width: Math.max(0.8, Math.min(100, ((t._end - t._start) / 1440) * 100)),
      color: t.color
    }));
    const today = date.todayStr();
    const marks = calendarMarks.marksFor(s);
    const badge = marks.find((m) => m.type === 'holiday');
    let label = date.fmtShort(s);
    if (s === today) label = '今天 · ' + label;
    else if (s === date.addDaysStr(today, 1)) label = '明天 · ' + label;
    this.setData({
      tasks,
      miniBlocks,
      dayMarks: marks.filter((m) => m.type !== 'holiday'),
      dayHolidayBadge: badge ? badge.text : '',
      selectedLabel: label,
      dayLabel: label
    });
  },

  prevMonth() {
    let m = this.data.month - 1;
    let y = this.data.year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.initMonth(y, m, date.fmtDate(new Date(y, m - 1, 1)));
  },

  nextMonth() {
    let m = this.data.month + 1;
    let y = this.data.year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    this.initMonth(y, m, date.fmtDate(new Date(y, m - 1, 1)));
  },

  backToday() {
    const today = date.todayStr();
    const d = date.parseStr(today);
    this.initMonth(d.getFullYear(), d.getMonth() + 1, today);
  },

  pickDay(e) {
    const s = e.currentTarget.dataset.s;
    if (!s) return;
    const d = date.parseStr(s);
    this.setData({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      monthLabel: date.fmtMonth(d.getFullYear(), d.getMonth() + 1),
      selected: s
    });
    this.renderMonth();
    this.loadSelected(s);
    this.setData({ showDay: true });
  },

  toggleTask(e) {
    const id = e.currentTarget.dataset.id;
    const s = this.data.selected;
    const task = this.data.tasks.find((x) => x.id === id);
    if (!task) return;
    store.setTaskDone(id, s, !task.done);
    this.renderMonth();
    this.loadSelected();
  },

  onTaskTap(e) {
    const id = e.currentTarget.dataset.id;
    const task = this.data.tasks.find((x) => x.id === id);
    if (!task) return;
    wx.showActionSheet({
      itemList: [task.done ? '取消完成' : '标记完成', '重命名', '删除日程'],
      success: (res) => {
        const s = this.data.selected;
        if (res.tapIndex === 0) {
          store.setTaskDone(id, s, !task.done);
        } else if (res.tapIndex === 1) {
          this.renameTask(task);
        } else if (res.tapIndex === 2) {
          store.removeTask(id);
        }
        this.renderMonth();
        this.loadSelected();
      }
    });
  },

  renameTask(task) {
    wx.showModal({
      title: '重命名日程',
      editable: true,
      placeholderText: task.title,
      content: task.title,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          if (safety.checkText(res.content)) {
            wx.showModal({ title: '内容提示', content: '检测到可能不适合的内容，请修改后再保存。', showCancel: false });
            return;
          }
          store.patchTask(task.id, { title: res.content.trim() });
          this.renderMonth();
          this.loadSelected();
        }
      }
    });
  },

  addOnSelected() {
    wx.navigateTo({ url: '/pages/add/add?dateStr=' + this.data.selected });
  }
});
