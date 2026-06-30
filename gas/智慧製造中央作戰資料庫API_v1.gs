/**
 * 智慧製造中央作戰資料庫 API v1
 * 用途：接收 PWA 生產計劃表清洗器 V2.5 的資料庫快照，寫入 Google Sheets。
 * 主線：生產計劃表清洗器 → BOM需求展開 → CTB齊套 → 10_排程需求池 → 11_自動排程結果 → 13_拆工單結果
 */

const 系統名稱 = '智慧製造中央作戰資料庫_BOM排程版';
const 屬性_資料庫ID = '智慧製造中央作戰資料庫_ID';

const 資料表欄位 = {
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

const PWA對應分頁 = {
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

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'status');
  try {
    if (action === '初始化') return 輸出JSON(初始化_智慧製造中央作戰資料庫());
    if (action === '自檢') return 輸出JSON(自檢_智慧製造中央作戰資料庫());
    if (action === 'schema') return 輸出JSON({ ok:true, 系統:系統名稱, 資料表欄位 });
    return 輸出JSON({ ok:true, 系統:系統名稱, 訊息:'API 已啟動', 時間:new Date().toISOString(), 資料庫ID:取得資料庫ID_不建立() });
  } catch (err) {
    return 輸出JSON({ ok:false, 錯誤:String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = 解析請求_(e);
    const action = String(body.action || body.動作 || '寫入資料庫快照');
    if (action === '初始化') return 輸出JSON(初始化_智慧製造中央作戰資料庫());
    if (action === '自檢') return 輸出JSON(自檢_智慧製造中央作戰資料庫());
    if (action === '寫入資料庫快照') return 輸出JSON(寫入資料庫快照_(body));
    if (action === '清空分頁') return 輸出JSON(清空指定分頁_(body.sheet || body.分頁));
    return 輸出JSON({ ok:false, 錯誤:'未知 action：' + action });
  } catch (err) {
    return 輸出JSON({ ok:false, 錯誤:String(err && err.message || err), stack:String(err && err.stack || '') });
  }
}

function 初始化_智慧製造中央作戰資料庫() {
  const ss = 取得資料庫_必要時建立_();
  Object.keys(資料表欄位).forEach(name => 建立或校正分頁_(ss, name, 資料表欄位[name]));
  寫入系統設定_(ss);
  SpreadsheetApp.flush();
  return {
    ok:true,
    訊息:'初始化完成',
    資料庫名稱:ss.getName(),
    資料庫ID:ss.getId(),
    資料庫網址:ss.getUrl(),
    分頁數:Object.keys(資料表欄位).length
  };
}

function 自檢_智慧製造中央作戰資料庫() {
  const ss = 取得資料庫_必要時建立_();
  const result = Object.keys(資料表欄位).map(name => {
    const sh = ss.getSheetByName(name);
    return {
      分頁:name,
      存在:!!sh,
      資料列:sh ? Math.max(0, sh.getLastRow() - 1) : 0,
      欄數:sh ? sh.getLastColumn() : 0
    };
  });
  return { ok:true, 資料庫ID:ss.getId(), 資料庫網址:ss.getUrl(), 分頁檢查:result };
}

function 寫入資料庫快照_(body) {
  const ss = 取得資料庫_必要時建立_();
  const payload = body.payload || body.DB || body.data || {};
  const 批次ID = body.batchId || body.批次ID || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const 來源 = body.source || body.來源 || 'PWA_生產計劃表清洗器';
  const 寫入模式 = body.mode || body.寫入模式 || 'replace';
  const tables = payload.tables || payload.sheets || payload.DB || payload;
  const 寫入結果 = [];

  Object.keys(PWA對應分頁).forEach(key => {
    const sheetName = PWA對應分頁[key];
    const rows = 取表資料_(tables, key);
    if (!Array.isArray(rows)) return;
    const count = 寫入物件陣列_(ss, sheetName, rows, 寫入模式 === 'append' ? 'append' : 'replace');
    寫入結果.push({ 工作表:sheetName, 來源鍵:key, 寫入筆數:count });
    寫入紀錄_(ss, 批次ID, 來源, sheetName, count, '完成', 寫入模式);
  });

  const 原始表 = ss.getSheetByName('90_匯入原始資料') || 建立或校正分頁_(ss, '90_匯入原始資料', 資料表欄位['90_匯入原始資料']);
  原始表.appendRow([new Date(), 來源, '資料庫快照', JSON.stringify(payload).slice(0, 45000)]);

  更新BOM檢查清單_(ss);
  SpreadsheetApp.flush();
  return { ok:true, 訊息:'資料庫快照寫入完成', 批次ID, 資料庫ID:ss.getId(), 資料庫網址:ss.getUrl(), 寫入結果 };
}

function 取表資料_(tables, key) {
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

function 寫入物件陣列_(ss, sheetName, rows, mode) {
  const headers = 資料表欄位[sheetName];
  const sh = 建立或校正分頁_(ss, sheetName, headers);
  if (mode === 'replace') {
    const last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
  }
  if (!rows.length) return 0;
  const values = rows.map(r => headers.map(h => 轉儲存格值_(r[h])));
  const start = Math.max(sh.getLastRow() + 1, 2);
  sh.getRange(start, 1, values.length, headers.length).setValues(values);
  sh.autoResizeColumns(1, Math.min(headers.length, 12));
  return values.length;
}

function 轉儲存格值_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 清空指定分頁_(name) {
  if (!name || !資料表欄位[name]) return { ok:false, 錯誤:'分頁不存在或不可清空：' + name };
  const ss = 取得資料庫_必要時建立_();
  const sh = 建立或校正分頁_(ss, name, 資料表欄位[name]);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow()-1, sh.getLastColumn()).clearContent();
  return { ok:true, 訊息:'已清空：' + name };
}

function 取得資料庫_必要時建立_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(屬性_資料庫ID);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { props.deleteProperty(屬性_資料庫ID); }
  }
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      props.setProperty(屬性_資料庫ID, active.getId());
      return active;
    }
  } catch (err) {}
  const ss = SpreadsheetApp.create(系統名稱 + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'));
  props.setProperty(屬性_資料庫ID, ss.getId());
  return ss;
}

