(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S 機台履歷首次載入修復 v1.3.6
   * 問題：首次開啟機台履歷時，中央履歷面板可能先完成，但手機 IndexedDB 待同步巡檢資料尚未合併，
   *       造成第一次顯示「尚無巡檢」，關閉後第二次開啟才出現 100%／巡檢累計／ISO存檔。
   * 修正：不再使用固定毫秒猜測載入時間；等待最終機台履歷面板真正建立後，再 await ISO 模組完成中央＋手機佇列合併，
   *       同一次開啟立即更新摘要與 ISO 巡檢存檔卡。
   */
  const 版本 = '1.3.6';
  let 工作序號 = 0;
  const 執行中 = new Map();

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 數值(v, d) {
    const raw = 文字(v).replace('%', '');
    if (!raw) return d == null ? 0 : d;
    const n = Number(raw);
    return Number.isFinite(n) ? n : (d == null ? 0 : d);
  }
  function 轉義(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function 等待(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function 日期(v) {
    const s = 文字(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(v || 0);
    if (Number.isNaN(d.getTime())) return '';
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
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

  function 取得目前面板(mchk) {
    const panel = document.querySelector('#MH機台履歷遮罩 .MH面板');
    if (!panel) return null;
    const header = panel.querySelector('.MH頭 small');
    if (!header) return null; // 載入中的暫時面板沒有 .MH頭，不能提早處理。
    const text = 文字(header.textContent).toUpperCase();
    return text.includes(文字(mchk).toUpperCase()) ? panel : null;
  }

  function 更新摘要(panel, data) {
    const latest = data && data.masters && data.masters[0];
    panel.querySelectorAll('.MH數卡').forEach(card => {
      const label = 文字(card.querySelector('small') && card.querySelector('small').textContent);
      const value = card.querySelector('b');
      const note = card.querySelector('span');
      if (label === '最近分數') {
        const rate = latest ? 數值(latest.得分率, -1) : -1;
        if (value) value.textContent = rate >= 0 ? `${Math.round(rate)}%` : '—';
        if (note) note.textContent = latest ? (日期(latest.巡檢日期 || latest.送出時間) || '待同步') : '尚無巡檢';
      }
      if (label === '巡檢累計') {
        const count = data && Array.isArray(data.masters) ? data.masters.length : 0;
        if (value) value.textContent = String(count);
        if (note) note.textContent = data && data.masters && data.masters.some(x => x._同步狀態 === '手機待同步') ? '含手機待同步主單' : '正式主單';
      }
    });

    panel.querySelectorAll('.MH卡標題').forEach(head => {
      const title = head.querySelector('b');
      const span = head.querySelector('span');
      if (title && /常發異常/.test(title.textContent || '') && span) span.textContent = '依歷史25項明細統計';
      if (title && /最近巡檢紀錄/.test(title.textContent || '')) {
        const card = head.closest('.MH卡');
        const list = card && card.querySelector('.MH列表');
        if (!list) return;
        const rows = (data.masters || []).slice(0, 6);
        list.innerHTML = rows.length ? rows.map(r => {
          const rate = 數值(r.得分率, -1);
          return `<div class="MH列"><div><b>${轉義(日期(r.巡檢日期 || r.送出時間) || '未標日期')}</b><small>${轉義(r._存檔編號 || '')}｜${轉義(r.巡檢單號 || '待回補')}</small><small>${轉義(r._同步狀態 || '')}</small></div><span class="MH徽章 ${rate>=80?'':'警'}">${rate>=0?`${Math.round(rate)}%`:'待回補'}</span></div>`;
        }).join('') : '<div class="MH空">尚無可讀取的巡檢主單</div>';
      }
    });
  }

  function 組合紀錄(data) {
    const a = (data.masters || []).map(r => ({row:r, no:r._存檔編號, status:r._同步狀態, placeholder:false}));
    const b = (data.placeholders || []).map(r => ({row:r, no:r._存檔編號, status:r._同步狀態, placeholder:true}));
    const time = r => Date.parse(文字(r.row.送出時間 || r.row.建立時間 || r.row.巡檢日期)) || 0;
    return [...a, ...b].sort((x,y) => time(y)-time(x));
  }

  function 繪製ISO卡(panel, mchk, data) {
    let card = panel.querySelector('.ISO存檔卡');
    if (!card) {
      card = document.createElement('section');
      card.className = 'ISO存檔卡';
      const summary = panel.querySelector('.MH摘要');
      summary ? summary.insertAdjacentElement('afterend', card) : panel.appendChild(card);
    }

    const api = 全域.智慧5SISO巡檢存檔 || {};
    const isoNo = 文字(api.ISO文件號 || 'HX-5S-FM-001');
    const isoRev = 文字(api.ISO版次 || 'A/0');
    const entries = 組合紀錄(data);
    const waiting = (data.masters || []).filter(x => x._同步狀態 === '手機待同步').length;

    card.dataset.loading = '0';
    card.dataset.ready = '1';
    card.dataset.mchk = mchk;
    card.dataset.firstLoadFixed = '1';
    card.innerHTML = `<div class="ISO存檔標題"><b>📄 ISO巡檢存檔</b><span>${轉義(isoNo)}｜${轉義(isoRev)}</span></div>
      <div class="ISO存檔工具"><button class="ISO小按鈕 主" type="button" data-iso-sync="${轉義(mchk)}">立即同步待存檔${waiting?`（${waiting}）`:''}</button><span style="font-size:.66rem;color:#718178;align-self:center">A4表格｜25項明細｜可列印／儲存PDF</span></div>
      <div>${entries.length ? entries.map(e => {
        const r = e.row || {};
        const rate = 數值(r.得分率, -1);
        return `<div class="ISO存檔列"><div><b>${轉義(e.no || '')}</b><small>${轉義(日期(r.巡檢日期 || r.送出時間) || '日期待回補')}｜${轉義(r.巡檢單號 || '巡檢單號待回補')}</small><small>分數：${rate>=0?`${Math.round(rate)}%／${評等(rate)}級`:'待回補'}｜異常：${轉義(文字(r.異常項數) || '—')}</small><span class="ISO狀態 ${/待/.test(文字(e.status))?'待':''}">${轉義(e.status || '')}</span></div><button class="ISO小按鈕 ${e.placeholder?'待':''}" type="button" data-iso-open="${轉義(e.no || '')}" data-mchk="${轉義(mchk)}">${e.placeholder?'查看／列印（待回補）':'查看／列印'}</button></div>`;
      }).join('') : '<div class="MH空">目前沒有巡檢存檔。</div>'}</div>`;
  }

  async function 首次載入完成後合併(mchk, token) {
    mchk = 文字(mchk).toUpperCase();
    if (!mchk) return;

    // 最長等待 30 秒；不是固定延遲，而是等最終履歷面板的 .MH頭 真正出現。
    let panel = null;
    for (let i = 0; i < 240; i++) {
      if (token !== 工作序號) return;
      panel = 取得目前面板(mchk);
      if (panel) break;
      await 等待(125);
    }
    if (!panel || token !== 工作序號) return;

    // 若原 ISO 模組已經完整處理，就只結束，不重複渲染。
    const existingReady = panel.querySelector('.ISO存檔卡[data-ready="1"]');
    if (existingReady) return;

    let loading = panel.querySelector('.ISO存檔卡');
    if (!loading) {
      loading = document.createElement('section');
      loading.className = 'ISO存檔卡';
      loading.dataset.loading = '1';
      loading.innerHTML = '<div class="ISO存檔標題"><b>📄 ISO巡檢存檔</b><span>資料合併中</span></div><div class="MH空">正在讀取中央紀錄與本機待同步25項巡檢資料…</div>';
      const summary = panel.querySelector('.MH摘要');
      summary ? summary.insertAdjacentElement('afterend', loading) : panel.appendChild(loading);
    }

    const api = 全域.智慧5SISO巡檢存檔;
    if (!api || typeof api.建立存檔資料 !== 'function') return;

    try {
      const data = await api.建立存檔資料(mchk); // 這裡真正 await IndexedDB＋中央資料，不再猜時間。
      if (token !== 工作序號) return;
      panel = 取得目前面板(mchk);
      if (!panel) return;

      更新摘要(panel, data);
      // 若原模組在我們等待期間已完成，保留它的卡；摘要仍已更新。
      if (!panel.querySelector('.ISO存檔卡[data-ready="1"]')) 繪製ISO卡(panel, mchk, data);
    } catch (err) {
      console.warn('[智慧5S] 首次履歷資料合併失敗', err);
      const card = panel && panel.querySelector('.ISO存檔卡[data-loading="1"]');
      if (card) card.innerHTML = `<div class="ISO存檔標題"><b>📄 ISO巡檢存檔</b><span>稍後重試</span></div><div class="MH空">${轉義(err && err.message || '資料讀取未完成')}</div>`;
    }
  }

  function 啟動(mchk) {
    const token = ++工作序號;
    const key = 文字(mchk).toUpperCase();
    const p = 首次載入完成後合併(key, token).finally(() => {
      if (執行中.get(key) === p) 執行中.delete(key);
    });
    執行中.set(key, p);
    return p;
  }

  // 使用者按「查看5S履歷」時立即建立守衛；最終面板完成前不做錯誤判定。
  document.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('.MH履歷鈕[data-mh]');
    if (btn) 啟動(btn.dataset.mh);
  }, true);

  // 同時支援其他程式直接開啟履歷，不依賴按鈕事件。
  const observer = new MutationObserver(() => {
    const header = document.querySelector('#MH機台履歷遮罩 .MH頭 small');
    const panel = header && header.closest('.MH面板');
    if (!header || !panel || panel.querySelector('.ISO存檔卡[data-ready="1"]')) return;
    const m = 文字(header.textContent).match(/MCHK-[A-Z]\d+-[A-Za-z0-9_-]+/i);
    if (m && !執行中.has(m[0].toUpperCase())) 啟動(m[0].toUpperCase());
  });
  if (document.body) observer.observe(document.body, {childList:true, subtree:true});
  else document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, {childList:true, subtree:true}), {once:true});

  全域.智慧5S履歷首次載入修復 = Object.freeze({版本, 啟動});
})(window);
