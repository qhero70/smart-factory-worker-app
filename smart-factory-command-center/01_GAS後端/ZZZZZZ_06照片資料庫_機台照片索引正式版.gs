/**
 * ZZZZZZ_06照片資料庫_機台照片索引正式版
 * 版本：v1.1.0｜補強 06_照片資料庫 機台照片索引 + 機台照片資料夾重刷同步
 *
 * 本檔用途：
 * 1. 不修改 07_報工作業V2.html UI。
 * 2. 不修改報工送出流程。
 * 3. 讓 06_照片資料庫 可以依照「機台照片資料夾」重刷同步。
 * 4. 機台照片資料夾新增照片 → 自動新增或更新 06_照片資料庫。
 * 5. 機台照片資料夾刪除照片 → 06_照片資料庫 舊機台照片自動停用。
 * 6. 報工 V2 只讀取 啟用=是 的機台照片。
 * 7. 讓機台照片可用 489、489.jpg、MH-489、機台489 等鍵值命中。
 *
 * 正式資料：
 * - 試算表：智慧製造中央作戰指揮中心資料庫
 * - Spreadsheet ID：1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ
 * - 分頁：06_照片資料庫
 * - 機台照片資料夾 ID：1hosm3_uUopyO3AnjnDA3qmkCYZZ4bAtE
 *
 * 使用方式：
 * 1. 手動重刷：執行 手動重刷_06照片資料庫_機台照片()
 * 2. 安裝自動同步：執行 安裝_06照片資料庫_機台照片自動同步()
 * 3. 移除自動同步：執行 移除_06照片資料庫_機台照片自動同步()
 */

const 報工V2_照片同步設定_ = {
  試算表ID: '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  照片資料庫分頁: '06_照片資料庫',
  機台照片資料夾ID: '1hosm3_uUopyO3AnjnDA3qmkCYZZ4bAtE',
  縮圖尺寸: 'w800'
};

/**
 * 手動重刷入口：給 Apps Script 直接執行。
 */
function 手動重刷_06照片資料庫_機台照片() {
  return 同步_06照片資料庫_機台照片資料夾();
}

/**
 * 相容入口：名稱短一點，方便日後 LINE Bot 或維護工具呼叫。
 */
function 重刷_06照片資料庫_機台照片() {
  return 同步_06照片資料庫_機台照片資料夾();
}

/**
 * 正式同步函數：
 * - 讀取機台照片資料夾中的「直接檔案」。
 * - 只處理圖片 MIME。
 * - 檔名去副檔名後作為機台編號主鍵，例如 489.jpg → 489。
 * - 目前不遞迴子資料夾，避免誤把已封存或舊資料夾內容重新啟用。
 */
