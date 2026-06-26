/* 製一組報工表單 V4｜工站對接最小修正 v4.5.0
 * 只修一件事：選產品後，原本的 #workstationSelect 必須自動跳出並帶入 08_工站途程機台主檔 的工站資料。
 * 不新增工站卡片、不改產品欄數、不改選定人員大圖；卡片照片維持卡片上半部。
 */
(function(){
  'use strict';
  var VER='v4.5.0_station_select_binding_only';
  var 守護到=Date.now()+30000;

  function $(id){return document.getElementById(id);}
  function txt(v){return String(v==null?'':v).trim();}
  function norm(v){return txt(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v);}return '';}
  function setv(id,v){var e=$(id);if(e)e.value=v||'';}
  function toast(a,b,c,t){try{if(typeof window.roar==='function')window.roar(a,b,c,t||'success');}catch(e){}}
  function scroll(el){if(!el)return;setTimeout(function(){try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){try{el.scrollIntoView();}catch(_){}}},100);}

  function 清除舊亂入UI(){['v4StationDock444','v445StationPanel','v4StationQuickPicker443','v4StationQuickPicker','v447StationNotice','v448StationPanel','v449StationHint'].forEach(function(id){var e=$(id);if(e)e.remove();});}

  function 安裝最小樣式(){
    if($('v450_station_bind_style'))return;
    var s=document.createElement('style');s.id='v450_station_bind_style';
    s.textContent=[
      '#v4StationDock444,#v445StationPanel,#v4StationQuickPicker443,#v4StationQuickPicker,#v447StationNotice,#v448StationPanel{display:none!important}',
      '#personGrid,.person-grid,#productGrid,.product-grid,#machineListGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}',
      '.product-thumb,.person-card .avatar-ring{height:86px!important;border-radius:14px!important;overflow:hidden!important}',
      '.product-thumb img,.person-card .avatar-ring img{width:100%!important;height:100%!important;object-fit:cover!important}',
      '#selectedPersonDisplay.populated>img,#selectedPersonDisplay.populated>.person-photo-lg{width:80px!important;height:80px!important;border-radius:50%!important;object-fit:cover!important}',
      '#selectedProductArea{display:block!important;margin-top:16px!important}',
      '#workstationSelect{display:block!important;width:100%!important;min-height:58px!important;border:4px solid rgba(25,103,210,.55)!important;background:#fffdf2!important;color:#202124!important;border-radius:18px!important;font-size:17px!important;font-weight:1000!important;padding:8px 12px!important;margin:10px 0!important}',
      '#workstationSelect.v450-open{height:auto!important;min-height:156px!important}',
      '#v450StationHint{margin:10px 0;padding:11px 12px;border-radius:16px;background:#fff8d7;border:2px solid rgba(251,188,4,.55);font-weight:900;color:#6b4a00;line-height:1.45;font-size:13px}',
      '.v450-focus{animation:v450pulse 1.1s ease-in-out 2;box-shadow:0 0 0 7px rgba(66,133,244,.2)!important}',
      '@keyframes v450pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}'
    ].join('\n');document.head.appendChild(s);
  }

  function focus(el){if(!el)return;el.classList.add('v450-focus');scroll(el);setTimeout(function(){try{el.classList.remove('v450-focus');}catch(e){}},2200);}

  function 所有產品資料(){var a=[];try{a=a.concat(DB.products||DB.產品清單||[]);}catch(e){}try{a=a.concat(DB.workstationGroups||[]);}catch(e){}return a;}

  function 找產品(key){
    var parts=String(key||'').split('|');var code=parts[0]||'',name=parts.slice(1).join('|')||'',nc=norm(code);
    var list=所有產品資料();
    var hit=list.find(function(p){return nc&&(norm(p.產品編號)===nc||norm(p.客戶品號)===nc);});
    if(!hit&&name)hit=list.find(function(p){return txt(p.品名)===txt(name);});
    return hit||{產品編號:code,品名:name};
  }

  function 找工站(product,key){
    var pc=norm(pick(product,['產品編號']));
    var cc=norm(pick(product,['客戶品號']));
    var parts=String(key||'').split('|');
    var keyCode=norm(parts[0]||'');
    var groups=[];try{groups=DB.workstationGroups||[];}catch(e){}
    var routes=groups.filter(function(g){
      var rc=norm(pick(g,['產品編號']));
      var rcc=norm(pick(g,['客戶品號']));
      return (pc&&rc&&pc===rc)||(cc&&rcc&&cc===rcc)||(pc&&rcc&&pc===rcc)||(cc&&rc&&cc===rc)||(keyCode&&rc&&keyCode===rc)||(keyCode&&rcc&&keyCode===rcc);
    });
    // 若產品卡本身就是從工站群組來的，但 product 被 02_產品主檔覆蓋，最後用 keyCode 再撈一次。
    var seen={};
    routes=routes.filter(function(g){
      var k=[g.產品編號,g.客戶品號,g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,g.主機台].join('|');
      if(seen[k])return false;seen[k]=true;return true;
    });
    return routes.sort(function(a,b){return String(a.工序範圍||a.工序||'').localeCompare(String(b.工序範圍||b.工序||''),'zh-Hant',{numeric:true});});
  }

  function 機台文字(g){return (g&&g.機台清單||[]).map(function(m){return m&&m.機台編號;}).filter(Boolean).join('、')||(g&&g.主機台)||'';}

  function 顯示提示(routes,product){
    var s=$('workstationSelect');if(!s||!s.parentNode)return;
    var old=$('v450StationHint');if(old)old.remove();
    var div=document.createElement('div');div.id='v450StationHint';
    var name=[pick(product,['產品編號']),pick(product,['客戶品號']),pick(product,['品名'])].filter(Boolean).join('｜');
    div.innerHTML=routes.length?'👇 工站已自動帶入：'+name+'<br>請直接點選下方工站欄位。':'⚠️ 此產品目前沒有對應工站：'+name+'<br>請檢查 08_工站途程機台主檔 的產品編號 / 客戶品號。';
    s.parentNode.insertBefore(div,s);
  }

  function 填入工站選單(routes){
    var s=$('workstationSelect');if(!s)return;
    s.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
    routes.forEach(function(g,i){
      var label=[g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,機台文字(g)].filter(Boolean).join('｜');
      s.add(new Option(label,String(i)));
    });
    s.value='';
    s.onchange=選工站;
    if(routes.length){s.size=Math.min(routes.length+1,6);s.classList.add('v450-open');}
    else{s.size=1;s.classList.remove('v450-open');}
  }

  function 清機台(){
    try{STATE.currentWorkstation=null;}catch(e){}
    setv('processRange','');setv('stdCapacity','');setv('stdTimeSec','');
    var a=$('mainMachineSelect');if(a)a.innerHTML='';
    var b=$('machineListGrid');if(b)b.innerHTML='';
  }

  function 選產品(key){
    安裝最小樣式();清除舊亂入UI();
    if(!window.DB||!window.STATE)return;
    var product=找產品(key);
    var routes=找工站(product,key);
    STATE.productGroupList=routes;
    STATE.currentProductGroup=routes[0]||product;
    STATE.currentWorkstation=null;
    document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected');});
    try{var card=document.querySelector('.product-card[data-key="'+(window.CSS&&CSS.escape?CSS.escape(key):String(key).replace(/"/g,'\\"'))+'"]');if(card)card.classList.add('selected');}catch(e){}
    setv('productCode',pick(product,['產品編號']));
    setv('productName',typeof window.cleanProductName==='function'?window.cleanProductName(pick(product,['品名'])):pick(product,['品名']));
    var area=$('selectedProductArea');if(area){area.classList.remove('hidden');area.style.display='block';}
    if(typeof window.showProductPhoto==='function')window.showProductPhoto(STATE.currentProductGroup||product);
    填入工站選單(routes);
    顯示提示(routes,product);
    清機台();
    if(typeof window.updatePreview==='function')window.updatePreview();
    if(typeof window.updateConfirmSummary==='function')window.updateConfirmSummary();
    toast(routes.length?'📦':'⚠️',routes.length?'產品已選定，工站已帶入':'產品沒有工站資料',[pick(product,['產品編號']),pick(product,['品名'])].filter(Boolean).join('｜'),routes.length?'success':'warning');
    focus($('workstationSelect')||area);
  }

  function 選工站(){
    var s=$('workstationSelect');if(!s)return;
    var i=s.value;
    var g=i===''?null:(STATE.productGroupList||[])[Number(i)];
    STATE.currentWorkstation=g||null;
    if(!g){清機台();return;}
    s.size=1;s.classList.remove('v450-open');
    setv('processRange',g.工序範圍||g.工序||'');setv('stdCapacity',g.標準產能||'');setv('stdTimeSec',g.標準工時_秒||'');
    var list=g.機台清單||[];
    if(typeof window.buildMachineSelect==='function')window.buildMachineSelect(list);
    if(typeof window.renderMachineGrid==='function')window.renderMachineGrid(list);
    if(typeof window.markStepDone==='function')window.markStepDone();
    if(typeof window.updatePreview==='function')window.updatePreview();
    if(typeof window.updateConfirmSummary==='function')window.updateConfirmSummary();
    toast('🏭','已選定工站 / Workstation Selected',[g.報工工站名稱||g.工站名稱,g.工序範圍||g.工序,機台文字(g)].filter(Boolean).join('｜'),'success');
    focus($('machineListGrid')||$('mainMachineSelect'));
  }

  function 補下一步(){
    if(typeof window.goNextOrSubmit==='function'&&!window.goNextOrSubmit.__v450){
      var old=window.goNextOrSubmit;
      window.goNextOrSubmit=function(){
        try{
          if(STATE.currentStep===1&&STATE.currentProductGroup&&!STATE.currentWorkstation){
            var s=$('workstationSelect');if(s&&STATE.productGroupList&&STATE.productGroupList.length){s.size=Math.min(STATE.productGroupList.length+1,6);s.classList.add('v450-open');focus(s);}
            toast('⚠️','請先選工站','工站欄位已在產品下方展開，請先選工站。','warning');
            return;
          }
        }catch(e){}
        return old.apply(this,arguments);
      };
      window.goNextOrSubmit.__v450=true;
    }
  }

  function 安裝(){
    安裝最小樣式();清除舊亂入UI();
    選產品.__v441=true; 選產品.__v446=true; 選產品.__v449=true; 選產品.__v450=true;
    window.selectProduct=選產品;
    window.onWorkstationChange=選工站;
    window.V4_450_選產品=選產品;
    補下一步();
  }

  document.addEventListener('click',function(ev){var card=ev.target.closest&&ev.target.closest('.product-card');if(card){var key=card.getAttribute('data-key')||'';setTimeout(function(){選產品(key);},80);setTimeout(function(){選產品(key);},420);}},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',安裝);else 安裝();
  window.addEventListener('load',function(){安裝();var t=setInterval(function(){安裝();if(Date.now()>守護到)clearInterval(t);},250);});
  console.log('V4 station binding loaded',VER);
})();