/****************************************************
 * 化新精密｜NEXUS OS 智慧製造系統
 * 主檔：GAS 後端入口.gs
 *
 * 版本：2026-09-11_智慧5S讀取修復1.3.9.3（保留原報工閉環）
 *
 * 重點：
 * 1. 只保留一組 doGet / doPost
 * 2. 固定連接正式主資料庫
 * 3. 不使用 SpreadsheetApp.getUi().alert()
 * 4. Web App 直接顯示新版報工入口
 * 5. 支援報工閉環：
 *    10_派工單 → 09_報工任務池 → 09_報工紀錄 → 回寫 10_派工單
 ****************************************************/


/* =========================================================
 * 一、系統設定
 * ========================================================= */

var 後端入口設定 = {
  系統名稱: 'NEXUS OS 智慧製造系統',
  公司名稱: '化新精密',
  時區: 'Asia/Taipei',

  // ✅ 正式主資料庫：⭐智慧工廠主資料庫
  主資料庫ID: '1RCTepxN0PMDwJp5HMBEQtVl6R6ynUP4UVaVPcPhFoq0'
};


var 主檔分頁 = {
  人員主檔: '01_人員主檔',
  產品主檔: '02_產品主檔',
  機台主檔: '03_機台主檔',
  工站主檔: '04_工站主檔',
  共用資料: '05_共用資料',
  生產計畫: '07_生產計畫',

  工單清單: '09_工單清單',
  報工資料: '09_報工資料',
  報工紀錄: '09_報工紀錄',
  報工任務池: '09_報工任務池',
  報工進度檢核: '09_報工進度檢核',
  報工API測試紀錄: '09_報工API測試紀錄',

  派工單: '10_派工單',
  派工單草稿: '10_派工單草稿',
  派工單待轉入: '10_派工單待轉入',
  派工單轉入紀錄: '10_派工單轉入紀錄',
  排程需求池: '10_排程需求池',
  排程結果: '10_排程結果',

  檢具主檔: '11_檢具主檔',
  檢具清單: '11_檢具清單',
  刀具清單: '11_刀具清單',
  治具清單: '11_治具清單',

  AI分析紀錄: '12_AI分析紀錄',
  知識庫: '12_知識庫',
  任務指派紀錄: '13_任務指派紀錄',
  LINE通知紀錄: '14_LINE通知紀錄',
  操作日誌: '99_操作日誌'
};


/* =========================================================
 * 二、正式主資料庫連線
 * ========================================================= */

function 取得_智慧工廠主資料庫() {
  return SpreadsheetApp.openById(後端入口設定.主資料庫ID);
}


/* =========================================================
 * 三、Web App 入口
 * ========================================================= */
function doGet(e) {

// ======================================================
// 3D廠區電子地圖 V2｜入口補丁
// 貼放位置：原本 GAS 後端入口.gs 的 function doGet(e) { 第一行後面
// 開啟網址：你的WebApp網址?page=3D廠區地圖&v=2
// ======================================================
// ======================================================
// 廠區平面地圖｜入口補丁
// 支援：?page=廠區平面地圖
// ======================================================
// ======================================================
// 廠區 2D+3D 地圖｜入口防呆補丁
// 可防止網址寫成 ?%20page=xxx 時讀不到
// ======================================================
try {
  const 原始參數 = e && e.parameter ? e.parameter : {};
  const 修正參數 = {};

  Object.keys(原始參數).forEach(function(key) {
    修正參數[String(key).trim()] = 原始參數[key];
  });

  const 頁面 = String(
    修正參數.page ||
    修正參數.頁面 ||
    修正參數.p ||
    ''
  ).trim();

  if (
    頁面 === '廠區2D3D地圖' ||
    頁面 === '廠區OpenLayers地圖' ||
    頁面 === '廠區平面地圖' ||
    頁面 === '廠區地圖' ||
    頁面 === '3D廠區地圖' ||
    頁面 === '3D廠區電子地圖'
  ) {
    return 廠區2D3D_輸出頁面();
  }

} catch (錯誤) {
  return HtmlService
    .createHtmlOutput('廠區 2D+3D 地圖入口錯誤：' + 錯誤.message)
    .setTitle('廠區地圖錯誤');
}

  
  const 參數 = e && e.parameter ? e.parameter : {};
  const 頁面 = String(參數.page || 參數.頁面 || '首頁入口').trim();

  if (參數.api) {
  var API結果 = 主檔_API路由(參數);
  return 智慧5S_iOS_JSONP輸出_(API結果, 參數);
}

  const 檔案名稱 = GAS入口_取得HTML檔名_(頁面);

  

  try {
    return HtmlService
      .createTemplateFromFile(檔案名稱)
      .evaluate()
      .setTitle(頁面)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (錯誤) {
    return HtmlService
      .createHtmlOutput('<h2>找不到頁面：' + 頁面 + '</h2><pre>' + 錯誤.message + '</pre>')
      .setTitle('頁面錯誤');
  }
}

function GAS入口_取得HTML檔名_(頁面) {
  const 路由表 = {
    '首頁入口': '首頁入口_穩定版',
    'V2報工入口測試': 'V2報工入口測試',
    'V2正式報工入口': 'V2報工入口測試',
    '智慧排程入口': '智慧排程入口',
    '環境管理入口': '環境管理入口',
    '檢具管理入口': '檢具管理入口',
    'AI分析入口': 'AI分析入口',
    '任務指派入口': '任務指派入口'
  };

  return 路由表[頁面] || 頁面;
}

function GAS入口_處理API_(參數) {
  const api = String(參數.api || '').trim();

  if (api === '環境水箱上傳') {
    const 結果 = 環境_寫入水箱監測(參數);
    return ContentService
      .createTextOutput(JSON.stringify(結果))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({成功:false, 訊息:'未知API：' + api}))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(檔案名稱) {
  return HtmlService.createHtmlOutputFromFile(檔案名稱).getContent();


  var 參數 = 主檔_取得參數(e);
  var api = 主檔_取得API名稱(參數);

  if (api) {
    var 結果 = 主檔_API路由(參數);
    return 主檔_JSON輸出(結果, 參數);
  }

  return HtmlService
    .createHtmlOutput(取得_主檔報工入口HTML())
    .setTitle('智慧工廠報工入口')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function doPost_舊版備份(e){
  var 參數 = 主檔_取得參數(e);
  var LINE重送守門 = null;

  if (參數 && Array.isArray(參數.events)) {
    // LINE Webhook 重送防護：只略過已成功處理過的事件。
    if (typeof LINE訊息重送防護_準備_ === 'function') {
      LINE重送守門 = LINE訊息重送防護_準備_(參數);
      if (LINE重送守門 && LINE重送守門.全部重複) {
        return 主檔_JSON輸出({
          成功: true,
          success: true,
          已處理: true,
          模組: 'LINE訊息重送防護',
          訊息: '重複 Webhook 已安全略過',
          重複數: LINE重送守門.重複數
        }, 參數);
      }
    }

    // 1. 智慧 5S 群組指令
    if (typeof 智慧5S_LINE群組綁定_嘗試處理Webhook_ === 'function') {
      var 智慧5S群組處理結果 =
        智慧5S_LINE群組綁定_嘗試處理Webhook_(參數);
      if (智慧5S群組處理結果 && 智慧5S群組處理結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主檔_JSON輸出(智慧5S群組處理結果, 參數);
      }
    }

    
        // 2. 智慧5S正式入口（v1.3.6／1360）
    if (typeof LINE智慧5S入口39_嘗試處理Webhook_ === 'function') {
      var 智慧5S入口39處理結果 = LINE智慧5S入口39_嘗試處理Webhook_(參數);
      if (智慧5S入口39處理結果 && 智慧5S入口39處理結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主檔_JSON輸出(智慧5S入口39處理結果, 參數);
      }
    }
    
// 2. 指令中心、我的狀態、選單說明
    if (typeof LINE指令中心37_嘗試處理Webhook_ === 'function') {
      var LINE指令中心處理結果 =
        LINE指令中心37_嘗試處理Webhook_(參數);
      if (LINE指令中心處理結果 && LINE指令中心處理結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主檔_JSON輸出(LINE指令中心處理結果, 參數);
      }
    }

    // 3. 依身分切換既有 Rich Menu
    if (typeof LINE角色分流34_嘗試處理Webhook_ === 'function') {
      var LINE角色分流處理結果 =
        LINE角色分流34_嘗試處理Webhook_(參數);
      if (LINE角色分流處理結果 && LINE角色分流處理結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主檔_JSON輸出(LINE角色分流處理結果, 參數);
      }
    }

    // 4. LINE 一對一身分綁定與權限檢查
    if (typeof LINE身份權限_嘗試處理Webhook_ === 'function') {
      var LINE身份權限處理結果 =
        LINE身份權限_嘗試處理Webhook_(參數);
      if (LINE身份權限處理結果 && LINE身份權限處理結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主檔_JSON輸出(LINE身份權限處理結果, 參數);
      }
    }
    // 5. 主管 Rich Menu 快捷戰情
    if (typeof LINE主管快捷戰情68_嘗試處理Webhook_ === 'function') {
      var LINE主管快捷戰情處理結果 = LINE主管快捷戰情68_嘗試處理Webhook_(參數);
      if (LINE主管快捷戰情處理結果 && LINE主管快捷戰情處理結果.已處理) {
        if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
        return 主檔_JSON輸出(LINE主管快捷戰情處理結果, 參數);
      }
    }

    // 6. 權限放行後交回原有 LINE 指令處理器
    if (參數.events.length && typeof 處理LINEWebhook_ === 'function') {
      var LINE一般處理結果 = 處理LINEWebhook_(參數);
      if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
      return LINE一般處理結果;
    }
  }

  // 7. 非 LINE 指令繼續走原本 NEXUS OS API
  var 結果 = 主檔_API路由(參數);
  if (LINE重送守門) LINE訊息重送防護_完成_(LINE重送守門);
  return 主檔_JSON輸出(結果, 參數);
}

/* =========================================================
 * 四、API 路由
 * ========================================================= */

function 主檔_API路由(參數) {
  try {
    var api = 主檔_取得API名稱(參數);

    if (!api) {
      return {
        成功: false,
        訊息: '缺少 api / 動作 / action 參數',
        可用API: [
          '健康檢查',
          '取得系統連線狀態',
          '初始化必要分頁',
          '讀取分頁資料',
          '新增分頁資料',
          '取得報工初始化資料',
          '取得報工任務池',
          '送出報工',
          '取得儀表板資料',
          '建立測試派工',
          '重建報工任務池'
        ]
      };
    }

    switch (api) {
      case '健康檢查':
      case '測試連線':
        return 主檔_健康檢查();

      case '取得系統連線狀態':
        return 主檔_取得系統連線狀態();

      case '初始化必要分頁':
      case '初始化分頁':
      case '初始化':
        return 主檔_初始化必要分頁();

      case '讀取分頁資料':
        return 主檔_讀取分頁資料(
          參數.分頁名稱 || 參數.sheetName || 參數.工作表名稱,
          參數
        );

      case '新增分頁資料':
        return 主檔_新增分頁資料(
          參數.分頁名稱 || 參數.sheetName || 參數.工作表名稱,
          參數.資料 || 參數
        );

      case '取得人員清單':
        return 主檔_讀取分頁資料(主檔分頁.人員主檔, 參數);

      case '取得產品清單':
        return 主檔_讀取分頁資料(主檔分頁.產品主檔, 參數);

      case '取得機台清單':
        return 主檔_讀取分頁資料(主檔分頁.機台主檔, 參數);

      case '取得工站清單':
        return 主檔_讀取分頁資料(主檔分頁.工站主檔, 參數);

      case '取得報工紀錄':
        return 主檔_讀取分頁資料(主檔分頁.報工紀錄, 參數);

      case '取得報工任務池':
        return 主檔_讀取分頁資料(主檔分頁.報工任務池, 參數);

      case '取得排程結果':
        return 主檔_讀取分頁資料(主檔分頁.排程結果, 參數);

      case '取得檢具清單':
        return 主檔_讀取分頁資料(主檔分頁.檢具清單, 參數);

      case '取得LINE通知紀錄':
      case '取得 LINE 通知紀錄':
        return 主檔_讀取分頁資料(主檔分頁.LINE通知紀錄, 參數);

      case '取得報工初始化資料':
        return 主檔_取得報工初始化資料();

      case '送出報工':
case '新增報工資料':
  if (typeof V2_API_送出報工 === 'function') {
    return V2_API_送出報工(參數.資料 || 參數);
  }
  return 主檔_送出報工(參數.資料 || 參數);

      case '取得儀表板資料':
        return 主檔_取得儀表板資料();

      case '建立測試派工':
        return 主檔_建立測試派工();

      case '重建報工任務池':
        return 主檔_重建報工任務池(new Date());

      default:
        return {
          成功: false,
          訊息: '未知 API：' + api
        };
    }

  } catch (錯誤) {
    return {
      成功: false,
      訊息: String(錯誤 && 錯誤.message ? 錯誤.message : 錯誤),
      錯誤堆疊: String(錯誤 && 錯誤.stack ? 錯誤.stack : '')
    };
  }
}


function 主檔_取得API名稱(參數) {
  return String(
    參數.api ||
    參數.動作 ||
    參數.action ||
    ''
  ).trim();
}


/* =========================================================
 * 五、手動執行函數
 * 不使用 getUi，避免獨立 Apps Script 專案錯誤
 * ========================================================= */

function 執行_健康檢查() {
  var 結果 = 主檔_健康檢查();
  Logger.log(JSON.stringify(結果, null, 2));
  return 結果;
}


function 執行_初始化必要分頁() {
  var 結果 = 主檔_初始化必要分頁();
  Logger.log(JSON.stringify(結果, null, 2));
  return 結果;
}


function 執行_檢查派工報工狀態() {
  var 結果 = 主檔_取得系統連線狀態();
  Logger.log(JSON.stringify(結果, null, 2));
  return 結果;
}


function 執行_建立一筆測試派工() {
  var 結果 = 主檔_建立測試派工();
  Logger.log(JSON.stringify(結果, null, 2));
  return 結果;
}


function 執行_重建報工任務池() {
  var 結果 = 主檔_重建報工任務池(new Date());
  Logger.log(JSON.stringify(結果, null, 2));
  return 結果;
}


function 執行_取得報工初始化資料() {
  var 結果 = 主檔_取得報工初始化資料();
  Logger.log(JSON.stringify(結果, null, 2));
  return 結果;
}


/* =========================================================
 * 六、健康檢查 / 系統狀態
 * ========================================================= */

function 主檔_健康檢查() {
  var ss = 取得_智慧工廠主資料庫();

  return {
    成功: true,
    訊息: '主檔連線成功',
    系統名稱: 後端入口設定.系統名稱,
    主資料庫名稱: ss.getName(),
    主資料庫ID: ss.getId(),
    分頁數: ss.getSheets().length,
    伺服器時間: 主檔_格式化時間(new Date())
  };
}


function 主檔_取得系統連線狀態() {
  var ss = 取得_智慧工廠主資料庫();

  var 正式派工表 = ss.getSheetByName(主檔分頁.派工單);
  var 任務池表 = ss.getSheetByName(主檔分頁.報工任務池);
  var 報工紀錄表 = ss.getSheetByName(主檔分頁.報工紀錄);
  var 草稿表 = ss.getSheetByName(主檔分頁.派工單草稿);
  var 待轉入表 = ss.getSheetByName(主檔分頁.派工單待轉入);

  return {
    成功: true,
    系統名稱: 後端入口設定.系統名稱,
    主資料庫名稱: ss.getName(),
    主資料庫ID: ss.getId(),
    派工單草稿筆數: 主檔_有效資料筆數(草稿表),
    派工單待轉入筆數: 主檔_有效資料筆數(待轉入表),
    正式派工筆數: 主檔_有效資料筆數(正式派工表),
    報工任務池筆數: 主檔_有效資料筆數(任務池表),
    報工紀錄筆數: 主檔_有效資料筆數(報工紀錄表),
    伺服器時間: 主檔_格式化時間(new Date())
  };
}


/* =========================================================
 * 七、初始化必要分頁
 * ========================================================= */

function 主檔_初始化必要分頁() {
  var ss = 取得_智慧工廠主資料庫();

  var 必要分頁表頭 = {};

  必要分頁表頭[主檔分頁.報工任務池] = 主檔_報工任務池表頭();
  必要分頁表頭[主檔分頁.報工紀錄] = 主檔_報工紀錄表頭();
  必要分頁表頭[主檔分頁.報工進度檢核] = 主檔_報工進度檢核表頭();
  必要分頁表頭[主檔分頁.報工API測試紀錄] = 主檔_報工API測試紀錄表頭();
  必要分頁表頭[主檔分頁.派工單] = 主檔_正式派工表頭();
  必要分頁表頭[主檔分頁.派工單轉入紀錄] = 主檔_派工單轉入紀錄表頭();
  必要分頁表頭[主檔分頁.LINE通知紀錄] = 主檔_LINE通知紀錄表頭();
  必要分頁表頭[主檔分頁.操作日誌] = 主檔_操作日誌表頭();

  Object.keys(必要分頁表頭).forEach(function(分頁名稱) {
    主檔_取得或建立分頁(ss, 分頁名稱, 必要分頁表頭[分頁名稱]);
  });

  主檔_寫入操作日誌('初始化必要分頁', '成功', '必要分頁與表頭已補齊', 'GAS 後端入口.gs');

  return {
    成功: true,
    訊息: '初始化完成：必要分頁與表頭已補齊',
    時間: 主檔_格式化時間(new Date())
  };
}


/* =========================================================
 * 八、通用分頁讀寫
 * ========================================================= */

function 主檔_讀取分頁資料(分頁名稱, 參數) {
  if (!分頁名稱) {
    return {
      成功: false,
      訊息: '缺少分頁名稱',
      資料: []
    };
  }

  // 2026-09-11｜智慧5S讀取修復 1.3.9.3。
  // 5S 寫入收據已固定正式主庫；讀取也必須連到同一庫，不受舊共用設定影響。
  // 外部傳入的編號只供一致性核對，不能用來切換至其他資料庫。
  var ss;
  var 智慧5S正式主庫ID;
  var 智慧5S分頁名稱 = String(分頁名稱).trim();
  if (智慧5S分頁名稱.indexOf('5S_') === 0) {
    智慧5S正式主庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
    var 讀取參數 = 參數 || {};
    ['spreadsheetId','試算表識別碼'].forEach(function(鍵) {
      if (讀取參數[鍵] !== undefined &&
          String(讀取參數[鍵]).trim() !== 智慧5S正式主庫ID) {
        throw new Error('智慧5S只能讀取指定的正式中央資料庫');
      }
    });
    ['sheet','sheetName','分頁','分頁名稱','工作表','工作表名稱'].forEach(function(鍵) {
      if (讀取參數[鍵] !== undefined &&
          String(讀取參數[鍵]).trim() !== 智慧5S分頁名稱) {
        throw new Error('智慧5S讀取分頁名稱參數不一致');
      }
    });
    分頁名稱 = 智慧5S分頁名稱;
    ss = SpreadsheetApp.openById(智慧5S正式主庫ID);
  } else {
    ss = 取得_智慧工廠主資料庫();
  }
  var sheet = ss.getSheetByName(分頁名稱);

  if (!sheet) {
    return {
      成功: false,
      訊息: '找不到分頁：' + 分頁名稱,
      分頁名稱: 分頁名稱,
      主庫ID: 智慧5S正式主庫ID,
      讀取版本: 智慧5S正式主庫ID ? '1.3.9.3' : undefined,
      資料: []
    };
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || lastCol <= 0) {
    return {
      成功: true,
      訊息: '分頁沒有資料',
      分頁名稱: 分頁名稱,
      主庫ID: 智慧5S正式主庫ID,
      讀取版本: 智慧5S正式主庫ID ? '1.3.9.3' : undefined,
      筆數: 0,
      資料: []
    };
  }

  var 筆數上限 = Number((參數 && (參數.筆數上限 || 參數.limit)) || 1000);
  var 讀取列數 = Math.min(lastRow, 筆數上限 + 1);

  var values = sheet.getRange(1, 1, 讀取列數, lastCol).getValues();
  var headers = values[0].map(function(h) {
    return String(h || '').trim();
  });

  var data = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join('').trim() === '') continue;
    if (row.join('').indexOf('#N/A') >= 0) continue;

    var obj = {};
    headers.forEach(function(h, idx) {
      if (h) obj[h] = 主檔_轉可輸出值(row[idx]);
    });
    data.push(obj);
  }

  return {
    成功: true,
    訊息: '讀取成功',
    分頁名稱: 分頁名稱,
    主庫ID: 智慧5S正式主庫ID,
    讀取版本: 智慧5S正式主庫ID ? '1.3.9.3' : undefined,
    筆數: data.length,
    資料: data
  };
}


function 主檔_新增分頁資料(分頁名稱, 資料) {
  if (!分頁名稱) {
    return {
      成功: false,
      訊息: '缺少分頁名稱'
    };
  }

  var ss = 取得_智慧工廠主資料庫();
  var sheet = ss.getSheetByName(分頁名稱);

  if (!sheet) {
    return {
      成功: false,
      訊息: '找不到分頁：' + 分頁名稱
    };
  }

  var 資料物件 = 主檔_解析資料物件(資料);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return String(h || '').trim();
  });

  var now = new Date();
  var row = headers.map(function(h) {
    if (h === '時間戳記' || h === '建立時間' || h === '最後更新時間' || h === '更新時間') {
      return 主檔_格式化時間(now);
    }
    return 資料物件[h] !== undefined ? 資料物件[h] : '';
  });

  sheet.appendRow(row);

  主檔_寫入操作日誌('新增分頁資料', '成功', '已新增資料到：' + 分頁名稱, 'GAS 後端入口.gs');

  return {
    成功: true,
    訊息: '新增成功',
    分頁名稱: 分頁名稱
  };
}


