(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S iPhone / Safari 導航修復 v1.2.1
   *
   * 修復目的：
   * 1. 避免 iOS Safari / PWA 對非 ASCII data-* / dataset 行為差異造成底部導航失效。
   * 2. 導航統一補上 ASCII data-page 屬性。
   * 3. 首頁、巡檢、改善、紅牌、設定以可靠 URL 路由切換；同一工作階段不會被登出。
   * 4. 可視化維持單頁中心，由智慧5S可視化管理模組直接開啟。
   * 5. 動態新增的第六個「可視化」按鈕也會自動綁定。
   */

  const 版本 = '1.2.1';
  const 入口版本 = '1210';
  const 核心頁面 = new Set(['首頁','巡檢','改善','紅牌','設定']);
  let 正在導航 = false;

  function 文字(v) { return String(v == null ? '' : v).trim(); }

  function 從按鈕取得頁面(btn) {
    if (!btn) return '';
    const ascii = 文字(btn.getAttribute('data-page'));
    if (ascii) return ascii;
    const 原始 = 文字(btn.getAttribute('data-頁面'));
    if (原始) return 原始;
    if (btn.id === '可視化導航') return '可視化';
    const label = 文字(btn.textContent).replace(/\s+/g, '');
    if (label.includes('首頁')) return '首頁';
    if (label.includes('巡檢')) return '巡檢';
    if (label.includes('改善')) return '改善';
    if (label.includes('紅牌')) return '紅牌';
    if (label.includes('設定')) return '設定';
    if (label.includes('可視化')) return '可視化';
    return '';
  }

  function 標記作用中(page) {
    document.querySelectorAll('.底部導航 .導航按鈕').forEach(btn => {
      btn.classList.toggle('作用中', 從按鈕取得頁面(btn) === page);
    });
  }

  function 前往核心頁面(page) {
    if (!核心頁面.has(page) || 正在導航) return;
    正在導航 = true;
    標記作用中(page);
    try {
      sessionStorage.setItem('智慧5S_導航目標', page);
      const url = new URL(location.href);
      url.searchParams.set('頁面', page);
      url.searchParams.set('v', 入口版本);
      url.searchParams.delete('nav');
      location.assign(url.toString());
    } catch (err) {
      正在導航 = false;
      console.error('智慧5S iPhone導航失敗', err);
      location.href = `./index.html?頁面=${encodeURIComponent(page)}&v=${入口版本}`;
    }
  }

  function 前往可視化() {
    標記作用中('可視化');
    const mod = 全域.智慧5S可視化管理;
    if (mod && typeof mod.進入可視化中心 === 'function') {
      mod.進入可視化中心();
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('頁面', '可視化');
    url.searchParams.set('v', 入口版本);
    location.assign(url.toString());
  }

  function 導航(page) {
    if (page === '可視化') return 前往可視化();
    if (核心頁面.has(page)) return 前往核心頁面(page);
  }

  function 綁定按鈕(btn) {
    if (!btn || btn.dataset.iphoneNavFix === '1') return;
    const page = 從按鈕取得頁面(btn);
    if (!page) return;
    btn.dataset.iphoneNavFix = '1';
    btn.setAttribute('data-page', page);
    btn.setAttribute('role', 'button');
    btn.style.touchAction = 'manipulation';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      導航(page);
    }, true);
  }

  function 綁定全部導航() {
    document.querySelectorAll('.底部導航 .導航按鈕').forEach(綁定按鈕);
  }

  function 注入導航保護樣式() {
    if (document.getElementById('智慧5S_iPhone導航修復樣式')) return;
    const style = document.createElement('style');
    style.id = '智慧5S_iPhone導航修復樣式';
    style.textContent = `
      .底部導航{z-index:9998!important;pointer-events:auto!important;isolation:isolate}
      .底部導航 .導航按鈕{pointer-events:auto!important;touch-action:manipulation;-webkit-tap-highlight-color:transparent;position:relative;z-index:1}
      .底部導航::before,.底部導航::after{pointer-events:none!important}
      .內容,.浮動按鈕{max-width:100%}
    `;
    document.head.appendChild(style);
  }

  function 更新ServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(`./離線服務.js?v=${入口版本}`, { scope:'./' })
      .then(reg => {
        if (reg.waiting) reg.waiting.postMessage('立即啟用新版');
        reg.update().catch(() => {});
      })
      .catch(err => console.warn('智慧5S v1.2.1 離線服務更新失敗', err));
  }

  function 初始化() {
    注入導航保護樣式();
    綁定全部導航();
    更新ServiceWorker();

    const nav = document.querySelector('.底部導航');
    if (nav) {
      const obs = new MutationObserver(() => 綁定全部導航());
      obs.observe(nav, { childList:true, subtree:true });
    }

    document.addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('.底部導航 .導航按鈕');
      if (btn) 綁定按鈕(btn);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化, {once:true});
  else 初始化();

  全域.智慧5SiPhone導航修復 = Object.freeze({ 版本, 綁定全部導航, 導航 });
})(window);
