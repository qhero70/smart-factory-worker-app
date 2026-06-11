/**
 * ZZZZZZZ_主檔照片直掛讀取正式版
 * 版本：v1.0.0｜照片改為直接掛在主檔，不再依賴 06_照片資料庫
 *
 * 架構原則：
 * 1. 人員照片直接讀 01_人員主檔。
 * 2. 產品照片與三視圖直接讀 02_產品主檔。
 * 3. 機台照片直接讀 03_機台主檔。
 * 4. 06_照片資料庫 改為停用封存，不再作為報工 V2 主要照片來源。
 * 5. 不修改 07_報工作業V2.html UI。
 *
 * 主檔新增欄位：
 * - 01_人員主檔：照片主鍵、人員照片檔案ID、人員照片檔名、人員照片網址、人員縮圖網址、人員照片來源資料夾、人員照片啟用、人員照片更新時間、人員照片備註
 * - 02_產品主檔：產品照片主鍵、產品主圖檔案ID、產品主圖檔名、產品主圖網址、產品主圖縮圖網址、前視圖檔案ID、前視圖檔名、前視圖網址、前視圖縮圖網址、側視圖檔案ID、側視圖檔名、側視圖網址、側視圖縮圖網址、俯視圖檔案ID、俯視圖檔名、俯視圖網址、俯視圖縮圖網址、產品照片來源資料夾、產品照片啟用、產品照片更新時間、產品照片備註、三視圖完整度
 * - 03_機台主檔：機台照片主鍵、機台照片檔案ID、機台照片檔名、機台照片網址、機台縮圖網址、機台照片來源資料夾、機台照片啟用、機台照片更新時間、機台照片備註
 */

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

    const obj = {
      照片類型: '人員照片',
      照片網址: photoUrl || thumbUrl || '',
      縮圖網址: thumbUrl || photoUrl || '',
      檔案ID: fileId,
      對應主鍵: 主檔照片_文字_(r.照片主鍵 || r.工號),
      檔案名稱: 主檔照片_文字_(r.人員照片檔名),
      來源: '01_人員主檔'
    };

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

    const obj = {
      照片類型: '機台照片',
      照片網址: photoUrl || thumbUrl || '',
      縮圖網址: thumbUrl || photoUrl || '',
      檔案ID: fileId,
      對應主鍵: 主檔照片_文字_(r.機台照片主鍵 || r.機台編號),
      檔案名稱: 主檔照片_文字_(r.機台照片檔名),
      來源: '03_機台主檔'
    };

    主檔照片_產生機台鍵_(r.機台編號, r.機台照片主鍵, r.機台照片檔名, r.機台名稱, r.型號).forEach(function(k) {
      主檔照片_加入索引_(idx, k, obj);
    });
  });
}

function 主檔照片_建立照片物件_(type, fileId, fileName, photoUrl, thumbUrl, source) {
  const id = 主檔照片_文字_(fileId);
  const p = 主檔照片_轉Google圖片網址_(photoUrl || thumbUrl || id);
  const t = 主檔照片_轉Google圖片網址_(thumbUrl || photoUrl || id);
  return {
    照片類型: type,
    照片網址: p || t || '',
    縮圖網址: t || p || '',
    檔案ID: id,
    對應主鍵: '',
    檔案名稱: 主檔照片_文字_(fileName),
    來源: source
  };
}

function 取索引照片_(idx, keys, typeKeyword) {
  if (!idx || !keys) return 主檔照片_空照片資料_();

  const candidateKeys = [];
  keys.forEach(function(k) {
    candidateKeys.push(k);
    if (typeKeyword && 主檔照片_文字_(typeKeyword).indexOf('機台') >= 0) {
      主檔照片_產生機台鍵_(k, k, k).forEach(function(x) { candidateKeys.push(x); });
    }
  });

  for (const key of candidateKeys) {
    const k = 主檔照片_Key_(key);
    const list = idx[k] || [];
    if (!list.length) continue;

    const hit = list.find(function(x) {
      return !typeKeyword || 主檔照片_文字_(x.照片類型).indexOf(typeKeyword) >= 0;
    }) || list[0];

    return {
      照片網址: hit.照片網址 || hit.縮圖網址 || '',
      縮圖網址: hit.縮圖網址 || hit.照片網址 || '',
      檔案ID: hit.檔案ID || ''
    };
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
      keys.push(n);
      keys.push(pad3);
      keys.push('MH-' + n);
      keys.push('MH-' + pad3);
      keys.push('MH_' + n);
      keys.push('機台' + n);
      keys.push(n + '.jpg');
      keys.push(pad3 + '.jpg');
    }
  });
  return Array.from(new Set(keys.filter(Boolean)));
}

function 主檔照片_讀表物件_(sheetName) {
  const ss = SpreadsheetApp.openById('1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ');
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const header = values[0].map(function(h) { return 主檔照片_文字_(h); });
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

  if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800';
  return s;
}

function 主檔照片_Key_(v) {
  return 主檔照片_文字_(v).toUpperCase().replace(/\s+/g, '').replace(/_/g, '-');
}

function 主檔照片_去副檔名_(name) {
  return 主檔照片_文字_(name).replace(/\.(jpg|jpeg|png|gif|heic|heif|webp|jpd)$/i, '').trim();
}

function 主檔照片_文字_(v) {
  return String(v == null ? '' : v).trim();
}

function 主檔照片_空照片資料_() {
  return { 照片網址: '', 縮圖網址: '', 檔案ID: '' };
}
