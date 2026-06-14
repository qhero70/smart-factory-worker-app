/**
 * 00_主程式_doPost_派班巡檢接入版_v23
 * 用途：接入 23_派班報工巡檢修復。
 * 注意：Apps Script 專案內只保留一個 doPost。請用此檔三個函數替換主後端同名函數。
 */

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (typeof 派班報工巡檢_嘗試處理動作_ === 'function') {
    var r0 = 派班報工巡檢_嘗試處理動作_(p);
    if (r0) return 主程式_安全輸出JSON_(r0);
  }

  if (typeof 派班報工防呆_嘗試處理動作_ === 'function') {
    var r1 = 派班報工防呆_嘗試處理動作_(p);
    if (r1) return 主程式_安全輸出JSON_(r1);
  }

  if (typeof 今日派班報工_嘗試處理動作_ === 'function') {
    var r2 = 今日派班報工_嘗試處理動作_(p);
    if (r2) return 主程式_安全輸出JSON_(r2);
  }

  if (typeof 排程需求池_嘗試處理動作_ === 'function') {
    var r3 = 排程需求池_嘗試處理動作_(p);
    if (r3) return 主程式_安全輸出JSON_(r3);
  }

  if (p && p.events && Array.isArray(p.events)) return 處理LINEWebhook_(p);
  return 主程式_安全輸出JSON_(處理API請求_(action || '健康檢查', p));
}

function 處理API請求_(action, p) {
  action = String(action || (p && (p.action || p['動作'])) || '').trim();

  if (typeof 派班報工巡檢_嘗試處理動作_ === 'function') {
    var r0 = 派班報工巡檢_嘗試處理動作_(p || {});
    if (r0) return r0;
  }

  if (typeof 今日派班報工_嘗試處理動作_ === 'function') {
    var r2 = 今日派班報工_嘗試處理動作_(p || {});
    if (r2) return r2;
  }

  if (typeof 派班報工防呆_嘗試處理動作_ === 'function') {
    var r1 = 派班報工防呆_嘗試處理動作_(p || {});
    if (r1) return r1;
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
