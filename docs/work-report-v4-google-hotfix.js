/* 化新報工 V4｜資料載入後重繪不良原因選單
 * 用途：避免畫面先產生不良列時，仍停留在備用不良代碼。
 */
(function(){
  'use strict';
  window.addEventListener('load',function(){
    let done=false;
    const timer=setInterval(function(){
      const text=(document.getElementById('statusText')&&document.getElementById('statusText').textContent)||'';
      if(done) return;
      if(text.includes('資料已載入')&&typeof window.deleteDefectRow==='function'&&typeof window.addDefectRow==='function'){
        done=true;
        clearInterval(timer);
        try{
          window.deleteDefectRow(1);
          window.addDefectRow();
        }catch(e){}
      }
    },450);
    setTimeout(function(){clearInterval(timer);},10000);
  });
})();
