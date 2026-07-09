/* 化新報工 V4｜v4.9.0 開場還原鎖定
 * 使用 GitHub 歷史正式版：原封不動載入使用者上傳的 開場.txt。
 * 不改粒子數、不改 RAW_LOGO_DATA、不改 CONFIG、不改動畫節奏。
 */
(function(){
  'use strict';
  const 原封不動開場JS='https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@ab308c06d91b31780ee9409666dbd071e1f101ba/docs/work-report-v4-opening-particles.js';
  if(window.__HUAXIN_EXACT_OPENING_LOCKED__) return;
  window.__HUAXIN_EXACT_OPENING_LOCKED__=true;
  function 載入正式開場(){
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
