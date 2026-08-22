(function (全域) {
  'use strict';

  /**
   * 化新精密｜智慧5S管理平台
   * A5 首次稽核準備中心 v1.1.5
   * 目的：把 2026-08-29 首次 0–4 分正式稽核前置條件做成可追蹤清單。
   * 原則：本頁只顯示「準備狀態」，不預填正式稽核分數。
   */
  const 版本 = '1.1.5';
  const 設定 = 全域.智慧5S設定;
  const 資料庫 = 全域.智慧5S資料庫;
  if (!設定 || !資料庫) return;

  const 分頁名稱 = 設定.分頁.A5首次稽核準備 || '5S_A5首次稽核準備';
  let 已自動進入 = false;

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 轉義(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function 注入樣式() {
    if (document.getElementById('智慧5S-A5首次稽核樣式')) return;
    const s = document.createElement('style');
    s.id = '智慧5S-A5首次稽核樣式';
    s.textContent = `
      .A5稽核頁{display:grid;gap:14px}.A5稽核Hero{padding:20px;border-radius:26px;background:linear-gradient(135deg,#243d32,#176b47 58%,#774b21);color:#fff;box-shadow:0 16px 38px rgba(25,74,52,.16)}
      .A5稽核Hero h2{margin:0 0 7px}.A5稽核Hero p{margin:0;color:rgba(255,255,255,.86);line-height:1.65}.A5稽核Hero .日期{display:inline-flex;margin-top:12px;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.14);font-weight:900}
      .A5稽核KPI{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.A5稽核KPI article{background:#fff;border:1px solid #e1e9e4;border-radius:18px;padding:13px}.A5稽核KPI small{display:block;color:#748179;font-weight:800}.A5稽核KPI b{display:block;font-size:1.35rem;margin-top:4px;color:#173f2f}
      .A5稽核工具{display:flex;gap:8px;flex-wrap:wrap}.A5稽核工具 button{border:0;border-radius:13px;padding:10px 13px;font-weight:900;background:#176b47;color:#fff}.A5稽核工具 button.次要{background:#eef4f0;color:#365446;border:1px solid #dce7df}
      .A5稽核清單{display:grid;gap:9px}.A5稽核卡{background:#fff;border:1px solid #e2e9e5;border-left:5px solid #d1a24a;border-radius:17px;padding:13px}.A5稽核卡.高{border-left-color:#d64545}.A5稽核卡.低{border-left-color:#4b84cf}.A5稽核卡 h4{margin:0 0 5px;color:#193d2f}.A5稽核卡 p{margin:4px 0;color:#69776f;font-size:.74rem;line-height:1.55}.A5稽核標籤列{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.A5稽核標籤{font-size:.66rem;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef3ef;color:#53645a}.A5稽核標籤.紅{background:#fde6e6;color:#b53030}.A5稽核標籤.黃{background:#fff0d1;color:#9b6100}.A5稽核標籤.綠{background:#e1f4e9;color:#14734a}.A5稽核標籤.藍{background:#e7f0fc;color:#3166ad}.A5稽核標籤.紫{background:#eee7fb;color:#6547ad}
      .A5稽核警示{padding:14px;border-radius:18px;background:#fff4e5;border:1px solid #efd7aa;color:#714800;line-height:1.6}.A5稽核區頭{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.A5稽核區頭 h3{margin:0}.A5稽核區頭 p{margin:4px 0 0;color:#748179;font-size:.74rem}
      @media(max-width:900px){.A5稽核KPI{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.A5稽核KPI{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(s);
  }

  async function 讀取資料() {
    const r = await 資料庫.讀取分頁(分頁名稱, 200);
    return r && Array.isArray(r.資料) ? r.資料 : [];
  }

  function 狀態顏色(狀態) {
    if (/需改善|未完成|高風險|待安全/.test(狀態)) return '紅';
    if (/部分具備|初步具備/.test(狀態)) return '綠';
    if (/待現場確認|待確認/.test(狀態)) return '黃';
    if (/待正式稽核/.test(狀態)) return '藍';
    return '紫';
  }

  function 找導航(頁面) {
    return Array.from(document.querySelectorAll('.導航按鈕')).find(b => b.dataset.頁面 === 頁面 || 文字(b.textContent).includes(頁面));
  }

  function 切到既有頁面(頁面) {
    const b = 找導航(頁面);
    if (b) b.click();
  }

  function 卡片(x) {
    const 風險 = 文字(x.風險等級) || '中';
    const 狀態 = 文字(x.準備狀態) || '待確認';
    const cls = 風險 === '高' ? '高' : 風險 === '低' ? '低' : '';
    return `<article class="A5稽核卡 ${cls}">
      <h4>${轉義(x.項目代碼)}｜${轉義(x['5S分類'])}｜${轉義(x.檢查內容)}</h4>
      <p><b>現況：</b>${轉義(x.現況判讀)}</p>
      <p><b>完成條件：</b>${轉義(x.前置完成條件)}</p>
      <div class="A5稽核標籤列">
        <span class="A5稽核標籤 ${風險==='高'?'紅':風險==='低'?'藍':'黃'}">${轉義(風險)}風險</span>
        <span class="A5稽核標籤 ${狀態顏色(狀態)}">${轉義(狀態)}</span>
        ${文字(x['機台/範圍']) ? `<span class="A5稽核標籤">${轉義(x['機台/範圍'])}</span>` : ''}
        ${文字(x.關聯任務) ? `<span class="A5稽核標籤">任務 ${轉義(x.關聯任務)}</span>` : ''}
      </div>
    </article>`;
  }

  async function 進入A5首次稽核準備() {
    注入樣式();
    document.querySelectorAll('.導航按鈕').forEach(b => b.classList.remove('作用中'));
    document.getElementById('A5稽核導航')?.classList.add('作用中');
    document.getElementById('浮動按鈕')?.classList.add('隱藏');
    const 標題 = document.getElementById('頁面標題');
    const 副標 = document.getElementById('頁面副標');
    if (標題) 標題.textContent = 'A5 首次稽核準備';
    if (副標) 副標.textContent = '製一組｜1044 → 1046 → 1045｜正式稽核 2026/08/29';
    const 主 = document.getElementById('頁面內容');
    if (!主) return;
    主.innerHTML = '<div class="卡片"><div class="空狀態">正在讀取 A5 20項稽核前置條件…</div></div>';
    try {
      const 資料 = await 讀取資料();
      const 高風險 = 資料.filter(x => 文字(x.風險等級) === '高').length;
      const 需改善 = 資料.filter(x => /需改善/.test(文字(x.準備狀態))).length;
      const 前置未完成 = 資料.filter(x => /前置未完成|高風險待確認|待安全確認/.test(文字(x.準備狀態))).length;
      const 具基礎 = 資料.filter(x => /部分具備|初步具備/.test(文字(x.準備狀態))).length;
      主.innerHTML = `<div class="A5稽核頁">
        <section class="A5稽核Hero"><h2>首次稽核前置清單已建立</h2><p>本頁不會先替現場打 0–4 分。先把資料一致性、定位、清掃、標準照片、責任區與安全前置條件完成，再於 8/29 執行正式稽核。</p><span class="日期">📅 正式首次稽核：2026/08/29</span></section>
        <section class="A5稽核KPI"><article><small>檢查項目</small><b>${資料.length}</b></article><article><small>高風險</small><b>${高風險}</b></article><article><small>明確需改善</small><b>${需改善}</b></article><article><small>前置未完成/高風險</small><b>${前置未完成}</b></article><article><small>已有基礎</small><b>${具基礎}</b></article></section>
        <section class="A5稽核警示"><b>目前關鍵阻斷：</b>837081227 / 837081228 與 OP / 機台關係尚未核對完成；正式標準照片 V001 尚未生效；1045 藍盒已轉正式改善單。這些項目完成前，不把現況照片誤當作正式標準。</section>
        <section class="卡片"><div class="A5稽核區頭"><div><h3>執行入口</h3><p>先改善、再拍正式標準照，最後才進行0–4分正式巡檢。</p></div></div><div class="A5稽核工具" style="margin-top:12px"><button id="A5去現況">📸 A5現況</button><button id="A5去改善" class="次要">🛠 改善單</button><button id="A5正式巡檢" class="次要">✓ 開始正式巡檢</button><button id="A5重新整理" class="次要">↻ 重新整理</button></div></section>
        <section class="卡片"><div class="A5稽核區頭"><div><h3>20項前置條件</h3><p>正式得分欄維持空白，避免把照片判讀當作正式現場稽核。</p></div></div><div class="A5稽核清單" style="margin-top:12px">${資料.map(卡片).join('') || '<div class="空狀態">目前沒有準備資料</div>'}</div></section>
      </div>`;
      document.getElementById('A5去現況')?.addEventListener('click', () => 切到既有頁面('A5現況'));
      document.getElementById('A5去改善')?.addEventListener('click', () => 切到既有頁面('改善'));
      document.getElementById('A5正式巡檢')?.addEventListener('click', () => 切到既有頁面('巡檢'));
      document.getElementById('A5重新整理')?.addEventListener('click', 進入A5首次稽核準備);
    } catch (錯誤) {
      主.innerHTML = `<div class="卡片"><div class="空狀態"><b>A5稽核準備讀取失敗</b><br>${轉義(錯誤 && 錯誤.message ? 錯誤.message : 錯誤)}</div></div>`;
    }
  }

  function 建立導航() {
    const nav = document.querySelector('.底部導航');
    if (!nav || document.getElementById('A5稽核導航')) return;
    const b = document.createElement('button');
    b.id = 'A5稽核導航';
    b.className = '導航按鈕';
    b.type = 'button';
    b.dataset.頁面 = 'A5稽核';
    b.innerHTML = '<span class="導航圖示">▣</span><span>A5稽核</span>';
    b.addEventListener('click', 進入A5首次稽核準備);
    nav.appendChild(b);
  }

  function 嘗試自動進入() {
    if (已自動進入) return;
    const 目標 = new URLSearchParams(location.search).get('頁面');
    const app = document.getElementById('應用程式');
    if (目標 === 'A5稽核' && app && !app.classList.contains('隱藏')) {
      已自動進入 = true;
      進入A5首次稽核準備();
    }
  }

  function 初始化() {
    建立導航();
    嘗試自動進入();
    const app = document.getElementById('應用程式');
    if (app) new MutationObserver(() => { 建立導航(); 嘗試自動進入(); }).observe(app, { attributes:true, attributeFilter:['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化); else 初始化();
  全域.智慧5S_A5首次稽核準備 = Object.freeze({ 版本, 進入A5首次稽核準備 });
})(window);
