/* 製一組報工表單 V4｜選定區隱藏與產品掃碼小圖示 v4.5.9 */
(function(){
  'use strict';
  var bound=false;
  function d(id){return document.getElementById(id)}
  function txt(v){return String(v==null?'':v).trim()}
  function has(id){var e=d(id);return !!(e&&txt(e.value))}
  function scrollTo(e){if(!e)return;setTimeout(function(){try{e.scrollIntoView({behavior:'smooth',block:'center'})}catch(x){}},80)}
  function personCard(){var e=d('selectedPersonDisplay');return e?e.closest('.glass-card'):null}
  function productArea(){return d('selectedProductArea')}
  function style(){
    if(d('v459style'))return;
    var s=document.createElement('style');s.id='v459style';
    s.textContent='.v459-hidden{display:none!important}.v459-pop{animation:v459pop .28s ease-out both!important}@keyframes v459pop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}button.v459-scan-mini{width:44px!important;height:44px!important;min-height:44px!important;max-width:44px!important;padding:0!important;margin:0 0 8px auto!important;border-radius:15px!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:20px!important;gap:0!important}button.v459-scan-mini .s-icon{font-size:20px!important;margin:0!important}button.v459-scan-mini .v459-text{display:none!important}#selectedProductArea.v459-hidden{display:none!important}';
    document.head.appendChild(s);
  }
  function makeProductScanSmall(){
    var list=document.querySelectorAll('button.scan-btn');
    list.forEach(function(btn){
      var t=txt(btn.textContent);
      if(t.indexOf('掃描產品條碼')<0 && t.indexOf('Scan Product Barcode')<0)return;
      if(btn.__v459)return;
      btn.__v459=true;btn.classList.add('v459-scan-mini');btn.title='掃描產品條碼 / Scan Product Barcode';btn.setAttribute('aria-label','掃描產品條碼 / Scan Product Barcode');btn.innerHTML='<span class="s-icon">📷</span><span class="v459-text">掃描產品條碼 / Scan Product Barcode</span>';
    });
  }
  function syncPerson(go){
    var card=personCard();if(!card)return;
    var ok=has('personId')||has('personName');
    card.classList.toggle('v459-hidden',!ok);
    if(ok){card.classList.add('v459-pop');if(go)scrollTo(card);setTimeout(function(){card.classList.remove('v459-pop')},500)}
  }
  function syncProduct(go){
    var area=productArea();if(!area)return;
    var ok=has('productCode')||has('productName');
    area.classList.toggle('v459-hidden',!ok);area.classList.toggle('hidden',!ok);
    if(ok){area.classList.add('v459-pop');if(go)scrollTo(area);setTimeout(function(){area.classList.remove('v459-pop')},500)}
  }
  function wrap(){
    if(typeof selectPerson==='function'&&!selectPerson.__v459){var old=selectPerson;window.selectPerson=function(){var r=old.apply(this,arguments);setTimeout(function(){syncPerson(true)},100);return r};window.selectPerson.__v459=true}
    if(typeof selectProduct==='function'&&!selectProduct.__v459){var oldp=selectProduct;window.selectProduct=function(){var r=oldp.apply(this,arguments);setTimeout(function(){syncProduct(true);makeProductScanSmall()},120);return r};window.selectProduct.__v459=true}
  }
  function click(e){if(e.target.closest&&e.target.closest('.person-card,.recent-chip'))setTimeout(function(){syncPerson(true)},180);if(e.target.closest&&e.target.closest('.product-card'))setTimeout(function(){syncProduct(true);makeProductScanSmall()},240)}
  function install(){style();makeProductScanSmall();syncPerson(false);syncProduct(false);wrap();if(!bound){document.addEventListener('click',click,true);document.addEventListener('touchend',click,true);bound=true}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',function(){install();setTimeout(install,800)});
  setInterval(install,1500);
})();