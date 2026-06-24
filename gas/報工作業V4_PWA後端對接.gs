/**
 * 報工作業V4_PWA後端對接.gs
 * 智慧製造中央作戰指揮中心｜製造部智慧製造應用總部
 * 版本：v4.2.0_backend_dispatch_report_write
 *
 * 正式用途：
 * 1. 給 GitHub Pages / PWA 報工作業 V4 寫入正式主庫。
 * 2. 寫入 09_報工。
 * 3. 有派班時同步 20_今日派班 = 已報工。
 * 4. 有工單時同步 10_工單主檔：已報工數量 / 剩餘數量 / 狀態。
 * 5. 有不良時同步 09_不良紀錄。
 *
 * 接入方式：
 * 既有 doGet(e) / doPost(e) 主路由最前面加：
 * var r = 報工作業V4_PWA_嘗試處理動作_(e); if (r) return r;
 */

var 報工作業V4_正式主庫ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';
var 報工作業V4_時區_ = 'Asia/Taipei';

var 報工作業V4_報工表_ = '09_報工';
var 報工作業V4_不良表_ = '09_不良紀錄';
var 報工作業V4_派班表_ = '20_今日派班';
var 報工作業V4_工單表_ = '10_工單主檔';
var 報工作業V4_人員表_ = '01_人員主檔';
var 報工作業V4_途程表_ = '08_工站途程機台主檔';

var 報工作業V4_報工欄位_ = [
  '報工編號','時間戳','作業日','派班編號','來源需求編號','工單編號','工號','姓名','班別',
  '產品編號','客戶品號','品名','工站名稱','機台編號','今日共做數','產出數量','不良數量','實際良品數',
  '開始時間','結束時間','實際工時','狀態','備註','更新時間'
];

var 報工作業V4_不良欄位_ = [
  '不良紀錄編號','時間戳','報工編號','派班編號','工單編號','來源需求編號','工號','姓名','班別',
  '產品編號','客戶品號','品名','工站名稱','機台編號','不良類別','不良代碼','不良名稱','不良數量',
  '異常類型','異常開始時間','異常結束時間','異常工時','備註','更新時間'
];

function 報工作業V4_PWA_嘗試處理動作_(e) {
  var data = 報工作業V4_解析請求_(e);
  var action = String(data.action || data['動作'] || '').trim();
  if (!action) return null;

  var actions = [
    '取得報工作業v2初始資料',
    '寫入報工作業v2',
    '寫入今日派班報工',
    '寫入不良紀錄v2',
    '寫入不良紀錄38_7',
    '寫入不良紀錄'
  ];
  if (actions.indexOf(action) < 0) return null;

  try {
    if (action === '取得報工作業v2初始資料') return 報工作業V4_JSON_(取得報工作業v2初始資料());
    if (action === '寫入報工作業v2' || action === '寫入今日派班報工') return 報工作業V4_JSON_(寫入今日派班報工(data));
    if (action === '寫入不良紀錄v2' || action === '寫入不良紀錄38_7' || action === '寫入不良紀錄') return 報工作業V4_JSON_(寫入不良紀錄v2(data));
  } catch (err) {
    return 報工作業V4_JSON_({ 成功:false, success:false, 訊息:String(err && err.message || err), action:action });
  }
  return null;
}

