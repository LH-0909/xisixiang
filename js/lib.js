/* === 习思想题库 - 纯函数库（零DOM依赖，跨页面共享）=== */

// ====== Fisher-Yates 洗牌 ======

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ====== 格式化时间 m:ss ======

function formatTime(seconds) {
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// ====== 评分等级 ======

function getScoreGrade(percent) {
  if (percent >= 90) return { text: '优秀', cls: 'excellent' };
  if (percent >= 70) return { text: '良好', cls: 'good' };
  if (percent >= 60) return { text: '及格', cls: 'poor' };
  return { text: '需努力', cls: 'poor' };
}

// ====== 答案判定（单选 + 多选）======

function isAnswerCorrect(userAns, realAns) {
  if (userAns === undefined) return false;
  if (Array.isArray(realAns) && Array.isArray(userAns)) {
    if (realAns.length !== userAns.length) return false;
    var s = userAns.slice().sort(function(a, b) { return a - b; });
    return realAns.every(function(v, i) { return v === s[i]; });
  }
  if (!Array.isArray(realAns) && !Array.isArray(userAns)) return userAns === realAns;
  return false;
}

// ====== 选项乱序（返回乱序后的 opts + 映射后的答案索引）======

function shuffleOptions(q) {
  var indices = q.opts.map(function(_, i) { return i; });
  var s = shuffle(indices);
  var newOpts = s.map(function(i) { return q.opts[i]; });
  var newAns = Array.isArray(q.ans)
    ? q.ans.map(function(a) { return s.indexOf(a); }).sort(function(a, b) { return a - b; })
    : s.indexOf(q.ans);
  return { opts: newOpts, ans: newAns };
}

// ====== 查找单元（跨 UNITS + VIP_UNITS）======

function findUnit(uid) {
  var found = null;
  if (typeof UNITS !== 'undefined') {
    found = UNITS.find(function(u) { return u.id === uid; });
  }
  if (!found && typeof VIP_UNITS !== 'undefined') {
    found = VIP_UNITS.find(function(u) { return u.id === uid; });
  }
  return found;
}

// ====== 判断是否为VIP单元 ======

function isVipUnit(uid) {
  return uid >= 12;
}
