/* 製一組報工表單 V4｜畫面框架與機台照片修正 v4.5.7
 * 只修使用者指定項目：
 * 1. 工站/機台流程沿用 456 已完成的機台清單欄位覆蓋。
 * 2. 機台照片：有照片網址就顯示；沒有照片時改成小型佔位，不再大字佔滿卡片。
 * 3. 提醒語縮小，不壓住欄位。
 * 4. 手機畫面避免橫向溢出、輸入框與底部按鈕被鍵盤擠出畫面。
 */
(function(){
  'use strict';
  var 版本='v4.5.7_ui_photo_overflow_fix';
  function $(id){return document.getElementById(id);}
  function 文(v){return String(v===undefined||v===null?'':v).trim();}
  function 正(v){return 文(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
  function 安全(s){return 文(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function 取(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!==undefined&&v!==null&&文(v)!=='')return 文(v);}return '';}

  function 安裝樣式(){
    if($('v457style'))return;
    var s=document.createElement('style');
    s.id='v457style';
    s.textContent=[
      'html,body{width:100%!important;max-width:100vw!important;overflow-x:hidden!important;}',
      '*,*::before,*::after{box-sizing:border-box!important;}',
      '.outer-wrap,.step-section,.glass-card,.guide-card,#selectedProductArea{max-width:100%!important;overflow-x:hidden!important;}',
      '.outer-wrap{padding-left:14px!important;padding-right:14px!important;}',
      '.glass-card{border-radius:22px!important;}',
      'input,select,textarea{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;}',
      '.grid-2,.grid-3{min-width:0!important;width:100%!important;}',
      '.grid-2>* ,.grid-3>*{min-width:0!important;}',
      '#selectedProductArea .grid-3{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;align-items:start!important;}',
      '#selectedProductArea .grid-3 .field-label{font-size:12px!important;line-height:1.25!important;letter-spacing:-.2px!important;}',
      '#selectedProductArea .grid-3 input{height:34px!important;font-size:14px!important;padding:5px 6px!important;}',
      '.guide-card{padding:11px 12px!important;margin-bottom:10px!important;}',
      '.guide-icon{font-size:24px!important;min-width:34px!important;}',
      '.guide-title{font-size:15px!important;line-height:1.35!important;}',
      '.guide-desc{font-size:12.2px!important;line-height:1.45!important;max-height:78px!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;}',
      '#v453hint,#v452hint,#v451StationHint,#v450StationHint,#v449StationHint,#v457hint{font-size:12px!important;line-height:1.38!important;padding:8px 10px!important;margin:8px 0!important;max-height:64px!important;overflow:auto!important;border-radius:14px!important;}',
      '#workstationSelect,#mainMachineSelect{height:52px!important;min-height:52px!important;font-size:16px!important;line-height:1.25!important;padding:8px 40px 8px 12px!important;}',
      '#workstationSelect[size],#workstationSelect.v453open,#workstationSelect.v452open{height:auto!important;min-height:88px!important;max-height:178px!important;}',
      '#machineListGrid,.machine-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important;width:100%!important;}',
      '.machine-card{min-width:0!important;width:100%!important;margin:0!important;padding:7px!important;border-radius:16px!important;overflow:hidden!important;}',
      '.machine-card img,.machine-img,.machine-no-img{width:100%!important;height:74px!important;border-radius:12px!important;object-fit:cover!important;display:flex!important;align-items:center!important;justify-content:center!important;}',
      '.machine-no-img{font-size:12px!important;font-weight:800!important;color:#6b7280!important;background:linear-gradient(135deg,#eef5ff,#dfefff)!important;line-height:1.2!important;text-align:center!important;}',
      '.machine-number{font-size:16px!important;line-height:1.15!important;font-weight:1000!important;margin-top:7px!important;word-break:break-word!important;}',
      '.machine-info{font-size:11px!important;line-height:1.25!important;color:#64748b!important;white-space:normal!important;word-break:break-word!important;}',
      '#stepPage2 .grid-2{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;}',
      '#stepPage2 .field-label{font-size:13px!important;line-height:1.25!important;}',
      '#totalQty,#ngQty{height:54px!important;font-size:22px!important;padding:8px 10px!important;text-align:left!important;}',
      '#totalQty::placeholder,#ngQty::placeholder{font-size:15px!important;color:#9aa4b2!important;font-weight:700!important;}',
      '.stats-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;}',
      '.stat-card{min-width:0!important;padding:10px 6px!important;border-radius:16px!important;}',
      '.stat-label{font-size:11px!important;line-height:1.2!important;white-space:normal!important;}',
      '.stat-value{font-size:20px!important;line-height:1.2!important;}',
      '#startTime,#endTime{font-size:14px!important;height:48px!important;padding:7px 8px!important;}',
      'body.v457-keyboard .bottom-bar{position:sticky!important;bottom:0!important;}',
      '@media(max-width:430px){',
      '  .outer-wrap{padding-left:12px!important;padding-right:12px!important;padding-bottom:128px!important;}',
      '  #selectedProductArea .grid-3{gap:5px!important;}',
      '  #selectedProductArea .grid-3 .field-label{font-size:11px!important;}',
      '  #selectedProductArea .grid-3 input{font-size:13px!important;height:32px!important;}',
      '  #machineListGrid,.machine-grid{gap:8px!important;}',
      '  .machine-card img,.machine-img,.machine-no-img{height:66px!important;}',
      '  .machine-number{font-size:15px!important;}',
      '  #stepPage2 .grid-2{gap:8px!important;}',
      '  #totalQty,#ngQty{font-size:20px!important;height:52px!important;}',
      '  #totalQty::placeholder,#ngQty::placeholder{font-size:14px!important;}',
      '  .bottom-bar{padding-left:12px!important;padding-right:12px!important;gap:8px!important;}',
      '}',
      '@media(max-width:360px){#machineListGrid,.machine-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.stat-label{font-size:10px!important}.stat-value{font-size:18px!important}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function 照片庫(){
    var all=[];
    try{all=all.concat(DB.照片資料庫||DB.photos||DB.photoList||[]);}catch(e){}
    try{if(DB.photoIndex){Object.keys(DB.photoIndex).forEach(function(k){var v=DB.photoIndex[k];if(v&&typeof v==='object')all.push(Object.assign({關聯編號:k},v));});}}catch(e){}
    return all;
  }
  function 找照片(id){
    var key=正(id), url='';
    try{
      var machines=DB.機台清單||DB.machines||DB.machineList||[];
      var m=machines.find(function(x){return 正(x.機台編號||x.設備編號||x.編號)===key;});
      url=取(m,['照片網址','縮圖網址','圖片網址','image','photoUrl']);
      if(url)return url;
    }catch(e){}
    var photos=照片庫();
    var p=photos.find(function(x){return 正(x.類型||x.type)==='機台'&&正(x.關聯編號||x.編號||x.id)===key;});
    url=取(p,['照片網址','縮圖網址','圖片網址','url','photoUrl']);
    return url;
  }
  function 修補機台照片(){
    var grid=$('machineListGrid'); if(!grid)return;
    grid.querySelectorAll('.machine-card').forEach(function(card){
      var id=文(card.getAttribute('data-machine')||card.getAttribute('data-id')||'');
      if(!id){var num=card.querySelector('.machine-number');if(num)id=文(num.textContent);}
      if(!id)return;
      var url=找照片(id);
      var first=card.querySelector('img,.machine-no-img');
      if(url){
        if(!first || first.tagName!=='IMG'){
          var img=document.createElement('img');img.className='machine-img';img.alt='機台'+id;img.src=url;
          if(first)first.replaceWith(img);else card.insertBefore(img,card.firstChild);
        }else if(first.src!==url){first.src=url;}
      }else{
        if(!first){first=document.createElement('div');first.className='machine-no-img';card.insertBefore(first,card.firstChild);}
        if(first.tagName==='IMG')return;
        first.className='machine-no-img';
        first.innerHTML='📷<br>未設定照片';
      }
    });
  }

  function 修補輸入框(){
    var total=$('totalQty'), ng=$('ngQty');
    if(total){total.placeholder='請輸入';}
    if(ng){if(ng.value==='0')ng.value='';ng.placeholder='可留空';}
    ['totalQty','ngQty','startTime','endTime'].forEach(function(id){
      var e=$(id); if(!e||e.__v457)return; e.__v457=true;
      e.addEventListener('focus',function(){document.body.classList.add('v457-keyboard');setTimeout(function(){try{e.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){}},250);});
      e.addEventListener('blur',function(){setTimeout(function(){document.body.classList.remove('v457-keyboard');},250);});
    });
  }

  function 壓縮提醒語(){
    ['v453hint','v452hint','v451StationHint','v450StationHint','v449StationHint'].forEach(function(id){
      var e=$(id); if(!e)return;
      var t=文(e.textContent);
      if(t.length>90){
        var parts=t.split('請');
        e.innerHTML='👇 工站已帶入<br>請直接點選下方工站。';
      }
    });
  }

  function 包裝舊函數(){
    if(typeof renderMachineGrid==='function'&&!renderMachineGrid.__v457){
      var old=renderMachineGrid;
      window.renderMachineGrid=function(list){var r=old.apply(this,arguments);setTimeout(修補機台照片,20);setTimeout(修補機台照片,250);return r;};
      window.renderMachineGrid.__v457=true;
    }
    if(typeof buildMachineSelect==='function'&&!buildMachineSelect.__v457){
      var old2=buildMachineSelect;
      window.buildMachineSelect=function(list){var r=old2.apply(this,arguments);setTimeout(修補機台照片,20);return r;};
      window.buildMachineSelect.__v457=true;
    }
    if(typeof onWorkstationChange==='function'&&!onWorkstationChange.__v457){
      var old3=onWorkstationChange;
      window.onWorkstationChange=function(){var r=old3.apply(this,arguments);setTimeout(修補機台照片,150);setTimeout(壓縮提醒語,150);return r;};
      window.onWorkstationChange.__v457=true;
    }
  }

  function 安裝(){
    安裝樣式();
    包裝舊函數();
    修補輸入框();
    修補機台照片();
    壓縮提醒語();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',安裝);else 安裝();
  window.addEventListener('load',function(){安裝();setTimeout(安裝,800);});
  setInterval(安裝,1500);
  try{console.log('V4 polish loaded',版本);}catch(e){}
})();