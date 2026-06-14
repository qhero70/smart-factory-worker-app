/**
 * 26_LINE每日戰情推播正式模組
 * 專案：製造部智慧製造應用總部
 * 版本：v26.1.0
 *
 * 目的：
 * 1. 讀取 25_LINE每日摘要佇列 的待發送訊息。
 * 2. 使用 LINE Messaging API 推送給指定主管、群組或聊天室。
 * 3. 回寫發送狀態與發送時間。
 * 4. 建立推播紀錄與錯誤紀錄。
 *
 * 必要 Script Properties：
 * - LINE_CHANNEL_ACCESS_TOKEN
 * - LINE_TARGET_ID 或 LINE_TARGET_IDS
 *
 * API action：
 * - LINE每日戰情推播健康檢查
 * - 初始化_LINE每日戰情推播
 * - 發送LINE每日戰情
 * - 取得LINE每日摘要佇列
 */

var LINE每日戰情推播_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

function LINE每日戰情推播_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === 'LINE每日戰情推播健康檢查') return { ok: true, 模組: '26_LINE每日戰情推播', 版本: 'v26.1.0', 時間: LINE每日戰情推播_現在_() };
  if (action === '初始化_LINE每日戰情推播') return 初始化_LINE每日戰情推播();
  if (action === '發送LINE每日戰情') return 發送LINE每日戰情(payload);
  if (action === '取得LINE每日摘要佇列') return 取得LINE每日摘要佇列(payload);
  return null;
}

function 初始化_LINE每日戰情推播() {
  var ss = LINE每日戰情推播_取得試算表_();
  var shQueue = LINE每日戰情推播_確保工作表_(ss, '25_LINE每日摘要佇列', LINE每日戰情推播_佇列欄位_(), '#166534');
  var shLog = LINE每日戰情推播_確保工作表_(ss, '26_LINE推播紀錄', LINE每日戰情推播_紀錄欄位_(), '#075985');
  var shErr = LINE每日戰情推播_確保工作表_(ss, '26_LINE推播錯誤紀錄', LINE每日戰情推播_錯誤欄位_(), '#7f1d1d');
  var shSet = LINE每日戰情推播_確保工作表_(ss, '26_LINE推播設定', LINE每日戰情推播_設定欄位_(), '#374151');
  LINE每日戰情推播_補預設設定_(shSet);
  return { ok: true, message: 'LINE每日戰情推播初始化完成', 工作表: [shQueue.getName(), shLog.getName(), shErr.getName(), shSet.getName()], 時間: LINE每日戰情推播_現在_() };
}

