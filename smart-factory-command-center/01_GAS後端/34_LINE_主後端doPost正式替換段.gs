/**
 * 34_LINE｜主後端 doPost(e) 正式替換段
 * 用途：複製本段替換「智慧製造中央作戰指揮中心.gs」原本 doPost(e)。
 * 版本：v1.7.1_34_LINE角色分流接線
 */
function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (p && p.events && Array.isArray(p.events)) {
    if (typeof LINE角色分流34_嘗試處理Webhook_ === 'function') {
      var 角色分流結果 = LINE角色分流34_嘗試處理Webhook_(p);
      if (角色分流結果 && 角色分流結果.已處理) return 主程式_安全輸出JSON_(角色分流結果);
    }

    if (typeof LINE身份權限_嘗試處理Webhook_ === 'function') {
      var 身份權限結果 = LINE身份權限_嘗試處理Webhook_(p);
      if (身份權限結果 && 身份權限結果.已處理) return 主程式_安全輸出JSON_(身份權限結果);
    }

    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ === 'function') {
      var 日期快選結果 = LINE主管戰情日期快選_嘗試處理Webhook_(p);
      if (日期快選結果 && 日期快選結果.已處理) return 主程式_安全輸出JSON_(日期快選結果);
    }

    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ !== 'function' && typeof LINE主管戰情日期快選_建立回覆_ === 'function') {
      var 日期快選補救結果 = 主後端_LINE日期快選補救處理_(p);
      if (日期快選補救結果 && 日期快選補救結果.已處理) return 主程式_安全輸出JSON_(日期快選補救結果);
    }

    if (typeof LINE主管戰情直連_嘗試處理Webhook_ === 'function') {
      var 主管戰情LINE結果 = LINE主管戰情直連_嘗試處理Webhook_(p);
      if (主管戰情LINE結果 && 主管戰情LINE結果.已處理) return 主程式_安全輸出JSON_(主管戰情LINE結果);
    }

    return 處理LINEWebhook_(p);
  }

  var handlers = ['主管戰情入口_嘗試處理動作_', '主管戰情看板_嘗試處理動作_', '每日自動化_嘗試處理動作_', 'LINE每日戰情推播_嘗試處理動作_', 'AI戰情資料源_嘗試處理動作_', '派班報工日結_嘗試處理動作_', '派班報工巡檢_嘗試處理動作_', '派班報工防呆_嘗試處理動作_', '今日派班報工_嘗試處理動作_', '排程需求池_嘗試處理動作_'];
  for (var i = 0; i < handlers.length; i++) {
    var r = 主後端_嘗試呼叫模組_(handlers[i], p);
    if (r) return 主程式_安全輸出JSON_(r);
  }
  return 主程式_安全輸出JSON_(處理API請求_(action || '健康檢查', p));
}
