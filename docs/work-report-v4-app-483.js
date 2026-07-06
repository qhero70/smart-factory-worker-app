'use strict';

/* 化新報工 V4｜Google Glass PWA 正式邏輯
 * 對接：docs/pwa-config.js + docs/gas-bridge.js
 * 寫入：正式 GAS Web App → 09_報工；有不良時由後端同步 09_不良紀錄
 */

let DB = {
  persons: [],
  workstationGroups: [],
  productList: [],
  shiftList: [],
  ngReasons: { Z: [], Y: [] },
  anomalyTypes: [],
  counts: {}
};

let STATE = {
  currentStep: 0,
  operator: null,
  productGroupList: [],
  currentProductKey: '',
  currentProductGroup: null,
  currentWorkstation: null,
  currentMachineId: '',
  photos: [],
  personStream: null,
  personDetector: null,
  personTimer: null,
  productStream: null,
  productDetector: null,
  productTimer: null,
  defectRows: [],
  editPhotoIndex: -1,
  stepDone: [false, false, false, false, false],
  touchStart: { x: 0, y: 0, t: 0 },
  touchMoved: false
};

const TOTAL_STEPS = 5;
const STEP_NAMES = ['人員', '工件', '產出', '品質', '確認'];
const STEP_EN = ['Operator', 'Workpiece', 'Output', 'Quality', 'Confirm'];
const LS_KEY = 'huaxin_rg_v4_recent_persons';
const MAX_RECENT = 6;
const MAX_PHOTOS = 12;
let defectRowIdCounter = 0;
let scanBuffer = '';
let scanTimer = null;
const SCAN_GAP_MS = 80;

window.addEventListener('load', () => {
  setDefaultTimes();
  initAnomalyTypeSelect();
  reloadData();
  listenScannerGun();
  listenFullscreenChange();
  addDefectRow();
  updateStepperUI();
  updateBottomBar();
  registerPWAServiceWorker();
});

document.addEventListener('click', e => {
  const el = e.target.closest('.ripple');
  if (!el) return;
  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  const r = el.getBoundingClientRect();
  const sz = Math.max(r.width, r.height);
  wave.style.cssText = `width:${sz}px;height:${sz}px;left:${e.clientX-r.left-sz/2}px;top:${e.clientY-r.top-sz/2}px`;
  el.appendChild(wave);
  wave.addEventListener('animationend', () => wave.remove());
});

function registerPWAServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js?v=483').catch(() => {});
}

function reloadData() {
  showLoading(true);
  const bridge = window.V4Bridge;
  if (!bridge || typeof bridge.loadInit !== 'function') {
    showLoading(false);
    setStatus('🔴 找不到 PWA Bridge，請確認 gas-bridge.js 已載入', 'error');
    roar('❌', 'PWA Bridge 未載入', '請確認 docs/gas-bridge.js 存在並重新整理', 'error');
    return;
  }
  bridge.loadInit().then(onDataLoaded).catch(err => {
    showLoading(false);
    setStatus('🔴 讀取失敗 / Load failed', 'error');
    roar('❌', '讀取失敗 / Load Failed', err.message || String(err), 'error');
  });
}

function onDataLoaded(data) {
  showLoading(false);
  if (!data || !(data.成功 || data.success || data.ok)) {
    setStatus('🔴 資料讀取失敗 / Load failed', 'error');
    roar('❌', '資料讀取失敗 / Load Failed', (data && (data.訊息 || data.message)) || '請檢查後端連線', 'error');
    return;
  }
  DB.persons = (data.人員 || data.people || []).filter(r => String(r.啟用 || '是') !== '否');
  DB.workstationGroups = (data.報工工站群組 || data.routes || data.途程工站群組 || []).map(normalizeGroup).filter(g => g.產品編號 && g.報工工站名稱);
  DB.ngReasons = data.不良原因 || data.defectReasons || { Z: [], Y: [] };
  DB.anomalyTypes = data.異常類型 || [];
  DB.shiftList = data.班別清單 || [];
  DB.counts = data.筆數 || {};
  DB.productList = buildProductList();
  fillStatusPill();
  buildShiftSelect();
  buildPersonGrid();
  buildProductGrid();
  initAnomalyTypeSelect();
  loadRecentPersons();
  const dot = g('statusDot');
  if (dot) dot.className = 'status-dot connected';
  roar('✅', '資料已載入 / Data Loaded', `人員 ${DB.persons.length} 筆｜產品 ${DB.productList.length} 筆｜工站群組 ${DB.workstationGroups.length} 筆`, 'success');
}

function normalizeGroup(src) {
  const g0 = src || {};
  const g1 = Object.assign({}, g0);
  if (typeof g1.機台清單 === 'string') {
    try { g1.機台清單 = JSON.parse(g1.機台清單); }
    catch(e) { g1.機台清單 = splitMachineText(g1.機台清單).map(id => ({ 機台編號: id, 設備名稱: '機台' + id })); }
  }
  if (!Array.isArray(g1.機台清單)) g1.機台清單 = [];
  g1.機台清單 = g1.機台清單.map(m => {
    const id = clean(String(m.機台編號 || m.主機台 || m.設備編號 || m.id || ''));
    const url = clean(m.縮圖網址 || m.照片網址 || m.圖片網址 || m.URL || '');
    return Object.assign({}, m, {
      機台編號: id,
      主機台: id,
      設備名稱: clean(m.設備名稱 || m.機台名稱 || m.名稱 || ('機台' + id)),
      機台名稱: clean(m.機台名稱 || m.設備名稱 || m.名稱 || ('機台' + id)),
      縮圖網址: url,
      照片網址: url
    });
  }).filter(m => m.機台編號);
  if (!g1.機台清單.length) {
    splitMachineText([g1.機台編號清單, g1.機台清單, g1.可用機台, g1.主機台, g1.機台編號].filter(Boolean).join('、'))
      .forEach(id => g1.機台清單.push({ 機台編號: id, 主機台: id, 設備名稱: '機台' + id, 機台名稱: '機台' + id }));
  }
  if (!Array.isArray(g1.工序清單)) g1.工序清單 = clean(g1.工序清單 || g1.工序 || g1.工序範圍 || '').split(/[、,，;；\s]+/).filter(Boolean);
  g1.產品編號 = clean(g1.產品編號 || g1.料號 || g1.productCode || '');
  g1.品名 = cleanProductName(g1.品名 || g1.產品名稱 || g1.productName || '');
  g1.客戶品號 = clean(g1.客戶品號 || g1.客戶料號 || '');
  g1.報工工站名稱 = clean(g1.報工工站名稱 || g1.工站名稱 || g1.工站 || '');
  g1.工站名稱 = g1.報工工站名稱;
  g1.工序範圍 = clean(g1.工序範圍 || g1.工序 || g1.OP || g1.工序編號_最終 || g1.工序編號 || '');
  g1.工序 = g1.工序範圍;
  g1.主機台 = clean(g1.主機台 || (g1.機台清單[0] && g1.機台清單[0].機台編號) || '');
  g1.機台編號清單 = g1.機台清單.map(m => m.機台編號);
  g1.機台編號 = g1.機台編號清單.join('、');
  const purl = clean(g1.產品縮圖網址 || g1.產品照片網址 || g1.照片網址 || g1.縮圖網址 || '');
  g1.產品縮圖網址 = purl;
  g1.產品照片網址 = purl;
  g1.顯示名稱 = clean(g1.顯示名稱) || [g1.報工工站名稱, g1.工序範圍, g1.機台編號].filter(Boolean).join('｜');
  return g1;
}

