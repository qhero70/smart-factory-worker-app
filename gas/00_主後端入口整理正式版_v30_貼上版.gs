/**
 * 00_主後端入口整理正式版_v30_貼上版
 * 專案：製造部智慧製造應用總部
 * 版本：v30.2.2
 *
 * 用途：整理主後端入口層，修正 doPost 重複 LINE 分流、主管戰情日期快選、LINE Token 讀取錯誤。
 *
 * 貼法：
 * 1. 到主後端檔案：智慧製造中央作戰指揮中心｜正式主後端.gs。
 * 2. 用本檔同名函數取代原本同名函數。
 * 3. Apps Script 專案內只能保留一個 doGet(e)、一個 doPost(e)。
 * 4. 其他報工、照片、主檔函數不需要改。
 *
 * 必要指令碼屬性：
 * - LINE_CHANNEL_ACCESS_TOKEN
 * - 智慧製造_SPREADSHEET_ID
 */

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  // LINE Webhook 優先處理，避免被一般 API 分流吃掉。
  if (p && p.events && Array.isArray(p.events)) {
    // 31：今日戰情、昨日戰情、戰情 yyyy-MM-dd。
    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ === 'function') {
      var 日期快選結果 = LINE主管戰情日期快選_嘗試處理Webhook_(p);
      if (日期快選結果 && 日期快選結果.已處理) return 主程式_安全輸出JSON_(日期快選結果);
    }

    // 補救：若 31 只有建立回覆函數，主後端仍可直接處理。
    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ !== 'function' &&
        typeof LINE主管戰情日期快選_建立回覆_ === 'function') {
      var 日期快選補救結果 = 主後端_LINE日期快選補救處理_(p);
      if (日期快選補救結果 && 日期快選補救結果.已處理) return 主程式_安全輸出JSON_(日期快選補救結果);
    }

    // 30：主管戰情、總部首頁、報工、功能。
    if (typeof LINE主管戰情直連_嘗試處理Webhook_ === 'function') {
      var 主管戰情LINE結果 = LINE主管戰情直連_嘗試處理Webhook_(p);
      if (主管戰情LINE結果 && 主管戰情LINE結果.已處理) return 主程式_安全輸出JSON_(主管戰情LINE結果);
    }

    // 原本 LINE 指令：主檔檢查、AI摘要、報工等。
    return 處理LINEWebhook_(p);
  }

  var handlers = [
    '主管戰情入口_嘗試處理動作_',
    '主管戰情看板_嘗試處理動作_',
    '每日自動化_嘗試處理動作_',
    'LINE每日戰情推播_嘗試處理動作_',
    'AI戰情資料源_嘗試處理動作_',
    '派班報工日結_嘗試處理動作_',
    '派班報工巡檢_嘗試處理動作_',
    '派班報工防呆_嘗試處理動作_',
    '今日派班報工_嘗試處理動作_',
    '排程需求池_嘗試處理動作_'
  ];

  for (var i = 0; i < handlers.length; i++) {
    var r = 主後端_嘗試呼叫模組_(handlers[i], p);
    if (r) return 主程式_安全輸出JSON_(r);
  }

  return 主程式_安全輸出JSON_(處理API請求_(action || '健康檢查', p));
}

