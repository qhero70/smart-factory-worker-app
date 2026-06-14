/**
 * 22_派班報工防重複超量保護正式模組
 * 專案：製造部智慧製造應用總部
 * 版本：v22.1.0
 *
 * 功能：
 * 1. 攔截 action = 寫入今日派班報工。
 * 2. 防止同一筆今日派班已完成後重複扣量。
 * 3. 防止 120 秒內同派班、同人、同數量連點重送。
 * 4. 防止良品數超過 10_工單工序明細.剩餘量。
 * 5. 成功後寫入 09_派班報工紀錄，並回寫 10_今日派班表 / 10_工單工序明細 / 10_工單主檔。
 */

var 派班報工防呆_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

function 派班報工防呆_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();

  if (action === '派班報工防呆健康檢查') {
    return { ok: true, 模組: '22_派班報工防重複超量保護', 版本: 'v22.1.0', 時間: 派班報工防呆_現在_() };
  }

  if (action === '寫入今日派班報工') return 派班報工防呆_寫入今日派班報工(payload);
  return null;
}

function 派班報工防呆_寫入今日派班報工(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = 派班報工防呆_取得試算表_();
    var sh今日 = ss.getSheetByName('10_今日派班表');
    var sh工序 = ss.getSheetByName('10_工單工序明細');
    var sh工單 = ss.getSheetByName('10_工單主檔');
    var sh報工 = 派班報工防呆_確保工作表_(ss, '09_派班報工紀錄', 派班報工防呆_報工欄位_(), '#78350f');
    var sh操作 = 派班報工防呆_確保工作表_(ss, '09_派班報工操作紀錄', 派班報工防呆_操作欄位_(), '#78350f');

    if (!sh今日 || sh今日.getLastRow() < 2) return 派班報工防呆_失敗_(sh操作, '10_今日派班表沒有資料，無法報工');
    if (!sh工序 || sh工序.getLastRow() < 2) return 派班報工防呆_失敗_(sh操作, '10_工單工序明細沒有資料，無法安全扣量');

    var dispatchId = String(payload['今日派班編號'] || payload['派班編號'] || '').trim();
    if (!dispatchId) return 派班報工防呆_失敗_(sh操作, '缺少今日派班編號');

    var goodQty = Number(payload['良品數'] || payload['完工數'] || payload['完成數'] || 0);
    var badQty = Number(payload['不良數'] || 0);
    if (isNaN(goodQty) || goodQty < 0) goodQty = 0;
    if (isNaN(badQty) || badQty < 0) badQty = 0;
    if (goodQty + badQty <= 0) return 派班報工防呆_失敗_(sh操作, '良品數 + 不良數 必須大於 0');

    var todayObj = 派班報工防呆_找列_(sh今日, '今日派班編號', dispatchId);
    if (!todayObj) return 派班報工防呆_失敗_(sh操作, '找不到今日派班編號：' + dispatchId);

    var dispatch = todayObj.data;
    var currentReportStatus = String(dispatch['報工狀態'] || '').trim();
    var currentDispatchStatus = String(dispatch['派班狀態'] || '').trim();
    if (currentReportStatus === '已報工' || currentDispatchStatus === '已完成') {
      return 派班報工防呆_阻擋_(sh操作, 'DUPLICATE_DISPATCH_REPORT', '這筆今日派班已完成，不允許重複扣量：' + dispatchId);
    }

    var workerId = String(payload['工號'] || dispatch['工號'] || '').trim();
    var workerName = String(payload['姓名'] || dispatch['姓名'] || '').trim();
    if (派班報工防呆_最近重複報工_(sh報工, dispatchId, workerId, workerName, goodQty, badQty, 120)) {
      return 派班報工防呆_阻擋_(sh操作, 'RECENT_DUPLICATE_REPORT', '疑似連點或重送，系統已阻擋本次重複報工。請刷新後確認報工紀錄。');
    }

    var stepId = String(dispatch['工序明細編號'] || '').trim();
    var workOrder = String(dispatch['工單編號'] || '').trim();
    if (!stepId) return 派班報工防呆_阻擋_(sh操作, 'STEP_ID_EMPTY', '今日派班缺少工序明細編號，無法安全扣量：' + dispatchId);

    var stepObj = 派班報工防呆_找列_(sh工序, '工序明細編號', stepId);
    if (!stepObj) return 派班報工防呆_阻擋_(sh操作, 'STEP_NOT_FOUND', '找不到工序明細，無法安全扣量：' + stepId);

    var step = stepObj.data;
    var plan = Number(step['計畫量'] || 0);
    var oldGood = Number(step['已完成量'] || 0);
    var oldBad = Number(step['不良量'] || 0);
    var remainBefore = Number(step['剩餘量']);
    if (isNaN(remainBefore)) remainBefore = Math.max(plan - oldGood, 0);

    if (goodQty > remainBefore) {
      return 派班報工防呆_阻擋_(sh操作, 'OVER_REMAINING_QTY', '良品數不可超過工序剩餘量。剩餘量=' + remainBefore + '，本次良品數=' + goodQty);
    }

    var now = 派班報工防呆_現在_();
    var reportId = 'RPT-DSP-' + 派班報工防呆_批次時間_();
    var remainAfter = Math.max(remainBefore - goodQty, 0);
    var reportStatus = remainAfter === 0 ? '已報工' : '部分報工';
    var dispatchQty = Number(dispatch['派工量'] || 0);

    var reportRow = {
      '報工編號': reportId,
      '報工時間': now,
      '作業日': 派班報工防呆_日期文字_(dispatch['作業日'] || new Date()),
      '班別': dispatch['班別'] || payload['班別'] || '',
      '工號': workerId,
      '姓名': workerName,
      '部門': dispatch['部門'] || '',
      '組別': dispatch['組別'] || '',
      '今日派班編號': dispatchId,
      '原派班編號': dispatch['原派班編號'] || '',
      '工序明細編號': stepId,
      '工單編號': workOrder,
      '產品編號': dispatch['產品編號'] || '',
      '客戶品號': dispatch['客戶品號'] || '',
      '品名': dispatch['品名'] || '',
      '報工工站名稱': dispatch['報工工站名稱'] || '',
      '工站名稱': dispatch['工站名稱'] || '',
      '工序': dispatch['工序'] || '',
      '主機台': dispatch['主機台'] || '',
      '機台編號清單': dispatch['機台編號清單'] || '',
      '派工量': dispatchQty,
      '良品數': goodQty,
      '不良數': badQty,
      '報工數': goodQty + badQty,
      '剩餘量_報工前': remainBefore,
      '剩餘量_報工後': remainAfter,
      '報工狀態': reportStatus,
      '異常註記': payload['異常註記'] || '',
      '備註': payload['備註'] || '',
      '建立時間': now,
      '更新時間': now
    };

    var reportHeaders = 派班報工防呆_報工欄位_();
    sh報工.getRange(sh報工.getLastRow() + 1, 1, 1, reportHeaders.length)
      .setValues([reportHeaders.map(function(h) { return 派班報工防呆_正規值_(reportRow[h]); })]);
    派班報工防呆_套格式_(sh報工, '#78350f');

    派班報工防呆_回寫今日派班_(sh今日, todayObj.rowIndex, reportStatus, now, reportId);
    派班報工防呆_回寫工序_(sh工序, stepObj, goodQty, badQty, now);
    if (workOrder && sh工單) 派班報工防呆_回寫工單_(ss, sh工單, workOrder, now);

    派班報工防呆_寫操作紀錄_(sh操作, 'WRITE-RPT-' + 派班報工防呆_批次時間_(), '寫入今日派班報工_防呆版', 1, 0, 1, 0, '成功', '報工完成：' + reportId);

    return {
      ok: true,
      message: '報工完成',
      防呆版: true,
      報工編號: reportId,
      今日派班編號: dispatchId,
      工序明細編號: stepId,
      工單編號: workOrder,
      良品數: goodQty,
      不良數: badQty,
      剩餘量_報工前: remainBefore,
      剩餘量_報工後: remainAfter,
      報工狀態: reportStatus,
      時間: now
    };
  } finally {
    lock.releaseLock();
  }
}

