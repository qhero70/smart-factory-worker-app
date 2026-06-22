(function(){
  'use strict';
  function t(v){return String(v===null||v===undefined?'':v).trim()}
  function e(v){return t(v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function call(action,payload){return window.GAS橋接器.呼叫(action,Object.assign({},payload||{},{action:action}),{method:'POST',timeoutMs:12000})}
  function mount(){
    if(document.getElementById('track254'))return;
    var main=document.querySelector('main.頁面')||document.body;
    var sec=document.createElement('section');sec.id='track254';sec.className='卡';
    sec.innerHTML='<h2>主管追蹤</h2><div class="按鈕格"><button class="按鈕 藍" id="btnTrack254">主管總覽</button><button class="按鈕 黃" id="btnClean254">清洗錯誤</button><button class="按鈕 粉" id="btnUnreport254">未報工</button><button class="按鈕 綠" id="btnRefresh254">重新整理</button></div><div id="trackResult254" class="提示">等待讀取。</div>';
    main.appendChild(sec);
    document.getElementById('btnTrack254').onclick=readAll;
    document.getElementById('btnClean254').onclick=readClean;
    document.getElementById('btnUnreport254').onclick=readUnreport;
    document.getElementById('btnRefresh254').onclick=function(){if(window.讀取儀表板)window.讀取儀表板();readAll()};
  }
  function out(html){var el=document.getElementById('trackResult254');if(el)el.innerHTML=html}
  function rows(list,kind){
    if(!list||!list.length)return '<p class="提示">目前沒有資料。</p>';
    return list.slice(0,40).map(function(x){
      if(kind==='clean')return '<div class="任務"><b>'+e(x.修正品名||x.原始品名||x.產品編號||'待確認')+'</b><small>產品：'+e(x.產品編號)+'｜工站：'+e(x.建議工站||'待補')+'｜機台：'+e(x.建議機台||'待補')+'｜'+e(x.備註)+'</small></div>';
      return '<div class="任務"><b>'+e(x.姓名)+'｜'+e(x.品名||x.產品編號)+'</b><small>派班：'+e(x.派班編號)+'｜工站：'+e(x.工站名稱)+'｜機台：'+e(x.機台編號)+'｜狀態：'+e(x.狀態||'待報工')+'</small></div>';
    }).join('');
  }
  async function readClean(){mount();out('讀取清洗錯誤中...');try{var d=await call('取得清洗錯誤報告38_7');out('<p class="提示">異常 '+e(d.異常筆數||0)+'｜品名 '+e(d.品名待確認||0)+'｜途程 '+e(d.途程待補||0)+'｜機台 '+e(d.機台待補||0)+'</p>'+rows(d.異常清單,'clean'))}catch(err){out('清洗錯誤報告尚未接通：'+e(err.message))}}
  async function readUnreport(){mount();out('讀取未報工中...');try{var d=await call('取得未報工追蹤38_7');out('<p class="提示">今日派班 '+e(d.今日派班數||0)+'｜已報工 '+e(d.已報工||0)+'｜未報工 '+e(d.未報工||0)+'</p>'+rows(d.未報工清單,'dispatch'))}catch(err){out('未報工追蹤尚未接通：'+e(err.message))}}
  async function readAll(){mount();out('讀取主管總覽中...');try{var d=await call('取得主管主線追蹤38_7');var c=d.清洗錯誤報告||{},u=d.未報工追蹤||{};out('<p class="提示">清洗異常 '+e(c.異常筆數||0)+'｜未報工 '+e(u.未報工||0)+'｜已報工 '+e(u.已報工||0)+'</p>'+rows(u.未報工清單,'dispatch'))}catch(err){out('主管總覽尚未接通：'+e(err.message))}}
  function hookOpen(){if(!window.開啟任務報工||window.__track254)return;window.__track254=true;var old=window.開啟任務報工;window.開啟任務報工=function(i){var task=(window.NEXUS_OS_任務列表||[])[i];if(task&&task.派班編號&&window.GAS橋接器){call('更新今日派班狀態細分38_7',{派班編號:task.派班編號,狀態:'已帶入'}).finally(function(){old(i)});return}old(i)}}
  window.addEventListener('load',function(){mount();setTimeout(hookOpen,700);setTimeout(hookOpen,1800)});
})();
