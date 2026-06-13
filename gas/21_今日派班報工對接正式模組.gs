/**
 * 21_今日派班報工對接正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：10_今日派班表 → PWA 報工入口 → 報工扣工序 / 扣工單
 *
 * 目的：
 * 1. 提供 PWA / LINE / Web API 取得今日派班作業。
 * 2. 接收現場依今日派班執行的報工資料。
 * 3. 寫入 09_派班報工紀錄。
 * 4. 回寫 10_今日派班表 報工狀態。
 * 5. 回寫 10_工單工序明細 已完成量 / 不良量 / 剩餘量 / 狀態。
 * 6. 回寫 10_工單主檔 已完成量 / 不良量 / 剩餘量 / 狀態。
 *
 * 注意：
 * 本檔不包含 doGet / doPost。
 * 要接入現有主程式 doPost 時，只需要在解析 payload 後加入：
 *
 * var 派班報工結果 = 今日派班報工_嘗試處理動作_(p);
 * if (派班報工結果) return 輸出JSON_(派班報工結果);
 */

var 今日派班報工_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 今日派班報工_工作表名稱_ = {
  今日派班表: '10_今日派班表',
  報工紀錄: '09_派班報工紀錄',
  工序明細: '10_工單工序明細',
  工單主檔: '10_工單主檔',
  操作紀錄: '09_派班報工操作紀錄'
};

var 今日派班報工_欄位_ = {
  報工紀錄: [
    '報工編號','報工時間','作業日','班別','工號','姓名','部門','組別','今日派班編號','原派班編號','工序明細編號','工單編號','產品編號','客戶品號','品名',
    '報工工站名稱','工站名稱','工序','主機台','機台編號清單','派工量','良品數','不良數','報工數','剩餘量_報工前','剩餘量_報工後','報工狀態','異常註記','備註','建立時間','更新時間'
  ],
  操作紀錄: [
    '批次編號','時間戳','動作','今日派班筆數','可報工筆數','寫入報工筆數','錯誤筆數','狀態','訊息','建立時間'
  ]
};

function 今日派班報工_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '派班報工健康檢查') return { ok: true, 模組: '21_今日派班報工對接', 時間: 今日派班報工_現在_() };
  if (action === '取得今日派班作業') return 取得今日派班作業(payload);
  if (action === '寫入今日派班報工') return 寫入今日派班報工(payload);
  if (action === '初始化_今日派班報工') return 初始化_今日派班報工();
  return null;
}

function 初始化_今日派班報工() {
  var ss = 今日派班報工_取得試算表_();
  var sh報工 = 今日派班報工_確保工作表_(ss, 今日派班報工_工作表名稱_.報工紀錄, 今日派班報工_欄位_.報工紀錄);
  var sh紀錄 = 今日派班報工_確保工作表_(ss, 今日派班報工_工作表名稱_.操作紀錄, 今日派班報工_欄位_.操作紀錄);
  return {
    ok: true,
    message: '今日派班報工初始化完成',
    工作表: [sh報工.getName(), sh紀錄.getName()],
    時間: 今日派班報工_現在_()
  };
}

