/**
 * 04_LINE身份權限33同步補丁.gs
 * 用途：修正舊 LINE 綁定流程已回覆成功，但未同步寫入 33_LINE身份權限 的問題。
 *
 * 問題現象：
 * 使用者輸入：綁定 fhfi546
 * LINE 回覆：身份綁定成功、選單已更新
 * 但 Google Sheets「33_LINE身份權限」A欄 LINE_USER_ID 仍空白、H欄啟用仍為否。
 *
 * 正確做法：
 * 在舊綁定流程成功取得 LINE_USER_ID 與工號後，呼叫：
 *   LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號);
 *
 * 注意：
 * 1. 不可自編 LINE_USER_ID。
 * 2. LINE_USER_ID 必須來自 LINE webhook event.source.userId。
 * 3. 本補丁不覆蓋 doPost(e)。
 */

const LINE身份權限33同步_設定 = {
  分頁_人員主檔: '01_人員主檔',
  分頁_LINE身份權限: '33_LINE身份權限',
  時區: 'Asia/Taipei'
};

/**
 * 給舊 LINE 綁定流程成功後呼叫。
 * @param {string} LINE_USER_ID LINE webhook event.source.userId
 * @param {string} 工號 使用者輸入的工號，例如 fhfi546
 * @return {{ok:boolean,message:string,row:number|null}}
 */
function LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號) {
  LINE_USER_ID = String(LINE_USER_ID || '').trim();
  工號 = String(工號 || '').trim();

  if (!LINE_USER_ID) {
    return { ok: false, message: '缺少LINE_USER_ID，不可同步33_LINE身份權限', row: null };
  }
  if (!工號) {
    return { ok: false, message: '缺少工號，不可同步33_LINE身份權限', row: null };
  }

  const 人員 = LINE身份權限33_查人員_BY工號_(工號);
  if (!人員) {
    return { ok: false, message: '01_人員主檔找不到工號：' + 工號, row: null };
  }

  const ss = LINE身份權限33_取得試算表_();
  const sh = ss.getSheetByName(LINE身份權限33同步_設定.分頁_LINE身份權限);
  if (!sh) throw new Error('缺少分頁：' + LINE身份權限33同步_設定.分頁_LINE身份權限);

  const rows = LINE身份權限33_讀取表格物件陣列_(LINE身份權限33同步_設定.分頁_LINE身份權限);

  // 防重一：同 LINE_USER_ID 已綁別的工號，阻擋。
  const sameLine = rows.find(r => String(r['LINE_USER_ID'] || '').trim() === LINE_USER_ID);
  if (sameLine && String(sameLine['工號'] || '').trim() && String(sameLine['工號']).trim() !== 工號) {
    return { ok: false, message: '此LINE_USER_ID已綁定其他工號：' + sameLine['工號'], row: sameLine.__row };
  }

  // 防重二：同工號已被其他 LINE_USER_ID 綁定，阻擋。
  const sameEmp = rows.find(r => String(r['工號'] || '').trim() === 工號);
  if (sameEmp && String(sameEmp['LINE_USER_ID'] || '').trim() && String(sameEmp['LINE_USER_ID']).trim() !== LINE_USER_ID) {
    return { ok: false, message: '此工號已被其他LINE_USER_ID綁定：' + 工號, row: sameEmp.__row };
  }

  const values = [[
    LINE_USER_ID,
    人員.工號,
    人員.姓名,
    人員.部門,
    人員.組別,
    人員.職稱,
    人員.角色,
    '是',
    'LINE真實綁定完成；由舊綁定流程同步33_LINE身份權限',
    LINE身份權限33_現在_()
  ]];

  if (sameEmp && sameEmp.__row) {
    sh.getRange(sameEmp.__row, 1, 1, 10).setValues(values);
    return { ok: true, message: '已更新33_LINE身份權限：' + 工號, row: sameEmp.__row };
  }

  sh.appendRow(values[0]);
  return { ok: true, message: '已新增33_LINE身份權限：' + 工號, row: sh.getLastRow() };
}

/**
 * 兼容別名：給舊程式容易接。
 */
function 同步_LINE身份權限33_(LINE_USER_ID, 工號) {
  return LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號);
}

/**
 * 兼容 event 型呼叫：LINE身份權限33_同步綁定成功_BY事件_(event, 工號)
 */
function LINE身份權限33_同步綁定成功_BY事件_(event, 工號) {
  const LINE_USER_ID = String(event?.source?.userId || '').trim();
  return LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號);
}

function LINE身份權限33_查人員_BY工號_(工號) {
  const rows = LINE身份權限33_讀取表格物件陣列_(LINE身份權限33同步_設定.分頁_人員主檔);
  const key = String(工號 || '').trim();
  const r = rows.find(x => String(x['工號'] || '').trim() === key);
  if (!r) return null;

  return {
    工號: String(r['工號'] || '').trim(),
    姓名: String(r['姓名'] || '').trim(),
    部門: String(r['部門'] || '').trim(),
    組別: String(r['組別'] || '').trim(),
    職稱: String(r['職稱'] || '').trim(),
    角色: String(r['角色類型'] || r['角色'] || '').trim() || '作業員'
  };
}

function LINE身份權限33_讀取表格物件陣列_(sheetName) {
  const ss = LINE身份權限33_取得試算表_();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('缺少分頁：' + sheetName);

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h || '').trim());
  return values.slice(1).map(function(row, i) {
    const o = { __row: i + 2 };
    headers.forEach(function(h, c) {
      if (h) o[h] = row[c];
    });
    return o;
  });
}

function LINE身份權限33_取得試算表_() {
  if (typeof 取得試算表_ === 'function') return 取得試算表_();

  const prop = PropertiesService.getScriptProperties();
  const id = String(prop.getProperty('智慧製造_SPREADSHEET_ID') || '').trim();
  if (id) return SpreadsheetApp.openById(id);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到智慧製造中央作戰指揮中心資料庫');
  return ss;
}

function LINE身份權限33_現在_() {
  return Utilities.formatDate(new Date(), LINE身份權限33同步_設定.時區, 'yyyy-MM-dd HH:mm:ss');
}
