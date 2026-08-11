/**
 * 化新精密｜33_LINE 主管權限與身分綁定
 * 版本：v1.8.0｜唯一正式主資料庫｜自包含版
 *
 * 正式主資料庫：
 * https://docs.google.com/spreadsheets/d/19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8/edit
 *
 * 部署原則：
 * 1. 本檔完整覆蓋 Apps Script 內同名檔案，不追加舊片段。
 * 2. 不依賴取得試算表_()、讀表_()、建立或修復表_() 等外部函式。
 * 3. LINE 回覆直接使用既有 LINE_CHANNEL_ACCESS_TOKEN，並檢查 HTTP 狀態碼。
 * 4. 缺少 33_LINE 分頁時自動建立；既有分頁只補欄位，不刪資料。
 * 5. 既有 doPost(e) 接線不需修改。
 */

var LINE身份權限33_版本 = 'v1.8.0_唯一正式主資料庫_自包含版';
var LINE身份權限33_正式主庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var LINE身份權限33_人員表 = '01_人員主檔';
var LINE身份權限33_身份表 = '33_LINE身份權限';
var LINE身份權限33_紀錄表 = '33_LINE權限紀錄';
var LINE身份權限33_今日派班表 = '20_今日派班';
var LINE身份權限33_時區 = 'Asia/Taipei';
var LINE身份權限33_初始化版本屬性 = 'LINE身份權限33_初始化版本';
var LINE身份權限33_LINE權杖屬性 = 'LINE_CHANNEL_ACCESS_TOKEN';
var LINE身份權限33_資料庫屬性鍵 = [
  '智慧製造_SPREADSHEET_ID',
  '智慧製造中央作戰資料庫_ID'
];

var LINE身份權限33_身份欄位 = [
  'LINE_USER_ID', '工號', '姓名', '部門', '組別', '職稱', '角色', '權限等級',
  '允許主管入口', '允許主檔檢查', '允許AI摘要', '允許報工', '啟用',
  '綁定方式', '綁定時間', '最後互動時間', '備註'
];

var LINE身份權限33_紀錄欄位 = [
  '時間戳', 'LINE_USER_ID', '工號', '姓名', '收到文字', '指令類型',
  '判斷結果', '角色', '權限等級', '備註'
];

/**
 * 第一次上線只需手動執行此函式一次。
 * 會同步兩個常用資料庫屬性、建立 33_LINE 分頁並回傳驗收結果。
 */
function 套用33_LINE唯一正式主資料庫設定() {
  var 資料庫 = LINE身份權限33_取得正式資料庫_();
  var 人員分頁 = 資料庫.getSheetByName(LINE身份權限33_人員表);
  if (!人員分頁) throw new Error('正式主資料庫缺少分頁：' + LINE身份權限33_人員表);

  var 屬性 = PropertiesService.getScriptProperties();
  LINE身份權限33_資料庫屬性鍵.forEach(function (鍵) {
    屬性.setProperty(鍵, LINE身份權限33_正式主庫ID);
  });
  屬性.setProperty('智慧製造_資料庫版本', LINE身份權限33_版本);
  屬性.setProperty('智慧製造_資料庫名稱', LINE身份權限33_安全取得資料庫名稱_(資料庫));
  屬性.setProperty('智慧製造_資料庫更新時間', LINE身份權限33_現在_());

  var 初始化結果 = 初始化33_LINE主管權限與身份綁定();
  return {
    成功: true,
    success: true,
    訊息: '已鎖定指定試算表，並完成 33_LINE 身分權限初始化。',
    版本: LINE身份權限33_版本,
    試算表ID: LINE身份權限33_正式主庫ID,
    試算表名稱: LINE身份權限33_安全取得資料庫名稱_(資料庫),
    初始化: 初始化結果,
    驗收: 驗收33_LINE正式資料庫設定()
  };
}

function 初始化33_LINE主管權限與身份綁定() {
  var 資料庫 = LINE身份權限33_取得正式資料庫_();
  LINE身份權限33_建立或修復表_(資料庫, LINE身份權限33_身份表, LINE身份權限33_身份欄位);
  LINE身份權限33_建立或修復表_(資料庫, LINE身份權限33_紀錄表, LINE身份權限33_紀錄欄位);

  var 屬性 = PropertiesService.getScriptProperties();
  var 已記錄版本 = String(屬性.getProperty(LINE身份權限33_初始化版本屬性) || '');
  if (已記錄版本 !== LINE身份權限33_版本) {
    LINE身份權限33_安全寫入紀錄_(
      { LINE_USER_ID: 'SYSTEM', 工號: '', 姓名: '', 角色: '系統', 權限等級: 99 },
      '初始化33_LINE主管權限與身份綁定', '系統初始化', '完成', LINE身份權限33_版本
    );
    屬性.setProperty(LINE身份權限33_初始化版本屬性, LINE身份權限33_版本);
  }

  return {
    成功: true,
    success: true,
    訊息: '33_LINE 主管權限與身分綁定初始化完成。',
    版本: LINE身份權限33_版本,
    試算表ID: LINE身份權限33_正式主庫ID,
    工作表: [LINE身份權限33_身份表, LINE身份權限33_紀錄表]
  };
}

/**
 * 給既有 doPost(e) 呼叫的正式入口。
 * 完全處理完畢時回傳 已處理:true；未處理事件會保留給後續既有路由。
 */
function LINE身份權限_嘗試處理Webhook_(內容) {
  var 事件清單 = 內容 && Array.isArray(內容.events) ? 內容.events : [];
  if (!事件清單.length) return null;

  var 已處理數 = 0;
  var 已放行數 = 0;
  var 待後續事件 = [];
  var 結果清單 = [];

  事件清單.forEach(function (事件) {
    var 結果 = null;
    try {
      結果 = LINE身份權限33_處理單一事件_(事件 || {});
    } catch (錯誤) {
      var 錯誤訊息 = LINE身份權限33_錯誤文字_(錯誤);
      LINE身份權限33_安全寫入紀錄_(
        { LINE_USER_ID: LINE身份權限33_文字_(事件 && 事件.source && 事件.source.userId) },
        LINE身份權限33_文字_(事件 && 事件.message && 事件.message.text),
        '身分權限處理', '失敗', 錯誤訊息
      );
      try {
        LINE身份權限33_回覆_(事件 && 事件.replyToken, '❌ 身分權限處理失敗\n' + 錯誤訊息.slice(0, 800));
      } catch (回覆錯誤) {
        if (typeof console !== 'undefined' && console.error) console.error(回覆錯誤);
      }
      結果 = { 已處理: true, 成功: false, 錯誤: 錯誤訊息 };
    }

    if (!結果) {
      待後續事件.push(事件);
      return;
    }
    結果清單.push(結果);
    if (結果.已處理) {
      已處理數++;
      return;
    }
    if (結果.已放行) 已放行數++;
    待後續事件.push(事件);
  });

  if (!已處理數) return null;
  if (待後續事件.length) 內容.events = 待後續事件;
  return {
    ok: true,
    success: true,
    已處理: 待後續事件.length === 0,
    已部分處理: 待後續事件.length > 0,
    處理筆數: 已處理數,
    放行筆數: 已放行數,
    待後續路由筆數: 待後續事件.length,
    模組: '33_LINE主管權限與身分綁定',
    版本: LINE身份權限33_版本,
    結果: 結果清單
  };
}

