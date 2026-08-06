#!/usr/bin/env node
'use strict';

/**
 * 化新精密｜智慧 5S 管理平台｜正式驗收程式
 *
 * 執行方式：
 *   node smart-factory-command-center/08_測試與驗收/智慧5S_正式驗收.js
 *
 * 僅做本機檔案與正式 GAS 唯讀驗收，不會新增、修改或刪除試算表資料。
 * 若現場暫時無法連網，可加上 --略過線上，只執行本機封版檢查。
 */

const 檔案系統 = require('fs');
const 路徑工具 = require('path');
const 虛擬機 = require('vm');

const 驗收程式目錄 = __dirname;
const 專案根目錄 = 路徑工具.resolve(驗收程式目錄, '..', '..');
const 前端目錄 = 路徑工具.join(專案根目錄, 'docs', '5s');
const 後端路徑 = 路徑工具.join(專案根目錄, 'smart-factory-command-center', '01_GAS後端', '智慧5S管理平台_完整後端.gs');
const 略過線上 = process.argv.includes('--略過線上');

const 必要分頁 = [
  '01_人員主檔',
  '5S_區域主檔',
  '5S_檢查項目',
  '5S_系統參數',
  '5S_巡檢主檔',
  '5S_巡檢明細',
  '5S_改善單',
  '5S_改善歷程',
  '5S_全物品盤點',
  '5S_紅牌追蹤',
  '5S_非必要品處置',
  '5S_照片',
  '5S_通知紀錄',
  '5S_區域日統計',
  '5S_排名快照'
];

const 驗收結果 = [];

function 讀取文字(相對路徑) {
  return 檔案系統.readFileSync(路徑工具.join(專案根目錄, 相對路徑), 'utf8');
}

function 記錄(分類, 項目, 通過, 說明) {
  驗收結果.push({
    分類,
    項目,
    結果: 通過 ? '通過' : '失敗',
    說明: String(說明 || '')
  });
}

function 擷取設定值(設定程式, 欄位名稱) {
  const 安全欄名 = 欄位名稱.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const 配對 = 設定程式.match(new RegExp(`${安全欄名}\\s*:\\s*'([^']*)'`));
  if (!配對) throw new Error(`找不到設定欄位：${欄位名稱}`);
  return 配對[1];
}

function 取得PNG尺寸(完整路徑) {
  const 內容 = 檔案系統.readFileSync(完整路徑);
  const PNG簽章 = '89504e470d0a1a0a';
  if (內容.length < 24 || 內容.subarray(0, 8).toString('hex') !== PNG簽章) {
    throw new Error('不是有效的 PNG 檔案');
  }
  return {
    寬: 內容.readUInt32BE(16),
    高: 內容.readUInt32BE(20)
  };
}

function 驗收必要檔案() {
  const 必要檔案 = [
    'index.html',
    '智慧5S樣式.css',
    '智慧5S設定.js',
    '智慧5S資料庫.js',
    '智慧5S資料修復.js',
    '智慧5S應用程式.js',
    '離線服務.js',
    '離線頁.html',
    '應用程式資訊.webmanifest',
    '智慧5S圖示.svg',
    '智慧5S圖示-192.png',
    '智慧5S圖示-512.png'
  ];
  必要檔案.forEach(檔名 => {
    const 存在 = 檔案系統.existsSync(路徑工具.join(前端目錄, 檔名));
    記錄('前端檔案', 檔名, 存在, 存在 ? '檔案存在' : '檔案缺少');
  });
}

function 驗收JavaScript語法() {
  const 程式清單 = ['智慧5S設定.js', '智慧5S資料庫.js', '智慧5S資料修復.js', '智慧5S應用程式.js', '離線服務.js'];
  程式清單.forEach(檔名 => {
    try {
      const 程式碼 = 檔案系統.readFileSync(路徑工具.join(前端目錄, 檔名), 'utf8');
      new 虛擬機.Script(程式碼, { filename: 檔名 });
      記錄('程式語法', 檔名, true, 'JavaScript 語法正確');
    } catch (錯誤) {
      記錄('程式語法', 檔名, false, 錯誤.message);
    }
  });
}

