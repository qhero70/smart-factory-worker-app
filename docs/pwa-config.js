window.PWA_CONFIG = window.PWA_CONFIG || {};
(function (設定) {
  'use strict';
  設定.GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ/exec';
  設定.APP_NAME = '化新精密｜製一組報工作業V4';
  設定.APP_SHORT_NAME = '化新報工';
  設定.VERSION = 'v5.1.8-defect-grid-picker';
  設定.SPREADSHEET_ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  設定.API_TIMEOUT_MS = 20000;
  設定.API_ACTIONS = {
    INIT: ['取得報工作業V4初始資料', 'getWorkReportV4Init', 'init'],
    SUBMIT: ['submitWorkReportV4', '寫入報工作業V4']
  };

  // v518：不良原因改成兩欄格子選擇器，取代 iPhone 原生 select。
  // 資料仍只允許來自 05_不良代碼主檔，不使用前端假資料。
  function 載入不良原因格子選擇器() {
    var id = 'hx-defect-grid-picker-518';
    if (document.getElementById(id)) return;
    var s = document.createElement('script');
    s.id = id;
    s.src = './work-report-v4-defect-grid-picker-518.js?v=518';
    s.defer = true;
    s.onerror = function () { console.error('[報工V4] 不良原因格子選擇器載入失敗'); };
    document.head.appendChild(s);
  }
  載入不良原因格子選擇器();
  window.addEventListener('DOMContentLoaded', 載入不良原因格子選擇器, { once: true });
  window.addEventListener('load', 載入不良原因格子選擇器, { once: true });
})(window.PWA_CONFIG);
