(function(){
  'use strict';
  var V='259_mainline_get_shim';
  function url(){return (window.PWA_CONFIG&&window.PWA_CONFIG.GAS_WEB_APP_URL)||'';}
  function qs(obj){var sp=new URLSearchParams();Object.keys(obj||{}).forEach(function(k){var v=obj[k];if(v===undefined||v===null)return;if(typeof v==='object')v=JSON.stringify(v);sp.set(k,String(v));});return sp.toString();}
  async function getCall(action,payload){
    var u=url();
    if(!u) throw new Error('GAS_WEB_APP_URL 未設定');
    var p=Object.assign({},payload||{},{action:action,'動作':action,_ts:Date.now()});
    var r=await fetch(u+'?'+qs(p),{method:'GET',cache:'no-store',redirect:'follow'});
    var text=await r.text();
    try{return JSON.parse(text)}catch(e){return {成功:false,success:false,error:'NON_JSON_RESPONSE',body:text.slice(0,1000)}}
  }
  function show(x){var el=document.getElementById('sysOut');if(el)el.textContent=typeof x==='string'?x:JSON.stringify(x,null,2);}
  async function doAction(action,payload){try{show('執行中：'+action);var data=await getCall(action,payload);show(data);return data;}catch(e){var err={成功:false,success:false,error:'GET_CALL_FAILED',message:e.message};show(err);return err;}}
  function worker(){var el=document.getElementById('workerId');var id=el?el.value:'';if(id)localStorage.setItem('NEXUS_OS_工號',id);return id;}
  function install(){
    window.NEXUS_GET_259=doAction;
    window.runAction=function(action){return doAction(action);};
    window.loadSupervisor=function(){return doAction('取得主管主線追蹤38_7');};
    window.loadTasks=function(){return doAction('取得今日任務38_7',{工號:worker()});};
    window.NEXUS_執行動作258=function(action,payload){return doAction(action,payload);};
    window.NEXUS_主線驗收258=function(){return doAction('主線實機驗收38_7');};
    window.NEXUS_主管追蹤258=function(){return doAction('取得主管主線追蹤38_7');};
    window.NEXUS_讀今日任務258=function(){return doAction('取得今日任務38_7',{工號:worker()});};
    document.body.dataset.nexusMainlineGetShim259=V;
  }
  window.addEventListener('load',function(){install();setInterval(install,1200);});
})();
