/* 報工作業 V4 UI/UX 規則 v4.8.3 */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function S(v){return String(v==null?'':v).trim()}
function center(el){setTimeout(function(){try{el&&el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'})}catch(e){}},120)}
function installCSS(){
  if(E('v483rulesCss'))return;
  var s=document.createElement('style');
  s.id='v483rulesCss';
  s.textContent='html,body{overflow-x:hidden!important}.hidden,.v4-hide{display:none!important}.product-grid,.person-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.product-card,.person-card{touch-action:pan-y!important}.search-wrap{position:relative;margin:8px 0 10px}.search-wrap input{width:100%!important;padding-right:52px!important}.scan-mini{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:40px;height:40px;border:0;border-radius:14px;background:#e8f0fe;color:#1967d2;font-size:18px;font-weight:900}.machine-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.glass-card{padding:12px!important;border-radius:22px!important}.guide-card{padding:10px 12px!important;border-radius:20px!important}.grid-2,.grid-3,.stats-grid{gap:8px!important;min-width:0!important}.grid-2>*,.grid-3>*,.stats-grid>*{min-width:0!important}input,select,textarea{max-width:100%!important;min-width:0!important;font-size:14px!important}.defect-row{display:grid!important;grid-template-columns:34px minmax(0,1fr) 84px!important;gap:7px!important}.bottom-bar{max-width:100vw!important;left:0!important;right:0!important;gap:8px!important}@media(max-width:430px){.grid-2,.grid-3,.defect-row{grid-template-columns:1fr!important}.photo-toolbar{grid-template-columns:1fr!important}}';
  document.head.appendChild(s);
}
function syncVisibility(){
  var st=window.V4_STATE||{};
  var hasPerson=!!(st.operator&&st.operator.工號)||!!S(E('personId')&&E('personId').value);
  var pc=E('selectedPersonArea'); if(pc)pc.classList.toggle('v4-hide',!hasPerson);
  var hasProd=!!(st.product&&st.product.產品編號)||!!S(E('productCode')&&E('productCode').value);
  var pa=E('selectedProductArea'); if(pa)pa.classList.toggle('v4-hide',!hasProd);
  var ws=E('workstationSelect'); if(ws){ws.classList.toggle('v4-hide',!hasProd); if(ws.previousElementSibling)ws.previousElementSibling.classList.toggle('v4-hide',!hasProd)}
  var hasWs=hasProd&&!!S(ws&&ws.value);
  ['processRange','stdCapacity','stdTimeSec'].forEach(function(id){var x=E(id),box=x&&(x.closest('.grid-3')||x); if(box)box.classList.toggle('v4-hide',!hasWs)});
  var mm=E('mainMachineSelect'); if(mm){mm.classList.toggle('v4-hide',!hasWs); if(mm.previousElementSibling)mm.previousElementSibling.classList.toggle('v4-hide',!hasWs)}
  var mg=E('machineListGrid'); if(mg)mg.classList.toggle('v4-hide',!hasWs);
}
function boot(){installCSS();syncVisibility();setInterval(syncVisibility,700)}
window.V4Rules={syncVisibility:syncVisibility,center:center};
document.addEventListener('DOMContentLoaded',boot);setTimeout(boot,300);setTimeout(boot,1000);
})();
