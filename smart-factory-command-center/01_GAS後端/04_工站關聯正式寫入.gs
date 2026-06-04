/*******************************************************
 * 04_工站關聯正式寫入
 * 專案：智慧製造中央作戰指揮中心
 *
 * 用途：
 * 1. 從「04_工站關聯產能_由工序機台解析表產出_暫存」讀取三段暫存資料。
 * 2. 正式寫入主資料庫三張分頁：
 *    - 04_工站產品關聯
 *    - 04_工站機台關聯
 *    - 04_工站班別產能
 * 3. 提供「初始化系統」橋接函數，讓 v3 初始化流程可自動接到 04 工站關聯補齊。
 *
 * 注意：
 * - 本檔不宣告 doGet / doPost。
 * - 本檔不覆蓋既有主入口。
 * - 所有欄位名稱、函數名稱、註解皆使用繁體中文。
 *******************************************************/

const 設定04工站關聯 = {
  目標試算表ID: '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  來源暫存試算表ID: '1fxa1Ii4fnkJWDSEDSKIHJ8mTcy6F2KiwsuECVQ9f4Gk',
  時區: 'Asia/Taipei',
  是否嚴格檢查筆數: true,
  分頁規格: {
    '04_工站產品關聯': {
      主鍵欄位: '關聯編號',
      預計筆數: 259,
      欄位: ['關聯編號','產品編號','客戶品號','品名','工序','工站代碼','工站名稱','製程順序','是否主要工站','啟用','產品對應狀態','產能對應狀態','備註','更新時間']
    },
    '04_工站機台關聯': {
      主鍵欄位: '關聯編號',
      預計筆數: 282,
      欄位: ['關聯編號','工站代碼','工站名稱','產品編號','客戶品號','品名','工序','工序類型','區域','機台編號','機台型號','供應商名稱','人員名稱','設備名稱','是否主機台','啟用','解析狀態','備註','更新時間']
    },
    '04_工站班別產能': {
      主鍵欄位: '產能編號',
      預計筆數: 259,
      欄位: ['產能編號','產品編號','客戶品號','品名','工序','工站代碼','工站名稱','班別','標準工時_秒','8小時標準產能','需求人力','啟用','產品對應狀態','產能對應狀態','備註','更新時間']
    }
  }
};

/**
 * v3 初始化橋接函數。
 * v3_0_GAS主控入口與LINE最終整合版.gs 的 初始化_v3_0_正式上線 會嘗試呼叫「初始化系統」。
 */
function 初始化系統() {
  const 結果 = [];

  try {
    if (typeof 初始化_智慧製造中央作戰指揮中心 === 'function') {
      結果.push({ 步驟: '執行主系統初始化', 狀態: '已執行', 結果: 初始化_智慧製造中央作戰指揮中心() });
    } else {
      結果.push({ 步驟: '執行主系統初始化', 狀態: '略過', 訊息: '找不到 初始化_智慧製造中央作戰指揮中心' });
    }
  } catch (錯誤) {
    結果.push({ 步驟: '執行主系統初始化', 狀態: '失敗', 錯誤: 錯誤.message });
  }

  try {
    補齊04工站關聯規格_();
    結果.push({ 步驟: '補齊 04 工站關聯分頁規格', 狀態: '完成' });
  } catch (錯誤) {
    結果.push({ 步驟: '補齊 04 工站關聯分頁規格', 狀態: '失敗', 錯誤: 錯誤.message });
  }

  try {
    const 建表結果 = 建立04工站關聯正式分頁_();
    結果.push({ 步驟: '建立 04 工站關聯正式分頁', 狀態: '完成', 結果: 建表結果 });
  } catch (錯誤) {
    結果.push({ 步驟: '建立 04 工站關聯正式分頁', 狀態: '失敗', 錯誤: 錯誤.message });
  }

  return { 成功: 結果.every(x => x.狀態 !== '失敗'), 訊息: '初始化系統橋接完成', 結果: 結果, 時間: new Date() };
}

