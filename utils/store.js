const date = require('./date');
const { CATEGORY_PALETTE, catById } = require('./palette');
const { habitIcon } = require('./habitIcons');

const K_TASKS = 'mf_tasks';
const K_HABITS = 'mf_habits';
const K_DAYS = 'mf_days';
const K_RECORDS = 'mf_records';
const K_USER = 'mf_user';
const K_FEEDBACK = 'mf_feedbacks';
const CK_PREFIX = 'mf_ck_';
const TD_PREFIX = 'mf_td_';
const ST_PREFIX = 'mf_story_';
// 法定节假日日期表（格式 YYYY-MM-DD），每年按国务院安排维护；缺省时节假日先按周六/周日休息日处理。
const HOLIDAYS = [];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const REPEAT_WHITELIST = ['once', 'daily', 'workday', 'holiday', 'weekend', 'custom'];

function cleanText(v, max) {
  const s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

function guardTime(v) {
  if (!v) return '';
  const s = String(v);
  return TIME_RE.test(s) ? s : '';
}

const CATS = CATEGORY_PALETTE;

const DEFAULT_HABITS = [
  { id: 'h1', name: '早起', icon: '🌅', color: 0 },
  { id: 'h2', name: '喝水', icon: '💧', color: 1 },
  { id: 'h3', name: '阅读', icon: '📖', color: 2 }
];

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function get(key, def) {
  const v = wx.getStorageSync(key);
  return (v === '' || v === null || v === undefined) ? def : v;
}

function set(key, val) {
  wx.setStorageSync(key, val);
}

function init() {
  if (!wx.getStorageSync(K_HABITS)) set(K_HABITS, DEFAULT_HABITS);
  else {
    const list = get(K_HABITS, []);
    let changed = false;
    list.forEach((h) => {
      const icon = habitIcon(h.name);
      if (icon && icon !== h.icon) {
        h.icon = icon;
        changed = true;
      }
    });
    if (changed) set(K_HABITS, list);
  }
  if (!wx.getStorageSync(K_TASKS)) set(K_TASKS, []);
  if (!wx.getStorageSync(K_DAYS)) set(K_DAYS, []);
  if (!wx.getStorageSync(K_RECORDS)) set(K_RECORDS, []);
}

function catOf(id) {
  return catById(id);
}

function getTasks() {
  return get(K_TASKS, []);
}

function saveTasks(list) {
  set(K_TASKS, list);
}

function addTask(data) {
  const list = getTasks();
  const input = data || {};
  const title = cleanText(input.title, 60);
  if (!title) return null;
  const categoryIds = CATS.map((c) => c.id);
  const category = categoryIds.indexOf(input.category) >= 0 ? input.category : '';
  const task = Object.assign({
    id: uid('t'),
    title: '',
    dateStr: date.todayStr(),
    time: '',
    endTime: '',
    category: 'study',
    note: '',
    repeat: 'once',
    weekdays: [],
    done: false,
    createdAt: Date.now()
  }, {
    title,
    dateStr: DATE_RE.test(String(input.dateStr || '')) ? input.dateStr : date.todayStr(),
    time: guardTime(input.time),
    endTime: guardTime(input.endTime),
    category,
    note: cleanText(input.note, 100),
    repeat: REPEAT_WHITELIST.indexOf(input.repeat) >= 0 ? input.repeat : 'once',
    weekdays: Array.isArray(input.weekdays)
      ? input.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).slice(0, 7)
      : [],
    important: !!input.important
  });
  if (!task.id) task.id = uid('t');
  if (!task.createdAt) task.createdAt = Date.now();
  if (!task.time) {
    task.repeat = 'once';
    task.weekdays = [];
  }
  list.push(task);
  saveTasks(list);
  return task;
}

