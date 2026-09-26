/**
 * 化新精密｜75_LINE 製造工具中心
 * 版本：v1.4.0
 *
 * 功能：
 * 1. 一般使用者只看啟用工具卡並開啟工具。
 * 2. 管理員才看得到「工具管理」卡，才可新增工具、換圖片、啟用/停用、調整排序。
 * 3. 自動建立/修復：
 *    - LINE_製造工具中心
 *    - LINE_製造工具管理員
 *    - LINE_製造工具操作紀錄
 * 4. 自動補齊欄位、核心工具資料、既有高權限管理員。
 * 5. 正式異動保存操作人員、時間、eventId、idempotencyKey，避免 LINE 重送重複寫入。
 * 6. 製造工具管理 PWA：短效簽章 Token、管理員白名單、圖片上傳、新增/啟停/排序。
 * 7. 不建立第二個 LINE Bot、不建立第二個 Web App。
 */

var 製造工具75_版本_ = 'v1.4.0_管理PWA_簽章權限_圖片上傳';

var 製造工具75_正式主庫ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 製造工具75_工作表名稱_ = 'LINE_製造工具中心';
var 製造工具75_管理員表名稱_ = 'LINE_製造工具管理員';
var 製造工具75_操作紀錄表名稱_ = 'LINE_製造工具操作紀錄';

var 製造工具75_LINE回覆網址_ = 'https://api.line.me/v2/bot/message/reply';

var 製造工具75_智慧5S正式網址_ =
  'https://qhero70.github.io/smart-factory-worker-app/5s/';

var 製造工具75_智慧5S預設圖片_ =
  'https://qhero70.github.io/smart-factory-worker-app/5s/assets/a5/SITE-A5-008.jpg';

var 製造工具75_刀具表精靈網址_ =
  'https://qhero70.github.io/smart-factory-worker-app/tool-change-pwa/';

var 製造工具75_水位1064網址_ =
  'https://huaxin-1064-water-team.qhero84.chatgpt.site';

var 製造工具75_生產計畫清洗網址_ =
  'https://qhero70.github.io/smart-factory-worker-app/production-plan-cleaner-v3.html';

var 製造工具75_管理PWA基底網址_ =
  'https://qhero70.github.io/smart-factory-worker-app/manufacturing-tools-admin/';

var 製造工具75_管理Token效期秒_ = 1800;
var 製造工具75_管理密鑰屬性Key_ = 'TOOL75_ADMIN_HMAC_SECRET';
var 製造工具75_圖片資料夾屬性Key_ = 'TOOL75_ADMIN_IMAGE_FOLDER_ID';
var 製造工具75_圖片資料夾名稱_ = 'LINE_製造工具卡片圖片';

var 製造工具75_工具欄位_ = [
  '工具編號',
  '排序',
  '顯示名稱',
  '說明',
  '圖片網址',
  'PWA網址',
  '分類',
  '啟用',
  '按鈕文字',
  '備註',
  '建立者LINE_USER_ID',
  '建立者姓名',
  '建立時間',
  '更新者LINE_USER_ID',
  '更新者姓名',
  '更新時間'
];

var 製造工具75_管理員欄位_ = [
  '啟用',
  'LINE_USER_ID',
  '工號',
  '姓名',
  '角色',
  '權限等級',
  '可新增工具',
  '可更換圖片',
  '可啟用停用',
  '可調整排序',
  '備註',
  '更新時間'
];

var 製造工具75_操作紀錄欄位_ = [
  '時間戳',
  'eventId',
  'idempotencyKey',
  'LINE_USER_ID',
  '工號',
  '姓名',
  '動作',
  '工具編號',
  '修改前',
  '修改後',
  '結果',
  '備註'
];


/* ============================================================
 * Webhook 主入口
 * ============================================================ */

function LINE製造工具75_嘗試處理Webhook_(內容) {
  try {
    if (!內容 || !Array.isArray(內容.events) || !內容.events.length) return null;

    製造工具75_確保結構_();

    var 事件 = 內容.events[0];
    if (!製造工具75_是否為製造工具事件_(事件)) return null;

    var replyToken = String(事件.replyToken || '').trim();
    if (!replyToken) throw new Error('75_LINE 缺少 replyToken');

    var lineUserId = String(事件.source && 事件.source.userId || '').trim();
    var 處理結果 = 製造工具75_處理單一事件_(事件, lineUserId, replyToken);

    if (!處理結果) return null;

    var 結果 = {
      已處理: true,
      已部分處理: false,
      處理筆數: 1,
      模組: '75_LINE_製造工具中心',
      版本: 製造工具75_版本_,
      動作: 處理結果.動作 || '',
      成功: 處理結果.成功 !== false
    };

    console.log(JSON.stringify(結果, null, 2));
    return 結果;

  } catch (錯誤) {
    console.error(
      '75_LINE 製造工具中心失敗：' +
      String(錯誤 && 錯誤.stack ? 錯誤.stack : 錯誤)
    );
    throw 錯誤;
  }
}


function 製造工具75_處理單一事件_(事件, lineUserId, replyToken) {
  if (!事件) return null;

  if (
    事件.type === 'message' &&
    事件.message &&
    事件.message.type === 'text'
  ) {
    var text = String(事件.message.text || '').trim();

    if (/^(製造工具|製造工具中心|工具中心|更多工具|其他工具)$/i.test(text)) {
      var 工具清單 = 製造工具75_取得完整工具清單_();
      var flex = 製造工具75_建立Flex訊息_(工具清單, lineUserId, false);
      製造工具75_回覆LINE_(replyToken, [flex]);

      return {
        成功: true,
        動作: '開啟製造工具',
        工具數量: 工具清單.length,
        管理員: 製造工具75_是否管理員_(lineUserId)
      };
    }

    if (/^(工具管理|管理工具|製造工具管理)$/i.test(text)) {
      return 製造工具75_回覆管理入口_(replyToken, lineUserId);
    }

    if (/^工具管理\s*新增工具$/i.test(text)) {
      return 製造工具75_回覆新增工具說明_(replyToken, lineUserId);
    }

    if (/^工具管理\s*更換圖片$/i.test(text)) {
      return 製造工具75_回覆更換圖片說明_(replyToken, lineUserId);
    }

    if (/^工具管理\s*(啟用停用|啟用\/停用|啟停工具)$/i.test(text)) {
      return 製造工具75_回覆啟停說明_(replyToken, lineUserId);
    }

    if (/^工具管理\s*(排序|調整排序)$/i.test(text)) {
      return 製造工具75_回覆排序說明_(replyToken, lineUserId);
    }

    if (/^工具清單$/i.test(text)) {
      return 製造工具75_回覆工具清單_(replyToken, lineUserId);
    }

    if (/^新增工具(?:\s|\n|$)/i.test(text)) {
      return 製造工具75_執行新增工具指令_(事件, lineUserId, replyToken, text);
    }

    if (/^更換圖片(?:\s|\n|$)/i.test(text)) {
      return 製造工具75_執行更換圖片指令_(事件, lineUserId, replyToken, text);
    }

    if (/^啟用工具(?:\s|\n|$)/i.test(text)) {
      return 製造工具75_執行啟停工具指令_(事件, lineUserId, replyToken, text, true);
    }

    if (/^停用工具(?:\s|\n|$)/i.test(text)) {
      return 製造工具75_執行啟停工具指令_(事件, lineUserId, replyToken, text, false);
    }

    if (/^(調整排序|工具排序)(?:\s|\n|$)/i.test(text)) {
      return 製造工具75_執行排序指令_(事件, lineUserId, replyToken, text);
    }

    return null;
  }

  if (
    事件.type === 'postback' &&
    事件.postback
  ) {
    var data = String(事件.postback.data || '').trim();

    if (/action=(manufacturing_tools|製造工具)/i.test(data)) {
      var 工具清單2 = 製造工具75_取得完整工具清單_();
      製造工具75_回覆LINE_(
        replyToken,
        [製造工具75_建立Flex訊息_(工具清單2, lineUserId, false)]
      );
      return { 成功: true, 動作: '開啟製造工具' };
    }

    if (/action=tool75_admin/i.test(data)) {
      return 製造工具75_回覆管理入口_(replyToken, lineUserId);
    }
  }

  return null;
}


function 製造工具75_是否為製造工具事件_(事件) {
  if (!事件) return false;

  if (
    事件.type === 'message' &&
    事件.message &&
    事件.message.type === 'text'
  ) {
    var 文字 = String(事件.message.text || '').trim();

    return /^(製造工具|製造工具中心|工具中心|更多工具|其他工具|工具管理|管理工具|製造工具管理|工具管理\s*新增工具|工具管理\s*更換圖片|工具管理\s*(啟用停用|啟用\/停用|啟停工具)|工具管理\s*(排序|調整排序)|工具清單|新增工具|更換圖片|啟用工具|停用工具|調整排序|工具排序)(?:\s|\n|$)/i.test(文字);
  }

  if (事件.type === 'postback' && 事件.postback) {
    var data = String(事件.postback.data || '');
    return (
      /action=(manufacturing_tools|製造工具)/i.test(data) ||
      /action=tool75_admin/i.test(data)
    );
  }

  return false;
}


