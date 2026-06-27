/* 製一組報工表單 V4｜不良分配新增列修復 v4.5.8
 * 修復 Step 4「新增不良分配項目 / Add Allocation Row」按鈕無法新增。
 * 不改產品、工站、機台流程。
 */
(function(){
  'use strict';
  var 已綁定=false;
  function $(id){return document.getElementById(id);}
  function 文(v){return String(v===undefined||v===null?'':v).trim();}
  function 數(v){var n=Number(v);return isFinite(n)?Math.max(0,n):0;}
  function 安全(s){return 文(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function 可用(){try{return typeof STATE!=='undefined'&&typeof DB!=='undefined'&&STATE&&DB;}catch(e){return false;}}
  function 提示(a,b,c,t){try{if(typeof roar==='function')roar(a,b,c,t||'success');}catch(e){}}
  function 更新(){try{updateDefectSummaryDisplay();}catch(e){}try{updateDefectSyncNotice();}catch(e){}try{updatePreview();}catch(e){}try{updateConfirmSummary();}catch(e){}}
  function nextId(){var m=0;try{(STATE.defectRows||[]).forEach(function(r){m=Math.max(m,數(r.id));});}catch(e){}return m+1;}
  function reasons(cat){try{return (DB.ngReasons&&DB.ngReasons[cat])?DB.ngReasons[cat]:[];}catch(e){return [];}}
  function fallback(cat){return cat==='Z'?[{代碼:'Z01',名稱:'素材裂縫',英文名稱:'Surface Crack'},{代碼:'Z02',名稱:'加工砂孔',英文名稱:'Sand Porosity'},{代碼:'Z03',名稱:'外觀刮傷',英文名稱:'Surface Scratch'}]:[{代碼:'Y01',名稱:'內徑超差',英文名稱:'Inner Diameter OOT'},{代碼:'Y02',名稱:'外徑超差',英文名稱:'Outer Diameter OOT'},{代碼:'Y03',名稱:'長度超差',英文名稱:'Length OOT'}];}
  function opts(cat,selected){var list=reasons(cat);if(!list.length)list=fallback(cat);return list.map(function(x){var code=文(x.代碼),val=code+'|'+cat;var label=code+'｜'+文(x.名稱)+'｜'+文(x.英文名稱||x.英文||'');return '<option value="'+安全(val)+'" '+(val===selected?'selected':'')+'>'+安全(label)+'</option>';}).join('');}
  function render(){
    if(!可用())return;
    var box=$('defectContainer');if(!box)return;
    if(!Array.isArray(STATE.defectRows))STATE.defectRows=[];
    if(!STATE.defectRows.length){box.innerHTML='<div class="caption" style="padding:8px;text-align:center;">尚無分配項目 / No allocation items yet</div>';更新();return;}
    box.innerHTML=STATE.defectRows.map(function(r){var sel=r.code?(文(r.code)+'|'+文(r.category)):'';return '<div class="defect-row" data-id="'+r.id+'"><button type="button" class="defect-delete-btn ripple" data-act="remove" data-id="'+r.id+'">✕</button><select data-act="reason" data-id="'+r.id+'"><option value="">── 選擇不良原因 / Select Defect Reason ──</option><optgroup label="Z 素材 / 外觀類">'+opts('Z',sel)+'</optgroup><optgroup label="Y 加工 / 尺寸類">'+opts('Y',sel)+'</optgroup></select><input class="qty-input" data-act="qty" data-id="'+r.id+'" type="number" min="0" inputmode="numeric" placeholder="pcs" value="'+(數(r.qty)||'')+'"></div>';}).join('');
    更新();
  }
  function addRow(){
    if(!可用()){提示('⚠️','資料尚未載入','請等資料載入完成後再新增。','warning');return;}
    if(!Array.isArray(STATE.defectRows))STATE.defectRows=[];
    STATE.defectRows.push({id:nextId(),category:'',code:'',name:'',enName:'',qty:0});
    render();
    提示('＋','已新增不良分配項目','請選擇不良原因與數量。','success');
  }
  function removeRow(id){if(!可用())return;STATE.defectRows=(STATE.defectRows||[]).filter(function(r){return String(r.id)!==String(id);});render();}
  function setReason(id,value){if(!可用())return;var r=(STATE.defectRows||[]).find(function(x){return String(x.id)===String(id);});if(!r)return;var p=String(value||'').split('|');r.code=p[0]||'';r.category=p[1]||'';var f=(reasons(r.category).concat(fallback(r.category))).find(function(x){return 文(x.代碼)===文(r.code);});r.name=f?文(f.名稱):'';r.enName=f?文(f.英文名稱||f.英文||''):'';更新();}
  function setQty(id,value,input){if(!可用())return;var r=(STATE.defectRows||[]).find(function(x){return String(x.id)===String(id);});if(!r)return;var total=數(($('ngQty')||{}).value);var other=(STATE.defectRows||[]).reduce(function(s,x){return s+(String(x.id)===String(id)?0:數(x.qty));},0);var q=數(value);if(total>0&&q>Math.max(total-other,0)){q=Math.max(total-other,0);提示('⚠️','分配數量超過不良數','已自動限制為 '+q,'warning');}r.qty=q;if(input)input.value=q||'';更新();}
  function installStyle(){if($('v458style'))return;var s=document.createElement('style');s.id='v458style';s.textContent='.add-defect-btn{position:relative!important;z-index:30!important;pointer-events:auto!important;min-height:48px!important}.defect-row{display:grid!important;grid-template-columns:34px minmax(0,1fr) 82px!important;gap:8px!important;align-items:center!important;margin:8px 0!important;padding:8px!important;border-radius:16px!important;background:rgba(255,255,255,.85)!important}.defect-row select{width:100%!important;min-width:0!important;height:44px!important;font-size:13px!important}.defect-row .qty-input{width:82px!important;min-width:82px!important;height:44px!important;font-size:18px!important;text-align:center!important}.defect-delete-btn{width:32px!important;height:32px!important;border-radius:999px!important;border:none!important;background:#fee2e2!important;color:#b91c1c!important;font-weight:1000!important}@media(max-width:390px){.defect-row{grid-template-columns:32px minmax(0,1fr) 72px!important;gap:6px!important}.defect-row .qty-input{width:72px!important;min-width:72px!important}}';document.head.appendChild(s);}
  function clickHandler(e){var btn=e.target.closest&&e.target.closest('.add-defect-btn');if(btn){e.preventDefault();e.stopPropagation();addRow();return;}var act=e.target.getAttribute&&e.target.getAttribute('data-act');if(act==='remove'){e.preventDefault();e.stopPropagation();removeRow(e.target.getAttribute('data-id'));}}
  function changeHandler(e){var act=e.target.getAttribute&&e.target.getAttribute('data-act');if(act==='reason')setReason(e.target.getAttribute('data-id'),e.target.value);if(act==='qty')setQty(e.target.getAttribute('data-id'),e.target.value,e.target);}
  function inputHandler(e){var act=e.target.getAttribute&&e.target.getAttribute('data-act');if(act==='qty')setQty(e.target.getAttribute('data-id'),e.target.value,e.target);}
  function install(){installStyle();window.V4_458_新增不良分配項目=addRow;window.addDefectRow=addRow;window.renderDefectRows=render;var b=document.querySelector('.add-defect-btn');if(b){b.type='button';b.onclick=null;}if(!已綁定){document.addEventListener('click',clickHandler,true);document.addEventListener('touchend',clickHandler,true);document.addEventListener('change',changeHandler,true);document.addEventListener('input',inputHandler,true);已綁定=true;}if(可用()){var box=$('defectContainer');if(box&&box.children.length===0)render();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',function(){install();setTimeout(install,800);});
  setInterval(install,1500);
  try{console.log('V4 defect allocation fix loaded v4.5.8');}catch(e){}
})();