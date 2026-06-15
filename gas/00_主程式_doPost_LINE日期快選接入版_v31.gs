/**
 * 00_主程式_doPost_LINE日期快選接入版_v31
 * 用途：接入 31_LINE主管戰情日期快選正式模組。
 * 注意：Apps Script 專案內只保留一個 doPost。
 */

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (p && p.events && Array.isArray(p.events)) {
    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ === 'function') {
      var r31 = LINE主管戰情日期快選_嘗試處理Webhook_(p);
      if (r31 && r31.已處理) return 主程式_安全輸出JSON_(r31);
    }
    if (typeof LINE主管戰情直連_嘗試處理Webhook_ === 'function') {
      var r30 = LINE主管戰情直連_嘗試處理Webhook_(p);
      if (r30 && r30.已處理) return 主程式_安全輸出JSON_(r30);
    }
    return 處理LINEWebhook_(p);
  }

  if (typeof 主管戰情入口_嘗試處理動作_ === 'function') {
    var r29 = 主管戰情入口_嘗試處理動作_(p);
    if (r29) return 主程式_安全輸出JSON_(r29);
  }
  if (typeof 主管戰情看板_嘗試處理動作_ === 'function') {
    var r28 = 主管戰情看板_嘗試處理動作_(p);
    if (r28) return 主程式_安全輸出JSON_(r28);
  }
  if (typeof 每日自動化_嘗試處理動作_ === 'function') {
    var r27 = 每日自動化_嘗試處理動作_(p);
    if (r27) return 主程式_安全輸出JSON_(r27);
  }
  if (typeof LINE每日戰情推播_嘗試處理動作_ === 'function') {
    var r26 = LINE每日戰情推播_嘗試處理動作_(p);
    if (r26) return 主程式_安全輸出JSON_(r26);
  }
  if (typeof AI戰情資料源_嘗試處理動作_ === 'function') {
    var r25 = AI戰情資料源_嘗試處理動作_(p);
    if (r25) return 主程式_安全輸出JSON_(r25);
  }
  if (typeof 派班報工日結_嘗試處理動作_ === 'function') {
    var r24 = 派班報工日結_嘗試處理動作_(p);
    if (r24) return 主程式_安全輸出JSON_(r24);
  }
  if (typeof 派班報工巡檢_嘗試處理動作_ === 'function') {
    var r23 = 派班報工巡檢_嘗試處理動作_(p);
    if (r23) return 主程式_安全輸出JSON_(r23);
  }
  if (typeof 今日派班報工_嘗試處理動作_ === 'function') {
    var r21 = 今日派班報工_嘗試處理動作_(p);
    if (r21) return 主程式_安全輸出JSON_(r21);
  }

  return 主程式_安全輸出JSON_(處理API請求_(action || '健康檢查', p));
}

function 主程式_安全輸出JSON_(obj) {
  if (typeof 排程需求池_輸出JSON_ === 'function') return 排程需求池_輸出JSON_(obj);
  if (typeof 輸出JSON_ === 'function') return 輸出JSON_(obj);
  return ContentService.createTextOutput(JSON.stringify(obj || {}, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