function 取得今日派班作業(payload) {
  payload = payload || {};
  var ss = 今日派班報工_取得試算表_();
  var sh = ss.getSheetByName(今日派班報工_工作表名稱_.今日派班表);
  var sh紀錄 = 今日派班報工_確保工作表_(ss, 今日派班報工_工作表名稱_.操作紀錄, 今日派班報工_欄位_.操作紀錄);

  if (!sh || sh.getLastRow() < 2) {
    今日派班報工_寫操作紀錄_(sh紀錄, 'GET-DISPATCH-' + 今日派班報工_批次時間_(), '取得今日派班作業', 0, 0, 0, 0, '無資料', '10_今日派班表沒有資料');
    return { ok: false, message: '10_今日派班表沒有資料', data: [] };
  }

  var rows = 今日派班報工_讀工作表物件_(sh).rows.map(function(x){ return x.data; });
  var today = payload['作業日'] || 今日派班報工_日期文字_(new Date());
  var staffId = String(payload['工號'] || payload['員工工號'] || '').trim();
  var staffName = String(payload['姓名'] || '').trim();
  var shift = String(payload['班別'] || '').trim();
  var station = String(payload['報工工站名稱'] || payload['工站名稱'] || '').trim();
  var onlyOpen = payload['只取未報工'] !== false;

  var filtered = rows.filter(function(r) {
    if (today && 今日派班報工_日期文字_(r['作業日']) !== today) return false;
    if (staffId && String(r['工號'] || '').trim() !== staffId) return false;
    if (staffName && String(r['姓名'] || '').trim() !== staffName) return false;
    if (shift && String(r['班別'] || '').trim() !== shift) return false;
    if (station && String(r['報工工站名稱'] || r['工站名稱'] || '').trim() !== station) return false;
    if (onlyOpen && String(r['報工狀態'] || '').trim() === '已報工') return false;
    return true;
  }).map(function(r) {
    return {
      今日派班編號: r['今日派班編號'] || '',
      作業日: 今日派班報工_日期文字_(r['作業日'] || ''),
      班別: r['班別'] || '',
      工號: r['工號'] || '',
      姓名: r['姓名'] || '',
      報工工站名稱: r['報工工站名稱'] || '',
      工站名稱: r['工站名稱'] || '',
      工序: r['工序'] || '',
      工序明細編號: r['工序明細編號'] || '',
      工單編號: r['工單編號'] || '',
      產品編號: r['產品編號'] || '',
      客戶品號: r['客戶品號'] || '',
      品名: r['品名'] || '',
      主機台: r['主機台'] || '',
      機台編號清單: r['機台編號清單'] || '',
      派工量: Number(r['派工量'] || 0),
      計畫量: Number(r['計畫量'] || 0),
      報工狀態: r['報工狀態'] || '',
      現場確認: r['現場確認'] || '',
      備註: r['備註'] || ''
    };
  });

  今日派班報工_寫操作紀錄_(sh紀錄, 'GET-DISPATCH-' + 今日派班報工_批次時間_(), '取得今日派班作業', rows.length, filtered.length, 0, 0, '成功', '取得今日派班作業 ' + filtered.length + ' 筆');

  return {
    ok: true,
    message: '取得今日派班作業 ' + filtered.length + ' 筆',
    作業日: today,
    筆數: filtered.length,
    data: filtered,
    時間: 今日派班報工_現在_()
  };
}

