'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'docs/tool-change-pwa/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'docs/tool-change-pwa/service-worker.js'), 'utf8');
const mainScript = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(x => x[1]).find(s => s.includes('function renderUnifiedSheetOptions_'));
assert.ok(mainScript, '刀具表主程式必須存在');

class Node {
    constructor(tag) {
        this.tag = tag;
        this.value = '';
        this.textContent = '';
        this.label = '';
        this.children = [];
    }
    appendChild(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; this.value = ''; }
    get options() {
        const result = [];
        const visit = node => {
            if (node.tag === 'option') result.push(node);
            else node.children.forEach(visit);
        };
        this.children.forEach(visit);
        return result;
    }
}

const localData = Array.from({length: 7}, (_, i) => ({
    id: 'T' + (i + 1),
    name: '第' + (i + 1) + '張刀具表',
    data: {type: i % 2 ? 2 : 1}
}));
const remoteData = [
    {name: '562_OP', format: 'A4'},
    {name: 'ㄟㄎ_OP77', format: 'A4'}
];

function makePicker() {
    const select = new Node('select');
    const summary = new Node('div');
    const document = {
        createElement(tag) { return new Node(tag); },
        getElementById(id) {
            return id === 'formal-sheet-select' ? select
                : id === 'sheet-source-summary' ? summary : null;
        }
    };
    const script = mainScript.slice(
        mainScript.indexOf('function renderUnifiedSheetOptions_()'),
        mainScript.indexOf('async function refreshFormalSheetList(')
    );
    const render = new Function('document','store','formalSheetCache','formalDbListLoaded',
        script + '\nreturn renderUnifiedSheetOptions_;')(
        document, {tables: localData}, remoteData, true
    );
    return {select, summary, render};
}

test('手機版：操作按鈕位於可捲動視窗內且排在次要選項之前', () => {
    const start = html.indexOf('<div id="table-manager"');
    const end = html.indexOf('<div id="cloud-sync-modal"', start);
    const modal = html.slice(start, end);
    for (const key of ['tm-manager-scroll', 'formal-sheet-select',
        'loadSelectedFormalSheet()', 'saveCurrentToFormalSheets(false)', 'tm-list']) {
        assert.ok(modal.includes(key), '缺少 ' + key);
    }
    assert.ok(modal.indexOf('tm-db-actions') < modal.indexOf('tm-cloud-grid'),
        '載入與存檔按鈕應位於次要功能之前');
    assert.ok(modal.indexOf('tm-manager-scroll') < modal.indexOf('tm-db-actions'));
    assert.ok(modal.indexOf('tm-db-actions') < modal.indexOf('tm-list'));
    assert.match(html, /#table-manager \.tm-manager-scroll\s*\{[\s\S]*?overflow-y:\s*auto/);
    assert.match(html, /#table-manager \.tm-db-actions\s*\{\s*grid-template-columns:\s*1fr/);
    assert.match(html, /height:\s*calc\(100dvh - 8px\)/);
});

test('本機 7 張及正式試算表 2 張同時顯示，來源有分組', () => {
    const {select, summary, render} = makePicker();
    render();
    const local = select.options.filter(x => x.value.startsWith('local:'));
    const remote = select.options.filter(x => x.value.startsWith('formal:'));
    assert.equal(local.length, 7);
    assert.equal(remote.length, 2);
    assert.equal(new Set(select.options.map(x => x.value)).size, select.options.length);
    assert.match(select.children[1].label, /本機暫存（7 張）/);
    assert.match(select.children[2].label, /正式試算表（2 張）/);
    assert.match(summary.textContent, /本機 7 張/);
    assert.match(summary.textContent, /正式試算表 2 張/);
});

test('重新整理下拉選單不會遺失原選擇', () => {
    const {select, render} = makePicker();
    render();
    select.value = 'local:T5';
    render();
    assert.equal(select.value, 'local:T5');
    select.value = 'formal:562_OP';
    render();
    assert.equal(select.value, 'formal:562_OP');
});

test('本機分頁載入直達預覽，不向 GAS 發送資料', async () => {
    const selected = {value: 'local:T7'};
    const calls = [];
    const script = mainScript.slice(
        mainScript.indexOf('async function loadSelectedFormalSheet()'),
        mainScript.indexOf('function openToolDB(')
    );
    const load = new Function('document','store','loadTable','switchTab',
        'formalDbStatus_','setTimeout','adjustPreviewScale','formalSheetCache',
        'formalJsonp_','alert', script + '\nreturn loadSelectedFormalSheet;')(
        {getElementById() { return selected; }},
        {tables: localData},
        id => calls.push(['load', id]),
        view => calls.push(['tab', view]),
        (kind, text) => calls.push(['status', kind, text]),
        () => 0,
        () => {},
        remoteData,
        () => {throw new Error('本機資料不應打到 GAS')},
        msg => {throw new Error('unexpected alert: ' + msg)}
    );
    await load();
    assert.equal(calls[0][0], 'load');
    assert.equal(calls[0][1], 'T7');
    // 真正 loadTable() 內部已直接切換預覽，此處使用 stub 不重複觸發。
    assert.equal(calls[1][0], 'status');
    assert.match(calls[1][2], /未代表雲端同步/);
    assert.match(mainScript, /function loadTable\(id\)[\s\S]*?switchTab\('preview'\)/);
});

test('原本正式試算表讀取與回存核對流程保留', () => {
    assert.match(mainScript, /if \(!selected\.startsWith\('formal:'\)\)/);
    assert.match(mainScript, /formalJsonp_\(\{action:'readSheet', sheet:sheetName/);
    assert.match(mainScript, /JSON\.parse\(r\.JSON資料\)/);
    assert.match(mainScript, /applyFormalAppData_\(snapshot, sheetName\)/);
    assert.match(mainScript, /async function saveCurrentToFormalSheets\(silent = true\)/);
    assert.match(mainScript, /if \(!confirmed\) throw new Error/);
});

test('主程式語法及離線快取版本 v2.2.4', () => {
    assert.doesNotThrow(() => new vm.Script(mainScript));
    assert.match(sw, /刀具表精靈-pwa-v2\.2\.[5-9]\d*/);
    assert.match(html, /LINEBOT_TOOL/);
});
