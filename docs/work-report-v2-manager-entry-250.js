/*
 * 29_主管戰情看板入口整合｜報工PWA快捷入口
 * 版本：v250
 * 原則：外掛式注入，不改報工核心流程。
 */
(function(){
  'use strict';
  var ID='主管戰情快捷入口250';
  var URL='./manager-war-room-v28.html?v=29';
  if(document.getElementById(ID))return;

  function addStyle(){
    if(document.getElementById(ID+'Style'))return;
    var s=document.createElement('style');
    s.id=ID+'Style';
    s.textContent=[
      '.manager-war-entry-250{margin:10px auto 8px;max-width:760px;padding:10px 12px;border:1px solid rgba(34,211,238,.55);border-radius:16px;background:linear-gradient(135deg,rgba(6,182,212,.18),rgba(124,77,255,.12));box-shadow:0 10px 28px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:space-between;gap:10px;color:#eafcff;font-weight:900}',
      '.manager-war-entry-250 small{display:block;color:#8feaff;font-size:11px;font-weight:800;margin-top:2px}',
      '.manager-war-entry-250 a{white-space:nowrap;text-decoration:none;border:1px solid rgba(34,211,238,.75);border-radius:999px;padding:9px 12px;background:rgba(8,145,178,.25);color:#dffbff;font-size:12px;font-weight:1000}',
      '@media(max-width:520px){.manager-war-entry-250{margin:8px 10px;align-items:flex-start;flex-direction:column}.manager-war-entry-250 a{width:100%;text-align:center}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function mount(){
    if(document.getElementById(ID))return;
    addStyle();
    var box=document.createElement('div');
    box.id=ID;
    box.className='manager-war-entry-250';
    box.innerHTML='<div>📊 主管戰情看板<small>AI摘要・未報工追蹤・風險清單・LINE狀態</small></div><a href="'+URL+'">開啟戰情</a>';

    var target=document.querySelector('main')||document.querySelector('.app')||document.body;
    if(target.firstChild)target.insertBefore(box,target.firstChild);else target.appendChild(box);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  setTimeout(mount,900);
})();
