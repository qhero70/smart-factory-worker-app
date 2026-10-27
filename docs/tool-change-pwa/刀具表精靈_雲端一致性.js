/* 刀具表精靈 v2.2.8｜既有正式 GAS／主庫不更換。新版 UX 與同步安全補強。 */
'use strict';
let 刀具確認中 = false;
let 刀具同步計時器 = null;
let 刀具同步執行中 = false;
let 刀具已同步指紋 = '';
let 刀具同步失敗指紋 = '';
let 刀具切換版本 = 0;

/** 所有載入與刪除，都必須有可操作的畫面確認；禁止假成功。 */
function 確認操作_(標題, 說明, 按鈕文字 = '確認', 危險 = false) {
    return new Promise(resolve => {
        const 對話框 = document.getElementById('正式操作確認框');
        if (!對話框 || 刀具確認中) { resolve(false); return; }
        刀具確認中 = true;
        document.getElementById('確認標題').textContent = 標題;
        document.getElementById('確認說明').textContent = 說明;
        const 確定鈕 = document.getElementById('確認執行');
        const 取消鈕 = document.getElementById('取消操作');
        const 原焦點 = document.activeElement;
        確定鈕.textContent = 按鈕文字;
        確定鈕.classList.toggle('危險', Boolean(危險));
        對話框.classList.add('開啟');
        對話框.setAttribute('aria-hidden','false');
        let 已完成 = false;
        const 完成 = 結果 => {
            if (已完成) return;
            已完成 = true;
            確定鈕.onclick = 取消鈕.onclick = null;
            document.removeEventListener('keydown', 鍵盤);
            對話框.classList.remove('開啟');
            對話框.setAttribute('aria-hidden','true');
            刀具確認中 = false;
            if (原焦點 && typeof 原焦點.focus === 'function') 原焦點.focus();
            resolve(結果);
        };
        const 鍵盤 = e => {
            if (e.key === 'Escape') 完成(false);
            if (e.key === 'Tab' && !e.shiftKey && document.activeElement === 確定鈕) {
                e.preventDefault(); 取消鈕.focus();
            }
            if (e.key === 'Tab' && e.shiftKey && document.activeElement === 取消鈕) {
                e.preventDefault(); 確定鈕.focus();
            }
        };
        document.addEventListener('keydown', 鍵盤);
        確定鈕.onclick = () => 完成(true);
        取消鈕.onclick = () => 完成(false);
        取消鈕.focus();
    });
}

/** 分頁總覽以正式資料庫為主；本機舊資料只在獨立摺疊清理區顯示。 */
window.renderUnifiedSheetOptions_ = function() {
    const 選單 = document.getElementById('formal-sheet-select');
    if (!選單) return;
    const 目前選擇 = 選單.value;
    const 提示 = document.createElement('option');
    提示.value = '';
    提示.textContent = '點擊展開，選擇正式刀具表分頁';
    const 分類 = document.createElement('optgroup');
    分類.label = '☁️ 正式 Google 試算表（' + formalSheetCache.length + ' 張）';
    formalSheetCache.forEach(項 => {
        const 選項 = document.createElement('option');
        選項.value = 'formal:' + 項.name;
        選項.textContent = 項.name + (項.format ? ' · ' + 項.format : '');
        分類.appendChild(選項);
    });
    選單.replaceChildren(提示, 分類);
    if (目前選擇 && Array.from(選單.options).some(x => x.value === 目前選擇)) 選單.value = 目前選擇;
    const 顯示 = document.getElementById('sheet-source-summary');
    if (顯示) 顯示.textContent = '正式試算表 ' + formalSheetCache.length +
        (formalDbListLoaded ? ' 張 · 讀取完成' : ' 張 · 等待讀取') +
        '　｜　舊版本機 ' + store.tables.length + ' 張（下方可清理）';
};

