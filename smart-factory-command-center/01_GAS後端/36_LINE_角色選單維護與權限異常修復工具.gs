/**
 * 36_LINE｜角色選單維護與權限異常修復工具
 * 版本：v1.7.3
 * 目的：查詢、掃描、修復 LINE 個人 Rich Menu 與 33_LINE 身份權限不一致問題。
 */

const LINE選單維護36_版本 = 'v1.7.3_36_LINE角色選單維護與權限異常修復工具';
const LINE選單維護36_掃描表 = '36_LINE選單維護掃描';
const LINE選單維護36_掃描欄位 = ['掃描時間', 'LINE_USER_ID', '工號', '姓名', '角色', '權限等級', '啟用', '應套用選單', '應套用richMenuId', '目前richMenuId', '判斷結果', '修復建議', '備註'];
const LINE選單維護36_紀錄表 = '36_LINE選單維護紀錄';
const LINE選單維護36_紀錄欄位 = ['時間戳', '動作', 'LINE_USER_ID', '工號', '姓名', '目標選單', 'richMenuId', '結果', '備註'];

function 初始化36_LINE角色選單維護與權限異常修復工具() {
  const ss = 取得試算表_();
  LINE選單維護36_建立或修復表_(ss, LINE選單維護36_掃描表, LINE選單維護36_掃描欄位);
  LINE選單維護36_建立或修復表_(ss, LINE選單維護36_紀錄表, LINE選單維護36_紀錄欄位);
  LINE選單維護36_寫入紀錄_('初始化', { LINE_USER_ID: 'SYSTEM', 工號: '', 姓名: '' }, '系統', '', '完成', LINE選單維護36_版本);
  return { 成功: true, 訊息: '36_LINE角色選單維護與權限異常修復工具初始化完成', 版本: LINE選單維護36_版本, 工作表: [LINE選單維護36_掃描表, LINE選單維護36_紀錄表] };
}

function 掃描36_LINE權限與選單異常() {
  初始化36_LINE角色選單維護與權限異常修復工具();
  const rows = LINE選單維護36_取得身份資料_();
  const scanRows = [];
  const 異常 = [];
  rows.forEach(function(r) {
    const expected = LINE選單維護36_判斷應套用選單_(r);
    const current = LINE選單維護36_查詢使用者RichMenuId_(r.LINE_USER_ID);
    const result = LINE選單維護36_判斷掃描結果_(r, expected, current);
    const item = {
      掃描時間: new Date(), LINE_USER_ID: r.LINE_USER_ID, 工號: r.工號, 姓名: r.姓名,
      角色: r.角色, 權限等級: r.權限等級, 啟用: r.啟用 || '是',
      應套用選單: expected.目標選單, 應套用richMenuId: expected.richMenuId,
      目前richMenuId: current.richMenuId || '', 判斷結果: result.判斷結果,
      修復建議: result.修復建議, 備註: current.備註 || ''
    };
    scanRows.push(item);
    if (result.判斷結果 !== '正常') 異常.push(item);
  });
  LINE選單維護36_寫入掃描表_(scanRows);
  LINE選單維護36_寫入紀錄_('掃描全部使用者', { LINE_USER_ID: 'SYSTEM' }, '全部', '', '完成', '總數=' + rows.length + '；異常=' + 異常.length);
  return { 成功: true, 訊息: '掃描完成', 總數: rows.length, 異常數: 異常.length, 異常: 異常.slice(0, 30) };
}

function 修復36_LINE全部使用者選單() {
  初始化36_LINE角色選單維護與權限異常修復工具();
  const rows = LINE選單維護36_取得身份資料_();
  let ok = 0, fail = 0, skipped = 0, errors = [];
  rows.forEach(function(r) {
    if (!LINE選單維護36_文字_(r.LINE_USER_ID) || LINE選單維護36_文字_(r.啟用 || '是') === '否') { skipped++; return; }
    try {
      const res = 修復36_LINE指定使用者選單(r.LINE_USER_ID);
      if (res && res.成功) ok++; else { fail++; errors.push(res); }
    } catch (err) { fail++; errors.push({ LINE_USER_ID: r.LINE_USER_ID, 訊息: err.message }); }
  });
  return { 成功: fail === 0, 訊息: '全部使用者選單修復完成', 總數: rows.length, 成功數: ok, 跳過數: skipped, 失敗數: fail, 錯誤: errors.slice(0, 30) };
}

