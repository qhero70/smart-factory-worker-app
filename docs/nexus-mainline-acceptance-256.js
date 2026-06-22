(function(){
  'use strict';
  function t(v){return String(v===null||v===undefined?'':v).trim()}
  function e(v){return t(v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function call(action,payload){return window.GAS橋接器.呼叫(action,Object.assign({},payload||{},{action:action}),{method:'POST',timeoutMs:15000})}
  function mount(){
    if(document.getElementById('accept256'))return;
    var main=document.querySelector('main .tab-container')||document.getElementById('tabContainer')||document.body;
    var box=document.createElement('section');box.id='accept256';box.className='neu-card';box.style.cssText='padding:18px;margin:16px 0';
    box.innerHTML='<b>38.7 主線實機驗收</b><p style="color:var(--text-secondary);font-size:.8rem;margin-top:6px">檢查清洗、需求池、排程、今日派班、工單同步必要分頁與欄位。</p><div class="action-row"><button onclick="NEXUS_主線驗收256()">主線驗收</button><button onclick="NEXUS_主線修復256()">一鍵修復欄位</button></div><pre id="acceptOut256" class="neu-inset" style="white-space:pre-wrap;padding:14px;min-height:90px;color:var(--text-primary)">等待執行。</pre>';
    main.prepend(box);
  }
  window.NEXUS_主線驗收256=async function(){mount();var out=document.getElementById('acceptOut256');out.textContent='主線驗收中...';try{out.textContent=JSON.stringify(await call('主線實機驗收38_7'),null,2)}catch(err){out.textContent='ERR '+e(err.message)}};
  window.NEXUS_主線修復256=async function(){mount();var out=document.getElementById('acceptOut256');out.textContent='一鍵修復欄位中...';try{out.textContent=JSON.stringify(await call('主線一鍵修復38_7'),null,2)}catch(err){out.textContent='ERR '+e(err.message)}};
  window.addEventListener('load',function(){setTimeout(mount,900);setTimeout(mount,2200)});
})();
