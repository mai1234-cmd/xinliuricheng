const store = require('../../../utils/store');

const LINE_COLORS = ['#A8D5BA', '#F7C6D9', '#F6E2A0', '#B8D4F0', '#D9C2E9', '#F5C9A8'];
const NUM_COLORS = ['#3A7D5C', '#2F6F9F', '#8A5CF6', '#C2410C', '#BE185D', '#4D7C0F'];
const SIZES = [3, 4, 5];
const NS = [20, 25, 30, 35, 40, 45, 50];

function rand(min, max) { return min + Math.random() * (max - min); }

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function roundRectPolygon(w, h, r, seg) {
  const pts = [];
  const corners = [
    { cx: w - r, cy: r, a0: -Math.PI / 2, a1: 0 },
    { cx: w - r, cy: h - r, a0: 0, a1: Math.PI / 2 },
    { cx: r, cy: h - r, a0: Math.PI / 2, a1: Math.PI },
    { cx: r, cy: r, a0: Math.PI, a1: Math.PI * 1.5 }
  ];
  corners.forEach((c) => {
    for (let i = 0; i <= seg; i += 1) {
      const a = c.a0 + (c.a1 - c.a0) * (i / seg);
      pts.push({ x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r });
    }
  });
  return pts;
}

function clipHalfPlane(poly, a, b) {
  if (!poly.length) return [];
  const nx = b.x - a.x;
  const ny = b.y - a.y;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const f = (p) => nx * (p.x - mx) + ny * (p.y - my);
  const out = [];
  for (let i = 0; i < poly.length; i += 1) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const fc = f(cur);
    const fp = f(prev);
    if (fc <= 0) {
      if (fp > 0) {
        const t = fp / (fp - fc);
        out.push({ x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t });
      }
      out.push(cur);
    } else if (fp <= 0) {
      const t = fp / (fp - fc);
      out.push({ x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t });
    }
  }
  return out;
}

function polygonArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function polygonCentroid(poly) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (!a) {
    let sx = 0; let sy = 0;
    poly.forEach((p) => { sx += p.x; sy += p.y; });
    return { x: sx / poly.length, y: sy / poly.length };
  }
  a *= 0.5;
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if (((a.y > pt.y) !== (b.y > pt.y)) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function distToSegment(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}

function representativePoint(poly) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  poly.forEach((p) => {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  });
  let best = null;
  let bestD = -1;
  const steps = 18;
  for (let i = 0; i <= steps; i += 1) {
    for (let j = 0; j <= steps; j += 1) {
      const p = { x: minX + ((maxX - minX) * i) / steps, y: minY + ((maxY - minY) * j) / steps };
      if (!pointInPoly(p, poly)) continue;
      let d = Infinity;
      for (let k = 0; k < poly.length; k += 1) {
        d = Math.min(d, distToSegment(p, poly[k], poly[(k + 1) % poly.length]));
      }
      if (d > bestD) { bestD = d; best = p; }
    }
  }
  return best || polygonCentroid(poly);
}

function chaikin(poly, iter) {
  let pts = poly;
  for (let n = 0; n < iter; n += 1) {
    const out = [];
    for (let i = 0; i < pts.length; i += 1) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      out.push({ x: p.x * 0.75 + q.x * 0.25, y: p.y * 0.75 + q.y * 0.25 });
      out.push({ x: p.x * 0.25 + q.x * 0.75, y: p.y * 0.25 + q.y * 0.75 });
    }
    pts = out;
  }
  return pts;
}

function computeCells(seeds, boundary) {
  return seeds.map((s, i) => {
    let poly = boundary.slice();
    for (let j = 0; j < seeds.length; j += 1) {
      if (j === i) continue;
      poly = clipHalfPlane(poly, s, seeds[j]);
      if (poly.length < 3) return [];
    }
    return poly;
  });
}

function pointsFor(total, ms) {
  return Math.max(5, Math.min(120, Math.round((total * 12000) / ms)));
}

