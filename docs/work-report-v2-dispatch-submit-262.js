(function(){
  'use strict';
  var KEY='NEXUS_OS_今日報工任務';
  function s(v){return String(v==null?'':v).trim();}
  function task(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){return{};}}
  function q(id){var el=document.getElementById(id);return el?s(el.value):'';}
  function gas(){return window.PWA_CONFIG&&window.PWA_CONFIG.GAS_WEB_APP_URL||'';}
  function set(obj,k,v){if(obj&&s(v)&&!s(obj[k]))obj[k]=s(v);}
  function merge(obj){
    var t=task(); if(!t||!Object.keys(t).length||!obj)return obj;
    set(obj,'派班編號',t['派班編號']); set(obj,'來源派班編號',t['派班編號']); set(obj,'今日派班編號',t['派班編號']);
    set(obj,'來源需求編號',t['來源需求編號']); set(obj,'工單編號',t['來源需求編號']);
    set(obj,'產品編號',t['產品編號']); set(obj,'客戶品號',t['客戶品號']); set(obj,'品名',t['品名']);
    set(obj,'工號',t['工號']); set(obj,'姓名',t['姓名']); set(obj,'班別',t['班別']);
    set(obj,'工站名稱',t['工站名稱']||q('今日任務工站261')||q('工站選擇'));
    set(obj,'機台編號',t['機台編號']||q('今日任務機台261'));
    set(obj,'需求量',t['需求量']); set(obj,'預計數量',t['預計數量']);
    set(obj,'今日共做數',q('今日共做數')); set(obj,'報工數量',q('今日共做數'));
    obj['NEXUS派班報工']='是'; obj['NEXUS任務版本']='262';
    return obj;
  }
  function mergeJsonBody(body){
    try{
      var obj=JSON.parse(body);
      if(obj&&typeof obj==='object'){
        merge(obj);
        if(obj.payload&&typeof obj.payload==='object')merge(obj.payload);
        if(obj.data&&typeof obj.data==='object')merge(obj.data);
        return JSON.stringify(obj);
      }
    }catch(e){}
    return body;
  }
  function mergeFormBody(body){
    var t=task(); if(!t||!Object.keys(t).length)return body;
    var sp=new URLSearchParams(body);
    ['派班編號','來源需求編號','產品編號','客戶品號','品名','工號','姓名','班別'].forEach(function(k){if(!sp.get(k)&&t[k])sp.set(k,t[k]);});
    if(!sp.get('報工數量')&&q('今日共做數'))sp.set('報工數量',q('今日共做數'));
    sp.set('NEXUS派班報工','是'); sp.set('NEXUS任務版本','262');
    return sp.toString();
  }
  function patchFetch(){
    if(window.__NEXUS_SUBMIT_262__)return; window.__NEXUS_SUBMIT_262__=true;
    var old=window.fetch;
    window.fetch=function(input,init){
      init=init||{};
      var url=String(input&&input.url||input||'');
      var body=init.body;
      var bodyText=typeof body==='string'?body:'';
      var hit=url.indexOf('寫入報工作業v2')>=0||url.indexOf('寫入今日派班報工')>=0||bodyText.indexOf('寫入報工作業v2')>=0||bodyText.indexOf('寫入今日派班報工')>=0;
      if(hit&&bodyText){
        var next=bodyText.charAt(0)==='{'?mergeJsonBody(bodyText):mergeFormBody(bodyText);
        init=Object.assign({},init,{body:next});
      }
      return old.call(this,input,init).then(function(res){
        if(hit){res.clone().json().then(function(j){if(j&&(j.成功||j.success!==false))updateDispatch(j);}).catch(function(){});}
        return res;
      });
    };
  }
  function updateDispatch(report){
    var t=task(); if(!t||!t['派班編號']||!gas())return;
    var sp=new URLSearchParams();
    sp.set('action','更新今日派班狀態38_7'); sp.set('動作','更新今日派班狀態38_7');
    sp.set('派班編號',t['派班編號']); sp.set('來源需求編號',t['來源需求編號']||'');
    sp.set('狀態','已報工'); sp.set('報工數量',q('今日共做數')||t['預計數量']||t['需求量']||0);
    sp.set('報工編號',report['報工編號']||report['流水號']||report['id']||''); sp.set('_ts',Date.now());
    fetch(gas()+'?'+sp.toString(),{method:'GET',cache:'no-store'}).then(function(){localStorage.removeItem(KEY);}).catch(function(e){console.warn('NEXUS 262 派班回寫失敗',e);});
  }
  function mark(){document.body.dataset.nexusDispatchSubmit262='ready';}
  document.addEventListener('DOMContentLoaded',function(){patchFetch();mark();setInterval(patchFetch,1200);});
})();
