/**
 * 化新精密｜智慧 5S｜既有唯一 LINE Bot 群組綁定
 * 版本：1.1.0
 *
 * 部署位置：既有「NEXUS OS 智慧製造系統」Apps Script 專案。
 *
 * 安全原則：
 * 1. 只接受既有 LINE Bot Webhook 送入的群組文字事件。
 * 2. 操作者必須已完成 LINE 身分綁定，且具主管、班長、工程師或更高權限。
 * 3. 綁定前呼叫 LINE 群組摘要 API，確認 Bot 確實位於該群組。
 * 4. 已綁定其他群組時不直接覆蓋，必須使用「改綁確認」指令。
 * 5. 解除綁定必須使用明確的「解除確認」指令。
 * 6. 群組識別碼只寫入唯一中央資料庫，不另建第二套 5S 資料庫。
 */

var 智慧5S_LINE群組綁定_版本 = '1.1.0';
var 智慧5S_LINE群組綁定_中央資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S_LINE群組綁定_區域分頁 = '5S_區域主檔';
var 智慧5S_LINE群組綁定_紀錄分頁 = '5S_LINE群組綁定紀錄';
var 智慧5S_LINE群組綁定_PWA網址 = 'https://qhero70.github.io/smart-factory-worker-app/5s/?v=102';
var 智慧5S_LINE群組綁定_紀錄欄位 = [
  '時間戳', '動作', 'LINE群組識別碼', 'LINE群組名稱', '區域代碼', '區域名稱',
  '操作者LINE_USER_ID', '操作者工號', '操作者姓名', '結果', '備註'
];

/**
 * 接入既有 doPost(e) 的優先 Webhook 處理器。
 * 回傳 null 代表不是智慧 5S 群組管理指令，讓既有 LINE 指令繼續處理。
 */
function 智慧5S_LINE群組綁定_嘗試處理Webhook_(內容) {
  var 事件清單 = 內容 && Array.isArray(內容.events) ? 內容.events : [];
  if (!事件清單.length) return null;

  var 已處理 = 0;
  var 未處理事件 = [];
  var 結果清單 = [];
  事件清單.forEach(function (事件) {
    if (!事件 || 事件.type !== 'message' || !事件.message || 事件.message.type !== 'text') {
      未處理事件.push(事件);
      return;
    }
    var 指令 = 智慧5S_LINE群組綁定_解析指令_(事件.message.text);
    if (!指令) {
      未處理事件.push(事件);
      return;
    }
    已處理++;
    try {
      結果清單.push(智慧5S_LINE群組綁定_處理單一事件_(事件, 指令));
    } catch (錯誤) {
      var 錯誤文字 = '❌ 智慧 5S 群組設定失敗\n' + String(錯誤 && 錯誤.message ? 錯誤.message : 錯誤).slice(0, 1200);
      智慧5S_LINE群組綁定_回覆_(事件.replyToken, 錯誤文字);
      結果清單.push({ 成功: false, 訊息: 錯誤文字 });
    }
  });

  if (!已處理) return null;
  if (未處理事件.length) 內容.events = 未處理事件;
  return {
    ok: true,
    success: true,
    已處理: 未處理事件.length === 0,
    已部分處理: 未處理事件.length > 0,
    處理筆數: 已處理,
    待後續路由筆數: 未處理事件.length,
    版本: 智慧5S_LINE群組綁定_版本,
    結果: 結果清單,
    訊息: '智慧 5S LINE 群組管理指令已處理'
  };
}

