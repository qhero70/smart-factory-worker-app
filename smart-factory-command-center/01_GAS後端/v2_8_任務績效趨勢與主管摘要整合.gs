/**
 * v2.8.0 任務績效趨勢與主管摘要整合工具
 * 用途：任務負責人績效統計、任務完成率趨勢、任務逾期推播、主管摘要整合任務週報。
 * 使用方式：與 v2_7_任務統計逾期週報與LINE圖卡.gs 放同一個 Apps Script 專案。
 */

function 取得_v2_8_任務負責人績效統計() {
  const list = 表格轉物件_('10_跨部門待辦任務');
  const map = {};
  list.forEach(x => {
    const owner = x['負責人'] || '未指派';
    if (!map[owner]) map[owner] = { 負責人: owner, 任務總數: 0, 已完成: 0, 未完成: 0, 逾期: 0, 高優先: 0, 完成率: 0 };
    map[owner].任務總數++;
    if (String(x['任務狀態'] || '') === '完成') map[owner].已完成++; else map[owner].未完成++;
    if (v2_8_是否逾期_(x)) map[owner].逾期++;
    if (String(x['優先級'] || '') === '高') map[owner].高優先++;
  });
  const rows = Object.keys(map).map(k => {
    const r = map[k];
    r.完成率 = r.任務總數 ? Math.round(r.已完成 / r.任務總數 * 1000) / 10 : 0;
    return r;
  }).sort((a, b) => b.逾期 - a.逾期 || a.完成率 - b.完成率);
  return { 成功: true, 版本: 'v2.8.0', 資料: rows };
}

function 取得_v2_8_任務完成率趨勢資料() {
  const list = 表格轉物件_('10_跨部門待辦任務');
  const map = {};
  list.forEach(x => {
    const date = v2_8_取日期_(x['建立時間'] || x['更新時間'] || new Date());
    if (!map[date]) map[date] = { 日期: date, 任務數: 0, 完成數: 0, 逾期數: 0, 完成率: 0 };
    map[date].任務數++;
    if (String(x['任務狀態'] || '') === '完成') map[date].完成數++;
    if (v2_8_是否逾期_(x)) map[date].逾期數++;
  });
  const rows = Object.keys(map).sort().map(k => {
    const r = map[k];
    r.完成率 = r.任務數 ? Math.round(r.完成數 / r.任務數 * 1000) / 10 : 0;
    return r;
  });
  return { 成功: true, 版本: 'v2.8.0', 資料: rows };
}

function 產生_v2_8_主管摘要任務段落() {
  const d = 取得_v2_7_任務統計儀表板資料();
  const p = 取得_v2_8_任務負責人績效統計();
  const topOwner = (p.資料 || []).slice(0, 5).map((x, i) => `${i + 1}. ${x.負責人}｜任務 ${x.任務總數}｜完成率 ${x.完成率}%｜逾期 ${x.逾期}`).join('\n') || '尚無負責人績效資料。';
  const risk = (d.高風險任務 || []).slice(0, 8).map((x, i) => `${i + 1}. ${x['負責單位']}｜${x['優先級']}｜${x['共用素材編號']}｜${x['任務狀態']}｜最晚採購 ${x['最晚採購日'] || '未填'}`).join('\n') || '目前無高風險任務。';
  return `九、跨部門任務追蹤\n1. 任務總數：${d.統計.任務總數}\n2. 未完成：${d.統計.未完成}\n3. 已完成：${d.統計.已完成}\n4. 逾期：${d.統計.逾期}\n5. 2天內到期：${d.統計.即將逾期}\n6. 高優先：${d.統計.高優先}\n\n負責人績效：\n${topOwner}\n\n高風險任務：\n${risk}\n\n任務建議：\n1. 逾期任務需由負責單位當日回覆處理進度。\n2. 高優先任務需確認是否影響出貨或排程。\n3. 未指派負責人的任務需先完成派工。`;
}

function 推播_v2_8_LINE任務逾期清單(目標ID) {
  const data = 取得_v2_7_任務統計儀表板資料();
  const top = (data.逾期任務 || []).slice(0, 10).map((x, i) => `${i + 1}. ${x['負責單位']}｜${x['共用素材編號']}｜${x['任務狀態']}｜最晚採購 ${x['最晚採購日'] || '未填'}`).join('\n') || '目前沒有逾期任務。';
  const text = `⚠️ 任務逾期警示\n逾期：${data.統計.逾期}\n2天內到期：${data.統計.即將逾期}\n未完成：${data.統計.未完成}\n\n逾期清單：\n${top}`;
  if (!目標ID) return { 成功: false, 訊息: '缺少 LINE 目標ID', 預覽: text };
  if (!系統設定.LINE_CHANNEL_ACCESS_TOKEN) return { 成功: false, 訊息: '尚未設定 LINE_CHANNEL_ACCESS_TOKEN', 預覽: text };
  const payload = { to: 目標ID, messages: [{ type: 'text', text }] };
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + 系統設定.LINE_CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  return { 成功: true, 狀態碼: res.getResponseCode(), 回應: res.getContentText(), 預覽: text };
}

function 產生LINE回覆訊息_v2_8_(文字) {
  const t = String(文字 || '').trim();
  if (t === '負責人績效' || t === '任務績效') {
    const r = 取得_v2_8_任務負責人績效統計();
    const txt = (r.資料 || []).slice(0, 10).map((x, i) => `${i + 1}. ${x.負責人}｜任務 ${x.任務總數}｜完成率 ${x.完成率}%｜逾期 ${x.逾期}`).join('\n') || '尚無資料';
    return [{ type: 'text', text: `📊 任務負責人績效\n${txt}` }];
  }
  if (t === '任務逾期' || t === '逾期任務') {
    return [{ type: 'text', text: 推播_v2_8_LINE任務逾期清單('').預覽 }];
  }
  if (t === '主管任務摘要') return [{ type: 'text', text: 產生_v2_8_主管摘要任務段落() }];
  if (typeof 產生LINE回覆訊息_v2_7_ === 'function') return 產生LINE回覆訊息_v2_7_(文字);
  return [{ type: 'text', text: '尚未載入 v2.7 LINE 回覆函數。' }];
}

function v2_8_是否逾期_(x) {
  if (String(x['任務狀態'] || '') === '完成') return false;
  const d = v2_8_日期差_(x['最晚採購日']);
  return d < 0;
}

function v2_8_日期差_(日期字串) {
  if (!日期字串) return 99999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(日期字串); if (isNaN(d)) return 99999;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function v2_8_取日期_(值) {
  const d = new Date(值);
  if (isNaN(d)) return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
  return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
}

function 測試_v2_8_負責人績效統計() {
  return 取得_v2_8_任務負責人績效統計();
}

function 測試_v2_8_主管摘要任務段落() {
  return 產生_v2_8_主管摘要任務段落();
}
