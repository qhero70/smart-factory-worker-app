/**
 * 30_LINE主管戰情直連回覆正式版
 * 版本：v30.2.1
 *
 * 功能：LINE Bot 文字輸入「主管戰情」時，直接回覆主管戰情看板網址。
 * 機密：不在程式碼放 Token，僅讀 Apps Script 指令碼屬性 LINE_CHANNEL_ACCESS_TOKEN。
 */

function LINE主管戰情直連_嘗試處理Webhook_(p) {
  p = p || {};
  var events = Array.isArray(p.events) ? p.events : [];
  var handled = 0;
  var failed = 0;
  for (var i = 0; i < events.length; i++) {
    try {
      if (LINE主管戰情直連_處理事件_(events[i])) handled++;
    } catch (err) {
      failed++;
      LINE主管戰情直連_寫紀錄_('失敗', LINE主管戰情直連_事件文字_(events[i]), String(err && err.message ? err.message : err));
    }
  }
  return { ok: true, handled: handled, failed: failed, 已處理: handled > 0, message: handled > 0 ? '已回覆主管戰情 LINE 指令' : '沒有主管戰情指令' };
}

function LINE主管戰情直連_處理事件_(event) {
  if (!event || !event.replyToken) return false;
  if (!event.message || event.message.type !== 'text') return false;
  var text = String(event.message.text || '').trim();
  var replyText = LINE主管戰情直連_建立回覆_(text);
  if (!replyText) return false;
  LINE主管戰情直連_送出回覆_(event.replyToken, replyText);
  LINE主管戰情直連_寫紀錄_('成功', text, '已回覆主管戰情指令');
  return true;
}

function LINE主管戰情直連_建立回覆_(text) {
  text = String(text || '').trim();
  var today = LINE主管戰情直連_日期_(new Date());
  var boardUrl = 'https://qhero70.github.io/smart-factory-worker-app/manager-war-room-v28.html?v=29&date=' + encodeURIComponent(today);
  var homeUrl = 'https://qhero70.github.io/smart-factory-worker-app/?v=30';
  var reportUrl = 'https://qhero70.github.io/smart-factory-worker-app/work-report-v2.html?v=250';

  if (['主管戰情', '戰情看板', '主管看板', '每日戰情', '戰情'].indexOf(text) >= 0) {
    return ['📊 主管戰情看板', '作業日：' + today, '', boardUrl, '', '可查看：AI 摘要、風險清單、未報工追蹤、工站效率、自動化與 LINE 推播狀態'].join('\n');
  }
  if (text === '總部首頁' || text === '首頁' || text === '智慧製造總部') return ['🏭 製造部智慧製造應用總部', '', homeUrl].join('\n');
  if (text === '報工' || text === '報工作業' || text === '報工系統') return ['✅ 報工作業 V2', '', reportUrl].join('\n');
  if (text === '功能' || text === '指令' || text === '幫助' || String(text).toLowerCase() === 'help') {
    return ['📌 智慧製造 LINE 指令', '', '主管戰情：取得主管戰情看板', '總部首頁：取得智慧製造總部入口', '報工：取得報工作業 V2 入口', 'AI摘要：取得目前 AI 摘要', '主檔檢查：檢查主資料筆數'].join('\n');
  }
  return null;
}

function LINE主管戰情直連_送出回覆_(replyToken, text) {
  var token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!token) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN');

  var endpoint = 'https://' + 'api.line.me' + '/v2/bot/message/reply';
  var payload = { replyToken: replyToken, messages: [{ type: 'text', text: LINE主管戰情直連_限制文字_(text) }] };
  var res = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: ['Bearer', token].join(' ') },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var content = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('LINE Reply API HTTP ' + code + '：' + content);
}

function LINE主管戰情直連_寫紀錄_(status, command, message) {
  try {
    var id = String(PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ').trim();
    var ss = SpreadsheetApp.openById(id);
    var sh = ss.getSheetByName('30_LINE主管戰情指令紀錄') || ss.insertSheet('30_LINE主管戰情指令紀錄');
    if (sh.getLastRow() < 1) {
      sh.getRange(1, 1, 1, 5).setValues([['時間戳', '狀態', '指令', '訊息', '建立時間']]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#075985').setFontColor('#ffffff');
    }
    sh.getRange(sh.getLastRow() + 1, 1, 1, 5).setValues([[new Date(), status || '', command || '', message || '', LINE主管戰情直連_現在_()]]);
  } catch (err) {}
}

function LINE主管戰情直連_事件文字_(event) {
  try { return String(event.message && event.message.text || ''); } catch (err) { return ''; }
}
function LINE主管戰情直連_限制文字_(text) {
  text = String(text || '');
  return text.length > 4900 ? text.slice(0, 4890) + '\n...' : text;
}
function LINE主管戰情直連_日期_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
}
function LINE主管戰情直連_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}
function 測試_LINE主管戰情直連_建立回覆() {
  return LINE主管戰情直連_建立回覆_('主管戰情');
}
function 測試_LINE主管戰情直連_TOKEN檢查() {
  var token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  return { ok: !!token, message: token ? '已設定 LINE_CHANNEL_ACCESS_TOKEN' : '缺少 LINE_CHANNEL_ACCESS_TOKEN', 時間: LINE主管戰情直連_現在_() };
}