function 測試04工站關聯正式寫入() {
  補齊04工站關聯規格_();

  const 來源試算表 = SpreadsheetApp.openById(設定04工站關聯.來源暫存試算表ID);
  const 測試結果 = [];

  Object.keys(設定04工站關聯.分頁規格).forEach(function (分頁名稱) {
    const 規格 = 設定04工站關聯.分頁規格[分頁名稱];
    const 抽出結果 = 從來源暫存抽出指定表格資料_(來源試算表, 規格.欄位, 規格.主鍵欄位);
    測試結果.push({
      分頁名稱: 分頁名稱,
      來源分頁: 抽出結果.來源分頁 || '',
      來源起始列: 抽出結果.來源起始列 || '',
      抽出筆數: 抽出結果.資料.length,
      預計筆數: 規格.預計筆數,
      筆數狀態: 抽出結果.資料.length === 規格.預計筆數 ? '符合' : '不符合'
    });
  });

  Logger.log(JSON.stringify(測試結果, null, 2));
  return { 成功: 測試結果.every(x => x.筆數狀態 === '符合'), 訊息: '04 工站關聯來源測試完成', 結果: 測試結果 };
}

function 正式寫入04工站關聯() {
  補齊04工站關聯規格_();

  const 開始時間 = new Date();
  const 現在 = Utilities.formatDate(開始時間, 設定04工站關聯.時區, 'yyyy-MM-dd HH:mm:ss');
  const 目標試算表 = SpreadsheetApp.openById(設定04工站關聯.目標試算表ID);
  const 來源試算表 = SpreadsheetApp.openById(設定04工站關聯.來源暫存試算表ID);
  const 寫入結果 = [];

  Object.keys(設定04工站關聯.分頁規格).forEach(function (分頁名稱) {
    const 規格 = 設定04工站關聯.分頁規格[分頁名稱];
    const 抽出結果 = 從來源暫存抽出指定表格資料_(來源試算表, 規格.欄位, 規格.主鍵欄位);

    if (設定04工站關聯.是否嚴格檢查筆數 && 抽出結果.資料.length !== 規格.預計筆數) {
      throw new Error('筆數檢查失敗：' + 分頁名稱 + '，預計 ' + 規格.預計筆數 + ' 筆，實際 ' + 抽出結果.資料.length + ' 筆。');
    }

    const 正式資料 = 抽出結果.資料.map(function (列物件) {
      return 規格.欄位.map(function (欄位名稱) {
        if (欄位名稱 === '更新時間') return 現在;
        return 轉為安全值04_(列物件[欄位名稱]);
      });
    });

    const 目標分頁 = 確保04正式分頁_(目標試算表, 分頁名稱, 規格.欄位);
    清空04正式資料區_(目標分頁, 規格.欄位.length);
    目標分頁.getRange(2, 1, 正式資料.length, 規格.欄位.length).setValues(正式資料);
    套用04正式分頁格式_(目標分頁, 正式資料.length + 1, 規格.欄位.length);

    寫入結果.push({
      分頁名稱: 分頁名稱,
      寫入筆數: 正式資料.length,
      預計筆數: 規格.預計筆數,
      來源分頁: 抽出結果.來源分頁,
      來源起始列: 抽出結果.來源起始列,
      狀態: '完成',
      更新時間: 現在
    });
  });

  建立04工站關聯寫入檢核_(目標試算表, 寫入結果, 開始時間);
  return { 成功: true, 訊息: '04 工站關聯正式寫入完成', 結果: 寫入結果 };
}