function 取得報工作業v2初始資料() {
  var persons = 報工作業V4_讀物件列_(報工作業V4_人員表_).filter(function(r){
    return String(r['啟用'] || '是').trim() !== '否';
  }).map(function(r){
    return {
      工號: 報工作業V4_取值_(r, ['工號','員工編號']),
      姓名: 報工作業V4_取值_(r, ['姓名']),
      部門: 報工作業V4_取值_(r, ['部門']),
      班別: 報工作業V4_取值_(r, ['班別']) || '早班',
      班別名稱: 報工作業V4_取值_(r, ['班別']) || '早班',
      職稱: 報工作業V4_取值_(r, ['職稱']),
      啟用: 報工作業V4_取值_(r, ['啟用']) || '是',
      照片網址: 報工作業V4_取值_(r, ['照片網址','頭像網址','人員照片網址','縮圖網址']),
      縮圖網址: 報工作業V4_取值_(r, ['縮圖網址','照片網址','頭像網址','人員照片網址'])
    };
  });

  var routes = 報工作業V4_讀物件列_(報工作業V4_途程表_).map(function(r){
    var productId = 報工作業V4_取值_(r, ['產品編號','料號','品號']);
    var customerNo = 報工作業V4_取值_(r, ['客戶品號','客戶料號']);
    var name = 報工作業V4_取值_(r, ['品名','產品名稱']);
    var station = 報工作業V4_取值_(r, ['報工工站名稱','工站名稱','建議工站','工站']);
    var op = 報工作業V4_取值_(r, ['工序範圍','工序','OP','作業順序']);
    var machine = 報工作業V4_取值_(r, ['主機台','主機台編號','機台編號','建議機台']);
    var machineList = 報工作業V4_取值_(r, ['機台清單','可用機台','機台編號清單']) || machine;
    return {
      產品編號: productId,
      客戶品號: customerNo,
      品名: name,
      報工工站名稱: station,
      工站名稱: station,
      工序範圍: op,
      主機台: machine,
      機台清單: String(machineList || machine || '').split(/[、,，;；\s]+/).filter(Boolean).map(function(id){ return { 機台編號:id, 設備名稱:'機台' + id }; }),
      顯示名稱: [station, op, machine].filter(Boolean).join('｜')
    };
  }).filter(function(r){ return r.產品編號 && r.報工工站名稱; });

  return {
    成功:true,
    success:true,
    版本:'v4.2.0_backend_dispatch_report_write',
    人員: persons,
    報工工站群組: routes,
    途程工站群組: routes,
    不良原因: 報工作業V4_預設不良原因_(),
    異常類型: ['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],
    班別清單: [{名稱:'早班',值:'早班'},{名稱:'中班',值:'中班'},{名稱:'大夜班',值:'大夜班'}],
    筆數: { 人員:persons.length, 報工工站群組:routes.length }
  };
}

function 寫入報工作業v2(data) {
  return 寫入今日派班報工(data);
}

function 寫入今日派班報工(data) {
  data = 報工作業V4_標準化報工_(data || {});
  if (!data['報工編號']) data['報工編號'] = 'RG_PWA_' + 報工作業V4_時間ID_();
  if (!data['工號']) throw new Error('缺少工號，不能寫入09_報工');
  if (!data['產品編號'] && !data['品名']) throw new Error('缺少產品資料，不能寫入09_報工');
  if (Number(data['產出數量'] || data['今日共做數'] || 0) <= 0) throw new Error('產出數量必須大於0');

  var ss = 報工作業V4_取試算表_();
  var sh = 報工作業V4_確保表_(ss, 報工作業V4_報工表_, 報工作業V4_報工欄位_);
  var rows = 報工作業V4_讀物件列_(報工作業V4_報工表_);

  if (data['派班編號']) {
    var existsByDispatch = rows.some(function(r){ return String(r['派班編號'] || '').trim() === String(data['派班編號']).trim(); });
    if (existsByDispatch) return { 成功:true, success:true, 防重:true, 訊息:'此派班已完成報工，防重略過', 報工編號:data['報工編號'], 派班編號:data['派班編號'] };
  }
  var existsByReport = rows.some(function(r){ return String(r['報工編號'] || '').trim() === String(data['報工編號']).trim(); });
  if (existsByReport) return { 成功:true, success:true, 防重:true, 訊息:'此報工編號已存在，防重略過', 報工編號:data['報工編號'] };

  報工作業V4_依欄位追加_(sh, data, 報工作業V4_報工欄位_);

  if (data['派班編號']) 報工作業V4_回寫派班_(data);
  if (data['工單編號']) 報工作業V4_回寫工單_(data);

  var bad = Number(data['不良數量'] || data['不良數'] || 0);
  if (bad > 0) 寫入不良紀錄v2(data);

  return {
    成功:true,
    success:true,
    訊息:'09_報工寫入完成；派班與工單已同步',
    報工編號:data['報工編號'],
    派班編號:data['派班編號'] || '',
    工單編號:data['工單編號'] || ''
  };
}

function 寫入不良紀錄v2(data) {
  data = 報工作業V4_標準化報工_(data || {});
  var badTotal = Number(data['不良數量'] || data['不良數'] || 0);
  if (badTotal <= 0) return { 成功:true, success:true, 略過:true, 訊息:'無不良數量，不寫入09_不良紀錄' };

  var ss = 報工作業V4_取試算表_();
  var sh = 報工作業V4_確保表_(ss, 報工作業V4_不良表_, 報工作業V4_不良欄位_);
  var lines = data['不良行清單'];
  if (typeof lines === 'string') {
    try { lines = JSON.parse(lines); } catch(e) { lines = []; }
  }
  if (!Array.isArray(lines) || !lines.length) {
    lines = [{ category:'未分類', code:'', name:'未分配不良原因', qty:badTotal }];
  }

  var now = 報工作業V4_現在_();
  var count = 0;
  lines.forEach(function(line, i){
    var qty = Number(line.qty || line['不良數量'] || line['數量'] || 0);
    if (qty <= 0) return;
    var row = {
      '不良紀錄編號':'NG_' + 報工作業V4_時間ID_() + '_' + (i + 1),
      '時間戳':now,
      '報工編號':data['報工編號'],
      '派班編號':data['派班編號'],
      '工單編號':data['工單編號'],
      '來源需求編號':data['來源需求編號'],
      '工號':data['工號'],
      '姓名':data['姓名'],
      '班別':data['班別'],
      '產品編號':data['產品編號'],
      '客戶品號':data['客戶品號'],
      '品名':data['品名'],
      '工站名稱':data['工站名稱'],
      '機台編號':data['機台編號'],
      '不良類別':line.category || line['類別'] || '',
      '不良代碼':line.code || line['代碼'] || '',
      '不良名稱':line.name || line['名稱'] || '',
      '不良數量':qty,
      '異常類型':data['異常類型'] || '',
      '異常開始時間':data['異常開始時間'] || '',
      '異常結束時間':data['異常結束時間'] || '',
      '異常工時':data['異常工時'] || '',
      '備註':data['備註'] || '',
      '更新時間':now
    };
    報工作業V4_依欄位追加_(sh, row, 報工作業V4_不良欄位_);
    count++;
  });
  return { 成功:true, success:true, 訊息:'09_不良紀錄同步完成', 筆數:count, 報工編號:data['報工編號'] };
}

function 報工作業V4_回寫派班_(data) {
  var rows = 報工作業V4_讀物件列_(報工作業V4_派班表_);
  var target = rows.find(function(r){ return String(r['派班編號'] || '').trim() === String(data['派班編號']).trim(); });
  if (!target) return;
  var ss = 報工作業V4_取試算表_();
  var sh = ss.getSheetByName(報工作業V4_派班表_);
  var headers = 報工作業V4_取表頭_(sh);
  報工作業V4_設值_(sh, headers, target.__row, '狀態', '已報工');
  報工作業V4_設值_(sh, headers, target.__row, '備註', String(target['備註'] || '') + '；已寫入09_報工=' + data['報工編號']);
  報工作業V4_設值_(sh, headers, target.__row, '更新時間', 報工作業V4_現在_());
}

function 報工作業V4_回寫工單_(data) {
  var rows = 報工作業V4_讀物件列_(報工作業V4_工單表_);
  var target = rows.find(function(r){ return String(r['工單編號'] || '').trim() === String(data['工單編號']).trim(); });
  if (!target) return;
  var ss = 報工作業V4_取試算表_();
  var sh = ss.getSheetByName(報工作業V4_工單表_);
  var headers = 報工作業V4_取表頭_(sh);
  var oldDone = Number(target['已報工數量'] || 0);
  var qty = Number(data['實際良品數'] || data['良品數量'] || data['產出數量'] || data['今日共做數'] || 0);
  var newDone = oldDone + qty;
  var total = Number(target['工單數量'] || target['需求量'] || 0);
  var remain = Math.max(total - newDone, 0);
  var status = remain <= 0 ? '完工' : '部分報工';
  報工作業V4_設值_(sh, headers, target.__row, '已報工數量', newDone);
  報工作業V4_設值_(sh, headers, target.__row, '剩餘數量', remain);
  報工作業V4_設值_(sh, headers, target.__row, '狀態', status);
  報工作業V4_設值_(sh, headers, target.__row, '備註', String(target['備註'] || '') + '；V4報工=' + data['報工編號'] + '；良品=' + qty);
  報工作業V4_設值_(sh, headers, target.__row, '更新時間', 報工作業V4_現在_());
}

function 報工作業V4_標準化報工_(data) {
  var total = Number(data['今日共做數'] || data['產出數量'] || data['報工數量'] || 0);
  var bad = Number(data['不良數量'] || data['不良數'] || 0);
  var good = Number(data['實際良品數'] || data['良品數量'] || Math.max(total - bad, 0));
  var now = 報工作業V4_現在_();
  data['時間戳'] = data['時間戳'] || now;
  data['作業日'] = data['作業日'] || 報工作業V4_今天_();
  data['報工編號'] = data['報工編號'] || data['流水號'] || '';
  data['工站名稱'] = data['工站名稱'] || data['報工工站名稱'] || '';
  data['機台編號'] = data['機台編號'] || data['主機台'] || '';
  data['今日共做數'] = total;
  data['產出數量'] = total;
  data['不良數量'] = bad;
  data['實際良品數'] = good;
  data['狀態'] = data['狀態'] || '完成';
  data['更新時間'] = data['更新時間'] || now;
  return data;
}

function 報工作業V4_解析請求_(e) {
  var out = {};
  if (e && e.parameter) Object.keys(e.parameter).forEach(function(k){ out[k] = e.parameter[k]; });
  var text = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
  if (text) {
    if (text.charAt(0) === '{') {
      try { Object.assign(out, JSON.parse(text)); } catch(err) {}
    } else {
      text.split('&').forEach(function(part){
        var p = part.split('=');
        if (!p[0]) return;
        out[decodeURIComponent(p[0].replace(/\+/g,' '))] = decodeURIComponent((p.slice(1).join('=') || '').replace(/\+/g,' '));
      });
    }
  }
  ['payload','資料','json'].forEach(function(k){
    if (typeof out[k] === 'string' && out[k].trim().charAt(0) === '{') {
      try { Object.assign(out, JSON.parse(out[k])); } catch(err) {}
    }
  });
  ['不良行清單','現場照片清單'].forEach(function(k){
    if (typeof out[k] === 'string' && out[k].trim().charAt(0) === '[') {
      try { out[k] = JSON.parse(out[k]); } catch(err) {}
    }
  });
  return out;
}

function 報工作業V4_取試算表_() {
  if (typeof 取得試算表_ === 'function') return 取得試算表_();
  return SpreadsheetApp.openById(報工作業V4_正式主庫ID_);
}

function 報工作業V4_確保表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = Math.max(sh.getLastColumn(), headers.length);
  var current = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var changed = false;
  headers.forEach(function(h, i){ if (current.indexOf(h) < 0) { current[i] = current[i] || h; changed = true; } });
  if (sh.getLastRow() === 0 || current[0] !== headers[0]) changed = true;
  if (changed) sh.getRange(1, 1, 1, current.length).setValues([current]);
  sh.setFrozenRows(1);
  return sh;
}