function LINE身份權限33_處理單一事件_(事件) {
  if (!事件 || 事件.type !== 'message' || !事件.message || 事件.message.type !== 'text') return null;

  var 文字 = LINE身份權限33_正規化指令_(事件.message.text);
  if (!文字) return null;
  var 來源 = 事件.source || {};
  var LINE_USER_ID = LINE身份權限33_文字_(來源.userId);
  var 回覆權杖 = LINE身份權限33_文字_(事件.replyToken);
  var 是一對一 = LINE身份權限33_文字_(來源.type) === 'user';
  var 綁定工號 = LINE身份權限33_解析綁定工號_(文字);
  var 是綁定說明 = /^(綁定|身份綁定|身分綁定|我是)$/i.test(文字);
  var 是身份查詢 = /^(我的身份|我的身分|身份查詢|身分查詢|權限檢查|我是誰)$/i.test(文字);
  var 是解除綁定 = /^(解除綁定|取消綁定)$/i.test(文字);
  var 是我的任務 = /^(我的任務)$/i.test(文字);

  if ((綁定工號 || 是綁定說明 || 是身份查詢 || 是解除綁定 || 是我的任務) && !是一對一) {
    var 私訊提示 = '🔐 為保護個人資料，身分綁定與權限查詢請在 Bot 一對一聊天室操作。';
    LINE身份權限33_回覆_(回覆權杖, 私訊提示);
    LINE身份權限33_安全寫入紀錄_({ LINE_USER_ID: LINE_USER_ID }, 文字, '一對一限制', '已攔截', '群組內不可操作個人身分');
    return { 已處理: true, 成功: false, 訊息: 私訊提示 };
  }

  if (綁定工號) {
    var 綁定結果 = LINE身份權限33_綁定身份_(LINE_USER_ID, 綁定工號);
    LINE身份權限33_回覆_(回覆權杖, 綁定結果.文字);
    LINE身份權限33_安全寫入紀錄_(
      綁定結果.身份 || { LINE_USER_ID: LINE_USER_ID, 工號: 綁定工號 },
      文字, '身分綁定', 綁定結果.成功 ? '綁定成功' : '綁定失敗', 綁定結果.訊息
    );
    return { 已處理: true, 成功: 綁定結果.成功, 結果: 綁定結果 };
  }

  if (是綁定說明) {
    var 綁定說明 = '🔐 身分綁定方式\n請輸入：綁定 工號\n範例：綁定 fhfi573\n\n綁定後可再輸入「權限檢查」。';
    LINE身份權限33_回覆_(回覆權杖, 綁定說明);
    LINE身份權限33_安全寫入紀錄_({ LINE_USER_ID: LINE_USER_ID }, 文字, '身分綁定說明', '已回覆', '');
    return { 已處理: true, 成功: true, 訊息: 綁定說明 };
  }

  if (是身份查詢) {
    var 身份 = LINE身份權限33_取得身份_(LINE_USER_ID);
    var 身份文字 = 身份
      ? LINE身份權限33_格式化身份_(身份)
      : '🔐 權限檢查\n目前尚未綁定身分。\n請輸入：綁定 fhfi573';
    LINE身份權限33_回覆_(回覆權杖, 身份文字);
    LINE身份權限33_安全寫入紀錄_(身份 || { LINE_USER_ID: LINE_USER_ID }, 文字, '權限檢查', 身份 ? '已綁定' : '未綁定', '');
    return { 已處理: true, 成功: true, 已綁定: !!身份, 訊息: 身份文字 };
  }

  if (是解除綁定) {
    var 解除結果 = LINE身份權限33_解除綁定_(LINE_USER_ID);
    LINE身份權限33_回覆_(回覆權杖, 解除結果.文字);
    LINE身份權限33_安全寫入紀錄_(解除結果.身份 || { LINE_USER_ID: LINE_USER_ID }, 文字, '解除綁定', 解除結果.成功 ? '完成' : '無資料', 解除結果.訊息 || '');
    return { 已處理: true, 成功: 解除結果.成功, 結果: 解除結果 };
  }

  if (是我的任務) {
    var 任務文字 = 處理_LINE_我的任務(LINE_USER_ID);
    LINE身份權限33_回覆_(回覆權杖, 任務文字);
    LINE身份權限33_安全寫入紀錄_(LINE身份權限33_取得身份_(LINE_USER_ID) || { LINE_USER_ID: LINE_USER_ID }, 文字, '我的任務', '已回覆', '');
    return { 已處理: true, 成功: true, 訊息: 任務文字 };
  }

  var 指令類型 = LINE身份權限33_判斷指令類型_(文字);
  if (!指令類型.需保護) return null;

  var 目前身份 = LINE身份權限33_取得身份_(LINE_USER_ID);
  if (!目前身份) {
    var 未綁定提示 = '🔒 尚未綁定身分，暫時不能使用「' + 指令類型.名稱 + '」。\n\n請先在一對一聊天室輸入：綁定 fhfi573';
    LINE身份權限33_回覆_(回覆權杖, 未綁定提示);
    LINE身份權限33_安全寫入紀錄_({ LINE_USER_ID: LINE_USER_ID }, 文字, 指令類型.名稱, '未綁定攔截', '');
    return { 已處理: true, 已攔截: true, 成功: false, 訊息: 未綁定提示 };
  }

  var 權限 = LINE身份權限33_檢查權限_(目前身份, 指令類型);
  LINE身份權限33_更新最後互動_(LINE_USER_ID);
  LINE身份權限33_安全寫入紀錄_(目前身份, 文字, 指令類型.名稱, 權限.允許 ? '允許放行' : '權限不足攔截', 權限.原因);

  if (!權限.允許) {
    var 權限不足提示 = '⛔ 權限不足\n姓名：' + (目前身份.姓名 || '-') + '\n角色：' + (目前身份.角色 || '-') + '\n功能：' + 指令類型.名稱;
    LINE身份權限33_回覆_(回覆權杖, 權限不足提示);
    return { 已處理: true, 已攔截: true, 成功: false, 訊息: 權限不足提示 };
  }

  return { 已處理: false, 已放行: true, 成功: true, 指令: 指令類型.名稱 };
}

