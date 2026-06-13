/**
 * 20_今日派班整理正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：10_每日派班表 → 10_今日派班表 → PWA 報工入口
 *
 * 目的：
 * 1. 修正自動派班後出現過去日期的問題。
 * 2. 將逾期派班轉為「今日補派」。
 * 3. 產生現場可用的 10_今日派班表。
 * 4. 保留原始 10_每日派班表 作為系統排程結果，不直接覆蓋。
 *
 * 注意：
 * 本檔不包含 doGet / doPost。
 */

var 今日派班_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 今日派班_工作表名稱_ = {
  每日派班表: '10_每日派班表',
  今日派班表: '10_今日派班表',
  整理紀錄: '10_今日派班整理紀錄'
};

var 今日派班_欄位_ = {
  今日派班表: [
    '今日派班編號','原派班編號','作業日','原派班日期','日期狀態','班別','工號','姓名','部門','組別','報工工站名稱','工站名稱','工序',
    '工序明細編號','工單編號','產品編號','客戶品號','品名','主機台','機台編號清單','區域清單','計畫量','派工量','標準產能',
    '預計開始時間','預計結束時間','派班來源','派班狀態','報工狀態','現場確認','備註','建立時間','更新時間'
  ],
  整理紀錄: [
    '整理批次','時間戳','來源派班筆數','今日筆數','逾期補派筆數','未來保留筆數','略過筆數','狀態','訊息','建立時間'
  ]
};

function 今日派班_產生今日表(payload) {
  payload = payload || {};
  var ss = 今日派班_取得試算表_();
  var sh來源 = ss.getSheetByName(今日派班_工作表名稱_.每日派班表);
  if (!sh來源 || sh來源.getLastRow() < 2) {
    return { ok: false, message: '10_每日派班表沒有資料，請先執行自動派班' };
  }

  var sh今日 = 今日派班_重建空白工作表_(ss, 今日派班_工作表名稱_.今日派班表, 今日派班_欄位_.今日派班表);
  var sh紀錄 = 今日派班_確保工作表_(ss, 今日派班_工作表名稱_.整理紀錄, 今日派班_欄位_.整理紀錄);

  var rows = 今日派班_讀工作表物件_(sh來源).rows.map(function(x){ return x.data; });
  var now = 今日派班_現在_();
  var today = payload['作業日'] || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  var batch = payload['整理批次'] || ('TODAY-DSP-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));
  var includeFuture = payload['包含未來'] === true;

  var append = [];
  var overdue = 0;
  var future = 0;
  var skipped = 0;

  rows.forEach(function(r) {
    var dispatchStatus = String(r['派班狀態'] || '').trim();
    var reportStatus = String(r['報工狀態'] || '').trim();
    if (dispatchStatus === '取消' || reportStatus === '已報工') { skipped++; return; }

    var originalDate = 今日派班_日期文字_(r['派班日期'] || '');
    if (!originalDate) { originalDate = today; }

    var dateStatus = '今日';
    var workDate = originalDate;

    if (originalDate < today) {
      dateStatus = '逾期補派';
      workDate = today;
      overdue++;
    } else if (originalDate > today) {
      dateStatus = '未來保留';
      future++;
      if (!includeFuture) return;
    }

    var shift = String(r['班別'] || '早班').trim();
    var timePair = 今日派班_班別時間_(shift, workDate);
    var id = 'TDSP-' + workDate.replace(/[^0-9]/g, '') + '-' + ('0000' + (append.length + 1)).slice(-4);

    var obj = {
      '今日派班編號': id,
      '原派班編號': r['派班編號'] || '',
      '作業日': workDate,
      '原派班日期': originalDate,
      '日期狀態': dateStatus,
      '班別': shift,
      '工號': r['工號'] || '',
      '姓名': r['姓名'] || '',
      '部門': r['部門'] || '',
      '組別': r['組別'] || '',
      '報工工站名稱': r['報工工站名稱'] || '',
      '工站名稱': r['工站名稱'] || r['報工工站名稱'] || '',
      '工序': r['工序'] || '',
      '工序明細編號': r['工序明細編號'] || '',
      '工單編號': r['工單編號'] || '',
      '產品編號': r['產品編號'] || '',
      '客戶品號': r['客戶品號'] || '',
      '品名': r['品名'] || '',
      '主機台': r['主機台'] || '',
      '機台編號清單': r['機台編號清單'] || '',
      '區域清單': r['區域清單'] || '',
      '計畫量': r['計畫量'] || '',
      '派工量': r['派工量'] || '',
      '標準產能': r['標準產能'] || '',
      '預計開始時間': timePair.start,
      '預計結束時間': timePair.end,
      '派班來源': dateStatus === '逾期補派' ? '逾期轉今日補派' : (r['派班來源'] || '系統派班'),
      '派班狀態': '今日可執行',
      '報工狀態': r['報工狀態'] || '未報工',
      '現場確認': '待確認',
      '備註': dateStatus === '逾期補派' ? '原派班日 ' + originalDate + '，今日補派' : (r['備註'] || ''),
      '建立時間': now,
      '更新時間': now
    };
    append.push(今日派班_欄位_.今日派班表.map(function(h){ return 今日派班_正規值_(obj[h]); }));
  });

  if (append.length) {
    sh今日.getRange(2, 1, append.length, 今日派班_欄位_.今日派班表.length).setValues(append);
    今日派班_套格式_(sh今日);
  }

  var msg = '今日派班表建立 ' + append.length + ' 筆，逾期補派 ' + overdue + ' 筆，未來保留 ' + future + ' 筆，略過 ' + skipped + ' 筆';
  今日派班_寫紀錄_(sh紀錄, batch, rows.length, append.length, overdue, future, skipped, '成功', msg);

  return {
    ok: true,
    message: msg,
    作業日: today,
    來源派班筆數: rows.length,
    今日筆數: append.length,
    逾期補派筆數: overdue,
    未來保留筆數: future,
    略過筆數: skipped,
    時間: now
  };
}

function 今日派班_班別時間_(shift, date) {
  shift = String(shift || '').trim();
  if (shift.indexOf('大夜') >= 0) return { start: date + ' 23:00', end: 今日派班_日期加天_(date, 1) + ' 07:50' };
  if (shift.indexOf('加班') >= 0) return { start: date + ' 17:20', end: date + ' 20:20' };
  return { start: date + ' 08:00', end: date + ' 16:50' };
}

function 今日派班_日期加天_(dateText, days) {
  var p = String(dateText || '').split('-').map(Number);
  if (p.length !== 3) return dateText;
  var d = new Date(p[0], p[1] - 1, p[2]);
  d.setDate(d.getDate() + Number(days || 0));
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
}

function 今日派班_日期文字_(v) {
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

function 今日派班_讀工作表物件_(sh) {
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

function 今日派班_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 今日派班_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 今日派班_重建空白工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  今日派班_套格式_(sh);
  return sh;
}

function 今日派班_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  今日派班_套格式_(sh);
  return sh;
}

function 今日派班_套格式_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#166534').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 20)); } catch (err) {}
}

function 今日派班_寫紀錄_(sh, batch, sourceCount, todayCount, overdue, future, skipped, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 10).setValues([[
    batch, new Date(), sourceCount || 0, todayCount || 0, overdue || 0, future || 0, skipped || 0, status || '', message || '', 今日派班_現在_()
  ]]);
}

function 今日派班_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 今日派班_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_產生今日派班表() {
  return 今日派班_產生今日表({});
}
