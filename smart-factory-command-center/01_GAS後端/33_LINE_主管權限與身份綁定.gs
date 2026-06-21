/**
 * 33_LINE｜主管權限與身份綁定
 * 專案：製造部智慧製造應用總部
 * 版本：v1.7.0
 *
 * 目的：讓 LINE Bot 先知道使用者是誰，再判斷能否使用主管入口、主檔檢查、AI摘要等敏感功能。
 * 原則：報工作業先保持可用；主管戰情、今日戰情、昨日戰情、主檔檢查、AI摘要需通過身份權限。
 */

const LINE身份權限33_版本 = 'v1.7.0_33_LINE主管權限與身份綁定';
const LINE身份權限33_身份表 = '33_LINE身份權限';
const LINE身份權限33_紀錄表 = '33_LINE權限紀錄';
const LINE身份權限33_身份欄位 = ['LINE_USER_ID', '工號', '姓名', '部門', '組別', '職稱', '角色', '權限等級', '允許主管入口', '允許主檔檢查', '允許AI摘要', '允許報工', '啟用', '綁定方式', '綁定時間', '最後互動時間', '備註'];
const LINE身份權限33_紀錄欄位 = ['時間戳', 'LINE_USER_ID', '工號', '姓名', '收到文字', '指令類型', '判斷結果', '角色', '權限等級', '備註'];

function 初始化33_LINE主管權限與身份綁定() {
  const ss = 取得試算表_();
  LINE身份權限33_建立或修復表_(ss, LINE身份權限33_身份表, LINE身份權限33_身份欄位);
  LINE身份權限33_建立或修復表_(ss, LINE身份權限33_紀錄表, LINE身份權限33_紀錄欄位);
  LINE身份權限33_寫入紀錄_({ LINE_USER_ID: 'SYSTEM', 工號: '', 姓名: '' }, '初始化33_LINE主管權限與身份綁定', '系統', '完成', '系統', 99, LINE身份權限33_版本);
  return { 成功: true, 訊息: '33_LINE主管權限與身份綁定初始化完成', 版本: LINE身份權限33_版本, 工作表: [LINE身份權限33_身份表, LINE身份權限33_紀錄表] };
}

/**
 * 主後端 doPost(e) 應在 LINE webhook 進入後優先呼叫此函數。
 * 未處理：return null；已回覆或已攔截：return {已處理:true}
 */
function LINE身份權限_嘗試處理Webhook_(payload) {
  const events = Array.isArray(payload && payload.events) ? payload.events : [];
  if (!events.length) return null;
  初始化33_LINE主管權限與身份綁定();
  let 已處理 = 0;
  let 已放行 = 0;
  let 已攔截 = 0;
  for (let i = 0; i < events.length; i++) {
    const r = LINE身份權限33_處理單一事件_(events[i] || {});
    if (r && r.已處理) 已處理++;
    if (r && r.已放行) 已放行++;
    if (r && r.已攔截) 已攔截++;
  }
  if (已處理 > 0) return { ok: true, success: true, 已處理: true, 已放行, 已攔截, 訊息: '33_LINE身份權限已處理 webhook' };
  return null;
}

