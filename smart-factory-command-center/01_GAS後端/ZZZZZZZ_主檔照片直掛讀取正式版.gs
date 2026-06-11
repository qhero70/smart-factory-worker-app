/**
 * ZZZZZZZ_主檔照片直掛讀取正式版
 * 版本：v1.1.0｜照片改為直接掛在主檔 + 主檔照片資料夾同步
 *
 * 架構原則：
 * 1. 人員照片直接讀 01_人員主檔。
 * 2. 產品照片與三視圖直接讀 02_產品主檔。
 * 3. 機台照片直接讀 03_機台主檔。
 * 4. 06_照片資料庫 改為停用封存，不再作為報工 V2 主要照片來源。
 * 5. 不修改 07_報工作業V2.html UI。
 *
 * 資料夾來源：
 * - 人員照片：1oYX85iFPwhjiFTsDYtO3v2c4fesshRgf
 * - 產品照片：131gz5CgXYATgdhUDe7cUxCECzHS3TnuG
 * - 機台照片：1hosm3_uUopyO3AnjnDA3qmkCYZZ4bAtE
 *
 * 使用方式：
 * - 手動重刷全部：手動重刷_主檔照片()
 * - 人員照片：同步_主檔照片_人員照片資料夾()
 * - 產品照片：同步_主檔照片_產品照片資料夾()
 * - 機台照片：同步_主檔照片_機台照片資料夾()
 * - 安裝每15分鐘自動同步：安裝_主檔照片自動同步()
 */

const 主檔照片_設定_ = {
  試算表ID: '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  縮圖尺寸: 'w800',
  人員照片資料夾ID: '1oYX85iFPwhjiFTsDYtO3v2c4fesshRgf',
  產品照片資料夾ID: '131gz5CgXYATgdhUDe7cUxCECzHS3TnuG',
  機台照片資料夾ID: '1hosm3_uUopyO3AnjnDA3qmkCYZZ4bAtE'
};

function 手動重刷_主檔照片() {
  const result = {
    成功: true,
    訊息: '主檔照片同步完成',
    人員: 同步_主檔照片_人員照片資料夾(),
    產品: 同步_主檔照片_產品照片資料夾(),
    機台: 同步_主檔照片_機台照片資料夾()
  };
  主檔照片_寫入操作紀錄_('手動重刷_主檔照片', result);
  return result;
}

function 同步_主檔照片_人員照片資料夾() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.openById(主檔照片_設定_.試算表ID);
    const sh = ss.getSheetByName('01_人員主檔');
    const files = 主檔照片_讀取圖片資料夾_(主檔照片_設定_.人員照片資料夾ID);
    const result = 主檔照片_同步主檔照片_(sh, files, {
      類型: '人員',
      主鍵欄位: ['工號'],
      檔名取主鍵: 主檔照片_由人員照片檔名取主鍵_,
      欄位: {
        照片主鍵: '照片主鍵',
        檔案ID: '人員照片檔案ID',
        檔名: '人員照片檔名',
        照片網址: '人員照片網址',
        縮圖網址: '人員縮圖網址',
        來源資料夾: '人員照片來源資料夾',
        啟用: '人員照片啟用',
        更新時間: '人員照片更新時間',
        備註: '人員照片備註'
      }
    });
    主檔照片_寫入操作紀錄_('同步_主檔照片_人員照片資料夾', result);
    return result;
  } finally {
    lock.releaseLock();
  }
}

function 同步_主檔照片_產品照片資料夾() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.openById(主檔照片_設定_.試算表ID);
    const sh = ss.getSheetByName('02_產品主檔');
    const files = 主檔照片_讀取圖片資料夾_(主檔照片_設定_.產品照片資料夾ID);
    const result = 主檔照片_同步產品照片_(sh, files);
    主檔照片_寫入操作紀錄_('同步_主檔照片_產品照片資料夾', result);
    return result;
  } finally {
    lock.releaseLock();
  }
}

