/**
 * LINE身份綁定.gs
 * 智慧製造中央作戰指揮中心 v38.7
 * 用途：LINE Bot 綁定 / 解除綁定 / 我的任務 指令模組
 *
 * 正式主後端 doPost(e) 內已預留：
 *   if (typeof LINE身份權限_嘗試處理Webhook_ === 'function') { ... }
 *
 * 本檔提供該預留鉤子的正式實作，不覆蓋 doPost(e)。
 */

const LINE身份綁定_設定 = {
  分頁_人員主檔: '01_人員主檔',
  分頁_LINE身份權限: '33_LINE身份權限',
  分頁_今日派班: '20_今日派班',
  時區: 'Asia/Taipei'
};

/**
 * 正式主後端預留鉤子。
 * 主 doPost(e) 會傳入完整 LINE payload：{ events:[...] }
 * @param {Object} payload LINE webhook payload
 * @return {Object} 給主 doPost 包成 JSON 的處理結果
 */
function LINE身份權限_嘗試處理Webhook_(payload) {
  const events = Array.isArray(payload && payload.events) ? payload.events : [];
  let handled = 0;
  let failed = 0;
  const replies = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i] || {};
    try {
      if (ev.type !== 'message') continue;
      if (!ev.message || ev.message.type !== 'text') continue;
      if (!ev.replyToken) continue;

      const result = 處理_LINE文字事件_身份綁定模組(ev);
      if (!result || !result.handled) continue;

      LINE身份綁定_送出LINE回覆_(ev.replyToken, result.text);
      replies.push(result.text);
      handled++;
    } catch (err) {
      failed++;
    }
  }

  return {
    ok: true,
    success: true,
    已處理: handled > 0,
    handled: handled,
    failed: failed,
    模組: 'LINE身份權限',
    message: handled > 0 ? 'LINE身份權限指令已處理' : '沒有LINE身份權限指令',
    replies: replies
  };
}

/**
 * LINE文字事件分流入口。
 * @param {Object} event LINE webhook event
 * @return {{handled:boolean, text:string}}
 */
function 處理_LINE文字事件_身份綁定模組(event) {
  const 文字 = String(event?.message?.text || '').trim();
  if (!文字) return { handled: false, text: '' };

  const LINE_USER_ID = String(event?.source?.userId || '').trim();

  if (/^綁定\s+/i.test(文字)) {
    const 工號 = 文字.replace(/^綁定\s+/i, '').trim();
    return { handled: true, text: 處理_LINE_綁定指令(LINE_USER_ID, 工號) };
  }

  if (/^解除綁定$/i.test(文字)) {
    return { handled: true, text: 處理_LINE_解除綁定(LINE_USER_ID) };
  }

  if (/^我的任務$/i.test(文字)) {
    return { handled: true, text: 處理_LINE_我的任務(LINE_USER_ID) };
  }

  return { handled: false, text: '' };
}

/**
 * 綁定指令：綁定 工號
 */
function 處理_LINE_綁定指令(LINE_USER_ID, 工號) {
  if (!LINE_USER_ID) return '無法取得 LINE_USER_ID，請確認此訊息來自 LINE Bot webhook。';
  if (!工號) return '格式錯誤。\n請輸入：綁定 工號\n例如：綁定 fhfi546';

  const 人員 = 查詢_人員主檔_BY_工號(工號);
  if (!人員) return '找不到此工號：' + 工號 + '\n請確認工號是否正確。';

  const 既有LINE = 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID);
  if (既有LINE && 既有LINE['工號'] && String(既有LINE['工號']).trim() !== 工號) {
    return '此 LINE 已綁定其他工號：' + 既有LINE['工號'] + '\n如需更換，請先輸入：解除綁定';
  }

  const 既有工號 = 查詢_LINE身份_BY_工號(工號);
  if (既有工號 && 既有工號['LINE_USER_ID'] && String(既有工號['LINE_USER_ID']).trim() !== LINE_USER_ID) {
    return '此工號已綁定其他 LINE。\n工號：' + 工號 + '\n如需異動，請通知主管人工確認。';
  }

  寫入_LINE身份綁定(LINE_USER_ID, 人員);
  return [
    '綁定成功',
    '工號：' + 人員['工號'],
    '姓名：' + 人員['姓名'],
    '角色：' + 人員['角色'],
    '你現在可以使用：我的任務'
  ].join('\n');
}

/**
 * 解除綁定：依 LINE_USER_ID 停用，不刪除歷史資料。
 */
