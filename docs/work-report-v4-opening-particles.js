/* 化新報工 V4｜CSS 粒子群開場 v4.8.4 */
(function(){
  'use strict';
  function 啟動(){
    var 舊=document.getElementById('loadingScreen');
    if(舊) 舊.style.display='none';
    if(document.getElementById('化新粒子開場')) return;
    var 外=document.createElement('div');
    外.id='化新粒子開場';
    外.innerHTML='<div class="粒子光暈 大"></div><div class="粒子光暈 中"></div><div class="粒子舞台" id="粒子舞台"></div><div class="開場文字"><b>化新精密有限公司</b><span>製造部｜製一組 · 報工作業V4</span></div><div class="開場階段" id="開場階段">✦ 連結數據庫 ✦</div>';
    document.body.appendChild(外);
    var 樣式=document.createElement('style');
    樣式.textContent='#化新粒子開場{position:fixed;inset:0;z-index:12000;background:#0a2a5e;overflow:hidden;display:flex;align-items:center;justify-content:center}#化新粒子開場.關閉{animation:開場淡出 .7s ease forwards}@keyframes 開場淡出{to{opacity:0;visibility:hidden;pointer-events:none}}.粒子光暈{position:absolute;border-radius:50%;pointer-events:none}.粒子光暈.大{width:150vw;height:150vw;max-width:900px;max-height:900px;background:radial-gradient(circle,rgba(30,120,220,.42),transparent 72%)}.粒子光暈.中{width:120vw;height:120vw;max-width:620px;max-height:620px;background:radial-gradient(circle,rgba(255,210,80,.52),rgba(30,100,200,.25) 58%,transparent 82%)}.粒子舞台{position:absolute;inset:0;filter:drop-shadow(0 0 9px rgba(255,217,102,.75))}.粒子{position:absolute;width:3px;height:3px;border-radius:50%;left:50%;top:50%;background:#e8f0ff;animation:粒子流程 6.4s cubic-bezier(.4,0,.2,1) forwards}.粒子.金{background:#ffd966}.粒子.紅{background:#d4505e}@keyframes 粒子流程{0%{transform:translate(var(--sx),var(--sy)) scale(.45);opacity:.12}34%{transform:translate(var(--lx),var(--ly)) scale(1);opacity:1}52%{transform:translate(var(--lx),var(--ly)) scale(1.9);opacity:1}61%{transform:translate(var(--ex),var(--ey)) scale(.7);opacity:.8}91%{transform:translate(var(--tx),var(--ty)) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(1);opacity:1}}.開場文字{position:relative;z-index:3;text-align:center;color:#fff;text-shadow:0 0 20px rgba(255,217,102,.8),0 0 40px rgba(100,180,255,.7);opacity:0;animation:文字出現 6.4s ease forwards}.開場文字 b{display:block;font-size:30px;letter-spacing:.08em}.開場文字 span{display:block;margin-top:9px;font-size:14px;color:#ffd966;font-weight:900;letter-spacing:.14em}.開場階段{position:fixed;bottom:calc(38px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:4;color:rgba(255,220,100,.9);font-size:14px;letter-spacing:.24em;font-weight:900;white-space:nowrap;text-shadow:0 0 12px rgba(255,200,50,.75),0 0 25px rgba(100,180,255,.55)}@keyframes 文字出現{0%,55%{opacity:0;transform:scale(.96)}78%,100%{opacity:1;transform:scale(1)}}@media(max-width:420px){.開場文字 b{font-size:24px}.開場文字 span{font-size:11px}.開場階段{font-size:11px;letter-spacing:.16em;width:100%;text-align:center}}';
    document.head.appendChild(樣式);
    var 舞台=document.getElementById('粒子舞台');
    var w=innerWidth,h=innerHeight,count=w<430?900:1500;
    for(var i=0;i<count;i++){
      var p=document.createElement('i');
      p.className='粒子 '+(i%7===0?'金':i%5===0?'紅':'');
      var a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*Math.max(w,h)*.68;
      var row=Math.floor(i/60),col=i%60;
      var lx=(col-30)*5+(Math.random()*8-4),ly=(row-12)*5+(Math.random()*8-4);
      var tx=(col-30)*6+(Math.random()*4-2),ty=(row-12)*6+(Math.random()*4-2);
      p.style.setProperty('--sx',Math.cos(a)*r+'px');
      p.style.setProperty('--sy',Math.sin(a)*r+'px');
      p.style.setProperty('--lx',lx+'px');
      p.style.setProperty('--ly',ly+'px');
      p.style.setProperty('--ex',(lx*3+Math.random()*260-130)+'px');
      p.style.setProperty('--ey',(ly*3+Math.random()*260-130)+'px');
      p.style.setProperty('--tx',tx+'px');
      p.style.setProperty('--ty',ty+'px');
      p.style.animationDelay=(Math.random()*.25)+'s';
      舞台.appendChild(p);
    }
    var 階=document.getElementById('開場階段');
    setTimeout(function(){階.textContent='✦ 製慧工廠資料庫 ✦';},2200);
    setTimeout(function(){階.textContent='✦ HS 5.0 ✦';},3400);
    setTimeout(function(){階.textContent='✦ 化新精密有限公司 ✦';},3950);
    setTimeout(function(){階.textContent='製造部｜製一組 · 報工作業V4';},5800);
    setTimeout(function(){外.classList.add('關閉');setTimeout(function(){外.remove();},760);},6900);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',啟動,{once:true});else 啟動();
})();
