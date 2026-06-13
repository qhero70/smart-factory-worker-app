/**
 * 12_拆工單正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：10_工單主檔 → 拆工單 → 工站工序派工明細
 *
 * 用途：
 * 1. 從 10_工單主檔 讀取尚未拆工單的工單。
 * 2. 依 08_工站途程機台主檔 拆成工序明細。
 * 3. 寫入 10_工單工序明細。
 * 4. 回寫 10_工單主檔 狀態 = 已拆工單。
 * 5. 寫入 10_拆工單紀錄。
 *
 * 注意：
 * 本檔不包含 doGet / doPost，避免搶正式 Web App 入口。
 */

var 拆工單_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 拆工單_工作表名稱_ = {
  工單主檔: '10_工單主檔',
  工序明細: '10_工單工序明細',
  拆工單紀錄: '10_拆工單紀錄',
  途程主檔: '08_工站途程機台主檔'
};

var 拆工單_欄位_ = {
  工序明細: [
    '工序明細編號','工單編號','來源需求編號','批次編號','產品編號','客戶品號','品名','工單類型','需求日期','計畫量','已完成量','不良量','剩餘量',
    '途程順序','報工工站名稱','工站名稱','工序','工序清單','工序範圍','機台編號清單','主機台','區域清單','是否多機台','需求人力',
    '標準產能','標準工時_秒','所需工作天','建議開工日','預計完工日','前置工序明細編號','後續工序明細編號','狀態','唯一鍵','備註','建立時間','更新時間'
  ],
  拆工單紀錄: [
    '拆分批次','時間戳','來源工單筆數','建立工序筆數','無途程工單','略過筆數','錯誤筆數','狀態','訊息','建立時間'
  ]
};

function 初始化_10_工單工序明細() {
  var ss = 拆工單_取得試算表_();
  var sh明細 = 拆工單_確保工作表_(ss, 拆工單_工作表名稱_.工序明細, 拆工單_欄位_.工序明細);
  var sh紀錄 = 拆工單_確保工作表_(ss, 拆工單_工作表名稱_.拆工單紀錄, 拆工單_欄位_.拆工單紀錄);
  return {
    ok: true,
    message: '10_工單工序明細初始化完成',
    工作表: [sh明細.getName(), sh紀錄.getName()],
    時間: 拆工單_現在_()
  };
}

