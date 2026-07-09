window.PWA_CONFIG = window.PWA_CONFIG || {};
(function (設定) {
  'use strict';
  設定.GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ/exec';
  設定.APP_NAME = '化新精密｜製一組報工作業V4';
  設定.APP_SHORT_NAME = '化新報工';
  設定.VERSION = 'v5.2.0-defect-select-force';
  設定.SPREADSHEET_ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  設定.API_TIMEOUT_MS = 20000;
  設定.API_ACTIONS = {
    INIT: ['取得報工作業V4初始資料', 'getWorkReportV4Init', 'init'],
    SUBMIT: ['submitWorkReportV4', '寫入報工作業V4']
  };

  function 啟用不良原因修復器() {
    if (!document.getElementById('hx-defect-grid-picker-519')) {
      var a = document.createElement('script');
      a.id = 'hx-defect-grid-picker-519';
      a.src = './work-report-v4-defect-grid-picker-519.js?v=520';
      a.defer = true;
      document.head.appendChild(a);
    }
    if (!document.getElementById('hx-defect-select-force-520')) {
      var b = document.createElement('script');
      b.id = 'hx-defect-select-force-520';
      b.src = './work-report-v4-defect-select-force-520.js?v=520';
      b.defer = true;
      document.head.appendChild(b);
    }
  }

  啟用不良原因修復器();
  window.addEventListener('DOMContentLoaded', 啟用不良原因修復器, { once: true });
  window.addEventListener('load', 啟用不良原因修復器, { once: true });
})(window.PWA_CONFIG);
