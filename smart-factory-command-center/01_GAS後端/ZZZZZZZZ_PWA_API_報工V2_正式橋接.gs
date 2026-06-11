/**
 * 檔案名稱：ZZZZZZZZ_PWA_API_報工V2_正式橋接.gs
 * 專案：智慧製造中央作戰指揮中心
 * 版本：v1.0.0
 *
 * 目的：
 * 1. 不改主後端、不改 07_報工作業V2.html。
 * 2. 讓 GitHub Pages PWA docs/work-report-v2.html 可用 action API 對接既有 GAS 後端。
 * 3. 將 PWA 欄位轉成既有 09_報工 / 09_不良紀錄 欄位。
 * 4. 保留既有補強檔：
 *    - ZZZZZ_09報工V2_欄位對齊寫入正式版.gs
 *    - ZZZZZZZ_主檔照片直掛讀取正式版.gs
 *
 * 重要原則：
 * - 這支是「橋接層」，不是重寫後端。
 * - 只處理 PWA action 對接。
 * - 舊 GAS HTML 報工頁仍可照原本方式運作。
 */

/**
 * 覆寫 doPost：修正 GitHub Pages PWA POST 時 action 放在 URL query 的情境。
 * 原主後端 doPost 只看 POST body 內的 action，PWA gas-bridge.js 是：
 *   POST /exec?action=寫入報工作業v2
 *   body = JSON.stringify(payload)
 * 所以這裡將 e.parameter 與 POST body 合併，避免 POST 被誤判為健康檢查。
 */
function doPost(e) {
  try {
    const body = 解析POST_(e) || {};
    const query = e && e.parameter ? e.parameter : {};
    const p = Object.assign({}, body, query);

    if (body && body.events && Array.isArray(body.events)) {
      return 處理LINEWebhook_(body);
    }

    const action = p.action || p.動作 || query.action || query.動作 || '健康檢查';
    return 輸出JSON_(處理API請求_(action, p));
  } catch (err) {
    return 輸出JSON_(PWA_API_失敗_('doPost 執行失敗：' + err.message, 'DO_POST_ERROR', { 堆疊: err.stack }));
  }
}

/**
 * 覆寫 API 路由：新增 PWA 正式化所需 action，並保留原本 LINE / 戰情 action。
 */
function 處理API請求_(action, p) {
  try {
    const a = 文字_(action);
    const map = {
      '健康檢查': () => PWA_API_健康檢查_(),
      '初始化': () => 初始化_智慧製造中央作戰指揮中心(),
      '主檔檢查': () => PWA_API_主檔檢查_(),
      '取得報工作業v2初始資料': () => PWA_API_取得報工作業v2初始資料_(),
      '寫入報工作業v2': () => PWA_API_寫入報工作業v2_(p),
      '寫入不良紀錄v2': () => PWA_API_寫入不良紀錄v2_(p),
      '手動重刷_主檔照片': () => PWA_API_手動重刷主檔照片_(),
      '戰情': () => 取得戰情(),
      'AI摘要': () => 取得AI摘要(),
      '指令': () => 取得LINE指令說明_()
    };

    if (!map[a]) {
      return PWA_API_失敗_('未知動作：' + a, 'UNKNOWN_ACTION', { 可用動作: Object.keys(map) });
    }

    return PWA_API_標準化回傳_(map[a]());
  } catch (err) {
    return PWA_API_失敗_(err.message, 'API_ROUTE_ERROR', { 堆疊: err.stack });
  }
}

/**
 * PWA 健康檢查。
 */
function PWA_API_健康檢查_() {
  const base = 健康檢查();
  return PWA_API_成功_({
    系統: base.系統 || 系統設定.系統名稱,
    版本: 系統設定.版本,
    時間戳: new Date(),
    PWA: '已啟用',
    報工V2: 'PWA API 橋接已啟用',
    目標分頁: ['09_報工', '09_不良紀錄'],
    照片來源: '主檔直掛：01_人員主檔 / 02_產品主檔 / 03_機台主檔',
    補強檔: 'ZZZZZZZZ_PWA_API_報工V2_正式橋接.gs'
  }, 'PWA API 健康檢查成功');
}

/**
 * PWA 主檔檢查。
 */