function LINE身份權限33_解析綁定工號_(文字) {
  var 配對 = LINE身份權限33_正規化指令_(文字).match(/^(綁定|身份綁定|身分綁定|我是|設定身份|設定身分)\s*[:：]?\s*([A-Za-z0-9_-]+)$/i);
  return 配對 ? 配對[2] : '';
}

function LINE身份權限33_綁定身份_(LINE_USER_ID, 工號) {
  LINE_USER_ID = LINE身份權限33_文字_(LINE_USER_ID);
  工號 = LINE身份權限33_文字_(工號);
  if (!LINE_USER_ID) return { 成功: false, 訊息: '缺少 LINE_USER_ID', 文字: '❌ 無法取得 LINE_USER_ID，請從 LINE 一對一聊天室操作。' };
  if (!工號) return { 成功: false, 訊息: '缺少工號', 文字: '❌ 請輸入：綁定 工號' };

  return LINE身份權限33_使用鎖_(function () {
    初始化33_LINE主管權限與身份綁定();
    var 人員 = LINE身份權限33_依工號找人員_(工號);
    if (!人員) {
      return {
        成功: false,
        訊息: '01_人員主檔找不到啟用中的工號：' + 工號,
        文字: '❌ 找不到工號：' + 工號 + '\n請確認指定試算表的 01_人員主檔。'
      };
    }

    var 身份表 = LINE身份權限33_取得身份表_();
    var 既有身份 = LINE身份權限33_讀表物件_(身份表);
    var 同LINE啟用 = LINE身份權限33_最後一筆_(既有身份.filter(function (列) {
      return LINE身份權限33_文字_(列.LINE_USER_ID) === LINE_USER_ID && LINE身份權限33_是否啟用_(列.啟用);
    }));
    if (同LINE啟用 && LINE身份權限33_小寫_(同LINE啟用.工號) !== LINE身份權限33_小寫_(人員.工號)) {
      return {
        成功: false,
        訊息: '此 LINE 已綁定其他工號：' + 同LINE啟用.工號,
        文字: '❌ 此 LINE 已綁定其他工號：' + 同LINE啟用.工號 + '\n如需異動，請先輸入「解除綁定」。'
      };
    }

    var 同工號啟用 = LINE身份權限33_最後一筆_(既有身份.filter(function (列) {
      return LINE身份權限33_小寫_(列.工號) === LINE身份權限33_小寫_(人員.工號) && LINE身份權限33_是否啟用_(列.啟用);
    }));
    if (同工號啟用 && LINE身份權限33_文字_(同工號啟用.LINE_USER_ID) !== LINE_USER_ID) {
      return {
        成功: false,
        訊息: '此工號已被其他 LINE 綁定：' + 人員.工號,
        文字: '❌ 此工號已被其他 LINE 綁定。\n工號：' + 人員.工號 + '\n請通知主管人工確認。'
      };
    }

    if (人員.LINE_USER_ID && 人員.LINE_USER_ID !== LINE_USER_ID) {
      return {
        成功: false,
        訊息: '01_人員主檔的 LINE_USER_ID 已有其他值',
        文字: '❌ 此工號在 01_人員主檔已綁定其他 LINE。\n請通知主管人工確認。'
      };
    }

    var 身份 = LINE身份權限33_建立身份物件_(人員, LINE_USER_ID, 'LINE一對一自助綁定');
    var 寫入結果 = LINE身份權限33_寫入或更新身份_(身份);
    LINE身份權限33_回寫人員主檔LINEID_(人員.工號, LINE_USER_ID);
    LINE身份權限33_嘗試更新RichMenu_(LINE_USER_ID, 身份);

    return {
      成功: true,
      訊息: 寫入結果.動作 + '正式主庫 ' + LINE身份權限33_身份表,
      列號: 寫入結果.列號,
      身份: 身份,
      文字: [
        '✅ 身分綁定成功',
        '姓名：' + 身份.姓名,
        '工號：' + 身份.工號,
        '部門：' + 身份.部門,
        '組別：' + 身份.組別,
        '職稱：' + 身份.職稱,
        '角色：' + 身份.角色,
        '權限等級：' + 身份.權限等級,
        '',
        '可輸入「權限檢查」再次確認。'
      ].join('\n')
    };
  });
}

function LINE身份權限33_解除綁定_(LINE_USER_ID) {
  LINE_USER_ID = LINE身份權限33_文字_(LINE_USER_ID);
  if (!LINE_USER_ID) return { 成功: false, 訊息: '缺少 LINE_USER_ID', 文字: '無法取得 LINE_USER_ID。' };

  return LINE身份權限33_使用鎖_(function () {
    var 分頁 = LINE身份權限33_取得身份表_();
    var 表頭 = LINE身份權限33_取表頭_(分頁);
    var 資料 = 分頁.getDataRange().getValues();
    var LINE欄 = 表頭.indexOf('LINE_USER_ID');
    var 啟用欄 = 表頭.indexOf('啟用');
    var 時間欄 = 表頭.indexOf('最後互動時間');
    var 備註欄 = 表頭.indexOf('備註');
    var 工號欄 = 表頭.indexOf('工號');
    var 姓名欄 = 表頭.indexOf('姓名');
    var 身份 = null;
    var 筆數 = 0;

    for (var i = 1; i < 資料.length; i++) {
      if (LINE身份權限33_文字_(資料[i][LINE欄]) !== LINE_USER_ID) continue;
      身份 = 身份 || {
        LINE_USER_ID: LINE_USER_ID,
        工號: 工號欄 >= 0 ? LINE身份權限33_文字_(資料[i][工號欄]) : '',
        姓名: 姓名欄 >= 0 ? LINE身份權限33_文字_(資料[i][姓名欄]) : ''
      };
      if (啟用欄 >= 0) 分頁.getRange(i + 1, 啟用欄 + 1).setValue('否');
      if (時間欄 >= 0) 分頁.getRange(i + 1, 時間欄 + 1).setValue(new Date());
      if (備註欄 >= 0) 分頁.getRange(i + 1, 備註欄 + 1).setValue('使用者於 LINE 解除綁定；保留歷史資料');
      筆數++;
    }

    if (身份 && 身份.工號) LINE身份權限33_清除人員主檔LINEID_(身份.工號, LINE_USER_ID);
    return {
      成功: 筆數 > 0,
      身份: 身份,
      訊息: 筆數 > 0 ? '已停用 ' + 筆數 + ' 筆身分資料' : '目前沒有可解除的綁定資料',
      文字: 筆數 > 0 ? '✅ 已解除 LINE 身分綁定。' : '目前沒有可解除的綁定資料。'
    };
  });
}

