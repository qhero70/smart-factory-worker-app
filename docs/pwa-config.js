window.PWA_CONFIG = {
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbweSKwcREbv-5R5E1ZIj_XOZDGQzRPCdoOAy2uTkhMwZTZoIv-GtpQi0PF8ahdb6KEJ/exec',
  APP_NAME: '製造部智慧製造應用總部',
  VERSION: 'v2.1.22_正式現場版',
  SPREADSHEET_ID: '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS: 8000,
  API_ACTIONS: {
    健康檢查: '健康檢查',
    主檔檢查: '主檔檢查',
    取得報工作業v2初始資料: '取得報工作業v2初始資料',
    寫入報工作業v2: '寫入報工作業v2',
    寫入不良紀錄v2: '寫入不良紀錄v2',
    手動重刷_主檔照片: '手動重刷_主檔照片'
  }
};

(function(){
  function 載入正式樣式(){
    if(document.getElementById('報工正式樣式'))return;
    var link=document.createElement('link');
    link.id='報工正式樣式';
    link.rel='stylesheet';
    link.href='./work-report-v2-ui.css?v=222';
    document.head.appendChild(link);
  }
  function 建立人員下拉(){
    var list=document.getElementById('人員列表');
    if(!list)return;
    var wrap=document.getElementById('人員下拉控制');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='人員下拉控制';
      wrap.innerHTML='<button id="人員下拉按鈕" type="button"><span class="下拉頭像"></span><span><span class="下拉姓名">請選擇人員</span><span class="下拉資料">點擊展開圖片卡片清單</span></span><span class="下拉箭頭">⌄</span></button>';
      list.parentNode.insertBefore(wrap,list);
      document.getElementById('人員下拉按鈕').addEventListener('click',function(){document.body.classList.toggle('人員下拉展開');});
    }
    var selected=list.querySelector('.人員卡片.選中');
    var avatar=wrap.querySelector('.下拉頭像');
    var name=wrap.querySelector('.下拉姓名');
    var info=wrap.querySelector('.下拉資料');
    if(selected){
      var img=selected.querySelector('.頭像圈 img');
      avatar.innerHTML=img?'<img src="'+img.src+'" alt="">':'';
      name.textContent=(selected.querySelector('.人名')||{}).textContent||'已選人員';
      info.textContent=((selected.querySelector('.人工號')||{}).textContent||'')+'｜'+((selected.querySelector('.班標')||{}).textContent||'');
    }
  }
  function 綁定人員收合(){
    var list=document.getElementById('人員列表');
    if(!list||list.dataset.dropClose==='1')return;
    list.dataset.dropClose='1';
    list.addEventListener('click',function(e){
      if(e.target.closest('.人員卡片'))setTimeout(function(){document.body.classList.remove('人員下拉展開');建立人員下拉();},120);
    },true);
  }
  function 工站固定顯示(){
    var list=document.getElementById('產品列表');
    var sel=document.getElementById('工站選擇');
    if(!list||!sel)return;
    var card=sel.closest('.卡片');
    if(!card)return;
    card.id='工站固定區';
    card.style.position='relative';
    card.style.top='auto';
    card.style.zIndex='1';
    card.style.display='block';
    card.style.borderColor='rgba(0,210,255,.45)';
    if(list.previousElementSibling!==card)list.parentNode.insertBefore(card,list);
  }
  function 綁定產品滑動(){
    var list=document.getElementById('產品列表');
    if(!list||list.dataset.stationScroll==='3')return;
    list.dataset.stationScroll='3';
    list.addEventListener('click',function(e){
      var item=e.target.closest('.產品卡片');
      if(item)setTimeout(function(){var station=document.getElementById('工站固定區');if(station)station.scrollIntoView({behavior:'smooth',block:'start'});},120);
    },true);
  }
  function 補時間班別(){
    var n=new Date();
    var local=new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,16);
    var s=document.querySelector('.人員卡片.選中 .班標');
    var b=document.getElementById('班別');
    var sh=s?s.textContent.trim():'';
    if(b&&(sh==='早班'||sh==='大夜班'))b.value=sh;
    var a=document.getElementById('開始時間');
    var e=document.getElementById('結束時間');
    if(a&&!a.value)a.value=local;
    if(e&&!e.value)e.value=local;
  }
  function 限制不良(){
    function n(v){v=String(v||'').replace(/[^0-9]/g,'');return Number(v)||0;}
    var totalEl=document.getElementById('今日共做數');
    var badEl=document.getElementById('快速不良數');
    var total=n(totalEl&&totalEl.value);
    if(totalEl&&totalEl.value)totalEl.value=String(total);
    if(badEl&&badEl.value){var bad=Math.min(n(badEl.value),total||n(badEl.value));badEl.value=String(bad);}
    var limit=badEl&&badEl.value?n(badEl.value):total;
    var items=Array.from(document.querySelectorAll('.不良數量'));
    items.forEach(function(input){
      if(!input.value)return;
      var other=items.reduce(function(sum,x){return x===input?sum:sum+n(x.value);},0);
      var allow=Math.max(0,limit-other);
      input.value=String(Math.min(n(input.value),allow));
    });
  }
  function 整理掃碼輸入(){
    var input=document.getElementById('掃碼手動輸入');
    if(!input||input.dataset.clean==='1')return;
    input.dataset.clean='1';
    input.addEventListener('input',function(){input.value=input.value.trim().toLowerCase();});
  }
  function 執行(){載入正式樣式();建立人員下拉();綁定人員收合();工站固定顯示();綁定產品滑動();補時間班別();限制不良();整理掃碼輸入();}
  document.addEventListener('DOMContentLoaded',function(){setInterval(執行,1000);setTimeout(執行,300);setTimeout(執行,1600);});
})();
