/**
 * 27_每日自動化排程觸發器正式模組
 * 專案：製造部智慧製造應用總部
 * 版本：v27.1.0
 *
 * 目的：
 * 1. 將 23 → 24 → 25 → 26 串成每日自動化流程。
 * 2. 每日 20:10 自動巡檢修復、日結、產生 AI 戰情資料源。
 * 3. 每日 20:15 自動推播 LINE 每日戰情。
 *
 * API action：
 * - 每日自動化健康檢查
 * - 初始化_每日自動化排程觸發器
 * - 建立_每日自動化排程觸發器
 * - 刪除_每日自動化排程觸發器
 * - 執行_每日戰情資料準備
 * - 執行_每日LINE戰情推播
 * - 執行_每日戰情全流程
 */

var 每日自動化_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';
var 每日自動化_資料準備函數_ = '自動排程_每日戰情資料準備';
var 每日自動化_LINE推播函數_ = '自動排程_每日LINE戰情推播';

function 每日自動化_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '每日自動化健康檢查') return { ok: true, 模組: '27_每日自動化排程觸發器', 版本: 'v27.1.0', 時間: 每日自動化_現在_() };
  if (action === '初始化_每日自動化排程觸發器') return 初始化_每日自動化排程觸發器();
  if (action === '建立_每日自動化排程觸發器') return 建立_每日自動化排程觸發器(payload);
  if (action === '刪除_每日自動化排程觸發器') return 刪除_每日自動化排程觸發器();
  if (action === '執行_每日戰情資料準備') return 執行_每日戰情資料準備(payload);
  if (action === '執行_每日LINE戰情推播') return 執行_每日LINE戰情推播(payload);
  if (action === '執行_每日戰情全流程') return 執行_每日戰情全流程(payload);
  return null;
}

function 初始化_每日自動化排程觸發器() {
  var ss = 每日自動化_取得試算表_();
  var shLog = 每日自動化_確保工作表_(ss, '27_每日自動化排程紀錄', 每日自動化_紀錄欄位_(), '#312e81');
  var shSet = 每日自動化_確保工作表_(ss, '27_每日自動化觸發器設定', 每日自動化_設定欄位_(), '#374151');
  var shErr = 每日自動化_確保工作表_(ss, '27_每日自動化錯誤紀錄', 每日自動化_錯誤欄位_(), '#7f1d1d');
  每日自動化_寫預設設定_(shSet);
  每日自動化_寫紀錄_(shLog, 'AUTO-INIT-' + 每日自動化_批次時間_(), 每日自動化_日期文字_(new Date()), '初始化', '全部', '成功', '每日自動化排程觸發器初始化完成', '', '', '', '', 每日自動化_現在_());
  return { ok: true, message: '每日自動化排程觸發器初始化完成', 工作表: [shLog.getName(), shSet.getName(), shErr.getName()], 時間: 每日自動化_現在_() };
}

