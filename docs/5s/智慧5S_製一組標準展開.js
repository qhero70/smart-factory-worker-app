(function (全域) {
  'use strict';

  /**
   * 化新精密｜智慧5S管理平台
   * 製一組標準照片與換線標準中心
   * 版本：1.1.2
   *
   * 目的：
   * 1. 以 03_機台主檔、08_工站途程機台主檔轉出的製一組正式基線為來源。
   * 2. 管理 A4 / A5 / A6 / A7 / A8 / B2 / B5 的產品線標準照片待拍清單。
   * 3. 標準照片採「主區域 + 產品編號|途程編號」作為版本鍵，避免換線後互相覆蓋不同產品標準。
   * 4. 可將已建立標準指定為目前換線標準，歷史版本保留追溯。
   * 5. 不建立第二套人員帳號，沿用智慧5S登入與中央資料庫寫入流程。
   */

  const 版本 = '1.1.2';
  const 設定 = 全域.智慧5S設定;
  const 資料庫 = 全域.智慧5S資料庫;
  const 使用者快取鍵 = '智慧5S_目前使用者';

  if (!設定 || !資料庫) {
    console.error('智慧5S製一組標準展開：找不到設定或資料庫模組。');
    return;
  }

  const 分頁 = {
    待拍: 設定.分頁.製一組標準照片待拍 || '5S_製一組標準照片待拍',
    產品線: 設定.分頁.製一組產品線總覽 || '5S_製一組產品線總覽',
    途程: 設定.分頁.製一組產線途程 || '5S_製一組產線途程',
    機台: 設定.分頁.製一組機台基線 || '5S_製一組機台基線',
    換線: 設定.分頁.製一組換線標準 || '5S_製一組換線標準',
    標準照片: 設定.分頁.標準照片主檔 || '5S_標準照片主檔'
  };

  const 標準照片欄位 = ['標準照片編號','區域代碼','區域名稱','子區域代碼','標準版本','適用生產狀態','照片資料','建立日期','生效日期','失效日期','目前生效','建立人工號','建立人姓名','核准人','備註'];
  const 換線欄位 = ['換線標準編號','主區域','子區域代碼','機台/工位','目前產品編號','目前客戶品號','目前品名','目前途程編號','目前工序','適用生產狀態鍵','標準照片編號','標準版本','生效時間','設定人工號','設定人姓名','狀態/備註'];
  const 區域順序 = ['A4','A5','A6','A7','A8','B2','B5'];

  const 狀態 = {
    目前頁籤: '待拍',
    區域篩選: '全部',
    狀態篩選: '全部',
    搜尋: '',
    快取: {},
    忙碌: false
  };

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 數值(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function 轉義(v) { return String(v == null ? '' : v).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c])); }
  function 補零(n) { return String(n).padStart(2, '0'); }
  function 今天() { const d = new Date(); return `${d.getFullYear()}-${補零(d.getMonth()+1)}-${補零(d.getDate())}`; }
  function 現在() { const d = new Date(); return `${今天()} ${補零(d.getHours())}:${補零(d.getMinutes())}:${補零(d.getSeconds())}`; }
  function 編號(prefix) { const d = new Date(); return `${prefix}-${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}${補零(d.getHours())}${補零(d.getMinutes())}${補零(d.getSeconds())}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
  function 目前使用者() { try { return JSON.parse(localStorage.getItem(使用者快取鍵) || 'null') || {}; } catch (_) { return {}; } }
  function 可以管理() {
    const u = 目前使用者();
    return ['主管','區域負責人'].includes(文字(u.系統角色)) || /主任|主管|工程師|幹部/.test(`${文字(u.職稱)}${文字(u.角色類型)}`);
  }
  function 值陣列(obj, 欄位) { return 欄位.map(k => obj[k] == null ? '' : obj[k]); }

  async function 讀取(name, 強制) {
    if (!強制 && 狀態.快取[name]) return 狀態.快取[name];
    const r = await 資料庫.讀取分頁(name, 設定.讀取上限 || 5000);
    狀態.快取[name] = { 欄位: r.欄位 || [], 資料: r.資料 || [] };
    return 狀態.快取[name];
  }
  function 清快取(...names) { names.forEach(n => delete 狀態.快取[n]); }
  async function 新增(name, 欄位, obj) {
    return 資料庫.送出或排隊({ 工作類型:'新增', 分頁名稱:name, 欄位, 值:值陣列(obj,欄位) });
  }
  async function 更新(name, 欄位, obj) {
    if (!obj._列號) throw new Error('資料缺少列號，請重新整理後再操作。');
    return 資料庫.送出或排隊({ 工作類型:'更新', 分頁名稱:name, 列號:obj._列號, 欄位, 值:值陣列(obj,欄位) });
  }

  function 顯示通知(msg, type) {
    const e = document.getElementById('通知');
    if (!e) return;
    e.textContent = msg;
    e.className = `通知 顯示${type ? ` ${type}` : ''}`;
    clearTimeout(顯示通知.t);
    顯示通知.t = setTimeout(() => { e.className = '通知'; }, 3800);
  }
  function 顯示讀取(title, desc) {
    const mask = document.getElementById('讀取遮罩');
    if (!mask) return;
    const t = document.getElementById('讀取標題');
    const d = document.getElementById('讀取說明');
    if (t) t.textContent = title || '資料處理中';
    if (d) d.textContent = desc || '請稍候…';
    mask.classList.remove('隱藏');
  }
  function 隱藏讀取() { document.getElementById('讀取遮罩')?.classList.add('隱藏'); }
  function 開彈窗(title, sub, html) {
    const mask = document.getElementById('彈窗遮罩');
    if (!mask) return;
    document.getElementById('彈窗標題').textContent = title;
    document.getElementById('彈窗副標').textContent = sub || '';
    document.getElementById('彈窗內容').innerHTML = html;
    mask.classList.remove('隱藏');
    document.body.style.overflow = 'hidden';
  }
  function 關彈窗() {
    document.getElementById('彈窗遮罩')?.classList.add('隱藏');
    document.body.style.overflow = '';
  }

  function 注入樣式() {
    if (document.getElementById('製一組標準展開樣式')) return;
    const s = document.createElement('style');
    s.id = '製一組標準展開樣式';
    s.textContent = `
      .製一頁{display:grid;gap:14px}.製一主視覺{padding:21px;border-radius:25px;background:linear-gradient(135deg,#113b2a,#176b47 58%,#8b2748);color:#fff;box-shadow:0 16px 38px rgba(23,107,71,.18)}.製一主視覺 h2{margin:0 0 7px}.製一主視覺 p{margin:0;line-height:1.65;color:rgba(255,255,255,.83)}
      .製一KPI{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.製一KPI article{background:#fff;border:1px solid #e1e9e4;border-radius:18px;padding:13px}.製一KPI small{display:block;color:#74827a;font-weight:850}.製一KPI b{display:block;font-size:1.38rem;color:#183e2e;margin-top:5px}.製一KPI span{font-size:.66rem;color:#879188}
      .製一頁籤{display:flex;gap:7px;overflow:auto}.製一頁籤 button{white-space:nowrap;border:1px solid #dce7df;background:#fff;color:#4d6558;border-radius:999px;padding:9px 12px;font-weight:900}.製一頁籤 button.作用中{background:#176b47;color:#fff;border-color:#176b47}
      .製一工具列{display:grid;grid-template-columns:160px 150px minmax(180px,1fr);gap:8px}.製一工具列 select,.製一工具列 input{border:1px solid #dce7df;border-radius:14px;background:#fff;padding:11px 12px;min-width:0}
      .製一卡網格{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.製一卡{background:#fff;border:1px solid #e1e8e3;border-radius:19px;padding:14px;box-shadow:0 8px 22px rgba(18,59,43,.05)}.製一卡.完成{border-left:5px solid #168756}.製一卡.待拍{border-left:5px solid #d64545}.製一卡 h3{margin:6px 0 5px;font-size:.95rem;line-height:1.45}.製一卡 .次{font-size:.72rem;color:#6f7d75;line-height:1.55}.製一徽章列{display:flex;gap:6px;flex-wrap:wrap}.製一徽章{display:inline-flex;padding:5px 8px;border-radius:999px;background:#edf3ef;color:#496055;font-size:.66rem;font-weight:900}.製一徽章.紅{background:#fde7e7;color:#b93030}.製一徽章.綠{background:#e2f5ea;color:#16754b}.製一徽章.黃{background:#fff0cf;color:#9b6200}.製一操作{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.製一操作 button{border:0;border-radius:12px;padding:9px 11px;font-weight:900}.製一主按鈕{background:#176b47;color:#fff}.製一次按鈕{background:#edf4ef;color:#176b47}
      .製一區域格{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}.製一區域格 article{background:#fff;border:1px solid #e2e9e4;border-radius:18px;padding:13px;text-align:center}.製一區域格 b{display:block;font-size:1.2rem;margin:4px 0}.製一空{padding:34px 18px;text-align:center;color:#718078;background:#fff;border:1px dashed #cfdad3;border-radius:19px}
      .製一表單{display:grid;gap:11px;margin-top:12px}.製一表單 label{display:grid;gap:6px;font-size:.76rem;font-weight:900;color:#5d7065}.製一表單 input,.製一表單 textarea,.製一表單 select{width:100%;border:1px solid #d8e4dc;border-radius:14px;padding:12px;background:#fff}.製一表單 textarea{min-height:88px}.製一預覽{width:100%;max-height:280px;object-fit:cover;border-radius:16px;border:1px solid #dce6df;margin-top:8px}.製一提示{font-size:.72rem;color:#6e7d74;line-height:1.55;background:#eef5f0;padding:10px 12px;border-radius:13px}
      @media(max-width:780px){.製一KPI{grid-template-columns:repeat(2,1fr)}.製一卡網格{grid-template-columns:1fr}.製一工具列{grid-template-columns:1fr}.製一區域格{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(s);
  }

  async function 載入核心(強制) {
    const names = [分頁.待拍,分頁.產品線,分頁.機台,分頁.換線,分頁.標準照片];
    const rs = await Promise.all(names.map(n => 讀取(n, 強制).catch(() => ({欄位:[],資料:[]}))));
    const out = {};
    names.forEach((n,i) => out[n] = rs[i].資料 || []);
    return out;
  }

  function 過濾待拍(rows) {
    const q = 文字(狀態.搜尋).toLowerCase();
    return rows.filter(r => {
      if (狀態.區域篩選 !== '全部' && 文字(r.主區域) !== 狀態.區域篩選) return false;
      if (狀態.狀態篩選 !== '全部' && 文字(r.拍攝狀態) !== 狀態.狀態篩選) return false;
      if (!q) return true;
      const hay = `${文字(r.產品編號)} ${文字(r.客戶品號)} ${文字(r.品名)} ${文字(r.途程編號)} ${文字(r.機台編號清單)} ${文字(r.工站名稱)}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function 區域統計(rows) {
    return 區域順序.map(area => {
      const a = rows.filter(x => 文字(x.主區域) === area);
      const ok = a.filter(x => 文字(x.拍攝狀態) === '已建立').length;
      return { area, total:a.length, ok, pending:a.length-ok, rate:a.length ? Math.round(ok/a.length*100) : 0 };
    });
  }

  async function 畫面框架() {
    const data = await 載入核心(false);
    const rows = data[分頁.待拍] || [];
    const total = rows.length;
    const ok = rows.filter(x => 文字(x.拍攝狀態) === '已建立').length;
    const pending = total - ok;
    const high = rows.filter(x => 文字(x.拍攝狀態) !== '已建立' && 文字(x.優先序) === '高').length;
    const active = (data[分頁.換線] || []).filter(x => 文字(x['狀態/備註']).startsWith('目前生效')).length;
    const rate = total ? Math.round(ok/total*100) : 0;

    return `
      <section class="製一主視覺"><h2>製一組｜產品線標準照片全面展開</h2><p>A4、A5、A6、A7、A8、B2、B5 已依中央途程與機台主檔建立正式基線。每個產品／途程都使用獨立生產狀態鍵，換線時不會覆蓋其他產品標準。</p></section>
      <section class="製一KPI">
        <article><small>標準拍攝點</small><b>${total}</b><span>依正式途程節點</span></article>
        <article><small>待拍</small><b>${pending}</b><span>需建立白底標準照</span></article>
        <article><small>完成率</small><b>${rate}%</b><span>${ok}/${total} 已生效</span></article>
        <article><small>目前換線標準</small><b>${active}</b><span>已指定現行標準</span></article>
      </section>
      <section class="製一頁籤">
        ${['待拍','區域進度','機台基線','換線標準'].map(t => `<button data-製一頁籤="${t}" class="${狀態.目前頁籤===t?'作用中':''}">${t}</button>`).join('')}
      </section>
      <div id="製一內容"></div>
    `;
  }

  async function 顯示待拍() {
    const data = await 載入核心(false);
    const all = data[分頁.待拍] || [];
    const rows = 過濾待拍(all);
    const cards = rows.map(r => {
      const done = 文字(r.拍攝狀態) === '已建立';
      return `<article class="製一卡 ${done?'完成':'待拍'}">
        <div class="製一徽章列"><span class="製一徽章">${轉義(r.主區域)}</span><span class="製一徽章 ${done?'綠':'紅'}">${done?'已建立':'待拍'}</span><span class="製一徽章 ${文字(r.優先序)==='高'?'黃':''}">${轉義(r.優先序||'中')}優先</span></div>
        <h3>${轉義(r.品名 || r.產品編號)}</h3>
        <div class="次">產品：${轉義(r.產品編號)}｜客戶品號：${轉義(r.客戶品號||'—')}</div>
        <div class="次">${轉義(r.途程編號)}｜${轉義(r.工序代碼)}｜${轉義(r.工站名稱)}</div>
        <div class="次">機台/工位：${轉義(r.機台編號清單 || '人工／待現場確認')}｜型號：${轉義(r.機台型號清單 || '—')}</div>
        <div class="次">狀態鍵：${轉義(r.適用生產狀態鍵)}</div>
        ${可以管理()?`<div class="製一操作"><button class="製一主按鈕" data-拍標準="${轉義(r.待拍編號)}">${done?'建立新版':'拍攝標準照'}</button>${done?`<button class="製一次按鈕" data-設目前="${轉義(r.待拍編號)}">設為目前標準</button>`:''}</div>`:''}
      </article>`;
    }).join('');

    return `<section class="製一工具列">
      <select id="製一區域篩選"><option>全部</option>${區域順序.map(a=>`<option ${狀態.區域篩選===a?'selected':''}>${a}</option>`).join('')}</select>
      <select id="製一狀態篩選"><option>全部</option><option ${狀態.狀態篩選==='待拍'?'selected':''}>待拍</option><option ${狀態.狀態篩選==='已建立'?'selected':''}>已建立</option></select>
      <input id="製一搜尋" value="${轉義(狀態.搜尋)}" placeholder="搜尋產品編號、品名、機台或途程">
    </section><div class="製一卡網格" style="margin-top:11px">${cards || '<div class="製一空">目前篩選條件沒有資料。</div>'}</div>`;
  }

  async function 顯示區域進度() {
    const data = await 載入核心(false);
    const stats = 區域統計(data[分頁.待拍] || []);
    return `<section class="製一區域格">${stats.map(x=>`<article><small>${x.area}</small><b>${x.rate}%</b><div class="次">${x.ok}/${x.total} 完成</div><div class="進度條" style="margin-top:8px"><span style="width:${x.rate}%"></span></div></article>`).join('')}</section>`;
  }

  async function 顯示機台基線() {
    const data = await 載入核心(false);
    const rows = data[分頁.機台] || [];
    const html = 區域順序.map(area => {
      const list = rows.filter(x=>文字(x.主區域)===area);
      return `<section class="卡片"><div class="卡片標題列"><div><div class="卡片標題">${area} 機台基線</div><div class="卡片副標">${list.length} 台／工位</div></div></div><div class="製一卡網格">${list.map(x=>`<article class="製一卡"><div class="製一徽章列"><span class="製一徽章">${轉義(x['5S子區域代碼'])}</span></div><h3>${轉義(x.機台編號)}｜${轉義(x.機台名稱)}</h3><div class="次">設備代碼/型號：${轉義(x['設備代碼/型號']||'—')}</div><div class="次">初始稽核：${轉義(x.初始稽核頻率||'每週')}｜${轉義(x.檢查清單代碼||'清單-可視化0-4')}</div></article>`).join('')}</div></section>`;
    }).join('');
    return html || '<div class="製一空">尚無機台基線。</div>';
  }

  async function 顯示換線標準() {
    const data = await 載入核心(false);
    const rows = (data[分頁.換線] || []).filter(x => 文字(x['狀態/備註']).startsWith('目前生效'));
    const html = rows.map(x=>`<article class="製一卡 完成"><div class="製一徽章列"><span class="製一徽章 綠">目前生效</span><span class="製一徽章">${轉義(x.主區域)}</span></div><h3>${轉義(x.目前品名||x.目前產品編號)}</h3><div class="次">機台/工位：${轉義(x['機台/工位']||'—')}</div><div class="次">${轉義(x.目前產品編號)}｜${轉義(x.目前途程編號)}｜${轉義(x.目前工序)}</div><div class="次">標準版本：${轉義(x.標準版本||'—')}｜生效：${轉義(x.生效時間||'—')}</div></article>`).join('');
    return `<div class="製一提示">「目前換線標準」只代表現場當下應張貼／比對的標準；歷史標準仍保存在 5S_標準照片主檔，不會刪除。</div><div class="製一卡網格" style="margin-top:11px">${html || '<div class="製一空">尚未指定目前換線標準。建立標準照片後即可指定。</div>'}</div>`;
  }

  async function 顯示頁籤內容() {
    const box = document.getElementById('製一內容');
    if (!box) return;
    if (狀態.目前頁籤 === '待拍') box.innerHTML = await 顯示待拍();
    if (狀態.目前頁籤 === '區域進度') box.innerHTML = await 顯示區域進度();
    if (狀態.目前頁籤 === '機台基線') box.innerHTML = await 顯示機台基線();
    if (狀態.目前頁籤 === '換線標準') box.innerHTML = await 顯示換線標準();
    綁定內容事件();
  }

  async function 進入製一組中心(強制) {
    try {
      顯示讀取('載入製一組標準中心','正在整理產品線、機台與標準照片…');
      if (強制) 狀態.快取 = {};
      document.querySelectorAll('.導航按鈕').forEach(b=>b.classList.remove('作用中'));
      document.getElementById('製一組導航')?.classList.add('作用中');
      const title = document.getElementById('頁面標題'); if (title) title.textContent = '製一組｜5S標準展開';
      const sub = document.getElementById('頁面副標'); if (sub) sub.textContent = 'A4・A5・A6・A7・A8・B2・B5｜產品線與換線標準';
      const content = document.getElementById('頁面內容');
      if (!content) return;
      content.innerHTML = `<div class="製一頁">${await 畫面框架()}</div>`;
      document.querySelectorAll('[data-製一頁籤]').forEach(b => b.onclick = async () => { 狀態.目前頁籤=b.dataset.製一頁籤; document.querySelectorAll('[data-製一頁籤]').forEach(x=>x.classList.toggle('作用中',x===b)); await 顯示頁籤內容(); });
      await 顯示頁籤內容();
    } catch (e) {
      顯示通知(e.message || String(e), '錯誤');
    } finally {
      隱藏讀取();
    }
  }

  function 綁定內容事件() {
    const area = document.getElementById('製一區域篩選');
    if (area) area.onchange = async () => { 狀態.區域篩選=area.value; await 顯示頁籤內容(); };
    const st = document.getElementById('製一狀態篩選');
    if (st) st.onchange = async () => { 狀態.狀態篩選=st.value; await 顯示頁籤內容(); };
    const q = document.getElementById('製一搜尋');
    if (q) q.oninput = () => { 狀態.搜尋=q.value; clearTimeout(綁定內容事件.t); 綁定內容事件.t=setTimeout(顯示頁籤內容,260); };
    document.querySelectorAll('[data-拍標準]').forEach(b=>b.onclick=()=>開啟拍攝(b.dataset.拍標準));
    document.querySelectorAll('[data-設目前]').forEach(b=>b.onclick=()=>設為目前標準(b.dataset.設目前));
  }

  async function 找待拍(id) {
    const rows = (await 讀取(分頁.待拍,true)).資料 || [];
    const row = rows.find(x => 文字(x.待拍編號) === 文字(id));
    if (!row) throw new Error('找不到待拍資料，請重新整理。');
    return row;
  }

  function 壓縮照片(file) {
    return new Promise((resolve,reject)=>{
      if (!file) return reject(new Error('請先拍攝或選擇標準照片。'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('照片讀取失敗。'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('照片格式無法處理。'));
        img.onload = () => {
          const max = 1440;
          const scale = Math.min(1, max / Math.max(img.width,img.height));
          const w = Math.max(1,Math.round(img.width*scale));
          const h = Math.max(1,Math.round(img.height*scale));
          const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
          let quality = .76;
          let data = canvas.toDataURL('image/jpeg',quality);
          const limit = Number(設定.照片最大字元 || 42000);
          while (data.length > limit && quality > .32) { quality -= .08; data = canvas.toDataURL('image/jpeg',quality); }
          if (data.length > limit) return reject(new Error('照片資料仍過大，請靠近拍攝或降低相機解析度後再試。'));
          resolve(data);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function 開啟拍攝(id) {
    try {
      const r = await 找待拍(id);
      const standards = (await 讀取(分頁.標準照片,true)).資料 || [];
      const same = standards.filter(x => 文字(x.區域代碼)===文字(r.主區域) && 文字(x.適用生產狀態)===文字(r.適用生產狀態鍵));
      const next = `V${String(same.length+1).padStart(2,'0')}`;
      開彈窗('拍攝製一組標準照片',`${文字(r.主區域)}｜${文字(r.途程編號)}`,`
        <div class="製一提示"><b>${轉義(r.品名||r.產品編號)}</b><br>產品 ${轉義(r.產品編號)}｜${轉義(r.工序代碼)} ${轉義(r.工站名稱)}<br>機台/工位：${轉義(r.機台編號清單||'人工／待現場確認')}<br>標準鍵：${轉義(r.適用生產狀態鍵)}</div>
        <div class="製一表單">
          <label>標準版本<input id="製一標準版本" value="${轉義(next)}"></label>
          <label>白底標準照片<input id="製一標準照片檔" type="file" accept="image/*" capture="environment"></label>
          <img id="製一照片預覽" class="製一預覽 隱藏" alt="標準照片預覽">
          <label>備註<textarea id="製一標準備註" placeholder="可補充工具數量、容器方向、物料上限、禁止擺放事項"></textarea></label>
          <label style="display:flex;grid-template-columns:auto 1fr;align-items:center;gap:9px"><input id="製一同時設目前" type="checkbox" style="width:auto">同時設為目前換線標準</label>
          <button id="製一儲存標準" class="主要按鈕 滿版">儲存並設為此產品目前生效版本</button>
        </div>`);
      const input=document.getElementById('製一標準照片檔');
      input.onchange=()=>{ const f=input.files?.[0]; if(!f)return; const p=document.getElementById('製一照片預覽'); p.src=URL.createObjectURL(f); p.classList.remove('隱藏'); };
      document.getElementById('製一儲存標準').onclick=()=>儲存標準照片(r);
    } catch(e) { 顯示通知(e.message||String(e),'錯誤'); }
  }

  async function 儲存標準照片(r) {
    if (狀態.忙碌) return;
    狀態.忙碌 = true;
    顯示讀取('儲存標準照片','正在壓縮照片、保留歷史版本並建立新標準…');
    try {
      const file = document.getElementById('製一標準照片檔')?.files?.[0];
      const photo = await 壓縮照片(file);
      const u = 目前使用者();
      const standards = (await 讀取(分頁.標準照片,true)).資料 || [];
      const old = standards.filter(x => 文字(x.區域代碼)===文字(r.主區域) && 文字(x.適用生產狀態)===文字(r.適用生產狀態鍵) && 文字(x.目前生效)==='是');
      for (const x of old) {
        await 更新(分頁.標準照片,標準照片欄位,Object.assign({},x,{目前生效:'否',失效日期:今天()}));
      }
      const id = 編號('5S-STD-M1');
      const version = 文字(document.getElementById('製一標準版本')?.value) || 'V01';
      const note = `${文字(document.getElementById('製一標準備註')?.value)}｜產品:${文字(r.產品編號)}｜途程:${文字(r.途程編號)}｜工序:${文字(r.工序代碼)}｜機台/工位:${文字(r.機台編號清單||'人工')}`.replace(/^｜/,'');
      await 新增(分頁.標準照片,標準照片欄位,{
        標準照片編號:id, 區域代碼:文字(r.主區域), 區域名稱:`${文字(r.主區域)} 製一組`, 子區域代碼:`${文字(r.主區域)}-${文字(r.途程編號)}`,
        標準版本:version, 適用生產狀態:文字(r.適用生產狀態鍵), 照片資料:photo, 建立日期:今天(), 生效日期:今天(), 失效日期:'', 目前生效:'是',
        建立人工號:文字(u.工號), 建立人姓名:文字(u.姓名), 核准人:文字(u.姓名), 備註:note
      });
      if (document.getElementById('製一同時設目前')?.checked) await 寫入目前換線(r,id,version);
      清快取(分頁.標準照片,分頁.待拍,分頁.換線);
      關彈窗();
      顯示通知('製一組標準照片已建立；舊版已保留歷史。');
      await 進入製一組中心(true);
    } catch(e) {
      顯示通知(e.message||String(e),'錯誤');
    } finally {
      狀態.忙碌=false;
      隱藏讀取();
    }
  }

  async function 寫入目前換線(r, photoId, version) {
    const u = 目前使用者();
    const machine = 文字(r.機台編號清單 || r.工站名稱 || '人工工位');
    const current = (await 讀取(分頁.換線,true)).資料 || [];
    const old = current.filter(x => 文字(x.主區域)===文字(r.主區域) && 文字(x['機台/工位'])===machine && 文字(x['狀態/備註']).startsWith('目前生效'));
    for (const x of old) {
      await 更新(分頁.換線,換線欄位,Object.assign({},x,{'狀態/備註':`歷史｜失效 ${現在()}`}));
    }
    await 新增(分頁.換線,換線欄位,{
      換線標準編號:編號('5S-CHANGE'), 主區域:文字(r.主區域), 子區域代碼:`${文字(r.主區域)}-${文字(r.途程編號)}`, '機台/工位':machine,
      目前產品編號:文字(r.產品編號), 目前客戶品號:文字(r.客戶品號), 目前品名:文字(r.品名), 目前途程編號:文字(r.途程編號), 目前工序:`${文字(r.工序代碼)} ${文字(r.工站名稱)}`,
      適用生產狀態鍵:文字(r.適用生產狀態鍵), 標準照片編號:photoId, 標準版本:version, 生效時間:現在(), 設定人工號:文字(u.工號), 設定人姓名:文字(u.姓名), '狀態/備註':'目前生效'
    });
  }

  async function 設為目前標準(id) {
    if (狀態.忙碌) return;
    狀態.忙碌=true;
    顯示讀取('切換目前標準','正在確認產品標準版本…');
    try {
      const r = await 找待拍(id);
      const standards = (await 讀取(分頁.標準照片,true)).資料 || [];
      const active = standards.filter(x => 文字(x.區域代碼)===文字(r.主區域) && 文字(x.適用生產狀態)===文字(r.適用生產狀態鍵) && 文字(x.目前生效)==='是').sort((a,b)=>數值(b._列號)-數值(a._列號))[0];
      if (!active) throw new Error('這個產品／途程還沒有目前生效的標準照片。');
      await 寫入目前換線(r,文字(active.標準照片編號),文字(active.標準版本));
      清快取(分頁.換線);
      顯示通知('已切換為目前換線標準。');
      狀態.目前頁籤='換線標準';
      await 進入製一組中心(true);
    } catch(e) { 顯示通知(e.message||String(e),'錯誤'); }
    finally { 狀態.忙碌=false; 隱藏讀取(); }
  }

  function 建立導航() {
    if (document.getElementById('製一組導航')) return;
    const nav = document.querySelector('.底部導航');
    if (!nav) return;
    const b = document.createElement('button');
    b.id='製一組導航'; b.className='導航按鈕'; b.type='button';
    b.innerHTML='<span class="導航圖示">🏭</span><span>製一組</span>';
    b.onclick=()=>進入製一組中心(false);
    nav.appendChild(b);
  }

  function 初始化() {
    注入樣式();
    建立導航();
    const p = new URLSearchParams(location.search);
    if (p.get('頁面') === '製一組') setTimeout(()=>進入製一組中心(false),750);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',初始化); else 初始化();

  全域.智慧5S製一組標準展開 = Object.freeze({
    進入製一組中心,
    重新整理:()=>進入製一組中心(true),
    版本
  });
})(window);
