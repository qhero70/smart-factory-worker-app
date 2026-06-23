/**
 * 33_LINE_主管權限與身份綁定.gs
 * 智慧製造中央作戰指揮中心 v1.7.2
 *
 * 正式用途：
 * 1. LINE 使用者輸入「綁定 工號」時，完成身份綁定。
 * 2. 強制寫入正式主庫「33_LINE身份權限」。
 * 3. 不再優先呼叫舊的 取得試算表_()，避免寫到其他舊資料庫。
 * 4. 維持既有主管權限、現場人員權限、RichMenu 更新邏輯可接。
 *
 * Git 管理原則：
 * 本檔為 Apps Script 正式同名檔版本。
 * 請複製本檔完整內容覆蓋 Apps Script：33_LINE_主管權限與身份綁定.gs
 * 不使用額外補丁檔、不使用追加段落檔。
 */

const LINE身份權限33_版本 = 'v1.7.2_33_LINE主管權限與身份綁定_強制正式主庫同步版';
const LINE身份權限33_正式主庫ID = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';
const LINE身份權限33_身份表 = '33_LINE身份權限';
const LINE身份權限33_紀錄表 = '33_LINE權限紀錄';
const LINE身份權限33_人員表 = '01_人員主檔';
const LINE身份權限33_今日派班表 = '20_今日派班';
const LINE身份權限33_時區 = 'Asia/Taipei';

const LINE身份權限33_身份欄位 = [
  'LINE_USER_ID', '工號', '姓名', '部門', '組別', '職稱', '角色', '啟用', '備註', '更新時間'
];

const LINE身份權限33_紀錄欄位 = [
  '時間戳', 'LINE_USER_ID', '工號', '姓名', '動作', '結果', '備註'
];

function 初始化33_LINE主管權限與身份綁定() {
  const ss = 取得_LINE身份權限33_試算表_();
  LINE身份權限33_建立或修復表_(ss, LINE身份權限33_身份表, LINE身份權限33_身份欄位);
  LINE身份權限33_建立或修復表_(ss, LINE身份權限33_紀錄表, LINE身份權限33_紀錄欄位);
  return {
    ok: true,
    version: LINE身份權限33_版本,
    spreadsheetId: ss.getId(),
    sheets: [LINE身份權限33_身份表, LINE身份權限33_紀錄表]
  };
}

function 測試33_LINE身份權限_確認正式主庫() {
  const ss = 取得_LINE身份權限33_試算表_();
  const sh = ss.getSheetByName(LINE身份權限33_身份表);
  return {
    ok: true,
    version: LINE身份權限33_版本,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    targetIsFormal: ss.getId() === LINE身份權限33_正式主庫ID,
    sheetName: sh ? sh.getName() : '找不到33_LINE身份權限'
  };
}

/**
 * 給既有 doPost(e) 呼叫的正式入口。
 * 主 doPost 可傳完整 payload：{ events:[...] }
 */
function LINE身份權限_嘗試處理Webhook_(payload) {
  const events = Array.isArray(payload && payload.events) ? payload.events : [];
  let handled = 0;
  let failed = 0;
  const replies = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i] || {};
    try {
      if (event.type !== 'message') continue;
      if (!event.message || event.message.type !== 'text') continue;
      if (!event.replyToken) continue;

      const result = 處理_LINE文字事件_身份綁定模組(event);
      if (!result || !result.handled) continue;

      LINE身份權限33_回覆LINE_(event.replyToken, result.text);
      replies.push(result.text);
      handled++;
    } catch (err) {
      failed++;
      try {
        if (event.replyToken) LINE身份權限33_回覆LINE_(event.replyToken, '身份權限處理失敗：' + err.message);
      } catch (ignore) {}
    }
  }

  return {
    ok: true,
    success: true,
    已處理: handled > 0,
    handled: handled,
    failed: failed,
    模組: 'LINE身份權限33',
    version: LINE身份權限33_版本,
    message: handled > 0 ? 'LINE身份權限33指令已處理' : '沒有LINE身份權限33指令',
    replies: replies
  };
}

function 處理_LINE文字事件_身份綁定模組(event) {
  const 文字 = String(event?.message?.text || '').trim();
  if (!文字) return { handled: false, text: '' };

  const LINE_USER_ID = String(event?.source?.userId || '').trim();

  if (/^綁定\s+/i.test(文字)) {
    const 工號 = 文字.replace(/^綁定\s+/i, '').trim();
    return { handled: true, text: 處理_LINE_綁定指令(LINE_USER_ID, 工號, event) };
  }

  if (/^解除綁定$/i.test(文字)) {
    return { handled: true, text: 處理_LINE_解除綁定(LINE_USER_ID) };
  }

  if (/^我的任務$/i.test(文字)) {
    return { handled: true, text: 處理_LINE_我的任務(LINE_USER_ID) };
  }

  if (/^權限檢查$/i.test(文字)) {
    return { handled: true, text: 處理_LINE_權限檢查(LINE_USER_ID) };
  }

  return { handled: false, text: '' };
}

