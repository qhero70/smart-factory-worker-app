'use strict';
/* 專驗：iPhone / LINE 開啟雲端同步，不得被預覽層級 10000 的刀具表視窗遮擋。 */
const 測試 = require('node:test');
const 斷言 = require('node:assert/strict');
const 檔案 = require('node:fs');
const 路徑 = require('node:path');
const 根路徑 = 路徑.resolve(__dirname, '../docs/tool-change-pwa');
const 網頁 = 檔案.readFileSync(路徑.join(根路徑, 'index.html'), 'utf8');
const 樣式 = 檔案.readFileSync(路徑.join(根路徑, '刀具表精靈_介面優化.css'), 'utf8');
const 離線 = 檔案.readFileSync(路徑.join(根路徑, 'service-worker.js'), 'utf8');

function 假元素(初始展開 = false) {
    const 類別 = new Set(初始展開 ? ['show'] : []);
    const 屬性 = {};
    return {
        inert: false,
        style: {},
        classList: {
            add: x => 類別.add(x),
            remove: x => 類別.delete(x),
            contains: x => 類別.has(x)
        },
        setAttribute: (k,v) => {屬性[k] = String(v);},
        getAttribute: k => 屬性[k]
    };
}
function 測試環境(刀具表原本展開) {
    const 刀具表 = 假元素(刀具表原本展開);
    const 同步 = 假元素(false);
    // 模擬由預覽入口開啟的刀具表 z-index 10000。
    刀具表.style.zIndex = '10000';
    let 更新次數 = 0;
    const 開頭 = 網頁.indexOf('function openCloudSync() {');
    const 結尾 = 網頁.indexOf('async function copyCloudSyncCode()', 開頭);
    斷言.ok(開頭 > 0 && 結尾 > 開頭, '須保留同步視窗原有開關入口');
    const 入口 = new Function('document','updateCloudSyncUI',
        網頁.slice(開頭,結尾) + '\nreturn {openCloudSync,closeCloudSync};'
    )({
        getElementById: 名稱 => 名稱 === 'table-manager' ? 刀具表
            : 名稱 === 'cloud-sync-modal' ? 同步 : null
    }, () => { 更新次數++; });
    return { 刀具表, 同步, 入口, 取得更新次數: () => 更新次數 };
}
測試('雲端同步 z-index 高於 10000 的刀具表，不因同層彈窗而被遮擋', () => {
    const 區塊 = /#cloud-sync-modal\.show\s*\{([^}]*)\}/.exec(樣式);
    斷言.ok(區塊, '應有獨立的顯示層級');
    const 層級 = /z-index:\s*(\d+)\s*!important/.exec(區塊[1]);
    斷言.ok(層級, '應確保不被既有樣式覆寫');
    斷言.ok(Number(層級[1]) > 10000, '同步視窗應高於報表預覽層級');
    斷言.match(網頁, /modal\.style\.zIndex = '10000'/);
    斷言.ok(網頁.includes('id="tm-sync-entry"'));
});
測試('從我的刀具表點同步後可操作；關閉後返回同一張刀具表', () => {
    const { 刀具表, 同步, 入口, 取得更新次數 } = 測試環境(true);
    入口.openCloudSync();
    斷言.equal(同步.classList.contains('show'), true);
    斷言.equal(同步.getAttribute('aria-hidden'), 'false');
    斷言.equal(刀具表.classList.contains('show'), true, '背景刀具表維持原狀');
    斷言.equal(刀具表.inert, true, '同步期間背景不可操作');
    斷言.equal(刀具表.getAttribute('aria-hidden'), 'true');
    斷言.equal(取得更新次數(), 1, '每次開啟仍更新同步狀態');
    入口.closeCloudSync();
    斷言.equal(同步.classList.contains('show'), false);
    斷言.equal(同步.getAttribute('aria-hidden'), 'true');
    斷言.equal(刀具表.classList.contains('show'), true);
    斷言.equal(刀具表.inert, false);
    斷言.equal(刀具表.getAttribute('aria-hidden'), 'false');
    斷言.equal(刀具表.style.zIndex, '10000', '不破壞原本預覽切表層級');
});
測試('單獨開啟同步時不會強制展開刀具表，重複開關仍正常', () => {
    const { 刀具表, 同步, 入口, 取得更新次數 } = 測試環境(false);
    for(let i=0;i<3;i++){
        入口.openCloudSync();
        斷言.equal(同步.classList.contains('show'), true);
        斷言.equal(刀具表.classList.contains('show'), false);
        斷言.equal(刀具表.inert, false);
        入口.closeCloudSync();
        斷言.equal(同步.classList.contains('show'), false);
    }
    斷言.equal(取得更新次數(), 3);
});
測試('同步視窗具備 iPhone 安全區及獨立捲動；原有雲端函數沒有改動', () => {
    斷言.ok(網頁.includes('aria-modal="true" aria-label="跨裝置雲端同步"'));
    斷言.ok(樣式.includes('max-height: calc(100dvh - env(safe-area-inset-top, 0px)'));
    斷言.ok(樣式.includes('#cloud-sync-modal .sync-panel-body'));
    斷言.ok(網頁.includes('async function createCloudSyncCode()'));
    斷言.ok(網頁.includes('async function syncPullStore('));
    斷言.ok(離線.includes('殼層-r12'));
    斷言.ok(離線.includes('介面優化.css?版本=236'));
});
