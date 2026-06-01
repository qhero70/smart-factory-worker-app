/**
 * v3.1.0 上線測試錯誤回報與修補任務工具
 * 用途：接收 system-test.html 或人工測試錯誤，寫入錯誤回報表，並自動建立修補任務。
 * 使用方式：與 v3_0_GAS主控入口與LINE最終整合版.gs 放同一個 Apps Script 專案。
 */

const V3_1_錯誤回報表 = '00_上線測試錯誤回報';
const V3_1_修補任務表 = '00_上線修補任務';

const V3_1_錯誤欄位 = ['錯誤編號','回報時間','來源頁面','測試類型','測試項目','錯誤等級','錯誤狀態','錯誤訊息','GAS網址','使用者','備註','原始資料','更新時間'];
const V3_1_修補欄位 = ['修補編號','建立時間','來源錯誤編號','修補類型','負責人','優先級','修補狀態','問題摘要','建議處理','處理紀錄','完成時間','更新時間'];

function 升級_v3_1_上線測試錯誤表() {
  v3_1_建立表與欄位_(V3_1_錯誤回報表, V3_1_錯誤欄位, '#991b1b');
  v3_1_建立表與欄位_(V3_1_修補任務表, V3_1_修補欄位, '#7c3aed');
  return { 成功: true, 版本: 'v3.1.0', 訊息: '上線測試錯誤回報與修補任務表已建立/更新' };
}

function 回報_v3_1_上線測試錯誤(資料) {
  升級_v3_1_上線測試錯誤表();
  const errId = 資料.錯誤編號 || ('ERR-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100));
  const row = {
    錯誤編號: errId,
    回報時間: new Date(),
    來源頁面: 資料.來源頁面 || '',
    測試類型: 資料.測試類型 || '',
    測試項目: 資料.測試項目 || '',
    錯誤等級: 資料.錯誤等級 || v3_1_判斷錯誤等級_(資料),
    錯誤狀態: '待判斷',
    錯誤訊息: 資料.錯誤訊息 || 資料.說明 || '',
    GAS網址: 資料.GAS網址 || '',
    使用者: 資料.使用者 || '',
    備註: 資料.備註 || '',
    原始資料: JSON.stringify(資料),
    更新時間: new Date()
  };
  v3_1_追加物件列_(V3_1_錯誤回報表, row);
  const task = 建立_v3_1_上線修補任務_(row);
  return { 成功: true, 版本: 'v3.1.0', 訊息: '錯誤已回報並建立修補任務', 錯誤編號: errId, 修補任務: task };
}

function 批次回報_v3_1_上線測試錯誤(資料陣列) {
  const list = Array.isArray(資料陣列) ? 資料陣列 : [];
  const result = list.filter(x => String(x.狀態 || '') === '失敗').map(x => 回報_v3_1_上線測試錯誤(x));
  return { 成功: true, 版本: 'v3.1.0', 回報數: result.length, 結果: result };
}

function 建立_v3_1_上線修補任務_(錯誤列) {
  const type = v3_1_判斷修補類型_(錯誤列);
  const taskId = 'FIX-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  const task = {
    修補編號: taskId,
    建立時間: new Date(),
    來源錯誤編號: 錯誤列.錯誤編號,
    修補類型: type,
    負責人: '',
    優先級: 錯誤列.錯誤等級 === '高' ? '高' : 錯誤列.錯誤等級 === '中' ? '中' : '一般',
    修補狀態: '待處理',
    問題摘要: `${錯誤列.測試類型}｜${錯誤列.測試項目}｜${錯誤列.錯誤訊息}`.slice(0, 300),
    建議處理: v3_1_建議處理_(錯誤列, type),
    處理紀錄: '',
    完成時間: '',
    更新時間: new Date()
  };
  v3_1_追加物件列_(V3_1_修補任務表, task);
  return task;
}

function 取得_v3_1_上線修補總覽() {
  升級_v3_1_上線測試錯誤表();
  const errors = 表格轉物件_(V3_1_錯誤回報表);
  const tasks = 表格轉物件_(V3_1_修補任務表);
  return {
    成功: true,
    版本: 'v3.1.0',
    統計: {
      錯誤總數: errors.length,
      高等級: errors.filter(x => x.錯誤等級 === '高').length,
      中等級: errors.filter(x => x.錯誤等級 === '中').length,
      低等級: errors.filter(x => x.錯誤等級 === '低').length,
      修補任務總數: tasks.length,
      待處理: tasks.filter(x => x.修補狀態 === '待處理').length,
      處理中: tasks.filter(x => x.修補狀態 === '處理中').length,
      完成: tasks.filter(x => x.修補狀態 === '完成').length
    },
    錯誤回報: errors.slice(-100).reverse(),
    修補任務: tasks.slice(-100).reverse()
  };
}

