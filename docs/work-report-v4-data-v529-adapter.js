/* 報工作業 V4｜正式主資料庫 v529 對接器 v5.3.0
 * 目的：讓 PWA 報工作業直接吃本次整理後的正式資料庫。
 * 主表：02_產品主檔、08_工站途程機台主檔、05_不良代碼主檔。
 * 輔助：04_工站產品關聯、04_工站機台關聯、04_工站產品工時主檔、04_工站人員關聯、06_照片資料庫。
 * 規則：不產生假產品、不產生假不良原因、不切測試庫；只補齊資料形狀與 ID 格式。
 */
(function () {
  'use strict';

  const 版本 = '530';
  const 標記 = '__報工V4_正式主資料庫v529對接器530__';
  if (window[標記]) return;
  window[標記] = true;

  const 輔助分頁 = {
    工站產品關聯: '04_工站產品關聯',
    工站機台關聯: '04_工站機台關聯',
    工站產品工時主檔: '04_工站產品工時主檔',
    工站人員關聯: '04_工站人員關聯'
  };

  let 已包裝Bridge = false;
  let 已要求重載 = false;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function compact(v) { return clean(v).replace(/\s+/g, ' '); }
  function norm(v) { return clean(v).replace(/,/g, '').replace(/\.0$/, '').replace(/\s+/g, '').toUpperCase(); }
  function keyText(v) { return norm(v).replace(/[()（）]/g, ''); }
  function isArray(v) { return Array.isArray(v); }
  function first(row, keys) {
    row = row || {};
    for (const k of keys) {
      if (row[k] != null && clean(row[k]) !== '') return clean(row[k]);
    }
    return '';
  }
  function uniq(arr) {
    const seen = Object.create(null);
    return (arr || []).map(clean).filter(Boolean).filter(v => {
      const k = norm(v);
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }
  function getRows(data, keys) {
    data = data || {};
    for (const k of keys) {
      const v = data[k];
      if (isArray(v)) return v;
      if (v && isArray(v.rows)) return v.rows;
      if (v && isArray(v.data)) return v.data;
      if (v && isArray(v.資料)) return v.資料;
    }
    return [];
  }
  function setRows(data, keys, rows) {
    keys.forEach(k => { data[k] = rows; });
  }
  function safeNumber(v) {
    const n = Number(clean(v).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function calcStdTime(capacity) {
    const c = safeNumber(capacity);
    if (!c) return '';
    const v = 28800 / c;
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  }
  function splitMachineIds(v) {
    const out = [];
    function add(x) {
      x = clean(x).replace(/,/g, '').replace(/\.0$/, '');
      if (/^\d{1,5}$/.test(x) || /^雷刻機$/i.test(x)) out.push(x);
    }
    if (!v) return out;
    if (isArray(v)) {
      v.forEach(x => {
        if (typeof x === 'object') add(first(x, ['機台編號', '主機台', '設備編號', 'ID', 'id']));
        else splitMachineIds(x).forEach(add);
      });
      return uniq(out);
    }
    const s = clean(v);
    const idMatches = s.match(/ID\s*[:：]\s*([^,，)）\s/]+)/gi) || [];
    idMatches.forEach(m => add(m.replace(/ID\s*[:：]\s*/i, '')));
    s.split(/[、，,;；\/\s]+/).forEach(add);
    return uniq(out);
  }
  function machineListFrom(row, machineRows, machineMaster) {
    const ids = [];
    splitMachineIds(row.機台清單).forEach(x => ids.push(x));
    splitMachineIds(row.機台編號清單).forEach(x => ids.push(x));
    splitMachineIds(row.機台編號).forEach(x => ids.push(x));
    splitMachineIds(row.主機台).forEach(x => ids.push(x));
    (machineRows || []).forEach(r => splitMachineIds(first(r, ['機台編號', '主機台', '設備編號'])).forEach(x => ids.push(x)));
    return uniq(ids).map(id => {
      const m = machineMaster[norm(id)] || {};
      const linked = (machineRows || []).find(r => norm(first(r, ['機台編號', '主機台', '設備編號'])) === norm(id)) || {};
      return {
        機台編號: id,
        主機台: id,
        機台名稱: first(m, ['機台名稱', '設備名稱', '名稱']) || first(linked, ['機台名稱', '設備名稱', '名稱']) || ('機台' + id),
        設備名稱: first(m, ['設備名稱', '機台名稱', '名稱']) || first(linked, ['設備名稱', '機台名稱', '名稱']) || ('機台' + id),
        區域: first(m, ['區域', '廠區', '位置']) || first(linked, ['區域']) || first(row, ['區域']),
        機台型號: first(m, ['機台型號', '型號', '規格']) || first(linked, ['機台型號', '型號']),
        縮圖網址: first(m, ['縮圖網址', '照片網址', '機台照片網址', '圖片網址', 'URL']),
        照片網址: first(m, ['照片網址', '縮圖網址', '機台照片網址', '圖片網址', 'URL']),
        機台照片網址: first(m, ['機台照片網址', '縮圖網址', '照片網址', '圖片網址', 'URL'])
      };
    });
  }
  function routePk(row) { return first(row, ['途程主鍵_PK', '途程主鍵', 'PK', 'routeKey']); }
  function routeMatchKey(row) {
    return [
      first(row, ['產品編號', '料號', '品號']),
      first(row, ['客戶品號', '客戶料號']),
      first(row, ['品名', '產品名稱']),
      first(row, ['順序', '工站順序']),
      first(row, ['工站名稱', '報工工站名稱']),
      first(row, ['工序編號_最終', '工序範圍', '工序'])
    ].map(keyText).join('|');
  }
  function groupBy(rows, fn) {
    const map = Object.create(null);
    (rows || []).forEach(r => {
      const k = fn(r);
      if (!k) return;
      (map[k] = map[k] || []).push(r);
    });
    return map;
  }
  function productKey(row) {
    return [first(row, ['產品編號', '料號', '品號']), first(row, ['客戶品號', '客戶料號'])].map(norm).join('|');
  }
  function productNameKey(row) {
    return [first(row, ['客戶品號', '客戶料號']), first(row, ['品名', '產品名稱'])].map(keyText).join('|');
  }
  function buildProductIndex(products) {
    const byCode = Object.create(null);
    const byCustName = Object.create(null);
    const byName = Object.create(null);
    (products || []).forEach(p => {
      const pid = norm(first(p, ['產品編號', '料號', '品號']));
      const cust = norm(first(p, ['客戶品號', '客戶料號']));
      const name = keyText(first(p, ['品名', '產品名稱']));
      if (pid) byCode[pid] = p;
      if (cust && name) byCustName[cust + '|' + name] = p;
      if (name) byName[name] = p;
    });
    return { byCode, byCustName, byName };
  }
  function fixProductIdByMaster(row, idx) {
    const pidRaw = first(row, ['產品編號', '料號', '品號']);
    const pid = norm(pidRaw);
    const cust = norm(first(row, ['客戶品號', '客戶料號']));
    const name = keyText(first(row, ['品名', '產品名稱']));
    let p = idx.byCode[pid];
    if (!p && cust && name) p = idx.byCustName[cust + '|' + name];
    if (!p && name) p = idx.byName[name];
    if (p) {
      const masterId = clean(first(p, ['產品編號', '料號', '品號']));
      if (masterId) row.產品編號 = masterId;
      row.客戶品號 = first(row, ['客戶品號', '客戶料號']) || first(p, ['客戶品號', '客戶料號']);
      row.品名 = first(row, ['品名', '產品名稱']) || first(p, ['品名', '產品名稱']);
    } else if (pidRaw) {
      row.產品編號 = clean(pidRaw).replace(/,/g, '').replace(/\.0$/, '');
    }
    return row;
  }
  function findTimeRow(route, timeRows) {
    const pid = norm(first(route, ['產品編號']));
    const cust = norm(first(route, ['客戶品號']));
    const station = keyText(first(route, ['工站名稱', '報工工站名稱']));
    const proc = keyText(first(route, ['工序編號_最終', '工序範圍', '工序']));
    return (timeRows || []).find(r => {
      const rp = norm(first(r, ['產品編號', '料號', '品號']));
      const rc = norm(first(r, ['客戶品號', '客戶料號']));
      const rs = keyText(first(r, ['工站名稱', '報工工站名稱']));
      const rop = keyText(first(r, ['工序編號_最終', '工序範圍', '工序']));
      return (!pid || !rp || pid === rp) && (!cust || !rc || cust === rc) && (!station || !rs || station === rs) && (!proc || !rop || proc === rop);
    }) || null;
  }
  function normalizeProducts(products) {
    const map = new Map();
    (products || []).forEach(p => {
      const row = Object.assign({}, p);
      row.產品編號 = clean(first(row, ['產品編號', '料號', '品號'])).replace(/,/g, '').replace(/\.0$/, '');
      row.客戶品號 = clean(first(row, ['客戶品號', '客戶料號']));
      row.品名 = compact(first(row, ['品名', '產品名稱']));
      const cap = first(row, ['8小時標準產能', '8H產能', '標準產能8H', '標準產能']);
      if (cap) row['8小時標準產能'] = clean(cap).replace(/,$/, '');
      if (!first(row, ['標準工時_秒', '標準工時(秒)']) && row['8小時標準產能']) row.標準工時_秒 = calcStdTime(row['8小時標準產能']);
      const key = productKey(row) || row.產品編號 || row.品名;
      if (key && !map.has(key)) map.set(key, row);
    });
    return Array.from(map.values());
  }
  function normalizeRoutes(routes, ctx) {
    const productIndex = buildProductIndex(ctx.products);
    const routeProducts = ctx.routeProducts || [];
    const timeRows = ctx.timeRows || [];
    const routeMachinesByPk = groupBy(ctx.routeMachines || [], routePk);
    const routeMachinesByKey = groupBy(ctx.routeMachines || [], routeMatchKey);
    const machineMaster = Object.create(null);
    (ctx.machines || []).forEach(m => {
      const id = norm(first(m, ['機台編號', '主機台', '設備編號']));
      if (id) machineMaster[id] = m;
    });

    const baseRoutes = (routes && routes.length ? routes : routeProducts).map(r => Object.assign({}, r));
    const out = [];
    const seen = Object.create(null);

    baseRoutes.forEach(r => {
      r = fixProductIdByMaster(r, productIndex);
      r.客戶品號 = first(r, ['客戶品號', '客戶料號']);
      r.品名 = compact(first(r, ['品名', '產品名稱']));
      r.工站名稱 = compact(first(r, ['工站名稱', '報工工站名稱', '工站']));
      r.報工工站名稱 = r.工站名稱;
      r.工序編號_最終 = first(r, ['工序編號_最終', '工序範圍', '工序編號', '工序', 'OP']);
      r.工序範圍 = r.工序編號_最終;
      r.工序 = r.工序編號_最終;
      r.順序 = first(r, ['順序', '工站順序']) || '';
      r.區域 = first(r, ['區域', '廠區', '位置']);
      r.需求人力 = first(r, ['需求人力', '人力', '預設需求人力']);
      r.工序類型 = first(r, ['工序類型', '工站類型']) || inferType(r.工站名稱);
      r.是否入庫點 = first(r, ['是否入庫點']) || (/(清洗|目視|包裝|測試|試漏|全檢|研磨)$/i.test(r.工站名稱) ? '是' : '否');
      r.啟用 = first(r, ['啟用', '是否啟用']) || '是';
      const pk = routePk(r);
      const linkedMachines = (pk && routeMachinesByPk[pk]) || routeMachinesByKey[routeMatchKey(r)] || [];
      const mList = machineListFrom(r, linkedMachines, machineMaster);
      r.機台清單 = mList;
      r.機台編號清單 = mList.map(m => m.機台編號);
      r.機台編號 = r.機台編號清單.join('、');
      r.主機台 = first(r, ['主機台']) || (mList[0] && mList[0].機台編號) || '';
      const timeRow = findTimeRow(r, timeRows);
      const product = productIndex.byCode[norm(r.產品編號)] || productIndex.byCustName[norm(r.客戶品號) + '|' + keyText(r.品名)] || {};
      const cap = first(r, ['8小時標準產能', '8H產能', '標準產能', '標準產能8H']) || first(timeRow, ['8小時標準產能', '8H產能', '標準產能', '標準產能8H']) || first(product, ['8小時標準產能', '8H產能', '標準產能']);
      if (cap) {
        r['8小時標準產能'] = clean(cap).replace(/,$/, '');
        r.標準產能 = r['8小時標準產能'];
      }
      const sec = first(r, ['標準工時_秒', '標準工時(秒)']) || first(timeRow, ['標準工時_秒', '標準工時(秒)']) || first(product, ['標準工時_秒', '標準工時(秒)']) || calcStdTime(cap);
      if (sec) r.標準工時_秒 = clean(sec).replace(/,$/, '');
      r.顯示名稱 = [r.工站名稱, r.工序編號_最終, r.機台編號].filter(Boolean).join('｜');
      const k = [r.產品編號, r.客戶品號, r.品名, r.順序, r.工站名稱, r.工序編號_最終].map(keyText).join('|');
      if (!r.產品編號 || !r.工站名稱 || seen[k]) return;
      seen[k] = true;
      out.push(r);
    });
    return out;
  }
  function inferType(station) {
    station = clean(station);
    if (/委外|外包/.test(station)) return '委外';
    if (/組裝|組立|壓/.test(station)) return '組裝';
    if (/試漏|測試|檢|清洗|目視|包裝|雷射|雕刻/.test(station)) return '檢驗/試漏';
    if (/M\/C|加工|車床|研磨|自動化|銑/.test(station)) return '加工';
    return '一般工序';
  }
  function normalizeMachines(rows) {
    const map = new Map();
    (rows || []).forEach(m => {
      const row = Object.assign({}, m);
      row.機台編號 = clean(first(row, ['機台編號', '主機台', '設備編號'])).replace(/,/g, '').replace(/\.0$/, '');
      row.主機台 = row.機台編號;
      row.機台名稱 = first(row, ['機台名稱', '設備名稱', '名稱']) || ('機台' + row.機台編號);
      row.設備名稱 = first(row, ['設備名稱', '機台名稱', '名稱']) || row.機台名稱;
      if (row.機台編號) map.set(row.機台編號, row);
    });
    return Array.from(map.values());
  }
  function normalizePeople(rows) {
    const map = new Map();
    (rows || []).forEach(p => {
      const row = Object.assign({}, p);
      row.工號 = first(row, ['工號', '員工編號', 'Employee ID', 'employeeId']);
      row.姓名 = first(row, ['姓名', 'Name', '人員名稱']);
      if (row.工號 || row.姓名) map.set(row.工號 || row.姓名, row);
    });
    return Array.from(map.values());
  }
  function normalizeDefects(src) {
    if (!src) return { Z: [], Y: [] };
    if (!isArray(src)) return { Z: src.Z || [], Y: src.Y || [] };
    const out = { Z: [], Y: [] };
    src.forEach(r => {
      const code = first(r, ['不良代碼', '代碼', 'Code', 'code', 'c']);
      const name = first(r, ['不良名稱', '名稱', '不良原因', '中文名稱', 'n']);
      const en = first(r, ['英文名稱', '英文', 'English', 'en']);
      if (!/^([ZY])\d{2,}$/i.test(code)) return;
      const cat = code.charAt(0).toUpperCase();
      out[cat].push({ 代碼: code.toUpperCase(), 名稱: name, 英文名稱: en, 分類: cat });
    });
    return out;
  }
  async function readOptionalSheets() {
    const bridge = window.V4Bridge;
    const result = {};
    if (!bridge || typeof bridge.readSheet !== 'function') return result;
    await Promise.all(Object.keys(輔助分頁).map(async key => {
      try {
        result[key] = await bridge.readSheet(輔助分頁[key]);
      } catch (e) {
        console.warn('[報工V4 v530] 輔助分頁讀取失敗：' + 輔助分頁[key], e);
        result[key] = [];
      }
    }));
    return result;
  }
  async function enrich(data) {
    data = data || {};
    const extra = await readOptionalSheets();
    const people = normalizePeople(getRows(data, ['人員', 'people', '01_人員主檔']));
    const products = normalizeProducts(getRows(data, ['產品', 'products', '02_產品主檔']));
    const machines = normalizeMachines(getRows(data, ['機台', 'machines', '03_機台主檔']));
    const routes = normalizeRoutes(getRows(data, ['報工工站群組', 'routes', '途程工站群組', '08_工站途程機台主檔']), {
      products,
      machines,
      routeProducts: extra.工站產品關聯 || [],
      routeMachines: extra.工站機台關聯 || [],
      timeRows: extra.工站產品工時主檔 || []
    });
    const defects = normalizeDefects(data.不良原因 || data.defects || data['05_不良代碼主檔'] || []);

    setRows(data, ['人員', 'people'], people);
    setRows(data, ['產品', 'products'], products);
    setRows(data, ['機台', 'machines'], machines);
    setRows(data, ['報工工站群組', 'routes', '途程工站群組'], routes);
    data.不良原因 = defects;
    data.defects = defects;
    data.工站產品關聯 = extra.工站產品關聯 || [];
    data.工站機台關聯 = extra.工站機台關聯 || [];
    data.工站產品工時主檔 = extra.工站產品工時主檔 || [];
    data.工站人員關聯 = extra.工站人員關聯 || [];
    data.筆數 = Object.assign({}, data.筆數 || {}, {
      人員: people.length,
      產品: products.length,
      報工工站群組: routes.length,
      工站產品關聯: data.工站產品關聯.length,
      工站機台關聯: data.工站機台關聯.length,
      不良原因: (defects.Z || []).length + (defects.Y || []).length,
      對接版本: 版本
    });
    data.訊息 = 'PWA 已對接正式主資料庫 v529';
    window.HX_WORK_REPORT_DATA_V529 = data.筆數;
    console.info('[報工V4 v530] 正式主資料庫 v529 已對接', data.筆數);
    return data;
  }
  function wrapBridge() {
    const bridge = window.V4Bridge;
    if (!bridge || typeof bridge.loadInit !== 'function') return false;
    if (bridge.__資料庫v529對接530) return true;
    const original = bridge.loadInit.bind(bridge);
    bridge.loadInit = async function () {
      const raw = await original.apply(this, arguments);
      return enrich(raw);
    };
    bridge.__資料庫v529對接530 = true;
    已包裝Bridge = true;
    return true;
  }
  function boot() {
    if (!wrapBridge()) {
      setTimeout(boot, 120);
      return;
    }
    if (!已要求重載 && typeof window.reloadData === 'function') {
      已要求重載 = true;
      setTimeout(function () {
        try { window.reloadData(); } catch (e) { console.warn('[報工V4 v530] 重載資料失敗', e); }
      }, 700);
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js?v=530').catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('load', boot, { once: true });
})();
