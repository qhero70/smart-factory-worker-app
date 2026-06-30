/* 生產計劃表清洗器 V2.5｜GAS 資料庫橋接 v1
 * 功能：設定 GAS Web App URL、初始化 Google Sheets 資料庫、上傳 V2.4 DB 快照。
 * 不重寫清洗器；只掛接既有 DB 物件與匯出資料。
 */
(function(){
  'use strict';
  const 設定鍵 = '智慧製造_GAS資料庫_API_URL';
  const d = id => document.getElementById(id);
  const 文 = v => String(v == null ? '' : v).trim();
  function 狀態(msg, ok){
    const box = d('訊息區');
    if (box) {
      box.className = '訊息 ' + (ok === false ? '錯' : ok === true ? '好' : '');
      box.textContent = msg;
    }
    const top = d('狀態文字'); if (top) top.textContent = String(msg).split('\n')[0];
    const bottom = d('底部狀態'); if (bottom) bottom.textContent = String(msg).split('\n')[0];
  }
  function 取URL(){ return localStorage.getItem(設定鍵) || ''; }
  function 存URL(url){ localStorage.setItem(設定鍵, url); }
  function 注入樣式(){
    if (d('GAS橋接樣式')) return;
    const s = document.createElement('style');
    s.id = 'GAS橋接樣式';
    s.textContent = '.gasbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}.gasbar input{min-width:min(100%,420px);flex:1;border:1px solid #dbeafe;border-radius:12px;padding:10px;font-weight:800}.gasbar .gasnote{font-size:12px;color:#64748b;width:100%;line-height:1.55}';
    document.head.appendChild(s);
  }
  function 建立工具列(){
    if (d('GAS資料庫工具列')) return;
    注入樣式();
    const target = d('結果區') || document.querySelector('main') || document.body;
    const card = document.createElement('section');
    card.className = '卡';
    card.id = 'GAS資料庫工具列';
    card.innerHTML = '<h2>Google Sheets 中央資料庫</h2>' +
      '<div class="gasbar">' +
      '<input id="GAS_URL_輸入" placeholder="貼上 GAS Web App URL：https://script.google.com/macros/s/.../exec" value="' + escapeHtml(取URL()) + '">' +
      '<button class="鈕" id="GAS_儲存URL">儲存URL</button>' +
      '<button class="鈕" id="GAS_初始化">初始化資料庫</button>' +
      '<button class="主鈕" id="GAS_上傳資料庫">上傳中央資料庫</button>' +
      '<div class="gasnote">先部署 GAS Web App，再貼上 /exec URL。上傳會寫入：BOM明細、每日明細、本月彙總、出貨訂單、BOM需求展開、CTB、10_排程需求池、11_自動排程結果、13_拆工單結果。</div>' +
      '</div>';
    target.parentNode.insertBefore(card, target.nextSibling);
    d('GAS_儲存URL').onclick = function(){ 存URL(文(d('GAS_URL_輸入').value)); 狀態('✅ 已儲存 GAS Web App URL。', true); };
    d('GAS_初始化').onclick = 初始化資料庫;
    d('GAS_上傳資料庫').onclick = 上傳資料庫;
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  async function 發送(payload){
    const url = 文(d('GAS_URL_輸入') ? d('GAS_URL_輸入').value : 取URL());
    if (!url || !/^https:\/\/script\.google\.com\/macros\/s\//.test(url)) throw new Error('請先貼上正確的 GAS Web App /exec URL');
    存URL(url);
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload), redirect:'follow' });
    const text = await res.text();
    try { return JSON.parse(text); } catch(e) { return { ok:res.ok, raw:text, status:res.status }; }
  }
  async function 初始化資料庫(){
    try{
      狀態('📡 正在初始化 Google Sheets 中央資料庫...', null);
      const ans = await 發送({ action:'初始化', source:'PWA_V2.5' });
      if (!ans.ok) throw new Error(ans.錯誤 || ans.raw || '初始化失敗');
      狀態('✅ 初始化完成。\n資料庫：' + (ans.資料庫名稱 || '') + '\n網址：' + (ans.資料庫網址 || ''), true);
    }catch(err){ 狀態('❌ 初始化失敗：\n' + (err.message || err), false); }
  }
  function 取DB快照(){
    if (typeof window.匯出資料庫資料 === 'function') return window.匯出資料庫資料();
    const names = {
      'BOM明細': ['BOM明細','DB_BOM','__BOM__'],
      '每日明細': ['每日明細','parsedRows','filteredRows','DAILY_ROWS'],
      '本月彙總': ['本月彙總','summaryRows'],
      '出貨訂單': ['出貨訂單','shipmentRows'],
      'BOM需求展開': ['BOM需求展開'],
      'CTB齊套檢查': ['CTB齊套檢查'],
      '排程需求池': ['排程需求池'],
      '自動排程結果': ['自動排程結果'],
      '拆工單結果': ['拆工單結果']
    };
    const tables = {};
    Object.keys(names).forEach(k=>{
      for (const n of names[k]) if (Array.isArray(window[n])) { tables[k] = window[n]; break; }
    });
    const local = localStorage.getItem('智慧製造中央作戰資料庫V24');
    if (local) {
      try {
        const obj = JSON.parse(local);
        if (obj && obj.DB) {
          tables.BOM明細 = tables.BOM明細 || obj.DB.BOM明細 || [];
          tables.每日明細 = tables.每日明細 || obj.DB.每日明細 || [];
          tables.本月彙總 = tables.本月彙總 || obj.DB.本月彙總 || [];
          tables.出貨訂單 = tables.出貨訂單 || obj.DB.出貨訂單 || [];
          tables.BOM需求展開 = tables.BOM需求展開 || obj.DB.BOM需求展開 || [];
          tables.CTB齊套檢查 = tables.CTB齊套檢查 || obj.DB.CTB齊套檢查 || [];
          tables.排程需求池 = tables.排程需求池 || obj.DB.排程需求池 || [];
          tables.自動排程結果 = tables.自動排程結果 || obj.DB.自動排程結果 || [];
          tables.拆工單結果 = tables.拆工單結果 || obj.DB.拆工單結果 || [];
        }
      } catch(e) {}
    }
    return tables;
  }
  async function 上傳資料庫(){
    try{
      const tables = 取DB快照();
      const total = Object.values(tables).reduce((a,b)=>a+(Array.isArray(b)?b.length:0),0);
      if (!total) throw new Error('目前沒有可上傳資料。請先上傳生產計劃表與 BOM，或先按「儲存本機資料庫快照」。');
      狀態('📡 正在上傳中央資料庫...\n總資料列：' + total, null);
      const ans = await 發送({
        action:'寫入資料庫快照',
        source:'PWA_生產計劃表清洗器_V2.5',
        batchId:'PWA_' + new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14),
        mode:'replace',
        payload:{ tables:tables, meta:{ url:location.href, userAgent:navigator.userAgent, time:new Date().toISOString() } }
      });
      if (!ans.ok) throw new Error(ans.錯誤 || ans.raw || '上傳失敗');
      const lines = (ans.寫入結果 || []).map(x => x.工作表 + '：' + x.寫入筆數 + ' 筆').join('\n');
      狀態('✅ 上傳完成。\n批次：' + ans.批次ID + '\n' + lines + '\n資料庫：' + (ans.資料庫網址 || ''), true);
    }catch(err){ 狀態('❌ 上傳失敗：\n' + (err.message || err), false); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 建立工具列); else 建立工具列();
  window.addEventListener('load', 建立工具列);
})();