function 建立_每日自動化排程觸發器(payload) {
  payload = payload || {};
  初始化_每日自動化排程觸發器();
  刪除_每日自動化排程觸發器();

  var prepHour = Number(payload['資料準備小時'] || 20);
  var prepMinute = Number(payload['資料準備分鐘'] || 10);
  var lineHour = Number(payload['LINE推播小時'] || 20);
  var lineMinute = Number(payload['LINE推播分鐘'] || 15);

  var t1 = ScriptApp.newTrigger(每日自動化_資料準備函數_).timeBased().everyDays(1).atHour(prepHour).nearMinute(prepMinute).create();
  var t2 = ScriptApp.newTrigger(每日自動化_LINE推播函數_).timeBased().everyDays(1).atHour(lineHour).nearMinute(lineMinute).create();

  var ss = 每日自動化_取得試算表_();
  var shSet = 每日自動化_確保工作表_(ss, '27_每日自動化觸發器設定', 每日自動化_設定欄位_(), '#374151');
  var shLog = 每日自動化_確保工作表_(ss, '27_每日自動化排程紀錄', 每日自動化_紀錄欄位_(), '#312e81');

  每日自動化_重寫設定_(shSet, [
    [每日自動化_資料準備函數_, '23巡檢修復→24日結→25AI戰情資料源', 'Y', 每日自動化_時間文字_(prepHour, prepMinute), 每日自動化_觸發器ID_(t1), 每日自動化_現在_(), 每日自動化_現在_()],
    [每日自動化_LINE推播函數_, '26_LINE每日戰情推播', 'Y', 每日自動化_時間文字_(lineHour, lineMinute), 每日自動化_觸發器ID_(t2), 每日自動化_現在_(), 每日自動化_現在_()]
  ]);

  每日自動化_寫紀錄_(shLog, 'AUTO-CREATE-' + 每日自動化_批次時間_(), 每日自動化_日期文字_(new Date()), '建立觸發器', '全部', '成功', '已建立每日自動化觸發器：' + 每日自動化_時間文字_(prepHour, prepMinute) + ' / ' + 每日自動化_時間文字_(lineHour, lineMinute), '', '', '', '', 每日自動化_現在_());
  return { ok: true, message: '已建立每日自動化觸發器', 資料準備時間: 每日自動化_時間文字_(prepHour, prepMinute), LINE推播時間: 每日自動化_時間文字_(lineHour, lineMinute), 時間: 每日自動化_現在_() };
}

function 刪除_每日自動化排程觸發器() {
  var count = 0;
  ScriptApp.getProjectTriggers().forEach(function(tr) {
    var fn = tr.getHandlerFunction();
    if (fn === 每日自動化_資料準備函數_ || fn === 每日自動化_LINE推播函數_) {
      ScriptApp.deleteTrigger(tr);
      count++;
    }
  });

  var ss = 每日自動化_取得試算表_();
  var shLog = 每日自動化_確保工作表_(ss, '27_每日自動化排程紀錄', 每日自動化_紀錄欄位_(), '#312e81');
  每日自動化_寫紀錄_(shLog, 'AUTO-DELETE-' + 每日自動化_批次時間_(), 每日自動化_日期文字_(new Date()), '刪除觸發器', '全部', '成功', '已刪除每日自動化觸發器 ' + count + ' 個', '', '', '', '', 每日自動化_現在_());
  return { ok: true, message: '已刪除每日自動化觸發器 ' + count + ' 個', 刪除數: count, 時間: 每日自動化_現在_() };
}

function 自動排程_每日戰情資料準備() {
  return 執行_每日戰情資料準備({ 來源: '時間觸發器' });
}

function 自動排程_每日LINE戰情推播() {
  return 執行_每日LINE戰情推播({ 來源: '時間觸發器' });
}

