/**
 * 智慧製造中央作戰指揮中心 正式完整版
 * 技術：Google Apps Script + Google Sheets + HTML5 PWA + LINE Bot
 * 說明：所有資料表名稱、欄位名稱、函數名稱皆採繁體中文，方便現場維護。
 */

const 系統設定 = {
  系統名稱: '智慧製造中央作戰指揮中心',
  版本: '正式完整版_v1.0.1',
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

function doGet(e) {
  e = e || { parameter: {} };
  const 動作 = String((e.parameter && e.parameter.action) || '').trim();
  if (!動作) {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle(系統設定.系統名稱)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return 輸出JSON_(處理API請求_(動作, e.parameter || {}));
}

function doPost(e) {
  const 內容 = 解析POST內容_(e);
  if (內容 && 內容.events) return 處理LINEWebhook_(內容);
  const 動作 = 內容.action || 內容.動作 || '';
  return 輸出JSON_(處理API請求_(動作, 內容));
}

function 處理前端請求(動作, 參數) {
  return 處理API請求_(動作, 參數 || {});
}

function 初始化_智慧製造中央作戰指揮中心() {
  const 試算表 = 取得試算表_();
  Object.keys(工作表規格).forEach(名稱 => 建立或修復工作表_(試算表, 名稱, 工作表規格[名稱]));
  寫入預設資料_();
  記錄操作_('系統', '初始化', '全部工作表', '完成', 系統設定.版本);
  return { 成功: true, 訊息: '初始化完成', 版本: 系統設定.版本 };
}

function 測試_健康檢查() {
  return 處理API請求_('健康檢查', {});
}

function 測試_建立測試工單() {
  return 新增工單_({ 工單編號: 'MO-TEST-001', 產品編號: 'A900200000', 品名: '測試產品', 計畫量: 100, 優先級: '高', 狀態: '待生產' });
}

function 處理API請求_(動作, 參數) {
  try {
    const map = {
      '初始化': () => 初始化_智慧製造中央作戰指揮中心(),
      '取得首頁資料': () => 取得首頁資料_(),
      '取得主檔資料': () => 取得主檔資料_(),
      '取得工單清單': () => 取得工單清單_(參數),
      '新增報工': () => 新增報工_(參數),
      '新增停機': () => 新增停機_(參數),
      '新增換刀': () => 新增換刀_(參數),
      '新增不良': () => 新增不良_(參數),
      '新增工單': () => 新增工單_(參數),
      '取得戰情室': () => 取得戰情室_(),
      '取得AI摘要': () => 產生AI摘要_(),
      '健康檢查': () => ({ 成功: true, 系統: 系統設定.系統名稱, 版本: 系統設定.版本, 時間: new Date().toISOString() })
    };
    if (!map[動作]) return { 成功: false, 訊息: '未知動作：' + 動作 };
    return map[動作]();
  } catch (錯誤) {
    return { 成功: false, 訊息: 錯誤.message, 堆疊: 錯誤.stack };
  }
}

function 取得試算表_() {
  if (系統設定.主資料庫ID) return SpreadsheetApp.openById(系統設定.主資料庫ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('請先將此 GAS 綁定到 Google Sheets，或填入主資料庫ID');
  return ss;
}

function 建立或修復工作表_(試算表, 名稱, 欄位) {
  let sh = 試算表.getSheetByName(名稱);
  if (!sh) sh = 試算表.insertSheet(名稱);
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
  return values.filter(r => r.some(v => v !== '')).map(r => {
    const o = {};
    headers.forEach((h, i) => o[h] = r[i]);
    return o;
  });
}

function 新增資料列_(工作表名稱, 資料) {
  const sh = 取得試算表_().getSheetByName(工作表名稱);
  if (!sh) throw new Error('找不到工作表：' + 工作表名稱);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map(h => 資料[h] ?? '');
  sh.appendRow(row);
  return row;
}

function 取得作業日_() {
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, 系統設定.時區, 'H'));
  const minute = Number(Utilities.formatDate(now, 系統設定.時區, 'm'));
  const d = new Date(now);
  if (hour < 6 || (hour === 6 && minute < 10)) d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, 系統設定.時區, 'yyyy-MM-dd');
}

