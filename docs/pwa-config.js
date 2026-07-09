window.PWA_CONFIG = window.PWA_CONFIG || {};
(function (設定) {
  'use strict';
  設定.GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ/exec';
  設定.APP_NAME = '化新精密｜製一組報工作業V4';
  設定.APP_SHORT_NAME = '化新報工';
  設定.VERSION = 'v5.1.7-defect-master-no-fake';
  設定.SPREADSHEET_ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  設定.API_TIMEOUT_MS = 20000;
  設定.API_ACTIONS = {
    INIT: ['取得報工作業V4初始資料', 'getWorkReportV4Init', 'init'],
    SUBMIT: ['submitWorkReportV4', '寫入報工作業V4']
  };

  // v517：不良原因主檔修復檔改由最早載入的 pwa-config 直接掛載，避免 Safari 吃到舊 opening-particles 快取。
  // 注意：這裡只載入對接修復器；資料仍然來自 05_不良代碼主檔，不再使用前端假資料。
  function 載入不良主檔修復器() {
    var id = 'hx-defect-master-fix-517';
    if (document.getElementById(id)) return;
    var s = document.createElement('script');
    s.id = id;
    s.src = './work-report-v4-defect-master-fix-514.js?v=517';
    s.defer = true;
    s.onerror = function () { console.error('[報工V4] 不良主檔修復檔載入失敗'); };
    document.head.appendChild(s);
  }
  載入不良主檔修復器();
  window.addEventListener('DOMContentLoaded', 載入不良主檔修復器, { once: true });
  window.addEventListener('load', 載入不良主檔修復器, { once: true });
})(window.PWA_CONFIG);
