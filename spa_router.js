// Simple page switcher - show/hide divs
let currentPage = 'home';

function go(p) {
  currentPage = p;
  document.getElementById('pg-home').style.display = (p === 'home') ? 'block' : 'none';
  document.getElementById('pg-unit').style.display = (p === 'unit') ? 'block' : 'none';
  document.getElementById('pg-wrong').style.display = (p === 'wrong') ? 'block' : 'none';
  window.scrollTo(0, 0);
}

function goHome() { go('home'); renderHomeData(); }
function goUnit(uid) { go('unit'); unitPage.start(uid); }
function goWrong() { go('wrong'); wrongPage.start(); }

// Helper: find unit by ID across both regular and VIP
function findUnit(uid) {
  return UNITS.find(function(u) { return u.id === uid; }) ||
         (typeof VIP_UNITS !== 'undefined' ? VIP_UNITS.find(function(u) { return u.id === uid; }) : undefined);
}

// ====== Collapsible Header ======
function toggleHeader(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('collapsed');
  // Also toggle the next nav-bar
  var nav = el.nextElementSibling;
  if (nav && nav.classList.contains('nav-bar')) {
    nav.classList.toggle('collapsed');
  }
  try { localStorage.setItem('header_' + id, el.classList.contains('collapsed') ? '1' : '0'); } catch(e) {}
}
// Restore header state on load
(function() {
  ['home-header','unit-header','wrong-header'].forEach(function(id) {
    try {
      if (localStorage.getItem('header_' + id) === '1') {
        var el = document.getElementById(id);
        if (el) {
          el.classList.add('collapsed');
          var nav = el.nextElementSibling;
          if (nav && nav.classList.contains('nav-bar')) nav.classList.add('collapsed');
        }
      }
    } catch(e) {}
  });
})();

// ====== VIP Password Gate ======
var VIP_PASSWORD = '1739819660';
var VIP_UNLOCKED_KEY = 'xisixiang_vip_unlocked';

function isVipUnit(uid) {
  return uid >= 12;
}

function isVipUnlocked() {
  try { return localStorage.getItem(VIP_UNLOCKED_KEY) === '1'; } catch(e) { return false; }
}

function unlockVip() {
  try { localStorage.setItem(VIP_UNLOCKED_KEY, '1'); } catch(e) {}
}

function promptVipPassword(callback) {
  var pwd = prompt('🔒 VIP套题需要输入访问密码：');
  if (pwd === VIP_PASSWORD) {
    unlockVip();
    alert('✅ 密码正确，已解锁VIP套题！');
    callback();
  } else if (pwd !== null) {
    alert('❌ 密码错误，请重试。');
  }
}

// Override goUnit to check VIP access
var _goUnit = goUnit;
goUnit = function(uid) {
  if (isVipUnit(uid) && !isVipUnlocked()) {
    promptVipPassword(function() { _goUnit(uid); });
  } else {
    _goUnit(uid);
  }
};

// Hash routing
window.addEventListener('hashchange', function() {
  var h = location.hash;
  if (h.indexOf('#unit/') === 0) goUnit(parseInt(h.split('/')[1]));
  else if (h === '#wrong') goWrong();
  else goHome();
});

// ====== HOME PAGE ======
function renderHomeData() {
  var total = 0;
  UNITS.forEach(function(u) { total += u.questions.length; });
  document.getElementById('total-count').textContent = total;

  var grid = document.getElementById('unit-grid');
  grid.innerHTML = '';
  UNITS.forEach(function(unit) {
    var card = document.createElement('div');
    card.className = 'unit-card';
    (function(uid) { card.onclick = function() { goUnit(uid); }; })(unit.id);
    card.innerHTML = '<div class="unit-num">' + unit.id + '</div><div class="unit-title">' + unit.name + '</div><div class="unit-count">' + unit.questions.length + ' 道题</div>';
    grid.appendChild(card);
  });

  // VIP section
  if (typeof VIP_UNITS !== 'undefined' && VIP_UNITS.length > 0) {
    var vipTotal = 0;
    VIP_UNITS.forEach(function(u) { vipTotal += u.questions.length; });
    var vipSection = document.getElementById('vip-section');
    if (vipSection) {
      document.getElementById('vip-total-count').textContent = vipTotal;
      var vipGrid = document.getElementById('vip-grid');
      vipGrid.innerHTML = '';
      VIP_UNITS.forEach(function(unit) {
        var card = document.createElement('div');
        card.className = 'unit-card vip-card';
        (function(uid) { card.onclick = function() { goUnit(uid); }; })(unit.id);
        card.innerHTML = '<div class="unit-num vip-num">' + unit.id + '</div><div class="unit-title">' + unit.name + '</div><div class="unit-count">' + unit.questions.length + ' 道题</div>';
        vipGrid.appendChild(card);
      });
    }
  }

  var allWrong = getAllWrongQuestions();
  var wc = document.getElementById('wrong-count');
  wc.textContent = allWrong.length > 0 ? allWrong.length + ' 道错题待复习' : '暂无错题 ✓';
  wc.style.color = allWrong.length > 0 ? '#ff6b6b' : '';
}