function 報工作業V4_依欄位追加_(sh, obj, fallbackHeaders) {
  var headers = 報工作業V4_取表頭_(sh);
  if (!headers.length) headers = fallbackHeaders;
  var row = headers.map(function(h){ return obj[h] === undefined ? '' : obj[h]; });
  sh.appendRow(row);
}

function 報工作業V4_讀物件列_(sheetName) {
  var ss = 報工作業V4_取試算表_();
  var sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(h){ return String(h || '').trim(); });
  return values.slice(1).map(function(row, i){
    var o = { __row:i + 2 };
    headers.forEach(function(h, c){ if (h) o[h] = row[c]; });
    return o;
  });
}

function 報工作業V4_取表頭_(sh) {
  if (!sh || sh.getLastColumn() < 1) return [];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function(h){ return String(h || '').trim(); });
}

function 報工作業V4_設值_(sh, headers, row, colName, value) {
  var idx = headers.indexOf(colName);
  if (idx >= 0) sh.getRange(row, idx + 1).setValue(value);
}

function 報工作業V4_取值_(obj, keys) {
  obj = obj || {};
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function 報工作業V4_預設不良原因_() {
  return {
    Z:[{代碼:'Z01',名稱:'素材裂縫',英文名稱:'Surface Crack'},{代碼:'Z02',名稱:'加工砂孔',英文名稱:'Sand Porosity'},{代碼:'Z03',名稱:'外觀刮傷',英文名稱:'Surface Scratch'}],
    Y:[{代碼:'Y01',名稱:'內徑超差',英文名稱:'Inner Diameter OOT'},{代碼:'Y02',名稱:'外徑超差',英文名稱:'Outer Diameter OOT'},{代碼:'Y03',名稱:'長度超差',英文名稱:'Length OOT'}]
  };
}

function 報工作業V4_今天_() {
  return Utilities.formatDate(new Date(), 報工作業V4_時區_, 'yyyy-MM-dd');
}

function 報工作業V4_現在_() {
  return Utilities.formatDate(new Date(), 報工作業V4_時區_, 'yyyy-MM-dd HH:mm:ss');
}

function 報工作業V4_時間ID_() {
  return Utilities.formatDate(new Date(), 報工作業V4_時區_, 'yyyyMMdd_HHmmss');
}

function 報工作業V4_JSON_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj || {}, null, 0)).setMimeType(ContentService.MimeType.JSON);
}
