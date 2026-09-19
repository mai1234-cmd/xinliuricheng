const store = require('../../utils/store');
const safety = require('../../utils/contentSafety');
const config = require('../../utils/config');

Page({
  data: {
    text: '',
    contact: '',
    email: config.FEEDBACK_EMAIL,
    submitting: false
  },

  onText(e) {
    this.setData({ text: e.detail.value });
  },

  onContact(e) {
    this.setData({ contact: e.detail.value });
  },

  copyEmail() {
    wx.setClipboardData({
      data: this.data.email,
      success: () => wx.showToast({ title: '邮箱已复制', icon: 'success' })
    });
  },

  submit() {
    const text = (this.data.text || '').trim();
    if (!text) {
      wx.showToast({ title: '请先填写反馈内容', icon: 'none' });
      return;
    }
    if (safety.checkText(text, this.data.contact)) {
      wx.showModal({ title: '内容提示', content: '检测到可能不适合的内容，请修改后再提交。', showCancel: false });
      return;
    }
    this.setData({ submitting: true });
    store.addFeedback(text);
    const user = store.getUser();
    const message = [
      '【心流日程 · 用户反馈】',
      '昵称：' + (user.nickname || '未设置'),
      '联系方式：' + (this.data.contact || '未填写'),
      '时间：' + new Date().toLocaleString(),
      '内容：' + text
    ].join('\n');
    wx.setClipboardData({
      data: message,
      success: () => {
        this.setData({ submitting: false });
        wx.showModal({
          title: '反馈已复制',
          content: '请发送到邮箱 ' + this.data.email + '，在邮件正文粘贴即可。\n\n说明：当前为纯本地版本，无法在小程序内直接发信；接入云函数后可自动发送到后台邮箱。',
          showCancel: false,
          confirmText: '知道了'
        });
      },
      fail: () => {
        this.setData({ submitting: false });
        wx.showModal({
          title: '复制失败',
          content: '请手动记录反馈并发送到 ' + this.data.email,
          showCancel: false
        });
      }
    });
  }
});