function 執行_每日戰情資料準備(payload) {
  payload = payload || {};
  var batch = 'AUTO-PREP-' + 每日自動化_批次時間_();
  var workDate = String(payload['作業日'] || '').trim() || 每日自動化_日期文字_(new Date());
  var ss = 每日自動化_取得試算表_();
  var shLog = 每日自動化_確保工作表_(ss, '27_每日自動化排程紀錄', 每日自動化_紀錄欄位_(), '#312e81');
  var shErr = 每日自動化_確保工作表_(ss, '27_每日自動化錯誤紀錄', 每日自動化_錯誤欄位_(), '#7f1d1d');

  var r23 = null, r24 = null, r25 = null;
  try {
    每日自動化_確認函數_('派班報工巡檢_嘗試處理動作_');
    每日自動化_確認函數_('派班報工日結_嘗試處理動作_');
    每日自動化_確認函數_('AI戰情資料源_嘗試處理動作_');

    r23 = 派班報工巡檢_嘗試處理動作_({ action: '派班報工巡檢修復', 作業日: workDate });
    r24 = 派班報工日結_嘗試處理動作_({ action: '產生派班報工日結', 作業日: workDate });
    r25 = AI戰情資料源_嘗試處理動作_({ action: '產生AI戰情摘要資料源', 作業日: workDate });

    var ok = 每日自動化_結果OK_(r23) && 每日自動化_結果OK_(r24) && 每日自動化_結果OK_(r25);
    var status = ok ? '成功' : '部分失敗';
    var msg = '每日戰情資料準備完成：23巡檢=' + 每日自動化_短訊_(r23) + '；24日結=' + 每日自動化_短訊_(r24) + '；25AI=' + 每日自動化_短訊_(r25);
    每日自動化_寫紀錄_(shLog, batch, workDate, '每日戰情資料準備', '23→24→25', status, msg, r23, r24, r25, '', 每日自動化_現在_());
    return { ok: ok, message: msg, 批次編號: batch, 作業日: workDate, 巡檢: r23, 日結: r24, AI摘要: r25, 狀態: status, 時間: 每日自動化_現在_() };
  } catch (err) {
    var em = String(err && err.message ? err.message : err);
    每日自動化_寫錯誤_(shErr, batch, workDate, '每日戰情資料準備', em, 每日自動化_現在_());
    每日自動化_寫紀錄_(shLog, batch, workDate, '每日戰情資料準備', '23→24→25', '失敗', em, r23, r24, r25, '', 每日自動化_現在_());
    return { ok: false, message: em, 批次編號: batch, 作業日: workDate };
  }
}

function 執行_每日LINE戰情推播(payload) {
  payload = payload || {};
  var batch = 'AUTO-LINE-' + 每日自動化_批次時間_();
  var workDate = String(payload['作業日'] || '').trim() || 每日自動化_日期文字_(new Date());
  var ss = 每日自動化_取得試算表_();
  var shLog = 每日自動化_確保工作表_(ss, '27_每日自動化排程紀錄', 每日自動化_紀錄欄位_(), '#312e81');
  var shErr = 每日自動化_確保工作表_(ss, '27_每日自動化錯誤紀錄', 每日自動化_錯誤欄位_(), '#7f1d1d');

  var r26 = null;
  try {
    每日自動化_確認函數_('LINE每日戰情推播_嘗試處理動作_');
    r26 = LINE每日戰情推播_嘗試處理動作_({ action: '發送LINE每日戰情', 作業日: workDate });
    var ok = 每日自動化_結果OK_(r26);
    var status = ok ? '成功' : '失敗';
    var msg = '每日LINE戰情推播完成：' + 每日自動化_短訊_(r26);
    每日自動化_寫紀錄_(shLog, batch, workDate, '每日LINE戰情推播', '26', status, msg, '', '', '', r26, 每日自動化_現在_());
    return { ok: ok, message: msg, 批次編號: batch, 作業日: workDate, LINE推播: r26, 狀態: status, 時間: 每日自動化_現在_() };
  } catch (err) {
    var em = String(err && err.message ? err.message : err);
    每日自動化_寫錯誤_(shErr, batch, workDate, '每日LINE戰情推播', em, 每日自動化_現在_());
    每日自動化_寫紀錄_(shLog, batch, workDate, '每日LINE戰情推播', '26', '失敗', em, '', '', '', r26, 每日自動化_現在_());
    return { ok: false, message: em, 批次編號: batch, 作業日: workDate };
  }
}

function 執行_每日戰情全流程(payload) {
  payload = payload || {};
  var workDate = String(payload['作業日'] || '').trim() || 每日自動化_日期文字_(new Date());
  var prep = 執行_每日戰情資料準備({ 作業日: workDate });
  var line = 執行_每日LINE戰情推播({ 作業日: workDate });
  return { ok: 每日自動化_結果OK_(prep) && 每日自動化_結果OK_(line), message: '每日戰情全流程完成', 作業日: workDate, 資料準備: prep, LINE推播: line, 時間: 每日自動化_現在_() };
}

