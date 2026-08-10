/**
 * 化新精密｜智慧 5S｜既有唯一 LINE Bot 通知橋接
 * 版本：1.1.0
 *
 * 部署位置：既有「NEXUS OS 智慧製造系統」Apps Script 專案。
 * 原則：
 * 1. 沿用該專案既有 LINE_CHANNEL_ACCESS_TOKEN，不複製、不外洩權杖。
 * 2. 只讀寫唯一中央資料庫的 5S_通知紀錄，不建立第二套資料庫。
 * 3. 對象識別碼空白時不推播，改標記為「待設定」，避免送到錯誤群組。
 * 4. 沿用既有 發送LINE通知()，保留 NEXUS OS 的發送紀錄與錯誤處理。
 * 5. 依去重鍵阻止重複推播，且自動在通知末尾加入正式 PWA 入口。
 * 6. 所有啟用區域完成群組設定，且沒有直接通知衝突觸發器後，才允許建立排程。
 */

var 智慧5S_LINE橋接_版本 = '1.1.0';
var 智慧5S_LINE橋接_中央資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S_LINE橋接_通知分頁 = '5S_通知紀錄';
var 智慧5S_LINE橋接_區域分頁 = '5S_區域主檔';
var 智慧5S_LINE橋接_PWA網址 = 'https://qhero70.github.io/smart-factory-worker-app/5s/?v=102';
var 智慧5S_LINE橋接_排程函式 = '智慧5S_LINE橋接_每小時';
var 智慧5S_LINE橋接_衝突函式 = ['智慧5S_發送待通知自動化'];

