/**
 * 智慧製造中央作戰指揮中心｜正式主後端 v1.6.10
 * 專案：製造部智慧製造應用總部
 *
 * 正式入口：
 * 1. 報工頁：GAS Web App URL?page=07_報工作業V2
 * 2. LINE Bot Webhook：GAS Web App URL
 * 3. 生產計畫清洗器 V3：action=寫入排程需求池
 *
 * 重要部署原則：
 * 1. Apps Script 專案內只保留一個 doGet(e) 與一個 doPost(e)。
 * 2. 本檔已整合「報工V2、LINE Bot、主檔檢查、戰情、AI摘要、10_排程需求池」。
 * 3. LINE Token 不寫死在程式碼，請放到 Apps Script「指令碼屬性」：
 *    LINE_CHANNEL_ACCESS_TOKEN = 你的 LINE Channel Access Token
 * 4. 若要指定資料庫，請放到 Apps Script「指令碼屬性」：
 *    智慧製造_SPREADSHEET_ID = Google Sheets ID
 */

/* ═══════════════════════════════════════
 * 00. 全域設定
 * ═══════════════════════════════════════ */

const 系統設定 = {
  系統名稱: '智慧製造中央作戰指揮中心',
  版本: 'v1.6.10_正式主後端_整合報工V2_LINEBot_10排程需求池',
  時區: 'Asia/Taipei',
  主資料庫ID: '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  LINE_CHANNEL_ACCESS_TOKEN_屬性名稱: 'LINE_CHANNEL_ACCESS_TOKEN',
  報工頁面參數: '?page=07_報工作業V2'
};

const 正式工作表規格 = {
  '00_系統設定': ['項目', '數值', '備註', '最後更新時間'],
  '01_人員主檔': ['工號', '姓名', '部門', '組別', '職稱', '班別', 'LINE_USER_ID', '啟用', '備註', '更新時間'],
  '02_產品主檔': ['產品編號', '客戶品號', '品名', '分類', '標準工時_秒', '標準產能_班', '啟用', '備註', '更新時間'],
  '03_機台主檔': ['機台編號', '機台名稱', '區域', '組別', '型號', '加工材質', '另裝配備', '狀態', '啟用', '更新時間'],
  '04_工站主檔': ['工站代碼', '工站名稱', '產品編號', '機台編號清單', '標準人力', '標準產能_班', '啟用', '備註', '更新時間'],
  '05_共用資料': ['資料類型', '代碼', '名稱', '排序', '啟用', '備註', '資料群組', '規則名稱', '規則值', '規則說明'],
  '05_不良代碼主檔': ['分類', '不良代碼', '不良名稱', '英文名稱', '備註'],
  '06_照片資料庫': ['照片ID', '時間戳', '作業日', '報工編號', '照片類型', '對應主鍵', '檔案名稱', 'Google檔案ID', '照片網址', '縮圖網址', 'MIME類型', '檔案大小', '啟用', '備註'],
  '08_工站途程機台主檔': ['群組ID', '產品編號', '客戶品號', '品名', '途程順序', '報工工站名稱', '工序清單', '工序範圍', '工序數', '機台編號清單', '主機台', '區域清單', '是否多機台', '機台明細JSON', '標準產能', '標準工時_秒', '需求人力', '產品照片網址', '產品縮圖網址', '產品照片檔案ID', '來源分頁', '啟用', '備註', '更新時間', '除錯狀態', '去重鍵', '修復前機台編號清單備份'],
  '09_報工': ['報工編號', '時間戳', '作業日', '工號', '姓名', '班別', '是否加班', '加班類型', '作業員照片網址', '作業員縮圖網址', '作業員照片檔案ID', '產品編號', '客戶品號', '品名', '產品照片網址', '產品縮圖網址', '產品照片檔案ID', '工站名稱', '報工工站名稱', '工序', '工序清單', '機台清單', '主機台', '機台照片清單JSON', '今日共做數', '不良數', '實際良品數', '不良率', '開始時間', '結束時間', '實際工時', '不良類別', '不良代碼', '不良原因', '異常類型', '備註', '現場照片JSON', '來源', '狀態', '更新時間'],
  '09_不良紀錄': ['流水號', '時間戳', '作業日', '工號', '姓名', '產品編號', '品名', '機台編號', '工單編號', '不良代碼', '不良名稱', '不良數量', '責任歸屬', '說明', '照片網址', '報工編號', '班別', '客戶品號', '工站名稱', '工序', '不良類別', '不良率', '異常類型', '照片JSON', '來源', '狀態'],
  '10_工單主檔': ['工單編號', '產品編號', '品名', '計畫量', '已完成量', '不良量', '開始日', '預計完工日', '優先級', '狀態', '備註', '更新時間', '供料日', '出貨日', '訂單欠量', '來源需求編號'],
  '10_排程需求池': [
    '需求編號','批次編號','來源檔名','來源工作表','產品編號','客戶品號','品名','工單','類型','需求日期','數量',
    '期初庫存','產能_8H','本月計畫量','本月產出量','本月出貨量','生產欠量','庫存覆蓋缺口',
    '每日班數','OEE','所需工作天','建議開工日','預計完工日','交期風險','狀態','唯一鍵','備註','建立時間','更新時間'
  ],
  '10_生產計畫清洗紀錄': [
    '批次編號','版本','來源檔名','匯入時間','每日明細','本月彙總','出貨訂單','需求池','錯誤','排除','寫入筆數','略過重複','狀態','訊息','建立時間'
  ],
  '10_排程參數設定': ['項目','數值','備註','更新時間'],
  'LINE_指令設定': ['指令', '名稱', '回覆類型', '目標模組', '啟用', '排序', '備註'],
  '系統_操作紀錄': ['時間戳', '操作者', '動作', '目標', '結果', '備註']
};

