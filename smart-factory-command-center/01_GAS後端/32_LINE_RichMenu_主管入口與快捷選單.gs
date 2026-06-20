/**
 * 32_LINE Rich Menu｜主管入口與快捷選單
 * 專案：製造部智慧製造應用總部
 * 版本：v1.6.9
 *
 * 目的：建立 LINE Bot 主管入口 Rich Menu，提供主管戰情、今日戰情、昨日戰情、報工作業、主檔檢查、AI摘要六個快捷入口。
 * 原則：不修改既有 doPost(e)，Rich Menu 採用 message action 沿用既有 LINE 文字指令，降低 webhook 風險。
 * 圖片：由 Script Properties 的 LINE_RICH_MENU_主管入口圖片網址 指定；若未指定，使用可上線的預設測試圖。
 */

const RichMenu32_主管入口版本 = 'v1.6.9_32_LINE_RichMenu主管入口與快捷選單';
const RichMenu32_圖片寬度 = 1200;
const RichMenu32_圖片高度 = 810;
const RichMenu32_預設圖片網址 = 'https://dummyimage.com/1200x810/0b1220/e2e8f0.png&text=Supervisor+Menu';

/**
 * 一鍵建立、驗證、上傳圖片、設為預設 Rich Menu。
 * 執行前必要條件：Script Properties 已設定 LINE_CHANNEL_ACCESS_TOKEN。
 */
function 設定32_LINE_RichMenu主管入口與快捷選單() {
  const token = RichMenu32_取得LINEToken_();
  if (!token) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN，請先在 Apps Script 的 Script Properties 設定。');

  const richMenu = 取得32_LINE_RichMenu主管入口設定_();
  const 本機檢查 = 測試_32_LINE_RichMenu主管入口與快捷選單_本機規格();
  if (!本機檢查.成功) throw new Error('Rich Menu 本機規格檢查失敗：' + 本機檢查.訊息);

  RichMenu32_呼叫LINEAPI_('post', 'https://api.line.me/v2/bot/richmenu/validate', richMenu, 'application/json');
  const 建立結果 = RichMenu32_呼叫LINEAPI_('post', 'https://api.line.me/v2/bot/richmenu', richMenu, 'application/json');
  const richMenuId = 建立結果.richMenuId;
  if (!richMenuId) throw new Error('LINE 未回傳 richMenuId，建立失敗：' + JSON.stringify(建立結果));

  RichMenu32_上傳主管入口圖片_(richMenuId);
  RichMenu32_呼叫LINEAPI_('post', 'https://api.line.me/v2/bot/user/all/richmenu/' + encodeURIComponent(richMenuId), null, 'application/json');

  PropertiesService.getScriptProperties().setProperty('LINE_RICH_MENU_主管入口_ID', richMenuId);
  RichMenu32_寫入部署紀錄_('建立並設為預設', richMenuId, '完成', JSON.stringify({ 名稱: richMenu.name, 版本: RichMenu32_主管入口版本, 圖片網址: RichMenu32_取得圖片網址_() }));

  return {
    成功: true,
    訊息: '32_LINE Rich Menu 主管入口與快捷選單已建立、圖片已上傳、已設為預設選單',
    richMenuId: richMenuId,
    版本: RichMenu32_主管入口版本,
    chatBarText: richMenu.chatBarText,
    區塊數: richMenu.areas.length,
    報工入口: RichMenu32_取得WebAppURL_() ? 'URI直開報工作業V2' : '文字指令報工',
    圖片網址: RichMenu32_取得圖片網址_()
  };
}

/**
 * 只做本機規格檢查，不呼叫 LINE API。
 */
