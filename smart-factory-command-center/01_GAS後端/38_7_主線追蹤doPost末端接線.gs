/**
 * 38.7｜主線追蹤 doPost 末端接線
 * 說明：總控 doPost 既有 handlers 最後會呼叫 排程需求池_嘗試處理動作_。
 * 本檔補上該函數，接住清洗錯誤報告、未報工追蹤、主管主線追蹤等 38.7 動作。
 */
function 排程需求池_嘗試處理動作_(payload) {
  var p = payload || {};
  var action = String(p.action || p['動作'] || '').trim();
  if (action === '取得清洗錯誤報告38_7' && typeof 取得清洗錯誤報告38_7 === 'function') return 取得清洗錯誤報告38_7(p);
  if (action === '取得未報工追蹤38_7' && typeof 取得未報工追蹤38_7 === 'function') return 取得未報工追蹤38_7(p);
  if (action === '更新今日派班狀態細分38_7' && typeof 更新今日派班狀態細分38_7 === 'function') return 更新今日派班狀態細分38_7(p);
  if (action === '取得主管主線追蹤38_7' && typeof 取得主管主線追蹤38_7 === 'function') return 取得主管主線追蹤38_7(p);
  if (action === '測試_清洗錯誤追蹤38_7' && typeof 測試_清洗錯誤追蹤38_7 === 'function') return 測試_清洗錯誤追蹤38_7();
  return null;
}