function 發送LINE每日戰情(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = LINE每日戰情推播_取得試算表_();
    var shQueue = LINE每日戰情推播_確保工作表_(ss, '25_LINE每日摘要佇列', LINE每日戰情推播_佇列欄位_(), '#166534');
    var shLog = LINE每日戰情推播_確保工作表_(ss, '26_LINE推播紀錄', LINE每日戰情推播_紀錄欄位_(), '#075985');
    var shErr = LINE每日戰情推播_確保工作表_(ss, '26_LINE推播錯誤紀錄', LINE每日戰情推播_錯誤欄位_(), '#7f1d1d');

    var workDate = String(payload['作業日'] || '').trim() || LINE每日戰情推播_日期文字_(new Date());
    var dryRun = payload['測試模式'] === true || String(payload['測試模式'] || '').toUpperCase() === 'TRUE';
    var force = payload['強制重送'] === true || String(payload['強制重送'] || '').toUpperCase() === 'TRUE';
    var targetOverride = String(payload['LINE_TARGET_ID'] || payload['目標ID'] || '').trim();
    var batch = 'LINE-BATTLE-' + LINE每日戰情推播_批次時間_();
    var now = LINE每日戰情推播_現在_();

    if (shQueue.getLastRow() < 2) {
      LINE每日戰情推播_寫紀錄_(shLog, batch, workDate, 0, 0, 0, '無資料', '25_LINE每日摘要佇列沒有資料', now);
      return { ok: false, message: '25_LINE每日摘要佇列沒有資料', 批次編號: batch };
    }

    var qObj = LINE每日戰情推播_讀工作表物件_(shQueue);
    var pending = qObj.rows.filter(function(item) {
      var r = item.data;
      if (LINE每日戰情推播_日期文字_(r['作業日']) !== workDate) return false;
      var st = String(r['發送狀態'] || '').trim();
      if (force) return st !== '已發送';
      return st === '' || st === '待發送' || st === '發送失敗';
    });

    if (!pending.length) {
      LINE每日戰情推播_寫紀錄_(shLog, batch, workDate, 0, 0, 0, '無待發送', '沒有符合條件的待發送訊息', now);
      return { ok: true, message: '沒有符合條件的待發送訊息', 批次編號: batch, 發送筆數: 0 };
    }

    var token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
    var targets = LINE每日戰情推播_取得目標_(targetOverride);
    if (!dryRun && !token) return LINE每日戰情推播_失敗_(shLog, shErr, batch, workDate, '缺少 LINE_CHANNEL_ACCESS_TOKEN', pending.length, now);
    if (!dryRun && !targets.length) return LINE每日戰情推播_失敗_(shLog, shErr, batch, workDate, '缺少 LINE_TARGET_ID 或 LINE_TARGET_IDS', pending.length, now);

    var success = 0;
    var fail = 0;
    var lastError = '';

    pending.forEach(function(item) {
      var r = item.data;
      var message = LINE每日戰情推播_整理訊息_(r['訊息內容'] || r['LINE摘要文字'] || '');
      if (!message) {
        fail++;
        lastError = '訊息內容空白';
        LINE每日戰情推播_寫錯誤_(shErr, batch, workDate, r['摘要批次'] || '', '訊息內容空白', now);
        LINE每日戰情推播_更新佇列_(shQueue, item, '發送失敗', '', now);
        return;
      }

      try {
        if (dryRun) {
          LINE每日戰情推播_更新佇列_(shQueue, item, '測試完成', '', now);
          success++;
          return;
        }
        LINE每日戰情推播_送出LINE_(token, targets, message);
        LINE每日戰情推播_更新佇列_(shQueue, item, '已發送', now, now);
        success++;
      } catch (err) {
        fail++;
        lastError = String(err && err.message ? err.message : err);
        LINE每日戰情推播_更新佇列_(shQueue, item, '發送失敗', '', now);
        LINE每日戰情推播_寫錯誤_(shErr, batch, workDate, r['摘要批次'] || '', lastError, now);
      }
    });

    var status = fail ? '部分失敗' : (dryRun ? '測試完成' : '成功');
    var msg = (dryRun ? 'LINE每日戰情測試完成' : 'LINE每日戰情推播完成') + '：成功 ' + success + ' 筆，失敗 ' + fail + ' 筆';
    LINE每日戰情推播_寫紀錄_(shLog, batch, workDate, pending.length, success, fail, status, msg + (lastError ? '；最後錯誤：' + lastError : ''), now);
    return { ok: fail === 0, message: msg, 批次編號: batch, 作業日: workDate, 待發送筆數: pending.length, 成功筆數: success, 失敗筆數: fail, 測試模式: dryRun, 狀態: status, 時間: now };
  } finally {
    lock.releaseLock();
  }
}

function 取得LINE每日摘要佇列(payload) {
  payload = payload || {};
  var ss = LINE每日戰情推播_取得試算表_();
  var sh = ss.getSheetByName('25_LINE每日摘要佇列');
  if (!sh || sh.getLastRow() < 2) return { ok: false, message: '25_LINE每日摘要佇列沒有資料', data: [] };
  var workDate = String(payload['作業日'] || '').trim() || LINE每日戰情推播_日期文字_(new Date());
  var data = LINE每日戰情推播_讀工作表物件_(sh).rows.map(function(x){ return x.data; }).filter(function(r){ return LINE每日戰情推播_日期文字_(r['作業日']) === workDate; });
  return { ok: true, message: '取得 LINE 每日摘要佇列 ' + data.length + ' 筆', 作業日: workDate, 筆數: data.length, data: data };
}

function LINE每日戰情推播_送出LINE_(token, targets, message) {
  if (targets.length === 1) {
    LINE每日戰情推播_呼叫LINE_(token, 'https://api.line.me/v2/bot/message/push', { to: targets[0], messages: [{ type: 'text', text: message }] });
    return;
  }
  LINE每日戰情推播_呼叫LINE_(token, 'https://api.line.me/v2/bot/message/multicast', { to: targets, messages: [{ type: 'text', text: message }] });
}

function LINE每日戰情推播_呼叫LINE_(token, url, body) {
  var res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify(body), muteHttpExceptions: true });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('LINE API HTTP ' + code + '：' + text);
}

function LINE每日戰情推播_取得目標_(override) {
  if (override) return [override];
  var props = PropertiesService.getScriptProperties();
  var single = String(props.getProperty('LINE_TARGET_ID') || '').trim();
  var multi = String(props.getProperty('LINE_TARGET_IDS') || '').trim();
  if (multi) return multi.split(',').map(function(x){ return String(x).trim(); }).filter(Boolean);
  if (single) return [single];
  return [];
}