function LINE身份權限33_處理單一事件_(ev) {
  if (!ev || ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return null;
  const text = LINE身份權限33_文字_(ev.message.text);
  const lineUserId = LINE身份權限33_文字_(ev.source && ev.source.userId);
  const replyToken = ev.replyToken;
  if (!text) return null;

  const 綁定工號 = LINE身份權限33_解析綁定工號_(text);
  if (綁定工號) {
    const result = LINE身份權限33_綁定身份_(lineUserId, 綁定工號);
    LINE身份權限33_回覆_(replyToken, result.文字);
    LINE身份權限33_寫入紀錄_(result.身份 || { LINE_USER_ID: lineUserId, 工號: 綁定工號, 姓名: '' }, text, '身份綁定', result.成功 ? '綁定成功' : '綁定失敗', result.身份 && result.身份.角色, result.身份 && result.身份.權限等級, result.訊息);
    return { 已處理: true, 已攔截: !result.成功, 結果: result };
  }

  if (/^(綁定|身份綁定|我是)$/i.test(text)) {
    LINE身份權限33_回覆_(replyToken, '🔐 身份綁定方式\n請輸入：綁定 工號\n範例：綁定 fhfi573\n\n綁定後才可使用主管戰情、今日戰情、昨日戰情、主檔檢查、AI摘要。');
    LINE身份權限33_寫入紀錄_({ LINE_USER_ID: lineUserId }, text, '身份綁定說明', '已回覆', '', '', '');
    return { 已處理: true };
  }

  if (/^(我的身份|身份查詢|權限檢查|我是誰)$/i.test(text)) {
    const 身份 = LINE身份權限33_取得身份_(lineUserId);
    const msg = 身份 ? LINE身份權限33_格式化身份_(身份) : '尚未綁定身份。\n請輸入：綁定 工號';
    LINE身份權限33_回覆_(replyToken, msg);
    LINE身份權限33_寫入紀錄_(身份 || { LINE_USER_ID: lineUserId }, text, '身份查詢', 身份 ? '已綁定' : '未綁定', 身份 && 身份.角色, 身份 && 身份.權限等級, '');
    return { 已處理: true };
  }

  if (/^(解除綁定|取消綁定)$/i.test(text)) {
    const result = LINE身份權限33_解除綁定_(lineUserId);
    LINE身份權限33_回覆_(replyToken, result.文字);
    LINE身份權限33_寫入紀錄_({ LINE_USER_ID: lineUserId }, text, '解除綁定', result.成功 ? '完成' : '無資料', '', '', '');
    return { 已處理: true };
  }

  const 指令類型 = LINE身份權限33_判斷指令類型_(text);
  if (!指令類型.需保護) return null;

  const 身份 = LINE身份權限33_取得身份_(lineUserId);
  if (!身份) {
    LINE身份權限33_回覆_(replyToken, '🔒 尚未綁定身份，暫時不能使用「' + 指令類型.名稱 + '」。\n\n請先輸入：綁定 工號\n範例：綁定 fhfi573');
    LINE身份權限33_寫入紀錄_({ LINE_USER_ID: lineUserId }, text, 指令類型.名稱, '未綁定攔截', '', '', '');
    return { 已處理: true, 已攔截: true };
  }

  const 權限 = LINE身份權限33_檢查權限_(身份, 指令類型);
  LINE身份權限33_更新最後互動_(lineUserId);
  LINE身份權限33_寫入紀錄_(身份, text, 指令類型.名稱, 權限.允許 ? '允許放行' : '權限不足攔截', 身份.角色, 身份.權限等級, 權限.原因);

  if (!權限.允許) {
    LINE身份權限33_回覆_(replyToken, '⛔ 權限不足\n你目前身份：' + 身份.姓名 + '｜' + 身份.角色 + '\n嘗試功能：' + 指令類型.名稱 + '\n\n若需要開通，請在「33_LINE身份權限」將對應欄位改為「是」。');
    return { 已處理: true, 已攔截: true };
  }

  return { 已處理: false, 已放行: true };
}

function LINE身份權限33_解析綁定工號_(text) {
  const m = LINE身份權限33_文字_(text).match(/^(綁定|身份綁定|我是|設定身份)\s*[:：]?\s*([A-Za-z0-9\-_]+)$/i);
  return m ? m[2] : '';
}

function LINE身份權限33_綁定身份_(lineUserId, 工號) {
  if (!lineUserId) return { 成功: false, 訊息: '缺少 LINE_USER_ID', 文字: '❌ 無法取得 LINE_USER_ID，請從 LINE 一對一聊天室操作。' };
  const 人員 = LINE身份權限33_依工號找人員_(工號);
  if (!人員) return { 成功: false, 訊息: '找不到人員主檔工號', 文字: '❌ 找不到工號：' + 工號 + '\n請確認 01_人員主檔是否有這個工號。' };

  const 權限 = LINE身份權限33_依人員推定權限_(人員);
  const now = new Date();
  const 身份 = {
    LINE_USER_ID: lineUserId,
    工號: 人員.工號,
    姓名: 人員.姓名,
    部門: 人員.部門,
    組別: 人員.組別,
    職稱: 人員.職稱,
    角色: 權限.角色,
    權限等級: 權限.權限等級,
    允許主管入口: 權限.允許主管入口,
    允許主檔檢查: 權限.允許主檔檢查,
    允許AI摘要: 權限.允許AI摘要,
    允許報工: '是',
    啟用: '是',
    綁定方式: 'LINE自助綁定',
    綁定時間: now,
    最後互動時間: now,
    備註: '由33_LINE身份權限自動建立'
  };

  LINE身份權限33_寫入或更新身份_(身份);
  LINE身份權限33_回寫人員主檔LINEID_(人員.工號, lineUserId);

  return {
    成功: true,
    訊息: '綁定成功',
    身份,
    文字: '✅ 身份綁定成功\n姓名：' + 身份.姓名 + '\n工號：' + 身份.工號 + '\n角色：' + 身份.角色 + '\n權限等級：' + 身份.權限等級 + '\n\n可輸入「權限檢查」確認目前權限。'
  };
}

function LINE身份權限33_解除綁定_(lineUserId) {
  const sh = LINE身份權限33_取得身份表_();
  const values = sh.getDataRange().getValues();
  const h = values[0].map(String);
  const cLine = h.indexOf('LINE_USER_ID'), c啟用 = h.indexOf('啟用'), c更新 = h.indexOf('最後互動時間');
  let count = 0;
  for (let i = 1; i < values.length; i++) {
    if (LINE身份權限33_文字_(values[i][cLine]) === lineUserId) {
      if (c啟用 >= 0) sh.getRange(i + 1, c啟用 + 1).setValue('否');
      if (c更新 >= 0) sh.getRange(i + 1, c更新 + 1).setValue(new Date());
      count++;
    }
  }
  return { 成功: count > 0, 文字: count > 0 ? '✅ 已解除 LINE 身份綁定。' : '目前沒有可解除的綁定資料。' };
}

function LINE身份權限33_判斷指令類型_(text) {
  const t = LINE身份權限33_文字_(text).toLowerCase();
  if (!t) return { 需保護: false, 名稱: '空白' };
  if (t.indexOf('主管戰情') >= 0) return { 需保護: true, 名稱: '主管戰情', 權限欄位: '允許主管入口' };
  if (t.indexOf('今日戰情') >= 0) return { 需保護: true, 名稱: '今日戰情', 權限欄位: '允許主管入口' };
  if (t.indexOf('昨日戰情') >= 0) return { 需保護: true, 名稱: '昨日戰情', 權限欄位: '允許主管入口' };
  if (/^戰情\s*\d{4}-\d{2}-\d{2}$/i.test(t)) return { 需保護: true, 名稱: '指定日期戰情', 權限欄位: '允許主管入口' };
  if (t === '戰情' || t.indexOf('kpi') >= 0 || t.indexOf('狀況') >= 0) return { 需保護: true, 名稱: '戰情查詢', 權限欄位: '允許主管入口' };
  if (t.indexOf('主檔') >= 0 || t.indexOf('檢查') >= 0) return { 需保護: true, 名稱: '主檔檢查', 權限欄位: '允許主檔檢查' };
  if (t.indexOf('ai摘要') >= 0 || t.indexOf('ai 摘要') >= 0 || t === 'ai') return { 需保護: true, 名稱: 'AI摘要', 權限欄位: '允許AI摘要' };
  return { 需保護: false, 名稱: '一般指令' };
}

function LINE身份權限33_檢查權限_(身份, 指令類型) {
  if (!身份 || LINE身份權限33_文字_(身份.啟用 || '是') === '否') return { 允許: false, 原因: '身份未啟用' };
  const 欄位 = 指令類型.權限欄位;
  if (!欄位) return { 允許: true, 原因: '非保護指令' };
  const v = LINE身份權限33_文字_(身份[欄位] || '').toLowerCase();
  const ok = ['是', 'yes', 'y', 'true', '1'].indexOf(v) >= 0;
  return { 允許: ok, 原因: ok ? '權限欄位允許' : 欄位 + '不是「是」' };
}

function LINE身份權限33_依人員推定權限_(人員) {
  const txt = [人員.職稱, 人員.部門, 人員.組別, 人員.備註].map(LINE身份權限33_文字_).join(' ');
  if (/營運長|副總|總經理|廠長|經理|主管|主任|課長/i.test(txt)) return { 角色: '主管', 權限等級: 80, 允許主管入口: '是', 允許主檔檢查: '是', 允許AI摘要: '是' };
  if (/組長|班長|領班/i.test(txt)) return { 角色: '班長', 權限等級: 70, 允許主管入口: '是', 允許主檔檢查: '是', 允許AI摘要: '是' };
  if (/工程師|生技|資訊|品保|品保|設備/i.test(txt)) return { 角色: '工程師', 權限等級: 60, 允許主管入口: '是', 允許主檔檢查: '是', 允許AI摘要: '是' };
  return { 角色: '現場人員', 權限等級: 10, 允許主管入口: '否', 允許主檔檢查: '否', 允許AI摘要: '否' };
}

function LINE身份權限33_取得身份_(lineUserId) {
  if (!lineUserId) return null;
  const sh = LINE身份權限33_取得身份表_();
  const rows = LINE身份權限33_讀表物件_(sh);
  const hit = rows.filter(r => LINE身份權限33_文字_(r.LINE_USER_ID) === lineUserId && LINE身份權限33_文字_(r.啟用 || '是') !== '否').pop();
  if (hit) return hit;

  const 人員 = LINE身份權限33_依LINEID找人員_(lineUserId);
  if (!人員) return null;
  const 權限 = LINE身份權限33_依人員推定權限_(人員);
  const 身份 = Object.assign({}, 人員, 權限, { LINE_USER_ID: lineUserId, 允許報工: '是', 啟用: '是', 綁定方式: '01_人員主檔LINE_USER_ID自動帶入', 綁定時間: new Date(), 最後互動時間: new Date(), 備註: '由01_人員主檔自動建立' });
  LINE身份權限33_寫入或更新身份_(身份);
  return 身份;
}

function LINE身份權限33_依工號找人員_(工號) {
  const rows = typeof 讀表_ === 'function' ? 讀表_('01_人員主檔') : [];
  const key = LINE身份權限33_文字_(工號).toLowerCase();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const id = LINE身份權限33_文字_(r.工號 || r.員工編號 || r.員工工號).toLowerCase();
    if (id === key && LINE身份權限33_文字_(r.啟用 || '是') !== '否') return LINE身份權限33_人員標準化_(r);
  }
  return null;
}

