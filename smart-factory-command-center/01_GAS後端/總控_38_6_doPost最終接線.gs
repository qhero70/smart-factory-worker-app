/**
 * 化新精密｜製一 LINE／報工 V4 正式主路由｜v1.9.5（前端 544／智慧5S 1.3.9）
 * 完整覆蓋「總控_38_6_doPost最終接線」這一檔。
 * 保留原主檔 doPost_舊版備份，以及既有 33／34／37／38／39 等模組。
 * LINE 路由保留；V4 專用寫入「0_報工對接pwa V4，報工」。
 * 智慧5S PWA 的 appendRow／updateRow／智慧5S專用 POST 優先交由智慧5S安全寫入層處理。
 * 不建立 Bot／Rich Menu，不修改角色權限，不同步寫入舊 09_報工。
 * 完整覆蓋此檔後，將同一個網頁應用程式部署更新為「新版本」。
 * doPost、events、postData 等英文名稱是 GAS／LINE 固定協定欄位。
 */
var 製一LINE正式接線版本_ = 'v1.9.5';

function doPost(請求) {
  if (!請求) throw new Error('這是 LINE Webhook 入口，不要在編輯器直接執行。');

  // 智慧5S PWA POST 優先接手。此接收器只允許 5S_ 分頁，LINE events 會回傳 null，不影響 LINE Webhook。
  if (typeof 智慧5S_POST通用接收_ === 'function') {
    var 智慧5S回應 = 智慧5S_POST通用接收_(請求);
    if (智慧5S回應 !== null) return 製一LINE正式接線_JSON_(智慧5S回應);
  }

  // 僅接手三個明確的 V4 動作，其餘 POST／LINE 仍沿用原路由。
  var 報工回應 = 報工V4正式分頁_接收_(請求);
  if (報工回應 !== null) return 製一LINE正式接線_JSON_(報工回應);
  if (typeof doPost_舊版備份 !== 'function') {
    throw new Error('缺少原主檔 doPost_舊版備份，請保留原主檔。');
  }

  // 使用你已確認存在的原主檔解析器。
  var 內容 = 主檔_取得參數(請求);
  if (!內容 || !Array.isArray(內容.events)) {
    // 其他報工版本、PWA 與 API 原封不動交回原主檔。
    return doPost_舊版備份(請求);
  }
  if (!內容.events.length) {
    return 製一LINE正式接線_JSON_({ 已接收: true, 事件數: 0 });
  }

  var 統計 = { 已接收: true, 事件數: 內容.events.length, 已分派: 0, 已略過: 0 };
  var 首個錯誤 = null;
  內容.events.forEach(function (原事件) {
    try {
      if (!原事件 || typeof 原事件 !== 'object') throw new Error('LINE 事件格式不完整。');
      if (原事件.mode === 'standby') {
        統計.已略過++;
        return;
      }

      var 事件 = JSON.parse(JSON.stringify(原事件));
      製一LINE正式接線_正規化指令_(事件);
      var 單筆內容 = Object.assign({}, 內容, { events: [事件] });
      var 守門 = null;
      if (typeof LINE訊息重送防護_準備_ === 'function' &&
          typeof LINE訊息重送防護_完成_ === 'function') {
        守門 = LINE訊息重送防護_準備_(單筆內容);
        if (守門 && 守門.全部重複) {
          統計.已略過++;
          return;
        }
      }

      var 分派 = 製一LINE正式接線_分派_(單筆內容);
      if (分派) {
        // 已回覆或已攔截的事件不再交給其他路由，避免重用 replyToken。
        // 模組明確回報錯誤時，不新增完成標記。
        if (守門 && !製一LINE正式接線_含錯誤_(分派.結果)) {
          LINE訊息重送防護_完成_(守門);
        }
        if (製一LINE正式接線_含錯誤_(分派.結果)) {
          console.warn('LINE 模組回報處理異常：' + 分派.名稱);
        }
      } else {
        // 未被新模組接手的事件仍走原主檔，保留群組、綁定及其他功能。
        var 舊回應 = doPost_舊版備份(
          製一LINE正式接線_建立原主檔請求_(請求, 單筆內容)
        );
        if (!舊回應) throw new Error('原主檔未回傳 Webhook 回應。');
        // 原主檔自行管理它處理的事件標記，本層不擅自標記成功。
      }
      統計.已分派++;
    } catch (錯誤) {
      if (!首個錯誤) 首個錯誤 = 錯誤;
      console.error('LINE 主路由執行失敗：' + String(錯誤 && 錯誤.name || 'Error'));
      // 不改走第二條回覆路徑；其餘獨立事件仍繼續分派。
    }
  });

  if (首個錯誤) throw 首個錯誤;
  return 製一LINE正式接線_JSON_(統計);
}

