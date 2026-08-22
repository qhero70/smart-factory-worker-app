/**
 * 化新精密｜製一｜智慧5S
 * 5S 動態稽核 LINE 提醒 v1.2.0
 *
 * 改版重點：
 * 1. LINE 不再一次列出全部機台；改為區域摘要 + 最優先 8 項。
 * 2. 「開啟製一｜智慧5S」入口固定導向 v=1200，不再使用舊 v=103。
 * 3. 到期/逾期依 5S_稽核週期 自動判斷，同日同區域去重。
 * 4. 仍使用既有唯一 LINE Bot；Token 只讀 Script Properties。
 *
 * 注意：本檔需同步到正式 Apps Script 並重新部署/儲存後，LINE 正式環境才會生效。
 */

var 智慧5S動態稽核_版本_ = 'v1.2.0';
var 智慧5S動態稽核_試算表ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S動態稽核_觸發函數_ = '智慧5S_自動執行每日稽核提醒';
var 智慧5S動態稽核_正式入口_ = 'https://qhero70.github.io/smart-factory-worker-app/5s/';
var 智慧5S動態稽核_入口版本_ = '1200';

function 智慧5S動態稽核_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '5S動態稽核健康檢查') return {
    ok: true, 模組: '5S_動態稽核LINE提醒', 版本: 智慧5S動態稽核_版本_,
    試算表ID: 智慧5S動態稽核_試算表ID_, PWA: 智慧5S動態稽核_取得PWA網址_(), 時間: 智慧5S動態稽核_現在_()
  };
  if (action === '5S執行稽核到期提醒') return 智慧5S_執行稽核到期提醒(payload);
  if (action === '5S建立每日稽核提醒觸發器') return 智慧5S_建立每日稽核提醒觸發器(payload);
  if (action === '5S刪除每日稽核提醒觸發器') return 智慧5S_刪除每日稽核提醒觸發器();
  if (action === '5S預覽精簡LINE提醒') return 智慧5S_預覽精簡LINE提醒(payload);
  return null;
}

function 智慧5S_自動執行每日稽核提醒() {
  return 智慧5S_執行稽核到期提醒({ 來源: '時間觸發器' });
}

function 智慧5S_執行稽核到期提醒(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(智慧5S動態稽核_試算表ID_);
    var shCycle = ss.getSheetByName('5S_稽核週期');
    var shArea = ss.getSheetByName('5S_區域主檔');
    var shLog = 智慧5S動態稽核_確保工作表_(ss, '5S_通知紀錄', ['通知編號','通知場景','對象類型','對象識別碼','訊息類型','內容摘要','狀態','送出時間','錯誤訊息','去重鍵']);
    if (!shCycle || shCycle.getLastRow() < 2) return { ok:true, message:'5S_稽核週期目前沒有資料', 待提醒區域:0 };

    var today = String(payload['日期'] || '').trim() || 智慧5S動態稽核_日期_(new Date());
    var dryRun = payload['測試模式'] === true || String(payload['測試模式'] || '').toUpperCase() === 'TRUE';
    var force = payload['強制重送'] === true || String(payload['強制重送'] || '').toUpperCase() === 'TRUE';
    var now = 智慧5S動態稽核_現在_();
    var cycleRows = 智慧5S動態稽核_讀工作表_(shCycle);
    var areaRows = shArea ? 智慧5S動態稽核_讀工作表_(shArea) : [];
    var sentKeys = 智慧5S動態稽核_取得已送出去重鍵_(shLog);

    var due = cycleRows.filter(function(r) {
      var next = 智慧5S動態稽核_日期_(r['下次稽核日']);
      var status = String(r['狀態'] || '').trim();
      return !!next && status !== '停用' && status !== '免稽核' && next <= today;
    });
    if (!due.length) return { ok:true, message:'今天沒有到期或逾期的5S稽核', 日期:today, 待提醒區域:0 };

    var groups = {};
    due.forEach(function(r) {
      var code = String(r['區域代碼'] || '').trim();
      var area = 智慧5S動態稽核_找區域_(areaRows, code);
      var groupId = String((area && area['LINE群組識別碼']) || '').trim() || 智慧5S動態稽核_取得預設群組_(areaRows);
      if (!groupId) return;
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(r);
    });

    var token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
    if (!dryRun && !token) throw new Error('缺少 Script Property：LINE_CHANNEL_ACCESS_TOKEN');
    var groupIds = Object.keys(groups);
    if (!groupIds.length) return { ok:false, message:'找到到期稽核，但區域主檔沒有 LINE群組識別碼', 日期:today, 待提醒區域:due.length };

    var success = 0, skipped = 0, fail = 0, details = [];
    groupIds.forEach(function(groupId) {
      var sendRows = groups[groupId].filter(function(r) {
        var key = 智慧5S動態稽核_去重鍵_(today, r['區域代碼']);
        if (!force && sentKeys[key]) { skipped++; return false; }
        return true;
      });
      if (!sendRows.length) return;
      var message = 智慧5S動態稽核_建立訊息_(today, sendRows);
      try {
        if (!dryRun) 智慧5S動態稽核_推播_(token, groupId, message);
        sendRows.forEach(function(r) {
          var key = 智慧5S動態稽核_去重鍵_(today, r['區域代碼']);
          智慧5S動態稽核_寫通知_(shLog, {
            通知編號:'5S-PATROL-' + Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase(),
            通知場景:'5S稽核到期提醒', 對象類型:'LINE群組', 對象識別碼:groupId,
            訊息類型:dryRun ? '測試推播' : '稽核提醒', 內容摘要:智慧5S動態稽核_摘要_(r),
            狀態:dryRun ? '測試完成' : '已發送', 送出時間:now, 錯誤訊息:'', 去重鍵:key
          });
          sentKeys[key] = true; success++;
        });
        details.push({ LINE群組識別碼:groupId, 筆數:sendRows.length, 狀態:dryRun?'測試完成':'已發送' });
      } catch (err) {
        var em = String(err && err.message ? err.message : err); fail += sendRows.length;
        sendRows.forEach(function(r) {
          智慧5S動態稽核_寫通知_(shLog, {
            通知編號:'5S-PATROL-ERR-' + Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase(),
            通知場景:'5S稽核到期提醒', 對象類型:'LINE群組', 對象識別碼:groupId,
            訊息類型:'稽核提醒', 內容摘要:智慧5S動態稽核_摘要_(r), 狀態:'發送失敗', 送出時間:now,
            錯誤訊息:em, 去重鍵:智慧5S動態稽核_去重鍵_(today,r['區域代碼'])
          });
        });
        details.push({ LINE群組識別碼:groupId, 筆數:sendRows.length, 狀態:'發送失敗', 錯誤:em });
      }
    });

    return { ok:fail===0, message:'5S稽核提醒完成：成功 '+success+'，已去重 '+skipped+'，失敗 '+fail, 日期:today, 到期區域:due.length, 成功筆數:success, 去重筆數:skipped, 失敗筆數:fail, 測試模式:dryRun, 明細:details, 時間:now };
  } finally { lock.releaseLock(); }
}

