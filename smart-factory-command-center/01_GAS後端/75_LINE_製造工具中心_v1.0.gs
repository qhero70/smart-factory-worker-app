/**
 * 化新精密｜75_LINE 製造工具中心
 * 版本：v1.1.2
 *
 * 功能：
 * 1. 接收 LINE「製造工具」固定指令。
 * 2. 從正式主庫 LINE_製造工具中心 動態讀取啟用工具。
 * 3. 回傳 Flex Carousel 圖片輪播。
 * 4. 設定表異常時以智慧5S安全預設卡片回覆。
 * 5. 不建立第二個 LINE Bot、不建立第二個 Web App。
 */

const 製造工具75_版本_ = 'v1.1.1_LINE內開圖片HeroFlex';
const 製造工具75_正式主庫ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
const 製造工具75_工作表名稱_ = 'LINE_製造工具中心';
const 製造工具75_LINE回覆網址_ = 'https://api.line.me/v2/bot/message/reply';
const 製造工具75_智慧5S正式網址_ = 'https://qhero70.github.io/smart-factory-worker-app/5s/';
const 製造工具75_智慧5S預設圖片_ = 'https://qhero70.github.io/smart-factory-worker-app/5s/assets/a5/SITE-A5-008.jpg';

function LINE製造工具75_嘗試處理Webhook_(內容) {
  try {
    if (!內容 || !Array.isArray(內容.events) || 內容.events.length === 0) return null;

    var 事件 = 內容.events[0];
    if (!製造工具75_是否為製造工具事件_(事件)) return null;

    var replyToken = String(事件.replyToken || '').trim();
    if (!replyToken) throw new Error('75_LINE 缺少 replyToken');

    var 工具清單 = [];
    try {
      工具清單 = 製造工具75_讀取工具設定_();
    } catch (設定錯誤) {
      console.error(
        '75_LINE 設定表讀取失敗：' +
        String(設定錯誤 && 設定錯誤.message ? 設定錯誤.message : 設定錯誤)
      );
    }

    if (!工具清單.length) {
      工具清單 = 製造工具75_取得預設工具_();
    }

    var flex = 製造工具75_建立Flex訊息_(工具清單);
    製造工具75_回覆LINE_(replyToken, flex);

    var 結果 = {
      已處理: true,
      已部分處理: false,
      處理筆數: 1,
      模組: '75_LINE_製造工具中心',
      版本: 製造工具75_版本_,
      工具數量: 工具清單.length
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

function 製造工具75_是否為製造工具事件_(事件) {
  if (!事件) return false;

  if (
    事件.type === 'message' &&
    事件.message &&
    事件.message.type === 'text'
  ) {
    var 文字 = String(事件.message.text || '')
      .replace(/\u3000/g, '')
      .replace(/\s+/g, '')
      .trim();

    return [
      '製造工具',
      '製造工具中心',
      '工具中心',
      '更多工具',
      '其他工具'
    ].indexOf(文字) >= 0;
  }

  if (事件.type === 'postback' && 事件.postback) {
    var data = String(事件.postback.data || '').trim();

    return (
      data.indexOf('action=manufacturing_tools') >= 0 ||
      data.indexOf('action=製造工具') >= 0
    );
  }

  return false;
}

function 製造工具75_取得預設工具_() {
  return [
    {
      排序: 10,
      顯示名稱: '智慧5S',
      說明: '巡檢、歷史與改善',
      分類: '現場管理',
      圖片網址: 製造工具75_智慧5S預設圖片_,
      PWA網址: 製造工具75_智慧5S正式網址_,
      按鈕文字: '立即開啟'
    }
  ];
}

function 製造工具75_讀取工具設定_() {
  var 試算表 = SpreadsheetApp.openById(製造工具75_正式主庫ID_);
  var 工作表 = 試算表.getSheetByName(製造工具75_工作表名稱_);

  if (!工作表) return [];

  var 最後列 = 工作表.getLastRow();
  var 最後欄 = 工作表.getLastColumn();

  if (最後列 < 2 || 最後欄 < 1) return [];

  var 資料 = 工作表
    .getRange(1, 1, 最後列, 最後欄)
    .getValues();

  var 標題 = 資料[0].map(function (值) {
    return String(值 || '').trim();
  });

  var 必要欄位 = [
    '排序',
    '顯示名稱',
    '說明',
    '圖片網址',
    'PWA網址',
    '分類',
    '啟用',
    '按鈕文字'
  ];

  var 缺少 = 必要欄位.filter(function (名稱) {
    return 標題.indexOf(名稱) < 0;
  });

  if (缺少.length) {
    throw new Error(
      'LINE_製造工具中心 缺少欄位：' +
      缺少.join('、')
    );
  }

  function 取值(列, 名稱) {
    var 索引 = 標題.indexOf(名稱);
    return 索引 >= 0 ? 列[索引] : '';
  }

  var 工具 = [];

  for (var i = 1; i < 資料.length; i++) {
    var 列 = 資料[i];

    if (
      !製造工具75_轉布林值_(
        取值(列, '啟用')
      )
    ) {
      continue;
    }

    var 顯示名稱 = String(
      取值(列, '顯示名稱') || ''
    ).trim();

    var PWA網址 = String(
      取值(列, 'PWA網址') || ''
    ).trim();

    if (
      !顯示名稱 ||
      !/^https:\/\//i.test(PWA網址)
    ) {
      continue;
    }

    var 圖片網址 = String(
      取值(列, '圖片網址') || ''
    ).trim();

    if (
      圖片網址 &&
      !/^https:\/\//i.test(圖片網址)
    ) {
      圖片網址 = '';
    }

    var 排序 = Number(
      取值(列, '排序')
    );

    if (!isFinite(排序)) {
      排序 = 9999;
    }

    工具.push({
      排序: 排序,
      顯示名稱: 顯示名稱,
      說明: String(
        取值(列, '說明') || ''
      ).trim(),
      圖片網址: 製造工具75_補預設圖片_(顯示名稱, 圖片網址),
      PWA網址: 製造工具75_LINE內開網址_(PWA網址),
      分類: String(
        取值(列, '分類') || '製造工具'
      ).trim(),
      按鈕文字: String(
        取值(列, '按鈕文字') || '立即開啟'
      ).trim()
    });
  }

  工具.sort(function (a, b) {
    return Number(a.排序) - Number(b.排序);
  });

  return 工具.slice(0, 12);
}

function 製造工具75_LINE內開網址_(url) {
  var 文字 = String(url || '').trim();
  if (!文字 || !/^https:\/\//i.test(文字)) return 文字;

  文字 = 文字
    .replace(/([?&])openExternalBrowser=(?:1|true)(?:&|$)/ig, '$1')
    .replace(/([?&])externalBrowser=(?:1|true)(?:&|$)/ig, '$1')
    .replace(/[?&]$/, '')
    .replace(/\?&/, '?')
    .replace(/&&+/g, '&');

  if (!/[?&](?:來源|source)=/i.test(文字)) {
    文字 += (文字.indexOf('?') >= 0 ? '&' : '?') + '來源=LINEBOT_TOOL';
  }

  return 文字;
}

function 製造工具75_補預設圖片_(顯示名稱, 圖片網址) {
  var url = String(圖片網址 || '').trim();
  if (/^https:\/\//i.test(url)) return url;

  var name = String(顯示名稱 || '').replace(/\s+/g, '').trim();

  if (/智慧5S|5S/i.test(name)) {
    return 製造工具75_智慧5S預設圖片_;
  }

  return '';
}

function 製造工具75_轉布林值_(值) {
  if (值 === true) return true;

  var 文字 = String(
    值 == null ? '' : 值
  )
    .trim()
    .toUpperCase();

  return [
    'TRUE',
    '1',
    'Y',
    'YES',
    '是',
    '啟用',
    '開啟'
  ].indexOf(文字) >= 0;
}

function 製造工具75_建立Flex訊息_(工具清單) {
  return {
    type: 'flex',
    altText: '化新精密｜製造工具中心',
    contents: {
      type: 'carousel',
      contents: 工具清單.map(function (工具) {
        return 製造工具75_建立Bubble_(工具);
      })
    }
  };
}

function 製造工具75_建立Bubble_(工具) {
  var heroUrl = 製造工具75_補預設圖片_(工具.顯示名稱, 工具.圖片網址);

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
        uri: String(工具.PWA網址)
      }
    };
  }

  return bubble;
}

function 製造工具75_回覆LINE_(
  replyToken,
  flex訊息
) {
  var token =
    製造工具75_取得Token_();

  if (!token) {
    throw new Error(
      '75_LINE 找不到 LINE Channel Access Token'
    );
  }

  var payload = {
    replyToken: replyToken,
    messages: [
      flex訊息
    ]
  };

  var response =
    UrlFetchApp.fetch(
      製造工具75_LINE回覆網址_,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          Authorization:
            'Bearer ' +
            token
        },
        payload:
          JSON.stringify(
            payload
          ),
        muteHttpExceptions:
          true
      }
    );

  var code =
    response.getResponseCode();

  var body =
    response.getContentText();

  console.log(
    '75_LINE Reply HTTP=' +
    code +
    ' BODY=' +
    body
  );

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      'LINE Reply API 失敗：HTTP ' +
      code +
      '｜' +
      body
    );
  }

  return true;
}