function 製一LINE正式接線_分派_(內容) {
  var 路由 = [
    ['智慧5S群組', typeof 智慧5S_LINE群組綁定_嘗試處理Webhook_ === 'function'
      ? 智慧5S_LINE群組綁定_嘗試處理Webhook_ : null],
    ['智慧5S入口', typeof LINE智慧5S入口39_嘗試處理Webhook_ === 'function'
      ? LINE智慧5S入口39_嘗試處理Webhook_ : null],
    ['角色選單更新', typeof LINE角色分流34_嘗試處理Webhook_ === 'function'
      ? LINE角色分流34_嘗試處理Webhook_ : null],
    ['指令中心與我的狀態', typeof LINE指令中心37_嘗試處理Webhook_ === 'function'
      ? LINE指令中心37_嘗試處理Webhook_ : null],
    ['身份權限', typeof LINE身份權限_嘗試處理Webhook_ === 'function'
      ? LINE身份權限_嘗試處理Webhook_ : null],
    ['主管快捷戰情', typeof LINE主管快捷戰情68_嘗試處理Webhook_ === 'function'
      ? LINE主管快捷戰情68_嘗試處理Webhook_ : null],
    ['主管日期戰情', typeof LINE主管戰情日期快選_嘗試處理Webhook_ === 'function'
      ? LINE主管戰情日期快選_嘗試處理Webhook_ : null],
    ['主管戰情直連', typeof LINE主管戰情直連_嘗試處理Webhook_ === 'function'
      ? LINE主管戰情直連_嘗試處理Webhook_ : null]
  ];

  for (var 索引 = 0; 索引 < 路由.length; 索引++) {
    var 函式 = 路由[索引][1];
    if (!函式) continue;
    // 各模組可移除已處理事件；使用獨立副本，不影響原請求。
    var 副本 = JSON.parse(JSON.stringify(內容));
    var 結果 = 函式(副本);
    if (結果 && 結果.已處理 === true) {
      return { 名稱: 路由[索引][0], 結果: 結果 };
    }
    if (結果 && (結果.已部分處理 || Number(結果.處理筆數) > 0)) {
      // 每次只分派一筆；若模組已做出處理，不得再次回覆同一事件。
      throw new Error('單筆事件回傳不一致：' + 路由[索引][0]);
    }
  }
  return null;
}

function 製一LINE正式接線_正規化指令_(事件) {
  if (事件.type !== 'message' || !事件.message || 事件.message.type !== 'text') return;
  var 文字 = String(事件.message.text || '').replace(/\u3000/g, ' ').trim();
  if (/^(選單跟新|選單更新|更新選單|重整選單|重新整理選單)$/.test(文字)) {
    文字 = '選單更新';
  } else if (/^(主管入口|主管選單|主管入口選單)$/.test(文字)) {
    文字 = '主管選單';
  } else if (/^(智慧\s*5s|5s|智慧\s*5s入口|5s入口|5s巡檢|開啟智慧\s*5s|開啟5s)$/i.test(文字)) {
    文字 = '智慧5S';
  }
  事件.message.text = 文字;
}

