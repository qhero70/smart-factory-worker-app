/* 化新報工 V4 v5.0.3：產品/機台照片回補與班別下拉修正 */
(function(){
  'use strict';
  if(window.__HX_PHOTO_SHIFT_503__) return;
  window.__HX_PHOTO_SHIFT_503__ = true;
  function E(id){return document.getElementById(id);}
  function S(v){return String(v==null?'':v).trim();}
  function K(v){return S(v).toLowerCase().replace(/\.0$/,'').replace(/\.(jpg|jpeg|png|webp)$/i,'').replace(/[^a-z0-9]/g,'');}
  function drive(v){var s=S(v);if(!s)return'';var m=s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)||s.match(/[?&]id=([a-zA-Z0-9_-]+)/);if(m&&m[1])return'https://drive.google.com/thumbnail?id='+m[1]+'&sz=w1200';return /^https?:\/\//i.test(s)?s:'';}
  function img(card,url,label){if(!card||!url)return;var old=card.querySelector(':scope > img');if(!old){old=document.createElement('img');card.insertBefore(old,card.firstChild);}old.src=url;old.alt=label||'照片';old.loading='lazy';card.classList.remove('no-photo');}
  function urlProduct(p){return drive(p&& (p.產品照片網址||p.產品縮圖網址||p.照片網址||p.縮圖網址||p.圖片網址||p.URL));}
  function urlMachine(m){return drive(m&& (m.機台照片網址||m.照片網址||m.縮圖網址||m.圖片網址||m.URL));}
  function merge(){
    if(!window.DB)return;
    var prod={};
    (DB.products||DB.產品||[]).forEach(function(p){var u=urlProduct(p);if(u){prod[K(p.產品編號)]=u;prod[K(p.客戶品號)]=u;prod[K(p.品名)]=u;}});
    (DB.productList||[]).forEach(function(p){var u=urlProduct(p)||prod[K(p.產品編號)]||prod[K(p.客戶品號)]||prod[K(p.品名)];if(u){p.產品照片網址=u;p.產品縮圖網址=u;p.照片網址=u;}});
    var mach={};
    (DB.machines||DB.機台||[]).forEach(function(m){var u=urlMachine(m);if(u){mach[K(m.機台編號)]=u;mach[K(m.設備編號)]=u;mach[K(m.機台名稱)]=u;}});
    (DB.routes||DB.報工工站群組||[]).forEach(function(r){var pu=prod[K(r.產品編號)]||prod[K(r.客戶品號)]||prod[K(r.品名)];if(pu){r.產品照片網址=pu;r.產品縮圖網址=pu;r.照片網址=pu;}if(Array.isArray(r.機台清單)){r.機台清單.forEach(function(m){var u=urlMachine(m)||mach[K(m.機台編號)]||mach[K(m.設備編號)]||mach[K(m.機台名稱)];if(u){m.機台照片網址=u;m.照片網址=u;m.縮圖網址=u;}});}});
  }
  function repairCards(){
    if(!window.DB)return;merge();
    document.querySelectorAll('.product-card').forEach(function(c){var raw=S(c.getAttribute('data-key'));var a=raw.split('|');var code=a[0]||'';var name=a.slice(1).join('|');var p=(DB.productList||[]).find(function(x){return S(x.產品編號)===code;})||{};img(c,urlProduct(p),name||code);});
    document.querySelectorAll('.machine-card').forEach(function(c){var id=S(c.getAttribute('data-mid'));var r=window.STATE&&STATE.route;var m=(r&&Array.isArray(r.機台清單)?r.機台清單:[]).find(function(x){return S(x.機台編號)===id;})||{};img(c,urlMachine(m),id);});
  }
  function shift(){var s=E('shiftSelect');if(!s)return;var cur=s.value||'早班';['早班','中班','夜班'].forEach(function(v){if(!Array.from(s.options).some(function(o){return o.value===v;}))s.add(new Option(v,v));});if(cur.indexOf('中')>=0)s.value='中班';else if(cur.indexOf('夜')>=0)s.value='夜班';else s.value='早班';}
  function hook(){
    if(typeof window.renderProducts==='function'&&!window.__HX_RENDER_PRODUCTS_503__){window.__HX_RENDER_PRODUCTS_503__=true;var rp=window.renderProducts;window.renderProducts=function(){merge();var r=rp.apply(this,arguments);setTimeout(repairCards,60);return r;};}
    if(typeof window.onWorkstationChange==='function'&&!window.__HX_WORKSTATION_503__){window.__HX_WORKSTATION_503__=true;var ow=window.onWorkstationChange;window.onWorkstationChange=function(){var r=ow.apply(this,arguments);setTimeout(repairCards,60);return r;};}
    if(typeof window.selectPerson==='function'&&!window.__HX_SHIFT_503__){window.__HX_SHIFT_503__=true;var sp=window.selectPerson;window.selectPerson=function(){var r=sp.apply(this,arguments);setTimeout(shift,60);return r;};}
  }
  function run(){hook();merge();repairCards();shift();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  setTimeout(run,800);setTimeout(run,2000);setInterval(function(){repairCards();shift();hook();},2000);
})();