function 智慧5S_LINE群組綁定_處理單一事件_(事件, 指令) {
  var 來源 = 事件.source || {};
  var 回覆權杖 = String(事件.replyToken || '').trim();
  var 來源類型 = String(來源.type || '').trim();
  var 群組識別碼 = String(來源.groupId || '').trim();
  var 操作者LINE識別碼 = String(來源.userId || '').trim();

  if (指令.類型 === '說明') {
    var 說明 = 智慧5S_LINE群組綁定_建立說明文字_();
    智慧5S_LINE群組綁定_回覆_(回覆權杖, 說明);
    return { 成功: true, 動作: '說明', 訊息: 說明 };
  }

  if (來源類型 !== 'group' || !群組識別碼) {
    var 非群組訊息 = '⚠️ 此功能只能在正式 5S LINE 群組內使用。\n\n請先將既有 NEXUS OS Bot 邀請進群組，再由已授權主管輸入「5S群組說明」。';
    智慧5S_LINE群組綁定_回覆_(回覆權杖, 非群組訊息);
    return { 成功: false, 動作: 指令.類型, 訊息: 非群組訊息 };
  }

  var 身份 = 智慧5S_LINE群組綁定_取得身份_(操作者LINE識別碼);
  var 權限 = 智慧5S_LINE群組綁定_檢查管理權限_(身份, 操作者LINE識別碼);
  if (!權限.允許) {
    var 權限訊息 = '⛔ 權限不足\n此指令只允許已完成身分綁定的主管、班長、工程師或系統管理員操作。\n\n請先在 Bot 一對一聊天室輸入：綁定 你的工號';
    智慧5S_LINE群組綁定_回覆_(回覆權杖, 權限訊息);
    return { 成功: false, 動作: 指令.類型, 訊息: 權限訊息 };
  }

  var 群組摘要 = 智慧5S_LINE群組綁定_取得群組摘要_(群組識別碼);
  if (!群組摘要.成功) {
    var 群組錯誤 = '❌ 無法確認目前群組\n' + 群組摘要.訊息 + '\n\n系統未寫入任何群組設定。';
    智慧5S_LINE群組綁定_回覆_(回覆權杖, 群組錯誤);
    return { 成功: false, 動作: 指令.類型, 訊息: 群組錯誤 };
  }

  var 結果;
  if (指令.類型 === '狀態') {
    結果 = 智慧5S_LINE群組綁定_查詢狀態_(群組識別碼, 群組摘要.群組名稱);
  } else if (指令.類型 === '綁定') {
    結果 = 智慧5S_LINE群組綁定_執行綁定_(群組識別碼, 群組摘要.群組名稱, 指令.目標, false, 身份);
  } else if (指令.類型 === '改綁確認') {
    結果 = 智慧5S_LINE群組綁定_執行綁定_(群組識別碼, 群組摘要.群組名稱, 指令.目標, true, 身份);
  } else if (指令.類型 === '解除確認') {
    結果 = 智慧5S_LINE群組綁定_執行解除_(群組識別碼, 群組摘要.群組名稱, 指令.目標, 身份);
  } else {
    結果 = { 成功: false, 訊息: '不支援的智慧 5S 群組指令。' };
  }

  智慧5S_LINE群組綁定_回覆_(回覆權杖, 結果.訊息);
  return 結果;
}

function 智慧5S_LINE群組綁定_解析指令_(原始文字) {
  var 文字 = String(原始文字 || '').replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim();
  if (!文字) return null;
  if (/^(?:5S|５Ｓ)\s*(?:群組)?\s*(?:說明|幫助|指令)$/i.test(文字) || /^(?:5S|５Ｓ)\s*群組$/i.test(文字)) {
    return { 類型: '說明', 目標: '' };
  }
  if (/^(?:5S|５Ｓ)\s*(?:群組)?\s*(?:狀態|綁定狀態|群組狀態)$/i.test(文字)) {
    return { 類型: '狀態', 目標: '' };
  }
  var 配對 = 文字.match(/^(?:5S|５Ｓ)\s*(?:群組)?\s*改綁確認\s*(.+)$/i);
  if (配對) return { 類型: '改綁確認', 目標: String(配對[1] || '').trim() };
  配對 = 文字.match(/^(?:5S|５Ｓ)\s*(?:群組)?\s*解除確認\s*(.+)$/i);
  if (配對) return { 類型: '解除確認', 目標: String(配對[1] || '').trim() };
  配對 = 文字.match(/^(?:5S|５Ｓ)\s*(?:群組)?\s*綁定\s*(.+)$/i);
  if (配對) return { 類型: '綁定', 目標: String(配對[1] || '').trim() };
  return null;
}

function 智慧5S_LINE群組綁定_建立說明文字_() {
  return [
    '🧭 智慧 5S 群組設定',
    '',
    '查詢目前狀態：',
    '5S群組狀態',
    '',
    '四個啟用區域共用本群組：',
    '5S群組綁定 全部',
    '',
    '只綁定一個區域：',
    '5S群組綁定 區域代碼',
    '',
    '若區域已屬於其他群組，系統會停止；確認後才可輸入：',
    '5S群組改綁確認 區域代碼',
    '',
    '解除本群組：',
    '5S群組解除確認 區域代碼',
    '',
    '「區域代碼」也可改成「全部」。'
  ].join('\n');
}

