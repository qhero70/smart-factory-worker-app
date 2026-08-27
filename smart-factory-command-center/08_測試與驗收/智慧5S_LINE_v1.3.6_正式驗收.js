#!/usr/bin/env node
'use strict';

/**
 * 化新精密｜製一｜智慧5S LINE v1.3.6／Rich Menu v1.8.6 正式驗收
 *
 * 僅在本機記憶體檢查程式、入口版本與圖片，不連線、不推播、不修改正式資料。
 */

const 檔案系統 = require('fs');
const 路徑工具 = require('path');
const 虛擬機 = require('vm');
const 斷言 = require('assert');

const 專案根目錄 = 路徑工具.resolve(__dirname, '..', '..');
const 後端目錄 = 路徑工具.join(專案根目錄, 'smart-factory-command-center', '01_GAS後端');
const 正式入口程式 = 路徑工具.join(後端目錄, '39_LINE智慧5S入口_v1.3.6.gs');
const 快捷選單程式 = 路徑工具.join(後端目錄, '38_LINE_指令中心RichMenu快捷按鈕優化.gs');
const 群組橋接程式 = 路徑工具.join(後端目錄, '智慧5S_LINE唯一Bot橋接.gs');
const 排名程式 = 路徑工具.join(後端目錄, '智慧5S_區域統計排名自動化.gs');
const 主程式 = 路徑工具.join(後端目錄, '智慧製造中央作戰指揮中心.gs');
const 最終接線程式 = 路徑工具.join(後端目錄, '總控_38_6_doPost最終接線.gs');
const 設定檔 = 路徑工具.join(專案根目錄, 'smart-factory-command-center', '04_LINE', '38_LINE_指令中心RichMenu快捷按鈕優化設定.json');
const 圖片目錄 = 路徑工具.join(專案根目錄, 'docs', 'line');

const 結果 = [];

function 驗收(分類, 項目, 動作) {
  try {
    動作();
    結果.push({ 分類, 項目, 結果: '通過', 說明: '' });
  } catch (錯誤) {
    結果.push({ 分類, 項目, 結果: '失敗', 說明: 錯誤.message });
  }
}

function 讀取(路徑) {
  return 檔案系統.readFileSync(路徑, 'utf8');
}

function 建立參數環境(版本) {
  const 資料 = [
    ['參數鍵', '參數值'],
    ['PWA正式入口網址', 'https://qhero70.github.io/smart-factory-worker-app/5s/'],
    ['PWA入口版本', 版本 || '1360']
  ];
  return {
    console,
    URL,
    encodeURIComponent,
    SpreadsheetApp: {
      openById() {
        return {
          getSheetByName(名稱) {
            if (名稱 !== '5S_系統參數') return null;
            return {
              getLastRow: () => 資料.length,
              getDataRange: () => ({ getDisplayValues: () => 資料.map(列 => 列.map(String)) })
            };
          }
        };
      }
    },
    PropertiesService: {
      getScriptProperties() {
        return { getProperty: () => '' };
      }
    }
  };
}

function 載入(檔案, 環境) {
  const 上下文 = 虛擬機.createContext(Object.assign({ console, encodeURIComponent }, 環境 || {}));
  new 虛擬機.Script(讀取(檔案), { filename: 檔案 }).runInContext(上下文);
  return 上下文;
}