function 派班報工防呆_報工欄位_() {
  return ['報工編號','報工時間','作業日','班別','工號','姓名','部門','組別','今日派班編號','原派班編號','工序明細編號','工單編號','產品編號','客戶品號','品名','報工工站名稱','工站名稱','工序','主機台','機台編號清單','派工量','良品數','不良數','報工數','剩餘量_報工前','剩餘量_報工後','報工狀態','異常註記','備註','建立時間','更新時間'];
}

function 派班報工防呆_操作欄位_() {
  return ['批次編號','時間戳','動作','今日派班筆數','可報工筆數','寫入報工筆數','錯誤筆數','狀態','訊息','建立時間'];
}

function 派班報工防呆_回寫今日派班_(sh, rowIndex, status, now, reportId) {
  var headers = 派班報工防呆_取表頭_(sh);
  派班報工防呆_設值_(sh, headers, rowIndex, '報工狀態', status);
  派班報工防呆_設值_(sh, headers, rowIndex, '現場確認', '已確認');
  派班報工防呆_設值_(sh, headers, rowIndex, '派班狀態', status === '已報工' ? '已完成' : '部分完成');
  派班報工防呆_設值_(sh, headers, rowIndex, '備註', '已報工編號：' + reportId + '；防重複/超量保護已啟用');
  派班報工防呆_設值_(sh, headers, rowIndex, '更新時間', now);
}

