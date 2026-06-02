/**
 * v3.6.0 GAS 主控入口與 LINE Webhook 最終整合版
 * 用途：統一 GitHub Pages 前端 API、LINE Webhook、健康檢查、初始化、系統總檢查與 v1.0~v3.6 功能路由。
 * 使用方式：放在同一個 Apps Script 專案中。若專案已有 doGet / doPost，請以本檔為最終入口，避免重複定義。
 */

const V3_0_系統版本 = 'v3.6.0';

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
  const fn = (typeof globalThis !== 'undefined' && typeof globalThis[action] === 'function') ? globalThis[action] : this[action];
  if (typeof fn !== 'function') return { 成功: false, 版本: V3_0_系統版本, 訊息: '找不到 action 或函數：' + action };
  const keys = Object.keys(p || {}).filter(k => k !== 'action');
  if (keys.length === 0) return fn();

  if (p.工作表名稱 !== undefined && p.資料 !== undefined) return fn(p.工作表名稱, p.資料);
  if (p.工作表名稱 !== undefined) return fn(p.工作表名稱);

  // v3.5 handoff / lock API
  if (p.交接編號 !== undefined) return fn(p.交接編號, p.交接狀態, p.負責人, p.處理紀錄, p.備註);
  if (p.封版編號 !== undefined) return fn(p.封版編號);
  if (p.手冊編號 !== undefined) return fn(p.手冊編號);

  // v3.4 Commit / Issue / Release API
  if (p.BaseSHA !== undefined && p.HeadSHA !== undefined) return fn(p.BaseSHA, p.HeadSHA);
  if (p.CommitSHA !== undefined && p.修補編號 === undefined) return fn(p.CommitSHA);
  if (p.Issue編號 !== undefined) return fn(p.Issue編號);

  // v3.3 重測狀態更新
  if (p.重測編號 !== undefined) return fn(p.重測編號, p.重測狀態, p.重測結果, p.備註);

  // v3.2 GitHub / Commit 對照：必須放在一般修補狀態更新之前
  if (p.修補編號 !== undefined && p.CommitSHA !== undefined) return fn(p.修補編號, p.CommitSHA, p.備註);
  if (p.修補編號 !== undefined && p.新狀態 !== undefined) return fn(p.修補編號, p.新狀態, p.處理紀錄, p.負責人);
  if (p.修補編號 !== undefined) return fn(p.修補編號);

  if (p.任務編號 !== undefined) return fn(p.任務編號, p.新狀態, p.處理紀錄, p.負責人);
  if (p.共用素材編號 !== undefined && p.到貨數量 !== undefined) return fn(p.共用素材編號, p.到貨數量);
  if (p.目標ID !== undefined) return fn(p.目標ID);
  if (p.摘要文字 !== undefined) return fn(p.摘要文字);
  if (p.關鍵字 !== undefined) return fn(p.關鍵字);
  if (p.資料 !== undefined) return fn(p.資料);
  return fn(p);
}