function 製一LINE正式接線_建立原主檔請求_(原請求, 內容) {
  var 文字 = JSON.stringify(內容);
  var 長度 = Utilities.newBlob(文字).getBytes().length;
  var 新請求 = Object.assign({}, 原請求);
  新請求.parameter = Object.assign({}, 原請求.parameter || {});
  新請求.parameters = Object.assign({}, 原請求.parameters || {});
  新請求.postData = Object.assign({}, 原請求.postData || {}, {
    contents: 文字,
    type: 'application/json',
    length: 長度
  });
  新請求.contentLength = 長度;
  return 新請求;
}

function 製一LINE正式接線_含錯誤_(值) {
  if (!值 || typeof 值 !== 'object') return false;
  if (Array.isArray(值)) return 值.some(製一LINE正式接線_含錯誤_);
  if (值.錯誤 || 值.error || 值.ok === false || 值.success === false) return true;
  return 製一LINE正式接線_含錯誤_(值.結果);
}

function 製一LINE正式接線_JSON_(內容) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({
    接線版本: 製一LINE正式接線版本_
  }, 內容))).setMimeType(ContentService.MimeType.JSON);
}

// ── V4 專用接收器：單筆收據、同請求防重、唯讀查詢 ──
function 報工V4正式分頁_設定_() {
  return {
    協定: 'PWA_V4_RECEIPT_544',
    主庫ID: '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8',
    分頁ID: 2101090800,
    分頁: '0_報工對接pwa V4，報工',
    欄位: ['報工編號','時間戳','作業日','工號','姓名','班別','產品編號','客戶品號','品名',
      '工站名稱','工序範圍','主機台','機台清單','今日共做數','不良數','實際良品數',
      '開始時間','結束時間','實際工時','實際工時分鐘','正常工時分鐘','加班工時分鐘',
      '休息扣除分鐘','是否加班','加班類型','不良行清單','異常類型','異常開始時間',
      '異常結束時間','異常工時','現場照片連結','備註','來源','處理狀態','錯誤訊息',
      '請求識別碼','更新時間']
  };
}

function 報工V4正式分頁_回應_(內容) {
  var 設定 = 報工V4正式分頁_設定_();
  return Object.assign({ 協定: 設定.協定, 主庫ID: 設定.主庫ID, 目標分頁: 設定.分頁 }, 內容);
}

function 報工V4正式分頁_接收_(請求) {
  var 參數 = 請求.parameter || {};
  var 動作 = String(參數.action || 參數['動作'] || '');
  var 可用 = ['查詢報工V4對接', '查詢報工V4收件', '寫入報工V4正式分頁'];
  if (可用.indexOf(動作) < 0) return null;
  var 資料 = {};
  var 識別碼 = '';
  try {
    // 前端採表單 POST，僅帶一份 JSON，避免照片被重複編碼三次。
    if (String(參數.payload || '').length > 36000000) throw new Error('照片總量過大，請減少照片後再送出。');
    資料 = JSON.parse(參數.payload || '{}');
    if (!資料 || typeof 資料 !== 'object' || Array.isArray(資料)) throw new Error('報工內容格式錯誤。');
    識別碼 = String(資料.請求識別碼 || '');
    if (動作 !== '查詢報工V4對接' && !/^V4-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(識別碼)) {
      throw new Error('缺少有效的請求識別碼，請重新開啟最新版 V4。');
    }
    var 表 = 報工V4正式分頁_取得表_();
    if (動作 === '查詢報工V4對接') {
      return 報工V4正式分頁_回應_({ 成功: true, 已就緒: true, 狀態: '可接收', 版本: 製一LINE正式接線版本_ });
    }
    if (動作 === '查詢報工V4收件') {
      var 收據 = 報工V4正式分頁_找收據_(表, 識別碼);
      return 收據 || 報工V4正式分頁_回應_({ 成功: true, 狀態: '尚未查得', 請求識別碼: 識別碼,
        訊息: '尚未查得收據，不代表先前請求已停止；請稍後查詢，或以同一識別碼重送。' });
    }
    return 報工V4正式分頁_寫入_(表, 資料);
  } catch (錯誤) {
    // 此處尚未進入寫入函式；不洩漏完整請求、照片或個人資料。
    return 報工V4正式分頁_回應_({ 成功: false, 狀態: 動作 === '寫入報工V4正式分頁' ? '結果未確認' : '無法查詢', 請求識別碼: 識別碼,
      訊息: String(錯誤 && 錯誤.message || '無法讀取正式分頁。').slice(0, 300) });
  }
}

