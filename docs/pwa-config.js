window.PWA_CONFIG=window.PWA_CONFIG||{};
Object.assign(window.PWA_CONFIG,{
  GAS_WEB_APP_URL:'https://script.google.com/macros/s/AKfycbwOi-xjKoMD9jVq4HrHBvh7k1DCn70lAPAJiqaWJhvH70PbuRo4ciopCjYcytIalaW4/exec',
  APP_NAME:'NEXUS OS · 工業 5.0 智慧製造矩陣',
  APP_SHORT_NAME:'化新精密',
  VERSION:'v4.5.4_報工作業V4_橋接修復',
  SPREADSHEET_ID:'1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS:12000,
  API_ACTIONS:{
    健康檢查:'健康檢查',主檔檢查:'主檔檢查',
    取得報工作業v2初始資料:'取得報工作業v2初始資料',寫入報工作業v2:'寫入報工作業v2',寫入不良紀錄v2:'寫入不良紀錄v2',手動重刷_主檔照片:'手動重刷_主檔照片',
    取得今日派班作業:'取得今日派班作業',寫入今日派班報工:'寫入今日派班報工',
    健康檢查_主線優化38_7:'健康檢查_主線優化38_7',初始化_主線優化38_7:'初始化_主線優化38_7',初始化_唯一資料庫鎖定38_7:'初始化_唯一資料庫鎖定38_7',初始化_19_人員排班規則:'初始化_19_人員排班規則',
    清洗生產計劃表38_7:'清洗生產計劃表38_7',自動排程38_7:'自動排程38_7',自動排程38_7_防重:'自動排程38_7_防重',取得今日任務38_7:'取得今日任務38_7',取得主線儀表板38_7:'取得主線儀表板38_7',
    更新今日派班狀態38_7:'更新今日派班狀態38_7',取得派班任務明細38_7:'取得派班任務明細38_7',
    取得清洗錯誤報告38_7:'取得清洗錯誤報告38_7',取得未報工追蹤38_7:'取得未報工追蹤38_7',更新今日派班狀態細分38_7:'更新今日派班狀態細分38_7',取得主管主線追蹤38_7:'取得主管主線追蹤38_7',
    主線實機驗收38_7:'主線實機驗收38_7',主線一鍵修復38_7:'主線一鍵修復38_7',測試_主線實機驗收38_7:'測試_主線實機驗收38_7',
    人員註冊38_7_查詢工號:'人員註冊38_7_查詢工號',人員註冊38_7_綁定:'人員註冊38_7_綁定',測試_人員註冊38_7:'測試_人員註冊38_7',
    測試_主線優化38_7:'測試_主線優化38_7',測試_今日派班報工回寫38_7:'測試_今日派班報工回寫38_7',測試_自動排程防重38_7:'測試_自動排程防重38_7',測試_工單扣帳38_7:'測試_工單扣帳38_7',測試_清洗錯誤追蹤38_7:'測試_清洗錯誤追蹤38_7'
  }
});
(function(){
  'use strict';
  var 設定=window.PWA_CONFIG||{};
  var v='454';
  var path=(location.pathname||'').toLowerCase();
  var title=(document.title||'').toLowerCase();
  var isV4Report=/work-report-v4(?:-\d+)?\.html$/.test(path)||(/work-report-v2\.html$/.test(path)&&/v4/.test(title));
  var isLegacyReport=/work-report-v2\.html$/.test(path)&&!isV4Report;
  var isApp=/app\.html$|\/$/.test(path);
  function load(src,id){if(document.getElementById(id))return;var s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s)}
  function css(){if(document.getElementById('報工正式樣式'))return;var l=document.createElement('link');l.id='報工正式樣式';l.rel='stylesheet';l.href='./work-report-v2-ui.css?v='+v;document.head.appendChild(l)}
  function baseURL(){return String(localStorage.getItem('智慧製造_臨時GAS_WEB_APP_URL')||設定.GAS_WEB_APP_URL||'').trim().replace(/\?.*$/,'')}
  function buildURL(action,payload){var u=new URL(baseURL());u.searchParams.set('action',action);u.searchParams.set('動作',action);u.searchParams.set('_ts',Date.now());Object.keys(payload||{}).forEach(function(k){var x=payload[k];if(x==null)return;u.searchParams.set(k,typeof x==='object'?JSON.stringify(x):String(x))});return u.toString()}
  function body(action,payload){var sp=new URLSearchParams();var obj=Object.assign({},payload||{},{action:action,動作:action,_ts:String(Date.now())});Object.keys(obj).forEach(function(k){var x=obj[k];if(x==null)return;sp.set(k,typeof x==='object'?JSON.stringify(x):String(x))});var json=JSON.stringify(obj);if(json.length<220000){sp.set('payload',json);sp.set('資料',json);sp.set('json',json)}return sp.toString()}
  async function parse(r){var t=await r.text();if(!r.ok)throw new Error('HTTP '+r.status);try{return JSON.parse(t)}catch(e){return {成功:false,success:false,訊息:'GAS 回傳不是 JSON',原始回應:t.slice(0,500)}}}
  function formPost(action,payload,reason){var iframe=document.createElement('iframe');var form=document.createElement('form');var name='gas_submit_'+Date.now();iframe.name=name;iframe.style.cssText='position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;border:0';form.method='POST';form.action=buildURL(action,{});form.target=name;form.style.display='none';var obj=Object.assign({},payload||{},{action:action,動作:action,_ts:String(Date.now())});Object.keys(obj).forEach(function(k){var i=document.createElement('input');i.type='hidden';i.name=k;i.value=typeof obj[k]==='object'?JSON.stringify(obj[k]):String(obj[k]||'');form.appendChild(i)});document.body.appendChild(iframe);document.body.appendChild(form);form.submit();setTimeout(function(){try{form.remove();iframe.remove()}catch(e){}},15000);return Promise.resolve({成功:true,success:true,opaque:true,transport:'hidden_form_post',訊息:'已使用 hidden form post 送出至 GAS；請以試算表寫入結果為準。',原因:reason||''})}
  async function GET(action,payload,options){return fetch(buildURL(action,payload),{method:'GET',cache:'no-store',mode:'cors',credentials:'omit'}).then(parse)}
  async function POST(action,payload,options){try{return await fetch(buildURL(action,{}),{method:'POST',cache:'no-store',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body(action,payload)}).then(parse)}catch(e){try{return await GET(action,payload,options)}catch(e2){return formPost(action,payload,e.message+'；'+e2.message)}}}
  async function 呼叫(action,payload,options){return String(options&&options.method||'GET').toUpperCase()==='POST'?POST(action,payload,options):GET(action,payload,options)}
  if(!window.GAS橋接器){window.GAS橋接器={取得GAS網址:baseURL,建立網址:buildURL,呼叫:呼叫,GET:GET,POST:POST,取得報工初始資料:function(){return 呼叫(設定.API_ACTIONS.取得報工作業v2初始資料,null,{method:'GET'})},寫入報工:function(p){return 呼叫(設定.API_ACTIONS.寫入報工作業v2,p,{method:'POST'})},寫入不良紀錄:function(p){return 呼叫(設定.API_ACTIONS.寫入不良紀錄v2,p,{method:'POST'})}}}
  if(isV4Report){load('./gas-bridge.js?v='+v,'GAS橋接器V4外部備援');return}
  if(isLegacyReport){css();load('./work-report-v2-hotfix-245.js?v='+v,'報工穩定熱修復245');load('./work-report-v2-dispatch-addon-248.js?v='+v,'報工今日派班外掛248');load('./work-report-v2-dispatch-guard-ui-249.js?v='+v,'報工今日派班防呆提示249');load('./work-report-v2-manager-entry-250.js?v='+v,'報工主管戰情入口250');load('./work-report-v2-photo-fix-252.js?v='+v,'報工機台照片修復252');load('./work-report-v2-task-prefill-253.js?v='+v,'今日任務帶入報工253');load('./work-report-v2-dispatch-card-261.js?v='+v,'報工派班任務卡261_顯示用');load('./work-report-v2-dispatch-submit-262.js?v='+v,'報工派班送出合併262')}
  if(isApp){load('./nexus-quick-module-258.js?v='+v,'NEXUS主線快速模組258');load('./nexus-mainline-get-shim-259.js?v='+v,'NEXUS主線GET覆寫259')}
})();