function splitMachineText(v) {
  return clean(v).split(/[、,，;；\/\s]+/).map(x => x.replace(/\.0$/, '')).filter(x => /^\d{1,5}$/.test(x));
}

function buildProductList() {
  const map = new Map();
  DB.workstationGroups.forEach(gr => {
    const key = gr.產品編號 + '|' + gr.品名;
    if (!map.has(key)) map.set(key, gr);
  });
  return Array.from(map.values()).sort((a, b) => clean(a.品名).localeCompare(clean(b.品名), 'zh-Hant'));
}

function setStatus(text, type) {
  const textEl = g('statusText');
  const dot = g('statusDot');
  if (textEl) textEl.textContent = text;
  if (dot) dot.className = type === 'error' ? 'status-dot error' : type === 'ok' ? 'status-dot connected' : 'status-dot';
}

function fillStatusPill() {
  const p = DB.counts || {};
  setStatus('🟢 資料已載入 / Loaded｜人員：' + (p.人員 || DB.persons.length) + '｜產品：' + (p.產品 || DB.productList.length) + '｜工站群組：' + (p.報工工站群組 || DB.workstationGroups.length), 'ok');
}

function updateStepperUI() {
  const items = document.querySelectorAll('.step-item');
  const connectors = document.querySelectorAll('.step-connector');
  items.forEach((item, i) => {
    item.classList.remove('is-active', 'is-done', 'is-todo');
    const circle = item.querySelector('.step-circle');
    if (i < STATE.currentStep) { item.classList.add('is-done'); circle.textContent = '✓'; }
    else if (i === STATE.currentStep) { item.classList.add('is-active'); circle.textContent = i + 1; }
    else { item.classList.add('is-todo'); circle.textContent = i + 1; }
  });
  connectors.forEach((c, i) => {
    c.classList.remove('done', 'active');
    if (i < STATE.currentStep) c.classList.add('done');
    else if (i === STATE.currentStep) c.classList.add('active');
  });
}

function jumpToStep(idx) {
  if (idx === STATE.currentStep) return;
  if (idx > STATE.currentStep && !STATE.stepDone[STATE.currentStep]) {
    roar('⚠️', '請先完成目前步驟 / Complete Current Step First', '請依引導完成步驟 ' + (STATE.currentStep + 1) + ' 再繼續', 'warning');
    return;
  }
  switchStep(idx);
}

