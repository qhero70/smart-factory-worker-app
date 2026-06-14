/**
 * 25_AI戰情摘要資料源正式模組
 * 專案：製造部智慧製造應用總部
 * 版本：v25.1.0
 *
 * 目的：
 * 1. 將 24_派班報工日結、24_未報工追蹤、24_派班效率統計、23_派班報工異常明細
 *    整理成 AI / LINE / 主管戰情可讀的摘要資料源。
 * 2. 產生每日文字摘要、風險清單、主管提醒、LINE 短訊內容。
 * 3. 不直接呼叫外部 AI，先產生穩定資料源，後續再接 LINE / AI API。
 *
 * API action：
 * - AI戰情資料源健康檢查
 * - 產生AI戰情摘要資料源
 * - 取得AI戰情摘要資料源
 */

var AI戰情資料源_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

function AI戰情資料源_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === 'AI戰情資料源健康檢查') return { ok: true, 模組: '25_AI戰情摘要資料源', 版本: 'v25.1.0', 時間: AI戰情資料源_現在_() };
  if (action === '產生AI戰情摘要資料源') return 產生AI戰情摘要資料源(payload);
  if (action === '取得AI戰情摘要資料源') return 取得AI戰情摘要資料源(payload);
  return null;
}

function 產生AI戰情摘要資料源(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = AI戰情資料源_取得試算表_();
    var workDate = String(payload['作業日'] || '').trim() || AI戰情資料源_日期文字_(new Date());
    var batch = 'AI-BATTLE-' + AI戰情資料源_批次時間_();
    var now = AI戰情資料源_現在_();

    var sh日結 = ss.getSheetByName('24_派班報工日結');
    var sh未報 = ss.getSheetByName('24_未報工追蹤');
    var sh效率 = ss.getSheetByName('24_派班效率統計');
    var sh異常 = ss.getSheetByName('23_派班報工異常明細');

    var sh資料源 = AI戰情資料源_確保工作表_(ss, '25_AI戰情摘要資料源', AI戰情資料源_資料源欄位_(), '#581c87');
    var sh風險 = AI戰情資料源_確保工作表_(ss, '25_AI戰情風險清單', AI戰情資料源_風險欄位_(), '#7f1d1d');
    var shLine = AI戰情資料源_確保工作表_(ss, '25_LINE每日摘要佇列', AI戰情資料源_LINE欄位_(), '#166534');
    var sh紀錄 = AI戰情資料源_確保工作表_(ss, '25_AI戰情摘要紀錄', AI戰情資料源_紀錄欄位_(), '#374151');

    AI戰情資料源_刪除同作業日_(sh資料源, '作業日', workDate);
    AI戰情資料源_刪除同作業日_(sh風險, '作業日', workDate);
    AI戰情資料源_刪除同作業日_(shLine, '作業日', workDate);

    var daily = sh日結 ? AI戰情資料源_讀工作表物件_(sh日結).rows.map(function(x){ return x.data; }).filter(function(r){ return AI戰情資料源_日期文字_(r['作業日']) === workDate; }) : [];
    var missing = sh未報 ? AI戰情資料源_讀工作表物件_(sh未報).rows.map(function(x){ return x.data; }).filter(function(r){ return AI戰情資料源_日期文字_(r['作業日']) === workDate; }) : [];
    var eff = sh效率 ? AI戰情資料源_讀工作表物件_(sh效率).rows.map(function(x){ return x.data; }).filter(function(r){ return AI戰情資料源_日期文字_(r['作業日']) === workDate; }) : [];
    var issues = sh異常 ? AI戰情資料源_讀工作表物件_(sh異常).rows.map(function(x){ return x.data; }).filter(function(r){ return String(r['修復狀態'] || '').trim() !== '已修復'; }) : [];

    var total = AI戰情資料源_彙總_(daily, missing, eff, issues);
    var riskLevel = AI戰情資料源_風險等級_(total);
    var summaryText = AI戰情資料源_生成摘要_(workDate, total, riskLevel);
    var suggestion = AI戰情資料源_生成建議_(total, riskLevel);
    var lineText = AI戰情資料源_生成LINE_(workDate, total, riskLevel);

    var dataRow = [
      batch, workDate, riskLevel,
      total.派班筆數, total.已報工派班數, total.部分報工派班數, total.未報工派班數,
      total.派工量合計, total.良品數, total.不良數, total.報工數, total.剩餘量,
      total.完成率, total.不良率,
      total.人員數, total.工站數, total.異常數,
      summaryText, suggestion, lineText,
      now, now
    ];
    sh資料源.getRange(sh資料源.getLastRow() + 1, 1, 1, dataRow.length).setValues([dataRow]);

    var riskRows = AI戰情資料源_產生風險列_(batch, workDate, missing, eff, issues, now);
    if (riskRows.length) sh風險.getRange(sh風險.getLastRow() + 1, 1, riskRows.length, AI戰情資料源_風險欄位_().length).setValues(riskRows);

    var lineRow = [batch, workDate, '派班報工每日摘要', lineText, riskLevel, '待發送', '', now, now];
    shLine.getRange(shLine.getLastRow() + 1, 1, 1, lineRow.length).setValues([lineRow]);

    AI戰情資料源_寫紀錄_(sh紀錄, batch, workDate, daily.length, missing.length, eff.length, issues.length, riskRows.length, '成功', 'AI戰情摘要資料源產生完成');

    return { ok: true, message: 'AI戰情摘要資料源產生完成', 批次編號: batch, 作業日: workDate, 風險等級: riskLevel, 派班筆數: total.派班筆數, 未報工派班數: total.未報工派班數, 異常數: total.異常數, LINE摘要: lineText, 時間: now };
  } finally {
    lock.releaseLock();
  }
}

