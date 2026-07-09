/* 報工作業 V4｜05_不良代碼主檔正式對接修復 v5.1.6
 * 修復重點：Z/Y 只能當分類，不可當代碼；只允許 Z01/Y01 類正式代碼進選單。
 * 支援欄位表格式，也支援 const defects = { Z:[{c,n,en}], Y:[{c,n,en}] } 文字格式。
 */
(function () {
  'use strict';

  const 修復標記 = '__報工V4_不良主檔修復516__';
  if (window[修復標記]) return;
  window[修復標記] = true;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) { return clean(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function validCode(v) { return /^(Z|Y)\d{2,}$/i.test(clean(v)); }
  function first(obj, keys) {
    obj = obj || {};
    for (const k of keys) {
      if (obj[k] != null && clean(obj[k]) !== '') return clean(obj[k]);
    }
    return '';
  }
  function valuesOf(row) {
    if (Array.isArray(row)) return row.map(clean).filter(Boolean);
    if (!row || typeof row !== 'object') return [clean(row)].filter(Boolean);
    return Object.values(row).map(clean).filter(Boolean);
  }
  function findCodeInValues(row) {
    const values = valuesOf(row);
    for (const v of values) {
      const m = v.match(/\b([ZY]\d{2,})\b/i);
      if (m) return m[1].toUpperCase();
    }
    return '';
  }
  function codeOf(r) {
    let c = first(r, ['不良代碼', '不良代號', '代碼', 'Code', 'code', 'defectCode', 'DefectCode', '不良原因代碼', '原因代碼', 'c', 'C']);
    if (!validCode(c)) c = findCodeInValues(r);
    return validCode(c) ? clean(c).toUpperCase() : '';
  }
  function nameOf(r, code) {
    let n = first(r, ['不良名稱', '名稱', '不良原因', 'Reason', 'reason', '中文名稱', '中文', '說明', 'defectName', 'name', 'Name', 'n', 'N']);
    if (n && n !== 'Z' && n !== 'Y' && n !== code && !validCode(n)) return n;
    const values = valuesOf(r);
    for (const v of values) {
      if (v === code || v === 'Z' || v === 'Y' || validCode(v)) continue;
      if (/[^\x00-\x7F]/.test(v)) return v;
    }
    return '';
  }
  function enOf(r, code) {
    let en = first(r, ['英文名稱', '英文', 'English', 'english', '英文說明', '英文原因', '不良英文', 'defectNameEn', 'nameEn', 'enName', 'EN', 'en', 'En']);
    if (en && en !== 'Z' && en !== 'Y' && en !== code && !validCode(en)) return en;
    const values = valuesOf(r);
    for (const v of values) {
      if (v === code || v === 'Z' || v === 'Y' || validCode(v)) continue;
      if (/^[A-Za-z0-9 ._()\-/]+$/.test(v) && /[A-Za-z]/.test(v)) return v;
    }
    return '';
  }
  function enabled(r) {
    const v = first(r, ['啟用', '是否啟用', '使用狀態', 'active', 'Active']) || '是';
    return v !== '否' && v.toLowerCase() !== 'false' && v !== '停用';
  }
  function categoryOf(r, code) {
    let c = first(r, ['分類', '類別', '不良分類', '責任類型', '責任歸屬', 'category', 'group']);
    c = clean(c).toUpperCase();
    if (c.indexOf('加工') >= 0 || c.indexOf('尺寸') >= 0) return 'Y';
    if (c.indexOf('素材') >= 0 || c.indexOf('外觀') >= 0) return 'Z';
    return clean(code).toUpperCase().startsWith('Z') ? 'Z' : 'Y';
  }
  function flattenText(rows) {
    try { return JSON.stringify(rows || []); } catch (e) { return String(rows || ''); }
  }
  function parseEmbeddedText(rows) {
    const text = flattenText(rows);
    const found = [];
    const seen = Object.create(null);
    const re = /[\{,\s]c\s*[:=]\s*['"]?([ZY]\d{2,})['"]?\s*,\s*n\s*[:=]\s*['"]([^'"]*)['"]\s*,\s*en\s*[:=]\s*['"]([^'"]*)['"]/gi;
    let m;
    while ((m = re.exec(text))) {
      const code = clean(m[1]).toUpperCase();
      if (!validCode(code) || seen[code]) continue;
      seen[code] = true;
      found.push({ 代碼: code, 名稱: clean(m[2]), 英文名稱: clean(m[3]), 分類: code.startsWith('Z') ? 'Z' : 'Y', 來源: '05_不良代碼主檔' });
    }
    return found;
  }
  function addItem(out, item, seen) {
    if (!item || !validCode(item.代碼) || seen[item.代碼]) return;
    seen[item.代碼] = true;
    const cat = item.分類 === 'Z' ? 'Z' : 'Y';
    out[cat].push(item);
  }
  function normalizeDefects(rows) {
    const out = { Z: [], Y: [] };
    const seen = Object.create(null);
    if (!Array.isArray(rows)) rows = [];

    rows.forEach(r => {
      r = r || {};
      if (!enabled(r)) return;
      const code = codeOf(r);
      if (!validCode(code)) return;
      const cat = categoryOf(r, code);
      addItem(out, { 代碼: code, 名稱: nameOf(r, code), 英文名稱: enOf(r, code), 分類: cat, 來源: '05_不良代碼主檔' }, seen);
    });

    parseEmbeddedText(rows).forEach(item => addItem(out, item, seen));

    out.Z.sort((a, b) => a.代碼.localeCompare(b.代碼, 'zh-Hant'));
    out.Y.sort((a, b) => a.代碼.localeCompare(b.代碼, 'zh-Hant'));
    return out;
  }

  function countDefects(d) { d = d || { Z: [], Y: [] }; return (d.Z || []).length + (d.Y || []).length; }
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
    if (countDefects(window.DB.ngReasons) > 0 && window.DB.ngReasons.__來源 === '05_不良代碼主檔' && window.DB.ngReasons.__修復版 === '516') return window.DB.ngReasons;

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
    normalized.__修復版 = '516';
    normalized.__原始筆數 = rows.length;
    window.DB.ngReasons = normalized;
    return normalized;
  }

  function optionHTML(list, cat) {
    return (list || []).filter(x => validCode(x.代碼)).map(x => {
      const label = [x.代碼, x.名稱, x.英文名稱].filter(Boolean).join('｜');
      return `<option value="${esc(x.代碼 + '|' + cat)}">${esc(label)}</option>`;
    }).join('');
  }
  function updateNotice() {
    const n = document.getElementById('defectSyncNotice');
    if (!n || !window.DB) return;
    const c = countDefects(window.DB.ngReasons);
    n.innerHTML = c ? `<div class="caption">✅ 已同步 05_不良代碼主檔：${c} 筆</div>` : '<div class="caption" style="color:#b00020;font-weight:900;">⚠️ 未讀到 05_不良代碼主檔，請確認 GAS 有回傳該分頁</div>';
  }
  function renderMasterRows() {
    const container = document.getElementById('defectContainer');
    if (!container || !window.STATE || !window.DB) return;
    if (!window.STATE.defectRows || !window.STATE.defectRows.length) window.STATE.defectRows = [{ id: Date.now(), category: '', code: '', name: '', enName: '', qty: 0 }];

    const zList = ((window.DB.ngReasons && window.DB.ngReasons.Z) || []).filter(x => validCode(x.代碼));
    const yList = ((window.DB.ngReasons && window.DB.ngReasons.Y) || []).filter(x => validCode(x.代碼));
    const total = zList.length + yList.length;
    if (!total) {
      container.innerHTML = '<div class="defect-summary error" style="display:block;">⚠️ 未同步 05_不良代碼主檔。此版本已禁止使用前端假資料，且禁止把 Z/Y 分類當成不良代碼。</div>';
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
      if (!validCode(row.code)) return;
      const sel = document.querySelector(`#defectRow_${row.id} select`);
      if (sel) sel.value = row.code + '|' + row.category;
    });
    updateNotice();
    if (typeof window.updateDefectSummaryDisplay === 'function') window.updateDefectSummaryDisplay();
  }
  function patchMainFunctions() { window.renderDefectRows = renderMasterRows; window.updateDefectSyncNotice = updateNotice; }
  async function syncAndRender() { patchMainFunctions(); await forceLoadDefectMaster(); renderMasterRows(); updateNotice(); }
  window.同步不良原因主檔 = syncAndRender;
  window.addEventListener('load', function () { setTimeout(syncAndRender, 400); setTimeout(syncAndRender, 1200); setTimeout(syncAndRender, 2600); });
  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('.step-item')) setTimeout(syncAndRender, 250); }, true);
  setInterval(function () { if (window.STATE && window.STATE.currentStep === 3) syncAndRender(); }, 2500);
})();
