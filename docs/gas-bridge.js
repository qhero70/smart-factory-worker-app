/* 報工作業 V4 PWA Bridge v4.8.3
 * 負責：讀取正式主資料庫、轉換人員/產品/途程/機台/不良原因、送出報工。
 * 對接 GAS：正式主資料庫API_入口_只保留doGet_doPost.gs
 */
(function(){
'use strict';
const CFG=window.PWA_CONFIG||{};
const SS=CFG.SPREADSHEET_ID||CFG.正式主資料庫ID||'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
const GAS_URL=(CFG.GAS_WEB_APP_URL||'').trim();
const DB_SHEETS={people:'01_人員主檔',products:'02_產品主檔',machines:'03_機台主檔',routes:'08_工站途程機台主檔',defects:'05_不良代碼主檔',photos:'06_照片資料庫'};
let CACHE=null;
function S(v){return String(v==null?'':v).trim()}
function norm(v){return S(v).replace(/\.0$/,'')}
function pick(o,ks){o=o||{};for(const k of ks){if(o[k]!=null&&S(o[k])!=='')return S(o[k])}return''}
function unique(a){const m={};return(a||[]).map(norm).filter(Boolean).filter(x=>!m[x]&&(m[x]=1))}
function splitIds(s){return unique(S(s).split(/[、,，;；\/\s]+/).filter(x=>/^\d{1,5}(?:\.0)?$/.test(S(x))))}
function arrowIds(s){return /[→➜>]/.test(S(s))?unique((S(s).match(/\d{2,5}/g)||[])):[]}
function modelIds(s){const out=[];const re=/\/\s*(\d{1,5})(?=[,，、;；\s\/]|$)/g;let m;while((m=re.exec(S(s))))out.push(m[1]);return unique(out)}
function goodProductName(n,pid){n=S(n);return !!(n&&!/^產品_\d+$/i.test(n)&&n!==pid&&n!=='無品名')}
function toDateText(v){return S(v).replace(/^Date\(|\)$/g,'')}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function gvizUrl(sheet){return `https://docs.google.com/spreadsheets/d/${SS}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&_ts=${Date.now()}`}
async function readSheet(sheet){
  const txt=await fetch(gvizUrl(sheet),{cache:'no-store'}).then(r=>r.text());
  const a=txt.indexOf('{'),b=txt.lastIndexOf('}');
  if(a<0||b<a)throw new Error('讀不到分頁：'+sheet);
  const data=JSON.parse(txt.slice(a,b+1));
  const heads=(data.table.cols||[]).map((c,i)=>S(c.label||c.id||('欄'+(i+1))));
  return (data.table.rows||[]).map(row=>{const o={};(row.c||[]).forEach((c,i)=>{if(heads[i])o[heads[i]]=c?(c.f!==undefined?c.f:c.v):''});return o}).filter(o=>Object.values(o).some(x=>S(x)!==''));
}
function photoType(t){t=S(t);if(t.includes('人'))return'人員';if(t.includes('產')||t.includes('品'))return'產品';if(t.includes('機')||t.includes('設備'))return'機台';return t}
function normalizePhotos(rows){const m={人員:{},產品:{},機台:{}};(rows||[]).forEach(r=>{const vals=Object.values(r);const type=photoType(pick(r,['類型','照片類型','照片主鍵'])||vals[0]||'');const id=norm(pick(r,['對應ID','對應編號','工號','產品編號','機台編號'])||vals[1]||'');let url=pick(r,['縮圖網址','照片網址','圖片網址','網址','URL']);if(!url)url=vals.find(x=>S(x).startsWith('http'))||'';if(m[type]&&id&&S(url).startsWith('http'))m[type][id]=S(url)});return m}
function normalizeDefects(rows){
  const out={Z:[],Y:[]};
  (rows||[]).forEach(r=>{if(pick(r,['啟用','是否啟用'])==='否')return;const code=pick(r,['不良代碼','代碼','Code']);const name=pick(r,['不良名稱','名稱','不良原因','Reason']);if(!code&&!name)return;const cat=(pick(r,['分類','類別','不良分類'])||S(code).slice(0,1)||'Z').toUpperCase();if(!out[cat])out[cat]=[];out[cat].push({代碼:code,名稱:name,英文名稱:pick(r,['英文名稱','英文','English','英文說明']),責任歸屬:pick(r,['責任歸屬','責任']),分類:cat,啟用:'是'})});
  if(!out.Z.length&&!out.Y.length){
    [['Z02','加工砂孔','Machining blowhole'],['Z03','黑皮','Black surface'],['Z04','落砂','Sand inclusion'],['Z20','同心度','Concentricity'],['Y01','內徑','Inner diameter'],['Y02','外徑','Outer diameter'],['Y03','平坦度','Flatness'],['Y05','碰傷','Dent / Scratch']].forEach(a=>{const cat=a[0][0];out[cat].push({代碼:a[0],名稱:a[1],英文名稱:a[2],分類:cat,啟用:'是'})});
  }
  return out;
}
function machineListFromRoute(r,M,ph,pname){
  let ids=[];
  ids=ids.concat(splitIds(pick(r,['機台清單','機台編號清單','可選機台','可用機台','機台列表'])));
  ids=ids.concat(splitIds([pick(r,['機台編號','主機台','主機台編號','設備編號']),pick(r,['機台/型號/詳情'])].filter(Boolean).join('、')));
  ids=ids.concat(modelIds(pick(r,['機台型號','機台/型號/詳情'])).filter(x=>M[x]||ph.機台[x]));
  if(ids.length<=1)ids=ids.concat(arrowIds(pname));
  ids=unique(ids);
  return ids.map(id=>{const m=M[id]||{};const u=m.照片網址||m.縮圖網址||ph.機台[id]||'';return {機台編號:id,主機台:id,機台名稱:m.機台名稱||m.設備名稱||('機台'+id),設備名稱:m.設備名稱||m.機台名稱||('機台'+id),區域:m.區域||pick(r,['區域'])||'',機台型號:m.機台型號||m.型號||'',照片網址:u,縮圖網址:u}})
}
function normalize(raw){
  const ph=normalizePhotos(raw.photos||[]);
  const people=(raw.people||[]).map(p=>{const id=norm(pick(p,['工號','員工編號','Employee ID']));const u=pick(p,['照片網址','縮圖網址'])||ph.人員[id]||'';return Object.assign({},p,{工號:id,姓名:pick(p,['姓名','Name']),班別:pick(p,['班別','班別名稱'])||'早班',啟用:pick(p,['啟用','是否啟用'])||'是',照片網址:u,縮圖網址:u})}).filter(p=>(p.工號||p.姓名)&&p.啟用!=='否');
  const products=(raw.products||[]).map(p=>{const id=norm(pick(p,['產品編號','料號']));const u=pick(p,['照片網址','縮圖網址'])||ph.產品[id]||'';return Object.assign({},p,{產品編號:id,客戶品號:pick(p,['客戶品號','客戶料號']),品名:pick(p,['品名','產品名稱']),照片網址:u,縮圖網址:u})}).filter(p=>p.產品編號&&goodProductName(p.品名,p.產品編號));
  const P={};products.forEach(p=>P[p.產品編號]=p);
  const machines=(raw.machines||[]).map(m=>{const id=norm(pick(m,['機台編號','主機台','設備編號']));const u=pick(m,['照片網址','縮圖網址'])||ph.機台[id]||'';const nm=pick(m,['機台名稱','設備名稱','名稱'])||('機台'+id);return Object.assign({},m,{機台編號:id,主機台:id,機台名稱:nm,設備名稱:nm,照片網址:u,縮圖網址:u})}).filter(m=>m.機台編號);
  const M={};machines.forEach(m=>M[m.機台編號]=m);
  const routes=(raw.routes||[]).map(r=>{const pid=norm(pick(r,['產品編號','料號']));if(!pid||/^P\d{3,}$/i.test(pid))return null;const p=P[pid]||{};let pname=pick(r,['品名','產品名稱'])||p.品名||'';if(!goodProductName(pname,pid))pname=p.品名||'';if(!goodProductName(pname,pid))return null;const station=pick(r,['報工工站名稱','工站名稱','工站','工序名稱']);if(!station)return null;const proc=pick(r,['工序範圍','工序編號_最終','工序編號','工序','OP','作業順序']);const ms=machineListFromRoute(r,M,ph,pname);const pu=pick(r,['產品照片網址','產品縮圖網址'])||p.照片網址||ph.產品[pid]||'';return Object.assign({},r,{產品編號:pid,客戶品號:pick(r,['客戶品號','客戶料號'])||p.客戶品號||'',品名:pname,報工工站名稱:station,工站名稱:station,工序範圍:proc,工序:proc,主機台:(ms[0]&&ms[0].機台編號)||'',機台編號:ms.map(x=>x.機台編號).join('、'),機台編號清單:ms.map(x=>x.機台編號),機台清單:ms,產品照片網址:pu,產品縮圖網址:pu,顯示名稱:[station,proc,ms.map(x=>x.機台編號).join('、')].filter(Boolean).join('｜')})}).filter(Boolean);
  const defects=normalizeDefects(raw.defects||[]);
  return {成功:true,success:true,人員:people,people,產品:products,products,機台:machines,machines,報工工站群組:routes,routes,不良原因:defects,不良代號:raw.defects||[],defects:raw.defects||[],班別清單:[{名稱:'早班',值:'早班'},{名稱:'大夜班',值:'大夜班'}],異常類型:['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],筆數:{人員:people.length,產品:products.length,機台:machines.length,報工工站群組:routes.length,不良原因:(defects.Z||[]).length+(defects.Y||[]).length},訊息:'正式主資料庫讀取完成'};
}
async function loadInit(){
  if(CACHE)return CACHE;
  const raw={};
  for(const [key,sheet] of Object.entries(DB_SHEETS)){try{raw[key]=await readSheet(sheet)}catch(e){raw[key]=[];console.warn('[V4] sheet load failed',sheet,e)}}
  CACHE=normalize(raw);
  return CACHE;
}
function buildPayload(action,payload){payload=Object.assign({spreadsheetId:SS,正式主資料庫ID:SS,主資料庫ID:SS,action,動作:action,_ts:String(Date.now())},payload||{});const sp=new URLSearchParams();Object.keys(payload).forEach(k=>{const v=payload[k];if(v!=null)sp.set(k,typeof v==='object'?JSON.stringify(v):String(v))});const json=JSON.stringify(payload);sp.set('payload',json);sp.set('資料',json);sp.set('json',json);return sp.toString()}
async function parseResponse(r){const t=await r.text();try{return JSON.parse(t)}catch(e){return{成功:false,success:false,訊息:'GAS 回傳不是 JSON',原始回應:t.slice(0,600)}}}
async function apiPost(action,payload){
  if(!GAS_URL)throw new Error('尚未設定 GAS_WEB_APP_URL');
  const u=new URL(GAS_URL);u.searchParams.set('action',action);u.searchParams.set('動作',action);u.searchParams.set('_ts',Date.now());u.searchParams.set('spreadsheetId',SS);
  const r=await fetch(u.toString(),{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:buildPayload(action,payload)});
  const j=await parseResponse(r);
  if(!r.ok)throw new Error('HTTP '+r.status+' '+(j.訊息||j.message||''));
  return j;
}
async function submitReport(payload){
  const actions=(CFG.API_ACTIONS&&CFG.API_ACTIONS.SUBMIT)||['submitWorkReportV4'];
  let last=null;
  for(const a of actions){try{const r=await apiPost(a,payload);last=r;if(r&&(r.ok===true||r.成功===true||r.success===true))return r}catch(e){last=e}}
  if(last instanceof Error)throw last;
  return last||{成功:false,success:false,訊息:'報工送出失敗'};
}
window.V4Bridge={loadInit,submitReport,apiPost,today,SS,GAS_URL};
})();
