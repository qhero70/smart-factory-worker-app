/**
 * 07_報工作業v2_GAS入口
 * 階段：報工作業 v2
 * 定位：由 Apps Script 自己開啟報工頁，避免 GitHub Pages 跨網域與前端安全限制。
 * 注意：本檔不宣告 doGet / doPost，不影響既有正式入口。
 */

function 開啟報工作業v2() {
  return HtmlService
    .createHtmlOutputFromFile('07_報工作業v2')
    .setTitle('報工作業 v2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function 取得報工作業v2資料() {
  if (typeof 取得04工站API資料 !== 'function') {
    return {
      成功: false,
      訊息: '找不到 取得04工站API資料，請確認 05_GAS_API_04