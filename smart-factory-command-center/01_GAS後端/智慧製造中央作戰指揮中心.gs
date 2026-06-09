/**
 * 智慧製造中央作戰指揮中心 正式主入口
 * 版本：正式完整版_v1.5.4｜報工作業v2部署檢查版
 * 技術：Google Apps Script + Google Sheets + HTML5 PWA + LINE Bot
 *
 * 重要規則：
 * 1. 本檔是唯一正式 doGet / doPost 入口。
 * 2. v3_0_GAS主控入口與LINE最終整合版.gs 不可再宣告 doGet / doPost。
 * 3. 健康檢查、總檢查、LINE 指令會優先轉給 v3 模組。
 * 4. Web App action=戰情 / AI摘要 / 主檔檢查 / 寫入報工作業v2_化新班別版 / 報工作業v2部署檢查 直接轉成主系統正式函數。
 */

const 系統設定 = {
  系統名稱: '智慧製造中央作戰指揮中心',
  版本: '正式完整版_v1.5.4_報工作業v2部署檢查版',
  時區: 'Asia/Taipei',
  主資料庫ID: '',
  LINE_CHANNEL_ACCESS_TOKEN: '',
  LINE_CHANNEL_SECRET: ''
};

const 工作表規格 = {
  '00_系統設定': ['項目', '數值', '備註', '最後更新時間'],
  '01_人員主檔': ['工號', '姓名', '部門', '組別', '職稱', '班別', 'LINE_USER_ID', '啟用', '備註', '更新時間'],
  '02_產品主檔': ['產品編號', '客戶品號', '品名', '分類', '標準工時_秒', '標準產能_班', '啟用', '備註', '更新時間'],
  '03_機台主檔': ['機台編號', '機台名稱', '區域', '組別', '型號', '加工材質', '另裝配備', '狀態', '啟用', '更新時間'],
  '04_工站主檔': ['工站代碼', '工站名稱', '產品編號', '機台編號清單', '標準人力', '標準產能_班', '啟用', '備註', '更新時間'],
  '05_共用資料': ['資料類型', '代碼', '名稱', '排序', '啟用', '備註'],
  '09_報工紀錄': ['流水號', '時間戳', '作業日', '工號', '姓名', '班別', '區域', '機台編號', '產品編號', '品名', '工站名稱', '工單編號', '良品數', '不良數', '停機分鐘', '停機原因', '換刀次數', '備註', '來源', '狀態'],
  '09_停機紀錄': ['流水號', '時間戳', '作業日', '工號', '姓名', '機台編號', '工單編號', '停機開始', '停機結束', '停機分鐘', '原因類別', '原因說明', '狀態'],
  '09_換刀紀錄': ['流水號', '時間戳', '作業日', '工號', '姓名', '機台編號', '產品編號', '工單編號', '刀具名稱', '更換次數', '原因', '備註'],
  '09_不良紀錄': ['流水號', '時間戳', '作業日', '工號', '姓名', '產品編號', '品名', '機台編號', '工單編號', '不良代碼', '不良名稱', '不良數量', '責任歸屬', '說明', '照片網址'],
  '10_工單主檔': ['工單編號', '產品編號', '品名', '計畫量', '已完成量', '不良量', '開始日', '預計完工日', '優先級', '狀態', '備註', '更新時間'],
  '10_排程需求池': ['需求編號', '來源', '產品編號', '品名', '需求量', '交期', '建議工站', '建議機台', '需求人力', '狀態', '更新時間'],
  '11_檢具主檔': ['檢具編號', '產品編號', '品名', '箱號', '檢具名稱', '規格', '位置', '狀態', '校驗週期天數', '下次校驗日', '備註'],
  '12_AI分析紀錄': ['流水號', '時間戳', '分析類型', '輸入摘要', '分析結果', '建議動作', '風險等級', '是否完成'],
  'LINE_指令設定': ['指令', '名稱', '回覆類型', '目標模組', '啟用', '排序', '備註'],
  '系統_操作紀錄': ['時間戳', '操作者', '動作', '目標', '結果', '備註']
};

const 主檔管理設定 = {
  '01_人員主檔': '工號',
  '02_產品主檔': '產品編號',
  '03_機台主檔': '機台編號',
  '04_工站主檔': '工站代碼',
  '10_工單主檔': '工單編號',
  '10_排程需求池': '需求編號',
  '11_檢具主檔': '檢具編號'
};

