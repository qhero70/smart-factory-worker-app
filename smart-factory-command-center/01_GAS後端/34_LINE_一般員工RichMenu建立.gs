/**
 * 34_LINE｜一般員工 Rich Menu 建立
 * 版本：v1.7.1
 * 用途：建立一般員工報工入口 Rich Menu，並寫入 LINE_RICH_MENU_一般員工_ID。
 */

const 一般員工RichMenu34_版本 = 'v1.7.1_34_LINE一般員工RichMenu';
const 一般員工RichMenu34_寬度 = 1200;
const 一般員工RichMenu34_高度 = 810;
const 一般員工RichMenu34_預設圖片網址 = 'https://dummyimage.com/1200x810/0b1220/e2e8f0.png&text=Worker+Menu';

function 建立34_LINE一般員工RichMenu() {
  const token = 一般員工RichMenu34_取得Token_();
  if (!token) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN。');
  const richMenu = 取得34_LINE一般員工RichMenu設定_();
  const check = 測試34_LINE一般員工RichMenu_本機規格();
  if (!check.成功) throw new Error(check.訊息);
  一般員工RichMenu34_呼叫LINE_('post', 'https://api.line.me/v2/bot/richmenu/validate', richMenu);
  const created = 一般員工RichMenu34_呼叫LINE_('post', 'https://api.line.me/v2/bot/richmenu', richMenu);
  const richMenuId = created.richMenuId;
  if (!richMenuId) throw new Error('LINE 未回傳 richMenuId：' + JSON.stringify(created));
  一般員工RichMenu34_上傳圖片_(richMenuId);
  PropertiesService.getScriptProperties().setProperty('LINE_RICH_MENU_一般員工_ID', richMenuId);
  一般員工RichMenu34_記錄_('建立一般員工RichMenu', richMenuId, '完成', 一般員工RichMenu34_圖片網址_());
  return { 成功: true, 訊息: '一般員工 Rich Menu 已建立', richMenuId, 圖片網址: 一般員工RichMenu34_圖片網址_(), 版本: 一般員工RichMenu34_版本 };
}

function 設定34_LINE一般員工RichMenu為預設() {
  const id = String(PropertiesService.getScriptProperties().getProperty('LINE_RICH_MENU_一般員工_ID') || '').trim();
  if (!id) throw new Error('缺少 LINE_RICH_MENU_一般員工_ID，請先執行 建立34_LINE一般員工RichMenu()。');
  一般員工RichMenu34_呼叫LINE_('post', 'https://api.line.me/v2/bot/user/all/richmenu/' + encodeURIComponent(id), null);
  一般員工RichMenu34_記錄_('設定一般員工RichMenu為預設', id, '完成', '全體未指定者使用報工入口');
  return { 成功: true, 訊息: '一般員工 Rich Menu 已設為預設', richMenuId: id };
}

function 取得34_LINE一般員工RichMenu設定_() {
  const webAppUrl = 一般員工RichMenu34_取得WebAppURL_();
  const 報工Action = webAppUrl ? { type: 'uri', label: '報工作業', uri: webAppUrl + '?page=07_報工作業V2' } : { type: 'message', label: '報工作業', text: '報工作業' };
  return {
    size: { width: 一般員工RichMenu34_寬度, height: 一般員工RichMenu34_高度 },
    selected: true,
    name: '34_LINE一般員工入口_' + 一般員工RichMenu34_版本,
    chatBarText: '報工入口',
    areas: [
      { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: 報工Action },
      { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '我的身份', text: '權限檢查' } },
      { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '選單更新', text: '選單更新' } },
      { bounds: { x: 0, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '報工作業', text: '報工作業' } },
      { bounds: { x: 400, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '指令說明', text: '指令' } },
      { bounds: { x: 800, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '身份綁定', text: '綁定' } }
    ]
  };
}

