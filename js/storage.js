/* === 习思想题库 - 持久化层（版本校验 + 自动备份 + 完整性检查）=== */

var STORAGE_VERSION = 1;
var STORAGE_KEY = 'xixiang_wrong_book';
var HISTORY_KEY = 'xixiang_test_history';
var PROGRESS_PREFIX = 'xixiang_unit_progress_';
var VIP_UNLOCKED_KEY = 'xisixiang_vip_unlocked';

// ====== Internal helpers ======

function _backupBeforeWrite(key) {
  try {
    var current = localStorage.getItem(key);
    if (current) {
      localStorage.setItem(key + '_backup', current);
    }
  } catch(e) {}
}

function _addMeta(data) {
  data._meta = { version: STORAGE_VERSION, lastModified: Date.now() };
  return data;
}

function _migrateIfNeeded(data) {
  if (!data._meta || data._meta.version < STORAGE_VERSION) {
    // Migrate unversioned → v1: just add meta
    data._meta = { version: STORAGE_VERSION, lastModified: Date.now() };
  }
  return data;
}

// ====== Wrong Book ======

function getWrongBook() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return _addMeta({});
    var data = JSON.parse(raw);
    return _migrateIfNeeded(data);
  } catch(e) {
    // Backup corrupt data before resetting
    try {
      var corruptData = localStorage.getItem(STORAGE_KEY);
      if (corruptData) {
        localStorage.setItem(STORAGE_KEY + '_corrupt_' + Date.now(), corruptData);
      }
    } catch(e2) {}
    localStorage.removeItem(STORAGE_KEY);
    alert('⚠️ 检测到错题本数据损坏，已自动备份旧数据并重置。\n很抱歉，之前记录的错题可能丢失。');
    return _addMeta({});
  }
}

function saveWrongBook(data) {
  _backupBeforeWrite(STORAGE_KEY);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_addMeta(data)));
  } catch(e) {
    console.warn('无法保存错题本：存储可能已满');
  }
}

function addWrongQuestion(unitId, questionId) {
  var book = getWrongBook();
  var key = unitId + '_' + questionId;
  if (!book[key]) {
    book[key] = { unitId: unitId, questionId: questionId, wrongCount: 1, timestamp: Date.now() };
  } else {
    book[key].wrongCount += 1;
    book[key].timestamp = Date.now();
  }
  saveWrongBook(book);
}

function removeWrongQuestion(unitId, questionId) {
  var book = getWrongBook();
  var key = unitId + '_' + questionId;
  delete book[key];
  saveWrongBook(book);
}

function getUnitWrongQuestions(unitId) {
  var book = getWrongBook();
  var items = [];
  for (var k in book) {
    if (k === '_meta') continue;
    if (book[k].unitId === unitId) items.push(book[k]);
  }
  return items;
}

function getAllWrongQuestions() {
  var book = getWrongBook();
  var items = [];
  for (var k in book) {
    if (k === '_meta') continue;
    items.push(book[k]);
  }
  return items;
}

function isWrongQuestion(unitId, questionId) {
  var book = getWrongBook();
  return !!(book[unitId + '_' + questionId]);
}

function getWrongCount(unitId, questionId) {
  var book = getWrongBook();
  var key = unitId + '_' + questionId;
  return book[key] ? book[key].wrongCount : 0;
}

// ====== Test History ======

function saveTestHistory(unitId, score, total) {
  try {
    var history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
    if (!history[unitId]) history[unitId] = [];
    history[unitId].push({ score: score, total: total, percent: Math.round(score / total * 100), time: Date.now() });
    if (history[unitId].length > 10) history[unitId] = history[unitId].slice(-10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch(e) {
    console.warn('无法保存测验历史：存储可能已满');
  }
}

function getTestHistory(unitId) {
  try {
    var history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
    return history[unitId] || [];
  } catch(e) {
    try {
      var corrupt = localStorage.getItem(HISTORY_KEY);
      if (corrupt) localStorage.setItem(HISTORY_KEY + '_corrupt_' + Date.now(), corrupt);
      localStorage.removeItem(HISTORY_KEY);
    } catch(e2) {}
    return [];
  }
}

// ====== Unit Progress ======

function saveUnitProgress(unitId, data) {
  try {
    var key = PROGRESS_PREFIX + unitId;
    var toSave = {
      mode: data.mode,
      userAnswers: data.userAnswers,
      submittedQuestions: data.submittedQuestions,
      skippedQuestions: data.skippedQuestions,
      currentIndex: data.currentIndex,
      testStarted: data.testStarted || false,
      testSubmitted: data.testSubmitted || false,
      timerSeconds: data.timerSeconds || 0,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch(e) {
    console.warn('无法保存进度：存储可能已满');
  }
}

function loadUnitProgress(unitId) {
  try {
    var key = PROGRESS_PREFIX + unitId;
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) {
    try {
      var key = PROGRESS_PREFIX + unitId;
      var corrupt = localStorage.getItem(key);
      if (corrupt) localStorage.setItem(key + '_corrupt_' + Date.now(), corrupt);
      localStorage.removeItem(key);
    } catch(e2) {}
    return null;
  }
}

function clearUnitProgress(unitId) {
  try {
    localStorage.removeItem(PROGRESS_PREFIX + unitId);
  } catch(e) {}
}

function hasUnitProgress(unitId) {
  return loadUnitProgress(unitId) !== null;
}

// ====== VIP Unlock State ======

function isVipUnlocked() {
  try { return localStorage.getItem(VIP_UNLOCKED_KEY) === '1'; } catch(e) { return false; }
}

function unlockVip() {
  try { localStorage.setItem(VIP_UNLOCKED_KEY, '1'); } catch(e) {}
}

// ====== Storage Stats ======

function getStorageStats() {
  var stats = {
    wrongBookCount: 0,
    testHistoryUnits: 0,
    lastModified: null,
    storageUsed: 0
  };
  try {
    var book = getWrongBook();
    var count = 0;
    for (var k in book) { if (k !== '_meta') count++; }
    stats.wrongBookCount = count;
    stats.lastModified = book._meta ? book._meta.lastModified : null;
  } catch(e) {}
  try {
    var history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
    var units = 0;
    for (var u in history) { units++; }
    stats.testHistoryUnits = units;
  } catch(e) {}
  try {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('xixiang_') === 0) {
        total += (localStorage.getItem(k) || '').length;
      }
    }
    stats.storageUsed = total;
  } catch(e) {}
  return stats;
}