function 測試_32_LINE_RichMenu主管入口與快捷選單_本機規格() {
  const richMenu = 取得32_LINE_RichMenu主管入口設定_();
  const 問題 = [];

  if (richMenu.size.width < 800 || richMenu.size.width > 2500) 問題.push('圖片寬度必須介於 800～2500');
  if (richMenu.size.height < 250) 問題.push('圖片高度必須至少 250');
  if ((richMenu.size.width / richMenu.size.height) < 1.45) 問題.push('圖片比例 width/height 必須 >= 1.45');
  if (richMenu.areas.length > 20) 問題.push('可點區塊不可超過 20 個');
  if (String(richMenu.chatBarText || '').length > 14) 問題.push('chatBarText 不可超過 14 字');

  richMenu.areas.forEach(function(area, idx) {
    const b = area.bounds || {};
    if (b.x < 0 || b.y < 0 || b.width <= 0 || b.height <= 0) 問題.push('第 ' + (idx + 1) + ' 區 bounds 不合法');
    if (b.x + b.width > richMenu.size.width) 問題.push('第 ' + (idx + 1) + ' 區超出圖片寬度');
    if (b.y + b.height > richMenu.size.height) 問題.push('第 ' + (idx + 1) + ' 區超出圖片高度');
    if (!area.action || !area.action.type) 問題.push('第 ' + (idx + 1) + ' 區缺少 action');
  });

  return {
    成功: 問題.length === 0,
    訊息: 問題.length ? 問題.join('；') : '本機規格檢查通過',
    版本: RichMenu32_主管入口版本,
    圖片寬度: richMenu.size.width,
    圖片高度: richMenu.size.height,
    區塊數: richMenu.areas.length,
    chatBarText: richMenu.chatBarText,
    報工入口類型: richMenu.areas[3].action.type,
    圖片網址: RichMenu32_取得圖片網址_(),
    問題: 問題
  };
}

/**
 * 呼叫 LINE 驗證 Rich Menu 物件，不建立正式選單。
 */
function 測試_32_LINE_RichMenu主管入口與快捷選單_LINE驗證() {
  const token = RichMenu32_取得LINEToken_();
  if (!token) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN，無法呼叫 LINE 驗證 API。');
  const richMenu = 取得32_LINE_RichMenu主管入口設定_();
  const result = RichMenu32_呼叫LINEAPI_('post', 'https://api.line.me/v2/bot/richmenu/validate', richMenu, 'application/json');
  return { 成功: true, 訊息: 'LINE Rich Menu 物件驗證通過', 回傳: result, 版本: RichMenu32_主管入口版本 };
}

/**
 * 測試圖片網址是否可由 GAS 讀取，且大小低於 1MB。
 */
function 測試_32_LINE_RichMenu主管入口圖片讀取() {
  const blob = RichMenu32_取得圖片Blob_();
  const bytes = blob.getBytes();
  if (bytes.length > 1024 * 1024) throw new Error('Rich Menu 圖片不可超過 1MB，目前約 ' + Math.round(bytes.length / 1024) + 'KB');
  return { 成功: true, 訊息: '圖片讀取成功', 圖片網址: RichMenu32_取得圖片網址_(), MIME類型: blob.getContentType(), 圖片大小KB: Math.round(bytes.length / 1024) };
}

/**
 * 清除目前預設 Rich Menu，並刪除本模組記錄的 richMenuId。
 */
function 清除32_LINE_RichMenu主管入口與快捷選單() {
  const token = RichMenu32_取得LINEToken_();
  if (!token) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN，無法清除 Rich Menu。');
  const props = PropertiesService.getScriptProperties();
  const richMenuId = String(props.getProperty('LINE_RICH_MENU_主管入口_ID') || '').trim();

  RichMenu32_呼叫LINEAPI_('delete', 'https://api.line.me/v2/bot/user/all/richmenu', null, 'application/json', true);
  if (richMenuId) RichMenu32_呼叫LINEAPI_('delete', 'https://api.line.me/v2/bot/richmenu/' + encodeURIComponent(richMenuId), null, 'application/json', true);
  props.deleteProperty('LINE_RICH_MENU_主管入口_ID');

  RichMenu32_寫入部署紀錄_('清除預設並刪除本模組選單', richMenuId || '-', '完成', '');
  return { 成功: true, 訊息: '已清除預設 Rich Menu，並刪除本模組記錄', richMenuId: richMenuId };
}

/**
 * 取得目前設為預設的 Rich Menu ID。
 */
function 查詢32_LINE_RichMenu主管入口目前狀態() {
  const token = RichMenu32_取得LINEToken_();
  if (!token) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN，無法查詢 Rich Menu。');
  const propsId = String(PropertiesService.getScriptProperties().getProperty('LINE_RICH_MENU_主管入口_ID') || '').trim();
  const 預設結果 = RichMenu32_呼叫LINEAPI_('get', 'https://api.line.me/v2/bot/user/all/richmenu', null, 'application/json', true);
  return { 成功: true, 訊息: '查詢完成', ScriptProperties記錄ID: propsId, LINE目前預設: 預設結果, 版本: RichMenu32_主管入口版本 };
}

