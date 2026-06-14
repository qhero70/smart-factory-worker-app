/**
 * 24_派班報工每日結算正式模組
 * 專案：製造部智慧製造應用總部
 * 版本：v24.1.0
 *
 * 目的：
 * 1. 將 10_今日派班表 與 09_派班報工紀錄做每日結算。
 * 2. 產生 24_派班報工日結、24_未報工追蹤、24_派班效率統計。
 * 3. 提供 LINE / 戰情 / AI 摘要可直接讀取的日結資料。
 *
 * API action：
 * - 派班報工日結健康檢查
 * - 產生派班報工日結
 * - 取得派班報工日結
 */

var 派班報工日結_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

function 派班報工日結_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '派班報工日結健康檢查') return { ok: true, 模組: '24_派班報工每日結算', 版本: 'v24.1.0', 時間: 派班報工日結_現在_() };
  if (action === '產生派班報工日結') return 產生派班報工日結(payload);
  if (action === '取得派班報工日結') return 取得派班報工日結(payload);
  return null;
}

function 產生派班報工日結(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = 派班報工日結_取得試算表_();
    var sh今日 = ss.getSheetByName('10_今日派班表');
    var sh報工 = ss.getSheetByName('09_派班報工紀錄');
    var sh日結 = 派班報工日結_確保工作表_(ss, '24_派班報工日結', 派班報工日結_日結欄位_(), '#0f766e');
    var sh未報 = 派班報工日結_確保工作表_(ss, '24_未報工追蹤', 派班報工日結_未報工欄位_(), '#9a3412');
    var sh效率 = 派班報工日結_確保工作表_(ss, '24_派班效率統計', 派班報工日結_效率欄位_(), '#1d4ed8');
    var sh紀錄 = 派班報工日結_確保工作表_(ss, '24_派班報工日結紀錄', 派班報工日結_紀錄欄位_(), '#374151');

    if (!sh今日 || sh今日.getLastRow() < 2) return 派班報工日結_寫紀錄並回傳_(sh紀錄, false, '10_今日派班表沒有資料', 0, 0, 0, 0, 0);

    var workDate = String(payload['作業日'] || '').trim() || 派班報工日結_日期文字_(new Date());
    var shift = String(payload['班別'] || '').trim();
    var rebuild = payload['重建'] !== false;
    var batch = 'DAY-CLOSE-' + 派班報工日結_批次時間_();
    var now = 派班報工日結_現在_();

    var dispatchRows = 派班報工日結_讀工作表物件_(sh今日).rows.filter(function(item) {
      var r = item.data;
      if (派班報工日結_日期文字_(r['作業日']) !== workDate) return false;
      if (shift && String(r['班別'] || '').trim() !== shift) return false;
      return true;
    });

    var reportRows = sh報工 && sh報工.getLastRow() >= 2 ? 派班報工日結_讀工作表物件_(sh報工).rows.filter(function(item) {
      var r = item.data;
      if (派班報工日結_日期文字_(r['作業日']) !== workDate) return false;
      if (shift && String(r['班別'] || '').trim() !== shift) return false;
      return true;
    }) : [];

    if (rebuild) {
      派班報工日結_刪除同作業日_(sh日結, '作業日', workDate);
      派班報工日結_刪除同作業日_(sh未報, '作業日', workDate);
      派班報工日結_刪除同作業日_(sh效率, '作業日', workDate);
    }

    var reportByDispatch = 派班報工日結_彙總報工_(reportRows, '今日派班編號');
    var personMap = {};
    var stationMap = {};
    var missingRows = [];

    dispatchRows.forEach(function(item) {
      var d = item.data;
      var dispatchId = String(d['今日派班編號'] || '').trim();
      var personKey = [d['班別'] || '', d['工號'] || '', d['姓名'] || '', d['部門'] || '', d['組別'] || ''].join('｜');
      var stationKey = [d['班別'] || '', d['報工工站名稱'] || d['工站名稱'] || '', d['工站名稱'] || '', d['工序'] || '', d['主機台'] || ''].join('｜');
      var report = reportByDispatch[dispatchId] || { 良品數: 0, 不良數: 0, 報工數: 0, 筆數: 0 };
      var dispatchQty = Number(d['派工量'] || d['計畫量'] || 0);
      var reportStatus = String(d['報工狀態'] || '').trim();
      var isDone = reportStatus === '已報工' || report.報工數 > 0;
      var isPartial = reportStatus === '部分報工';
      var isMissing = !isDone && !isPartial;

      if (!personMap[personKey]) personMap[personKey] = 派班報工日結_空人員彙總_(batch, workDate, d);
      派班報工日結_累加彙總_(personMap[personKey], dispatchQty, report, isDone, isPartial, isMissing);

      if (!stationMap[stationKey]) stationMap[stationKey] = 派班報工日結_空工站彙總_(batch, workDate, d);
      派班報工日結_累加彙總_(stationMap[stationKey], dispatchQty, report, isDone, isPartial, isMissing);
      stationMap[stationKey].人員集合[String(d['工號'] || d['姓名'] || dispatchId)] = true;

      if (isMissing) missingRows.push(派班報工日結_未報工列_(batch, workDate, d, now));
    });

    var dayRows = Object.keys(personMap).map(function(k) { return 派班報工日結_完成彙總列_(personMap[k], now); });
    var effRows = Object.keys(stationMap).map(function(k) { return 派班報工日結_完成效率列_(stationMap[k], now); });

    if (dayRows.length) sh日結.getRange(sh日結.getLastRow() + 1, 1, dayRows.length, 派班報工日結_日結欄位_().length).setValues(dayRows);
    if (missingRows.length) sh未報.getRange(sh未報.getLastRow() + 1, 1, missingRows.length, 派班報工日結_未報工欄位_().length).setValues(missingRows);
    if (effRows.length) sh效率.getRange(sh效率.getLastRow() + 1, 1, effRows.length, 派班報工日結_效率欄位_().length).setValues(effRows);

    派班報工日結_套格式_(sh日結, '#0f766e');
    派班報工日結_套格式_(sh未報, '#9a3412');
    派班報工日結_套格式_(sh效率, '#1d4ed8');

    var msg = '日結完成：派班 ' + dispatchRows.length + ' 筆，報工 ' + reportRows.length + ' 筆，日結 ' + dayRows.length + ' 筆，未報工 ' + missingRows.length + ' 筆，效率 ' + effRows.length + ' 筆';
    派班報工日結_寫紀錄_(sh紀錄, batch, '產生派班報工日結', workDate, dispatchRows.length, reportRows.length, dayRows.length, missingRows.length, effRows.length, '成功', msg);

    return { ok: true, message: msg, 批次編號: batch, 作業日: workDate, 派班筆數: dispatchRows.length, 報工筆數: reportRows.length, 日結筆數: dayRows.length, 未報工筆數: missingRows.length, 效率筆數: effRows.length, 時間: now };
  } finally {
    lock.releaseLock();
  }
}