function 寫入今日派班報工(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = 今日派班報工_取得試算表_();
    var sh今日 = ss.getSheetByName(今日派班報工_工作表名稱_.今日派班表);
    if (!sh今日 || sh今日.getLastRow() < 2) return { ok: false, message: '10_今日派班表沒有資料，無法報工' };

    var sh報工 = 今日派班報工_確保工作表_(ss, 今日派班報工_工作表名稱_.報工紀錄, 今日派班報工_欄位_.報工紀錄);
    var sh紀錄 = 今日派班報工_確保工作表_(ss, 今日派班報工_工作表名稱_.操作紀錄, 今日派班報工_欄位_.操作紀錄);
    var sh工序 = ss.getSheetByName(今日派班報工_工作表名稱_.工序明細);
    var sh工單 = ss.getSheetByName(今日派班報工_工作表名稱_.工單主檔);

    var dispatchId = String(payload['今日派班編號'] || payload['派班編號'] || '').trim();
    if (!dispatchId) return { ok: false, message: '缺少今日派班編號' };

    var goodQty = Number(payload['良品數'] || payload['完工數'] || payload['完成數'] || 0);
    var badQty = Number(payload['不良數'] || 0);
    if (isNaN(goodQty) || goodQty < 0) goodQty = 0;
    if (isNaN(badQty) || badQty < 0) badQty = 0;
    if (goodQty + badQty <= 0) return { ok: false, message: '良品數 + 不良數 必須大於 0' };

    var todayObj = 今日派班報工_找列_(sh今日, '今日派班編號', dispatchId);
    if (!todayObj) return { ok: false, message: '找不到今日派班編號：' + dispatchId };
    var r = todayObj.data;

    var now = 今日派班報工_現在_();
    var reportId = 'RPT-DSP-' + 今日派班報工_批次時間_();
    var dispatchQty = Number(r['派工量'] || 0);
    var workOrder = String(r['工單編號'] || '').trim();
    var stepId = String(r['工序明細編號'] || '').trim();

    var stepBefore = 今日派班報工_取得工序剩餘_(sh工序, stepId);
    var stepAfter = stepBefore >= 0 ? Math.max(stepBefore - goodQty, 0) : '';
    var reportStatus = (stepAfter === 0 || goodQty >= dispatchQty) ? '已報工' : '部分報工';

    var reportRow = {
      '報工編號': reportId,
      '報工時間': now,
      '作業日': 今日派班報工_日期文字_(r['作業日'] || new Date()),
      '班別': r['班別'] || payload['班別'] || '',
      '工號': payload['工號'] || r['工號'] || '',
      '姓名': payload['姓名'] || r['姓名'] || '',
      '部門': r['部門'] || '',
      '組別': r['組別'] || '',
      '今日派班編號': dispatchId,
      '原派班編號': r['原派班編號'] || '',
      '工序明細編號': stepId,
      '工單編號': workOrder,
      '產品編號': r['產品編號'] || '',
      '客戶品號': r['客戶品號'] || '',
      '品名': r['品名'] || '',
      '報工工站名稱': r['報工工站名稱'] || '',
      '工站名稱': r['工站名稱'] || '',
      '工序': r['工序'] || '',
      '主機台': r['主機台'] || '',
      '機台編號清單': r['機台編號清單'] || '',
      '派工量': dispatchQty,
      '良品數': goodQty,
      '不良數': badQty,
      '報工數': goodQty + badQty,
      '剩餘量_報工前': stepBefore >= 0 ? stepBefore : '',
      '剩餘量_報工後': stepAfter,
      '報工狀態': reportStatus,
      '異常註記': payload['異常註記'] || '',
      '備註': payload['備註'] || '',
      '建立時間': now,
      '更新時間': now
    };

    sh報工.getRange(sh報工.getLastRow() + 1, 1, 1, 今日派班報工_欄位_.報工紀錄.length)
      .setValues([今日派班報工_欄位_.報工紀錄.map(function(h){ return 今日派班報工_正規值_(reportRow[h]); })]);
    今日派班報工_套格式_(sh報工);

    今日派班報工_回寫今日派班_(sh今日, todayObj.rowIndex, reportStatus, now, '已報工編號：' + reportId);
    if (sh工序 && stepId) 今日派班報工_回寫工序_(sh工序, stepId, goodQty, badQty, now);
    if (sh工單 && workOrder) 今日派班報工_回寫工單_(sh工單, workOrder, now);

    今日派班報工_寫操作紀錄_(sh紀錄, 'WRITE-RPT-' + 今日派班報工_批次時間_(), '寫入今日派班報工', 1, 0, 1, 0, '成功', '報工完成：' + reportId);

    return {
      ok: true,
      message: '報工完成',
      報工編號: reportId,
      今日派班編號: dispatchId,
      工序明細編號: stepId,
      工單編號: workOrder,
      良品數: goodQty,
      不良數: badQty,
      報工狀態: reportStatus,
      時間: now
    };
  } finally {
    lock.releaseLock();
  }
}

function 今日派班報工_取得工序剩餘_(sh, stepId) {
  if (!sh || !stepId || sh.getLastRow() < 2) return -1;
  var obj = 今日派班報工_找列_(sh, '工序明細編號', stepId);
  if (!obj) return -1;
  var r = obj.data;
  var remain = Number(r['剩餘量']);
  if (!isNaN(remain)) return remain;
  var plan = Number(r['計畫量'] || 0);
  var done = Number(r['已完成量'] || 0);
  return Math.max(plan - done, 0);
}

function 今日派班報工_回寫今日派班_(sh, rowIndex, status, now, note) {
  var headers = 今日派班報工_取表頭_(sh);
  今日派班報工_設值_(sh, headers, rowIndex, '報工狀態', status);
  今日派班報工_設值_(sh, headers, rowIndex, '現場確認', '已確認');
  今日派班報工_設值_(sh, headers, rowIndex, '派班狀態', status === '已報工' ? '已完成' : '部分完成');
  今日派班報工_設值_(sh, headers, rowIndex, '備註', note);
  今日派班報工_設值_(sh, headers, rowIndex, '更新時間', now);
}

function 今日派班報工_回寫工序_(sh, stepId, goodQty, badQty, now) {
  var found = 今日派班報工_找列_(sh, '工序明細編號', stepId);
  if (!found) return;
  var headers = found.headers;
  var r = found.data;
  var plan = Number(r['計畫量'] || 0);
  var oldGood = Number(r['已完成量'] || 0);
  var oldBad = Number(r['不良量'] || 0);
  var newGood = oldGood + goodQty;
  var newBad = oldBad + badQty;
  var remain = Math.max(plan - newGood, 0);
  var status = remain <= 0 ? '已完成' : '生產中';

  今日派班報工_設值_(sh, headers, found.rowIndex, '已完成量', newGood);
  今日派班報工_設值_(sh, headers, found.rowIndex, '不良量', newBad);
  今日派班報工_設值_(sh, headers, found.rowIndex, '剩餘量', remain);
  今日派班報工_設值_(sh, headers, found.rowIndex, '狀態', status);
  今日派班報工_設值_(sh, headers, found.rowIndex, '備註', '派班報工回寫：' + now);
  今日派班報工_設值_(sh, headers, found.rowIndex, '更新時間', now);
}