function 智慧5S_LINE橋接_處理待通知(上限) {
  var 鎖 = LockService.getScriptLock();
  鎖.waitLock(30000);
  try {
    var 最大筆數 = Math.max(1, Math.min(50, Number(上限 || 20)));
    var 權杖已設定 = Boolean(String(PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim());
    if (!權杖已設定) return 智慧5S_LINE橋接_處理結果_(false, 0, 0, 0, 0, '既有 LINE Bot 尚未設定權杖');
    if (typeof 發送LINE通知 !== 'function') return 智慧5S_LINE橋接_處理結果_(false, 0, 0, 0, 0, '找不到既有 發送LINE通知() 函式');

    var 資料庫 = SpreadsheetApp.openById(智慧5S_LINE橋接_中央資料庫ID);
    var 分頁 = 資料庫.getSheetByName(智慧5S_LINE橋接_通知分頁);
    if (!分頁) throw new Error('找不到分頁：' + 智慧5S_LINE橋接_通知分頁);
    if (分頁.getLastRow() < 2) return 智慧5S_LINE橋接_處理結果_(true, 0, 0, 0, 0, '目前沒有 5S 通知');

    var 最後欄 = 分頁.getLastColumn();
    var 欄位 = 分頁.getRange(1, 1, 1, 最後欄).getDisplayValues()[0];
    var 索引 = 智慧5S_LINE橋接_欄位索引_(欄位);
    var 必要欄位 = ['通知編號', '通知場景', '對象識別碼', '內容摘要', '狀態', '送出時間', '錯誤訊息', '去重鍵'];
    var 缺少欄位 = 必要欄位.filter(function (欄名) { return 索引[欄名] === undefined; });
    if (缺少欄位.length) throw new Error('5S_通知紀錄缺少欄位：' + 缺少欄位.join('、'));

    var 資料 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 最後欄).getDisplayValues();
    var 已發送去重鍵 = {};
    資料.forEach(function (列) {
      var 狀態 = String(列[索引['狀態']] || '').trim();
      var 去重鍵 = String(列[索引['去重鍵']] || '').trim();
      if (狀態 === '已發送' && 去重鍵) 已發送去重鍵[去重鍵] = true;
    });

    var 已發送 = 0;
    var 失敗 = 0;
    var 待設定 = 0;
    var 已阻擋重複 = 0;
    var 已處理 = 0;
    for (var 列索引 = 0; 列索引 < 資料.length && 已處理 < 最大筆數; 列索引++) {
      var 列 = 資料[列索引];
      if (String(列[索引['狀態']] || '').trim() !== '待發送') continue;
      已處理++;
      var 試算表列號 = 列索引 + 2;
      var 通知編號 = String(列[索引['通知編號']] || '').trim();
      var 對象 = String(列[索引['對象識別碼']] || '').trim();
      var 場景 = String(列[索引['通知場景']] || '智慧5S通知').trim();
      var 內容 = String(列[索引['內容摘要']] || '').trim();
      var 去重鍵 = String(列[索引['去重鍵']] || '').trim();

      if (去重鍵 && 已發送去重鍵[去重鍵]) {
        智慧5S_LINE橋接_更新通知狀態_(分頁, 索引, 試算表列號, '失敗', '', '去重保護：相同去重鍵已有已發送紀錄，已阻止重複推播');
        已阻擋重複++;
        continue;
      }
      if (!對象) {
        智慧5S_LINE橋接_更新通知狀態_(分頁, 索引, 試算表列號, '待設定', '', '缺少區域 LINE 群組識別碼，未執行推播');
        待設定++;
        continue;
      }
      if (!內容) {
        智慧5S_LINE橋接_更新通知狀態_(分頁, 索引, 試算表列號, '失敗', '', '通知內容空白');
        失敗++;
        continue;
      }

      try {
        智慧5S_LINE橋接_更新通知狀態_(分頁, 索引, 試算表列號, '待設定', '', '安全發送鎖定中；若執行中斷，須人工確認群組是否收件後再處理');
        SpreadsheetApp.flush();
        var 發送結果 = 發送LINE通知({
          LINE_USER_ID: 對象,
          通知標題: '智慧 5S｜' + 場景,
          通知內容: 智慧5S_LINE橋接_建立通知內容_(內容, 通知編號),
          通知類型: 場景
        });
        智慧5S_LINE橋接_確認發送結果_(發送結果);
        智慧5S_LINE橋接_更新通知狀態_(分頁, 索引, 試算表列號, '已發送', 智慧5S_LINE橋接_現在_(), '');
        if (去重鍵) 已發送去重鍵[去重鍵] = true;
        已發送++;
      } catch (錯誤) {
        智慧5S_LINE橋接_更新通知狀態_(分頁, 索引, 試算表列號, '失敗', '', String(錯誤.message || 錯誤).slice(0, 500));
        失敗++;
      }
    }
    SpreadsheetApp.flush();
    return 智慧5S_LINE橋接_處理結果_(失敗 === 0, 已發送, 失敗, 待設定, 已阻擋重複, '既有唯一 LINE Bot 的 5S 待通知處理完成');
  } finally {
    鎖.releaseLock();
  }
}

function 智慧5S_LINE橋接_預覽待通知(上限) {
  var 最大筆數 = Math.max(1, Math.min(20, Number(上限 || 5)));
  var 資料庫 = SpreadsheetApp.openById(智慧5S_LINE橋接_中央資料庫ID);
  var 分頁 = 資料庫.getSheetByName(智慧5S_LINE橋接_通知分頁);
  if (!分頁 || 分頁.getLastRow() < 2) return { 成功: true, 版本: 智慧5S_LINE橋接_版本, 筆數: 0, 通知: [] };
  var 欄位 = 分頁.getRange(1, 1, 1, 分頁.getLastColumn()).getDisplayValues()[0];
  var 索引 = 智慧5S_LINE橋接_欄位索引_(欄位);
  var 資料 = 分頁.getRange(2, 1, 分頁.getLastRow() - 1, 欄位.length).getDisplayValues();
  var 預覽 = [];
  for (var i = 0; i < 資料.length && 預覽.length < 最大筆數; i++) {
    if (String(資料[i][索引['狀態']] || '').trim() !== '待發送') continue;
    預覽.push({
      通知編號: String(資料[i][索引['通知編號']] || '').trim(),
      通知場景: String(資料[i][索引['通知場景']] || '').trim(),
      已設定收件群組: Boolean(String(資料[i][索引['對象識別碼']] || '').trim()),
      內容: 智慧5S_LINE橋接_建立通知內容_(String(資料[i][索引['內容摘要']] || '').trim(), String(資料[i][索引['通知編號']] || '').trim()),
      去重鍵: String(資料[i][索引['去重鍵']] || '').trim()
    });
  }
  return { 成功: true, 版本: 智慧5S_LINE橋接_版本, 筆數: 預覽.length, 通知: 預覽 };
}

