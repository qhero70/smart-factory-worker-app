/**
 * 07_報工作業v2_GAS入口.gs
 * 智慧製造中央作戰指揮中心｜報工作業 v2
 * 
 * 注意：
 * 1. 本檔不宣告 doGet / doPost，不影響既有 LINE Bot 與 Web App 主入口。
 * 2. 本檔使用 Google Sheets 綁定式側邊欄。
 * 3. HTML 檔名必須是：07_報工作業v2
 */

const 報工作業v2_設定 = {
  HTML檔名: '07_報工作業v2',
  人員主檔: '01_人員主檔',
  工站產品關聯: '04_工站產品關聯',
  工站機台關聯: '04_工站機台關聯',
  工站班別產能: '04_工站班別產能',
  報工紀錄: '09_報工紀錄'
};

/**
 * 產生 HTML 畫面
 */
function 開啟報工作業v2() {
  return HtmlService
    .createHtmlOutputFromFile(報工作業v2_設定.HTML檔名)
    .setTitle('報工作業 v2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 在 Google Sheets 右側開啟側邊欄
 */
function 顯示報工作業v2側邊欄() {
  const 畫面 = HtmlService
    .createHtmlOutputFromFile(報工作業v2_設定.HTML檔名)
    .setTitle('報工作業 v2');

  SpreadsheetApp.getUi().showSidebar(畫面);
}

/**
 * 入口測試
 */
function 測試開啟報工作業v2入口() {
  return {
    成功: true,
    訊息: '報工作業 v2 入口函數已載入',
    HTML檔名: 報工作業v2_設定.HTML檔名,
    測試時間: new Date()
  };
}

/**
 * 前端初始化資料
 */
function 取得報工作業v2初始資料() {
  const 試算表 = SpreadsheetApp.getActiveSpreadsheet();

  const 人員原始 = 讀取工作表為物件陣列_(試算表, 報工作業v2_設定.人員主檔);
  const 工站產品原始 = 讀取工作表為物件陣列_(試算表, 報工作業v2_設定.工站產品關聯);
  const 工站機台原始 = 讀取工作表為物件陣列_(試算表, 報工作業v2_設定.工站機台關聯);
  const 工站班別產能原始 = 讀取工作表為物件陣列_(試算表, 報工作業v2_設定.工站班別產能);

  const 人員 = 人員原始
    .map(整理人員資料_)
    .filter(r => r.工號 || r.姓名);

  const 工站產品關聯 = 工站產品原始
    .map(整理工站產品關聯_)
    .filter(r => r.產品編號 || r.品名 || r.工站代碼 || r.工站名稱);

  const 工站機台關聯 = 工站機台原始
    .map(整理工站機台關聯_)
    .filter(r => r.機台編號 || r.設備名稱 || r.工站代碼 || r.工站名稱);

  const 工站班別產能 = 工站班別產能原始
    .map(整理工站班別產能_)
    .filter(r => r.產品編號 || r.品名 || r.工站代碼 || r.工站名稱);

  return {
    成功: true,
    來源: '07_報工作業v2_GAS入口',
    更新時間: new Date().toISOString(),
    筆數: {
      人員: 人員.length,
      工站產品關聯: 工站產品關聯.length,
      工站機台關聯: 工站機台關聯.length,
      工站班別產能: 工站班別產能.length
    },
    人員: 人員,
    工站產品關聯: 工站產品關聯,
    工站機台關聯: 工站機台關聯,
    工站班別產能: 工站班別產能,
    班別清單: 取得班別清單_(),
    不良原因: 取得不良原因清單_(),
    異常類型: 取得異常類型清單_()
  };
}

/**
 * 寫入 09_報工紀錄
 */
function 寫入報工作業v2(資料) {
  if (!資料) {
    throw new Error('沒有收到報工資料');
  }

  const 試算表 = SpreadsheetApp.getActiveSpreadsheet();
  const 工作表 = 取得或建立報工紀錄表_(試算表);

  const 良品數 = 轉數字_(資料.良品數);
  const 不良數 = 轉數字_(資料.不良數);
  const 總產出 = 良品數 + 不良數;
  const 不良率 = 總產出 > 0 ? 不良數 / 總產出 : 0;

  const 報工編號 = 產生報工編號_();
  const 時間戳 = new Date();
  const 作業日 = 取得作業日_(時間戳);

  const 列資料 = [
    報工編號,
    時間戳,
    作業日,
    安全文字_(資料.工號),
    安全文字_(資料.姓名),
    安全文字_(資料.班別),
    安全文字_(資料.是否加班),
    安全文字_(資料.加班類型),
    安全文字_(資料.產品編號),
    安全文字_(資料.客戶品號),
    安全文字_(資料.品名),
    安全文字_(資料.工站代碼),
    安全文字_(資料.工站名稱),
    安全文字_(資料.工序),
    安全文字_(資料.機台清單),
    安全文字_(資料.主機台),
    良品數,
    不良數,
    總產出,
    不良率,
    安全文字_(資料.開始時間),
    安全文字_(資料.結束時間),
    轉數字_(資料.實際工時),
    安全文字_(資料.不良類別),
    安全文字_(資料.不良代碼),
    安全文字_(資料.不良原因),
    安全文字_(資料.異常類型),
    安全文字_(資料.備註),
    '報工作業v2側邊欄',
    '正常'
  ];

  工作表.appendRow(列資料);

  return {
    成功: true,
    訊息: '報工資料已寫入 09_報工紀錄',
    報工編號: 報工編號,
    作業日: 作業日,
    總產出: 總產出,
    不良率: 不良率,
    寫入時間: new Date().toISOString()
  };
}

/**
 * 取得或建立 09_報工紀錄
 */
function 取得或建立報工紀錄表_(試算表) {
  let 工作表 = 試算表.getSheetByName(報工作業v2_設定.報工紀錄);

  if (!工作表) {
    工作表 = 試算表.insertSheet(報工作業v2_設定.報工紀錄);
  }

  const 標題列 = [
    '報工編號',
    '時間戳',
    '作業日',
    '工號',
    '姓名',
    '班別',
    '是否加班',
    '加班類型',
    '產品編號',
    '客戶品號',
    '品名',
    '工站代碼',
    '工站名稱',
    '工序',
    '機台清單',
    '主機台',
    '良品數',
    '不良數',
    '總產出',
    '不良率',
    '開始時間',
    '結束時間',
    '實際工時',
    '不良類別',
    '不良代碼',
    '不良原因',
    '異常類型',
    '備註',
    '來源',
    '狀態'
  ];

  if (工作表.getLastRow() === 0) {
    工作表.getRange(1, 1, 1, 標題列.length).setValues([標題列]);
    工作表.setFrozenRows(1);
    return 工作表;
  }

  const 現有標題 = 工作表.getRange(1, 1, 1, Math.max(工作表.getLastColumn(), 1)).getDisplayValues()[0];
  const 需要重建標題 = 標題列.some((欄名, i) => 現有標題[i] !== 欄名);

  if (需要重建標題) {
    工作表.getRange(1, 1, 1, 標題列.length).setValues([標題列]);
    工作表.setFrozenRows(1);
  }

  return 工作表;
}

/**
 * 讀取工作表為物件陣列
 */
function 讀取工作表為物件陣列_(試算表, 分頁名稱) {
  const 工作表 = 試算表.getSheetByName(分頁名稱);
  if (!工作表) return [];

  const 最後列 = 工作表.getLastRow();
  const 最後欄 = 工作表.getLastColumn();

  if (最後列 < 2 || 最後欄 < 1) return [];

  const 值 = 工作表.getRange(1, 1, 最後列, 最後欄).getDisplayValues();
  const 標題 = 值[0].map(v => String(v || '').trim());

  return 值.slice(1).map((列, index) => {
    const 物件 = { _列號: index + 2 };
    標題.forEach((欄名, 欄位索引) => {
      if (欄名) {
        物件[欄名] = String(列[欄位索引] || '').trim();
      }
    });
    return 物件;
  }).filter(row => {
    return Object.keys(row).some(k => k !== '_列號' && String(row[k] || '').trim() !== '');
  });
}

/**
 * 人員資料整理
 */
function 整理人員資料_(row) {
  return {
    _列號: row._列號 || '',
    工號: 取第一個值_(row, ['工號', '員工編號', '人員編號', 'ID', 'Employee ID']),
    姓名: 取第一個值_(row, ['姓名', '人員姓名', '中文名', 'Name']),
    英文名: 取第一個值_(row, ['英文名', 'English Name']),
    部門: 取第一個值_(row, ['部門', '單位']),
    組別: 取第一個值_(row, ['組別', '課別']),
    職稱: 取第一個值_(row, ['職稱', '職務']),
    班別: 取第一個值_(row, ['班別', '班別名稱', '預設班別']),
    LINE_USER_ID: 取第一個值_(row, ['LINE_USER_ID', 'LINE User ID']),
    啟用: 取第一個值_(row, ['啟用', '狀態']) || '是'
  };
}

/**
 * 工站產品關聯整理
 */
function 整理工站產品關聯_(row) {
  return {
    _列號: row._列號 || '',
    關聯編號: 取第一個值_(row, ['關聯編號', '關聯ID']),
    產品編號: 取第一個值_(row, ['產品編號', '料號', '產品料號']),
    客戶品號: 取第一個值_(row, ['客戶品號', '客戶料號']),
    品名: 取第一個值_(row, ['品名', '產品名稱']),
    工序: 取第一個值_(row, ['工序', 'OP', '製程']),
    工站代碼: 取第一個值_(row, ['工站代碼', '工站編號']),
    工站名稱: 取第一個值_(row, ['工站名稱', '工站']),
    製程順序: 取第一個值_(row, ['製程順序', '順序']),
    是否主要工站: 取第一個值_(row, ['是否主要工站', '主要工站']) || '',
    啟用: 取第一個值_(row, ['啟用', '狀態']) || '是',
    備註: 取第一個值_(row, ['備註', '說明'])
  };
}

/**
 * 工站機台關聯整理
 */
function 整理工站機台關聯_(row) {
  return {
    _列號: row._列號 || '',
    關聯編號: 取第一個值_(row, ['關聯編號', '關聯ID']),
    工站代碼: 取第一個值_(row, ['工站代碼', '工站編號']),
    工站名稱: 取第一個值_(row, ['工站名稱', '工站']),
    產品編號: 取第一個值_(row, ['產品編號', '料號', '產品料號']),
    客戶品號: 取第一個值_(row, ['客戶品號', '客戶料號']),
    品名: 取第一個值_(row, ['品名', '產品名稱']),
    工序: 取第一個值_(row, ['工序', 'OP', '製程']),
    工序類型: 取第一個值_(row, ['工序類型', '製程類型']),
    區域: 取第一個值_(row, ['區域', '廠區']),
    機台編號: 取第一個值_(row, ['機台編號', '機台', '設備編號']),
    設備名稱: 取第一個值_(row, ['設備名稱', '機台名稱']),
    機台型號: 取第一個值_(row, ['機台型號', '型號']),
    組合編號: 取第一個值_(row, ['組合編號', '機台組合']),
    啟用: 取第一個值_(row, ['啟用', '狀態']) || '是',
    備註: 取第一個值_(row, ['備註', '說明'])
  };
}

/**
 * 工站班別產能整理
 */
function 整理工站班別產能_(row) {
  return {
    _列號: row._列號 || '',
    產品編號: 取第一個值_(row, ['產品編號', '料號', '產品料號']),
    客戶品號: 取第一個值_(row, ['客戶品號', '客戶料號']),
    品名: 取第一個值_(row, ['品名', '產品名稱']),
    工站代碼: 取第一個值_(row, ['工站代碼', '工站編號']),
    工站名稱: 取第一個值_(row, ['工站名稱', '工站']),
    工序: 取第一個值_(row, ['工序', 'OP', '製程']),
    班別: 取第一個值_(row, ['班別', '班別名稱']) || '早班',
    標準產能: 取第一個值_(row, ['標準產能', '班別產能', '8小時標準產能', '產能']),
    標準工時_秒: 取第一個值_(row, ['標準工時_秒', '標準工時']),
    啟用: 取第一個值_(row, ['啟用', '狀態']) || '是',
    備註: 取第一個值_(row, ['備註', '說明'])
  };
}

/**
 * 班別清單
 */
function 取得班別清單_() {
  return [
    { 值: '自動判斷', 名稱: '自動判斷 / Auto' },
    { 值: '早班', 名稱: '早班 / Day Shift' },
    { 值: '中班', 名稱: '中班 / Middle Shift' },
    { 值: '大夜班', 名稱: '大夜班 / Night Shift' },
    { 值: '加班', 名稱: '加班 / Overtime' }
  ];
}

/**
 * 異常類型清單
 */
function 取得異常類型清單_() {
  return [
    '無異常 / Normal',
    '機台停機 / Machine Down',
    '待料 / Waiting Material',
    '換刀 / Tool Change',
    '品質確認 / Quality Check',
    '人員支援 / Manpower Support',
    '換線 / Line Change',
    '其他 / Others'
  ];
}

/**
 * 不良原因清單
 */
function 取得不良原因清單_() {
  return {
    Z: [
      { 代碼: 'Z01', 名稱: '缺肉', 英文: 'Short Shot' },
      { 代碼: 'Z02', 名稱: '加工砂孔', 英文: 'Machining Blowhole' },
      { 代碼: 'Z03', 名稱: '黑皮', 英文: 'Black Skin' },
      { 代碼: 'Z04', 名稱: '落砂', 英文: 'Sand Drop' },
      { 代碼: 'Z05', 名稱: '變形', 英文: 'Deformation' },
      { 代碼: 'Z06', 名稱: '錯模', 英文: 'Mismatch' },
      { 代碼: 'Z07', 名稱: '試漏', 英文: 'Leakage Test' },
      { 代碼: 'Z08', 名稱: '生鏽', 英文: 'Rust' },
      { 代碼: 'Z09', 名稱: '裂痕', 英文: 'Crack' },
      { 代碼: 'Z10', 名稱: '內徑', 英文: 'Inner Dia.' },
      { 代碼: 'Z11', 名稱: '外徑', 英文: 'Outer Dia.' },
      { 代碼: 'Z12', 名稱: '平坦度', 英文: 'Flatness' },
      { 代碼: 'Z13', 名稱: '螺牙', 英文: 'Thread' },
      { 代碼: 'Z14', 名稱: '碰傷', 英文: 'Dent/Scratch' },
      { 代碼: 'Z15', 名稱: '震刀', 英文: 'Chatter Mark' },
      { 代碼: 'Z16', 名稱: '垂直度', 英文: 'Perpendicularity' },
      { 代碼: 'Z17', 名稱: '面粗度', 英文: 'Roughness' },
      { 代碼: 'Z18', 名稱: '孔位', 英文: 'Hole Pos.' },
      { 代碼: 'Z19', 名稱: '厚度', 英文: 'Thickness' },
      { 代碼: 'Z20', 名稱: '同心度', 英文: 'Concentricity' },
      { 代碼: 'Z21', 名稱: '試加工', 英文: 'Test Machining' },
      { 代碼: 'Z22', 名稱: '段差', 英文: 'Step' },
      { 代碼: 'Z23', 名稱: '偏轉', 英文: 'Runout' },
      { 代碼: 'Z24', 名稱: '壓傷', 英文: 'Crush' },
      { 代碼: 'Z25', 名稱: '真圓度', 英文: 'Roundness' },
      { 代碼: 'Z26', 名稱: '漏加工', 英文: 'Missed Op' },
      { 代碼: 'Z27', 名稱: '研磨打痕', 英文: 'Grinding Mark' },
      { 代碼: 'Z28', 名稱: '素材鬆孔', 英文: 'Porosity' },
      { 代碼: 'Z29', 名稱: '素材批號變更試加工', 英文: 'Batch Change Test' },
      { 代碼: 'Z30', 名稱: '含部兩', 英文: 'Inclusion' },
      { 代碼: 'Z31', 名稱: '球化率', 英文: 'Nodularity' },
      { 代碼: 'Z32', 名稱: '硬度', 英文: 'Hardness' },
      { 代碼: 'Z98', 名稱: '託外加工不良', 英文: 'Outsource NG' },
      { 代碼: 'Z99', 名稱: '素材不良退料', 英文: 'Material Return' }
    ],
    Y: [
      { 代碼: 'Y01', 名稱: '內徑', 英文: 'Inner Dia.' },
      { 代碼: 'Y02', 名稱: '外徑', 英文: 'Outer Dia.' },
      { 代碼: 'Y03', 名稱: '平坦度', 英文: 'Flatness' },
      { 代碼: 'Y04', 名稱: '螺牙', 英文: 'Thread' },
      { 代碼: 'Y05', 名稱: '碰傷', 英文: 'Dent/Scratch' },
      { 代碼: 'Y06', 名稱: '震刀', 英文: 'Chatter Mark' },
      { 代碼: 'Y07', 名稱: '垂直度', 英文: 'Perpendicularity' },
      { 代碼: 'Y08', 名稱: '面粗度', 英文: 'Roughness' },
      { 代碼: 'Y09', 名稱: '孔位', 英文: 'Hole Pos.' },
      { 代碼: 'Y10', 名稱: '厚度', 英文: 'Thickness' },
      { 代碼: 'Y11', 名稱: '刀具斷', 英文: 'Broken Tool' },
      { 代碼: 'Y12', 名稱: '同心度', 英文: 'Concentricity' },
      { 代碼: 'Y13', 名稱: '饒隙', 英文: 'Clearance' },
      { 代碼: 'Y14', 名稱: '試加工(試)', 英文: 'Test Trial' },
      { 代碼: 'Y15', 名稱: '換線', 英文: 'Line Change' },
      { 代碼: 'Y16', 名稱: '段差', 英文: 'Step' },
      { 代碼: 'Y17', 名稱: '夾持', 英文: 'Clamping' },
      { 代碼: 'Y18', 名稱: '偏轉', 英文: 'Runout' },
      { 代碼: 'Y19', 名稱: '壓傷', 英文: 'Crush' },
      { 代碼: 'Y20', 名稱: '生鏽', 英文: 'Rust' },
      { 代碼: 'Y21', 名稱: '切片', 英文: 'Slicing' },
      { 代碼: 'Y22', 名稱: '裝配變形', 英文: 'Assembly Deformation' },
      { 代碼: 'Y23', 名稱: '小零件', 英文: 'Small Part' },
      { 代碼: 'Y24', 名稱: '刀具異常', 英文: 'Tool NG' },
      { 代碼: 'Y25', 名稱: '試加工(車)', 英文: 'Test Lathe' },
      { 代碼: 'Y26', 名稱: '品保測試', 英文: 'QA Test' },
      { 代碼: 'Y27', 名稱: '鬆工', 英文: 'Loose Work' },
      { 代碼: 'Y28', 名稱: '新產品', 英文: 'New Product' },
      { 代碼: 'Y29', 名稱: '設變品', 英文: 'ECN Part' },
      { 代碼: 'Y30', 名稱: '試漏', 英文: 'Leakage Test' },
      { 代碼: 'Y31', 名稱: '氮化', 英文: 'Nitriding' },
      { 代碼: 'Y32', 名稱: '檢品', 英文: 'Inspection' },
      { 代碼: 'Y33', 名稱: '擦痕', 英文: 'Scratch' }
    ]
  };
}

/**
 * 作業日：06:10 前算前一天
 */
function 取得作業日_(日期) {
  const d = new Date(日期);
  const hour = d.getHours();
  const minute = d.getMinutes();

  if (hour < 6 || (hour === 6 && minute < 10)) {
    d.setDate(d.getDate() - 1);
  }

  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * 報工編號
 */
function 產生報工編號_() {
  return 'WR' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmssSSS');
}

/**
 * 取第一個有值欄位
 */
function 取第一個值_(row, 欄位清單) {
  for (let i = 0; i < 欄位清單.length; i++) {
    const 欄名 = 欄位清單[i];
    if (row[欄名] !== undefined && row[欄名] !== null && String(row[欄名]).trim() !== '') {
      return String(row[欄名]).trim();
    }
  }
  return '';
}

/**
 * 安全文字
 */
function 安全文字_(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

/**
 * 數字轉換
 */
function 轉數字_(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}
