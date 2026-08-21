/**
 * 化新精密｜智慧5S管理平台
 * 5S_動態稽核LINE提醒_v1.1.0
 *
 * 功能：
 * 1. 讀取「5S_稽核週期」，找出今天到期或逾期的區域。
 * 2. 依「5S_區域主檔」的 LINE群組識別碼分組推播。
 * 3. 同一天、同一區域只提醒一次，使用「5S_通知紀錄」去重。
 * 4. 支援建立每日 08:00 的 GAS 時間觸發器；可由參數調整小時。
 * 5. 只使用既有唯一 LINE Bot；Token 從 Script Properties 讀取，禁止寫死在程式碼。
 *
 * 必要 Script Property：
 * - LINE_CHANNEL_ACCESS_TOKEN
 *
 * 可選 Script Property：
 * - 智慧5S_PWA網址
 *
 * API action：
 * - 5S動態稽核健康檢查
 * - 5S執行稽核到期提醒
 * - 5S建立每日稽核提醒觸發器
 * - 5S刪除每日稽核提醒觸發器
 */

var 智慧5S動態稽核_試算表ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S動態稽核_觸發函數_ = '智慧5S_自動執行每日稽核提醒';

function 智慧5S動態稽核_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '5S動態稽核健康檢查') {
    return {
      ok: true,
      模組: '5S_動態稽核LINE提醒',
      版本: 'v1.1.0',
      試算表ID: 智慧5S動態稽核_試算表ID_,
      時間: 智慧5S動態稽核_現在_()
    };
  }
  if (action === '5S執行稽核到期提醒') return 智慧5S_執行稽核到期提醒(payload);
  if (action === '5S建立每日稽核提醒觸發器') return 智慧5S_建立每日稽核提醒觸發器(payload);
  if (action === '5S刪除每日稽核提醒觸發器') return 智慧5S_刪除每日稽核提醒觸發器();
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
    var shLog = 智慧5S動態稽核_確保工作表_(
      ss,
      '5S_通知紀錄',
      ['通知編號','通知場景','對象類型','對象識別碼','訊息類型','內容摘要','狀態','送出時間','錯誤訊息','去重鍵']
    );

    if (!shCycle || shCycle.getLastRow() < 2) {
      return { ok: true, message: '5S_稽核週期目前沒有待檢查資料', 待提醒區域: 0 };
    }

    var today = String(payload['日期'] || '').trim() || 智慧5S動態稽核_日期_(new Date());
    var dryRun = payload['測試模式'] === true || String(payload['測試模式'] || '').toUpperCase() === 'TRUE';
    var force = payload['強制重送'] === true || String(payload['強制重送'] || '').toUpperCase() === 'TRUE';
    var now = 智慧5S動態稽核_現在_();
    var cycleRows = 智慧5S動態稽核_讀工作表_(shCycle);
    var areaRows = shArea ? 智慧5S動態稽核_讀工作表_(shArea) : [];
    var sentKeys = 智慧5S動態稽核_取得已送出去重鍵_(shLog);

    var due = cycleRows.filter(function(r) {
      var next = 智慧5S動態稽核_日期_(r['下次稽核日']);
      if (!next) return false;
      var status = String(r['狀態'] || '').trim();
      if (status === '停用' || status === '免稽核') return false;
      return next <= today;
    });

    if (!due.length) {
      return { ok: true, message: '今天沒有到期或逾期的5S稽核', 日期: today, 待提醒區域: 0 };
    }

    var groups = {};
    due.forEach(function(r) {
      var areaCode = String(r['區域代碼'] || '').trim();
      var area = 智慧5S動態稽核_找區域_(areaRows, areaCode);
      var groupId = String((area && area['LINE群組識別碼']) || '').trim();
      if (!groupId) groupId = 智慧5S動態稽核_取得預設群組_(areaRows);
      if (!groupId) return;
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(r);
    });

    var token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
    if (!dryRun && !token) {
      throw new Error('缺少 Script Property：LINE_CHANNEL_ACCESS_TOKEN');
    }

    var groupIds = Object.keys(groups);
    if (!groupIds.length) {
      return { ok: false, message: '找到到期稽核，但區域主檔沒有 LINE群組識別碼', 日期: today, 待提醒區域: due.length };
    }

    var success = 0;
    var skipped = 0;
    var fail = 0;
    var details = [];

    groupIds.forEach(function(groupId) {
      var rows = groups[groupId];
      var sendRows = rows.filter(function(r) {
        var key = 智慧5S動態稽核_去重鍵_(today, r['區域代碼']);
        if (!force && sentKeys[key]) {
          skipped++;
          return false;
        }
        return true;
      });

      if (!sendRows.length) return;

      var message = 智慧5S動態稽核_建立訊息_(today, sendRows);
      try {
        if (!dryRun) 智慧5S動態稽核_推播_(token, groupId, message);

        sendRows.forEach(function(r) {
          var key = 智慧5S動態稽核_去重鍵_(today, r['區域代碼']);
          智慧5S動態稽核_寫通知_(shLog, {
            通知編號: '5S-AUD-' + Utilities.getUuid().replace(/-/g, '').slice(0, 14).toUpperCase(),
            通知場景: '5S稽核到期提醒',
            對象類型: 'LINE群組',
            對象識別碼: groupId,
            訊息類型: dryRun ? '測試推播' : '稽核提醒',
            內容摘要: 智慧5S動態稽核_摘要_(r),
            狀態: dryRun ? '測試完成' : '已發送',
            送出時間: now,
            錯誤訊息: '',
            去重鍵: key
          });
          sentKeys[key] = true;
          success++;
        });
        details.push({ LINE群組識別碼: groupId, 筆數: sendRows.length, 狀態: dryRun ? '測試完成' : '已發送' });
      } catch (err) {
        fail += sendRows.length;
        var em = String(err && err.message ? err.message : err);
        sendRows.forEach(function(r) {
          智慧5S動態稽核_寫通知_(shLog, {
            通知編號: '5S-AUD-ERR-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase(),
            通知場景: '5S稽核到期提醒',
            對象類型: 'LINE群組',
            對象識別碼: groupId,
            訊息類型: '稽核提醒',
            內容摘要: 智慧5S動態稽核_摘要_(r),
            狀態: '發送失敗',
            送出時間: now,
            錯誤訊息: em,
            去重鍵: 智慧5S動態稽核_去重鍵_(today, r['區域代碼'])
          });
        });
        details.push({ LINE群組識別碼: groupId, 筆數: sendRows.length, 狀態: '發送失敗', 錯誤: em });
      }
    });

    return {
      ok: fail === 0,
      message: '5S稽核提醒完成：成功 ' + success + '，已去重 ' + skipped + '，失敗 ' + fail,
      日期: today,
      到期區域: due.length,
      成功筆數: success,
      去重筆數: skipped,
      失敗筆數: fail,
      測試模式: dryRun,
      明細: details,
      時間: now
    };
  } finally {
    lock.releaseLock();
  }
}