function 取得派班報工日結(payload) {
  payload = payload || {};
  var ss = 派班報工日結_取得試算表_();
  var sh = ss.getSheetByName('24_派班報工日結');
  if (!sh || sh.getLastRow() < 2) return { ok: false, message: '24_派班報工日結沒有資料', data: [] };
  var workDate = String(payload['作業日'] || '').trim() || 派班報工日結_日期文字_(new Date());
  var data = 派班報工日結_讀工作表物件_(sh).rows.map(function(x){ return x.data; }).filter(function(r){ return 派班報工日結_日期文字_(r['作業日']) === workDate; });
  return { ok: true, message: '取得派班報工日結 ' + data.length + ' 筆', 作業日: workDate, 筆數: data.length, data: data };
}

function 派班報工日結_空人員彙總_(batch, workDate, d) {
  return { 結算批次: batch, 作業日: workDate, 班別: d['班別'] || '', 工號: d['工號'] || '', 姓名: d['姓名'] || '', 部門: d['部門'] || '', 組別: d['組別'] || '', 派班筆數: 0, 已報工派班數: 0, 部分報工派班數: 0, 未報工派班數: 0, 派工量合計: 0, 良品數: 0, 不良數: 0, 報工數: 0 };
}

function 派班報工日結_空工站彙總_(batch, workDate, d) {
  return { 結算批次: batch, 作業日: workDate, 班別: d['班別'] || '', 報工工站名稱: d['報工工站名稱'] || '', 工站名稱: d['工站名稱'] || '', 工序: d['工序'] || '', 主機台: d['主機台'] || '', 派班筆數: 0, 已報工派班數: 0, 部分報工派班數: 0, 未報工派班數: 0, 派工量合計: 0, 良品數: 0, 不良數: 0, 報工數: 0, 人員集合: {} };
}

