/* 報工V4｜穩定完成版：產品→工站→OP→機台 v539 */
(function(){
  if(window.__HX_OP_RULE_539__)return;window.__HX_OP_RULE_539__=true;
  var ruleRows=[],ruleLoaded=false,lastProductKey='',lastRouteSignature='',refreshTimer=0;
  function s(v){return String(v==null?'':v).trim()}
  function n(v){return s(v).replace(/,/g,'').replace(/\.0$/,'').replace(/\s+/g,'').toUpperCase()}
  function nz(v){return n(v).replace(/^0+(?=\d)/,'')}
  function simple(v){return n(v).replace(/[()（）\-→>＋+_\s]/g,'')}
  function first(r,ks){r=r||{};for(var i=0;i<ks.length;i++){if(r[ks[i]]!=null&&s(r[ks[i]])!=='')return s(r[ks[i]])}return''}
  function split(t){return s(t).replace(/，/g,',').replace(/、/g,',').replace(/\+/g,',').split(/[,;；/]+/).map(function(x){return s(x)}).filter(Boolean)}
  function machines(t){return s(t).replace(/，/g,'、').replace(/,/g,'、').replace(/\./g,'、').split(/[、;；/\s]+/).map(function(x){return s(x).replace(/\.0$/,'')}).filter(Boolean)}
  function opLabel(t){var a=split(t);return a.map(function(x,i){return'OP'+(i+1)+': '+x}).join(' / ')}
  function same(p,r){p=p||{};r=r||{};var pc=n(first(p,['產品編號','料號','品號'])),rc=n(first(r,['產品編號','料號','品號']));var cc=n(first(p,['客戶品號','客戶料號'])),cr=n(first(r,['客戶品號','客戶料號']));var pn=simple(first(p,['品名','產品名稱'])),rn=simple(first(r,['品名','產品名稱']));if(pc&&rc&&(pc===rc||nz(pc)===nz(rc)))return true;if(cc&&cr&&cc===cr)return true;if(pc&&cr&&pc===cr)return true;if(cc&&rc&&cc===rc)return true;if(pn&&rn&&(pn===rn||pn.indexOf(rn)>=0||rn.indexOf(pn)>=0))return true;return false}
  function toRoute(r,i){var op=first(r,['OP編號','工序編號_最終','工序範圍','工序']);var mc=first(r,['機台編號','機台清單','主機台']);var ids=machines(mc);return Object.assign({},r,{產品編號:first(r,['產品編號','料號','品號']),客戶品號:first(r,['客戶品號','客戶料號']),品名:first(r,['品名','產品名稱']),順序:first(r,['工站順序','順序'])||String(i+1),工站名稱:first(r,['工站名稱','報工工站名稱','工站']),報工工站名稱:first(r,['工站名稱','報工工站名稱','工站']),工序編號_最終:op,工序範圍:op,工序:op,OP顯示:opLabel(op),主機台:ids[0]||first(r,['主機台']),機台編號:ids.join('、'),機台編號清單:ids,機台清單:ids.map(function(id){return{機台編號:id,主機台:id,機台名稱:'機台'+id,設備名稱:'機台'+id,機台型號:first(r,['機台型號','型號']),區域:first(r,['區域'])}}),啟用:first(r,['啟用'])||'是'})}
  function text(r){return[first(r,['報工工站名稱','工站名稱']),first(r,['OP顯示'])||opLabel(first(r,['工序範圍','工序','工序編號_最終'])),first(r,['機台編號','主機台'])].filter(Boolean).join('｜')}
  async function loadRules(){if(ruleLoaded)return ruleRows;ruleLoaded=true;try{if(window.V4Bridge&&typeof window.V4Bridge.readSheet==='function'){var rows=await window.V4Bridge.readSheet('04_OP機台對應規則');ruleRows=Array.isArray(rows)?rows.filter(function(r){return first(r,['啟用'])!=='否'}):[]}}catch(e){ruleRows=[]}return ruleRows}
  function pool(){return(window.DB&&(window.DB.workstationGroups||window.DB.routes||window.DB.報工工站群組))||[]}
  async function routesFor(p){var rules=await loadRules();var a=rules.filter(function(r){return same(p,r)}).map(toRoute);if(!a.length)a=pool().filter(function(r){return same(p,r)}).map(toRoute);a.sort(function(x,y){return(Number(x.順序)||0)-(Number(y.順序)||0)});var seen={};return a.filter(function(r){var k=[r.產品編號,r.客戶品號,r.品名,r.順序,r.工站名稱,r.工序範圍,r.機台編號].map(s).join('|');if(seen[k])return false;seen[k]=1;return true})}
  function signature(a){return(a||[]).map(text).join('||')}
  function draw(a){var sel=document.getElementById('workstationSelect');if(!sel||!a||!a.length)return;var sig=signature(a);if(sig===lastRouteSignature&&sel.options.length===a.length+1)return;var old=sel.value;sel.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';a.forEach(function(r,i){sel.add(new Option(text(r),String(i)))});if(old!==''&&a[Number(old)])sel.value=old;lastRouteSignature=sig}
  async function rebuild(force){if(!window.STATE)return;var p=window.STATE.currentProductGroup||{};var pk=[first(p,['產品編號']),first(p,['客戶品號']),first(p,['品名'])].join('|');if(!pk)return;if(!force&&pk===lastProductKey&&window.STATE.productGroupList&&window.STATE.productGroupList.length)return;var a=await routesFor(p);if(!a.length)return;window.STATE.productGroupList=a;draw(a);lastProductKey=pk;window.HX_ROUTE_RULE_539={count:a.length,routes:a.map(text)};console.info('[報工V4 v539]',window.HX_ROUTE_RULE_539)}
  function schedule(force){clearTimeout(refreshTimer);refreshTimer=setTimeout(function(){rebuild(force)},40)}
  function patch(){if(typeof window.selectProduct==='function'&&!window.selectProduct.__r539){var old=window.selectProduct;window.selectProduct=function(){lastProductKey='';lastRouteSignature='';var ret=old.apply(this,arguments);schedule(true);return ret};window.selectProduct.__r539=true}if(typeof window.buildWorkstationSelect==='function'&&!window.buildWorkstationSelect.__r539){var old2=window.buildWorkstationSelect;window.buildWorkstationSelect=function(){var ret=old2.apply(this,arguments);schedule(false);return ret};window.buildWorkstationSelect.__r539=true}}
  function boot(){loadRules().then(function(){patch();schedule(false)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('load',function(){setTimeout(boot,300)},{once:true});
})();