function 同步_主檔照片_機台照片資料夾() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.openById(主檔照片_設定_.試算表ID);
    const sh = ss.getSheetByName('03_機台主檔');
    const files = 主檔照片_讀取圖片資料夾_(主檔照片_設定_.機台照片資料夾ID);
    const result = 主檔照片_同步主檔照片_(sh, files, {
      類型: '機台',
      主鍵欄位: ['機台編號'],
      檔名取主鍵: 主檔照片_由機台照片檔名取主鍵_,
      欄位: {
        照片主鍵: '機台照片主鍵',
        檔案ID: '機台照片檔案ID',
        檔名: '機台照片檔名',
        照片網址: '機台照片網址',
        縮圖網址: '機台縮圖網址',
        來源資料夾: '機台照片來源資料夾',
        啟用: '機台照片啟用',
        更新時間: '機台照片更新時間',
        備註: '機台照片備註'
      }
    });
    主檔照片_寫入操作紀錄_('同步_主檔照片_機台照片資料夾', result);
    return result;
  } finally {
    lock.releaseLock();
  }
}

function 安裝_主檔照片自動同步() {
  移除_主檔照片自動同步();
  ScriptApp.newTrigger('手動重刷_主檔照片').timeBased().everyMinutes(15).create();
  return { 成功: true, 訊息: '已安裝主檔照片每 15 分鐘自動同步' };
}

function 移除_主檔照片自動同步() {
  let count = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction && t.getHandlerFunction() === '手動重刷_主檔照片') {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  });
  return { 成功: true, 訊息: '已移除主檔照片自動同步觸發器', 移除數: count };
}

function 主檔照片_同步主檔照片_(sh, files, spec) {
  const header = 主檔照片_確保欄位_(sh, Object.values(spec.欄位));
  const col = 主檔照片_欄位索引_(header);
  const dataRange = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, header.length) : null;
  const rows = dataRange ? dataRange.getValues() : [];
  const now = 主檔照片_格式化日期時間_(new Date());
  const fileKeys = new Set();
  let updated = 0;
  let disabled = 0;
  let unmatched = 0;

  const rowMap = new Map();
  rows.forEach(function(row, i) {
    spec.主鍵欄位.forEach(function(k) {
      const v = 主檔照片_Key_(row[col[k]]);
      if (v) rowMap.set(v, { row: row, index: i });
    });
  });

  files.forEach(function(file) {
    const key = 主檔照片_Key_(spec.檔名取主鍵(file.name));
    if (!key) return;
    fileKeys.add(key);
    const hit = rowMap.get(key);
    if (!hit) {
      unmatched++;
      return;
    }
    const photoKey = spec.檔名取主鍵(file.name);
    const obj = 主檔照片_建立主檔照片欄位值_(file, photoKey, spec.類型 + '照片資料夾', now);
    主檔照片_寫入照片欄位_(hit.row, col, spec.欄位, obj);
    updated++;
  });

  rows.forEach(function(row) {
    const currentKey = 主檔照片_Key_(row[col[spec.欄位.照片主鍵]]);
    const enabled = 主檔照片_文字_(row[col[spec.欄位.啟用]]);
    if (currentKey && enabled !== '否' && !fileKeys.has(currentKey)) {
      row[col[spec.欄位.啟用]] = '否';
      row[col[spec.欄位.備註]] = spec.類型 + '照片資料夾同步｜照片已不存在或已移除｜自動停用';
      row[col[spec.欄位.更新時間]] = now;
      disabled++;
    }
  });

  if (rows.length && dataRange) dataRange.setValues(rows);
  return { 成功: true, 類型: spec.類型, 資料夾檔案數: files.length, 更新: updated, 停用: disabled, 未匹配: unmatched, 同步時間: now };
}