function 智慧5S_建立每日稽核提醒觸發器(payload) {
  payload = payload || {};
  var hour = Number(payload['小時']);
  if (!isFinite(hour)) hour = 8;
  hour = Math.max(0, Math.min(23, Math.floor(hour)));

  智慧5S_刪除每日稽核提醒觸發器();
  var trigger = ScriptApp.newTrigger(智慧5S動態稽核_觸發函數_)
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();

  return {
    ok: true,
    message: '已建立智慧5S每日稽核提醒觸發器',
    執行小時: hour,
    觸發函數: 智慧5S動態稽核_觸發函數_,
    觸發器ID: String(trigger.getUniqueId ? trigger.getUniqueId() : ''),
    時間: 智慧5S動態稽核_現在_()
  };
}

function 智慧5S_刪除每日稽核提醒觸發器() {
  var count = 0;
  ScriptApp.getProjectTriggers().forEach(function(tr) {
    if (tr.getHandlerFunction() === 智慧5S動態稽核_觸發函數_) {
      ScriptApp.deleteTrigger(tr);
      count++;
    }
  });
  return { ok: true, message: '已刪除智慧5S每日稽核提醒觸發器 ' + count + ' 個', 刪除數: count };
}

function 智慧5S動態稽核_建立訊息_(today, rows) {
  var lines = [];
  lines.push('【智慧5S｜稽核到期提醒】');
  lines.push('日期：' + today);
  lines.push('');

  rows.slice(0, 20).forEach(function(r, index) {
    var next = 智慧5S動態稽核_日期_(r['下次稽核日']);
    var days = 智慧5S動態稽核_逾期天數_(next, today);
    var prefix = days > 0 ? '🔴 逾期' + days + '天' : '🟡 今日到期';
    lines.push((index + 1) + '. ' + prefix + '｜' + String(r['區域名稱'] || r['區域代碼'] || '未命名區域'));
    lines.push('   頻率：' + String(r['目前頻率'] || '未設定') + '｜最近：' + String(r['最近得分'] || '尚無分數') + '分');
  });

  if (rows.length > 20) lines.push('另有 ' + (rows.length - 20) + ' 個區域未顯示');

  var pwa = String(PropertiesService.getScriptProperties().getProperty('智慧5S_PWA網址') || '').trim();
  if (pwa) {
    lines.push('');
    lines.push('開啟智慧5S：' + pwa);
  }
  lines.push('');
  lines.push('規則：新建區7天；連續3次≥85改14天；連續3次≥90改30天；低於80恢復7天；重大異常3天複查。');
  return lines.join('\n').slice(0, 4900);
}

