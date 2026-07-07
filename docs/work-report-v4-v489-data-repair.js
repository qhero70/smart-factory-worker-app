/* 化新報工 V4｜v4.8.9 資料修復層
 * 只修三件事：05_不良代碼主檔、產品照片、機台照片、選工站彈窗。
 */
(function(){
  'use strict';
  const SS=(window.PWA_CONFIG&&window.PWA_CONFIG.SPREADSHEET_ID)||'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  const SHEETS={產品:'02_產品主檔',機台:'03_機台主檔',不良:'05_不良代碼主檔',照片:'06_照片資料庫'};
  const FALLBACK_CODES=new Set(['Z01','Z02','Z03','Y01','Y02','Y03','Y04']);
  let 補強中=false,已補強=false,已包裝Bridge=false,已包裝OnData=false,已包裝工站=false;

  function S(v){return String(v==null?'':v).trim();}
  function norm(v){return S(v).replace(/\.0$/,'');}
  function safe(s){return S(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function pick(o,ks){o=o||{};for(const k of ks){if(o[k]!=null&&S(o[k])!=='')return S(o[k]);}return'';}
  function lower(v){return S(v).toLowerCase();}
  function uniq(a){const m={};return (a||[]).filter(Boolean).filter(x=>!m[x]&&(m[x]=1));}
  function drive(url){
    let s=S(url); if(!s)return'';
    const m1=s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/),m2=s.match(/[?&]id=([a-zA-Z0-9_-]+)/),m3=s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/),m4=s.match(/[-\w]{25,}/);
    const id=(m1&&m1[1])||(m2&&m2[1])||(m3&&m3[1])||((s.includes('drive.google.com')||s.includes('docs.google.com'))&&(m4&&m4[0]));
    return id?`https://drive.google.com/thumbnail?id=${id}&sz=w1200`:s;
  }
  function splitUrls(v){
    if(!v)return[];
    if(Array.isArray(v))return v.flatMap(splitUrls);
    if(typeof v==='object')return Object.values(v).flatMap(splitUrls);
    const s=S(v); if(!s)return[];
    return uniq(s.split(/[\n,，;；|]+/).map(x=>drive(x)).filter(x=>/^https?:\/\//i.test(x)));
  }
  function allUrlsFromRecord(r){
    const out=[];
    Object.keys(r||{}).forEach(k=>{if(/照片|圖片|縮圖|網址|連結|URL|url|image|photo|Drive/i.test(k))out.push(...splitUrls(r[k]));});
    Object.values(r||{}).forEach(v=>{if(S(v).startsWith('http'))out.push(...splitUrls(v));});
    return uniq(out);
  }
  async function readSheet(sheet){
    const url=`https://docs.google.com/spreadsheets/d/${SS}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&_ts=${Date.now()}`;
    const txt=await fetch(url,{cache:'no-store'}).then(r=>r.text());
    const a=txt.indexOf('{'),b=txt.lastIndexOf('}');
    if(a<0||b<a)throw new Error('讀不到分頁：'+sheet);
    const data=JSON.parse(txt.slice(a,b+1));
    const heads=(data.table.cols||[]).map((c,i)=>S(c.label||c.id||('欄'+(i+1))));
    return (data.table.rows||[]).map(row=>{const o={};(row.c||[]).forEach((c,i)=>{if(heads[i])o[heads[i]]=c?(c.f!==undefined?c.f:c.v):'';});return o;}).filter(o=>Object.values(o).some(x=>S(x)!==''));
  }
  function 建照片索引(photoRows, productRows, machineRows){
    const idx={產品:{},機台:{},人員:{}};
    function add(type,key,url){key=norm(key);url=drive(url);if(!idx[type]||!key||!url||!/^https?:\/\//i.test(url))return;idx[type][key]=idx[type][key]||url;idx[type][lower(key)]=idx[type][lower(key)]||url;}
    (photoRows||[]).forEach(r=>{
      const vals=Object.values(r||{});
      const typeRaw=pick(r,['類型','照片類型','分類','資料類型','照片主鍵'])||vals[0]||'';
      const type=S(typeRaw).includes('機')?'機台':(S(typeRaw).includes('人')?'人員':'產品');
      const urls=allUrlsFromRecord(r); if(!urls.length)return;
      [pick(r,['對應ID','對應編號','主鍵','工號','員工編號','產品編號','料號','客戶品號','機台編號','設備編號']),pick(r,['品名','產品名稱','機台名稱','設備名稱','姓名']),vals[1],vals[2],vals[3]].filter(Boolean).forEach(k=>add(type,k,urls[0]));
    });
    (productRows||[]).forEach(r=>{const urls=allUrlsFromRecord(r); if(!urls.length)return;[pick(r,['產品編號','料號','品號']),pick(r,['客戶品號','客戶料號']),pick(r,['品名','產品名稱'])].filter(Boolean).forEach(k=>add('產品',k,urls[0]));});
    (machineRows||[]).forEach(r=>{const urls=allUrlsFromRecord(r); if(!urls.length)return;[pick(r,['機台編號','設備編號','主機台']),pick(r,['機台名稱','設備名稱','名稱'])].filter(Boolean).forEach(k=>add('機台',k,urls[0]));});
    return idx;
  }
  function findPhoto(idx,type,keys){const b=idx[type]||{};for(const k of keys||[]){const kk=norm(k);if(kk&&b[kk])return b[kk];if(kk&&b[lower(kk)])return b[lower(kk)];}return'';}
  function normalizeDefects(rows){
    const out={Z:[],Y:[]};
    (rows||[]).forEach(r=>{
      if(S(pick(r,['啟用','是否啟用','使用狀態']))==='否')return;
      const code=pick(r,['不良代碼','代碼','Code','code','不良原因代碼']);
      const name=pick(r,['不良名稱','名稱','不良原因','Reason','reason','中文名稱']);
      const en=pick(r,['英文名稱','英文','English','english','英文說明','英文原因']);
      if(!code&&!name)return;
      let cat=(pick(r,['分類','類別','不良分類','責任類型'])||S(code).slice(0,1)||'Y').toUpperCase();
      if(cat!=='Z'&&cat!=='Y')cat=S(code).toUpperCase().startsWith('Z')?'Z':'Y';
      out[cat].push({代碼:code,名稱:name,英文名稱:en,分類:cat,啟用:'是'});
    });
    return out;
  }
  function defectCount(d){return ((d&&d.Z)||[]).length+((d&&d.Y)||[]).length;}
  function looksFallback(d){const arr=[...((d&&d.Z)||[]),...((d&&d.Y)||[])];return arr.length&&arr.every(x=>FALLBACK_CODES.has(S(x.代碼)));}
  function enrichData(data, productRows, machineRows, defectRows, photoRows){
    data=data||{};
    const idx=建照片索引(photoRows,productRows,machineRows);
    const defects=normalizeDefects(defectRows);
    if(defectCount(defects)>0) data.不良原因=defects;
    const products=(data.產品||data.products||productRows||[]).map(p=>Object.assign({},p));
    products.forEach(p=>{
      const u=allUrlsFromRecord(p)[0]||findPhoto(idx,'產品',[p.產品編號,p.料號,p.品號,p.客戶品號,p.客戶料號,p.品名,p.產品名稱]);
      if(u){p.產品照片網址=u;p.產品縮圖網址=u;p.照片網址=u;p.縮圖網址=u;}
    });
    const machines=(data.機台||data.machines||machineRows||[]).map(m=>Object.assign({},m));
    machines.forEach(m=>{
      const id=norm(pick(m,['機台編號','設備編號','主機台']));
      const u=allUrlsFromRecord(m)[0]||findPhoto(idx,'機台',[id,m.機台名稱,m.設備名稱,m.名稱]);
      if(u){m.機台編號=id||m.機台編號;m.照片網址=u;m.縮圖網址=u;m.機台照片網址=u;}
    });
    const mIndex={};machines.forEach(m=>{if(m.機台編號)mIndex[norm(m.機台編號)]=m;});
    const routes=(data.報工工站群組||data.routes||data.途程工站群組||[]).map(r=>Object.assign({},r));
    routes.forEach(r=>{
      const pu=allUrlsFromRecord(r)[0]||findPhoto(idx,'產品',[r.產品編號,r.料號,r.客戶品號,r.品名,r.產品名稱]);
      if(pu){r.產品照片網址=pu;r.產品縮圖網址=pu;r.照片網址=pu;r.縮圖網址=pu;}
      if(Array.isArray(r.機台清單)){
        r.機台清單=r.機台清單.map(m=>{
          const id=norm(m.機台編號||m.主機台||m.設備編號); const mm=mIndex[id]||{};
          const mu=allUrlsFromRecord(m)[0]||mm.照片網址||mm.縮圖網址||findPhoto(idx,'機台',[id,m.機台名稱,m.設備名稱,mm.機台名稱,mm.設備名稱]);
          return Object.assign({},mm,m,{機台編號:id,主機台:id,照片網址:mu||'',縮圖網址:mu||'',機台照片網址:mu||''});
        });
      }
    });
    data.產品=products;data.products=products;data.機台=machines;data.machines=machines;data.報工工站群組=routes;data.routes=routes;
    data.筆數=data.筆數||{};data.筆數.不良原因=defectCount(data.不良原因);data.筆數.產品=products.length||data.筆數.產品;data.筆數.機台=machines.length||data.筆數.機台;
    return data;
  }
  async function fetchMasterBundle(){
    const [products,machines,defects,photos]=await Promise.all([
      readSheet(SHEETS.產品).catch(()=>[]),readSheet(SHEETS.機台).catch(()=>[]),readSheet(SHEETS.不良).catch(()=>[]),readSheet(SHEETS.照片).catch(()=>[])
    ]);
    return {products,machines,defects,photos};
  }
  async function 補強目前資料(force){
    if(補強中)return; if(已補強&&!force)return; 補強中=true;
    try{
      const bundle=await fetchMasterBundle();
      const base={人員:(window.DB&&DB.persons)||[],產品:(window.DB&&DB.products)||[],機台:(window.DB&&DB.machines)||[],報工工站群組:(window.DB&&DB.workstationGroups)||[],不良原因:(window.DB&&DB.ngReasons)||{Z:[],Y:[]},筆數:(window.DB&&DB.counts)||{}};
      const data=enrichData(base,bundle.products,bundle.machines,bundle.defects,bundle.photos);
      if(window.DB){
        DB.ngReasons=data.不良原因||DB.ngReasons;
        DB.products=data.產品||data.products||DB.products||[];
        DB.machines=data.機台||data.machines||DB.machines||[];
        DB.workstationGroups=data.報工工站群組||DB.workstationGroups||[];
        DB.productList=buildProductListFromRoutesAndProducts(DB.workstationGroups,DB.products);
        DB.counts=Object.assign({},DB.counts||{},data.筆數||{});
        try{renderDefectRows();}catch(e){}
        try{buildProductGrid();}catch(e){}
        try{fillStatusPill&&fillStatusPill();}catch(e){}
      }
      已補強=true;
    }catch(e){console.warn('[V489] 補強目前資料失敗',e);}finally{補強中=false;}
  }
  function buildProductListFromRoutesAndProducts(routes,products){
    const map=new Map();
    (routes||[]).forEach(gr=>{const key=(gr.產品編號||'')+'|'+(gr.品名||'');if(gr.產品編號&&!map.has(key))map.set(key,gr);});
    (products||[]).forEach(p=>{const pid=norm(p.產品編號||p.料號||p.品號);const name=S(p.品名||p.產品名稱);const key=pid+'|'+name;if(pid&&!map.has(key))map.set(key,Object.assign({},p,{產品編號:pid,品名:name,產品照片網址:p.產品照片網址||p.照片網址||p.縮圖網址||'',產品縮圖網址:p.產品縮圖網址||p.照片網址||p.縮圖網址||''}));});
    return Array.from(map.values()).sort((a,b)=>S(a.品名).localeCompare(S(b.品名),'zh-Hant'));
  }
  function patchBridge(){
    if(已包裝Bridge||!window.V4Bridge||typeof V4Bridge.loadInit!=='function')return;
    已包裝Bridge=true;
    const old=V4Bridge.loadInit.bind(V4Bridge);
    V4Bridge.loadInit=async function(){
      const data=await old();
      try{const b=await fetchMasterBundle();return enrichData(data,b.products,b.machines,b.defects,b.photos);}catch(e){console.warn('[V489] bridge enrich failed',e);return data;}
    };
  }
  function patchOnDataLoaded(){
    if(已包裝OnData||typeof window.onDataLoaded!==='function')return;
    已包裝OnData=true;
    const old=window.onDataLoaded;
    window.onDataLoaded=function(data){
      const r=old.apply(this,arguments);
      setTimeout(()=>補強目前資料(false),120);
      return r;
    };
  }
  function ensureCenterModal(){
    if(document.getElementById('centerSelectModal'))return;
    const style=document.createElement('style');style.textContent='.center-select-mask{position:fixed;inset:0;z-index:12050;background:rgba(8,15,35,.72);backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:18px}.center-select-mask.hidden{display:none!important}.center-select-box{width:min(92vw,430px);background:#fff;border-radius:24px;padding:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);text-align:center}.center-select-image-wrap{margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.center-select-main-image{width:100%;aspect-ratio:1/1;border-radius:16px;object-fit:cover;background:#e8eef8}.center-select-info{text-align:left;margin-top:12px;background:#eef5ff;border-radius:14px;padding:12px;font-weight:800;font-size:13px;line-height:1.6}.center-select-title{font-size:20px;font-weight:950}.center-select-sub{font-size:12px;color:#667085}.center-select-btns{margin-top:12px;display:grid;grid-template-columns:1fr;gap:8px}.center-select-empty{height:90px;border-radius:16px;background:#e8eef8;display:flex;align-items:center;justify-content:center;font-weight:900;color:#1967d2}';document.head.appendChild(style);
    const div=document.createElement('div');div.id='centerSelectModal';div.className='center-select-mask hidden';div.innerHTML='<div class="center-select-box"><div class="center-select-title" id="centerSelectTitle">已選定</div><div class="center-select-sub" id="centerSelectSub">Selected</div><div id="centerSelectImageWrap" class="center-select-image-wrap"></div><div id="centerSelectInfo" class="center-select-info"></div><div class="center-select-btns"><button type="button" class="btn-primary ripple" onclick="closeCenterSelectModal()">確認 / OK</button></div></div>';document.body.appendChild(div);
    window.closeCenterSelectModal=function(){document.getElementById('centerSelectModal')?.classList.add('hidden');};
    window.showCenterSelectModal=function(o){o=o||{};ensureCenterModal();const imgs=(o.images||[]).filter(Boolean);document.getElementById('centerSelectTitle').textContent=o.title||'已選定';document.getElementById('centerSelectSub').textContent=o.sub||'';document.getElementById('centerSelectImageWrap').innerHTML=imgs.length?imgs.slice(0,6).map(u=>`<img class="center-select-main-image" src="${safe(u)}" onerror="this.outerHTML='<div class=center-select-empty>無照片</div>'">`).join(''):'<div class="center-select-empty" style="grid-column:1/-1">無照片</div>';document.getElementById('centerSelectInfo').innerHTML=o.infoHtml||'';document.getElementById('centerSelectModal').classList.remove('hidden');clearTimeout(window.__centerSelectTimer);window.__centerSelectTimer=setTimeout(window.closeCenterSelectModal,2200);};
  }
  function patchWorkstation(){
    if(已包裝工站||typeof window.onWorkstationChange!=='function')return;
    已包裝工站=true;ensureCenterModal();
    const old=window.onWorkstationChange;
    window.onWorkstationChange=function(){
      const r=old.apply(this,arguments);
      setTimeout(()=>{
        const gr=window.STATE&&STATE.currentWorkstation; if(!gr)return;
        const area=document.getElementById('routeDetailsArea'); if(area)area.classList.remove('hidden');
        const imgs=[];imgs.push(...allUrlsFromRecord(gr));(gr.機台清單||[]).forEach(m=>imgs.push(...allUrlsFromRecord(m)));
        const machineNos=(gr.機台清單||[]).map(x=>x.機台編號).filter(Boolean).join('、')||gr.機台編號||'無';
        showCenterSelectModal({title:'已選定工站',sub:'Workstation Selected',images:uniq(imgs),infoHtml:`<div><b>工站：</b>${safe(gr.報工工站名稱||gr.工站名稱||'')}</div><div><b>工序：</b>${safe(gr.工序範圍||gr.工序||'')}</div><div><b>機台：</b>${safe(machineNos)}</div>`});
      },60);
      return r;
    };
  }
  function hideStaticLoading(){
    if(document.getElementById('v489_hide_static_loading'))return;
    const st=document.createElement('style');st.id='v489_hide_static_loading';st.textContent='#loadingScreen{display:none!important}.product-thumb span{font-size:0!important}.product-thumb span::after{content:"";display:block;width:100%;height:100%;background:linear-gradient(135deg,#eaf3ff,#dbeafe)}';document.head.appendChild(st);
    const old=window.showLoading;
    if(typeof old==='function'&&!window.__v489_showLoading){window.__v489_showLoading=true;window.showLoading=function(show){if(show){const el=document.getElementById('loadingScreen');if(el)el.style.display='none';return;}return old.apply(this,arguments);};}
  }
  function boot(){hideStaticLoading();patchBridge();patchOnDataLoaded();patchWorkstation();setTimeout(()=>補強目前資料(false),1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  setInterval(boot,700);
})();