function 取得AI戰情摘要資料源(payload) {
  payload = payload || {};
  var ss = AI戰情資料源_取得試算表_();
  var sh = ss.getSheetByName('25_AI戰情摘要資料源');
  if (!sh || sh.getLastRow() < 2) return { ok: false, message: '25_AI戰情摘要資料源沒有資料', data: [] };
  var workDate = String(payload['作業日'] || '').trim() || AI戰情資料源_日期文字_(new Date());
  var data = AI戰情資料源_讀工作表物件_(sh).rows.map(function(x){ return x.data; }).filter(function(r){ return AI戰情資料源_日期文字_(r['作業日']) === workDate; });
  return { ok: true, message: '取得 AI 戰情摘要資料源 ' + data.length + ' 筆', 作業日: workDate, 筆數: data.length, data: data };
}

function AI戰情資料源_彙總_(daily, missing, eff, issues) {
  var s = { 派班筆數: 0, 已報工派班數: 0, 部分報工派班數: 0, 未報工派班數: 0, 派工量合計: 0, 良品數: 0, 不良數: 0, 報工數: 0, 剩餘量: 0, 完成率: 0, 不良率: 0, 人員數: daily.length, 工站數: eff.length, 異常數: issues.length };
  daily.forEach(function(r) {
    s.派班筆數 += Number(r['派班筆數'] || 0);
    s.已報工派班數 += Number(r['已報工派班數'] || 0);
    s.部分報工派班數 += Number(r['部分報工派班數'] || 0);
    s.未報工派班數 += Number(r['未報工派班數'] || 0);
    s.派工量合計 += Number(r['派工量合計'] || 0);
    s.良品數 += Number(r['良品數'] || 0);
    s.不良數 += Number(r['不良數'] || 0);
    s.報工數 += Number(r['報工數'] || 0);
    s.剩餘量 += Number(r['剩餘量'] || 0);
  });
  s.未報工派班數 = Math.max(s.未報工派班數, missing.length);
  s.完成率 = s.派工量合計 > 0 ? s.良品數 / s.派工量合計 : 0;
  s.不良率 = s.報工數 > 0 ? s.不良數 / s.報工數 : 0;
  return s;
}

function AI戰情資料源_風險等級_(s) {
  if (s.異常數 > 0) return '高';
  if (s.未報工派班數 >= 5) return '高';
  if (s.完成率 < 0.5 && s.派班筆數 > 0) return '中';
  if (s.不良率 >= 0.03) return '中';
  if (s.未報工派班數 > 0) return '中';
  return '低';
}

function AI戰情資料源_生成摘要_(date, s, risk) {
  return '作業日 ' + date + ' 派班報工戰情：風險等級 ' + risk + '。派班 ' + s.派班筆數 + ' 筆，已報工 ' + s.已報工派班數 + ' 筆，部分報工 ' + s.部分報工派班數 + ' 筆，未報工 ' + s.未報工派班數 + ' 筆。派工量 ' + s.派工量合計 + '，良品 ' + s.良品數 + '，不良 ' + s.不良數 + '，完成率 ' + AI戰情資料源_百分比_(s.完成率) + '，不良率 ' + AI戰情資料源_百分比_(s.不良率) + '。';
}

function AI戰情資料源_生成建議_(s, risk) {
  var arr = [];
  if (s.未報工派班數 > 0) arr.push('請班長優先確認未報工派班，安排補報工或改派。');
  if (s.異常數 > 0) arr.push('請先處理 23_派班報工異常明細未修復項目。');
  if (s.完成率 < 0.8 && s.派班筆數 > 0) arr.push('完成率偏低，建議確認人員、機台、途程與物料狀態。');
  if (s.不良率 >= 0.03) arr.push('不良率偏高，建議追查工站、機台與不良代碼。');
  if (!arr.length) arr.push('今日派班報工狀態穩定，持續追蹤即可。');
  return arr.join('\n');
}

