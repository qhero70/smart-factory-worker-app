/**
 * 23_派班報工巡檢修復正式模組
 * 專案：製造部智慧製造應用總部
 * 版本：v23.1.0
 *
 * 目的：
 * 1. 檢查 09_派班報工紀錄、10_今日派班表、10_工單工序明細、10_工單主檔是否一致。
 * 2. 支援只巡檢、不修復；也支援安全修復。
 * 3. 修復原則：只補正缺漏或偏低的數量，不覆蓋比報工紀錄更高的現有完成量，避免破壞既有人工校正。
 *
 * API action：
 * - 派班報工巡檢健康檢查
 * - 派班報工巡檢
 * - 派班報工巡檢修復
 */

var 派班報工巡檢_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

function 派班報工巡檢_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '派班報工巡檢健康檢查') {
    return { ok: true, 模組: '23_派班報工巡檢修復', 版本: 'v23.1.0', 時間: 派班報工巡檢_現在_() };
  }
  if (action === '派班報工巡檢') return 派班報工巡檢_執行_(payload, false);
  if (action === '派班報工巡檢修復') return 派班報工巡檢_執行_(payload, true);
  return null;
}

function 派班報工巡檢_執行_(payload, doFix) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = 派班報工巡檢_取得試算表_();
    var sh報工 = ss.getSheetByName('09_派班報工紀錄');
    var sh今日 = ss.getSheetByName('10_今日派班表');
    var sh工序 = ss.getSheetByName('10_工單工序明細');
    var sh工單 = ss.getSheetByName('10_工單主檔');
    var sh紀錄 = 派班報工巡檢_確保工作表_(ss, '23_派班報工巡檢紀錄', 派班報工巡檢_紀錄欄位_(), '#1e3a8a');
    var sh明細 = 派班報工巡檢_確保工作表_(ss, '23_派班報工異常明細', 派班報工巡檢_明細欄位_(), '#7f1d1d');

    var batch = 'CHK-DSP-' + 派班報工巡檢_批次時間_();
    var now = 派班報工巡檢_現在_();
    var workDate = String(payload['作業日'] || '').trim();

    if (!sh報工 || sh報工.getLastRow() < 2) {
      派班報工巡檢_寫紀錄_(sh紀錄, batch, doFix ? '修復' : '巡檢', 0, 0, 0, 0, 0, 0, '無資料', '09_派班報工紀錄沒有資料');
      return { ok: false, message: '09_派班報工紀錄沒有資料', 異常數: 0, 修復數: 0 };
    }

    var reportsAll = 派班報工巡檢_讀工作表物件_(sh報工).rows;
    var todayRows = sh今日 ? 派班報工巡檢_讀工作表物件_(sh今日).rows : [];
    var stepRows = sh工序 ? 派班報工巡檢_讀工作表物件_(sh工序).rows : [];
    var orderRows = sh工單 ? 派班報工巡檢_讀工作表物件_(sh工單).rows : [];

    var reports = reportsAll.filter(function(item) {
      var r = item.data;
      if (workDate && 派班報工巡檢_日期文字_(r['作業日']) !== workDate) return false;
      return String(r['今日派班編號'] || '').trim() !== '' && String(r['工序明細編號'] || '').trim() !== '';
    });

    var todayMap = 派班報工巡檢_建立索引_(todayRows, '今日派班編號');
    var stepMap = 派班報工巡檢_建立索引_(stepRows, '工序明細編號');
    var orderMap = 派班報工巡檢_建立索引_(orderRows, '工單編號');
    var reportByDispatch = 派班報工巡檢_彙總報工_(reports, '今日派班編號');
    var reportByStep = 派班報工巡檢_彙總報工_(reports, '工序明細編號');
    var reportByOrder = 派班報工巡檢_彙總報工_(reports, '工單編號');

    var details = [];
    var fixCount = 0;

    Object.keys(reportByDispatch).forEach(function(dispatchId) {
      var sum = reportByDispatch[dispatchId];
      var todayObj = todayMap[dispatchId];
      if (!todayObj) {
        details.push(派班報工巡檢_明細_(batch, '派班缺漏', dispatchId, '10_今日派班表', '今日派班編號', '', dispatchId, '未修復', '報工紀錄存在，但今日派班表找不到此派班'));
        return;
      }
      var r = todayObj.data;
      var oldStatus = String(r['報工狀態'] || '').trim();
      var dispatchQty = Number(r['派工量'] || 0);
      var newStatus = dispatchQty > 0 && sum.良品數 >= dispatchQty ? '已報工' : '部分報工';
      if (oldStatus !== newStatus && oldStatus !== '已報工') {
        details.push(派班報工巡檢_明細_(batch, '派班狀態不一致', dispatchId, '10_今日派班表', '報工狀態', oldStatus, newStatus, doFix ? '已修復' : '待修復', '依 09_派班報工紀錄彙總修正'));
        if (doFix) {
          派班報工巡檢_設值_(sh今日, todayObj.headers, todayObj.rowIndex, '報工狀態', newStatus);
          派班報工巡檢_設值_(sh今日, todayObj.headers, todayObj.rowIndex, '現場確認', '已確認');
          派班報工巡檢_設值_(sh今日, todayObj.headers, todayObj.rowIndex, '派班狀態', newStatus === '已報工' ? '已完成' : '部分完成');
          派班報工巡檢_設值_(sh今日, todayObj.headers, todayObj.rowIndex, '更新時間', now);
          fixCount++;
        }
      }
    });

    Object.keys(reportByStep).forEach(function(stepId) {
      var sum = reportByStep[stepId];
      var stepObj = stepMap[stepId];
      if (!stepObj) {
        details.push(派班報工巡檢_明細_(batch, '工序缺漏', stepId, '10_工單工序明細', '工序明細編號', '', stepId, '未修復', '報工紀錄存在，但工序明細找不到此工序'));
        return;
      }
      var step = stepObj.data;
      var plan = Number(step['計畫量'] || 0);
      var oldGood = Number(step['已完成量'] || 0);
      var oldBad = Number(step['不良量'] || 0);
      var targetGood = Math.max(oldGood, sum.良品數);
      var targetBad = Math.max(oldBad, sum.不良數);
      var targetRemain = Math.max(plan - targetGood, 0);
      var oldRemain = Number(step['剩餘量']);
      if (isNaN(oldRemain)) oldRemain = Math.max(plan - oldGood, 0);
      if (oldGood < sum.良品數) {
        details.push(派班報工巡檢_明細_(batch, '工序完成量偏低', stepId, '10_工單工序明細', '已完成量', oldGood, targetGood, doFix ? '已修復' : '待修復', '已完成量低於報工紀錄良品合計'));
      }
      if (oldBad < sum.不良數) {
        details.push(派班報工巡檢_明細_(batch, '工序不良量偏低', stepId, '10_工單工序明細', '不良量', oldBad, targetBad, doFix ? '已修復' : '待修復', '不良量低於報工紀錄不良合計'));
      }
      if (oldGood < sum.良品數 || oldBad < sum.不良數 || oldRemain !== targetRemain) {
        if (doFix) {
          派班報工巡檢_設值_(sh工序, stepObj.headers, stepObj.rowIndex, '已完成量', targetGood);
          派班報工巡檢_設值_(sh工序, stepObj.headers, stepObj.rowIndex, '不良量', targetBad);
          派班報工巡檢_設值_(sh工序, stepObj.headers, stepObj.rowIndex, '剩餘量', targetRemain);
          派班報工巡檢_設值_(sh工序, stepObj.headers, stepObj.rowIndex, '狀態', targetRemain <= 0 ? '已完成' : '生產中');
          派班報工巡檢_設值_(sh工序, stepObj.headers, stepObj.rowIndex, '備註', '23_派班報工巡檢修復：' + now);
          派班報工巡檢_設值_(sh工序, stepObj.headers, stepObj.rowIndex, '更新時間', now);
          fixCount++;
        }
      }
    });

    Object.keys(reportByOrder).forEach(function(orderId) {
      if (!orderId) return;
      var orderObj = orderMap[orderId];
      if (!orderObj) {
        details.push(派班報工巡檢_明細_(batch, '工單缺漏', orderId, '10_工單主檔', '工單編號', '', orderId, '未修復', '報工紀錄存在，但工單主檔找不到此工單'));
        return;
      }
      var total = 派班報工巡檢_彙總工單工序_(stepRows, orderId);
      var order = orderObj.data;
      var oldOrderGood = Number(order['已完成量'] || 0);
      var oldOrderBad = Number(order['不良量'] || 0);
      var oldOrderRemain = Number(order['剩餘量'] || 0);
      if (oldOrderGood !== total.已完成量 || oldOrderBad !== total.不良量 || oldOrderRemain !== total.剩餘量) {
        details.push(派班報工巡檢_明細_(batch, '工單彙總不一致', orderId, '10_工單主檔', '已完成量/不良量/剩餘量', oldOrderGood + '/' + oldOrderBad + '/' + oldOrderRemain, total.已完成量 + '/' + total.不良量 + '/' + total.剩餘量, doFix ? '已修復' : '待修復', '依 10_工單工序明細重新彙總'));
        if (doFix) {
          派班報工巡檢_設值_(sh工單, orderObj.headers, orderObj.rowIndex, '已完成量', total.已完成量);
          派班報工巡檢_設值_(sh工單, orderObj.headers, orderObj.rowIndex, '不良量', total.不良量);
          派班報工巡檢_設值_(sh工單, orderObj.headers, orderObj.rowIndex, '剩餘量', total.剩餘量);
          派班報工巡檢_設值_(sh工單, orderObj.headers, orderObj.rowIndex, '狀態', total.剩餘量 <= 0 ? '已完成' : '生產中');
          派班報工巡檢_設值_(sh工單, orderObj.headers, orderObj.rowIndex, '備註', '23_派班報工巡檢修復：' + now);
          派班報工巡檢_設值_(sh工單, orderObj.headers, orderObj.rowIndex, '更新時間', now);
          fixCount++;
        }
      }
    });

    if (details.length) {
      var detailHeaders = 派班報工巡檢_明細欄位_();
      sh明細.getRange(sh明細.getLastRow() + 1, 1, details.length, detailHeaders.length).setValues(details.map(function(x) {
        return detailHeaders.map(function(h) { return 派班報工巡檢_正規值_(x[h]); });
      }));
    }

    var status = details.length ? (doFix ? '已修復' : '有異常') : '正常';
    var msg = (doFix ? '巡檢修復完成' : '巡檢完成') + '：異常 ' + details.length + ' 項，修復 ' + fixCount + ' 項';
    派班報工巡檢_寫紀錄_(sh紀錄, batch, doFix ? '修復' : '巡檢', reports.length, todayRows.length, stepRows.length, orderRows.length, details.length, fixCount, status, msg);

    return { ok: true, message: msg, 批次編號: batch, 模式: doFix ? '修復' : '巡檢', 報工筆數: reports.length, 異常數: details.length, 修復數: fixCount, 狀態: status, 時間: now };
  } finally {
    lock.releaseLock();
  }
}

