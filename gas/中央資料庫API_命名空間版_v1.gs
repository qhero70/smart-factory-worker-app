/**
 * 中央資料庫 API｜命名空間版 v1
 * 目的：整合進既有「智慧製造中央作戰指揮中心」主後端，不覆蓋舊 doGet / doPost。
 * 使用方式：
 * 1. 本檔整份貼到 Apps Script 新檔案。
 * 2. 在既有 doGet / doPost 最前面加入中央資料庫分流。
 * 3. 重新部署 Web App 新版本。
 */

const 中央資料庫API_版本 = 'v1_命名空間版_不覆蓋主系統';
const 中央資料庫API_系統名稱 = '智慧製造中央作戰資料庫_BOM排程版';
const 中央資料庫API_屬性資料庫ID = '智慧製造中央作戰資料庫_ID';

const 中央資料庫API_欄位 = {
  '00_系統設定': ['設定鍵','設定值','說明','最後更新'],
  '00_寫入紀錄': ['時間戳','批次ID','來源','工作表','寫入筆數','狀態','備註'],
  '01_產品主檔': ['產品編號','客戶品號','品名','產品類型','組裝類別','是否為主件','是否有BOM','預設工站','主機台','啟用','備註'],
  '02_BOM明細主檔': ['BOM主鍵_PK','BOM版本','層級','上層產品編號_FK','主件料號','主件品名','主件客戶品號','子件料號','子件名稱','子件客戶品號','子件類型','來源','單位','用量','損耗率','啟用','來源檔案'],
  '03_BOM樹狀展開': ['樹狀ID','BOM版本','層級','路徑','主件料號','主件品名','子件料號','子件名稱','用量','來源','備註'],
  '04_庫存在製入庫': ['料號','品名','庫存量','在製量','預計入庫量','已分配量','可用量','資料來源','更新時間','備註'],
  '05_計劃每日明細': ['區域','產品編號','客戶品號','品名','工單','日期','類型','數量','期初庫存','產能8H','CTB狀態','來源工作表','來源列號'],
  '06_本月彙總': ['區域','產品編號','客戶品號','品名','本月計畫量','本月產出量','本月需求量','供料量','可用量','還需加工量','達成率','訂單已滿足','最近出貨日','產能8H','主機台','CTB狀態','Tier','備註'],
  '07_出貨訂單': ['訂單號','區域','產品編號','客戶品號','品名','需求日期','需求數量','產能8H','狀態','來源'],
  '08_BOM需求展開': ['需求編號','父需求編號','階層','主件料號','主件品名','子件料號','子件名稱','子件類型','來源','單位用量','損耗率','成品需求量','子件需求量','需求日期','來源BOM_PK','狀態'],
  '09_CTB齊套檢查': ['需求編號','料號','品名','需求量','庫存量','在製量','預計入庫量','已分配量','可用量','缺口','CTB狀態','處置建議','最晚到料日','備註'],
  '10_排程需求池': ['需求編號','來源','區域','產品編號','客戶品號','品名','需求日期','需求數量','期初庫存','本月產出量','供料量','可用量','還需加工量','產能8H','建議開工日','建議完工日','主機台','急迫性','CTB狀態','狀態','備註'],
  '11_自動排程結果': ['排程ID','需求編號','工單號','工單類型','產品編號','品名','需求數量','排程數量','產能8H','每日班數','OEE','需天數','預計開始','預計完成','主機台','人員班別','前置依賴','CTB狀態','排程狀態','備註'],
  '12_資源參數': ['參數/資源ID','類型','名稱','可用量/數值','單位','適用產品/工站','啟用','備註'],
  '13_拆工單結果': ['工單號','來源需求編號','工單類型','父工單號','產品編號','品名','數量','單位','預計開始','預計完成','最後工序','入庫觸發','狀態','備註'],
  '90_匯入原始資料': ['時間戳','來源','資料類型','JSON內容'],
  '91_BOM檢查清單': ['檢查項目','狀態','筆數','說明','最後更新']
};

