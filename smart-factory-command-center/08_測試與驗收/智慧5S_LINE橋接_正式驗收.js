#!/usr/bin/env node
'use strict';

/**
 * 化新精密｜智慧 5S｜唯一 LINE Bot 群組綁定與通知橋接正式驗收
 *
 * 執行方式：
 *   node smart-factory-command-center/08_測試與驗收/智慧5S_LINE橋接_正式驗收.js
 *
 * 本程式只在記憶體模擬 LINE Webhook、Google 試算表與 Apps Script 服務，
 * 不會連線、不會推播、不會修改正式資料。
 */

const 檔案系統 = require('fs');
const 路徑工具 = require('path');
const 虛擬機 = require('vm');
const 斷言 = require('assert');

const 專案根目錄 = 路徑工具.resolve(__dirname, '..', '..');
const 後端目錄 = 路徑工具.join(專案根目錄, 'smart-factory-command-center', '01_GAS後端');
const 群組程式路徑 = 路徑工具.join(後端目錄, '智慧5S_LINE群組綁定.gs');
const 橋接程式路徑 = 路徑工具.join(後端目錄, '智慧5S_LINE唯一Bot橋接.gs');
const 身分程式路徑 = 路徑工具.join(後端目錄, '33_LINE_主管權限與身份綁定.gs');
const 資料庫設定程式路徑 = 路徑工具.join(後端目錄, '38_7_正式完整主檔資料庫ID設定.gs');
const 鎖定程式路徑 = 路徑工具.join(專案根目錄, 'gas', '鎖定正式主資料庫_智慧工廠主資料庫.gs');

const 結果 = [];

function 驗收(分類, 項目, 動作) {
  try {
    動作();
    結果.push({ 分類, 項目, 結果: '通過', 說明: '' });
  } catch (錯誤) {
    結果.push({ 分類, 項目, 結果: '失敗', 說明: 錯誤.stack || 錯誤.message });
  }
}

class 模擬範圍 {
  constructor(分頁, 起始列, 起始欄, 列數, 欄數) {
    this.分頁 = 分頁;
    this.起始列 = 起始列;
    this.起始欄 = 起始欄;
    this.列數 = 列數 || 1;
    this.欄數 = 欄數 || 1;
  }

  取值(轉文字) {
    const 輸出 = [];
    for (let 列偏移 = 0; 列偏移 < this.列數; 列偏移++) {
      const 列 = [];
      for (let 欄偏移 = 0; 欄偏移 < this.欄數; 欄偏移++) {
        const 原值 = this.分頁.資料[this.起始列 - 1 + 列偏移]?.[this.起始欄 - 1 + 欄偏移] ?? '';
        列.push(轉文字 ? String(原值 ?? '') : 原值);
      }
      輸出.push(列);
    }
    return 輸出;
  }

  getDisplayValues() { return this.取值(true); }
  getValues() { return this.取值(false); }
  getValue() { return this.取值(false)[0][0]; }

  setValue(值) {
    return this.setValues([[值]]);
  }

  setValues(值陣列) {
    for (let 列偏移 = 0; 列偏移 < 值陣列.length; 列偏移++) {
      const 目標列 = this.起始列 - 1 + 列偏移;
      while (this.分頁.資料.length <= 目標列) this.分頁.資料.push([]);
      for (let 欄偏移 = 0; 欄偏移 < 值陣列[列偏移].length; 欄偏移++) {
        const 目標欄 = this.起始欄 - 1 + 欄偏移;
        while (this.分頁.資料[目標列].length <= 目標欄) this.分頁.資料[目標列].push('');
        this.分頁.資料[目標列][目標欄] = 值陣列[列偏移][欄偏移];
      }
    }
    return this;
  }

  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
}

class 模擬分頁 {
  constructor(名稱, 資料) {
    this.名稱 = 名稱;
    this.資料 = (資料 || []).map(列 => 列.slice());
    this.凍結列數 = 0;
  }