function 派班報工巡檢_彙總報工_(items, keyName) {
  var map = {};
  items.forEach(function(item) {
    var r = item.data;
    var k = String(r[keyName] || '').trim();
    if (!k) return;
    if (!map[k]) map[k] = { 良品數: 0, 不良數: 0, 報工數: 0, 筆數: 0 };
    map[k].良品數 += Number(r['良品數'] || 0);
    map[k].不良數 += Number(r['不良數'] || 0);
    map[k].報工數 += Number(r['報工數'] || 0);
    map[k].筆數 += 1;
  });
  return map;
}

function 派班報工巡檢_彙總工單工序_(stepRows, orderId) {
  var result = { 計畫量: 0, 已完成量: 0, 不良量: 0, 剩餘量: 0 };
  stepRows.forEach(function(item) {
    var r = item.data;
    if (String(r['工單編號'] || '').trim() !== String(orderId || '').trim()) return;
    result.計畫量 += Number(r['計畫量'] || 0);
    result.已完成量 += Number(r['已完成量'] || 0);
    result.不良量 += Number(r['不良量'] || 0);
    result.剩餘量 += Number(r['剩餘量'] || 0);
  });
  return result;
}

function 派班報工巡檢_建立索引_(items, keyName) {
  var map = {};
  items.forEach(function(item) {
    var k = String(item.data[keyName] || '').trim();
    if (k) map[k] = item;
  });
  return map;
}

