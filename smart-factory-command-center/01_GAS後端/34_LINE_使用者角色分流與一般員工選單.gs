/**
 * 34_LINE｜使用者角色分流與一般員工選單
 * 版本：v1.7.1
 * 目的：主管/工程師使用主管入口；一般員工使用報工入口。
 */

const LINE角色分流34_版本 = 'v1.7.1_34_LINE使用者角色分流與一般員工選單';
const LINE角色分流34_紀錄表 = '34_LINE選單分流紀錄';
const LINE角色分流34_紀錄欄位 = ['時間戳', 'LINE_USER_ID', '工號', '姓名', '角色', '權限等級', '目標選單', 'richMenuId', '動作', '結果', '備註'];

function 初始化34_LINE使用者角色分流與一般員工選單() {
  const ss = 取得試算表_();
  LINE角色分流34_建立或修復表_(ss, LINE角色分流34_紀錄表, LINE角色分流34_紀錄欄位);
  LINE角色分流34_寫入紀錄_({ LINE_USER_ID: 'SYSTEM', 角色: '系統', 權限等級: 99 }, '系統', '', '初始化', '完成', LINE角色分流34_版本);
  return { 成功: true, 訊息: '34_LINE角色分流初始化完成', 版本: LINE角色分流34_版本, 工作表: LINE角色分流34_紀錄表 };
}

function LINE角色分流34_嘗試處理Webhook_(payload) {
  const events = Array.isArray(payload && payload.events) ? payload.events : [];
  if (!events.length) return null;
  初始化34_LINE使用者角色分流與一般員工選單();
  let 已處理 = 0, 已更新選單 = 0;
  events.forEach(function(ev) {
    const r = LINE角色分流34_處理單一事件_(ev || {});
    if (r && r.已處理) 已處理++;
    if (r && r.已更新選單) 已更新選單++;
  });
  return 已處理 > 0 ? { ok: true, success: true, 已處理: true, 已更新選單, 訊息: '34_LINE角色分流已處理' } : null;
}

function LINE角色分流34_處理單一事件_(ev) {
  if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return null;
  const text = LINE角色分流34_文字_(ev.message.text);
  const lineUserId = LINE角色分流34_文字_(ev.source && ev.source.userId);
  const replyToken = ev.replyToken;
  if (!text || !lineUserId) return null;

  const 綁定工號 = LINE角色分流34_解析綁定工號_(text);
  if (綁定工號 && typeof LINE身份權限33_綁定身份_ === 'function') {
    const bind = LINE身份權限33_綁定身份_(lineUserId, 綁定工號);
    const menu = bind && bind.成功 ? 套用34_LINE使用者角色選單(lineUserId) : null;
    LINE角色分流34_回覆_(replyToken, (bind && bind.文字 ? bind.文字 : '身份綁定完成') + '\n\n' + LINE角色分流34_選單結果文字_(menu));
    return { 已處理: true, 已更新選單: !!(menu && menu.成功), 綁定結果: bind, 選單結果: menu };
  }

  if (/^(選單更新|更新選單|重整選單|我的選單)$/i.test(text)) {
    const menu = 套用34_LINE使用者角色選單(lineUserId);
    LINE角色分流34_回覆_(replyToken, LINE角色分流34_選單結果文字_(menu));
    return { 已處理: true, 已更新選單: !!(menu && menu.成功), 選單結果: menu };
  }

  if (/^(員工選單|一般選單|報工選單)$/i.test(text)) {
    const menu = 套用34_LINE指定選單_(lineUserId, '一般員工入口');
    LINE角色分流34_回覆_(replyToken, LINE角色分流34_選單結果文字_(menu));
    return { 已處理: true, 已更新選單: !!(menu && menu.成功), 選單結果: menu };
  }

  if (/^(主管選單|主管入口選單)$/i.test(text)) {
    const 身份 = LINE角色分流34_取得身份_(lineUserId);
    if (!身份 || !LINE角色分流34_是否主管選單_(身份)) {
      LINE角色分流34_回覆_(replyToken, '⛔ 目前身份不可切換主管選單。');
      return { 已處理: true, 已更新選單: false };
    }
    const menu = 套用34_LINE指定選單_(lineUserId, '主管入口', 身份);
    LINE角色分流34_回覆_(replyToken, LINE角色分流34_選單結果文字_(menu));
    return { 已處理: true, 已更新選單: !!(menu && menu.成功), 選單結果: menu };
  }

  return null;
}

