/**
 * ============================================================
 * 化新精密｜智慧5S｜巡檢提醒自動化
 * 版本：1.0.0
 * ============================================================
 *
 * 功能：
 * 1. 依 5S_區域主檔 的巡檢頻率判斷「每日」與「每週」應巡區域。
 * 2. 依 5S_系統參數 的提醒時間建立 LINE 群組通知。
 * 3. 同一天、同階段提醒使用去重鍵，禁止重複發送。
 * 4. 巡檢完成後，不再建立後續未巡提醒。
 * 5. 若當天曾發送提醒，之後全部完成，建立一次「巡檢完成」恢復通知。
 * 6. 每週巡檢依「每週巡檢截止星期」判斷；1=星期一，5=星期五。
 * 7. 自動排除系統驗收、TEST_ONLY、作廢巡檢。
 * 8. 沿用既有唯一 LINE Bot 與 5S_通知紀錄，不建立第二套 Bot／資料庫。
 *
 * 預設中央參數：
 * - 每日巡檢首次提醒時間：10:30
 * - 每日巡檢二次提醒時間：13:30
 * - 每日巡檢最終提醒時間：15:30
 * - 每週巡檢截止星期：5
 * ============================================================
 */

var 智慧5S_巡檢提醒_版本 = '1.0.0';
var 智慧5S_巡檢提醒_資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S_巡檢提醒_時區 = 'Asia/Taipei';
var 智慧5S_巡檢提醒_排程函式 = '智慧5S_巡檢提醒_自動檢查';

function 智慧5S_巡檢提醒_自動檢查() {
  var 結果 = 智慧5S_巡檢提醒_執行檢查();

  if (typeof 智慧5S_LINE橋接_處理待通知 === 'function') {
    結果.LINE發送結果 = 智慧5S_LINE橋接_處理待通知(30);
  }

  return 結果;
}

