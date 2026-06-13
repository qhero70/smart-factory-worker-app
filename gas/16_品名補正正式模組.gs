/**
 * 16_品名補正正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：途程缺口整理前資料清洗
 *
 * 目的：
 * 1. 修正 10_排程需求池 / 10_工單主檔 / 10_工單工序明細 / 10_途程缺口清單 的品名欄。
 * 2. 若品名空白、等於產品編號、或看起來像料號，優先用 02_產品主檔 補正式品名。
 * 3. 以「產品編號 + 客戶品號」精準匹配為第一優先，避免跨產品誤補。
 *
 * 注意：
 * 本檔不包含 doGet / doPost。
 */

var 品名補正_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 品名補正_目標分頁_ = [
  '10_排程需求池',
  '10_工單主檔',
  '10_工單工序明細',
  '10_途程缺口清單'
];

function 品名補正_全部() {
  var ss = 品名補正_取得試算表_();
  var productIndex = 品名補正_建立產品索引_(ss);
  var result = [];

  品名補正_目標分頁_.forEach(function(sheetName) {
    var sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) {
      result.push({ 分頁: sheetName, 狀態: '略過', 訊息: '無資料' });
      return;
    }
    result.push(品名補正_單表_(sh, productIndex));
  });

  return {
    ok: true,
    message: '品名補正完成',
    結果: result,
    時間: 品名補正_現在_()
  };
}

function 品名補正_單表_(sh, idx) {
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v) { return String(v || '').trim(); });
  var c產品 = headers.indexOf('產品編號');
  var c客品 = headers.indexOf('客戶品號');
  var c品名 = headers.indexOf('品名');
  var c備註 = headers.indexOf('備註');
  var c更新 = headers.indexOf('更新時間');

  if (c產品 < 0 || c品名 < 0) {
    return { 分頁: sh.getName(), 狀態: '略過', 訊息: '缺少產品編號或品名欄' };
  }

  var changed = 0;
  var rowsToUpdate = [];
  var now = 品名補正_現在_();

  for (var r = 1; r < values.length; r++) {
    var 產品編號 = String(values[r][c產品] || '').trim();
    var 客戶品號 = c客品 >= 0 ? String(values[r][c客品] || '').trim() : '';
    var 原品名 = String(values[r][c品名] || '').trim();

    if (!產品編號) continue;
    if (!品名補正_需要補正_(原品名, 產品編號)) continue;

    var newName = 品名補正_找品名_(idx, 產品編號, 客戶品號);
    if (!newName || newName === 原品名) continue;

    values[r][c品名] = newName;
    if (c備註 >= 0) {
      var oldNote = String(values[r][c備註] || '').trim();
      if (oldNote.indexOf('品名已由02_產品主檔補正') < 0) {
        values[r][c備註] = oldNote ? oldNote + '；品名已由02_產品主檔補正' : '品名已由02_產品主檔補正';
      }
    }
    if (c更新 >= 0) values[r][c更新] = now;
    rowsToUpdate.push(r + 1);
    changed++;
  }

  if (changed > 0) {
    sh.getRange(1, 1, values.length, values[0].length).setValues(values);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#164e63').setFontColor('#ffffff');
    try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 14)); } catch (err) {}
  }

  return {
    分頁: sh.getName(),
    狀態: '完成',
    補正筆數: changed,
    總筆數: values.length - 1
  };
}

function 品名補正_建立產品索引_(ss) {
  var sh = ss.getSheetByName('02_產品主檔');
  if (!sh || sh.getLastRow() < 2) throw new Error('找不到 02_產品主檔，無法補正品名');

  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v) { return String(v || '').trim(); });
  var c產品 = headers.indexOf('產品編號');
  var c客品 = headers.indexOf('客戶品號');
  var c品名 = headers.indexOf('品名');

  if (c產品 < 0 || c品名 < 0) throw new Error('02_產品主檔缺少產品編號或品名欄');

  var idx = { exact: {}, product: {}, customer: {} };
  for (var i = 1; i < values.length; i++) {
    var p = String(values[i][c產品] || '').trim();
    var c = c客品 >= 0 ? String(values[i][c客品] || '').trim() : '';
    var name = String(values[i][c品名] || '').trim();
    if (!p || !name) continue;

    if (p && c) idx.exact[p + '｜' + c] = name;
    if (p && !idx.product[p]) idx.product[p] = name;
    if (c && !idx.customer[c]) idx.customer[c] = name;
  }
  return idx;
}

function 品名補正_找品名_(idx, product, customer) {
  product = String(product || '').trim();
  customer = String(customer || '').trim();
  if (product && customer && idx.exact[product + '｜' + customer]) return idx.exact[product + '｜' + customer];
  if (product && idx.product[product]) return idx.product[product];
  if (customer && idx.customer[customer]) return idx.customer[customer];
  return '';
}

function 品名補正_需要補正_(name, product) {
  name = String(name || '').trim();
  product = String(product || '').trim();
  if (!name) return true;
  if (product && name === product) return true;
  if (/^[A-Z]{0,3}\d{6,}[A-Z0-9-]*$/i.test(name)) return true;
  return false;
}

function 品名補正_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 品名補正_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 品名補正_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_品名補正全部() {
  return 品名補正_全部();
}