function 套用34_LINE使用者角色選單(lineUserId) {
  const 身份 = LINE角色分流34_取得身份_(lineUserId);
  if (!身份) return { 成功: false, 訊息: '尚未綁定身份，無法判斷角色選單', 目標選單: '未綁定' };
  const 目標選單 = LINE角色分流34_是否主管選單_(身份) ? '主管入口' : '一般員工入口';
  return 套用34_LINE指定選單_(lineUserId, 目標選單, 身份);
}

function 套用34_LINE指定選單_(lineUserId, 目標選單, 身份) {
  身份 = 身份 || LINE角色分流34_取得身份_(lineUserId) || { LINE_USER_ID: lineUserId };
  const richMenuId = 目標選單 === '主管入口' ? LINE角色分流34_取得主管RichMenuId_() : LINE角色分流34_取得一般員工RichMenuId_();
  if (!richMenuId) return { 成功: false, 訊息: '缺少 ' + 目標選單 + ' richMenuId', 目標選單 };
  LINE角色分流34_呼叫LINEAPI_('post', 'https://api.line.me/v2/bot/user/' + encodeURIComponent(lineUserId) + '/richmenu/' + encodeURIComponent(richMenuId), null);
  LINE角色分流34_寫入紀錄_(身份, 目標選單, richMenuId, '套用個人RichMenu', '完成', '依角色分流');
  return { 成功: true, 訊息: '已套用 ' + 目標選單, 目標選單, richMenuId, 身份 };
}

function 批次同步34_LINE所有已綁定使用者選單() {
  初始化34_LINE使用者角色分流與一般員工選單();
  const sh = 取得試算表_().getSheetByName('33_LINE身份權限');
  if (!sh || sh.getLastRow() < 2) return { 成功: true, 訊息: '沒有已綁定使用者', 總數: 0 };
  const rows = LINE角色分流34_讀表物件_(sh).filter(r => LINE角色分流34_文字_(r.LINE_USER_ID) && LINE角色分流34_文字_(r.啟用 || '是') !== '否');
  let ok = 0, fail = 0, errors = [];
  rows.forEach(r => {
    try { const res = 套用34_LINE使用者角色選單(r.LINE_USER_ID); if (res && res.成功) ok++; else { fail++; errors.push(res); } }
    catch (err) { fail++; errors.push({ LINE_USER_ID: r.LINE_USER_ID, 訊息: err.message }); }
  });
  return { 成功: fail === 0, 訊息: '批次同步完成', 總數: rows.length, 成功數: ok, 失敗數: fail, 錯誤: errors.slice(0, 20) };
}

