/**
 * GAS 既有主系統路由整合補丁 v1
 * 你的專案已經有舊 doGet / doPost，所以 PWA 打到舊路由時會出現 UNKNOWN_ACTION。
 * 用法：把本檔貼到 Apps Script，然後把舊 doGet / doPost 依下方方式改名或接入。
 */

/**
 * 做法 A：如果你可以改舊主程式
 * 1. 將原本舊 doGet(e) 改名成 doGet_舊主系統(e)
 * 2. 將原本舊 doPost(e) 改名成 doPost_舊主系統(e)
 * 3. 貼上本檔
 * 4. 重新部署 Web App 新版本
 */
function doGet(e) {
  const action = String((e && e.parameter && (e.parameter.action || e.parameter.動作 || e.parameter.method)) || '');
  if (是否中央資料庫動作_(action)) return doGet_中央資料庫相容路由_(e);
  if (typeof doGet_舊主系統 === 'function') return doGet_舊主系統(e);
  return doGet_中央資料庫相容路由_(e);
}

function doPost(e) {
  let action = '';
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    action = String(body.action || body.動作 || body.method || '');
  } catch (err) {
    action = String((e && e.parameter && (e.parameter.action || e.parameter.動作 || e.parameter.method)) || '');
  }
  if (是否中央資料庫動作_(action) || action === '') return doPost_中央資料庫相容路由_(e);
  if (typeof doPost_舊主系統 === 'function') return doPost_舊主系統(e);
  return doPost_中央資料庫相容路由_(e);
}

function 是否中央資料庫動作_(action) {
  return ['status','初始化','init','自檢','health','check','schema','寫入資料庫快照','uploadDatabase','清空分頁'].indexOf(String(action)) >= 0;
}

function doGet_中央資料庫相容路由_(e) {
  const callback = e && e.parameter && e.parameter.callback;
  try {
    const action = String((e && e.parameter && (e.parameter.action || e.parameter.動作 || e.parameter.method)) || 'status');
    let result;
    if (action === '初始化' || action === 'init') result = 初始化_智慧製造中央作戰資料庫();
    else if (action === '自檢' || action === 'health' || action === 'check') result = 自檢_智慧製造中央作戰資料庫();
    else if (action === 'schema') result = 成功_({ 系統:系統名稱, 資料表欄位 });
    else result = 成功_({ 訊息:'API 已啟動', 系統:系統名稱, 時間:new Date().toISOString(), 資料庫ID:取得資料庫ID_不建立() });
    return 輸出JSON_(result, callback);
  } catch (err) {
    return 輸出JSON_(失敗_(err), callback);
  }
}

function doPost_中央資料庫相容路由_(e) {
  try {
    const body = 解析請求_(e);
    const action = String(body.action || body.動作 || body.method || '寫入資料庫快照');
    let result;
    if (action === '初始化' || action === 'init') result = 初始化_智慧製造中央作戰資料庫();
    else if (action === '自檢' || action === 'health' || action === 'check') result = 自檢_智慧製造中央作戰資料庫();
    else if (action === '寫入資料庫快照' || action === 'uploadDatabase') result = 寫入資料庫快照_(body);
    else if (action === '清空分頁') result = 清空指定分頁_(body.sheet || body.分頁);
    else result = 失敗_('未知 action：' + action);
    return 輸出JSON_(result);
  } catch (err) {
    return 輸出JSON_(失敗_(err));
  }
}
