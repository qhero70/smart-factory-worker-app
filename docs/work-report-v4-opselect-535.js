/* 報工V4｜工站選單OP顯示＋完整途程比對 v537 */
(function(){
  if(window.__HX_OP_SELECT_537__)return;window.__HX_OP_SELECT_537__=true;
  function s(v){return String(v==null?'':v).trim()}
  function n(v){return s(v).replace(/,/g,'').replace(/\.0$/,'').replace(/\s+/g,'').toUpperCase()}
  function nz(v){return n(v).replace(/^0+(?=\d)/,'')}
  function simple(v){return n(v).replace(/[()（）\-→>＋+\s]/g,'')}
  function split(t){return s(t).replace(/，/g,',').replace(/、/g,',').split(',').map(function(x){return s(x)}).filter(Boolean)}
  function opLabel(t){var a=split(t);return a.length?a.map(function(x,i){return 'OP'+(i+1)+': '+x}).join(' / '):''}
  function routeText(r){r=r||{};var station=r.報工工站名稱||r.工站名稱||'';var ops=opLabel(r.工序範圍||r.工序||r.工序編號_最終||'');var machine=r.機台編號||r.主機台||'';return [station,ops,machine].filter(Boolean).join('｜')}
  function sameProduct(p,r){
    p=p||{};r=r||{};
    var pc=n(p.產品編號||p.料號||p.品號), rc=n(r.產品編號||r.料號||r.品號);
    var cc=n(p.客戶品號||p.客戶料號), cr=n(r.客戶品號||r.客戶料號);
    var pn=simple(p.品名||p.產品名稱), rn=simple(r.品名||r.產品名稱);
    if(pc && rc && (pc===rc || nz(pc)===nz(rc))) return true;
    if(cc && cr && cc===cr) return true;
    if(pc && cr && pc===cr) return true;
    if(cc && rc && cc===rc) return true;
    if(pn && rn && (pn===rn || pn.indexOf(rn)>=0 || rn.indexOf(pn)>=0)) return true;
    return false;
  }
  function routePool(){return (window.DB&&(window.DB.workstationGroups||window.DB.routes||window.DB.報工工站群組))||[]}
  function sortRoute(a,b){return (Number(a.順序||a.工站順序||0)||0)-(Number(b.順序||b.工站順序||0)||0)}
  function rebuildFull(){
    if(!window.STATE)return;
    var p=window.STATE.currentProductGroup||{};
    var pool=routePool();
    if(p&&(p.產品編號||p.品名)&&Array.isArray(pool)&&pool.length){
      var all=pool.filter(function(r){return sameProduct(p,r)}).sort(sortRoute);
      var seen={};
      all=all.filter(function(r){var key=[r.產品編號,r.客戶品號,r.品名,r.順序,r.報工工站名稱,r.工站名稱,r.工序範圍,r.工序,r.工序編號_最終,r.機台編號].map(s).join('|');if(seen[key])return false;seen[key]=1;return true});
      if(all.length>window.STATE.productGroupList.length) window.STATE.productGroupList=all;
    }
    rebuildSelect();
  }
  function rebuildSelect(){
    var sel=document.getElementById('workstationSelect');
    if(!sel||!window.STATE||!Array.isArray(window.STATE.productGroupList))return;
    var old=sel.value;
    sel.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
    window.STATE.productGroupList.forEach(function(r,i){sel.add(new Option(routeText(r),String(i)))});
    sel.value=(old!==''&&window.STATE.productGroupList[Number(old)])?old:'';
  }
  function patch(){
    if(typeof window.selectProduct==='function'&&!window.selectProduct.__op537){var old=window.selectProduct;window.selectProduct=function(){var ret=old.apply(this,arguments);setTimeout(rebuildFull,30);setTimeout(rebuildFull,250);setTimeout(rebuildFull,900);return ret};window.selectProduct.__op537=true}
    if(typeof window.buildWorkstationSelect==='function'&&!window.buildWorkstationSelect.__op537){var old2=window.buildWorkstationSelect;window.buildWorkstationSelect=function(){var ret=old2.apply(this,arguments);setTimeout(rebuildFull,0);return ret};window.buildWorkstationSelect.__op537=true}
    rebuildFull();
  }
  window.addEventListener('load',function(){setTimeout(patch,300);setTimeout(patch,1200);setTimeout(rebuildFull,2000)});
  document.addEventListener('click',function(){setTimeout(patch,60)},true);
  setInterval(patch,1200);
})();
