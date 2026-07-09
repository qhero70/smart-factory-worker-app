/* 報工作業 V4｜05_不良代碼主檔正式對接修復 v5.1.5
 * 支援正式欄位與舊主檔簡寫欄位：不良代碼/代碼/code/defectCode/c、名稱/name/n、英文/nameEn/en。
 */
(function () {
  'use strict';

  const 修復標記 = '__報工V4_不良主檔修復515__';
  if (window[修復標記]) return;
  window[修復標記] = true;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) { return clean(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function first(obj, keys) {
    obj = obj || {};
    for (const k of keys) {
      if (obj[k] != null && clean(obj[k]) !== '') return clean(obj[k]);
    }
    return '';
  }
  function codeOf(r) { return first(r, ['不良代碼', '不良代號', '代碼', 'Code', 'code', 'defectCode', 'DefectCode', '不良原因代碼', '原因代碼', 'c', 'C']); }
  function nameOf(r) { return first(r, ['不良名稱', '名稱', '不良原因', 'Reason', 'reason', '中文名稱', '中文', '說明', 'defectName', 'name', 'Name', 'n', 'N']); }
  function enOf(r) { return first(r, ['英文名稱', '英文', 'English', 'english', '英文說明', '英文原因', '不良英文', 'defectNameEn', 'nameEn', 'enName', 'EN', 'en', 'En']); }
  function enabled(r) {
    const v = first(r, ['啟用', '是否啟用', '使用狀態', 'active', 'Active']) || '是';
    return v !== '否' && v.toLowerCase() !== 'false' && v !== '停用';
  }
  function categoryOf(r, code) {
    let c = first(r, ['分類', '類別', '不良分類', '責任類型', '責任歸屬', 'category', 'group']) || code.charAt(0);
    c = clean(c).toUpperCase();
    if (c.indexOf('加工') >= 0 || c.indexOf('尺寸') >= 0) return 'Y';
    if (c.indexOf('素材') >= 0 || c.indexOf('外觀') >= 0) return 'Z';
    if (c !== 'Z' && c !== 'Y') c = clean(code).toUpperCase().startsWith('Z') ? 'Z' : 'Y';
    return c;
  }

  function normalizeDefects(rows) {
    const out = { Z: [], Y: [] };
    if (!Array.isArray(rows)) rows = [];
    rows.forEach(r => {
      r = r || {};
      if (!enabled(r)) return;
      const code = codeOf(r);
      if (!code) return;
      const cat = categoryOf(r, code);
      out[cat].push({
        代碼: code,
        名稱: nameOf(r),
        英文名稱: enOf(r),
        分類: cat,
        來源: '05_不良代碼主檔'
      });
    });
    out.Z.sort((a, b) => a.代碼.localeCompare(b.代碼, 'zh-Hant'));
    out.Y.sort((a, b) => a.代碼.localeCompare(b.代碼, 'zh-Hant'));
    return out;
  }

  function countDefects(d) {
    d = d || { Z: [], Y: [] };
    return (d.Z || []).length + (d.Y || []).length;
  }

  function extractRows(res) {
    if (Array.isArray(res)) return res;
    if (!res || typeof res !== 'object') return [];
    let rows = res.資料 || res.data || res.rows || res.records || res.items || res.清單 || res.結果 || [];
    if (rows && rows.rows) rows = rows.rows;
    if (rows && rows.data) rows = rows.data;
    if (rows && rows.資料) rows = rows.資料;
    return Array.isArray(rows) ? rows : [];
  }

  async function forceLoadDefectMaster() {
    if (!window.DB) return { Z: [], Y: [] };
    if (countDefects(window.DB.ngReasons) > 0 && window.DB.ngReasons.__來源 === '05_不良代碼主檔') return window.DB.ngReasons;

    let rows = [];
    if (window.V4Bridge && typeof window.V4Bridge.readSheet === 'function') {
      try { rows = await window.V4Bridge.readSheet('05_不良代碼主檔'); } catch (e) { console.warn('[V4] 讀取 05_不良代碼主檔失敗', e); }
    }
    if ((!rows || !rows.length) && window.V4Bridge && typeof window.V4Bridge.apiPost === 'function') {
      const actions = ['讀取主資料庫分頁', '讀取工作表資料', '讀取分頁資料', '取得工作表資料', '取得分頁資料', 'getSheetRows', 'readSheet', 'sheetRows', '讀取分頁'];
      for (const action of actions) {
        try {
          const res = await window.V4Bridge.apiPost(action, { sheet: '05_不良代碼主檔', sheetName: '05_不良代碼主檔', 工作表名稱: '05_不良代碼主檔', 分頁名稱: '05_不良代碼主檔' });
          rows = extractRows(res);
          if (rows.length) break;
        } catch (e) {}
      }
    }

    const normalized = normalizeDefects(rows);
    normalized.__來源 = '05_不良代碼主檔';
    normalized.__原始筆數 = rows.length;
    window.DB.ngReasons = normalized;
    return normalized;
  }

  function optionHTML(list, cat) {
    return (list || []).map(x => {
      const label = [x.代碼, x.名稱, x.英文名稱].filter(Boolean).join('｜');
      return `<option value="${esc(x.代碼 + '|' + cat)}">${esc(label)}</option>`;
    }).join('');
  }

  function updateNotice() {
    const n = document.getElementById('defectSyncNotice');
    if (!n || !window.DB) return;
    const c = countDefects(window.DB.ngReasons);
    n.innerHTML = c
      ? `<div class="caption">✅ 已同步 05_不良代碼主檔：${c} 筆</div>`
      : '<div class="caption" style="color:#b00020;font-weight:900;">⚠️ 未讀到 05_不良代碼主檔，請確認 GAS 有回傳該分頁</div>';
  }

  function renderMasterRows() {
    const container = document.getElementById('defectContainer');
    if (!container || !window.STATE || !window.DB) return;
    if (!window.STATE.defectRows || !window.STATE.defectRows.length) window.STATE.defectRows = [{ id: Date.now(), category: '', code: '', name: '', enName: '', qty: 0 }];

    const zList = (window.DB.ngReasons && window.DB.ngReasons.Z) || [];
    const yList = (window.DB.ngReasons && window.DB.ngReasons.Y) || [];
    const total = zList.length + yList.length;

    if (!total) {
      container.innerHTML = '<div class="defect-summary error" style="display:block;">⚠️ 未同步 05_不良代碼主檔。此版本已禁止使用前端假資料，請檢查 GAS 初始化 API 是否回傳 05_不良代碼主檔。</div>';
      updateNotice();
      return;
    }

    const zOpts = optionHTML(zList, 'Z');
    const yOpts = optionHTML(yList, 'Y');
    container.innerHTML = window.STATE.defectRows.map(row => `
      <div class="defect-row" id="defectRow_${row.id}">
        <button class="defect-delete-btn ripple" onclick="deleteDefectRow(${row.id})" type="button">✕</button>
        <select style="flex:2;min-width:0;width:100%;" onchange="onDefectReasonChange(${row.id},this.value)">
          <option value="">── 選擇不良原因 / Select Defect Reason ──</option>
          <optgroup label="Z 素材 / 外觀類">${zOpts}</optgroup>
          <optgroup label="Y 加工 / 尺寸類">${yOpts}</optgroup>
        </select>
        <input class="qty-input" type="number" min="0" value="${Number(row.qty) || ''}" inputmode="numeric" placeholder="pcs" onchange="onDefectQtyChange(${row.id},this.value)" oninput="onDefectQtyChange(${row.id},this.value)">
      </div>`).join('');

    window.STATE.defectRows.forEach(row => {
      if (!row.code) return;
      const sel = document.querySelector(`#defectRow_${row.id} select`);
      if (sel) sel.value = row.code + '|' + row.category;
    });
    updateNotice();
    if (typeof window.updateDefectSummaryDisplay === 'function') window.updateDefectSummaryDisplay();
  }

  function patchMainFunctions() {
    window.renderDefectRows = renderMasterRows;
    window.updateDefectSyncNotice = updateNotice;
  }

  async function syncAndRender() {
    patchMainFunctions();
    await forceLoadDefectMaster();
    renderMasterRows();
    updateNotice();
  }

  window.同步不良原因主檔 = syncAndRender;

  window.addEventListener('load', function () {
    setTimeout(syncAndRender, 500);
    setTimeout(syncAndRender, 1400);
    setTimeout(syncAndRender, 3000);
  });

  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.step-item')) setTimeout(syncAndRender, 250);
  }, true);

  setInterval(function () {
    if (window.STATE && window.STATE.currentStep === 3) syncAndRender();
  }, 2500);
})();
