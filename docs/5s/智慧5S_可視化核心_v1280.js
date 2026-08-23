(function (全域) {
  'use strict';

  const 版本 = '1.2.8';
  const 狀態 = { 分頁: '總覽', 快取: {}, 載入序號: 0 };

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 數值(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function 轉義(v) { return 文字(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function 設定() { return 全域.智慧5S設定 || {}; }
  function 資料庫() { return 全域.智慧5S資料庫 || null; }
  function 分頁名稱(key, fallback) { const s = 設定(); return s.分頁 && s.分頁[key] ? s.分頁[key] : fallback; }

  const 表 = {
    標準: () => 分頁名稱('標準照片主檔', '5S_標準照片主檔'),
    責任: () => 分頁名稱('責任區主檔', '5S_責任區主檔'),
    進度: () => 分頁名稱('導入進度', '5S_導入進度'),
    稽核: () => 分頁名稱('稽核週期', '5S_稽核週期'),
    里程碑: () => 分頁名稱('里程碑', '5S_里程碑'),
    巡檢: () => 分頁名稱('巡檢主檔', '5S_巡檢主檔')
  };

  function 注入樣式() {
    if (document.getElementById('智慧5S可視化核心樣式')) return;
    const s = document.createElement('style');
    s.id = '智慧5S可視化核心樣式';
    s.textContent = `
      .視覺核心{display:grid;gap:14px;padding-bottom:18px}.視覺頁籤{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding:2px 0 4px}.視覺頁籤::-webkit-scrollbar{display:none}.視覺頁籤 button{flex:0 0 auto;border:1px solid #dce7e1;background:#fff;color:#345344;border-radius:999px;padding:9px 13px;font-weight:900}.視覺頁籤 button.作用中{background:#176b47;color:#fff;border-color:#176b47}
      .視覺英雄{background:linear-gradient(135deg,#0f5135,#198a5c 64%,#7a244a);color:#fff;border-radius:24px;padding:19px;box-shadow:0 13px 34px rgba(19,76,52,.17)}.視覺英雄 h2{margin:0 0 6px;font-size:1.35rem}.視覺英雄 p{margin:0;color:rgba(255,255,255,.86);line-height:1.65}.視覺英雄 .小標{margin-top:10px;font-size:.72rem;font-weight:800;color:rgba(255,255,255,.72)}
      .視覺KPI{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.視覺卡{background:#fff;border:1px solid #e0e9e4;border-radius:20px;padding:15px;box-shadow:0 8px 22px rgba(24,65,47,.05)}.視覺KPI .視覺卡 b{display:block;font-size:1.7rem;color:#173f2f;margin-top:4px}.視覺卡 small{color:#75827b;font-weight:800}.視覺卡 h3{margin:0 0 8px;color:#173f2f}.視覺副文{color:#6f7c75;font-size:.78rem;line-height:1.55}
      .視覺列表{display:grid;gap:8px}.視覺列{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid #edf1ef}.視覺列:last-child{border-bottom:0}.視覺列 strong{display:block;color:#193f30}.視覺列 span{display:block;color:#75827b;font-size:.72rem;margin-top:3px}.視覺徽章{flex:0 0 auto;border-radius:999px;background:#eef7f2;color:#176b47;padding:6px 9px;font-size:.68rem;font-weight:900}.視覺徽章.警示{background:#fff1e5;color:#b55b14}.視覺徽章.危險{background:#fde9ea;color:#b22a32}
      .視覺進度{height:9px;border-radius:999px;background:#edf2ef;overflow:hidden;margin-top:8px}.視覺進度 i{display:block;height:100%;background:linear-gradient(90deg,#1b8b5c,#6cbf8e);border-radius:999px}.視覺錯誤{background:#fff7f0;border:1px solid #f0d6c0;color:#9a4d1b;border-radius:16px;padding:12px}.視覺載入{padding:26px;text-align:center;color:#65756c}.視覺按鈕{border:0;border-radius:14px;background:#176b47;color:#fff;padding:11px 14px;font-weight:900}.視覺空{padding:22px;text-align:center;color:#7d8982}
      @media(min-width:760px){.視覺KPI{grid-template-columns:repeat(4,minmax(0,1fr))}}
    `;
    document.head.appendChild(s);
  }

  function 設頁首() {
    const t = document.getElementById('頁面標題');
    const s = document.getElementById('頁面副標');
    if (t) t.textContent = '5S 可視化標準管理';
    if (s) s.textContent = '標準照片｜責任區｜甘特｜0–4稽核';
    document.querySelectorAll('.底部導航 .導航按鈕').forEach(function (b) {
      const p = 文字(b.getAttribute('data-page') || b.getAttribute('data-頁面'));
      b.classList.toggle('作用中', b.id === '可視化導航' || p === '可視化');
    });
    const f = document.getElementById('浮動按鈕'); if (f) f.classList.add('隱藏');
  }

  function 頁籤HTML() {
    return [['總覽','戰情總覽'],['標準','標準照片'],['責任','責任區'],['進度','甘特進度'],['稽核','0–4稽核']]
      .map(x => `<button type="button" data-視覺頁="${x[0]}" class="${狀態.分頁===x[0]?'作用中':''}">${x[1]}</button>`).join('');
  }

  function 頁框(body) { return `<div class="視覺核心"><div class="視覺頁籤">${頁籤HTML()}</div>${body}</div>`; }

  function 綁頁籤() {
    document.querySelectorAll('[data-視覺頁]').forEach(function (b) {
      b.onclick = function () { 狀態.分頁 = b.getAttribute('data-視覺頁'); 顯示目前分頁(false); };
    });
  }

  async function 安全讀取(name, force) {
    if (!name) return { 資料: [], 錯誤: '未設定分頁名稱' };
    if (!force && 狀態.快取[name]) return 狀態.快取[name];
    const db = 資料庫();
    if (!db || typeof db.讀取分頁 !== 'function') return { 資料: [], 錯誤: '中央資料庫模組尚未就緒' };
    try {
      const r = await db.讀取分頁(name, (設定().讀取上限 || 5000));
      const out = { 資料: Array.isArray(r && r.資料) ? r.資料 : [], 欄位: r && r.欄位 ? r.欄位 : [], 錯誤: '' };
      狀態.快取[name] = out;
      return out;
    } catch (e) {
      return { 資料: [], 欄位: [], 錯誤: 文字(e && e.message ? e.message : e) || '讀取失敗' };
    }
  }

  function 錯誤塊(label, msg) { return msg ? `<div class="視覺錯誤"><b>${轉義(label)}暫時無法讀取</b><div class="視覺副文">${轉義(msg)}</div></div>` : ''; }

  async function 總覽(force) {
    const r = await Promise.all([安全讀取(表.標準(),force),安全讀取(表.責任(),force),安全讀取(表.進度(),force),安全讀取(表.稽核(),force),安全讀取(表.里程碑(),force)]);
    const 標準=r[0],責任=r[1],進度=r[2],稽核=r[3],里程碑=r[4];
    const active = 標準.資料.filter(x => ['是','Y','TRUE','true','1','目前生效','生效'].includes(文字(x.目前生效))).length;
    const resp = 責任.資料.filter(x => 文字(x.主要負責人姓名 || x.主要負責人工號)).length;
    const avg = 進度.資料.length ? Math.round(進度.資料.reduce((a,x)=>a+數值(x.導入進度),0)/進度.資料.length) : 0;
    const due = 稽核.資料.filter(x => { const d=文字(x.下次稽核日); return d && new Date(d+'T23:59:59').getTime() <= Date.now(); }).length;
    const milestones = 里程碑.資料.slice(0,5).map(x=>`<div class="視覺列"><div><strong>${轉義(x.里程碑名稱 || x.名稱 || '里程碑')}</strong><span>${轉義(x.目標日期 || x.日期 || '未設定')}</span></div><div class="視覺徽章">${轉義(x.狀態 || '追蹤中')}</div></div>`).join('');
    return `<section class="視覺英雄"><h2>製一｜5S 可視化戰情</h2><p>標準照片、責任人、導入進度與稽核週期分開載入；單一資料表異常不再拖垮整個可視化頁。</p><div class="小標">穩定核心 v${版本}</div></section>
      <section class="視覺KPI"><article class="視覺卡"><small>生效標準照片</small><b>${active}</b><span class="視覺副文">目前生效版本</span></article><article class="視覺卡"><small>責任區已指派</small><b>${resp}</b><span class="視覺副文">具主要負責人</span></article><article class="視覺卡"><small>平均導入進度</small><b>${avg}%</b><span class="視覺副文">依區域進度</span></article><article class="視覺卡"><small>到期／逾期稽核</small><b>${due}</b><span class="視覺副文">需優先處理</span></article></section>
      ${錯誤塊('標準照片',標準.錯誤)}${錯誤塊('責任區',責任.錯誤)}${錯誤塊('導入進度',進度.錯誤)}${錯誤塊('稽核週期',稽核.錯誤)}
      <section class="視覺卡"><h3>專案里程碑</h3><div class="視覺列表">${milestones || '<div class="視覺空">尚無里程碑資料</div>'}</div></section>`;
  }

  async function 標準頁(force) {
    const r = await 安全讀取(表.標準(), force);
    const rows = r.資料.slice(0,80).map(x=>`<div class="視覺列"><div><strong>${轉義(x.區域名稱 || x.區域代碼 || '未命名區域')}｜${轉義(x.子區域代碼 || '')}</strong><span>版本 ${轉義(x.標準版本 || '—')}｜適用：${轉義(x.適用生產狀態 || '通用')}</span></div><div class="視覺徽章 ${['是','Y','TRUE','true','1','目前生效','生效'].includes(文字(x.目前生效))?'':'警示'}">${['是','Y','TRUE','true','1','目前生效','生效'].includes(文字(x.目前生效))?'生效':'歷史'}</div></div>`).join('');
    return `<section class="視覺英雄"><h2>標準照片版本管理</h2><p>同區域依產品／生產狀態保留版本，現場只顯示目前生效標準。</p></section>${錯誤塊('標準照片',r.錯誤)}<section class="視覺卡"><h3>標準照片主檔</h3><div class="視覺列表">${rows || '<div class="視覺空">尚無標準照片資料</div>'}</div></section>`;
  }

  async function 責任頁(force) {
    const r = await 安全讀取(表.責任(), force);
    const rows = r.資料.slice(0,120).map(x=>`<div class="視覺列"><div><strong>${轉義(x.主區域代碼 || '')} ${轉義(x.子區域名稱 || x.子區域代碼 || '')}</strong><span>主責：${轉義(x.主要負責人姓名 || '待指派')}｜代理：${轉義(x.代理人姓名 || '—')}｜主管：${轉義(x.主管姓名 || '—')}</span></div><div class="視覺徽章 ${文字(x.主要負責人姓名)?'':'警示'}">${轉義(x.責任狀態 || (文字(x.主要負責人姓名)?'已指派':'待指派'))}</div></div>`).join('');
    return `<section class="視覺英雄"><h2>區域責任管理</h2><p>主區域 → 子區域 → 主要負責人／代理人／主管，形成可追溯責任鏈。</p></section>${錯誤塊('責任區',r.錯誤)}<section class="視覺卡"><h3>責任區清單</h3><div class="視覺列表">${rows || '<div class="視覺空">尚無責任區資料</div>'}</div></section>`;
  }

  async function 進度頁(force) {
    const r = await 安全讀取(表.進度(), force);
    const rows = r.資料.slice(0,80).map(x=>{const p=Math.max(0,Math.min(100,數值(x.導入進度)));return `<div class="視覺列"><div style="flex:1"><strong>${轉義(x.區域代碼 || '')} ${轉義(x.區域名稱 || '')}</strong><span>預計：${轉義(x.預計完成日 || '未設定')}｜實際：${轉義(x.實際完成日 || '尚未完成')}</span><div class="視覺進度"><i style="width:${p}%"></i></div></div><div class="視覺徽章">${p}%</div></div>`;}).join('');
    return `<section class="視覺英雄"><h2>5S 導入甘特／進度</h2><p>區域盤點 → 責任人確認 → 標準照片 → 現場張貼 → 首次稽核 → 穩定維持。</p></section>${錯誤塊('導入進度',r.錯誤)}<section class="視覺卡"><h3>區域導入進度</h3><div class="視覺列表">${rows || '<div class="視覺空">尚無進度資料</div>'}</div></section>`;
  }

  async function 稽核頁(force) {
    const r = await 安全讀取(表.稽核(), force);
    const rows = r.資料.slice(0,100).map(x=>{const score=數值(x.最近得分);const cls=score&&score<80?'危險':(score&&score<85?'警示':'');return `<div class="視覺列"><div><strong>${轉義(x.區域代碼 || '')} ${轉義(x.區域名稱 || '')}</strong><span>最近 ${轉義(x.最近稽核日 || '—')}｜下次 ${轉義(x.下次稽核日 || '未設定')}｜${轉義(x.目前頻率 || '每週')}</span></div><div class="視覺徽章 ${cls}">${score?score+'分':'待稽核'}</div></div>`;}).join('');
    return `<section class="視覺英雄"><h2>0–4 分稽核管理</h2><p>4=完全符合、3=輕微偏差、2=明顯偏差、1=嚴重不符、0=無標準／完全失控。低於4分進改善閉環。</p></section>${錯誤塊('稽核週期',r.錯誤)}<section class="視覺卡"><h3>動態稽核週期</h3><div class="視覺副文">連續3次 ≥85 → 14天；連續3次 ≥90 → 30天；任一次 &lt;80 → 恢復7天；重大異常 → 3天內複查。</div><button id="視覺前往巡檢" class="視覺按鈕" type="button" style="margin-top:12px">前往正式機台巡檢</button></section><section class="視覺卡"><h3>各區稽核狀態</h3><div class="視覺列表">${rows || '<div class="視覺空">尚無稽核週期資料</div>'}</div></section>`;
  }

  async function 顯示目前分頁(force) {
    const main = document.getElementById('頁面內容');
    if (!main) return;
    const seq = ++狀態.載入序號;
    設頁首();
    main.innerHTML = 頁框('<div class="視覺載入">正在載入可視化資料…</div>');
    綁頁籤();
    try {
      let body = '';
      if (狀態.分頁 === '標準') body = await 標準頁(force);
      else if (狀態.分頁 === '責任') body = await 責任頁(force);
      else if (狀態.分頁 === '進度') body = await 進度頁(force);
      else if (狀態.分頁 === '稽核') body = await 稽核頁(force);
      else body = await 總覽(force);
      if (seq !== 狀態.載入序號) return;
      main.innerHTML = 頁框(body);
      綁頁籤();
      const go = document.getElementById('視覺前往巡檢');
      if (go) go.onclick = function(){ const b=document.querySelector('.導航按鈕[data-page="巡檢"],.導航按鈕[data-頁面="巡檢"]'); if(b)b.click(); };
    } catch (e) {
      if (seq !== 狀態.載入序號) return;
      main.innerHTML = 頁框(`<div class="視覺錯誤"><b>可視化畫面處理失敗</b><div class="視覺副文">${轉義(e && e.message ? e.message : e)}</div><button id="視覺重試" class="視覺按鈕" type="button" style="margin-top:10px">重新載入</button></div>`);
      綁頁籤();
      const retry=document.getElementById('視覺重試'); if(retry)retry.onclick=function(){狀態.快取={};顯示目前分頁(true);};
    }
  }

  function 進入可視化中心() {
    注入樣式();
    設頁首();
    狀態.分頁 = '總覽';
    try { const u=new URL(location.href);u.searchParams.set('頁面','可視化');u.searchParams.set('v',String(設定().入口版本碼||'1280'));history.replaceState({頁面:'可視化'},'',u.toString()); } catch(_) {}
    顯示目前分頁(false);
  }

  function 重新整理() { 狀態.快取 = {}; return 顯示目前分頁(true); }

  // 先註冊，再做任何初始化。即使資料來源異常，路由仍可找到本模組。
  全域.智慧5S可視化管理 = Object.freeze({ 版本, 進入可視化中心, 重新整理 });
  注入樣式();
})(window);
