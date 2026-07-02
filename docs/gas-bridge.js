(function(){
  'use strict';
  const GAS正式預設URL = 'https://script.google.com/macros/s/AKfycbwOi-xjKoMD9jVq4HrHBvh7k1DCn70lAPAJiqaWJhvH70PbuRo4ciopCjYcytIalaW4/exec';
  const 正式主資料庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  window.PWA_CONFIG = window.PWA_CONFIG || {};
  if (!window.PWA_CONFIG.GAS_WEB_APP_URL || window.PWA_CONFIG.GAS_WEB_APP_URL === '貼上 GAS Web App URL') window.PWA_CONFIG.GAS_WEB_APP_URL = GAS正式預設URL;
  window.PWA_CONFIG.SPREADSHEET_ID = 正式主資料庫ID;
  window.PWA_CONFIG.正式主資料庫ID = 正式主資料庫ID;
  const 設定 = window.PWA_CONFIG || {};
  const 預設逾時 = Number(設定.API_TIMEOUT_MS || 15000);
  const 臨時URL_KEY = '智慧製造_臨時GAS_WEB_APP_URL';
  function 清理網址(url){ return String(url || '').trim().replace(/\?.*$/,''); }
  function 取得GAS網址(){ const 臨時URL = 清理網址(localStorage.getItem(臨時URL_KEY)); const 正式URL = 清理網址(設定.GAS_WEB_APP_URL || GAS正式預設URL); if (臨時URL) return 臨時URL; if (!正式URL || 正式URL === '貼上 GAS Web App URL') return GAS正式預設URL; return 正式URL; }
  function 補主資料庫(payload){
    const p = Object.assign({}, payload || {});
    p.spreadsheetId = p.spreadsheetId || p.SPREADSHEET_ID || p.正式主資料庫ID || 正式主資料庫ID;
    p.SPREADSHEET_ID = p.SPREADSHEET_ID || p.spreadsheetId;
    p.正式主資料庫ID = p.正式主資料庫ID || p.spreadsheetId;
    p.主資料庫ID = p.主資料庫ID || p.spreadsheetId;
    p.databaseId = p.databaseId || p.spreadsheetId;
    return p;
  }
  function 建立網址(action, payload){
    const base = 取得GAS網址(); if (!base) throw new Error('尚未設定 GAS Web App URL，已改用正式預設 URL 仍失敗。');
    const url = new URL(base); url.searchParams.set('action', action); url.searchParams.set('動作', action); url.searchParams.set('_ts', String(Date.now()));
    const p = 補主資料庫(payload);
    Object.keys(p).forEach(key => { const value = p[key]; if (value === undefined || value === null) return; url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value)); });
    return url.toString();
  }
  function 建立BodyObj(action, payload){ return Object.assign({}, 補主資料庫(payload), { action: action, 動作: action, _ts: String(Date.now()) }); }
  function 建立表單Body(action, payload){ const bodyObj = 建立BodyObj(action, payload); const sp = new URLSearchParams(); Object.keys(bodyObj).forEach(key => { const value = bodyObj[key]; if (value === undefined || value === null) return; sp.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value)); }); const json = JSON.stringify(bodyObj); if (json.length < 220000) { sp.set('payload', json); sp.set('資料', json); sp.set('json', json); } return sp.toString(); }
  function 逾時Fetch(url, options, timeoutMs){ const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs); return fetch(url, Object.assign({}, options || {}, { signal: controller.signal })).catch(error => { if (error && error.name === 'AbortError') throw new Error(`API 逾時：${timeoutMs} ms，請檢查 GAS Web App 部署權限、網路或 Webhook/API 是否回應。`); throw error; }).finally(() => clearTimeout(timer)); }
  async function 解析回應(response){ const text = await response.text(); if (!response.ok) throw new Error(`HTTP ${response.status}：${text.slice(0,220)}`); try { return JSON.parse(text); } catch(e) { return { 成功:false, success:false, 訊息:'GAS 回傳不是 JSON', 原始回應:text.slice(0,800) }; } }
  function 是失敗回應(res){ if (!res || typeof res !== 'object') return true; if (res.成功 === false || res.success === false || res.ok === false) return true; const msg = String(res.訊息 || res.message || res.error || res.原始回應 || ''); return /UNKNOWN_ACTION|Unknown action|找不到|未接入|沒有.*動作|不支援|未部署/.test(msg); }
  async function GET(action, payload, options){ const url = 建立網址(action, payload); const timeoutMs = Number(options?.timeoutMs || 預設逾時); return 逾時Fetch(url, { method:'GET', cache:'no-store', mode:'cors', credentials:'omit' }, timeoutMs).then(解析回應); }
  function 表單送出(action, payload, reason){
    const base = 取得GAS網址(); if (!base) throw new Error('尚未設定 GAS Web App URL。');
    const bodyObj = 建立BodyObj(action, payload); const iframeName = 'gas_submit_' + Date.now() + '_' + Math.floor(Math.random()*10000);
    const iframe = document.createElement('iframe'); iframe.name = iframeName; iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0;border:0;';
    const form = document.createElement('form'); const url = new URL(base); url.searchParams.set('action', action); url.searchParams.set('動作', action); url.searchParams.set('_ts', String(Date.now())); url.searchParams.set('spreadsheetId', 正式主資料庫ID); url.searchParams.set('正式主資料庫ID', 正式主資料庫ID);
    form.method = 'POST'; form.action = url.toString(); form.target = iframeName; form.acceptCharset = 'UTF-8'; form.style.display = 'none';
    function add(name, value){ const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value === undefined || value === null ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value)); form.appendChild(input); }
    Object.keys(bodyObj).forEach(k => add(k, bodyObj[k])); const json = JSON.stringify(bodyObj); if (json.length < 220000) { add('payload', json); add('資料', json); add('json', json); }
    document.body.appendChild(iframe); document.body.appendChild(form); form.submit(); setTimeout(() => { try { form.remove(); iframe.remove(); } catch(e){} }, 15000);
    return Promise.resolve({ 成功:true, success:true, opaque:true, transport:'hidden_form_post', action:action, 訊息:'已使用表單通道送出至 GAS；此模式避開 iOS/Safari FetchEvent Load failed。請以正式主資料庫寫入結果為準。', 原因:reason || '' });
  }
  async function POST_NO_CORS(action, payload, reason){ const base = 取得GAS網址(); if (!base) throw new Error('尚未設定 GAS Web App URL。'); const url = new URL(base); url.searchParams.set('action', action); url.searchParams.set('動作', action); url.searchParams.set('_ts', String(Date.now())); url.searchParams.set('spreadsheetId', 正式主資料庫ID); const body = 建立表單Body(action, payload); try { await fetch(url.toString(), { method:'POST', cache:'no-store', mode:'no-cors', credentials:'omit', headers:{ 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8' }, body }); return { 成功:true, success:true, opaque:true, transport:'no_cors_post', action:action, 訊息:'已使用 no-cors 通道送出至 GAS；請以正式主資料庫為準。', 原因:reason || '' }; } catch(e) { return 表單送出(action, payload, 'no-cors 也失敗：' + (e.message || String(e))); } }
  async function POST(action, payload, options){
    const base = 取得GAS網址(); if (!base) throw new Error('尚未設定 GAS Web App URL。');
    const url = new URL(base); url.searchParams.set('action', action); url.searchParams.set('動作', action); url.searchParams.set('_ts', String(Date.now())); url.searchParams.set('spreadsheetId', 正式主資料庫ID); url.searchParams.set('正式主資料庫ID', 正式主資料庫ID);
    const timeoutMs = Number(options?.timeoutMs || 預設逾時); const formBody = 建立表單Body(action, payload);
    try { const res = await 逾時Fetch(url.toString(), { method:'POST', cache:'no-store', mode:'cors', credentials:'omit', headers:{ 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8' }, body: formBody }, timeoutMs).then(解析回應); if (!是失敗回應(res)) return res; try { const getRes = await GET(action, payload, { timeoutMs }); if (!是失敗回應(getRes)) return getRes; return POST_NO_CORS(action, payload, 'POST/GET 都有回應但不是成功：' + (getRes.訊息 || getRes.message || '')); } catch(getError) { return POST_NO_CORS(action, payload, 'POST 回應非成功，GET 失敗：' + getError.message); } } catch (postError) { try { const getRes = await GET(action, payload, { timeoutMs }); if (!是失敗回應(getRes)) return getRes; return POST_NO_CORS(action, payload, 'POST 失敗，GET 回應非成功：' + (getRes.訊息 || getRes.message || '')); } catch (getError) { return POST_NO_CORS(action, payload, `POST/GET fetch 均失敗：${postError.message}；${getError.message}`); } }
  }
  async function 呼叫(action, payload, options){ const method = String(options?.method || 'GET').toUpperCase(); if (method === 'POST') return POST(action, payload, options); return GET(action, payload, options); }
  async function 取得報工初始資料(){ return 呼叫(設定.API_ACTIONS?.取得報工作業v2初始資料 || '取得報工作業v2初始資料', { spreadsheetId: 正式主資料庫ID, 正式主資料庫ID: 正式主資料庫ID }, { timeoutMs: Number(設定.API_TIMEOUT_MS || 預設逾時) }); }
  async function 寫入報工(payload){ return 呼叫(設定.API_ACTIONS?.寫入報工作業v2 || '寫入報工作業v2', payload, { method:'POST', timeoutMs: Number(設定.API_TIMEOUT_MS || 預設逾時) }); }
  async function 寫入不良紀錄(payload){ return 呼叫(設定.API_ACTIONS?.寫入不良紀錄v2 || '寫入不良紀錄v2', payload, { method:'POST', timeoutMs: Number(設定.API_TIMEOUT_MS || 預設逾時) }); }
  window.GAS橋接器 = { 取得GAS網址, 建立網址, 呼叫, GET, POST, 取得報工初始資料, 寫入報工, 寫入不良紀錄, 正式主資料庫ID };
})();