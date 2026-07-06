/* 報工作業 V4 中文合併版 v4.9.1 */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function q(s){return document.querySelector(s)}
function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
function center(n){setTimeout(function(){try{if(n)n.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'})}catch(e){}},120)}
function text(s,v){var n=q(s);if(n)n.textContent=v}
function ph(id,v){var n=$(id);if(n)n.placeholder=v}
function ui(){
  text('.title h1','製一組報工作業 V4');
  text('.title p','化新精密｜智慧製造中央作戰指揮中心');
  text('#page0 .guide-title','👆 步驟一：選擇作業員');
  text('#page0 .guide-desc','請點擊人員卡片、掃描工牌條碼，或搜尋姓名／工號。選定後會自動帶入班別與加班資料。');
  text('#page1 .guide-title','📦 步驟二：選擇產品與工站');
  text('#page1 .guide-desc','先選產品，才會顯示工站；選完工站後，才會顯示工序、主機台與機台卡片。機台清單只依 08_工站途程機台主檔。');
  text('#page2 .guide-title','📊 步驟三：輸入產出數量');
  text('#page2 .guide-desc','請輸入今日共做數與不良數，系統會自動計算實際良品數。所有數量不預填 0。');
  text('#page3 .guide-title','🧪 步驟四：品質、不良與照片');
  text('#page3 .guide-desc','不良原因由 05_不良代碼主檔帶入，分配數量不可超過步驟三的不良數。');
  text('#page4 .guide-title','✅ 步驟五：確認並送出報工');
  text('#page4 .guide-desc','請確認報工摘要。送出後寫入 09_報工；有不良時同步寫入 09_不良紀錄。');
  ph('personSearch','🔍 搜尋人員：姓名、工號、班別');
  ph('productSearch','🔍 搜尋產品：品名、產品編號、客戶品號');
  var back=$('backBtn'); if(back)back.textContent='← 上一步';
  var next=$('nextBtn'); if(next&&next.textContent.indexOf('送出')<0)next.textContent='下一步 →';
  qa('#stepper .step .txt').forEach(function(n,i){n.textContent=['人員','工件','產出','品質','確認'][i]||n.textContent});
}
function wrap(name,flag,fn){if(window[flag])return;var old=window[name];if(typeof old!=='function')return;window[flag]=true;window[name]=function(){var r=old.apply(this,arguments);setTimeout(fn,180);setTimeout(fn,560);return r}}
function boot(){ui();wrap('selectPerson','v491p',function(){ui();center($('selectedPersonArea'))});wrap('selectProduct','v491prod',function(){ui();center($('selectedProductArea'))});wrap('selectRouteByIndex','v491route',function(){ui();center($('routeFieldsArea'))});wrap('gotoStep','v491goto',ui);wrap('renderStepper','v491step',ui)}
window.V4ZhMerge491={boot:boot};
document.addEventListener('DOMContentLoaded',boot);setTimeout(boot,200);setInterval(boot,1600);
})();
