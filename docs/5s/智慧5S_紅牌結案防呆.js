(function () {
  'use strict';

  /**
   * 智慧5S v1.1.8｜紅牌處置防呆
   * 舊版紅牌詳情原本可直接「開始處理」或由主管「完成並結案」，
   * 這兩個舊動作不會寫入新的紅牌處置歷程，且舊結案可繞過照片複查。
   * v1.1.8 起統一強制走：
   * 待處置 → 新版開始處理 → 處置後拍照 → 待複查 → 主管複查結案。
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
    document.querySelectorAll('[data-紅牌動作="處理中"],[data-紅牌動作="已結案"]').forEach(按鈕 => {
      按鈕.style.display = 'none';
      按鈕.setAttribute('aria-hidden', 'true');
      按鈕.disabled = true;
      按鈕.title = 'v1.1.8 起請使用下方「實體紅牌閉環」的新流程按鈕';
    });
  }

  document.addEventListener('click', 事件 => {
    const 舊按鈕 = 事件.target.closest && 事件.target.closest('[data-紅牌動作="處理中"],[data-紅牌動作="已結案"]');
    if (!舊按鈕) return;
    const 動作 = 舊按鈕.getAttribute('data-紅牌動作');
    事件.preventDefault();
    事件.stopPropagation();
    if (typeof 事件.stopImmediatePropagation === 'function') 事件.stopImmediatePropagation();
    if (動作 === '已結案') {
      提示('紅牌結案已改為照片複查制：請先拍處置後照片並送複查，再由主管執行「主管複查結案」。');
    } else {
      提示('請使用新版「實體紅牌閉環」的開始處理按鈕，系統才會留下完整處置歷程。');
    }
  }, true);

  const 觀察器 = new MutationObserver(套用防呆);
  function 初始化() {
    套用防呆();
    觀察器.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化); else 初始化();
})();
