(function (全域) {
  'use strict';

  const 模組版本 = '1.1.0';
  const 系統版本 = '1.3.7';
  const 文件前綴 = 'FM-3-001-02-P';
  const 注入識別 = '日常點檢改善整合區';
  const 樣式識別 = '日常點檢改善整合樣式';
  const 文件圖集網址 = 'https://drive.google.com/thumbnail?id=1YIDQ1xQSfNWeXV-dbj9IWulXGoU0mw8Q&sz=w480';
  const 圖集總格數 = 22;

  const 狀態 = {
    資料: null,
    錯誤: '',
    載入中: false,
    篩選: '全部',
    觀察器: null,
    計時器: null
  };

  function 文字(值) {
    return String(值 == null ? '' : 值).trim();
  }

  function 轉義(值) {
    return 文字(值).replace(/[&<>"']/g, 字 => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[字]));
  }

  function 設定() {
    return 全域.智慧5S設定 || {};
  }

  function 資料庫() {
    return 全域.智慧5S資料庫 || null;
  }

  function 資料表名稱() {
    const 設 = 設定();
    return 設.分頁 && 設.分頁.標準對照卡 ? 設.分頁.標準對照卡 : '5S_標準對照卡';
  }

  function 是否啟用(列) {
    return 文字(列.啟用) !== '否';
  }

  function 文件頁碼(列) {
    const 編號 = 文字(列.對照卡編號);
    const 配對 = 編號.match(/-P(\d{2})$/i);
    return 配對 ? Number(配對[1]) : 999;
  }

  function 區域群組(列) {
    const 代碼 = 文字(列.區域代碼);
    if (代碼.startsWith('A9')) return 'A9';
    if (代碼.startsWith('A5')) return 'A5';
    if (代碼.startsWith('B9')) return 'B9';
    if (代碼.startsWith('B3')) return 'B3';
    if (代碼.includes('掃具')) return '掃具';
    return '其他';
  }

  function 解析圖集參照(來源) {
    const 參照 = 文字(來源);
    const 配對 = 參照.match(/^圖集:P(\d{2}):(改善前|改善後|標準)$/);
    if (!配對) return null;

    const 頁碼 = Number(配對[1]);
    const 類型 = 配對[2];
    let 索引 = -1;

    if (頁碼 >= 2 && 頁碼 <= 5) {
      索引 = (頁碼 - 2) * 2 + (類型 === '改善後' ? 1 : 0);
    } else if (頁碼 >= 6 && 頁碼 <= 17) {
      索引 = 8 + (頁碼 - 6);
    } else if (頁碼 === 18) {
      索引 = 類型 === '改善後' ? 21 : 20;
    }

    if (索引 < 0 || 索引 >= 圖集總格數) return null;
    return { 頁碼, 類型, 索引 };
  }

  function 圖集位置百分比(索引) {
    if (索引 <= 0) return '0%';
    if (索引 >= 圖集總格數 - 1) return '100%';
    return `${((索引 / (圖集總格數 - 1)) * 100).toFixed(4)}%`;
  }

  function 圖片背景樣式(來源) {
    const 圖集 = 解析圖集參照(來源);
    if (圖集) {
      return `background-image:url('${文件圖集網址}');background-size:100% ${圖集總格數 * 100}%;background-position:center ${圖集位置百分比(圖集.索引)};background-repeat:no-repeat;`;
    }
    const 直接網址 = 文字(來源).replace(/'/g, '%27');
    return `background-image:url('${直接網址}');background-size:cover;background-position:center center;background-repeat:no-repeat;`;
  }

  async function 讀取文件資料(強制) {
    if (!強制 && Array.isArray(狀態.資料)) return 狀態.資料;

    if (狀態.載入中) {
      return new Promise(完成 => {
        const 等待 = setInterval(() => {
          if (!狀態.載入中) {
            clearInterval(等待);
            完成(Array.isArray(狀態.資料) ? 狀態.資料 : []);
          }
        }, 60);
      });
    }

    狀態.載入中 = true;
    狀態.錯誤 = '';

    try {
      const 庫 = 資料庫();
      if (!庫 || typeof 庫.讀取分頁 !== 'function') {
        throw new Error('中央資料庫模組尚未就緒');
      }

      const 回傳 = await 庫.讀取分頁(資料表名稱(), 設定().讀取上限 || 5000);
      狀態.資料 = (Array.isArray(回傳 && 回傳.資料) ? 回傳.資料 : [])
        .filter(列 => 文字(列.對照卡編號).startsWith(文件前綴) && 是否啟用(列))
        .sort((甲, 乙) => 文件頁碼(甲) - 文件頁碼(乙));
      return 狀態.資料;
    } catch (錯誤) {
      狀態.錯誤 = 文字(錯誤 && 錯誤.message ? 錯誤.message : 錯誤) || '資料讀取失敗';
      狀態.資料 = [];
      return [];
    } finally {
      狀態.載入中 = false;
    }
  }

  function 注入樣式() {
    if (document.getElementById(樣式識別)) return;

    const 樣式 = document.createElement('style');
    樣式.id = 樣式識別;
    樣式.textContent = `
      .文件5S區{display:grid;gap:12px;margin-top:14px}
      .文件5S英雄{background:linear-gradient(135deg,#0f5135,#198a5c 63%,#7a244a);color:#fff;border-radius:22px;padding:16px;box-shadow:0 10px 28px rgba(18,73,50,.13)}
      .文件5S英雄 h3{margin:0 0 5px;font-size:1.08rem}.文件5S英雄 p{margin:0;line-height:1.55;color:rgba(255,255,255,.86);font-size:.78rem}.文件5S英雄 small{display:block;margin-top:8px;color:rgba(255,255,255,.72);font-weight:800}
      .文件5SKPI{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.文件5SKPI article{background:#fff;border:1px solid #e0e9e4;border-radius:17px;padding:12px}.文件5SKPI small{display:block;color:#74827a;font-weight:800}.文件5SKPI b{display:block;margin-top:3px;font-size:1.35rem;color:#173f2f}.文件5SKPI span{display:block;margin-top:2px;color:#829087;font-size:.68rem}
      .文件5S篩選{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding:2px 0}.文件5S篩選::-webkit-scrollbar{display:none}.文件5S篩選 button{flex:0 0 auto;min-height:44px;border:1px solid #dce7e1;border-radius:999px;background:#fff;color:#365345;padding:8px 14px;font-weight:900}.文件5S篩選 button.作用中{background:#176b47;color:#fff;border-color:#176b47}
      .文件5S網格{display:grid;grid-template-columns:1fr;gap:11px}.文件5S卡{background:#fff;border:1px solid #dfe8e3;border-radius:20px;overflow:hidden;box-shadow:0 8px 22px rgba(24,65,47,.05)}.文件5S卡頭{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:13px 13px 9px}.文件5S卡頭 h4{margin:0;color:#183f30;font-size:.98rem}.文件5S卡頭 p{margin:3px 0 0;color:#7a8780;font-size:.7rem}.文件5S頁碼{flex:0 0 auto;border-radius:999px;background:#eef7f2;color:#176b47;padding:5px 8px;font-size:.65rem;font-weight:900}
      .文件5S照片雙欄{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e5ebe7}.文件5S照片單欄{display:grid;grid-template-columns:1fr}.文件5S圖框{position:relative;background:#edf2ef;aspect-ratio:4/3;overflow:hidden;cursor:zoom-in}.文件5S圖背景{position:absolute;inset:0}.文件5S圖標{position:absolute;left:7px;top:7px;border-radius:999px;padding:4px 7px;background:rgba(17,53,38,.82);color:#fff;font-size:.64rem;font-weight:900}.文件5S圖標.前{background:rgba(135,55,45,.86)}
      .文件5S內容{padding:12px 13px 14px}.文件5S說明{display:grid;gap:6px}.文件5S說明 div{font-size:.76rem;line-height:1.5;color:#4f6258}.文件5S說明 b{color:#173f2f}.文件5S追蹤{margin-top:9px;padding:9px 10px;border-radius:12px;background:#fff3e6;color:#9d551a;font-size:.7rem;line-height:1.45;font-weight:800}.文件5S來源{margin-top:8px;color:#8a958f;font-size:.65rem}.文件5S錯誤{padding:12px;border-radius:15px;background:#fff4ec;border:1px solid #f0d6c0;color:#99501f;font-size:.76rem}
      .文件5S燈箱{position:fixed;inset:0;z-index:99999;background:rgba(10,22,16,.92);display:flex;align-items:center;justify-content:center;padding:16px}.文件5S燈箱.隱藏{display:none}.文件5S燈箱框{position:relative;width:min(94vw,900px);aspect-ratio:4/3;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 18px 50px rgba(0,0,0,.32)}.文件5S燈箱圖{position:absolute;inset:0}.文件5S燈箱 button{position:absolute;z-index:2;right:16px;top:max(16px,env(safe-area-inset-top));width:48px;height:48px;border:0;border-radius:50%;background:#fff;color:#173f2f;font-size:26px;font-weight:900;box-shadow:0 5px 18px rgba(0,0,0,.2)}
      @media(min-width:760px){.文件5SKPI{grid-template-columns:repeat(4,minmax(0,1fr))}.文件5S網格{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(樣式);
  }

  function 圖片HTML(來源, 標籤, 類別) {
    const src = 文字(來源);
    if (!src) return '';
    return `<div class="文件5S圖框" data-文件照片="${轉義(src)}" role="button" tabindex="0" aria-label="放大${轉義(標籤)}"><div class="文件5S圖背景" style="${圖片背景樣式(src)}"></div><span class="文件5S圖標 ${類別 || ''}">${轉義(標籤)}</span></div>`;
  }

  function 卡片HTML(列) {
    const 有改善前 = Boolean(文字(列.錯誤照片));
    const 有改善後 = Boolean(文字(列.正確照片));
    const 頁碼 = 文件頁碼(列);
    let 圖片區 = '';

    if (有改善前 && 有改善後) {
      圖片區 = `<div class="文件5S照片雙欄">${圖片HTML(列.錯誤照片, '改善前', '前')}${圖片HTML(列.正確照片, '改善後', '')}</div>`;
    } else if (有改善後) {
      圖片區 = `<div class="文件5S照片單欄">${圖片HTML(列.正確照片, '標準照片', '')}</div>`;
    } else if (有改善前) {
      圖片區 = `<div class="文件5S照片單欄">${圖片HTML(列.錯誤照片, '現況照片', '前')}</div>`;
    }

    const 錯誤說明 = 文字(列.錯誤說明);
    const 正確做法 = 文字(列.正確做法);

    return `<article class="文件5S卡" data-文件群組="${轉義(區域群組(列))}">
      <div class="文件5S卡頭">
        <div><h4>${轉義(列.問題類型 || '5S標準')}</h4><p>${轉義(列.區域名稱 || 列.區域代碼)}｜${轉義(列.子區域代碼 || '')}</p></div>
        <span class="文件5S頁碼">P${String(頁碼).padStart(2, '0')}</span>
      </div>
      ${圖片區}
      <div class="文件5S內容">
        <div class="文件5S說明">
          ${錯誤說明 ? `<div><b>現況／問題：</b>${轉義(錯誤說明)}</div>` : ''}
          ${正確做法 ? `<div><b>標準／做法：</b>${轉義(正確做法)}</div>` : ''}
        </div>
        <div class="文件5S追蹤">${轉義(列.適用生產狀態 || '9月追蹤：待補改善資料')}</div>
        <div class="文件5S來源">來源 ${轉義(列.版本 || 'FM-3-001-02')}｜更新 ${轉義(列.更新時間 || '')}</div>
      </div>
    </article>`;
  }

  function 統計(清單) {
    const 結果 = { A9: 0, A5: 0, B9: 0, B3: 0, 掃具: 0, 其他: 0, 待追蹤: 0 };
    清單.forEach(列 => {
      const 群組 = 區域群組(列);
      結果[群組] = (結果[群組] || 0) + 1;
      if (/需提供改善資料|待補|待追蹤/.test(文字(列.適用生產狀態))) 結果.待追蹤 += 1;
    });
    return 結果;
  }

  function 總覽HTML(清單) {
    const 統 = 統計(清單);
    return `<section id="${注入識別}" class="文件5S區">
      <div class="文件5S英雄">
        <h3>📘 日常點檢改善｜FM-3-001-02</h3>
        <p>文件中的改善前後、檢驗桌擺放標準與掃具櫃標準，已接入智慧5S中央資料與可視化頁。</p>
        <small>文件整合模組 v${模組版本}｜系統 v${系統版本}</small>
      </div>
      <div class="文件5SKPI">
        <article><small>文件標準／改善</small><b>${清單.length}</b><span>P02–P18</span></article>
        <article><small>A9</small><b>${統.A9}</b><span>1069／1070檢驗桌</span></article>
        <article><small>A5</small><b>${統.A5}</b><span>1044／1045／1046</span></article>
        <article><small>9月待追蹤</small><b>${統.待追蹤}</b><span>需提供改善資料</span></article>
      </div>
    </section>`;
  }

  function 標準頁HTML(清單) {
    const 群組清單 = ['全部', 'A9', 'A5', 'B9', 'B3', '掃具'];
    const 篩選後 = 狀態.篩選 === '全部' ? 清單 : 清單.filter(列 => 區域群組(列) === 狀態.篩選);

    return `<section id="${注入識別}" class="文件5S區">
      <div class="文件5S英雄">
        <h3>📷 日常點檢改善標準照片</h3>
        <p>文件 FM-3-001-02 共 ${清單.length} 筆。改善前後對照與單張標準照片分開呈現，可直接作為現場確認基準。</p>
        <small>9月追蹤：2026-09-01 與茂軒溝通，需提供改善資料</small>
      </div>
      <div class="文件5S篩選">${群組清單.map(名稱 => `<button type="button" data-文件篩選="${名稱}" class="${狀態.篩選 === 名稱 ? '作用中' : ''}">${名稱}</button>`).join('')}</div>
      <div class="文件5S網格">${篩選後.map(卡片HTML).join('') || '<div class="文件5S錯誤">此篩選目前沒有資料。</div>'}</div>
    </section>`;
  }

  function 是否可視化頁() {
    return Boolean(document.querySelector('#頁面內容 .視覺核心'));
  }

  function 目前分頁() {
    const 作用中 = document.querySelector('#頁面內容 [data-視覺頁].作用中');
    return 作用中 ? 文字(作用中.getAttribute('data-視覺頁')) : '';
  }

  async function 注入() {
    if (!是否可視化頁()) return;

    const 頁面 = 目前分頁();
    if (!['總覽', '標準'].includes(頁面)) {
      document.getElementById(注入識別)?.remove();
      return;
    }

    const 清單 = await 讀取文件資料(false);
    if (!是否可視化頁() || 目前分頁() !== 頁面) return;

    document.getElementById(注入識別)?.remove();
    const 核心 = document.querySelector('#頁面內容 .視覺核心');
    if (!核心) return;

    if (狀態.錯誤) {
      核心.insertAdjacentHTML('beforeend', `<section id="${注入識別}" class="文件5S區"><div class="文件5S錯誤"><b>日常點檢改善資料暫時無法讀取</b><br>${轉義(狀態.錯誤)}</div></section>`);
      return;
    }

    核心.insertAdjacentHTML('beforeend', 頁面 === '標準' ? 標準頁HTML(清單) : 總覽HTML(清單));
    綁定事件();
  }

  function 開啟燈箱(來源) {
    let 燈箱 = document.getElementById('文件5S燈箱');
    if (!燈箱) {
      燈箱 = document.createElement('div');
      燈箱.id = '文件5S燈箱';
      燈箱.className = '文件5S燈箱 隱藏';
      燈箱.innerHTML = '<button type="button" aria-label="關閉照片">×</button><div class="文件5S燈箱框"><div class="文件5S燈箱圖"></div></div>';
      document.body.appendChild(燈箱);
      燈箱.querySelector('button').onclick = () => 燈箱.classList.add('隱藏');
      燈箱.onclick = 事件 => {
        if (事件.target === 燈箱) 燈箱.classList.add('隱藏');
      };
    }

    const 圖 = 燈箱.querySelector('.文件5S燈箱圖');
    圖.setAttribute('style', 圖片背景樣式(來源));
    燈箱.classList.remove('隱藏');
  }

  function 綁定事件() {
    document.querySelectorAll(`#${注入識別} [data-文件篩選]`).forEach(按鈕 => {
      按鈕.onclick = () => {
        狀態.篩選 = 文字(按鈕.getAttribute('data-文件篩選')) || '全部';
        const 舊 = document.getElementById(注入識別);
        if (舊 && Array.isArray(狀態.資料)) {
          舊.outerHTML = 標準頁HTML(狀態.資料);
          綁定事件();
        }
      };
    });

    document.querySelectorAll(`#${注入識別} [data-文件照片]`).forEach(框 => {
      const 放大 = () => 開啟燈箱(文字(框.getAttribute('data-文件照片')));
      框.onclick = 放大;
      框.onkeydown = 事件 => {
        if (事件.key === 'Enter' || 事件.key === ' ') {
          事件.preventDefault();
          放大();
        }
      };
    });
  }

  function 排程注入() {
    clearTimeout(狀態.計時器);
    狀態.計時器 = setTimeout(() => {
      注入().catch(錯誤 => console.warn('日常點檢改善注入失敗', 錯誤));
    }, 90);
  }

  function 綁定觀察() {
    注入樣式();
    const 容器 = document.getElementById('頁面內容');
    if (!容器) {
      setTimeout(綁定觀察, 150);
      return;
    }

    if (狀態.觀察器) 狀態.觀察器.disconnect();
    狀態.觀察器 = new MutationObserver(排程注入);
    狀態.觀察器.observe(容器, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    document.addEventListener('click', 事件 => {
      const 按鈕 = 事件.target && 事件.target.closest ? 事件.target.closest('[data-視覺頁]') : null;
      if (按鈕) setTimeout(排程注入, 80);
    }, true);

    排程注入();
  }

  function 重新整理() {
    狀態.資料 = null;
    狀態.錯誤 = '';
    狀態.篩選 = '全部';
    return 讀取文件資料(true).then(() => 注入());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', 綁定觀察, { once: true });
  } else {
    綁定觀察();
  }

  全域.智慧5S日常點檢改善整合 = Object.freeze({
    版本: 模組版本,
    系統版本,
    重新整理
  });
})(window);
