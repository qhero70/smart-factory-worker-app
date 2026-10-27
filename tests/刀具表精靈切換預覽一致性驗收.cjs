'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'docs/tool-change-pwa/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'docs/tool-change-pwa/service-worker.js'), 'utf8');
const main = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).find(s => s.includes('function loadTable(id)'));
assert.ok(main, '找不到刀具表主要程式');

function section(start, end) {
    const a = main.indexOf(start), b = main.indexOf(end, a + start.length);
    assert.ok(a >= 0 && b > a, '來源範圍缺失 ' + start);
    return main.slice(a, b);
}

const helpers = section('function hydrateLegacyA4PreviewData_()', 'function switchTab(tabName)');
const loader = section('function loadTable(id)', 'function deleteTable(id)');

function harness(tables, firstId) {
    const indicator = {dataset:{},textContent:''};
    const nodes = new Map([['preview-active-sheet-name', indicator]]);
    const events = [];
    const dom = {
        getElementById(id) {
            if (!nodes.has(id)) nodes.set(id,{
                classList:{toggle(){}},textContent:'',dataset:{},style:{}
            });
            return nodes.get(id);
        }
    };
    const env = {
        store: {currentId:firstId,tables:tables.map(t=>structuredClone(t))},
        appData: structuredClone(tables.find(t=>t.id===firstId).data),
        document:dom,
        isLineInAppBrowser:()=>false,
        makeEmptyAppData:type=>({type,title:'',partName:'',processCode:'',tools:[],tools2:[]}),
        saveCurrent:()=>events.push('save-old'),
        persist:()=>events.push('persist'),
        updateA4Preview:()=>events.push('refresh-A4'),
        updateA3Preview:()=>events.push('refresh-A3'),
        closeTableManager:()=>events.push('close-modal'),
        restoreChatView:()=>events.push('restore-chat'),
        playSound:()=>{},
        updateHomeRecentCard:()=>{},
        setTimeout:fn=>fn(),
        adjustPreviewScale:()=>{}
    };
    const factory = new Function('env',`
        let appData = env.appData, store = env.store;
        const {document, isLineInAppBrowser, makeEmptyAppData,
            saveCurrent,persist,updateA4Preview,updateA3Preview,
            closeTableManager,restoreChatView,playSound,
            updateHomeRecentCard,setTimeout,adjustPreviewScale} = env;
        ${helpers}
        function switchTab(tabName) {
            env.events.push('tab:' + tabName);
            if(tabName==='preview') updatePreviewIdentity_();
        }
        ${loader}
        return {loadTable,read:()=>({appData,store})};
    `);
    env.events = events;
    const instance = factory(env);
    return {...instance,events,indicator};
}

test('相同瀏覽器內由舊表切換到 COVER B OP110，資料/刀具/預覽識別都變更',()=>{
    const old={id:'A',data:{type:1,title:'舊表 OP77',partName:'舊表',processCode:'OP77',tools:[{t_no:'T01'}]}};
    const cover={id:'B',data:{type:1,title:'COVER B OP110',partName:'COVER B',processCode:'OP110',tools:[{t_no:'T01'},{t_no:'T02'},{t_no:'T03'},{t_no:'T04'}]}};
    const app=harness([old,cover],'A');
    app.loadTable('B');
    assert.equal(app.read().store.currentId,'B');
    assert.equal(app.read().appData.title,'COVER B OP110');
    assert.equal(app.read().appData.tools.length,4);
    assert.match(app.indicator.textContent,/COVER B OP110.*4 把刀具/);
    assert.equal(app.indicator.dataset.tableId,'B');
    assert.ok(app.events.includes('tab:preview'));
    assert.ok(app.events.indexOf('refresh-A4') < app.events.indexOf('tab:preview'));
    assert.ok(!app.events.includes('tab:chat'));
    app.loadTable('A');
    assert.equal(app.read().appData.title,'舊表 OP77');
    assert.equal(app.indicator.dataset.tableId,'A');
    assert.match(app.indicator.textContent,/舊表 OP77.*1 把刀具/);
});

test('舊快照只有 A4 title 時，回填品名與 OP 工序而不修改其他表格',()=>{
    const f=harness([{id:'legacy',data:{type:1,title:'COVER B OP110',partName:'',processCode:'',tools:[{t_no:'T08'}]}},{id:'other',data:{type:1,title:'OTHER OP01',partName:'OTHER',tools:[]}}],'other');
    f.loadTable('legacy');
    assert.equal(f.read().appData.partName,'COVER B');
    assert.equal(f.read().appData.processCode,'OP110');
    assert.equal(f.read().appData.title,'COVER B OP110');
    assert.equal(f.read().store.tables.find(t=>t.id==='other').data.title,'OTHER OP01');
});

test('舊版以字串儲存的 A3 type=2 正確顯示 A3 及其刀具數',()=>{
    const f=harness([{id:'A3',data:{type:'2',headerTitle:'A3 測試',tools:[],tools2:[{t_no:'01'},{t_no:'02'}]}}],'A3');
    f.loadTable('A3');
    assert.equal(f.read().appData.type,'2');
    assert.match(f.indicator.textContent,/A3 測試 · A3 · 2 把刀具/);
    assert.equal(f.indicator.dataset.tableId,'A3');
});

test('載入訊息使用 appData.type 而非 DOM id=app 的隱式 window.app',()=>{
    const fn=section('function restoreChatView()', 'function addMoreToolsFromNav()');
    assert.match(fn,/Number\(appData\.type\) === 2/);
    assert.doesNotMatch(fn,/\bapp\.type\b/);
});

test('正式分頁與本機載入共用預覽標記，不改既有 GAS 寫入 API',()=>{
    assert.match(main,/function applyFormalAppData_\(/);
    assert.match(section('function applyFormalAppData_(', 'async function loadSelectedFormalSheet()'),/updatePreviewIdentity_\(\)/);
    assert.match(main,/async function saveCurrentToFormalSheets\(/);
    assert.match(main,/if \(!confirmed\) throw new Error/);
    assert.match(page,/id="preview-active-sheet"/);
    assert.match(page,/onclick="openTableManager\(\)"/);
    assert.match(page,/@media print \{ #preview-active-sheet \{ display:none !important; \} \}/);
});

test('主程式可解析且 PWA 離線快取為 v2.2.5',()=>{
    assert.doesNotThrow(()=>new vm.Script(main));
    assert.match(sw,/刀具表精靈-pwa-v2\.2\.[6-9]\d*/);
    assert.match(page,/LINEBOT_TOOL/);
});
