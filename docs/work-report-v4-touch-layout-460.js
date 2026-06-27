/* 製一組報工表單 V4｜手機滑動防誤觸與搜尋列小掃碼 v4.6.0
 * 只修：滑動誤點產品、人員/產品掃碼小圖示放搜尋列右側、工站未選前隱藏、手機框架縮小防溢出。
 */
(function(){
  'use strict';
  var bound=false, movedUntil=0, startX=0, startY=0, startT=0, moved=false;
  function d(id){return document.getElementById(id)}
  function txt(v){return String(v==null?'':v).trim()}
  function has(id){var e=d(id);return !!(e&&txt(e.value))}
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
      'body:not(.v460-workstation-ok) #processRange,body:not(.v460-workstation-ok) #stdCapacity,body:not(.v460-workstation-ok) #stdTimeSec,body:not(.v460-workstation-ok) #mainMachineSelect,body:not(.v460-workstation-ok) #machineListGrid{display:none!important}',
      'body:not(.v460-workstation-ok) label[for="mainMachineSelect"]{display:none!important}',
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
  function wrap(){
    if(typeof selectPerson==='function'&&!selectPerson.__v460){var a=selectPerson;window.selectPerson=function(){var r=a.apply(this,arguments);setTimeout(function(){syncSections(true)},120);return r};window.selectPerson.__v460=true}
    if(typeof selectProduct==='function'&&!selectProduct.__v460){var b=selectProduct;window.selectProduct=function(){var r=b.apply(this,arguments);setTimeout(function(){syncSections(true);makeScanRows()},150);return r};window.selectProduct.__v460=true}
    if(typeof onWorkstationChange==='function'&&!onWorkstationChange.__v460){var c=onWorkstationChange;window.onWorkstationChange=function(){var r=c.apply(this,arguments);setTimeout(function(){syncSections(true)},90);return r};window.onWorkstationChange.__v460=true}
  }
  function guard(){
    if(bound)return;bound=true;
    document.addEventListener('touchstart',function(e){var card=e.target.closest&&e.target.closest('.product-card,.person-card');if(!card)return;startX=e.touches[0].clientX;startY=e.touches[0].clientY;startT=Date.now();moved=false},true);
    document.addEventListener('touchmove',function(e){if(!e.touches.length)return;var dx=Math.abs(e.touches[0].clientX-startX),dy=Math.abs(e.touches[0].clientY-startY);if(dx>8||dy>8)moved=true},true);
    document.addEventListener('touchend',function(e){var card=e.target.closest&&e.target.closest('.product-card,.person-card');if(!card)return;if(moved){movedUntil=Date.now()+450;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}},true);
    document.addEventListener('click',function(e){var card=e.target.closest&&e.target.closest('.product-card,.person-card');if(!card)return;if(Date.now()<movedUntil){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();return;}setTimeout(function(){syncSections(true)},220)},true);
    document.addEventListener('change',function(e){if(e.target&&e.target.id==='workstationSelect')setTimeout(function(){syncSections(true)},80)},true);
  }
  function install(){css();makeScanRows();wrap();guard();syncSections(false)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',function(){install();setTimeout(install,800)});
  setInterval(install,1500);
})();