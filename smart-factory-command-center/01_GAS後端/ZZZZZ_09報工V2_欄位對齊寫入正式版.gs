/**
 * ZZZZZ_09報工V2_欄位對齊寫入正式版
 * 版本：v2.0.0｜對齊 07_報工作業V2 前端資料結構與 Google Sheets 欄位
 *
 * 目的：
 * 1. 不修改 07_報工作業V2.html UI。
 * 2. 對齊新版報工 V2 前端送出的欄位：不良行清單、異常時間、照片清單、照片備註。
 * 3. 寫入 09_報工、09_不良紀錄、06_照片資料庫。
 * 4. 此檔以 ZZZZZ 命名，作為正式覆寫寫入層，避免舊版寫入函數漏欄位。
 */

const 報工V2_報工表頭_ = [
  '報工編號','時間戳','作業日','工號','姓名','班別','是否加班','加班類型',
  '作業員照片網址','作業員縮圖網址','作業員照片檔案ID',
  '產品編號','客戶品號','品名','產品照片網址','產品縮圖網址','產品照片檔案ID',
  '工站名稱','報工工站名稱','工序','工序清單','機台清單','主機台','機台照片清單JSON',
  '今日共做數','不良數','實際良品數','不良率','開始時間','結束時間','實際工時',
  '不良類別','不良代碼','不良原因','異常類型','備註','現場照片JSON','來源','狀態','更新時間',
  '不良行清單JSON','不良總數','異常開始時間','異常結束時間','異常工時'
];

const 報工V2_不良紀錄表頭_ = [
  '流水號','時間戳','作業日','工號','姓名','產品編號','品名','機台編號','工單編號',
  '不良代碼','不良名稱','不良數量','責任歸屬','說明','照片網址','報工編號','班別','客戶品號',
  '工站名稱','工序','不良類別','不良率','異常類型','照片JSON','來源','狀態',
  '機台清單','主機台','英文名稱','異常開始時間','異常結束時間','異常工時',
  '不良行清單JSON','現場照片清單JSON','備註','開始時間','結束時間','實際工時'
];

const 報工V2_照片資料庫表頭_ = [
  '照片ID','時間戳','作業日','報工編號','照片類型','對應主鍵','檔案名稱','Google檔案ID',
  '照片網址','縮圖網址','MIME類型','檔案大小','啟用','備註','來源','前端照片索引',
  '上傳狀態','對應表單','對應欄位','更新時間'
];

