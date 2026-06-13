/**
 * 00_處理API請求補丁_寫入排程需求池
 *
 * 現象：V3 前端回覆 UNKNOWN_ACTION：寫入排程需求池。
 * 判斷：請求已經進入舊的 處理API請求_()，所以直接在 處理API請求_() 開頭新增 case 最穩。
 *
 * 貼入位置：
 * 找到主程式裡的 function 處理API請求_(action, p) 或類似函數。
 * 在函數最上方、任何 switch / map / 可用動作判斷之前，貼入下方區塊。
 */

// ===== 貼在 處理API請求_(action, p) 函數最上方 =====
action = String(action || (p && (p.action || p['動作'])) || '').trim();

if (action === '寫入排程需求池') {
  return 寫入排程需求池(p || {});
}

if (action === '初始化_10_排程需求池') {
  return 初始化_10_排程需求池();
}

if (action === '健康檢查_排程需求池') {
  return {
    success: true,
    ok: true,
    message: '10_排程需求池後端正常',
    data: {
      模組: '10_排程需求池',
      時間: 排程需求池_現在_()
    }
  };
}
// ===== 貼到這裡結束，下面原本程式不動 =====
