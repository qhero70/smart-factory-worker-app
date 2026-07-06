/* 報工作業 V4 UI/UX 鎖定規則 v4.8.8
 * 正式基準：黑底版、手機優先、08_工站途程機台主檔、05_不良代碼主檔。
 * 不改 GAS、不改資料庫，只補強前端互動與顯示規則。
 */
(function(){
'use strict';
var MOVE_LIMIT=12;
var touch={x:0,y:0,moved:false,t:0};
function E(id){return document.getElementById(id)}
function S(v){return String(v==null?'':v).trim()}
function center(el){setTimeout(function(){try{el&&el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'})}catch(e){}},120)}
function installCSS(){
  if(E('v488rulesCss'))return;
  var s=document.createElement('style');
  s.id='v488rulesCss';
  s.textContent=[
    'html,body{overflow-x:hidden!important;max-width:100vw!important;-webkit-overflow-scrolling:touch!important}',
    '.hidden,.v4-hide{display:none!important}',
    '.topbar{position:sticky!important;top:0!important;z-index:80!important}',
    '.stepper{position:sticky!important;z-index:70!important;margin:8px 10px!important;padding:7px 8px!important;border-radius:20px!important;overflow-x:auto!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}',
    '.guide-card{position:sticky!important;z-index:60!important;padding:8px 10px!important;margin-bottom:8px!important;border-radius:16px!important;line-height:1.35!important}',
    '.guide-title{font-size:13px!important;line-height:1.3!important;margin:0!important}',
    '.guide-desc{font-size:10px!important;line-height:1.35!important;margin-top:2px!important}',
    '.glass-card{padding:11px!important;margin-bottom:8px!important;border-radius:20px!important;max-width:100%!important;overflow:hidden!important}',
    '.card-title{font-size:15px!important;margin-bottom:8px!important;line-height:1.25!important}',
    '.field-label{font-size:11px!important;margin:7px 0 3px!important;line-height:1.25!important}',
    '.search-wrap{position:relative!important;margin:6px 0 7px!important}',
    '.search-wrap input,.search{height:40px!important;border-radius:18px!important;padding-left:12px!important;padding-right:50px!important;font-size:13px!important;max-width:100%!important}',
    '.scan-mini{position:absolute!important;right:5px!important;top:50%!important;transform:translateY(-50%)!important;width:36px!important;height:36px!important;border-radius:14px!important;border:1px solid rgba(77,163,255,.28)!important;background:rgba(77,163,255,.14)!important;color:#b9d8ff!important;font-size:18px!important;display:grid!important;place-items:center!important;z-index:4!important}',
    '.scan-large{display:none!important}',
    '.person-grid,.product-grid{display:grid!important;gap:7px!important;padding:1px!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important}',
    '.person-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;max-height:360px!important}',
    '.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;max-height:310px!important}',
    '.person-card,.product-card,.machine-card{position:relative!important;overflow:hidden!important;padding:0!important;border-radius:16px!important;border:2px solid transparent!important;background:rgba(255,255,255,.055)!important;touch-action:pan-y!important;-webkit-tap-highlight-color:transparent!important;user-select:none!important}',
    '.person-card{min-height:138px!important;aspect-ratio:3/4!important}',
    '.product-card{min-height:126px!important;aspect-ratio:4/3!important}',
    '.machine-card{min-height:102px!important;padding:0!important}',
    '.person-card.selected,.product-card.selected,.machine-card.selected{border-color:#4da3ff!important;box-shadow:0 0 0 2px rgba(77,163,255,.45) inset,0 0 22px rgba(77,163,255,.32)!important}',
    '.person-card.selected:after,.product-card.selected:after,.machine-card.selected:after{content:"✓";position:absolute;left:6px;top:6px;width:22px;height:22px;border-radius:50%;background:#4da3ff;color:#fff;display:grid;place-items:center;font-size:12px;font-weight:1000;z-index:5}',
    '.avatar,.product-thumb,.card-photo{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;border-radius:0!important;border:0!important;background:rgba(255,255,255,.04)!important;display:block!important}',
    '.avatar img,.product-thumb img,.card-photo img,.machine-card img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important;display:block!important;border-radius:0!important}',
    '.card-fallback,.machine-no-img{position:absolute!important;inset:auto 0 0 0!important;height:28px!important;border:0!important;border-top:1px dashed rgba(255,255,255,.12)!important;border-radius:0!important;background:rgba(255,255,255,.055)!important;color:rgba(255,255,255,.45)!important;font-size:10px!important;font-weight:800!important;display:grid!important;place-items:center!important;margin:0!important}',
    '.person-card:before,.product-card:before,.machine-card:before{content:"";position:absolute;left:0;right:0;bottom:0;height:64%;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.86));z-index:1;pointer-events:none}',
    '.card-overlay,.person-name,.person-id,.product-name,.product-code,.machine-no{position:relative!important;z-index:2!important;color:#fff!important;text-shadow:0 1px 3px rgba(0,0,0,.78)!important}',
    '.card-overlay{position:absolute!important;left:0!important;right:0!important;bottom:0!important;padding:28px 6px 7px!important;text-align:center!important;background:transparent!important}',
    '.ov-name,.person-name,.product-name{font-size:12px!important;font-weight:1000!important;line-height:1.18!important;color:#fff!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}',
    '.ov-code,.person-id,.product-code{display:inline-block!important;margin-top:2px!important;padding:2px 6px!important;border-radius:999px!important;background:rgba(0,0,0,.42)!important;color:#d8e9ff!important;font-size:9px!important;font-weight:900!important}',
    '.badge{z-index:6!important;right:5px!important;top:5px!important;font-size:8px!important;padding:2px 6px!important;background:rgba(0,0,0,.58)!important;color:#fff!important}',
    '.selected-box,.selected-product{border-radius:16px!important;padding:9px!important;margin:6px 0!important;gap:9px!important}',
    '.selected-box .avatar,.selected-product .product-thumb{position:relative!important;width:56px!important;height:56px!important;border-radius:13px!important;flex:0 0 56px!important;overflow:hidden!important}',
    '.selected-text{font-size:15px!important;font-weight:1000!important;line-height:1.25!important}',
    '.grid-2,.grid-3,.stats-grid{gap:6px!important;min-width:0!important}',
    '.grid-2>*,.grid-3>*,.stats-grid>*{min-width:0!important}',
    'input,select,textarea,.field{height:40px!important;max-width:100%!important;min-width:0!important;font-size:13px!important;border-radius:12px!important;padding:7px 9px!important}',
    'textarea.field,textarea{height:70px!important;min-height:58px!important}',
    '.machine-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;margin-top:6px!important;overflow:hidden!important}',
    '.stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}',
    '.stat-card{border-radius:14px!important;padding:7px 5px!important;min-width:0!important}',
    '.stat-label{font-size:9px!important;line-height:1.2!important}',
    '.stat-value{font-size:20px!important;margin-top:2px!important}',
    '.defect-row{display:grid!important;grid-template-columns:30px minmax(0,1fr) 64px!important;gap:5px!important;margin:5px 0!important;align-items:center!important}',
    '.defect-row button{height:34px!important;min-height:34px!important;border-radius:10px!important;font-size:10px!important;padding:0!important}',
    '.defect-row select,.defect-row input{height:36px!important;font-size:11px!important;border-radius:10px!important;min-width:0!important;padding:5px 6px!important}',
    '.photo-toolbar{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important}',
    '.photo-tool-btn{min-width:0!important;height:36px!important;min-height:36px!important;padding:5px!important;border-radius:12px!important;font-size:11px!important;line-height:1.15!important}',
    '.summary{padding:11px!important;border-radius:18px!important;overflow:hidden!important}',
    '.summary h2{font-size:15px!important;margin-bottom:7px!important}',
    '.summary-row{grid-template-columns:86px minmax(0,1fr)!important;gap:6px!important;padding:6px 0!important;font-size:11px!important;line-height:1.35!important}',
    '.summary-row .val{word-break:break-word!important}',
    '.bottom-bar{max-width:520px!important;margin:0 auto!important;left:0!important;right:0!important;gap:7px!important;padding:7px 10px calc(7px + env(safe-area-inset-bottom,12px))!important;background:rgba(10,17,30,.88)!important;border-top:1px solid rgba(255,255,255,.12)!important;backdrop-filter:blur(22px)!important;-webkit-backdrop-filter:blur(22px)!important}',
    '.btn{height:48px!important;border-radius:15px!important;font-size:14px!important;line-height:1.15!important;white-space:normal!important}',
    '.btn-secondary{background:rgba(255,255,255,.07)!important;color:#d9e5f6!important;border:1px solid rgba(255,255,255,.14)!important}',
    '.btn-primary,.btn-green{box-shadow:0 6px 18px rgba(43,111,221,.32)!important}',
    '.toast-stack{top:86px!important;right:8px!important;max-width:270px!important}',
    '.toast{border-radius:12px!important;padding:8px 10px!important;font-size:11px!important}',
    '.scan-modal-inner{max-width:420px!important;border-radius:22px!important;background:rgba(15,23,42,.97)!important}',
    '.scan-modal-inner video{width:100%!important;max-height:58vh!important;object-fit:cover!important;background:#000!important}',
    '@media(max-width:430px){.page{padding:0 10px!important}.grid-2,.grid-3{grid-template-columns:1fr!important}.person-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.machine-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.defect-row{grid-template-columns:28px minmax(0,1fr) 58px!important}.photo-toolbar{grid-template-columns:repeat(3,minmax(0,1fr))!important}.title h1{font-size:17px!important}.title p{font-size:10px!important}.app-icon{width:38px!important;height:38px!important;border-radius:13px!important}.topbar{padding:10px 12px 9px!important}.status-pill{font-size:10px!important;padding:5px 9px!important}.step .circle{width:24px!important;height:24px!important;border-width:2px!important}.step span.txt{font-size:8px!important}}'
  ].join('');
  document.head.appendChild(s);
}
function syncSearchScanButtons(){
  var p=E('personSearch'),q=E('productSearch');
  if(p&&p.parentElement){p.parentElement.classList.add('search-wrap');}
  if(q&&q.parentElement){q.parentElement.classList.add('search-wrap');}
}
function syncVisibility(){
  var st=window.V4_STATE||{};
  var hasPerson=!!(st.operator&&st.operator.工號)||!!S(E('personId')&&E('personId').value);
  var pc=E('selectedPersonArea'); if(pc)pc.classList.toggle('v4-hide',!hasPerson);
  var hasProd=!!(st.product&&st.product.產品編號)||!!S(E('productCode')&&E('productCode').value);
  var pa=E('selectedProductArea'); if(pa)pa.classList.toggle('v4-hide',!hasProd);
  var ws=E('workstationSelect'); if(ws){ws.classList.toggle('v4-hide',!hasProd); if(ws.previousElementSibling)ws.previousElementSibling.classList.toggle('v4-hide',!hasProd)}
  var hasWs=hasProd&&!!S(ws&&ws.value);
  var rf=E('routeFieldsArea'); if(rf)rf.classList.toggle('v4-hide',!hasWs);
  ['processRange','stdCapacity','stdTimeSec'].forEach(function(id){var x=E(id),box=x&&(x.closest('.grid-3')||x); if(box)box.classList.toggle('v4-hide',!hasWs)});
  var mm=E('mainMachineSelect'); if(mm){mm.classList.toggle('v4-hide',!hasWs); if(mm.previousElementSibling)mm.previousElementSibling.classList.toggle('v4-hide',!hasWs)}
  var mg=E('machineListGrid'); if(mg)mg.classList.toggle('v4-hide',!hasWs);
}
function installTouchGuard(){
  if(window.__V4_TOUCH_GUARD__)return;window.__V4_TOUCH_GUARD__=true;
  document.addEventListener('touchstart',function(e){var c=e.target.closest&&e.target.closest('.person-card,.product-card,.machine-card');if(!c)return;var t=e.touches&&e.touches[0];if(!t)return;touch={x:t.clientX,y:t.clientY,moved:false,t:Date.now(),el:c};},true);
  document.addEventListener('touchmove',function(e){if(!touch.el)return;var t=e.touches&&e.touches[0];if(!t)return;var dx=Math.abs(t.clientX-touch.x),dy=Math.abs(t.clientY-touch.y);if(dx>MOVE_LIMIT||dy>MOVE_LIMIT){touch.moved=true;touch.el.setAttribute('data-v4-moved','1')}},true);
  document.addEventListener('touchend',function(){if(touch.el){setTimeout(function(el){el&&el.removeAttribute('data-v4-moved')},180,touch.el)}},true);
  document.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('.person-card,.product-card,.machine-card');if(!c)return;if(c.getAttribute('data-v4-moved')==='1'||touch.moved){e.preventDefault();e.stopImmediatePropagation();touch.moved=false;return false}},true);
}
function patchDefectLimit(){
  if(window.__V4_DEFECT_PATCH__)return;window.__V4_DEFECT_PATCH__=true;
  document.addEventListener('input',function(e){var q=e.target&&e.target.classList&&e.target.classList.contains('qty-input')?e.target:null;if(!q)return;var ng=Number(S(E('ngQty')&&E('ngQty').value))||0;var sum=0;document.querySelectorAll('.qty-input').forEach(function(i){if(i!==q)sum+=(Number(S(i.value))||0)});var max=Math.max(0,ng-sum);var val=Number(S(q.value))||0;if(val>max){q.value=max;if(window.v4Toast)window.v4Toast('分配數量已自動限制','不良分配不可超過 Step 3 的不良數','warn')}},true);
}
function patchMachineSource(){
  if(window.__V4_MACHINE_PATCH__)return;window.__V4_MACHINE_PATCH__=true;
  var old=window.selectRouteByIndex;
  if(typeof old==='function'){
    window.selectRouteByIndex=function(v){old(v);setTimeout(function(){var st=window.V4_STATE||{},r=st.route||{};var list=Array.isArray(r.機台清單)?r.機台清單:[];if(!list.length&&S(r.機台編號)){list=S(r.機台編號).split(/[、,，;；\s]+/).filter(Boolean).map(function(id){return{機台編號:id,機台名稱:'機台'+id,設備名稱:'機台'+id,照片網址:'',縮圖網址:''}});r.機台清單=list}syncVisibility();},60)};
  }
}
function boot(){installCSS();syncSearchScanButtons();installTouchGuard();patchDefectLimit();patchMachineSource();syncVisibility();setTimeout(function(){center(E('selectedPersonArea'));},0)}
window.V4Rules={syncVisibility:syncVisibility,center:center,boot:boot};
document.addEventListener('DOMContentLoaded',boot);
setTimeout(boot,200);setTimeout(boot,700);setInterval(function(){syncSearchScanButtons();syncVisibility()},600);
})();
