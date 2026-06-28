/* 製一組報工表單 V4｜手機滑動防誤觸與搜尋列小掃碼 v4.6.0
 * 只修：滑動誤點產品、人員/產品掃碼小圖示放搜尋列右側、工站未選前隱藏、手機框架縮小防溢出。
 * 460-修正版：補強早於 453 產品 touchend 的視窗層防誤觸、補齊工站未選前欄位標籤隱藏、保護手動時間不被預設值覆蓋。
 */
(function(){
  'use strict';
  var bound=false, movedUntil=0, startX=0, startY=0, startT=0, moved=false, touchCard=null;
  function d(id){return document.getElementById(id)}
  function txt(v){return String(v==null?'':v).trim()}
  function has(id){var e=d(id);return !!(e&&txt(e.value))}
  function cardOf(e){return e&&e.target&&e.target.closest?e.target.closest('.product-card,.person-card'):null}
  function stop(e){try{e.preventDefault()}catch(_){}try{e.stopPropagation()}catch(_){}if(e&&e.stopImmediatePropagation)try{e.stopImmediatePropagation()}catch(_){}}
  function css(){
    if(d('v460style'))return;
    var s=document.createElement('style');s.id='v460style';
    s.textContent=[
      'html,body{width:100%!important;max-width:100vw!important;overflow-x:hidden!important}',
      '*,*:before,*:after{box-sizing:border-box!important}',
      '.outer-wrap{max-width:100vw!important;overflow-x:hidden!important;padding-left:10px!important;padding-right:10px!important}',
      '.glass-card,.guide-card,.step-section{max-width:100%!important;overflow:hidden!important}',
      '.glass-card{padding:13px!important;border-radius:20px!important}',
      '.guide-card{padding:10px 11px!important;margin-bottom:9px!important;border-radius:18px!important}',
      '.guide-icon{font-size:22px!important;min-width:30px!important}',
      '.guide-title{font-size:15px!important;line-height:1.25!important}',
      '.guide-desc{font-size:12px!important;line-height:1.36!important;max-height:70px!important;overflow:auto!important}',
      '.v460-search-row{display:grid!important;grid-template-columns:minmax(0,1fr) 44px!important;gap:8px!important;align-items:center!important;width:100%!important;margin:8px 0!important}',
      '.v460-search-row .search-input{margin:0!important;width:100%!important;min-width:0!important}',
      '.v460-scan-mini{width:44px!important;height:44px!important;min-height:44px!important;max-width:44px!important;margin:0!important;padding:0!important;border-radius:15px!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:20px!important;line-height:1!important;overflow:hidden!important}',
      '.v460-scan-mini .s-icon{font-size:20px!important;margin:0!important}.v460-scan-mini .v460-text{display:none!important}',
      '.v460-hidden{display:none!important}',
      '#selectedProductArea.v460-hidden{display:none!important}',
      'body:not(.v460-product-ok) #selectedProductArea{display:none!important}',
      'body:not(.v460-workstation-ok) .v460-process-grid,body:not(.v460-workstation-ok) .v460-machine-label{display:none!important}',
      'body:not(.v460-workstation-ok) #processRange,body:not(.v460-workstation-ok) #stdCapacity,body:not(.v460-workstation-ok) #stdTimeSec,body:not(.v460-workstation-ok) #mainMachineSelect,body:not(.v460-workstation-ok) #machineListGrid{display:none!important}',
      'input,select,textarea{max-width:100%!important;min-width:0!important}',
      '.grid-2,.grid-3{width:100%!important;min-width:0!important;gap:8px!important}',
      '.grid-2>* ,.grid-3>*{min-width:0!important;max-width:100%!important}',
      '#stepPage2 .grid-2{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}',
      '#stepPage2 input{height:48px!important;font-size:16px!important;padding:6px 8px!important}',
      '#totalQty,#ngQty{font-size:20px!important;height:50px!important}',
      '#totalQty::placeholder,#ngQty::placeholder{font-size:14px!important}',
      '.stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}',
      '.stat-card{padding:9px 5px!important;border-radius:15px!important;min-width:0!important}.stat-label{font-size:10.5px!important;line-height:1.18!important}.stat-value{font-size:18px!important}',
      '.anomaly-section{max-width:100%!important;overflow:hidden!important;padding:12px!important;border-radius:18px!important}',
      '.anomaly-section input{height:46px!important;font-size:14px!important;padding:6px 8px!important}',
      '.photo-toolbar{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}.photo-tool-btn{font-size:12px!important;padding:9px 5px!important;min-width:0!important}',
      '.bottom-bar{max-width:100vw!important;left:0!important;right:0!important;padding-left:10px!important;padding-right:10px!important;gap:8px!important}',
      '.product-card,.person-card{touch-action:pan-y!important}',
      '.v460-pop{animation:v460pop .25s ease-out both}@keyframes v460pop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '@media(max-width:380px){.outer-wrap{padding-left:8px!important;padding-right:8px!important}.v460-search-row{grid-template-columns:minmax(0,1fr) 40px!important;gap:6px!important}.v460-scan-mini{width:40px!important;height:40px!important;min-height:40px!important}.guide-desc{max-height:58px!important}.glass-card{padding:11px!important}.photo-tool-btn{font-size:11px!important}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function tagWorkstationBlocks(){
    var pr=d('processRange');
    var grid=pr&&pr.closest?pr.closest('.grid-3'):null;
    if(grid)grid.classList.add('v460-process-grid');
    var mm=d('mainMachineSelect');
    var label=mm&&mm.previousElementSibling;
    if(label&&label.classList&&label.classList.contains('field-label'))label.classList.add('v460-machine-label');
  }
  function makeScanRows(){
    pair('personSearch','openPersonScan');
    pair('productSearch','openProductScan');
  }
  function pair(searchId,fnName){
    var input=d(searchId); if(!input)return;
    var old=[].slice.call(document.querySelectorAll('button.scan-btn')).find(function(b){return (b.getAttribute('onclick')||'').indexOf(fnName)>=0 || txt(b.textContent).indexOf(searchId==='personSearch'?'Scan Badge':'Scan Product Barcode')>=0});
    if(!old)return;
    if(input.parentElement&&input.parentElement.classList.contains('v460-search-row')){old.classList.add('v460-scan-mini');return;}
    var row=document.createElement('div');row.className='v460-search-row';
    input.parentNode.insertBefore(row,input);row.appendChild(input);row.appendChild(old);
    old.classList.add('v460-scan-mini');old.type='button';old.innerHTML='<span class="s-icon">📷</span><span class="v460-text">Scan</span>';
    old.title=searchId==='personSearch'?'掃描工牌 / Scan Badge':'掃描產品條碼 / Scan Product Barcode';
    old.setAttribute('aria-label',old.title);
  }
  function syncSections(go){
    var pc=has('personId')||has('personName');
    var person=d('selectedPersonDisplay');var pcard=person?person.closest('.glass-card'):null;
    if(pcard){pcard.classList.toggle('v460-hidden',!pc);if(pc&&go){pcard.classList.add('v460-pop');setTimeout(function(){pcard.classList.remove('v460-pop')},400)}}
    var prod=has('productCode')||has('productName');
    document.body.classList.toggle('v460-product-ok',prod);
    var area=d('selectedProductArea');if(area){area.classList.toggle('hidden',!prod);area.classList.toggle('v460-hidden',!prod);if(prod&&go){area.classList.add('v460-pop');setTimeout(function(){area.classList.remove('v460-pop')},400)}}
    var ws=d('workstationSelect');var ok=!!(ws&&txt(ws.value));
    document.body.classList.toggle('v460-workstation-ok',ok);
  }
  function 強化工時計算(){
    ['startTime','endTime'].forEach(function(id){
      var e=d(id); if(!e||e.__v460time)return; e.__v460time=true;
      ['input','change'].forEach(function(evt){e.addEventListener(evt,function(){window.__v460時間已手動修改=true;if(typeof calcWorkingHours==='function')setTimeout(function(){try{calcWorkingHours()}catch(_){}} ,0);},true)});
    });
    var shift=d('shiftSelect');
    if(shift&&!shift.__v460shift){shift.__v460shift=true;shift.addEventListener('change',function(){window.__v460時間已手動修改=false;if(typeof setDefaultTimes==='function')setTimeout(function(){try{setDefaultTimes(true)}catch(_){}} ,0);},true)}
    if(typeof calcWorkingHours==='function'&&!calcWorkingHours.__v460){
      var oldCalc=calcWorkingHours;
      window.calcWorkingHours=function(){
        var s=d('startTime'), e=d('endTime'), out=d('workingHours');
        var sv=s?txt(s.value):'', ev=e?txt(e.value):'';
        if(sv&&ev){
          var diff=(new Date(ev)-new Date(sv))/3600000;
          if(isFinite(diff)&&diff<0&&diff>-24)diff+=24;
          if(out)out.value=(isFinite(diff)&&diff>=0)?diff.toFixed(2)+' hrs':'';
          try{if(typeof updatePreview==='function')updatePreview()}catch(_){}
          try{if(typeof updateConfirmSummary==='function')updateConfirmSummary()}catch(_){}
          return;
        }
        return oldCalc.apply(this,arguments);
      };
      window.calcWorkingHours.__v460=true;
    }
    if(typeof setDefaultTimes==='function'&&!setDefaultTimes.__v460){
      var oldDefault=setDefaultTimes;
      window.setDefaultTimes=function(force){
        var s=d('startTime'), e=d('endTime');
        var hasValue=(s&&txt(s.value))||(e&&txt(e.value));
        if(window.__v460時間已手動修改&&!force&&hasValue){
          if(typeof calcWorkingHours==='function')try{calcWorkingHours()}catch(_){}
          return;
        }
        return oldDefault.apply(this,arguments);
      };
      window.setDefaultTimes.__v460=true;
    }
  }
  function wrap(){
    if(typeof selectPerson==='function'&&!selectPerson.__v460){var a=selectPerson;window.selectPerson=function(){window.__v460時間已手動修改=false;var r=a.apply(this,arguments);setTimeout(function(){syncSections(true)},120);return r};window.selectPerson.__v460=true}
    if(typeof selectProduct==='function'&&!selectProduct.__v460){var b=selectProduct;window.selectProduct=function(){var r=b.apply(this,arguments);setTimeout(function(){syncSections(true);makeScanRows()},150);return r};window.selectProduct.__v460=true}
    if(typeof onWorkstationChange==='function'&&!onWorkstationChange.__v460){var c=onWorkstationChange;window.onWorkstationChange=function(){var r=c.apply(this,arguments);setTimeout(function(){syncSections(true)},90);return r};window.onWorkstationChange.__v460=true}
  }
  function touchStart(e){var card=cardOf(e);if(!card||!e.touches||!e.touches.length)return;touchCard=card;startX=e.touches[0].clientX;startY=e.touches[0].clientY;startT=Date.now();moved=false}
  function touchMove(e){if(!touchCard||!e.touches||!e.touches.length)return;var dx=Math.abs(e.touches[0].clientX-startX),dy=Math.abs(e.touches[0].clientY-startY);if(dx>8||dy>8)moved=true}
  function touchEnd(e){if(!touchCard)return;var wasMoved=moved;touchCard=null;if(wasMoved){movedUntil=Date.now()+650;window.__v453_touch_card=null;stop(e)}}
  function clickBlock(e){var card=cardOf(e);if(!card)return;if(Date.now()<movedUntil){stop(e);return true}return false}
  function guard(){
    if(bound)return;bound=true;
    var opt={capture:true,passive:false};
    window.addEventListener('touchstart',touchStart,opt);
    window.addEventListener('touchmove',touchMove,opt);
    window.addEventListener('touchend',touchEnd,opt);
    window.addEventListener('click',clickBlock,true);
    document.addEventListener('touchstart',touchStart,opt);
    document.addEventListener('touchmove',touchMove,opt);
    document.addEventListener('touchend',function(e){if(clickBlock(e))return;var card=cardOf(e);if(!card)return;if(moved){movedUntil=Date.now()+650;window.__v453_touch_card=null;stop(e)}},opt);
    document.addEventListener('click',function(e){if(clickBlock(e))return;var card=cardOf(e);if(!card)return;setTimeout(function(){syncSections(true)},220)},true);
    document.addEventListener('change',function(e){if(e.target&&e.target.id==='workstationSelect')setTimeout(function(){syncSections(true)},80)},true);
  }
  function install(){css();tagWorkstationBlocks();makeScanRows();強化工時計算();wrap();guard();syncSections(false)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',function(){install();setTimeout(install,800)});
  setInterval(install,1500);
})();
