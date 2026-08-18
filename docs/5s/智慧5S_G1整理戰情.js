(function (全域) {
  'use strict';

  const 模組版本 = '1.0.3';
  const 來源標記 = '5S整理實務表G1 20260812.xlsx';
  const 已結束紅牌狀態 = new Set(['已完成', '已結案', '作廢']);
  const 資料快取毫秒 = 30000;

  let 最近讀取時間 = 0;
  let 最近資料 = null;
  let 讀取中 = null;
  let 更新計時器 = null;

  function 文字(內容) {
    return String(內容 ?? '').trim();
  }

  function 數值(內容) {
    const 結果 = Number(內容);
    return Number.isFinite(結果) ? 結果 : 0;
  }

  function 轉義(內容) {
    return String(內容 ?? '').replace(/[&<>'"]/g, 字元 => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[字元]);
  }

  function 是否G1資料(列) {
    return 文字(列.備註).includes(來源標記);
  }

  function 是否有效紅牌(列) {
    return !已結束紅牌狀態.has(文字(列.案件狀態));
  }

  function 注入樣式() {
    if (document.getElementById('G1整理戰情樣式')) return;
    const 樣式 = document.createElement('style');
    樣式.id = 'G1整理戰情樣式';
    樣式.textContent = `
      .G1整理戰情區{margin-top:16px}
      .G1整理標題列{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:0 0 10px}
      .G1整理標題列 h2{margin:0;font-size:1.18rem}
      .G1整理標題列 p{margin:4px 0 0;color:var(--文字次要,#667085);font-size:.86rem}
      .G1版本標籤{font-size:.75rem;font-weight:800;padding:5px 9px;border-radius:999px;background:#e8f5ee;color:#176b47;white-space:nowrap}
      .G1統計網格{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .G1統計卡{position:relative;overflow:hidden;padding:15px;border:1px solid rgba(16,24,40,.08);border-radius:18px;background:var(--卡片背景,#fff);box-shadow:0 7px 24px rgba(16,24,40,.05)}
      .G1統計卡 small{display:block;color:var(--文字次要,#667085);font-weight:700}
      .G1統計卡 b{display:block;margin-top:4px;font-size:1.75rem;line-height:1.1}
      .G1統計卡 span{display:block;margin-top:7px;font-size:.78rem;color:var(--文字次要,#667085)}
      .G1統計卡.警示 b{color:#b54708}
      .G1統計卡.危險 b{color:#b42318}
      .G1區域卡{margin-top:10px;padding:14px;border-radius:18px;border:1px solid rgba(16,24,40,.08);background:var(--卡片背景,#fff)}
      .G1區域列{display:grid;grid-template-columns:minmax(0,1fr) 72px 88px;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid rgba(16,24,40,.07)}
      .G1區域列:last-child{border-bottom:0}
      .G1區域名稱{font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .G1區域數字{text-align:right;font-weight:900;font-variant-numeric:tabular-nums}
      .G1區域異常{text-align:right;font-size:.8rem;font-weight:800;color:#b54708}
      .G1盤點明細{margin-top:10px;border-radius:18px;border:1px solid rgba(16,24,40,.08);background:var(--卡片背景,#fff);overflow:hidden}
      .G1盤點明細 summary{cursor:pointer;list-style:none;padding:14px 16px;font-weight:900;display:flex;align-items:center;justify-content:space-between;gap:10px}
      .G1盤點明細 summary::-webkit-details-marker{display:none}
      .G1盤點清單{max-height:390px;overflow:auto;border-top:1px solid rgba(16,24,40,.08)}
      .G1盤點列{display:grid;grid-template-columns:76px minmax(0,1fr) 92px;gap:10px;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(16,24,40,.06)}
      .G1盤點列:last-child{border-bottom:0}
      .G1盤點編號{font-size:.78rem;font-weight:800;color:var(--文字次要,#667085)}
      .G1盤點物品{font-weight:800;min-width:0}
      .G1盤點物品 small{display:block;margin-top:3px;font-weight:500;color:var(--文字次要,#667085);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .G1判定{text-align:center;padding:5px 8px;border-radius:999px;font-size:.75rem;font-weight:900;background:#e8f5ee;color:#176b47}
      .G1判定.非必要{background:#fff1f0;color:#b42318}
      .G1判定.待判定{background:#fff8e6;color:#b54708}
      @media(max-width:760px){
        .G1統計網格{grid-template-columns:repeat(2,minmax(0,1fr))}
        .G1區域列{grid-template-columns:minmax(0,1fr) 58px 76px}
        .G1盤點列{grid-template-columns:68px minmax(0,1fr) 76px}
      }
    `;
    document.head.appendChild(樣式);
  }

  async function 讀取整理資料(強制更新) {
    const 現在 = Date.now();
    if (!強制更新 && 最近資料 && 現在 - 最近讀取時間 < 資料快取毫秒) return 最近資料;
    if (讀取中) return 讀取中;

    const 設定 = 全域.智慧5S設定;
    const 資料庫 = 全域.智慧5S資料庫;
    if (!設定 || !資料庫 || typeof 資料庫.讀取分頁 !== 'function') return null;

    讀取中 = Promise.all([
      資料庫.讀取分頁(設定.分頁.全物品盤點, 設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.紅牌追蹤, 設定.讀取上限)
    ]).then(([盤點結果, 紅牌結果]) => {
      const 全部盤點 = Array.isArray(盤點結果.資料) ? 盤點結果.資料 : [];
      const 全部紅牌 = Array.isArray(紅牌結果.資料) ? 紅牌結果.資料 : [];
      const G1盤點 = 全部盤點.filter(是否G1資料).sort((甲, 乙) => 文字(甲.盤點編號).localeCompare(文字(乙.盤點編號), 'zh-Hant-TW', { numeric: true }));
      const 有效紅牌 = 全部紅牌.filter(是否有效紅牌);
      const 必要品 = G1盤點.filter(列 => 文字(列.必要性判定) === '必要');
      const 非必要品 = G1盤點.filter(列 => 文字(列.必要性判定) === '非必要');
      const 待判定 = G1盤點.filter(列 => !['必要', '非必要'].includes(文字(列.必要性判定)));
      const 作廢紅牌 = 全部紅牌.filter(列 => 文字(列.案件狀態) === '作廢');
      const 區域統計映射 = new Map();

      G1盤點.forEach(列 => {
        const 區域代碼 = 文字(列.區域代碼) || 文字(列.位置) || '未分類';
        if (!區域統計映射.has(區域代碼)) {
          區域統計映射.set(區域代碼, { 區域代碼, 總數: 0, 非必要數: 0, 待判定數: 0 });
        }
        const 統計 = 區域統計映射.get(區域代碼);
        統計.總數 += 1;
        if (文字(列.必要性判定) === '非必要') 統計.非必要數 += 1;
        if (!['必要', '非必要'].includes(文字(列.必要性判定))) 統計.待判定數 += 1;
      });

      最近資料 = {
        G1盤點,
        全部紅牌,
        有效紅牌,
        必要品數: 必要品.length,
        非必要品數: 非必要品.length,
        待判定數: 待判定.length,
        作廢紅牌數: 作廢紅牌.length,
        區域統計: Array.from(區域統計映射.values()).sort((甲, 乙) => 乙.總數 - 甲.總數 || 甲.區域代碼.localeCompare(乙.區域代碼, 'zh-Hant-TW'))
      };
      最近讀取時間 = Date.now();
      return 最近資料;
    }).finally(() => {
      讀取中 = null;
    });

    return 讀取中;
  }

  function 建立統計卡(名稱, 數量, 說明, 類別) {
    return `<article class="G1統計卡 ${類別 || ''}"><small>${轉義(名稱)}</small><b>${轉義(數量)}</b><span>${轉義(說明)}</span></article>`;
  }

  function 建立區域內容(資料) {
    if (!資料.區域統計.length) return '<div style="padding:14px;color:#667085">尚無 G1 區域盤點資料</div>';
    return 資料.區域統計.map(列 => `
      <div class="G1區域列">
        <div class="G1區域名稱">${轉義(列.區域代碼)}</div>
        <div class="G1區域數字">${列.總數} 項</div>
        <div class="G1區域異常">${列.非必要數 ? `非必要 ${列.非必要數}` : (列.待判定數 ? `待判定 ${列.待判定數}` : '全數必要')}</div>
      </div>`).join('');
  }

  function 建立盤點明細(資料) {
    if (!資料.G1盤點.length) return '';
    const 明細 = 資料.G1盤點.map(列 => {
      const 判定 = 文字(列.必要性判定) || '待判定';
      const 說明 = [文字(列.位置), 文字(列.規格型號), 文字(列.備註).replace(`來源：${來源標記}`, '').replace(/^；|；$/g, '')].filter(Boolean).join('｜');
      return `<div class="G1盤點列">
        <div class="G1盤點編號">${轉義(列.盤點編號)}</div>
        <div class="G1盤點物品">${轉義(列.物品名稱 || '未命名物品')}<small>${轉義(說明 || '無補充說明')}</small></div>
        <div class="G1判定 ${轉義(判定)}">${轉義(判定)}</div>
      </div>`;
    }).join('');
    return `<details class="G1盤點明細"><summary><span>📦 查看 G1 全部 ${資料.G1盤點.length} 筆盤點</span><span>展開 ▾</span></summary><div class="G1盤點清單">${明細}</div></details>`;
  }

  function 建立戰情區塊(資料, 顯示明細) {
    return `<section id="G1整理戰情" class="G1整理戰情區">
      <div class="G1整理標題列">
        <div><h2>G1 整理戰情</h2><p>資料來源：5S整理實務表G1 20260812｜同步中央資料庫</p></div>
        <span class="G1版本標籤">智慧5S ${模組版本}</span>
      </div>
      <div class="G1統計網格">
        ${建立統計卡('盤點總數', 資料.G1盤點.length, '有效現場盤點', '')}
        ${建立統計卡('必要品', 資料.必要品數, '保留並依定位管理', '')}
        ${建立統計卡('非必要品', 資料.非必要品數, '應進入紅牌處置', 資料.非必要品數 ? '危險' : '')}
        ${建立統計卡('紅牌待處置', 資料.有效紅牌.length, `作廢歷史 ${資料.作廢紅牌數} 件`, 資料.有效紅牌.length ? '警示' : '')}
      </div>
      <div class="G1區域卡">
        <div style="font-weight:900;margin-bottom:4px">區域盤點分布</div>
        ${建立區域內容(資料)}
      </div>
      ${顯示明細 ? 建立盤點明細(資料) : ''}
    </section>`;
  }

  function 修正首頁紅牌數(資料) {
    document.querySelectorAll('.統計卡').forEach(卡片 => {
      const 名稱 = 文字(卡片.querySelector('.統計名稱')?.textContent);
      if (名稱 !== '紅牌待處置') return;
      const 數字 = 卡片.querySelector('.統計數值');
      const 趨勢 = 卡片.querySelector('.統計趨勢');
      if (數字) 數字.textContent = String(資料.有效紅牌.length);
      if (趨勢) 趨勢.textContent = 資料.有效紅牌.length ? '含作廢排除後的有效案件' : '目前無待處置案件';
    });
  }

  function 修正紅牌清單作廢顯示() {
    const 目前篩選 = 文字(document.querySelector('[data-紅牌篩選].作用中')?.textContent);
    if (!['未結案', '逾期'].includes(目前篩選)) return;
    document.querySelectorAll('[data-紅牌索引]').forEach(卡片 => {
      if (文字(卡片.textContent).includes('作廢')) 卡片.style.display = 'none';
    });
  }

  async function 更新目前頁面(強制更新) {
    const 標題 = 文字(document.getElementById('頁面標題')?.textContent);
    if (!['智慧 5S 戰情中心', '紅牌與物品盤點'].includes(標題)) return;

    try {
      const 資料 = await 讀取整理資料(Boolean(強制更新));
      if (!資料) return;
      const 內容 = document.getElementById('頁面內容');
      if (!內容) return;

      document.getElementById('G1整理戰情')?.remove();

      if (標題 === '智慧 5S 戰情中心') {
        修正首頁紅牌數(資料);
        const 統計網格 = 內容.querySelector('.統計網格');
        if (統計網格) 統計網格.insertAdjacentHTML('afterend', 建立戰情區塊(資料, false));
      }

      if (標題 === '紅牌與物品盤點') {
        修正紅牌清單作廢顯示();
        const 主視覺 = 內容.querySelector('.主視覺');
        if (主視覺) 主視覺.insertAdjacentHTML('afterend', 建立戰情區塊(資料, true));
      }
    } catch (錯誤) {
      console.warn('G1整理戰情模組更新失敗', 錯誤);
    }
  }

  function 排程更新(強制更新) {
    clearTimeout(更新計時器);
    更新計時器 = setTimeout(() => 更新目前頁面(Boolean(強制更新)), 80);
  }

  function 綁定更新事件() {
    document.addEventListener('click', 事件 => {
      if (事件.target.closest('[data-頁面], [data-紅牌篩選], [data-動作="更新紅牌"], [data-動作="重新整理首頁"]')) {
        if (事件.target.closest('[data-動作="更新紅牌"], [data-動作="重新整理首頁"]')) 最近讀取時間 = 0;
        排程更新(false);
      }
    }, true);

    const 觀察器 = new MutationObserver(變更清單 => {
      const 有頁面變更 = 變更清單.some(變更 => 變更.type === 'childList' && (變更.target.id === '頁面內容' || 變更.target.closest?.('#頁面內容')));
      if (有頁面變更) 排程更新(false);
    });

    const 頁面內容 = document.getElementById('頁面內容');
    if (頁面內容) 觀察器.observe(頁面內容, { childList: true, subtree: true });
    window.addEventListener('online', () => {
      最近讀取時間 = 0;
      排程更新(true);
    });
  }

  function 初始化() {
    注入樣式();
    綁定更新事件();
    排程更新(false);
    全域.智慧5S_G1整理戰情 = Object.freeze({
      版本: 模組版本,
      立即更新: () => {
        最近讀取時間 = 0;
        return 更新目前頁面(true);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化, { once: true });
  else 初始化();
})(window);
