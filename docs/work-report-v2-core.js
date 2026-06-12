(function(){
  'use strict';
  var 正式版號='240';
  var 起點X=0,起點Y=0,正在滑動=false,封鎖點擊到=0;
  var 已綁定加班保護=false;
  var 加班手動=false;
  var 加班類型手動=false;
  var 手動是否加班='否';
  var 手動加班類型='無';
  function loadCss(){
    if(document.getElementById('報工正式樣式'))return;
    var l=document.createElement('link');
    l.id='報工正式樣式';
    l.rel='stylesheet';
    l.href='./work-report-v2-ui.css?v='+正式版號;
    document.head.appendChild(l);
  }
  function killLoading(){
    var x=document.getElementById('載入遮罩');
    if(x){
      x.classList.remove('顯示');
      x.style.setProperty('display','none','important');
      x.style.setProperty('visibility','hidden','important');
      x.style.setProperty('pointer-events','none','important');
    }
  }
  function bindScrollGuard(){
    if(document.body.dataset.scrollGuard==='240')return;
    document.body.dataset.scrollGuard='240';
    document.addEventListener('touchstart',function(e){
      if(!e.touches||!e.touches.length)return;
      起點X=e.touches[0].clientX;
      起點Y=e.touches[0].clientY;
      正在滑動=false;
    },true);
    document.addEventListener('touchmove',function(e){
      if(!e.touches||!e.touches.length)return;
      var dx=Math.abs(e.touches[0].clientX-起點X);
      var dy=Math.abs(e.touches[0].clientY-起點Y);
      if(dx>10||dy>10){
        正在滑動=true;
        封鎖點擊到=Date.now()+450;
        document.body.classList.add('正在滑動選單');
      }
    },true);
    document.addEventListener('touchend',function(){
      if(正在滑動)封鎖點擊到=Date.now()+450;
      setTimeout(function(){document.body.classList.remove('正在滑動選單');},180);
    },true);
    document.addEventListener('click',function(e){
      if(Date.now()>封鎖點擊到)return;
      if(e.target.closest('.人員卡片,.產品卡片')){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      }
    },true);
  }
  function showProducts(){
    var list=document.getElementById('產品列表');
    if(!list)return;
    document.body.classList.add('產品下拉展開');
    list.style.setProperty('display','grid','important');
    list.style.setProperty('height','auto','important');
    list.style.setProperty('min-height','0','important');
    list.style.setProperty('max-height','none','important');
    list.style.setProperty('overflow','visible','important');
    list.style.setProperty('margin','12px 0 16px','important');
    list.style.setProperty('padding','0','important');
  }
  function hideProducts(){
    var list=document.getElementById('產品列表');
    if(!list)return;
    document.body.classList.remove('產品下拉展開');
    list.style.setProperty('display','none','important');
    list.style.setProperty('height','0','important');
    list.style.setProperty('min-height','0','important');
    list.style.setProperty('max-height','0','important');
    list.style.setProperty('overflow','hidden','important');
    list.style.setProperty('margin','0','important');
    list.style.setProperty('padding','0','important');
  }
  function productDrop(){
    var list=document.getElementById('產品列表');
    if(!list)return;
    var wrap=document.getElementById('產品下拉控制');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='產品下拉控制';
      wrap.innerHTML='<button id="產品下拉按鈕" type="button"><span class="下拉產品圖">📦</span><span><span class="下拉產品名">請選擇產品 / Select Product</span><span class="下拉產品資料">點擊展開產品圖片卡片清單 / Tap to open product photo list</span></span><span class="下拉箭頭">⌄</span></button>';
      list.parentNode.insertBefore(wrap,list);
    }
    var btn=document.getElementById('產品下拉按鈕');
    if(btn&&btn.dataset.bind!=='240'){
      btn.dataset.bind='240';
      btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();showProducts();},true);
      btn.addEventListener('touchend',function(e){e.preventDefault();e.stopPropagation();showProducts();},true);
    }
    var selected=list.querySelector('.產品卡片.選中');
    if(selected){
      var img=selected.querySelector('.產品圖 img');
      var pic=wrap.querySelector('.下拉產品圖');
      var name=wrap.querySelector('.下拉產品名');
      var info=wrap.querySelector('.下拉產品資料');
      pic.innerHTML=img?'<img src="'+img.src+'" alt="">':'📦';
      name.textContent=(selected.querySelector('.產品名')||{}).textContent||'已選產品 / Selected Product';
      info.textContent=(selected.querySelector('.產品副')||{}).textContent||'已選定產品 / Product selected';
    }
    if(!document.body.classList.contains('產品下拉展開'))hideProducts();
    if(list.dataset.dropClose!=='240'){
      list.dataset.dropClose='240';
      list.addEventListener('click',function(e){
        if(Date.now()<封鎖點擊到)return;
        if(e.target.closest('.產品卡片'))setTimeout(function(){hideProducts();productDrop();stationTop();machinePhotos();},180);
      },true);
    }
  }
  function bindGlobalProductOpen(){
    if(document.body.dataset.productGlobal==='240')return;
    document.body.dataset.productGlobal='240';
    document.addEventListener('click',function(e){
      var hit=e.target.closest('#產品下拉控制,#產品下拉按鈕');
      if(!hit)return;
      e.preventDefault();
      e.stopPropagation();
      showProducts();
    },true);
    document.addEventListener('touchstart',function(e){
      var hit=e.target.closest('#產品下拉控制,#產品下拉按鈕');
      if(!hit)return;
      showProducts();
    },true);
  }
  function stationTop(){
    var control=document.getElementById('產品下拉控制');
    var sel=document.getElementById('工站選擇');
    if(!control||!sel)return;
    var card=sel.closest('.卡片');
    if(!card)return;
    card.id='工站固定區';
    card.style.position='relative';
    card.style.top='auto';
    card.style.zIndex='1';
    card.style.display='block';
    if(control.previousElementSibling!==card)control.parentNode.insertBefore(card,control);
  }
  function 安全文字(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
  }
  function 取欄(row,keys){
    if(!row)return '';
    for(var i=0;i<keys.length;i++){
      var k=keys[i];
      if(row[k]!==undefined&&row[k]!==null&&String(row[k]).trim()!=='')return row[k];
    }
    return '';
  }
  function 正規化圖片網址(value){
    var raw=String(value||'').trim();
    if(!raw)return '';
    raw=raw.replace(/^=IMAGE\(/i,'').replace(/^image\(/i,'').replace(/[()"']/g,'').trim();
    var hit=raw.match(/https?:\/\/[^\s,，;；]+/i);
    if(hit)raw=hit[0];
    if(raw.indexOf('data:image/')===0)return raw;
    var id=raw.match(/[-\w]{25,}/);
    if(id)return 'https://drive.google.com/thumbnail?id='+id[0]+'&sz=w900';
    return raw;
  }
  function 取機台編號(m){
    return String(取欄(m,['機台編號','機台代號','設備編號','主機台','編號','代號','id','ID'])||m||'').trim();
  }
  function 取機台照片(m){
    return 正規化圖片網址(取欄(m,['照片','機台照片','機台照片網址','照片網址','縮圖網址','圖片網址','機台照片檔案ID','Google檔案ID','照片檔案ID','檔案ID']));
  }
  function 解析機台編號清單(station){
    var raw=[];
    if(Array.isArray(station&&station.機台清單))station.機台清單.forEach(function(x){raw.push(取機台編號(x));});
    ['機台清單','機台編號清單','機台編號','主機台','設備編號','機台代號'].forEach(function(k){
      var v=station&&station[k];
      if(typeof v==='string')raw=raw.concat(v.split(/[、,，;；\s]+/));
      else if(v!==undefined&&v!==null&&!Array.isArray(v))raw.push(String(v));
    });
    return raw.map(function(x){return String(x||'').trim();}).filter(Boolean).filter(function(x,i,a){return a.indexOf(x)===i;});
  }
  function 找主檔機台(id,state){
    var list=Array.isArray(state&&state.機台)?state.機台:[];
    var clean=String(id||'').trim();
    if(!clean)return null;
    return list.find(function(m){
      return [m.機台編號,m.機台代號,m.設備編號,m.主機台,m.編號,m.代號,m.id,m.ID].some(function(v){return String(v||'').trim()===clean;});
    })||null;
  }
  function 機台列補照片(m,state){
    var id=取機台編號(m);
    var found=找主檔機台(id,state)||{};
    var name=String(取欄(m,['機台名稱','設備名稱','名稱'])||取欄(found,['機台名稱','設備名稱','名稱'])||id||'').trim();
    var photo=取機台照片(m)||取機台照片(found);
    return {機台編號:id,機台名稱:name,照片:photo};
  }
  function 取選定工站(state){
    var station=state&&state.選定工站||null;
    var select=document.getElementById('工站選擇');
    if(!station&&select&&select.value&&Array.isArray(state&&state.工站群組)){
      station=state.工站群組.find(function(g){
        var key=[g.產品編號,g.客戶品號,g.品名,g.工站名稱,g.工序,g.主機台].map(function(v){return String(v||'').trim();}).join('|');
        return key===select.value;
      })||null;
    }
    if(!station&&Array.isArray(state&&state.工站群組)&&select&&select.selectedIndex>=0){
      var label=String(select.options[select.selectedIndex]&&select.options[select.selectedIndex].textContent||'');
      station=state.工站群組.find(function(g){return label.indexOf(String(g.工站名稱||''))>=0&&(!g.主機台||label.indexOf(String(g.主機台))>=0);})||null;
    }
    return station;
  }
  function machinePhotos(){
    var box=document.getElementById('機台清單');
    if(!box)return;
    var state=window.智慧製造報工狀態||{};
    var station=取選定工站(state);
    if(!station)return;
    var rows=[];
    if(Array.isArray(station.機台清單))rows=station.機台清單.map(function(m){return 機台列補照片(m,state);});
    var ids=解析機台編號清單(station);
    ids.forEach(function(id){
      if(!rows.some(function(m){return m.機台編號===id;}))rows.push(機台列補照片({機台編號:id},state));
    });
    rows=rows.filter(function(m){return m&&m.機台編號;});
    if(!rows.length)return;
    var hasPhoto=box.querySelector('.機台卡 img');
    var text=box.textContent||'';
    var shouldRepair=!hasPhoto||text.indexOf('無機圖')>=0||text.indexOf('No Photo')>=0||text.indexOf('請先選擇產品與工站')>=0||text.indexOf('未設定機台')>=0;
    if(!shouldRepair)return;
    var html=rows.map(function(m){
      var id=安全文字(m.機台編號||'');
      var name=安全文字(m.機台名稱||m.機台編號||'');
      var photo=取機台照片(m);
      var image=photo?'<img src="'+安全文字(photo)+'" alt="'+id+'" loading="lazy" referrerpolicy="no-referrer" decoding="async" onerror="this.outerHTML=\'<div class=\\\'無圖\\\'>照片載入失敗 / Photo load failed</div>\';">':'<div class="無圖">無機圖 / No Photo</div>';
      return '<div class="機台卡">'+image+'<div class="機台號">'+id+'</div><div class="小字">'+name+'</div></div>';
    }).join('');
    box.innerHTML=html;
    box.style.setProperty('display','grid','important');
    box.style.setProperty('visibility','visible','important');
    box.style.setProperty('opacity','1','important');
    window.智慧製造機台照片狀態={版本:正式版號,修復來源:'工站+機台主檔',工站:station.工站名稱||'',機台數:rows.length,有照片數:rows.filter(function(m){return !!取機台照片(m);}).length};
  }
  function normalizeOvertimeValue(value){
    var text=String(value||'').split('/')[0].trim();
    return text==='是'?'是':'否';
  }
  function normalizeOvertimeType(value){
    var text=String(value||'').split('/')[0].trim();
    return /^(平日加班|假日加班|臨時加班|無)$/.test(text)?text:'無';
  }
  function ensureOvertimeOptions(){
    var ot=document.getElementById('是否加班');
    if(ot){
      var current=normalizeOvertimeValue(ot.value||手動是否加班||'否');
      if(ot.dataset.manualOvertimeOptions!=='240'){
        ot.innerHTML='<option value="否">否 / No</option><option value="是">是 / Yes</option>';
        ot.dataset.manualOvertimeOptions='240';
      }
      ot.value=加班手動?手動是否加班:current;
    }
    var type=document.getElementById('加班類型');
    if(type){
      var currentType=normalizeOvertimeType(type.value||手動加班類型||'無');
      if(type.dataset.manualOvertimeTypeOptions!=='240'){
        type.innerHTML='<option value="無">無 / None</option><option value="平日加班">平日加班 / Weekday OT</option><option value="假日加班">假日加班 / Holiday OT</option><option value="臨時加班">臨時加班 / Temporary OT</option>';
        type.dataset.manualOvertimeTypeOptions='240';
      }
      type.value=加班類型手動?手動加班類型:currentType;
    }
  }
  function applyOvertimeManualValue(){
    var ot=document.getElementById('是否加班');
    var type=document.getElementById('加班類型');
    if(!ot&&!type)return;
    ensureOvertimeOptions();
    if(!加班手動){
      手動是否加班='否';
      if(ot)ot.value='否';
    }else if(ot){
      ot.value=手動是否加班;
    }
    if(!加班類型手動||手動是否加班==='否'){
      手動加班類型='無';
      if(type)type.value='無';
    }else if(type){
      type.value=手動加班類型;
    }
  }
  function bindOvertimeManual(){
    if(已綁定加班保護)return;
    var ot=document.getElementById('是否加班');
    var type=document.getElementById('加班類型');
    if(!ot&&!type)return;
    已綁定加班保護=true;
    document.addEventListener('change',function(e){
      if(e.target&&e.target.id==='是否加班'){
        加班手動=true;
        手動是否加班=normalizeOvertimeValue(e.target.value);
        if(手動是否加班==='否'){
          加班類型手動=false;
          手動加班類型='無';
        }
        setTimeout(applyOvertimeManualValue,0);
      }
      if(e.target&&e.target.id==='加班類型'){
        加班類型手動=true;
        手動加班類型=normalizeOvertimeType(e.target.value);
        if(手動加班類型!=='無'){
          加班手動=true;
          手動是否加班='是';
        }
        setTimeout(applyOvertimeManualValue,0);
      }
    },true);
    document.addEventListener('input',function(e){
      if(e.target&&e.target.id==='是否加班'){
        加班手動=true;
        手動是否加班=normalizeOvertimeValue(e.target.value);
        setTimeout(applyOvertimeManualValue,0);
      }
      if(e.target&&e.target.id==='加班類型'){
        加班類型手動=true;
        手動加班類型=normalizeOvertimeType(e.target.value);
        setTimeout(applyOvertimeManualValue,0);
      }
    },true);
  }
  function bindRefreshButton(){
    var btn=document.getElementById('重整鈕');
    if(!btn||btn.dataset.refreshBind==='240')return;
    var clone=btn.cloneNode(true);
    clone.dataset.refreshBind='240';
    clone.title='更新到最新正式版 / Update to latest version '+正式版號;
    clone.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      var status=document.getElementById('狀態卡');
      if(status)status.textContent='🟡 更新中 / Updating｜重新載入最新正式版 / Reloading latest version '+正式版號;
      var url=new URL(location.href);
      url.searchParams.set('v',正式版號);
      url.searchParams.set('更新時間',String(Date.now()));
      location.replace(url.toString());
    },true);
    btn.parentNode.replaceChild(clone,btn);
  }
  function run(){loadCss();killLoading();bindScrollGuard();productDrop();bindGlobalProductOpen();stationTop();machinePhotos();bindOvertimeManual();applyOvertimeManualValue();bindRefreshButton();}
  loadCss();killLoading();
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/gh/qhero70/smart-factory-worker-app@eb33ca85a8bca1746614659b41596d3b9a9f8bf8/docs/work-report-v2-core.js?v='+Date.now();
  s.async=false;
  s.onload=function(){
    var ev=document.createEvent('Event');
    ev.initEvent('DOMContentLoaded',true,true);
    document.dispatchEvent(ev);
    setInterval(run,500);
    setTimeout(run,200);
    setTimeout(run,900);
    setTimeout(machinePhotos,1500);
    setTimeout(machinePhotos,2600);
  };
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='工站選擇')setTimeout(machinePhotos,120);},true);
  document.addEventListener('click',function(e){if(e.target&&e.target.closest('.產品卡片')){setTimeout(machinePhotos,260);setTimeout(machinePhotos,900);}},true);
  document.head.appendChild(s);
})();
