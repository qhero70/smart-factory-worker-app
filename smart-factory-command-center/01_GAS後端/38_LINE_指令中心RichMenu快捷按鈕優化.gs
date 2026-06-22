/**
 * 38_LINE｜指令中心 Rich Menu 快捷按鈕優化
 * 版本：v1.7.5
 * 目的：重新建立主管入口與一般員工入口 Rich Menu，加入指令中心、我的狀態、選單更新快捷按鈕。
 */

const RichMenu38_版本 = 'v1.7.5_38_LINE指令中心RichMenu快捷按鈕優化';
const RichMenu38_寬度 = 1200;
const RichMenu38_高度 = 810;
const RichMenu38_預設主管圖片 = 'https://dummyimage.com/1200x810/0b1220/e2e8f0.png&text=Supervisor+Quick+Menu';
const RichMenu38_預設員工圖片 = 'https://dummyimage.com/1200x810/0b1220/e2e8f0.png&text=Worker+Quick+Menu';
const RichMenu38_紀錄表 = '38_LINE快捷選單上線紀錄';
const RichMenu38_紀錄欄位 = ['時間戳', '版本', '目標選單', 'richMenuId', '動作', '結果', '圖片網址', '備註'];

function 初始化38_LINE指令中心RichMenu快捷按鈕優化() {
  const ss = 取得試算表_();
  RichMenu38_建立或修復表_(ss, RichMenu38_紀錄表, RichMenu38_紀錄欄位);
  RichMenu38_寫入紀錄_('系統', '', '初始化', '完成', '', RichMenu38_版本);
  return { 成功: true, 訊息: '38_LINE指令中心RichMenu快捷按鈕優化初始化完成', 版本: RichMenu38_版本, 工作表: RichMenu38_紀錄表 };
}

function 測試38_LINE快捷RichMenu_本機規格() {
  const boss = RichMenu38_取得主管設定_();
  const worker = RichMenu38_取得員工設定_();
  const b = RichMenu38_檢查設定_(boss);
  const w = RichMenu38_檢查設定_(worker);
  return { 成功: b.成功 && w.成功, 訊息: b.成功 && w.成功 ? '38 快捷 Rich Menu 規格通過' : '規格不通過', 主管入口: b, 一般員工入口: w, 版本: RichMenu38_版本 };
}

function 測試38_LINE快捷RichMenu圖片讀取() {
  const boss = RichMenu38_讀圖片_(RichMenu38_主管圖片網址_());
  const worker = RichMenu38_讀圖片_(RichMenu38_員工圖片網址_());
  return {
    成功: true,
    訊息: '38 快捷 Rich Menu 圖片讀取成功',
    主管圖片: { 網址: RichMenu38_主管圖片網址_(), MIME類型: boss.getContentType(), 大小KB: Math.round(boss.getBytes().length / 1024) },
    員工圖片: { 網址: RichMenu38_員工圖片網址_(), MIME類型: worker.getContentType(), 大小KB: Math.round(worker.getBytes().length / 1024) }
  };
}

function 建立38_LINE主管快捷RichMenu() {
  const id = RichMenu38_建立並上傳_('主管入口', RichMenu38_取得主管設定_(), RichMenu38_主管圖片網址_());
  PropertiesService.getScriptProperties().setProperty('LINE_RICH_MENU_主管入口_ID', id);
  RichMenu38_寫入紀錄_('主管入口', id, '建立並寫入主管入口ID', '完成', RichMenu38_主管圖片網址_(), '覆蓋 LINE_RICH_MENU_主管入口_ID');
  return { 成功: true, 訊息: '38 主管快捷 Rich Menu 已建立', richMenuId: id, 圖片網址: RichMenu38_主管圖片網址_() };
}