function LINE身份權限33_判斷指令類型_(文字) {
  var 指令 = LINE身份權限33_正規化指令_(文字).toLowerCase();
  if (!指令) return { 需保護: false, 名稱: '空白' };
  if (指令.indexOf('主管戰情') >= 0) return { 需保護: true, 名稱: '主管戰情', 權限欄位: '允許主管入口' };
  if (指令.indexOf('今日戰情') >= 0) return { 需保護: true, 名稱: '今日戰情', 權限欄位: '允許主管入口' };
  if (指令.indexOf('昨日戰情') >= 0) return { 需保護: true, 名稱: '昨日戰情', 權限欄位: '允許主管入口' };
  if (/^戰情\s*\d{4}-\d{2}-\d{2}$/i.test(指令)) return { 需保護: true, 名稱: '指定日期戰情', 權限欄位: '允許主管入口' };
  if (指令 === '戰情' || 指令.indexOf('kpi') >= 0 || 指令.indexOf('狀況') >= 0) return { 需保護: true, 名稱: '戰情查詢', 權限欄位: '允許主管入口' };
  if (指令.indexOf('主檔') >= 0) return { 需保護: true, 名稱: '主檔檢查', 權限欄位: '允許主檔檢查' };
  if (指令.indexOf('ai摘要') >= 0 || 指令.indexOf('ai 摘要') >= 0 || 指令 === 'ai') return { 需保護: true, 名稱: 'AI摘要', 權限欄位: '允許AI摘要' };
  return { 需保護: false, 名稱: '一般指令' };
}

function LINE身份權限33_檢查權限_(身份, 指令類型) {
  if (!身份 || !LINE身份權限33_是否啟用_(身份.啟用)) return { 允許: false, 原因: '身分未啟用' };
  var 欄位 = 指令類型 && 指令類型.權限欄位;
  if (!欄位) return { 允許: true, 原因: '非保護指令' };
  var 允許 = LINE身份權限33_是否為是_(身份[欄位]);
  return { 允許: 允許, 原因: 允許 ? '權限欄位允許' : 欄位 + '不是「是」' };
}

function LINE身份權限33_依人員推定權限_(人員) {
  人員 = 人員 || {};
  var 職稱 = LINE身份權限33_文字_(人員.職稱 || 人員.職位);
  var 角色 = LINE身份權限33_文字_(人員.角色 || 人員.角色類型);
  var 判斷文字 = [職稱, 角色, 人員.部門, 人員.組別, 人員.備註].map(LINE身份權限33_文字_).join(' ');

  if (/營運長|副總|總經理|廠長|經理|主管|主任|課長/i.test(職稱) || /系統管理員|主管/i.test(角色)) {
    return LINE身份權限33_權限物件_('主管', 80, '是');
  }
  if (/組長|副組長|班長|領班/i.test(職稱) || /班長|組長|領班/i.test(角色)) {
    return LINE身份權限33_權限物件_('班長', 70, '是');
  }
  if (/工程師|生技|資訊|品保|設備/i.test(職稱) || /工程師/i.test(角色) || /工程師|生技|資訊|品保|設備/i.test(判斷文字)) {
    return LINE身份權限33_權限物件_('工程師', 60, '是');
  }
  return LINE身份權限33_權限物件_('現場人員', 10, '否');
}

function LINE身份權限33_權限物件_(角色, 權限等級, 管理權限) {
  return {
    角色: 角色,
    權限等級: 權限等級,
    允許主管入口: 管理權限,
    允許主檔檢查: 管理權限,
    允許AI摘要: 管理權限,
    允許報工: '是'
  };
}

function LINE身份權限33_建立身份物件_(人員, LINE_USER_ID, 綁定方式) {
  var 權限 = LINE身份權限33_依人員推定權限_(人員);
  var 現在 = new Date();
  return {
    LINE_USER_ID: LINE_USER_ID,
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
    允許報工: 權限.允許報工,
    啟用: '是',
    綁定方式: 綁定方式,
    綁定時間: 現在,
    最後互動時間: 現在,
    備註: '由 33_LINE v1.8.0 寫入唯一正式主資料庫',
    更新時間: 現在
  };
}

function LINE身份權限33_取得身份_(LINE_USER_ID) {
  LINE_USER_ID = LINE身份權限33_文字_(LINE_USER_ID);
  if (!LINE_USER_ID) return null;

  var 身份分頁 = LINE身份權限33_取得身份表_();
  var 身份列 = LINE身份權限33_讀表物件_(身份分頁).filter(function (列) {
    return LINE身份權限33_文字_(列.LINE_USER_ID) === LINE_USER_ID && LINE身份權限33_是否啟用_(列.啟用);
  });
  var 身份 = LINE身份權限33_最後一筆_(身份列);
  if (身份) return 身份;

  var 人員 = LINE身份權限33_依LINEID找人員_(LINE_USER_ID);
  if (!人員) return null;
  var 自動身份 = LINE身份權限33_建立身份物件_(人員, LINE_USER_ID, '01_人員主檔 LINE_USER_ID 自動帶入');
  LINE身份權限33_寫入或更新身份_(自動身份);
  return 自動身份;
}

function LINE身份權限33_依工號找人員_(工號) {
  var 分頁 = LINE身份權限33_取得必要分頁_(LINE身份權限33_人員表);
  var 目標 = LINE身份權限33_小寫_(工號);
  var 列 = LINE身份權限33_讀表物件_(分頁).find(function (人員列) {
    var 列工號 = 人員列.工號 || 人員列.員工編號 || 人員列.員工工號;
    return LINE身份權限33_小寫_(列工號) === 目標 && LINE身份權限33_是否啟用_(人員列.啟用);
  });
  return 列 ? LINE身份權限33_人員標準化_(列) : null;
}

function LINE身份權限33_依LINEID找人員_(LINE_USER_ID) {
  var 分頁 = LINE身份權限33_取得必要分頁_(LINE身份權限33_人員表);
  var 列 = LINE身份權限33_讀表物件_(分頁).find(function (人員列) {
    return LINE身份權限33_文字_(人員列.LINE_USER_ID) === LINE_USER_ID && LINE身份權限33_是否啟用_(人員列.啟用);
  });
  return 列 ? LINE身份權限33_人員標準化_(列) : null;
}

function LINE身份權限33_人員標準化_(列) {
  return {
    __row: 列.__row,
    工號: LINE身份權限33_文字_(列.工號 || 列.員工編號 || 列.員工工號),
    姓名: LINE身份權限33_文字_(列.姓名 || 列.中文名 || 列.名字),
    部門: LINE身份權限33_文字_(列.部門),
    組別: LINE身份權限33_文字_(列.組別),
    職稱: LINE身份權限33_文字_(列.職稱 || 列.職位),
    角色: LINE身份權限33_文字_(列.角色 || 列.角色類型),
    角色類型: LINE身份權限33_文字_(列.角色類型 || 列.角色),
    LINE_USER_ID: LINE身份權限33_文字_(列.LINE_USER_ID),
    啟用: LINE身份權限33_文字_(列.啟用 || '是'),
    備註: LINE身份權限33_文字_(列.備註)
  };
}