function 工單_拆工序(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = 拆工單_取得試算表_();
    var sh工單 = ss.getSheetByName(拆工單_工作表名稱_.工單主檔);
    if (!sh工單 || sh工單.getLastRow() < 2) {
      return { ok: false, message: '10_工單主檔沒有可拆工單資料', 建立工序筆數: 0, 略過筆數: 0 };
    }

    var sh明細 = 拆工單_確保工作表_(ss, 拆工單_工作表名稱_.工序明細, 拆工單_欄位_.工序明細);
    var sh紀錄 = 拆工單_確保工作表_(ss, 拆工單_工作表名稱_.拆工單紀錄, 拆工單_欄位_.拆工單紀錄);
    var sh途程 = ss.getSheetByName(拆工單_工作表名稱_.途程主檔);

    var 工單資料 = 拆工單_讀工作表物件_(sh工單);
    var 工單表頭 = 工單資料.headers;
    var 工單Rows = 工單資料.rows;
    var 途程Rows = sh途程 && sh途程.getLastRow() > 1 ? 拆工單_讀工作表物件_(sh途程).rows.map(function(x){ return x.data; }) : [];
    var 途程索引 = 拆工單_建立途程索引_(途程Rows);

    var 工單狀態欄 = 工單表頭.indexOf('狀態') + 1;
    var 工單備註欄 = 工單表頭.indexOf('備註') + 1;
    var 工單更新時間欄 = 工單表頭.indexOf('更新時間') + 1;

    var 明細Headers = 拆工單_欄位_.工序明細;
    var 既有工單 = 拆工單_取得既有工序工單_(sh明細, 明細Headers.indexOf('工單編號') + 1);
    var append = [];
    var 回寫工單 = [];
    var skipped = 0;
    var noRoute = 0;
    var errors = 0;
    var now = 拆工單_現在_();
    var batch = payload['拆分批次'] || ('SPLIT-BATCH-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));

    工單Rows.forEach(function(item) {
      var r = item.data || {};
      var rowIndex = item.rowIndex;
      var 工單編號 = String(r['工單編號'] || '').trim();
      var 狀態 = String(r['狀態'] || '').trim();
      var 計畫量 = Number(r['計畫量'] || 0);

      if (!工單編號) { skipped++; return; }
      if (既有工單[工單編號]) { skipped++; return; }
      if (狀態 === '已拆工單' || 狀態 === '已排程' || 狀態 === '已派工' || 狀態 === '生產中' || 狀態 === '已完成' || 狀態 === '取消') { skipped++; return; }
      if (計畫量 <= 0) { skipped++; return; }

      try {
        var routes = 拆工單_尋找途程_(途程索引, r);
        if (!routes.length) {
          noRoute++;
          routes = [拆工單_建立無途程預設工序_(r)];
        }

        var 工序IDs = routes.map(function(route, idx) {
          return 拆工單_產生工序明細編號_(工單編號, idx + 1);
        });

        routes.forEach(function(route, idx) {
          var id = 工序IDs[idx];
          var obj = {
            '工序明細編號': id,
            '工單編號': 工單編號,
            '來源需求編號': r['來源需求編號'] || r['需求編號'] || '',
            '批次編號': r['批次編號'] || '',
            '產品編號': r['產品編號'] || '',
            '客戶品號': r['客戶品號'] || '',
            '品名': r['品名'] || '',
            '工單類型': r['類型'] || '',
            '需求日期': r['需求日期'] || '',
            '計畫量': 計畫量,
            '已完成量': 0,
            '不良量': 0,
            '剩餘量': 計畫量,
            '途程順序': route['途程順序'] || (idx + 1),
            '報工工站名稱': route['報工工站名稱'] || route['工站名稱'] || '',
            '工站名稱': route['工站名稱'] || route['報工工站名稱'] || '',
            '工序': route['工序'] || route['工序範圍'] || route['工序清單'] || '',
            '工序清單': route['工序清單'] || route['工序'] || '',
            '工序範圍': route['工序範圍'] || route['工序'] || '',
            '機台編號清單': route['機台編號清單'] || route['機台清單'] || route['主機台'] || '',
            '主機台': route['主機台'] || '',
            '區域清單': route['區域清單'] || route['區域'] || '',
            '是否多機台': route['是否多機台'] || '',
            '需求人力': route['需求人力'] || 1,
            '標準產能': route['標準產能'] || r['產能_8H'] || '',
            '標準工時_秒': route['標準工時_秒'] || '',
            '所需工作天': r['所需工作天'] || '',
            '建議開工日': r['建議開工日'] || '',
            '預計完工日': r['預計完工日'] || '',
            '前置工序明細編號': idx > 0 ? 工序IDs[idx - 1] : '',
            '後續工序明細編號': idx < 工序IDs.length - 1 ? 工序IDs[idx + 1] : '',
            '狀態': idx === 0 ? '待排程' : '等待前工序',
            '唯一鍵': id,
            '備註': route['備註'] || '',
            '建立時間': now,
            '更新時間': now
          };
          append.push(明細Headers.map(function(h) { return 拆工單_正規值_(obj[h]); }));
        });

        回寫工單.push({ rowIndex: rowIndex, 工序數: routes.length });
        既有工單[工單編號] = true;
      } catch (err) {
        errors++;
      }
    });

    if (append.length) {
      sh明細.getRange(sh明細.getLastRow() + 1, 1, append.length, 明細Headers.length).setValues(append);
      拆工單_套格式_(sh明細, 明細Headers);
    }

    回寫工單.forEach(function(u) {
      if (工單狀態欄 > 0) sh工單.getRange(u.rowIndex, 工單狀態欄).setValue('已拆工單');
      if (工單備註欄 > 0) sh工單.getRange(u.rowIndex, 工單備註欄).setValue('已拆工序：' + u.工序數 + ' 道');
      if (工單更新時間欄 > 0) sh工單.getRange(u.rowIndex, 工單更新時間欄).setValue(now);
    });

    var msg = '建立工序 ' + append.length + ' 筆，無途程工單 ' + noRoute + ' 筆，略過 ' + skipped + ' 筆，錯誤 ' + errors + ' 筆';
    拆工單_寫拆工單紀錄_(sh紀錄, batch, 工單Rows.length, append.length, noRoute, skipped, errors, append.length ? '成功' : '無新增', msg);

    return {
      ok: true,
      message: msg,
      拆分批次: batch,
      來源工單筆數: 工單Rows.length,
      建立工序筆數: append.length,
      無途程工單: noRoute,
      略過筆數: skipped,
      錯誤筆數: errors,
      工作表: sh明細.getName(),
      時間: now
    };
  } finally {
    lock.releaseLock();
  }
}

