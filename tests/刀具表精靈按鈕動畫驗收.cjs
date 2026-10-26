'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'docs/tool-change-pwa/index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'docs/tool-change-pwa/service-worker.js'), 'utf8');
const jsMatch = html.match(/<script id="tool-button-feedback-script">([\s\S]*?)<\/script>/);

function fixture(options = {}) {
    class MockElement {}
    const classNames = new Set();
    const toastNames = new Set();
    const element = new MockElement();
    element.disabled = !!options.disabled;
    element.innerText = options.label || '匯出 Excel';
    element.classList = {
        add(name) { classNames.add(name); },
        remove(name) { classNames.delete(name); }
    };
    element.getAttribute = (key) =>
        key === 'aria-disabled' && options.ariaDisabled ? 'true' :
        key === 'aria-label' ? element.innerText : null;
    element.matches = (selector) => selector.startsWith('[disabled]') ?
        !!(options.disabled || options.ariaDisabled) :
        selector.startsWith('.os-backdrop') ? !!options.backdrop :
        selector === 'button, [role="button"]' ? !options.backdrop : false;
    element.closest = (selector) =>
        selector.startsWith('button,') ? element : null;
    element.offsetWidth = 40;
    const toast = {
        classList: {
            add(name) { toastNames.add(name); },
            remove(name) { toastNames.delete(name); }
        },
        attrs: {},
        setAttribute(key, value) { this.attrs[key] = value; }
    };
    const message = {textContent: ''};
    const handlers = [];
    const timers = new Map();
    let nextId = 0;
    vm.runInNewContext(jsMatch[1], {
        Element: MockElement,
        WeakMap,
        document: {
            getElementById(id) {
                return id === 'tool-action-toast' ? toast :
                    id === 'tool-action-toast-text' ? message : null;
            },
            addEventListener(type, listener, capture) {
                handlers.push({type, listener, capture});
            }
        },
        setTimeout(fn, ms) {
            const id = ++nextId;
            timers.set(id, {fn, ms});
            return id;
        },
        clearTimeout(id) { timers.delete(id); }
    }, {timeout: 1000});
    return {element, classNames, toastNames, toast, message, handlers, timers};
}

test('單一 HTML：全部按鈕及動態節點由全域點擊代理處理', () => {
    assert.ok((html.match(/<button\b/gi) || []).length >= 130);
    assert.ok(jsMatch, '全域按鈕回饋腳本必須存在');
    assert.equal((html.match(/id="tool-action-toast"/g) || []).length, 1);
    assert.match(html, /const selector = 'button, a\[href\].*\[onclick\]';/);
    assert.match(html, /LINEBOT_TOOL/);
    assert.match(html, /<link rel="manifest"/);
});

test('按鈕回饋 JS 可通過語法編譯', () => {
    assert.doesNotThrow(() => new vm.Script(jsMatch[1]));
});

test('點擊按鈕浮起、顯示等待狀態，原始 click 不被攔截', () => {
    const f = fixture();
    assert.equal(f.handlers.length, 1);
    assert.equal(f.handlers[0].type, 'click');
    assert.equal(f.handlers[0].capture, true);
    const event = {target: f.element};
    f.handlers[0].listener(event);
    assert.ok(f.classNames.has('tool-action-rise'));
    assert.ok(f.toastNames.has('tool-action-toast-visible'));
    assert.equal(f.toast.attrs['aria-hidden'], 'false');
    assert.match(f.message.textContent, /匯出 Excel.*請稍候/);
    assert.deepEqual([...f.timers.values()].map(x => x.ms).sort(), [480, 900]);
    assert.equal(event.defaultPrevented, undefined);
    for (const task of [...f.timers.values()]) task.fn();
    assert.ok(!f.toastNames.has('tool-action-toast-visible'));
    assert.ok(!f.classNames.has('tool-action-rise'));
});

test('未來新增的動態按鈕也自動生效；連點會重設倒數', () => {
    const f = fixture({label: '雲端同步'});
    f.handlers[0].listener({target: f.element});
    f.handlers[0].listener({target: f.element});
    assert.equal(f.timers.size, 2, '僅保留最後一組動畫與提示計時器');
    assert.match(f.message.textContent, /雲端同步/);
});

test('停用及遮罩元素不顯示動畫', () => {
    for (const option of [{disabled: true}, {ariaDisabled: true}, {backdrop: true}]) {
        const f = fixture(option);
        f.handlers[0].listener({target: f.element});
        assert.equal(f.classNames.size, 0);
        assert.equal(f.toastNames.size, 0);
        assert.equal(f.timers.size, 0);
    }
});

test('等待泡泡不阻擋操作，並提供減少動態效果與最新離線快取', () => {
    assert.match(html, /#tool-action-toast\s*\{/);
    assert.match(html, /pointer-events:\s*none/);
    assert.match(html, /prefers-reduced-motion:\s*reduce/);
    assert.match(html, /@keyframes tool-action-spin/);
    assert.match(sw, /刀具表精靈-pwa-v2\.2\.[4-9]\d*/);
    assert.match(html, /register\('\.\/service-worker\.js'\)/);
});
