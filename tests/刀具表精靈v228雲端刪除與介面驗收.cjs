'use strict';
const 測試 = require('node:test');
const 斷言 = require('node:assert/strict');
const 檔案 = require('node:fs');
const 路徑 = require('node:path');
const 虛擬機 = require('node:vm');
const 根 = 路徑.resolve(__dirname,'..');
const 來源 = 檔案.readFileSync(路徑.join(根,'docs/tool-change-pwa/index.html'),'utf8');
const 增強 = 檔案.readFileSync(路徑.join(根,'docs/tool-change-pwa/刀具表精靈_雲端一致性.js'),'utf8');
const 樣式 = 檔案.readFileSync(路徑.join(根,'docs/tool-change-pwa/刀具表精靈_介面優化.css'),'utf8');
const 離線 = 檔案.readFileSync(路徑.join(根,'docs/tool-change-pwa/service-worker.js'),'utf8');
const 後端 = 檔案.readFileSync(路徑.join(根,'smart-factory-command-center/01_GAS後端/刀具表正式資料連線.gs'),'utf8');

const 片段 = 來源.slice(來源.indexOf('function mergeStores(candidates'),來源.indexOf('async function loadStore()'));
const 合併 = new Function('storeScore','MAX_TABLES',片段+'\nreturn mergeStores;')(
  x => (x.tables||[]).length, 10
);
const 甲 = {id:'甲',updatedAt:100,createdAt:99,data:{title:'舊甲'}};
const 乙 = {id:'乙',updatedAt:200,createdAt:199,data:{title:'乙'}};
const 舊 = {currentId:'甲',tables:[甲,乙]};
const 已刪 = {currentId:'乙',tables:[乙],deleted:{甲:300}};
const 全刪 = {currentId:null,tables:[],deleted:{甲:400,乙:401}};

測試('新腳本與原有 HTML 三段內嵌 JS 皆可編譯',()=>{
  斷言.doesNotThrow(()=>new 虛擬機.Script(增強));
  for (const [,_attrs,body] of 來源.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(_attrs)) 斷言.doesNotThrow(()=>new 虛擬機.Script(body));
  }
});
測試('中間新增刀具表、右側增加刀具，原選項仍可由頂部側欄開啟',()=>{
  斷言.match(來源,/id="nav-add-tool-fab"[^>]*onclick="createNewTable\(\)"/);
  斷言.match(來源,/<span>增加刀具<span class="ui-en">Add Tool<\/span>/);
  斷言.match(來源,/class="hamburger-btn"[^>]*data-sidebar-toggle[^>]*onclick="toggleSidebar\(\)"/);
});
測試('正式試算表選單、確認視窗、儲存與 Excel 功能保留',()=>{
  for (const s of ['formal-sheet-select','刪除選定正式分頁_()','loadSelectedFormalSheet()',
  'saveCurrentToFormalSheets(false)','exportExcelFile()','exportMasterExcelFile()',
  'openSoundSettings()','openCloudSync()','openVoiceSettings()','正式操作確認框'])
  斷言.ok(來源.includes(s),s);
  斷言.match(增強,/window\.renderUnifiedSheetOptions_ = function/);
  斷言.match(增強,/function 確認操作_/);
});
測試('正式刪除不可繞過授權、不可假報刪除成功',()=>{
  斷言.match(後端,/動作 === '刀具表_刪除'/);
  斷言.match(增強,/刪除讀回不符/);
  斷言.doesNotMatch(增強,/api'\s*,\s*'刀具表_刪除'/);
});
測試('舊本機資料、IDB 與雲端相同 ID 的備份不會讓刪除的表格復活',()=>{
  for(const 結果 of [合併([舊,已刪]),合併([已刪,舊])]){
    斷言.equal(結果.tables.some(x=>x.id==='甲'),false);
    斷言.equal(結果.tables.some(x=>x.id==='乙'),true);
    斷言.equal(結果.deleted.甲,300);
  }
});
測試('所有表格都刪除時可保留刪除墓碑，阻止舊快照復活',()=>{
  const r=合併([舊,全刪], '甲');
  斷言.equal(r.tables.length,0);
  斷言.equal(r.currentId,null);
  斷言.equal(Object.keys(r.deleted).length,2);
  斷言.match(來源,/local\.tables\.length === 0 && !Object\.keys\(local\.deleted \|\| \{\}\)\.length/);
});
測試('刪除墓碑不受不同裝置時鐘偏差影響，舊 ID 一律不得復活',()=>{
  const 新版={currentId:'甲',tables:[{...甲,updatedAt:500}]};
  斷言.equal(合併([新版,已刪]).tables.some(x=>x.id==='甲'),false);
});
測試('正式刀具表編輯後自動儲存並核對，保留同一分頁名稱',()=>{
  斷言.match(增強,/window\.saveCurrentToFormalSheets = async function/);
  斷言.match(增強,/function 安排正式自動同步_/);
  斷言.match(增強,/const 已連結分頁/);
  斷言.match(來源,/JSON\.stringify\(data\) && 明細\.length === tools\.length/);
});
測試('對話／分頁列表使用雙欄整齊按鈕且小尺寸螢幕仍可操作',()=>{
  斷言.match(樣式,/\.tm-db-actions,#table-manager \.tm-cloud-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  斷言.match(樣式,/min-height:54px/);
  斷言.match(樣式,/@media\(max-width:450px\)/);
});
測試('PWA 最新 CSS／JS 預載正確；正式 GAS v2.2.7 未改動',()=>{
  斷言.match(離線,/刀具表精靈-pwa-v2\.2\.9/);
  斷言.match(離線,/刀具表精靈_介面優化\.css\?版本=232/);
  斷言.match(離線,/刀具表精靈_雲端一致性\.js\?版本=229/);
  斷言.match(後端,/刀具表連線版本_ = '2\.2\.9'/);
});
