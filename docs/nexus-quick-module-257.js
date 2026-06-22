(function(){
  'use strict';
  var V='257_quick_module_scope_fix';
  function t(v){return String(v===null||v===undefined?'':v).trim()}
  function call(action,payload){
    if(!window.GAS橋接器) return Promise.reject(new Error('GAS橋接器尚未載入'));
    return window.GAS橋接器.呼叫(action,Object.assign({},payload||{},{action:action}),{method:'POST',timeoutMs:15000});
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
        el.setAttribute('data-nexus-hidden','scope-fix-257');
      }
    });
  }
  function card(icon,title,sub,fn){
    return '<div class="module-card" data-quick="257" onclick="'+fn+'"><div class="module-icon">'+icon+'</div><div class="module-label">'+title+'<br><span style="font-size:.58rem;color:var(--text-secondary);font-weight:700">'+sub+'</span></div></div>';
  }
  function mount(){
    removeLeakedPanels();
    var tab=document.getElementById('tabContainer');
    if(!tab || !document.getElementById('app') || !document.getElementById('app').classList.contains('active')) return;
    if(document.getElementById('quick257')) return;
    var box=document.createElement('div');
    box.id='quick257';
    box.className='neu-card';
    box.style.cssText='padding:18px;margin:0 0 18px;';
    box.innerHTML='<b style="color:var(--text-primary)">⚡ 主線快速模組</b><p style="color:var(--text-secondary);font-size:.8rem;margin:6px 0 14px;line-height:1.6">主管追蹤、今日派班、主線驗收、報工入口全部收回 NEXUS OS，不再浮在畫面外面。</p><div class="module-grid">'+
      card('📋','今日派班','讀任務','NEXUS_讀今日任務257()')+
      card('📊','主管追蹤','清洗/未報','NEXUS_主管追蹤257()')+
      card('🧪','主線驗收','檢查/修復','NEXUS_主線驗收257()')+
      card('✅','報工作業','帶入報工','location.href=\'./work-report-v2.html\'')+
      card('🧹','清洗計劃','需求池','NEXUS_執行動作257(\'清洗生產計劃表38_7\')')+
      card('🗓️','自動排程','防重派班','NEXUS_執行動作257(\'自動排程38_7\')')+
      card('👤','人員註冊','工號登入','location.href=\'./register.html\'')+
      card('🏠','重新整理','KPI','NEXUS_刷新首頁257()')+
    '</div>';
    tab.prepend(box);
  }
  window.NEXUS_執行動作257=async function(action){try{out('執行中：'+action);var r=await call(action);out(r);if(window.loadHome) window.loadHome();}catch(e){out('ERR '+e.message)}};
  window.NEXUS_讀今日任務257=function(){
    var id=document.getElementById('workerId');
    if(window.loadTasks){ window.loadTasks(); return; }
    if(id) call('取得今日任務38_7',{工號:id.value}).then(out).catch(function(e){out('ERR '+e.message)});
  };
  window.NEXUS_主管追蹤257=function(){
    if(window.loadSupervisor){ window.loadSupervisor(); return; }
    call('取得主管主線追蹤38_7').then(out).catch(function(e){out('ERR '+e.message)});
  };
  window.NEXUS_主線驗收257=function(){ call('主線實機驗收38_7').then(out).catch(function(e){out('ERR '+e.message)}); };
  window.NEXUS_刷新首頁257=function(){ if(window.loadHome) window.loadHome(); mount(); };
  window.addEventListener('load',function(){setInterval(mount,1200);document.body.dataset.nexusQuickModule257=V;});
})();
