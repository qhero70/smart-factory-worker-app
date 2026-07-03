/* 首頁新增報工作業 V4 快速入口 */
(function(){
  'use strict';
  function addEntry(){
    if(document.getElementById('homeV4ReportEntry'))return;
    var href='./work-report-v4.html?v=v470-rules';
    var box=document.createElement('a');
    box.id='homeV4ReportEntry';
    box.href=href;
    box.textContent='📋 報工作業 V4';
    box.style.cssText='position:fixed;right:14px;bottom:96px;z-index:9999;padding:14px 18px;border-radius:18px;background:#7b213f;color:#fff;text-decoration:none;font-weight:900;box-shadow:0 12px 28px rgba(123,33,63,.28);font-family:-apple-system,BlinkMacSystemFont,"Noto Sans TC","Microsoft JhengHei",Arial,sans-serif';
    document.body.appendChild(box);
    Array.prototype.slice.call(document.querySelectorAll('*')).forEach(function(el){
      var t=(el.textContent||'').trim();
      if(t==='報工管理V2'||t==='報工作業V2')el.textContent='報工作業V4';
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addEntry);else addEntry();
  setTimeout(addEntry,1000);
})();