  getName() { return this.名稱; }
  getLastRow() { return this.資料.length; }
  getLastColumn() { return this.資料.reduce((最大, 列) => Math.max(最大, 列.length), 0); }
  getRange(列, 欄, 列數, 欄數) { return new 模擬範圍(this, 列, 欄, 列數, 欄數); }
  getDataRange() { return new 模擬範圍(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  appendRow(列) { this.資料.push(列.slice()); return this; }
  setFrozenRows(列數) { this.凍結列數 = 列數; return this; }
}

class 模擬資料庫 {
  constructor(分頁物件, 識別碼, 名稱) {
    this.分頁 = Object.assign({}, 分頁物件 || {});
    this.識別碼 = 識別碼 || '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
    this.名稱 = 名稱 || '⭐智慧工廠主資料庫';
    this.開啟紀錄 = [];
  }

  getId() { return this.識別碼; }
  getName() { return this.名稱; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this.識別碼 + '/edit'; }
  getSheetByName(名稱) { return this.分頁[名稱] || null; }
  insertSheet(名稱) {
    const 分頁 = new 模擬分頁(名稱, []);
    this.分頁[名稱] = 分頁;
    return 分頁;
  }
}

function 建立基礎環境(資料庫, 覆寫) {
  const 指令屬性 = 覆寫?.指令屬性 || {};
  if (!Object.prototype.hasOwnProperty.call(指令屬性, 'LINE_CHANNEL_ACCESS_TOKEN')) 指令屬性.LINE_CHANNEL_ACCESS_TOKEN = '測試權杖';
  const 觸發器 = 覆寫?.觸發器 || [];
  const 環境 = {
    console,
    Date,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    Error,
    encodeURIComponent,
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty: 名稱 => 指令屬性[名稱] || '',
          setProperty(名稱, 值) { 指令屬性[名稱] = String(值); return this; }
        };
      }
    },
    SpreadsheetApp: {
      openById(識別碼) { 資料庫.開啟紀錄.push(識別碼); return 資料庫; },
      flush() {}
    },
    LockService: {
      getScriptLock() { return { waitLock() {}, releaseLock() {} }; }
    },
    Utilities: {
      formatDate() { return '2026-08-10 18:00:00'; }
    },
    ScriptApp: {
      getProjectTriggers() { return 觸發器; },
      deleteTrigger(目標) {
        const 索引 = 觸發器.indexOf(目標);
        if (索引 >= 0) 觸發器.splice(索引, 1);
      },
      newTrigger(函式名稱) {
        const 新觸發器 = { getHandlerFunction: () => 函式名稱 };
        return {
          timeBased() { return this; },
          everyHours() { return this; },
          create() { 觸發器.push(新觸發器); return 新觸發器; }
        };
      }
    },
    UrlFetchApp: {
      fetch(網址) {
        if (網址.includes('/summary')) {
          return {
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify({ groupId: 'C測試群組', groupName: 'A9 智慧5S示範區' })
          };
        }
        return { getResponseCode: () => 200, getContentText: () => '{}' };
      }
    }
  };
  return Object.assign(環境, 覆寫 || {});
}

function 載入程式(路徑, 環境) {
  const 上下文 = 虛擬機.createContext(環境);
  new 虛擬機.Script(檔案系統.readFileSync(路徑, 'utf8'), { filename: 路徑 }).runInContext(上下文);
  return 上下文;
}

function 區域主檔資料() {
  return [
    ['區域代碼', '區域名稱', '部門', '區域負責人工號', '檢查清單代碼', '巡檢頻率', 'LINE群組識別碼', '啟用'],
    ['A9-簡單專線', 'A9 簡單專線示範區', '製造部', 'A001', '5S-A9-01', '每日', '', '是'],
    ['A9-1069檢驗桌', 'A9 1069 檢驗桌', '製造部', 'A002', '5S-A9-02', '每日', '', '是'],
    ['A9-1070檢驗桌', 'A9 1070 檢驗桌', '製造部', 'A003', '5S-A9-02', '每日', '', '是'],
    ['A9-紅牌暫存區', 'A9 紅牌暫存區', '製造部', 'A004', '5S-A9-03', '每日', '', '是'],
    ['停用區', '停用測試區', '製造部', 'A005', '5S-X', '每日', '', '否']
  ];
}

function 通知紀錄資料() {
  return [
    ['通知編號', '通知場景', '對象類型', '對象識別碼', '訊息類型', '內容摘要', '狀態', '送出時間', '錯誤訊息', '去重鍵'],
    ['MSG-001', '重大巡檢異常', 'LINE群組', 'C測試群組', '待推播', '已送過案件', '已發送', '2026-08-10 17:00:00', '', 'CASE-001'],
    ['MSG-002', '重大巡檢異常', 'LINE群組', 'C測試群組', '待推播', '重複案件', '待發送', '', '', 'CASE-001'],
    ['MSG-003', '新增紅牌', 'LINE群組', 'C測試群組', '待推播', '新紅牌案件', '待發送', '', '', 'CASE-002'],
    ['MSG-004', '重大巡檢異常', 'LINE群組', '', '待推播', '尚未設定群組', '待發送', '', '', 'CASE-003']
  ];
}