function doGet(e) {
  e = e || { parameter: {} };
  const 參數 = e.parameter || {};
  const 動作 = String(參數.action || 參數.動作 || '').trim();

  if (!動作) {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle(系統設定.系統名稱)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return 輸出JSON_(處理API請求_(動作, 參數));
}

function doPost(e) {
  const 內容 = 解析POST內容_(e);
  if (內容 && 內容.events && Array.isArray(內容.events)) {
    if (typeof 處理LINEWebhook_v3_0_ === 'function') return 處理LINEWebhook_v3_0_(內容);
    return 處理LINEWebhook_(內容);
  }
  const 動作 = String(內容.action || 內容.動作 || '').trim();
  return 輸出JSON_(處理API請求_(動作, 內容));
}

function 處理前端請求(動作, 參數) {
  return 處理API請求_(動作, 參數 || {});
}

function 處理API請求_(動作, 參數) {
  const action = String(動作 || '健康檢查').trim();
  const p = 參數 || {};

  try {
    const v3動作 = ['健康檢查', 'health', '系統狀態', '總檢查', '上線檢查', '系統總檢查', '系統總檢查_v3_0', '系統總檢查_v3_0_', '模組自我檢查', '模組自我檢查_v3_0', '模組自我檢查_v3_0_', '入口檢查', '檢查入口衝突_v3_0', '指令', 'LINE指令', '取得LINE指令說明_v3_0'];
    if (v3動作.includes(action) && typeof 處理API請求_v3_0_ === 'function') {
      return 處理API請求_v3_0_({ action, 動作: action, parameter: p });
    }

    const map = {
      '初始化': () => 初始化_智慧製造中央作戰指揮中心(),
      '主入口健康檢查': () => 主入口健康檢查_(),
      '取得首頁資料': () => 取得首頁資料_(),
      '取得主檔資料': () => 取得主檔資料_(),
      '取得主檔管理資料': () => 取得主檔管理資料_(p),
      '新增或更新主檔': () => 新增或更新主檔_(p),
      '停用主檔資料': () => 停用主檔資料_(p),
      '匯入CSV主檔': () => 匯入CSV主檔_(p),
      '取得工單清單': () => 取得工單清單_(p),
      '新增工單': () => 新增工單_(p),
      '新增報工': () => 新增報工_(p),
      '寫入報工作業v2_化新班別版': () => 寫入報工作業v2_化新班別版(p),
      '報工作業v2部署檢查': () => 報工作業v2部署檢查_(),
      '新增停機': () => 新增停機_(p),
      '新增換刀': () => 新增換刀_(p),
      '新增不良': () => 新增不良_(p),
      '取得戰情室': () => 取得戰情室_(),
      '戰情': () => 取得KPI戰情_(),
      '取得KPI戰情': () => 取得KPI戰情_(),
      'AI摘要': () => 產生AI摘要_(),
      'AI 摘要': () => 產生AI摘要_(),
      '取得AI摘要': () => 產生AI摘要_(),
      '主檔檢查': () => 檢查主檔完整性_(),
      '檢查主檔完整性': () => 檢查主檔完整性_(),
      '檢查計畫主檔缺漏': () => 檢查計畫主檔缺漏_(p),
      '寫入排程需求池': () => 寫入排程需求池_(p),
      '系統自檢': () => 呼叫維護函數_('系統維護_一鍵自檢'),
      '修復欄位': () => 呼叫維護函數_('系統維護_修復全部欄位'),
      '建立備份': () => 呼叫維護函數_('系統維護_建立備份'),
      '每日快照': () => 呼叫維護函數_('系統維護_產生每日戰情快照'),
      '匯入測試資料': () => 匯入內建測試資料_(p)
    };

    if (!map[action]) return { 成功: false, 訊息: '未知動作：' + action, 可用動作: Object.keys(map).concat(v3動作) };
    return map[action]();
  } catch (錯誤) {
    return { 成功: false, 訊息: 錯誤.message, 堆疊: 錯誤.stack };
  }
}

function 主入口健康檢查_() {
  return { 成功: true, 系統: 系統設定.系統名稱, 版本: 系統設定.版本, 時間: new Date().toISOString(), v3模組: typeof 處理API請求_v3_0_ === 'function' ? '已載入' : '未載入' };
}

function 初始化_智慧製造中央作戰指揮中心() {
  const ss = 取得試算表_();
  Object.keys(工作表規格).forEach(名稱 => 建立或修復工作表_(ss, 名稱, 工作表規格[名稱]));
  寫入預設資料_();
  記錄操作_('系統', '初始化', '全部工作表', '完成', 系統設定.版本);
  return { 成功: true, 訊息: '初始化完成', 版本: 系統設定.版本 };
}

function 取得試算表_() {
  if (系統設定.主資料庫ID) return SpreadsheetApp.openById(系統設定.主資料庫ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('請先將此 GAS 綁定到 Google Sheets，或填入主資料庫ID');
  return ss;
}

function 建立或修復工作表_(ss, 名稱, 欄位) {
  let sh = ss.getSheetByName(名稱);
  if (!sh) sh = ss.insertSheet(名稱);
  const 欄數 = Math.max(sh.getLastColumn(), 欄位.length, 1);
  const 現有 = sh.getRange(1, 1, 1, 欄數).getValues()[0];
  欄位.forEach((欄, i) => { if (現有[i] !== 欄) sh.getRange(1, i + 1).setValue(欄); });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 欄位.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  sh.autoResizeColumns(1, 欄位.length);
}

function 表格轉物件_(工作表名稱) {
  const sh = 取得試算表_().getSheetByName(工作表名稱);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(r => r.some(v => v !== '')).map((r, idx) => {
    const o = { __列號: idx + 2 };
    headers.forEach((h, i) => o[h] = r[i]);
    return o;
  });
}

function 新增資料列_(工作表名稱, 資料) {
  const sh = 取得試算表_().getSheetByName(工作表名稱);
  if (!sh) throw new Error('找不到工作表：' + 工作表名稱);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(h => 資料[h] ?? ''));
}

function 取得作業日_() {
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, 系統設定.時區, 'H'));
  const minute = Number(Utilities.formatDate(now, 系統設定.時區, 'm'));
  const d = new Date(now);
  if (hour < 6 || (hour === 6 && minute < 10)) d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, 系統設定.時區, 'yyyy-MM-dd');
}