function patchTask(id, patch) {
  const list = getTasks();
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const p = Object.assign({}, patch);
  if (p.title !== undefined) p.title = cleanText(p.title, 60);
  if (p.note !== undefined) p.note = cleanText(p.note, 100);
  if (p.time !== undefined) p.time = guardTime(p.time);
  if (p.endTime !== undefined) p.endTime = guardTime(p.endTime);
  list[idx] = Object.assign({}, list[idx], p);
  if (!list[idx].time) {
    list[idx].repeat = 'once';
    list[idx].weekdays = [];
  }
  saveTasks(list);
  return list[idx];
}

function removeTask(id) {
  saveTasks(getTasks().filter((t) => t.id !== id));
  const info = wx.getStorageInfoSync();
  (info.keys || []).forEach((k) => {
    if (k.indexOf(TD_PREFIX + id + '_') === 0) wx.removeStorageSync(k);
  });
}

function weekdayOf(dateStr) {
  return date.parseStr(dateStr).getDay();
}

function taskApplies(task, dateStr) {
  if (!task.time) {
    if (dateStr < task.dateStr) return false;
    const completed = task.doneDate || doneDateOf(task.id) || (task.done ? task.dateStr : '');
    if (completed && dateStr > completed) return false;
    return true;
  }
  if (task.repeat === 'once' || !task.repeat) return task.dateStr === dateStr;
  if (dateStr < task.dateStr) return false;
  const wk = weekdayOf(dateStr);
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'workday') return wk >= 1 && wk <= 5;
  if (task.repeat === 'weekend') return wk === 0 || wk === 6;
  if (task.repeat === 'holiday') {
    if (HOLIDAYS.indexOf(dateStr) >= 0) return true;
    return wk === 0 || wk === 6;
  }
  if (task.repeat === 'custom') {
    const days = task.weekdays || [];
    return days.indexOf(wk) >= 0;
  }
  return task.dateStr === dateStr;
}

function tasksByDate(dateStr) {
  return getTasks()
    .filter((t) => taskApplies(t, dateStr))
    .sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time < b.time ? -1 : 1;
    });
}

function doneKey(taskId, dateStr) {
  return TD_PREFIX + taskId + '_' + dateStr;
}

function doneDateOf(taskId) {
  const task = getTasks().find((t) => t.id === taskId);
  if (task && task.doneDate) return task.doneDate;
  const info = wx.getStorageInfoSync();
  let found = '';
  const prefix = TD_PREFIX + taskId + '_';
  (info.keys || []).forEach((k) => {
    if (k.indexOf(prefix) === 0) {
      const d = k.slice(prefix.length);
      if (!found || d < found) found = d;
    }
  });
  return found;
}

function purgeCompletedTodos() {
  const today = date.todayStr();
  const list = getTasks();
  const keep = [];
  let changed = false;
  const info = wx.getStorageInfoSync();
  list.forEach((t) => {
    if (t.time) { keep.push(t); return; }
    const completed = t.doneDate || doneDateOf(t.id);
    if (completed && completed < today) {
      changed = true;
      const prefix = TD_PREFIX + t.id + '_';
      (info.keys || []).forEach((k) => {
        if (k.indexOf(prefix) === 0) wx.removeStorageSync(k);
      });
      return;
    }
    if (completed && !t.doneDate) t.doneDate = completed;
    keep.push(t);
  });
  if (changed) saveTasks(keep);
}

function isTaskDone(taskId, dateStr) {
  const key = doneKey(taskId, dateStr);
  const v = wx.getStorageSync(key);
  if (v !== '') return !!v;
  const t = getTasks().find((x) => x.id === taskId);
  return !!(t && t.done);
}

function setTaskDone(taskId, dateStr, done) {
  const key = doneKey(taskId, dateStr);
  const list = getTasks();
  const t = list.find((x) => x.id === taskId);
  if (done) {
    wx.setStorageSync(key, true);
    addDay(dateStr);
    if (t && !t.time) {
      t.doneDate = dateStr;
      saveTasks(list);
    }
  } else {
    wx.removeStorageSync(key);
    if (t && !t.time && t.doneDate === dateStr) {
      delete t.doneDate;
      saveTasks(list);
    }
  }
}