function 智慧5S_巡檢提醒_執行檢查() {
  var 資料庫 = SpreadsheetApp.openById(智慧5S_巡檢提醒_資料庫ID);
  var 區域分頁 = 資料庫.getSheetByName('5S_區域主檔');
  var 巡檢分頁 = 資料庫.getSheetByName('5S_巡檢主檔');
  var 通知分頁 = 資料庫.getSheetByName('5S_通知紀錄');
  var 參數分頁 = 資料庫.getSheetByName('5S_系統參數');

  if (!區域分頁 || !巡檢分頁 || !通知分頁 || !參數分頁) {
    throw new Error('智慧5S巡檢提醒缺少必要分頁');
  }

  var 現在 = new Date();
  var 今天 = Utilities.formatDate(現在, 智慧5S_巡檢提醒_時區, 'yyyy-MM-dd');
  var 現在時間 = Utilities.formatDate(現在, 智慧5S_巡檢提醒_時區, 'HH:mm');
  var 星期 = Number(Utilities.formatDate(現在, 智慧5S_巡檢提醒_時區, 'u'));

  var 參數 = 智慧5S_巡檢提醒_讀取參數_(參數分頁);
  var 首次時間 = 參數['每日巡檢首次提醒時間'] || '10:30';
  var 二次時間 = 參數['每日巡檢二次提醒時間'] || '13:30';
  var 最終時間 = 參數['每日巡檢最終提醒時間'] || '15:30';
  var 每週截止星期 = Number(參數['每週巡檢截止星期'] || 5);

  var 階段 = 智慧5S_巡檢提醒_判斷階段_(現在時間, 首次時間, 二次時間, 最終時間);
  var 區域清單 = 智慧5S_巡檢提醒_讀取表格_(區域分頁).filter(function (列) {
    return String(列['啟用'] || '是').trim() !== '否';
  });
  var 巡檢清單 = 智慧5S_巡檢提醒_讀取表格_(巡檢分頁).filter(function (列) {
    return !智慧5S_巡檢提醒_是否測試巡檢_(列) && String(列['狀態'] || '').trim() !== '作廢';
  });

  var 群組識別碼 = 智慧5S_巡檢提醒_取得群組_(區域清單);
  if (!群組識別碼) {
    return { 成功: false, 版本: 智慧5S_巡檢提醒_版本, 訊息: '尚未設定智慧5S LINE群組識別碼' };
  }

  var 今日已巡 = {};
  var 本週已巡 = {};
  var 週起日 = 智慧5S_巡檢提醒_本週星期一_(現在);

  巡檢清單.forEach(function (列) {
    var 代碼 = String(列['區域代碼'] || '').trim();
    if (!代碼) return;

    var 日期 = 智慧5S_巡檢提醒_解析日期_(列['巡檢日期'] || 列['送出時間'] || 列['建立時間']);
    if (!日期) return;

    var 日期字串 = Utilities.formatDate(日期, 智慧5S_巡檢提醒_時區, 'yyyy-MM-dd');
    if (日期字串 === 今天) 今日已巡[代碼] = true;
    if (日期.getTime() >= 週起日.getTime() && 日期.getTime() <= 現在.getTime()) 本週已巡[代碼] = true;
  });

  var 每日應巡 = [];
  var 每日未巡 = [];
  var 每週應巡 = [];
  var 每週未巡 = [];

  區域清單.forEach(function (列) {
    var 代碼 = String(列['區域代碼'] || '').trim();
    var 名稱 = String(列['區域名稱'] || 代碼).trim();
    var 頻率 = String(列['巡檢頻率'] || '每日').trim();
    var 項目 = { 區域代碼: 代碼, 區域名稱: 名稱, 巡檢頻率: 頻率 };

    if (頻率 === '每週') {
      每週應巡.push(項目);
      if (星期 >= 每週截止星期 && !本週已巡[代碼]) 每週未巡.push(項目);
    } else {
      每日應巡.push(項目);
      if (!今日已巡[代碼]) 每日未巡.push(項目);
    }
  });

  var 總未完成 = 每日未巡.concat(每週未巡);
  var 今日提醒已存在 = 智慧5S_巡檢提醒_今天是否曾提醒_(通知分頁, 今天);
  var 新增通知數 = 0;

  if (總未完成.length === 0) {
    if (今日提醒已存在) {
      var 恢復去重鍵 = '5S-PATROL-RECOVERY-' + 今天;
      var 恢復摘要 = '【智慧5S巡檢完成】' + 今天 + '｜今日應巡區域已完成；系統已解除後續未巡提醒。';
      if (智慧5S_巡檢提醒_新增通知_(通知分頁, {
        通知編號: '5S-PATROL-RECOVERY-' + 今天.replace(/-/g, ''),
        通知場景: '巡檢完成解除提醒',
        對象類型: 'LINE群組',
        對象識別碼: 群組識別碼,
        訊息類型: '巡檢完成',
        內容摘要: 恢復摘要,
        狀態: '待發送',
        送出時間: '',
        錯誤訊息: '',
        去重鍵: 恢復去重鍵
      })) 新增通知數++;
    }

    SpreadsheetApp.flush();
    return {
      成功: true,
      版本: 智慧5S_巡檢提醒_版本,
      日期: 今天,
      階段: 階段,
      每日應巡數: 每日應巡.length,
      每日未巡數: 0,
      每週到期未巡數: 0,
      新增通知數: 新增通知數,
      訊息: '目前無需提醒，後續未巡提醒已自動解除'
    };
  }

  if (!階段) {
    return {
      成功: true,
      版本: 智慧5S_巡檢提醒_版本,
      日期: 今天,
      階段: '',
      每日應巡數: 每日應巡.length,
      每日未巡數: 每日未巡.length,
      每週到期未巡數: 每週未巡.length,
      新增通知數: 0,
      訊息: '尚未到提醒時間'
    };
  }

  var 去重鍵 = '5S-PATROL-' + 今天 + '-' + 階段;
  var 名稱清單 = 總未完成.map(function (列) { return 列.區域名稱; }).join('、');
  var 每週文字 = 每週未巡.length ? '｜本週到期未巡：' + 每週未巡.length + ' 區' : '';
  var 摘要 = '【智慧5S巡檢提醒】' + 今天 +
    '｜' + 智慧5S_巡檢提醒_階段文字_(階段) +
    '｜每日未巡：' + 每日未巡.length + '/' + 每日應巡.length + ' 區' +
    每週文字 +
    '｜待巡：' + 名稱清單 +
    '。完成巡檢後，後續提醒會自動停止。';

  if (智慧5S_巡檢提醒_新增通知_(通知分頁, {
    通知編號: '5S-PATROL-' + 今天.replace(/-/g, '') + '-' + 階段,
    通知場景: '每日巡檢未完成提醒',
    對象類型: 'LINE群組',
    對象識別碼: 群組識別碼,
    訊息類型: '巡檢提醒',
    內容摘要: 摘要,
    狀態: '待發送',
    送出時間: '',
    錯誤訊息: '',
    去重鍵: 去重鍵
  })) 新增通知數++;

  SpreadsheetApp.flush();

  return {
    成功: true,
    版本: 智慧5S_巡檢提醒_版本,
    日期: 今天,
    階段: 階段,
    每日應巡數: 每日應巡.length,
    每日未巡數: 每日未巡.length,
    每週應巡數: 每週應巡.length,
    每週到期未巡數: 每週未巡.length,
    新增通知數: 新增通知數,
    訊息: 新增通知數 ? '巡檢未完成提醒已建立' : '相同階段提醒已存在，未重複建立'
  };
}

