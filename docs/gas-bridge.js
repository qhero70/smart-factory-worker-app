/* 報工作業 V4 PWA Bridge v4.8.8
 * 修正重點：
 * 1. 不良原因固定補讀 05_不良代碼主檔，前端選單一定吃主檔。
 * 2. 產品照片固定補讀 06_照片資料庫 + 02_產品主檔照片欄位。
 * 3. 機台照片固定補讀 06_照片資料庫 + 03_機台主檔照片欄位。
 * 4. GAS 回傳缺照片或缺不良原因時，自動用 Google Sheets gviz 補齊，不再只吃半套資料。
 */
(function(){
'use strict';

const CFG=window.PWA_CONFIG||{};
const SS=CFG.SPREADSHEET_ID||CFG.正式主資料庫ID||'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
const GAS_URL=(CFG.GAS_WEB_APP_URL||'https://script.google.com/macros/s/AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ/exec').trim();
const DB_SHEETS={people:'01_人員主檔',products:'02_產品主檔',machines:'03_機台主檔',routes:'08_工站途程機台主檔',defects:'05_不良代碼主檔',photos:'06_照片資料庫'};
let CACHE=null;

function S(v){return String(v==null?'':v).trim();}
function norm(v){return S(v).replace(/\.0$/,'');}
function lower(v){return S(v).toLowerCase();}
function pick(o,ks){o=o||{};for(const k of ks){if(o[k]!=null&&S(o[k])!=='')return S(o[k]);}return'';}
function unique(a){const m={};return(a||[]).map(norm).filter(Boolean).filter(x=>!m[x]&&(m[x]=1));}
function splitIds(s){return unique(S(s).split(/[、,，;；\/\s]+/).filter(x=>/^\d{1,5}(?:\.0)?$/.test(S(x))));}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function ok(x){return !!(x&&(x.ok===true||x.成功===true||x.success===true));}
function hasData(x){return !!((x&&((x.人員||x.people||[]).length||(x.報工工站群組||x.routes||x.途程工站群組||[]).length||(x.產品||x.products||[]).length||(x.機台||x.machines||[]).length)));}
function timeout(ms){return new Promise((_,rej)=>setTimeout(()=>rej(new Error('API 逾時 '+ms+'ms')),ms));}
function fetchText(url,opt,ms){return Promise.race([fetch(url,opt).then(r=>r.text()),timeout(ms||15000)]);}
function buildPayload(action,payload){payload=Object.assign({spreadsheetId:SS,正式主資料庫ID:SS,主資料庫ID:SS,action,動作:action,_ts:String(Date.now())},payload||{});const sp=new URLSearchParams();Object.keys(payload).forEach(k=>{const v=payload[k];if(v!=null)sp.set(k,typeof v==='object'?JSON.stringify(v):String(v));});const json=JSON.stringify(payload);sp.set('payload',json);sp.set('資料',json);sp.set('json',json);return sp.toString();}
async function apiPost(action,payload){if(!GAS_URL)throw new Error('尚未設定 GAS_WEB_APP_URL');const u=new URL(GAS_URL);u.searchParams.set('action',action);u.searchParams.set('動作',action);u.searchParams.set('_ts',Date.now());u.searchParams.set('spreadsheetId',SS);const txt=await fetchText(u.toString(),{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:buildPayload(action,payload)},18000);try{return JSON.parse(txt);}catch(e){return{成功:false,success:false,訊息:'GAS 回傳不是 JSON',原始回應:S(txt).slice(0,600)}};}

function driveImageUrl(url){
  let s=S(url);
  if(!s)return'';
  const m1=s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const m2=s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const m3=s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  const id=(m1&&m1[1])||(m2&&m2[1])||(m3&&m3[1]);
  return id?`https://drive.google.com/thumbnail?id=${id}&sz=w1200`:s;
}
function firstUrl(v){
  if(!v)return'';
  if(Array.isArray(v))return firstUrl(v.find(Boolean));
  if(typeof v==='object')return firstUrl(Object.values(v).find(x=>S(x).startsWith('http')));
  const arr=S(v).split(/[\n,，;；|]+/).map(driveImageUrl).filter(x=>/^https?:\/\//i.test(x));
  return arr[0]||'';
}
function photoType(t){t=S(t);if(t.includes('人')||/person|people|operator|staff/i.test(t))return'人員';if(t.includes('產')||t.includes('品')||/product|part/i.test(t))return'產品';if(t.includes('機')||t.includes('設備')||/machine|equipment/i.test(t))return'機台';return t;}
function addPhoto(map,type,key,url){type=photoType(type);key=norm(key);url=firstUrl(url);if(!map[type]||!key||!url)return;map[type][key]=map[type][key]||url;map[type][lower(key)]=map[type][lower(key)]||url;}
function normalizePhotos(rows){
  const m={人員:{},產品:{},機台:{}};
  (rows||[]).forEach(r=>{
    const vals=Object.values(r||{});
    const type=photoType(pick(r,['類型','照片類型','分類','資料類型','照片主鍵'])||vals[0]||'');
    let url=pick(r,['縮圖網址','照片網址','圖片網址','網址','URL','url','連結','Drive連結','GoogleDrive連結']);
    if(!url)url=vals.find(x=>S(x).startsWith('http'))||'';
    const keys=[
      pick(r,['對應ID','對應編號','主鍵','工號','員工編號','產品編號','料號','客戶品號','機台編號','設備編號']),
      pick(r,['品名','產品名稱','機台名稱','設備名稱','姓名']),
      vals[1],vals[2]
    ].filter(Boolean);
    keys.forEach(k=>addPhoto(m,type,k,url));
  });
  return m;
}
function photoFor(ph,type,keys){
  const bucket=ph[photoType(type)]||{};
  for(const k of (keys||[])){const kk=norm(k);if(kk&&bucket[kk])return bucket[kk];if(kk&&bucket[lower(kk)])return bucket[lower(kk)];}
  return'';
}

function normalizeDefects(rows){
  if(rows&&typeof rows==='object'&&!Array.isArray(rows)&&(rows.Z||rows.Y)){
    return {Z:(rows.Z||[]).map(defectRow).filter(x=>x.代碼||x.名稱),Y:(rows.Y||[]).map(defectRow).filter(x=>x.代碼||x.名稱)};
  }
  const out={Z:[],Y:[]};
  (Array.isArray(rows)?rows:[]).forEach(r=>{
    if(S(pick(r,['啟用','是否啟用','使用狀態']))==='否')return;
    const d=defectRow(r);
    if(!d.代碼&&!d.名稱)return;
    let cat=(pick(r,['分類','類別','不良分類','責任類型'])||S(d.代碼).slice(0,1)||'Y').toUpperCase();
    if(cat!=='Z'&&cat!=='Y')cat=S(d.代碼).toUpperCase().startsWith('Z')?'Z':'Y';
    d.分類=cat;
    out[cat].push(d);
  });
  return out;
}
function defectRow(r){r=r||{};return{代碼:pick(r,['不良代碼','代碼','Code','code','不良原因代碼']),名稱:pick(r,['不良名稱','名稱','不良原因','Reason','reason','中文名稱']),英文名稱:pick(r,['英文名稱','英文','English','english','英文說明','英文原因']),責任歸屬:pick(r,['責任歸屬','責任','責任單位']),分類:pick(r,['分類','類別','不良分類']),啟用:pick(r,['啟用','是否啟用'])||'是'};}
function defectCount(d){d=d||{};return(d.Z||[]).length+(d.Y||[]).length;}

function goodProductName(n,pid){n=S(n);return !!(n&&!/^產品_\d+$/i.test(n)&&n!==pid&&n!=='無品名');}
function makeProductIndex(products){const P={};(products||[]).forEach(p=>{if(p.產品編號)P[p.產品編號]=p;if(p.客戶品號)P[p.客戶品號]=p;});return P;}
function normalizePeople(rows,ph){return(rows||[]).map(p=>{const id=norm(pick(p,['工號','員工編號','Employee ID','employeeId']));const u=firstUrl(pick(p,['照片網址','縮圖網址','圖片網址','頭像網址']))||photoFor(ph,'人員',[id,pick(p,['姓名','Name'])]);return Object.assign({},p,{工號:id,姓名:pick(p,['姓名','Name']),班別:pick(p,['班別','班別名稱'])||'早班',啟用:pick(p,['啟用','是否啟用'])||'是',照片網址:u,縮圖網址:u});}).filter(p=>(p.工號||p.姓名)&&p.啟用!=='否');}
function normalizeProducts(rows,ph){return(rows||[]).map(p=>{const id=norm(pick(p,['產品編號','料號','品號','productCode']));const cust=norm(pick(p,['客戶品號','客戶料號','customerPartNo']));const name=pick(p,['品名','產品名稱','productName']);const u=firstUrl(pick(p,['產品照片網址','產品縮圖網址','照片網址','縮圖網址','圖片網址']))||photoFor(ph,'產品',[id,cust,name]);return Object.assign({},p,{產品編號:id,客戶品號:cust,品名:name,產品照片網址:u,產品縮圖網址:u,照片網址:u,縮圖網址:u});}).filter(p=>p.產品編號&&goodProductName(p.品名,p.產品編號));}
function normalizeMachines(rows,ph){return(rows||[]).map(m=>{const id=norm(pick(m,['機台編號','主機台','設備編號','machineId']));const nm=pick(m,['機台名稱','設備名稱','名稱','machineName'])||('機台'+id);const area=pick(m,['區域','廠區','位置']);const model=pick(m,['機台型號','型號','規格']);const u=firstUrl(pick(m,['機台照片網址','照片網址','縮圖網址','圖片網址']))||photoFor(ph,'機台',[id,nm]);return Object.assign({},m,{機台編號:id,主機台:id,機台名稱:nm,設備名稱:nm,區域:area,機台型號:model,照片網址:u,縮圖網址:u,機台照片網址:u});}).filter(m=>m.機台編號);}
function makeMachineIndex(machines){const M={};(machines||[]).forEach(m=>{M[m.機台編號]=m;if(m.設備名稱)M[m.設備名稱]=m;if(m.機台名稱)M[m.機台名稱]=m;});return M;}
function machineListFromRoute(r,M,ph){
  let ids=[];
  ids=ids.concat(splitIds(pick(r,['機台清單','機台編號清單','可選機台','可用機台','機台列表'])));
  ids=ids.concat(splitIds([pick(r,['機台編號','主機台','主機台編號','設備編號']),pick(r,['機台/型號/詳情'])].filter(Boolean).join('、')));
  ids=unique(ids);
  return ids.map(id=>{
    const m=M[id]||{};
    const nm=m.機台名稱||m.設備名稱||('機台'+id);
    const u=m.照片網址||m.縮圖網址||m.機台照片網址||photoFor(ph,'機台',[id,nm])||'';
    return {機台編號:id,主機台:id,機台名稱:nm,設備名稱:nm,區域:m.區域||pick(r,['區域'])||'',機台型號:m.機台型號||m.型號||'',照片網址:u,縮圖網址:u,機台照片網址:u};
  });
}
function normalizeRoutes(rows,products,machines,ph){
  const P=makeProductIndex(products),M=makeMachineIndex(machines);
  return(rows||[]).map(r=>{
    const pid=norm(pick(r,['產品編號','料號','品號']));
    if(!pid)return null;
    const p=P[pid]||{};
    let pname=pick(r,['品名','產品名稱'])||p.品名||'';
    if(!goodProductName(pname,pid))pname=p.品名||'';
    const station=pick(r,['報工工站名稱','工站名稱','工站','工序名稱']);
    if(!station)return null;
    const proc=pick(r,['工序範圍','工序編號_最終','工序編號','工序','OP','作業順序']);
    const ms=machineListFromRoute(r,M,ph);
    const cust=pick(r,['客戶品號','客戶料號'])||p.客戶品號||'';
    const pu=firstUrl(pick(r,['產品照片網址','產品縮圖網址','照片網址','縮圖網址','圖片網址']))||p.產品照片網址||p.照片網址||photoFor(ph,'產品',[pid,cust,pname])||'';
    return Object.assign({},r,{產品編號:pid,客戶品號:cust,品名:pname,報工工站名稱:station,工站名稱:station,工序範圍:proc,工序:proc,主機台:(ms[0]&&ms[0].機台編號)||'',機台編號:ms.map(x=>x.機台編號).join('、'),機台編號清單:ms.map(x=>x.機台編號),機台清單:ms,產品照片網址:pu,產品縮圖網址:pu,照片網址:pu,縮圖網址:pu,顯示名稱:[station,proc,ms.map(x=>x.機台編號).join('、')].filter(Boolean).join('｜')});
  }).filter(Boolean);
}
function buildProductList(routes,products,ph){
  const map=new Map();
  (routes||[]).forEach(gr=>{const key=gr.產品編號+'|'+gr.品名;if(!map.has(key))map.set(key,gr);});
  (products||[]).forEach(p=>{const key=p.產品編號+'|'+p.品名;if(!map.has(key)){const u=p.產品照片網址||p.照片網址||photoFor(ph,'產品',[p.產品編號,p.客戶品號,p.品名])||'';map.set(key,Object.assign({},p,{報工工站名稱:'',工站名稱:'',產品照片網址:u,產品縮圖網址:u}));}});
  return Array.from(map.values()).sort((a,b)=>S(a.品名).localeCompare(S(b.品名),'zh-Hant'));
}

function normalize(raw){
  raw=raw||{};
  const ph=normalizePhotos(raw.photos||raw.照片資料庫||raw.照片||[]);
  const people=normalizePeople(raw.人員||raw.people||[],ph);
  const products=normalizeProducts(raw.產品||raw.products||[],ph);
  const machines=normalizeMachines(raw.機台||raw.machines||[],ph);
  const routes=normalizeRoutes(raw.報工工站群組||raw.routes||raw.途程工站群組||[],products,machines,ph);
  const defects=normalizeDefects(raw.不良原因||raw.defects||raw.不良原因主檔||[]);
  const productList=buildProductList(routes,products,ph);
  return {成功:true,success:true,人員:people,people,產品:products,products,機台:machines,machines,報工工站群組:routes,routes,途程工站群組:routes,產品清單:productList,productList,不良原因:defects,defects,班別清單:raw.班別清單||[{名稱:'早班',值:'早班'},{名稱:'中班',值:'中班'},{名稱:'大夜班',值:'大夜班'}],異常類型:raw.異常類型||['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],筆數:{人員:people.length,產品:productList.length,機台:machines.length,報工工站群組:routes.length,不良原因:defectCount(defects)},訊息:'正式主資料庫讀取完成'};
}
function mergeRows(baseRows, sheetRows, keyList){
  const map=new Map();
  (sheetRows||[]).forEach(r=>{const key=keyList.map(k=>norm(r[k])).find(Boolean)||JSON.stringify(r);map.set(key,r);});
  (baseRows||[]).forEach(r=>{const key=keyList.map(k=>norm(r[k])).find(Boolean)||JSON.stringify(r);map.set(key,Object.assign({},map.get(key)||{},r));});
  return Array.from(map.values());
}
function denormalizeForMerge(data){
  return {people:data.人員||data.people||[],products:data.產品||data.products||[],machines:data.機台||data.machines||[],routes:data.報工工站群組||data.routes||data.途程工站群組||[],defects:data.不良原因||data.defects||[],photos:data.photos||data.照片資料庫||[]};
}
function mergeRaw(base,sheets){
  base=denormalizeForMerge(base||{});sheets=denormalizeForMerge(sheets||{});
  return {people:mergeRows(base.people,sheets.people,['工號','員工編號','Employee ID']),products:mergeRows(base.products,sheets.products,['產品編號','料號','品號']),machines:mergeRows(base.machines,sheets.machines,['機台編號','設備編號','主機台']),routes:mergeRows(base.routes,sheets.routes,['產品編號','料號','品號','工站名稱','報工工站名稱']),defects:defectCount(normalizeDefects(base.defects))?base.defects:sheets.defects,photos:(base.photos&&base.photos.length)?base.photos:sheets.photos};
}

async function readSheet(sheet){const url=`https://docs.google.com/spreadsheets/d/${SS}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&_ts=${Date.now()}`;const txt=await fetchText(url,{cache:'no-store'},9000);const a=txt.indexOf('{'),b=txt.lastIndexOf('}');if(a<0||b<a)throw new Error('讀不到分頁：'+sheet);const data=JSON.parse(txt.slice(a,b+1));const heads=(data.table.cols||[]).map((c,i)=>S(c.label||c.id||('欄'+(i+1))));return(data.table.rows||[]).map(row=>{const o={};(row.c||[]).forEach((c,i)=>{if(heads[i])o[heads[i]]=c?(c.f!==undefined?c.f:c.v):'';});return o;}).filter(o=>Object.values(o).some(x=>S(x)!==''));}
async function loadSheets(){const raw={};for(const [key,sheet] of Object.entries(DB_SHEETS)){try{raw[key]=await readSheet(sheet);}catch(e){raw[key]=[];console.warn('[V4] sheet load failed',sheet,e);}}return raw;}
async function loadByGviz(){return normalize(await loadSheets());}

async function loadInit(){
  if(CACHE)return CACHE;
  const actions=(CFG.API_ACTIONS&&CFG.API_ACTIONS.INIT)||['取得報工作業v2初始資料','取得報工作業V4初始資料','getWorkReportV4Init','init'];
  let last=null;
  for(const a of actions){
    try{
      const r=await apiPost(a,{mode:'init'});last=r;
      if(ok(r)&&hasData(r)){
        let sheets=null;
        try{sheets=await loadSheets();}catch(e){console.warn('[V4] gviz enrich failed',e);}
        CACHE=normalize(sheets?mergeRaw(r,sheets):r);
        return CACHE;
      }
    }catch(e){last=e;console.warn('[V4] GAS init failed',a,e);}
  }
  try{CACHE=await loadByGviz();return CACHE;}catch(e){throw(last instanceof Error?last:e);}
}
async function submitReport(payload){const actions=(CFG.API_ACTIONS&&CFG.API_ACTIONS.SUBMIT)||['submitWorkReportV4','寫入報工作業V4','寫入報工作業v2'];let last=null;for(const a of actions){try{const r=await apiPost(a,payload);last=r;if(r&&(r.ok===true||r.成功===true||r.success===true||r.reportId||r.報工編號))return r;}catch(e){last=e;}}if(last instanceof Error)throw last;return last||{成功:false,success:false,訊息:'報工送出失敗'};}

window.V4Bridge={loadInit,submitReport,apiPost,today,SS,GAS_URL,readSheet,loadByGviz};
})();