function 產生流水號_(前綴) {
  return 前綴 + '-' + Utilities.formatDate(new Date(), 系統設定.時區, 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
}

function 取得首頁資料_() {
  const 人員 = 表格轉物件_('01_人員主檔').filter(x => String(x['啟用']) !== '否');
  const 機台 = 表格轉物件_('03_機台主檔');
  const 工單 = 表格轉物件_('10_工單主檔');
  const 報工 = 表格轉物件_('09_報工紀錄');
  const 今日 = 取得作業日_();
  const 今日報工 = 報工.filter(x => String(x['作業日']) === 今日);
  const 今日良品 = 今日報工.reduce((s, x) => s + Number(x['良品數'] || 0), 0);
  const 今日不良 = 今日報工.reduce((s, x) => s + Number(x['不良數'] || 0), 0);
  return {
    成功: true,
    作業日: 今日,
    指標: {
      人員數: 人員.length,
      機台數: 機台.length,
      進行中工單: 工單.filter(x => ['進行中', '待生產'].includes(String(x['狀態']))).length,
      今日良品,
      今日不良,
      今日報工筆數: 今日報工.length
    },
    最近報工: 報工.slice(-20).reverse(),
    異常警示: 產生異常警示_()
  };
}

function 取得主檔資料_() {
  return {
    成功: true,
    人員: 表格轉物件_('01_人員主檔'),
    產品: 表格轉物件_('02_產品主檔'),
    機台: 表格轉物件_('03_機台主檔'),
    工站: 表格轉物件_('04_工站主檔'),
    共用: 表格轉物件_('05_共用資料')
  };
}

function 取得工單清單_(參數) {
  let list = 表格轉物件_('10_工單主檔');
  if (參數 && 參數.狀態) list = list.filter(x => String(x['狀態']) === String(參數.狀態));
  return { 成功: true, 資料: list };
}

function 新增報工_(p) {
  const 資料 = {
    '流水號': 產生流水號_('RF'),
    '時間戳': new Date(),
    '作業日': p.作業日 || 取得作業日_(),
    '工號': p.工號 || '',
    '姓名': p.姓名 || '',
    '班別': p.班別 || '',
    '區域': p.區域 || '',
    '機台編號': p.機台編號 || '',
    '產品編號': p.產品編號 || '',
    '品名': p.品名 || '',
    '工站名稱': p.工站名稱 || '',
    '工單編號': p.工單編號 || '',
    '良品數': Number(p.良品數 || 0),
    '不良數': Number(p.不良數 || 0),
    '停機分鐘': Number(p.停機分鐘 || 0),
    '停機原因': p.停機原因 || '',
    '換刀次數': Number(p.換刀次數 || 0),
    '備註': p.備註 || '',
    '來源': p.來源 || 'HTML5_PWA',
    '狀態': '有效'
  };
  新增資料列_('09_報工紀錄', 資料);
  更新工單完成量_(資料['工單編號'], 資料['良品數'], 資料['不良數']);
  記錄操作_(資料['姓名'] || 資料['工號'], '新增報工', 資料['工單編號'], '完成', JSON.stringify(資料));
  return { 成功: true, 訊息: '報工完成', 資料 };
}

function 新增停機_(p) {
  const 資料 = {
    '流水號': 產生流水號_('DT'), '時間戳': new Date(), '作業日': p.作業日 || 取得作業日_(),
    '工號': p.工號 || '', '姓名': p.姓名 || '', '機台編號': p.機台編號 || '', '工單編號': p.工單編號 || '',
    '停機開始': p.停機開始 || '', '停機結束': p.停機結束 || '', '停機分鐘': Number(p.停機分鐘 || 0),
    '原因類別': p.原因類別 || '', '原因說明': p.原因說明 || '', '狀態': '有效'
  };
  新增資料列_('09_停機紀錄', 資料);
  return { 成功: true, 訊息: '停機紀錄完成', 資料 };
}

function 新增換刀_(p) {
  const 資料 = {
    '流水號': 產生流水號_('TL'), '時間戳': new Date(), '作業日': p.作業日 || 取得作業日_(),
    '工號': p.工號 || '', '姓名': p.姓名 || '', '機台編號': p.機台編號 || '', '產品編號': p.產品編號 || '',
    '工單編號': p.工單編號 || '', '刀具名稱': p.刀具名稱 || '', '更換次數': Number(p.更換次數 || 1), '原因': p.原因 || '', '備註': p.備註 || ''
  };
  新增資料列_('09_換刀紀錄', 資料);
  return { 成功: true, 訊息: '換刀紀錄完成', 資料 };
}

function 新增不良_(p) {
  const 資料 = {
    '流水號': 產生流水號_('NG'), '時間戳': new Date(), '作業日': p.作業日 || 取得作業日_(),
    '工號': p.工號 || '', '姓名': p.姓名 || '', '產品編號': p.產品編號 || '', '品名': p.品名 || '', '機台編號': p.機台編號 || '',
    '工單編號': p.工單編號 || '', '不良代碼': p.不良代碼 || '', '不良名稱': p.不良名稱 || '', '不良數量': Number(p.不良數量 || 0),
    '責任歸屬': p.責任歸屬 || '', '說明': p.說明 || '', '照片網址': p.照片網址 || ''
  };
  新增資料列_('09_不良紀錄', 資料);
  return { 成功: true, 訊息: '不良紀錄完成', 資料 };
}

function 新增工單_(p) {
  const 資料 = {
    '工單編號': p.工單編號 || 產生流水號_('MO'), '產品編號': p.產品編號 || '', '品名': p.品名 || '',
    '計畫量': Number(p.計畫量 || 0), '已完成量': 0, '不良量': 0, '開始日': p.開始日 || 取得作業日_(),
    '預計完工日': p.預計完工日 || '', '優先級': p.優先級 || '一般', '狀態': p.狀態 || '待生產', '備註': p.備註 || '', '更新時間': new Date()
  };
  新增資料列_('10_工單主檔', 資料);
  return { 成功: true, 訊息: '工單建立完成', 資料 };
}

function 更新工單完成量_(工單編號, 良品數, 不良數) {
  if (!工單編號) return;
  const sh = 取得試算表_().getSheetByName('10_工單主檔');
  if (!sh || sh.getLastRow() < 2) return;
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idx工單 = headers.indexOf('工單編號');
  const idx完成 = headers.indexOf('已完成量');
  const idx不良 = headers.indexOf('不良量');
  const idx計畫 = headers.indexOf('計畫量');
  const idx狀態 = headers.indexOf('狀態');
  const idx更新 = headers.indexOf('更新時間');
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idx工單]) === String(工單編號)) {
      const 完成 = Number(values[r][idx完成] || 0) + Number(良品數 || 0);
      const 不良 = Number(values[r][idx不良] || 0) + Number(不良數 || 0);
      sh.getRange(r + 1, idx完成 + 1).setValue(完成);
      sh.getRange(r + 1, idx不良 + 1).setValue(不良);
      if (idx更新 >= 0) sh.getRange(r + 1, idx更新 + 1).setValue(new Date());
      if (idx狀態 >= 0) sh.getRange(r + 1, idx狀態 + 1).setValue(完成 >= Number(values[r][idx計畫] || 0) ? '已完成' : '進行中');
      return;
    }
  }
}

