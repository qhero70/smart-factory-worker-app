/**
 * 化新精密｜智慧5S POST 寫入修復 1.3.9.1
 * 沿用 NEXUS OS 原部署、中央主庫及手機佇列；不建立 Web App、不發送通知。
 * 新增與更新皆回傳可核對收據。主鍵相同、內容相同才視為新增重送成功。
 * 更新以主鍵定位，列號僅供相容；未指定欄位及公式保留。
 * 部署前須核對原入口的既有權限檢查，並執行正式 HTTP 驗收。
 */
var 智慧5S_POST寫入修復版本_ = '1.3.9.1';
var 智慧5S_POST正式主庫ID_ = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
var 智慧5S_POST收據協定_ = 'SMART5S_RECEIPT_1391';

function 智慧5S_POST通用接收_(請求) {
  var 參數 = 智慧5S_POST解析參數_(請求);
  if (!參數 || Array.isArray(參數) || Array.isArray(參數.events)) return null;
  var 原動作 = String(參數.action || 參數['動作'] || 參數.api || '').trim();
  var 動作 = ({'新增分頁資料':'appendRow','智慧5S_更新資料列':'updateRow'})[原動作] || 原動作;
  var 分頁名稱 = 智慧5S_POST分頁名稱_(參數);
  if (動作 === 'appendRow' || 動作 === 'updateRow') {
    // 共用的 appendRow/updateRow 不攔截報工或其他主檔。
    if (分頁名稱.indexOf('5S_') !== 0) return null;
    return 智慧5S_POST寫入資料列_(參數, 動作, 分頁名稱);
  }
  if (動作 === '智慧5S_寫入健康檢查') {
    return {成功:true,ok:true,success:true,協定:智慧5S_POST收據協定_,
      主庫ID:智慧5S_POST正式主庫ID_,版本:智慧5S_POST寫入修復版本_};
  }
  if (動作.indexOf('智慧5S_') !== 0) return null;
  if (typeof 智慧5S_嘗試處理動作_ !== 'function') return 智慧5S_POST失敗_('智慧5S後端擴充模組尚未載入');
  try {
    var 結果 = 智慧5S_嘗試處理動作_(Object.assign({}, 參數, {action:動作, 動作:動作}));
    return 結果 === null ? null : 智慧5S_POST成功包裝_(結果);
  } catch (錯誤) { return 智慧5S_POST失敗_(錯誤.message || 錯誤); }
}

function 智慧5S_POST解析參數_(請求) {
  if (!請求 || typeof 請求 !== 'object') return null;
  if (請求.action || 請求['動作'] || 請求.api || 請求.events) return 請求;
  var 參數 = Object.assign({}, 請求.parameter || {});
  var 內容 = String(請求.postData && 請求.postData.contents || '').trim();
  if (內容) {
    try {
      var 資料 = JSON.parse(內容);
      if (資料 && typeof 資料 === 'object' && !Array.isArray(資料)) Object.assign(參數, 資料);
    } catch (忽略非JSON) {}
  }
  return 參數;
}

function 智慧5S_POST分頁名稱_(參數) {
  return String(參數.sheet || 參數.sheetName || 參數['分頁'] || 參數['分頁名稱'] ||
    參數['工作表'] || 參數['工作表名稱'] || '').trim();
}