// ====== UNIT PAGE (stateful module) ======
var unitPage = (function() {
  var unit, mode, questions, currentIndex, userAnswers, submitted, skipped;
  var testStarted, testSubmitted, timerSeconds, timerInterval, sidebarCollapsed;
  var letters = 'ABCDEFGHIJ';

  function init(uid) {
    unit = findUnit(uid);
    if (!unit) { goHome(); return; }
    mode = 'practice';
    userAnswers = {}; submitted = {}; skipped = {};
    currentIndex = 0; testSubmitted = false; testStarted = false;
    sidebarCollapsed = false;
    stopTimer();
    document.getElementById('unit-title').textContent = unit.name;
    updateModeUI();
    startMode();
  }

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    var sb = document.getElementById('u-sidebar');
    if (sidebarCollapsed) { sb.classList.add('collapsed'); document.getElementById('u-sidebar-arrow').textContent = '▶'; }
    else { sb.classList.remove('collapsed'); document.getElementById('u-sidebar-arrow').textContent = '◀'; }
  }

  function getQuestions() {
    var qs;
    if (mode === 'wrong') {
      var wrongItems = getUnitWrongQuestions(unit.id);
      qs = [];
      wrongItems.forEach(function(item) {
        var q = unit.questions.find(function(q) { return q.id === item.questionId; });
        if (q) { var c = Object.assign({}, q); c.wrongCount = item.wrongCount; qs.push(c); }
      });
    } else {
      qs = unit.questions.map(function(q) { return Object.assign({}, q); });
    }
    qs.sort(function(a, b) { return a.type === b.type ? 0 : (a.type === 'single' ? -1 : 1); });
    if (mode === 'test') {
      qs = shuffle(qs).map(function(q) {
        var s = shuffleOpts(q);
        var c = Object.assign({}, q);
        c.shuffledOpts = s.opts;
        c._shuffledAns = s.ans;
        return c;
      });
    }
    return qs;
  }

  function shuffleOpts(q) {
    var indices = q.opts.map(function(_, i) { return i; });
    var s = shuffle(indices);
    var newOpts = s.map(function(i) { return q.opts[i]; });
    var newAns = Array.isArray(q.ans) ? q.ans.map(function(a) { return s.indexOf(a); }).sort(function(a, b) { return a - b; }) : s.indexOf(q.ans);
    return {opts: newOpts, ans: newAns};
  }

  function getRealAns(q) { return (mode === 'test' && q._shuffledAns !== undefined) ? q._shuffledAns : q.ans; }
  function getOpts(q) { return (mode === 'test' && q.shuffledOpts) ? q.shuffledOpts : q.opts; }

  function startMode() {
    userAnswers = {}; submitted = {}; skipped = {};
    currentIndex = 0; testSubmitted = false;
    stopTimer();
    document.getElementById('u-timer').style.display = 'none';

    if (mode === 'wrong' && getUnitWrongQuestions(unit.id).length === 0) {
      document.getElementById('u-content').innerHTML = '<div class="empty-state"><div class="icon">🎉</div><p>本单元暂无错题！</p></div>';
      document.getElementById('u-bottom').innerHTML = '';
      document.getElementById('u-progress-fill').style.width = '0%';
      document.getElementById('u-progress-text').textContent = '';
      document.getElementById('u-sidebar-grid').innerHTML = '';
      return;
    }

    questions = getQuestions();
    testStarted = (mode === 'test');
    if (testStarted) {
      startTimer();
      document.getElementById('u-timer').style.display = 'flex';
    }
    renderQuestion();
    updateProgress();
    renderSidebar();
  }

  function startTimer() { stopTimer(); timerSeconds = 0; updateTimerDisplay(); timerInterval = setInterval(function() { timerSeconds++; updateTimerDisplay(); }, 1000); }
  function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
  function updateTimerDisplay() { document.getElementById('u-timer').textContent = '⏱ ' + formatTime(timerSeconds); }

  function updateModeUI() {
    var labels = {practice: '练习模式 — 选择后提交查看对错', test: '单元测验 — 全部确认后交卷出分', wrong: '单元错题 — 针对性复习'};
    document.getElementById('u-mode-label').textContent = labels[mode];
    ['u-btn-practice','u-btn-test','u-btn-wrong'].forEach(function(id) { document.getElementById(id).classList.remove('active'); });
    document.getElementById('u-btn-' + mode).classList.add('active');
  }

  function switchMode(m) {
    mode = m; updateModeUI();
    userAnswers = {}; submitted = {}; skipped = {};
    currentIndex = 0; testSubmitted = false;
    stopTimer(); document.getElementById('u-timer').style.display = 'none';
    startMode();
  }

  function renderSidebar() {
    var grid = document.getElementById('u-sidebar-grid');
    var html = '';
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i], cls = 'sidebar-num';
      if (i === currentIndex) cls += ' current';
      else if (submitted[q.id]) cls += ' answered';
      else if (skipped[q.id]) cls += ' skipped';
      html += '<div class="' + cls + '" onclick="unitPage.jump(' + i + ')">' + (i + 1) + '</div>';
    }
    grid.innerHTML = html;
  }

  function jump(idx) { currentIndex = idx; renderQuestion(); updateProgress(); renderSidebar(); window.scrollTo(0, 0); }

  function renderQuestion() {
    if (questions.length === 0) { document.getElementById('u-content').innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>没有题目</p></div>'; return; }
    var q = questions[currentIndex];
    var opts = getOpts(q), realAns = getRealAns(q);
    var isMulti = q.type === 'multi';
    var userAns = userAnswers[q.id];
    var submittedQ = submitted[q.id] || false;
    var showResult = (mode === 'test') ? testSubmitted : submittedQ;
    var hasSel = isMulti ? (Array.isArray(userAns) && userAns.length > 0) : (userAns !== undefined);

    var typeLabel = isMulti ? '<span class="type-badge multi">多选题</span>' : '<span class="type-badge single">单选题</span>';
    var optHTML = '';
    opts.forEach(function(opt, i) {
      var isSelected = Array.isArray(userAns) ? userAns.indexOf(i) >= 0 : (userAns === i);
      var isCorrect = Array.isArray(realAns) ? realAns.indexOf(i) >= 0 : (realAns === i);
      var cls = 'option-item';
      if (showResult) { cls += ' disabled'; if (isCorrect) cls += ' correct'; else if (isSelected && !isCorrect) cls += ' wrong'; }
      else if (isSelected) cls += ' selected';
      var chk = isMulti ? '<span class="checkmark"></span>' : '<span class="option-letter">' + letters[i] + '</span>';
      optHTML += '<div class="' + cls + '" data-idx="' + i + '">' + chk + '<span class="option-text">' + opt + '</span></div>';
    });

    var fbHTML = '';
    if (showResult) {
      if (isCorrect(userAns, realAns)) fbHTML = '<div class="feedback correct-fb show">✅ 回答正确！</div>';
      else {
        var cs = Array.isArray(realAns) ? realAns.map(function(a) { return letters[a] + '. ' + opts[a]; }).join('；') : letters[realAns] + '. ' + opts[realAns];
        fbHTML = '<div class="feedback wrong-fb show">❌ 回答错误！正确答案：<strong>' + cs + '</strong></div>';
      }
    }

    var sk = skipped[q.id] ? ' ⚑已标记' : '';
    var wc = q.wrongCount ? '<span style="margin-left:8px;color:#C62828;font-size:0.85rem">错过' + q.wrongCount + '次</span>' : '';
    document.getElementById('u-content').innerHTML =
      '<div class="question-card"><span class="question-num">第 ' + (currentIndex + 1) + ' 题</span>' + typeLabel + wc +
      (sk ? '<span style="margin-left:8px;color:#F57F17;font-size:0.85rem">' + sk + '</span>' : '') +
      '<div class="question-text">' + q.q + '</div>' +
      '<div style="font-size:0.85rem;color:#999;margin-bottom:8px">' + (isMulti ? '（可多选，选全所有正确答案后提交）' : '（单选，选择一个答案后提交）') + '</div>' +
      '<div class="options-list">' + optHTML + '</div>' + fbHTML + '</div>';

    if (!showResult) {
      var items = document.querySelectorAll('#u-content .option-item');
      items.forEach(function(item) {
        item.addEventListener('click', function() { handleSelect(parseInt(this.dataset.idx), isMulti); });
      });
    }
    renderBottom(hasSel, submittedQ);
  }

  function isCorrect(uAns, rAns) {
    if (uAns === undefined) return false;
    if (Array.isArray(rAns) && Array.isArray(uAns)) {
      if (rAns.length !== uAns.length) return false;
      var s = uAns.slice().sort(function(a, b) { return a - b; });
      return rAns.every(function(v, i) { return v === s[i]; });
    }
    if (!Array.isArray(rAns) && !Array.isArray(uAns)) return uAns === rAns;
    return false;
  }

  function handleSelect(oi, isMulti) {
    var q = questions[currentIndex];
    if (isMulti) {
      var cur = userAnswers[q.id];
      if (!Array.isArray(cur)) cur = [];
      var idx = cur.indexOf(oi);
      if (idx >= 0) cur.splice(idx, 1); else cur.push(oi);
      cur.sort(function(a, b) { return a - b; });
      userAnswers[q.id] = cur;
    } else {
      userAnswers[q.id] = oi;
    }
    delete skipped[q.id];
    renderQuestion(); renderSidebar();
  }

  function submitCurrent() {
    var q = questions[currentIndex], ua = userAnswers[q.id];
    var hasSel = q.type === 'multi' ? (Array.isArray(ua) && ua.length > 0) : (ua !== undefined);
    if (!hasSel) return;
    submitted[q.id] = true;
    if (mode === 'practice' || mode === 'wrong') {
      if (!isCorrect(ua, getRealAns(q))) addWrongQuestion(unit.id, q.id);
      else { if (isWrongQuestion(unit.id, q.id)) removeWrongQuestion(unit.id, q.id); }
    }
    renderQuestion(); renderSidebar();
  }

  function renderBottom(hasSel, submittedQ) {
    var q = questions[currentIndex];
    var isLast = currentIndex >= questions.length - 1, isFirst = currentIndex <= 0;
    var allSub = questions.every(function(q) { return submitted[q.id]; });
    var isSk = skipped[q.id];
    var html = '';

    if (mode === 'test' && !testSubmitted) {
      html += '<button class="btn btn-outline" onclick="unitPage.prevQ()" ' + (isFirst ? 'disabled' : '') + '>← 上一题</button>';
      html += '<button class="btn btn-outline btn-sm" onclick="unitPage.markSkip()" style="background:' + (isSk ? '#FFF8E1' : '#fff') + '">' + (isSk ? '已标记 ⚑' : '标记 ⚐') + '</button>';
      var ac = questions.filter(function(q) { return submitted[q.id]; }).length;
      html += '<span style="font-size:0.9rem;color:#666">已确认 ' + ac + '/' + questions.length + '</span>';
      if (hasSel && !submittedQ) html += '<button class="btn btn-primary" onclick="unitPage.submitCur()">确认本题 ✓</button>';
      else html += '<button class="btn btn-primary" onclick="unitPage.nextQ()">下一题 →</button>';
      if (allSub) html += '<button class="btn btn-primary" onclick="unitPage.submitTest()" style="background:#C41E3A;margin-left:8px">📋 交卷</button>';
      else { var us = questions.length - ac; html += '<button class="btn btn-outline" onclick="unitPage.submitTest()" style="margin-left:8px;color:#C62828;border-color:#C62828">交卷(' + us + '题未确认)</button>'; }
    } else if (mode === 'test' && testSubmitted) {
      html += '<button class="btn btn-outline" onclick="unitPage.prevQ()" ' + (isFirst ? 'disabled' : '') + '>← 上一题</button><span style="font-size:0.9rem">浏览答卷</span>';
      html += '<button class="btn btn-primary" onclick="unitPage.nextQ()" ' + (isLast ? 'disabled' : '') + '>下一题 →</button>';
      html += '<button class="btn btn-outline" onclick="unitPage.switchMode(\'test\')">重新测验</button>';
    } else {
      html += '<button class="btn btn-outline" onclick="unitPage.prevQ()" ' + (isFirst ? 'disabled' : '') + '>← 上一题</button>';
      html += '<span style="font-size:0.9rem;color:#666">' + (currentIndex + 1) + ' / ' + questions.length + '</span>';
      if (hasSel && !submittedQ) html += '<button class="btn btn-primary" onclick="unitPage.submitCur()">提交答案 ✓</button>';
      else if (submittedQ) html += '<button class="btn btn-primary" onclick="' + (isLast ? 'unitPage.finishPractice()' : 'unitPage.nextQ()') + '">' + (isLast ? '完成练习 ✓' : '下一题 →') + '</button>';
      else html += '<button class="btn btn-primary" disabled>请先选择答案</button>';
    }
    document.getElementById('u-bottom').innerHTML = html;
  }

  function nextQ() { if (currentIndex < questions.length - 1) { currentIndex++; renderQuestion(); updateProgress(); renderSidebar(); window.scrollTo(0, 0); } }
  function prevQ() { if (currentIndex > 0) { currentIndex--; renderQuestion(); updateProgress(); renderSidebar(); window.scrollTo(0, 0); } }
  function markSkip() { var q = questions[currentIndex]; skipped[q.id] = !skipped[q.id]; renderQuestion(); renderSidebar(); }
  function updateProgress() {
    var pct = questions.length > 0 ? Math.round((currentIndex + 1) / questions.length * 100) : 0;
    document.getElementById('u-progress-fill').style.width = pct + '%';
    document.getElementById('u-progress-text').textContent = '第 ' + (currentIndex + 1) + ' 题 / 共 ' + questions.length + ' 题';
  }

  function submitTest() {
    var us = questions.filter(function(q) { return !submitted[q.id]; });
    if (us.length > 0 && !confirm('还有 ' + us.length + ' 道题未确认，未确认的题计为错误。确定交卷？')) return;
    us.forEach(function(q) { submitted[q.id] = true; });
    testSubmitted = true; stopTimer(); document.getElementById('u-timer').style.display = 'none';
    var correct = 0;
    questions.forEach(function(q) {
      if (isCorrect(userAnswers[q.id], getRealAns(q))) correct++; else addWrongQuestion(unit.id, q.id);
    });
    var total = questions.length, percent = Math.round(correct / total * 100), grade = getScoreGrade(percent);
    saveTestHistory(unit.id, correct, total);
    document.getElementById('u-content').innerHTML =
      '<div class="result-card"><h2>测验完成！</h2><div class="result-score">' + correct + '<span style="font-size:1.5rem"> / ' + total + '</span></div>' +
      '<span class="score-badge ' + grade.cls + '">' + grade.text + ' · ' + percent + '%</span>' +
      '<div class="result-detail"><div class="result-item"><div class="num" style="color:#2E7D32">' + correct + '</div><div class="label">正确</div></div>' +
      '<div class="result-item"><div class="num" style="color:#C62828">' + (total - correct) + '</div><div class="label">错误</div></div>' +
      '<div class="result-item"><div class="num">' + formatTime(timerSeconds) + '</div><div class="label">用时</div></div></div></div>';
    document.getElementById('u-bottom').innerHTML = '<button class="btn btn-outline" onclick="unitPage.reviewTest()">查看答卷</button><button class="btn btn-primary" onclick="unitPage.switchMode(\'test\')">重新测验</button>';
    document.getElementById('u-progress-fill').style.width = '100%'; document.getElementById('u-progress-text').textContent = '';
    document.getElementById('u-mode-label').textContent = '测验结果'; document.getElementById('u-sidebar-grid').innerHTML = '';
  }

  function reviewTest() { testSubmitted = true; currentIndex = 0; renderQuestion(); updateProgress(); renderSidebar(); document.getElementById('u-mode-label').textContent = '查看答卷'; }

  function finishPractice() {
    var correct = 0, answered = 0;
    questions.forEach(function(q) { if (submitted[q.id]) { answered++; if (isCorrect(userAnswers[q.id], getRealAns(q))) correct++; } });
    var grade = getScoreGrade(answered > 0 ? Math.round(correct / answered * 100) : 0);
    document.getElementById('u-content').innerHTML =
      '<div class="result-card"><h2>练习完成！</h2><div class="result-score">' + correct + '<span style="font-size:1.5rem"> / ' + answered + '</span></div>' +
      '<span class="score-badge ' + grade.cls + '">已答 ' + answered + ' 题，正确 ' + correct + ' 题</span>' +
      '<div class="result-detail"><div class="result-item"><div class="num" style="color:#2E7D32">' + correct + '</div><div class="label">正确</div></div>' +
      '<div class="result-item"><div class="num" style="color:#C62828">' + (answered - correct) + '</div><div class="label">错误</div></div>' +
      '<div class="result-item"><div class="num">' + (questions.length - answered) + '</div><div class="label">未答</div></div></div></div>';
    document.getElementById('u-bottom').innerHTML = '<button class="btn btn-primary" onclick="unitPage.switchMode(\'practice\')">重新练习</button>';
    document.getElementById('u-progress-fill').style.width = '100%'; document.getElementById('u-progress-text').textContent = '';
  }

  // Public API
  return {
    start: init,
    switchMode: switchMode,
    toggleSidebar: toggleSidebar,
    jump: jump,
    nextQ: nextQ, prevQ: prevQ,
    markSkip: markSkip,
    submitCur: submitCurrent,
    submitTest: submitTest,
    reviewTest: reviewTest,
    finishPractice: finishPractice
  };
})();

