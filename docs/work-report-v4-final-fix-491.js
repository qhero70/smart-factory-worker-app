/* 報工作業 V4 最終修正 v4.9.1
 * 只修 PWA 前端：
 * 1) 選定人員 / 選定產品 / 選定工站自動滑到畫面中間
 * 2) 05_不良代碼主檔中文+英文合併帶入
 * 3) 人員 / 產品 / 機台照片補強，支援 06_照片資料庫與 Google Drive 縮圖
 * 4) 拍照 / 選圖立即預覽
 * 5) 不動 GAS、不動送出 API、不動資料庫欄位
 */
(function(){
'use strict';
var MAX_PHOTOS=12;
function E(id){return document.getElementById(id)}
function S(v){return String(v==null?'':v).trim()}
function N(v){var x=Number(S(v).replace(/,/g,''));return isFinite(x)?x:0}
function H(s){return S(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function K(s){return S(s).toUpperCase().replace(/\s+/g,' ').replace(/[＿_－—–]/g,'-').trim()}
function toast(t,m,type){if(window.v4Toast)window.v4Toast(t,m,type||'success')}
function arr(x){return Array.isArray(x)?x:[]}
function pick(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var k=ks[i];if(o[k]!=null&&S(o[k])!=='')return S(o[k])}return''}
function stem(v){v=S(v).split('/').pop().split('?')[0];return v.replace(/\.(jpg|jpeg|png|webp|gif)$/i,'')}
function driveId(u){u=S(u);var m=u.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/);if(m)return m[1];m=u.match(/[?&]id=([A-Za-z0-9_-]{20,})/);if(m)return m[1];m=u.match(/\/d\/([A-Za-z0-9_-]{20,})/);if(m)return m[1];if(/^[A-Za-z0-9_-]{25,}$/.test(u))return u;return''}
function photoUrl(u){u=S(u);if(!u)return'';var id=driveId(u);if(id)return 'https://drive.google.com/thumbnail?id='+id+'&sz=w800';return /^https?:\/\//i.test(u)?u:''}
function photoType(t){t=K(t);if(t.indexOf('人')>=0||t.indexOf('PERSON')>=0||t.indexOf('STAFF')>=0||t.indexOf('OPERATOR')>=0)return'人員';if(t.indexOf('產')>=0||t.indexOf('品')>=0||t.indexOf('PRODUCT')>=0)return'產品';if(t.indexOf('機')>=0||t.indexOf('設備')>=0||t.indexOf('MACHINE')>=0||t.indexOf('EQUIPMENT')>=0)return'機台';return''}
function addPhoto(map,type,key,url){key=S(key);url=photoUrl(url);if(!key||!url)return;map.any[key]=map.any[key]||url;if(type&&map[type])map[type][key]=map[type][key]||url}
function buildPhotoMap(db){var rows=[];['photos','照片','照片資料庫','照片主檔','照片清單','06_照片資料庫'].forEach(function(k){rows=rows.concat(arr(db&&db[k]))});
  var map={人員:{},產品:{},機台:{},any:{}};
  rows.forEach(function(r){
    var vals=Object.values(r||{}).map(S);
    var type=photoType(pick(r,['類型','照片類型','分類','資料夾','目錄','照片主鍵'])||vals[0]||'');
    var filename=pick(r,['檔名','檔案名稱','文件名稱','File Name','filename'])||vals.find(function(x){return /\.(jpg|jpeg|png|webp|gif)$/i.test(x)})||'';
    var id=pick(r,['對應ID','對應編號','對應代碼','工號','產品編號','客戶品號','機台編號','主機台','編號','ID','代碼'])||stem(filename)||vals[1]||'';
    var url=pick(r,['縮圖網址','照片網址','圖片網址','檔案網址','網址','URL','url','連結','共享連結'])||vals.find(function(x){return /^https?:\/\//i.test(x)||driveId(x)})||'';
    addPhoto(map,type,id,url);addPhoto(map,type,stem(filename),url);
  });
  return map;
}
function defectRows(db){
  var src=[];var d=db&&db.不良原因;
  if(Array.isArray(d))src=src.concat(d);
  else if(d&&typeof d==='object')src=src.concat(arr(d.Z),arr(d.Y),arr(d.Z類),arr(d.Y類));
  src=src.concat(arr(db&&db.defects),arr(db&&db.不良代碼),arr(db&&db.不良代碼主檔),arr(db&&db['05_不良代碼主檔']));
  var seen={},out=[];
  src.forEach(function(r){
    if(!r||typeof r!=='object')return;
    if(pick(r,['啟用','是否啟用','狀態'])==='否')return;
    var code=pick(r,['不良代碼','代碼','Code','CODE','不良代號']);
    var name=pick(r,['不良名稱','名稱','不良原因','中文名稱','Reason']);
    if(!code&&!name)return;
    code=code||name;
    if(seen[code])return;seen[code]=1;
    var cat=(pick(r,['分類','類別','不良分類'])||S(code).slice(0,1)||'Z').toUpperCase();
    out.push({代碼:code,名稱:name||code,英文名稱:pick(r,['英文名稱','英文','English','英文說明','English Name']),責任歸屬:pick(r,['責任歸屬','責任']),分類:cat,啟用:'是'});
  });
  return out;
}
function normalizeMachineId(v){return S(v).replace(/\.0$/,'')}
function splitIds(v){return S(v).split(/[、,，;；/\s]+/).map(normalizeMachineId).filter(Boolean).filter(function(x,i,a){return a.indexOf(x)===i})}
function normalizeDb(db){
  db=db||{};var ph=buildPhotoMap(db);
  var people=arr(db.人員||db.people).map(function(p){var id=pick(p,['工號','員工編號','Employee ID','employeeId']);var url=photoUrl(pick(p,['照片網址','縮圖網址','圖片網址','URL']))||ph.人員[id]||ph.any[id]||ph.人員[stem(id)]||'';return Object.assign({},p,{工號:id,姓名:pick(p,['姓名','Name','operatorName'])||p.姓名,班別:pick(p,['班別','班別名稱','shift'])||'早班',啟用:pick(p,['啟用','是否啟用'])||'是',照片網址:url,縮圖網址:url})}).filter(function(p){return (p.工號||p.姓名)&&p.啟用!=='否'});
  var products=arr(db.產品||db.products).map(function(p){var id=pick(p,['產品編號','料號','productCode']);var cust=pick(p,['客戶品號','客戶料號','customerPartNo']);var url=photoUrl(pick(p,['照片網址','縮圖網址','產品照片網址','產品縮圖網址','圖片網址','URL']))||ph.產品[id]||ph.產品[cust]||ph.any[id]||ph.any[cust]||'';return Object.assign({},p,{產品編號:id,客戶品號:cust,品名:pick(p,['品名','產品名稱','productName'])||p.品名,照片網址:url,縮圖網址:url,產品照片網址:url,產品縮圖網址:url})}).filter(function(p){return p.產品編號||p.品名});
  var P={};products.forEach(function(p){if(p.產品編號)P[p.產品編號]=p});
  var machines=arr(db.機台||db.machines).map(function(m){var id=normalizeMachineId(pick(m,['機台編號','主機台','設備編號','machineId']));var url=photoUrl(pick(m,['照片網址','縮圖網址','機台照片網址','圖片網址','URL']))||ph.機台[id]||ph.any[id]||'';var name=pick(m,['機台名稱','設備名稱','名稱'])||('機台'+id);return Object.assign({},m,{機台編號:id,主機台:id,機台名稱:name,設備名稱:name,照片網址:url,縮圖網址:url})}).filter(function(m){return m.機台編號});
  var M={};machines.forEach(function(m){M[m.機台編號]=m});
  var routes=arr(db.routes||db.報工工站群組||db.途程工站群組).map(function(r){
    var pid=pick(r,['產品編號','料號','productCode']);var p=P[pid]||{};var station=pick(r,['報工工站名稱','工站名稱','工站','工序名稱','workstationName']);if(!station)return null;
    var proc=pick(r,['工序範圍','工序編號_最終','工序編號','工序','OP','作業順序','processRange']);
    var ids=[];if(Array.isArray(r.機台清單))ids=r.機台清單.map(function(m){return normalizeMachineId(m.機台編號||m.主機台||m)});else ids=splitIds(pick(r,['機台清單','機台編號清單','可選機台','可用機台','機台列表']));
    if(!ids.length)ids=splitIds(pick(r,['機台編號','主機台','主機台編號','設備編號']));
    var ms=ids.map(function(id){var base=M[id]||{};var original=Array.isArray(r.機台清單)?arr(r.機台清單).find(function(x){return normalizeMachineId(x.機台編號||x.主機台||x)===id})||{}:{};var u=photoUrl(original.照片網址||original.縮圖網址||base.照片網址||base.縮圖網址)||ph.機台[id]||ph.any[id]||'';return Object.assign({},base,original,{機台編號:id,主機台:id,機台名稱:original.機台名稱||original.設備名稱||base.機台名稱||base.設備名稱||('機台'+id),設備名稱:original.設備名稱||original.機台名稱||base.設備名稱||base.機台名稱||('機台'+id),照片網址:u,縮圖網址:u})});
    var pu=photoUrl(r.產品照片網址||r.產品縮圖網址||p.照片網址||p.縮圖網址)||ph.產品[pid]||ph.any[pid]||'';if(p&&pid&&!p.照片網址&&pu){p.照片網址=pu;p.縮圖網址=pu;p.產品照片網址=pu;p.產品縮圖網址=pu}
    return Object.assign({},r,{產品編號:pid,客戶品號:pick(r,['客戶品號','客戶料號'])||p.客戶品號||'',品名:pick(r,['品名','產品名稱'])||p.品名||'',報工工站名稱:station,工站名稱:station,工序範圍:proc,工序:proc,機台清單:ms,機台編號清單:ms.map(function(m){return m.機台編號}),機台編號:ms.map(function(m){return m.機台編號}).join('、'),主機台:ms[0]?ms[0].機台編號:'',產品照片網址:pu,產品縮圖網址:pu,顯示名稱:[station,proc,ms.map(function(m){return m.機台編號}).join('、')].filter(Boolean).join('｜')})
  }).filter(Boolean);
  var defects=defectRows(db);var dz={Z:[],Y:[]};defects.forEach(function(d){var c=(d.分類||S(d.代碼).slice(0,1)||'Z').toUpperCase();if(!dz[c])dz[c]=[];dz[c].push(d)});
  db.人員=db.people=people;db.產品=db.products=products;db.機台=db.machines=machines;db.報工工站群組=db.routes=routes;db.不良原因=dz;db.defects=defects;db.照片對照=ph;
  db.筆數=Object.assign({},db.筆數||{},{人員:people.length,產品:products.length,機台:machines.length,報工工站群組:routes.length,不良原因:defects.length});
  return db;
}
function patchBridge(){if(!window.V4Bridge||window.__V491_BRIDGE__)return;window.__V491_BRIDGE__=true;var old=window.V4Bridge.loadInit;window.V4Bridge.loadInit=async function(){var db=await old.apply(this,arguments);return normalizeDb(db)}}
function centerElement(el){if(!el)return;[80,260,520].forEach(function(ms){setTimeout(function(){try{var r=el.getBoundingClientRect();var vh=(window.visualViewport&&window.visualViewport.height)||window.innerHeight||640;var y=window.pageYOffset+r.top-Math.max(20,(vh-r.height)/2);window.scrollTo({top:Math.max(0,y),behavior:'smooth'});el.classList.add('v491-pop');setTimeout(function(){el.classList.remove('v491-pop')},700)}catch(e){}},ms)})}
function photoHtml(url,icon){url=photoUrl(url);return url?'<img src="'+H(url)+'" loading="lazy" onerror="this.outerHTML=\'<div class=card-fallback>'+icon+'</div>\'">':'<div class="card-fallback">'+icon+'</div>'}
function patchSelectPerson(){if(window.__V491_PERSON__)return;var old=window.selectPerson;if(typeof old!=='function')return;window.__V491_PERSON__=true;window.selectPerson=function(){var r=old.apply(this,arguments);setTimeout(function(){if(window.V4Overtime489&&window.V4Overtime489.mount)window.V4Overtime489.mount();centerElement(E('selectedPersonArea'))},90);return r}}
function patchSelectProduct(){if(window.__V491_PRODUCT__)return;var old=window.selectProduct;if(typeof old!=='function')return;window.__V491_PRODUCT__=true;window.selectProduct=function(){var r=old.apply(this,arguments);setTimeout(function(){centerElement(E('selectedProductArea'))},120);return r}}
function patchRoute(){if(window.__V491_ROUTE__)return;var old=window.selectRouteByIndex;if(typeof old!=='function')return;window.__V491_ROUTE__=true;window.selectRouteByIndex=function(){var r=old.apply(this,arguments);setTimeout(function(){centerElement(E('routeFieldsArea'))},120);return r}}
function patchDefects(){
  window.V491AllDefects=function(){return defectRows((window.V4_STATE&&window.V4_STATE.db)||{})};
  window.addDefectRow=function(){var list=window.V491AllDefects();var box=E('defectRows');if(!box)return;if(!list.length){box.innerHTML='<div class="v491-warn">⚠ 05_不良代碼主檔尚未帶入資料。請確認主檔欄位包含：不良代碼、中文名稱、英文名稱、啟用。</div>';return}var row=document.createElement('div');row.className='defect-row';var opt=list.map(function(d){var code=S(d.代碼),cat=S(d.分類||code.slice(0,1));return '<option value="'+H(code)+'">'+H(cat+'類 '+code+'｜'+(d.名稱||'')+' / '+(d.英文名稱||'No English name'))+'</option>'}).join('');row.innerHTML='<button class="photo-tool-btn" onclick="this.closest(\'.defect-row\').remove();validateDefects(true)">刪</button><select onchange="validateDefects(true)"><option value="">選擇不良原因 / Select defect reason</option>'+opt+'</select><input class="qty-input" inputmode="numeric" placeholder="數量 / Qty" oninput="validateDefects(true)">';box.appendChild(row);if(window.guardGrid)window.guardGrid('defectRows')};
  window.renderDefectRows=function(){var db=(window.V4_STATE&&window.V4_STATE.db)||{};var list=window.V491AllDefects();window.V4_STATE.defectMap={};list.forEach(function(d){window.V4_STATE.defectMap[d.代碼]=d});var box=E('defectRows');if(box)box.innerHTML='';window.addDefectRow()};
  window.validateDefects=function(silent){var ng=N(E('ngQty')&&E('ngQty').value);var sum=0;document.querySelectorAll('.qty-input').forEach(function(i){sum+=N(i.value)});if(sum>ng){if(!silent)toast('不良分配超過上限 / NG allocation exceeded','分配數量不可超過 Step 3 的不良數','warn');return false}return true};
}
function renderPhotoPreview(){var holder=E('photoPreviewGrid');var count=E('photoCount');if(!holder&&count){holder=document.createElement('div');holder.id='photoPreviewGrid';holder.className='v491-photo-grid';count.insertAdjacentElement('beforebegin',holder)}if(!holder)return;var photos=arr(window.V4_PHOTOS);holder.innerHTML=photos.map(function(p,i){var src=p.previewUrl||p.base64||'';return '<div class="v491-photo-item">'+(src?'<img src="'+H(src)+'">':'<div class="card-fallback">📸</div>')+'<button type="button" onclick="window.removePhotoV491('+i+')">×</button><span>'+H(p.檔案名稱||p.name||('照片 '+(i+1)))+'</span></div>'}).join('');if(count)count.textContent=photos.length+' / 12 張照片 / Photos'}
function readFile(file){return new Promise(function(resolve){var fr=new FileReader();fr.onload=function(e){var data=S(e.target&&e.target.result);resolve({name:file.name,size:file.size,type:file.type,檔案名稱:file.name,MIME類型:file.type,Base64:data.split(',')[1]||'',previewUrl:data,base64:data,備註:''})};fr.onerror=function(){resolve({name:file.name,size:file.size,type:file.type,檔案名稱:file.name,MIME類型:file.type})};fr.readAsDataURL(file)})}
function patchPhotos(){window.V4_PHOTOS=arr(window.V4_PHOTOS);window.takePhoto=function(){var i=E('photoInput');if(!i)return;i.setAttribute('capture','environment');i.click()};window.chooseFile=function(){var i=E('photoInput');if(!i)return;i.removeAttribute('capture');i.click()};window.handleFiles=async function(files){var incoming=Array.from(files||[]);var remain=MAX_PHOTOS-window.V4_PHOTOS.length;if(remain<=0){toast('照片已達上限 / Photo limit','最多 12 張','warn');return}var selected=incoming.slice(0,remain);for(var i=0;i<selected.length;i++){window.V4_PHOTOS.push(await readFile(selected[i]))}renderPhotoPreview()};window.clearPhotos=function(){window.V4_PHOTOS=[];renderPhotoPreview()};window.removePhotoV491=function(i){window.V4_PHOTOS.splice(i,1);renderPhotoPreview()};setTimeout(renderPhotoPreview,200)}
function installCSS(){if(E('v491FinalCss'))return;var s=document.createElement('style');s.id='v491FinalCss';s.textContent=['.v491-pop{animation:v491Pop .7s cubic-bezier(.34,1.56,.64,1)!important;box-shadow:0 0 0 2px rgba(77,163,255,.34),0 0 36px rgba(77,163,255,.32)!important}','@keyframes v491Pop{0%{transform:scale(.96);opacity:.65}45%{transform:scale(1.025);opacity:1}100%{transform:scale(1);opacity:1}}','.v491-photo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px;max-height:260px;overflow:auto}.v491-photo-item{position:relative;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);aspect-ratio:1/1}.v491-photo-item img{width:100%;height:100%;object-fit:cover;display:block}.v491-photo-item button{position:absolute;right:4px;top:4px;width:24px;height:24px;border:0;border-radius:8px;background:rgba(0,0,0,.62);color:#fff;font-weight:1000}.v491-photo-item span{position:absolute;left:0;right:0;bottom:0;padding:3px 5px;background:rgba(0,0,0,.58);color:#fff;font-size:9px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v491-warn{padding:10px;border-radius:14px;background:rgba(245,184,66,.12);border:1px solid rgba(245,184,66,.25);color:#ffd889;font-weight:900;font-size:12px;line-height:1.45}.defect-row select{font-size:12px!important}.selected-box,.selected-product,#routeFieldsArea{scroll-margin-top:190px!important}'].join('');document.head.appendChild(s)}
function boot(){installCSS();patchBridge();patchDefects();patchPhotos();patchSelectPerson();patchSelectProduct();patchRoute();if(window.V4_STATE&&window.V4_STATE.db){window.V4_STATE.db=normalizeDb(window.V4_STATE.db);try{window.renderDefectRows&&window.renderDefectRows();window.renderPeople&&window.renderPeople();window.renderProducts&&window.renderProducts()}catch(e){}}}
window.V4Final491={boot:boot,normalizeDb:normalizeDb,center:centerElement,renderPhotoPreview:renderPhotoPreview};
document.addEventListener('DOMContentLoaded',boot);setTimeout(boot,50);setTimeout(boot,400);setTimeout(boot,1000);setInterval(function(){patchBridge();patchSelectPerson();patchSelectProduct();patchRoute()},1200);
})();
