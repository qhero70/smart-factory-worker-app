/**
 * 化新精密｜智慧5S LINE 相容層與每日戰情
 * 版本：1.0.0
 *
 * 目的：
 * 1. 補齊舊 LINE 通知模組呼叫但專案內缺少的 取得試算表()。
 * 2. 不覆寫既有 發送LINE通知()，只做相容。
 * 3. 每日建立智慧5S戰情摘要通知，寫入既有 5S_通知紀錄。
 * 4. 紅牌到期前 7 天、3 天、1 天與逾期時建立提醒；依日期去重。
 * 5. 通知仍由既有 智慧5S_LINE橋接_處理待通知() 統一發送。
 */

var 智慧5S_每日戰情_版本 = '1.0.0';
var 智慧5S_每日戰情_資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S_每日戰情_排程函式 = '智慧5S_每日戰情_自動執行';

/**
 * 舊 LINE 通知模組相容層。
 * 若其他正式模組已定義同名函式，請不要重複貼入 Apps Script。
 */
function 取得試算表() {
  return SpreadsheetApp.openById(智慧5S_每日戰情_資料庫ID);
}

function 智慧5S_每日戰情_自動執行() {
  var 建立結果 = 智慧5S_每日戰情_建立通知();
  var 發送結果 = null;
  if (typeof 智慧5S_LINE橋接_處理待通知 === 'function') {
    發送結果 = 智慧5S_LINE橋接_處理待通知(30);
  }
  return {
    成功: true,
    版本: 智慧5S_每日戰情_版本,
    建立通知: 建立結果,
    發送通知: 發送結果
  };
}

function 智慧5S_每日戰情_建立通知() {
  var 資料庫 = SpreadsheetApp.openById(智慧5S_每日戰情_資料庫ID);
  var 紅牌分頁 = 資料庫.getSheetByName('5S_紅牌追蹤');
  var 改善分頁 = 資料庫.getSheetByName('5S_改善單');
  var 通知分頁 = 資料庫.getSheetByName('5S_通知紀錄');
  var 區域分頁 = 資料庫.getSheetByName('5S_區域主檔');
  if (!紅牌分頁 || !改善分頁 || !通知分頁 || !區域分頁) {
    throw new Error('智慧5S每日戰情缺少必要分頁');
  }

  var 群組識別碼 = 智慧5S_每日戰情_取得主要群組_(區域分頁);
  if (!群組識別碼) {
    return { 成功: false, 訊息: '尚未取得智慧5S LINE群組識別碼', 新增通知數: 0 };
  }

  var 今天 = new Date();
  var 今天字串 = Utilities.formatDate(今天, 'Asia/Taipei', 'yyyy-MM-dd');
  var 新增通知數 = 0;

  var 紅牌資料 = 智慧5S_每日戰情_讀取表格_(紅牌分頁);
  var 待處置 = 紅牌資料.filter(function (列) {
    var 狀態 = String(列['案件狀態'] || '').trim();
    return 狀態 && ['已結案', '已完成', '作廢'].indexOf(狀態) < 0;
  });

  var 已逾期 = 0;
  var 七日內到期 = 0;
  待處置.forEach(function (列) {
    var 到期 = 智慧5S_每日戰情_解析日期_(列['預定處置日']);
    if (!到期) return;
    var 剩餘天數 = 智慧5S_每日戰情_日期差_(今天, 到期);
    if (剩餘天數 < 0) 已逾期++;
    if (剩餘天數 >= 0 && 剩餘天數 <= 7) 七日內到期++;

    if ([7, 3, 1, 0].indexOf(剩餘天數) >= 0 || 剩餘天數 < 0) {
      var 紅牌編號 = String(列['紅牌編號'] || '').trim();
      var 去重鍵 = '5S-RP-DEADLINE-' + 紅牌編號 + '-' + 今天字串;
      var 狀態文字 = 剩餘天數 < 0 ? '已逾期 ' + Math.abs(剩餘天數) + ' 天' : (剩餘天數 === 0 ? '今天到期' : '剩 ' + 剩餘天數 + ' 天到期');
      var 摘要 = '【5S紅牌期限提醒】' + 紅牌編號 + '｜' + String(列['區域'] || '') + '｜' + String(列['物品名稱'] || '') + '｜' + 狀態文字 + '｜預定處置日：' + String(列['預定處置日'] || '');
      if (智慧5S_每日戰情_新增通知_(通知分頁, {
        通知編號: '5S-DEADLINE-' + 紅牌編號 + '-' + 今天字串.replace(/-/g, ''),
        通知場景: '紅牌期限提醒',
        對象類型: 'LINE群組',
        對象識別碼: 群組識別碼,
        訊息類型: '期限提醒',
        內容摘要: 摘要,
        狀態: '待發送',
        送出時間: '',
        錯誤訊息: '',
        去重鍵: 去重鍵
      })) 新增通知數++;
    }
  });

  var 改善資料 = 智慧5S_每日戰情_讀取表格_(改善分頁);
  var 改善未結案 = 改善資料.filter(function (列) {
    var 狀態 = String(列['狀態'] || '').trim();
    return 狀態 && ['已結案', '已完成', '作廢'].indexOf(狀態) < 0;
  }).length;

  var 每日去重鍵 = '5S-DAILY-' + 今天字串;
  var 每日摘要 = '【智慧5S每日戰情】' + 今天字串 + '｜待處置紅牌：' + 待處置.length + '｜7日內到期：' + 七日內到期 + '｜已逾期：' + 已逾期 + '｜改善未結案：' + 改善未結案;
  if (智慧5S_每日戰情_新增通知_(通知分頁, {
    通知編號: '5S-DAILY-' + 今天字串.replace(/-/g, ''),
    通知場景: '每日5S戰情',
    對象類型: 'LINE群組',
    對象識別碼: 群組識別碼,
    訊息類型: '每日摘要',
    內容摘要: 每日摘要,
    狀態: '待發送',
    送出時間: '',
    錯誤訊息: '',
    去重鍵: 每日去重鍵
  })) 新增通知數++;

  SpreadsheetApp.flush();
  return {
    成功: true,
    日期: 今天字串,
    待處置紅牌: 待處置.length,
    七日內到期: 七日內到期,
    已逾期: 已逾期,
    改善未結案: 改善未結案,
    新增通知數: 新增通知數
  };
}