function 人員主檔資料(LINE_USER_ID) {
  return [
    ['工號', '姓名', '部門', '組別', '職稱', '班別', 'LINE_USER_ID', '啟用', '備註', '更新時間'],
    ['fhfi573', '黃嘉欣', '製造部', '製一組', '工程師', '早班', LINE_USER_ID || '', '是', '', '2026-08-10 18:00:00'],
    ['A002', '測試人員', '製造部', '製一組', '作業員', '早班', '', '是', '', '2026-08-10 18:00:00']
  ];
}

function 已通過受控測試通知資料() {
  const 資料 = 通知紀錄資料();
  資料.push(['5S-LINE-TEST-001', '受控群組測試', 'LINE群組', 'C測試群組', '測試推播', '測試成功', '已發送', '2026-08-10 17:30:00', '', '5S-LINE-TEST-001']);
  return 資料;
}

function 取得欄位值(分頁, 列號, 欄名) {
  const 欄位 = 分頁.資料[0];
  return 分頁.資料[列號 - 1][欄位.indexOf(欄名)];
}

驗收('語法', '五個 GAS 模組可由 V8 JavaScript 解析', () => {
  new 虛擬機.Script(檔案系統.readFileSync(群組程式路徑, 'utf8'));
  new 虛擬機.Script(檔案系統.readFileSync(橋接程式路徑, 'utf8'));
  new 虛擬機.Script(檔案系統.readFileSync(身分程式路徑, 'utf8'));
  new 虛擬機.Script(檔案系統.readFileSync(資料庫設定程式路徑, 'utf8'));
  new 虛擬機.Script(檔案系統.readFileSync(鎖定程式路徑, 'utf8'));
});

驗收('指令', '六種正式指令皆可正確解析', () => {
  const 資料庫 = new 模擬資料庫({});
  const 上下文 = 載入程式(群組程式路徑, 建立基礎環境(資料庫));
  const 案例 = [
    ['5S群組說明', '說明', ''],
    ['5S群組狀態', '狀態', ''],
    ['5S群組綁定 全部', '綁定', '全部'],
    ['5S綁定 A9-1069檢驗桌', '綁定', 'A9-1069檢驗桌'],
    ['5S群組改綁確認 全部', '改綁確認', '全部'],
    ['5S群組解除確認 A9-1069檢驗桌', '解除確認', 'A9-1069檢驗桌']
  ];
  案例.forEach(([文字, 類型, 目標]) => {
    const 解析 = 上下文.智慧5S_LINE群組綁定_解析指令_(文字);
    斷言.equal(解析.類型, 類型);
    斷言.equal(解析.目標, 目標);
  });
  斷言.equal(上下文.智慧5S_LINE群組綁定_解析指令_('綁定 A123'), null, '不得攔截既有個人身分綁定指令');
});

驗收('權限', '主管與工程師可管理，未綁定與一般員工會被阻擋', () => {
  const 上下文 = 載入程式(群組程式路徑, 建立基礎環境(new 模擬資料庫({})));
  斷言.equal(上下文.智慧5S_LINE群組綁定_檢查管理權限_(null, 'U1').允許, false);
  斷言.equal(上下文.智慧5S_LINE群組綁定_檢查管理權限_({ 啟用: '是', 角色: '現場人員', 權限等級: 10 }, 'U2').允許, false);
  斷言.equal(上下文.智慧5S_LINE群組綁定_檢查管理權限_({ 啟用: '是', 角色: '工程師', 權限等級: 60 }, 'U3').允許, true);
  斷言.equal(上下文.智慧5S_LINE群組綁定_檢查管理權限_({ 啟用: '是', 角色: '主管', 允許主管入口: '是' }, 'U4').允許, true);
  斷言.equal(上下文.智慧5S_LINE群組綁定_檢查管理權限_({ 啟用: '否', 角色: '主管', 權限等級: 99 }, 'U5').允許, false);
});