function 處理_LINE_解除綁定(LINE_USER_ID) {
  if (!LINE_USER_ID) return '無法取得 LINE_USER_ID，請確認此訊息來自 LINE Bot webhook。';
  const 身份 = 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID);
  if (!身份) return '目前尚未綁定。\n如需綁定，請輸入：綁定 工號';

  const ss = 取得_LINE身份綁定_試算表_();
  const sh = ss.getSheetByName(LINE身份綁定_設定.分頁_LINE身份權限);
  sh.getRange(身份.__row, 8).setValue('否');
  sh.getRange(身份.__row, 9).setValue('已解除綁定；保留歷史資料');
  sh.getRange(身份.__row, 10).setValue(取得_現在時間文字());

  return '已解除綁定。\n如需重新使用個人任務，請再次輸入：綁定 工號';
}

/**
 * 我的任務：依 LINE_USER_ID 找工號，再查 20_今日派班 待報工。
 */
function 處理_LINE_我的任務(LINE_USER_ID) {
  if (!LINE_USER_ID) return '無法取得 LINE_USER_ID，請確認此訊息來自 LINE Bot webhook。';
  const 身份 = 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID);
  if (!身份 || String(身份['啟用'] || '').trim() !== '是') {
    return '尚未完成 LINE 綁定，請輸入：綁定 工號\n例如：綁定 fhfi546';
  }

  const 工號 = String(身份['工號'] || '').trim();
  const 任務 = 查詢_今日派班待報工_BY_工號(工號);
  if (!任務.length) {
    return '目前沒有待報工任務。\n工號：' + 工號 + '\n姓名：' + 身份['姓名'];
  }

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

function 查詢_人員主檔_BY_工號(工號) {
  const rows = 讀取表格物件陣列_(LINE身份綁定_設定.分頁_人員主檔);
  const key = String(工號 || '').trim();
  const r = rows.find(x => String(x['工號'] || '').trim() === key);
  if (!r) return null;
  return {
    工號: String(r['工號'] || '').trim(),
    姓名: String(r['姓名'] || '').trim(),
    部門: String(r['部門'] || '').trim(),
    組別: String(r['組別'] || '').trim(),
    職稱: String(r['職稱'] || '').trim(),
    角色: String(r['角色類型'] || r['角色'] || '').trim() || '作業員'
  };
}

function 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID) {
  const rows = 讀取表格物件陣列_(LINE身份綁定_設定.分頁_LINE身份權限);
  const key = String(LINE_USER_ID || '').trim();
  if (!key) return null;
  return rows.find(x => String(x['LINE_USER_ID'] || '').trim() === key) || null;
}

function 查詢_LINE身份_BY_工號(工號) {
  const rows = 讀取表格物件陣列_(LINE身份綁定_設定.分頁_LINE身份權限);
  const key = String(工號 || '').trim();
  if (!key) return null;
  return rows.find(x => String(x['工號'] || '').trim() === key) || null;
}

function 寫入_LINE身份綁定(LINE_USER_ID, 人員) {
  const ss = 取得_LINE身份綁定_試算表_();
  const sh = ss.getSheetByName(LINE身份綁定_設定.分頁_LINE身份權限);
  if (!sh) throw new Error('缺少分頁：' + LINE身份綁定_設定.分頁_LINE身份權限);

  const rows = 讀取表格物件陣列_(LINE身份綁定_設定.分頁_LINE身份權限);
  const exist = rows.find(x => String(x['工號'] || '').trim() === 人員['工號']);
  const values = [[
    LINE_USER_ID,
    人員['工號'],
    人員['姓名'],
    人員['部門'],
    人員['組別'],
    人員['職稱'],
    人員['角色'],
    '是',
    'LINE真實綁定完成',
    取得_現在時間文字()
  ]];

  if (exist && exist.__row) {
    sh.getRange(exist.__row, 1, 1, 10).setValues(values);
  } else {
    sh.appendRow(values[0]);
  }
}

function 查詢_今日派班待報工_BY_工號(工號) {
  const rows = 讀取表格物件陣列_(LINE身份綁定_設定.分頁_今日派班);
  const key = String(工號 || '').trim();
  return rows.filter(x =>
    String(x['工號'] || '').trim() === key &&
    String(x['狀態'] || '').trim() === '待報工'
  );
}

function 讀取表格物件陣列_(sheetName) {
  const ss = 取得_LINE身份綁定_試算表_();
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

function 取得_LINE身份綁定_試算表_() {
  if (typeof 取得試算表_ === 'function') return 取得試算表_();
  const id = String(PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || '').trim();
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到智慧製造中央作戰指揮中心資料庫');
  return ss;
}

function 取得_現在時間文字() {
  return Utilities.formatDate(new Date(), LINE身份綁定_設定.時區, 'yyyy-MM-dd HH:mm:ss');
}

function LINE身份綁定_送出LINE回覆_(replyToken, text) {
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
