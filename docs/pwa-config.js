window.PWA_CONFIG={
  GAS_WEB_APP_URL:'https://script.google.com/macros/s/AKfycbwOi-xjKoMD9jVq4HrHBvh7k1DCn70lAPAJiqaWJhvH70PbuRo4ciopCjYcytIalaW4/exec',
  APP_NAME:'NEXUS OS · 工業 5.0 智慧製造矩陣',
  APP_SHORT_NAME:'化新精密',
  VERSION:'v2.2.6_38.7_主線實機驗收',
  SPREADSHEET_ID:'1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS:12000,
  API_ACTIONS:{
    健康檢查:'健康檢查',主檔檢查:'主檔檢查',
    取得報工作業v2初始資料:'取得報工作業v2初始資料',寫入報工作業v2:'寫入報工作業v2',寫入不良紀錄v2:'寫入不良紀錄v2',
    手動重刷_主檔照片:'手動重刷_主檔照片',取得今日派班作業:'取得今日派班作業',寫入今日派班報工:'寫入今日派班報工',
    健康檢查_主線優化38_7:'健康檢查_主線優化38_7',初始化_主線優化38_7:'初始化_主線優化38_7',初始化_唯一資料庫鎖定38_7:'初始化_唯一資料庫鎖定38_7',初始化_19_人員排班規則:'初始化_19_人員排班規則',
    清洗生產計劃表38_7:'清洗生產計劃表38_7',自動排程38_7:'自動排程38_7',自動排程38_7_防重:'自動排程38_7_防重',取得今日任務38_7:'取得今日任務38_7',取得主線儀表板38_7:'取得主線儀表板38_7',
    更新今日派班狀態38_7:'更新今日派班狀態38_7',取得派班任務明細38_7:'取得派班任務明細38_7',
    取得清洗錯誤報告38_7:'取得清洗錯誤報告38_7',取得未報工追蹤38_7:'取得未報工追蹤38_7',更新今日派班狀態細分38_7:'更新今日派班狀態細分38_7',取得主管主線追蹤38_7:'取得主管主線追蹤38_7',
    主線實機驗收38_7:'主線實機驗收38_7',主線一鍵修復38_7:'主線一鍵修復38_7',測試_主線實機驗收38_7:'測試_主線實機驗收38_7',
    測試_主線優化38_7:'測試_主線優化38_7',測試_今日派班報工回寫38_7:'測試_今日派班報工回寫38_7',測試_自動排程防重38_7:'測試_自動排程防重38_7',測試_工單扣帳38_7:'測試_工單扣帳38_7',測試_清洗錯誤追蹤38_7:'測試_清洗錯誤追蹤38_7'
  }
};
(function(){
  'use strict';
  var v='256';
  function load(src,id){if(document.getElementById(id))return;var s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s)}
  function css(){if(document.getElementById('報工正式樣式'))return;var l=document.createElement('link');l.id='報工正式樣式';l.rel='stylesheet';l.href='./work-report-v2-ui.css?v='+v;document.head.appendChild(l)}
  css();
  load('./work-report-v2-hotfix-245.js?v='+v,'報工穩定熱修復245');
  load('./work-report-v2-dispatch-addon-248.js?v='+v,'報工今日派班外掛248');
  load('./work-report-v2-dispatch-guard-ui-249.js?v='+v,'報工今日派班防呆提示249');
  load('./work-report-v2-manager-entry-250.js?v='+v,'報工主管戰情入口250');
  load('./work-report-v2-photo-fix-252.js?v='+v,'報工機台照片修復252');
  load('./work-report-v2-task-prefill-253.js?v='+v,'今日任務帶入報工253');
  load('./nexus-os-mainline-254.js?v='+v,'NEXUS主管追蹤254');
  load('./nexus-mainline-acceptance-256.js?v='+v,'NEXUS主線驗收256');
})();
