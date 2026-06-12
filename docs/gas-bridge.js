(function(){
  const 設定 = window.PWA_CONFIG || {};
  const 預設逾時 = Number(設定.API_TIMEOUT_MS || 8000);
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
    url.searchParams.set('_ts', String(Date.now()));
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

  function 逾時Fetch(url, options, timeoutMs){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, Object.assign({}, options || {}, { signal: controller.signal }))
      .catch(error => {
        if (error && error.name === 'AbortError') {
          throw new Error(`API 逾時：${timeoutMs} ms，請檢查 GAS Web App 部署權限、網路或 Webhook/API 是否回應。`);
        }
        throw error;
      })
      .finally(() => clearTimeout(timer));
  }

  async function 解析回應(response){
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}：${text.slice(0,160)}`);
    try { return JSON.parse(text); }
    catch(e) { return { 成功:false, success:false, 訊息:'GAS 回傳不是 JSON', 原始回應:text.slice(0,500) }; }
  }

  async function GET(action, payload, options){
    const url = 建立網址(action, payload);
    const timeoutMs = Number(options?.timeoutMs || 預設逾時);
    return 逾時Fetch(url, { method:'GET', cache:'no-store', mode:'cors', credentials:'omit' }, timeoutMs).then(解析回應);
  }

  async function POST(action, payload, options){
    const base = 取得GAS網址();
    if (!base) throw new Error('尚未設定 GAS Web App URL，請先到 docs/pwa-config.js 填入正式 Web App URL。');
    const url = new URL(base);
    url.searchParams.set('action', action);
    url.searchParams.set('_ts', String(Date.now()));
    const timeoutMs = Number(options?.timeoutMs || 預設逾時);
    const body = JSON.stringify(payload || {});

    try {
      return await 逾時Fetch(url.toString(), {
        method:'POST',
        cache:'no-store',
        mode:'cors',
        credentials:'omit',
        headers:{ 'Content-Type':'text/plain;charset=utf-8' },
        body
      }, timeoutMs).then(解析回應);
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
    return 呼叫(設定.API_ACTIONS?.取得報工作業v2初始資料 || '取得報工作業v2初始資料', null, { timeoutMs: Number(設定.API_TIMEOUT_MS || 8000) });
  }

  async function 寫入報工(payload){
    return 呼叫(設定.API_ACTIONS?.寫入報工作業v2 || '寫入報工作業v2', payload, { method:'POST', timeoutMs: Number(設定.API_TIMEOUT_MS || 8000) });
  }

  async function 寫入不良紀錄(payload){
    return 呼叫(設定.API_ACTIONS?.寫入不良紀錄v2 || '寫入不良紀錄v2', payload, { method:'POST', timeoutMs: Number(設定.API_TIMEOUT_MS || 8000) });
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