/* ============================================================
 * 自動建表 / 自動補欄位 / 核心資料
 * ============================================================ */

function 初始化75_LINE製造工具中心_v131() {
  製造工具75_確保結構_();

  return {
    success: true,
    version: 製造工具75_版本_,
    mainSheet: 製造工具75_工作表名稱_,
    adminSheet: 製造工具75_管理員表名稱_,
    auditSheet: 製造工具75_操作紀錄表名稱_,
    toolCount: 製造工具75_取得完整工具清單_().length,
    adminCount: 製造工具75_讀取管理員_().length
  };
}


function 製造工具75_確保結構_() {
  var ss = SpreadsheetApp.openById(製造工具75_正式主庫ID_);

  製造工具75_建立或修復表_(
    ss,
    製造工具75_工作表名稱_,
    製造工具75_工具欄位_,
    '#0F3D63'
  );

  製造工具75_建立或修復表_(
    ss,
    製造工具75_管理員表名稱_,
    製造工具75_管理員欄位_,
    '#7C2D12'
  );

  製造工具75_建立或修復表_(
    ss,
    製造工具75_操作紀錄表名稱_,
    製造工具75_操作紀錄欄位_,
    '#374151'
  );

  製造工具75_補核心工具資料_();
  製造工具75_同步既有高權限管理員_();

  return true;
}


function 製造工具75_建立或修復表_(ss, name, headers, headerColor) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() < 1 || sh.getLastColumn() < 1) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var 現有欄位 = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(function (v) { return String(v || '').trim(); });

    var 缺少 = headers.filter(function (h) {
      return 現有欄位.indexOf(h) < 0;
    });

    if (缺少.length) {
      sh.getRange(1, 現有欄位.length + 1, 1, 缺少.length).setValues([缺少]);
    }
  }

  sh.setFrozenRows(1);

  var lastCol = sh.getLastColumn();
  if (lastCol > 0) {
    sh.getRange(1, 1, 1, lastCol)
      .setFontWeight('bold')
      .setBackground(headerColor || '#0F3D63')
      .setFontColor('#FFFFFF');
  }

  return sh;
}


function 製造工具75_補核心工具資料_() {
  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_工作表名稱_);

  var rows = 製造工具75_讀表物件_(sh);
  var 核心 = 製造工具75_取得核心工具_();

  核心.forEach(function (工具) {
    var existing = rows.filter(function (r) {
      return (
        String(r.工具編號 || '').trim() === String(工具.工具編號) ||
        String(r.顯示名稱 || '').replace(/\s+/g, '') ===
          String(工具.顯示名稱).replace(/\s+/g, '')
      );
    })[0];

    if (existing) {
      // 舊資料沒有工具編號時自動補上，不覆蓋使用者已改過的其他內容。
      if (!String(existing.工具編號 || '').trim()) {
        製造工具75_寫欄位值_(sh, existing.__row, '工具編號', 工具.工具編號);
      }
      return;
    }

    var now = new Date();
    製造工具75_新增資料列_(sh, {
      工具編號: 工具.工具編號,
      排序: 工具.排序,
      顯示名稱: 工具.顯示名稱,
      說明: 工具.說明,
      圖片網址: 工具.圖片網址,
      PWA網址: 工具.PWA網址,
      分類: 工具.分類,
      啟用: true,
      按鈕文字: 工具.按鈕文字,
      備註: '系統核心工具',
      建立者LINE_USER_ID: 'SYSTEM',
      建立者姓名: 'SYSTEM',
      建立時間: now,
      更新者LINE_USER_ID: 'SYSTEM',
      更新者姓名: 'SYSTEM',
      更新時間: now
    });
  });
}


function 製造工具75_同步既有高權限管理員_() {
  var ss = SpreadsheetApp.openById(製造工具75_正式主庫ID_);
  var identitySheet = ss.getSheetByName('33_LINE身份權限');
  if (!identitySheet || identitySheet.getLastRow() < 2) return;

  var admins = 製造工具75_讀取管理員_();
  var ids = {};
  admins.forEach(function (r) {
    ids[String(r.LINE_USER_ID || '').trim()] = true;
  });

  var identities = 製造工具75_讀表物件_(identitySheet);
  var adminSheet = ss.getSheetByName(製造工具75_管理員表名稱_);

  identities.forEach(function (r) {
    var lineUserId = String(r.LINE_USER_ID || '').trim();
    if (!lineUserId || ids[lineUserId]) return;

    var role = String(r.角色 || '').trim();
    var level = Number(r.權限等級 || 0);

    // 只自動同步明確管理員角色或 90 以上高權限，不把工程師/主管自動升級成工具管理員。
    if (!(/系統管理員|管理員|SUPER_ADMIN|ADMIN/i.test(role) || level >= 90)) return;

    製造工具75_新增資料列_(adminSheet, {
      啟用: true,
      LINE_USER_ID: lineUserId,
      工號: r.工號 || '',
      姓名: r.姓名 || '',
      角色: role || '管理員',
      權限等級: level,
      可新增工具: true,
      可更換圖片: true,
      可啟用停用: true,
      可調整排序: true,
      備註: '由 33_LINE身份權限 自動同步',
      更新時間: new Date()
    });

    ids[lineUserId] = true;
  });
}


function 製造工具75_取得核心工具_() {
  return [
    {
      工具編號: 'TOOL-5S',
      排序: 10,
      顯示名稱: '智慧5S',
      說明: '巡檢、歷史與改善',
      圖片網址: 製造工具75_智慧5S預設圖片_,
      PWA網址: 製造工具75_智慧5S正式網址_,
      分類: '現場管理',
      按鈕文字: '立即開啟'
    },
    {
      工具編號: 'TOOL-CUTTING-WIZARD',
      排序: 20,
      顯示名稱: '刀具表精靈',
      說明: '刀具表建立、換刀與現場查詢',
      圖片網址: '',
      PWA網址: 製造工具75_刀具表精靈網址_,
      分類: '刀具管理',
      按鈕文字: '開啟精靈'
    },
    {
      工具編號: 'TOOL-WATER-1064',
      排序: 30,
      顯示名稱: '1064 水位',
      說明: '水位、ESG、網路與 3D 即時查看',
      圖片網址: '',
      PWA網址: 製造工具75_水位1064網址_,
      分類: 'IoT監控',
      按鈕文字: '查看水位'
    },
    {
      工具編號: 'TOOL-PLAN-CLEANER',
      排序: 40,
      顯示名稱: '生產計畫表清洗',
      說明: '計畫表匯入、清洗與排程資料整理',
      圖片網址: '',
      PWA網址: 製造工具75_生產計畫清洗網址_,
      分類: '生產計畫',
      按鈕文字: '開啟清洗器'
    }
  ];
}


/* ============================================================
 * 讀取工具 / 管理員 / 身份
 * ============================================================ */

function 製造工具75_取得完整工具清單_() {
  製造工具75_確保結構_();

  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_工作表名稱_);

  var rows = 製造工具75_讀表物件_(sh)
    .filter(function (r) {
      return (
        製造工具75_轉布林值_(r.啟用) &&
        String(r.顯示名稱 || '').trim() &&
        /^https:\/\//i.test(String(r.PWA網址 || '').trim())
      );
    })
    .map(function (r) {
      return {
        工具編號: String(r.工具編號 || '').trim(),
        排序: Number(r.排序 || 9999),
        顯示名稱: String(r.顯示名稱 || '').trim(),
        說明: String(r.說明 || '').trim(),
        圖片網址: 製造工具75_補預設圖片_(
          String(r.顯示名稱 || ''),
          String(r.圖片網址 || '')
        ),
        PWA網址: 製造工具75_LINE內開網址_(String(r.PWA網址 || '')),
        分類: String(r.分類 || '製造工具').trim(),
        按鈕文字: String(r.按鈕文字 || '立即開啟').trim()
      };
    });

  rows.sort(function (a, b) {
    return Number(a.排序 || 9999) - Number(b.排序 || 9999);
  });

  return rows.slice(0, 11);
}


function 製造工具75_讀取管理員_() {
  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_管理員表名稱_);

  if (!sh) return [];

  return 製造工具75_讀表物件_(sh)
    .filter(function (r) {
      return (
        製造工具75_轉布林值_(r.啟用) &&
        String(r.LINE_USER_ID || '').trim()
      );
    });
}


