/**
 * 化新精密｜41_LINE 製造 AI 助理啟用閘門 v0.1
 *
 * 目的：
 * - 僅在唯讀驗收全部 PASS 後，才把「製造AI」正式曝光到 37_LINE 指令中心。
 * - 不寫入任何製造正式資料。
 * - 可隨時停用指令曝光，不影響原 LINE Bot 與既有功能。
 */

var LINE製造AI啟用閘門41_版本_ = '0.1.0';
var LINE製造AI啟用閘門41_主庫ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var LINE製造AI啟用閘門41_指令表_ = '37_LINE指令中心';
var LINE製造AI啟用閘門41_欄位_ = ['分類', '指令', '別名', '權限', '說明', '範例', '排序', '啟用', '備註'];

function 驗收並啟用41_LINE製造AI助理() {
  if (typeof 驗收35_LINE製造AI助理_全部 !== 'function') {
    throw new Error('找不到驗收35_LINE製造AI助理_全部，已停止啟用。');
  }

  var 驗收 = 驗收35_LINE製造AI助理_全部();
  if (!驗收 || 驗收.success !== true) {
    throw new Error('35_LINE 製造 AI 助理驗收未通過，禁止正式曝光。');
  }

  var sh = LINE製造AI啟用閘門41_取得指令表_();
  var result = LINE製造AI啟用閘門41_寫入或更新指令_(sh, {
    分類: '主管',
    指令: '製造AI',
    別名: 'AI助理,製造助理',
    權限: '允許主管入口',
    說明: '查詢料號製造狀態（唯讀）',
    範例: 'A916000000 今天做到哪裡？',
    排序: 60,
    啟用: '是',
    備註: 'Manufacturing Agent Gateway v0.1｜Read Only'
  });

  LINE製造AI啟用閘門41_寫紀錄_('製造AI', '系統', '完成', '驗收 PASS 後正式曝光');
  return {
    success: true,
    成功: true,
    version: LINE製造AI啟用閘門41_版本_,
    驗收: 驗收,
    指令: result
  };
}

function 停用41_LINE製造AI助理() {
  var sh = LINE製造AI啟用閘門41_取得指令表_();
  var result = LINE製造AI啟用閘門41_寫入或更新指令_(sh, {
    分類: '主管',
    指令: '製造AI',
    別名: 'AI助理,製造助理',
    權限: '允許主管入口',
    說明: '查詢料號製造狀態（唯讀）',
    範例: 'A916000000 今天做到哪裡？',
    排序: 60,
    啟用: '否',
    備註: '已停用指令曝光；核心模組保留'
  });
  LINE製造AI啟用閘門41_寫紀錄_('製造AI', '系統', '停用', '人工停用指令曝光');
  return { success: true, 成功: true, 指令: result };
}

function 查詢41_LINE製造AI助理啟用狀態() {
  var sh = LINE製造AI啟用閘門41_取得指令表_();
  if (sh.getLastRow() < 2) return { success: true, enabled: false, row: null };
  var values = sh.getDataRange().getDisplayValues();
  var headers = values.shift();
  var idx = {};
  headers.forEach(function(h, i) { idx[String(h)] = i; });
  var row = values.filter(function(r) { return String(r[idx['指令']] || '').trim() === '製造AI'; })[0] || null;
  return {
    success: true,
    enabled: !!(row && String(row[idx['啟用']] || '').trim() !== '否'),
    row: row ? {
      分類: row[idx['分類']],
      指令: row[idx['指令']],
      別名: row[idx['別名']],
      權限: row[idx['權限']],
      說明: row[idx['說明']],
      範例: row[idx['範例']],
      排序: row[idx['排序']],
      啟用: row[idx['啟用']],
      備註: row[idx['備註']]
    } : null
  };
}

function LINE製造AI啟用閘門41_取得指令表_() {
  var ss = SpreadsheetApp.openById(LINE製造AI啟用閘門41_主庫ID_);
  var sh = ss.getSheetByName(LINE製造AI啟用閘門41_指令表_);
  if (!sh) throw new Error('找不到 37_LINE指令中心，已停止操作。');

  var headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), LINE製造AI啟用閘門41_欄位_.length)).getDisplayValues()[0];
  LINE製造AI啟用閘門41_欄位_.forEach(function(h) {
    if (headers.indexOf(h) < 0) throw new Error('37_LINE指令中心缺少欄位：' + h);
  });
  return sh;
}

function LINE製造AI啟用閘門41_寫入或更新指令_(sh, obj) {
  var values = sh.getDataRange().getDisplayValues();
  var headers = values.shift();
  var idx = {};
  headers.forEach(function(h, i) { idx[String(h)] = i; });

  var targetRow = -1;
  values.some(function(r, i) {
    if (String(r[idx['指令']] || '').trim() === obj.指令) {
      targetRow = i + 2;
      return true;
    }
    return false;
  });

  var row = headers.map(function(h) {
    return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '';
  });

  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, headers.length).setValues([row]);
  } else {
    sh.appendRow(row);
    targetRow = sh.getLastRow();
  }

  return { row: targetRow, 指令: obj.指令, 啟用: obj.啟用 };
}

function LINE製造AI啟用閘門41_寫紀錄_(text, 分類, 結果, 備註) {
  try {
    if (typeof LINE指令中心37_寫入紀錄_ === 'function') {
      LINE指令中心37_寫入紀錄_(
        { LINE_USER_ID: 'SYSTEM', 工號: '', 姓名: '', 角色: '系統' },
        text,
        分類,
        結果,
        備註
      );
    }
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) console.warn(err);
  }
}
