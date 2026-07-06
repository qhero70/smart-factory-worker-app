window.PWA_CONFIG=window.PWA_CONFIG||{};
Object.assign(window.PWA_CONFIG,{
  GAS_WEB_APP_URL:'https://script.google.com/macros/s/AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ/exec',
  APP_NAME:'NEXUS OS · 工業 5.0 智慧製造矩陣',
  APP_SHORT_NAME:'化新精密',
  VERSION:'v4.9.1_報工作業V4_中文合併版',
  SPREADSHEET_ID:'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8',
  正式主資料庫ID:'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8',
  API_TIMEOUT_MS:15000,
  API_ACTIONS:{
    INIT:['取得報工作業v2初始資料','getWorkReportV4Init','init','讀取資料庫快照'],
    SUBMIT:['submitWorkReportV4','寫入報工作業v4','寫入報工作業v2','寫入現場報工V1'],
    SUBMIT_DEFECT:['submitDefectsV4','寫入不良紀錄v4','寫入不良紀錄v2']
  }
});
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function Q(s){return document.querySelector(s)}
function QA(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function T(s,v){var n=Q(s);if(n)n.textContent=v}
function P(id,v){var n=E(id);if(n)n.placeholder=v}
function C(n){setTimeout(function(){try{if(n)n.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'})}catch(e){}},160)}
function css(){if(E('v491ZhInlineCss'))return;var s=document.createElement('style');s.id='v491ZhInlineCss';s.textContent='.en{display:none!important}#stepper{overflow-x:auto!important;justify-content:flex-start!important;padding-left:12px!important;gap:6px!important}#stepper .step{flex-shrink:0!important}#stepper .txt{font-size:14px!important;font-weight:1000!important;white-space:nowrap!important}.guide-card{padding:11px 13px!important;margin-bottom:10px!important;border-radius:20px!important}.guide-title{font-size:17px!important;line-height:1.3!important}.guide-desc{font-size:13px!important;line-height:1.45!important}.card-title{font-size:18px!important}.field-label{font-size:13px!important;margin:8px 0 4px!important}.search{height:46px!important;font-size:13px!important;padding-right:50px!important}.scan-mini{width:36px!important;height:36px!important;right:6px!important}.glass-card{padding:12px!important;border-radius:22px!important}.selected-box,.selected-product,#routeFieldsArea{scroll-margin-top:170px!important}@media(max-width:430px){#stepper .txt{font-size:13px!important}.guide-title{font-size:16px!important}.guide-desc{font-size:12.5px!important}.grid-2,.grid-3{grid-template-columns:1fr!important}}';document.head.appendChild(s)}
function ui(){
 css();
 T('.title h1','製一組報工作業 V4');T('.title p','化新精密｜智慧製造中央作戰指揮中心');
 T('#page0 .guide-title','👆 步驟一：選擇作業員');T('#page0 .guide-desc','請點擊人員卡片、掃描工牌條碼，或搜尋姓名／工號。選定後會自動帶入班別與加班資料。');
 T('#page1 .guide-title','📦 步驟二：選擇產品與工站');T('#page1 .guide-desc','先選產品，才會顯示工站；選完工站後，才會顯示工序、主機台與機台卡片。機台清單只依 08_工站途程機台主檔。');
 T('#page2 .guide-title','📊 步驟三：輸入產出數量');T('#page2 .guide-desc','請輸入今日共做數與不良數，系統會自動計算實際良品數。所有數量不預填 0。');
 T('#page3 .guide-title','🧪 步驟四：品質、不良與照片');T('#page3 .guide-desc','不良原因由 05_不良代碼主檔帶入，分配數量不可超過步驟三的不良數。');
 T('#page4 .guide-title','✅ 步驟五：確認並送出報工');T('#page4 .guide-desc','請確認報工摘要。送出後寫入 09_報工；有不良時同步寫入 09_不良紀錄。');
 P('personSearch','🔍 搜尋人員：姓名、工號、班別');P('productSearch','🔍 搜尋產品：品名、產品編號、客戶品號');P('totalQty','請輸入今日共做數');P('ngQty','可留空，不預填 0');P('remarks','可留空，輸入異常描述或現場備註');
 var back=E('backBtn');if(back)back.textContent='← 上一步';var next=E('nextBtn');if(next&&next.textContent.indexOf('送出')<0)next.textContent='下一步 →';
 QA('#stepper .step .txt').forEach(function(n,i){n.textContent=['人員','工件','產出','品質','確認'][i]||n.textContent});
 QA('.field-label,.summary-row div:first-child').forEach(function(n){var x=(n.textContent||'').split('/')[0].trim();if(x)n.textContent=x});
}
function W(name,flag,after){if(window[flag])return;var old=window[name];if(typeof old!=='function')return;window[flag]=true;window[name]=function(){var r=old.apply(this,arguments);setTimeout(function(){ui();after&&after()},180);setTimeout(function(){ui();after&&after()},560);return r}}
function boot(){ui();W('selectPerson','v491Person',function(){C(E('selectedPersonArea'))});W('selectProduct','v491Product',function(){C(E('selectedProductArea'))});W('selectRouteByIndex','v491Route',function(){C(E('routeFieldsArea'))});W('gotoStep','v491Goto',function(){});W('renderStepper','v491Step',function(){})}
window.V4ZhInline491={boot:boot};
document.addEventListener('DOMContentLoaded',boot);setTimeout(boot,200);setTimeout(boot,900);setInterval(boot,1800);
})();
