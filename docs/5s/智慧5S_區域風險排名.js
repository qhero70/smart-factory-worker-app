(function (全域) {
  'use strict';

  const 模組版本 = '1.0.5';
  const 快取毫秒 = 45000;
  const 已結束改善狀態 = new Set(['已完成', '已結案', '作廢']);
  const 已結束紅牌狀態 = new Set(['已完成', '已結案', '已處置', '作廢']);
  let 最近資料 = null;
  let 最近讀取時間 = 0;
  let 讀取中 = null;
  let 監看器 = null;
  let 更新計時器 = null;

  function 文字(值) {
    return String(值 ?? '').trim();
  }

  function 數字(值, 預設值) {
    const 數值 = Number(String(值 ?? '').replace(/%/g, '').trim());
    return Number.isFinite(數值) ? 數值 : 預設值;
  }

  function 轉義(值) {
    return String(值 ?? '').replace(/[&<>'"]/g, 字元 => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[字元]);
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

  function 是否測試資料(列) {
    const 合併 = [
      列.來源類型, 列.來源單號, 列.問題標題, 列.問題說明, 列.備註,
      列.紅牌編號, 列.巡檢單號, 列.巡檢人工號, 列.巡檢人姓名, 列.裝置識別碼
    ].map(文字).join('｜');
    return 文字(列.來源類型) === '系統驗收' ||
      合併.includes('智慧5S自動驗收') ||
      合併.includes('TEST_ONLY') ||
      合併.includes('SYSTEM-5S-TEST') ||
      合併.includes('SYSTEM-ACCEPTANCE');
  }

  function 是否有效改善(列) {
    return !是否測試資料(列) && !已結束改善狀態.has(文字(列.狀態));
  }

  function 是否已結改善(列) {
    return !是否測試資料(列) && 已結束改善狀態.has(文字(列.狀態)) && 文字(列.狀態) !== '作廢';
  }

  function 是否有效紅牌(列) {
    return !是否測試資料(列) && !已結束紅牌狀態.has(文字(列.案件狀態));
  }

  function 正規區域鍵(列) {
    return 文字(列.區域代碼 || 列.區域 || 列.區域名稱).replace(/\s+/g, '');
  }

  function 注入樣式() {
    if (document.getElementById('智慧5S區域風險排名樣式')) return;
    const 樣式 = document.createElement('style');
    樣式.id = '智慧5S區域風險排名樣式';
    樣式.textContent = `
      .區域風險戰情{margin:0 0 18px;padding:18px;border-radius:24px;background:#fff;border:1px solid rgba(16,24,40,.08);box-shadow:0 14px 38px rgba(16,24,40,.08)}
      .區域風險標題列{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
      .區域風險標題列 h2{margin:0 0 4px;font-size:1.12rem;color:#18251f}.區域風險標題列 p{margin:0;color:#667085;font-size:.79rem;line-height:1.5}
      .區域風險摘要{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:14px}
      .區域風險摘要卡{padding:12px;border-radius:16px;background:#f7faf8;border:1px solid #e7eee9}.區域風險摘要卡 small{display:block;color:#667085;font-weight:700;font-size:.7rem}.區域風險摘要卡 b{display:block;margin-top:4px;font-size:1.38rem;color:#173f30}.區域風險摘要卡 span{font-size:.67rem;color:#7b8781}
      .區域風險摘要卡.紅{background:#fff1f0;border-color:#ffd5d1}.區域風險摘要卡.紅 b{color:#b42318}.區域風險摘要卡.黃{background:#fff8e9;border-color:#ffe5aa}.區域風險摘要卡.黃 b{color:#b54708}.區域風險摘要卡.綠{background:#eef9f2;border-color:#cfead9}.區域風險摘要卡.綠 b{color:#167647}
      .主管優先處理{margin-bottom:14px;padding:13px 14px;border-radius:17px;background:linear-gradient(135deg,#fff5e7,#fffaf1);border:1px solid #f7dfb3;display:flex;align-items:center;justify-content:space-between;gap:12px}.主管優先處理 strong{display:block;font-size:.9rem;color:#7a3e00}.主管優先處理 small{display:block;margin-top:4px;color:#8a6d49;line-height:1.45}.主管優先徽章{padding:7px 10px;border-radius:999px;background:#fff;color:#b54708;font-weight:900;font-size:.75rem;white-space:nowrap;border:1px solid #f2d39a}
      .區域排名表{display:grid;gap:9px}.區域排名列{display:grid;grid-template-columns:44px minmax(0,1.25fr) 88px 94px 92px 88px;gap:8px;align-items:center;padding:11px 12px;border-radius:16px;border:1px solid #e8ece9;background:#fbfcfb}.區域排名列.紅{background:#fff8f7;border-color:#ffd8d4}.區域排名列.黃{background:#fffdf8;border-color:#f8e7bf}.區域排名列.綠{background:#f8fcf9;border-color:#dceee3}
      .區域名次{width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;background:#eef3f0;color:#315b49}.區域排名列:nth-child(1) .區域名次{background:#fff1bf;color:#8a5b00}.區域排名列:nth-child(2) .區域名次{background:#edf0f2;color:#5d6870}.區域排名列:nth-child(3) .區域名次{background:#f4e7dc;color:#8a5730}
      .區域名稱欄{min-width:0}.區域名稱欄 strong{display:block;font-size:.88rem;color:#18251f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.區域名稱欄 small{display:block;margin-top:3px;color:#667085;font-size:.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .區域指標{text-align:center}.區域指標 small{display:block;color:#7a8580;font-size:.66rem;margin-bottom:2px}.區域指標 b{font-size:.82rem;color:#263c32}.區域指標 .未建立{color:#b54708}
      .風險燈{display:flex;align-items:center;justify-content:center;gap:6px;font-size:.73rem;font-weight:900}.風險燈點{width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 4px rgba(0,0,0,.04)}.風險燈.紅{color:#b42318}.風險燈.紅 .風險燈點{background:#e43f36}.風險燈.黃{color:#b54708}.風險燈.黃 .風險燈點{background:#f6b51b}.風險燈.綠{color:#167647}.風險燈.綠 .風險燈點{background:#27a765}
      .區域排名說明{margin-top:11px;padding:10px 12px;border-radius:14px;background:#f5f7f6;color:#68746e;font-size:.69rem;line-height:1.55}
      @media(max-width:860px){.區域風險摘要{grid-template-columns:repeat(2,minmax(0,1fr))}.區域排名列{grid-template-columns:38px minmax(0,1fr) 78px 78px}.區域排名列 .區域指標:nth-of-type(3),.區域排名列 .區域指標:nth-of-type(4){display:none}}
      @media(max-width:520px){.區域風險戰情{padding:14px;border-radius:20px}.區域排名列{grid-template-columns:34px minmax(0,1fr) 70px;gap:6px}.區域排名列 .區域指標{display:none}.區域排名列 .風險燈{display:flex}.主管優先處理{align-items:flex-start;flex-direction:column}.主管優先徽章{align-self:flex-start}}
    `;
    document.head.appendChild(樣式);
  }

  function 建立區域對照(區域清單) {
    const 對照 = new Map();
    區域清單.filter(列 => 文字(列.啟用) !== '否').forEach(列 => {
      const 代碼 = 文字(列.區域代碼);
      const 名稱 = 文字(列.區域名稱 || 代碼);
      const 資料 = {
        區域代碼: 代碼,
        區域名稱: 名稱,
        部門: 文字(列.部門),
        巡檢頻率: 文字(列.巡檢頻率),
        最新得分率: null,
        最新巡檢日期: '',
        未結改善: 0,
        已結改善: 0,
        改善完成率: 100,
        待處置紅牌: 0,
        七日內紅牌: 0,
        逾期紅牌: 0,
        管理分數: 0,
        風險層級: '黃',
        風險說明: []
      };
      對照.set(代碼, 資料);
      對照.set(代碼.replace(/\s+/g, ''), 資料);
      對照.set(名稱, 資料);
      對照.set(名稱.replace(/\s+/g, ''), 資料);
    });
    return 對照;
  }

  function 找區域(對照, 列) {
    const 候選 = [列.區域代碼, 列.區域, 列.區域名稱].map(文字).filter(Boolean);
    for (const 值 of 候選) {
      if (對照.has(值)) return 對照.get(值);
      const 無空白 = 值.replace(/\s+/g, '');
      if (對照.has(無空白)) return 對照.get(無空白);
    }
    return null;
  }

  function 計算區域資料(區域清單, 巡檢清單, 改善清單, 紅牌清單) {
    const 對照 = 建立區域對照(區域清單);
    const 唯一區域 = Array.from(new Set(Array.from(對照.values())));
    const 今天 = new Date();

    const 有效巡檢 = 巡檢清單.filter(列 => !是否測試資料(列) && 文字(列.狀態) !== '作廢');
    有效巡檢.forEach(列 => {
      const 區域 = 找區域(對照, 列);
      if (!區域) return;
      const 日期 = 解析日期(列.巡檢日期 || 列.送出時間 || 列.建立時間);
      const 原日期 = 解析日期(區域.最新巡檢日期);
      if (!區域.最新巡檢日期 || (日期 && (!原日期 || 日期.getTime() >= 原日期.getTime()))) {
        區域.最新得分率 = 數字(列.得分率, null);
        區域.最新巡檢日期 = 文字(列.巡檢日期 || 列.送出時間 || 列.建立時間);
      }
    });

    改善清單.forEach(列 => {
      if (是否測試資料(列)) return;
      const 區域 = 找區域(對照, 列);
      if (!區域) return;
      if (是否有效改善(列)) 區域.未結改善 += 1;
      else if (是否已結改善(列)) 區域.已結改善 += 1;
    });

    紅牌清單.forEach(列 => {
      if (!是否有效紅牌(列)) return;
      const 區域 = 找區域(對照, 列);
      if (!區域) return;
      區域.待處置紅牌 += 1;
      const 到期 = 解析日期(列.預定處置日);
      if (!到期) return;
      const 天數 = 日期差(今天, 到期);
      if (天數 < 0) 區域.逾期紅牌 += 1;
      else if (天數 <= 7) 區域.七日內紅牌 += 1;
    });

    唯一區域.forEach(區域 => {
      const 改善總數 = 區域.未結改善 + 區域.已結改善;
      區域.改善完成率 = 改善總數 > 0 ? Math.round((區域.已結改善 / 改善總數) * 100) : 100;

      let 扣分 = 0;
      區域.風險說明 = [];
      if (區域.最新得分率 === null) {
        扣分 += 20;
        區域.風險說明.push('尚無正式巡檢基準');
      } else if (區域.最新得分率 < 85) {
        const 低分扣分 = Math.min(30, Math.round((85 - 區域.最新得分率) * 1.2));
        扣分 += 低分扣分;
        區域.風險說明.push(`巡檢 ${Math.round(區域.最新得分率)} 分`);
      }

      if (區域.未結改善 > 0) {
        扣分 += Math.min(32, 區域.未結改善 * 16);
        區域.風險說明.push(`未結改善 ${區域.未結改善} 件`);
      }
      if (區域.待處置紅牌 > 0) {
        扣分 += Math.min(24, 區域.待處置紅牌 * 8);
        區域.風險說明.push(`待處置紅牌 ${區域.待處置紅牌} 件`);
      }
      if (區域.七日內紅牌 > 0) {
        扣分 += Math.min(24, 區域.七日內紅牌 * 12);
        區域.風險說明.push(`7日內到期 ${區域.七日內紅牌} 件`);
      }
      if (區域.逾期紅牌 > 0) {
        扣分 += Math.min(60, 區域.逾期紅牌 * 40);
        區域.風險說明.push(`逾期紅牌 ${區域.逾期紅牌} 件`);
      }

      區域.管理分數 = Math.max(0, 100 - 扣分);
      if (區域.逾期紅牌 > 0 || (區域.最新得分率 !== null && 區域.最新得分率 < 70) || 區域.管理分數 < 60) {
        區域.風險層級 = '紅';
      } else if (區域.未結改善 > 0 || 區域.待處置紅牌 > 0 || 區域.最新得分率 === null || (區域.最新得分率 !== null && 區域.最新得分率 < 85) || 區域.管理分數 < 85) {
        區域.風險層級 = '黃';
      } else {
        區域.風險層級 = '綠';
      }
      if (!區域.風險說明.length) 區域.風險說明.push('目前無待辦風險');
    });

    return 唯一區域.sort((甲, 乙) => {
      if (乙.管理分數 !== 甲.管理分數) return 乙.管理分數 - 甲.管理分數;
      if (甲.逾期紅牌 !== 乙.逾期紅牌) return 甲.逾期紅牌 - 乙.逾期紅牌;
      return 甲.區域名稱.localeCompare(乙.區域名稱, 'zh-Hant');
    });
  }

  async function 讀取資料(強制) {
    const 現在 = Date.now();
    if (!強制 && 最近資料 && 現在 - 最近讀取時間 < 快取毫秒) return 最近資料;
    if (讀取中) return 讀取中;

    const 設定 = 全域.智慧5S設定;
    const 資料庫 = 全域.智慧5S資料庫;
    if (!設定 || !資料庫 || typeof 資料庫.讀取分頁 !== 'function') return null;

    讀取中 = Promise.all([
      資料庫.讀取分頁(設定.分頁.區域主檔, 設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.巡檢主檔, 設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.改善單, 設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.紅牌追蹤, 設定.讀取上限)
    ]).then(([區域結果, 巡檢結果, 改善結果, 紅牌結果]) => {
      const 區域清單 = Array.isArray(區域結果.資料) ? 區域結果.資料 : [];
      const 巡檢清單 = Array.isArray(巡檢結果.資料) ? 巡檢結果.資料 : [];
      const 改善清單 = Array.isArray(改善結果.資料) ? 改善結果.資料 : [];
      const 紅牌清單 = Array.isArray(紅牌結果.資料) ? 紅牌結果.資料 : [];
      const 區域排名 = 計算區域資料(區域清單, 巡檢清單, 改善清單, 紅牌清單);
      const 紅區 = 區域排名.filter(列 => 列.風險層級 === '紅');
      const 黃區 = 區域排名.filter(列 => 列.風險層級 === '黃');
      const 綠區 = 區域排名.filter(列 => 列.風險層級 === '綠');
      const 最需處理 = 區域排名.slice().sort((甲, 乙) => {
        const 等級 = { 紅: 3, 黃: 2, 綠: 1 };
        if (等級[乙.風險層級] !== 等級[甲.風險層級]) return 等級[乙.風險層級] - 等級[甲.風險層級];
        return 甲.管理分數 - 乙.管理分數;
      })[0] || null;

      最近資料 = { 區域排名, 紅區, 黃區, 綠區, 最需處理 };
      最近讀取時間 = Date.now();
      return 最近資料;
    }).catch(錯誤 => {
      console.warn('智慧5S區域風險排名讀取失敗', 錯誤);
      return null;
    }).finally(() => {
      讀取中 = null;
    });

    return 讀取中;
  }

  function 建立排名內容(資料) {
    if (!資料 || !資料.區域排名.length) {
      return `<section id="智慧5S區域風險排名" class="區域風險戰情"><div class="區域風險標題列"><div><h2>🚦 區域5S風險排名</h2><p>目前沒有可計算的啟用區域。</p></div></div></section>`;
    }

    const 優先 = 資料.最需處理;
    const 優先內容 = 優先
      ? `<div class="主管優先處理"><div><strong>🎯 主管優先處理：${轉義(優先.區域名稱)}</strong><small>${轉義(優先.風險說明.join('｜'))}</small></div><span class="主管優先徽章">${轉義(優先.風險層級)}燈｜${優先.管理分數} 分</span></div>`
      : '';

    const 排名列 = 資料.區域排名.map((區域, 索引) => {
      const 巡檢文字 = 區域.最新得分率 === null ? '<span class="未建立">待巡檢</span>' : `${Math.round(區域.最新得分率)}%`;
      return `<div class="區域排名列 ${區域.風險層級}">
        <div class="區域名次">${索引 + 1}</div>
        <div class="區域名稱欄"><strong>${轉義(區域.區域名稱)}</strong><small>${轉義(區域.區域代碼)}｜${轉義(區域.風險說明.join('、'))}</small></div>
        <div class="風險燈 ${區域.風險層級}"><span class="風險燈點"></span>${區域.風險層級}燈</div>
        <div class="區域指標"><small>管理分數</small><b>${區域.管理分數}</b></div>
        <div class="區域指標"><small>巡檢得分</small><b>${巡檢文字}</b></div>
        <div class="區域指標"><small>改善完成率</small><b>${區域.改善完成率}%</b></div>
      </div>`;
    }).join('');

    return `<section id="智慧5S區域風險排名" class="區域風險戰情">
      <div class="區域風險標題列"><div><h2>🚦 區域5S風險排名</h2><p>即時整合巡檢、改善單、紅牌期限，自動判斷主管處理優先順序。</p></div><span class="主管戰情版本">v${模組版本}</span></div>
      <div class="區域風險摘要">
        <div class="區域風險摘要卡"><small>啟用區域</small><b>${資料.區域排名.length}</b><span>納入即時風險計算</span></div>
        <div class="區域風險摘要卡 紅"><small>紅燈區域</small><b>${資料.紅區.length}</b><span>需主管立即介入</span></div>
        <div class="區域風險摘要卡 黃"><small>黃燈區域</small><b>${資料.黃區.length}</b><span>有待辦或尚未巡檢</span></div>
        <div class="區域風險摘要卡 綠"><small>綠燈區域</small><b>${資料.綠區.length}</b><span>目前風險受控</span></div>
      </div>
      ${優先內容}
      <div class="區域排名表">${排名列}</div>
      <div class="區域排名說明">計分規則：正式巡檢低於 85 分、未結改善、待處置紅牌、7 日內到期與逾期紅牌皆會扣除管理分數。尚未有正式巡檢的區域先列黃燈，不會因「沒有資料」被誤判為綠燈。測試與系統驗收資料自動排除。</div>
    </section>`;
  }

  function 是否首頁() {
    const 內容 = document.getElementById('頁面內容');
    if (!內容) return false;
    const 標題 = 文字(document.getElementById('頁面標題')?.textContent);
    const 作用中 = document.querySelector('.導航按鈕.作用中');
    return 標題.includes('戰情') || 文字(作用中?.dataset?.頁面) === '首頁';
  }

  async function 注入排名(強制) {
    if (!是否首頁()) return;
    const 內容 = document.getElementById('頁面內容');
    if (!內容) return;
    const 資料 = await 讀取資料(Boolean(強制));
    if (!資料 || !是否首頁()) return;

    const 舊 = document.getElementById('智慧5S區域風險排名');
    if (舊) 舊.remove();
    const 容器 = document.createElement('div');
    容器.innerHTML = 建立排名內容(資料);
    const 節點 = 容器.firstElementChild;
    const 主管戰情 = document.getElementById('智慧5S主管戰情');
    if (主管戰情 && 主管戰情.parentNode === 內容) {
      主管戰情.insertAdjacentElement('afterend', 節點);
    } else {
      內容.insertBefore(節點, 內容.firstChild);
    }
  }

  function 啟動監看() {
    if (監看器) return;
    const 內容 = document.getElementById('頁面內容');
    if (!內容) return;
    let 延遲器 = null;
    監看器 = new MutationObserver(() => {
      clearTimeout(延遲器);
      延遲器 = setTimeout(() => 注入排名(false), 180);
    });
    監看器.observe(內容, { childList: true, subtree: false });
  }

  function 啟動() {
    注入樣式();
    啟動監看();
    setTimeout(() => 注入排名(true), 900);
    document.addEventListener('click', 事件 => {
      const 按鈕 = 事件.target.closest?.('.導航按鈕');
      if (按鈕 && 文字(按鈕.dataset.頁面) === '首頁') setTimeout(() => 注入排名(true), 350);
    });
    window.addEventListener('online', () => 注入排名(true));
    if (!更新計時器) 更新計時器 = setInterval(() => 注入排名(true), 120000);
  }

  全域.智慧5S區域風險排名 = Object.freeze({
    版本: 模組版本,
    讀取資料,
    注入排名,
    重新整理: () => 注入排名(true)
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 啟動);
  else 啟動();
})(window);
