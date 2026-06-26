/*
 * 製一組報工表單 V4｜強制正式主庫初始資料接管 v4.4.1
 * 目的：只接正式 Google Sheets 主庫，不再回退 GAS fetch 與少量保底資料，避免 iOS/Safari Load failed。
 */
(function(){
  'use strict';
  var VER='v4.4.1_force_formal_init_bridge_no_load_failed';
  var 安裝截止=Date.now()+12000;
  function log(){try{console.log.apply(console,arguments);}catch(e){}}
  function warn(){try{console.warn.apply(console,arguments);}catch(e){}}
  function toast(icon,title,msg,type){try{if(typeof window.roar==='function')window.roar(icon,title,msg,type||'ok');}catch(e){}}
  function countMachines(data){var set={};((data&&(data.報工工站群組||data.途程工站群組))||[]).forEach(function(g){(g.機台清單||[]).forEach(function(m){if(m&&m.機台編號)set[String(m.機台編號)]=true;});if(g.主機台)set[String(g.主機台)]=true;});return Object.keys(set).length;}
  function normalizeResult(data){data=data||{};var groups=data.報工工站群組||data.途程工站群組||[];data.成功=true;data.success=true;data.ok=true;data.報工工站群組=groups;data.途程工站群組=groups;data.產品清單=data.產品清單||data.products||[];data.機台清單=data.機台清單||data.machines||[];data.資料來源=data.資料來源||'正式GoogleSheets直讀_強制接管_免LoadFailed';data.版本=data.版本||VER;data.筆數=data.筆數||{};data.筆數.人員=(data.人員||[]).length;data.筆數.產品=data.筆數.產品||(data.產品清單||[]).length;data.筆數.報工工站群組=groups.length;data.筆數.工站機台關聯=groups.length;data.筆數.機台=data.筆數.機台||(data.機台清單||[]).length||countMachines(data);return data;}
  function waitBridge(){return new Promise(function(resolve,reject){var started=Date.now();(function check(){if(window.V4_SHEETS_DIRECT_BRIDGE&&typeof window.V4_SHEETS_DIRECT_BRIDGE.讀取正式資料==='function')return resolve(window.V4_SHEETS_DIRECT_BRIDGE);if(Date.now()-started>10000)return reject(new Error('正式主庫直讀橋尚未載入，已停止回退 GAS fetch，避免 Load failed。'));setTimeout(check,120);})();});}
  function readFormal(){return waitBridge().then(function(bridge){if(typeof bridge.清除快取==='function'){}return bridge.讀取正式資料().then(normalizeResult);});}
  function install(){window.GAS橋接器=window.GAS橋接器||{};window.GAS橋接器.取得報工初始資料=function(){return readFormal().then(function(data){log('V4 force formal init loaded',data&&data.筆數);try{var p=data.筆數||{};if((p.人員||0)>13||(p.報工工站群組||0)>16){toast('✅','正式主庫已載入 / Formal DB Loaded','人員 '+p.人員+' 筆｜產品 '+(p.產品||'')+' 筆｜工站群組 '+p.報工工站群組+' 筆｜機台 '+(p.機台||'')+' 筆','ok');}}catch(e){}return data;}).catch(function(err){warn('V4 formal init failed - no old fallback',err);throw err;});};window.__V4_FORCE_FORMAL_INSTALLED__=true;log('V4 Force Formal Init Bridge installed',VER);}
  install();
  var guard=setInterval(function(){install();if(Date.now()>安裝截止)clearInterval(guard);},250);
})();