Page({
  data: {
    variants: [
      { id: 'regular', name: '正规舒尔特' },
      { id: 'color', name: '彩色数字' },
      { id: 'irregular', name: '不规则舒尔特' }
    ],
    variant: 'regular',
    sizes: SIZES,
    size: 3,
    ns: NS,
    n: 30,
    phase: 'setup',
    count: 3,
    grid: [],
    target: 1,
    doneCount: 0,
    wrong: 0,
    timeText: '0.0s',
    cellSize: '190rpx',
    bestText: '',
    points: 0,
    newBest: false,
    shake: false
  },

  onLoad(options) {
    if (options && ['regular', 'color', 'irregular'].indexOf(options.variant) >= 0) {
      this.setData({ variant: options.variant });
    }
    this.syncBest();
  },

  onUnload() {
    this.clearAll();
  },

  clearAll() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
    this.targetHint = false;
    if (this.timers) this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    this.cells = [];
  },

  syncBest() {
    const v = this.data.variant;
    const key = v === 'irregular' ? this.data.n : this.data.size;
    const b = store.bestFor('schulte', v, key);
    this.setData({ bestText: b ? (b.timeMs / 1000).toFixed(1) + 's' : '' });
  },

  pickVariant(e) {
    this.clearAll();
    this.setData({ variant: e.currentTarget.dataset.id, phase: 'setup' });
    this.syncBest();
  },

  pickSize(e) {
    this.clearAll();
    this.setData({ size: Number(e.currentTarget.dataset.n), phase: 'setup' });
    this.syncBest();
  },

  pickN(e) {
    this.clearAll();
    this.setData({ n: Number(e.currentTarget.dataset.n), phase: 'setup' });
    this.syncBest();
  },

  start() {
    this.clearAll();
    this.setData({ phase: 'count', count: 3 });
    const timers = [];
    const step = (left) => {
      if (left <= 0) { this.begin(); return; }
      this.setData({ count: left });
      timers.push(setTimeout(() => step(left - 1), 650));
    };
    step(3);
    this.timers = timers;
  },

  begin() {
    this.wrongCount = 0;
    this.doneCount = 0;
    this.setData({ phase: 'play', target: 1, timeText: '0.0s', doneCount: 0, wrong: 0, points: 0, newBest: false, shake: false });
    if (this.data.variant === 'irregular') {
      setTimeout(() => {
        this.initCanvas().then((ok) => {
          if (!ok) {
            wx.showToast({ title: '画布初始化失败', icon: 'none' });
            this.setData({ phase: 'setup' });
            return;
          }
          this.buildVoronoi();
          this.startTimer();
          this.resetHint();
        });
      }, 60);
      return;
    }
    const total = this.data.size * this.data.size;
    const nums = shuffle(Array.from({ length: total }, (_, i) => i + 1));
    const grid = nums.map((num) => ({ num, done: false, wrong: false, color: NUM_COLORS[num % NUM_COLORS.length] }));
    const size = this.data.size;
    const cellSize = (Math.floor(620 / size) - 16) + 'rpx';
    this.setData({ grid, cellSize });
    this.startTimer();
  },

  startTimer() {
    this.startTs = Date.now();
    this.timer = setInterval(() => {
      this.setData({ timeText: ((Date.now() - this.startTs) / 1000).toFixed(1) + 's' });
    }, 100);
  },

  resetHint() {
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
    this.targetHint = false;
    if (this.data.variant !== 'irregular' || this.data.phase !== 'play') return;
    this.hintTimer = setTimeout(() => {
      this.targetHint = true;
      this.drawBoard();
    }, 10000);
  },

  onCell(e) {
    if (this.data.phase !== 'play') return;
    const idx = e.currentTarget.dataset.idx;
    const num = Number(e.currentTarget.dataset.num);
    if (num !== this.data.target) {
      const grid = this.data.grid.slice();
      grid[idx] = Object.assign({}, grid[idx], { wrong: true });
      this.setData({ grid, wrong: this.data.wrong + 1 });
      const timers = this.timers || [];
      timers.push(setTimeout(() => {
        const next = this.data.grid.slice();
        next[idx] = Object.assign({}, next[idx], { wrong: false });
        this.setData({ grid: next });
      }, 300));
      this.timers = timers;
      return;
    }
    const grid = this.data.grid.slice();
    grid[idx] = Object.assign({}, grid[idx], { done: true });
    const target = this.data.target + 1;
    const total = this.data.size * this.data.size;
    if (target > total) {
      this.setData({ grid, target, doneCount: total });
      this.finish(total);
      return;
    }
    this.setData({ grid, target, doneCount: target - 1 });
  },

  initCanvas() {
    return new Promise((resolve) => {
      wx.createSelectorQuery().select('#board').fields({ node: true, size: true, rect: true }).exec((res) => {
        const info = res && res[0];
        if (!info || !info.node) { resolve(false); return; }
        const canvas = info.node;
        const ctx = canvas.getContext('2d');
        const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = (win.pixelRatio || 2);
        canvas.width = info.width * dpr;
        canvas.height = info.height * dpr;
        ctx.scale(dpr, dpr);
        this.canvas = canvas;
        this.ctx = ctx;
        this.cw = info.width;
        this.ch = info.height;
        this.rectLeft = info.left || 0;
        this.rectTop = info.top || 0;
        resolve(true);
      });
    });
  },

  buildVoronoi() {
    const w = this.cw;
    const h = this.ch;
    const n = this.data.n;
    const boundary = roundRectPolygon(w, h, Math.min(w, h) * 0.06, 6);
    this.boundary = boundary;
    const margin = Math.min(w, h) * 0.05;
    let seeds = Array.from({ length: n }, () => ({ x: rand(margin, w - margin), y: rand(margin, h - margin) }));
    for (let it = 0; it < 3; it += 1) {
      const polys = computeCells(seeds, boundary);
      const next = polys.map((p, i) => (p.length >= 3 ? polygonCentroid(p) : seeds[i]));
      while (next.length < n) next.push({ x: rand(margin, w - margin), y: rand(margin, h - margin) });
      seeds = next.slice(0, n);
    }
    let polys = computeCells(seeds, boundary);
    const minArea = (w * h) / n * 0.18;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const bad = polys.findIndex((p) => p.length < 3 || polygonArea(p) < minArea);
      if (bad < 0) break;
      seeds[bad] = { x: rand(margin, w - margin), y: rand(margin, h - margin) };
      polys = computeCells(seeds, boundary);
    }
    const valid = polys
      .filter((p) => p.length >= 3 && polygonArea(p) >= minArea * 0.6)
      .map((p) => chaikin(chaikin(p, 1), 1));
    const nums = shuffle(Array.from({ length: valid.length }, (_, i) => i + 1));
    this.cells = valid.map((poly, i) => ({
      num: nums[i],
      poly,
      rep: representativePoint(poly),
      color: LINE_COLORS[i % LINE_COLORS.length],
      done: false,
      wrong: false
    }));
    this.totalCells = this.cells.length;
    this.drawBoard();
  },

  drawBoard() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.cw, this.ch);
    ctx.fillStyle = '#FBF8F4';
    ctx.fillRect(0, 0, this.cw, this.ch);
    const target = this.data.target;
    this.cells.forEach((cell) => {
      ctx.beginPath();
      cell.poly.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = cell.done ? '#DFF3E6' : (cell.wrong ? '#FDE8E8' : '#FFFFFF');
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = cell.wrong ? '#E8453C' : cell.color;
      ctx.stroke();
      let color = '#2F3A45';
      if (cell.num === target && this.targetHint) color = '#E8453C';
      else if (cell.done) color = '#3A7D5C';
      else color = cell.num % 2 ? '#3A7D5C' : '#2F3A45';
      ctx.fillStyle = color;
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(cell.num), cell.rep.x, cell.rep.y);
    });
    if (this.boundary) {
      ctx.beginPath();
      this.boundary.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#E6E1DA';
      ctx.stroke();
    }
  },

  onCanvasTap(e) {
    if (this.data.phase !== 'play' || this.data.variant !== 'irregular') return;
    const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    let x;
    let y;
    if (t && t.x != null) {
      x = t.x;
      y = t.y;
    } else {
      const d = e.detail || {};
      x = (d.x != null ? d.x : 0) - this.rectLeft;
      y = (d.y != null ? d.y : 0) - this.rectTop;
    }
    const cell = this.cells.find((c) => pointInPoly({ x, y }, c.poly));
    if (!cell || cell.done) return;
    if (cell.num === this.data.target) {
      cell.done = true;
      const next = this.data.target + 1;
      if (next > this.totalCells) {
        this.setData({ target: next, doneCount: this.totalCells });
        this.drawBoard();
        this.finish(this.totalCells);
        return;
      }
      this.setData({ target: next, doneCount: next - 1 });
      this.resetHint();
      this.drawBoard();
      return;
    }
    cell.wrong = true;
    this.setData({ wrong: this.data.wrong + 1, shake: true });
    this.drawBoard();
    const timers = this.timers || [];
    timers.push(setTimeout(() => {
      cell.wrong = false;
      this.setData({ shake: false });
      this.drawBoard();
    }, 320));
    this.timers = timers;
  },

  finish(total) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = null;
    this.targetHint = false;
    const ms = Date.now() - this.startTs;
    const v = this.data.variant;
    const sizeKey = v === 'irregular' ? this.data.n : this.data.size;
    const prev = store.bestFor('schulte', v, sizeKey);
    const newBest = !prev || ms < prev.timeMs;
    const points = pointsFor(total, ms);
    store.addRecord({ type: 'schulte', mode: v, size: sizeKey, timeMs: ms, points });
    this.setData({
      phase: 'done',
      timeText: (ms / 1000).toFixed(1) + 's',
      points,
      newBest
    });
    this.syncBest();
  },

  again() {
    this.start();
  },

  toSetup() {
    this.clearAll();
    this.setData({ phase: 'setup' });
    this.syncBest();
  },

  backHome() {
    wx.navigateBack();
  }
});
