/**
 * 38.7｜自動排程防重與工單扣帳正式模組
 * 版本：v1.7.5_38.7_schedule_guard_workorder
 *
 * 主線：排程需求池 → 今日派班 → 報工回寫 → 工單扣帳。
 * 39 暫停；26 不重做。
 */

function 自動排程防重38_7_嘗試處理動作_(payload) {
  var p = payload || {};
  var action = 防重扣帳38_7文字_(p.action || p['動作']);
  if (action === '自動排程38_7' || action === '自動排程38_7_防重') return 自動排程38_7_防重(p);
  if (action === '測試_自動排程防重38_7') return 測試_自動排程防重38_7();
  return null;
}

function 派班報工回寫增強38_7_嘗試處理動作_(payload) {
  var p = payload || {};
  var action = 防重扣帳38_7文字_(p.action || p['動作']);
  if (action === '更新今日派班狀態38_7') return 更新今日派班狀態38_7_增強(p);
  if (action === '測試_工單扣帳38_7') return 測試_工單扣帳38_7();
  return null;
}

function 自動排程38_7_防重(p) {
  p = p || {};
  var ss = 取得試算表_();
  var today = 防重扣帳38_7文字_(p.作業日) || (typeof 取得作業日_ === 'function' ? 取得作業日_() : Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'));
  var poolSh = ss.getSheetByName('10_排程需求池');
  if (!poolSh) return { 成功:false, 訊息:'找不到 10_排程需求池' };
  var poolValues = poolSh.getDataRange().getValues();
  if (poolValues.length < 2) return { 成功:true, 作業日:today, 需求筆數:0, 派班筆數:0, 訊息:'排程需求池沒有待排資料' };
  var poolHead = poolValues[0].map(function(h){ return 防重扣帳38_7文字_(h); });
  var poolRows = 防重扣帳38_7列轉物件_(poolValues);
  var dispatchSh = 建立或修復表_(ss, '20_今日派班', ['派班編號','作業日','班別','工號','姓名','產品編號','客戶品號','品名','工站名稱','機台編號','需求量','預計數量','狀態','來源需求編號','備註','更新時間']);
  var dispatchHead = 取表頭_(dispatchSh);
  var used = 防重扣帳38_7已派需求集合_(dispatchSh);
  var rules = 讀表_('19_人員排班規則');
  if (!rules.length && typeof 初始化_19_人員排班規則 === 'function') 初始化_19_人員排班規則();
  rules = 讀表_('19_人員排班規則').filter(防重扣帳38_7可排班_);
  var now = new Date();
  var rows = [];
  var skippedDuplicate = 0;
  var skippedNoWorker = 0;
  var updatedPoolRows = [];

  poolRows.forEach(function(req, idx){
    var reqId = 防重扣帳38_7文字_(req.需求編號 || req.來源需求編號 || ('REQ-ROW-' + (idx + 2)));
    var status = 防重扣帳38_7文字_(req.狀態 || '待排程');
    if (!(status === '' || status === '待排程' || status === '待排' || status === '未排')) return;
    if (used[reqId]) { skippedDuplicate++; return; }
    var worker = 防重扣帳38_7選人_(rules, req);
    if (!worker) { skippedNoWorker++; return; }
    var obj = {
      派班編號: 'DSP-' + today.replace(/-/g,'') + '-' + 防重扣帳38_7流水_(),
      作業日: today,
      班別: worker.預設班別 || '自動',
      工號: worker.工號,
      姓名: worker.姓名,
      產品編號: req.產品編號 || '',
      客戶品號: req.客戶品號 || '',
      品名: req.品名 || '',
      工站名稱: req.建議工站 || req.工站名稱 || '',
      機台編號: req.建議機台 || req.機台編號 || '',
      需求量: req.需求量 || '',
      預計數量: req.需求量 || '',
      狀態: '待報工',
      來源需求編號: reqId,
      備註: '38.7 防重自動排程；來源列 ' + (idx + 2),
      更新時間: now
    };
    rows.push(dispatchHead.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; }));
    updatedPoolRows.push({row:idx+2, reqId:reqId});
    used[reqId] = true;
  });

  if (rows.length) dispatchSh.getRange(dispatchSh.getLastRow()+1, 1, rows.length, dispatchHead.length).setValues(rows);
  防重扣帳38_7更新需求池狀態_(poolSh, poolHead, updatedPoolRows, '已派班');
  return { 成功:true, 作業日:today, 需求筆數:poolRows.length, 派班筆數:rows.length, 重複略過:skippedDuplicate, 無人可派:skippedNoWorker, 訊息:'已完成防重自動排程' };
}