驗收('唯一主庫', '兩份 33_LINE 程式一致且完全移除舊資料庫 ID', () => {
  const 正式內容 = 檔案系統.readFileSync(身分程式路徑, 'utf8');
  const 備份內容 = 檔案系統.readFileSync(路徑工具.join(專案根目錄, 'gas', '33_LINE_主管權限與身份綁定.gs'), 'utf8');
  const 設定內容 = 檔案系統.readFileSync(資料庫設定程式路徑, 'utf8');
  const 鎖定內容 = 檔案系統.readFileSync(鎖定程式路徑, 'utf8');
  斷言.equal(備份內容, 正式內容, 'gas 與指令中心的 33_LINE 程式必須完全一致');
  斷言.ok(正式內容.includes("LINE身份權限33_正式主庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8'"));
  斷言.ok(!正式內容.includes('1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ'));
  斷言.ok(正式內容.includes('SpreadsheetApp.openById(LINE身份權限33_正式主庫ID)'));
  斷言.ok(設定內容.includes("智慧製造38_7_正式完整主檔資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8'"));
  斷言.ok(設定內容.includes("setProperty('智慧製造_SPREADSHEET_ID', id)"));
  斷言.ok(設定內容.includes("setProperty('智慧製造中央作戰資料庫_ID', id)"));
  斷言.ok(!設定內容.includes('10j1009HMaZol47urKrwt6sWYc3KyxjZGnlHBX5qItnU'));
  斷言.ok(鎖定內容.includes("正式主資料庫_ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8'"));
  斷言.ok(鎖定內容.includes("正式主資料庫_共用屬性鍵 = '智慧製造_SPREADSHEET_ID'"));
});

驗收('資料庫設定', '一次套用會鎖定兩個 Script Property 並建立兩個 33_LINE 分頁', () => {
  const 屬性 = { LINE_CHANNEL_ACCESS_TOKEN: '測試權杖' };
  const 資料庫 = new 模擬資料庫({ '01_人員主檔': new 模擬分頁('01_人員主檔', 人員主檔資料()) });
  const 上下文 = 載入程式(身分程式路徑, 建立基礎環境(資料庫, { 指令屬性: 屬性 }));
  const 套用 = 上下文.套用33_LINE唯一正式主資料庫設定();
  斷言.equal(套用.成功, true);
  斷言.equal(套用.驗收.成功, true);
  斷言.equal(屬性.智慧製造_SPREADSHEET_ID, 資料庫.識別碼);
  斷言.equal(屬性.智慧製造中央作戰資料庫_ID, 資料庫.識別碼);
  斷言.ok(資料庫.getSheetByName('33_LINE身份權限'));
  斷言.ok(資料庫.getSheetByName('33_LINE權限紀錄'));
  斷言.deepEqual(
    Array.from(資料庫.getSheetByName('33_LINE身份權限').資料[0]),
    ['LINE_USER_ID', '工號', '姓名', '部門', '組別', '職稱', '角色', '權限等級', '允許主管入口', '允許主檔檢查', '允許AI摘要', '允許報工', '啟用', '綁定方式', '綁定時間', '最後互動時間', '備註']
  );
});

驗收('未綁定查詢', '一對一輸入權限檢查會明確回覆尚未綁定', () => {
  const 資料庫 = new 模擬資料庫({ '01_人員主檔': new 模擬分頁('01_人員主檔', 人員主檔資料()) });
  const 回覆 = [];
  const 上下文 = 載入程式(身分程式路徑, 建立基礎環境(資料庫, {
    UrlFetchApp: {
      fetch(網址, 設定) {
        回覆.push({ 網址, 設定 });
        return { getResponseCode: () => 200, getContentText: () => '{}' };
      }
    }
  }));
  const 結果 = 上下文.LINE身份權限_嘗試處理Webhook_({ events: [{
    type: 'message', replyToken: 'R未綁定', source: { type: 'user', userId: 'U未綁定' }, message: { type: 'text', text: '權限檢查' }
  }] });
  斷言.equal(結果.已處理, true);
  斷言.equal(回覆.length, 1);
  斷言.ok(JSON.parse(回覆[0].設定.payload).messages[0].text.includes('目前尚未綁定身分'));
  斷言.ok(資料庫.getSheetByName('33_LINE身份權限'));
  斷言.ok(資料庫.getSheetByName('33_LINE權限紀錄'));
});

