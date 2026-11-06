'use strict';
const 測試=require('node:test'),斷言=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('docs/tool-change-pwa/index.html','utf8');
測試('空白視窗 load 不會移除 POST；讀回完成後才清理',()=>{
 const 節點=[];let 已送出=0;
 const document={createElement(tag){const x={tag,appendChild(){},remove(){this.已移除=true;},submit(){已送出++;}};節點.push(x);return x;},body:{appendChild(){}}};
 const c={document,crypto:{randomUUID:()=> 'test'},FORMAL_GAS_API_URL:'https://example.test/exec'};vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('function 送出正式刀具表_('),html.indexOf('function sleep_')),c);
 const 清理=c.送出正式刀具表_({快照:{type:1}});
 const 框=節點.find(x=>x.tag==='iframe');if(框.onload)框.onload();
 斷言.equal(已送出,1);斷言.equal(框.已移除,undefined);清理();斷言.equal(框.已移除,true);
});
測試('GAS、讀回重導及 Drive 不進 Service Worker 快取',()=>{
 const 處理={};const c={URL,self:{location:{origin:'https://qhero70.github.io'},addEventListener:(n,f)=>處理[n]=f}};vm.createContext(c);
 vm.runInContext(fs.readFileSync('docs/tool-change-pwa/service-worker.js','utf8'),c);
 for(const host of ['script.google.com','script.googleusercontent.com','drive.google.com']) {
  let 攔截=false;處理.fetch({request:{method:'GET',url:'https://'+host+'/test'},respondWith(){攔截=true;}});斷言.equal(攔截,false);
 }
});
測試('舊正式 GAS 數字轉型可以核對，空值、不同數值及文字不可冒充成功',()=>{
 const c={};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('function 正式欄位一致_('),html.indexOf('async function saveCurrentToFormalSheets(')),c);
 for(const [k,a,b,ok] of [['H值','011',11,true],['H值','012',11,false],['H值','',0,false],['G補正X軸','0.020',0.02,true],['刀號','011',11,false],['照片URL','a','b',false]])斷言.equal(c.正式欄位一致_(k,a,b),ok);
});