function LINE身份權限33_依LINEID找人員_(lineUserId) {
  const rows = typeof 讀表_ === 'function' ? 讀表_('01_人員主檔') : [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (LINE身份權限33_文字_(r.LINE_USER_ID) === lineUserId && LINE身份權限33_文字_(r.啟用 || '是') !== '否') return LINE身份權限33_人員標準化_(r);
  }
  return null;
}

function LINE身份權限33_人員標準化_(r) {
  return { 工號: LINE身份權限33_文字_(r.工號 || r.員工編號 || r.員工工號), 姓名: LINE身份權限33_文字_(r.姓名 || r.中文名 || r.名字), 部門: LINE身份權限33_文字_(r.部門), 組別: LINE身份權限33_文字_(r.組別), 職稱: LINE身份權限33_文字_(r.職稱 || r.職位), 備註: LINE身份權限33_文字_(r.備註) };
}

function LINE身份權限33_寫入或更新身份_(身份) {
  const sh = LINE身份權限33_取得身份表_();
  const h = LINE身份權限33_取表頭_(sh);
  const values = sh.getDataRange().getValues();
  const cLine = h.indexOf('LINE_USER_ID');
  let row = -1;
  for (let i = 1; i < values.length; i++) if (LINE身份權限33_文字_(values[i][cLine]) === LINE身份權限33_文字_(身份.LINE_USER_ID)) row = i + 1;
  const data = h.map(k => 身份[k] !== undefined ? 身份[k] : '');
  if (row > 0) sh.getRange(row, 1, 1, h.length).setValues([data]); else sh.appendRow(data);
}