function 初始化_v3_0_正式上線() {
  const steps = [];
  const call = (name) => {
    try {
      const fn = (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function') ? globalThis[name] : this[name];
      if (typeof fn === 'function') steps.push({ 函數: name, 結果: fn() });
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
    '升級_v2_9_任務自動推播設定表',
    '升級_v3_1_上線測試錯誤表',
    '升級_v3_2_修補GitHub與重測表',
    '升級_v3_4_封版與影響範圍表',
    '升級_v3_5_正式部署交接表',
    '升級_v3_6_正式交付總包表'
  ].forEach(call);
  return { 成功: true, 版本: V3_0_系統版本, 訊息: 'v3.6 正式上線初始化已執行', steps };
}

function 系統總檢查_v3_0_() {
  const requiredSheets = [
    '00_系統設定','01_人員主檔','02_產品主檔','03_機台主檔','04_工站主檔','10_工單主檔','10_排程需求池',
    '10_共用素材主檔','10_共用素材到貨紀錄','10_鎖料分配歷史','10_跨部門待辦任務','00_任務自動推播設定',
    '00_上線測試錯誤回報','00_上線修補任務','00_修補GitHub對照','00_修補重測清單','00_Commit影響範圍','00_正式上線封版報告',
    '00_正式部署手冊紀錄','00_版本鎖定紀錄','00_正式上線交接清單','00_正式交付總包紀錄','00_部署後健康檢查排程','00_部署後健康檢查紀錄'
  ];
  const ss = 取得試算表_();
  const sheets = ss.getSheets().map(s => s.getName());
  const 缺少工作表 = requiredSheets.filter(s => !sheets.includes(s));
  const requiredFunctions = [
    '取得主檔管理資料','新增或更新主檔','取得KPI戰情','取得AI摘要','產生LINE回覆訊息_v3_0_',
    '取得_v2_7_任務統計儀表板資料','取得_v2_8_任務負責人績效統計','取得_v2_9_任務週月完成率統計',
    '取得_v3_1_上線修補總覽','回報_v3_1_上線測試錯誤','取得_v3_2_修補GitHub總覽','產生_v3_2_修補建議',
    '取得_v3_3_修補完成率儀表板資料','更新_v3_3_重測狀態','產生_v3_3_上線修補週報','產生_v3_3_上線修補月報',
    '重測失敗_v3_4_再開修補任務','同步_v3_4_全部GitHubIssue狀態','比對_v3_4_單一Commit影響範圍','產生_v3_4_正式上線封版報告',
    '產生_v3_5_正式部署手冊','匯出_v3_5_封版報告PDF','鎖定_v3_5_封版版本','建立_v3_5_正式上線交接清單','取得_v3_5_正式交接總覽',
    '匯出_v3_6_正式部署手冊與封版報告合併PDF','匯出_v3_6_交接清單PDF','產生_v3_6_正式上線總包ZIP','建立_v3_6_部署後每日健康檢查排程','執行_v3_6_部署後每日健康檢查','取得_v3_6_正式交付總包總覽'
  ];
  const 函數狀態 = requiredFunctions.map(name => ({ 函數: name, 狀態: (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function') || typeof this[name] === 'function' ? '已載入' : '缺少' }));
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
  if (t === '修補報告' || t === '上線修補') return [{ type: 'text', text: typeof 產生_v3_1_上線修補報告 === 'function' ? 產生_v3_1_上線修補報告() : '尚未載入 v3.1 修補工具。' }];
  if (t === '修補週報') return [{ type: 'text', text: typeof 產生_v3_3_上線修補週報 === 'function' ? 產生_v3_3_上線修補週報() : '尚未載入 v3.3 修補週報工具。' }];
  if (t === '修補月報') return [{ type: 'text', text: typeof 產生_v3_3_上線修補月報 === 'function' ? 產生_v3_3_上線修補月報() : '尚未載入 v3.3 修補月報工具。' }];
  if (t === '封版報告') return [{ type: 'text', text: typeof 產生_v3_4_正式上線封版報告 === 'function' ? 產生_v3_4_正式上線封版報告().報告.slice(0, 4900) : '尚未載入 v3.4 封版報告工具。' }];
  if (t === '部署手冊') return [{ type: 'text', text: typeof 產生_v3_5_正式部署手冊 === 'function' ? 產生_v3_5_正式部署手冊().手冊.slice(0, 4900) : '尚未載入 v3.5 部署手冊工具。' }];
  if (t === '交接狀態') return [{ type: 'text', text: typeof 取得_v3_5_正式交接總覽 === 'function' ? JSON.stringify(取得_v3_5_正式交接總覽().統計, null, 2) : '尚未載入 v3.5 交接工具。' }];
  if (t === '交付總包' || t === '交付狀態') return [{ type: 'text', text: typeof 取得_v3_6_正式交付總包總覽 === 'function' ? JSON.stringify(取得_v3_6_正式交付總包總覽().統計, null, 2) : '尚未載入 v3.6 交付總包工具。' }];
  if (t === '每日健康檢查' || t === '部署健康檢查') return [{ type: 'text', text: typeof 執行_v3_6_部署後每日健康檢查 === 'function' ? JSON.stringify(執行_v3_6_部署後每日健康檢查(), null, 2).slice(0, 4900) : '尚未載入 v3.6 健康檢查工具。' }];
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
