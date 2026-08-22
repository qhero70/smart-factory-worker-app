(function () {
  'use strict';

  /**
   * 製一｜智慧5S v1.2.3
   * 首頁長清單精簡效能版：
   * 1. 手機預設只顯示前 6 項巡檢機台。
   * 2. 移除對 document.documentElement 的全頁 MutationObserver。
   * 3. 改為進首頁後的有限次排程補強，避免 iPhone 因任何 DOM 變動反覆喚醒。
   */
  const 每組顯示 = 6;
  let 排程序號 = 0;

  function 注入樣式() {
    if (document.getElementById('智慧5S首頁精簡樣式')) return;
    const s = document.createElement('style');
    s.id = '智慧5S首頁精簡樣式';
    s.textContent = `
      .今日巡檢清單.UIUX首頁精簡 .UIUX首頁隱藏項{display:none!important}
      .今日巡檢清單.UIUX首頁精簡.UIUX已展開 .UIUX首頁隱藏項{display:grid!important}
      .UIUX首頁清單控制{margin:8px 0 12px;width:100%;min-height:44px;border:1px solid #d9e7df;border-radius:14px;background:#f6faf8;color:#176b47;font-weight:900;touch-action:manipulation}
      .UIUX首頁清單摘要{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 8px;padding:8px 10px;border-radius:13px;background:#f4f8f6;color:#5e746b;font-size:.72rem}
      @media(max-width:720px){.UIUX首頁清單控制{position:sticky;bottom:78px;z-index:4;box-shadow:0 8px 20px rgba(15,79,53,.12)}}
    `;
    document.head.appendChild(s);
  }

  function 精簡單一清單(list) {
    if (!list || list.dataset.首頁精簡完成) return;
    const items = Array.from(list.children).filter(x => x.classList.contains('今日巡檢項'));
    if (items.length <= 每組顯示) {
      list.dataset.首頁精簡完成 = '1';
      return;
    }

    list.dataset.首頁精簡完成 = '1';
    list.classList.add('UIUX首頁精簡');
    items.slice(每組顯示).forEach(x => x.classList.add('UIUX首頁隱藏項'));

    const summary = document.createElement('div');
    summary.className = 'UIUX首頁清單摘要';
    summary.innerHTML = `<span>先顯示前 ${每組顯示} 項</span><b>共 ${items.length} 項</b>`;
    list.parentNode.insertBefore(summary, list);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'UIUX首頁清單控制';
    btn.textContent = `顯示其餘 ${items.length - 每組顯示} 項`;
    btn.addEventListener('click', () => {
      const open = list.classList.toggle('UIUX已展開');
      btn.textContent = open ? '收合機台清單' : `顯示其餘 ${items.length - 每組顯示} 項`;
      if (!open) summary.scrollIntoView({behavior:'smooth',block:'center'});
    });
    list.insertAdjacentElement('afterend', btn);
  }

  function 執行() {
    注入樣式();
    const root = document.getElementById('智慧5S巡檢覆蓋');
    if (!root) return false;
    root.querySelectorAll('.今日巡檢清單').forEach(精簡單一清單);
    return true;
  }

  function 安排首頁補強() {
    const 本次 = ++排程序號;
    [0, 320, 900, 1800, 3200].forEach(ms => {
      setTimeout(() => {
        if (本次 !== 排程序號) return;
        const 首頁作用中 = document.querySelector('.底部導航 .導航按鈕[data-page="首頁"].作用中, .底部導航 .導航按鈕[data-頁面="首頁"].作用中');
        if (首頁作用中 || ms === 0) 執行();
      }, ms);
    });
  }

  function 初始化() {
    注入樣式();
    安排首頁補強();
    document.addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('.底部導航 .導航按鈕');
      if (!btn) return;
      const page = btn.getAttribute('data-page') || btn.getAttribute('data-頁面') || '';
      if (page === '首頁') 安排首頁補強();
    }, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化, {once:true});
  else 初始化();
})();