/* =========================================================
 * 九、報工初始化 / 儀表板
 * ========================================================= */

function API_取得報工初始化資料() {
  return 主檔_取得報工初始化資料();
}


function API_取得儀表板資料() {
  return 主檔_取得儀表板資料();
}


function API_送出報工(資料) {
  return 主檔_送出報工(資料);
}


function 主檔_取得報工初始化資料() {
  var ss = 取得_智慧工廠主資料庫();

  var 任務池表 = 主檔_取得或建立分頁(ss, 主檔分頁.報工任務池, 主檔_報工任務池表頭());
  var 任務資料 = 主檔_讀取物件列(任務池表);

  if (任務資料.length === 0) {
    var 正式表 = ss.getSheetByName(主檔分頁.派工單);
    if (主檔_有效資料筆數(正式表) > 0) {
      主檔_重建報工任務池(new Date());
      任務資料 = 主檔_讀取物件列(任務池表);
    }
  }

  var 可報工任務 = 任務資料.filter(function(r) {
    var 單號 = String(r['派工單號'] || '').trim();
    var 狀態 = String(r['報工狀態'] || '').trim();
    return 單號 && 狀態 !== '已完成' && 狀態 !== '完成';
  });

  return {
    成功: true,
    系統時間: 主檔_格式化時間(new Date()),
    任務清單: 可報工任務,
    統計: 主檔_取得儀表板資料().統計
  };
}


function 主檔_取得儀表板資料() {
  var ss = 取得_智慧工廠主資料庫();

  var 報工紀錄表 = ss.getSheetByName(主檔分頁.報工紀錄);
  var 任務池表 = ss.getSheetByName(主檔分頁.報工任務池);
  var 派工表 = ss.getSheetByName(主檔分頁.派工單);

  var 報工資料 = 報工紀錄表 ? 主檔_讀取物件列(報工紀錄表) : [];
  var 今日 = Utilities.formatDate(new Date(), 後端入口設定.時區, 'yyyy-MM-dd');

  var 今日良品 = 0;
  var 今日不良 = 0;
  var 今日報工筆數 = 0;

  報工資料.forEach(function(r) {
    var 日期 = 主檔_轉日期文字(r['報工日期']);
    if (日期 === 今日) {
      今日報工筆數++;
      今日良品 += 主檔_轉數字(r['良品數'], 0);
      今日不良 += 主檔_轉數字(r['不良數'], 0);
    }
  });

  return {
    成功: true,
    統計: {
      今日良品: 今日良品,
      今日不良: 今日不良,
      今日報工筆數: 今日報工筆數,
      今日總報工數: 今日良品 + 今日不良,
      可報工任務: 主檔_有效資料筆數(任務池表),
      正式派工: 主檔_有效資料筆數(派工表),
      報工紀錄: 主檔_有效資料筆數(報工紀錄表),
      系統時間: 主檔_格式化時間(new Date())
    }
  };
}


/* =========================================================
 * 十、報工送出 / 回寫正式派工
 * ========================================================= */

function 主檔_送出報工(資料) {
  var ss = 取得_智慧工廠主資料庫();
  var 報工表 = 主檔_取得或建立分頁(ss, 主檔分頁.報工紀錄, 主檔_報工紀錄表頭());
  var 測試表 = 主檔_取得或建立分頁(ss, 主檔分頁.報工API測試紀錄, 主檔_報工API測試紀錄表頭());

  var 資料物件 = 主檔_解析資料物件(資料);
  var now = new Date();

  var 派工單號 = String(主檔_取值(資料物件, ['派工單號']) || '').trim();
  var 報工任務ID = String(主檔_取值(資料物件, ['報工任務ID', '報工任務 ID']) || '').trim();
  var 員工編號 = String(主檔_取值(資料物件, ['員工編號', '工號', '操作員工號']) || '').trim();
  var 姓名 = String(主檔_取值(資料物件, ['姓名', '操作員姓名']) || '').trim();
  var 良品數 = 主檔_轉數字(主檔_取值(資料物件, ['良品數', '完成數量']), 0);
  var 不良數 = 主檔_轉數字(主檔_取值(資料物件, ['不良數', '不良數量']), 0);
  var 停機分鐘 = 主檔_轉數字(主檔_取值(資料物件, ['停機分鐘']), 0);

  if (!派工單號) return 主檔_報工失敗(測試表, 資料物件, '缺少派工單號');
  if (!報工任務ID) return 主檔_報工失敗(測試表, 資料物件, '缺少報工任務ID');
  if (!員工編號) return 主檔_報工失敗(測試表, 資料物件, '缺少員工編號');
  if (!姓名) return 主檔_報工失敗(測試表, 資料物件, '缺少姓名');
  if (良品數 + 不良數 <= 0) return 主檔_報工失敗(測試表, 資料物件, '良品數與不良數合計必須大於 0');

  var 報工ID = 'REP-' + Utilities.formatDate(now, 後端入口設定.時區, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  var 報工日期 = 主檔_取值(資料物件, ['報工日期']) || Utilities.formatDate(now, 後端入口設定.時區, 'yyyy-MM-dd');
  var 計畫數量 = 主檔_轉數字(主檔_取值(資料物件, ['計畫數量']), 0);
  var 本次總數 = 良品數 + 不良數;

  var row = [
    報工ID,
    主檔_格式化時間(now),
    報工日期,
    主檔_取值(資料物件, ['班別']),
    員工編號,
    姓名,
    主檔_取值(資料物件, ['產品編號']),
    主檔_取值(資料物件, ['品名']),
    主檔_取值(資料物件, ['工站名稱']),
    主檔_取值(資料物件, ['工序名稱']),
    主檔_取值(資料物件, ['機台編號']),
    良品數,
    不良數,
    停機分鐘,
    派工單號,
    報工任務ID,
    計畫數量,
    本次總數,
    '',
    '',
    '',
    '',
    主檔_取值(資料物件, ['報工來源']) || 'Web報工入口',
    '待回寫',
    主檔_取值(資料物件, ['備註']),
    主檔_格式化時間(now)
  ];

  報工表.appendRow(row);

  var 回寫結果 = 主檔_回寫正式派工進度(派工單號, 良品數, 不良數, now);
  主檔_重建報工任務池(now);

  主檔_寫入報工API測試紀錄(測試表, 資料物件, '成功', '已寫入報工紀錄：' + 報工ID);
  主檔_寫入操作日誌('送出報工', '成功', '報工ID：' + 報工ID, 'GAS 後端入口.gs');

  return {
    成功: true,
    訊息: '報工成功：' + 報工ID,
    報工ID: 報工ID,
    回寫結果: 回寫結果
  };
}


function 主檔_報工失敗(測試表, 資料物件, 訊息) {
  主檔_寫入報工API測試紀錄(測試表, 資料物件, '失敗', 訊息);
  return {
    成功: false,
    訊息: 訊息
  };
}


function 主檔_回寫正式派工進度(派工單號, 良品數, 不良數, now) {
  var ss = 取得_智慧工廠主資料庫();
  var sheet = 主檔_取得或建立分頁(ss, 主檔分頁.派工單, 主檔_正式派工表頭());

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      成功: false,
      訊息: '10_派工單沒有資料'
    };
  }

  var 欄位 = 主檔_取得欄位位置(sheet);
  var 單號欄 = 欄位['派工單號'];

  if (!單號欄) {
    return {
      成功: false,
      訊息: '10_派工單缺少欄位：派工單號'
    };
  }

  var 單號資料 = sheet.getRange(2, 單號欄, lastRow - 1, 1).getValues();

  for (var i = 0; i < 單號資料.length; i++) {
    if (String(單號資料[i][0]).trim() === String(派工單號).trim()) {
      var rowIndex = i + 2;

      var 計畫數量 = 主檔_轉數字(sheet.getRange(rowIndex, 欄位['計畫數量']).getValue(), 0);
      var 原良品 = 主檔_轉數字(sheet.getRange(rowIndex, 欄位['累計良品']).getValue(), 0);
      var 原不良 = 主檔_轉數字(sheet.getRange(rowIndex, 欄位['累計不良']).getValue(), 0);

      var 新良品 = 原良品 + 主檔_轉數字(良品數, 0);
      var 新不良 = 原不良 + 主檔_轉數字(不良數, 0);
      var 累計報工數 = 新良品 + 新不良;
      var 未完成數量 = Math.max(計畫數量 - 新良品, 0);
      var 達成率 = 計畫數量 > 0 ? 新良品 / 計畫數量 : '';
      var 報工狀態 = 計畫數量 > 0 && 新良品 >= 計畫數量 ? '已完成' : '報工中';

      主檔_安全寫入儲存格(sheet, rowIndex, 欄位, '累計良品', 新良品);
      主檔_安全寫入儲存格(sheet, rowIndex, 欄位, '累計不良', 新不良);
      主檔_安全寫入儲存格(sheet, rowIndex, 欄位, '累計報工數', 累計報工數);
      主檔_安全寫入儲存格(sheet, rowIndex, 欄位, '未完成數量', 未完成數量);
      主檔_安全寫入儲存格(sheet, rowIndex, 欄位, '達成率', 達成率);
      主檔_安全寫入儲存格(sheet, rowIndex, 欄位, '報工狀態', 報工狀態);
      主檔_安全寫入儲存格(sheet, rowIndex, 欄位, '報工回寫狀態', '已回寫 ' + 主檔_格式化時間(now));

      return {
        成功: true,
        訊息: '已回寫 10_派工單',
        報工狀態: 報工狀態,
        累計良品: 新良品,
        累計不良: 新不良,
        未完成數量: 未完成數量,
        達成率: 達成率
      };
    }
  }

  return {
    成功: false,
    訊息: '找不到派工單號：' + 派工單號
  };
}


/* =========================================================
 * 十一、建立測試派工 / 重建任務池
 * ========================================================= */

