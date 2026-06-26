/* 製一組報工表單 V4｜工站快選與自動捲動修復 v4.4.3
 * 修復：1 選產品後沒有可選工站 2 選人員後自動捲到選定人員 3 選產品後自動捲到工站選擇區。
 * 原則：保留原完整 V4 UI，只覆寫互動錯誤與補強導引。
 */
(function(){
  'use strict';
  var VER='v4.4.3_station_picker_scroll_fix';
  function $(id){return document.getElementById(id);} 
  function txt(v){return String(v==null?'':v).trim();}
  function esc(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function norm(v){return txt(v).replace(/\.(jpg|jpeg|png|webp|gif)$/i,'').replace(/[^A-Za-z0-9一-龥]/g,'').toUpperCase();}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v);}return '';}
  function setv(id,v){var el=$(id);if(el)el.value=v==null?'':v;}
  function safeScroll(el,block){if(!el)return;setTimeout(function(){try{el.scrollIntoView({behavior:'smooth',block:block||'center'});}catch(e){try{el.scrollIntoView();}catch(_){}}},80);} 
  function toast(icon,title,msg,type){try{if(typeof window.roar==='function')window.roar(icon,title,msg,type||'success');}catch(e){}}
  function productKey(p){return [pick(p,['產品編號']),pick(p,['品名'])].join('|');}
  function makeProductMap(){var map={};if(!window.DB)return map;(DB.products||DB.產品清單||[]).forEach(function(p){var k=productKey(p);if(k!=='|')map[k]=p;});(DB.workstationGroups||[]).forEach(function(g){var k=productKey(g);if(k==='|')return;if(!map[k])map[k]=g;else{map[k].客戶品號=map[k].客戶品號||g.客戶品號;map[k].產品照片網址=map[k].產品照片網址||g.產品照片網址;map[k].產品縮圖網址=map[k].產品縮圖網址||g.產品縮圖網址||g.產品照片網址;}});return map;}
  function findProductByKey(key){var map=makeProductMap();if(map[key])return map[key];var parts=String(key||'').split('|'),code=parts[0]||'',name=parts.slice(1).join('|')||'';var ncode=norm(code), nname=norm(name);var list=[];if(window.DB){list=list.concat(DB.products||DB.產品清單||[],DB.workstationGroups||[]);}return list.find(function(p){return (ncode&&norm(p.產品編號)===ncode)||(ncode&&norm(p.客戶品號)===ncode)||(nname&&norm(p.品名)===nname);})||{產品編號:code,品名:name};}
  function routeScore(route,p){var s=0;var pc=norm(pick(p,['產品編號'])), cc=norm(pick(p,['客戶品號'])), pn=norm(pick(p,['品名']));var rc=norm(pick(route,['產品編號'])), rcc=norm(pick(route,['客戶品號'])), rn=norm(pick(route,['品名']));if(pc&&rc&&pc===rc)s+=100;if(cc&&rcc&&cc===rcc)s+=80;if(pc&&rcc&&pc===rcc)s+=50;if(cc&&rc&&cc===rc)s+=50;if(pn&&rn&&pn===rn)s+=40;return s;}
  function findRoutes(p){if(!window.DB)return[];var list=(DB.workstationGroups||[]).filter(function(g){return routeScore(g,p)>0;});list.sort(function(a,b){return routeScore(b,p)-routeScore(a,p);});var seen={};return list.filter(function(g){var k=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');if(seen[k])return false;seen[k]=true;return true;});}
  function ensureStyle(){if($('v4_station_scroll_443_style'))return;var s=document.createElement('style');s.id='v4_station_scroll_443_style';s.textContent=[
    '.v4-443-focus{animation:v443Pulse 1.2s ease-in-out 2;box-shadow:0 0 0 6px rgba(66,133,244,.18),0 18px 42px rgba(66,133,244,.24)!important}',
    '@keyframes v443Pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}',
    '.v4-station-pop,.v4-station-pop443{margin:16px 0 12px!important;padding:16px!important;border:4px solid rgba(25,103,210,.60)!important;border-radius:26px!important;background:linear-gradient(135deg,#fff8d7 0%,#e8f0fe 100%)!important;box-shadow:0 18px 46px rgba(25,103,210,.26)!important}',
    '.v4-station-title443{font-size:20px!important;font-weight:1000!important;color:#174ea6!important;line-height:1.45!important;margin-bottom:8px!important}',
    '.v4-station-hint443{font-size:14px!important;font-weight:900!important;color:#8a5b00!important;line-height:1.55!important;margin-bottom:12px!important}',
    '.v4-station-card443{width:100%!important;text-align:left!important;border:3px solid rgba(66,133,244,.35)!important;border-radius:20px!important;background:rgba(255,255,255,.97)!important;padding:15px!important;margin:10px 0!important;font-weight:1000!important;color:#202124!important;box-shadow:0 7px 18px rgba(0,0,0,.10)!important}',
    '.v4-station-card443 b{display:block;font-size:19px!important;color:#202124!important;margin-bottom:4px!important}.v4-station-card443 small{display:block;color:#5f6368!important;font-weight:850!important;line-height:1.5!important}',
    '.v4-station-card443.selected{border-color:#34a853!important;background:#e6f4ea!important;box-shadow:0 10px 24px rgba(52,168,83,.25)!important}',
    '.v4-no-route443{padding:14px;border-radius:18px;background:#fff3cd;border:2px solid #fbbc04;color:#7a4b00;font-weight:900;line-height:1.6}'
  ].join('\n');document.head.appendChild(s);}
  function machineText(g){var m=(g.機台清單||[]).map(function(x){return x&&x.機台編號;}).filter(Boolean).join('、');return m||g.主機台||'—';}
  function removeOldPickers(){['v4StationQuickPicker','v4StationQuickPicker443'].forEach(function(id){var el=$(id);if(el)el.remove();});}
  function buildStationPicker(){
    ensureStyle();
    removeOldPickers();
    if(!window.STATE)return null;
    var sel=$('workstationSelect');
    var area=$('selectedProductArea')||(sel&&sel.parentNode);
    if(!sel||!area)return null;
    var list=STATE.productGroupList||[];
    var box=document.createElement('div');box.id='v4StationQuickPicker443';box.className='v4-station-pop443';
    if(!list.length){box.innerHTML='<div class="v4-station-title443">⚠️ 此產品目前找不到工站途程</div><div class="v4-no-route443">請檢查 08_工站途程機台主檔：產品編號、客戶品號或品名是否與 02_產品主檔一致。此產品已選取，但不能送出報工。</div>';}
    else{box.innerHTML='<div class="v4-station-title443">👇 下一步先點這裡：選擇報工工站 / Select Workstation</div><div class="v4-station-hint443">產品已選定，系統已自動拉出此產品可報工工站。請點一張工站卡片，選完才可下一步。</div>'+list.map(function(g,i){return '<button type="button" class="v4-station-card443 ripple" data-v443-station="'+i+'"><b>'+esc(g.報工工站名稱||g.工站名稱||'報工工站')+'</b><small>工序：'+esc(g.工序範圍||g.工序||'—')+'｜機台：'+esc(machineText(g))+'</small></button>';}).join('');}
    var anchor=sel.parentNode||area;anchor.insertBefore(box,sel.nextSibling);
    box.querySelectorAll('.v4-station-card443').forEach(function(btn){btn.addEventListener('click',function(){var i=Number(this.getAttribute('data-v443-station'));sel.value=String(i);STATE.currentWorkstation=(STATE.productGroupList||[])[i]||null;box.querySelectorAll('.v4-station-card443').forEach(function(b){b.classList.remove('selected');});this.classList.add('selected');if(typeof window.onWorkstationChange==='function')window.onWorkstationChange();if(typeof window.markStepDone==='function')window.markStepDone();if(typeof window.updatePreview==='function')window.updatePreview();if(typeof window.updateConfirmSummary==='function')window.updateConfirmSummary();toast('✅','已選定工站 / Workstation Selected',this.innerText.replace(/\n/g,'｜'),'success');safeScroll(this,'center');});});
    return box;
  }
  function highlightAndScroll(el){if(!el)return;el.classList.add('v4-443-focus');safeScroll(el,'center');setTimeout(function(){try{el.classList.remove('v4-443-focus');}catch(e){}},2600);}
  function patchPerson(){if(typeof window.selectPerson!=='function'||window.selectPerson.__v443)return;var old=window.selectPerson;window.selectPerson=function(i){var r=old.apply(this,arguments);setTimeout(function(){highlightAndScroll($('selectedPersonDisplay')||$('empIdHighlight'));},120);return r;};window.selectPerson.__v443=true;}
  function patchProduct(){if(typeof window.selectProduct!=='function'||window.selectProduct.__v443)return;window.selectProduct=function(key){
    if(!window.DB||!window.STATE)return;
    ensureStyle();
    document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected');});
    var card=null;try{card=document.querySelector('.product-card[data-key="'+(window.CSS&&CSS.escape?CSS.escape(key):String(key).replace(/"/g,'\\"'))+'"]');}catch(e){}
    if(card)card.classList.add('selected');
    var p=findProductByKey(key);var routes=findRoutes(p);
    STATE.productGroupList=routes;STATE.currentProductGroup=routes[0]||p;STATE.currentWorkstation=null;
    setv('productCode',pick(p,['產品編號']));setv('productName',pick(p,['品名']));
    if(typeof window.showProductPhoto==='function')window.showProductPhoto(STATE.currentProductGroup);
    if(typeof window.buildWorkstationSelect==='function')window.buildWorkstationSelect();
    var area=$('selectedProductArea');if(area)area.classList.remove('hidden');
    var picker=buildStationPicker();
    if(typeof window.updatePreview==='function')window.updatePreview();
    if(typeof window.updateConfirmSummary==='function')window.updateConfirmSummary();
    toast('📦','已選定產品 / Product Selected',(pick(p,['品名'])||'')+'（'+(pick(p,['產品編號'])||'')+'）｜請接著選工站','success');
    highlightAndScroll(picker||area||$('workstationSelect'));
  };window.selectProduct.__v443=true;}
  function patchWorkstationBuild(){if(typeof window.buildWorkstationSelect!=='function'||window.buildWorkstationSelect.__v443)return;var old=window.buildWorkstationSelect;window.buildWorkstationSelect=function(){var r=old.apply(this,arguments);setTimeout(buildStationPicker,50);return r;};window.buildWorkstationSelect.__v443=true;}
  function boot(){patchPerson();patchProduct();patchWorkstationBuild();ensureStyle();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',function(){var end=Date.now()+12000;var t=setInterval(function(){boot();if(Date.now()>end)clearInterval(t);},300);});
  console.log('V4 station scroll fixer loaded',VER);
})();