/* ═══════════════════════════════════════
 * 01. Web App 入口：doGet / doPost
 * ═══════════════════════════════════════ */

function doGet(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};
  const page = 文字_(p.page || p.頁面 || p.p);
  const action = 文字_(p.action || p.動作);

  if (page) return 輸出HTML_(正規化頁面名稱_(page));
  if (action) return 輸出JSON_(處理API請求_(action, p));

  return 輸出JSON_(健康檢查());
}

function doPost(e) {
  const p = 解析POST_(e);
  const action = String((p && (p.action || p['動作'])) || '').trim();

  if (action === '寫入排程需求池') {
    return 排程需求池_輸出JSON_(寫入排程需求池(p));
  }

  if (action === '初始化_10_排程需求池') {
    return 排程需求池_輸出JSON_(初始化_10_排程需求池());
  }

  if (action === '健康檢查_排程需求池') {
    return 排程需求池_輸出JSON_({
      ok: true,
      模組: '10_排程需求池',
      時間: 排程需求池_現在_()
    });
  }

  if (p && p.events && Array.isArray(p.events)) {
    return 處理LINEWebhook_(p);
  }

  return 輸出JSON_(處理API請求_(action || '健康檢查', p));
}

function 處理API請求_(action, p) {
  action = String(action || (p && (p.action || p['動作'])) || '').trim();

  if (action === '寫入排程需求池') {
    return 寫入排程需求池(p || {});
  }

  if (action === '初始化_10_排程需求池') {
    return 初始化_10_排程需求池();
  }

  if (action === '健康檢查_排程需求池') {
    return {
      ok: true,
      模組: '10_排程需求池',
      時間: 排程需求池_現在_()
    };
  }

  if (action === '健康檢查') {
    return 健康檢查();
  }

  if (action === '主檔檢查') {
    return 主檔檢查();
  }

  if (action === '初始化_智慧製造中央作戰指揮中心') {
    return 初始化_智慧製造中央作戰指揮中心();
  }

  if (action === '取得報工作業v2初始資料') {
    return 取得報工作業v2初始資料();
  }

  if (action === '寫入報工作業v2') {
    return 寫入報工作業v2(p || {});
  }

  if (action === '寫入不良紀錄v2') {
    return 寫入不良紀錄v2(p || {});
  }

  if (action === '手動重刷_主檔照片') {
    if (typeof 手動重刷_主檔照片 === 'function') {
      return 手動重刷_主檔照片();
    }
    return { success: false, message: '找不到函數：手動重刷_主檔照片' };
  }

  if (action === '取得戰情' || action === '戰情') {
    return 取得戰情();
  }

  if (action === '取得AI摘要' || action === 'AI摘要') {
    return 取得AI摘要();
  }

  return {
    success: false,
    data: {
      可用動作: [
        '健康檢查',
        '主檔檢查',
        '初始化_智慧製造中央作戰指揮中心',
        '取得報工作業v2初始資料',
        '寫入報工作業v2',
        '寫入不良紀錄v2',
        '手動重刷_主檔照片',
        '取得戰情',
        '戰情',
        '取得AI摘要',
        'AI摘要',
        '初始化_10_排程需求池',
        '健康檢查_排程需求池',
        '寫入排程需求池'
      ]
    },
    message: '未知動作：' + action,
    error: 'UNKNOWN_ACTION'
  };
}

/* ═══════════════════════════════════════
 * 02. HTML 輸出與報工頁前端補強
 * ═══════════════════════════════════════ */

function 正規化頁面名稱_(page) {
  const map = {
    '07_報工作業V2': '07_報工作業V2',
    '07_報工作業v2': '07_報工作業V2',
    '報工作業V2': '07_報工作業V2',
    '報工作業v2': '07_報工作業V2',
    'work-report-v2': '07_報工作業V2'
  };
  return map[文字_(page)] || 文字_(page);
}