function 今日派班報工_回寫工單_(sh, workOrder, now) {
  var found = 今日派班報工_找列_(sh, '工單編號', workOrder);
  if (!found) return;
  var ss = 今日派班報工_取得試算表_();
  var sh工序 = ss.getSheetByName(今日派班報工_工作表名稱_.工序明細);
  var sum = 今日派班報工_彙總工單工序_(sh工序, workOrder);
  var headers = found.headers;
  var status = sum.剩餘量 <= 0 ? '已完成' : '生產中';

  今日派班報工_設值_(sh, headers, found.rowIndex, '已完成量', sum.已完成量);
  今日派班報工_設值_(sh, headers, found.rowIndex, '不良量', sum.不良量);
  今日派班報工_設值_(sh, headers, found.rowIndex, '剩餘量', sum.剩餘量);
  今日派班報工_設值_(sh, headers, found.rowIndex, '狀態', status);
  今日派班報工_設值_(sh, headers, found.rowIndex, '備註', '派班報工彙總回寫：' + now);
  今日派班報工_設值_(sh, headers, found.rowIndex, '更新時間', now);
}

function 今日派班報工_彙總工單工序_(sh, workOrder) {
  var result = { 計畫量: 0, 已完成量: 0, 不良量: 0, 剩餘量: 0 };
  if (!sh || !workOrder || sh.getLastRow() < 2) return result;
  var rows = 今日派班報工_讀工作表物件_(sh).rows.map(function(x){ return x.data; })
    .filter(function(r){ return String(r['工單編號'] || '').trim() === workOrder; });

  rows.forEach(function(r) {
    result.計畫量 += Number(r['計畫量'] || 0);
    result.已完成量 += Number(r['已完成量'] || 0);
    result.不良量 += Number(r['不良量'] || 0);
    result.剩餘量 += Number(r['剩餘量'] || 0);
  });
  return result;
}

function 今日派班報工_找列_(sh, keyName, keyValue) {
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v){ return String(v || '').trim(); });
  var col = headers.indexOf(keyName);
  if (col < 0) return null;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][col] || '').trim() === String(keyValue || '').trim()) {
      var obj = {};
      headers.forEach(function(h, c){ obj[h] = values[i][c]; });
      return { rowIndex: i + 1, data: obj, headers: headers };
    }
  }
  return null;
}

function 今日派班報工_設值_(sh, headers, rowIndex, colName, value) {
  var col = headers.indexOf(colName) + 1;
  if (col > 0) sh.getRange(rowIndex, col).setValue(value);
}

function 今日派班報工_讀工作表物件_(sh) {
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v){ return String(v || '').trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var empty = true;
    var obj = {};
    headers.forEach(function(h, c){ obj[h] = values[i][c]; if (values[i][c] !== '' && values[i][c] !== null) empty = false; });
    if (!empty) rows.push({ rowIndex: i + 1, data: obj });
  }
  return { headers: headers, rows: rows };
}

function 今日派班報工_取表頭_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(v){ return String(v || '').trim(); });
}

function 今日派班報工_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var s = String(v).replace(/^['"]|['"]$/g, '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function 今日派班報工_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  今日派班報工_套格式_(sh);
  return sh;
}

function 今日派班報工_寫操作紀錄_(sh, batch, action, todayCount, openCount, writeCount, errors, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 10).setValues([[
    batch, new Date(), action, todayCount || 0, openCount || 0, writeCount || 0, errors || 0, status || '', message || '', 今日派班報工_現在_()
  ]]);
}

function 今日派班報工_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 今日派班報工_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 今日派班報工_套格式_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#78350f').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 20)); } catch (err) {}
}

function 今日派班報工_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 今日派班報工_批次時間_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss');
}

function 今日派班報工_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_初始化_今日派班報工() {
  return 初始化_今日派班報工();
}

function 測試_取得今日派班作業() {
  return 取得今日派班作業({});
}