function 智慧5S動態稽核_建立訊息_(today, rows) {
  var sorted = rows.slice().sort(function(a,b){
    return String(a['下次稽核日']||'').localeCompare(String(b['下次稽核日']||''));
  });
  var byArea = {};
  sorted.forEach(function(r){
    var code = String(r['區域代碼'] || '').trim();
    var root = code.split('-')[0] || '其他';
    byArea[root] = (byArea[root] || 0) + 1;
  });
  var areaSummary = Object.keys(byArea).sort().map(function(k){ return k + ' ' + byArea[k] + '項'; }).join('｜');
  var lines = sorted.slice(0,8).map(function(r){
    var code = String(r['區域代碼'] || '').trim();
    var next = 智慧5S動態稽核_日期_(r['下次稽核日']);
    var cycle = String(r['目前週期天數'] || '').trim();
    var overdue = 智慧5S動態稽核_相差天數_(next,today);
    var status = overdue > 0 ? '逾期'+overdue+'天' : '今天到期';
    return '• ' + code + '｜' + status + (cycle ? '｜'+cycle+'天週期' : '');
  });
  var more = sorted.length > 8 ? '\n…其餘 ' + (sorted.length - 8) + ' 項請進系統查看' : '';
  return [
    '🧹 製一｜智慧5S 稽核提醒',
    '日期：' + today,
    '待巡檢：' + sorted.length + ' 項',
    areaSummary ? '區域：' + areaSummary : '',
    '',
    '優先處理：',
    lines.join('\n') + more,
    '',
    '完成巡檢後，後續提醒會自動停止。',
    '開啟製一｜智慧5S：' + 智慧5S動態稽核_取得PWA網址_()
  ].filter(function(x){ return x !== ''; }).join('\n');
}

function 智慧5S_預覽精簡LINE提醒(payload) {
  payload = payload || {};
  var ss = SpreadsheetApp.openById(智慧5S動態稽核_試算表ID_);
  var sh = ss.getSheetByName('5S_稽核週期');
  if (!sh || sh.getLastRow()<2) return {ok:false,message:'沒有稽核週期資料'};
  var today = String(payload['日期']||'').trim() || 智慧5S動態稽核_日期_(new Date());
  var rows = 智慧5S動態稽核_讀工作表_(sh).filter(function(r){ var d=智慧5S動態稽核_日期_(r['下次稽核日']); return d && d<=today; });
  return {ok:true,版本:智慧5S動態稽核_版本_,筆數:rows.length,訊息:智慧5S動態稽核_建立訊息_(today,rows)};
}

function 智慧5S_建立每日稽核提醒觸發器(payload) {
  payload = payload || {};
  var hour = Number(payload['小時']);
  if (!isFinite(hour)) hour = 智慧5S動態稽核_讀提醒小時_();
  hour = Math.max(0,Math.min(23,Math.floor(hour)));
  智慧5S_刪除每日稽核提醒觸發器();
  var trigger = ScriptApp.newTrigger(智慧5S動態稽核_觸發函數_).timeBased().everyDays(1).atHour(hour).inTimezone('Asia/Taipei').create();
  return {ok:true,message:'已建立每日稽核提醒觸發器',小時:hour,觸發器ID:trigger.getUniqueId(),版本:智慧5S動態稽核_版本_};
}

