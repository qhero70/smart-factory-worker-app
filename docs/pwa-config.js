window.PWA_CONFIG = window.PWA_CONFIG || {};
(function (設定) {
  'use strict';
  設定.GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ/exec';
  設定.APP_NAME = '化新精密｜製一組報工作業V4';
  設定.APP_SHORT_NAME = '化新報工';
  設定.VERSION = 'v5.3.0-database-v529-official';
  設定.SPREADSHEET_ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  設定.API_TIMEOUT_MS = 20000;
  設定.API_ACTIONS = {
    INIT: ['取得報工作業V4初始資料', 'getWorkReportV4Init', 'init'],
    SUBMIT: ['submitWorkReportV4', '寫入報工作業V4']
  };

  function 載入JS(id, src) {
    if (document.getElementById(id)) return;
    var s = document.createElement('script');
    s.id = id;
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  }

  function 啟用報工修復器() {
    載入JS('hx-data-v529-adapter-530', './work-report-v4-data-v529-adapter.js?v=530');
    載入JS('hx-defect-grid-picker-519', './work-report-v4-defect-grid-picker-519.js?v=521');
    載入JS('hx-defect-select-force-520', './work-report-v4-defect-select-force-520.js?v=521');
    載入JS('hx-photo-display-527', './work-report-v4-photo-display-522.js?v=527');
  }

  啟用報工修復器();
  window.addEventListener('DOMContentLoaded', 啟用報工修復器, { once: true });
  window.addEventListener('load', 啟用報工修復器, { once: true });
})(window.PWA_CONFIG);
