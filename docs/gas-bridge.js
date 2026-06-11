(function(){
  const 設定 = window.PWA_CONFIG || {};
  const 預設逾時 = Number(設定.API_TIMEOUT_MS || 20000);
  const 臨時URL_KEY = '智慧製造_臨時GAS_WEB_APP_URL';

  function 清理網址(url){
    return String(url || '').trim().replace(/\?.*$/,'');
  }

  function 取得GAS網址(){
    const 臨時URL = 清理網址(localStorage.getItem(臨時URL_KEY));
    const 正式URL = 清理網址(設定.GAS_WEB_APP_URL);
    if (臨時URL) return 臨時URL;
    if (!正式URL || 正式URL === '貼上 GAS Web App URL') return '';
    return 正式URL;
  }

  function 建立網址(action, payload){
    const base = 取得GAS網址();
    if (!base) throw new Error('尚未設定 GAS Web App URL，請先到 docs/pwa-config.js 填入正式 Web App URL。');
    const url = new URL(base);
    url.searchParams.set('action', action);
    if (payload && typeof payload === 'object') {
      Object.keys(payload).forEach(key => {
        const value = payload[key];
        if (value === undefined || value === null) return;
        if (typeof value === 'object') url.searchParams.set(key, JSON.stringify(value));
        else url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }

  function 加入逾時(promise, timeoutMs){
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`API 逾時：${timeoutMs} ms`)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  async function 解析回應(response){
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}：${text.slice(0,160)}`);
    try { return JSON.parse(text); }
    catch(e) { return { 成功:false, success:false, 訊息:'GAS 回傳不是 JSON', 原始回應:text }; }
  }

  async function GET(action, payload, options){
    const url = 建立網址(action, payload);
    const timeoutMs = Number(options?.timeoutMs || 預設逾時);
    return 加入逾時(fetch(url, { method:'GET', cache:'no-store' }).then(解析回應), timeoutMs);
  }

  async function POST(action, payload, options){
    const base = 取得GAS網址();
    if (!base) throw new Error('尚未設定 GAS Web App URL，請先到 docs/pwa-config.js 填入正式 Web App URL。');
    const url = new URL(base);
    url.searchParams.set('action', action);
    const timeoutMs = Number(options?.timeoutMs || 預設逾時);
    const body = JSON.stringify(payload || {});

    try {
      return await 加入逾時(fetch(url.toString(), {
        method:'POST',
        cache:'no-store',
        headers:{ 'Content-Type':'text/plain;charset=utf-8' },
        body
      }).then(解析回應), timeoutMs);
    } catch (postError) {
      const 降級Payload = { payload: body, 資料: body, json: body };
      try { return await GET(action, 降級Payload, { timeoutMs }); }
      catch (getError) { throw new Error(`POST 失敗：${postError.message}；GET 降級也失敗：${getError.message}`); }
    }
  }

  async function 呼叫(action, payload, options){
    const method = String(options?.method || 'GET').toUpperCase();
    if (method === 'POST') return POST(action, payload, options);
    return GET(action, payload, options);
  }

  async function 取得報工初始資料(){
    return 呼叫(設定.API_ACTIONS?.取得報工作業v2初始資料 || '取得報工作業v2初始資料');
  }

  async function 寫入報工(payload){
    return 呼叫(設定.API_ACTIONS?.寫入報工作業v2 || '寫入報工作業v2', payload, { method:'POST' });
  }

  async function 寫入不良紀錄(payload){
    return 呼叫(設定.API_ACTIONS?.寫入不良紀錄v2 || '寫入不良紀錄v2', payload, { method:'POST' });
  }

  window.GAS橋接器 = {
    取得GAS網址,
    建立網址,
    呼叫,
    GET,
    POST,
    取得報工初始資料,
    寫入報工,
    寫入不良紀錄
  };
})();