function 主檔_建立測試派工() {
  var ss = 取得_智慧工廠主資料庫();
  var sheet = 主檔_取得或建立分頁(ss, 主檔分頁.派工單, 主檔_正式派工表頭());
  var now = new Date();

  var 派工單號 = '正式派工-測試-' + Utilities.formatDate(now, 後端入口設定.時區, 'yyyyMMdd-HHmmss');

  sheet.appendRow([
    派工單號,
    '手動測試',
    Utilities.formatDate(now, 後端入口設定.時區, 'yyyy-MM-dd'),
    '早班',
    'ST003',
    'M/C加工',
    'A3區',
    'fhfi573',
    '黃嘉欣',
    100,
    8,
    '已轉正式',
    '正常',
    '未報工',
    '可報工',
    主檔_格式化時間(now),
    '系統測試',
    '正式派工',
    '測試批次',
    主檔_格式化時間(now),
    '正式派工',
    '測試資料，可刪除',
    0,
    0,
    0,
    100,
    0,
    '待回寫'
  ]);

  var 任務結果 = 主檔_重建報工任務池(now);

  主檔_寫入操作日誌('建立測試派工', '成功', 派工單號, 'GAS 後端入口.gs');

  return {
    成功: true,
    訊息: '已建立測試派工',
    派工單號: 派工單號,
    任務結果: 任務結果
  };
}


function 主檔_重建報工任務池(now) {
  var ss = 取得_智慧工廠主資料庫();
  var 派工表 = 主檔_取得或建立分頁(ss, 主檔分頁.派工單, 主檔_正式派工表頭());
  var 任務表 = 主檔_取得或建立分頁(ss, 主檔分頁.報工任務池, 主檔_報工任務池表頭());

  var 派工資料 = 主檔_讀取物件列(派工表);
  var 任務列 = [];

  派工資料.forEach(function(r) {
    var 派工單號 = String(r['派工單號'] || '').trim();
    if (!派工單號 || 派工單號.indexOf('#N/A') >= 0) return;

    var 正式狀態 = String(r['正式狀態'] || '').trim();
    var 報工狀態 = String(r['報工狀態'] || '').trim();

    if (正式狀態.indexOf('取消') >= 0) return;
    if (正式狀態.indexOf('作廢') >= 0) return;
    if (報工狀態 === '已完成' || 報工狀態 === '完成') return;

    任務列.push([
      'TASK-' + 派工單號,
      派工單號,
      r['派工日期'] || '',
      r['班別'] || '',
      r['工站代碼'] || '',
      r['工站名稱'] || '',
      r['區域'] || '',
      r['員工編號'] || '',
      r['操作員姓名'] || '',
      主檔_轉數字(r['計畫數量'], 0),
      主檔_轉數字(r['預估工時_小時'], 0),
      r['派工狀態'] || '已轉正式',
      r['風險等級'] || '正常',
      報工狀態 || '未報工',
      正式狀態 || '正式派工',
      '10_派工單',
      主檔_格式化時間(now || new Date())
    ]);
  });

  if (任務表.getLastRow() > 1) {
    任務表.getRange(2, 1, 任務表.getLastRow() - 1, 任務表.getMaxColumns()).clearContent();
  }

  if (任務列.length > 0) {
    任務表.getRange(2, 1, 任務列.length, 任務列[0].length).setValues(任務列);
  }

  主檔_寫入操作日誌('重建報工任務池', '成功', '任務數：' + 任務列.length, 'GAS 後端入口.gs');

  return {
    成功: true,
    訊息: '報工任務池重建完成',
    任務筆數: 任務列.length
  };
}


/* =========================================================
 * 十二、工具函數
 * ========================================================= */

function 主檔_取得或建立分頁(ss, 分頁名稱, 表頭) {
  var sheet = ss.getSheetByName(分頁名稱);

  if (!sheet) {
    sheet = ss.insertSheet(分頁名稱);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 表頭.length).setValues([表頭]);
  } else {
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h || '').trim();
    });

    var missingHeaders = 表頭.filter(function(h) {
      return currentHeaders.indexOf(h) === -1;
    });

    if (missingHeaders.length > 0) {
      sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    }
  }

  sheet.setFrozenRows(1);
  return sheet;
}


function 主檔_讀取物件列(sheet) {
  if (!sheet) return [];
  if (sheet.getLastRow() <= 1) return [];

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) {
    return String(h || '').trim();
  });

  var result = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var text = row.join('').trim();

    if (!text) continue;
    if (text.indexOf('#N/A') >= 0) continue;

    var obj = {};

    headers.forEach(function(h, idx) {
      if (h) obj[h] = row[idx];
    });

    result.push(obj);
  }

  return result;
}


function 主檔_有效資料筆數(sheet) {
  if (!sheet) return 0;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  var lastCol = Math.min(sheet.getLastColumn(), 5);
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

  return values.filter(function(row) {
    var text = row.join('').trim();
    return text !== '' && text.indexOf('#N/A') === -1;
  }).length;
}


function 主檔_取得欄位位置(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};

  headers.forEach(function(h, idx) {
    var name = String(h || '').trim();
    if (name) map[name] = idx + 1;
  });

  return map;
}


function 主檔_安全寫入儲存格(sheet, rowIndex, 欄位, 欄名, 值) {
  if (!欄位[欄名]) return;
  sheet.getRange(rowIndex, 欄位[欄名]).setValue(值);
}


function 主檔_取得參數(e) {
  var 參數 = {};

  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function(key) {
      參數[key] = e.parameter[key];
    });
  }

  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      Object.keys(body).forEach(function(key) {
        參數[key] = body[key];
      });
    } catch (錯誤) {
      參數.原始內容 = e.postData.contents;
    }
  }

  if (參數.資料 && typeof 參數.資料 === 'string') {
    try {
      參數.資料 = JSON.parse(參數.資料);
    } catch (錯誤2) {
      // 保留原本字串
    }
  }

  return 參數;
}


function 主檔_解析資料物件(資料) {
  if (!資料) return {};

  if (typeof 資料 === 'string') {
    try {
      return JSON.parse(資料);
    } catch (錯誤) {
      return {};
    }
  }

  if (typeof 資料 === 'object') {
    return 資料;
  }

  return {};
}


function 主檔_取值(obj, 欄位清單) {
  for (var i = 0; i < 欄位清單.length; i++) {
    var key = 欄位清單[i];

    if (
      obj[key] !== undefined &&
      obj[key] !== null &&
      String(obj[key]).trim() !== ''
    ) {
      return obj[key];
    }
  }

  return '';
}


function 主檔_轉數字(值, 預設值) {
  var n = Number(值);
  return isNaN(n) ? 預設值 : n;
}


function 主檔_格式化時間(date) {
  return Utilities.formatDate(date || new Date(), 後端入口設定.時區, 'yyyy-MM-dd HH:mm:ss');
}


function 主檔_轉日期文字(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 後端入口設定.時區, 'yyyy-MM-dd');
  }

  return String(value || '').slice(0, 10).replace(/\//g, '-');
}


function 主檔_轉可輸出值(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 後端入口設定.時區, 'yyyy-MM-dd HH:mm:ss');
  }

  return value;
}


function 主檔_JSON輸出(obj, 參數) {
  var callback = 參數 && (參數.callback || 參數.回呼) ? String(參數.callback || 參數.回呼) : '';
  var json = JSON.stringify(obj);

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}


/* =========================================================
 * 十三、日誌
 * ========================================================= */

function 主檔_寫入操作日誌(動作, 結果, 訊息, 來源) {
  try {
    var ss = 取得_智慧工廠主資料庫();
    var sheet = 主檔_取得或建立分頁(ss, 主檔分頁.操作日誌, 主檔_操作日誌表頭());

    sheet.appendRow([
      主檔_格式化時間(new Date()),
      動作,
      結果,
      訊息,
      來源 || 'GAS 後端入口.gs'
    ]);

  } catch (錯誤) {
    Logger.log('寫入操作日誌失敗：' + 錯誤);
  }
}


function 主檔_寫入報工API測試紀錄(sheet, 資料, 結果, 訊息) {
  try {
    sheet.appendRow([
      主檔_格式化時間(new Date()),
      資料.報工來源 || 'GAS',
      資料.派工單號 || '',
      資料.報工任務ID || 資料['報工任務 ID'] || '',
      資料.員工編號 || 資料.工號 || '',
      資料.姓名 || '',
      資料.工站名稱 || '',
      資料.良品數 || 0,
      資料.不良數 || 0,
      結果,
      訊息,
      JSON.stringify(資料)
    ]);
  } catch (錯誤) {
    Logger.log('寫入報工API測試紀錄失敗：' + 錯誤.message);
  }
}


/* =========================================================
 * 十四、報工入口 HTML
 * ========================================================= */

function 取得_主檔報工入口HTML() {
  var html = '';

  html += '<!DOCTYPE html>';
  html += '<html lang="zh-Hant">';
  html += '<head>';
  html += '<meta charset="UTF-8">';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
  html += '<title>智慧工廠報工入口</title>';

  html += '<style>';
  html += 'body{font-family:Arial,"Noto Sans TC",sans-serif;background:#eef3f8;margin:0;color:#0f2742;}';
  html += '.頁首{background:#0f4c81;color:white;padding:18px;}';
  html += '.頁首 h1{margin:0;font-size:22px;}';
  html += '.頁首 div{font-size:13px;margin-top:4px;opacity:.9;}';
  html += '.容器{max-width:980px;margin:auto;padding:14px;}';
  html += '.卡{background:white;border-radius:18px;padding:16px;margin:12px 0;box-shadow:0 8px 24px rgba(0,0,0,.08);}';
  html += '.列{display:grid;grid-template-columns:1fr 1fr;gap:10px;}';
  html += '.欄{margin:8px 0;}';
  html += 'label{display:block;font-weight:bold;margin-bottom:5px;}';
  html += 'input,textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:12px;padding:11px;font-size:16px;}';
  html += 'button{border:0;border-radius:14px;padding:12px 16px;font-weight:bold;font-size:16px;background:#0f4c81;color:white;margin:4px 0;cursor:pointer;}';
  html += '.次要{background:#64748b;}';
  html += '.成功{background:#10b981;}';
  html += '.危險{background:#ef4444;}';
  html += '.小字{font-size:13px;color:#64748b;}';
  html += '.數字{font-size:28px;font-weight:bold;color:#0f4c81;}';
  html += '.任務{border:1px solid #dbe4ee;border-radius:14px;padding:12px;margin:8px 0;background:#f8fafc;}';
  html += '.任務 b{font-size:16px;}';
  html += '.狀態{display:inline-block;padding:3px 8px;border-radius:999px;background:#e0f2fe;color:#0369a1;font-size:12px;margin-left:6px;}';
  html += '.錯誤{background:#fff1f2;border:1px solid #fecdd3;color:#991b1b;padding:10px;border-radius:12px;white-space:pre-wrap;}';
  html += '.成功訊息{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:10px;border-radius:12px;white-space:pre-wrap;}';
  html += '@media(max-width:700px){.列{grid-template-columns:1fr}.頁首 h1{font-size:19px}}';
  html += '</style>';

  html += '</head>';
  html += '<body>';

  html += '<div class="頁首">';
  html += '<h1>智慧工廠報工入口</h1>';
  html += '<div id="系統時間">載入中...</div>';
  html += '</div>';

  html += '<div class="容器">';

  html += '<div class="卡">';
  html += '<div class="列">';
  html += '<div><div class="小字">可報工任務</div><div id="任務數" class="數字">-</div></div>';
  html += '<div><div class="小字">今日良品 / 不良</div><div><span id="今日良品" class="數字">-</span> / <span id="今日不良" class="數字">-</span></div></div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="卡">';
  html += '<h2>選擇報工任務</h2>';
  html += '<div id="任務列表">載入中...</div>';
  html += '<button class="次要" onclick="載入資料()">重新整理</button>';
  html += '</div>';

  html += '<div class="卡">';
  html += '<h2>報工填寫</h2>';

  html += '<form id="報工表單" onsubmit="送出報工(); return false;">';
  html += '<div class="列">';

  html += '<div class="欄"><label>派工單號</label><input id="派工單號" required readonly></div>';
  html += '<div class="欄"><label>報工任務ID</label><input id="報工任務ID" required readonly></div>';
  html += '<div class="欄"><label>報工日期</label><input id="報工日期" type="date" required></div>';
  html += '<div class="欄"><label>班別</label><input id="班別" required></div>';
  html += '<div class="欄"><label>員工編號</label><input id="員工編號" required></div>';
  html += '<div class="欄"><label>姓名</label><input id="姓名" required></div>';
  html += '<div class="欄"><label>工站名稱</label><input id="工站名稱"></div>';
  html += '<div class="欄"><label>機台編號</label><input id="機台編號" placeholder="例如 #1064"></div>';
  html += '<div class="欄"><label>產品編號</label><input id="產品編號"></div>';
  html += '<div class="欄"><label>品名</label><input id="品名"></div>';
  html += '<div class="欄"><label>計畫數量</label><input id="計畫數量" type="number" readonly></div>';
  html += '<div class="欄"><label>良品數</label><input id="良品數" type="number" min="0" required></div>';
  html += '<div class="欄"><label>不良數</label><input id="不良數" type="number" min="0" value="0"></div>';
  html += '<div class="欄"><label>停機分鐘</label><input id="停機分鐘" type="number" min="0" value="0"></div>';

  html += '</div>';

  html += '<div class="欄"><label>備註</label><textarea id="備註" rows="3"></textarea></div>';
  html += '<button class="成功" type="submit">送出報工</button>';
  html += '</form>';

  html += '<p id="訊息" class="小字"></p>';
  html += '</div>';

  html += '</div>';

  html += '<script>';
  html += 'var 任務清單 = [];';

  html += 'function 今天日期(){';
  html += '  var d = new Date();';
  html += '  var y = d.getFullYear();';
  html += '  var m = String(d.getMonth()+1).padStart(2,"0");';
  html += '  var day = String(d.getDate()).padStart(2,"0");';
  html += '  return y + "-" + m + "-" + day;';
  html += '}';

  html += 'document.getElementById("報工日期").value = 今天日期();';

  html += 'function 載入資料(){';
  html += '  document.getElementById("任務列表").innerHTML = "載入中...";';
  html += '  document.getElementById("訊息").textContent = "";';
  html += '  google.script.run';
  html += '    .withSuccessHandler(渲染資料)';
  html += '    .withFailureHandler(顯示錯誤)';
  html += '    .主檔_取得報工初始化資料();';
  html += '}';

  html += 'function 渲染資料(res){';
  html += '  if(!res || !res.成功){';
  html += '    顯示錯誤(res && res.訊息 ? res.訊息 : "後端回傳失敗");';
  html += '    return;';
  html += '  }';

  html += '  任務清單 = res.任務清單 || [];';

  html += '  document.getElementById("系統時間").textContent = "系統時間：" + (res.系統時間 || "");';
  html += '  document.getElementById("任務數").textContent = 任務清單.length;';

  html += '  var 統計 = res.統計 || {};';
  html += '  document.getElementById("今日良品").textContent = 統計.今日良品 || 0;';
  html += '  document.getElementById("今日不良").textContent = 統計.今日不良 || 0;';

  html += '  var 內容 = "";';

  html += '  for(var i = 0; i < 任務清單.length; i++){';
  html += '    var r = 任務清單[i];';
  html += '    內容 += "<div class=\\"任務\\">";';
  html += '    內容 += "<b>" + 安全文字(r["工站名稱"]) + "｜" + 安全文字(r["操作員姓名"]) + "</b>";';
  html += '    內容 += "<span class=\\"狀態\\">" + 安全文字(r["報工狀態"]) + "</span>";';
  html += '    內容 += "<div class=\\"小字\\">";';
  html += '    內容 += "派工單號：" + 安全文字(r["派工單號"]);';
  html += '    內容 += "｜班別：" + 安全文字(r["班別"]);';
  html += '    內容 += "｜計畫：" + 安全文字(r["計畫數量"]);';
  html += '    內容 += "</div>";';
  html += '    內容 += "<button type=\\"button\\" onclick=\\"選擇任務(" + i + ")\\">選這筆</button>";';
  html += '    內容 += "</div>";';
  html += '  }';

  html += '  if(!內容){';
  html += '    內容 = "<div class=\\"任務\\">目前沒有可報工任務。請先執行：建立測試派工 → 重建報工任務池。</div>";';
  html += '  }';

  html += '  document.getElementById("任務列表").innerHTML = 內容;';
  html += '}';

  html += 'function 選擇任務(i){';
  html += '  var r = 任務清單[i];';
  html += '  document.getElementById("派工單號").value = r["派工單號"] || "";';
  html += '  document.getElementById("報工任務ID").value = r["報工任務ID"] || "";';
  html += '  document.getElementById("班別").value = r["班別"] || "";';
  html += '  document.getElementById("員工編號").value = r["員工編號"] || "";';
  html += '  document.getElementById("姓名").value = r["操作員姓名"] || "";';
  html += '  document.getElementById("工站名稱").value = r["工站名稱"] || "";';
  html += '  document.getElementById("計畫數量").value = r["計畫數量"] || "";';
  html += '  document.getElementById("訊息").className = "成功訊息";';
  html += '  document.getElementById("訊息").textContent = "已選擇：" + (r["派工單號"] || "");';
  html += '}';

  html += 'function 送出報工(){';
  html += '  var 欄位 = ["派工單號","報工任務ID","報工日期","班別","員工編號","姓名","工站名稱","機台編號","產品編號","品名","計畫數量","良品數","不良數","停機分鐘","備註"];';
  html += '  var data = {};';

  html += '  for(var i = 0; i < 欄位.length; i++){';
  html += '    var id = 欄位[i];';
  html += '    data[id] = document.getElementById(id).value;';
  html += '  }';

  html += '  document.getElementById("訊息").className = "小字";';
  html += '  document.getElementById("訊息").textContent = "送出中...";';

  html += '  google.script.run';
  html += '    .withSuccessHandler(function(r){';
  html += '      if(!r || !r.成功){';
  html += '        顯示錯誤(r && r.訊息 ? r.訊息 : "報工失敗");';
  html += '        return;';
  html += '      }';
  html += '      document.getElementById("訊息").className = "成功訊息";';
  html += '      document.getElementById("訊息").textContent = r.訊息 || "報工完成";';
  html += '      document.getElementById("良品數").value = "";';
  html += '      document.getElementById("不良數").value = "0";';
  html += '      document.getElementById("停機分鐘").value = "0";';
  html += '      載入資料();';
  html += '    })';
  html += '    .withFailureHandler(顯示錯誤)';
  html += '    .V2_送出報工(data);';
  html += '}';

  html += 'function 顯示錯誤(e){';
  html += '  var msg = "";';
  html += '  if(typeof e === "string"){ msg = e; }';
  html += '  else if(e && e.message){ msg = e.message; }';
  html += '  else { try{ msg = JSON.stringify(e); }catch(err){ msg = "未知錯誤"; } }';
  html += '  document.getElementById("訊息").className = "錯誤";';
  html += '  document.getElementById("訊息").textContent = "錯誤：" + msg;';
  html += '  document.getElementById("任務列表").innerHTML = "<div class=\\"錯誤\\">載入失敗：" + 安全文字(msg) + "</div>";';
  html += '}';

  html += 'function 安全文字(v){';
  html += '  if(v === null || v === undefined){ return ""; }';
  html += '  return String(v).replace(/[&<>]/g,function(s){';
  html += '    return {"&":"&amp;","<":"&lt;",">":"&gt;"}[s];';
  html += '  });';
  html += '}';

  html += '載入資料();';

  html += '</script>';

  html += '</body>';
  html += '</html>';

  return html;
}


