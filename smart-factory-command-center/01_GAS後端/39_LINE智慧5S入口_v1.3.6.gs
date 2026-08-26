/**
 * 化新精密｜39_LINE 智慧5S入口 v1.3.6
 *
 * 文字指令：智慧5S / 5S / 智慧5S入口 / 5S入口 / 5S巡檢
 * 回覆：LINE Flex「開啟智慧5S」按鈕。
 * PWA 網址及版本從 5S_系統參數動態讀取，避免 LINE、Rich Menu 與 PWA 版本分流。
 */
var LINE智慧5S入口39_版本_ = 'v1.3.6';
var LINE智慧5S入口39_試算表ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var LINE智慧5S入口39_正式入口_ = 'https://qhero70.github.io/smart-factory-worker-app/5s/';
var LINE智慧5S入口39_版本備援_ = '1360';

function LINE智慧5S入口39_嘗試處理Webhook_(內容) {
  var 事件 = 內容 && Array.isArray(內容.events) ? 內容.events : [];
  if (!事件.length) return null;
  var 已處理 = 0;
  var 待後續 = [];
  var 結果 = [];

  事件.forEach(function (項目) {
    if (!項目 || 項目.type !== 'message' || !項目.message || 項目.message.type !== 'text') {
      待後續.push(項目);
      return;
    }
    var 指令 = LINE智慧5S入口39_正規化_(項目.message.text);
    if (!LINE智慧5S入口39_是否入口指令_(指令)) {
      待後續.push(項目);
      return;
    }
    try {
      var 網址 = LINE智慧5S入口39_取得網址_('首頁');
      LINE智慧5S入口39_回覆入口_(項目.replyToken, 網址);
      已處理++;
      結果.push({ 成功: true, 指令: 指令, PWA: 網址 });
    } catch (錯誤) {
      已處理++;
      結果.push({ 成功: false, 指令: 指令, 錯誤: String(錯誤 && 錯誤.message ? 錯誤.message : 錯誤) });
      try { LINE智慧5S入口39_回覆文字_(項目.replyToken, '智慧5S入口暫時無法開啟，請稍後再試。'); } catch (_) {}
    }
  });

  if (!已處理) return null;
  內容.events = 待後續;
  return {
    ok: true,
    已處理: 待後續.length === 0,
    已部分處理: 待後續.length > 0,
    處理筆數: 已處理,
    待後續路由筆數: 待後續.length,
    模組: '39_LINE智慧5S入口',
    版本: LINE智慧5S入口39_版本_,
    結果: 結果
  };
}

function LINE智慧5S入口39_是否入口指令_(文字) {
  var 指令 = LINE智慧5S入口39_正規化_(文字).toLowerCase().replace(/\s+/g, '');
  return /^(智慧5s|5s|智慧5s入口|5s入口|5s巡檢|開啟智慧5s|開啟5s)$/.test(指令);
}

function LINE智慧5S入口39_取得系統參數_() {
  var 結果 = {};
  try {
    var 資料庫 = SpreadsheetApp.openById(LINE智慧5S入口39_試算表ID_);
    var 分頁 = 資料庫.getSheetByName('5S_系統參數');
    if (!分頁 || 分頁.getLastRow() < 2) return 結果;
    var 資料 = 分頁.getDataRange().getDisplayValues();
    var 欄位 = 資料[0].map(function (值) { return String(值 || '').trim(); });
    var 鍵欄 = 欄位.indexOf('參數鍵');
    var 值欄 = 欄位.indexOf('參數值');
    if (鍵欄 < 0 || 值欄 < 0) return 結果;
    資料.slice(1).forEach(function (列) {
      var 鍵 = String(列[鍵欄] == null ? '' : 列[鍵欄]).trim();
      if (鍵) 結果[鍵] = String(列[值欄] == null ? '' : 列[值欄]).trim();
    });
  } catch (錯誤) {
    console.warn('39_LINE智慧5S入口讀參數失敗：' + 錯誤);
  }
  return 結果;
}

function LINE智慧5S入口39_取得網址_(頁面) {
  var 參數 = LINE智慧5S入口39_取得系統參數_();
  var 屬性 = PropertiesService.getScriptProperties();
  var 基底 = String(參數['PWA正式入口網址'] || 屬性.getProperty('智慧5S_PWA網址') || LINE智慧5S入口39_正式入口_).trim();
  var 版本 = String(參數['PWA入口版本'] || LINE智慧5S入口39_版本備援_).replace(/\D/g, '') || LINE智慧5S入口39_版本備援_;
  基底 = 基底.replace(/([?&])v=\d+/g, '$1').replace(/([?&])頁面=[^&]*/g, '$1').replace(/([?&])來源=[^&]*/g, '$1');
  基底 = 基底.replace(/\?&/g, '?').replace(/&&+/g, '&').replace(/[?&]+$/, '');
  var 網址 = 基底 + (基底.indexOf('?') >= 0 ? '&' : '?') + '來源=LINEBOT&v=' + 版本;
  if (頁面 && 頁面 !== '首頁') 網址 += '&頁面=' + encodeURIComponent(頁面);
  return 網址;
}

function LINE智慧5S入口39_回覆入口_(replyToken, 網址) {
  var 權杖 = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!權杖) throw new Error('缺少 LINE_CHANNEL_ACCESS_TOKEN');
  var flex = {
    type: 'flex',
    altText: '製一｜智慧5S入口',
    contents: {
      type: 'bubble', size: 'kilo',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '🧹 製一｜智慧5S', weight: 'bold', size: 'xl', color: '#176B47' },
          { type: 'text', text: '巡檢・機台履歷・改善・紅牌・可視化標準', wrap: true, size: 'sm', color: '#5F6F66' },
          { type: 'box', layout: 'vertical', margin: 'md', contents: [{ type: 'button', style: 'primary', height: 'sm', color: '#176B47', action: { type: 'uri', label: '開啟智慧5S', uri: 網址 } }] }
        ]
      },
      footer: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '正式版 v1.3.6／1360・中央參數同步', size: 'xxs', color: '#8A9690', align: 'center' }] }
    }
  };
  var 回應 = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + 權杖 },
    payload: JSON.stringify({ replyToken: replyToken, messages: [flex] }), muteHttpExceptions: true
  });
  var 狀態碼 = 回應.getResponseCode();
  if (狀態碼 < 200 || 狀態碼 >= 300) throw new Error('LINE Reply API HTTP ' + 狀態碼 + '：' + 回應.getContentText());
}

function LINE智慧5S入口39_回覆文字_(replyToken, 文字) {
  var 權杖 = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!權杖) return;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + 權杖 },
    payload: JSON.stringify({ replyToken: replyToken, messages: [{ type: 'text', text: String(文字).slice(0, 4900) }] }), muteHttpExceptions: true
  });
}

function LINE智慧5S入口39_健康檢查() {
  return { ok: true, 模組: '39_LINE智慧5S入口', 版本: LINE智慧5S入口39_版本_, PWA: LINE智慧5S入口39_取得網址_('首頁') };
}

function LINE智慧5S入口39_正規化_(值) {
  return String(值 == null ? '' : 值).replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim();
}

function 測試39_LINE智慧5S入口_靜態規格() {
  var 指令 = ['智慧5S', '5S', '智慧5S入口', '5S巡檢'];
  var 網址 = LINE智慧5S入口39_取得網址_('首頁');
  return {
    成功: 指令.every(LINE智慧5S入口39_是否入口指令_) && /[?&]v=1360(?:&|$)/.test(網址),
    版本: LINE智慧5S入口39_版本_,
    指令: 指令,
    PWA: 網址
  };
}