function 製造工具75_取得管理員_(lineUserId) {
  var id = String(lineUserId || '').trim();
  if (!id) return null;

  return 製造工具75_讀取管理員_()
    .filter(function (r) {
      return String(r.LINE_USER_ID || '').trim() === id;
    })[0] || null;
}


function 製造工具75_是否管理員_(lineUserId) {
  return !!製造工具75_取得管理員_(lineUserId);
}


function 製造工具75_檢查權限_(lineUserId, capability) {
  var admin = 製造工具75_取得管理員_(lineUserId);
  if (!admin) {
    return {
      success: false,
      message: '⛔ 此功能僅限製造工具管理員。'
    };
  }

  var map = {
    add: '可新增工具',
    image: '可更換圖片',
    enable: '可啟用停用',
    sort: '可調整排序'
  };

  var column = map[capability];
  if (column && !製造工具75_轉布林值_(admin[column])) {
    return {
      success: false,
      message: '⛔ 你的管理員權限未開放此操作：' + column
    };
  }

  return {
    success: true,
    admin: admin
  };
}


function 製造工具75_取得身份_(lineUserId) {
  try {
    if (typeof LINE身份權限33_取得身份_ === 'function') {
      return LINE身份權限33_取得身份_(lineUserId) || {};
    }
  } catch (ignore) {}

  return {};
}


/* ============================================================
 * Flex 卡片
 * ============================================================ */

function 製造工具75_建立Flex訊息_(工具清單, lineUserId, 強制顯示管理卡) {
  var cards = 工具清單.map(function (工具) {
    return 製造工具75_建立Bubble_(工具);
  });

  if (
    強制顯示管理卡 === true ||
    製造工具75_是否管理員_(lineUserId)
  ) {
    cards.push(製造工具75_建立管理Bubble_(lineUserId));
  }

  return {
    type: 'flex',
    altText: '化新精密｜製造工具中心',
    contents: {
      type: 'carousel',
      contents: cards.slice(0, 12)
    }
  };
}


function 製造工具75_建立Bubble_(工具) {
  var heroUrl = 製造工具75_補預設圖片_(
    工具.顯示名稱,
    工具.圖片網址
  );

  var bubble = {
    type: 'bubble',
    size: 'mega',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '18px',
      contents: [
        {
          type: 'text',
          text: String(工具.分類 || '製造工具'),
          size: 'xs',
          weight: 'bold',
          color: '#1F6AA5'
        },
        {
          type: 'text',
          text: String(工具.顯示名稱 || ''),
          size: 'xl',
          weight: 'bold',
          color: '#222222',
          wrap: true
        },
        {
          type: 'text',
          text: String(工具.說明 || '點選下方功能開啟'),
          size: 'sm',
          color: '#666666',
          wrap: true,
          margin: 'md'
        },
        {
          type: 'separator',
          margin: 'xl'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '16px',
      contents: [
        {
          type: 'button',
          style: 'link',
          height: 'sm',
          action: {
            type: 'uri',
            label: String(工具.按鈕文字 || '立即開啟').substring(0, 20),
            uri: 製造工具75_LINE內開網址_(工具.PWA網址)
          }
        }
      ]
    }
  };

  if (heroUrl) {
    bubble.hero = {
      type: 'image',
      url: heroUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
      action: {
        type: 'uri',
        uri: 製造工具75_LINE內開網址_(工具.PWA網址)
      }
    };
  }

  return bubble;
}


function 製造工具75_建立管理Bubble_(lineUserId) {
  var 管理網址 = 製造工具75_建立管理PWA網址_(lineUserId);

  return {
    type: 'bubble',
    size: 'mega',

    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      paddingAll: '20px',

      contents: [
        {
          type: 'text',
          text: '管理員專區',
          size: 'xs',
          weight: 'bold',
          color: '#B45309'
        },
        {
          type: 'text',
          text: '🔒 工具管理',
          size: 'xl',
          weight: 'bold',
          wrap: true,
          color: '#111827'
        },
        {
          type: 'text',
          text: '新增卡片、手機換照片、啟用停用與排序。每次開啟都會重新驗證管理員身份。',
          size: 'sm',
          color: '#666666',
          wrap: true
        }
      ]
    },

    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '16px',

      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#0F3D63',
          action: {
            type: 'uri',
            label: '開啟工具管理',
            uri: 管理網址
          }
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'message',
            label: '查看工具清單',
            text: '工具清單'
          }
        }
      ]
    }
  };
}


/* ============================================================
 * 管理員互動
 * ============================================================ */

function 製造工具75_回覆管理入口_(replyToken, lineUserId) {
  if (!製造工具75_是否管理員_(lineUserId)) {
    製造工具75_回覆文字_(replyToken, '⛔ 製造工具管理僅限管理員使用。');
    return { 成功: false, 動作: '工具管理', 權限: '拒絕' };
  }

  var flex = {
    type: 'flex',
    altText: '製造工具管理',
    contents: {
      type: 'carousel',
      contents: [製造工具75_建立管理Bubble_(lineUserId)]
    }
  };

  製造工具75_回覆LINE_(replyToken, [flex]);
  return { 成功: true, 動作: '工具管理' };
}


function 製造工具75_回覆新增工具說明_(replyToken, lineUserId) {
  var p = 製造工具75_檢查權限_(lineUserId, 'add');
  if (!p.success) {
    製造工具75_回覆文字_(replyToken, p.message);
    return { 成功: false, 動作: '新增工具說明' };
  }

  製造工具75_回覆文字_(
    replyToken,
    [
      '【新增工具】',
      '請整段貼回：',
      '',
      '新增工具',
      '顯示名稱=新工具名稱',
      '說明=工具用途',
      '圖片網址=https://...',
      'PWA網址=https://...',
      '分類=製造工具',
      '按鈕文字=立即開啟',
      '排序=50',
      '',
      '工具編號可省略，系統會自動產生。'
    ].join('\n')
  );

  return { 成功: true, 動作: '新增工具說明' };
}


function 製造工具75_回覆更換圖片說明_(replyToken, lineUserId) {
  var p = 製造工具75_檢查權限_(lineUserId, 'image');
  if (!p.success) {
    製造工具75_回覆文字_(replyToken, p.message);
    return { 成功: false, 動作: '更換圖片說明' };
  }

  製造工具75_回覆文字_(
    replyToken,
    [
      '【更換圖片】',
      製造工具75_工具清單文字_(),
      '',
      '請整段貼回：',
      '更換圖片',
      '工具編號=TOOL-XXXX',
      '圖片網址=https://...'
    ].join('\n')
  );

  return { 成功: true, 動作: '更換圖片說明' };
}


function 製造工具75_回覆啟停說明_(replyToken, lineUserId) {
  var p = 製造工具75_檢查權限_(lineUserId, 'enable');
  if (!p.success) {
    製造工具75_回覆文字_(replyToken, p.message);
    return { 成功: false, 動作: '啟停工具說明' };
  }

  製造工具75_回覆文字_(
    replyToken,
    [
      '【啟用／停用工具】',
      製造工具75_工具清單文字_(),
      '',
      '啟用：',
      '啟用工具',
      '工具編號=TOOL-XXXX',
      '',
      '停用：',
      '停用工具',
      '工具編號=TOOL-XXXX'
    ].join('\n')
  );

  return { 成功: true, 動作: '啟停工具說明' };
}


function 製造工具75_回覆排序說明_(replyToken, lineUserId) {
  var p = 製造工具75_檢查權限_(lineUserId, 'sort');
  if (!p.success) {
    製造工具75_回覆文字_(replyToken, p.message);
    return { 成功: false, 動作: '排序說明' };
  }

  製造工具75_回覆文字_(
    replyToken,
    [
      '【調整排序】',
      製造工具75_工具清單文字_(),
      '',
      '請整段貼回：',
      '調整排序',
      '工具編號=TOOL-XXXX',
      '排序=25'
    ].join('\n')
  );

  return { 成功: true, 動作: '排序說明' };
}


function 製造工具75_回覆工具清單_(replyToken, lineUserId) {
  if (!製造工具75_是否管理員_(lineUserId)) {
    製造工具75_回覆文字_(replyToken, '⛔ 工具清單管理資訊僅限管理員查看。');
    return { 成功: false, 動作: '工具清單' };
  }

  製造工具75_回覆文字_(replyToken, 製造工具75_工具清單文字_());
  return { 成功: true, 動作: '工具清單' };
}


function 製造工具75_工具清單文字_() {
  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_工作表名稱_);

  var rows = 製造工具75_讀表物件_(sh);

  if (!rows.length) return '目前沒有工具資料。';

  return rows.map(function (r) {
    return [
      製造工具75_轉布林值_(r.啟用) ? '✅' : '⛔',
      String(r.工具編號 || '-'),
      String(r.顯示名稱 || '-'),
      '排序 ' + String(r.排序 || '-')
    ].join('｜');
  }).join('\n');
}


