const date = require('../../utils/date');

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function fmtSec(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (h > 0 ? h + ':' + pad(m) : pad(m)) + ':' + pad(s);
}

Page({
  data: {
    dateLabel: '',
    modes: [
      { id: 'timer', name: '正计时' },
      { id: 'pomodoro', name: '番茄钟' },
      { id: 'countdown', name: '倒计时' }
    ],
    mode: 'pomodoro',
    chars: [
      { id: 'tomato', name: '番茄钟', emoji: '🍅', color: '#FF5F4A', soft: '#FFE7E2' },
      { id: 'cat', name: '小猫钟', emoji: '🐱', color: '#F2A33C', soft: '#FFF0DB' },
      { id: 'bear', name: '小熊钟', emoji: '🐻', color: '#8A6A4F', soft: '#F0E5DA' },
      { id: 'frog', name: '青蛙钟', emoji: '🐸', color: '#2FBF71', soft: '#DFF5E9' }
    ],
    char: 'tomato',
    charName: '番茄钟',
    charEmoji: '🍅',
    themeMain: '#FF5F4A',
    themeSoft: '#FFE7E2',
    minutes: 25,
    presets: [5, 15, 25, 45, 60],
    state: 'idle',
    display: '25:00',
    deg: 360,
    statusText: '准备开始',
    features: [
      { id: 'plan', icon: '📋', name: '关联计划' },
      { id: 'music', icon: '🎵', name: '音乐' },
      { id: 'noise', icon: '🌧️', name: '白噪音' }
    ]
  },

  onLoad() {
    this.markTab(3);
  },

  onShow() {
    this.markTab(3);
    this.setData({ dateLabel: date.todayTitle(date.todayStr()) });
  },

  onUnload() {
    this.clear();
  },

  markTab(n) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: n });
    }
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.id;
    this.clear();
    const patch = { mode };
    if (mode === 'pomodoro') {
      patch.char = 'tomato';
      patch.charName = '番茄钟';
      patch.charEmoji = '🍅';
      patch.themeMain = '#FF5F4A';
      patch.themeSoft = '#FFE7E2';
      patch.minutes = 25;
    } else if (mode === 'countdown') {
      patch.charName = '倒计时';
      patch.charEmoji = '⏳';
      patch.themeMain = '#8B5CF6';
      patch.themeSoft = '#F0E8FF';
      patch.minutes = 10;
    } else {
      patch.charName = '正计时';
      patch.charEmoji = '⏱️';
      patch.themeMain = '#5B7CFB';
      patch.themeSoft = '#E7EDFF';
      patch.minutes = 25;
    }
    this.apply(patch);
  },

  pickChar(e) {
    const id = e.currentTarget.dataset.id;
    const c = this.data.chars.find((x) => x.id === id);
    if (!c) return;
    this.clear();
    this.apply({ char: c.id, charName: c.name, charEmoji: c.emoji, themeMain: c.color, themeSoft: c.soft, minutes: 25 });
  },

  pickPreset(e) {
    this.clear();
    this.apply({ minutes: Number(e.currentTarget.dataset.n) });
  },

  step(e) {
    const delta = Number(e.currentTarget.dataset.d);
    const minutes = Math.max(1, Math.min(180, this.data.minutes + delta));
    this.clear();
    this.apply({ minutes });
  },

  apply(patch) {
    this.setData(patch);
    this.syncFromMinutes();
  },

  syncFromMinutes() {
    const total = this.data.minutes * 60;
    const display = this.data.mode === 'timer'
      ? '00:00'
      : fmtSec(total);
    this.setStateIdle(display);
  },

  setStateIdle(display) {
    this.baseLeft = this.data.minutes * 60 * 1000;
    this.setData({
      state: 'idle',
      display,
      deg: this.data.mode === 'timer' ? 0 : 360,
      statusText: '准备开始'
    });
  },

  clear() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },

  mainAction() {
    const st = this.data.state;
    if (st === 'idle') {
      this.startRun();
    } else if (st === 'run') {
      this.pauseRun();
    } else if (st === 'pause') {
      this.resumeRun();
    } else if (st === 'done') {
      this.resetAll();
    }
  },

  startRun() {
    const mode = this.data.mode;
    if (mode === 'timer') {
      this.accMs = 0;
      this.startStamp = Date.now();
      this.baseLeft = 0;
    } else {
      this.baseLeft = this.baseLeft || this.data.minutes * 60 * 1000;
      this.startStamp = Date.now();
    }
    this.setData({ state: 'run', statusText: '专注中' });
    this.tick();
    this.timer = setInterval(() => this.tick(), 200);
  },

  tick() {
    const mode = this.data.mode;
    if (mode === 'timer') {
      const sec = Math.floor((Date.now() - this.startStamp + (this.accMs || 0)) / 1000);
      this.setData({
        display: fmtSec(sec),
        deg: Math.round(((sec % 60) / 60) * 360)
      });
      return;
    }
    const left = this.baseLeft - (Date.now() - this.startStamp);
    if (left <= 0) {
      this.finish();
      return;
    }
    const totalMs = this.data.minutes * 60 * 1000;
    this.setData({
      display: fmtSec(Math.ceil(left / 1000)),
      deg: Math.round((left / totalMs) * 360)
    });
  },

  pauseRun() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const mode = this.data.mode;
    if (mode === 'timer') {
      this.accMs = (this.accMs || 0) + (Date.now() - this.startStamp);
    } else {
      this.baseLeft -= Date.now() - this.startStamp;
    }
    this.setData({ state: 'pause', statusText: '已暂停' });
  },

  resumeRun() {
    this.startStamp = Date.now();
    this.setData({ state: 'run', statusText: '专注中' });
    this.timer = setInterval(() => this.tick(), 200);
  },

  stop() {
    this.clear();
    this.syncFromMinutes();
  },

  finish() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.setData({
      state: 'done',
      display: this.data.mode === 'timer' ? this.data.display : '00:00',
      deg: 360,
      statusText: '完成啦'
    });
  },

  resetAll() {
    this.clear();
    this.syncFromMinutes();
  },

  onFeature(e) {
    const id = e.currentTarget.dataset.id;
    if (id === 'plan') {
      wx.switchTab({ url: '/pages/schedule/schedule' });
      return;
    }
    wx.showToast({ title: id === 'music' ? '音乐播放开发中' : '白噪音开发中', icon: 'none' });
  }
});
