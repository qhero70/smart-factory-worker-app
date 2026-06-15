/**
 * 29_LINE文字指令主管戰情接入片段
 * 專案：製造部智慧製造應用總部
 * 版本：v29.1.1
 *
 * 用途：
 * 讓 LINE Bot 收到「主管戰情 / 戰情看板 / 主管看板 / 每日戰情 / 戰情」時，
 * 直接回覆主管戰情看板網址。
 *
 * 貼法：
 * 1. Apps Script 新增此檔案並貼上完整內容。
 * 2. 在既有 處理LINEWebhook_(p) 的事件迴圈最前面加入：
 *    var 主管戰情已處理 = LINE主管戰情_嘗試處理事件_(event);
 *    if (主管戰情已處理) continue;
 */

var LINE主管戰情_看板網址_ = 'https://qhero70.github.io/smart-factory-worker-app/manager-war-room-v28.html?v=29';

function LINE主管戰情_嘗試處理Webhook_(payload) {
  payload = payload || {};
  var events = Array.isArray(payload.events) ? payload.events : [];
  var count = 0;
  events.forEach(function(event) {
    if (LINE主管戰情_嘗試處理事件_(event)) count++;
  });
  return {
    ok: true,
    handled: count > 0,
    處理筆數: count,
    message: count > 0 ? '已處理主管戰情 LINE 指令' : '沒有主管戰情 LINE 指令',
    時間: LINE主管戰情_現在_()
  };
}

function LINE主管戰情_嘗試處理事件_(event) {
  event = event || {};
  if (!event.message || event.message.type !== 'text') return false;

  var text = String(event.message.text || '').trim();
  if (!LINE主管戰情_是否戰情指令_(text)) return false;

  var replyToken = String(event.replyToken || '').trim();
  if (!replyToken) return false;

  var message = LINE主管戰情_建立回覆文字_({});
  LINE主管戰情_回覆文字_(replyToken, message);
  return true;
}

function LINE主管戰情_是否戰情指令_(text) {
  text = String(text || '').trim();
  return ['主管戰情', '戰情看板', '主管看板', '每日戰情', '戰情'].indexOf(text) >= 0;
}

function LINE主管戰情_建立回覆文字_(payload) {
  payload = payload || {};
  var date = String(payload['作業日'] || '').trim() || LINE主管戰情_日期文字_(new Date());
  var url = LINE主管戰情_看板網址_ + '&date=' + encodeURIComponent(date);
  return [
    '📊 主管戰情看板',
    '作業日：' + date,
    '',
    url,
    '',
    '可查看：',
    '・AI 摘要',
    '・風險清單',
    '・未報工追蹤',
    '・工站效率',
    '・自動化與 LINE 推播狀態'
  ].join('\n');
}

function LINE主管戰情_回覆文字_(replyToken, text) {
  // 優先使用既有專案的 LINE 回覆函數，避免重複維護。
  if (typeof 回覆LINE文字_ === 'function') {
    回覆LINE文字_(replyToken, text);
    return;
  }
  if (typeof lineReplyText_ === 'function') {
    lineReplyText_(replyToken, text);
    return;
  }

  var token = LINE主管戰情_取得LINE_TOKEN_();
  if (!token) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN，請到 Apps Script 指令碼屬性設定。');

  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }]
    }),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  var body = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('LINE reply API 失敗 HTTP ' + code + '：' + body);
}

function LINE主管戰情_取得LINE_TOKEN_() {
  var props = PropertiesService.getScriptProperties();
  var token = String(props.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (token) return token;

  // 相容舊版系統設定，但正式仍建議放 Script Properties。
  try {
    if (typeof 系統設定 !== 'undefined' && 系統設定 && 系統設定.LINE_CHANNEL_ACCESS_TOKEN) {
      return String(系統設定.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
    }
  } catch (err) {}
  return '';
}

function LINE主管戰情_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var s = String(v).replace(/^[\'\"]|[\'\"]$/g, '').trim();
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function LINE主管戰情_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_LINE主管戰情_建立回覆文字() {
  return LINE主管戰情_建立回覆文字_({ 作業日: '2026-06-14' });
}

function 測試_LINE主管戰情_是否戰情指令() {
  return {
    主管戰情: LINE主管戰情_是否戰情指令_('主管戰情'),
    戰情看板: LINE主管戰情_是否戰情指令_('戰情看板'),
    其他: LINE主管戰情_是否戰情指令_('其他')
  };
}
