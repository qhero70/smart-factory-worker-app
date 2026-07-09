/* 化新報工 V4｜v4.9.2 照片還原層
 * 只做一件事：從 06_照片資料庫 還原人員、產品、機台照片。
 * 不改班別、不改開場、不改報工寫入、不改 UI 流程。
 */
(function(){
  'use strict';
  if(window.__HUAXIN_PHOTO_RESTORE_492__) return;
  window.__HUAXIN_PHOTO_RESTORE_492__ = true;

  const SS=(window.PWA_CONFIG&&window.PWA_CONFIG.SPREADSHEET_ID)||'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  const SHEET='06_照片資料庫';
  let 照片索引=null, 讀取中=false, 已包裝Bridge=false, 已套用=false;

  function S(v){return String(v==null?'':v).trim();}
  function norm(v){return S(v).replace(/\.0$/,'').trim();}
  function lower(v){return norm(v).toLowerCase();}
  function cleanName(v){return norm(v).replace(/\.(jpg|jpeg|png|webp)$/i,'');}
  function uniq(a){const m={};return (a||[]).filter(Boolean).filter(x=>!m[x]&&(m[x]=1));}
  function pick(o,ks){o=o||{};for(const k of ks){if(o[k]!=null&&S(o[k])!=='')return S(o[k]);}return'';}
  function drive(v){
    let s=S(v); if(!s) return '';
    if(/^https:\/\/drive\.google\.com\/thumbnail\?id=/i.test(s)) return s.replace(/sz=w\d+/,'sz=w1000');
    const m1=s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const m2=s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const m3=s.match(/[-\w]{25,}/);
    const id=(m1&&m1[1])||(m2&&m2[1])||((s.includes('drive.google.com')||s.includes('docs.google.com'))&&(m3&&m3[0]));
    if(id) return 'https://drive.google.com/thumbnail?id='+id+'&sz=w1000';
    return /^https?:\/\//i.test(s)?s:'';
  }
  function urlFromRow(r){
    const byUrl=drive(pick(r,['縮圖網址','照片網址','圖片網址','網址','連結','URL','url','image','photo']));
    if(byUrl) return byUrl;
    const id=pick(r,['檔案ID','Google檔案ID','FILE_ID','fileId','Drive檔案ID']);
    return id ? 'https://drive.google.com/thumbnail?id='+id+'&sz=w1000' : '';
  }
  function 類型(v){
    const s=S(v);
    if(s.includes('人')) return '人員';
    if(s.includes('機')||s.includes('設備')) return '機台';
    return '產品';
  }
  function keysFromRow(r){
    const raw=[pick(r,['對應ID','對應編號','主鍵','工號','員工編號','產品編號','料號','客戶品號','機台編號','設備編號']),pick(r,['名稱','姓名','品名','產品名稱','機台名稱','設備名稱'])];
    const text=[pick(r,['網址','備註','檔名','文件名']), ...Object.values(r||{}).map(S)].join(' ');
    const names=(text.match(/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)/ig)||[]).map(cleanName);
    return uniq([...raw,...names].map(cleanName));
  }
  async function readPhotoSheet(){
    if(照片索引) return 照片索引;
    if(讀取中){await new Promise(r=>setTimeout(r,250)); return 照片索引;}
    讀取中=true;
    try{
      const url='https://docs.google.com/spreadsheets/d/'+SS+'/gviz/tq?tqx=out:json&sheet='+encodeURIComponent(SHEET)+'&_ts='+Date.now();
      const txt=await fetch(url,{cache:'no-store'}).then(r=>r.text());
      const a=txt.indexOf('{'), b=txt.lastIndexOf('}');
      if(a<0||b<a) throw new Error('讀不到 06_照片資料庫');
      const data=JSON.parse(txt.slice(a,b+1));
      const heads=(data.table.cols||[]).map((c,i)=>S(c.label||c.id||('欄'+(i+1))));
      const rows=(data.table.rows||[]).map(row=>{const o={};(row.c||[]).forEach((c,i)=>{if(heads[i])o[heads[i]]=c?(c.f!==undefined?c.f:c.v):'';});return o;}).filter(o=>Object.values(o).some(x=>S(x)!==''));
      const idx={人員:{},產品:{},機台:{}};
      function add(t,k,u){k=cleanName(k);u=drive(u);if(!idx[t]||!k||!u)return;idx[t][k]=idx[t][k]||u;idx[t][lower(k)]=idx[t][lower(k)]||u;}
      rows.forEach(r=>{
        if(S(pick(r,['啟用','是否啟用']))==='否') return;
        const t=類型(pick(r,['類型','照片類型','分類','資料類型']));
        const u=urlFromRow(r); if(!u) return;
        keysFromRow(r).forEach(k=>add(t,k,u));
      });
      照片索引=idx;
      return idx;
    }catch(e){console.warn('[v492照片還原] 讀取照片主檔失敗',e);return null;}
    finally{讀取中=false;}
  }
  function find(t,keys){
    const idx=照片索引&&照片索引[t]; if(!idx)return'';
    for(const k of (keys||[])){
      const kk=cleanName(k);
      if(kk&&idx[kk]) return idx[kk];
      if(kk&&idx[lower(kk)]) return idx[lower(kk)];
    }
    return '';
  }
  function enrichData(data){
    if(!data||!照片索引) return data;
    const people=data.人員||data.people||data.persons||[];
    people.forEach(p=>{const u=drive(p.縮圖網址||p.照片網址)||find('人員',[p.工號,p.員工編號,p.姓名,p.英文姓名]);if(u){p.縮圖網址=u;p.照片網址=u;p.作業員照片網址=u;}});
    data.人員=people;data.people=people;data.persons=people;

    const products=data.產品||data.products||[];
    products.forEach(p=>{const u=drive(p.產品縮圖網址||p.產品照片網址||p.縮圖網址||p.照片網址)||find('產品',[p.產品編號,p.料號,p.品號,p.客戶品號,p.客戶料號,p.品名,p.產品名稱]);if(u){p.產品縮圖網址=u;p.產品照片網址=u;p.縮圖網址=u;p.照片網址=u;}});
    data.產品=products;data.products=products;

    const machines=data.機台||data.machines||[];
    machines.forEach(m=>{const id=norm(pick(m,['機台編號','設備編號','主機台']));const u=drive(m.縮圖網址||m.照片網址||m.機台照片網址)||find('機台',[id,m.機台名稱,m.設備名稱,m.名稱]);if(u){m.機台編號=id||m.機台編號;m.縮圖網址=u;m.照片網址=u;m.機台照片網址=u;}});
    data.機台=machines;data.machines=machines;

    const mIndex={};machines.forEach(m=>{if(m.機台編號)mIndex[norm(m.機台編號)]=m;});
    const routes=data.報工工站群組||data.routes||data.途程工站群組||[];
    routes.forEach(r=>{
      const pu=drive(r.產品縮圖網址||r.產品照片網址||r.縮圖網址||r.照片網址)||find('產品',[r.產品編號,r.料號,r.品號,r.客戶品號,r.客戶料號,r.品名,r.產品名稱]);
      if(pu){r.產品縮圖網址=pu;r.產品照片網址=pu;r.縮圖網址=pu;r.照片網址=pu;}
      if(Array.isArray(r.機台清單)){
        r.機台清單=r.機台清單.map(m=>{const id=norm(m.機台編號||m.主機台||m.設備編號);const mm=mIndex[id]||{};const mu=drive(m.縮圖網址||m.照片網址||mm.縮圖網址||mm.照片網址)||find('機台',[id,m.機台名稱,m.設備名稱,mm.機台名稱,mm.設備名稱]);return Object.assign({},mm,m,{機台編號:id||m.機台編號,主機台:id||m.主機台,縮圖網址:mu||m.縮圖網址||mm.縮圖網址||'',照片網址:mu||m.照片網址||mm.照片網址||'',機台照片網址:mu||m.機台照片網址||mm.機台照片網址||''});});
      }
    });
    data.報工工站群組=routes;data.routes=routes;data.途程工站群組=routes;
    return data;
  }
  function buildProductListSafe(){
    const map=new Map();
    const products=(window.DB&&(DB.products||DB.產品))||[];
    const routes=(window.DB&&DB.workstationGroups)||[];
    routes.forEach(gr=>{const key=(gr.產品編號||'')+'|'+(gr.品名||'');if(gr.產品編號){map.set(key,gr);}});
    products.forEach(p=>{
      const pid=norm(p.產品編號||p.料號||p.品號);const name=S(p.品名||p.產品名稱);const key=pid+'|'+name;if(!pid)return;
      if(map.has(key)){
        const old=map.get(key); if(!drive(old.產品照片網址||old.產品縮圖網址||old.照片網址)) Object.assign(old,{產品照片網址:p.產品照片網址||p.照片網址||'',產品縮圖網址:p.產品縮圖網址||p.縮圖網址||p.照片網址||''});
      }else map.set(key,Object.assign({},p,{產品編號:pid,品名:name,產品照片網址:p.產品照片網址||p.照片網址||'',產品縮圖網址:p.產品縮圖網址||p.縮圖網址||p.照片網址||''}));
    });
    return Array.from(map.values()).sort((a,b)=>S(a.品名).localeCompare(S(b.品名),'zh-Hant'));
  }
  async function applyToLiveDB(){
    await readPhotoSheet();
    if(!window.DB||!照片索引) return false;
    const data=enrichData({人員:DB.persons||[],產品:DB.products||DB.產品||[],機台:DB.machines||DB.機台||[],報工工站群組:DB.workstationGroups||[],routes:DB.workstationGroups||[]});
    DB.persons=data.人員||DB.persons||[];
    DB.products=data.產品||data.products||DB.products||[];
    DB.machines=data.機台||data.machines||DB.machines||[];
    DB.workstationGroups=data.報工工站群組||DB.workstationGroups||[];
    DB.productList=buildProductListSafe();
    try{buildPersonGrid();}catch(e){}
    try{buildProductGrid();}catch(e){}
    try{if(window.STATE&&STATE.currentWorkstation&&typeof renderMachineGrid==='function')renderMachineGrid(STATE.currentWorkstation.機台清單||[]);}catch(e){}
    已套用=true;
    return true;
  }
  function patchBridge(){
    if(已包裝Bridge||!window.V4Bridge||typeof V4Bridge.loadInit!=='function') return;
    已包裝Bridge=true;
    const old=V4Bridge.loadInit.bind(V4Bridge);
    V4Bridge.loadInit=async function(){
      const data=await old();
      await readPhotoSheet();
      return enrichData(data);
    };
  }
  function boot(){patchBridge();applyToLiveDB();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  setTimeout(boot,300);setTimeout(boot,1200);setTimeout(boot,2500);setInterval(()=>{patchBridge();if(!已套用)applyToLiveDB();},1500);
})();