function 判斷化新班別_() {
  const now = new Date();
  const hm = Number(Utilities.formatDate(now, 系統設定.時區, 'HHmm'));
  if (hm >= 750 && hm < 1650) return '早班';
  if (hm >= 1650 || hm < 110) return '中班';
  return '夜班';
}

function 產生流水號_(前綴) {
  return 前綴 + '-' + Utilities.formatDate(new Date(), 系統設定.時區, 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function 取得主檔資料_() {
  return { 成功: true, 人員: 表格轉物件_('01_人員主檔'), 產品: 表格轉物件_('02_產品主檔'), 機台: 表格轉物件_('03_機台主檔'), 工站: 表格轉物件_('04_工站主檔'), 工單: 表格轉物件_('10_工單主檔'), 排程需求: 表格轉物件_('10_排程需求池'), 檢具: 表格轉物件_('11_檢具主檔'), 共用: 表格轉物件_('05_共用資料') };
}

function 驗證主檔表_(表名) {
  if (!主檔管理設定[表名]) throw new Error('不允許管理此工作表：' + 表名);
}

function 取得主檔管理資料_(p) {
  const 表名 = String(p.工作表名稱 || '01_人員主檔');
  驗證主檔表_(表名);
  return { 成功: true, 工作表名稱: 表名, 主鍵欄位: 主檔管理設定[表名], 欄位: 工作表規格[表名], 資料: 表格轉物件_(表名) };
}

function 新增或更新主檔_(p) {
  const 表名 = String(p.工作表名稱 || '');
  const 資料 = p.資料 || {};
  驗證主檔表_(表名);
  const 主鍵 = 主檔管理設定[表名];
  if (!資料[主鍵]) throw new Error('缺少主鍵欄位：' + 主鍵);
  const sh = 取得試算表_().getSheetByName(表名);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idxKey = headers.indexOf(主鍵);
  const values = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
  let rowIndex = -1;
  for (let i = 0; i < values.length; i++) if (String(values[i][idxKey]) === String(資料[主鍵])) rowIndex = i + 2;
  if (headers.includes('更新時間')) 資料['更新時間'] = new Date();
  if (headers.includes('啟用') && !資料['啟用']) 資料['啟用'] = '是';
  const row = headers.map(h => 資料[h] ?? '');
  if (rowIndex > 0) sh.getRange(rowIndex, 1, 1, headers.length).setValues([row]); else sh.appendRow(row);
  記錄操作_('資料管理', rowIndex > 0 ? '更新主檔' : '新增主檔', 表名 + '/' + 資料[主鍵], '完成', JSON.stringify(資料));
  return { 成功: true, 訊息: rowIndex > 0 ? '資料已更新' : '資料已新增', 工作表名稱: 表名, 主鍵欄位: 主鍵, 主鍵值: 資料[主鍵] };
}

function 停用主檔資料_(p) {
  const 表名 = String(p.工作表名稱 || '');
  const 主鍵值 = String(p.主鍵值 || '');
  驗證主檔表_(表名);
  const 主鍵 = 主檔管理設定[表名];
  const sh = 取得試算表_().getSheetByName(表名);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idxKey = headers.indexOf(主鍵), idxEnable = headers.indexOf('啟用'), idxStatus = headers.indexOf('狀態');
  const values = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][idxKey]) === 主鍵值) {
      const row = i + 2;
      if (idxEnable >= 0) sh.getRange(row, idxEnable + 1).setValue('否');
      if (idxStatus >= 0) sh.getRange(row, idxStatus + 1).setValue('停用');
      return { 成功: true, 訊息: '資料已停用', 工作表名稱: 表名, 主鍵值 };
    }
  }
  return { 成功: false, 訊息: '找不到資料：' + 主鍵值 };
}

