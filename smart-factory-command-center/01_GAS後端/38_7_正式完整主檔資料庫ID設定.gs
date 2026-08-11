/**
 * 化新精密｜唯一正式主資料庫 ID 設定工具
 * 版本：v1.8.0_智慧5S_唯一正式主資料庫
 *
 * 用途：
 * 1. 不修改既有主後端核心函數。
 * 2. 同步寫入「智慧製造_SPREADSHEET_ID」與「智慧製造中央作戰資料庫_ID」。
 * 3. 既有共用後端與智慧 5S 模組均使用同一份正式資料庫。
 *
 * 正式資料庫：
 * https://docs.google.com/spreadsheets/d/19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8/edit
 */

var 智慧製造38_7_正式完整主檔資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';

function 套用38_7正式完整主檔資料庫ID() {
  var id = 智慧製造38_7_正式完整主檔資料庫ID;
  PropertiesService.getScriptProperties().setProperty('智慧製造_SPREADSHEET_ID', id);
  PropertiesService.getScriptProperties().setProperty('智慧製造中央作戰資料庫_ID', id);
  PropertiesService.getScriptProperties().setProperty('智慧製造_資料庫版本', 'v1.8.0_智慧5S_唯一正式主資料庫');
  PropertiesService.getScriptProperties().setProperty('智慧製造_資料庫更新時間', Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'));

  var ss = SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty('智慧製造_資料庫名稱', ss.getName());
  var 初始化結果 = typeof 初始化33_LINE主管權限與身份綁定 === 'function'
    ? 初始化33_LINE主管權限與身份綁定()
    : { 成功: false, 訊息: '尚未載入 33_LINE 模組，資料庫 ID 已完成切換。' };
  return {
    成功: true,
    success: true,
    動作: '套用38_7正式完整主檔資料庫ID',
    資料庫ID: id,
    資料庫名稱: ss.getName(),
    資料庫網址: ss.getUrl(),
    初始化33_LINE: 初始化結果,
    驗證: 測試38_7正式完整主檔資料庫ID()
  };
}

function 套用智慧5S唯一正式主資料庫() {
  return 套用38_7正式完整主檔資料庫ID();
}

function 測試38_7正式完整主檔資料庫ID() {
  var id = String(PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || '').trim();
  if (!id) id = 智慧製造38_7_正式完整主檔資料庫ID;
  var ss = SpreadsheetApp.openById(id);
  var required = [
    '00_系統設定',
    '01_人員主檔',
    '02_產品主檔',
    '03_機台主檔',
    '04_工站主檔',
    '04_工站產品關聯',
    '04_工站機台關聯',
    '08_工站途程機台主檔',
    '09_報工',
    '10_工單主檔',
    '10_排程需求池',
    '19_人員排班規則',
    '20_今日派班',
    '5S_區域主檔',
    '33_LINE身份權限',
    '33_LINE權限紀錄'
  ];
  var report = required.map(function(name) {
    var sh = ss.getSheetByName(name);
    return {
      分頁: name,
      存在: !!sh,
      筆數: sh ? Math.max(sh.getLastRow() - 1, 0) : 0,
      欄數: sh ? sh.getLastColumn() : 0
    };
  });
  var missing = report.filter(function(x) { return !x.存在; }).map(function(x) { return x.分頁; });
  return {
    成功: missing.length === 0,
    success: missing.length === 0,
    資料庫ID: id,
    資料庫名稱: ss.getName(),
    資料庫網址: ss.getUrl(),
    缺少分頁: missing,
    分頁檢查: report
  };
}

function 讀取38_7目前資料庫設定() {
  var props = PropertiesService.getScriptProperties();
  var id = String(props.getProperty('智慧製造_SPREADSHEET_ID') || '').trim();
  var 中央ID = String(props.getProperty('智慧製造中央作戰資料庫_ID') || '').trim();
  return {
    成功: true,
    success: true,
    目前智慧製造_SPREADSHEET_ID: id,
    目前智慧製造中央作戰資料庫_ID: 中央ID,
    正式完整主檔資料庫ID: 智慧製造38_7_正式完整主檔資料庫ID,
    是否已套用正式版: id === 智慧製造38_7_正式完整主檔資料庫ID && 中央ID === 智慧製造38_7_正式完整主檔資料庫ID,
    資料庫版本: props.getProperty('智慧製造_資料庫版本') || '',
    資料庫名稱: props.getProperty('智慧製造_資料庫名稱') || '',
    資料庫更新時間: props.getProperty('智慧製造_資料庫更新時間') || ''
  };
}