function 建立38_LINE一般員工快捷RichMenu() {
  const id = RichMenu38_建立並上傳_('一般員工入口', RichMenu38_取得員工設定_(), RichMenu38_員工圖片網址_());
  PropertiesService.getScriptProperties().setProperty('LINE_RICH_MENU_一般員工_ID', id);
  RichMenu38_寫入紀錄_('一般員工入口', id, '建立並寫入一般員工ID', '完成', RichMenu38_員工圖片網址_(), '覆蓋 LINE_RICH_MENU_一般員工_ID');
  return { 成功: true, 訊息: '38 一般員工快捷 Rich Menu 已建立', richMenuId: id, 圖片網址: RichMenu38_員工圖片網址_() };
}

function 設定38_LINE一般員工快捷RichMenu為預設() {
  const id = String(PropertiesService.getScriptProperties().getProperty('LINE_RICH_MENU_一般員工_ID') || '').trim();
  if (!id) throw new Error('缺少 LINE_RICH_MENU_一般員工_ID，請先建立一般員工快捷 Rich Menu。');
  RichMenu38_呼叫LINE_('post', 'https://api.line.me/v2/bot/user/all/richmenu/' + encodeURIComponent(id), null);
  RichMenu38_寫入紀錄_('一般員工入口', id, '設為全體預設', '完成', RichMenu38_員工圖片網址_(), '未指定者預設報工入口');
  return { 成功: true, 訊息: '38 一般員工快捷 Rich Menu 已設為預設', richMenuId: id };
}

function 一鍵上線38_LINE快捷RichMenu並同步() {
  初始化38_LINE指令中心RichMenu快捷按鈕優化();
  測試38_LINE快捷RichMenu_本機規格();
  測試38_LINE快捷RichMenu圖片讀取();
  const boss = 建立38_LINE主管快捷RichMenu();
  const worker = 建立38_LINE一般員工快捷RichMenu();
  const def = 設定38_LINE一般員工快捷RichMenu為預設();
  const sync = typeof 批次同步34_LINE所有已綁定使用者選單 === 'function' ? 批次同步34_LINE所有已綁定使用者選單() : { 成功: false, 訊息: '找不到批次同步34函數' };
  return { 成功: true, 訊息: '38 快捷 Rich Menu 已上線並同步', 主管: boss, 一般員工: worker, 預設: def, 同步: sync };
}

function RichMenu38_取得主管設定_() {
  const reportUrl = RichMenu38_取得WebAppURL_();
  const 報工Action = reportUrl ? { type: 'uri', label: '報工作業', uri: reportUrl + '?page=07_報工作業V2' } : { type: 'message', label: '報工作業', text: '報工作業' };
  return {
    size: { width: RichMenu38_寬度, height: RichMenu38_高度 }, selected: true, name: '38_主管快捷入口_' + RichMenu38_版本, chatBarText: '主管入口',
    areas: [
      { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '主管戰情', text: '主管戰情' } },
      { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '今日戰情', text: '今日戰情' } },
      { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '指令中心', text: '指令' } },
      { bounds: { x: 0, y: 405, width: 400, height: 405 }, action: 報工Action },
      { bounds: { x: 400, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '我的狀態', text: '我的狀態' } },
      { bounds: { x: 800, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '選單更新', text: '選單更新' } }
    ]
  };
}

function RichMenu38_取得員工設定_() {
  const reportUrl = RichMenu38_取得WebAppURL_();
  const 報工Action = reportUrl ? { type: 'uri', label: '報工作業', uri: reportUrl + '?page=07_報工作業V2' } : { type: 'message', label: '報工作業', text: '報工作業' };
  return {
    size: { width: RichMenu38_寬度, height: RichMenu38_高度 }, selected: true, name: '38_員工快捷入口_' + RichMenu38_版本, chatBarText: '報工入口',
    areas: [
      { bounds: { x: 0, y: 0, width: 400, height: 405 }, action: 報工Action },
      { bounds: { x: 400, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '我的狀態', text: '我的狀態' } },
      { bounds: { x: 800, y: 0, width: 400, height: 405 }, action: { type: 'message', label: '指令中心', text: '指令' } },
      { bounds: { x: 0, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '選單更新', text: '選單更新' } },
      { bounds: { x: 400, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '選單說明', text: '選單說明' } },
      { bounds: { x: 800, y: 405, width: 400, height: 405 }, action: { type: 'message', label: '身份綁定', text: '綁定' } }
    ]
  };
}