function 建立04工站關聯正式分頁_() {
  補齊04工站關聯規格_();
  const 目標試算表 = SpreadsheetApp.openById(設定04工站關聯.目標試算表ID);
  const 結果 = [];

  Object.keys(設定04工站關聯.分頁規格).forEach(function (分頁名稱) {
    const 規格 = 設定04工站關聯.分頁規格[分頁名稱];
    const 分頁 = 確保04正式分頁_(目標試算表, 分頁名稱, 規格.欄位);
    結果.push({ 分頁名稱: 分頁名稱, 狀態: '已建立或已修復', 欄位數: 規格.欄位.length, 目前筆數: Math.max(0, 分頁.getLastRow() - 1) });
  });

  return 結果;
}

function 補齊04工站關聯規格_() {
  try {
    if (typeof 工作表規格 !== 'undefined') {
      Object.keys(設定04工站關聯.分頁規格).forEach(function (分頁名稱) {
        工作表規格[分頁名稱] = 設定04工站關聯.分頁規格[分頁名稱].欄位;
      });
    }
  } catch (錯誤) {}

  try {
    if (typeof 主檔管理設定 !== 'undefined') {
      Object.keys(設定04工站關聯.分頁規格).forEach(function (分頁名稱) {
        主檔管理設定[分頁名稱] = 設定04工站關聯.分頁規格[分頁名稱].主鍵欄位;
      });
    }
  } catch (錯誤) {}

  return { 成功: true, 訊息: '04 工站關聯規格已補齊到全域設定' };
}

function 從來源暫存抽出指定表格資料_(來源試算表, 目標欄位, 主鍵欄位) {
  const 來源分頁清單 = 來源試算表.getSheets();

  for (let s = 0; s < 來源分頁清單.length; s++) {
    const 分頁 = 來源分頁清單[s];
    const 值 = 分頁.getDataRange().getValues();

    for (let r = 0; r < 值.length; r++) {
      const 欄位起點 = 找04欄位起點_(值[r], 目標欄位);
      if (欄位起點 === -1) continue;

      const 資料 = [];
      for (let rr = r + 1; rr < 值.length; rr++) {
        const 目前列 = 值[rr];
        if (是否04空白列_(目前列)) break;
        if (找04欄位起點_(目前列, 目標欄位) !== -1) break;

        const 列物件 = {};
        目標欄位.forEach(function (欄位名稱, i) {
          列物件[欄位名稱] = 目前列[欄位起點 + i];
        });

        if (轉為字串04_(列物件[主鍵欄位])) 資料.push(列物件);
      }

      return {
        資料: 去除04重複列_(資料, 主鍵欄位),
        來源分頁: 分頁.getName(),
        來源起始列: r + 1
      };
    }
  }

  return { 資料: [], 來源分頁: '', 來源起始列: '' };
}

function 找04欄位起點_(列, 目標欄位) {
  for (let c = 0; c < 列.length; c++) {
    if (正規04欄位名稱_(列[c]) !== 正規04欄位名稱_(目標欄位[0])) continue;
    let 符合數 = 0;
    for (let i = 0; i < 目標欄位.length; i++) {
      if (正規04欄位名稱_(列[c + i]) === 正規04欄位名稱_(目標欄位[i])) 符合數++;
    }
    if (符合數 === 目標欄位.length) return c;
  }
  return -1;
}

function 確保04正式分頁_(試算表, 分頁名稱, 欄位) {
  let 分頁 = 試算表.getSheetByName(分頁名稱);
  if (!分頁) 分頁 = 試算表.insertSheet(分頁名稱);

  if (分頁.getMaxColumns() < 欄位.length) {
    分頁.insertColumnsAfter(分頁.getMaxColumns(), 欄位.length - 分頁.getMaxColumns());
  }
  if (分頁.getMaxColumns() > 欄位.length) {
    分頁.deleteColumns(欄位.length + 1, 分頁.getMaxColumns() - 欄位.length);
  }

  分頁.getRange(1, 1, 1, 欄位.length).setValues([欄位]);
  分頁.setFrozenRows(1);
  套用04正式分頁格式_(分頁, Math.max(1, 分頁.getLastRow()), 欄位.length);
  return 分頁;
}

