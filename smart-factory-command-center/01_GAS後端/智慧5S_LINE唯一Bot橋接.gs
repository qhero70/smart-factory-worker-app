/**
 * 化新精密｜智慧 5S｜既有唯一 LINE Bot 通知橋接
 * 版本：1.0.2
 *
 * 部署位置：既有「NEXUS OS 智慧製造系統」Apps Script 專案。
 * 原則：
 * 1. 沿用該專案既有 LINE_CHANNEL_ACCESS_TOKEN，不複製、不外洩權杖。
 * 2. 只讀寫唯一中央資料庫的 5S_通知紀錄，不建立第二套資料庫。
 * 3. 對象識別碼空白時不推播，改標記為「待設定」，避免送到錯誤群組。
 * 4. 沿用既有 發送LINE通知()，保留 NEXUS OS 的發送紀錄與錯誤處理。
 */

var 智慧5S_LINE橋接_版本 = '1.0.2';
var 智慧5S_LINE橋接_中央資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S_LINE橋接_通知分頁 = '5S_通知紀錄';

function 智慧5S_LINE橋接_處理待通知(上限) {
  var 鎖 = LockService.getScriptLock();
  鎖.waitLock(30000);
  try {
    var 最大筆數 = Math.max(1, Math.min(50, Number(上限 || 20)));
    var 權杖已設定 = Boolean(String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim());
    if (!權杖已設定) return { 成功: false, 已發送: 0, 失敗: 0, 待設定: 0, 訊息: '既有 LINE Bot 尚未設定權杖' };
    if (typeof 發送LINE通知 !== 'function') return { 成功: false, 已發送: 0, 失敗: 0, 待設定: 0, 訊息: '找不到既有 發送LINE通知() 函式' };

    var 資料庫 = SpreadsheetApp.openById(智慧5S_LINE橋接_中央資料庫ID);
    var 分頁 = 資料庫.getSheetByName(智慧5S_LINE橋接_通知分頁);
    if (!分頁) throw new Error('找不到分頁：' + 智慧5S_LINE橋接_通知分頁);
    if (分頁.getLastRow() < 2) return { 成功: true, 已發送: 0, 失敗: 0, 待設定: 0, 訊息: '目前沒有 5S 通知' };

    var 最後欄 = 分頁.getLastColumn();
    var 欄位 = 分頁.getRange(1, 1, 1, 最後欄).getDisplayValues()[0];
    var 索引 = 智慧5S_LINE橋接_欄位索引_(欄位);
    var 必要欄位 = ['通知編號','通知場景','對象識別碼','內容摘要','狀態','送出時間','錯誤訊息'];
    var 缺少欄位 = 必要欄位.filter(function (欄名) { return 索引[欄名] === undefined; });
    if (缺少欄位.length) throw new Error('5S_通知紀錄缺少欄位：' + 缺少欄位.join('、'));

    var 資料 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 最後欄).getDisplayValues();
    var 已發送 = 0;
    var 失敗 = 0;
    var 待設定 = 0;
    var 已處理 = 0;
    for (var 列索引 = 0; 列索引 < 資料.length && 已處理 < 最大筆數; 列索引++) {
      var 列 = 資料[列索引];
      if (String(列[索引['狀態']] || '').trim() !== '待發送') continue;
      已處理++;
      var 試算表列號 = 列索引 + 2;
      var 對象 = String(列[索引['對象識別碼']] || '').trim();
      var 場景 = String(列[索引['通知場景']] || '智慧5S通知').trim();
      var 內容 = String(列[索引['內容摘要']] || '').trim();

      if (!對象) {
        分頁.getRange(試算表列號, 索引['狀態'] + 1).setValue('待設定');
        分頁.getRange(試算表列號, 索引['錯誤訊息'] + 1).setValue('缺少區域 LINE 群組識別碼，未執行推播');
        待設定++;
        continue;
      }
      if (!內容) {
        分頁.getRange(試算表列號, 索引['狀態'] + 1).setValue('失敗');
        分頁.getRange(試算表列號, 索引['錯誤訊息'] + 1).setValue('通知內容空白');
        失敗++;
        continue;
      }

      try {
        發送LINE通知({
          LINE_USER_ID: 對象,
          通知標題: '智慧 5S｜' + 場景,
          通知內容: 內容,
          通知類型: 場景
        });
        分頁.getRange(試算表列號, 索引['狀態'] + 1).setValue('已發送');
        分頁.getRange(試算表列號, 索引['送出時間'] + 1).setValue(智慧5S_LINE橋接_現在_());
        分頁.getRange(試算表列號, 索引['錯誤訊息'] + 1).setValue('');
        已發送++;
      } catch (錯誤) {
        分頁.getRange(試算表列號, 索引['狀態'] + 1).setValue('失敗');
        分頁.getRange(試算表列號, 索引['錯誤訊息'] + 1).setValue(String(錯誤.message || 錯誤).slice(0, 500));
        失敗++;
      }
    }
    SpreadsheetApp.flush();
    return {
      成功: 失敗 === 0,
      版本: 智慧5S_LINE橋接_版本,
      已發送: 已發送,
      失敗: 失敗,
      待設定: 待設定,
      訊息: '既有唯一 LINE Bot 的 5S 待通知處理完成'
    };
  } finally {
    鎖.releaseLock();
  }
}