function 處理API請求_(action, p) {
  action = String(action || (p && (p.action || p['動作'])) || '').trim();

  var handlers = [
    '主管戰情入口_嘗試處理動作_',
    '主管戰情看板_嘗試處理動作_',
    '每日自動化_嘗試處理動作_',
    'LINE每日戰情推播_嘗試處理動作_',
    'AI戰情資料源_嘗試處理動作_',
    '派班報工日結_嘗試處理動作_',
    '派班報工巡檢_嘗試處理動作_',
    '派班報工防呆_嘗試處理動作_',
    '今日派班報工_嘗試處理動作_',
    '排程需求池_嘗試處理動作_'
  ];

  for (var i = 0; i < handlers.length; i++) {
    var r = 主後端_嘗試呼叫模組_(handlers[i], p || {});
    if (r) return r;
  }

  if (action === '寫入排程需求池') return 寫入排程需求池(p || {});
  if (action === '初始化_10_排程需求池') return 初始化_10_排程需求池();
  if (action === '健康檢查_排程需求池') return { ok: true, 模組: '10_排程需求池', 時間: 排程需求池_現在_() };
  if (action === '健康檢查') return 健康檢查();
  if (action === '主檔檢查') return 主檔檢查();
  if (action === '初始化' || action === '初始化_智慧製造中央作戰指揮中心') return 初始化_智慧製造中央作戰指揮中心();
  if (action === '取得報工作業v2初始資料') return 取得報工作業v2初始資料();
  if (action === '寫入報工作業v2') return 寫入報工作業v2(p || {});
  if (action === '寫入不良紀錄v2') return 寫入不良紀錄v2(p || {});
  if (action === '手動重刷_主檔照片' && typeof 手動重刷_主檔照片 === 'function') return 手動重刷_主檔照片();
  if (action === '取得戰情' || action === '戰情') return 取得戰情();
  if (action === '取得AI摘要' || action === 'AI摘要') return 取得AI摘要();
  if (action === '指令') return 取得LINE指令說明_();

  return {
    success: false,
    成功: false,
    message: '未知動作：' + action,
    訊息: '未知動作：' + action,
    error: 'UNKNOWN_ACTION',
    可用動作: [
      '健康檢查','主檔檢查','初始化_智慧製造中央作戰指揮中心',
      '取得報工作業v2初始資料','寫入報工作業v2','寫入不良紀錄v2',
      '取得戰情','戰情','取得AI摘要','AI摘要','指令',
      '初始化_10_排程需求池','健康檢查_排程需求池','寫入排程需求池',
      '取得今日派班作業','寫入今日派班報工','取得主管戰情看板','取得主管戰情入口'
    ]
  };
}

function 主程式_安全輸出JSON_(obj) {
  if (typeof 排程需求池_輸出JSON_ === 'function') return 排程需求池_輸出JSON_(obj);
  if (typeof 輸出JSON_ === 'function') return 輸出JSON_(obj);
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function 主後端_嘗試呼叫模組_(functionName, payload) {
  try {
    var fn = null;
    try { fn = globalThis && globalThis[functionName]; } catch (err1) {}
    if (typeof fn !== 'function') {
      try { fn = this && this[functionName]; } catch (err2) {}
    }
    if (typeof fn !== 'function') return null;
    return fn(payload || {});
  } catch (err) {
    return {
      ok: false,
      success: false,
      error: String(err && err.message ? err.message : err),
      模組函數: functionName
    };
  }
}

function 主後端_LINE日期快選補救處理_(payload) {
  var events = Array.isArray(payload && payload.events) ? payload.events : [];
  var handled = 0;
  var failed = 0;

  for (var i = 0; i < events.length; i++) {
    var ev = events[i] || {};
    try {
      if (!ev.replyToken || !ev.message || ev.message.type !== 'text') continue;
      var replyText = LINE主管戰情日期快選_建立回覆_(ev.message.text);
      if (!replyText) continue;

      if (typeof LINE主管戰情直連_送出回覆_ === 'function') {
        LINE主管戰情直連_送出回覆_(ev.replyToken, replyText);
      } else {
        回覆LINE_(ev.replyToken, replyText);
      }
      handled++;
    } catch (err) {
      failed++;
    }
  }

  return {
    ok: true,
    handled: handled,
    failed: failed,
    已處理: handled > 0,
    message: handled > 0 ? '已回覆主管戰情日期快選指令' : '沒有日期快選指令'
  };
}

function 取得LINEToken_() {
  var token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (token) return token;

  try {
    if (系統設定 && 系統設定.LINE_CHANNEL_ACCESS_TOKEN) {
      return String(系統設定.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
    }
  } catch (err) {}

  return '';
}

function 回覆LINE_(replyToken, text) {
  const token = 文字_(取得LINEToken_());
  if (!token || !replyToken) return;

  var endpoint = 'https://' + 'api.line.me' + '/v2/bot/message/reply';
  UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: ['Bearer', token].join(' ') },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: String(text).slice(0, 4900) }]
    }),
    muteHttpExceptions: true
  });
}

function 產生報工入口LINE_() {
  var url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (err) {}
  return '📝 報工作業V2入口\n' + (url ? url + '?page=07_報工作業V2' : '請使用 Web App URL?page=07_報工作業V2');
}

function 測試_主後端入口整理_TOKEN檢查() {
  return {
    ok: !!取得LINEToken_(),
    訊息: 取得LINEToken_() ? '已取得 LINE_CHANNEL_ACCESS_TOKEN' : '缺少 LINE_CHANNEL_ACCESS_TOKEN',
    時間: new Date()
  };
}