function 修復36_LINE指定使用者選單(查詢值) {
  const 身份 = LINE選單維護36_找身份_(查詢值);
  if (!身份) return { 成功: false, 訊息: '找不到身份資料：' + 查詢值 };
  const expected = LINE選單維護36_判斷應套用選單_(身份);
  if (!expected.richMenuId) return { 成功: false, 訊息: '缺少 ' + expected.目標選單 + ' richMenuId，請確認 Script Properties。', 身份: 身份 };
  LINE選單維護36_呼叫LINE_('post', 'https://api.line.me/v2/bot/user/' + encodeURIComponent(身份.LINE_USER_ID) + '/richmenu/' + encodeURIComponent(expected.richMenuId), null);
  LINE選單維護36_寫入紀錄_('修復指定使用者選單', 身份, expected.目標選單, expected.richMenuId, '完成', '依權限重新套用');
  return { 成功: true, 訊息: '已修復使用者選單', LINE_USER_ID: 身份.LINE_USER_ID, 工號: 身份.工號, 姓名: 身份.姓名, 目標選單: expected.目標選單, richMenuId: expected.richMenuId };
}

function 清除36_LINE指定使用者個人選單(查詢值) {
  const 身份 = LINE選單維護36_找身份_(查詢值) || { LINE_USER_ID: 查詢值, 工號: '', 姓名: '' };
  const lineUserId = LINE選單維護36_文字_(身份.LINE_USER_ID || 查詢值);
  if (!lineUserId) throw new Error('缺少 LINE_USER_ID 或工號。');
  LINE選單維護36_呼叫LINE_('delete', 'https://api.line.me/v2/bot/user/' + encodeURIComponent(lineUserId) + '/richmenu', null, true);
  LINE選單維護36_寫入紀錄_('清除指定使用者個人RichMenu', 身份, '回到預設', '', '完成', '清除個人連結');
  return { 成功: true, 訊息: '已清除指定使用者個人 Rich Menu，會回到預設選單', LINE_USER_ID: lineUserId, 工號: 身份.工號 || '' };
}

function 查詢36_LINE指定使用者選單狀態(查詢值) {
  const 身份 = LINE選單維護36_找身份_(查詢值);
  if (!身份) return { 成功: false, 訊息: '找不到身份資料：' + 查詢值 };
  const expected = LINE選單維護36_判斷應套用選單_(身份);
  const current = LINE選單維護36_查詢使用者RichMenuId_(身份.LINE_USER_ID);
  const result = LINE選單維護36_判斷掃描結果_(身份, expected, current);
  return { 成功: true, 身份: 身份, 應套用: expected, 目前: current, 判斷: result };
}

function 測試36_LINE選單維護_本機規格() {
  const init = 初始化36_LINE角色選單維護與權限異常修復工具();
  const props = PropertiesService.getScriptProperties();
  const has主管 = !!LINE選單維護36_文字_(props.getProperty('LINE_RICH_MENU_主管入口_ID'));
  const has員工 = !!LINE選單維護36_文字_(props.getProperty('LINE_RICH_MENU_一般員工_ID'));
  const hasToken = !!LINE選單維護36_取得Token_();
  return { 成功: has主管 && has員工 && hasToken, 訊息: has主管 && has員工 && hasToken ? '36_LINE選單維護本機規格通過' : '缺少必要 Script Properties', 版本: LINE選單維護36_版本, 初始化: init, LINE_CHANNEL_ACCESS_TOKEN: hasToken, LINE_RICH_MENU_主管入口_ID: has主管, LINE_RICH_MENU_一般員工_ID: has員工 };
}

function LINE選單維護36_取得身份資料_() {
  const sh = 取得試算表_().getSheetByName('33_LINE身份權限');
  if (!sh || sh.getLastRow() < 2) return [];
  return LINE選單維護36_讀表物件_(sh).filter(function(r) { return LINE選單維護36_文字_(r.LINE_USER_ID); });
}

function LINE選單維護36_找身份_(查詢值) {
  const key = LINE選單維護36_文字_(查詢值).toLowerCase();
  if (!key) return null;
  const rows = LINE選單維護36_取得身份資料_();
  for (var i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (LINE選單維護36_文字_(r.LINE_USER_ID).toLowerCase() === key) return r;
    if (LINE選單維護36_文字_(r.工號).toLowerCase() === key) return r;
    if (LINE選單維護36_文字_(r.姓名).toLowerCase() === key) return r;
  }
  return null;
}

function LINE選單維護36_判斷應套用選單_(身份) {
  const allow = LINE選單維護36_文字_(身份.允許主管入口).toLowerCase();
  const role = LINE選單維護36_文字_(身份.角色);
  const isBoss = ['是', 'yes', 'y', 'true', '1'].indexOf(allow) >= 0 || /主管|班長|工程師|主任|課長|經理|廠長|營運長|副總/i.test(role);
  const props = PropertiesService.getScriptProperties();
  const menu = isBoss ? '主管入口' : '一般員工入口';
  const id = isBoss ? props.getProperty('LINE_RICH_MENU_主管入口_ID') : props.getProperty('LINE_RICH_MENU_一般員工_ID');
  return { 目標選單: menu, richMenuId: LINE選單維護36_文字_(id) };
}

