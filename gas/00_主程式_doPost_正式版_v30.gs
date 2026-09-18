/**
 * 00_主程式_doPost_正式版_v30
 * 專案：製造部智慧製造應用總部
 * 版本：v30.2.2
 *
 * 正式入口整合順序：
 * 1. 31 LINE 主管戰情日期快選：今日戰情、昨日戰情、戰情 yyyy-MM-dd
 * 2. 30 LINE 主管戰情直連回覆：主管戰情、總部首頁、報工、功能
 * 3. 29 主管戰情入口
 * 4. 28 主管戰情看板 API
 * 5. 27 每日自動化排程
 * 6. 26 LINE每日戰情推播
 * 7. 25 AI戰情摘要資料源
 * 8. 24 派班報工每日結算
 * 9. 23 派班報工巡檢修復
 * 10. 22/21 派班報工與防呆
 * 11. 10 排程需求池
 */

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (p && p.events && Array.isArray(p.events)) {
    if (typeof LINE主管戰情日期快選_嘗試處理Webhook_ === 'function') {
      var 日期快選結果 = LINE主管戰情日期快選_嘗試處理Webhook_(p);
      if (日期快選結果 && 日期快選結果.已處理) return 主程式_安全輸出JSON_(日期快選結果);
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
    var fn = handlers[i];
    if (typeof this[fn] === 'function') {
      var r = this[fn](p);
      if (r) return 主程式_安全輸出JSON_(r);
    }
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
    var fn = handlers[i];
    if (typeof this[fn] === 'function') {
      var r = this[fn](p || {});
      if (r) return r;
    }
  }

  if (action === '寫入排程需求池') return 寫入排程需求池(p || {});
  if (action === '初始化_10_排程需求池') return 初始化_10_排程需求池();
  if (action === '健康檢查_排程需求池') return { ok: true, 模組: '10_排程需求池', 時間: 排程需求池_現在_() };
  if (action === '健康檢查') return 健康檢查();
  if (action === '主檔檢查') return 主檔檢查();
  if (action === '初始化_智慧製造中央作戰指揮中心') return 初始化_智慧製造中央作戰指揮中心();
  if (action === '取得報工作業v2初始資料') return 取得報工作業v2初始資料();
  if (action === '寫入報工作業v2') return 寫入報工作業v2(p || {});
  if (action === '寫入不良紀錄v2') return 寫入不良紀錄v2(p || {});
  if (action === '手動重刷_主檔照片' && typeof 手動重刷_主檔照片 === 'function') return 手動重刷_主檔照片();
  if (action === '取得戰情' || action === '戰情') return 取得戰情();
  if (action === '取得AI摘要' || action === 'AI摘要') return 取得AI摘要();

  return { success: false, message: '未知動作：' + action, error: 'UNKNOWN_ACTION' };
}

function 主程式_安全輸出JSON_(obj) {
  if (typeof 排程需求池_輸出JSON_ === 'function') return 排程需求池_輸出JSON_(obj);
  if (typeof 輸出JSON_ === 'function') return 輸出JSON_(obj);
  return ContentService.createTextOutput(JSON.stringify(obj || {}, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