function 主檔照片_同步產品照片_(sh, files) {
  const required = [
    '產品照片主鍵','產品主圖檔案ID','產品主圖檔名','產品主圖網址','產品主圖縮圖網址',
    '前視圖檔案ID','前視圖檔名','前視圖網址','前視圖縮圖網址',
    '側視圖檔案ID','側視圖檔名','側視圖網址','側視圖縮圖網址',
    '俯視圖檔案ID','俯視圖檔名','俯視圖網址','俯視圖縮圖網址',
    '產品照片來源資料夾','產品照片啟用','產品照片更新時間','產品照片備註','三視圖完整度'
  ];
  const header = 主檔照片_確保欄位_(sh, required);
  const col = 主檔照片_欄位索引_(header);
  const dataRange = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, header.length) : null;
  const rows = dataRange ? dataRange.getValues() : [];
  const now = 主檔照片_格式化日期時間_(new Date());
  const rowMap = new Map();
  let updated = 0;
  let unmatched = 0;

  rows.forEach(function(row, i) {
    ['產品編號','客戶品號'].forEach(function(k) {
      const v = 主檔照片_Key_(row[col[k]]);
      if (v) rowMap.set(v, { row: row, index: i });
    });
  });

  files.forEach(function(file) {
    const parsed = 主檔照片_解析產品照片檔名_(file.name);
    const key = 主檔照片_Key_(parsed.產品主鍵);
    if (!key) return;
    const hit = rowMap.get(key);
    if (!hit) { unmatched++; return; }

    const f = 主檔照片_建立主檔照片欄位值_(file, parsed.產品主鍵, '產品照片資料夾', now);
    hit.row[col['產品照片主鍵']] = parsed.產品主鍵;
    hit.row[col['產品照片來源資料夾']] = '產品照片資料夾';
    hit.row[col['產品照片啟用']] = '是';
    hit.row[col['產品照片更新時間']] = now;
    hit.row[col['產品照片備註']] = '產品照片資料夾同步｜' + file.name;

    if (parsed.視圖 === '前視圖') 主檔照片_寫入產品視圖欄位_(hit.row, col, '前視圖', f);
    else if (parsed.視圖 === '側視圖') 主檔照片_寫入產品視圖欄位_(hit.row, col, '側視圖', f);
    else if (parsed.視圖 === '俯視圖') 主檔照片_寫入產品視圖欄位_(hit.row, col, '俯視圖', f);
    else 主檔照片_寫入產品主圖欄位_(hit.row, col, f);

    hit.row[col['三視圖完整度']] = 主檔照片_計算三視圖完整度_(hit.row, col);
    updated++;
  });

  if (rows.length && dataRange) dataRange.setValues(rows);
  return { 成功: true, 類型: '產品', 資料夾檔案數: files.length, 更新: updated, 未匹配: unmatched, 同步時間: now };
}

function 主檔照片_解析產品照片檔名_(name) {
  let base = 主檔照片_去副檔名_(name);
  let view = '主圖';
  if (/前視|正面|FRONT/i.test(base)) view = '前視圖';
  else if (/側視|側面|SIDE/i.test(base)) view = '側視圖';
  else if (/俯視|上視|TOP/i.test(base)) view = '俯視圖';
  base = base.replace(/[_\-\s]*(前視|正面|FRONT|側視|側面|SIDE|俯視|上視|TOP)$/i, '');
  return { 產品主鍵: base, 視圖: view };
}

function 主檔照片_寫入產品主圖欄位_(row, col, f) {
  row[col['產品主圖檔案ID']] = f.檔案ID;
  row[col['產品主圖檔名']] = f.檔名;
  row[col['產品主圖網址']] = f.照片網址;
  row[col['產品主圖縮圖網址']] = f.縮圖網址;
}

function 主檔照片_寫入產品視圖欄位_(row, col, view, f) {
  row[col[view + '檔案ID']] = f.檔案ID;
  row[col[view + '檔名']] = f.檔名;
  row[col[view + '網址']] = f.照片網址;
  row[col[view + '縮圖網址']] = f.縮圖網址;
}

function 主檔照片_計算三視圖完整度_(row, col) {
  let count = 0;
  if (row[col['前視圖檔案ID']]) count++;
  if (row[col['側視圖檔案ID']]) count++;
  if (row[col['俯視圖檔案ID']]) count++;
  return count + '/3';
}