const 中央資料庫API_PWA對應分頁 = {
  'BOM明細': '02_BOM明細主檔',
  '每日明細': '05_計劃每日明細',
  '本月彙總': '06_本月彙總',
  '出貨訂單': '07_出貨訂單',
  'BOM需求展開': '08_BOM需求展開',
  'CTB齊套檢查': '09_CTB齊套檢查',
  '排程需求池': '10_排程需求池',
  '自動排程結果': '11_自動排程結果',
  '拆工單結果': '13_拆工單結果'
};

function 中央資料庫API_是否資料庫動作_(action) {
  return ['status','初始化','init','自檢','health','check','schema','寫入資料庫快照','uploadDatabase','清空分頁'].indexOf(String(action || '')) >= 0;
}

function 中央資料庫API_嘗試處理GET_(e) {
  const action = String((e && e.parameter && (e.parameter.action || e.parameter.動作 || e.parameter.method)) || '');
  if (!中央資料庫API_是否資料庫動作_(action)) return null;
  const callback = e && e.parameter && e.parameter.callback;
  try {
    let result;
    if (action === '初始化' || action === 'init') result = 中央資料庫API_初始化_();
    else if (action === '自檢' || action === 'health' || action === 'check') result = 中央資料庫API_自檢_();
    else if (action === 'schema') result = 中央資料庫API_成功_({ 系統:中央資料庫API_系統名稱, 資料表欄位:中央資料庫API_欄位 });
    else result = 中央資料庫API_成功_({ 訊息:'API 已啟動', 系統:中央資料庫API_系統名稱, 版本:中央資料庫API_版本, 時間:new Date().toISOString(), 資料庫ID:中央資料庫API_取得資料庫ID_不建立_() });
    return 中央資料庫API_輸出JSON_(result, callback);
  } catch (err) {
    return 中央資料庫API_輸出JSON_(中央資料庫API_失敗_(err), callback);
  }
}

function 中央資料庫API_嘗試處理POST_(e) {
  let body = {};
  let action = '';
  try {
    body = 中央資料庫API_解析請求_(e);
    action = String(body.action || body.動作 || body.method || '寫入資料庫快照');
  } catch (err) {
    return 中央資料庫API_輸出JSON_(中央資料庫API_失敗_(err));
  }
  if (!中央資料庫API_是否資料庫動作_(action) && action !== '') return null;
  try {
    let result;
    if (action === '初始化' || action === 'init') result = 中央資料庫API_初始化_();
    else if (action === '自檢' || action === 'health' || action === 'check') result = 中央資料庫API_自檢_();
    else if (action === '寫入資料庫快照' || action === 'uploadDatabase' || action === '') result = 中央資料庫API_寫入資料庫快照_(body);
    else if (action === '清空分頁') result = 中央資料庫API_清空指定分頁_(body.sheet || body.分頁);
    else result = 中央資料庫API_失敗_('未知 action：' + action);
    return 中央資料庫API_輸出JSON_(result);
  } catch (err) {
    return 中央資料庫API_輸出JSON_(中央資料庫API_失敗_(err));
  }
}

function 中央資料庫API_初始化_() {
  const ss = 中央資料庫API_取得資料庫_必要時建立_();
  Object.keys(中央資料庫API_欄位).forEach(name => 中央資料庫API_建立或校正分頁_(ss, name, 中央資料庫API_欄位[name]));
  中央資料庫API_寫入系統設定_(ss);
  SpreadsheetApp.flush();
  return 中央資料庫API_成功_({ 訊息:'初始化完成', 資料庫名稱:ss.getName(), 資料庫ID:ss.getId(), 資料庫網址:ss.getUrl(), 分頁數:Object.keys(中央資料庫API_欄位).length });
}

function 中央資料庫API_自檢_() {
  const ss = 中央資料庫API_取得資料庫_必要時建立_();
  const 分頁檢查 = Object.keys(中央資料庫API_欄位).map(name => {
    const sh = ss.getSheetByName(name);
    return { 分頁:name, 存在:!!sh, 資料列:sh ? Math.max(0, sh.getLastRow() - 1) : 0, 欄數:sh ? sh.getLastColumn() : 0 };
  });
  return 中央資料庫API_成功_({ 訊息:'自檢完成', 資料庫ID:ss.getId(), 資料庫網址:ss.getUrl(), 分頁檢查 });
}

