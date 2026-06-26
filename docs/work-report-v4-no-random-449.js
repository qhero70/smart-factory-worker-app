/* 製一組報工表單 V4｜最小修正 v4.4.9
 * 只修使用者指定項目：
 * 1. 停止 448 的人員選定半版大圖與產品兩欄亂改。
 * 2. 卡片維持三欄；照片只在卡片上半部，不改成選定區半版大圖。
 * 3. 選產品後，只使用既有工站欄位 #workstationSelect 對接資料並自動顯示，不新增浮動面板、不新增工站卡片。
 */
(function(){
  'use strict';
  var VER='v4.4.9_minimal_station_binding_no_random_ui_change';
  var 守護到=Date.now()+25000;

  function $(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){return txt(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v);}return '';}
  function setv(id,v){var e=$(id);if(e)e.value=v||'';}
  function scroll(el){if(!el)return;setTimeout(function(){try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){try{el.scrollIntoView();}catch(_){}}},100);}
  function roar2(a,b,c,t){try{if(typeof window.roar==='function')window.roar(a,b,c,t||'success');}catch(e){}}

  function 移除之前亂加面板(){
    ['v4StationDock444','v445StationPanel','v4StationQuickPicker443','v4StationQuickPicker','v447StationNotice','v448StationPanel'].forEach(function(id){var e=$(id);if(e)e.remove();});
  }

  function 安裝樣式(){
    if($('v449_min_style'))return;
    var s=document.createElement('style');
    s.id='v449_min_style';
    s.textContent=[
      '#v4StationDock444,#v445StationPanel,#v4StationQuickPicker443,#v4StationQuickPicker,#v447StationNotice,#v448StationPanel{display:none!important}',
      '#personGrid,.person-grid,#productGrid,.product-grid,#machineListGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;align-items:stretch!important}',
      '.person-card,.product-card,.machine-card{min-width:0!important;width:100%!important;margin:0!important;border-radius:18px!important;padding:7px!important}',
      '.person-card .avatar-ring{width:100%!important;height:82px!important;border-radius:14px!important;margin:0 0 7px!important;font-size:26px!important;overflow:hidden!important}',
      '.person-card .avatar-ring img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:14px!important}',
      '.product-thumb{width:100%!important;height:86px!important;border-radius:14px!important;margin-bottom:7px!important;background:#eaf3ff!important;overflow:hidden!important}',
      '.product-thumb img{width:100%!important;height:100%!important;object-fit:cover!important}',
      '.machine-card img,.machine-no-img{width:100%!important;height:80px!important;border-radius:14px!important;object-fit:cover!important}',
      '.person-name,.product-name{font-size:12.5px!important;line-height:1.25!important;font-weight:1000!important;min-height:32px!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}',
      '.person-id,.product-code{font-size:11.5px!important;line-height:1.18!important;font-weight:1000!important;word-break:break-word!important}',
      '.machine-number{font-size:15px!important;font-weight:1000!important}.machine-info{font-size:10.5px!important;line-height:1.25!important}',
      '#selectedPersonDisplay.populated{display:flex!important;grid-template-columns:unset!important;gap:12px!important;min-height:unset!important;padding:12px!important;align-items:center!important}',
      '#selectedPersonDisplay.populated>img,#selectedPersonDisplay.populated>.person-photo-lg{width:80px!important;height:80px!important;border-radius:50%!important;object-fit:cover!important;font-size:20px!important;flex:0 0 80px!important}',
      '#selectedPersonDisplay.populated .person-info-name{font-size:18px!important;line-height:1.3!important;font-weight:1000!important}',
      '#selectedProductArea{display:block!important}',
      '#workstationSelect{display:block!important;width:100%!important;min-height:56px!important;border:3px solid rgba(25,103,210,.55)!important;background:#fffdf2!important;color:#202124!important;border-radius:18px!important;font-size:17px!important;font-weight:1000!important;padding:8px 12px!important;margin-top:10px!important}',
      '#workstationSelect.v449-open{height:auto!important;min-height:150px!important}',
      '#v449StationHint{margin:10px 0;padding:10px 12px;border-radius:16px;background:#fff8d7;border:2px solid rgba(251,188,4,.55);font-weight:900;color:#6b4a00;line-height:1.45;font-size:13px}',
      '.v449-focus{animation:v449pulse 1.1s ease-in-out 2;box-shadow:0 0 0 7px rgba(66,133,244,.20)!important}',
      '@keyframes v449pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}',
      '@media(max-width:380px){#personGrid,.person-grid,#productGrid,.product-grid,#machineListGrid{gap:8px!important}.product-thumb,.person-card .avatar-ring{height:74px!important}.person-name,.product-name{font-size:11.5px!important}.person-id,.product-code{font-size:10.5px!important}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function focus(el){if(!el)return;el.classList.add('v449-focus');scroll(el);setTimeout(function(){try{el.classList.remove('v449-focus');}catch(e){}},2200);}

  function 取得產品(key){
    var parts=String(key||'').split('|');
    var code=parts[0]||'', name=parts.slice(1).join('|')||'';
    var nc=norm(code), list=[];
    try{list=list.concat(DB.products||DB.產品清單||[]);}catch(e){}
    try{list=list.concat(DB.workstationGroups||[]);}catch(e){}
    var hit=list.find(function(p){return nc&&(norm(p.產品編號)===nc||norm(p.客戶品號)===nc);});
    if(!hit&&name) hit=list.find(function(p){return txt(p.品名)===txt(name);});
    return hit||{產品編號:code,品名:name};
  }

  function 取得該產品工站(product){
    var pc=norm(pick(product,['產品編號']));
    var cc=norm(pick(product,['客戶品號']));
    var groups=[];try{groups=DB.workstationGroups||[];}catch(e){}
    var routes=groups.filter(function(g){
      var rc=norm(pick(g,['產品編號']));
      var rcc=norm(pick(g,['客戶品號']));
      return (pc&&rc&&pc===rc)||(cc&&rcc&&cc===rcc)||(pc&&rcc&&pc===rcc)||(cc&&rc&&cc===rc);
    });
    var seen={};
    return routes.filter(function(g){
      var key=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');
      if(seen[key])return false;seen[key]=true;return true;
    }).sort(function(a,b){return String(a.工序範圍||a.工序||'').localeCompare(String(b.工序範圍||b.工序||''),'zh-Hant',{numeric:true});});
  }

  function 機台文字(g){return (g&&g.機台清單||[]).map(function(m){return m&&m.機台編號;}).filter(Boolean).join('、')||(g&&g.主機台)||'';}

  function 寫入工站選單(routes){
    var s=$('workstationSelect');if(!s)return;
    s.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
    routes.forEach(function(g,i){
      var label=[g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,機台文字(g)].filter(Boolean).join('｜');
      s.add(new Option(label,String(i)));
    });
    s.value='';
    s.onchange=function(){選工站();};
    if(routes.length){
      s.size=Math.min(routes.length+1,5);
      s.classList.add('v449-open');
    }else{
      s.size=1;
      s.classList.remove('v449-open');
    }
  }

  function 顯示工站提示(routes,product){
    var area=$('selectedProductArea'), s=$('workstationSelect');if(!area||!s)return;
    var old=$('v449StationHint');if(old)old.remove();
    var hint=document.createElement('div');hint.id='v449StationHint';
    var name=[pick(product,['產品編號']),pick(product,['客戶品號']),pick(product,['品名'])].filter(Boolean).join('｜');
    hint.innerHTML=routes.length
      ? '👇 工站資料已對接：'+name+'<br>請直接點下方工站欄位，選完才會顯示機台。'
      : '⚠️ 此產品沒有對應工站資料：'+name+'<br>請檢查 08_工站途程機台主檔 的產品編號 / 客戶品號。';
    s.parentNode.insertBefore(hint,s);
  }

  function 清除機台(){
    try{STATE.currentWorkstation=null;}catch(e){}
    setv('processRange','');setv('stdCapacity','');setv('stdTimeSec','');
    var a=$('mainMachineSelect');if(a)a.innerHTML='';
    var b=$('machineListGrid');if(b)b.innerHTML='';
  }

  function 選產品(key){
    安裝樣式();移除之前亂加面板();
    if(!window.DB||!window.STATE)return;
    var product=取得產品(key);
    var routes=取得該產品工站(product);
    STATE.productGroupList=routes;
    STATE.currentProductGroup=routes[0]||product;
    STATE.currentWorkstation=null;
    document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected');});
    try{var card=document.querySelector('.product-card[data-key="'+(window.CSS&&CSS.escape?CSS.escape(key):String(key).replace(/"/g,'\\"'))+'"]');if(card)card.classList.add('selected');}catch(e){}
    setv('productCode',pick(product,['產品編號']));
    setv('productName',typeof window.cleanProductName==='function'?window.cleanProductName(pick(product,['品名'])):pick(product,['品名']));
    var area=$('selectedProductArea');if(area){area.classList.remove('hidden');area.style.display='block';}
    if(typeof window.showProductPhoto==='function')window.showProductPhoto(STATE.currentProductGroup||product);
    寫入工站選單(routes);
    顯示工站提示(routes,product);
    清除機台();
    if(typeof window.updatePreview==='function')window.updatePreview();
    if(typeof window.updateConfirmSummary==='function')window.updateConfirmSummary();
    roar2(routes.length?'📦':'⚠️',routes.length?'產品已選定，工站已跳出':'產品無工站資料',[pick(product,['產品編號']),pick(product,['品名'])].filter(Boolean).join('｜'),routes.length?'success':'warning');
    focus($('workstationSelect')||area);
  }

  function 選工站(){
    var s=$('workstationSelect');if(!s)return;
    var i=s.value;
    var g=i===''?null:(STATE.productGroupList||[])[Number(i)];
    STATE.currentWorkstation=g||null;
    if(g){
      s.size=1;s.classList.remove('v449-open');
      setv('processRange',g.工序範圍||g.工序||'');setv('stdCapacity',g.標準產能||'');setv('stdTimeSec',g.標準工時_秒||'');
      var list=g.機台清單||[];
      if(typeof window.buildMachineSelect==='function')window.buildMachineSelect(list);
      if(typeof window.renderMachineGrid==='function')window.renderMachineGrid(list);
      if(typeof window.markStepDone==='function')window.markStepDone();
      roar2('🏭','已選定工站 / Workstation Selected',[g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,機台文字(g)].filter(Boolean).join('｜'),'success');
      focus($('machineListGrid')||$('mainMachineSelect'));
    }else 清除機台();
    if(typeof window.updatePreview==='function')window.updatePreview();
    if(typeof window.updateConfirmSummary==='function')window.updateConfirmSummary();
  }

  function 補人員選取跳出(){
    if(typeof window.selectPerson==='function'&&!window.selectPerson.__v449){
      var old=window.selectPerson;
      window.selectPerson=function(i){var r=old.apply(this,arguments);setTimeout(function(){focus($('selectedPersonDisplay')||$('empIdHighlight'));},120);return r;};
      window.selectPerson.__v449=true;
    }
  }

  function 補下一步防呆(){
    if(typeof window.goNextOrSubmit==='function'&&!window.goNextOrSubmit.__v449){
      var old=window.goNextOrSubmit;
      window.goNextOrSubmit=function(){
        try{
          if(STATE.currentStep===1&&STATE.currentProductGroup&&!STATE.currentWorkstation){
            var sel=$('workstationSelect');
            if(sel&&STATE.productGroupList&&STATE.productGroupList.length){sel.size=Math.min(STATE.productGroupList.length+1,5);sel.classList.add('v449-open');focus(sel);}
            roar2('⚠️','請先選工站','工站資料已在下方跳出，請先選工站再下一步。','warning');
            return;
          }
        }catch(e){}
        return old.apply(this,arguments);
      };
      window.goNextOrSubmit.__v449=true;
    }
  }

  function 安裝(){安裝樣式();移除之前亂加面板();window.selectProduct=選產品;window.V4_449_選產品=選產品;window.onWorkstationChange=選工站;補人員選取跳出();補下一步防呆();}

  document.addEventListener('click',function(ev){
    var card=ev.target.closest&&ev.target.closest('.product-card');
    if(card){var key=card.getAttribute('data-key')||'';setTimeout(function(){選產品(key);},80);setTimeout(function(){選產品(key);},400);}
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',安裝);else 安裝();
  window.addEventListener('load',function(){安裝();var t=setInterval(function(){安裝();if(Date.now()>守護到)clearInterval(t);},300);});
  console.log('V4 minimal no-random fixer loaded',VER);
})();