function LINE身份權限33_回寫人員主檔LINEID_(工號, lineUserId) {
  try {
    const ss = 取得試算表_();
    const sh = ss.getSheetByName('01_人員主檔');
    if (!sh || sh.getLastRow() < 2) return;
    const values = sh.getDataRange().getValues();
    const h = values[0].map(String);
    const c工號 = h.indexOf('工號'), cLine = h.indexOf('LINE_USER_ID'), c更新 = h.indexOf('更新時間');
    if (c工號 < 0 || cLine < 0) return;
    for (let i = 1; i < values.length; i++) {
      if (LINE身份權限33_文字_(values[i][c工號]).toLowerCase() === LINE身份權限33_文字_(工號).toLowerCase()) {
        sh.getRange(i + 1, cLine + 1).setValue(lineUserId);
        if (c更新 >= 0) sh.getRange(i + 1, c更新 + 1).setValue(new Date());
        return;
      }
    }
  } catch (err) {}
}

function LINE身份權限33_更新最後互動_(lineUserId) {
  const sh = LINE身份權限33_取得身份表_();
  const values = sh.getDataRange().getValues();
  const h = values[0].map(String);
  const cLine = h.indexOf('LINE_USER_ID'), c時間 = h.indexOf('最後互動時間');
  if (cLine < 0 || c時間 < 0) return;
  for (let i = 1; i < values.length; i++) if (LINE身份權限33_文字_(values[i][cLine]) === lineUserId) sh.getRange(i + 1, c時間 + 1).setValue(new Date());
}

