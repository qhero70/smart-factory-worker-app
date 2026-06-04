/**
 * v3.7.6 GAS 主控入口與 LINE Webhook 最終整合版
 * 檔案定位：v3 路由模組，不直接宣告 doGet(e) / doPost(e)。
 * 正式入口：保留在「智慧製造中央作戰指揮中心.gs」。
 * 本版修正：LINE「主檔檢查」執行前，先補齊 04_工站產品關聯 / 04_工站機台關聯 / 04_工站班別產能 檢查規格。
 */

const V3_0_系統版本 = 'v3.7.6';
const V3_0_LINE文字上限 = 4900;

function 健康檢查_v3_0() {
  const 設定 = 取得系統設定_v3_0_();
  return {
    成功: true,
    版本: V3_0_系統版本,
    系統名稱: 設定.系統名稱 || '智慧製造中央作戰指揮中心',
    模式: 'v3 路由模組',
    正式入口: '智慧製造中央作戰指揮中心.gs 的 doGet / doPost',
    本檔入口: ['V3_0_主控入口_doGet(e)', 'V3_0_主控入口_doPost(e)'],
    訊息: '健康檢查正常：本檔沒有宣告重複 doGet / doPost',
    時間: new Date()
  };
}

function 模組自我檢查_v3_0() {
  const 函數清單 = [
    '健康檢查_v3_0', '模組自我檢查_v3_0', '系統總檢查_v3_0',
    'V3_0_主控入口_doGet', 'V3_0_主控入口_doPost', '處理API請求_v3_0_',
    '呼叫既有函數_v3_0_', '初始化_v3_0_正式上線', '檢查入口衝突_v3_0_',
    '處理LINEWebhook_v3_0_', '產生LINE回覆訊息_v3_0_', '回覆LINE訊息陣列_v3_0_',
    '產生主檔檢查回覆文字_v3_0_', '輸出JSON_v3_0_', '解析POST內容_v3_0_', '取得全域函數_v3_0_'
  ];
  const 狀態 = 建立函數狀態_v3_0_(函數清單);
  return { 成功: 狀態.every(x => x.狀態 === '已載入'), 版本: V3_0_系統版本, 檢查項目: 'v3 模組內部函數', 函數狀態: 狀態, 檢查時間: new Date() };
}

function 系統總檢查_v3_0() {
  const ss = 取得試算表安全_v3_0_();
  const 工作表名稱清單 = ss ? ss.getSheets().map(s => s.getName()) : [];
  const 核心工作表 = ['00_系統設定', '01_人員主檔', '02_產品主檔', '03_機台主檔', '04_工站主檔', '04_工站產品關聯', '04_工站機台關聯', '04_工站班別產能', '09_報工紀錄', '10_工單主檔', '10_排程需求池', '11_檢具主檔', '12_AI分析紀錄', 'LINE_指令設定', '系統_操作紀錄'];
  const 核心函數 = ['健康檢查_v3_0', '模組自我檢查_v3_0', '系統總檢查_v3_0', 'V3_0_主控入口_doGet', 'V3_0_主控入口_doPost', '處理API請求_v3_0_', '呼叫既有函數_v3_0_', '初始化_v3_0_正式上線', '檢查入口衝突_v3_0_', '處理LINEWebhook_v3_0_', '產生LINE回覆訊息_v3_0_', '回覆LINE訊息陣列_v3_0_', '輸出JSON_v3_0_', '解析POST內容_v3_0_', '取得全域函數_v3_0_'];
  const 主系統函數 = ['doGet', 'doPost', '取得試算表_', '處理API請求_', '取得主檔管理資料_', '新增或更新主檔_', '取得KPI戰情_', '產生AI摘要_', '檢查主檔完整性_', '寫入排程需求池_', '記錄操作_'];
  const 缺少核心工作表 = ss ? 核心工作表.filter(name => !工作表名稱清單.includes(name)) : 核心工作表;
  const 核心函數狀態 = 建立函數狀態_v3_0_(核心函數);
  const 主系統函數狀態 = 建立函數狀態_v3_0_(主系統函數);
  const 入口檢查 = 檢查入口衝突_v3_0_();
  const 缺少核心函數 = 核心函數狀態.filter(x => x.狀態 !== '已載入').map(x => x.函數);
  const 核心成功 = !!ss && 缺少核心函數.length === 0;
  return { 成功: 核心成功, 版本: V3_0_系統版本, 模式: 'v3 路由模組，不宣告 doGet / doPost', 試算表名稱: ss ? ss.getName() : '無法取得試算表', 核心成功, 缺少核心工作表, 核心函數狀態, 主系統函數狀態, 入口檢查, 建議: 產生總檢查建議_v3_0_(!!ss, 缺少核心工作表, 缺少核心函數, 入口檢查), 檢查時間: new Date() };
}