function 更新刀具明細操作區_() {
    const 元素 = document.getElementById('刀具明細清單');
    if (!元素) return;
    元素.replaceChildren();
    const 刀具 = Number(appData.type) === 2 ? appData.tools2 : appData.tools;
    if (!Array.isArray(刀具) || !刀具.length) {
        const 提示 = document.createElement('p');
        提示.textContent = '這張刀具表尚無刀具明細。按「增加刀具」開始。';
        元素.appendChild(提示); return;
    }
    刀具.forEach((單把, 序號) => {
        const 行 = document.createElement('div'); 行.className = '刀具明細列';
        const 名稱 = document.createElement('span');
        名稱.textContent = (序號 + 1) + '｜' + (單把?.t_no || '未指定刀號') + ' · ' + (單把?.t_type || '未填形式');
        const 刪除鈕 = document.createElement('button');
        刪除鈕.type = 'button'; 刪除鈕.className = '刀具明細刪除';
        刪除鈕.textContent = '刪除';
        刪除鈕.addEventListener('click', () => 刪除單把刀具_(序號));
        行.append(名稱, 刪除鈕); 元素.appendChild(行);
    });
}
async function 刪除單把刀具_(序號) {
    const 清單 = Number(appData.type) === 2 ? appData.tools2 : appData.tools;
    const 目標 = 清單?.[序號];
    if (!目標) return false;
    const 允許 = await 確認操作_('刪除單把刀具',
        '確定從目前刀具表刪除「' + (目標.t_no || '第 ' + (序號 + 1) + ' 把刀具') +
        '」？已載入的正式刀具表會於修改後自動同步並進行讀回核對。',
        '刪除這把',true);
    if (!允許) return false;
    清單.splice(序號,1);
    updateA4Preview(); updateA3Preview(); saveCurrent(); 更新刀具明細操作區_();
    if (!appData._formalTableId) {
        formalDbStatus_('error','目前不是已連結的正式分頁；請按「儲存目前刀具表至正式試算表」完成存檔。');
    }
    return true;
}

/** 沒有後端身分驗證的公開 Web App 不允許執行破壞性刪除。 */
async function 安全刪除正式分頁_(分頁名稱) {
    const 名稱 = String(分頁名稱 || '').trim();
    if (!名稱 || !formalSheetCache.some(x => x.name === 名稱)) {
        alert('請先讀取正式清單，再選擇確定存在的分頁。');
        return false;
    }
    const 同意 = await 確認操作_('正式資料刪除安全檢查',
        '分頁：「' + 名稱 + '」\n正式刪除必須同時移除索引、明細和產品分頁，並完成身分授權、稽核及讀回確認。\n目前既有 GAS 未驗證具備安全刪除服務；禁止把本機刪除當成雲端刪除。',
        '瞭解並檢查',true);
    if (!同意) return false;
    formalDbStatus_('error','正式刪除已安全鎖定：待既有 GAS 加入身分授權、同步刪除和讀回驗證。');
    alert('正式分頁未被刪除：尚未驗證安全刪除 API。已保護正式資料，不會顯示假的刪除成功。');
    return false;
}
async function 刪除選定正式分頁_() {
    const 值 = document.getElementById('formal-sheet-select')?.value || '';
    if (!值.startsWith('formal:')) { alert('請先從正式試算表分頁名稱選單選擇一張。'); return false; }
    return 安全刪除正式分頁_(值.slice(7));
}

const 舊版清單繪製 = window.renderTableList;
window.renderTableList = function(...參數) {
    const 結果 = 舊版清單繪製.apply(this,參數);
    更新刀具明細操作區_();
    const 數量 = document.getElementById('tm-count');
    if (數量) 數量.textContent = '正式表格 ' + formalSheetCache.length + ' 張';
    return 結果;
};

const 原版正式載入 = window.loadSelectedFormalSheet;
window.loadSelectedFormalSheet = async function() {
    const 目前 = String(document.getElementById('formal-sheet-select')?.value || '');
    if (!目前.startsWith('formal:')) {
        alert('請先點選正式試算表分頁名稱。舊本機資料請在下方展開清理。'); return false;
    }
    if (!await 確認操作_('確認載入正式刀具表',
        '確定載入「' + 目前.slice(7) + '」？將進入 A4／A3 預覽，可直接編輯並同步回同一正式分頁。',
        '確認載入')) return false;
    刀具切換版本++;
    const 上次指紋 = 刀具已同步指紋;
    const 結果 = await 原版正式載入.call(this);
    if (appData._formalSheetName === 目前.slice(7)) {
        刀具已同步指紋 = 取得同步指紋_();
        刀具同步失敗指紋 = '';
    } else {
        刀具已同步指紋 = 上次指紋;
    }
    更新刀具明細操作區_();
    return 結果;
};
const 原版載入本機 = window.loadTable;
window.loadTable = async function(id) {
    const 表 = store.tables.find(x => x.id === id);
    if (!表) return false;
    if (!await 確認操作_('確認載入舊版本機資料',
        '確定載入「' + (表.name||id) + '」？本機資料不代表正式試算表已存檔。',
        '確認載入')) return false;
    刀具切換版本++;
    return 原版載入本機.call(this,id);
};