function 智慧5S_LINE群組綁定_取得身份_(LINE識別碼) {
  if (!LINE識別碼) return null;
  try {
    if (typeof LINE身份權限33_取得身份_ === 'function') return LINE身份權限33_取得身份_(LINE識別碼);
  } catch (錯誤1) {}
  try {
    if (typeof 查詢_LINE身份_BY_LINE_USER_ID === 'function') return 查詢_LINE身份_BY_LINE_USER_ID(LINE識別碼);
  } catch (錯誤2) {}
  try {
    if (typeof 取得試算表_ !== 'function') return null;
    var 分頁 = 取得試算表_().getSheetByName('33_LINE身份權限');
    if (!分頁 || 分頁.getLastRow() < 2) return null;
    var 資料 = 分頁.getDataRange().getDisplayValues();
    var 欄位 = 資料.shift().map(function (值) { return String(值 || '').trim(); });
    var LINE欄 = 欄位.indexOf('LINE_USER_ID');
    var 啟用欄 = 欄位.indexOf('啟用');
    for (var 索引 = 資料.length - 1; 索引 >= 0; 索引--) {
      if (String(資料[索引][LINE欄] || '').trim() !== LINE識別碼) continue;
      if (啟用欄 >= 0 && String(資料[索引][啟用欄] || '是').trim() === '否') continue;
      var 身份 = {};
      欄位.forEach(function (欄名, 欄索引) { 身份[欄名] = 資料[索引][欄索引]; });
      return 身份;
    }
  } catch (錯誤3) {}
  return null;
}

function 智慧5S_LINE群組綁定_檢查管理權限_(身份, LINE識別碼) {
  var 管理員清單 = '';
  try {
    管理員清單 = String(PropertiesService.getScriptProperties().getProperty('智慧5S_LINE群組綁定管理員_LINE_USER_ID') || '');
  } catch (錯誤) {}
  var 是指定管理員 = 管理員清單.split(/[,，、\s]+/).filter(Boolean).indexOf(String(LINE識別碼 || '').trim()) >= 0;
  if (是指定管理員) return { 允許: true, 原因: 'Script Properties 指定管理員' };
  if (!身份) return { 允許: false, 原因: '尚未完成 LINE 身分綁定' };
  if (String(身份.啟用 || '是').trim() === '否') return { 允許: false, 原因: '身分已停用' };

  var 主管入口 = String(身份.允許主管入口 || '').trim().toLowerCase();
  var 權限等級 = Number(身份.權限等級 || 0);
  var 角色文字 = [身份.角色, 身份.職稱, 身份.部門, 身份.組別].map(function (值) { return String(值 || '').trim(); }).join(' ');
  var 允許 = ['是', 'yes', 'y', 'true', '1'].indexOf(主管入口) >= 0 || 權限等級 >= 60 || /營運長|副總|總經理|廠長|經理|主管|主任|課長|組長|班長|領班|工程師|生技|資訊|品保|設備|系統管理員|管理員/.test(角色文字);
  return { 允許: 允許, 原因: 允許 ? '具智慧 5S 群組管理權限' : '主管入口未開通且權限等級低於 60' };
}

function 智慧5S_LINE群組綁定_取得群組摘要_(群組識別碼) {
  var 權杖 = '';
  try {
    權杖 = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  } catch (錯誤) {}
  if (!權杖) return { 成功: false, 訊息: '既有 LINE Bot 尚未設定 Channel Access Token。' };
  if (!群組識別碼) return { 成功: false, 訊息: 'Webhook 未提供群組識別碼。' };
  try {
    var 網址 = 'https://api.line.me/v2/bot/group/' + encodeURIComponent(群組識別碼) + '/summary';
    var 回應 = UrlFetchApp.fetch(網址, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + 權杖 },
      muteHttpExceptions: true
    });
    var 狀態碼 = Number(回應.getResponseCode());
    var 內容 = String(回應.getContentText() || '');
    if (狀態碼 !== 200) return { 成功: false, 訊息: 'LINE 群組驗證失敗，狀態碼：' + 狀態碼 };
    var 資料 = JSON.parse(內容 || '{}');
    if (String(資料.groupId || '').trim() !== 群組識別碼) return { 成功: false, 訊息: 'LINE 回傳的群組識別碼不一致。' };
    return {
      成功: true,
      群組識別碼: 群組識別碼,
      群組名稱: String(資料.groupName || '未命名群組').trim(),
      群組圖片網址: String(資料.pictureUrl || '').trim()
    };
  } catch (錯誤) {
    return { 成功: false, 訊息: 'LINE 群組驗證發生錯誤：' + String(錯誤.message || 錯誤).slice(0, 300) };
  }
}

