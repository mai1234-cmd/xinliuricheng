const store = require('../../utils/store');
const date = require('../../utils/date');
const icons = require('../../utils/icons');
const habitIcons = require('../../utils/habitIcons');
const safety = require('../../utils/contentSafety');
const mottos = require('../../utils/mottos');

const HABIT_ICONS = ['⭐', '🏃', '📚', '💧', '🧘', '🎯', '🌿', '☕', '🍎', '🎸'];
const FX = ['✿', '💛', '✨', '⭐', '💚', '🌱'];
const PASTEL = ['#E8EDFF', '#E0F6EA', '#FFF0E0', '#F1E9FF', '#E9F4FF'];
const REPEAT_CN = { daily: '每天', workday: '工作日', weekend: '周末·节假日', custom: '自定义' };

Page({
  data: {
    greet: '',
    greetName: '',
    dateLabel: '',
    motto: '',
    today: '',
    streak: 0,
    brain: 0,
    done: 0,
    total: 0,
    pctText: '0%',
    deg: 0,
    tasks: [],
    todos: [],
    habits: [],
    story: '',
    storySaved: ''
  },

  onShow() {
    this.refresh();
    this.markTab(0);
  },

  markTab(n) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: n });
    }
  },

  refresh() {
    const today = date.todayStr();
    const oldFx = (key) => {
      const map = {};
      (this.data[key] || []).forEach((x) => {
        if (x.fx) map[x.id] = x.fx;
      });
      return map;
    };
    const taskFx = Object.assign({}, oldFx('tasks'), oldFx('todos'));
    const habitFx = oldFx('habits');
    const all = store.tasksByDate(today).map((t) => Object.assign({}, t, {
      done: store.isTaskDone(t.id, today),
      color: store.catOf(t.category).color,
      light: store.catOf(t.category).light,
      categoryName: t.category ? store.catOf(t.category).name : '',
      repeatIcon: t.repeat && t.repeat !== 'once' ? '↻' : '',
      fx: taskFx[t.id] || ''
    }));
    const tasks = all.filter((t) => t.time);
    const todos = all.filter((t) => !t.time).map((t) => Object.assign({}, t, { timeText: '全天' }));
    tasks.forEach((t) => {
      t.timeText = t.endTime ? t.time + '-' + t.endTime : t.time;
      t.icon = icons.taskIcon(t.title, t.category);
    });
    todos.forEach((t) => {
      t.icon = icons.taskIcon(t.title, t.category);
    });
    const habits = store.habitsWithStatus(today).map((h, i) => Object.assign({}, h, {
      status: h.status === 'light' ? 'done' : h.status,
      fx: habitFx[h.id] || '',
      pastel: PASTEL[(h.color || i) % PASTEL.length]
    }));
    const doneTasks = tasks.filter((t) => t.done).length;
    const doneHabits = habits.filter((h) => h.status).length;
    const total = tasks.length + habits.length;
    const done = doneTasks + doneHabits;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const now = new Date();
    const story = store.getStory(today);
    const user = store.getUser();
    let mottoIdx = Math.floor(Math.random() * mottos.length);
    if (mottoIdx === this.lastMotto) mottoIdx = (mottoIdx + 1) % mottos.length;
    this.lastMotto = mottoIdx;
    this.setData({
      greet: date.hourGreet(now.getHours()),
      greetName: user.nickname || '朋友',
      dateLabel: date.todayTitle(today),
      motto: mottos[mottoIdx],
      today,
      streak: store.calcStreaks().current,
      brain: store.brainValue(),
      done,
      total,
      pctText: pct + '%',
      deg: Math.round(pct * 3.6),
      tasks,
      todos,
      habits,
      story,
      storySaved: story
    });
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/add/add' });
  },

  goAddTodo() {
    wx.navigateTo({ url: '/pages/add/add?type=todo' });
  },

  goTrain() {
    wx.navigateTo({ url: '/pages/train/train' });
  },

  toggleTodo(e) {
    const id = e.currentTarget.dataset.id;
    const t = store.toggleTask(id);
    if (t && t.done) this.celebrate('todos', id);
    this.refresh();
  },

  deleteTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find((x) => x.id === id);
    if (!todo) return;
    wx.showModal({
      title: '删除待办',
      content: '删除「' + todo.title + '」？',
      confirmColor: '#E8590C',
      success: (res) => {
        if (res.confirm) {
          store.removeTask(id);
          this.refresh();
        }
      }
    });
  },

  editTodo(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/add/add?id=' + id });
  },

  onStoryInput(e) {
    this.setData({ story: e.detail.value });
    if (this.storyTimer) clearTimeout(this.storyTimer);
    this.storyTimer = setTimeout(() => this.persistStory(), 600);
  },

  onStoryBlur() {
    this.persistStory();
  },

  persistStory() {
    if (this.storyTimer) clearTimeout(this.storyTimer);
    this.storyTimer = null;
    if (safety.checkText(this.data.story)) {
      wx.showModal({ title: '内容提示', content: '检测到可能不适合的内容，请修改后再保存。', showCancel: false });
      this.setData({ story: this.data.storySaved });
      return;
    }
    const saved = store.setStory(this.data.today, this.data.story);
    this.setData({ story: saved, storySaved: saved });
  },

  pickFx() {
    return FX[Math.floor(Math.random() * FX.length)];
  },

  celebrate(listKey, id) {
    const list = this.data[listKey];
    const idx = list.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const path = listKey + '[' + idx + '].fx';
    if (this.fxTimers && this.fxTimers[id]) clearTimeout(this.fxTimers[id]);
    this.fxTimers = this.fxTimers || {};
    this.setData({ [path]: this.pickFx() });
    this.fxTimers[id] = setTimeout(() => this.setData({ [path]: '' }), 950);
  },

  toggleTask(e) {
    const id = e.currentTarget.dataset.id;
    const t = store.toggleTask(id);
    if (t && t.done) this.celebrate('tasks', id);
    this.refresh();
  },

  onTaskTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/add/add?id=' + id });
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
          this.refresh();
        }
      }
    });
  },

  setHabit(e) {
    const id = e.currentTarget.dataset.id;
    const mode = e.currentTarget.dataset.mode;
    const current = store.checkinStatus(id, this.data.today);
    let next = '';
    if (mode === 'done') next = current === 'done' ? '' : 'done';
    if (mode === 'light') next = current === 'light' ? '' : 'light';
    store.setCheckin(id, this.data.today, next);
    if (next) this.celebrate('habits', id);
    this.refresh();
  },

  editHabit(e) {
    const id = e.currentTarget.dataset.id;
    const habit = store.getHabits().find((h) => h.id === id);
    if (!habit) return;
    wx.showActionSheet({
      itemList: ['重命名', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.renameHabit(habit);
        } else if (res.tapIndex === 1) {
          this.deleteHabit(habit);
        }
      }
    });
  },

  renameHabit(habit) {
    wx.showModal({
      title: '重命名习惯',
      editable: true,
      placeholderText: habit.name,
      content: '',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          if (safety.checkText(res.content)) {
            wx.showModal({ title: '内容提示', content: '检测到可能不适合的内容，请修改后再保存。', showCancel: false });
            return;
          }
          const name = res.content.trim();
          const list = store.getHabits().map((h) => (h.id === habit.id
            ? Object.assign({}, h, { name, icon: habitIcons.habitIcon(name) || h.icon })
            : h));
          wx.setStorageSync('mf_habits', list);
          this.refresh();
        }
      }
    });
  },

  deleteHabit(habit) {
    wx.showModal({
      title: '删除习惯',
      content: '删除「' + habit.name + '」？历史记录会一并清除。',
      confirmColor: '#E8590C',
      success: (res) => {
        if (res.confirm) {
          store.removeHabit(habit.id);
          this.refresh();
        }
      }
    });
  },

  addHabitPrompt() {
    wx.showModal({
      title: '新建习惯',
      editable: true,
      placeholderText: '习惯名称，如：冥想',
      content: '',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          if (safety.checkText(res.content)) {
            wx.showModal({ title: '内容提示', content: '检测到可能不适合的内容，请修改后再保存。', showCancel: false });
            return;
          }
          store.addHabit(res.content.trim());
          this.refresh();
        }
      }
    });
  },

  onPullDownRefresh() {
    this.refresh();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    const d = this.data;
    return {
      title: '今天完成 ' + d.done + '/' + d.total + '，连击 ' + d.streak + ' 天，一起保持心流',
      path: '/pages/index/index'
    };
  }
});