/* ============================================================
 * 正式異動
 * ============================================================ */

function 製造工具75_執行新增工具指令_(事件, lineUserId, replyToken, text) {
  var p = 製造工具75_檢查權限_(lineUserId, 'add');

  if (!p.success) {
    製造工具75_回覆文字_(replyToken, p.message);
    return { 成功: false, 動作: '新增工具' };
  }

  var kv = 製造工具75_解析KeyValue_(text);
  var name = String(kv.顯示名稱 || '').trim();
  var pwa = String(kv.PWA網址 || '').trim();
  var image = String(kv.圖片網址 || '').trim();
  var sort = Number(kv.排序 || 999);

  if (!name) throw new Error('新增工具缺少：顯示名稱');
  if (!/^https:\/\//i.test(pwa)) throw new Error('PWA網址必須是 https://');
  if (image && !/^https:\/\//i.test(image)) throw new Error('圖片網址必須是 https://');
  if (!isFinite(sort)) sort = 999;

  var toolId = String(kv.工具編號 || '').trim();
  if (!toolId) toolId = 製造工具75_產生工具編號_(name);

  var duplicate = 製造工具75_取得工具資料_(toolId);
  if (duplicate) throw new Error('工具編號已存在：' + toolId);

  var identity = 製造工具75_取得身份_(lineUserId);
  var idem = 製造工具75_事件冪等鍵_(事件, 'ADD', toolId);

  if (製造工具75_已完成冪等_(idem)) {
    製造工具75_回覆文字_(replyToken, 'ℹ️ 此新增工具事件已完成，已安全略過重送。');
    return { 成功: true, 動作: '新增工具', 重送: true };
  }

  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_工作表名稱_);

  var now = new Date();

  製造工具75_新增資料列_(sh, {
    工具編號: toolId,
    排序: sort,
    顯示名稱: name,
    說明: String(kv.說明 || '').trim(),
    圖片網址: image,
    PWA網址: pwa,
    分類: String(kv.分類 || '製造工具').trim(),
    啟用: true,
    按鈕文字: String(kv.按鈕文字 || '立即開啟').trim(),
    備註: String(kv.備註 || '').trim(),
    建立者LINE_USER_ID: lineUserId,
    建立者姓名: identity.姓名 || p.admin.姓名 || '',
    建立時間: now,
    更新者LINE_USER_ID: lineUserId,
    更新者姓名: identity.姓名 || p.admin.姓名 || '',
    更新時間: now
  });

  製造工具75_寫操作紀錄_(
    事件,
    lineUserId,
    '新增工具',
    toolId,
    '',
    JSON.stringify({ 顯示名稱: name, PWA網址: pwa, 圖片網址: image }),
    '完成',
    idem
  );

  製造工具75_回覆文字_(
    replyToken,
    '✅ 工具已新增\n工具編號：' + toolId + '\n名稱：' + name + '\n排序：' + sort
  );

  return { 成功: true, 動作: '新增工具', 工具編號: toolId };
}


function 製造工具75_執行更換圖片指令_(事件, lineUserId, replyToken, text) {
  var p = 製造工具75_檢查權限_(lineUserId, 'image');

  if (!p.success) {
    製造工具75_回覆文字_(replyToken, p.message);
    return { 成功: false, 動作: '更換圖片' };
  }

  var kv = 製造工具75_解析KeyValue_(text);
  var toolId = String(kv.工具編號 || '').trim();
  var image = String(kv.圖片網址 || '').trim();

  if (!toolId) throw new Error('更換圖片缺少：工具編號');
  if (!/^https:\/\//i.test(image)) throw new Error('圖片網址必須是 https://');

  var info = 製造工具75_取得工具資料_(toolId);
  if (!info) throw new Error('找不到工具：' + toolId);

  var idem = 製造工具75_事件冪等鍵_(事件, 'IMAGE', toolId);
  if (製造工具75_已完成冪等_(idem)) {
    製造工具75_回覆文字_(replyToken, 'ℹ️ 此更換圖片事件已完成，已安全略過重送。');
    return { 成功: true, 動作: '更換圖片', 重送: true };
  }

  var identity = 製造工具75_取得身份_(lineUserId);
  var before = String(info.data.圖片網址 || '');

  製造工具75_寫欄位值_(info.sheet, info.row, '圖片網址', image);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者LINE_USER_ID', lineUserId);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者姓名', identity.姓名 || p.admin.姓名 || '');
  製造工具75_寫欄位值_(info.sheet, info.row, '更新時間', new Date());

  製造工具75_寫操作紀錄_(
    事件,
    lineUserId,
    '更換圖片',
    toolId,
    before,
    image,
    '完成',
    idem
  );

  製造工具75_回覆文字_(
    replyToken,
    '✅ 圖片已更新\n工具：' +
    String(info.data.顯示名稱 || toolId)
  );

  return { 成功: true, 動作: '更換圖片', 工具編號: toolId };
}


function 製造工具75_執行啟停工具指令_(事件, lineUserId, replyToken, text, enabled) {
  var p = 製造工具75_檢查權限_(lineUserId, 'enable');

  if (!p.success) {
    製造工具75_回覆文字_(replyToken, p.message);
    return { 成功: false, 動作: enabled ? '啟用工具' : '停用工具' };
  }

  var kv = 製造工具75_解析KeyValue_(text);
  var toolId = String(kv.工具編號 || '').trim();

  if (!toolId) throw new Error('缺少：工具編號');

  var info = 製造工具75_取得工具資料_(toolId);
  if (!info) throw new Error('找不到工具：' + toolId);

  var action = enabled ? 'ENABLE' : 'DISABLE';
  var idem = 製造工具75_事件冪等鍵_(事件, action, toolId);

  if (製造工具75_已完成冪等_(idem)) {
    製造工具75_回覆文字_(replyToken, 'ℹ️ 此事件已完成，已安全略過重送。');
    return { 成功: true, 動作: enabled ? '啟用工具' : '停用工具', 重送: true };
  }

  var identity = 製造工具75_取得身份_(lineUserId);
  var before = 製造工具75_轉布林值_(info.data.啟用);

  製造工具75_寫欄位值_(info.sheet, info.row, '啟用', !!enabled);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者LINE_USER_ID', lineUserId);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者姓名', identity.姓名 || p.admin.姓名 || '');
  製造工具75_寫欄位值_(info.sheet, info.row, '更新時間', new Date());

  製造工具75_寫操作紀錄_(
    事件,
    lineUserId,
    enabled ? '啟用工具' : '停用工具',
    toolId,
    String(before),
    String(!!enabled),
    '完成',
    idem
  );

  製造工具75_回覆文字_(
    replyToken,
    (enabled ? '✅ 已啟用：' : '⛔ 已停用：') +
    String(info.data.顯示名稱 || toolId)
  );

  return { 成功: true, 動作: enabled ? '啟用工具' : '停用工具', 工具編號: toolId };
}


function 製造工具75_執行排序指令_(事件, lineUserId, replyToken, text) {
  var p = 製造工具75_檢查權限_(lineUserId, 'sort');

  if (!p.success) {
    製造工具75_回覆文字_(replyToken, p.message);
    return { 成功: false, 動作: '調整排序' };
  }

  var kv = 製造工具75_解析KeyValue_(text);
  var toolId = String(kv.工具編號 || '').trim();
  var sort = Number(kv.排序);

  if (!toolId) throw new Error('調整排序缺少：工具編號');
  if (!isFinite(sort) || sort < 0 || sort > 9999) throw new Error('排序必須是 0～9999 數字');

  var info = 製造工具75_取得工具資料_(toolId);
  if (!info) throw new Error('找不到工具：' + toolId);

  var idem = 製造工具75_事件冪等鍵_(事件, 'SORT', toolId);
  if (製造工具75_已完成冪等_(idem)) {
    製造工具75_回覆文字_(replyToken, 'ℹ️ 此排序事件已完成，已安全略過重送。');
    return { 成功: true, 動作: '調整排序', 重送: true };
  }

  var identity = 製造工具75_取得身份_(lineUserId);
  var before = info.data.排序;

  製造工具75_寫欄位值_(info.sheet, info.row, '排序', sort);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者LINE_USER_ID', lineUserId);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者姓名', identity.姓名 || p.admin.姓名 || '');
  製造工具75_寫欄位值_(info.sheet, info.row, '更新時間', new Date());

  製造工具75_寫操作紀錄_(
    事件,
    lineUserId,
    '調整排序',
    toolId,
    String(before),
    String(sort),
    '完成',
    idem
  );

  製造工具75_回覆文字_(
    replyToken,
    '✅ 排序已更新\n工具：' +
    String(info.data.顯示名稱 || toolId) +
    '\n新排序：' +
    sort
  );

  return { 成功: true, 動作: '調整排序', 工具編號: toolId };
}