function PWA_API_主檔檢查_() {
  const ss = 取得試算表_();
  const names = [
    '01_人員主檔',
    '02_產品主檔',
    '03_機台主檔',
    '04_工站主檔',
    '08_工站途程機台主檔',
    '05_不良代碼主檔',
    '09_報工',
    '09_不良紀錄',
    '06_照片資料庫_停用封存'
  ];

  const result = names.map(name => {
    const sh = ss.getSheetByName(name);
    return {
      分頁: name,
      存在: !!sh,
      筆數: sh ? Math.max(sh.getLastRow() - 1, 0) : 0,
      欄位數: sh ? sh.getLastColumn() : 0
    };
  });

  return PWA_API_成功_({
    版本: 系統設定.版本,
    時間戳: new Date(),
    結果: result
  }, 'PWA 主檔檢查完成');
}

/**
 * 取得 PWA 報工 V2 初始資料。
 * 回傳格式需符合 docs/work-report-v2-submit.js：
 * data.人員、data.產品、data.工站、data.機台、data.不良代號
 */
function PWA_API_取得報工作業v2初始資料_() {
  const 人員 = PWA_API_讀人員主檔_();
  const 產品 = PWA_API_讀產品主檔_();
  const 工站 = PWA_API_讀工站主檔_();
  const 機台 = PWA_API_讀機台主檔_();
  const 不良代號 = PWA_API_讀不良代號_();

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

    不良代號,
    不良代碼: 不良代號,
    不良主檔: 不良代號,
    defects: 不良代號,

    班別清單: ['早班', '中班', '大夜班'],
    作業日: 取得作業日_(),
    meta: {
      版本: 系統設定.版本,
      時間戳: new Date(),
      筆數: {
        人員: 人員.length,
        產品: 產品.length,
        工站: 工站.length,
        機台: 機台.length,
        不良代號: 不良代號.length
      }
    }
  }, 'PWA 報工 V2 初始資料取得成功');
}

/**
 * PWA 寫入報工 V2。
 * 將 GitHub PWA 欄位轉成既有寫入報工函式可吃的欄位。
 */
function PWA_API_寫入報工作業v2_(payload) {
  payload = payload || {};

  const 不良分配 = PWA_API_正規化不良分配_(payload.不良分配 || payload.defects || []);
  const 產出數量 = Number(payload.今日共做數 || payload.產出數量 || payload.outputQty || 0);
  const 不良數 = Number(payload.不良數 || payload.不良總數 || PWA_API_加總不良數_(不良分配) || 0);
  const 實際良品數 = Math.max(產出數量 - 不良數, 0);
  const 第一筆不良 = 不良分配[0] || {};

  PWA_API_驗證報工Payload_(payload, 產出數量, 不良數);

  const transformed = Object.assign({}, payload, {
    今日共做數: 產出數量,
    不良數: 不良數,
    實際良品數: 實際良品數,
    工站名稱: payload.工站名稱 || payload.報工工站名稱 || payload.工站編號 || '',
    報工工站名稱: payload.報工工站名稱 || payload.工站名稱 || payload.工站編號 || '',
    主機台: payload.主機台 || payload.機台編號 || '',
    機台清單: payload.機台清單 || payload.機台編號 || '',
    不良類別: payload.不良類別 || (不良數 > 0 ? 'PWA不良分配' : '無'),
    不良代碼: payload.不良代碼 || 第一筆不良.不良代號 || '',
    不良原因: payload.不良原因 || 第一筆不良.不良名稱 || '',
    備註: payload.備註 || payload.照片備註 || '',
    來源: 'GitHub_Pages_PWA_work-report-v2',
    PWA原始PayloadJSON: JSON.stringify(payload)
  });

  // 呼叫既有正式寫入流程，讓它負責寫 09_報工 與第一筆不良紀錄。
  const result = 寫入報工作業v2(transformed);

  // 若 PWA 有多筆不良分配，補寫第 2 筆以後，避免只留下第一個不良代碼。
  const 報工編號 = result && (result.報工編號 || (result.data && result.data.報工編號)) || transformed.報工編號 || '';
  const extraResult = PWA_API_補寫多筆不良分配_(報工編號, transformed, 不良分配);

  return PWA_API_成功_({
    報工編號,
    原始結果: result,
    多筆不良補寫: extraResult,
    今日共做數: 產出數量,
    不良數,
    實際良品數,
    目標分頁: ['09_報工', '09_不良紀錄']
  }, 'PWA 報工 V2 已寫入 09_報工，並同步 09_不良紀錄');
}

