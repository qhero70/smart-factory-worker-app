/**
 * 化新精密｜智慧 5S 管理平台｜完整後端擴充模組
 * 版本：1.0.0
 * 用途：初始化分頁、戰情統計、LINE 待通知發送、照片轉存 Google Drive。
 *
 * 目前 PWA 已可沿用既有通用 API：sheetData、appendRow、updateRow 直接運作。
 * 本模組屬於進階擴充；加入 Apps Script 專案後，請在主 doPost 路由陣列中加入：
 *   '智慧5S_嘗試處理動作_'
 */

var 智慧5S_版本 = '1.0.0';
var 智慧5S_預設試算表識別碼 = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S_照片資料夾名稱 = '智慧5S照片資料庫';

var 智慧5S_分頁規格 = {
  '5S_區域主檔': ['區域代碼','區域名稱','部門','區域負責人工號','檢查清單代碼','巡檢頻率','LINE群組識別碼','啟用'],
  '5S_檢查項目': ['項目代碼','檢查清單代碼','5S分類','順序','檢查內容','判定基準','最高分','權重','拍照規則','啟用'],
  '5S_系統參數': ['參數鍵','參數值','說明','更新時間'],
  '5S_巡檢主檔': ['巡檢單號','區域代碼','區域名稱','檢查清單代碼','巡檢人工號','巡檢人姓名','巡檢日期','開始時間','送出時間','總得分','最高總分','得分率','異常項數','狀態','裝置識別碼','備註','建立時間'],
  '5S_巡檢明細': ['明細編號','巡檢單號','項目代碼','5S分類','檢查內容','得分','最高分','權重','是否異常','異常原因','照片資料','改善單號','建立時間'],
  '5S_改善單': ['改善單號','來源類型','來源單號','區域代碼','區域名稱','5S分類','問題標題','問題說明','嚴重度','負責人工號','負責人姓名','期限','狀態','改善前照片','改善後照片','驗證人工號','驗證時間','驗證結果','結案時間','逾期天數','建立時間','更新時間'],
  '5S_改善歷程': ['歷程編號','改善單號','動作','原狀態','新狀態','執行人工號','執行人姓名','執行時間','說明'],
  '5S_全物品盤點': ['盤點編號','盤點日期','部門','區域','位置','物品名稱','規格型號','數量','單位','使用頻率','最近使用日','必要性判定','判定理由','保留上限','紅牌需求','紅牌編號','建議處置','責任部門','盤點人','照片資料','備註','區域代碼','建立時間'],
  '5S_紅牌追蹤': ['紅牌編號','掛牌日','盤點編號','部門','區域','物品名稱','規格型號','數量','單位','紅牌原因','暫存位置','處置建議','責任部門','責任人','預定處置日','案件狀態','實際處置日','處置結果證據','複查人','逾期天數','改善單號','LINE已通知'],
  '5S_非必要品處置': ['處置單號','紅牌編號','申請日期','部門','區域','物品名稱','數量','單位','原保管人','處置類別','處置原因','估計價值','會辦部門','審核意見','核准人','執行人','實際處置日','憑證單據號','去向接收單位','環安確認','資產財務確認','結案狀態','備註','改善單號'],
  '5S_照片': ['照片編號','參照類型','參照單號','區域代碼','上傳人工號','拍攝時間','資料摘要','儲存方式','照片資料'],
  '5S_通知紀錄': ['通知編號','通知場景','對象類型','對象識別碼','訊息類型','內容摘要','狀態','送出時間','錯誤訊息','去重鍵'],
  '5S_區域日統計': ['日期','區域代碼','區域名稱','平均得分率','異常項數','未結改善單','已結改善單','完成率'],
  '5S_排名快照': ['統計期間','範圍類型','對象代碼','對象名稱','分數','名次','較前期變化']
};

function 智慧5S_嘗試處理動作_(參數) {
  var 動作 = String((參數 && (參數.action || 參數['動作'])) || '').trim();
  if (動作 === '智慧5S_健康檢查') return 智慧5S_健康檢查_();
  if (動作 === '智慧5S_初始化') return 智慧5S_初始化_();
  if (動作 === '智慧5S_取得戰情') return 智慧5S_取得戰情_(參數);
  if (動作 === '智慧5S_產生日統計') return 智慧5S_產生日統計_();
  if (動作 === '智慧5S_發送待通知') return 智慧5S_發送待通知_(參數);
  if (動作 === '智慧5S_儲存照片') return 智慧5S_儲存照片_(參數);
  return null;
}

