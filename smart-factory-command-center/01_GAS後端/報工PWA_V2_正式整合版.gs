/**
 * 檔案名稱：報工PWA_V2_正式整合版.gs
 * 專案：智慧製造中央作戰指揮中心
 * 版本：v2.0.0_正式整合版
 *
 * 目的：
 * 1. GitHub Pages PWA 對接 GAS Web App。
 * 2. 統一提供報工 V2 初始資料。
 * 3. 統一寫入 09_報工 與 09_不良紀錄。
 * 4. 整合人員照片、產品照片、機台照片直掛主檔欄位。
 * 5. 班別正式規則：目前只回傳「早班 / 大夜班 / 加班」，不再輸出中班。
 *
 * Web App 部署：
 * Execute as：Me
 * Who has access：Anyone
 */

const 報工PWA_資料庫ID = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';
const 報工PWA_版本 = 'v2.0.0_正式整合版';

const 報工PWA_報工欄位 = [
  '報工編號','時間戳','作業日','工號','姓名','班別','是否加班','加班類型',
  '作業員照片網址','產品編號','客戶品號','品名','產品照片網址',
  '工站名稱','報工工站名稱','工序','機台清單','主機台','機台照片清單JSON',
  '今日共做數','不良數','實際良品數','不良率','開始時間','結束時間','實際工時',
  '不良類別','不良代碼','不良原因','異常類型','責任歸屬','備註','現場照片JSON',
  '來源','狀態','更新時間','不良行清單JSON','不良總數','異常開始時間','異常結束時間','異常工時'
];

const 報工PWA_不良欄位 = [
  '流水號','時間戳','作業日','報工編號','工號','姓名','班別',
  '產品編號','客戶品號','品名','工站名稱','工序','機台編號','主機台','機台清單',
  '不良代碼','不良名稱','英文名稱','不良數量','責任歸屬','不良類別','不良率',
  '異常類型','異常開始時間','異常結束時間','異常工時','開始時間','結束時間','實際工時',
  '照片JSON','現場照片清單JSON','備註','來源','狀態'
];

function doPost(e) {
  try {
    const query = e && e.parameter ? e.parameter : {};
    const body = 報工PWA_解析POST(e);
    const payload = Object.assign({}, body, query);

    if (body && body.events && Array.isArray(body.events) && typeof 處理LINEWebhook_ === 'function') {
      return 處理LINEWebhook_(body);
    }

    const action = 報工PWA_文字(payload.action || payload.動作 || '健康檢查');
    return 報工PWA_JSON(報工PWA_路由(action, payload));
  } catch (err) {
    return 報工PWA_JSON(報工PWA_失敗('doPost 執行失敗：' + err.message, 'DO_POST_ERROR', { 堆疊: err.stack }));
  }
}

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const action = 報工PWA_文字(p.action || p.動作 || '健康檢查');
    return 報工PWA_JSON(報工PWA_路由(action, p));
  } catch (err) {
    return 報工PWA_JSON(報工PWA_失敗('doGet 執行失敗：' + err.message, 'DO_GET_ERROR', { 堆疊: err.stack }));
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('報工PWA正式版')
    .addItem('健康檢查', '報工PWA_測試_健康檢查')
    .addItem('主檔檢查', '報工PWA_測試_主檔檢查')
    .addItem('取得初始資料', '報工PWA_測試_取得初始資料')
    .addToUi();
}

function 報工PWA_路由(action, payload) {
  const map = {
    '健康檢查': () => 報工PWA_健康檢查(),
    '主檔檢查': () => 報工PWA_主檔檢查(),
    '取得報工作業v2初始資料': () => 報工PWA_取得初始資料(),
    '寫入報工作業v2': () => 報工PWA_寫入報工(payload),
    '寫入不良紀錄v2': () => 報工PWA_寫入不良紀錄(payload),
    '手動重刷_主檔照片': () => 報工PWA_手動重刷主檔照片(),
    '戰情': () => typeof 取得戰情 === 'function' ? 取得戰情() : 報工PWA_健康檢查(),
    'AI摘要': () => typeof 取得AI摘要 === 'function' ? 取得AI摘要() : 報工PWA_健康檢查()
  };
  if (!map[action]) return 報工PWA_失敗('未知動作：' + action, 'UNKNOWN_ACTION', { 可用動作: Object.keys(map) });
  return 報工PWA_標準回傳(map[action]());
}

