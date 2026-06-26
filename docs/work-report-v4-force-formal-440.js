/*
 * 製一組報工表單 V4｜強制正式主庫初始資料接管 v4.4.0
 * 目的：原 V4 在 GitHub Pages 會呼叫 GAS橋接器.取得報工初始資料()，不是直接 fetch。
 * 本檔直接接管 GAS橋接器 初始資料方法，避免再走會 Load failed 的 GAS fetch。
 */
(function(){
  'use strict';
  var VER='v4.4.0_force_formal_init_bridge';
  function log(){try{console.log.apply(console,arguments);}catch(e){}}
  function warn(){try{console.warn.apply(console,arguments);}catch(e){}}
  function toast(icon,title,msg,type){
    try{
      if(typeof window.roar==='function') window.roar(icon,title,msg,type||'ok');
    }catch(e){}
  }
  function countMachines(data){
    var set={};
    (data && (data.報工工站群組||data.途程工站群組)||[]).forEach(function(g){
      (g.機台清單||[]).forEach(function(m){ if(m && m.機台編號) set[String(m.機台編號)]=true; });
      if(g.主機台) set[String(g.主機台)]=true;
    });
    return Object.keys(set).length;
  }
  function normalizeResult(data){
    data=data||{};
    var groups=data.報工工站群組||data.途程工站群組||[];
    data.成功=true; data.success=true; data.ok=true;
    data.報工工站群組=groups;
    data.途程工站群組=groups;
    data.資料來源=data.資料來源||'正式GoogleSheets直讀_強制接管';
    data.版本=data.版本||VER;
    data.筆數=data.筆數||{};
    data.筆數.人員=(data.人員||[]).length;
    data.筆數.報工工站群組=groups.length;
    data.筆數.工站機台關聯=groups.length;
    data.筆數.機台=data.筆數.機台||countMachines(data);
    return data;
  }
  function readFormal(){
    if(!window.V4_SHEETS_DIRECT_BRIDGE || typeof window.V4_SHEETS_DIRECT_BRIDGE.讀取正式資料!=='function'){
      return Promise.reject(new Error('正式主庫直讀橋尚未載入'));
    }
    return window.V4_SHEETS_DIRECT_BRIDGE.讀取正式資料().then(normalizeResult);
  }
  function install(){
    window.GAS橋接器=window.GAS橋接器||{};
    var old=window.GAS橋接器.取得報工初始資料;
    window.GAS橋接器.取得報工初始資料=function(){
      return readFormal().then(function(data){
        log('V4 force formal init loaded', data && data.筆數);
        try{
          var p=data.筆數||{};
          if((p.人員||0)>13 || (p.報工工站群組||0)>16){
            toast('✅','正式主庫已載入 / Formal DB Loaded','人員 '+p.人員+' 筆｜工站群組 '+p.報工工站群組+' 筆｜機台 '+(p.機台||'')+' 筆','ok');
          }
        }catch(e){}
        return data;
      }).catch(function(err){
        warn('V4 formal init failed',err);
        if(typeof old==='function') return old.apply(window.GAS橋接器,arguments);
        throw err;
      });
    };
    window.__V4_FORCE_FORMAL_INSTALLED__=true;
    log('V4 Force Formal Init Bridge installed',VER);
  }
  install();
})();