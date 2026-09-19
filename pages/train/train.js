const store = require('../../utils/store');

function schulteBestText() {
  const list = store.getRecords().filter((r) => r.type === 'schulte' && r.timeMs > 0);
  if (!list.length) return '还没有成绩';
  const b = list.reduce((a, c) => (a.timeMs < c.timeMs ? a : c));
  const name = { regular: '正规', color: '彩色', irregular: '不规则' }[b.mode] || '舒尔特';
  return name + ' 最佳 ' + (b.timeMs / 1000).toFixed(1) + 's';
}

function scatterBestText() {
  const b = store.bestFor('scatter', null, null);
  return b ? '最佳 ' + (b.timeMs / 1000).toFixed(1) + 's' : '还没有成绩';
}

Page({
  data: {
    brain: 0,
    count: 0,
    games: [
      { id: 'schulte', icon: '🔢', tint: '#E8EDFF', name: '舒尔特表', desc: '正规 / 彩色 / 不规则三种玩法' },
      { id: 'scatter', icon: '🎯', tint: '#F1E9FF', name: '数字降序速点', desc: '散落数字从大到小点完' }
    ]
  },

  onShow() {
    this.refresh();
    this.markTab(2);
  },

  markTab(n) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: n });
    }
  },

  refresh() {
    const bestMap = {
      schulte: schulteBestText(),
      scatter: scatterBestText()
    };
    const games = this.data.games.map((g) => Object.assign({}, g, {
      best: bestMap[g.id]
    }));
    this.setData({
      brain: store.brainValue(),
      count: store.getRecords().length,
      games
    });
  },

  start(e) {
    const id = e.currentTarget.dataset.id;
    if (id === 'schulte') {
      wx.navigateTo({ url: '/packages/train/schulte/schulte' });
      return;
    }
    if (id === 'scatter') {
      wx.navigateTo({ url: '/packages/train/apm/apm' });
      return;
    }
  }
});
