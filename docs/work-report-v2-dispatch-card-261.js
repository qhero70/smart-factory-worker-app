(function(){
  'use strict';
  var KEY='NEXUS_OS_今日報工任務';
  function txt(v){return String(v==null?'':v).trim();}
  function readTask(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return{};}}
  function el(tag,cls,text){var x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
  function field(label,value){var wrap=el('div','');var lab=el('label','',label);var inp=el('input','');inp.readOnly=true;inp.value=txt(value);wrap.appendChild(lab);wrap.appendChild(inp);return wrap;}
  function row(a,b){var r=el('div','兩欄');r.appendChild(a);r.appendChild(b);return r;}
  function fire(x){if(x){x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));}}
  function fillSearch(t){var p=document.getElementById('搜尋工件');if(p){p.value=txt(t['產品編號']||t['客戶品號']||t['品名']);fire(p);}var q=document.getElementById('今日共做數');if(q&&!q.value){q.value=txt(t['預計數量']||t['需求量']);fire(q);}}
  function chooseProduct(t){
    var list=document.getElementById('產品列表'); if(!list||!txt(t['產品編號']))return;
    var keys=[t['產品編號'],t['客戶品號'],t['品名']].map(txt).filter(Boolean);
    var cards=Array.from(list.querySelectorAll('.產品卡片'));
    var card=cards.find(function(c){var x=txt(c.textContent).toUpperCase();return keys.some(function(k){return x.indexOf(k.toUpperCase())>=0;});});
    if(!card){card=el('div','產品卡片');card.setAttribute('data-nexus-dispatch-product','261');card.appendChild(el('div','產品圖','派班產品'));card.appendChild(el('div','產品名',txt(t['品名']||t['產品編號'])));card.appendChild(el('div','產品副',txt(t['產品編號'])+'｜'+txt(t['客戶品號'])));list.insertBefore(card,list.firstChild);}
    Array.from(list.querySelectorAll('.產品卡片.選中')).forEach(function(x){x.classList.remove('選中');});card.classList.add('選中');
    var n=document.querySelector('.下拉產品名');if(n)n.textContent=txt(t['品名']||t['產品編號']);
    var i=document.querySelector('.下拉產品資料');if(i)i.textContent=txt(t['產品編號'])+'｜'+txt(t['客戶品號']);
    var sel=document.getElementById('工站選擇'); if(sel){var st=txt(t['工站名稱']||'派班補填');var mc=txt(t['機台編號']||'派班補填');var val='NEXUS261|'+txt(t['產品編號'])+'|'+st+'|'+mc;var op=Array.from(sel.options).find(function(o){return o.value===val;});if(!op){op=document.createElement('option');op.value=val;op.textContent=st+'｜'+mc;sel.appendChild(op);}sel.value=val;fire(sel);}
    document.body.dataset.nexusDispatchProduct261='ready';
  }
  function mount(){
    var t=readTask();
    if(!t||!Object.keys(t).length)return;
    fillSearch(t); chooseProduct(t);
    var page=document.querySelector('[data-page="工件"]');
    if(!page)return;
    var old=document.getElementById('nexusDispatchCard261');
    if(old)old.remove();
    var card=el('div','卡片');
    card.id='nexusDispatchCard261';
    card.style.borderColor='rgba(0,210,255,.6)';
    card.style.boxShadow='0 0 28px rgba(0,210,255,.18)';
    var title=el('div','區標','✅ NEXUS 今日派班任務');
    title.appendChild(el('span','小字',' Dispatch Task'));
    card.appendChild(title);
    card.appendChild(row(field('派班編號',t['派班編號']),field('來源需求編號',t['來源需求編號'])));
    card.appendChild(row(field('產品編號',t['產品編號']),field('客戶品號',t['客戶品號'])));
    card.appendChild(field('品名',t['品名']));
    card.appendChild(row(field('工號',t['工號']),field('姓名',t['姓名'])));
    card.appendChild(row(field('工站：派班未帶時請現場補填',t['工站名稱']),field('機台：派班未帶時請現場補填',t['機台編號'])));
    card.appendChild(row(field('需求量',t['需求量']),field('預計數量',t['預計數量'])));
    var note=el('div','小字','此卡由 20_今日派班 帶入；系統已同步選定產品與工站補填選項。');
    note.style.marginTop='10px';note.style.color='#ffe08a';card.appendChild(note);
    var first=page.querySelector('.卡片')||page.firstChild;
    page.insertBefore(card,first);
  }
  window.NEXUS_dispatch_card_261=mount;
  document.addEventListener('DOMContentLoaded',function(){[300,900,1600,3000,5000,8000].forEach(function(ms){setTimeout(mount,ms);});setInterval(mount,2500);});
})();