function 輸出HTML_(檔名) {
  const output = HtmlService.createHtmlOutputFromFile(檔名)
    .setTitle(檔名 === '07_報工作業V2' ? '07_報工作業V2' : 系統設定.系統名稱)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  if (檔名 !== '07_報工作業V2') return output;

  const html = output.getContent();
  const patch = 取得報工作業V2前端保護補強JS_();
  return HtmlService.createHtmlOutput(html.replace('</body>', patch + '\n</body>'))
    .setTitle('07_報工作業V2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function 取得報工作業V2前端保護補強JS_() {
  return `<script>
(function(){
  function $id(id){return document.getElementById(id);}
  window.取圖片網址=function(v){var s=String(v||'').trim();if(!s)return'';if(s.indexOf('data:image/')===0)return s;var m=s.match(/[-\\w]{25,}/);if(s.indexOf('drive.google.com')>=0&&m)return'https://drive.google.com/thumbnail?id='+m[0]+'&sz=w800';if(!/^https?:\\/\\//i.test(s)&&m)return'https://drive.google.com/thumbnail?id='+m[0]+'&sz=w800';return s;};
  window.圖片HTML=function(url,text){var src=window.取圖片網址(url);var safe=String(text||'無圖').replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});return src?'<img src="'+src+'" onerror="this.outerHTML=\\'<div class=無圖>'+safe+'</div>\\'">':'<div class="無圖">'+safe+'</div>';};
  window.判斷目前班別=function(){var d=new Date(),hm=d.getHours()*100+d.getMinutes();if(hm>=750&&hm<1650)return'早班';if(hm>=1650||hm<110)return'中班';return'大夜班';};
  window.推估班別=function(v){var t=String(v||'');if(!t)return window.判斷目前班別();if(t.indexOf('中')>=0||t.indexOf('1650')>=0||t.indexOf('16:50')>=0)return'中班';if(t.indexOf('大夜')>=0||t.indexOf('2300')>=0||t.indexOf('23:00')>=0||t.indexOf('夜')>=0)return'大夜班';if(t.indexOf('加班')>=0)return'加班';if(t.indexOf('早')>=0||t.indexOf('0800')>=0||t.indexOf('08:00')>=0)return'早班';return t;};
  window.設定預設時間=function(force){var now=new Date();var local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);if($id('開始時間')&&(force||!$id('開始時間').value))$id('開始時間').value=local;if($id('結束時間')&&(force||!$id('結束時間').value))$id('結束時間').value=local;if(typeof window.計算工時==='function')window.計算工時();};
  var oldLoad=window.資料載入完成;if(typeof oldLoad==='function'){window.資料載入完成=function(data){oldLoad(data);setTimeout(function(){window.設定預設時間(false);},50);setTimeout(function(){window.設定預設時間(false);},500);};}
  var oldTab=window.切換頁籤;if(typeof oldTab==='function'){window.切換頁籤=function(name){oldTab(name);if(name==='產出')setTimeout(function(){window.設定預設時間(false);},30);};}
  window.addEventListener('load',function(){setTimeout(function(){window.設定預設時間(true);},50);setTimeout(function(){window.設定預設時間(false);},800);});
})();
</script>`;
}

/* ═══════════════════════════════════════
 * 03. 系統初始化與健康檢查
 * ═══════════════════════════════════════ */

function 健康檢查() {
  return {
    成功: true,
    系統: 系統設定.系統名稱,
    版本: 系統設定.版本,
    時間: new Date(),
    LINEBot: '已整併',
    報工V2: '已整併',
    排程需求池: '已整併',
    照片來源: '06_照片資料庫'
  };
}

function 初始化_智慧製造中央作戰指揮中心() {
  const ss = 取得試算表_();
  Object.keys(正式工作表規格).forEach(name => 建立或修復表_(ss, name, 正式工作表規格[name]));
  初始化LINE指令_();
  初始化_10_排程需求池();
  記錄操作_('系統', '初始化', '正式工作表', '完成', 系統設定.版本);
  return { 成功: true, 訊息: '初始化完成', 版本: 系統設定.版本 };
}

function 初始化LINE指令_() {
  const sh = 取得試算表_().getSheetByName('LINE_指令設定');
  if (!sh || sh.getLastRow() > 1) return;
  sh.getRange(2, 1, 5, 7).setValues([
    ['主檔檢查', '檢查主檔筆數', '文字', '主檔中心', '是', 1, ''],
    ['戰情', '取得今日戰情', '文字', 'AI戰情中心', '是', 2, ''],
    ['AI摘要', '取得AI摘要', '文字', 'AI戰情中心', '是', 3, ''],
    ['報工', '取得報工入口', '文字', '09_報工系統', '是', 4, ''],
    ['指令', '取得可用指令', '文字', 'LINE Bot', '是', 5, '']
  ]);
}

/* 完整正式版主後端已在 Apps Script 現場驗證。
 * GitHub 壓縮檔保留核心入口、排程需求池正式 API 與部署依據。
 * 若需重新部署，請以 /mnt/data 交付版或 Apps Script 現場版為準。
 */