驗收('身分綁定', 'fhfi573 會寫入黃嘉欣完整身分、權限 60 並回寫人員主檔', () => {
  const 人員分頁 = new 模擬分頁('01_人員主檔', 人員主檔資料());
  const 資料庫 = new 模擬資料庫({ '01_人員主檔': 人員分頁 });
  const 回覆文字 = [];
  const 上下文 = 載入程式(身分程式路徑, 建立基礎環境(資料庫, {
    UrlFetchApp: {
      fetch(網址, 設定) {
        回覆文字.push(JSON.parse(設定.payload).messages[0].text);
        return { getResponseCode: () => 200, getContentText: () => '{}' };
      }
    }
  }));

  const 綁定結果 = 上下文.LINE身份權限_嘗試處理Webhook_({ events: [{
    type: 'message', replyToken: 'R綁定', source: { type: 'user', userId: 'U黃嘉欣' }, message: { type: 'text', text: '綁定 fhfi573' }
  }] });
  斷言.equal(綁定結果.已處理, true);
  斷言.ok(回覆文字[0].includes('身分綁定成功'));
  const 身份分頁 = 資料庫.getSheetByName('33_LINE身份權限');
  斷言.equal(取得欄位值(身份分頁, 2, 'LINE_USER_ID'), 'U黃嘉欣');
  斷言.equal(取得欄位值(身份分頁, 2, '工號'), 'fhfi573');
  斷言.equal(取得欄位值(身份分頁, 2, '姓名'), '黃嘉欣');
  斷言.equal(取得欄位值(身份分頁, 2, '部門'), '製造部');
  斷言.equal(取得欄位值(身份分頁, 2, '組別'), '製一組');
  斷言.equal(取得欄位值(身份分頁, 2, '職稱'), '工程師');
  斷言.equal(取得欄位值(身份分頁, 2, '角色'), '工程師');
  斷言.equal(取得欄位值(身份分頁, 2, '權限等級'), 60);
  斷言.equal(取得欄位值(人員分頁, 2, 'LINE_USER_ID'), 'U黃嘉欣');

  const 查詢結果 = 上下文.LINE身份權限_嘗試處理Webhook_({ events: [{
    type: 'message', replyToken: 'R查詢', source: { type: 'user', userId: 'U黃嘉欣' }, message: { type: 'text', text: '權限檢查' }
  }] });
  斷言.equal(查詢結果.已處理, true);
  const 查詢回覆 = 回覆文字[1];
  ['黃嘉欣', 'fhfi573', '製造部', '製一組', '工程師', '權限等級：60'].forEach(文字 => 斷言.ok(查詢回覆.includes(文字)));
  斷言.ok(資料庫.getSheetByName('33_LINE權限紀錄').getLastRow() >= 4);
  斷言.ok(資料庫.開啟紀錄.every(id => id === 資料庫.識別碼), '所有開啟動作都必須指向唯一正式主庫');
});

驗收('解除綁定', '解除後同步清空人員主檔 LINE_USER_ID，避免權限被自動重建', () => {
  const 人員分頁 = new 模擬分頁('01_人員主檔', 人員主檔資料());
  const 資料庫 = new 模擬資料庫({ '01_人員主檔': 人員分頁 });
  const 上下文 = 載入程式(身分程式路徑, 建立基礎環境(資料庫));
  斷言.equal(上下文.LINE身份權限33_綁定身份_('U解除測試', 'fhfi573').成功, true);
  斷言.equal(上下文.LINE身份權限33_解除綁定_('U解除測試').成功, true);
  斷言.equal(取得欄位值(人員分頁, 2, 'LINE_USER_ID'), '');
  斷言.equal(上下文.LINE身份權限33_取得身份_('U解除測試'), null);
});

驗收('批次身分路由', '已處理的權限查詢會移除，其他事件仍交給原有路由', () => {
  const 資料庫 = new 模擬資料庫({ '01_人員主檔': new 模擬分頁('01_人員主檔', 人員主檔資料()) });
  const 上下文 = 載入程式(身分程式路徑, 建立基礎環境(資料庫));
  const 內容 = { events: [
    { type: 'message', replyToken: 'R1', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text: '權限檢查' } },
    { type: 'message', replyToken: 'R2', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text: '指令' } }
  ] };
  const 結果 = 上下文.LINE身份權限_嘗試處理Webhook_(內容);
  斷言.equal(結果.已處理, false);
  斷言.equal(結果.已部分處理, true);
  斷言.equal(內容.events.length, 1);
  斷言.equal(內容.events[0].message.text, '指令');
});

驗收('非身分指令', '無關文字不會開啟試算表或攔截既有功能', () => {
  const 資料庫 = new 模擬資料庫({});
  const 上下文 = 載入程式(身分程式路徑, 建立基礎環境(資料庫));
  const 結果 = 上下文.LINE身份權限_嘗試處理Webhook_({ events: [{
    type: 'message', replyToken: 'R1', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text: '5S群組說明' }
  }] });
  斷言.equal(結果, null);
  斷言.equal(資料庫.開啟紀錄.length, 0);
});