function LINE選單維護36_查詢使用者RichMenuId_(lineUserId) {
  try {
    const r = LINE選單維護36_呼叫LINE_('get', 'https://api.line.me/v2/bot/user/' + encodeURIComponent(lineUserId) + '/richmenu', null, true);
    return { 成功: true, richMenuId: LINE選單維護36_文字_(r.richMenuId), 原始回應: r };
  } catch (err) {
    return { 成功: false, richMenuId: '', 備註: err.message };
  }
}

function LINE選單維護36_判斷掃描結果_(身份, expected, current) {
  if (LINE選單維護36_文字_(身份.啟用 || '是') === '否') return { 判斷結果: '停用', 修復建議: '不處理' };
  if (!expected.richMenuId) return { 判斷結果: '異常', 修復建議: '缺少 ' + expected.目標選單 + ' richMenuId' };
  if (!current.richMenuId) return { 判斷結果: '異常', 修復建議: '重新套用 ' + expected.目標選單 };
  if (current.richMenuId !== expected.richMenuId) return { 判斷結果: '異常', 修復建議: '目前選單與身份不一致，重新套用 ' + expected.目標選單 };
  return { 判斷結果: '正常', 修復建議: '' };
}

function LINE選單維護36_寫入掃描表_(items) {
  const ss = 取得試算表_();
  const sh = LINE選單維護36_建立或修復表_(ss, LINE選單維護36_掃描表, LINE選單維護36_掃描欄位);
  sh.clearContents();
  sh.getRange(1, 1, 1, LINE選單維護36_掃描欄位.length).setValues([LINE選單維護36_掃描欄位]);
  if (items.length) {
    const values = items.map(function(o) { return LINE選單維護36_掃描欄位.map(function(h) { return o[h] || ''; }); });
    sh.getRange(2, 1, values.length, LINE選單維護36_掃描欄位.length).setValues(values);
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, LINE選單維護36_掃描欄位.length).setFontWeight('bold').setBackground('#7c2d12').setFontColor('#ffffff');
}

function LINE選單維護36_呼叫LINE_(method, url, payload, 允許404) {
  const opt = { method: method, headers: { Authorization: 'Bearer ' + LINE選單維護36_取得Token_() }, muteHttpExceptions: true };
  if (payload !== null && payload !== undefined) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
  const res = UrlFetchApp.fetch(url, opt);
  const code = res.getResponseCode();
  const body = res.getContentText() || '{}';
  if ((code < 200 || code >= 300) && !(允許404 && code === 404)) throw new Error('LINE API 失敗 HTTP ' + code + '：' + body);
  try { return JSON.parse(body || '{}'); } catch (err) { return { 狀態碼: code, 原始回應: body }; }
}

function LINE選單維護36_取得Token_() {
  if (typeof 取得LINEToken_ === 'function') return LINE選單維護36_文字_(取得LINEToken_());
  return LINE選單維護36_文字_(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN'));
}

function LINE選單維護36_建立或修復表_(ss, name, headers) {
  if (typeof 建立或修復表_ === 'function') return 建立或修復表_(ss, name, headers);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  const now = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  const miss = headers.filter(function(h) { return now.indexOf(h) < 0; });
  if (miss.length) sh.getRange(1, sh.getLastColumn() + 1, 1, miss.length).setValues([miss]);
  return sh;
}

function LINE選單維護36_讀表物件_(sh) {
  const values = sh.getDataRange().getValues();
  const h = values.shift().map(String);
  return values.filter(function(r) { return r.some(function(v) { return v !== ''; }); }).map(function(r) { const o = {}; h.forEach(function(k, i) { o[k] = r[i]; }); return o; });
}

function LINE選單維護36_寫入紀錄_(動作, 身份, 目標選單, richMenuId, 結果, 備註) {
  try {
    const sh = LINE選單維護36_建立或修復表_(取得試算表_(), LINE選單維護36_紀錄表, LINE選單維護36_紀錄欄位);
    sh.appendRow([new Date(), 動作 || '', 身份.LINE_USER_ID || '', 身份.工號 || '', 身份.姓名 || '', 目標選單 || '', richMenuId || '', 結果 || '', 備註 || '']);
  } catch (err) {}
}

function LINE選單維護36_文字_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}
