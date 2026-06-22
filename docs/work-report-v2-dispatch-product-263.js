(function(){
'use strict';
var KEY='NEXUS_OS_今日報工任務';
function T(v){return String(v==null?'':v).trim();}
function R(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return{};}}
function E(v){return T(v).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function F(el){if(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}
function S(id,v){var el=document.getElementById(id);if(el&&T(v)){el.value=T(v);F(el);}}
function P(){
 var d=R(); if(!d||!T(d['產品編號']))return;
 var list=document.getElementById('產品列表'); if(!list)return;
 var keys=[d['產品編號'],d['客戶品號'],d['品名']].map(T).filter(Boolean);
 var cards=Array.from(list.querySelectorAll('.產品卡片'));
 var card=cards.find(function(c){var x=T(c.textContent).toUpperCase();return keys.some(function(k){return x.indexOf(k.toUpperCase())>=0;});});
 if(!card){
  card=document.createElement('div');
  card.className='產品卡片 選中';
  card.setAttribute('data-dispatch-product','263');
  var a=document.createElement('div');a.className='產品圖';a.textContent='派班產品';
  var b=document.createElement('div');b.className='產品名';b.textContent=T(d['品名']||d['產品編號']);
  var c=document.createElement('div');c.className='產品副';c.textContent=T(d['產品編號'])+'｜'+T(d['客戶品號']);
  card.appendChild(a);card.appendChild(b);card.appendChild(c);list.insertBefore(card,list.firstChild);
 }else{card.classList.add('選中');}
 S('搜尋工件',d['產品編號']||d['客戶品號']||d['品名']);
 var n=document.querySelector('.下拉產品名');if(n)n.textContent=T(d['品名']||d['產品編號']);
 var i=document.querySelector('.下拉產品資料');if(i)i.textContent=T(d['產品編號'])+'｜'+T(d['客戶品號']);
 var sel=document.getElementById('工站選擇');
 if(sel){
  var st=T(d['工站名稱']||'派班補填');var mc=T(d['機台編號']||'派班補填');var val='DISPATCH263|'+T(d['產品編號'])+'|'+st+'|'+mc;
  var op=Array.from(sel.options).find(function(o){return o.value===val;});
  if(!op){op=document.createElement('option');op.value=val;op.textContent=st+'｜'+mc;sel.appendChild(op);}
  sel.value=val;F(sel);
 }
 S('今日共做數',d['預計數量']||d['需求量']);
 document.body.dataset.dispatchProduct263='ready';
}
window.報工派班產品補齊263=P;
document.addEventListener('DOMContentLoaded',function(){[300,900,1600,3000,5000].forEach(function(ms){setTimeout(P,ms);});setInterval(P,2500);});
})();