/* =========================================================
 * 十五、表頭定義
 * ========================================================= */

function 主檔_正式派工表頭() {
  return [
    '派工單號',
    '來源草稿編號',
    '派工日期',
    '班別',
    '工站代碼',
    '工站名稱',
    '區域',
    '員工編號',
    '操作員姓名',
    '計畫數量',
    '預估工時_小時',
    '派工狀態',
    '風險等級',
    '報工狀態',
    '建議處置',
    '建立時間',
    '資料來源',
    '人工確認狀態',
    '正式轉入批次',
    '正式轉入時間',
    '正式狀態',
    '備註',
    '累計良品',
    '累計不良',
    '累計報工數',
    '未完成數量',
    '達成率',
    '報工回寫狀態'
  ];
}


function 主檔_報工任務池表頭() {
  return [
    '報工任務ID',
    '派工單號',
    '派工日期',
    '班別',
    '工站代碼',
    '工站名稱',
    '區域',
    '員工編號',
    '操作員姓名',
    '計畫數量',
    '預估工時_小時',
    '派工狀態',
    '風險等級',
    '報工狀態',
    '正式狀態',
    '來源資料',
    '最後更新時間'
  ];
}


function 主檔_報工紀錄表頭() {
  return [
    '報工ID',
    '時間戳記',
    '報工日期',
    '班別',
    '員工編號',
    '姓名',
    '產品編號',
    '品名',
    '工站名稱',
    '工序名稱',
    '機台編號',
    '良品數',
    '不良數',
    '停機分鐘',
    '派工單號',
    '報工任務ID',
    '計畫數量',
    '本次總數',
    '累計良品',
    '累計不良',
    '未完成數量',
    '達成率',
    '報工來源',
    '回寫狀態',
    '備註',
    '最後更新時間'
  ];
}


function 主檔_報工進度檢核表頭() {
  return [
    '檢核時間',
    '檢核項目',
    '結果',
    '筆數',
    '訊息',
    '處理批次'
  ];
}


function 主檔_報工API測試紀錄表頭() {
  return [
    '測試時間',
    '測試來源',
    '派工單號',
    '報工任務ID',
    '員工編號',
    '姓名',
    '工站名稱',
    '良品數',
    '不良數',
    '結果',
    '訊息',
    '原始JSON'
  ];
}


function 主檔_派工單轉入紀錄表頭() {
  return [
    '轉入批次',
    '轉入時間',
    '派工單草稿編號',
    '來源草稿編號',
    '派工日期',
    '班別',
    '工站代碼',
    '工站名稱',
    '區域',
    '員工編號',
    '操作員姓名',
    '需求總量',
    '預估工時_小時',
    '風險等級',
    '轉入狀態',
    '處理人員',
    '備註',
    '資料來源'
  ];
}


function 主檔_LINE通知紀錄表頭() {
  return [
    '時間戳記',
    '通知類型',
    '接收者',
    'LINE_USER_ID',
    '通知標題',
    '通知內容',
    '發送狀態',
    '回應碼'
  ];
}


function 主檔_操作日誌表頭() {
  return [
    '時間',
    '動作',
    '結果',
    '訊息',
    '來源'
  ];
}



/****************************************************
 * 修正補丁：Web 報工入口載入失敗
 * 原因：
 * 1. 任務池資料含日期物件，前端接收可能失敗
 * 2. 統一把所有回傳資料轉成可輸出的純文字/數字
 * 3. 強制回傳 {成功:true}
 ****************************************************/


function 主檔_取得報工初始化資料() {
  try {
    var ss = 取得_智慧工廠主資料庫();

    var 任務池表 = 主檔_取得或建立分頁(
      ss,
      主檔分頁.報工任務池,
      主檔_報工任務池表頭()
    );

    var 任務資料 = 主檔_讀取物件列_安全版(任務池表);

    if (任務資料.length === 0) {
      var 正式表 = ss.getSheetByName(主檔分頁.派工單);

      if (主檔_有效資料筆數(正式表) > 0) {
        主檔_重建報工任務池(new Date());
        任務資料 = 主檔_讀取物件列_安全版(任務池表);
      }
    }

    var 可報工任務 = 任務資料.filter(function(r) {
      var 派工單號 = String(r['派工單號'] || '').trim();
      var 報工狀態 = String(r['報工狀態'] || '').trim();

      if (!派工單號) return false;
      if (派工單號.indexOf('#N/A') >= 0) return false;
      if (報工狀態 === '已完成') return false;
      if (報工狀態 === '完成') return false;

      return true;
    });

    return {
      成功: true,
      訊息: '報工初始化資料讀取成功',
      系統時間: 主檔_格式化時間(new Date()),
      任務清單: 可報工任務,
      統計: 主檔_取得儀表板資料_安全版().統計
    };

  } catch (錯誤) {
    return {
      成功: false,
      訊息: '取得報工初始化資料失敗：' + 錯誤.message,
      任務清單: [],
      統計: {
        今日良品: 0,
        今日不良: 0,
        今日報工筆數: 0,
        今日總報工數: 0,
        可報工任務: 0,
        正式派工: 0,
        報工紀錄: 0
      }
    };
  }
}


function 主檔_取得儀表板資料() {
  return 主檔_取得儀表板資料_安全版();
}


function 主檔_取得儀表板資料_安全版() {
  try {
    var ss = 取得_智慧工廠主資料庫();

    var 報工紀錄表 = ss.getSheetByName(主檔分頁.報工紀錄);
    var 任務池表 = ss.getSheetByName(主檔分頁.報工任務池);
    var 派工表 = ss.getSheetByName(主檔分頁.派工單);

    var 報工資料 = 報工紀錄表 ? 主檔_讀取物件列_安全版(報工紀錄表) : [];
    var 今日 = Utilities.formatDate(new Date(), 後端入口設定.時區, 'yyyy-MM-dd');

    var 今日良品 = 0;
    var 今日不良 = 0;
    var 今日報工筆數 = 0;

    報工資料.forEach(function(r) {
      var 日期 = 主檔_轉日期文字(r['報工日期']);

      if (日期 === 今日) {
        今日報工筆數++;
        今日良品 += 主檔_轉數字(r['良品數'], 0);
        今日不良 += 主檔_轉數字(r['不良數'], 0);
      }
    });

    return {
      成功: true,
      統計: {
        今日良品: 今日良品,
        今日不良: 今日不良,
        今日報工筆數: 今日報工筆數,
        今日總報工數: 今日良品 + 今日不良,
        可報工任務: 主檔_有效資料筆數(任務池表),
        正式派工: 主檔_有效資料筆數(派工表),
        報工紀錄: 主檔_有效資料筆數(報工紀錄表),
        系統時間: 主檔_格式化時間(new Date())
      }
    };

  } catch (錯誤) {
    return {
      成功: false,
      訊息: 錯誤.message,
      統計: {
        今日良品: 0,
        今日不良: 0,
        今日報工筆數: 0,
        今日總報工數: 0,
        可報工任務: 0,
        正式派工: 0,
        報工紀錄: 0
      }
    };
  }
}


function 主檔_讀取物件列_安全版(sheet) {
  if (!sheet) return [];
  if (sheet.getLastRow() <= 1) return [];

  var values = sheet.getDataRange().getValues();

  if (!values || values.length <= 1) return [];

  var headers = values[0].map(function(h) {
    return String(h || '').trim();
  });

  var result = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var text = row.join('').trim();

    if (!text) continue;
    if (text.indexOf('#N/A') >= 0) continue;

    var obj = {};

    headers.forEach(function(h, idx) {
      if (!h) return;
      obj[h] = 主檔_轉可輸出值_安全版(row[idx]);
    });

    result.push(obj);
  }

  return result;
}


function 主檔_轉可輸出值_安全版(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 後端入口設定.時區, 'yyyy-MM-dd HH:mm:ss');
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return String(value);
}


/**
 * 手動測試用：確認 Web 入口會收到資料
 */
function 執行_測試報工初始化資料() {
  var 結果 = 主檔_取得報工初始化資料();
  Logger.log(JSON.stringify(結果, null, 2));
  return 結果;
}


/****************************************************
 * 修正補丁：報工紀錄 / 派工單資料寫到第 1000 列問題
 * 功能：
 * 1. 整理 09_報工紀錄，把有效報工資料搬回第 2 列開始
 * 2. 整理 10_派工單，把有效派工資料搬回第 2 列開始
 * 3. 之後寫入時用 A 欄第一個空白列，不再被 #REF / 公式影響
 ****************************************************/


function 執行_整理報工與派工資料位置() {
  var ss = 取得_智慧工廠主資料庫();

  var 報工結果 = 主檔_壓縮資料表_依主鍵(
    ss,
    '09_報工紀錄',
    主檔_報工紀錄表頭(),
    '報工ID'
  );

  var 派工結果 = 主檔_壓縮資料表_依主鍵(
    ss,
    '10_派工單',
    主檔_正式派工表頭(),
    '派工單號'
  );

  主檔_寫入操作日誌(
    '整理報工與派工資料位置',
    '成功',
    '報工保留 ' + 報工結果.保留筆數 + ' 筆，派工保留 ' + 派工結果.保留筆數 + ' 筆',
    '修正補丁'
  );

  Logger.log(JSON.stringify({
    成功: true,
    訊息: '整理完成',
    報工結果: 報工結果,
    派工結果: 派工結果
  }, null, 2));

  return {
    成功: true,
    訊息: '整理完成',
    報工結果: 報工結果,
    派工結果: 派工結果
  };
}


function 主檔_壓縮資料表_依主鍵(ss, 分頁名稱, 標準表頭, 主鍵欄名) {
  var sheet = 主檔_取得或建立分頁(ss, 分頁名稱, 標準表頭);

  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return {
      分頁名稱: 分頁名稱,
      保留筆數: 0,
      訊息: '沒有資料可整理'
    };
  }

  var 現有表頭 = values[0].map(function(h) {
    return String(h || '').trim();
  });

  var 主鍵索引 = 現有表頭.indexOf(主鍵欄名);
  if (主鍵索引 < 0) {
    throw new Error('找不到主鍵欄位：' + 主鍵欄名 + '，分頁：' + 分頁名稱);
  }

  var 有效列 = [];
  var 已出現主鍵 = {};

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var 主鍵值 = String(row[主鍵索引] || '').trim();

    if (!主鍵值) continue;
    if (主鍵值.indexOf('#N/A') >= 0) continue;
    if (主鍵值.indexOf('#REF') >= 0) continue;

    // 避免重複主鍵
    if (已出現主鍵[主鍵值]) continue;
    已出現主鍵[主鍵值] = true;

    var 新列 = [];

    標準表頭.forEach(function(欄名) {
      var idx = 現有表頭.indexOf(欄名);
      新列.push(idx >= 0 ? row[idx] : '');
    });

    有效列.push(新列);
  }

  // 清掉第 2 列以下所有內容，避免 #REF / 舊公式卡住 appendRow
  var 最大列 = Math.max(sheet.getMaxRows(), 2);
  var 最大欄 = Math.max(sheet.getMaxColumns(), 標準表頭.length);

  if (最大列 > 1) {
    sheet.getRange(2, 1, 最大列 - 1, 最大欄).clearContent();
  }

  // 重寫標準表頭
  sheet.getRange(1, 1, 1, 標準表頭.length).setValues([標準表頭]);

  // 把有效資料搬回第 2 列開始
  if (有效列.length > 0) {
    sheet.getRange(2, 1, 有效列.length, 標準表頭.length).setValues(有效列);
  }

  sheet.setFrozenRows(1);

  return {
    分頁名稱: 分頁名稱,
    保留筆數: 有效列.length,
    訊息: '已整理到第 2 列開始'
  };
}


function 主檔_找第一個空白列_依A欄(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 2);

  if (lastRow <= 1) return 2;

  var values = sheet.getRange(2, 1, Math.max(lastRow - 1, 1), 1).getValues();

  for (var i = 0; i < values.length; i++) {
    var v = String(values[i][0] || '').trim();
    if (!v) {
      return i + 2;
    }
  }

  return lastRow + 1;
}


/**
 * 覆蓋原本送出報工：改用第一個空白列寫入，不用 appendRow
 */