function 報工PWA_健康檢查() {
  return 報工PWA_成功({
    系統: '智慧製造中央作戰指揮中心',
    模組: '報工PWA_V2_正式整合版',
    版本: 報工PWA_版本,
    時間戳: new Date(),
    資料庫ID: 報工PWA_資料庫ID,
    班別規則: '早班 / 大夜班 / 加班，無中班模式',
    目標分頁: ['09_報工', '09_不良紀錄']
  }, 'PWA API 健康檢查成功');
}

function 報工PWA_主檔檢查() {
  const names = ['01_人員主檔','02_產品主檔','03_機台主檔','04_工站主檔','08_工站途程機台主檔','05_不良代碼主檔','09_報工','09_不良紀錄'];
  const ss = 報工PWA_試算表();
  return 報工PWA_成功({
    版本: 報工PWA_版本,
    時間戳: new Date(),
    結果: names.map(name => {
      const sh = ss.getSheetByName(name);
      return { 分頁: name, 存在: !!sh, 筆數: sh ? Math.max(sh.getLastRow() - 1, 0) : 0, 欄位數: sh ? sh.getLastColumn() : 0 };
    })
  }, 'PWA 主檔檢查完成');
}

function 報工PWA_取得初始資料() {
  const 人員 = 報工PWA_讀人員();
  const 產品 = 報工PWA_讀產品();
  const 機台 = 報工PWA_讀機台();
  const 工站 = 報工PWA_讀工站();
  const 不良代號 = 報工PWA_讀不良代號();
  const 報工工站群組 = 報工PWA_建立工站群組(產品, 工站, 機台);

  return 報工PWA_成功({
    人員, 人員主檔: 人員, staff: 人員,
    產品, 產品主檔: 產品, products: 產品,
    工站, 工站主檔: 工站, stations: 工站,
    機台, 機台主檔: 機台, machines: 機台,
    不良代號, 不良代碼: 不良代號, 不良主檔: 不良代號, defects: 不良代號,
    報工工站群組,
    班別清單: ['早班', '大夜班', '加班'],
    作業日: 報工PWA_作業日(),
    meta: {
      版本: 報工PWA_版本,
      時間戳: new Date(),
      筆數: { 人員: 人員.length, 產品: 產品.length, 工站: 工站.length, 機台: 機台.length, 不良代號: 不良代號.length, 報工工站群組: 報工工站群組.length }
    }
  }, 'PWA 報工 V2 初始資料取得成功');
}

function 報工PWA_讀人員() {
  return 報工PWA_讀表('01_人員主檔')
    .filter(r => 報工PWA_文字(r.啟用 || '是') !== '否')
    .map(r => {
      const photo = 報工PWA_圖片(r, ['人員照片網址','人員縮圖網址','人員照片縮圖網址','人員照片','照片網址','縮圖網址','作業員照片網址','作業員縮圖網址','圖片網址','頭像網址'], ['人員照片檔案ID','Google檔案ID','作業員照片檔案ID','照片檔案ID','檔案ID']);
      const shift = 報工PWA_班別(r);
      return {
        工號: 報工PWA_文字(報工PWA_取值(r, ['工號','員工編號','員工工號','id'])),
        姓名: 報工PWA_文字(報工PWA_取值(r, ['姓名','中文名','名字','name'])),
        部門: 報工PWA_文字(報工PWA_取值(r, ['部門','單位','dept'])),
        組別: 報工PWA_文字(報工PWA_取值(r, ['組別','班組','group'])),
        職稱: 報工PWA_文字(報工PWA_取值(r, ['職稱','職位','title'])),
        班別: shift,
        班別名稱: shift,
        原始班別: 報工PWA_文字(報工PWA_取值(r, ['班別','班次','工作班別','原始班別'])),
        班別代碼: 報工PWA_文字(報工PWA_取值(r, ['班別代碼','班別CODE','shiftCode'])),
        班別開始時間: 報工PWA_文字(報工PWA_取值(r, ['班別開始時間','開始時間','上班時間'])),
        班別結束時間: 報工PWA_文字(報工PWA_取值(r, ['班別結束時間','結束時間','下班時間'])),
        啟用: r.啟用 || '是',
        人員照片: photo.照片網址,
        人員照片網址: photo.照片網址,
        照片網址: photo.照片網址,
        縮圖網址: photo.縮圖網址,
        Google檔案ID: photo.檔案ID
      };
    })
    .filter(x => x.工號 || x.姓名);
}