/* ============================================================
 * 冪等與操作紀錄
 * ============================================================ */

function 製造工具75_事件冪等鍵_(事件, action, toolId) {
  var eventId = String(
    (事件 && 事件.webhookEventId) ||
    (事件 && 事件.message && 事件.message.id) ||
    (事件 && 事件.replyToken) ||
    Utilities.getUuid()
  ).trim();

  var raw = [
    'TOOL75',
    action || '',
    toolId || '',
    eventId
  ].join('|');

  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );

  return 'TOOL75_' +
    Utilities.base64EncodeWebSafe(digest)
      .replace(/=+$/g, '')
      .slice(0, 40);
}


function 製造工具75_已完成冪等_(idempotencyKey) {
  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_操作紀錄表名稱_);

  if (!sh || sh.getLastRow() < 2) return false;

  var header = 製造工具75_表頭_(sh);
  var idx = header.indexOf('idempotencyKey');
  var resultIdx = header.indexOf('結果');

  if (idx < 0 || resultIdx < 0) return false;

  var values = sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getValues();

  return values.some(function (row) {
    return (
      String(row[idx] || '') === String(idempotencyKey || '') &&
      String(row[resultIdx] || '') === '完成'
    );
  });
}


function 製造工具75_寫操作紀錄_(事件, lineUserId, action, toolId, before, after, result, idempotencyKey) {
  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_操作紀錄表名稱_);

  var identity = 製造工具75_取得身份_(lineUserId);
  var eventId = String(
    (事件 && 事件.webhookEventId) ||
    (事件 && 事件.message && 事件.message.id) ||
    ''
  );

  製造工具75_新增資料列_(sh, {
    時間戳: new Date(),
    eventId: eventId,
    idempotencyKey: idempotencyKey || '',
    LINE_USER_ID: lineUserId || '',
    工號: identity.工號 || '',
    姓名: identity.姓名 || '',
    動作: action || '',
    工具編號: toolId || '',
    修改前: before || '',
    修改後: after || '',
    結果: result || '',
    備註: 製造工具75_版本_
  });
}


/* ============================================================
 * 共用表格工具
 * ============================================================ */

function 製造工具75_讀表物件_(sh) {
  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 1) return [];

  var data = sh.getDataRange().getValues();
  var header = data.shift().map(function (v) {
    return String(v || '').trim();
  });

  return data.map(function (row, index) {
    var obj = { __row: index + 2 };

    header.forEach(function (h, i) {
      if (h) obj[h] = row[i];
    });

    return obj;
  }).filter(function (obj) {
    return header.some(function (h) {
      return h && String(obj[h] == null ? '' : obj[h]).trim() !== '';
    });
  });
}


function 製造工具75_表頭_(sh) {
  if (!sh || sh.getLastColumn() < 1) return [];

  return sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(function (v) {
      return String(v || '').trim();
    });
}


function 製造工具75_新增資料列_(sh, obj) {
  var header = 製造工具75_表頭_(sh);
  var row = header.map(function (h) {
    return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '';
  });

  sh.appendRow(row);
  return sh.getLastRow();
}


function 製造工具75_寫欄位值_(sh, row, columnName, value) {
  var header = 製造工具75_表頭_(sh);
  var idx = header.indexOf(columnName);

  if (idx < 0) throw new Error('找不到欄位：' + columnName);

  sh.getRange(row, idx + 1).setValue(value);
}


function 製造工具75_取得工具資料_(toolId) {
  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_工作表名稱_);

  var rows = 製造工具75_讀表物件_(sh);

  var data = rows.filter(function (r) {
    return String(r.工具編號 || '').trim() === String(toolId || '').trim();
  })[0];

  if (!data) return null;

  return {
    sheet: sh,
    row: data.__row,
    data: data
  };
}


function 製造工具75_解析KeyValue_(text) {
  var lines = String(text || '').split(/\r?\n/);
  var obj = {};

  lines.forEach(function (line, index) {
    if (index === 0) return;

    var m = String(line).match(/^\s*([^=＝]+?)\s*[=＝]\s*(.*?)\s*$/);
    if (m) {
      obj[String(m[1]).trim()] = String(m[2]).trim();
    }
  });

  return obj;
}


function 製造工具75_產生工具編號_(name) {
  var slug = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 18);

  if (!slug) slug = 'AUTO';

  return 'TOOL-' +
    slug +
    '-' +
    Utilities.getUuid()
      .replace(/-/g, '')
      .slice(0, 6)
      .toUpperCase();
}


/* ============================================================
 * URI / 圖片 / Token / Reply
 * ============================================================ */

function 製造工具75_LINE內開網址_(url) {
  var text = String(url || '').trim();
  if (!text || !/^https:\/\//i.test(text)) return text;

  text = text
    .replace(/([?&])openExternalBrowser=(?:1|true)(?:&|$)/ig, '$1')
    .replace(/([?&])externalBrowser=(?:1|true)(?:&|$)/ig, '$1')
    .replace(/([?&])來源=([^&]*)/ig, '$1source=$2')
    .replace(/[?&]$/, '')
    .replace(/\?&/, '?')
    .replace(/&&+/g, '&');

  if (!/[?&]source=/i.test(text)) {
    text += (text.indexOf('?') >= 0 ? '&' : '?') + 'source=LINEBOT_TOOL';
  }

  try {
    return encodeURI(text);
  } catch (ignore) {
    return text;
  }
}


function 製造工具75_補預設圖片_(name, imageUrl) {
  var url = String(imageUrl || '').trim();
  if (/^https:\/\//i.test(url)) return url;

  var n = String(name || '').replace(/\s+/g, '');

  if (/智慧5S|5S/i.test(n)) return 製造工具75_智慧5S預設圖片_;

  return '';
}


function 製造工具75_轉布林值_(value) {
  if (value === true) return true;

  var text = String(value == null ? '' : value)
    .trim()
    .toUpperCase();

  return ['TRUE', '1', 'Y', 'YES', '是', '啟用', '開啟'].indexOf(text) >= 0;
}


function 製造工具75_取得Token_() {
  var token = '';

  try {
    if (typeof RichMenu38_取得Token_ === 'function') {
      token = String(RichMenu38_取得Token_() || '').trim();
      if (token) return token;
    }
  } catch (ignore1) {}

  try {
    if (typeof 取得LINEToken_ === 'function') {
      token = String(取得LINEToken_() || '').trim();
      if (token) return token;
    }
  } catch (ignore2) {}

  var props = PropertiesService.getScriptProperties();

  ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_ACCESS_TOKEN', 'CHANNEL_ACCESS_TOKEN']
    .some(function (name) {
      token = String(props.getProperty(name) || '').trim();
      return !!token;
    });

  return token;
}


function 製造工具75_回覆LINE_(replyToken, messages) {
  var token = 製造工具75_取得Token_();
  if (!token) throw new Error('75_LINE 找不到 LINE Channel Access Token');

  var payload = {
    replyToken: replyToken,
    messages: Array.isArray(messages) ? messages : [messages]
  };

  var response = UrlFetchApp.fetch(
    製造工具75_LINE回覆網址_,
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
  );

  var code = response.getResponseCode();
  var body = response.getContentText();

  console.log('75_LINE Reply HTTP=' + code + ' BODY=' + body);

  if (code < 200 || code >= 300) {
    throw new Error(
      'LINE Reply API 失敗：HTTP ' +
      code +
      '｜' +
      body
    );
  }

  return true;
}


function 製造工具75_回覆文字_(replyToken, text) {
  return 製造工具75_回覆LINE_(
    replyToken,
    [{
      type: 'text',
      text: String(text || '').slice(0, 4900)
    }]
  );
}



/* ============================================================
 * 製造工具管理 PWA v1.0
 * - 不建立第二個 Web App
 * - 使用原正式 Web App
 * - 短效 HMAC Token + 管理員白名單雙重驗證
 * ============================================================ */

function 製造工具75_取得管理密鑰_() {
  var props = PropertiesService.getScriptProperties();
  var secret = String(
    props.getProperty(製造工具75_管理密鑰屬性Key_) || ''
  ).trim();

  if (!secret) {
    secret = [
      Utilities.getUuid(),
      Utilities.getUuid(),
      String(new Date().getTime())
    ].join('|');

    props.setProperty(
      製造工具75_管理密鑰屬性Key_,
      secret
    );
  }

  return secret;
}


function 製造工具75_Base64Url文字_(文字) {
  return Utilities
    .base64EncodeWebSafe(
      String(文字 || ''),
      Utilities.Charset.UTF_8
    )
    .replace(/=+$/g, '');
}


function 製造工具75_Base64Url還原文字_(encoded) {
  var s = String(encoded || '');
  while (s.length % 4) s += '=';

  return Utilities
    .newBlob(
      Utilities.base64DecodeWebSafe(s)
    )
    .getDataAsString('UTF-8');
}


function 製造工具75_簽章_(payload64) {
  return Utilities
    .base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(
        String(payload64 || ''),
        製造工具75_取得管理密鑰_(),
        Utilities.Charset.UTF_8
      )
    )
    .replace(/=+$/g, '');
}


function 製造工具75_產生管理Token_(lineUserId) {
  var id = String(lineUserId || '').trim();

  if (!製造工具75_是否管理員_(id)) {
    throw new Error('只有製造工具管理員可建立管理 PWA Token');
  }

  var now = Math.floor(new Date().getTime() / 1000);

  var payload = {
    v: 1,
    uid: id,
    iat: now,
    exp: now + Number(製造工具75_管理Token效期秒_ || 1800),
    nonce: Utilities.getUuid().replace(/-/g, '').slice(0, 16)
  };

  var payload64 = 製造工具75_Base64Url文字_(
    JSON.stringify(payload)
  );

  return payload64 + '.' + 製造工具75_簽章_(payload64);
}


function 製造工具75_安全字串比較_(a, b) {
  a = String(a || '');
  b = String(b || '');

  if (a.length !== b.length) return false;

  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}


function 製造工具75_驗證管理Token_(token) {
  var parts = String(token || '').split('.');

  if (parts.length !== 2) {
    throw new Error('管理憑證格式錯誤，請從 LINE 重新開啟工具管理。');
  }

  var expected = 製造工具75_簽章_(parts[0]);

  if (!製造工具75_安全字串比較_(expected, parts[1])) {
    throw new Error('管理憑證驗證失敗，請從 LINE 重新開啟工具管理。');
  }

  var payload;

  try {
    payload = JSON.parse(
      製造工具75_Base64Url還原文字_(parts[0])
    );
  } catch (e) {
    throw new Error('管理憑證內容錯誤。');
  }

  var now = Math.floor(new Date().getTime() / 1000);

  if (
    !payload ||
    Number(payload.v) !== 1 ||
    !String(payload.uid || '').trim() ||
    Number(payload.exp || 0) < now
  ) {
    throw new Error('管理憑證已過期，請回 LINE 再次點「製造工具」。');
  }

  var admin = 製造工具75_取得管理員_(payload.uid);

  if (!admin) {
    throw new Error('此帳號目前沒有製造工具管理權限。');
  }

  return {
    uid: String(payload.uid),
    exp: Number(payload.exp),
    admin: admin
  };
}


function 製造工具75_建立管理PWA網址_(lineUserId) {
  var token = 製造工具75_產生管理Token_(lineUserId);

  return (
    製造工具75_管理PWA基底網址_ +
    '?token=' +
    encodeURIComponent(token) +
    '&source=LINEBOT_TOOL_ADMIN'
  );
}


function 製造工具75_取得全部工具_() {
  製造工具75_確保結構_();

  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_工作表名稱_);

  var rows = 製造工具75_讀表物件_(sh)
    .map(function (r) {
      return {
        工具編號: String(r.工具編號 || '').trim(),
        排序: Number(r.排序 || 9999),
        顯示名稱: String(r.顯示名稱 || '').trim(),
        說明: String(r.說明 || '').trim(),
        圖片網址: String(r.圖片網址 || '').trim(),
        PWA網址: String(r.PWA網址 || '').trim(),
        分類: String(r.分類 || '製造工具').trim(),
        啟用: 製造工具75_轉布林值_(r.啟用),
        按鈕文字: String(r.按鈕文字 || '立即開啟').trim(),
        備註: String(r.備註 || '').trim(),
        更新時間: r.更新時間 || ''
      };
    })
    .filter(function (r) {
      return !!(r.工具編號 || r.顯示名稱);
    });

  rows.sort(function (a, b) {
    var n = Number(a.排序 || 9999) - Number(b.排序 || 9999);
    if (n) return n;
    return String(a.顯示名稱 || '').localeCompare(String(b.顯示名稱 || ''), 'zh-Hant');
  });

  return rows;
}


