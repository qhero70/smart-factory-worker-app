/* 化新報工 V4｜新上傳版開場 v4.8.5
 * 來源：使用者新上傳「開場.txt」迪士尼藍星河流版本。
 * 目的：在報工作業 PWA 啟動時，以藍金光暈、星河粒子、Logo 聚合、爆散、文字聚合完成開場。
 */
(function(){
  'use strict';
  const 開場設定={
    Three來源:'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    粒子數:50000,
    手機粒子數:32000,
    球半徑:320,
    Logo比例:1.18,
    文字比例:0.92,
    主文字:'化新精密有限公司',
    副文字:'製造部',
    完成文字:'製造部｜製一組 · 報工作業V4',
    背景色:0x0a2a5e,
    階段秒:{聚合Logo:2.2,閃耀停留:1.2,爆散:0.55,聚合文字:2.0,完成停留:0.9}
  };
  const 階段標籤={聚合:'✦ 連結數據庫 ✦',閃耀:'✦ 製慧工廠資料庫 ✦',爆散:'✦ HS 5.0 ✦',文字:'✦ 化新精密有限公司 ✦',完成:'製造部｜製一組 · 報工作業V4'};
  let 畫面,載入字,階段字,中央光,寬光;
  function 等待DOM(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
  function 建立畫面(){
    const 舊=document.getElementById('loadingScreen');
    if(舊) 舊.style.display='none';
    const 既有=document.getElementById('化新新上傳開場');
    if(既有) 既有.remove();
    畫面=document.createElement('div');
    畫面.id='化新新上傳開場';
    畫面.innerHTML='<div id="化新開場載入">✦ 系統載入中 ✦</div><div id="化新開場階段"></div><div class="化新開場光暈" id="化新開場中央光"></div><div class="化新開場光暈" id="化新開場寬光"></div>';
    document.body.appendChild(畫面);
    const 樣式=document.createElement('style');
    樣式.id='化新新上傳開場樣式';
    樣式.textContent=':root{--化新開場底:#0a2a5e}#化新新上傳開場{position:fixed;inset:0;z-index:12000;background:var(--化新開場底);overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none;cursor:crosshair}#化新新上傳開場 canvas{display:block;position:fixed;top:0;left:0;width:100%;height:100%;z-index:1}#化新新上傳開場.關閉{animation:化新開場淡出 .72s ease forwards}@keyframes 化新開場淡出{to{opacity:0;visibility:hidden;pointer-events:none}}#化新開場載入{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#ffd966;font-size:16px;letter-spacing:.25em;pointer-events:none;z-index:10;transition:opacity .6s ease;text-shadow:0 0 20px rgba(255,220,100,.9),0 0 40px rgba(100,180,255,.7);text-align:center;width:100%;font-family:Comic Sans MS,Chalkboard SE,cursive;font-weight:900}#化新開場階段{position:fixed;bottom:calc(40px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);color:rgba(255,220,100,.85);font-size:14px;letter-spacing:.3em;pointer-events:none;z-index:5;transition:all .5s ease;text-shadow:0 0 12px rgba(255,200,50,.7),0 0 25px rgba(100,180,255,.5);white-space:nowrap;font-family:Comic Sans MS,Chalkboard SE,cursive;font-weight:900}.化新開場光暈{position:fixed;border-radius:50%;pointer-events:none;z-index:0;opacity:0;transition:opacity 1.2s ease;will-change:opacity}.化新開場光暈.啟用{opacity:.4}#化新開場中央光{width:120vw;height:120vw;max-width:600px;max-height:600px;top:50%;left:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,200,60,.55) 0%,rgba(255,180,40,.2) 30%,rgba(30,100,200,.3) 60%,transparent 80%)}#化新開場寬光{width:150vw;height:150vw;max-width:900px;max-height:900px;top:50%;left:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(30,120,220,.4) 0%,rgba(10,80,180,.15) 50%,transparent 75%)}#化新開場載入.錯誤{color:#ff6b6b!important;font-size:13px;letter-spacing:.1em;text-shadow:0 0 10px rgba(255,100,100,.6)}@media(max-width:430px){#化新開場載入{font-size:13px}#化新開場階段{font-size:11px;letter-spacing:.16em;width:100%;text-align:center}}';
    document.head.appendChild(樣式);
    載入字=document.getElementById('化新開場載入');
    階段字=document.getElementById('化新開場階段');
    中央光=document.getElementById('化新開場中央光');
    寬光=document.getElementById('化新開場寬光');
  }
  function 載入Three(){return new Promise(function(resolve,reject){if(window.THREE)return resolve();const s=document.createElement('script');s.src=開場設定.Three來源;s.onload=resolve;s.onerror=function(){reject(new Error('Three.js 未載入'))};document.head.appendChild(s);});}
  function easeInOutCubic(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  function easeOutExpo(t){return t===1?1:1-Math.pow(2,-10*t);}
  function lerp(a,b,t){return a+(b-a)*t;}
  function fibonacciSphere(n,radius){const pts=[],phi=Math.PI*(3-Math.sqrt(5));for(let i=0;i<n;i++){const y=1-(i/(n-1))*2;const rAtY=Math.sqrt(1-y*y);const theta=phi*i;pts.push({x:Math.cos(theta)*rAtY*radius,y:y*radius,z:Math.sin(theta)*rAtY*radius});}return pts;}
  function 取文字座標(主,副,比例){
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    const w=900,h=320;
    canvas.width=w;canvas.height=h;
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
    ctx.font="bold 42px 'Comic Sans MS','Chalkboard SE','Segoe Print','Apple Chancery','Microsoft JhengHei',cursive,sans-serif";
    ctx.fillText(主,w/2,h/2-24);
    ctx.font="30px 'Comic Sans MS','Chalkboard SE','Segoe Print','Apple Chancery','Microsoft JhengHei',cursive,sans-serif";
    ctx.fillText(副,w/2,h/2+34);
    const data=ctx.getImageData(0,0,w,h).data;
    const coords=[];
    const gap=2;
    const scale=比例*1.7*Math.min(window.innerWidth/430,1.05);
    for(let y=0;y<h;y+=gap){for(let x=0;x<w;x+=gap){if(data[(y*w+x)*4]>128){coords.push({x:(x-w/2)*scale,y:-(y-h/2)*scale,z:0});}}}
    return coords.length>200?coords:[{x:0,y:0,z:0}];
  }
  function 取Logo座標(){
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    const w=500,h=330;
    canvas.width=w;canvas.height=h;
    ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
    ctx.font="900 126px 'Microsoft JhengHei','PingFang TC',sans-serif";
    ctx.fillText('化新',w/2,h/2-24);
    ctx.font="900 54px 'Arial',sans-serif";
    ctx.fillText('HS',w/2,h/2+82);
    const data=ctx.getImageData(0,0,w,h).data;
    const coords=[];
    const gap=3;
    const scale=開場設定.Logo比例*Math.min(window.innerWidth/430,1.08);
    for(let y=0;y<h;y+=gap){for(let x=0;x<w;x+=gap){if(data[(y*w+x)*4]>128){coords.push({x:(x-w/2)*scale,y:-(y-h/2)*scale,z:0});}}}
    return coords.length?coords:[{x:0,y:0,z:0}];
  }
  function 啟動Three開場(){
    const THREE=window.THREE;
    const WINE_COLORS=['#C03A4B','#D4505E','#B02A3C','#E86874','#9C2030'].map(c=>new THREE.Color(c));
    const STAR_COLORS=['#E8F0FF','#D0E4FF','#F0F8FF','#C8DCFF','#FFF8E0'].map(c=>new THREE.Color(c));
    const GOLD_COLORS=['#FFD966','#FFC125','#FFE484','#F0B800'].map(c=>new THREE.Color(c));
    const State={startTime:null,elapsed:0,mouse:new THREE.Vector2(0,0),lastStage:null};
    const scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(開場設定.背景色,0.00035);
    const camera=new THREE.PerspectiveCamera(72,window.innerWidth/Math.max(window.innerHeight,1),1,4000);
    camera.position.set(50,15,680);
    camera.lookAt(0,0,0);
    const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setClearColor(開場設定.背景色);
    畫面.appendChild(renderer.domElement);
    const N=window.innerWidth<430?開場設定.手機粒子數:開場設定.粒子數;
    const N3=N*3;
    const posScatter=new Float32Array(N3),posLogo=new Float32Array(N3),posExplode=new Float32Array(N3),posText=new Float32Array(N3),colStar=new Float32Array(N3),colWine=new Float32Array(N3),colGold=new Float32Array(N3),shimmerPhase=new Float32Array(N),shimmerSpeed=new Float32Array(N),shimmerAmp=new Float32Array(N),goldChance=new Float32Array(N),sizeBase=new Float32Array(N);
    const textCoords=取文字座標(開場設定.主文字,開場設定.副文字,開場設定.文字比例);
    const logoCoords=取Logo座標();
    const spherePts=fibonacciSphere(N,開場設定.球半徑);
    let logoCx=0,logoCy=0;
    for(let i=0;i<logoCoords.length;i++){logoCx+=logoCoords[i].x;logoCy+=logoCoords[i].y;}
    logoCx/=logoCoords.length;logoCy/=logoCoords.length;
    const geometry=new THREE.BufferGeometry();
    const positions=new Float32Array(N3),colors=new Float32Array(N3),sizes=new Float32Array(N);
    for(let i=0;i<N;i++){
      const i3=i*3;
      const sp=spherePts[i];
      posScatter[i3]=sp.x+(Math.random()-0.5)*180;posScatter[i3+1]=sp.y+(Math.random()-0.5)*180;posScatter[i3+2]=sp.z+(Math.random()-0.5)*180;
      const lp=logoCoords[i%logoCoords.length];
      const logoJitter=18;
      posLogo[i3]=lp.x+(Math.random()-0.5)*logoJitter;posLogo[i3+1]=lp.y+(Math.random()-0.5)*logoJitter;posLogo[i3+2]=(Math.random()-0.5)*logoJitter*1.2;
      const dx=posLogo[i3]-logoCx,dy=posLogo[i3+1]-logoCy,dz=posLogo[i3+2];
      const dist=Math.sqrt(dx*dx+dy*dy+dz*dz)+1;
      const explodeDist=180+Math.random()*320;
      posExplode[i3]=posLogo[i3]+dx/dist*explodeDist+(Math.random()-0.5)*200;posExplode[i3+1]=posLogo[i3+1]+dy/dist*explodeDist+(Math.random()-0.5)*200;posExplode[i3+2]=posLogo[i3+2]+dz/dist*explodeDist+(Math.random()-0.5)*200;
      const tp=textCoords[i%textCoords.length];
      posText[i3]=tp.x+(Math.random()-0.5)*6;posText[i3+1]=tp.y+(Math.random()-0.5)*6;posText[i3+2]=(Math.random()-0.5)*8;
      const sc=STAR_COLORS[Math.floor(Math.random()*STAR_COLORS.length)],wc=WINE_COLORS[i%WINE_COLORS.length],gc=GOLD_COLORS[i%GOLD_COLORS.length];
      colStar[i3]=sc.r;colStar[i3+1]=sc.g;colStar[i3+2]=sc.b;colWine[i3]=wc.r;colWine[i3+1]=wc.g;colWine[i3+2]=wc.b;colGold[i3]=gc.r;colGold[i3+1]=gc.g;colGold[i3+2]=gc.b;
      shimmerPhase[i]=Math.random()*Math.PI*2;shimmerSpeed[i]=0.6+Math.random()*2.5;shimmerAmp[i]=0.4+Math.random()*0.8;goldChance[i]=Math.random();sizeBase[i]=1.2+Math.random()*2.5;
      positions[i3]=posScatter[i3];positions[i3+1]=posScatter[i3+1];positions[i3+2]=posScatter[i3+2];colors[i3]=sc.r;colors[i3+1]=sc.g;colors[i3+2]=sc.b;sizes[i]=sizeBase[i];
    }
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('size',new THREE.BufferAttribute(sizes,1));
    const material=new THREE.PointsMaterial({size:1.0,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0.95,sizeAttenuation:true});
    const particles=new THREE.Points(geometry,material);
    scene.add(particles);
    const sparkleCount=900;
    const sparkleGeo=new THREE.BufferGeometry();
    const sparklePos=new Float32Array(sparkleCount*3),sparkleCol=new Float32Array(sparkleCount*3),sparkleSiz=new Float32Array(sparkleCount);
    for(let i=0;i<sparkleCount;i++){const lp=logoCoords[i%logoCoords.length],j=20;const i3=i*3;sparklePos[i3]=lp.x+(Math.random()-0.5)*j;sparklePos[i3+1]=lp.y+(Math.random()-0.5)*j;sparklePos[i3+2]=(Math.random()-0.5)*j;sparkleCol[i3]=1;sparkleCol[i3+1]=0.85;sparkleCol[i3+2]=0.3;sparkleSiz[i]=3+Math.random()*8;}
    sparkleGeo.setAttribute('position',new THREE.BufferAttribute(sparklePos,3));sparkleGeo.setAttribute('color',new THREE.BufferAttribute(sparkleCol,3));sparkleGeo.setAttribute('size',new THREE.BufferAttribute(sparkleSiz,1));
    const sparklesObj=new THREE.Points(sparkleGeo,new THREE.PointsMaterial({size:1,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0,sizeAttenuation:true}));
    scene.add(sparklesObj);
    function getStage(elapsed){const t=開場設定.階段秒;const s1=t.聚合Logo,s2=s1+t.閃耀停留,s3=s2+t.爆散,s4=s3+t.聚合文字,s5=s4+t.完成停留;if(elapsed<s1)return{stage:'聚合',progress:elapsed/s1};if(elapsed<s2)return{stage:'閃耀',progress:(elapsed-s1)/t.閃耀停留};if(elapsed<s3)return{stage:'爆散',progress:(elapsed-s2)/t.爆散};if(elapsed<s4)return{stage:'文字',progress:(elapsed-s3)/t.聚合文字};if(elapsed<s5)return{stage:'完成',progress:1};return{stage:'結束',progress:1};}
    function animate(){requestAnimationFrame(animate);if(!畫面||!畫面.parentNode)return;const timestamp=performance.now();if(!State.startTime)State.startTime=timestamp;State.elapsed=(timestamp-State.startTime)/1000;const stageInfo=getStage(State.elapsed);const stage=stageInfo.stage,progress=stageInfo.progress,elapsed=State.elapsed;if(stage==='結束'){畫面.classList.add('關閉');setTimeout(()=>{if(畫面&&畫面.parentNode)畫面.remove();},760);return;}const p=geometry.attributes.position.array,c=geometry.attributes.color.array,s=geometry.attributes.size.array;let pGather=0,pExplode=0,pGatherText=0,spiralAngle=0,spiralRadius=0;if(stage==='聚合'){pGather=easeInOutCubic(progress);spiralAngle=pGather*Math.PI*1.5;spiralRadius=(1-pGather)*80*Math.sin(pGather*Math.PI);}else if(stage==='爆散')pExplode=easeOutExpo(progress);else if(stage==='文字')pGatherText=easeInOutCubic(progress);const ft=elapsed*0.7;for(let i=0;i<N;i++){const i3=i*3;let tx,ty,tz,cr,cg,cb,sz=sizeBase[i];if(stage==='聚合'){const mx=lerp(posScatter[i3],posLogo[i3],pGather),my=lerp(posScatter[i3+1],posLogo[i3+1],pGather),mz=lerp(posScatter[i3+2],posLogo[i3+2],pGather);const dx=mx-posLogo[i3],dy=my-posLogo[i3+1],hd=Math.sqrt(dx*dx+dy*dy)+0.001;tx=mx+(dy/hd)*spiralRadius*Math.cos(spiralAngle);ty=my-(dx/hd)*spiralRadius*Math.cos(spiralAngle);tz=mz+spiralRadius*Math.sin(spiralAngle)*0.5;cr=colStar[i3];cg=colStar[i3+1];cb=colStar[i3+2];}else if(stage==='閃耀'){tx=posLogo[i3];ty=posLogo[i3+1];tz=posLogo[i3+2];const sv=Math.sin(elapsed*shimmerSpeed[i]+shimmerPhase[i])*0.5+0.5;const gm=sv*shimmerAmp[i]*(goldChance[i]>0.5?1:0.4);cr=lerp(colWine[i3],colGold[i3],gm);cg=lerp(colWine[i3+1],colGold[i3+1],gm);cb=lerp(colWine[i3+2],colGold[i3+2],gm);const bb=sv*0.3;cr=Math.min(1,cr+bb);cg=Math.min(1,cg+bb*0.8);cb=Math.min(1,cb+bb*0.5);sz*=1+sv*shimmerAmp[i]*1.8;}else if(stage==='爆散'){tx=lerp(posLogo[i3],posExplode[i3],pExplode);ty=lerp(posLogo[i3+1],posExplode[i3+1],pExplode);tz=lerp(posLogo[i3+2],posExplode[i3+2],pExplode);cr=Math.min(1,colWine[i3]+0.3);cg=Math.min(1,colWine[i3+1]+0.25);cb=Math.min(1,colWine[i3+2]+0.2);sz*=0.7;}else if(stage==='文字'){tx=lerp(posExplode[i3],posText[i3],pGatherText);ty=lerp(posExplode[i3+1],posText[i3+1],pGatherText);tz=lerp(posExplode[i3+2],posText[i3+2],pGatherText);cr=colWine[i3]*0.9;cg=colWine[i3+1]*0.85;cb=colWine[i3+2]*0.9;}else{tx=posText[i3]+Math.sin(ft+i*0.13)*1.8;ty=posText[i3+1]+Math.cos(ft*0.8+i*0.17)*1.8;tz=posText[i3+2]+Math.sin(ft*0.6+i*0.11)*1.2;cr=colWine[i3]*0.85;cg=colWine[i3+1]*0.8;cb=colWine[i3+2]*0.85;}p[i3]=tx;p[i3+1]=ty;p[i3+2]=tz;c[i3]=cr;c[i3+1]=cg;c[i3+2]=cb;s[i]=sz;}geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.attributes.size.needsUpdate=true;const isShimmer=stage==='閃耀';sparklesObj.material.opacity=lerp(sparklesObj.material.opacity,isShimmer?0.7:0,0.1);if(isShimmer&&sparklesObj.material.opacity>0.01){const sp=sparklesObj.geometry.attributes.position.array,sc=sparklesObj.geometry.attributes.color.array,ss=sparklesObj.geometry.attributes.size.array;for(let j=0;j<sparkleCount;j++){const lp=logoCoords[j%logoCoords.length],sj=12+Math.sin(elapsed*10+j)*8,j3=j*3;sp[j3]=lp.x+(Math.random()-0.5)*sj;sp[j3+1]=lp.y+(Math.random()-0.5)*sj;sp[j3+2]=(Math.random()-0.5)*sj;const fk=Math.sin(elapsed*14+j*3.7)*0.5+0.5;sc[j3]=0.95+fk*0.05;sc[j3+1]=0.7+fk*0.3;sc[j3+2]=0.2+fk*0.4;ss[j]=(3+Math.random()*6)*(0.8+fk*0.5);}sparklesObj.geometry.attributes.position.needsUpdate=true;sparklesObj.geometry.attributes.color.needsUpdate=true;sparklesObj.geometry.attributes.size.needsUpdate=true;}if(State.lastStage!==stage){階段字.textContent=階段標籤[stage]||'';中央光.classList.toggle('啟用',stage==='閃耀');寬光.classList.toggle('啟用',stage==='聚合'||stage==='閃耀'||stage==='爆散');State.lastStage=stage;}camera.position.x+=(50+State.mouse.x*67-camera.position.x)*0.04;camera.position.y+=(15-State.mouse.y*40-camera.position.y)*0.04;camera.lookAt(0,8,0);renderer.render(scene,camera);}
    window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/Math.max(window.innerHeight,1);camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
    document.addEventListener('mousemove',e=>{State.mouse.x=(e.clientX/window.innerWidth)*2-1;State.mouse.y=-(e.clientY/window.innerHeight)*2+1;},{passive:true});
    document.addEventListener('touchmove',e=>{if(e.touches.length>0){State.mouse.x=(e.touches[0].clientX/window.innerWidth)*2-1;State.mouse.y=-(e.touches[0].clientY/window.innerHeight)*2+1;}},{passive:true});
    if(載入字){載入字.style.opacity='0';setTimeout(()=>{if(載入字&&載入字.parentNode)載入字.remove();},700);}
    requestAnimationFrame(animate);
  }
  function 啟動(){建立畫面();載入Three().then(啟動Three開場).catch(function(err){if(載入字){載入字.classList.add('錯誤');載入字.textContent='初始化失敗: '+err.message;}setTimeout(()=>{if(畫面){畫面.classList.add('關閉');setTimeout(()=>畫面.remove(),760);}},1600);});}
  等待DOM(啟動);
})();
