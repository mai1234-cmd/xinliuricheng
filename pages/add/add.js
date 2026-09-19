const store = require('../../utils/store');
const date = require('../../utils/date');
const parser = require('../../utils/parser');
const safety = require('../../utils/contentSafety');

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

Page({
  data: {
    editId: '',
    title: '',
    dateStr: '',
    dateLabel: '',
    time: '09:30',
    endTime: '10:30',
    hasEnd: false,
    noTime: false,
    important: false,
    repeat: 'once',
    repeats: [
      { id: 'once', name: '仅一次' },
      { id: 'daily', name: '每天' },
      { id: 'workday', name: '工作日' },
      { id: 'weekend', name: '周末' },
      { id: 'holiday', name: '节假日' },
      { id: 'custom', name: '自定义' }
    ],
    weekdays: [],
    weekList: [],
    category: 'study',
    note: '',
    cats: store.CATS,
    today: '',
    tomorrow: '',
    aftertomorrow: ''
  },

  onLoad(options) {
    const today = date.todayStr();
    const patch = {
      today,
      tomorrow: date.addDaysStr(today, 1),
      aftertomorrow: date.addDaysStr(today, 2)
    };
    if (options && options.id) {
      const t = store.getTasks().find((x) => x.id === options.id);
      if (t) {
        patch.editId = t.id;
        patch.title = t.title;
        patch.dateStr = t.dateStr;
        patch.dateLabel = this.dateLabelOf(t.dateStr);
        patch.noTime = !t.time;
        patch.time = t.time || '09:30';
        patch.hasEnd = !!t.endTime;
        patch.endTime = t.endTime || date.addMinutes(t.time || '09:30', 60);
        patch.category = t.category;
        patch.note = t.note || '';
        patch.repeat = t.repeat || 'once';
        patch.weekdays = t.weekdays || [];
        patch.important = !!t.important;
      }
      wx.setNavigationBarTitle({ title: '修改行程' });
    } else {
      const asTodo = !!(options && options.type === 'todo');
      const target = (options && options.dateStr) ? options.dateStr : today;
      patch.noTime = asTodo;
      patch.repeat = 'once';
      patch.dateStr = target;
      patch.dateLabel = this.dateLabelOf(target);
    }
    this.setData(patch);
    this.syncWeeks();
  },

  syncWeeks() {
    this.setData({
      weekList: WEEK_CN.map((w, i) => ({ idx: i, name: w, on: this.data.weekdays.indexOf(i) >= 0 }))
    });
  },

  onTitle(e) {
    this.setData({ title: e.detail.value });
  },

  onNote(e) {
    this.setData({ note: e.detail.value });
  },

  parseTitle() {
    const text = this.data.title.trim();
    if (!text) {
      wx.showToast({ title: '先输入标题', icon: 'none' });
      return;
    }
    const r = parser.parseNatural(text);
    const category = this.guessCategory(r.title || text);
    this.setData({
      title: r.title,
      dateStr: r.dateStr,
      dateLabel: this.dateLabelOf(r.dateStr),
      time: r.time || '09:30',
      category
    });
  },

  guessCategory(text) {
    if (/会议|开会|汇报|工作|项目|面试/.test(text)) return 'work';
    if (/学习|读书|阅读|上课|作业|考试|复习|背/.test(text)) return 'study';
    if (/跑步|健身|运动|瑜伽|游泳|锻炼|打球/.test(text)) return 'sport';
    if (/买|做饭|家务|打扫|睡觉|回家|聚会|电影/.test(text)) return 'life';
    return 'other';
  },

  dateLabelOf(s) {
    const today = date.todayStr();
    if (s === today) return '今天 ' + date.fmtShort(s);
    if (s === date.addDaysStr(today, 1)) return '明天 ' + date.fmtShort(s);
    if (s === date.addDaysStr(today, 2)) return '后天 ' + date.fmtShort(s);
    return '周' + date.weekdayCn(s) + ' ' + date.fmtShort(s);
  },

  onDate(e) {
    const s = e.detail.value;
    this.setData({ dateStr: s, dateLabel: this.dateLabelOf(s) });
  },

  onTime(e) {
    const time = e.detail.value;
    const patch = { time };
    if (this.data.hasEnd) patch.endTime = date.addMinutes(time, 60);
    this.setData(patch);
  },

  onEndTime(e) {
    const end = e.detail.value;
    if (this.toMin(end) <= this.toMin(this.data.time)) {
      wx.showToast({ title: '结束需晚于开始，已自动调整', icon: 'none' });
      this.setData({ endTime: date.addMinutes(this.data.time, 60) });
      return;
    }
    this.setData({ endTime: end });
  },

  toggleEnd(e) {
    const hasEnd = e.detail.value;
    if (hasEnd) {
      this.setData({ hasEnd, endTime: date.addMinutes(this.data.time, 60) });
    } else {
      this.setData({ hasEnd });
    }
  },

  onNoTime(e) {
    const noTime = e.detail.value;
    const patch = { noTime };
    if (noTime) {
      patch.repeat = 'once';
      patch.weekdays = [];
    }
    this.setData(patch);
    this.syncWeeks();
  },

  onImportant(e) {
    this.setData({ important: e.detail.value });
  },

  toMin(t) {
    const p = String(t || '0:00').split(':').map(Number);
    return (p[0] || 0) * 60 + (p[1] || 0);
  },

  pickRepeat(e) {
    const repeat = e.currentTarget.dataset.id;
    const patch = { repeat };
    if (repeat === 'custom') {
      patch.weekdays = [date.parseStr(this.data.dateStr).getDay()];
    } else {
      patch.weekdays = [];
    }
    this.setData(patch);
    this.syncWeeks();
  },

  toggleWeek(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    let list = this.data.weekdays.slice();
    if (list.indexOf(idx) >= 0) {
      list = list.filter((i) => i !== idx);
    } else {
      list.push(idx);
      list.sort();
    }
    this.setData({ weekdays: list });
    this.syncWeeks();
  },

  pickCat(e) {
    this.setData({ category: e.currentTarget.dataset.id });
  },

  save() {
    const title = (this.data.title || '').trim();
    if (!title) {
      wx.showToast({ title: '标题不能为空', icon: 'none' });
      return;
    }
    if (this.data.repeat === 'custom' && !this.data.weekdays.length) {
      wx.showToast({ title: '请至少选择一天', icon: 'none' });
      return;
    }
    if (safety.checkText(title, this.data.note)) {
      wx.showModal({
        title: '内容提示',
        content: '检测到可能不适合的内容，请修改后再保存。',
        showCancel: false
      });
      return;
    }
    const willSave = () => {
      const payload = {
        title,
        dateStr: this.data.dateStr,
        time: this.data.noTime ? '' : this.data.time,
        endTime: !this.data.noTime && this.data.hasEnd ? this.data.endTime : '',
        category: this.data.category,
        note: this.data.note.trim(),
        repeat: this.data.noTime ? 'once' : this.data.repeat,
        weekdays: this.data.repeat === 'custom' && !this.data.noTime ? this.data.weekdays : [],
        important: this.data.important
      };
      if (this.data.editId) store.patchTask(this.data.editId, payload);
      else store.addTask(payload);
      wx.showToast({ title: this.data.editId ? '已保存' : '已添加', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 400);
    };
    if (!this.data.noTime && this.data.time) {
      const start = this.toMin(this.data.time);
      const end = this.data.hasEnd ? this.toMin(this.data.endTime) : start + 60;
      const clash = store.tasksByDate(this.data.dateStr).find((t) => {
        if (!t.time || t.id === this.data.editId) return false;
        const a = this.toMin(t.time);
        const b = t.endTime ? this.toMin(t.endTime) : a + 60;
        return start < b && a < end;
      });
      if (clash) {
        wx.showModal({
          title: '时间冲突',
          content: '与「' + clash.title + '」时间重叠，仍要添加吗？',
          confirmText: '仍然添加',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) willSave();
          }
        });
        return;
      }
    }
    willSave();
  },

  deleteTask() {
    if (!this.data.editId) return;
    wx.showModal({
      title: '删除行程',
      content: '删除「' + this.data.title + '」？',
      confirmColor: '#E8590C',
      success: (res) => {
        if (res.confirm) {
          store.removeTask(this.data.editId);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 400);
        }
      }
    });
  }
});
