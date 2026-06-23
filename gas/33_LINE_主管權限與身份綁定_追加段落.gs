/**
 * 33_LINE_主管權限與身份綁定_追加段落.gs
 *
 * 用途：貼到 Apps Script 原本檔案：
 * 33_LINE_主管權限與身份綁定.gs
 * 的最下方。
 *
 * 解決問題：
 * LINE 顯示「身份綁定成功、選單已更新」，但 33_LINE身份權限 A欄 LINE_USER_ID 仍空白、H欄啟用仍為否。
 *
 * 注意：
 * 1. 不要另建 04 補丁檔。
 * 2. 不要覆蓋整支 33_LINE_主管權限與身份綁定.gs。
 * 3. 只把本段貼到原本 33 檔最下方。
 * 4. 之後到原本綁定成功流程補一行呼叫即可。
 */

/**
 * 舊 LINE 綁定成功後，同步寫回 33_LINE身份權限。
 *
 * 舊程式綁定成功位置請加：
 * LINE身份權限33_同步綁定成功_BY事件_(event, 工號);
 *
 * 如果舊程式已有 LINE_USER_ID 與 工號，也可加：
 * LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號);
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

  const 人員 = LINE身份權限33_追加_查人員_BY工號_(工號);
  if (!人員) {
    return { ok: false, message: '01_人員主檔找不到工號：' + 工號, row: null };
  }

  const ss = LINE身份權限33_追加_取得試算表_();
  const sh = ss.getSheetByName('33_LINE身份權限');
  if (!sh) throw new Error('缺少分頁：33_LINE身份權限');

  const rows = LINE身份權限33_追加_讀取表格物件陣列_('33_LINE身份權限');

  // 防重一：同一個 LINE_USER_ID 已綁其他工號，阻擋。
  const sameLine = rows.find(r => String(r['LINE_USER_ID'] || '').trim() === LINE_USER_ID);
  if (sameLine && String(sameLine['工號'] || '').trim() && String(sameLine['工號']).trim() !== 工號) {
    return { ok: false, message: '此LINE_USER_ID已綁定其他工號：' + sameLine['工號'], row: sameLine.__row };
  }

  // 防重二：同一個工號已被其他 LINE_USER_ID 綁定，阻擋。
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
    'LINE真實綁定完成；由33_LINE_主管權限與身份綁定同步正式身份表',
    LINE身份權限33_追加_現在_()
  ]];

  if (sameEmp && sameEmp.__row) {
    sh.getRange(sameEmp.__row, 1, 1, 10).setValues(values);
    return { ok: true, message: '已更新33_LINE身份權限：' + 工號, row: sameEmp.__row };
  }

  sh.appendRow(values[0]);
  return { ok: true, message: '已新增33_LINE身份權限：' + 工號, row: sh.getLastRow() };
}

/**
 * 給舊程式如果手上是 event 與工號時呼叫。
 */
function LINE身份權限33_同步綁定成功_BY事件_(event, 工號) {
  const LINE_USER_ID = String(event?.source?.userId || '').trim();
  return LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號);
}

/**
 * 短別名，給舊流程好接。
 */
function 同步_LINE身份權限33_(LINE_USER_ID, 工號) {
  return LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號);
}

function LINE身份權限33_追加_查人員_BY工號_(工號) {
  const rows = LINE身份權限33_追加_讀取表格物件陣列_('01_人員主檔');
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

function LINE身份權限33_追加_讀取表格物件陣列_(sheetName) {
  const ss = LINE身份權限33_追加_取得試算表_();
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

function LINE身份權限33_追加_取得試算表_() {
  // 優先使用你原本系統的正式取表函數。
  if (typeof 取得試算表_ === 'function') return 取得試算表_();

  // 其次使用 Script Properties。
  const prop = PropertiesService.getScriptProperties();
  const id = String(prop.getProperty('智慧製造_SPREADSHEET_ID') || '').trim();
  if (id) return SpreadsheetApp.openById(id);

  // 最後才用綁定試算表。
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到智慧製造中央作戰指揮中心資料庫');
  return ss;
}

function LINE身份權限33_追加_現在_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

/**
 * =========================================================
 * 你還需要在原本「綁定成功」的位置加一行
 * =========================================================
 *
 * 找到原本回覆：
 * ✅ 身份綁定成功
 * ✅ 選單已更新
 *
 * 在回覆前或回覆後加：
 *
 * LINE身份權限33_同步綁定成功_BY事件_(event, 工號);
 *
 * 如果舊程式變數叫 e：
 *
 * LINE身份權限33_同步綁定成功_BY事件_(e, 工號);
 *
 * 如果舊程式已有 LINE_USER_ID：
 *
 * LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號);
 */