function 智慧5S_POST寫入資料列_(參數, 動作, 分頁名稱) {
  var 鎖 = null;
  var 已持鎖 = false;
  try {
    ['spreadsheetId','試算表識別碼'].forEach(function (鍵) {
      if (參數[鍵] !== undefined && String(參數[鍵]).trim() !== 智慧5S_POST正式主庫ID_) {
        throw new Error('智慧5S只允許寫入正式中央資料庫');
      }
    });
    ['sheet','sheetName','分頁','分頁名稱','工作表','工作表名稱'].forEach(function (鍵) {
      if (參數[鍵] !== undefined && String(參數[鍵]).trim() !== 分頁名稱) throw new Error('分頁名稱參數不一致');
    });
    鎖 = LockService.getScriptLock();
    鎖.waitLock(30000);
    已持鎖 = true;
    var 分頁 = SpreadsheetApp.openById(智慧5S_POST正式主庫ID_).getSheetByName(分頁名稱);
    if (!分頁 || 分頁.getLastColumn() < 1) throw new Error('找不到分頁或正式表頭：' + 分頁名稱);
    var 欄位 = 分頁.getRange(1,1,1,分頁.getLastColumn()).getDisplayValues()[0].map(function (值) { return String(值).trim(); });
    var 已見欄位 = Object.create(null);
    欄位.forEach(function (欄名) {
      if (!欄名 || 已見欄位[欄名]) throw new Error('正式表頭有空白或重複欄位');
      已見欄位[欄名] = true;
    });
    var 資料 = 智慧5S_POST資料物件_(參數);
    var 傳入欄位 = Object.keys(資料);
    if (!傳入欄位.length) throw new Error('沒有可寫入的資料');
    傳入欄位.forEach(function (欄名) {
      if (欄位.indexOf(欄名) < 0) throw new Error('正式表頭沒有欄位：' + 欄名);
    });
    var 主鍵欄位 = 智慧5S_POST主鍵欄位_(分頁名稱, 欄位);
    if (!主鍵欄位) throw new Error('分頁尚未設定可靠主鍵，已保留待同步資料');
    var 主鍵值 = String(資料[主鍵欄位] == null ? '' : 資料[主鍵欄位]).trim();
    if (!主鍵值) throw new Error('缺少主鍵：' + 主鍵欄位);
    if (主鍵值 !== String(資料[主鍵欄位])) throw new Error('主鍵前後不可有空白');
    var 儲存值 = Object.create(null);
    傳入欄位.forEach(function (欄名) { 儲存值[欄名] = 智慧5S_POST安全儲存格_(資料[欄名]); });
    var 命中 = [];
    if (分頁.getLastRow() >= 2) {
      命中 = 分頁.getRange(2,欄位.indexOf(主鍵欄位)+1,分頁.getLastRow()-1,1)
        .createTextFinder(主鍵值).useRegularExpression(false).matchEntireCell(true).matchCase(true).findAll();
    }
    if (命中.length > 1) throw new Error('主鍵已有多筆資料，已停止寫入');
    var 列號 = 命中.length ? 命中[0].getRow() : 0;
    var 重複 = false;
    if (動作 === 'appendRow' && 列號) {
      var 既有值 = 分頁.getRange(列號,1,1,欄位.length).getValues()[0];
      var 相同 = 傳入欄位.every(function (欄名) { return 智慧5S_POST值相同_(既有值[欄位.indexOf(欄名)], 資料[欄名]); });
      if (!相同) throw new Error('相同主鍵已有不同內容，已保留待同步資料供核對');
      重複 = true;
    } else {
      if (動作 === 'updateRow' && !列號) throw new Error('找不到要更新的主鍵，已停止寫入');
      var 列內容;
      if (動作 === 'updateRow') {
        var 範圍 = 分頁.getRange(列號,1,1,欄位.length);
        var 原值 = 範圍.getValues()[0];
        var 原公式 = 範圍.getFormulas()[0];
        列內容 = 欄位.map(function (欄名, 序) {
          return Object.prototype.hasOwnProperty.call(儲存值,欄名) ? 儲存值[欄名] : (原公式[序] || 智慧5S_POST安全儲存格_(原值[序]));
        });
      } else {
        列號 = Math.max(2,分頁.getLastRow()+1);
        列內容 = 欄位.map(function (欄名) { return Object.prototype.hasOwnProperty.call(儲存值,欄名) ? 儲存值[欄名] : ''; });
      }
      if (列號 > 分頁.getMaxRows()) 分頁.insertRowsAfter(分頁.getMaxRows(),100);
      分頁.getRange(列號,1,1,欄位.length).setValues([列內容]);
      SpreadsheetApp.flush();
    }
    return {成功:true,ok:true,success:true,協定:智慧5S_POST收據協定_,主庫ID:智慧5S_POST正式主庫ID_,
      action:動作,sheet:分頁名稱,rowNumber:列號,列號:列號,主鍵欄位:主鍵欄位,主鍵值:主鍵值,
      重複請求:重複,版本:智慧5S_POST寫入修復版本_};
  } catch (錯誤) { return 智慧5S_POST失敗_(錯誤.message || 錯誤); }
  finally { if (已持鎖) 鎖.releaseLock(); }
}

