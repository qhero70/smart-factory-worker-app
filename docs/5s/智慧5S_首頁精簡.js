(function () {
  'use strict';

  /**
   * 製一｜智慧5S v1.2.0
   * 首頁長清單精簡：巡檢覆蓋區每天可能出現數十台機台，手機預設只顯示前6項。
   */
  const 每組顯示 = 6;

  function 注入樣式() {
    if (document.getElementById('智慧5S首頁精簡樣式')) return;
    const s = document.createElement('style');
    s.id = '智慧5S首頁精簡樣式';
    s.textContent = `
      .今日巡檢清單.UIUX首頁精簡 .UIUX首頁隱藏項{display:none!important}
      .今日巡檢清單.UIUX首頁精簡.UIUX已展開 .UIUX首頁隱藏項{display:grid!important}
      .UIUX首頁清單控制{margin:8px 0 12px;width:100%;min-height:44px;border:1px solid #d9e7df;border-radius:14px;background:#f6faf8;color:#176b47;font-weight:900}
      .UIUX首頁清單摘要{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0 8px;padding:8px 10px;border-radius:13px;background:#f4f8f6;color:#5e746b;font-size:.72rem}
      @media(max-width:720px){.UIUX首頁清單控制{position:sticky;bottom:78px;z-index:4;box-shadow:0 8px 20px rgba(15,79,53,.12)}}
    `;
    document.head.appendChild(s);
  }

  function 精簡單一清單(list) {
    if (!list || list.dataset.首頁精簡完成) return;
    const items = Array.from(list.children).filter(x => x.classList.contains('今日巡檢項'));
    if (items.length <= 每組顯示) { list.dataset.首頁精簡完成='1'; return; }
    list.dataset.首頁精簡完成='1';
    list.classList.add('UIUX首頁精簡');
    items.slice(每組顯示).forEach(x => x.classList.add('UIUX首頁隱藏項'));

    const summary = document.createElement('div');
    summary.className = 'UIUX首頁清單摘要';
    summary.innerHTML = `<span>先顯示前 ${每組顯示} 項</span><b>共 ${items.length} 項</b>`;
    list.parentNode.insertBefore(summary, list);

    const btn = document.createElement('button');
    btn.type='button'; btn.className='UIUX首頁清單控制';
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
    if (!root) return;
    root.querySelectorAll('.今日巡檢清單').forEach(精簡單一清單);
  }

  function 初始化() {
    執行();
    const o = new MutationObserver(執行);
    o.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',初始化);else 初始化();
})();