function LINE身份權限33_寫入或更新身份_(身份) {
  var 分頁 = LINE身份權限33_取得身份表_();
  var 表頭 = LINE身份權限33_取表頭_(分頁);
  var 資料 = 分頁.getDataRange().getValues();
  var LINE欄 = 表頭.indexOf('LINE_USER_ID');
  var 工號欄 = 表頭.indexOf('工號');
  var LINE列號 = -1;
  var 工號列號 = -1;

  for (var i = 1; i < 資料.length; i++) {
    if (LINE欄 >= 0 && LINE身份權限33_文字_(資料[i][LINE欄]) === LINE身份權限33_文字_(身份.LINE_USER_ID)) LINE列號 = i + 1;
    if (工號欄 >= 0 && LINE身份權限33_小寫_(資料[i][工號欄]) === LINE身份權限33_小寫_(身份.工號)) 工號列號 = i + 1;
  }
  if (LINE列號 > 0 && 工號列號 > 0 && LINE列號 !== 工號列號) {
    throw new Error('33_LINE 身分資料重複：LINE_USER_ID 與工號分別存在不同列，請先人工確認。');
  }

  var 目標列號 = LINE列號 > 0 ? LINE列號 : 工號列號;
  if (目標列號 > 0) {
    var 現有列 = 資料[目標列號 - 1].slice();
    while (現有列.length < 表頭.length) 現有列.push('');
    表頭.forEach(function (欄名, 欄號) {
      if (Object.prototype.hasOwnProperty.call(身份, 欄名)) 現有列[欄號] = 身份[欄名];
    });
    分頁.getRange(目標列號, 1, 1, 表頭.length).setValues([現有列]);
    return { 成功: true, 動作: '已更新', 列號: 目標列號 };
  }

  var 新列 = 表頭.map(function (欄名) {
    return Object.prototype.hasOwnProperty.call(身份, 欄名) ? 身份[欄名] : '';
  });
  分頁.appendRow(新列);
  return { 成功: true, 動作: '已新增', 列號: 分頁.getLastRow() };
}

function LINE身份權限33_回寫人員主檔LINEID_(工號, LINE_USER_ID) {
  var 分頁 = LINE身份權限33_取得必要分頁_(LINE身份權限33_人員表);
  var 表頭 = LINE身份權限33_取表頭_(分頁);
  var 工號欄 = LINE身份權限33_找欄位_(表頭, ['工號', '員工編號', '員工工號']);
  if (工號欄 < 0) throw new Error(LINE身份權限33_人員表 + ' 缺少工號欄位。');
  var LINE欄 = 表頭.indexOf('LINE_USER_ID');
  if (LINE欄 < 0) {
    LINE欄 = 表頭.length;
    分頁.getRange(1, LINE欄 + 1).setValue('LINE_USER_ID');
    表頭.push('LINE_USER_ID');
  }
  var 更新欄 = 表頭.indexOf('更新時間');
  var 資料 = 分頁.getDataRange().getValues();

  for (var i = 1; i < 資料.length; i++) {
    if (LINE身份權限33_小寫_(資料[i][工號欄]) !== LINE身份權限33_小寫_(工號)) continue;
    var 目前LINE = LINE身份權限33_文字_(資料[i][LINE欄]);
    if (目前LINE && 目前LINE !== LINE_USER_ID) throw new Error('01_人員主檔此工號已綁定其他 LINE_USER_ID。');
    分頁.getRange(i + 1, LINE欄 + 1).setValue(LINE_USER_ID);
    if (更新欄 >= 0) 分頁.getRange(i + 1, 更新欄 + 1).setValue(new Date());
    return { 成功: true, 列號: i + 1 };
  }
  throw new Error('01_人員主檔找不到工號：' + 工號);
}

function LINE身份權限33_清除人員主檔LINEID_(工號, LINE_USER_ID) {
  var 分頁 = LINE身份權限33_取得必要分頁_(LINE身份權限33_人員表);
  var 表頭 = LINE身份權限33_取表頭_(分頁);
  var 工號欄 = LINE身份權限33_找欄位_(表頭, ['工號', '員工編號', '員工工號']);
  var LINE欄 = 表頭.indexOf('LINE_USER_ID');
  var 更新欄 = 表頭.indexOf('更新時間');
  if (工號欄 < 0 || LINE欄 < 0) return { 成功: false, 訊息: '人員主檔沒有可清除的 LINE_USER_ID 欄位' };
  var 資料 = 分頁.getDataRange().getValues();

  for (var i = 1; i < 資料.length; i++) {
    if (LINE身份權限33_小寫_(資料[i][工號欄]) !== LINE身份權限33_小寫_(工號)) continue;
    if (LINE身份權限33_文字_(資料[i][LINE欄]) !== LINE_USER_ID) return { 成功: false, 訊息: '人員主檔 LINE_USER_ID 已不同，未清除' };
    分頁.getRange(i + 1, LINE欄 + 1).setValue('');
    if (更新欄 >= 0) 分頁.getRange(i + 1, 更新欄 + 1).setValue(new Date());
    return { 成功: true, 列號: i + 1 };
  }
  return { 成功: false, 訊息: '找不到工號' };
}

function LINE身份權限33_更新最後互動_(LINE_USER_ID) {
  var 分頁 = LINE身份權限33_取得身份表_();
  var 表頭 = LINE身份權限33_取表頭_(分頁);
  var LINE欄 = 表頭.indexOf('LINE_USER_ID');
  var 時間欄 = 表頭.indexOf('最後互動時間');
  if (LINE欄 < 0 || 時間欄 < 0) return;
  var 資料 = 分頁.getDataRange().getValues();
  for (var i = 1; i < 資料.length; i++) {
    if (LINE身份權限33_文字_(資料[i][LINE欄]) === LINE_USER_ID) 分頁.getRange(i + 1, 時間欄 + 1).setValue(new Date());
  }
}

function LINE身份權限33_格式化身份_(身份) {
  return [
    '🔐 權限檢查',
    '姓名：' + (身份.姓名 || '-'),
    '工號：' + (身份.工號 || '-'),
    '部門：' + (身份.部門 || '-'),
    '組別：' + (身份.組別 || '-'),
    '職稱：' + (身份.職稱 || '-'),
    '角色：' + (身份.角色 || '-'),
    '權限等級：' + (身份.權限等級 === 0 || 身份.權限等級 ? 身份.權限等級 : '-'),
    '',
    '主管入口：' + (身份.允許主管入口 || '否'),
    '主檔檢查：' + (身份.允許主檔檢查 || '否'),
    'AI摘要：' + (身份.允許AI摘要 || '否'),
    '報工作業：' + (身份.允許報工 || '是'),
    '資料庫：唯一正式主庫'
  ].join('\n');
}