function 處理_LINE_綁定指令(LINE_USER_ID, 工號, event) {
  LINE_USER_ID = String(LINE_USER_ID || '').trim();
  工號 = String(工號 || '').trim();

  if (!LINE_USER_ID) return '無法取得 LINE_USER_ID，請確認此訊息來自 LINE Bot webhook。';
  if (!工號) return '格式錯誤。\n請輸入：綁定 工號\n例如：綁定 fhfi546';

  // ✅ 唯一正式同步點：這裡會強制寫入正式主庫 33_LINE身份權限。
  const sync = LINE身份權限33_同步正式身份表_(LINE_USER_ID, 工號);
  if (!sync.ok) {
    LINE身份權限33_寫紀錄_(LINE_USER_ID, 工號, '', '綁定', '失敗', sync.message);
    return sync.message;
  }

  const 身份 = 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID);
  const 姓名 = String(身份?.['姓名'] || '').trim();
  const 角色 = LINE身份權限33_轉顯示角色_(String(身份?.['角色'] || '').trim());
  const 權限等級 = LINE身份權限33_取得權限等級_(身份);

  LINE身份權限33_寫紀錄_(LINE_USER_ID, 工號, 姓名, '綁定', '成功', sync.message);
  LINE身份權限33_嘗試更新RichMenu_(LINE_USER_ID, 身份);

  return [
    '✅ 身份綁定成功',
    '姓名：' + 姓名,
    '工號：' + 工號,
    '角色：' + 角色,
    '權限等級：' + 權限等級,
    '',
    '可輸入「權限檢查」確認目前權限。',
    '',
    '✅ 選單已更新',
    '目標選單：' + LINE身份權限33_取得目標選單名稱_(身份),
    '角色：' + 角色,
    '權限等級：' + 權限等級
  ].join('\n');
}

/**
 * 正式同步：強制寫入正式主庫 33_LINE身份權限。
 */
function LINE身份權限33_同步正式身份表_(LINE_USER_ID, 工號) {
  LINE_USER_ID = String(LINE_USER_ID || '').trim();
  工號 = String(工號 || '').trim();

  if (!LINE_USER_ID) return { ok: false, message: '缺少LINE_USER_ID，不可同步33_LINE身份權限', row: null };
  if (!工號) return { ok: false, message: '缺少工號，不可同步33_LINE身份權限', row: null };

  const 人員 = 查詢_人員主檔_BY_工號(工號);
  if (!人員) return { ok: false, message: '01_人員主檔找不到工號：' + 工號, row: null };

  const ss = 取得_LINE身份權限33_試算表_();
  const sh = ss.getSheetByName(LINE身份權限33_身份表);
  if (!sh) throw new Error('缺少分頁：' + LINE身份權限33_身份表);

  const rows = LINE身份權限33_讀取表格物件陣列_(LINE身份權限33_身份表);

  const sameLine = rows.find(r => String(r['LINE_USER_ID'] || '').trim() === LINE_USER_ID);
  if (sameLine && String(sameLine['工號'] || '').trim() && String(sameLine['工號']).trim() !== 工號) {
    return { ok: false, message: '此 LINE 已綁定其他工號：' + sameLine['工號'] + '\n如需更換，請先輸入：解除綁定', row: sameLine.__row };
  }

  const sameEmp = rows.find(r => String(r['工號'] || '').trim() === 工號);
  if (sameEmp && String(sameEmp['LINE_USER_ID'] || '').trim() && String(sameEmp['LINE_USER_ID']).trim() !== LINE_USER_ID) {
    return { ok: false, message: '此工號已被其他 LINE 綁定。\n工號：' + 工號 + '\n如需異動，請通知主管人工確認。', row: sameEmp.__row };
  }

  const values = [[
    LINE_USER_ID,
    人員.工號,
    人員.姓名,
    人員.部門,
    人員.組別,
    人員.職稱,
    人員.角色,
    '是',
    'LINE真實綁定完成；33_LINE主管權限v1.7.2強制正式主庫同步',
    LINE身份權限33_現在_()
  ]];

  if (sameEmp && sameEmp.__row) {
    sh.getRange(sameEmp.__row, 1, 1, 10).setValues(values);
    return { ok: true, message: '已更新正式主庫33_LINE身份權限：' + 工號, row: sameEmp.__row };
  }

  sh.appendRow(values[0]);
  return { ok: true, message: '已新增正式主庫33_LINE身份權限：' + 工號, row: sh.getLastRow() };
}