function 拆工單_建立途程索引_(routes) {
  var idx = {};
  routes.forEach(function(r) {
    var keys = [
      拆工單_路由Key_(r['產品編號'], r['客戶品號'], r['品名']),
      拆工單_路由Key_(r['產品編號'], '', ''),
      拆工單_路由Key_('', r['客戶品號'], ''),
      拆工單_路由Key_('', '', r['品名'])
    ];
    keys.forEach(function(k) {
      if (!k) return;
      if (!idx[k]) idx[k] = [];
      idx[k].push(r);
    });
  });
  Object.keys(idx).forEach(function(k) {
    idx[k].sort(function(a, b) { return Number(a['途程順序'] || 999) - Number(b['途程順序'] || 999); });
  });
  return idx;
}

function 拆工單_尋找途程_(idx, workOrder) {
  var keys = [
    拆工單_路由Key_(workOrder['產品編號'], workOrder['客戶品號'], workOrder['品名']),
    拆工單_路由Key_(workOrder['產品編號'], '', ''),
    拆工單_路由Key_('', workOrder['客戶品號'], ''),
    拆工單_路由Key_('', '', workOrder['品名'])
  ];
  for (var i = 0; i < keys.length; i++) {
    if (idx[keys[i]] && idx[keys[i]].length) return idx[keys[i]];
  }
  return [];
}

function 拆工單_建立無途程預設工序_(workOrder) {
  return {
    '途程順序': 1,
    '報工工站名稱': '未設定途程',
    '工站名稱': '未設定途程',
    '工序': '待工程補途程',
    '工序清單': '待工程補途程',
    '工序範圍': '待工程補途程',
    '機台編號清單': '',
    '主機台': '',
    '區域清單': '',
    '是否多機台': '否',
    '需求人力': 1,
    '標準產能': workOrder['產能_8H'] || '',
    '標準工時_秒': '',
    '備註': '系統找不到 08_工站途程機台主檔 對應途程，已建立待補工序'
  };
}

function 拆工單_路由Key_(產品編號, 客戶品號, 品名) {
  var a = String(產品編號 || '').trim();
  var b = String(客戶品號 || '').trim();
  var c = String(品名 || '').trim();
  if (!a && !b && !c) return '';
  return [a, b, c].join('｜');
}

function 拆工單_讀工作表物件_(sh) {
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

function 拆工單_取得既有工序工單_(sh, col) {
  var obj = {};
  if (!col || sh.getLastRow() < 2) return obj;
  var values = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
  values.forEach(function(r) {
    var k = String(r[0] || '').trim();
    if (k) obj[k] = true;
  });
  return obj;
}

function 拆工單_產生工序明細編號_(工單編號, seq) {
  return 工單編號 + '-OP' + ('000' + seq).slice(-3);
}

function 拆工單_寫拆工單紀錄_(sh, batch, total, created, noRoute, skipped, errors, status, message) {
  var row = [batch, new Date(), total || 0, created || 0, noRoute || 0, skipped || 0, errors || 0, status || '', message || '', 拆工單_現在_()];
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function 拆工單_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 拆工單_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 拆工單_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v) { return String(v || '').trim(); });
  var missing = headers.filter(function(h) { return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  拆工單_套格式_(sh, headers);
  return sh;
}

function 拆工單_套格式_(sh, headers) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#4a1d5f').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 14)); } catch (err) {}
}

function 拆工單_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 拆工單_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_初始化_10_工單工序明細() {
  return 初始化_10_工單工序明細();
}

function 測試_拆工單() {
  return 工單_拆工序({});
}
