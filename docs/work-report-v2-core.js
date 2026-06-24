(function(){
  'use strict';

  /**
   * work-report-v2-core.js
   * 製造部報工作業外掛核心 v2.2.5
   *
   * 正式修正：
   * 1. 未選擇人員前，不得隱藏人員卡。
   * 2. 未選擇產品前，不得隱藏產品卡。
   * 3. 選擇後才只保留選定卡。
   * 4. 搜尋框輸入、清空、切分頁、重整時恢復可選清單。
   * 5. 保留 pinned v2.1.7 穩定報工主流程，不修改09_報工、20_今日派班、10_工單扣帳。
   */

  var 正式版號 = '225';
  var 穩定核心 = 'https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@eb33ca85a8bca1746614659b41596d3b9a9f8bf8/docs/work-report-v2-core.js';
  var 已載入穩定核心 = false;
  var 已安裝外掛 = false;
  var 上次機台簽章 = '';
  var 已選人員 = false;
  var 已選產品 = false;

  var 產品照片索引 = {
    'A503203008':'https://drive.google.com/thumbnail?id=1I6O1zGcDkqxGo4lP65OI0o4GnlXBV9_B&sz=w900',
    'A401800000':'https://drive.google.com/thumbnail?id=12JgM6j8_KipUKdz_nhXIV_rbfYJ21hCC&sz=w900',
    'A402301020':'https://drive.google.com/thumbnail?id=1ZEqwxEZmZuu5ZNv-pCvO_8nf7mM0tMjw&sz=w900',
    'A402300020':'https://drive.google.com/thumbnail?id=1l0BaMP7WyiEi9s1XjyzaZHJTXFd2KVJ5&sz=w900',
    'Z907403008':'https://drive.google.com/thumbnail?id=1je6tB0_pnYDxxoXaawlt_1U-H4_tkJai&sz=w900',
    'Z907500010':'https://drive.google.com/thumbnail?id=17rcFPqGjO0WN1m4SrFddMoeXuMqLZiS9&sz=w900',
    'Z916300000':'https://drive.google.com/thumbnail?id=1N_LadssPxVwlUqJ7TLMosSvUbsDuxR0O&sz=w900',
    'Z005300000':'https://drive.google.com/thumbnail?id=1H1HaUy0gDyW6Cv7oyp4z0xuBgI452Yqq&sz=w900',
    'Z004400000':'https://drive.google.com/thumbnail?id=1anfvWzMKyBiBnIYpJEm4XIzYJ3S1IHBm&sz=w900'
  };

  var 機台照片索引 = {
    '77':'https://drive.google.com/thumbnail?id=1Q6V44wBAFkXcUXbfX2Xk-6g5lPmSgf0F&sz=w900',
    '1072':'https://drive.google.com/thumbnail?id=1tswECGJpdkfjHzHfaXy79bBGhMEDrLZB&sz=w900',
    '390':'https://drive.google.com/thumbnail?id=1fbQZs1DCfLNz64ENo_TwOKndpTdg1o9k&sz=w900',
    '4':'https://drive.google.com/thumbnail?id=1rh0YulvyD_YnDMdh6EZT3tpFxfT-r5Dz&sz=w900',
    '397':'https://drive.google.com/thumbnail?id=1VVjF1PZ6XOIBeTiLLRWa6eJTB1VNagFT&sz=w900',
    '424':'https://drive.google.com/thumbnail?id=1d4onFkHXAKSBGoZlx-dwbREgvl0D4cJF&sz=w900',
    '1061':'https://drive.google.com/thumbnail?id=1fwkelwLkr4ogG0wbbBzutBkIIvMT0Fy6&sz=w900',
    '129':'https://drive.google.com/thumbnail?id=1r7gX_ZBKSAigsnBC1nJ648mzm2eIArZB&sz=w900',
    '447':'https://drive.google.com/thumbnail?id=13Eq4rl5V8jgO1wKCLr1EsDt3qnu49mlN&sz=w900',
    '7':'https://drive.google.com/thumbnail?id=1nDKK1sePd1FMPWK40vNXyiJxs-y_66pE&sz=w900',
    '334':'https://drive.google.com/thumbnail?id=1AVgs69xyXSLuWPM29g9fKSMcQDRomchL&sz=w900',
    '1071':'https://drive.google.com/thumbnail?id=1rknzLeQ69kfKRIjShWMWm-V7VSQ26CQW&sz=w900',
    '387':'https://drive.google.com/thumbnail?id=1YGs9Z3k2LCVJ1sEdNVTr27r2YpXm69NY&sz=w900',
    '204':'https://drive.google.com/thumbnail?id=1DApcuqdreyehEEHsAJaB45Qp8aPrRD69&sz=w900'
  };

  function $(id){ return document.getElementById(id); }
  function $$(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function 文字(v){ return v == null ? '' : String(v).trim(); }
  function 安全文字(v){ return 文字(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function 正規碼(v){ return 文字(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }

  function 注入安全樣式(){
    if(document.getElementById('報工安全卡片樣式225')) return;
    var css = document.createElement('style');
    css.id = '報工安全卡片樣式225';
    css.textContent = [
      '#人員列表,#產品列表{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;height:auto!important;min-height:120px!important;max-height:58vh!important;overflow:auto!important;opacity:1!important;visibility:visible!important}',
      '#人員列表[data-only-selected="是"],#產品列表[data-only-selected="是"]{max-height:170px!important;overflow:visible!important}',
      '#人員列表[data-only-selected="是"] .人員卡片:not([data-keep-selected="是"]),#產品列表[data-only-selected="是"] .產品卡片:not([data-keep-selected="是"]){display:none!important}',
      '#人員列表[data-only-selected="否"] .人員卡片,#產品列表[data-only-selected="否"] .產品卡片{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}',
      '.人員卡片{width:100%!important;height:auto!important;min-height:104px!important;max-height:128px!important;display:grid!important;grid-template-columns:82px 1fr!important;gap:10px!important;overflow:hidden!important;transform:none!important;position:relative!important}',
      '.人員卡片 .頭像圈,.人員卡片 .頭像圈 img,.人員卡片 img{width:82px!important;height:82px!important;max-width:82px!important;max-height:82px!important;object-fit:cover!important;border-radius:16px!important;position:static!important;transform:none!important}',
      '.人員卡片 .人名{font-size:20px!important;position:static!important;text-align:left!important;line-height:1.2!important;white-space:normal!important}.人員卡片 .人工號{position:static!important;transform:none!important;font-size:14px!important;width:max-content!important}',
      '.產品卡片{width:100%!important;min-height:112px!important;max-height:142px!important;display:grid!important;grid-template-columns:96px 1fr!important;gap:12px!important;overflow:hidden!important}',
      '.產品圖,.產品圖 img,.產品卡片 img{width:96px!important;height:96px!important;max-width:96px!important;max-height:96px!important;object-fit:cover!important;border-radius:16px!important}',
      '#工站固定區 #機台清單{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;max-height:none!important;overflow:visible!important}',
      '.機台卡 img,.機台卡 .無圖{height:118px!important;max-height:118px!important;object-fit:cover!important;border-radius:14px!important}'
    ].join('\n');
    document.head.appendChild(css);
  }

  function 設全部可選(type){
    var list = type === '人員' ? $('人員列表') : $('產品列表');
    var selector = type === '人員' ? '.人員卡片' : '.產品卡片';
    if(!list) return;
    list.dataset.onlySelected = '否';
    $$(selector).forEach(function(card){
      card.dataset.keepSelected = '';
      card.style.setProperty('display','grid','important');
      card.style.setProperty('visibility','visible','important');
      card.style.setProperty('opacity','1','important');
      card.style.setProperty('pointer-events','auto','important');
    });
    if(type === '人員') 已選人員 = false;
    if(type === '產品') 已選產品 = false;
  }

  function 收斂選定(type, card){
    if(!card) return;
    var list = type === '人員' ? $('人員列表') : $('產品列表');
    var selector = type === '人員' ? '.人員卡片' : '.產品卡片';
    if(!list) return;
    list.dataset.onlySelected = '是';
    $$(selector).forEach(function(c){
      var keep = c === card;
      c.dataset.keepSelected = keep ? '是' : '否';
      c.style.setProperty('display', keep ? 'grid' : 'none', 'important');
      c.style.setProperty('visibility', keep ? 'visible' : 'hidden', 'important');
      c.style.setProperty('opacity', keep ? '1' : '0', 'important');
      c.style.setProperty('pointer-events', keep ? 'auto' : 'none', 'important');
    });
    if(type === '人員') 已選人員 = true;
    if(type === '產品') 已選產品 = true;
  }

  function 套照片索引(){
    $$('.產品卡片').forEach(function(card){
      var txt = card.textContent || '';
      var key = Object.keys(產品照片索引).find(function(k){ return txt.indexOf(k) >= 0; });
      if(!key) return;
      var box = card.querySelector('.產品圖') || card.querySelector('div');
      if(box && !box.querySelector('img')) box.innerHTML = '<img src="' + 產品照片索引[key] + '" loading="eager" referrerpolicy="no-referrer">';
    });
  }

  function 目前工站文字(){
    var sel = $('工站選擇');
    return sel && sel.selectedIndex >= 0 ? 文字(sel.options[sel.selectedIndex].textContent) : '';
  }
  function 抽機台(text){
    var parts = 文字(text).split(/[|｜]/).map(文字).filter(Boolean);
    var tail = parts.length ? parts[parts.length - 1] : 文字(text);
    return tail.split(/[、,，;；\s]+/).map(文字).filter(function(x){ return /^\d{1,5}$/.test(x); }).slice(0,1);
  }
  function 渲染機台(force){
    var box = $('機台清單');
    var sel = $('工站選擇');
    if(!box || !sel) return;
    var ids = 抽機台(目前工站文字());
    if(!ids.length) ids = 抽機台(sel.value);
    if(!ids.length) return;
    var sig = ids.join('|') + 目前工站文字();
    if(!force && sig === 上次機台簽章) return;
    上次機台簽章 = sig;
    box.innerHTML = ids.map(function(id){
      var photo = 機台照片索引[正規碼(id)];
      var img = photo ? '<img src="' + photo + '" loading="eager" referrerpolicy="no-referrer">' : '<div class="無圖">機台照片尚未回填<br>' + 安全文字(id) + '</div>';
      var name = id === '489' ? '臥式綜合加工機｜HB-630 / 024977' : '機台' + id;
      return '<div class="機台卡">' + img + '<div class="機台號">' + 安全文字(id) + '</div><div class="小字">' + 安全文字(name) + '</div></div>';
    }).join('');
  }

  function 保證未選前顯示(){
    if(!已選人員) 設全部可選('人員');
    if(!已選產品) 設全部可選('產品');
  }

  function 週期(){
    注入安全樣式();
    保證未選前顯示();
    套照片索引();
    渲染機台(false);
    window.智慧製造報工外掛版本 = 'v2.2.5_未選前卡片可見版';
  }

  function 安裝外掛(){
    if(已安裝外掛) return;
    已安裝外掛 = true;
    注入安全樣式();
    document.addEventListener('click', function(e){
      var t = e.target;
      if(!t || !t.closest) return;
      var p = t.closest('.人員卡片');
      if(p){ setTimeout(function(){ 收斂選定('人員', p); }, 80); return; }
      var prod = t.closest('.產品卡片');
      if(prod){ setTimeout(function(){ 收斂選定('產品', prod); 渲染機台(true); }, 80); return; }
      if(t.closest('[data-tab="人員"],#搜尋人員')) setTimeout(function(){ 設全部可選('人員'); }, 80);
      if(t.closest('[data-tab="工件"],#搜尋工件')) setTimeout(function(){ 設全部可選('產品'); }, 80);
    }, true);
    document.addEventListener('input', function(e){
      if(e.target && e.target.id === '搜尋人員') 設全部可選('人員');
      if(e.target && e.target.id === '搜尋工件') 設全部可選('產品');
    }, true);
    document.addEventListener('change', function(e){ if(e.target && e.target.id === '工站選擇') setTimeout(function(){ 渲染機台(true); }, 80); }, true);
    [120,500,1000,1800,2800].forEach(function(ms){ setTimeout(週期, ms); });
    setInterval(週期, 1500);
  }

  function 載入穩定核心(){
    if(已載入穩定核心) return;
    已載入穩定核心 = true;
    var s = document.createElement('script');
    s.src = 穩定核心 + '?v=' + Date.now();
    s.async = false;
    s.onload = function(){
      var ev = document.createEvent('Event');
      ev.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(ev);
      setTimeout(安裝外掛, 80);
      setTimeout(週期, 600);
      setTimeout(週期, 1600);
    };
    s.onerror = function(){ 安裝外掛(); };
    document.head.appendChild(s);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ 載入穩定核心(); 安裝外掛(); });
  else { 載入穩定核心(); 安裝外掛(); }
})();