function 智慧5S動態稽核_推播_(token, target, message) {
  if (typeof LINE每日戰情推播_送出LINE_ === 'function') {
    LINE每日戰情推播_送出LINE_(token, [target], message);
    return;
  }

  var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: target, messages: [{ type: 'text', text: message }] }),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('LINE API HTTP ' + code + '：' + res.getContentText());
  }
}

function 智慧5S動態稽核_讀工作表_(sh) {
  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 1) return [];
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(x) { return String(x || '').trim(); });
  return values.slice(1).map(function(row, index) {
    var obj = { _列號: index + 2 };
    headers.forEach(function(h, i) { if (h) obj[h] = row[i]; });
    return obj;
  });
}

function 智慧5S動態稽核_找區域_(rows, areaCode) {
  var code = String(areaCode || '').trim();
  var exact = rows.filter(function(r) { return String(r['區域代碼'] || '').trim() === code; })[0];
  if (exact) return exact;
  var root = code.split('-')[0];
  return rows.filter(function(r) { return String(r['區域代碼'] || '').trim().split('-')[0] === root; })[0] || null;
}

function 智慧5S動態稽核_取得預設群組_(areaRows) {
  for (var i = 0; i < areaRows.length; i++) {
    var id = String(areaRows[i]['LINE群組識別碼'] || '').trim();
    if (id) return id;
  }
  return '';
}

function 智慧5S動態稽核_取得已送出去重鍵_(sh) {
  var result = {};
  智慧5S動態稽核_讀工作表_(sh).forEach(function(r) {
    var key = String(r['去重鍵'] || '').trim();
    var st = String(r['狀態'] || '').trim();
    if (key && (st === '已發送' || st === '測試完成')) result[key] = true;
  });
  return result;
}

function 智慧5S動態稽核_寫通知_(sh, obj) {
  var headers = ['通知編號','通知場景','對象類型','對象識別碼','訊息類型','內容摘要','狀態','送出時間','錯誤訊息','去重鍵'];
  sh.appendRow(headers.map(function(h) { return obj[h] == null ? '' : obj[h]; }));
}

function 智慧5S動態稽核_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function 智慧5S動態稽核_摘要_(r) {
  return '區域：' + String(r['區域名稱'] || r['區域代碼'] || '') +
    '｜下次稽核：' + 智慧5S動態稽核_日期_(r['下次稽核日']) +
    '｜頻率：' + String(r['目前頻率'] || '') +
    '｜最近得分：' + String(r['最近得分'] || '尚無');
}

function 智慧5S動態稽核_去重鍵_(today, areaCode) {
  return '5S-AUD-' + String(today || '').replace(/-/g, '') + '-' + String(areaCode || '').trim();
}

function 智慧5S動態稽核_逾期天數_(due, today) {
  if (!due || !today) return 0;
  var a = new Date(due + 'T12:00:00');
  var b = new Date(today + 'T12:00:00');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function 智慧5S動態稽核_日期_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var text = String(value || '').trim();
  var match = text.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (match) return match[1] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[3]).slice(-2);
  return text.slice(0, 10);
}

function 智慧5S動態稽核_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}