function 報工PWA_讀產品() {
  return 報工PWA_讀表('02_產品主檔')
    .filter(r => 報工PWA_文字(r.啟用 || '是') !== '否')
    .map(r => {
      const photo = 報工PWA_圖片(r, ['產品主圖網址','產品主圖縮圖網址','產品照片網址','產品縮圖網址','產品主圖','產品照片','前視圖網址','前視圖縮圖網址','側視圖網址','側視圖縮圖網址','俯視圖網址','俯視圖縮圖網址','照片網址','縮圖網址','圖片網址'], ['產品主圖檔案ID','產品照片檔案ID','Google檔案ID','照片檔案ID','檔案ID']);
      return {
        產品編號: 報工PWA_文字(報工PWA_取值(r, ['產品編號','料號','品號','產品料號'])),
        客戶品號: 報工PWA_文字(報工PWA_取值(r, ['客戶品號','客戶料號'])),
        品名: 報工PWA_文字(報工PWA_取值(r, ['品名','產品名稱','name'])),
        分類: 報工PWA_文字(報工PWA_取值(r, ['分類','產品分類'])),
        標準工時_秒: 報工PWA_取值(r, ['標準工時_秒','標準工時']),
        '8小時標準產能': 報工PWA_取值(r, ['8小時標準產能','標準產能_班','8H產能']),
        啟用: r.啟用 || '是',
        產品主圖: photo.照片網址,
        產品照片網址: photo.照片網址,
        產品縮圖網址: photo.縮圖網址 || photo.照片網址,
        產品照片: photo.照片網址,
        前視圖網址: 報工PWA_圖片文字(報工PWA_取值(r, ['前視圖網址','前視圖縮圖網址','前視圖檔案ID'])),
        側視圖網址: 報工PWA_圖片文字(報工PWA_取值(r, ['側視圖網址','側視圖縮圖網址','側視圖檔案ID'])),
        俯視圖網址: 報工PWA_圖片文字(報工PWA_取值(r, ['俯視圖網址','俯視圖縮圖網址','俯視圖檔案ID'])),
        產品照片檔案ID: photo.檔案ID
      };
    })
    .filter(x => x.產品編號 || x.客戶品號 || x.品名);
}

function 報工PWA_讀機台() {
  return 報工PWA_讀表('03_機台主檔')
    .map(r => {
      const photo = 報工PWA_圖片(r, ['機台照片網址','機台照片','照片網址','縮圖網址','機台縮圖網址','圖片網址'], ['機台照片檔案ID','Google檔案ID','照片檔案ID','檔案ID']);
      const id = 報工PWA_文字(報工PWA_取值(r, ['機台編號','機台代號','設備編號','machineId']));
      return { 機台編號: id, 機台名稱: 報工PWA_文字(報工PWA_取值(r, ['機台名稱','設備名稱','名稱'])) || id, 工站編號: 報工PWA_文字(報工PWA_取值(r, ['工站編號','工站代碼','工站代號','工站名稱'])), 區域: 報工PWA_文字(報工PWA_取值(r, ['區域','位置','area'])), 照片網址: photo.照片網址, 縮圖網址: photo.縮圖網址, 機台照片: photo.照片網址 };
    })
    .filter(x => x.機台編號 || x.機台名稱);
}