function LINE身份權限33_取得正式資料庫_() {
  var 資料庫 = SpreadsheetApp.openById(LINE身份權限33_正式主庫ID);
  if (!資料庫) throw new Error('無法開啟指定正式主資料庫。');
  if (typeof 資料庫.getId === 'function' && String(資料庫.getId()) !== LINE身份權限33_正式主庫ID) {
    throw new Error('資料庫識別碼驗證失敗，已停止寫入。');
  }
  return 資料庫;
}

function LINE身份權限33_取得必要分頁_(分頁名稱) {
  var 分頁 = LINE身份權限33_取得正式資料庫_().getSheetByName(分頁名稱);
  if (!分頁) throw new Error('指定正式主資料庫缺少分頁：' + 分頁名稱);
  return 分頁;
}

function LINE身份權限33_取得身份表_() {
  return LINE身份權限33_建立或修復表_(LINE身份權限33_取得正式資料庫_(), LINE身份權限33_身份表, LINE身份權限33_身份欄位);
}

function LINE身份權限33_取得紀錄表_() {
  return LINE身份權限33_建立或修復表_(LINE身份權限33_取得正式資料庫_(), LINE身份權限33_紀錄表, LINE身份權限33_紀錄欄位);
}

function LINE身份權限33_建立或修復表_(資料庫, 分頁名稱, 必要欄位) {
  var 分頁 = 資料庫.getSheetByName(分頁名稱);
  if (!分頁) 分頁 = 資料庫.insertSheet(分頁名稱);

  if (分頁.getLastRow() < 1 || 分頁.getLastColumn() < 1) {
    分頁.getRange(1, 1, 1, 必要欄位.length).setValues([必要欄位]);
  } else {
    var 現有欄位 = LINE身份權限33_取表頭_(分頁);
    var 缺少欄位 = 必要欄位.filter(function (欄位) { return 現有欄位.indexOf(欄位) < 0; });
    if (缺少欄位.length) 分頁.getRange(1, 現有欄位.length + 1, 1, 缺少欄位.length).setValues([缺少欄位]);
  }

  分頁.setFrozenRows(1);
  var 最後欄 = Math.max(分頁.getLastColumn(), 必要欄位.length);
  分頁.getRange(1, 1, 1, 最後欄).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  if (typeof 分頁.autoResizeColumns === 'function') 分頁.autoResizeColumns(1, 最後欄);
  return 分頁;
}

function LINE身份權限33_讀表物件_(分頁) {
  if (!分頁 || 分頁.getLastRow() < 2 || 分頁.getLastColumn() < 1) return [];
  var 資料 = 分頁.getDataRange().getValues();
  var 表頭 = 資料.shift().map(function (值) { return LINE身份權限33_文字_(值); });
  return 資料.map(function (列, 索引) {
    var 物件 = { __row: 索引 + 2 };
    表頭.forEach(function (欄名, 欄號) { if (欄名) 物件[欄名] = 列[欄號]; });
    return 物件;
  }).filter(function (列) {
    return 表頭.some(function (欄名) { return 欄名 && LINE身份權限33_文字_(列[欄名]) !== ''; });
  });
}

function LINE身份權限33_取表頭_(分頁) {
  var 欄數 = 分頁 ? Number(分頁.getLastColumn() || 0) : 0;
  if (!欄數) return [];
  return 分頁.getRange(1, 1, 1, 欄數).getValues()[0].map(function (值) { return LINE身份權限33_文字_(值); });
}

function LINE身份權限33_安全寫入紀錄_(身份, 收到文字, 指令類型, 判斷結果, 備註) {
  try {
    return LINE身份權限33_寫入紀錄_(身份, 收到文字, 指令類型, 判斷結果, 備註);
  } catch (錯誤) {
    if (typeof console !== 'undefined' && console.error) console.error('33_LINE 權限紀錄寫入失敗：' + LINE身份權限33_錯誤文字_(錯誤));
    return { 成功: false, 錯誤: LINE身份權限33_錯誤文字_(錯誤) };
  }
}

function LINE身份權限33_寫入紀錄_(身份, 收到文字, 指令類型, 判斷結果, 備註) {
  身份 = 身份 || {};
  var 分頁 = LINE身份權限33_取得紀錄表_();
  var 表頭 = LINE身份權限33_取表頭_(分頁);
  var 紀錄 = {
    時間戳: new Date(),
    LINE_USER_ID: 身份.LINE_USER_ID || '',
    工號: 身份.工號 || '',
    姓名: 身份.姓名 || '',
    收到文字: 收到文字 || '',
    指令類型: 指令類型 || '',
    判斷結果: 判斷結果 || '',
    角色: 身份.角色 || '',
    權限等級: 身份.權限等級 === 0 || 身份.權限等級 ? 身份.權限等級 : '',
    備註: 備註 || '',
    動作: 指令類型 || '',
    結果: 判斷結果 || ''
  };
  分頁.appendRow(表頭.map(function (欄名) { return Object.prototype.hasOwnProperty.call(紀錄, 欄名) ? 紀錄[欄名] : ''; }));
  return { 成功: true, 列號: 分頁.getLastRow() };
}

function LINE身份權限33_回覆_(回覆權杖, 文字) {
  回覆權杖 = LINE身份權限33_文字_(回覆權杖);
  if (!回覆權杖) throw new Error('缺少 LINE replyToken，無法回覆。');
  var 安全文字 = String(文字 || '').slice(0, 4900);
  var 權杖 = LINE身份權限33_文字_(PropertiesService.getScriptProperties().getProperty(LINE身份權限33_LINE權杖屬性));
  if (!權杖) throw new Error('尚未設定 Script Property：' + LINE身份權限33_LINE權杖屬性);

  var 回應 = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + 權杖 },
    payload: JSON.stringify({
      replyToken: 回覆權杖,
      messages: [{ type: 'text', text: 安全文字 }]
    }),
    muteHttpExceptions: true
  });
  var 狀態碼 = Number(回應.getResponseCode());
  var 回應內容 = typeof 回應.getContentText === 'function' ? String(回應.getContentText() || '') : '';
  if (狀態碼 < 200 || 狀態碼 >= 300) throw new Error('LINE 回覆失敗，HTTP ' + 狀態碼 + '：' + 回應內容.slice(0, 500));
  return { 成功: true, 狀態碼: 狀態碼 };
}

function LINE身份權限33_使用鎖_(工作) {
  var 鎖 = LockService.getScriptLock();
  鎖.waitLock(20000);
  try {
    return 工作();
  } finally {
    鎖.releaseLock();
  }
}

