/**
 * 18_途程補齊審核分級正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：08_工站途程補齊工作台 → 審核分級 → 安全寫回
 *
 * 目的：
 * 1. 依 08_工站途程補齊工作台 的參考來源與匹配分數進行風險分級。
 * 2. 只允許高信心資料自動改為「待寫回」。
 * 3. 中低信心資料保留給工程確認，避免把錯誤途程寫回主檔。
 *
 * 注意：
 * 本檔不包含 doGet / doPost。
 */

var 途程審核_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 途程審核_工作表名稱_ = {
  工作台: '08_工站途程補齊工作台',
  審核紀錄: '10_途程補齊審核紀錄'
};

var 途程審核_紀錄欄位_ = [
  '審核批次','時間戳','工作台筆數','高信心','中信心','低信心','缺欄位','自動待寫回','需人工確認','狀態','訊息','建立時間'
];

function 途程補齊_審核分級(payload) {
  payload = payload || {};
  var ss = 途程審核_取得試算表_();
  var sh = ss.getSheetByName(途程審核_工作表名稱_.工作台);
  if (!sh || sh.getLastRow() < 2) {
    return { ok: false, message: '08_工站途程補齊工作台沒有資料，請先產生工作台' };
  }

  var sh紀錄 = 途程審核_確保工作表_(ss, 途程審核_工作表名稱_.審核紀錄, 途程審核_紀錄欄位_);
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v){ return String(v || '').trim(); });
  var now = 途程審核_現在_();
  var batch = payload['審核批次'] || ('ROUTE-REVIEW-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));

  var c匹配 = headers.indexOf('匹配分數');
  var c來源 = headers.indexOf('參考來源');
  var c填寫 = headers.indexOf('填寫狀態');
  var c寫回 = headers.indexOf('寫回狀態');
  var c備註 = headers.indexOf('備註');
  var c更新 = headers.indexOf('更新時間');

  var required = ['產品編號','報工工站名稱','工序清單','機台編號清單'];
  var requiredCols = required.map(function(h){ return headers.indexOf(h); });

  var stat = {
    total: values.length - 1,
    high: 0,
    medium: 0,
    low: 0,
    missing: 0,
    autoWrite: 0,
    manual: 0
  };

  for (var r = 1; r < values.length; r++) {
    var score = c匹配 >= 0 ? Number(values[r][c匹配] || 0) : 0;
    var source = c來源 >= 0 ? String(values[r][c來源] || '').trim() : '';
    var fillStatus = c填寫 >= 0 ? String(values[r][c填寫] || '').trim() : '';
    var writeStatus = c寫回 >= 0 ? String(values[r][c寫回] || '').trim() : '';

    if (writeStatus === '已寫回') continue;

    var missingList = [];
    requiredCols.forEach(function(c, i) {
      if (c < 0 || !String(values[r][c] || '').trim()) missingList.push(required[i]);
    });

    var level = '低信心';
    if (missingList.length) {
      level = '缺欄位';
      stat.missing++;
    } else if (score >= 100 || source.indexOf('同產品編號') >= 0) {
      level = '高信心';
      stat.high++;
    } else if (score >= 60 || source.indexOf('同客戶品號') >= 0 || source.indexOf('同品名') >= 0) {
      level = '中信心';
      stat.medium++;
    } else {
      level = '低信心';
      stat.low++;
    }

    if (level === '高信心' && (fillStatus === '待確認' || fillStatus === '待填寫' || fillStatus === '')) {
      if (c填寫 >= 0) values[r][c填寫] = '待寫回';
      if (c寫回 >= 0) values[r][c寫回] = '未寫回';
      stat.autoWrite++;
      if (c備註 >= 0) values[r][c備註] = 途程審核_加註_(values[r][c備註], '高信心自動標記待寫回；' + level + '；來源=' + source + '；分數=' + score);
    } else {
      stat.manual++;
      if (c填寫 >= 0 && (fillStatus === '待確認' || fillStatus === '待填寫' || fillStatus === '')) values[r][c填寫] = '待確認';
      if (c備註 >= 0) {
        var note = level + '；需工程確認；來源=' + source + '；分數=' + score;
        if (missingList.length) note += '；缺少=' + missingList.join('、');
        values[r][c備註] = 途程審核_加註_(values[r][c備註], note);
      }
    }

    if (c更新 >= 0) values[r][c更新] = now;
  }

  sh.getRange(1, 1, values.length, values[0].length).setValues(values);
  途程審核_套格式_(sh);

  var msg = '審核完成：高信心 ' + stat.high + '，中信心 ' + stat.medium + '，低信心 ' + stat.low + '，缺欄位 ' + stat.missing + '，自動待寫回 ' + stat.autoWrite + '，需人工確認 ' + stat.manual;
  途程審核_寫紀錄_(sh紀錄, batch, stat, '完成', msg);

  return {
    ok: true,
    message: msg,
    審核批次: batch,
    工作台筆數: stat.total,
    高信心: stat.high,
    中信心: stat.medium,
    低信心: stat.low,
    缺欄位: stat.missing,
    自動待寫回: stat.autoWrite,
    需人工確認: stat.manual,
    時間: now
  };
}

function 途程審核_加註_(oldValue, note) {
  var old = String(oldValue || '').trim();
  if (old.indexOf(note) >= 0) return old;
  return old ? old + '；' + note : note;
}

function 途程審核_寫紀錄_(sh, batch, stat, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 12).setValues([[
    batch,
    new Date(),
    stat.total || 0,
    stat.high || 0,
    stat.medium || 0,
    stat.low || 0,
    stat.missing || 0,
    stat.autoWrite || 0,
    stat.manual || 0,
    status || '',
    message || '',
    途程審核_現在_()
  ]]);
}

function 途程審核_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  途程審核_套格式_(sh);
  return sh;
}

function 途程審核_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 途程審核_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 途程審核_套格式_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#312e81').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 18)); } catch (err) {}
}

function 途程審核_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_途程補齊審核分級() {
  return 途程補齊_審核分級({});
}
