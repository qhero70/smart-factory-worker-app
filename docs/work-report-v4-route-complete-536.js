/* 報工V4｜產品完整工站清單修復 v536 */
(function(){
  if(window.__HX_ROUTE_COMPLETE_536__)return;window.__HX_ROUTE_COMPLETE_536__=true;
  function s(v){return String(v==null?'':v).trim()}
  function n(v){return s(v).replace(/,/g,'').replace(/\.0$/,'').replace(/\s+/g,'').toUpperCase()}
  function k(v){return n(v).replace(/[()（）]/g,'')}
  function splitOps(t){return s(t).replace(/，/g,',').replace(/、/g,',').split(',').map(function(x){return s(x)}).filter(Boolean)}
  function opLabel(t){var a=splitOps(t);return a.length?a.map(function(x,i){return 'OP'+(i+1)+': '+x}).join(' / '):''}
  function productMatch(p,r){p=p||{};r=r||{};var pc=n(p.產品編號||p.料號||p.品號),cc=n(p.客戶品號||p.客戶料號),pn=k(p.品名||p.產品名稱);var rc=n(r.產品編號||r.料號||r.品號),cr=n(r.客戶品號||r.客戶料號),rn=k(r.品名||r.產品名稱);if(pc&&(pc===rc||pc===cr))return true;if(cc&&(cc===rc||cc===cr))return true;if(pn&&rn&&(pn===rn||rn.indexOf(pn)>=0||pn.indexOf(rn)>=0))return true;return false}
  function sortRoute(a,b){return (Number(a.順序||a.工站順序||0)||0)-(Number(b.順序||b.工站順序||0)||0)}
  function text(r){var st=s(r.報工工站名稱||r.工站名稱||r.工站),op=opLabel(r.工序範圍||r.工序||r.工序編號_最終),mc=s(r.機台編號||r.主機台);return [st,op,mc].filter(Boolean).join('｜')}
  function rebuild(){
    if(!window.DB||!window.STATE)return;
    var p=window.STATE.currentProductGroup||{};
    if(!p.產品編號&&!p.品名)return;
    var all=(window.DB.workstationGroups||window.DB.routes||window.DB.報工工站群組||[]).filter(function(r){return productMatch(p,r)}).sort(sortRoute);
    var seen={};all=all.filter(function(r){var key=[r.產品編號,r.客戶品號,r.品名,r.順序,r.工站名稱,r.報工工站名稱,r.工序範圍,r.工序,r.工序編號_最終,r.機台編號].map(s).join('|');if(seen[key])return false;seen[key]=1;return true});
    if(!all.length)return;
    window.STATE.productGroupList=all;
    var sel=document.getElementById('workstationSelect');
    if(sel){var old=sel.value;sel.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';all.forEach(function(r,i){sel.add(new Option(text(r),String(i)))});sel.value=old&&all[Number(old)]?old:'';}
  }
  function patch(){
    if(typeof window.selectProduct==='function'&&!window.selectProduct.__route536){var old=window.selectProduct;window.selectProduct=function(){var ret=old.apply(this,arguments);setTimeout(rebuild,50);setTimeout(rebuild,300);return ret};window.selectProduct.__route536=true}
    if(typeof window.buildWorkstationSelect==='function'&&!window.buildWorkstationSelect.__route536){var old2=window.buildWorkstationSelect;window.buildWorkstationSelect=function(){var ret=old2.apply(this,arguments);setTimeout(rebuild,0);return ret};window.buildWorkstationSelect.__route536=true}
    rebuild();
  }
  window.addEventListener('load',function(){setTimeout(patch,500);setTimeout(patch,1500)});
  document.addEventListener('click',function(){setTimeout(patch,80)},true);
  setInterval(patch,2000);
})();