function 匯入CSV主檔_(p) {
  const 表名 = String(p.工作表名稱 || '');
  const CSV文字 = String(p.CSV文字 || '');
  const 覆蓋 = String(p.覆蓋 || '') === '是';
  驗證主檔表_(表名);
  if (!CSV文字.trim()) throw new Error('缺少 CSV 文字');
  const rows = Utilities.parseCsv(CSV文字);
  if (rows.length < 2) throw new Error('CSV 至少需要表頭與一筆資料');
  const csvHeaders = rows[0];
  const sh = 取得試算表_().getSheetByName(表名);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const 不合法 = csvHeaders.filter(h => !headers.includes(h));
  if (不合法.length) throw new Error('CSV 欄位不屬於此工作表：' + 不合法.join('、'));
  if (覆蓋 && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  const output = rows.slice(1).filter(r => r.some(v => v !== '')).map(r => {
    const obj = {};
    csvHeaders.forEach((h, i) => obj[h] = r[i]);
    if (headers.includes('更新時間')) obj['更新時間'] = new Date();
    return headers.map(h => obj[h] ?? '');
  });
  if (output.length) sh.getRange(sh.getLastRow() + 1, 1, output.length, headers.length).setValues(output);
  return { 成功: true, 訊息: 'CSV 匯入完成', 工作表名稱: 表名, 筆數: output.length, 覆蓋 };
}

function 取得首頁資料_() {
  const 人員 = 表格轉物件_('01_人員主檔').filter(x => String(x['啟用']) !== '否');
  const 機台 = 表格轉物件_('03_機台主檔');
  const 工單 = 表格轉物件_('10_工單主檔');
  const 報工 = 表格轉物件_('09_報工紀錄');
  const 今日 = 取得作業日_();
  const 今日報工 = 報工.filter(x => String(x['作業日']) === 今日);
  return { 成功: true, 作業日: 今日, 指標: { 人員數: 人員.length, 機台數: 機台.length, 進行中工單: 工單.filter(x => ['進行中', '待生產'].includes(String(x['狀態']))).length, 今日良品: 今日報工.reduce((s, x) => s + Number(x['良品數'] || 0), 0), 今日不良: 今日報工.reduce((s, x) => s + Number(x['不良數'] || 0), 0), 今日報工筆數: 今日報工.length }, 最近報工: 報工.slice(-20).reverse(), 異常警示: 產生異常警示_() };
}

function 取得工單清單_(p) {
  let list = 表格轉物件_('10_工單主檔');
  if (p && p.狀態) list = list.filter(x => String(x['狀態']) === String(p.狀態));
  return { 成功: true, 資料: list };
}

function 新增工單_(p) {
  return 新增或更新主檔_({ 工作表名稱: '10_工單主檔', 資料: { '工單編號': p.工單編號 || 產生流水號_('MO'), '產品編號': p.產品編號 || '', '品名': p.品名 || '', '計畫量': Number(p.計畫量 || 0), '已完成量': Number(p.已完成量 || 0), '不良量': Number(p.不良量 || 0), '開始日': p.開始日 || 取得作業日_(), '預計完工日': p.預計完工日 || '', '優先級': p.優先級 || '一般', '狀態': p.狀態 || '待生產', '備註': p.備註 || '' } });
}

function 報工作業v2部署檢查_() {
  const ss = 取得試算表_();
  const 必要欄位 = {
    '09_報工紀錄': ['流水號', '時間戳', '作業日', '工號', '姓名', '班別', '區域', '機台編號', '產品編號', '品名', '工站名稱', '工單編號', '良品數', '不良數', '停機分鐘', '停機原因', '換刀次數', '備註', '來源', '狀態'],
    '10_工單主檔': ['工單編號', '產品編號', '品名', '計畫量', '已完成量', '不良量', '狀態', '更新時間'],
    '01_人員主檔': ['工號', '姓名', '班別'],
    '02_產品主檔': ['產品編號', '品名'],
    '03_機台主檔': ['機台編號', '區域'],
    '04_工站主檔': ['工站名稱', '產品編號', '機台編號清單']
  };
  const 表檢查 = Object.keys(必要欄位).map(表名 => {
    const sh = ss.getSheetByName(表名);
    if (!sh) return { 工作表名稱: 表名, 存在: false, 狀態: '缺少工作表', 缺少欄位: 必要欄位[表名] };
    const headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
    const 缺少欄位 = 必要欄位[表名].filter(h => !headers.includes(h));
    return { 工作表名稱: 表名, 存在: true, 欄位數: headers.length, 資料列數: Math.max(sh.getLastRow() - 1, 0), 缺少欄位, 狀態: 缺少欄位.length ? '需修復欄位' : '正常' };
  });
  const 是否正常 = 表檢查.every(x => x.存在 && x.缺少欄位.length === 0);
  return { 成功: 是否正常, 訊息: 是否正常 ? '報工作業v2部署檢查通過，可以送出報工' : '報工作業v2部署檢查未通過，請先初始化或修復欄位', 系統: 系統設定.系統名稱, 版本: 系統設定.版本, action: '報工作業v2部署檢查', 報工action: '寫入報工作業v2_化新班別版', 作業日: 取得作業日_(), 化新班別: 判斷化新班別_(), 不寫入資料: true, 表檢查 };
}

function 寫入報工作業v2_化新班別版(p) {
  p = p || {};
  if (!p.工號 && !p.姓名) throw new Error('請填工號或姓名');
  if (!p.產品編號) throw new Error('請填產品編號');
  if (!p.工站名稱) throw new Error('請填工站名稱');
  if (!p.機台編號) throw new Error('請填機台編號');
  const 良品數 = Number(p.良品數 || 0);
  const 不良數 = Number(p.不良數 || 0);
  if (良品數 + 不良數 <= 0) throw new Error('良品數+不良數必須大於0');
  const 資料 = Object.assign({}, p, {
    班別: p.班別 || 判斷化新班別_(),
    作業日: p.作業日 || 取得作業日_(),
    來源: '07_報工作業v2_化新班別版',
    良品數,
    不良數,
    停機分鐘: Number(p.停機分鐘 || 0),
    換刀次數: Number(p.換刀次數 || 0)
  });
  const 結果 = 新增報工_(資料);
  return { 成功: true, 訊息: '報工作業v2化新班別版寫入完成', 後端函數: '寫入報工作業v2_化新班別版', 作業日: 資料.作業日, 班別: 資料.班別, 資料: 結果.資料 };
}

function 新增報工_(p) {
  const 資料 = { '流水號': 產生流水號_('RF'), '時間戳': new Date(), '作業日': p.作業日 || 取得作業日_(), '工號': p.工號 || '', '姓名': p.姓名 || '', '班別': p.班別 || '', '區域': p.區域 || '', '機台編號': p.機台編號 || '', '產品編號': p.產品編號 || '', '品名': p.品名 || '', '工站名稱': p.工站名稱 || '', '工單編號': p.工單編號 || '', '良品數': Number(p.良品數 || 0), '不良數': Number(p.不良數 || 0), '停機分鐘': Number(p.停機分鐘 || 0), '停機原因': p.停機原因 || '', '換刀次數': Number(p.換刀次數 || 0), '備註': p.備註 || '', '來源': p.來源 || 'HTML5_PWA', '狀態': '有效' };
  新增資料列_('09_報工紀錄', 資料);
  更新工單完成量_(資料['工單編號'], 資料['良品數'], 資料['不良數']);
  return { 成功: true, 訊息: '報工完成', 資料 };
}

function 新增停機_(p) {
  const 資料 = { '流水號': 產生流水號_('DT'), '時間戳': new Date(), '作業日': p.作業日 || 取得作業日_(), '工號': p.工號 || '', '姓名': p.姓名 || '', '機台編號': p.機台編號 || '', '工單編號': p.工單編號 || '', '停機開始': p.停機開始 || '', '停機結束': p.停機結束 || '', '停機分鐘': Number(p.停機分鐘 || 0), '原因類別': p.原因類別 || '', '原因說明': p.原因說明 || '', '狀態': '有效' };
  新增資料列_('09_停機紀錄', 資料);
  return { 成功: true, 訊息: '停機紀錄完成', 資料 };
}

function 新增換刀_(p) {
  const 資料 = { '流水號': 產生流水號_('TL'), '時間戳': new Date(), '作業日': p.作業日 || 取得作業日_(), '工號': p.工號 || '', '姓名': p.姓名 || '', '機台編號': p.機台編號 || '', '產品編號': p.產品編號 || '', '工單編號': p.工單編號 || '', '刀具名稱': p.刀具名稱 || '', '更換次數': Number(p.更換次數 || 1), '原因': p.原因 || '', '備註': p.備註 || '' };
  新增資料列_('09_換刀紀錄', 資料);
  return { 成功: true, 訊息: '換刀紀錄完成', 資料 };
}

function 新增不良_(p) {
  const 資料 = { '流水號': 產生流水號_('NG'), '時間戳': new Date(), '作業日': p.作業日 || 取得作業日_(), '工號': p.工號 || '', '姓名': p.姓名 || '', '產品編號': p.產品編號 || '', '品名': p.品名 || '', '機台編號': p.機台編號 || '', '工單編號': p.工單編號 || '', '不良代碼': p.不良代碼 || '', '不良名稱': p.不良名稱 || '', '不良數量': Number(p.不良數量 || 0), '責任歸屬': p.責任歸屬 || '', '說明': p.說明 || '', '照片網址': p.照片網址 || '' };
  新增資料列_('09_不良紀錄', 資料);
  return { 成功: true, 訊息: '不良紀錄完成', 資料 };
}

function 更新工單完成量_(工單編號, 良品數, 不良數) {
  if (!工單編號) return;
  const sh = 取得試算表_().getSheetByName('10_工單主檔');
  if (!sh || sh.getLastRow() < 2) return;
  const values = sh.getDataRange().getValues(), h = values[0];
  const a = h.indexOf('工單編號'), b = h.indexOf('已完成量'), c = h.indexOf('不良量'), d = h.indexOf('計畫量'), e = h.indexOf('狀態'), f = h.indexOf('更新時間');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][a]) === String(工單編號)) {
      const 完成 = Number(values[r][b] || 0) + Number(良品數 || 0), 不良 = Number(values[r][c] || 0) + Number(不良數 || 0);
      sh.getRange(r + 1, b + 1).setValue(完成);
      sh.getRange(r + 1, c + 1).setValue(不良);
      if (f >= 0) sh.getRange(r + 1, f + 1).setValue(new Date());
      if (e >= 0) sh.getRange(r + 1, e + 1).setValue(完成 >= Number(values[r][d] || 0) ? '已完成' : '進行中');
      return;
    }
  }
}

