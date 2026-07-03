/* 報工作業 V4 正式規則修復 v4.7.0 */
(function(){
  'use strict';
  var PATCH_VERSION = 'v4.7.0_觸控防誤觸_工站機台規則';
  function g(id){return document.getElementById(id)}
  function q(sel,root){return (root||document).querySelector(sel)}
  function qa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel))}
  function txt(v){return String(v==null?'':v)}
  function safe(s){return txt(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function pick(o,keys){o=o||{};for(var i=0;i<keys.length;i++){var v=o[keys[i]];if(v!==undefined&&v!==null&&txt(v).trim()!=='')return txt(v).trim()}return ''}
  function photo(src){src=txt(src).trim();var m=src.match(/(?:id=|\/d\/)([-\w]{20,})/);if(m)return 'https://drive.google.com/thumbnail?id='+m[1]+'&sz=w450';return /^https?:/i.test(src)?src:''}
  function splitMachines(raw){
    if(Array.isArray(raw))return raw.map(function(x){return typeof x==='string'?{機台編號:x}:x}).filter(Boolean);
    var s=txt(raw).trim();
    if(!s)return [];
    if(s.charAt(0)==='['){try{return JSON.parse(s).map(function(x){return typeof x==='string'?{機台編號:x}:x}).filter(Boolean)}catch(e){}}
    return s.split(/[、,，;；/\s]+/).map(function(id){id=txt(id).trim().replace(/\.0$/,'');return id?{機台編號:id}:null}).filter(Boolean);
  }
  function installStyle(){
    if(g('v4Rules470Style'))return;
    var css = `
      .v4-search-wrap{position:relative;margin-bottom:10px}.v4-search-wrap .search-input{padding-right:52px!important;margin-bottom:0!important}.v4-scan-mini{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:39px;height:39px;border:0;border-radius:14px;background:#eaf3ff;color:#1967d2;font-size:19px;font-weight:900;box-shadow:inset 0 0 0 1px #c8ddff}.v4-hidden{display:none!important}.guide-card{padding:10px 12px!important;margin-bottom:10px!important;border-radius:20px!important}.guide-icon{font-size:24px!important}.guide-title{font-size:13px!important}.guide-desc{font-size:10.8px!important;line-height:1.45!important}.glass-card{padding:12px!important;border-radius:22px!important;overflow:hidden}.grid-2,.grid-3{gap:8px!important;min-width:0}.grid-2>*,.grid-3>*{min-width:0}input,select,textarea{max-width:100%;min-width:0;font-size:13.5px!important;padding:10px 11px!important;border-radius:16px!important}.stats-grid{gap:8px!important}.stat-card{padding:10px 6px!important;border-radius:17px!important;min-width:0}.stat-label{font-size:10.5px!important}.stat-value{font-size:24px!important}.defect-row{gap:7px!important;align-items:flex-end!important}.defect-row select{min-width:0!important}.qty-input{width:78px!important;min-width:72px!important}.machine-grid{gap:8px!important}.machine-card{min-height:104px!important;padding:8px!important;border-radius:18px!important}.machine-card img{height:58px!important;border-radius:13px!important}.machine-no-img{width:58px!important;height:42px!important;margin:0 auto 6px!important;border-radius:12px!important;border:1px dashed #b8cff7!important;background:#edf4ff!important;color:#6e8fc4!important;font-size:10px!important;line-height:1.15!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important}.machine-number{font-size:16px!important}.machine-info{font-size:10.5px!important}.photo-btns,.photo-actions{gap:7px!important}.photo-btn,.photo-action-btn{padding:10px 4px!important;border-radius:17px!important;font-size:12.5px!important}.bottom-bar{grid-template-columns:0.55fr 1fr!important;padding:9px 12px calc(9px + var(--safe-bottom))!important}.btn-primary,.btn-secondary{padding:12px 8px!important;font-size:13.5px!important;border-radius:20px!important}.person-card,.product-card{touch-action:pan-y!important}@media(max-width:420px){.grid-3{grid-template-columns:1fr!important}.grid-2{grid-template-columns:1fr 1fr!important}.defect-row{grid-template-columns:32px minmax(0,1fr) 78px!important}.photo-btns,.photo-actions{grid-template-columns:1fr!important}.guide-desc br{display:none}}@media(max-width:360px){.grid-2{grid-template-columns:1fr!important}.defect-row{grid-template-columns:1fr!important}.qty-input{width:100%!important}}
    `;
    var st=document.createElement('style');st.id='v4Rules470Style';st.textContent=css;document.head.appendChild(st);
  }
  function moveScanIntoSearch(inputId, openFnName){
    var input=g(inputId); if(!input||input.closest('.v4-search-wrap'))return;
    var wrap=document.createElement('div');wrap.className='v4-search-wrap';input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    var b=document.createElement('button');b.type='button';b.className='v4-scan-mini';b.textContent='📷';b.title='掃描 / Scan';b.addEventListener('click',function(){ if(typeof window[openFnName]==='function') window[openFnName](); else input.focus(); });wrap.appendChild(b);
  }
  function hideBigScanButtons(){
    qa('.scan-btn').forEach(function(btn){
      var p0=btn.closest('#stepPage0'), p1=btn.closest('#stepPage1');
      if(p0||p1)btn.classList.add('v4-hidden');
    });
  }
  function selectedPersonContainer(){var d=g('selectedPersonDisplay');return d?d.closest('.glass-card'):null}
  function updateSelectedPersonVisibility(){
    var card=selectedPersonContainer(); if(!card)return;
    var pid=g('personId'); var has=pid&&txt(pid.value).trim();
    card.classList.toggle('v4-hidden',!has);
  }
  function productHasSelected(){var area=g('selectedProductArea');return area&&!area.classList.contains('hidden')}
  function routeSelected(){var s=g('workstationSelect');return s&&txt(s.value)!==''}
  function setRouteDetailVisible(on){
    var ids=['processRange','stdCapacity','stdTimeSec','mainMachineSelect','machineListGrid'];
    ids.forEach(function(id){var el=g(id);if(!el)return;var box=el.closest('.grid-3')||el;box.classList.toggle('v4-hidden',!on);if(id==='mainMachineSelect'){var lab=el.previousElementSibling;if(lab&&lab.classList)lab.classList.toggle('v4-hidden',!on)}});
  }
  function updateProductRouteVisibility(){
    var area=g('selectedProductArea'); if(!area)return;
    var hasProduct=productHasSelected();
    area.classList.toggle('hidden',!hasProduct);
    var ws=g('workstationSelect');
    if(ws){ws.classList.toggle('v4-hidden',!hasProduct);var lab=ws.previousElementSibling;if(lab&&lab.classList)lab.classList.toggle('v4-hidden',!hasProduct)}
    setRouteDetailVisible(hasProduct&&routeSelected());
  }
  function normalizeMachineListFromRoute(gr){
    gr=gr||{};
    var list=gr.機台清單;
    if(!Array.isArray(list)||!list.length)list=splitMachines(pick(gr,['機台清單','可用機台清單','Machine List']));
    list=list.map(function(m){
      if(typeof m==='string')m={機台編號:m};
      var id=pick(m,['機台編號','主機台','設備編號','編號'])||pick(gr,['主機台']);
      return Object.assign({},m,{機台編號:id,主機台:id,設備名稱:pick(m,['設備名稱','機台名稱'])||('機台'+id),照片網址:photo(pick(m,['照片網址','縮圖網址']))});
    }).filter(function(m){return m.機台編號});
    return list;
  }
  function patchMachineFunctions(){
    if(window.__v4MachinePatched)return; window.__v4MachinePatched=true;
    window.buildMachineSelect=function(list){
      var s=g('mainMachineSelect'); if(!s)return; s.innerHTML='';
      list=normalizeMachineListFromRoute(window.STATE&&STATE.currentWorkstation||{機台清單:list});
      if(!list.length){s.add(new Option('此工站未設定機台清單',''));return}
      list.forEach(function(m,i){s.add(new Option([m.機台編號,m.設備名稱].filter(Boolean).join('｜'),m.機台編號||String(i)))});
    };
    window.renderMachineGrid=function(list){
      var box=g('machineListGrid'); if(!box)return;
      list=normalizeMachineListFromRoute(window.STATE&&STATE.currentWorkstation||{機台清單:list});
      if(!list.length){box.innerHTML='<div class="caption" style="padding:8px;grid-column:1/-1;">請補 08_工站途程機台主檔「機台清單」欄位。</div>';return}
      box.innerHTML=list.map(function(m){var u=photo(m.縮圖網址||m.照片網址);return '<div class="machine-card ripple">'+(u?'<img src="'+safe(u)+'" onerror="this.outerHTML=&quot;<div class=machine-no-img>未建<br>機台照</div>&quot;">':'<div class="machine-no-img">未建<br>機台照</div>')+'<div class="machine-number">'+safe(m.機台編號||'')+'</div><div class="machine-info">'+safe([m.設備名稱,m.機台型號,m.區域].filter(Boolean).join('｜'))+'</div></div>'}).join('');
    };
  }
  function patchProductSelection(){
    if(window.__v4ProductPatched)return; window.__v4ProductPatched=true;
    var oldSelect=window.selectProduct;
    if(typeof oldSelect==='function')window.selectProduct=function(key){oldSelect.apply(this,arguments);setTimeout(function(){var s=g('workstationSelect');if(s)s.value='';updateProductRouteVisibility()},0)};
    var oldWork=window.onWorkstationChange;
    if(typeof oldWork==='function')window.onWorkstationChange=function(){oldWork.apply(this,arguments);setTimeout(updateProductRouteVisibility,0)};
    var oldClear=window.clearWorkstationFields;
    if(typeof oldClear==='function')window.clearWorkstationFields=function(){oldClear.apply(this,arguments);setTimeout(updateProductRouteVisibility,0)};
  }
  function installAntiMistouch(){
    var sx=0,sy=0,moved=false,target=null;
    document.addEventListener('pointerdown',function(e){target=e.target.closest('.person-card,.product-card');if(!target)return;sx=e.clientX;sy=e.clientY;moved=false},{capture:true,passive:true});
    document.addEventListener('pointermove',function(e){if(!target)return;if(Math.abs(e.clientX-sx)>10||Math.abs(e.clientY-sy)>10)moved=true},{capture:true,passive:true});
    document.addEventListener('click',function(e){var c=e.target.closest('.person-card,.product-card');if(c&&moved){e.preventDefault();e.stopImmediatePropagation();moved=false;target=null}},true);
    document.addEventListener('pointerup',function(){setTimeout(function(){moved=false;target=null},0)},{capture:true,passive:true});
  }
  function patchDefectRules(){
    function totalNG(){var x=g('ngQty');return Number(x&&x.value||0)}
    function allocated(except){return qa('.qty-input').filter(function(x){return x!==except}).reduce(function(s,x){return s+(Number(x.value)||0)},0)}
    window.v4LimitDefectQty=function(input){var max=totalNG(),other=allocated(input),v=Number(input.value)||0;if(other+v>max){input.value=Math.max(0,max-other); if(typeof window.roar==='function')roar('⚠️','不良分配超過上限','分配數量不可超過 Step 3 的不良數','warning')} };
    var oldQty=window.onDefectQtyChange;
    window.onDefectQtyChange=function(id,v){ if(typeof oldQty==='function')oldQty.apply(this,arguments); var row=document.getElementById('defectRow_'+id); var input=row&&row.querySelector('.qty-input'); if(input)window.v4LimitDefectQty(input); if(typeof window.updateDefectSummaryDisplay==='function')updateDefectSummaryDisplay(); };
    var oldSummary=window.updateDefectSummaryDisplay;
    window.updateDefectSummaryDisplay=function(){ if(typeof oldSummary==='function')oldSummary.apply(this,arguments); var box=g('defectSummary'); if(!box)return; var max=totalNG(),sum=allocated(); if(max>0||sum>0){var over=sum>max;box.innerHTML='📊 分配總和：<b>'+sum+'</b> / 總不良：<b>'+max+'</b>（<span style="color:'+(over?'var(--g-red)':'var(--g-green)')+'">'+(over?'⚠ 不可超過':'✓ 未超過')+'</span>）';box.classList.remove('hidden')} };
    var ng=g('ngQty'); if(ng)ng.addEventListener('input',function(){qa('.qty-input').forEach(window.v4LimitDefectQty);if(typeof window.updateDefectSummaryDisplay==='function')updateDefectSummaryDisplay()});
  }
  function patchBuildProductGridAfterRender(){
    var old=window.buildProductGrid;
    if(typeof old==='function'&&!window.__v4BuildGridPatched){window.__v4BuildGridPatched=true;window.buildProductGrid=function(){old.apply(this,arguments);setTimeout(function(){installAntiMistouch()},0)}}
  }
  function init(){
    installStyle();
    moveScanIntoSearch('personSearch','openPersonScan');
    moveScanIntoSearch('productSearch','openProductScan');
    hideBigScanButtons();
    updateSelectedPersonVisibility();
    updateProductRouteVisibility();
    patchMachineFunctions();
    patchProductSelection();
    patchDefectRules();
    patchBuildProductGridAfterRender();
    installAntiMistouch();
    if(window.STATE&&STATE.currentProductGroup)updateProductRouteVisibility();
    var obs=new MutationObserver(function(){moveScanIntoSearch('personSearch','openPersonScan');moveScanIntoSearch('productSearch','openProductScan');hideBigScanButtons();updateSelectedPersonVisibility();updateProductRouteVisibility();installAntiMistouch()});
    obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','value']});
    console.log('報工作業V4規則修復已載入',PATCH_VERSION);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
