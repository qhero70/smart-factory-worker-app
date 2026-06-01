/**
 * v3.0.0 GAS 主控入口與 LINE Webhook 最終整合版
 * 用途：統一 GitHub Pages 前端 API、LINE Webhook、健康檢查、初始化與 v1.0~v2.9 功能路由。
 * 使用方式：放在同一個 Apps Script 專案中。若專案已有 doGet / doPost，請以本檔為最終入口，避免重複定義。
 */

const V3_0_系統版本 = 'v3.0.0';

function doGet(e) {
  const action = e && e.parameter ? (e.parameter.action || '健康檢查') : '健康檢查';
  const result = 處理API請求_v3_0_({ action, parameter: e ? e.parameter : {} });
  return 輸出JSON_v3_0_(result);
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '';
    const data = body ? JSON.parse(body) : {};
    if (data.events && Array.isArray(data.events)) return 處理LINEWebhook_v3_0_(data);
    return 輸出JSON_v3_0_(處理API請求_v3_0_(data));
  } catch (err) {
    return 輸出JSON_v3_0_({ 成功: false, 版本: V3_0_系統版本, 訊息: err.message, stack: err.stack });
  }
}

function 處理API請求_v3_0_(data) {
  const action = data.action || '健康檢查';
  const p = data;
  try {
    switch (action) {
      case '健康檢查':
      case 'health':
        return 健康檢查_v3_0_();
      case '系統總檢查_v3_0':
        return 系統總檢查_v3_0_();
      case '初始化_v3_0_正式上線':
        return 初始化_v3_0_正式上線();
      default:
        return 呼叫既有函數_v3_0_(action, p);
    }
  } catch (err) {
    記錄錯誤_v3_0_(action, err);
    return { 成功: false, 版本: V3_0_系統版本, action, 訊息: err.message, stack: err.stack };
  }
}

function 呼叫既有函數_v3_0_(action, p) {
  const fn = this[action];
  if (typeof fn === 'function') {
    const keys = Object.keys(p || {}).filter(k => k !== 'action');
    if (keys.length === 0) return fn();
    if (p.資料 !== undefined) return fn(p.資料);
    if (p.工作表名稱 !== undefined && p.資料 !== undefined) return fn(p.工作表名稱, p.資料);
    if (p.任務編號 !== undefined) return fn(p.任務編號, p.新狀態, p.處理紀錄, p.負責人);
    if (p.共用素材編號 !== undefined && p.到貨數量 !== undefined) return fn(p.共用素材編號, p.到貨數量);
    if (p.目標ID !== undefined) return fn(p.目標ID);
    if (p.摘要文字 !== undefined) return fn(p.摘要文字);
    if (p.關鍵字 !== undefined) return fn(p.關鍵字);
    return fn(p);
  }
  return { 成功: false, 版本: V3_0_系統版本, 訊息: '找不到 action 或函數：' + action };
}

function 初始化_v3_0_正式上線() {
  const steps = [];
  const call = (name) => {
    try {
      if (typeof this[name] === 'function') steps.push({ 函數: name, 結果: this[name]() });
      else steps.push({ 函數: name, 結果: '未載入，略過' });
    } catch (err) {
      steps.push({ 函數: name, 錯誤: err.message });
    }
  };
  [
    '初始化系統',
    '升級_v2_1_欄位結構',
    '升級_v2_2_CTB齊套缺料欄位',
    '升級_v2_4_共用素材主檔與紀錄表',
    '升級_v2_6_跨部門待辦任務表',
    '升級_v2_9_任務自動推播設定表'
  ].forEach(call);
  return { 成功: true, 版本: V3_0_系統版本, 訊息: 'v3.0 正式上線初始化已執行', steps };
}

function 系統總檢查_v3_0_() {
  const requiredSheets = [
    '00_系統設定','01_人員主檔','02_產品主檔','03_機台主檔','04_工站主檔','10_工單主檔','10_排程需求池',
    '10_共用素材主檔','10_共用素材到貨紀錄','10_鎖料分配歷史','10_跨部門待辦任務','00_任務自動推播設定'
  ];
  const ss = 取得試算表_();
  const sheets = ss.getSheets().map(s => s.getName());
  const 缺少工作表 = requiredSheets.filter(s => !sheets.includes(s));
  const requiredFunctions = [
    '取得主檔管理資料','新增或更新主檔','取得KPI戰情','取得AI摘要','產生LINE回覆訊息_v3_0_',
    '取得_v2_7_任務統計儀表板資料','取得_v2_8_任務負責人績效統計','取得_v2_9_任務週月完成率統計'
  ];
  const 函數狀態 = requiredFunctions.map(name => ({ 函數: name, 狀態: typeof this[name] === 'function' ? '已載入' : '缺少' }));
  return {
    成功: 缺少工作表.length === 0 && 函數狀態.every(x => x.狀態 === '已載入'),
    版本: V3_0_系統版本,
    試算表名稱: ss.getName(),
    缺少工作表,
    函數狀態,
    檢查時間: new Date()
  };
}

function 健康檢查_v3_0_() {
  return {
    成功: true,
    版本: V3_0_系統版本,
    訊息: '智慧製造中央作戰指揮中心 API 正常',
    時間: new Date(),
    Webhook入口: '產生LINE回覆訊息_v3_0_(文字)'
  };
}

function 處理LINEWebhook_v3_0_(body) {
  (body.events || []).forEach(ev => {
    if (!ev.replyToken || !ev.message || ev.message.type !== 'text') return;
    const text = String(ev.message.text || '').trim();
    const messages = 產生LINE回覆訊息_v3_0_(text);
    回覆LINE訊息陣列_v3_0_(ev.replyToken, messages);
  });
  return ContentService.createTextOutput('OK');
}

function 產生LINE回覆訊息_v3_0_(文字) {
  const t = String(文字 || '').trim();
  if (t === '版本' || t === '系統版本') return [{ type: 'text', text: '智慧製造中央作戰指揮中心 ' + V3_0_系統版本 }];
  if (t === '健康檢查' || t === '系統狀態') return [{ type: 'text', text: JSON.stringify(健康檢查_v3_0_(), null, 2) }];
  if (t === '總檢查' || t === '上線檢查') return [{ type: 'text', text: JSON.stringify(系統總檢查_v3_0_(), null, 2).slice(0, 4900) }];
  if (typeof 產生LINE回覆訊息_v2_8_ === 'function') return 產生LINE回覆訊息_v2_8_(文字);
  if (typeof 產生LINE回覆訊息_v2_7_ === 'function') return 產生LINE回覆訊息_v2_7_(文字);
  if (typeof 產生LINE回覆訊息_v2_5_ === 'function') return 產生LINE回覆訊息_v2_5_(文字);
  if (typeof 產生LINE回覆訊息_v2_4_ === 'function') return 產生LINE回覆訊息_v2_4_(文字);
  if (typeof 產生LINE回覆訊息_ === 'function') return 產生LINE回覆訊息_(文字);
  return [{ type: 'text', text: '已收到：' + t + '\n但尚未載入 LINE 回覆模組。' }];
}

function 回覆LINE訊息陣列_v3_0_(replyToken, messages) {
  const token = 系統設定.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('尚未設定 LINE_CHANNEL_ACCESS_TOKEN');
  const payload = { replyToken, messages };
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify(payload), muteHttpExceptions: true
  });
}

function 輸出JSON_v3_0_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function 記錄錯誤_v3_0_(action, err) {
  try {
    if (typeof 記錄操作_ === 'function') 記錄操作_('v3主控入口', action, 'ERROR', '失敗', err.message + '\n' + err.stack);
  } catch (e) {}
}