function 更新今日派班狀態38_7_增強(p) {
  p = p || {};
  var dispatchId = 防重扣帳38_7文字_(p.派班編號 || p.dispatchId || p.id);
  if (!dispatchId) return { 成功:false, 訊息:'缺少派班編號' };
  var ss = 取得試算表_();
  var sh = ss.getSheetByName('20_今日派班');
  if (!sh) return { 成功:false, 訊息:'找不到 20_今日派班' };
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { 成功:false, 訊息:'20_今日派班沒有資料' };
  var head = values[0].map(function(h){ return 防重扣帳38_7文字_(h); });
  var idxId = head.indexOf('派班編號');
  var idxStatus = head.indexOf('狀態');
  var idxNote = head.indexOf('備註');
  var idxTime = head.indexOf('更新時間');
  var idxWorkOrder = head.indexOf('工單編號');
  var idxSource = head.indexOf('來源需求編號');
  if (idxId < 0 || idxStatus < 0) return { 成功:false, 訊息:'20_今日派班缺少必要欄位' };
  var found = null;
  for (var i=1;i<values.length;i++) {
    if (防重扣帳38_7文字_(values[i][idxId]) === dispatchId) {
      sh.getRange(i+1, idxStatus+1).setValue(防重扣帳38_7文字_(p.狀態 || p.status) || '已報工');
      if (idxNote >= 0) {
        var note = 防重扣帳38_7文字_(values[i][idxNote]);
        var reportNo = 防重扣帳38_7文字_(p.報工編號 || p.reportNo || '');
        sh.getRange(i+1, idxNote+1).setValue(note + (note ? '；' : '') + '38.7報工回寫' + (reportNo ? '：' + reportNo : ''));
      }
      if (idxTime >= 0) sh.getRange(i+1, idxTime+1).setValue(new Date());
      found = { row:i+1, 工單編號: idxWorkOrder >= 0 ? values[i][idxWorkOrder] : '', 來源需求編號: idxSource >= 0 ? values[i][idxSource] : '' };
      break;
    }
  }
  if (!found) return { 成功:false, 派班編號:dispatchId, 訊息:'找不到派班任務' };
  var qty = 防重扣帳38_7數字_(p.報工數量 || p.今日共做數 || p.良品數 || p.實際良品數 || p.數量 || p.預計數量 || 0);
  var workOrderId = 防重扣帳38_7文字_(p.工單編號 || found.工單編號 || found.來源需求編號);
  var wo = workOrderId ? 工單扣帳38_7_(workOrderId, qty, dispatchId) : { 成功:false, 訊息:'未提供工單編號，略過工單扣帳' };
  return { 成功:true, 派班編號:dispatchId, 狀態:'已報工', 工單扣帳:wo, 訊息:'今日派班已回寫，已嘗試同步工單扣帳' };
}

function 工單扣帳38_7_(workOrderId, qty, dispatchId) {
  if (!qty || qty <= 0) return { 成功:false, 工單編號:workOrderId, 訊息:'報工數量為 0，略過扣帳' };
  var ss = 取得試算表_();
  var sh = ss.getSheetByName('10_工單主檔');
  if (!sh) return { 成功:false, 訊息:'找不到 10_工單主檔' };
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { 成功:false, 訊息:'10_工單主檔沒有資料' };
  var head = values[0].map(function(h){ return 防重扣帳38_7文字_(h); });
  var idxId = 防重扣帳38_7找欄_(head, ['工單編號','需求編號','來源需求編號','派工單號']);
  if (idxId < 0) return { 成功:false, 訊息:'10_工單主檔缺少工單編號/需求編號欄位' };
  var idxPlan = 防重扣帳38_7找欄_(head, ['工單數量','需求量','預計數量','計畫量']);
  var idxDone = 防重扣帳38_7確保欄_(sh, head, '已報工數量');
  var idxRemain = 防重扣帳38_7確保欄_(sh, head, '剩餘數量');
  var idxStatus = 防重扣帳38_7確保欄_(sh, head, '狀態');
  var idxNote = 防重扣帳38_7確保欄_(sh, head, '備註');
  var idxTime = 防重扣帳38_7確保欄_(sh, head, '更新時間');
  for (var i=1;i<values.length;i++) {
    if (防重扣帳38_7文字_(values[i][idxId]) === workOrderId) {
      var plan = idxPlan >= 0 ? 防重扣帳38_7數字_(values[i][idxPlan]) : 0;
      var doneOld = 防重扣帳38_7數字_(values[i][idxDone]);
      var doneNew = doneOld + qty;
      var remain = plan > 0 ? Math.max(plan - doneNew, 0) : '';
      var status = plan > 0 && doneNew >= plan ? '已完成' : '生產中';
      sh.getRange(i+1, idxDone+1).setValue(doneNew);
      sh.getRange(i+1, idxRemain+1).setValue(remain);
      sh.getRange(i+1, idxStatus+1).setValue(status);
      sh.getRange(i+1, idxNote+1).setValue(防重扣帳38_7文字_(values[i][idxNote]) + '；38.7派班報工扣帳：' + dispatchId + ' +' + qty);
      sh.getRange(i+1, idxTime+1).setValue(new Date());
      return { 成功:true, 工單編號:workOrderId, 本次扣帳:qty, 累計已報工:doneNew, 剩餘數量:remain, 狀態:status };
    }
  }
  return { 成功:false, 工單編號:workOrderId, 訊息:'找不到對應工單，已只回寫派班狀態' };
}

