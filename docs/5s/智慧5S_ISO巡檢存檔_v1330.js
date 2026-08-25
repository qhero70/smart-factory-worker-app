(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S ISO巡檢存檔 v1.3.3
   * - 將中央已同步資料與手機 IndexedDB 待同步佇列合併成一份機台巡檢履歷。
   * - 每次巡檢產生可追溯存檔編號，顯示 ISO 文件號／版次。
   * - 提供 25 項正式巡檢表格與 A4 列印／iPhone 儲存 PDF。
   * - 未取得原始分數時只標示「待回補」，絕不補造分數。
   */
  const 版本 = '1.3.3';
  const 設定 = 全域.智慧5S設定 || {};
  const 資料庫 = 全域.智慧5S資料庫;
  const ISO文件號 = 'HX-5S-FM-001';
  const ISO版次 = 'A/0';
  const 存檔索引分頁 = (設定.分頁 && 設定.分頁.巡檢存檔索引) || '5S_巡檢存檔索引';
  const 列印紀錄鍵 = '智慧5S_ISO巡檢列印紀錄_v1330';
  const 快取 = new Map();
  const 快取毫秒 = 12000;
  let 注入排程 = 0;

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 數值(v, d) {
    const n = Number(String(v == null ? '' : v).replace('%', ''));
    return Number.isFinite(n) ? n : (d == null ? 0 : d);
  }
  function 轉義(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function 補零(n, len) { return String(n).padStart(len || 2, '0'); }
  function 第一值(row, keys) {
    for (const k of keys) if (row && 文字(row[k])) return 文字(row[k]);
    return '';
  }
  function 日期字串(v) {
    const raw = 文字(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const d = new Date(v || Date.now());
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${補零(d.getMonth()+1)}-${補零(d.getDate())}`;
  }
  function 日期純數(v) { return 日期字串(v).replace(/-/g, ''); }
  function 時間值(row) {
    return Date.parse(第一值(row, ['送出時間','建立時間','巡檢日期','開始時間']) || '') || 0;
  }
  function 評等(rate) {
    const n = 數值(rate, -1);
    if (n < 0) return '待回補';
    if (n >= 90) return 'A';
    if (n >= 80) return 'B';
    if (n >= 70) return 'C';
    if (n >= 60) return 'D';
    return 'E';
  }
  function 判定文字(score, max) {
    const s = 數值(score, -1), m = 數值(max, 4);
    if (s < 0) return '待回補';
    if (s >= m) return '符合';
    if (s === 3) return '輕微偏差';
    if (s === 2) return '明顯偏差';
    if (s === 1) return '嚴重不符';
    return '無標準／失控';
  }

  function 佇列工作轉物件(job) {
    const headers = Array.isArray(job && job.欄位) ? job.欄位 : [];
    const values = Array.isArray(job && job.值) ? job.值 : [];
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] == null ? '' : values[i]; });
    row._本機工作識別碼 = job && job.本機識別碼 || '';
    row._本機建立時間 = job && job.建立時間 || '';
    return row;
  }

  async function 讀分頁(name, limit) {
    if (!資料庫 || !name) return [];
    const key = `${name}:${limit || 5000}`;
    const now = Date.now();
    const hit = 快取.get(key);
    if (hit && now - hit.t < 快取毫秒) return hit.data;
    try {
      const r = await 資料庫.讀取分頁(name, limit || 5000);
      const data = Array.isArray(r && r.資料) ? r.資料 : [];
      快取.set(key, {t: now, data});
      return data;
    } catch (_) {
      return [];
    }
  }

  async function 讀佇列() {
    try {
      return 資料庫 && typeof 資料庫.佇列全部 === 'function' ? await 資料庫.佇列全部() : [];
    } catch (_) { return []; }
  }

  function 取MCHK(row) {
    const hay = [row && row.備註, row && row.機台巡檢檔號, row && row.區域代碼, row && row.區域名稱].map(文字).join('｜');
    const m = hay.match(/MCHK-[A-Z]\d+-[A-Za-z0-9_-]+/i);
    if (m) return m[0].toUpperCase();
    const code = 文字(row && row.區域代碼);
    const x = code.match(/^([A-Z]\d+)-(.+)$/i);
    return x ? `MCHK-${x[1].toUpperCase()}-${x[2]}` : '';
  }

  function 去重(rows, keyFn) {
    const map = new Map();
    rows.forEach(r => {
      const k = keyFn(r);
      if (!k) return;
      if (!map.has(k) || 文字(r._同步狀態) === '中央已同步') map.set(k, r);
    });
    return Array.from(map.values());
  }

  function 建立存檔編號(master, machine, allMasters, indexRows) {
    const mchk = 文字(machine.機台巡檢檔號).toUpperCase();
    const date = 日期字串(master.巡檢日期 || master.送出時間 || master.建立時間);
    const existing = indexRows.find(r =>
      文字(r.巡檢單號) && 文字(r.巡檢單號) === 文字(master.巡檢單號)
    ) || indexRows.find(r =>
      文字(r.機台巡檢檔號).toUpperCase() === mchk && 日期字串(r.巡檢日期) === date
    );
    if (existing && 文字(existing.存檔編號)) return 文字(existing.存檔編號);

    const sameDay = allMasters.filter(r => 日期字串(r.巡檢日期 || r.送出時間 || r.建立時間) === date)
      .slice().sort((a,b) => 時間值(a) - 時間值(b));
    const idx = Math.max(0, sameDay.findIndex(r => 文字(r.巡檢單號) === 文字(master.巡檢單號))) + 1;
    const area = 文字(machine.主區域) || (mchk.match(/^MCHK-([^-]+)-/) || [,'5S'])[1];
    const no = 文字(machine.機台編號) || (mchk.split('-').pop() || 'NA');
    return `5S-REC-${area}-${no}-${日期純數(date) || '00000000'}-${補零(idx || 1, 3)}`;
  }

  async function 建立存檔資料(mchk) {
    mchk = 文字(mchk).toUpperCase();
    const cfgSheet = (設定.分頁 && 設定.分頁.機台巡檢設定) || '5S_機台巡檢設定';
    const mainSheet = (設定.分頁 && 設定.分頁.巡檢主檔) || '5S_巡檢主檔';
    const detailSheet = (設定.分頁 && 設定.分頁.巡檢明細) || '5S_巡檢明細';

    const [machines, centralMain, centralDetail, indexRows, jobs] = await Promise.all([
      讀分頁(cfgSheet, 1200), 讀分頁(mainSheet, 5000), 讀分頁(detailSheet, 20000),
      讀分頁(存檔索引分頁, 10000), 讀佇列()
    ]);
    const machine = machines.find(r => 文字(r.機台巡檢檔號).toUpperCase() === mchk) || {};
    const code = 文字(machine['5S子區域代碼']) || `${文字(machine.主區域)}-${文字(machine.機台編號)}`;

    const mains = centralMain.filter(r => 取MCHK(r) === mchk || 文字(r.區域代碼) === code)
      .map(r => Object.assign({}, r, {_同步狀態:'中央已同步'}));
    const queuedMain = jobs.filter(j =>
      文字(j.工作類型) === '新增' && 文字(j.分頁名稱) === mainSheet
    ).map(佇列工作轉物件).filter(r => 取MCHK(r) === mchk || 文字(r.區域代碼) === code)
      .map(r => Object.assign({}, r, {_同步狀態:'手機待同步'}));

    const masters = 去重([...queuedMain, ...mains], r => 文字(r.巡檢單號))
      .sort((a,b) => 時間值(b) - 時間值(a));
    const ids = new Set(masters.map(r => 文字(r.巡檢單號)).filter(Boolean));

    const detailsA = centralDetail.filter(r => ids.has(文字(r.巡檢單號)))
      .map(r => Object.assign({}, r, {_同步狀態:'中央已同步'}));
    const detailsB = jobs.filter(j =>
      文字(j.工作類型) === '新增' && 文字(j.分頁名稱) === detailSheet
    ).map(佇列工作轉物件).filter(r => ids.has(文字(r.巡檢單號)))
      .map(r => Object.assign({}, r, {_同步狀態:'手機待同步'}));
    const details = 去重([...detailsB, ...detailsA], r => 文字(r.明細編號) || `${文字(r.巡檢單號)}-${文字(r.項目代碼)}`);

    const relevantIndex = indexRows.filter(r =>
      文字(r.機台巡檢檔號).toUpperCase() === mchk || (文字(r.主區域) === 文字(machine.主區域) && 文字(r.機台編號) === 文字(machine.機台編號))
    );

    masters.forEach(master => {
      master._存檔編號 = 建立存檔編號(master, machine, masters, relevantIndex);
      master._ISO文件號 = ISO文件號;
      master._ISO版次 = ISO版次;
    });

    const backed = new Set(masters.map(r => r._存檔編號));
    const placeholders = relevantIndex.filter(r => 文字(r.存檔編號) && !backed.has(文字(r.存檔編號)))
      .map(r => Object.assign({}, r, {
        _存檔編號:文字(r.存檔編號), _ISO文件號:文字(r.ISO文件號)||ISO文件號,
        _ISO版次:文字(r.ISO版次)||ISO版次, _同步狀態:文字(r.同步狀態)||'待回補', _索引占位:true
      }));

    return {mchk, machine, code, masters, details, indexRows:relevantIndex, placeholders};
  }

  function 取列印紀錄() {
    try { return JSON.parse(localStorage.getItem(列印紀錄鍵) || '{}') || {}; } catch (_) { return {}; }
  }
  function 列印次數(no) { return Number(取列印紀錄()[no] && 取列印紀錄()[no].次數 || 0); }
  function 記錄列印(no) {
    try {
      const all = 取列印紀錄();
      const old = all[no] || {次數:0};
      all[no] = {次數:Number(old.次數 || 0)+1, 最後列印時間:new Date().toISOString()};
      localStorage.setItem(列印紀錄鍵, JSON.stringify(all));
    } catch (_) {}
  }

  function 注入樣式() {
    if (document.getElementById('ISO巡檢存檔1330樣式')) return;
    const s = document.createElement('style');
    s.id = 'ISO巡檢存檔1330樣式';
    s.textContent = `
      .ISO存檔卡{border:1px solid #cfe2d7;background:linear-gradient(145deg,#fff,#f3f9f5);border-radius:20px;padding:15px;margin-top:11px;box-shadow:0 9px 25px rgba(22,64,42,.06)}
      .ISO存檔標題{display:flex;justify-content:space-between;gap:8px;align-items:center}.ISO存檔標題 b{font-size:.94rem}.ISO存檔標題 span{font-size:.64rem;color:#6d8075}
      .ISO存檔工具{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ISO小按鈕{border:1px solid #cfe1d6;background:#fff;color:#176b47;border-radius:13px;padding:9px 11px;font-weight:900;font-size:.7rem}.ISO小按鈕.主{background:#176b47;color:#fff;border-color:#176b47}.ISO小按鈕:disabled{opacity:.45}
      .ISO存檔列{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px 0;border-bottom:1px dashed #dfe8e2}.ISO存檔列:last-child{border-bottom:0}.ISO存檔列 b{font-size:.77rem;word-break:break-all}.ISO存檔列 small{display:block;color:#718178;font-size:.65rem;line-height:1.5;margin-top:3px}.ISO狀態{display:inline-block;padding:4px 8px;border-radius:999px;font-size:.62rem;font-weight:900;margin-top:5px;background:#e7f5ec;color:#16744b}.ISO狀態.待{background:#fff0d9;color:#9a5f00}
      .ISO遮罩{position:fixed;inset:0;z-index:2147483600;background:rgba(5,25,17,.60);backdrop-filter:blur(6px);display:flex;align-items:stretch;justify-content:center}.ISO面板{width:min(920px,100%);height:100%;overflow:auto;background:#eef3f0;padding:calc(12px + env(safe-area-inset-top)) 10px calc(20px + env(safe-area-inset-bottom))}
      .ISO操作{position:sticky;top:calc(-12px - env(safe-area-inset-top));z-index:5;margin:calc(-12px - env(safe-area-inset-top)) -10px 10px;padding:calc(10px + env(safe-area-inset-top)) 10px 10px;background:rgba(244,248,246,.96);backdrop-filter:blur(14px);display:flex;gap:8px;justify-content:flex-end;border-bottom:1px solid #d3dfd8}.ISO操作 button{border:0;border-radius:13px;padding:10px 13px;font-weight:950}.ISO列印鈕{background:#176b47;color:#fff}.ISO關閉鈕{background:#e3ebe6;color:#345347}
      .ISO紙張{width:210mm;max-width:100%;min-height:297mm;margin:0 auto;background:#fff;color:#111;padding:9mm;box-sizing:border-box;box-shadow:0 8px 30px rgba(0,0,0,.14);font-family:-apple-system,BlinkMacSystemFont,'Microsoft JhengHei',sans-serif}.ISO文件頭{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;border:2px solid #222;padding:8px}.ISO文件頭 h1{font-size:20px;margin:0 0 3px}.ISO文件頭 p{margin:0;font-size:11px}.ISO文件資訊{border-collapse:collapse;font-size:10px}.ISO文件資訊 th,.ISO文件資訊 td{border:1px solid #333;padding:4px 6px;white-space:nowrap}.ISO文件資訊 th{background:#eee}
      .ISO基本{width:100%;border-collapse:collapse;margin-top:7px;font-size:10.5px}.ISO基本 th,.ISO基本 td{border:1px solid #333;padding:5px}.ISO基本 th{background:#f0f0f0;text-align:left;width:13%}.ISO總結{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:7px;border:1px solid #333}.ISO總結>div{border-right:1px solid #333;padding:6px}.ISO總結>div:last-child{border-right:0}.ISO總結 small{display:block;font-size:9px;color:#555}.ISO總結 b{font-size:15px}
      .ISO明細表{width:100%;border-collapse:collapse;margin-top:7px;font-size:8.5px;table-layout:fixed}.ISO明細表 th,.ISO明細表 td{border:1px solid #333;padding:3px 4px;vertical-align:top;word-break:break-word}.ISO明細表 th{background:#e9eeee}.ISO明細表 .序{width:4%}.ISO明細表 .類{width:8%}.ISO明細表 .碼{width:10%}.ISO明細表 .分{width:6%;text-align:center}.ISO明細表 .判{width:10%}.ISO明細表 .改{width:12%}
      .ISO簽核{display:grid;grid-template-columns:repeat(3,1fr);margin-top:8px;border:1px solid #333}.ISO簽核>div{min-height:42px;border-right:1px solid #333;padding:5px;font-size:9px}.ISO簽核>div:last-child{border-right:0}.ISO註記{font-size:8.5px;color:#444;margin-top:7px;line-height:1.5}.ISO待回補{margin-top:8px;border:2px dashed #b06a00;background:#fff6e6;padding:10px;font-size:11px;font-weight:900;color:#865000}
      @media(max-width:700px){.ISO紙張{width:100%;min-height:0;padding:14px}.ISO文件頭{grid-template-columns:1fr}.ISO文件資訊{width:100%}.ISO明細表{font-size:8px}.ISO總結{grid-template-columns:repeat(2,1fr)}.ISO總結>div:nth-child(2){border-right:0}.ISO總結>div:nth-child(-n+2){border-bottom:1px solid #333}}
      @media print{
        @page{size:A4 portrait;margin:7mm}
        body *{visibility:hidden!important}
        #ISO巡檢表遮罩,#ISO巡檢表遮罩 *{visibility:visible!important}
        #ISO巡檢表遮罩{position:static!important;display:block!important;background:#fff!important;backdrop-filter:none!important}
        #ISO巡檢表遮罩 .ISO面板{height:auto!important;overflow:visible!important;background:#fff!important;padding:0!important}
        #ISO巡檢表遮罩 .ISO操作{display:none!important}
        #ISO巡檢表遮罩 .ISO紙張{width:100%!important;max-width:none!important;min-height:0!important;padding:0!important;margin:0!important;box-shadow:none!important}
        .ISO明細表 thead{display:table-header-group}.ISO明細表 tr{break-inside:avoid}.ISO文件頭,.ISO基本,.ISO總結,.ISO簽核{break-inside:avoid}
      }
    `;
    document.head.appendChild(s);
  }

  function 組合紀錄項目(data) {
    const masters = data.masters.map(m => ({type:'master', row:m, no:m._存檔編號, status:m._同步狀態}));
    const placeholders = data.placeholders.map(r => ({type:'placeholder', row:r, no:r._存檔編號, status:r._同步狀態}));
    return [...masters, ...placeholders].sort((a,b) => 時間值(b.row) - 時間值(a.row));
  }

  function 更新舊履歷摘要(panel, data) {
    const latest = data.masters[0];
    panel.querySelectorAll('.MH數卡').forEach(card => {
      const label = 文字(card.querySelector('small') && card.querySelector('small').textContent);
      const b = card.querySelector('b');
      const span = card.querySelector('span');
      if (label === '最近分數' && latest) {
        const rate = 數值(latest.得分率, -1);
        if (b) b.textContent = rate >= 0 ? `${Math.round(rate)}%` : '待回補';
        if (span) span.textContent = 日期字串(latest.巡檢日期 || latest.送出時間) || '待同步';
      }
      if (label === '巡檢累計') {
        if (b) b.textContent = String(data.masters.length);
        if (span) span.textContent = data.masters.some(x => x._同步狀態 === '手機待同步') ? '含手機待同步主單' : '正式主單';
      }
    });
    panel.querySelectorAll('.MH卡標題').forEach(head => {
      const b = head.querySelector('b');
      const span = head.querySelector('span');
      if (b && /常發異常/.test(b.textContent || '') && span) span.textContent = '依歷史25項明細統計';
      if (b && /最近巡檢紀錄/.test(b.textContent || '')) {
        const card = head.closest('.MH卡');
        const list = card && card.querySelector('.MH列表');
        if (list) {
          list.innerHTML = data.masters.length ? data.masters.slice(0,6).map(r => {
            const rate = 數值(r.得分率, -1);
            return `<div class="MH列"><div><b>${轉義(日期字串(r.巡檢日期 || r.送出時間) || '未標日期')}</b><small>${轉義(r._存檔編號)}｜${轉義(r.巡檢單號 || '待回補')}</small><small>${轉義(r._同步狀態)}</small></div><span class="MH徽章 ${rate>=80?'':'警'}">${rate>=0?`${Math.round(rate)}%`:'待回補'}</span></div>`;
          }).join('') : '<div class="MH空">尚無可讀取的巡檢主單</div>';
        }
      }
    });
  }

  async function 注入履歷存檔卡() {
    const panel = document.querySelector('#MH機台履歷遮罩 .MH面板');
    if (!panel || panel.querySelector('.ISO存檔卡[data-ready="1"]')) return;
    const header = panel.querySelector('.MH頭 small');
    const m = 文字(header && header.textContent).match(/MCHK-[A-Z]\d+-[A-Za-z0-9_-]+/i);
    if (!m) return;
    const mchk = m[0].toUpperCase();

    let card = panel.querySelector('.ISO存檔卡');
    if (!card) {
      card = document.createElement('section');
      card.className = 'ISO存檔卡';
      card.innerHTML = `<div class="ISO存檔標題"><b>📄 ISO巡檢存檔</b><span>${ISO文件號}｜${ISO版次}</span></div><div class="MH空">正在合併中央紀錄與手機待同步資料…</div>`;
      const summary = panel.querySelector('.MH摘要');
      summary ? summary.insertAdjacentElement('afterend', card) : panel.appendChild(card);
    }

    const data = await 建立存檔資料(mchk);
    更新舊履歷摘要(panel, data);
    const entries = 組合紀錄項目(data);
    const waiting = data.masters.filter(x => x._同步狀態 === '手機待同步').length;
    card.dataset.ready = '1';
    card.dataset.mchk = mchk;
    card.innerHTML = `<div class="ISO存檔標題"><b>📄 ISO巡檢存檔</b><span>${ISO文件號}｜${ISO版次}</span></div>
      <div class="ISO存檔工具"><button class="ISO小按鈕 主" type="button" data-iso-sync="${轉義(mchk)}">立即同步待存檔${waiting?`（${waiting}）`:''}</button><span style="font-size:.66rem;color:#718178;align-self:center">A4表格｜25項明細｜可列印／儲存PDF</span></div>
      <div>${entries.length ? entries.map(e => {
        const r=e.row, rate=數值(r.得分率,-1), isPlaceholder=e.type==='placeholder';
        return `<div class="ISO存檔列"><div><b>${轉義(e.no)}</b><small>${轉義(日期字串(r.巡檢日期||r.送出時間)||'日期待回補')}｜${轉義(r.巡檢單號||'巡檢單號待回補')}</small><small>分數：${rate>=0?`${Math.round(rate)}%／${評等(rate)}級`:'待回補'}｜異常：${文字(r.異常項數)||'—'}</small><span class="ISO狀態 ${/待/.test(e.status)?'待':''}">${轉義(e.status)}</span></div><button class="ISO小按鈕" type="button" data-iso-open="${轉義(e.no)}" data-mchk="${轉義(mchk)}" ${isPlaceholder?'disabled':''}>${isPlaceholder?'待回補':'查看／列印'}</button></div>`;
      }).join('') : '<div class="MH空">目前沒有巡檢存檔。若本機剛完成巡檢，請按「立即同步待存檔」。</div>'}</div>`;
  }

  function 明細排序(a,b) {
    const na = Number((文字(a.明細編號).match(/-(\d{2})$/)||[])[1] || 999);
    const nb = Number((文字(b.明細編號).match(/-(\d{2})$/)||[])[1] || 999);
    return na-nb || 文字(a.項目代碼).localeCompare(文字(b.項目代碼), 'zh-Hant');
  }

  function 開啟正式文件(data, master) {
    關閉正式文件();
    const no = master._存檔編號;
    const details = data.details.filter(r => 文字(r.巡檢單號) === 文字(master.巡檢單號)).sort(明細排序);
    const machine = data.machine || {};
    const rate = 數值(master.得分率, -1);
    const total = 文字(master.總得分) || '—';
    const max = 文字(master.最高總分) || (details.length ? String(details.reduce((s,r)=>s+數值(r.最高分,4),0)) : '—');
    const exceptionCount = 文字(master.異常項數) || (details.length ? String(details.filter(r=>數值(r.得分,-1)>=0 && 數值(r.得分)<數值(r.最高分,4)).length) : '—');
    const rows = details.map((r, i) => {
      const score = 文字(r.得分), mx = 文字(r.最高分)||'4';
      return `<tr><td class="序">${補零(i+1)}</td><td class="類">${轉義(r['5S分類']||'')}</td><td class="碼">${轉義(r.項目代碼||'')}</td><td>${轉義(r.檢查內容||'')}</td><td class="分">${轉義(score||'—')}</td><td class="判">${轉義(判定文字(score,mx))}</td><td>${轉義(r.異常原因||'')}</td><td class="改">${轉義(r.改善單號||'')}</td></tr>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'ISO巡檢表遮罩';
    overlay.className = 'ISO遮罩';
    overlay.innerHTML = `<div class="ISO面板"><div class="ISO操作"><button class="ISO列印鈕" type="button">列印／儲存PDF</button><button class="ISO關閉鈕" type="button">關閉</button></div><article class="ISO紙張">
      <header class="ISO文件頭"><div><h1>製一｜智慧5S 機台5S巡檢紀錄表</h1><p>25項／0～4分／滿分100分｜電子巡檢正式紀錄</p></div><table class="ISO文件資訊"><tr><th>ISO文件號</th><td>${轉義(ISO文件號)}</td><th>版次</th><td>${轉義(ISO版次)}</td></tr><tr><th>存檔編號</th><td colspan="3">${轉義(no)}</td></tr></table></header>
      <table class="ISO基本"><tr><th>機台巡檢檔號</th><td>${轉義(data.mchk)}</td><th>巡檢單號</th><td>${轉義(master.巡檢單號||'—')}</td></tr><tr><th>區域</th><td>${轉義(machine.主區域||'')}</td><th>機台</th><td>${轉義(machine.機台編號||'')}｜${轉義(machine.機台名稱||'')}</td></tr><tr><th>巡檢日期</th><td>${轉義(日期字串(master.巡檢日期||master.送出時間)||'—')}</td><th>巡檢人</th><td>${轉義(master.巡檢人工號||'')} ${轉義(master.巡檢人姓名||'')}</td></tr><tr><th>開始時間</th><td>${轉義(master.開始時間||'—')}</td><th>送出時間</th><td>${轉義(master.送出時間||'—')}</td></tr><tr><th>同步狀態</th><td>${轉義(master._同步狀態)}</td><th>列印次數</th><td>${列印次數(no)}</td></tr></table>
      <section class="ISO總結"><div><small>總得分</small><b>${轉義(total)} / ${轉義(max)}</b></div><div><small>得分率</small><b>${rate>=0?`${Math.round(rate)}%`:'—'}</b></div><div><small>評等</small><b>${轉義(評等(rate))}</b></div><div><small>異常項數</small><b>${轉義(exceptionCount)}</b></div></section>
      ${details.length===25?'':`<div class="ISO待回補">目前取得 ${details.length} / 25 項原始明細。未取得的資料不補造；請先返回履歷按「立即同步待存檔」。</div>`}
      <table class="ISO明細表"><thead><tr><th class="序">序</th><th class="類">5S</th><th class="碼">項目代碼</th><th>檢查內容</th><th class="分">分數</th><th class="判">判定</th><th>異常原因</th><th class="改">改善單號</th></tr></thead><tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:18px">25項原始明細尚待回補</td></tr>'}</tbody></table>
      <section class="ISO簽核"><div>巡檢人：${轉義(master.巡檢人姓名||'')}<br>日期：${轉義(日期字串(master.巡檢日期)||'')}</div><div>區域負責人：<br>日期：</div><div>主管複核：<br>日期：</div></section>
      <div class="ISO註記">文件管理：本表電子原始紀錄以「存檔編號＋巡檢單號」追溯。列印／另存PDF為輸出副本；若25項原始明細未完整回補，不得視為完整稽核證據。系統文件號 ${轉義(ISO文件號)}／版次 ${轉義(ISO版次)} 可由文管參數統一調整。</div>
    </article></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.ISO關閉鈕').onclick = 關閉正式文件;
    overlay.addEventListener('click', e => { if (e.target === overlay) 關閉正式文件(); });
    overlay.querySelector('.ISO列印鈕').onclick = () => {
      記錄列印(no);
      window.print();
    };
  }

  function 關閉正式文件() {
    const x = document.getElementById('ISO巡檢表遮罩');
    if (x) x.remove();
  }

  async function 開啟存檔(mchk, no) {
    const data = await 建立存檔資料(mchk);
    const master = data.masters.find(r => r._存檔編號 === no);
    if (!master) {
      if (全域.智慧5SRoar && 全域.智慧5SRoar.發送) 全域.智慧5SRoar.發送({類型:'警告',標題:'巡檢資料待回補',內容:`${no} 尚未取得原始巡檢主單`,來源:'ISO巡檢存檔'});
      else alert('此筆只有存檔索引，原始巡檢主單尚待手機回補。');
      return;
    }
    開啟正式文件(data, master);
  }

  async function 立即同步(mchk, button) {
    if (!資料庫 || typeof 資料庫.同步佇列 !== 'function') return;
    const old = button && button.textContent;
    if (button) { button.disabled = true; button.textContent = '同步中…'; }
    try {
      const result = await 資料庫.同步佇列();
      快取.clear();
      if (全域.智慧5S機台履歷 && 全域.智慧5S機台履歷.清除快取) 全域.智慧5S機台履歷.清除快取();
      const card = document.querySelector(`.ISO存檔卡[data-mchk="${CSS.escape(mchk)}"]`);
      if (card) { card.dataset.ready='0'; card.remove(); }
      await 注入履歷存檔卡();
      const msg = result && result.剩餘 ? `仍有 ${result.剩餘} 筆待同步；本機原始紀錄會繼續保留。` : '待同步佇列已處理完成。';
      if (全域.智慧5SRoar && 全域.智慧5SRoar.發送) 全域.智慧5SRoar.發送({類型:result&&result.剩餘?'警告':'成功',標題:'巡檢存檔同步',內容:msg,來源:'ISO巡檢存檔'});
    } catch (err) {
      if (全域.智慧5SRoar && 全域.智慧5SRoar.發送) 全域.智慧5SRoar.發送({類型:'錯誤',標題:'同步未完成',內容:err.message||String(err),來源:'ISO巡檢存檔'});
    } finally {
      if (button && document.body.contains(button)) { button.disabled=false; button.textContent=old; }
    }
  }

  function 排程注入(delay) {
    clearTimeout(注入排程);
    注入排程 = setTimeout(() => 注入履歷存檔卡().catch(err => console.warn('[智慧5S] ISO存檔注入失敗', err)), delay || 120);
  }

  document.addEventListener('click', e => {
    const open = e.target.closest && e.target.closest('[data-iso-open]');
    if (open) { e.preventDefault(); e.stopPropagation(); 開啟存檔(open.dataset.mchk, open.dataset.isoOpen); return; }
    const sync = e.target.closest && e.target.closest('[data-iso-sync]');
    if (sync) { e.preventDefault(); e.stopPropagation(); 立即同步(sync.dataset.isoSync, sync); return; }
    if (e.target.closest && e.target.closest('.MH履歷鈕')) { 排程注入(180);排程注入(600); }
  }, true);

  const observer = new MutationObserver(() => {
    if (document.querySelector('#MH機台履歷遮罩 .MH面板') && !document.querySelector('.ISO存檔卡[data-ready="1"]')) 排程注入(140);
  });
  if (document.body) observer.observe(document.body, {childList:true, subtree:true});
  else document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, {childList:true, subtree:true}), {once:true});

  document.addEventListener('keydown', e => { if (e.key === 'Escape') 關閉正式文件(); });
  window.addEventListener('afterprint', () => {});
  注入樣式();

  全域.智慧5SISO巡檢存檔 = Object.freeze({版本, ISO文件號, ISO版次, 建立存檔資料, 開啟存檔, 立即同步, 清除快取:()=>快取.clear()});
})(window);