function 健康檢查_v3_0_() { return 健康檢查_v3_0(); }
function 模組自我檢查_v3_0_() { return 模組自我檢查_v3_0(); }
function 系統總檢查_v3_0_() { return 系統總檢查_v3_0(); }

function V3_0_主控入口_doGet(e) {
  const 參數 = e && e.parameter ? e.parameter : {};
  const action = String(參數.action || 參數.動作 || '健康檢查').trim();
  return 輸出JSON_v3_0_(處理API請求_v3_0_({ action, parameter: 參數 }));
}

function V3_0_主控入口_doPost(e) {
  try {
    const 內容 = 解析POST內容_v3_0_(e);
    if (內容 && 內容.events && Array.isArray(內容.events)) return 處理LINEWebhook_v3_0_(內容);
    return 輸出JSON_v3_0_(處理API請求_v3_0_(內容 || {}));
  } catch (錯誤) {
    記錄錯誤_v3_0_('V3_0_主控入口_doPost', 錯誤);
    return 輸出JSON_v3_0_({ 成功: false, 版本: V3_0_系統版本, 訊息: 錯誤.message, 堆疊: 錯誤.stack });
  }
}

function 處理API請求_v3_0_(data) {
  const 內容 = data || {};
  const action = String(內容.action || 內容.動作 || '健康檢查').trim();
  try {
    switch (action) {
      case '健康檢查': case '健康檢查_v3_0': case '健康檢查_v3_0_': case 'health': case '系統狀態': return 健康檢查_v3_0();
      case '模組自我檢查_v3_0': case '模組自我檢查_v3_0_': case '自我檢查': return 模組自我檢查_v3_0();
      case '系統總檢查_v3_0': case '系統總檢查_v3_0_': case '總檢查': case '上線檢查': return 系統總檢查_v3_0();
      case '初始化_v3_0_正式上線': return 初始化_v3_0_正式上線();
      case '檢查入口衝突_v3_0': case '入口檢查': return 檢查入口衝突_v3_0_();
      case '取得LINE指令說明_v3_0': case 'LINE指令': case '指令': return 取得LINE指令說明_v3_0_();
      default: return 呼叫既有函數_v3_0_(action, 內容);
    }
  } catch (錯誤) {
    記錄錯誤_v3_0_(action, 錯誤);
    return { 成功: false, 版本: V3_0_系統版本, action, 訊息: 錯誤.message, 堆疊: 錯誤.stack };
  }
}

function 呼叫既有函數_v3_0_(action, p) {
  const fn = 取得全域函數_v3_0_(action);
  if (typeof fn !== 'function') return { 成功: false, 版本: V3_0_系統版本, 訊息: '找不到 action 或函數：' + action };
  const 參數 = p || {};
  const keys = Object.keys(參數).filter(k => k !== 'action' && k !== '動作' && k !== 'parameter');
  if (keys.length === 0) return fn();
  if (參數.工作表名稱 !== undefined && 參數.資料 !== undefined) return fn(參數.工作表名稱, 參數.資料);
  if (參數.工作表名稱 !== undefined) return fn(參數.工作表名稱);
  if (參數.資料 !== undefined) return fn(參數.資料);
  return fn(參數);
}

