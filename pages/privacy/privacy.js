const config = require('../../utils/config');

Page({
  data: {
    email: config.FEEDBACK_EMAIL
  },

  copyEmail() {
    wx.setClipboardData({
      data: this.data.email,
      success: () => wx.showToast({ title: '邮箱已复制', icon: 'success' })
    });
  }
});
