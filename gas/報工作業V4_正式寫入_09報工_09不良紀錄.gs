/**
 * 報工作業 V4｜正式寫入 09_報工 / 09_不良紀錄
 * 版本：v4.8.2
 * 目的：讓 PWA 報工 V4 送出後，真正 append 到正式主資料庫，不再只顯示前端成功提示。
 */
var 報工V4_正式主資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';

function 報工作業V4_正式寫入_嘗試處理動作_(來源) {
  var p = 報工V4_解析輸入_(來源);
  var action = String(p.action || p['動作'] || p.method || '').trim();
  if (!action) return null;

  if (action === '寫入報工作業v2' || action === '寫入報工作業V4' || action === 'submitWorkReport' || action === '寫入現場報工V1') {
    return 報工V4_寫入報工_(p);
  }

  if (action === '寫入不良紀錄v2' || action === '寫入不良紀錄V4' || action === 'submitDefects') {
    return 報工V4_寫入不良_(p);
  }

  return null;
}

function 報工V4_解析輸入_(來源) {
  var p = {};
  if (!來源) return p;
  if (來源.parameter || 來源.postData) {
    var q = 來源.parameter || {};
    Object.keys(q).forEach(function(k){ p[k] = q[k]; });
    var body = 來源.postData && 來源.postData.contents ? String(來源.postData.contents) : '';
    if (body) {
      if (body.charAt(0) === '{') {
        try { Object.assign(p, JSON.parse(body)); } catch(e) {}
      } else {
        body.split('&').forEach(function(part){
          var a = part.split('=');
          if (!a[0]) return;
          p[decodeURIComponent(a[0].replace(/\+/g,' '))] = decodeURIComponent(String(a.slice(1).join('=' )).replace(/\+/g,' '));
        });
      }
    }
  } else {
    Object.assign(p, 來源);
  }
  ['payload','資料','json'].forEach(function(k){
    if (typeof p[k] === 'string' && p[k].charAt(0) === '{') {
      try { Object.assign(p, JSON.parse(p[k])); } catch(e) {}
    }
  });
  return p;
}

function 報工V4_寫入報工_(p) {
  var ss = SpreadsheetApp.openById(報工V4_正式主資料庫ID);
  var now = new Date();
  var reportId = 報工V4_字串_(p, ['報工編號','報工ID','reportId']);
  if (!reportId) reportId = 'RPT-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + 報工V4_字串_(p, ['工號','employeeId','operatorId']) + '-' + 報工V4_字串_(p, ['產品編號','productCode']);

  var total = 報工V4_數字_(p, ['今日共做數','共做','totalQty','total']);
  var ng = 報工V4_數字_(p, ['不良數量','不良數','ngQty','badQty']);
  var good = 報工V4_數字_(p, ['實際良品數','良品數','goodQty']);
  if (!good && total) good = Math.max(0, total - ng);

  var row = {
    '報工編號': reportId,
    '時間戳': now,
    '作業日': 報工V4_字串_(p, ['作業日','workDate']) || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    '派班編號': 報工V4_字串_(p, ['派班編號','dispatchId']),
    '來源需求編號': 報工V4_字串_(p, ['來源需求編號','需求編號','requirementId']),
    '工單編號': 報工V4_字串_(p, ['工單編號','工單號','工單','workOrderNo']),
    '工號': 報工V4_字串_(p, ['工號','employeeId','operatorId']),
    '姓名': 報工V4_字串_(p, ['姓名','operatorName','name']),
    '班別': 報工V4_字串_(p, ['班別','shift']),
    '產品編號': 報工V4_字串_(p, ['產品編號','productCode']),
    '客戶品號': 報工V4_字串_(p, ['客戶品號','customerPartNo']),
    '品名': 報工V4_字串_(p, ['品名','productName']),
    '工站名稱': 報工V4_字串_(p, ['工站名稱','報工工站名稱','workstationName','stationName']),
    '機台編號': 報工V4_字串_(p, ['機台編號','主機台','mainMachine','machineId']),
    '今日共做數': total,
    '產出數量': 報工V4_數字_(p, ['產出數量','outputQty']) || total,
    '不良數量': ng,
    '實際良品數': good,
    '開始時間': 報工V4_字串_(p, ['開始時間','startTime']),
    '結束時間': 報工V4_字串_(p, ['結束時間','endTime']),
    '實際工時': 報工V4_字串_(p, ['實際工時','workingHours','hours']),
    '狀態': '完成',
    '備註': 報工V4_字串_(p, ['備註','remarks','note']),
    '更新時間': now
  };

  var sh = ss.getSheetByName('09_報工');
  var appended = 報工V4_附加列_(sh, row);

  if (ng > 0) {
    var defectPayload = Object.assign({}, p, { 報工編號: reportId, 作業日: row['作業日'] });
    報工V4_寫入不良_(defectPayload);
  }

  SpreadsheetApp.flush();
  return { 成功:true, success:true, 訊息:'報工已寫入 09_報工', 報工編號:reportId, 寫入列號:appended, 工作表:'09_報工', 正式主資料庫ID:報工V4_正式主資料庫ID };
}