function 智慧5S_LINE群組綁定_讀取區域資料_() {
  var 資料庫 = SpreadsheetApp.openById(智慧5S_LINE群組綁定_中央資料庫ID);
  var 分頁 = 資料庫.getSheetByName(智慧5S_LINE群組綁定_區域分頁);
  if (!分頁) throw new Error('找不到分頁：' + 智慧5S_LINE群組綁定_區域分頁);
  if (分頁.getLastRow() < 2) throw new Error('5S_區域主檔目前沒有區域資料。');
  var 欄位 = 分頁.getRange(1, 1, 1, 分頁.getLastColumn()).getDisplayValues()[0].map(function (值) { return String(值 || '').trim(); });
  var 索引 = 智慧5S_LINE群組綁定_欄位索引_(欄位);
  ['區域代碼', '區域名稱', 'LINE群組識別碼', '啟用'].forEach(function (欄名) {
    if (索引[欄名] === undefined) throw new Error('5S_區域主檔缺少欄位：' + 欄名);
  });
  var 值 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 欄位.length).getDisplayValues();
  var 區域 = [];
  值.forEach(function (列, 列索引) {
    var 代碼 = String(列[索引['區域代碼']] || '').trim();
    var 名稱 = String(列[索引['區域名稱']] || '').trim();
    if (!代碼 && !名稱) return;
    區域.push({
      試算表列號: 列索引 + 2,
      區域代碼: 代碼,
      區域名稱: 名稱,
      LINE群組識別碼: String(列[索引['LINE群組識別碼']] || '').trim(),
      啟用: String(列[索引['啟用']] || '是').trim()
    });
  });
  return { 資料庫: 資料庫, 分頁: 分頁, 欄位: 欄位, 索引: 索引, 區域: 區域 };
}

function 智慧5S_LINE群組綁定_選取目標_(區域清單, 目標文字) {
  var 目標 = String(目標文字 || '').trim();
  var 啟用區域 = 區域清單.filter(function (區域) { return 區域.啟用 !== '否'; });
  if (/^(全部|所有|全區)$/i.test(目標)) return 啟用區域;
  var 小寫目標 = 目標.toLowerCase();
  return 啟用區域.filter(function (區域) {
    return 區域.區域代碼.toLowerCase() === 小寫目標 || 區域.區域名稱.toLowerCase() === 小寫目標;
  });
}

