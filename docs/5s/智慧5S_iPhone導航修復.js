(function (全域) {
  'use strict';

  /** 製一｜智慧5S iPhone / PWA 導航與頁首修復 v1.3.0 */
  const 版本='1.3.0';
  const 入口版本='1300';
  const 順序=['首頁','巡檢','改善','紅牌','可視化','設定'];
  const 核心頁面=new Set(['首頁','巡檢','改善','紅牌','設定']);
  const 原始事件=new WeakMap();
  let 正在備援=false;

  function 文字(v){return String(v==null?'':v).trim();}
  function 頁面(btn){
    if(!btn)return'';
    const a=文字(btn.getAttribute('data-page'));if(a)return a;
    const b=文字(btn.getAttribute('data-頁面'));if(b)return b;
    const t=文字(btn.textContent).replace(/\s+/g,'');
    return 順序.find(p=>t.includes(p))||'';
  }
  function 標記(page){document.querySelectorAll('.底部導航 .導航按鈕').forEach(b=>b.classList.toggle('作用中',頁面(b)===page));}
  function 更新網址(page){try{const u=new URL(location.href);u.searchParams.set('頁面',page);u.searchParams.set('v',入口版本);history.replaceState({頁面:page},'',u.toString());}catch(_){}}
  function 已完成(page){
    if(page==='可視化')return !!document.querySelector('.視覺核心');
    const title=文字(document.getElementById('頁面標題')?.textContent);
    const map={首頁:'戰情',巡檢:'巡檢',改善:'改善',紅牌:'紅牌',設定:'設定'};
    return title.includes(map[page]||page);
  }
  function 補強機台履歷入口(){
    const mod=全域.智慧5S機台履歷;
    if(mod&&typeof mod.補強履歷按鈕==='function'){
      try{mod.補強履歷按鈕();}catch(_){}
    }
  }
  function 排程機台履歷入口(){[180,450,900,1500,2400].forEach(ms=>setTimeout(補強機台履歷入口,ms));}
  function 備援(page){
    if(正在備援)return;正在備援=true;
    try{const u=new URL(location.href);u.searchParams.set('頁面',page);u.searchParams.set('v',入口版本);location.assign(u.toString());}
    catch(_){location.href=`./index.html?頁面=${encodeURIComponent(page)}&v=${入口版本}`;}
  }
  function 執行核心(btn,page,e){
    標記(page);
    try{
      btn.setAttribute('data-page',page);btn.setAttribute('data-頁面',page);
      const fn=原始事件.get(btn);
      if(typeof fn==='function')fn.call(btn,e);
      更新網址(page);
      if(page==='巡檢')排程機台履歷入口();
      setTimeout(()=>{if(!已完成(page))備援(page);},1200);
    }catch(err){console.warn('智慧5S導航執行失敗',err);備援(page);}
  }
  function 執行可視化(page){
    標記(page);
    const mod=全域.智慧5S可視化管理;
    if(mod&&typeof mod.進入可視化中心==='function'){
      try{mod.進入可視化中心();更新網址(page);return;}catch(err){console.warn('可視化開啟失敗',err);}
    }
    const route=全域.智慧5S可視化路由;
    if(route&&typeof route.開啟==='function'){
      try{route.開啟(true);return;}catch(err){console.warn('可視化路由失敗',err);}
    }
    備援(page);
  }
  function 點擊(e){
    const btn=e.currentTarget||e.target.closest('.導航按鈕');
    const page=頁面(btn);if(!page)return;
    e.preventDefault();
    if(page==='可視化')執行可視化(page);else if(核心頁面.has(page))執行核心(btn,page,e);
  }
  function 綁定(btn){
    if(!btn)return;
    const page=頁面(btn);if(!順序.includes(page))return;
    btn.setAttribute('data-page',page);btn.setAttribute('data-頁面',page);
    btn.style.touchAction='manipulation';
    if(btn.dataset.iphoneNavFix==='130')return;
    if(typeof btn.onclick==='function')原始事件.set(btn,btn.onclick);
    btn.onclick=null;
    btn.addEventListener('click',點擊,false);
    btn.dataset.iphoneNavFix='130';
  }
  function 整理(){
    const nav=document.querySelector('.底部導航');if(!nav)return;
    const all=Array.from(nav.querySelectorAll('.導航按鈕'));
    all.forEach(b=>{if(!順序.includes(頁面(b)))b.remove();});
    const remain=Array.from(nav.querySelectorAll('.導航按鈕'));
    順序.forEach(p=>{const b=remain.find(x=>頁面(x)===p);if(b){綁定(b);nav.appendChild(b);}});
  }
  function 樣式(){
    document.getElementById('智慧5S_iPhone導航修復樣式')?.remove();
    const s=document.createElement('style');s.id='智慧5S_iPhone導航修復樣式';s.textContent=`
      .底部導航{z-index:9998!important;pointer-events:auto!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:2px!important;overflow:visible!important;isolation:isolate}
      .底部導航 .導航按鈕{pointer-events:auto!important;touch-action:manipulation!important;min-width:0!important;width:100%!important;padding:7px 1px!important;-webkit-tap-highlight-color:transparent;position:relative;z-index:1}
      .底部導航 .導航按鈕>span:last-child{font-size:10.5px!important;white-space:nowrap!important}
      .底部導航 .導航圖示{font-size:17px!important}
      .底部導航::before,.底部導航::after{pointer-events:none!important}
      .頂端列{overflow:visible!important;isolation:isolate;padding-right:calc(10px + env(safe-area-inset-right))!important}
      .頂端列>.品牌列{flex:1 1 auto!important;min-width:0!important;max-width:none!important;overflow:hidden!important}
      .頂端列>.品牌列>.品牌標誌{flex:0 0 42px!important}
      .頂端資訊{min-width:0!important;overflow:hidden!important}
      .狀態列{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;flex:0 0 auto!important;min-width:max-content!important;max-width:none!important;overflow:visible!important;position:relative!important;z-index:60!important}
      .狀態列>*{flex-shrink:0!important}
      .狀態列 button,.全螢幕按鈕,.Roar事件按鈕,.頭像{overflow:visible!important;clip-path:none!important}
      .全螢幕按鈕,.Roar事件按鈕,.頭像{flex:0 0 42px!important;width:42px!important;min-width:42px!important;height:42px!important;min-height:42px!important;margin:0!important}
      .Roar事件按鈕{position:relative!important;z-index:66!important;line-height:1!important}
      .Roar事件按鈕>span:first-child{display:grid!important;place-items:center!important;width:100%!important;height:100%!important;position:relative!important;z-index:1!important;transform:none!important}
      .Roar未讀數{z-index:72!important;right:-5px!important;top:-6px!important;overflow:visible!important;pointer-events:none!important;transform:none!important}
      .全螢幕按鈕{z-index:64!important}.頭像{z-index:62!important}
      @media(max-width:430px){
        .頂端列{gap:7px!important;padding-left:10px!important;padding-right:calc(8px + env(safe-area-inset-right))!important}
        .頂端列>.品牌列{gap:8px!important}.頂端列>.品牌列>.品牌標誌{flex-basis:40px!important;width:40px!important;height:40px!important;min-width:40px!important}
        .頁面標題{font-size:1.02rem!important}.頁面副標{font-size:.61rem!important}.狀態列{gap:5px!important}
        .狀態徽章{width:22px!important;min-width:22px!important;height:40px!important;min-height:40px!important;padding:0!important;background:transparent!important;display:grid!important;place-items:center!important;overflow:visible!important}
        .狀態徽章>span:last-child{display:none!important}.狀態點{margin:0!important}
        .全螢幕按鈕,.Roar事件按鈕,.頭像{flex-basis:40px!important;width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important}
      }
      @media(max-width:370px){.頁面副標{display:none!important}.頂端列>.品牌列{gap:6px!important}.狀態列{gap:4px!important}}
    `;document.head.appendChild(s);
  }
  function 更新ServiceWorker(){
    if(!('serviceWorker'in navigator))return;
    navigator.serviceWorker.register(`./離線服務.js?v=${入口版本}`,{scope:'./'}).then(reg=>{if(reg.waiting)reg.waiting.postMessage('立即啟用新版');reg.update().catch(()=>{});}).catch(()=>{});
  }
  function 初始化(){樣式();setTimeout(整理,0);setTimeout(整理,250);setTimeout(整理,900);更新ServiceWorker();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',初始化,{once:true});else 初始化();
  全域.智慧5SiPhone導航修復=Object.freeze({版本,整理,樣式,排程機台履歷入口});
})(window);