function 同步_06照片資料庫_機台照片資料夾() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.openById(報工V2_照片同步設定_.試算表ID);
    const sh = ss.getSheetByName(報工V2_照片同步設定_.照片資料庫分頁);
    if (!sh) throw new Error('找不到分頁：' + 報工V2_照片同步設定_.照片資料庫分頁);

    const header = 報工V2_確保照片資料庫欄位_(sh);
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    const now = 報工V2_格式化日期時間_(new Date());
    const folder = DriveApp.getFolderById(報工V2_照片同步設定_.機台照片資料夾ID);
    const driveFiles = 報工V2_讀取機台照片資料夾檔案_(folder);
    const driveIdSet = new Set(driveFiles.map(function(f) { return f.id; }));

    let values = lastRow >= 2
      ? sh.getRange(2, 1, lastRow - 1, lastCol).getValues()
      : [];

    const col = 報工V2_欄位索引_(header);
    const byFileId = new Map();
    const byFileName = new Map();
    let 停用 = 0;

    values.forEach(function(row, i) {
      const rowIndex = i + 2;
      const 類型 = 報工V2_文字_(row[col.照片類型]);
      const 檔案ID = 報工V2_文字_(row[col.Google檔案ID]);
      const 檔名 = 報工V2_文字_(row[col.檔案名稱]);

      if (檔案ID) byFileId.set(檔案ID, { row: row, rowIndex: rowIndex, index: i });
      if (檔名) byFileName.set(檔名.toLowerCase(), { row: row, rowIndex: rowIndex, index: i });

      // 資料夾已刪除的機台照片，一律停用，避免舊機台照片繼續被前端抓到。
      if (類型.indexOf('機台') >= 0 && 檔案ID && !driveIdSet.has(檔案ID)) {
        if (報工V2_文字_(row[col.啟用]) !== '否') 停用++;
        row[col.啟用] = '否';
        row[col.上傳狀態] = '已停用';
        row[col.備註] = 'Drive資料夾同步｜機台照片已從資料夾移除或停用｜重新同步後停用';
        row[col.更新時間] = now;
      }
    });

    let 新增 = 0;
    let 更新 = 0;

    driveFiles.forEach(function(f) {
      const 機台編號 = 報工V2_由機台照片檔名取主鍵_(f.name);
      if (!機台編號) return;

      const rowObj = byFileId.get(f.id) || byFileName.get(f.name.toLowerCase());
      const newRow = 報工V2_建立機台照片列_(header, f, 機台編號, now);

      if (rowObj) {
        const row = rowObj.row;
        header.forEach(function(h, c) {
          if (Object.prototype.hasOwnProperty.call(newRow, h)) row[c] = newRow[h];
        });
        更新++;
      } else {
        const arr = header.map(function(h) { return Object.prototype.hasOwnProperty.call(newRow, h) ? newRow[h] : ''; });
        values.push(arr);
        新增++;
      }
    });

    if (values.length > 0) {
      sh.getRange(2, 1, values.length, header.length).setValues(values.map(function(row) {
        const copy = row.slice(0, header.length);
        while (copy.length < header.length) copy.push('');
        return copy;
      }));
    }

    const result = {
      成功: true,
      訊息: '06_照片資料庫 機台照片同步完成',
      資料夾檔案數: driveFiles.length,
      新增: 新增,
      更新: 更新,
      停用: 停用,
      同步時間: now
    };

    報工V2_寫入照片同步紀錄_(result);
    return result;
  } finally {
    lock.releaseLock();
  }
}

/**
 * 安裝每 15 分鐘自動同步。
 * DriveApp 沒有原生資料夾變更觸發器，所以採用時間觸發器巡檢。
 */
function 安裝_06照片資料庫_機台照片自動同步() {
  移除_06照片資料庫_機台照片自動同步();
  ScriptApp.newTrigger('同步_06照片資料庫_機台照片資料夾')
    .timeBased()
    .everyMinutes(15)
    .create();

  return {
    成功: true,
    訊息: '已安裝 06_照片資料庫 機台照片每 15 分鐘自動同步'
  };
}

function 移除_06照片資料庫_機台照片自動同步() {
  const triggers = ScriptApp.getProjectTriggers();
  let 移除數 = 0;
  triggers.forEach(function(t) {
    if (t.getHandlerFunction && t.getHandlerFunction() === '同步_06照片資料庫_機台照片資料夾') {
      ScriptApp.deleteTrigger(t);
      移除數++;
    }
  });
  return {
    成功: true,
    訊息: '已移除 06_照片資料庫 機台照片自動同步觸發器',
    移除數: 移除數
  };
}

function 報工V2_讀取機台照片資料夾檔案_(folder) {
  const files = folder.getFiles();
  const out = [];

  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType() || '';
    if (mime.indexOf('image/') !== 0) continue;

    out.push({
      id: file.getId(),
      name: file.getName(),
      mime: mime,
      size: file.getSize(),
      updated: file.getLastUpdated()
    });
  }

  return out.sort(function(a, b) {
    return a.name.localeCompare(b.name, 'zh-Hant');
  });
}

function 報工V2_建立機台照片列_(header, file, 機台編號, now) {
  const 照片ID = 'PH-MACHINE-' + 機台編號 + '-' + file.id.slice(-8);
  const 照片網址 = 'https://drive.google.com/file/d/' + file.id + '/view';
  const 縮圖網址 = 'https://drive.google.com/thumbnail?id=' + file.id + '&sz=' + 報工V2_照片同步設定_.縮圖尺寸;

  return {
    照片ID: 照片ID,
    時間戳: now,
    作業日: 報工V2_格式化作業日_(new Date()),
    報工編號: '',
    照片類型: '機台照片',
    對應主鍵: 機台編號,
    檔案名稱: file.name,
    Google檔案ID: file.id,
    照片網址: 照片網址,
    縮圖網址: 縮圖網址,
    MIME類型: file.mime,
    檔案大小: file.size,
    啟用: '是',
    備註: 'Drive資料夾同步｜機台照片｜對應機台編號 ' + 機台編號,
    來源: '機台照片資料夾',
    前端照片索引: '',
    上傳狀態: '已上傳',
    對應表單: '03_機台主檔 / 08_工站途程機台主檔',
    對應欄位: '機台照片',
    更新時間: now
  };
}