function 智慧5S_LINE群組綁定_執行綁定_(群組識別碼, 群組名稱, 目標文字, 強制改綁, 身份) {
  var 鎖 = LockService.getScriptLock();
  鎖.waitLock(30000);
  try {
    var 資料 = 智慧5S_LINE群組綁定_讀取區域資料_();
    var 目標區域 = 智慧5S_LINE群組綁定_選取目標_(資料.區域, 目標文字);
    if (!目標區域.length) {
      return { 成功: false, 動作: '綁定', 訊息: '❌ 找不到啟用中的 5S 區域：「' + String(目標文字 || '') + '」\n請輸入「5S群組狀態」查看正式區域代碼。' };
    }

    var 衝突區域 = 目標區域.filter(function (區域) {
      return 區域.LINE群組識別碼 && 區域.LINE群組識別碼 !== 群組識別碼;
    });
    if (衝突區域.length && !強制改綁) {
      var 衝突名稱 = 衝突區域.map(function (區域) { return '・' + 區域.區域代碼 + '｜' + 區域.區域名稱; }).join('\n');
      return {
        成功: false,
        動作: '綁定',
        需要改綁確認: true,
        訊息: '⚠️ 下列區域已綁定其他 LINE 群組，系統未覆蓋：\n' + 衝突名稱 + '\n\n確認要改綁到「' + 群組名稱 + '」時，請輸入：\n5S群組改綁確認 ' + String(目標文字 || '')
      };
    }

    目標區域.forEach(function (區域) {
      資料.分頁.getRange(區域.試算表列號, 資料.索引['LINE群組識別碼'] + 1).setValue(群組識別碼);
      智慧5S_LINE群組綁定_寫入紀錄_(資料.資料庫, {
        動作: 強制改綁 ? '改綁確認' : '綁定',
        群組識別碼: 群組識別碼,
        群組名稱: 群組名稱,
        區域: 區域,
        身份: 身份,
        結果: '完成',
        備註: 區域.LINE群組識別碼 && 區域.LINE群組識別碼 !== 群組識別碼 ? '由其他群組改綁' : '綁定至目前群組'
      });
    });
    SpreadsheetApp.flush();
    var 名稱清單 = 目標區域.map(function (區域) { return '・' + 區域.區域代碼 + '｜' + 區域.區域名稱; }).join('\n');
    return {
      成功: true,
      動作: 強制改綁 ? '改綁確認' : '綁定',
      群組名稱: 群組名稱,
      綁定區域數: 目標區域.length,
      訊息: '✅ 智慧 5S 群組綁定完成\n群組：' + 群組名稱 + '\n區域：\n' + 名稱清單 + '\n\n系統未在訊息中顯示完整群組識別碼。'
    };
  } finally {
    鎖.releaseLock();
  }
}

function 智慧5S_LINE群組綁定_執行解除_(群組識別碼, 群組名稱, 目標文字, 身份) {
  var 鎖 = LockService.getScriptLock();
  鎖.waitLock(30000);
  try {
    var 資料 = 智慧5S_LINE群組綁定_讀取區域資料_();
    var 目標區域 = 智慧5S_LINE群組綁定_選取目標_(資料.區域, 目標文字);
    if (!目標區域.length) {
      return { 成功: false, 動作: '解除確認', 訊息: '❌ 找不到啟用中的 5S 區域：「' + String(目標文字 || '') + '」。' };
    }
    var 可解除 = 目標區域.filter(function (區域) { return 區域.LINE群組識別碼 === 群組識別碼; });
    var 其他群組 = 目標區域.filter(function (區域) { return 區域.LINE群組識別碼 && 區域.LINE群組識別碼 !== 群組識別碼; });
    if (!可解除.length) {
      return {
        成功: false,
        動作: '解除確認',
        訊息: 其他群組.length ? '⚠️ 指定區域屬於其他 LINE 群組，本群組無權解除。' : 'ℹ️ 指定區域目前沒有綁定本 LINE 群組。'
      };
    }

    可解除.forEach(function (區域) {
      資料.分頁.getRange(區域.試算表列號, 資料.索引['LINE群組識別碼'] + 1).setValue('');
      智慧5S_LINE群組綁定_寫入紀錄_(資料.資料庫, {
        動作: '解除確認', 群組識別碼: 群組識別碼, 群組名稱: 群組名稱,
        區域: 區域, 身份: 身份, 結果: '完成', 備註: '只解除目前群組擁有的區域'
      });
    });
    SpreadsheetApp.flush();
    var 解除清單 = 可解除.map(function (區域) { return '・' + 區域.區域代碼 + '｜' + 區域.區域名稱; }).join('\n');
    return {
      成功: true,
      動作: '解除確認',
      解除區域數: 可解除.length,
      訊息: '✅ 已解除本群組的智慧 5S 收件設定\n群組：' + 群組名稱 + '\n區域：\n' + 解除清單 + (其他群組.length ? '\n\n另有 ' + 其他群組.length + ' 個區域屬於其他群組，未變更。' : '')
    };
  } finally {
    鎖.releaseLock();
  }
}

