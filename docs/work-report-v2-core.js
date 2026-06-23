(function(){
  'use strict';

  /**
   * work-report-v2-core.js
   * 製造部報工作業核心穩定版 v2.1.9
   *
   * 本次正式修正：
   * 1. 恢復下拉卡片式樣式：本檔會主動載入 work-report-v2-ui.css。
   * 2. 機台照片若舊核心沒有渲染，本檔會依目前工站主機台自行渲染。
   * 3. 機台照片必須依目前選定工站過濾，不再混入同產品其他工站機台。
   * 4. M/C加工｜OP110｜489 → 只顯示 489。
   * 5. 清洗+目視｜OP130｜77 → 只顯示 77。
   * 6. 不改 09_報工、不改 20_今日派班回寫、不改 10_工單主檔扣帳。
   */

  var 正式版號 = '219';
  var 遠端穩定核心 = 'https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@eb33ca85a8bca1746614659b41596d3b9a9f8bf8/docs/work-report-v2-core.js';
  var 已載入遠端核心 = false;
  var 已安裝工站機台修正 = false;
  var 上次工站機台簽章 = '';

  function $(id){ return document.getElementById(id); }

  function 寫HTML(el, html){
    if(el && el.innerHTML !== html) el.innerHTML = html;
  }

  function 文字(value){
    return String(value == null ? '' : value).trim();
  }

  function 安全文字(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function 正規機台碼(value){
    return 文字(value).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }

  function 載入正式樣式_(){
    if(document.getElementById('報工正式樣式')) return;
    var l = document.createElement('link');
    l.id = '報工正式樣式';
    l.rel = 'stylesheet';
    l.href = './work-report-v2-ui.css?v=' + 正式版號;
    document.head.appendChild(l);
  }

  function 取欄(row, keys){
    if(!row) return '';
    for(var i=0;i<keys.length;i++){
      var k = keys[i];
      if(row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return row[k];
    }
    return '';
  }

  function 正規化圖片網址(value){
    var raw = String(value || '').trim();
    if(!raw) return '';
    raw = raw.replace(/^=IMAGE\(/i,'').replace(/^image\(/i,'').replace(/[()"']/g,'').trim();
    var hit = raw.match(/https?:\/\/[^\s,，;；]+/i);
    if(hit) raw = hit[0];
    if(raw.indexOf('data:image/') === 0) return raw;
    var id = raw.match(/[-\w]{25,}/);
    if(id) return 'https://drive.google.com/thumbnail?id=' + id[0] + '&sz=w900';
    return raw;
  }

  function 取機台編號(m){
    return String(取欄(m, ['機台編號','機台代號','設備編號','主機台','編號','代號','id','ID']) || m || '').trim();
  }

  function 取機台名稱(m){
    return String(取欄(m, ['機台名稱','設備名稱','名稱']) || 取機台編號(m) || '').trim();
  }

  function 取機台照片(m){
    return 正規化圖片網址(取欄(m, ['照片','機台照片','機台照片網址','照片網址','縮圖網址','圖片網址','機台圖片','設備照片','設備圖片','機台照片檔案ID','Google檔案ID','照片檔案ID','檔案ID']));
  }

  function 取目前工站下拉文字_(){
    var sel = $('工站選擇');
    if(!sel || sel.selectedIndex < 0) return '';
    return 文字(sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].textContent || '');
  }

  function 取目前工站值_(){
    var sel = $('工站選擇');
    if(!sel) return '';
    return 文字(sel.value || '');
  }

  function 由文字抽機台碼_(text){
    text = 文字(text);
    if(!text) return [];

    var parts = text.split(/[|｜]/).map(function(x){ return 文字(x); }).filter(Boolean);
    var tail = parts.length ? parts[parts.length - 1] : text;
    var tokens = tail.split(/[、,，;；\s]+/).map(function(x){ return 文字(x); }).filter(Boolean);
    var ids = tokens.filter(function(x){ return /^\d{2,5}$/.test(x) || /^[A-Z]*\d{2,5}[A-Z]*$/i.test(x); });

    if(!ids.length){
      var all = text.match(/\b(?!OP\d{2,4}\b)[A-Z]*\d{2,5}[A-Z]*\b/ig) || [];
      ids = all.filter(function(x){ return !/^OP\d+/i.test(x); });
    }

    return ids.map(function(x){ return 文字(x); }).filter(Boolean).filter(function(x, i, a){ return a.indexOf(x) === i; });
  }

  function 取目前工站指定機台_(){
    var label = 取目前工站下拉文字_();
    var value = 取目前工站值_();
    var ids = 由文字抽機台碼_(label);
    if(!ids.length) ids = 由文字抽機台碼_(value);
    return ids;
  }

  function 找主檔機台_(id, state){
    var list = Array.isArray(state && state.機台) ? state.機台 : [];
    var clean = String(id || '').trim();
    var compact = 正規機台碼(clean);
    if(!clean) return null;
    return list.find(function(m){
      return [m.機台編號, m.機台代號, m.設備編號, m.主機台, m.編號, m.代號, m.id, m.ID].some(function(v){
        return 正規機台碼(v) === compact;
      });
    }) || null;
  }

  function 取選定工站物件_(state){
    var station = state && state.選定工站 || null;
    var sel = $('工站選擇');
    if(station) return station;
    if(!sel || !Array.isArray(state && state.工站群組)) return null;

    var val = 文字(sel.value || '');
    var label = 取目前工站下拉文字_();

    if(val){
      station = state.工站群組.find(function(g){
        var key = [g.產品編號, g.客戶品號, g.品名, g.工站名稱, g.工序, g.主機台].map(function(v){ return 文字(v); }).join('|');
        return key === val;
      }) || null;
      if(station) return station;
    }

    station = state.工站群組.find(function(g){
      return label.indexOf(文字(g.工站名稱 || '')) >= 0 && (!g.主機台 || label.indexOf(String(g.主機台)) >= 0);
    }) || null;

    return station;
  }

  function 建立機台列_(id, state){
    var found = 找主檔機台_(id, state) || {};
    var name = 取機台名稱(found) || id;
    var photo = 取機台照片(found);
    return { 機台編號: id, 機台名稱: name, 照片: photo };
  }

  function 從工站建立機台列_(state){
    var station = 取選定工站物件_(state) || {};
    var ids = 取目前工站指定機台_();

    if(!ids.length && Array.isArray(station.機台清單)){
      ids = station.機台清單.map(function(m){ return 取機台編號(m); }).filter(Boolean);
    }

    if(!ids.length){
      ['主機台','機台編號','機台代號','設備編號','機台清單','機台編號清單'].forEach(function(k){
        var v = station[k];
        if(typeof v === 'string') ids = ids.concat(v.split(/[、,，;；\s]+/));
        else if(v !== undefined && v !== null && !Array.isArray(v)) ids.push(String(v));
      });
    }

    ids = ids.map(function(x){ return 文字(x); }).filter(Boolean).filter(function(x, i, a){ return a.indexOf(x) === i; });
    return ids.map(function(id){ return 建立機台列_(id, state); });
  }

  function 渲染目前工站機台照片_(force){
    var box = $('機台清單');
    var sel = $('工站選擇');
    if(!box || !sel) return;

    var state = window.智慧製造報工狀態 || {};
    var rows = 從工站建立機台列_(state);
    if(!rows.length) return;

    var signature = rows.map(function(m){ return [m.機台編號, m.機台名稱, m.照片].join('|'); }).join('||') + '::' + 取目前工站下拉文字_();
    if(!force && signature === 上次工站機台簽章 && box.dataset.stationMachineRender === signature && box.querySelector('.機台卡')) return;

    var html = rows.map(function(m){
      var id = 安全文字(m.機台編號 || '');
      var name = 安全文字(m.機台名稱 || m.機台編號 || '');
      var photo = m.照片;
      var image = photo
        ? '<img src="' + 安全文字(photo) + '" alt="' + id + '" loading="eager" referrerpolicy="no-referrer" decoding="async" onerror="this.outerHTML=\'<div class=\\\'無圖\\\'>照片載入失敗 / Photo load failed<br>' + id + '</div>\';">'
        : '<div class="無圖">無機圖 / No Photo<br>' + id + '</div>';
      return '<div class="機台卡" data-station-match="是">' + image + '<div class="機台號">' + id + '</div><div class="小字">' + name + '</div></div>';
    }).join('');

    寫HTML(box, html);
    box.dataset.stationMachineRender = signature;
    上次工站機台簽章 = signature;
    box.style.setProperty('display', 'grid', 'important');
    box.style.setProperty('visibility', 'visible', 'important');
    box.style.setProperty('opacity', '1', 'important');

    window.智慧製造機台照片狀態 = {
      版本: 'v2.1.9_下拉卡片與機台照片恢復版',
      修復來源: '直接依目前工站主機台渲染',
      工站: 取目前工站下拉文字_(),
      顯示機台: rows.map(function(m){ return m.機台編號; }),
      有照片數: rows.filter(function(m){ return !!m.照片; }).length
    };
  }

  function 修正下拉卡片樣式_(){
    載入正式樣式_();
    var productList = $('產品列表');
    if(productList && document.body.classList.contains('產品下拉展開')){
      productList.style.setProperty('display', 'grid', 'important');
      productList.style.setProperty('height', 'auto', 'important');
      productList.style.setProperty('max-height', 'none', 'important');
      productList.style.setProperty('overflow', 'visible', 'important');
    }
  }

  function 安裝工站機台照片修正_(){
    if(已安裝工站機台修正) return;
    已安裝工站機台修正 = true;
    載入正式樣式_();

    function later(force){
      setTimeout(function(){ 修正下拉卡片樣式_(); 渲染目前工站機台照片_(!!force); }, 80);
      setTimeout(function(){ 修正下拉卡片樣式_(); 渲染目前工站機台照片_(!!force); }, 260);
      setTimeout(function(){ 修正下拉卡片樣式_(); 渲染目前工站機台照片_(!!force); }, 700);
      setTimeout(function(){ 修正下拉卡片樣式_(); 渲染目前工站機台照片_(!!force); }, 1400);
    }

    document.addEventListener('change', function(e){
      if(e.target && e.target.id === '工站選擇') later(true);
    }, true);

    document.addEventListener('click', function(e){
      if(e.target && e.target.closest && e.target.closest('.產品卡片')) later(true);
      if(e.target && e.target.closest && e.target.closest('#工站選擇')) later(true);
      if(e.target && e.target.closest && e.target.closest('#產品下拉控制,#產品下拉按鈕')) later(false);
    }, true);

    var box = $('機台清單');
    if(box){
      new MutationObserver(function(){ later(false); }).observe(box, {childList:true, subtree:true});
    }

    setInterval(function(){ 修正下拉卡片樣式_(); 渲染目前工站機台照片_(false); }, 1500);
    later(true);
  }

  function 載入遠端穩定核心_(){
    if(已載入遠端核心) return;
    已載入遠端核心 = true;

    var s = document.createElement('script');
    s.src = 遠端穩定核心 + '?v=' + Date.now();
    s.async = false;
    s.onload = function(){
      var ev = document.createEvent('Event');
      ev.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(ev);
      安裝工站機台照片修正_();
      setTimeout(安裝工站機台照片修正_, 300);
      setTimeout(function(){ 渲染目前工站機台照片_(true); }, 1000);
      setTimeout(function(){ 渲染目前工站機台照片_(true); }, 2200);
    };
    s.onerror = function(){
      安裝工站機台照片修正_();
      setTimeout(function(){ 渲染目前工站機台照片_(true); }, 1000);
    };
    document.head.appendChild(s);
  }

  載入正式樣式_();

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      載入遠端穩定核心_();
      安裝工站機台照片修正_();
    });
  }else{
    載入遠端穩定核心_();
    安裝工站機台照片修正_();
  }
})();
