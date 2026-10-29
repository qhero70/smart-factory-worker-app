/** 化新精密｜刀具表正式資料連線 v2.2.7；沿用唯一主庫及原 Web App。 */
var 刀具表連線版本_ = '2.2.9';
var 刀具表正式庫_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 刀具表索引欄位_ = ['刀具表ID','分頁名稱','表格格式','品名','工序','機器號碼','客戶品號','產品編號','主程式','加工程式','夾持壓力','夾持高壓','夾持低壓','注意事項','加工時間','每日數量','QR內容','製表者','製表日期','來源','LINE_USER_ID','建立時間','更新時間'];
var 刀具表明細欄位_ = ['刀具表ID','分頁名稱','排序','N工序','刀具形式','刀號','H值','G補正X軸','G補正Z軸','刀具壽命','照片URL','照片檔名','備註','建立時間','更新時間'];
var 刀具表產品欄位_ = ['資料類型','刀具表ID','分頁名稱','表格格式','品名','工序','機器號碼','客戶品號','產品編號','夾持壓力','夾持高壓','夾持低壓','注意事項','製表者','製表日期','來源','更新時間','JSON資料','排序','N工序','刀具形式','刀號','H值','G補正X軸','G補正Z軸','刀具壽命','照片URL','照片檔名','備註'];

