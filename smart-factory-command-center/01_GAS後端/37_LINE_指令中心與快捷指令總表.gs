/**
 * 37_LINE｜指令中心與快捷指令總表
 * 版本：v1.7.4
 * 目的：建立 LINE 指令中心，讓使用者可查詢主管指令、員工指令、系統維護與我的狀態。
 */

const LINE指令中心37_版本 = 'v1.7.4_37_LINE指令中心與快捷指令總表';
const LINE指令中心37_總表 = '37_LINE指令中心';
const LINE指令中心37_紀錄表 = '37_LINE指令使用紀錄';
const LINE指令中心37_總表欄位 = ['分類', '指令', '別名', '權限', '說明', '範例', '排序', '啟用', '備註'];
const LINE指令中心37_紀錄欄位 = ['時間戳', 'LINE_USER_ID', '工號', '姓名', '角色', '收到文字', '指令分類', '回覆結果', '備註'];

function 初始化37_LINE指令中心與快捷指令總表() {
  const ss = 取得試算表_();
  const sh = LINE指令中心37_建立或修復表_(ss, LINE指令中心37_總表, LINE指令中心37_總表欄位);
  LINE指令中心37_建立或修復表_(ss, LINE指令中心37_紀錄表, LINE指令中心37_紀錄欄位);
  LINE指令中心37_補預設指令_(sh);
  LINE指令中心37_寫入紀錄_({ LINE_USER_ID: 'SYSTEM', 工號: '', 姓名: '', 角色: '系統' }, '初始化37', '系統', '完成', LINE指令中心37_版本);
  return { 成功: true, 訊息: '37_LINE指令中心與快捷指令總表初始化完成', 版本: LINE指令中心37_版本, 工作表: [LINE指令中心37_總表, LINE指令中心37_紀錄表] };
}

function LINE指令中心37_嘗試處理Webhook_(payload) {
  const events = Array.isArray(payload && payload.events) ? payload.events : [];
  if (!events.length) return null;
  初始化37_LINE指令中心與快捷指令總表();
  let 已處理 = 0;
  events.forEach(function(ev) {
    const r = LINE指令中心37_處理單一事件_(ev || {});
    if (r && r.已處理) 已處理++;
  });
  return 已處理 > 0 ? { ok: true, success: true, 已處理: true, 訊息: '37_LINE指令中心已處理 webhook' } : null;
}

function LINE指令中心37_處理單一事件_(ev) {
  if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return null;
  const text = LINE指令中心37_文字_(ev.message.text);
  const lineUserId = LINE指令中心37_文字_(ev.source && ev.source.userId);
  const replyToken = ev.replyToken;
  if (!text) return null;
  const cmd = LINE指令中心37_判斷指令_(text);
  if (!cmd) return null;
  const 身份 = LINE指令中心37_取得身份_(lineUserId) || { LINE_USER_ID: lineUserId, 工號: '', 姓名: '', 角色: '未綁定', 權限等級: '', 允許主管入口: '否', 允許主檔檢查: '否', 允許AI摘要: '否', 允許報工: '是' };
  let msg = '';
  if (cmd === '指令中心') msg = LINE指令中心37_建立總覽回覆_(身份);
  if (cmd === '主管指令') msg = LINE指令中心37_建立分類回覆_('主管', 身份);
  if (cmd === '員工指令') msg = LINE指令中心37_建立分類回覆_('員工', 身份);
  if (cmd === '系統維護') msg = LINE指令中心37_建立分類回覆_('維護', 身份);
  if (cmd === '我的狀態') msg = LINE指令中心37_建立我的狀態回覆_(身份);
  if (cmd === '選單說明') msg = LINE指令中心37_建立選單說明回覆_(身份);
  if (!msg) return null;
  LINE指令中心37_回覆_(replyToken, msg);
  LINE指令中心37_寫入紀錄_(身份, text, cmd, '已回覆', '');
  return { 已處理: true, 指令: cmd };
}

function LINE指令中心37_判斷指令_(text) {
  const t = LINE指令中心37_文字_(text).toLowerCase();
  if (/^(指令|指令中心|快捷指令|功能|help|menu)$/i.test(t)) return '指令中心';
  if (/^(主管指令|主管功能|主管快捷)$/i.test(t)) return '主管指令';
  if (/^(員工指令|現場指令|報工指令|員工功能)$/i.test(t)) return '員工指令';
  if (/^(系統維護|維護指令|系統指令)$/i.test(t)) return '系統維護';
  if (/^(我的狀態|狀態查詢|我的權限|權限狀態)$/i.test(t)) return '我的狀態';
  if (/^(選單說明|richmenu|rich menu|選單功能)$/i.test(t)) return '選單說明';
  return null;
}

