/**
 * 68_LINE｜主管快捷戰情正式接線
 * 版本：v1.8.5
 * 用途：接收 LINE Rich Menu 的「主管戰情／今日戰情／昨日戰情」，
 *       固定讀取唯一正式主資料庫，不依賴舊版 LINE Webhook 函式。
 */

var LINE主管快捷戰情68_版本 = 'v1.8.5_68_LINE主管快捷戰情正式接線';
var LINE主管快捷戰情68_正式主庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var LINE主管快捷戰情68_報工表 = '09_報工';
var LINE主管快捷戰情68_時區 = 'Asia/Taipei';

/**
 * doPost 的正式接線入口。
 * 只攔截主管戰情相關指令，其餘事件保留給後續模組。
 */
function LINE主管快捷戰情68_嘗試處理Webhook_(內容) {
  var 事件清單 = 內容 && Array.isArray(內容.events) ? 內容.events : [];
  if (!事件清單.length) return null;

  var 已處理數 = 0;
  var 待後續事件 = [];
  var 結果清單 = [];

  事件清單.forEach(function (事件) {
    var 指令 = LINE主管快捷戰情68_判斷指令_(事件);
    if (!指令) {
      待後續事件.push(事件);
      return;
    }

    var LINE_USER_ID = LINE主管快捷戰情68_文字_(事件 && 事件.source && 事件.source.userId);
    var 身份 = LINE主管快捷戰情68_取得身份_(LINE_USER_ID);
    if (!LINE主管快捷戰情68_允許主管入口_(身份)) {
      var 拒絕文字 = '⛔ 權限不足\n目前身份不可使用「' + 指令 + '」。';
      LINE主管快捷戰情68_回覆_(事件 && 事件.replyToken, 拒絕文字);
      LINE主管快捷戰情68_寫入紀錄_(身份 || { LINE_USER_ID: LINE_USER_ID }, 指令, '權限不足攔截');
      已處理數++;
      結果清單.push({ 指令: 指令, 成功: false, 已攔截: true });
      return;
    }

    try {
      var 回覆文字 = LINE主管快捷戰情68_建立回覆_(指令);
      LINE主管快捷戰情68_回覆_(事件 && 事件.replyToken, 回覆文字);
      LINE主管快捷戰情68_寫入紀錄_(身份, 指令, '已回覆');
      已處理數++;
      結果清單.push({ 指令: 指令, 成功: true });
    } catch (錯誤) {
      var 錯誤文字 = '❌ 戰情讀取失敗\n' + LINE主管快捷戰情68_錯誤文字_(錯誤).slice(0, 800);
      LINE主管快捷戰情68_回覆_(事件 && 事件.replyToken, 錯誤文字);
      LINE主管快捷戰情68_寫入紀錄_(身份, 指令, '失敗：' + LINE主管快捷戰情68_錯誤文字_(錯誤));
      已處理數++;
      結果清單.push({ 指令: 指令, 成功: false, 錯誤: LINE主管快捷戰情68_錯誤文字_(錯誤) });
    }
  });

  if (!已處理數) return null;
  內容.events = 待後續事件;
  return {
    ok: true,
    success: true,
    已處理: 待後續事件.length === 0,
    已部分處理: 待後續事件.length > 0,
    處理筆數: 已處理數,
    待後續路由筆數: 待後續事件.length,
    模組: '68_LINE主管快捷戰情正式接線',
    版本: LINE主管快捷戰情68_版本,
    結果: 結果清單
  };
}

function LINE主管快捷戰情68_判斷指令_(事件) {
  if (!事件 || 事件.type !== 'message' || !事件.message || 事件.message.type !== 'text') return '';
  var 文字 = LINE主管快捷戰情68_文字_(事件.message.text).replace(/\s+/g, '');
  if (文字 === '主管戰情') return '主管戰情';
  if (文字 === '今日戰情' || 文字 === '今日KPI') return '今日戰情';
  if (文字 === '昨日戰情' || 文字 === '昨日回顧') return '昨日戰情';
  return '';
}

