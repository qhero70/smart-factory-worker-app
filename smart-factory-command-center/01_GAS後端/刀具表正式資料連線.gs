/** 化新精密｜刀具表正式資料連線 v2.2.2；沿用唯一主庫及原 Web App。 */
var 刀具表連線版本_ = '2.2.2';
var 刀具表正式庫_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 刀具表索引欄位_ = ['刀具表ID','分頁名稱','表格格式','品名','工序','機器號碼','客戶品號','產品編號','主程式','加工程式','夾持壓力','加工時間','每日數量','QR內容','製表者','製表日期','來源','LINE_USER_ID','建立時間','更新時間'];
var 刀具表明細欄位_ = ['刀具表ID','分頁名稱','排序','N工序','刀具形式','刀號','H值','G補正X軸','G補正Z軸','刀具壽命','照片URL','照片檔名','備註','建立時間','更新時間'];
var 刀具表產品欄位_ = ['資料類型','刀具表ID','分頁名稱','表格格式','品名','工序','機器號碼','客戶品號','產品編號','製表者','製表日期','來源','更新時間','JSON資料','排序','N工序','刀具形式','刀號','H值','G補正X軸','G補正Z軸','刀具壽命','照片URL','照片檔名','備註'];

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
    if (動作 === '刀具表_儲存') {
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
  var 索引 = 刀具表讀表_(主庫.getSheetByName('刀具表_索引'));
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
  var 編號 = String(資料.刀具表ID || '').trim();
  var 名稱 = String(資料.分頁名稱 || '').trim();
  var 快照 = 資料.快照;
  var 明細 = 資料.明細;
  var 基本 = 資料.基本 || {};
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
