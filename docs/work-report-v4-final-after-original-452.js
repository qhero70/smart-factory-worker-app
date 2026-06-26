/* 製一組報工表單 V4｜最終後置工站修復 v4.5.2
 * 載入位置：必須在原 work-report-v4.html 內建 JS 之後。
 * 只修：產品卡點選後，產品資料與工站 select 對接；選工站後顯示機台。
 */
(function(){
  'use strict';
  var VER='v4.5.2_after_original_station_binding';
  var 已安裝=false;
  function $(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){return txt(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v);}return '';}
  function safe(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function setv(id,v){var e=$(id);if(e)e.value=v||'';}
  function toast(a,b,c,t){try{if(typeof roar==='function')roar(a,b,c,t||'success');}catch(e){}}
  function scroll(el){if(!el)return;setTimeout(function(){try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}},80);}
  function hideOld(){['v4StationDock444','v445StationPanel','v4StationQuickPicker443','v4StationQuickPicker','v447StationNotice','v448StationPanel','v449StationHint','v450StationHint','v451StationHint'].forEach(function(id){var e=$(id);if(e)e.remove();});}
  function style(){
    if($('v452style'))return;
    var s=document.createElement('style');s.id='v452style';
    s.textContent=[
      '#v4StationDock444,#v445StationPanel,#v4StationQuickPicker443,#v4StationQuickPicker,#v447StationNotice,#v448StationPanel,#v449StationHint,#v450StationHint,#v451StationHint{display:none!important}',
      '#personGrid,.person-grid,#productGrid,.product-grid,#machineListGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}',
      '.product-thumb,.person-card .avatar-ring{height:86px!important;border-radius:14px!important;overflow:hidden!important}',
      '.product-thumb img,.person-card .avatar-ring img{width:100%!important;height:100%!important;object-fit:cover!important}',
      '#selectedProductArea{display:block!important;margin-top:16px!important}',
      '#workstationSelect{display:block!important;width:100%!important;min-height:58px!important;border:4px solid rgba(25,103,210,.65)!important;background:#fffdf2!important;color:#202124!important;border-radius:18px!important;font-size:17px!important;font-weight:1000!important;padding:8px 12px!important;margin:10px 0!important}',
      '#workstationSelect.v452open{height:auto!important;min-height:170px!important}',
      '#v452hint{margin:10px 0;padding:11px 12px;border-radius:16px;background:#fff8d7;border:2px solid rgba(251,188,4,.6);font-weight:900;color:#6b4a00;line-height:1.45;font-size:13px}',
      '.v452focus{animation:v452pulse 1.1s ease-in-out 2;box-shadow:0 0 0 7px rgba(66,133,244,.20)!important}',
      '@keyframes v452pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function focus(el){if(!el)return;el.classList.add('v452focus');scroll(el);setTimeout(function(){try{el.classList.remove('v452focus');}catch(e){}},2200);}
  function cardKey(card){
    if(!card)return '';
    var k=card.getAttribute('data-key')||'';
    if(k)return k;
    var code=(card.querySelector('.product-code')||{}).textContent||'';
    var name=(card.querySelector('.product-name')||{}).textContent||'';
    return txt(code)+'|'+txt(name);
  }
  function allProducts(){var a=[];try{a=a.concat(DB.products||DB.產品清單||[]);}catch(e){}try{a=a.concat(DB.workstationGroups||[]);}catch(e){}return a;}
  function findProduct(key){
    var parts=String(key||'').split('|');var code=parts[0]||'',name=parts.slice(1).join('|')||'',nc=norm(code);
    var list=allProducts();
    var hit=list.find(function(p){return nc&&(norm(p.產品編號)===nc||norm(p.客戶品號)===nc);});
    if(!hit&&name)hit=list.find(function(p){return txt(p.品名)===txt(name);});
    return hit||{產品編號:code,品名:name};
  }
  function routesFor(product,key){
    var parts=String(key||'').split('|');var keyCode=norm(parts[0]||'');
    var pc=norm(pick(product,['產品編號']));var cc=norm(pick(product,['客戶品號']));
    var groups=[];try{groups=DB.workstationGroups||[];}catch(e){}
    var routes=groups.filter(function(g){
      var rc=norm(pick(g,['產品編號']));var rcc=norm(pick(g,['客戶品號']));
      return (pc&&rc&&pc===rc)||(cc&&rcc&&cc===rcc)||(pc&&rcc&&pc===rcc)||(cc&&rc&&cc===rc)||(keyCode&&rc&&keyCode===rc)||(keyCode&&rcc&&keyCode===rcc);
    });
    var seen={};
    return routes.filter(function(g){var k=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');if(seen[k])return false;seen[k]=true;return true;}).sort(function(a,b){return String(a.工序範圍||a.工序||'').localeCompare(String(b.工序範圍||b.工序||''),'zh-Hant',{numeric:true});});
  }
  function machineText(g){return (g&&g.機台清單||[]).map(function(m){return m&&m.機台編號;}).filter(Boolean).join('、')||(g&&g.主機台)||'';}
  function showProduct(product){
    setv('productCode',pick(product,['產品編號']));
    var name=pick(product,['品名']);if(typeof cleanProductName==='function')name=cleanProductName(name);setv('productName',name);
    var area=$('selectedProductArea');if(area){area.classList.remove('hidden');area.style.display='block';}
    if(typeof showProductPhoto==='function')showProductPhoto(product);
    var disp=$('selectedProductDisplay');
    if(disp&&disp.textContent.indexOf('尚未選產品')>=0){disp.innerHTML='<div class="person-photo-lg">產品</div><div><div class="person-info-name">'+safe(name||pick(product,['品名']))+'</div><div class="caption" style="margin-top:3px;">'+safe(pick(product,['產品編號']))+'</div></div>';}
  }
  function fillStation(routes,product){
    var s=$('workstationSelect');if(!s)return;
    s.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
    routes.forEach(function(g,i){s.add(new Option([g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,machineText(g)].filter(Boolean).join('｜'),String(i)));});
    s.value='';
    s.onchange=chooseStation;
    if(routes.length){s.size=Math.min(routes.length+1,6);s.classList.add('v452open');}else{s.size=1;s.classList.remove('v452open');}
    var old=$('v452hint');if(old)old.remove();
    var hint=document.createElement('div');hint.id='v452hint';
    var ptxt=[pick(product,['產品編號']),pick(product,['客戶品號']),pick(product,['品名'])].filter(Boolean).join('｜');
    hint.innerHTML=routes.length?'👇 工站已帶入：'+safe(ptxt)+'<br>請直接點選下面工站。':'⚠️ 此產品找不到工站：'+safe(ptxt)+'<br>請確認 08_工站途程機台主檔 產品編號/客戶品號。';
    s.parentNode.insertBefore(hint,s);
  }
  function clearMachine(){try{STATE.currentWorkstation=null;}catch(e){}setv('processRange','');setv('stdCapacity','');setv('stdTimeSec','');var a=$('mainMachineSelect');if(a)a.innerHTML='';var b=$('machineListGrid');if(b)b.innerHTML='';}
  function selectProduct452(key,card){
    style();hideOld();
    if(!window.DB||!window.STATE)return;
    if(!key&&card)key=cardKey(card);
    var product=findProduct(key);var routes=routesFor(product,key);
    STATE.productGroupList=routes;
    STATE.currentProductGroup=routes[0]||product;
    STATE.currentWorkstation=null;
    document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected');});
    if(card)card.classList.add('selected');else{try{var t=document.querySelector('.product-card[data-key="'+(window.CSS&&CSS.escape?CSS.escape(key):String(key).replace(/"/g,'\\"'))+'"]');if(t)t.classList.add('selected');}catch(e){}}
    showProduct(product);fillStation(routes,product);clearMachine();
    if(typeof updatePreview==='function')updatePreview();if(typeof updateConfirmSummary==='function')updateConfirmSummary();
    toast(routes.length?'📦':'⚠️',routes.length?'產品已選定，工站已跳出':'產品沒有工站資料',[pick(product,['產品編號']),pick(product,['品名'])].filter(Boolean).join('｜'),routes.length?'success':'warning');
    focus($('workstationSelect')||$('selectedProductArea'));
  }
  function chooseStation(){
    var s=$('workstationSelect');if(!s)return;
    var g=s.value===''?null:(STATE.productGroupList||[])[Number(s.value)];
    STATE.currentWorkstation=g||null;
    if(!g){clearMachine();return;}
    s.size=1;s.classList.remove('v452open');
    setv('processRange',g.工序範圍||g.工序||'');setv('stdCapacity',g.標準產能||'');setv('stdTimeSec',g.標準工時_秒||'');
    var list=g.機台清單||[];
    if(typeof buildMachineSelect==='function')buildMachineSelect(list);
    if(typeof renderMachineGrid==='function')renderMachineGrid(list);
    if(typeof markStepDone==='function')markStepDone();
    if(typeof updatePreview==='function')updatePreview();if(typeof updateConfirmSummary==='function')updateConfirmSummary();
    toast('🏭','已選定工站 / Workstation Selected',[g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,machineText(g)].filter(Boolean).join('｜'),'success');
    focus($('machineListGrid')||$('mainMachineSelect'));
  }
  function install(){
    style();hideOld();
    window.selectProduct=function(key){selectProduct452(key,null);};
    window.onWorkstationChange=chooseStation;
    window.V4_452_選產品=selectProduct452;
    已安裝=true;
  }
  function handler(ev){
    var card=ev.target&&ev.target.closest&&ev.target.closest('.product-card');if(!card)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    selectProduct452(cardKey(card),card);
  }
  document.addEventListener('click',handler,true);
  document.addEventListener('touchstart',function(ev){var c=ev.target&&ev.target.closest&&ev.target.closest('.product-card');if(c){window.__v452_touch_card=c;}},true);
  document.addEventListener('touchend',function(ev){var c=ev.target&&ev.target.closest&&ev.target.closest('.product-card');if(!c)c=window.__v452_touch_card;if(c){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();selectProduct452(cardKey(c),c);window.__v452_touch_card=null;}},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',function(){install();});
  var t=setInterval(function(){install();if(Date.now()>守護到)clearInterval(t);},1000);
  console.log('V4 final after original station binding loaded',VER);
})();