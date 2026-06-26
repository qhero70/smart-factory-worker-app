/* 製一組報工表單 V4｜產品工站最終可用修復 v4.5.1
 * 只修產品點選與工站對接：點產品後一定帶入產品資料，原工站 select 自動展開；選工站後顯示機台。
 * 不改需求外 UI：不新增浮動面板、不改成半版大圖；卡片維持三欄，照片維持卡片上半部。
 */
(function(){
  'use strict';
  if(window.__V4_451_已安裝__) return;
  window.__V4_451_已安裝__=true;
  var VER='v4.5.1_product_station_final';
  var 守護到=Date.now()+180000;

  function $(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){return txt(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v);}return '';}
  function safe(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function setv(id,v){var e=$(id);if(e)e.value=v||'';}
  function toast(a,b,c,t){try{if(typeof window.roar==='function')window.roar(a,b,c,t||'success');}catch(e){}}
  function go(el){if(!el)return;setTimeout(function(){try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){try{el.scrollIntoView();}catch(_){}}},80);}

  function 安裝樣式(){
    if($('v451_style'))return;
    var s=document.createElement('style');s.id='v451_style';
    s.textContent=[
      '#v4StationDock444,#v445StationPanel,#v4StationQuickPicker443,#v4StationQuickPicker,#v447StationNotice,#v448StationPanel,#v449StationHint,#v450StationHint{display:none!important}',
      '#personGrid,.person-grid,#productGrid,.product-grid,#machineListGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}',
      '.product-thumb,.person-card .avatar-ring{height:86px!important;border-radius:14px!important;overflow:hidden!important}',
      '.product-thumb img,.person-card .avatar-ring img{width:100%!important;height:100%!important;object-fit:cover!important}',
      '#selectedProductArea{display:block!important;margin-top:16px!important}',
      '#workstationSelect{display:block!important;width:100%!important;min-height:58px!important;border:4px solid rgba(25,103,210,.6)!important;background:#fffdf2!important;color:#202124!important;border-radius:18px!important;font-size:17px!important;font-weight:1000!important;padding:8px 12px!important;margin:10px 0!important}',
      '#workstationSelect.v451-open{height:auto!important;min-height:160px!important}',
      '#v451StationHint{margin:10px 0;padding:11px 12px;border-radius:16px;background:#fff8d7;border:2px solid rgba(251,188,4,.55);font-weight:900;color:#6b4a00;line-height:1.45;font-size:13px}',
      '.v451-focus{animation:v451pulse 1.1s ease-in-out 2;box-shadow:0 0 0 7px rgba(66,133,244,.20)!important}',
      '@keyframes v451pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function focus(el){if(!el)return;el.classList.add('v451-focus');go(el);setTimeout(function(){try{el.classList.remove('v451-focus');}catch(e){}},2200);}
  function 清舊(){['v4StationDock444','v445StationPanel','v4StationQuickPicker443','v4StationQuickPicker','v447StationNotice','v448StationPanel','v449StationHint','v450StationHint'].forEach(function(id){var e=$(id);if(e)e.remove();});}

  function 產品卡取key(card){
    if(!card)return '';
    var k=card.getAttribute('data-key')||'';
    if(k)return k;
    var code=(card.querySelector('.product-code')||{}).textContent||'';
    var name=(card.querySelector('.product-name')||{}).textContent||'';
    return txt(code)+'|'+txt(name);
  }
  function 全產品(){var a=[];try{a=a.concat(DB.products||DB.產品清單||[]);}catch(e){}try{a=a.concat(DB.workstationGroups||[]);}catch(e){}return a;}
  function 找產品(key){
    var parts=String(key||'').split('|'), code=parts[0]||'', name=parts.slice(1).join('|')||'', nc=norm(code);
    var list=全產品();
    var hit=list.find(function(p){return nc&&(norm(p.產品編號)===nc||norm(p.客戶品號)===nc);});
    if(!hit&&name)hit=list.find(function(p){return txt(p.品名)===txt(name);});
    return hit||{產品編號:code,品名:name};
  }
  function 找工站(product,key){
    var parts=String(key||'').split('|'), keyCode=norm(parts[0]||'');
    var pc=norm(pick(product,['產品編號'])), cc=norm(pick(product,['客戶品號']));
    var groups=[];try{groups=DB.workstationGroups||[];}catch(e){}
    var routes=groups.filter(function(g){
      var rc=norm(pick(g,['產品編號'])), rcc=norm(pick(g,['客戶品號']));
      return (pc&&rc&&pc===rc)||(cc&&rcc&&cc===rcc)||(pc&&rcc&&pc===rcc)||(cc&&rc&&cc===rc)||(keyCode&&rc&&keyCode===rc)||(keyCode&&rcc&&keyCode===rcc);
    });
    var seen={};
    return routes.filter(function(g){
      var k=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');
      if(seen[k])return false; seen[k]=true; return true;
    }).sort(function(a,b){return String(a.工序範圍||a.工序||'').localeCompare(String(b.工序範圍||b.工序||''),'zh-Hant',{numeric:true});});
  }
  function 機台字(g){return (g&&g.機台清單||[]).map(function(m){return m&&m.機台編號;}).filter(Boolean).join('、')||(g&&g.主機台)||'';}

  function 顯示產品(product){
    var disp=$('selectedProductDisplay');
    if(!disp)return;
    var img='';
    var url=pick(product,['產品縮圖網址','產品照片網址','縮圖網址','照片網址']);
    if(url) img='<img src="'+safe(url)+'" onerror="this.outerHTML=\'<div class=person-photo-lg>無產品照</div>\'">';
    else img='<div class="person-photo-lg">無產品照</div>';
    var name=pick(product,['品名']);
    if(typeof window.cleanProductName==='function')name=window.cleanProductName(name);
    disp.className='selected-person-display populated';
    disp.innerHTML=img+'<div><div class="person-info-name">'+safe(name||'尚未選產品')+'</div><div class="caption" style="margin-top:3px;">'+safe(pick(product,['產品編號']))+'</div></div>';
  }
  function 寫工站(routes){
    var s=$('workstationSelect');if(!s)return;
    s.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
    routes.forEach(function(g,i){
      var label=[g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,機台字(g)].filter(Boolean).join('｜');
      s.add(new Option(label,String(i)));
    });
    s.value='';
    s.onchange=選工站;
    if(routes.length){s.size=Math.min(routes.length+1,6);s.classList.add('v451-open');}else{s.size=1;s.classList.remove('v451-open');}
  }
  function 提示(routes,product){
    var s=$('workstationSelect');if(!s||!s.parentNode)return;
    var old=$('v451StationHint');if(old)old.remove();
    var d=document.createElement('div');d.id='v451StationHint';
    var name=[pick(product,['產品編號']),pick(product,['客戶品號']),pick(product,['品名'])].filter(Boolean).join('｜');
    d.innerHTML=routes.length?'👇 工站已自動帶入：'+safe(name)+'<br>請在下方直接點選工站。':'⚠️ 找不到此產品工站：'+safe(name)+'<br>請檢查 08_工站途程機台主檔 的產品編號 / 客戶品號。';
    s.parentNode.insertBefore(d,s);
  }
  function 清機台(){
    try{STATE.currentWorkstation=null;}catch(e){}
    setv('processRange','');setv('stdCapacity','');setv('stdTimeSec','');
    var a=$('mainMachineSelect');if(a)a.innerHTML='';
    var b=$('machineListGrid');if(b)b.innerHTML='';
  }
  function 選產品(key,card){
    安裝樣式();清舊();
    if(!window.DB||!window.STATE)return;
    if(!key&&card)key=產品卡取key(card);
    var product=找產品(key), routes=找工站(product,key);
    STATE.productGroupList=routes;
    STATE.currentProductGroup=routes[0]||product;
    STATE.currentWorkstation=null;
    document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected');});
    if(card)card.classList.add('selected');
    setv('productCode',pick(product,['產品編號']));
    var n=pick(product,['品名']); if(typeof window.cleanProductName==='function')n=window.cleanProductName(n); setv('productName',n);
    var area=$('selectedProductArea');if(area){area.classList.remove('hidden');area.style.display='block';}
    顯示產品(product);
    寫工站(routes);
    提示(routes,product);
    清機台();
    if(typeof window.updatePreview==='function')window.updatePreview();
    if(typeof window.updateConfirmSummary==='function')window.updateConfirmSummary();
    toast(routes.length?'📦':'⚠️',routes.length?'產品已選定，工站已跳出':'產品沒有工站資料',[pick(product,['產品編號']),pick(product,['品名'])].filter(Boolean).join('｜'),routes.length?'success':'warning');
    focus($('workstationSelect')||area);
  }
  function 選工站(){
    var s=$('workstationSelect');if(!s)return;
    var g=s.value===''?null:(STATE.productGroupList||[])[Number(s.value)];
    STATE.currentWorkstation=g||null;
    if(!g){清機台();return;}
    s.size=1;s.classList.remove('v451-open');
    setv('processRange',g.工序範圍||g.工序||'');setv('stdCapacity',g.標準產能||'');setv('stdTimeSec',g.標準工時_秒||'');
    var list=g.機台清單||[];
    if(typeof window.buildMachineSelect==='function')window.buildMachineSelect(list);
    if(typeof window.renderMachineGrid==='function')window.renderMachineGrid(list);
    if(typeof window.markStepDone==='function')window.markStepDone();
    if(typeof window.updatePreview==='function')window.updatePreview();
    if(typeof window.updateConfirmSummary==='function')window.updateConfirmSummary();
    toast('🏭','已選定工站 / Workstation Selected',[g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,機台字(g)].filter(Boolean).join('｜'),'success');
    focus($('machineListGrid')||$('mainMachineSelect'));
  }
  function 補下一步(){
    if(typeof window.goNextOrSubmit==='function'&&!window.goNextOrSubmit.__v451){
      var old=window.goNextOrSubmit;
      window.goNextOrSubmit=function(){
        try{if(STATE.currentStep===1&&STATE.currentProductGroup&&!STATE.currentWorkstation){var s=$('workstationSelect');if(s){s.size=Math.min((STATE.productGroupList||[]).length+1,6);s.classList.add('v451-open');focus(s);}toast('⚠️','請先選工站','工站已展開，請先選工站再下一步。','warning');return;}}catch(e){}
        return old.apply(this,arguments);
      };
      window.goNextOrSubmit.__v451=true;
    }
  }
  function 安裝(){
    安裝樣式();清舊();
    選產品.__v441=true;選產品.__v450=true;選產品.__v451=true;
    window.selectProduct=function(key){選產品(key,null);};
    window.onWorkstationChange=選工站;
    window.V4_451_選產品=選產品;
    補下一步();
  }
  function 攔截產品點擊(ev){
    var card=ev.target&&ev.target.closest&&ev.target.closest('.product-card');
    if(!card)return;
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    var key=產品卡取key(card);
    選產品(key,card);
  }
  document.addEventListener('click',攔截產品點擊,true);
  document.addEventListener('touchend',function(ev){var card=ev.target&&ev.target.closest&&ev.target.closest('.product-card');if(card){setTimeout(function(){選產品(產品卡取key(card),card);},20);}},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',安裝);else 安裝();
  window.addEventListener('load',function(){安裝();var t=setInterval(function(){安裝();if(Date.now()>守護到)clearInterval(t);},500);});
  console.log('V4 product station final loaded',VER);
})();