function 智慧5S_LINE群組綁定_查詢狀態_(目前群組識別碼, 群組名稱) {
  var 資料 = 智慧5S_LINE群組綁定_讀取區域資料_();
  var 啟用區域 = 資料.區域.filter(function (區域) { return 區域.啟用 !== '否'; });
  var 行 = 啟用區域.map(function (區域) {
    var 狀態 = !區域.LINE群組識別碼 ? '尚未綁定' : 區域.LINE群組識別碼 === 目前群組識別碼 ? '已綁定本群組' : '已綁定其他群組';
    var 圖示 = 狀態 === '已綁定本群組' ? '✅' : 狀態 === '尚未綁定' ? '⚪' : '🔒';
    return 圖示 + ' ' + 區域.區域代碼 + '｜' + 區域.區域名稱 + '｜' + 狀態;
  });
  return {
    成功: true,
    動作: '狀態',
    啟用區域數: 啟用區域.length,
    訊息: '📋 智慧 5S 群組狀態\n目前群組：' + 群組名稱 + '\n\n' + (行.length ? 行.join('\n') : '目前沒有啟用區域')
  };
}

function 智慧5S_LINE群組綁定_寫入紀錄_(資料庫, 資料) {
  var 分頁 = 資料庫.getSheetByName(智慧5S_LINE群組綁定_紀錄分頁);
  if (!分頁) 分頁 = 資料庫.insertSheet(智慧5S_LINE群組綁定_紀錄分頁);
  if (分頁.getLastRow() < 1 || !String(分頁.getRange(1, 1).getValue() || '').trim()) {
    分頁.getRange(1, 1, 1, 智慧5S_LINE群組綁定_紀錄欄位.length).setValues([智慧5S_LINE群組綁定_紀錄欄位]);
    分頁.setFrozenRows(1);
    分頁.getRange(1, 1, 1, 智慧5S_LINE群組綁定_紀錄欄位.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  }
  var 區域 = 資料.區域 || {};
  var 身份 = 資料.身份 || {};
  分頁.appendRow([
    智慧5S_LINE群組綁定_現在_(), 資料.動作 || '', 資料.群組識別碼 || '', 資料.群組名稱 || '',
    區域.區域代碼 || '', 區域.區域名稱 || '', 身份.LINE_USER_ID || '', 身份.工號 || '', 身份.姓名 || '',
    資料.結果 || '', 資料.備註 || ''
  ]);
}

function 智慧5S_LINE群組綁定_回覆_(回覆權杖, 文字) {
  if (!回覆權杖) return;
  var 安全文字 = String(文字 || '').slice(0, 4900);
  if (typeof LINE主管戰情直連_送出回覆_ === 'function') return LINE主管戰情直連_送出回覆_(回覆權杖, 安全文字);
  if (typeof 回覆LINE_ === 'function') return 回覆LINE_(回覆權杖, 安全文字);
  var 權杖 = String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  if (!權杖) throw new Error('既有 LINE Bot 尚未設定 Channel Access Token。');
  var 回應 = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + 權杖 },
    payload: JSON.stringify({ replyToken: 回覆權杖, messages: [{ type: 'text', text: 安全文字 }] }),
    muteHttpExceptions: true
  });
  if (Number(回應.getResponseCode()) >= 300) throw new Error('LINE 回覆失敗，狀態碼：' + 回應.getResponseCode());
}

function 智慧5S_LINE群組綁定_欄位索引_(欄位) {
  var 結果 = {};
  欄位.forEach(function (欄名, 索引) { 結果[String(欄名 || '').trim()] = 索引; });
  return 結果;
}

function 智慧5S_LINE群組綁定_現在_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 不連線、不寫入資料的靜態規格測試，可在 Apps Script 編輯器直接執行。
 */
function 測試_智慧5S_LINE群組綁定_解析指令() {
  var 案例 = [
    ['5S群組說明', '說明', ''],
    ['5S群組狀態', '狀態', ''],
    ['5S群組綁定 全部', '綁定', '全部'],
    ['5S綁定 A9-1069檢驗桌', '綁定', 'A9-1069檢驗桌'],
    ['5S群組改綁確認 全部', '改綁確認', '全部'],
    ['5S群組解除確認 A9-1069檢驗桌', '解除確認', 'A9-1069檢驗桌']
  ];
  var 失敗 = [];
  案例.forEach(function (案例) {
    var 結果 = 智慧5S_LINE群組綁定_解析指令_(案例[0]);
    if (!結果 || 結果.類型 !== 案例[1] || 結果.目標 !== 案例[2]) 失敗.push({ 輸入: 案例[0], 結果: 結果 });
  });
  return { 成功: 失敗.length === 0, 版本: 智慧5S_LINE群組綁定_版本, 案例數: 案例.length, 失敗: 失敗 };
}