function 防重扣帳38_7已派需求集合_(sh) {
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  var values = sh.getDataRange().getValues();
  var head = values[0].map(function(h){ return 防重扣帳38_7文字_(h); });
  var idx = head.indexOf('來源需求編號');
  if (idx < 0) return out;
  for (var i=1;i<values.length;i++) if (values[i][idx]) out[防重扣帳38_7文字_(values[i][idx])] = true;
  return out;
}

function 防重扣帳38_7更新需求池狀態_(sh, head, rows, status) {
  var idxStatus = head.indexOf('狀態');
  var idxTime = head.indexOf('更新時間');
  if (idxStatus < 0) return;
  rows.forEach(function(r){
    sh.getRange(r.row, idxStatus+1).setValue(status);
    if (idxTime >= 0) sh.getRange(r.row, idxTime+1).setValue(new Date());
  });
}

function 防重扣帳38_7可排班_(r) {
  if (typeof 主線優化38_7可排班_ === 'function') return 主線優化38_7可排班_(r);
  var role = 防重扣帳38_7文字_(r.角色類型 + ' ' + r.職稱 + ' ' + r.備註);
  if (防重扣帳38_7文字_(r.可排班) === '否') return false;
  if (/幹部|工程師|主任|助理工程師|留職停薪|留停/.test(role)) return false;
  return true;
}

function 防重扣帳38_7選人_(workers, req) {
  if (typeof 主線優化38_7選人_ === 'function') return 主線優化38_7選人_(workers, req);
  if (!workers || !workers.length) return null;
  var text = 防重扣帳38_7文字_([req.品名, req.產品編號, req.建議工站, req.建議機台].join(' ')).toLowerCase();
  var best = workers[0], score = -1;
  workers.forEach(function(w){
    var s = 0;
    ['專責工站','專責產品','專責機台'].forEach(function(k){ 防重扣帳38_7拆_(w[k]).forEach(function(x){ if (text.indexOf(x.toLowerCase()) >= 0) s += 10; }); });
    if (s > score) { score = s; best = w; }
  });
  return best;
}

function 防重扣帳38_7列轉物件_(values) {
  var head = values[0].map(function(h){ return 防重扣帳38_7文字_(h); });
  var rows = [];
  for (var i=1;i<values.length;i++) {
    var obj = {};
    for (var j=0;j<head.length;j++) obj[head[j]] = values[i][j];
    rows.push(obj);
  }
  return rows;
}
function 防重扣帳38_7找欄_(head, names) { for (var i=0;i<names.length;i++){ var idx=head.indexOf(names[i]); if(idx>=0)return idx; } return -1; }
function 防重扣帳38_7確保欄_(sh, head, name) { var idx=head.indexOf(name); if(idx>=0)return idx; sh.getRange(1, head.length+1).setValue(name); head.push(name); return head.length-1; }
function 防重扣帳38_7流水_() { return Utilities.formatDate(new Date(), 'Asia/Taipei', 'HHmmssSSS') + '-' + Math.floor(Math.random()*900+100); }
function 防重扣帳38_7文字_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function 防重扣帳38_7數字_(v) { var n = Number(String(v || 0).replace(/,/g,'')); return Number.isFinite(n) ? Math.max(0, n) : 0; }
function 防重扣帳38_7拆_(v) { return 防重扣帳38_7文字_(v).split(/[,，、\s]+/).filter(Boolean); }
function 測試_自動排程防重38_7() { return { 成功:true, 模組:'38.7_自動排程防重', 行為:'同一來源需求不重複派班，派班後更新 10_排程需求池 狀態' }; }
function 測試_工單扣帳38_7() { return { 成功:true, 模組:'38.7_工單扣帳', 行為:'報工回寫 20_今日派班，並依工單編號嘗試扣 10_工單主檔' }; }
