/* === 习思想题库 - DOM相关工具 + VIP门控 === */
/* 注意：纯函数已移至 lib.js，持久化函数已移至 storage.js */

// ====== 获取 URL 参数 ======

function getUrlParam(name) {
  var url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// ====== DOM 辅助 ======

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

// ====== VIP Password Gate ======

var VIP_PASSWORD = '1739819660';

function promptVipPassword(callback) {
  var pwd = prompt('🔒 VIP套题需要输入访问密码：');
  if (pwd === VIP_PASSWORD) {
    unlockVip();
    alert('✅ 密码正确，已解锁VIP套题！');
    if (callback) callback();
  } else if (pwd !== null) {
    alert('❌ 密码错误，请重试。');
  }
}
