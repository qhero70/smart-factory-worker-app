/**
 * 10_排程需求池後端正式模組｜v1.6.9 純模組版
 * 專案：製造部智慧製造應用總部
 * 目的：接收 production-plan-cleaner-v3.html 送出的排程需求池資料，寫入 Google Sheets。
 * 原則：不包含 doGet / doPost，避免與既有 LINE Bot、報工 API 的入口衝突。
 * 修正：
 * 1. 手動執行 寫入排程需求池() 時 payload 為 undefined 不再報錯。
 * 2. 支援 健康檢查_排程需求池。
 * 3. 支援 payload 是陣列或需求池_JSON 字串。
 */

var 排程需求池_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 排程需求池_工作表名稱_ = {
  需求池: '10_排程需求池',
  清洗紀錄: '10_生產計畫清洗紀錄',
  參數設定: '10_排程參數設定'
};

var 排程需求池_欄位_ = {
  需求池: [
    '需求編號','批次編號','來源檔名','來源工作表','產品編號','客戶品號','品名','工單','類型','需求日期','數量',
    '期初庫存','產能_8H','本月計畫量','本月產出量','本月出貨量','生產欠量','庫存覆蓋缺口',
    '每日班數','OEE','所需工作天','建議開工日','預計完工日','交期風險','狀態','唯一鍵','備註','建立時間','更新時間'
  ],
  清洗紀錄: [
    '批次編號','版本','來源檔名','匯入時間','每日明細','本月彙總','出貨訂單','需求池','錯誤','排除','寫入筆數','略過重複','狀態','訊息','建立時間'
  ],
  參數設定: [
    '項目','數值','備註','更新時間'
  ]
};

var 排程需求池_預設參數_ = [
  ['每日班數','2','每日可生產班數，V3 前端預設 2',排程需求池_現在_()],
  ['開動率','0.98','OEE 開動率',排程需求池_現在_()],
  ['性能效率','0.98','OEE 性能效率',排程需求池_現在_()],
  ['良率','0.97','排程需求池倒推用良率',排程需求池_現在_()],
  ['風險緩衝','0.15','倒推開工日安全緩衝',排程需求池_現在_()],
  ['週六是否生產','N','預設週六不排產',排程需求池_現在_()],
  ['週日是否生產','N','預設週日不排產',排程需求池_現在_()]
];

function 排程需求池_由既有doPost接入_(e) {
  var payload = 排程需求池_解析請求_(e);
  return 排程需求池_嘗試處理動作_(payload);
}

function 排程需求池_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '健康檢查' || action === '健康檢查_排程需求池') return { ok: true, 模組: '10_排程需求池後端', 時間: 排程需求池_現在_() };
  if (action === '初始化_10_排程需求池') return 初始化_10_排程需求池();
  if (action === '寫入排程需求池') return 寫入排程需求池(payload);
  return null;
}

function 初始化_10_排程需求池() {
  var ss = 排程需求池_取得試算表_();
  var sh需求 = 排程需求池_確保工作表_(ss, 排程需求池_工作表名稱_.需求池, 排程需求池_欄位_.需求池);
  var sh紀錄 = 排程需求池_確保工作表_(ss, 排程需求池_工作表名稱_.清洗紀錄, 排程需求池_欄位_.清洗紀錄);
  var sh參數 = 排程需求池_確保工作表_(ss, 排程需求池_工作表名稱_.參數設定, 排程需求池_欄位_.參數設定);
  排程需求池_補預設參數_(sh參數);
  return { ok: true, message: '10_排程需求池初始化完成', 試算表: ss.getName(), 工作表: [sh需求.getName(), sh紀錄.getName(), sh參數.getName()], 時間: 排程需求池_現在_() };
}

function 寫入排程需求池(payload) {
  payload = payload || {};
  if (Array.isArray(payload)) payload = { '需求池': payload };
  if (!payload['需求池'] && payload['需求池_JSON']) {
    try { payload['需求池'] = JSON.parse(payload['需求池_JSON']); } catch (err) { payload['需求池'] = []; }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = 排程需求池_取得試算表_();
    var sh需求 = 排程需求池_確保工作表_(ss, 排程需求池_工作表名稱_.需求池, 排程需求池_欄位_.需求池);
    var sh紀錄 = 排程需求池_確保工作表_(ss, 排程需求池_工作表名稱_.清洗紀錄, 排程需求池_欄位_.清洗紀錄);
    var sh參數 = 排程需求池_確保工作表_(ss, 排程需求池_工作表名稱_.參數設定, 排程需求池_欄位_.參數設定);
    排程需求池_補預設參數_(sh參數);

    var rows = Array.isArray(payload['需求池']) ? payload['需求池'] : [];
    if (!rows.length) {
      排程需求池_寫清洗紀錄_(sh紀錄, payload, 0, 0, '失敗', '前端沒有傳入需求池資料');
      return { ok: false, message: '沒有需求池資料。這通常代表你在 Apps Script 手動執行 寫入排程需求池()，不是從 V3 前端送資料。', 寫入筆數: 0, 略過重複: 0, 時間: 排程需求池_現在_() };
    }

    var headers = 排程需求池_欄位_.需求池;
    var existingKeys = 排程需求池_取得既有唯一鍵_(sh需求, headers.indexOf('唯一鍵') + 1);
    var append = [];
    var skipped = 0;
    var now = 排程需求池_現在_();

    rows.forEach(function (r) {
      r = r || {};
      var key = String(r['唯一鍵'] || '').trim();
      if (!key) key = 排程需求池_建立唯一鍵_(r);
      if (!key) { skipped++; return; }
      if (existingKeys[key]) { skipped++; return; }
      r['唯一鍵'] = key;
      if (!r['建立時間']) r['建立時間'] = now;
      r['更新時間'] = now;
      append.push(headers.map(function (h) { return 排程需求池_正規值_(r[h]); }));
      existingKeys[key] = true;
    });

    if (append.length) {
      sh需求.getRange(sh需求.getLastRow() + 1, 1, append.length, headers.length).setValues(append);
      排程需求池_套格式_(sh需求, headers);
    }

    var status = append.length ? '成功' : '無新增';
    var msg = '寫入 ' + append.length + ' 筆，略過重複/無效 ' + skipped + ' 筆';
    排程需求池_寫清洗紀錄_(sh紀錄, payload, append.length, skipped, status, msg);
    return { ok: true, message: msg, 批次編號: payload['批次編號'] || '', 收到筆數: rows.length, 寫入筆數: append.length, 略過重複: skipped, 工作表: sh需求.getName(), 時間: now };
  } finally {
    lock.releaseLock();
  }
}