function LINE每日戰情推播_更新佇列_(sh, item, status, sendTime, updateTime) {
  LINE每日戰情推播_設值_(sh, item.headers, item.rowIndex, '發送狀態', status);
  if (sendTime) LINE每日戰情推播_設值_(sh, item.headers, item.rowIndex, '發送時間', sendTime);
  LINE每日戰情推播_設值_(sh, item.headers, item.rowIndex, '更新時間', updateTime);
}

function LINE每日戰情推播_失敗_(shLog, shErr, batch, workDate, message, pendingCount, now) {
  LINE每日戰情推播_寫錯誤_(shErr, batch, workDate, '', message, now);
  LINE每日戰情推播_寫紀錄_(shLog, batch, workDate, pendingCount || 0, 0, pendingCount || 0, '失敗', message, now);
  return { ok: false, message: message, 批次編號: batch, 待發送筆數: pendingCount || 0 };
}

function LINE每日戰情推播_整理訊息_(text) {
  text = String(text || '').trim();
  if (text.length > 4900) return text.slice(0, 4890) + '\n...';
  return text;
}

function LINE每日戰情推播_補預設設定_(sh) {
  if (!sh || sh.getLastRow() >= 2) return;
  sh.getRange(2, 1, 4, 4).setValues([
    ['LINE_CHANNEL_ACCESS_TOKEN', '請設定於 Script Properties，不要寫在表格', 'LINE Bot Channel access token', LINE每日戰情推播_現在_()],
    ['LINE_TARGET_ID', '請設定於 Script Properties，不要寫在表格', '單一群組/人員 ID', LINE每日戰情推播_現在_()],
    ['LINE_TARGET_IDS', '請設定於 Script Properties，不要寫在表格', '多目標用逗號分隔', LINE每日戰情推播_現在_()],
    ['預設發送模式', 'push/multicast', '由目標數自動判斷', LINE每日戰情推播_現在_()]
  ]);
}

function LINE每日戰情推播_佇列欄位_() { return ['摘要批次','作業日','訊息類型','訊息內容','風險等級','發送狀態','發送時間','建立時間','更新時間']; }
function LINE每日戰情推播_紀錄欄位_() { return ['推播批次','時間戳','作業日','待發送筆數','成功筆數','失敗筆數','狀態','訊息','建立時間']; }
function LINE每日戰情推播_錯誤欄位_() { return ['推播批次','時間戳','作業日','摘要批次','錯誤訊息','建立時間']; }
function LINE每日戰情推播_設定欄位_() { return ['設定項目','設定值','備註','更新時間']; }

function LINE每日戰情推播_寫紀錄_(sh, batch, date, pending, success, fail, status, message, now) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 9).setValues([[batch, new Date(), date, pending || 0, success || 0, fail || 0, status || '', message || '', now || LINE每日戰情推播_現在_()]]);
}

function LINE每日戰情推播_寫錯誤_(sh, batch, date, summaryBatch, message, now) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 6).setValues([[batch, new Date(), date, summaryBatch || '', message || '', now || LINE每日戰情推播_現在_()]]);
}

function LINE每日戰情推播_確保工作表_(ss, name, headers, color) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#075985').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 18)); } catch (err) {}
  return sh;
}

function LINE每日戰情推播_讀工作表物件_(sh) {
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

function LINE每日戰情推播_設值_(sh, headers, rowIndex, colName, value) {
  var col = headers.indexOf(colName) + 1;
  if (col > 0) sh.getRange(rowIndex, col).setValue(value);
}

function LINE每日戰情推播_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || LINE每日戰情推播_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function LINE每日戰情推播_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  var s = String(v).replace(/^['"]|['"]$/g, '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd'); }
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function LINE每日戰情推播_批次時間_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'); }
function LINE每日戰情推播_現在_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'); }

function 測試_LINE每日戰情推播健康檢查() { return LINE每日戰情推播_嘗試處理動作_({ action: 'LINE每日戰情推播健康檢查' }); }
function 測試_初始化_LINE每日戰情推播() { return LINE每日戰情推播_嘗試處理動作_({ action: '初始化_LINE每日戰情推播' }); }
function 測試_取得LINE每日摘要佇列() { return LINE每日戰情推播_嘗試處理動作_({ action: '取得LINE每日摘要佇列' }); }
function 測試_發送LINE每日戰情_測試模式() { return LINE每日戰情推播_嘗試處理動作_({ action: '發送LINE每日戰情', 測試模式: true }); }
