const store = require('../../utils/store');
const date = require('../../utils/date');
const icons = require('../../utils/icons');
const safety = require('../../utils/contentSafety');

const START_HOUR = 7;
const END_HOUR = 22;
const ROW = 96;
const DUR = 60;

function estWidth(s) {
  let w = 0;
  for (const ch of String(s || '')) {
    w += /[0-9a-zA-Z:：.,，\s]/.test(ch) ? 11 : 22;
  }
  return w;
}

function parseHM(time) {
  const p = String(time || '').split(':').map(Number);
  if (p.length < 2 || isNaN(p[0])) return null;
  return { h: p[0], m: p[1] || 0 };
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const first = new Date(Date.UTC(y, 0, 1));
  return { year: y, week: Math.ceil((((t - first) / 86400000) + 1) / 7) };
}

Page({
  data: {
    weekNo: '',
    rangeLabel: '',
    hours: [],
    days: [],
    events: [],
    selected: '',
    today: '',
    detail: null,
    showNow: false,
    currentTop: 0,
    bodyHeight: 1440
  },

  onLoad() {
    this.today = date.todayStr();
    this.sel = this.today;
    this.markTab(2);
  },

  onShow() {
    this.markTab(2);
    this.today = date.todayStr();
    this.sel = this.today;
    this.setData({ today: this.today });
    this.showWeek(this.today);
  },

  markTab(n) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: n });
    }
  },

  showWeek(anchor) {
    if (!this.sel) this.sel = this.today;
    const d = date.parseStr(anchor);
    const dow = d.getDay();
    const monday = date.addDaysStr(anchor, -((dow + 6) % 7));
    const iso = isoWeek(d);
    const days = [];
    for (let i = 0; i < 7; i += 1) {
      const s = date.addDaysStr(monday, i);
      const p = s.split('-').map(Number);
      days.push({
        dateStr: s,
        weekCn: '日一二三四五六'[date.parseStr(s).getDay()],
        dayNum: p[2],
        isToday: s === this.today
      });
    }
    const sunday = date.addDaysStr(monday, 6);
    const hours = [];
    for (let h = START_HOUR; h <= END_HOUR - 1; h += 1) {
      hours.push(date.pad2(h) + ':00');
    }
    const events = [];
    for (let i = 0; i < days.length; i += 1) {
      const s = days[i].dateStr;
      const left = events.length ? events[events.length - 1] : [];
      const list = store.tasksByDate(s);
      const col = [];
      list.forEach((t) => {
        if (!t.time) return;
        const hm = parseHM(t.time);
        if (!hm) return;
        const startAbs = hm.h * 60 + hm.m;
        const topMin = startAbs - START_HOUR * 60;
        const top = Math.max(0, (topMin / 60) * ROW);
        const endP = parseHM(t.endTime);
        let durationMin = DUR;
        if (endP) {
          const span = endP.h * 60 + endP.m - startAbs;
          if (span >= 30) durationMin = span;
        }
        const endMin = Math.min(END_HOUR * 60, topMin + durationMin);
        const height = Math.max(44, ((endMin - topMin) / 60) * ROW - 6);
        const done = store.isTaskDone(t.id, s);
        let statusText = '';
        if (done) statusText = '已完成';
        else if (s === this.today) {
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          if (nowMin >= topMin && nowMin < endMin) statusText = '进行中';
        }
        col.push({
          id: t.id,
          dateStr: s,
          title: t.title,
          place: t.note,
          time: t.time,
          timeText: t.time + (t.endTime ? '-' + t.endTime : ''),
          color: store.catOf(t.category).color,
          light: store.catOf(t.category).light,
          startRel: topMin,
          endRel: endMin,
          longTitle: estWidth(t.title) > 60,
          longPlace: estWidth(t.note) > 56,
          top,
          height,
          statusText,
          done
        });
      });
      col.sort((a, b) => a.top - b.top);
      events.push(col);
    }
    const weekLabel = iso.week + ' 周';
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const inWeek = days.some((d) => d.dateStr === this.today);
    const totalH = hours.length * ROW;
    const currentTop = ((nowMin - START_HOUR * 60) / 60) * ROW;
    this.setData({
      weekNo: weekLabel,
      rangeLabel: date.fmtShort(monday) + ' - ' + date.fmtShort(sunday),
      hours,
      days,
      events,
      selected: this.sel,
      showNow: inWeek && currentTop >= 0 && currentTop <= totalH,
      currentTop,
      bodyHeight: totalH
    });
  },

  shiftWeek(e) {
    const dir = Number(e.currentTarget.dataset.d);
    const monday = date.addDaysStr(this.anchorMonday(), dir * 7);
    const sunday = date.addDaysStr(monday, 6);
    this.sel = (this.today >= monday && this.today <= sunday) ? this.today : monday;
    this.showWeek(monday);
  },

  anchorMonday() {
    const anchor = this.data.days && this.data.days[0] ? this.data.days[0].dateStr : this.today;
    return anchor;
  },

  backToday() {
    this.today = date.todayStr();
    this.sel = this.today;
    this.setData({ today: this.today });
    this.showWeek(this.today);
  },

  pickDay(e) {
    this.sel = e.currentTarget.dataset.s;
    this.setData({ selected: this.sel });
  },

  addOnSelected() {
    const target = this.data.selected || this.today;
    wx.navigateTo({ url: '/pages/add/add?dateStr=' + target });
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    const s = e.currentTarget.dataset.s || this.data.selected || this.today;
    const task = store.getTasks().find((x) => x.id === id);
    if (!task) return;
    const done = store.isTaskDone(id, s);
    this.setData({
      detail: {
        id,
        dateStr: s,
        title: task.title,
        place: task.note,
        time: task.time || '全天',
        color: store.catOf(task.category).color,
        timeText: task.time ? (task.time + (task.endTime ? '-' + task.endTime : '')) : '全天',
        repeatIcon: task.repeat && task.repeat !== 'once' ? '↻' : '',
        done,
        statusText: done ? '已完成' : (s === this.today ? '待完成' : '')
      }
    });
  },

  closeDetail() {
    this.setData({ detail: null });
  },

  editDetail() {
    const d = this.data.detail;
    if (!d) return;
    wx.showModal({
      title: '修正名称',
      editable: true,
      placeholderText: d.title,
      content: d.title,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          if (safety.checkText(res.content)) {
            wx.showModal({ title: '内容提示', content: '检测到可能不适合的内容，请修改后再保存。', showCancel: false });
            return;
          }
          store.patchTask(d.id, { title: res.content.trim() });
          this.closeDetail();
          this.showWeek(this.anchorMonday());
        }
      }
    });
  },

  toggleDetail() {
    const d = this.data.detail;
    if (!d) return;
    store.setTaskDone(d.id, d.dateStr, !d.done);
    this.closeDetail();
    this.showWeek(this.anchorMonday());
  },

  deleteDetail() {
    const d = this.data.detail;
    if (!d) return;
    wx.showModal({
      title: '删除行程',
      content: '删除「' + d.title + '」？',
      confirmColor: '#E8590C',
      success: (res) => {
        if (res.confirm) {
          store.removeTask(d.id);
          this.closeDetail();
          this.showWeek(this.anchorMonday());
        }
      }
    });
  }
});