驗收('LINE 回覆', '直接回覆成功會驗證請求，HTTP 失敗不會靜默吞掉', () => {
  let 發送請求 = null;
  const 成功上下文 = 載入程式(身分程式路徑, 建立基礎環境(new 模擬資料庫({}), {
    UrlFetchApp: {
      fetch(網址, 設定) {
        發送請求 = { 網址, 設定 };
        return { getResponseCode: () => 200, getContentText: () => '{}' };
      }
    }
  }));
  斷言.equal(成功上下文.LINE身份權限33_解析綁定工號_('綁定 fhfi573'), 'fhfi573');
  斷言.equal(成功上下文.LINE身份權限33_依人員推定權限_({ 職稱: '工程師' }).權限等級, 60);
  斷言.equal(成功上下文.LINE身份權限33_回覆_('R身分測試', '身分測試回覆').成功, true);
  斷言.equal(發送請求.網址, 'https://api.line.me/v2/bot/message/reply');
  斷言.equal(JSON.parse(發送請求.設定.payload).messages[0].text, '身分測試回覆');

  const 失敗上下文 = 載入程式(身分程式路徑, 建立基礎環境(new 模擬資料庫({}), {
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 401, getContentText: () => '{"message":"Unauthorized"}' }) }
  }));
  斷言.throws(() => 失敗上下文.LINE身份權限33_回覆_('R失敗', '測試'), /HTTP 401/);
});

驗收('群組驗證', '只接受 Bot 真正所在且 LINE 回傳識別碼一致的群組', () => {
  const 上下文 = 載入程式(群組程式路徑, 建立基礎環境(new 模擬資料庫({})));
  const 摘要 = 上下文.智慧5S_LINE群組綁定_取得群組摘要_('C測試群組');
  斷言.equal(摘要.成功, true);
  斷言.equal(摘要.群組名稱, 'A9 智慧5S示範區');
});

驗收('群組綁定', '主管可由群組指令一次綁定四個啟用區域', () => {
  const 區域分頁 = new 模擬分頁('5S_區域主檔', 區域主檔資料());
  const 資料庫 = new 模擬資料庫({ '5S_區域主檔': 區域分頁 });
  let 回覆文字 = '';
  const 上下文 = 載入程式(群組程式路徑, 建立基礎環境(資料庫, {
    LINE身份權限33_取得身份_: () => ({ LINE_USER_ID: 'U主管', 工號: 'A001', 姓名: '測試主管', 角色: '主管', 權限等級: 80, 允許主管入口: '是', 啟用: '是' }),
    回覆LINE_: (權杖, 文字) => { 回覆文字 = 文字; }
  }));
  const 回傳 = 上下文.智慧5S_LINE群組綁定_嘗試處理Webhook_({ events: [{
    type: 'message', replyToken: 'R1', source: { type: 'group', groupId: 'C測試群組', userId: 'U主管' }, message: { type: 'text', text: '5S群組綁定 全部' }
  }] });
  斷言.equal(回傳.已處理, true);
  for (let 列號 = 2; 列號 <= 5; 列號++) 斷言.equal(取得欄位值(區域分頁, 列號, 'LINE群組識別碼'), 'C測試群組');
  斷言.equal(取得欄位值(區域分頁, 6, 'LINE群組識別碼'), '', '停用區域不得被綁定');
  斷言.ok(回覆文字.includes('綁定完成'));
  斷言.equal(資料庫.getSheetByName('5S_LINE群組綁定紀錄').getLastRow(), 5, '應有表頭與四筆稽核紀錄');
});

驗收('批次路由', '同批 Webhook 的非 5S 事件會保留給既有 LINE 模組', () => {
  const 資料庫 = new 模擬資料庫({});
  let 回覆次數 = 0;
  const 上下文 = 載入程式(群組程式路徑, 建立基礎環境(資料庫, {
    回覆LINE_: () => { 回覆次數++; }
  }));
  const 內容 = { events: [
    { type: 'message', replyToken: 'R1', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text: '5S群組說明' } },
    { type: 'message', replyToken: 'R2', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text: '今日戰情' } }
  ] };
  const 回傳 = 上下文.智慧5S_LINE群組綁定_嘗試處理Webhook_(內容);
  斷言.equal(回傳.已處理, false);
  斷言.equal(回傳.已部分處理, true);
  斷言.equal(內容.events.length, 1);
  斷言.equal(內容.events[0].message.text, '今日戰情');
  斷言.equal(回覆次數, 1);
});

