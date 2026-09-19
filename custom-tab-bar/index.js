Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', icon: '🏡', text: '今日' },
      { pagePath: '/pages/schedule/schedule', icon: '📅', text: '日程' },
      { pagePath: '/pages/week/week', icon: '🗓️', text: '周视图' },
      { pagePath: '/pages/focus/focus', icon: '⏱️', text: '专注' },
      { pagePath: '/pages/mine/mine', icon: '👤', text: '我的' }
    ]
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];
      wx.switchTab({ url: item.pagePath });
    }
  }
});