function 派班報工防呆_回寫工序_(sh, stepObj, goodQty, badQty, now) {
  var headers = stepObj.headers;
  var step = stepObj.data;
  var plan = Number(step['計畫量'] || 0);
  var oldGood = Number(step['已完成量'] || 0);
  var oldBad = Number(step['不良量'] || 0);
  var newGood = oldGood + goodQty;
  var newBad = oldBad + badQty;
  var remain = Math.max(plan - newGood, 0);
  var status = remain <= 0 ? '已完成' : '生產中';

  派班報工防呆_設值_(sh, headers, stepObj.rowIndex, '已完成量', newGood);
  派班報工防呆_設值_(sh, headers, stepObj.rowIndex, '不良量', newBad);
  派班報工防呆_設值_(sh, headers, stepObj.rowIndex, '剩餘量', remain);
  派班報工防呆_設值_(sh, headers, stepObj.rowIndex, '狀態', status);
  派班報工防呆_設值_(sh, headers, stepObj.rowIndex, '備註', '派班報工防呆版回寫：' + now);
  派班報工防呆_設值_(sh, headers, stepObj.rowIndex, '更新時間', now);
}

function 派班報工防呆_回寫工單_(ss, sh工單, workOrder, now) {
  var found = 派班報工防呆_找列_(sh工單, '工單編號', workOrder);
  if (!found) return;
  var sh工序 = ss.getSheetByName('10_工單工序明細');
  var sum = 派班報工防呆_彙總工單工序_(sh工序, workOrder);
  var status = sum.剩餘量 <= 0 ? '已完成' : '生產中';
  var headers = found.headers;

  派班報工防呆_設值_(sh工單, headers, found.rowIndex, '已完成量', sum.已完成量);
  派班報工防呆_設值_(sh工單, headers, found.rowIndex, '不良量', sum.不良量);
  派班報工防呆_設值_(sh工單, headers, found.rowIndex, '剩餘量', sum.剩餘量);
  派班報工防呆_設值_(sh工單, headers, found.rowIndex, '狀態', status);
  派班報工防呆_設值_(sh工單, headers, found.rowIndex, '備註', '派班報工防呆版彙總回寫：' + now);
  派班報工防呆_設值_(sh工單, headers, found.rowIndex, '更新時間', now);
}

function 派班報工防呆_彙總工單工序_(sh, workOrder) {
  var result = { 計畫量: 0, 已完成量: 0, 不良量: 0, 剩餘量: 0 };
  if (!sh || !workOrder || sh.getLastRow() < 2) return result;
  派班報工防呆_讀工作表物件_(sh).rows.forEach(function(item) {
    var row = item.data;
    if (String(row['工單編號'] || '').trim() !== workOrder) return;
    result.計畫量 += Number(row['計畫量'] || 0);
    result.已完成量 += Number(row['已完成量'] || 0);
    result.不良量 += Number(row['不良量'] || 0);
    result.剩餘量 += Number(row['剩餘量'] || 0);
  });
  return result;
}

