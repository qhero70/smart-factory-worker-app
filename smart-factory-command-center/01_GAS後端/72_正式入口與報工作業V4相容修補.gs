/**
 * 72_正式入口與報工作業V4相容修補.gs
 * 版本：v1.8.7
 *
 * 修正項目：
 * 1. 補上正式主後端正在呼叫、但舊模組沒有宣告的相容函數。
 * 2. 優先交由既有報工作業 V4 PWA 模組處理。
 * 3. 若舊 V4 PWA 模組不存在，改交由正式 09_報工／09_不良紀錄寫入模組處理。
 * 4. 不宣告 doGet／doPost，不改 LINE Webhook，也不建立第二個 Web App 入口。
 */
var 正式入口72_版本 = 'v1.8.7_正式入口與報工作業V4相容修補';

/**
 * 正式主後端第 40 行的相容入口。
 * GET 沒有 action 時會安全回傳 null，讓原 doGet 繼續處理頁面。
 * POST 有報工 action 時，交由現有正式模組處理。
 */
function 報工作業V4_PWA_嘗試展開動作_(來源) {
  if (typeof 報工作業V4_PWA_嘗試處理動作_ === 'function') {
    return 報工作業V4_PWA_嘗試處理動作_(來源);
  }
  if (typeof 報工作業V4_正式寫入_嘗試處理動作_ === 'function') {
    return 報工作業V4_正式寫入_嘗試處理動作_(來源);
  }
  return null;
}

/**
 * 首頁 HTML 的獨立健康檢查，不寫入試算表。
 */
function 測試_正式入口72_相容修補() {
  return {
    成功: true,
    版本: 正式入口72_版本,
    相容入口已建立: typeof 報工作業V4_PWA_嘗試展開動作_ === 'function',
    V4_PWA處理模組: typeof 報工作業V4_PWA_嘗試處理動作_ === 'function',
    正式寫入模組: typeof 報工作業V4_正式寫入_嘗試處理動作_ === 'function',
    首頁檔名: '首頁入口',
    正式主資料庫ID: '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8',
    測試時間: new Date()
  };
}
