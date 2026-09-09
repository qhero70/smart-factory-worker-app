/**
 * 化新精密｜智慧5S｜POST 寫入修復 v1.3.9
 *
 * 用途：
 * 1. 讓智慧5S PWA 的 appendRow／新增分頁資料可直接寫入正式主資料庫。
 * 2. 讓 updateRow 與智慧5S專用動作交給既有「智慧5S_嘗試處理動作_」。
 * 3. 僅允許 5S_ 開頭分頁，避免誤寫其他正式主檔。
 * 4. 依各分頁主鍵做同請求防重，離線佇列重送不重複新增。
 * 5. 同時相容 action／動作／api，以及 headers／欄位、values／值、資料物件。
 */
var 智慧5S_POST寫入修復版本_ = '1.3.9';
var 智慧5S_POST正式主庫ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';

function 智慧5S_POST通用接收_(請求) {
  var 參數 = 智慧5S_POST解析參數_(請求);
  if (!參數 || typeof 參數 !== 'object' || Array.isArray(參數)) return null;
  if (Array.isArray(參數.events)) return null;

  var 動作 = String(參數.action || 參數['動作'] || 參數.api || '').trim();
  if (!動作) return null;

  if (動作 === 'appendRow' || 動作 === '新增分頁資料') {
    return 智慧5S_POST新增資料列_(參數);
  }

  if (動作 === 'updateRow' || 動作 === '智慧5S_更新資料列' || 動作.indexOf('智慧5S_') === 0) {
    if (typeof 智慧5S_嘗試處理動作_ !== 'function') {
      return 智慧5S_POST失敗_('智慧5S後端擴充模組尚未載入');
    }
    try {
      var 結果 = 智慧5S_嘗試處理動作_(參數);
      return 結果 === null ? null : 智慧5S_POST成功包裝_(結果);
    } catch (錯誤) {
      return 智慧5S_POST失敗_(錯誤 && 錯誤.message || 錯誤);
    }
  }

  return null;
}

function 智慧5S_POST解析參數_(請求) {
  if (!請求) return null;
  if (請求.action || 請求['動作'] || 請求.api || 請求.events) return 請求;

  if (typeof 主檔_取得參數 === 'function') {
    try {
      var 主檔參數 = 主檔_取得參數(請求);
      if (主檔參數 && typeof 主檔參數 === 'object') return 主檔參數;
    } catch (忽略) {}
  }

  var 合併 = {};
  Object.keys(請求.parameter || {}).forEach(function (鍵) { 合併[鍵] = 請求.parameter[鍵]; });
  var 內容 = String(請求.postData && 請求.postData.contents || '').trim();
  if (內容) {
    try {
      var JSON資料 = JSON.parse(內容);
      if (JSON資料 && typeof JSON資料 === 'object' && !Array.isArray(JSON資料)) {
        Object.keys(JSON資料).forEach(function (鍵) { 合併[鍵] = JSON資料[鍵]; });
      }
    } catch (忽略JSON) {}
  }
  return 合併;
}

