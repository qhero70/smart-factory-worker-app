/**
 * 38.7｜今日派班報工回寫正式模組
 * 專案：智慧製造中央作戰指揮中心
 * 版本：v1.7.5_38.7_dispatch_report_sync
 *
 * 目的：讓 PWA 今日任務帶入報工後，可回寫 20_今日派班狀態。
 * 39 暫停；26 每日推播不重做。
 */

function 今日派班報工回寫38_7_嘗試處理動作_(payload) {
  var p = payload || {};
  var action = 今日派班報工回寫38_7文字_(p.action || p['動作']);
  if (action === '更新今日派班狀態38_7') return 更新今日派班狀態38_7(p);
  if (action === '取得派班任務明細38_7') return 取得派班任務明細38_7(p);
  if (action === '測試_今日派班報工回寫38_7') return 測試_今日派班報工回寫38_7();
  return null;
}

function 更新今日派班狀態38_7(p) {
  p = p || {};
  var id = 今日派班報工回寫38_7文字_(p.派班編號 || p.dispatchId || p.id);
  if (!id) return { 成功:false, 訊息:'缺少派班編號' };
  var ss = 取得試算表_();
  var sh = ss.getSheetByName('20_今日派班');
  if (!sh) return { 成功:false, 訊息:'找不到 20_今日派班' };
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { 成功:false, 訊息:'20_今日派班沒有資料' };
  var head = values[0].map(function(h){ return 今日派班報工回寫38_7文字_(h); });
  var idxId = head.indexOf('派班編號');
  var idxStatus = head.indexOf('狀態');
  var idxNote = head.indexOf('備註');
  var idxTime = head.indexOf('更新時間');
  if (idxId < 0 || idxStatus < 0) return { 成功:false, 訊息:'20_今日派班缺少派班編號或狀態欄位' };
  for (var i=1;i<values.length;i++) {
    if (今日派班報工回寫38_7文字_(values[i][idxId]) === id) {
      sh.getRange(i+1, idxStatus+1).setValue(今日派班報工回寫38_7文字_(p.狀態 || p.status) || '已報工');
      if (idxNote >= 0) {
        var note = 今日派班報工回寫38_7文字_(values[i][idxNote]);
        var reportNo = 今日派班報工回寫38_7文字_(p.報工編號 || p.reportNo || '');
        sh.getRange(i+1, idxNote+1).setValue(note + (note ? '；' : '') + '報工回寫38.7' + (reportNo ? '：' + reportNo : ''));
      }
      if (idxTime >= 0) sh.getRange(i+1, idxTime+1).setValue(new Date());
      return { 成功:true, 派班編號:id, 狀態:'已報工', 訊息:'今日派班狀態已回寫' };
    }
  }
  return { 成功:false, 派班編號:id, 訊息:'找不到派班任務' };
}

function 取得派班任務明細38_7(p) {
  p = p || {};
  var id = 今日派班報工回寫38_7文字_(p.派班編號 || p.dispatchId || p.id);
  if (!id) return { 成功:false, 訊息:'缺少派班編號' };
  var rows = 讀表_('20_今日派班');
  for (var i=0;i<rows.length;i++) {
    if (今日派班報工回寫38_7文字_(rows[i].派班編號) === id) return { 成功:true, 任務:rows[i] };
  }
  return { 成功:false, 派班編號:id, 訊息:'找不到派班任務' };
}

function 測試_今日派班報工回寫38_7() {
  return {
    成功:true,
    模組:'38.7_今日派班報工回寫正式模組',
    支援動作:['更新今日派班狀態38_7','取得派班任務明細38_7'],
    訊息:'今日派班報工回寫模組可用'
  };
}

function 今日派班報工回寫38_7文字_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}