function 智慧5S_每日戰情_建立每日觸發器() {
  智慧5S_每日戰情_刪除觸發器_();
  ScriptApp.newTrigger(智慧5S_每日戰情_排程函式)
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .nearMinute(5)
    .create();
  return { 成功: true, 版本: 智慧5S_每日戰情_版本, 訊息: '智慧5S每日戰情觸發器已建立，約每日08:05執行' };
}

function 智慧5S_每日戰情_停止每日觸發器() {
  var 數量 = 智慧5S_每日戰情_刪除觸發器_();
  return { 成功: true, 已刪除觸發器數: 數量 };
}

function 智慧5S_每日戰情_刪除觸發器_() {
  var 數量 = 0;
  ScriptApp.getProjectTriggers().forEach(function (觸發器) {
    if (觸發器.getHandlerFunction() === 智慧5S_每日戰情_排程函式) {
      ScriptApp.deleteTrigger(觸發器);
      數量++;
    }
  });
  return 數量;
}

function 智慧5S_每日戰情_取得主要群組_(區域分頁) {
  if (區域分頁.getLastRow() < 2) return '';
  var 欄位 = 區域分頁.getRange(1, 1, 1, 區域分頁.getLastColumn()).getDisplayValues()[0];
  var 索引 = {};
  欄位.forEach(function (欄名, i) { 索引[String(欄名 || '').trim()] = i; });
  var 資料 = 區域分頁.getRange(2, 1, 區域分頁.getLastRow() - 1, 欄位.length).getDisplayValues();
  for (var i = 0; i < 資料.length; i++) {
    var 啟用 = String(資料[i][索引['啟用']] || '是').trim();
    var 群組 = String(資料[i][索引['LINE群組識別碼']] || '').trim();
    if (啟用 !== '否' && 群組) return 群組;
  }
  return '';
}

function 智慧5S_每日戰情_讀取表格_(分頁) {
  if (分頁.getLastRow() < 2) return [];
  var 欄位 = 分頁.getRange(1, 1, 1, 分頁.getLastColumn()).getDisplayValues()[0];
  var 資料 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 欄位.length).getDisplayValues();
  return 資料.map(function (列) {
    var 物件 = {};
    欄位.forEach(function (欄名, i) { 物件[String(欄名 || '').trim()] = 列[i]; });
    return 物件;
  });
}

function 智慧5S_每日戰情_新增通知_(通知分頁, 物件) {
  var 欄位 = 通知分頁.getRange(1, 1, 1, 通知分頁.getLastColumn()).getDisplayValues()[0];
  var 去重鍵索引 = 欄位.indexOf('去重鍵');
  if (去重鍵索引 < 0) throw new Error('5S_通知紀錄缺少去重鍵欄位');
  if (通知分頁.getLastRow() >= 2) {
    var 現有 = 通知分頁.getRange(2, 去重鍵索引 + 1, 通知分頁.getLastRow() - 1, 1).getDisplayValues();
    for (var i = 0; i < 現有.length; i++) {
      if (String(現有[i][0] || '').trim() === String(物件.去重鍵 || '').trim()) return false;
    }
  }
  通知分頁.appendRow(欄位.map(function (欄名) {
    return 物件[欄名] !== undefined ? 物件[欄名] : '';
  }));
  return true;
}

function 智慧5S_每日戰情_解析日期_(值) {
  if (!值) return null;
  if (Object.prototype.toString.call(值) === '[object Date]' && !isNaN(值.getTime())) return 值;
  var 文字 = String(值).trim().replace(/\//g, '-');
  var m = 文字.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

function 智慧5S_每日戰情_日期差_(起日, 迄日) {
  var a = new Date(起日.getFullYear(), 起日.getMonth(), 起日.getDate(), 12, 0, 0);
  var b = new Date(迄日.getFullYear(), 迄日.getMonth(), 迄日.getDate(), 12, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
