/**
 * doGet / doPost 整合中央資料庫替換段 v1.1
 * 化新精密｜智慧5S iPhone JSONP 相容修復版
 *
 * 修復重點：
 * 1. 所有 doGet API 回應統一經過 JSONP 相容層。
 * 2. 若網址帶 callback，會把既有 TextOutput / JSON 轉成 callback({...});。
 * 3. callback 僅允許安全的 JavaScript 函數名稱，避免任意程式碼注入。
 * 4. 沒有 callback 時完全維持原本 JSON / HTML 行為。
 * 5. 不影響 LINE Webhook、報工、中央資料庫、38.7 主線。
 */

function 主後端_取得GET參數_(e) {
  e = e || { parameter: {} };
  return e.parameter || {};
}

function 主後端_驗證JSONP回呼名稱_(callbackName) {
  var 名稱 = String(callbackName || '').trim();
  if (!名稱) return '';
  return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(名稱) ? 名稱 : '';
}

function 主後端_輸出JSONP_(callbackName, content) {
  var 回呼名稱 = 主後端_驗證JSONP回呼名稱_(callbackName);
  if (!回呼名稱) {
    throw new Error('JSONP callback 名稱格式不合法');
  }

  var 內容文字 = '';

  if (content && typeof content.getContent === 'function') {
    內容文字 = String(content.getContent() || '').trim();
  } else if (typeof content === 'string') {
    內容文字 = String(content || '').trim();
  } else {
    內容文字 = JSON.stringify(content == null ? null : content);
  }

  if (!內容文字) 內容文字 = 'null';

  // 若原本不是 JSON，仍包成合法 JSON 字串，避免產生無效 JavaScript。
  try {
    JSON.parse(內容文字);
  } catch (錯誤) {
    內容文字 = JSON.stringify(內容文字);
  }

  return ContentService
    .createTextOutput(回呼名稱 + '(' + 內容文字 + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function 主後端_套用JSONP若需要_(e, output) {
  var p = 主後端_取得GET參數_(e);
  var callbackName = 主後端_驗證JSONP回呼名稱_(p.callback || p.jsonp || p.cb);
  if (!callbackName) return output;
  return 主後端_輸出JSONP_(callbackName, output);
}

function doGet(e) {
  e = e || { parameter: {} };
  var p = 主後端_取得GET參數_(e);
  var page = 文字_(p.page || p.頁面 || p.p);
  var action = 文字_(p.action || p.動作);

  // =========================================================
  // 中央資料庫 API 分流：必須放最前面
  // 支援 V2.6 PWA：status / 初始化 / 自檢 / schema
  // JSONP 要在最外層包裝，避免中央 API 回傳純 JSON 導致 iPhone script.onerror。
  // =========================================================
  if (typeof 中央資料庫API_嘗試處理GET_ === 'function') {
    var 中央資料庫結果 = 中央資料庫API_嘗試處理GET_(e);
    if (中央資料庫結果) {
      return 主後端_套用JSONP若需要_(e, 中央資料庫結果);
    }
  }

  var r = 報工作業V4_PWA_嘗試處理動作_(e);
  if (r) {
    return 主後端_套用JSONP若需要_(e, r);
  }

  // =========================================================
  // 38.7 主線直接路由
  // =========================================================
  if (action && typeof 主線38_7_直接路由_ === 'function') {
    var 主線38_7結果 = 主線38_7_直接路由_(p);
    if (主線38_7結果) {
      return 主後端_套用JSONP若需要_(e, 主程式_安全輸出JSON_(主線38_7結果));
    }
  }

  // HTML 頁面維持原本輸出，不做 JSONP。
  if (page) return 輸出HTML_(正規化頁面名稱_(page));

  if (action) {
    return 主後端_套用JSONP若需要_(e, 主程式_安全輸出JSON_(處理API請求_(action, p)));
  }

  return 主後端_套用JSONP若需要_(e, 主程式_安全輸出JSON_(健康檢查()));
}

function doPost(e) {
  // =========================================================
  // 中央資料庫 API 分流：必須放最前面
  // 支援 V2.6 PWA：寫入資料庫快照 / 初始化 / 自檢
  // 不影響原 LINE Webhook、報工、38.7 主線。
  // =========================================================
  if (typeof 中央資料庫API_嘗試處理POST_ === 'function') {
    var 中央資料庫結果 = 中央資料庫API_嘗試處理POST_(e);
    if (中央資料庫結果) return 中央資料庫結果;
  }

  var r = 報工作業V4_PWA_嘗試處理動作_(e);
  if (r) return r;

  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  // =========================================================
  // 38.7 主線直接路由
  // 必須放在 LINE 之前，避免掉到舊版 UNKNOWN_ACTION。
  // =========================================================
  if (typeof 主線38_7_直接路由_ === 'function') {
    var 主線38_7結果 = 主線38_7_直接路由_(p);
    if (主線38_7結果) {
      return 主程式_安全輸出JSON_(主線38_7結果);
    }
  }

  // =========================================================
  // LINE Bot Webhook
  // LINE payload 會帶 events，不走一般 PWA action。
  // =========================================================
  if (p && p.events && Array.isArray(p.events)) {

    if (typeof LINE身份權限33_前置同步Webhook_ === 'function') {
      LINE身份權限33_前置同步Webhook_(p);
    }

    if (typeof LINE指令中心37_嘗試處理Webhook_ === 'function') {
      var 指令中心37結果 = LINE指令中心37_嘗試處理Webhook_(p);
      if (指令中心37結果 && 指令中心37結果.已處理) {
        return 主程式_安全輸出JSON_(指令中心37結果);
      }
    }

    if (typeof LINE角色分流34_嘗試處理Webhook_ === 'function') {
      var 角色分流34結果 = LINE角色分流34_嘗試處理Webhook_(p);
      if (角色分流34結果 && 角色分流34結果.已處理) {
        return 主程式_安全輸出JSON_(角色分流34結果);
      }
    }

    if (typeof LINE身份權限_嘗試處理Webhook_ === 'function') {
      var 身份權限33結果 = LINE身份權限_嘗試處理Webhook_(p);
      if (身份權限33結果 && 身份權限33結果.已處理) {
        return 主程式_安全輸出JSON_(身份權限33結果);
      }
    }

    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ === 'function') {
      var 日期快選結果 = LINE主管戰情日期快選_嘗試處理Webhook_(p);
      if (日期快選結果 && 日期快選結果.已處理) {
        return 主程式_安全輸出JSON_(日期快選結果);
      }
    }

    if (
      typeof LINE主管戰情日期快選_嘗試處理Webhook_ !== 'function' &&
      typeof LINE主管戰情日期快選_建立回覆_ === 'function'
    ) {
      var 日期快選補救結果 = 主後端_LINE日期快選補救處理_(p);
      if (日期快選補救結果 && 日期快選補救結果.已處理) {
        return 主程式_安全輸出JSON_(日期快選補救結果);
      }
    }

    if (typeof LINE主管戰情直連_嘗試處理Webhook_ === 'function') {
      var 主管戰情LINE結果 = LINE主管戰情直連_嘗試處理Webhook_(p);
      if (主管戰情LINE結果 && 主管戰情LINE結果.已處理) {
        return 主程式_安全輸出JSON_(主管戰情LINE結果);
      }
    }

    return 處理LINEWebhook_(p);
  }

  // =========================================================
  // 一般 PWA / API action handler
  // 原有模組保留，38.7 末端總閘門也保留。
  // =========================================================
  var handlers = [
    '自動排程防重38_7_嘗試處理動作_',
    '派班報工回寫增強38_7_嘗試處理動作_',
    '清洗錯誤追蹤38_7_嘗試處理動作_',
    '主線優化38_7_嘗試處理動作_',
    '今日派班報工回寫38_7_嘗試處理動作_',

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
    var handlerResult = 主後端_嘗試呼叫模組_(handlers[i], p);
    if (handlerResult) {
      return 主程式_安全輸出JSON_(handlerResult);
    }
  }

  // =========================================================
  // 最後 fallback：舊版 API map
  // =========================================================
  return 主程式_安全輸出JSON_(處理API請求_(action || '健康檢查', p));
}
