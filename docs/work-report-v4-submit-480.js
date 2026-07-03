/* V4.8.0：修復 GitHub Pages 送出後未落表。只處理送出寫入通道，不改畫面流程。 */
(function(){
'use strict';
var GAS_URL='https://script.google.com/macros/s/AKfycbwOi-xjKoMD9jVq4HrHBvh7k1DCn70lAPAJiqaWJhvH70PbuRo4ciopCjYcytIalaW4/exec';
var SS='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
function E(id){return document.getElementById(id)}
function s(v){return String(v==null?'':v)}
function nowId(){var d=new Date(),z=function(n){return String(n).padStart(2,'0')};return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'-'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds())}
function today(){var d=new Date(),z=function(n){return String(n).padStart(2,'0')};return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())}
function formPost(action,payload){
  payload=Object.assign({spreadsheetId:SS,正式主資料庫ID:SS,主資料庫ID:SS},payload||{});
  payload.action=action;payload.動作=action;payload._ts=String(Date.now());
  var iframe=document.getElementById('v4WriteIframe480');
  if(!iframe){iframe=document.createElement('iframe');iframe.name='v4WriteIframe480';iframe.id='v4WriteIframe480';iframe.style.cssText='display:none;width:0;height:0;border:0';document.body.appendChild(iframe)}
  var form=document.createElement('form');
  form.method='POST';form.action=(window.PWA_CONFIG&&PWA_CONFIG.GAS_WEB_APP_URL)||GAS_URL;form.target='v4WriteIframe480';form.style.display='none';form.enctype='application/x-www-form-urlencoded';
  function add(k,v){var input=document.createElement('input');input.type='hidden';input.name=k;input.value=typeof v==='object'?JSON.stringify(v):s(v);form.appendChild(input)}
  Object.keys(payload).forEach(function(k){add(k,payload[k])});
  var json=JSON.stringify(payload);add('payload',json);add('資料',json);add('json',json);
  document.body.appendChild(form);form.submit();setTimeout(function(){try{form.remove()}catch(e){}},1500);
}
function postRecord(action,payload){
  formPost(action,payload);
  try{if(window.GAS橋接器&&GAS橋接器.POST)GAS橋接器.POST(action,payload).catch(function(){});}catch(e){}
}
function patch(){
 if(window.__v4Submit480)return;window.__v4Submit480=1;
 if(typeof window.submitReport!=='function')return;
 window.submitReport=function(){
   var d=buildReportData();
   var err=validateReport(d);
   if(err){roar('⚠️','驗證失敗 / Validation Failed',err,'error');return;}
   updatePreview();updateConfirmSummary();
   var hasDefects=d.不良數>0||(d.不良行清單||[]).length>0;
   var msg='確認送出報工？/ Confirm submit?\n\n實際良品：'+d.實際良品數+' pcs'+(hasDefects?'\n不良數：'+d.不良數+' pcs（將同步寫入09_不良紀錄）':'');
   if(!confirm(msg))return;
   showSubmitOverlay(true,'📤 報工送出中...','正在寫入 09_報工 / 09_不良紀錄...');
   var reportNo=d.報工編號||('RPT-'+nowId()+'-'+s(d.工號).toUpperCase()+'-'+s(d.產品編號).toUpperCase());
   d.報工編號=reportNo;d.作業日=d.作業日||today();d.寫入時間=new Date().toISOString();
   var payload=(typeof V4資料對接_轉V3報工Payload_==='function')?V4資料對接_轉V3報工Payload_(d,(typeof V4資料對接_讀今日任務_==='function'?V4資料對接_讀今日任務_():{})||{}):d;
   payload.報工編號=reportNo;payload.作業日=payload.作業日||d.作業日;payload.寫入時間=d.寫入時間;
   postRecord('寫入報工作業v2',payload);
   if(hasDefects){
     var defectData=buildDefectData(d,reportNo);defectData.報工編號=reportNo;defectData.作業日=d.作業日;
     postRecord('寫入不良紀錄v2',defectData);
   }
   try{localStorage.setItem('V4最後送出備份',JSON.stringify({報工:payload,不良:hasDefects?buildDefectData(d,reportNo):null,時間:new Date().toISOString()}));}catch(e){}
   setTimeout(function(){
     showSubmitOverlay(false);updateBottomBar();
     roar('✅','報工已送出 / Submitted','報工編號：'+reportNo+'；已送往正式主資料庫 09_報工'+(hasDefects?'、09_不良紀錄':''),'success');
     resetAfterSubmit();
   },2800);
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
setTimeout(patch,500);setTimeout(patch,1200);
})();