function 報工PWA_讀工站() {
  let rows = 報工PWA_讀表('08_工站途程機台主檔');
  if (!rows.length) rows = 報工PWA_讀表('04_工站主檔');
  return rows.map(r => ({
    產品編號: 報工PWA_文字(報工PWA_取值(r, ['產品編號','料號','品號','產品料號'])),
    客戶品號: 報工PWA_文字(報工PWA_取值(r, ['客戶品號','客戶料號'])),
    品名: 報工PWA_文字(報工PWA_取值(r, ['品名','產品名稱'])),
    工站名稱: 報工PWA_文字(報工PWA_取值(r, ['報工工站名稱','工站名稱','名稱','工站編號','工站代碼'])) || '未指定工站',
    報工工站名稱: 報工PWA_文字(報工PWA_取值(r, ['報工工站名稱','工站名稱','名稱'])) || '未指定工站',
    工序: 報工PWA_文字(報工PWA_取值(r, ['工序','工序範圍','工序清單','工站代碼'])),
    主機台: 報工PWA_文字(報工PWA_取值(r, ['主機台','機台編號'])),
    機台清單: 報工PWA_文字(報工PWA_取值(r, ['機台清單','機台編號清單','機台編號','主機台'])),
    標準產能: 報工PWA_取值(r, ['標準產能','標準產能_班','8小時標準產能']),
    標準工時_秒: 報工PWA_取值(r, ['標準工時_秒','標準工時'])
  })).filter(x => x.產品編號 || x.客戶品號 || x.品名 || x.工站名稱);
}

function 報工PWA_讀不良代號() {
  let rows = 報工PWA_讀表('05_不良代碼主檔');
  if (!rows.length) rows = 報工PWA_讀表('不良代號');
  return rows.map(r => {
    const code = 報工PWA_文字(報工PWA_取值(r, ['不良代號','不良代碼','代號','代碼','code']));
    return { 分類: 報工PWA_文字(報工PWA_取值(r, ['分類','category'])) || code.charAt(0) || 'Z', 代碼: code, 名稱: 報工PWA_文字(報工PWA_取值(r, ['不良名稱','中文名稱','名稱','name'])), 英文名稱: 報工PWA_文字(報工PWA_取值(r, ['英文名稱','英文','english','en'])) };
  }).filter(x => x.代碼 || x.名稱);
}

function 報工PWA_建立工站群組(產品, 工站, 機台) {
  const source = 工站.length ? 工站 : 產品.map(p => Object.assign({}, p, { 工站名稱: '未指定工站', 報工工站名稱: '未指定工站' }));
  return source.map(row => {
    const keys = [row.產品編號, row.客戶品號, row.品名].map(報工PWA_文字).filter(Boolean);
    const p = 產品.find(prod => [prod.產品編號, prod.客戶品號, prod.品名].some(k => k && keys.indexOf(k) >= 0)) || {};
    let ids = Array.isArray(row.機台清單) ? row.機台清單.map(x => 報工PWA_文字(x.機台編號 || x.主機台 || x)) : 報工PWA_文字(row.機台清單 || row.主機台).split(/[、,，;；\s]+/).filter(Boolean);
    const 機台清單 = ids.map(id => { const m = 機台.find(x => x.機台編號 === id) || {}; return { 機台編號: id, 設備名稱: m.機台名稱 || id, 機台名稱: m.機台名稱 || id, 區域: m.區域 || '', 照片網址: m.照片網址 || m.機台照片 || '', 縮圖網址: m.縮圖網址 || m.照片網址 || m.機台照片 || '' }; });
    return Object.assign({}, row, { 產品編號: row.產品編號 || p.產品編號 || '', 客戶品號: row.客戶品號 || p.客戶品號 || '', 品名: row.品名 || p.品名 || '', 產品照片網址: row.產品照片網址 || p.產品照片網址 || p.產品主圖 || '', 產品縮圖網址: row.產品縮圖網址 || p.產品縮圖網址 || p.產品照片網址 || '', 產品主圖: row.產品主圖 || p.產品主圖 || p.產品照片網址 || '', 工站名稱: row.工站名稱 || row.報工工站名稱 || '未指定工站', 報工工站名稱: row.報工工站名稱 || row.工站名稱 || '未指定工站', 工序: row.工序 || '', 機台清單, 主機台: row.主機台 || (機台清單[0] ? 機台清單[0].機台編號 : '') });
  }).filter(x => x.產品編號 || x.客戶品號 || x.品名 || x.工站名稱);
}

