/* 報工作業 V4 PWA Bridge v5.1.1｜Safari 語法修復版 */
(function () {
  'use strict';

  const 設定 = window.PWA_CONFIG || {};
  const 正式主資料庫ID = 設定.SPREADSHEET_ID || '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  const 正式GAS網址 = (設定.GAS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ/exec').trim();
  const 逾時毫秒 = Number(設定.API_TIMEOUT_MS || 20000);

  const 工作表清單 = {
    people: '01_人員主檔',
    products: '02_產品主檔',
    machines: '03_機台主檔',
    routes: '08_工站途程機台主檔',
    defects: '05_不良代碼主檔',
    photos: '06_照片資料庫'
  };

  let 初始化快取 = null;

  function 文字(值) { return String(值 == null ? '' : 值).trim(); }
  function 正規編號(值) { return 文字(值).replace(/\.0$/, ''); }
  function 小寫(值) { return 文字(值).toLowerCase(); }
  function 取值(列, 欄位清單) {
    列 = 列 || {};
    for (const 欄位 of 欄位清單) {
      if (列[欄位] != null && 文字(列[欄位]) !== '') return 文字(列[欄位]);
    }
    return '';
  }
  function 唯一清單(陣列) {
    const 已有 = Object.create(null);
    return (陣列 || []).map(正規編號).filter(Boolean).filter(function (值) {
      if (已有[值]) return false;
      已有[值] = true;
      return true;
    });
  }
  function 切機台清單(值) {
    const 分隔 = new RegExp('[、,，;；/\\s]+');
    return 唯一清單(文字(值).split(分隔).filter(function (項目) {
      return /^\d{1,5}(?:\.0)?$/.test(文字(項目));
    }));
  }
  function 今天日期() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function 成功回應(資料) { return !!(資料 && (資料.ok === true || 資料.成功 === true || 資料.success === true)); }
  function 有初始化資料(資料) {
    if (!資料) return false;
    return !!((資料.人員 || 資料.people || []).length ||
      (資料.產品 || 資料.products || []).length ||
      (資料.機台 || 資料.machines || []).length ||
      (資料.報工工站群組 || 資料.routes || 資料.途程工站群組 || []).length);
  }
  function 逾時(毫秒) {
    return new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error('API 逾時 ' + 毫秒 + 'ms')); }, 毫秒);
    });
  }
  function 抓文字(url, options, ms) {
    return Promise.race([fetch(url, options).then(function (r) { return r.text(); }), 逾時(ms || 15000)]);
  }
  function 建立表單內容(動作, 資料) {
    const payload = Object.assign({
      spreadsheetId: 正式主資料庫ID,
      正式主資料庫ID: 正式主資料庫ID,
      主資料庫ID: 正式主資料庫ID,
      action: 動作,
      動作: 動作,
      _ts: String(Date.now())
    }, 資料 || {});
    const params = new URLSearchParams();
    Object.keys(payload).forEach(function (key) {
      const value = payload[key];
      if (value != null) params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
    const json = JSON.stringify(payload);
    params.set('payload', json);
    params.set('資料', json);
    params.set('json', json);
    return params.toString();
  }
  async function apiPost(動作, 資料) {
    if (!正式GAS網址) throw new Error('尚未設定 GAS_WEB_APP_URL');
    const url = new URL(正式GAS網址);
    url.searchParams.set('action', 動作);
    url.searchParams.set('動作', 動作);
    url.searchParams.set('_ts', Date.now());
    url.searchParams.set('spreadsheetId', 正式主資料庫ID);
    const text = await 抓文字(url.toString(), {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 建立表單內容(動作, 資料)
    }, 逾時毫秒);
    try {
      return JSON.parse(text);
    } catch (e) {
      return { 成功: false, success: false, 訊息: 'GAS 回傳不是 JSON', 原始回應: 文字(text).slice(0, 600) };
    }
  }

  function 圖片網址(值) {
    let s = 文字(值);
    if (!s) return '';
    const urlMatch = s.match(/https?:\/\/[^\s"'<>，,；;|)]+/i);
    if (urlMatch) s = urlMatch[0];
    const driveId =
      ((s.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || [])[1]) ||
      ((s.match(/[?&]id=([A-Za-z0-9_-]+)/) || [])[1]) ||
      ((s.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/) || [])[1]) ||
      (!/^https?:/i.test(s) ? ((s.match(/[-_A-Za-z0-9]{20,}/) || [])[0]) : '');
    if (driveId) return 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w1200';
    return /^https?:\/\//i.test(s) ? s : '';
  }
  function 第一網址(值) {
    if (!值) return '';
    if (Array.isArray(值)) return 第一網址(值.find(Boolean));
    if (typeof 值 === 'object') return 第一網址(Object.values(值).find(Boolean));
    const 分段 = 文字(值).split(/[\n,，;；|]+/).map(圖片網址).filter(Boolean);
    return 分段[0] || 圖片網址(值) || '';
  }
  function 照片類型(值, 列) {
    const t = 文字(值);
    列 = 列 || {};
    if (t.includes('人') || /person|people|operator|staff/i.test(t) || 列.工號 || 列.員工編號 || 列.姓名) return '人員';
    if (t.includes('機') || t.includes('設備') || /machine|equipment/i.test(t) || 列.機台編號 || 列.設備編號 || 列.主機台) return '機台';
    if (t.includes('產') || t.includes('品') || /product|part/i.test(t) || 列.產品編號 || 列.料號 || 列.客戶品號 || 列.品名) return '產品';
    return '產品';
  }
  function 建立照片索引(照片列) {
    const 索引 = { 人員: Object.create(null), 產品: Object.create(null), 機台: Object.create(null) };
    function 加入(類型, key, url) {
      const k = 正規編號(key);
      const u = 第一網址(url);
      if (!索引[類型] || !k || !u) return;
      索引[類型][k] = 索引[類型][k] || u;
      索引[類型][小寫(k)] = 索引[類型][小寫(k)] || u;
    }
    (照片列 || []).forEach(function (列) {
      列 = 列 || {};
      const 值清單 = Object.values(列);
      const 類型 = 照片類型(取值(列, ['類型', '照片類型', '分類', '資料類型', '主檔類型', '對應類型', '照片用途', '照片主鍵']), 列);
      let url = 取值(列, ['縮圖網址', '照片網址', '圖片網址', '網址', 'URL', 'url', '連結', 'Drive連結', 'GoogleDrive連結', '圖片連結', '照片連結', '檔案連結', '檔案ID', 'FileID', 'fileId', 'imageUrl', 'ImageURL', '圖片', '照片', '圖檔']);
      if (!url) url = 值清單.find(function (v) { return 第一網址(v); }) || '';
      [
        取值(列, ['對應ID', '對應編號', '主鍵', '編號', '工號', '員工編號', '產品編號', '料號', '品號', '客戶品號', '客戶料號', '機台編號', '設備編號', '主機台']),
        取值(列, ['品名', '產品名稱', '機台名稱', '設備名稱', '姓名', '名稱']),
        值清單[1], 值清單[2], 值清單[3]
      ].filter(Boolean).forEach(function (key) { 加入(類型, key, url); });
    });
    return 索引;
  }
  function 找照片(照片索引, 類型, keys) {
    const bucket = 照片索引[類型] || {};
    for (const key of (keys || [])) {
      const k = 正規編號(key);
      if (k && bucket[k]) return bucket[k];
      if (k && bucket[小寫(k)]) return bucket[小寫(k)];
    }
    return '';
  }

  function 不良列(列) {
    列 = 列 || {};
    return {
      代碼: 取值(列, ['不良代碼', '代碼', 'Code', 'code', '不良原因代碼', '原因代碼']),
      名稱: 取值(列, ['不良名稱', '名稱', '不良原因', 'Reason', 'reason', '中文名稱', '中文', '說明']),
      英文名稱: 取值(列, ['英文名稱', '英文', 'English', 'english', '英文說明', '英文原因', 'EN', 'enName']),
      責任歸屬: 取值(列, ['責任歸屬', '責任', '責任單位']),
      分類: 取值(列, ['分類', '類別', '不良分類', '責任類型']),
      啟用: 取值(列, ['啟用', '是否啟用', '使用狀態']) || '是'
    };
  }
  function 正規不良(資料) {
    if (資料 && typeof 資料 === 'object' && !Array.isArray(資料) && (資料.Z || 資料.Y)) {
      return {
        Z: (資料.Z || []).map(不良列).filter(function (x) { return x.代碼 || x.名稱; }),
        Y: (資料.Y || []).map(不良列).filter(function (x) { return x.代碼 || x.名稱; })
      };
    }
    const out = { Z: [], Y: [] };
    (Array.isArray(資料) ? 資料 : []).forEach(function (列) {
      if (文字(取值(列, ['啟用', '是否啟用', '使用狀態'])) === '否') return;
      const d = 不良列(列);
      if (!d.代碼 && !d.名稱) return;
      let 分類 = (d.分類 || 文字(d.代碼).slice(0, 1) || 'Y').toUpperCase();
      if (分類 !== 'Z' && 分類 !== 'Y') 分類 = 文字(d.代碼).toUpperCase().startsWith('Z') ? 'Z' : 'Y';
      d.分類 = 分類;
      out[分類].push(d);
    });
    return out;
  }
  function 不良筆數(資料) {
    const d = 正規不良(資料);
    return (d.Z || []).length + (d.Y || []).length;
  }

  function 好品名(品名, 產品編號) {
    const n = 文字(品名);
    return !!(n && !/^產品_\d+$/i.test(n) && n !== 產品編號 && n !== '無品名');
  }
  function 建產品索引(產品列) {
    const map = Object.create(null);
    (產品列 || []).forEach(function (p) {
      if (p.產品編號) map[p.產品編號] = p;
      if (p.客戶品號) map[p.客戶品號] = p;
      if (p.品名) map[p.品名] = p;
    });
    return map;
  }
  function 正規人員(rows, photoIndex) {
    return (rows || []).map(function (p) {
      const id = 正規編號(取值(p, ['工號', '員工編號', 'Employee ID', 'employeeId']));
      const name = 取值(p, ['姓名', 'Name', '人員名稱']);
      const url = 第一網址(取值(p, ['照片網址', '縮圖網址', '圖片網址', '頭像網址', '人員照片', '照片', '圖片', 'URL'])) || 找照片(photoIndex, '人員', [id, name]);
      return Object.assign({}, p, { 工號: id, 姓名: name, 班別: 取值(p, ['班別', '班別名稱']) || '早班', 啟用: 取值(p, ['啟用', '是否啟用']) || '是', 照片網址: url, 縮圖網址: url });
    }).filter(function (p) { return (p.工號 || p.姓名) && p.啟用 !== '否'; });
  }
  function 正規產品(rows, photoIndex) {
    return (rows || []).map(function (p) {
      const id = 正規編號(取值(p, ['產品編號', '料號', '品號', 'productCode']));
      const cust = 正規編號(取值(p, ['客戶品號', '客戶料號', 'customerPartNo']));
      const name = 取值(p, ['品名', '產品名稱', 'productName']);
      const url = 第一網址(取值(p, ['產品照片網址', '產品縮圖網址', '照片網址', '縮圖網址', '圖片網址', '產品圖片', '產品照片', '圖片', '照片', '圖檔', 'URL', 'url', 'Drive連結', 'GoogleDrive連結', '檔案ID'])) || 找照片(photoIndex, '產品', [id, cust, name]);
      return Object.assign({}, p, { 產品編號: id, 客戶品號: cust, 品名: name, 產品照片網址: url, 產品縮圖網址: url, 照片網址: url, 縮圖網址: url });
    }).filter(function (p) { return p.產品編號 && 好品名(p.品名, p.產品編號); });
  }
  function 正規機台(rows, photoIndex) {
    return (rows || []).map(function (m) {
      const id = 正規編號(取值(m, ['機台編號', '主機台', '設備編號', 'machineId']));
      const name = 取值(m, ['機台名稱', '設備名稱', '名稱', 'machineName']) || ('機台' + id);
      const url = 第一網址(取值(m, ['機台照片網址', '照片網址', '縮圖網址', '圖片網址', '機台圖片', '機台照片', '設備照片', '圖片', '照片', '圖檔', 'URL', 'url', 'Drive連結', 'GoogleDrive連結', '檔案ID'])) || 找照片(photoIndex, '機台', [id, name]);
      return Object.assign({}, m, { 機台編號: id, 主機台: id, 機台名稱: name, 設備名稱: name, 區域: 取值(m, ['區域', '廠區', '位置']), 機台型號: 取值(m, ['機台型號', '型號', '規格']), 照片網址: url, 縮圖網址: url, 機台照片網址: url });
    }).filter(function (m) { return m.機台編號; });
  }
  function 建機台索引(machines) {
    const map = Object.create(null);
    (machines || []).forEach(function (m) {
      map[m.機台編號] = m;
      if (m.設備名稱) map[m.設備名稱] = m;
      if (m.機台名稱) map[m.機台名稱] = m;
    });
    return map;
  }
  function 途程機台清單(route, machineIndex, photoIndex) {
    let idList = [];
    idList = idList.concat(切機台清單(取值(route, ['機台清單', '機台編號清單', '可選機台', '可用機台', '機台列表'])));
    idList = idList.concat(切機台清單([取值(route, ['機台編號', '主機台', '主機台編號', '設備編號']), 取值(route, ['機台/型號/詳情'])].filter(Boolean).join('、')));
    return 唯一清單(idList).map(function (id) {
      const m = machineIndex[id] || {};
      const name = m.機台名稱 || m.設備名稱 || ('機台' + id);
      const url = m.照片網址 || m.縮圖網址 || m.機台照片網址 || 找照片(photoIndex, '機台', [id, name]) || '';
      return { 機台編號: id, 主機台: id, 機台名稱: name, 設備名稱: name, 區域: m.區域 || 取值(route, ['區域']) || '', 機台型號: m.機台型號 || m.型號 || '', 照片網址: url, 縮圖網址: url, 機台照片網址: url };
    });
  }
  function 正規途程(rows, products, machines, photoIndex) {
    const productIndex = 建產品索引(products);
    const machineIndex = 建機台索引(machines);
    return (rows || []).map(function (r) {
      const pid = 正規編號(取值(r, ['產品編號', '料號', '品號']));
      if (!pid) return null;
      const p = productIndex[pid] || {};
      let name = 取值(r, ['品名', '產品名稱']) || p.品名 || '';
      if (!好品名(name, pid)) name = p.品名 || '';
      const station = 取值(r, ['報工工站名稱', '工站名稱', '工站', '工序名稱']);
      if (!station) return null;
      const proc = 取值(r, ['工序範圍', '工序編號_最終', '工序編號', '工序', 'OP', '作業順序']);
      const machinesForRoute = 途程機台清單(r, machineIndex, photoIndex);
      const cust = 取值(r, ['客戶品號', '客戶料號']) || p.客戶品號 || '';
      const productPhoto = 第一網址(取值(r, ['產品照片網址', '產品縮圖網址', '照片網址', '縮圖網址', '圖片網址', '產品圖片', '產品照片', '圖片', '照片', '圖檔'])) || p.產品照片網址 || p.照片網址 || 找照片(photoIndex, '產品', [pid, cust, name]) || '';
      return Object.assign({}, r, {
        產品編號: pid,
        客戶品號: cust,
        品名: name,
        報工工站名稱: station,
        工站名稱: station,
        工序範圍: proc,
        工序: proc,
        主機台: (machinesForRoute[0] && machinesForRoute[0].機台編號) || '',
        機台編號: machinesForRoute.map(function (x) { return x.機台編號; }).join('、'),
        機台編號清單: machinesForRoute.map(function (x) { return x.機台編號; }),
        機台清單: machinesForRoute,
        產品照片網址: productPhoto,
        產品縮圖網址: productPhoto,
        照片網址: productPhoto,
        縮圖網址: productPhoto,
        顯示名稱: [station, proc, machinesForRoute.map(function (x) { return x.機台編號; }).join('、')].filter(Boolean).join('｜')
      });
    }).filter(Boolean);
  }
  function 建產品清單(routes, products, photoIndex) {
    const map = new Map();
    (routes || []).forEach(function (route) {
      const key = route.產品編號 + '|' + route.品名;
      if (!map.has(key)) map.set(key, route);
    });
    (products || []).forEach(function (p) {
      const key = p.產品編號 + '|' + p.品名;
      if (!map.has(key)) {
        const url = p.產品照片網址 || p.照片網址 || 找照片(photoIndex, '產品', [p.產品編號, p.客戶品號, p.品名]) || '';
        map.set(key, Object.assign({}, p, { 報工工站名稱: '', 工站名稱: '', 產品照片網址: url, 產品縮圖網址: url }));
      }
    });
    return Array.from(map.values()).sort(function (a, b) { return 文字(a.品名).localeCompare(文字(b.品名), 'zh-Hant'); });
  }

  function 取陣列(data, keys) {
    data = data || {};
    for (const k of keys) {
      const v = data[k];
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.rows)) return v.rows;
      if (v && Array.isArray(v.data)) return v.data;
      if (v && Array.isArray(v.資料)) return v.資料;
    }
    return [];
  }
  function 拆資料(raw) {
    raw = raw || {};
    return {
      people: 取陣列(raw, ['people', '人員', '01_人員主檔']),
      products: 取陣列(raw, ['products', '產品', '02_產品主檔']),
      machines: 取陣列(raw, ['machines', '機台', '03_機台主檔']),
      routes: 取陣列(raw, ['routes', '報工工站群組', '途程工站群組', '08_工站途程機台主檔']),
      defects: raw.不良原因 || raw.defects || raw.不良原因主檔 || raw.不良代碼主檔 || raw['05_不良代碼主檔'] || [],
      photos: 取陣列(raw, ['photos', '照片資料庫', '照片', '06_照片資料庫'])
    };
  }
  function 合併列(baseRows, sheetRows, keyList) {
    const map = new Map();
    (baseRows || []).forEach(function (r) {
      const key = keyList.map(function (k) { return 正規編號(r[k]); }).find(Boolean) || JSON.stringify(r);
      map.set(key, r);
    });
    (sheetRows || []).forEach(function (r) {
      const key = keyList.map(function (k) { return 正規編號(r[k]); }).find(Boolean) || JSON.stringify(r);
      map.set(key, Object.assign({}, map.get(key) || {}, r));
    });
    return Array.from(map.values());
  }
  function 合併資料(base, sheets) {
    const a = 拆資料(base || {});
    const b = 拆資料(sheets || {});
    return {
      people: 合併列(a.people, b.people, ['工號', '員工編號', 'Employee ID']),
      products: 合併列(a.products, b.products, ['產品編號', '料號', '品號']),
      machines: 合併列(a.machines, b.machines, ['機台編號', '設備編號', '主機台']),
      routes: 合併列(a.routes, b.routes, ['產品編號', '料號', '品號', '工站名稱', '報工工站名稱', '工序範圍', '工序編號_最終']),
      defects: 不良筆數(b.defects) > 0 ? b.defects : a.defects,
      photos: [].concat(a.photos || [], b.photos || [])
    };
  }
  function 正規化(raw) {
    const r = 拆資料(raw || {});
    const photoIndex = 建立照片索引(r.photos);
    const people = 正規人員(r.people, photoIndex);
    const products = 正規產品(r.products, photoIndex);
    const machines = 正規機台(r.machines, photoIndex);
    const routes = 正規途程(r.routes, products, machines, photoIndex);
    const defects = 正規不良(r.defects);
    const productList = 建產品清單(routes, products, photoIndex);
    return {
      成功: true,
      success: true,
      人員: people,
      people: people,
      產品: products,
      products: products,
      機台: machines,
      machines: machines,
      報工工站群組: routes,
      routes: routes,
      途程工站群組: routes,
      產品清單: productList,
      productList: productList,
      不良原因: defects,
      defects: defects,
      班別清單: (raw || {}).班別清單 || [{ 名稱: '早班', 值: '早班' }, { 名稱: '中班', 值: '中班' }, { 名稱: '大夜班', 值: '大夜班' }],
      異常類型: (raw || {}).異常類型 || ['無異常', '支援調度', '材質異常', '換刀', '機台停機', '待料', '品質確認', '其他'],
      筆數: { 人員: people.length, 產品: productList.length, 機台: machines.length, 報工工站群組: routes.length, 不良原因: 不良筆數(defects), 照片資料庫: r.photos.length },
      訊息: '正式主資料庫讀取完成'
    };
  }

  async function 讀取GViz分頁(sheetName) {
    const url = 'https://docs.google.com/spreadsheets/d/' + 正式主資料庫ID + '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(sheetName) + '&_ts=' + Date.now();
    const text = await 抓文字(url, { cache: 'no-store' }, 9000);
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('讀不到分頁：' + sheetName);
    const data = JSON.parse(text.slice(start, end + 1));
    const heads = (data.table.cols || []).map(function (col, i) { return 文字(col.label || col.id || ('欄' + (i + 1))); });
    return (data.table.rows || []).map(function (row) {
      const obj = {};
      (row.c || []).forEach(function (cell, i) {
        if (heads[i]) obj[heads[i]] = cell ? (cell.f !== undefined ? cell.f : cell.v) : '';
      });
      return obj;
    }).filter(function (obj) { return Object.values(obj).some(function (v) { return 文字(v) !== ''; }); });
  }
  function 從GAS回應取列(res) {
    if (Array.isArray(res)) return res;
    if (!res || typeof res !== 'object') return [];
    const candidates = [res.資料, res.data, res.rows, res.records, res.items, res.清單, res.結果];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      if (c && Array.isArray(c.rows)) return c.rows;
      if (c && Array.isArray(c.data)) return c.data;
      if (c && Array.isArray(c.資料)) return c.資料;
    }
    return [];
  }
  async function 讀取GAS分頁(sheetName) {
    const actions = ['讀取主資料庫分頁', '讀取工作表資料', '讀取分頁資料', '取得工作表資料', '取得分頁資料', 'getSheetRows', 'readSheet', 'sheetRows'];
    for (const action of actions) {
      try {
        const res = await apiPost(action, { sheet: sheetName, sheetName: sheetName, 工作表名稱: sheetName, 分頁名稱: sheetName, mode: 'readSheet' });
        const rows = 從GAS回應取列(res);
        if (rows.length) return rows;
      } catch (e) {
        console.warn('[V4] GAS 分頁讀取失敗', sheetName, action, e);
      }
    }
    return [];
  }
  async function readSheet(sheetName) {
    try {
      const rows = await 讀取GViz分頁(sheetName);
      if (rows.length) return rows;
    } catch (e) {
      console.warn('[V4] GViz 分頁讀取失敗', sheetName, e);
    }
    return await 讀取GAS分頁(sheetName);
  }
  async function loadSheets() {
    const raw = {};
    for (const key of Object.keys(工作表清單)) {
      raw[key] = await readSheet(工作表清單[key]);
    }
    raw['05_不良代碼主檔'] = raw.defects || [];
    raw['06_照片資料庫'] = raw.photos || [];
    return raw;
  }
  async function loadByGviz() {
    return 正規化(await loadSheets());
  }
  async function loadInit() {
    if (初始化快取) return 初始化快取;
    const actions = (設定.API_ACTIONS && 設定.API_ACTIONS.INIT) || ['取得報工作業V4初始資料', 'getWorkReportV4Init', 'init'];
    let last = null;
    for (const action of actions) {
      try {
        const res = await apiPost(action, { mode: 'init', 補齊分頁: ['05_不良代碼主檔', '06_照片資料庫', '02_產品主檔', '03_機台主檔', '08_工站途程機台主檔'] });
        last = res;
        if (成功回應(res) && 有初始化資料(res)) {
          let sheets = null;
          try { sheets = await loadSheets(); } catch (e) { console.warn('[V4] 分頁補齊失敗', e); }
          初始化快取 = 正規化(sheets ? 合併資料(res, sheets) : res);
          return 初始化快取;
        }
      } catch (e) {
        last = e;
        console.warn('[V4] GAS 初始化失敗', action, e);
      }
    }
    try {
      初始化快取 = await loadByGviz();
      return 初始化快取;
    } catch (e) {
      throw (last instanceof Error ? last : e);
    }
  }
  async function submitReport(payload) {
    const actions = (設定.API_ACTIONS && 設定.API_ACTIONS.SUBMIT) || ['submitWorkReportV4', '寫入報工作業V4'];
    let last = null;
    for (const action of actions) {
      try {
        const res = await apiPost(action, payload);
        last = res;
        if (res && (res.ok === true || res.成功 === true || res.success === true || res.reportId || res.報工編號)) return res;
      } catch (e) {
        last = e;
      }
    }
    if (last instanceof Error) throw last;
    return last || { 成功: false, success: false, 訊息: '報工送出失敗' };
  }

  window.V4Bridge = {
    loadInit: loadInit,
    submitReport: submitReport,
    apiPost: apiPost,
    today: 今天日期,
    SS: 正式主資料庫ID,
    GAS_URL: 正式GAS網址,
    readSheet: readSheet,
    loadByGviz: loadByGviz,
    loadSheets: loadSheets
  };
})();
