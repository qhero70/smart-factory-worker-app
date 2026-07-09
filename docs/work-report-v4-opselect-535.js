/* 報工V4｜工站選單OP1顯示 v535 */
(function(){
  if(window.__HX_OP_SELECT_535__)return;window.__HX_OP_SELECT_535__=true;
  function split(t){return String(t||'').replace(/，/g,',').replace(/、/g,',').split(',').map(function(x){return x.trim()}).filter(Boolean)}
  function opLabel(t){var a=split(t);return a.length?a.map(function(x,i){return 'OP'+(i+1)+': '+x}).join(' / '):''}
  function routeText(r){r=r||{};var station=r.報工工站名稱||r.工站名稱||'';var ops=opLabel(r.工序範圍||r.工序||r.工序編號_最終||'');var machine=r.機台編號||r.主機台||'';return [station,ops,machine].filter(Boolean).join('｜')}
  function rebuild(){var s=document.getElementById('workstationSelect');if(!s||!window.STATE||!Array.isArray(window.STATE.productGroupList))return;var old=s.value;s.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';window.STATE.productGroupList.forEach(function(r,i){s.add(new Option(routeText(r),String(i)))});s.value=old||''}
  function patch(){if(typeof window.buildWorkstationSelect==='function'&&!window.buildWorkstationSelect.__op535){var old=window.buildWorkstationSelect;window.buildWorkstationSelect=function(){var ret=old.apply(this,arguments);setTimeout(rebuild,0);return ret};window.buildWorkstationSelect.__op535=true}rebuild()}
  window.addEventListener('load',function(){setTimeout(patch,500);setTimeout(rebuild,1200)});
  document.addEventListener('click',function(){setTimeout(patch,50)},true);
})();