function AI戰情資料源_生成LINE_(date, s, risk) {
  return '【製造戰情日結】\n' + date + '\n風險：' + risk + '\n派班：' + s.派班筆數 + '｜已報工：' + s.已報工派班數 + '｜未報工：' + s.未報工派班數 + '\n良品：' + s.良品數 + '｜不良：' + s.不良數 + '\n完成率：' + AI戰情資料源_百分比_(s.完成率) + '｜不良率：' + AI戰情資料源_百分比_(s.不良率) + '\n' + (s.未報工派班數 > 0 ? '提醒：請確認未報工追蹤。' : '狀態：派班報工穩定。');
}

function AI戰情資料源_產生風險列_(batch, date, missing, eff, issues, now) {
  var rows = [];
  missing.forEach(function(r) {
    rows.push([batch, date, '未報工', '中', r['工號'] || r['姓名'] || '', r['報工工站名稱'] || r['工站名稱'] || '', r['工單編號'] || '', r['品名'] || '', '派班未報工，需確認補報工或改派。', '待處理', now]);
  });
  eff.forEach(function(r) {
    var complete = Number(r['完成率'] || 0);
    var bad = Number(r['不良率'] || 0);
    if (complete < 0.5 || bad >= 0.03) rows.push([batch, date, '效率異常', complete < 0.5 ? '中' : '低', '', r['報工工站名稱'] || r['工站名稱'] || '', '', r['工序'] || '', '完成率=' + AI戰情資料源_百分比_(complete) + '，不良率=' + AI戰情資料源_百分比_(bad), '待確認', now]);
  });
  issues.forEach(function(r) {
    rows.push([batch, date, '資料異常', '高', '', r['工作表'] || '', r['主鍵'] || '', r['欄位'] || '', r['訊息'] || '巡檢異常未修復', '待修復', now]);
  });
  return rows;
}

function AI戰情資料源_資料源欄位_() { return ['摘要批次','作業日','風險等級','派班筆數','已報工派班數','部分報工派班數','未報工派班數','派工量合計','良品數','不良數','報工數','剩餘量','完成率','不良率','人員數','工站數','異常數','AI摘要文字','主管建議','LINE摘要文字','建立時間','更新時間']; }
function AI戰情資料源_風險欄位_() { return ['摘要批次','作業日','風險類型','風險等級','人員','工站','工單','品名或工序','風險說明','處理狀態','建立時間']; }
function AI戰情資料源_LINE欄位_() { return ['摘要批次','作業日','訊息類型','訊息內容','風險等級','發送狀態','發送時間','建立時間','更新時間']; }
function AI戰情資料源_紀錄欄位_() { return ['摘要批次','時間戳','作業日','日結筆數','未報工筆數','效率筆數','異常筆數','風險筆數','狀態','訊息','建立時間']; }

function AI戰情資料源_寫紀錄_(sh, batch, date, dailyCount, missingCount, effCount, issueCount, riskCount, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 11).setValues([[batch, new Date(), date, dailyCount || 0, missingCount || 0, effCount || 0, issueCount || 0, riskCount || 0, status || '', message || '', AI戰情資料源_現在_()]]);
}

function AI戰情資料源_刪除同作業日_(sh, colName, workDate) {
  if (!sh || sh.getLastRow() < 2) return;
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v){ return String(v || '').trim(); });
  var col = headers.indexOf(colName);
  if (col < 0) return;
  for (var i = values.length - 1; i >= 1; i--) if (AI戰情資料源_日期文字_(values[i][col]) === workDate) sh.deleteRow(i + 1);
}

function AI戰情資料源_確保工作表_(ss, name, headers, color) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#581c87').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 20)); } catch (err) {}
  return sh;
}

function AI戰情資料源_讀工作表物件_(sh) {
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

function AI戰情資料源_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || AI戰情資料源_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function AI戰情資料源_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  var s = String(v).replace(/^['"]|['"]$/g, '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { var d = new Date(s); if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd'); }
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function AI戰情資料源_百分比_(n) { return (Number(n || 0) * 100).toFixed(1) + '%'; }
function AI戰情資料源_批次時間_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'); }
function AI戰情資料源_現在_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'); }

function 測試_AI戰情資料源健康檢查() { return AI戰情資料源_嘗試處理動作_({ action: 'AI戰情資料源健康檢查' }); }
function 測試_產生AI戰情摘要資料源() { return AI戰情資料源_嘗試處理動作_({ action: '產生AI戰情摘要資料源' }); }
function 測試_取得AI戰情摘要資料源() { return AI戰情資料源_嘗試處理動作_({ action: '取得AI戰情摘要資料源' }); }
