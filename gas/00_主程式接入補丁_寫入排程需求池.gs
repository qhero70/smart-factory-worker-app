/**
 * 00_主程式接入補丁_寫入排程需求池
 * 用途：解決主程式回覆 UNKNOWN_ACTION：寫入排程需求池。
 *
 * 貼法：
 * 1. 不要新增 doPost。
 * 2. 到主程式的 doPost(e) 內，const p = 解析POST_(e); 後面立刻插入下方兩行。
 *
 * var 排程結果 = 主程式_先處理排程需求池_(p);
 * if (排程結果) return 排程需求池_輸出JSON_(排程結果);
 */

function 主程式_先處理排程需求池_(p) {
  p = p || {};
  var action = String(p.action || p['動作'] || '').trim();
  if (action === '寫入排程需求池') return 寫入排程需求池(p);
  if (action === '初始化_10_排程需求池') return 初始化_10_排程需求池();
  if (action === '健康檢查_排程需求池') return { ok: true, 模組: '10_排程需求池', 時間: 排程需求池_現在_() };
  return null;
}
