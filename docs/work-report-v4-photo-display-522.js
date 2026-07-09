/* 報工作業 V4｜產品/機台照片顯示修復器 v5.2.2
 * 資料來源：06_照片資料庫 + 02_產品主檔 + 03_機台主檔 + 08_工站途程機台主檔
 * 目標：產品卡、已選產品卡、機台卡顯示 Google Drive 照片；沒有照片才顯示小型佔位。
 */
(function () {
  'use strict';

  const 版本 = '522';
  const 標記 = '__報工V4_照片顯示修復522__';
  if (window[標記]) return;
  window[標記] = true;

  let 照片索引 = { 產品: Object.create(null), 機台: Object.create(null), 人員: Object.create(null) };
  let 讀取中 = false;
  let 已讀取 = false;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) { return clean(v).replace(/\.0$/, '').replace(/\s+/g, '').toUpperCase(); }
  function esc(v) { return clean(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function byId(id) { return document.getElementById(id); }

  function driveThumb(v) {
    let s = clean(v);
    if (!s) return '';
    const urlMatch = s.match(/https?:\/\/[^\s"'<>，,；;|)]+/i);
    if (urlMatch) s = urlMatch[0];
    const id =
      ((s.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || [])[1]) ||
      ((s.match(/[?&]id=([A-Za-z0-9_-]+)/) || [])[1]) ||
      ((s.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/) || [])[1]) ||
      ((s.match(/drive\.google\.com\/uc\?export=view&id=([A-Za-z0-9_-]+)/) || [])[1]) ||
      (!/^https?:/i.test(s) ? ((s.match(/[-_A-Za-z0-9]{20,}/) || [])[0]) : '');
    if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1200';
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function firstUrl(row) {
    row = row || {};
    const keys = ['產品照片網址','機台照片網址','照片網址','縮圖網址','圖片網址','網址','URL','url','連結','Drive連結','GoogleDrive連結','圖片連結','照片連結','檔案連結','檔案ID','FileID','fileId','imageUrl','ImageURL','圖片','照片','圖檔'];
    for (const k of keys) {
      const u = driveThumb(row[k]);
      if (u) return u;
    }
    for (const v of Object.values(row)) {
      const u = driveThumb(v);
      if (u) return u;
    }
    return '';
  }

  function fileBase(v) {
    const s = clean(v);
    if (!s) return '';
    const last = s.split(/[\\/]/).pop().split('?')[0];
    return clean(last.replace(/\.(jpg|jpeg|png|webp|gif|heic)$/i, ''));
  }

  function typeOf(row) {
    row = row || {};
    const text = Object.values(row).map(clean).join(' ').toLowerCase();
    if (/機台|設備|machine|equipment/.test(text)) return '機台';
    if (/產品|品號|料號|product|part/.test(text)) return '產品';
    if (/人員|員工|工號|person|staff|operator/.test(text)) return '人員';
    if (row.機台編號 || row.設備編號 || row.主機台) return '機台';
    if (row.產品編號 || row.料號 || row.品號 || row.客戶品號 || row.品名) return '產品';
    return '產品';
  }

  function keysOf(row, type) {
    row = row || {};
    const keys = [];
    const push = v => { v = clean(v); if (v) keys.push(v); };
    if (type === '機台') {
      ['機台編號','設備編號','主機台','機台名稱','設備名稱','名稱','編號','對應ID','對應編號','主鍵'].forEach(k => push(row[k]));
    } else if (type === '產品') {
      ['產品編號','料號','品號','客戶品號','客戶料號','品名','產品名稱','名稱','編號','對應ID','對應編號','主鍵'].forEach(k => push(row[k]));
    } else {
      ['工號','員工編號','姓名','名稱','編號','對應ID','對應編號','主鍵'].forEach(k => push(row[k]));
    }
    ['檔名','檔案名稱','文件名稱','圖片名稱','照片名稱','name','Name','title','Title'].forEach(k => {
      push(row[k]);
      const b = fileBase(row[k]);
      if (b) push(b);
    });
    Object.values(row).forEach(v => {
      const b = fileBase(v);
      if (b) push(b);
      const s = clean(v);
      if (/^\d{1,5}(?:\.0)?$/.test(s)) push(s);
      if (/^[A-Z]\d{6,}$/i.test(s)) push(s);
    });
    return Array.from(new Set(keys.map(norm).filter(Boolean)));
  }

  function addPhoto(type, key, url) {
    const k = norm(key);
    const u = driveThumb(url);
    if (!k || !u || !照片索引[type]) return;
    if (!照片索引[type][k]) 照片索引[type][k] = u;
  }

  function buildIndex(rows) {
    const idx = { 產品: Object.create(null), 機台: Object.create(null), 人員: Object.create(null) };
    const old = 照片索引;
    照片索引 = idx;
    (rows || []).forEach(row => {
      row = row || {};
      const url = firstUrl(row);
      if (!url) return;
      const type = typeOf(row);
      keysOf(row, type).forEach(k => addPhoto(type, k, url));
    });
    // 保留舊索引，避免短暫重載時照片消失。
    ['產品','機台','人員'].forEach(type => Object.assign(照片索引[type], old[type] || {}));
  }

  function productKeys(p) {
    p = p || {};
    return [p.產品編號, p.料號, p.品號, p.客戶品號, p.客戶料號, p.品名, p.產品名稱, p.名稱].map(norm).filter(Boolean);
  }
  function machineKeys(m) {
    m = m || {};
    return [m.機台編號, m.設備編號, m.主機台, m.機台名稱, m.設備名稱, m.名稱].map(norm).filter(Boolean);
  }
  function lookup(type, keys) {
    const bucket = 照片索引[type] || {};
    for (const k of keys || []) if (k && bucket[norm(k)]) return bucket[norm(k)];
    return '';
  }
  function productUrl(p) { return firstUrl(p) || lookup('產品', productKeys(p)); }
  function machineUrl(m) { return firstUrl(m) || lookup('機台', machineKeys(m)); }

  async function loadPhotos() {
    if (讀取中) return;
    讀取中 = true;
    let rows = [];
    try {
      if (window.V4Bridge && typeof window.V4Bridge.readSheet === 'function') rows = await window.V4Bridge.readSheet('06_照片資料庫');
    } catch (e) {
      console.warn('[報工V4] 讀取 06_照片資料庫失敗', e);
    }
    if (rows && rows.length) {
      buildIndex(rows);
      已讀取 = true;
    }
    讀取中 = false;
  }

  function enrichDB() {
    if (!window.DB) return;
    (DB.products || []).forEach(p => {
      const u = productUrl(p);
      if (u) p.產品照片網址 = p.產品縮圖網址 = p.照片網址 = p.縮圖網址 = u;
    });
    (DB.productList || []).forEach(p => {
      const u = productUrl(p);
      if (u) p.產品照片網址 = p.產品縮圖網址 = p.照片網址 = p.縮圖網址 = u;
    });
    (DB.machines || []).forEach(m => {
      const u = machineUrl(m);
      if (u) m.機台照片網址 = m.照片網址 = m.縮圖網址 = u;
    });
    (DB.workstationGroups || []).forEach(gr => {
      const pu = productUrl(gr);
      if (pu) gr.產品照片網址 = gr.產品縮圖網址 = gr.照片網址 = gr.縮圖網址 = pu;
      (gr.機台清單 || []).forEach(m => {
        const u = machineUrl(m) || lookup('機台', [m.機台編號, m.主機台]);
        if (u) m.機台照片網址 = m.照片網址 = m.縮圖網址 = u;
      });
    });
  }

  function setImgBox(box, url, icon, alt) {
    if (!box) return;
    const u = driveThumb(url);
    if (u) {
      box.innerHTML = '<img src="' + esc(u) + '" alt="' + esc(alt || '照片') + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<span class=hx-photo-mini>' + icon + '</span>\'">';
      box.classList.add('has-photo');
    } else {
      box.innerHTML = '<span class="hx-photo-mini">' + icon + '</span>';
      box.classList.remove('has-photo');
    }
  }

  function renderProducts() {
    if (!window.DB || !DB.productList) return;
    document.querySelectorAll('.product-card').forEach(card => {
      const p = DB.productList[Number(card.dataset.index)];
      if (!p) return;
      const u = productUrl(p);
      const box = card.querySelector('.product-thumb');
      setImgBox(box, u, '📦', p.品名 || p.產品編號);
    });
    const selected = window.STATE && STATE.currentProductGroup;
    const disp = byId('selectedProductDisplay');
    if (selected && disp) {
      const u = productUrl(selected);
      const box = disp.querySelector('.person-photo-lg');
      if (box) setImgBox(box, u, '📦', selected.品名 || selected.產品編號);
    }
  }

  function renderMachines() {
    if (!window.STATE) return;
    const gr = STATE.currentWorkstation || {};
    const list = gr.機台清單 || [];
    document.querySelectorAll('.machine-card').forEach(card => {
      const id = clean(card.dataset.id || card.querySelector('.machine-number')?.textContent || '');
      const m = list.find(x => clean(x.機台編號) === id) || (DB.machines || []).find(x => clean(x.機台編號) === id) || { 機台編號: id };
      const u = machineUrl(m) || lookup('機台', [id]);
      let img = card.querySelector('img');
      let no = card.querySelector('.machine-no-img');
      if (u) {
        if (no) no.remove();
        if (!img) {
          img = document.createElement('img');
          card.insertBefore(img, card.firstChild);
        }
        img.src = u;
        img.loading = 'lazy';
        img.alt = '機台' + id;
        img.onerror = function () { this.outerHTML = '<div class="machine-no-img"><span class="hx-photo-mini">⚙</span></div>'; };
        card.classList.add('has-photo');
      } else if (!img && no) {
        no.innerHTML = '<span class="hx-photo-mini">⚙</span>';
        no.classList.remove('big-no-photo');
      }
    });
  }

  function injectStyle() {
    if (document.getElementById('hx-photo-display-522-style')) return;
    const st = document.createElement('style');
    st.id = 'hx-photo-display-522-style';
    st.textContent = `
      .product-card,.machine-card{position:relative!important;overflow:hidden!important;background:#0f172a!important}
      .product-thumb img,.machine-card>img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;position:absolute!important;inset:0!important;z-index:0!important}
      .product-thumb.has-photo{background:#0f172a!important}.product-card:after,.machine-card:after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,.03) 0%,rgba(0,0,0,.18) 45%,rgba(0,0,0,.82) 100%);pointer-events:none}.product-name,.product-code,.machine-number,.machine-info{position:relative!important;z-index:2!important;color:#fff!important;text-shadow:0 2px 7px rgba(0,0,0,.9)!important;font-weight:950!important}.machine-no-img{min-height:58px!important;font-size:22px!important;border-radius:14px!important;background:#eef3fb!important;color:#1967d2!important;display:grid!important;place-items:center!important}.hx-photo-mini{font-size:22px!important;display:inline-grid!important;place-items:center!important;width:48px!important;height:48px!important;border-radius:14px!important;background:rgba(238,243,251,.92)!important;color:#1967d2!important;font-weight:900!important}.selected-person-display .person-photo-lg img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}.selected-person-display .person-photo-lg.has-photo{overflow:hidden!important;background:#0f172a!important}
    `;
    document.head.appendChild(st);
  }

  async function refresh() {
    injectStyle();
    if (!已讀取 && window.V4Bridge) await loadPhotos();
    enrichDB();
    renderProducts();
    renderMachines();
  }

  const oldBuildProductGrid = window.buildProductGrid;
  if (typeof oldBuildProductGrid === 'function' && !oldBuildProductGrid.__photo522) {
    window.buildProductGrid = function () {
      const ret = oldBuildProductGrid.apply(this, arguments);
      setTimeout(refresh, 0);
      setTimeout(refresh, 300);
      return ret;
    };
    window.buildProductGrid.__photo522 = true;
  }
  const oldRenderMachineGrid = window.renderMachineGrid;
  if (typeof oldRenderMachineGrid === 'function' && !oldRenderMachineGrid.__photo522) {
    window.renderMachineGrid = function () {
      const ret = oldRenderMachineGrid.apply(this, arguments);
      setTimeout(refresh, 0);
      setTimeout(refresh, 300);
      return ret;
    };
    window.renderMachineGrid.__photo522 = true;
  }
  const oldSelectProduct = window.selectProduct;
  if (typeof oldSelectProduct === 'function' && !oldSelectProduct.__photo522) {
    window.selectProduct = function () {
      const ret = oldSelectProduct.apply(this, arguments);
      setTimeout(refresh, 0);
      setTimeout(refresh, 300);
      return ret;
    };
    window.selectProduct.__photo522 = true;
  }
  const oldOnWorkstation = window.onWorkstationChange;
  if (typeof oldOnWorkstation === 'function' && !oldOnWorkstation.__photo522) {
    window.onWorkstationChange = function () {
      const ret = oldOnWorkstation.apply(this, arguments);
      setTimeout(refresh, 0);
      setTimeout(refresh, 300);
      return ret;
    };
    window.onWorkstationChange.__photo522 = true;
  }

  window.同步產品機台照片 = refresh;
  window.addEventListener('load', function () {
    setTimeout(refresh, 600);
    setTimeout(refresh, 1800);
    setTimeout(refresh, 3600);
  });
  setInterval(function () {
    if (window.DB && (DB.productList || DB.machines)) refresh();
  }, 4500);
})();
