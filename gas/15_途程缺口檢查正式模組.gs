/**
 * 15_途程缺口檢查正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：拆工單後途程缺口整理 → 補齊 08_工站途程機台主檔 → 重跑拆工單
 *
 * 用途：
 * 1. 掃描 10_工單工序明細 中「未設定途程 / 待工程補途程」的資料。
 * 2. 彙總成產品級缺口清單。
 * 3. 產生 10_途程缺口清單，供工程端補 08_工站途程機台主檔。
 * 4. 寫入 10_途程缺口檢查紀錄。
 *
 * 注意：
 * 本檔不包含 doGet / doPost。
 */

var 途程缺口_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 途程缺口_工作表名稱_ = {
  工序明細: '10_工單工序明細',
  工單主檔: '10_工單主檔',
  途程主檔: '08_工站途程機台主檔',
  缺口清單: '10_途程缺口清單',
  檢查紀錄: '10_途程缺口檢查紀錄'
};

var 途程缺口_欄位_ = {
  缺口清單: [
    '缺口編號','產品編號','客戶品號','品名','缺口工單數','缺口工序數','計畫量合計','最早需求日','最晚需求日',
    '來源工單範例','來源需求編號範例','建議處理方式','狀態','備註','建立時間','更新時間'
  ],
  檢查紀錄: [
    '檢查批次','時間戳','工序明細筆數','缺口工序筆數','缺口產品數','狀態','訊息','建立時間'
  ]
};

function 途程缺口_產生清單(payload) {
  payload = payload || {};
  var ss = 途程缺口_取得試算表_();
  var sh明細 = ss.getSheetByName(途程缺口_工作表名稱_.工序明細);
  if (!sh明細 || sh明細.getLastRow() < 2) {
    return { ok: false, message: '10_工單工序明細沒有資料，無法產生途程缺口清單' };
  }

  var sh缺口 = 途程缺口_重建空白工作表_(ss, 途程缺口_工作表名稱_.缺口清單, 途程缺口_欄位_.缺口清單);
  var sh紀錄 = 途程缺口_確保工作表_(ss, 途程缺口_工作表名稱_.檢查紀錄, 途程缺口_欄位_.檢查紀錄);

  var data = 途程缺口_讀工作表物件_(sh明細).rows;
  var gapMap = {};
  var gapRows = [];
  var now = 途程缺口_現在_();
  var batch = payload['檢查批次'] || ('ROUTE-GAP-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));

  data.forEach(function(item) {
    var r = item.data || {};
    var station = String(r['報工工站名稱'] || r['工站名稱'] || '').trim();
    var process = String(r['工序'] || r['工序清單'] || r['工序範圍'] || '').trim();
    var isGap = station === '未設定途程' || process.indexOf('待工程補途程') >= 0 || station.indexOf('未設定') >= 0;
    if (!isGap) return;

    var key = [r['產品編號'] || '', r['客戶品號'] || '', r['品名'] || ''].join('｜');
    if (!gapMap[key]) {
      gapMap[key] = {
        產品編號: r['產品編號'] || '',
        客戶品號: r['客戶品號'] || '',
        品名: r['品名'] || '',
        工單Set: {},
        工序數: 0,
        計畫量: 0,
        dates: [],
        工單範例: r['工單編號'] || '',
        需求範例: r['來源需求編號'] || ''
      };
    }
    var g = gapMap[key];
    g.工單Set[String(r['工單編號'] || '')] = true;
    g.工序數++;
    g.計畫量 += Number(r['計畫量'] || 0);
    var d = 途程缺口_日期字串_(r['需求日期']);
    if (d) g.dates.push(d);
  });

  var keys = Object.keys(gapMap);
  keys.forEach(function(k, idx) {
    var g = gapMap[k];
    var dates = g.dates.sort();
    var row = {
      '缺口編號': 'ROUTE-GAP-' + ('0000' + (idx + 1)).slice(-4),
      '產品編號': g.產品編號,
      '客戶品號': g.客戶品號,
      '品名': g.品名,
      '缺口工單數': Object.keys(g.工單Set).filter(Boolean).length,
      '缺口工序數': g.工序數,
      '計畫量合計': g.計畫量,
      '最早需求日': dates[0] || '',
      '最晚需求日': dates[dates.length - 1] || '',
      '來源工單範例': g.工單範例,
      '來源需求編號範例': g.需求範例,
      '建議處理方式': '請補齊 08_工站途程機台主檔：產品編號 / 客戶品號 / 品名 / 報工工站名稱 / 工序 / 機台編號清單 / 主機台 / 標準產能',
      '狀態': '待補途程',
      '備註': '',
      '建立時間': now,
      '更新時間': now
    };
    gapRows.push(途程缺口_欄位_.缺口清單.map(function(h) { return 途程缺口_正規值_(row[h]); }));
  });

  if (gapRows.length) {
    sh缺口.getRange(2, 1, gapRows.length, 途程缺口_欄位_.缺口清單.length).setValues(gapRows);
    途程缺口_套格式_(sh缺口);
  }

  var msg = '已產生途程缺口產品 ' + gapRows.length + ' 筆，缺口工序 ' + Object.keys(gapMap).reduce(function(sum, k){ return sum + gapMap[k].工序數; }, 0) + ' 筆';
  途程缺口_寫檢查紀錄_(sh紀錄, batch, data.length, Object.keys(gapMap).reduce(function(sum, k){ return sum + gapMap[k].工序數; }, 0), gapRows.length, '完成', msg);

  return {
    ok: true,
    message: msg,
    檢查批次: batch,
    工序明細筆數: data.length,
    缺口產品數: gapRows.length,
    時間: now
  };
}

function 途程缺口_讀工作表物件_(sh) {
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

function 途程缺口_重建空白工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  途程缺口_套格式_(sh);
  return sh;
}

function 途程缺口_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  途程缺口_套格式_(sh);
  return sh;
}

function 途程缺口_寫檢查紀錄_(sh, batch, total, gapSteps, gapProducts, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 8).setValues([[
    batch, new Date(), total || 0, gapSteps || 0, gapProducts || 0, status || '', message || '', 途程缺口_現在_()
  ]]);
}

function 途程缺口_日期字串_(v) {
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

function 途程缺口_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 途程缺口_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 途程缺口_套格式_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 14)); } catch (err) {}
}

function 途程缺口_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 途程缺口_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_途程缺口產生清單() {
  return 途程缺口_產生清單({});
}