function 取得戰情室_() {
  const 首頁 = 取得首頁資料_();
  const 工單 = 表格轉物件_('10_工單主檔');
  const 報工 = 表格轉物件_('09_報工紀錄');
  const 總計畫 = 工單.reduce((s, x) => s + Number(x['計畫量'] || 0), 0);
  const 總完成 = 工單.reduce((s, x) => s + Number(x['已完成量'] || 0), 0);
  const 達成率 = 總計畫 ? Math.round(總完成 / 總計畫 * 1000) / 10 : 0;
  return { 成功: true, 首頁, 工單總數: 工單.length, 報工總數: 報工.length, 總計畫, 總完成, 達成率, 警示: 產生異常警示_() };
}

function 產生異常警示_() {
  const 工單 = 表格轉物件_('10_工單主檔');
  const today = new Date(取得作業日_());
  return 工單.filter(x => {
    if (!x['預計完工日']) return false;
    const due = new Date(x['預計完工日']);
    return due < today && String(x['狀態']) !== '已完成';
  }).map(x => ({ 類型: '交期風險', 工單編號: x['工單編號'], 品名: x['品名'], 訊息: '已超過預計完工日仍未完成' }));
}

function 產生AI摘要_() {
  const 戰情 = 取得戰情室_();
  const 風險 = 戰情.警示.length > 0 ? '高' : (戰情.達成率 < 60 ? '中' : '低');
  const 建議 = [];
  if (戰情.達成率 < 80) 建議.push('今日需優先確認進行中工單與瓶頸機台。');
  if (戰情.警示.length) 建議.push('請先處理逾期工單，避免交期風險擴大。');
  if (!建議.length) 建議.push('目前狀態穩定，建議持續監控報工即時性。');
  const 結果 = { 成功: true, 風險等級: 風險, 摘要: `目前總達成率 ${戰情.達成率}%，進行中與逾期狀態需持續追蹤。`, 建議 };
  新增資料列_('12_AI分析紀錄', {'流水號': 產生流水號_('AI'), '時間戳': new Date(), '分析類型': '戰情摘要', '輸入摘要': JSON.stringify({達成率: 戰情.達成率}), '分析結果': 結果.摘要, '建議動作': 建議.join('\n'), '風險等級': 風險, '是否完成': '否'});
  return 結果;
}

