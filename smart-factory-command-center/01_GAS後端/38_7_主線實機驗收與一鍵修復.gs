/**
 * 38.7｜主線實機驗收與一鍵修復
 * 版本：v1.7.5_38.7_acceptance_repair
 *
 * 目的：不進 39，先把主線從清洗、排程、派班、報工、工單同步做成可驗收狀態。
 */

function 主線實機驗收38_7(p) {
  p = p || {};
  var ss = 取得試算表_();
  var sheets = [
    { name:'18_生產計劃清洗紀錄', required:['產品編號','客戶品號','修正品名','建議工站','建議機台','狀態'] },
    { name:'10_排程需求池', required:['需求編號','產品編號','客戶品號','品名','需求量','狀態'] },
    { name:'19_人員排班規則', required:['工號','姓名','可排班','可加班','角色類型','專責工站','專責產品','專責機台'] },
    { name:'20_今日派班', required:['派班編號','作業日','工號','姓名','產品編號','品名','工站名稱','機台編號','狀態','來源需求編號'] },
    { name:'10_工單主檔', required:['工單編號','產品編號','品名','工單數量','已報工數量','剩餘數量','狀態'] }
  ];
  var report = [];
  var okCount = 0;
  sheets.forEach(function(s){
    var sh = ss.getSheetByName(s.name);
    if (!sh) { report.push({ 分頁:s.name, 成功:false, 問題:'分頁不存在', 筆數:0, 缺欄:s.required }); return; }
    var head = sh.getLastColumn() ? sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(主線驗收38_7文字_) : [];
    var missing = s.required.filter(function(h){ return head.indexOf(h) < 0; });
    var rows = Math.max(sh.getLastRow() - 1, 0);
    var success = missing.length === 0;
    if (success) okCount++;
    report.push({ 分頁:s.name, 成功:success, 筆數:rows, 缺欄:missing });
  });
  var flow = 主線驗收38_7流程指標_();
  var allOk = okCount === sheets.length;
  return { 成功:allOk, 版本:'v1.7.5_38.7_acceptance_repair', 分頁檢查:report, 流程指標:flow, 建議:allOk ? '主線必要分頁欄位已具備，可跑清洗→排程→報工實測。' : '請先執行 主線一鍵修復38_7 補齊分頁與欄位。' };
}

function 主線一鍵修復38_7(p) {
  var ss = 取得試算表_();
  var fixed = [];
  主線驗收38_7修表_(ss,'18_生產計劃清洗紀錄',['清洗批號','來源列','產品編號','客戶品號','原始品名','修正品名','建議工站','建議機台','需求量','狀態','備註','更新時間'],fixed);
  主線驗收38_7修表_(ss,'10_排程需求池',['需求編號','來源批號','產品編號','客戶品號','品名','需求量','建議工站','建議機台','狀態','備註','更新時間'],fixed);
  主線驗收38_7修表_(ss,'19_人員排班規則',['工號','姓名','可排班','可加班','角色類型','職稱','預設班別','專責工站','專責產品','專責機台','備註','更新時間'],fixed);
  主線驗收38_7修表_(ss,'20_今日派班',['派班編號','作業日','班別','工號','姓名','產品編號','客戶品號','品名','工站名稱','機台編號','需求量','預計數量','狀態','來源需求編號','備註','更新時間'],fixed);
  主線驗收38_7修表_(ss,'10_工單主檔',['工單編號','來源需求編號','產品編號','客戶品號','品名','工單數量','已報工數量','剩餘數量','狀態','備註','更新時間'],fixed);
  主線驗收38_7修表_(ss,'38_7_主線驗收紀錄',['時間','項目','結果','摘要','操作者'],fixed);
  return { 成功:true, 修復:fixed, 驗收:主線實機驗收38_7({}) };
}

function 測試_主線實機驗收38_7() {
  return { 成功:true, 模組:'38.7_主線實機驗收與一鍵修復', 支援:['主線實機驗收38_7','主線一鍵修復38_7'] };
}

function 主線驗收38_7流程指標_() {
  var out = {};
  out.排程需求池 = 主線驗收38_7統計_('10_排程需求池','狀態');
  out.今日派班 = 主線驗收38_7統計_('20_今日派班','狀態');
  out.工單主檔 = 主線驗收38_7統計_('10_工單主檔','狀態');
  out.報工表 = 主線驗收38_7找報工統計_();
  return out;
}

function 主線驗收38_7統計_(sheetName, statusName) {
  var rows = 讀表_(sheetName);
  var stat = { 總筆數:rows.length };
  rows.forEach(function(r){ var s = 主線驗收38_7文字_(r[statusName] || '空白'); stat[s] = (stat[s] || 0) + 1; });
  return stat;
}

function 主線驗收38_7找報工統計_() {
  var names = ['09_報工紀錄','09_報工','09_報工作業'];
  for (var i=0;i<names.length;i++) {
    try { var rows = 讀表_(names[i]); if (rows.length || SpreadsheetApp.getActive().getSheetByName(names[i])) return { 分頁:names[i], 總筆數:rows.length }; } catch(e) {}
  }
  return { 分頁:'未找到', 總筆數:0 };
}

function 主線驗收38_7修表_(ss, name, headers, fixed) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1,1,1,headers.length).setValues([headers]);
  var head = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getValues()[0].map(主線驗收38_7文字_);
  headers.forEach(function(h){ if (head.indexOf(h) < 0) { sh.getRange(1, sh.getLastColumn()+1).setValue(h); head.push(h); fixed.push(name + ' 補欄：' + h); } });
  if (fixed.indexOf(name + ' 已存在') < 0) fixed.push(name + ' 已確認');
}

function 主線驗收38_7文字_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
