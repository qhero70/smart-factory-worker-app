/* 報工作業 V4 選定人員加班欄位 v4.8.9
 * 加入：是否加班、加班類型、加班小時。
 * 只補前端欄位與送出 payload 對接，不動 GAS、不動資料庫結構。
 */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function S(v){return String(v==null?'':v).trim()}
function installCSS(){
  if(E('v489OvertimeCss'))return;
  var s=document.createElement('style');
  s.id='v489OvertimeCss';
  s.textContent=[
    '.v4-overtime-panel{margin:8px 0 0!important;padding:9px!important;border-radius:16px!important;background:rgba(77,163,255,.07)!important;border:1px solid rgba(77,163,255,.18)!important;box-shadow:0 6px 18px rgba(0,0,0,.16)!important;overflow:hidden!important}',
    '.v4-overtime-title{font-size:12px!important;font-weight:1000!important;color:#d8e9ff!important;margin-bottom:6px!important;display:flex!important;align-items:center!important;gap:5px!important}',
    '.v4-overtime-grid{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:6px!important;min-width:0!important}',
    '.v4-overtime-field{min-width:0!important}',
    '.v4-overtime-label{font-size:10px!important;color:#aebbd0!important;font-weight:900!important;margin:0 0 3px!important;line-height:1.25!important}',
    '.v4-overtime-panel select,.v4-overtime-panel input{width:100%!important;height:36px!important;min-width:0!important;border-radius:11px!important;border:1px solid rgba(255,255,255,.16)!important;background:rgba(255,255,255,.06)!important;color:#fff!important;font-size:12px!important;font-weight:800!important;padding:5px 7px!important;box-sizing:border-box!important}',
    '.v4-overtime-panel option{background:#111827!important;color:#fff!important}',
    '.v4-overtime-panel input:disabled,.v4-overtime-panel select:disabled{opacity:.45!important;background:rgba(255,255,255,.035)!important}',
    '.v4-overtime-help{font-size:9px!important;color:#8fa2bd!important;margin-top:5px!important;line-height:1.35!important}',
    '@media(max-width:430px){.v4-overtime-grid{grid-template-columns:1fr 1fr!important}.v4-overtime-field.hours{grid-column:1/3!important}.v4-overtime-panel{padding:8px!important}.v4-overtime-panel select,.v4-overtime-panel input{height:34px!important;font-size:12px!important}}'
  ].join('');
  document.head.appendChild(s);
}
function panelHTML(){
  return '<div id="v4OvertimePanel" class="v4-overtime-panel">'+
    '<div class="v4-overtime-title">🕒 加班資訊 <span style="font-size:9px;color:#8fa2bd;font-weight:800;">Overtime</span></div>'+
    '<div class="v4-overtime-grid">'+
      '<div class="v4-overtime-field"><div class="v4-overtime-label">是否加班</div><select id="overtimeFlag" onchange="window.V4Overtime489&&window.V4Overtime489.sync()"><option value="否">否</option><option value="是">是</option></select></div>'+
      '<div class="v4-overtime-field"><div class="v4-overtime-label">加班類型</div><select id="overtimeType"><option value="無">無</option><option value="平日加班">平日加班</option><option value="休息日加班">休息日加班</option><option value="例假日加班">例假日加班</option><option value="國定假日加班">國定假日加班</option></select></div>'+
      '<div class="v4-overtime-field hours"><div class="v4-overtime-label">加班小時</div><input id="overtimeHours" type="number" inputmode="decimal" min="0" step="0.5" placeholder="請輸入小時"></div>'+
    '</div>'+
    '<div class="v4-overtime-help">未加班時不寫入加班小時；選「是」後再填小時。</div>'+
  '</div>';
}
function mount(){
  installCSS();
  var area=E('selectedPersonArea')||E('selectedPersonDisplay')?.parentElement;
  if(!area)return;
  if(!E('v4OvertimePanel')){
    var target=E('selectedPersonDisplay')||area;
    var wrap=document.createElement('div');
    wrap.innerHTML=panelHTML();
    target.insertAdjacentElement('afterend',wrap.firstElementChild);
  }
  sync();
}
function sync(){
  var f=E('overtimeFlag'),t=E('overtimeType'),h=E('overtimeHours');
  if(!f||!t||!h)return;
  var yes=f.value==='是';
  t.disabled=!yes;h.disabled=!yes;
  if(!yes){t.value='無';h.value=''}
  var st=window.V4_STATE=window.V4_STATE||{};
  st.overtime={是否加班:f.value,加班類型:t.value,加班小時:yes?S(h.value):''};
}
function read(){
  sync();
  return (window.V4_STATE&&window.V4_STATE.overtime)||{是否加班:'否',加班類型:'無',加班小時:''};
}
function patchSelectPerson(){
  if(window.__V4_OVERTIME_SELECT_PATCH__)return;
  var old=window.selectPerson;
  if(typeof old!=='function')return;
  window.__V4_OVERTIME_SELECT_PATCH__=true;
  window.selectPerson=function(){var r=old.apply(this,arguments);setTimeout(mount,30);setTimeout(mount,160);return r};
}
function patchSummary(){
  if(window.__V4_OVERTIME_SUMMARY_PATCH__)return;
  var old=window.renderSummary;
  if(typeof old!=='function')return;
  window.__V4_OVERTIME_SUMMARY_PATCH__=true;
  window.renderSummary=function(){var r=old.apply(this,arguments);setTimeout(function(){
    var box=E('summaryBox')||document.querySelector('.summary');if(!box||E('summaryOvertimeRow'))return;
    var o=read();
    var div=document.createElement('div');div.id='summaryOvertimeRow';div.className='summary-row';
    div.innerHTML='<div>加班</div><div class="val">'+o.是否加班+(o.是否加班==='是'?'｜'+o.加班類型+'｜'+o.加班小時+' 小時':'')+'</div>';
    box.appendChild(div);
  },80);return r};
}
function boot(){installCSS();patchSelectPerson();patchSummary();mount();setTimeout(mount,500)}
window.V4Overtime489={boot:boot,mount:mount,sync:sync,read:read};
document.addEventListener('input',function(e){if(e.target&&/^(overtimeFlag|overtimeType|overtimeHours)$/.test(e.target.id))sync()},true);
document.addEventListener('change',function(e){if(e.target&&/^(overtimeFlag|overtimeType|overtimeHours)$/.test(e.target.id))sync()},true);
document.addEventListener('DOMContentLoaded',boot);
setTimeout(boot,100);setTimeout(boot,800);setInterval(function(){patchSelectPerson();patchSummary()},1000);
})();