function 智慧5S_刪除每日稽核提醒觸發器() {
  var removed=0;
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction()===智慧5S動態稽核_觸發函數_){ ScriptApp.deleteTrigger(t); removed++; } });
  return {ok:true,message:'已刪除每日稽核提醒觸發器 '+removed+' 個',刪除數:removed};
}

function 智慧5S動態稽核_讀提醒小時_() {
  try {
    var ss=SpreadsheetApp.openById(智慧5S動態稽核_試算表ID_), sh=ss.getSheetByName('5S_系統參數');
    if(!sh||sh.getLastRow()<2) return 8;
    var rows=智慧5S動態稽核_讀工作表_(sh), hit=rows.find(function(r){return String(r['參數鍵']||'').trim()==='動態稽核LINE提醒時間';});
    var m=hit?String(hit['參數值']||'').match(/(\d{1,2})/):null; return m?Number(m[1]):8;
  } catch(e){ return 8; }
}

function 智慧5S動態稽核_取得PWA網址_() {
  var raw = String(PropertiesService.getScriptProperties().getProperty('智慧5S_PWA網址') || 智慧5S動態稽核_正式入口_).trim();
  if (!raw) raw = 智慧5S動態稽核_正式入口_;
  raw = raw.replace(/([?&])v=\d+/g,'$1').replace(/[?&]+$/,'');
  raw = raw.replace(/([?&])頁面=[^&]*/g,'$1').replace(/([?&])來源=[^&]*/g,'$1').replace(/[?&]+$/,'');
  var sep = raw.indexOf('?') >= 0 ? '&' : '?';
  return raw + sep + '頁面=巡檢&來源=LINE&v=' + 智慧5S動態稽核_入口版本_;
}

function 智慧5S動態稽核_推播_(token, groupId, message) {
  var res=UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload:JSON.stringify({to:groupId,messages:[{type:'text',text:String(message).slice(0,4900)}]}),muteHttpExceptions:true});
  var code=res.getResponseCode(); if(code<200||code>=300) throw new Error('LINE API HTTP '+code+'：'+res.getContentText());
}

function 智慧5S動態稽核_讀工作表_(sh) {
  var values=sh.getDataRange().getValues(); if(!values.length) return [];
  var headers=values[0].map(function(x){return String(x).trim();});
  return values.slice(1).map(function(row){var o={};headers.forEach(function(h,i){o[h]=row[i];});return o;});
}
function 智慧5S動態稽核_找區域_(rows,code){return rows.find(function(r){return String(r['區域代碼']||'').trim()===String(code||'').trim();})||null;}
function 智慧5S動態稽核_取得預設群組_(rows){var hit=rows.find(function(r){return String(r['啟用']||'').trim()!=='否'&&String(r['LINE群組識別碼']||'').trim();});return hit?String(hit['LINE群組識別碼']).trim():'';}
function 智慧5S動態稽核_去重鍵_(date,code){return '5S_AUDIT_DUE|'+date+'|'+String(code||'').trim();}
function 智慧5S動態稽核_摘要_(r){return String(r['區域代碼']||'')+'｜'+String(r['目前週期天數']||'')+'天｜下次'+智慧5S動態稽核_日期_(r['下次稽核日']);}
function 智慧5S動態稽核_取得已送出去重鍵_(sh){var out={};if(!sh||sh.getLastRow()<2)return out;智慧5S動態稽核_讀工作表_(sh).forEach(function(r){var k=String(r['去重鍵']||'').trim();var s=String(r['狀態']||'').trim();if(k&&(s==='已發送'||s==='測試完成'))out[k]=true;});return out;}
function 智慧5S動態稽核_寫通知_(sh,data){var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(function(x){return String(x).trim();});sh.appendRow(headers.map(function(h){return data[h]!==undefined?data[h]:'';}));}
function 智慧5S動態稽核_確保工作表_(ss,name,headers){var sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.getRange(1,1,1,headers.length).setValues([headers]);return sh;}
function 智慧5S動態稽核_日期_(v){if(!v)return'';if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return Utilities.formatDate(v,'Asia/Taipei','yyyy-MM-dd');var s=String(v).trim();var m=s.match(/^(\d{4})[-\/]?(\d{1,2})[-\/]?(\d{1,2})/);return m?m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2):'';}
function 智慧5S動態稽核_相差天數_(fromDate,toDate){var a=new Date(fromDate+'T00:00:00+08:00'),b=new Date(toDate+'T00:00:00+08:00');return Math.max(0,Math.round((b-a)/86400000));}
function 智慧5S動態稽核_現在_(){return Utilities.formatDate(new Date(),'Asia/Taipei','yyyy-MM-dd HH:mm:ss');}