function 智慧5S_取得資料庫_() {
  var 指令碼屬性 = PropertiesService.getScriptProperties();
  var 識別碼 = String(指令碼屬性.getProperty('智慧製造_SPREADSHEET_ID') || 智慧5S_預設試算表識別碼).trim();
  if (!識別碼) throw new Error('未設定智慧製造_SPREADSHEET_ID');
  return SpreadsheetApp.openById(識別碼);
}

function 智慧5S_健康檢查_() {
  var 資料庫 = 智慧5S_取得資料庫_();
  var 缺少分頁 = Object.keys(智慧5S_分頁規格).filter(function (名稱) { return !資料庫.getSheetByName(名稱); });
  return {
    成功: 缺少分頁.length === 0,
    版本: 智慧5S_版本,
    資料庫名稱: 資料庫.getName(),
    資料庫識別碼: 資料庫.getId(),
    缺少分頁: 缺少分頁,
    訊息: 缺少分頁.length ? '有分頁尚未建立' : '智慧 5S 後端正常'
  };
}

function 智慧5S_初始化_() {
  var 鎖 = LockService.getScriptLock();
  鎖.waitLock(30000);
  try {
    var 資料庫 = 智慧5S_取得資料庫_();
    var 結果 = [];
    Object.keys(智慧5S_分頁規格).forEach(function (分頁名稱) {
      var 分頁 = 資料庫.getSheetByName(分頁名稱);
      var 是否新增 = false;
      if (!分頁) {
        分頁 = 資料庫.insertSheet(分頁名稱);
        是否新增 = true;
      }
      var 欄位 = 智慧5S_分頁規格[分頁名稱];
      if (分頁.getMaxColumns() < 欄位.length) 分頁.insertColumnsAfter(分頁.getMaxColumns(), 欄位.length - 分頁.getMaxColumns());
      var 現有欄位 = 分頁.getRange(1, 1, 1, 欄位.length).getDisplayValues()[0];
      var 需要修復 = 欄位.some(function (欄名, 索引) { return String(現有欄位[索引] || '').trim() !== 欄名; });
      if (需要修復) 分頁.getRange(1, 1, 1, 欄位.length).setValues([欄位]);
      分頁.setFrozenRows(1);
      分頁.getRange(1, 1, 1, 欄位.length)
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setWrap(true)
        .setBackground(智慧5S_取得表頭色_(分頁名稱))
        .setFontColor(分頁名稱.indexOf('紅牌') >= 0 || 分頁名稱.indexOf('盤點') >= 0 || 分頁名稱.indexOf('處置') >= 0 ? '#17221b' : '#ffffff');
      分頁.autoResizeColumns(1, 欄位.length);
      結果.push({ 分頁名稱: 分頁名稱, 是否新增: 是否新增, 是否修復表頭: 需要修復 });
    });
    智慧5S_確保預設參數_(資料庫);
    return { 成功: true, 版本: 智慧5S_版本, 結果: 結果, 訊息: '智慧 5S 分頁初始化完成' };
  } finally {
    鎖.releaseLock();
  }
}

function 智慧5S_取得表頭色_(分頁名稱) {
  if (分頁名稱.indexOf('巡檢') >= 0) return '#106DD1';
  if (分頁名稱.indexOf('改善') >= 0) return '#E5484D';
  if (分頁名稱.indexOf('紅牌') >= 0 || 分頁名稱.indexOf('盤點') >= 0 || 分頁名稱.indexOf('處置') >= 0) return '#E0A220';
  if (分頁名稱.indexOf('統計') >= 0 || 分頁名稱.indexOf('排名') >= 0) return '#6F5CE6';
  if (分頁名稱.indexOf('照片') >= 0 || 分頁名稱.indexOf('通知') >= 0) return '#1FAE6E';
  return '#7B213F';
}

