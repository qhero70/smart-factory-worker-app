/**
 * 11_需求池轉工單正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：10_排程需求池 → 10_工單主檔 / 訂單管理 / 拆工單
 *
 * 用途：
 * 1. 從 10_排程需求池 讀取尚未轉工單的需求。
 * 2. 依需求編號防重複，寫入 10_工單主檔。
 * 3. 回寫 10_排程需求池 狀態 = 已轉工單。
 * 4. 寫入 10_工單轉換紀錄。
 *
 * 注意：
 * 本檔不包含 doGet / doPost，避免搶正式 Web App 入口。
 */

var 需求池轉工單_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 需求池轉工單_工作表名稱_ = {
  需求池: '10_排程需求池',
  工單主檔: '10_工單主檔',
  轉換紀錄: '10_工單轉換紀錄'
};

var 需求池轉工單_欄位_ = {
  工單主檔: [
    '工單編號','需求編號','批次編號','來源檔名','來源工作表','產品編號','客戶品號','品名','工單','類型','需求日期','計畫量','已完成量','不良量',
    '期初庫存','產能_8H','本月計畫量','本月產出量','本月出貨量','生產欠量','庫存覆蓋缺口',
    '每日班數','OEE','所需工作天','建議開工日','預計完工日','交期風險','優先級','狀態','來源需求編號','唯一鍵','備註','建立時間','更新時間'
  ],
  轉換紀錄: [
    '轉換批次','時間戳','來源需求筆數','建立工單筆數','略過筆數','錯誤筆數','狀態','訊息','建立時間'
  ]
};

function 初始化_10_工單主檔() {
  var ss = 需求池轉工單_取得試算表_();
  var sh工單 = 需求池轉工單_確保工作表_(ss, 需求池轉工單_工作表名稱_.工單主檔, 需求池轉工單_欄位_.工單主檔);
  var sh紀錄 = 需求池轉工單_確保工作表_(ss, 需求池轉工單_工作表名稱_.轉換紀錄, 需求池轉工單_欄位_.轉換紀錄);
  return {
    ok: true,
    message: '10_工單主檔初始化完成',
    工作表: [sh工單.getName(), sh紀錄.getName()],
    時間: 需求池轉工單_現在_()
  };
}