function 主檔照片_寫入照片欄位_(row, col, fields, obj) {
  row[col[fields.照片主鍵]] = obj.照片主鍵;
  row[col[fields.檔案ID]] = obj.檔案ID;
  row[col[fields.檔名]] = obj.檔名;
  row[col[fields.照片網址]] = obj.照片網址;
  row[col[fields.縮圖網址]] = obj.縮圖網址;
  row[col[fields.來源資料夾]] = obj.來源資料夾;
  row[col[fields.啟用]] = '是';
  row[col[fields.更新時間]] = obj.更新時間;
  row[col[fields.備註]] = obj.來源資料夾 + '同步｜' + obj.檔名;
}

function 主檔照片_建立主檔照片欄位值_(file, key, source, now) {
  return {
    照片主鍵: key,
    檔案ID: file.id,
    檔名: file.name,
    照片網址: 'https://drive.google.com/file/d/' + file.id + '/view',
    縮圖網址: 'https://drive.google.com/thumbnail?id=' + file.id + '&sz=' + 主檔照片_設定_.縮圖尺寸,
    來源資料夾: source,
    更新時間: now
  };
}

function 主檔照片_讀取圖片資料夾_(folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const out = [];
  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType() || '';
    if (mime.indexOf('image/') !== 0) continue;
    out.push({ id: file.getId(), name: file.getName(), mime: mime, size: file.getSize(), updated: file.getLastUpdated() });
  }
  return out;
}

function 主檔照片_確保欄位_(sh, required) {
  const lastCol = Math.max(sh.getLastColumn(), 1);
  let header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(主檔照片_文字_);
  required.forEach(function(h) { if (header.indexOf(h) < 0) header.push(h); });
  if (header.length > sh.getLastColumn()) sh.insertColumnsAfter(sh.getLastColumn(), header.length - sh.getLastColumn());
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  sh.setFrozenRows(1);
  return header;
}

function 主檔照片_欄位索引_(header) {
  const obj = {};
  header.forEach(function(h, i) { obj[h] = i; });
  return obj;
}

function 主檔照片_由人員照片檔名取主鍵_(name) {
  return 主檔照片_去副檔名_(name).toUpperCase();
}

function 主檔照片_由機台照片檔名取主鍵_(name) {
  const base = 主檔照片_去副檔名_(name);
  const m = base.match(/(?:機台|MH[-_\s]*)?(\d{1,5})/i);
  return m && m[1] ? String(Number(m[1])) : base;
}

/* ========================================================================
 * 報工 V2 照片索引讀取：改讀三個主檔
 * ======================================================================== */

function 建立照片索引_() {
  const idx = { __筆數: 0, __來源: '主檔直掛照片' };
  主檔照片_加入人員照片索引_(idx);
  主檔照片_加入產品照片索引_(idx);
  主檔照片_加入機台照片索引_(idx);
  return idx;
}

function 主檔照片_加入人員照片索引_(idx) {
  const rows = 主檔照片_讀表物件_('01_人員主檔');
  rows.forEach(function(r) {
    if (主檔照片_文字_(r.啟用 || '是') === '否') return;
    if (主檔照片_文字_(r.人員照片啟用 || '是') === '否') return;
    const fileId = 主檔照片_文字_(r.人員照片檔案ID);
    const photoUrl = 主檔照片_轉Google圖片網址_(r.人員照片網址 || r.人員縮圖網址 || fileId);
    const thumbUrl = 主檔照片_轉Google圖片網址_(r.人員縮圖網址 || r.人員照片網址 || fileId);
    if (!photoUrl && !thumbUrl && !fileId) return;
    const obj = { 照片類型: '人員照片', 照片網址: photoUrl || thumbUrl || '', 縮圖網址: thumbUrl || photoUrl || '', 檔案ID: fileId, 對應主鍵: 主檔照片_文字_(r.照片主鍵 || r.工號), 檔案名稱: 主檔照片_文字_(r.人員照片檔名), 來源: '01_人員主檔' };
    主檔照片_加入索引_(idx, r.工號, obj);
    主檔照片_加入索引_(idx, r.姓名, obj);
    主檔照片_加入索引_(idx, r.照片主鍵, obj);
    主檔照片_加入索引_(idx, r.人員照片檔名, obj);
    主檔照片_加入索引_(idx, 主檔照片_去副檔名_(r.人員照片檔名), obj);
  });
}

