(function(全域){
  'use strict';

  const 版本='1.3.0-A5照片離線優先';
  const 篩選清單=['全部','1044','1046','1045'];

  function 文字(v){return String(v==null?'':v).trim();}
  function 轉義(v){return 文字(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function 內建圖(id){return (全域.智慧5SA5內建照片&&全域.智慧5SA5內建照片[文字(id)])||'';}
  function db(){return 全域.智慧5S資料庫||null;}

  const 備援資料=Object.freeze([
    {照片編號:'SITE-A5-008',主區域:'A5',機台編號:'1044',圖片類型:'機台',子類型:'機台正面',工序:'OP110相關',可作標準候選:'是',需改善後重拍:'是',觀察重點:'1044白色機台、文件板、藍盒、在製品與踏台現況',Drive檔案ID:'14LD1Ms-z6HaZZRW8kMYrSBLfQJAkzLo6'},
    {照片編號:'SITE-A5-009',主區域:'A5',機台編號:'1044',圖片類型:'文件',子類型:'刀具與日報',工序:'OP110',可作標準候選:'是',需改善後重拍:'否',觀察重點:'刀具表、每日工作日報、QR與版本資訊',Drive檔案ID:'1XBO57xndINogycT9msuTIREMKuvtEdhp'},
    {照片編號:'SITE-A5-010',主區域:'A5',機台編號:'1044',圖片類型:'文件',子類型:'文件板與作業標準',工序:'OP110',可作標準候選:'是',需改善後重拍:'是',觀察重點:'同一文件板出現不同客戶品號，需確認換線與版本對應',Drive檔案ID:'1NFEJB_nhilmh6hIdiZxbb5Xq_7WhmLRY'},
    {照片編號:'SITE-A5-011',主區域:'A5',機台編號:'1044',圖片類型:'文件',子類型:'OP110作業標準特寫',工序:'OP110',可作標準候選:'是',需改善後重拍:'否',觀察重點:'作業標準與品質管制特性可作數位文件索引',Drive檔案ID:'1tzR4jc_9N10Z3GNpf3uCAt0UOsj2Isea'},
    {照片編號:'SITE-A5-012',主區域:'A5',機台編號:'1046',圖片類型:'文件',子類型:'OP120檢驗標準',工序:'OP120',可作標準候選:'是',需改善後重拍:'否',觀察重點:'現場文件明確標示機台1046與OP120',Drive檔案ID:'1VRb59pU3hBbMfKkIg86M7VSP2-beQ7fU'},
    {照片編號:'SITE-A5-013',主區域:'A5',機台編號:'1046',圖片類型:'作業',子類型:'站位與踏台',工序:'作業中',可作標準候選:'是',需改善後重拍:'是',觀察重點:'可建立人員站位、踏台位置、門開啟與上下料動線標準',Drive檔案ID:'1P-CMzGbJnYpcEScfTpQs-tOvNx0Y2fgp'},
    {照片編號:'SITE-A5-014',主區域:'A5',機台編號:'1045',圖片類型:'文件',子類型:'檢驗標準特寫',工序:'檢驗',可作標準候選:'是',需改善後重拍:'否',觀察重點:'現場文件明確標示機台1045',Drive檔案ID:'13PDOKSSj1m7qVRJeD4p2uKi6CZ0-NWBw'},
    {照片編號:'SITE-A5-015',主區域:'A5',機台編號:'1045',圖片類型:'機台',子類型:'作業台與文件板',工序:'現場作業',可作標準候選:'是',需改善後重拍:'是',觀察重點:'黑色作業台、文件板、治具、氣槍與小物盒現況',Drive檔案ID:'1oT25iWV5MAu6O8ovmoT95K4Nrnfyccnv'},
    {照片編號:'SITE-A5-016',主區域:'A5',機台編號:'1045',圖片類型:'物品',子類型:'藍色小物盒',工序:'',可作標準候選:'否',需改善後重拍:'是',觀察重點:'標示與實際內容不一致，適合作錯誤對照卡',Drive檔案ID:'10nCL-vA5svytaDnuwlSRbGw5StaOsiZ3'},
    {照片編號:'SITE-A5-017',主區域:'A5',機台編號:'1045',圖片類型:'檢具',子類型:'量檢具定位',工序:'',可作標準候選:'是',需改善後重拍:'否',觀察重點:'藍色定位板、檢具名稱與槽位清楚，可列正確示範',Drive檔案ID:'1zy3FkYm9BotgM72uQSDu6VDiAPmj3OzO'},
    {照片編號:'SITE-A5-018',主區域:'A5',機台編號:'1045',圖片類型:'治具',子類型:'治具檢具工具定位',工序:'',可作標準候選:'是',需改善後重拍:'否',觀察重點:'多項治具以藍板與OP標籤定位，適合作為示範標準',Drive檔案ID:'1nm728tQCTagiANEL3YeAX3VU8jlyStu5'}
  ].map(x=>Object.freeze({...x,Drive網址:`https://drive.google.com/file/d/${x.Drive檔案ID}/view`})));

  let 當前資料=備援資料.map(x=>({...x}));
  let 當前篩選='全部';
  let 主檔筆數=0;
  let 同步狀態='PWA內建資料';

  function 設頁首(){
    const t=document.getElementById('頁面標題');
    const s=document.getElementById('頁面副標');
    if(t)t.textContent='5S 可視化標準管理';
    if(s)s.textContent='A5｜1044 → 1046 → 1045｜PWA離線優先照片';
  }

  function 注入樣式(){
    if(document.getElementById('A5標準照片回接樣式1300'))return;
    const st=document.createElement('style');
    st.id='A5標準照片回接樣式1300';
    st.textContent=`
      .A5照頁{display:grid;gap:14px;padding-bottom:22px}.A5照英雄{background:linear-gradient(135deg,#123f2e,#1f825b 65%,#7a244a);color:#fff;border-radius:24px;padding:18px}.A5照英雄 h2{margin:0 0 6px}.A5照英雄 p{margin:0;line-height:1.6;color:rgba(255,255,255,.9)}
      .A5同步列{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #dfe9e3;border-radius:16px;padding:10px 12px}.A5同步狀態{font-size:.76rem;font-weight:900;color:#176b47}.A5同步狀態.離線{color:#ad5b18}.A5同步按鈕{border:1px solid #d5e3db;background:#f7faf8;color:#176b47;border-radius:12px;padding:8px 10px;font-weight:900}
      .A5照篩選{display:flex;gap:7px;overflow-x:auto;padding:2px 0}.A5照篩選 button{flex:0 0 auto;border:1px solid #dce7e1;background:#fff;color:#345344;border-radius:999px;padding:9px 14px;font-weight:900}.A5照篩選 button.作用中{background:#176b47;color:#fff;border-color:#176b47}
      .A5照統計{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.A5照統計 article{background:#fff;border:1px solid #e0e9e4;border-radius:18px;padding:12px}.A5照統計 small{display:block;color:#75827b;font-weight:800}.A5照統計 b{display:block;margin-top:3px;font-size:1.35rem;color:#173f2f}
      .A5照網格{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.A5照片卡{background:#fff;border:1px solid #e0e9e4;border-radius:18px;overflow:hidden;box-shadow:0 7px 18px rgba(24,65,47,.05)}.A5照片圖按鈕{display:block;width:100%;padding:0;border:0;background:#eef2ef;cursor:pointer;position:relative}.A5照片卡 img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#eef2ef}.A5照片無內建{width:100%;aspect-ratio:4/3;display:grid;place-items:center;padding:18px;text-align:center;color:#6f7e76;background:linear-gradient(135deg,#eff4f1,#e5ede8);font-weight:800}.A5照片圖提示{position:absolute;right:8px;bottom:8px;background:rgba(14,54,38,.82);color:#fff;border-radius:999px;padding:5px 8px;font-size:.64rem;font-weight:900}
      .A5照片內容{padding:11px}.A5照片內容 h4{margin:0 0 4px;color:#173f2f;font-size:.93rem}.A5照片內容 p{margin:3px 0;color:#75827b;font-size:.72rem;line-height:1.45}.A5照片標籤{display:inline-block;border-radius:999px;padding:4px 7px;font-size:.65rem;font-weight:900;background:#eef7f2;color:#176b47}.A5照片標籤.待重拍{background:#fff0e3;color:#ad5b18}.A5照片標籤.錯誤{background:#fde9ea;color:#b22a32}.A5照片連結{display:inline-block;margin:7px 10px 0 0;color:#176b47;font-weight:900;font-size:.72rem;text-decoration:none;border:0;background:none;padding:0}.A5照空{background:#fff;border:1px dashed #d7e2dc;border-radius:18px;padding:28px;text-align:center;color:#7b8981}
      .A5圖檢視遮罩{position:fixed;inset:0;z-index:99999;background:rgba(8,20,14,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:calc(18px + env(safe-area-inset-top)) 14px calc(18px + env(safe-area-inset-bottom))}.A5圖檢視遮罩.隱藏{display:none!important}.A5圖檢視工具{width:min(100%,900px);display:flex;align-items:center;justify-content:space-between;gap:10px;color:#fff;margin-bottom:10px}.A5圖檢視標題{font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.A5圖關閉{flex:0 0 auto;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.14);color:#fff;border-radius:14px;padding:9px 13px;font-weight:900}.A5圖檢視遮罩 img{display:block;max-width:min(100%,900px);max-height:78vh;object-fit:contain;border-radius:14px;background:#fff}.A5圖檢視備註{color:rgba(255,255,255,.76);font-size:.72rem;margin-top:9px;text-align:center}
      @media(max-width:430px){.A5照網格{grid-template-columns:1fr}.A5照統計{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.appendChild(st);
  }

  function 建檢視器(){
    let el=document.getElementById('A5圖檢視遮罩');
    if(el)return el;
    el=document.createElement('div');
    el.id='A5圖檢視遮罩';el.className='A5圖檢視遮罩 隱藏';
    el.innerHTML='<div class="A5圖檢視工具"><div id="A5圖檢視標題" class="A5圖檢視標題">現場照片</div><button id="A5圖關閉" class="A5圖關閉" type="button">✕ 關閉</button></div><img id="A5圖檢視圖片" alt="A5現場照片"><div class="A5圖檢視備註">照片由智慧5S PWA 內建資料顯示，不依賴 Google Drive 縮圖。</div>';
    document.body.appendChild(el);
    const 關=()=>{el.classList.add('隱藏');document.body.style.overflow='';};
    el.querySelector('#A5圖關閉').onclick=關;
    el.addEventListener('click',e=>{if(e.target===el)關();});
    return el;
  }

  function 看圖(id,title){
    const src=內建圖(id);if(!src)return;
    const el=建檢視器();
    el.querySelector('#A5圖檢視圖片').src=src;
    el.querySelector('#A5圖檢視標題').textContent=title||id;
    el.classList.remove('隱藏');document.body.style.overflow='hidden';
  }

  function 狀態標籤(x){
    const 可=文字(x.可作標準候選)==='是',重=文字(x.需改善後重拍)==='是';
    if(可&&!重)return ['V001候選',''];
    if(可&&重)return ['待改善重拍','待重拍'];
    if(!可&&重)return ['錯誤示例','錯誤'];
    return ['現況基線',''];
  }

  function 機台符合(x,filter){
    if(filter==='全部')return true;
    return 文字(x.機台編號)===filter;
  }

  function 卡片(x){
    const [標,cls]=狀態標籤(x);
    const id=文字(x.照片編號),src=內建圖(id);
    const title=`${文字(x.機台編號||'A5')}｜${文字(x.子類型||x.圖片類型||'現場照片')}`;
    const 圖=src
      ?`<button class="A5照片圖按鈕" type="button" data-A5看圖="${轉義(id)}" data-A5圖標題="${轉義(title)}"><img src="${src}" alt="${轉義(title)}" loading="lazy"><span class="A5照片圖提示">點圖放大</span></button>`
      :`<div class="A5照片無內建">PWA照片副本載入失敗<br>${轉義(id)}</div>`;
    return `<article class="A5照片卡">${圖}<div class="A5照片內容"><span class="A5照片標籤 ${cls}">${標}</span><h4>${轉義(title)}</h4><p>${轉義(id)}${x.工序?'｜'+轉義(x.工序):''}</p><p>${轉義(x.觀察重點||'')}</p>${src?`<button class="A5照片連結" type="button" data-A5看圖="${轉義(id)}" data-A5圖標題="${轉義(title)}">查看 PWA 原圖 →</button>`:''}${x.Drive網址?`<a class="A5照片連結" href="${轉義(x.Drive網址)}" target="_blank" rel="noopener noreferrer">Drive來源 ↗</a>`:''}</div></article>`;
  }

  function 畫面(){
    設頁首();注入樣式();
    const 容器=document.getElementById('頁面內容');if(!容器)return;
    const a5=當前資料.filter(x=>機台符合(x,當前篩選));
    const 候選=a5.filter(x=>文字(x.可作標準候選)==='是'&&文字(x.需改善後重拍)!=='是');
    const 待重拍=a5.filter(x=>文字(x.需改善後重拍)==='是');
    const 離線=同步狀態.includes('離線')||同步狀態.includes('失敗');
    容器.innerHTML=`<div class="A5照頁">
      <section class="A5照英雄"><h2>A5｜1044 → 1046 → 1045</h2><p>標準照片採「PWA離線優先」。即使 Google 試算表暫時無法連線，照片仍可正常檢視；中央資料恢復後會自動補同步。</p></section>
      <div class="A5同步列"><span class="A5同步狀態 ${離線?'離線':''}">${轉義(同步狀態)}</span><button id="A5同步中央" class="A5同步按鈕" type="button">同步中央資料</button></div>
      <div class="A5照篩選">${篩選清單.map(v=>`<button type="button" data-A5機台="${v}" class="${當前篩選===v?'作用中':''}">${v}</button>`).join('')}</div>
      <section class="A5照統計"><article><small>目前照片</small><b>${a5.length}</b></article><article><small>V001候選</small><b>${候選.length}</b></article><article><small>待改善重拍</small><b>${待重拍.length}</b></article></section>
      <section><div style="font-weight:900;color:#173f2f;margin:2px 0 9px">中央主檔候選：${主檔筆數} 筆｜PWA備援：11 筆</div><div class="A5照網格">${a5.map(卡片).join('')||'<div class="A5照空">目前沒有符合條件的照片</div>'}</div></section>
    </div>`;
    容器.querySelectorAll('[data-A5機台]').forEach(b=>b.onclick=()=>{當前篩選=b.getAttribute('data-A5機台')||'全部';畫面();});
    容器.querySelectorAll('[data-A5看圖]').forEach(b=>b.onclick=()=>看圖(b.getAttribute('data-A5看圖'),b.getAttribute('data-A5圖標題')));
    const sync=document.getElementById('A5同步中央');if(sync)sync.onclick=()=>同步中央(true);
  }

  async function 讀取(name){
    const d=db();
    if(!d||typeof d.讀取分頁!=='function')throw new Error('中央資料庫尚未就緒');
    const r=await d.讀取分頁(name,5000);
    if(!r||!Array.isArray(r.資料))throw new Error(`${name} 無資料`);
    return r.資料;
  }

  function 合併現場資料(rows){
    const map=new Map(rows.map(x=>[文字(x.照片編號),x]));
    return 備援資料.map(base=>{
      const newer=map.get(base.照片編號)||{};
      return {...base,...newer,Drive網址:文字(newer.Drive網址)||base.Drive網址};
    });
  }

  async function 同步中央(手動){
    同步狀態=手動?'正在同步中央資料…':'PWA內建資料｜背景同步中';
    畫面();
    const [現場結果,主檔結果]=await Promise.allSettled([讀取('5S_現場照片清冊'),讀取('5S_標準照片主檔')]);
    let 成功=0;
    if(現場結果.status==='fulfilled'){
      const rows=現場結果.value.filter(x=>文字(x.主區域)==='A5'&&備援資料.some(b=>b.照片編號===文字(x.照片編號)));
      if(rows.length){當前資料=合併現場資料(rows);成功++;}
    }
    if(主檔結果.status==='fulfilled'){
      const rows=主檔結果.value.filter(x=>文字(x.區域代碼)==='A5'&&(文字(x.子區域代碼).includes('1044')||文字(x.子區域代碼).includes('1046')||文字(x.子區域代碼).includes('1045')));
      主檔筆數=rows.length;成功++;
    }
    if(成功===2)同步狀態='中央資料已同步｜照片由PWA顯示';
    else if(成功===1)同步狀態='中央資料部分同步｜PWA照片正常可用';
    else 同步狀態='中央資料暫離線｜PWA照片仍可正常使用';
    畫面();
  }

  function 開啟(filter){
    當前篩選=篩選清單.includes(filter)?filter:'全部';
    當前資料=備援資料.map(x=>({...x}));
    主檔筆數=0;
    同步狀態='PWA內建照片已載入｜中央資料背景同步中';
    畫面();
    setTimeout(()=>同步中央(false),60);
  }

  function 攔截(e){
    const b=e.target&&e.target.closest?e.target.closest('[data-視覺頁="標準"]'):null;
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();開啟('全部');
  }

  document.addEventListener('click',攔截,true);
  全域.智慧5SA5標準照片回接=Object.freeze({版本,開啟,同步中央,備援資料});
})(window);
