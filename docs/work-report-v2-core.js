(function(){
  'use strict';

  /**
   * work-report-v2-core.js
   * 製造部報工作業外掛核心 v2.2.2
   *
   * 正式修正：
   * 1. 保留 v2.1.7 穩定報工核心，不改 09_報工 / 20_今日派班 / 10_工單主檔扣帳。
   * 2. 選完人員，只保留選定人員卡。
   * 3. 選完產品，只保留選定產品卡。
   * 4. 選完工站，只保留該工站主機台卡。
   * 5. 修正機台名稱 [object Object]。
   * 6. 若主庫沒有機台照片，明確顯示「機台照片尚未回填」，不再誤判為程式沒載到。
   */

  var 正式版號 = '222';
  var 穩定核心 = 'https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@eb33ca85a8bca1746614659b41596d3b9a9f8bf8/docs/work-report-v2-core.js';
  var 已載入穩定核心 = false;
  var 已安裝外掛 = false;
  var 上次機台簽章 = '';
  var 選定人員卡 = null;
  var 選定產品卡 = null;

  function $(id){ return document.getElementById(id); }

  function 安全文字(value){
    return 文字(value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function 文字(value){
    if(value === null || value === undefined) return '';
    if(typeof value === 'object'){
      var keys = ['文字','text','value','name','Name','名稱','機台名稱','設備名稱','機台編號','編號','id','ID','照片網址','照片','url','Url'];
      for(var i=0;i<keys.length;i++){
        if(value[keys[i]] !== undefined && value[keys[i]] !== null && typeof value[keys[i]] !== 'object'){
          var t = String(value[keys[i]]).trim();
          if(t) return t;
        }
      }
      return '';
    }
    return String(value).trim();
  }

  function 正規碼(value){ return 文字(value).replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }

  function 取欄(row, keys){
    if(!row) return '';
    for(var i=0;i<keys.length;i++){
      var v = row[keys[i]];
      var t = 文字(v);
      if(t) return t;
    }
    return '';
  }

  function 正規化圖片網址(value){
    var raw = 文字(value);
    if(!raw) return '';
    raw = raw.replace(/^=IMAGE\(/i,'').replace(/^image\(/i,'').replace(/[()"']/g,'').trim();
    var hit = raw.match(/https?:\/\/[^\s,，;；]+/i);
    if(hit) raw = hit[0];
    if(raw.indexOf('data:image/') === 0) return raw;
    var id = raw.match(/[-\w]{25,}/);
    if(id) return 'https://drive.google.com/thumbnail?id=' + id[0] + '&sz=w900';
    return raw;
  }

  function 載入樣式(){
    if(document.getElementById('報工正式樣式222')) return;
    var l = document.createElement('link');
    l.id = '報工正式樣式222';
    l.rel = 'stylesheet';
    l.href = './work-report-v2-ui.css?v=' + 正式版號;
    document.head.appendChild(l);
  }

  function 目前工站文字(){
    var sel = $('工站選擇');
    if(!sel || sel.selectedIndex < 0) return '';
    return 文字(sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].textContent || '');
  }

  function 抽機台碼(text){
    text = 文字(text);
    if(!text) return [];
    var parts = text.split(/[|｜]/).map(文字).filter(Boolean);
    var tail = parts.length ? parts[parts.length - 1] : text;
    var ids = tail.split(/[、,，;；\s]+/).map(文字).filter(function(x){ return /^\d{2,5}$/.test(x) || /^[A-Z]*\d{2,5}[A-Z]*$/i.test(x); });
    if(!ids.length){
      ids = (text.match(/\b(?!OP\d{2,4}\b)[A-Z]*\d{2,5}[A-Z]*\b/ig) || []).filter(function(x){ return !/^OP\d+/i.test(x); });
    }
    return ids.filter(function(x,i,a){ return x && a.indexOf(x) === i; });
  }

  function 目前工站機台碼(){
    var ids = 抽機台碼(目前工站文字());
    var sel = $('工站選擇');
    if(!ids.length && sel) ids = 抽機台碼(sel.value);
    return ids;
  }

  function 找選定工站(state){
    state = state || window.智慧製造報工狀態 || {};
    if(state.選定工站) return state.選定工站;
    var sel = $('工站選擇');
    var groups = Array.isArray(state.工站群組) ? state.工站群組 : [];
    if(!sel || !groups.length) return null;
    var val = 文字(sel.value);
    var label = 目前工站文字();
    return groups.find(function(g){
      var key = [g.產品編號,g.客戶品號,g.品名,g.工站名稱,g.工序,g.主機台].map(文字).join('|');
      return key === val;
    }) || groups.find(function(g){
      return label.indexOf(文字(g.工站名稱)) >= 0 && (!g.主機台 || label.indexOf(文字(g.主機台)) >= 0);
    }) || null;
  }

  function 找機台資料(id, state, station){
    state = state || window.智慧製造報工狀態 || {};
    station = station || 找選定工站(state) || {};
    var compact = 正規碼(id);
    var stationList = Array.isArray(station.機台清單) ? station.機台清單 : [];
    var all = stationList.concat(Array.isArray(state.機台) ? state.機台 : []);
    return all.find(function(m){
      return [m && m.機台編號, m && m.機台代號, m && m.設備編號, m && m.主機台, m && m.編號, m && m.代號, m && m.id, m && m.ID, m].some(function(v){ return 正規碼(v) === compact; });
    }) || {};
  }

  function 機台名稱(id, state, station){
    var m = 找機台資料(id, state, station);
    return 取欄(m, ['機台名稱','設備名稱','名稱']) || (id === '489' ? '臥式綜合加工機' : '') || id;
  }

  function 機台型號(id, state, station){
    var m = 找機台資料(id, state, station);
    return 取欄(m, ['機台型號','型式','型號','製造編號']) || (id === '489' ? 'HB-630 / 024977' : '');
  }

  function 機台照片(id, state, station){
    var m = 找機台資料(id, state, station);
    return 正規化圖片網址(取欄(m, ['照片','機台照片','機台照片網址','照片網址','縮圖網址','圖片網址','機台圖片','設備照片','設備圖片','機台照片檔案ID','Google檔案ID','照片檔案ID','Drive檔案ID','檔案ID']));
  }

  function 目前機台列(){
    var state = window.智慧製造報工狀態 || {};
    var station = 找選定工站(state) || {};
    var ids = 目前工站機台碼();
    if(!ids.length && Array.isArray(station.機台清單)){
      ids = station.機台清單.map(function(m){ return 取欄(m, ['機台編號','主機台','機台代號','設備編號']) || 文字(m); }).filter(Boolean);
    }
    ids = ids.filter(function(x,i,a){ return x && a.indexOf(x) === i; });
    return ids.map(function(id){ return { id:id, name:機台名稱(id,state,station), model:機台型號(id,state,station), photo:機台照片(id,state,station) }; });
  }

  function 渲染機台卡(force){
    var box = $('機台清單');
    if(!box || !$('工站選擇')) return;
    var rows = 目前機台列();
    if(!rows.length) return;
    var sig = rows.map(function(m){ return [m.id,m.name,m.model,m.photo].join('|'); }).join('||') + '::' + 目前工站文字();
    if(!force && sig === 上次機台簽章 && box.dataset.machineSig === sig) return;

    var html = rows.map(function(m){
      var image = m.photo
        ? '<img src="' + 安全文字(m.photo) + '" alt="' + 安全文字(m.id) + '" loading="eager" referrerpolicy="no-referrer" decoding="async" onerror="this.outerHTML=\'<div class=\\\'無圖\\\'>照片載入失敗<br>' + 安全文字(m.id) + '</div>\';">'
        : '<div class="無圖">機台照片尚未回填<br>' + 安全文字(m.id) + '</div>';
      return '<div class="機台卡" data-station-match="是">' + image + '<div class="機台號">' + 安全文字(m.id) + '</div><div class="小字">' + 安全文字(m.name) + (m.model ? '｜' + 安全文字(m.model) : '') + '</div></div>';
    }).join('');

    box.innerHTML = html;
    box.dataset.machineSig = sig;
    上次機台簽章 = sig;
    box.style.setProperty('display','grid','important');
    box.style.setProperty('visibility','visible','important');
    box.style.setProperty('opacity','1','important');

    window.智慧製造機台照片狀態 = {
      版本:'v2.2.2_機台名稱與照片未回填提示',
      工站:目前工站文字(),
      機台:rows,
      有照片數:rows.filter(function(m){ return !!m.photo; }).length
    };
  }

  function 卡片候選(box, selector){
    if(!box) return [];
    var cards = Array.prototype.slice.call(box.querySelectorAll(selector));
    if(cards.length) return cards;
    return Array.prototype.slice.call(box.children).filter(function(el){ return el && el.nodeType === 1 && !el.classList.contains('導航箭頭'); });
  }

  function 選定卡片(type, clicked){
    var box = type === '人員' ? $('人員列表') : $('產品列表');
    var selector = type === '人員' ? '.人員卡片' : '.產品卡片';
    var saved = type === '人員' ? 選定人員卡 : 選定產品卡;
    var cards = 卡片候選(box, selector);
    if(!box || !cards.length) return null;
    if(clicked && box.contains(clicked)){
      var hit = clicked.closest ? clicked.closest(selector) : null;
      if(hit && box.contains(hit)) return hit;
    }
    if(saved && box.contains(saved)) return saved;
    return cards.find(function(card){ return card.classList.contains('選中') || card.classList.contains('selected') || card.classList.contains('active') || card.dataset.selected === 'true' || card.getAttribute('aria-selected') === 'true'; }) || null;
  }

  function 收斂卡片(type, clicked){
    var box = type === '人員' ? $('人員列表') : $('產品列表');
    var selector = type === '人員' ? '.人員卡片' : '.產品卡片';
    if(!box) return;
    var cards = 卡片候選(box, selector);
    var selected = 選定卡片(type, clicked);
    if(!cards.length || !selected) return;
    if(type === '人員') 選定人員卡 = selected; else 選定產品卡 = selected;
    cards.forEach(function(card){
      var keep = card === selected;
      card.style.setProperty('display', keep ? 'grid' : 'none', 'important');
      card.style.setProperty('visibility', keep ? 'visible' : 'hidden', 'important');
      card.style.setProperty('opacity', keep ? '1' : '0', 'important');
      card.style.setProperty('pointer-events', keep ? 'auto' : 'none', 'important');
      card.dataset.keepSelected = keep ? '是' : '否';
    });
    box.style.setProperty('display','grid','important');
    box.style.setProperty('height','auto','important');
    box.style.setProperty('max-height','none','important');
    box.style.setProperty('overflow','visible','important');
  }

  function 展開卡片(type){
    var box = type === '人員' ? $('人員列表') : $('產品列表');
    var selector = type === '人員' ? '.人員卡片' : '.產品卡片';
    卡片候選(box, selector).forEach(function(card){
      card.style.setProperty('display','grid','important');
      card.style.setProperty('visibility','visible','important');
      card.style.setProperty('opacity','1','important');
      card.style.setProperty('pointer-events','auto','important');
    });
    if(type === '人員') 選定人員卡 = null; else 選定產品卡 = null;
  }

  function 安裝外掛(){
    if(已安裝外掛) return;
    已安裝外掛 = true;
    載入樣式();

    function later(force){
      setTimeout(function(){ 收斂卡片('人員'); 收斂卡片('產品'); 渲染機台卡(!!force); }, 100);
      setTimeout(function(){ 收斂卡片('人員'); 收斂卡片('產品'); 渲染機台卡(!!force); }, 350);
      setTimeout(function(){ 收斂卡片('人員'); 收斂卡片('產品'); 渲染機台卡(!!force); }, 900);
    }

    document.addEventListener('click', function(e){
      var t = e.target;
      if(!t || !t.closest) return;
      if(t.closest('#人員下拉控制,#人員下拉按鈕')) return 展開卡片('人員');
      if(t.closest('#產品下拉控制,#產品下拉按鈕')) return 展開卡片('產品');
      var pc = t.closest('.人員卡片');
      if(pc && $('人員列表') && $('人員列表').contains(pc)){ 收斂卡片('人員', pc); return later(false); }
      var pr = t.closest('.產品卡片');
      if(pr && $('產品列表') && $('產品列表').contains(pr)){ 收斂卡片('產品', pr); return later(true); }
      if(t.closest('#工站選擇')) later(true);
    }, true);

    document.addEventListener('change', function(e){
      if(e.target && e.target.id === '工站選擇') later(true);
    }, true);

    var machineBox = $('機台清單');
    if(machineBox) new MutationObserver(function(){ setTimeout(function(){ 渲染機台卡(false); }, 120); }).observe(machineBox, {childList:true, subtree:true});

    setInterval(function(){ 收斂卡片('人員'); 收斂卡片('產品'); 渲染機台卡(false); }, 1600);
    later(true);
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
      setTimeout(安裝外掛, 100);
      setTimeout(function(){ 渲染機台卡(true); }, 900);
      setTimeout(function(){ 渲染機台卡(true); }, 2200);
    };
    s.onerror = function(){ 安裝外掛(); };
    document.head.appendChild(s);
  }

  載入樣式();
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ 載入穩定核心(); 安裝外掛(); });
  }else{
    載入穩定核心();
    安裝外掛();
  }
})();
