(function (全域) {
  'use strict';

  /**
   * 化新精密｜製一｜智慧5S
   * 可視化正式路由修復 v1.2.7
   *
   * 修復目標：
   * 1. iPhone / PWA 點「可視化」時，不再被舊核心路由導回首頁。
   * 2. 以捕獲階段攔截可視化按鈕，優先交由可視化模組接管。
   * 3. 支援 ?頁面=可視化 直接進入與重新整理。
   * 4. 可視化載入較慢時自動重試，不再用首頁作 fallback。
   */
  const 版本 = '1.2.7';
  const 入口版本 = String((全域.智慧5S設定 && 全域.智慧5S設定.入口版本碼) || '1270');
  let 正在開啟 = false;
  let 最後開啟時間 = 0;

  function 文字(v) { return String(v == null ? '' : v).trim(); }

  function 是可視化按鈕(target) {
    const b = target && target.closest ? target.closest('.導航按鈕') : null;
    if (!b) return null;
    const page = 文字(b.getAttribute('data-page') || b.getAttribute('data-頁面'));
    return (b.id === '可視化導航' || page === '可視化' || 文字(b.textContent).replace(/\s+/g, '').includes('可視化')) ? b : null;
  }

  function 更新網址() {
    try {
      const u = new URL(location.href);
      u.searchParams.set('頁面', '可視化');
      u.searchParams.set('v', 入口版本);
      history.replaceState({ 頁面: '可視化' }, '', u.toString());
    } catch (_) {}
  }

  function 標記導覽() {
    document.querySelectorAll('.底部導航 .導航按鈕').forEach(b => {
      const page = 文字(b.getAttribute('data-page') || b.getAttribute('data-頁面'));
      b.classList.toggle('作用中', b.id === '可視化導航' || page === '可視化');
    });
    const 浮動 = document.getElementById('浮動按鈕');
    if (浮動) 浮動.classList.add('隱藏');
  }

  function 顯示失敗(message) {
    const main = document.getElementById('頁面內容');
    if (!main) return;
    const title = document.getElementById('頁面標題');
    const sub = document.getElementById('頁面副標');
    if (title) title.textContent = '5S 可視化標準管理';
    if (sub) sub.textContent = '標準照片｜責任區｜甘特｜0–4稽核';
    main.innerHTML = `<section class="卡片"><div class="卡片標題">可視化模組載入中斷</div><div class="卡片副標" style="margin-top:6px">${文字(message || '模組尚未完成載入')}</div><button id="可視化路由重試" class="主要按鈕 滿版" type="button" style="margin-top:12px">重新開啟可視化</button></section>`;
    document.getElementById('可視化路由重試')?.addEventListener('click', () => 開啟可視化(true), { once: true });
  }

  function 模組可用() {
    return !!(全域.智慧5S可視化管理 && typeof 全域.智慧5S可視化管理.進入可視化中心 === 'function');
  }

  function 開啟可視化(強制) {
    const now = Date.now();
    if (!強制 && 正在開啟 && now - 最後開啟時間 < 900) return;
    正在開啟 = true;
    最後開啟時間 = now;
    標記導覽();
    更新網址();

    const 嘗試 = [0, 80, 220, 500, 900, 1500];
    let 完成 = false;
    嘗試.forEach((ms, idx) => {
      setTimeout(() => {
        if (完成) return;
        if (模組可用()) {
          try {
            全域.智慧5S可視化管理.進入可視化中心();
            標記導覽();
            更新網址();
            完成 = true;
            正在開啟 = false;
            return;
          } catch (e) {
            console.warn('智慧5S可視化路由：開啟失敗', e);
            if (idx === 嘗試.length - 1) {
              正在開啟 = false;
              顯示失敗(e && e.message ? e.message : e);
            }
          }
        } else if (idx === 嘗試.length - 1) {
          正在開啟 = false;
          顯示失敗('可視化標準管理模組尚未載入，請按重新開啟。');
        }
      }, ms);
    });

    // 防止其他舊模組在點擊後又把畫面覆蓋成首頁。
    [300, 700, 1300, 2200].forEach(ms => setTimeout(() => {
      const page = new URLSearchParams(location.search).get('頁面');
      const title = 文字(document.getElementById('頁面標題')?.textContent);
      if (page === '可視化' && 模組可用() && !document.querySelector('.可視化頁') && !title.includes('可視化')) {
        try { 全域.智慧5S可視化管理.進入可視化中心(); 標記導覽(); } catch (_) {}
      }
    }, ms));
  }

  function 捕獲點擊(e) {
    const b = 是可視化按鈕(e.target);
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    b.setAttribute('data-page', '可視化');
    b.setAttribute('data-頁面', '可視化');
    開啟可視化(true);
  }

  function 修正按鈕() {
    const b = document.getElementById('可視化導航') || Array.from(document.querySelectorAll('.導航按鈕')).find(x => 文字(x.textContent).replace(/\s+/g, '').includes('可視化'));
    if (!b) return;
    b.setAttribute('data-page', '可視化');
    b.setAttribute('data-頁面', '可視化');
    b.type = 'button';
  }

  function 處理直接路由() {
    const page = new URLSearchParams(location.search).get('頁面');
    if (page !== '可視化') return;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      const app = document.getElementById('應用程式');
      if (app && !app.classList.contains('隱藏')) {
        clearInterval(timer);
        開啟可視化(true);
      } else if (n >= 40) {
        clearInterval(timer);
      }
    }, 250);
  }

  function 初始化() {
    修正按鈕();
    document.addEventListener('click', 捕獲點擊, true);
    window.addEventListener('popstate', () => {
      if (new URLSearchParams(location.search).get('頁面') === '可視化') 開啟可視化(true);
    });
    new MutationObserver(修正按鈕).observe(document.body, { childList: true, subtree: true });
    處理直接路由();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化, { once: true });
  else 初始化();

  全域.智慧5S可視化路由修復 = Object.freeze({ 版本, 開啟可視化, 修正按鈕 });
})(window);
