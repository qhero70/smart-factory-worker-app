(function(){
  'use strict';
  var KEY='NEXUS_OS_今日報工任務';
  function txt(v){return String(v==null?'':v).trim();}
  function readTask(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return{};}}
  function el(tag,cls,text){var x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
  function field(label,value,readonly){var wrap=el('div','');var lab=el('label','',label);var inp=el('input','');if(readonly!==false)inp.readOnly=true;inp.value=txt(value);wrap.appendChild(lab);wrap.appendChild(inp);return wrap;}
  function row(a,b){var r=el('div','兩欄');r.appendChild(a);r.appendChild(b);return r;}
  function fire(x){if(x){x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));}}
  function fillSearchOnly(t){
    var p=document.getElementById('搜尋工件');
    if(p && !p.value){p.value=txt(t['產品編號']||t['客戶品號']||t['品名']);fire(p);}
    var q=document.getElementById('今日共做數');
    if(q && !q.value){q.value=txt(t['預計數量']||t['需求量']);fire(q);}
  }
  function mount(){
    var t=readTask();
    if(!t||!Object.keys(t).length)return;
    fillSearchOnly(t);
    var page=document.querySelector('[data-page="工件"]');
    if(!page)return;
    var old=document.getElementById('nexusDispatchCard261');
    if(old)return;
    var card=el('div','卡片');
    card.id='nexusDispatchCard261';
    card.style.borderColor='rgba(0,210,255,.6)';
    card.style.boxShadow='0 0 28px rgba(0,210,255,.18)';
    var title=el('div','區標','✅ NEXUS 今日派班任務');
    title.appendChild(el('span','小字',' Dispatch Task｜僅顯示，不自動派班補填'));
    card.appendChild(title);
    card.appendChild(row(field('派班編號',t['派班編號']),field('來源需求編號',t['來源需求編號'])));
    card.appendChild(row(field('產品編號',t['產品編號']),field('客戶品號',t['客戶品號'])));
    card.appendChild(field('品名',t['品名']));
    card.appendChild(row(field('工號',t['工號']),field('姓名',t['姓名'])));
    card.appendChild(row(field('工站',t['工站名稱']||'尚未由主檔帶入'),field('機台',t['機台編號']||'尚未由主檔帶入')));
    card.appendChild(row(field('需求量',t['需求量']),field('預計數量',t['預計數量'])));
    var note=el('div','小字','此卡只顯示 20_今日派班 資料；不再建立「派班產品」或「派班補填」工站。產品/工站必須回主檔補齊後再正式報工。');
    note.style.marginTop='10px';note.style.color='#ffe08a';card.appendChild(note);
    var first=page.querySelector('.卡片')||page.firstChild;
    page.insertBefore(card,first);
    document.body.dataset.nexusDispatchCard261='display-only';
  }
  window.NEXUS_dispatch_card_261=mount;
  document.addEventListener('DOMContentLoaded',function(){[300,900,1600,3000].forEach(function(ms){setTimeout(mount,ms);});});
})();