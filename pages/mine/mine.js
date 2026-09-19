const store = require('../../utils/store');
const safety = require('../../utils/contentSafety');

const ICONS = ['⭐', '🏃', '📚', '💧', '🧘', '🎯', '🌿', '☕', '🍎', '🎸'];

Page({
  data: {
    nickname: '',
    avatar: '',
    avatarChar: '我',
    streak: 0,
    brain: 0,
    habits: []
  },

  onShow() {
    this.refresh();
    this.markTab(4);
  },

  markTab(n) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: n });
    }
  },

  refresh() {
    const user = store.getUser();
    this.setData({
      nickname: user.nickname,
      avatar: user.avatar || '',
      avatarChar: user.nickname ? user.nickname.slice(0, 1) : '我',
      streak: store.calcStreaks().current,
      brain: store.brainValue(),
      habits: store.getHabits()
    });
  },

  onNick(e) {
    const nickname = e.detail.value;
    if (safety.checkText(nickname)) {
      wx.showModal({ title: '内容提示', content: '检测到可能不适合的内容，请修改后再保存。', showCancel: false });
      this.setData({ nickname: store.getUser().nickname });
      return;
    }
    store.setUser({ nickname });
    this.setData({ nickname, avatarChar: nickname ? nickname.slice(0, 1) : '我' });
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles[0].tempFilePath;
        wx.getFileSystemManager().readFile({
          filePath: file,
          encoding: 'base64',
          success: (r) => {
            store.setUser({ avatar: 'data:image/png;base64,' + r.data });
            this.refresh();
            wx.showToast({ title: '头像已更新', icon: 'success' });
          },
          fail: () => {
            wx.showToast({ title: '读取图片失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        const msg = err.errMsg || '';
        if (msg.indexOf('cancel') >= 0) return;
        if (msg.indexOf('deny') >= 0 || msg.indexOf('auth') >= 0) {
          wx.showModal({
            title: '需要照片权限',
            content: '请在设置中允许访问照片（可选择“部分照片”或“所有照片”），授权后再选择头像。',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting();
            }
          });
        } else {
          wx.showToast({ title: '未选择照片', icon: 'none' });
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

  removeHabit(e) {
    const id = e.currentTarget.dataset.id;
    const habit = this.data.habits.find((h) => h.id === id);
    if (!habit) return;
    wx.showModal({
      title: '删除习惯',
      content: '删除「' + habit.name + '」？历史记录会一并清除。',
      confirmColor: '#E8590C',
      success: (res) => {
        if (res.confirm) {
          store.removeHabit(id);
          this.refresh();
        }
      }
    });
  },

  exportData() {
    const data = store.exportData();
    const file = wx.env.USER_DATA_PATH + '/mindflow-backup.json';
    wx.getFileSystemManager().writeFile({
      filePath: file,
      data,
      encoding: 'utf8',
      success: () => {
        wx.setClipboardData({
          data,
          success: () => {
            wx.showModal({
              title: '备份成功',
              content: '数据已写入本地文件并复制到剪贴板。文件路径：' + file,
              showCancel: false
            });
          }
        });
      },
      fail: () => {
        wx.setClipboardData({ data });
        wx.showToast({ title: '已复制到剪贴板', icon: 'none' });
      }
    });
  },

  goTrain() {
    wx.navigateTo({ url: '/pages/train/train' });
  },

  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' });
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },

  goPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  clearData() {
    wx.showModal({
      title: '清空数据',
      content: '将删除本机全部日程、习惯与训练记录，且不可恢复。',
      confirmColor: '#E8590C',
      success: (res) => {
        if (res.confirm) {
          store.clearAll();
          this.refresh();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});
