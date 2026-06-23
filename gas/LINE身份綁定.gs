/**
 * LINE身份綁定.gs
 * 智慧製造中央作戰指揮中心 v38.7
 * 用途：LINE Bot 綁定 / 解除綁定 / 我的任務 指令模組
 *
 * 接入方式：
 * 1. 保留既有 doPost(e)。
 * 2. 在 LINE 文字訊息分流處呼叫：
 *    var lineResult = 處理_LINE文字事件_身份綁定模組(event);
 *    if (lineResult && lineResult.handled) return lineResult.output;
 * 3. 本模組不會自行覆蓋 doPost(e)，避免破壞既有主檔檢查、戰情、今日派班功能。
 */

const LINE身份綁定_設定 = {
  分頁_人員主檔: '01_人員主檔',
  分頁_LINE身份權限: '33_LINE身份權限',
  分頁_今日派班: '20_今日派班',
  時區: 'Asia/Taipei'
};

/**
 * LINE文字事件分流入口：供既有 doPost(e) 呼叫。
 * @param {Object} event LINE webhook event
 * @return {{handled:boolean, output:Object|null, text:string}}
 */
function 處理_LINE文字事件_身份綁定模組(event) {
  const 文字 = String(event?.message?.text || '').trim();
  if (!文字) return { handled: false, output: null, text: '' };

  const LINE_USER_ID = String(event?.source?.userId || '').trim();
  const 回覆Token = String(event?.replyToken || '').trim();

  if (/^綁定\s+/i.test(文字)) {
    const 工號 = 文字.replace(/^綁定\s+/i, '').trim();
    const 訊息 = 處理_LINE_綁定指令(LINE_USER_ID, 工號);
    return LINE回覆_包裝(回覆Token, 訊息);
  }

  if (/^解除綁定$/i.test(文字)) {
    const 訊息 = 處理_LINE_解除綁定(LINE_USER_ID);
    return LINE回覆_包裝(回覆Token, 訊息);
  }

  if (/^我的任務$/i.test(文字)) {
    const 訊息 = 處理_LINE_我的任務(LINE_USER_ID);
    return LINE回覆_包裝(回覆Token, 訊息);
  }

  return { handled: false, output: null, text: '' };
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
  if (既有LINE && 既有LINE['工號'] && 既有LINE['工號'] !== 工號) {
    return '此 LINE 已綁定其他工號：' + 既有LINE['工號'] + '\n如需更換，請先輸入：解除綁定';
  }

  const 既有工號 = 查詢_LINE身份_BY_工號(工號);
  if (既有工號 && 既有工號['LINE_USER_ID'] && 既有工號['LINE_USER_ID'] !== LINE_USER_ID) {
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

  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
  if (!身份 || 身份['啟用'] !== '是') {
    return '尚未完成 LINE 綁定，請輸入：綁定 工號\n例如：綁定 fhfi546';
  }

  const 工號 = 身份['工號'];
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
  const r = rows.find(x => String(x['工號'] || '').trim() === String(工號).trim());
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
  return rows.find(x => String(x['LINE_USER_ID'] || '').trim() === String(LINE_USER_ID).trim()) || null;
}

function 查詢_LINE身份_BY_工號(工號) {
  const rows = 讀取表格物件陣列_(LINE身份綁定_設定.分頁_LINE身份權限);
  return rows.find(x => String(x['工號'] || '').trim() === String(工號).trim()) || null;
}

function 寫入_LINE身份綁定(LINE_USER_ID, 人員) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
  return rows.filter(x =>
    String(x['工號'] || '').trim() === String(工號).trim() &&
    String(x['狀態'] || '').trim() === '待報工'
  );
}

function 讀取表格物件陣列_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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

function 取得_現在時間文字() {
  return Utilities.formatDate(new Date(), LINE身份綁定_設定.時區, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 回覆包裝：如果既有系統已有 LINE reply 函數，可只取 text 自行回覆。
 * 此處保持純資料回傳，避免重複發送或破壞既有 replyMessage。
 */
function LINE回覆_包裝(replyToken, text) {
  return {
    handled: true,
    output: ContentService.createTextOutput(JSON.stringify({ ok: true, replyToken: replyToken, text: text })).setMimeType(ContentService.MimeType.JSON),
    text: text
  };
}
