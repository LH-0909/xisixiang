// 习思想题库 - SPA构建脚本
// 用法: node build.js
// 产出: 题库.html (单文件部署版)

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// Read source files
const template = fs.readFileSync(path.join(ROOT, 'build_template.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
const lib = fs.readFileSync(path.join(ROOT, 'js', 'lib.js'), 'utf8');
const storage = fs.readFileSync(path.join(ROOT, 'js', 'storage.js'), 'utf8');
const data = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const router = fs.readFileSync(path.join(ROOT, 'spa_router.js'), 'utf8');
const vip = fs.readFileSync(path.join(ROOT, 'js', 'vip_data.js'), 'utf8');

// Combined JS: lib + storage + data + app + router + vip (all inlined, no external deps)
const allJS = [
  '/* === lib.js === */', lib,
  '/* === storage.js === */', storage,
  '/* === data.js === */', data,
  '/* === app.js === */', app,
  '/* === spa_router.js === */', router,
  '/* === vip_data.js === */', vip
].join('\n');

// Replace placeholders in template
const html = template
  .replace('/*CSS_PLACEHOLDER*/', css)
  .replace('/*JS_PLACEHOLDER*/', allJS)
  .replace('</title>', '</title>\n<!-- Build: ' + new Date().toISOString().slice(0, 19).replace('T', ' ') + ' -->');

// Write output
const outPath = path.join(ROOT, '题库.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('✅ 题库.html — ' + (html.length / 1024).toFixed(0) + ' KB');
