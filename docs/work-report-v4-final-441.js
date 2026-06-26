/* 製一組報工表單 V4｜正式修復封口 v4.4.1
 * 保留原完整 UI；只做最後接管：禁止保底覆蓋、正式產品全量、工站明顯選取、數量不預設 0。
 */
(function(){
  'use strict';
  var VER='v4.4.1_final_no_fallback_full_products';
  var 試算表ID=(window.PWA_CONFIG&&PWA_CONFIG.SPREADSHEET_ID)||'1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';
  var productCache=null;
  function $(id){return document.getElementById(id);} 
  function txt(v){return String(v==null?'':v).trim();}
  function esc(s){return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function norm(v){return txt(v).replace(/\.(jpg|jpeg|png|webp|gif)$/i,'').replace(/[^A-Za-z0-9\-_一-龥]/g,'').toUpperCase();}
  function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&txt(v)!=='')return txt(v);}return '';}
  function thumb(v,size){var s=txt(v);if(!s)return '';if(/^data:image\//i.test(s))return s;if(/drive\.google\.com\/thumbnail/i.test(s))return s;var m=s.match(/[-\w]{25,}/);return m?'https://drive.google.com/thumbnail?id='+m[0]+'&sz='+(size||'w900'):s;}
  function gviz(sheet){var cb='__V4_FINAL_441_'+Date.now()+'_'+Math.floor(Math.random()*999999);var url='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(試算表ID)+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&tq='+encodeURIComponent('select *')+'&tqx='+encodeURIComponent('out:json;responseHandler:'+cb)+'&_ts='+Date.now();return{url:url,cb:cb};}
  function jsonp(url,cb,ms){ms=ms||18000;return new Promise(function(resolve,reject){var done=false,s=document.createElement('script'),t=setTimeout(function(){if(done)return;done=true;clean();reject(new Error('讀取正式主庫逾時'));},ms);function clean(){clearTimeout(t);try{delete window[cb];}catch(e){window[cb]=undefined;}try{s.remove();}catch(e){}}window[cb]=function(p){if(done)return;done=true;clean();resolve(p);};s.onerror=function(){if(done)return;done=true;clean();reject(new Error('讀取正式主庫 script 失敗'));};s.src=url;document.head.appendChild(s);});}
  function cell(c){if(!c)return '';if(c.f!=null&&txt(c.f)!=='')return c.f;if(c.v!=null)return c.v;return '';}
  function table(p){
    if(!p||p.status==='error') throw new Error('Google Sheets 回傳錯誤');
    var tb=p.table||{}, cols=tb.cols||[], rows=tb.rows||[];
    var h=cols.map(function(c){return txt(c.label||c.id);}), start=0;
    if(!h.length || h.every(function(x){return !x || /^[A-Z]+$/.test(x);})){
      h=((rows[0]&&rows[0].c)||[]).map(cell).map(txt); start=1;
    }
    if(rows.length){
      var first=(rows[0].c||[]).map(cell).map(txt);
      if(h.length && h.every(function(x,i){return first[i]===x;})) start=1;
    }
    return rows.slice(start).map(function(r,ri){
      var o={__列號:ri+start+1};
      (r.c||[]).forEach(function(c,i){ if(h[i]) o[h[i]]=cell(c); });
      return o;
    }).filter(function(o){
      return Object.keys(o).some(function(k){ return k!=='__列號' && txt(o[k])!==''; });
    });
  }
  function readSheet(sheet){var g=gviz(sheet);return jsonp(g.url,g.cb).then(table);}
  function readProducts(){if(productCache)return Promise.resolve(productCache);return Promise.all([readSheet('02_產品主檔'),readSheet('06_照片資料庫').catch(function(){return[];})]).then(function(all){var photos={};all[1].forEach(function(r){if(pick(r,['啟用'])==='否')return;var type=pick(r,['類型','照片類型','分類']);if(type&&type.indexOf('產品')<0)return;var k=norm(pick(r,['關聯編號','對應主鍵','產品編號','名稱']));var u=thumb(pick(r,['照片網址','縮圖網址'])||pick(r,['Drive檔案ID','Google檔案ID','檔案ID']),'w900');if(k&&u)photos[k]=u;});productCache=all[0].filter(function(r){return pick(r,['啟用'])!=='否';}).map(function(r){var code=pick(r,['產品編號','品號','料號']),cust=pick(r,['客戶品號','客戶料號']),name=pick(r,['品名','產品名稱']);var u=photos[norm(code)]||photos[norm(cust)]||photos[norm(name)]||'';return{產品編號:code,客戶品號:cust,品名:name,分類:pick(r,['分類']),標準工時_秒:pick(r,['標準工時_秒']),標準產能:pick(r,['8小時標準產能','標準產能']),啟用:pick(r,['啟用'])||'是',產品照片網址:u,產品縮圖網址:u};}).filter(function(p){return p.產品編號||p.客戶品號||p.品名;});return productCache;});}
  function cleanName(n){return typeof window.cleanProductName==='function'?cleanProductName(n):txt(n);}
  function productKey(p){return (p.產品編號||'')+'|'+(p.品名||'');}
  function productMap(){var map={};((window.DB&&DB.products)||[]).forEach(function(p){map[productKey(p)]=p;});((window.DB&&DB.workstationGroups)||[]).forEach(function(g){var k=productKey(g);if(!map[k])map[k]=g;else{map[k].產品縮圖網址=map[k].產品縮圖網址||g.產品縮圖網址||g.產品照片網址;map[k].產品照片網址=map[k].產品照片網址||g.產品照片網址||g.產品縮圖網址;}});return map;}
  function rebuildProducts(){if(!window.DB||typeof window.buildProductGrid!=='function')return;var grid=$('productGrid');if(!grid)return;var map=productMap(),keys=Object.keys(map);if(!keys.length)return;grid.innerHTML=keys.sort(function(a,b){return txt(map[a].品名).localeCompare(txt(map[b].品名),'zh-Hant');}).map(function(k){var p=map[k],u=p.產品縮圖網址||p.產品照片網址||'',search=[p.產品編號,p.客戶品號,p.品名].join(' ').toUpperCase();return '<div class="product-card ripple" data-key="'+esc(k)+'" data-search="'+esc(search)+'" onclick="selectProduct(decodeURIComponent(\''+encodeURIComponent(k)+'\'))"><div class="product-thumb">'+(u?'<img src="'+esc(u)+'" onerror="this.parentElement.innerHTML=\'<span>📦</span>\'">':'<span>📦</span>')+'</div><div class="product-name">'+esc(cleanName(p.品名))+'</div><div class="product-code">'+esc(p.產品編號||'')+(p.客戶品號?'<br><span style="font-size:11px;color:#5f6368">'+esc(p.客戶品號)+'</span>':'')+'</div></div>';}).join('');}
  function noZero(){var t=$('totalQty'),n=$('ngQty');if(t&&t.value==='0')t.value='';if(n&&n.value==='0')n.value='';if(t)t.placeholder='請輸入今日共做數，不預設 0';if(n)n.placeholder='不良數可留空，不預設 0';}
  function install(){
    if(typeof window.callBackend==='function'){
      window.reloadData=function(){if(typeof showLoading==='function')showLoading(true);callBackend('取得報工作業v2初始資料',null,function(data){try{if(typeof V4資料對接_標準化初始資料_==='function')data=V4資料對接_標準化初始資料_(data||{});}catch(e){}if(!data||data.成功===false){if(typeof showLoading==='function')showLoading(false);if(typeof roar==='function')roar('❌','正式主庫讀取失敗 / Formal DB Load Failed',(data&&data.訊息)||'請檢查正式主庫與直讀橋','error');return;}readProducts().then(function(products){data.產品清單=products;if(typeof window.onDataLoaded==='function')window.onDataLoaded(data);if(window.DB){DB.products=products;DB.counts=DB.counts||{};DB.counts.產品=products.length;}rebuildProducts();noZero();}).catch(function(){if(typeof window.onDataLoaded==='function')window.onDataLoaded(data);noZero();});},function(err){if(typeof showLoading==='function')showLoading(false);if(typeof roar==='function')roar('❌','讀取失敗 / Load Failed',(err&&err.message)||String(err),'error');});};
    }
    if(typeof window.onDataLoaded==='function'&&!window.onDataLoaded.__v441){var old=window.onDataLoaded;window.onDataLoaded=function(data){data=data||{};var r=old.call(this,data);if(data.產品清單&&window.DB){DB.products=data.產品清單;DB.counts=DB.counts||{};DB.counts.產品=data.產品清單.length;}setTimeout(function(){rebuildProducts();noZero();},80);return r;};window.onDataLoaded.__v441=true;}
    if(typeof window.filterProducts==='function'&&!window.filterProducts.__v441){window.filterProducts=function(){var kw=txt(($('productSearch')||{}).value).toUpperCase(),any=false;document.querySelectorAll('.product-card').forEach(function(c){var s=(c.getAttribute('data-search')||c.getAttribute('data-key')||'').toUpperCase();if(!kw||s.indexOf(kw)>=0){c.classList.remove('hidden');any=true;}else c.classList.add('hidden');});var e=$('productGridEmpty');if(e)e.classList.toggle('hidden',any);};window.filterProducts.__v441=true;}
    if(typeof window.selectProduct==='function'&&!window.selectProduct.__v441){window.selectProduct=function(key){if(!window.DB||!window.STATE)return;document.querySelectorAll('.product-card').forEach(function(c){c.classList.remove('selected');});var safe=(window.CSS&&CSS.escape)?CSS.escape(key):String(key).replace(/\\/g,'\\\\').replace(/"/g,'\\"');var card=document.querySelector('.product-card[data-key="'+safe+'"]');if(card)card.classList.add('selected');var parts=String(key||'').split('|'),pid=parts[0]||'',pname=parts.slice(1).join('|')||'',map=productMap(),p=map[key]||{產品編號:pid,品名:pname};STATE.productGroupList=(DB.workstationGroups||[]).filter(function(g){return(pid&&g.產品編號===pid)||(p.客戶品號&&g.客戶品號===p.客戶品號)||(pname&&g.品名===pname);});STATE.currentProductGroup=STATE.productGroupList[0]||p;if(typeof setVal==='function'){setVal('productCode',p.產品編號||pid);setVal('productName',cleanName(p.品名||pname));}if(typeof showProductPhoto==='function')showProductPhoto(STATE.currentProductGroup);if(typeof buildWorkstationSelect==='function')buildWorkstationSelect();var area=$('selectedProductArea');if(area)area.classList.remove('hidden');if(!STATE.productGroupList.length&&typeof roar==='function')roar('⚠️','產品已載入但無途程','請補 08_工站途程機台主檔後再報工','warning');else if(typeof roar==='function')roar('📦','已選定產品 / Product Selected',(p.品名||pname)+'（'+(p.產品編號||pid)+'）','success');if(typeof updatePreview==='function')updatePreview();if(typeof updateConfirmSummary==='function')updateConfirmSummary();};window.selectProduct.__v441=true;}
    noZero();
  }
  function boot(){var end=Date.now()+12000,t=setInterval(function(){install();if(Date.now()>end)clearInterval(t);},250);install();readProducts().then(function(products){if(window.DB){DB.products=products;DB.counts=DB.counts||{};DB.counts.產品=products.length;rebuildProducts();}}).catch(function(e){try{console.warn('產品主檔補讀失敗',e);}catch(_){}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',function(){setTimeout(noZero,500);setTimeout(noZero,1200);});
  console.log('V4 final formal fixer loaded',VER);
})();