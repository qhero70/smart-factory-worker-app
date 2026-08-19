/**
 * ============================================================
 * 化新精密｜智慧5S｜iPhone JSONP 相容層
 * 版本：1.0.0
 * ============================================================
 *
 * 用途：
 * 1. 解決 iPhone Safari / PWA 對 Apps Script 跨網域 fetch
 *    可能出現 Load failed 的問題。
 * 2. 一般瀏覽器仍維持原本 JSON 回應。
 * 3. 只有傳入 callback 參數時才輸出 JSONP JavaScript。
 * 4. 不建立第二套 API、不建立第二套資料庫。
 * ============================================================
 */

var 智慧5S_iOS_JSONP_版本 = '1.0.0';

function 智慧5S_iOS_JSONP_安全輸出_(參數, 資料) {
  var callback = String((參數 && 參數.callback) || '').trim();

  if (!callback) {
    return 主程式_安全輸出JSON_(資料);
  }

  // 僅接受合法 JavaScript 函式識別碼，避免任意腳本注入。
  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return 主程式_安全輸出JSON_({
      成功: false,
      ok: false,
      success: false,
      訊息: 'callback 格式不合法'
    });
  }

  var 內容 = callback + '(' + JSON.stringify(資料 || {}) + ');';

  return ContentService
    .createTextOutput(內容)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function 智慧5S_iOS_JSONP_健康檢查() {
  return {
    成功: true,
    版本: 智慧5S_iOS_JSONP_版本,
    訊息: 'iPhone JSONP 相容層可用'
  };
}
