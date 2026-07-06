/* 報工作業 V4 黑底 UI 視覺覆蓋 v4.8.8 */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function install(){
  if(E('workReportV4Dark488'))return;
  var s=document.createElement('style');
  s.id='workReportV4Dark488';
  s.textContent=[
    ':root{--blue:#4da3ff!important;--blue2:#2b8af0!important;--bg:#080d18!important;--card:rgba(255,255,255,.065)!important;--line:rgba(255,255,255,.13)!important;--text:#e8ecf2!important;--muted:#95a1b5!important;--green:#3dd68c!important;--red:#f97066!important;--yellow:rgba(245,184,66,.08)!important;--shadow:0 12px 42px rgba(0,0,0,.35)!important}',
    'html,body{background:#080d18!important;background-image:radial-gradient(ellipse 80% 50% at 50% -20%,rgba(77,163,255,.13),transparent 70%),radial-gradient(ellipse 60% 40% at 80% 60%,rgba(167,139,250,.08),transparent 72%)!important;color:#e8ecf2!important}',
    '.app{max-width:520px!important;background:transparent!important}',
    '.topbar{background:rgba(10,17,30,.88)!important;color:#fff!important;border-bottom:1px solid rgba(255,255,255,.1)!important;border-radius:0 0 24px 24px!important;box-shadow:0 8px 32px rgba(0,0,0,.44)!important;backdrop-filter:blur(24px)!important;-webkit-backdrop-filter:blur(24px)!important}',
    '.title p{color:#bcc5d2!important}.app-icon{background:rgba(255,255,255,.09)!important;border-color:rgba(255,255,255,.16)!important}.status-pill{background:rgba(255,255,255,.065)!important;border:1px solid rgba(255,255,255,.12)!important;color:#d9e5f6!important}',
    '.stepper,.glass-card,.selected-box,.selected-product,.summary,.stat-card,.machine-card,.toast{background:rgba(255,255,255,.065)!important;border:1px solid rgba(255,255,255,.13)!important;color:#e8ecf2!important;box-shadow:0 8px 28px rgba(0,0,0,.28)!important}',
    '.guide-card{background:rgba(245,184,66,.075)!important;border-color:rgba(245,184,66,.22)!important;border-left-color:#f5b842!important;color:#e8ecf2!important}',
    '.guide-title{color:#ffe09b!important}.guide-desc{color:#cbb98d!important}',
    '.card-title,.selected-text,.person-name,.product-name,.machine-no,.summary h2,.summary-row{color:#fff!important}.en,.stat-label{color:#9ba7ba!important}',
    '.field,.search,input,select,textarea,.defect-row select,.defect-row input{background:rgba(255,255,255,.055)!important;color:#fff!important;border-color:rgba(255,255,255,.16)!important}.readonly{background:rgba(255,255,255,.035)!important;color:#bcc5d2!important}select option{background:#111827!important;color:#fff!important}',
    '.btn-secondary{background:rgba(255,255,255,.07)!important;color:#d9e5f6!important;border:1px solid rgba(255,255,255,.14)!important}.bottom-bar{background:rgba(10,17,30,.9)!important;border-top:1px solid rgba(255,255,255,.12)!important}',
    '.summary{background:rgba(61,214,140,.07)!important;border-color:rgba(61,214,140,.22)!important}.summary-row{border-bottom-color:rgba(255,255,255,.1)!important}.summary-row .val{color:#dfffee!important}',
    '.submitting:before{background:rgba(0,0,0,.78)!important}.submitting:after{background:rgba(18,26,40,.97)!important;color:#fff!important;border:1px solid rgba(255,255,255,.14)!important}'
  ].join('');
  document.head.appendChild(s);
}
window.V4Dark488={install:install};
document.addEventListener('DOMContentLoaded',install);
setTimeout(install,50);setTimeout(install,400);setTimeout(install,1200);
})();