function 派班報工防呆_最近重複報工_(sh, dispatchId, workerId, workerName, goodQty, badQty, seconds) {
  if (!sh || sh.getLastRow() < 2) return false;
  var rows = 派班報工防呆_讀工作表物件_(sh).rows;
  var now = new Date().getTime();
  var limit = Number(seconds || 120) * 1000;

  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i].data;
    if (String(r['今日派班編號'] || '').trim() !== dispatchId) continue;
    if (String(r['工號'] || '').trim() !== workerId && String(r['姓名'] || '').trim() !== workerName) continue;
    if (Number(r['良品數'] || 0) !== Number(goodQty || 0)) continue;
    if (Number(r['不良數'] || 0) !== Number(badQty || 0)) continue;
    var t = 派班報工防呆_轉時間_(r['報工時間'] || r['建立時間']);
    if (t && now - t.getTime() <= limit) return true;
  }
  return false;
}

function 派班報工防呆_阻擋_(sh操作, code, message) {
  派班報工防呆_寫操作紀錄_(sh操作, 'BLOCK-RPT-' + 派班報工防呆_批次時間_(), code, 1, 0, 0, 1, '阻擋', message);
  return { ok: false, code: code, message: message };
}

function 派班報工防呆_失敗_(sh操作, message) {
  if (sh操作) 派班報工防呆_寫操作紀錄_(sh操作, 'FAIL-RPT-' + 派班報工防呆_批次時間_(), '寫入今日派班報工_失敗', 1, 0, 0, 1, '失敗', message);
  return { ok: false, message: message };
}

function 派班報工防呆_確保工作表_(ss, name, headers, color) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v) { return String(v || '').trim(); });
  var missing = headers.filter(function(h) { return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  派班報工防呆_套格式_(sh, color || '#78350f');
  return sh;
}

function 派班報工防呆_找列_(sh, keyName, keyValue) {
  if (!sh || sh.getLastRow() < 2) return null;
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v) { return String(v || '').trim(); });
  var col = headers.indexOf(keyName);
  if (col < 0) return null;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][col] || '').trim() === String(keyValue || '').trim()) {
      var obj = {};
      headers.forEach(function(h, c) { obj[h] = values[i][c]; });
      return { rowIndex: i + 1, data: obj, headers: headers };
    }
  }
  return null;
}

function 派班報工防呆_讀工作表物件_(sh) {
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v) { return String(v || '').trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var empty = true;
    var obj = {};
    headers.forEach(function(h, c) {
      obj[h] = values[i][c];
      if (values[i][c] !== '' && values[i][c] !== null) empty = false;
    });
    if (!empty) rows.push({ rowIndex: i + 1, data: obj });
  }
  return { headers: headers, rows: rows };
}

function 派班報工防呆_取表頭_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(v) { return String(v || '').trim(); });
}

function 派班報工防呆_設值_(sh, headers, rowIndex, colName, value) {
  var col = headers.indexOf(colName) + 1;
  if (col > 0) sh.getRange(rowIndex, col).setValue(value);
}

function 派班報工防呆_寫操作紀錄_(sh, batch, action, todayCount, openCount, writeCount, errors, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 10).setValues([[batch, new Date(), action, todayCount || 0, openCount || 0, writeCount || 0, errors || 0, status || '', message || '', 派班報工防呆_現在_()]]);
}

function 派班報工防呆_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 派班報工防呆_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 派班報工防呆_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  var s = String(v).replace(/^['"]|['"]$/g, '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function 派班報工防呆_轉時間_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return v;
  var d = new Date(String(v).replace(/-/g, '/'));
  return isNaN(d.getTime()) ? null : d;
}

function 派班報工防呆_套格式_(sh, color) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#78350f').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 20)); } catch (err) {}
}

function 派班報工防呆_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 派班報工防呆_批次時間_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss');
}

function 派班報工防呆_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_派班報工防呆健康檢查() {
  return 派班報工防呆_嘗試處理動作_({ action: '派班報工防呆健康檢查' });
}
