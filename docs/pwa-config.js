window.PWA_CONFIG=window.PWA_CONFIG||{};
(function(c){
  c.GAS_WEB_APP_URL=['https://script.google.com','/macros/s/','AKfycbzRvly1OV-C80bMmd2ww4BM1XAH9WTyz62VFDnUxVGiO15kzHahbeHZc2bNTSwdFCqBwQ','/exec'].join('');
  c.APP_NAME='化新報工';
  c.APP_SHORT_NAME='化新報工';
  c.VERSION='v4.8.9';
  c.SPREADSHEET_ID='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  c.正式主資料庫ID='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  c.API_TIMEOUT_MS=20000;
  c.API_ACTIONS={
    INIT:['取得報工作業v2初始資料','取得報工作業V4初始資料','getWorkReportV4Init','init','讀取資料庫快照'],
    SUBMIT:['submitWorkReportV4','寫入報工作業v4','寫入報工作業v2','寫入現場報工V1'],
    SUBMIT_DEFECT:['submitDefectsV4','寫入不良紀錄v4','寫入不良紀錄v2']
  };
})(window.PWA_CONFIG);

(function(){
  function 載入一次(src,id){
    if(document.getElementById(id))return;
    var s=document.createElement('script');
    s.id=id;
    s.defer=true;
    s.src=src;
    document.head.appendChild(s);
  }
  載入一次('./work-report-v4-opening-particles.js?v=489','化新純粒子開場程式');
  載入一次('./work-report-v4-v484-hotfix.js?v=489','化新報工v484修正程式');
  載入一次('./work-report-v4-v489-data-repair.js?v=489','化新報工v489資料修復程式');
})();

(function(){
  function E(id){return document.getElementById(id)}
  function centerV4(el){
    if(!el)return;
    el.classList.remove('hidden','v4-hide');
    function run(){
      try{
        var rect=el.getBoundingClientRect();
        var vh=window.innerHeight||document.documentElement.clientHeight||0;
        var current=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0;
        var target=current+rect.top-(vh-rect.height)/2;
        var max=(document.documentElement.scrollHeight||document.body.scrollHeight||0)-vh;
        if(max<0)max=0;
        target=Math.max(0,Math.min(target,max));
        window.scrollTo({top:target,behavior:'smooth'});
      }catch(e){try{el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});}catch(_e){}}
    }
    requestAnimationFrame(function(){setTimeout(run,60);setTimeout(run,220);});
  }
  function patch(){
    window.center=centerV4;
    if(window.__V4_CENTER_PATCHED__)return;
    var old=window.selectPerson;
    if(typeof old!=='function')return;
    window.__V4_CENTER_PATCHED__=true;
    window.selectPerson=function(){
      window.center=centerV4;
      var r=old.apply(this,arguments);
      centerV4(E('selectedPersonDisplay'));
      setTimeout(function(){centerV4(E('selectedPersonDisplay'));},260);
      return r;
    };
  }
  patch();
  document.addEventListener('DOMContentLoaded',patch);
  setTimeout(patch,50);setTimeout(patch,300);setTimeout(patch,900);setInterval(patch,1000);
})();
