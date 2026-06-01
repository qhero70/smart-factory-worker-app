/**
 * 智慧製造中央作戰指揮中心｜系統維護工具
 * 用途：資料自檢、備份、CSV 匯入、欄位修復。
 * 注意：此檔與「智慧製造中央作戰指揮中心.gs」放在同一個 Apps Script 專案。
 */

function 系統維護_一鍵自檢() {
  const 結果 = [];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到目前綁定的 Google Sheets');

  Object.keys(工作表規格).forEach(表名 => {
    const sh = ss.getSheetByName(表名);
    if (!sh) {
      結果.push({ 表名, 狀態: '缺少工作表', 建議: '執行初始化或欄位修復' });
      return;
    }
    const 欄位 = 工作表規格[表名];
    const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 欄位.length)).getValues()[0];
    const 缺少欄位 = 欄位.filter(x => !現有.includes(x));
    結果.push({ 表名, 狀態: 缺少欄位.length ? '欄位不完整' : '正常', 缺少欄位: 缺少欄位.join('、') });
  });

  寫入自檢報告_(結果);
  return { 成功: true, 訊息: '自檢完成', 結果 };
}

function 系統維護_修復全部欄位() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(工作表規格).forEach(表名 => 建立或修復工作表_(ss, 表名, 工作表規格[表名]));
  記錄操作_('系統維護', '修復全部欄位', '工作表規格', '完成', '依正式欄位規格修復');
  return { 成功: true, 訊息: '全部欄位已修復' };
}

function 系統維護_建立備份() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const 名稱 = ss.getName() + '_備份_' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmmss');
  const 檔案 = DriveApp.getFileById(ss.getId()).makeCopy(名稱);
  記錄操作_('系統維護', '建立備份', 名稱, '完成', 檔案.getUrl());
  return { 成功: true, 訊息: '備份完成', 備份名稱: 名稱, 備份網址: 檔案.getUrl() };
}

function 系統維護_匯入CSV文字(工作表名稱, CSV文字, 是否清空舊資料) {
  if (!工作表名稱) throw new Error('缺少工作表名稱');
  if (!CSV文字) throw new Error('缺少 CSV 文字');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(工作表名稱) || ss.insertSheet(工作表名稱);
  const rows = Utilities.parseCsv(CSV文字);
  if (!rows.length) throw new Error('CSV 無資料');
  if (是否清空舊資料) sh.clearContents();
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  記錄操作_('系統維護', '匯入CSV文字', 工作表名稱, '完成', '筆數=' + (rows.length - 1));
  return { 成功: true, 訊息: 'CSV 匯入完成', 工作表名稱, 筆數: rows.length - 1 };
}

function 系統維護_產生每日戰情快照() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const 名稱 = '12_每日戰情快照';
  let sh = ss.getSheetByName(名稱);
  if (!sh) {
    sh = ss.insertSheet(名稱);
    sh.appendRow(['時間戳', '作業日', '人員數', '機台數', '進行中工單', '今日良品', '今日不良', '今日報工筆數', '逾期警示數']);
    sh.setFrozenRows(1);
  }
  const data = 取得首頁資料_();
  const x = data.指標;
  sh.appendRow([new Date(), data.作業日, x.人員數, x.機台數, x.進行中工單, x.今日良品, x.今日不良, x.今日報工筆數, (data.異常警示 || []).length]);
  return { 成功: true, 訊息: '每日戰情快照已建立', 作業日: data.作業日 };
}

function 寫入自檢報告_(結果) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const 名稱 = '系統_自檢報告';
  let sh = ss.getSheetByName(名稱);
  if (!sh) sh = ss.insertSheet(名稱);
  sh.clearContents();
  sh.appendRow(['檢查時間', '表名', '狀態', '缺少欄位', '建議']);
  結果.forEach(r => sh.appendRow([new Date(), r.表名, r.狀態, r.缺少欄位 || '', r.建議 || '']));
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#7c3aed').setFontColor('#ffffff');
}
