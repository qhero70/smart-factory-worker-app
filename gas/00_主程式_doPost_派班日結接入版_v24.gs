/**
 * 00_主程式_doPost_派班日結接入版_v24
 * 專案：製造部智慧製造應用總部
 * 用途：接入 24_派班報工每日結算。
 * 注意：Apps Script 專案內只保留一個 doPost。請用此檔三個函數替換主後端同名函數。
 */

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (typeof 派班報工日結_嘗試處理動作_ === 'function') {
    var r24 = 派班報工日結_嘗試處理動作_(p);
    if (r24) return 主程式_安全輸出JSON_(r24);
  }

  if (typeof 派班報工巡檢_嘗試處理動作_ === 'function') {
    var r23 = 派班報工巡檢_嘗試處理動作_(p);
    if (r23) return 主程式_安全輸出JSON_(r23);
  }

  if (typeof 派班報工防呆_嘗試處理動作_ === 'function') {
    var r22 = 派班報工防呆_嘗試處理動作_(p);
    if (r22) return 主程式_安全輸出JSON_(r22);
  }

  if (typeof 今日派班報工_嘗試處理動作_ === 'function') {
    var r21 = 今日派班報工_嘗試處理動作_(p);
    if (r21) return 主程式_安全輸出JSON_(r21);
  }

  if (typeof 排程需求池_嘗試處理動作_ === 'function') {
    var r10 = 排程需求池_嘗試處理動作_(p);
    if (r10) return 主程式_安全輸出JSON_(r10);
  }

  if (p && p.events && Array.isArray(p.events)) return 處理LINEWebhook_(p);
  return 主程式_安全輸出JSON_(處理API請求_(action || '健康檢查', p));
}

function 處理API請求_(action, p) {
  action = String(action || (p && (p.action || p['動作'])) || '').trim();

  if (typeof 派班報工日結_嘗試處理動作_ === 'function') {
    var r24 = 派班報工日結_嘗試處理動作_(p || {});
    if (r24) return r24;
  }

  if (typeof 派班報工巡檢_嘗試處理動作_ === 'function') {
    var r23 = 派班報工巡檢_嘗試處理動作_(p || {});
    if (r23) return r23;
  }

  if (typeof 今日派班報工_嘗試處理動作_ === 'function') {
    var r21 = 今日派班報工_嘗試處理動作_(p || {});
    if (r21) return r21;
  }

  if (typeof 派班報工防呆_嘗試處理動作_ === 'function') {
    var r22 = 派班報工防呆_嘗試處理動作_(p || {});
    if (r22) return r22;
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

  return {
    success: false,
    message: '未知動作：' + action,
    error: 'UNKNOWN_ACTION',
    data: { 可用動作: [
      '健康檢查','主檔檢查','取得報工作業v2初始資料','寫入報工作業v2','寫入不良紀錄v2',
      '寫入排程需求池','健康檢查_排程需求池','取得今日派班作業','寫入今日派班報工',
      '派班報工巡檢','派班報工巡檢修復','產生派班報工日結','取得派班報工日結'
    ] }
  };
}

function 主程式_安全輸出JSON_(obj) {
  if (typeof 排程需求池_輸出JSON_ === 'function') return 排程需求池_輸出JSON_(obj);
  if (typeof 輸出JSON_ === 'function') return 輸出JSON_(obj);
  return ContentService.createTextOutput(JSON.stringify(obj || {}, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
