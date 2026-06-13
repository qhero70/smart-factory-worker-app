/**
 * 17_途程補齊工作台正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：10_途程缺口清單 → 08_工站途程補齊工作台 → 08_工站途程機台主檔
 *
 * 用途：
 * 1. 將 10_途程缺口清單 轉成工程可填寫的 08_工站途程補齊工作台。
 * 2. 依既有 08_工站途程機台主檔 找相似參考途程，降低人工補資料成本。
 * 3. 將已確認的工作台資料寫回 08_工站途程機台主檔。
 * 4. 寫回後可清空工序明細並把工單狀態退回待拆工單，準備重新拆工單。
 *
 * 注意：
 * 本檔不包含 doGet / doPost，避免搶正式 Web App 入口。
 */

var 途程補齊_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 途程補齊_工作表名稱_ = {
  缺口清單: '10_途程缺口清單',
  工作台: '08_工站途程補齊工作台',
  途程主檔: '08_工站途程機台主檔',
  工單主檔: '10_工單主檔',
  工序明細: '10_工單工序明細',
  拆工單紀錄: '10_拆工單紀錄',
  操作紀錄: '10_途程補齊操作紀錄'
};

var 途程補齊_欄位_ = {
  工作台: [
    '補齊編號','缺口編號','產品編號','客戶品號','品名','缺口工單數','缺口工序數','計畫量合計','最早需求日','最晚需求日',
    '參考來源','參考產品編號','參考客戶品號','參考品名','參考工站數','匹配分數','途程順序','報工工站名稱','工站名稱','工序','工序清單','工序範圍',
    '機台編號清單','主機台','區域清單','是否多機台','需求人力','標準產能','標準工時_秒','填寫狀態','寫回狀態','備註','建立時間','更新時間'
  ],
  途程主檔: [
    '群組ID','產品編號','客戶品號','品名','途程順序','報工工站名稱','工序清單','工序範圍','工序數','機台編號清單','主機台','區域清單','是否多機台','機台明細JSON','標準產能','標準工時_秒','需求人力','產品照片網址','產品縮圖網址','產品照片檔案ID','來源分頁','啟用','備註','更新時間','除錯狀態','去重鍵','修復前機台編號清單備份'
  ],
  操作紀錄: [
    '批次編號','時間戳','動作','來源筆數','建立筆數','寫回筆數','略過筆數','錯誤筆數','狀態','訊息','建立時間'
  ],
  工序明細: [
    '工序明細編號','工單編號','來源需求編號','批次編號','產品編號','客戶品號','品名','工單類型','需求日期','計畫量','已完成量','不良量','剩餘量',
    '途程順序','報工工站名稱','工站名稱','工序','工序清單','工序範圍','機台編號清單','主機台','區域清單','是否多機台','需求人力',
    '標準產能','標準工時_秒','所需工作天','建議開工日','預計完工日','前置工序明細編號','後續工序明細編號','狀態','唯一鍵','備註','建立時間','更新時間'
  ],
  拆工單紀錄: [
    '拆分批次','時間戳','來源工單筆數','建立工序筆數','無途程工單','略過筆數','錯誤筆數','狀態','訊息','建立時間'
  ]
};

function 初始化_08_工站途程補齊工作台() {
  var ss = 途程補齊_取得試算表_();
  var sh工作台 = 途程補齊_確保工作表_(ss, 途程補齊_工作表名稱_.工作台, 途程補齊_欄位_.工作台);
  var sh紀錄 = 途程補齊_確保工作表_(ss, 途程補齊_工作表名稱_.操作紀錄, 途程補齊_欄位_.操作紀錄);
  return {
    ok: true,
    message: '08_工站途程補齊工作台初始化完成',
    工作表: [sh工作台.getName(), sh紀錄.getName()],
    時間: 途程補齊_現在_()
  };
}

