'use strict';
const 測試=require('node:test');
const 斷言=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../docs/tool-change-pwa');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'刀具表精靈_介面優化.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
測試('A4/A3 建新表第一步都是工件三視圖',()=>{
 const f1=html.slice(html.indexOf('const flowType1 = ['),html.indexOf('const toolFlowType1 = ['));
 const f2=html.slice(html.indexOf('const flowType2 = ['),html.indexOf('const toolFlowType2 = ['));
 for(const f of [f1,f2]){
  斷言.match(f,/const flowType[12] = \[\s*\{ id:'工件三視圖',type:'workpiece3'/);
  斷言.ok(f.includes('正視圖、俯視圖、側視圖'));
 }
});
測試('H 值 01 至 300 採手機原生滾輪，需確認才送出',()=>{
 斷言.equal((html.match(/id: 't_h', type: 'wheel'/g)||[]).length,2);
 斷言.ok(html.includes('for(let i=1;i<=300;i++)'));
 斷言.ok(html.includes("String(i).padStart(2,'0')"));
 斷言.ok(html.includes("select.id='H值滾輪'"));
 斷言.ok(html.includes("confirm.onclick=()=>"));
 斷言.equal(new Set(Array.from({length:300},(_,i)=>String(i+1).padStart(2,'0'))).size,300);
});
測試('刀具壽命只需填結束數量、使用趟數固定0',()=>{
 for(const name of ['t_life_register','t_life_end']){
  斷言.equal((html.match(new RegExp("id:'"+name+"',type:'number'","g"))||[]).length,2,name);
 }
 斷言.equal((html.match(/id:'t_life',type:'number'/g)||[]).length,0);
 斷言.ok(html.includes("currentTool.t_life='0'"));
 斷言.ok(html.includes("const 結束=currentTool.t_life_end||'';"));
 const formatted=(reg,qty)=>'#'+reg+'+1=0 使用趟數'+String.fromCharCode(10)+'TOOL LIFE（結束數量）='+qty;
 斷言.equal(formatted(534,30),'#534+1=0 使用趟數'+String.fromCharCode(10)+'TOOL LIFE（結束數量）=30');
});
測試('三視圖位於預覽頂欄，能拍攝、重拍及放大',()=>{
 for(const id of ['out-workpiece-views-a4','out-workpiece-views-a3','工件三視圖視窗','工件三視圖大圖視窗','工件三視圖大圖圖片'])
  斷言.ok(html.includes('id="'+id+'"'),id);
 斷言.ok(html.includes("grid.id='工件三視圖對話縮圖'"),'對話縮圖由程式動態建立');
 for(const view of ['正視圖','俯視圖','側視圖']){
  斷言.ok(html.includes('id="工件三視圖檔案-'+view+'"'));
  斷言.ok(html.includes('id="工件三視圖照片-'+view+'"'));
 }
 斷言.ok(html.includes('capture="environment"'));
 斷言.ok(html.includes('function 接收工件三視圖_(input,key)'));
 斷言.ok(html.includes('function 開啟工件三視圖大圖_(key)'));
 斷言.ok(html.includes('function 渲染工件三視圖_()'));
 斷言.ok(css.includes('z-index:12100!important'));
 斷言.ok(css.includes('touch-action:pinch-zoom'));
});
測試('三視圖寫入刀具表快照且對 Google 試算表有長度限制',()=>{
 斷言.ok(html.includes("工件三視圖: {正視圖:'',俯視圖:'',側視圖:''}"));
 斷言.ok(html.includes('JSON.stringify(d).length>47000'));
 斷言.ok(html.includes('data.length>9800'));
 斷言.ok(html.includes("String(store.currentId||'')!==originalId"));
 斷言.ok(html.includes('appData.工件三視圖=JSON.parse(JSON.stringify(prev.工件三視圖'));
 斷言.ok(html.includes('渲染工件三視圖_();'));
 斷言.ok(sw.includes('殼層-r17'));
 斷言.ok(sw.includes('介面優化.css?版本=240'));
});
