function 開啟報工作業v2() {
  return HtmlService.createHtmlOutputFromFile('07_報工作業v2')
    .setTitle('報工作業 v2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function 顯示報工作業v2側邊欄() {
  var 畫面 = HtmlService.createHtmlOutputFromFile('07_報工作業v2')
    .setTitle('報工作業 v2');
  SpreadsheetApp.getUi().showSidebar(畫面);
}