function 初始化_v3_0_正式上線() {
  const steps = [];
  const 函數清單 = ['初始化系統', '初始化_智慧製造中央作戰指揮中心', '升級_v2_1_欄位結構', '升級_v2_2_CTB齊套缺料欄位', '升級_v2_4_共用素材主檔與紀錄表', '升級_v2_6_跨部門待辦任務表', '升級_v2_9_任務自動推播設定表', '升級_v3_1_上線測試錯誤表', '升級_v3_2_修補GitHub與重測表', '升級_v3_4_封版與影響範圍表', '升級_v3_5_正式部署交接表', '升級_v3_6_正式交付總包表', '升級_v3_7_Release觀察與異常修補表'];
  函數清單.forEach(name => {
    try {
      const fn = 取得全域函數_v3_0_(name);
      if (typeof fn === 'function') steps.push({ 函數: name, 狀態: '已執行', 結果: fn() });
      else steps.push({ 函數: name, 狀態: '未載入，略過' });
    } catch (錯誤) {
      steps.push({ 函數: name, 狀態: '執行失敗', 錯誤: 錯誤.message });
    }
  });
  return { 成功: true, 版本: V3_0_系統版本, 訊息: 'v3 正式上線初始化流程已執行', steps };
}

function 檢查入口衝突_v3_0_() {
  const doGet存在 = typeof 取得全域函數_v3_0_('doGet') === 'function';
  const doPost存在 = typeof 取得全域函數_v3_0_('doPost') === 'function';
  return { 成功: true, 結論: '本 v3 檔案沒有宣告 doGet / doPost；正式入口應只由主檔提供。', doGet存在, doPost存在, 本檔使用函數: ['V3_0_主控入口_doGet', 'V3_0_主控入口_doPost'], 判斷: doGet存在 && doPost存在 ? '主入口存在，狀態正常。' : '主入口未偵測到，請確認「智慧製造中央作戰指揮中心.gs」是否已貼入同一專案。' };
}

function 處理LINEWebhook_v3_0_(body) {
  const events = body && body.events && Array.isArray(body.events) ? body.events : [];
  events.forEach(ev => {
    if (!ev || !ev.replyToken || !ev.message || ev.message.type !== 'text') return;
    const text = String(ev.message.text || '').trim();
    const messages = 產生LINE回覆訊息_v3_0_(text);
    回覆LINE訊息陣列_v3_0_(ev.replyToken, messages);
  });
  return ContentService.createTextOutput('OK');
}

function 產生LINE回覆訊息_v3_0_(文字) {
  const t = String(文字 || '').trim();
  if (!t || t === '指令' || t === 'help' || t === '說明') return [{ type: 'text', text: 取得LINE指令說明文字_v3_0_() }];
  if (t === '版本' || t === '系統版本') return [{ type: 'text', text: '智慧製造中央作戰指揮中心 ' + V3_0_系統版本 }];
  if (t === '健康檢查' || t === '系統狀態') return [{ type: 'text', text: 限制文字長度_v3_0_(JSON.stringify(健康檢查_v3_0(), null, 2)) }];
  if (t === '總檢查' || t === '上線檢查' || t === '系統總檢查') return [{ type: 'text', text: 限制文字長度_v3_0_(JSON.stringify(系統總檢查_v3_0(), null, 2)) }];
  if (t === '入口檢查') return [{ type: 'text', text: 限制文字長度_v3_0_(JSON.stringify(檢查入口衝突_v3_0_(), null, 2)) }];
  if (t.indexOf('戰情') >= 0 || t.indexOf('狀況') >= 0) return [{ type: 'text', text: 產生戰情回覆文字_v3_0_() }];
  if (t === 'AI' || t.indexOf('AI摘要') >= 0 || t.indexOf('AI 摘要') >= 0) return [{ type: 'text', text: 產生AI回覆文字_v3_0_() }];
  if (t.indexOf('主檔') >= 0 && t.indexOf('檢查') >= 0) return [{ type: 'text', text: 產生主檔檢查回覆文字_v3_0_() }];
  return [{ type: 'text', text: '已收到：' + t + '\n可輸入：指令、版本、健康檢查、總檢查、入口檢查、戰情、AI摘要、主檔檢查。' }];
}

function 回覆LINE訊息陣列_v3_0_(replyToken, messages) {
  try {
    const text = (Array.isArray(messages) ? messages : [{ text: String(messages || '') }]).map(m => m && m.text ? m.text : '').filter(Boolean).join('\n\n');
    const fn = 取得全域函數_v3_0_('回覆LINE_');
    if (typeof fn === 'function') {
      fn(replyToken, text);
      return { 成功: true, 訊息: '已交由主入口 LINE 回覆函數處理' };
    }
    return { 成功: false, 訊息: '找不到主入口回覆LINE_函數' };
  } catch (錯誤) {
    記錄錯誤_v3_0_('回覆LINE訊息陣列_v3_0_', 錯誤);
    return { 成功: false, 訊息: 錯誤.message };
  }
}

