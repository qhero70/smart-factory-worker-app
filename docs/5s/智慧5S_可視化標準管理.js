(function (全域) {
  'use strict';

  const 模組版本 = '1.1.0';
  const 設定 = 全域.智慧5S設定;
  const 資料庫 = 全域.智慧5S資料庫;
  const 使用者快取鍵 = '智慧5S_目前使用者';

  if (!設定 || !資料庫) {
    console.error('智慧5S可視化標準管理：找不到設定或資料庫模組。');
    return;
  }

  const 分頁 = {
    標準照片: 設定.分頁.標準照片主檔 || '5S_標準照片主檔',
    對照卡: 設定.分頁.標準對照卡 || '5S_標準對照卡',
    責任區: 設定.分頁.責任區主檔 || '5S_責任區主檔',
    導入進度: 設定.分頁.導入進度 || '5S_導入進度',
    稽核週期: 設定.分頁.稽核週期 || '5S_稽核週期',
    里程碑: 設定.分頁.里程碑 || '5S_里程碑',
    區域主檔: 設定.分頁.區域主檔,
    檢查項目: 設定.分頁.檢查項目,
    人員主檔: 設定.分頁.人員主檔,
    巡檢主檔: 設定.分頁.巡檢主檔,
    巡檢明細: 設定.分頁.巡檢明細,
    改善單: 設定.分頁.改善單,
    照片: 設定.分頁.照片
  };

  const 欄位 = {
    標準照片: ['標準照片編號','區域代碼','區域名稱','子區域代碼','標準版本','適用生產狀態','照片資料','建立日期','生效日期','失效日期','目前生效','建立人工號','建立人姓名','核准人','備註'],
    對照卡: ['對照卡編號','區域代碼','區域名稱','子區域代碼','問題類型','錯誤照片','正確照片','錯誤說明','正確做法','適用生產狀態','版本','啟用','更新時間'],
    責任區: ['責任區編號','主區域代碼','主區域名稱','子區域代碼','子區域名稱','主要負責人工號','主要負責人姓名','代理人工號','代理人姓名','主管工號','主管姓名','責任狀態','版次','生效日期','備註'],
    導入進度: ['區域代碼','區域名稱','計畫開始日','預計完成日','實際開始日','實際完成日','區域盤點','責任人確認','標準照片完成','現場張貼完成','首次稽核','穩定維持','導入進度','進度狀態','負責人工號','負責人姓名','備註','更新時間'],
    稽核週期: ['區域代碼','區域名稱','目前頻率','基準頻率','連續達標次數','最近得分','最近稽核日','下次稽核日','降頻條件','升頻條件','重大異常複查天數','狀態','更新時間'],
    巡檢主檔: ['巡檢單號','區域代碼','區域名稱','檢查清單代碼','巡檢人工號','巡檢人姓名','巡檢日期','開始時間','送出時間','總得分','最高總分','得分率','異常項數','狀態','裝置識別碼','備註','建立時間'],
    巡檢明細: ['明細編號','巡檢單號','項目代碼','5S分類','檢查內容','得分','最高分','權重','是否異常','異常原因','照片資料','改善單號','建立時間'],
    改善單: ['改善單號','來源類型','來源單號','區域代碼','區域名稱','5S分類','問題標題','問題說明','嚴重度','負責人工號','負責人姓名','期限','狀態','改善前照片','改善後照片','驗證人工號','驗證時間','驗證結果','結案時間','逾期天數','建立時間','更新時間'],
    照片: ['照片編號','參照類型','參照單號','區域代碼','上傳人工號','拍攝時間','資料摘要','儲存方式','照片資料']
  };

  const 狀態 = { 目前分頁: '總覽', 快取: {}, 目前稽核: null, 忙碌: false };

  function 文字(值) { return String(值 == null ? '' : 值).trim(); }
  function 數值(值, 預設值) { const n = Number(值); return Number.isFinite(n) ? n : (預設值 || 0); }
  function 轉義(值) { return String(值 == null ? '' : 值).replace(/[&<>'\"]/g, 字 => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[字])); }
  function 補零(n) { return String(n).padStart(2, '0'); }
  function 今天() { const d = new Date(); return `${d.getFullYear()}-${補零(d.getMonth()+1)}-${補零(d.getDate())}`; }
  function 現在字串() { const d = new Date(); return `${今天()} ${補零(d.getHours())}:${補零(d.getMinutes())}:${補零(d.getSeconds())}`; }
  function 日期加天(日, 天數) { const d = new Date(`${文字(日 || 今天()).slice(0,10)}T12:00:00`); d.setDate(d.getDate()+Number(天數||0)); return `${d.getFullYear()}-${補零(d.getMonth()+1)}-${補零(d.getDate())}`; }
  function 天數差(日) { if (!日) return null; const d = new Date(`${文字(日).slice(0,10)}T23:59:59`); if (Number.isNaN(d.getTime())) return null; return Math.ceil((d.getTime()-Date.now())/86400000); }
  function 產生編號(前綴) { const d = new Date(); return `${前綴}-${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}${補零(d.getHours())}${補零(d.getMinutes())}${補零(d.getSeconds())}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }
  function 目前使用者() { try { return JSON.parse(localStorage.getItem(使用者快取鍵) || 'null') || {}; } catch (_) { return {}; } }
  function 可以管理() { const u = 目前使用者(); return ['主管','區域負責人'].includes(文字(u.系統角色)) || /主任|主管|工程師|幹部/.test(`${文字(u.職稱)}${文字(u.角色類型)}`); }
  function 物件轉值(物件, 欄名) { return 欄名.map(k => 物件[k] == null ? '' : 物件[k]); }
  async function 讀取分頁(名稱, 強制) { if (!強制 && 狀態.快取[名稱]) return 狀態.快取[名稱]; const r = await 資料庫.讀取分頁(名稱, 設定.讀取上限 || 5000); 狀態.快取[名稱] = {欄位:r.欄位||[],資料:r.資料||[]}; return 狀態.快取[名稱]; }
  function 清快取(...名稱) { 名稱.forEach(n => delete 狀態.快取[n]); }
  async function 新增(名稱, 欄名, 物件) { return 資料庫.送出或排隊({工作類型:'新增',分頁名稱:名稱,欄位:欄名,值:物件轉值(物件,欄名)}); }
  async function 更新(名稱, 欄名, 物件) { if (!物件._列號) throw new Error('資料缺少列號，請重新讀取後再操作'); return 資料庫.送出或排隊({工作類型:'更新',分頁名稱:名稱,列號:物件._列號,欄位:欄名,值:物件轉值(物件,欄名)}); }

  function 顯示通知(內容, 類型) {
    const e = document.getElementById('通知');
    if (!e) return;
    e.textContent = 內容;
    e.className = `通知 顯示${類型 ? ` ${類型}` : ''}`;
    clearTimeout(顯示通知.計時器);
    顯示通知.計時器 = setTimeout(() => { e.className = '通知'; }, 3600);
  }

  function 顯示讀取(標題, 說明) {
    const 遮罩 = document.getElementById('讀取遮罩');
    if (!遮罩) return;
    document.getElementById('讀取標題').textContent = 標題 || '資料處理中';
    document.getElementById('讀取說明').textContent = 說明 || '請稍候…';
    遮罩.classList.remove('隱藏');
  }
  function 隱藏讀取() { document.getElementById('讀取遮罩')?.classList.add('隱藏'); }

  function 開彈窗(標題, 副標, 內容) {
    const 遮罩 = document.getElementById('彈窗遮罩');
    if (!遮罩) return;
    document.getElementById('彈窗標題').textContent = 標題;
    document.getElementById('彈窗副標').textContent = 副標 || '';
    document.getElementById('彈窗內容').innerHTML = 內容;
    遮罩.classList.remove('隱藏');
    document.body.style.overflow = 'hidden';
  }
  function 關彈窗() { document.getElementById('彈窗遮罩')?.classList.add('隱藏'); document.body.style.overflow = ''; }

  function 注入樣式() {
    if (document.getElementById('智慧5S可視化管理樣式')) return;
    const 樣式 = document.createElement('style');
    樣式.id = '智慧5S可視化管理樣式';
    樣式.textContent = `
      .可視化頁{display:grid;gap:15px}.可視化頁籤{display:flex;gap:7px;overflow:auto;padding-bottom:2px}.可視化頁籤 button{white-space:nowrap;border:1px solid #dfe8e3;border-radius:999px;background:#fff;padding:9px 12px;font-weight:900;color:#365346}.可視化頁籤 button.作用中{background:#176b47;color:#fff;border-color:#176b47}
      .可視化主視覺{padding:20px;border-radius:25px;background:linear-gradient(135deg,#123c2b,#208058);color:#fff;box-shadow:0 15px 38px rgba(23,107,71,.18)}.可視化主視覺 h2{margin:0 0 7px;font-size:1.35rem}.可視化主視覺 p{margin:0;line-height:1.65;color:rgba(255,255,255,.86)}.可視化倒數{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.可視化倒數 span{background:rgba(255,255,255,.14);border-radius:999px;padding:6px 9px;font-size:.72rem;font-weight:900}
      .可視化KPI{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.可視化KPI article,.可視化卡{background:#fff;border:1px solid #e3ebe6;border-radius:19px;padding:14px;box-shadow:0 8px 24px rgba(18,59,43,.055)}.可視化KPI small{display:block;color:#74827a;font-weight:800}.可視化KPI b{display:block;margin-top:4px;font-size:1.45rem;color:#173d2e}.可視化KPI span{font-size:.68rem;color:#88928d}.可視化卡 h3{margin:0 0 4px;color:#1d4434}.可視化副文{color:#74827a;font-size:.74rem;line-height:1.55}
      .可視化雙欄{display:grid;grid-template-columns:1fr 1fr;gap:12px}.責任地圖{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:11px}.責任格{border:0;border-radius:12px;padding:9px 3px;min-height:54px;background:#eef2ef;color:#475a50;font-weight:900}.責任格.進行中{background:#fff2d9;color:#a45d00}.責任格.已完成{background:#e7f7ec;color:#176b47}.責任格.落後{background:#ffe8e5;color:#aa3025}.責任格 small{display:block;font-size:.6rem;margin-top:2px}
      .可視化列{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #edf1ef}.可視化列:last-child{border-bottom:0}.可視化列 strong{display:block;color:#203e32}.可視化列 small{display:block;margin-top:3px;color:#7c8882}.狀態籤{display:inline-block;padding:5px 8px;border-radius:999px;background:#edf2ef;color:#516158;font-size:.68rem;font-weight:900}.狀態籤.綠{background:#e8f7ed;color:#176b47}.狀態籤.黃{background:#fff1d8;color:#a65c00}.狀態籤.紅{background:#ffe9e6;color:#ac3126}.狀態籤.藍{background:#eaf0ff;color:#355aa8}
      .標準照片網格,.對照網格{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.標準照片卡{border:1px solid #e4ebe7;border-radius:17px;overflow:hidden;background:#fff}.標準照片卡 img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#eef2ef}.標準照片卡 .內文{padding:11px}.標準照片卡 h4{margin:0;color:#203f32}.標準照片卡 p{margin:4px 0 0;color:#7a8780;font-size:.7rem}.對照照片{display:grid;grid-template-columns:1fr 1fr;gap:7px}.對照照片 div{position:relative}.對照照片 img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#eef2ef}.對照照片 b{position:absolute;left:6px;top:6px;border-radius:999px;padding:4px 7px;background:rgba(0,0,0,.66);color:#fff;font-size:.62rem}
      .可視化操作列{display:flex;gap:7px;flex-wrap:wrap}.可視化按鈕{border:0;border-radius:12px;padding:9px 11px;font-weight:900;cursor:pointer}.可視化按鈕.主{background:#176b47;color:#fff}.可視化按鈕.次{background:#edf3ef;color:#28513d}.可視化表單{display:grid;gap:11px}.可視化表單 label{font-size:.76rem;font-weight:900;color:#40564b}.可視化表單 input,.可視化表單 select,.可視化表單 textarea{width:100%;margin-top:5px;border:1px solid #d9e3dd;border-radius:13px;padding:11px;font-size:16px;background:#fff}.可視化表單 textarea{min-height:82px}
      .進度項{padding:12px;border:1px solid #e4ebe7;border-radius:16px;background:#fbfcfb;margin-top:8px}.進度上{display:flex;justify-content:space-between;gap:8px}.進度條{height:9px;border-radius:999px;background:#e9eeeb;overflow:hidden;margin-top:8px}.進度值{height:100%;background:linear-gradient(90deg,#218259,#54ba82)}.進度階段{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px}.進度階段 span{padding:4px 6px;border-radius:999px;background:#eef2ef;color:#6c7972;font-size:.62rem}.進度階段 span.完成{background:#e7f7ec;color:#176b47}.甘特列{display:grid;grid-template-columns:88px 1fr;gap:7px;align-items:center;margin-top:7px}.甘特名稱{font-size:.72rem;font-weight:900;color:#395146}.甘特線{height:16px;border-radius:999px;background:#eef2ef;overflow:hidden}.甘特段{height:100%;border-radius:999px;background:linear-gradient(90deg,#27885e,#70c397)}.甘特段.落後{background:linear-gradient(90deg,#ca4e42,#ed887d)}
      .稽核項{padding:13px;border:1px solid #e4ebe7;border-radius:16px;background:#fff;margin-top:9px}.稽核項.異常{background:#fff9f8;border-color:#efc0ba}.稽核項 h4{margin:0;color:#213f33}.評分列{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:9px}.評分列 button{border:1px solid #dce5e0;border-radius:11px;padding:8px 2px;background:#f7f9f8;font-weight:900}.評分列 button.已選{background:#176b47;color:#fff;border-color:#176b47}.異常欄{display:grid;gap:7px;margin-top:9px}.異常欄 textarea{width:100%;border:1px solid #e2d3d0;border-radius:11px;padding:9px}.異常欄 img{width:120px;height:90px;object-fit:cover;border-radius:9px}.隱藏可視化{display:none!important}
      @media(max-width:820px){.可視化KPI{grid-template-columns:repeat(2,minmax(0,1fr))}.可視化雙欄{grid-template-columns:1fr}.責任地圖{grid-template-columns:repeat(4,minmax(0,1fr))}.標準照片網格,.對照網格{grid-template-columns:1fr}.底部導航{overflow-x:auto}.底部導航 .導航按鈕{min-width:64px}}
    `;
    document.head.appendChild(樣式);
  }

  async function 載入總覽資料(強制) {
    const 名稱 = [分頁.標準照片,分頁.對照卡,分頁.責任區,分頁.導入進度,分頁.稽核週期,分頁.里程碑,分頁.區域主檔];
    const 結果 = await Promise.all(名稱.map(n => 讀取分頁(n, 強制).catch(() => ({欄位:[],資料:[]}))));
    const 物件 = {};
    名稱.forEach((n,i) => { 物件[n] = 結果[i].資料 || []; });
    return 物件;
  }

  function 進度狀態色(狀態值) { const s = 文字(狀態值); if (s.includes('完成')) return '綠'; if (s.includes('落後')) return '紅'; if (s.includes('進行')) return '黃'; return '藍'; }

  async function 顯示總覽() {
    const d = await 載入總覽資料(false);
    const 進度 = d[分頁.導入進度];
    const 責任 = d[分頁.責任區];
    const 標準 = d[分頁.標準照片].filter(x => 文字(x.目前生效) === '是');
    const 週期 = d[分頁.稽核週期];
    const 里程碑 = d[分頁.里程碑];
    const 平均進度 = 進度.length ? Math.round(進度.reduce((a,b)=>a+數值(b.導入進度),0)/進度.length) : 0;
    const 進行數 = 進度.filter(x => 數值(x.導入進度)>0 && 數值(x.導入進度)<100).length;
    const 待指派 = 責任.filter(x => !文字(x.主要負責人工號) || 文字(x.責任狀態)==='待指派').length;
    const 應稽核 = 週期.filter(x => { const n=天數差(x.下次稽核日); return n!=null && n<=0; }).length;
    const 期中 = 天數差('2026-09-30');
    const 截止 = 天數差('2026-10-15');
    const 地圖 = 進度.map(x => `<button class="責任格 ${轉義(x.進度狀態||'')}" data-導入區域="${轉義(x.區域代碼)}">${轉義(x.區域代碼)}<small>${數值(x.導入進度)}%</small></button>`).join('');
    const 里程 = 里程碑.map(x => `<div class="可視化列"><div><strong>${轉義(x.里程碑名稱)}</strong><small>${轉義(x.目標日)}｜${轉義(x.完成條件)}</small></div><span class="狀態籤 ${進度狀態色(x.狀態)}">${轉義(x.狀態)}</span></div>`).join('');
    return `<section class="可視化主視覺"><h2>5S 現場可視化標準與責任管理</h2><p>標準照片、責任區、導入甘特、0–4 分稽核與動態巡檢週期全部整合進同一個管理閉環。</p><div class="可視化倒數"><span>9/30 期中審查：${期中 == null ? '—' : Math.max(0,期中)} 天</span><span>10/15 全廠 Deadline：${截止 == null ? '—' : Math.max(0,截止)} 天</span><span>版本 v${模組版本}</span></div></section>
      <section class="可視化KPI"><article><small>全廠導入平均</small><b>${平均進度}%</b><span>${進度.length} 個主區域</span></article><article><small>進行中區域</small><b>${進行數}</b><span>已啟動但尚未100%</span></article><article><small>責任待指派</small><b>${待指派}</b><span>A3/A4/474 等需細分</span></article><article><small>目前生效標準</small><b>${標準.length}</b><span>換線採版本切換</span></article></section>
      <section class="可視化雙欄"><article class="可視化卡"><h3>🗺 全廠導入地圖</h3><div class="可視化副文">點選區域可更新六階段導入進度。</div><div class="責任地圖">${地圖 || '<span class="可視化副文">尚無進度資料</span>'}</div></article><article class="可視化卡"><h3>🎯 專案里程碑</h3><div class="可視化副文">會議決議已轉為可追蹤的系統時程。</div>${里程 || '<div class="可視化副文">尚無里程碑</div>'}</article></section>
      <section class="可視化卡"><h3>🧭 動態稽核</h3><div class="可視化副文">目前到期或逾期應稽核：<b>${應稽核}</b> 區。規則：新建區7天；連續3次≥85改14天；連續3次≥90改30天；任一次&lt;80回7天；重大異常3天內複查。</div></section>`;
  }

  async function 顯示標準照片() {
    const d = await 載入總覽資料(false);
    const 標準 = d[分頁.標準照片].filter(x => 文字(x.目前生效)==='是');
    const 對照 = d[分頁.對照卡].filter(x => 文字(x.啟用)!=='否');
    const 標準HTML = 標準.map(x => `<article class="標準照片卡"><img src="${轉義(x.照片資料)}" alt="標準照片"><div class="內文"><h4>${轉義(x.區域名稱||x.區域代碼)} · ${轉義(x.標準版本||'V1')}</h4><p>${轉義(x.適用生產狀態||'目前生產狀態')}｜生效 ${轉義(x.生效日期||x.建立日期)}</p></div></article>`).join('');
    const 對照HTML = 對照.map(x => `<article class="可視化卡"><div class="對照照片"><div><img src="${轉義(x.錯誤照片)}" alt="錯誤示範"><b>❌ 錯誤</b></div><div><img src="${轉義(x.正確照片)}" alt="正確標準"><b>✅ 正確</b></div></div><h3 style="margin-top:9px">${轉義(x.問題類型||'現場對照')}</h3><div class="可視化副文">${轉義(x.錯誤說明)} → ${轉義(x.正確做法)}</div></article>`).join('');
    return `<section class="可視化卡"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h3>📷 目前生效標準照片</h3><div class="可視化副文">換線時建立新版本，舊版保留歷史但自動失效。</div></div>${可以管理()?'<div class="可視化操作列"><button id="新增標準照片" class="可視化按鈕 主">新增標準</button><button id="新增對照卡" class="可視化按鈕 次">新增對照卡</button></div>':''}</div><div class="標準照片網格" style="margin-top:11px">${標準HTML||'<div class="可視化副文">尚未上傳正式標準照片。先從 B6、A9 建立。</div>'}</div></section><section><h3 style="margin:2px 0 9px;color:#24483a">錯誤 vs 正確 對照卡</h3><div class="對照網格">${對照HTML||'<article class="可視化卡"><div class="可視化副文">尚無對照卡。</div></article>'}</div></section>`;
  }

  async function 顯示責任區() {
    const d = await 載入總覽資料(false);
    const 清單 = d[分頁.責任區];
    const html = 清單.map(x => `<div class="可視化列"><div><strong>${轉義(x.子區域名稱||x.主區域名稱)}</strong><small>${轉義(x.子區域代碼||x.主區域代碼)}｜主要：${轉義(x.主要負責人姓名||'尚未指派')}｜代理：${轉義(x.代理人姓名||'—')}｜主管：${轉義(x.主管姓名||'—')}</small></div><div style="display:flex;gap:6px;align-items:center"><span class="狀態籤 ${文字(x.責任狀態)==='待指派'?'紅':'綠'}">${轉義(x.責任狀態||'待指派')}</span>${可以管理()?`<button class="可視化按鈕 次" data-責任編號="${轉義(x.責任區編號)}">編輯</button>`:''}</div></div>`).join('');
    return `<section class="可視化卡"><h3>👤 責任區主檔</h3><div class="可視化副文">A3、A4、474 已建立待細分項；B6、A9 納入責任制。責任圖與最新 Layout 應共用同一版次。</div><div style="margin-top:7px">${html||'<div class="可視化副文">尚無責任區資料。</div>'}</div></section>`;
  }

  async function 顯示甘特進度() {
    const d = await 載入總覽資料(false);
    const list = d[分頁.導入進度];
    const 起 = new Date('2026-08-22T00:00:00').getTime();
    const 迄 = new Date('2026-10-15T23:59:59').getTime();
    const 跨度 = Math.max(1, 迄-起);
    const 甘特 = list.map(x => { const s=new Date(`${x.計畫開始日}T00:00:00`).getTime(); const e=new Date(`${x.預計完成日}T23:59:59`).getTime(); const left=Math.max(0,Math.min(100,(s-起)/跨度*100)); const width=Math.max(2,Math.min(100-left,(e-s)/跨度*100)); const late=天數差(x.預計完成日)<0&&數值(x.導入進度)<100; return `<div class="甘特列"><div class="甘特名稱">${轉義(x.區域代碼)} ${數值(x.導入進度)}%</div><div class="甘特線"><div class="甘特段 ${late?'落後':''}" style="margin-left:${left}%;width:${width}%"></div></div></div>`; }).join('');
    const stages = ['區域盤點','責任人確認','標準照片完成','現場張貼完成','首次稽核','穩定維持'];
    const 詳細 = list.map(x => `<article class="進度項" data-導入區域="${轉義(x.區域代碼)}"><div class="進度上"><div><strong>${轉義(x.區域名稱)}</strong><div class="可視化副文">${轉義(x.計畫開始日)} → ${轉義(x.預計完成日)}</div></div><span class="狀態籤 ${進度狀態色(x.進度狀態)}">${數值(x.導入進度)}% · ${轉義(x.進度狀態)}</span></div><div class="進度條"><div class="進度值" style="width:${Math.max(0,Math.min(100,數值(x.導入進度)))}%"></div></div><div class="進度階段">${stages.map(k=>`<span class="${文字(x[k])==='是'?'完成':''}">${文字(x[k])==='是'?'✓':'○'} ${k}</span>`).join('')}</div></article>`).join('');
    return `<section class="可視化卡"><h3>📅 全廠 5S 導入甘特</h3><div class="可視化副文">8/22 啟動 → 9/30 期中審查 → 10/15 全廠內部 Deadline。</div><div style="margin-top:10px">${甘特}</div></section><section class="可視化卡"><h3>✅ 六階段進度</h3><div class="可視化副文">區域盤點 → 責任人確認 → 標準照片 → 現場張貼 → 首次稽核 → 穩定維持。</div>${詳細}</section>`;
  }

  async function 顯示稽核入口() {
    const [區域結果,週期結果] = await Promise.all([讀取分頁(分頁.區域主檔,false),讀取分頁(分頁.稽核週期,false)]);
    const 區域 = 區域結果.資料.filter(x => 文字(x.啟用)!=='否');
    const 週期 = 週期結果.資料.slice().sort((a,b)=>文字(a.下次稽核日).localeCompare(文字(b.下次稽核日)));
    const options = 區域.map(x => `<option value="${轉義(x.區域代碼)}">${轉義(x.區域名稱)}</option>`).join('');
    const due = 週期.map(x => `<div class="可視化列"><div><strong>${轉義(x.區域名稱)}</strong><small>最近：${轉義(x.最近得分||'—')} 分｜下次：${轉義(x.下次稽核日||'未設定')}</small></div><span class="狀態籤 ${天數差(x.下次稽核日)<=0?'紅':'藍'}">${轉義(x.目前頻率||'每週')} · ${轉義(x.狀態||'待稽核')}</span></div>`).join('');
    return `<section class="可視化主視覺"><h2>0–4 分可視化稽核</h2><p>4=完全符合、3=輕微偏差、2=明顯偏差、1=嚴重不符、0=無標準／完全失控。低於4分一律建立改善紀錄。</p></section><section class="可視化雙欄"><article class="可視化卡"><h3>開始稽核</h3><div class="可視化表單"><label>稽核區域<select id="可視化稽核區域">${options}</select></label><button id="開始可視化稽核" class="可視化按鈕 主">開始 0–4 分稽核</button></div></article><article class="可視化卡"><h3>動態週期規則</h3><div class="可視化副文">連續3次 ≥85：14天；連續3次 ≥90：30天；任一次 &lt;80：7天；重大異常：3天內複查。</div></article></section><section class="可視化卡"><h3>近期應稽核</h3>${due||'<div class="可視化副文">尚無稽核週期資料。</div>'}</section>`;
  }

  async function 顯示目前分頁() {
    const 容器 = document.getElementById('頁面內容');
    if (!容器) return;
    顯示讀取('更新可視化戰情','正在整合標準、責任、進度與稽核資料…');
    try {
      let 內容 = '';
      if (狀態.目前分頁==='總覽') 內容 = await 顯示總覽();
      else if (狀態.目前分頁==='標準') 內容 = await 顯示標準照片();
      else if (狀態.目前分頁==='責任') 內容 = await 顯示責任區();
      else if (狀態.目前分頁==='進度') 內容 = await 顯示甘特進度();
      else 內容 = await 顯示稽核入口();
      const 頁籤 = [['總覽','戰情總覽'],['標準','標準照片'],['責任','責任區'],['進度','甘特進度'],['稽核','0–4稽核']].map(x=>`<button data-可視化頁籤="${x[0]}" class="${狀態.目前分頁===x[0]?'作用中':''}">${x[1]}</button>`).join('');
      容器.innerHTML = `<div class="可視化頁"><div class="可視化頁籤">${頁籤}</div>${內容}</div>`;
      綁定頁面事件();
    } catch (錯誤) {
      容器.innerHTML = `<section class="可視化卡"><h3>可視化資料載入失敗</h3><div class="可視化副文">${轉義(錯誤.message||錯誤)}</div><button id="可視化重試" class="可視化按鈕 主" style="margin-top:10px">重新讀取</button></section>`;
      document.getElementById('可視化重試')?.addEventListener('click',()=>{狀態.快取={};顯示目前分頁();});
    } finally { 隱藏讀取(); }
  }

  function 進入可視化中心() {
    document.querySelectorAll('.導航按鈕').forEach(b => b.classList.remove('作用中'));
    document.getElementById('可視化導航')?.classList.add('作用中');
    const 標題 = document.getElementById('頁面標題');
    const 副標 = document.getElementById('頁面副標');
    if (標題) 標題.textContent = '5S 可視化標準管理';
    if (副標) 副標.textContent = '標準照片｜責任區｜甘特｜0–4稽核';
    狀態.目前分頁 = '總覽';
    顯示目前分頁();
  }

  function 綁定頁面事件() {
    document.querySelectorAll('[data-可視化頁籤]').forEach(b => b.onclick = () => { 狀態.目前分頁=b.dataset.可視化頁籤; 顯示目前分頁(); });
    document.querySelectorAll('[data-導入區域]').forEach(b => { if (可以管理()) b.onclick = () => 開啟進度編輯(b.dataset.導入區域); });
    document.querySelectorAll('[data-責任編號]').forEach(b => b.onclick = () => 開啟責任編輯(b.dataset.責任編號));
    document.getElementById('新增標準照片')?.addEventListener('click',開啟新增標準);
    document.getElementById('新增對照卡')?.addEventListener('click',開啟新增對照卡);
    document.getElementById('開始可視化稽核')?.addEventListener('click',()=>開始稽核(document.getElementById('可視化稽核區域').value));
  }

  async function 取得區域選項() {
    const r = await 讀取分頁(分頁.區域主檔,false);
    return r.資料.filter(x=>文字(x.啟用)!=='否');
  }

  async function 壓縮照片(檔案) {
    if (!檔案) throw new Error('請選擇照片');
    const 圖 = await new Promise((完成,失敗)=>{ const img=new Image(); const u=URL.createObjectURL(檔案); img.onload=()=>{URL.revokeObjectURL(u);完成(img);}; img.onerror=()=>{URL.revokeObjectURL(u);失敗(new Error('照片讀取失敗'));}; img.src=u; });
    const 最大 = 900;
    const 比例 = Math.min(1,最大/Math.max(圖.width,圖.height));
    const c = document.createElement('canvas');
    c.width=Math.max(1,Math.round(圖.width*比例)); c.height=Math.max(1,Math.round(圖.height*比例));
    c.getContext('2d').drawImage(圖,0,0,c.width,c.height);
    let q=.78, data=c.toDataURL('image/jpeg',q), 上限=數值(設定.照片最大字元,42000);
    while(data.length>上限 && q>.25){q-=.08;data=c.toDataURL('image/jpeg',q);}
    if(data.length>上限) throw new Error('照片仍過大，請重新拍攝較近距離畫面');
    return data;
  }

  async function 開啟新增標準() {
    const areas = await 取得區域選項();
    開彈窗('新增標準照片','建立新版本並切換目前生效標準',`<div class="可視化表單"><label>區域<select id="標準區域">${areas.map(x=>`<option value="${轉義(x.區域代碼)}">${轉義(x.區域名稱)}</option>`).join('')}</select></label><label>適用生產狀態<input id="標準生產狀態" placeholder="例如：目前換線狀態；不知道可留白"></label><label>版本<input id="標準版本" value="V${Date.now().toString().slice(-4)}"></label><label>白底標準照片<input id="標準照片檔" type="file" accept="image/*" capture="environment"></label><label>備註<textarea id="標準備註" placeholder="確認後列印張貼於機台／作業區"></textarea></label><button id="儲存標準照片" class="可視化按鈕 主">設為目前生效標準</button></div>`);
    document.getElementById('儲存標準照片').onclick = 儲存標準照片;
  }

  async function 儲存標準照片() {
    if (狀態.忙碌) return;
    狀態.忙碌=true; 顯示讀取('建立標準照片','正在壓縮並切換標準版本…');
    try {
      const sel=document.getElementById('標準區域'); const code=sel.value; const name=sel.options[sel.selectedIndex].text; const file=document.getElementById('標準照片檔').files[0];
      const data=await 壓縮照片(file); const u=目前使用者();
      const 舊=(await 讀取分頁(分頁.標準照片,true)).資料.filter(x=>文字(x.區域代碼)===code&&文字(x.目前生效)==='是');
      for (const x of 舊) { await 更新(分頁.標準照片,欄位.標準照片,Object.assign({},x,{目前生效:'否',失效日期:今天()})); }
      await 新增(分頁.標準照片,欄位.標準照片,{標準照片編號:產生編號('5S-STD'),區域代碼:code,區域名稱:name,子區域代碼:code,標準版本:文字(document.getElementById('標準版本').value)||'V1',適用生產狀態:文字(document.getElementById('標準生產狀態').value),照片資料:data,建立日期:今天(),生效日期:今天(),失效日期:'',目前生效:'是',建立人工號:文字(u.工號),建立人姓名:文字(u.姓名),核准人:文字(u.姓名),備註:文字(document.getElementById('標準備註').value)});
      清快取(分頁.標準照片); 關彈窗(); 顯示通知('標準照片已設為目前生效版本'); await 顯示目前分頁();
    } catch(e) { 顯示通知(e.message||e,'錯誤'); } finally { 狀態.忙碌=false; 隱藏讀取(); }
  }

  async function 開啟新增對照卡() {
    const areas = await 取得區域選項();
    開彈窗('新增錯誤／正確對照卡','現場防呆標準',`<div class="可視化表單"><label>區域<select id="對照區域">${areas.map(x=>`<option value="${轉義(x.區域代碼)}">${轉義(x.區域名稱)}</option>`).join('')}</select></label><label>問題類型<input id="對照問題" placeholder="例如：工具錯位、私人物品、容器未定位"></label><label>❌ 錯誤照片<input id="對照錯誤檔" type="file" accept="image/*" capture="environment"></label><label>✅ 正確照片<input id="對照正確檔" type="file" accept="image/*" capture="environment"></label><label>錯誤說明<textarea id="對照錯誤說明"></textarea></label><label>正確做法<textarea id="對照正確做法"></textarea></label><button id="儲存對照卡" class="可視化按鈕 主">建立對照卡</button></div>`);
    document.getElementById('儲存對照卡').onclick = 儲存對照卡;
  }

  async function 儲存對照卡() {
    if (狀態.忙碌) return; 狀態.忙碌=true; 顯示讀取('建立對照卡','正在處理錯誤與正確照片…');
    try {
      const sel=document.getElementById('對照區域'); const code=sel.value; const name=sel.options[sel.selectedIndex].text;
      const 錯誤=await 壓縮照片(document.getElementById('對照錯誤檔').files[0]); const 正確=await 壓縮照片(document.getElementById('對照正確檔').files[0]);
      await 新增(分頁.對照卡,欄位.對照卡,{對照卡編號:產生編號('5S-CARD'),區域代碼:code,區域名稱:name,子區域代碼:code,問題類型:文字(document.getElementById('對照問題').value)||'現場擺放',錯誤照片:錯誤,正確照片:正確,錯誤說明:文字(document.getElementById('對照錯誤說明').value),正確做法:文字(document.getElementById('對照正確做法').value),適用生產狀態:'',版本:'V1',啟用:'是',更新時間:現在字串()});
      清快取(分頁.對照卡); 關彈窗(); 顯示通知('錯誤／正確對照卡已建立'); await 顯示目前分頁();
    } catch(e){顯示通知(e.message||e,'錯誤');} finally {狀態.忙碌=false;隱藏讀取();}
  }

  async function 開啟責任編輯(編號) {
    const [r,p] = await Promise.all([讀取分頁(分頁.責任區,true),讀取分頁(分頁.人員主檔,false)]);
    const row = r.資料.find(x=>文字(x.責任區編號)===文字(編號)); if(!row)return;
    const people = p.資料.filter(x=>文字(x.啟用)!=='否');
    const opt = (選)=>`<option value="">未指定</option>${people.map(x=>`<option value="${轉義(x.工號)}" ${文字(x.工號)===文字(選)?'selected':''}>${轉義(x.姓名)}｜${轉義(x.工號)}</option>`).join('')}`;
    開彈窗('責任區指派',`${row.主區域代碼}｜${row.子區域名稱}`,`<div class="可視化表單"><label>子區域名稱<input id="責任子區名稱" value="${轉義(row.子區域名稱)}"></label><label>主要負責人<select id="責任主要">${opt(row.主要負責人工號)}</select></label><label>代理人<select id="責任代理">${opt(row.代理人工號)}</select></label><label>主管<select id="責任主管">${opt(row.主管工號)}</select></label><label>備註<textarea id="責任備註">${轉義(row.備註)}</textarea></label><button id="儲存責任區" class="可視化按鈕 主">儲存責任分工</button></div>`);
    document.getElementById('儲存責任區').onclick=async()=>{
      try{
        const getPerson=id=>people.find(x=>文字(x.工號)===文字(document.getElementById(id).value))||{};
        const main=getPerson('責任主要'), proxy=getPerson('責任代理'), boss=getPerson('責任主管');
        const next=Object.assign({},row,{子區域名稱:文字(document.getElementById('責任子區名稱').value),主要負責人工號:文字(main.工號),主要負責人姓名:文字(main.姓名),代理人工號:文字(proxy.工號),代理人姓名:文字(proxy.姓名),主管工號:文字(boss.工號),主管姓名:文字(boss.姓名),責任狀態:文字(main.工號)?'已指派':'待指派',備註:文字(document.getElementById('責任備註').value)});
        await 更新(分頁.責任區,欄位.責任區,next); 清快取(分頁.責任區); 關彈窗(); 顯示通知('責任區已更新'); 顯示目前分頁();
      }catch(e){顯示通知(e.message||e,'錯誤');}
    };
  }

  async function 開啟進度編輯(區域代碼) {
    if(!可以管理()) return;
    const r=await 讀取分頁(分頁.導入進度,true); const row=r.資料.find(x=>文字(x.區域代碼)===文字(區域代碼)); if(!row)return;
    const stages=['區域盤點','責任人確認','標準照片完成','現場張貼完成','首次稽核','穩定維持'];
    開彈窗('更新導入進度',`${row.區域代碼}｜${row.區域名稱}`,`<div class="可視化表單">${stages.map(k=>`<label style="display:flex;gap:8px;align-items:center"><input style="width:auto;margin:0" type="checkbox" data-導入階段="${k}" ${文字(row[k])==='是'?'checked':''}>${k}</label>`).join('')}<label>備註<textarea id="導入備註">${轉義(row.備註)}</textarea></label><button id="儲存導入進度" class="可視化按鈕 主">更新六階段進度</button></div>`);
    document.getElementById('儲存導入進度').onclick=async()=>{
      try{
        const next=Object.assign({},row); let done=0;
        document.querySelectorAll('[data-導入階段]').forEach(c=>{next[c.dataset.導入階段]=c.checked?'是':'否';if(c.checked)done++;});
        next.導入進度=Math.round(done/stages.length*100); next.進度狀態=done===stages.length?'已完成':done>0?'進行中':'未開始'; next.實際開始日=next.實際開始日||(done?今天():''); if(done===stages.length)next.實際完成日=next.實際完成日||今天(); next.備註=文字(document.getElementById('導入備註').value); next.更新時間=現在字串();
        await 更新(分頁.導入進度,欄位.導入進度,next); 清快取(分頁.導入進度); 關彈窗(); 顯示通知('導入進度已更新'); 顯示目前分頁();
      }catch(e){顯示通知(e.message||e,'錯誤');}
    };
  }

  async function 開始稽核(區域代碼) {
    const [areas,items] = await Promise.all([讀取分頁(分頁.區域主檔,false),讀取分頁(分頁.檢查項目,false)]);
    const area=areas.資料.find(x=>文字(x.區域代碼)===文字(區域代碼));
    const checklist=items.資料.filter(x=>文字(x.檢查清單代碼)==='清單-可視化0-4'&&文字(x.啟用)!=='否').sort((a,b)=>數值(a.順序)-數值(b.順序));
    if(!area) return 顯示通知('找不到區域資料','錯誤'); if(!checklist.length) return 顯示通知('找不到0–4檢查清單','錯誤');
    狀態.目前稽核={區域:area,開始時間:現在字串(),項目:checklist.map(x=>({原始:x,分數:null,原因:'',照片:''}))};
    const html=狀態.目前稽核.項目.map((x,i)=>`<article class="稽核項" data-稽核索引="${i}"><h4>${i+1}. ${轉義(x.原始.檢查內容)}</h4><div class="可視化副文">${轉義(x.原始['5S分類'])}｜${轉義(x.原始.判定基準)}</div><div class="評分列">${[4,3,2,1,0].map(n=>`<button type="button" data-稽核分數="${n}">${n}</button>`).join('')}</div><div class="異常欄 隱藏可視化"><textarea data-異常原因 placeholder="低於4分請說明不符合現況"></textarea><label class="可視化按鈕 次">📷 拍攝現況<input data-異常照片 type="file" accept="image/*" capture="environment" style="display:none"></label><img class="隱藏可視化" alt="異常照片"></div></article>`).join('');
    document.getElementById('頁面內容').innerHTML=`<div class="可視化頁"><section class="可視化主視覺"><h2>${轉義(area.區域名稱)}｜0–4 分稽核</h2><p>低於4分必須留下原因與照片，送出後自動建立改善單並更新下次稽核日期。</p></section>${html}<section class="可視化卡"><label class="可視化副文">整體備註</label><textarea id="可視化稽核備註" style="width:100%;margin-top:6px;border:1px solid #d9e3dd;border-radius:12px;padding:10px"></textarea><div class="可視化操作列" style="margin-top:10px"><button id="取消可視化稽核" class="可視化按鈕 次">取消</button><button id="送出可視化稽核" class="可視化按鈕 主">送出稽核</button></div></section></div>`;
    document.querySelectorAll('[data-稽核索引]').forEach(card=>{const i=數值(card.dataset.稽核索引);card.querySelectorAll('[data-稽核分數]').forEach(b=>b.onclick=()=>設定稽核分數(i,數值(b.dataset.稽核分數),card));card.querySelector('[data-異常原因]').oninput=e=>狀態.目前稽核.項目[i].原因=e.target.value;card.querySelector('[data-異常照片]').onchange=e=>設定稽核照片(i,e.target.files[0],card);});
    document.getElementById('取消可視化稽核').onclick=()=>{狀態.目前稽核=null;狀態.目前分頁='稽核';顯示目前分頁();};
    document.getElementById('送出可視化稽核').onclick=送出稽核;
  }

  function 設定稽核分數(i,分數,card){const item=狀態.目前稽核.項目[i];item.分數=分數;card.querySelectorAll('[data-稽核分數]').forEach(b=>b.classList.toggle('已選',數值(b.dataset.稽核分數)===分數));const bad=分數<4;card.classList.toggle('異常',bad);card.querySelector('.異常欄').classList.toggle('隱藏可視化',!bad);if(!bad){item.原因='';item.照片='';}}
  async function 設定稽核照片(i,file,card){try{const data=await 壓縮照片(file);狀態.目前稽核.項目[i].照片=data;const img=card.querySelector('.異常欄 img');img.src=data;img.classList.remove('隱藏可視化');}catch(e){顯示通知(e.message||e,'錯誤');}}

  async function 更新稽核週期(area,得分率,重大) {
    const r=await 讀取分頁(分頁.稽核週期,true); let row=r.資料.find(x=>文字(x.區域代碼)===文字(area.區域代碼));
    const 上次連續=row?數值(row.連續達標次數):0; const 連續=得分率>=85?上次連續+1:0;
    let 天=7,頻率='每週',狀態值='正常稽核';
    if(重大){天=3;頻率='3天複查';狀態值='重大異常複查';}
    else if(得分率<80){天=7;頻率='每週';狀態值='恢復每週';}
    else if(得分率>=90&&連續>=3){天=30;頻率='每30天';狀態值='穩定維持';}
    else if(得分率>=85&&連續>=3){天=14;頻率='每14天';狀態值='達標降頻';}
    const obj=Object.assign({},row||{},{區域代碼:area.區域代碼,區域名稱:area.區域名稱,目前頻率:頻率,基準頻率:'每週',連續達標次數:連續,最近得分:得分率,最近稽核日:今天(),下次稽核日:日期加天(今天(),天),降頻條件:'連續3次>=85改14天；連續3次>=90改30天',升頻條件:'任一次<80恢復7天；重大異常3天複查',重大異常複查天數:3,狀態:狀態值,更新時間:現在字串()});
    if(row) await 更新(分頁.稽核週期,欄位.稽核週期,obj); else await 新增(分頁.稽核週期,欄位.稽核週期,obj); 清快取(分頁.稽核週期);
  }

  async function 標記首次稽核(area) {
    const r=await 讀取分頁(分頁.導入進度,true); const row=r.資料.find(x=>文字(x.區域代碼)===文字(area.區域代碼).split('-')[0]); if(!row)return;
    const next=Object.assign({},row,{首次稽核:'是',更新時間:現在字串()}); const stages=['區域盤點','責任人確認','標準照片完成','現場張貼完成','首次稽核','穩定維持']; const done=stages.filter(k=>文字(next[k])==='是').length; next.導入進度=Math.round(done/stages.length*100); next.進度狀態=done===stages.length?'已完成':'進行中'; await 更新(分頁.導入進度,欄位.導入進度,next); 清快取(分頁.導入進度);
  }

  async function 送出稽核() {
    if(狀態.忙碌||!狀態.目前稽核)return;
    const 巡=狀態.目前稽核; const missing=巡.項目.find(x=>x.分數==null); if(missing)return顯示通知('所有檢查項目都必須評分','警告'); const bad=巡.項目.find(x=>x.分數<4&&(!文字(x.原因)||!x.照片)); if(bad)return顯示通知('低於4分的項目必須填寫原因並拍照','警告');
    狀態.忙碌=true; 顯示讀取('送出0–4分稽核','正在建立巡檢、改善與下次稽核日期…');
    try{
      const u=目前使用者(), id=產生編號('5S-VIS'), time=現在字串(); let total=0,max=0,異常=0,重大=false;
      巡.項目.forEach(x=>{const w=數值(x.原始.權重,1);total+=x.分數*w;max+=4*w;if(x.分數<4)異常++;if(x.分數===0||(/安全|PPE|消防|通道/.test(文字(x.原始.檢查內容))&&x.分數<=1))重大=true;});
      const rate=max?Math.round(total/max*1000)/10:0;
      await 新增(分頁.巡檢主檔,欄位.巡檢主檔,{巡檢單號:id,區域代碼:巡.區域.區域代碼,區域名稱:巡.區域.區域名稱,檢查清單代碼:'清單-可視化0-4',巡檢人工號:文字(u.工號),巡檢人姓名:文字(u.姓名),巡檢日期:今天(),開始時間:巡.開始時間,送出時間:time,總得分:total,最高總分:max,得分率:rate,異常項數:異常,狀態:'已完成',裝置識別碼:'PWA-VIS-1.1.0',備註:文字(document.getElementById('可視化稽核備註').value),建立時間:time});
      for(const x of 巡.項目){const detail=產生編號('5S-DTL'), improve=x.分數<4?產生編號('5S-KZN'):'';await 新增(分頁.巡檢明細,欄位.巡檢明細,{明細編號:detail,巡檢單號:id,項目代碼:x.原始.項目代碼,'5S分類':x.原始['5S分類'],檢查內容:x.原始.檢查內容,得分:x.分數,最高分:4,權重:x.原始.權重,是否異常:x.分數<4?'是':'否',異常原因:x.原因,照片資料:x.照片,改善單號:improve,建立時間:time});if(x.分數<4){const severity=x.分數===0?'高':x.分數===1?'高':x.分數===2?'中':'低';await 新增(分頁.改善單,欄位.改善單,{改善單號:improve,來源類型:'可視化0-4稽核',來源單號:id,區域代碼:巡.區域.區域代碼,區域名稱:巡.區域.區域名稱,'5S分類':x.原始['5S分類'],問題標題:`${x.原始.檢查內容}｜得分${x.分數}`,問題說明:x.原因,嚴重度:severity,負責人工號:'',負責人姓名:'',期限:日期加天(今天(),x.分數<=1?3:設定.改善期限天數||7),狀態:'待改善',改善前照片:x.照片,改善後照片:'',驗證人工號:'',驗證時間:'',驗證結果:'',結案時間:'',逾期天數:0,建立時間:time,更新時間:time});if(x.照片)await 新增(分頁.照片,欄位.照片,{照片編號:產生編號('5S-PIC'),參照類型:'可視化稽核異常',參照單號:detail,區域代碼:巡.區域.區域代碼,上傳人工號:文字(u.工號),拍攝時間:time,資料摘要:x.原始.檢查內容,儲存方式:'試算表壓縮資料',照片資料:x.照片});}}
      await 更新稽核週期(巡.區域,rate,重大); await 標記首次稽核(巡.區域); 清快取(分頁.巡檢主檔,分頁.巡檢明細,分頁.改善單,分頁.照片); 狀態.目前稽核=null; 狀態.目前分頁='稽核'; 顯示通知(`稽核完成：${rate}分｜異常${異常}項`); await 顯示目前分頁();
    }catch(e){顯示通知(`稽核送出失敗：${e.message||e}`,'錯誤');}finally{狀態.忙碌=false;隱藏讀取();}
  }

  function 建立導航() {
    if(document.getElementById('可視化導航'))return;
    const nav=document.querySelector('.底部導航'); if(!nav)return;
    const b=document.createElement('button'); b.id='可視化導航'; b.className='導航按鈕'; b.type='button'; b.innerHTML='<span class="導航圖示">◫</span><span>可視化</span>'; b.onclick=進入可視化中心; nav.appendChild(b);
  }

  function 初始化() {
    注入樣式(); 建立導航();
    const 關閉=document.getElementById('關閉彈窗'); if(關閉)關閉.addEventListener('click',關彈窗);
    const 參數=new URLSearchParams(location.search); if(參數.get('頁面')==='可視化'){setTimeout(進入可視化中心,700);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',初始化);else初始化();

  全域.智慧5S可視化管理 = Object.freeze({進入可視化中心,重新整理:()=>{狀態.快取={};return顯示目前分頁();},版本:模組版本});
})(window);