function 取得戰情室_() {
  const k = 取得KPI戰情_();
  return { 成功: true, KPI: k.KPI, 工單達成排行: k.工單達成排行, 警示: 產生異常警示_() };
}

function 取得KPI戰情_() {
  const 今日 = 取得作業日_(), 工單 = 表格轉物件_('10_工單主檔'), 報工 = 表格轉物件_('09_報工紀錄'), 停機 = 表格轉物件_('09_停機紀錄'), 不良 = 表格轉物件_('09_不良紀錄');
  const 今日報工 = 報工.filter(x => String(x['作業日']) === 今日), 今日停機 = 停機.filter(x => String(x['作業日']) === 今日), 今日不良明細 = 不良.filter(x => String(x['作業日']) === 今日);
  const 總計畫 = 工單.reduce((s, x) => s + Number(x['計畫量'] || 0), 0), 總完成 = 工單.reduce((s, x) => s + Number(x['已完成量'] || 0), 0);
  const 今日良品 = 今日報工.reduce((s, x) => s + Number(x['良品數'] || 0), 0), 今日不良 = 今日報工.reduce((s, x) => s + Number(x['不良數'] || 0), 0) + 今日不良明細.reduce((s, x) => s + Number(x['不良數量'] || 0), 0);
  const 今日停機分鐘 = 今日報工.reduce((s, x) => s + Number(x['停機分鐘'] || 0), 0) + 今日停機.reduce((s, x) => s + Number(x['停機分鐘'] || 0), 0);
  const 達成率 = 總計畫 ? Math.round(總完成 / 總計畫 * 1000) / 10 : 0, 不良率 = (今日良品 + 今日不良) ? Math.round(今日不良 / (今日良品 + 今日不良) * 1000) / 10 : 0;
  return { 成功: true, 作業日: 今日, KPI: { 總計畫, 總完成, 達成率, 今日良品, 今日不良, 不良率, 今日停機分鐘, 逾期工單數: 產生異常警示_().length }, 工單達成排行: 工單.map(x => ({ 工單編號: x['工單編號'], 品名: x['品名'], 計畫量: Number(x['計畫量'] || 0), 已完成量: Number(x['已完成量'] || 0), 達成率: Number(x['計畫量'] || 0) ? Math.round(Number(x['已完成量'] || 0) / Number(x['計畫量'] || 0) * 1000) / 10 : 0, 狀態: x['狀態'] })).sort((a, b) => a.達成率 - b.達成率).slice(0, 10), 停機排行: 群組加總_(今日停機.concat(今日報工), '機台編號', '停機分鐘').slice(0, 10), 不良排行: 群組加總_(今日不良明細, '不良名稱', '不良數量').slice(0, 10) };
}

