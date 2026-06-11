/**
 * ZZZZZZ_06照片資料庫_機台照片索引正式版
 * 版本：v1.0.0｜補強 06_照片資料庫 機台照片索引
 *
 * 目的：
 * 1. 不修改 07_報工作業V2.html UI。
 * 2. 不修改報工流程。
 * 3. 強化 06_照片資料庫 → 機台照片索引。
 * 4. 讓機台照片可用 489、489.jpg、MH-489、機台489 等鍵值命中。
 *
 * 已知正式資料：
 * - 06_照片資料庫
 * - 照片類型：機台照片
 * - 對應主鍵：489
 * - 檔案名稱：489.jpg
 * - Google檔案ID：1Bl_89ad82Fhj3OFHy9_7n4NgMl60Yhej
 */

function 建立照片索引_() {
  const rows = 讀表_('06_照片資料庫');
  const idx = { __筆數: 0 };

  rows.forEach(function(r) {
    if (文字_(r.啟用 || '是') === '否') return;

    const 類型 = 文字_(r.照片類型);
    const 對應主鍵 = 文字_(r.對應主鍵);
    const 檔名 = 文字_(r.檔案名稱);
    const 檔案ID = 文字_(r.Google檔案ID || r.檔案ID);
    const 照片網址 = 轉Google圖片網址_(r.照片網址 || r.縮圖網址 || 檔案ID);
    const 縮圖網址 = 轉Google圖片網址_(r.縮圖網址 || r.照片網址 || 檔案ID);

    if (!照片網址 && !縮圖網址 && !檔案ID) return;

    const obj = {
      照片類型: 類型,
      照片網址: 照片網址 || 縮圖網址 || '',
      縮圖網址: 縮圖網址 || 照片網址 || '',
      檔案ID: 檔案ID,
      對應主鍵: 對應主鍵,
      檔案名稱: 檔名
    };

    // 基本索引：原本就該支援的欄位。
    報工V2_加入照片索引鍵_(idx, 對應主鍵, obj);
    報工V2_加入照片索引鍵_(idx, 檔名, obj);
    報工V2_加入照片索引鍵_(idx, 去副檔名_(檔名), obj);
    報工V2_加入照片索引鍵_(idx, 檔案ID, obj);

    // 機台照片專用索引：支援 489、489.jpg、MH-489、機台489 等命中方式。
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

function 報工V2_產生機台照片索引鍵_(對應主鍵, 檔名) {
  const keys = [];
  const rawList = [對應主鍵, 檔名, 去副檔名_(檔名)].filter(Boolean);

  rawList.forEach(function(raw) {
    const s = 文字_(raw);
    if (!s) return;

    keys.push(s);
    keys.push(s.toUpperCase());
    keys.push(s.replace(/\.(jpg|jpeg|png|gif|heic|heif|webp|jpd)$/i, ''));

    const m = s.match(/(?:MH[-_\s]*)?(\d{1,5})/i);
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
  const k = 照片Key_(key);
  if (!k) return;
  if (!idx[k]) idx[k] = [];

  // 機台照片優先排在同 key 的前面，避免被產品照片或舊資料搶到。
  if (文字_(obj.照片類型).indexOf('機台') >= 0) idx[k].unshift(obj);
  else idx[k].push(obj);
}

function 取索引照片_(idx, keys, typeKeyword) {
  if (!idx || !keys) return 空照片資料_();

  const 候選鍵 = [];
  keys.forEach(function(key) {
    候選鍵.push(key);
    if (typeKeyword && 文字_(typeKeyword).indexOf('機台') >= 0) {
      報工V2_產生機台照片索引鍵_(key, key).forEach(function(k) { 候選鍵.push(k); });
    }
  });

  for (const key of 候選鍵) {
    const k = 照片Key_(key);
    const list = idx[k] || [];
    if (!list.length) continue;

    const hit = list.find(function(x) {
      return !typeKeyword || 文字_(x.照片類型).indexOf(typeKeyword) >= 0;
    }) || list[0];

    return {
      照片網址: hit.照片網址 || hit.縮圖網址 || '',
      縮圖網址: hit.縮圖網址 || hit.照片網址 || '',
      檔案ID: hit.檔案ID || ''
    };
  }

  return 空照片資料_();
}
