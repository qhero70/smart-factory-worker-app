/**
 * 38.7｜LINE 註冊正式模組
 * 目的：用工號綁定 LINE_USER_ID，並同步 33_LINE身份權限。
 */
function LINE註冊38_7_查詢工號(p) {
  p = p || {};
  var id = LINE註冊38_7文字_(p.工號 || p.id || p.workerId).toLowerCase();
  if (!id) return { 成功:false, 訊息:'請輸入工號' };
  var rows = 讀表_('01_人員主檔');
  for (var i=0;i<rows.length;i++) {
    if (LINE註冊38_7文字_(rows[i].工號).toLowerCase() === id) {
      return { 成功:true, 人員:rows[i], 訊息:'查詢成功' };
    }
  }
  return { 成功:false, 訊息:'找不到此工號' };
}

function LINE註冊38_7_綁定(p) {
  p = p || {};
  var id = LINE註冊38_7文字_(p.工號 || p.id || p.workerId).toLowerCase();
  var name = LINE註冊38_7文字_(p.姓名 || p.name);
  var uid = LINE註冊38_7文字_(p.LINE_USER_ID || p.lineUserId || p.userId || p.uid);
  if (!id) return { 成功:false, 訊息:'請輸入工號' };
  var q = LINE註冊38_7_查詢工號({工號:id});
  if (!q.成功) return q;
  var person = q.人員 || {};
  if (name && person.姓名 && name !== person.姓名) return { 成功:false, 訊息:'姓名與人員主檔不一致' };
  var role = LINE註冊38_7角色_(person);
  var ss = 取得試算表_();
  var sh = 建立或修復表_(ss, '33_LINE身份權限', ['LINE_USER_ID','工號','姓名','部門','組別','職稱','角色','啟用','備註','更新時間']);
  var values = sh.getDataRange().getValues();
  var head = values[0].map(function(h){ return LINE註冊38_7文字_(h); });
  var obj = { LINE_USER_ID:uid, 工號:person.工號, 姓名:person.姓名, 部門:person.部門 || '', 組別:person.組別 || '', 職稱:person.職稱 || '', 角色:role, 啟用:'是', 備註:'38.7 HTML註冊', 更新時間:new Date() };
  var keyIndex = head.indexOf('工號');
  for (var r=1;r<values.length;r++) {
    if (LINE註冊38_7文字_(values[r][keyIndex]).toLowerCase() === id) {
      sh.getRange(r+1,1,1,head.length).setValues([head.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; })]);
      return { 成功:true, 工號:person.工號, 姓名:person.姓名, 角色:role, 訊息:'註冊更新完成' };
    }
  }
  sh.appendRow(head.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; }));
  return { 成功:true, 工號:person.工號, 姓名:person.姓名, 角色:role, 訊息:'註冊完成' };
}

function 測試_LINE註冊38_7() {
  return { 成功:true, 模組:'38.7_LINE註冊正式模組', 支援:['LINE註冊38_7_查詢工號','LINE註冊38_7_綁定'] };
}
function LINE註冊38_7角色_(p) {
  var s = LINE註冊38_7文字_((p.職稱 || '') + ' ' + (p.角色 || '') + ' ' + (p.備註 || ''));
  if (/主任|工程師|幹部|主管|助理工程師/.test(s)) return '主管';
  return '作業員';
}
function LINE註冊38_7文字_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