function 智慧5S_巡檢提醒_建立每日觸發器() {
  智慧5S_巡檢提醒_刪除每日觸發器();

  var 資料庫 = SpreadsheetApp.openById(智慧5S_巡檢提醒_資料庫ID);
  var 參數分頁 = 資料庫.getSheetByName('5S_系統參數');
  var 參數 = 參數分頁 ? 智慧5S_巡檢提醒_讀取參數_(參數分頁) : {};
  var 時間清單 = [
    參數['每日巡檢首次提醒時間'] || '10:30',
    參數['每日巡檢二次提醒時間'] || '13:30',
    參數['每日巡檢最終提醒時間'] || '15:30'
  ];

  時間清單.forEach(function (時間文字) {
    var 部分 = String(時間文字).split(':');
    var 小時 = Number(部分[0]);
    var 分鐘 = Number(部分[1] || 0);

    ScriptApp.newTrigger(智慧5S_巡檢提醒_排程函式)
      .timeBased()
      .everyDays(1)
      .atHour(小時)
      .nearMinute(分鐘)
      .create();
  });

  return {
    成功: true,
    版本: 智慧5S_巡檢提醒_版本,
    觸發器數: 3,
    提醒時間: 時間清單,
    訊息: '智慧5S巡檢提醒三段每日觸發器已建立'
  };
}

function 智慧5S_巡檢提醒_刪除每日觸發器() {
  var 數量 = 0;
  ScriptApp.getProjectTriggers().forEach(function (觸發器) {
    if (觸發器.getHandlerFunction() === 智慧5S_巡檢提醒_排程函式) {
      ScriptApp.deleteTrigger(觸發器);
      數量++;
    }
  });
  return { 成功: true, 已刪除觸發器數: 數量 };
}

function 智慧5S_巡檢提醒_健康檢查() {
  var 資料庫 = SpreadsheetApp.openById(智慧5S_巡檢提醒_資料庫ID);
  var 必要分頁 = ['5S_區域主檔', '5S_巡檢主檔', '5S_通知紀錄', '5S_系統參數'];
  var 缺少 = 必要分頁.filter(function (名稱) { return !資料庫.getSheetByName(名稱); });
  var 觸發器數 = ScriptApp.getProjectTriggers().filter(function (觸發器) {
    return 觸發器.getHandlerFunction() === 智慧5S_巡檢提醒_排程函式;
  }).length;

  return {
    成功: 缺少.length === 0,
    版本: 智慧5S_巡檢提醒_版本,
    資料庫名稱: 資料庫.getName(),
    缺少分頁: 缺少,
    巡檢提醒觸發器數: 觸發器數,
    LINE橋接可用: typeof 智慧5S_LINE橋接_處理待通知 === 'function'
  };
}

function 智慧5S_巡檢提醒_讀取參數_(分頁) {
  var 結果 = {};
  if (!分頁 || 分頁.getLastRow() < 2) return 結果;
  var 資料 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, Math.min(2, 分頁.getLastColumn())).getDisplayValues();
  資料.forEach(function (列) {
    var 鍵 = String(列[0] || '').trim();
    if (鍵) 結果[鍵] = String(列[1] || '').trim();
  });
  return 結果;
}

