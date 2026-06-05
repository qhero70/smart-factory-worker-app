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

function 測試開啟報工作業v2入口() {
  return {
    成功: true,
    訊息: '報工作業 v2 入口函數已載入',
    函數: '開啟報工作業v2',
    時間: new Date()
  };
}