// 舊函數名相容：避免其他檔案仍呼叫舊名稱。
function LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號) {
  return LINE身份權限33_同步正式身份表_(LINE_USER_ID, 工號);
}

function LINE身份權限33_同步綁定成功_BY事件_(event, 工號) {
  const LINE_USER_ID = String(event?.source?.userId || '').trim();
  return LINE身份權限33_同步正式身份表_(LINE_USER_ID, 工號);
}

function 同步_LINE身份權限33_(LINE_USER_ID, 工號) {
  return LINE身份權限33_同步正式身份表_(LINE_USER_ID, 工號);
}

function 處理_LINE_解除綁定(LINE_USER_ID) {
  LINE_USER_ID = String(LINE_USER_ID || '').trim();
  if (!LINE_USER_ID) return '無法取得 LINE_USER_ID，請確認此訊息來自 LINE Bot webhook。';

  const 身份 = 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID);
  if (!身份) return '目前尚未綁定。\n如需綁定，請輸入：綁定 工號';

  const ss = 取得_LINE身份權限33_試算表_();
  const sh = ss.getSheetByName(LINE身份權限33_身份表);
  sh.getRange(身份.__row, 8).setValue('否');
  sh.getRange(身份.__row, 9).setValue('已解除綁定；保留歷史資料');
  sh.getRange(身份.__row, 10).setValue(LINE身份權限33_現在_());

  LINE身份權限33_寫紀錄_(LINE_USER_ID, 身份['工號'], 身份['姓名'], '解除綁定', '成功', '啟用改為否');
  return '已解除綁定。\n如需重新使用個人任務，請再次輸入：綁定 工號';
}

function 處理_LINE_我的任務(LINE_USER_ID) {
  LINE_USER_ID = String(LINE_USER_ID || '').trim();
  if (!LINE_USER_ID) return '無法取得 LINE_USER_ID，請確認此訊息來自 LINE Bot webhook。';

  const 身份 = 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID);
  if (!身份 || String(身份['啟用'] || '').trim() !== '是') {
    return '尚未完成 LINE 綁定，請輸入：綁定 工號\n例如：綁定 fhfi546';
  }

  const 工號 = String(身份['工號'] || '').trim();
  const 任務 = 查詢_今日派班待報工_BY_工號(工號);
  if (!任務.length) return '目前沒有待報工任務。\n工號：' + 工號 + '\n姓名：' + 身份['姓名'];

  const lines = ['今日待報工任務：'];
  任務.slice(0, 10).forEach(function(r, i) {
    lines.push([
      (i + 1) + '. 派班編號：' + r['派班編號'],
      '產品：' + r['產品編號'] + '｜' + r['品名'],
      '工站：' + r['工站名稱'] + '｜機台：' + r['機台編號'],
      '預計數量：' + r['預計數量']
    ].join('\n'));
  });
  if (任務.length > 10) lines.push('尚有 ' + (任務.length - 10) + ' 筆，請至 PWA 查看完整清單。');
  return lines.join('\n\n');
}

function 處理_LINE_權限檢查(LINE_USER_ID) {
  const 身份 = 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID);
  if (!身份 || String(身份['啟用'] || '').trim() !== '是') return '尚未完成 LINE 綁定，請輸入：綁定 工號';

  return [
    '權限檢查',
    '姓名：' + 身份['姓名'],
    '工號：' + 身份['工號'],
    '角色：' + LINE身份權限33_轉顯示角色_(身份['角色']),
    '權限等級：' + LINE身份權限33_取得權限等級_(身份),
    '啟用：' + 身份['啟用'],
    '資料庫：正式主庫'
  ].join('\n');
}

function 查詢_人員主檔_BY_工號(工號) {
  const rows = LINE身份權限33_讀取表格物件陣列_(LINE身份權限33_人員表);
  const key = String(工號 || '').trim();
  const r = rows.find(x => String(x['工號'] || '').trim() === key);
  if (!r) return null;
  return {
    工號: String(r['工號'] || '').trim(),
    姓名: String(r['姓名'] || '').trim(),
    部門: String(r['部門'] || '').trim(),
    組別: String(r['組別'] || '').trim(),
    職稱: String(r['職稱'] || '').trim(),
    角色: String(r['角色類型'] || r['角色'] || '').trim() || LINE身份權限33_依職稱判斷角色_(r['職稱'])
  };
}

