(function () {
  'use strict';

  /**
   * 化新精密｜製一｜智慧5S
   * 工作階段登入防護 v1.2.0
   *
   * 原核心會讀取 localStorage 的「智慧5S_目前使用者」並直接進首頁。
   * 本模組在核心啟動前執行：新的瀏覽器/PWA工作階段一律回到登入頁，
   * 同一分頁重新整理則保留已驗證工作階段，避免現場操作被頻繁打斷。
   */

  const 工作階段鍵 = '智慧5S_工作階段已驗證';
  const 使用者快取鍵 = '智慧5S_目前使用者';
  const 最近登入鍵 = '智慧5S_最近登入識別';

  function 已驗證() {
    return sessionStorage.getItem(工作階段鍵) === '1';
  }

  function 強制新工作階段登入() {
    if (已驗證()) return;
    try { localStorage.removeItem(使用者快取鍵); } catch (_) {}
  }

  function 標記登入嘗試() {
    try {
      const input = document.getElementById('登入工號');
      if (input && String(input.value || '').trim()) {
        localStorage.setItem(最近登入鍵, String(input.value || '').trim());
      }
      sessionStorage.setItem(工作階段鍵, '1');
    } catch (_) {}
  }

  function 補登入體驗() {
    const input = document.getElementById('登入工號');
    if (input && !input.dataset.登入防護完成) {
      input.dataset.登入防護完成 = '1';
      try {
        const 最近 = localStorage.getItem(最近登入鍵) || '';
        if (!input.value && 最近) input.value = 最近;
      } catch (_) {}
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') 標記登入嘗試();
      }, true);
    }

    const btn = document.getElementById('登入按鈕');
    if (btn && !btn.dataset.登入防護完成) {
      btn.dataset.登入防護完成 = '1';
      btn.addEventListener('click', 標記登入嘗試, true);
    }
  }

  function 登出工作階段() {
    try {
      sessionStorage.removeItem(工作階段鍵);
      localStorage.removeItem(使用者快取鍵);
    } catch (_) {}
    location.reload();
  }

  強制新工作階段登入();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 補登入體驗);
  else 補登入體驗();

  const 觀察器 = new MutationObserver(補登入體驗);
  觀察器.observe(document.documentElement, { childList: true, subtree: true });

  window.智慧5S登入防護 = Object.freeze({
    版本: '1.2.0',
    已驗證,
    登出工作階段
  });
})();