function 製造工具75_取得Token_() {
  var token = '';

  try {
    if (
      typeof RichMenu38_取得Token_ ===
      'function'
    ) {
      token = String(
        RichMenu38_取得Token_() ||
        ''
      ).trim();

      if (token) return token;
    }
  } catch (e1) {}

  try {
    if (
      typeof 取得LINEToken_ ===
      'function'
    ) {
      token = String(
        取得LINEToken_() ||
        ''
      ).trim();

      if (token) return token;
    }
  } catch (e2) {}

  var props =
    PropertiesService
      .getScriptProperties();

  var 候選名稱 = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_ACCESS_TOKEN',
    'CHANNEL_ACCESS_TOKEN'
  ];

  for (
    var i = 0;
    i < 候選名稱.length;
    i++
  ) {
    token = String(
      props.getProperty(
        候選名稱[i]
      ) || ''
    ).trim();

    if (token) return token;
  }

  return '';
}

function 初始化75_LINE製造工具中心() {
  var ss =
    SpreadsheetApp.openById(
      製造工具75_正式主庫ID_
    );

  var sheet =
    ss.getSheetByName(
      製造工具75_工作表名稱_
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        製造工具75_工作表名稱_
      );
  }

  if (
    sheet.getLastRow() === 0
  ) {
    var 標題 = [
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
      '更新時間'
    ];

    sheet
      .getRange(
        1,
        1,
        1,
        標題.length
      )
      .setValues([
        標題
      ]);

    sheet
      .getRange(
        2,
        1,
        1,
        標題.length
      )
      .setValues([
        [
          'TOOL-5S',
          10,
          '智慧5S',
          '巡檢、歷史與改善',
          '',
          製造工具75_智慧5S正式網址_,
          '現場管理',
          true,
          '立即開啟',
          '既有正式智慧5S',
          new Date()
        ]
      ]);

    sheet.setFrozenRows(1);

    sheet
      .getRange(
        1,
        1,
        1,
        標題.length
      )
      .setFontWeight(
        'bold'
      )
      .setBackground(
        '#0F3D63'
      )
      .setFontColor(
        '#FFFFFF'
      );
  }

  return {
    success: true,
    version:
      製造工具75_版本_,
    sheetName:
      製造工具75_工作表名稱_,
    lastRow:
      sheet.getLastRow()
  };
}