function 智慧5S_確保預設參數_(資料庫) {
  var 分頁 = 資料庫.getSheetByName('5S_系統參數');
  if (!分頁 || 分頁.getLastRow() > 1) return;
  分頁.getRange(2, 1, 5, 4).setValues([
    ['紅牌標準暫存天數', 30, '紅牌掛牌日起至預定處置日的預設天數', 智慧5S_現在文字_()],
    ['改善單預設期限天數', 7, '巡檢異常自動建立改善單的預設期限', 智慧5S_現在文字_()],
    ['巡檢及格分數', 85, '得分率低於此數值時顯示警示', 智慧5S_現在文字_()],
    ['照片資料最大字元', 42000, '前端壓縮後存入試算表的上限', 智慧5S_現在文字_()],
    ['系統版本', 智慧5S_版本, '智慧 5S 管理平台版本', 智慧5S_現在文字_()]
  ]);
}

function 智慧5S_取得戰情_(參數) {
  var 資料庫 = 智慧5S_取得資料庫_();
  var 日期 = String((參數 && 參數.日期) || Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'));
  var 巡檢 = 智慧5S_分頁物件陣列_(資料庫.getSheetByName('5S_巡檢主檔'));
  var 改善 = 智慧5S_分頁物件陣列_(資料庫.getSheetByName('5S_改善單'));
  var 紅牌 = 智慧5S_分頁物件陣列_(資料庫.getSheetByName('5S_紅牌追蹤'));
  var 今日巡檢 = 巡檢.filter(function (列) { return String(列['巡檢日期']) === 日期 && String(列['狀態']) !== '作廢'; });
  var 平均分 = 今日巡檢.length ? 今日巡檢.reduce(function (總, 列) { return 總 + Number(列['得分率'] || 0); }, 0) / 今日巡檢.length : 0;
  var 未結改善 = 改善.filter(function (列) { return ['已結案','作廢'].indexOf(String(列['狀態'])) < 0; });
  var 逾期改善 = 未結改善.filter(function (列) { return 智慧5S_逾期天數_(列['期限']) > 0; });
  var 未結紅牌 = 紅牌.filter(function (列) { return ['已完成','已結案'].indexOf(String(列['案件狀態'])) < 0; });
  return {
    成功: true,
    日期: 日期,
    今日巡檢數: 今日巡檢.length,
    今日平均得分率: Math.round(平均分 * 10) / 10,
    未結改善數: 未結改善.length,
    逾期改善數: 逾期改善.length,
    未結紅牌數: 未結紅牌.length,
    產生時間: 智慧5S_現在文字_()
  };
}

function 智慧5S_產生日統計_() {
  var 鎖 = LockService.getScriptLock();
  鎖.waitLock(30000);
  try {
    var 資料庫 = 智慧5S_取得資料庫_();
    var 今天 = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
    var 區域 = 智慧5S_分頁物件陣列_(資料庫.getSheetByName('5S_區域主檔')).filter(function (列) { return String(列['啟用']) !== '否'; });
    var 巡檢 = 智慧5S_分頁物件陣列_(資料庫.getSheetByName('5S_巡檢主檔'));
    var 改善 = 智慧5S_分頁物件陣列_(資料庫.getSheetByName('5S_改善單'));
    var 統計分頁 = 資料庫.getSheetByName('5S_區域日統計');
    var 寫入列 = [];
    區域.forEach(function (區) {
      var 代碼 = String(區['區域代碼'] || '');
      var 區巡檢 = 巡檢.filter(function (列) { return String(列['巡檢日期']) === 今天 && String(列['區域代碼']) === 代碼 && String(列['狀態']) !== '作廢'; });
      var 平均 = 區巡檢.length ? 區巡檢.reduce(function (總, 列) { return 總 + Number(列['得分率'] || 0); }, 0) / 區巡檢.length : 0;
      var 異常 = 區巡檢.reduce(function (總, 列) { return 總 + Number(列['異常項數'] || 0); }, 0);
      var 區改善 = 改善.filter(function (列) { return String(列['區域代碼']) === 代碼; });
      var 已結 = 區改善.filter(function (列) { return String(列['狀態']) === '已結案'; }).length;
      var 未結 = 區改善.length - 已結;
      var 完成率 = 區改善.length ? Math.round(已結 / 區改善.length * 1000) / 10 : 100;
      寫入列.push([今天, 代碼, 區['區域名稱'], Math.round(平均 * 10) / 10, 異常, 未結, 已結, 完成率]);
    });
    智慧5S_刪除指定日期列_(統計分頁, 今天, 1);
    if (寫入列.length) 統計分頁.getRange(統計分頁.getLastRow() + 1, 1, 寫入列.length, 寫入列[0].length).setValues(寫入列);
    智慧5S_產生排名快照_(資料庫, 今天, 寫入列);
    return { 成功: true, 日期: 今天, 區域數: 寫入列.length, 訊息: '5S 區域日統計已更新' };
  } finally {
    鎖.releaseLock();
  }
}

function 智慧5S_產生排名快照_(資料庫, 期間, 統計列) {
  var 分頁 = 資料庫.getSheetByName('5S_排名快照');
  智慧5S_刪除指定日期列_(分頁, 期間, 1);
  var 排名 = 統計列.slice().sort(function (甲, 乙) { return Number(乙[3] || 0) - Number(甲[3] || 0); });
  var 寫入 = 排名.map(function (列, 索引) { return [期間, '區域日排名', 列[1], 列[2], 列[3], 索引 + 1, '']; });
  if (寫入.length) 分頁.getRange(分頁.getLastRow() + 1, 1, 寫入.length, 7).setValues(寫入);
}

function 智慧5S_刪除指定日期列_(分頁, 日期, 日期欄序號) {
  if (!分頁 || 分頁.getLastRow() < 2) return;
  var 值 = 分頁.getRange(2, 日期欄序號, 分頁.getLastRow() - 1, 1).getDisplayValues();
  for (var 索引 = 值.length - 1; 索引 >= 0; 索引--) {
    if (String(值[索引][0]) === String(日期)) 分頁.deleteRow(索引 + 2);
  }
}

function 智慧5S_發送待通知_(參數) {
  var 上限 = Math.max(1, Math.min(50, Number((參數 && 參數.上限) || 20)));
  var 權杖 = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!權杖) return { 成功: false, 訊息: '尚未設定 LINE_CHANNEL_ACCESS_TOKEN', 已發送: 0 };
  var 資料庫 = 智慧5S_取得資料庫_();
  var 分頁 = 資料庫.getSheetByName('5S_通知紀錄');
  var 欄位 = 分頁.getRange(1, 1, 1, 分頁.getLastColumn()).getDisplayValues()[0];
  var 索引 = 智慧5S_欄位索引_(欄位);
  var 資料 = 分頁.getLastRow() > 1 ? 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 欄位.length).getDisplayValues() : [];
  var 已發送 = 0;
  var 失敗 = 0;
  for (var 列索引 = 0; 列索引 < 資料.length && 已發送 + 失敗 < 上限; 列索引++) {
    var 列 = 資料[列索引];
    if (String(列[索引['狀態']] || '') !== '待發送') continue;
    var 對象 = String(列[索引['對象識別碼']] || '').trim();
    var 內容 = String(列[索引['內容摘要']] || '').trim();
    if (!對象 || !內容) {
      分頁.getRange(列索引 + 2, 索引['狀態'] + 1).setValue('待設定');
      分頁.getRange(列索引 + 2, 索引['錯誤訊息'] + 1).setValue(!對象 ? '缺少 LINE 對象識別碼' : '缺少通知內容');
      失敗++;
      continue;
    }
    try {
      智慧5S_LINE推播_(權杖, 對象, 內容);
      分頁.getRange(列索引 + 2, 索引['狀態'] + 1).setValue('已發送');
      分頁.getRange(列索引 + 2, 索引['送出時間'] + 1).setValue(智慧5S_現在文字_());
      分頁.getRange(列索引 + 2, 索引['錯誤訊息'] + 1).clearContent();
      已發送++;
    } catch (錯誤) {
      分頁.getRange(列索引 + 2, 索引['狀態'] + 1).setValue('發送失敗');
      分頁.getRange(列索引 + 2, 索引['錯誤訊息'] + 1).setValue(String(錯誤.message || 錯誤).slice(0, 500));
      失敗++;
    }
  }
  return { 成功: 失敗 === 0, 已發送: 已發送, 失敗: 失敗, 訊息: '5S 待通知處理完成' };
}

