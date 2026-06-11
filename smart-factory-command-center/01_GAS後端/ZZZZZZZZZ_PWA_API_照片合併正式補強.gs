/**
 * 檔案名稱：ZZZZZZZZZ_PWA_API_照片合併正式補強.gs
 * 目的：
 * 1. 覆寫 PWA 初始資料 API。
 * 2. 回傳報工工站群組時，強制合併 02_產品主檔 的產品主圖 / 產品三視圖。
 * 3. 回傳機台時，強制合併 03_機台主檔 的機台照片。
 * 4. 班別清單固定補齊：早班 / 中班 / 大夜班 / 加班。
 *
 * 注意：這支是 PWA 橋接補強檔，不取代原本 07_報工作業V2.html。
 */

function PWA_API_取得報工作業v2初始資料_() {
  const 人員 = PWA照片補強_讀人員主檔_();
  const 產品 = PWA照片補強_讀產品主檔_();
  const 工站 = PWA照片補強_讀工站來源_();
  const 機台 = PWA照片補強_讀機台主檔_();
  const 不良代號 = PWA_API_讀不良代號_ ? PWA_API_讀不良代號_() : [];
  const 報工工站群組 = PWA照片補強_建立報工工站群組_(產品, 工站, 機台);

  return PWA_API_成功_({
    人員,
    人員主檔: 人員,
    staff: 人員,
    產品,
    產品主檔: 產品,
    products: 產品,
    工站,
    工站主檔: 工站,
    stations: 工站,
    機台,
    機台主檔: 機台,
    machines: 機台,
    報工工站群組,
    途程工站群組: 報工工站群組,
    workItems: 報工工站群組,
    不良代號,
    不良代碼: 不良代號,
    不良主檔: 不良代號,
    defects: 不良代號,
    班別清單: ['自動判斷', '早班', '中班', '大夜班', '加班'],
    作業日: typeof 取得作業日_ === 'function' ? 取得作業日_() : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    meta: {
      版本: 系統設定 && 系統設定.版本 ? 系統設定.版本 : 'v1.0.0',
      補強檔: 'ZZZZZZZZZ_PWA_API_照片合併正式補強.gs',
      時間戳: new Date(),
      筆數: {
        人員: 人員.length,
        產品: 產品.length,
        工站: 工站.length,
        機台: 機台.length,
        報工工站群組: 報工工站群組.length,
        產品照片: 報工工站群組.filter(x => x.產品照片網址 || x.產品主圖 || x.產品縮圖網址).length,
        機台照片: 報工工站群組.reduce((sum, g) => sum + (g.機台清單 || []).filter(m => m.照片網址 || m.縮圖網址 || m.機台照片).length, 0),
        不良代號: 不良代號.length
      }
    }
  }, 'PWA 報工 V2 初始資料取得成功：已合併主檔照片');
}

function PWA照片補強_讀表_(name) {
  if (typeof 讀表_ === 'function') return 讀表_(name) || [];
  const ss = typeof 取得試算表_ === 'function' ? 取得試算表_() : SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(h => String(h || '').trim());
  return values.filter(r => r.some(v => String(v || '').trim() !== '')).map(r => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = r[i]; });
    return obj;
  });
}

function PWA照片補強_文字_(v) {
  return String(v == null ? '' : v).trim();
}

function PWA照片補強_取值_(row, keys) {
  row = row || {};
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && PWA照片補強_文字_(row[k]) !== '') return row[k];
  }
  return '';
}

