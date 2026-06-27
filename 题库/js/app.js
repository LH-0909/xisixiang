/* === 习思想题库 - 公共逻辑 === */

// ====== localStorage 操作 ======

const STORAGE_KEY = 'xixiang_wrong_book';
const HISTORY_KEY = 'xixiang_test_history';

function getWrongBook() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch(e) {
    return {};
  }
}

function saveWrongBook(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function addWrongQuestion(unitId, questionId) {
  const book = getWrongBook();
  const key = unitId + '_' + questionId;
  if (!book[key]) {
    book[key] = { unitId, questionId, wrongCount: 1, timestamp: Date.now() };
  } else {
    book[key].wrongCount += 1;
    book[key].timestamp = Date.now();
  }
  saveWrongBook(book);
}

function removeWrongQuestion(unitId, questionId) {
  const book = getWrongBook();
  const key = unitId + '_' + questionId;
  delete book[key];
  saveWrongBook(book);
}

function getUnitWrongQuestions(unitId) {
  const book = getWrongBook();
  return Object.values(book).filter(item => item.unitId === unitId);
}

function getAllWrongQuestions() {
  const book = getWrongBook();
  return Object.values(book);
}

function isWrongQuestion(unitId, questionId) {
  const book = getWrongBook();
  return !!(book[unitId + '_' + questionId]);
}

function getWrongCount(unitId, questionId) {
  const book = getWrongBook();
  const key = unitId + '_' + questionId;
  return book[key] ? book[key].wrongCount : 0;
}

// ====== 测验历史 ======

function saveTestHistory(unitId, score, total) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
    if (!history[unitId]) history[unitId] = [];
    history[unitId].push({ score, total, percent: Math.round(score/total*100), time: Date.now() });
    // Keep last 10 records per unit
    if (history[unitId].length > 10) history[unitId] = history[unitId].slice(-10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch(e) {}
}

function getTestHistory(unitId) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
    return history[unitId] || [];
  } catch(e) {
    return [];
  }
}

// ====== 洗牌算法 (Fisher-Yates) ======

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ====== 获取 URL 参数 ======

function getUrlParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// ====== DOM 辅助 ======

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

// ====== 格式化时间 ======

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// ====== 获取评分等级 ======

function getScoreGrade(percent) {
  if (percent >= 90) return { text: '优秀', cls: 'excellent' };
  if (percent >= 70) return { text: '良好', cls: 'good' };
  if (percent >= 60) return { text: '及格', cls: 'poor' };
  return { text: '需努力', cls: 'poor' };
}