function 派班報工日結_累加彙總_(sum, dispatchQty, report, isDone, isPartial, isMissing) {
  sum.派班筆數 += 1;
  sum.派工量合計 += Number(dispatchQty || 0);
  sum.良品數 += Number(report.良品數 || 0);
  sum.不良數 += Number(report.不良數 || 0);
  sum.報工數 += Number(report.報工數 || 0);
  if (isDone) sum.已報工派班數 += 1;
  else if (isPartial) sum.部分報工派班數 += 1;
  else if (isMissing) sum.未報工派班數 += 1;
}

function 派班報工日結_完成彙總列_(s, now) {
  var remain = Math.max(Number(s.派工量合計 || 0) - Number(s.良品數 || 0), 0);
  var completeRate = s.派工量合計 > 0 ? s.良品數 / s.派工量合計 : 0;
  var badRate = s.報工數 > 0 ? s.不良數 / s.報工數 : 0;
  var status = s.未報工派班數 > 0 ? '有未報工' : (s.部分報工派班數 > 0 ? '部分完成' : '完成');
  return [s.結算批次, s.作業日, s.班別, s.工號, s.姓名, s.部門, s.組別, s.派班筆數, s.已報工派班數, s.部分報工派班數, s.未報工派班數, s.派工量合計, s.良品數, s.不良數, s.報工數, remain, completeRate, badRate, status, now];
}

function 派班報工日結_完成效率列_(s, now) {
  var completeRate = s.派工量合計 > 0 ? s.良品數 / s.派工量合計 : 0;
  var badRate = s.報工數 > 0 ? s.不良數 / s.報工數 : 0;
  var status = s.未報工派班數 > 0 ? '有未報工' : (s.部分報工派班數 > 0 ? '部分完成' : '完成');
  return [s.結算批次, s.作業日, s.班別, s.報工工站名稱, s.工站名稱, s.工序, s.主機台, s.派班筆數, s.派工量合計, s.良品數, s.不良數, s.報工數, completeRate, badRate, Object.keys(s.人員集合 || {}).length, status, now];
}

function 派班報工日結_未報工列_(batch, workDate, d, now) {
  var id = 'MISS-' + workDate.replace(/-/g, '') + '-' + String(d['今日派班編號'] || '').replace(/[^A-Za-z0-9]/g, '').slice(-10);
  return [id, batch, workDate, d['班別'] || '', d['工號'] || '', d['姓名'] || '', d['部門'] || '', d['組別'] || '', d['報工工站名稱'] || '', d['工站名稱'] || '', d['工序'] || '', d['工單編號'] || '', d['工序明細編號'] || '', d['產品編號'] || '', d['客戶品號'] || '', d['品名'] || '', Number(d['派工量'] || d['計畫量'] || 0), d['報工狀態'] || '', '待確認', '請班長確認是否補報工或改派', now];
}

function 派班報工日結_彙總報工_(items, keyName) {
  var map = {};
  items.forEach(function(item) {
    var r = item.data;
    var k = String(r[keyName] || '').trim();
    if (!k) return;
    if (!map[k]) map[k] = { 良品數: 0, 不良數: 0, 報工數: 0, 筆數: 0 };
    map[k].良品數 += Number(r['良品數'] || 0);
    map[k].不良數 += Number(r['不良數'] || 0);
    map[k].報工數 += Number(r['報工數'] || 0) || (Number(r['良品數'] || 0) + Number(r['不良數'] || 0));
    map[k].筆數 += 1;
  });
  return map;
}

