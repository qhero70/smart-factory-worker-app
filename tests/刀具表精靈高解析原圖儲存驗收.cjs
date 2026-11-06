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
 斷言.ok(sw.includes('殼層-r18'));
 斷言.ok(sw.includes('工件高解析雲端管理.js?版本=240'));
});
