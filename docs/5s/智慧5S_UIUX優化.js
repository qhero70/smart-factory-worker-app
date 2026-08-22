(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S UI / UX 優化 v1.2.0
   * 1. 手機、平板、桌機響應式互動補強。
   * 2. 新增物品盤點改為「區域 → 位置下拉 → 物品資料 → 必要性判定」。
   * 3. 卡片與長資料區段可收合 / 展開。
   * 4. 按鍵提供浮起、按壓、波紋、等待狀態。
   * 5. 支援 Fullscreen API 與 PWA standalone 狀態。
   * 6. 長機台內容預設折疊，避免首頁一路滑到底。
   */

  const 版本 = '1.2.0';
  const 資料庫 = 全域.智慧5S資料庫;
  const 設定 = 全域.智慧5S設定;
  let 位置資料Promise = null;
  const 已處理長區段 = new WeakSet();

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 轉義(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function Roar(類型, 內容, 標題) {
    const r = 全域.智慧5SRoar;
    if (r && typeof r[類型] === 'function') return r[類型](內容, 標題);
  }

  async function 取得位置資料() {
    if (位置資料Promise) return 位置資料Promise;
    位置資料Promise = (async () => {
      const result = { 責任區: [], 機台: [] };
      if (!資料庫) return result;
      try {
        const a = await 資料庫.讀取分頁((設定?.分頁?.責任區主檔) || '5S_責任區主檔', 3000);
        result.責任區 = Array.isArray(a?.資料) ? a.資料 : [];
      } catch (e) { console.warn('UIUX：責任區讀取失敗', e); }
      try {
        const b = await 資料庫.讀取分頁((設定?.分頁?.製一組機台基線) || '5S_製一組機台基線', 1200);
        result.機台 = Array.isArray(b?.資料) ? b.資料 : [];
      } catch (e) { console.warn('UIUX：機台基線讀取失敗', e); }
      return result;
    })();
    return 位置資料Promise;
  }

  function 建立選項(select, value, label, group) {
    if (!value || Array.from(select.options).some(o => o.value === value)) return;
    const o = document.createElement('option');
    o.value = value; o.textContent = label || value;
    (group || select).appendChild(o);
  }

  async function 更新盤點位置選項() {
    const 區域 = document.getElementById('盤點區域');
    const 位置 = document.getElementById('盤點位置');
    if (!區域 || !位置 || 位置.tagName !== 'SELECT') return;

    const code = 文字(區域.value);
    const 區域文字 = 文字(區域.options[區域.selectedIndex]?.textContent || code);
    const root = code.split('-')[0] || '';
    const 舊值 = 文字(位置.value);
    位置.innerHTML = '<option value="">請選擇位置</option>';
    位置.disabled = !code;
    if (!code) return;

    const 基本 = [
      ['機台／工位本體','機台／工位本體'],
      ['操作面／機台前方','操作面／機台前方'],
      ['工作台／作業台','工作台／作業台'],
      ['工具／耗材區','工具／耗材區'],
      ['治具區','治具區'],
      ['檢具／量具區','檢具／量具區'],
      ['文件板／作業標準','文件板／作業標準'],
      ['投入料框區','投入料框區'],
      ['產出料框區','產出料框區'],
      ['在製品暫存區','在製品暫存區'],
      ['踏台／站位區','踏台／站位區'],
      ['機台旁／周邊地面','機台旁／周邊地面'],
      ['共用通道','共用通道'],
      ['紅牌暫存區','紅牌暫存區']
    ];

    const 標準組 = document.createElement('optgroup');
    標準組.label = `${區域文字}｜標準位置`;
    基本.forEach(([v,l]) => 建立選項(位置, v, l, 標準組));
    位置.appendChild(標準組);

    const 資料 = await 取得位置資料();
    const 同根責任區 = 資料.責任區.filter(r => 文字(r.主區域代碼) === root && 文字(r.子區域代碼) && 文字(r.子區域代碼) !== code).slice(0, 20);
    if (同根責任區.length) {
      const g = document.createElement('optgroup'); g.label = `${root} 已建責任位置`;
      同根責任區.forEach(r => 建立選項(位置, 文字(r.子區域名稱 || r.子區域代碼), 文字(r.子區域名稱 || r.子區域代碼), g));
      if (g.children.length) 位置.appendChild(g);
    }

    建立選項(位置, '__自訂__', '其他／自訂位置');
    if (舊值 && Array.from(位置.options).some(o => o.value === 舊值)) 位置.value = 舊值;
    切換自訂位置();
  }

  function 切換自訂位置() {
    const select = document.getElementById('盤點位置');
    if (!select || select.tagName !== 'SELECT') return;
    let input = document.getElementById('盤點自訂位置');
    if (select.value === '__自訂__') {
      if (!input) {
        input = document.createElement('input');
        input.id = '盤點自訂位置'; input.className = '輸入框 UIUX自訂位置'; input.type = 'text';
        input.placeholder = '請輸入實際位置，例如：1044 左側料框';
        input.autocomplete = 'off';
        select.insertAdjacentElement('afterend', input);
      }
      input.classList.remove('隱藏'); input.required = true;
      setTimeout(() => input.focus(), 60);
    } else if (input) {
      input.required = false; input.classList.add('隱藏');
    }
  }

  function 改造盤點位置() {
    const form = document.getElementById('盤點表單');
    const old = document.getElementById('盤點位置');
    if (!form || !old || form.dataset.uiux完成) return;
    form.dataset.uiux完成 = '1';
    form.classList.add('UIUX盤點表單');

    if (old.tagName !== 'SELECT') {
      const select = document.createElement('select');
      select.id = '盤點位置'; select.name = old.name || '位置'; select.className = '選擇框 UIUX位置選擇'; select.required = true;
      select.innerHTML = '<option value="">請先選擇區域</option>';
      old.replaceWith(select);
      select.addEventListener('change', 切換自訂位置);
    }

    const 區域 = document.getElementById('盤點區域');
    if (區域) 區域.addEventListener('change', 更新盤點位置選項);

    const 位置欄 = document.getElementById('盤點位置')?.closest('.欄位群');
    if (位置欄 && !位置欄.querySelector('.UIUX欄位提示')) {
      位置欄.insertAdjacentHTML('beforeend', '<small class="UIUX欄位提示">先選區域，再選實際放置位置；避免自由輸入造成同一位置多種名稱。</small>');
    }

    const 步驟 = [
      ['盤點區域','1','先選區域與位置','定位'],
      ['盤點物品名稱','2','填寫物品資料','物品'],
      ['盤點頻率','3','判定使用頻率與必要性','判定'],
      ['盤點照片檔案','4','照片、備註與送出','確認']
    ];
    步驟.forEach(([id,no,title,tag]) => {
      const field = document.getElementById(id)?.closest('.欄位群');
      if (!field || field.previousElementSibling?.classList.contains('表單步驟標題')) return;
      const h = document.createElement('div'); h.className = '表單步驟標題';
      h.innerHTML = `<span>${no}</span><div><b>${title}</b><small>${tag}</small></div>`;
      field.parentNode.insertBefore(h, field);
    });

    const 必要 = document.getElementById('盤點必要性');
    if (必要) {
      const 更新判定視覺 = () => {
        form.classList.toggle('判定非必要', 必要.value === '非必要');
        const reason = document.getElementById('盤點判定理由')?.closest('.欄位群');
        if (reason) reason.classList.toggle('UIUX必填提示', 必要.value === '非必要');
      };
      必要.addEventListener('change', 更新判定視覺); 更新判定視覺();
    }

    const 按鈕列 = form.querySelector('.按鈕列');
    if (按鈕列) 按鈕列.classList.add('UIUX固定送出列');

    form.addEventListener('submit', e => {
      const select = document.getElementById('盤點位置');
      if (select?.value === '__自訂__') {
        const custom = 文字(document.getElementById('盤點自訂位置')?.value);
        if (!custom) {
          e.preventDefault(); e.stopImmediatePropagation();
          Roar('警告', '請先填寫自訂位置，再送出物品盤點。', '位置尚未完成');
          document.getElementById('盤點自訂位置')?.focus();
          return;
        }
        const o = document.createElement('option'); o.value = custom; o.textContent = custom; select.appendChild(o); select.value = custom;
      }
    }, true);

    更新盤點位置選項();
  }

  function 加入卡片收合() {
    document.querySelectorAll('.卡片標題列').forEach(header => {
      const card = header.closest('.卡片');
      if (!card || header.dataset.uiux收合) return;
      header.dataset.uiux收合 = '1';
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = '收合按鈕'; btn.setAttribute('aria-expanded','true'); btn.title = '收合／展開';
      btn.innerHTML = '<span>⌃</span>';
      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const closed = card.classList.toggle('已收合');
        btn.setAttribute('aria-expanded', String(!closed));
        btn.innerHTML = `<span>${closed ? '⌄' : '⌃'}</span>`;
      });
      header.appendChild(btn);
    });
  }

  function 加入主視覺收合() {
    document.querySelectorAll('.主視覺').forEach(box => {
      if (box.dataset.uiux收合) return;
      box.dataset.uiux收合 = '1'; box.classList.add('可收合主視覺');
      const btn = document.createElement('button'); btn.type='button'; btn.className='主視覺收合按鈕'; btn.textContent='收合';
      btn.addEventListener('click', () => {
        const c = box.classList.toggle('已收合'); btn.textContent = c ? '展開' : '收合';
      });
      box.appendChild(btn);
    });
  }

  function 壓縮超長機台內容() {
    const root = document.getElementById('頁面內容'); if (!root) return;
    root.querySelectorAll('section,.卡片,.清單').forEach(el => {
      if (已處理長區段.has(el) || el.closest('.彈窗')) return;
      const text = 文字(el.textContent);
      const matches = text.match(/機台\s*\d+/g) || [];
      if (matches.length < 12 || text.length < 700) return;
      已處理長區段.add(el);
      el.classList.add('UIUX長資料區','已精簡');
      const b = document.createElement('button'); b.type='button'; b.className='次要按鈕 UIUX展開長資料';
      b.textContent = `顯示全部（${matches.length} 台）`;
      b.addEventListener('click', () => {
        const compact = el.classList.toggle('已精簡');
        b.textContent = compact ? `顯示全部（${matches.length} 台）` : '收合機台清單';
        if (compact) el.scrollIntoView({behavior:'smooth',block:'start'});
      });
      el.appendChild(b);
    });
  }

  function 波紋(e, btn) {
    if (!btn || btn.classList.contains('無波紋')) return;
    const r = btn.getBoundingClientRect();
    const span = document.createElement('span'); span.className = '按鍵波紋';
    const size = Math.max(r.width, r.height); span.style.width = span.style.height = `${size}px`;
    span.style.left = `${(e.clientX || r.left + r.width/2) - r.left - size/2}px`;
    span.style.top = `${(e.clientY || r.top + r.height/2) - r.top - size/2}px`;
    btn.appendChild(span); setTimeout(() => span.remove(), 520);
  }

  function 補按鍵互動() {
    if (document.documentElement.dataset.uiux按鍵) return;
    document.documentElement.dataset.uiux按鍵 = '1';
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest('button,.主要按鈕,.次要按鈕,.危險按鈕'); if (!b || b.disabled) return;
      b.classList.add('按壓中'); 波紋(e,b);
    }, true);
    document.addEventListener('pointerup', e => e.target.closest('button,.主要按鈕,.次要按鈕,.危險按鈕')?.classList.remove('按壓中'), true);
    document.addEventListener('pointercancel', e => e.target.closest('button,.主要按鈕,.次要按鈕,.危險按鈕')?.classList.remove('按壓中'), true);
    document.addEventListener('click', e => {
      const b = e.target.closest('.主要按鈕,.危險按鈕,button[type="submit"]');
      if (!b || b.disabled || b.classList.contains('收合按鈕')) return;
      b.classList.add('載入中');
      setTimeout(() => b.classList.remove('載入中'), 850);
    }, true);
  }

  function 是Standalone() {
    return !!(navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches);
  }

  async function 切換全螢幕() {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        return;
      }
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return;
      }
      if (是Standalone()) return Roar('資訊','目前已是PWA獨立顯示模式。','全螢幕');
      Roar('警告','此瀏覽器未開放 Fullscreen API；iPhone 可從「加入主畫面」以 App 模式取得更完整畫面。','無法進入全螢幕');
    } catch (e) {
      Roar('警告', `全螢幕切換失敗：${文字(e.message || e)}`, '顯示模式');
    }
  }

  function 補全螢幕按鈕() {
    const bar = document.querySelector('.狀態列'); if (!bar || document.getElementById('全螢幕按鈕')) return;
    const b = document.createElement('button'); b.type='button'; b.id='全螢幕按鈕'; b.className='全螢幕按鈕'; b.title='切換全螢幕'; b.setAttribute('aria-label','切換全螢幕'); b.textContent='⛶';
    b.addEventListener('click', 切換全螢幕);
    bar.insertBefore(b, document.getElementById('Roar事件按鈕') || document.getElementById('使用者頭像') || null);
    const refresh = () => { b.classList.toggle('作用中', !!document.fullscreenElement); b.textContent = document.fullscreenElement ? '⛶' : '⛶'; };
    document.addEventListener('fullscreenchange', refresh); refresh();
  }

  function 更新離線版本() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./離線服務.js?v=1200', { scope:'./' }).catch(err => console.warn('v1.2.0 Service Worker 更新失敗', err));
  }

  function 更新紅牌列印文字() {
    document.querySelectorAll('[data-rp-action="print"]').forEach(b => {
      if (!b.dataset.a4半張) { b.dataset.a4半張='1'; b.textContent='🖨 A4半張（A5）含QR列印'; }
    });
  }

  function 執行補強() {
    改造盤點位置(); 加入卡片收合(); 加入主視覺收合(); 壓縮超長機台內容(); 補全螢幕按鈕(); 更新紅牌列印文字();
  }

  function 初始化() {
    補按鍵互動(); 更新離線版本(); 執行補強();
    const obs = new MutationObserver(() => 執行補強());
    obs.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化); else 初始化();

  全域.智慧5SUIUX = Object.freeze({ 版本, 更新盤點位置選項, 切換全螢幕, 執行補強 });
})(window);
