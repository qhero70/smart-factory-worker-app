(function (全域) {
  'use strict';

  const 版本='1.2.2';
  const 入口版本='1220';
  const 順序=['首頁','巡檢','改善','紅牌','可視化','設定'];
  const 核心頁面=new Set(['首頁','巡檢','改善','紅牌','設定']);
  const 原始事件=new WeakMap();
  let 正在備援=false;

  function 文字(v){return String(v==null?'':v).trim();}
  function 從按鈕取得頁面(btn){
    if(!btn)return'';
    const ascii=文字(btn.getAttribute('data-page'));if(ascii)return ascii;
    const legacy=文字(btn.getAttribute('data-頁面'));if(legacy)return legacy;
    if(btn.id==='可視化導航')return'可視化';
    const t=文字(btn.textContent).replace(/\s+/g,'');
    return 順序.find(p=>t.includes(p))||'';
  }
  function 標記作用中(page){document.querySelectorAll('.底部導航 .導航按鈕').forEach(btn=>btn.classList.toggle('作用中',從按鈕取得頁面(btn)===page));}
  function 更新網址(page){try{const url=new URL(location.href);url.searchParams.set('頁面',page);url.searchParams.set('v',入口版本);history.replaceState({頁面:page},'',url.toString());}catch(_){}}
  function 頁面已切換(page){
    const title=文字(document.getElementById('頁面標題')?.textContent);
    const map={首頁:'戰情',巡檢:'巡檢',改善:'改善',紅牌:'紅牌',設定:'設定'};
    return page==='可視化'?!!document.querySelector('.可視化頁'):title.includes(map[page]||page);
  }
  function URL備援(page){
    if(正在備援)return;正在備援=true;
    const url=new URL(location.href);url.searchParams.set('頁面',page);url.searchParams.set('v',入口版本);location.assign(url.toString());
  }
  function 執行核心(btn,page,e){
    標記作用中(page);
    const fn=原始事件.get(btn);
    try{
      btn.setAttribute('data-頁面',page);btn.setAttribute('data-page',page);
      if(typeof fn==='function')fn.call(btn,e);
      更新網址(page);
      requestAnimationFrame(()=>{if(頁面已切換(page))return;setTimeout(()=>{if(!頁面已切換(page))URL備援(page);},220);});
    }catch(err){console.warn('智慧5S單頁導覽失敗，改用網址備援',err);URL備援(page);}
  }
  function 執行可視化(page){
    標記作用中(page);
    const mod=全域.智慧5S可視化管理;
    if(mod&&typeof mod.進入可視化中心==='function'){
      try{mod.進入可視化中心();更新網址(page);return;}catch(err){console.warn('可視化中心開啟失敗',err);}
    }
    URL備援(page);
  }
  function 處理導覽(e){
    const btn=e.currentTarget||e.target.closest('.導航按鈕');
    const page=從按鈕取得頁面(btn);if(!page)return;
    e.preventDefault();
    if(page==='可視化')執行可視化(page);else if(核心頁面.has(page))執行核心(btn,page,e);
  }
  function 綁定按鈕(btn){
    if(!btn)return;
    const page=從按鈕取得頁面(btn);if(!page)return;
    btn.setAttribute('data-page',page);btn.setAttribute('data-頁面',page);btn.style.touchAction='manipulation';
    if(btn.dataset.iphoneNavFix==='122')return;
    if(typeof btn.onclick==='function')原始事件.set(btn,btn.onclick);
    btn.onclick=null;
    btn.addEventListener('click',處理導覽,false);
    btn.dataset.iphoneNavFix='122';
  }
  function 整理順序(){
    const nav=document.querySelector('.底部導航');if(!nav)return;
    const buttons=Array.from(nav.querySelectorAll('.導航按鈕'));
    順序.forEach(page=>{const b=buttons.find(x=>從按鈕取得頁面(x)===page);if(b)nav.appendChild(b);});
  }
  function 綁定全部導航(){document.querySelectorAll('.底部導航 .導航按鈕').forEach(綁定按鈕);整理順序();}
  function 注入樣式(){
    document.getElementById('智慧5S_iPhone導航修復樣式')?.remove();
    const s=document.createElement('style');s.id='智慧5S_iPhone導航修復樣式';s.textContent=`
      .底部導航{z-index:9998!important;pointer-events:auto!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:2px!important;overflow:visible!important;isolation:isolate}
      .底部導航 .導航按鈕{pointer-events:auto!important;touch-action:manipulation;min-width:0!important;width:100%!important;padding-left:2px!important;padding-right:2px!important;-webkit-tap-highlight-color:transparent;position:relative;z-index:1}
      .底部導航 .導航按鈕>span:last-child{font-size:11px!important;white-space:nowrap}
      .底部導航 .導航圖示{font-size:18px!important}
      .底部導航::before,.底部導航::after{pointer-events:none!important}
      @media(max-width:390px){.底部導航 .導航按鈕>span:last-child{font-size:10px!important}.底部導航 .導航圖示{font-size:17px!important}}
    `;document.head.appendChild(s);
  }
  function 更新ServiceWorker(){
    if(!('serviceWorker'in navigator))return;
    navigator.serviceWorker.register(`./離線服務.js?v=${入口版本}`,{scope:'./'}).then(reg=>{if(reg.waiting)reg.waiting.postMessage('立即啟用新版');reg.update().catch(()=>{});}).catch(err=>console.warn('v1.2.2離線服務更新失敗',err));
  }
  function 初始化(){
    注入樣式();綁定全部導航();更新ServiceWorker();
    const nav=document.querySelector('.底部導航');if(nav){const obs=new MutationObserver(()=>requestAnimationFrame(綁定全部導航));obs.observe(nav,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',初始化,{once:true});else初始化();
  全域.智慧5SiPhone導航修復=Object.freeze({版本,綁定全部導航});
})(window);