function 主檔照片_加入產品照片索引_(idx) {
  const rows = 主檔照片_讀表物件_('02_產品主檔');
  rows.forEach(function(r) {
    if (主檔照片_文字_(r.啟用 || '是') === '否') return;
    if (主檔照片_文字_(r.產品照片啟用 || '是') === '否') return;
    const keys = [r.產品照片主鍵, r.產品編號, r.客戶品號, r.品名].filter(Boolean);
    const main = 主檔照片_建立照片物件_('產品照片', r.產品主圖檔案ID, r.產品主圖檔名, r.產品主圖網址, r.產品主圖縮圖網址, '02_產品主檔');
    const front = 主檔照片_建立照片物件_('產品前視圖', r.前視圖檔案ID, r.前視圖檔名, r.前視圖網址, r.前視圖縮圖網址, '02_產品主檔');
    const side = 主檔照片_建立照片物件_('產品側視圖', r.側視圖檔案ID, r.側視圖檔名, r.側視圖網址, r.側視圖縮圖網址, '02_產品主檔');
    const top = 主檔照片_建立照片物件_('產品俯視圖', r.俯視圖檔案ID, r.俯視圖檔名, r.俯視圖網址, r.俯視圖縮圖網址, '02_產品主檔');
    const defaultPhoto = main.照片網址 || main.縮圖網址 ? main : (front.照片網址 || front.縮圖網址 ? front : (side.照片網址 || side.縮圖網址 ? side : top));
    if (!defaultPhoto.照片網址 && !defaultPhoto.縮圖網址 && !defaultPhoto.檔案ID) return;
    keys.forEach(function(k) {
      主檔照片_加入索引_(idx, k, defaultPhoto);
      主檔照片_加入索引_(idx, k + '_主圖', main);
      主檔照片_加入索引_(idx, k + '_前視圖', front);
      主檔照片_加入索引_(idx, k + '_側視圖', side);
      主檔照片_加入索引_(idx, k + '_俯視圖', top);
    });
  });
}

function 主檔照片_加入機台照片索引_(idx) {
  const rows = 主檔照片_讀表物件_('03_機台主檔');
  rows.forEach(function(r) {
    if (主檔照片_文字_(r.啟用 || '是') === '否') return;
    if (主檔照片_文字_(r.機台照片啟用 || '是') === '否') return;
    const fileId = 主檔照片_文字_(r.機台照片檔案ID);
    const photoUrl = 主檔照片_轉Google圖片網址_(r.機台照片網址 || r.機台縮圖網址 || fileId);
    const thumbUrl = 主檔照片_轉Google圖片網址_(r.機台縮圖網址 || r.機台照片網址 || fileId);
    if (!photoUrl && !thumbUrl && !fileId) return;
    const obj = { 照片類型: '機台照片', 照片網址: photoUrl || thumbUrl || '', 縮圖網址: thumbUrl || photoUrl || '', 檔案ID: fileId, 對應主鍵: 主檔照片_文字_(r.機台照片主鍵 || r.機台編號), 檔案名稱: 主檔照片_文字_(r.機台照片檔名), 來源: '03_機台主檔' };
    主檔照片_產生機台鍵_(r.機台編號, r.機台照片主鍵, r.機台照片檔名, r.機台名稱, r.型號).forEach(function(k) { 主檔照片_加入索引_(idx, k, obj); });
  });
}

function 主檔照片_建立照片物件_(type, fileId, fileName, photoUrl, thumbUrl, source) {
  const id = 主檔照片_文字_(fileId);
  const p = 主檔照片_轉Google圖片網址_(photoUrl || thumbUrl || id);
  const t = 主檔照片_轉Google圖片網址_(thumbUrl || photoUrl || id);
  return { 照片類型: type, 照片網址: p || t || '', 縮圖網址: t || p || '', 檔案ID: id, 對應主鍵: '', 檔案名稱: 主檔照片_文字_(fileName), 來源: source };
}

