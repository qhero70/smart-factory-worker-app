/* 製一組報工表單 V4｜後置機台清單欄位強制修復 v4.5.5
 * 只修一件事：選工站後，主機台下拉與機台卡片要顯示 08_工站途程機台主檔「機台清單」欄位全部機台。
 * 原因：原資料已把主機台帶出，但部分途程的機台清單被前段正規化成主機台；本檔直接再讀 08 原始欄位覆蓋畫面。
 */
(function(){
  'use strict';
  var 版本='v4.5.5_machine_list_after_original_force';
  var 試算表ID='1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';
  var 途程GID='366326104';
  var 原始途程=null;
  var 載入中=null;

  function $(id){return document.getElementById(id);}
  function 文字(v){return String(v===undefined||v===null?'':v).trim();}
  function 正規(v){return 文字(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase();}
  function 取值(o,欄位){o=o||{};for(var i=0;i<欄位.length;i++){var k=欄位[i];var v=o[k];if(v!==undefined&&v!==null&&文字(v)!=='')return 文字(v);}return '';}
  function 顯示訊息(a,b,c,t){try{if(typeof roar==='function')roar(a,b,c,t||'success');}catch(e){}}
  function 設值(id,v){var e=$(id);if(e)e.value=v||'';}
  function 切清單(v){
    return 唯一(文字(v).split(/[、,，;；\s]+/).map(文字).filter(function(x){
      return x && x.indexOf('人員')<0 && !/^人員:?$/i.test(x) && (/\d/.test(x)||/雷刻機|外包|偉宏|賀盛/.test(x));
    }));
  }
  function 唯一(a){var m={},o=[];(a||[]).forEach(function(x){var k=正規(x);if(!k||m[k])return;m[k]=1;o.push(x);});return o;}
  function gviz(gid){
    var cb='__V4_455_'+Date.now()+'_'+Math.floor(Math.random()*1000000);
    var url='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(試算表ID)+'/gviz/tq?tq='+encodeURIComponent('select *')+'&tqx='+encodeURIComponent('out:json;responseHandler:'+cb)+'&gid='+encodeURIComponent(gid)+'&_ts='+Date.now();
    return new Promise(function(resolve,reject){
      var done=false,sc=document.createElement('script');
      var timer=setTimeout(function(){if(done)return;done=true;cleanup();reject(new Error('08_工站途程機台主檔讀取逾時'));},20000);
      function cleanup(){clearTimeout(timer);try{delete window[cb];}catch(e){window[cb]=undefined;}try{sc.remove();}catch(e){}}
      window[cb]=function(payload){if(done)return;done=true;cleanup();resolve(payload);};
      sc.onerror=function(){if(done)return;done=true;cleanup();reject(new Error('08_工站途程機台主檔讀取失敗'));};
      sc.src=url;document.head.appendChild(sc);
    });
  }
  function cell(c){if(!c)return '';if(c.f!==undefined&&c.f!==null&&文字(c.f)!=='')return c.f;if(c.v!==undefined&&c.v!==null)return c.v;return '';}
  function 是表頭(a){var s='|'+a.map(文字).join('|')+'|';return /\|產品編號\||\|工站名稱\||\|報工工站名稱\||\|工序\||\|主機台\||\|機台清單\|/.test(s);}
  function 轉物件(payload){
    var t=payload.table||{}, rows=t.rows||[], cols=t.cols||[];
    var labels=cols.map(function(c){return 文字(c.label||c.id);});
    var first=rows.length?(rows[0].c||[]).map(function(c){return 文字(cell(c));}):[];
    var headers=[], start=0;
    if(是表頭(first)){headers=first;start=1;}else if(是表頭(labels)){headers=labels;start=0;}else{headers=first.length?first:labels;start=first.length?1:0;}
    return rows.slice(start).map(function(r,ri){var o={__列號:ri+start+1};var cs=r.c||[];headers.forEach(function(h,i){if(h)o[文字(h)]=cell(cs[i]);});return o;}).filter(function(o){return Object.keys(o).some(function(k){return k!=='__列號'&&文字(o[k])!=='');});
  }
  function 載入原始途程(){
    if(原始途程)return Promise.resolve(原始途程);
    if(載入中)return 載入中;
    載入中=gviz(途程GID).then(function(p){原始途程=轉物件(p);try{console.log('V4 455 原始途程列數',原始途程.length);}catch(e){}return 原始途程;});
    return 載入中;
  }
  function 目前產品碼(){return 文字(($('productCode')||{}).value);}
  function 目前工站物件(){try{var s=$('workstationSelect');var i=s?s.value:'';return i===''?null:(STATE.productGroupList||[])[Number(i)];}catch(e){return null;}}
  function 比對途程(g){
    var prod=正規(目前產品碼()||取值(g,['產品編號']));
    var cust=正規(取值(g,['客戶品號']));
    var station=正規(取值(g,['報工工站名稱','工站名稱']));
    var op=正規(取值(g,['工序範圍','工序']));
    var main=正規(取值(g,['主機台','主機台編號','機台編號']));
    var best=null,bestScore=-1;
    (原始途程||[]).forEach(function(r){
      var rp=正規(取值(r,['產品編號','料號','品號']));
      var rc=正規(取值(r,['客戶品號','客戶料號']));
      var rs=正規(取值(r,['報工工站名稱','工站名稱','工站']));
      var ro=正規(取值(r,['工序範圍','工序','工序清單','OP']));
      var rm=正規(取值(r,['主機台','主機台編號','機台編號']));
      var score=0;
      if(prod&&(prod===rp||prod===rc))score+=10;
      if(cust&&(cust===rp||cust===rc))score+=10;
      if(station&&station===rs)score+=5;
      if(op&&op===ro)score+=5;
      if(main&&main===rm)score+=2;
      if(score>bestScore){bestScore=score;best=r;}
    });
    return bestScore>=15?best:null;
  }
  function 機台物件(id){
    var hit=null;
    try{hit=(DB.機台清單||DB.machines||DB.machineList||[]).find(function(m){return 正規(m.機台編號||m.設備編號||m.編號)===正規(id);});}catch(e){}
    hit=hit||{};
    return {機台編號:文字(hit.機台編號||hit.設備編號||id),設備名稱:文字(hit.設備名稱||hit.機台名稱||('機台'+id)),機台名稱:文字(hit.機台名稱||hit.設備名稱||('機台'+id)),區域:文字(hit.區域||hit.廠區||hit.位置),機台型號:文字(hit.機台型號||hit.型號),照片網址:文字(hit.照片網址||hit.縮圖網址),縮圖網址:文字(hit.縮圖網址||hit.照片網址)};
  }
  function 套用機台清單(){
    var g=目前工站物件();
    if(!g)return;
    載入原始途程().then(function(){
      var r=比對途程(g);
      var raw=r?取值(r,['機台清單','機台清單原始','機台編號清單','可用機台','設備清單']):'';
      var ids=切清單(raw);
      if(!ids.length)ids=切清單(取值(g,['機台清單原始','機台編號清單','可用機台']));
      if(!ids.length&&Array.isArray(g.機台清單))ids=唯一(g.機台清單.map(function(m){return 文字(m.機台編號||m.主機台||m.設備編號||m.編號);}));
      if(!ids.length)ids=切清單(取值(g,['主機台','主機台編號','機台編號']));
      var list=ids.map(機台物件);
      g.機台清單=list;g.機台編號清單=ids;g.機台清單原始=ids.join('、');
      if(typeof buildMachineSelect==='function')buildMachineSelect(list);
      if(typeof renderMachineGrid==='function')renderMachineGrid(list);
      var s=$('mainMachineSelect');
      if(s&&ids.length){s.value=ids[0];}
      顯示訊息('🏭','機台清單已套用','來源：08_工站途程機台主檔｜機台：'+ids.join('、'),'success');
    }).catch(function(err){顯示訊息('⚠️','機台清單讀取失敗',err.message||String(err),'warning');});
  }
  function 修正工站選項文字(){
    try{
      if(!STATE.productGroupList||!STATE.productGroupList.length)return;
      載入原始途程().then(function(){
        var s=$('workstationSelect');
        STATE.productGroupList.forEach(function(g,i){
          var r=比對途程(g);var ids=切清單(r&&取值(r,['機台清單','機台編號清單','可用機台']));
          if(ids.length){g.機台清單原始=ids.join('、');g.機台編號清單=ids;g.機台清單=ids.map(機台物件);if(s&&s.options[i+1])s.options[i+1].text=[取值(g,['報工工站名稱','工站名稱']),取值(g,['工序範圍','工序']),ids.join('、')].filter(Boolean).join('｜');}
        });
      });
    }catch(e){}
  }
  function 安裝(){
    載入原始途程().catch(function(){});
    var s=$('workstationSelect');
    if(s&&!s.__v455){s.addEventListener('change',function(){setTimeout(套用機台清單,80);},true);s.__v455=true;}
    if(typeof onWorkstationChange==='function'&&!onWorkstationChange.__v455){var old=onWorkstationChange;window.onWorkstationChange=function(){var r=old.apply(this,arguments);setTimeout(套用機台清單,80);return r;};window.onWorkstationChange.__v455=true;}
    if(typeof selectProduct==='function'&&!selectProduct.__v455){var oldp=selectProduct;window.selectProduct=function(key){var r=oldp.apply(this,arguments);setTimeout(修正工站選項文字,300);return r;};window.selectProduct.__v455=true;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',安裝);else 安裝();
  window.addEventListener('load',function(){安裝();setTimeout(修正工站選項文字,1000);});
  setInterval(安裝,1500);
  console.log('V4 455 後置機台清單欄位強制修復已載入',版本);
})();