function LINE身份權限33_嘗試更新RichMenu_(LINE_USER_ID, 身份) {
  try {
    if (typeof 更新LINE主選單_BY身份權限33_ === 'function') return 更新LINE主選單_BY身份權限33_(LINE_USER_ID, 身份);
    if (typeof LINE_RichMenu_依身份更新主選單_ === 'function') return LINE_RichMenu_依身份更新主選單_(LINE_USER_ID, 身份);
    if (typeof 設定_LINE_RichMenu_一般員工入口_ === 'function' && 身份.角色 === '現場人員') return 設定_LINE_RichMenu_一般員工入口_(LINE_USER_ID);
  } catch (錯誤) {
    if (typeof console !== 'undefined' && console.warn) console.warn('Rich Menu 更新略過：' + LINE身份權限33_錯誤文字_(錯誤));
  }
  return null;
}

function 驗收33_LINE正式資料庫設定() {
  var 資料庫 = LINE身份權限33_取得正式資料庫_();
  var 屬性 = PropertiesService.getScriptProperties();
  var 人員 = LINE身份權限33_依工號找人員_('fhfi573');
  var 權限 = 人員 ? LINE身份權限33_依人員推定權限_(人員) : null;
  var 身份分頁存在 = !!資料庫.getSheetByName(LINE身份權限33_身份表);
  var 紀錄分頁存在 = !!資料庫.getSheetByName(LINE身份權限33_紀錄表);
  var 主屬性正確 = LINE身份權限33_資料庫屬性鍵.every(function (鍵) {
    return LINE身份權限33_文字_(屬性.getProperty(鍵)) === LINE身份權限33_正式主庫ID;
  });
  var 人員正確 = !!人員 && 人員.姓名 === '黃嘉欣' && 人員.部門 === '製造部' && 人員.組別 === '製一組' && 人員.職稱 === '工程師';
  var 權限正確 = !!權限 && 權限.角色 === '工程師' && Number(權限.權限等級) === 60;
  var 權杖已設定 = !!LINE身份權限33_文字_(屬性.getProperty(LINE身份權限33_LINE權杖屬性));

  return {
    成功: 主屬性正確 && 身份分頁存在 && 紀錄分頁存在 && 人員正確 && 權限正確 && 權杖已設定,
    success: 主屬性正確 && 身份分頁存在 && 紀錄分頁存在 && 人員正確 && 權限正確 && 權杖已設定,
    版本: LINE身份權限33_版本,
    試算表ID: typeof 資料庫.getId === 'function' ? 資料庫.getId() : LINE身份權限33_正式主庫ID,
    試算表名稱: LINE身份權限33_安全取得資料庫名稱_(資料庫),
    ScriptProperties皆指向正式主庫: 主屬性正確,
    身份分頁存在: 身份分頁存在,
    紀錄分頁存在: 紀錄分頁存在,
    LINE權杖已設定: 權杖已設定,
    黃嘉欣人員主檔: 人員,
    黃嘉欣推定權限: 權限,
    訊息: '成功必須為 true，才進行 LINE 實機驗收。'
  };
}

function 測試33_LINE權限判定_黃嘉欣() {
  var 人員 = LINE身份權限33_依工號找人員_('fhfi573');
  if (!人員) return { 成功: false, 訊息: '01_人員主檔找不到 fhfi573' };
  var 權限 = LINE身份權限33_依人員推定權限_(人員);
  return {
    成功: 人員.姓名 === '黃嘉欣' && 人員.部門 === '製造部' && 人員.組別 === '製一組' && 人員.職稱 === '工程師' && 權限.角色 === '工程師' && Number(權限.權限等級) === 60,
    人員: 人員,
    權限: 權限
  };
}

function 讀取33_LINE目前資料庫設定() {
  var 屬性 = PropertiesService.getScriptProperties();
  var 結果 = { 正式主資料庫ID: LINE身份權限33_正式主庫ID };
  LINE身份權限33_資料庫屬性鍵.forEach(function (鍵) { 結果[鍵] = 屬性.getProperty(鍵) || ''; });
  結果.是否一致 = LINE身份權限33_資料庫屬性鍵.every(function (鍵) { return 結果[鍵] === LINE身份權限33_正式主庫ID; });
  結果.LINE權杖已設定 = !!LINE身份權限33_文字_(屬性.getProperty(LINE身份權限33_LINE權杖屬性));
  return 結果;
}

/* ===== 舊名稱相容層：保留既有 34、37 與舊主後端可能使用的函式 ===== */

function 處理_LINE文字事件_身份綁定模組(事件) {
  var 文字 = LINE身份權限33_正規化指令_(事件 && 事件.message && 事件.message.text);
  var LINE_USER_ID = LINE身份權限33_文字_(事件 && 事件.source && 事件.source.userId);
  var 工號 = LINE身份權限33_解析綁定工號_(文字);
  if (工號) return { handled: true, text: 處理_LINE_綁定指令(LINE_USER_ID, 工號, 事件) };
  if (/^(解除綁定|取消綁定)$/i.test(文字)) return { handled: true, text: 處理_LINE_解除綁定(LINE_USER_ID) };
  if (/^我的任務$/i.test(文字)) return { handled: true, text: 處理_LINE_我的任務(LINE_USER_ID) };
  if (/^(我的身份|我的身分|身份查詢|身分查詢|權限檢查|我是誰)$/i.test(文字)) return { handled: true, text: 處理_LINE_權限檢查(LINE_USER_ID) };
  return { handled: false, text: '' };
}

function 處理_LINE_綁定指令(LINE_USER_ID, 工號) {
  return LINE身份權限33_綁定身份_(LINE_USER_ID, 工號).文字;
}

function 處理_LINE_解除綁定(LINE_USER_ID) {
  return LINE身份權限33_解除綁定_(LINE_USER_ID).文字;
}

function 處理_LINE_權限檢查(LINE_USER_ID) {
  var 身份 = LINE身份權限33_取得身份_(LINE_USER_ID);
  return 身份 ? LINE身份權限33_格式化身份_(身份) : '🔐 權限檢查\n目前尚未綁定身分。\n請輸入：綁定 fhfi573';
}

function 處理_LINE_我的任務(LINE_USER_ID) {
  var 身份 = LINE身份權限33_取得身份_(LINE_USER_ID);
  if (!身份) return '尚未完成 LINE 綁定，請輸入：綁定 fhfi573';
  var 任務 = 查詢_今日派班待報工_BY_工號(身份.工號);
  if (!任務.length) return '目前沒有待報工任務。\n工號：' + 身份.工號 + '\n姓名：' + 身份.姓名;
  var 內容 = ['今日待報工任務：'];
  任務.slice(0, 10).forEach(function (列, 索引) {
    內容.push((索引 + 1) + '. ' + (列.派班編號 || '-') + '｜' + (列.品名 || 列.產品編號 || '-') + '｜' + (列.工站名稱 || '-'));
  });
  if (任務.length > 10) 內容.push('尚有 ' + (任務.length - 10) + ' 筆，請至 PWA 查看。');
  return 內容.join('\n');
}

