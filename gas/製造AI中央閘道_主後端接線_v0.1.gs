/**
 * 化新精密｜製造 AI 中央閘道主後端接線 v0.1
 *
 * 既有主後端已呼叫：AI戰情資料源_嘗試處理動作_(payload)
 * 因此本檔只提供相容掛鉤，不覆蓋 doGet(e) / doPost(e)，不建立第二個 Web App。
 */
function AI戰情資料源_嘗試處理動作_(payload) {
  if (typeof 製造AI閘道_嘗試處理動作_ !== 'function') return null;
  return 製造AI閘道_嘗試處理動作_(payload || {});
}
