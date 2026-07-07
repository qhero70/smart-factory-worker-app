/* 化新報工 V4｜v4.8.9 粒子群開場
 * 依現場需求：只保留粒子群，不顯示舊版 Logo / 文字 / 四色點 / 進度條。
 */
(function(){
  'use strict';
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
  ready(function(){
    var old=document.getElementById('loadingScreen');
    if(old){old.style.display='none';old.classList.add('hidden');}
    if(document.getElementById('化新純粒子開場'))return;
    var style=document.createElement('style');
    style.id='化新純粒子開場樣式';
    style.textContent='#loadingScreen{display:none!important}#化新純粒子開場{position:fixed;inset:0;z-index:12000;background:radial-gradient(circle at 50% 42%,#1558c8 0%,#0a2a5e 42%,#050b1a 100%);overflow:hidden;pointer-events:none}#化新純粒子開場.關閉{animation:化新純粒子淡出 .68s ease forwards}@keyframes 化新純粒子淡出{to{opacity:0;visibility:hidden}}#化新純粒子開場 canvas{width:100%;height:100%;display:block}.粒子淡光{position:absolute;inset:auto;border-radius:999px;filter:blur(58px);opacity:.42}.粒子淡光.a{width:320px;height:320px;left:50%;top:40%;transform:translate(-50%,-50%);background:#4285f4}.粒子淡光.b{width:260px;height:260px;right:-60px;bottom:18%;background:#34a853}.粒子淡光.c{width:230px;height:230px;left:-50px;top:12%;background:#fbbc04}';
    document.head.appendChild(style);
    var wrap=document.createElement('div');
    wrap.id='化新純粒子開場';
    wrap.innerHTML='<div class="粒子淡光 a"></div><div class="粒子淡光 b"></div><div class="粒子淡光 c"></div><canvas id="化新純粒子畫布"></canvas>';
    document.body.appendChild(wrap);
    var canvas=document.getElementById('化新純粒子畫布');
    var ctx=canvas.getContext('2d');
    var w=0,h=0,dpr=1,ps=[];
    function resize(){dpr=Math.min(window.devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);build();}
    function build(){var n=w<430?760:1300;ps=[];for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,r=Math.pow(Math.random(),.52)*Math.max(w,h)*.55;ps.push({x:w/2+Math.cos(a)*r,y:h/2+Math.sin(a)*r,vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45,z:Math.random()*2.4+.6,p:Math.random()*6.28,c:i%7===0?'rgba(255,217,102,':i%5===0?'rgba(52,168,83,':'rgba(232,240,255,'});}}
    resize();addEventListener('resize',resize,{passive:true});
    var start=performance.now();
    function frame(now){var t=(now-start)/1000;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';for(var i=0;i<ps.length;i++){var p=ps[i];var dx=p.x-w/2,dy=p.y-h/2;var ang=Math.atan2(dy,dx)+.004*p.z;var rad=Math.sqrt(dx*dx+dy*dy)+Math.sin(t*1.8+p.p)*.25;p.x=w/2+Math.cos(ang)*rad+p.vx;p.y=h/2+Math.sin(ang)*rad+p.vy;var alpha=.28+.55*(Math.sin(t*3+p.p)*.5+.5);ctx.fillStyle=p.c+alpha+')';ctx.beginPath();ctx.arc(p.x,p.y,p.z,0,Math.PI*2);ctx.fill();}ctx.globalCompositeOperation='source-over';if(t<2.85)requestAnimationFrame(frame);else{wrap.classList.add('關閉');setTimeout(function(){if(wrap.parentNode)wrap.remove();},760);}}
    requestAnimationFrame(frame);
  });
})();