function 取得PNG資訊(檔案) {
  const 內容 = 檔案系統.readFileSync(檔案);
  斷言.equal(內容.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', '不是有效 PNG');
  return { 寬: 內容.readUInt32BE(16), 高: 內容.readUInt32BE(20), 位元組: 內容.length };
}

驗收('語法', 'LINE 入口、Rich Menu、群組橋接與排名模組可解析', () => {
  [正式入口程式, 快捷選單程式, 群組橋接程式, 排名程式, 主程式, 最終接線程式]
    .forEach(檔案 => new 虛擬機.Script(讀取(檔案), { filename: 檔案 }));
});

驗收('正式入口', '智慧5S與5S文字指令皆導向中央 v=1360', () => {
  const 上下文 = 載入(正式入口程式, 建立參數環境('1360'));
  ['智慧5S', '5S', '智慧5S入口', '5S入口', '5S巡檢'].forEach(指令 => {
    斷言.equal(上下文.LINE智慧5S入口39_是否入口指令_(指令), true, 指令);
  });
  const 網址 = 上下文.LINE智慧5S入口39_取得網址_('首頁');
  斷言.match(網址, /[?&]來源=LINEBOT(?:&|$)/);
  斷言.match(網址, /[?&]v=1360(?:&|$)/);
  斷言.ok(!/[?&]v=(?:102|103|105)(?:&|$)/.test(網址));
});

驗收('Rich Menu', '主管與員工選單各有六區且各有一個智慧5S直達入口', () => {
  const 上下文 = 載入(快捷選單程式, {
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
    ScriptApp: { getService: () => ({ getUrl: () => '' }) },
    LINE智慧5S入口39_取得網址_: () => 'https://qhero70.github.io/smart-factory-worker-app/5s/?來源=LINEBOT_RICHMENU&v=1360'
  });
  const 清單 = [上下文.RichMenu38_取得主管設定_(), 上下文.RichMenu38_取得員工設定_()];
  清單.forEach(選單 => {
    斷言.deepEqual([選單.size.width, 選單.size.height], [1200, 810]);
    斷言.equal(選單.areas.length, 6);
    const 入口 = 選單.areas.filter(區 => 區.action && 區.action.label === '智慧5S');
    斷言.equal(入口.length, 1);
    斷言.equal(入口[0].action.type, 'uri');
    斷言.match(入口[0].action.uri, /[?&]v=1360(?:&|$)/);
  });
});

驗收('群組訊息', '排名與橋接會把舊 v=103／105 正規化為 v=1360', () => {
  const 排名上下文 = 載入(排名程式, 建立參數環境('1360'));
  const 排名網址 = 排名上下文.智慧5S_區域統計_取得PWA網址_('可視化');
  斷言.match(排名網址, /[?&]v=1360(?:&|$)/);
  斷言.match(排名網址, /頁面=%E5%8F%AF%E8%A6%96%E5%8C%96/);

  const 橋接上下文 = 載入(群組橋接程式, 建立參數環境('1360'));
  const 原始 = '【智慧5S主管排名】｜開啟戰情：https://qhero70.github.io/smart-factory-worker-app/5s/?v=105';
  const 內容 = 橋接上下文.智慧5S_LINE橋接_建立通知內容_(原始, '5S-RANK-TEST');
  斷言.ok(!/[?&]v=(?:102|103|105)(?:&|$)/.test(內容), 內容);
  斷言.match(內容, /[?&]v=1360(?:&|$)/);
  斷言.match(內容, /頁面=%E5%8F%AF%E8%A6%96%E5%8C%96/);
});

驗收('路由', '39 智慧5S入口位於 37 指令中心之前', () => {
  [主程式, 最終接線程式].forEach(檔案 => {
    const 程式 = 讀取(檔案);
    const 入口位置 = 程式.indexOf('LINE智慧5S入口39_嘗試處理Webhook_');
    const 指令中心位置 = 程式.indexOf('LINE指令中心37_嘗試處理Webhook_');
    斷言.ok(入口位置 >= 0, `${路徑工具.basename(檔案)} 缺少 39 路由`);
    斷言.ok(指令中心位置 >= 0, `${路徑工具.basename(檔案)} 缺少 37 路由`);
    斷言.ok(入口位置 < 指令中心位置, `${路徑工具.basename(檔案)} 路由順序錯誤`);
  });
});

驗收('圖片', '主管與員工正式圖皆為 1200×810 PNG 且小於 1MB', () => {
  ['richmenu-supervisor-v186.png', 'richmenu-worker-v186.png'].forEach(檔名 => {
    const 資訊 = 取得PNG資訊(路徑工具.join(圖片目錄, 檔名));
    斷言.deepEqual([資訊.寬, 資訊.高], [1200, 810], 檔名);
    斷言.ok(資訊.位元組 < 1024 * 1024, `${檔名} 超過 1MB`);
  });
});

驗收('設定', 'Rich Menu 設定檔為 v1.8.6且兩種角色都有智慧5S', () => {
  const 設定 = JSON.parse(讀取(設定檔));
  斷言.match(設定.版本, /^v1\.8\.6/);
  斷言.equal(設定.主管入口六宮格.filter(區 => 區.功能 === '智慧5S').length, 1);
  斷言.equal(設定.一般員工入口六宮格.filter(區 => 區.功能 === '智慧5S').length, 1);
});

驗收('主庫', 'Rich Menu 上線紀錄直接鎖定智慧5S中央主資料庫', () => {
  const 程式 = 讀取(快捷選單程式);
  斷言.ok(程式.includes("RichMenu38_正式主庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8'"));
  斷言.ok(!/(^|[^\p{L}\p{N}_])取得試算表_\s*\(/u.test(程式), '不得依賴正式專案不存在的取得試算表_函式');
});

驗收('版本清理', '正式啟用模組不再寫死 v=102／103／105', () => {
  [正式入口程式, 快捷選單程式, 群組橋接程式, 排名程式,
    路徑工具.join(專案根目錄, 'gas', '39_LINE智慧5S入口_v1.2.6.gs'),
    路徑工具.join(專案根目錄, 'gas', '5S_動態稽核LINE提醒_v1.2.0.gs')]
    .forEach(檔案 => 斷言.ok(!/[?&]v=(?:102|103|105)(?:&|['"])/.test(讀取(檔案)), 路徑工具.basename(檔案)));
});

console.table(結果);
const 失敗 = 結果.filter(項目 => 項目.結果 === '失敗');
console.log(`\n智慧5S LINE v1.3.6 正式驗收：共 ${結果.length} 項，通過 ${結果.length - 失敗.length} 項，失敗 ${失敗.length} 項。`);
if (失敗.length) process.exitCode = 1;