function 處理LINEWebhook_(內容) {
  const events = 內容.events || [];
  events.forEach(ev => {
    if (ev.type === 'message' && ev.message.type === 'text') {
      const text = ev.message.text.trim();
      const replyToken = ev.replyToken;
      const msg = 產生LINE回覆_(text);
      回覆LINE_(replyToken, msg);
    }
  });
  return ContentService.createTextOutput('OK');
}

function 產生LINE回覆_(文字) {
  if (文字.includes('戰情') || 文字.includes('狀況')) {
    const x = 取得戰情室_();
    return `📊 智慧製造戰情\n作業日：${取得作業日_()}\n總計畫：${x.總計畫}\n總完成：${x.總完成}\n達成率：${x.達成率}%\n警示：${x.警示.length} 筆`;
  }
  if (文字.includes('AI')) {
    const x = 產生AI摘要_();
    return `🤖 AI摘要\n風險：${x.風險等級}\n${x.摘要}\n建議：\n${x.建議.join('\n')}`;
  }
  return '🏭 智慧製造中央作戰指揮中心\n可輸入：戰情、AI摘要、工單、報工。';
}

function 回覆LINE_(replyToken, text) {
  if (!系統設定.LINE_CHANNEL_ACCESS_TOKEN) return;
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + 系統設定.LINE_CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }), muteHttpExceptions: true
  });
}

function 解析POST內容_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try { return JSON.parse(e.postData.contents); } catch (err) { return e.parameter || {}; }
}

function 輸出JSON_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON);
}

function 記錄操作_(操作者, 動作, 目標, 結果, 備註) {
  try { 新增資料列_('系統_操作紀錄', {'時間戳': new Date(), '操作者': 操作者, '動作': 動作, '目標': 目標, '結果': 結果, '備註': 備註}); } catch (e) {}
}

function 寫入預設資料_() {
  const ss = 取得試算表_();
  if (ss.getSheetByName('00_系統設定').getLastRow() < 2) {
    [['系統名稱', 系統設定.系統名稱, '系統顯示名稱', new Date()], ['版本', 系統設定.版本, '目前版本', new Date()], ['低達成率警戒', '80', '低於此值顯示警示', new Date()]].forEach(r => ss.getSheetByName('00_系統設定').appendRow(r));
  }
  if (ss.getSheetByName('05_共用資料').getLastRow() < 2) {
    const data = [['班別','早班','早班',1,'是',''],['班別','中班','中班',2,'是',''],['班別','夜班','夜班',3,'是',''],['停機原因','換線','換線',1,'是',''],['停機原因','待料','待料',2,'是',''],['停機原因','設備異常','設備異常',3,'是',''],['不良類別','加工不良','加工不良',1,'是',''],['不良類別','素材不良','素材不良',2,'是','']];
    data.forEach(r => ss.getSheetByName('05_共用資料').appendRow(r));
  }
  if (ss.getSheetByName('LINE_指令設定').getLastRow() < 2) {
    [['戰情','取得今日戰情','文字','12_AI分析中心','是',1,''],['AI摘要','取得AI摘要','文字','12_AI分析中心','是',2,''],['報工','開啟報工入口','連結','09_報工系統','是',3,'']].forEach(r => ss.getSheetByName('LINE_指令設定').appendRow(r));
  }
}
