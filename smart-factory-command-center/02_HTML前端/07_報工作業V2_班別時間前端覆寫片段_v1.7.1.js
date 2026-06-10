/* 07_報工作業V2｜班別時間前端覆寫片段 v1.7.1
貼上位置：07_報工作業V2.html 最後一個 </script> 前面。
目的：直接覆蓋 HTML 本體舊的 設定預設時間 與 計算工時。
*/
(function(){
  function $id(id){ return document.getElementById(id); }
  function txt(v){ return String(v == null ? '' : v).trim(); }
  function pad(n){ return String(n).padStart(2, '0'); }
  function toLocal(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  window.推估班別 = function(v){
    var t = txt(v);
    if (t === 'DAY') return '早班';
    if (t === 'SWING') return '中班';
    if (t === 'NIGHT') return '大夜班';
    if (t.indexOf('大夜') >= 0 || t.indexOf('夜') >= 0 || t.indexOf('2300') >= 0 || t.indexOf('23:00') >= 0 || t.indexOf('3150') >= 0 || t.indexOf('07:50') >= 0) return '大夜班';
    if (t.indexOf('中班') >= 0 || t.indexOf('16:50') >= 0 || t.indexOf('01:40') >= 0) return '中班';
    if (t.indexOf('早班') >= 0 || t.indexOf('早') >= 0 || t.indexOf('0800') >= 0 || t.indexOf('08:00') >= 0) return '早班';
    return t || '早班';
  };
  function op(){ return window.狀態 && window.狀態.作業員 ? window.狀態.作業員 : null; }
  function 班別(){ var r = op(); if (r && r.班別名稱) return window.推估班別(r.班別名稱); if (r && r.班別) return window.推估班別(r.班別); var s = $id('班別'); return window.推估班別(s ? s.value : '早班'); }
  function 起(){ var r = op(); if (r && r.班別開始時間) return txt(r.班別開始時間); var b = 班別(); return b === '中班' ? '16:50' : (b === '大夜班' ? '23:00' : '08:00'); }
  function 迄(){ var r = op(); if (r && r.班別結束時間) return txt(r.班別結束時間); var b = 班別(); return b === '中班' ? '01:40' : (b === '大夜班' ? '07:50' : '16:50'); }
  function 工時(){ var r = op(); var h = r ? Number(r.班別實際工時 || 0) : 0; return h > 0 ? h : 8; }
  function 日期(hhmm, isEnd){
    var now = new Date();
    var m = txt(hhmm).match(/^(\d{1,2}):(\d{2})$/);
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    var b = 班別();
    if (isEnd && (b === '中班' || b === '大夜班')) d.setDate(d.getDate() + 1);
    if (!isEnd && b === '大夜班' && now.getHours() < 12) d.setDate(d.getDate() - 1);
    if (isEnd && b === '大夜班' && now.getHours() < 12) d.setDate(d.getDate());
    return d;
  }
  window.設定預設時間 = function(){
    var a = $id('開始時間'), b = $id('結束時間'), h = $id('實際工時');
    if (!a || !b) return;
    a.value = toLocal(日期(起(), false));
    b.value = toLocal(日期(迄(), true));
    if (h) h.value = String(工時());
    if (typeof window.更新預覽 === 'function') window.更新預覽();
  };
  window.計算工時 = function(){
    var h = $id('實際工時');
    if (h) h.value = String(工時());
    if (typeof window.更新預覽 === 'function') window.更新預覽();
  };
  var oldOp = window.作業員變更;
  if (typeof oldOp === 'function') window.作業員變更 = function(){ oldOp(); var r = op(), s = $id('班別'); if (s && r) s.value = r.班別名稱 || window.推估班別(r.班別 || r.原始班別 || s.value); setTimeout(window.設定預設時間, 30); };
  var oldTab = window.切換頁籤;
  if (typeof oldTab === 'function') window.切換頁籤 = function(name){ oldTab(name); if (name === '產出') setTimeout(window.設定預設時間, 30); };
  var oldLoad = window.資料載入完成;
  if (typeof oldLoad === 'function') window.資料載入完成 = function(data){ oldLoad(data); setTimeout(window.設定預設時間, 250); };
  window.addEventListener('load', function(){ setTimeout(window.設定預設時間, 500); });
})();