function 更新_v3_1_修補任務狀態(修補編號, 新狀態, 處理紀錄, 負責人) {
  const ss = 取得試算表_();
  const sh = ss.getSheetByName(V3_1_修補任務表);
  if (!sh) return { 成功: false, 訊息: '找不到修補任務表' };
  const data = sh.getDataRange().getValues();
  const header = data[0];
  const idx = {}; header.forEach((h, i) => idx[h] = i);
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx['修補編號']]) === String(修補編號)) {
      if (idx['修補狀態'] !== undefined) sh.getRange(r + 1, idx['修補狀態'] + 1).setValue(新狀態);
      if (idx['處理紀錄'] !== undefined) sh.getRange(r + 1, idx['處理紀錄'] + 1).setValue(處理紀錄 || '');
      if (idx['負責人'] !== undefined && 負責人) sh.getRange(r + 1, idx['負責人'] + 1).setValue(負責人);
      if (idx['完成時間'] !== undefined && 新狀態 === '完成') sh.getRange(r + 1, idx['完成時間'] + 1).setValue(new Date());
      if (idx['更新時間'] !== undefined) sh.getRange(r + 1, idx['更新時間'] + 1).setValue(new Date());
      return { 成功: true, 訊息: '修補任務狀態已更新' };
    }
  }
  return { 成功: false, 訊息: '找不到修補編號' };
}

function 產生_v3_1_上線修補報告() {
  const d = 取得_v3_1_上線修補總覽();
  const top = (d.修補任務 || []).filter(x => x.修補狀態 !== '完成').slice(0, 12).map((x, i) => `${i + 1}. ${x.優先級}｜${x.修補類型}｜${x.修補狀態}｜${x.問題摘要}`).join('\n') || '目前沒有未完成修補任務。';
  return `【v3.1.0 上線修補報告】\n錯誤總數：${d.統計.錯誤總數}\n高等級：${d.統計.高等級}\n中等級：${d.統計.中等級}\n低等級：${d.統計.低等級}\n修補任務總數：${d.統計.修補任務總數}\n待處理：${d.統計.待處理}\n處理中：${d.統計.處理中}\n完成：${d.統計.完成}\n\n未完成修補任務：\n${top}`;
}

function v3_1_判斷錯誤等級_(x) {
  const msg = `${x.測試類型 || ''} ${x.測試項目 || ''} ${x.錯誤訊息 || x.說明 || ''}`;
  if (/doPost|doGet|Webhook|LINE|權限|Exception|TypeError|ReferenceError|GAS|API|系統總檢查/.test(msg)) return '高';
  if (/404|缺少|欄位|工作表|資料/.test(msg)) return '中';
  return '低';
}

function v3_1_判斷修補類型_(x) {
  const msg = `${x.測試類型 || ''} ${x.測試項目 || ''} ${x.錯誤訊息 || ''}`;
  if (/LINE|Webhook/.test(msg)) return 'LINE Webhook';
  if (/API|GAS|doPost|doGet|ReferenceError|TypeError/.test(msg)) return 'GAS API';
  if (/頁面|404|html/.test(msg)) return 'GitHub Pages';
  if (/欄位|工作表|缺少/.test(msg)) return '資料表欄位';
  return '一般修補';
}

function v3_1_建議處理_(x, type) {
  if (type === 'LINE Webhook') return '確認 LINE Webhook URL、CHANNEL_ACCESS_TOKEN、doPost 是否以 v3.0 主控入口為準。';
  if (type === 'GAS API') return '確認 GAS 已貼入所有後端檔案、重新部署 Web App，並檢查 action 對應函數是否存在。';
  if (type === 'GitHub Pages') return '確認 docs 頁面檔案是否存在、GitHub Pages 是否已啟用、路徑大小寫是否正確。';
  if (type === '資料表欄位') return '執行 初始化_v3_0_正式上線()，再檢查智慧工廠主資料庫分頁與欄位。';
  return '依錯誤訊息檢查對應模組。';
}

function v3_1_建立表與欄位_(表名, 欄位, color) {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName(表名);
  if (!sh) sh = ss.insertSheet(表名);
  const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  欄位.forEach(h => { if (!現有.includes(h)) sh.getRange(1, sh.getLastColumn() + 1).setValue(h); });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#0f766e').setFontColor('#ffffff');
}

function v3_1_追加物件列_(表名, obj) {
  const sh = 取得試算表_().getSheetByName(表名);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(header.map(h => obj[h] !== undefined ? obj[h] : ''));
}

function 測試_v3_1_上線修補總覽() {
  return 取得_v3_1_上線修補總覽();
}
