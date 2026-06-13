/**
 * 智慧製造中央作戰指揮中心｜正式接入版 v1.6.8
 * 用途：取代主程式內 doPost(e) 與 處理API請求_(action, p)。
 * 搭配檔案：gas/10_排程需求池後端.gs
 *
 * 使用原則：
 * 1. Apps Script 專案內只允許一個 doPost。
 * 2. 本檔不是臨時補丁，是正式入口接入版。
 * 3. 請用本檔的 doPost 與 處理API請求_，取代主程式內同名函數。
 */

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (action === '寫入排程需求池') {
    return 排程需求池_輸出JSON_(寫入排程需求池(p));
  }

  if (action === '初始化_10_排程需求池') {
    return 排程需求池_輸出JSON_(初始化_10_排程需求池());
  }

  if (action === '健康檢查_排程需求池') {
    return 排程需求池_輸出JSON_({
      ok: true,
      模組: '10_排程需求池',
      時間: 排程需求池_現在_()
    });
  }

  if (p && p.events && Array.isArray(p.events)) {
    return 處理LINEWebhook_(p);
  }

  return 輸出JSON_(處理API請求_(action || '健康檢查', p));
}

function 處理API請求_(action, p) {
  action = String(action || (p && (p.action || p['動作'])) || '').trim();

  if (action === '寫入排程需求池') {
    return 寫入排程需求池(p || {});
  }

  if (action === '初始化_10_排程需求池') {
    return 初始化_10_排程需求池();
  }

  if (action === '健康檢查_排程需求池') {
    return {
      ok: true,
      模組: '10_排程需求池',
      時間: 排程需求池_現在_()
    };
  }

  if (action === '健康檢查') {
    return 健康檢查();
  }

  if (action === '主檔檢查') {
    return 主檔檢查();
  }

  if (action === '初始化_智慧製造中央作戰指揮中心') {
    return 初始化_智慧製造中央作戰指揮中心();
  }

  if (action === '取得報工作業v2初始資料') {
    return 取得報工作業v2初始資料();
  }

  if (action === '寫入報工作業v2') {
    return 寫入報工作業v2(p || {});
  }

  if (action === '寫入不良紀錄v2') {
    return 寫入不良紀錄v2(p || {});
  }

  if (action === '取得戰情' || action === '戰情') {
    return 取得戰情();
  }

  if (action === '取得AI摘要' || action === 'AI摘要') {
    return 取得AI摘要();
  }

  return {
    success: false,
    data: {
      可用動作: [
        '健康檢查',
        '主檔檢查',
        '初始化_智慧製造中央作戰指揮中心',
        '取得報工作業v2初始資料',
        '寫入報工作業v2',
        '寫入不良紀錄v2',
        '取得戰情',
        '取得AI摘要',
        '初始化_10_排程需求池',
        '健康檢查_排程需求池',
        '寫入排程需求池'
      ]
    },
    message: '未知動作：' + action,
    error: 'UNKNOWN_ACTION'
  };
}