function 智慧5S_LINE推播_(權杖, 對象, 內容) {
  var 回應 = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + 權杖 },
    payload: JSON.stringify({ to: 對象, messages: [{ type: 'text', text: 內容.slice(0, 4900) }] }),
    muteHttpExceptions: true
  });
  var 狀態碼 = 回應.getResponseCode();
  if (狀態碼 < 200 || 狀態碼 >= 300) throw new Error('LINE 推播失敗 ' + 狀態碼 + '：' + 回應.getContentText());
}

function 智慧5S_儲存照片_(參數) {
  var 資料網址 = String((參數 && 參數.照片資料) || '');
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(資料網址)) throw new Error('照片資料格式不正確');
  var 配對 = 資料網址.match(/^data:image\/([^;]+);base64,(.+)$/i);
  var 副檔名 = 配對[1].toLowerCase() === 'jpeg' ? 'jpg' : 配對[1].toLowerCase();
  var 位元組 = Utilities.base64Decode(配對[2]);
  var 檔名 = String((參數 && 參數.檔名) || ('5S_' + new Date().getTime() + '.' + 副檔名)).replace(/[\\/:*?"<>|]/g, '_');
  var 資料夾 = 智慧5S_取得照片資料夾_();
  var 檔案 = 資料夾.createFile(Utilities.newBlob(位元組, 'image/' + 配對[1], 檔名));
  return {
    成功: true,
    檔案識別碼: 檔案.getId(),
    檔案名稱: 檔案.getName(),
    縮圖網址: 'https://drive.google.com/thumbnail?id=' + 檔案.getId() + '&sz=w1000',
    Drive網址: 檔案.getUrl()
  };
}

function 智慧5S_取得照片資料夾_() {
  var 屬性 = PropertiesService.getScriptProperties();
  var 識別碼 = String(屬性.getProperty('智慧5S_照片資料夾_ID') || '').trim();
  if (識別碼) {
    try { return DriveApp.getFolderById(識別碼); } catch (錯誤) { 識別碼 = ''; }
  }
  var 搜尋 = DriveApp.getFoldersByName(智慧5S_照片資料夾名稱);
  var 資料夾 = 搜尋.hasNext() ? 搜尋.next() : DriveApp.createFolder(智慧5S_照片資料夾名稱);
  屬性.setProperty('智慧5S_照片資料夾_ID', 資料夾.getId());
  return 資料夾;
}

function 智慧5S_建立每日觸發器_() {
  ScriptApp.getProjectTriggers().forEach(function (觸發器) {
    if (['智慧5S_每日自動化','智慧5S_發送待通知自動化'].indexOf(觸發器.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(觸發器);
  });
  ScriptApp.newTrigger('智慧5S_每日自動化').timeBased().everyDays(1).atHour(17).nearMinute(10).inTimezone('Asia/Taipei').create();
  ScriptApp.newTrigger('智慧5S_發送待通知自動化').timeBased().everyHours(1).create();
  return { 成功: true, 訊息: '智慧 5S 每日統計與每小時通知觸發器已建立' };
}

function 智慧5S_每日自動化() { return 智慧5S_產生日統計_(); }
function 智慧5S_發送待通知自動化() { return 智慧5S_發送待通知_({ 上限: 30 }); }

function 智慧5S_分頁物件陣列_(分頁) {
  if (!分頁 || 分頁.getLastRow() < 2) return [];
  var 最後欄 = 分頁.getLastColumn();
  var 欄位 = 分頁.getRange(1, 1, 1, 最後欄).getDisplayValues()[0];
  var 資料 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 最後欄).getDisplayValues();
  return 資料.map(function (列, 列索引) {
    var 物件 = { _列號: 列索引 + 2 };
    欄位.forEach(function (欄名, 欄索引) { if (欄名) 物件[欄名] = 列[欄索引]; });
    return 物件;
  });
}

function 智慧5S_欄位索引_(欄位) {
  var 結果 = {};
  欄位.forEach(function (欄名, 索引) { 結果[String(欄名).trim()] = 索引; });
  return 結果;
}

function 智慧5S_逾期天數_(日期值) {
  if (!日期值) return 0;
  var 日期 = new Date(String(日期值).replace(/-/g, '/'));
  if (isNaN(日期.getTime())) return 0;
  日期.setHours(23, 59, 59, 999);
  var 差 = Math.floor((new Date().getTime() - 日期.getTime()) / 86400000);
  return Math.max(0, 差);
}

function 智慧5S_現在文字_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_智慧5S管理平台完整後端() {
  var 健康 = 智慧5S_健康檢查_();
  var 戰情 = 智慧5S_取得戰情_({});
  return { 成功: 健康.成功, 健康檢查: 健康, 戰情: 戰情, 版本: 智慧5S_版本 };
}