function 報工V2_確保照片資料庫欄位_(sh) {
  const 必要欄位 = [
    '照片ID','時間戳','作業日','報工編號','照片類型','對應主鍵','檔案名稱','Google檔案ID','照片網址','縮圖網址',
    'MIME類型','檔案大小','啟用','備註','來源','前端照片索引','上傳狀態','對應表單','對應欄位','更新時間'
  ];

  const lastCol = Math.max(sh.getLastColumn(), 必要欄位.length);
  let header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(x) { return 報工V2_文字_(x); });

  必要欄位.forEach(function(h) {
    if (header.indexOf(h) < 0) header.push(h);
  });

  if (header.length > sh.getLastColumn()) {
    sh.insertColumnsAfter(sh.getLastColumn(), header.length - sh.getLastColumn());
  }

  sh.getRange(1, 1, 1, header.length).setValues([header]);
  return header;
}

function 報工V2_欄位索引_(header) {
  const obj = {};
  header.forEach(function(h, i) { obj[h] = i; });
  return obj;
}

function 報工V2_由機台照片檔名取主鍵_(name) {
  const base = 報工V2_去副檔名_(name);
  if (!base) return '';

  // 優先支援：489.jpg、MH-489.jpg、機台489.jpg。
  let m = base.match(/(?:機台|MH[-_\s]*)?(\d{1,5})/i);
  if (m && m[1]) return String(Number(m[1]));

  return base;
}

function 報工V2_寫入照片同步紀錄_(result) {
  try {
    const ss = SpreadsheetApp.openById(報工V2_照片同步設定_.試算表ID);
    const sh = ss.getSheetByName('系統_操作紀錄');
    if (!sh) return;
    sh.appendRow([
      new Date(),
      '06_照片資料庫',
      '同步機台照片資料夾',
      JSON.stringify(result),
      '系統',
      'ZZZZZZ_06照片資料庫_機台照片索引正式版.gs'
    ]);
  } catch (err) {
    // 寫紀錄失敗不影響主同步。
  }
}