function 報工V4正式分頁_取得表_() {
  var 設定 = 報工V4正式分頁_設定_();
  var 表 = SpreadsheetApp.openById(設定.主庫ID).getSheetByName(設定.分頁);
  if (!表 || 表.getSheetId() !== 設定.分頁ID) throw new Error('正式報工分頁不存在或分頁 ID 不符，已停止寫入。');
  if (表.getMaxColumns() < 設定.欄位.length) throw new Error('正式報工分頁欄位不足，已停止寫入。');
  var 標題 = 表.getRange(1, 1, 1, 設定.欄位.length).getDisplayValues()[0];
  if (JSON.stringify(標題) !== JSON.stringify(設定.欄位)) throw new Error('正式報工分頁標題已變動，已停止寫入以免錯欄。');
  return 表;
}

function 報工V4正式分頁_找收據_(表, 識別碼) {
  if (表.getLastRow() < 2) return null;
  var 格 = 表.getRange(2, 36, 表.getLastRow() - 1, 1).createTextFinder(識別碼)
    .useRegularExpression(false).matchEntireCell(true).matchCase(true).findNext();
  if (!格) return null;
  var 列 = 格.getRow();
  var 值 = 表.getRange(列, 1, 1, 37).getValues()[0];
  if (值[33] !== '已寫入' || !值[0]) {
    return 報工V4正式分頁_回應_({ 成功: false, 狀態: '結果未確認', 請求識別碼: 識別碼,
      訊息: '此請求已有紀錄，但狀態不完整；已阻止新增，請管理者檢查原列。' });
  }
  return 報工V4正式分頁_回應_({ 成功: true, 狀態: '已寫入', 請求識別碼: 識別碼,
    報工編號: String(值[0]), 列號: 列, 重複請求: true });
}