function 中央資料庫API_寫入資料庫快照_(body) {
  const ss = 中央資料庫API_取得資料庫_必要時建立_();
  const payload = body.payload || body.DB || body.data || {};
  const 批次ID = body.batchId || body.批次ID || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const 來源 = body.source || body.來源 || 'PWA_生產計劃表清洗器';
  const 寫入模式 = body.mode || body.寫入模式 || 'replace';
  const tables = payload.tables || payload.sheets || payload.DB || payload;
  const 寫入結果 = [];
  Object.keys(中央資料庫API_PWA對應分頁).forEach(key => {
    const sheetName = 中央資料庫API_PWA對應分頁[key];
    const rows = 中央資料庫API_取表資料_(tables, key);
    if (!Array.isArray(rows)) return;
    const count = 中央資料庫API_寫入物件陣列_(ss, sheetName, rows, 寫入模式 === 'append' ? 'append' : 'replace');
    寫入結果.push({ 工作表:sheetName, 來源鍵:key, 寫入筆數:count });
    中央資料庫API_寫入紀錄_(ss, 批次ID, 來源, sheetName, count, '完成', 寫入模式);
  });
  const 原始表 = 中央資料庫API_建立或校正分頁_(ss, '90_匯入原始資料', 中央資料庫API_欄位['90_匯入原始資料']);
  原始表.appendRow([new Date(), 來源, '資料庫快照', JSON.stringify(payload).slice(0, 45000)]);
  中央資料庫API_更新BOM檢查清單_(ss);
  SpreadsheetApp.flush();
  return 中央資料庫API_成功_({ 訊息:'資料庫快照寫入完成', 批次ID, 資料庫ID:ss.getId(), 資料庫網址:ss.getUrl(), 寫入結果 });
}

function 中央資料庫API_取表資料_(tables, key) {
  if (!tables) return null;
  if (Array.isArray(tables[key])) return tables[key];
  const aliases = {
    'BOM明細':['BOM明細','02_BOM明細主檔','bom','BOM'],
    '每日明細':['每日明細','05_計劃每日明細','dailyRows','DAILY_ROWS'],
    '本月彙總':['本月彙總','06_本月彙總','summaryRows'],
    '出貨訂單':['出貨訂單','07_出貨訂單','shipmentRows'],
    'BOM需求展開':['BOM需求展開','08_BOM需求展開'],
    'CTB齊套檢查':['CTB齊套檢查','09_CTB齊套檢查'],
    '排程需求池':['排程需求池','10_排程需求池'],
    '自動排程結果':['自動排程結果','11_自動排程結果'],
    '拆工單結果':['拆工單結果','13_拆工單結果']
  };
  const list = aliases[key] || [key];
  for (let i=0;i<list.length;i++) if (Array.isArray(tables[list[i]])) return tables[list[i]];
  return null;
}

function 中央資料庫API_寫入物件陣列_(ss, sheetName, rows, mode) {
  const headers = 中央資料庫API_欄位[sheetName];
  const sh = 中央資料庫API_建立或校正分頁_(ss, sheetName, headers);
  if (mode === 'replace') {
    const last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
  }
  if (!rows.length) return 0;
  const values = rows.map(r => headers.map(h => 中央資料庫API_轉儲存格值_(r[h])));
  const start = Math.max(sh.getLastRow() + 1, 2);
  sh.getRange(start, 1, values.length, headers.length).setValues(values);
  return values.length;
}

function 中央資料庫API_清空指定分頁_(name) {
  if (!name || !中央資料庫API_欄位[name]) return 中央資料庫API_失敗_('分頁不存在或不可清空：' + name);
  const ss = 中央資料庫API_取得資料庫_必要時建立_();
  const sh = 中央資料庫API_建立或校正分頁_(ss, name, 中央資料庫API_欄位[name]);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow()-1, sh.getLastColumn()).clearContent();
  return 中央資料庫API_成功_({ 訊息:'已清空：' + name });
}