function 取得LINE指令說明_v3_0_() {
  return { 成功: true, 版本: V3_0_系統版本, 指令: 取得LINE指令清單_v3_0_() };
}

function 取得LINE指令清單_v3_0_() {
  return [
    { 指令: '版本', 說明: '查看目前 v3 模組版本' },
    { 指令: '健康檢查', 說明: '確認 v3 模組是否正常' },
    { 指令: '總檢查', 說明: '檢查核心工作表與函數狀態' },
    { 指令: '入口檢查', 說明: '檢查 doGet / doPost 入口狀態' },
    { 指令: '戰情', 說明: '查看今日 KPI 戰情' },
    { 指令: 'AI摘要', 說明: '查看 AI 風險摘要與建議' },
    { 指令: '主檔檢查', 說明: '檢查主檔完整性' }
  ];
}

function 取得LINE指令說明文字_v3_0_() {
  const lines = ['🏭 智慧製造中央作戰指揮中心', '可用指令：'];
  取得LINE指令清單_v3_0_().forEach(x => lines.push('・' + x.指令 + '：' + x.說明));
  return lines.join('\n');
}

function 產生戰情回覆文字_v3_0_() {
  const fn = 取得全域函數_v3_0_('取得KPI戰情_');
  if (typeof fn !== 'function') return '尚未載入「取得KPI戰情_」函數，請確認主系統檔案已貼入。';
  const x = fn();
  if (!x || !x.KPI) return 限制文字長度_v3_0_(JSON.stringify(x, null, 2));
  return 限制文字長度_v3_0_(['📊 智慧製造戰情', '作業日：' + (x.作業日 || ''), '總計畫：' + 取值_v3_0_(x.KPI, '總計畫'), '總完成：' + 取值_v3_0_(x.KPI, '總完成'), '達成率：' + 取值_v3_0_(x.KPI, '達成率') + '%', '今日良品：' + 取值_v3_0_(x.KPI, '今日良品'), '今日不良：' + 取值_v3_0_(x.KPI, '今日不良'), '不良率：' + 取值_v3_0_(x.KPI, '不良率') + '%', '停機：' + 取值_v3_0_(x.KPI, '今日停機分鐘') + ' 分鐘', '逾期警示：' + 取值_v3_0_(x.KPI, '逾期工單數') + ' 筆'].join('\n'));
}

function 產生AI回覆文字_v3_0_() {
  const fn = 取得全域函數_v3_0_('產生AI摘要_');
  if (typeof fn !== 'function') return '尚未載入「產生AI摘要_」函數，請確認主系統檔案已貼入。';
  const x = fn();
  if (!x) return 'AI 摘要沒有回傳資料。';
  if (x.摘要 || x.建議) {
    return 限制文字長度_v3_0_(['🤖 AI 摘要', '風險：' + (x.風險等級 || '未判定'), x.摘要 || '', '建議：', Array.isArray(x.建議) ? x.建議.join('\n') : String(x.建議 || '')].join('\n'));
  }
  return 限制文字長度_v3_0_(JSON.stringify(x, null, 2));
}

function 產生主檔檢查回覆文字_v3_0_() {
  if (typeof 補齊04工站關聯規格_ === 'function') 補齊04工站關聯規格_();

  const fn = 取得全域函數_v3_0_('檢查主檔完整性_');
  if (typeof fn !== 'function') return '尚未載入「檢查主檔完整性_」函數，請確認主系統檔案已貼入。';
  const x = fn();
  if (!x || !Array.isArray(x.結果)) return 限制文字長度_v3_0_(JSON.stringify(x, null, 2));

  const lines = ['📋 主檔檢查完成', ''];
  let 總筆數 = 0;
  let 異常數 = 0;

  x.結果.forEach(r => {
    const 名稱 = 取值_v3_0_(r, '工作表名稱') || '未命名工作表';
    const 狀態 = 取值_v3_0_(r, '狀態') || '未判定';
    const 筆數 = Number(取值_v3_0_(r, '筆數') || 0);
    const 空白主鍵列 = String(取值_v3_0_(r, '空白主鍵列') || '').trim();
    const 重複主鍵 = String(取值_v3_0_(r, '重複主鍵') || '').trim();
    總筆數 += 筆數;
    if (狀態 !== '正常') 異常數++;
    lines.push(名稱 + '：' + 狀態 + '｜' + 筆數 + ' 筆');
    if (空白主鍵列) lines.push('  ⚠ 空白主鍵列：' + 空白主鍵列);
    if (重複主鍵) lines.push('  ⚠ 重複主鍵：' + 重複主鍵);
  });

  lines.push('');
  if (異常數 > 0) lines.push('結論：有 ' + 異常數 + ' 個主檔需要處理，請先修正空白或重複主鍵。');
  else if (總筆數 === 0) lines.push('結論：欄位結構正常，尚未匯入正式資料。');
  else lines.push('結論：欄位結構與主鍵檢查正常，可接續排程與報工串接。');

  return 限制文字長度_v3_0_(lines.join('\n'));
}

