const 測試 = require('node:test');
const 斷言 = require('node:assert/strict');
const 檔案 = require('node:fs');
const 路徑 = require('node:path');
const 虛擬機 = require('node:vm');

const 根目錄 = 路徑.resolve(__dirname, '../docs/tool-change-pwa');
const 網頁 = 檔案.readFileSync(路徑.join(根目錄, 'index.html'), 'utf8');
const 樣式 = 檔案.readFileSync(路徑.join(根目錄, '刀具表精靈_介面優化.css'), 'utf8');
const 離線服務 = 檔案.readFileSync(路徑.join(根目錄, 'service-worker.js'), 'utf8');

function 建立類別清單(初始 = []) {
    const 項目 = new Set(初始);
    return {
        add: 值 => 項目.add(值),
        remove: 值 => 項目.delete(值),
        contains: 值 => 項目.has(值),
        toggle(值, 狀態) {
            if (狀態 === undefined ? !項目.has(值) : 狀態) 項目.add(值);
            else 項目.delete(值);
            return 項目.has(值);
        }
    };
}
function 建立元素() {
    const 屬性 = {};
    return {
        classList: 建立類別清單(),
        inert: true,
        setAttribute(名稱, 值) { 屬性[名稱] = String(值); },
        getAttribute(名稱) { return 屬性[名稱]; }
    };
}
function 建立驗證環境() {
    const 面板 = 建立元素();
    const 遮罩 = 建立元素();
    const 三線按鈕 = Array.from({ length: 3 }, 建立元素);
    const 元素 = { 'options-sidebar': 面板, 'options-backdrop': 遮罩 };
    const 環境 = {
        document: {
            getElementById: 名稱 => 元素[名稱] || null,
            querySelectorAll: 選擇器 => 選擇器 === '[data-sidebar-toggle]' ? 三線按鈕 : []
        },
        window: { innerWidth: 390 }
    };
    const 開頭 = 網頁.indexOf('function 設定側邊欄狀態(');
    const 結尾 = 網頁.indexOf('const OFFICIAL_APP_URL', 開頭);
    斷言.ok(開頭 > 0 && 結尾 > 開頭, '應存在獨立控制函數');
    虛擬機.createContext(環境);
    虛擬機.runInContext(網頁.slice(開頭, 結尾), 環境);
    return { 環境, 面板, 遮罩, 三線按鈕 };
}

測試('三處選項按鈕均能切換展開與收合，且首頁/工作區共用', () => {
    斷言.equal((網頁.match(/data-sidebar-toggle/g) || []).length, 4); // 3 個按鈕＋狀態控制查詢
    斷言.equal((網頁.match(/onclick="toggleSidebar\(\)"/g) || []).length, 3);
    斷言.ok(網頁.includes('<aside id="options-sidebar" aria-label="刀具表精靈選項面板" aria-hidden="true" inert>'));
    const { 環境, 面板, 遮罩, 三線按鈕 } = 建立驗證環境();
    虛擬機.runInContext('toggleSidebar()', 環境);
    斷言.equal(面板.classList.contains('open'), true);
    斷言.equal(面板.inert, false);
    斷言.equal(遮罩.classList.contains('show'), true);
    斷言.ok(三線按鈕.every(按鈕 => 按鈕.getAttribute('aria-expanded') === 'true'));
    虛擬機.runInContext('toggleSidebar()', 環境);
    斷言.equal(面板.classList.contains('open'), false);
    斷言.equal(面板.inert, true);
    斷言.equal(遮罩.classList.contains('show'), false);
    斷言.ok(三線按鈕.every(按鈕 => 按鈕.getAttribute('aria-expanded') === 'false'));
});

測試('手機與電腦：X、遮罩和選擇功能後均能收合', () => {
    const { 環境, 面板, 遮罩 } = 建立驗證環境();
    for (const 寬度 of [390, 430, 768, 1280, 1920]) {
        環境.window.innerWidth = 寬度;
        虛擬機.runInContext('openSidebar()', 環境);
        斷言.equal(面板.classList.contains('open'), true);
        虛擬機.runInContext('closeSidebarOnMobile()', 環境);
        斷言.equal(面板.classList.contains('open'), false);
        斷言.equal(遮罩.classList.contains('show'), false);
        虛擬機.runInContext('openSidebar(); closeSidebar()', 環境);
        斷言.equal(面板.classList.contains('open'), false);
    }
    斷言.ok(網頁.includes('onclick="closeSidebar()" aria-label="關閉側邊欄"'));
    斷言.ok(網頁.includes('aria-hidden="true" onclick="closeSidebar()"'));
    斷言.ok(網頁.includes("事件.key === 'Escape'"));
});

測試('新版 CSS、離線快取及所有內嵌腳本語法正確', () => {
    斷言.ok(樣式.includes('#options-sidebar:not(.open)'));
    斷言.ok(樣式.includes('#options-sidebar .os-close { min-width: 48px;'));
    斷言.ok(網頁.includes('刀具表精靈_介面優化.css?版本=230'));
    斷言.ok(離線服務.includes('殼層-r6'));
    斷言.ok(離線服務.includes('刀具表精靈_介面優化.css?版本=230'));
    for (const 配對 of 網頁.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
        if (配對[1].trim()) new 虛擬機.Script(配對[1]);
    }
});