function 刀具表正式輸出_(資料, 參數) {
  var 回呼 = String(參數.callback || '').trim();
  if (回呼 && !/^[A-Za-z_$][A-Za-z0-9_$]{0,119}$/.test(回呼)) throw new Error('回呼名稱不合法');
  var 文字 = JSON.stringify(資料).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return ContentService.createTextOutput(回呼 ? 回呼 + '(' + 文字 + ');' : 文字)
    .setMimeType(回呼 ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

/* 僅接手刀具表專用動作；其他 LINE、報工、5S 請求一律交回原路由。 */
function 刀具表正式接收_(請求, 方法) {
  var 參數 = 請求 && 請求.parameter || {};
  var 動作 = String(參數.api || '').trim();
  if (動作.indexOf('刀具表_') !== 0) return null;
  var 結果;
  try {
    if (參數.callback && !/^[A-Za-z_$][A-Za-z0-9_$]{0,119}$/.test(String(參數.callback))) throw new Error('回呼名稱不合法');
    if (動作 === '刀具表_刪除') {
      if (方法 !== 'POST') throw new Error('刪除只接受 POST');
      結果 = 刀具表密碼刪除_(參數);
    } else if (動作 === '刀具表_刪除結果') {
      var 收據 = PropertiesService.getScriptProperties().getProperty('刀具刪除收據_' + String(參數.請求碼 || ''));
      結果 = 收據 ? JSON.parse(收據) : {成功:false,訊息:'尚未完成刪除，或密碼錯誤'};
    } else if (動作 === '刀具表_儲存') {
      if (方法 !== 'POST') throw new Error('儲存只接受 POST');
      結果 = 刀具表正式儲存_(JSON.parse(String(參數.資料 || '{}')));
    } else {
      if (方法 !== 'GET') throw new Error('讀取只接受 GET');
      if (動作 === '刀具表_狀態') {
        var 主庫 = SpreadsheetApp.openById(刀具表正式庫_);
        結果 = {成功:!!主庫.getSheetByName('刀具表_索引') && !!主庫.getSheetByName('刀具表_明細')};
      } else if (動作 === '刀具表_清單' || 動作 === '刀具表_載入') {
        var 鎖 = LockService.getScriptLock();
        if (!鎖.tryLock(15000)) throw new Error('刀具表正在儲存，請稍後重試');
        try { 結果 = 刀具表正式讀取_(動作,參數); } finally { 鎖.releaseLock(); }
      } else throw new Error('不支援的刀具表動作');
    }
  } catch (錯誤) {
    結果 = {成功:false,訊息:String(錯誤.message || 錯誤)};
  }
  結果.版本 = 刀具表連線版本_;
  結果.主庫ID = 刀具表正式庫_;
  return 刀具表正式輸出_(結果, /^[A-Za-z_$][A-Za-z0-9_$]{0,119}$/.test(String(參數.callback || '')) ? 參數 : {});
}

// 可復原刪除：保留原始主檔與明細，讀取及儲存均遵守刪除標記。
function 刀具表已刪除_(名稱) {
  return !!PropertiesService.getScriptProperties().getProperty('刀具已刪除_' + String(名稱 || ''));
}
function 刀具表密碼刪除_(參數) {
  var 設定 = PropertiesService.getScriptProperties();
  var 請求碼 = String(參數.請求碼 || '');
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(請求碼)) throw new Error('刪除請求碼不合法');
  var 鎖 = LockService.getScriptLock();
  if (!鎖.tryLock(20000)) throw new Error('資料使用中，請稍後重試');
  try {
    var 密碼 = 設定.getProperty('刀具表刪除密碼') || '1234';
    var 暫存 = CacheService.getScriptCache();
    var 錯誤次數 = Number(暫存.get('刀具刪除錯誤次數') || 0);
    if (錯誤次數 >= 10) throw new Error('密碼錯誤過多，請十五分鐘後重試');
    if (String(參數.密碼 || '') !== 密碼) {
      暫存.put('刀具刪除錯誤次數',String(錯誤次數+1),900);
      throw new Error('刪除密碼錯誤');
    }
    暫存.remove('刀具刪除錯誤次數');
    var 名稱 = String(參數.分頁名稱 || '').trim();
    var 索引 = 刀具表讀表_(SpreadsheetApp.openById(刀具表正式庫_).getSheetByName('刀具表_索引'));
    if (!名稱 || !索引.some(function(列){return String(列.分頁名稱) === 名稱;})) throw new Error('找不到正式刀具表');
    設定.setProperty('刀具已刪除_' + 名稱, JSON.stringify({時間:new Date().toISOString(),請求碼:請求碼}));
    var 結果 = {成功:刀具表已刪除_(名稱),分頁名稱:名稱,可復原:true};
    設定.setProperty('刀具刪除收據_' + 請求碼,JSON.stringify(結果));
    return 結果;
  } finally {鎖.releaseLock();}
}
// 僅供專案擁有者從試算表提示框復原，不開放公開 GET 復原。
function 復原已刪除刀具表() {
  var 介面 = SpreadsheetApp.getUi();
  var 回答 = 介面.prompt('復原刀具表','請輸入要復原的完整分頁名稱',介面.ButtonSet.OK_CANCEL);
  if (回答.getSelectedButton() !== 介面.Button.OK) return;
  var 名稱 = 回答.getResponseText().trim();
  if (!刀具表已刪除_(名稱)) throw new Error('此分頁沒有刪除紀錄');
  var 鎖 = LockService.getScriptLock(); 鎖.waitLock(20000);
  try {PropertiesService.getScriptProperties().deleteProperty('刀具已刪除_' + 名稱);}
  finally {鎖.releaseLock();}
  介面.alert('已復原：' + 名稱);
}
function 刀具表讀表_(表) {
  if (!表) throw new Error('找不到正式刀具表分頁');
  var 值 = 表.getDataRange().getValues();
  var 欄 = (值.shift() || []).map(function(值){return String(值).trim();});
  return 值.filter(function(列){return 列.some(function(值){return 值 !== '';});}).map(function(列){
    var 物件 = {}; 欄.forEach(function(鍵,序){if(鍵) 物件[鍵]=列[序];}); return 物件;
  });
}

function 刀具表正式讀取_(動作,參數) {
  var 主庫 = SpreadsheetApp.openById(刀具表正式庫_);
  var 索引 = 刀具表讀表_(主庫.getSheetByName('刀具表_索引')).filter(function(列){return !刀具表已刪除_(列.分頁名稱);});
  if (動作 === '刀具表_清單') return {成功:true,資料:索引};
  var 名稱 = String(參數.分頁名稱 || '').trim();
  var 登記 = 索引.filter(function(列){return String(列.分頁名稱) === 名稱;});
  if (!名稱 || !登記.length) throw new Error('這個分頁未登記在正式刀具表索引');
  var 資料 = 刀具表讀表_(主庫.getSheetByName(名稱));
  return {成功:true,分頁名稱:名稱,資料:資料};
}

/* 文字以純文字入庫，防止 =、+、-、@ 被試算表當成公式。 */
function 刀具表純文字_(值) {
  if (值 === null || 值 === undefined) return '';
  if (typeof 值 === 'string' && /^[=+@-]/.test(值)) return "'" + 值;
  return 值;
}

function 刀具表寫整表_(表,欄,資料) {
  var 原列數 = 表.getLastRow();
  var 新值 = [欄].concat(資料.map(function(物件){return 欄.map(function(鍵){return 刀具表純文字_(物件[鍵]);});}));
  if (表.getMaxRows() < 新值.length) 表.insertRowsAfter(表.getMaxRows(), 新值.length-表.getMaxRows());
  if (表.getMaxColumns() < 欄.length) 表.insertColumnsAfter(表.getMaxColumns(),欄.length-表.getMaxColumns());
  表.getRange(1,1,新值.length,欄.length).setValues(新值);
  if (原列數 > 新值.length) 表.getRange(新值.length+1,1,原列數-新值.length,欄.length).clearContent();
}

function 刀具表正式儲存_(資料) {
  if (刀具表已刪除_(資料.分頁名稱)) throw new Error('此刀具表已刪除，不能由舊裝置重新覆寫；請建立新名稱');
  var 編號 = String(資料.刀具表ID || '').trim();
  var 名稱 = String(資料.分頁名稱 || '').trim();
  var 快照 = 資料.快照;
  var 明細 = 資料.明細;
  var 基本 = 資料.基本 || {};
  基本.夾持高壓 = String(基本.夾持高壓 || 基本.夾持壓力 || '');
  基本.夾持低壓 = String(基本.夾持低壓 || '');
  基本.夾持壓力 = 基本.夾持高壓;
  基本.注意事項 = String(基本.注意事項 || '');
  if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(編號)) throw new Error('刀具表識別碼不合法');
  if (!名稱 || 名稱.length > 31 || /[\[\]:*?\/\\]/.test(名稱) || /^(刀具表_|00_|0_|[0-9]{2}_|5S_|LINE_|製造事件)/.test(名稱)) throw new Error('產品分頁名稱不可使用系統保留名稱');
  if (!快照 || typeof 快照 !== 'object' || ![1,2].includes(Number(快照.type))) throw new Error('刀具表快照格式不正確');
  if (!Array.isArray(明細) || 明細.length > 100) throw new Error('刀具明細數量不正確');
  var 快照文字 = JSON.stringify(快照);
  if (快照文字.length > 45000) throw new Error('刀具表文字過長，請減少內容');
  明細.forEach(function(列){Object.keys(列).forEach(function(鍵){if(String(列[鍵] || '').length > 45000) throw new Error('刀具照片或欄位超過單格限制');});});
  var 鎖 = LockService.getScriptLock();
  if (!鎖.tryLock(20000)) throw new Error('另一張刀具表正在儲存，請稍後重試');
  var 備份 = [], 新表 = null;
  try {
    if (刀具表已刪除_(名稱)) throw new Error('此刀具表已刪除，禁止舊資料同步復活');
    var 主庫 = SpreadsheetApp.openById(刀具表正式庫_);
    var 索引表 = 主庫.getSheetByName('刀具表_索引'), 明細表 = 主庫.getSheetByName('刀具表_明細');
    var 索引 = 刀具表讀表_(索引表), 所有明細 = 刀具表讀表_(明細表);
    var 同名 = 索引.filter(function(列){return String(列.分頁名稱) === 名稱 && String(列.刀具表ID) !== 編號;});
    if (同名.length) throw new Error('同名刀具表已存在，請先載入該分頁再編輯');
    var 產品表 = 主庫.getSheetByName(名稱);
    if (產品表) {
      var 表頭 = 產品表.getRange(1,1,1,Math.min(產品表.getLastColumn(),25)).getValues()[0];
      var 既有產品 = 刀具表讀表_(產品表);
      if (表頭[0] !== '資料類型' || 表頭[1] !== '刀具表ID' || 既有產品.some(function(列){return String(列.刀具表ID) !== 編號;})) throw new Error('同名工作表不是這張刀具表，已阻止覆寫');
    }
    [索引表,明細表].concat(產品表 ? [產品表] : []).forEach(function(表){備份.push({表:表,值:表.getDataRange().getValues()});});
    if (!產品表) {產品表 = 主庫.insertSheet(名稱); 新表 = 產品表;}
    var 原索引 = 索引.filter(function(列){return String(列.刀具表ID) === 編號;})[0] || {};
    var 現在 = new Date().toISOString();
    var 索引列 = Object.assign({},基本,{刀具表ID:編號,分頁名稱:名稱,來源:String(資料.來源 || '網頁版 PWA'),建立時間:原索引.建立時間 || 現在,更新時間:現在});
    var 新明細 = 明細.map(function(列,序){return Object.assign({},列,{刀具表ID:編號,分頁名稱:名稱,排序:序+1,建立時間:原索引.建立時間 || 現在,更新時間:現在});});
    var 主檔 = Object.assign({},索引列,{資料類型:'主檔',JSON資料:快照文字});
    var 產品列 = [主檔].concat(新明細.map(function(列){return Object.assign({},列,{資料類型:'刀具'});}));
    刀具表寫整表_(明細表,刀具表明細欄位_,所有明細.filter(function(列){return String(列.刀具表ID) !== 編號;}).concat(新明細));
    刀具表寫整表_(產品表,刀具表產品欄位_,產品列);
    刀具表寫整表_(索引表,刀具表索引欄位_,索引.filter(function(列){return String(列.刀具表ID) !== 編號;}).concat([索引列]));
    SpreadsheetApp.flush();
    return {成功:true,刀具表ID:編號,分頁名稱:名稱,更新時間:現在,明細筆數:新明細.length};
  } catch (錯誤) {
    /* 跨分頁異常時在同一把鎖內還原；不刪除任何既有產品分頁。 */
    try {
      備份.forEach(function(項){項.表.getDataRange().clearContent();項.表.getRange(1,1,項.值.length,項.值[0].length).setValues(項.值);});
      if (新表) SpreadsheetApp.openById(刀具表正式庫_).deleteSheet(新表);
      SpreadsheetApp.flush();
    } catch (還原錯誤) {throw new Error('儲存失敗且還原未完成，請保留本機資料並通知管理員');}
    throw 錯誤;
  } finally {鎖.releaseLock();}
}