function 派班報工巡檢_明細_(batch, type, key, sheet, field, oldValue, newValue, status, message) {
  return { 巡檢批次: batch, 異常類型: type, 主鍵: key, 工作表: sheet, 欄位: field, 原值: oldValue, 建議值: newValue, 修復狀態: status, 訊息: message, 建立時間: 派班報工巡檢_現在_() };
}

function 派班報工巡檢_紀錄欄位_() {
  return ['巡檢批次','時間戳','模式','報工筆數','今日派班筆數','工序筆數','工單筆數','異常數','修復數','狀態','訊息','建立時間'];
}

function 派班報工巡檢_明細欄位_() {
  return ['巡檢批次','異常類型','主鍵','工作表','欄位','原值','建議值','修復狀態','訊息','建立時間'];
}

function 派班報工巡檢_寫紀錄_(sh, batch, mode, reportCount, todayCount, stepCount, orderCount, issueCount, fixCount, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 12).setValues([[batch, new Date(), mode, reportCount || 0, todayCount || 0, stepCount || 0, orderCount || 0, issueCount || 0, fixCount || 0, status || '', message || '', 派班報工巡檢_現在_()]]);
}

function 派班報工巡檢_確保工作表_(ss, name, headers, color) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v) { return String(v || '').trim(); });
  var missing = headers.filter(function(h) { return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#1e3a8a').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 16)); } catch (err) {}
  return sh;
}

function 派班報工巡檢_讀工作表物件_(sh) {
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v) { return String(v || '').trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var empty = true;
    var obj = {};
    headers.forEach(function(h, c) { obj[h] = values[i][c]; if (values[i][c] !== '' && values[i][c] !== null) empty = false; });
    if (!empty) rows.push({ rowIndex: i + 1, data: obj, headers: headers });
  }
  return { headers: headers, rows: rows };
}

function 派班報工巡檢_設值_(sh, headers, rowIndex, colName, value) {
  var col = headers.indexOf(colName) + 1;
  if (col > 0) sh.getRange(rowIndex, col).setValue(value);
}

function 派班報工巡檢_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 派班報工巡檢_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 派班報工巡檢_日期文字_(v) {
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

function 派班報工巡檢_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 派班報工巡檢_批次時間_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss');
}

function 派班報工巡檢_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_派班報工巡檢健康檢查() {
  return 派班報工巡檢_嘗試處理動作_({ action: '派班報工巡檢健康檢查' });
}

function 測試_派班報工巡檢() {
  return 派班報工巡檢_嘗試處理動作_({ action: '派班報工巡檢' });
}

function 測試_派班報工巡檢修復() {
  return 派班報工巡檢_嘗試處理動作_({ action: '派班報工巡檢修復' });
}