function 寫入報工作業v2(data) {
  data = data || {};

  const sh = 報工V2_取得或建立表_('09_報工', 報工V2_報工表頭_);
  const headers = 取表頭_(sh);

  const 今日共做數 = Number(data.今日共做數 || 0);
  const 不良數 = Number(data.不良數 || 0);
  const 實際良品數 = Number(data.實際良品數 || Math.max(今日共做數 - 不良數, 0));
  const 不良行清單 = 報工V2_標準化不良行清單_(data.不良行清單 || data.不良分配清單 || []);
  const 不良總數 = 不良行清單.reduce(function(sum, row) { return sum + Number(row.數量 || 0); }, 0);
  const 現場照片清單 = 報工V2_標準化照片清單_(data.現場照片清單 || []);
  const now = new Date();
  const 報工編號 = data.報工編號 || 產生流水號_('RFV2');

  if (!文字_(data.工號)) throw new Error('請選擇作業員，工號不可空白');
  if (!文字_(data.產品編號) && !文字_(data.品名)) throw new Error('請選擇產品');
  if (!文字_(data.報工工站名稱) && !文字_(data.工站名稱)) throw new Error('請選擇報工工站');
  if (今日共做數 <= 0) throw new Error('今日共做數必須大於 0');
  if (不良數 < 0) throw new Error('不良數不可小於 0');
  if (不良數 > 今日共做數) throw new Error('不良數不可大於今日共做數');

  const obj = {
    報工編號: 報工編號,
    時間戳: now,
    作業日: data.作業日 || 取得作業日_(),
    工號: data.工號 || '',
    姓名: data.姓名 || '',
    班別: data.班別 && data.班別 !== '自動判斷' ? data.班別 : 判斷化新班別_(),
    是否加班: data.是否加班 || '否',
    加班類型: data.加班類型 || '無',
    作業員照片網址: data.作業員照片網址 || '',
    作業員縮圖網址: data.作業員縮圖網址 || '',
    作業員照片檔案ID: data.作業員照片檔案ID || '',
    產品編號: data.產品編號 || '',
    客戶品號: data.客戶品號 || '',
    品名: data.品名 || '',
    產品照片網址: data.產品照片網址 || '',
    產品縮圖網址: data.產品縮圖網址 || '',
    產品照片檔案ID: data.產品照片檔案ID || '',
    工站名稱: data.工站名稱 || data.報工工站名稱 || '',
    報工工站名稱: data.報工工站名稱 || data.工站名稱 || '',
    工序: data.工序 || '',
    工序清單: data.工序清單 || data.工序 || '',
    機台清單: data.機台清單 || '',
    主機台: data.主機台 || '',
    機台照片清單JSON: JSON.stringify(data.機台照片清單 || []),
    今日共做數: 今日共做數,
    不良數: 不良數,
    實際良品數: 實際良品數,
    不良率: 今日共做數 ? 不良數 / 今日共做數 : 0,
    開始時間: data.開始時間 || '',
    結束時間: data.結束時間 || '',
    實際工時: data.實際工時 || '',
    不良類別: data.不良類別 || (不良行清單[0] ? 不良行清單[0].類別 : '無'),
    不良代碼: data.不良代碼 || (不良行清單[0] ? 不良行清單[0].代碼 : ''),
    不良原因: data.不良原因 || (不良行清單[0] ? 不良行清單[0].名稱 : ''),
    異常類型: data.異常類型 || '',
    備註: data.備註 || '',
    現場照片JSON: JSON.stringify(現場照片清單),
    來源: 'GAS_HTML_07_報工作業V2_v2.0.0_欄位對齊',
    狀態: '有效',
    更新時間: now,
    不良行清單JSON: JSON.stringify(不良行清單),
    不良總數: 不良總數,
    異常開始時間: data.異常開始時間 || '',
    異常結束時間: data.異常結束時間 || '',
    異常工時: data.異常工時 || ''
  };

  sh.appendRow(headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; }));
  報工V2_寫入照片資料庫_(obj, 現場照片清單);

  if (data.工單編號) 更新工單完成量_(data.工單編號, 實際良品數, 不良數);
  記錄操作_('報工作業V2', '寫入09_報工_欄位對齊', 報工編號, '完成', JSON.stringify({
    工號: obj.工號,
    產品編號: obj.產品編號,
    今日共做數: 今日共做數,
    不良數: 不良數,
    實際良品數: 實際良品數,
    不良行數: 不良行清單.length,
    照片數: 現場照片清單.length
  }));

  return {
    成功: true,
    訊息: '報工作業V2已寫入09_報工',
    報工編號: 報工編號,
    目標分頁: '09_報工',
    作業日: obj.作業日,
    班別: obj.班別,
    今日共做數: 今日共做數,
    不良數: 不良數,
    實際良品數: 實際良品數,
    不良行數: 不良行清單.length,
    照片數: 現場照片清單.length
  };
}

function 寫入不良紀錄v2(data) {
  data = data || {};

  const 報工編號 = 文字_(data.報工編號);
  const 不良行清單 = 報工V2_標準化不良行清單_(data.不良行清單 || data.不良分配清單 || []);
  const 不良數 = Number(data.不良數 || 0);

  if (!不良行清單.length && !不良數 && !文字_(data.不良代碼) && !文字_(data.不良原因)) {
    return { 成功: true, 訊息: '無不良資料，略過寫入' };
  }

  const rows = 不良行清單.length ? 不良行清單 : [{
    類別: data.不良類別 || '',
    代碼: data.不良代碼 || '',
    名稱: data.不良原因 || data.不良名稱 || '',
    英文名稱: data.英文名稱 || '',
    數量: 不良數
  }];

  let 寫入筆數 = 0;
  rows.forEach(function(item) {
    if (報工編號 && 報工V2_不良紀錄已存在_(報工編號, item.代碼, item.數量)) return;
    const row = 報工V2_建立不良紀錄物件_(data, 報工編號 || '', item, 不良行清單);
    報工V2_寫入不良紀錄物件_(row);
    寫入筆數++;
  });

  return {
    成功: true,
    訊息: 寫入筆數 ? '不良紀錄已寫入' : '不良紀錄已存在，避免重複寫入',
    報工編號: 報工編號,
    寫入筆數: 寫入筆數
  };
}

