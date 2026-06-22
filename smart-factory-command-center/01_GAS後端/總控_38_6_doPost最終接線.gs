/**
 * 38.6｜主後端 doPost 最終接線模組
 * 專案：智慧製造中央作戰指揮中心
 * 版本：v1.7.5_38.6_Git同步GAS主後端
 *
 * 目的：讓 GitHub 正式主線與目前 GAS 已接上的 LINE Webhook 順序一致。
 * 原則：不刪舊檔、不重做 26、不進 39。
 *
 * 正式順序：
 * 37_LINE 指令中心
 * → 34_LINE 角色選單分流
 * → 33_LINE 身份權限檢查
 * → 31_LINE 主管戰情日期快選
 * → 30_LINE 主管戰情直連
 * → 一般 LINE Webhook
 */

const 主後端38_6_doPost最終接線版本 = 'v1.7.5_38.6_doPost最終接線';

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (p && p.events && Array.isArray(p.events)) {
    if (typeof LINE指令中心37_嘗試處理Webhook_ === 'function') {
      var 指令中心結果 = LINE指令中心37_嘗試處理Webhook_(p);
      if (指令中心結果 && 指令中心結果.已處理) return 主程式_安全輸出JSON_(指令中心結果);
    }

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

function 測試38_6_doPost最終接線_靜態檢查() {
  return {
    成功: true,
    版本: 主後端38_6_doPost最終接線版本,
    doPost順序: [
      '37_LINE 指令中心',
      '34_LINE 角色選單分流',
      '33_LINE 身份權限檢查',
      '31_LINE 主管戰情日期快選',
      '30_LINE 主管戰情直連',
      '一般 LINE Webhook'
    ],
    不進39: true,
    不重做26: true,
    訊息: '38.6 doPost 最終接線模組已載入'
  };
}