function 製造工具75_PWA_解析JSON_(值) {
  if (值 && typeof 值 === 'object') return 值;

  var text = String(值 || '').trim();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('PWA payload 不是有效 JSON。');
  }
}


function 製造工具75_PWA_管理員摘要_(auth) {
  var a = auth.admin || {};

  return {
    LINE_USER_ID: auth.uid,
    工號: a.工號 || '',
    姓名: a.姓名 || '',
    角色: a.角色 || '工具管理員',
    權限等級: a.權限等級 || '',
    可新增工具: 製造工具75_轉布林值_(a.可新增工具),
    可更換圖片: 製造工具75_轉布林值_(a.可更換圖片),
    可啟用停用: 製造工具75_轉布林值_(a.可啟用停用),
    可調整排序: 製造工具75_轉布林值_(a.可調整排序),
    tokenExpiresAt: auth.exp
  };
}


function 製造工具75_PWA_要求確認_(參數) {
  var ok = String(
    參數.confirm ||
    參數.confirmed ||
    參數['確認'] ||
    ''
  ).trim().toUpperCase();

  if (['YES', 'TRUE', '1', 'CONFIRM', '確認'].indexOf(ok) < 0) {
    throw new Error('此正式異動需要管理員再次確認。');
  }
}


function 製造工具75_PWA_檢查權限_(auth, capability) {
  var p = 製造工具75_檢查權限_(auth.uid, capability);

  if (!p.success) {
    throw new Error(p.message || '管理員權限不足。');
  }

  return p;
}


function 製造工具75_PWA_正規冪等鍵_(key, action, toolId, userId) {
  var k = String(key || '').trim();

  if (/^[A-Za-z0-9_.:-]{12,180}$/.test(k)) {
    return 'TOOL75_PWA_' + k;
  }

  var raw = [
    'TOOL75_PWA',
    action || '',
    toolId || '',
    userId || '',
    k || Utilities.getUuid()
  ].join('|');

  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );

  return (
    'TOOL75_PWA_' +
    Utilities
      .base64EncodeWebSafe(digest)
      .replace(/=+$/g, '')
      .slice(0, 42)
  );
}


function 製造工具75_PWA_寫紀錄_(
  auth,
  action,
  toolId,
  before,
  after,
  result,
  idempotencyKey,
  eventId
) {
  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_操作紀錄表名稱_);

  var admin = auth.admin || {};

  製造工具75_新增資料列_(
    sh,
    {
      時間戳: new Date(),
      eventId: String(eventId || ''),
      idempotencyKey: String(idempotencyKey || ''),
      LINE_USER_ID: auth.uid,
      工號: admin.工號 || '',
      姓名: admin.姓名 || '',
      動作: action || '',
      工具編號: toolId || '',
      修改前: before == null ? '' : String(before),
      修改後: after == null ? '' : String(after),
      結果: result || '',
      備註: 製造工具75_版本_ + '｜PWA'
    }
  );
}


function 製造工具75_取得圖片資料夾_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = String(
    props.getProperty(製造工具75_圖片資料夾屬性Key_) || ''
  ).trim();

  if (folderId) {
    try {
      var found = DriveApp.getFolderById(folderId);
      if (!found.isTrashed()) return found;
    } catch (ignore) {}
  }

  var folder = DriveApp.createFolder(
    製造工具75_圖片資料夾名稱_
  );

  props.setProperty(
    製造工具75_圖片資料夾屬性Key_,
    folder.getId()
  );

  return folder;
}


function 製造工具75_PWA_儲存圖片_(toolId, dataUrl, fileName) {
  var raw = String(dataUrl || '').trim();

  var match = raw.match(
    /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i
  );

  if (!match) {
    throw new Error('圖片格式只接受 JPEG、PNG、WebP。');
  }

  var mime = String(match[1]).toLowerCase().replace('image/jpg', 'image/jpeg');
  var bytes = Utilities.base64Decode(
    String(match[2]).replace(/\s+/g, '')
  );

  if (!bytes.length) {
    throw new Error('圖片內容是空白。');
  }

  if (bytes.length > 3 * 1024 * 1024) {
    throw new Error('圖片上傳後仍超過 3 MB，請重新選擇較小照片。');
  }

  var ext = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  }[mime] || 'jpg';

  var safeToolId = String(toolId || 'TOOL')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 60);

  var stamp = Utilities.formatDate(
    new Date(),
    'Asia/Taipei',
    'yyyyMMdd_HHmmss'
  );

  var name = (
    safeToolId +
    '_' +
    stamp +
    '_' +
    Utilities.getUuid().replace(/-/g, '').slice(0, 6) +
    '.' +
    ext
  );

  var folder = 製造工具75_取得圖片資料夾_();

  var file = folder.createFile(
    Utilities.newBlob(
      bytes,
      mime,
      name
    )
  );

  try {
    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );
  } catch (e) {
    file.setTrashed(true);
    throw new Error(
      'Google Drive 無法將卡片圖片設為可公開讀取；目前網域分享政策不允許 LINE 讀圖。'
    );
  }

  var url =
    'https://drive.google.com/thumbnail?id=' +
    encodeURIComponent(file.getId()) +
    '&sz=w1600';

  var test = UrlFetchApp.fetch(
    url,
    {
      method: 'get',
      followRedirects: true,
      muteHttpExceptions: true
    }
  );

  var code = test.getResponseCode();
  var type = String(
    test.getHeaders()['Content-Type'] ||
    test.getBlob().getContentType() ||
    ''
  ).toLowerCase();

  if (
    code < 200 ||
    code >= 300 ||
    type.indexOf('image/') !== 0
  ) {
    file.setTrashed(true);

    throw new Error(
      '圖片已上傳但 LINE 無法公開讀取，HTTP ' +
      code +
      '／' +
      type
    );
  }

  return {
    url: url,
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType: mime,
    bytes: bytes.length
  };
}


