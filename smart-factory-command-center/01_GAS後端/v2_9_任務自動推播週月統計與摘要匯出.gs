/**
 * v2.9.0 任務自動推播、週/月統計與主管摘要匯出工具
 * 用途：建立每日自動推播任務摘要、逾期任務推播、任務週/月完成率統計、主管摘要 PDF/CSV 匯出。
 * 使用方式：與 v2_8_任務績效趨勢與主管摘要整合.gs 放同一個 Apps Script 專案。
 */

const v2_9_設定表名 = '00_任務自動推播設定';
const v2_9_設定欄位 = ['設定項目','設定值','備註','更新時間'];

function 升級_v2_9_任務自動推播設定表() {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName(v2_9_設定表名);
  if (!sh) sh = ss.insertSheet(v2_9_設定表名);
  const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  v2_9_設定欄位.forEach(欄名 => {
    if (!現有.includes(欄名)) sh.getRange(1, sh.getLastColumn() + 1).setValue(欄名);
  });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  v2_9_寫入設定_('LINE任務推播目標ID', '', 'LINE userId 或 groupId');
  v2_9_寫入設定_('每日任務摘要推播小時', '8', '0~23，預設 8 點');
  v2_9_寫入設定_('每日任務摘要啟用', '否', '是 / 否');
  v2_9_寫入設定_('任務逾期推播啟用', '否', '是 / 否');
  return { 成功: true, 版本: 'v2.9.0', 訊息: '任務自動推播設定表升級完成' };
}

function 設定_v2_9_任務自動推播(資料) {
  升級_v2_9_任務自動推播設定表();
  v2_9_寫入設定_('LINE任務推播目標ID', 資料.目標ID || '', 'LINE userId 或 groupId');
  v2_9_寫入設定_('每日任務摘要推播小時', String(資料.推播小時 || 8), '0~23');
  v2_9_寫入設定_('每日任務摘要啟用', 資料.每日摘要啟用 || '否', '是 / 否');
  v2_9_寫入設定_('任務逾期推播啟用', 資料.逾期推播啟用 || '否', '是 / 否');
  建立_v2_9_每日任務摘要觸發器();
  return { 成功: true, 訊息: '任務自動推播設定已更新' };
}

