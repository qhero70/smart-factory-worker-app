(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S 效能核心 v1.2.3
   *
   * 目的：
   * 1. 阻止首頁戰情模組對「頁面內容」建立自我觸發的 MutationObserver 迴圈。
   * 2. 對後續模組的試算表讀取加入 20 秒記憶體快取與同請求去重，降低 iPhone 4G 反覆讀取延遲。
   * 3. 底部導航只保留 6 個核心入口；製一組/A5現況/A5稽核改由首頁快速作業進入，避免 9 個按鈕擠成兩排。
   * 4. 頁面切換後只做一次輕量 UI 補強，不再持續監看整頁。
   */

  const 版本 = '1.2.3';
  const 入口版本 = '1230';
  const 核心頁面 = new Set(['首頁','巡檢','改善','紅牌','可視化','設定']);
  const 原生MutationObserver = 全域.MutationObserver;
  const 原始資料庫 = 全域.智慧5S資料庫;
  const 記憶體快取 = new Map();
  const 進行中 = new Map();
  const TTL = 20000;

  function 文字(v){ return String(v == null ? '' : v).trim(); }
  function 取得頁面(btn){
    if(!btn) return '';
    return 文字(btn.getAttribute('data-page')) || 文字(btn.getAttribute('data-頁面')) || 文字(btn.textContent).replace(/\s+/g,'');
  }

  // ---------- 1. 阻止頁面內容觀察器形成自我更新迴圈 ----------
  if (原生MutationObserver && !全域.__智慧5S效能Observer已套用) {
    class 智慧5S穩定Observer {
      constructor(callback){
        this._callback = callback;
        this._observer = new 原生MutationObserver(callback);
        this._blocked = false;
      }
      observe(target, options){
        // 多個首頁分析模組會在更新自身 DOM 後再次觸發 observer，形成 350ms~1s 永久迴圈。
        // 頁面內容改成事件式更新，不允許再建立整頁 MutationObserver。
        if (target && target.id === '頁面內容') {
          this._blocked = true;
          return;
        }
        this._blocked = false;
        return this._observer.observe(target, options);
      }
      disconnect(){ return this._observer.disconnect(); }
      takeRecords(){ return this._observer.takeRecords(); }
    }
    全域.MutationObserver = 智慧5S穩定Observer;
    全域.__智慧5S效能Observer已套用 = true;
  }

  // ---------- 2. 後續模組讀取快取 / 同請求去重 ----------
  if (原始資料庫 && typeof 原始資料庫.讀取分頁 === 'function' && !全域.__智慧5S讀取快取已套用) {
    const 包裝 = {};
    Object.keys(原始資料庫).forEach(k => {
      const v = 原始資料庫[k];
      包裝[k] = typeof v === 'function' ? v.bind(原始資料庫) : v;
    });

    包裝.讀取分頁 = async function(name, limit){
      const key = `${文字(name)}|${Number(limit)||0}`;
      const now = Date.now();
      const hit = 記憶體快取.get(key);
      if (hit && now - hit.time < TTL) return hit.value;
      if (進行中.has(key)) return 進行中.get(key);

      const promise = Promise.resolve(原始資料庫.讀取分頁(name, limit))
        .then(value => {
          記憶體快取.set(key, { time: Date.now(), value });
          return value;
        })
        .finally(() => 進行中.delete(key));
      進行中.set(key, promise);
      return promise;
    };

    if (typeof 原始資料庫.送出或排隊 === 'function') {
      包裝.送出或排隊 = async function(payload){
        const r = await 原始資料庫.送出或排隊(payload);
        記憶體快取.clear();
        return r;
      };
    }

    try {
      全域.智慧5S資料庫 = Object.freeze(包裝);
      全域.__智慧5S讀取快取已套用 = true;
    } catch (e) {
      console.warn('智慧5S效能核心：資料庫快取包裝未套用', e);
    }
  }

  // ---------- 3. 精簡底部導航 ----------
  function 整理底部導航(){
    const nav = document.querySelector('.底部導航');
    if(!nav) return;
    Array.from(nav.querySelectorAll('.導航按鈕')).forEach(btn => {
      const page = 取得頁面(btn);
      const matched = Array.from(核心頁面).find(p => page === p || page.includes(p));
      if(!matched) {
        // 功能仍保留在首頁快速作業與各中心內，不在底部重複占位。
        btn.remove();
        return;
      }
      btn.setAttribute('data-page', matched);
      btn.setAttribute('data-頁面', matched);
    });

    const 順序 = ['首頁','巡檢','改善','紅牌','可視化','設定'];
    const buttons = Array.from(nav.querySelectorAll('.導航按鈕'));
    順序.forEach(page => {
      const b = buttons.find(x => 取得頁面(x) === page);
      if(b) nav.appendChild(b);
    });
  }

  function 注入樣式(){
    if(document.getElementById('智慧5S效能核心樣式')) return;
    const s = document.createElement('style');
    s.id = '智慧5S效能核心樣式';
    s.textContent = `
      .底部導航{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:2px!important;overflow:visible!important}
      .底部導航 .導航按鈕{min-width:0!important;width:100%!important;padding:7px 1px!important;touch-action:manipulation!important}
      .底部導航 .導航按鈕>span:last-child{font-size:10.5px!important;white-space:nowrap!important}
      .底部導航 .導航圖示{font-size:17px!important}
      .內容{contain:layout style;}
      @media(max-width:390px){.底部導航 .導航按鈕>span:last-child{font-size:9.5px!important}}
    `;
    document.head.appendChild(s);
  }

  function 輕量補強(){
    const ui = 全域.智慧5SUIUX;
    if(ui && typeof ui.執行補強 === 'function') {
      requestAnimationFrame(() => {
        try { ui.執行補強(); } catch(_) {}
      });
    }
  }

  function 初始化(){
    注入樣式();
    setTimeout(整理底部導航, 0);
    setTimeout(整理底部導航, 250);
    setTimeout(整理底部導航, 900);

    // 只監看底部 nav 的直接子節點，成本極低；若舊模組再次插入按鈕立即移除。
    const nav = document.querySelector('.底部導航');
    if(nav && 原生MutationObserver){
      const obs = new 原生MutationObserver(() => requestAnimationFrame(整理底部導航));
      obs.observe(nav, { childList:true });
    }

    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('.底部導航 .導航按鈕');
      if(b) setTimeout(輕量補強, 0);
    }, false);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化, {once:true});
  else 初始化();

  全域.智慧5S效能核心 = Object.freeze({ 版本, 整理底部導航, 清除讀取快取:() => 記憶體快取.clear() });
})(window);