function 途程補齊_產生工作台(payload) {
  payload = payload || {};
  var ss = 途程補齊_取得試算表_();
  var sh缺口 = ss.getSheetByName(途程補齊_工作表名稱_.缺口清單);
  if (!sh缺口 || sh缺口.getLastRow() < 2) {
    return { ok: false, message: '10_途程缺口清單沒有資料，請先執行 測試_途程缺口產生清單()' };
  }

  var sh工作台 = 途程補齊_重建空白工作表_(ss, 途程補齊_工作表名稱_.工作台, 途程補齊_欄位_.工作台);
  var sh紀錄 = 途程補齊_確保工作表_(ss, 途程補齊_工作表名稱_.操作紀錄, 途程補齊_欄位_.操作紀錄);
  var sh途程 = ss.getSheetByName(途程補齊_工作表名稱_.途程主檔);

  var gaps = 途程補齊_讀工作表物件_(sh缺口).rows.map(function(x) { return x.data; });
  var routes = sh途程 && sh途程.getLastRow() > 1 ? 途程補齊_讀工作表物件_(sh途程).rows.map(function(x){ return x.data; }) : [];
  var routeGroups = 途程補齊_建立參考途程群組_(routes);
  var output = [];
  var now = 途程補齊_現在_();
  var batch = payload['批次編號'] || ('ROUTE-FILL-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));

  gaps.forEach(function(gap, idx) {
    var ref = 途程補齊_找參考途程_(gap, routeGroups);
    var refRoutes = ref.routes || [];

    if (!refRoutes.length) {
      output.push(途程補齊_工作台列_(gap, null, 1, idx + 1, ref, now));
      return;
    }

    refRoutes.forEach(function(route, rIdx) {
      output.push(途程補齊_工作台列_(gap, route, rIdx + 1, idx + 1, ref, now));
    });
  });

  if (output.length) {
    sh工作台.getRange(2, 1, output.length, 途程補齊_欄位_.工作台.length).setValues(output);
    途程補齊_套格式_(sh工作台);
    途程補齊_設定資料驗證_(sh工作台);
  }

  var msg = '已建立途程補齊工作台 ' + output.length + ' 筆，來源缺口 ' + gaps.length + ' 筆';
  途程補齊_寫操作紀錄_(sh紀錄, batch, '產生工作台', gaps.length, output.length, 0, 0, 0, '成功', msg);

  return {
    ok: true,
    message: msg,
    批次編號: batch,
    來源缺口筆數: gaps.length,
    工作台筆數: output.length,
    時間: now
  };
}

function 途程補齊_工作台列_(gap, route, routeSeq, gapSeq, ref, now) {
  route = route || {};
  ref = ref || { reason: '無參考', score: 0, routes: [] };

  var fillStatus = route && (route['報工工站名稱'] || route['工站名稱'] || route['工序清單'] || route['主機台']) ? '待確認' : '待填寫';
  var obj = {
    '補齊編號': 'ROUTE-FILL-' + ('0000' + gapSeq).slice(-4) + '-OP' + ('000' + routeSeq).slice(-3),
    '缺口編號': gap['缺口編號'] || '',
    '產品編號': gap['產品編號'] || '',
    '客戶品號': gap['客戶品號'] || '',
    '品名': gap['品名'] || '',
    '缺口工單數': gap['缺口工單數'] || 0,
    '缺口工序數': gap['缺口工序數'] || 0,
    '計畫量合計': gap['計畫量合計'] || 0,
    '最早需求日': gap['最早需求日'] || '',
    '最晚需求日': gap['最晚需求日'] || '',
    '參考來源': ref.reason || '無參考',
    '參考產品編號': route['產品編號'] || '',
    '參考客戶品號': route['客戶品號'] || '',
    '參考品名': route['品名'] || '',
    '參考工站數': ref.routes ? ref.routes.length : 0,
    '匹配分數': ref.score || 0,
    '途程順序': route['途程順序'] || routeSeq,
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
    '標準產能': route['標準產能'] || '',
    '標準工時_秒': route['標準工時_秒'] || '',
    '填寫狀態': fillStatus,
    '寫回狀態': '未寫回',
    '備註': route ? '系統帶入參考途程，請工程確認後將填寫狀態改為 已確認' : '無參考途程，請工程手動補齊',
    '建立時間': now,
    '更新時間': now
  };

  return 途程補齊_欄位_.工作台.map(function(h) { return 途程補齊_正規值_(obj[h]); });
}

function 途程補齊_寫回途程主檔(payload) {
  payload = payload || {};
  var ss = 途程補齊_取得試算表_();
  var sh工作台 = ss.getSheetByName(途程補齊_工作表名稱_.工作台);
  if (!sh工作台 || sh工作台.getLastRow() < 2) return { ok: false, message: '08_工站途程補齊工作台沒有資料' };

  var sh主檔 = 途程補齊_確保工作表_(ss, 途程補齊_工作表名稱_.途程主檔, 途程補齊_欄位_.途程主檔);
  var sh紀錄 = 途程補齊_確保工作表_(ss, 途程補齊_工作表名稱_.操作紀錄, 途程補齊_欄位_.操作紀錄);
  var dataObj = 途程補齊_讀工作表物件_(sh工作台);
  var headers = dataObj.headers;
  var rows = dataObj.rows;
  var 主檔Headers = 途程補齊_取表頭_(sh主檔);
  var existingKeys = 途程補齊_取得途程既有鍵_(sh主檔);
  var append = [];
  var updateRows = [];
  var skipped = 0;
  var errors = 0;
  var now = 途程補齊_現在_();
  var batch = payload['批次編號'] || ('ROUTE-WRITE-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));

  rows.forEach(function(item) {
    var r = item.data || {};
    var fillStatus = String(r['填寫狀態'] || '').trim();
    var writeStatus = String(r['寫回狀態'] || '').trim();
    if (writeStatus === '已寫回') { skipped++; return; }
    if (fillStatus !== '已確認' && fillStatus !== '待寫回') { skipped++; return; }

    var required = ['產品編號','報工工站名稱','工序清單','機台編號清單'];
    var missing = required.filter(function(k) { return !String(r[k] || '').trim(); });
    if (missing.length) { errors++; return; }

    var key = 途程補齊_途程鍵_(r);
    if (existingKeys[key]) { skipped++; updateRows.push({ rowIndex: item.rowIndex, status: '重複略過' }); return; }

    var obj = {
      '群組ID': r['產品編號'] + '-' + ('000' + Number(r['途程順序'] || 1)).slice(-3),
      '產品編號': r['產品編號'] || '',
      '客戶品號': r['客戶品號'] || '',
      '品名': r['品名'] || '',
      '途程順序': r['途程順序'] || 1,
      '報工工站名稱': r['報工工站名稱'] || '',
      '工序清單': r['工序清單'] || r['工序'] || '',
      '工序範圍': r['工序範圍'] || r['工序清單'] || r['工序'] || '',
      '工序數': 途程補齊_估工序數_(r['工序清單'] || r['工序'] || ''),
      '機台編號清單': r['機台編號清單'] || '',
      '主機台': r['主機台'] || String(r['機台編號清單'] || '').split(/[、,，\s]+/)[0] || '',
      '區域清單': r['區域清單'] || '',
      '是否多機台': r['是否多機台'] || (String(r['機台編號清單'] || '').split(/[、,，\s]+/).filter(Boolean).length > 1 ? '是' : '否'),
      '機台明細JSON': '',
      '標準產能': r['標準產能'] || '',
      '標準工時_秒': r['標準工時_秒'] || '',
      '需求人力': r['需求人力'] || 1,
      '產品照片網址': '',
      '產品縮圖網址': '',
      '產品照片檔案ID': '',
      '來源分頁': '08_工站途程補齊工作台',
      '啟用': '是',
      '備註': '由途程補齊工作台寫回；補齊編號=' + (r['補齊編號'] || ''),
      '更新時間': now,
      '除錯狀態': '途程補齊寫回',
      '去重鍵': key,
      '修復前機台編號清單備份': ''
    };

    append.push(主檔Headers.map(function(h) { return 途程補齊_正規值_(obj[h]); }));
    existingKeys[key] = true;
    updateRows.push({ rowIndex: item.rowIndex, status: '已寫回' });
  });

  if (append.length) {
    sh主檔.getRange(sh主檔.getLastRow() + 1, 1, append.length, 主檔Headers.length).setValues(append);
    途程補齊_套格式_(sh主檔);
  }

  var c寫回 = headers.indexOf('寫回狀態') + 1;
  var c更新 = headers.indexOf('更新時間') + 1;
  updateRows.forEach(function(u) {
    if (c寫回 > 0) sh工作台.getRange(u.rowIndex, c寫回).setValue(u.status);
    if (c更新 > 0) sh工作台.getRange(u.rowIndex, c更新).setValue(now);
  });

  var msg = '寫回途程主檔 ' + append.length + ' 筆，略過 ' + skipped + ' 筆，錯誤 ' + errors + ' 筆';
  途程補齊_寫操作紀錄_(sh紀錄, batch, '寫回途程主檔', rows.length, 0, append.length, skipped, errors, append.length ? '成功' : '無新增', msg);

  return { ok: true, message: msg, 寫回筆數: append.length, 略過筆數: skipped, 錯誤筆數: errors, 時間: now };
}

function 途程補齊_重拆前清理(payload) {
  payload = payload || {};
  var ss = 途程補齊_取得試算表_();
  var sh明細 = 途程補齊_重建空白工作表_(ss, 途程補齊_工作表名稱_.工序明細, 途程補齊_欄位_.工序明細);
  var sh紀錄拆 = 途程補齊_重建空白工作表_(ss, 途程補齊_工作表名稱_.拆工單紀錄, 途程補齊_欄位_.拆工單紀錄);
  var sh工單 = ss.getSheetByName(途程補齊_工作表名稱_.工單主檔);
  var resetCount = 0;
  var now = 途程補齊_現在_();

  if (sh工單 && sh工單.getLastRow() > 1) {
    var values = sh工單.getDataRange().getValues();
    var headers = values[0].map(function(v){ return String(v || '').trim(); });
    var c狀態 = headers.indexOf('狀態');
    var c備註 = headers.indexOf('備註');
    var c更新 = headers.indexOf('更新時間');
    for (var i = 1; i < values.length; i++) {
      if (c狀態 >= 0 && String(values[i][c狀態] || '').trim() === '已拆工單') {
        values[i][c狀態] = '待拆工單';
        if (c備註 >= 0) values[i][c備註] = '途程補齊後重拆準備';
        if (c更新 >= 0) values[i][c更新] = now;
        resetCount++;
      }
    }
    sh工單.getRange(1, 1, values.length, values[0].length).setValues(values);
  }

  var sh紀錄 = 途程補齊_確保工作表_(ss, 途程補齊_工作表名稱_.操作紀錄, 途程補齊_欄位_.操作紀錄);
  var batch = payload['批次編號'] || ('ROUTE-RESET-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));
  var msg = '已清空工序明細與拆工單紀錄，重設待拆工單 ' + resetCount + ' 筆';
  途程補齊_寫操作紀錄_(sh紀錄, batch, '重拆前清理', 0, 0, 0, 0, 0, '成功', msg);
  return { ok: true, message: msg, 重設工單筆數: resetCount, 時間: now };
}

function 途程補齊_建立參考途程群組_(routes) {
  var groups = [];
  var byProduct = {};
  routes.forEach(function(r) {
    var p = String(r['產品編號'] || '').trim();
    if (!p) return;
    if (!byProduct[p]) byProduct[p] = [];
    byProduct[p].push(r);
  });
  Object.keys(byProduct).forEach(function(p) {
    var list = byProduct[p].sort(function(a,b){ return Number(a['途程順序'] || 999) - Number(b['途程順序'] || 999); });
    groups.push({ 產品編號: p, 客戶品號: String(list[0]['客戶品號'] || ''), 品名: String(list[0]['品名'] || ''), routes: list });
  });
  return groups;
}

function 途程補齊_找參考途程_(gap, groups) {
  var gp = String(gap['產品編號'] || '').trim();
  var gc = String(gap['客戶品號'] || '').trim();
  var gn = String(gap['品名'] || '').trim();
  var best = { score: 0, reason: '無參考', routes: [] };
  groups.forEach(function(g) {
    var score = 0;
    var reason = [];
    if (gp && g.產品編號 === gp) { score += 100; reason.push('同產品編號'); }
    if (gc && g.客戶品號 === gc) { score += 60; reason.push('同客戶品號'); }
    if (gn && g.品名 === gn) { score += 40; reason.push('同品名'); }
    if (gp && g.產品編號 && gp.charAt(0) === g.產品編號.charAt(0)) { score += 10; reason.push('同料號前綴'); }
    if (gp && g.產品編號 && gp.slice(0, 4) === g.產品編號.slice(0, 4)) { score += 20; reason.push('同系列前四碼'); }
    if (score > best.score) best = { score: score, reason: reason.join('+') || '參考途程', routes: g.routes };
  });
  return best.score > 0 ? best : { score: 0, reason: '無參考', routes: [] };
}

function 途程補齊_取得途程既有鍵_(sh) {
  var obj = {};
  if (!sh || sh.getLastRow() < 2) return obj;
  var data = 途程補齊_讀工作表物件_(sh).rows;
  data.forEach(function(item) {
    var key = 途程補齊_途程鍵_(item.data);
    if (key) obj[key] = true;
  });
  return obj;
}

function 途程補齊_途程鍵_(r) {
  return [r['產品編號'] || '', r['客戶品號'] || '', r['品名'] || '', r['途程順序'] || '', r['報工工站名稱'] || r['工站名稱'] || '', r['工序清單'] || r['工序'] || '', r['機台編號清單'] || ''].join('｜');
}

function 途程補齊_估工序數_(text) {
  var s = String(text || '').trim();
  if (!s) return 1;
  return s.split(/[、,，\s]+/).filter(Boolean).length || 1;
}

function 途程補齊_設定資料驗證_(sh) {
  var headers = 途程補齊_取表頭_(sh);
  var fillCol = headers.indexOf('填寫狀態') + 1;
  var writeCol = headers.indexOf('寫回狀態') + 1;
  if (fillCol > 0 && sh.getLastRow() > 1) {
    var rule1 = SpreadsheetApp.newDataValidation().requireValueInList(['待填寫','待確認','已確認','待寫回','不寫回'], true).build();
    sh.getRange(2, fillCol, sh.getMaxRows() - 1, 1).setDataValidation(rule1);
  }
  if (writeCol > 0 && sh.getLastRow() > 1) {
    var rule2 = SpreadsheetApp.newDataValidation().requireValueInList(['未寫回','已寫回','重複略過','錯誤'], true).build();
    sh.getRange(2, writeCol, sh.getMaxRows() - 1, 1).setDataValidation(rule2);
  }
}

function 途程補齊_讀工作表物件_(sh) {
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

function 途程補齊_取表頭_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(v){ return String(v || '').trim(); });
}

function 途程補齊_重建空白工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  途程補齊_套格式_(sh);
  return sh;
}

function 途程補齊_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  途程補齊_套格式_(sh);
  return sh;
}

function 途程補齊_寫操作紀錄_(sh, batch, action, sourceCount, created, written, skipped, errors, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 11).setValues([[
    batch, new Date(), action, sourceCount || 0, created || 0, written || 0, skipped || 0, errors || 0, status || '', message || '', 途程補齊_現在_()
  ]]);
}

function 途程補齊_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 途程補齊_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 途程補齊_套格式_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 18)); } catch (err) {}
}

function 途程補齊_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 途程補齊_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_初始化_08_工站途程補齊工作台() {
  return 初始化_08_工站途程補齊工作台();
}

function 測試_途程補齊產生工作台() {
  return 途程補齊_產生工作台({});
}

function 測試_途程補齊寫回途程主檔() {
  return 途程補齊_寫回途程主檔({});
}

function 測試_途程補齊重拆前清理() {
  return 途程補齊_重拆前清理({});
}
