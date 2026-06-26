/* 製一組報工表單 V4｜工站卡片與半版人員照片修復 v4.4.8
 * 修復：1 選產品後一定顯示工站卡片 2 選工站後才顯示機台 3 選人員後半版照片顯示 4 產品卡片固定兩欄。
 * 原則：只補正原 V4 流程顯示，不使用浮動面板，不模糊配對工站。
 */
(function(){
  'use strict';
  var VER='v4.4.8_station_cards_half_person_photo_product_2col';
  var 守護到=Date.now()+25000;

  function $(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){return txt(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
  function esc(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v);}return '';}
  function setv(id,v){var e=$(id);if(e)e.value=v||'';}
  function scroll(el){if(!el)return;setTimeout(function(){try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){try{el.scrollIntoView();}catch(_){}}},120);}
  function roar2(a,b,c,t){try{if(typeof window.roar==='function')window.roar(a,b,c,t||'success');}catch(e){}}
  function removeBad(){['v4StationDock444','v445StationPanel','v4StationQuickPicker443','v4StationQuickPicker','v447StationNotice'].forEach(function(id){var e=$(id);if(e)e.remove();});}

  function style(){
    if($('v448_style'))return;
    var s=document.createElement('style');s.id='v448_style';
    s.textContent=[
      '#v4StationDock444,#v445StationPanel,#v4StationQuickPicker443,#v4StationQuickPicker{display:none!important}',
      '#productGrid,.product-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important;align-items:stretch!important}',
      '#personGrid,.person-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;align-items:stretch!important}',
      '#machineListGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;align-items:stretch!important}',
      '.product-card{min-width:0!important;width:100%!important;margin:0!important;border-radius:22px!important;padding:9px!important}',
      '.product-thumb{height:132px!important;border-radius:18px!important;margin-bottom:8px!important;background:#eaf3ff!important}.product-thumb img{width:100%!important;height:100%!important;object-fit:cover!important}',
      '.product-name{font-size:15px!important;line-height:1.25!important;font-weight:1000!important;min-height:40px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}',
      '.product-code{font-size:14px!important;line-height:1.2!important;font-weight:1000!important;word-break:break-word!important}',
      '.person-card{min-width:0!important;width:100%!important;margin:0!important;border-radius:22px!important;padding:10px!important}',
      '.person-card .avatar-ring{width:92px!important;height:92px!important;margin:0 auto 8px!important;font-size:30px!important}.person-card .avatar-ring img{width:100%!important;height:100%!important;object-fit:cover!important}',
      '.person-name{font-size:16px!important;line-height:1.25!important;font-weight:1000!important}.person-id{font-size:14px!important;font-weight:1000!important}',
      '#selectedPersonDisplay.populated{display:grid!important;grid-template-columns:48% 1fr!important;gap:12px!important;align-items:center!important;min-height:170px!important;padding:14px!important}',
      '#selectedPersonDisplay.populated>img,#selectedPersonDisplay.populated>.person-photo-lg{width:100%!important;height:170px!important;border-radius:22px!important;object-fit:cover!important;font-size:36px!important;display:flex!important;align-items:center!important;justify-content:center!important}',
      '#selectedPersonDisplay.populated .person-info-name{font-size:24px!important;line-height:1.25!important;font-weight:1000!important}',
      '#selectedProductArea{display:block!important;margin-top:16px!important;padding:14px!important;border:4px solid rgba(25,103,210,.35)!important;border-radius:24px!important;background:rgba(232,240,254,.42)!important}',
      '#workstationSelect{display:block!important;width:100%!important;min-height:56px!important;border:3px solid rgba(25,103,210,.45)!important;background:#fffdf2!important;color:#202124!important;border-radius:18px!important;font-size:17px!important;font-weight:1000!important;padding:8px 12px!important;margin-top:10px!important}',
      '#v448StationPanel{display:block!important;margin:14px 0 12px!important;padding:14px!important;border-radius:24px!important;border:4px solid rgba(25,103,210,.62)!important;background:linear-gradient(135deg,#fff8d7,#e8f0fe)!important;box-shadow:0 18px 45px rgba(25,103,210,.20)!important}',
      '.v448-title{font-size:20px!important;font-weight:1000!important;color:#174ea6!important;line-height:1.35!important;margin-bottom:8px!important}',
      '.v448-hint{font-size:14px!important;font-weight:900!important;color:#7a4b00!important;line-height:1.55!important;margin-bottom:10px!important}',
      '.v448-station-grid{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}',
      '.v448-station-card{width:100%!important;text-align:left!important;border:3px solid rgba(66,133,244,.35)!important;border-radius:20px!important;background:rgba(255,255,255,.98)!important;padding:14px!important;font-weight:1000!important;color:#202124!important;box-shadow:0 7px 18px rgba(0,0,0,.10)!important}',
      '.v448-station-card b{display:block!important;font-size:19px!important;color:#202124!important;margin-bottom:4px!important}.v448-station-card small{display:block!important;color:#5f6368!important;font-size:13px!important;font-weight:850!important;line-height:1.45!important}',
      '.v448-station-card.selected{border-color:#34a853!important;background:#e6f4ea!important;box-shadow:0 10px 24px rgba(52,168,83,.28)!important}',
      '.v448-empty{padding:14px!important;border-radius:18px!important;background:#fff3cd!important;border:2px solid #fbbc04!important;color:#7a4b00!important;font-weight:900!important;line-height:1.6!important}',
      '.machine-card{min-width:0!important;width:100%!important;margin:0!important;border-radius:18px!important;padding:7px!important}.machine-card img,.machine-no-img{height:80px!important;border-radius:14px!important}.machine-number{font-size:16px!important;font-weight:1000!important}.machine-info{font-size:11px!important;line-height:1.25!important}',
      '.v448-focus{animation:v448pulse 1.1s ease-in-out 2;box-shadow:0 0 0 7px rgba(66,133,244,.20)!important}',
      '@keyframes v448pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}',
      '@media(max-width:380px){.product-thumb{height:112px!important}.product-name{font-size:14px!important}.product-code{font-size:13px!important}#selectedPersonDisplay.populated{grid-template-columns:46% 1fr!important}#selectedPersonDisplay.populated>img,#selectedPersonDisplay.populated>.person-photo-lg{height:150px!important}#machineListGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function focus(el){if(!el)return;el.classList.add('v448-focus');scroll(el);setTimeout(function(){try{el.classList.remove('v448-focus');}catch(e){}},2400);}

  function allProducts(){var a=[];try{a=a.concat(DB.products||DB.產品清單||[]);}catch(e){}try{a=a.concat(DB.workstationGroups||[]);}catch(e){}return a;}
  function productByKey(key){
    var parts=String(key||'').split('|');var code=parts[0]||'',name=parts.slice(1).join('|')||'';var nc=norm(code);
    var hit=allProducts().find(function(p){return nc&&(norm(p.產品編號)===nc||norm(p.客戶品號)===nc);});
    if(!hit&&name)hit=allProducts().find(function(p){return txt(p.品名)===txt(name);});
    return hit||{產品編號:code,品名:name};
  }
  function routeList(p){
    var pc=norm(pick(p,['產品編號'])), cc=norm(pick(p,['客戶品號']));var groups=[];try{groups=DB.workstationGroups||[];}catch(e){}
    var list=groups.filter(function(g){var rc=norm(pick(g,['產品編號'])),rcc=norm(pick(g,['客戶品號']));return (pc&&rc&&pc===rc)||(cc&&rcc&&cc===rcc)||(pc&&rcc&&pc===rcc)||(cc&&rc&&cc===rc);});
    var seen={};
    return list.filter(function(g){var k=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');if(seen[k])return false;seen[k]=true;return true;}).sort(function(a,b){return String(a.工序範圍||a.工序||'').localeCompare(String(b.工序範圍||b.工序||''),'zh-Hant',{numeric:true});});
  }
  function machineText(g){return (g&&g.機台清單||[]).map(function(m){return m&&m.機台編號;}).filter(Boolean).join('、') || (g&&g.主機台) || '未設定';}

  function ensureStationPanel(){
    var area=$('selectedProductArea'); if(!area)return null;
    var p=$('v448StationPanel'); if(p)return p;
    p=document.createElement('div'); p.id='v448StationPanel';
    var sel=$('workstationSelect');
    if(sel&&sel.parentNode) sel.parentNode.insertBefore(p,sel);
    else area.appendChild(p);
    return p;
  }

  function renderStationCards(product,routes){
    style(); removeBad();
    var panel=ensureStationPanel(); if(!panel)return;
    var name=[pick(product,['產品編號']),pick(product,['客戶品號']),pick(product,['品名'])].filter(Boolean).join('｜');
    if(!routes.length){
      panel.innerHTML='<div class="v448-title">⚠️ 找不到此產品的工站</div><div class="v448-empty">產品：'+esc(name)+'<br>請檢查 08_工站途程機台主檔 是否有相同產品編號或客戶品號。</div>';
      return;
    }
    panel.innerHTML='<div class="v448-title">👇 選擇工站 / Select Workstation</div><div class="v448-hint">產品：'+esc(name)+'<br>先點工站卡片，系統才會顯示機台卡片與主機台。</div><div class="v448-station-grid">'+routes.map(function(g,i){return '<button type="button" class="v448-station-card" data-i="'+i+'"><b>'+esc(g.報工工站名稱||g.工站名稱||'工站')+'</b><small>工序：'+esc(g.工序範圍||g.工序||'—')+'｜主機台：'+esc(g.主機台||'—')+'｜機台：'+esc(machineText(g))+'</small></button>';}).join('')+'</div>';
    panel.querySelectorAll('.v448-station-card').forEach(function(btn){btn.onclick=function(){chooseStation(Number(btn.getAttribute('data-i')));};});
  }

  function renderSelect(routes){
    var s=$('workstationSelect'); if(!s)return;
    s.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
    routes.forEach(function(g,i){s.add(new Option([g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].filter(Boolean).join('｜'),String(i)));});
    s.value='';
    s.onchange=function(){ if(s.value!=='') chooseStation(Number(s.value)); };
  }

  function clearMachine(){
    try{STATE.currentWorkstation=null;}catch(e){}
    setv('processRange','');setv('stdCapacity','');setv('stdTimeSec','');
    var ms=$('mainMachineSelect'); if(ms)ms.innerHTML='';
    var mg=$('machineListGrid'); if(mg)mg.innerHTML='';
  }

  function chooseStation(i){
    var g=(STATE.productGroupList||[])[i]; if(!g)return;
    STATE.currentWorkstation=g; STATE.currentProductGroup=g;
    var s=$('workstationSelect'); if(s)s.value=String(i);
    setv('processRange',g.工序範圍||g.工序||''); setv('stdCapacity',g.標準產能||''); setv('stdTimeSec',g.標準工時_秒||'');
    var list=g.機台清單||[];
    if(typeof window.buildMachineSelect==='function') window.buildMachineSelect(list);
    if(typeof window.renderMachineGrid==='function') window.renderMachineGrid(list);
    var panel=$('v448StationPanel'); if(panel){panel.querySelectorAll('.v448-station-card').forEach(function(b){b.classList.remove('selected');});var b=panel.querySelector('.v448-station-card[data-i="'+i+'"]');if(b)b.classList.add('selected');}
    if(typeof window.markStepDone==='function') window.markStepDone();
    if(typeof window.updatePreview==='function') window.updatePreview(); if(typeof window.updateConfirmSummary==='function') window.updateConfirmSummary();
    roar2('🏭','已選定工站 / Workstation Selected',[g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,machineText(g)].filter(Boolean).join('｜'),'success');
    focus($('machineListGrid')||$('mainMachineSelect'));
  }

  function selectProduct448(key){
    style(); removeBad(); if(!window.DB||!window.STATE)return;
    document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected');});
    try{var card=document.querySelector('.product-card[data-key="'+(window.CSS&&CSS.escape?CSS.escape(key):String(key).replace(/"/g,'\\"'))+'"]');if(card)card.classList.add('selected');}catch(e){}
    var p=productByKey(key); var routes=routeList(p);
    STATE.productGroupList=routes; STATE.currentProductGroup=routes[0]||p; STATE.currentWorkstation=null;
    setv('productCode',pick(p,['產品編號'])); setv('productName',typeof window.cleanProductName==='function'?window.cleanProductName(pick(p,['品名'])):pick(p,['品名']));
    var area=$('selectedProductArea'); if(area){area.classList.remove('hidden'); area.style.display='block';}
    if(typeof window.showProductPhoto==='function') window.showProductPhoto(STATE.currentProductGroup||p);
    renderSelect(routes); renderStationCards(p,routes); clearMachine();
    if(typeof window.updatePreview==='function') window.updatePreview(); if(typeof window.updateConfirmSummary==='function') window.updateConfirmSummary();
    roar2(routes.length?'📦':'⚠️',routes.length?'產品已選定，請選工站':'此產品沒有工站',[pick(p,['產品編號']),pick(p,['品名'])].filter(Boolean).join('｜'),routes.length?'success':'warning');
    focus($('v448StationPanel')||$('workstationSelect')||area);
  }

  function patchPerson(){
    if(typeof window.selectPerson==='function' && !window.selectPerson.__v448){
      var old=window.selectPerson;
      window.selectPerson=function(i){var r=old.apply(this,arguments);setTimeout(function(){var d=$('selectedPersonDisplay')||$('empIdHighlight');if(d){d.classList.remove('hidden');focus(d);}},130);return r;};
      window.selectPerson.__v448=true;
    }
  }
  function patchNext(){
    if(typeof window.goNextOrSubmit==='function' && !window.goNextOrSubmit.__v448){
      var old=window.goNextOrSubmit;
      window.goNextOrSubmit=function(){
        try{
          if(STATE.currentStep===1 && STATE.currentProductGroup && !STATE.currentWorkstation){
            renderStationCards(STATE.currentProductGroup,STATE.productGroupList||[]);
            focus($('v448StationPanel')||$('workstationSelect'));
            roar2('⚠️','請先選工站','請在產品下方點選工站卡片 / Please select workstation first','warning');
            return;
          }
        }catch(e){}
        return old.apply(this,arguments);
      };
      window.goNextOrSubmit.__v448=true;
    }
  }
  function patchProduct(){window.selectProduct=selectProduct448; window.V4_448_選產品=selectProduct448;}

  function install(){style(); removeBad(); patchPerson(); patchProduct(); patchNext();}
  document.addEventListener('click',function(ev){
    var pc=ev.target.closest&&ev.target.closest('.product-card');
    if(pc){var key=pc.getAttribute('data-key')||'';setTimeout(function(){selectProduct448(key);},60);setTimeout(function(){selectProduct448(key);},350);setTimeout(function(){selectProduct448(key);},900);}
    var per=ev.target.closest&&ev.target.closest('.person-card,.recent-chip'); if(per)setTimeout(function(){focus($('selectedPersonDisplay')||$('empIdHighlight'));},250);
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',function(){install();var t=setInterval(function(){install();if(Date.now()>守護到)clearInterval(t);},300);});
  console.log('V4 station cards 448 loaded',VER);
})();