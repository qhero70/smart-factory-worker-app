'use strict';
const 測試=require('node:test');
const 斷言=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../docs/tool-change-pwa');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const photo=fs.readFileSync(path.join(base,'刀具表精靈_工件高解析雲端管理.js'),'utf8');
const sw=fs.readFileSync(path.join(base,'service-worker.js'),'utf8');
const style=fs.readFileSync(path.join(base,'刀具表精靈_介面優化.css'),'utf8');
測試('原圖儲存在 IndexedDB 並供放大檢視',()=>{
 for(const s of ['indexedDB.open','objectStore(\'照片\').put','檔案:file','URL.createObjectURL(full.檔案)','window.開啟工件三視圖大圖_=async function'])斷言.ok(photo.includes(s),s);
 斷言.doesNotThrow(()=>new Function(photo));
});
測試('雲端原圖連結必須為 Google Drive HTTPS 連結',()=>{
 斷言.ok(html.includes('1au_lydLX3NAEwEs8lzLF58iJ5uzKveYQ'));
 斷言.ok(photo.includes("target.protocol!=='https:'"));
 斷言.ok(photo.includes("['drive.google.com','docs.google.com']"));
 斷言.ok(photo.includes('navigator.share'));
 斷言.ok(photo.includes('請確認 Google Drive 已收到原圖'));
});
測試('預覽可存正式試算表且載入舊表仍沿用同一分頁',()=>{
 斷言.ok(html.includes('(data._formalTableId && data._formalSheetName)'));
 斷言.ok(html.includes('appData._formalSheetName = sheetName;'));
 斷言.ok(html.includes('class="預覽正式儲存列"'));
});
測試('大數字補正及新原圖管理檔案有離線快取',()=>{
 斷言.ok(html.includes("input.className = 'input-field G補正大字輸入'"));
 斷言.ok(style.includes('.G補正大字輸入'));
 斷言.ok(sw.includes('殼層-r20'));
 斷言.ok(sw.includes('工件高解析雲端管理.js?版本=241'));
});

測試('GAS 雙層安全沙箱來源：允許官方腳本網域但拒絕偽冒來源',()=>{
 const 來源行=photo.match(/if\(!(.+?)\.test\(origin\)\)return;/);
 斷言.ok(來源行,'找不到照片 postMessage 來源核對');
 const 允許=require('node:vm').runInNewContext(來源行[1]);
 for(const 網址 of [
  'https://script.google.com','https://script.googleusercontent.com',
  'https://n-abc123-script.googleusercontent.com',
  'https://n-abc123.script.googleusercontent.com'
 ])斷言.equal(允許.test(網址),true,網址);
 for(const 網址 of [
  'https://script.google.com.evil.example','https://evil.example',
  'https://n-abc123-script.googleusercontent.com.evil.example','null'
 ])斷言.equal(允許.test(網址),false,網址);
 斷言.ok(photo.includes("data.請求碼!==nonce"),'需使用隨機請求碼防偽');
});
測試('高解析照片跨裝置使用正式刀具表ID且核對容量及MIME',()=>{
 for(const 項目 of [
  "const 正式刀具表ID=String(appData?._formalTableId||id)",
  "刀具表ID:正式刀具表ID",
  "result.刀具表ID!==正式刀具表ID",
  "check.圖片類型!==result.圖片類型",
  "Number(out.容量)!==Number(remote.容量)",
  "out.圖片類型!==remote.圖片類型"
 ])斷言.ok(photo.includes(項目),項目);
});