function 同步不良紀錄_(obj, data) {
  data = Object.assign({}, data || {}, obj || {});
  const 不良行清單 = 報工V2_標準化不良行清單_(data.不良行清單 || []);
  if (!Number(data.不良數 || 0) && !不良行清單.length && !文字_(data.不良代碼) && !文字_(data.不良原因)) return;
  寫入不良紀錄v2(data);
}

function 報工V2_建立不良紀錄物件_(data, 報工編號, item, 不良行清單) {
  const 今日共做數 = Number(data.今日共做數 || 0);
  const 不良數量 = Number(item.數量 || data.不良數 || 0);
  const 現場照片清單 = 報工V2_標準化照片清單_(data.現場照片清單 || []);
  return {
    流水號: 產生流水號_('NG'),
    時間戳: new Date(),
    作業日: data.作業日 || 取得作業日_(),
    工號: data.工號 || '',
    姓名: data.姓名 || '',
    產品編號: data.產品編號 || '',
    品名: data.品名 || '',
    機台編號: data.主機台 || data.機台清單 || '',
    工單編號: data.工單編號 || '',
    不良代碼: item.代碼 || data.不良代碼 || '',
    不良名稱: item.名稱 || data.不良原因 || data.不良名稱 || '',
    不良數量: 不良數量,
    責任歸屬: data.責任歸屬 || item.類別 || data.不良類別 || '',
    說明: data.備註 || data.說明 || '',
    照片網址: data.照片網址 || '',
    報工編號: 報工編號 || data.報工編號 || '',
    班別: data.班別 || '',
    客戶品號: data.客戶品號 || '',
    工站名稱: data.工站名稱 || data.報工工站名稱 || '',
    工序: data.工序 || data.工序清單 || '',
    不良類別: item.類別 || data.不良類別 || '',
    不良率: data.不良率 !== undefined ? data.不良率 : (今日共做數 ? 不良數量 / 今日共做數 : ''),
    異常類型: data.異常類型 || '',
    照片JSON: JSON.stringify(現場照片清單),
    來源: '07_報工作業V2_v2.0.0_欄位對齊',
    狀態: '有效',
    機台清單: data.機台清單 || '',
    主機台: data.主機台 || '',
    英文名稱: item.英文名稱 || data.英文名稱 || '',
    異常開始時間: data.異常開始時間 || '',
    異常結束時間: data.異常結束時間 || '',
    異常工時: data.異常工時 || '',
    不良行清單JSON: JSON.stringify(不良行清單 || []),
    現場照片清單JSON: JSON.stringify(現場照片清單),
    備註: data.備註 || '',
    開始時間: data.開始時間 || '',
    結束時間: data.結束時間 || '',
    實際工時: data.實際工時 || ''
  };
}

function 報工V2_寫入不良紀錄物件_(row) {
  const sh = 報工V2_取得或建立表_('09_不良紀錄', 報工V2_不良紀錄表頭_);
  const headers = 取表頭_(sh);
  sh.appendRow(headers.map(function(h) { return row[h] !== undefined ? row[h] : ''; }));
}

