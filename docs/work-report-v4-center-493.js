/* 報工作業 V4 選定人員置中修正 v4.9.3
 * 只修：選完人員後 selectedPersonArea 自動滑到畫面中間。
 * 不動 GAS、不動送出、不動工站、不動不良規則。
 */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function centerEl(el){
  if(!el)return;
  el.classList.remove('hidden','v4-hide');
  function run(){
    try{
      var rect=el.getBoundingClientRect();
      var vh=window.innerHeight||document.documentElement.clientHeight||0;
      var current=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0;
      var target=current+rect.top-(vh-rect.height)/2;
      var max=(document.documentElement.scrollHeight||document.body.scrollHeight||0)-vh;
      if(max<0)max=0;
      target=Math.max(0,Math.min(target,max));
      window.scrollTo({top:target,behavior:'smooth'});
    }catch(e){
      try{el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});}catch(_e){}
    }
  }
  requestAnimationFrame(function(){setTimeout(run,60);setTimeout(run,220);});
}
function patchSelectPerson(){
  if(window.__V4_CENTER_493_PATCHED__)return;
  var old=window.selectPerson;
  if(typeof old!=='function')return;
  window.__V4_CENTER_493_PATCHED__=true;
  window.selectPerson=function(){
    window.center=centerEl;
    var r=old.apply(this,arguments);
    centerEl(E('selectedPersonArea'));
    setTimeout(function(){centerEl(E('selectedPersonArea'));},260);
    return r;
  };
}
function boot(){window.center=centerEl;patchSelectPerson();}
window.V4Center493={boot:boot,center:centerEl};
document.addEventListener('DOMContentLoaded',boot);
setTimeout(boot,50);setTimeout(boot,300);setTimeout(boot,900);setInterval(patchSelectPerson,1000);
})();