function 群組加總_(rows, key, numKey) {
  const map = {};
  rows.forEach(r => { const k = String(r[key] || '未填'); map[k] = (map[k] || 0) + Number(r[numKey] || 0); });
  return Object.keys(map).map(k => ({ 名稱: k, 數量: map[k] })).sort((a, b) => b.數量 - a.數量);
}

function 產生異常警示_() {
  const 工單 = 表格轉物件_('10_工單主檔'), today = new Date(取得作業日_());
  return 工單.filter(x => x['預計完工日'] && new Date(x['預計完工日']) < today && String(x['狀態']) !== '已完成').map(x => ({ 類型: '交期風險', 工單編號: x['工單編號'], 品名: x['品名'], 訊息: '已超過預計完工日仍未完成' }));
}

function 產生AI摘要_() {
  const k = 取得KPI戰情_();
  const 建議 = [];
  if (k.KPI.達成率 < 80) 建議.push('總達成率偏低，請先確認落後工單。');
  if (k.KPI.今日停機分鐘 > 120) 建議.push('今日停機分鐘偏高，請追蹤停機排行。');
  if (k.KPI.不良率 > 3) 建議.push('今日不良率偏高，請追蹤不良排行。');
  if (k.KPI.逾期工單數 > 0) 建議.push('有逾期工單，請優先處理交期風險。');
  if (!建議.length) 建議.push('目前狀態穩定，建議持續監控報工即時性。');
  const 風險 = k.KPI.逾期工單數 > 0 || k.KPI.不良率 > 3 ? '高' : (k.KPI.達成率 < 80 || k.KPI.今日停機分鐘 > 120 ? '中' : '低');
  const 結果 = { 成功: true, 風險等級: 風險, 摘要: `總達成率 ${k.KPI.達成率}%，今日不良率 ${k.KPI.不良率}%，今日停機 ${k.KPI.今日停機分鐘} 分鐘。`, 建議 };
  try { 新增資料列_('12_AI分析紀錄', { '流水號': 產生流水號_('AI'), '時間戳': new Date(), '分析類型': '戰情摘要', '輸入摘要': JSON.stringify(k.KPI), '分析結果': 結果.摘要, '建議動作': 建議.join('\n'), '風險等級': 風險, '是否完成': '否' }); } catch (e) {}
  return 結果;
}