function 智慧5S_POST新增資料列_(參數) {
  try {
    var 指定主庫 = String(參數.spreadsheetId || 參數['試算表識別碼'] || 智慧5S_POST正式主庫ID_).trim();
    if (指定主庫 !== 智慧5S_POST正式主庫ID_) {
      throw new Error('智慧5S只允許寫入正式中央資料庫');
    }

    var 分頁名稱 = String(
      參數.sheet || 參數.sheetName || 參數['分頁'] || 參數['分頁名稱'] ||
      參數['工作表'] || 參數['工作表名稱'] || ''
    ).trim();
    if (分頁名稱.indexOf('5S_') !== 0) throw new Error('智慧5S只允許寫入 5S_ 分頁');

    var 試算表 = SpreadsheetApp.openById(智慧5S_POST正式主庫ID_);
    var 分頁 = 試算表.getSheetByName(分頁名稱);
    if (!分頁) throw new Error('找不到分頁：' + 分頁名稱);
    if (分頁.getLastColumn() < 1) throw new Error('分頁沒有正式表頭：' + 分頁名稱);

    var 正式欄位 = 分頁.getRange(1, 1, 1, 分頁.getLastColumn()).getDisplayValues()[0].map(function (欄名) {
      return String(欄名 || '').trim();
    });
    var 傳入欄位 = 智慧5S_POST陣列_(參數.headers || 參數['欄位']);
    var 傳入值 = 智慧5S_POST陣列_(參數.values || 參數['值']);
    var 資料物件 = 參數.row || 參數.object || 參數['資料'];
    if (typeof 資料物件 === 'string') {
      try { 資料物件 = JSON.parse(資料物件); } catch (忽略) { 資料物件 = null; }
    }

    if ((!資料物件 || typeof 資料物件 !== 'object' || Array.isArray(資料物件)) && 傳入欄位.length) {
      資料物件 = {};
      傳入欄位.forEach(function (欄名, 索引) {
        資料物件[String(欄名 || '').trim()] = 索引 < 傳入值.length ? 傳入值[索引] : '';
      });
    }

    if (!資料物件 || typeof 資料物件 !== 'object' || Array.isArray(資料物件)) {
      if (!傳入值.length) throw new Error('沒有可寫入的資料');
      資料物件 = {};
      正式欄位.forEach(function (欄名, 索引) {
        if (索引 < 傳入值.length) 資料物件[欄名] = 傳入值[索引];
      });
    }

    var 命中欄位 = 0;
    var 列內容 = 正式欄位.map(function (欄名) {
      if (!欄名 || !Object.prototype.hasOwnProperty.call(資料物件, 欄名)) return '';
      命中欄位++;
      return 智慧5S_POST安全儲存格_(資料物件[欄名]);
    });
    if (!命中欄位) throw new Error('傳入欄位與正式表頭完全不相符');

    var 主鍵欄位 = 智慧5S_POST主鍵欄位_(分頁名稱, 正式欄位);
    var 主鍵值 = 主鍵欄位 && Object.prototype.hasOwnProperty.call(資料物件, 主鍵欄位)
      ? String(資料物件[主鍵欄位] == null ? '' : 資料物件[主鍵欄位]).trim() : '';

    var 鎖 = LockService.getScriptLock();
    鎖.waitLock(30000);
    try {
      if (主鍵欄位 && 主鍵值) {
        var 主鍵欄序 = 正式欄位.indexOf(主鍵欄位) + 1;
        if (主鍵欄序 > 0 && 分頁.getLastRow() >= 2) {
          var 找到 = 分頁.getRange(2, 主鍵欄序, 分頁.getLastRow() - 1, 1)
            .createTextFinder(主鍵值)
            .useRegularExpression(false)
            .matchEntireCell(true)
            .matchCase(true)
            .findNext();
          if (找到) {
            return {
              成功: true, ok: true, success: true,
              action: 'appendRow', sheet: 分頁名稱,
              rowNumber: 找到.getRow(), 列號: 找到.getRow(),
              重複請求: true, 主鍵欄位: 主鍵欄位, 主鍵值: 主鍵值,
              版本: 智慧5S_POST寫入修復版本_
            };
          }
        }
      }

      var 列號 = Math.max(2, 分頁.getLastRow() + 1);
      if (列號 > 分頁.getMaxRows()) 分頁.insertRowsAfter(分頁.getMaxRows(), 100);
      分頁.getRange(列號, 1, 1, 正式欄位.length).setValues([列內容]);
      SpreadsheetApp.flush();
      return {
        成功: true, ok: true, success: true,
        action: 'appendRow', sheet: 分頁名稱,
        rowNumber: 列號, 列號: 列號,
        重複請求: false, 主鍵欄位: 主鍵欄位 || '', 主鍵值: 主鍵值 || '',
        版本: 智慧5S_POST寫入修復版本_
      };
    } finally {
      鎖.releaseLock();
    }
  } catch (錯誤) {
    return 智慧5S_POST失敗_(錯誤 && 錯誤.message || 錯誤);
  }
}

function 智慧5S_POST主鍵欄位_(分頁名稱, 正式欄位) {
  var 對照 = {
    '5S_巡檢主檔': '巡檢單號',
    '5S_巡檢明細': '明細編號',
    '5S_巡檢存檔索引': '存檔編號',
    '5S_改善單': '改善單號',
    '5S_改善歷程': '歷程編號',
    '5S_全物品盤點': '盤點編號',
    '5S_紅牌追蹤': '紅牌編號',
    '5S_紅牌列印紀錄': '列印編號',
    '5S_紅牌處置歷程': '歷程編號',
    '5S_非必要品處置': '處置單號',
    '5S_照片': '照片編號',
    '5S_通知紀錄': '通知編號'
  };
  var 欄位 = 對照[分頁名稱] || '';
  if (欄位 && 正式欄位.indexOf(欄位) >= 0) return 欄位;
  var 候選 = ['巡檢單號','明細編號','改善單號','歷程編號','盤點編號','紅牌編號','處置單號','照片編號','通知編號','存檔編號','列印編號'];
  for (var i = 0; i < 候選.length; i++) if (正式欄位.indexOf(候選[i]) >= 0) return 候選[i];
  return '';
}

function 智慧5S_POST陣列_(值) {
  if (Array.isArray(值)) return 值.slice();
  if (typeof 值 === 'string') {
    var 文字 = 值.trim();
    if (文字.charAt(0) === '[') {
      try {
        var 結果 = JSON.parse(文字);
        return Array.isArray(結果) ? 結果 : [];
      } catch (忽略) {}
    }
  }
  return [];
}

function 智慧5S_POST安全儲存格_(值) {
  if (值 === null || 值 === undefined) return '';
  if (值 instanceof Date || typeof 值 === 'number' || typeof 值 === 'boolean') return 值;
  var 文字 = typeof 值 === 'object' ? JSON.stringify(值) : String(值);
  if (文字.length > 45000) throw new Error('單一欄位資料過長，已停止寫入');
  return /^[\s\u0000-\u001f]*[=+@-]/.test(文字) ? "'" + 文字 : 文字;
}

function 智慧5S_POST成功包裝_(結果) {
  if (!結果 || typeof 結果 !== 'object') return { 成功: true, ok: true, success: true, 資料: 結果 };
  if (結果.成功 === undefined) 結果.成功 = true;
  if (結果.ok === undefined) 結果.ok = true;
  if (結果.success === undefined) 結果.success = true;
  return 結果;
}

function 智慧5S_POST失敗_(訊息) {
  return {
    成功: false, ok: false, success: false,
    error: String(訊息 || '智慧5S寫入失敗').slice(0, 500),
    訊息: String(訊息 || '智慧5S寫入失敗').slice(0, 500),
    版本: 智慧5S_POST寫入修復版本_
  };
}
