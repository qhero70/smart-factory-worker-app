/* 製一組報工表單 V4｜工站固定選擇面板 v4.4.4
 * 目的：不管原頁面下拉選單是否顯示，選產品後一定在畫面下方跳出可點選工站面板。
 */
(function(){
  'use strict';
  var VER='v4.4.4_station_dock_always_visible';
  function $(id){return document.getElementById(id)}
  function txt(v){return String(v==null?'':v).trim()}
  function esc(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function norm(v){return txt(v).replace(/[^A-Za-z0-9一-龥]/g,'').toUpperCase()}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v)}return ''}
  function setv(id,v){var e=$(id);if(e)e.value=v||''}
  function toast(a,b,c,t){try{if(typeof roar==='function')roar(a,b,c,t||'success')}catch(e){}}
  function scrollToEl(el){if(!el)return;setTimeout(function(){try{el.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}},80)}
  function css(){if($('v4_station_dock_444_style'))return;var s=document.createElement('style');s.id='v4_station_dock_444_style';s.textContent=[
    '#v4StationDock444{position:fixed;left:12px;right:12px;bottom:92px;z-index:99999;background:linear-gradient(135deg,#fff8d7,#e8f0fe);border:4px solid rgba(25,103,210,.65);border-radius:26px;box-shadow:0 22px 60px rgba(25,103,210,.34);padding:14px;max-height:46vh;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif}',
    '#v4StationDock444.hidden{display:none!important}',
    '.v444Title{font-size:20px;font-weight:1000;color:#174ea6;line-height:1.35;margin:0 34px 6px 0}',
    '.v444Hint{font-size:13px;font-weight:900;color:#8a5b00;line-height:1.5;margin-bottom:10px}',
    '.v444Close{position:absolute;top:10px;right:10px;width:34px;height:34px;border:0;border-radius:12px;background:rgba(0,0,0,.08);font-size:20px;font-weight:1000;color:#374151}',
    '.v444Card{width:100%;text-align:left;border:3px solid rgba(66,133,244,.35);border-radius:20px;background:rgba(255,255,255,.98);padding:14px;margin:9px 0;font-weight:1000;color:#202124;box-shadow:0 6px 18px rgba(0,0,0,.12)}',
    '.v444Card b{display:block;font-size:19px;color:#202124;margin-bottom:4px}.v444Card small{display:block;color:#5f6368;font-size:13px;font-weight:850;line-height:1.45}',
    '.v444Card.selected{border-color:#34a853;background:#e6f4ea;box-shadow:0 10px 24px rgba(52,168,83,.28)}',
    '.v444No{padding:12px;border-radius:18px;background:#fff3cd;border:2px solid #fbbc04;color:#7a4b00;font-weight:900;line-height:1.6}',
    '.v444Focus{animation:v444Pulse 1.1s ease-in-out 2;box-shadow:0 0 0 7px rgba(66,133,244,.18)!important}',
    '@keyframes v444Pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}'
  ].join('\n');document.head.appendChild(s)}
  function productFromKey(key){var p={};var parts=String(key||'').split('|');p.產品編號=parts[0]||'';p.品名=parts.slice(1).join('|')||'';var list=[];try{list=list.concat(DB.products||DB.產品清單||[],DB.workstationGroups||[])}catch(e){}var kc=norm(p.產品編號),kn=norm(p.品名);var hit=list.find(function(x){return (kc&&norm(x.產品編號)===kc)||(kc&&norm(x.客戶品號)===kc)||(kn&&norm(x.品名)===kn)});return hit||p}
  function getProduct(){if(window.__v444Product)return window.__v444Product;try{return STATE.currentProductGroup||{產品編號:($('productCode')||{}).value,品名:($('productName')||{}).value}}catch(e){return {}}
  }
  function score(g,p){var pc=norm(pick(p,['產品編號'])),cc=norm(pick(p,['客戶品號'])),pn=norm(pick(p,['品名']));var rc=norm(pick(g,['產品編號'])),rcc=norm(pick(g,['客戶品號'])),rn=norm(pick(g,['品名']));var s=0;if(pc&&rc&&pc===rc)s+=100;if(cc&&rcc&&cc===rcc)s+=85;if(pc&&rcc&&pc===rcc)s+=65;if(cc&&rc&&cc===rc)s+=65;if(pn&&rn&&pn===rn)s+=45;if(pn&&rn&&(pn.indexOf(rn)>=0||rn.indexOf(pn)>=0))s+=20;return s}
  function routesFor(p){var list=[];try{list=(STATE.productGroupList&&STATE.productGroupList.length?STATE.productGroupList:DB.workstationGroups)||[]}catch(e){list=[]}var exact=list.filter(function(g){return score(g,p)>0});if(!exact.length){try{exact=(DB.workstationGroups||[]).filter(function(g){return score(g,p)>0})}catch(e){}}
    exact.sort(function(a,b){return score(b,p)-score(a,p)});var seen={};return exact.filter(function(g){var k=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');if(seen[k])return false;seen[k]=true;return true})}
  function machineText(g){var a=(g.機台清單||[]).map(function(m){return m&&m.機台編號}).filter(Boolean).join('、');return a||g.主機台||'—'}
  function dock(){var d=$('v4StationDock444');if(d)return d;css();d=document.createElement('div');d.id='v4StationDock444';d.className='hidden';document.body.appendChild(d);return d}
  function build(key){css();if(key)window.__v444Product=productFromKey(key);var p=getProduct();if(p&&p.產品編號){setv('productCode',p.產品編號);setv('productName',p.品名||'')}
    var routes=routesFor(p);try{STATE.productGroupList=routes;STATE.currentProductGroup=routes[0]||p;STATE.currentWorkstation=null}catch(e){}
    var d=dock();var title='👇 請先選報工工站 / Select Workstation';var name=[pick(p,['產品編號']),pick(p,['品名'])].filter(Boolean).join('｜');
    if(!routes.length){d.innerHTML='<button class="v444Close" type="button">×</button><div class="v444Title">⚠️ 此產品找不到途程工站</div><div class="v444No">產品：'+esc(name||'未取得')+'<br>請確認 08_工站途程機台主檔 是否有相同產品編號 / 客戶品號 / 品名。</div>'}
    else{d.innerHTML='<button class="v444Close" type="button">×</button><div class="v444Title">'+title+'</div><div class="v444Hint">產品：'+esc(name)+'<br>請直接點下面一張工站卡片，點完就可以按下一步。</div>'+routes.map(function(g,i){return '<button type="button" class="v444Card" data-i="'+i+'"><b>'+esc(g.報工工站名稱||g.工站名稱||'報工工站')+'</b><small>工序：'+esc(g.工序範圍||g.工序||'—')+'｜機台：'+esc(machineText(g))+'</small></button>'}).join('')}
    d.classList.remove('hidden');d.querySelector('.v444Close').onclick=function(){d.classList.add('hidden')};d.querySelectorAll('.v444Card').forEach(function(btn){btn.onclick=function(){var i=Number(btn.getAttribute('data-i'));var g=(routes||[])[i];try{STATE.currentWorkstation=g;STATE.currentProductGroup=g;STATE.productGroupList=routes}catch(e){}var sel=$('workstationSelect');if(sel){if(!sel.options.length&&typeof buildWorkstationSelect==='function')buildWorkstationSelect();sel.value=String(i)}if(typeof onWorkstationChange==='function')onWorkstationChange();try{STATE.currentWorkstation=g}catch(e){}d.querySelectorAll('.v444Card').forEach(function(x){x.classList.remove('selected')});btn.classList.add('selected');if(typeof markStepDone==='function')markStepDone();if(typeof updatePreview==='function')updatePreview();if(typeof updateConfirmSummary==='function')updateConfirmSummary();toast('✅','已選定工站 / Workstation Selected',btn.innerText.replace(/\n/g,'｜'),'success');setTimeout(function(){d.classList.add('hidden')},700)}});scrollToEl(d);return d}
  function focusPerson(){var e=$('selectedPersonDisplay')||$('empIdHighlight');if(e){e.classList.add('v444Focus');scrollToEl(e);setTimeout(function(){e.classList.remove('v444Focus')},2400)}}
  function hook(){css();document.addEventListener('click',function(ev){var pc=ev.target.closest&&ev.target.closest('.product-card');if(pc){window.__v444LastKey=pc.getAttribute('data-key')||'';setTimeout(function(){build(window.__v444LastKey)},180);setTimeout(function(){build(window.__v444LastKey)},650)}var person=ev.target.closest&&ev.target.closest('.person-card');if(person){setTimeout(focusPerson,220)}var next=ev.target.closest&&ev.target.closest('#btnNext');if(next){try{if(STATE&&STATE.currentStep===1&&!STATE.currentWorkstation&&(($('productCode')||{}).value||window.__v444LastKey)){setTimeout(function(){build(window.__v444LastKey)},80)}}catch(e){}}},true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
  window.V4_444_顯示工站面板=build;
  console.log('V4 station dock loaded',VER);
})();