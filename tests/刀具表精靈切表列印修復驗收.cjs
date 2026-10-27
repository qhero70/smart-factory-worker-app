'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'docs/tool-change-pwa/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'docs/tool-change-pwa/service-worker.js'), 'utf8');
const main = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(m=>m[1]).find(s=>s.includes('function mergeStores(candidates'));
assert.ok(main,'主程式缺失');

function range(start,end) {
    const a=main.indexOf(start),b=main.indexOf(end,a+start.length);
    assert.ok(a>=0 && b>a,'找不到來源段落 '+start);
    return main.slice(a,b);
}

const mergeSource=range('function mergeStores(candidates','async function loadStore()');
const merge=new Function('MAX_TABLES','storeScore',
    mergeSource+'\nreturn mergeStores;')(
    10,c=>Math.max(0,...(c.tables||[]).map(t=>Number(t.updatedAt||0)))+(c.tables||[]).length
);

const old={id:'old',updatedAt:9000,data:{title:'舊表',tools:[{t_no:'T01'}]}};
const cover={id:'cover',updatedAt:1000,data:{title:'COVER B OP110',tools:[{t_no:'T02'}]}};

test('雲端快照原本 currentId=舊表，合併後仍維持使用者選中的 COVER B OP110',()=>{
    const remote={currentId:'old',tables:[old,cover]};
    const local={currentId:'cover',tables:[cover,old]};
    const merged=merge([remote,local],local.currentId);
    assert.equal(merged.currentId,'cover');
    assert.equal(merged.tables.find(t=>t.id==='cover').data.title,'COVER B OP110');
    assert.equal(merged.tables.length,2);
});

test('明確選擇不存在的表格才合理回退，原表格資料不被刪除',()=>{
    const merged=merge([{currentId:'old',tables:[old,cover]}],'not-existing');
    assert.equal(merged.currentId,'old');
    assert.equal(merged.tables.length,2);
    assert.notEqual(merged.tables.find(t=>t.id==='cover').data,null);
});

test('雲端上傳及讀回不再使用遠端 currentId 覆蓋當前選擇',()=>{
    assert.match(main,/planned = mergeStores\(\[remote, local\], local\.currentId\)/);
    assert.match(main,/mergeStores\(\[currentLocal, remote\], currentLocal\.currentId\)/);
    assert.match(main,/const initialSelectionRevision = tableSelectionRevision/);
    assert.match(main,/if \(initialSelectionRevision !== tableSelectionRevision\)/);
    assert.match(main,/const finalStore = mergeStores\(\[planned, now\], now\.currentId\)/);
    assert.match(main,/function loadTable\(id\)[\s\S]*?tableSelectionRevision\+\+/);
});

test('預覽頁有可點擊的切換按鈕及最高層選表視窗',()=>{
    assert.match(html,/class="btn-switch-table"[^>]*onclick="openTableManagerFromPreview_\(\)"/);
    assert.match(html,/class="preview-change-sheet" onclick="openTableManagerFromPreview_\(\)"/);
    assert.match(html,/#table-manager\.show \{ z-index:10000; \}/);
    assert.match(main,/function openTableManagerFromPreview_\(\)[\s\S]*?closeDeliveryCenter\(\)/);
    assert.match(main,/function openTableManagerFromPreview_\(\)[\s\S]*?openTableManager\(\)/);
});

test('A4/A3 列印保留 5mm 邊距且容納完整頁面，隱藏等待浮框',()=>{
    assert.match(html,/@page \{ size: A4 portrait; margin: 5mm; \}/);
    assert.match(html,/@page \{ size: A3 landscape; margin: 5mm; \}/);
    assert.match(html,/width:200mm !important; height:285mm !important/);
    assert.match(html,/width:405mm !important; height:285mm !important/);
    assert.match(html,/#tool-action-toast, #line-browser-banner, #delivery-center, #preview-active-sheet/);
    assert.match(html,/\.a4-preview \.tool-photo-img \{\s*max-height:54px !important/);
    assert.match(html,/overflow:visible !important/);
});

test('直接列印在圖片準備好後執行，先關掉等待浮框',async()=>{
    const code=range('async function 直接列印或存PDF_()', 'function 清理單格_(');
    let printed=false,closed=false,hidden=0,updated=false,waited=false;
    const window={print(){printed=true;assert.equal(hidden,2);assert.equal(waited,true);},
        addEventListener(type,fn){assert.equal(type,'beforeprint');}};
    const elt={classList:{remove(){hidden++}},setAttribute(){}};
    const document={getElementById(id){return id==='tool-action-toast'?elt:
        id==='a4-document'?{id} : null;}};
    const factory = new Function('window','document','closeDeliveryCenter','saveCurrent','appData',
        'updateA4Preview','updateA3Preview','等待預覽影像載入_',code+'\nreturn 直接列印或存PDF_;');
    const print=factory(window,document,()=>{closed=true},()=>{}, {type:1},
        ()=>{updated=true},()=>{throw Error('A3 called for A4')},
        async()=>{waited=true});
    await print();
    assert.equal(printed,true);
    assert.equal(closed,true);
    assert.equal(updated,true);
});

test('完整主程式可編譯且快取更新為 2.2.6',()=>{
    assert.doesNotThrow(()=>new vm.Script(main));
    assert.match(sw,/刀具表精靈-pwa-v2\.2\.6/);
    assert.match(html,/LINEBOT_TOOL/);
});
