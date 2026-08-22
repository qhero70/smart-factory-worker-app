(function (全域) {
  'use strict';

  /** 製一｜智慧5S iPhone / PWA 導航修復 v1.2.3 */
  const 版本='1.2.3';
  const 入口版本='1230';
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
    if(page==='可視化')return !!document.querySelector('.可視化頁');
    const title=文字(document.getElementById('頁面標題')?.textContent);
    const map={首頁:'戰情',巡檢:'巡檢',改善:'改善',紅牌:'紅牌',設定:'設定'};
    return title.includes(map[page]||page);
  }
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
      // 舊版220ms就強制整頁重載，4G/iPhone上會造成「按一下卡幾秒」。
      // 新版只在1.2秒後確認真的沒有切頁才使用URL備援。
      setTimeout(()=>{if(!已完成(page))備援(page);},1200);
    }catch(err){console.warn('智慧5S導航執行失敗',err);備援(page);}
  }
  function 執行可視化(page){
    標記(page);
    const mod=全域.智慧5S可視化管理;
    if(mod&&typeof mod.進入可視化中心==='function'){
      try{mod.進入可視化中心();更新網址(page);return;}catch(err){console.warn('可視化開啟失敗',err);}
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
    if(btn.dataset.iphoneNavFix==='123')return;
    if(typeof btn.onclick==='function')原始事件.set(btn,btn.onclick);
    btn.onclick=null;
    btn.addEventListener('click',點擊,false);
    btn.dataset.iphoneNavFix='123';
  }
  function 整理(){
    const nav=document.querySelector('.底部導航');if(!nav)return;
    const all=Array.from(nav.querySelectorAll('.導航按鈕'));
    // 底部只保留6個核心入口，A5/製一組等功能改由首頁快速作業進入。
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
    `;document.head.appendChild(s);
  }
  function 更新ServiceWorker(){
    if(!('serviceWorker'in navigator))return;
    navigator.serviceWorker.register(`./離線服務.js?v=${入口版本}`,{scope:'./'}).then(reg=>{if(reg.waiting)reg.waiting.postMessage('立即啟用新版');reg.update().catch(()=>{});}).catch(()=>{});
  }
  function 初始化(){
    樣式();
    setTimeout(整理,0);setTimeout(整理,250);setTimeout(整理,900);
    更新ServiceWorker();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',初始化,{once:true});else初始化();
  全域.智慧5SiPhone導航修復=Object.freeze({版本,整理});
})(window);