function toggleTask(id) {
  const list = getTasks();
  const t = list.find((x) => x.id === id);
  if (!t) return null;
  const today = date.todayStr();
  const next = !isTaskDone(id, today);
  setTaskDone(id, today, next);
  return Object.assign({}, t, { done: next });
}

function getHabits() {
  return get(K_HABITS, []);
}

function addHabit(name, icon) {
  const list = getHabits();
  const clean = cleanText(name, 20);
  if (!clean) return null;
  const habit = { id: uid('h'), name: clean, icon: habitIcon(clean) || icon || '✅', color: list.length % CATS.length };
  list.push(habit);
  set(K_HABITS, list);
  return habit;
}

function setHabits(list) {
  set(K_HABITS, list);
}

function removeHabit(id) {
  set(K_HABITS, getHabits().filter((h) => h.id !== id));
  const info = wx.getStorageInfoSync();
  (info.keys || []).forEach((k) => {
    if (k.indexOf(CK_PREFIX + id + '_') === 0) wx.removeStorageSync(k);
  });
}

function checkKey(habitId, dateStr) {
  return CK_PREFIX + habitId + '_' + dateStr;
}

function checkinStatus(habitId, dateStr) {
  return wx.getStorageSync(checkKey(habitId, dateStr)) || '';
}

function setCheckin(habitId, dateStr, status) {
  const key = checkKey(habitId, dateStr);
  if (!status) {
    wx.removeStorageSync(key);
  } else {
    wx.setStorageSync(key, status);
    addDay(dateStr);
  }
}

function habitsWithStatus(dateStr) {
  return getHabits().map((h) => Object.assign({}, h, {
    status: checkinStatus(h.id, dateStr)
  }));
}

function addDay(dateStr) {
  const arr = get(K_DAYS, []);
  if (arr.indexOf(dateStr) < 0) {
    arr.push(dateStr);
    arr.sort();
    set(K_DAYS, arr);
  }
}

function calcStreaks() {
  const days = get(K_DAYS, []).sort();
  const has = (s) => days.indexOf(s) >= 0;
  const today = date.todayStr();
  let cursor = has(today) ? today : date.addDaysStr(today, -1);
  let current = 0;
  while (has(cursor)) {
    current += 1;
    cursor = date.addDaysStr(cursor, -1);
  }
  let longest = 0;
  let run = 0;
  let prev = '';
  days.forEach((s) => {
    if (prev && date.addDaysStr(prev, 1) === s) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = s;
  });
  return { current, longest };
}

function getRecords() {
  return get(K_RECORDS, []);
}

function addRecord(rec) {
  const list = getRecords();
  const record = Object.assign({
    id: uid('r'),
    type: 'schulte',
    mode: '',
    size: 0,
    timeMs: 0,
    points: 0,
    date: date.todayStr()
  }, rec);
  list.push(record);
  set(K_RECORDS, list);
  return record;
}

function brainValue() {
  return getRecords().reduce((sum, r) => sum + (r.points || 0), 0);
}

function bestFor(type, mode, size) {
  const base = getRecords().filter((r) => r.type === type && r.timeMs > 0 && (size == null || r.size === size));
  if (mode) {
    const exact = base.filter((r) => r.mode === mode);
    if (exact.length) return exact.reduce((a, b) => (a.timeMs < b.timeMs ? a : b));
  }
  return base.length ? base.reduce((a, b) => (a.timeMs < b.timeMs ? a : b)) : null;
}

function bestApm() {
  const list = getRecords().filter((r) => r.type === 'apm' && r.apm > 0);
  if (!list.length) return null;
  return list.reduce((a, b) => (a.apm > b.apm ? a : b));
}