function PWA照片補強_圖片_(v) {
  let s = PWA照片補強_文字_(v);
  if (!s) return '';
  s = s.replace(/^=IMAGE\(/i, '').replace(/["'()]/g, '').trim();
  const url = s.match(/https?:\/\/[^\s,，;；]+/i);
  if (url) s = url[0];
  if (s.indexOf('data:image/') === 0) return s;
  const id = s.match(/[-\w]{25,}/);
  if (id) return 'https://drive.google.com/thumbnail?id=' + id[0] + '&sz=w900';
  return s;
}

function PWA照片補強_讀人員主檔_() {
  return PWA照片補強_讀表_('01_人員主檔')
    .filter(r => PWA照片補強_文字_(r.啟用 || '是') !== '否')
    .map(r => {
      const 班別 = PWA照片補強_取值_(r, ['班別', '班次', '工作班別', '班別名稱', '原始班別']);
      const 照片 = PWA照片補強_圖片_(PWA照片補強_取值_(r, ['人員照片', '照片網址', '縮圖網址', '作業員照片網址', '作業員縮圖網址', '圖片網址', '頭像網址', 'Google檔案ID', '照片檔案ID']));
      return {
        工號: PWA照片補強_文字_(PWA照片補強_取值_(r, ['工號', '員工編號', '員工工號', 'id'])),
        姓名: PWA照片補強_文字_(PWA照片補強_取值_(r, ['姓名', '中文名', '名字', 'name'])),
        部門: PWA照片補強_文字_(PWA照片補強_取值_(r, ['部門', '單位', 'dept'])),
        組別: PWA照片補強_文字_(PWA照片補強_取值_(r, ['組別', '班組', 'group'])),
        職稱: PWA照片補強_文字_(PWA照片補強_取值_(r, ['職稱', '職位', 'title'])),
        班別: typeof 標準化班別_ === 'function' ? 標準化班別_(班別) : PWA照片補強_文字_(班別),
        啟用: r.啟用 || '是',
        人員照片: 照片,
        照片網址: 照片,
        縮圖網址: 照片,
        Google檔案ID: PWA照片補強_文字_(PWA照片補強_取值_(r, ['Google檔案ID', '照片檔案ID', '作業員照片檔案ID', '檔案ID']))
      };
    }).filter(x => x.工號 || x.姓名);
}

function PWA照片補強_讀產品主檔_() {
  return PWA照片補強_讀表_('02_產品主檔')
    .filter(r => PWA照片補強_文字_(r.啟用 || '是') !== '否')
    .map(r => {
      const 主圖來源 = PWA照片補強_取值_(r, [
        '產品主圖', '產品照片網址', '產品縮圖網址', '產品圖片網址', '主圖', '照片網址', '縮圖網址', '圖片網址',
        '產品主圖ID', '產品照片檔案ID', 'Google檔案ID', '照片檔案ID', '檔案ID'
      ]);
      const 三視圖來源 = PWA照片補強_取值_(r, ['產品三視圖', '三視圖', '三視圖網址', '產品三視圖網址', '三視圖檔案ID', '產品三視圖檔案ID']);
      const 主圖 = PWA照片補強_圖片_(主圖來源);
      const 三視圖 = PWA照片補強_圖片_(三視圖來源);
      return {
        產品編號: PWA照片補強_文字_(PWA照片補強_取值_(r, ['產品編號', '料號', '品號', '產品料號', 'productNo'])),
        客戶品號: PWA照片補強_文字_(PWA照片補強_取值_(r, ['客戶品號', '客戶料號'])),
        品名: PWA照片補強_文字_(PWA照片補強_取值_(r, ['品名', '產品名稱', 'name'])),
        分類: PWA照片補強_文字_(PWA照片補強_取值_(r, ['分類', '產品分類'])),
        標準工時_秒: PWA照片補強_取值_(r, ['標準工時_秒', '標準工時']),
        '8小時標準產能': PWA照片補強_取值_(r, ['8小時標準產能', '標準產能_班', '8H產能']),
        啟用: r.啟用 || '是',
        產品主圖: 主圖,
        產品照片網址: 主圖,
        產品縮圖網址: 主圖,
        產品三視圖: 三視圖,
        產品照片檔案ID: PWA照片補強_文字_(PWA照片補強_取值_(r, ['產品照片檔案ID', 'Google檔案ID', '照片檔案ID', '檔案ID']))
      };
    }).filter(x => x.產品編號 || x.客戶品號 || x.品名);
}

function PWA照片補強_讀工站來源_() {
  let rows = [];
  if (typeof 讀正式工站來源_ === 'function') rows = 讀正式工站來源_() || [];
  if (!rows.length) rows = PWA照片補強_讀表_('08_工站途程機台主檔');
  if (!rows.length) rows = PWA照片補強_讀表_('04_工站主檔');
  return rows;
}

function PWA照片補強_讀機台主檔_() {
  return PWA照片補強_讀表_('03_機台主檔')
    .filter(r => PWA照片補強_文字_(r.啟用 || '是') !== '否')
    .map(r => {
      const 圖 = PWA照片補強_圖片_(PWA照片補強_取值_(r, ['機台照片', '機台照片網址', '照片網址', '縮圖網址', '機台縮圖網址', '圖片網址', '機台照片檔案ID', 'Google檔案ID', '照片檔案ID', '檔案ID']));
      const id = PWA照片補強_文字_(PWA照片補強_取值_(r, ['機台編號', '機台代號', '設備編號', 'machineId']));
      return {
        機台編號: id,
        機台名稱: PWA照片補強_文字_(PWA照片補強_取值_(r, ['機台名稱', '設備名稱', '名稱', 'machineName'])) || id,
        工站編號: PWA照片補強_文字_(PWA照片補強_取值_(r, ['工站編號', '工站代碼', '工站代號', '工站名稱'])),
        區域: PWA照片補強_文字_(PWA照片補強_取值_(r, ['區域', '位置', 'area'])),
        型號: PWA照片補強_文字_(PWA照片補強_取值_(r, ['型號', '機台型號'])),
        機台照片: 圖,
        照片網址: 圖,
        縮圖網址: 圖
      };
    }).filter(x => x.機台編號 || x.機台名稱);
}

function PWA照片補強_產品Key_(p) {
  const keys = [];
  ['產品編號', '客戶品號', '品名'].forEach(k => {
    if (p[k]) keys.push(PWA照片補強_文字_(p[k]));
  });
  return keys;
}

function PWA照片補強_找產品_(row, 產品) {
  const rowKeys = [
    PWA照片補強_文字_(PWA照片補強_取值_(row, ['產品編號', '料號', '品號', '產品料號'])),
    PWA照片補強_文字_(PWA照片補強_取值_(row, ['客戶品號', '客戶料號'])),
    PWA照片補強_文字_(PWA照片補強_取值_(row, ['品名', '產品名稱']))
  ].filter(Boolean);
  return 產品.find(p => PWA照片補強_產品Key_(p).some(k => rowKeys.indexOf(k) >= 0)) || {};
}

function PWA照片補強_建立報工工站群組_(產品, 工站, 機台) {
  const source = 工站.length ? 工站 : 產品.map(p => Object.assign({}, p, { 工站名稱: '未指定工站', 報工工站名稱: '未指定工站' }));
  return source.map(row => {
    const p = PWA照片補強_找產品_(row, 產品);
    const 產品編號 = PWA照片補強_文字_(PWA照片補強_取值_(row, ['產品編號', '料號', '品號', '產品料號'])) || p.產品編號 || '';
    const 客戶品號 = PWA照片補強_文字_(PWA照片補強_取值_(row, ['客戶品號', '客戶料號'])) || p.客戶品號 || '';
    const 品名 = PWA照片補強_文字_(PWA照片補強_取值_(row, ['品名', '產品名稱'])) || p.品名 || '';
    const 工站名稱 = PWA照片補強_文字_(PWA照片補強_取值_(row, ['報工工站名稱', '工站名稱', '名稱', '工站編號', '工站代碼'])) || '未指定工站';
    const 工序 = PWA照片補強_文字_(PWA照片補強_取值_(row, ['工序', '工序範圍', '工序清單', '工站代碼']));
    const rawMachine = PWA照片補強_文字_(PWA照片補強_取值_(row, ['機台清單', '機台編號清單', '機台編號', '主機台']));
    let ids = rawMachine ? rawMachine.split(/[、,，;；\s]+/).filter(Boolean) : [];
    if (!ids.length) {
      ids = 機台.filter(m => [m.工站編號, m.工站名稱].some(v => PWA照片補強_文字_(v) && [工站名稱, 工序].indexOf(PWA照片補強_文字_(v)) >= 0)).map(m => m.機台編號);
    }
    const 機台清單 = ids.map(id => {
      const m = 機台.find(x => x.機台編號 === id) || {};
      return {
        機台編號: id,
        設備名稱: m.機台名稱 || id,
        區域: m.區域 || '',
        機台型號: m.型號 || '',
        照片網址: m.照片網址 || m.機台照片 || '',
        縮圖網址: m.縮圖網址 || m.照片網址 || m.機台照片 || ''
      };
    });
    const productPhoto = PWA照片補強_圖片_(PWA照片補強_取值_(row, ['產品主圖', '產品照片網址', '產品縮圖網址', '照片網址', '圖片網址'])) || p.產品照片網址 || p.產品主圖 || p.產品縮圖網址 || '';
    const productThree = PWA照片補強_圖片_(PWA照片補強_取值_(row, ['產品三視圖', '三視圖', '三視圖網址'])) || p.產品三視圖 || '';
    return Object.assign({}, row, {
      產品編號,
      客戶品號,
      品名,
      產品主圖: productPhoto,
      產品照片網址: productPhoto,
      產品縮圖網址: productPhoto,
      產品三視圖: productThree,
      產品照片檔案ID: p.產品照片檔案ID || '',
      工站名稱,
      報工工站名稱: 工站名稱,
      工序,
      工序範圍: PWA照片補強_文字_(PWA照片補強_取值_(row, ['工序範圍'])) || 工序,
      工序清單: 工序 ? 工序.split(/[、,，;；\s]+/).filter(Boolean) : [],
      機台清單,
      主機台: PWA照片補強_文字_(PWA照片補強_取值_(row, ['主機台'])) || (機台清單[0] ? 機台清單[0].機台編號 : ''),
      標準產能: PWA照片補強_取值_(row, ['標準產能', '標準產能_班', '8小時標準產能']) || p['8小時標準產能'] || '',
      標準工時_秒: PWA照片補強_取值_(row, ['標準工時_秒', '標準工時']) || p.標準工時_秒 || ''
    });
  }).filter(x => x.產品編號 || x.客戶品號 || x.品名 || x.報工工站名稱);
}