/**
 * 六宮格 Rich Menu 設定。
 * 第 4 格「報工作業」：有 Web App URL 時直接開頁，否則傳送「報工」。
 */
function 取得32_LINE_RichMenu主管入口設定_() {
  const webAppUrl = RichMenu32_取得WebAppURL_();
  const 報工Action = webAppUrl ? { type: 'uri', label: '報工作業', uri: webAppUrl + '?page=07_報工作業V2' } : { type: 'message', label: '報工作業', text: '報工' };

  return {
    size: { width: RichMenu32_圖片寬度, height: RichMenu32_圖片高度 },
    selected: true,
    name: '32_LINE主管入口_' + RichMenu32_主管入口版本,
    chatBarText: '主管入口',
    areas: [
      { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '主管戰情', text: '主管戰情' } },
      { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '今日戰情', text: '今日戰情' } },
      { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '昨日戰情', text: '昨日戰情' } },
      { bounds: { x: 0, y: 405, width: 400, height: 405 }, action: 報工Action },
      { bounds: { x: 400, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '主檔檢查', text: '主檔檢查' } },
      { bounds: { x: 800, y: 405, width: 400, height: 405 }, action: { type: 'message', label: 'AI摘要', text: 'AI摘要' } }
    ]
  };
}

function RichMenu32_上傳主管入口圖片_(richMenuId) {
  const blob = RichMenu32_取得圖片Blob_();
  const res = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/richmenu/' + encodeURIComponent(richMenuId) + '/content', {
    method: 'post',
    contentType: 'image/png',
    headers: { Authorization: 'Bearer ' + RichMenu32_取得LINEToken_() },
    payload: blob.getBytes(),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  const body = res.getContentText() || '{}';
  if (code < 200 || code >= 300) throw new Error('LINE Rich Menu 圖片上傳失敗 HTTP ' + code + '：' + body);
  return { 成功: true, 狀態碼: code, 回應: body };
}

function RichMenu32_取得圖片Blob_() {
  const url = RichMenu32_取得圖片網址_();
  const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Rich Menu 圖片讀取失敗 HTTP ' + code + '：' + url);
  const blob = res.getBlob().setName('32_LINE_RichMenu_主管入口.png');
  const contentType = String(blob.getContentType() || '').toLowerCase();
  if (contentType.indexOf('png') < 0 && contentType.indexOf('jpeg') < 0 && contentType.indexOf('jpg') < 0 && contentType.indexOf('image/') < 0) throw new Error('Rich Menu 圖片 MIME 類型異常：' + contentType);
  return blob;
}

function RichMenu32_取得圖片網址_() {
  const props = PropertiesService.getScriptProperties();
  return String(props.getProperty('LINE_RICH_MENU_主管入口圖片網址') || RichMenu32_預設圖片網址).trim();
}

function RichMenu32_呼叫LINEAPI_(method, url, payload, contentType, 允許404) {
  const opt = { method: method, headers: { Authorization: 'Bearer ' + RichMenu32_取得LINEToken_() }, muteHttpExceptions: true };
  if (payload !== null && payload !== undefined) {
    opt.contentType = contentType || 'application/json';
    opt.payload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  }
  const res = UrlFetchApp.fetch(url, opt);
  const code = res.getResponseCode();
  const body = res.getContentText() || '{}';
  if ((code < 200 || code >= 300) && !(允許404 && code === 404)) throw new Error('LINE API 呼叫失敗 HTTP ' + code + '：' + body + '；URL=' + url);
  try { return JSON.parse(body || '{}'); } catch (err) { return { 狀態碼: code, 原始回應: body }; }
}

function RichMenu32_取得LINEToken_() {
  if (typeof 取得LINEToken_ === 'function') return String(取得LINEToken_() || '').trim();
  return String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
}

function RichMenu32_取得WebAppURL_() {
  try { return String(ScriptApp.getService().getUrl() || '').trim(); } catch (err) { return ''; }
}

function RichMenu32_寫入部署紀錄_(動作, richMenuId, 結果, 備註) {
  try {
    const ss = typeof 取得試算表_ === 'function' ? 取得試算表_() : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    const name = '32_LINE_RichMenu設定';
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() < 1) {
      sh.getRange(1, 1, 1, 6).setValues([['時間戳', '版本', '動作', 'richMenuId', '結果', '備註']]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    }
    sh.appendRow([new Date(), RichMenu32_主管入口版本, 動作, richMenuId, 結果, 備註 || '']);
  } catch (err) {}
}