驗收('改綁保護', '既有其他群組不會被普通綁定覆蓋', () => {
  const 資料 = 區域主檔資料();
  資料[1][6] = 'C其他群組';
  const 區域分頁 = new 模擬分頁('5S_區域主檔', 資料);
  const 資料庫 = new 模擬資料庫({ '5S_區域主檔': 區域分頁 });
  const 上下文 = 載入程式(群組程式路徑, 建立基礎環境(資料庫));
  const 身份 = { LINE_USER_ID: 'U主管', 工號: 'A001', 姓名: '測試主管' };
  const 普通綁定 = 上下文.智慧5S_LINE群組綁定_執行綁定_('C測試群組', 'A9 智慧5S示範區', 'A9-簡單專線', false, 身份);
  斷言.equal(普通綁定.成功, false);
  斷言.equal(普通綁定.需要改綁確認, true);
  斷言.equal(取得欄位值(區域分頁, 2, 'LINE群組識別碼'), 'C其他群組');
  const 確認改綁 = 上下文.智慧5S_LINE群組綁定_執行綁定_('C測試群組', 'A9 智慧5S示範區', 'A9-簡單專線', true, 身份);
  斷言.equal(確認改綁.成功, true);
  斷言.equal(取得欄位值(區域分頁, 2, 'LINE群組識別碼'), 'C測試群組');
});

驗收('解除保護', '只能解除目前群組擁有的區域', () => {
  const 資料 = 區域主檔資料();
  資料[1][6] = 'C測試群組';
  資料[2][6] = 'C其他群組';
  const 區域分頁 = new 模擬分頁('5S_區域主檔', 資料);
  const 資料庫 = new 模擬資料庫({ '5S_區域主檔': 區域分頁 });
  const 上下文 = 載入程式(群組程式路徑, 建立基礎環境(資料庫));
  const 解除 = 上下文.智慧5S_LINE群組綁定_執行解除_('C測試群組', 'A9 智慧5S示範區', '全部', { LINE_USER_ID: 'U主管' });
  斷言.equal(解除.成功, true);
  斷言.equal(取得欄位值(區域分頁, 2, 'LINE群組識別碼'), '');
  斷言.equal(取得欄位值(區域分頁, 3, 'LINE群組識別碼'), 'C其他群組');
});

驗收('通知內容', '自動加入通知編號與正式 PWA 入口且不重複加入', () => {
  const 上下文 = 載入程式(橋接程式路徑, 建立基礎環境(new 模擬資料庫({})));
  const 內容 = 上下文.智慧5S_LINE橋接_建立通知內容_('【5S紅牌】測試物品', 'MSG-100');
  斷言.ok(內容.includes('MSG-100'));
  斷言.ok(內容.includes('https://qhero70.github.io/smart-factory-worker-app/5s/?來源=LINEBOT&v=1360'));
  const 再建立 = 上下文.智慧5S_LINE橋接_建立通知內容_(內容, 'MSG-100');
  斷言.equal((再建立.match(/https:\/\/qhero70\.github\.io/g) || []).length, 1);
});

驗收('去重推播', '已發送去重鍵會阻擋，正常案件只發一次，空白群組轉待設定', () => {
  const 通知分頁 = new 模擬分頁('5S_通知紀錄', 通知紀錄資料());
  const 區域分頁 = new 模擬分頁('5S_區域主檔', 區域主檔資料());
  const 資料庫 = new 模擬資料庫({ '5S_通知紀錄': 通知分頁, '5S_區域主檔': 區域分頁 });
  const 已發送內容 = [];
  const 上下文 = 載入程式(橋接程式路徑, 建立基礎環境(資料庫, {
    發送LINE通知: 資料 => { 已發送內容.push(資料); return { 成功: true }; }
  }));
  const 回傳 = 上下文.智慧5S_LINE橋接_處理待通知(20);
  斷言.equal(回傳.已發送, 1);
  斷言.equal(回傳.已阻擋重複, 1);
  斷言.equal(回傳.待設定, 1);
  斷言.equal(已發送內容.length, 1);
  斷言.ok(已發送內容[0].通知內容.includes('新紅牌案件'));
  斷言.ok(已發送內容[0].通知內容.includes('開啟智慧 5S'));
  斷言.equal(取得欄位值(通知分頁, 3, '狀態'), '失敗');
  斷言.ok(String(取得欄位值(通知分頁, 3, '錯誤訊息')).includes('去重保護'));
  斷言.equal(取得欄位值(通知分頁, 4, '狀態'), '已發送');
  斷言.equal(取得欄位值(通知分頁, 5, '狀態'), '待設定');
});

驗收('排程保護', '群組未全部設定時拒絕建立排程', () => {
  const 通知分頁 = new 模擬分頁('5S_通知紀錄', 通知紀錄資料());
  const 區域分頁 = new 模擬分頁('5S_區域主檔', 區域主檔資料());
  const 資料庫 = new 模擬資料庫({ '5S_通知紀錄': 通知分頁, '5S_區域主檔': 區域分頁 });
  const 觸發器 = [];
  const 上下文 = 載入程式(橋接程式路徑, 建立基礎環境(資料庫, {
    觸發器,
    發送LINE通知: () => ({ 成功: true })
  }));
  const 回傳 = 上下文.智慧5S_LINE橋接_建立每小時觸發器();
  斷言.equal(回傳.成功, false);
  斷言.equal(觸發器.length, 0);
});