function 取得資料庫ID_不建立() {
  return PropertiesService.getScriptProperties().getProperty(屬性_資料庫ID) || '';
}

function 建立或校正分頁_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0b3a75').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  return sh;
}

function 寫入系統設定_(ss) {
  const sh = 建立或校正分頁_(ss, '00_系統設定', 資料表欄位['00_系統設定']);
  const settings = [
    ['系統名稱', 系統名稱, '中央資料庫名稱', new Date()],
    ['資料庫ID', ss.getId(), 'Google Sheets ID', new Date()],
    ['版本', 'v1', 'BOM排程版資料庫結構', new Date()],
    ['預設寫入模式', 'replace', 'PWA每次上傳以快照取代', new Date()]
  ];
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();
  sh.getRange(2,1,settings.length,settings[0].length).setValues(settings);
}

function 寫入紀錄_(ss, batchId, source, sheetName, count, status, note) {
  const sh = 建立或校正分頁_(ss, '00_寫入紀錄', 資料表欄位['00_寫入紀錄']);
  sh.appendRow([new Date(), batchId, source, sheetName, count, status, note || '']);
}

function 更新BOM檢查清單_(ss) {
  const sh = 建立或校正分頁_(ss, '91_BOM檢查清單', 資料表欄位['91_BOM檢查清單']);
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

function 解析請求_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const raw = e.postData.contents;
  try { return JSON.parse(raw); } catch (err) {}
  const params = e.parameter || {};
  if (params.payload) return JSON.parse(params.payload);
  throw new Error('無法解析請求內容，請使用 JSON POST。');
}

function 輸出JSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