function 檢查主檔完整性_() {
  const 結果 = [];
  Object.keys(主檔管理設定).forEach(表名 => {
    const 主鍵 = 主檔管理設定[表名];
    const list = 表格轉物件_(表名);
    const seen = {}, 重複 = [], 空白 = [];
    list.forEach(r => { const v = String(r[主鍵] || '').trim(); if (!v) 空白.push(r.__列號); else if (seen[v]) 重複.push(v); else seen[v] = true; });
    結果.push({ 工作表名稱: 表名, 主鍵欄位: 主鍵, 筆數: list.length, 空白主鍵列: 空白.join('、'), 重複主鍵: Array.from(new Set(重複)).join('、'), 狀態: 空白.length || 重複.length ? '需處理' : '正常' });
  });
  return { 成功: true, 訊息: '主檔完整性檢查完成', 結果 };
}

function 檢查計畫主檔缺漏_(p) {
  const 計畫 = p.計畫資料 || p.排程資料 || [];
  const 產品Set = 建立集合_('02_產品主檔', '產品編號');
  const 工站Set = 建立集合_('04_工站主檔', '工站名稱');
  const 機台Set = 建立集合_('03_機台主檔', '機台編號');
  const 缺產品 = {}, 缺工站 = {}, 缺機台 = {};
  計畫.forEach(x => {
    const 產品 = String(x['產品編號'] || '').trim();
    const 工站 = String(x['工站名稱'] || x['建議工站'] || '').trim();
    const 機台 = String(x['建議機台'] || '').trim();
    if (產品 && !產品Set[產品]) 缺產品[產品] = true;
    if (工站 && !工站Set[工站]) 缺工站[工站] = true;
    if (機台) 機台.split(/[,，、\s]+/).filter(Boolean).forEach(m => { if (!機台Set[m]) 缺機台[m] = true; });
  });
  return { 成功: true, 訊息: '計畫主檔缺漏檢查完成', 缺產品: Object.keys(缺產品), 缺工站: Object.keys(缺工站), 缺機台: Object.keys(缺機台), 是否可排程: !Object.keys(缺產品).length && !Object.keys(缺工站).length && !Object.keys(缺機台).length };
}

function 建立集合_(表名, 欄位) {
  const o = {};
  表格轉物件_(表名).forEach(r => { const v = String(r[欄位] || '').trim(); if (v && String(r['啟用'] || '是') !== '否' && String(r['狀態'] || '') !== '報廢' && String(r['狀態'] || '') !== '停用') o[v] = true; });
  return o;
}

function 寫入排程需求池_(p) {
  const list = p.排程資料 || p.需求資料 || [];
  if (!Array.isArray(list) || !list.length) throw new Error('缺少排程需求資料');
  const 檢查 = 檢查計畫主檔缺漏_({ 排程資料: list });
  const 允許缺漏寫入 = String(p.允許缺漏寫入 || '') === '是';
  if (!檢查.是否可排程 && !允許缺漏寫入) return { 成功: false, 訊息: '主檔缺漏，未寫入排程需求池', 檢查 };
  let 成功筆數 = 0;
  list.forEach(x => {
    新增或更新主檔_({ 工作表名稱: '10_排程需求池', 資料: { '需求編號': x['需求編號'] || 產生流水號_('REQ'), '來源': x['來源'] || '計畫清洗', '產品編號': x['產品編號'] || '', '品名': x['品名'] || '', '需求量': Number(x['需求量'] || x['計畫量'] || 0), '交期': x['交期'] || '', '建議工站': x['建議工站'] || x['工站名稱'] || '', '建議機台': x['建議機台'] || '', '需求人力': x['需求人力'] || '', '狀態': x['狀態'] || '待排程', '更新時間': new Date() } });
    成功筆數++;
  });
  return { 成功: true, 訊息: '排程需求池寫入完成', 筆數: 成功筆數, 檢查 };
}

function 呼叫維護函數_(函數名稱) {
  if (typeof this[函數名稱] !== 'function') return { 成功: false, 訊息: '找不到維護函數：' + 函數名稱 + '，請確認已貼上「系統維護工具.gs」。' };
  return this[函數名稱]();
}