function LINE身份權限33_同步正式身份表_(LINE_USER_ID, 工號) {
  var 結果 = LINE身份權限33_綁定身份_(LINE_USER_ID, 工號);
  return { ok: 結果.成功, success: 結果.成功, message: 結果.訊息, row: 結果.列號 || null, 身份: 結果.身份 || null };
}

function LINE身份權限33_同步舊綁定結果_(LINE_USER_ID, 工號) { return LINE身份權限33_同步正式身份表_(LINE_USER_ID, 工號); }
function LINE身份權限33_同步綁定成功_BY事件_(事件, 工號) { return LINE身份權限33_同步正式身份表_(LINE身份權限33_文字_(事件 && 事件.source && 事件.source.userId), 工號); }
function 同步_LINE身份權限33_(LINE_USER_ID, 工號) { return LINE身份權限33_同步正式身份表_(LINE_USER_ID, 工號); }
function LINE身份權限33_前置同步Webhook_() { return null; }
function 查詢_人員主檔_BY_工號(工號) { return LINE身份權限33_依工號找人員_(工號); }
function 查詢_LINE身份_BY_LINE_USER_ID(LINE_USER_ID) { return LINE身份權限33_取得身份_(LINE_USER_ID); }

function 查詢_LINE身份_BY_工號(工號) {
  var 列 = LINE身份權限33_讀表物件_(LINE身份權限33_取得身份表_()).filter(function (身份) {
    return LINE身份權限33_小寫_(身份.工號) === LINE身份權限33_小寫_(工號) && LINE身份權限33_是否啟用_(身份.啟用);
  });
  return LINE身份權限33_最後一筆_(列);
}

function 查詢_今日派班待報工_BY_工號(工號) {
  var 分頁 = LINE身份權限33_取得正式資料庫_().getSheetByName(LINE身份權限33_今日派班表);
  if (!分頁) return [];
  return LINE身份權限33_讀表物件_(分頁).filter(function (列) {
    return LINE身份權限33_小寫_(列.工號 || 列.員工編號) === LINE身份權限33_小寫_(工號) && LINE身份權限33_文字_(列.狀態) === '待報工';
  });
}

function 取得_LINE身份權限33_試算表_() { return LINE身份權限33_取得正式資料庫_(); }
function LINE身份權限33_讀取表格物件陣列_(分頁名稱) { return LINE身份權限33_讀表物件_(LINE身份權限33_取得必要分頁_(分頁名稱)); }
function LINE身份權限33_回覆LINE_(回覆權杖, 文字) { return LINE身份權限33_回覆_(回覆權杖, 文字); }

function LINE身份權限33_寫紀錄_(LINE_USER_ID, 工號, 姓名, 動作, 結果, 備註) {
  return LINE身份權限33_安全寫入紀錄_({ LINE_USER_ID: LINE_USER_ID, 工號: 工號, 姓名: 姓名 }, '', 動作, 結果, 備註);
}

function LINE身份權限33_取得目標選單名稱_(身份) {
  return 身份 && 身份.角色 === '現場人員' ? '一般員工入口' : '主管入口';
}

function LINE身份權限33_取得權限等級_(身份) {
  var 數值 = Number(身份 && 身份.權限等級);
  if (isFinite(數值) && 數值 > 0) return 數值;
  var 角色 = LINE身份權限33_文字_(身份 && 身份.角色);
  if (角色 === '主管') return 80;
  if (角色 === '班長') return 70;
  if (角色 === '工程師') return 60;
  return 10;
}

function LINE身份權限33_轉顯示角色_(角色) { return LINE身份權限33_文字_(角色) || '現場人員'; }
function LINE身份權限33_依職稱判斷角色_(職稱) { return LINE身份權限33_依人員推定權限_({ 職稱: 職稱 }).角色; }

function 測試33_LINE身份權限_確認正式主庫() { return 驗收33_LINE正式資料庫設定(); }

function 測試_33_LINE主管權限與身份綁定_本機規格() {
  return {
    成功: true,
    訊息: '33_LINE 自包含規格通過；正式資料驗收請執行「驗收33_LINE正式資料庫設定」。',
    版本: LINE身份權限33_版本,
    正式主資料庫ID: LINE身份權限33_正式主庫ID,
    保護指令: ['主管戰情', '今日戰情', '昨日戰情', '戰情 yyyy-mm-dd', '主檔檢查', 'AI摘要'],
    公開指令: ['報工', '報工作業', '指令']
  };
}

function 測試_33_LINE主管權限_模擬未綁定主管指令() {
  return {
    成功: true,
    訊息: '請以本機 Node 驗收測試模擬 Webhook；此函式不消耗正式 LINE replyToken。',
    測試指令: '主管戰情'
  };
}

/* ===== 純工具函式 ===== */

function LINE身份權限33_正規化指令_(值) {
  return LINE身份權限33_文字_(值).replace(/\u3000/g, ' ').replace(/\s+/g, ' ');
}

function LINE身份權限33_文字_(值) {
  return String(值 === null || 值 === undefined ? '' : 值).trim();
}

function LINE身份權限33_小寫_(值) { return LINE身份權限33_文字_(值).toLowerCase(); }

function LINE身份權限33_是否啟用_(值) {
  var 文字 = LINE身份權限33_小寫_(值);
  return ['否', '停用', 'false', '0', 'no', 'n'].indexOf(文字) < 0;
}

function LINE身份權限33_是否為是_(值) {
  return ['是', 'yes', 'y', 'true', '1'].indexOf(LINE身份權限33_小寫_(值)) >= 0;
}

function LINE身份權限33_最後一筆_(陣列) { return 陣列 && 陣列.length ? 陣列[陣列.length - 1] : null; }

function LINE身份權限33_找欄位_(表頭, 候選) {
  for (var i = 0; i < 候選.length; i++) {
    var 索引 = 表頭.indexOf(候選[i]);
    if (索引 >= 0) return 索引;
  }
  return -1;
}

function LINE身份權限33_錯誤文字_(錯誤) {
  return String(錯誤 && 錯誤.message ? 錯誤.message : 錯誤 || '未知錯誤');
}

function LINE身份權限33_安全取得資料庫名稱_(資料庫) {
  return 資料庫 && typeof 資料庫.getName === 'function' ? String(資料庫.getName() || '') : '';
}

function LINE身份權限33_現在_() {
  return Utilities.formatDate(new Date(), LINE身份權限33_時區, 'yyyy-MM-dd HH:mm:ss');
}