function LINE指令中心37_建立總覽回覆_(身份) {
  return '📘 智慧製造指令中心\n' +
    '身份：' + (身份.姓名 || '-') + '｜' + (身份.角色 || '未綁定') + '\n\n' +
    '可輸入：\n' +
    '1. 主管指令\n' +
    '2. 員工指令\n' +
    '3. 系統維護\n' +
    '4. 我的狀態\n' +
    '5. 選單說明\n\n' +
    '常用：\n' +
    '・權限檢查\n' +
    '・選單更新\n' +
    '・報工作業\n' +
    '・主管戰情';
}

function LINE指令中心37_建立分類回覆_(分類, 身份) {
  const rows = LINE指令中心37_讀指令表_().filter(function(r) { return LINE指令中心37_文字_(r.分類) === 分類 && LINE指令中心37_文字_(r.啟用 || '是') !== '否'; });
  rows.sort(function(a, b) { return Number(a.排序 || 999) - Number(b.排序 || 999); });
  const title = 分類 === '主管' ? '📊 主管指令' : 分類 === '員工' ? '🧑‍🏭 員工指令' : '🛠 系統維護指令';
  const lines = rows.map(function(r) { return '・' + r.指令 + (r.說明 ? '：' + r.說明 : ''); });
  const note = 分類 === '主管' && !LINE指令中心37_可看主管_(身份) ? '\n\n⚠️ 你目前沒有主管入口權限，指令會被 33 權限模組攔截。' : '';
  return title + '\n' + (lines.length ? lines.join('\n') : '目前沒有啟用指令') + note;
}

function LINE指令中心37_建立我的狀態回覆_(身份) {
  const menu = LINE指令中心37_判斷目標選單_(身份);
  return '👤 我的狀態\n' +
    '姓名：' + (身份.姓名 || '-') + '\n' +
    '工號：' + (身份.工號 || '-') + '\n' +
    '部門：' + (身份.部門 || '-') + '\n' +
    '職稱：' + (身份.職稱 || '-') + '\n' +
    '角色：' + (身份.角色 || '未綁定') + '\n' +
    '權限等級：' + (身份.權限等級 || '-') + '\n' +
    '目標選單：' + menu + '\n\n' +
    '主管入口：' + (身份.允許主管入口 || '否') + '\n' +
    '主檔檢查：' + (身份.允許主檔檢查 || '否') + '\n' +
    'AI摘要：' + (身份.允許AI摘要 || '否') + '\n' +
    '報工作業：' + (身份.允許報工 || '是');
}

function LINE指令中心37_建立選單說明回覆_(身份) {
  const menu = LINE指令中心37_判斷目標選單_(身份);
  if (menu === '主管入口') {
    return '📌 主管入口選單說明\n' +
      '・主管戰情：即時總覽\n' +
      '・今日戰情：今日 KPI\n' +
      '・昨日戰情：昨日回顧\n' +
      '・報工作業：現場報工入口\n' +
      '・主檔檢查：資料筆數檢查\n' +
      '・AI摘要：AI 洞察建議\n\n' +
      '輸入「員工選單」可暫切報工入口。';
  }
  return '📌 報工入口選單說明\n' +
    '・報工作業：開啟報工\n' +
    '・我的身份：查看權限\n' +
    '・選單更新：重新套用角色選單\n' +
    '・指令說明：查看可用指令\n' +
    '・身份綁定：綁定工號\n\n' +
    '輸入「選單更新」可重新整理選單。';
}

function LINE指令中心37_補預設指令_(sh) {
  const exist = LINE指令中心37_讀表物件_(sh).map(function(r) { return LINE指令中心37_文字_(r.指令); });
  const data = LINE指令中心37_預設指令資料_();
  data.forEach(function(r) { if (exist.indexOf(r.指令) < 0) sh.appendRow(LINE指令中心37_總表欄位.map(function(h) { return r[h] || ''; })); });
}

