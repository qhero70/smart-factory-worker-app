/* 化新報工 V4｜v5.2.0 開場鎖定 + 不良原因原生下拉攔截
 * 開場動畫仍使用 GitHub 歷史正式版。
 * 額外載入 519 格子選擇器與 520 原生 select 強制攔截器。
 */
(function(){
  'use strict';
  const 原封不動開場JS='https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@ab308c06d91b31780ee9409666dbd071e1f101ba/docs/work-report-v4-opening-particles.js';
  function 載入JS(src,id){
    if(id&&document.getElementById(id))return;
    const s=document.createElement('script');
    s.src=src;
    if(id)s.id=id;
    s.defer=true;
    document.head.appendChild(s);
  }
  function 載入不良原因修復器(){
    載入JS('./work-report-v4-defect-grid-picker-519.js?v=520','hx-defect-grid-picker-519');
    載入JS('./work-report-v4-defect-select-force-520.js?v=520','hx-defect-select-force-520');
  }
  function 載入正式開場(){
    載入不良原因修復器();
    if(window.__HUAXIN_EXACT_OPENING_LOCKED__) return;
    window.__HUAXIN_EXACT_OPENING_LOCKED__=true;
    fetch(原封不動開場JS,{cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error('開場檔讀取失敗 '+r.status);return r.text();})
      .then(code=>{
        if(!/原封不動載入使用者上傳開場\.txt/.test(code) || !/原始開場GzipBase64/.test(code)){
          throw new Error('開場檔驗證失敗');
        }
        (0,eval)(code);
      })
      .catch(err=>{
        console.error('[化新報工] 開場還原失敗',err);
        const old=document.getElementById('loadingScreen');
        if(old){old.style.display='none';old.classList.add('hidden');}
      });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',載入正式開場,{once:true});
  else 載入正式開場();
})();