function 診斷75_LINE製造工具中心() {
  var 結果 = {
    success: true,
    version:
      製造工具75_版本_,
    handler:
      typeof LINE製造工具75_嘗試處理Webhook_ ===
      'function',
    token: false,
    sheet: false,
    tools: [],
    errors: []
  };

  try {
    結果.token =
      !!製造工具75_取得Token_();
  } catch (e1) {
    結果.errors.push(
      'Token：' +
      e1.message
    );
  }

  try {
    var ss =
      SpreadsheetApp.openById(
        製造工具75_正式主庫ID_
      );

    var sheet =
      ss.getSheetByName(
        製造工具75_工作表名稱_
      );

    結果.sheet =
      !!sheet;

    結果.tools =
      製造工具75_讀取工具設定_();
  } catch (e2) {
    結果.errors.push(
      'Sheet：' +
      e2.message
    );
  }

  try {
    var fallback =
      製造工具75_建立Flex訊息_(
        製造工具75_取得預設工具_()
      );

    結果.flex =
      !!(
        fallback &&
        fallback.type ===
        'flex'
      );
  } catch (e3) {
    結果.flex =
      false;

    結果.errors.push(
      'Flex：' +
      e3.message
    );
  }

  結果.success =
    !!(
      結果.handler &&
      結果.token &&
      結果.flex
    );

  console.log(
    JSON.stringify(
      結果,
      null,
      2
    )
  );

  return 結果;
}


