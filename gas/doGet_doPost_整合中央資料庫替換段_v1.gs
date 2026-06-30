/**
 * doGet / doPost 整合中央資料庫替換段 v1
 * 對應你目前上傳的「智慧製造中央作戰指揮中心｜正式主後端 v1.7.5」
 *
 * 使用方式：
 * 1. 保留原本主後端其他所有函數。
 * 2. 只把原本 function doGet(e) 與 function doPost(e) 兩段替換成下面這兩段。
 * 3. 另新增中央資料庫API_命名空間版_v1.gs。
 * 4. 重新部署 Web App 新版本。
 */

function doGet(e) {
  // =========================================================
  // 中央資料庫 API 分流：必須放最前面
  // 支援 V2.6 PWA：status / 初始化 / 自檢 / schema
  // 不影響原 LINE、報工、38.7 主線。
  // =========================================================
  if (typeof 中央資料庫API_嘗試處理GET_ === 'function') {
    var 中央資料庫結果 = 中央資料庫API_嘗試處理GET_(e);
    if (中央資料庫結果) return 中央資料庫結果;
  }

  var r = 報工作業V4_PWA_嘗試處理動作_(e);
  if (r) return r;

  e = e || { parameter: {} };
  const p = e.parameter || {};
  const page = 文字_(p.page || p.頁面 || p.p);
  const action = 文字_(p.action || p.動作);

  // =========================================================
  // 38.7 主線直接路由
  // =========================================================
  if (action && typeof 主線38_7_直接路由_ === 'function') {
    var 主線38_7結果 = 主線38_7_直接路由_(p);
    if (主線38_7結果) {
      return 主程式_安全輸出JSON_(主線38_7結果);
    }
  }

  if (page) return 輸出HTML_(正規化頁面名稱_(page));

  if (action) return 主程式_安全輸出JSON_(處理API請求_(action, p));

  return 主程式_安全輸出JSON_(健康檢查());
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