function 報工PWA_寫入報工(payload) {
  payload = payload || {};
  const defects = 報工PWA_不良分配(payload.不良分配 || payload.不良行清單 || []);
  const output = Number(payload.今日共做數 || payload.產出數量 || 0);
  const ng = Number(payload.不良數 || payload.不良總數 || defects.reduce((s, x) => s + Number(x.數量 || 0), 0));
  const good = Math.max(output - ng, 0);
  const first = defects[0] || {};
  報工PWA_驗證(payload, output, ng);
  const reportId = payload.報工編號 || 報工PWA_流水號('RFV2');
  const now = new Date();
  const obj = {
    報工編號: reportId,
    時間戳: now,
    作業日: payload.作業日 || 報工PWA_作業日(),
    工號: payload.工號 || '',
    姓名: payload.姓名 || '',
    班別: payload.班別 || '早班',
    是否加班: payload.是否加班 || '否',
    加班類型: payload.加班類型 || '無',
    作業員照片網址: payload.作業員照片網址 || '',
    產品編號: payload.產品編號 || '',
    客戶品號: payload.客戶品號 || '',
    品名: payload.品名 || '',
    產品照片網址: payload.產品照片網址 || '',
    工站名稱: payload.工站名稱 || payload.報工工站名稱 || '',
    報工工站名稱: payload.報工工站名稱 || payload.工站名稱 || '',
    工序: payload.工序 || '',
    機台清單: payload.機台清單 || '',
    主機台: payload.主機台 || '',
    機台照片清單JSON: JSON.stringify(payload.機台照片清單 || []),
    今日共做數: output,
    不良數: ng,
    實際良品數: good,
    不良率: output ? ng / output : 0,
    開始時間: payload.開始時間 || '',
    結束時間: payload.結束時間 || '',
    實際工時: payload.實際工時 || '',
    不良類別: payload.不良類別 || first.分類 || '無',
    不良代碼: payload.不良代碼 || first.不良代號 || '',
    不良原因: payload.不良原因 || first.不良名稱 || '',
    異常類型: payload.異常類型 || '',
    責任歸屬: payload.責任歸屬 || '',
    備註: payload.備註 || payload.照片備註 || '',
    現場照片JSON: JSON.stringify(payload.現場照片清單 || []),
    來源: 'GitHub_Pages_PWA_正式整合版',
    狀態: '有效',
    更新時間: now,
    不良行清單JSON: JSON.stringify(defects),
    不良總數: ng,
    異常開始時間: payload.異常開始時間 || '',
    異常結束時間: payload.異常結束時間 || '',
    異常工時: payload.異常工時 || ''
  };
  const sh = 報工PWA_取得或建立表('09_報工', 報工PWA_報工欄位);
  const headers = 報工PWA_表頭(sh);
  sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
  報工PWA_寫入不良紀錄(Object.assign({}, payload, { 報工編號: reportId, 不良分配: defects, 今日共做數: output, 不良數: ng, 實際良品數: good }));
  return 報工PWA_成功({ 報工編號: reportId, 今日共做數: output, 不良數: ng, 實際良品數: good, 目標分頁: ['09_報工', '09_不良紀錄'] }, 'PWA 報工 V2 已寫入');
}

