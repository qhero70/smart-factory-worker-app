(function(){
  'use strict';
  var KEY='NEXUS_OS_今日報工任務';
  function T(v){return String(v==null?'':v).trim();}
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return{};}}
  function fire(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  function keyOf(t,st,mc){return [T(t['產品編號']),T(t['客戶品號']),T(t['品名']),T(st),T(''),T(mc)].join('|');}
  function ensureState(t){
    window.智慧製造報工狀態=window.智慧製造報工狀態||{};
    var state=window.智慧製造報工狀態;
    var st=T(t['工站名稱']||'派班補填');
    var mc=T(t['機台編號']||'派班補填');
    var row={
      產品編號:T(t['產品編號']),
      客戶品號:T(t['客戶品號']),
      品名:T(t['品名']||t['產品編號']),
      工站名稱:st,
      報工工站名稱:st,
      工序:T(''),
      主機台:mc,
      機台編號:mc,
      機台清單:mc==='派班補填'?[]:[{機台編號:mc,機台名稱:mc}],
      來源需求編號:T(t['來源需求編號']),
      派班編號:T(t['派班編號']),
      NEXUS派班補填:'是'
    };
    state.工站群組=Array.isArray(state.工站群組)?state.工站群組:[];
    var k=keyOf(t,st,mc);
    var found=state.工站群組.find(function(g){return keyOf(g,g.工站名稱,g.主機台)===k || (T(g.產品編號)===T(t['產品編號']) && T(g.工站名稱)===st);});
    if(!found)state.工站群組.unshift(row);
    state.選定工站=found||row;
    state.選定產品={產品編號:row.產品編號,客戶品號:row.客戶品號,品名:row.品名,派班編號:row.派班編號,來源需求編號:row.來源需求編號};
    state.選定人員=state.選定人員||{工號:T(t['工號']),姓名:T(t['姓名']),班別:T(t['班別']||'早班')};
    return {state:state,row:found||row,key:k,station:st,machine:mc};
  }
  function ensureProductCard(t,ctx){
    var list=document.getElementById('產品列表'); if(!list)return;
    var productKey=[T(t['產品編號']),T(t['客戶品號']),T(t['品名'])].join('|');
    var cards=Array.from(list.querySelectorAll('.產品卡片'));
    var card=cards.find(function(c){return T(c.getAttribute('data-key'))===productKey || T(c.textContent).indexOf(T(t['產品編號']))>=0 || T(c.textContent).indexOf(T(t['客戶品號']))>=0;});
    if(!card){
      card=document.createElement('div');
      card.className='產品卡片 選中';
      card.setAttribute('data-key',productKey);
      card.setAttribute('data-nexus-force-product','264');
      card.innerHTML='<div class="產品圖"><div class="產品佔位">📦</div></div><div class="產品資訊"><div class="產品名"></div><div class="產品副"></div></div>';
      var name=card.querySelector('.產品名'); if(name)name.textContent=T(t['品名']||t['產品編號']);
      var sub=card.querySelector('.產品副'); if(sub)sub.textContent=T(t['產品編號'])+'｜'+T(t['客戶品號']);
      list.insertBefore(card,list.firstChild);
    }
    Array.from(list.querySelectorAll('.產品卡片.選中')).forEach(function(x){x.classList.remove('選中');});
    card.classList.add('選中');
    card.setAttribute('data-key',productKey);
    var search=document.getElementById('搜尋工件'); if(search){search.value=T(t['產品編號']||t['客戶品號']||t['品名']);fire(search);}
    var n=document.querySelector('.下拉產品名'); if(n)n.textContent=T(t['品名']||t['產品編號']);
    var d=document.querySelector('.下拉產品資料'); if(d)d.textContent=T(t['產品編號'])+'｜'+T(t['客戶品號']);
    try{card.click();}catch(e){}
  }
  function ensureStation(t,ctx){
    var sel=document.getElementById('工站選擇'); if(!sel)return;
    var opt=Array.from(sel.options).find(function(o){return o.value===ctx.key;});
    if(!opt){opt=document.createElement('option');opt.value=ctx.key;opt.textContent=ctx.station+'｜'+ctx.machine+'｜NEXUS派班補填';sel.appendChild(opt);}
    sel.value=ctx.key;fire(sel);
  }
  function ensureQty(t){
    var q=document.getElementById('今日共做數');
    if(q&&!T(q.value)){q.value=T(t['預計數量']||t['需求量']||'');fire(q);}
  }
  function markMessage(){
    var boxes=Array.from(document.querySelectorAll('*')).filter(function(x){return /請選擇產品；請選擇工站/.test(T(x.textContent));});
    boxes.forEach(function(x){x.textContent='✅ 已套用 NEXUS 派班產品 / 工站補填；請補數量後送出。';x.style.color='#22c55e';});
  }
  function run(){
    var t=read(); if(!t||!Object.keys(t).length)return;
    var ctx=ensureState(t);
    ensureProductCard(t,ctx);
    ensureStation(t,ctx);
    ensureQty(t);
    markMessage();
    document.body.dataset.nexusForceSelect264='ready';
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#送出報工')){run();setTimeout(run,0);setTimeout(run,100);}},true);
  window.NEXUS_FORCE_SELECT_264=run;
  document.addEventListener('DOMContentLoaded',function(){[200,700,1200,2200,4000,6500].forEach(function(ms){setTimeout(run,ms);});setInterval(run,1800);});
})();