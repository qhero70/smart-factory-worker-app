/**
 * 38.7｜清洗錯誤報告與主管追蹤正式模組
 * 版本：v1.7.5_38.7_cleaning_report_supervisor
 *
 * 目的：主管可在 PWA 看到生產計劃清洗異常、途程/機台缺漏與今日未報工清單。
 * 39 暫停；26 不重做。
 */

function 清洗錯誤追蹤38_7_嘗試處理動作_(payload) {
  var p = payload || {};
  var action = 清洗追蹤38_7文字_(p.action || p['動作']);
  if (action === '取得清洗錯誤報告38_7') return 取得清洗錯誤報告38_7(p);
  if (action === '取得未報工追蹤38_7') return 取得未報工追蹤38_7(p);
  if (action === '更新今日派班狀態細分38_7') return 更新今日派班狀態細分38_7(p);
  if (action === '取得主管主線追蹤38_7') return 取得主管主線追蹤38_7(p);
  if (action === '測試_清洗錯誤追蹤38_7') return 測試_清洗錯誤追蹤38_7();
  return null;
}

function 取得清洗錯誤報告38_7(p) {
  var rows = 讀表_('18_生產計劃清洗紀錄');
  var 異常 = [];
  var 品名待確認 = 0;
  var 途程待補 = 0;
  var 機台待補 = 0;
  rows.forEach(function(r){
    var 狀態 = 清洗追蹤38_7文字_(r.狀態);
    var 備註 = 清洗追蹤38_7文字_(r.備註);
    var 修正品名 = 清洗追蹤38_7文字_(r.修正品名);
    var 工站 = 清洗追蹤38_7文字_(r.建議工站);
    var 機台 = 清洗追蹤38_7文字_(r.建議機台);
    var bad = false;
    if (!修正品名 || 狀態.indexOf('待') >= 0 || 備註.indexOf('找不到') >= 0) { 品名待確認++; bad = true; }
    if (!工站) { 途程待補++; bad = true; }
    if (!機台) { 機台待補++; bad = true; }
    if (bad) 異常.push(r);
  });
  return {
    成功:true,
    總筆數:rows.length,
    異常筆數:異常.length,
    品名待確認:品名待確認,
    途程待補:途程待補,
    機台待補:機台待補,
    異常清單:異常.slice(0, 80),
    訊息:'已取得生產計劃清洗錯誤報告'
  };
}

function 取得未報工追蹤38_7(p) {
  p = p || {};
  var today = 清洗追蹤38_7文字_(p.作業日) || (typeof 取得作業日_ === 'function' ? 取得作業日_() : Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'));
  var rows = 讀表_('20_今日派班').filter(function(r){ return 清洗追蹤38_7文字_(r.作業日) === today; });
  var 未報 = [];
  var 已報 = 0;
  var 已帶入 = 0;
  var 異常 = 0;
  var 取消 = 0;
  rows.forEach(function(r){
    var st = 清洗追蹤38_7文字_(r.狀態 || '待報工');
    if (st === '已報工') { 已報++; return; }
    if (st === '已帶入') 已帶入++;
    if (st === '異常') 異常++;
    if (st === '取消') { 取消++; return; }
    未報.push(r);
  });
  return { 成功:true, 作業日:today, 今日派班數:rows.length, 已報工:已報, 已帶入:已帶入, 異常:異常, 取消:取消, 未報工:未報.length, 未報工清單:未報.slice(0, 120), 訊息:'已取得今日未報工追蹤' };
}

function 更新今日派班狀態細分38_7(p) {
  p = p || {};
  var id = 清洗追蹤38_7文字_(p.派班編號 || p.dispatchId || p.id);
  var st = 清洗追蹤38_7文字_(p.狀態 || p.status || '待報工');
  var allowed = { '待報工':1, '已帶入':1, '已報工':1, '異常':1, '取消':1 };
  if (!id) return { 成功:false, 訊息:'缺少派班編號' };
  if (!allowed[st]) return { 成功:false, 訊息:'狀態不允許，僅可為：待報工、已帶入、已報工、異常、取消' };
  var ss = 取得試算表_();
  var sh = ss.getSheetByName('20_今日派班');
  if (!sh) return { 成功:false, 訊息:'找不到 20_今日派班' };
  var values = sh.getDataRange().getValues();
  var head = values[0].map(function(h){ return 清洗追蹤38_7文字_(h); });
  var idxId = head.indexOf('派班編號');
  var idxStatus = head.indexOf('狀態');
  var idxNote = head.indexOf('備註');
  var idxTime = head.indexOf('更新時間');
  if (idxId < 0 || idxStatus < 0) return { 成功:false, 訊息:'20_今日派班缺少派班編號或狀態欄位' };
  for (var i=1;i<values.length;i++) {
    if (清洗追蹤38_7文字_(values[i][idxId]) === id) {
      sh.getRange(i+1, idxStatus+1).setValue(st);
      if (idxNote >= 0) {
        var note = 清洗追蹤38_7文字_(values[i][idxNote]);
        var add = 清洗追蹤38_7文字_(p.備註 || p.note || '');
        sh.getRange(i+1, idxNote+1).setValue(note + (note ? '；' : '') + '38.7狀態更新：' + st + (add ? '｜' + add : ''));
      }
      if (idxTime >= 0) sh.getRange(i+1, idxTime+1).setValue(new Date());
      return { 成功:true, 派班編號:id, 狀態:st, 訊息:'今日派班狀態已更新' };
    }
  }
  return { 成功:false, 派班編號:id, 訊息:'找不到派班任務' };
}

function 取得主管主線追蹤38_7(p) {
  var clean = 取得清洗錯誤報告38_7(p || {});
  var unreport = 取得未報工追蹤38_7(p || {});
  return { 成功:true, 清洗錯誤報告:clean, 未報工追蹤:unreport, 訊息:'主管主線追蹤已彙整' };
}

function 測試_清洗錯誤追蹤38_7() {
  return { 成功:true, 模組:'38.7_清洗錯誤報告與主管追蹤', 支援動作:['取得清洗錯誤報告38_7','取得未報工追蹤38_7','更新今日派班狀態細分38_7','取得主管主線追蹤38_7'] };
}

function 清洗追蹤38_7文字_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