// ====== WRONG BOOK PAGE ======
var wrongPage = (function() {
  var wmode, wQs, wIdx, wAns, wSidebar;

  function start() {
    wmode = 'list'; wSidebar = false;
    document.getElementById('w-btn-list').classList.add('active');
    document.getElementById('w-btn-review').classList.remove('active');
    document.getElementById('w-list-view').style.display = 'block';
    document.getElementById('w-review-view').style.display = 'none';
    renderList();
  }

  function switchWMode(m) {
    wmode = m;
    document.getElementById('w-btn-list').classList.toggle('active', m === 'list');
    document.getElementById('w-btn-review').classList.toggle('active', m === 'review');
    document.getElementById('w-list-view').style.display = (m === 'list') ? 'block' : 'none';
    document.getElementById('w-review-view').style.display = (m === 'review') ? 'block' : 'none';
    if (m === 'list') renderList(); else startReview();
  }

  function toggleSidebar() {
    wSidebar = !wSidebar;
    var sb = document.getElementById('w-sidebar');
    if (wSidebar) { sb.classList.add('collapsed'); document.getElementById('w-sbar-arrow').textContent = '▶'; }
    else { sb.classList.remove('collapsed'); document.getElementById('w-sbar-arrow').textContent = '◀'; }
  }

  function renderList() {
    var allW = getAllWrongQuestions();
    if (allW.length === 0) {
      document.getElementById('w-list-view').innerHTML = '<div class="empty-state"><div class="icon">🎉</div><p>恭喜！没有错题</p></div>';
      document.getElementById('w-btn-clear').style.display = 'none';
      return;
    }
    document.getElementById('w-btn-clear').style.display = 'inline-flex';
    var grouped = {};
    allW.forEach(function(w) {
      var unit = findUnit(w.unitId);
      var uname = unit ? unit.name : '未知';
      if (!grouped[uname]) grouped[uname] = [];
      var q = unit ? unit.questions.find(function(q) { return q.id === w.questionId; }) : null;
      grouped[uname].push({qt: q ? q.q : '(已删除)', uname: uname, wrongCount: w.wrongCount});
    });

    var html = '';
    for (var uname in grouped) {
      var items = grouped[uname];
      html += '<h3 style="margin:20px 0 10px;color:#8B0000">📌 ' + uname + ' (' + items.length + '题)</h3><div class="wrong-list">';
      items.forEach(function(item) {
        var sq = item.qt.length > 50 ? item.qt.substring(0, 50) + '...' : item.qt;
        html += '<div class="wrong-item"><span class="w-icon">❌</span><div class="w-info"><div class="w-title" title="' + item.qt.replace(/"/g, '&quot;') + '">' + sq + '</div><div class="w-meta">' + item.uname + '</div></div><span class="w-count">错' + item.wrongCount + '次</span></div>';
      });
      html += '</div>';
    }
    document.getElementById('w-list-view').innerHTML = html;
  }

  function buildQs() {
    var result = [];
    getAllWrongQuestions().forEach(function(w) {
      var unit = findUnit(w.unitId);
      if (!unit) return;
      var q = unit.questions.find(function(q) { return q.id === w.questionId; });
      if (q) {
        var indices = q.opts.map(function(_, i) { return i; });
        var s = shuffle(indices);
        var c = Object.assign({}, q);
        c.unitId = w.unitId; c.unitName = unit.name; c.wrongCount = w.wrongCount;
        c.shuffledOpts = s.map(function(i) { return q.opts[i]; });
        c._shuffledAns = Array.isArray(q.ans) ? q.ans.map(function(a) { return s.indexOf(a); }).sort(function(a, b) { return a - b; }) : s.indexOf(q.ans);
        result.push(c);
      }
    });
    return shuffle(result);
  }

  function startReview() {
    wQs = buildQs(); wIdx = 0; wAns = {};
    if (wQs.length === 0) {
      document.getElementById('w-review-content').innerHTML = '<div class="empty-state"><div class="icon">🎉</div><p>没有错题可复习！</p></div>';
      document.getElementById('w-review-bottom').innerHTML = '';
      document.getElementById('w-sidebar-grid').innerHTML = '';
      return;
    }
    renderWQ(); updateWProgress(); renderWSidebar();
  }

  function renderWSidebar() {
    var html = '';
    for (var i = 0; i < wQs.length; i++) {
      var cls = 'sidebar-num';
      if (i === wIdx) cls += ' current';
      else if (wAns[wQs[i].id] !== undefined) cls += ' answered';
      html += '<div class="' + cls + '" onclick="wrongPage.jump(' + i + ')">' + (i + 1) + '</div>';
    }
    document.getElementById('w-sidebar-grid').innerHTML = html;
  }

  function jump(i) { wIdx = i; renderWQ(); updateWProgress(); renderWSidebar(); window.scrollTo(0, 0); }

  function renderWQ() {
    var q = wQs[wIdx], opts = q.shuffledOpts || q.opts, realAns = q._shuffledAns;
    var isMulti = q.type === 'multi', userAns = wAns[q.id], showResult = userAns !== undefined;
    var letters = 'ABCDEFGHIJ';

    var html = '<div class="question-card"><span class="question-num">第 ' + (wIdx + 1) + ' 题</span>' +
      (isMulti ? '<span class="type-badge multi">多选</span>' : '<span class="type-badge single">单选</span>') +
      '<span style="margin-left:8px;color:#999;font-size:0.85rem">' + q.unitName + ' · 错过' + q.wrongCount + '次</span>' +
      '<div class="question-text">' + q.q + '</div>' +
      '<div style="font-size:0.85rem;color:#999;margin-bottom:8px">' + (isMulti ? '（可多选）' : '（单选）') + '</div>' +
      '<div class="options-list">';

    opts.forEach(function(opt, i) {
      var isSelected = Array.isArray(userAns) ? userAns.indexOf(i) >= 0 : (userAns === i);
      var isCorrect = Array.isArray(realAns) ? realAns.indexOf(i) >= 0 : (realAns === i);
      var cls = 'option-item';
      if (showResult) { cls += ' disabled'; if (isCorrect) cls += ' correct'; else if (isSelected && !isCorrect) cls += ' wrong'; }
      else if (isSelected) cls += ' selected';
      html += '<div class="' + cls + '" data-idx="' + i + '">' +
        (isMulti ? '<span class="checkmark"></span>' : '<span class="option-letter">' + letters[i] + '</span>') +
        '<span class="option-text">' + opt + '</span></div>';
    });

    html += '</div>';
    if (showResult) {
      if (wIsCorrect(userAns, realAns)) html += '<div class="feedback correct-fb show">✅ 正确！已从错题本移除</div>';
      else {
        var cs = Array.isArray(realAns) ? realAns.map(function(a) { return letters[a] + '. ' + opts[a]; }).join('；') : letters[realAns] + '. ' + opts[realAns];
        html += '<div class="feedback wrong-fb show">❌ 错误！正确答案：<strong>' + cs + '</strong></div>';
      }
    }
    html += '</div>';
    document.getElementById('w-review-content').innerHTML = html;

    if (!showResult) {
      document.querySelectorAll('#w-review-content .option-item').forEach(function(item) {
        item.addEventListener('click', function() { wHandleAns(parseInt(this.dataset.idx), isMulti); });
      });
    }
    renderWBottom();
  }

  function wIsCorrect(u, r) {
    if (u === undefined) return false;
    if (Array.isArray(r) && Array.isArray(u)) { if (r.length !== u.length) return false; var s = u.slice().sort(function(a, b) { return a - b; }); return r.every(function(v, i) { return v === s[i]; }); }
    if (!Array.isArray(r) && !Array.isArray(u)) return u === r;
    return false;
  }

  function wHandleAns(oi, isMulti) {
    var q = wQs[wIdx], ra = q._shuffledAns;
    if (isMulti) {
      var cur = wAns[q.id]; if (!Array.isArray(cur)) cur = [];
      var idx = cur.indexOf(oi); if (idx >= 0) cur.splice(idx, 1); else cur.push(oi);
      cur.sort(function(a, b) { return a - b; }); wAns[q.id] = cur;
    } else {
      wAns[q.id] = oi;
      if (wIsCorrect(oi, ra)) {
        removeWrongQuestion(q.unitId, q.id);
        wQs = buildQs();
        if (wQs.length === 0) {
          document.getElementById('w-review-content').innerHTML = '<div class="empty-state"><div class="icon">🎉</div><p>全部错题已清除！</p></div>';
          document.getElementById('w-review-bottom').innerHTML = ''; updateWProgress(); document.getElementById('w-sidebar-grid').innerHTML = '';
          return;
        }
        if (wIdx >= wQs.length) wIdx = wQs.length - 1;
      } else { addWrongQuestion(q.unitId, q.id); }
    }
    renderWQ(); renderWSidebar();
  }

  function renderWBottom() {
    var isLast = wIdx >= wQs.length - 1;
    var html = '<button class="btn btn-outline" onclick="wrongPage.prev()" ' + (wIdx <= 0 ? 'disabled' : '') + '>← 上一题</button>';
    html += '<span style="font-size:0.9rem;color:#666">' + (wIdx + 1) + ' / ' + wQs.length + '</span>';
    if (isLast) html += '<button class="btn btn-primary" onclick="wrongPage.finish()">完成 ✓</button>';
    else html += '<button class="btn btn-primary" onclick="wrongPage.next()">下一题 →</button>';
    document.getElementById('w-review-bottom').innerHTML = html;
  }

  function wNext() { if (wIdx < wQs.length - 1) { wIdx++; renderWQ(); updateWProgress(); renderWSidebar(); window.scrollTo(0, 0); } }
  function wPrev() { if (wIdx > 0) { wIdx--; renderWQ(); updateWProgress(); renderWSidebar(); window.scrollTo(0, 0); } }
  function updateWProgress() {
    if (wQs.length === 0) { document.getElementById('w-progress-fill').style.width = '0%'; document.getElementById('w-progress-text').textContent = ''; return; }
    document.getElementById('w-progress-fill').style.width = Math.round((wIdx + 1) / wQs.length * 100) + '%';
    document.getElementById('w-progress-text').textContent = '第 ' + (wIdx + 1) + ' 题 / 共 ' + wQs.length + ' 题';
  }

  function wFinish() {
    var remaining = getAllWrongQuestions().length;
    document.getElementById('w-review-content').innerHTML = '<div class="result-card"><h2>复习完成！</h2><p style="margin:16px 0;font-size:1.2rem">剩余错题: <strong style="color:#C62828;font-size:2.5rem">' + remaining + '</strong> 道</p>' + (remaining === 0 ? '<p style="color:#2E7D32;font-weight:600;font-size:1.1rem">🎉 全部掌握！</p>' : '<p>继续加油！</p>') + '</div>';
    document.getElementById('w-review-bottom').innerHTML = '<button class="btn btn-primary" onclick="wrongPage.startReview()">再次复习</button>';
  }

  function clearAll() { if (confirm('确定清空所有错题记录？不可撤销。')) { localStorage.removeItem('xixiang_wrong_book'); renderList(); } }

  return {
    start: start,
    switchMode: switchWMode,
    toggleSidebar: toggleSidebar,
    jump: jump,
    next: wNext, prev: wPrev,
    finish: wFinish,
    clearAll: clearAll,
    startReview: startReview
  };
})();

// ====== Keyboard ======
document.addEventListener('keydown', function(e) {
  if (currentPage !== 'unit') return;

  try {
    var q = unitPage._q ? unitPage._q() : null;
    if (!q) return;
    // Keyboard handling done via inline onclick bindings
  } catch(ex) {}
});

// Init
(function init() {
  var h = location.hash;
  if (h.indexOf('#unit/') === 0) goUnit(parseInt(h.split('/')[1]));
  else if (h === '#wrong') goWrong();
  else goHome();
})();
