(function (全域) {
  'use strict';

  const 版本='1.2.9';
  const 入口版本='1290';

  function 文字(v){return String(v==null?'':v).trim();}
  function 可視化按鈕(){return document.getElementById('可視化導航')||Array.from(document.querySelectorAll('.導航按鈕')).find(b=>文字(b.getAttribute('data-page')||b.getAttribute('data-頁面'))==='可視化');}
  function 標記(){document.querySelectorAll('.底部導航 .導航按鈕').forEach(b=>{const p=文字(b.getAttribute('data-page')||b.getAttribute('data-頁面'));b.classList.toggle('作用中',p==='可視化'||b.id==='可視化導航');});}
  function 更新網址(){try{const u=new URL(location.href);u.searchParams.set('頁面','可視化');u.searchParams.set('v',入口版本);history.replaceState({頁面:'可視化'},'',u.toString());}catch(_){}}
  function 載入腳本(id,src){
    return new Promise((resolve,reject)=>{
      if(document.getElementById(id)){resolve();return;}
      const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=()=>resolve();s.onerror=()=>reject(new Error('腳本載入失敗：'+src));document.head.appendChild(s);
    });
  }
  async function 載入A5照片回接(){
    try{
      if(!全域.智慧5SA5內建照片)await 載入腳本('A5照片內建資料腳本',`./智慧5S_A5照片內建資料_v1290.js?v=${入口版本}`);
      if(!全域.智慧5SA5標準照片回接)await 載入腳本('A5標準照片回接腳本',`./智慧5S_A5標準照片回接_v1290.js?v=${入口版本}`);
    }catch(e){console.warn('A5照片模組載入失敗',e);}
  }
  function 顯示載入失敗(){
    const main=document.getElementById('頁面內容');if(!main)return;
    const t=document.getElementById('頁面標題');const s=document.getElementById('頁面副標');
    if(t)t.textContent='5S 可視化標準管理';if(s)s.textContent='標準照片｜責任區｜甘特｜0–4稽核';
    main.innerHTML='<section class="卡片"><div class="卡片標題">可視化核心尚未完成載入</div><div class="卡片副標" style="margin-top:6px">請按重新載入；系統不會再跳回首頁。</div><button id="可視化核心重試" class="主要按鈕 滿版" type="button" style="margin-top:12px">重新載入可視化</button></section>';
    const b=document.getElementById('可視化核心重試');if(b)b.onclick=()=>開啟(true);
  }
  function 開啟(force){
    標記();更新網址();載入A5照片回接();
    const mod=全域.智慧5S可視化管理;
    if(mod&&typeof mod.進入可視化中心==='function'){
      try{mod.進入可視化中心();標記();更新網址();return true;}catch(e){console.warn('可視化核心執行失敗',e);}
    }
    if(force){顯示載入失敗();return false;}
    [80,220,500,900,1500].forEach((ms,i)=>setTimeout(()=>{if(document.querySelector('.視覺核心'))return;const m=全域.智慧5S可視化管理;if(m&&typeof m.進入可視化中心==='function'){try{m.進入可視化中心();標記();更新網址();}catch(_){}}else if(i===4){顯示載入失敗();}},ms));
    return false;
  }
  function 點擊(e){
    const b=e.target&&e.target.closest?e.target.closest('.導航按鈕'):null;if(!b)return;
    const p=文字(b.getAttribute('data-page')||b.getAttribute('data-頁面'));
    if(!(b.id==='可視化導航'||p==='可視化'))return;
    e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    開啟(false);
  }
  function 綁定(){
    載入A5照片回接();
    const b=可視化按鈕();if(b){b.setAttribute('data-page','可視化');b.setAttribute('data-頁面','可視化');b.type='button';}
    document.addEventListener('click',點擊,true);
    const page=new URLSearchParams(location.search).get('頁面');
    if(page==='可視化'){
      let n=0;const timer=setInterval(()=>{n++;const app=document.getElementById('應用程式');if(app&&!app.classList.contains('隱藏')){clearInterval(timer);開啟(false);}else if(n>=32)clearInterval(timer);},250);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',綁定,{once:true});else綁定();
  全域.智慧5S可視化路由=Object.freeze({版本,開啟,載入A5照片回接});
})(window);