function 匯入內建測試資料_(p) {
  const 覆蓋 = String(p && p.覆蓋 || '') === '是';
  const data = {
    '01_人員主檔': [['E001','嘉欣','製造部','製造一組','工程師','早班','','是','測試人員',new Date()]],
    '02_產品主檔': [['A900200000','CUST-A9002','ASSY 測試成品','成品',120,240,'是','末碼0成品',new Date()], ['A900200008','CUST-A9002-S','ASSY 測試半成品','半成品',90,320,'是','末碼8半成品',new Date()]],
    '03_機台主檔': [['1064','CNC-1064','A5','製造一組','CNC車床','鐵','分度盤','可生產','是',new Date()], ['1083','CNC-1083','A5','製造一組','CNC車床','鋁','內藏探頭','可生產','是',new Date()]],
    '04_工站主檔': [['WS-A5-001','A5 精車站','A900200000','1064,1083',1,240,'是','測試工站',new Date()]],
    '10_工單主檔': [['MO-TEST-001','A900200000','ASSY 測試成品',100,0,0,取得作業日_(),'2026-06-05','高','待生產','測試工單',new Date()]]
  };
  const ss = 取得試算表_();
  Object.keys(data).forEach(表名 => {
    const sh = ss.getSheetByName(表名);
    if (!sh) return;
    if (覆蓋 && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    if (!覆蓋 && sh.getLastRow() > 1) return;
    sh.getRange(sh.getLastRow() + 1, 1, data[表名].length, data[表名][0].length).setValues(data[表名]);
  });
  return { 成功: true, 訊息: '內建測試資料匯入完成', 覆蓋 };
}

function 處理LINEWebhook_(內容) {
  (內容.events || []).forEach(ev => {
    if (ev.type === 'message' && ev.message.type === 'text') 回覆LINE_(ev.replyToken, 產生LINE回覆_(ev.message.text.trim()));
  });
  return ContentService.createTextOutput('OK');
}

function 產生LINE回覆_(文字) {
  if (typeof 產生LINE回覆訊息_v3_0_ === 'function') {
    const msgs = 產生LINE回覆訊息_v3_0_(文字);
    if (Array.isArray(msgs) && msgs[0] && msgs[0].text) return msgs[0].text;
  }
  if (文字.includes('戰情') || 文字.includes('狀況')) {
    const x = 取得KPI戰情_();
    return `📊 智慧製造戰情\n作業日：${x.作業日}\n總計畫：${x.KPI.總計畫}\n總完成：${x.KPI.總完成}\n達成率：${x.KPI.達成率}%\n不良率：${x.KPI.不良率}%\n停機：${x.KPI.今日停機分鐘} 分鐘\n逾期警示：${x.KPI.逾期工單數} 筆`;
  }
  if (文字.includes('AI')) {
    const x = 產生AI摘要_();
    return `🤖 AI摘要\n風險：${x.風險等級}\n${x.摘要}\n建議：\n${x.建議.join('\n')}`;
  }
  return '🏭 智慧製造中央作戰指揮中心\n可輸入：指令、健康檢查、總檢查、戰情、AI摘要。';
}

function 回覆LINE_(replyToken, text) {
  if (!系統設定.LINE_CHANNEL_ACCESS_TOKEN) return;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + 系統設定.LINE_CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }), muteHttpExceptions: true });
}

function 解析POST內容_(e) {
  if (!e || !e.postData || !e.postData.contents) return e && e.parameter ? e.parameter : {};
  try { return JSON.parse(e.postData.contents); } catch (err) { return e.parameter || {}; }
}

function 輸出JSON_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON);
}

function 記錄操作_(操作者, 動作, 目標, 結果, 備註) {
  try { 新增資料列_('系統_操作紀錄', { '時間戳': new Date(), '操作者': 操作者, '動作': 動作, '目標': 目標, '結果': 結果, '備註': 備註 }); } catch (e) {}
}

function 寫入預設資料_() {
  const ss = 取得試算表_();
  if (ss.getSheetByName('00_系統設定').getLastRow() < 2) [['系統名稱', 系統設定.系統名稱, '系統顯示名稱', new Date()], ['版本', 系統設定.版本, '目前版本', new Date()], ['低達成率警戒', '80', '低於此值顯示警示', new Date()]].forEach(r => ss.getSheetByName('00_系統設定').appendRow(r));
  if (ss.getSheetByName('05_共用資料').getLastRow() < 2) [['班別','早班','早班',1,'是',''], ['班別','中班','中班',2,'是',''], ['班別','夜班','夜班',3,'是',''], ['停機原因','換線','換線',1,'是',''], ['停機原因','待料','待料',2,'是',''], ['停機原因','設備異常','設備異常',3,'是',''], ['不良類別','加工不良','加工不良',1,'是',''], ['不良類別','素材不良','素材不良',2,'是','']].forEach(r => ss.getSheetByName('05_共用資料').appendRow(r));
  if (ss.getSheetByName('LINE_指令設定').getLastRow() < 2) [['戰情','取得今日戰情','文字','12_AI分析中心','是',1,''], ['AI摘要','取得AI摘要','文字','12_AI分析中心','是',2,''], ['報工','開啟報工入口','連結','09_報工系統','是',3,'']].forEach(r => ss.getSheetByName('LINE_指令設定').appendRow(r));
}
