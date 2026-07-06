/* 化新報工 V4｜v4.8.4 正式修正
 * 修正：選定人員/產品/工站/機台中間彈出、不良原因主檔正規化、Drive 圖片轉縮圖、人員/產品/機台多圖片顯示。
 */
(function(){
  function 就緒(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn,{once:true});
    else fn();
  }

  function 注入樣式(){
    if(document.getElementById('v484_hotfix_style')) return;
    const style=document.createElement('style');
    style.id='v484_hotfix_style';
    style.textContent=`
      .center-select-mask{position:fixed;inset:0;z-index:12050;background:rgba(8,15,35,.76);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px;animation:maskIn .22s ease-out}.center-select-mask.hidden{display:none!important}.center-select-box{width:min(92vw,430px);max-height:88dvh;overflow:auto;background:rgba(255,255,255,.97);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.82);border-radius:26px;padding:18px;box-shadow:0 24px 68px rgba(20,35,80,.28),0 8px 22px rgba(0,0,0,.16);text-align:center;animation:modalIn .32s cubic-bezier(.34,1.56,.64,1)}.center-select-icon{width:68px;height:68px;margin:0 auto 10px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;background:linear-gradient(135deg,#1967D2,#4285F4);color:#fff;box-shadow:0 8px 24px rgba(66,133,244,.36)}.center-select-title{font-size:20px;font-weight:950;color:#1A2E48;letter-spacing:-.3px}.center-select-sub{margin-top:4px;font-size:12px;color:#5F6368;font-weight:750}.center-select-image-wrap{margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.center-select-main-image{width:100%;aspect-ratio:1/1;border-radius:16px;object-fit:cover;background:#E8EEF8;border:1.5px solid rgba(66,133,244,.18);box-shadow:0 4px 14px rgba(0,0,0,.10)}.center-select-info{margin-top:14px;background:rgba(232,240,255,.72);border:1px solid rgba(66,133,244,.18);border-radius:16px;padding:12px;font-size:13px;line-height:1.65;color:#23344D;text-align:left;font-weight:700}.center-select-btns{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.center-select-empty{height:94px;border-radius:16px;background:linear-gradient(135deg,#E8EEF8,#D9E7FA);display:flex;align-items:center;justify-content:center;color:#6A80A0;font-weight:900}.person-grid{grid-template-columns:repeat(3,1fr)!important;max-height:calc(100dvh - 355px)!important;min-height:310px!important;overflow-y:auto!important}.person-card{padding:0!important;min-height:150px!important;height:150px!important;border-radius:16px!important;overflow:hidden!important;position:relative!important;background:#101828!important}.person-card .avatar-ring{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:0!important;border:0!important;background:#172033!important;box-shadow:none!important}.person-card .avatar-ring img{width:100%!important;height:100%!important;border-radius:0!important;object-fit:cover!important}.person-card .avatar-ring:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.04) 0%,rgba(0,0,0,.18) 40%,rgba(0,0,0,.78) 100%)}.person-card .person-name,.person-card .person-id{position:relative;z-index:2;color:#fff!important;text-shadow:0 2px 8px rgba(0,0,0,.85)}.person-card .person-name{margin-top:auto;font-size:15px!important;font-weight:950!important}.person-card .person-id{font-size:12px!important;font-weight:950!important;margin-bottom:9px;letter-spacing:.5px}.person-card .shift-badge{z-index:3;background:rgba(0,0,0,.62)!important;color:#fff!important}.person-card.selected{outline:3px solid #4EA1FF!important;box-shadow:0 0 0 3px rgba(78,161,255,.24),0 12px 28px rgba(30,120,255,.35)!important}.product-thumb img,.machine-card img{object-fit:cover!important}.machine-card{position:relative;overflow:hidden}.machine-card.selected{outline:3px solid #4EA1FF;box-shadow:0 0 0 3px rgba(78,161,255,.2),0 10px 22px rgba(30,120,255,.25)}.machine-no-img{font-size:22px!important}.image-count-badge{display:inline-flex;margin-top:5px;padding:2px 8px;border-radius:999px;background:rgba(66,133,244,.12);color:#1967D2;font-size:10px;font-weight:900}.roar-notif{background:#fff!important;color:#202124!important}.roar-title{color:#202124!important}.roar-sub{color:#5F6368!important}@media(max-width:380px){.person-grid{gap:7px!important}.person-card{height:136px!important;min-height:136px!important}.person-card .person-name{font-size:13.5px!important}.person-card .person-id{font-size:11px!important}.center-select-image-wrap{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(style);
  }

  function 注入中間彈窗(){
    if(document.getElementById('centerSelectModal')) return;
    const div=document.createElement('div');
    div.id='centerSelectModal';
    div.className='center-select-mask hidden';
    div.innerHTML=`<div class="center-select-box"><div class="center-select-icon" id="centerSelectIcon">✅</div><div class="center-select-title" id="centerSelectTitle">已選定</div><div class="center-select-sub" id="centerSelectSub">資料已帶入</div><div id="centerSelectImageWrap" class="center-select-image-wrap"></div><div class="center-select-info" id="centerSelectInfo"></div><div class="center-select-btns"><button type="button" class="btn-secondary ripple" onclick="closeCenterSelectModal()">關閉 / Close</button><button type="button" class="btn-primary ripple" onclick="closeCenterSelectModal()">確認 / OK</button></div></div>`;
    document.body.appendChild(div);
  }

  function 文字(v){return String(v==null?'':v).trim();}
  function 安全(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function 屬性(s){return 安全(s).replace(/\n/g,'');}
  function 轉Drive圖片(url){
    let s=文字(url);
    if(!s) return '';
    const m1=s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const m2=s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const m3=s.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    const id=(m1&&m1[1])||(m2&&m2[1])||(m3&&m3[1]);
    if(id) return 'https://drive.google.com/thumbnail?id='+id+'&sz=w1200';
    return s;
  }
  function 拆圖片(v){
    if(!v) return [];
    if(Array.isArray(v)) return v.flatMap(拆圖片);
    if(typeof v==='object') return 取圖片清單(v);
    const s=文字(v);
    if(!s) return [];
    if((s.startsWith('[')&&s.endsWith(']'))||(s.startsWith('{')&&s.endsWith('}'))){
      try{const parsed=JSON.parse(s); return 拆圖片(parsed);}catch(e){}
    }
    return s.split(/[\n,，;；|]+/).map(x=>轉Drive圖片(x)).filter(x=>/^https?:\/\//i.test(x));
  }
  function 取圖片清單(rec, keys){
    const out=[]; const used=new Set();
    if(!rec) return out;
    const defaultKeys=['縮圖網址','照片網址','圖片網址','頭像網址','產品照片網址','產品縮圖網址','機台照片網址','工站照片網址','照片','圖片','照片1','照片2','照片3','照片4','照片5','圖片1','圖片2','圖片3','圖片4','圖片5','GoogleDrive圖片','GoogleDrive照片','分享網址','URL','url','image','imageUrl','photo','photoUrl'];
    (keys||[]).concat(defaultKeys).forEach(k=>{
      if(!(k in rec)) return;
      拆圖片(rec[k]).forEach(u=>{ if(!used.has(u)){used.add(u);out.push(u);} });
    });
    Object.keys(rec).forEach(k=>{
      if(/(照片|圖片|縮圖|photo|image|url|網址)/i.test(k)) 拆圖片(rec[k]).forEach(u=>{ if(!used.has(u)){used.add(u);out.push(u);} });
    });
    return out;
  }
  function 圖片HTML(url,fallback,round){
    const u=轉Drive圖片(url);
    const fb=`<div class="person-photo-lg">${安全(fallback)}</div>`;
    if(!u) return fb;
    const radius=round?'50%':'var(--r-md)';
    return `<img src="${屬性(u)}" style="width:80px;height:80px;border-radius:${radius};object-fit:cover;" onerror="this.outerHTML='${屬性(fb)}'">`;
  }
  function clean(v){return 文字(v).replace(/\.0$/,'');}
  function cleanProductName(name){return clean(name).replace(/^[-/：；（）$@「」。，、？！._—|～《》¥\[\]{}#%^*+=·\s]+/g,'').replace(/[-/：；（）$@「」。，、？！._—|～《》¥\[\]{}#%^*+=·\s]+$/g,'').trim()||clean(name);}

  function normalizeNgReasons(src){
    if(src&&typeof src==='object'&&!Array.isArray(src)&&(src.Z||src.Y)){
      return {Z:Array.isArray(src.Z)?src.Z.map(正規不良):[],Y:Array.isArray(src.Y)?src.Y.map(正規不良):[]};
    }
    const arr=Array.isArray(src)?src:(src&&Array.isArray(src.list)?src.list:[]);
    const out={Z:[],Y:[]};
    arr.forEach(item=>{
      const r=正規不良(item);
      if(!r.代碼&&!r.名稱) return;
      let cat=文字(item.分類||item.category||item.類別||r.分類).toUpperCase();
      if(cat!=='Z'&&cat!=='Y') cat=String(r.代碼||'').toUpperCase().startsWith('Z')?'Z':'Y';
      out[cat].push(r);
    });
    return out;
  }
  function 正規不良(item){
    item=item||{};
    const code=文字(item.代碼||item.code||item.不良代碼||item.不良原因代碼||item.ID||item.id);
    const name=文字(item.名稱||item.name||item.不良名稱||item.不良原因||item.中文名稱||item.中文);
    const en=文字(item.英文名稱||item.enName||item.English||item.english||item.英文||item.name_en);
    return {代碼:code,名稱:name,英文名稱:en,分類:文字(item.分類||item.category||item.類別)};
  }

  const 原始={};
  就緒(function(){
    注入樣式();
    注入中間彈窗();
    window.closeCenterSelectModal=function(){const el=document.getElementById('centerSelectModal'); if(el) el.classList.add('hidden');};
    window.showCenterSelectModal=function(opt){
      注入中間彈窗();
      opt=opt||{};
      const imgs=(opt.images||[]).filter(Boolean);
      document.getElementById('centerSelectIcon').textContent=opt.icon||'✅';
      document.getElementById('centerSelectTitle').textContent=opt.title||'已選定';
      document.getElementById('centerSelectSub').textContent=opt.sub||'Selected';
      document.getElementById('centerSelectImageWrap').innerHTML=imgs.length?imgs.map(u=>`<img class="center-select-main-image" src="${屬性(u)}" onerror="this.outerHTML='<div class=center-select-empty>無照片</div>'">`).join(''):'<div class="center-select-empty" style="grid-column:1/-1">無照片 / No Image</div>';
      document.getElementById('centerSelectInfo').innerHTML=opt.infoHtml||'';
      document.getElementById('centerSelectModal').classList.remove('hidden');
      clearTimeout(window.__centerSelectTimer);
      window.__centerSelectTimer=setTimeout(window.closeCenterSelectModal,1800);
    };

    window.normalizeDriveImageUrl=轉Drive圖片;
    window.splitPossibleImageValues=拆圖片;
    window.getImageListFromRecord=取圖片清單;
    window.normalizeNgReasons=normalizeNgReasons;

    try{原始.onDataLoaded=onDataLoaded;}catch(e){}
    try{原始.normalizeGroup=normalizeGroup;}catch(e){}
    try{原始.renderDefectRows=renderDefectRows;}catch(e){}

    normalizeGroup=function(src){
      const g0=src||{}; const g1=Object.assign({},g0);
      if(typeof g1.機台清單==='string'){
        try{g1.機台清單=JSON.parse(g1.機台清單);}catch(e){g1.機台清單=String(g1.機台清單).split(/[、,，;；\/\s]+/).filter(Boolean).map(id=>({機台編號:id,設備名稱:'機台'+id}));}
      }
      if(!Array.isArray(g1.機台清單)) g1.機台清單=[];
      g1.機台清單=g1.機台清單.map(m=>{
        m=Object.assign({},m);
        const id=clean(m.機台編號||m.主機台||m.設備編號||m.id||m.名稱||'');
        const imgs=取圖片清單(m,['縮圖網址','照片網址','機台照片網址','圖片網址','照片1','照片2','圖片1','圖片2']);
        return Object.assign(m,{機台編號:id,主機台:id,設備名稱:clean(m.設備名稱||m.機台名稱||m.名稱||('機台'+id)),機台名稱:clean(m.機台名稱||m.設備名稱||m.名稱||('機台'+id)),縮圖網址:imgs[0]||'',照片網址:imgs[0]||'',圖片清單:imgs});
      }).filter(m=>m.機台編號);
      if(!g1.機台清單.length){
        String([g1.機台編號清單,g1.可用機台,g1.主機台,g1.機台編號].filter(Boolean).join('、')).split(/[、,，;；\/\s]+/).map(x=>x.replace(/\.0$/,'')).filter(x=>/^\d{1,5}$/.test(x)).forEach(id=>g1.機台清單.push({機台編號:id,主機台:id,設備名稱:'機台'+id,機台名稱:'機台'+id,圖片清單:[]}));
      }
      g1.產品編號=clean(g1.產品編號||g1.料號||g1.productCode||'');
      g1.品名=cleanProductName(g1.品名||g1.產品名稱||g1.productName||'');
      g1.客戶品號=clean(g1.客戶品號||g1.客戶料號||'');
      g1.報工工站名稱=clean(g1.報工工站名稱||g1.工站名稱||g1.工站||'');
      g1.工站名稱=g1.報工工站名稱;
      g1.工序範圍=clean(g1.工序範圍||g1.工序||g1.OP||g1.工序編號_最終||g1.工序編號||'');
      g1.工序=g1.工序範圍;
      if(!Array.isArray(g1.工序清單)) g1.工序清單=String(g1.工序清單||g1.工序||g1.工序範圍||'').split(/[、,，;；\s]+/).filter(Boolean);
      const pimgs=取圖片清單(g1,['產品縮圖網址','產品照片網址','照片網址','縮圖網址','圖片網址','照片1','照片2','圖片1','圖片2']);
      g1.產品縮圖網址=pimgs[0]||''; g1.產品照片網址=pimgs[0]||''; g1.產品圖片清單=pimgs;
      g1.主機台=clean(g1.主機台||(g1.機台清單[0]&&g1.機台清單[0].機台編號)||'');
      g1.機台編號清單=g1.機台清單.map(m=>m.機台編號);
      g1.機台編號=g1.機台編號清單.join('、');
      g1.顯示名稱=clean(g1.顯示名稱)||[g1.報工工站名稱,g1.工序範圍,g1.機台編號].filter(Boolean).join('｜');
      return g1;
    };

    onDataLoaded=function(data){
      if(!data||!(data.成功||data.success||data.ok)){ if(原始.onDataLoaded) return 原始.onDataLoaded(data); return; }
      data.不良原因=normalizeNgReasons(data.不良原因||data.不良原因主檔||data.ngReasons||data.defectReasons||[]);
      if(原始.onDataLoaded) 原始.onDataLoaded(data);
      try{DB.ngReasons=data.不良原因; renderDefectRows();}catch(e){}
      try{buildPersonGrid(); buildProductGrid();}catch(e){}
    };

    buildPersonGrid=function(){
      const container=document.getElementById('personGrid'); if(!container) return;
      const active=(DB.persons||[]).filter(r=>String(r.啟用||'是')!=='否');
      if(!active.length){container.innerHTML='<div class="caption" style="text-align:center;padding:24px;grid-column:1/-1;">尚無啟用的人員資料 / No active operators</div>';return;}
      container.innerHTML=active.map(r=>{
        const i=DB.persons.indexOf(r); const st=(typeof getShiftType==='function'?getShiftType(r.班別||r.班別名稱):'day'); const icon=(typeof getShiftIcon==='function'?getShiftIcon(r.班別||r.班別名稱):'☀️');
        const imgs=取圖片清單(r,['縮圖網址','照片網址','頭像網址','照片1','照片2','照片3','圖片1','圖片2']);
        const avatar=imgs.length?`<img src="${屬性(imgs[0])}" onerror="this.parentElement.innerHTML='${屬性((文字(r.姓名||'?')||'?').charAt(0).toUpperCase())}'">`:(文字(r.姓名||'?')||'?').charAt(0).toUpperCase();
        return `<div class="person-card shift-${st} ripple" data-index="${i}" id="personCard_${i}"><span class="shift-badge ${st}">${icon} ${安全(String(r.班別||r.班別名稱||'').slice(0,2))}</span><span class="selected-badge">✓ 已選取</span><div class="avatar-ring">${avatar}</div><div class="person-name">${安全(r.姓名||'未知')}</div><div class="person-id">${安全(r.工號||'')}</div></div>`;
      }).join('');
      if(typeof bindSafeTap==='function') bindSafeTap(container,'.person-card',card=>selectPerson(Number(card.dataset.index)));
    };

    selectPerson=function(i){
      const r=DB.persons[i]; if(!r) return;
      STATE.operator=r;
      document.querySelectorAll('.person-card').forEach(c=>c.classList.remove('selected'));
      const card=document.getElementById('personCard_'+i); if(card){card.classList.add('selected');card.scrollIntoView({behavior:'smooth',block:'center'});}
      if(typeof setVal==='function'){setVal('personId',r.工號||'');setVal('personName',r.姓名||'');if(r.班別||r.班別名稱) setVal('shiftSelect',r.班別名稱||(typeof inferShift==='function'?inferShift(r.班別):r.班別));}
      const hi=document.getElementById('empIdHighlight'); if(hi) hi.textContent=r.工號||'未輸入';
      const imgs=取圖片清單(r,['縮圖網址','照片網址','頭像網址','照片1','照片2','照片3','圖片1','圖片2']);
      const disp=document.getElementById('selectedPersonDisplay');
      if(disp){disp.className='selected-person-display populated';disp.innerHTML=圖片HTML(imgs[0]||'','無頭像',true)+`<div><div class="person-info-name">${安全(r.姓名||'')} <span style="font-size:12px;color:var(--text-secondary);">${安全(r.工號||'')}</span></div><div class="caption" style="margin-top:4px;">${安全([r.部門,r.班別名稱||r.班別,r.職稱||''].filter(Boolean).join('｜'))}</div>${imgs.length>1?`<div class="image-count-badge">共 ${imgs.length} 張照片</div>`:''}</div>`;}
      try{saveRecentPerson(i);}catch(e){} try{setDefaultTimes(false);}catch(e){} try{markStepDone();updatePreview();updateConfirmSummary();}catch(e){}
      showCenterSelectModal({icon:'👤',title:'已選定人員',sub:'Operator Selected',images:imgs,infoHtml:`<div><b>姓名 / Name：</b>${安全(r.姓名||'')}</div><div><b>工號 / ID：</b>${安全(r.工號||'')}</div><div><b>班別 / Shift：</b>${安全(r.班別名稱||r.班別||'')}</div><div><b>部門 / Dept：</b>${安全(r.部門||'')}</div>`});
      try{roar('👤','已選定作業員 / Operator Selected',(r.姓名||'')+'（'+(r.工號||'')+'）','success');}catch(e){}
    };

    buildProductGrid=function(){
      const container=document.getElementById('productGrid'); if(!container) return;
      if(!DB.productList||!DB.productList.length){container.innerHTML='<div class="caption" style="text-align:center;padding:20px;grid-column:1/-1;">尚無產品資料 / No products</div>';return;}
      container.innerHTML=DB.productList.map((gr,index)=>{const imgs=取圖片清單(gr,['產品縮圖網址','產品照片網址','照片1','照片2','圖片1','圖片2']);const thumb=imgs.length?`<img src="${屬性(imgs[0])}" onerror="this.parentElement.innerHTML='<span>📦</span>'">`:'<span>📦</span>';return `<div class="product-card ripple" data-index="${index}" data-pid="${屬性(gr.產品編號||'')}"><div class="product-thumb">${thumb}</div><div class="product-name">${安全(cleanProductName(gr.品名||''))}</div><div class="product-code">${安全(gr.產品編號||'')}</div></div>`;}).join('');
      if(typeof bindSafeTap==='function') bindSafeTap(container,'.product-card',card=>selectProduct(Number(card.dataset.index)));
    };

    selectProduct=function(indexOrKey){
      let gr;if(typeof indexOrKey==='number') gr=DB.productList[indexOrKey]; else{const key=String(indexOrKey||'');gr=(DB.productList||[]).find(x=>(x.產品編號+'|'+x.品名)===key||x.產品編號===key||x.客戶品號===key);} if(!gr) return;
      STATE.currentProductKey=gr.產品編號+'|'+gr.品名; document.querySelectorAll('.product-card').forEach(c=>c.classList.remove('selected'));
      const idx=DB.productList.indexOf(gr); const t=document.querySelector(`.product-card[data-index="${idx}"]`); if(t){t.classList.add('selected');t.scrollIntoView({behavior:'smooth',block:'center'});}
      STATE.productGroupList=(DB.workstationGroups||[]).filter(x=>x.產品編號===gr.產品編號&&x.品名===gr.品名); STATE.currentProductGroup=STATE.productGroupList[0]||gr; STATE.currentWorkstation=null; STATE.currentMachineId='';
      try{setVal('productCode',gr.產品編號||'');setVal('productName',cleanProductName(gr.品名||''));}catch(e){}
      showProductPhoto(gr); if(typeof buildWorkstationSelect==='function') buildWorkstationSelect();
      const a=document.getElementById('selectedProductArea'); if(a) a.classList.remove('hidden'); const r=document.getElementById('routeDetailsArea'); if(r) r.classList.add('hidden');
      try{updatePreview();updateConfirmSummary();}catch(e){}
      const imgs=取圖片清單(gr,['產品縮圖網址','產品照片網址','照片1','照片2','圖片1','圖片2']);
      showCenterSelectModal({icon:'📦',title:'已選定產品',sub:'Product Selected',images:imgs,infoHtml:`<div><b>產品編號 / Product：</b>${安全(gr.產品編號||'')}</div><div><b>品名 / Name：</b>${安全(gr.品名||'')}</div><div><b>客戶品號 / Customer：</b>${安全(gr.客戶品號||'')}</div>`});
    };

    showProductPhoto=function(gr){
      const disp=document.getElementById('selectedProductDisplay'); if(!disp) return;
      const imgs=取圖片清單(gr,['產品縮圖網址','產品照片網址','照片1','照片2','圖片1','圖片2']);
      disp.className='selected-person-display populated';
      disp.innerHTML=圖片HTML(imgs[0]||'','無產品照',false)+`<div><div class="person-info-name">${安全(gr&&gr.品名?cleanProductName(gr.品名):'尚未選產品')}</div><div class="caption" style="margin-top:3px;">${安全(gr&&gr.產品編號||'')}</div>${imgs.length>1?`<div class="image-count-badge">共 ${imgs.length} 張產品圖</div>`:''}</div>`;
    };

    const 原onWorkstationChange=window.onWorkstationChange;
    onWorkstationChange=function(){
      if(typeof 原onWorkstationChange==='function') 原onWorkstationChange();
      const gr=STATE.currentWorkstation; const area=document.getElementById('routeDetailsArea'); if(area) area.classList.toggle('hidden',!gr);
      if(!gr) return;
      const machineNos=(gr.機台清單||[]).map(x=>x.機台編號).filter(Boolean).join('、')||'無';
      const imgs=取圖片清單(gr,['工站照片網址','照片網址','縮圖網址','圖片網址']).concat((gr.機台清單||[]).flatMap(m=>取圖片清單(m,['縮圖網址','照片網址','機台照片網址']))).slice(0,9);
      showCenterSelectModal({icon:'🔧',title:'已選定工站',sub:'Workstation Selected',images:imgs,infoHtml:`<div><b>工站 / Workstation：</b>${安全(gr.報工工站名稱||gr.工站名稱||'')}</div><div><b>工序 / Process：</b>${安全(gr.工序範圍||gr.工序||'')}</div><div><b>標準產能 / Capacity：</b>${安全(gr.標準產能||gr['8小時標準產能']||'')}</div><div><b>機台 / Machines：</b>${安全(machineNos)}</div>`});
    };

    renderMachineGrid=function(list){
      const box=document.getElementById('machineListGrid'); if(!box) return;
      if(!list||!list.length){box.innerHTML='<div class="caption" style="padding:8px;">此工站無固定機台 / No dedicated machines</div>';return;}
      box.innerHTML=list.map((m,i)=>{const imgs=取圖片清單(m,['縮圖網址','照片網址','機台照片網址','照片1','照片2','圖片1','圖片2']);const img=imgs.length?`<img src="${屬性(imgs[0])}" onerror="this.outerHTML='<div class=machine-no-img>⚙</div>'">`:'<div class="machine-no-img">⚙</div>';return `<div class="machine-card ripple ${i===0?'selected':''}" data-id="${屬性(m.機台編號||'')}">${img}<div class="machine-number">${安全(m.機台編號||'')}</div><div class="machine-info">${安全([m.區域,m.機台型號,m.設備名稱].filter(Boolean).join('｜'))}</div>${imgs.length>1?`<div class="image-count-badge">${imgs.length} 張照片</div>`:''}</div>`;}).join('');
      if(typeof bindSafeTap==='function') bindSafeTap(box,'.machine-card',card=>selectMachine(card.dataset.id));
    };

    selectMachine=function(machineNo){
      try{setVal('mainMachineSelect',machineNo);}catch(e){} STATE.currentMachineId=machineNo||'';
      document.querySelectorAll('.machine-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===String(machineNo||'')));
      try{updatePreview();updateConfirmSummary();}catch(e){}
      const gr=STATE.currentWorkstation||{}; const m=(gr.機台清單||[]).find(x=>String(x.機台編號||'')===String(machineNo||'')); if(!m) return;
      const imgs=取圖片清單(m,['縮圖網址','照片網址','機台照片網址','照片1','照片2','圖片1','圖片2']);
      showCenterSelectModal({icon:'🖥',title:'已選定機台',sub:'Machine Selected',images:imgs,infoHtml:`<div><b>機台編號 / No：</b>${安全(m.機台編號||'')}</div><div><b>區域 / Area：</b>${安全(m.區域||'')}</div><div><b>型號 / Model：</b>${安全(m.機台型號||'')}</div><div><b>設備名稱 / Name：</b>${安全(m.設備名稱||m.機台名稱||'')}</div>`});
    };

    onDefectQtyChange=function(id,v){
      const row=(STATE.defectRows||[]).find(r=>r.id===id); if(!row) return;
      let newQty=Math.max(0,Number(v)||0); const totalNG=typeof num==='function'?num('ngQty'):Number(document.getElementById('ngQty')?.value||0);
      const otherSum=STATE.defectRows.filter(r=>r.id!==id).reduce((s,r)=>s+(Number(r.qty)||0),0); const maxAllowed=Math.max(totalNG-otherSum,0);
      if(newQty>maxAllowed){newQty=maxAllowed;try{roar('⚠️','不良分配超出',`此列最多只能輸入 ${maxAllowed} pcs`,'warning');}catch(e){}}
      row.qty=newQty; const input=document.querySelector(`#defectRow_${id} .qty-input`); if(input) input.value=newQty||'';
      try{updateDefectSummaryDisplay();updatePreview();updateConfirmSummary();}catch(e){}
    };
  });
})();
