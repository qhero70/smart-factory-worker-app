/* 化新報工 V4｜正式穩定版 v5.0.0
 * 單一正式主控 JS：資料載入、照片、班別、選定人員置中、產品工站、品質不良、送出報工。
 * 不再疊加零碎補丁；正式入口只引用本檔 + pwa-config + gas-bridge + 開場粒子。
 */
(function(){
  'use strict';

  const APP_VERSION = 'v5.0.0-official';
  const MAX_PHOTOS = 12;
  const WORK_DATE_CUTOFF = '06:10';
  const NORMAL_WORK_MIN = 480;
  const SHIFT_RULES = {
    '早班': { code:'DAY', name:'早班', start:'08:00', end:'16:50', overnight:false, breaks:[['10:00','10:10'],['12:10','12:40'],['14:40','14:50']] },
    '中班': { code:'SWING', name:'中班', start:'16:50', end:'01:40', overnight:true, breaks:[['18:50','19:00'],['21:00','21:30'],['23:30','23:40']] },
    '夜班': { code:'NIGHT', name:'夜班', start:'23:00', end:'07:50', overnight:true, breaks:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']] }
  };

  const DB = window.DB = {
    persons: [], products: [], machines: [], routes: [], productList: [], defects: {Z:[], Y:[]}, anomalyTypes: [], counts: {}
  };
  const STATE = window.STATE = {
    step: 0,
    operator: null,
    product: null,
    routesForProduct: [],
    route: null,
    machine: null,
    photos: [],
    defectRows: [],
    stepDone: [false,false,false,false,false],
    scan: {personStream:null, productStream:null, personTimer:null, productTimer:null, personDetector:null, productDetector:null},
    workCalc: null,
    editingPhotoIndex: -1
  };
  let defectSeq = 0;
  let topbarTimer = null;
  let selectedPopTimer = null;

  function E(id){ return document.getElementById(id); }
  function Q(sel, root){ return (root||document).querySelector(sel); }
  function QA(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function S(v){ return String(v == null ? '' : v).trim(); }
  function N(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function esc(v){ return S(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function attr(v){ return esc(v).replace(/\n/g,''); }
  function val(id){ const x=E(id); return x ? x.value : ''; }
  function setVal(id,v){ const x=E(id); if(x) x.value = v == null ? '' : v; }
  function norm(v){ return S(v).replace(/\.0$/,''); }
  function lower(v){ return norm(v).toLowerCase(); }
  function unique(arr){ const seen={}; return (arr||[]).filter(Boolean).filter(x => !seen[x] && (seen[x]=true)); }
  function pad(n){ return String(n).padStart(2,'0'); }
  function driveUrl(v){
    const s=S(v); if(!s) return '';
    const m1=s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const m2=s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const m3=s.match(/[-\w]{25,}/);
    const id=(m1&&m1[1])||(m2&&m2[1])||((s.includes('drive.google.com')||s.includes('docs.google.com'))&&(m3&&m3[0]));
    if(id) return 'https://drive.google.com/thumbnail?id='+id+'&sz=w1200';
    return /^https?:\/\//i.test(s) ? s : '';
  }
  function imgTag(url, fallback, cls){
    const u=driveUrl(url);
    return u ? `<img class="${cls||''}" src="${attr(u)}" alt="${attr(fallback||'照片')}" loading="lazy" onerror="this.remove();this.parentElement.classList.add('no-photo')">` : '';
  }

  function injectOfficialCss(){
    if(E('hx-official-v500-style')) return;
    const st=document.createElement('style');
    st.id='hx-official-v500-style';
    st.textContent = `
      .hidden{display:none!important}.v500-hide{display:none!important}
      .person-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:none;overflow:visible;padding:2px 2px 18px}.product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:2px 2px 16px}.machine-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
      .person-card,.product-card,.machine-card{position:relative;overflow:hidden;border-radius:18px;background:#111827;min-height:158px;border:1px solid rgba(66,133,244,.22);box-shadow:0 8px 20px rgba(15,23,42,.12);cursor:pointer;transform:translateZ(0);touch-action:pan-y}.product-card{min-height:176px}.machine-card{min-height:142px;padding:0!important}
      .person-card img,.product-card img,.machine-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.person-card::after,.product-card::after,.machine-card::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.15) 42%,rgba(0,0,0,.78));pointer-events:none}.person-card.no-photo::before,.product-card.no-photo::before,.machine-card.no-photo::before{content:attr(data-initial);position:absolute;inset:0;display:grid;place-items:center;font-size:44px;font-weight:900;color:#1967D2;background:linear-gradient(180deg,#1f2937,#020617)}
      .person-info,.product-info,.machine-info-panel{position:absolute;left:8px;right:8px;bottom:8px;z-index:2;text-align:center;color:white;background:rgba(0,0,0,.58);border-radius:14px;padding:7px 5px;backdrop-filter:blur(8px)}.person-info b,.product-info b,.machine-info-panel b{display:block;font-size:15px;line-height:1.15;font-weight:950;text-shadow:0 1px 2px rgba(0,0,0,.6)}.person-info span,.product-info span,.machine-info-panel span{display:block;font-size:12px;font-weight:900;opacity:.92;margin-top:3px}.shift-badge,.selected-badge{position:absolute;z-index:3;right:7px;top:7px;background:rgba(0,0,0,.74);color:#fff;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:900}.selected-badge{display:none;left:7px;right:auto;background:#34A853}.person-card.selected .selected-badge,.product-card.selected .selected-badge,.machine-card.selected .selected-badge{display:block}.person-card.selected,.product-card.selected,.machine-card.selected{outline:3px solid rgba(66,133,244,.55);box-shadow:0 0 0 4px rgba(66,133,244,.18),0 12px 30px rgba(25,103,210,.28)}
      #selectedPersonCard{display:none}.selected-person-pop{animation:selectedPersonPop500 .55s cubic-bezier(.34,1.56,.64,1);box-shadow:0 18px 54px rgba(52,168,83,.28),0 0 0 3px rgba(52,168,83,.18)!important;border-color:rgba(52,168,83,.45)!important}@keyframes selectedPersonPop500{0%{transform:scale(.94);opacity:.2}45%{transform:scale(1.035);opacity:1}100%{transform:scale(1);opacity:1}}
      .selected-person-display.populated{background:rgba(230,244,234,.9);border:1.5px solid rgba(52,168,83,.35)}.person-photo-lg img{width:80px;height:80px;object-fit:cover;border-radius:14px}.person-photo-lg.no-photo{font-size:13px}.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.photo-item{position:relative;aspect-ratio:1;border-radius:14px;overflow:hidden;background:#e8eef8}.photo-item img{width:100%;height:100%;object-fit:cover}.photo-delete-btn{position:absolute;right:5px;top:5px;z-index:2}.toast{z-index:13000}.roar-container{z-index:13010}.bottom-bar{z-index:120}
      @media(max-width:420px){.person-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.person-card{min-height:124px;border-radius:15px}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.product-card{min-height:144px}.machine-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.person-info b,.product-info b,.machine-info-panel b{font-size:12.5px}.person-info span,.product-info span,.machine-info-panel span{font-size:10.5px}.guide-card{padding:10px 12px}.glass-card{padding:14px}.bottom-bar{padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))}}
    `;
    document.head.appendChild(st);
  }

  function parseShift(raw){
    const s=S(raw).toUpperCase();
    if(s.includes('NIGHT')||s.includes('大夜')||s.includes('夜班')||s==='夜') return '夜班';
    if(s.includes('SWING')||s.includes('中班')||s==='中') return '中班';
    return '早班';
  }
  function minutes(t){ const [h,m]=S(t||'00:00').split(':').map(Number); return (h||0)*60+(m||0); }
  function dateBase(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0); }
  function localValue(d){ return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
  function dateSlash(d){ return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`; }
  function dateYMD(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function workDateBase(){ const now=new Date(), b=dateBase(now); if(now.getHours()*60+now.getMinutes() < minutes(WORK_DATE_CUTOFF)) b.setDate(b.getDate()-1); return b; }
  function workDateFromDate(d){ const x=new Date(d); if(x.getHours()*60+x.getMinutes() < minutes(WORK_DATE_CUTOFF)) x.setDate(x.getDate()-1); return dateYMD(x); }
  function dateAt(base, time, rule){ const d=dateBase(base); if(rule.overnight && minutes(time) < minutes(rule.start)) d.setDate(d.getDate()+1); const [h,m]=S(time).split(':').map(Number); d.setHours(h||0,m||0,0,0); return d; }
  function overlap(a1,a2,b1,b2){ const s=Math.max(a1.getTime(),b1.getTime()), e=Math.min(a2.getTime(),b2.getTime()); return Math.max(0, Math.round((e-s)/60000)); }
  function calcHours(start,end,rule){
    if(!(start instanceof Date)||!(end instanceof Date)||isNaN(start)||isNaN(end)) return null;
    if(end <= start) end = new Date(end.getTime()+24*60*60000);
    const base=dateBase(start);
    const normalStart=dateAt(base, rule.start, rule);
    let normalEnd=dateAt(base, rule.end, rule); if(normalEnd <= normalStart) normalEnd.setDate(normalEnd.getDate()+1);
    let breakMin=0;
    rule.breaks.forEach(b=>{ let bs=dateAt(base,b[0],rule), be=dateAt(base,b[1],rule); if(be<=bs) be.setDate(be.getDate()+1); breakMin += overlap(start,end,bs,be); });
    const gross=Math.max(0,Math.round((end-start)/60000));
    const net=Math.max(0,gross-breakMin);
    const isOT = start < normalStart || end > normalEnd || net > NORMAL_WORK_MIN;
    const normal=Math.min(net,NORMAL_WORK_MIN);
    const ot=isOT ? Math.max(0,net-NORMAL_WORK_MIN) : 0;
    return {shift:rule.name, code:rule.code, start:rule.start, end:rule.end, gross, breakMin, net, normal, ot, isOT, normalStart, normalEnd};
  }
  function currentShift(){ return parseShift((STATE.operator&&(STATE.operator.班別名稱||STATE.operator.班別)) || val('shiftSelect') || '早班'); }
  function setDefaultTimes(){
    const name=currentShift(); const r=SHIFT_RULES[name]||SHIFT_RULES['早班']; const base=workDateBase();
    buildShiftSelect(name);
    setVal('shiftSelect', r.name);
    setVal('startTime', localValue(dateAt(base,r.start,r)));
    setVal('endTime', localValue(dateAt(base,r.end,r)));
    calcWorkingHours();
  }
  function calcWorkingHours(){
    const r=SHIFT_RULES[parseShift(val('shiftSelect'))]||SHIFT_RULES['早班'];
    const c=calcHours(new Date(val('startTime')), new Date(val('endTime')), r);
    STATE.workCalc = c;
    if(c){
      setVal('workingHours',(c.net/60).toFixed(2)+' hrs');
      setVal('overtimeSelect', c.isOT ? '是' : '否');
      setVal('overtimeType', c.isOT ? (val('overtimeType') && val('overtimeType') !== '無' ? val('overtimeType') : '平日加班') : '無');
    }
    updatePreview(); updateConfirmSummary(); updateTopbarTime();
  }
  function buildShiftSelect(selected){
    const s=E('shiftSelect'); if(!s) return;
    const sel=parseShift(selected || s.value || (STATE.operator&&(STATE.operator.班別名稱||STATE.operator.班別)) || '早班');
    const list=sel==='夜班' ? ['早班','中班','夜班'] : ['早班','中班'];
    s.innerHTML=''; list.forEach(x=>s.add(new Option(x,x))); s.value=sel;
  }
  function timePartText(h){ if(h<6) return '凌晨'; if(h<12) return '早上'; if(h<18) return '下午'; return '晚上'; }
  function updateTopbarTime(){
    let el=E('work-date-display'); const status=E('statusPill');
    if(!el && status){ el=document.createElement('div'); el.id='work-date-display'; el.style.cssText='margin-top:6px;font-size:11px;font-weight:900;color:rgba(255,255,255,.95);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'; status.insertAdjacentElement('afterend',el); }
    if(!el) return; const now=new Date();
    const label=STATE.operator ? currentShift() : '未選班別';
    el.textContent = `${label}｜${timePartText(now.getHours())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}｜作業日 ${dateSlash(workDateBase())}`;
  }
  function startTopbar(){ clearInterval(topbarTimer); updateTopbarTime(); topbarTimer=setInterval(updateTopbarTime,1000); }

  function setStatus(text, type){
    const t=E('statusText'), d=E('statusDot');
    if(t) t.textContent=text;
    if(d){ d.className='status-dot'+(type==='ok'?' connected':type==='error'?' error':''); }
  }
  function toast(msg){ const t=E('toast'); if(!t) return; t.textContent=msg; t.classList.remove('hidden'); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.add('hidden'),2200); }
  function roar(icon,title,sub,type){
    const c=E('roarContainer'); if(!c){ toast(`${title} ${sub||''}`); return; }
    const div=document.createElement('div'); div.className='roar-notif '+(type||'');
    div.innerHTML=`<div class="roar-icon">${icon||'ℹ️'}</div><div class="roar-text"><div class="roar-title">${esc(title)}</div><div class="roar-sub">${esc(sub||'')}</div></div><button class="roar-close" type="button">✕</button>`;
    div.querySelector('button').onclick=()=>div.remove(); c.appendChild(div); setTimeout(()=>div.remove(),4200);
  }
  function showSubmit(show,title,sub){ const o=E('submitOverlay'); if(!o) return; if(show){ if(E('submitTitle')) E('submitTitle').textContent=title||'📤 報工送出中...'; if(E('submitSub')) E('submitSub').textContent=sub||'Submitting...'; o.classList.remove('hidden'); } else o.classList.add('hidden'); }

  async function reloadData(){
    injectOfficialCss(); setStatus('🟡 正在連線主資料庫... Connecting to database...','loading');
    try{
      if(!window.V4Bridge || typeof V4Bridge.loadInit !== 'function') throw new Error('V4Bridge 尚未載入');
      const data = await V4Bridge.loadInit();
      DB.persons = data.人員 || data.people || [];
      DB.products = data.產品 || data.products || [];
      DB.machines = data.機台 || data.machines || [];
      DB.routes = data.報工工站群組 || data.routes || data.途程工站群組 || [];
      DB.productList = data.產品清單 || data.productList || buildProductList();
      DB.defects = data.不良原因 || data.defects || {Z:[],Y:[]};
      DB.anomalyTypes = data.異常類型 || ['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'];
      DB.counts = data.筆數 || {};
      setStatus(`🟢 資料已載入 / Loaded｜人員：${DB.persons.length}｜產品：${DB.productList.length}｜工站群組：${DB.routes.length}`,'ok');
      buildShiftSelect('早班'); renderPeople(); renderProducts(); renderDefectRows(); initAnomalyTypes(); hideSelectedPerson();
      roar('✅','資料已載入','人員 '+DB.persons.length+'｜產品 '+DB.productList.length+'｜工站群組 '+DB.routes.length,'success');
    }catch(e){ setStatus('🔴 資料載入失敗：'+(e.message||e),'error'); roar('❌','資料載入失敗',e.message||String(e),'error'); }
  }
  function buildProductList(){
    const map=new Map();
    DB.routes.forEach(r=>{ const key=(r.產品編號||'')+'|'+(r.品名||''); if(r.產品編號 && !map.has(key)) map.set(key,r); });
    DB.products.forEach(p=>{ const key=(p.產品編號||'')+'|'+(p.品名||''); if(p.產品編號 && !map.has(key)) map.set(key,p); });
    return Array.from(map.values()).sort((a,b)=>S(a.品名).localeCompare(S(b.品名),'zh-Hant'));
  }
  function shiftIcon(s){ const x=parseShift(s); return x==='夜班'?'🌙':x==='中班'?'🌇':'☀️'; }
  function initial(name){ return S(name).charAt(0)||'?'; }
  function renderPeople(){
    const grid=E('personGrid'); if(!grid) return; const kw=lower(val('personSearch'));
    const rows=DB.persons.filter(p=>p.啟用!=='否').filter(p=>!kw || lower([p.姓名,p.工號,p.班別,p.班別名稱,p.部門].join(' ')).includes(kw));
    grid.innerHTML=rows.map((p,i)=>{
      const realIndex=DB.persons.indexOf(p); const url=p.照片網址||p.縮圖網址||p.圖片網址; const no=url?'':' no-photo';
      return `<div class="person-card${no}" data-index="${realIndex}" data-initial="${attr(initial(p.姓名))}">
        ${imgTag(url,p.姓名,'')}
        <span class="selected-badge">✓ 已選</span><span class="shift-badge">${shiftIcon(p.班別名稱||p.班別)} ${esc(parseShift(p.班別名稱||p.班別))}</span>
        <div class="person-info"><b>${esc(p.姓名||'未命名')}</b><span>${esc(p.工號||'')}</span></div>
      </div>`;
    }).join('');
    grid.onclick=e=>{ const card=e.target.closest('.person-card'); if(card) selectPerson(Number(card.dataset.index)); };
    if(E('personGridEmpty')) E('personGridEmpty').classList.toggle('hidden', rows.length>0);
  }
  function filterPersons(){ renderPeople(); }
  function selectPerson(index){
    const p=DB.persons[index]; if(!p) return;
    STATE.operator=p; QA('.person-card').forEach(c=>c.classList.toggle('selected', Number(c.dataset.index)===index));
    setVal('personName',p.姓名||''); setVal('personId',p.工號||''); if(E('empIdHighlight')) E('empIdHighlight').textContent=p.工號||'未輸入';
    buildShiftSelect(parseShift(p.班別名稱||p.班別)); setDefaultTimes();
    const disp=E('selectedPersonDisplay'); if(disp){
      const url=p.照片網址||p.縮圖網址||p.圖片網址;
      disp.className='selected-person-display populated';
      disp.innerHTML=`<div class="person-photo-lg ${url?'':'no-photo'}">${imgTag(url,p.姓名,'') || esc(initial(p.姓名))}</div><div><div class="person-info-name">${esc(p.姓名||'')} <span style="font-size:13px;color:var(--text-secondary)">${esc(p.工號||'')}</span></div><div class="caption" style="margin-top:4px">${esc([p.部門,parseShift(p.班別名稱||p.班別),p.職稱].filter(Boolean).join('｜'))}</div></div>`;
    }
    showSelectedPersonAndCenter(); STATE.stepDone[0]=true; updateStepper(); updatePreview(); updateConfirmSummary();
    roar('👤','已選定人員',`${p.姓名||''} ${p.工號||''}`,'success');
  }
  function selectedPersonCard(){ const d=E('selectedPersonDisplay'); return d ? d.closest('.glass-card') : null; }
  function hideSelectedPerson(){ const c=selectedPersonCard(); if(c&&!STATE.operator&&!val('personId')) c.style.display='none'; }
  function showSelectedPersonAndCenter(){
    const c=selectedPersonCard(); if(!c) return; c.style.display='';
    function run(){
      const card=selectedPersonCard(); if(!card) return;
      const vv=window.visualViewport; const vh=vv?vv.height:(window.innerHeight||document.documentElement.clientHeight||0); const vy=vv?vv.offsetTop:0;
      const rect=card.getBoundingClientRect(); const current=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0;
      const bar=Q('.bottom-bar') ? Q('.bottom-bar').offsetHeight : 90; const usable=Math.max(260,vh-bar-18);
      let target=current+rect.top+vy-Math.max(12,(usable-rect.height)/2); const max=Math.max(0,(document.documentElement.scrollHeight||document.body.scrollHeight||0)-vh);
      target=Math.max(0,Math.min(target,max)); window.scrollTo({top:target,behavior:'smooth'});
      card.classList.remove('selected-person-pop'); void card.offsetWidth; card.classList.add('selected-person-pop'); clearTimeout(selectedPopTimer); selectedPopTimer=setTimeout(()=>card.classList.remove('selected-person-pop'),900);
    }
    requestAnimationFrame(()=>{setTimeout(run,80);setTimeout(run,280);setTimeout(run,560);});
  }

  function renderProducts(){
    const grid=E('productGrid'); if(!grid) return; const kw=lower(val('productSearch'));
    const rows=DB.productList.filter(p=>!kw || lower([p.品名,p.產品編號,p.客戶品號].join(' ')).includes(kw));
    grid.innerHTML=rows.map((p,i)=>{ const key=attr((p.產品編號||'')+'|'+(p.品名||'')); const url=p.產品照片網址||p.產品縮圖網址||p.照片網址||p.縮圖網址; const no=url?'':' no-photo';
      return `<div class="product-card${no}" data-key="${key}" data-initial="📦">${imgTag(url,p.品名,'')}<span class="selected-badge">✓ 已選</span><div class="product-info"><b>${esc(p.品名||'未命名產品')}</b><span>${esc(p.產品編號||'')}</span></div></div>`;
    }).join('');
    grid.onclick=e=>{ const card=e.target.closest('.product-card'); if(card) selectProduct(card.dataset.key); };
    if(E('productGridEmpty')) E('productGridEmpty').classList.toggle('hidden', rows.length>0);
  }
  function filterProducts(){ renderProducts(); }
  function selectProduct(key){
    const [pid,...rest]=S(key).split('|'); const pname=rest.join('|');
    const p=DB.productList.find(x=>S(x.產品編號)===pid && S(x.品名)===pname) || DB.productList.find(x=>S(x.產品編號)===pid);
    if(!p) return;
    STATE.product=p; STATE.route=null; STATE.machine=null; STATE.routesForProduct=DB.routes.filter(r=>S(r.產品編號)===S(p.產品編號) && (!p.品名 || !r.品名 || S(r.品名)===S(p.品名)));
    QA('.product-card').forEach(c=>c.classList.toggle('selected', c.dataset.key===key));
    if(E('selectedProductArea')) E('selectedProductArea').classList.remove('hidden');
    setVal('productCode',p.產品編號||''); setVal('productName',p.品名||'');
    const disp=E('selectedProductDisplay'); const url=p.產品照片網址||p.產品縮圖網址||p.照片網址||p.縮圖網址;
    if(disp){ disp.className='selected-person-display populated'; disp.innerHTML=`<div class="person-photo-lg ${url?'':'no-photo'}">${imgTag(url,p.品名,'') || '無產品照'}</div><div><div class="person-info-name">${esc(p.品名||'')}</div><div class="caption" style="margin-top:3px">${esc(p.產品編號||'')}</div></div>`; }
    buildWorkstationSelect(); clearRouteDetails(); STATE.stepDone[1]=false; updateStepper(); updatePreview(); updateConfirmSummary();
    roar('📦','已選定產品',`${p.品名||''} ${p.產品編號||''}`,'success');
  }
  function buildWorkstationSelect(){
    const s=E('workstationSelect'); if(!s) return; s.innerHTML='<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
    STATE.routesForProduct.forEach((r,i)=>s.add(new Option(r.顯示名稱 || [r.報工工站名稱,r.工序範圍,(r.機台清單||[]).map(m=>m.機台編號).join('、')].filter(Boolean).join('｜'), String(i))));
  }
  function clearRouteDetails(){
    if(E('routeDetailsArea')) E('routeDetailsArea').classList.add('hidden');
    setVal('processRange',''); setVal('stdCapacity',''); setVal('stdTimeSec',''); if(E('mainMachineSelect')) E('mainMachineSelect').innerHTML=''; if(E('machineListGrid')) E('machineListGrid').innerHTML='';
  }
  function onWorkstationChange(){
    const i=val('workstationSelect'); if(i===''){ STATE.route=null; STATE.machine=null; clearRouteDetails(); return; }
    const r=STATE.routesForProduct[Number(i)]; if(!r) return; STATE.route=r; STATE.stepDone[1]=true;
    if(E('routeDetailsArea')) E('routeDetailsArea').classList.remove('hidden');
    setVal('processRange',r.工序範圍||r.工序||''); setVal('stdCapacity',r.標準產能||r['8小時標準產能']||''); setVal('stdTimeSec',r.標準工時_秒||r.標準工時||'');
    buildMachineSelect(r.機台清單||[]); renderMachineGrid(r.機台清單||[]); if((r.機台清單||[])[0]) selectMachine((r.機台清單||[])[0].機台編號,false);
    updateStepper(); updatePreview(); updateConfirmSummary();
    roar('🔧','已選定工站',`${r.報工工站名稱||''}｜${r.工序範圍||''}`,'success');
  }
  function buildMachineSelect(list){
    const s=E('mainMachineSelect'); if(!s) return; s.innerHTML='';
    if(!list.length){ s.add(new Option('無固定機台 / No fixed machine','')); return; }
    list.forEach(m=>s.add(new Option([m.機台編號,m.區域,m.機台型號||m.機台名稱].filter(Boolean).join('｜'), m.機台編號||'')));
  }
  function renderMachineGrid(list){
    const box=E('machineListGrid'); if(!box) return;
    box.innerHTML=(list||[]).map(m=>{ const url=m.機台照片網址||m.照片網址||m.縮圖網址; const no=url?'':' no-photo';
      return `<div class="machine-card${no}" data-mid="${attr(m.機台編號||'')}" data-initial="⚙️">${imgTag(url,m.機台編號,'')}<span class="selected-badge">✓ 主機台</span><div class="machine-info-panel"><b>${esc(m.機台編號||'')}</b><span>${esc([m.區域,m.機台名稱||m.設備名稱].filter(Boolean).join('｜'))}</span></div></div>`;
    }).join('') || '<div class="caption">此工站無固定機台</div>';
    box.onclick=e=>{ const c=e.target.closest('.machine-card'); if(c) selectMachine(c.dataset.mid,true); };
  }
  function selectMachine(id, update=true){ STATE.machine=(STATE.route&&STATE.route.機台清單||[]).find(m=>S(m.機台編號)===S(id))||null; setVal('mainMachineSelect', id||''); QA('.machine-card').forEach(c=>c.classList.toggle('selected', c.dataset.mid===S(id))); if(update){updatePreview(); updateConfirmSummary();} }

  function initAnomalyTypes(){ const s=E('anomalyType'); if(!s) return; const current=s.value || '無異常'; s.innerHTML=''; unique(['無異常'].concat(DB.anomalyTypes||[])).forEach(x=>s.add(new Option(x,x))); s.value=current; }
  function allDefects(){ return [].concat((DB.defects&&DB.defects.Z)||[], (DB.defects&&DB.defects.Y)||[]); }
  function addDefectRow(){ STATE.defectRows.push({id:++defectSeq, code:'', category:'', name:'', enName:'', qty:0}); renderDefectRows(); }
  function deleteDefectRow(id){ STATE.defectRows=STATE.defectRows.filter(r=>r.id!==id); renderDefectRows(); updatePreview(); updateConfirmSummary(); }
  function renderDefectRows(){
    const box=E('defectContainer'); if(!box) return;
    if(!STATE.defectRows.length) STATE.defectRows.push({id:++defectSeq, code:'', category:'', name:'', enName:'', qty:0});
    const opts=allDefects().map(d=>`<option value="${attr((d.代碼||'')+'|'+(d.分類||S(d.代碼).charAt(0)||''))}">${esc(`${d.分類||S(d.代碼).charAt(0)}類 ${d.代碼||''}｜${d.名稱||''}${d.英文名稱?'｜'+d.英文名稱:''}`)}</option>`).join('');
    box.innerHTML=STATE.defectRows.map(r=>`<div class="defect-row"><button class="defect-delete-btn ripple" type="button" data-del="${r.id}">✕</button><select data-defect="${r.id}"><option value="">── 選擇不良原因 / Select Defect Reason ──</option>${opts}</select><input class="qty-input" type="number" min="0" inputmode="numeric" placeholder="pcs" value="${r.qty||''}" data-qty="${r.id}"></div>`).join('');
    STATE.defectRows.forEach(r=>{ const s=Q(`select[data-defect="${r.id}"]`); if(s&&r.code) s.value=r.code+'|'+r.category; });
    box.onclick=e=>{ if(e.target.dataset.del) deleteDefectRow(Number(e.target.dataset.del)); };
    box.onchange=e=>{ if(e.target.dataset.defect) onDefectChange(Number(e.target.dataset.defect), e.target.value); if(e.target.dataset.qty) onDefectQty(Number(e.target.dataset.qty), e.target.value); };
    box.oninput=e=>{ if(e.target.dataset.qty) onDefectQty(Number(e.target.dataset.qty), e.target.value); };
    updateDefectSummary();
  }
  function onDefectChange(id,v){ const r=STATE.defectRows.find(x=>x.id===id); if(!r) return; const [code,cat]=S(v).split('|'); const d=allDefects().find(x=>S(x.代碼)===S(code)); Object.assign(r,{code:code||'', category:cat||'', name:d?d.名稱:'', enName:d?d.英文名稱:''}); updateDefectSummary(); updatePreview(); updateConfirmSummary(); }
  function onDefectQty(id,v){ const r=STATE.defectRows.find(x=>x.id===id); if(!r) return; const max=N(val('ngQty')); r.qty=Math.max(0,Math.min(N(v),max)); updateDefectSummary(); updatePreview(); updateConfirmSummary(); }
  function updateDefectSummary(){ const box=E('defectSummary'); if(!box) return; const ng=N(val('ngQty')), sum=STATE.defectRows.reduce((a,b)=>a+N(b.qty),0); box.classList.toggle('hidden', !(ng||sum)); box.innerHTML=`📊 分配總和：<b>${sum}</b> / 總不良：<b>${ng}</b>（${sum<=ng?'剩餘可分配':'超過'} ${ng-sum} pcs）`; }

  function calcQty(){ const total=N(val('totalQty')); let ng=N(val('ngQty')); if(ng>total){ng=total; setVal('ngQty',ng);} if(E('displayTotal'))E('displayTotal').textContent=total; if(E('displayNG'))E('displayNG').textContent=ng; if(E('displayGood'))E('displayGood').textContent=Math.max(0,total-ng); if(total>0)STATE.stepDone[2]=true; updateDefectSummary(); updatePreview(); updateConfirmSummary(); updateStepper(); }
  function calcAnomalyTime(){ const s=new Date(val('anomalyStart')), e=new Date(val('anomalyEnd')); if(!isNaN(s)&&!isNaN(e)){ let diff=(e-s)/3600000; if(diff<0) diff+=24; setVal('anomalyDuration', diff.toFixed(2)+' hrs'); } updatePreview(); updateConfirmSummary(); }
  function triggerCamera(){ const x=E('cameraInput'); if(x) x.click(); }
  function triggerFileSelect(){ const x=E('fileInput'); if(x) x.click(); }
  function onPhotoChange(e, source){ const files=Array.from(e.target.files||[]); files.slice(0,MAX_PHOTOS-STATE.photos.length).forEach(file=>{ const reader=new FileReader(); reader.onload=ev=>{ STATE.photos.push({base64:String(ev.target.result), filename:file.name, mime:file.type, note:'', source}); renderPhotos(); updatePreview(); updateConfirmSummary(); }; reader.readAsDataURL(file); }); e.target.value=''; }
  function renderPhotos(){ const grid=E('photoGrid'); if(!grid) return; grid.innerHTML=STATE.photos.map((p,i)=>`<div class="photo-item"><img src="${attr(p.base64)}" alt="photo"><button class="photo-delete-btn" type="button" data-photo-del="${i}">✕</button></div>`).join(''); grid.onclick=e=>{ if(e.target.dataset.photoDel){ STATE.photos.splice(Number(e.target.dataset.photoDel),1); renderPhotos(); updatePreview(); updateConfirmSummary(); } }; if(E('photoCount')) E('photoCount').textContent=STATE.photos.length+' / '+MAX_PHOTOS+' 張照片 / photos'; }
  function clearAllPhotos(){ STATE.photos=[]; renderPhotos(); updatePreview(); updateConfirmSummary(); }
  function openPhotoNote(i){} function closePhotoNote(){} function savePhotoNote(){}

  function updateStepper(){ QA('.step-item').forEach((item,i)=>{ item.classList.remove('is-active','is-done','is-todo'); const circle=Q('.step-circle',item); if(i<STATE.step){ item.classList.add('is-done'); if(circle)circle.textContent='✓'; } else if(i===STATE.step){ item.classList.add('is-active'); if(circle)circle.textContent=String(i+1); } else { item.classList.add('is-todo'); if(circle)circle.textContent=String(i+1); } }); QA('.step-connector').forEach((c,i)=>{c.classList.toggle('done',i<STATE.step);c.classList.toggle('active',i===STATE.step);}); updateBottomBar(); }
  function switchStep(i){ if(i<0||i>4) return; STATE.step=i; for(let n=0;n<5;n++){ const p=E('stepPage'+n); if(p) p.classList.toggle('hidden', n!==i); } if(i===2 && !val('startTime')) setDefaultTimes(); if(i===4) updateConfirmSummary(); updateStepper(); updatePreview(); window.scrollTo({top:0,behavior:'smooth'}); }
  function jumpToStep(i){ if(i<=STATE.step || STATE.stepDone[STATE.step]) switchStep(i); else roar('⚠️','請先完成目前步驟','Complete current step first','warning'); }
  function updateBottomBar(){ const back=E('btnBack'), next=E('btnNext'); if(!next)return; if(back) back.classList.toggle('hidden',STATE.step===0); next.style.gridColumn=STATE.step===0?'1 / -1':''; next.textContent=STATE.step===4?'📤 送出報工 / Submit Report':'下一步 → / Next'; next.classList.toggle('green-submit',STATE.step===4); }
  function goBack(){ switchStep(STATE.step-1); }
  function validateStep(){ if(STATE.step===0&&!STATE.operator)return'請選擇作業員'; if(STATE.step===1&&(!STATE.product||!STATE.route))return'請選擇產品與報工工站'; if(STATE.step===2&&N(val('totalQty'))<=0)return'今日共做數必須大於 0'; if(STATE.step===3){ const ng=N(val('ngQty')), sum=STATE.defectRows.reduce((a,b)=>a+N(b.qty),0); if(sum>ng)return'不良分配數量不可超過不良數'; } return''; }
  function goNextOrSubmit(){ const err=validateStep(); if(err){roar('⚠️','資料未完成',err,'warning');return;} STATE.stepDone[STATE.step]=true; if(STATE.step<4)switchStep(STATE.step+1); else submitReport(); }

  function buildReportData(){
    const total=N(val('totalQty')), ng=N(val('ngQty')); const r=STATE.route||{}, p=STATE.product||{}, op=STATE.operator||{}, calc=STATE.workCalc || calcHours(new Date(val('startTime')),new Date(val('endTime')),SHIFT_RULES[parseShift(val('shiftSelect'))]||SHIFT_RULES['早班']);
    const defects=STATE.defectRows.filter(x=>x.code&&N(x.qty)>0).map(x=>({category:x.category,分類:x.category,code:x.code,代碼:x.code,name:x.name,名稱:x.name,enName:x.enName,英文名稱:x.enName,qty:N(x.qty),數量:N(x.qty)}));
    const data={
      reportId:'WR-'+Date.now(), source:'PWA_V5_OFFICIAL', version:APP_VERSION,
      作業日: calc ? workDateFromDate(new Date(val('startTime'))) : dateYMD(workDateBase()), workDate: calc ? workDateFromDate(new Date(val('startTime'))) : dateYMD(workDateBase()),
      工號:op.工號||val('personId'), 姓名:op.姓名||val('personName'), 班別:parseShift(val('shiftSelect')), 是否加班:calc&&calc.isOT?'是':'否', 加班類型:calc&&calc.isOT?val('overtimeType'):'無',
      產品編號:p.產品編號||val('productCode'), 客戶品號:p.客戶品號||r.客戶品號||'', 品名:p.品名||val('productName'),
      報工工站名稱:r.報工工站名稱||r.工站名稱||'', 工站名稱:r.報工工站名稱||r.工站名稱||'', 工序:r.工序範圍||r.工序||'', 工序範圍:r.工序範圍||r.工序||'', 主機台:val('mainMachineSelect'), 機台清單:(r.機台清單||[]).map(m=>m.機台編號).filter(Boolean).join(','),
      今日共做數:total, 不良數:ng, 實際良品數:Math.max(0,total-ng), 不良率:total?ng/total:0,
      開始時間:val('startTime'), 結束時間:val('endTime'), 實際工時:val('workingHours'), 實際工時分鐘:calc?calc.net:0, 正常工時分鐘:calc?calc.normal:0, 加班工時分鐘:calc?calc.ot:0, 休息扣除分鐘:calc?calc.breakMin:0,
      不良行清單:defects, 異常類型:val('anomalyType')||'無異常', 異常開始時間:val('anomalyStart'), 異常結束時間:val('anomalyEnd'), 異常工時:val('anomalyDuration'), 備註:val('remarks'),
      現場照片清單:STATE.photos.map(x=>({照片類型:'現場照片',檔案名稱:x.filename,MIME類型:x.mime,Base64:S(x.base64).split(',')[1]||'',備註:x.note||'',來源:x.source||''}))
    };
    data.operator={employeeId:data.工號,operatorName:data.姓名,shift:data.班別,isOvertime:data.是否加班};
    data.product={productCode:data.產品編號,customerPartNo:data.客戶品號,productName:data.品名};
    data.workstation={workstationName:data.報工工站名稱,processRange:data.工序範圍,mainMachine:data.主機台,machineList:data.機台清單};
    data.output={totalQty:total,ngQty:ng,goodQty:data.實際良品數,startTime:data.開始時間,endTime:data.結束時間,workingHours:data.實際工時,normalMinutes:data.正常工時分鐘,overtimeMinutes:data.加班工時分鐘,breakDeductMinutes:data.休息扣除分鐘};
    data.quality={defects,defectSummary:defects.map(d=>`${d.代碼} ${d.名稱} x ${d.數量}`).join('；')};
    data.photos=data.現場照片清單; data.remarks=data.備註;
    return data;
  }
  function validateReport(d){ if(!d.工號)return'請選擇作業員'; if(!d.產品編號)return'請選擇產品'; if(!d.報工工站名稱)return'請選擇工站'; if(d.今日共做數<=0)return'今日共做數必須大於 0'; if(d.不良數>d.今日共做數)return'不良數不可大於共做數'; const sum=(d.不良行清單||[]).reduce((a,b)=>a+N(b.數量||b.qty),0); if(sum>d.不良數)return'不良分配數量不可超過不良數'; return''; }
  async function submitReport(){ const d=buildReportData(); const err=validateReport(d); if(err){roar('⚠️','驗證失敗',err,'warning');return;} if(!confirm(`確認送出報工？\n\n${d.姓名}｜${d.產品編號}\n良品：${d.實際良品數}｜不良：${d.不良數}`)) return; try{ showSubmit(true,'📤 報工送出中...','Writing production record...'); const res=await V4Bridge.submitReport(d); showSubmit(false); if(res&&(res.成功||res.success||res.ok||res.報工編號||res.reportId)){ roar('✅','報工完成',res.報工編號||res.reportId||'已寫入','success'); resetAfterSubmit(); } else { roar('❌','寫入失敗',(res&&res.訊息)||'未知錯誤','error'); } } catch(e){ showSubmit(false); roar('❌','寫入失敗',e.message||String(e),'error'); } }
  function resetAfterSubmit(){ STATE.operator=null; STATE.product=null; STATE.route=null; STATE.machine=null; STATE.routesForProduct=[]; STATE.photos=[]; STATE.defectRows=[]; STATE.stepDone=[false,false,false,false,false]; ['personName','personId','productCode','productName','totalQty','ngQty','remarks','workingHours','startTime','endTime','anomalyStart','anomalyEnd','anomalyDuration'].forEach(id=>setVal(id,'')); renderPeople(); renderProducts(); renderPhotos(); renderDefectRows(); hideSelectedPerson(); if(E('selectedProductArea'))E('selectedProductArea').classList.add('hidden'); clearRouteDetails(); calcQty(); switchStep(0); }
  function updatePreview(){ const box=E('reportPreview'), box2=E('confirmPreview'); if(!box&&!box2)return; const d=buildReportData(); const text=`📋 報工預覽 / Production Report Preview\n━━━━━━━━━━━━━━━━━━━━\n👤 作業員：${d.姓名||'—'} / ${d.工號||'—'}｜${d.班別||'—'}\n📦 產品：${d.產品編號||'—'}｜${d.品名||'—'}\n🔧 工站：${d.報工工站名稱||'—'}｜工序：${d.工序||'—'}\n🖥 機台：${d.機台清單||'—'}｜主機台：${d.主機台||'—'}\n📊 共做：${d.今日共做數}｜不良：${d.不良數}｜良品：${d.實際良品數}\n🕐 工時：${d.實際工時||'—'}｜休息扣除：${d.休息扣除分鐘||0} 分｜加班：${d.是否加班}\n🔍 不良：${(d.不良行清單||[]).map(x=>x.代碼+' '+x.名稱+' x '+x.數量).join('；')||'無'}\n📝 備註：${d.備註||'無'}`; if(box)box.textContent=text; if(box2)box2.textContent=text; }
  function updateConfirmSummary(){ const c=E('confirmSummaryContent'); if(!c)return; const d=buildReportData(); if(!d.工號&&!d.產品編號){ c.innerHTML='<div class="caption" style="text-align:center;padding:14px;">請先完成前面步驟再回來確認</div>'; return; } c.innerHTML=[['👤 作業員',`${d.姓名||'—'} / ${d.工號||'—'}`],['📦 產品',`${d.產品編號||'—'}｜${d.品名||'—'}`],['🔧 工站',d.報工工站名稱||'—'],['📊 共做',d.今日共做數+' pcs'],['✅ 良品',d.實際良品數+' pcs'],['❌ 不良',d.不良數+' pcs'],['🕐 工時',d.實際工時||'—'],['⏱ 加班',`${d.是否加班}｜${d.加班工時分鐘||0} 分`]].map(r=>`<div class="confirm-row"><span class="confirm-label">${r[0]}</span><span class="confirm-value">${esc(r[1])}</span></div>`).join(''); }

  function openPersonScan(){ const m=E('personScanModal'); if(m)m.classList.remove('hidden'); const inp=E('personManualInput'); if(inp){inp.classList.remove('hidden'); setTimeout(()=>inp.focus(),50);} }
  function closePersonScan(){ const m=E('personScanModal'); if(m)m.classList.add('hidden'); }
  function togglePersonManual(){ const inp=E('personManualInput'); if(inp){inp.classList.toggle('hidden'); if(!inp.classList.contains('hidden'))inp.focus();} }
  function personManualConfirm(e){ if(e.key==='Enter'){ const v=S(e.target.value); const idx=DB.persons.findIndex(p=>S(p.工號)===v||S(p.姓名)===v); if(idx>=0){closePersonScan();selectPerson(idx);} else roar('⚠️','找不到人員',v,'warning'); } }
  function openProductScan(){ const m=E('productScanModal'); if(m)m.classList.remove('hidden'); const inp=E('productManualInput'); if(inp){inp.classList.remove('hidden'); setTimeout(()=>inp.focus(),50);} }
  function closeProductScan(){ const m=E('productScanModal'); if(m)m.classList.add('hidden'); }
  function toggleProductManual(){ const inp=E('productManualInput'); if(inp){inp.classList.toggle('hidden'); if(!inp.classList.contains('hidden'))inp.focus();} }
  function productManualConfirm(e){ if(e.key==='Enter'){ const v=S(e.target.value); const p=DB.productList.find(x=>S(x.產品編號)===v||S(x.客戶品號)===v||S(x.品名)===v); if(p){closeProductScan();selectProduct((p.產品編號||'')+'|'+(p.品名||''));} else roar('⚠️','找不到產品',v,'warning'); } }
  function toggleFullscreen(){ const d=document; if(!d.fullscreenElement && d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(()=>{}); else if(d.exitFullscreen) d.exitFullscreen().catch(()=>{}); }

  function boot(){
    injectOfficialCss(); hideSelectedPerson(); startTopbar(); buildShiftSelect('早班'); renderDefectRows(); switchStep(0); reloadData();
  }
  Object.assign(window,{reloadData,filterPersons,selectPerson,filterProducts,selectProduct,onWorkstationChange,selectMachine,addDefectRow,deleteDefectRow,calcQty,calcWorkingHours,calcAnomalyTime,triggerCamera,triggerFileSelect,onPhotoChange,clearAllPhotos,openPhotoNote,closePhotoNote,savePhotoNote,jumpToStep,goBack,goNextOrSubmit,submitReport,resetAfterSubmit,openPersonScan,closePersonScan,togglePersonManual,personManualConfirm,openProductScan,closeProductScan,toggleProductManual,productManualConfirm,toggleFullscreen,buildReportData});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
