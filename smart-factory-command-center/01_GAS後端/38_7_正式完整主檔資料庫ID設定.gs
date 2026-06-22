/**
 * 38.7｜正式完整主檔資料庫 ID 設定工具
 * 版本：v1.7.5_38.7_master_database_id
 *
 * 用途：
 * 1. 不修改既有主後端核心函數。
 * 2. 透過 Script Properties 寫入「智慧製造_SPREADSHEET_ID」。
 * 3. 既有 取得試算表_() 會優先讀取此屬性，因此可安全切換到正式完整主檔資料庫。
 *
 * 正式完整主檔資料庫：
 * 智慧製造中央作戰指揮中心資料庫_38_7正式完整主檔版
 */

var 智慧製造38_7_正式完整主檔資料庫ID = '10j1009HMaZol47urKrwt6sWYc3KyxjZGnlHBX5qItnU';

function 套用38_7正式完整主檔資料庫ID() {
  var id = 智慧製造38_7_正式完整主檔資料庫ID;
  PropertiesService.getScriptProperties().setProperty('智慧製造_SPREADSHEET_ID', id);
  PropertiesService.getScriptProperties().setProperty('智慧製造_資料庫版本', 'v38.7_master_import');
  PropertiesService.getScriptProperties().setProperty('智慧製造_資料庫名稱', '智慧製造中央作戰指揮中心資料庫_38_7正式完整主檔版');
  PropertiesService.getScriptProperties().setProperty('智慧製造_資料庫更新時間', Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'));

  var ss = SpreadsheetApp.openById(id);
  return {
    成功: true,
    success: true,
    動作: '套用38_7正式完整主檔資料庫ID',
    資料庫ID: id,
    資料庫名稱: ss.getName(),
    資料庫網址: ss.getUrl(),
    驗證: 測試38_7正式完整主檔資料庫ID()
  };
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
    '20_今日派班'
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
  return {
    成功: true,
    success: true,
    目前智慧製造_SPREADSHEET_ID: id,
    正式完整主檔資料庫ID: 智慧製造38_7_正式完整主檔資料庫ID,
    是否已套用正式版: id === 智慧製造38_7_正式完整主檔資料庫ID,
    資料庫版本: props.getProperty('智慧製造_資料庫版本') || '',
    資料庫名稱: props.getProperty('智慧製造_資料庫名稱') || '',
    資料庫更新時間: props.getProperty('智慧製造_資料庫更新時間') || ''
  };
}
