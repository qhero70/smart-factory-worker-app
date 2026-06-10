/**
 * ZZZZ_07報工作業V2_讀取人員班別時間欄位正式版
 * 版本：v1.7.1｜保留原 UI，強制注入固定班別時間規則
 *
 * 本檔用途：
 * 1. 不更換 07_報工作業V2.html UI。
 * 2. 不新增 doGet / doPost。
 * 3. 覆寫 輸出HTML_()，讓 07_報工作業V2.html 輸出後，最後注入正確時間規則。
 * 4. 覆寫 取得報工作業V2前端保護補強JS_()，解決 HTML 本體舊函數把時間改回「現在→現在」的問題。
 *
 * 固定班別規則：
 * - 早班：08:00 → 16:50，休息 50 分鐘，實際工時 8
 * - 中班：16:50 → 隔日 01:40，休息 50 分鐘，實際工時 8
 * - 大夜班：23:00 → 隔日 07:50，休息 50 分鐘，實際工時 8
 */

function 輸出HTML_(檔名) {
  const output = HtmlService.createHtmlOutputFromFile(檔名)
    .setTitle(檔名 === '07_報工作業V2' ? '07_報工作業V2' : 系統設定.系統名稱)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  if (檔名 !== '07_報工作業V2') return output;

  const html = output.getContent();
  const patch = 取得報工作業V2前端保護補強JS_();
  const finalHtml = html.indexOf('</body>') >= 0
    ? html.replace('</body>', patch + '\n</body>')
    : html + patch;

  return HtmlService.createHtmlOutput(finalHtml)
    .setTitle('07_報工作業V2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function 取得報工作業V2前端保護補強JS_() {
  return `<script>
(function(){
  function $id(id){ return document.getElementById(id); }
  function txt(v){ return String(v == null ? '' : v).trim(); }
  function pad(n){ return String(n).padStart(2, '0'); }
  function toLocal(d){
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function op(){
    if (window.狀態 && window.狀態.作業員) return window.狀態.作業員;
    return {};
  }

  window.推估班別 = function(v){
    var t = txt(v);
    if (t === 'DAY') return '早班';
    if (t === 'SWING') return '中班';
    if (t === 'NIGHT') return '大夜班';
    if (t.indexOf('大夜') >= 0 || t.indexOf('夜') >= 0 || t.indexOf('2300') >= 0 || t.indexOf('23:00') >= 0 || t.indexOf('3150') >= 0 || t.indexOf('07:50') >= 0 || t.indexOf('0750') >= 0) return '大夜班';
    if (t.indexOf('中班') >= 0 || t.indexOf('16:50') >= 0 || t.indexOf('1650') >= 0 || t.indexOf('01:40') >= 0 || t.indexOf('0140') >= 0) return '中班';
    if (t.indexOf('早班') >= 0 || t.indexOf('早') >= 0 || t.indexOf('0800') >= 0 || t.indexOf('08:00') >= 0) return '早班';
    return t || '早班';
  };

  function 取得班別(){
    var r = op();
    if (r.班別名稱) return window.推估班別(r.班別名稱);
    if (r.班別) return window.推估班別(r.班別);
    if (r.原始班別) return window.推估班別(r.原始班別);
    var s = $id('班別');
    return window.推估班別(s ? s.value : '早班');
  }

  function 取得班別規則(){
    var r = op();
    var b = 取得班別();

    if (r.班別開始時間 && r.班別結束時間) {
      return {
        名稱: r.班別名稱 || b,
        開始: txt(r.班別開始時間),
        結束: txt(r.班別結束時間),
        跨日: txt(r.跨日) === '是' || b === '中班' || b === '大夜班',
        實際工時: Number(r.班別實際工時 || 8) || 8
      };
    }

    if (b === '中班') return { 名稱:'中班', 開始:'16:50', 結束:'01:40', 跨日:true, 實際工時:8 };
    if (b === '大夜班') return { 名稱:'大夜班', 開始:'23:00', 結束:'07:50', 跨日:true, 實際工時:8 };
    return { 名稱:'早班', 開始:'08:00', 結束:'16:50', 跨日:false, 實際工時:8 };
  }

  function 日期時間值(時間字串, 是否結束){
    var now = new Date();
    var m = txt(時間字串).match(/^(\d{1,2}):(\d{2})$/);
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    var rule = 取得班別規則();
    if (是否結束 && rule.跨日) d.setDate(d.getDate() + 1);
    if (!是否結束 && rule.名稱 === '大夜班' && now.getHours() < 12) d.setDate(d.getDate() - 1);
    if (是否結束 && rule.名稱 === '大夜班' && now.getHours() < 12) d.setDate(d.getDate());
    return toLocal(d);
  }

  window.設定預設時間 = function(){
    var rule = 取得班別規則();
    var 班別欄 = $id('班別');
    var 開始欄 = $id('開始時間');
    var 結束欄 = $id('結束時間');
    var 工時欄 = $id('實際工時');

    if (班別欄) 班別欄.value = rule.名稱;
    if (開始欄) 開始欄.value = 日期時間值(rule.開始, false);
    if (結束欄) 結束欄.value = 日期時間值(rule.結束, true);
    if (工時欄) 工時欄.value = String(rule.實際工時 || 8);
    if (typeof window.更新預覽 === 'function') window.更新預覽();
  };

  window.計算工時 = function(){
    var rule = 取得班別規則();
    var 工時欄 = $id('實際工時');
    if (工時欄) 工時欄.value = String(rule.實際工時 || 8);
    if (typeof window.更新預覽 === 'function') window.更新預覽();
  };

  var 原作業員變更 = window.作業員變更;
  if (typeof 原作業員變更 === 'function') {
    window.作業員變更 = function(){
      原作業員變更();
      setTimeout(function(){ window.設定預設時間(); }, 30);
      setTimeout(function(){ window.設定預設時間(); }, 300);
    };
  }

  var 原切換頁籤 = window.切換頁籤;
  if (typeof 原切換頁籤 === 'function') {
    window.切換頁籤 = function(name){
      原切換頁籤(name);
      if (name === '產出') {
        setTimeout(function(){ window.設定預設時間(); }, 30);
        setTimeout(function(){ window.設定預設時間(); }, 300);
      }
    };
  }

  var 原資料載入完成 = window.資料載入完成;
  if (typeof 原資料載入完成 === 'function') {
    window.資料載入完成 = function(data){
      原資料載入完成(data);
      setTimeout(function(){ window.設定預設時間(); }, 300);
    };
  }

  window.addEventListener('load', function(){
    setTimeout(function(){ window.設定預設時間(); }, 500);
    setTimeout(function(){ window.設定預設時間(); }, 1200);
  });
})();
</script>`;
}
