/**
 * 07_報工作業v2_GAS入口
 * 目的：開啟 Apps Script 內建報工作業 v2 頁面。
 * 注意：本檔不宣告 doGet / doPost，不影響既有正式入口。
 */
function 開啟報工作業v2() {
  return HtmlService
    .createHtmlOutputFromFile('07_報工作業v2')
    .setTitle('報工作業 v2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 由 Google Sheets 右側側邊欄開啟報工作業 v2。
 * 這個函數適合在 Apps Script 編輯器手動執行測試。
 */
function 顯示報工作業v2側邊欄() {
  const 畫面 = HtmlService
    .createHtmlOutputFromFile('07_報工作業v2')
    .setTitle('報工作業 v2');

  SpreadsheetApp.getUi().showSidebar(畫面);
}

/**
 * 測試入口函數是否已正