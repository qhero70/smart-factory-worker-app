(function (全域) {
  'use strict';

  const 模組版本 = '1.0.6';
  let 監看器 = null;

  function 文字(值) { return String(值 ?? '').trim(); }
  function 數字(值, 預設值) {
    const 數值 = Number(String(值 ?? '').replace(/%/g, '').trim());
    return Number.isFinite(數值) ? 數值 : 預設值;
  }
  function 轉義(值) {
    return String(值 ?? '').replace(/[&<>'"]/g, 字元 => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[字元]);
  }

  function 注入樣式() {
    if (document.getElementById('智慧5S趨勢分析樣式')) return;
    const 樣式 = document.createElement('style');
    樣式.id = '智慧5S趨勢分析樣式';
    樣式.textContent = `
      .趨勢分析區{margin:0 0 18px;padding:18px;border-radius:24px;background:#fff;border:1px solid rgba(16,24,40,.08);box-shadow:0 14px 38px rgba(16,24,40,.07)}
      .趨勢標題列{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.趨勢標題列 h2{margin:0 0 4px;font-size:1.12rem}.趨勢標題列 p{margin:0;color:#667085;font-size:.78rem;line-height:1.5}.趨勢版本{font-size:.7rem;font-weight:800;color:#176b47;background:#eef8f2;padding:5px 8px;border-radius:999px}
      .趨勢摘要網格{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:14px}.趨勢摘要卡{padding:12px;border-radius:16px;background:#f7faf8;border:1px solid #e5ece8}.趨勢摘要卡 small{display:block;color:#667085;font-size:.69rem;font-weight:700}.趨勢摘要卡 b{display:block;margin-top:5px;font-size:1.25rem;color:#173f30}.趨勢摘要卡 span{display:block;margin-top:2px;font-size:.67rem;color:#7b8781}
      .趨勢表{display:grid;gap:8px}.趨勢列{display:grid;grid-template-columns:minmax(0,1.2fr) 90px 90px 90px;gap:8px;align-items:center;padding:10px 12px;border-radius:15px;background:#fbfcfb;border:1px solid #e8ece9}.趨勢列 strong{font-size:.84rem}.趨勢列 small{display:block;margin-top:2px;color:#667085;font-size:.67rem}.趨勢值{text-align:center}.趨勢值 small{display:block;color:#7a8580;font-size:.64rem}.趨勢值 b{font-size:.8rem}.趨勢上升{color:#167647}.趨勢下降{color:#b42318}.趨勢持平{color:#667085}
      .趨勢空白{padding:16px;border-radius:16px;background:#f7faf8;color:#667085;font-size:.78rem;line-height:1.6}
      @media(max-width:720px){.趨勢摘要網格{grid-template-columns:1fr}.趨勢列{grid-template-columns:minmax(0,1fr) 76px 76px}.趨勢列 .趨勢值:last-child{display:none}}
    `;
    document.head.appendChild(樣式);
  }

  function 日期排序(甲, 乙) { return 文字(甲.統計期間 || 甲.日期).localeCompare(文字(乙.統計期間 || 乙.日期)); }

  async function 讀取資料() {
    const 設定 = 全域.智慧5S設定;
    const 資料庫 = 全域.智慧5S資料庫;
    if (!設定 || !資料庫 || typeof 資料庫.讀取分頁 !== 'function') return null;

    const [日統計結果, 排名結果] = await Promise.all([
      資料庫.讀取分頁(設定.分頁.區域日統計, 設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.排名快照, 設定.讀取上限)
    ]);

    const 日統計 = Array.isArray(日統計結果.資料) ? 日統計結果.資料 : [];
    const 排名 = (Array.isArray(排名結果.資料) ? 排名結果.資料 : []).filter(列 => 文字(列.範圍類型) === '每日');
    return { 日統計, 排名 };
  }

  function 建立趨勢(資料) {
    const 排名 = 資料.排名.slice().sort(日期排序);
    const 日期清單 = Array.from(new Set(排名.map(列 => 文字(列.統計期間)).filter(Boolean))).sort();
    if (!日期清單.length) return null;

    const 最新日期 = 日期清單[日期清單.length - 1];
    const 七日起點 = 日期清單[Math.max(0, 日期清單.length - 7)];
    const 三十日起點 = 日期清單[Math.max(0, 日期清單.length - 30)];
    const 最新 = 排名.filter(列 => 文字(列.統計期間) === 最新日期);

    const 趨勢列 = 最新.map(最新列 => {
      const 代碼 = 文字(最新列.對象代碼);
      const 同區 = 排名.filter(列 => 文字(列.對象代碼) === 代碼).sort(日期排序);
      const 最新分數 = 數字(最新列.分數, 0);
      const 七日起 = 同區.filter(列 => 文字(列.統計期間) >= 七日起點)[0] || 最新列;
      const 三十日起 = 同區.filter(列 => 文字(列.統計期間) >= 三十日起點)[0] || 最新列;
      return {
        區域名稱: 文字(最新列.對象名稱 || 代碼),
        區域代碼: 代碼,
        最新分數,
        七日變化: 最新分數 - 數字(七日起.分數, 最新分數),
        三十日變化: 最新分數 - 數字(三十日起.分數, 最新分數),
        名次: 數字(最新列.名次, 0)
      };
    }).sort((甲,乙) => 甲.名次 - 乙.名次);

    const 平均 = 趨勢列.length ? Math.round(趨勢列.reduce((總,列) => 總 + 列.最新分數, 0) / 趨勢列.length) : 0;
    const 下降區 = 趨勢列.filter(列 => 列.七日變化 < 0).length;
    const 上升區 = 趨勢列.filter(列 => 列.七日變化 > 0).length;
    return { 最新日期, 歷史天數: 日期清單.length, 平均, 下降區, 上升區, 趨勢列 };
  }

  function 變化HTML(值) {
    const 類別 = 值 > 0 ? '趨勢上升' : (值 < 0 ? '趨勢下降' : '趨勢持平');
    const 符號 = 值 > 0 ? '↑' : (值 < 0 ? '↓' : '—');
    return `<b class="${類別}">${符號}${Math.abs(值)}</b>`;
  }

  function 建立HTML(趨勢) {
    if (!趨勢) return `<section id="智慧5S趨勢分析" class="趨勢分析區"><div class="趨勢標題列"><div><h2>📈 7日／30日趨勢</h2><p>尚未建立排名歷史資料。</p></div><span class="趨勢版本">v${模組版本}</span></div></section>`;
    const 列HTML = 趨勢.趨勢列.map(列 => `<div class="趨勢列"><div><strong>${轉義(列.區域名稱)}</strong><small>${轉義(列.區域代碼)}｜目前第 ${列.名次} 名</small></div><div class="趨勢值"><small>目前分數</small><b>${列.最新分數}</b></div><div class="趨勢值"><small>7日變化</small>${變化HTML(列.七日變化)}</div><div class="趨勢值"><small>30日變化</small>${變化HTML(列.三十日變化)}</div></div>`).join('');
    return `<section id="智慧5S趨勢分析" class="趨勢分析區"><div class="趨勢標題列"><div><h2>📈 7日／30日趨勢</h2><p>從每日排名快照追蹤區域改善與退步，主管可直接鎖定持續下降區域。</p></div><span class="趨勢版本">v${模組版本}</span></div><div class="趨勢摘要網格"><div class="趨勢摘要卡"><small>歷史累積</small><b>${趨勢.歷史天數} 天</b><span>最新 ${轉義(趨勢.最新日期)}</span></div><div class="趨勢摘要卡"><small>區域平均管理分數</small><b>${趨勢.平均}</b><span>依最新每日快照</span></div><div class="趨勢摘要卡"><small>7日趨勢</small><b>${趨勢.上升區} ↑ ／ ${趨勢.下降區} ↓</b><span>改善區／退步區</span></div></div>${趨勢.歷史天數 < 2 ? '<div class="趨勢空白">目前已建立第一天基準。從下一個每日快照開始，就會顯示實際上升／下降趨勢；累積滿 7 天與 30 天後會自動形成完整比較。</div>' : `<div class="趨勢表">${列HTML}</div>`}</section>`;
  }

  async function 更新() {
    const 內容 = document.getElementById('頁面內容');
    if (!內容 || !document.querySelector('.導航按鈕[data-頁面="首頁"].作用中')) return;
    try {
      const 資料 = await 讀取資料();
      if (!資料) return;
      const 趨勢 = 建立趨勢(資料);
      const 舊 = document.getElementById('智慧5S趨勢分析');
      if (舊) 舊.remove();
      const 容器 = document.createElement('div');
      容器.innerHTML = 建立HTML(趨勢);
      const 排名 = document.getElementById('智慧5S區域風險排名');
      if (排名 && 排名.parentNode) 排名.parentNode.insertBefore(容器.firstElementChild, 排名.nextSibling);
      else 內容.prepend(容器.firstElementChild);
    } catch (錯誤) {
      console.warn('智慧5S趨勢分析更新失敗', 錯誤);
    }
  }

  function 啟動() {
    注入樣式();
    setTimeout(更新, 1000);
    if (監看器) return;
    const 內容 = document.getElementById('頁面內容');
    if (!內容) return;
    監看器 = new MutationObserver(() => setTimeout(更新, 350));
    監看器.observe(內容, { childList: true, subtree: false });
    document.addEventListener('click', 事件 => {
      const 按鈕 = 事件.target.closest && 事件.target.closest('.導航按鈕[data-頁面="首頁"]');
      if (按鈕) setTimeout(更新, 650);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 啟動);
  else 啟動();

  全域.智慧5S趨勢分析 = Object.freeze({ 版本: 模組版本, 更新 });
})(window);
