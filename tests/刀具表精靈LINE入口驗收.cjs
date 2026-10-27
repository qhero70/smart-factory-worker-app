/**
 * 化新精密｜唯一 LINE BOT → 刀具表精靈入口唯讀驗收。
 * 本測試只載入 Git 儲存庫文字，不呼叫 LINE API、GAS 或正式資料庫。
 */
'use strict';
const 測試 = require('node:test');
const 斷言 = require('node:assert/strict');
const 檔案 = require('node:fs');
const 路徑 = require('node:path');
const 虛擬機 = require('node:vm');

const 根目錄 = 路徑.resolve(__dirname, '..');
const 後端原始碼 = 檔案.readFileSync(
  路徑.join(根目錄, 'smart-factory-command-center/01_GAS後端/75_LINE_製造工具中心_v1.0.gs'),
  'utf8'
);
const 前端原始碼 = 檔案.readFileSync(
  路徑.join(根目錄, 'docs/tool-change-pwa/index.html'),
  'utf8'
);
const 選單原始碼 = 檔案.readFileSync(
  路徑.join(根目錄, 'smart-factory-command-center/01_GAS後端/38_LINE_指令中心RichMenu快捷按鈕優化.gs'),
  'utf8'
);
const 正式網址 = 'https://qhero70.github.io/smart-factory-worker-app/tool-change-pwa/';
const 正式LINE網址 = 正式網址 + '?source=LINEBOT_TOOL&v=227';

function 取得函數(名稱, 背景) {
  const 起點 = 後端原始碼.indexOf('function ' + 名稱 + '(');
  斷言.ok(起點 >= 0, '找不到既有函數：' + 名稱);
  const 內容 = 後端原始碼.slice(起點);
  const 結束 = 內容.search(/^}\s*$/m);
  斷言.ok(結束 > 0, '無法擷取函數：' + 名稱);
  虛擬機.runInContext(內容.slice(0, 結束 + 1), 背景);
  斷言.equal(typeof 背景[名稱], 'function');
  return 背景[名稱];
}

function 建立背景() {
  return 虛擬機.createContext({
    製造工具75_刀具表精靈網址_: 正式網址,
    製造工具75_刀具表LINE來源_: 'LINEBOT_TOOL',
    製造工具75_補預設圖片_: () => 'https://example.org/工具圖片.png'
  });
}

測試('刀具表精靈舊工具卡仍轉向唯一正式 PWA，保留來源', () => {
  const 背景 = 建立背景();
  const 產生網址 = 取得函數('製造工具75_LINE內開網址_', 背景);
  斷言.equal(產生網址('https://old.example.org/tool', 'TOOL-CUTTING', '刀具表'), 正式LINE網址);
  斷言.equal(產生網址('https://old.example.org/tool', 'TOOL-CUTTING-WIZARD', ''), 正式LINE網址);
  斷言.equal(產生網址(正式網址 + '?source=OLD&openExternalBrowser=1'), 正式LINE網址);
  斷言.equal(產生網址('https://old.example.org/tool', '', '刀具表精靈・手機版'), 正式LINE網址);
});

測試('其他既有工具網址及來源不被強制改成 LINEBOT_TOOL', () => {
  const 背景 = 建立背景();
  const 產生網址 = 取得函數('製造工具75_LINE內開網址_', 背景);
  斷言.equal(產生網址('https://example.org/water?a=1', 'TOOL-WATER-1064', '水位'), 'https://example.org/water?a=1');
  斷言.equal(產生網址('https://example.org/5s/?source=OTHER&openExternalBrowser=1', 'TOOL-5S', '智慧5S'), 'https://example.org/5s/?source=OTHER');
  斷言.equal(產生網址('https://example.org/plan?externalBrowser=true&v=2', 'TOOL-PLAN-CLEANER', '清洗器'), 'https://example.org/plan?v=2');
});

測試('同一張刀具表工具卡的圖片與按鈕都使用正式入口', () => {
  const 背景 = 建立背景();
  取得函數('製造工具75_LINE內開網址_', 背景);
  const 建卡 = 取得函數('製造工具75_建立Bubble_', 背景);
  const 卡片 = 建卡({
    工具編號: 'TOOL-CUTTING',
    顯示名稱: '刀具表精靈・手機版',
    說明: 'A4/A3 刀具表',
    PWA網址: 'https://old.example.org/tool',
    按鈕文字: '開啟最新版',
    分類: '刀具管理'
  });
  斷言.equal(卡片.footer.contents[0].action.uri, 正式LINE網址);
  斷言.equal(卡片.hero.action.uri, 正式LINE網址);
});

測試('既有 Rich Menu 仍以製造工具文字路由交給 75_LINE，不改其他六格', () => {
  斷言.match(選單原始碼, /label: '製造工具',\s*text: '製造工具'/);
  斷言.match(後端原始碼, /LINE製造工具75_嘗試處理Webhook_/);
  斷言.match(後端原始碼, /TOOL-CUTTING/);
});

測試('PWA 具 LINE 瀏覽器提示、外開選項與來源延續程式', () => {
  斷言.match(前端原始碼, /id="line-browser-banner"/);
  斷言.match(前端原始碼, /在瀏覽器開啟/);
  斷言.match(前端原始碼, /function isLineInAppBrowser\(/);
  斷言.match(前端原始碼, /function getOfficialAppUrlForCurrentEntry\(/);
  斷言.match(前端原始碼, /officialUrl\.searchParams\.set\('source', LINE_BOT_TOOL_SOURCE\)/);
  斷言.match(前端原始碼, /function openSystemBrowserGuide\(/);
});