function 主檔_送出報工(資料) {
  var ss = 取得_智慧工廠主資料庫();
  var 報工表 = 主檔_取得或建立分頁(ss, 主檔分頁.報工紀錄, 主檔_報工紀錄表頭());
  var 測試表 = 主檔_取得或建立分頁(ss, 主檔分頁.報工API測試紀錄, 主檔_報工API測試紀錄表頭());

  var 資料物件 = 主檔_解析資料物件(資料);
  var now = new Date();

  var 派工單號 = String(主檔_取值(資料物件, ['派工單號']) || '').trim();
  var 報工任務ID = String(主檔_取值(資料物件, ['報工任務ID', '報工任務 ID']) || '').trim();
  var 員工編號 = String(主檔_取值(資料物件, ['員工編號', '工號', '操作員工號']) || '').trim();
  var 姓名 = String(主檔_取值(資料物件, ['姓名', '操作員姓名']) || '').trim();
  var 良品數 = 主檔_轉數字(主檔_取值(資料物件, ['良品數', '完成數量']), 0);
  var 不良數 = 主檔_轉數字(主檔_取值(資料物件, ['不良數', '不良數量']), 0);
  var 停機分鐘 = 主檔_轉數字(主檔_取值(資料物件, ['停機分鐘']), 0);

  if (!派工單號) return 主檔_報工失敗(測試表, 資料物件, '缺少派工單號');
  if (!報工任務ID) return 主檔_報工失敗(測試表, 資料物件, '缺少報工任務ID');
  if (!員工編號) return 主檔_報工失敗(測試表, 資料物件, '缺少員工編號');
  if (!姓名) return 主檔_報工失敗(測試表, 資料物件, '缺少姓名');
  if (良品數 + 不良數 <= 0) return 主檔_報工失敗(測試表, 資料物件, '良品數與不良數合計必須大於 0');

  var 報工ID = 'REP-' + Utilities.formatDate(now, 後端入口設定.時區, 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  var 報工日期 = 主檔_取值(資料物件, ['報工日期']) || Utilities.formatDate(now, 後端入口設定.時區, 'yyyy-MM-dd');
  var 計畫數量 = 主檔_轉數字(主檔_取值(資料物件, ['計畫數量']), 0);
  var 本次總數 = 良品數 + 不良數;

  var row = [
    報工ID,
    主檔_格式化時間(now),
    報工日期,
    主檔_取值(資料物件, ['班別']),
    員工編號,
    姓名,
    主檔_取值(資料物件, ['產品編號']),
    主檔_取值(資料物件, ['品名']),
    主檔_取值(資料物件, ['工站名稱']),
    主檔_取值(資料物件, ['工序名稱']),
    主檔_取值(資料物件, ['機台編號']),
    良品數,
    不良數,
    停機分鐘,
    派工單號,
    報工任務ID,
    計畫數量,
    本次總數,
    '',
    '',
    '',
    '',
    主檔_取值(資料物件, ['報工來源']) || 'Web報工入口',
    '待回寫',
    主檔_取值(資料物件, ['備註']),
    主檔_格式化時間(now)
  ];

  var 寫入列 = 主檔_找第一個空白列_依A欄(報工表);
 報工表.getRange(寫入列, 1, 1, row.length).setValues([row]);

  var 回寫結果 = 主檔_回寫正式派工進度(派工單號, 良品數, 不良數, now);
  主檔_重建報工任務池(now);

  主檔_寫入報工API測試紀錄(測試表, 資料物件, '成功', '已寫入報工紀錄：' + 報工ID + '，列號：' + 寫入列);
  主檔_寫入操作日誌('送出報工', '成功', '報工ID：' + 報工ID + '，列號：' + 寫入列, '修正補丁');

  return {
    成功: true,
    訊息: '報工成功：' + 報工ID,
    報工ID: 報工ID,
    寫入列: 寫入列,
    回寫結果: 回寫結果
  };
}


/**
 * 覆蓋原本建立測試派工：改用第一個空白列寫入，不用 appendRow
 */
function 主檔_建立測試派工() {
  var ss = 取得_智慧工廠主資料庫();
  var sheet = 主檔_取得或建立分頁(ss, 主檔分頁.派工單, 主檔_正式派工表頭());
  var now = new Date();

  var 派工單號 = '正式派工-測試-' + Utilities.formatDate(now, 後端入口設定.時區, 'yyyyMMdd-HHmmss');

  var row = [
    派工單號,
    '手動測試',
    Utilities.formatDate(now, 後端入口設定.時區, 'yyyy-MM-dd'),
    '早班',
    'ST003',
    'M/C加工',
    'A3區',
    'fhfi573',
    '黃嘉欣',
    100,
    8,
    '已轉正式',
    '正常',
    '未報工',
    '可報工',
    主檔_格式化時間(now),
    '系統測試',
    '正式派工',
    '測試批次',
    主檔_格式化時間(now),
    '正式派工',
    '測試資料，可刪除',
    0,
    0,
    0,
    100,
    0,
    '待回寫'
  ];

  var 寫入列 = 主檔_找第一個空白列_依A欄(sheet);
  sheet.getRange(寫入列, 1, 1, row.length).setValues([row]);

  var 任務結果 = 主檔_重建報工任務池(now);

  主檔_寫入操作日誌('建立測試派工', '成功', 派工單號 + '，列號：' + 寫入列, '修正補丁');

  return {
    成功: true,
    訊息: '已建立測試派工',
    派工單號: 派工單號,
    寫入列: 寫入列,
    任務結果: 任務結果
  };
}



/****************************************************
 * 智慧工廠｜試算表選單 + 側邊欄 + 一鍵測試補丁
 * 用途：
 * 1. 在 Google Sheets 上方建立「智慧工廠啟動」選單
 * 2. 可從選單執行健康檢查、初始化、建立測試派工、重建任務池
 * 3. 可一鍵自動測試：
 *    建立測試派工 → 報工 10 → 報工 90 → 確認完成 → 寫入測試紀錄
 * 4. 可開啟側邊欄控制台
 * 5. 可在試算表內開啟報工表單視窗
 ****************************************************/


/* =========================================================
 * 一、試算表上方選單
 * ========================================================= */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('智慧工廠啟動')
      .addItem('01_健康檢查', '選單_健康檢查')
      .addItem('02_初始化必要分頁', '選單_初始化必要分頁')
      .addItem('03_建立一筆測試派工', '選單_建立一筆測試派工')
      .addItem('04_重建報工任務池', '選單_重建報工任務池')
      .addSeparator()
      .addItem('05_一鍵自動測試報工閉環', '選單_一鍵自動測試報工閉環')
      .addItem('06_整理報工與派工資料位置', '選單_整理報工與派工資料位置')
      .addSeparator()
      .addItem('07_開啟智慧工廠側邊欄', '選單_開啟智慧工廠側邊欄')
      .addItem('08_開啟報工表單視窗', '選單_開啟報工表單視窗')
      .addItem('09_查看最近測試結果', '選單_查看最近測試結果')
      .addToUi();
  } catch (錯誤) {
    Logger.log('建立選單失敗：' + 錯誤.message);
  }
}


/* =========================================================
 * 二、選單包裝函數
 * ========================================================= */

function 選單_健康檢查() {
  var 結果 = 主檔_健康檢查();
  智慧工廠_顯示訊息_('健康檢查完成', 智慧工廠_格式化結果文字_(結果));
  return 結果;
}


function 選單_初始化必要分頁() {
  var 結果 = 主檔_初始化必要分頁();
  智慧工廠_顯示訊息_('初始化必要分頁完成', 智慧工廠_格式化結果文字_(結果));
  return 結果;
}


function 選單_建立一筆測試派工() {
  var 結果 = 主檔_建立測試派工();
  智慧工廠_顯示訊息_('建立測試派工完成', 智慧工廠_格式化結果文字_(結果));
  return 結果;
}


function 選單_重建報工任務池() {
  var 結果 = 主檔_重建報工任務池(new Date());
  智慧工廠_顯示訊息_('重建報工任務池完成', 智慧工廠_格式化結果文字_(結果));
  return 結果;
}


function 選單_整理報工與派工資料位置() {
  if (typeof 執行_整理報工與派工資料位置 === 'function') {
    var 結果 = 執行_整理報工與派工資料位置();
    智慧工廠_顯示訊息_('整理完成', 智慧工廠_格式化結果文字_(結果));
    return 結果;
  }

  var 回應 = {
    成功: false,
    訊息: '找不到函數：執行_整理報工與派工資料位置。請先確認整理補丁已貼上。'
  };

  智慧工廠_顯示訊息_('整理失敗', 智慧工廠_格式化結果文字_(回應));
  return 回應;
}


function 選單_一鍵自動測試報工閉環() {
  var 結果 = 執行_一鍵自動測試報工閉環();
  智慧工廠_顯示訊息_('一鍵測試完成', 智慧工廠_格式化結果文字_(結果));
  return 結果;
}


function 選單_開啟智慧工廠側邊欄() {
  var html = HtmlService
    .createHtmlOutput(取得_智慧工廠側邊欄HTML_())
    .setTitle('智慧工廠控制台');

  SpreadsheetApp.getUi().showSidebar(html);
}


function 選單_開啟報工表單視窗() {
  var html = HtmlService
    .createHtmlOutput(取得_主檔報工入口HTML())
    .setWidth(1100)
    .setHeight(760);

  SpreadsheetApp.getUi().showModalDialog(html, '智慧工廠報工入口');
}


function 選單_查看最近測試結果() {
  var 結果 = 取得_最近系統測試結果_();
  智慧工廠_顯示訊息_('最近測試結果', 智慧工廠_格式化結果文字_(結果));
  return 結果;
}


/* =========================================================
 * 三、一鍵自動測試報工閉環
 * ========================================================= */

function 執行_一鍵自動測試報工閉環() {
  var 開始時間 = new Date();
  var 測試批次 = 'AUTO-TEST-' + Utilities.formatDate(開始時間, 後端入口設定.時區, 'yyyyMMdd-HHmmss');

  var 測試結果 = {
    成功: false,
    測試批次: 測試批次,
    測試項目: '報工閉環自動測試',
    開始時間: 主檔_格式化時間(開始時間),
    步驟: [],
    最終判定: '',
    派工單號: '',
    報工任務ID: '',
    報工ID清單: []
  };

  try {
    // 1. 初始化必要分頁
    var 初始化結果 = 主檔_初始化必要分頁();
    智慧工廠_加入測試步驟_(測試結果, '初始化必要分頁', 初始化結果.成功, 初始化結果.訊息);

    // 2. 整理資料位置，避免寫到 1000 列
    if (typeof 執行_整理報工與派工資料位置 === 'function') {
      var 整理結果 = 執行_整理報工與派工資料位置();
      智慧工廠_加入測試步驟_(測試結果, '整理報工與派工資料位置', 整理結果.成功, 整理結果.訊息);
    } else {
      智慧工廠_加入測試步驟_(測試結果, '整理報工與派工資料位置', true, '未找到整理函數，略過');
    }

    // 3. 建立測試派工
    var 派工結果 = 主檔_建立測試派工();
    智慧工廠_加入測試步驟_(測試結果, '建立測試派工', 派工結果.成功, 派工結果.訊息);

    if (!派工結果.成功 || !派工結果.派工單號) {
      throw new Error('建立測試派工失敗');
    }

    測試結果.派工單號 = 派工結果.派工單號;

    // 4. 重建任務池
    var 任務池結果 = 主檔_重建報工任務池(new Date());
    智慧工廠_加入測試步驟_(測試結果, '重建報工任務池', 任務池結果.成功, 任務池結果.訊息);

    // 5. 找出剛剛建立的報工任務
    var 任務 = 智慧工廠_查詢報工任務_依派工單號_(測試結果.派工單號);

    if (!任務) {
      throw new Error('找不到剛建立的報工任務：' + 測試結果.派工單號);
    }

    測試結果.報工任務ID = 任務['報工任務ID'];

    智慧工廠_加入測試步驟_(
      測試結果,
      '查詢報工任務',
      true,
      '已找到任務：' + 測試結果.報工任務ID
    );

    // 6. 第一次報工 10
    var 第一次報工資料 = {
      派工單號: 測試結果.派工單號,
      報工任務ID: 測試結果.報工任務ID,
      報工日期: Utilities.formatDate(new Date(), 後端入口設定.時區, 'yyyy-MM-dd'),
      班別: 任務['班別'] || '早班',
      員工編號: 任務['員工編號'] || 'fhfi573',
      姓名: 任務['操作員姓名'] || '黃嘉欣',
      工站名稱: 任務['工站名稱'] || 'M/C加工',
      機台編號: 'AUTO-TEST-MACHINE',
      產品編號: 'AUTO-TEST-PART',
      品名: '自動測試產品',
      計畫數量: 100,
      良品數: 10,
      不良數: 0,
      停機分鐘: 0,
      備註: '一鍵自動測試：第一次報工 10'
    };

    var 第一次報工結果 = 主檔_送出報工(第一次報工資料);
    智慧工廠_加入測試步驟_(測試結果, '第一次報工 10', 第一次報工結果.成功, 第一次報工結果.訊息);

    if (!第一次報工結果.成功) {
      throw new Error('第一次報工失敗：' + 第一次報工結果.訊息);
    }

    測試結果.報工ID清單.push(第一次報工結果.報工ID || '');

    // 7. 第二次報工 90，完成
    var 第二次報工資料 = {
      派工單號: 測試結果.派工單號,
      報工任務ID: 測試結果.報工任務ID,
      報工日期: Utilities.formatDate(new Date(), 後端入口設定.時區, 'yyyy-MM-dd'),
      班別: 任務['班別'] || '早班',
      員工編號: 任務['員工編號'] || 'fhfi573',
      姓名: 任務['操作員姓名'] || '黃嘉欣',
      工站名稱: 任務['工站名稱'] || 'M/C加工',
      機台編號: 'AUTO-TEST-MACHINE',
      產品編號: 'AUTO-TEST-PART',
      品名: '自動測試產品',
      計畫數量: 100,
      良品數: 90,
      不良數: 0,
      停機分鐘: 0,
      備註: '一鍵自動測試：第二次報工 90，完成'
    };

    var 第二次報工結果 = 主檔_送出報工(第二次報工資料);
    智慧工廠_加入測試步驟_(測試結果, '第二次報工 90', 第二次報工結果.成功, 第二次報工結果.訊息);

    if (!第二次報工結果.成功) {
      throw new Error('第二次報工失敗：' + 第二次報工結果.訊息);
    }

    測試結果.報工ID清單.push(第二次報工結果.報工ID || '');

    // 8. 驗證派工單是否完成
    var 派工驗證 = 智慧工廠_驗證派工單完成狀態_(測試結果.派工單號);
    智慧工廠_加入測試步驟_(
      測試結果,
      '驗證派工完成狀態',
      派工驗證.成功,
      派工驗證.訊息
    );

    if (!派工驗證.成功) {
      throw new Error(派工驗證.訊息);
    }

    // 9. 驗證任務池是否移除完成任務
    var 任務仍存在 = 智慧工廠_查詢報工任務_依派工單號_(測試結果.派工單號);
    var 任務移除成功 = !任務仍存在;

    智慧工廠_加入測試步驟_(
      測試結果,
      '驗證任務池移除完成任務',
      任務移除成功,
      任務移除成功 ? '完成任務已從任務池移除' : '完成任務仍存在任務池'
    );

    if (!任務移除成功) {
      throw new Error('任務池尚未移除完成任務');
    }

    測試結果.成功 = true;
    測試結果.最終判定 = '通過';
    測試結果.結束時間 = 主檔_格式化時間(new Date());

    智慧工廠_寫入系統測試紀錄_(測試結果);

    return 測試結果;

  } catch (錯誤) {
    測試結果.成功 = false;
    測試結果.最終判定 = '失敗';
    測試結果.錯誤訊息 = 錯誤.message;
    測試結果.結束時間 = 主檔_格式化時間(new Date());

    智慧工廠_加入測試步驟_(測試結果, '測試中止', false, 錯誤.message);
    智慧工廠_寫入系統測試紀錄_(測試結果);

    return 測試結果;
  }
}


/* =========================================================
 * 四、測試輔助函數
 * ========================================================= */

function 智慧工廠_加入測試步驟_(測試結果, 步驟名稱, 成功, 訊息) {
  測試結果.步驟.push({
    時間: 主檔_格式化時間(new Date()),
    步驟名稱: 步驟名稱,
    成功: 成功 === true,
    訊息: 訊息 || ''
  });
}