function 每日自動化_紀錄欄位_() { return ['批次編號','時間戳','作業日','動作','步驟','狀態','訊息','23巡檢結果','24日結結果','25AI結果','26LINE結果','建立時間']; }
function 每日自動化_設定欄位_() { return ['函數名稱','用途','啟用','預計時間','觸發器ID','建立時間','更新時間']; }
function 每日自動化_錯誤欄位_() { return ['批次編號','時間戳','作業日','動作','錯誤訊息','建立時間']; }

function 每日自動化_寫紀錄_(sh, batch, date, action, step, status, message, r23, r24, r25, r26, now) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 12).setValues([[batch, new Date(), date, action, step, status, message, 每日自動化_正規值_(r23), 每日自動化_正規值_(r24), 每日自動化_正規值_(r25), 每日自動化_正規值_(r26), now || 每日自動化_現在_()]]);
}

function 每日自動化_寫錯誤_(sh, batch, date, action, message, now) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 6).setValues([[batch, new Date(), date, action, message || '', now || 每日自動化_現在_()]]);
}

function 每日自動化_寫預設設定_(sh) {
  if (!sh || sh.getLastRow() >= 2) return;
  sh.getRange(2, 1, 2, 7).setValues([
    [每日自動化_資料準備函數_, '23巡檢修復→24日結→25AI戰情資料源', '尚未建立', '20:10', '', 每日自動化_現在_(), 每日自動化_現在_()],
    [每日自動化_LINE推播函數_, '26_LINE每日戰情推播', '尚未建立', '20:15', '', 每日自動化_現在_(), 每日自動化_現在_()]
  ]);
}

function 每日自動化_重寫設定_(sh, rows) {
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  sh.getRange(2, 1, rows.length, 7).setValues(rows);
}

function 每日自動化_確認函數_(name) {
  if (typeof this[name] !== 'function') throw new Error('找不到必要函數：' + name);
}

function 每日自動化_結果OK_(r) {
  if (!r) return false;
  if (r.ok === true) return true;
  if (r.success === true) return true;
  return false;
}

function 每日自動化_短訊_(r) {
  if (!r) return '無回傳';
  return String(r.message || r.訊息 || r.狀態 || JSON.stringify(r)).slice(0, 180);
}

function 每日自動化_時間文字_(h, m) { return ('0' + Number(h || 0)).slice(-2) + ':' + ('0' + Number(m || 0)).slice(-2); }
function 每日自動化_觸發器ID_(tr) { try { return tr.getUniqueId ? tr.getUniqueId() : ''; } catch (err) { return ''; } }

function 每日自動化_確保工作表_(ss, name, headers, color) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#312e81').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 18)); } catch (err) {}
  return sh;
}

function 每日自動化_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 每日自動化_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 每日自動化_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  var s = String(v).replace(/^['"]|['"]$/g, '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd'); }
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function 每日自動化_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 45000);
  return String(v).slice(0, 45000);
}

function 每日自動化_批次時間_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'); }
function 每日自動化_現在_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'); }

function 測試_每日自動化健康檢查() { return 每日自動化_嘗試處理動作_({ action: '每日自動化健康檢查' }); }
function 測試_初始化_每日自動化排程觸發器() { return 每日自動化_嘗試處理動作_({ action: '初始化_每日自動化排程觸發器' }); }
function 測試_建立_每日自動化排程觸發器() { return 每日自動化_嘗試處理動作_({ action: '建立_每日自動化排程觸發器' }); }
function 測試_刪除_每日自動化排程觸發器() { return 每日自動化_嘗試處理動作_({ action: '刪除_每日自動化排程觸發器' }); }
function 測試_執行_每日戰情資料準備() { return 每日自動化_嘗試處理動作_({ action: '執行_每日戰情資料準備' }); }
function 測試_執行_每日LINE戰情推播() { return 每日自動化_嘗試處理動作_({ action: '執行_每日LINE戰情推播' }); }