function 報工V4_寫入不良_(p) {
  var ss = SpreadsheetApp.openById(報工V4_正式主資料庫ID);
  var sh = ss.getSheetByName('09_不良紀錄');
  var now = new Date();
  var rows = 報工V4_取不良明細_(p);
  var count = 0;
  var reportId = 報工V4_字串_(p, ['報工編號','報工ID','reportId']);
  var codeMap = 報工V4_不良代碼索引_(ss);

  rows.forEach(function(x, idx){
    var code = String(x['不良代碼'] || x.code || 報工V4_字串_(p, ['不良代碼','defectCode'])).trim();
    var qty = Number(x['不良數量'] || x.qty || x.quantity || 報工V4_數字_(p, ['不良數量','不良數','ngQty','badQty']) || 0);
    if (!code || qty <= 0) return;
    var master = codeMap[code] || {};
    var id = 'NG-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + reportId + '-' + code + '-' + (idx+1);
    var row = {
      '不良編號': id,
      '時間戳': now,
      '報工編號': reportId,
      '工單編號': 報工V4_字串_(p, ['工單編號','工單號','工單','workOrderNo']),
      '工號': 報工V4_字串_(p, ['工號','employeeId','operatorId']),
      '姓名': 報工V4_字串_(p, ['姓名','operatorName','name']),
      '班別': 報工V4_字串_(p, ['班別','shift']),
      '產品編號': 報工V4_字串_(p, ['產品編號','productCode']),
      '客戶品號': 報工V4_字串_(p, ['客戶品號','customerPartNo']),
      '品名': 報工V4_字串_(p, ['品名','productName']),
      '工站名稱': 報工V4_字串_(p, ['工站名稱','報工工站名稱','workstationName','stationName']),
      '工序': 報工V4_字串_(p, ['工序','工序範圍','processRange']),
      '機台清單': 報工V4_字串_(p, ['機台清單','machineList']),
      '主機台': 報工V4_字串_(p, ['主機台','mainMachine','machineId','機台編號']),
      '不良代碼': code,
      '不良名稱': x['不良名稱'] || x.name || master['不良名稱'] || '',
      '英文名稱': x['英文名稱'] || x.english || master['英文名稱'] || '',
      '不良數量': qty,
      '責任歸屬': x['責任歸屬'] || master['責任歸屬'] || '',
      '異常類型': 報工V4_字串_(p, ['異常類型','abnormalType']) || '無異常',
      '異常開始時間': 報工V4_字串_(p, ['異常開始時間','abnormalStart']),
      '異常結束時間': 報工V4_字串_(p, ['異常結束時間','abnormalEnd']),
      '異常工時': 報工V4_字串_(p, ['異常工時','abnormalHours']),
      '備註': 報工V4_字串_(p, ['備註','remarks','note']),
      '更新時間': now
    };
    報工V4_附加列_(sh, row);
    count++;
  });

  SpreadsheetApp.flush();
  return { 成功:true, success:true, 訊息:'不良紀錄已寫入 09_不良紀錄', 報工編號:reportId, 寫入筆數:count, 工作表:'09_不良紀錄', 正式主資料庫ID:報工V4_正式主資料庫ID };
}

function 報工V4_取不良明細_(p) {
  var src = p['不良明細'] || p['不良行清單'] || p.defects || p.defectRows;
  if (typeof src === 'string') { try { src = JSON.parse(src); } catch(e) {} }
  if (Array.isArray(src)) return src;
  return [{ 不良代碼:報工V4_字串_(p, ['不良代碼','defectCode']), 不良數量:報工V4_數字_(p, ['不良數量','不良數','ngQty','badQty']) }];
}

function 報工V4_不良代碼索引_(ss) {
  var sh = ss.getSheetByName('05_不良代碼主檔');
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  var values = sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues();
  var head = values[0].map(String);
  values.slice(1).forEach(function(r){
    var o = {};
    head.forEach(function(h,i){ o[h] = r[i]; });
    var code = String(o['不良代碼'] || '').trim();
    if (code) out[code] = o;
  });
  return out;
}

function 報工V4_附加列_(sh, obj) {
  if (!sh) throw new Error('找不到目標分頁');
  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  var row = headers.map(function(h){ return obj[h] == null ? '' : obj[h]; });
  sh.appendRow(row);
  return sh.getLastRow();
}

function 報工V4_字串_(p, keys) {
  for (var i=0;i<keys.length;i++) {
    var v = p[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function 報工V4_數字_(p, keys) {
  var v = 報工V4_字串_(p, keys);
  if (!v) return 0;
  return Number(String(v).replace(/[^0-9.\-]/g,'')) || 0;
}