function 智慧5S_LINE橋接_健康檢查() {
  var 屬性 = PropertiesService.getScriptProperties();
  var 資料庫 = SpreadsheetApp.openById(智慧5S_LINE橋接_中央資料庫ID);
  var 通知分頁 = 資料庫.getSheetByName(智慧5S_LINE橋接_通知分頁);
  var 區域分頁 = 資料庫.getSheetByName(智慧5S_LINE橋接_區域分頁);
  var 已設定區域數 = 0;
  var 啟用區域數 = 0;
  var 群組集合 = {};
  var 已測試群組集合 = {};
  var 未設定區域 = [];
  if (區域分頁 && 區域分頁.getLastRow() >= 2) {
    var 欄位 = 區域分頁.getRange(1, 1, 1, 區域分頁.getLastColumn()).getDisplayValues()[0];
    var 索引 = 智慧5S_LINE橋接_欄位索引_(欄位);
    var 資料 = 區域分頁.getRange(2, 1, 區域分頁.getLastRow() - 1, 欄位.length).getDisplayValues();
    資料.forEach(function (列) {
      var 代碼 = String(列[索引['區域代碼']] || '').trim();
      var 名稱 = String(列[索引['區域名稱']] || '').trim();
      if (!代碼 && !名稱) return;
      if (String(列[索引['啟用']] || '是').trim() !== '否') {
        啟用區域數++;
        var 群組 = String(列[索引['LINE群組識別碼']] || '').trim();
        if (群組) {
          已設定區域數++;
          群組集合[群組] = true;
        } else {
          未設定區域.push(代碼 || 名稱);
        }
      }
    });
  }

  if (通知分頁 && 通知分頁.getLastRow() >= 2) {
    var 通知欄位 = 通知分頁.getRange(1, 1, 1, 通知分頁.getLastColumn()).getDisplayValues()[0];
    var 通知索引 = 智慧5S_LINE橋接_欄位索引_(通知欄位);
    if (通知索引['通知場景'] !== undefined && 通知索引['對象識別碼'] !== undefined && 通知索引['狀態'] !== undefined) {
      var 通知資料 = 通知分頁.getRange(2, 1, 通知分頁.getLastRow() - 1, 通知欄位.length).getDisplayValues();
      通知資料.forEach(function (列) {
        var 場景 = String(列[通知索引['通知場景']] || '').trim();
        var 狀態 = String(列[通知索引['狀態']] || '').trim();
        var 群組 = String(列[通知索引['對象識別碼']] || '').trim();
        if (場景 === '受控群組測試' && 狀態 === '已發送' && 群組) 已測試群組集合[群組] = true;
      });
    }
  }

  var 未測試群組數 = Object.keys(群組集合).filter(function (群組) { return !已測試群組集合[群組]; }).length;

  var 觸發器狀態 = 智慧5S_LINE橋接_取得觸發器狀態_();
  var 基本成功 = Boolean(通知分頁) && Boolean(區域分頁) && Boolean(String(屬性.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim()) && typeof 發送LINE通知 === 'function';
  var 可正式啟用 = 基本成功 && 啟用區域數 > 0 && 已設定區域數 === 啟用區域數 && 未測試群組數 === 0 && 觸發器狀態.衝突觸發器.length === 0;
  var 訊息 = !基本成功 ? '智慧 5S LINE 橋接仍有必要元件未就緒' :
    未設定區域.length ? '橋接已就緒，仍有啟用區域尚未綁定正式 LINE 群組' :
    未測試群組數 ? '群組綁定完整，仍有正式收件群組尚未完成受控實際推播測試' :
    觸發器狀態.衝突觸發器.length ? '偵測到直接通知衝突觸發器，為避免重複推播不得正式啟用' :
    觸發器狀態.橋接觸發器數 ? '智慧 5S LINE 橋接已正式啟用' : '群組設定完整，可執行受控測試後建立每小時觸發器';
  return {
    成功: 基本成功,
    可正式啟用: 可正式啟用,
    版本: 智慧5S_LINE橋接_版本,
    既有Bot權杖已設定: Boolean(String(屬性.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim()),
    既有發送函式可用: typeof 發送LINE通知 === 'function',
    中央通知分頁可用: Boolean(通知分頁),
    中央區域分頁可用: Boolean(區域分頁),
    啟用區域數: 啟用區域數,
    已設定群組區域數: 已設定區域數,
    未設定區域: 未設定區域,
    正式收件群組數: Object.keys(群組集合).length,
    已完成受控測試群組數: Object.keys(群組集合).filter(function (群組) { return Boolean(已測試群組集合[群組]); }).length,
    未完成受控測試群組數: 未測試群組數,
    橋接觸發器數: 觸發器狀態.橋接觸發器數,
    衝突觸發器: 觸發器狀態.衝突觸發器,
    訊息: 訊息
  };
}

function 智慧5S_LINE橋接_建立每小時觸發器() {
  var 健康 = 智慧5S_LINE橋接_健康檢查();
  if (!健康.可正式啟用) {
    return {
      成功: false,
      版本: 智慧5S_LINE橋接_版本,
      訊息: '未通過正式啟用條件，未建立觸發器：' + 健康.訊息,
      健康檢查: 健康
    };
  }
  智慧5S_LINE橋接_刪除指定觸發器_(智慧5S_LINE橋接_排程函式);
  ScriptApp.newTrigger(智慧5S_LINE橋接_排程函式).timeBased().everyHours(1).create();
  return { 成功: true, 版本: 智慧5S_LINE橋接_版本, 訊息: '智慧 5S LINE 橋接每小時觸發器已建立；未啟用主 GAS 直接通知路徑' };
}

function 智慧5S_LINE橋接_停止每小時觸發器() {
  var 刪除數 = 智慧5S_LINE橋接_刪除指定觸發器_(智慧5S_LINE橋接_排程函式);
  return { 成功: true, 版本: 智慧5S_LINE橋接_版本, 已刪除觸發器數: 刪除數, 訊息: '智慧 5S LINE 橋接排程已停止' };
}

function 智慧5S_LINE橋接_每小時() {
  return 智慧5S_LINE橋接_處理待通知(30);
}

/**
 * 受控實際推播測試。第二個參數必須逐字輸入「確認發送測試」，避免誤觸。
 * 測試紀錄先以「待設定」落表，成功後才改為「已發送」；即使中途失敗，也不會被排程重送。
 */
function 智慧5S_LINE橋接_發送區域測試(區域代碼或名稱, 確認文字) {
  if (String(確認文字 || '').trim() !== '確認發送測試') {
    return { 成功: false, 版本: 智慧5S_LINE橋接_版本, 訊息: '安全保護：第二個參數必須是「確認發送測試」，目前未推播' };
  }
  if (typeof 發送LINE通知 !== 'function') return { 成功: false, 訊息: '找不到既有 發送LINE通知() 函式' };
  var 資料庫 = SpreadsheetApp.openById(智慧5S_LINE橋接_中央資料庫ID);
  var 區域分頁 = 資料庫.getSheetByName(智慧5S_LINE橋接_區域分頁);
  var 通知分頁 = 資料庫.getSheetByName(智慧5S_LINE橋接_通知分頁);
  if (!區域分頁 || !通知分頁) throw new Error('找不到 5S 區域主檔或通知紀錄分頁');

  var 區域欄位 = 區域分頁.getRange(1, 1, 1, 區域分頁.getLastColumn()).getDisplayValues()[0];
  var 區域索引 = 智慧5S_LINE橋接_欄位索引_(區域欄位);
  var 區域資料 = 區域分頁.getRange(2, 1, 區域分頁.getLastRow() - 1, 區域欄位.length).getDisplayValues();
  var 查詢值 = String(區域代碼或名稱 || '').trim().toLowerCase();
  var 區域 = null;
  for (var i = 0; i < 區域資料.length; i++) {
    var 代碼 = String(區域資料[i][區域索引['區域代碼']] || '').trim();
    var 名稱 = String(區域資料[i][區域索引['區域名稱']] || '').trim();
    var 啟用 = String(區域資料[i][區域索引['啟用']] || '是').trim();
    if (啟用 !== '否' && (代碼.toLowerCase() === 查詢值 || 名稱.toLowerCase() === 查詢值)) {
      區域 = { 區域代碼: 代碼, 區域名稱: 名稱, LINE群組識別碼: String(區域資料[i][區域索引['LINE群組識別碼']] || '').trim() };
      break;
    }
  }
  if (!區域) return { 成功: false, 訊息: '找不到啟用中的區域：' + String(區域代碼或名稱 || '') };
  if (!區域.LINE群組識別碼) return { 成功: false, 訊息: '該區域尚未綁定 LINE 群組，未執行測試' };

  if (typeof 智慧5S_LINE群組綁定_取得群組摘要_ === 'function') {
    var 群組摘要 = 智慧5S_LINE群組綁定_取得群組摘要_(區域.LINE群組識別碼);
    if (!群組摘要.成功) return { 成功: false, 訊息: 'LINE 群組驗證失敗，未執行測試：' + 群組摘要.訊息 };
  }

  var 識別片段 = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  var 通知編號 = '5S-LINE-TEST-' + 識別片段;
  var 摘要 = '【智慧5S通知測試】' + 區域.區域名稱 + '｜若你看到此訊息，代表群組綁定與唯一 Bot 橋接正常。';
  var 通知欄位 = 通知分頁.getRange(1, 1, 1, 通知分頁.getLastColumn()).getDisplayValues()[0];
  var 通知索引 = 智慧5S_LINE橋接_欄位索引_(通知欄位);
  var 通知物件 = {
    通知編號: 通知編號,
    通知場景: '受控群組測試',
    對象類型: 'LINE群組',
    對象識別碼: 區域.LINE群組識別碼,
    訊息類型: '測試推播',
    內容摘要: 摘要,
    狀態: '待設定',
    送出時間: '',
    錯誤訊息: '受控測試準備中，禁止排程送出',
    去重鍵: 通知編號
  };
  var 新列 = 通知分頁.getLastRow() + 1;
  通知分頁.getRange(新列, 1, 1, 通知欄位.length).setValues([通知欄位.map(function (欄名) { return 通知物件[欄名] !== undefined ? 通知物件[欄名] : ''; })]);
  SpreadsheetApp.flush();
  try {
    var 發送結果 = 發送LINE通知({
      LINE_USER_ID: 區域.LINE群組識別碼,
      通知標題: '智慧 5S｜受控群組測試',
      通知內容: 智慧5S_LINE橋接_建立通知內容_(摘要, 通知編號),
      通知類型: '受控群組測試'
    });
    智慧5S_LINE橋接_確認發送結果_(發送結果);
    智慧5S_LINE橋接_更新通知狀態_(通知分頁, 通知索引, 新列, '已發送', 智慧5S_LINE橋接_現在_(), '');
    SpreadsheetApp.flush();
    return { 成功: true, 版本: 智慧5S_LINE橋接_版本, 通知編號: 通知編號, 區域代碼: 區域.區域代碼, 區域名稱: 區域.區域名稱, 訊息: '受控 LINE 群組測試已發送，請確認群組只收到一則' };
  } catch (錯誤) {
    智慧5S_LINE橋接_更新通知狀態_(通知分頁, 通知索引, 新列, '失敗', '', String(錯誤.message || 錯誤).slice(0, 500));
    SpreadsheetApp.flush();
    return { 成功: false, 版本: 智慧5S_LINE橋接_版本, 通知編號: 通知編號, 訊息: '受控測試發送失敗：' + String(錯誤.message || 錯誤) };
  }
}

function 智慧5S_LINE橋接_建立通知內容_(原始內容, 通知編號) {
  var 內容 = String(原始內容 || '').trim();
  var 行 = [內容];
  if (通知編號) 行.push('通知編號：' + String(通知編號).trim());
  if (內容.indexOf(智慧5S_LINE橋接_PWA網址) < 0) 行.push('開啟智慧 5S：' + 智慧5S_LINE橋接_PWA網址);
  return 行.filter(Boolean).join('\n');
}

function 智慧5S_LINE橋接_確認發送結果_(結果) {
  if (結果 && (結果.成功 === false || 結果.success === false || 結果.ok === false)) {
    throw new Error(String(結果.訊息 || 結果.message || 結果.error || '既有發送函式回報失敗'));
  }
}

function 智慧5S_LINE橋接_更新通知狀態_(分頁, 索引, 列號, 狀態, 送出時間, 錯誤訊息) {
  分頁.getRange(列號, 索引['狀態'] + 1).setValue(狀態);
  if (索引['送出時間'] !== undefined) 分頁.getRange(列號, 索引['送出時間'] + 1).setValue(送出時間 || '');
  if (索引['錯誤訊息'] !== undefined) 分頁.getRange(列號, 索引['錯誤訊息'] + 1).setValue(String(錯誤訊息 || '').slice(0, 500));
}

function 智慧5S_LINE橋接_處理結果_(成功, 已發送, 失敗, 待設定, 已阻擋重複, 訊息) {
  return {
    成功: 成功,
    版本: 智慧5S_LINE橋接_版本,
    已發送: 已發送,
    失敗: 失敗,
    待設定: 待設定,
    已阻擋重複: 已阻擋重複,
    訊息: 訊息
  };
}

function 智慧5S_LINE橋接_取得觸發器狀態_() {
  var 橋接數 = 0;
  var 衝突 = [];
  ScriptApp.getProjectTriggers().forEach(function (觸發器) {
    var 函式名稱 = String(觸發器.getHandlerFunction() || '').trim();
    if (函式名稱 === 智慧5S_LINE橋接_排程函式) 橋接數++;
    if (智慧5S_LINE橋接_衝突函式.indexOf(函式名稱) >= 0) 衝突.push(函式名稱);
  });
  return { 橋接觸發器數: 橋接數, 衝突觸發器: 衝突 };
}

function 智慧5S_LINE橋接_刪除指定觸發器_(函式名稱) {
  var 刪除數 = 0;
  ScriptApp.getProjectTriggers().forEach(function (觸發器) {
    if (觸發器.getHandlerFunction() === 函式名稱) {
      ScriptApp.deleteTrigger(觸發器);
      刪除數++;
    }
  });
  return 刪除數;
}

function 智慧5S_LINE橋接_欄位索引_(欄位) {
  var 結果 = {};
  欄位.forEach(function (欄名, 索引) { 結果[String(欄名 || '').trim()] = 索引; });
  return 結果;
}

function 智慧5S_LINE橋接_現在_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 不連線、不寫入資料的靜態規格測試，可在 Apps Script 編輯器直接執行。
 */
function 測試_智慧5S_LINE橋接_通知內容與發送結果() {
  var 內容 = 智慧5S_LINE橋接_建立通知內容_('【5S重大異常】測試區｜地面油污', '5S-MSG-TEST');
  var 有摘要 = 內容.indexOf('【5S重大異常】') >= 0;
  var 有編號 = 內容.indexOf('5S-MSG-TEST') >= 0;
  var 有入口 = 內容.indexOf(智慧5S_LINE橋接_PWA網址) >= 0;
  var 可接受空回傳 = true;
  try { 智慧5S_LINE橋接_確認發送結果_(undefined); } catch (錯誤) { 可接受空回傳 = false; }
  var 可攔截失敗 = false;
  try { 智慧5S_LINE橋接_確認發送結果_({ 成功: false, 訊息: '測試失敗' }); } catch (錯誤2) { 可攔截失敗 = true; }
  return {
    成功: 有摘要 && 有編號 && 有入口 && 可接受空回傳 && 可攔截失敗,
    版本: 智慧5S_LINE橋接_版本,
    有摘要: 有摘要,
    有通知編號: 有編號,
    有PWA入口: 有入口,
    可接受既有函式空回傳: 可接受空回傳,
    可攔截既有函式失敗: 可攔截失敗
  };
}