function LINE指令中心37_預設指令資料_() {
  return [
    { 分類: '主管', 指令: '主管戰情', 別名: '戰情', 權限: '允許主管入口', 說明: '開啟主管戰情看板', 範例: '主管戰情', 排序: 10, 啟用: '是' },
    { 分類: '主管', 指令: '今日戰情', 別名: '', 權限: '允許主管入口', 說明: '查今日戰情', 範例: '今日戰情', 排序: 20, 啟用: '是' },
    { 分類: '主管', 指令: '昨日戰情', 別名: '', 權限: '允許主管入口', 說明: '查昨日戰情', 範例: '昨日戰情', 排序: 30, 啟用: '是' },
    { 分類: '主管', 指令: '主檔檢查', 別名: '', 權限: '允許主檔檢查', 說明: '檢查主檔筆數', 範例: '主檔檢查', 排序: 40, 啟用: '是' },
    { 分類: '主管', 指令: 'AI摘要', 別名: 'AI', 權限: '允許AI摘要', 說明: '取得 AI 戰情摘要', 範例: 'AI摘要', 排序: 50, 啟用: '是' },
    { 分類: '員工', 指令: '報工作業', 別名: '報工', 權限: '允許報工', 說明: '開啟現場報工入口', 範例: '報工作業', 排序: 10, 啟用: '是' },
    { 分類: '員工', 指令: '權限檢查', 別名: '我的身份', 權限: '已綁定', 說明: '查看身份與權限', 範例: '權限檢查', 排序: 20, 啟用: '是' },
    { 分類: '員工', 指令: '選單更新', 別名: '我的選單', 權限: '已綁定', 說明: '重新套用角色選單', 範例: '選單更新', 排序: 30, 啟用: '是' },
    { 分類: '員工', 指令: '綁定 工號', 別名: '身份綁定', 權限: '所有人', 說明: '綁定 LINE 身份', 範例: '綁定 fhfi573', 排序: 40, 啟用: '是' },
    { 分類: '維護', 指令: '主管選單', 別名: '', 權限: '允許主管入口', 說明: '切回主管入口', 範例: '主管選單', 排序: 10, 啟用: '是' },
    { 分類: '維護', 指令: '員工選單', 別名: '報工選單', 權限: '已綁定', 說明: '切到一般員工入口', 範例: '員工選單', 排序: 20, 啟用: '是' },
    { 分類: '維護', 指令: '選單說明', 別名: '', 權限: '所有人', 說明: '說明目前選單用途', 範例: '選單說明', 排序: 30, 啟用: '是' },
    { 分類: '維護', 指令: '我的狀態', 別名: '狀態查詢', 權限: '所有人', 說明: '查看身份、權限與目標選單', 範例: '我的狀態', 排序: 40, 啟用: '是' }
  ];
}

function LINE指令中心37_讀指令表_() {
  const sh = LINE指令中心37_建立或修復表_(取得試算表_(), LINE指令中心37_總表, LINE指令中心37_總表欄位);
  return LINE指令中心37_讀表物件_(sh);
}

function LINE指令中心37_取得身份_(lineUserId) {
  if (typeof LINE身份權限33_取得身份_ === 'function') return LINE身份權限33_取得身份_(lineUserId);
  return null;
}

function LINE指令中心37_可看主管_(身份) {
  const allow = LINE指令中心37_文字_(身份 && 身份.允許主管入口).toLowerCase();
  if (['是', 'yes', 'y', 'true', '1'].indexOf(allow) >= 0) return true;
  return /主管|班長|工程師|主任|課長|經理|廠長|營運長|副總/i.test(LINE指令中心37_文字_(身份 && 身份.角色));
}

function LINE指令中心37_判斷目標選單_(身份) {
  return LINE指令中心37_可看主管_(身份) ? '主管入口' : '一般員工入口';
}

function 測試37_LINE指令中心_本機規格() {
  const init = 初始化37_LINE指令中心與快捷指令總表();
  const count = LINE指令中心37_讀指令表_().length;
  return { 成功: count > 0, 訊息: '37_LINE指令中心本機規格檢查完成', 版本: LINE指令中心37_版本, 初始化: init, 指令筆數: count };
}

function LINE指令中心37_建立或修復表_(ss, name, headers) {
  if (typeof 建立或修復表_ === 'function') return 建立或修復表_(ss, name, headers);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  const now = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  const miss = headers.filter(function(h) { return now.indexOf(h) < 0; });
  if (miss.length) sh.getRange(1, sh.getLastColumn() + 1, 1, miss.length).setValues([miss]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#1d4ed8').setFontColor('#ffffff');
  return sh;
}

function LINE指令中心37_讀表物件_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const h = values.shift().map(String);
  return values.filter(function(r) { return r.some(function(v) { return v !== ''; }); }).map(function(r) { const o = {}; h.forEach(function(k, i) { o[k] = r[i]; }); return o; });
}

function LINE指令中心37_寫入紀錄_(身份, text, 分類, 結果, 備註) {
  try {
    const sh = LINE指令中心37_建立或修復表_(取得試算表_(), LINE指令中心37_紀錄表, LINE指令中心37_紀錄欄位);
    sh.appendRow([new Date(), 身份.LINE_USER_ID || '', 身份.工號 || '', 身份.姓名 || '', 身份.角色 || '', text || '', 分類 || '', 結果 || '', 備註 || '']);
  } catch (err) {}
}

function LINE指令中心37_回覆_(replyToken, text) {
  if (!replyToken) return;
  if (typeof LINE主管戰情直連_送出回覆_ === 'function') return LINE主管戰情直連_送出回覆_(replyToken, String(text || '').slice(0, 4900));
  if (typeof 回覆LINE_ === 'function') return 回覆LINE_(replyToken, String(text || '').slice(0, 4900));
}

function LINE指令中心37_文字_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}
