/**
 * 38.7｜今日任務讀取日期修正版
 * 版本：v1.7.5_38.7_task_reader_date_fix
 *
 * 目的：
 * 20_今日派班 的「作業日」在 Google Sheets 裡常是 Date 物件，
 * 舊版用 String(Date) 與 '2026-06-22' 比對會失敗，導致明明有派班卻回 0 筆。
 */

function 取得今日任務38_7_日期修正版(p) {
  p = p || {};
  var today = 今日任務38_7日期_(p.作業日 || p.date || p.workDate || (typeof 取得作業日_ === 'function' ? 取得作業日_() : new Date()));
  var workerId = 今日任務38_7工號_(p.工號 || p.workerId || p.id || p.userId || p['員工工號']);
  var rows = 今日任務38_7讀表_('20_今日派班');
  var tasks = [];
  rows.forEach(function(r){
    var rowDate = 今日任務38_7日期_(r.作業日 || r['作業日']);
    var rowWorker = 今日任務38_7工號_(r.工號 || r['工號']);
    var status = 今日任務38_7文字_(r.狀態 || r['狀態']);
    if (rowDate !== today) return;
    if (workerId && rowWorker !== workerId) return;
    if (status === '取消') return;
    tasks.push(r);
  });
  return {
    成功: true,
    success: true,
    版本: 'v1.7.5_38.7_task_reader_date_fix',
    作業日: today,
    工號: workerId,
    筆數: tasks.length,
    任務: tasks
  };
}

function 測試_今日任務讀取38_7_日期修正版() {
  return 取得今日任務38_7_日期修正版({});
}

function 今日任務38_7讀表_(sheetName) {
  if (typeof 讀表_ === 'function') return 讀表_(sheetName);
  var ss = typeof 取得試算表_ === 'function' ? 取得試算表_() : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getValues();
  var head = values[0].map(今日任務38_7文字_);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = { __列號: i + 1 };
    for (var j = 0; j < head.length; j++) obj[head[j]] = values[i][j];
    rows.push(obj);
  }
  return rows;
}

function 今日任務38_7日期_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd');
  var s = 今日任務38_7文字_(v);
  if (!s) return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
  var m = s.match(/(20\d{2})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  var d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
  return s;
}

function 今日任務38_7工號_(v) {
  return 今日任務38_7文字_(v).replace(/\s+/g, '').toLowerCase();
}

function 今日任務38_7文字_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}
