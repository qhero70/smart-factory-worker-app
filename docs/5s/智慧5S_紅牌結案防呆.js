(function () {
  'use strict';

  /**
   * 智慧5S v1.1.8｜紅牌結案防呆
   * 舊版紅牌詳情原本允許主管直接按「完成並結案」。
   * v1.1.8 起必須走：待處置 → 處理中 → 處置後拍照 → 待複查 → 主管結案。
   * 本模組隱藏並攔截舊版直接結案按鈕，避免無照片證據的旁路結案。
   */

  function 提示(內容) {
    const n = document.getElementById('通知');
    if (!n) return alert(內容);
    n.textContent = 內容;
    n.className = '通知 顯示 警告';
    clearTimeout(提示.計時器);
    提示.計時器 = setTimeout(() => { n.className = '通知'; }, 3800);
  }

  function 套用防呆() {
    document.querySelectorAll('[data-紅牌動作="已結案"]').forEach(按鈕 => {
      按鈕.style.display = 'none';
      按鈕.setAttribute('aria-hidden', 'true');
      按鈕.disabled = true;
      按鈕.title = 'v1.1.8 起請使用「拍處置後照片／送複查」後再由主管結案';
    });
  }

  document.addEventListener('click', 事件 => {
    const 舊按鈕 = 事件.target.closest && 事件.target.closest('[data-紅牌動作="已結案"]');
    if (!舊按鈕) return;
    事件.preventDefault();
    事件.stopPropagation();
    if (typeof 事件.stopImmediatePropagation === 'function') 事件.stopImmediatePropagation();
    提示('紅牌結案已改為照片複查制：請先拍處置後照片並送複查，再由主管執行「主管複查結案」。');
  }, true);

  const 觀察器 = new MutationObserver(套用防呆);
  function 初始化() {
    套用防呆();
    觀察器.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化); else 初始化();
})();