function 取索引照片_(idx, keys, typeKeyword) {
  if (!idx || !keys) return 主檔照片_空照片資料_();
  const candidateKeys = [];
  keys.forEach(function(k) {
    candidateKeys.push(k);
    if (typeKeyword && 主檔照片_文字_(typeKeyword).indexOf('機台') >= 0) 主檔照片_產生機台鍵_(k, k, k).forEach(function(x) { candidateKeys.push(x); });
  });
  for (const key of candidateKeys) {
    const k = 主檔照片_Key_(key);
    const list = idx[k] || [];
    if (!list.length) continue;
    const hit = list.find(function(x) { return !typeKeyword || 主檔照片_文字_(x.照片類型).indexOf(typeKeyword) >= 0; }) || list[0];
    return { 照片網址: hit.照片網址 || hit.縮圖網址 || '', 縮圖網址: hit.縮圖網址 || hit.照片網址 || '', 檔案ID: hit.檔案ID || '' };
  }
  return 主檔照片_空照片資料_();
}

function 主檔照片_加入索引_(idx, key, obj) {
  const k = 主檔照片_Key_(key);
  if (!k) return;
  if (!idx[k]) idx[k] = [];
  if (主檔照片_文字_(obj.照片類型).indexOf('機台') >= 0) idx[k].unshift(obj);
  else idx[k].push(obj);
  idx.__筆數 = Number(idx.__筆數 || 0) + 1;
}

function 主檔照片_產生機台鍵_() {
  const keys = [];
  Array.prototype.slice.call(arguments).forEach(function(raw) {
    const s = 主檔照片_文字_(raw);
    if (!s) return;
    keys.push(s);
    keys.push(s.toUpperCase());
    keys.push(主檔照片_去副檔名_(s));
    const m = s.match(/(?:機台|MH[-_\s]*)?(\d{1,5})/i);
    if (m && m[1]) {
      const n = String(Number(m[1]));
      const pad3 = n.padStart(3, '0');
      keys.push(n, pad3, 'MH-' + n, 'MH-' + pad3, 'MH_' + n, '機台' + n, n + '.jpg', pad3 + '.jpg');
    }
  });
  return Array.from(new Set(keys.filter(Boolean)));
}

function 主檔照片_讀表物件_(sheetName) {
  const ss = SpreadsheetApp.openById(主檔照片_設定_.試算表ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0].map(主檔照片_文字_);
  return values.slice(1).map(function(row) {
    const obj = {};
    header.forEach(function(h, i) { if (h) obj[h] = row[i]; });
    return obj;
  });
}

function 主檔照片_轉Google圖片網址_(v) {
  const s = 主檔照片_文字_(v);
  if (!s) return '';
  if (/^https:\/\/drive\.google\.com\/thumbnail\?id=/i.test(s)) return s;
  let id = '';
  const m1 = s.match(/\/file\/d\/([^/]+)/);
  if (m1 && m1[1]) id = m1[1];
  const m2 = s.match(/[?&]id=([^&]+)/);
  if (!id && m2 && m2[1]) id = m2[1];
  if (!id && !/^https?:\/\//i.test(s)) id = s;
  if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=' + 主檔照片_設定_.縮圖尺寸;
  return s;
}

function 主檔照片_Key_(v) { return 主檔照片_文字_(v).toUpperCase().replace(/\s+/g, '').replace(/_/g, '-'); }
function 主檔照片_去副檔名_(name) { return 主檔照片_文字_(name).replace(/\.(jpg|jpeg|png|gif|heic|heif|webp|jpd)$/i, '').trim(); }
function 主檔照片_文字_(v) { return String(v == null ? '' : v).trim(); }
function 主檔照片_空照片資料_() { return { 照片網址: '', 縮圖網址: '', 檔案ID: '' }; }
function 主檔照片_格式化日期時間_(d) { return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'); }
function 主檔照片_寫入操作紀錄_(action, result) {
  try {
    const sh = SpreadsheetApp.openById(主檔照片_設定_.試算表ID).getSheetByName('系統_操作紀錄');
    if (sh) sh.appendRow([new Date(), '主檔照片', action, JSON.stringify(result), '系統', 'ZZZZZZZ_主檔照片直掛讀取正式版.gs']);
  } catch (e) {}
}
