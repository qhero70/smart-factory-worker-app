window.PWA_CONFIG = {
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbweSKwcREbv-5R5E1ZIj_XOZDGQzRPCdoOAy2uTkhMwZTZoIv-GtpQi0PF8ahdb6KEJ/exec',
  APP_NAME: '製造部智慧製造應用總部',
  VERSION: 'v2.1.14_正式現場版',
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
  document.addEventListener('DOMContentLoaded',function(){setInterval(function(){工站上移();綁定產品滑動();},1200);setTimeout(function(){工站上移();綁定產品滑動();},300);setTimeout(function(){工站上移();綁定產品滑動();},1600);});
})();