function 製造工具75_PWA_新增工具_(auth, 參數, payload) {
  製造工具75_PWA_檢查權限_(auth, 'add');
  製造工具75_PWA_要求確認_(參數);

  var name = String(payload.顯示名稱 || payload.name || '').trim();
  var pwa = String(payload.PWA網址 || payload.url || '').trim();
  var imageDataUrl = String(payload.imageDataUrl || '').trim();
  var imageUrl = String(payload.圖片網址 || payload.imageUrl || '').trim();
  var sort = Number(payload.排序 == null ? 999 : payload.排序);

  if (!name) throw new Error('請輸入工具名稱。');
  if (!/^https:\/\//i.test(pwa)) throw new Error('PWA 網址必須是 https://');
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error('圖片網址必須是 https://');
  if (!isFinite(sort) || sort < 0 || sort > 9999) throw new Error('排序必須是 0～9999。');

  var toolId = String(payload.工具編號 || payload.toolId || '').trim();
  if (!toolId) toolId = 製造工具75_產生工具編號_(name);

  if (製造工具75_取得工具資料_(toolId)) {
    throw new Error('工具編號已存在：' + toolId);
  }

  var idem = 製造工具75_PWA_正規冪等鍵_(
    參數.idempotencyKey,
    'ADD',
    toolId,
    auth.uid
  );

  if (製造工具75_已完成冪等_(idem)) {
    return {
      success: true,
      duplicated: true,
      message: '此新增請求已完成，已安全略過重送。',
      toolId: toolId
    };
  }

  var uploaded = null;

  if (imageDataUrl) {
    uploaded = 製造工具75_PWA_儲存圖片_(
      toolId,
      imageDataUrl,
      payload.fileName || ''
    );
    imageUrl = uploaded.url;
  }

  var admin = auth.admin || {};
  var now = new Date();

  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_工作表名稱_);

  製造工具75_新增資料列_(
    sh,
    {
      工具編號: toolId,
      排序: sort,
      顯示名稱: name,
      說明: String(payload.說明 || payload.description || '').trim(),
      圖片網址: imageUrl,
      PWA網址: pwa,
      分類: String(payload.分類 || payload.category || '製造工具').trim(),
      啟用: true,
      按鈕文字: String(payload.按鈕文字 || payload.buttonText || '立即開啟').trim(),
      備註: String(payload.備註 || '').trim(),
      建立者LINE_USER_ID: auth.uid,
      建立者姓名: admin.姓名 || '',
      建立時間: now,
      更新者LINE_USER_ID: auth.uid,
      更新者姓名: admin.姓名 || '',
      更新時間: now
    }
  );

  製造工具75_PWA_寫紀錄_(
    auth,
    'PWA新增工具',
    toolId,
    '',
    JSON.stringify({
      顯示名稱: name,
      PWA網址: pwa,
      圖片網址: imageUrl,
      排序: sort
    }),
    '完成',
    idem,
    參數.eventId
  );

  return {
    success: true,
    message: '工具已新增。',
    toolId: toolId,
    image: uploaded
  };
}


function 製造工具75_PWA_更換圖片_(auth, 參數, payload) {
  製造工具75_PWA_檢查權限_(auth, 'image');
  製造工具75_PWA_要求確認_(參數);

  var toolId = String(payload.工具編號 || payload.toolId || '').trim();
  var imageDataUrl = String(payload.imageDataUrl || '').trim();

  if (!toolId) throw new Error('缺少工具編號。');
  if (!imageDataUrl) throw new Error('請先選擇照片。');

  var info = 製造工具75_取得工具資料_(toolId);
  if (!info) throw new Error('找不到工具：' + toolId);

  var idem = 製造工具75_PWA_正規冪等鍵_(
    參數.idempotencyKey,
    'IMAGE',
    toolId,
    auth.uid
  );

  if (製造工具75_已完成冪等_(idem)) {
    return {
      success: true,
      duplicated: true,
      message: '此換圖請求已完成，已安全略過重送。',
      toolId: toolId
    };
  }

  var uploaded = 製造工具75_PWA_儲存圖片_(
    toolId,
    imageDataUrl,
    payload.fileName || ''
  );

  var before = String(info.data.圖片網址 || '');
  var admin = auth.admin || {};

  製造工具75_寫欄位值_(info.sheet, info.row, '圖片網址', uploaded.url);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者LINE_USER_ID', auth.uid);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者姓名', admin.姓名 || '');
  製造工具75_寫欄位值_(info.sheet, info.row, '更新時間', new Date());

  製造工具75_PWA_寫紀錄_(
    auth,
    'PWA更換圖片',
    toolId,
    before,
    uploaded.url,
    '完成',
    idem,
    參數.eventId
  );

  return {
    success: true,
    message: '卡片圖片已更新。',
    toolId: toolId,
    image: uploaded
  };
}


function 製造工具75_PWA_啟停_(auth, 參數, payload) {
  製造工具75_PWA_檢查權限_(auth, 'enable');
  製造工具75_PWA_要求確認_(參數);

  var toolId = String(payload.工具編號 || payload.toolId || '').trim();
  var enabled =
    payload.啟用 === true ||
    String(payload.enabled || payload.啟用 || '').toUpperCase() === 'TRUE';

  if (!toolId) throw new Error('缺少工具編號。');

  var info = 製造工具75_取得工具資料_(toolId);
  if (!info) throw new Error('找不到工具：' + toolId);

  var idem = 製造工具75_PWA_正規冪等鍵_(
    參數.idempotencyKey,
    enabled ? 'ENABLE' : 'DISABLE',
    toolId,
    auth.uid
  );

  if (製造工具75_已完成冪等_(idem)) {
    return {
      success: true,
      duplicated: true,
      message: '此啟停請求已完成，已安全略過重送。',
      toolId: toolId,
      enabled: enabled
    };
  }

  var before = 製造工具75_轉布林值_(info.data.啟用);
  var admin = auth.admin || {};

  製造工具75_寫欄位值_(info.sheet, info.row, '啟用', enabled);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者LINE_USER_ID', auth.uid);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者姓名', admin.姓名 || '');
  製造工具75_寫欄位值_(info.sheet, info.row, '更新時間', new Date());

  製造工具75_PWA_寫紀錄_(
    auth,
    enabled ? 'PWA啟用工具' : 'PWA停用工具',
    toolId,
    String(before),
    String(enabled),
    '完成',
    idem,
    參數.eventId
  );

  return {
    success: true,
    message: enabled ? '工具已啟用。' : '工具已停用。',
    toolId: toolId,
    enabled: enabled
  };
}


function 製造工具75_PWA_排序_(auth, 參數, payload) {
  製造工具75_PWA_檢查權限_(auth, 'sort');
  製造工具75_PWA_要求確認_(參數);

  var toolId = String(payload.工具編號 || payload.toolId || '').trim();
  var sort = Number(payload.排序 == null ? payload.sort : payload.排序);

  if (!toolId) throw new Error('缺少工具編號。');
  if (!isFinite(sort) || sort < 0 || sort > 9999) {
    throw new Error('排序必須是 0～9999。');
  }

  var info = 製造工具75_取得工具資料_(toolId);
  if (!info) throw new Error('找不到工具：' + toolId);

  var idem = 製造工具75_PWA_正規冪等鍵_(
    參數.idempotencyKey,
    'SORT',
    toolId,
    auth.uid
  );

  if (製造工具75_已完成冪等_(idem)) {
    return {
      success: true,
      duplicated: true,
      message: '此排序請求已完成，已安全略過重送。',
      toolId: toolId,
      sort: sort
    };
  }

  var before = info.data.排序;
  var admin = auth.admin || {};

  製造工具75_寫欄位值_(info.sheet, info.row, '排序', sort);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者LINE_USER_ID', auth.uid);
  製造工具75_寫欄位值_(info.sheet, info.row, '更新者姓名', admin.姓名 || '');
  製造工具75_寫欄位值_(info.sheet, info.row, '更新時間', new Date());

  製造工具75_PWA_寫紀錄_(
    auth,
    'PWA調整排序',
    toolId,
    String(before),
    String(sort),
    '完成',
    idem,
    參數.eventId
  );

  return {
    success: true,
    message: '排序已更新。',
    toolId: toolId,
    sort: sort
  };
}