function 派班報工日結_日結欄位_() { return ['結算批次','作業日','班別','工號','姓名','部門','組別','派班筆數','已報工派班數','部分報工派班數','未報工派班數','派工量合計','良品數','不良數','報工數','剩餘量','完成率','不良率','狀態','建立時間']; }
function 派班報工日結_未報工欄位_() { return ['追蹤編號','結算批次','作業日','班別','工號','姓名','部門','組別','報工工站名稱','工站名稱','工序','工單編號','工序明細編號','產品編號','客戶品號','品名','派工量','報工狀態','逾期狀態','建議處理','建立時間']; }
function 派班報工日結_效率欄位_() { return ['結算批次','作業日','班別','報工工站名稱','工站名稱','工序','主機台','派班筆數','派工量合計','良品數','不良數','報工數','完成率','不良率','人員數','狀態','建立時間']; }
function 派班報工日結_紀錄欄位_() { return ['結算批次','時間戳','動作','作業日','派班筆數','報工筆數','日結筆數','未報工筆數','效率筆數','狀態','訊息','建立時間']; }

function 派班報工日結_寫紀錄並回傳_(sh, ok, message, dispatchCount, reportCount, dayCount, missingCount, effCount) {
  var batch = 'DAY-CLOSE-' + 派班報工日結_批次時間_();
  派班報工日結_寫紀錄_(sh, batch, '產生派班報工日結', 派班報工日結_日期文字_(new Date()), dispatchCount, reportCount, dayCount, missingCount, effCount, ok ? '成功' : '失敗', message);
  return { ok: ok, message: message, 批次編號: batch };
}

function 派班報工日結_寫紀錄_(sh, batch, action, workDate, dispatchCount, reportCount, dayCount, missingCount, effCount, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 12).setValues([[batch, new Date(), action, workDate, dispatchCount || 0, reportCount || 0, dayCount || 0, missingCount || 0, effCount || 0, status || '', message || '', 派班報工日結_現在_()]]);
}

function 派班報工日結_刪除同作業日_(sh, colName, workDate) {
  if (!sh || sh.getLastRow() < 2) return;
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v){ return String(v || '').trim(); });
  var col = headers.indexOf(colName);
  if (col < 0) return;
  for (var i = values.length - 1; i >= 1; i--) {
    if (派班報工日結_日期文字_(values[i][col]) === workDate) sh.deleteRow(i + 1);
  }
}

function 派班報工日結_確保工作表_(ss, name, headers, color) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  派班報工日結_套格式_(sh, color);
  return sh;
}

function 派班報工日結_讀工作表物件_(sh) {
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v){ return String(v || '').trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var empty = true, obj = {};
    headers.forEach(function(h, c){ obj[h] = values[i][c]; if (values[i][c] !== '' && values[i][c] !== null) empty = false; });
    if (!empty) rows.push({ rowIndex: i + 1, data: obj, headers: headers });
  }
  return { headers: headers, rows: rows };
}

function 派班報工日結_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 派班報工日結_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 派班報工日結_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  var s = String(v).replace(/^['"]|['"]$/g, '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd'); }
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function 派班報工日結_套格式_(sh, color) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#0f766e').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 20)); } catch (err) {}
}

function 派班報工日結_批次時間_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'); }
function 派班報工日結_現在_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'); }

function 測試_派班報工日結健康檢查() { return 派班報工日結_嘗試處理動作_({ action: '派班報工日結健康檢查' }); }
function 測試_產生派班報工日結() { return 派班報工日結_嘗試處理動作_({ action: '產生派班報工日結' }); }
function 測試_取得派班報工日結() { return 派班報工日結_嘗試處理動作_({ action: '取得派班報工日結' }); }
