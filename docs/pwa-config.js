window.PWA_CONFIG = {
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbweSKwcREbv-5R5E1ZIj_XOZDGQzRPCdoOAy2uTkhMwZTZoIv-GtpQi0PF8ahdb6KEJ/exec',
  APP_NAME: '製造部智慧製造應用總部',
  VERSION: 'v1.0.0',
  SPREADSHEET_ID: '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS: 20000,
  API_ACTIONS: {
    健康檢查: '健康檢查',
    主檔檢查: '主檔檢查',
    取得報工作業v2初始資料: '取得報工作業v2初始資料',
    寫入報工作業v2: '寫入報工作業v2',
    寫入不良紀錄v2: '寫入不良紀錄v2',
    手動重刷_主檔照片: '手動重刷_主檔照片'
  }
};

(function(){
  'use strict';
  if(!location.pathname.includes('work-report-v2.html')) return;
  if(window.__報工V2補強載入器已啟動) return;
  window.__報工V2補強載入器已啟動 = true;

  const 腳本清單 = [
    './work-report-v2-photo-fallback.js',
    './work-report-v2-dom-fix.js',
    './work-report-v2-shift-fix-v124.js'
  ];

  function 載入腳本(src){
    const 檔名 = src.split('/').pop();
    if(Array.from(document.scripts).some(s => String(s.src || '').includes(檔名))) return;
    const script = document.createElement('script');
    script.src = src + '?v=124';
    script.defer = true;
    document.head.appendChild(script);
  }

  腳本清單.forEach(載入腳本);
})();
