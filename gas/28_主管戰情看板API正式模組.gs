/**
 * 28_主管戰情看板API正式模組
 * 專案：製造部智慧製造應用總部
 * 版本：v28.1.0
 *
 * 目的：
 * 1. 提供主管戰情看板 PWA 使用的單一 API。
 * 2. 整合 25_AI戰情摘要資料源、25_AI戰情風險清單、24_未報工追蹤、24_派班效率統計。
 * 3. 額外回傳 27_每日自動化排程紀錄、26_LINE推播紀錄最新狀態。
 *
 * API action：
 * - 主管戰情看板健康檢查
 * - 取得主管戰情看板
 */

var 主管戰情看板_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

function 主管戰情看板_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '主管戰情看板健康檢查') return { ok: true, 模組: '28_主管戰情看板API', 版本: 'v28.1.0', 時間: 主管戰情看板_現在_() };
  if (action === '取得主管戰情看板') return 取得主管戰情看板(payload);
  return null;
}

function 取得主管戰情看板(payload) {
  payload = payload || {};
  var ss = 主管戰情看板_取得試算表_();
  var workDate = String(payload['作業日'] || '').trim() || 主管戰情看板_日期文字_(new Date());
  var limit = Number(payload['筆數'] || 30);
  if (isNaN(limit) || limit <= 0) limit = 30;

  var summaryRows = 主管戰情看板_取表資料_(ss, '25_AI戰情摘要資料源', workDate, '作業日');
  var riskRows = 主管戰情看板_取表資料_(ss, '25_AI戰情風險清單', workDate, '作業日');
  var missingRows = 主管戰情看板_取表資料_(ss, '24_未報工追蹤', workDate, '作業日');
  var efficiencyRows = 主管戰情看板_取表資料_(ss, '24_派班效率統計', workDate, '作業日');
  var automationRows = 主管戰情看板_取表資料_(ss, '27_每日自動化排程紀錄', workDate, '作業日');
  var lineRows = 主管戰情看板_取表資料_(ss, '26_LINE推播紀錄', workDate, '作業日');

  var summary = summaryRows.length ? summaryRows[summaryRows.length - 1] : 主管戰情看板_空摘要_(workDate);
  var risks = riskRows.slice(-limit).reverse();
  var missing = missingRows.slice(-limit).reverse();
  var efficiency = efficiencyRows.slice().sort(function(a, b) {
    return Number(a['完成率'] || 0) - Number(b['完成率'] || 0);
  }).slice(0, limit);

  var automationLatest = automationRows.length ? automationRows[automationRows.length - 1] : {};
  var lineLatest = lineRows.length ? lineRows[lineRows.length - 1] : {};

  var kpi = {
    作業日: workDate,
    風險等級: String(summary['風險等級'] || '無資料'),
    派班筆數: Number(summary['派班筆數'] || 0),
    已報工派班數: Number(summary['已報工派班數'] || 0),
    部分報工派班數: Number(summary['部分報工派班數'] || 0),
    未報工派班數: Number(summary['未報工派班數'] || missingRows.length || 0),
    派工量合計: Number(summary['派工量合計'] || 0),
    良品數: Number(summary['良品數'] || 0),
    不良數: Number(summary['不良數'] || 0),
    報工數: Number(summary['報工數'] || 0),
    剩餘量: Number(summary['剩餘量'] || 0),
    完成率: Number(summary['完成率'] || 0),
    不良率: Number(summary['不良率'] || 0),
    人員數: Number(summary['人員數'] || 0),
    工站數: Number(summary['工站數'] || 0),
    異常數: Number(summary['異常數'] || riskRows.length || 0)
  };

  return {
    ok: true,
    message: '取得主管戰情看板資料完成',
    版本: 'v28.1.0',
    作業日: workDate,
    KPI: kpi,
    摘要: summary,
    AI摘要文字: String(summary['AI摘要文字'] || ''),
    主管建議: String(summary['主管建議'] || ''),
    LINE摘要文字: String(summary['LINE摘要文字'] || ''),
    風險清單: risks,
    未報工追蹤: missing,
    效率排行: efficiency,
    自動化最新狀態: automationLatest,
    LINE最新狀態: lineLatest,
    筆數: {
      摘要: summaryRows.length,
      風險: riskRows.length,
      未報工: missingRows.length,
      效率: efficiencyRows.length,
      自動化: automationRows.length,
      LINE推播: lineRows.length
    },
    時間: 主管戰情看板_現在_()
  };
}

function 主管戰情看板_空摘要_(workDate) {
  return {
    作業日: workDate,
    風險等級: '無資料',
    派班筆數: 0,
    已報工派班數: 0,
    部分報工派班數: 0,
    未報工派班數: 0,
    派工量合計: 0,
    良品數: 0,
    不良數: 0,
    報工數: 0,
    剩餘量: 0,
    完成率: 0,
    不良率: 0,
    人員數: 0,
    工站數: 0,
    異常數: 0,
    AI摘要文字: '目前尚未產生此作業日的 AI 戰情摘要資料源。',
    主管建議: '請先執行 24_派班報工每日結算 與 25_AI戰情摘要資料源。',
    LINE摘要文字: ''
  };
}

function 主管戰情看板_取表資料_(ss, sheetName, workDate, dateCol) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  return 主管戰情看板_讀工作表物件_(sh).rows.map(function(x) { return x.data; }).filter(function(r) {
    return 主管戰情看板_日期文字_(r[dateCol || '作業日']) === workDate;
  });
}

function 主管戰情看板_讀工作表物件_(sh) {
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
    if (!empty) rows.push({ rowIndex: i + 1, data: obj, headers: headers });
  }
  return { headers: headers, rows: rows };
}

function 主管戰情看板_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 主管戰情看板_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 主管戰情看板_日期文字_(v) {
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

function 主管戰情看板_現在_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'); }

function 測試_主管戰情看板健康檢查() { return 主管戰情看板_嘗試處理動作_({ action: '主管戰情看板健康檢查' }); }
function 測試_取得主管戰情看板() { return 主管戰情看板_嘗試處理動作_({ action: '取得主管戰情看板' }); }
