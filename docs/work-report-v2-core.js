(function(){
  'use strict';
  function loadCss(){
    if(document.getElementById('報工正式樣式'))return;
    var l=document.createElement('link');
    l.id='報工正式樣式';
    l.rel='stylesheet';
    l.href='./work-report-v2-ui.css?v=225';
    document.head.appendChild(l);
  }
  function showProducts(){
    var list=document.getElementById('產品列表');
    if(!list)return;
    document.body.classList.add('產品下拉展開');
    list.style.setProperty('display','grid','important');
    list.style.setProperty('height','auto','important');
    list.style.setProperty('min-height','0','important');
    list.style.setProperty('max-height','none','important');
    list.style.setProperty('overflow','visible','important');
    list.style.setProperty('margin','12px 0 16px','important');
    list.style.setProperty('padding','0','important');
  }
  function hideProducts(){
    var list=document.getElementById('產品列表');
    if(!list)return;
    document.body.classList.remove('產品下拉展開');
    list.style.setProperty('display','none','important');
    list.style.setProperty('height','0','important');
    list.style.setProperty('min-height','0','important');
    list.style.setProperty('max-height','0','important');
    list.style.setProperty('overflow','hidden','important');
    list.style.setProperty('margin','0','important');
    list.style.setProperty('padding','0','important');
  }
  function productDrop(){
    var list=document.getElementById('產品列表');
    if(!list)return;
    var wrap=document.getElementById('產品下拉控制');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='產品下拉控制';
      wrap.innerHTML='<button id="產品下拉按鈕" type="button"><span class="下拉產品圖">📦</span><span><span class="下拉產品名">請選擇產品</span><span class="下拉產品資料">點擊展開產品圖片卡片清單</span></span><span class="下拉箭頭">⌄</span></button>';
      list.parentNode.insertBefore(wrap,list);
    }
    var btn=document.getElementById('產品下拉按鈕');
    if(btn&&btn.dataset.bind!=='225'){
      btn.dataset.bind='225';
      btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        if(document.body.classList.contains('產品下拉展開'))hideProducts();else showProducts();
      },true);
      btn.addEventListener('touchend',function(e){
        e.preventDefault();
        e.stopPropagation();
        if(document.body.classList.contains('產品下拉展開'))hideProducts();else showProducts();
      },true);
    }
    var selected=list.querySelector('.產品卡片.選中');
    if(selected){
      var img=selected.querySelector('.產品圖 img');
      var pic=wrap.querySelector('.下拉產品圖');
      var name=wrap.querySelector('.下拉產品名');
      var info=wrap.querySelector('.下拉產品資料');
      pic.innerHTML=img?'<img src="'+img.src+'" alt="">':'📦';
      name.textContent=(selected.querySelector('.產品名')||{}).textContent||'已選產品';
      info.textContent=(selected.querySelector('.產品副')||{}).textContent||'已選定產品';
    }
    if(!document.body.classList.contains('產品下拉展開'))hideProducts();
    if(list.dataset.dropClose!=='225'){
      list.dataset.dropClose='225';
      list.addEventListener('click',function(e){
        if(e.target.closest('.產品卡片'))setTimeout(function(){hideProducts();productDrop();stationTop();},180);
      },true);
    }
  }
  function bindGlobalProductToggle(){
    if(document.body.dataset.productGlobal==='225')return;
    document.body.dataset.productGlobal='225';
    document.addEventListener('click',function(e){
      var hit=e.target.closest('#產品下拉控制,#產品下拉按鈕');
      if(!hit)return;
      e.preventDefault();
      e.stopPropagation();
      if(document.body.classList.contains('產品下拉展開'))hideProducts();else showProducts();
    },true);
    document.addEventListener('touchstart',function(e){
      var hit=e.target.closest('#產品下拉控制,#產品下拉按鈕');
      if(!hit)return;
      if(document.body.classList.contains('產品下拉展開'))hideProducts();else showProducts();
    },true);
  }
  function stationTop(){
    var control=document.getElementById('產品下拉控制');
    var sel=document.getElementById('工站選擇');
    if(!control||!sel)return;
    var card=sel.closest('.卡片');
    if(!card)return;
    card.id='工站固定區';
    card.style.position='relative';
    card.style.top='auto';
    card.style.zIndex='1';
    card.style.display='block';
    if(control.nextElementSibling!==card)control.parentNode.insertBefore(card,control.nextSibling);
  }
  function run(){loadCss();productDrop();bindGlobalProductToggle();stationTop();}
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@eb33ca85a8bca1746614659b41596d3b9a9f8bf8/docs/work-report-v2-core.js?v='+Date.now();
  s.async=false;
  s.onload=function(){
    var ev=document.createEvent('Event');
    ev.initEvent('DOMContentLoaded',true,true);
    document.dispatchEvent(ev);
    setInterval(run,800);
    setTimeout(run,200);
    setTimeout(run,1000);
  };
  document.head.appendChild(s);
})();