function LINE主管快捷戰情68_建立回覆_(指令) {
  var 日期 = LINE主管快捷戰情68_目標日期_(指令);
  var 戰情 = LINE主管快捷戰情68_取得日期戰情_(日期);
  var 標題 = 指令 === '主管戰情' ? '📊 主管戰情｜即時總覽' :
    指令 === '昨日戰情' ? '📅 昨日戰情｜昨日回顧' : '📈 今日戰情｜今日 KPI';
  var 不良率 = 戰情.今日共做數 > 0 ? 戰情.今日不良數 / 戰情.今日共做數 * 100 : 0;

  return [
    標題,
    '作業日：' + 日期,
    '',
    '報工筆數：' + LINE主管快捷戰情68_數字_(戰情.報工筆數),
    '今日共做：' + LINE主管快捷戰情68_數字_(戰情.今日共做數),
    '實際良品：' + LINE主管快捷戰情68_數字_(戰情.今日良品數),
    '不良數量：' + LINE主管快捷戰情68_數字_(戰情.今日不良數),
    '不良率：' + LINE主管快捷戰情68_百分比_(不良率),
    '',
    '工單數：' + LINE主管快捷戰情68_數字_(戰情.工單數),
    '產品數：' + LINE主管快捷戰情68_數字_(戰情.產品數),
    '資料庫：⭐智慧工廠主資料庫'
  ].join('\n');
}

function LINE主管快捷戰情68_取得日期戰情_(日期) {
  var 資料庫 = SpreadsheetApp.openById(LINE主管快捷戰情68_正式主庫ID);
  if (!資料庫 || String(資料庫.getId()) !== LINE主管快捷戰情68_正式主庫ID) {
    throw new Error('主管快捷戰情正式主資料庫驗證失敗。');
  }

  var 分頁 = 資料庫.getSheetByName(LINE主管快捷戰情68_報工表);
  if (!分頁 || 分頁.getLastRow() < 2) {
    return {
      報工筆數: 0,
      今日共做數: 0,
      今日良品數: 0,
      今日不良數: 0,
      工單數: 0,
      產品數: 0
    };
  }

  var 資料 = 分頁.getDataRange().getValues();
  var 欄位 = 資料.shift().map(function (值) { return LINE主管快捷戰情68_文字_(值); });
  var 工單集合 = {};
  var 產品集合 = {};
  var 結果 = {
    報工筆數: 0,
    今日共做數: 0,
    今日良品數: 0,
    今日不良數: 0,
    工單數: 0,
    產品數: 0
  };

  資料.forEach(function (列) {
    var 物件 = {};
    欄位.forEach(function (名稱, 索引) {
      if (名稱 && 物件[名稱] === undefined) 物件[名稱] = 列[索引];
    });
    if (!LINE主管快捷戰情68_列屬於日期_(物件, 日期)) return;

    var 共做 = LINE主管快捷戰情68_數值_(物件.今日共做數);
    if (!共做) 共做 = LINE主管快捷戰情68_數值_(物件.產出數量);
    var 不良 = LINE主管快捷戰情68_數值_(物件.不良數量);
    if (!不良) 不良 = LINE主管快捷戰情68_數值_(物件.不良數);
    var 良品 = LINE主管快捷戰情68_數值_(物件.實際良品數);
    if (!良品 && 共做 >= 不良) 良品 = 共做 - 不良;

    結果.報工筆數++;
    結果.今日共做數 += 共做;
    結果.今日良品數 += 良品;
    結果.今日不良數 += 不良;

    var 工單號 = LINE主管快捷戰情68_文字_(物件.工單號 || 物件.工單編號);
    var 產品編號 = LINE主管快捷戰情68_文字_(物件.產品編號 || 物件.品名);
    if (工單號) 工單集合[工單號] = true;
    if (產品編號) 產品集合[產品編號] = true;
  });

  結果.工單數 = Object.keys(工單集合).length;
  結果.產品數 = Object.keys(產品集合).length;
  return 結果;
}