function 需求池_轉工單(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = 需求池轉工單_取得試算表_();
    var sh需求 = ss.getSheetByName(需求池轉工單_工作表名稱_.需求池);
    if (!sh需求 || sh需求.getLastRow() < 2) {
      return { ok: false, message: '10_排程需求池沒有可轉工單資料', 建立工單筆數: 0, 略過筆數: 0 };
    }

    var sh工單 = 需求池轉工單_確保工作表_(ss, 需求池轉工單_工作表名稱_.工單主檔, 需求池轉工單_欄位_.工單主檔);
    var sh紀錄 = 需求池轉工單_確保工作表_(ss, 需求池轉工單_工作表名稱_.轉換紀錄, 需求池轉工單_欄位_.轉換紀錄);

    var 需求資料 = 需求池轉工單_讀工作表物件_(sh需求);
    var 需求表頭 = 需求資料.headers;
    var rows = 需求資料.rows;
    var 狀態欄 = 需求表頭.indexOf('狀態') + 1;
    var 備註欄 = 需求表頭.indexOf('備註') + 1;
    var 更新時間欄 = 需求表頭.indexOf('更新時間') + 1;

    var 工單Headers = 需求池轉工單_欄位_.工單主檔;
    var 既有需求 = 需求池轉工單_取得既有來源需求_(sh工單, 工單Headers.indexOf('來源需求編號') + 1);
    var append = [];
    var 更新需求列 = [];
    var skipped = 0;
    var errors = 0;
    var now = 需求池轉工單_現在_();
    var 批次 = payload['轉換批次'] || ('WO-BATCH-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));

    rows.forEach(function(item) {
      var r = item.data || {};
      var rowIndex = item.rowIndex;
      var 狀態 = String(r['狀態'] || '').trim();
      var 需求編號 = String(r['需求編號'] || '').trim();
      var 數量 = Number(r['數量'] || 0);
      var 類型 = String(r['類型'] || '').trim();

      if (!需求編號) { skipped++; return; }
      if (既有需求[需求編號]) { skipped++; return; }
      if (狀態 === '已轉工單' || 狀態 === '取消' || 狀態 === '已關閉') { skipped++; return; }
      if (數量 <= 0) { skipped++; return; }
      if (payload['只轉出貨'] === true && 類型.indexOf('出貨') < 0 && 類型.indexOf('訂單') < 0) { skipped++; return; }

      try {
        var 工單編號 = 需求池轉工單_產生工單編號_(r, append.length + 1);
        var obj = {
          '工單編號': 工單編號,
          '需求編號': 需求編號,
          '批次編號': r['批次編號'] || '',
          '來源檔名': r['來源檔名'] || '',
          '來源工作表': r['來源工作表'] || '',
          '產品編號': r['產品編號'] || '',
          '客戶品號': r['客戶品號'] || '',
          '品名': r['品名'] || '',
          '工單': r['工單'] || '',
          '類型': 類型,
          '需求日期': r['需求日期'] || '',
          '計畫量': 數量,
          '已完成量': 0,
          '不良量': 0,
          '期初庫存': r['期初庫存'] || 0,
          '產能_8H': r['產能_8H'] || 0,
          '本月計畫量': r['本月計畫量'] || 0,
          '本月產出量': r['本月產出量'] || 0,
          '本月出貨量': r['本月出貨量'] || 0,
          '生產欠量': r['生產欠量'] || 0,
          '庫存覆蓋缺口': r['庫存覆蓋缺口'] || 0,
          '每日班數': r['每日班數'] || 2,
          'OEE': r['OEE'] || '',
          '所需工作天': r['所需工作天'] || '',
          '建議開工日': r['建議開工日'] || '',
          '預計完工日': r['預計完工日'] || '',
          '交期風險': r['交期風險'] || '',
          '優先級': 需求池轉工單_判斷優先級_(r),
          '狀態': '待排程',
          '來源需求編號': 需求編號,
          '唯一鍵': 需求編號,
          '備註': r['備註'] || '',
          '建立時間': now,
          '更新時間': now
        };
        append.push(工單Headers.map(function(h) { return 需求池轉工單_正規值_(obj[h]); }));
        更新需求列.push({ rowIndex: rowIndex, 工單編號: 工單編號 });
        既有需求[需求編號] = true;
      } catch (err) {
        errors++;
      }
    });

    if (append.length) {
      sh工單.getRange(sh工單.getLastRow() + 1, 1, append.length, 工單Headers.length).setValues(append);
      需求池轉工單_套格式_(sh工單, 工單Headers);
    }

    更新需求列.forEach(function(u) {
      if (狀態欄 > 0) sh需求.getRange(u.rowIndex, 狀態欄).setValue('已轉工單');
      if (備註欄 > 0) sh需求.getRange(u.rowIndex, 備註欄).setValue('已產生工單：' + u.工單編號);
      if (更新時間欄 > 0) sh需求.getRange(u.rowIndex, 更新時間欄).setValue(now);
    });

    var msg = '建立工單 ' + append.length + ' 筆，略過 ' + skipped + ' 筆，錯誤 ' + errors + ' 筆';
    需求池轉工單_寫轉換紀錄_(sh紀錄, 批次, rows.length, append.length, skipped, errors, append.length ? '成功' : '無新增', msg);

    return {
      ok: true,
      message: msg,
      轉換批次: 批次,
      來源需求筆數: rows.length,
      建立工單筆數: append.length,
      略過筆數: skipped,
      錯誤筆數: errors,
      工作表: sh工單.getName(),
      時間: now
    };
  } finally {
    lock.releaseLock();
  }
}

function 需求池轉工單_讀工作表物件_(sh) {
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

function 需求池轉工單_取得既有來源需求_(sh, col) {
  var obj = {};
  if (!col || sh.getLastRow() < 2) return obj;
  var values = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
  values.forEach(function(r) {
    var k = String(r[0] || '').trim();
    if (k) obj[k] = true;
  });
  return obj;
}

function 需求池轉工單_產生工單編號_(r, seq) {
  var dateText = String(r['需求日期'] || '').replace(/[^0-9]/g, '').slice(0, 8);
  if (!dateText) dateText = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMdd');
  var product = String(r['產品編號'] || r['品名'] || 'NA').replace(/[^A-Za-z0-9]/g, '').slice(-6);
  var no = ('000' + seq).slice(-3);
  return 'WO-' + dateText + '-' + product + '-' + no;
}

function 需求池轉工單_判斷優先級_(r) {
  var risk = String(r['交期風險'] || '').trim();
  var shortage = Number(r['庫存覆蓋缺口'] || r['生產欠量'] || 0);
  if (risk.indexOf('高') >= 0 || shortage > 0) return '高';
  if (risk.indexOf('中') >= 0) return '中';
  return '一般';
}

function 需求池轉工單_寫轉換紀錄_(sh, batch, total, created, skipped, errors, status, message) {
  var row = [batch, new Date(), total || 0, created || 0, skipped || 0, errors || 0, status || '', message || '', 需求池轉工單_現在_()];
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function 需求池轉工單_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 需求池轉工單_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 需求池轉工單_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v) { return String(v || '').trim(); });
  var missing = headers.filter(function(h) { return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  需求池轉工單_套格式_(sh, headers);
  return sh;
}

function 需求池轉工單_套格式_(sh, headers) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#12324a').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 14)); } catch (err) {}
}

function 需求池轉工單_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 需求池轉工單_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_初始化_10_工單主檔() {
  return 初始化_10_工單主檔();
}

function 測試_需求池轉工單() {
  return 需求池_轉工單({ 只轉出貨: false });
}
