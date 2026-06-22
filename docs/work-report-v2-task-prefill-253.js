(function(){
  'use strict';
  var V='253-task-prefill';
  var KEY='NEXUS_OS_今日報工任務';
  function text(v){return String(v===null||v===undefined?'':v).trim()}
  function $(id){return document.getElementById(id)}
  function val(ids){for(var i=0;i<ids.length;i++){var el=$(ids[i])||document.querySelector('[name="'+ids[i]+'"]');if(el&&text(el.value))return text(el.value)}return''}
  function setVal(ids,value){
    var v=text(value); if(!v)return false;
    for(var i=0;i<ids.length;i++){
      var el=$(ids[i]) || document.querySelector('[name="'+ids[i]+'"]');
      if(el){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;}
    }
    return false;
  }
  function getTask(){
    var u=new URL(location.href), raw=u.searchParams.get('task')||u.searchParams.get('dispatch')||'';
    if(raw){try{return JSON.parse(decodeURIComponent(raw))}catch(e){}}
    try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return{}}
  }
  function putBanner(task){
    if(!task || !Object.keys(task).length || document.getElementById('今日任務帶入提示253'))return;
    var box=document.createElement('div');
    box.id='今日任務帶入提示253';
    box.style.cssText='position:sticky;top:0;z-index:9999;margin:8px 0 10px;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,rgba(0,210,255,.18),rgba(16,185,129,.18));border:1px solid rgba(0,210,255,.55);color:#e2f8ff;font-weight:900;line-height:1.55;box-shadow:0 10px 28px rgba(0,0,0,.28);';
    box.innerHTML='✅ 已帶入今日任務<br><span style="font-size:12px;color:#a7e8ff">派班：'+text(task.派班編號)+'｜'+text(task.姓名)+'｜'+(text(task.品名)||text(task.產品編號))+'｜工站：'+text(task.工站名稱)+'｜機台：'+text(task.機台編號)+'</span>';
    var target=document.querySelector('.外框')||document.body;
    target.insertBefore(box,target.firstChild);
  }
  function prefill(){
    var task=getTask();
    if(!task || !Object.keys(task).length)return;
    setVal(['派班編號','來源派班編號','今日派班編號'],task.派班編號);
    setVal(['工號','作業員工號','員工工號'],task.工號);
    setVal(['姓名','作業員姓名','員工姓名'],task.姓名);
    setVal(['班別'],task.班別);
    setVal(['產品編號','產品料號','料號'],task.產品編號);
    setVal(['客戶品號','客戶料號'],task.客戶品號);
    setVal(['品名','產品名稱'],task.品名);
    setVal(['工站名稱','報工工站名稱','工站'],task.工站名稱);
    setVal(['機台編號','主機台','機台','機台清單'],task.機台編號);
    setVal(['工單編號'],task.工單編號 || task.來源需求編號);
    setVal(['預計數量','需求量'],task.預計數量 || task.需求量);
    if(!text(($('備註')||{}).value)) setVal(['備註'],'由 NEXUS OS 今日任務帶入：'+text(task.派班編號));
    window.NEXUS_OS_今日報工任務=task;
    putBanner(task);
  }
  function pickQty(reportResult,task){
    return text((reportResult&&reportResult.報工數量)||(reportResult&&reportResult.今日共做數)||(reportResult&&reportResult.實際良品數)||(reportResult&&reportResult.良品數)||val(['今日共做數','報工數量','實際良品數','良品數','完成數量'])||task.預計數量||task.需求量||0);
  }
  async function 回寫派班狀態(reportResult){
    var task=getTask();
    if(!task || !text(task.派班編號) || !window.GAS橋接器)return;
    var reportNo=text((reportResult&&reportResult.報工編號)||(reportResult&&reportResult.id)||(reportResult&&reportResult.流水號));
    var payload={
      派班編號:task.派班編號,
      報工編號:reportNo,
      狀態:'已報工',
      報工數量:pickQty(reportResult,task),
      工單編號:task.工單編號 || task.來源需求編號,
      來源需求編號:task.來源需求編號,
      action:'更新今日派班狀態38_7'
    };
    try{
      var res=await window.GAS橋接器.呼叫('更新今日派班狀態38_7',payload,{method:'POST',timeoutMs:12000});
      console.log('[NEXUS OS] 今日派班回寫完成',res);
      localStorage.removeItem(KEY);
      return res;
    }catch(e){console.warn('[NEXUS OS] 今日派班回寫失敗',e);return null;}
  }
  function hookFetch(){
    if(window.__NEXUS_TASK_FETCH_HOOKED__)return; window.__NEXUS_TASK_FETCH_HOOKED__=true;
    var orig=window.fetch;
    window.fetch=function(input,init){
      var url=String((input && input.url) || input || '');
      var body=String((init && init.body) || '');
      return orig.apply(this,arguments).then(function(res){
        try{
          var isReport=url.indexOf('寫入報工作業v2')>=0 || url.indexOf('寫入今日派班報工')>=0 || body.indexOf('寫入報工作業v2')>=0 || body.indexOf('寫入今日派班報工')>=0;
          if(isReport){res.clone().json().then(function(j){if(j && (j.成功||j.success!==false))回寫派班狀態(j)}).catch(function(){});}
        }catch(e){}
        return res;
      });
    };
  }
  window.NEXUS_OS_帶入今日任務=prefill;
  window.NEXUS_OS_回寫今日派班狀態=回寫派班狀態;
  document.addEventListener('DOMContentLoaded',function(){prefill();hookFetch();[500,1200,2500,4500].forEach(function(ms){setTimeout(prefill,ms)});document.body.dataset.taskPrefill253=V;});
})();
