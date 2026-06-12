(function(){
  'use strict';
  function loadCss(){
    if(document.getElementById('報工正式樣式'))return;
    var l=document.createElement('link');
    l.id='報工正式樣式';
    l.rel='stylesheet';
    l.href='./work-report-v2-ui.css?v=227';
    document.head.appendChild(l);
  }
  function killLoading(){
    var x=document.getElementById('載入遮罩');
    if(x){
      x.classList.remove('顯示');
      x.style.setProperty('display','none','important');
      x.style.setProperty('visibility','hidden','important');
      x.style.setProperty('pointer-events','none','important');
    }
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
    if(btn&&btn.dataset.bind!=='227'){
      btn.dataset.bind='227';
      btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();showProducts();},true);
      btn.addEventListener('touchend',function(e){e.preventDefault();e.stopPropagation();showProducts();},true);
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
    if(list.dataset.dropClose!=='227'){
      list.dataset.dropClose='227';
      list.addEventListener('click',function(e){
        if(e.target.closest('.產品卡片'))setTimeout(function(){hideProducts();productDrop();stationTop();},180);
      },true);
    }
  }
  function bindGlobalProductOpen(){
    if(document.body.dataset.productGlobal==='227')return;
    document.body.dataset.productGlobal='227';
    document.addEventListener('click',function(e){
      var hit=e.target.closest('#產品下拉控制,#產品下拉按鈕');
      if(!hit)return;
      e.preventDefault();
      e.stopPropagation();
      showProducts();
    },true);
    document.addEventListener('touchstart',function(e){
      var hit=e.target.closest('#產品下拉控制,#產品下拉按鈕');
      if(!hit)return;
      showProducts();
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
    if(control.previousElementSibling!==card)control.parentNode.insertBefore(card,control);
  }
  function run(){loadCss();killLoading();productDrop();bindGlobalProductOpen();stationTop();}
  loadCss();killLoading();
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