function 建立_v2_9_每日任務摘要觸發器() {
  const hour = Number(v2_9_讀取設定_('每日任務摘要推播小時') || 8);
  ScriptApp.getProjectTriggers().forEach(t => {
    if (['每日執行_v2_9_任務摘要推播', '每日執行_v2_9_任務逾期推播'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('每日執行_v2_9_任務摘要推播').timeBased().everyDays(1).atHour(hour).create();
  ScriptApp.newTrigger('每日執行_v2_9_任務逾期推播').timeBased().everyDays(1).atHour(Math.min(hour + 1, 23)).create();
  return { 成功: true, 訊息: '每日任務摘要與逾期推播觸發器已建立', 小時: hour };
}

function 每日執行_v2_9_任務摘要推播() {
  if (v2_9_讀取設定_('每日任務摘要啟用') !== '是') return { 成功: false, 訊息: '每日任務摘要未啟用' };
  const target = v2_9_讀取設定_('LINE任務推播目標ID');
  const text = 產生_v2_7_任務週報文字();
  return v2_9_LINE推播文字_(target, text);
}

function 每日執行_v2_9_任務逾期推播() {
  if (v2_9_讀取設定_('任務逾期推播啟用') !== '是') return { 成功: false, 訊息: '任務逾期推播未啟用' };
  const target = v2_9_讀取設定_('LINE任務推播目標ID');
  return 推播_v2_8_LINE任務逾期清單(target);
}

function 取得_v2_9_任務週月完成率統計() {
  const list = 表格轉物件_('10_跨部門待辦任務');
  const weekMap = {};
  const monthMap = {};
  list.forEach(x => {
    const d = new Date(x['建立時間'] || x['更新時間'] || new Date());
    const week = v2_9_週代碼_(d);
    const month = Utilities.formatDate(isNaN(d) ? new Date() : d, 'Asia/Taipei', 'yyyy-MM');
    v2_9_累加統計_(weekMap, week, x);
    v2_9_累加統計_(monthMap, month, x);
  });
  const 週統計 = Object.keys(weekMap).sort().map(k => v2_9_完成率_(weekMap[k]));
  const 月統計 = Object.keys(monthMap).sort().map(k => v2_9_完成率_(monthMap[k]));
  return { 成功: true, 版本: 'v2.9.0', 週統計, 月統計 };
}

function 匯出_v2_9_主管摘要CSV(摘要文字) {
  const text = String(摘要文字 || 產生_v2_8_主管摘要任務段落());
  const rows = text.split('\n').map((line, i) => ({ 序號: i + 1, 內容: line }));
  const csv = '序號,內容\n' + rows.map(r => `${r.序號},"${String(r.內容).replace(/"/g, '""')}"`).join('\n');
  const file = DriveApp.createFile('主管摘要_' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmmss') + '.csv', '\ufeff' + csv, MimeType.CSV);
  return { 成功: true, 訊息: '主管摘要CSV已建立', 檔名: file.getName(), 檔案ID: file.getId(), 連結: file.getUrl() };
}

function 匯出_v2_9_主管摘要PDF(摘要文字) {
  const text = String(摘要文字 || 產生_v2_8_主管摘要任務段落());
  const html = '<html><head><meta charset="utf-8"><style>body{font-family:Arial,"Noto Sans TC",sans-serif;line-height:1.7;padding:28px}h1{font-size:22px}pre{white-space:pre-wrap;font-size:13px}</style></head><body><h1>主管會議摘要</h1><pre>' + v2_9_HTML轉義_(text) + '</pre></body></html>';
  const blob = Utilities.newBlob(html, 'text/html', '主管摘要.html').getAs(MimeType.PDF);
  const file = DriveApp.createFile(blob).setName('主管摘要_' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmmss') + '.pdf');
  return { 成功: true, 訊息: '主管摘要PDF已建立', 檔名: file.getName(), 檔案ID: file.getId(), 連結: file.getUrl() };
}

function v2_9_LINE推播文字_(target, text) {
  if (!target) return { 成功: false, 訊息: '缺少 LINE 目標ID', 預覽: text };
  if (!系統設定.LINE_CHANNEL_ACCESS_TOKEN) return { 成功: false, 訊息: '尚未設定 LINE_CHANNEL_ACCESS_TOKEN', 預覽: text };
  const payload = { to: target, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] };
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + 系統設定.LINE_CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  return { 成功: true, 狀態碼: res.getResponseCode(), 回應: res.getContentText() };
}

function v2_9_寫入設定_(key, value, note) {
  const ss = 取得試算表_();
  const sh = ss.getSheetByName(v2_9_設定表名);
  const data = sh.getDataRange().getValues();
  const header = data[0];
  const idx = {}; header.forEach((h, i) => idx[h] = i);
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx['設定項目']]) === String(key)) {
      sh.getRange(r + 1, idx['設定值'] + 1).setValue(value);
      sh.getRange(r + 1, idx['備註'] + 1).setValue(note || '');
      sh.getRange(r + 1, idx['更新時間'] + 1).setValue(new Date());
      return;
    }
  }
  sh.appendRow([key, value, note || '', new Date()]);
}

function v2_9_讀取設定_(key) {
  const ss = 取得試算表_();
  const sh = ss.getSheetByName(v2_9_設定表名);
  if (!sh) return '';
  const data = sh.getDataRange().getValues();
  const header = data[0];
  const idx = {}; header.forEach((h, i) => idx[h] = i);
  for (let r = 1; r < data.length; r++) if (String(data[r][idx['設定項目']]) === String(key)) return data[r][idx['設定值']];
  return '';
}

function v2_9_週代碼_(date) {
  const d = isNaN(date) ? new Date() : new Date(date);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + String(week).padStart(2, '0');
}

function v2_9_累加統計_(map, key, x) {
  if (!map[key]) map[key] = { 期間: key, 任務數: 0, 完成數: 0, 逾期數: 0, 完成率: 0 };
  map[key].任務數++;
  if (String(x['任務狀態'] || '') === '完成') map[key].完成數++;
  if (typeof v2_8_是否逾期_ === 'function' && v2_8_是否逾期_(x)) map[key].逾期數++;
}

function v2_9_完成率_(r) {
  r.完成率 = r.任務數 ? Math.round(r.完成數 / r.任務數 * 1000) / 10 : 0;
  return r;
}

function v2_9_HTML轉義_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function 測試_v2_9_週月統計() {
  return 取得_v2_9_任務週月完成率統計();
}