function 中央資料庫API_取得資料庫_必要時建立_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(中央資料庫API_屬性資料庫ID);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { props.deleteProperty(中央資料庫API_屬性資料庫ID); }
  }
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      props.setProperty(中央資料庫API_屬性資料庫ID, active.getId());
      return active;
    }
  } catch (err) {}
  const ss = SpreadsheetApp.create(中央資料庫API_系統名稱 + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'));
  props.setProperty(中央資料庫API_屬性資料庫ID, ss.getId());
  return ss;
}

function 中央資料庫API_取得資料庫ID_不建立_() {
  return PropertiesService.getScriptProperties().getProperty(中央資料庫API_屬性資料庫ID) || '';
}

function 中央資料庫API_建立或校正分頁_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0b3a75').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return sh;
}

function 中央資料庫API_寫入系統設定_(ss) {
  const sh = 中央資料庫API_建立或校正分頁_(ss, '00_系統設定', 中央資料庫API_欄位['00_系統設定']);
  const settings = [
    ['系統名稱', 中央資料庫API_系統名稱, '中央資料庫名稱', new Date()],
    ['資料庫ID', ss.getId(), 'Google Sheets ID', new Date()],
    ['版本', 中央資料庫API_版本, '命名空間版，不覆蓋主系統', new Date()],
    ['預設寫入模式', 'replace', 'PWA每次上傳以快照取代', new Date()]
  ];
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  sh.getRange(2,1,settings.length,settings[0].length).setValues(settings);
}

function 中央資料庫API_寫入紀錄_(ss, batchId, source, sheetName, count, status, note) {
  const sh = 中央資料庫API_建立或校正分頁_(ss, '00_寫入紀錄', 中央資料庫API_欄位['00_寫入紀錄']);
  sh.appendRow([new Date(), batchId, source, sheetName, count, status, note || '']);
}

function 中央資料庫API_更新BOM檢查清單_(ss) {
  const sh = 中央資料庫API_建立或校正分頁_(ss, '91_BOM檢查清單', 中央資料庫API_欄位['91_BOM檢查清單']);
  const bom = ss.getSheetByName('02_BOM明細主檔');
  const rows = bom ? Math.max(0, bom.getLastRow() - 1) : 0;
  const data = [
    ['BOM明細筆數', rows > 0 ? 'OK' : '警告', rows, '02_BOM明細主檔資料列數', new Date()],
    ['主件料號不可空白', '待進階檢查', '', '下一版加入逐列檢查', new Date()],
    ['子件料號不可空白', '待進階檢查', '', '下一版加入逐列檢查', new Date()],
    ['用量必須大於0', '待進階檢查', '', '下一版加入逐列檢查', new Date()]
  ];
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  sh.getRange(2,1,data.length,data[0].length).setValues(data);
}

function 中央資料庫API_解析請求_(e) {
  if (!e || !e.postData || !e.postData.contents) return e && e.parameter ? e.parameter : {};
  const raw = e.postData.contents;
  try { return JSON.parse(raw); } catch (err) {}
  const params = e.parameter || {};
  if (params.payload) return JSON.parse(params.payload);
  throw new Error('無法解析請求內容，請使用 JSON POST。');
}

function 中央資料庫API_轉儲存格值_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 中央資料庫API_成功_(extra) {
  const obj = extra || {};
  obj.ok = true;
  obj.success = true;
  obj.成功 = true;
  return obj;
}

function 中央資料庫API_失敗_(err) {
  const msg = String(err && err.message || err || '未知錯誤');
  return { ok:false, success:false, 成功:false, 錯誤:msg, error:msg };
}

function 中央資料庫API_輸出JSON_(obj, callback) {
  const text = JSON.stringify(obj);
  if (callback) return ContentService.createTextOutput(String(callback) + '(' + text + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