驗收('排程建立', '四區完成設定且無衝突時只建立唯一橋接排程', () => {
  const 區域資料 = 區域主檔資料();
  for (let i = 1; i <= 4; i++) 區域資料[i][6] = 'C測試群組';
  const 通知分頁 = new 模擬分頁('5S_通知紀錄', 已通過受控測試通知資料());
  const 區域分頁 = new 模擬分頁('5S_區域主檔', 區域資料);
  const 資料庫 = new 模擬資料庫({ '5S_通知紀錄': 通知分頁, '5S_區域主檔': 區域分頁 });
  const 觸發器 = [{ getHandlerFunction: () => '智慧5S_LINE橋接_每小時' }];
  const 上下文 = 載入程式(橋接程式路徑, 建立基礎環境(資料庫, {
    觸發器,
    發送LINE通知: () => ({ 成功: true })
  }));
  const 回傳 = 上下文.智慧5S_LINE橋接_建立每小時觸發器();
  斷言.equal(回傳.成功, true);
  斷言.equal(觸發器.length, 1);
  斷言.equal(觸發器[0].getHandlerFunction(), '智慧5S_LINE橋接_每小時');
});

驗收('衝突保護', '偵測主 GAS 直接通知排程時拒絕建立第二條路徑', () => {
  const 區域資料 = 區域主檔資料();
  for (let i = 1; i <= 4; i++) 區域資料[i][6] = 'C測試群組';
  const 資料庫 = new 模擬資料庫({
    '5S_通知紀錄': new 模擬分頁('5S_通知紀錄', 已通過受控測試通知資料()),
    '5S_區域主檔': new 模擬分頁('5S_區域主檔', 區域資料)
  });
  const 觸發器 = [{ getHandlerFunction: () => '智慧5S_發送待通知自動化' }];
  const 上下文 = 載入程式(橋接程式路徑, 建立基礎環境(資料庫, {
    觸發器,
    發送LINE通知: () => ({ 成功: true })
  }));
  const 回傳 = 上下文.智慧5S_LINE橋接_建立每小時觸發器();
  斷言.equal(回傳.成功, false);
  斷言.deepEqual(Array.from(回傳.健康檢查.衝突觸發器), ['智慧5S_發送待通知自動化']);
});

驗收('受控測試', '未輸入安全確認文字時不得實際推播', () => {
  let 發送次數 = 0;
  const 上下文 = 載入程式(橋接程式路徑, 建立基礎環境(new 模擬資料庫({}), {
    發送LINE通知: () => { 發送次數++; }
  }));
  const 回傳 = 上下文.智慧5S_LINE橋接_發送區域測試('A9-1069檢驗桌', '');
  斷言.equal(回傳.成功, false);
  斷言.equal(發送次數, 0);
});

驗收('路由接線', '三份現行 doPost 來源皆接入 5S 群組與身分權限處理器', () => {
  const 檔案 = ['總控_38_6_doPost最終接線.gs', '37_LINE_主後端doPost正式替換段.gs', '智慧製造中央作戰指揮中心.gs'];
  檔案.forEach(名稱 => {
    const 內容 = 檔案系統.readFileSync(路徑工具.join(後端目錄, 名稱), 'utf8');
    斷言.ok(內容.includes('智慧5S_LINE群組綁定_嘗試處理Webhook_'), 名稱 + ' 未接入 5S 群組處理器');
    斷言.ok(內容.includes('LINE身份權限_嘗試處理Webhook_'), 名稱 + ' 未接入身分權限處理器');
  });
});

const 失敗 = 結果.filter(項目 => 項目.結果 === '失敗');
console.log('\n智慧 5S LINE 橋接正式驗收');
console.log('='.repeat(72));
結果.forEach((項目, 索引) => {
  console.log(`${String(索引 + 1).padStart(2, '0')}. [${項目.結果}] ${項目.分類}｜${項目.項目}`);
  if (項目.說明) console.log('    ' + 項目.說明.split('\n')[0]);
});
console.log('='.repeat(72));
console.log(`總計：${結果.length}｜通過：${結果.length - 失敗.length}｜失敗：${失敗.length}`);

if (失敗.length) {
  console.error('\n失敗明細：');
  失敗.forEach(項目 => console.error(`\n[${項目.分類}] ${項目.項目}\n${項目.說明}`));
  process.exitCode = 1;
} else {
  console.log('結論：所有本機安全驗收通過；未連線、未推播、未修改正式資料。');
}
