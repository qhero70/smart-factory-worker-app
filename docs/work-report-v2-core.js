(function(){
  'use strict';

  /**
   * work-report-v2-core.js
   * 製造部報工作業外掛核心 v2.2.4
   *
   * 目的：
   * 1. 保留 pinned v2.1.7 穩定報工主流程，不修改寫入09_報工、20_今日派班、10_工單扣帳。
   * 2. 強制修正選人後人員照片過大。
   * 3. 強制回填產品照片、機台照片索引，避免前端狀態未帶入06_照片資料庫時無圖。
   * 4. 目前489無照片來源，仍顯示尚未回填；77已有照片來源，需顯示機台圖。
   */

  var 正式版號 = '224';
  var 穩定核心 = 'https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@eb33ca85a8bca1746614659b41596d3b9a9f8bf8/docs/work-report-v2-core.js';
  var 已載入穩定核心 = false;
  var 已安裝外掛 = false;
  var 上次機台簽章 = '';

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
  function 文字(v){
    if(v === null || v === undefined) return '';
    if(typeof v === 'object'){
      var keys = ['文字','text','value','name','Name','名稱','機台名稱','設備名稱','機台編號','編號','id','ID','照片網址','照片','url','Url'];
      for(var i=0;i<keys.length;i++){
        if(v[keys[i]] !== undefined && v[keys[i]] !== null && typeof v[keys[i]] !== 'object'){
          var t = String(v[keys[i]]).trim();
          if(t) return t;
        }
      }
      return '';
    }
    return String(v).trim();
  }
  function 安全文字(v){ return 文字(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function 正規碼(v){ return 文字(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }
  function 取欄(row, keys){
    if(!row) return '';
    for(var i=0;i<keys.length;i++){
      var t = 文字(row[keys[i]]);
      if(t) return t;
    }
    return '';
  }
  function 取照片網址(raw){
    raw = 文字(raw);
    if(!raw) return '';
    var hit = raw.match(/https?:\/\/[^\s,，;；]+/i);
    if(hit) raw = hit[0];
    var id = raw.match(/[-\w]{25,}/);
    if(id) return 'https://drive.google.com/thumbnail?id=' + id[0] + '&sz=w900';
    return raw;
  }
  function imgHTML(src, alt, empty){
    src = 取照片網址(src);
    if(!src) return '<div class="無圖">' + 安全文字(empty || '照片尚未回填') + '</div>';
    return '<img src="' + 安全文字(src) + '" alt="' + 安全文字(alt || '') + '" loading="eager" referrerpolicy="no-referrer" decoding="async" onerror="this.outerHTML=\'<div class=\\\'無圖\\\'>照片載入失敗</div>\';">';
  }

  function 注入強制樣式(){
    if(document.getElementById('報工強制修正樣式224')) return;
    var css = document.createElement('style');
    css.id = '報工強制修正樣式224';
    css.textContent = [
      '#人員列表{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;max-height:150px!important;overflow:visible!important}',
      '.人員卡片{width:100%!important;height:104px!important;min-height:104px!important;max-height:104px!important;padding:9px!important;display:grid!important;grid-template-columns:78px 1fr!important;grid-template-rows:1fr 1fr!important;gap:6px 10px!important;align-items:center!important;overflow:hidden!important;border-radius:18px!important;background:rgba(15,20,35,.86)!important;transform:none!important;position:relative!important}',
      '.人員卡片:not(.選中):not([data-keep-selected="是"]){display:none!important}',
      '.人員卡片 .頭像圈,.人員卡片 .頭像圈 img,.人員卡片 img{width:78px!important;height:78px!important;min-width:78px!important;max-width:78px!important;min-height:78px!important;max-height:78px!important;object-fit:cover!important;border-radius:14px!important;position:static!important;transform:none!important}',
      '.人員卡片 .人名{font-size:19px!important;line-height:1.2!important;position:static!important;text-align:left!important;white-space:normal!important;color:#fff!important}',
      '.人員卡片 .人工號{font-size:13px!important;position:static!important;transform:none!important;width:max-content!important}',
      '.人員卡片 .班標{position:absolute!important;right:8px!important;top:8px!important;font-size:12px!important}',
      '#選定人員資訊{max-height:120px!important;overflow:hidden!important}',
      '.選定人員卡{display:grid!important;grid-template-columns:78px 1fr!important;gap:10px!important;align-items:center!important;min-height:96px!important;max-height:110px!important;overflow:hidden!important}',
      '.選定人員照片,.選定人員照片 img,.選定人員卡 img{width:78px!important;height:78px!important;min-width:78px!important;max-width:78px!important;min-height:78px!important;max-height:78px!important;object-fit:cover!important;border-radius:14px!important;position:static!important;transform:none!important}',
      '.選定人員姓名{font-size:20px!important;line-height:1.2!important}.選定人員資料{font-size:13px!important;line-height:1.35!important}',
      '#產品列表{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;max-height:170px!important;overflow:visible!important}',
      '.產品卡片:not(.選中):not([data-keep-selected="是"]){display:none!important}',
      '.產品卡片{min-height:112px!important;max-height:132px!important;display:grid!important;grid-template-columns:94px 1fr!important;overflow:hidden!important}',
      '.產品圖,.產品圖 img,.產品卡片 img{width:94px!important;height:94px!important;min-width:94px!important;max-width:94px!important;min-height:94px!important;max-height:94px!important;object-fit:cover!important;border-radius:14px!important}',
      '.產品佔位,.無圖{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;color:#9fb0c2!important;background:rgba(255,255,255,.045)!important;border-radius:14px!important;font-size:13px!important;font-weight:900!important;line-height:1.35!important}',
      '#工站固定區 #機台清單{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;max-height:none!important;overflow:visible!important}',
      '.機台卡{min-height:164px!important;max-height:230px!important}.機台卡 img,.機台卡 .無圖{width:100%!important;height:118px!important;max-height:118px!important;object-fit:cover!important;border-radius:14px!important}'
    ].join('\n');
    document.head.appendChild(css);
  }

  function 同步照片索引(){
    var s = window.智慧製造報工狀態;
    if(!s) return;
    function setProduct(o){
      if(!o) return;
      var key1 = 正規碼(o.產品編號 || o.料號 || o.品號);
      var key2 = 正規碼(o.客戶品號 || o.客戶料號);
      var p = 產品照片索引[key1] || 產品照片索引[key2];
      if(p && !o.產品照片) o.產品照片 = p;
    }
    function setMachine(o){
      if(!o) return;
      var id = 正規碼(o.機台編號 || o.主機台 || o.設備編號 || o);
      var p = 機台照片索引[id];
      if(p) o.照片 = p;
    }
    (s.產品 || []).forEach(setProduct);
    (s.工站群組 || []).forEach(function(g){
      setProduct(g);
      (g.機台清單 || []).forEach(setMachine);
    });
    (s.機台 || []).forEach(setMachine);
  }

  function 目前工站文字(){
    var sel = $('工站選擇');
    if(!sel || sel.selectedIndex < 0) return '';
    return 文字(sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].textContent || '');
  }
  function 抽機台碼(text){
    text = 文字(text);
    var parts = text.split(/[|｜]/).map(文字).filter(Boolean);
    var tail = parts.length ? parts[parts.length - 1] : text;
    var ids = tail.split(/[、,，;；\s]+/).map(文字).filter(function(x){ return /^\d{1,5}$/.test(x); });
    return ids.filter(function(x,i,a){return x && a.indexOf(x)===i;});
  }
  function 找機台資料(id){
    var s = window.智慧製造報工狀態 || {};
    var compact = 正規碼(id);
    var all = [];
    (s.機台 || []).forEach(function(m){all.push(m);});
    (s.工站群組 || []).forEach(function(g){(g.機台清單 || []).forEach(function(m){all.push(m);});});
    return all.find(function(m){return 正規碼(m && (m.機台編號 || m.主機台 || m.設備編號 || m)) === compact;}) || {};
  }
  function 機台名稱(id){
    var m = 找機台資料(id);
    return 取欄(m,['機台名稱','設備名稱','名稱']) || (id === '489' ? '臥式綜合加工機' : '機台' + id);
  }
  function 機台型號(id){
    var m = 找機台資料(id);
    return 取欄(m,['機台型號','型式','型號','製造編號']) || (id === '489' ? 'HB-630 / 024977' : '');
  }
  function 機台照片(id){
    var m = 找機台資料(id);
    return 機台照片索引[正規碼(id)] || 取照片網址(取欄(m,['照片','機台照片','機台照片網址','照片網址','縮圖網址','圖片網址','機台照片檔案ID','Google檔案ID','Drive檔案ID']));
  }

  function 渲染機台卡(force){
    var box = $('機台清單');
    if(!box || !$('工站選擇')) return;
    var ids = 抽機台碼(目前工站文字());
    if(!ids.length) ids = 抽機台碼($('工站選擇').value);
    if(!ids.length) return;
    ids = ids.slice(0,1);
    var sig = ids.join('|') + ':' + 目前工站文字();
    if(!force && sig === 上次機台簽章) return;
    上次機台簽章 = sig;
    box.innerHTML = ids.map(function(id){
      var photo = 機台照片(id);
      var image = photo ? imgHTML(photo, id, '機台照片尚未回填<br>' + id) : '<div class="無圖">機台照片尚未回填<br>' + 安全文字(id) + '</div>';
      return '<div class="機台卡" data-station-match="是">' + image + '<div class="機台號">' + 安全文字(id) + '</div><div class="小字">' + 安全文字(機台名稱(id)) + (機台型號(id) ? '｜' + 安全文字(機台型號(id)) : '') + '</div></div>';
    }).join('');
    box.style.setProperty('display','grid','important');
  }

  function 強制修正人員小卡(){
    var selected = document.querySelector('.人員卡片.選中') || document.querySelector('.人員卡片[data-keep-selected="是"]');
    if(selected){
      $$('.人員卡片').forEach(function(card){
        var keep = card === selected;
        card.dataset.keepSelected = keep ? '是' : '否';
        card.style.setProperty('display', keep ? 'grid' : 'none', 'important');
      });
      var list = $('人員列表');
      if(list) list.style.setProperty('max-height','150px','important');
    }
    $$('.人員卡片,.選定人員卡').forEach(function(card){
      card.style.setProperty('max-height','110px','important');
      card.style.setProperty('overflow','hidden','important');
    });
    $$('.頭像圈,.選定人員照片').forEach(function(el){
      el.style.setProperty('width','78px','important');
      el.style.setProperty('height','78px','important');
      el.style.setProperty('min-width','78px','important');
      el.style.setProperty('max-width','78px','important');
      el.style.setProperty('min-height','78px','important');
      el.style.setProperty('max-height','78px','important');
      el.style.setProperty('overflow','hidden','important');
    });
    $$('.人員卡片 img,.選定人員卡 img,.頭像圈 img,.選定人員照片 img').forEach(function(img){
      img.style.setProperty('width','78px','important');
      img.style.setProperty('height','78px','important');
      img.style.setProperty('max-width','78px','important');
      img.style.setProperty('max-height','78px','important');
      img.style.setProperty('object-fit','cover','important');
    });
  }

  function 修正產品照片DOM(){
    $$('.產品卡片').forEach(function(card){
      var txt = card.textContent || '';
      var key = Object.keys(產品照片索引).find(function(k){ return txt.indexOf(k) >= 0; });
      if(!key) return;
      var box = card.querySelector('.產品圖') || card.querySelector('div');
      if(box && !box.querySelector('img')) box.innerHTML = imgHTML(產品照片索引[key], key, '產品照片尚未回填');
    });
  }

  function 週期修正(){
    注入強制樣式();
    同步照片索引();
    強制修正人員小卡();
    修正產品照片DOM();
    渲染機台卡(false);
  }

  function 安裝外掛(){
    if(已安裝外掛) return;
    已安裝外掛 = true;
    注入強制樣式();
    document.addEventListener('click', function(){ setTimeout(function(){ 渲染機台卡(true); 週期修正(); }, 80); setTimeout(週期修正, 450); }, true);
    document.addEventListener('change', function(e){ if(e.target && e.target.id === '工站選擇') setTimeout(function(){ 渲染機台卡(true); 週期修正(); }, 80); }, true);
    if(document.body) new MutationObserver(function(){ setTimeout(週期修正, 80); }).observe(document.body,{childList:true,subtree:true});
    [120,400,900,1600,2600].forEach(function(ms){ setTimeout(function(){ 渲染機台卡(true); 週期修正(); }, ms); });
    setInterval(週期修正, 1200);
    window.智慧製造報工外掛版本 = 'v2.2.4_強制小卡與照片索引版';
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
      setTimeout(週期修正, 700);
      setTimeout(function(){ 渲染機台卡(true); 週期修正(); }, 1600);
    };
    s.onerror = function(){ 安裝外掛(); };
    document.head.appendChild(s);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ 載入穩定核心(); 安裝外掛(); });
  }else{
    載入穩定核心();
    安裝外掛();
  }
})();
