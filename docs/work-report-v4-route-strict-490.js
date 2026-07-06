/* 報工作業 V4 路由機台嚴格規則 v4.9.0
 * 核心鎖定：08_工站途程機台主檔 = 產品途程資料。
 * 禁止用工站能力總機台清單亂補。
 * 必須依：產品 / 品名 → 工站 → 工序 OP → 機台清單。
 */
(function(){
'use strict';
var MOVE_LIMIT=12;
function E(id){return document.getElementById(id)}
function S(v){return String(v==null?'':v).trim()}
function N(v){var x=Number(S(v).replace(/,/g,''));return isFinite(x)?x:0}
function H(s){return S(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function K(s){return S(s).toUpperCase().replace(/\s+/g,' ').replace(/[＿_－—–]/g,'-').trim()}
function cleanName(s){return K(s).replace(/^[-/：；（）$@「」。，、？！._—|～《》¥\[\]{}#%^*+=·\s]+/,'').replace(/[-/：；（）$@「」。，、？！._—|～《》¥\[\]{}#%^*+=·\s]+$/,'')}
function center(el){setTimeout(function(){try{el&&el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});el&&el.classList.add('v490-pop');setTimeout(function(){el&&el.classList.remove('v490-pop')},620)}catch(e){}},80)}
function toast(t,m,type){if(window.v4Toast)window.v4Toast(t,m,type||'success')}
function installCSS(){
  if(E('v490RouteCss'))return;
  var s=document.createElement('style');s.id='v490RouteCss';
  s.textContent=[
    'html,body{overflow-x:hidden!important;max-width:100vw!important}',
    '.person-card,.product-card,.machine-card{position:relative!important;overflow:hidden!important;padding:0!important;border-radius:18px!important;touch-action:pan-y!important;-webkit-tap-highlight-color:transparent!important}',
    '.person-card .card-photo,.product-card .card-photo,.machine-card .card-photo{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:0!important;margin:0!important;background:rgba(255,255,255,.035)!important}',
    '.person-card img,.product-card img,.machine-card img,.card-photo img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important;border-radius:0!important;display:block!important}',
    '.person-card .card-overlay,.product-card .card-overlay,.machine-card .card-overlay{position:absolute!important;left:0!important;right:0!important;bottom:0!important;z-index:3!important;padding:34px 7px 8px!important;text-align:center!important;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.88))!important;color:#fff!important}',
    '.ov-name,.ov-code{color:#fff!important;text-shadow:0 2px 5px rgba(0,0,0,.86)!important;font-weight:1000!important}',
    '.ov-name{font-size:12px!important;line-height:1.18!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}',
    '.ov-code{display:inline-block!important;margin-top:3px!important;padding:2px 7px!important;border-radius:999px!important;background:rgba(0,0,0,.48)!important;color:#dbeafe!important;font-size:9px!important}',
    '.card-fallback{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;font-size:28px!important;color:rgba(255,255,255,.26)!important;background:linear-gradient(160deg,rgba(255,255,255,.055),rgba(255,255,255,.025))!important}',
    '.machine-card .card-fallback{font-size:22px!important}',
    '.selected-box,.selected-product,#routeFieldsArea{scroll-margin-top:160px!important}',
    '.v490-pop{animation:v490pop .62s cubic-bezier(.34,1.56,.64,1)!important;box-shadow:0 0 0 2px rgba(77,163,255,.22),0 0 36px rgba(77,163,255,.28)!important}',
    '@keyframes v490pop{0%{transform:scale(.96);opacity:.66}45%{transform:scale(1.025);opacity:1}100%{transform:scale(1);opacity:1}}',
    '.v490-route-warn{margin:8px 0;padding:10px 11px;border-radius:16px;background:rgba(245,184,66,.10);border:1px solid rgba(245,184,66,.26);color:#ffd889;font-size:12px;font-weight:900;line-height:1.45}',
    '.v490-route-note{margin-top:6px;font-size:10px;color:#9fb2cd;font-weight:800;line-height:1.4}',
    '.scan-modal-inner{position:relative!important;overflow:hidden!important}',
    '.scan-modal-inner:before{content:"";position:absolute;left:18%;right:18%;top:24%;height:2px;background:#3dd68c;box-shadow:0 0 18px #3dd68c;z-index:3;animation:v490scan 1.45s linear infinite}',
    '@keyframes v490scan{0%{top:24%}50%{top:70%}100%{top:24%}}',
    '.scan-hint{font-size:12px!important;line-height:1.45!important;color:#dbeafe!important}',
    '@media(max-width:430px){.person-card{min-height:140px!important}.product-card{min-height:122px!important}.machine-card{min-height:105px!important}.ov-name{font-size:11px!important}.machine-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}'
  ].join('');
  document.head.appendChild(s);
}
function getDb(){return (window.V4_STATE&&window.V4_STATE.db)||{}}
function machineMaster(){var db=getDb(),m={};(db.機台||db.machines||[]).forEach(function(x){var id=S(x.機台編號||x.主機台||x.設備編號);if(id)m[id]=x});return m}
function normalizeMachineList(route){
  route=route||{};var M=machineMaster();var list=[];
  if(Array.isArray(route.機台清單))list=route.機台清單.slice();
  else if(Array.isArray(route.機台編號清單))list=route.機台編號清單.map(function(id){return {機台編號:S(id)}});
  else{
    var raw=S(route.機台清單||route.機台編號清單||route.機台編號||'');
    list=raw.split(/[、,，;；\s]+/).map(function(id){return {機台編號:S(id)}}).filter(function(x){return x.機台編號});
  }
  var seen={};
  return list.map(function(m){var id=S(m.機台編號||m.主機台||m.設備編號||m);if(!id||seen[id])return null;seen[id]=1;var mm=M[id]||{};var u=S(m.照片網址||m.縮圖網址||mm.照片網址||mm.縮圖網址);return Object.assign({},mm,typeof m==='object'?m:{},{機台編號:id,主機台:id,機台名稱:S(m.機台名稱||m.設備名稱||mm.機台名稱||mm.設備名稱||('機台'+id)),設備名稱:S(m.設備名稱||m.機台名稱||mm.設備名稱||mm.機台名稱||('機台'+id)),區域:S(m.區域||mm.區域),機台型號:S(m.機台型號||m.型號||mm.機台型號||mm.型號),照片網址:u,縮圖網址:u})}).filter(Boolean)
}
function routeStation(r){return S(r.報工工站名稱||r.工站名稱||r.工站||r.工序名稱)}
function routeProc(r){return S(r.工序範圍||r.工序||r.工序編號_最終||r.工序編號||r.OP||r.作業順序)}
function routesForProduct(product){
  var db=getDb();var all=(db.routes||db.報工工站群組||db.途程工站群組||[]).slice();
  var pid=S(product&&product.產品編號), pname=cleanName(product&&product.品名), cust=K(product&&product.客戶品號);
  function valid(r){return routeStation(r)&&routeProc(r)&&normalizeMachineList(r).length>=0}
  var exact=all.filter(function(r){return S(r.產品編號)===pid&&(!S(r.品名)||cleanName(r.品名)===pname)&&valid(r)});
  if(exact.length)return exact.map(fixRoute);
  var byPid=all.filter(function(r){return S(r.產品編號)===pid&&valid(r)});
  if(byPid.length)return byPid.map(fixRoute);
  var byName=all.filter(function(r){return cleanName(r.品名)===pname&&valid(r)});
  if(byName.length)return byName.map(fixRoute);
  var byCust=cust?all.filter(function(r){return K(r.客戶品號||r.客戶料號)===cust&&valid(r)}):[];
  return byCust.map(fixRoute);
}
function fixRoute(r){var ms=normalizeMachineList(r);var st=routeStation(r),op=routeProc(r);return Object.assign({},r,{報工工站名稱:st,工站名稱:st,工序範圍:op,工序:op,機台清單:ms,機台編號清單:ms.map(function(m){return m.機台編號}),機台編號:ms.map(function(m){return m.機台編號}).join('、'),主機台:ms[0]?ms[0].機台編號:'',顯示名稱:[st,op,ms.map(function(m){return m.機台編號}).join('、')].filter(Boolean).join('｜')})}
function photo(url,icon){return S(url).startsWith('http')?'<img src="'+H(url)+'" loading="lazy" onerror="this.outerHTML=\'<div class=card-fallback>'+icon+'</div>\'">':'<div class="card-fallback">'+icon+'</div>'}
function patchSelectPerson(){
  if(window.__V490_PERSON__)return;var old=window.selectPerson;if(typeof old!=='function')return;window.__V490_PERSON__=true;
  window.selectPerson=function(){var r=old.apply(this,arguments);setTimeout(function(){center(E('selectedPersonArea'));if(window.V4Overtime489&&window.V4Overtime489.mount)window.V4Overtime489.mount()},80);return r}
}
function selectProductStrict(pid){
  var db=getDb();var p=((db.產品||db.products||[]).find(function(x){return S(x.產品編號)===S(pid)}));if(!p)return;
  window.V4_STATE.product=p;window.V4_STATE.route=null;window.V4_STATE.machine=null;
  E('selectedProductArea')&&E('selectedProductArea').classList.remove('hidden');
  if(E('selectedProductName'))E('selectedProductName').textContent=S(p.品名);
  if(E('selectedProductCode'))E('selectedProductCode').textContent=S(p.產品編號);
  if(E('selectedProductThumb'))E('selectedProductThumb').innerHTML=photo(p.照片網址||p.縮圖網址,'📦');
  if(E('productCode'))E('productCode').value=S(p.產品編號);
  if(E('productName'))E('productName').value=S(p.品名);
  if(typeof window.renderProducts==='function')window.renderProducts();
  renderRoutesStrict();
  center(E('selectedProductArea'));
}
function renderRoutesStrict(){
  var p=window.V4_STATE&&window.V4_STATE.product,sel=E('workstationSelect');if(!p||!sel)return;
  var routes=routesForProduct(p);window._routesView=routes;
  if(!routes.length){
    sel.innerHTML='<option value="">此產品尚未建立 08 途程工站</option>';clearRouteFieldsStrict();
    var box=E('selectedProductArea');if(box&&!E('v490NoRoute')){var d=document.createElement('div');d.id='v490NoRoute';d.className='v490-route-warn';d.textContent='找不到此產品在 08_工站途程機台主檔 的途程資料，不能用工站能力總機台清單亂補。請建立：產品/品名 → 工站 → 工序 OP → 機台清單。';sel.parentElement.insertAdjacentElement('afterend',d)}
    toast('此產品沒有可選工站','請檢查 08_工站途程機台主檔：產品 / 品名 → 工站 → 工序 OP → 機台清單','warn');return;
  }
  var warn=E('v490NoRoute');if(warn)warn.remove();
  sel.innerHTML='<option value="">請選擇工站（依 08_工站途程機台主檔）</option>'+routes.map(function(r,i){return '<option value="'+i+'">'+H(routeStation(r))+'｜'+H(routeProc(r))+'｜機台 '+H((r.機台清單||[]).map(function(m){return m.機台編號}).join('、'))+'</option>'}).join('');
  clearRouteFieldsStrict();
  center(sel.parentElement||sel);
}
function clearRouteFieldsStrict(){
  if(E('routeFieldsArea'))E('routeFieldsArea').classList.add('hidden');
  ['processRange','stdCapacity','stdTimeSec'].forEach(function(id){if(E(id))E(id).value=''});
  if(E('mainMachineSelect'))E('mainMachineSelect').innerHTML='';
  if(E('machineListGrid'))E('machineListGrid').innerHTML='';
  if(window.V4Rules&&window.V4Rules.syncVisibility)window.V4Rules.syncVisibility();
}
function selectRouteStrict(v){
  var r=(window._routesView||[])[Number(v)];if(!r){window.V4_STATE.route=null;clearRouteFieldsStrict();return}
  r=fixRoute(r);window.V4_STATE.route=r;var ms=r.機台清單||[];
  if(E('routeFieldsArea'))E('routeFieldsArea').classList.remove('hidden');
  if(E('processRange'))E('processRange').value=routeProc(r);
  if(E('stdCapacity'))E('stdCapacity').value=S(r['標準產能']||r['8H產能']||r['工站8H產能_件']||r['8小時標準產能']);
  if(E('stdTimeSec'))E('stdTimeSec').value=S(r['標準工時_秒']||r['標準工時(秒)']);
  if(E('mainMachineSelect'))E('mainMachineSelect').innerHTML=ms.length?ms.map(function(m){return '<option value="'+H(m.機台編號)+'">'+H(m.機台編號)+'｜'+H(m.機台名稱||m.設備名稱||'')+'</option>'}).join(''):'<option value="">08 途程未設定機台清單</option>';
  renderMachinesStrict(ms);if(ms[0])selectMachineStrict(ms[0].機台編號);
  if(window.V4Rules&&window.V4Rules.syncVisibility)window.V4Rules.syncVisibility();
  center(E('routeFieldsArea'));
}
function renderMachinesStrict(ms){
  var grid=E('machineListGrid');if(!grid)return;
  grid.innerHTML=(ms||[]).map(function(m){var selected=window.V4_STATE.machine&&window.V4_STATE.machine.機台編號===m.機台編號;return '<div class="machine-card '+(selected?'selected':'')+'" onclick="selectMachineById(\''+H(m.機台編號)+'\')"><div class="card-photo">'+photo(m.照片網址||m.縮圖網址,'⚙️')+'</div><div class="card-overlay"><div class="ov-name">'+H(m.機台編號)+'</div><div class="ov-code">'+H(m.機台名稱||m.設備名稱||('機台'+m.機台編號))+'</div></div></div>'}).join('')||'<div class="v490-route-warn">此工站在 08_工站途程機台主檔 沒有機台清單，不能改用其他工站能力清單補機台。</div>';
  if(window.guardGrid)window.guardGrid('machineListGrid')
}
function selectMachineStrict(id){var ms=(window.V4_STATE.route&&window.V4_STATE.route.機台清單)||[];var m=ms.find(function(x){return S(x.機台編號)===S(id)})||ms[0]||{};window.V4_STATE.machine=m;if(E('mainMachineSelect'))E('mainMachineSelect').value=S(m.機台編號);renderMachinesStrict(ms)}
function patchRoute(){
  window.selectProduct=selectProductStrict;window.renderRoutes=renderRoutesStrict;window.selectRouteByIndex=selectRouteStrict;window.renderMachines=renderMachinesStrict;window.selectMachineById=selectMachineStrict;
  var ws=E('workstationSelect');if(ws)ws.onchange=function(){selectRouteStrict(this.value)};
  var mm=E('mainMachineSelect');if(mm)mm.onchange=function(){selectMachineStrict(this.value)};
}
function patchTouch(){
  if(window.__V490_TOUCH__)return;window.__V490_TOUCH__=true;var t={};
  document.addEventListener('pointerdown',function(e){var c=e.target.closest&&e.target.closest('.person-card,.product-card,.machine-card');if(!c)return;t={el:c,x:e.clientX,y:e.clientY,moved:false};},true);
  document.addEventListener('pointermove',function(e){if(!t.el)return;if(Math.abs(e.clientX-t.x)>MOVE_LIMIT||Math.abs(e.clientY-t.y)>MOVE_LIMIT){t.moved=true;t.el.dataset.v490Moved='1'}},true);
  document.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('.person-card,.product-card,.machine-card');if(!c)return;if(t.moved||c.dataset.v490Moved==='1'){e.preventDefault();e.stopImmediatePropagation();setTimeout(function(){delete c.dataset.v490Moved},120);t={};return false}},true);
}
async function openScanAuto(kind){
  var target=kind==='product'?'productSearch':'personSearch';var video=E('scanVideo'),modal=E('scanModal'),hint=E('scanHint');
  if(!video||!modal){E(target)&&E(target).focus();return}
  if(!('BarcodeDetector' in window)){toast('掃描器不支援自動偵測','此瀏覽器不支援 BarcodeDetector，請手動輸入或使用實體掃碼槍','warn');E(target)&&E(target).focus();return}
  try{
    modal.classList.remove('hidden');if(hint)hint.textContent='📷 自動偵測中：請將條碼 / QR Code 對準框內';
    var stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});video.srcObject=stream;
    var formats=await BarcodeDetector.getSupportedFormats().catch(function(){return ['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e','itf']});
    var detector=new BarcodeDetector({formats:formats});
    var timer=setInterval(async function(){try{var codes=await detector.detect(video);if(codes&&codes[0]){var val=S(codes[0].rawValue);if(!val)return;clearInterval(timer);stream.getTracks().forEach(function(x){x.stop()});modal.classList.add('hidden');if(kind==='product')applyProductScan(val);else applyPersonScan(val)}}catch(e){}},260);
    window.closeScanModal=function(){modal.classList.add('hidden');clearInterval(timer);stream.getTracks().forEach(function(x){x.stop()})}
  }catch(e){toast('無法啟用相機','請確認相機權限，或改用手動輸入 / 實體掃碼槍','error');E(target)&&E(target).focus()}
}
function applyPersonScan(val){var db=getDb();var p=(db.人員||db.people||[]).find(function(x){return K(x.工號)===K(val)||K(x.姓名)===K(val)})||(db.人員||[]).find(function(x){return K(x.工號).indexOf(K(val))>=0});if(p&&window.selectPerson){window._peopleView=[p];window.selectPerson(0,p.工號);toast('掃描成功 / Scanned',p.姓名+'｜'+p.工號,'success')}else{if(E('personSearch')){E('personSearch').value=val;if(window.renderPeople)window.renderPeople()}toast('掃描完成，但未直接匹配人員',val,'warn')}}
function applyProductScan(val){var db=getDb();var p=(db.產品||db.products||[]).find(function(x){return K(x.產品編號)===K(val)||K(x.客戶品號)===K(val)||cleanName(x.品名)===cleanName(val)});if(p){selectProductStrict(p.產品編號);toast('掃描成功 / Scanned',p.品名+'｜'+p.產品編號,'success')}else{if(E('productSearch')){E('productSearch').value=val;if(window.renderProducts)window.renderProducts()}toast('掃描完成，但未直接匹配產品',val,'warn')}}
function patchScanner(){window.scanPersonBadge=function(){openScanAuto('person')};window.scanProductBarcode=function(){openScanAuto('product')}}
function boot(){installCSS();patchTouch();patchSelectPerson();patchRoute();patchScanner();if(window.V4_STATE&&window.V4_STATE.product)renderRoutesStrict()}
window.V4RouteStrict490={boot:boot,routesForProduct:routesForProduct,renderRoutesStrict:renderRoutesStrict,selectProductStrict:selectProductStrict,selectRouteStrict:selectRouteStrict};
document.addEventListener('DOMContentLoaded',boot);setTimeout(boot,100);setTimeout(boot,800);setInterval(function(){patchSelectPerson();patchRoute();patchScanner()},1200);
})();
