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
    const 章節 = Array.from({ length: 6 }, () => {
        const 父層 = 建立元素();
        父層.classList.add('收合');
        return { ...建立元素(), parentElement: 父層 };
    });
    const 元素 = { 'options-sidebar': 面板, 'options-backdrop': 遮罩 };
    const 環境 = {
        document: {
            getElementById: 名稱 => 元素[名稱] || null,
            querySelectorAll: 選擇器 => 選擇器 === '[data-sidebar-toggle]' ? 三線按鈕 : (選擇器.includes('.os-group-title') ? 章節 : [])
        },
        window: { innerWidth: 390 }
    };
    const 開頭 = 網頁.indexOf('function 全部收合側邊欄章節(');
    const 結尾 = 網頁.indexOf('const OFFICIAL_APP_URL', 開頭);
    斷言.ok(開頭 > 0 && 結尾 > 開頭, '應存在獨立控制函數');
    虛擬機.createContext(環境);
    虛擬機.runInContext(網頁.slice(開頭, 結尾), 環境);
    return { 環境, 面板, 遮罩, 三線按鈕, 章節 };
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
    斷言.ok(網頁.includes('刀具表精靈_介面優化.css?版本=234'));
    斷言.ok(離線服務.includes('殼層-r10'));
    斷言.ok(離線服務.includes('刀具表精靈_介面優化.css?版本=234'));
    for (const 配對 of 網頁.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
        if (配對[1].trim()) new 虛擬機.Script(配對[1]);
    }
});