function LINE主管快捷戰情68_列屬於日期_(物件, 日期) {
  var 候選 = [物件.作業日, 物件.日期, 物件.時間戳, 物件.更新時間, 物件.開始時間];
  for (var i = 0; i < 候選.length; i++) {
    var 候選日期 = LINE主管快捷戰情68_日期字串_(候選[i]);
    if (候選日期) return 候選日期 === 日期;
  }
  return false;
}

function LINE主管快捷戰情68_目標日期_(指令) {
  var 現在 = new Date();
  if (指令 === '昨日戰情') 現在.setDate(現在.getDate() - 1);
  return Utilities.formatDate(現在, LINE主管快捷戰情68_時區, 'yyyy-MM-dd');
}

function LINE主管快捷戰情68_日期字串_(值) {
  if (值 instanceof Date && !isNaN(值.getTime())) {
    return Utilities.formatDate(值, LINE主管快捷戰情68_時區, 'yyyy-MM-dd');
  }
  var 文字 = LINE主管快捷戰情68_文字_(值);
  if (!文字) return '';
  var 配對 = 文字.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (!配對) return '';
  return 配對[1] + '-' + ('0' + 配對[2]).slice(-2) + '-' + ('0' + 配對[3]).slice(-2);
}

function LINE主管快捷戰情68_取得身份_(LINE_USER_ID) {
  if (typeof LINE身份權限33_取得身份_ === 'function') {
    return LINE身份權限33_取得身份_(LINE_USER_ID);
  }
  return null;
}

function LINE主管快捷戰情68_允許主管入口_(身份) {
  if (!身份) return false;
  var 允許 = LINE主管快捷戰情68_文字_(身份.允許主管入口).toLowerCase();
  if (['是', 'yes', 'y', 'true', '1'].indexOf(允許) >= 0) return true;
  return /主管|班長|工程師|主任|課長|經理|廠長|營運長|副總/i.test(
    LINE主管快捷戰情68_文字_(身份.角色 || 身份.職稱)
  );
}

function LINE主管快捷戰情68_回覆_(回覆權杖, 文字) {
  if (!回覆權杖) return;
  if (typeof LINE身份權限33_回覆_ === 'function') {
    return LINE身份權限33_回覆_(回覆權杖, LINE主管快捷戰情68_文字_(文字).slice(0, 4900));
  }
  if (typeof 回覆LINE_ === 'function') {
    return 回覆LINE_(回覆權杖, LINE主管快捷戰情68_文字_(文字).slice(0, 4900));
  }
}

function LINE主管快捷戰情68_寫入紀錄_(身份, 指令, 結果) {
  try {
    if (typeof LINE身份權限33_安全寫入紀錄_ === 'function') {
      LINE身份權限33_安全寫入紀錄_(身份 || {}, 指令, '主管快捷戰情', 結果, LINE主管快捷戰情68_版本);
    }
  } catch (錯誤) {}
}

function LINE主管快捷戰情68_數值_(值) {
  var 數字 = Number(String(值 === null || 值 === undefined ? '' : 值).replace(/,/g, ''));
  return isFinite(數字) ? 數字 : 0;
}

function LINE主管快捷戰情68_數字_(值) {
  var 數字 = LINE主管快捷戰情68_數值_(值);
  return String(Math.round(數字 * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function LINE主管快捷戰情68_百分比_(值) {
  return (Math.round(LINE主管快捷戰情68_數值_(值) * 100) / 100).toFixed(2) + '%';
}

function LINE主管快捷戰情68_文字_(值) {
  return String(值 === null || 值 === undefined ? '' : 值).trim();
}

function LINE主管快捷戰情68_錯誤文字_(錯誤) {
  return LINE主管快捷戰情68_文字_(錯誤 && 錯誤.message ? 錯誤.message : 錯誤);
}

function 測試68_LINE主管快捷戰情_正式主庫() {
  var 今日文字 = LINE主管快捷戰情68_建立回覆_('今日戰情');
  var 昨日文字 = LINE主管快捷戰情68_建立回覆_('昨日戰情');
  return {
    成功: true,
    版本: LINE主管快捷戰情68_版本,
    正式主資料庫ID: LINE主管快捷戰情68_正式主庫ID,
    今日戰情: 今日文字,
    昨日戰情: 昨日文字
  };
}
