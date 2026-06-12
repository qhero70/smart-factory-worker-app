window.PWA_CONFIG = {
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbweSKwcREbv-5R5E1ZIj_XOZDGQzRPCdoOAy2uTkhMwZTZoIv-GtpQi0PF8ahdb6KEJ/exec',
  APP_NAME: '製造部智慧製造應用總部',
  VERSION: 'v2.1.17_正式現場版',
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
  function 工站上移(){
    var list=document.getElementById('產品列表');
    var sel=document.getElementById('工站選擇');
    if(!list||!sel)return;
    var card=sel.closest('.卡片');
    if(!card)return;
    card.style.position='sticky';
    card.style.top='118px';
    card.style.zIndex='90';
    card.style.borderColor='rgba(0,210,255,.38)';
    if(card.nextElementSibling!==list)list.parentNode.insertBefore(card,list);
  }
  function 綁定產品滑動(){
    var list=document.getElementById('產品列表');
    if(!list||list.dataset.stationScroll==='1')return;
    list.dataset.stationScroll='1';
    list.addEventListener('click',function(e){
      if(e.target.closest('.產品卡片'))setTimeout(function(){
        var sel=document.getElementById('工站選擇');
        var card=sel&&sel.closest('.卡片');
        if(card)card.scrollIntoView({behavior:'smooth',block:'start'});
      },120);
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
  document.addEventListener('DOMContentLoaded',function(){setInterval(function(){工站上移();綁定產品滑動();補時間班別();限制不良();整理掃碼輸入();},1200);setTimeout(function(){工站上移();綁定產品滑動();補時間班別();限制不良();整理掃碼輸入();},300);setTimeout(function(){工站上移();綁定產品滑動();補時間班別();限制不良();整理掃碼輸入();},1600);});
})();
