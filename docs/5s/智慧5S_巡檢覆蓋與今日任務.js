(function (全域) {
  'use strict';

  const 模組版本 = '1.0.7';
  let 監看器 = null;
  let 更新計時器 = null;

  function 文字(值) { return String(值 ?? '').trim(); }
  function 轉義(值) {
    return String(值 ?? '').replace(/[&<>'"]/g, 字元 => ({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[字元]);
  }
  function 今天字串() {
    const 現在 = new Date();
    const 年 = 現在.getFullYear();
    const 月 = String(現在.getMonth() + 1).padStart(2, '0');
    const 日 = String(現在.getDate()).padStart(2, '0');
    return `${年}-${月}-${日}`;
  }
  function 是否測試資料(列) {
    const 合併 = [列.巡檢單號, 列.巡檢人工號, 列.巡檢人姓名, 列.裝置識別碼, 列.備註]
      .map(文字).join('｜');
    return 合併.includes('智慧5S自動驗收') ||
      合併.includes('SYSTEM-5S-TEST') ||
      合併.includes('SYSTEM-ACCEPTANCE') ||
      合併.includes('TEST_ONLY');
  }
  function 注入樣式() {
    if (document.getElementById('智慧5S巡檢覆蓋樣式')) return;
    const 樣式 = document.createElement('style');
    樣式.id = '智慧5S巡檢覆蓋樣式';
    樣式.textContent = `
      .巡檢覆蓋區{margin:0 0 18px;padding:18px;border-radius:24px;background:#fff;border:1px solid rgba(16,24,40,.08);box-shadow:0 14px 38px rgba(16,24,40,.07)}
      .巡檢覆蓋標題列{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.巡檢覆蓋標題列 h2{margin:0 0 4px;font-size:1.12rem;color:#18251f}.巡檢覆蓋標題列 p{margin:0;color:#667085;font-size:.78rem;line-height:1.5}.巡檢覆蓋版本{padding:5px 8px;border-radius:999px;background:#eef8f2;color:#176b47;font-weight:900;font-size:.7rem}
      .巡檢覆蓋摘要{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:14px}.巡檢覆蓋卡{padding:12px;border-radius:16px;background:#f7faf8;border:1px solid #e5ece8}.巡檢覆蓋卡 small{display:block;color:#667085;font-size:.69rem;font-weight:700}.巡檢覆蓋卡 b{display:block;margin-top:5px;font-size:1.35rem;color:#173f30}.巡檢覆蓋卡 span{display:block;margin-top:2px;color:#7a8580;font-size:.66rem}.巡檢覆蓋卡.危險{background:#fff1f0;border-color:#ffd5d1}.巡檢覆蓋卡.危險 b{color:#b42318}.巡檢覆蓋卡.警告{background:#fff8e9;border-color:#ffe5aa}.巡檢覆蓋卡.警告 b{color:#b54708}.巡檢覆蓋卡.正常{background:#eef9f2;border-color:#cfead9}.巡檢覆蓋卡.正常 b{color:#167647}
      .巡檢進度條{height:12px;border-radius:999px;background:#edf1ee;overflow:hidden;margin:2px 0 14px}.巡檢進度值{height:100%;border-radius:999px;background:linear-gradient(90deg,#1f9d65,#43c27f);transition:width .35s ease}.巡檢進度值.低{background:linear-gradient(90deg,#e0473e,#f17667)}.巡檢進度值.中{background:linear-gradient(90deg,#efa51f,#f7c24d)}
      .今日巡檢清單{display:grid;gap:8px}.今日巡檢項{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:10px;align-items:center;padding:11px 12px;border-radius:15px;border:1px solid #e8ece9;background:#fbfcfb}.今日巡檢項 strong{display:block;font-size:.86rem;color:#18251f}.今日巡檢項 small{display:block;margin-top:3px;color:#667085;font-size:.68rem}.今日巡檢狀態{text-align:center;padding:6px 8px;border-radius:999px;font-size:.72rem;font-weight:900}.今日巡檢狀態.完成{background:#eaf8ef;color:#167647}.今日巡檢狀態.待辦{background:#fff3df;color:#b54708}
      .巡檢覆蓋說明{margin-top:11px;padding:10px 12px;border-radius:14px;background:#f5f7f6;color:#68746e;font-size:.69rem;line-height:1.55}
      @media(max-width:720px){.巡檢覆蓋摘要{grid-template-columns:repeat(2,minmax(0,1fr))}.巡檢覆蓋區{padding:14px;border-radius:20px}}
    `;
    document.head.appendChild(樣式);
  }
  function 區域鍵(列) {
    return 文字(列.區域代碼 || 列.區域 || 列.區域名稱).replace(/\s+/g, '');
  }
  async function 讀取資料() {
    const 設定 = 全域.智慧5S設定;
    const 資料庫 = 全域.智慧5S資料庫;
    if (!設定 || !資料庫 || typeof 資料庫.讀取分頁 !== 'function') return null;
    const [區域結果, 巡檢結果] = await Promise.all([
      資料庫.讀取分頁(設定.分頁.區域主檔, 設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.巡檢主檔, 設定.讀取上限)
    ]);
    const 區域 = (Array.isArray(區域結果.資料) ? 區域結果.資料 : []).filter(列 => 文字(列.啟用) !== '否');
    const 巡檢 = (Array.isArray(巡檢結果.資料) ? 巡檢結果.資料 : []).filter(列 => !是否測試資料(列) && 文字(列.狀態) !== '作廢');
    return { 區域, 巡檢 };
  }
  function 計算(資料) {
    const 今天 = 今天字串();
    const 今日已巡鍵 = new Set();
    資料.巡檢.forEach(列 => {
      const 日期 = 文字(列.巡檢日期 || 列.送出時間 || 列.建立時間).slice(0, 10).replace(/\//g, '-');
      if (日期 !== 今天) return;
      const 鍵 = 區域鍵(列);
      if (鍵) 今日已巡鍵.add(鍵);
    });
    const 清單 = 資料.區域.map(列 => {
      const 代碼 = 文字(列.區域代碼);
      const 名稱 = 文字(列.區域名稱 || 代碼);
      const 頻率 = 文字(列.巡檢頻率 || '每日');
      const 已完成 = 今日已巡鍵.has(代碼.replace(/\s+/g, '')) || 今日已巡鍵.has(名稱.replace(/\s+/g, ''));
      return { 區域代碼: 代碼, 區域名稱: 名稱, 巡檢頻率: 頻率, 已完成 };
    });
    const 完成數 = 清單.filter(列 => 列.已完成).length;
    const 應巡數 = 清單.length;
    const 覆蓋率 = 應巡數 ? Math.round(完成數 / 應巡數 * 100) : 100;
    const 待巡數 = Math.max(0, 應巡數 - 完成數);
    return { 今天, 清單, 完成數, 應巡數, 覆蓋率, 待巡數 };
  }
  function 建立HTML(結果) {
    const 覆蓋類別 = 結果.覆蓋率 >= 90 ? '正常' : (結果.覆蓋率 >= 60 ? '警告' : '危險');
    const 進度類別 = 結果.覆蓋率 >= 90 ? '' : (結果.覆蓋率 >= 60 ? '中' : '低');
    const 清單HTML = 結果.清單.map(列 => `<div class="今日巡檢項"><div><strong>${轉義(列.區域名稱)}</strong><small>${轉義(列.區域代碼)}｜頻率：${轉義(列.巡檢頻率)}</small></div><span class="今日巡檢狀態 ${列.已完成 ? '完成' : '待辦'}">${列.已完成 ? '✓ 今日已巡' : '待巡檢'}</span></div>`).join('');
    return `<section id="智慧5S巡檢覆蓋" class="巡檢覆蓋區"><div class="巡檢覆蓋標題列"><div><h2>🧭 今日巡檢覆蓋</h2><p>直接確認今天哪些啟用區域已巡、哪些還在等待，不讓「沒有資料」變成管理黑洞。</p></div><span class="巡檢覆蓋版本">v${模組版本}</span></div><div class="巡檢覆蓋摘要"><div class="巡檢覆蓋卡"><small>啟用區域</small><b>${結果.應巡數}</b><span>目前納管區域</span></div><div class="巡檢覆蓋卡 正常"><small>今日已巡</small><b>${結果.完成數}</b><span>正式巡檢紀錄</span></div><div class="巡檢覆蓋卡 ${覆蓋類別}"><small>今日覆蓋率</small><b>${結果.覆蓋率}%</b><span>${轉義(結果.今天)}</span></div><div class="巡檢覆蓋卡 ${結果.待巡數 ? '警告' : '正常'}"><small>待巡檢區域</small><b>${結果.待巡數}</b><span>今日尚未完成</span></div></div><div class="巡檢進度條"><div class="巡檢進度值 ${進度類別}" style="width:${Math.max(0, Math.min(100, 結果.覆蓋率))}%"></div></div><div class="今日巡檢清單">${清單HTML || '<div class="巡檢覆蓋說明">目前沒有啟用區域。</div>'}</div><div class="巡檢覆蓋說明">系統只計算正式巡檢，會自動排除智慧5S自動驗收、SYSTEM-5S-TEST、SYSTEM-ACCEPTANCE、TEST_ONLY 與作廢紀錄。巡檢完成後，首頁會自動重新計算覆蓋率。</div></section>`;
  }
  async function 更新() {
    const 內容 = document.getElementById('頁面內容');
    const 首頁按鈕 = document.querySelector('.導航按鈕[data-頁面="首頁"].作用中');
    if (!內容 || !首頁按鈕) return;
    try {
      const 資料 = await 讀取資料();
      if (!資料) return;
      const 結果 = 計算(資料);
      const 舊 = document.getElementById('智慧5S巡檢覆蓋');
      if (舊) 舊.remove();
      const 容器 = document.createElement('div');
      容器.innerHTML = 建立HTML(結果);
      const 趨勢 = document.getElementById('智慧5S趨勢分析');
      if (趨勢 && 趨勢.parentNode) 趨勢.parentNode.insertBefore(容器.firstElementChild, 趨勢.nextSibling);
      else 內容.appendChild(容器.firstElementChild);
    } catch (錯誤) {
      console.warn('智慧5S巡檢覆蓋更新失敗', 錯誤);
    }
  }
  function 啟動() {
    注入樣式();
    setTimeout(更新, 1200);
    if (監看器) return;
    const 內容 = document.getElementById('頁面內容');
    if (!內容) return;
    監看器 = new MutationObserver(() => {
      clearTimeout(更新計時器);
      更新計時器 = setTimeout(更新, 450);
    });
    監看器.observe(內容, { childList: true, subtree: false });
    document.addEventListener('click', 事件 => {
      const 按鈕 = 事件.target.closest && 事件.target.closest('.導航按鈕[data-頁面="首頁"]');
      if (按鈕) setTimeout(更新, 700);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 啟動);
  else 啟動();
  全域.智慧5S巡檢覆蓋與今日任務 = Object.freeze({ 版本: 模組版本, 更新 });
})(window);
