(function(){
  'use strict';
  var V='258_quick_module_get_direct_gas';
  function t(v){return String(v===null||v===undefined?'':v).trim()}
  function gasUrl(){
    var u=(window.PWA_CONFIG&&window.PWA_CONFIG.GAS_WEB_APP_URL)||'';
    if(!u) throw new Error('PWA_CONFIG.GAS_WEB_APP_URL 未設定');
    return u;
  }
  function query(params){
    var sp=new URLSearchParams();
    Object.keys(params||{}).forEach(function(k){
      var v=params[k];
      if(v===undefined||v===null) return;
      if(typeof v==='object') v=JSON.stringify(v);
      sp.set(k,String(v));
    });
    return sp.toString();
  }
  async function call(action,payload){
    var p=Object.assign({},payload||{},{action:action,'動作':action,'_ts':Date.now()});
    var url=gasUrl()+'?'+query(p);
    var ctrl=new AbortController();
    var timer=setTimeout(function(){try{ctrl.abort()}catch(e){}},15000);
    try{
      var res=await fetch(url,{method:'GET',cache:'no-store',redirect:'follow',signal:ctrl.signal});
      var text=await res.text();
      try{return JSON.parse(text)}catch(e){return {成功:false,success:false,error:'NON_JSON_RESPONSE',status:res.status,body:text.slice(0,1200)}}
    }finally{
      clearTimeout(timer);
    }
  }
  function out(x){
    var el=document.getElementById('sysOut');
    if(el) el.textContent=typeof x==='string'?x:JSON.stringify(x,null,2);
  }
  function removeLeakedPanels(){
    Array.from(document.body.children).forEach(function(el){
      if(!el || !el.textContent) return;
      if(['app','login-page','screen-lock','webgl-bg','modulePanel','hud-overlay'].indexOf(el.id)>=0) return;
      if(el.closest && el.closest('#app')) return;
      var txt=t(el.textContent);
      var pos=getComputedStyle(el).position;
      if((pos==='fixed'||pos==='absolute') && /今日派班|主管追蹤|通報報工外掛/.test(txt)){
        el.style.display='none';
        el.setAttribute('data-nexus-hidden','scope-fix-258');
      }
    });
  }
  function card(icon,title,sub,fn){
    return '<div class="module-card" data-quick="258" onclick="'+fn+'"><div class="module-icon">'+icon+'</div><div class="module-label">'+title+'<br><span style="font-size:.58rem;color:var(--text-secondary);font-weight:700">'+sub+'</span></div></div>';
  }
  function mount(){
    removeLeakedPanels();
    var tab=document.getElementById('tabContainer');
    if(!tab || !document.getElementById('app') || !document.getElementById('app').classList.contains('active')) return;
    var old=document.getElementById('quick257');
    if(old) old.remove();
    if(document.getElementById('quick258')) return;
    var box=document.createElement('div');
    box.id='quick258';
    box.className='neu-card';
    box.style.cssText='padding:18px;margin:0 0 18px;';
    box.innerHTML='<b style="color:var(--text-primary)">⚡ 主線快速模組</b><p style="color:var(--text-secondary);font-size:.8rem;margin:6px 0 14px;line-height:1.6">258 版：主線驗收、清洗、排程、今日任務、主管追蹤改走 GAS GET 直連，避開舊 POST 橋接 UNKNOWN_ACTION。</p><div class="module-grid">'+
      card('📋','今日派班','讀任務','NEXUS_讀今日任務258()')+
      card('📊','主管追蹤','清洗/未報','NEXUS_主管追蹤258()')+
      card('🧪','主線驗收','檢查/修復','NEXUS_主線驗收258()')+
      card('🛠️','主線修復','補齊欄位','NEXUS_執行動作258(\'主線一鍵修復38_7\')')+
      card('✅','報工作業','帶入報工','location.href=\'./work-report-v2.html?v=258\'')+
      card('🧹','清洗計劃','需求池','NEXUS_執行動作258(\'清洗生產計劃表38_7\')')+
      card('🗓️','自動排程','防重派班','NEXUS_執行動作258(\'自動排程38_7\')')+
      card('👤','人員註冊','工號登入','location.href=\'./register.html?v=258\'')+
      card('🏠','重新整理','KPI','NEXUS_刷新首頁258()')+
    '</div>';
    tab.prepend(box);
  }
  window.NEXUS_執行動作258=async function(action,payload){
    try{out('執行中：'+action);var r=await call(action,payload);out(r);if(window.loadHome) window.loadHome();}
    catch(e){out({成功:false,success:false,error:'FRONTEND_GET_CALL_FAILED',message:e.message})}
  };
  window.NEXUS_讀今日任務258=function(){
    var id=document.getElementById('workerId');
    var 工號=id?id.value:'';
    window.NEXUS_執行動作258('取得今日任務38_7',{工號:工號});
  };
  window.NEXUS_主管追蹤258=function(){ window.NEXUS_執行動作258('取得主管主線追蹤38_7'); };
  window.NEXUS_主線驗收258=function(){ window.NEXUS_執行動作258('主線實機驗收38_7'); };
  window.NEXUS_刷新首頁258=function(){ if(window.loadHome) window.loadHome(); mount(); };
  window.addEventListener('load',function(){setInterval(mount,1200);document.body.dataset.nexusQuickModule258=V;});
})();