/** 用穩定的正式表名稱，避免修改品名或 OP 後誤新增第二個分頁。 */
const 原版命名 = window.formalSheetNameFromData_;
window.formalSheetNameFromData_ = function(data) {
    const 已連結分頁 = String((data || appData)?._formalSheetName || '').trim();
    return 已連結分頁 || 原版命名.call(this,data);
};
function 取得同步指紋_() {
    if (!appData || !hasMeaningfulData()) return '';
    const 影本 = formalSanitizedData_();
    delete 影本._formalRevision;
    delete 影本._formalTableId;
    delete 影本._formalSheetName;
    return JSON.stringify(影本);
}

/** 完成表格後才會有正式 ID；後續編輯／增刪以防抖方式同步。 */
const 原版儲存 = window.saveCurrentToFormalSheets;
window.saveCurrentToFormalSheets = async function(...參數) {
    const 提交時識別 = String(store.currentId||'');
    const 提交時指紋 = 取得同步指紋_();
    const 成功 = await 原版儲存.apply(this,參數);
    if (成功 && String(store.currentId||'') === 提交時識別) {
        appData._formalSheetName = formalSheetNameFromData_(appData);
        刀具已同步指紋 = 提交時指紋;
        刀具同步失敗指紋 = '';
        const 表 = store.tables.find(x=>x.id===store.currentId);
        if (表?.data) {
            表.data._formalSheetName = appData._formalSheetName;
            表.data._formalTableId = appData._formalTableId;
            persist();
        }
    }
    return 成功;
};
const 原版儲存本機 = window.saveCurrent;
window.saveCurrent = function(...參數) {
    const 結果 = 原版儲存本機.apply(this,參數);
    if (appData?._formalTableId && appData?._formalSheetName) 安排正式自動同步_();
    return 結果;
};
function 安排正式自動同步_() {
    clearTimeout(刀具同步計時器);
    const 當前表ID = String(store.currentId||'');
    const 目前指紋 = 取得同步指紋_();
    if (!目前指紋 || 目前指紋 === 刀具已同步指紋 ||
        目前指紋 === 刀具同步失敗指紋 || !appData?._formalTableId) return;
    刀具同步計時器 = setTimeout(async ()=>{
        if (String(store.currentId||'') !== 當前表ID) return;
        if (刀具同步執行中 || formalDbBusy) {
            刀具同步計時器=setTimeout(安排正式自動同步_,3000);
            return;
        }
        const 送出指紋=取得同步指紋_();
        if (送出指紋 === 刀具已同步指紋) return;
        刀具同步執行中 = true;
        let 成功 = false;
        try {
            成功 = await window.saveCurrentToFormalSheets(true);
            if (!成功) {
                刀具同步失敗指紋 = 送出指紋;
                formalDbStatus_('error','自動同步未完成。資料仍保留本機；請按「立即同步」重新核對。');
            }
        } finally {
            刀具同步執行中=false;
            if (成功 && String(store.currentId||'')===當前表ID &&
                取得同步指紋_()!==刀具已同步指紋) 安排正式自動同步_();
        }
    }, 2800);
}

/** 正式讀回後更新編輯操作區與自動同步基線。 */
const 原版正式資料套用 = window.applyFormalAppData_;
window.applyFormalAppData_ = function(...參數) {
    const 結果 = 原版正式資料套用.apply(this,參數);
    刀具已同步指紋 = 取得同步指紋_();
    刀具同步失敗指紋 = '';
    更新刀具明細操作區_();
    return 結果;
};
