/**
 * 30_LINEWebhook_主管戰情最小可用替換版
 * 版本：v30.1.1
 *
 * 用途：修正 LINE Bot 輸入「主管戰情」沒有反應。
 *
 * 貼法：
 * 1. 用本檔的 function 處理LINEWebhook_(p) 完整取代原本同名函數。
 * 2. 不要保留第二個同名 處理LINEWebhook_。
 * 3. 此版優先呼叫你原本專案內的 回覆LINE文字_ 或 lineReplyText_。
 */

function 處理LINEWebhook_(p) {
  p = p || {};
  var events = Array.isArray(p.events) ? p.events : [];
  var handled = 0;

  for (var i = 0; i < events.length; i++) {
    var event = events[i] || {};
    if (!event.message || event.message.type !== 'text') continue;
    var text = String(event.message.text || '').trim();
    var replyToken = String(event.replyToken || '').trim();
    if (!replyToken || !text) continue;

    var replyText = LINE主管戰情最小_建立回覆_(text);
    if (!replyText) continue;

    LINE主管戰情最小_回覆_(replyToken, replyText);
    LINE主管戰情最小_寫紀錄_('成功', text, '已回覆');
    handled++;
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, handled: handled }))
    .setMimeType(ContentService.MimeType.JSON);
}

function LINE主管戰情最小_建立回覆_(text) {
  text = String(text || '').trim();
  var today = LINE主管戰情最小_日期_(new Date());
  var board = 'https://qhero70.github.io/smart-factory-worker-app/manager-war-room-v28.html?v=29&date=' + encodeURIComponent(today);
  var home = 'https://qhero70.github.io/smart-factory-worker-app/?v=30';
  var report = 'https://qhero70.github.io/smart-factory-worker-app/work-report-v2.html?v=250';

  if (['主管戰情','戰情看板','主管看板','每日戰情','戰情'].indexOf(text) >= 0) {
    return '📊 主管戰情看板\n作業日：' + today + '\n\n' + board + '\n\n可查看：AI摘要、風險清單、未報工追蹤、工站效率、自動化與LINE狀態。';
  }
  if (text === '總部首頁' || text === '首頁' || text === '智慧製造總部') {
    return '🏭 製造部智慧製造應用總部\n\n' + home;
  }
  if (text === '報工' || text === '報工作業' || text === '報工系統') {
    return '✅ 報工作業 V2\n\n' + report;
  }
  if (text === '功能' || text === '指令' || text === '幫助' || String(text).toLowerCase() === 'help') {
    return '📌 智慧製造 LINE 指令\n\n主管戰情：取得主管戰情看板\n總部首頁：取得總部入口\n報工：取得報工作業 V2 入口\n主檔檢查：檢查主資料筆數';
  }
  if (text === '主檔檢查' && typeof 主檔檢查 === 'function') {
    var r = 主檔檢查();
    return '📋 主檔檢查\n' + JSON.stringify(r, null, 2).slice(0, 1200);
  }
  return null;
}

function LINE主管戰情最小_回覆_(replyToken, text) {
  if (typeof 回覆LINE文字_ === 'function') {
    回覆LINE文字_(replyToken, text);
    return;
  }
  if (typeof lineReplyText_ === 'function') {
    lineReplyText_(replyToken, text);
    return;
  }
  throw new Error('找不到既有 LINE 回覆函數：回覆LINE文字_ 或 lineReplyText_');
}

function LINE主管戰情最小_寫紀錄_(status, command, message) {
  try {
    var ss = SpreadsheetApp.openById('1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ');
    var sh = ss.getSheetByName('29_LINE主管戰情指令紀錄') || ss.insertSheet('29_LINE主管戰情指令紀錄');
    if (sh.getLastRow() < 1) sh.getRange(1,1,1,5).setValues([['時間戳','狀態','指令','訊息','建立時間']]);
    sh.getRange(sh.getLastRow()+1,1,1,5).setValues([[new Date(), status || '', command || '', message || '', LINE主管戰情最小_現在_()]]);
  } catch (err) {}
}

function LINE主管戰情最小_日期_(v) {
  return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
}
function LINE主管戰情最小_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}
function 測試_LINE主管戰情最小_建立回覆() {
  return LINE主管戰情最小_建立回覆_('主管戰情');
}
