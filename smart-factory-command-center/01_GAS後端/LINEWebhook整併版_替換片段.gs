/**
 * LINE Webhook 整併版｜v2.0.0
 * 用途：替換主後端「智慧製造中央作戰指揮中心.gs」中的 LINE Webhook 相關函數。
 * 前提：同一個 Apps Script 專案需同時存在：
 * 1. 智慧製造中央作戰指揮中心.gs
 * 2. LINEBot_FlexMessage主選單.gs
 */

function 處理LINEWebhook_(內容) {
  const events = 內容.events || [];
  events.forEach(ev => {
    try {
      if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
        const 文字 = ev.message.text.trim();
        const 訊息陣列 = 產生LINE回覆訊息_(文字);
        回覆LINE訊息陣列_(ev.replyToken, 訊息陣列);
      }
    } catch (錯誤) {
      try {
        回覆LINE訊息陣列_(ev.replyToken, [{ type: 'text', text: '系統回覆發生錯誤：' + 錯誤.message }]);
      } catch (e) {}
    }
  });
  return ContentService.createTextOutput('OK');
}

/**
 * 保留相容：若舊程式仍呼叫 回覆LINE_(replyToken, text)，會轉成文字訊息陣列。
 */
function 回覆LINE_(replyToken, text) {
  return 回覆LINE訊息陣列_(replyToken, [{ type: 'text', text: String(text || '') }]);
}

/**
 * 保留相容：若舊程式仍呼叫 產生LINE回覆_(文字)，會回傳純文字。
 * 但正式 Flex 主選單請以 產生LINE回覆訊息_(文字) 為主。
 */
function 產生LINE回覆_(文字) {
  const messages = 產生LINE回覆訊息_(文字);
  const first = messages && messages[0];
  if (!first) return '無回覆';
  if (first.type === 'text') return first.text;
  return '已開啟智慧製造主選單';
}

function 測試_LINEWebhook選單整併版() {
  const 假資料 = {
    events: [{
      type: 'message',
      replyToken: 'TEST_REPLY_TOKEN',
      message: { type: 'text', text: '選單' }
    }]
  };
  const 訊息陣列 = 產生LINE回覆訊息_(假資料.events[0].message.text);
  return JSON.stringify(訊息陣列, null, 2);
}
