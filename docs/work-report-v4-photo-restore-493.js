/* 化新報工 V4｜v4.9.3 照片還原 + 未選人員隱藏
 * 只修兩件事：
 * 1. 從 06_照片資料庫 回補人員 / 產品 / 機台照片。
 * 2. 未選人員前隱藏「選定人員」區塊，不再被底部拉出來。
 * 不改班別、不改開場、不改報工寫入、不改工站邏輯。
 */
(function(){
  'use strict';
  if(window.__HUAXIN_PHOTO_RESTORE_493__) return;
  window.__HUAXIN_PHOTO_RESTORE_493__=true;

  const SS=(window.PWA_CONFIG&&window.PWA_CONFIG.SPREADSHEET_ID)||'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  const SHEET='06_照片資料庫';
  let 照片索引=null;
  let 讀取中=null;
  let 已包裝Bridge=false;
  let 已包裝OnData=false;
  let 已包裝Select=false;
  let 已包裝Reset=false;

  function S(v){return String(v==null?'':v).trim();}
  function norm(v){return S(v).replace(/\.0$/,'').trim();}
  function lower(v){return norm(v).toLowerCase();}
  function cleanName(v){return norm(v).replace(/\.(jpg|jpeg|png|webp)$/i,'');}
  function pick(o,ks){o=o||{};for(const k of ks){if(o[k]!=null&&S(o[k])!=='')return S(o[k]);}return'';}
  function uniq(a){const m={};return (a||[]).filter(Boolean).filter(x=>!m[x]&&(m[x]=1));}
  function drive(v){
    let s=S(v); if(!s) return '';
    const m1=s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const m2=s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const m3=s.match(/[-\w]{25,}/);
    const id=(m1&&m1[1])||(m2&&m2[1])||((s.includes('drive.google.com')||s.includes('docs.google.com'))&&(m3&&m3[0]));
    if(id) return 'https://drive.google.com/thumbnail?id='+id+'&sz=w900';
    return /^https?:\/\//i.test(s)?s:'';
  }
  function typeOfPhoto(v){
    const s=S(v);
    if(s.includes('人')) return '人員';
    if(s.includes('機')||s.includes('設備')) return '機台';
    if(s.includes('產')||s.includes('品')) return '產品';
    return '產品';
  }
  function rowUrl(r){
    const byUrl=drive(pick(r,['縮圖網址','照片網址','圖片網址','網址','連結','URL','url','image','photo']));
    if(byUrl) return byUrl;
    const id=pick(r,['檔案ID','Google檔案ID','FILE_ID','fileId','Drive檔案ID']);
    return id ? 'https://drive.google.com/thumbnail?id='+id+'&sz=w900' : '';
  }
  function rowKeys(r){
    const raw=[
      pick(r,['對應ID','對應編號','主鍵','工號','員工編號','產品編號','料號','客戶品號','機台編號','設備編號']),
      pick(r,['名稱','姓名','品名','產品名稱','機台名稱','設備名稱'])
    ];
    const text=Object.values(r||{}).map(S).join(' ');
    const fileKeys=(text.match(/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)/ig)||[]).map(cleanName);
    return uniq(raw.concat(fileKeys).map(cleanName));
  }
  async function 讀照片主檔(){
    if(照片索引) return 照片索引;
    if(讀取中) return 讀取中;
    讀取中=(async()=>{
      const url='https://docs.google.com/spreadsheets/d/'+SS+'/gviz/tq?tqx=out:json&sheet='+encodeURIComponent(SHEET)+'&_ts='+Date.now();
      const txt=await fetch(url,{cache:'no-store'}).then(r=>r.text());
      const a=txt.indexOf('{'), b=txt.lastIndexOf('}');
      if(a<0||b<a) throw new Error('讀不到 06_照片資料庫');
      const data=JSON.parse(txt.slice(a,b+1));
      const heads=(data.table.cols||[]).map((c,i)=>S(c.label||c.id||('欄'+(i+1))));
      const rows=(data.table.rows||[]).map(row=>{const o={};(row.c||[]).forEach((c,i)=>{if(heads[i])o[heads[i]]=c?(c.f!==undefined?c.f:c.v):'';});return o;}).filter(o=>Object.values(o).some(x=>S(x)!==''));
      const idx={人員:{},產品:{},機台:{}};
      function add(t,k,u){t=typeOfPhoto(t);k=cleanName(k);u=drive(u);if(!idx[t]||!k||!u)return;idx[t][k]=idx[t][k]||u;idx[t][lower(k)]=idx[t][lower(k)]||u;}
      rows.forEach(r=>{
        if(S(pick(r,['啟用','是否啟用']))==='否') return;
        const t=typeOfPhoto(pick(r,['類型','照片類型','分類','資料類型']));
        const u=rowUrl(r); if(!u) return;
        rowKeys(r).forEach(k=>add(t,k,u));
      });
      照片索引=idx;
      return idx;
    })().catch(e=>{console.warn('[v493照片還原] 讀取照片主檔失敗',e);return null;}).finally(()=>{讀取中=null;});
    return 讀取中;
  }
  function findPhoto(t,keys){
    const b=照片索引&&照片索引[typeOfPhoto(t)]; if(!b) return '';
    for(const k of (keys||[])){
      const kk=cleanName(k);
      if(kk&&b[kk]) return b[kk];
      if(kk&&b[lower(kk)]) return b[lower(kk)];
    }
    return '';
  }
  function putPerson(p){
    const u=drive(p.縮圖網址||p.照片網址||p.圖片網址)||findPhoto('人員',[p.工號,p.員工編號,p.姓名,p.Name]);
    if(u){p.縮圖網址=u;p.照片網址=u;p.圖片網址=u;return 1;} return 0;
  }
  function putProduct(p){
    const u=drive(p.產品縮圖網址||p.產品照片網址||p.縮圖網址||p.照片網址||p.圖片網址)||findPhoto('產品',[p.產品編號,p.料號,p.品號,p.客戶品號,p.客戶料號,p.品名,p.產品名稱]);
    if(u){p.產品縮圖網址=u;p.產品照片網址=u;p.縮圖網址=u;p.照片網址=u;p.圖片網址=u;return 1;} return 0;
  }
  function putMachine(m){
    const id=norm(pick(m,['機台編號','設備編號','主機台']));
    const u=drive(m.機台照片網址||m.縮圖網址||m.照片網址||m.圖片網址)||findPhoto('機台',[id,m.機台名稱,m.設備名稱,m.名稱]);
    if(u){if(id)m.機台編號=id;m.縮圖網址=u;m.照片網址=u;m.機台照片網址=u;m.圖片網址=u;return 1;} return 0;
  }
  function enrichData(data){
    if(!data||!照片索引) return data;
    const people=data.人員||data.people||data.persons||[]; people.forEach(putPerson); data.人員=people; data.people=people; data.persons=people;
    const products=data.產品||data.products||[]; products.forEach(putProduct); data.產品=products; data.products=products;
    const machines=data.機台||data.machines||[]; machines.forEach(putMachine); data.機台=machines; data.machines=machines;
    const machineIndex={}; machines.forEach(m=>{if(m.機台編號)machineIndex[norm(m.機台編號)]=m;});
    const routes=data.報工工站群組||data.routes||data.途程工站群組||[];
    routes.forEach(r=>{
      putProduct(r);
      if(Array.isArray(r.機台清單)){
        r.機台清單=r.機台清單.map(m=>{const id=norm(m.機台編號||m.主機台||m.設備編號);const base=Object.assign({},machineIndex[id]||{},m);putMachine(base);return base;});
      }
    });
    data.報工工站群組=routes; data.routes=routes; data.途程工站群組=routes;
    return data;
  }
  function rebuildProductList(){
    if(!window.DB) return;
    const map=new Map();
    (DB.workstationGroups||[]).forEach(gr=>{if(gr.產品編號){const key=gr.產品編號+'|'+gr.品名;map.set(key,gr);}});
    (DB.products||DB.產品||[]).forEach(p=>{const pid=norm(p.產品編號||p.料號||p.品號);const name=S(p.品名||p.產品名稱);if(!pid)return;const key=pid+'|'+name;if(map.has(key)){const old=map.get(key); if(!drive(old.產品照片網址||old.產品縮圖網址||old.照片網址)) Object.assign(old,{產品照片網址:p.產品照片網址||p.照片網址||'',產品縮圖網址:p.產品縮圖網址||p.縮圖網址||p.照片網址||'',照片網址:p.照片網址||p.產品照片網址||''});}else map.set(key,Object.assign({},p,{產品編號:pid,品名:name,產品照片網址:p.產品照片網址||p.照片網址||'',產品縮圖網址:p.產品縮圖網址||p.縮圖網址||p.照片網址||''}));});
    DB.productList=Array.from(map.values()).sort((a,b)=>S(a.品名).localeCompare(S(b.品名),'zh-Hant'));
  }
  async function applyLive(){
    await 讀照片主檔();
    if(!window.DB||!照片索引) return false;
    const hasData=(DB.persons&&DB.persons.length)||(DB.productList&&DB.productList.length)||(DB.workstationGroups&&DB.workstationGroups.length);
    if(!hasData) return false;
    const data=enrichData({人員:DB.persons||[],產品:DB.products||DB.產品||DB.productList||[],機台:DB.machines||DB.機台||[],報工工站群組:DB.workstationGroups||[],routes:DB.workstationGroups||[]});
    DB.persons=data.人員||DB.persons||[];
    DB.products=data.產品||data.products||DB.products||[];
    DB.machines=data.機台||data.machines||DB.machines||[];
    DB.workstationGroups=data.報工工站群組||DB.workstationGroups||[];
    rebuildProductList();
    try{if(typeof buildPersonGrid==='function')buildPersonGrid();}catch(e){}
    try{if(typeof buildProductGrid==='function')buildProductGrid();}catch(e){}
    try{if(window.STATE&&STATE.currentWorkstation&&typeof renderMachineGrid==='function')renderMachineGrid(STATE.currentWorkstation.機台清單||[]);}catch(e){}
    toggleSelectedPersonCard();
    return true;
  }
  function selectedPersonCard(){const d=document.getElementById('selectedPersonDisplay');return d?d.closest('.glass-card'):null;}
  function toggleSelectedPersonCard(){
    const card=selectedPersonCard(); if(!card) return;
    const chosen=!!(window.STATE&&STATE.operator)||!!(document.getElementById('personId')&&document.getElementById('personId').value);
    card.style.display=chosen?'':'none';
  }
  function patchBridge(){
    if(已包裝Bridge||!window.V4Bridge||typeof V4Bridge.loadInit!=='function') return;
    已包裝Bridge=true;
    const old=V4Bridge.loadInit.bind(V4Bridge);
    V4Bridge.loadInit=async function(){const data=await old();await 讀照片主檔();return enrichData(data);};
  }
  function patchOnDataLoaded(){
    if(已包裝OnData||typeof window.onDataLoaded!=='function') return;
    已包裝OnData=true;
    const old=window.onDataLoaded;
    window.onDataLoaded=function(){const r=old.apply(this,arguments);setTimeout(applyLive,80);setTimeout(applyLive,500);setTimeout(toggleSelectedPersonCard,50);return r;};
  }
  function patchSelectAndReset(){
    if(!已包裝Select&&typeof window.selectPerson==='function'){
      已包裝Select=true;
      const old=window.selectPerson;
      window.selectPerson=function(){const card=selectedPersonCard();if(card)card.style.display='';const r=old.apply(this,arguments);setTimeout(toggleSelectedPersonCard,50);return r;};
    }
    if(!已包裝Reset&&typeof window.resetAfterSubmit==='function'){
      已包裝Reset=true;
      const old=window.resetAfterSubmit;
      window.resetAfterSubmit=function(){const r=old.apply(this,arguments);setTimeout(toggleSelectedPersonCard,50);return r;};
    }
  }
  function boot(){patchBridge();patchOnDataLoaded();patchSelectAndReset();toggleSelectedPersonCard();applyLive();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  setTimeout(boot,200);setTimeout(boot,800);setTimeout(applyLive,1800);setTimeout(applyLive,3200);setInterval(()=>{patchBridge();patchOnDataLoaded();patchSelectAndReset();toggleSelectedPersonCard();},1000);
})();
