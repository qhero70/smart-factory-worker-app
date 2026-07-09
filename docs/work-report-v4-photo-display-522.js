/* 報工作業 V4｜人員/產品/機台照片顯示修復器 v5.2.6
 * 正式來源優先序：
 * 1) GAS API：取得照片索引V4 / getPhotoIndexV4 / photoIndexV4
 * 2) 備援：06_照片資料庫 分頁
 * 目標：人員卡、產品卡、已選產品卡、機台卡顯示 Google Drive 照片；沒有照片才顯示小型佔位。
 */
(function () {
  'use strict';

  const 版本 = '526';
  const 標記 = '__報工V4_照片顯示修復526__';
  if (window[標記]) return;
  window[標記] = true;

  let 照片索引 = { 人員: Object.create(null), 產品: Object.create(null), 機台: Object.create(null) };
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
    const keys = ['縮圖網址','照片網址','網頁網址','URL','url','連結','Drive連結','GoogleDrive連結','產品照片網址','機台照片網址','人員照片網址','圖片網址','圖片連結','照片連結','檔案連結','檔案ID','Drive檔案ID','FileID','fileId','imageUrl','ImageURL','圖片','照片','圖檔'];
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
    const raw = clean(row.類型 || row.資料類型 || row.type || row.category || row.照片類型);
    if (/人員|員工|工號|person|staff|operator/i.test(raw)) return '人員';
    if (/機台|設備|machine|equipment/i.test(raw)) return '機台';
    if (/產品|品號|料號|product|part/i.test(raw)) return '產品';
    const text = Object.values(row).map(clean).join(' ');
    if (/人員_|員工|工號|人員|person|staff|operator/i.test(text)) return '人員';
    if (/機台_|設備|機台|machine|equipment/i.test(text)) return '機台';
    if (/產品_|品號|料號|產品|product|part/i.test(text)) return '產品';
    if (row.工號 || row.員工編號 || row.人員編號) return '人員';
    if (row.機台編號 || row.設備編號 || row.主機台) return '機台';
    if (row.產品編號 || row.料號 || row.品號 || row.客戶品號 || row.品名) return '產品';
    return '產品';
  }

  function addKey(keys, v) {
    v = clean(v);
    if (!v) return;
    keys.push(v);
    const n = norm(v);
    if (n) keys.push(n);
    const base = fileBase(v);
    if (base) {
      keys.push(base);
      keys.push(norm(base));
      keys.push(base.replace(/^人員[_-]/, ''));
      keys.push(base.replace(/^產品[_-]/, ''));
      keys.push(base.replace(/^機台[_-]/, ''));
    }
  }

  function keysOf(row, type) {
    row = row || {};
    const keys = [];
    if (type === '人員') {
      ['照片主鍵','對應ID','主鍵值','工號','員工編號','人員編號','姓名','名稱','編號','主鍵','檔名','檔案名稱','文件名稱','圖片名稱','照片名稱','name','Name','title','Title'].forEach(k => addKey(keys, row[k]));
    } else if (type === '機台') {
      ['照片主鍵','對應ID','主鍵值','機台編號','設備編號','主機台','機台名稱','設備名稱','名稱','編號','主鍵','檔名','檔案名稱','文件名稱','圖片名稱','照片名稱','name','Name','title','Title'].forEach(k => addKey(keys, row[k]));
    } else {
      ['照片主鍵','對應ID','主鍵值','產品編號','料號','品號','客戶品號','客戶料號','品名','產品名稱','名稱','編號','主鍵','檔名','檔案名稱','文件名稱','圖片名稱','照片名稱','name','Name','title','Title'].forEach(k => addKey(keys, row[k]));
    }
    Object.values(row).forEach(v => {
      const s = clean(v);
      const b = fileBase(s);
      if (b) addKey(keys, b);
      if (/^\d{1,5}(?:\.0)?$/.test(s)) addKey(keys, s);
      if (/^[A-Z]\d{6,}$/i.test(s)) addKey(keys, s);
      if (/^(fhf|hfs|emp|op|p|m)[-_]?[A-Za-z0-9]+$/i.test(s)) addKey(keys, s);
    });
    return Array.from(new Set(keys.map(norm).filter(Boolean)));
  }

  function addPhoto(type, key, url) {
    const k = norm(key);
    const u = driveThumb(url);
    if (!k || !u || !照片索引[type]) return;
    if (!照片索引[type][k]) 照片索引[type][k] = u;
  }

  function normalizeRowsFromApi(res) {
    if (!res) return [];
    const rows = [];
    const pushRows = (arr, type) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(x => rows.push(Object.assign({}, x || {}, { 類型: type, 資料類型: type })));
    };
    if (res.照片索引) {
      pushRows(res.照片索引.人員 || res.照片索引['人員'] || res.照片索引.people, '人員');
      pushRows(res.照片索引.產品 || res.照片索引['產品'] || res.照片索引.products, '產品');
      pushRows(res.照片索引.機台 || res.照片索引['機台'] || res.照片索引.machines, '機台');
    }
    pushRows(res.人員照片 || res.peoplePhotos || res.personPhotos, '人員');
    pushRows(res.產品照片 || res.productPhotos, '產品');
    pushRows(res.機台照片 || res.machinePhotos, '機台');
    if (Array.isArray(res.資料)) rows.push(...res.資料);
    if (Array.isArray(res.data)) rows.push(...res.data);
    if (Array.isArray(res.rows)) rows.push(...res.rows);
    return rows;
  }

  function buildIndex(rows) {
    const old = 照片索引;
    照片索引 = { 人員: Object.create(null), 產品: Object.create(null), 機台: Object.create(null) };
    (rows || []).forEach(row => {
      row = row || {};
      const url = firstUrl(row);
      if (!url) return;
      const type = typeOf(row);
      keysOf(row, type).forEach(k => addPhoto(type, k, url));
    });
    ['人員','產品','機台'].forEach(type => Object.assign(照片索引[type], old[type] || {}));
  }

  function personKeys(p) {
    p = p || {};
    return [p.照片主鍵, p.對應ID, p.主鍵值, p.工號, p.員工編號, p.人員編號, p.姓名, p.名稱].map(norm).filter(Boolean);
  }
  function productKeys(p) {
    p = p || {};
    return [p.照片主鍵, p.對應ID, p.主鍵值, p.產品編號, p.料號, p.品號, p.客戶品號, p.客戶料號, p.品名, p.產品名稱, p.名稱].map(norm).filter(Boolean);
  }
  function machineKeys(m) {
    m = m || {};
    return [m.照片主鍵, m.對應ID, m.主鍵值, m.機台編號, m.設備編號, m.主機台, m.機台名稱, m.設備名稱, m.名稱].map(norm).filter(Boolean);
  }
  function lookup(type, keys) {
    const bucket = 照片索引[type] || {};
    for (const k of keys || []) if (k && bucket[norm(k)]) return bucket[norm(k)];
    return '';
  }
  function personUrl(p) { return firstUrl(p) || lookup('人員', personKeys(p)); }
  function productUrl(p) { return firstUrl(p) || lookup('產品', productKeys(p)); }
  function machineUrl(m) { return firstUrl(m) || lookup('機台', machineKeys(m)); }

  async function apiPostPhotoIndex() {
    if (!window.V4Bridge || typeof window.V4Bridge.apiPost !== 'function') return null;
    const actions = ['取得照片索引V4', 'getPhotoIndexV4', 'photoIndexV4', 'photoIndex', '讀取照片索引'];
    for (const action of actions) {
      try {
        const res = await window.V4Bridge.apiPost(action, { action: action });
        const rows = normalizeRowsFromApi(res);
        if (rows.length) return { res, rows };
      } catch (e) {
        console.warn('[報工V4] 照片索引 API 失敗：' + action, e);
      }
    }
    return null;
  }

  async function loadPhotos() {
    if (讀取中) return;
    讀取中 = true;
    let rows = [];
    try {
      const api = await apiPostPhotoIndex();
      if (api && api.rows && api.rows.length) rows = api.rows;
    } catch (e) {
      console.warn('[報工V4] 取得照片索引V4 讀取失敗', e);
    }
    if (!rows.length) {
      try {
        if (window.V4Bridge && typeof window.V4Bridge.readSheet === 'function') rows = await window.V4Bridge.readSheet('06_照片資料庫');
      } catch (e) {
        console.warn('[報工V4] 讀取 06_照片資料庫失敗', e);
      }
    }
    if (rows && rows.length) {
      buildIndex(rows);
      已讀取 = true;
      console.info('[報工V4] 照片索引已建立 v' + 版本, {
        人員: Object.keys(照片索引.人員).length,
        產品: Object.keys(照片索引.產品).length,
        機台: Object.keys(照片索引.機台).length
      });
    }
    讀取中 = false;
  }

  function enrichDB() {
    if (!window.DB) return;
    (DB.persons || []).forEach(p => {
      const u = personUrl(p);
      if (u) p.人員照片網址 = p.照片網址 = p.縮圖網址 = p.頭像網址 = u;
    });
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

  function renderPersons() {
    if (!window.DB || !DB.persons) return;
    document.querySelectorAll('.person-card').forEach(card => {
      const idx = Number(card.dataset.index);
      const p = DB.persons[idx];
      if (!p) return;
      const u = personUrl(p);
      const box = card.querySelector('.person-photo, .person-avatar, .person-img, .person-photo-lg');
      if (box) setImgBox(box, u, '👤', p.姓名 || p.工號);
    });
    const op = window.STATE && STATE.operator;
    const disp = byId('selectedPersonDisplay');
    if (op && disp) {
      const u = personUrl(op);
      const box = disp.querySelector('.person-photo-lg');
      if (box) setImgBox(box, u, '👤', op.姓名 || op.工號);
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
    if (document.getElementById('hx-photo-display-526-style')) return;
    const st = document.createElement('style');
    st.id = 'hx-photo-display-526-style';
    st.textContent = `
      .product-card,.machine-card,.person-card{position:relative!important;overflow:hidden!important;background:#0f172a!important}
      .product-thumb img,.machine-card>img,.person-photo img,.person-avatar img,.person-img img,.person-photo-lg img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
      .machine-card>img{position:absolute!important;inset:0!important;z-index:0!important}.product-thumb.has-photo{background:#0f172a!important}.product-card:after,.machine-card:after,.person-card:after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,.03) 0%,rgba(0,0,0,.18) 45%,rgba(0,0,0,.82) 100%);pointer-events:none}.product-name,.product-code,.machine-number,.machine-info,.person-card *{position:relative;z-index:2}.product-name,.product-code,.machine-number,.machine-info{color:#fff!important;text-shadow:0 2px 7px rgba(0,0,0,.9)!important;font-weight:950!important}.machine-no-img{min-height:58px!important;font-size:22px!important;border-radius:14px!important;background:#eef3fb!important;color:#1967d2!important;display:grid!important;place-items:center!important}.hx-photo-mini{font-size:22px!important;display:inline-grid!important;place-items:center!important;width:48px!important;height:48px!important;border-radius:14px!important;background:rgba(238,243,251,.92)!important;color:#1967d2!important;font-weight:900!important}.selected-person-display .person-photo-lg.has-photo{overflow:hidden!important;background:#0f172a!important}
    `;
    document.head.appendChild(st);
  }

  async function refresh(force) {
    injectStyle();
    if ((force || !已讀取) && window.V4Bridge) await loadPhotos();
    enrichDB();
    renderPersons();
    renderProducts();
    renderMachines();
  }

  function patch(name, afterDelay) {
    const fn = window[name];
    if (typeof fn !== 'function' || fn.__photo526) return;
    window[name] = function () {
      const ret = fn.apply(this, arguments);
      setTimeout(() => refresh(false), 0);
      setTimeout(() => refresh(false), afterDelay || 300);
      return ret;
    };
    window[name].__photo526 = true;
  }

  function patchAll() {
    patch('buildPersonGrid', 300);
    patch('renderPersonGrid', 300);
    patch('buildProductGrid', 300);
    patch('renderMachineGrid', 300);
    patch('selectPerson', 300);
    patch('selectProduct', 300);
    patch('onWorkstationChange', 300);
  }

  window.同步產品機台照片 = () => refresh(true);
  window.同步人員產品機台照片 = () => refresh(true);
  window.取得前端照片索引 = () => 照片索引;

  window.addEventListener('load', function () {
    patchAll();
    setTimeout(() => refresh(true), 500);
    setTimeout(() => refresh(false), 1600);
    setTimeout(() => refresh(false), 3600);
  });
  setInterval(function () {
    patchAll();
    if (window.DB && (DB.persons || DB.productList || DB.machines)) refresh(false);
  }, 4500);
})();
