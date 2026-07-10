/* 報工V4｜照片穩定顯示 v539：不輪詢、不重建、不閃爍 */
(function(){
  'use strict';
  if(window.__HX_PHOTO_STABLE_539__)return;window.__HX_PHOTO_STABLE_539__=true;
  var index={人員:{},產品:{},機台:{}},loaded=false,loading=false,timer=0;
  function s(v){return String(v==null?'':v).trim()}
  function n(v){return s(v).replace(/\.0$/,'').replace(/\s+/g,'').toUpperCase()}
  function thumb(v){var x=s(v);if(!x)return'';var m=x.match(/(?:\/file\/d\/|[?&]id=)([A-Za-z0-9_-]+)/);if(m)return'https://drive.google.com/thumbnail?id='+m[1]+'&sz=w1200';if(/^https?:\/\//i.test(x))return x;return''}
  function firstUrl(r){r=r||{};var ks=['縮圖網址','照片網址','產品照片網址','機台照片網址','人員照片網址','圖片網址','URL','url'];for(var i=0;i<ks.length;i++){var u=thumb(r[ks[i]]);if(u)return u}return''}
  function add(type,key,url){key=n(key);url=thumb(url);if(key&&url&&!index[type][key])index[type][key]=url}
  function build(rows){(rows||[]).forEach(function(r){var type=s(r.類型||r.資料類型);if(!/人員|產品|機台/.test(type)){if(r.工號||r.員工編號)type='人員';else if(r.機台編號||r.設備編號)type='機台';else type='產品'}var u=firstUrl(r);if(!u)return;if(type==='人員'){[r.照片主鍵,r.對應ID,r.工號,r.員工編號,r.姓名].forEach(function(k){add('人員',k,u)})}else if(type==='機台'){[r.照片主鍵,r.對應ID,r.機台編號,r.設備編號,r.主機台].forEach(function(k){add('機台',k,u)})}else{[r.照片主鍵,r.對應ID,r.產品編號,r.客戶品號,r.客戶料號,r.料號,r.品號].forEach(function(k){add('產品',k,u)})}})}
  function lookup(type,keys){for(var i=0;i<keys.length;i++){var u=index[type][n(keys[i])];if(u)return u}return''}
  function personUrl(r){return firstUrl(r)||lookup('人員',[r&&r.工號,r&&r.員工編號,r&&r.姓名])}
  function productUrl(r){return firstUrl(r)||lookup('產品',[r&&r.產品編號,r&&r.客戶品號,r&&r.客戶料號,r&&r.料號,r&&r.品號])}
  function machineUrl(r){return firstUrl(r)||lookup('機台',[r&&r.機台編號,r&&r.設備編號,r&&r.主機台])}
  async function load(){if(loaded||loading)return;loading=true;var rows=[];try{if(window.V4Bridge&&typeof window.V4Bridge.apiPost==='function'){var res=await window.V4Bridge.apiPost('取得照片索引V4',{action:'取得照片索引V4'});if(res&&res.照片索引){['人員','產品','機台'].forEach(function(t){var a=res.照片索引[t];if(Array.isArray(a))a.forEach(function(x){rows.push(Object.assign({},x,{類型:t}))})})}}}catch(e){}if(!rows.length){try{if(window.V4Bridge&&typeof window.V4Bridge.readSheet==='function')rows=await window.V4Bridge.readSheet('06_照片資料庫')}catch(e){}}build(rows);loaded=true;loading=false;enrich()}
  function enrich(){if(!window.DB)return;(DB.persons||[]).forEach(function(r){var u=personUrl(r);if(u)r.人員照片網址=r.照片網址=r.縮圖網址=u});(DB.productList||DB.products||[]).forEach(function(r){var u=productUrl(r);if(u)r.產品照片網址=r.照片網址=r.縮圖網址=u});(DB.machines||[]).forEach(function(r){var u=machineUrl(r);if(u)r.機台照片網址=r.照片網址=r.縮圖網址=u})}
  function setBox(box,url,icon,alt){if(!box)return;url=thumb(url);var current=box.dataset.hxPhotoUrl||'';if(current===url)return;box.dataset.hxPhotoUrl=url;if(url){var img=box.querySelector('img');if(!img){box.textContent='';img=document.createElement('img');box.appendChild(img)}if(img.src!==url)img.src=url;img.alt=alt||'照片';img.loading='lazy';img.onerror=function(){if(box.dataset.hxPhotoUrl===url){box.dataset.hxPhotoUrl='';box.textContent=icon}}}else if(!box.querySelector('img')){box.textContent=icon}}
  function render(){if(!window.DB)return;(document.querySelectorAll('.person-card')||[]).forEach(function(card){var p=(DB.persons||[])[Number(card.dataset.index)];if(p)setBox(card.querySelector('.person-photo,.person-avatar,.person-img,.person-photo-lg'),personUrl(p),'👤',p.姓名||p.工號)});(document.querySelectorAll('.product-card')||[]).forEach(function(card){var p=(DB.productList||DB.products||[])[Number(card.dataset.index)];if(p)setBox(card.querySelector('.product-thumb'),productUrl(p),'📦',p.品名||p.產品編號)});var sp=window.STATE&&STATE.currentProductGroup,spd=document.getElementById('selectedProductDisplay');if(sp&&spd)setBox(spd.querySelector('.person-photo-lg,.product-thumb'),productUrl(sp),'📦',sp.品名||sp.產品編號);var op=window.STATE&&STATE.operator,opd=document.getElementById('selectedPersonDisplay');if(op&&opd)setBox(opd.querySelector('.person-photo-lg'),personUrl(op),'👤',op.姓名||op.工號)}
  function schedule(){clearTimeout(timer);timer=setTimeout(function(){enrich();render()},80)}
  function patch(name){var fn=window[name];if(typeof fn!=='function'||fn.__photo539)return;window[name]=function(){var ret=fn.apply(this,arguments);schedule();return ret};window[name].__photo539=true}
  function boot(){load();['buildPersonGrid','renderPersonGrid','buildProductGrid','selectPerson','selectProduct','renderMachineGrid','onWorkstationChange'].forEach(patch);schedule()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('load',function(){setTimeout(boot,300)},{once:true});
})();