function 智慧5S_POST資料物件_(參數) {
  var 欄位 = 智慧5S_POST陣列_(參數.headers || 參數['欄位']);
  var 值 = 智慧5S_POST陣列_(參數.values || 參數['值']);
  var 結果 = Object.create(null);
  if (欄位.length) {
    if (欄位.length !== 值.length) throw new Error('欄位與值的數量不一致');
    欄位.forEach(function (欄名, 序) {
      欄名 = String(欄名).trim();
      if (!欄名 || Object.prototype.hasOwnProperty.call(結果,欄名)) throw new Error('傳入欄位有空白或重複');
      結果[欄名] = 值[序];
    });
    return 結果;
  }
  var 物件 = 參數.row || 參數.object || 參數['資料'];
  if (typeof 物件 === 'string') { try { 物件 = JSON.parse(物件); } catch (錯誤) { throw new Error('資料物件不是有效 JSON'); } }
  if (!物件 || typeof 物件 !== 'object' || Array.isArray(物件)) throw new Error('請提供欄位與值，或資料物件');
  Object.keys(物件).forEach(function (欄名) { 結果[欄名] = 物件[欄名]; });
  return 結果;
}

function 智慧5S_POST主鍵欄位_(分頁名稱, 欄位) {
  var 對照 = {
    '5S_巡檢主檔':'巡檢單號','5S_巡檢明細':'明細編號','5S_巡檢存檔索引':'存檔編號',
    '5S_改善單':'改善單號','5S_改善歷程':'歷程編號','5S_全物品盤點':'盤點編號',
    '5S_紅牌追蹤':'紅牌編號','5S_紅牌列印紀錄':'列印編號','5S_紅牌處置歷程':'歷程編號',
    '5S_非必要品處置':'處置單號','5S_照片':'照片編號','5S_通知紀錄':'通知編號',
    '5S_連線驗收':'驗收編號'
  };
  var 主鍵 = 對照[分頁名稱] || '';
  return 欄位.indexOf(主鍵) >= 0 ? 主鍵 : '';
}

function 智慧5S_POST陣列_(值) {
  if (Array.isArray(值)) return 值.slice();
  if (typeof 值 === 'string') { try { var 結果 = JSON.parse(值); return Array.isArray(結果) ? 結果 : []; } catch (忽略) {} }
  return [];
}

function 智慧5S_POST安全儲存格_(值) {
  if (值 === null || 值 === undefined) return '';
  if (值 instanceof Date || typeof 值 === 'boolean') return 值;
  if (typeof 值 === 'number') { if (!isFinite(值)) throw new Error('數值必須是有限數字'); return 值; }
  var 文字 = typeof 值 === 'object' ? JSON.stringify(值) : String(值);
  if (文字.length > 45000) throw new Error('單一欄位資料過長，已停止寫入');
  return /^[\s\u0000-\u001f]*[=+@-]/.test(文字) ? "'" + 文字 : 文字;
}

function 智慧5S_POST值相同_(既有, 傳入) {
  if (既有 instanceof Date) {
    var 日期 = new Date(傳入);
    return !isNaN(日期.getTime()) && 既有.getTime() === 日期.getTime();
  }
  var 文字 = 傳入 == null ? '' : (typeof 傳入 === 'object' ? JSON.stringify(傳入) : String(傳入));
  return String(既有 == null ? '' : 既有) === 文字;
}

function 智慧5S_POST成功包裝_(結果) {
  if (!結果 || typeof 結果 !== 'object' || Array.isArray(結果)) return 智慧5S_POST失敗_('後端尚未確認處理結果');
  if (結果.成功 === false || 結果.ok === false || 結果.success === false || 結果.error || 結果.錯誤) {
    return Object.assign({},結果,{成功:false,ok:false,success:false});
  }
  // 此包裝僅用於既有專用動作；新增與更新必須走收據路徑。
  return Object.assign({成功:true,ok:true,success:true},結果);
}

function 智慧5S_POST失敗_(訊息) {
  var 文字 = String(訊息 || '智慧5S寫入失敗').slice(0,500);
  return {成功:false,ok:false,success:false,error:文字,訊息:文字,版本:智慧5S_POST寫入修復版本_};
}