function 清空04正式資料區_(分頁, 欄位數) {
  if (分頁.getMaxRows() > 1) {
    分頁.getRange(2, 1, 分頁.getMaxRows() - 1, 欄位數).clearContent();
  }
}

function 套用04正式分頁格式_(分頁, 列數, 欄位數) {
  分頁.getRange(1, 1, 1, 欄位數)
    .setFontWeight('bold')
    .setBackground('#1f4e79')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');

  分頁.getRange(1, 1, Math.max(1, 列數), 欄位數)
    .setBorder(true, true, true, true, true, true, '#d9e2f3', SpreadsheetApp.BorderStyle.SOLID);

  分頁.autoResizeColumns(1, 欄位數);
}

function 建立04工站關聯寫入檢核_(試算表, 寫入結果, 開始時間) {
  const 分頁名稱 = '04_工站關聯寫入檢核';
  let 分頁 = 試算表.getSheetByName(分頁名稱);
  if (!分頁) 分頁 = 試算表.insertSheet(分頁名稱);
  分頁.clear();

  const 結束時間 = new Date();
  const 現在 = Utilities.formatDate(結束時間, 設定04工站關聯.時區, 'yyyy-MM-dd HH:mm:ss');
  const 摘要 = [
    ['檢核項目', '檢核結果'],
    ['執行時間', 現在],
    ['執行秒數', Math.round((結束時間.getTime() - 開始時間.getTime()) / 1000)],
    ['來源暫存試算表ID', 設定04工站關聯.來源暫存試算表ID],
    ['目標試算表ID', 設定04工站關聯.目標試算表ID],
    ['寫入方式', '靜態資料寫入，不使用 IMPORTRANGE'],
    ['下一步測試', 'LINE Bot 輸入：主檔檢查']
  ];

  分頁.getRange(1, 1, 摘要.length, 2).setValues(摘要);

  const 明細標題 = ['分頁名稱','寫入筆數','預計筆數','筆數狀態','來源分頁','來源起始列','狀態','更新時間'];
  const 明細資料 = 寫入結果.map(function (項目) {
    return [項目.分頁名稱, 項目.寫入筆數, 項目.預計筆數, 項目.寫入筆數 === 項目.預計筆數 ? '符合' : '不符合', 項目.來源分頁, 項目.來源起始列, 項目.狀態, 項目.更新時間];
  });

  const 起始列 = 摘要.length + 3;
  分頁.getRange(起始列, 1, 1, 明細標題.length).setValues([明細標題]);
  分頁.getRange(起始列 + 1, 1, 明細資料.length, 明細標題.length).setValues(明細資料);

  分頁.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
  分頁.getRange(起始列, 1, 1, 明細標題.length).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
  分頁.autoResizeColumns(1, 明細標題.length);
}

function 去除04重複列_(資料, 主鍵欄位) {
  const 已出現 = {};
  const 結果 = [];
  資料.forEach(function (列物件) {
    const 主鍵值 = 轉為字串04_(列物件[主鍵欄位]);
    if (!主鍵值 || 已出現[主鍵值]) return;
    已出現[主鍵值] = true;
    結果.push(列物件);
  });
  return 結果;
}

function 是否04空白列_(列) {
  return 列.every(function (值) { return 轉為字串04_(值) === ''; });
}

function 正規04欄位名稱_(值) {
  return 轉為字串04_(值).replace(/\s+/g, '').replace(/　/g, '').trim();
}

function 轉為字串04_(值) {
  if (值 === null || 值 === undefined) return '';
  return String(值).trim();
}

function 轉為安全值04_(值) {
  if (值 === null || 值 === undefined) return '';
  if (Object.prototype.toString.call(值) === '[object Date]') {
    return Utilities.formatDate(值, 設定04工站關聯.時區, 'yyyy-MM-dd HH:mm:ss');
  }
  return 值;
}