function countFor(type) {
  return getRecords().filter((r) => r.type === type).length;
}

function activeDaysOfMonth(monthPrefix) {
  return get(K_DAYS, []).filter((s) => s.indexOf(monthPrefix) === 0);
}

function monthDoneCount(dateStr) {
  const tasks = tasksByDate(dateStr).filter((t) => isTaskDone(t.id, dateStr)).length;
  let habits = 0;
  getHabits().forEach((h) => {
    const s = checkinStatus(h.id, dateStr);
    if (s) habits += 1;
  });
  return tasks + habits;
}

function habitDoneCountThisMonth(habitId, monthPrefix) {
  const info = wx.getStorageInfoSync();
  let n = 0;
  (info.keys || []).forEach((k) => {
    if (k.indexOf(CK_PREFIX + habitId + '_' + monthPrefix) === 0) n += 1;
  });
  return n;
}

function getStory(dateStr) {
  return wx.getStorageSync(ST_PREFIX + dateStr) || '';
}

function setStory(dateStr, text) {
  const clean = cleanText(text, 300);
  const key = ST_PREFIX + dateStr;
  if (!clean) wx.removeStorageSync(key);
  else wx.setStorageSync(key, clean);
  return clean;
}

function getUser() {
  return Object.assign({ nickname: '', avatar: '', createdAt: Date.now() }, get(K_USER, {}));
}

function setUser(patch) {
  const p = Object.assign({}, patch);
  if (p.nickname !== undefined) p.nickname = cleanText(p.nickname, 20);
  if (p.avatar !== undefined) {
    p.avatar = typeof p.avatar === 'string' && p.avatar.length <= 600000 ? p.avatar : '';
  }
  set(K_USER, Object.assign(getUser(), p));
}

function addFeedback(text) {
  const clean = cleanText(text, 500);
  if (!clean) return null;
  const list = get(K_FEEDBACK, []);
  const item = { id: uid('f'), text: clean, createdAt: Date.now() };
  list.push(item);
  if (list.length > 200) list.splice(0, list.length - 200);
  set(K_FEEDBACK, list);
  return item;
}

function getFeedbacks() {
  return get(K_FEEDBACK, []);
}

function exportData() {
  const info = wx.getStorageInfoSync();
  const checkins = {};
  const dones = {};
  const stories = {};
  (info.keys || []).forEach((k) => {
    if (k.indexOf(CK_PREFIX) === 0) checkins[k] = wx.getStorageSync(k);
    if (k.indexOf(TD_PREFIX) === 0) dones[k] = wx.getStorageSync(k);
    if (k.indexOf(ST_PREFIX) === 0) stories[k] = wx.getStorageSync(k);
  });
  return JSON.stringify({
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks: getTasks(),
    habits: getHabits(),
    days: get(K_DAYS, []),
    records: getRecords(),
    feedbacks: getFeedbacks(),
    user: getUser(),
    checkins,
    dones,
    stories
  }, null, 2);
}

function clearAll() {
  const info = wx.getStorageInfoSync();
  (info.keys || []).forEach((k) => {
    if (k.indexOf('mf_') === 0) wx.removeStorageSync(k);
  });
  init();
}

module.exports = {
  CATS,
  catOf,
  init,
  getTasks,
  addTask,
  patchTask,
  toggleTask,
  isTaskDone,
  setTaskDone,
  purgeCompletedTodos,
  removeTask,
  tasksByDate,
  getHabits,
  addHabit,
  setHabits,
  removeHabit,
  checkinStatus,
  setCheckin,
  habitsWithStatus,
  calcStreaks,
  getRecords,
  addRecord,
  brainValue,
  bestFor,
  bestApm,
  countFor,
  activeDaysOfMonth,
  monthDoneCount,
  habitDoneCountThisMonth,
  getStory,
  setStory,
  getUser,
  setUser,
  addFeedback,
  getFeedbacks,
  exportData,
  clearAll
};
