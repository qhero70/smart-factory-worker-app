/*
 * 製一組報工表單 V4｜正式試算表直讀資料橋 v4.3.6
 * 目的：
 * 1. 在 iPhone / Safari 對 GAS fetch 發生 Load failed 時，不再掉到少量保底資料。
 * 2. 直接從正式 Google Sheets 主庫讀：人員、產品、機台、途程、照片、不良代碼。
 * 3. 保留原 V4 HTML / CSS / JS；本檔只攔截初始資料讀取，轉成原 V4 需要的資料格式。
 */
(function(){
  'use strict';

  var VER = 'v4.3.6_sheets_direct_bridge_正式主庫直讀';
  var SPREADSHEET_ID = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';
  var INIT_ACTION_RE = /取得報工作業v2初始資料|action=([^&]*%E5%8F%96%E5%BE%97%E5%A0%B1%E5%B7%A5)/;
  var originalFetch = window.fetch ? window.fetch.bind(window) : null;
  var cache = null;
  var cacheAt = 0;
  var CACHE_MS = 5 * 60 * 1000;

  function log(){ try{ console.log.apply(console, arguments); }catch(e){} }
  function txt(v){ return String(v === undefined || v === null ? '' : v).trim(); }
  function norm(v){ return txt(v).replace(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i,'').replace(/[^A-Za-z0-9\-_一-龥]/g,'').toUpperCase(); }
  function z(n){ return String(n).padStart(2,'0'); }
  function today(){ var d=new Date(); return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); }

  function isInitRequest(input, init){
    var s='';
    try{ s += typeof input === 'string' ? input : ((input && input.url) || ''); }catch(e){}
    try{ s += ' ' + (init && init.body ? String(init.body) : ''); }catch(e){}
    return INIT_ACTION_RE.test(s);
  }

  function scriptJsonp(url, cbName, timeoutMs){
    timeoutMs = timeoutMs || 15000;
    return new Promise(function(resolve, reject){
      var done = false;
      var script = document.createElement('script');
      var timer = setTimeout(function(){
        if(done) return;
        done = true;
        cleanup();
        reject(new Error('Google Sheets 直讀逾時'));
      }, timeoutMs);
      function cleanup(){
        clearTimeout(timer);
        try{ delete window[cbName]; }catch(e){ window[cbName] = undefined; }
        try{ script.remove(); }catch(e){}
      }
      window[cbName] = function(payload){
        if(done) return;
        done = true;
        cleanup();
        resolve(payload);
      };
      script.onerror = function(){
        if(done) return;
        done = true;
        cleanup();
        reject(new Error('Google Sheets script 載入失敗'));
      };
      script.src = url;
      document.head.appendChild(script);
    });
  }

  function gvizUrl(sheetName, tq){
    var cb = '__HX_SHEET_CB_' + Date.now() + '_' + Math.floor(Math.random()*1000000);
    var q = tq || 'select *';
    var url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(SPREADSHEET_ID) + '/gviz/tq'
      + '?sheet=' + encodeURIComponent(sheetName)
      + '&tq=' + encodeURIComponent(q)
      + '&tqx=' + encodeURIComponent('out:json;responseHandler:' + cb)
      + '&_ts=' + Date.now();
    return { url:url, cb:cb };
  }

  function cellValue(cell){
    if(!cell) return '';
    if(cell.f !== undefined && cell.f !== null && String(cell.f).trim() !== '') return cell.f;
    if(cell.v !== undefined && cell.v !== null) return cell.v;
    return '';
  }

  function tableToObjects(payload){
    if(!payload || payload.status === 'error') throw new Error('Google Sheets 回傳錯誤：' + (payload && payload.errors ? JSON.stringify(payload.errors) : 'unknown'));
    var table = payload.table || {};
    var cols = table.cols || [];
    var rows = table.rows || [];
    var headers = [];
    var dataStart = 0;

    // Google Visualization 有時會把第一列當 label，有時第一列仍在 rows 裡；兩者都相容。
    headers = cols.map(function(c){ return txt(c.label || c.id); });
    var headerBad = !headers.length || headers.every(function(h){ return !h || /^A|B|C|D|E|F|G|H|I|J|K$/.test(h); });
    if(headerBad && rows.length){
      headers = (rows[0].c || []).map(function(c){ return txt(cellValue(c)); });
      dataStart = 1;
    }
    if(headers.length && rows.length){
      var first = (rows[0].c || []).map(function(c){ return txt(cellValue(c)); });
      var same = first.length && first.slice(0, headers.length).every(function(v,i){ return v === headers[i]; });
      if(same) dataStart = 1;
    }

    return rows.slice(dataStart).map(function(r, ri){
      var obj = { __列號: ri + dataStart + 1 };
      var cells = r.c || [];
      headers.forEach(function(h, i){ if(h) obj[h] = cellValue(cells[i]); });
      return obj;
    }).filter(function(o){
      return Object.keys(o).some(function(k){ return k !== '__列號' && txt(o[k]) !== ''; });
    });
  }

  function readSheet(sheetName){
    var u = gvizUrl(sheetName, 'select *');
    return scriptJsonp(u.url, u.cb, 18000).then(tableToObjects);
  }

  function pick(o, keys){
    o = o || {};
    for(var i=0;i<keys.length;i++){
      var k = keys[i];
      if(o[k] !== undefined && o[k] !== null && txt(o[k]) !== '') return txt(o[k]);
    }
    return '';
  }

  function splitList(s){
    return txt(s).split(/[、,，;；\s]+/).map(function(x){ return txt(x); }).filter(Boolean);
  }

  function driveThumb(v, size){
    var s = txt(v);
    if(!s) return '';
    if(/^data:image\//i.test(s)) return s;
    var m = s.match(/[-\w]{25,}/);
    if(m) return 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=' + (size || 'w900');
    return s;
  }

  function buildPhotoIndex(photoRows){
    var idx = {};
    function add(key, obj){
      var k = norm(key);
      if(!k) return;
      if(!idx[k]) idx[k] = [];
      idx[k].push(obj);
    }
    (photoRows || []).forEach(function(r){
      if(txt(pick(r,['啟用'])) === '否') return;
      var fileId = pick(r, ['Google檔案ID','檔案ID','fileId','DriveFileID']);
      var url = driveThumb(pick(r, ['縮圖網址','照片網址','圖片網址']) || fileId, 'w900');
      var obj = {
        類型: pick(r, ['照片類型','類型','分類']),
        對應主鍵: pick(r, ['對應主鍵','主鍵','工號','產品編號','機台編號']),
        檔案名稱: pick(r, ['檔案名稱','名稱','filename']),
        Google檔案ID: fileId,
        照片網址: url,
        縮圖網址: url
      };
      if(!obj.照片網址 && !obj.Google檔案ID) return;
      add(obj.對應主鍵, obj);
      add(obj.檔案名稱, obj);
      add(txt(obj.檔案名稱).replace(/\.[^.]+$/,''), obj);
    });
    idx.__筆數 = (photoRows || []).length;
    return idx;
  }

  function findPhoto(idx, keys, typeHint){
    for(var i=0;i<(keys||[]).length;i++){
      var list = idx[norm(keys[i])] || [];
      if(!list.length) continue;
      var hit = list.find(function(x){ return !typeHint || txt(x.類型).indexOf(typeHint) >= 0; }) || list[0];
      return { 照片網址: hit.照片網址 || hit.縮圖網址 || '', 縮圖網址: hit.縮圖網址 || hit.照片網址 || '', Google檔案ID: hit.Google檔案ID || '' };
    }
    return { 照片網址:'', 縮圖網址:'', Google檔案ID:'' };
  }

  function normalizeShift(v){
    var t = txt(v);
    if(!t) return '早班';
    if(t.indexOf('大夜') >= 0 || t.indexOf('夜') >= 0 || /23:?00|03:?15/.test(t)) return '大夜班';
    if(t.indexOf('中') >= 0 || /16:?50/.test(t)) return '中班';
    if(t.indexOf('加班') >= 0) return '加班';
    return '早班';
  }

  function normalizePeople(rows, photoIdx){
    return (rows || []).filter(function(r){ return txt(pick(r,['啟用'])) !== '否'; }).map(function(r){
      var id = pick(r, ['工號','員工編號','員工工號']);
      var name = pick(r, ['姓名','中文名','名字']);
      var ph = findPhoto(photoIdx, [id, name], '人員');
      var direct = driveThumb(pick(r, ['縮圖網址','照片網址','作業員照片網址','頭像網址','大頭照網址','圖片網址','照片']) || pick(r,['Google檔案ID','照片檔案ID','作業員照片檔案ID']), 'w600');
      return {
        工號:id,
        姓名:name,
        部門:pick(r,['部門']),
        組別:pick(r,['組別']),
        職稱:pick(r,['職稱','職位']),
        班別:normalizeShift(pick(r,['班別','班次','工作班別','班別名稱','上班時段'])),
        班別名稱:normalizeShift(pick(r,['班別','班次','工作班別','班別名稱','上班時段'])),
        啟用:pick(r,['啟用']) || '是',
        照片網址: direct || ph.照片網址,
        縮圖網址: direct || ph.縮圖網址,
        Google檔案ID: ph.Google檔案ID,
        條碼:pick(r,['條碼','工牌號','卡號'])
      };
    });
  }

  function normalizeDefects(rows){
    var out = { Z:[], Y:[] };
    (rows || []).forEach(function(r){
      var code = pick(r, ['不良代碼','代碼']);
      var name = pick(r, ['不良名稱','名稱']);
      if(!code || !name) return;
      var cat = pick(r, ['分類','類別']) || code.charAt(0).toUpperCase();
      cat = cat.toUpperCase().indexOf('Y') >= 0 ? 'Y' : 'Z';
      out[cat].push({
        代碼:code,
        名稱:name,
        英文名稱:pick(r,['英文名稱','英文','English','EN']) || englishDefect(code),
        備註:pick(r,['備註'])
      });
    });
    if(!out.Z.length) out.Z = [
      {代碼:'Z01',名稱:'素材裂縫',英文名稱:'Material Crack'},
      {代碼:'Z02',名稱:'加工砂孔',英文名稱:'Sand Porosity'},
      {代碼:'Z03',名稱:'外觀刮傷',英文名稱:'Surface Scratch'}
    ];
    if(!out.Y.length) out.Y = [
      {代碼:'Y01',名稱:'內徑超差',英文名稱:'Inner Diameter Out of Tolerance'},
      {代碼:'Y02',名稱:'外徑超差',英文名稱:'Outer Diameter Out of Tolerance'},
      {代碼:'Y09',名稱:'孔位',英文名稱:'Hole Position'}
    ];
    ['Z','Y'].forEach(function(k){ out[k].sort(function(a,b){ return a.代碼.localeCompare(b.代碼, 'zh-Hant', {numeric:true}); }); });
    return out;
  }

  function englishDefect(code){
    var m = {
      Z01:'Material Crack', Z02:'Sand Porosity', Z03:'Surface Scratch', Z04:'Material Dent', Z05:'Casting Defect',
      Y01:'Inner Diameter Out of Tolerance', Y02:'Outer Diameter Out of Tolerance', Y03:'Length Out of Tolerance',
      Y04:'Surface Roughness', Y05:'Thread Defect', Y06:'Position Out of Tolerance', Y07:'Burr', Y08:'Chamfer Defect', Y09:'Hole Position'
    };
    return m[txt(code).toUpperCase()] || '';
  }

  function makeMachineMap(machineRows, photoIdx){
    var map = {};
    (machineRows || []).forEach(function(r){
      var id = pick(r, ['機台編號','設備編號','編號']);
      if(!id) return;
      var ph = findPhoto(photoIdx, [id, 'MH-'+id, pick(r,['機台名稱','設備名稱'])], '機台');
      var direct = driveThumb(pick(r, ['縮圖網址','照片網址','機台照片網址','圖片網址']) || pick(r,['Google檔案ID','照片檔案ID','機台照片檔案ID']), 'w900');
      map[norm(id)] = {
        機台編號:id,
        設備名稱:pick(r,['機台名稱','設備名稱']) || ('機台' + id),
        機台名稱:pick(r,['機台名稱','設備名稱']) || ('機台' + id),
        區域:pick(r,['區域','廠區','位置']),
        機台型號:pick(r,['型號','機台型號']),
        照片網址:direct || ph.照片網址,
        縮圖網址:direct || ph.縮圖網址,
        Google檔案ID:ph.Google檔案ID
      };
    });
    return map;
  }

  function makeProductMap(productRows, photoIdx){
    var map = {};
    (productRows || []).forEach(function(r){
      var prod = pick(r,['產品編號','品號','料號']);
      var cust = pick(r,['客戶品號','客戶料號']);
      if(!prod && !cust) return;
      var name = pick(r,['品名','產品名稱']);
      var ph = findPhoto(photoIdx, [prod, cust, name], '產品');
      var direct = driveThumb(pick(r, ['縮圖網址','產品縮圖網址','照片網址','產品照片網址','圖片網址','產品圖片網址']) || pick(r,['Google檔案ID','照片檔案ID','產品照片檔案ID']), 'w900');
      var obj = {
        產品編號:prod,
        客戶品號:cust,
        品名:name,
        標準產能:pick(r,['標準產能_班','8小時標準產能','標準產能']),
        標準工時_秒:pick(r,['標準工時_秒']),
        產品照片網址:direct || ph.照片網址,
        產品縮圖網址:direct || ph.縮圖網址,
        產品照片檔案ID:ph.Google檔案ID
      };
      if(prod) map[norm(prod)] = obj;
      if(cust) map[norm(cust)] = obj;
    });
    return map;
  }

  function parseMachineDetails(v){
    var s = txt(v);
    if(!s) return [];
    try{
      var x = JSON.parse(s);
      if(Array.isArray(x)) return x;
      if(x && Array.isArray(x.機台清單)) return x.機台清單;
    }catch(e){}
    return [];
  }

  function normalizeRoutes(routeRows, productMap, machineMap, photoIdx){
    return (routeRows || []).filter(function(r){ return txt(pick(r,['啟用'])) !== '否'; }).map(function(r){
      var prod = pick(r,['產品編號','料號','品號']);
      var cust = pick(r,['客戶品號','客戶料號']);
      var p = productMap[norm(prod)] || productMap[norm(cust)] || {};
      var name = pick(r,['品名','產品名稱']) || p.品名 || '';
      var station = pick(r,['報工工站名稱','工站名稱','建議工站','工站']);
      var op = pick(r,['工序範圍','工序','工序清單','OP','途程順序']);
      var main = pick(r,['主機台','主機台編號','機台編號','建議機台']);
      var ids = splitList(pick(r,['機台編號清單','機台清單','可用機台','區域清單'])) || [];
      if(!ids.length) ids = parseMachineDetails(pick(r,['機台明細JSON'])).map(function(x){ return pick(x,['機台編號','主機台','編號']); }).filter(Boolean);
      if(!ids.length && main) ids = [main];
      var routePhoto = driveThumb(pick(r,['產品縮圖網址','產品照片網址','縮圖網址','照片網址']) || pick(r,['產品照片檔案ID','Google檔案ID']), 'w900');
      var idxPhoto = findPhoto(photoIdx, [prod, cust, name], '產品');
      var productUrl = routePhoto || p.產品縮圖網址 || p.產品照片網址 || idxPhoto.縮圖網址 || idxPhoto.照片網址 || '';
      var machines = ids.map(function(id){
        var m = machineMap[norm(id)] || { 機台編號:id, 設備名稱:'機台' + id, 機台名稱:'機台' + id };
        return {
          機台編號: m.機台編號 || id,
          區域: m.區域 || '',
          機台型號: m.機台型號 || '',
          設備名稱: m.設備名稱 || m.機台名稱 || ('機台' + id),
          機台名稱: m.機台名稱 || m.設備名稱 || ('機台' + id),
          照片網址: m.照片網址 || '',
          縮圖網址: m.縮圖網址 || m.照片網址 || '',
          Google檔案ID: m.Google檔案ID || ''
        };
      });
      return {
        產品編號:prod,
        客戶品號:cust || p.客戶品號 || '',
        品名:name,
        產品照片網址:productUrl,
        產品縮圖網址:productUrl,
        產品照片檔案ID:p.產品照片檔案ID || idxPhoto.Google檔案ID || '',
        工站名稱:station,
        報工工站名稱:station,
        工序:op,
        工序範圍:op,
        工序清單:op ? [op] : [],
        標準產能:pick(r,['標準產能','標準產能_班']) || p.標準產能 || '',
        標準工時_秒:pick(r,['標準工時_秒']) || p.標準工時_秒 || '',
        主機台:main || (machines[0] ? machines[0].機台編號 : ''),
        機台清單:machines,
        顯示名稱:[station, op, main || (machines[0] && machines[0].機台編號)].filter(Boolean).join('｜')
      };
    }).filter(function(g){ return g.產品編號 || g.品名 || g.報工工站名稱; });
  }

  function shiftListFromPeople(people){
    var order = ['早班','中班','大夜班','加班'];
    var seen = {};
    (people || []).forEach(function(p){ if(p.班別) seen[p.班別] = true; });
    order.forEach(function(x){ seen[x] = true; });
    return Object.keys(seen).map(function(x){ return { 名稱:x, 值:x }; });
  }

  function loadFormalData(){
    if(cache && Date.now() - cacheAt < CACHE_MS) return Promise.resolve(cache);
    return Promise.all([
      readSheet('01_人員主檔'),
      readSheet('02_產品主檔'),
      readSheet('03_機台主檔'),
      readSheet('08_工站途程機台主檔'),
      readSheet('05_不良代碼主檔'),
      readSheet('06_照片資料庫')
    ]).then(function(all){
      var peopleRows = all[0], productRows = all[1], machineRows = all[2], routeRows = all[3], defectRows = all[4], photoRows = all[5];
      var photoIdx = buildPhotoIndex(photoRows);
      var people = normalizePeople(peopleRows, photoIdx);
      var productMap = makeProductMap(productRows, photoIdx);
      var machineMap = makeMachineMap(machineRows, photoIdx);
      var routes = normalizeRoutes(routeRows, productMap, machineMap, photoIdx);
      var defects = normalizeDefects(defectRows);
      if(!people.length) throw new Error('正式主庫 01_人員主檔 無可用資料');
      if(!routes.length) throw new Error('正式主庫 08_工站途程機台主檔 無可用資料');
      var data = {
        成功:true, success:true, ok:true,
        版本:VER,
        資料來源:'正式GoogleSheets直讀',
        試算表ID:SPREADSHEET_ID,
        作業日:today(),
        人員:people,
        報工工站群組:routes,
        途程工站群組:routes,
        班別清單:shiftListFromPeople(people),
        異常類型:['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],
        不良原因:defects,
        筆數:{
          人員:people.length,
          產品:productRows.length,
          機台:machineRows.length,
          報工工站群組:routes.length,
          工站機台關聯:routes.length,
          照片索引:photoIdx.__筆數 || photoRows.length,
          不良代碼:(defects.Z.length + defects.Y.length)
        },
        訊息:'正式主庫直讀完成：人員 ' + people.length + ' 筆，途程 ' + routes.length + ' 筆，機台 ' + machineRows.length + ' 筆。'
      };
      cache = data;
      cacheAt = Date.now();
      return data;
    });
  }

  function makeJsonResponse(data){
    return new Response(JSON.stringify(data), { status:200, statusText:'OK', headers:{ 'Content-Type':'application/json;charset=utf-8' } });
  }

  window.fetch = function(input, init){
    if(isInitRequest(input, init)){
      return loadFormalData().then(makeJsonResponse).catch(function(err){
        log('V4 Sheets Direct failed, fallback to original fetch.', err);
        if(originalFetch) return originalFetch(input, init);
        throw err;
      });
    }
    return originalFetch ? originalFetch(input, init) : Promise.reject(new Error('fetch unavailable'));
  };

  window.V4_SHEETS_DIRECT_BRIDGE = {
    版本:VER,
    試算表ID:SPREADSHEET_ID,
    讀取正式資料:loadFormalData,
    清除快取:function(){ cache=null; cacheAt=0; }
  };

  log('V4 Sheets Direct Bridge loaded', VER);
})();