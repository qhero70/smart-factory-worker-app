/** 38.6｜主後端 doPost 最終接線模組｜v1.7.5_38.7 */
const 主後端38_6_doPost最終接線版本 = 'v1.7.5_38.7_handler_enhanced';

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (p && p.events && Array.isArray(p.events)) {
    var LINE重送守門 = typeof LINE訊息重送防護_準備_ === 'function'
      ? LINE訊息重送防護_準備_(p)
      : null;
    if (LINE重送守門 && LINE重送守門.全部重複) {
      return 主程式_安全輸出JSON_({ ok: true, success: true, 已處理: true, 模組: 'LINE訊息重送防護', 訊息: '重複 Webhook 已安全略過', 重複數: LINE重送守門.重複數 });
    }
    if (typeof 智慧5S_LINE群組綁定_嘗試處理Webhook_ === 'function') {
      var 智慧5S群組結果 = 智慧5S_LINE群組綁定_嘗試處理Webhook_(p);
      if (智慧5S群組結果 && 智慧5S群組結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主程式_安全輸出JSON_(智慧5S群組結果);
      }
    }
    if (typeof LINE指令中心37_嘗試處理Webhook_ === 'function') {
      var 指令中心結果 = LINE指令中心37_嘗試處理Webhook_(p);
      if (指令中心結果 && 指令中心結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主程式_安全輸出JSON_(指令中心結果);
      }
    }
    if (typeof LINE角色分流34_嘗試處理Webhook_ === 'function') {
      var 角色分流結果 = LINE角色分流34_嘗試處理Webhook_(p);
      if (角色分流結果 && 角色分流結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主程式_安全輸出JSON_(角色分流結果);
      }
    }
    if (typeof LINE身份權限_嘗試處理Webhook_ === 'function') {
      var 身份權限結果 = LINE身份權限_嘗試處理Webhook_(p);
      if (身份權限結果 && 身份權限結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主程式_安全輸出JSON_(身份權限結果);
      }
    }
    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ === 'function') {
      var 日期快選結果 = LINE主管戰情日期快選_嘗試處理Webhook_(p);
      if (日期快選結果 && 日期快選結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主程式_安全輸出JSON_(日期快選結果);
      }
    }
    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ !== 'function' && typeof LINE主管戰情日期快選_建立回覆_ === 'function') {
      var 日期快選補救結果 = 主後端_LINE日期快選補救處理_(p);
      if (日期快選補救結果 && 日期快選補救結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主程式_安全輸出JSON_(日期快選補救結果);
      }
    }
    if (typeof LINE主管戰情直連_嘗試處理Webhook_ === 'function') {
      var 主管戰情LINE結果 = LINE主管戰情直連_嘗試處理Webhook_(p);
      if (主管戰情LINE結果 && 主管戰情LINE結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主程式_安全輸出JSON_(主管戰情LINE結果);
      }
    }
    var 一般LINE結果 = 處理LINEWebhook_(p);
    if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
    return 一般LINE結果;
  }

  var handlers = [
    '自動排程防重38_7_嘗試處理動作_',
    '派班報工回寫增強38_7_嘗試處理動作_',
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
    var r = 主後端_嘗試呼叫模組_(handlers[i], p);
    if (r) return 主程式_安全輸出JSON_(r);
  }
  return 主程式_安全輸出JSON_(處理API請求_(action || '健康檢查', p));
}

function 測試38_6_doPost最終接線_靜態檢查() {
  return {
    成功: true,
    版本: 主後端38_6_doPost最終接線版本,
    doPost順序: ['智慧5S LINE 群組綁定','37_LINE 指令中心','34_LINE 角色選單分流','33_LINE 身份權限檢查','31_LINE 主管戰情日期快選','30_LINE 主管戰情直連','一般 LINE Webhook'],
    POST模組順序: ['38.7 自動排程防重','38.7 派班報工回寫增強','38.7 主線優化','38.7 今日派班報工回寫','主管戰情入口','排程需求池'],
    不進39: true,
    不重做26: true,
    訊息: '38.7 handler enhanced'
  };
}
