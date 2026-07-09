'use strict';

/* 化新報工 V4｜正式主程式 v5.0.5
 * 直接修改正式主檔，不使用外掛修補檔。
 * 對接：pwa-config.js + gas-bridge.js
 * 寫入：09_報工；不良資料由後端同步 09_不良紀錄。
 */

let DB = {
  persons: [],
  products: [],
  machines: [],
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
  defectRows: [],
  editPhotoIndex: -1,
  stepDone: [false, false, false, false, false],
  touchStart: { x: 0, y: 0, t: 0 },
  touchMoved: false
};

window.DB = DB;
window.STATE = STATE;

const TOTAL_STEPS = 5;
const LS_KEY = 'huaxin_rg_v4_recent_persons';
const MAX_RECENT = 6;
const MAX_PHOTOS = 12;
const WORK_DATE_CUTOFF = '06:10';
const NORMAL_WORK_MINUTES = 480;
let defectRowIdCounter = 0;
let topbarTimer = null;
let scanBuffer = '';
let scanTimer = null;

const SHIFT_RULES = {
  '早班': { name: '早班', code: 'DAY', start: '08:00', end: '16:50', overnight: false, breaks: [['10:00','10:10'], ['12:10','12:40'], ['14:40','14:50']] },
  '中班': { name: '中班', code: 'SWING', start: '16:50', end: '01:40', overnight: true, breaks: [['18:50','19:00'], ['21:00','21:30'], ['23:30','23:40']] },
  '夜班': { name: '夜班', code: 'NIGHT', start: '23:00', end: '07:50', overnight: true, breaks: [['01:00','01:10'], ['03:10','03:40'], ['05:40','05:50']] }
};

