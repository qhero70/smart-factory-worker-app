window.PWA_CONFIG={
  GAS_WEB_APP_URL:'https://script.google.com/macros/s/AKfycbwOi-xjKoMD9jVq4HrHBvh7k1DCn70lAPAJiqaWJhvH70PbuRo4ciopCjYcytIalaW4/exec',
  APP_NAME:'製造部智慧製造應用總部',
  VERSION:'v2.1.37_報工穩定版_今日派班外掛',
  SPREADSHEET_ID:'1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS:8000,
  API_ACTIONS:{
    健康檢查:'健康檢查',
    主檔檢查:'主檔檢查',
    取得報工作業v2初始資料:'取得報工作業v2初始資料',
    寫入報工作業v2:'寫入報工作業v2',
    寫入不良紀錄v2:'寫入不良紀錄v2',
    手動重刷_主檔照片:'手動重刷_主檔照片',
    取得今日派班作業:'取得今日派班作業',
    寫入今日派班報工:'寫入今日派班報工'
  }
};
(function(){
  'use strict';
  var v='247';
  function load(src,id){
    if(document.getElementById(id))return;
    var s=document.createElement('script');
    s.id=id;
    s.src=src;
    s.async=false;
    document.head.appendChild(s);
  }
  function css(){
    if(document.getElementById('報工正式樣式'))return;
    var l=document.createElement('link');
    l.id='報工正式樣式';
    l.rel='stylesheet';
    l.href='./work-report-v2-ui.css?v='+v;
    document.head.appendChild(l);
  }
  css();
  load('./work-report-v2-hotfix-245.js?v='+v,'報工穩定熱修復245');
  load('./work-report-v2-dispatch-addon.js?v='+v,'報工今日派班外掛');
})();