function 報工PWA_寫入不良紀錄(payload) {
  payload = payload || {};
  const rows = 報工PWA_不良分配(payload.不良分配 || payload.不良行清單 || []);
  const ng = Number(payload.不良數 || payload.不良總數 || 0);
  if (!rows.length && !ng && !payload.不良代碼 && !payload.不良原因) return 報工PWA_成功({ 寫入筆數: 0 }, '無不良資料，略過寫入');
  const list = rows.length ? rows : [{ 分類: payload.不良類別 || '', 不良代號: payload.不良代碼 || '', 不良名稱: payload.不良原因 || '', 英文名稱: payload.英文名稱 || '', 數量: ng }];
  const sh = 報工PWA_取得或建立表('09_不良紀錄', 報工PWA_不良欄位);
  const headers = 報工PWA_表頭(sh);
  let count = 0;
  list.forEach(item => {
    const qty = Number(item.數量 || item.不良數量 || 0);
    if (qty <= 0) return;
    const obj = { 流水號: 報工PWA_流水號('NGV2'), 時間戳: new Date(), 作業日: payload.作業日 || 報工PWA_作業日(), 報工編號: payload.報工編號 || '', 工號: payload.工號 || '', 姓名: payload.姓名 || '', 班別: payload.班別 || '早班', 產品編號: payload.產品編號 || '', 客戶品號: payload.客戶品號 || '', 品名: payload.品名 || '', 工站名稱: payload.工站名稱 || payload.報工工站名稱 || '', 工序: payload.工序 || '', 機台編號: payload.主機台 || '', 主機台: payload.主機台 || '', 機台清單: payload.機台清單 || '', 不良代碼: item.不良代號 || item.代碼 || '', 不良名稱: item.不良名稱 || item.名稱 || '', 英文名稱: item.英文名稱 || '', 不良數量: qty, 責任歸屬: payload.責任歸屬 || '', 不良類別: item.分類 || item.類別 || '', 不良率: Number(payload.今日共做數 || 0) ? qty / Number(payload.今日共做數 || 0) : 0, 異常類型: payload.異常類型 || '', 異常開始時間: payload.異常開始時間 || '', 異常結束時間: payload.異常結束時間 || '', 異常工時: payload.異常工時 || '', 開始時間: payload.開始時間 || '', 結束時間: payload.結束時間 || '', 實際工時: payload.實際工時 || '', 照片JSON: JSON.stringify(payload.現場照片清單 || []), 現場照片清單JSON: JSON.stringify(payload.現場照片清單 || []), 備註: payload.備註 || payload.照片備註 || '', 來源: 'GitHub_Pages_PWA_正式整合版', 狀態: '有效' };
    sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
    count++;
  });
  return 報工PWA_成功({ 寫入筆數: count }, '不良紀錄已寫入');
}

function 報工PWA_手動重刷主檔照片() {
  if (typeof 手動重刷_主檔照片 === 'function') return 報工PWA_標準回傳(手動重刷_主檔照片());
  return 報工PWA_成功({ 略過: true }, '目前正式版直接讀主檔照片欄位，無需重刷');
}