function 測試34_LINE一般員工RichMenu_本機規格() {
  const m = 取得34_LINE一般員工RichMenu設定_();
  const err = [];
  if (m.size.width < 800 || m.size.width > 2500) err.push('寬度不合規');
  if (m.size.height < 250) err.push('高度不合規');
  if ((m.size.width / m.size.height) < 1.45) err.push('比例不合規');
  if (m.areas.length > 20) err.push('區塊超過20個');
  if (String(m.chatBarText || '').length > 14) err.push('chatBarText超過14字');
  m.areas.forEach(function(a, i) {
    const b = a.bounds || {};
    if (b.x + b.width > m.size.width || b.y + b.height > m.size.height) err.push('第' + (i + 1) + '區超出圖片');
  });
  return { 成功: err.length === 0, 訊息: err.length ? err.join('；') : '一般員工 Rich Menu 本機規格通過', 寬度: m.size.width, 高度: m.size.height, 區塊數: m.areas.length, chatBarText: m.chatBarText };
}

function 測試34_LINE一般員工RichMenu圖片讀取() {
  const blob = 一般員工RichMenu34_圖片Blob_();
  const kb = Math.round(blob.getBytes().length / 1024);
  if (kb > 1024) throw new Error('圖片不可超過 1MB，目前約 ' + kb + 'KB');
  return { 成功: true, 訊息: '圖片讀取成功', 圖片網址: 一般員工RichMenu34_圖片網址_(), MIME類型: blob.getContentType(), 圖片大小KB: kb };
}

function 一般員工RichMenu34_上傳圖片_(richMenuId) {
  const blob = 一般員工RichMenu34_圖片Blob_();
  const res = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/richmenu/' + encodeURIComponent(richMenuId) + '/content', {
    method: 'post',
    contentType: 'image/png',
    headers: { Authorization: 'Bearer ' + 一般員工RichMenu34_取得Token_() },
    payload: blob.getBytes(),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  const body = res.getContentText() || '{}';
  if (code < 200 || code >= 300) throw new Error('圖片上傳失敗 HTTP ' + code + '：' + body);
}

function 一般員工RichMenu34_圖片Blob_() {
  const url = 一般員工RichMenu34_圖片網址_();
  const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) throw new Error('圖片讀取失敗：' + url);
  return res.getBlob().setName('34_LINE_RichMenu_一般員工入口.png');
}

function 一般員工RichMenu34_圖片網址_() {
  return String(PropertiesService.getScriptProperties().getProperty('LINE_RICH_MENU_一般員工圖片網址') || 一般員工RichMenu34_預設圖片網址).trim();
}

function 一般員工RichMenu34_取得Token_() {
  if (typeof 取得LINEToken_ === 'function') return String(取得LINEToken_() || '').trim();
  return String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
}

function 一般員工RichMenu34_取得WebAppURL_() {
  try { return String(ScriptApp.getService().getUrl() || '').trim(); } catch (err) { return ''; }
}

function 一般員工RichMenu34_呼叫LINE_(method, url, payload) {
  const opt = { method, headers: { Authorization: 'Bearer ' + 一般員工RichMenu34_取得Token_() }, muteHttpExceptions: true };
  if (payload !== null && payload !== undefined) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
  const res = UrlFetchApp.fetch(url, opt);
  const code = res.getResponseCode();
  const body = res.getContentText() || '{}';
  if (code < 200 || code >= 300) throw new Error('LINE API 失敗 HTTP ' + code + '：' + body);
  try { return JSON.parse(body || '{}'); } catch (err) { return { 狀態碼: code, 原始回應: body }; }
}

function 一般員工RichMenu34_記錄_(動作, richMenuId, 結果, 備註) {
  try {
    const ss = 取得試算表_();
    let sh = ss.getSheetByName('34_LINE選單分流紀錄');
    if (!sh) sh = ss.insertSheet('34_LINE選單分流紀錄');
    if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, 11).setValues([['時間戳', 'LINE_USER_ID', '工號', '姓名', '角色', '權限等級', '目標選單', 'richMenuId', '動作', '結果', '備註']]);
    sh.appendRow([new Date(), 'SYSTEM', '', '', '系統', 99, '一般員工入口', richMenuId, 動作, 結果, 備註 || '']);
  } catch (err) {}
}
