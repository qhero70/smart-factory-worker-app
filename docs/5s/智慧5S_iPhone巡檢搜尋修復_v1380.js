(function (全域) {
  'use strict';

  /**
   * 化新精密｜製一｜智慧5S
   * iPhone 巡檢搜尋穩定修復 v1.3.8
   *
   * 修復內容：
   * 1. Safari / iPhone 輸入搜尋文字時，不再整頁重繪造成鍵盤與游標跳走。
   * 2. 中文注音／倉頡等輸入法組字期間維持輸入焦點。
   * 3. 區域切換或巡檢頁重新繪製後，自動恢復搜尋文字。
   * 4. 僅在目前已顯示的機台卡上進行即時篩選，不改動巡檢核心資料。
   */

  const 修復版本 = '1.3.8';
  const 搜尋框識別 = 'MCHK搜尋';
  const 搜尋暫存鍵 = '智慧5S_巡檢搜尋文字_v1380';
  const 空狀態識別 = 'MCHK搜尋修復空狀態';

  let 組字中 = false;
  let 最近搜尋 = '';
  let 套用排程 = 0;

  function 文字(值) {
    return String(值 == null ? '' : 值).trim();
  }

  function 讀取暫存() {
    try {
      return sessionStorage.getItem(搜尋暫存鍵) || '';
    } catch (_) {
      return 最近搜尋 || '';
    }
  }

  function 寫入暫存(值) {
    最近搜尋 = String(值 == null ? '' : 值);
    try {
      sessionStorage.setItem(搜尋暫存鍵, 最近搜尋);
    } catch (_) {}
  }

  function 是否巡檢搜尋框(節點) {
    return Boolean(節點 && 節點.id === 搜尋框識別 && 節點.classList && 節點.classList.contains('MCHK搜尋'));
  }

  function 正規化(值) {
    return 文字(值).toLocaleLowerCase('zh-Hant-TW');
  }

  function 移除修復空狀態(清單) {
    if (!清單) return;
    const 空狀態 = 清單.querySelector('#' + 空狀態識別);
    if (空狀態) 空狀態.remove();
  }

  function 套用篩選(搜尋框, 保持焦點) {
    if (!是否巡檢搜尋框(搜尋框)) return;
    const 頁 = 搜尋框.closest('.MCHK頁');
    if (!頁) return;
    const 清單 = 頁.querySelector('.MCHK機台清單');
    if (!清單) return;

    const 查詢 = 正規化(搜尋框.value);
    寫入暫存(搜尋框.value);
    移除修復空狀態(清單);

    const 卡片 = Array.from(清單.querySelectorAll('.MCHK機台卡'));
    let 顯示數 = 0;

    卡片.forEach(卡 => {
      const 符合 = !查詢 || 正規化(卡.textContent).includes(查詢);
      卡.hidden = !符合;
      卡.style.display = 符合 ? '' : 'none';
      if (符合) 顯示數 += 1;
    });

    const 原始空狀態 = Array.from(清單.children).find(節點 =>
      節點.classList && 節點.classList.contains('空狀態') && 節點.id !== 空狀態識別
    );
    if (原始空狀態) 原始空狀態.style.display = 查詢 ? 'none' : '';

    if (查詢 && 顯示數 === 0 && 卡片.length > 0) {
      const 空 = document.createElement('div');
      空.id = 空狀態識別;
      空.className = '空狀態';
      空.textContent = '找不到符合條件的機台';
      清單.appendChild(空);
    }

    if (保持焦點 && document.activeElement !== 搜尋框) {
      try {
        搜尋框.focus({ preventScroll: true });
        const 長度 = 搜尋框.value.length;
        搜尋框.setSelectionRange(長度, 長度);
      } catch (_) {}
    }
  }

  function 強化搜尋框(搜尋框) {
    if (!是否巡檢搜尋框(搜尋框)) return;
    if (搜尋框.dataset.v1380修復 === '是') return;

    搜尋框.dataset.v1380修復 = '是';
    搜尋框.setAttribute('autocomplete', 'off');
    搜尋框.setAttribute('autocapitalize', 'off');
    搜尋框.setAttribute('spellcheck', 'false');
    搜尋框.setAttribute('enterkeyhint', 'search');

    const 暫存 = 讀取暫存();
    if (暫存 && !搜尋框.value) 搜尋框.value = 暫存;
    套用篩選(搜尋框, false);
  }

  function 排程強化() {
    cancelAnimationFrame(套用排程);
    套用排程 = requestAnimationFrame(() => {
      const 搜尋框 = document.getElementById(搜尋框識別);
      if (搜尋框) 強化搜尋框(搜尋框);
    });
  }

  // 使用 capture 攔截巡檢核心原本會在每次輸入後重繪整頁的 input 事件。
  // 只攔截 MCHK搜尋，不影響巡檢原因、照片、評分等其他控制項。
  document.addEventListener('input', 事件 => {
    const 搜尋框 = 事件.target;
    if (!是否巡檢搜尋框(搜尋框)) return;

    事件.stopImmediatePropagation();
    事件.stopPropagation();
    寫入暫存(搜尋框.value);

    if (!組字中) 套用篩選(搜尋框, true);
  }, true);

  document.addEventListener('compositionstart', 事件 => {
    if (!是否巡檢搜尋框(事件.target)) return;
    組字中 = true;
  }, true);

  document.addEventListener('compositionend', 事件 => {
    const 搜尋框 = 事件.target;
    if (!是否巡檢搜尋框(搜尋框)) return;
    組字中 = false;
    寫入暫存(搜尋框.value);
    requestAnimationFrame(() => 套用篩選(搜尋框, true));
  }, true);

  document.addEventListener('search', 事件 => {
    const 搜尋框 = 事件.target;
    if (!是否巡檢搜尋框(搜尋框)) return;
    事件.stopImmediatePropagation();
    寫入暫存(搜尋框.value);
    套用篩選(搜尋框, true);
  }, true);

  // 巡檢核心切換區域時會重建 DOM，這裡只把搜尋框強化重新掛回去。
  const 觀察器 = new MutationObserver(() => 排程強化());
  const 啟動觀察 = () => {
    const 根 = document.getElementById('頁面內容') || document.body;
    觀察器.observe(根, { childList: true, subtree: true });
    排程強化();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', 啟動觀察, { once: true });
  } else {
    啟動觀察();
  }

  全域.智慧5SiPhone巡檢搜尋修復 = Object.freeze({
    版本: 修復版本,
    重新套用: 排程強化,
    清除搜尋() {
      寫入暫存('');
      const 搜尋框 = document.getElementById(搜尋框識別);
      if (搜尋框) {
        搜尋框.value = '';
        套用篩選(搜尋框, false);
      }
    }
  });
})(window);