/**
 * PWA 獨立寫入不良紀錄 V2。
 */
function PWA_API_寫入不良紀錄v2_(payload) {
  payload = payload || {};
  const 不良分配 = PWA_API_正規化不良分配_(payload.不良分配 || payload.defects || []);

  if (!不良分配.length && Number(payload.不良數 || payload.不良數量 || 0) <= 0) {
    return PWA_API_成功_({ count: 0 }, '沒有不良資料，略過寫入');
  }

  if (不良分配.length) {
    const rows = 不良分配.map(item => PWA_API_建立不良紀錄列_(payload.報工編號 || '', payload, item));
    rows.forEach(row => 寫入不良紀錄物件_(row));
    return PWA_API_成功_({ count: rows.length, rows }, 'PWA 多筆不良紀錄已寫入');
  }

  const result = 寫入不良紀錄v2(payload);
  return PWA_API_成功_({ 原始結果: result }, 'PWA 不良紀錄已寫入');
}

/**
 * 主檔照片重刷：目前照片來源已改為主檔直掛。
 */
function PWA_API_手動重刷主檔照片_() {
  const 人員 = PWA_API_讀人員主檔_();
  const 產品 = PWA_API_讀產品主檔_();
  const 機台 = PWA_API_讀機台主檔_();

  return PWA_API_成功_({
    人員照片筆數: 人員.filter(x => x.人員照片 || x.照片網址 || x.縮圖網址).length,
    產品主圖筆數: 產品.filter(x => x.產品主圖 || x.產品照片網址 || x.產品縮圖網址).length,
    產品三視圖筆數: 產品.filter(x => x.產品三視圖).length,
    機台照片筆數: 機台.filter(x => x.機台照片 || x.照片網址 || x.縮圖網址).length,
    說明: 'PWA 讀取來源為 01_人員主檔、02_產品主檔、03_機台主檔，不再依賴 06_照片資料庫。'
  }, '主檔照片重刷完成');
}

function PWA_API_讀人員主檔_() {
  return 讀表_('01_人員主檔')
    .filter(r => 文字_(r.啟用 || '是') !== '否')
    .map(r => {
      const 工號 = 取值_(r, ['工號', '員工編號', '員工工號', 'id']);
      const 照片 = PWA_API_取主檔照片_(r, ['人員照片', '照片網址', '縮圖網址', '作業員照片網址', '作業員縮圖網址', '圖片網址', '頭像網址'], ['Google檔案ID', '作業員照片檔案ID', '照片檔案ID', '檔案ID']);
      return {
        工號,
        姓名: 取值_(r, ['姓名', '中文名', '名字', 'name']),
        部門: 取值_(r, ['部門', '單位', 'dept']),
        組別: 取值_(r, ['組別', '班組', 'group']),
        職稱: 取值_(r, ['職稱', '職位', 'title']),
        班別: 標準化班別_(取值_(r, ['班別', '班次', '工作班別', '班別名稱'])),
        啟用: r.啟用 || '是',
        人員照片: 照片.照片網址,
        照片網址: 照片.照片網址,
        縮圖網址: 照片.縮圖網址,
        Google檔案ID: 照片.檔案ID
      };
    });
}

function PWA_API_讀產品主檔_() {
  return 讀表_('02_產品主檔')
    .filter(r => 文字_(r.啟用 || '是') !== '否')
    .map(r => {
      const 產品編號 = 取值_(r, ['產品編號', '料號', '產品料號', 'productNo']);
      const 主圖 = PWA_API_取主檔照片_(r, ['產品主圖', '產品照片網址', '產品縮圖網址', '照片網址', '縮圖網址', '圖片網址'], ['產品照片檔案ID', 'Google檔案ID', '照片檔案ID', '檔案ID']);
      const 三視圖 = PWA_API_取主檔照片_(r, ['產品三視圖', '三視圖', '三視圖網址'], ['產品三視圖檔案ID', '三視圖檔案ID']);
      return {
        產品編號,
        客戶品號: 取值_(r, ['客戶品號', '客戶料號']),
        品名: 取值_(r, ['品名', '產品名稱', 'name']),
        分類: 取值_(r, ['分類', '產品分類']),
        標準工時_秒: 取值_(r, ['標準工時_秒', '標準工時']),
        '8小時標準產能': 取值_(r, ['8小時標準產能', '標準產能_班', '8H產能']),
        啟用: r.啟用 || '是',
        產品主圖: 主圖.照片網址,
        產品三視圖: 三視圖.照片網址,
        產品照片網址: 主圖.照片網址,
        產品縮圖網址: 主圖.縮圖網址,
        產品照片檔案ID: 主圖.檔案ID
      };
    });
}