function 驗收版本與PWA() {
  const 設定程式 = 檔案系統.readFileSync(路徑工具.join(前端目錄, '智慧5S設定.js'), 'utf8');
  const 首頁 = 檔案系統.readFileSync(路徑工具.join(前端目錄, 'index.html'), 'utf8');
  const 離線服務 = 檔案系統.readFileSync(路徑工具.join(前端目錄, '離線服務.js'), 'utf8');
  const 應用程式 = 檔案系統.readFileSync(路徑工具.join(前端目錄, '智慧5S應用程式.js'), 'utf8');
  const 後端 = 檔案系統.readFileSync(後端路徑, 'utf8');
  const 版本 = 擷取設定值(設定程式, '版本');
  const 快取查詢版本 = 版本.replace(/\D/g, '');

  記錄('版本一致性', '首頁顯示版本', 首頁.includes(`>${版本}</span>`), 版本);
  const 首頁查詢版本 = Array.from(首頁.matchAll(/[?&]v=(\d+)/g), 配對 => 配對[1]);
  記錄(
    '版本一致性',
    '首頁靜態資源版本',
    首頁查詢版本.length >= 8 && 首頁查詢版本.every(值 => 值 === 快取查詢版本),
    `共 ${首頁查詢版本.length} 個資源標記，應為 v=${快取查詢版本}`
  );
  記錄('版本一致性', 'Service Worker 快取版本', 離線服務.includes(`v${版本}`), 版本);
  記錄('版本一致性', 'Service Worker 註冊版本', 應用程式.includes(`離線服務.js?v=${快取查詢版本}`), `v=${快取查詢版本}`);
  記錄('版本一致性', 'GAS 模組版本', 後端.includes(`var 智慧5S_版本 = '${版本}'`), 版本);

  let 資訊;
  try {
    資訊 = JSON.parse(檔案系統.readFileSync(路徑工具.join(前端目錄, '應用程式資訊.webmanifest'), 'utf8'));
    記錄('PWA', 'Manifest JSON', true, '格式正確');
  } catch (錯誤) {
    記錄('PWA', 'Manifest JSON', false, 錯誤.message);
    return;
  }

  記錄('PWA', '獨立安裝模式', 資訊.display === 'standalone', `display=${資訊.display}`);
  記錄('PWA', '啟動路徑', Boolean(資訊.start_url && 資訊.scope), `${資訊.start_url}｜${資訊.scope}`);
  const 圖示規格 = new Map((資訊.icons || []).map(圖示 => [圖示.sizes, 圖示]));
  for (const 尺寸 of [192, 512]) {
    const 規格 = 圖示規格.get(`${尺寸}x${尺寸}`);
    let 通過 = Boolean(規格 && 規格.type === 'image/png');
    let 說明 = 規格 ? 規格.src : 'Manifest 未設定';
    if (通過) {
      try {
        const 圖片尺寸 = 取得PNG尺寸(路徑工具.resolve(前端目錄, 規格.src));
        通過 = 圖片尺寸.寬 === 尺寸 && 圖片尺寸.高 === 尺寸;
        說明 = `${圖片尺寸.寬}×${圖片尺寸.高} PNG`;
      } catch (錯誤) {
        通過 = false;
        說明 = 錯誤.message;
      }
    }
    記錄('PWA', `安裝圖示 ${尺寸}×${尺寸}`, 通過, 說明);
  }

  const 外殼必要項目 = ['智慧5S資料修復.js', '智慧5S圖示-192.png', '智慧5S圖示-512.png', '離線頁.html'];
  外殼必要項目.forEach(檔名 => {
    記錄('離線快取', 檔名, 離線服務.includes(`'./${檔名}'`), '應包含於應用程式外殼');
  });
  記錄(
    '離線快取',
    '忽略版本查詢參數',
    /caches\.match\(請求,\s*\{\s*ignoreSearch:\s*true\s*\}\)/.test(離線服務),
    '首次安裝後即使資源帶有 ?v=102 仍可命中離線外殼'
  );
}