window.addEventListener('load', () => {
  injectOfficialStyle();
  hideSelectedPersonCard();
  buildShiftSelect();
  setDefaultTimes(false);
  initAnomalyTypeSelect();
  addDefectRow();
  updateStepperUI();
  updateBottomBar();
  startTopbarClock();
  reloadData();
  listenScannerGun();
  listenFullscreenChange();
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

function g(id) { return document.getElementById(id); }
function clean(v) { return String(v == null ? '' : v).trim(); }
function cleanNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function val(id) { const x = g(id); return x ? x.value : ''; }
function setVal(id, v) { const x = g(id); if (x) x.value = v == null ? '' : v; }
function safeTxt(v) { return clean(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function safeAttr(v) { return safeTxt(v).replace(/\n/g, ''); }
function num(id) { return cleanNum(val(id)); }
function pad(n) { return String(n).padStart(2, '0'); }
function nameInitial(name) { const n = clean(name || '?'); return n ? n.charAt(0).toUpperCase() : '?'; }
function normalizeKey(v) { return clean(v).replace(/\.0$/, '').toLowerCase(); }
function driveThumb(url) {
  const s = clean(url);
  if (!s) return '';
  const m1 = s.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  const m2 = s.match(/[?&]id=([A-Za-z0-9_-]+)/);
  const id = (m1 && m1[1]) || (m2 && m2[1]);
  if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1200';
  return /^https?:\/\//i.test(s) ? s : '';
}
function firstPhoto(obj, fields) {
  obj = obj || {};
  for (const f of fields) {
    const u = driveThumb(obj[f]);
    if (u) return u;
  }
  return '';
}
function imgHTML(url, fallback, isAvatar) {
  const u = driveThumb(url);
  if (!u) return `<div class="${isAvatar ? 'person-photo-lg' : 'person-photo-lg'} no-photo">${safeTxt(fallback || '無照片')}</div>`;
  return `<div class="${isAvatar ? 'person-photo-lg' : 'person-photo-lg'}"><img src="${safeAttr(u)}" alt="${safeAttr(fallback || '照片')}" loading="lazy" onerror="this.parentElement.classList.add('no-photo');this.remove();"></div>`;
}

function injectOfficialStyle() {
  if (g('hx-work-report-official-style')) return;
  const st = document.createElement('style');
  st.id = 'hx-work-report-official-style';
  st.textContent = `
    .selected-person-card-hidden{display:none!important}
    .selected-person-focus{animation:selectedPersonFocus505 .55s cubic-bezier(.34,1.56,.64,1);box-shadow:0 16px 48px rgba(52,168,83,.28),0 0 0 3px rgba(52,168,83,.18)!important;border-color:rgba(52,168,83,.45)!important}
    @keyframes selectedPersonFocus505{0%{transform:scale(.94);opacity:.35}45%{transform:scale(1.035);opacity:1}100%{transform:scale(1);opacity:1}}
    .product-thumb img,.avatar-ring img,.mini-avatar img{width:100%;height:100%;object-fit:cover;display:block}
    .machine-card{position:relative;overflow:hidden}.machine-card img{width:100%;height:100%;object-fit:cover;display:block}.machine-no-img{display:grid;place-items:center;min-height:88px;font-size:32px;background:#eef3fb;border-radius:14px;color:#1967D2}.machine-number,.machine-info{position:relative;z-index:2}
  `;
  document.head.appendChild(st);
}

function registerPWAServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js?v=505').catch(() => {});
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
  DB.persons = (data.人員 || data.people || []).filter(r => clean(r.啟用 || '是') !== '否');
  DB.products = data.產品 || data.products || [];
  DB.machines = data.機台 || data.machines || [];
  DB.workstationGroups = (data.報工工站群組 || data.routes || data.途程工站群組 || []).map(normalizeGroup).filter(g => g.產品編號 || g.品名);
  DB.ngReasons = normalizeDefectsForUI(data.不良原因 || data.defects || { Z: [], Y: [] });
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
  hideSelectedPersonCard();
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
  g1.產品編號 = clean(g1.產品編號 || g1.料號 || g1.productCode || '');
  g1.品名 = cleanProductName(g1.品名 || g1.產品名稱 || g1.productName || '');
  g1.客戶品號 = clean(g1.客戶品號 || g1.客戶料號 || '');
  g1.報工工站名稱 = clean(g1.報工工站名稱 || g1.工站名稱 || g1.工站 || '');
  g1.工站名稱 = g1.報工工站名稱;
  g1.工序範圍 = clean(g1.工序範圍 || g1.工序 || g1.OP || g1.工序編號_最終 || g1.工序編號 || '');
  g1.工序 = g1.工序範圍;
  const purl = firstPhoto(g1, ['產品縮圖網址','產品照片網址','照片網址','縮圖網址','圖片網址','URL']);
  g1.產品縮圖網址 = purl;
  g1.產品照片網址 = purl;
  g1.照片網址 = purl;
  g1.機台清單 = g1.機台清單.map(m => normalizeMachineForRoute(m)).filter(m => m.機台編號);
  if (!g1.機台清單.length) {
    splitMachineText([g1.機台編號清單, g1.可用機台, g1.主機台, g1.機台編號].filter(Boolean).join('、'))
      .forEach(id => g1.機台清單.push(normalizeMachineForRoute({ 機台編號: id, 設備名稱: '機台' + id })));
  }
  g1.主機台 = clean(g1.主機台 || (g1.機台清單[0] && g1.機台清單[0].機台編號) || '');
  g1.機台編號清單 = g1.機台清單.map(m => m.機台編號);
  g1.機台編號 = g1.機台編號清單.join('、');
  g1.顯示名稱 = clean(g1.顯示名稱) || [g1.報工工站名稱, g1.工序範圍, g1.機台編號].filter(Boolean).join('｜');
  return g1;
}

function normalizeMachineForRoute(m) {
  m = Object.assign({}, m || {});
  const id = clean(m.機台編號 || m.主機台 || m.設備編號 || m.id || '');
  const found = DB.machines.find(x => clean(x.機台編號 || x.設備編號) === id) || {};
  const url = firstPhoto(m, ['機台照片網址','縮圖網址','照片網址','圖片網址','URL']) || firstPhoto(found, ['機台照片網址','縮圖網址','照片網址','圖片網址','URL']);
  return Object.assign({}, found, m, {
    機台編號: id,
    主機台: id,
    設備名稱: clean(m.設備名稱 || m.機台名稱 || m.名稱 || found.設備名稱 || found.機台名稱 || found.名稱 || ('機台' + id)),
    機台名稱: clean(m.機台名稱 || m.設備名稱 || m.名稱 || found.機台名稱 || found.設備名稱 || found.名稱 || ('機台' + id)),
    縮圖網址: url,
    照片網址: url,
    機台照片網址: url
  });
}

function splitMachineText(v) {
  return clean(v).split(/[、,，;；\/\s]+/).map(x => x.replace(/\.0$/, '')).filter(x => /^\d{1,5}$/.test(x));
}

function cleanProductName(v) { return clean(v).replace(/\s+/g, ' '); }

function buildProductList() {
  const productMap = new Map();
  DB.products.forEach(p => {
    const pid = clean(p.產品編號 || p.料號 || p.品號 || '');
    const pname = cleanProductName(p.品名 || p.產品名稱 || '');
    if (!pid && !pname) return;
    const u = firstPhoto(p, ['產品縮圖網址','產品照片網址','照片網址','縮圖網址','圖片網址','URL']);
    productMap.set(pid + '|' + pname, Object.assign({}, p, { 產品編號: pid, 品名: pname, 產品縮圖網址: u, 產品照片網址: u, 照片網址: u }));
  });
  const map = new Map();
  DB.workstationGroups.forEach(gr => {
    const base = productMap.get(gr.產品編號 + '|' + gr.品名) || productMap.get(gr.產品編號 + '|') || {};
    const u = firstPhoto(gr, ['產品縮圖網址','產品照片網址','照片網址','縮圖網址','圖片網址','URL']) || firstPhoto(base, ['產品縮圖網址','產品照片網址','照片網址','縮圖網址','圖片網址','URL']);
    const key = gr.產品編號 + '|' + gr.品名;
    if (!map.has(key)) map.set(key, Object.assign({}, base, gr, { 產品縮圖網址: u, 產品照片網址: u, 照片網址: u }));
  });
  productMap.forEach((p, key) => { if (!map.has(key)) map.set(key, p); });
  return Array.from(map.values()).sort((a, b) => clean(a.品名).localeCompare(clean(b.品名), 'zh-Hant'));
}

function normalizeDefectsForUI(src) {
  if (!src) return { Z: [], Y: [] };
  if (Array.isArray(src)) {
    const out = { Z: [], Y: [] };
    src.forEach(x => {
      const code = clean(x.代碼 || x.code || x.不良代碼 || '');
      const cat = clean(x.分類 || x.category || code.charAt(0) || '').toUpperCase();
      if (!code) return;
      const row = { 代碼: code, 名稱: clean(x.名稱 || x.name || x.不良名稱 || ''), 英文名稱: clean(x.英文名稱 || x.enName || x.英文 || '') };
      if (cat === 'Y') out.Y.push(row); else out.Z.push(row);
    });
    return out;
  }
  return { Z: src.Z || [], Y: src.Y || [] };
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
    if (i < STATE.currentStep) { item.classList.add('is-done'); if (circle) circle.textContent = '✓'; }
    else if (i === STATE.currentStep) { item.classList.add('is-active'); if (circle) circle.textContent = i + 1; }
    else { item.classList.add('is-todo'); if (circle) circle.textContent = i + 1; }
  });
  connectors.forEach((c, i) => { c.classList.toggle('done', i < STATE.currentStep); c.classList.toggle('active', i === STATE.currentStep); });
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
  if (!btnBack || !btnNext) return;
  if (STATE.currentStep === 0) { btnBack.classList.add('hidden'); btnNext.style.gridColumn = '1 / -1'; }
  else { btnBack.classList.remove('hidden'); btnNext.style.gridColumn = ''; }
  btnNext.textContent = STATE.currentStep === 4 ? '📤 送出報工 / Submit Report' : '下一步 → / Next';
  btnNext.classList.toggle('green-submit', STATE.currentStep === 4);
}

function goBack() { switchStep(STATE.currentStep - 1); }

function markStepDone() {
  STATE.stepDone[STATE.currentStep] = true;
  updateStepperUI();
  updateBottomBar();
}

function validateCurrentStep() {
  switch (STATE.currentStep) {
    case 0:
      if (!STATE.operator) return '請先選擇作業員 / Please select operator';
      break;
    case 1:
      if (!STATE.currentProductGroup) return '請先選擇產品 / Please select product';
      if (!STATE.currentWorkstation) return '請選擇報工工站 / Please select workstation';
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
  const t = clean(shift).toUpperCase();
  if (t.includes('NIGHT') || t.includes('大夜') || t.includes('夜')) return 'night';
  if (t.includes('SWING') || t.includes('中')) return 'swing';
  return 'day';
}
function getShiftIcon(shift) { const k = getShiftType(shift); return k === 'night' ? '🌙' : k === 'swing' ? '🌇' : '☀️'; }
function inferShift(v) {
  const t = clean(v).toUpperCase();
  if (t === 'SWING' || t.includes('中')) return '中班';
  if (t === 'NIGHT' || t.includes('大夜') || t.includes('夜')) return '夜班';
  return '早班';
}

function bindSafeTap(container, selector, callback) {
  if (!container) return;
  container.onpointerdown = e => { STATE.touchStart = { x: e.clientX, y: e.clientY, t: Date.now() }; STATE.touchMoved = false; };
  container.onpointermove = e => { if (Math.abs(e.clientX - STATE.touchStart.x) > 10 || Math.abs(e.clientY - STATE.touchStart.y) > 10) STATE.touchMoved = true; };
  container.onpointerup = e => { if (STATE.touchMoved) return; const card = e.target.closest(selector); if (card) callback(card); };
}

function buildPersonGrid() {
  const container = g('personGrid');
  if (!container) return;
  const active = DB.persons.filter(r => clean(r.啟用 || '是') !== '否');
  if (!active.length) {
    container.innerHTML = '<div class="caption" style="text-align:center;padding:24px;grid-column:1/-1;">尚無啟用的人員資料 / No active operators</div>';
    return;
  }
  container.innerHTML = active.map(r => {
    const i = DB.persons.indexOf(r);
    const st = getShiftType(r.班別 || r.班別名稱);
    const icon = getShiftIcon(r.班別 || r.班別名稱);
    const url = firstPhoto(r, ['縮圖網址','照片網址','圖片網址','頭像網址','URL']);
    const avatarContent = url ? `<img src="${safeAttr(url)}" onerror="this.parentElement.innerHTML='${safeAttr(nameInitial(r.姓名))}'">` : nameInitial(r.姓名);
    return `<div class="person-card shift-${st} ripple" data-index="${i}" id="personCard_${i}">
      <span class="shift-badge ${st}">${icon} ${safeTxt(inferShift(r.班別名稱 || r.班別).slice(0, 2))}</span>
      <span class="selected-badge">✓ 已選取</span>
      <div class="avatar-ring">${avatarContent}</div>
      <div class="person-name">${safeTxt(r.姓名 || '未知')}</div>
      <div class="person-id">${safeTxt(r.工號 || '')}</div>
    </div>`;
  }).join('');
  bindSafeTap(container, '.person-card', card => selectPerson(Number(card.dataset.index)));
}

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
  const empty = g('personGridEmpty');
  if (empty) empty.classList.toggle('hidden', any);
}

function selectedPersonCard() {
  const disp = g('selectedPersonDisplay');
  return disp ? disp.closest('.glass-card') : null;
}
function hideSelectedPersonCard() {
  const card = selectedPersonCard();
  if (card && !STATE.operator && !val('personId')) card.classList.add('selected-person-card-hidden');
}
function showSelectedPersonCardCenter() {
  const card = selectedPersonCard();
  if (!card) return;
  card.classList.remove('selected-person-card-hidden');
  card.style.display = '';
  function run() {
    const c = selectedPersonCard();
    if (!c) return;
    const vv = window.visualViewport;
    const vh = vv ? vv.height : (window.innerHeight || document.documentElement.clientHeight || 0);
    const vy = vv ? vv.offsetTop : 0;
    const rect = c.getBoundingClientRect();
    const current = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const bar = document.querySelector('.bottom-bar') ? document.querySelector('.bottom-bar').offsetHeight : 90;
    const usable = Math.max(260, vh - bar - 18);
    let target = current + rect.top + vy - Math.max(12, (usable - rect.height) / 2);
    const max = Math.max(0, (document.documentElement.scrollHeight || document.body.scrollHeight || 0) - vh);
    target = Math.max(0, Math.min(target, max));
    window.scrollTo({ top: target, behavior: 'smooth' });
    c.classList.remove('selected-person-focus');
    void c.offsetWidth;
    c.classList.add('selected-person-focus');
    setTimeout(() => c.classList.remove('selected-person-focus'), 900);
  }
  requestAnimationFrame(() => { setTimeout(run, 80); setTimeout(run, 280); });
}

function selectPerson(i) {
  const r = DB.persons[i];
  if (!r) return;
  STATE.operator = r;
  document.querySelectorAll('.person-card').forEach(c => c.classList.remove('selected'));
  const card = g('personCard_' + i);
  if (card) card.classList.add('selected');
  setVal('personId', r.工號 || '');
  setVal('personName', r.姓名 || '');
  buildShiftSelect(inferShift(r.班別名稱 || r.班別));
  setVal('shiftSelect', inferShift(r.班別名稱 || r.班別));
  const emp = g('empIdHighlight');
  if (emp) emp.textContent = r.工號 || '未輸入';
  const disp = g('selectedPersonDisplay');
  if (disp) {
    const url = firstPhoto(r, ['縮圖網址','照片網址','圖片網址','頭像網址','URL']);
    disp.className = 'selected-person-display populated';
    disp.innerHTML = imgHTML(url, '無頭像', true) +
      `<div><div class="person-info-name">${safeTxt(r.姓名 || '')} <span style="font-size:12px;color:var(--text-secondary);">${safeTxt(r.工號 || '')}</span></div>
      <div class="caption" style="margin-top:4px;">${safeTxt([r.部門, inferShift(r.班別名稱 || r.班別), r.職稱 || ''].filter(Boolean).join('｜'))}</div></div>`;
  }
  saveRecentPerson(i);
  setDefaultTimes(false);
  showSelectedPersonCardCenter();
  markStepDone();
  updatePreview();
  updateConfirmSummary();
  roar('👤', '已選定作業員 / Operator Selected', (r.姓名 || '') + '（' + (r.工號 || '') + '）', 'success');
}

function buildShiftSelect(selected) {
  const s = g('shiftSelect');
  if (!s) return;
  const current = inferShift(selected || s.value || '早班');
  s.innerHTML = '';
  ['早班', '中班', '夜班'].forEach(x => s.add(new Option(x, x)));
  s.value = current;
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
  if (!bar || !content) return;
  if (!list || !list.length) { bar.classList.add('hidden'); content.innerHTML = ''; return; }
  const html = list.map(item => {
    const r = DB.persons[item.idx];
    if (!r || r.啟用 === '否') return '';
    const url = firstPhoto(r, ['縮圖網址','照片網址','圖片網址']);
    const head = url ? `<img src="${safeAttr(url)}" onerror="this.parentElement.innerHTML='${safeAttr(nameInitial(r.姓名))}'">` : nameInitial(r.姓名);
    return `<div class="recent-chip ripple" onclick="selectPerson(${item.idx})" title="${safeTxt(r.姓名 || '')}｜${safeTxt(r.工號 || '')}"><div class="mini-avatar">${head}</div>${safeTxt(r.姓名 || '')}</div>`;
  }).filter(Boolean).join('');
  content.innerHTML = html;
  bar.classList.toggle('hidden', !html.trim());
}

function buildProductGrid() {
  const container = g('productGrid');
  if (!container) return;
  if (!DB.productList.length) {
    container.innerHTML = '<div class="caption" style="text-align:center;padding:20px;grid-column:1/-1;">尚無產品資料 / No products</div>';
    return;
  }
  container.innerHTML = DB.productList.map((gr, index) => {
    const dname = cleanProductName(gr.品名 || '');
    const url = firstPhoto(gr, ['產品縮圖網址','產品照片網址','縮圖網址','照片網址','圖片網址','URL']);
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
  const empty = g('productGridEmpty');
  if (empty) empty.classList.toggle('hidden', any);
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
  if (t) t.classList.add('selected');
  STATE.productGroupList = DB.workstationGroups.filter(x => x.產品編號 === gr.產品編號 && (!gr.品名 || !x.品名 || x.品名 === gr.品名));
  STATE.currentProductGroup = STATE.productGroupList[0] || gr;
  STATE.currentWorkstation = null;
  STATE.currentMachineId = '';
  setVal('productCode', gr.產品編號 || '');
  setVal('productName', cleanProductName(gr.品名 || ''));
  showProductPhoto(gr);
  buildWorkstationSelect();
  const area = g('selectedProductArea'); if (area) area.classList.remove('hidden');
  const detail = g('routeDetailsArea'); if (detail) detail.classList.add('hidden');
  STATE.stepDone[1] = false;
  updatePreview();
  updateConfirmSummary();
  roar('📦', '已選定產品 / Product Selected', (gr.品名 || '') + '（' + (gr.產品編號 || '') + '）', 'success');
}

function showProductPhoto(gr) {
  const disp = g('selectedProductDisplay');
  if (!disp) return;
  const url = firstPhoto(gr, ['產品縮圖網址','產品照片網址','縮圖網址','照片網址','圖片網址','URL']);
  disp.className = 'selected-person-display populated';
  disp.innerHTML = imgHTML(url, '無產品照', false) +
    `<div><div class="person-info-name">${safeTxt(gr?.品名 ? cleanProductName(gr.品名) : '尚未選產品')}</div><div class="caption" style="margin-top:3px;">${safeTxt(gr?.產品編號 || '')}</div></div>`;
}

function buildWorkstationSelect() {
  const s = g('workstationSelect');
  if (!s) return;
  s.innerHTML = '<option value="">── 請選擇報工工站 / Select Workstation ──</option>';
  STATE.productGroupList.forEach((gr, i) => s.add(new Option(gr.顯示名稱 || [gr.報工工站名稱, gr.工序範圍, gr.主機台].filter(Boolean).join('｜'), String(i))));
  clearWorkstationFields();
}

function onWorkstationChange() {
  const i = val('workstationSelect');
  STATE.currentWorkstation = i === '' ? null : STATE.productGroupList[Number(i)];
  const gr = STATE.currentWorkstation || {};
  if (!STATE.currentWorkstation) { clearWorkstationFields(); return; }
  const detail = g('routeDetailsArea'); if (detail) detail.classList.remove('hidden');
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
  const ms = g('mainMachineSelect'); if (ms) ms.innerHTML = '';
  const box = g('machineListGrid'); if (box) box.innerHTML = '';
}

function buildMachineSelect(list) {
  const s = g('mainMachineSelect');
  if (!s) return;
  s.innerHTML = '';
  if (!list.length) { s.add(new Option('無固定機台 / No Fixed Machine', '')); return; }
  list.forEach(m => s.add(new Option([m.機台編號, m.區域, m.機台型號 || m.設備名稱].filter(Boolean).join('｜'), m.機台編號 || '')));
  STATE.currentMachineId = list[0].機台編號 || '';
  s.value = STATE.currentMachineId;
}

function renderMachineGrid(list) {
  const box = g('machineListGrid');
  if (!box) return;
  if (!list.length) { box.innerHTML = '<div class="caption" style="padding:8px;">此工站無固定機台 / No dedicated machines</div>'; return; }
  box.innerHTML = list.map((m, i) => {
    const url = firstPhoto(m, ['機台照片網址','縮圖網址','照片網址','圖片網址','URL']);
    return `<div class="machine-card ripple ${i === 0 ? 'selected' : ''}" data-id="${safeAttr(m.機台編號 || '')}">
      ${url ? `<img src="${safeAttr(url)}" onerror="this.outerHTML='<div class=machine-no-img>⚙</div>'">` : '<div class="machine-no-img">⚙</div>'}
      <div class="machine-number">${safeTxt(m.機台編號 || '')}</div>
      <div class="machine-info">${safeTxt([m.區域, m.機台型號, m.設備名稱 || m.機台名稱].filter(Boolean).join('｜'))}</div>
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
  const old = s.value || '無異常';
  s.innerHTML = '';
  ['無異常'].concat(DB.anomalyTypes || []).filter((x, i, arr) => x && arr.indexOf(x) === i).forEach(x => s.add(new Option(x, x)));
  s.value = old && Array.from(s.options).some(o => o.value === old) ? old : '無異常';
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
  if (!container) return;
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
  const parts = clean(val_).split('|');
  row.code = parts[0] || '';
  row.category = parts[1] || '';
  const list = row.category === 'Y' ? (DB.ngReasons.Y || []) : (DB.ngReasons.Z || []);
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
  const ng = num('ngQty');
  const sum = STATE.defectRows.reduce((a, b) => a + (Number(b.qty) || 0), 0);
  if (sum > ng) return '不良原因分配數量不可超過不良數 / Defect allocation exceeds NG qty';
  return '';
}

function updateDefectSummaryDisplay() {
  const box = g('defectSummary');
  if (!box) return;
  const ng = num('ngQty');
  const sum = STATE.defectRows.reduce((a, b) => a + (Number(b.qty) || 0), 0);
  box.classList.toggle('hidden', !(ng || sum));
  box.innerHTML = `📊 分配總和：<b>${sum}</b> / 總不良：<b>${ng}</b>（${sum <= ng ? '剩餘可分配' : '超過'} ${ng - sum} pcs）`;
  box.classList.toggle('error', sum > ng);
}

function updateDefectSyncNotice() {
  const n = g('defectSyncNotice');
  if (!n) return;
  const count = (DB.ngReasons.Z || []).length + (DB.ngReasons.Y || []).length;
  n.innerHTML = count ? `<div class="caption">✅ 已同步不良代碼主檔：${count} 筆</div>` : '<div class="caption">⚠️ 尚未同步不良代碼主檔，請確認資料庫</div>';
}

function calcQty() {
  const total = num('totalQty');
  let ng = num('ngQty');
  if (ng > total) { ng = total; setVal('ngQty', total); }
  const good = Math.max(0, total - ng);
  const dt = g('displayTotal'); if (dt) dt.textContent = total;
  const dn = g('displayNG'); if (dn) dn.textContent = ng;
  const dg = g('displayGood'); if (dg) dg.textContent = good;
  updateDefectSummaryDisplay();
  updatePreview();
  updateConfirmSummary();
  if (total > 0) STATE.stepDone[2] = true;
}

function minutes(t) { const a = clean(t || '00:00').split(':').map(Number); return (a[0] || 0) * 60 + (a[1] || 0); }
function localInputValue(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); }
function workDateBase() { const now = new Date(); const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()); if (now.getHours() * 60 + now.getMinutes() < minutes(WORK_DATE_CUTOFF)) b.setDate(b.getDate() - 1); return b; }
function dateAt(base, hhmm, rule) { const d = new Date(base.getFullYear(), base.getMonth(), base.getDate()); const [h, m] = hhmm.split(':').map(Number); if (rule.overnight && minutes(hhmm) < minutes(rule.start)) d.setDate(d.getDate() + 1); d.setHours(h || 0, m || 0, 0, 0); return d; }
function overlap(a1, a2, b1, b2) { return Math.max(0, Math.round((Math.min(a2, b2) - Math.max(a1, b1)) / 60000)); }
function calculateWorkMinutes(start, end, rule) {
  if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) return null;
  if (end <= start) end = new Date(end.getTime() + 86400000);
  let breakMin = 0;
  const base = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  rule.breaks.forEach(b => { const bs = dateAt(base, b[0], rule); let be = dateAt(base, b[1], rule); if (be <= bs) be = new Date(be.getTime() + 86400000); breakMin += overlap(start, end, bs, be); });
  const gross = Math.max(0, Math.round((end - start) / 60000));
  const net = Math.max(0, gross - breakMin);
  return { gross, breakMin, net, normal: Math.min(net, NORMAL_WORK_MINUTES), overtime: Math.max(0, net - NORMAL_WORK_MINUTES) };
}

function setDefaultTimes(force) {
  const shift = inferShift(val('shiftSelect') || (STATE.operator && (STATE.operator.班別名稱 || STATE.operator.班別)) || '早班');
  buildShiftSelect(shift);
  const rule = SHIFT_RULES[shift] || SHIFT_RULES['早班'];
  const base = workDateBase();
  if (force || !val('startTime')) setVal('startTime', localInputValue(dateAt(base, rule.start, rule)));
  if (force || !val('endTime')) setVal('endTime', localInputValue(dateAt(base, rule.end, rule)));
  calcWorkingHours();
}

function calcWorkingHours() {
  const shift = inferShift(val('shiftSelect') || '早班');
  const rule = SHIFT_RULES[shift] || SHIFT_RULES['早班'];
  const result = calculateWorkMinutes(new Date(val('startTime')), new Date(val('endTime')), rule);
  if (result) {
    setVal('workingHours', (result.net / 60).toFixed(2) + ' hrs');
    setVal('overtimeSelect', result.overtime > 0 ? '是' : '否');
    if (result.overtime > 0 && val('overtimeType') === '無') setVal('overtimeType', '平日加班');
    if (result.overtime <= 0) setVal('overtimeType', '無');
  }
  updatePreview();
  updateConfirmSummary();
}

function calcAnomalyTime() {
  const s = new Date(val('anomalyStart'));
  const e = new Date(val('anomalyEnd'));
  if (!isNaN(s) && !isNaN(e)) {
    let diff = (e - s) / 3600000;
    if (diff < 0) diff += 24;
    setVal('anomalyDuration', diff.toFixed(2) + ' hrs');
  }
  updatePreview();
  updateConfirmSummary();
}

function triggerCamera() { const x = g('cameraInput'); if (x) x.click(); }
function triggerFileSelect() { const x = g('fileInput'); if (x) x.click(); }
function onPhotoChange(e, source) {
  const files = Array.from(e.target.files || []);
  const remain = MAX_PHOTOS - STATE.photos.length;
  files.slice(0, remain).forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => { STATE.photos.push({ base64: String(ev.target.result), name: file.name, type: file.type, source, note: '' }); renderPhotoGrid(); updatePreview(); updateConfirmSummary(); };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}
function renderPhotoGrid() {
  const grid = g('photoGrid');
  if (!grid) return;
  grid.innerHTML = STATE.photos.map((p, i) => `<div class="photo-item"><img src="${safeAttr(p.base64)}" alt="photo"><button class="photo-delete-btn ripple" onclick="deletePhoto(${i})" type="button">✕</button></div>`).join('');
  const count = g('photoCount');
  if (count) count.textContent = `${STATE.photos.length} / ${MAX_PHOTOS} 張照片 / photos`;
}
function deletePhoto(i) { STATE.photos.splice(i, 1); renderPhotoGrid(); updatePreview(); updateConfirmSummary(); }
function clearAllPhotos() { STATE.photos = []; renderPhotoGrid(); updatePreview(); updateConfirmSummary(); }
function openPhotoNote(i) { STATE.editPhotoIndex = i; const p = STATE.photos[i]; if (!p) return; const m = g('photoNoteModal'); const img = g('photoNotePreview'); const txt = g('photoNoteText'); if (img) img.src = p.base64; if (txt) txt.value = p.note || ''; if (m) m.classList.remove('hidden'); }
function closePhotoNote() { const m = g('photoNoteModal'); if (m) m.classList.add('hidden'); STATE.editPhotoIndex = -1; }
function savePhotoNote() { const i = STATE.editPhotoIndex; if (STATE.photos[i]) STATE.photos[i].note = val('photoNoteText'); closePhotoNote(); updatePreview(); }

function buildReportData() {
  const gr = STATE.currentWorkstation || STATE.currentProductGroup || {};
  const op = STATE.operator || {};
  const start = new Date(val('startTime'));
  const end = new Date(val('endTime'));
  const shift = inferShift(val('shiftSelect'));
  const work = calculateWorkMinutes(start, end, SHIFT_RULES[shift] || SHIFT_RULES['早班']) || { net: 0, normal: 0, overtime: 0, breakMin: 0 };
  const total = num('totalQty');
  const ng = num('ngQty');
  const defects = STATE.defectRows.filter(r => r.code && Number(r.qty) > 0).map(r => ({ 分類: r.category, 代碼: r.code, 名稱: r.name, 英文名稱: r.enName, 數量: Number(r.qty) || 0 }));
  return {
    來源: 'PWA_V4_OFFICIAL',
    作業日: formatDate(workDateBase()),
    工號: op.工號 || val('personId'),
    姓名: op.姓名 || val('personName'),
    班別: shift,
    是否加班: val('overtimeSelect'),
    加班類型: val('overtimeType'),
    產品編號: val('productCode'),
    客戶品號: gr.客戶品號 || '',
    品名: val('productName'),
    報工工站名稱: gr.報工工站名稱 || gr.工站名稱 || '',
    工站名稱: gr.報工工站名稱 || gr.工站名稱 || '',
    工序範圍: gr.工序範圍 || gr.工序 || '',
    主機台: STATE.currentMachineId || val('mainMachineSelect'),
    機台清單: (gr.機台清單 || []).map(m => m.機台編號).join(','),
    今日共做數: total,
    不良數: ng,
    實際良品數: Math.max(0, total - ng),
    開始時間: val('startTime'),
    結束時間: val('endTime'),
    實際工時: val('workingHours'),
    實際工時分鐘: work.net,
    正常工時分鐘: work.normal,
    加班工時分鐘: work.overtime,
    休息扣除分鐘: work.breakMin,
    不良行清單: defects,
    異常類型: val('anomalyType'),
    異常開始時間: val('anomalyStart'),
    異常結束時間: val('anomalyEnd'),
    異常工時: val('anomalyDuration'),
    備註: val('remarks'),
    現場照片清單: STATE.photos.map(p => ({ 檔案名稱: p.name, MIME類型: p.type, Base64: clean(p.base64).split(',')[1] || '', 備註: p.note || '', 來源: p.source }))
  };
}
function formatDate(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function validateReport(d) { if (!d.工號) return '缺少作業員'; if (!d.產品編號) return '缺少產品'; if (!d.報工工站名稱) return '缺少報工工站'; if (d.今日共做數 <= 0) return '今日共做數必須大於 0'; if (d.不良數 > d.今日共做數) return '不良數不可大於共做數'; return validateDefectAllocation(); }

function updatePreview() {
  const p = g('reportPreview');
  const c = g('confirmPreview');
  const d = buildReportData();
  const text = `📋 報工預覽 / Production Report Preview\n━━━━━━━━━━━━━━━━━━━━\n👤 作業員：${d.姓名 || '—'} / ${d.工號 || '—'}｜${d.班別 || '—'}\n📦 產品：${d.產品編號 || '—'}｜${d.品名 || '—'}\n🔧 工站：${d.報工工站名稱 || '—'}｜工序：${d.工序範圍 || '—'}\n🖥 機台：${d.主機台 || '—'}\n📊 共做：${d.今日共做數}｜不良：${d.不良數}｜良品：${d.實際良品數}\n🕐 工時：${d.實際工時 || '—'}｜加班：${d.加班工時分鐘 || 0} 分\n🔍 不良：${(d.不良行清單 || []).map(x => x.代碼 + ' ' + x.名稱 + ' x ' + x.數量).join('；') || '無'}\n📝 備註：${d.備註 || '無'}`;
  if (p) p.textContent = text;
  if (c) c.textContent = text;
}

function updateConfirmSummary() {
  const box = g('confirmSummaryContent');
  if (!box) return;
  const d = buildReportData();
  if (!d.工號 && !d.產品編號) { box.innerHTML = '<div class="caption" style="text-align:center;padding:14px;">請先完成前面步驟再回來確認</div>'; return; }
  const rows = [['👤 作業員', `${d.姓名 || '—'} / ${d.工號 || '—'}`], ['📦 產品', `${d.產品編號 || '—'}｜${d.品名 || '—'}`], ['🔧 工站', d.報工工站名稱 || '—'], ['📊 共做', d.今日共做數 + ' pcs'], ['✅ 良品', d.實際良品數 + ' pcs'], ['❌ 不良', d.不良數 + ' pcs'], ['🕐 工時', d.實際工時 || '—'], ['⏱ 加班', (d.加班工時分鐘 || 0) + ' 分']];
  box.innerHTML = rows.map(r => `<div class="confirm-row"><span class="confirm-label">${safeTxt(r[0])}</span><span class="confirm-value">${safeTxt(r[1])}</span></div>`).join('');
}

function goNextOrSubmit() {
  const err = validateCurrentStep();
  if (err) { roar('⚠️', '資料未完成 / Incomplete', err, 'warning'); return; }
  markStepDone();
  if (STATE.currentStep < 4) switchStep(STATE.currentStep + 1);
  else submitReport();
}

async function submitReport() {
  const data = buildReportData();
  const err = validateReport(data);
  if (err) { roar('⚠️', '報工驗證失敗 / Validation Failed', err, 'warning'); return; }
  if (!confirm('確認送出報工？\n\n' + data.姓名 + '｜' + data.產品編號 + '\n良品：' + data.實際良品數 + '｜不良：' + data.不良數)) return;
  try {
    showSubmitOverlay(true);
    const res = await window.V4Bridge.submitReport(data);
    showSubmitOverlay(false);
    if (res && (res.成功 || res.success || res.ok || res.報工編號 || res.reportId)) {
      roar('✅', '報工完成 / Submitted', res.報工編號 || res.reportId || '已寫入', 'success');
      resetAfterSubmit();
    } else {
      roar('❌', '報工失敗 / Submit Failed', (res && (res.訊息 || res.message)) || '未知錯誤', 'error');
    }
  } catch (e) { showSubmitOverlay(false); roar('❌', '報工失敗 / Submit Failed', e.message || String(e), 'error'); }
}

function resetAfterSubmit() {
  STATE.operator = null; STATE.productGroupList = []; STATE.currentProductKey = ''; STATE.currentProductGroup = null; STATE.currentWorkstation = null; STATE.currentMachineId = ''; STATE.photos = []; STATE.defectRows = []; STATE.stepDone = [false,false,false,false,false];
  ['personName','personId','productCode','productName','totalQty','ngQty','remarks','workingHours','startTime','endTime','anomalyStart','anomalyEnd','anomalyDuration','processRange','stdCapacity','stdTimeSec'].forEach(id => setVal(id, ''));
  const emp = g('empIdHighlight'); if (emp) emp.textContent = '未輸入 / Not Set';
  const area = g('selectedProductArea'); if (area) area.classList.add('hidden');
  clearWorkstationFields(); renderPhotoGrid(); addDefectRow(); buildPersonGrid(); buildProductGrid(); hideSelectedPersonCard(); setDefaultTimes(true); calcQty(); switchStep(0);
}

function showLoading(on) { const el = g('loadingScreen'); if (el) el.classList.toggle('hidden', !on); }
function showSubmitOverlay(on) { const el = g('submitOverlay'); if (el) el.classList.toggle('hidden', !on); }
function toast(msg) { const t = g('toast'); if (!t) return; t.textContent = msg; t.classList.remove('hidden'); clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.add('hidden'), 2400); }
function roar(icon, title, sub, type) { const c = g('roarContainer'); if (!c) { toast(title + ' ' + (sub || '')); return; } const div = document.createElement('div'); div.className = 'roar-notif ' + (type || ''); div.innerHTML = `<div class="roar-icon">${icon || 'ℹ️'}</div><div class="roar-text"><div class="roar-title">${safeTxt(title)}</div><div class="roar-sub">${safeTxt(sub || '')}</div></div><button class="roar-close" type="button">✕</button>`; div.querySelector('button').onclick = () => div.remove(); c.appendChild(div); setTimeout(() => div.remove(), 4200); }

function updateTopbarTime() {
  let el = g('work-date-display'); const status = g('statusPill'); if (!el && status) { el = document.createElement('div'); el.id = 'work-date-display'; el.style.cssText = 'margin-top:6px;font-size:11px;font-weight:900;color:rgba(255,255,255,.95);'; status.insertAdjacentElement('afterend', el); }
  if (!el) return; const now = new Date(); const label = STATE.operator ? inferShift(val('shiftSelect')) : '未選班別'; el.textContent = `${label}｜${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}｜作業日 ${formatDate(workDateBase())}`;
}
function startTopbarClock() { clearInterval(topbarTimer); updateTopbarTime(); topbarTimer = setInterval(updateTopbarTime, 1000); }

function listenScannerGun() { document.addEventListener('keydown', e => { if (e.key === 'Enter') { const code = scanBuffer.trim(); scanBuffer = ''; if (code) handleScanCode(code); return; } if (e.key.length === 1) { scanBuffer += e.key; clearTimeout(scanTimer); scanTimer = setTimeout(() => scanBuffer = '', 120); } }); }
function handleScanCode(code) { const pi = DB.persons.findIndex(p => clean(p.工號) === code || clean(p.姓名) === code); if (pi >= 0) { selectPerson(pi); return; } const prod = DB.productList.find(x => clean(x.產品編號) === code || clean(x.客戶品號) === code); if (prod) selectProduct(DB.productList.indexOf(prod)); else roar('⚠️', '掃描無資料', code, 'warning'); }

function openPersonScan() { const m = g('personScanModal'); if (m) m.classList.remove('hidden'); const inp = g('personManualInput'); if (inp) { inp.classList.remove('hidden'); setTimeout(() => inp.focus(), 50); } }
function closePersonScan() { const m = g('personScanModal'); if (m) m.classList.add('hidden'); }
function togglePersonManual() { const inp = g('personManualInput'); if (inp) { inp.classList.toggle('hidden'); if (!inp.classList.contains('hidden')) inp.focus(); } }
function personManualConfirm(e) { if (e.key === 'Enter') { const code = clean(e.target.value); const idx = DB.persons.findIndex(p => clean(p.工號) === code || clean(p.姓名) === code); if (idx >= 0) { closePersonScan(); selectPerson(idx); } else roar('⚠️', '找不到人員', code, 'warning'); } }
function openProductScan() { const m = g('productScanModal'); if (m) m.classList.remove('hidden'); const inp = g('productManualInput'); if (inp) { inp.classList.remove('hidden'); setTimeout(() => inp.focus(), 50); } }
function closeProductScan() { const m = g('productScanModal'); if (m) m.classList.add('hidden'); }
function toggleProductManual() { const inp = g('productManualInput'); if (inp) { inp.classList.toggle('hidden'); if (!inp.classList.contains('hidden')) inp.focus(); } }
function productManualConfirm(e) { if (e.key === 'Enter') { const code = clean(e.target.value); const prod = DB.productList.find(x => clean(x.產品編號) === code || clean(x.客戶品號) === code || clean(x.品名) === code); if (prod) { closeProductScan(); selectProduct(DB.productList.indexOf(prod)); } else roar('⚠️', '找不到產品', code, 'warning'); } }
function toggleFullscreen() { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); else if (document.exitFullscreen) document.exitFullscreen().catch(() => {}); }
function listenFullscreenChange() {}

window.reloadData = reloadData;
window.filterPersons = filterPersons;
window.selectPerson = selectPerson;
window.filterProducts = filterProducts;
window.selectProduct = selectProduct;
window.onWorkstationChange = onWorkstationChange;
window.selectMachine = selectMachine;
window.addDefectRow = addDefectRow;
window.deleteDefectRow = deleteDefectRow;
window.onDefectReasonChange = onDefectReasonChange;
window.onDefectQtyChange = onDefectQtyChange;
window.calcQty = calcQty;
window.calcWorkingHours = calcWorkingHours;
window.calcAnomalyTime = calcAnomalyTime;
window.triggerCamera = triggerCamera;
window.triggerFileSelect = triggerFileSelect;
window.onPhotoChange = onPhotoChange;
window.clearAllPhotos = clearAllPhotos;
window.openPhotoNote = openPhotoNote;
window.closePhotoNote = closePhotoNote;
window.savePhotoNote = savePhotoNote;
window.deletePhoto = deletePhoto;
window.jumpToStep = jumpToStep;
window.goBack = goBack;
window.goNextOrSubmit = goNextOrSubmit;
window.submitReport = submitReport;
window.resetAfterSubmit = resetAfterSubmit;
window.openPersonScan = openPersonScan;
window.closePersonScan = closePersonScan;
window.togglePersonManual = togglePersonManual;
window.personManualConfirm = personManualConfirm;
window.openProductScan = openProductScan;
window.closeProductScan = closeProductScan;
window.toggleProductManual = toggleProductManual;
window.productManualConfirm = productManualConfirm;
window.toggleFullscreen = toggleFullscreen;
window.setDefaultTimes = setDefaultTimes;
window.buildReportData = buildReportData;
