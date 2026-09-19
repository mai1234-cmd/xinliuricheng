const store = require('./utils/store');

App({
  onLaunch() {
    store.init();
  },
  globalData: {}
});