function 報工V4正式分頁_驗證_(原始) {
  var 資料 = Object.assign({}, 原始);
  ['作業日','工號','姓名','班別','產品編號','工站名稱','開始時間','結束時間'].forEach(function (欄) {
    if (!String(資料[欄] == null ? '' : 資料[欄]).trim()) throw new Error('缺少必要欄位：' + 欄);
  });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(資料.作業日) || isNaN(Date.parse(資料.作業日)) ||
      new Date(資料.作業日).toISOString().slice(0, 10) !== 資料.作業日) throw new Error('作業日格式錯誤。');
  ['開始時間','結束時間'].forEach(function (欄) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(資料[欄]) || isNaN(Date.parse(資料[欄]))) throw new Error(欄 + '格式錯誤。');
  });
  ['今日共做數','不良數','實際良品數','實際工時分鐘','正常工時分鐘','加班工時分鐘','休息扣除分鐘'].forEach(function (欄) {
    var 原值 = 資料[欄];
    var 值 = Number(原值);
    if (原值 === null || 原值 === undefined || String(原值).trim() === '' || !Number.isSafeInteger(值) || 值 < 0 || 值 > 10000000) {
      throw new Error(欄 + '必須是有效的非負整數。');
    }
    資料[欄] = 值;
  });
  if (資料.今日共做數 <= 0 || 資料.不良數 > 資料.今日共做數 || 資料.實際良品數 !== 資料.今日共做數 - 資料.不良數) {
    throw new Error('共做、良品與不良數量不一致。');
  }
  if (資料.實際工時分鐘 <= 0 || 資料.實際工時分鐘 > 1440 || 資料.休息扣除分鐘 > 1440 ||
      資料.正常工時分鐘 + 資料.加班工時分鐘 !== 資料.實際工時分鐘) throw new Error('工時分鐘不完整或超過一天。');
  var 開始 = Date.parse(資料.開始時間 + ':00+08:00');
  var 結束 = Date.parse(資料.結束時間 + ':00+08:00');
  if (結束 <= 開始) 結束 += 86400000; // 與既有 V4 跨日班別一致。
  if (Math.round((結束 - 開始) / 60000) !== 資料.實際工時分鐘 + 資料.休息扣除分鐘) throw new Error('起迄時間與工時分鐘不一致。');
  var 不良 = 資料.不良行清單;
  if (!Array.isArray(不良) || 不良.length > 100) throw new Error('不良明細格式錯誤。');
  var 合計 = 0;
  資料.不良行清單 = 不良.map(function (行) {
    var 數量 = Number(行 && 行.數量);
    if (!行 || !String(行.代碼 || '').trim() || !Number.isSafeInteger(數量) || 數量 <= 0) throw new Error('不良代碼或數量無效。');
    合計 += 數量;
    return { 分類: String(行.分類 || ''), 代碼: String(行.代碼), 名稱: String(行.名稱 || ''), 英文名稱: String(行.英文名稱 || ''), 數量: 數量 };
  });
  if (合計 !== 資料.不良數) throw new Error('不良明細合計不等於不良數。');
  if (!Array.isArray(資料.現場照片清單) || 資料.現場照片清單.length > 12) throw new Error('現場照片最多 12 張。');
  // 機台／資源可能是「偉宏」等委外名稱，不強制轉數字，也不補虛構 OP。
  資料.來源 = 'PWA_V4_544';
  資料.實際工時 = (資料.實際工時分鐘 / 60).toFixed(2) + ' hrs';
  return 資料;
}

function 報工V4正式分頁_安全儲存格_(值) {
  if (值 == null) return '';
  if (值 instanceof Date || typeof 值 === 'number') return 值;
  var 文字 = typeof 值 === 'object' ? JSON.stringify(值) : String(值);
  if (文字.length > 40000) throw new Error('單一欄位過長，請縮短備註或不良明細。');
  // 防止表單文字被試算表當成公式執行。
  return /^[\s\u0000-\u001f]*[=+@-]/.test(文字) ? "'" + 文字 : 文字;
}

function 報工V4正式分頁_照片_(資料) {
  if (!資料.現場照片清單.length) return [];
  var 合計 = 0;
  var 照片 = 資料.現場照片清單.map(function (項, 索引) {
    var 格式 = String(項 && 項.MIME類型 || '').toLowerCase();
    var 副檔 = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif', 'image/heic':'heic', 'image/heif':'heif' }[格式];
    var 編碼 = String(項 && 項.Base64 || '');
    if (!副檔 || !/^[A-Za-z0-9+/]+={0,2}$/.test(編碼) || 編碼.length % 4 !== 0 || 編碼.length > 11200000) {
      throw new Error('照片 ' + (索引 + 1) + ' 格式不支援或超過 8 MB。');
    }
    var 位元 = Utilities.base64Decode(編碼);
    合計 += 位元.length;
    if (位元.length > 8 * 1024 * 1024 || 合計 > 24 * 1024 * 1024) throw new Error('照片單張上限 8 MB、總量上限 24 MB。');
    var 指紋 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 位元)
      .map(function (值) { return ('0' + ((值 + 256) % 256).toString(16)).slice(-2); }).join('').slice(0, 20);
    return { 名稱: 資料.請求識別碼 + '_' + (索引 + 1) + '_' + 指紋 + '.' + 副檔,
      位元: 位元, 格式: 格式, 備註: String(項.備註 || '').slice(0, 1000) };
  });
  var 屬性 = PropertiesService.getScriptProperties();
  var 資料夾ID = 屬性.getProperty('報工V4正式分頁_照片資料夾ID');
  var 資料夾;
  if (資料夾ID) {
    資料夾 = DriveApp.getFolderById(資料夾ID);
    if (資料夾.isTrashed()) throw new Error('報工照片資料夾已被移至垃圾桶，請管理者處理。');
  } else {
    資料夾 = DriveApp.createFolder('0_報工對接pwa V4_現場照片');
    屬性.setProperty('報工V4正式分頁_照片資料夾ID', 資料夾.getId());
  }
  // 檔案維持資料夾既有權限，不自動公開、不寫 Base64 進儲存格。
  return 照片.map(function (項) {
    var 既有 = 資料夾.getFilesByName(項.名稱);
    var 檔 = 既有.hasNext() ? 既有.next() : 資料夾.createFile(Utilities.newBlob(項.位元, 項.格式, 項.名稱));
    return { 網址: 檔.getUrl(), 備註: 項.備註 };
  });
}