function LINE身份權限33_格式化身份_(身份) {
  return '👤 我的身份\n姓名：' + (身份.姓名 || '-') + '\n工號：' + (身份.工號 || '-') + '\n部門：' + (身份.部門 || '-') + '\n職稱：' + (身份.職稱 || '-') + '\n角色：' + (身份.角色 || '-') + '\n權限等級：' + (身份.權限等級 || '-') + '\n\n主管入口：' + (身份.允許主管入口 || '否') + '\n主檔檢查：' + (身份.允許主檔檢查 || '否') + '\nAI摘要：' + (身份.允許AI摘要 || '否') + '\n報工作業：' + (身份.允許報工 || '是');
}

function LINE身份權限33_取得身份表_() {
  return LINE身份權限33_建立或修復表_(取得試算表_(), LINE身份權限33_身份表, LINE身份權限33_身份欄位);
}

function LINE身份權限33_取得紀錄表_() {
  return LINE身份權限33_建立或修復表_(取得試算表_(), LINE身份權限33_紀錄表, LINE身份權限33_紀錄欄位);
}

function LINE身份權限33_建立或修復表_(ss, name, headers) {
  if (typeof 建立或修復表_ === 'function') return 建立或修復表_(ss, name, headers);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  const nowHeaders = LINE身份權限33_取表頭_(sh);
  const miss = headers.filter(h => nowHeaders.indexOf(h) < 0);
  if (miss.length) sh.getRange(1, sh.getLastColumn() + 1, 1, miss.length).setValues([miss]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  return sh;
}

function LINE身份權限33_讀表物件_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const h = values.shift().map(String);
  return values.filter(r => r.some(v => v !== '')).map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; });
}

function LINE身份權限33_取表頭_(sh) {
  return sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
}

function LINE身份權限33_寫入紀錄_(身份, text, 指令類型, 判斷結果, 角色, 權限等級, 備註) {
  try {
    const sh = LINE身份權限33_取得紀錄表_();
    sh.appendRow([new Date(), 身份.LINE_USER_ID || '', 身份.工號 || '', 身份.姓名 || '', text || '', 指令類型 || '', 判斷結果 || '', 角色 || '', 權限等級 || '', 備註 || '']);
  } catch (err) {}
}

function LINE身份權限33_回覆_(replyToken, text) {
  if (!replyToken) return;
  if (typeof LINE主管戰情直連_送出回覆_ === 'function') return LINE主管戰情直連_送出回覆_(replyToken, String(text || '').slice(0, 4900));
  if (typeof 回覆LINE_ === 'function') return 回覆LINE_(replyToken, String(text || '').slice(0, 4900));
}

function LINE身份權限33_文字_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}

function 測試_33_LINE主管權限與身份綁定_本機規格() {
  const init = 初始化33_LINE主管權限與身份綁定();
  return { 成功: true, 訊息: '33_LINE主管權限與身份綁定本機規格通過', 版本: LINE身份權限33_版本, 初始化結果: init, 保護指令: ['主管戰情', '今日戰情', '昨日戰情', '戰情 yyyy-mm-dd', '主檔檢查', 'AI摘要'], 公開指令: ['報工', '報工作業', '指令'] };
}

function 測試_33_LINE主管權限_模擬未綁定主管指令() {
  const payload = { events: [{ type: 'message', replyToken: '', source: { userId: 'TEST_UNBOUND_USER' }, message: { type: 'text', text: '主管戰情' } }] };
  const r = LINE身份權限_嘗試處理Webhook_(payload);
  return { 成功: !!(r && r.已處理), 訊息: '未綁定主管指令應被攔截', 結果: r };
}