/**
 * ============================================================
 * LINE 官方 Flex Payload 驗證
 * 不消耗 replyToken、不送訊息，只驗證 messages 物件是否合法。
 * ============================================================
 */
function 驗證75_LINE製造工具Flex_API() {
  var 結果 = {
    success: false,
    version: 製造工具75_版本_,
    toolCount: 0,
    validateHttp: 0,
    validateBody: '',
    imageHttp: null,
    imageContentType: '',
    errors: []
  };

  try {
    var 工具清單 = 製造工具75_讀取工具設定_();
    if (!工具清單.length) 工具清單 = 製造工具75_取得預設工具_();

    結果.toolCount = 工具清單.length;

    var flex = 製造工具75_建立Flex訊息_(工具清單);
    var token = 製造工具75_取得Token_();

    if (!token) throw new Error('找不到 LINE Channel Access Token');

    var 驗證回應 = UrlFetchApp.fetch(
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

    結果.validateHttp = 驗證回應.getResponseCode();
    結果.validateBody = 驗證回應.getContentText() || '';

    if (結果.validateHttp !== 200) {
      結果.errors.push(
        'LINE Flex 驗證失敗 HTTP ' +
        結果.validateHttp +
        '：' +
        結果.validateBody
      );
    }

    if (
      工具清單[0] &&
      工具清單[0].圖片網址
    ) {
      var 圖片回應 = UrlFetchApp.fetch(
        String(工具清單[0].圖片網址),
        {
          method: 'get',
          followRedirects: true,
          muteHttpExceptions: true
        }
      );

      結果.imageHttp = 圖片回應.getResponseCode();
      結果.imageContentType = String(
        圖片回應.getHeaders()['Content-Type'] ||
        圖片回應.getBlob().getContentType() ||
        ''
      );

      if (
        結果.imageHttp < 200 ||
        結果.imageHttp >= 300
      ) {
        結果.errors.push(
          '第一張 Hero 圖片讀取失敗 HTTP ' +
          結果.imageHttp
        );
      }
    }

    結果.success =
      結果.validateHttp === 200 &&
      結果.errors.length === 0;

  } catch (錯誤) {
    結果.errors.push(
      String(
        錯誤 &&
        錯誤.message ||
        錯誤
      )
    );
  }

  console.log(
    JSON.stringify(
      結果,
      null,
      2
    )
  );

  return 結果;
}