function 智慧工廠_查詢報工任務_依派工單號_(派工單號) {
  var ss = 取得_智慧工廠主資料庫();
  var sheet = ss.getSheetByName(主檔分頁.報工任務池);

  if (!sheet) return null;

  var 資料 = 主檔_讀取物件列_安全版
    ? 主檔_讀取物件列_安全版(sheet)
    : 主檔_讀取物件列(sheet);

  for (var i = 0; i < 資料.length; i++) {
    if (String(資料[i]['派工單號'] || '').trim() === String(派工單號).trim()) {
      return 資料[i];
    }
  }

  return null;
}


function 智慧工廠_驗證派工單完成狀態_(派工單號) {
  var ss = 取得_智慧工廠主資料庫();
  var sheet = ss.getSheetByName(主檔分頁.派工單);

  if (!sheet) {
    return {
      成功: false,
      訊息: '找不到 10_派工單'
    };
  }

  var 資料 = 主檔_讀取物件列_安全版
    ? 主檔_讀取物件列_安全版(sheet)
    : 主檔_讀取物件列(sheet);

  for (var i = 0; i < 資料.length; i++) {
    var r = 資料[i];

    if (String(r['派工單號'] || '').trim() === String(派工單號).trim()) {
      var 累計良品 = Number(r['累計良品'] || 0);
      var 累計不良 = Number(r['累計不良'] || 0);
      var 累計報工數 = Number(r['累計報工數'] || 0);
      var 未完成數量 = Number(r['未完成數量'] || 0);
      var 報工狀態 = String(r['報工狀態'] || '');

      var 成功 =
        累計良品 >= 100 &&
        累計報工數 >= 100 &&
        未完成數量 === 0 &&
        報工狀態 === '已完成';

      return {
        成功: 成功,
        訊息:
          '累計良品=' + 累計良品 +
          '，累計不良=' + 累計不良 +
          '，累計報工數=' + 累計報工數 +
          '，未完成數量=' + 未完成數量 +
          '，報工狀態=' + 報工狀態
      };
    }
  }

  return {
    成功: false,
    訊息: '找不到派工單號：' + 派工單號
  };
}


/* =========================================================
 * 五、系統測試紀錄
 * ========================================================= */

function 智慧工廠_取得或建立系統測試紀錄表_() {
  var ss = 取得_智慧工廠主資料庫();
  var 分頁名稱 = '99_系統測試紀錄';
  var 表頭 = [
    '測試時間',
    '測試批次',
    '測試項目',
    '最終判定',
    '派工單號',
    '報工任務ID',
    '報工ID清單',
    '步驟數',
    '成功步驟數',
    '失敗步驟數',
    '錯誤訊息',
    '完整JSON'
  ];

  return 主檔_取得或建立分頁(ss, 分頁名稱, 表頭);
}


function 智慧工廠_寫入系統測試紀錄_(測試結果) {
  var sheet = 智慧工廠_取得或建立系統測試紀錄表_();

  var 成功步驟數 = 測試結果.步驟.filter(function(s) {
    return s.成功 === true;
  }).length;

  var 失敗步驟數 = 測試結果.步驟.length - 成功步驟數;

  var row = [
    主檔_格式化時間(new Date()),
    測試結果.測試批次 || '',
    測試結果.測試項目 || '',
    測試結果.最終判定 || '',
    測試結果.派工單號 || '',
    測試結果.報工任務ID || '',
    (測試結果.報工ID清單 || []).join(' / '),
    測試結果.步驟.length,
    成功步驟數,
    失敗步驟數,
    測試結果.錯誤訊息 || '',
    JSON.stringify(測試結果)
  ];

  var 寫入列 = 主檔_找第一個空白列_依A欄
    ? 主檔_找第一個空白列_依A欄(sheet)
    : sheet.getLastRow() + 1;

  sheet.getRange(寫入列, 1, 1, row.length).setValues([row]);

  return {
    成功: true,
    寫入列: 寫入列
  };
}


function 取得_最近系統測試結果_() {
  var sheet = 智慧工廠_取得或建立系統測試紀錄表_();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      成功: false,
      訊息: '目前沒有測試紀錄'
    };
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  var obj = {};
  headers.forEach(function(h, i) {
    if (h) obj[h] = values[i];
  });

  return {
    成功: true,
    最近測試: obj
  };
}


/* =========================================================
 * 六、側邊欄控制台
 * ========================================================= */

function 取得_智慧工廠側邊欄HTML_() {
  var html = '';

  html += '<!DOCTYPE html>';
  html += '<html lang="zh-Hant">';
  html += '<head>';
  html += '<meta charset="UTF-8">';
  html += '<style>';
  html += 'body{font-family:Arial,"Noto Sans TC",sans-serif;padding:12px;background:#f1f5f9;color:#0f172a;}';
  html += 'h2{margin:0 0 10px;font-size:18px;color:#0f4c81;}';
  html += '.卡{background:white;border-radius:14px;padding:12px;margin:10px 0;box-shadow:0 4px 16px rgba(0,0,0,.08);}';
  html += 'button{width:100%;border:0;border-radius:12px;padding:10px;margin:5px 0;background:#0f4c81;color:white;font-weight:bold;cursor:pointer;}';
  html += '.灰{background:#64748b;}';
  html += '.綠{background:#10b981;}';
  html += '.橘{background:#f59e0b;}';
  html += 'pre{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:10px;padding:10px;font-size:12px;max-height:260px;overflow:auto;}';
  html += '.小字{font-size:12px;color:#64748b;}';
  html += '</style>';
  html += '</head>';
  html += '<body>';
  html += '<h2>智慧工廠控制台</h2>';
  html += '<div class="小字">從這裡直接測試主檔、報工、任務池。</div>';

  html += '<div class="卡">';
  html += '<button onclick="執行函數(\'執行_健康檢查\')">健康檢查</button>';
  html += '<button onclick="執行函數(\'執行_初始化必要分頁\')">初始化必要分頁</button>';
  html += '<button onclick="執行函數(\'執行_重建報工任務池\')">重建報工任務池</button>';
  html += '</div>';

  html += '<div class="卡">';
  html += '<button class="綠" onclick="執行函數(\'執行_一鍵自動測試報工閉環\')">一鍵自動測試報工閉環</button>';
  html += '<button class="橘" onclick="執行函數(\'執行_整理報工與派工資料位置\')">整理報工與派工資料位置</button>';
  html += '<button class="灰" onclick="執行函數(\'取得_最近系統測試結果_\')">查看最近測試結果</button>';
  html += '</div>';

  html += '<div class="卡">';
  html += '<button onclick="google.script.run.選單_開啟報工表單視窗()">開啟報工表單視窗</button>';
  html += '</div>';

  html += '<div class="卡">';
  html += '<b>執行結果</b>';
  html += '<pre id="結果">尚未執行</pre>';
  html += '</div>';

  html += '<script>';
  html += 'function 顯示(obj){document.getElementById("結果").textContent=JSON.stringify(obj,null,2);}';
  html += 'function 失敗(e){document.getElementById("結果").textContent="錯誤："+(e.message||e);}';
  html += 'function 執行函數(fn){';
  html += '  document.getElementById("結果").textContent="執行中："+fn;';
  html += '  google.script.run.withSuccessHandler(顯示).withFailureHandler(失敗)[fn]();';
  html += '}';
  html += '</script>';

  html += '</body>';
  html += '</html>';

  return html;
}


/* =========================================================
 * 七、顯示工具
 * ========================================================= */

function 智慧工廠_顯示訊息_(標題, 內容) {
  try {
    SpreadsheetApp.getUi().alert(標題 + '\n\n' + 內容);
  } catch (錯誤) {
    Logger.log(標題 + '\n\n' + 內容);
  }
}


function 智慧工廠_格式化結果文字_(結果) {
  try {
    return JSON.stringify(結果, null, 2);
  } catch (錯誤) {
    return String(結果);
  }
}


/****************************************************
 * 智慧工廠完整測試中心 V1.0
 * 貼到：GAS 後端入口.gs 最下面
 *
 * 功能：
 * 1. 在試算表上方建立「智慧工廠測試中心」選單
 * 2. 一鍵完整測試整套報工系統
 * 3. 測試結果寫入：
 *    - 99_測試總報告
 *    - 99_系統測試紀錄
 * 4. 測試項目包含：
 *    - 主檔連線
 *    - 必要分頁
 *    - 表頭欄位
 *    - #REF / 寫入位置
 *    - Web 初始化資料
 *    - 報工閉環
 *    - 異常防呆
 *    - 測試/正式資料分流檢查
 ****************************************************/


/* =========================================================
 * 一、上方選單
 * ========================================================= */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('智慧工廠測試中心')
      .addItem('01_一鍵完整系統測試', '執行_一鍵完整系統測試')
      .addSeparator()
      .addItem('02_測試主檔連線', '執行_測試主檔連線')
      .addItem('03_測試必要分頁與表頭', '執行_測試必要分頁與表頭')
      .addItem('04_測試資料位置與錯誤值', '執行_測試資料位置與錯誤值')
      .addItem('05_測試報工閉環', '執行_測試報工閉環')
      .addItem('06_測試異常防呆', '執行_測試異常防呆')
      .addItem('07_測試 Web 初始化資料', '執行_測試Web初始化資料')
      .addItem('08_測試正式與測試分流', '執行_測試正式與測試分流')
      .addSeparator()
      .addItem('09_開啟測試控制台側邊欄', '執行_開啟測試控制台側邊欄')
      .addItem('10_查看最近測試結果', '執行_查看最近測試結果')
      .addToUi();

    SpreadsheetApp.getUi()
      .createMenu('智慧工廠啟動')
      .addItem('健康檢查', '執行_健康檢查')
      .addItem('初始化必要分頁', '執行_初始化必要分頁')
      .addItem('重建報工任務池', '執行_重建報工任務池')
      .addItem('開啟報工表單視窗', '測試中心_開啟報工表單視窗')
      .addToUi();

  } catch (錯誤) {
    Logger.log('建立選單失敗：' + 錯誤.message);
  }
}


/* =========================================================
 * 二、手動選單入口
 * ========================================================= */

function 執行_一鍵完整系統測試() {
  var 結果 = 測試中心_一鍵完整系統測試_();
  測試中心_顯示訊息_('一鍵完整系統測試完成', 測試中心_格式化結果文字_(結果));
  return 結果;
}

function 執行_測試主檔連線() {
  var 測試批次 = 測試中心_產生批次_('DB');
  var 結果 = 測試中心_測試主檔連線_(測試批次);
  測試中心_寫入測試總報告_([結果]);
  測試中心_顯示訊息_('測試主檔連線完成', 測試中心_格式化結果文字_(結果));
  return 結果;
}

function 執行_測試必要分頁與表頭() {
  var 測試批次 = 測試中心_產生批次_('HEADER');
  var 結果清單 = 測試中心_測試必要分頁與表頭_(測試批次);
  測試中心_寫入測試總報告_(結果清單);
  測試中心_顯示訊息_('測試必要分頁與表頭完成', 測試中心_格式化結果文字_(測試中心_彙總測試結果_(測試批次, 結果清單)));
  return 測試中心_彙總測試結果_(測試批次, 結果清單);
}

function 執行_測試資料位置與錯誤值() {
  var 測試批次 = 測試中心_產生批次_('DATA');
  var 結果清單 = 測試中心_測試資料位置與錯誤值_(測試批次);
  測試中心_寫入測試總報告_(結果清單);
  測試中心_顯示訊息_('測試資料位置與錯誤值完成', 測試中心_格式化結果文字_(測試中心_彙總測試結果_(測試批次, 結果清單)));
  return 測試中心_彙總測試結果_(測試批次, 結果清單);
}

function 執行_測試報工閉環() {
  var 測試批次 = 測試中心_產生批次_('REPORT');
  var 結果清單 = 測試中心_測試報工閉環_(測試批次);
  測試中心_寫入測試總報告_(結果清單);
  測試中心_顯示訊息_('測試報工閉環完成', 測試中心_格式化結果文字_(測試中心_彙總測試結果_(測試批次, 結果清單)));
  return 測試中心_彙總測試結果_(測試批次, 結果清單);
}

function 執行_測試異常防呆() {
  var 測試批次 = 測試中心_產生批次_('GUARD');
  var 結果清單 = 測試中心_測試異常防呆_(測試批次);
  測試中心_寫入測試總報告_(結果清單);
  測試中心_顯示訊息_('測試異常防呆完成', 測試中心_格式化結果文字_(測試中心_彙總測試結果_(測試批次, 結果清單)));
  return 測試中心_彙總測試結果_(測試批次, 結果清單);
}

function 執行_測試Web初始化資料() {
  var 測試批次 = 測試中心_產生批次_('WEB');
  var 結果清單 = 測試中心_測試Web初始化資料_(測試批次);
  測試中心_寫入測試總報告_(結果清單);
  測試中心_顯示訊息_('測試 Web 初始化資料完成', 測試中心_格式化結果文字_(測試中心_彙總測試結果_(測試批次, 結果清單)));
  return 測試中心_彙總測試結果_(測試批次, 結果清單);
}

function 執行_測試正式與測試分流() {
  var 測試批次 = 測試中心_產生批次_('MODE');
  var 結果清單 = 測試中心_測試正式與測試分流_(測試批次);
  測試中心_寫入測試總報告_(結果清單);
  測試中心_顯示訊息_('測試正式與測試分流完成', 測試中心_格式化結果文字_(測試中心_彙總測試結果_(測試批次, 結果清單)));
  return 測試中心_彙總測試結果_(測試批次, 結果清單);
}

function 執行_查看最近測試結果() {
  var 結果 = 測試中心_取得最近測試結果_();
  測試中心_顯示訊息_('最近測試結果', 測試中心_格式化結果文字_(結果));
  return 結果;
}


/* =========================================================
 * 三、一鍵完整系統測試
 * ========================================================= */

function 測試中心_一鍵完整系統測試_() {
  var lock = LockService.getScriptLock();
  var 已鎖定 = lock.tryLock(30000);

  if (!已鎖定) {
    return {
      成功: false,
      訊息: '目前已有測試正在執行，請稍後再試。'
    };
  }

  var 測試批次 = 測試中心_產生批次_('FULL');
  var 全部結果 = [];

  try {
    全部結果.push(測試中心_測試主檔連線_(測試批次));

    var 初始化結果 = 測試中心_安全執行_(
      測試批次,
      '初始化',
      '初始化必要分頁',
      '必要分頁與表頭可建立',
      function() {
        if (typeof 主檔_初始化必要分頁 !== 'function') {
          throw new Error('找不到主檔_初始化必要分頁');
        }
        var r = 主檔_初始化必要分頁();
        return {
          通過: r && r.成功 === true,
          實際結果: r && r.訊息 ? r.訊息 : JSON.stringify(r),
          修正建議: r && r.成功 ? '' : '檢查主檔_初始化必要分頁。'
        };
      }
    );
    全部結果.push(初始化結果);

    全部結果 = 全部結果.concat(測試中心_測試必要分頁與表頭_(測試批次));
    全部結果 = 全部結果.concat(測試中心_測試資料位置與錯誤值_(測試批次));
    全部結果 = 全部結果.concat(測試中心_測試Web初始化資料_(測試批次));
    全部結果 = 全部結果.concat(測試中心_測試報工閉環_(測試批次));
    全部結果 = 全部結果.concat(測試中心_測試異常防呆_(測試批次));
    全部結果 = 全部結果.concat(測試中心_測試正式與測試分流_(測試批次));

    測試中心_寫入測試總報告_(全部結果);

    var 彙總 = 測試中心_彙總測試結果_(測試批次, 全部結果);
    測試中心_寫入系統測試紀錄_(彙總, 全部結果);

    return 彙總;

  } catch (錯誤) {
    var 失敗結果 = 測試中心_建立結果_(
      測試批次,
      '系統',
      '一鍵完整系統測試',
      '完整測試可執行完畢',
      '測試中止：' + 錯誤.message,
      '失敗',
      錯誤.message,
      '先修正錯誤後再重新測試。'
    );

    全部結果.push(失敗結果);
    測試中心_寫入測試總報告_(全部結果);

    var 彙總失敗 = 測試中心_彙總測試結果_(測試批次, 全部結果);
    測試中心_寫入系統測試紀錄_(彙總失敗, 全部結果);

    return 彙總失敗;

  } finally {
    lock.releaseLock();
  }
}


