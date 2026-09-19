const store = require('../../utils/store');
const date = require('../../utils/date');
const icons = require('../../utils/icons');

Page({
  data: {
    today: '',
    dateStr: '',
    label: '',
    tasks: [],
    todos: [],
    story: '',
    doneCount: 0,
    missedCount: 0,
    pendingCount: 0
  },

  onLoad() {
    const today = date.todayStr();
    this.setData({ today, dateStr: today });
    this.refresh(today);
  },

  refresh(s) {
    const target = s || this.data.dateStr || this.data.today;
    const today = this.data.today || date.todayStr();
    const all = store.tasksByDate(target).map((t) => {
      const cat = store.catOf(t.category);
      const done = store.isTaskDone(t.id, target);
      const status = done ? '已完成' : (target < today ? '未做' : '待完成');
      return Object.assign({}, t, {
        icon: icons.taskIcon(t.title, t.category),
        color: cat.color,
        light: cat.light,
        timeText: t.time ? (t.endTime ? t.time + '-' + t.endTime : t.time) : '全天',
        done,
        status,
        statusClass: done ? 'done' : (target < today ? 'miss' : 'todo')
      });
    });
    const tasks = all.filter((t) => t.time);
    const todos = all.filter((t) => !t.time);
    const doneCount = all.filter((t) => t.done).length;
    const missedCount = all.filter((t) => !t.done && target < today).length;
    const pendingCount = all.filter((t) => !t.done && target >= today).length;
    const parts = target.split('-');
    const label = parts[0] + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日 · 周' + date.weekdayCn(target);
    this.setData({
      dateStr: target,
      label,
      tasks,
      todos,
      story: store.getStory(target),
      doneCount,
      missedCount,
      pendingCount
    });
  },

  onDate(e) {
    this.refresh(e.detail.value);
  },

  prevDay() {
    this.refresh(date.addDaysStr(this.data.dateStr, -1));
  },

  nextDay() {
    const next = date.addDaysStr(this.data.dateStr, 1);
    if (next > this.data.today) {
      wx.showToast({ title: '未来日期暂无历史', icon: 'none' });
      return;
    }
    this.refresh(next);
  },

  goToday() {
    this.refresh(this.data.today);
  }
});