function 報工V2_寫入照片資料庫_(報工Obj, photos) {
  photos = 報工V2_標準化照片清單_(photos || []);
  if (!photos.length) return;

  const sh = 報工V2_取得或建立表_('06_照片資料庫', 報工V2_照片資料庫表頭_);
  const headers = 取表頭_(sh);
  const rows = [];
  photos.forEach(function(p, i) {
    const row = {
      照片ID: 'PHOTO-' + Utilities.formatDate(new Date(), 系統設定.時區, 'yyyyMMddHHmmss') + '-' + (i + 1),
      時間戳: new Date(),
      作業日: 報工Obj.作業日 || 取得作業日_(),
      報工編號: 報工Obj.報工編號 || '',
      照片類型: p.照片類型 || '現場照片',
      對應主鍵: 報工Obj.報工編號 || 報工Obj.產品編號 || 報工Obj.工號 || '',
      檔案名稱: p.檔案名稱 || p.檔名 || ('front-photo-' + (i + 1)),
      Google檔案ID: p.Google檔案ID || '',
      照片網址: p.照片網址 || '',
      縮圖網址: p.縮圖網址 || '',
      MIME類型: p.MIME類型 || p.mime || '',
      檔案大小: p.檔案大小 || '',
      啟用: '是',
      備註: p.備註 || '',
      來源: p.來源 || '07_報工作業V2',
      前端照片索引: i + 1,
      上傳狀態: p.Google檔案ID || p.照片網址 ? '已上傳' : '前端暫存',
      對應表單: '09_報工',
      對應欄位: '現場照片JSON',
      更新時間: new Date()
    };
    rows.push(headers.map(function(h) { return row[h] !== undefined ? row[h] : ''; }));
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

function 報工V2_不良紀錄已存在_(報工編號, 不良代碼, 不良數量) {
  const sh = 取得試算表_().getSheetByName('09_不良紀錄');
  if (!sh || sh.getLastRow() < 2 || !報工編號) return false;
  const values = sh.getDataRange().getValues();
  const h = values[0].map(String);
  const c報工 = h.indexOf('報工編號');
  const c代碼 = h.indexOf('不良代碼');
  const c數量 = h.indexOf('不良數量');
  if (c報工 < 0) return false;
  for (let i = 1; i < values.length; i++) {
    if (文字_(values[i][c報工]) !== 文字_(報工編號)) continue;
    if (c代碼 >= 0 && 文字_(values[i][c代碼]) !== 文字_(不良代碼 || '')) continue;
    if (c數量 >= 0 && Number(values[i][c數量] || 0) !== Number(不良數量 || 0)) continue;
    return true;
  }
  return false;
}

function 報工V2_標準化不良行清單_(list) {
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  if (!Array.isArray(list)) return [];
  return list.map(function(r) {
    r = r || {};
    return {
      類別: r.類別 || r.不良類別 || '',
      代碼: r.代碼 || r.不良代碼 || '',
      名稱: r.名稱 || r.不良名稱 || r.不良原因 || '',
      英文名稱: r.英文名稱 || '',
      數量: Number(r.數量 || r.不良數量 || 0)
    };
  }).filter(function(r) { return r.代碼 || r.名稱 || r.數量 > 0; });
}

function 報工V2_標準化照片清單_(list) {
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch (e) { list = []; }
  }
  if (!Array.isArray(list)) return [];
  return list.map(function(p, i) {
    p = p || {};
    return {
      照片類型: p.照片類型 || '現場照片',
      檔案名稱: p.檔案名稱 || p.檔名 || ('front-photo-' + (i + 1)),
      MIME類型: p.MIME類型 || p.mime || '',
      Base64: p.Base64 || p.base64 || '',
      備註: p.備註 || '',
      來源: p.來源 || '前端上傳',
      Google檔案ID: p.Google檔案ID || '',
      照片網址: p.照片網址 || '',
      縮圖網址: p.縮圖網址 || ''
    };
  });
}

function 報工V2_取得或建立表_(sheetName, requiredHeaders) {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  if (sh.getLastRow() < 1 || !文字_(sh.getRange(1, 1).getValue())) {
    sh.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
  }

  const headers = 取表頭_(sh);
  const missing = requiredHeaders.filter(function(h) { return headers.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  return sh;
}
