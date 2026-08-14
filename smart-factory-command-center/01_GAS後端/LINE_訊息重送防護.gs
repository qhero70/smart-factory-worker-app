/**
 * 化新精密｜LINE 訊息重送防護
 * 版本：v1.8.1
 *
 * 用途：
 * 1. 以 webhookEventId／訊息 ID 辨識 LINE 重送事件。
 * 2. 已成功處理的事件保留六小時，避免再次使用失效 replyToken。
 * 3. 處理發生例外時不寫入完成標記，LINE 仍可再次傳送。
 */

var LINE訊息重送防護_版本 = 'v1.8.1_LINE訊息重送防護';
var LINE訊息重送防護_快取秒數 = 21600;

function LINE訊息重送防護_準備_(內容) {
  var 原始事件 = Array.isArray(內容 && 內容.events) ? 內容.events : [];
  if (!原始事件.length) return null;

  var 快取 = CacheService.getScriptCache();
  var 保留事件 = [];
  var 待完成鍵 = [];
  var 重複數 = 0;

  原始事件.forEach(function (事件, 索引) {
    var 事件鍵 = LINE訊息重送防護_事件鍵_(事件, 索引);
    if (!事件鍵) {
      保留事件.push(事件);
      return;
    }
    if (快取.get(事件鍵)) {
      重複數++;
      return;
    }
    保留事件.push(事件);
    待完成鍵.push(事件鍵);
  });

  內容.events = 保留事件;
  return {
    版本: LINE訊息重送防護_版本,
    原始數: 原始事件.length,
    保留數: 保留事件.length,
    重複數: 重複數,
    全部重複: 原始事件.length > 0 && 保留事件.length === 0,
    待完成鍵: 待完成鍵
  };
}

function LINE訊息重送防護_完成_(守門結果) {
  if (!守門結果 || !Array.isArray(守門結果.待完成鍵) || !守門結果.待完成鍵.length) return;
  var 快取 = CacheService.getScriptCache();
  var 寫入資料 = {};
  守門結果.待完成鍵.forEach(function (鍵) { 寫入資料[鍵] = '已完成'; });
  快取.putAll(寫入資料, LINE訊息重送防護_快取秒數);
}

function LINE訊息重送防護_事件鍵_(事件, 索引) {
  var 原始ID = String(
    (事件 && 事件.webhookEventId) ||
    (事件 && 事件.message && 事件.message.id) ||
    (事件 && 事件.replyToken) ||
    ''
  ).trim();
  if (!原始ID) return '';

  var 摘要 = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    原始ID,
    Utilities.Charset.UTF_8
  );
  return 'LINE事件_' + Utilities.base64EncodeWebSafe(摘要).replace(/=+$/g, '').slice(0, 40);
}

function 測試LINE訊息重送防護_本機規格() {
  var 模擬事件 = {
    events: [{
      webhookEventId: '測試事件_' + new Date().getTime(),
      replyToken: '測試回覆權杖',
      type: 'message',
      message: { id: '測試訊息', type: 'text', text: '權限檢查' }
    }]
  };
  var 第一次 = LINE訊息重送防護_準備_(模擬事件);
  LINE訊息重送防護_完成_(第一次);
  var 第二份 = { events: [{ webhookEventId: 模擬事件.events[0].webhookEventId, type: 'message', message: { id: '測試訊息', type: 'text', text: '權限檢查' } }] };
  var 第二次 = LINE訊息重送防護_準備_(第二份);
  return {
    成功: !!(第一次 && 第一次.保留數 === 1 && 第二次 && 第二次.全部重複),
    版本: LINE訊息重送防護_版本,
    第一次: 第一次,
    第二次: 第二次
  };
}
