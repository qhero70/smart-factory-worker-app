/* 製一組報工表單 V4｜工件原生邏輯恢復 v4.4.6
 * 原則：停止 443/444/445 額外工站面板；回到原本「產品 → 工站下拉 → 機台清單 → 主機台」流程。
 * 修復：產品選擇只用產品編號/客戶品號對應工站，不用品名模糊猜測。
 */
(function(){
  'use strict';
  var VER='v4.4.6_native_workpiece_flow_restore';
  function $(id){return document.getElementById(id)}
  function txt(v){return String(v==null?'':v).trim()}
  function norm(v){return txt(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase()}
  function esc(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v)}return ''}
  function setv(id,v){var e=$(id);if(e)e.value=v||''}
  function toast(a,b,c,t){try{if(typeof roar==='function')roar(a,b,c,t||'success')}catch(e){}}
  function scrollTo(el){if(!el)return;setTimeout(function(){try{el.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}},120)}
  function removeBadPanels(){['v4StationDock444','v445StationPanel','v4StationQuickPicker443','v4StationQuickPicker'].forEach(function(id){var e=$(id);if(e)e.remove()})}
  function addCss(){if($('v446_native_style'))return;var s=document.createElement('style');s.id='v446_native_style';s.textContent=[
    '#v4StationDock444,#v445StationPanel,#v4StationQuickPicker443,#v4StationQuickPicker{display:none!important}',
    '#workstationSelect{border:4px solid rgba(25,103,210,.55)!important;background:#fffdf2!important;font-size:18px!important;font-weight:1000!important;min-height:56px!important}',
    '#machineListGrid{border:3px dashed rgba(25,103,210,.28)!important;border-radius:22px!important;padding:10px!important;background:rgba(232,240,254,.45)!important}',
    '.v446Notice{margin:12px 0;padding:12px;border-radius:18px;background:#fff8d7;border:2px solid rgba(251,188,4,.55);font-weight:900;color:#6b4a00;line-height:1.55}'
  ].join('\n');document.head.appendChild(s)}
  function productByKey(key){var parts=String(key||'').split('|');var code=parts[0]||'';var name=parts.slice(1).join('|')||'';var nc=norm(code);var list=[];try{list=list.concat(DB.products||DB.產品清單||[],DB.workstationGroups||[])}catch(e){}var hit=list.find(function(p){return nc&&(norm(p.產品編號)===nc||norm(p.客戶品號)===nc)}) || list.find(function(p){return name&&p.品名===name});return hit||{產品編號:code,品名:name}}
  function routeList(product){var pc=norm(pick(product,['產品編號']));var cc=norm(pick(product,['客戶品號']));var groups=[];try{groups=DB.workstationGroups||[]}catch(e){}var list=groups.filter(function(g){var rc=norm(pick(g,['產品編號']));var rcc=norm(pick(g,['客戶品號']));return (pc&&rc&&pc===rc)||(cc&&rcc&&cc===rcc)||(pc&&rcc&&pc===rcc)||(cc&&rc&&cc===rc)});
    var seen={};return list.filter(function(g){var k=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');if(seen[k])return false;seen[k]=true;return true}).sort(function(a,b){return String(a.工序範圍||a.工序||'').localeCompare(String(b.工序範圍||b.工序||''),'zh-Hant',{numeric:true})})}
  function machineText(list){return (list||[]).map(function(m){return m&&m.機台編號}).filter(Boolean).join('、')}
  function buildNativeNotice(list){var area=$('selectedProductArea')||($('workstationSelect')&&$('workstationSelect').parentNode);if(!area)return;var old=$('v446NativeNotice');if(old)old.remove();var div=document.createElement('div');div.id='v446NativeNotice';div.className='v446Notice';div.innerHTML=list.length?'✅ 已回復原工件流程：請先在下方「工站」下拉選單選工站，選完才會展開機台清單與主機台。':'⚠️ 此產品在 08_工站途程機台主檔 沒有產品編號/客戶品號對應工站，系統不再用名稱亂猜。';var sel=$('workstationSelect');if(sel&&sel.parentNode)sel.parentNode.insertBefore(div,sel);else area.insertBefore(div,area.firstChild)}
  function selectProductNative(key){removeBadPanels();addCss();if(!window.DB||!window.STATE)return;document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected')});try{var card=document.querySelector('.product-card[data-key="'+(window.CSS&&CSS.escape?CSS.escape(key):String(key).replace(/"/g,'\\"'))+'"]');if(card)card.classList.add('selected')}catch(e){}
    var p=productByKey(key);var routes=routeList(p);STATE.productGroupList=routes;STATE.currentProductGroup=routes[0]||p;STATE.currentWorkstation=null;setv('productCode',pick(p,['產品編號']));setv('productName',pick(p,['品名']));var area=$('selectedProductArea');if(area)area.classList.remove('hidden');if(typeof showProductPhoto==='function')showProductPhoto(STATE.currentProductGroup||p);if(typeof buildWorkstationSelect==='function')buildWorkstationSelect();buildNativeNotice(routes);var sel=$('workstationSelect');if(sel){sel.value='';sel.focus()}if(typeof updatePreview==='function')updatePreview();if(typeof updateConfirmSummary==='function')updateConfirmSummary();toast(routes.length?'📦':'⚠️',routes.length?'產品已選定，請選工站':'此產品沒有正式工站',pick(p,['產品編號'])+'｜'+pick(p,['品名']),'success');scrollTo(sel||area)}
  function patchWorkstation(){if(typeof window.onWorkstationChange==='function'&&!window.onWorkstationChange.__v446){var old=window.onWorkstationChange;window.onWorkstationChange=function(){removeBadPanels();var r=old.apply(this,arguments);try{var g=STATE.currentWorkstation;if(g){var list=g.機台清單||[];toast('🏭','機台清單已展開','可用機台：'+(machineText(list)||g.主機台||'未設定'),'success');scrollTo($('machineListGrid')||$('mainMachineSelect'))}}catch(e){}return r};window.onWorkstationChange.__v446=true}}
  function boot(){addCss();removeBadPanels();window.selectProduct=selectProductNative;window.V4_446_選產品=selectProductNative;patchWorkstation();try{var mo=new MutationObserver(removeBadPanels);mo.observe(document.body,{childList:true,subtree:true})}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',function(){setTimeout(boot,200);setTimeout(boot,1000)});
  console.log('V4 native workpiece flow restored',VER);
})();