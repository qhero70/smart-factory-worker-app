/* 製一組報工表單 V4｜流程顯示與三欄卡片修復 v4.4.7
 * 修復：1 選人員後選定人員區跳出並捲動 2 選產品後才顯示工站選擇 3 工站選完才顯示機台 4 人員/產品/機台卡片三欄。
 * 原則：保留原 V4 UI，不再使用 443/444/445 額外浮動面板，只補正原生流程。
 */
(function(){
  'use strict';
  var VER='v4.4.7_flow_ui_station_visible_3col_cards';
  var 守護到 = Date.now() + 20000;

  function $(id){ return document.getElementById(id); }
  function txt(v){ return String(v==null?'':v).trim(); }
  function norm(v){ return txt(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }
  function pick(o,ks){ o=o||{}; for(var i=0;i<ks.length;i++){ var v=o[ks[i]]; if(v!=null && txt(v)!=='') return txt(v); } return ''; }
  function esc(s){ return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function setv(id,v){ var e=$(id); if(e) e.value=v||''; }
  function safeScroll(el,block){ if(!el) return; setTimeout(function(){ try{ el.scrollIntoView({behavior:'smooth',block:block||'center'}); }catch(e){ try{el.scrollIntoView();}catch(_){} } },100); }
  function toast(a,b,c,t){ try{ if(typeof window.roar==='function') window.roar(a,b,c,t||'success'); }catch(e){} }
  function removeWrongPanels(){ ['v4StationDock444','v445StationPanel','v4StationQuickPicker443','v4StationQuickPicker'].forEach(function(id){ var e=$(id); if(e) e.remove(); }); }

  function installStyle(){
    if($('v447_flow_style')) return;
    var s=document.createElement('style');
    s.id='v447_flow_style';
    s.textContent=[
      '#v4StationDock444,#v445StationPanel,#v4StationQuickPicker443,#v4StationQuickPicker{display:none!important}',
      '#personGrid,.person-grid,#productGrid,.product-grid,#machineListGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;align-items:stretch!important}',
      '.person-card,.product-card,.machine-card{min-width:0!important;width:100%!important;margin:0!important;border-radius:18px!important;padding:8px!important}',
      '.person-card .avatar-ring{width:56px!important;height:56px!important;margin:0 auto 6px!important;font-size:22px!important}',
      '.person-name,.product-name{font-size:13px!important;line-height:1.25!important;font-weight:1000!important;min-height:34px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}',
      '.person-id,.product-code{font-size:12px!important;line-height:1.2!important;font-weight:1000!important;word-break:break-word!important}',
      '.product-thumb{height:86px!important;border-radius:14px!important;margin-bottom:7px!important}.product-thumb img{width:100%!important;height:100%!important;object-fit:cover!important}',
      '.machine-card img,.machine-no-img{height:80px!important;border-radius:14px!important}.machine-number{font-size:16px!important;font-weight:1000!important}.machine-info{font-size:11px!important;line-height:1.25!important}',
      '#selectedProductArea{margin-top:16px!important;padding:14px!important;border:4px solid rgba(25,103,210,.34)!important;border-radius:24px!important;background:rgba(232,240,254,.45)!important}',
      '#workstationSelect{display:block!important;width:100%!important;min-height:58px!important;border:4px solid rgba(25,103,210,.60)!important;background:#fffdf2!important;color:#202124!important;border-radius:18px!important;font-size:18px!important;font-weight:1000!important;padding:8px 12px!important}',
      '#mainMachineSelect{display:block!important;width:100%!important;min-height:54px!important;border:3px solid rgba(52,168,83,.45)!important;border-radius:16px!important;font-size:17px!important;font-weight:900!important}',
      '.v447-notice{margin:10px 0 10px;padding:12px 14px;border-radius:18px;background:#fff8d7;border:2px solid rgba(251,188,4,.55);font-weight:1000;color:#6b4a00;line-height:1.55;font-size:14px}',
      '.v447-focus{animation:v447pulse 1.1s ease-in-out 2;box-shadow:0 0 0 7px rgba(66,133,244,.18)!important}',
      '@keyframes v447pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}',
      '@media(max-width:380px){#personGrid,.person-grid,#productGrid,.product-grid,#machineListGrid{gap:8px!important}.product-thumb{height:74px!important}.person-card,.product-card,.machine-card{padding:7px!important}.person-name,.product-name{font-size:12px!important}.product-code,.person-id{font-size:11px!important}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function focusBox(el){ if(!el) return; el.classList.add('v447-focus'); safeScroll(el,'center'); setTimeout(function(){ try{el.classList.remove('v447-focus');}catch(e){} },2400); }

  function allProducts(){
    var a=[];
    try{ a=a.concat(window.DB && (DB.products||DB.產品清單||[]) || []); }catch(e){}
    try{ a=a.concat(window.DB && (DB.workstationGroups||[]) || []); }catch(e){}
    return a;
  }
  function productByKey(key){
    var parts=String(key||'').split('|');
    var code=parts[0]||'', name=parts.slice(1).join('|')||'';
    var nc=norm(code);
    var hit=allProducts().find(function(p){ return nc && (norm(p.產品編號)===nc || norm(p.客戶品號)===nc); });
    if(!hit && name) hit=allProducts().find(function(p){ return txt(p.品名)===txt(name); });
    return hit || {產品編號:code,品名:name};
  }
  function routeList(product){
    var pc=norm(pick(product,['產品編號'])), cc=norm(pick(product,['客戶品號']));
    var groups=[]; try{ groups=DB.workstationGroups||[]; }catch(e){}
    var list=groups.filter(function(g){
      var rc=norm(pick(g,['產品編號'])), rcc=norm(pick(g,['客戶品號']));
      return (pc&&rc&&pc===rc)||(cc&&rcc&&cc===rcc)||(pc&&rcc&&pc===rcc)||(cc&&rc&&cc===rc);
    });
    var seen={};
    return list.filter(function(g){
      var k=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');
      if(seen[k]) return false; seen[k]=true; return true;
    }).sort(function(a,b){ return String(a.工序範圍||a.工序||'').localeCompare(String(b.工序範圍||b.工序||''),'zh-Hant',{numeric:true}); });
  }

  function machineText(list){ return (list||[]).map(function(m){return m&&m.機台編號;}).filter(Boolean).join('、'); }

  function ensureNotice(routes,product){
    var area=$('selectedProductArea'); if(!area) return;
    var old=$('v447StationNotice'); if(old) old.remove();
    var div=document.createElement('div');
    div.id='v447StationNotice'; div.className='v447-notice';
    var name=[pick(product,['產品編號']),pick(product,['客戶品號']),pick(product,['品名'])].filter(Boolean).join('｜');
    div.innerHTML = routes.length
      ? '👇 產品已選定：'+esc(name)+'<br>請在下方「工站」選單選擇報工工站，選完才會顯示機台卡片。'
      : '⚠️ 此產品目前沒有可用工站：'+esc(name)+'<br>請確認 08_工站途程機台主檔 是否有相同產品編號或客戶品號。';
    var sel=$('workstationSelect');
    if(sel && sel.parentNode) sel.parentNode.insertBefore(div, sel);
    else area.insertBefore(div, area.firstChild);
  }

  function renderWorkstations(routes){
    var s=$('workstationSelect');
    if(!s) return;
    s.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
    routes.forEach(function(gr,i){
      var name=gr.顯示名稱 || [gr.報工工站名稱||gr.工站名稱, gr.工序範圍||gr.工序, gr.主機台].filter(Boolean).join('｜');
      s.add(new Option(name, String(i)));
    });
    s.value='';
    s.onchange=function(){ chooseWorkstation(); };
  }

  function chooseWorkstation(){
    var s=$('workstationSelect'); if(!s) return;
    var i=s.value;
    var gr = i==='' ? null : (STATE.productGroupList||[])[Number(i)];
    STATE.currentWorkstation = gr || null;
    setv('processRange', gr ? (gr.工序範圍||gr.工序||'') : '');
    setv('stdCapacity', gr ? (gr.標準產能||'') : '');
    setv('stdTimeSec', gr ? (gr.標準工時_秒||'') : '');
    var list = gr ? (gr.機台清單||[]) : [];
    if(typeof window.buildMachineSelect==='function') window.buildMachineSelect(list);
    if(typeof window.renderMachineGrid==='function') window.renderMachineGrid(list);
    if(gr){
      if(typeof window.markStepDone==='function') window.markStepDone();
      toast('🏭','已選定工站 / Workstation Selected',[gr.報工工站名稱||gr.工站名稱, gr.工序範圍||gr.工序, machineText(list)||gr.主機台].filter(Boolean).join('｜'),'success');
      focusBox($('machineListGrid')||$('mainMachineSelect'));
    }
    if(typeof window.updatePreview==='function') window.updatePreview();
    if(typeof window.updateConfirmSummary==='function') window.updateConfirmSummary();
  }

  function clearMachines(){
    STATE.currentWorkstation=null;
    setv('processRange',''); setv('stdCapacity',''); setv('stdTimeSec','');
    var ms=$('mainMachineSelect'); if(ms) ms.innerHTML='';
    var mg=$('machineListGrid'); if(mg) mg.innerHTML='';
  }

  function selectProduct447(key){
    installStyle(); removeWrongPanels();
    if(!window.DB||!window.STATE) return;
    document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected');});
    try{
      var card=document.querySelector('.product-card[data-key="'+(window.CSS&&CSS.escape?CSS.escape(key):String(key).replace(/"/g,'\\"'))+'"]');
      if(card) card.classList.add('selected');
    }catch(e){}
    var p=productByKey(key);
    var routes=routeList(p);
    STATE.productGroupList=routes;
    STATE.currentProductGroup=routes[0] || p;
    STATE.currentWorkstation=null;
    setv('productCode', pick(p,['產品編號']));
    setv('productName', (typeof window.cleanProductName==='function'?window.cleanProductName(pick(p,['品名'])):pick(p,['品名'])));
    var area=$('selectedProductArea'); if(area) area.classList.remove('hidden');
    if(typeof window.showProductPhoto==='function') window.showProductPhoto(STATE.currentProductGroup||p);
    renderWorkstations(routes);
    ensureNotice(routes,p);
    clearMachines();
    if(typeof window.updatePreview==='function') window.updatePreview();
    if(typeof window.updateConfirmSummary==='function') window.updateConfirmSummary();
    toast(routes.length?'📦':'⚠️', routes.length?'產品已選定，請選工站':'此產品無可用工站', [pick(p,['產品編號']),pick(p,['品名'])].filter(Boolean).join('｜'), routes.length?'success':'warning');
    focusBox($('workstationSelect')||area);
  }

  function patchPerson(){
    if(typeof window.selectPerson==='function' && !window.selectPerson.__v447){
      var old=window.selectPerson;
      window.selectPerson=function(i){
        var r=old.apply(this,arguments);
        setTimeout(function(){
          var disp=$('selectedPersonDisplay')||$('empIdHighlight');
          if(disp){ disp.classList.remove('hidden'); focusBox(disp); }
        },120);
        return r;
      };
      window.selectPerson.__v447=true;
    }
  }

  function patchWorkstation(){
    window.onWorkstationChange=chooseWorkstation;
  }

  function patchProduct(){
    window.selectProduct=selectProduct447;
    window.V4_447_選產品=selectProduct447;
  }

  function install(){
    installStyle(); removeWrongPanels(); patchPerson(); patchProduct(); patchWorkstation();
  }

  document.addEventListener('click',function(ev){
    var pc=ev.target.closest && ev.target.closest('.product-card');
    if(pc){
      var key=pc.getAttribute('data-key')||'';
      setTimeout(function(){ selectProduct447(key); },30);
      setTimeout(function(){ selectProduct447(key); },260);
    }
    var per=ev.target.closest && ev.target.closest('.person-card,.recent-chip');
    if(per){ setTimeout(function(){ focusBox($('selectedPersonDisplay')||$('empIdHighlight')); },220); }
  },true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
  window.addEventListener('load',function(){ install(); var t=setInterval(function(){ install(); if(Date.now()>守護到) clearInterval(t); },300); });
  console.log('V4 flow UI fixer loaded',VER);
})();