function PWA_API_讀工站主檔_() {
  const rows = 讀正式工站來源_();
  return rows.map((r, index) => {
    const 工站名稱 = 取值_(r, ['報工工站名稱', '工站名稱', '名稱']) || '工站' + (index + 1);
    const 工站編號 = 取值_(r, ['工站編號', '工站代碼', '工站代號', '工序', '途程順序']) || 工站名稱;
    return {
      工站編號,
      工站代號: 工站編號,
      工站名稱,
      報工工站名稱: 工站名稱,
      產品編號: 取值_(r, ['產品編號', '料號', '品號']),
      客戶品號: 取值_(r, ['客戶品號']),
      品名: 取值_(r, ['品名']),
      製程說明: 取值_(r, ['製程說明', '說明', '工序範圍', '工序清單']),
      工序: 取值_(r, ['工序', '工序範圍', '工序清單']),
      機台編號清單: 取值_(r, ['機台編號清單', '機台清單', '機台編號', '主機台']),
      主機台: 取值_(r, ['主機台']),
      標準工時_秒: 取值_(r, ['標準工時_秒']),
      標準產能: 取值_(r, ['標準產能', '標準產能_班']),
      啟用: r.啟用 || '是'
    };
  }).filter(x => x.工站名稱 || x.產品編號 || x.工站編號);
}

function PWA_API_讀機台主檔_() {
  return 讀表_('03_機台主檔')
    .filter(r => 文字_(r.啟用 || '是') !== '否')
    .map(r => {
      const 機台編號 = 取值_(r, ['機台編號', '機台代號', '設備編號', 'machineId']);
      const 照片 = PWA_API_取主檔照片_(r, ['機台照片', '照片網址', '縮圖網址', '機台照片網址', '機台縮圖網址', '圖片網址'], ['機台照片檔案ID', 'Google檔案ID', '照片檔案ID', '檔案ID']);
      return {
        機台編號,
        機台名稱: 取值_(r, ['機台名稱', '設備名稱', '名稱', 'machineName']) || 機台編號,
        工站編號: 取值_(r, ['工站編號', '工站代號', '工站名稱']),
        區域: 取值_(r, ['區域', '位置', 'area']),
        機台類型: 取值_(r, ['機台類型', '類型']),
        型號: 取值_(r, ['型號', '機台型號']),
        啟用: r.啟用 || '是',
        機台照片: 照片.照片網址,
        照片網址: 照片.照片網址,
        縮圖網址: 照片.縮圖網址,
        Google檔案ID: 照片.檔案ID
      };
    });
}

function PWA_API_讀不良代號_() {
  const grouped = 讀不良代碼主檔_();
  const list = [];
  Object.keys(grouped).forEach(category => {
    (grouped[category] || []).forEach(x => {
      list.push({
        分類: category,
        不良代號: x.代碼 || x.不良代碼 || x.code || '',
        不良代碼: x.代碼 || x.不良代碼 || x.code || '',
        不良名稱: x.名稱 || x.不良名稱 || x.name || '',
        中文名稱: x.名稱 || x.不良名稱 || x.name || '',
        英文名稱: x.英文名稱 || x.英文 || x.en || '',
        啟用: '是',
        備註: x.備註 || ''
      });
    });
  });
  return list;
}

function PWA_API_取主檔照片_(row, urlKeys, idKeys) {
  const url = 取值_(row, urlKeys || []);
  let id = 取值_(row, idKeys || []);
  if (!id) {
    const m = 文字_(url).match(/[-\w]{25,}/);
    if (m) id = m[0];
  }
  const normalized = 轉Google圖片網址_(url || id);
  return { 照片網址: normalized, 縮圖網址: normalized, 檔案ID: id || '' };
}

function PWA_API_正規化不良分配_(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    不良代號: 文字_(item.不良代號 || item.不良代碼 || item.代碼 || item.code),
    不良名稱: 文字_(item.不良名稱 || item.中文名稱 || item.名稱 || item.name),
    英文名稱: 文字_(item.英文名稱 || item.英文 || item.en || item.english),
    數量: Number(item.數量 || item.不良數量 || item.qty || 0)
  })).filter(item => item.數量 > 0);
}