/* =========================================================
 * 四、主檔連線測試
 * ========================================================= */

function 測試中心_測試主檔連線_(測試批次) {
  return 測試中心_安全執行_(
    測試批次,
    '主檔連線',
    '確認正式主資料庫',
    '主資料庫可開啟，且 ID 正確',
    function() {
      if (typeof 取得_智慧工廠主資料庫 !== 'function') {
        throw new Error('找不到 取得_智慧工廠主資料庫');
      }

      var ss = 取得_智慧工廠主資料庫();
      var 名稱 = ss.getName();
      var id = ss.getId();

      var 期望ID = '1RCTepxN0PMDwJp5HMBEQtVl6R6ynUP4UVaVPcPhFoq0';
      var 通過 = id === 期望ID;

      return {
        通過: 通過,
        實際結果: '主資料庫=' + 名稱 + '，ID=' + id + '，分頁數=' + ss.getSheets().length,
        修正建議: 通過 ? '' : '目前連到的不是正式主檔，請檢查主資料庫ID。'
      };
    }
  );
}


/* =========================================================
 * 五、必要分頁與表頭測試
 * ========================================================= */

function 測試中心_測試必要分頁與表頭_(測試批次) {
  var 結果清單 = [];
  var ss = 取得_智慧工廠主資料庫();

  var 必要表 = {
    '09_報工紀錄': 測試中心_取得標準表頭_('09_報工紀錄'),
    '09_報工任務池': 測試中心_取得標準表頭_('09_報工任務池'),
    '09_報工進度檢核': 測試中心_取得標準表頭_('09_報工進度檢核'),
    '09_報工API測試紀錄': 測試中心_取得標準表頭_('09_報工API測試紀錄'),
    '10_派工單': 測試中心_取得標準表頭_('10_派工單'),
    '10_派工單轉入紀錄': 測試中心_取得標準表頭_('10_派工單轉入紀錄'),
    '99_操作日誌': 測試中心_取得標準表頭_('99_操作日誌'),
    '99_系統測試紀錄': 測試中心_取得標準表頭_('99_系統測試紀錄'),
    '99_測試總報告': 測試中心_取得標準表頭_('99_測試總報告')
  };

  Object.keys(必要表).forEach(function(分頁名稱) {
    var 標準表頭 = 必要表[分頁名稱];

    var result = 測試中心_安全執行_(
      測試批次,
      '資料表結構',
      '檢查分頁與表頭：' + 分頁名稱,
      '分頁存在，必要欄位完整',
      function() {
        var sheet = ss.getSheetByName(分頁名稱);

        if (!sheet) {
          return {
            通過: false,
            實際結果: '找不到分頁：' + 分頁名稱,
            修正建議: '執行初始化必要分頁。'
          };
        }

        var 現有表頭 = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function(h) {
          return String(h || '').trim();
        });

        var 缺少欄位 = 標準表頭.filter(function(h) {
          return 現有表頭.indexOf(h) === -1;
        });

        return {
          通過: 缺少欄位.length === 0,
          實際結果: 缺少欄位.length === 0 ? '欄位完整' : '缺少欄位：' + 缺少欄位.join('、'),
          修正建議: 缺少欄位.length === 0 ? '' : '執行初始化必要分頁，或補上缺少欄位。'
        };
      }
    );

    結果清單.push(result);
  });

  return 結果清單;
}


/* =========================================================
 * 六、資料位置與錯誤值測試
 * ========================================================= */

function 測試中心_測試資料位置與錯誤值_(測試批次) {
  var 結果清單 = [];
  var ss = 取得_智慧工廠主資料庫();

  var 檢查分頁 = [
    '09_報工紀錄',
    '09_報工任務池',
    '10_派工單',
    '09_報工API測試紀錄',
    '99_操作日誌',
    '99_系統測試紀錄'
  ];

  檢查分頁.forEach(function(分頁名稱) {
    var result = 測試中心_安全執行_(
      測試批次,
      '資料品質',
      '檢查 #REF 與資料位置：' + 分頁名稱,
      '沒有 #REF，主鍵資料從第 2 列開始連續寫入',
      function() {
        var sheet = ss.getSheetByName(分頁名稱);

        if (!sheet) {
          return {
            通過: false,
            實際結果: '找不到分頁',
            修正建議: '執行初始化必要分頁。'
          };
        }

        var values = sheet.getDataRange().getDisplayValues();
        var refCount = 0;

        for (var r = 0; r < values.length; r++) {
          for (var c = 0; c < values[r].length; c++) {
            var text = String(values[r][c] || '');
            if (text.indexOf('#REF') >= 0 || text.indexOf('#N/A') >= 0) {
              refCount++;
            }
          }
        }

        var 第一筆資料列 = 測試中心_找第一筆A欄資料列_(sheet);
        var 通過 = refCount === 0;

        return {
          通過: 通過,
          實際結果: '錯誤儲存格=' + refCount + '，第一筆資料列=' + 第一筆資料列,
          修正建議: 通過 ? '' : '執行整理報工與派工資料位置，或清除 #REF / #N/A。'
        };
      }
    );

    結果清單.push(result);
  });

  return 結果清單;
}


/* =========================================================
 * 七、Web 初始化資料測試
 * ========================================================= */

function 測試中心_測試Web初始化資料_(測試批次) {
  var 結果清單 = [];

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      'Web入口',
      '取得報工初始化資料',
      '後端回傳 成功=true，且包含 任務清單 / 統計',
      function() {
        if (typeof 主檔_取得報工初始化資料 !== 'function') {
          throw new Error('找不到 主檔_取得報工初始化資料');
        }

        var res = 主檔_取得報工初始化資料();
        var ok = res && res.成功 === true && res.任務清單 !== undefined && res.統計 !== undefined;

        return {
          通過: ok,
          實際結果: ok ? '任務數=' + res.任務清單.length + '，今日良品=' + res.統計.今日良品 : JSON.stringify(res),
          修正建議: ok ? '' : '檢查主檔_取得報工初始化資料與任務池資料。'
        };
      }
    )
  );

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      'Web入口',
      '取得報工 HTML',
      'HTML 內容包含 智慧工廠報工入口',
      function() {
        if (typeof 取得_主檔報工入口HTML !== 'function') {
          throw new Error('找不到 取得_主檔報工入口HTML');
        }

        var html = 取得_主檔報工入口HTML();
        var ok = String(html || '').indexOf('智慧工廠報工入口') >= 0;

        return {
          通過: ok,
          實際結果: ok ? 'HTML 可產生，長度=' + html.length : 'HTML 內容異常',
          修正建議: ok ? '' : '檢查 取得_主檔報工入口HTML。'
        };
      }
    )
  );

  return 結果清單;
}


/* =========================================================
 * 八、報工閉環測試
 * ========================================================= */

function 測試中心_測試報工閉環_(測試批次) {
  var 結果清單 = [];
  var 測試資料 = {
    派工單號: '',
    報工任務ID: '',
    報工ID清單: []
  };

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      '報工閉環',
      '建立測試派工',
      '可建立一筆測試派工',
      function() {
        if (typeof 主檔_建立測試派工 !== 'function') {
          throw new Error('找不到 主檔_建立測試派工');
        }

        var r = 主檔_建立測試派工();
        測試資料.派工單號 = r.派工單號;

        return {
          通過: r && r.成功 === true && !!r.派工單號,
          實際結果: JSON.stringify(r),
          修正建議: r && r.成功 ? '' : '檢查主檔_建立測試派工。'
        };
      }
    )
  );

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      '報工閉環',
      '重建報工任務池',
      '可由 10_派工單 重建 09_報工任務池',
      function() {
        var r = 主檔_重建報工任務池(new Date());
        return {
          通過: r && r.成功 === true,
          實際結果: JSON.stringify(r),
          修正建議: r && r.成功 ? '' : '檢查主檔_重建報工任務池。'
        };
      }
    )
  );

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      '報工閉環',
      '查詢剛建立的報工任務',
      '任務池可找到剛建立的派工單',
      function() {
        var 任務 = 測試中心_查詢報工任務_依派工單號_(測試資料.派工單號);

        if (任務) {
          測試資料.報工任務ID = 任務['報工任務ID'];
        }

        return {
          通過: !!任務,
          實際結果: 任務 ? '任務ID=' + 測試資料.報工任務ID : '找不到任務',
          修正建議: 任務 ? '' : '檢查 09_報工任務池。'
        };
      }
    )
  );

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      '報工閉環',
      '第一次報工 10',
      '可寫入報工紀錄並回寫派工',
      function() {
        var data = 測試中心_建立報工測試資料_(測試資料.派工單號, 測試資料.報工任務ID, 10, 0, '完整測試：第一次報工 10');
        var r = 主檔_送出報工(data);

        if (r && r.報工ID) {
          測試資料.報工ID清單.push(r.報工ID);
        }

        return {
          通過: r && r.成功 === true,
          實際結果: JSON.stringify(r),
          修正建議: r && r.成功 ? '' : '檢查主檔_送出報工。'
        };
      }
    )
  );

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      '報工閉環',
      '第二次報工 90',
      '第二次報工後派工單應完成',
      function() {
        var data = 測試中心_建立報工測試資料_(測試資料.派工單號, 測試資料.報工任務ID, 90, 0, '完整測試：第二次報工 90，完成');
        var r = 主檔_送出報工(data);

        if (r && r.報工ID) {
          測試資料.報工ID清單.push(r.報工ID);
        }

        return {
          通過: r && r.成功 === true,
          實際結果: JSON.stringify(r),
          修正建議: r && r.成功 ? '' : '檢查主檔_送出報工。'
        };
      }
    )
  );

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      '報工閉環',
      '驗證派工完成',
      '累計良品=100，未完成=0，狀態=已完成',
      function() {
        var r = 測試中心_驗證派工單完成狀態_(測試資料.派工單號);
        return {
          通過: r.成功,
          實際結果: r.訊息,
          修正建議: r.成功 ? '' : '檢查 10_派工單 回寫邏輯。'
        };
      }
    )
  );

  結果清單.push(
    測試中心_安全執行_(
      測試批次,
      '報工閉環',
      '驗證完成任務移除',
      '已完成任務不應再出現在任務池',
      function() {
        var 任務 = 測試中心_查詢報工任務_依派工單號_(測試資料.派工單號);
        return {
          通過: !任務,
          實際結果: 任務 ? '完成任務仍在任務池' : '完成任務已移除',
          修正建議: 任務 ? '檢查 主檔_重建報工任務池 是否排除已完成。' : ''
        };
      }
    )
  );

  return 結果清單;
}


/* =========================================================
 * 九、異常防呆測試
 * ========================================================= */

function 測試中心_測試異常防呆_(測試批次) {
  var 結果清單 = [];

  var 測試案例 = [
    {
      名稱: '缺少派工單號',
      資料: {
        報工任務ID: 'TASK-TEST',
        報工日期: 測試中心_今天_(),
        班別: '早班',
        員工編號: 'fhfi573',
        姓名: '黃嘉欣',
        工站名稱: 'M/C加工',
        良品數: 10,
        不良數: 0,
        停機分鐘: 0
      },
      預期失敗訊息: '缺少派工單號'
    },
    {
      名稱: '缺少報工任務ID',
      資料: {
        派工單號: '正式派工-防呆測試',
        報工日期: 測試中心_今天_(),
        班別: '早班',
        員工編號: 'fhfi573',
        姓名: '黃嘉欣',
        工站名稱: 'M/C加工',
        良品數: 10,
        不良數: 0,
        停機分鐘: 0
      },
      預期失敗訊息: '缺少報工任務ID'
    },
    {
      名稱: '缺少員工編號',
      資料: {
        派工單號: '正式派工-防呆測試',
        報工任務ID: 'TASK-防呆測試',
        報工日期: 測試中心_今天_(),
        班別: '早班',
        姓名: '黃嘉欣',
        工站名稱: 'M/C加工',
        良品數: 10,
        不良數: 0,
        停機分鐘: 0
      },
      預期失敗訊息: '缺少員工編號'
    },
    {
      名稱: '良品與不良都為 0',
      資料: {
        派工單號: '正式派工-防呆測試',
        報工任務ID: 'TASK-防呆測試',
        報工日期: 測試中心_今天_(),
        班別: '早班',
        員工編號: 'fhfi573',
        姓名: '黃嘉欣',
        工站名稱: 'M/C加工',
        良品數: 0,
        不良數: 0,
        停機分鐘: 0
      },
      預期失敗訊息: '合計必須大於 0'
    }
  ];

  測試案例.forEach(function(案例) {
    結果清單.push(
      測試中心_安全執行_(
        測試批次,
        '異常防呆',
        案例.名稱,
        '系統應阻擋錯誤資料送出',
        function() {
          var r = 主檔_送出報工(案例.資料);
          var 通過 = r && r.成功 === false && String(r.訊息 || '').indexOf(案例.預期失敗訊息) >= 0;

          return {
            通過: 通過,
            實際結果: JSON.stringify(r),
            修正建議: 通過 ? '' : '防呆沒有正確阻擋：' + 案例.名稱
          };
        }
      )
    );
  });

  結果清單.push(
    測試中心_建立結果_(
      測試批次,
      '異常防呆',
      '已完成任務再次報工阻擋',
      '完成任務不可再次報工',
      '目前主流程尚未加入「已完成任務再次送出阻擋」的正式檢查，建議 V2 補上。',
      '警告',
      '',
      'V2 增加：送出報工前檢查 10_派工單 報工狀態，若已完成則阻擋。'
    )
  );

  return 結果清單;
}


/* =========================================================
 * 十、正式 / 測試分流測試
 * ========================================================= */

function 測試中心_測試正式與測試分流_(測試批次) {
  var 結果清單 = [];
  var ss = 取得_智慧工廠主資料庫();

  var 檢查分頁 = ['10_派工單', '09_報工任務池', '09_報工紀錄'];

  檢查分頁.forEach(function(分頁名稱) {
    結果清單.push(
      測試中心_安全執行_(
        測試批次,
        '正式/測試分流',
        '檢查資料模式欄位：' + 分頁名稱,
        '分頁應有 資料模式 欄位，可區分 測試 / 正式',
        function() {
          var sheet = ss.getSheetByName(分頁名稱);

          if (!sheet) {
            return {
              通過: false,
              實際結果: '找不到分頁',
              修正建議: '先初始化必要分頁。'
            };
          }

          var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
            return String(h || '').trim();
          });

          var 有欄位 = headers.indexOf('資料模式') >= 0;

          return {
            通過: 有欄位,
            實際結果: 有欄位 ? '已有 資料模式 欄位' : '缺少 資料模式 欄位',
            修正建議: 有欄位 ? '' : 'V2 應新增 資料模式 欄位，值為 測試 / 正式。'
          };
        }
      )
    );
  });

  return 結果清單;
}


/* =========================================================
 * 十一、測試中心輔助函數
 * ========================================================= */

function 測試中心_建立報工測試資料_(派工單號, 報工任務ID, 良品數, 不良數, 備註) {
  return {
    派工單號: 派工單號,
    報工任務ID: 報工任務ID,
    報工日期: 測試中心_今天_(),
    班別: '早班',
    員工編號: 'fhfi573',
    姓名: '黃嘉欣',
    工站名稱: 'M/C加工',
    機台編號: 'AUTO-TEST-MACHINE',
    產品編號: 'AUTO-TEST-PART',
    品名: '自動測試產品',
    計畫數量: 100,
    良品數: 良品數,
    不良數: 不良數,
    停機分鐘: 0,
    備註: 備註
  };
}

function 測試中心_查詢報工任務_依派工單號_(派工單號) {
  var ss = 取得_智慧工廠主資料庫();
  var sheet = ss.getSheetByName('09_報工任務池');
  if (!sheet) return null;

  var 資料 = 測試中心_讀取物件列_(sheet);

  for (var i = 0; i < 資料.length; i++) {
    if (String(資料[i]['派工單號'] || '').trim() === String(派工單號).trim()) {
      return 資料[i];
    }
  }

  return null;
}