function 報工PWA_班別(row) {
  const name = 報工PWA_文字(報工PWA_取值(row, ['班別名稱','標準班別','顯示班別']));
  const code = 報工PWA_文字(報工PWA_取值(row, ['班別代碼','班別CODE','shiftCode'])).toUpperCase();
  const raw = 報工PWA_文字(報工PWA_取值(row, ['班別','班次','工作班別','原始班別','班別時間']));
  const all = 報工PWA_清字([name, code, raw].join(' '));
  if (name.indexOf('大夜') >= 0 || name.indexOf('夜') >= 0 || code === 'NIGHT' || code === 'N' || raw.indexOf('大夜') >= 0 || raw.indexOf('夜') >= 0 || all.indexOf('2300') >= 0 || all.indexOf('3150') >= 0 || all.indexOf('0315') >= 0 || all.indexOf('0750') >= 0) return '大夜班';
  return '早班';
}
function 報工PWA_不良分配(list) { if (!Array.isArray(list)) return []; return list.map(x => ({ 分類: 報工PWA_文字(x.分類 || x.類別), 不良代號: 報工PWA_文字(x.不良代號 || x.代碼), 不良名稱: 報工PWA_文字(x.不良名稱 || x.名稱), 英文名稱: 報工PWA_文字(x.英文名稱 || x.英文), 數量: Number(x.數量 || x.不良數量 || 0) })).filter(x => x.數量 > 0 && (x.不良代號 || x.不良名稱)); }
function 報工PWA_驗證(p, output, ng) { if (!報工PWA_文字(p.工號)) throw new Error('請選擇作業員'); if (!報工PWA_文字(p.產品編號) && !報工PWA_文字(p.品名)) throw new Error('請選擇產品'); if (!報工PWA_文字(p.報工工站名稱) && !報工PWA_文字(p.工站名稱)) throw new Error('請選擇報工工站'); if (output <= 0) throw new Error('今日共做數必須大於 0'); if (ng < 0) throw new Error('不良數不可小於 0'); if (ng > output) throw new Error('不良數不可大於今日共做數'); }
function 報工PWA_解析POST(e) { try { if (!e || !e.postData || !e.postData.contents) return {}; return JSON.parse(e.postData.contents); } catch (err) { return {}; } }
function 報工PWA_JSON(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function 報工PWA_標準回傳(x) { if (x && x.success !== undefined) return x; if (x && x.成功 !== undefined) return { success: !!x.成功, data: x.data || x, message: x.訊息 || x.message || '', error: x.錯誤 || '' }; return 報工PWA_成功(x || {}, '完成'); }
function 報工PWA_成功(data, message) { return { success: true, data: data || {}, message: message || '完成', error: '' }; }
function 報工PWA_失敗(message, code, data) { return { success: false, data: data || {}, message: message || '失敗', error: code || 'ERROR' }; }
function 報工PWA_文字(v) { return String(v == null ? '' : v).trim(); }
function 報工PWA_清字(v) { return 報工PWA_文字(v).replace(/\s+/g, '').toUpperCase(); }
function 報工PWA_取值(row, keys) { for (const k of keys) if (row && row[k] !== undefined && row[k] !== null && 報工PWA_文字(row[k]) !== '') return row[k]; return ''; }
function 報工PWA_圖片(row, urlKeys, idKeys) { const raw = 報工PWA_取值(row, urlKeys || []); const idRaw = 報工PWA_取值(row, idKeys || []); const url = 報工PWA_圖片文字(raw || idRaw); const id = 報工PWA_圖片ID(raw || idRaw); return { 照片網址: url, 縮圖網址: id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w900' : url, 檔案ID: id }; }
function 報工PWA_圖片文字(v) { let s = 報工PWA_文字(v); if (!s) return ''; s = s.replace(/^=IMAGE\(/i, '').replace(/["'()]/g, '').trim(); const url = s.match(/https?:\/\/[^\s,，;；]+/i); if (url) s = url[0]; const id = 報工PWA_圖片ID(s); if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w900'; return s; }
function 報工PWA_圖片ID(v) { const m = 報工PWA_文字(v).match(/[-\w]{25,}/); return m ? m[0] : ''; }
function 報工PWA_試算表() { try { if (typeof 取得試算表_ === 'function') return 取得試算表_(); } catch (e) {} return SpreadsheetApp.openById(報工PWA_資料庫ID); }
function 報工PWA_讀表(name) { const sh = 報工PWA_試算表().getSheetByName(name); if (!sh || sh.getLastRow() < 2) return []; const values = sh.getDataRange().getValues(); const headers = values[0].map(報工PWA_文字); return values.slice(1).filter(r => r.some(c => 報工PWA_文字(c) !== '')).map(r => { const obj = {}; headers.forEach((h, i) => obj[h] = r[i]); return obj; }); }
function 報工PWA_取得或建立表(name, headers) { const ss = 報工PWA_試算表(); let sh = ss.getSheetByName(name); if (!sh) sh = ss.insertSheet(name); if (sh.getLastRow() === 0) sh.appendRow(headers); const exist = 報工PWA_表頭(sh); const add = headers.filter(h => exist.indexOf(h) < 0); if (add.length) sh.getRange(1, exist.length + 1, 1, add.length).setValues([add]); return sh; }
function 報工PWA_表頭(sh) { return sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(報工PWA_文字); }
function 報工PWA_流水號(prefix) { return prefix + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000); }
function 報工PWA_作業日() { const d = new Date(); const hm = Number(Utilities.formatDate(d, Session.getScriptTimeZone(), 'HHmm')); if (hm < 610) d.setDate(d.getDate() - 1); return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function 報工PWA_測試_健康檢查() { Logger.log(JSON.stringify(報工PWA_健康檢查(), null, 2)); }
function 報工PWA_測試_主檔檢查() { Logger.log(JSON.stringify(報工PWA_主檔檢查(), null, 2)); }
function 報工PWA_測試_取得初始資料() { Logger.log(JSON.stringify(報工PWA_取得初始資料().data.meta, null, 2)); }
