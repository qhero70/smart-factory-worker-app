(function(){
  'use strict';

  /**
   * work-report-v2-core.js
   * 製造部報工作業核心穩定版 v2.1.8
   *
   * 本次正式修正：
   * 1. 機台照片必須依目前選定工站過濾。
   * 2. 不再把同產品其他工站機台混入目前工站。
   * 3. M/C加工｜OP110｜489 → 只顯示 489。
   * 4. 清洗+目視｜OP130｜77 → 只顯示 77。
   * 5. 保留原 v2.1.7 報工核心與送出邏輯，不改 09_報工、不改工單扣帳。
   */

  var 正式版號 = '218';
  var 遠端穩定核心 = 'https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@eb33ca85a8bca1746614659b41596d3b9a9f8bf8/docs/work-report-v2-core.js';
  var 已載入遠端核心 = false;
  var 已安裝工站機台修正 = false;
  var 上次工站機台簽章 = '';

  function $(id){ return document.getElementById(id); }

  function 安全文字(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function 文字(value){
    return String(value == null ? '' : value).trim();
  }

  function 正規機台碼(value){
    return 文字(value).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
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

    // 優先依 UI 目前格式：工站名稱｜OPxxx｜主機台
    var parts = text.split(/[|｜]/).map(function(x){ return 文字(x); }).filter(Boolean);
    var tail = parts.length ? parts[parts.length - 1] : text;

    // 最後一段若有多機台，以逗號、頓號、空白切開。
    var tokens = tail.split(/[、,，;；\s]+/).map(function(x){ return 文字(x); }).filter(Boolean);
    var ids = tokens.filter(function(x){ return /^\d{2,5}$/.test(x) || /^[A-Z]*\d{2,5}[A-Z]*$/i.test(x); });

    // 若最後一段抓不到，再掃整段，但排除 OP110 / OP130 這種工序碼。
    if(!ids.length){
      var all = text.match(/\b(?!OP\d{2,4}\b)[A-Z]*\d{2,5}[A-Z]*\b/ig) || [];
      ids = all.filter(function(x){ return !/^OP\d+/i.test(x); });
    }

    return ids.map(function(x){ return 文字(x); }).filter(Boolean).filter(function(x,i,a){ return a.indexOf(x) === i; });
  }

  function 取目前工站指定機台_(){
    var label = 取目前工站下拉文字_();
    var value = 取目前工站值_();
    var ids = 由文字抽機台碼_(label);
    if(!ids.length) ids = 由文字抽機台碼_(value);
    return ids;
  }

  function 取機台卡機台碼_(card){
    if(!card) return '';
    var idNode = card.querySelector('.機台號');
    var text = 文字(idNode ? idNode.textContent : card.textContent);
    var ids = 由文字抽機台碼_(text);
    return ids[0] || text;
  }

  function 套用工站機台照片過濾_(force){
    var box = $('機台清單');
    var sel = $('工站選擇');
    if(!box || !sel) return;

    var ids = 取目前工站指定機台_();
    if(!ids.length) return;

    var keySet = ids.map(正規機台碼).filter(Boolean);
    var signature = keySet.join('|') + '::' + 取目前工站下拉文字_();
    var cards = Array.prototype.slice.call(box.querySelectorAll('.機台卡'));

    if(!cards.length) return;
    if(!force && signature === 上次工站機台簽章 && box.dataset.stationMachineFilter === signature) return;

    cards.forEach(function(card){
      var id = 取機台卡機台碼_(card);
      var ok = keySet.indexOf(正規機台碼(id)) >= 0;
      card.style.setProperty('display', ok ? '' : 'none', 'important');
      card.dataset.stationMatch = ok ? '是' : '否';
    });

    var visible = cards.filter(function(card){ return card.dataset.stationMatch === '是'; });
    if(!visible.length){
      box.innerHTML = '<div class="機台卡"><div class="無圖">目前工站未找到對應機台照片<br>' + 安全文字(ids.join(', ')) + '</div><div class="機台號">' + 安全文字(ids[0]) + '</div><div class="小字">請確認 04_工站機台關聯 / 03_機台主檔</div></div>';
    }

    box.dataset.stationMachineFilter = signature;
    上次工站機台簽章 = signature;

    window.智慧製造機台照片狀態 = {
      版本: 'v2.1.8_工站機台照片一致版',
      修復來源: '依目前工站下拉主機台過濾',
      工站: 取目前工站下拉文字_(),
      允許機台: ids,
      顯示機台數: visible.length || 1
    };
  }

  function 安裝工站機台照片修正_(){
    if(已安裝工站機台修正) return;
    已安裝工站機台修正 = true;

    function later(force){
      setTimeout(function(){ 套用工站機台照片過濾_(!!force); }, 80);
      setTimeout(function(){ 套用工站機台照片過濾_(!!force); }, 260);
      setTimeout(function(){ 套用工站機台照片過濾_(!!force); }, 700);
    }

    document.addEventListener('change', function(e){
      if(e.target && e.target.id === '工站選擇') later(true);
    }, true);

    document.addEventListener('click', function(e){
      if(e.target && e.target.closest && e.target.closest('.產品卡片')) later(true);
      if(e.target && e.target.closest && e.target.closest('#工站選擇')) later(true);
    }, true);

    var box = $('機台清單');
    if(box){
      new MutationObserver(function(){ later(false); }).observe(box, {childList:true, subtree:true});
    }

    setInterval(function(){ 套用工站機台照片過濾_(false); }, 1200);
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
      setTimeout(安裝工站機台照片修正_, 1200);
    };
    s.onerror = function(){
      安裝工站機台照片修正_();
    };
    document.head.appendChild(s);
  }

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
