(() => {
  'use strict';

  const 狀態 = {
    步驟: 0,
    資料: null,
    人員: null,
    產品: null,
    工站: null,
    機台: null,
    照片: [],
    不良索引: {},
    掃描串流: null,
    掃描計時器: null
  };

  const 步驟清單 = [
    '👆 Step 1：選擇作業員 / Select Operator',
    '📦 Step 2：選擇產品與工站 / Product & Route',
    '📊 Step 3：輸入產出數量 / Output',
    '🧪 Step 4：品質與照片 / Quality',
    '✅ Step 5：確認並送出 / Confirm'
  ];

  const $ = (id) => document.getElementById(id);
  const 文字 = (v) => String(v == null ? '' : v).trim();
  const 數字 = (v) => {
    const n = Number(文字(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const 轉義 = (s) => 文字(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  function 顯示提示(標題, 說明 = '', 類型 = 'ok') {
    const el = $('提示泡泡');
    if (!el) return;
    el.style.borderLeftColor = 類型 === 'error' ? '#ef4444' : 類型 === 'warn' ? '#f59e0b' : '#22c55e';
    el.innerHTML = 轉義(標題) + (說明 ? `<small>${轉義(說明)}</small>` : '');
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 2200);
  }

  window.v4Toast = 顯示提示;

  function 圖片HTML(url, icon = '👤') {
    url = 文字(url);
    if (url.startsWith('http')) {
      return `<img src="${轉義(url)}" loading="lazy" alt="" onerror="this.outerHTML='<div class=&quot;佔位&quot;>${icon}</div>'">`;
    }
    return `<div class="佔位">${轉義(icon)}</div>`;
  }

  function 設定狀態(text, ok = true) {
    $('狀態文字').textContent = text;
    $('狀態燈').style.background = ok ? '#22c55e' : '#f59e0b';
    $('狀態燈').style.boxShadow = `0 0 10px ${ok ? '#22c55e' : '#f59e0b'}`;
  }

  function 畫步驟() {
    $('步驟列').innerHTML = [1, 2, 3, 4, 5].map((n, i) => {
      const cls = i === 狀態.步驟 ? '步驟 啟用' : i < 狀態.步驟 ? '步驟 完成' : '步驟';
      return `<div class="${cls}">${i < 狀態.步驟 ? '✓' : n}</div>`;
    }).join('');
  }

  function 到步驟(index) {
    狀態.步驟 = Math.max(0, Math.min(4, index));
    document.querySelectorAll('.頁').forEach((page, i) => page.classList.toggle('啟用', i === 狀態.步驟));
    畫步驟();
    $('提示文字').textContent = 步驟清單[狀態.步驟];
    $('搜尋列').style.display = 狀態.步驟 <= 1 ? 'block' : 'none';
    $('搜尋框').value = '';
    $('搜尋框').placeholder = 狀態.步驟 === 0
      ? '🔍 搜尋人員 / 姓名、工號、班別'
      : '🔍 搜尋產品 / 品名、產品編號、客戶品號';
    $('nextBtn').textContent = 狀態.步驟 === 4 ? '📥 送出報工 / Submit' : '下一步 → / Next';
    $('內容區').scrollTop = 0;
    if (狀態.步驟 === 1) 畫產品();
    if (狀態.步驟 === 3) 初始化不良列();
    if (狀態.步驟 === 4) 畫摘要();
  }

  function 防滑動誤觸(container, callback) {
    let sx = 0;
    let sy = 0;
    let moved = false;
    container.addEventListener('pointerdown', (e) => {
      sx = e.clientX;
      sy = e.clientY;
      moved = false;
    }, { passive: true });
    container.addEventListener('pointermove', (e) => {
      if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) moved = true;
    }, { passive: true });
    container.addEventListener('pointerup', (e) => {
      if (moved) return;
      const card = e.target.closest('.卡');
      if (card) callback(card);
    }, true);
  }

  function 取人員() { return (狀態.資料 && 狀態.資料.人員) || []; }
  function 取產品() { return (狀態.資料 && 狀態.資料.產品) || []; }
  function 取工站群組() { return (狀態.資料 && (狀態.資料.routes || 狀態.資料.報工工站群組)) || []; }

  function 畫人員() {
    const q = 文字($('搜尋框').value).toLowerCase();
    const rows = 取人員()
      .filter((p) => !q || [p.姓名, p.工號, p.班別].join(' ').toLowerCase().includes(q))
      .slice(0, 120);
    $('人員清單').innerHTML = rows.map((p) => `
      <div class="卡 ${狀態.人員 && 狀態.人員.工號 === p.工號 ? '選取' : ''}" data-id="${轉義(p.工號)}">
        <span class="班別">${轉義(p.班別 || '早班')}</span>
        ${圖片HTML(p.照片網址 || p.縮圖網址, '👤')}
        <div class="字罩"><div class="名稱">${轉義(p.姓名)}</div><div class="編號">${轉義(p.工號)}</div></div>
      </div>
    `).join('') || '<div class="面板">尚無人員資料</div>';
  }

  function 選人員(id) {
    const p = 取人員().find((x) => x.工號 === id);
    if (!p) return;
    狀態.人員 = p;
    $('selectedPersonArea').style.display = 'none';
    $('selectedPersonArea').innerHTML = `
      <input id="personId" value="${轉義(p.工號)}">
      <input id="personName" value="${轉義(p.姓名)}">
      <input id="shift" value="${轉義(p.班別 || '早班')}">
    `;
    畫人員();
    彈出選定('👤 已選定人員', p.姓名, p.工號, p.照片網址 || p.縮圖網址);
  }

  function 彈出選定(title, name, code, photo) {
    const box = $('選定浮層');
    const head = 文字(photo).startsWith('http')
      ? `<img src="${轉義(photo)}" alt="">`
      : `<div class="選定頭像">${轉義(文字(name).slice(0, 1) || '✓')}</div>`;
    box.innerHTML = `<div class="選定列">${head}<div><div class="名稱 大字">${轉義(title)}</div><div class="名稱">${轉義(name)}</div><div class="編號">${轉義(code)}</div></div></div>`;
    box.classList.add('顯示');
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove('顯示'), 1200);
  }

  function 畫產品() {
    const q = 文字($('搜尋框').value).toLowerCase();
    const routePids = {};
    取工站群組().forEach((r) => { if (r.產品編號) routePids[r.產品編號] = true; });
    let rows = 取產品().filter((p) => routePids[p.產品編號]);
    if (!rows.length) rows = 取產品();
    rows = rows
      .filter((p) => !q || [p.品名, p.產品編號, p.客戶品號].join(' ').toLowerCase().includes(q))
      .slice(0, 120);
    $('產品清單').innerHTML = rows.map((p) => `
      <div class="卡 ${狀態.產品 && 狀態.產品.產品編號 === p.產品編號 ? '選取' : ''}" data-id="${轉義(p.產品編號)}">
        ${圖片HTML(p.照片網址 || p.縮圖網址, '📦')}
        <div class="字罩"><div class="名稱">${轉義(p.品名 || p.產品編號)}</div><div class="編號">${轉義(p.產品編號)}</div></div>
      </div>
    `).join('') || '<div class="面板">尚無產品資料</div>';
  }

  function 選產品(pid) {
    const p = 取產品().find((x) => x.產品編號 === pid);
    if (!p) return;
    狀態.產品 = p;
    狀態.工站 = null;
    狀態.機台 = null;
    $('selectedProductArea').style.display = 'block';
    $('產品摘要').innerHTML = `<b>${轉義(p.品名 || '')}</b><br><span class="編號">${轉義(p.產品編號)}</span>`;
    $('productCode').value = p.產品編號 || '';
    $('productName').value = p.品名 || '';
    畫產品();
    畫工站選單();
    彈出選定('📦 已選定產品', p.品名 || p.產品編號, p.產品編號, p.照片網址 || p.縮圖網址);
  }

  function 畫工站選單() {
    const routes = 取工站群組().filter((r) => r.產品編號 === 狀態.產品.產品編號);
    window.__V4_ROUTES_VIEW__ = routes;
    $('workstationSelect').innerHTML = '<option value="">請選擇工站</option>' + routes.map((r, i) => {
      const name = r.工站名稱 || r.報工工站名稱 || '';
      const op = r.工序範圍 || r.工序 || '';
      const machines = Array.isArray(r.機台清單) ? r.機台清單.map((m) => m.機台編號).join('、') : '';
      return `<option value="${i}">${轉義(name)}｜${轉義(op)}｜${轉義(machines)}</option>`;
    }).join('');
    清工站欄位();
  }

  function 清工站欄位() {
    $('routeFieldsArea').style.display = 'none';
    $('processRange').value = '';
    $('stdCapacity').value = '';
    $('stdTimeSec').value = '';
    $('mainMachineSelect').innerHTML = '';
    $('machineListGrid').innerHTML = '';
  }

  function 選工站(index) {
    const route = (window.__V4_ROUTES_VIEW__ || [])[Number(index)];
    if (!route) {
      狀態.工站 = null;
      清工站欄位();
      return;
    }
    狀態.工站 = route;
    $('routeFieldsArea').style.display = 'block';
    $('processRange').value = route.工序範圍 || route.工序 || '';
    $('stdCapacity').value = route['標準產能'] || route['8H產能'] || route['工站8H產能_件'] || '';
    $('stdTimeSec').value = route['標準工時_秒'] || route['標準工時(秒)'] || '';
    const machines = Array.isArray(route.機台清單) ? route.機台清單 : [];
    $('mainMachineSelect').innerHTML = machines.map((m) => `<option value="${轉義(m.機台編號)}">${轉義(m.機台編號)}｜${轉義(m.機台名稱 || m.設備名稱 || '')}</option>`).join('');
    if (machines[0]) 選機台(machines[0].機台編號);
    else 畫機台([]);
  }

  function 畫機台(machines) {
    $('machineListGrid').innerHTML = (machines || []).map((m) => `
      <div class="卡 ${狀態.機台 && 狀態.機台.機台編號 === m.機台編號 ? '選取' : ''}" data-id="${轉義(m.機台編號)}">
        ${圖片HTML(m.照片網址 || m.縮圖網址, '⚙️')}
        <div class="字罩"><div class="名稱">${轉義(m.機台編號)}</div><div class="編號">${轉義(m.機台名稱 || m.設備名稱 || '機台')}</div></div>
      </div>
    `).join('') || '<div class="小佔位">此工站未設定機台清單</div>';
  }

  function 選機台(id) {
    const machines = (狀態.工站 && 狀態.工站.機台清單) || [];
    狀態.機台 = machines.find((m) => m.機台編號 === id) || machines[0] || null;
    if (狀態.機台) $('mainMachineSelect').value = 狀態.機台.機台編號;
    畫機台(machines);
  }

  function 計算數量() {
    const total = 數字($('totalQty').value);
    const ng = 數字($('ngQty').value);
    $('sumTotal').textContent = total || '—';
    $('sumNg').textContent = ng || '—';
    $('sumGood').textContent = (total || ng) ? Math.max(0, total - ng) : '—';
    檢查不良分配(true);
  }

  function 全不良原因() {
    const d = (狀態.資料 && 狀態.資料.不良原因) || { Z: [], Y: [] };
    return [...(d.Z || []), ...(d.Y || [])];
  }

  function 初始化不良列() {
    狀態.不良索引 = {};
    全不良原因().forEach((d) => { 狀態.不良索引[d.代碼] = d; });
    if (!$('defectRows').children.length) 新增不良列();
  }

  function 新增不良列() {
    const row = document.createElement('div');
    row.className = '不良列';
    const opts = 全不良原因().map((d) => {
      const cat = d.分類 || String(d.代碼 || '').slice(0, 1);
      return `<option value="${轉義(d.代碼)}">${轉義(`${cat}類 ${d.代碼} ${d.英文名稱 || ''} / ${d.名稱 || ''}`)}</option>`;
    }).join('');
    row.innerHTML = `<select class="欄位"><option value="">不良原因</option>${opts}</select><input class="欄位 不良數量" inputmode="numeric" placeholder="數量"><button class="工具鈕" type="button">刪</button>`;
    row.querySelector('button').onclick = () => { row.remove(); 檢查不良分配(true); };
    row.querySelector('input').oninput = () => 檢查不良分配(true);
    row.querySelector('select').onchange = () => 檢查不良分配(true);
    $('defectRows').appendChild(row);
  }

  function 檢查不良分配(silent = false) {
    const ng = 數字($('ngQty').value);
    let sum = 0;
    document.querySelectorAll('.不良數量').forEach((input) => { sum += 數字(input.value); });
    if (sum > ng) {
      if (!silent) 顯示提示('不良分配超過上限', '分配數量不可超過 Step 3 的不良數', 'warn');
      return false;
    }
    return true;
  }

  function 讀不良() {
    const arr = [];
    document.querySelectorAll('.不良列').forEach((row) => {
      const code = row.querySelector('select').value;
      const qty = 數字(row.querySelector('input').value);
      const d = 狀態.不良索引[code] || {};
      if (code && qty > 0) {
        arr.push({
          不良代碼: code,
          不良名稱: d.名稱 || '',
          英文名稱: d.英文名稱 || '',
          不良數量: qty,
          分類: d.分類 || String(code).slice(0, 1),
          責任歸屬: d.責任歸屬 || ''
        });
      }
    });
    return arr;
  }

  function 選照片(files) {
    const list = Array.from(files || []).slice(0, 12 - 狀態.照片.length);
    list.forEach((file) => 狀態.照片.push({ name: file.name, size: file.size, type: file.type, preview: URL.createObjectURL(file) }));
    $('photoCount').textContent = `${狀態.照片.length} / 12 張照片`;
    $('照片預覽').innerHTML = 狀態.照片.map((p) => `<img src="${p.preview}" alt="">`).join('');
  }

  function 清照片() {
    狀態.照片.forEach((p) => { try { URL.revokeObjectURL(p.preview); } catch (e) {} });
    狀態.照片 = [];
    $('photoCount').textContent = '0 / 12 張照片';
    $('照片預覽').innerHTML = '';
  }

  function 畫摘要() {
    const total = 數字($('totalQty').value);
    const ng = 數字($('ngQty').value);
    const good = Math.max(0, total - ng);
    const defect = 讀不良();
    const rows = [
      ['人員', `${狀態.人員?.姓名 || ''}｜${狀態.人員?.工號 || ''}`],
      ['產品', `${狀態.產品?.產品編號 || ''}｜${狀態.產品?.品名 || ''}`],
      ['工站', 狀態.工站?.工站名稱 || 狀態.工站?.報工工站名稱 || ''],
      ['工序', 狀態.工站?.工序範圍 || 狀態.工站?.工序 || ''],
      ['機台', 狀態.機台?.機台編號 || ''],
      ['共做', `${total} pcs`],
      ['良品', `${good} pcs`],
      ['不良', `${ng} pcs`],
      ['不良原因', defect.map((d) => `${d.不良代碼} ${d.不良名稱} × ${d.不良數量}`).join('；') || '無'],
      ['照片', `${狀態.照片.length} 張`]
    ];
    $('summaryRows').innerHTML = rows.map((r) => `<div class="摘要列"><div>${轉義(r[0])}</div><div>${轉義(r[1])}</div></div>`).join('');
  }

  function 檢查步驟() {
    if (狀態.步驟 === 0 && !狀態.人員) { 顯示提示('尚未選擇人員', '請先選擇作業員', 'warn'); return false; }
    if (狀態.步驟 === 1 && !狀態.產品) { 顯示提示('尚未選擇產品', '請先選擇產品', 'warn'); return false; }
    if (狀態.步驟 === 1 && !狀態.工站) { 顯示提示('尚未選擇工站', '請先選擇報工工站', 'warn'); return false; }
    if (狀態.步驟 === 2 && 數字($('totalQty').value) <= 0) { 顯示提示('尚未輸入產出', '請輸入今日共做數', 'warn'); return false; }
    if (狀態.步驟 === 3 && !檢查不良分配(false)) return false;
    return true;
  }

  function 建立Payload() {
    const total = 數字($('totalQty').value);
    const ng = 數字($('ngQty').value);
    const good = Math.max(0, total - ng);
    const defects = 讀不良();
    const id = `RPT-${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${狀態.人員?.工號 || 'NA'}-${狀態.產品?.產品編號 || 'NA'}`;
    const today = window.V4Bridge?.today?.() || '';
    return {
      reportId: id,
      報工編號: id,
      workDate: today,
      作業日: today,
      operator: {
        employeeId: 狀態.人員?.工號,
        operatorName: 狀態.人員?.姓名,
        shift: 狀態.人員?.班別 || '早班'
      },
      product: {
        productCode: 狀態.產品?.產品編號,
        customerPartNo: 狀態.產品?.客戶品號,
        productName: 狀態.產品?.品名
      },
      workstation: {
        workstationName: 狀態.工站?.工站名稱 || 狀態.工站?.報工工站名稱,
        processRange: 狀態.工站?.工序範圍 || 狀態.工站?.工序,
        machineList: ((狀態.工站?.機台清單) || []).map((m) => m.機台編號).join(','),
        mainMachine: 狀態.機台?.機台編號
      },
      output: {
        totalQty: total,
        ngQty: ng,
        goodQty: good,
        startTime: $('startTime').value,
        endTime: $('endTime').value,
        workingHours: $('workingHours').value || '8 hrs'
      },
      quality: {
        defects,
        defectSummary: defects.map((d) => `${d.分類 || ''}類 ${d.不良代碼} ${d.不良名稱} × ${d.不良數量} pcs`).join('；')
      },
      photos: 狀態.照片.map((p) => ({ name: p.name, size: p.size, type: p.type })),
      remarks: $('remarks').value,
      source: 'PWA_V4_正式基準_483_HUAXIN_SPLASH'
    };
  }

  async function 送出報工() {
    const payload = 建立Payload();
    $('nextBtn').disabled = true;
    $('nextBtn').textContent = '送出中...';
    try {
      const res = await window.V4Bridge.submitReport(payload);
      顯示提示('報工已送出', res?.報工編號 || res?.reportId || payload.reportId);
      到步驟(0);
    } catch (e) {
      顯示提示('寫入失敗', e.message || e, 'error');
    } finally {
      $('nextBtn').disabled = false;
      $('nextBtn').textContent = 狀態.步驟 === 4 ? '📥 送出報工 / Submit' : '下一步 → / Next';
    }
  }

  async function 讀取資料() {
    設定狀態('正在連線主資料庫...', false);
    try {
      const db = await window.V4Bridge.loadInit();
      狀態.資料 = db;
      設定狀態(`資料已載入｜人員：${db.筆數?.人員 || db.人員?.length || 0}｜工站：${db.筆數?.報工工站群組 || db.routes?.length || 0}`);
      畫人員();
      畫產品();
      隱藏開場();
      顯示提示('資料已載入', '化新報工 V4 已就緒');
    } catch (e) {
      設定狀態('讀取失敗', false);
      隱藏開場();
      顯示提示('讀取失敗', e.message || e, 'error');
    }
  }

  function 隱藏開場() {
    const el = $('開場畫面');
    if (!el) return;
    const minMs = 1200;
    const start = Number(el.dataset.start || Date.now());
    const wait = Math.max(0, minMs - (Date.now() - start));
    setTimeout(() => {
      el.classList.add('關閉');
      setTimeout(() => el.remove(), 520);
    }, wait);
  }

  async function 開啟掃描() {
    if (!('BarcodeDetector' in window)) {
      顯示提示('掃描器不支援', '請改用手動輸入或實體掃碼器', 'warn');
      $('搜尋框').focus();
      return;
    }
    try {
      狀態.掃描串流 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      $('scanVideo').srcObject = 狀態.掃描串流;
      $('掃描遮罩').style.display = 'flex';
      const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8'] });
      狀態.掃描計時器 = setInterval(async () => {
        try {
          const codes = await detector.detect($('scanVideo'));
          if (codes && codes[0]) {
            $('搜尋框').value = codes[0].rawValue;
            $('搜尋框').dispatchEvent(new Event('input'));
            關閉掃描();
            顯示提示('掃描成功', codes[0].rawValue);
          }
        } catch (e) {}
      }, 350);
    } catch (e) {
      顯示提示('無法啟用相機', '請確認權限', 'error');
    }
  }

  function 關閉掃描() {
    if (狀態.掃描計時器) clearInterval(狀態.掃描計時器);
    狀態.掃描計時器 = null;
    if (狀態.掃描串流) 狀態.掃描串流.getTracks().forEach((t) => t.stop());
    狀態.掃描串流 = null;
    $('掃描遮罩').style.display = 'none';
  }

  function 綁定事件() {
    $('搜尋框').addEventListener('input', () => {
      if (狀態.步驟 === 0) 畫人員();
      if (狀態.步驟 === 1) 畫產品();
    });
    防滑動誤觸($('人員清單'), (card) => 選人員(card.dataset.id));
    防滑動誤觸($('產品清單'), (card) => 選產品(card.dataset.id));
    防滑動誤觸($('machineListGrid'), (card) => 選機台(card.dataset.id));
    $('workstationSelect').addEventListener('change', (e) => 選工站(e.target.value));
    $('mainMachineSelect').addEventListener('change', (e) => 選機台(e.target.value));
    $('totalQty').addEventListener('input', 計算數量);
    $('ngQty').addEventListener('input', 計算數量);
    $('新增不良').addEventListener('click', 新增不良列);
    $('拍照鈕').addEventListener('click', () => $('photoInput').click());
    $('清照片鈕').addEventListener('click', 清照片);
    $('photoInput').addEventListener('change', (e) => { 選照片(e.target.files); e.target.value = ''; });
    $('掃碼鈕').addEventListener('click', 開啟掃描);
    $('關閉掃描').addEventListener('click', 關閉掃描);
    $('nextBtn').addEventListener('click', () => {
      if (狀態.步驟 === 4) return 送出報工();
      if (!檢查步驟()) return;
      到步驟(狀態.步驟 + 1);
    });
  }

  function 啟動() {
    const splash = $('開場畫面');
    if (splash) splash.dataset.start = String(Date.now());
    畫步驟();
    綁定事件();
    const now = new Date();
    $('startTime').value = now.toLocaleString('zh-TW', { hour12: false });
    讀取資料();
    setTimeout(隱藏開場, 3800);
    try {
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=483').catch(() => {});
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 啟動);
  else 啟動();
})();