function 智慧5S_巡檢提醒_讀取表格_(分頁) {
  if (!分頁 || 分頁.getLastRow() < 2) return [];
  var 欄位 = 分頁.getRange(1, 1, 1, 分頁.getLastColumn()).getDisplayValues()[0];
  var 資料 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 分頁.getLastColumn()).getDisplayValues();
  return 資料.map(function (列) {
    var 物件 = {};
    欄位.forEach(function (欄名, i) { 物件[String(欄名 || '').trim()] = 列[i]; });
    return 物件;
  });
}

function 智慧5S_巡檢提醒_是否測試巡檢_(列) {
  var 合併 = [
    列['巡檢單號'], 列['巡檢人工號'], 列['巡檢人姓名'], 列['裝置識別碼'], 列['備註']
  ].map(function (值) { return String(值 || '').trim(); }).join('｜');

  return 合併.indexOf('智慧5S自動驗收') >= 0 ||
    合併.indexOf('SYSTEM-5S-TEST') >= 0 ||
    合併.indexOf('SYSTEM-ACCEPTANCE') >= 0 ||
    合併.indexOf('TEST_ONLY') >= 0;
}

function 智慧5S_巡檢提醒_取得群組_(區域清單) {
  for (var i = 0; i < 區域清單.length; i++) {
    var 群組 = String(區域清單[i]['LINE群組識別碼'] || '').trim();
    if (群組) return 群組;
  }
  return '';
}

function 智慧5S_巡檢提醒_判斷階段_(現在時間, 首次時間, 二次時間, 最終時間) {
  if (現在時間 >= 最終時間) return '3';
  if (現在時間 >= 二次時間) return '2';
  if (現在時間 >= 首次時間) return '1';
  return '';
}

function 智慧5S_巡檢提醒_階段文字_(階段) {
  if (階段 === '1') return '首次提醒';
  if (階段 === '2') return '二次提醒';
  if (階段 === '3') return '最終提醒';
  return '巡檢提醒';
}

function 智慧5S_巡檢提醒_今天是否曾提醒_(通知分頁, 今天) {
  if (!通知分頁 || 通知分頁.getLastRow() < 2) return false;
  var 資料 = 智慧5S_巡檢提醒_讀取表格_(通知分頁);
  return 資料.some(function (列) {
    var 去重鍵 = String(列['去重鍵'] || '').trim();
    var 狀態 = String(列['狀態'] || '').trim();
    return 去重鍵.indexOf('5S-PATROL-' + 今天 + '-') === 0 && ['待發送', '已發送'].indexOf(狀態) >= 0;
  });
}

function 智慧5S_巡檢提醒_新增通知_(通知分頁, 通知) {
  var 欄位 = 通知分頁.getRange(1, 1, 1, 通知分頁.getLastColumn()).getDisplayValues()[0];
  var 現有 = 智慧5S_巡檢提醒_讀取表格_(通知分頁);
  var 去重鍵 = String(通知.去重鍵 || '').trim();

  var 已存在 = 現有.some(function (列) {
    return String(列['去重鍵'] || '').trim() === 去重鍵;
  });
  if (已存在) return false;

  var 新列 = 欄位.map(function (欄名) {
    return 通知[String(欄名 || '').trim()] !== undefined ? 通知[String(欄名 || '').trim()] : '';
  });
  通知分頁.appendRow(新列);
  return true;
}

function 智慧5S_巡檢提醒_解析日期_(值) {
  if (!值) return null;
  if (Object.prototype.toString.call(值) === '[object Date]' && !isNaN(值.getTime())) return 值;
  var 文字 = String(值).trim().replace(/\//g, '-');
  var 符合 = 文字.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!符合) return null;
  return new Date(Number(符合[1]), Number(符合[2]) - 1, Number(符合[3]), 12, 0, 0);
}

function 智慧5S_巡檢提醒_本週星期一_(日期) {
  var 星期 = Number(Utilities.formatDate(日期, 智慧5S_巡檢提醒_時區, 'u'));
  var 結果 = new Date(日期.getFullYear(), 日期.getMonth(), 日期.getDate(), 0, 0, 0);
  結果.setDate(結果.getDate() - (星期 - 1));
  return 結果;
}