function RichMenu38_建立並上傳_(name, menu, imageUrl) {
  RichMenu38_呼叫LINE_('post', 'https://api.line.me/v2/bot/richmenu/validate', menu);
  const created = RichMenu38_呼叫LINE_('post', 'https://api.line.me/v2/bot/richmenu', menu);
  const id = created.richMenuId;
  if (!id) throw new Error('LINE 未回傳 richMenuId：' + JSON.stringify(created));
  const blob = RichMenu38_讀圖片_(imageUrl);
  const res = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/richmenu/' + encodeURIComponent(id) + '/content', { method: 'post', contentType: 'image/png', headers: { Authorization: 'Bearer ' + RichMenu38_取得Token_() }, payload: blob.getBytes(), muteHttpExceptions: true });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) throw new Error(name + ' 圖片上傳失敗 HTTP ' + res.getResponseCode() + '：' + res.getContentText());
  return id;
}

function RichMenu38_檢查設定_(m) {
  const err = [];
  if (m.size.width !== 1200 || m.size.height !== 810) err.push('尺寸必須 1200x810');
  if (m.areas.length !== 6) err.push('必須六個區塊');
  if (String(m.chatBarText || '').length > 14) err.push('chatBarText 超過 14 字');
  m.areas.forEach(function(a, i) { const b = a.bounds; if (b.x + b.width > m.size.width || b.y + b.height > m.size.height) err.push('第' + (i + 1) + '區超出範圍'); });
  return { 成功: err.length === 0, 訊息: err.length ? err.join('；') : '通過', 名稱: m.name, chatBarText: m.chatBarText, 區塊數: m.areas.length };
}

function RichMenu38_讀圖片_(url) {
  const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) throw new Error('圖片讀取失敗：' + url);
  const blob = res.getBlob().setName('38_LINE_RichMenu.png');
  if (blob.getBytes().length > 1024 * 1024) throw new Error('圖片不可超過 1MB，目前約 ' + Math.round(blob.getBytes().length / 1024) + 'KB');
  return blob;
}

function RichMenu38_主管圖片網址_() { return String(PropertiesService.getScriptProperties().getProperty('LINE_RICH_MENU_主管入口圖片網址_38') || RichMenu38_預設主管圖片).trim(); }
function RichMenu38_員工圖片網址_() { return String(PropertiesService.getScriptProperties().getProperty('LINE_RICH_MENU_一般員工圖片網址_38') || RichMenu38_預設員工圖片).trim(); }
function RichMenu38_取得WebAppURL_() { try { return String(ScriptApp.getService().getUrl() || '').trim(); } catch (err) { return ''; } }
function RichMenu38_取得Token_() { if (typeof 取得LINEToken_ === 'function') return String(取得LINEToken_() || '').trim(); return String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim(); }
function RichMenu38_呼叫LINE_(method, url, payload) { const opt = { method: method, headers: { Authorization: 'Bearer ' + RichMenu38_取得Token_() }, muteHttpExceptions: true }; if (payload !== null && payload !== undefined) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); } const res = UrlFetchApp.fetch(url, opt); const code = res.getResponseCode(); const body = res.getContentText() || '{}'; if (code < 200 || code >= 300) throw new Error('LINE API 失敗 HTTP ' + code + '：' + body); try { return JSON.parse(body || '{}'); } catch (err) { return { 狀態碼: code, 原始回應: body }; } }
function RichMenu38_建立或修復表_(ss, name, headers) { if (typeof 建立或修復表_ === 'function') return 建立或修復表_(ss, name, headers); let sh = ss.getSheetByName(name); if (!sh) sh = ss.insertSheet(name); if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]); return sh; }
function RichMenu38_寫入紀錄_(target, richMenuId, action, result, imageUrl, note) { try { const sh = RichMenu38_建立或修復表_(取得試算表_(), RichMenu38_紀錄表, RichMenu38_紀錄欄位); sh.appendRow([new Date(), RichMenu38_版本, target, richMenuId, action, result, imageUrl, note || '']); } catch (err) {} }
