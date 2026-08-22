(function (全域) {
  'use strict';

  /**
   * 化新精密｜智慧5S管理平台
   * A5 現場照片盤點中心
   * 版本：1.1.3
   *
   * 現場機台順序（使用者 2026-08-22 確認）：左 1044 → 中 1046 → 右 1045。
   * 照片來源：5S_現場照片清冊；改善候選：5S_現場改善候選。
   * 注意：改善候選中標示「需現場確認=是」者只屬待確認事項，不直接視為違規。
   */

  const 版本 = '1.1.3';
  const 設定 = 全域.智慧5S設定;
  const 資料庫 = 全域.智慧5S資料庫;
  if (!設定 || !資料庫) {
    console.error('智慧5S A5現場照片盤點：找不到設定或資料庫模組。');
    return;
  }

  const 照片分頁 = 設定.分頁.現場照片清冊 || '5S_現場照片清冊';
  const 改善分頁 = 設定.分頁.現場改善候選 || '5S_現場改善候選';
  const Drive資料夾 = 'https://drive.google.com/drive/folders/1Fpjo_mO2i8xoumEMh3pmcEFEkwH4MYtF';
  const 機台順序 = ['全部', '1044', '1046', '1045', '共用'];
  const 狀態 = { 機台: '全部', 照片: [], 改善: [] };

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 轉義(v) {
    return String(v == null ? '' : v).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  }
  function 安全網址(v) {
    const s = 文字(v);
    return /^https:\/\//i.test(s) ? s : '#';
  }

  function 注入樣式() {
    if (document.getElementById('智慧5S-A5現況樣式')) return;
    const s = document.createElement('style');
    s.id = '智慧5S-A5現況樣式';
    s.textContent = `
      .A5現況頁{display:grid;gap:14px}.A5現況主視覺{padding:20px;border-radius:26px;background:linear-gradient(135deg,#123c2b,#19744e 55%,#6c3151);color:#fff;box-shadow:0 16px 40px rgba(23,107,71,.18)}
      .A5現況主視覺 h2{margin:0 0 7px}.A5現況主視覺 p{margin:0;line-height:1.65;color:rgba(255,255,255,.86)}.A5順序{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:13px}.A5順序 b{background:rgba(255,255,255,.15);padding:7px 10px;border-radius:999px}.A5順序 i{font-style:normal;opacity:.65}
      .A5KPI{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.A5KPI article{background:#fff;border:1px solid #e1e9e4;border-radius:18px;padding:13px}.A5KPI small{display:block;color:#748179;font-weight:800}.A5KPI b{display:block;font-size:1.4rem;margin-top:4px;color:#173f2f}
      .A5工具列{display:flex;gap:8px;flex-wrap:wrap}.A5工具列 button{border:1px solid #dce6df;background:#fff;border-radius:999px;padding:9px 13px;font-weight:900;color:#496257}.A5工具列 button.作用中{background:#176b47;color:#fff;border-color:#176b47}
      .A5照片網格{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.A5照片卡{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #e2e9e5;border-radius:19px;overflow:hidden;box-shadow:0 8px 22px rgba(18,61,38,.055)}.A5照片卡 img{width:100%;height:205px;object-fit:cover;background:#edf2ef}.A5照片卡 .內文{padding:12px}.A5照片卡 h4{margin:0 0 5px;color:#193d2f}.A5照片卡 p{margin:0;color:#728077;font-size:.72rem;line-height:1.55}.A5照片卡 .標籤列{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.A5照片卡 .標籤{font-size:.65rem}
      .A5警示{padding:15px;border-radius:18px;background:#fff4e5;border:1px solid #efd7aa;color:#714800}.A5警示 b{display:block;margin-bottom:5px}.A5改善清單{display:grid;gap:9px}.A5改善卡{background:#fff;border:1px solid #e2e9e5;border-left:5px solid #d98b13;border-radius:17px;padding:13px}.A5改善卡.高{border-left-color:#d64545}.A5改善卡.低{border-left-color:#2d70c9}.A5改善卡 h4{margin:0 0 5px}.A5改善卡 p{margin:0;color:#69776f;font-size:.75rem;line-height:1.6}.A5改善卡 .資訊{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      .A5區標題{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.A5區標題 h3{margin:0}.A5區標題 p{margin:4px 0 0;color:#748179;font-size:.74rem}.A5動作{border:0;border-radius:14px;background:#176b47;color:#fff;padding:9px 12px;font-weight:900}
      @media(max-width:850px){.A5照片網格{grid-template-columns:repeat(2,minmax(0,1fr))}.A5KPI{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.A5照片網格{grid-template-columns:1fr}.A5照片卡 img{height:220px}}
    `;
    document.head.appendChild(s);
  }

  async function 讀取分頁(名稱) {
    const r = await 資料庫.讀取分頁(名稱, 設定.讀取上限 || 5000);
    return r && Array.isArray(r.資料) ? r.資料 : [];
  }

  function 符合機台(x) {
    if (狀態.機台 === '全部') return true;
    const m = 文字(x.機台編號 || x['機台/範圍']);
    if (狀態.機台 === '共用') return m.includes('共用') || /機台群|前方/.test(m);
    return m.includes(狀態.機台);
  }

  function 照片卡(x) {
    const 圖 = 安全網址(x.縮圖網址);
    const 連結 = 安全網址(x.Drive網址);
    const 候選 = 文字(x.可作標準候選) === '是';
    const 重拍 = 文字(x.需改善後重拍) === '是';
    return `<a class="A5照片卡" href="${轉義(連結)}" target="_blank" rel="noopener">
      <img src="${轉義(圖)}" loading="lazy" alt="${轉義(x.子類型 || x.圖片類型 || '現場照片')}" onerror="this.style.display='none'">
      <div class="內文"><h4>${轉義(x.機台編號 || 'A5')} · ${轉義(x.子類型 || x.圖片類型)}</h4>
      <p>${轉義(x.觀察重點 || '')}</p>
      <div class="標籤列"><span class="標籤 藍">${轉義(x.圖片類型 || '照片')}</span>${候選?'<span class="標籤 綠">標準候選</span>':''}${重拍?'<span class="標籤 黃">改善後重拍</span>':''}</div></div></a>`;
  }

  function 改善卡(x) {
    const p = 文字(x.優先級) || '中';
    const cls = p === '高' ? '高' : p === '低' ? '低' : '';
    const 待確認 = 文字(x.需現場確認) === '是';
    return `<article class="A5改善卡 ${cls}"><h4>${轉義(x.候選編號)}｜${轉義(x.問題類型)}</h4>
      <p>${轉義(x.觀察描述)}</p><p style="margin-top:6px"><b>建議：</b>${轉義(x.建議標準)}</p>
      <div class="資訊"><span class="標籤 ${p==='高'?'紅':p==='低'?'藍':'黃'}">${轉義(p)}優先</span><span class="標籤">${轉義(x['機台/範圍'])}</span><span class="標籤">${轉義(x['5S分類'])}</span>${待確認?'<span class="標籤 紫">需現場確認</span>':''}<span class="標籤">${轉義(x.狀態)}</span></div></article>`;
  }

  function 重新繪製() {
    const 容器 = document.getElementById('A5現況內容');
    if (!容器) return;
    const 照片 = 狀態.照片.filter(符合機台);
    const 改善 = 狀態.改善.filter(符合機台);
    document.querySelectorAll('[data-A5機台]').forEach(b => b.classList.toggle('作用中', b.dataset.a5機台 === 狀態.機台));
    容器.innerHTML = `
      <section class="卡片"><div class="A5區標題"><div><h3>📷 現場照片清冊</h3><p>點照片可開啟 Drive 原圖；目前顯示 ${照片.length} 張唯一照片。</p></div><button id="A5Drive" class="A5動作">Drive歸檔</button></div>
      <div class="A5照片網格" style="margin-top:12px">${照片.map(照片卡).join('') || '<div class="空狀態">目前篩選無照片</div>'}</div></section>
      <section class="卡片"><div class="A5區標題"><div><h3>🛠 現場改善候選</h3><p>「需現場確認」僅為照片盤點候選，不直接判定違規。</p></div></div><div class="A5改善清單" style="margin-top:12px">${改善.map(改善卡).join('') || '<div class="空狀態">目前篩選無改善候選</div>'}</div></section>`;
    document.getElementById('A5Drive')?.addEventListener('click', () => window.open(Drive資料夾, '_blank', 'noopener'));
  }

  async function 進入A5現況() {
    注入樣式();
    document.querySelectorAll('.導航按鈕').forEach(b => b.classList.remove('作用中'));
    document.getElementById('A5現況導航')?.classList.add('作用中');
    document.getElementById('浮動按鈕')?.classList.add('隱藏');
    const 標題 = document.getElementById('頁面標題');
    const 副標 = document.getElementById('頁面副標');
    if (標題) 標題.textContent = 'A5 現場照片盤點';
    if (副標) 副標.textContent = '製一組｜1044 → 1046 → 1045';
    const 主 = document.getElementById('頁面內容');
    if (!主) return;
    主.innerHTML = '<div class="卡片"><div class="空狀態">正在讀取 A5 現場照片與改善候選…</div></div>';
    try {
      const [照片, 改善] = await Promise.all([讀取分頁(照片分頁), 讀取分頁(改善分頁)]);
      狀態.照片 = 照片; 狀態.改善 = 改善;
      const 標準候選 = 照片.filter(x => 文字(x.可作標準候選) === '是').length;
      const 需重拍 = 照片.filter(x => 文字(x.需改善後重拍) === '是').length;
      const 高優先 = 改善.filter(x => 文字(x.優先級) === '高').length;
      主.innerHTML = `<div class="A5現況頁">
        <section class="A5現況主視覺"><h2>A5 現場基線已建立</h2><p>2026/08/22 現場照片完成歸檔與去重。機台實際位置依現場確認，不再依照片猜測。</p><div class="A5順序"><b>左｜1044</b><i>→</i><b>中｜1046</b><i>→</i><b>右｜1045</b></div></section>
        <section class="A5KPI"><article><small>唯一照片</small><b>${照片.length}</b></article><article><small>標準候選</small><b>${標準候選}</b></article><article><small>改善後重拍</small><b>${需重拍}</b></article><article><small>高優先候選</small><b>${高優先}</b></article></section>
        <div class="A5警示"><b>⚠ 資料一致性待確認</b>現場文件出現客戶品號 837081227 與 837081228；目前中央途程可找到 837081228，但尚找不到 837081227。系統已建立改善候選，未直接寫入假途程。</div>
        <section class="卡片"><div class="A5區標題"><div><h3>機台篩選</h3><p>從左到右：1044、1046、1045。</p></div></div><div class="A5工具列" style="margin-top:10px">${機台順序.map(m=>`<button data-A5機台="${m}">${m}</button>`).join('')}</div></section>
        <div id="A5現況內容"></div>
      </div>`;
      document.querySelectorAll('[data-A5機台]').forEach(b => b.addEventListener('click', () => { 狀態.機台 = b.dataset.a5機台; 重新繪製(); }));
      重新繪製();
    } catch (錯誤) {
      主.innerHTML = `<div class="卡片"><div class="空狀態"><b>讀取 A5 現場資料失敗</b><div>${轉義(錯誤 && 錯誤.message || 錯誤)}</div></div></div>`;
    }
  }

  function 建立導航() {
    if (document.getElementById('A5現況導航')) return;
    const nav = document.querySelector('.底部導航');
    if (!nav) return;
    const b = document.createElement('button');
    b.id = 'A5現況導航';
    b.className = '導航按鈕';
    b.type = 'button';
    b.innerHTML = '<span class="導航圖示">📸</span><span>A5現況</span>';
    b.addEventListener('click', 進入A5現況);
    nav.appendChild(b);
  }

  function 初始化() {
    注入樣式(); 建立導航();
    const p = new URLSearchParams(location.search);
    if (['A5現況','A5照片'].includes(p.get('頁面'))) setTimeout(進入A5現況, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化); else 初始化();
  全域.智慧5S_A5現場照片盤點 = Object.freeze({ 版本, 進入A5現況, 重新整理: 進入A5現況 });
})(window);
