/* Huaxin Work Report V4 v4.9.4
 * Scope: selected operator card only.
 * - Before selecting operator: hide selected-operator card.
 * - After selecting operator: show selected-operator card and scroll it to the center of mobile viewport.
 * No changes to photos, shift rules, product, machine, workstation, or submit logic.
 */
(function(){
  'use strict';
  if(window.__HX_SELECTED_CENTER_494__) return;
  window.__HX_SELECTED_CENTER_494__=true;
  var wrappedSelect=false;
  var wrappedReset=false;
  var popTimer=null;

  function el(id){return document.getElementById(id);}
  function selected(){return !!(window.STATE&&STATE.operator)||!!(el('personId')&&String(el('personId').value||'').trim());}
  function card(){var d=el('selectedPersonDisplay');return d?d.closest('.glass-card'):null;}
  function injectStyle(){
    if(el('hx-selected-center-494-style')) return;
    var st=document.createElement('style');
    st.id='hx-selected-center-494-style';
    st.textContent='.hx-selected-pop{animation:hxSelectedPop494 .52s cubic-bezier(.34,1.56,.64,1);box-shadow:0 16px 48px rgba(52,168,83,.28),0 0 0 3px rgba(52,168,83,.18)!important;border-color:rgba(52,168,83,.45)!important}@keyframes hxSelectedPop494{0%{transform:scale(.94);opacity:.25}45%{transform:scale(1.035);opacity:1}100%{transform:scale(1);opacity:1}}';
    document.head.appendChild(st);
  }
  function syncVisibility(){
    var c=card();
    if(!c) return false;
    c.style.display=selected()?'':'none';
    return selected();
  }
  function centerSelected(){
    var c=card();
    if(!c) return false;
    if(!selected()){c.style.display='none';return false;}
    c.style.display='';
    injectStyle();
    function run(){
      var cc=card();
      if(!cc||!selected()) return;
      cc.style.display='';
      var vv=window.visualViewport;
      var vh=vv?vv.height:(window.innerHeight||document.documentElement.clientHeight||0);
      var vy=vv?vv.offsetTop:0;
      var rect=cc.getBoundingClientRect();
      var current=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0;
      var bar=el('btnNext')?((el('btnNext').closest('.bottom-bar')||{}).offsetHeight||90):90;
      var usable=Math.max(260,vh-bar-16);
      var target=current+rect.top+vy-Math.max(12,(usable-rect.height)/2);
      var max=Math.max(0,(document.documentElement.scrollHeight||document.body.scrollHeight||0)-vh);
      target=Math.max(0,Math.min(target,max));
      window.scrollTo({top:target,behavior:'smooth'});
      cc.classList.remove('hx-selected-pop');
      void cc.offsetWidth;
      cc.classList.add('hx-selected-pop');
      clearTimeout(popTimer);
      popTimer=setTimeout(function(){cc.classList.remove('hx-selected-pop');},900);
    }
    requestAnimationFrame(function(){setTimeout(run,50);setTimeout(run,220);setTimeout(run,520);});
    return true;
  }
  function wrapSelect(){
    if(wrappedSelect||typeof window.selectPerson!=='function') return;
    wrappedSelect=true;
    var old=window.selectPerson;
    window.selectPerson=function(){
      var c=card();
      if(c) c.style.display='';
      var r=old.apply(this,arguments);
      setTimeout(centerSelected,80);
      setTimeout(centerSelected,260);
      return r;
    };
  }
  function wrapReset(){
    if(wrappedReset||typeof window.resetAfterSubmit!=='function') return;
    wrappedReset=true;
    var old=window.resetAfterSubmit;
    window.resetAfterSubmit=function(){var r=old.apply(this,arguments);setTimeout(syncVisibility,80);return r;};
  }
  function boot(){injectStyle();syncVisibility();wrapSelect();wrapReset();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  setTimeout(boot,80);setTimeout(boot,300);setTimeout(boot,1000);
  setInterval(function(){wrapSelect();wrapReset();syncVisibility();},1000);
  window.hxTestSelectedCenter494=function(){return {selected:selected(),cardExists:!!card(),cardVisible:!!(card()&&card().style.display!=='none'),center:centerSelected()};};
})();