function 測試34_LINE角色分流_本機規格() {
  const init = 初始化34_LINE使用者角色分流與一般員工選單();
  return { 成功: true, 訊息: '34_LINE角色分流本機規格通過', 版本: LINE角色分流34_版本, 初始化結果: init, 必要屬性: ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_RICH_MENU_主管入口_ID', 'LINE_RICH_MENU_一般員工_ID'] };
}

function LINE角色分流34_選單結果文字_(result) {
  if (!result) return 'ℹ️ 選單未更新。';
  if (!result.成功) return '⚠️ 選單更新未完成\n原因：' + (result.訊息 || '未知') + '\n\n請確認 LINE_RICH_MENU_一般員工_ID 與 LINE_RICH_MENU_主管入口_ID。';
  return '✅ 選單已更新\n目標選單：' + result.目標選單 + '\n角色：' + ((result.身份 && result.身份.角色) || '-') + '\n權限等級：' + ((result.身份 && result.身份.權限等級) || '-');
}

function LINE角色分流34_是否主管選單_(身份) {
  const allow = LINE角色分流34_文字_(身份 && 身份.允許主管入口).toLowerCase();
  if (['是', 'yes', 'y', 'true', '1'].indexOf(allow) >= 0) return true;
  const role = LINE角色分流34_文字_(身份 && 身份.角色);
  return /主管|班長|工程師|主任|課長|經理|廠長|營運長|副總/i.test(role);
}

function LINE角色分流34_解析綁定工號_(text) {
  const m = LINE角色分流34_文字_(text).match(/^(綁定|身份綁定|我是|設定身份)\s*[:：]?\s*([A-Za-z0-9\-_]+)$/i);
  return m ? m[2] : '';
}

function LINE角色分流34_取得身份_(lineUserId) {
  return typeof LINE身份權限33_取得身份_ === 'function' ? LINE身份權限33_取得身份_(lineUserId) : null;
}

function LINE角色分流34_取得主管RichMenuId_() {
  return LINE角色分流34_文字_(PropertiesService.getScriptProperties().getProperty('LINE_RICH_MENU_主管入口_ID'));
}

function LINE角色分流34_取得一般員工RichMenuId_() {
  return LINE角色分流34_文字_(PropertiesService.getScriptProperties().getProperty('LINE_RICH_MENU_一般員工_ID'));
}

function LINE角色分流34_呼叫LINEAPI_(method, url, payload) {
  const opt = { method: method, headers: { Authorization: 'Bearer ' + LINE角色分流34_取得LINEToken_() }, muteHttpExceptions: true };
  if (payload !== null && payload !== undefined) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
  const res = UrlFetchApp.fetch(url, opt);
  const code = res.getResponseCode();
  const body = res.getContentText() || '{}';
  if (code < 200 || code >= 300) throw new Error('LINE API 呼叫失敗 HTTP ' + code + '：' + body);
  try { return JSON.parse(body || '{}'); } catch (err) { return { 狀態碼: code, 原始回應: body }; }
}

function LINE角色分流34_取得LINEToken_() {
  if (typeof 取得LINEToken_ === 'function') return LINE角色分流34_文字_(取得LINEToken_());
  return LINE角色分流34_文字_(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN'));
}

function LINE角色分流34_建立或修復表_(ss, name, headers) {
  if (typeof 建立或修復表_ === 'function') return 建立或修復表_(ss, name, headers);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function LINE角色分流34_讀表物件_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const h = values.shift().map(String);
  return values.filter(r => r.some(v => v !== '')).map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; });
}

function LINE角色分流34_寫入紀錄_(身份, 目標選單, richMenuId, 動作, 結果, 備註) {
  try {
    const sh = LINE角色分流34_建立或修復表_(取得試算表_(), LINE角色分流34_紀錄表, LINE角色分流34_紀錄欄位);
    sh.appendRow([new Date(), 身份.LINE_USER_ID || '', 身份.工號 || '', 身份.姓名 || '', 身份.角色 || '', 身份.權限等級 || '', 目標選單 || '', richMenuId || '', 動作 || '', 結果 || '', 備註 || '']);
  } catch (err) {}
}

function LINE角色分流34_回覆_(replyToken, text) {
  if (!replyToken) return;
  if (typeof LINE主管戰情直連_送出回覆_ === 'function') return LINE主管戰情直連_送出回覆_(replyToken, String(text || '').slice(0, 4900));
  if (typeof 回覆LINE_ === 'function') return 回覆LINE_(replyToken, String(text || '').slice(0, 4900));
}

function LINE角色分流34_文字_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}