function PWA_API_加總不良數_(不良分配) {
  return (不良分配 || []).reduce((sum, item) => sum + Number(item.數量 || 0), 0);
}

function PWA_API_驗證報工Payload_(payload, 產出數量, 不良數) {
  const errors = [];
  if (!文字_(payload.工號)) errors.push('工號不可空白');
  if (!文字_(payload.產品編號) && !文字_(payload.品名)) errors.push('產品不可空白');
  if (!文字_(payload.工站編號) && !文字_(payload.工站名稱) && !文字_(payload.報工工站名稱)) errors.push('工站不可空白');
  if (!文字_(payload.機台編號) && !文字_(payload.主機台) && !文字_(payload.機台清單)) errors.push('機台不可空白');
  if (Number(產出數量 || 0) <= 0) errors.push('產出數量必須大於 0');
  if (Number(不良數 || 0) < 0) errors.push('不良數不可小於 0');
  if (Number(不良數 || 0) > Number(產出數量 || 0)) errors.push('不良數不可大於產出數量');
  if (errors.length) throw new Error(errors.join('；'));
}

function PWA_API_補寫多筆不良分配_(報工編號, base, 不良分配) {
  if (!不良分配 || 不良分配.length <= 1) {
    return { 補寫筆數: 0, 說明: '0 或 1 筆不良已由既有報工流程處理' };
  }

  const extra = 不良分配.slice(1);
  const rows = extra.map(item => PWA_API_建立不良紀錄列_(報工編號, base, item));
  rows.forEach(row => 寫入不良紀錄物件_(row));

  return { 補寫筆數: rows.length, rows };
}

function PWA_API_建立不良紀錄列_(報工編號, base, item) {
  const 今日共做數 = Number(base.今日共做數 || base.產出數量 || 0);
  const 不良數 = Number(item.數量 || 0);
  return {
    流水號: 產生流水號_('NG'),
    時間戳: new Date(),
    作業日: base.作業日 || 取得作業日_(),
    工號: base.工號 || '',
    姓名: base.姓名 || '',
    產品編號: base.產品編號 || '',
    品名: base.品名 || '',
    機台編號: base.主機台 || base.機台編號 || base.機台清單 || '',
    工單編號: base.工單編號 || '',
    不良代碼: item.不良代號 || '',
    不良名稱: item.不良名稱 || '',
    不良數量: 不良數,
    責任歸屬: base.不良類別 || 'PWA不良分配',
    說明: [base.備註 || base.照片備註 || '', item.英文名稱 ? '英文名稱：' + item.英文名稱 : ''].filter(Boolean).join('；'),
    照片網址: base.照片網址 || '',
    報工編號: 報工編號 || base.報工編號 || '',
    班別: base.班別 || '',
    客戶品號: base.客戶品號 || '',
    工站名稱: base.工站名稱 || base.報工工站名稱 || '',
    工序: base.工序 || base.工序清單 || '',
    不良類別: base.不良類別 || 'PWA不良分配',
    不良率: 今日共做數 ? 不良數 / 今日共做數 : '',
    異常類型: base.異常類型 || '',
    照片JSON: JSON.stringify(base.現場照片清單 || []),
    來源: 'GitHub_Pages_PWA_work-report-v2',
    狀態: '有效'
  };
}

function PWA_API_標準化回傳_(result) {
  if (result && result.success !== undefined && result.data !== undefined) return result;
  const ok = !(result && result.成功 === false);
  return {
    success: ok,
    data: result || {},
    message: result && (result.訊息 || result.message) ? (result.訊息 || result.message) : (ok ? '執行成功' : '執行失敗'),
    error: ok ? '' : 'ERROR',
    成功: ok,
    訊息: result && (result.訊息 || result.message) ? (result.訊息 || result.message) : (ok ? '執行成功' : '執行失敗')
  };
}

function PWA_API_成功_(data, message) {
  return {
    success: true,
    data: data || {},
    message: message || '執行成功',
    error: '',
    成功: true,
    訊息: message || '執行成功'
  };
}

function PWA_API_失敗_(message, error, data) {
  return {
    success: false,
    data: data || {},
    message: message || '執行失敗',
    error: error || 'ERROR',
    成功: false,
    訊息: message || '執行失敗'
  };
}
