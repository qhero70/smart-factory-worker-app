/* 化新報工 V4｜正式版 v5.0.2 選定人員顯示保險
 * 只處理一件事：點選人員後，#selectedPersonCard 必須顯示並置中。
 */
(function(){
  'use strict';
  if(window.__HX_SELECTED_VISIBLE_502__) return;
  window.__HX_SELECTED_VISIBLE_502__ = true;

  function E(id){ return document.getElementById(id); }
  function selectedCard(){ return E('selectedPersonCard') || (E('selectedPersonDisplay') && E('selectedPersonDisplay').closest('.glass-card')); }
  function hasPerson(){ return !!(window.STATE && STATE.operator) || !!(E('personId') && String(E('personId').value||'').trim()); }
  function hideIfEmpty(){ var c=selectedCard(); if(c && !hasPerson()) c.style.setProperty('display','none','important'); }
  function showAndCenter(){
    var c=selectedCard();
    if(!c) return false;
    if(!hasPerson()){ c.style.setProperty('display','none','important'); return false; }
    c.style.setProperty('display','block','important');
    c.style.setProperty('visibility','visible','important');
    c.style.setProperty('opacity','1','important');
    function run(){
      var card=selectedCard(); if(!card || !hasPerson()) return;
      card.style.setProperty('display','block','important');
      var vv=window.visualViewport;
      var vh=vv?vv.height:(window.innerHeight||document.documentElement.clientHeight||0);
      var vy=vv?vv.offsetTop:0;
      var rect=card.getBoundingClientRect();
      var current=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0;
      var bar=document.querySelector('.bottom-bar')?document.querySelector('.bottom-bar').offsetHeight:90;
      var usable=Math.max(260,vh-bar-18);
      var target=current+rect.top+vy-Math.max(12,(usable-rect.height)/2);
      var max=Math.max(0,(document.documentElement.scrollHeight||document.body.scrollHeight||0)-vh);
      target=Math.max(0,Math.min(target,max));
      window.scrollTo({top:target,behavior:'smooth'});
      card.classList.remove('selected-person-pop');
      void card.offsetWidth;
      card.classList.add('selected-person-pop');
    }
    requestAnimationFrame(function(){ setTimeout(run,60); setTimeout(run,240); setTimeout(run,520); });
    return true;
  }

  function wrap(){
    if(typeof window.selectPerson==='function' && !window.__HX_SELECT_WRAP_502__){
      window.__HX_SELECT_WRAP_502__ = true;
      var old = window.selectPerson;
      window.selectPerson = function(){
        var r = old.apply(this, arguments);
        showAndCenter();
        setTimeout(showAndCenter,120);
        setTimeout(showAndCenter,360);
        return r;
      };
    }
    hideIfEmpty();
  }

  document.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('.person-card')){
      setTimeout(showAndCenter,80);
      setTimeout(showAndCenter,260);
      setTimeout(showAndCenter,520);
    }
  }, true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', wrap, {once:true}); else wrap();
  setTimeout(wrap,100); setTimeout(wrap,500); setTimeout(wrap,1200); setInterval(wrap,1000);
  window.hxShowSelectedPerson502 = showAndCenter;
})();
