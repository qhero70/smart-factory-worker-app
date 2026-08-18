(function (全域) {
  'use strict';

  const 模組版本 = '1.0.4';
  const 已結束狀態 = new Set(['已完成', '已結案', '作廢']);
  const 快取毫秒 = 30000;
  let 最近資料 = null;
  let 最近時間 = 0;
  let 讀取中 = null;
  let 更新計時器 = null;

  function 文字(值) {
    return String(值 ?? '').trim();
  }

  function 轉義(值) {
    return String(值 ?? '').replace(/[&<>'"]/g, 字元 => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[字元]);
  }

  function 是否測試資料(列) {
    const 合併 = [列.來源類型, 列.來源單號, 列.問題標題, 列.問題說明, 列.備註, 列.紅牌編號]
      .map(文字).join('｜');
    return 文字(列.來源類型) === '系統驗收' || 合併.includes('智慧5S自動驗收') || 合併.includes('TEST_ONLY');
  }

  function 解析日期(值) {
    if (!值) return null;
    if (值 instanceof Date && !Number.isNaN(值.getTime())) return 值;
    const 內容 = 文字(值).replace(/\//g, '-');
    const 符合 = 內容.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!符合) return null;
    return new Date(Number(符合[1]), Number(符合[2]) - 1, Number(符合[3]), 12, 0, 0);
  }

  function 日期差(起日, 迄日) {
    const 起 = new Date(起日.getFullYear(), 起日.getMonth(), 起日.getDate(), 12, 0, 0);
    const 迄 = new Date(迄日.getFullYear(), 迄日.getMonth(), 迄日.getDate(), 12, 0, 0);
    return Math.round((迄.getTime() - 起.getTime()) / 86400000);
  }

  function 是否未結案(狀態) {
    const 值 = 文字(狀態);
    return Boolean(值) && !已結束狀態.has(值);
  }

  function 注入樣式() {
    if (document.getElementById('智慧5S主管戰情樣式')) return;
    const 樣式 = document.createElement('style');
    樣式.id = '智慧5S主管戰情樣式';
    樣式.textContent = `
      .主管戰情區{margin:0 0 16px;padding:18px;border-radius:24px;background:linear-gradient(135deg,#103f30 0%,#176b47 58%,#20865d 100%);color:#fff;box-shadow:0 14px 38px rgba(17,83,59,.22);overflow:hidden;position:relative}
      .主管戰情區:after{content:'';position:absolute;width:190px;height:190px;border-radius:50%;right:-70px;top:-95px;background:rgba(255,255,255,.08)}
      .主管戰情標題列{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
      .主管戰情標題列 h2{font-size:1.2rem;margin:0 0 4px;color:#fff}.主管戰情標題列 p{margin:0;font-size:.82rem;color:rgba(255,255,255,.75)}
      .主管戰情版本{padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.14);font-size:.72rem;font-weight:800;white-space:nowrap}
      .主管KPI網格{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      .主管KPI卡{padding:13px;border-radius:17px;background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(8px)}
      .主管KPI卡 small{display:block;font-size:.73rem;color:rgba(255,255,255,.72);font-weight:700}.主管KPI卡 b{display:block;font-size:1.62rem;line-height:1.08;margin:5px 0 4px}.主管KPI卡 span{font-size:.7rem;color:rgba(255,255,255,.7)}
      .主管KPI卡.警告{background:rgba(255,174,60,.17)}.主管KPI卡.危險{background:rgba(255,84,84,.18)}
      .主管焦點卡{position:relative;z-index:1;margin-top:11px;padding:13px 14px;border-radius:17px;background:#fff;color:#16251f;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
      .主管焦點卡 strong{display:block;font-size:.92rem}.主管焦點卡 small{display:block;color:#667085;margin-top:4px;line-height:1.45}.主管焦點日數{min-width:74px;text-align:center;padding:9px;border-radius:14px;background:#edf7f1;color:#176b47;font-weight:900}.主管焦點日數.警告{background:#fff3df;color:#b54708}.主管焦點日數.危險{background:#fff0ef;color:#b42318}
      .紅牌期限列{margin-top:10px;border:1px solid rgba(16,24,40,.08);border-radius:18px;background:#fff;overflow:hidden}
      .紅牌期限標題{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;border-bottom:1px solid rgba(16,24,40,.07)}.紅牌期限標題 strong{font-size:.95rem}.紅牌期限標題 span{font-size:.75rem;color:#667085}
      .紅牌期限項{display:grid;grid-template-columns:84px minmax(0,1fr) 92px;gap:9px;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(16,24,40,.06)}.紅牌期限項:last-child{border-bottom:0}
      .紅牌期限編號{font-weight:900;font-size:.8rem;color:#176b47}.紅牌期限內容{font-weight:800;min-width:0}.紅牌期限內容 small{display:block;font-weight:500;color:#667085;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}.紅牌期限徽章{text-align:center;font-size:.74rem;font-weight:900;padding:6px 7px;border-radius:999px;background:#edf7f1;color:#176b47}.紅牌期限徽章.警告{background:#fff3df;color:#b54708}.紅牌期限徽章.危險{background:#fff0ef;color:#b42318}
      @media(max-width:760px){.主管KPI網格{grid-template-columns:repeat(2,minmax(0,1fr))}.主管戰情區{padding:15px;border-radius:20px}.紅牌期限項{grid-template-columns:72px minmax(0,1fr) 82px}}
    `;
    document.head.appendChild(樣式);
  }

  async function 讀取資料(強制) {
    const 現在毫秒 = Date.now();
    if (!強制 && 最近資料 && 現在毫秒 - 最近時間 < 快取毫秒) return 最近資料;
    if (讀取中) return 讀取中;

    const 設定 = 全域.智慧5S設定;
    const 資料庫 = 全域.智慧5S資料庫;
    if (!設定 || !資料庫 || typeof 資料庫.讀取分頁 !== 'function') return null;

    讀取中 = Promise.all([
      資料庫.讀取分頁(設定.分頁.紅牌追蹤, 設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.改善單, 設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.通知紀錄, 設定.讀取上限)
    ]).then(([紅牌結果, 改善結果, 通知結果]) => {
      const 紅牌全部 = Array.isArray(紅牌結果.資料) ? 紅牌結果.資料 : [];
      const 改善全部 = Array.isArray(改善結果.資料) ? 改善結果.資料 : [];
      const 通知全部 = Array.isArray(通知結果.資料) ? 通知結果.資料 : [];
      const 今天 = new Date();

      const 有效紅牌 = 紅牌全部.filter(列 => !是否測試資料(列) && 是否未結案(列.案件狀態));
      const 紅牌期限 = 有效紅牌.map(列 => {
        const 到期日 = 解析日期(列.預定處置日);
        const 剩餘天數 = 到期日 ? 日期差(今天, 到期日) : null;
        return Object.assign({}, 列, { 到期日物件: 到期日, 剩餘天數 });
      }).sort((甲, 乙) => {
        if (甲.剩餘天數 === null) return 1;
        if (乙.剩餘天數 === null) return -1;
        return 甲.剩餘天數 - 乙.剩餘天數;
      });

      const 已逾期 = 紅牌期限.filter(列 => 列.剩餘天數 !== null && 列.剩餘天數 < 0);
      const 七日內 = 紅牌期限.filter(列 => 列.剩餘天數 !== null && 列.剩餘天數 >= 0 && 列.剩餘天數 <= 7);
      const 改善未結案 = 改善全部.filter(列 => !是否測試資料(列) && 是否未結案(列.狀態));
      const 已發送通知 = 通知全部.filter(列 => 文字(列.狀態) === '已發送');

      最近資料 = {
        有效紅牌,
        紅牌期限,
        已逾期,
        七日內,
        改善未結案,
        已發送通知數: 已發送通知.length,
        最近通知: 已發送通知.slice().sort((甲, 乙) => 文字(乙.送出時間).localeCompare(文字(甲.送出時間))).slice(0, 1)[0] || null
      };
      最近時間 = Date.now();
      return 最近資料;
    }).catch(錯誤 => {
      console.warn('智慧5S主管戰情讀取失敗', 錯誤);
      return null;
    }).finally(() => { 讀取中 = null; });

    return 讀取中;
  }

  function 期限文字(天數) {
    if (天數 === null) return { 文字: '未設期限', 類別: '警告' };
    if (天數 < 0) return { 文字: `逾期 ${Math.abs(天數)} 天`, 類別: '危險' };
    if (天數 === 0) return { 文字: '今天到期', 類別: '危險' };
    if (天數 <= 7) return { 文字: `剩 ${天數} 天`, 類別: '警告' };
    return { 文字: `剩 ${天數} 天`, 類別: '' };
  }

  function 建立主管戰情(資料) {
    const 焦點 = 資料.紅牌期限[0];
    let 焦點內容 = '<div class="主管焦點卡"><div><strong>✅ 目前沒有待處置紅牌</strong><small>現場紅牌閉環狀態正常。</small></div><div class="主管焦點日數">正常</div></div>';
    if (焦點) {
      const 狀態 = 期限文字(焦點.剩餘天數);
      焦點內容 = `<div class="主管焦點卡"><div><strong>🎯 最近處置：${轉義(焦點.紅牌編號)}｜${轉義(焦點.物品名稱 || '未命名物品')}</strong><small>${轉義(焦點.區域 || 焦點.區域名稱 || '')}｜預定 ${轉義(焦點.預定處置日 || '未設定')}｜${轉義(焦點.處置建議 || 焦點.紅牌原因 || '')}</small></div><div class="主管焦點日數 ${狀態.類別}">${轉義(狀態.文字)}</div></div>`;
    }

    return `<section id="智慧5S主管戰情" class="主管戰情區">
      <div class="主管戰情標題列"><div><h2>📊 主管即時戰情</h2><p>紅牌期限、改善閉環與 LINE 通知健康度</p></div><span class="主管戰情版本">v${模組版本}</span></div>
      <div class="主管KPI網格">
        <div class="主管KPI卡"><small>待處置紅牌</small><b>${資料.有效紅牌.length}</b><span>真實現場案件</span></div>
        <div class="主管KPI卡 ${資料.七日內.length ? '警告' : ''}"><small>7日內到期</small><b>${資料.七日內.length}</b><span>需提前安排</span></div>
        <div class="主管KPI卡 ${資料.已逾期.length ? '危險' : ''}"><small>已逾期</small><b>${資料.已逾期.length}</b><span>需立即處理</span></div>
        <div class="主管KPI卡"><small>改善未結案</small><b>${資料.改善未結案.length}</b><span>已排除系統驗收</span></div>
      </div>${焦點內容}
    </section>`;
  }

  function 建立期限清單(資料) {
    if (!資料.紅牌期限.length) return '';
    const 項目 = 資料.紅牌期限.slice(0, 10).map(列 => {
      const 狀態 = 期限文字(列.剩餘天數);
      return `<div class="紅牌期限項"><div class="紅牌期限編號">${轉義(列.紅牌編號)}</div><div class="紅牌期限內容">${轉義(列.物品名稱 || '未命名物品')}<small>${轉義(列.區域 || 列.區域名稱 || '')}｜${轉義(列.預定處置日 || '未設期限')}</small></div><div class="紅牌期限徽章 ${狀態.類別}">${轉義(狀態.文字)}</div></div>`;
    }).join('');
    return `<section id="智慧5S紅牌期限清單" class="紅牌期限列"><div class="紅牌期限標題"><strong>⏱ 紅牌處置期限</strong><span>依最近到期排序</span></div>${項目}</section>`;
  }

  async function 更新畫面(強制) {
    const 內容 = document.getElementById('頁面內容');
    const 應用 = document.getElementById('應用程式');
    if (!內容 || !應用 || 應用.classList.contains('隱藏')) return;

    const 資料 = await 讀取資料(Boolean(強制));
    if (!資料) return;
    const 標題 = 文字(document.getElementById('頁面標題')?.textContent);

    if (標題.includes('戰情') || 標題.includes('首頁') || document.querySelector('[data-頁面="首頁"].作用中')) {
      document.getElementById('智慧5S主管戰情')?.remove();
      內容.insertAdjacentHTML('afterbegin', 建立主管戰情(資料));
    } else {
      document.getElementById('智慧5S主管戰情')?.remove();
    }

    if (標題.includes('紅牌') || document.querySelector('[data-頁面="紅牌"].作用中')) {
      document.getElementById('智慧5S紅牌期限清單')?.remove();
      內容.insertAdjacentHTML('afterbegin', 建立期限清單(資料));
    } else {
      document.getElementById('智慧5S紅牌期限清單')?.remove();
    }
  }

  function 排程更新() {
    clearTimeout(更新計時器);
    更新計時器 = setTimeout(() => 更新畫面(false), 120);
  }

  function 啟動監聽() {
    const 目標 = document.getElementById('應用程式');
    if (!目標) return;
    const 觀察器 = new MutationObserver(變更 => {
      const 只有自有節點 = 變更.every(項 => Array.from(項.addedNodes).concat(Array.from(項.removedNodes)).every(節點 => {
        if (!(節點 instanceof Element)) return true;
        return 節點.id === '智慧5S主管戰情' || 節點.id === '智慧5S紅牌期限清單' || 節點.closest?.('#智慧5S主管戰情,#智慧5S紅牌期限清單');
      }));
      if (!只有自有節點) 排程更新();
    });
    觀察器.observe(目標, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  function 初始化() {
    注入樣式();
    啟動監聽();
    更新畫面(true);
    window.addEventListener('online', () => 更新畫面(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) 更新畫面(true); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化, { once: true });
  else 初始化();

  全域.智慧5S主管戰情 = Object.freeze({ 版本: 模組版本, 更新: () => 更新畫面(true), 讀取資料: () => 讀取資料(true) });
})(window);