async function 驗收資料解析(正式回應) {
  const 修復程式 = 檔案系統.readFileSync(路徑工具.join(前端目錄, '智慧5S資料修復.js'), 'utf8');
  const 原始資料庫 = {
    讀取後端: async () => 正式回應,
    寫入後端: async () => ({}),
    送出或排隊: async () => ({}),
    同步佇列: async () => ({}),
    佇列全部: async () => [],
    將資料列轉物件: () => ({})
  };
  const 執行環境 = {
    window: { 智慧5S資料庫: 原始資料庫 },
    console: { info() {}, warn() {}, error() {} }
  };
  虛擬機.createContext(執行環境);
  虛擬機.runInContext(修復程式, 執行環境, { filename: '智慧5S資料修復.js' });
  const 結果 = await 執行環境.window.智慧5S資料庫.讀取分頁('01_人員主檔', 1);
  const 通過 = 結果.欄位.includes('工號') && 結果.欄位.includes('姓名') && 結果.資料.length > 0;
  記錄('登入資料', '正式人員主檔解析', 通過, `欄位 ${結果.欄位.length}、資料列 ${結果.資料.length}`);
}

async function 讀取正式分頁(後端網址, 試算表識別碼, 分頁名稱) {
  const 網址 = new URL(後端網址);
  const 參數 = {
    action: 'sheetData',
    spreadsheetId: 試算表識別碼,
    sheet: 分頁名稱,
    limit: '1',
    query: ''
  };
  Object.entries(參數).forEach(([鍵, 值]) => 網址.searchParams.set(鍵, 值));
  const 控制器 = new AbortController();
  const 計時器 = setTimeout(() => 控制器.abort(), 30000);
  try {
    const 回應 = await fetch(網址, { redirect: 'follow', signal: 控制器.signal });
    const 文字 = await 回應.text();
    let 資料;
    try {
      資料 = JSON.parse(String(文字).trim().replace(/^\uFEFF/, ''));
    } catch (錯誤) {
      throw new Error(`HTTP ${回應.status}，回傳內容不是 JSON`);
    }
    if (!回應.ok || 資料.ok === false || 資料.成功 === false) {
      throw new Error(String(資料.error || 資料.訊息 || `HTTP ${回應.status}`));
    }
    return 資料;
  } finally {
    clearTimeout(計時器);
  }
}

async function 驗收正式資料庫() {
  if (略過線上) {
    記錄('正式 API', '15 張中央資料庫分頁', true, '依參數略過線上驗收');
    return;
  }
  const 設定程式 = 檔案系統.readFileSync(路徑工具.join(前端目錄, '智慧5S設定.js'), 'utf8');
  const 後端網址 = 擷取設定值(設定程式, '後端網址');
  const 試算表識別碼 = 擷取設定值(設定程式, '試算表識別碼');
  const 待測 = 必要分頁.slice();
  const 回應快取 = {};

  async function 工作者() {
    while (待測.length) {
      const 分頁 = 待測.shift();
      try {
        const 回應 = await 讀取正式分頁(後端網址, 試算表識別碼, 分頁);
        回應快取[分頁] = 回應;
        const 資料列 = Array.isArray(回應.rows)
          ? 回應.rows
          : (Array.isArray(回應.資料) ? 回應.資料 : (Array.isArray(回應.data) ? 回應.data : []));
        記錄('正式 API', 分頁, true, `可讀取，回傳 ${資料列.length} 列`);
      } catch (錯誤) {
        記錄('正式 API', 分頁, false, 錯誤.name === 'AbortError' ? '請求逾時' : 錯誤.message);
      }
    }
  }

  await Promise.all([工作者(), 工作者(), 工作者()]);
  if (回應快取['01_人員主檔']) await 驗收資料解析(回應快取['01_人員主檔']);
}

function 輸出報告() {
  console.table(驗收結果);
  const 失敗項目 = 驗收結果.filter(項目 => 項目.結果 === '失敗');
  console.log('');
  console.log(`智慧 5S 正式驗收：共 ${驗收結果.length} 項，通過 ${驗收結果.length - 失敗項目.length} 項，失敗 ${失敗項目.length} 項。`);
  if (失敗項目.length) {
    console.log('失敗項目：');
    失敗項目.forEach(項目 => console.log(`- ${項目.分類}｜${項目.項目}｜${項目.說明}`));
    process.exitCode = 1;
  }
}

async function 主程式() {
  驗收必要檔案();
  驗收JavaScript語法();
  驗收版本與PWA();
  await 驗收正式資料庫();
  輸出報告();
}

主程式().catch(錯誤 => {
  console.error('智慧 5S 驗收程式執行失敗：', 錯誤.stack || 錯誤);
  process.exit(1);
});
