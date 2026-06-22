/**
 * 38.7｜主線直接路由
 * 版本：v1.7.5_38.7_direct_router
 * 目的：讓 doPost 一進來就先接住 38.7 主線 action，避免掉到舊版 UNKNOWN_ACTION。
 */
function 主線38_7_直接路由_(payload) {
  var p = payload || {};
  var action = String(p.action || p['動作'] || '').trim();

  if (action === '初始化_主線優化38_7' && typeof 初始化_主線優化38_7 === 'function') return 初始化_主線優化38_7(p);
  if (action === '初始化_唯一資料庫鎖定38_7' && typeof 初始化_唯一資料庫鎖定38_7 === 'function') return 初始化_唯一資料庫鎖定38_7(p);
  if (action === '初始化_19_人員排班規則' && typeof 初始化_19_人員排班規則 === 'function') return 初始化_19_人員排班規則(p);
  if (action === '清洗生產計劃表38_7' && typeof 清洗生產計劃表38_7 === 'function') return 清洗生產計劃表38_7(p);
  if ((action === '自動排程38_7' || action === '自動排程38_7_防重') && typeof 自動排程38_7_防重 === 'function') return 自動排程38_7_防重(p);
  if (action === '取得今日任務38_7' && typeof 取得今日任務38_7 === 'function') return 取得今日任務38_7(p);
  if (action === '取得主線儀表板38_7' && typeof 取得主線儀表板38_7 === 'function') return 取得主線儀表板38_7(p);
  if (action === '取得派班任務明細38_7' && typeof 取得派班任務明細38_7 === 'function') return 取得派班任務明細38_7(p);
  if (action === '更新今日派班狀態38_7' && typeof 更新今日派班狀態38_7_增強 === 'function') return 更新今日派班狀態38_7_增強(p);

  if (action === '取得清洗錯誤報告38_7' && typeof 取得清洗錯誤報告38_7 === 'function') return 取得清洗錯誤報告38_7(p);
  if (action === '取得未報工追蹤38_7' && typeof 取得未報工追蹤38_7 === 'function') return 取得未報工追蹤38_7(p);
  if (action === '更新今日派班狀態細分38_7' && typeof 更新今日派班狀態細分38_7 === 'function') return 更新今日派班狀態細分38_7(p);
  if (action === '取得主管主線追蹤38_7' && typeof 取得主管主線追蹤38_7 === 'function') return 取得主管主線追蹤38_7(p);

  if (action === '主線實機驗收38_7' && typeof 主線實機驗收38_7 === 'function') return 主線實機驗收38_7(p);
  if (action === '主線一鍵修復38_7' && typeof 主線一鍵修復38_7 === 'function') return 主線一鍵修復38_7(p);

  if (action === '人員註冊38_7_查詢工號' && typeof 人員註冊38_7_查詢工號 === 'function') return 人員註冊38_7_查詢工號(p);
  if (action === '人員註冊38_7_綁定' && typeof 人員註冊38_7_綁定 === 'function') return 人員註冊38_7_綁定(p);

  if (action === '測試_主線實機驗收38_7' && typeof 測試_主線實機驗收38_7 === 'function') return 測試_主線實機驗收38_7(p);
  if (action === '測試_主線優化38_7' && typeof 測試_主線優化38_7 === 'function') return 測試_主線優化38_7(p);
  if (action === '測試_自動排程防重38_7' && typeof 測試_自動排程防重38_7 === 'function') return 測試_自動排程防重38_7(p);
  if (action === '測試_工單扣帳38_7' && typeof 測試_工單扣帳38_7 === 'function') return 測試_工單扣帳38_7(p);
  if (action === '測試_清洗錯誤追蹤38_7' && typeof 測試_清洗錯誤追蹤38_7 === 'function') return 測試_清洗錯誤追蹤38_7(p);
  if (action === '測試_人員註冊38_7' && typeof 測試_人員註冊38_7 === 'function') return 測試_人員註冊38_7(p);

  return null;
}