測試('六個側欄章節首次全部收合，展開重新進入後復原全收合', () => {
    const 區塊 = 網頁.slice(網頁.indexOf('<aside id="options-sidebar"'), 網頁.indexOf('</aside>'));
    斷言.equal((區塊.match(/class="os-group 收合"/g) || []).length, 6);
    斷言.ok(網頁.includes("標題.setAttribute('aria-expanded','false')"));
    斷言.ok(網頁.includes("標題.addEventListener('click',切換)"));
    斷言.ok(網頁.includes("標題.addEventListener('keydown',事件 =>"));
    const { 環境, 章節 } = 建立驗證環境();
    虛擬機.runInContext('openSidebar()', 環境);
    斷言.ok(章節.every(標題 => 標題.parentElement.classList.contains('收合')));
    斷言.ok(章節.every(標題 => 標題.getAttribute('aria-expanded') === 'false'));
    章節[2].parentElement.classList.remove('收合');
    章節[2].setAttribute('aria-expanded','true');
    虛擬機.runInContext('closeSidebar(); openSidebar()', 環境);
    斷言.ok(章節.every(標題 => 標題.parentElement.classList.contains('收合')));
    斷言.ok(章節.every(標題 => 標題.getAttribute('aria-expanded') === 'false'));
});
測試('側邊欄大標題為黑色粗體字，頂部為藍色漸層且可見', () => {
    斷言.match(樣式, /#options-sidebar \.os-head \{[\s\S]*?background: linear-gradient\(112deg, #dbeafe/);
    斷言.match(樣式, /#options-sidebar \.os-head-title \{[\s\S]*?color: #0b1220;/);
    斷言.match(樣式, /#options-sidebar \.os-group-title \{[\s\S]*?color: #101114 !important;/);
    斷言.match(樣式, /#options-sidebar \.os-group-title \{[\s\S]*?font-size: 16px !important;/);
    斷言.match(樣式, /#options-sidebar \.os-group-title \{[\s\S]*?font-weight: 900 !important;/);
    斷言.ok(樣式.includes('#options-sidebar .os-group.收合 > :not(.os-group-title) { display: none !important; }'));
});

測試('側邊欄頂部為我的刀具表，設定獨立收合且包含四項指定功能', () => {
 const start=網頁.indexOf('<aside id="options-sidebar"'),end=網頁.indexOf('</aside>',start);
 const sidebar=網頁.slice(start,end);
 斷言.ok(sidebar.indexOf('id="os-my-sheets-top"') < sidebar.indexOf('class="os-scroll"'));
 斷言.equal((sidebar.match(/id="os-table-count"/g)||[]).length,1);
 const setting=sidebar.slice(sidebar.indexOf('id="os-settings-group"'));
 for (const label of ['音效設定','語音引導設定','匯出這張 Excel','匯出主檔 Excel']) {
   斷言.ok(setting.includes(label),label);
   斷言.equal((sidebar.match(new RegExp(label,'g'))||[]).length,1,label);
 }
 斷言.equal((sidebar.match(/class="os-group 收合"/g)||[]).length,6);
 斷言.ok(樣式.includes('width:44px!important;height:44px!important;'));
});
測試('我的刀具表視窗：按鈕集中在捲動區上方，四個設定鈕不再重複', () => {
 const start=網頁.indexOf('<div id="table-manager"'),end=網頁.indexOf('<div id="cloud-sync-modal"',start);
 const modal=網頁.slice(start,end),top=modal.indexOf('id="tm-top-toolbar"'),scroll=modal.indexOf('id="tm-manager-scroll"');
 斷言.ok(top>=0 && top < scroll);
 const head=modal.slice(top,scroll);
 for(const key of ['formal-sheet-select','createNewTable()','refreshFormalSheetList(false)',
 'loadSelectedFormalSheet()','saveCurrentToFormalSheets(false)','刪除選定正式分頁_()','addMoreToolsFromNav()','openCloudSync()']) 斷言.ok(head.includes(key),key);
 for(const key of ['openSoundSettings()','openVoiceSettings()','exportExcelFile()','exportMasterExcelFile()']) 斷言.ok(!modal.includes(key),key);
 斷言.ok(modal.includes('id="刀具明細清單"'));
 斷言.ok(樣式.includes('#table-manager .tm-top-toolbar'));
});

測試('3D 場景與我的資料已合併到設定內，首頁不再有獨立章節', () => {
    const 開始 = 網頁.indexOf('<aside id="options-sidebar"');
    const 結束 = 網頁.indexOf('</aside>',開始);
    const 側欄 = 網頁.slice(開始,結束);
    const 主標題 = [...側欄.matchAll(/class="os-group-title"[^>]*>([\s\S]*?)<\/div>/g)]
        .map(x=>x[1].replace(/<[^>]+>/g,'').trim());
    斷言.equal(主標題.length,6);
    斷言.ok(主標題.some(x=>x.includes('06 · 設定')));
    斷言.ok(!主標題.some(x=>x.includes('3D 場景')||x.includes('我的資料')));
    const 設定 = 側欄.slice(側欄.indexOf('id="os-settings-group"'));
    斷言.ok(設定.indexOf('id="os-3d-settings"')>0);
    斷言.ok(設定.indexOf('id="os-data-settings"')>0);
    for(const 關鍵 of ['3D 場景 / WebGL','我的資料 / My Data','更換精靈頭像',
      'Change Avatar','openThreeControls()','resetThreeControls()',
      'openCloudSync()','openAvatarPicker()']) {
        斷言.ok(設定.includes(關鍵),關鍵);
    }
    斷言.equal((側欄.match(/id="os-sync-dot"/g)||[]).length,1);
    斷言.equal((側欄.match(/onclick="openAvatarPicker\(\); closeSidebarOnMobile\(\);"/g)||[]).length,1);
    斷言.ok(樣式.includes('.os-subgroup.收合 > .os-subgroup-items { display: none !important; }'));
});
測試('設定中 3D 與我的資料可用觸控與鍵盤獨立收合', () => {
    斷言.ok(網頁.includes("document.querySelectorAll('.os-group-title, .os-subgroup-title')"));
    斷言.ok(網頁.includes("'#options-sidebar .os-group-title, #options-sidebar .os-subgroup-title'"));
    斷言.ok(網頁.includes("標題.addEventListener('keydown',事件 =>"));
    斷言.ok(網頁.includes("標題.setAttribute('aria-expanded','false')"));
    斷言.ok(離線服務.includes('殼層-r10'));
});
