const store = require('../../../utils/store');

const WINDOW = 6;
const ANIM = 200;
const TOTALS = [20, 30, 40, 50];
const PALE = ['#F6B6C8', '#F9D6A8', '#F7E7A8', '#B8E3C8', '#AEDCF0', '#C9C2F0', '#D9C2E9', '#F5C9A8', '#A8D5BA', '#B8D4F0'];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

const SLOT_COLS = [15, 38, 62, 85];
const SLOT_ROWS = [18, 50, 82];
const SLOT_POINTS = [];
SLOT_ROWS.forEach((y) => SLOT_COLS.forEach((x) => SLOT_POINTS.push({ x, y })));
const SLOT_INDEXES = SLOT_POINTS.map((p, i) => i);

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function pointsFor(total, ms) {
  return Math.max(5, Math.min(120, Math.round((total * 15000) / ms)));
}

Page({
  data: {
    phase: 'setup',
    count: 3,
    timeText: '0.0s',
    totals: TOTALS,
    total: 50,
    target: 50,
    doneCount: 0,
    wrong: 0,
    cells: [],
    points: 0,
    newBest: false,
    bestText: ''
  },

  onLoad() {
    this.syncBest();
  },

  onUnload() {
    this.clearAll();
  },

  clearAll() {
    if (this.timer) clearInterval(this.timer);
    if (this.cdTimers) this.cdTimers.forEach((t) => clearTimeout(t));
    if (this.animTimer) clearTimeout(this.animTimer);
    if (this.wrongTimers) this.wrongTimers.forEach((t) => clearTimeout(t));
    this.timer = null;
    this.cdTimers = [];
    this.animTimer = null;
    this.wrongTimers = [];
    this.animating = false;
  },

  syncBest() {
    const b = store.bestFor('scatter', null, this.data.total);
    this.setData({
      bestText: b ? this.data.total + ' 个 · 最佳 ' + (b.timeMs / 1000).toFixed(1) + 's' : '还没有成绩'
    });
  },

  pickTotal(e) {
    this.clearAll();
    const total = Number(e.currentTarget.dataset.n);
    this.setData({ total, target: total, phase: 'setup' });
    this.syncBest();
  },

  start() {
    this.clearAll();
    this.setData({ phase: 'count', count: 3 });
    const timers = [];
    const step = (left) => {
      if (left <= 0) {
        this.begin();
        return;
      }
      this.setData({ count: left });
      timers.push(setTimeout(() => step(left - 1), 650));
    };
    step(3);
    this.cdTimers = timers;
  },

  begin() {
    this.target = this.data.total;
    this.animating = false;
    this.startTs = Date.now();
    this.setData({
      phase: 'play',
      target: this.data.total,
      timeText: '0.0s',
      doneCount: 0,
      wrong: 0,
      cells: this.makeInitial()
    });
    this.timer = setInterval(() => {
      this.setData({ timeText: ((Date.now() - this.startTs) / 1000).toFixed(1) + 's' });
    }, 100);
  },

  makeInitial() {
    const nums = [];
    for (let i = 0; i < WINDOW; i += 1) nums.push(this.data.total - i);
    const slots = shuffle(SLOT_INDEXES).slice(0, WINDOW);
    const colors = shuffle(PALE).slice(0, WINDOW);
    return nums.map((num, i) => {
      const p = SLOT_POINTS[slots[i]];
      return { num, slot: slots[i], x: p.x, y: p.y, color: colors[i], state: '', fresh: false };
    });
  },

  nextCells(prev, newNum) {
    const used = {};
    const usedColors = {};
    const remaining = prev
      .filter((c) => c.state !== 'gone')
      .map((c) => {
        used[c.slot] = true;
        usedColors[c.color] = true;
        return Object.assign({}, c, { state: '', fresh: false });
      });
    if (!newNum) return remaining;
    const free = SLOT_INDEXES.filter((i) => !used[i]);
    const slot = free[Math.floor(Math.random() * free.length)];
    const p = SLOT_POINTS[slot];
    const color = PALE.find((c) => !usedColors[c]) || PALE[Math.floor(Math.random() * PALE.length)];
    return remaining.concat([{ num: newNum, slot, x: p.x, y: p.y, color, state: '', fresh: true }]);
  },

  onCell(e) {
    if (this.data.phase !== 'play' || this.animating) return;
    const idx = e.currentTarget.dataset.idx;
    const num = Number(e.currentTarget.dataset.num);
    if (num !== this.target) {
      const cells = this.data.cells.slice();
      cells[idx] = Object.assign({}, cells[idx], { state: 'wrong' });
      this.setData({ cells, wrong: this.data.wrong + 1 });
      const timers = this.wrongTimers || [];
      timers.push(setTimeout(() => {
        const next = this.data.cells.slice();
        next[idx] = Object.assign({}, next[idx], { state: '' });
        this.setData({ cells: next });
      }, 220));
      this.wrongTimers = timers;
      return;
    }
    this.animating = true;
    const cells = this.data.cells.map((c, i) => Object.assign({}, c, {
      state: i === idx ? 'gone' : '',
      fresh: false
    }));
    this.setData({ cells });
    this.animTimer = setTimeout(() => {
      if (this.target === 1) {
        this.finish();
        return;
      }
      this.target -= 1;
      const newNum = this.target - (WINDOW - 1);
      const nextCells = this.nextCells(this.data.cells, newNum >= 1 ? newNum : null);
      this.animating = false;
      this.setData({
        target: this.target,
        cells: nextCells,
        doneCount: this.data.doneCount + 1
      });
    }, ANIM);
  },

  finish() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.animating = false;
    const ms = Date.now() - this.startTs;
    const prev = store.bestFor('scatter', null, null);
    const newBest = !prev || ms < prev.timeMs;
    const points = pointsFor(this.data.total, ms);
    store.addRecord({ type: 'scatter', size: this.data.total, timeMs: ms, points });
    this.setData({
      phase: 'done',
      timeText: (ms / 1000).toFixed(1) + 's',
      doneCount: this.data.total,
      points,
      newBest
    });
    this.syncBest();
  },

  again() {
    this.start();
  },

  backHome() {
    wx.navigateBack();
  }
});