function 測試中心_驗證派工單完成狀態_(派工單號) {
  var ss = 取得_智慧工廠主資料庫();
  var sheet = ss.getSheetByName('10_派工單');

  if (!sheet) {
    return {
      成功: false,
      訊息: '找不到 10_派工單'
    };
  }

  var 資料 = 測試中心_讀取物件列_(sheet);

  for (var i = 0; i < 資料.length; i++) {
    var r = 資料[i];

    if (String(r['派工單號'] || '').trim() === String(派工單號).trim()) {
      var 累計良品 = Number(r['累計良品'] || 0);
      var 累計不良 = Number(r['累計不良'] || 0);
      var 累計報工數 = Number(r['累計報工數'] || 0);
      var 未完成數量 = Number(r['未完成數量'] || 0);
      var 報工狀態 = String(r['報工狀態'] || '');

      var 成功 =
        累計良品 >= 100 &&
        累計報工數 >= 100 &&
        未完成數量 === 0 &&
        報工狀態 === '已完成';

      return {
        成功: 成功,
        訊息:
          '累計良品=' + 累計良品 +
          '，累計不良=' + 累計不良 +
          '，累計報工數=' + 累計報工數 +
          '，未完成數量=' + 未完成數量 +
          '，報工狀態=' + 報工狀態
      };
    }
  }

  return {
    成功: false,
    訊息: '找不到派工單號：' + 派工單號
  };
}

function 測試中心_安全執行_(測試批次, 類別, 測試項目, 預期結果, 執行函數) {
  try {
    var r = 執行函數();

    var 判定 = r.通過 ? '通過' : '失敗';

    return 測試中心_建立結果_(
      測試批次,
      類別,
      測試項目,
      預期結果,
      r.實際結果,
      判定,
      '',
      r.修正建議
    );

  } catch (錯誤) {
    return 測試中心_建立結果_(
      測試批次,
      類別,
      測試項目,
      預期結果,
      '執行錯誤',
      '失敗',
      錯誤.message,
      '依錯誤訊息修正後重新測試。'
    );
  }
}

function 測試中心_建立結果_(測試批次, 類別, 測試項目, 預期結果, 實際結果, 判定, 錯誤訊息, 修正建議) {
  return {
    測試時間: 主檔_格式化時間(new Date()),
    測試批次: 測試批次,
    類別: 類別,
    測試項目: 測試項目,
    預期結果: 預期結果,
    實際結果: 實際結果,
    判定: 判定,
    錯誤訊息: 錯誤訊息 || '',
    修正建議: 修正建議 || ''
  };
}

function 測試中心_彙總測試結果_(測試批次, 結果清單) {
  var 通過 = 0;
  var 失敗 = 0;
  var 警告 = 0;

  結果清單.forEach(function(r) {
    if (r.判定 === '通過') 通過++;
    else if (r.判定 === '警告') 警告++;
    else 失敗++;
  });

  var 最終判定 = 失敗 > 0 ? '失敗' : (警告 > 0 ? '有警告' : '通過');

  return {
    成功: 失敗 === 0,
    測試批次: 測試批次,
    最終判定: 最終判定,
    總測試數: 結果清單.length,
    通過數: 通過,
    失敗數: 失敗,
    警告數: 警告,
    測試時間: 主檔_格式化時間(new Date())
  };
}

function 測試中心_產生批次_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss');
}

function 測試中心_今天_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
}

function 測試中心_讀取物件列_(sheet) {
  if (!sheet) return [];
  if (sheet.getLastRow() <= 1) return [];

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) {
    return String(h || '').trim();
  });

  var result = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var text = row.join('').trim();

    if (!text) continue;
    if (text.indexOf('#N/A') >= 0) continue;
    if (text.indexOf('#REF') >= 0) continue;

    var obj = {};

    headers.forEach(function(h, idx) {
      if (!h) return;
      obj[h] = 測試中心_轉輸出值_(row[idx]);
    });

    result.push(obj);
  }

  return result;
}

function 測試中心_轉輸出值_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  }

  if (value === null || value === undefined) {
    return '';
  }

  return value;
}

function 測試中心_找第一筆A欄資料列_(sheet) {
  if (!sheet) return 0;
  if (sheet.getLastRow() <= 1) return 0;

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim()) {
      return i + 2;
    }
  }

  return 0;
}


/* =========================================================
 * 十二、測試報告寫入
 * ========================================================= */

function 測試中心_取得測試總報告表_() {
  var ss = 取得_智慧工廠主資料庫();

  var 表頭 = 測試中心_取得標準表頭_('99_測試總報告');

  if (typeof 主檔_取得或建立分頁 === 'function') {
    return 主檔_取得或建立分頁(ss, '99_測試總報告', 表頭);
  }

  var sheet = ss.getSheetByName('99_測試總報告');
  if (!sheet) sheet = ss.insertSheet('99_測試總報告');

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 表頭.length).setValues([表頭]);
  }

  return sheet;
}

function 測試中心_寫入測試總報告_(結果清單) {
  var sheet = 測試中心_取得測試總報告表_();

  var rows = 結果清單.map(function(r) {
    return [
      r.測試時間,
      r.測試批次,
      r.類別,
      r.測試項目,
      r.預期結果,
      r.實際結果,
      r.判定,
      r.錯誤訊息,
      r.修正建議
    ];
  });

  if (rows.length === 0) return;

  var 寫入列 = 測試中心_找第一個空白列_依A欄_(sheet);
  sheet.getRange(寫入列, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
}

function 測試中心_取得系統測試紀錄表_() {
  var ss = 取得_智慧工廠主資料庫();
  var 表頭 = 測試中心_取得標準表頭_('99_系統測試紀錄');

  if (typeof 主檔_取得或建立分頁 === 'function') {
    return 主檔_取得或建立分頁(ss, '99_系統測試紀錄', 表頭);
  }

  var sheet = ss.getSheetByName('99_系統測試紀錄');
  if (!sheet) sheet = ss.insertSheet('99_系統測試紀錄');

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 表頭.length).setValues([表頭]);
  }

  return sheet;
}

function 測試中心_寫入系統測試紀錄_(彙總, 明細) {
  var sheet = 測試中心_取得系統測試紀錄表_();

  var row = [
    主檔_格式化時間(new Date()),
    彙總.測試批次,
    '一鍵完整系統測試',
    彙總.最終判定,
    彙總.總測試數,
    彙總.通過數,
    彙總.失敗數,
    彙總.警告數,
    JSON.stringify(彙總),
    JSON.stringify(明細)
  ];

  var 寫入列 = 測試中心_找第一個空白列_依A欄_(sheet);
  sheet.getRange(寫入列, 1, 1, row.length).setValues([row]);
  sheet.setFrozenRows(1);
}

function 測試中心_找第一個空白列_依A欄_(sheet) {
  if (typeof 主檔_找第一個空白列_依A欄 === 'function') {
    return 主檔_找第一個空白列_依A欄(sheet);
  }

  var lastRow = Math.max(sheet.getLastRow(), 2);
  var values = sheet.getRange(2, 1, Math.max(lastRow - 1, 1), 1).getValues();

  for (var i = 0; i < values.length; i++) {
    if (!String(values[i][0] || '').trim()) {
      return i + 2;
    }
  }

  return lastRow + 1;
}

function 測試中心_取得最近測試結果_() {
  var sheet = 測試中心_取得系統測試紀錄表_();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      成功: false,
      訊息: '目前沒有系統測試紀錄'
    };
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  var obj = {};

  headers.forEach(function(h, i) {
    if (h) obj[h] = values[i];
  });

  return {
    成功: true,
    最近測試: obj
  };
}


/* =========================================================
 * 十三、標準表頭
 * ========================================================= */

function 測試中心_取得標準表頭_(分頁名稱) {
  if (分頁名稱 === '09_報工紀錄' && typeof 主檔_報工紀錄表頭 === 'function') return 主檔_報工紀錄表頭();
  if (分頁名稱 === '09_報工任務池' && typeof 主檔_報工任務池表頭 === 'function') return 主檔_報工任務池表頭();
  if (分頁名稱 === '09_報工進度檢核' && typeof 主檔_報工進度檢核表頭 === 'function') return 主檔_報工進度檢核表頭();
  if (分頁名稱 === '09_報工API測試紀錄' && typeof 主檔_報工API測試紀錄表頭 === 'function') return 主檔_報工API測試紀錄表頭();
  if (分頁名稱 === '10_派工單' && typeof 主檔_正式派工表頭 === 'function') return 主檔_正式派工表頭();
  if (分頁名稱 === '10_派工單轉入紀錄' && typeof 主檔_派工單轉入紀錄表頭 === 'function') return 主檔_派工單轉入紀錄表頭();
  if (分頁名稱 === '99_操作日誌' && typeof 主檔_操作日誌表頭 === 'function') return 主檔_操作日誌表頭();

  var 表頭對照 = {
    '09_報工紀錄': [
      '報工ID', '時間戳記', '報工日期', '班別', '員工編號', '姓名',
      '產品編號', '品名', '工站名稱', '工序名稱', '機台編號',
      '良品數', '不良數', '停機分鐘', '派工單號', '報工任務ID',
      '計畫數量', '本次總數', '累計良品', '累計不良', '未完成數量',
      '達成率', '報工來源', '回寫狀態', '備註', '最後更新時間'
    ],
    '09_報工任務池': [
      '報工任務ID', '派工單號', '派工日期', '班別', '工站代碼', '工站名稱',
      '區域', '員工編號', '操作員姓名', '計畫數量', '預估工時_小時',
      '派工狀態', '風險等級', '報工狀態', '正式狀態', '來源資料', '最後更新時間'
    ],
    '09_報工進度檢核': [
      '檢核時間', '檢核項目', '結果', '筆數', '訊息', '處理批次'
    ],
    '09_報工API測試紀錄': [
      '測試時間', '測試來源', '派工單號', '報工任務ID', '員工編號',
      '姓名', '工站名稱', '良品數', '不良數', '結果', '訊息', '原始JSON'
    ],
    '10_派工單': [
      '派工單號', '來源草稿編號', '派工日期', '班別', '工站代碼', '工站名稱',
      '區域', '員工編號', '操作員姓名', '計畫數量', '預估工時_小時',
      '派工狀態', '風險等級', '報工狀態', '建議處置', '建立時間',
      '資料來源', '人工確認狀態', '正式轉入批次', '正式轉入時間',
      '正式狀態', '備註', '累計良品', '累計不良', '累計報工數',
      '未完成數量', '達成率', '報工回寫狀態'
    ],
    '10_派工單轉入紀錄': [
      '轉入批次', '轉入時間', '派工單草稿編號', '來源草稿編號',
      '派工日期', '班別', '工站代碼', '工站名稱', '區域',
      '員工編號', '操作員姓名', '需求總量', '預估工時_小時',
      '風險等級', '轉入狀態', '處理人員', '備註', '資料來源'
    ],
    '99_操作日誌': [
      '時間', '動作', '結果', '訊息', '來源'
    ],
    '99_系統測試紀錄': [
      '測試時間', '測試批次', '測試項目', '最終判定',
      '總測試數', '通過數', '失敗數', '警告數', '彙總JSON', '明細JSON'
    ],
    '99_測試總報告': [
      '測試時間', '測試批次', '類別', '測試項目', '預期結果',
      '實際結果', '判定', '錯誤訊息', '修正建議'
    ]
  };

  return 表頭對照[分頁名稱] || ['時間', '內容'];
}


/* =========================================================
 * 十四、側邊欄與視窗
 * ========================================================= */

function 執行_開啟測試控制台側邊欄() {
  var html = HtmlService
    .createHtmlOutput(測試中心_取得側邊欄HTML_())
    .setTitle('智慧工廠測試中心');

  SpreadsheetApp.getUi().showSidebar(html);
}

function 測試中心_開啟報工表單視窗() {
  if (typeof 取得_主檔報工入口HTML !== 'function') {
    測試中心_顯示訊息_('無法開啟', '找不到 取得_主檔報工入口HTML');
    return;
  }

  var html = HtmlService
    .createHtmlOutput(取得_主檔報工入口HTML())
    .setWidth(1100)
    .setHeight(760);

  SpreadsheetApp.getUi().showModalDialog(html, '智慧工廠報工入口');
}

function 測試中心_取得側邊欄HTML_() {
  var html = '';

  html += '<!DOCTYPE html>';
  html += '<html lang="zh-Hant">';
  html += '<head>';
  html += '<meta charset="UTF-8">';
  html += '<style>';
  html += 'body{font-family:Arial,"Noto Sans TC",sans-serif;padding:12px;background:#f1f5f9;color:#0f172a;}';
  html += 'h2{font-size:18px;margin:0 0 10px;color:#0f4c81;}';
  html += '.卡{background:white;border-radius:14px;padding:12px;margin:10px 0;box-shadow:0 4px 14px rgba(0,0,0,.08);}';
  html += 'button{width:100%;border:0;border-radius:10px;padding:10px;margin:5px 0;background:#0f4c81;color:white;font-weight:bold;cursor:pointer;}';
  html += '.綠{background:#10b981}.橘{background:#f59e0b}.灰{background:#64748b}';
  html += 'pre{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;border-radius:10px;padding:10px;font-size:12px;max-height:280px;overflow:auto;}';
  html += '.小字{font-size:12px;color:#64748b;}';
  html += '</style>';
  html += '</head>';
  html += '<body>';
  html += '<h2>智慧工廠測試中心</h2>';
  html += '<div class="小字">按鈕會直接執行 GAS 測試，結果寫入 99_測試總報告。</div>';

  html += '<div class="卡">';
  html += '<button class="綠" onclick="跑(\'執行_一鍵完整系統測試\')">一鍵完整系統測試</button>';
  html += '<button onclick="跑(\'執行_測試主檔連線\')">測試主檔連線</button>';
  html += '<button onclick="跑(\'執行_測試必要分頁與表頭\')">測試必要分頁與表頭</button>';
  html += '<button onclick="跑(\'執行_測試資料位置與錯誤值\')">測試資料位置與錯誤值</button>';
  html += '<button onclick="跑(\'執行_測試報工閉環\')">測試報工閉環</button>';
  html += '<button onclick="跑(\'執行_測試異常防呆\')">測試異常防呆</button>';
  html += '<button onclick="跑(\'執行_測試Web初始化資料\')">測試 Web 初始化資料</button>';
  html += '<button onclick="跑(\'執行_測試正式與測試分流\')">測試正式/測試分流</button>';
  html += '</div>';

  html += '<div class="卡">';
  html += '<button class="灰" onclick="跑(\'執行_查看最近測試結果\')">查看最近測試結果</button>';
  html += '<button class="橘" onclick="google.script.run.測試中心_開啟報工表單視窗()">開啟報工表單視窗</button>';
  html += '</div>';

  html += '<div class="卡">';
  html += '<b>執行結果</b>';
  html += '<pre id="結果">尚未執行</pre>';
  html += '</div>';

  html += '<script>';
  html += 'function 顯示(r){document.getElementById("結果").textContent=JSON.stringify(r,null,2);}';
  html += 'function 錯誤(e){document.getElementById("結果").textContent="錯誤："+(e.message||e);}';
  html += 'function 跑(fn){document.getElementById("結果").textContent="執行中："+fn;google.script.run.withSuccessHandler(顯示).withFailureHandler(錯誤)[fn]();}';
  html += '</script>';

  html += '</body></html>';

  return html;
}


/* =========================================================
 * 十五、顯示工具
 * ========================================================= */

function 測試中心_顯示訊息_(標題, 內容) {
  try {
    SpreadsheetApp.getUi().alert(標題 + '\n\n' + 內容);
  } catch (錯誤) {
    Logger.log(標題 + '\n\n' + 內容);
  }
}

function 測試中心_格式化結果文字_(結果) {
  try {
    return JSON.stringify(結果, null, 2);
  } catch (錯誤) {
    return String(結果);
  }
}

