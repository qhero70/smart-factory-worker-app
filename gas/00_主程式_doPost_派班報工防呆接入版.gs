/**
 * 00_主程式_doPost_派班報工防呆接入版
 * 專案：製造部智慧製造應用總部
 *
 * 用途：
 * 將 22_派班報工防重複超量保護、21_今日派班報工、10_排程需求池
 * 正式接入現有 Web App doPost 分流。
 *
 * 貼法：
 * 1. 到「智慧製造中央作戰指揮中心｜正式主後端.gs」。
 * 2. 以本檔的 doPost(e)、處理API請求_(action, p)、主程式_安全輸出JSON_(obj)
 *    取代原本同名函數。
 * 3. 不要新增第二個 doPost。
 */

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (typeof 派班報工防呆_嘗試處理動作_ === 'function') {
    var 派班防呆結果 = 派班報工防呆_嘗試處理動作_(p);
    if (派班防呆結果) return 主程式_安全輸出JSON_(派班防呆結果);
  }

  if (typeof 今日派班報工_嘗試處理動作_ === 'function') {
    var 派班報工結果 = 今日派班報工_嘗試處理動作_(p);
    if (派班報工結果) return 主程式_安全輸出JSON_(派班報工結果);
  }

  if (typeof 排程需求池_嘗試處理動作_ === 'function') {
    var 排程結果 = 排程需求池_嘗試處理動作_(p);
    if (排程結果) return 主程式_安全輸出JSON_(排程結果);
  }

  if (action === '寫入排程需求池') return 主程式_安全輸出JSON_(寫入排程需求池(p));
  if (action === '初始化_10_排程需求池') return 主程式_安全輸出JSON_(初始化_10_排程需求池());
  if (action === '健康檢查_排程需求池') return 主程式_安全輸出JSON_({ ok: true, 模組: '10_排程需求池', 時間: 排程需求池_現在_() });

  if (p && p.events && Array.isArray(p.events)) return 處理LINEWebhook_(p);

  return 主程式_安全輸出JSON_(處理API請求_(action || '健康檢查', p));
}

function 處理API請求_(action, p) {
  action = String(action || (p && (p.action || p['動作'])) || '').trim();

  if (typeof 今日派班報工_嘗試處理動作_ === 'function') {
    var 派班報工結果 = 今日派班報工_嘗試處理動作_(p || {});
    if (派班報工結果) return 派班報工結果;
  }

  if (typeof 派班報工防呆_嘗試處理動作_ === 'function') {
    var 派班防呆結果 = 派班報工防呆_嘗試處理動作_(p || {});
    if (派班防呆結果) return 派班防呆結果;
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

  if (action === '手動重刷_主檔照片') {
    if (typeof 手動重刷_主檔照片 === 'function') return 手動重刷_主檔照片();
    return { success: false, message: '找不到函數：手動重刷_主檔照片' };
  }

  if (action === '取得戰情' || action === '戰情') return 取得戰情();
  if (action === '取得AI摘要' || action === 'AI摘要') return 取得AI摘要();

  return {
    success: false,
    data: {
      可用動作: [
        '健康檢查','主檔檢查','初始化_智慧製造中央作戰指揮中心',
        '取得報工作業v2初始資料','寫入報工作業v2','寫入不良紀錄v2',
        '手動重刷_主檔照片','取得戰情','戰情','取得AI摘要','AI摘要',
        '初始化_10_排程需求池','健康檢查_排程需求池','寫入排程需求池',
        '派班報工健康檢查','初始化_今日派班報工','取得今日派班作業','寫入今日派班報工','派班報工防呆健康檢查'
      ]
    },
    message: '未知動作：' + action,
    error: 'UNKNOWN_ACTION'
  };
}

function 主程式_安全輸出JSON_(obj) {
  if (typeof 排程需求池_輸出JSON_ === 'function') return 排程需求池_輸出JSON_(obj);
  if (typeof 輸出JSON_ === 'function') return 輸出JSON_(obj);
  return ContentService.createTextOutput(JSON.stringify(obj || {}, null, 2)).setMimeType(ContentService.MimeType.JSON);
}