function 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID) {
  const rows = LINE身份權限33_讀取表格物件陣列_(LINE身份權限33_身份表);
  const key = String(LINE_USER_ID || '').trim();
  if (!key) return null;
  return rows.find(x => String(x['LINE_USER_ID'] || '').trim() === key) || null;
}

function 查詢_LINE身份_BY_工號(工號) {
  const rows = LINE身份權限33_讀取表格物件陣列_(LINE身份權限33_身份表);
  const key = String(工號 || '').trim();
  if (!key) return null;
  return rows.find(x => String(x['工號'] || '').trim() === key) || null;
}

function 查詢_今日派班待報工_BY_工號(工號) {
  const rows = LINE身份權限33_讀取表格物件陣列_(LINE身份權限33_今日派班表);
  const key = String(工號 || '').trim();
  return rows.filter(x => String(x['工號'] || '').trim() === key && String(x['狀態'] || '').trim() === '待報工');
}

function LINE身份權限33_嘗試更新RichMenu_(LINE_USER_ID, 身份) {
  try {
    if (typeof 更新LINE主選單_BY身份權限33_ === 'function') return 更新LINE主選單_BY身份權限33_(LINE_USER_ID, 身份);
    if (typeof LINE_RichMenu_依身份更新主選單_ === 'function') return LINE_RichMenu_依身份更新主選單_(LINE_USER_ID, 身份);
    if (typeof 設定_LINE_RichMenu_一般員工入口_ === 'function') return 設定_LINE_RichMenu_一般員工入口_(LINE_USER_ID);
  } catch (err) {}
}

function LINE身份權限33_取得目標選單名稱_(身份) {
  const role = String(身份?.['角色'] || '').trim();
  if (/主管|幹部|主任|工程師/.test(role)) return '主管入口';
  return '一般員工入口';
}

function LINE身份權限33_取得權限等級_(身份) {
  const role = String(身份?.['角色'] || '').trim();
  if (/主管|幹部|主任|工程師/.test(role)) return 90;
  return 10;
}

function LINE身份權限33_轉顯示角色_(role) {
  role = String(role || '').trim();
  if (/主管|幹部|主任|工程師/.test(role)) return '主管/幹部';
  if (/作業員|學生/.test(role)) return '現場人員';
  return role || '現場人員';
}

function LINE身份權限33_依職稱判斷角色_(職稱) {
  const t = String(職稱 || '').trim();
  if (/主任|工程師|助理工程師|組長|副組長|幹部/.test(t)) return '幹部';
  return '作業員';
}

function LINE身份權限33_建立或修復表_(ss, sheetName, headers) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  const current = sh.getRange(1, 1, 1, Math.max(headers.length, sh.getLastColumn() || headers.length)).getValues()[0];
  let need = false;
  for (let i = 0; i < headers.length; i++) {
    if (String(current[i] || '').trim() !== headers[i]) {
      need = true;
      break;
    }
  }
  if (need) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  return sh;
}

function LINE身份權限33_讀取表格物件陣列_(sheetName) {
  const ss = 取得_LINE身份權限33_試算表_();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('缺少分頁：' + sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h || '').trim());
  return values.slice(1).map(function(row, i) {
    const o = { __row: i + 2 };
    headers.forEach(function(h, c) {
      if (h) o[h] = row[c];
    });
    return o;
  });
}

/**
 * v1.7.2 關鍵修正：強制開正式主庫，不走舊 取得試算表_()。
 */
function 取得_LINE身份權限33_試算表_() {
  return SpreadsheetApp.openById(LINE身份權限33_正式主庫ID);
}

function LINE身份權限33_寫紀錄_(LINE_USER_ID, 工號, 姓名, 動作, 結果, 備註) {
  try {
    const ss = 取得_LINE身份權限33_試算表_();
    LINE身份權限33_建立或修復表_(ss, LINE身份權限33_紀錄表, LINE身份權限33_紀錄欄位);
    const sh = ss.getSheetByName(LINE身份權限33_紀錄表);
    sh.appendRow([LINE身份權限33_現在_(), LINE_USER_ID, 工號, 姓名, 動作, 結果, 備註]);
  } catch (err) {}
}

function LINE身份權限33_回覆LINE_(replyToken, text) {
  if (typeof 回覆LINE_ === 'function') {
    回覆LINE_(replyToken, text);
    return;
  }

  const token = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!token || !replyToken) return;

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: String(text || '').slice(0, 4900) }]
    }),
    muteHttpExceptions: true
  });
}

function LINE身份權限33_現在_() {
  return Utilities.formatDate(new Date(), LINE身份權限33_時區, 'yyyy-MM-dd HH:mm:ss');
}