function 智慧5S_LINE橋接_健康檢查() {
  var 屬性 = PropertiesService.getScriptProperties();
  var 資料庫 = SpreadsheetApp.openById(智慧5S_LINE橋接_中央資料庫ID);
  var 通知分頁 = 資料庫.getSheetByName(智慧5S_LINE橋接_通知分頁);
  var 區域分頁 = 資料庫.getSheetByName('5S_區域主檔');
  var 已設定區域數 = 0;
  var 啟用區域數 = 0;
  if (區域分頁 && 區域分頁.getLastRow() >= 2) {
    var 欄位 = 區域分頁.getRange(1, 1, 1, 區域分頁.getLastColumn()).getDisplayValues()[0];
    var 索引 = 智慧5S_LINE橋接_欄位索引_(欄位);
    var 資料 = 區域分頁.getRange(2, 1, 區域分頁.getLastRow() - 1, 欄位.length).getDisplayValues();
    資料.forEach(function (列) {
      if (String(列[索引['啟用']] || '') !== '否') {
        啟用區域數++;
        if (String(列[索引['LINE群組識別碼']] || '').trim()) 已設定區域數++;
      }
    });
  }
  return {
    成功: Boolean(通知分頁) && Boolean(String(屬性.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim()) && typeof 發送LINE通知 === 'function',
    版本: 智慧5S_LINE橋接_版本,
    既有Bot權杖已設定: Boolean(String(屬性.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim()),
    既有發送函式可用: typeof 發送LINE通知 === 'function',
    中央通知分頁可用: Boolean(通知分頁),
    啟用區域數: 啟用區域數,
    已設定群組區域數: 已設定區域數,
    訊息: 已設定區域數 ? '智慧 5S LINE 橋接可處理已設定群組的區域' : '橋接已就緒，尚待填入 5S 區域群組識別碼'
  };
}

function 智慧5S_LINE橋接_建立每小時觸發器() {
  ScriptApp.getProjectTriggers().forEach(function (觸發器) {
    if (觸發器.getHandlerFunction() === '智慧5S_LINE橋接_每小時') ScriptApp.deleteTrigger(觸發器);
  });
  ScriptApp.newTrigger('智慧5S_LINE橋接_每小時').timeBased().everyHours(1).create();
  return { 成功: true, 版本: 智慧5S_LINE橋接_版本, 訊息: '智慧 5S LINE 橋接每小時觸發器已建立' };
}

function 智慧5S_LINE橋接_每小時() {
  return 智慧5S_LINE橋接_處理待通知(30);
}

function 智慧5S_LINE橋接_欄位索引_(欄位) {
  var 結果 = {};
  欄位.forEach(function (欄名, 索引) { 結果[String(欄名 || '').trim()] = 索引; });
  return 結果;
}

function 智慧5S_LINE橋接_現在_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}