function switchStep(idx) {
  if (idx < 0 || idx >= TOTAL_STEPS) return;
  STATE.currentStep = idx;
  for (let i = 0; i < TOTAL_STEPS; i++) {
    const el = g('stepPage' + i);
    if (el) el.classList.toggle('hidden', i !== idx);
  }
  updateStepperUI();
  updateBottomBar();
  if (idx === 2) setDefaultTimes(false);
  if (idx === 3) updateDefectSyncNotice();
  if (idx === 4) updateConfirmSummary();
  updatePreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBottomBar() {
  const btnBack = g('btnBack');
  const btnNext = g('btnNext');
  if (STATE.currentStep === 0) { btnBack.classList.add('hidden'); btnNext.style.gridColumn = '1 / -1'; }
  else { btnBack.classList.remove('hidden'); btnNext.style.gridColumn = ''; }
  if (STATE.currentStep === TOTAL_STEPS - 1) {
    btnNext.textContent = '📤 送出報工 / Submit Report';
    btnNext.classList.add('green-submit');
  } else {
    btnNext.textContent = '下一步 → / Next';
    btnNext.classList.remove('green-submit');
  }
  btnNext.disabled = false;
  btnNext.classList.remove('submitting');
}

function markStepDone() {
  STATE.stepDone[STATE.currentStep] = true;
  updateStepperUI();
}

function goBack() { if (STATE.currentStep > 0) switchStep(STATE.currentStep - 1); }

function goNextOrSubmit() {
  const err = validateCurrentStep();
  if (err) { roar('⚠️', '請完成必填項目 / Required Field Missing', err, 'warning'); return; }
  markStepDone();
  if (STATE.currentStep < TOTAL_STEPS - 1) switchStep(STATE.currentStep + 1);
  else submitReport();
}

function validateCurrentStep() {
  switch (STATE.currentStep) {
    case 0:
      if (!STATE.operator && !val('personId')) return '請選擇作業員 / Please select an operator';
      break;
    case 1:
      if (!STATE.currentProductGroup) return '請選擇產品 / Please select product';
      if (!STATE.currentWorkstation && !val('workstationSelect')) return '請選擇報工工站 / Please select workstation';
      break;
    case 2:
      if (num('totalQty') <= 0) return '今日共做數必須大於 0 / Total qty must be > 0';
      if (num('ngQty') > num('totalQty')) return '不良數不可大於共做數 / NG qty must not exceed total qty';
      break;
    case 3:
      return validateDefectAllocation();
    case 4:
      return validateReport(buildReportData());
  }
  return '';
}

function getShiftType(shift) {
  const t = String(shift || '');
  if (t.includes('大夜') || t.includes('夜') || t === 'NIGHT') return 'night';
  if (t.includes('中') || t === 'SWING') return 'swing';
  return 'day';
}
function getShiftIcon(shift) { const k = getShiftType(shift); return k === 'night' ? '🌙' : k === 'swing' ? '🌇' : '☀️'; }

function bindSafeTap(container, selector, callback) {
  if (!container) return;
  container.onpointerdown = e => {
    STATE.touchStart = { x: e.clientX, y: e.clientY, t: Date.now() };
    STATE.touchMoved = false;
  };
  container.onpointermove = e => {
    if (Math.abs(e.clientX - STATE.touchStart.x) > 10 || Math.abs(e.clientY - STATE.touchStart.y) > 10) STATE.touchMoved = true;
  };
  container.onpointerup = e => {
    if (STATE.touchMoved) return;
    const card = e.target.closest(selector);
    if (card) callback(card);
  };
}

function buildPersonGrid() {
  const container = g('personGrid');
  const active = DB.persons.filter(r => String(r.啟用 || '是') !== '否');
  if (!active.length) {
    container.innerHTML = '<div class="caption" style="text-align:center;padding:24px;grid-column:1/-1;">尚無啟用的人員資料 / No active operators</div>';
    return;
  }
  container.innerHTML = active.map(r => {
    const i = DB.persons.indexOf(r);
    const st = getShiftType(r.班別 || r.班別名稱);
    const icon = getShiftIcon(r.班別 || r.班別名稱);
    const url = clean(r.縮圖網址 || r.照片網址 || r.圖片網址 || '');
    const avatarContent = url ? `<img src="${safeAttr(url)}" onerror="this.parentElement.innerHTML='${safeAttr(nameInitial(r.姓名))}'">` : nameInitial(r.姓名);
    return `<div class="person-card shift-${st} ripple" data-index="${i}" id="personCard_${i}">
      <span class="shift-badge ${st}">${icon} ${safeTxt(String(r.班別 || r.班別名稱 || '').slice(0, 2))}</span>
      <span class="selected-badge">✓ 已選取</span>
      <div class="avatar-ring">${avatarContent}</div>
      <div class="person-name">${safeTxt(r.姓名 || '未知')}</div>
      <div class="person-id">${safeTxt(r.工號 || '')}</div>
    </div>`;
  }).join('');
  bindSafeTap(container, '.person-card', card => selectPerson(Number(card.dataset.index)));
}

function nameInitial(name) { const n = String(name || '?').trim(); return n ? n.charAt(0).toUpperCase() : '?'; }

function filterPersons() {
  const kw = (val('personSearch') || '').toUpperCase().trim();
  const cards = document.querySelectorAll('.person-card');
  let any = false;
  cards.forEach(card => {
    const idx = Number(card.dataset.index);
    const r = DB.persons[idx];
    if (!r) { card.classList.add('hidden'); return; }
    const txt = [r.姓名, r.工號, r.班別, r.班別名稱, r.部門, r.職稱].join(' ').toUpperCase();
    if (!kw || txt.includes(kw)) { card.classList.remove('hidden'); any = true; }
    else card.classList.add('hidden');
  });
  g('personGridEmpty').classList.toggle('hidden', any);
}

function selectPerson(i) {
  const r = DB.persons[i];
  if (!r) return;
  STATE.operator = r;
  document.querySelectorAll('.person-card').forEach(c => c.classList.remove('selected'));
  const card = g('personCard_' + i);
  if (card) { card.classList.add('selected'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  setVal('personId', r.工號 || '');
  setVal('personName', r.姓名 || '');
  if (r.班別 || r.班別名稱) setVal('shiftSelect', r.班別名稱 || inferShift(r.班別));
  g('empIdHighlight').textContent = r.工號 || '未輸入';
  const disp = g('selectedPersonDisplay');
  disp.className = 'selected-person-display populated';
  disp.innerHTML = imgHTML(r.縮圖網址 || r.照片網址, '無頭像', true) +
    `<div><div class="person-info-name">${safeTxt(r.姓名 || '')} <span style="font-size:12px;color:var(--text-secondary);">${safeTxt(r.工號 || '')}</span></div>
    <div class="caption" style="margin-top:4px;">${safeTxt([r.部門, r.班別名稱 || r.班別, r.職稱 || ''].filter(Boolean).join('｜'))}</div></div>`;
  saveRecentPerson(i);
  setDefaultTimes(false);
  markStepDone();
  updatePreview();
  updateConfirmSummary();
  roar('👤', '已選定作業員 / Operator Selected', (r.姓名 || '') + '（' + (r.工號 || '') + '）', 'success');
}

function buildShiftSelect() {
  const s = g('shiftSelect');
  s.innerHTML = '';
  if (DB.shiftList && DB.shiftList.length) DB.shiftList.forEach(x => s.add(new Option(x.名稱 || x.值 || x, x.值 || x.名稱 || x)));
  else ['早班', '中班', '大夜班', '加班'].forEach(x => s.add(new Option(x, x)));
}

function inferShift(v) {
  const t = String(v || '').trim();
  if (t === 'DAY') return '早班';
  if (t === 'SWING') return '中班';
  if (t === 'NIGHT') return '大夜班';
  if (t.includes('大夜') || t.includes('夜')) return '大夜班';
  if (t.includes('中班') || t.includes('中')) return '中班';
  return '早班';
}

function loadRecentPersons() {
  try { renderRecentPersons(JSON.parse(localStorage.getItem(LS_KEY) || '[]').slice(0, MAX_RECENT)); }
  catch(e) { renderRecentPersons([]); }
}
function saveRecentPerson(i) {
  try {
    let list = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    list = list.filter(x => x.idx !== i);
    list.unshift({ idx: i, ts: Date.now() });
    if (list.length > MAX_RECENT * 3) list = list.slice(0, MAX_RECENT * 3);
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    renderRecentPersons(list.slice(0, MAX_RECENT));
  } catch(e) {}
}
function renderRecentPersons(list) {
  const bar = g('recentBar');
  const content = g('recentPersonContent');
  if (!list || !list.length) { bar.classList.add('hidden'); content.innerHTML = ''; return; }
  const html = list.map(item => {
    const r = DB.persons[item.idx];
    if (!r || r.啟用 === '否') return '';
    const url = clean(r.縮圖網址 || r.照片網址 || '');
    const head = url ? `<img src="${safeAttr(url)}" onerror="this.parentElement.innerHTML='${safeAttr(nameInitial(r.姓名))}'">` : nameInitial(r.姓名);
    return `<div class="recent-chip ripple" onclick="selectPerson(${item.idx})" title="${safeTxt(r.姓名 || '')}｜${safeTxt(r.工號 || '')}"><div class="mini-avatar">${head}</div>${safeTxt(r.姓名 || '')}</div>`;
  }).filter(Boolean).join('');
  content.innerHTML = html;
  bar.classList.toggle('hidden', !html.trim());
}

function buildProductGrid() {
  const container = g('productGrid');
  if (!DB.productList.length) {
    container.innerHTML = '<div class="caption" style="text-align:center;padding:20px;grid-column:1/-1;">尚無產品資料 / No products</div>';
    return;
  }
  container.innerHTML = DB.productList.map((gr, index) => {
    const dname = cleanProductName(gr.品名 || '');
    const url = clean(gr.產品縮圖網址 || gr.產品照片網址 || gr.縮圖網址 || gr.照片網址 || '');
    const thumb = url ? `<img src="${safeAttr(url)}" onerror="this.parentElement.innerHTML='<span>📦</span>'">` : '<span>📦</span>';
    return `<div class="product-card ripple" data-index="${index}" data-pid="${safeAttr(gr.產品編號 || '')}">
      <div class="product-thumb">${thumb}</div>
      <div class="product-name">${safeTxt(dname)}</div>
      <div class="product-code">${safeTxt(gr.產品編號 || '')}</div>
    </div>`;
  }).join('');
  bindSafeTap(container, '.product-card', card => selectProduct(Number(card.dataset.index)));
}

function filterProducts() {
  const kw = (val('productSearch') || '').toUpperCase().trim();
  const cards = document.querySelectorAll('.product-card');
  let any = false;
  cards.forEach(card => {
    const gr = DB.productList[Number(card.dataset.index)];
    const txt = [gr?.產品編號, gr?.品名, gr?.客戶品號].join(' ').toUpperCase();
    if (!kw || txt.includes(kw)) { card.classList.remove('hidden'); any = true; }
    else card.classList.add('hidden');
  });
  g('productGridEmpty').classList.toggle('hidden', any);
}

function selectProduct(indexOrKey) {
  let gr;
  if (typeof indexOrKey === 'number') gr = DB.productList[indexOrKey];
  else {
    const key = String(indexOrKey || '');
    gr = DB.productList.find(x => (x.產品編號 + '|' + x.品名) === key || x.產品編號 === key || x.客戶品號 === key);
  }
  if (!gr) return;
  STATE.currentProductKey = gr.產品編號 + '|' + gr.品名;
  document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
  const idx = DB.productList.indexOf(gr);
  const t = document.querySelector(`.product-card[data-index="${idx}"]`);
  if (t) { t.classList.add('selected'); t.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  STATE.productGroupList = DB.workstationGroups.filter(x => x.產品編號 === gr.產品編號 && x.品名 === gr.品名);
  STATE.currentProductGroup = STATE.productGroupList[0] || gr;
  STATE.currentWorkstation = null;
  STATE.currentMachineId = '';
  setVal('productCode', gr.產品編號 || '');
  setVal('productName', cleanProductName(gr.品名 || ''));
  showProductPhoto(gr);
  buildWorkstationSelect();
  g('selectedProductArea').classList.remove('hidden');
  g('routeDetailsArea').classList.add('hidden');
  updatePreview();
  updateConfirmSummary();
  roar('📦', '已選定產品 / Product Selected', (gr.品名 || '') + '（' + (gr.產品編號 || '') + '）', 'success');
}

function showProductPhoto(gr) {
  const disp = g('selectedProductDisplay');
  disp.className = 'selected-person-display populated';
  disp.innerHTML = imgHTML(gr?.產品縮圖網址 || gr?.產品照片網址 || gr?.縮圖網址 || gr?.照片網址, '無產品照', false) +
    `<div><div class="person-info-name">${safeTxt(gr?.品名 ? cleanProductName(gr.品名) : '尚未選產品')}</div><div class="caption" style="margin-top:3px;">${safeTxt(gr?.產品編號 || '')}</div></div>`;
}

function buildWorkstationSelect() {
  const s = g('workstationSelect');
  s.innerHTML = '<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
  STATE.productGroupList.forEach((gr, i) => s.add(new Option(gr.顯示名稱 || [gr.報工工站名稱, gr.工序範圍, gr.主機台].filter(Boolean).join('｜'), String(i))));
  clearWorkstationFields();
}

function onWorkstationChange() {
  const i = val('workstationSelect');
  STATE.currentWorkstation = i === '' ? null : STATE.productGroupList[Number(i)];
  const gr = STATE.currentWorkstation || {};
  if (!STATE.currentWorkstation) { clearWorkstationFields(); return; }
  g('routeDetailsArea').classList.remove('hidden');
  setVal('processRange', gr.工序範圍 || gr.工序 || '');
  setVal('stdCapacity', gr.標準產能 || gr['8H產能'] || gr['8小時標準產能'] || gr['工站8H產能_件'] || '');
  setVal('stdTimeSec', gr.標準工時_秒 || gr['標準工時(秒)'] || '');
  buildMachineSelect(gr.機台清單 || []);
  renderMachineGrid(gr.機台清單 || []);
  markStepDone();
  updatePreview();
  updateConfirmSummary();
}

function clearWorkstationFields() {
  STATE.currentWorkstation = null;
  STATE.currentMachineId = '';
  setVal('processRange', '');
  setVal('stdCapacity', '');
  setVal('stdTimeSec', '');
  g('mainMachineSelect').innerHTML = '';
  g('machineListGrid').innerHTML = '';
}

function buildMachineSelect(list) {
  const s = g('mainMachineSelect');
  s.innerHTML = '';
  if (!list.length) { s.add(new Option('無固定機台 / No Fixed Machine', '')); return; }
  list.forEach(m => s.add(new Option([m.機台編號, m.區域, m.機台型號 || m.設備名稱].filter(Boolean).join('｜'), m.機台編號 || '')));
  STATE.currentMachineId = list[0].機台編號 || '';
  s.value = STATE.currentMachineId;
}

function renderMachineGrid(list) {
  const box = g('machineListGrid');
  if (!list.length) { box.innerHTML = '<div class="caption" style="padding:8px;">此工站無固定機台 / No dedicated machines</div>'; return; }
  box.innerHTML = list.map((m, i) => {
    const url = clean(m.縮圖網址 || m.照片網址 || '');
    return `<div class="machine-card ripple ${i === 0 ? 'selected' : ''}" data-id="${safeAttr(m.機台編號 || '')}">
      ${url ? `<img src="${safeAttr(url)}" onerror="this.outerHTML='<div class=machine-no-img>⚙</div>'">` : '<div class="machine-no-img">⚙</div>'}
      <div class="machine-number">${safeTxt(m.機台編號 || '')}</div>
      <div class="machine-info">${safeTxt([m.區域, m.機台型號, m.設備名稱].filter(Boolean).join('｜'))}</div>
    </div>`;
  }).join('');
  bindSafeTap(box, '.machine-card', card => selectMachine(card.dataset.id));
}

function selectMachine(id) {
  STATE.currentMachineId = clean(id);
  setVal('mainMachineSelect', STATE.currentMachineId);
  document.querySelectorAll('.machine-card').forEach(c => c.classList.toggle('selected', c.dataset.id === STATE.currentMachineId));
  updatePreview();
  updateConfirmSummary();
}

function initAnomalyTypeSelect() {
  const s = g('anomalyType');
  if (!s) return;
  const existing = Array.from(s.options).map(o => o.value);
  (DB.anomalyTypes || []).forEach(x => { if (!existing.includes(x)) s.add(new Option(x, x)); });
}

function addDefectRow() {
  const id = ++defectRowIdCounter;
  STATE.defectRows.push({ id, category: '', code: '', name: '', enName: '', qty: 0 });
  renderDefectRows();
}

function deleteDefectRow(id) {
  STATE.defectRows = STATE.defectRows.filter(r => r.id !== id);
  renderDefectRows();
  updatePreview();
  updateConfirmSummary();
}

function renderDefectRows() {
  const container = g('defectContainer');
  if (!STATE.defectRows.length) {
    container.innerHTML = '<div class="caption" style="padding:6px;">尚無分配項目 / No allocation items yet</div>';
    updateDefectSummaryDisplay();
    return;
  }
  let zOpts = (DB.ngReasons.Z || []).map(x => `<option value="${safeAttr((x.代碼 || '') + '|Z')}">${safeTxt((x.代碼 || '') + '｜' + (x.名稱 || '') + '｜' + (x.英文名稱 || ''))}</option>`).join('');
  let yOpts = (DB.ngReasons.Y || []).map(x => `<option value="${safeAttr((x.代碼 || '') + '|Y')}">${safeTxt((x.代碼 || '') + '｜' + (x.名稱 || '') + '｜' + (x.英文名稱 || ''))}</option>`).join('');
  if (!zOpts && !yOpts) {
    zOpts = ['Z01|素材裂縫|Surface Crack','Z02|加工砂孔|Sand Porosity','Z03|外觀刮傷|Surface Scratch'].map(s => { const [c,n,e] = s.split('|'); return `<option value="${c}|Z">${c}｜${n}｜${e}</option>`; }).join('');
    yOpts = ['Y01|內徑超差|Inner Diameter OOT','Y02|外徑超差|Outer Diameter OOT','Y03|長度超差|Length OOT','Y04|表面粗糙度|Surface Roughness'].map(s => { const [c,n,e] = s.split('|'); return `<option value="${c}|Y">${c}｜${n}｜${e}</option>`; }).join('');
  }
  container.innerHTML = STATE.defectRows.map(row => `<div class="defect-row" id="defectRow_${row.id}">
      <button class="defect-delete-btn ripple" onclick="deleteDefectRow(${row.id})" type="button">✕</button>
      <select style="flex:2;min-width:0;" onchange="onDefectReasonChange(${row.id},this.value)">
        <option value="">── 選擇不良原因 / Select Defect Reason ──</option>
        <optgroup label="Z 素材 / 外觀類">${zOpts}</optgroup>
        <optgroup label="Y 加工 / 尺寸類">${yOpts}</optgroup>
      </select>
      <input class="qty-input" type="number" min="0" value="${row.qty || ''}" inputmode="numeric" placeholder="pcs" onchange="onDefectQtyChange(${row.id},this.value)" oninput="onDefectQtyChange(${row.id},this.value)">
    </div>`).join('');
  STATE.defectRows.forEach(row => {
    if (!row.code) return;
    const sel = document.querySelector(`#defectRow_${row.id} select`);
    if (sel) sel.value = row.code + '|' + row.category;
  });
  updateDefectSummaryDisplay();
}

function onDefectReasonChange(id, val_) {
  const row = STATE.defectRows.find(r => r.id === id);
  if (!row) return;
  const parts = String(val_ || '').split('|');
  row.code = parts[0] || '';
  row.category = parts[1] || '';
  const list = row.category === 'Z' ? (DB.ngReasons.Z || []) : (DB.ngReasons.Y || []);
  const found = list.find(x => x.代碼 === row.code);
  row.name = found ? (found.名稱 || '') : '';
  row.enName = found ? (found.英文名稱 || '') : '';
  updateDefectSummaryDisplay();
  updatePreview();
  updateConfirmSummary();
}

function onDefectQtyChange(id, v) {
  const row = STATE.defectRows.find(r => r.id === id);
  if (!row) return;
  row.qty = Math.max(0, Number(v) || 0);
  updateDefectSummaryDisplay();
  updatePreview();
  updateConfirmSummary();
}

function validateDefectAllocation() {
  const totalNG = num('ngQty');
  const allocated = STATE.defectRows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  if (allocated > totalNG) return '不良分配數量不可超過 Step 3 的不良數 / Allocation cannot exceed NG qty';
  const rowMissingReason = STATE.defectRows.some(r => Number(r.qty) > 0 && !r.code);
  if (rowMissingReason) return '有填不良數量時，必須選擇不良原因 / Defect qty requires a reason';
  return '';
}

function updateDefectSummaryDisplay() {
  const box = g('defectSummary');
  const totalNG = num('ngQty');
  const allocated = STATE.defectRows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  if (totalNG > 0 || allocated > 0) {
    const diff = totalNG - allocated;
    const color = diff >= 0 ? 'var(--g-green)' : 'var(--g-red)';
    box.innerHTML = `📊 分配總和：<b>${allocated}</b> / 總不良：<b>${totalNG}</b>（<span style="color:${color}">${diff >= 0 ? '剩餘可分配 / Remaining ' + diff + ' pcs' : '⚠ 超過 ' + Math.abs(diff) + ' pcs'}</span>）`;
    box.classList.remove('hidden');
  } else box.classList.add('hidden');
}

function calcAnomalyTime() {
  const s = g('anomalyStart').value;
  const e = g('anomalyEnd').value;
  if (s && e) {
    let diff = (new Date(e) - new Date(s)) / 3600000;
    if (diff < 0) diff += 24;
    setVal('anomalyDuration', diff >= 0 ? diff.toFixed(2) + ' hrs' : '');
  } else setVal('anomalyDuration', '');
  updatePreview();
  updateConfirmSummary();
}

function triggerCamera() { g('cameraInput').click(); }
function triggerFileSelect() { g('fileInput').click(); }
function onPhotoChange(e, source) {
  const files = Array.from(e.target.files || []);
  const remaining = MAX_PHOTOS - STATE.photos.length;
  if (remaining <= 0) { roar('⚠️', '已達上限 / Max Reached', '最多 ' + MAX_PHOTOS + ' 張照片', 'warning'); e.target.value = ''; return; }
  files.slice(0, remaining).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      STATE.photos.push({ base64: String(ev.target.result), mime: file.type, filename: file.name, note: '', source });
      renderPhotoGrid();
      updatePreview();
      updateConfirmSummary();
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}
function renderPhotoGrid() {
  const grid = g('photoGrid');
  grid.innerHTML = STATE.photos.map((p, i) => `<div class="photo-item ripple" onclick="openPhotoNote(${i})"><img src="${p.base64}" alt="photo${i + 1}">${p.note ? `<div class="photo-note-overlay">${safeTxt(p.note)}</div>` : ''}<button class="photo-delete-btn ripple" onclick="event.stopPropagation();deletePhoto(${i})" type="button">✕</button></div>`).join('');
  g('photoCount').textContent = STATE.photos.length + ' / ' + MAX_PHOTOS + ' 張照片 / photos';
}
function deletePhoto(i) { STATE.photos.splice(i, 1); renderPhotoGrid(); updatePreview(); updateConfirmSummary(); }
function clearAllPhotos() {
  if (!STATE.photos.length) return;
  if (!confirm('確認清除所有照片？/ Clear all photos?')) return;
  STATE.photos = [];
  renderPhotoGrid();
  updatePreview();
  updateConfirmSummary();
}
function openPhotoNote(i) {
  STATE.editPhotoIndex = i;
  const p = STATE.photos[i];
  if (!p) return;
  g('photoNotePreview').src = p.base64;
  g('photoNoteText').value = p.note || '';
  g('photoNoteModal').classList.remove('hidden');
  setTimeout(() => g('photoNoteText').focus(), 200);
}
function closePhotoNote() { g('photoNoteModal').classList.add('hidden'); STATE.editPhotoIndex = -1; }
function savePhotoNote() {
  const i = STATE.editPhotoIndex;
  if (i >= 0 && STATE.photos[i]) {
    STATE.photos[i].note = g('photoNoteText').value;
    renderPhotoGrid();
    updatePreview();
    updateConfirmSummary();
  }
  closePhotoNote();
}

function calcQty() {
  let total = num('totalQty');
  let ng = num('ngQty');
  if (ng > total && total > 0) { setVal('ngQty', total); ng = total; }
  const good = Math.max(total - ng, 0);
  g('displayTotal').textContent = total;
  g('displayNG').textContent = ng;
  g('displayGood').textContent = good;
  if (total > 0) markStepDone();
  updateDefectSummaryDisplay();
  updateDefectSyncNotice();
  updatePreview();
  updateConfirmSummary();
}

function calcWorkingHours() {
  const s = val('startTime');
  const e = val('endTime');
  if (s && e) {
    let diff = (new Date(e) - new Date(s)) / 3600000;
    if (diff < 0) diff += 24;
    setVal('workingHours', diff >= 0 ? diff.toFixed(2) + ' hrs' : '');
  }
  updatePreview();
  updateConfirmSummary();
}

function getShiftRule() {
  const op = STATE.operator || {};
  const shift = op.班別名稱 || op.班別 || val('shiftSelect') || '早班';
  if (shift.includes('大夜') || shift.includes('夜') || shift === 'NIGHT') return { name: '大夜班', start: op.班別開始時間 || '23:00', end: op.班別結束時間 || '07:50', overnight: true, hrs: Number(op.班別實際工時 || 8) };
  if (shift.includes('中') || shift === 'SWING') return { name: '中班', start: op.班別開始時間 || '16:50', end: op.班別結束時間 || '01:40', overnight: true, hrs: Number(op.班別實際工時 || 8) };
  return { name: '早班', start: op.班別開始時間 || '08:00', end: op.班別結束時間 || '16:50', overnight: false, hrs: Number(op.班別實際工時 || 8) };
}
function toDateTimeVal(time, nextDay) {
  const now = new Date();
  const [hh, mm] = String(time || '00:00').split(':').map(Number);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh || 0, mm || 0, 0, 0);
  if (nextDay) d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function setDefaultTimes(update = true) {
  const rule = getShiftRule();
  setVal('shiftSelect', rule.name);
  if (!val('startTime')) setVal('startTime', toDateTimeVal(rule.start, false));
  if (!val('endTime')) setVal('endTime', toDateTimeVal(rule.end, rule.overnight));
  if (!val('workingHours')) setVal('workingHours', rule.hrs + ' hrs');
  if (update) { updatePreview(); updateConfirmSummary(); }
}

function buildReportData() {
  const op = STATE.operator || {};
  const gr = STATE.currentWorkstation || STATE.currentProductGroup || {};
  const total = num('totalQty');
  const ng = num('ngQty');
  const machines = gr.機台清單 || [];
  const defectLines = STATE.defectRows.filter(r => r.code && Number(r.qty) > 0).map(r => ({
    category: r.category,
    code: r.code,
    name: r.name,
    enName: r.enName,
    qty: Number(r.qty) || 0,
    分類: r.category,
    不良代碼: r.code,
    不良名稱: r.name,
    英文名稱: r.enName,
    不良數量: Number(r.qty) || 0
  }));
  const reportNo = `RPT-${nowCompact()}-${clean(op.工號 || val('personId') || 'NA')}-${clean(gr.產品編號 || val('productCode') || 'NA')}`;
  const machineList = machines.map(m => m.機台編號).filter(Boolean).join(',');
  return {
    reportId: reportNo,
    報工編號: reportNo,
    作業日: todayLocal(),
    workDate: todayLocal(),
    工號: op.工號 || val('personId'),
    姓名: op.姓名 || val('personName'),
    班別: val('shiftSelect'),
    是否加班: val('overtimeSelect'),
    加班類型: val('overtimeType'),
    作業員照片網址: op.照片網址 || '',
    作業員縮圖網址: op.縮圖網址 || '',
    產品編號: gr.產品編號 || val('productCode'),
    客戶品號: gr.客戶品號 || '',
    品名: gr.品名 || val('productName'),
    產品照片網址: gr.產品照片網址 || '',
    產品縮圖網址: gr.產品縮圖網址 || '',
    報工工站名稱: gr.報工工站名稱 || gr.工站名稱 || '',
    工站名稱: gr.報工工站名稱 || gr.工站名稱 || '',
    工序: Array.isArray(gr.工序清單) && gr.工序清單.length ? gr.工序清單.join(',') : (gr.工序 || gr.工序範圍 || ''),
    工序範圍: gr.工序範圍 || gr.工序 || '',
    機台清單: machineList,
    主機台: val('mainMachineSelect') || STATE.currentMachineId || gr.主機台 || '',
    今日共做數: total,
    不良數: ng,
    實際良品數: Math.max(total - ng, 0),
    不良率: total > 0 ? ng / total : 0,
    開始時間: val('startTime'),
    結束時間: val('endTime'),
    實際工時: val('workingHours'),
    不良行清單: defectLines,
    異常類型: val('anomalyType'),
    異常開始時間: g('anomalyStart')?.value || '',
    異常結束時間: g('anomalyEnd')?.value || '',
    異常工時: val('anomalyDuration'),
    備註: val('remarks'),
    現場照片清單: STATE.photos.map(p => ({
      照片類型: '現場照片',
      檔案名稱: p.filename,
      MIME類型: p.mime,
      Base64: (p.base64 || '').split(',')[1] || '',
      備註: p.note,
      來源: p.source
    })),
    operator: { employeeId: op.工號 || val('personId'), operatorName: op.姓名 || val('personName'), shift: val('shiftSelect') },
    product: { productCode: gr.產品編號 || val('productCode'), customerPartNo: gr.客戶品號 || '', productName: gr.品名 || val('productName') },
    workstation: { workstationName: gr.報工工站名稱 || gr.工站名稱 || '', processRange: gr.工序範圍 || gr.工序 || '', machineList, mainMachine: val('mainMachineSelect') || STATE.currentMachineId || gr.主機台 || '' },
    output: { totalQty: total, ngQty: ng, goodQty: Math.max(total - ng, 0), startTime: val('startTime'), endTime: val('endTime'), workingHours: val('workingHours') },
    quality: { defects: defectLines, defectSummary: defectLines.map(r => `${r.category}類 ${r.code} ${r.name} × ${r.qty} pcs`).join('；') },
    photos: STATE.photos.map(p => ({ name: p.filename, size: 0, type: p.mime, note: p.note })),
    remarks: val('remarks'),
    source: 'PWA_V4_正式基準_483_GOOGLE_GLASS_UI'
  };
}

function updateDefectSyncNotice() {
  const box = g('defectSyncNotice');
  const hasDefect = STATE.defectRows.some(r => r.code && Number(r.qty) > 0) || num('ngQty') > 0;
  box.innerHTML = hasDefect ? '<div class="sync-badge">⚠ 此報工將同步寫入 09_不良紀錄 / Will sync to defect record</div>' : '';
}

function updatePreview() {
  const d = buildReportData();
  const defectDetails = d.不良行清單.map(r => `   › ${r.category}類 ${r.code} ${r.name}${r.enName ? ' / ' + r.enName : ''} × ${r.qty} pcs`).join('\n') || '   無不良記錄 / No defects';
  const text = `📋 報工預覽 / Production Report Preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 作業員 / Operator：${d.姓名 || '—'} / ${d.工號 || '—'} ｜ ${d.班別 || '—'}
   加班 / OT：${d.是否加班 || '否'} ｜ ${d.加班類型 || '無'}
📦 產品 / Product：${d.產品編號 || '—'} ｜ ${d.品名 || '—'}
🔧 工站 / Workstation：${d.報工工站名稱 || '—'} ｜ 工序：${d.工序 || '—'}
🖥 機台 / Machine：${d.機台清單 || '無'} ｜ 主機台：${d.主機台 || '無'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 今日共做 / Total Qty：${d.今日共做數} pcs
❌ 不良數 / NG Qty：${d.不良數} pcs
✅ 實際良品 / Good Qty：${d.實際良品數} pcs
📉 不良率 / NG Rate：${d.不良率 > 0 ? (d.不良率 * 100).toFixed(1) + '%' : '0%'}
🕐 工時 / Working Hrs：${d.實際工時 || '未計算 / N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 不良明細 / Defect Details：
${defectDetails}
🚨 異常類型 / Abnormal Type：${d.異常類型 || '無異常'}
⏱ 異常時間 / Anomaly Duration：${d.異常工時 || 'N/A'}
📸 照片 / Photos：${d.現場照片清單.length} 張
📝 備註 / Remarks：${d.備註 || '無'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(d.不良數 > 0 || d.不良行清單.length > 0) ? '⚠ 含不良記錄，將同步寫入 09_不良紀錄 / Contains defects, will sync' : '✅ 無不良記錄 / No defect records'}`;
  if (g('reportPreview')) g('reportPreview').textContent = text;
  if (g('confirmPreview')) g('confirmPreview').textContent = text;
}

function updateConfirmSummary() {
  const d = buildReportData();
  const container = g('confirmSummaryContent');
  if (!container) return;
  if (!d.工號 && !d.產品編號) {
    container.innerHTML = '<div class="caption" style="text-align:center;padding:12px;">請先完成前面步驟再回來確認 / Please complete previous steps first</div>';
    return;
  }
  const defectHTML = d.不良行清單.length ? d.不良行清單.map(r => `<div class="confirm-row"><span class="confirm-label">不良原因 / Defect</span><span class="confirm-value">${r.category}類 ${r.code} ${r.name} × ${r.qty} pcs</span></div>`).join('') : '<div class="confirm-row"><span class="confirm-label">不良記錄 / Defects</span><span class="confirm-value">無 / None</span></div>';
  container.innerHTML = `<div class="confirm-row"><span class="confirm-label">👤 作業員 / Operator</span><span class="confirm-value">${safeTxt(d.姓名 || '—')} / ${safeTxt(d.工號 || '—')}｜${safeTxt(d.班別 || '—')}</span></div>
    <div class="confirm-row"><span class="confirm-label">📦 產品 / Product</span><span class="confirm-value">${safeTxt(d.產品編號 || '—')}｜${safeTxt(d.品名 || '—')}</span></div>
    <div class="confirm-row"><span class="confirm-label">🔧 工站 / Workstation</span><span class="confirm-value">${safeTxt(d.報工工站名稱 || '—')}</span></div>
    <div class="confirm-row"><span class="confirm-label">📊 共做 / Total</span><span class="confirm-value">${d.今日共做數} pcs</span></div>
    <div class="confirm-row"><span class="confirm-label">✅ 良品 / Good</span><span class="confirm-value" style="color:var(--g-green);font-size:16px;font-weight:900;">${d.實際良品數} pcs</span></div>
    <div class="confirm-row"><span class="confirm-label">❌ 不良 / NG</span><span class="confirm-value" style="color:${d.不良數 > 0 ? 'var(--g-red)' : 'var(--text-tertiary)'};">${d.不良數} pcs</span></div>
    ${defectHTML}
    <div class="confirm-row"><span class="confirm-label">🕐 工時 / Hours</span><span class="confirm-value">${safeTxt(d.實際工時 || 'N/A')}</span></div>
    <div class="confirm-row"><span class="confirm-label">📸 照片 / Photos</span><span class="confirm-value">${d.現場照片清單.length} 張</span></div>
    <div class="confirm-row"><span class="confirm-label">📝 備註 / Remarks</span><span class="confirm-value">${safeTxt(d.備註 || '無')}</span></div>
    ${d.不良數 > 0 ? '<div style="text-align:center;margin-top:8px;padding:7px;background:rgba(254,243,199,.90);border-radius:10px;font-weight:700;font-size:11px;color:#854D0E;">⚠ 此報工將同步寫入 09_不良紀錄 / Will sync to defect records</div>' : ''}`;
}

function validateReport(d) {
  if (!d.工號) return '請選擇作業員 / Please select operator';
  if (!d.產品編號 && !d.品名) return '請選擇產品 / Please select product';
  if (!d.報工工站名稱) return '請選擇報工工站 / Please select workstation';
  if (d.今日共做數 <= 0) return '今日共做數必須大於 0 / Total qty must be > 0';
  if (d.不良數 < 0) return '不良數不可小於 0 / NG qty must be >= 0';
  if (d.不良數 > d.今日共做數) return '不良數不可大於共做數 / NG qty must not exceed total qty';
  return validateDefectAllocation();
}

function submitReport() {
  const d = buildReportData();
  const err = validateReport(d);
  if (err) { roar('⚠️', '驗證失敗 / Validation Failed', err, 'error'); return; }
  updatePreview();
  updateConfirmSummary();
  const hasDefects = d.不良數 > 0 || d.不良行清單.length > 0;
  const msg = `確認送出報工？/ Confirm submit?\n\n實際良品：${d.實際良品數} pcs${hasDefects ? '\n不良數：' + d.不良數 + ' pcs（將同步寫入 09_不良紀錄）' : ''}`;
  if (!confirm(msg)) return;
  showSubmitOverlay(true, '📤 報工送出中...', 'Submitting production record...');
  g('btnNext').disabled = true;
  g('btnNext').classList.add('submitting');
  window.V4Bridge.submitReport(d).then(res => {
    showSubmitOverlay(false);
    updateBottomBar();
    if (res && (res.成功 || res.success || res.ok || res.reportId || res.報工編號)) {
      const reportNo = res.報工編號 || res.reportId || d.報工編號;
      roar('✅', '報工完成 / Complete', '報工編號：' + reportNo + (hasDefects ? '｜不良紀錄已同步' : ''), 'success');
      resetAfterSubmit();
    } else {
      roar('❌', '寫入失敗 / Submit Failed', (res && (res.訊息 || res.message)) || '未知錯誤', 'error');
    }
  }).catch(err => {
    showSubmitOverlay(false);
    updateBottomBar();
    roar('❌', '寫入失敗 / Submit Failed', err.message || String(err), 'error');
  });
}

function resetAfterSubmit() {
  setVal('totalQty', '');
  setVal('ngQty', '');
  STATE.defectRows = [];
  renderDefectRows();
  addDefectRow();
  STATE.photos = [];
  renderPhotoGrid();
  g('defectSyncNotice').innerHTML = '';
  g('remarks').value = '';
  STATE.stepDone = [false, false, false, false, false];
  STATE.operator = null;
  STATE.currentWorkstation = null;
  STATE.currentProductGroup = null;
  STATE.currentMachineId = '';
  document.querySelectorAll('.person-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
  g('selectedProductArea').classList.add('hidden');
  g('routeDetailsArea').classList.add('hidden');
  const disp = g('selectedPersonDisplay');
  disp.className = 'selected-person-display';
  disp.innerHTML = '<div class="person-photo-lg">點擊卡片<br>Click Card</div><div><div class="person-info-name" style="color:var(--text-secondary);">尚未選擇 / Not Selected</div><div class="caption" style="margin-top:4px;">請點擊上方人員卡片、掃碼或搜尋選擇</div></div>';
  g('empIdHighlight').textContent = '未輸入 / Not Set';
  setVal('personId', '');
  setVal('personName', '');
  setVal('productCode', '');
  setVal('productName', '');
  calcQty();
  switchStep(0);
  roar('🔄', '已重置 / Reset Complete', '可以重新開始報工流程', 'success');
}

function openPersonScan() {
  g('personScanModal').classList.remove('hidden');
  g('personScanStatus').textContent = '📡 啟動相機中... / Starting camera...';
  g('personManualInput').classList.add('hidden');
  g('personManualInput').value = '';
  startCamera('person');
}
function closePersonScan() { g('personScanModal').classList.add('hidden'); stopCamera('person'); }
function openProductScan() {
  g('productScanModal').classList.remove('hidden');
  g('productScanStatus').textContent = '📡 啟動相機中... / Starting camera...';
  g('productManualInput').classList.add('hidden');
  g('productManualInput').value = '';
  startCamera('product');
}
function closeProductScan() { g('productScanModal').classList.add('hidden'); stopCamera('product'); }

async function startCamera(mode) {
  stopCamera(mode);
  const vidId = mode === 'product' ? 'productVideo' : 'personVideo';
  const statusId = mode === 'product' ? 'productScanStatus' : 'personScanStatus';
  const vid = g(vidId);
  const statusEl = g(statusId);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
    if (mode === 'product') STATE.productStream = stream;
    else STATE.personStream = stream;
    vid.srcObject = stream;
    vid.style.display = 'block';
    statusEl.textContent = '🔍 掃描中，請將條碼對準框內 / Scanning — align barcode to frame';
    let detector = null;
    if ('BarcodeDetector' in window) {
      try {
        const fmts = await window.BarcodeDetector.getSupportedFormats();
        if (fmts.length) detector = new window.BarcodeDetector({ formats: fmts });
      } catch(e) {}
    }
    if (mode === 'product') STATE.productDetector = detector;
    else STATE.personDetector = detector;
    startScanLoop(mode);
    if (!detector) {
      statusEl.textContent = '⚠️ 瀏覽器不支援自動偵測，請使用手動輸入 / Use manual input';
      const mid = mode === 'product' ? 'productManualInput' : 'personManualInput';
      g(mid).classList.remove('hidden');
      g(mid).focus();
    }
  } catch(e) {
    statusEl.textContent = '❌ 無法存取相機：' + (e.message || '請確認相機權限');
    vid.style.display = 'none';
    const mid = mode === 'product' ? 'productManualInput' : 'personManualInput';
    g(mid).classList.remove('hidden');
    g(mid).focus();
  }
}

function startScanLoop(mode) {
  const timerKey = mode === 'product' ? 'productTimer' : 'personTimer';
  const detKey = mode === 'product' ? 'productDetector' : 'personDetector';
  const vidId = mode === 'product' ? 'productVideo' : 'personVideo';
  if (STATE[timerKey]) clearInterval(STATE[timerKey]);
  if (!STATE[detKey]) return;
  STATE[timerKey] = setInterval(async () => {
    const v = g(vidId);
    if (!v || !v.srcObject || v.readyState < 2) return;
    try {
      const dets = await STATE[detKey].detect(v);
      if (dets && dets.length) {
        const val_ = dets[0].rawValue || dets[0].data || '';
        if (val_) mode === 'product' ? onProductScanned(val_) : onPersonScanned(val_);
      }
    } catch(e) {}
  }, 350);
}

function stopCamera(mode) {
  const timerKey = mode === 'product' ? 'productTimer' : 'personTimer';
  const streamKey = mode === 'product' ? 'productStream' : 'personStream';
  const detKey = mode === 'product' ? 'productDetector' : 'personDetector';
  const vidId = mode === 'product' ? 'productVideo' : 'personVideo';
  if (STATE[timerKey]) { clearInterval(STATE[timerKey]); STATE[timerKey] = null; }
  if (STATE[streamKey]) { STATE[streamKey].getTracks().forEach(t => t.stop()); STATE[streamKey] = null; }
  STATE[detKey] = null;
  const v = g(vidId);
  if (v) { v.srcObject = null; v.style.display = 'none'; }
}

function onPersonScanned(val_) {
  stopCamera('person');
  closePersonScan();
  const cleanVal = clean(val_);
  const found = DB.persons.find(r => clean(r.工號) === cleanVal && r.啟用 !== '否') || DB.persons.find(r => clean(r.工號).includes(cleanVal) && r.啟用 !== '否') || DB.persons.find(r => clean(r.姓名) === cleanVal && r.啟用 !== '否') || DB.persons.find(r => clean(r.條碼 || r.工牌號 || r.卡號) === cleanVal && r.啟用 !== '否');
  if (found) { selectPerson(DB.persons.indexOf(found)); roar('✅', '掃碼成功 / Scan Success', '已自動選定作業員，可前往下一步', 'success'); }
  else roar('⚠️', '找不到此工號 / Employee Not Found', '條碼：' + cleanVal + '，請手動選擇', 'warning');
}
function onProductScanned(val_) {
  stopCamera('product');
  closeProductScan();
  const cleanVal = clean(val_);
  const foundIndex = DB.productList.findIndex(g_ => clean(g_.產品編號) === cleanVal || clean(g_.客戶品號) === cleanVal || clean(g_.品名) === cleanVal);
  if (foundIndex >= 0) { selectProduct(foundIndex); roar('✅', '產品掃碼成功 / Product Scanned', DB.productList[foundIndex].品名 + '（' + DB.productList[foundIndex].產品編號 + '）', 'success'); }
  else roar('⚠️', '找不到此產品 / Product Not Found', '條碼：' + cleanVal, 'warning');
}
function togglePersonManual() { const f = g('personManualInput'); f.classList.toggle('hidden'); if (!f.classList.contains('hidden')) { f.focus(); g('personScanStatus').textContent = '⌨ 請輸入工號後按 Enter'; } }
function toggleProductManual() { const f = g('productManualInput'); f.classList.toggle('hidden'); if (!f.classList.contains('hidden')) { f.focus(); g('productScanStatus').textContent = '⌨ 請輸入產品編號後按 Enter'; } }
function personManualConfirm(e) { if (e.key === 'Enter') { e.preventDefault(); const v = g('personManualInput').value.trim(); if (v) onPersonScanned(v); } }
function productManualConfirm(e) { if (e.key === 'Enter') { e.preventDefault(); const v = g('productManualInput').value.trim(); if (v) onProductScanned(v); } }

function listenScannerGun() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key.length > 1 && e.key !== 'Enter') return;
    if (e.key === 'Enter') {
      if (scanBuffer.length >= 3) {
        e.preventDefault();
        const v = scanBuffer.trim();
        scanBuffer = '';
        STATE.currentStep === 1 ? onProductScanned(v) : onPersonScanned(v);
      } else scanBuffer = '';
      return;
    }
    scanBuffer += e.key;
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => { if (scanBuffer.length < 6) scanBuffer = ''; }, SCAN_GAP_MS * 2);
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const fn = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.mozRequestFullScreen || document.documentElement.msRequestFullscreen;
    if (fn) fn.call(document.documentElement).catch(e => roar('⚠️', '無法全螢幕', e.message || '', 'warning'));
  } else {
    const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (fn) fn.call(document);
  }
}
function listenFullscreenChange() {
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach(evt => document.addEventListener(evt, () => {
    const btn = g('fullscreenBtn');
    if (btn) btn.title = document.fullscreenElement ? '退出全螢幕 / Exit Fullscreen' : '全螢幕 / Fullscreen';
  }));
}