function 排程需求池_解析請求_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    var text = String(e.postData.contents || '').trim();
    if (!text) return {};
    try { return JSON.parse(text); } catch (err) {}
    try { return JSON.parse(decodeURIComponent(text)); } catch (err2) {}
    return { action: '', 原始內容: text };
  }
  return e.parameter || {};
}

function 排程需求池_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 排程需求池_試算表ID_;
  try { if (id) return SpreadsheetApp.openById(id); } catch (err) {}
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets。請設定 Script Property：智慧製造_SPREADSHEET_ID');
  return ss;
}

function 排程需求池_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  排程需求池_確保表頭_(sh, headers);
  排程需求池_套格式_(sh, headers);
  return sh;
}

function 排程需求池_確保表頭_(sh, headers) {
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  var lastCol = Math.max(sh.getLastColumn(), headers.length);
  var current = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) { return String(v || '').trim(); });
  var changed = false;
  headers.forEach(function (h, i) {
    if (current[i] !== h) { current[i] = h; changed = true; }
  });
  if (changed) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function 排程需求池_套格式_(sh, headers) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#10253d').setFontColor('#ffffff');
  sh.autoResizeColumns(1, Math.min(headers.length, 12));
}

function 排程需求池_補預設參數_(sh) {
  var values = sh.getDataRange().getValues();
  var exists = {};
  for (var i = 1; i < values.length; i++) exists[String(values[i][0] || '').trim()] = true;
  var append = [];
  排程需求池_預設參數_.forEach(function (r) { if (!exists[String(r[0])]) append.push(r); });
  if (append.length) sh.getRange(sh.getLastRow() + 1, 1, append.length, 4).setValues(append);
}

function 排程需求池_取得既有唯一鍵_(sh, keyCol) {
  var obj = {};
  if (sh.getLastRow() < 2 || !keyCol) return obj;
  var vals = sh.getRange(2, keyCol, sh.getLastRow() - 1, 1).getValues();
  vals.forEach(function (r) { var k = String(r[0] || '').trim(); if (k) obj[k] = true; });
  return obj;
}

function 排程需求池_建立唯一鍵_(r) {
  return [r['來源工作表'] || '', r['產品編號'] || '', r['客戶品號'] || '', r['品名'] || '', r['需求日期'] || '', r['類型'] || '', r['數量'] || ''].join('｜');
}

function 排程需求池_寫清洗紀錄_(sh, payload, written, skipped, status, message) {
  payload = payload || {};
  var c = payload['清洗紀錄'] || {};
  var row = [
    payload['批次編號'] || c['批次編號'] || '',
    payload['版本'] || 'V3',
    c['來源檔名'] || payload['來源檔名'] || '',
    c['匯入時間'] || 排程需求池_現在_(),
    c['每日明細'] || c['總筆數'] || 0,
    c['本月彙總'] || 0,
    c['出貨訂單'] || 0,
    c['需求池'] || c['有效筆數'] || (Array.isArray(payload['需求池']) ? payload['需求池'].length : 0),
    c['錯誤'] || c['錯誤筆數'] || 0,
    c['排除'] || c['排除表頭'] || 0,
    written || 0,
    skipped || 0,
    status || '',
    message || '',
    排程需求池_現在_()
  ];
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function 排程需求池_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 排程需求池_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 排程需求池_輸出JSON_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj || {}, null, 2)).setMimeType(ContentService.MimeType.JSON);
}

function 測試_健康檢查_排程需求池() {
  return 排程需求池_嘗試處理動作_({ action: '健康檢查_排程需求池' });
}

function 測試_寫入排程需求池_無資料防呆() {
  return 寫入排程需求池({ action: '寫入排程需求池', 批次編號: 'TEST-NO-DATA', 需求池: [] });
}