function 報工V2_格式化日期時間_(d) {
  return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 報工V2_格式化作業日_(d) {
  return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
}

function 報工V2_文字_(v) {
  return String(v == null ? '' : v).trim();
}

function 報工V2_去副檔名_(name) {
  return 報工V2_文字_(name).replace(/\.(jpg|jpeg|png|gif|heic|heif|webp|jpd)$/i, '').trim();
}

/* ========================================================================
 * 報工 V2 照片索引覆寫區
 * ======================================================================== */

function 建立照片索引_() {
  const rows = 報工V2_讀表物件_('06_照片資料庫');
  const idx = { __筆數: 0 };

  rows.forEach(function(r) {
    if (報工V2_文字_(r.啟用 || '是') === '否') return;

    const 類型 = 報工V2_文字_(r.照片類型);
    const 對應主鍵 = 報工V2_文字_(r.對應主鍵);
    const 檔名 = 報工V2_文字_(r.檔案名稱);
    const 檔案ID = 報工V2_文字_(r.Google檔案ID || r.檔案ID);
    const 照片網址 = 報工V2_轉Google圖片網址_(r.照片網址 || r.縮圖網址 || 檔案ID);
    const 縮圖網址 = 報工V2_轉Google圖片網址_(r.縮圖網址 || r.照片網址 || 檔案ID);

    if (!照片網址 && !縮圖網址 && !檔案ID) return;

    const obj = {
      照片類型: 類型,
      照片網址: 照片網址 || 縮圖網址 || '',
      縮圖網址: 縮圖網址 || 照片網址 || '',
      檔案ID: 檔案ID,
      對應主鍵: 對應主鍵,
      檔案名稱: 檔名
    };

    報工V2_加入照片索引鍵_(idx, 對應主鍵, obj);
    報工V2_加入照片索引鍵_(idx, 檔名, obj);
    報工V2_加入照片索引鍵_(idx, 報工V2_去副檔名_(檔名), obj);
    報工V2_加入照片索引鍵_(idx, 檔案ID, obj);

    if (類型.indexOf('機台') >= 0) {
      const 機台鍵清單 = 報工V2_產生機台照片索引鍵_(對應主鍵, 檔名);
      機台鍵清單.forEach(function(k) {
        報工V2_加入照片索引鍵_(idx, k, obj);
      });
    }

    idx.__筆數++;
  });

  return idx;
}

function 報工V2_讀表物件_(sheetName) {
  const ss = SpreadsheetApp.openById(報工V2_照片同步設定_.試算表ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  const header = values[0].map(function(h) { return 報工V2_文字_(h); });
  return values.slice(1).map(function(row) {
    const obj = {};
    header.forEach(function(h, i) { if (h) obj[h] = row[i]; });
    return obj;
  });
}

function 報工V2_產生機台照片索引鍵_(對應主鍵, 檔名) {
  const keys = [];
  const rawList = [對應主鍵, 檔名, 報工V2_去副檔名_(檔名)].filter(Boolean);

  rawList.forEach(function(raw) {
    const s = 報工V2_文字_(raw);
    if (!s) return;

    keys.push(s);
    keys.push(s.toUpperCase());
    keys.push(s.replace(/\.(jpg|jpeg|png|gif|heic|heif|webp|jpd)$/i, ''));

    const m = s.match(/(?:機台|MH[-_\s]*)?(\d{1,5})/i);
    if (m && m[1]) {
      const n = String(Number(m[1]));
      const pad3 = n.padStart(3, '0');
      keys.push(n);
      keys.push(pad3);
      keys.push('MH-' + n);
      keys.push('MH-' + pad3);
      keys.push('MH_' + n);
      keys.push('MH_' + pad3);
      keys.push('機台' + n);
      keys.push('機台' + pad3);
      keys.push(n + '.jpg');
      keys.push(pad3 + '.jpg');
    }
  });

  return Array.from(new Set(keys.filter(Boolean)));
}

function 報工V2_加入照片索引鍵_(idx, key, obj) {
  const k = 報工V2_照片Key_(key);
  if (!k) return;
  if (!idx[k]) idx[k] = [];

  // 機台照片優先排在同 key 的前面，避免被產品照片或舊資料搶到。
  if (報工V2_文字_(obj.照片類型).indexOf('機台') >= 0) idx[k].unshift(obj);
  else idx[k].push(obj);
}

function 取索引照片_(idx, keys, typeKeyword) {
  if (!idx || !keys) return 報工V2_空照片資料_();

  const 候選鍵 = [];
  keys.forEach(function(key) {
    候選鍵.push(key);
    if (typeKeyword && 報工V2_文字_(typeKeyword).indexOf('機台') >= 0) {
      報工V2_產生機台照片索引鍵_(key, key).forEach(function(k) { 候選鍵.push(k); });
    }
  });

  for (const key of 候選鍵) {
    const k = 報工V2_照片Key_(key);
    const list = idx[k] || [];
    if (!list.length) continue;

    const hit = list.find(function(x) {
      return !typeKeyword || 報工V2_文字_(x.照片類型).indexOf(typeKeyword) >= 0;
    }) || list[0];

    return {
      照片網址: hit.照片網址 || hit.縮圖網址 || '',
      縮圖網址: hit.縮圖網址 || hit.照片網址 || '',
      檔案ID: hit.檔案ID || ''
    };
  }

  return 報工V2_空照片資料_();
}

function 報工V2_照片Key_(v) {
  return 報工V2_文字_(v).toUpperCase().replace(/\s+/g, '').replace(/_/g, '-');
}

function 報工V2_轉Google圖片網址_(v) {
  const s = 報工V2_文字_(v);
  if (!s) return '';

  if (/^https:\/\/drive\.google\.com\/thumbnail\?id=/i.test(s)) return s;

  let id = '';
  const m1 = s.match(/\/file\/d\/([^/]+)/);
  if (m1 && m1[1]) id = m1[1];
  const m2 = s.match(/[?&]id=([^&]+)/);
  if (!id && m2 && m2[1]) id = m2[1];

  if (!id && !/^https?:\/\//i.test(s)) id = s;
  if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=' + 報工V2_照片同步設定_.縮圖尺寸;

  return s;
}

function 報工V2_空照片資料_() {
  return { 照片網址: '', 縮圖網址: '', 檔案ID: '' };
}