function 輸出JSON_v3_0_(obj) { return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON); }
function 解析POST內容_v3_0_(e) { if (!e) return {}; if (e.postData && e.postData.contents) { try { return JSON.parse(e.postData.contents); } catch (錯誤) { return e.parameter || {}; } } return e.parameter || {}; }
function 記錄錯誤_v3_0_(action, err) { try { const fn = 取得全域函數_v3_0_('記錄操作_'); if (typeof fn === 'function') fn('v3主控入口', action, 'ERROR', '失敗', err.message + '\n' + (err.stack || '')); } catch (e) {} }
function 取得全域函數_v3_0_(函數名稱) { const name = String(函數名稱 || '').trim(); if (!name) return null; try { if (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function') return globalThis[name]; } catch (e) {} try { if (typeof this !== 'undefined' && typeof this[name] === 'function') return this[name]; } catch (e) {} try { const fn = eval(name); if (typeof fn === 'function') return fn; } catch (e) {} return null; }
function 取得系統設定_v3_0_() { try { if (typeof 系統設定 !== 'undefined' && 系統設定) return 系統設定; } catch (e) {} return { 系統名稱: '智慧製造中央作戰指揮中心', 版本: V3_0_系統版本, 時區: 'Asia/Taipei', 主資料庫ID: '', LINE_CHANNEL_ACCESS_TOKEN: '', LINE_CHANNEL_SECRET: '' }; }
function 取得試算表安全_v3_0_() { try { const fn = 取得全域函數_v3_0_('取得試算表_'); if (typeof fn === 'function') return fn(); } catch (e) {} try { const 設定 = 取得系統設定_v3_0_(); if (設定.主資料庫ID) return SpreadsheetApp.openById(設定.主資料庫ID); } catch (e) {} try { return SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {} return null; }
function 建立函數狀態_v3_0_(函數清單) { return 函數清單.map(name => ({ 函數: name, 狀態: typeof 取得全域函數_v3_0_(name) === 'function' ? '已載入' : '缺少' })); }
function 產生總檢查建議_v3_0_(有試算表, 缺少核心工作表, 缺少核心函數, 入口檢查) { const 建議 = []; if (!有試算表) 建議.push('無法取得試算表：請確認 GAS 已綁定 Google Sheets，或已設定主資料庫ID。'); if (缺少核心工作表.length) 建議.push('缺少核心工作表：請先執行「初始化_智慧製造中央作戰指揮中心」或主系統初始化。'); if (缺少核心函數.length) 建議.push('缺少 v3 核心函數：請重新貼上最新版 v3_0_GAS主控入口與LINE最終整合版.gs。'); if (入口檢查 && (!入口檢查.doGet存在 || !入口檢查.doPost存在)) 建議.push('正式 doGet / doPost 未偵測到：請確認「智慧製造中央作戰指揮中心.gs」已貼入同一 Apps Script 專案。'); if (!建議.length) 建議.push('核心檢查正常，可以進行 LINE 與 Web App 測試。'); return 建議; }
function 限制文字長度_v3_0_(文字, 上限) { const limit = 上限 || V3_0_LINE文字上限; const text = String(文字 || ''); if (text.length <= limit) return text; return text.slice(0, limit - 30) + '\n...內容過長，已截斷'; }
function 取值_v3_0_(obj, key) { if (!obj) return ''; const v = obj[key]; return v === undefined || v === null ? '' : v; }
