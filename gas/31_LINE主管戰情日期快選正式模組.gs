/**
 * 31_LINE主管戰情日期快選正式模組
 * 版本：v31.1.1
 *
 * 功能：支援 LINE 指令
 * - 主管戰情
 * - 今日戰情
 * - 昨日戰情
 * - 戰情 2026-06-14
 * - 主管戰情 2026/06/14
 *
 * 修正：
 * - 增加 replyToken 一次性防呆，避免 LINE 重送事件或雙模組重複回覆造成 invalid reply token。
 *
 * 注意：本模組依賴 30_LINE主管戰情直連回覆正式版.gs 的
 * LINE主管戰情直連_送出回覆_(replyToken, text)
 */

function LINE主管戰情日期快選_嘗試處理Webhook_(p) {
  p = p || {};
  var events = Array.isArray(p.events) ? p.events : [];
  var handled = 0;
  var failed = 0;
  for (var i = 0; i < events.length; i++) {
    try {
      if (LINE主管戰情日期快選_處理事件_(events[i])) handled++;
    } catch (err) {
      failed++;
      LINE主管戰情日期快選_寫紀錄_('失敗', LINE主管戰情日期快選_事件文字_(events[i]), String(err && err.message ? err.message : err));
    }
  }
  return { ok: true, handled: handled, failed: failed, 已處理: handled > 0, message: handled > 0 ? '已處理主管戰情日期快選指令' : '沒有主管戰情日期快選指令' };
}

function LINE主管戰情日期快選_處理事件_(event) {
  if (!event || !event.replyToken) return false;
  if (!event.message || event.message.type !== 'text') return false;
  var text = String(event.message.text || '').trim();
  var parsed = LINE主管戰情日期快選_解析指令_(text);
  if (!parsed.ok) return false;

  // LINE replyToken 只能回覆一次。先標記，避免 Apps Script / LINE 重送時再次回覆。
  if (LINE主管戰情日期快選_已使用ReplyToken_(event.replyToken)) {
    LINE主管戰情日期快選_寫紀錄_('略過', text, 'replyToken 已處理，避免重複回覆');
    return true;
  }
  LINE主管戰情日期快選_標記ReplyToken_(event.replyToken);

  var reply = LINE主管戰情日期快選_建立回覆_(parsed.date, parsed.title);
  LINE主管戰情日期快選_送出_(event.replyToken, reply);
  LINE主管戰情日期快選_寫紀錄_('成功', text, '已回覆：' + parsed.date);
  return true;
}

function LINE主管戰情日期快選_解析指令_(text) {
  text = String(text || '').trim().replace(/\s+/g, ' ');
  var today = LINE主管戰情日期快選_日期_(new Date());
  var y = new Date();
  y.setDate(y.getDate() - 1);
  var yesterday = LINE主管戰情日期快選_日期_(y);

  if (text === '主管戰情' || text === '戰情看板' || text === '主管看板' || text === '每日戰情' || text === '戰情') {
    return { ok: true, date: today, title: '主管戰情看板' };
  }
  if (text === '今日戰情' || text === '今天戰情') {
    return { ok: true, date: today, title: '今日主管戰情' };
  }
  if (text === '昨日戰情' || text === '昨天戰情') {
    return { ok: true, date: yesterday, title: '昨日主管戰情' };
  }

  var m = text.match(/^(主管戰情|戰情看板|主管看板|每日戰情|戰情|今日戰情|昨日戰情)\s+(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) {
    return { ok: true, date: m[2] + '-' + ('0' + m[3]).slice(-2) + '-' + ('0' + m[4]).slice(-2), title: '指定日期主管戰情' };
  }

  return { ok: false };
}

function LINE主管戰情日期快選_建立回覆_(date, title) {
  date = String(date || LINE主管戰情日期快選_日期_(new Date())).trim();
  title = String(title || '主管戰情看板').trim();
  var url = 'https://qhero70.github.io/smart-factory-worker-app/manager-war-room-v28.html?v=29&date=' + encodeURIComponent(date);
  return [
    '📊 ' + title,
    '作業日：' + date,
    '',
    url,
    '',
    '快速指令：',
    '・今日戰情',
    '・昨日戰情',
    '・戰情 2026-06-14'
  ].join('\n');
}

function LINE主管戰情日期快選_送出_(replyToken, text) {
  if (typeof LINE主管戰情直連_送出回覆_ !== 'function') {
    throw new Error('找不到 LINE主管戰情直連_送出回覆_，請先貼上 30_LINE主管戰情直連回覆正式版.gs');
  }
  LINE主管戰情直連_送出回覆_(replyToken, text);
}

function LINE主管戰情日期快選_已使用ReplyToken_(replyToken) {
  try {
    var key = LINE主管戰情日期快選_replyTokenKey_(replyToken);
    return CacheService.getScriptCache().get(key) === '1';
  } catch (err) {
    return false;
  }
}

function LINE主管戰情日期快選_標記ReplyToken_(replyToken) {
  try {
    var key = LINE主管戰情日期快選_replyTokenKey_(replyToken);
    CacheService.getScriptCache().put(key, '1', 1800);
  } catch (err) {}
}

function LINE主管戰情日期快選_replyTokenKey_(replyToken) {
  var s = String(replyToken || '').trim();
  return 'LINE_REPLY_USED_' + s.slice(-120);
}

function LINE主管戰情日期快選_寫紀錄_(status, command, message) {
  try {
    var id = String(PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ').trim();
    var ss = SpreadsheetApp.openById(id);
    var sh = ss.getSheetByName('31_LINE主管戰情日期快選紀錄') || ss.insertSheet('31_LINE主管戰情日期快選紀錄');
    if (sh.getLastRow() < 1) {
      sh.getRange(1, 1, 1, 5).setValues([['時間戳', '狀態', '指令', '訊息', '建立時間']]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    }
    sh.getRange(sh.getLastRow() + 1, 1, 1, 5).setValues([[new Date(), status || '', command || '', message || '', LINE主管戰情日期快選_現在_()]]);
  } catch (err) {}
}

function LINE主管戰情日期快選_事件文字_(event) {
  try { return String(event.message && event.message.text || ''); } catch (err) { return ''; }
}
function LINE主管戰情日期快選_日期_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
}
function LINE主管戰情日期快選_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}
function 測試_LINE主管戰情日期快選_解析() {
  return {
    主管戰情: LINE主管戰情日期快選_解析指令_('主管戰情'),
    今日戰情: LINE主管戰情日期快選_解析指令_('今日戰情'),
    昨日戰情: LINE主管戰情日期快選_解析指令_('昨日戰情'),
    指定日期: LINE主管戰情日期快選_解析指令_('戰情 2026-06-14'),
    無效: LINE主管戰情日期快選_解析指令_('其他')
  };
}
function 測試_LINE主管戰情日期快選_建立回覆() {
  return LINE主管戰情日期快選_建立回覆_('2026-06-14', '指定日期主管戰情');
}