/**
 * v2.2.7 一次性欄位升級：保留既有資料與產品分頁，只補齊高壓、低壓、注意事項。
 * 可重複執行；舊「夾持壓力」自動搬到「夾持高壓」。
 */
function 升級刀具表正式欄位_v227() {
  var 鎖 = LockService.getScriptLock();
  if (!鎖.tryLock(20000)) throw new Error('刀具表正在使用中，請稍後重試');
  try {
    var 主庫 = SpreadsheetApp.openById(刀具表正式庫_);
    var 索引表 = 主庫.getSheetByName('刀具表_索引');
    var 索引 = 刀具表讀表_(索引表);
    索引.forEach(function(列) {
      列.夾持高壓 = String(列.夾持高壓 || 列.夾持壓力 || '');
      列.夾持低壓 = String(列.夾持低壓 || '');
      列.夾持壓力 = 列.夾持高壓;
      列.注意事項 = String(列.注意事項 || '');
      var 產品表 = 主庫.getSheetByName(String(列.分頁名稱 || ''));
      if (!產品表) return;
      var 產品列 = 刀具表讀表_(產品表);
      產品列.forEach(function(產品) {
        if (String(產品.資料類型 || '') !== '主檔') return;
        var 快照 = {};
        try { 快照 = JSON.parse(String(產品.JSON資料 || '{}')); } catch (忽略) {}
        var 高壓 = String(快照.pressureHigh || 快照.pressure || 列.夾持高壓 || '');
        var 低壓 = String(快照.pressureLow || 列.夾持低壓 || '');
        var 注意 = String(快照.notes || 列.注意事項 || '');
        快照.pressureHigh = 高壓;
        快照.pressureLow = 低壓;
        快照.pressure = 高壓;
        快照.notes = 注意;
        產品.夾持壓力 = 高壓;
        產品.夾持高壓 = 高壓;
        產品.夾持低壓 = 低壓;
        產品.注意事項 = 注意;
        產品.JSON資料 = JSON.stringify(快照);
        列.夾持壓力 = 高壓;
        列.夾持高壓 = 高壓;
        列.夾持低壓 = 低壓;
        列.注意事項 = 注意;
      });
      刀具表寫整表_(產品表, 刀具表產品欄位_, 產品列);
    });
    刀具表寫整表_(索引表, 刀具表索引欄位_, 索引);
    SpreadsheetApp.flush();
    return {成功:true,版本:刀具表連線版本_,升級筆數:索引.length,主庫ID:刀具表正式庫_};
  } finally {
    鎖.releaseLock();
  }
}

/* 只讀既有表頭與資料；不建表、不寫製造資料、不送 LINE 訊息。 */
function 驗收刀具表正式連線唯讀() {
  var 結果 = {成功:true,版本:刀具表連線版本_,工具中心版本:typeof 製造工具75_版本_==='string'?製造工具75_版本_:'缺少',主庫ID:刀具表正式庫_,索引筆數:0,明細筆數:0};
  var 主庫 = SpreadsheetApp.openById(刀具表正式庫_);
  結果.索引筆數 = 刀具表讀表_(主庫.getSheetByName('刀具表_索引')).length;
  結果.明細筆數 = 刀具表讀表_(主庫.getSheetByName('刀具表_明細')).length;
  結果.其他請求未接手 = 刀具表正式接收_({parameter:{api:'健康檢查'}},'GET') === null;
  結果.路由成功 = JSON.parse(doGet({parameter:{api:'刀具表_狀態'}}).getContent()).成功 === true;
  結果.成功 = 結果.路由成功 && 結果.其他請求未接手;
  console.log(JSON.stringify(結果));
  return 結果;
}