function LINE製造工具75_PWA_接收_(請求) {
  var 參數 = Object.assign(
    {},
    請求 && 請求.parameter || {}
  );

  var action = String(
    參數.action ||
    參數['動作'] ||
    ''
  ).trim();

  if (action.indexOf('TOOL75_PWA_') !== 0) {
    return null;
  }

  try {
    製造工具75_確保結構_();

    var auth = 製造工具75_驗證管理Token_(
      參數.adminToken ||
      參數.token ||
      ''
    );

    var payload = 製造工具75_PWA_解析JSON_(
      參數.payload ||
      參數['資料'] ||
      '{}'
    );

    var lock = null;
    var locked = false;
    var result;

    if (action === 'TOOL75_PWA_INIT') {
      result = {
        success: true,
        version: 製造工具75_版本_,
        admin: 製造工具75_PWA_管理員摘要_(auth),
        tools: 製造工具75_取得全部工具_()
      };

    } else {
      lock = LockService.getScriptLock();
      locked = lock.tryLock(8000);

      if (!locked) {
        throw new Error('另一筆工具管理異動正在處理，請稍後再試。');
      }

      if (action === 'TOOL75_PWA_ADD') {
        result = 製造工具75_PWA_新增工具_(auth, 參數, payload);

      } else if (action === 'TOOL75_PWA_IMAGE') {
        result = 製造工具75_PWA_更換圖片_(auth, 參數, payload);

      } else if (action === 'TOOL75_PWA_TOGGLE') {
        result = 製造工具75_PWA_啟停_(auth, 參數, payload);

      } else if (action === 'TOOL75_PWA_SORT') {
        result = 製造工具75_PWA_排序_(auth, 參數, payload);

      } else {
        throw new Error('不支援的製造工具管理動作：' + action);
      }
    }

    if (!result) result = { success: true };

    result.version = 製造工具75_版本_;
    result.admin = 製造工具75_PWA_管理員摘要_(auth);
    result.tools = 製造工具75_取得全部工具_();

    return result;

  } catch (error) {
    return {
      success: false,
      version: 製造工具75_版本_,
      message: String(
        error && error.message || error
      ),
      errors: [
        String(
          error && error.message || error
        )
      ]
    };

  } finally {
    try {
      if (typeof lock !== 'undefined' && lock && locked) {
        lock.releaseLock();
      }
    } catch (ignore) {}
  }
}


function 驗證75_LINE製造工具管理PWA_v140() {
  var result = {
    success: false,
    version: 製造工具75_版本_,
    pwaUrl: 製造工具75_管理PWA基底網址_,
    pwaReceiver: typeof LINE製造工具75_PWA_接收_ === 'function',
    tokenSecretReady: false,
    adminCount: 0,
    toolCount: 0,
    errors: []
  };

  try {
    製造工具75_確保結構_();
    result.tokenSecretReady = !!製造工具75_取得管理密鑰_();
    result.adminCount = 製造工具75_讀取管理員_().length;
    result.toolCount = 製造工具75_取得全部工具_().length;
  } catch (e) {
    result.errors.push(String(e && e.message || e));
  }

  result.success =
    result.pwaReceiver &&
    result.tokenSecretReady &&
    result.adminCount > 0 &&
    result.toolCount > 0 &&
    result.errors.length === 0;

  console.log(JSON.stringify(result, null, 2));
  return result;
}


/* ============================================================
 * 診斷 / 驗證
 * ============================================================ */

function 診斷75_LINE製造工具中心_v131() {
  var result = {
    success: false,
    version: 製造工具75_版本_,
    structure: false,
    token: false,
    tools: [],
    admins: [],
    errors: []
  };

  try {
    製造工具75_確保結構_();
    result.structure = true;
  } catch (e1) {
    result.errors.push('結構：' + e1.message);
  }

  try {
    result.token = !!製造工具75_取得Token_();
  } catch (e2) {
    result.errors.push('Token：' + e2.message);
  }

  try {
    result.tools = 製造工具75_取得完整工具清單_();
  } catch (e3) {
    result.errors.push('工具：' + e3.message);
  }

  try {
    result.admins = 製造工具75_讀取管理員_().map(function (r) {
      return {
        LINE_USER_ID: r.LINE_USER_ID,
        姓名: r.姓名,
        角色: r.角色,
        權限等級: r.權限等級
      };
    });
  } catch (e4) {
    result.errors.push('管理員：' + e4.message);
  }

  result.success =
    result.structure &&
    result.token &&
    result.tools.length > 0 &&
    result.errors.length === 0;

  console.log(JSON.stringify(result, null, 2));
  return result;
}


function 驗證75_LINE製造工具Flex_API_v131() {
  var result = {
    success: false,
    version: 製造工具75_版本_,
    toolCount: 0,
    flexCardCount: 0,
    validateHttp: 0,
    validateBody: '',
    errors: []
  };

  try {
    製造工具75_確保結構_();

    var tools = 製造工具75_取得完整工具清單_();
    result.toolCount = tools.length;

    // 強制加入管理卡，確保正式管理員看到的 Flex 也通過 LINE 驗證。
    // 管理卡現在會產生短效簽章 PWA URL，因此驗證時必須使用真實管理員。
    var adminsForValidation = 製造工具75_讀取管理員_();

    if (!adminsForValidation.length) {
      throw new Error('尚未設定製造工具管理員，無法驗證管理 PWA 卡片。');
    }

    var flex = 製造工具75_建立Flex訊息_(
      tools,
      String(adminsForValidation[0].LINE_USER_ID || ''),
      true
    );
    result.flexCardCount = flex.contents.contents.length;

    var token = 製造工具75_取得Token_();
    if (!token) throw new Error('找不到 LINE Channel Access Token');

    var response = UrlFetchApp.fetch(
      'https://api.line.me/v2/bot/message/validate/reply',
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          Authorization: 'Bearer ' + token
        },
        payload: JSON.stringify({
          messages: [flex]
        }),
        muteHttpExceptions: true
      }
    );

    result.validateHttp = response.getResponseCode();
    result.validateBody = response.getContentText() || '';

    if (result.validateHttp !== 200) {
      result.errors.push(
        'LINE Flex 驗證失敗 HTTP ' +
        result.validateHttp +
        '：' +
        result.validateBody
      );
    }

    result.success =
      result.validateHttp === 200 &&
      result.errors.length === 0;

  } catch (error) {
    result.errors.push(
      String(error && error.message || error)
    );
  }

  console.log(JSON.stringify(result, null, 2));
  return result;
}


function 驗證75_LINE製造工具Flex_API_v140() {
  return 驗證75_LINE製造工具Flex_API_v131();
}


/**
 * 手動設定第一位管理員用。
 * 只需改下方 lineUserId 後執行一次。
 * 若不想硬編碼，可直接在「LINE_製造工具管理員」新增一列。
 */
function 設定75_LINE製造工具管理員(lineUserId) {
  製造工具75_確保結構_();

  var id = String(lineUserId || '').trim();
  if (!id) {
    throw new Error(
      '請以程式呼叫：設定75_LINE製造工具管理員("Uxxxxxxxx")'
    );
  }

  var existing = 製造工具75_取得管理員_(id);
  if (existing) {
    return {
      success: true,
      message: '此 LINE_USER_ID 已是製造工具管理員',
      LINE_USER_ID: id
    };
  }

  var identity = 製造工具75_取得身份_(id);
  var sh = SpreadsheetApp
    .openById(製造工具75_正式主庫ID_)
    .getSheetByName(製造工具75_管理員表名稱_);

  製造工具75_新增資料列_(sh, {
    啟用: true,
    LINE_USER_ID: id,
    工號: identity.工號 || '',
    姓名: identity.姓名 || '',
    角色: identity.角色 || '工具管理員',
    權限等級: identity.權限等級 || '',
    可新增工具: true,
    可更換圖片: true,
    可啟用停用: true,
    可調整排序: true,
    備註: '手動設定主管理員',
    更新時間: new Date()
  });

  return {
    success: true,
    message: '製造工具管理員已建立',
    LINE_USER_ID: id,
    姓名: identity.姓名 || ''
  };
}