function 報工V4正式分頁_寫入_(表, 原始) {
  var 識別碼 = 原始.請求識別碼;
  var 鎖 = LockService.getScriptLock();
  var 已鎖定 = false;
  var 開始寫列 = false;
  try {
    已鎖定 = 鎖.tryLock(5000);
    if (!已鎖定) return 報工V4正式分頁_回應_({ 成功: false, 狀態: '結果未確認', 請求識別碼: 識別碼,
      訊息: '另一筆請求仍在處理，請查詢收據；勿改用新識別碼送出。' });
    var 既有 = 報工V4正式分頁_找收據_(表, 識別碼);
    if (既有) return 既有;
    var 資料 = 報工V4正式分頁_驗證_(原始);
    var 設定 = 報工V4正式分頁_設定_();
    var 現在 = new Date();
    資料.報工編號 = 'PWA4-' + Utilities.formatDate(現在, 'Asia/Taipei', 'yyyyMMdd') + '-' + 識別碼.slice(3);
    資料.時間戳 = 現在;
    資料.更新時間 = 現在;
    資料.處理狀態 = '已寫入';
    資料.錯誤訊息 = '';
    資料.現場照片連結 = '';
    // 先驗證所有文字長度，避免建立照片後才發現明細過長。
    設定.欄位.forEach(function (欄) { 報工V4正式分頁_安全儲存格_(資料[欄]); });
    資料.現場照片連結 = 報工V4正式分頁_照片_(資料);
    var 列內容 = 設定.欄位.map(function (欄) { return 報工V4正式分頁_安全儲存格_(資料[欄]); });
    var 列號 = Math.max(2, 表.getLastRow() + 1);
    if (列號 > 表.getMaxRows()) 表.insertRowsAfter(表.getMaxRows(), 200);
    開始寫列 = true;
    表.getRange(列號, 1, 1, 設定.欄位.length).setValues([列內容]);
    SpreadsheetApp.flush();
    // 不寫舊 09_報工／09_不良紀錄；新分頁一列已含完整不良明細。
    return 報工V4正式分頁_回應_({ 成功: true, 狀態: '已寫入', 請求識別碼: 識別碼,
      報工編號: 資料.報工編號, 列號: 列號, 重複請求: false });
  } catch (錯誤) {
    if (開始寫列) {
      try {
        var 收據 = 報工V4正式分頁_找收據_(表, 識別碼);
        if (收據) return 收據;
      } catch (忽略) { /* 寫入可能完成但讀取失敗，不宣稱未寫入。 */ }
    }
    return 報工V4正式分頁_回應_({ 成功: false, 狀態: 開始寫列 ? '結果未確認' : '未寫入', 請求識別碼: 識別碼,
      訊息: 開始寫列 ? '寫入結果尚未確認，請以同一請求識別碼查詢收件。' : String(錯誤 && 錯誤.message || '報工無法寫入。').slice(0, 300) });
  } finally {
    if (已鎖定) { try { 鎖.releaseLock(); } catch (忽略) {} }
  }
}
