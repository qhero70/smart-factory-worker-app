(function(){
'use strict';
const GAS_URL='https://script.google.com/macros/s/AKfycbwOi-xjKoMD9jVq4HrHBvh7k1DCn70lAPAJiqaWJhvH70PbuRo4ciopCjYcytIalaW4/exec';
const SS='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
window.PWA_CONFIG=window.PWA_CONFIG||{};
window.PWA_CONFIG.GAS_WEB_APP_URL=window.PWA_CONFIG.GAS_WEB_APP_URL||GAS_URL;
window.PWA_CONFIG.SPREADSHEET_ID=SS;
window.PWA_CONFIG.正式主資料庫ID=SS;
const 設定=window.PWA_CONFIG;
let CACHE=null;
function gas(){return String(設定.GAS_WEB_APP_URL||GAS_URL).trim().replace(/\?.*$/,'')||GAS_URL}
function qp(action,payload){payload=Object.assign({spreadsheetId:SS,正式主資料庫ID:SS,主資料庫ID:SS},payload||{});const u=new URL(gas());u.searchParams.set('action',action);u.searchParams.set('動作',action);u.searchParams.set('_ts',Date.now());Object.keys(payload).forEach(k=>{const v=payload[k];if(v!=null)u.searchParams.set(k,typeof v==='object'?JSON.stringify(v):String(v))});return u.toString()}
function body(action,payload){payload=Object.assign({spreadsheetId:SS,正式主資料庫ID:SS,主資料庫ID:SS},payload||{},{action,動作:action,_ts:String(Date.now())});const s=new URLSearchParams();Object.keys(payload).forEach(k=>{const v=payload[k];if(v!=null)s.set(k,typeof v==='object'?JSON.stringify(v):String(v))});const j=JSON.stringify(payload);if(j.length<220000){s.set('payload',j);s.set('資料',j);s.set('json',j)}return s.toString()}
async function parse(r){const t=await r.text();if(!r.ok)throw new Error('HTTP '+r.status);try{return JSON.parse(t)}catch(e){return{成功:false,success:false,訊息:'GAS回傳不是JSON',原始回應:t.slice(0,500)}}}
function bad(r){if(!r||typeof r!=='object')return true;if(r.成功===false||r.success===false||r.ok===false)return true;return/UNKNOWN_ACTION|找不到|未接入|不支援|未部署/.test(String(r.訊息||r.message||r.error||r.原始回應||''))}
async function GET(action,payload,opt){return fetch(qp(action,payload),{method:'GET',cache:'no-store',mode:'cors',credentials:'omit'}).then(parse)}
async function POST(action,payload,opt){const u=new URL(gas());u.searchParams.set('action',action);u.searchParams.set('動作',action);u.searchParams.set('_ts',Date.now());u.searchParams.set('spreadsheetId',SS);try{const r=await fetch(u.toString(),{method:'POST',cache:'no-store',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body(action,payload)}).then(parse);if(!bad(r))return r}catch(e){}try{const g=await GET(action,payload,opt);if(!bad(g))return g}catch(e){}try{await fetch(u.toString(),{method:'POST',cache:'no-store',mode:'no-cors',credentials:'omit',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body(action,payload)});return{成功:true,success:true,opaque:true,transport:'no_cors_post',訊息:'已送出至GAS；請以正式主資料庫寫入結果為準。'}}catch(e){throw e}}
async function 呼叫(action,payload,opt){return String(opt&&opt.method||'GET').toUpperCase()==='POST'?POST(action,payload,opt):GET(action,payload,opt)}
function pick(o,ks){o=o||{};for(const k of ks){const x=o[k];if(x!=null&&String(x).trim()!=='')return String(x).trim()}return''}
function normId(x){return String(x||'').trim().replace(/\.0$/,'')}
function unique(a){const m={};return(a||[]).map(normId).filter(Boolean).filter(x=>!m[x]&&(m[x]=1))}
function splitIds(s){return unique(String(s||'').split(/[、,，;；\/\s]+/).filter(x=>/^\d{1,5}(?:\.0)?$/.test(String(x).trim())))}
function modelIds(s){const out=[];const re=/\/\s*(\d{1,5})(?=[,，、;；\s\/]|$)/g;let m;while((m=re.exec(String(s||''))))out.push(m[1]);return unique(out)}
function arrowIds(s){const t=String(s||'');if(!/[→➜>]/.test(t))return[];return unique((t.match(/\d{2,5}/g)||[]))}
function goodName(name,pid){name=String(name||'').trim();return name&&!/^產品_\d+$/i.test(name)&&name!==pid}
async function sheet(name){const url='https://docs.google.com/spreadsheets/d/'+SS+'/gviz/tq?tqx=out:json&sheet='+encodeURIComponent(name)+'&_ts='+Date.now();const txt=await fetch(url,{cache:'no-store'}).then(r=>r.text());const a=txt.indexOf('{'),b=txt.lastIndexOf('}');if(a<0||b<a)throw new Error('讀不到分頁 '+name);const d=JSON.parse(txt.slice(a,b+1));const h=(d.table.cols||[]).map((c,i)=>String(c.label||c.id||('欄'+(i+1))).trim());return(d.table.rows||[]).map(row=>{const o={};(row.c||[]).forEach((c,i)=>{if(h[i])o[h[i]]=c?(c.f!==undefined?c.f:c.v):''});return o}).filter(o=>Object.values(o).some(x=>String(x||'').trim()!==''))}
function photoType(t){t=String(t||'');if(t.indexOf('人')>=0)return'人員';if(t.indexOf('產')>=0||t.indexOf('品')>=0)return'產品';if(t.indexOf('機')>=0||t.indexOf('設備')>=0)return'機台';return t}
function photos(rows){const m={人員:{},產品:{},機台:{}};(rows||[]).forEach(r=>{const vals=Object.values(r);const type=photoType(pick(r,['類型','照片主鍵'])||vals[0]||'');const id=normId(pick(r,['對應ID','工號','產品編號','機台編號'])||vals[1]||'');let url=pick(r,['縮圖網址','照片網址','網址']);if(!url)url=vals.find(x=>String(x||'').startsWith('http'))||'';if(m[type]&&id&&String(url).startsWith('http'))m[type][id]=url});return m}
function defectCount(x){return ((x&&x.Z)||[]).length+((x&&x.Y)||[]).length}
async function live(){
  if(CACHE)return CACHE;
  const raw={};
  for(const [k,n] of Object.entries({人員:'01_人員主檔',產品:'02_產品主檔',機台:'03_機台主檔',途程:'08_工站途程機台主檔',不良:'05_不良代碼主檔',照片:'06_照片資料庫'})){
    try{raw[k]=await sheet(n)}catch(e){raw[k]=[]}
  }
  const ph=photos(raw.照片);
  const people=(raw.人員||[]).map(p=>{const id=normId(pick(p,['工號','員工編號','Employee ID']));const u=pick(p,['照片網址','縮圖網址'])||ph.人員[id]||'';return Object.assign({},p,{工號:id,姓名:pick(p,['姓名','Name']),班別:pick(p,['班別','班別名稱'])||'早班',啟用:pick(p,['啟用'])||'是',照片網址:u,縮圖網址:u})}).filter(p=>(p.工號||p.姓名)&&p.啟用!=='否');
  const products=(raw.產品||[]).map(p=>{const id=normId(pick(p,['產品編號','料號']));const u=pick(p,['照片網址','縮圖網址'])||ph.產品[id]||'';return Object.assign({},p,{產品編號:id,客戶品號:pick(p,['客戶品號','客戶料號']),品名:pick(p,['品名','產品名稱']),照片網址:u,縮圖網址:u})}).filter(p=>p.產品編號&&goodName(p.品名,p.產品編號));
  const P={};products.forEach(p=>P[p.產品編號]=p);
  const machines=(raw.機台||[]).map(m=>{const id=normId(pick(m,['機台編號','主機台','設備編號']));const u=pick(m,['照片網址','縮圖網址'])||ph.機台[id]||'';const nm=pick(m,['機台名稱','設備名稱','名稱'])||('機台'+id);return Object.assign({},m,{機台編號:id,主機台:id,機台名稱:nm,設備名稱:nm,照片網址:u,縮圖網址:u})}).filter(m=>m.機台編號);
  const M={};machines.forEach(m=>M[m.機台編號]=m);
  const routes=(raw.途程||[]).map(r=>{const pid=normId(pick(r,['產品編號','料號']));if(!pid||/^P\d{3,}$/i.test(pid))return null;const p=P[pid]||{};let pname=pick(r,['品名','產品名稱'])||p.品名||'';if(!goodName(pname,pid))pname=p.品名||'';if(!goodName(pname,pid))return null;const station=pick(r,['報工工站名稱','工站名稱','工站','工序名稱']);if(!station)return null;const proc=pick(r,['工序範圍','工序編號_最終','工序編號','工序','OP','作業順序']);let idList=[];idList=idList.concat(splitIds(pick(r,['機台清單','機台編號清單','可選機台','可用機台'])));idList=idList.concat(splitIds([pick(r,['機台編號','主機台','主機台編號','設備編號']),pick(r,['機台/型號/詳情'])].filter(Boolean).join('、')));idList=idList.concat(modelIds(pick(r,['機台型號','機台/型號/詳情'])).filter(x=>M[x]||ph.機台[x]));if(idList.length<=1)idList=idList.concat(arrowIds(pname));idList=unique(idList);const pu=pick(r,['產品照片網址','產品縮圖網址'])||p.照片網址||ph.產品[pid]||'';return Object.assign({},r,{產品編號:pid,客戶品號:pick(r,['客戶品號','客戶料號'])||p.客戶品號||'',品名:pname,報工工站名稱:station,工站名稱:station,工序範圍:proc,工序:proc,主機台:idList[0]||'',機台編號:idList.join('、'),機台編號清單:idList,機台清單:idList.map(id=>{const mm=M[id]||{};const url=mm.照片網址||mm.縮圖網址||ph.機台[id]||'';return{機台編號:id,主機台:id,區域:mm.區域||pick(r,['區域'])||'',設備名稱:mm.設備名稱||mm.機台名稱||('機台'+id),機台名稱:mm.機台名稱||mm.設備名稱||('機台'+id),機台型號:mm.機台型號||mm.型號||'',照片網址:url,縮圖網址:url}}),產品照片網址:pu,產品縮圖網址:pu,顯示名稱:[station,proc,idList.join('、')].filter(Boolean).join('｜')})}).filter(Boolean);
  const ng={Z:[],Y:[]};
  (raw.不良||[]).forEach(d=>{if(pick(d,['啟用'])==='否')return;const code=pick(d,['不良代碼','代碼']);const name=pick(d,['不良名稱','名稱','不良原因']);const cat=(pick(d,['分類','類別','不良分類'])||String(code).slice(0,1)||'Z').toUpperCase();if(!ng[cat])ng[cat]=[];if(code||name)ng[cat].push({代碼:code,名稱:name,英文名稱:pick(d,['英文名稱','英文','English']),責任歸屬:pick(d,['責任歸屬']),分類:cat})});
  CACHE={成功:true,success:true,人員:people,people:people,產品:products,products:products,機台:machines,machines:machines,報工工站群組:routes,routes:routes,不良原因:ng,不良代號:raw.不良||[],defects:raw.不良||[],班別清單:[{名稱:'早班',值:'早班'},{名稱:'中班',值:'中班'},{名稱:'大夜班',值:'大夜班'}],異常類型:['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],筆數:{人員:people.length,產品:products.length,機台:machines.length,工站機台關聯:machines.length,報工工站群組:routes.length,不良原因:defectCount(ng)},訊息:'正式主資料庫即時讀取完成'};
  return CACHE;
}
function merge(r,s){r=Object.assign({},r||{});if((s.人員||[]).length)r.人員=s.人員;if((s.產品||[]).length)r.產品=s.產品;if((s.機台||[]).length)r.機台=s.機台;if((s.報工工站群組||[]).length)r.報工工站群組=s.報工工站群組;if(defectCount(s.不良原因))r.不良原因=s.不良原因;r.people=r.人員||[];r.products=r.產品||[];r.machines=r.機台||[];r.routes=r.報工工站群組||[];r.不良代號=s.不良代號||r.不良代號||[];r.defects=r.不良代號;r.班別清單=r.班別清單||s.班別清單;r.異常類型=r.異常類型||s.異常類型;r.筆數=Object.assign({},r.筆數||{},s.筆數||{});r.成功=true;r.success=true;return r}
async function 取得報工初始資料(){let r={};try{r=await 呼叫((設定.API_ACTIONS&&設定.API_ACTIONS.取得報工作業v2初始資料)||'取得報工作業v2初始資料',{spreadsheetId:SS,正式主資料庫ID:SS})}catch(e){r={成功:false,success:false,訊息:e.message||String(e)}}try{r=merge(r,await live())}catch(e){r.訊息=(r.訊息||'')+'；主資料即時讀取失敗：'+(e.message||String(e))}return r}
async function 寫入報工(p){return 呼叫((設定.API_ACTIONS&&設定.API_ACTIONS.寫入報工作業v2)||'寫入報工作業v2',p,{method:'POST'})}
async function 寫入不良紀錄(p){return 呼叫((設定.API_ACTIONS&&設定.API_ACTIONS.寫入不良紀錄v2)||'寫入不良紀錄v2',p,{method:'POST'})}
window.GAS橋接器={取得GAS網址:gas,建立網址:qp,呼叫:呼叫,GET:GET,POST:POST,取得報工初始資料:取得報工初始資料,寫入報工:寫入報工,寫入不良紀錄:寫入不良紀錄,正式主資料庫即時讀取:live,版本:'v4.7.7_master_routes_defects_photos'};
})();
