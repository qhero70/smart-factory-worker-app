(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S 巡檢週期防重 v1.3.2
   * 1. 修正舊版20項殘留文字，正式顯示25項／100分。
   * 2. 依每台機台巡檢頻率計算下次到期日；未到期前不再出現在待巡檢清單。
   * 3. 同時讀取中央巡檢主檔、手機離線待同步佇列與本機完成鎖，避免重複巡檢。
   * 4. 本期已完成機台收進折疊區，保留可追溯性但禁止重複開單。
   */
  const 版本 = '1.3.2';
  const 設定 = 全域.智慧5S設定 || {};
  const 資料庫 = 全域.智慧5S資料庫;
  const 本機鍵 = '智慧5S_巡檢完成鎖_v1320';
  const 完成日期 = new Map();
  const 機台設定 = new Map();
  let 資料就緒 = false;
  let 載入工作 = null;
  let 套用排程 = 0;
  let 套用中 = false;

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 補零(n) { return String(n).padStart(2, '0'); }
  function 日期字串(d) {
    const x = d instanceof Date ? d : new Date(d || Date.now());
    return `${x.getFullYear()}-${補零(x.getMonth() + 1)}-${補零(x.getDate())}`;
  }
  function 今日() { return 日期字串(new Date()); }
  function 安全日期(v) {
    const s = 文字(v).slice(0, 10).replace(/\//g, '-');
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  }
  function 日期加天(dateText, days) {
    const d = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + Number(days || 0));
    return 日期字串(d);
  }
  function 巡檢週期天數(v) {
    const s = 文字(v);
    if (/每日|每天/.test(s)) return 1;
    if (/雙週|兩週|2週|二週/.test(s)) return 14;
    if (/每月|每30日|每30天/.test(s)) return 30;
    if (/每季|季度/.test(s)) return 90;
    if (/每週|每周|週/.test(s)) return 7;
    const n = Number((s.match(/(\d+)\s*天/) || [])[1]);
    return Number.isFinite(n) && n > 0 ? n : 7;
  }
  function 發Roar(type, title, content) {
    if (全域.智慧5SRoar && typeof 全域.智慧5SRoar.發送 === 'function') {
      全域.智慧5SRoar.發送({ 類型: type, 標題: title, 內容: content, 來源: '巡檢週期防重' });
    }
  }
  function 取機台檔號(row) {
    if (!row) return '';
    const text = [row.備註, row.巡檢單號, row.區域代碼, row.區域名稱].map(文字).join('｜');
    const m = text.match(/MCHK-[A-Z]\d+-[A-Za-z0-9_-]+/i);
    if (m) return m[0].toUpperCase();
    const area = 文字(row.區域代碼);
    const a = area.match(/^([A-Z]\d+)-(.+)$/i);
    return a ? `MCHK-${a[1].toUpperCase()}-${a[2]}` : '';
  }
  function 記錄完成(id, dateText) {
    id = 文字(id).toUpperCase();
    const d = 安全日期(dateText);
    if (!id || !d) return;
    const old = 完成日期.get(id);
    if (!old || d > old) 完成日期.set(id, d);
  }
  function 讀本機完成() {
    try {
      const raw = JSON.parse(localStorage.getItem(本機鍵) || '{}');
      Object.entries(raw || {}).forEach(([id, d]) => 記錄完成(id, d));
    } catch (_) {}
  }
  function 寫本機完成() {
    try {
      const obj = {};
      完成日期.forEach((d, id) => { obj[id] = d; });
      localStorage.setItem(本機鍵, JSON.stringify(obj));
    } catch (_) {}
  }
  function 佇列列轉物件(job) {
    const headers = Array.isArray(job && job.欄位) ? job.欄位 : [];
    const values = Array.isArray(job && job.值) ? job.值 : [];
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] == null ? '' : values[i]; });
    return row;
  }
  function 本期狀態(id) {
    id = 文字(id).toUpperCase();
    const last = 完成日期.get(id) || '';
    if (!last) return { 已完成: false, 上次: '', 下次: '' };
    const cfg = 機台設定.get(id) || {};
    const days = 巡檢週期天數(cfg.初始巡檢頻率 || cfg.巡檢頻率 || '每週');
    const next = 日期加天(last, days);
    return { 已完成: !!next && 今日() < next, 上次: last, 下次: next, 天數: days };
  }

  async function 載入防重資料(force) {
    if (載入工作 && !force) return 載入工作;
    載入工作 = (async () => {
      資料就緒 = false;
      完成日期.clear();
      機台設定.clear();
      讀本機完成();
      if (!資料庫) { 資料就緒 = true; return; }

      const configSheet = (設定.分頁 && 設定.分頁.機台巡檢設定) || '5S_機台巡檢設定';
      const historySheet = (設定.分頁 && 設定.分頁.巡檢主檔) || '5S_巡檢主檔';
      const results = await Promise.allSettled([
        資料庫.讀取分頁(configSheet, 1200),
        資料庫.讀取分頁(historySheet, 5000),
        typeof 資料庫.佇列全部 === 'function' ? 資料庫.佇列全部() : Promise.resolve([])
      ]);

      if (results[0].status === 'fulfilled') {
        const rows = Array.isArray(results[0].value && results[0].value.資料) ? results[0].value.資料 : [];
        rows.forEach(r => {
          const id = 文字(r.機台巡檢檔號).toUpperCase();
          if (id) 機台設定.set(id, r);
        });
      }
      if (results[1].status === 'fulfilled') {
        const rows = Array.isArray(results[1].value && results[1].value.資料) ? results[1].value.資料 : [];
        rows.forEach(r => {
          const status = 文字(r.狀態);
          if (status && /取消|作廢/.test(status)) return;
          記錄完成(取機台檔號(r), r.巡檢日期 || r.送出時間 || r.建立時間);
        });
      }
      if (results[2].status === 'fulfilled') {
        const jobs = Array.isArray(results[2].value) ? results[2].value : [];
        jobs.forEach(job => {
          if (文字(job.工作類型) !== '新增') return;
          if (文字(job.分頁名稱) !== historySheet) return;
          const r = 佇列列轉物件(job);
          記錄完成(取機台檔號(r), r.巡檢日期 || r.送出時間 || r.建立時間 || job.建立時間);
        });
      }
      寫本機完成();
      資料就緒 = true;
    })().catch(err => {
      資料就緒 = true;
      console.warn('[智慧5S] 巡檢防重資料載入失敗', err);
    }).finally(() => {
      載入工作 = null;
      排程套用();
    });
    return 載入工作;
  }

  function 注入樣式() {
    if (document.getElementById('巡檢防重1320樣式')) return;
    const style = document.createElement('style');
    style.id = '巡檢防重1320樣式';
    style.textContent = `
      .MCHK完成摘要{margin:14px 0 6px;border:1px solid #d6e4db;background:#f7fbf8;border-radius:18px;overflow:hidden}
      .MCHK完成摘要 summary{list-style:none;cursor:pointer;padding:14px 16px;font-weight:950;color:#176b47;display:flex;justify-content:space-between;gap:10px;align-items:center}
      .MCHK完成摘要 summary::-webkit-details-marker{display:none}.MCHK完成摘要 summary::after{content:'＋';font-size:1.2rem}.MCHK完成摘要[open] summary::after{content:'－'}
      .MCHK完成內容{display:grid;gap:8px;padding:0 12px 12px}.MCHK完成列{background:#fff;border:1px solid #dfe8e2;border-radius:14px;padding:10px 12px;display:flex;justify-content:space-between;gap:10px;align-items:center}
      .MCHK完成列 b{font-size:.82rem;color:#25382d}.MCHK完成列 small{font-size:.68rem;color:#718078;display:block;margin-top:2px}.MCHK完成勾{color:#168756;font-weight:950;white-space:nowrap}
      .MCHK確認中{opacity:.62;pointer-events:none}.MCHK開始.MCHK確認中標籤{background:#eef2ef;color:#7a877f}
    `;
    document.head.appendChild(style);
  }

  function 修正巡檢文案() {
    const page = document.querySelector('.MCHK頁');
    if (!page) return;
    const title = document.getElementById('頁面標題');
    const subtitle = document.getElementById('頁面副標');
    if (title) title.textContent = '機台25項行動巡檢';
    if (subtitle) subtitle.textContent = '一機一檔｜4/3/2/1/0｜完成後依巡檢週期鎖定';

    const hero = page.querySelector('.主視覺');
    if (hero) {
      const h = hero.querySelector('h2');
      const p = hero.querySelector('p');
      const total = 機台設定.size || 94;
      if (h) h.textContent = `${total}台機台，一機一份巡檢檔`;
      if (p) p.textContent = '25項標準只維護一份母版。完成後依巡檢頻率自動鎖定，到期才重新出現在待巡檢清單；每次巡檢建立1張主單與01～25明細。';
    }

    page.querySelectorAll('.MCHK開始').forEach(el => {
      if (!/完成|確認/.test(el.textContent || '')) el.textContent = '開始 25 項';
    });
    page.querySelectorAll('small').forEach(el => {
      if (/20項明細|01[～~-]20|20項/.test(el.textContent || '')) {
        el.textContent = (el.textContent || '').replace(/20項明細/g, '25項明細').replace(/01[～~-]20/g, '01～25').replace(/20項/g, '25項');
      }
    });
  }

  function 捕捉完成結果() {
    const result = document.querySelector('.MCHK結果');
    if (!result) return;
    const m = (result.textContent || '').match(/MCHK-[A-Z]\d+-[A-Za-z0-9_-]+/i);
    if (!m) return;
    const id = m[0].toUpperCase();
    if (完成日期.get(id) !== 今日()) {
      記錄完成(id, 今日());
      寫本機完成();
    }
  }

  function 套用清單鎖定() {
    const page = document.querySelector('.MCHK頁');
    const list = page && page.querySelector('.MCHK機台清單');
    if (!page || !list) return;

    const cards = Array.from(list.querySelectorAll('.MCHK機台卡'));
    if (!cards.length) return;

    if (!資料就緒) {
      cards.forEach(card => {
        card.classList.add('MCHK確認中');
        const badge = card.querySelector('.MCHK開始');
        if (badge) { badge.textContent = '確認中…'; badge.classList.add('MCHK確認中標籤'); }
      });
      return;
    }

    const done = [];
    cards.forEach(card => {
      card.classList.remove('MCHK確認中');
      const badge = card.querySelector('.MCHK開始');
      if (badge) badge.classList.remove('MCHK確認中標籤');
      const id = 文字(card.dataset.mchk).toUpperCase();
      const status = 本期狀態(id);
      if (!status.已完成) {
        if (badge) badge.textContent = '開始 25 項';
        return;
      }
      const name = 文字((card.querySelector('b') || {}).textContent) || id;
      done.push({ id, name, last: status.上次, next: status.下次 });
      card.remove();
    });

    const old = page.querySelector('.MCHK完成摘要');
    if (old) old.remove();
    if (done.length) {
      const details = document.createElement('details');
      details.className = 'MCHK完成摘要';
      details.innerHTML = `<summary><span>✅ 本期已完成 ${done.length} 台</span><span style="font-size:.68rem;color:#728078">未到期不重複巡檢</span></summary><div class="MCHK完成內容">${done.map(x => `<div class="MCHK完成列"><div><b>${x.name.replace(/[&<>]/g, '')}</b><small>完成 ${x.last}｜下次 ${x.next}</small></div><span class="MCHK完成勾">已鎖定</span></div>`).join('')}</div>`;
      list.insertAdjacentElement('afterend', details);
    }

    const pending = list.querySelectorAll('.MCHK機台卡').length;
    const headerP = page.querySelector('.區段標題 p');
    if (headerP) headerP.textContent = `待巡檢 ${pending} 台｜本期完成 ${done.length} 台｜總計 ${機台設定.size || pending + done.length} 台`;
  }

  function 套用() {
    if (套用中) return;
    套用中 = true;
    try {
      捕捉完成結果();
      修正巡檢文案();
      套用清單鎖定();
    } finally {
      套用中 = false;
    }
  }
  function 排程套用() {
    if (套用排程) return;
    套用排程 = requestAnimationFrame(() => {
      套用排程 = 0;
      套用();
    });
  }

  function 啟動() {
    注入樣式();
    讀本機完成();
    載入防重資料(false);
    new MutationObserver(排程套用).observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', e => {
      const card = e.target && e.target.closest ? e.target.closest('.MCHK機台卡[data-mchk]') : null;
      if (!card) return;
      const status = 本期狀態(card.dataset.mchk);
      if (資料就緒 && status.已完成) {
        e.preventDefault();
        e.stopImmediatePropagation();
        發Roar('提醒', '本期已完成', `${card.dataset.mchk} 已於 ${status.上次} 完成；下次巡檢 ${status.下次}`);
      }
    }, true);
    window.addEventListener('focus', () => 載入防重資料(true));
    window.addEventListener('online', () => 載入防重資料(true));
    setTimeout(排程套用, 300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 啟動, { once: true });
  else 啟動();

  全域.智慧5S巡檢週期防重 = Object.freeze({
    版本,
    重新整理: () => 載入防重資料(true),
    本期狀態: id => 本期狀態(id)
  });
})(window);