function roar(icon, title, sub, type) {
  const container = g('roarContainer');
  if (!container) return;
  const id = 'roar_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const cssClass = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : '';
  const el = document.createElement('div');
  el.className = 'roar-notif ' + cssClass;
  el.id = id;
  el.innerHTML = `<div class="roar-icon">${icon}</div><div class="roar-text"><div class="roar-title">${safeTxt(title)}</div><div class="roar-sub">${safeTxt(String(sub || ''))}</div></div><button class="roar-close" onclick="closeRoar('${id}')" type="button">✕</button>`;
  container.appendChild(el);
  setTimeout(() => closeRoar(id), 5200);
}
function closeRoar(id) {
  const el = g(id);
  if (!el) return;
  el.style.animation = 'roarOut .3s ease forwards';
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
}
function showSubmitOverlay(show, title, sub) {
  const el = g('submitOverlay');
  if (!el) return;
  if (show) { if (title) g('submitTitle').textContent = title; if (sub) g('submitSub').textContent = sub; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}
function showLoading(show) {
  const el = g('loadingScreen');
  if (!el) return;
  if (!show) { el.classList.add('hide'); setTimeout(() => { el.style.display = 'none'; }, 650); }
  else { el.style.display = 'flex'; el.classList.remove('hide'); }
}

function g(id) { return document.getElementById(id); }
function val(id) { const el = g(id); return el ? el.value : ''; }
function setVal(id, v) { const el = g(id); if (el) el.value = v == null ? '' : v; }
function num(id) { const n = Number(val(id)); return Number.isFinite(n) ? n : 0; }
function clean(v) { return String(v == null ? '' : v).trim().replace(/\.0$/, ''); }
function cleanProductName(name) { return clean(name).replace(/^[-/：；（）$@「」。，、？！._—|～《》¥\[\]{}#%^*+=·\s]+/g, '').replace(/[-/：；（）$@「」。，、？！._—|～《》¥\[\]{}#%^*+=·\s]+$/g, '').trim() || clean(name); }
function safeTxt(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function safeAttr(s) { return safeTxt(s).replace(/\n/g, ''); }
function imgHTML(url, fallbackText, isRound) {
  const fallback = `<div class="person-photo-lg">${safeTxt(fallbackText)}</div>`;
  const cls = isRound ? 'style="width:80px;height:80px;border-radius:50%;object-fit:cover;"' : 'style="width:80px;height:80px;border-radius:var(--r-md);object-fit:cover;"';
  return clean(url).startsWith('http') ? `<img src="${safeAttr(url)}" ${cls} onerror="this.outerHTML='${safeAttr(fallback)}'">` : fallback;
}
function todayLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function nowCompact() { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`; }

Object.assign(window, {
  reloadData, jumpToStep, goBack, goNextOrSubmit, openPersonScan, closePersonScan, togglePersonManual, personManualConfirm,
  openProductScan, closeProductScan, toggleProductManual, productManualConfirm, filterPersons, filterProducts, onWorkstationChange,
  selectMachine, calcQty, calcWorkingHours, calcAnomalyTime, addDefectRow, deleteDefectRow, onDefectReasonChange, onDefectQtyChange,
  triggerCamera, triggerFileSelect, onPhotoChange, clearAllPhotos, openPhotoNote, closePhotoNote, savePhotoNote, toggleFullscreen, closeRoar,
  updatePreview, updateConfirmSummary
});
