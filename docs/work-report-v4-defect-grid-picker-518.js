/* 報工作業 V4｜05_不良代碼主檔兩欄格子選擇器 v5.1.8
 * 目的：取代 iPhone 原生 select，避免未選定就跳回，並以兩欄格子顯示不良原因。
 * 資料來源只允許：05_不良代碼主檔。
 */
(function () {
  'use strict';

  const 版本 = '518';
  const 標記 = '__報工V4_不良原因格子選擇器518__';
  if (window[標記]) return;
  window[標記] = true;

  let 主檔快取 = null;
  let 主檔讀取中 = false;
  let 目前選擇列ID = null;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) { return clean(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function validCode(v) { return /^(Z|Y)\d{2,}$/i.test(clean(v)); }
  function first(obj, keys) {
    obj = obj || {};
    for (const k of keys) if (obj[k] != null && clean(obj[k]) !== '') return clean(obj[k]);
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
    for (const v of valuesOf(r)) {
      if (v === code || v === 'Z' || v === 'Y' || validCode(v)) continue;
      if (/[^\x00-\x7F]/.test(v)) return v;
    }
    return '';
  }
  function enOf(r, code) {
    let en = first(r, ['英文名稱', '英文', 'English', 'english', '英文說明', '英文原因', '不良英文', 'defectNameEn', 'nameEn', 'enName', 'EN', 'en', 'En']);
    if (en && en !== 'Z' && en !== 'Y' && en !== code && !validCode(en)) return en;
    for (const v of valuesOf(r)) {
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
  function parseEmbeddedText(rows) {
    let text = '';
    try { text = JSON.stringify(rows || []); } catch (e) { text = String(rows || ''); }
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
  function normalize(rows) {
    const out = { Z: [], Y: [], __來源: '05_不良代碼主檔', __修復版: 版本 };
    const seen = Object.create(null);
    function add(item) {
      if (!item || !validCode(item.代碼) || seen[item.代碼]) return;
      seen[item.代碼] = true;
      const cat = item.分類 === 'Z' ? 'Z' : 'Y';
      out[cat].push(item);
    }
    if (!Array.isArray(rows)) rows = [];
    rows.forEach(r => {
      r = r || {};
      if (!enabled(r)) return;
      const code = codeOf(r);
      if (!validCode(code)) return;
      add({ 代碼: code, 名稱: nameOf(r, code), 英文名稱: enOf(r, code), 分類: categoryOf(r, code), 來源: '05_不良代碼主檔' });
    });
    parseEmbeddedText(rows).forEach(add);
    out.Z.sort((a, b) => a.代碼.localeCompare(b.代碼, 'zh-Hant'));
    out.Y.sort((a, b) => a.代碼.localeCompare(b.代碼, 'zh-Hant'));
    return out;
  }
  function count(d) { return ((d && d.Z) || []).length + ((d && d.Y) || []).length; }
  function extractRows(res) {
    if (Array.isArray(res)) return res;
    if (!res || typeof res !== 'object') return [];
    let rows = res.資料 || res.data || res.rows || res.records || res.items || res.清單 || res.結果 || [];
    if (rows && rows.rows) rows = rows.rows;
    if (rows && rows.data) rows = rows.data;
    if (rows && rows.資料) rows = rows.資料;
    return Array.isArray(rows) ? rows : [];
  }

  async function 讀取不良主檔() {
    if (主檔讀取中) return 主檔快取 || { Z: [], Y: [], __來源: '05_不良代碼主檔', __修復版: 版本 };
    主檔讀取中 = true;
    let rows = [];
    try {
      if (window.V4Bridge && typeof window.V4Bridge.readSheet === 'function') {
        rows = await window.V4Bridge.readSheet('05_不良代碼主檔');
      }
    } catch (e) {
      console.warn('[報工V4] 讀取 05_不良代碼主檔失敗', e);
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
    主檔快取 = normalize(rows);
    主檔快取.__原始筆數 = rows.length;
    if (window.DB) window.DB.ngReasons = 主檔快取;
    主檔讀取中 = false;
    return 主檔快取;
  }

  function 目前資料() {
    const d = (window.DB && window.DB.ngReasons && window.DB.ngReasons.__修復版 === 版本) ? window.DB.ngReasons : 主檔快取;
    return d || { Z: [], Y: [], __來源: '05_不良代碼主檔', __修復版: 版本 };
  }
  function 找項目(code, cat) {
    const d = 目前資料();
    return ((d[cat] || []).find(x => x.代碼 === code)) || ((d.Z || []).concat(d.Y || []).find(x => x.代碼 === code)) || null;
  }
  function label(row) {
    if (!row || !validCode(row.code)) return '<span class="hx-defect-placeholder">點擊選擇不良原因</span>';
    const item = 找項目(row.code, row.category) || row;
    return `<b>${esc(row.code)}</b><span>${esc(item.名稱 || row.name || '')}</span><small>${esc(item.英文名稱 || row.enName || '')}</small>`;
  }
  function updateNotice() {
    const n = document.getElementById('defectSyncNotice');
    if (!n) return;
    const c = count(目前資料());
    n.innerHTML = c
      ? `<div class="caption">✅ 已同步 05_不良代碼主檔：${c} 筆｜格子選擇器 v${版本}</div>`
      : '<div class="caption" style="color:#b00020;font-weight:900;">⚠️ 未同步 05_不良代碼主檔；此版禁止前端假資料。</div>';
  }

  function injectStyle() {
    if (document.getElementById('hx-defect-grid-style-518')) return;
    const st = document.createElement('style');
    st.id = 'hx-defect-grid-style-518';
    st.textContent = `
      .defect-row{display:grid!important;grid-template-columns:34px minmax(0,1fr) 82px!important;gap:7px!important;align-items:center!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;overflow:hidden!important;margin:8px 0!important}
      .hx-defect-select-btn{width:100%!important;min-width:0!important;border:1px solid #c9d7f5!important;background:#fff!important;border-radius:16px!important;padding:10px 12px!important;text-align:left!important;color:#17233c!important;font-weight:900!important;min-height:54px!important;box-sizing:border-box!important;line-height:1.25!important;display:grid!important;gap:2px!important;box-shadow:0 3px 10px rgba(15,23,42,.06)!important}
      .hx-defect-select-btn b{font-size:17px!important;color:#0b57d0!important}.hx-defect-select-btn span{font-size:14px!important;color:#18243a!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.hx-defect-select-btn small{font-size:11px!important;color:#64748b!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.hx-defect-placeholder{font-size:14px!important;color:#94a3b8!important;font-weight:800!important}.qty-input{width:100%!important;min-width:0!important;text-align:center!important;box-sizing:border-box!important}
      .hx-defect-mask{position:fixed!important;inset:0!important;z-index:2147483000!important;background:rgba(15,23,42,.45)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;padding:12px!important;box-sizing:border-box!important}
      .hx-defect-panel{width:100%!important;max-width:560px!important;max-height:82vh!important;background:rgba(255,255,255,.97)!important;border-radius:28px 28px 22px 22px!important;box-shadow:0 28px 70px rgba(15,23,42,.38)!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.72)!important;display:flex!important;flex-direction:column!important}
      .hx-defect-head{position:sticky!important;top:0!important;z-index:2!important;background:rgba(255,255,255,.94)!important;padding:14px 14px 10px!important;border-bottom:1px solid #e5edf8!important;display:flex!important;gap:10px!important;align-items:center!important;justify-content:space-between!important}.hx-defect-title{font-size:18px!important;font-weight:950!important;color:#12213a!important;line-height:1.2!important}.hx-defect-close{border:0!important;background:#eef3fb!important;color:#334155!important;width:42px!important;height:42px!important;border-radius:14px!important;font-size:24px!important;font-weight:900!important}.hx-defect-body{overflow:auto!important;-webkit-overflow-scrolling:touch!important;padding:12px!important}.hx-defect-section{margin-bottom:14px!important}.hx-defect-section-title{font-size:14px!important;font-weight:950!important;color:#64748b!important;padding:4px 2px 8px!important}.hx-defect-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.hx-defect-card{border:1px solid #d7e3f8!important;background:linear-gradient(180deg,#ffffff,#f7fbff)!important;border-radius:18px!important;padding:11px 10px!important;min-height:96px!important;text-align:left!important;box-shadow:0 6px 16px rgba(30,64,175,.08)!important;display:flex!important;flex-direction:column!important;gap:5px!important;justify-content:flex-start!important}.hx-defect-card:active{transform:scale(.985)!important}.hx-defect-code{font-size:18px!important;font-weight:950!important;color:#0b57d0!important}.hx-defect-name{font-size:15px!important;font-weight:900!important;color:#111827!important;line-height:1.18!important}.hx-defect-en{font-size:12px!important;font-weight:700!important;color:#64748b!important;line-height:1.16!important}.hx-defect-empty{padding:18px!important;border:1px dashed #f2b8b5!important;background:#fff7f7!important;border-radius:18px!important;color:#b00020!important;font-weight:900!important;text-align:center!important}.hx-defect-picked{outline:3px solid rgba(52,168,83,.35)!important;border-color:#34a853!important;background:#f0fff6!important}
      @media(max-width:390px){.hx-defect-grid{gap:8px!important}.hx-defect-card{min-height:90px!important;padding:10px 8px!important}.hx-defect-code{font-size:17px!important}.hx-defect-name{font-size:14px!important}.hx-defect-en{font-size:11px!important}.defect-row{grid-template-columns:32px minmax(0,1fr) 72px!important;gap:6px!important}.hx-defect-panel{max-height:84vh!important}.hx-defect-title{font-size:17px!important}}
    `;
    document.head.appendChild(st);
  }

  function renderRows() {
    injectStyle();
    const container = document.getElementById('defectContainer');
    if (!container || !window.STATE) return;
    if (!window.STATE.defectRows || !window.STATE.defectRows.length) window.STATE.defectRows = [{ id: Date.now(), category: '', code: '', name: '', enName: '', qty: '' }];
    const d = 目前資料();
    if (!count(d)) {
      container.innerHTML = '<div class="defect-summary error" style="display:block;">⚠️ 未同步 05_不良代碼主檔。此版禁止前端假資料，請確認 GAS 有回傳 05_不良代碼主檔。</div>';
      updateNotice();
      return;
    }
    container.innerHTML = window.STATE.defectRows.map(row => `
      <div class="defect-row" id="defectRow_${row.id}">
        <button class="defect-delete-btn ripple" onclick="deleteDefectRow(${row.id})" type="button">✕</button>
        <button class="hx-defect-select-btn ripple" type="button" onclick="開啟不良原因格子(${row.id})">${label(row)}</button>
        <input class="qty-input" type="number" min="0" value="${Number(row.qty) || ''}" inputmode="numeric" placeholder="pcs" onchange="onDefectQtyChange(${row.id},this.value)" oninput="onDefectQtyChange(${row.id},this.value)">
      </div>`).join('');
    updateNotice();
    if (typeof window.updateDefectSummaryDisplay === 'function') window.updateDefectSummaryDisplay();
  }

  function cardHTML(item, cat, currentCode) {
    const picked = currentCode === item.代碼 ? ' hx-defect-picked' : '';
    return `<button type="button" class="hx-defect-card${picked}" onclick="選定不良原因('${esc(item.代碼)}','${cat}')">
      <div class="hx-defect-code">${esc(item.代碼)}</div>
      <div class="hx-defect-name">${esc(item.名稱 || '未命名')}</div>
      <div class="hx-defect-en">${esc(item.英文名稱 || '')}</div>
    </button>`;
  }
  function openPicker(rowId) {
    injectStyle();
    目前選擇列ID = rowId;
    const d = 目前資料();
    const row = (window.STATE && window.STATE.defectRows || []).find(x => Number(x.id) === Number(rowId)) || {};
    let old = document.getElementById('hxDefectPickerMask');
    if (old) old.remove();
    const mask = document.createElement('div');
    mask.id = 'hxDefectPickerMask';
    mask.className = 'hx-defect-mask';
    mask.innerHTML = `<div class="hx-defect-panel" role="dialog" aria-modal="true">
      <div class="hx-defect-head"><div class="hx-defect-title">選擇不良原因<br><span style="font-size:13px;color:#64748b;font-weight:800">05_不良代碼主檔｜兩欄格子</span></div><button class="hx-defect-close" type="button" onclick="關閉不良原因格子()">×</button></div>
      <div class="hx-defect-body">
        ${count(d) ? '' : '<div class="hx-defect-empty">未同步 05_不良代碼主檔，無法選擇。</div>'}
        <div class="hx-defect-section"><div class="hx-defect-section-title">Z 素材 / 外觀類</div><div class="hx-defect-grid">${(d.Z || []).map(x => cardHTML(x, 'Z', row.code)).join('') || '<div class="hx-defect-empty">無 Z 類主檔</div>'}</div></div>
        <div class="hx-defect-section"><div class="hx-defect-section-title">Y 加工 / 尺寸類</div><div class="hx-defect-grid">${(d.Y || []).map(x => cardHTML(x, 'Y', row.code)).join('') || '<div class="hx-defect-empty">無 Y 類主檔</div>'}</div></div>
      </div>
    </div>`;
    mask.addEventListener('click', function (e) { if (e.target === mask) closePicker(); });
    document.body.appendChild(mask);
  }
  function closePicker() {
    const mask = document.getElementById('hxDefectPickerMask');
    if (mask) mask.remove();
  }
  function selectReason(code, cat) {
    if (!window.STATE || !window.STATE.defectRows) return closePicker();
    const item = 找項目(code, cat);
    const row = window.STATE.defectRows.find(x => Number(x.id) === Number(目前選擇列ID));
    if (row && item) {
      row.category = cat;
      row.code = item.代碼;
      row.name = item.名稱 || '';
      row.enName = item.英文名稱 || '';
    }
    closePicker();
    renderRows();
  }

  window.renderDefectRows = renderRows;
  window.updateDefectSyncNotice = updateNotice;
  window.開啟不良原因格子 = openPicker;
  window.關閉不良原因格子 = closePicker;
  window.選定不良原因 = selectReason;
  window.onDefectReasonChange = function (rowId, value) {
    const parts = clean(value).split('|');
    if (parts[0] && parts[1]) {
      目前選擇列ID = rowId;
      selectReason(parts[0], parts[1]);
    }
  };
  window.同步不良原因主檔 = async function () {
    await 讀取不良主檔();
    renderRows();
  };

  function patch() {
    window.renderDefectRows = renderRows;
    window.updateDefectSyncNotice = updateNotice;
  }
  async function boot() {
    patch();
    if (window.DB && window.V4Bridge) await 讀取不良主檔();
    renderRows();
  }
  window.addEventListener('load', function () { setTimeout(boot, 500); setTimeout(boot, 1500); setTimeout(boot, 3000); });
  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('.step-item')) setTimeout(boot, 260); }, true);
  setInterval(function () {
    patch();
    if (window.STATE && window.STATE.currentStep === 3 && !document.getElementById('hxDefectPickerMask')) renderRows();
  }, 1200);
})();
