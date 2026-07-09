/* 報工作業 V4｜不良原因原生下拉強制攔截 v5.2.0
 * 目的：徹底阻止 iPhone Safari 開啟原生 select 滾輪。
 * 行為：把 defectContainer 內舊的 select 直接替換成格子選擇按鈕；所有 select 的 touch/click/focus 都阻止預設行為。
 */
(function () {
  'use strict';

  const 版本 = '520';
  const 標記 = '__報工V4_不良原生下拉強制攔截520__';
  if (window[標記]) return;
  window[標記] = true;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function esc(v) { return clean(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function validCode(v) { return /^(Z|Y)\d{2,}$/i.test(clean(v)); }

  function 載入519() {
    if (window.開啟不良原因格子) return;
    if (document.getElementById('hx-defect-grid-picker-519')) return;
    const s = document.createElement('script');
    s.id = 'hx-defect-grid-picker-519';
    s.src = './work-report-v4-defect-grid-picker-519.js?v=520';
    s.defer = true;
    document.head.appendChild(s);
  }

  function 取得列ID(el) {
    const row = el && el.closest && el.closest('.defect-row');
    if (row && row.id) {
      const m = row.id.match(/defectRow_(\d+)/);
      if (m) return Number(m[1]);
    }
    if (window.STATE && Array.isArray(window.STATE.defectRows)) {
      const rows = Array.from(document.querySelectorAll('#defectContainer .defect-row'));
      const idx = rows.indexOf(row);
      if (idx >= 0 && window.STATE.defectRows[idx]) return window.STATE.defectRows[idx].id;
    }
    return window.STATE && window.STATE.defectRows && window.STATE.defectRows[0] ? window.STATE.defectRows[0].id : Date.now();
  }

  function 找列(rowId) {
    return (window.STATE && Array.isArray(window.STATE.defectRows) ? window.STATE.defectRows : []).find(x => Number(x.id) === Number(rowId));
  }

  function 主檔項目(code, cat) {
    const d = window.DB && window.DB.ngReasons ? window.DB.ngReasons : null;
    if (!d) return null;
    return ((d[cat] || []).find(x => x.代碼 === code)) || ((d.Z || []).concat(d.Y || []).find(x => x.代碼 === code)) || null;
  }

  function 顯示文字(rowId) {
    const row = 找列(rowId) || {};
    if (!row || !validCode(row.code)) return '<span class="hx-defect-placeholder">點擊選擇不良原因</span>';
    const item = 主檔項目(row.code, row.category) || row;
    return `<b>${esc(row.code)}</b><span>${esc(item.名稱 || row.name || '')}</span><small>${esc(item.英文名稱 || row.enName || '')}</small>`;
  }

  function 打開(rowId) {
    載入519();
    const doOpen = function () {
      if (window.開啟不良原因格子) window.開啟不良原因格子(rowId);
    };
    doOpen();
    setTimeout(doOpen, 80);
    setTimeout(doOpen, 220);
  }

  function 建按鈕(rowId) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hx-defect-select-btn ripple';
    btn.setAttribute('data-hx-row-id', String(rowId));
    btn.innerHTML = 顯示文字(rowId);
    const handler = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
      打開(rowId);
      return false;
    };
    btn.addEventListener('pointerdown', handler, true);
    btn.addEventListener('touchstart', handler, { capture: true, passive: false });
    btn.addEventListener('click', handler, true);
    return btn;
  }

  function 強制替換Select() {
    const c = document.getElementById('defectContainer');
    if (!c) return;
    載入519();
    c.querySelectorAll('select').forEach(sel => {
      const rowId = 取得列ID(sel);
      const btn = 建按鈕(rowId);
      sel.dataset.hxNativeSelectBlocked = '1';
      sel.blur();
      sel.replaceWith(btn);
    });
    c.querySelectorAll('.hx-defect-select-btn').forEach(btn => {
      const rowId = Number(btn.getAttribute('data-hx-row-id') || 取得列ID(btn));
      btn.innerHTML = 顯示文字(rowId);
    });
  }

  function 攔截原生Select事件(e) {
    const t = e.target;
    if (!t || !t.closest) return;
    const sel = t.closest('#defectContainer select');
    if (!sel) return;
    const rowId = 取得列ID(sel);
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    sel.blur();
    強制替換Select();
    打開(rowId);
    return false;
  }

  ['pointerdown', 'touchstart', 'mousedown', 'click', 'focus'].forEach(type => {
    document.addEventListener(type, 攔截原生Select事件, { capture: true, passive: false });
  });

  function boot() {
    載入519();
    強制替換Select();
  }

  window.addEventListener('load', function () {
    setTimeout(boot, 200);
    setTimeout(boot, 900);
    setTimeout(boot, 1800);
    setTimeout(boot, 3200);
  });

  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('.step-item')) setTimeout(boot, 180);
  }, true);

  setInterval(function () {
    if (window.STATE && window.STATE.currentStep === 3 && !document.getElementById('hxDefectPickerMask')) boot();
  }, 700);
})();
