(function (全域) {
  'use strict';

  /**
   * 化新精密｜智慧5S管理平台
   * 紅牌實體列印模組 v1.1.7
   * - 紅牌填寫完成後，可在紅牌詳情直接列印 A5 實體紅牌。
   * - 第一次列印時依掛牌日產生唯一掛牌序號：RP-YYYYMMDD-NNN。
   * - 同一紅牌重印沿用原掛牌序號，並保留每次列印紀錄。
   */
  const 版本 = '1.1.7';
  const 設定 = 全域.智慧5S設定;
  const 資料庫 = 全域.智慧5S資料庫;
  if (!設定 || !資料庫) return;

  const 紅牌分頁 = 設定.分頁.紅牌追蹤 || '5S_紅牌追蹤';
  const 列印紀錄分頁 = 設定.分頁.紅牌列印紀錄 || '5S_紅牌列印紀錄';
  const 列印欄位 = ['列印紀錄編號','紅牌編號','掛牌序號','掛牌日','列印時間','列印人工號','列印人姓名','列印版型','列印用途','備註'];

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 轉義(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function 補零(n, 位數) { return String(n).padStart(位數 || 2, '0'); }
  function 日期緊縮(v) {
    const s = 文字(v).replace(/\D/g, '').slice(0, 8);
    if (s.length === 8) return s;
    const d = new Date();
    return `${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}`;
  }
  function 完整時間() {
    const d = new Date();
    return `${d.getFullYear()}-${補零(d.getMonth()+1)}-${補零(d.getDate())} ${補零(d.getHours())}:${補零(d.getMinutes())}:${補零(d.getSeconds())}`;
  }
  function 識別碼(前綴) {
    const d = new Date();
    const t = `${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}${補零(d.getHours())}${補零(d.getMinutes())}${補零(d.getSeconds())}`;
    return `${前綴}-${t}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  }
  function 目前使用者() {
    try { return JSON.parse(localStorage.getItem('智慧5S_目前使用者') || '{}') || {}; }
    catch (_) { return {}; }
  }
  function 顯示提示(msg) {
    const n = document.getElementById('通知');
    if (!n) return;
    n.textContent = msg;
    n.className = '通知 顯示';
    clearTimeout(顯示提示.計時器);
    顯示提示.計時器 = setTimeout(() => { n.className = '通知'; }, 3200);
  }

  async function 讀分頁(名稱, 上限) {
    const r = await 資料庫.讀取分頁(名稱, 上限 || 5000);
    return r && Array.isArray(r.資料) ? r.資料 : [];
  }

  async function 取得紅牌資料(紅牌編號) {
    try {
      const rows = await 讀分頁(紅牌分頁, 設定.讀取上限 || 5000);
      const hit = rows.find(x => 文字(x.紅牌編號) === 文字(紅牌編號));
      if (hit) return hit;
    } catch (e) {
      console.warn('紅牌列印：中央資料讀取失敗，改用畫面資料', e);
    }
    return 從畫面取得紅牌(紅牌編號);
  }

  function 從畫面取得紅牌(紅牌編號) {
    const 卡 = document.querySelector('#彈窗內容 .紅牌卡');
    const h2 = 卡 && 卡.querySelector('h2');
    const 提示 = 卡 && 卡.querySelector('.提示文字');
    const 描述 = 卡 ? Array.from(卡.querySelectorAll('.改善描述')).map(x => 文字(x.textContent)) : [];
    const 標籤 = 卡 ? Array.from(卡.querySelectorAll('.標籤')).map(x => 文字(x.textContent)) : [];
    const 副標 = 文字(document.getElementById('彈窗副標')?.textContent);
    const 區域 = 副標.split('｜').slice(1).join('｜').trim();
    const 數量 = 文字(提示?.textContent).match(/數量：([^｜]+)/)?.[1] || '';
    const 暫存 = 文字(提示?.textContent).match(/暫存：(.+)$/)?.[1] || '';
    return {
      紅牌編號,
      掛牌日: '',
      盤點編號: '',
      部門: '',
      區域,
      物品名稱: 文字(h2?.textContent),
      規格型號: '',
      數量: 數量.replace(/\s+\S+$/, '').trim(),
      單位: 數量.split(/\s+/).slice(-1)[0] || '',
      紅牌原因: (描述.find(x => x.startsWith('紅牌原因：')) || '').replace(/^紅牌原因：/, ''),
      暫存位置: 暫存,
      處置建議: (描述.find(x => x.startsWith('處置建議：')) || '').replace(/^處置建議：/, ''),
      責任部門: '', 責任人: '',
      預定處置日: (標籤.find(x => x.startsWith('期限：')) || '').replace(/^期限：/, ''),
      案件狀態: 標籤[0] || '待處置',
      複查人: ''
    };
  }

  async function 取得或建立掛牌序號(紅牌) {
    let rows = [];
    try { rows = await 讀分頁(列印紀錄分頁, 5000); } catch (_) { rows = []; }
    const 既有 = rows.find(x => 文字(x.紅牌編號) === 文字(紅牌.紅牌編號) && 文字(x.掛牌序號));
    if (既有) return { 掛牌序號: 文字(既有.掛牌序號), 既有列印次數: rows.filter(x => 文字(x.紅牌編號) === 文字(紅牌.紅牌編號)).length, 紀錄: rows };

    const 日期碼 = 日期緊縮(紅牌.掛牌日);
    const 前綴 = `RP-${日期碼}-`;
    let 最大 = 0;
    rows.forEach(x => {
      const s = 文字(x.掛牌序號);
      if (!s.startsWith(前綴)) return;
      const n = Number(s.slice(前綴.length));
      if (Number.isFinite(n)) 最大 = Math.max(最大, n);
    });
    return { 掛牌序號: `${前綴}${補零(最大 + 1, 3)}`, 既有列印次數: 0, 紀錄: rows };
  }

  async function 寫入列印紀錄(紅牌, 掛牌序號, 第幾次) {
    const u = 目前使用者();
    const data = {
      列印紀錄編號: 識別碼('5S-PRT'),
      紅牌編號: 文字(紅牌.紅牌編號),
      掛牌序號,
      掛牌日: 文字(紅牌.掛牌日),
      列印時間: 完整時間(),
      列印人工號: 文字(u.工號),
      列印人姓名: 文字(u.姓名),
      列印版型: 'A5直式',
      列印用途: '現場實體掛牌',
      備註: `第${第幾次}次列印｜智慧5S v${版本}`
    };
    try {
      const result = await 資料庫.送出或排隊({
        工作類型: '新增',
        分頁名稱: 列印紀錄分頁,
        欄位: 列印欄位,
        值: 列印欄位.map(k => data[k] ?? '')
      });
      return result;
    } catch (e) {
      console.warn('紅牌列印紀錄寫入失敗，不阻擋實體列印', e);
      return null;
    }
  }

  function 列印HTML(紅牌, 掛牌序號, 第幾次) {
    const 狀態 = 文字(紅牌.案件狀態) || '待處置';
    const 是否結案 = /已結案|已完成|作廢/.test(狀態);
    const 建立人 = 目前使用者();
    return `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${轉義(掛牌序號)}｜5S紅牌</title><style>
      @page{size:A5 portrait;margin:7mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Microsoft JhengHei","PingFang TC",sans-serif}.牌{min-height:190mm;border:4px solid #b4121b;padding:8mm;position:relative}.孔{position:absolute;top:5mm;width:8mm;height:8mm;border:2px solid #b4121b;border-radius:50%;background:#fff}.孔.左{left:7mm}.孔.右{right:7mm}.標題{text-align:center;color:#b4121b;font-size:31px;font-weight:1000;letter-spacing:6px;margin:2mm 0 1mm}.警語{text-align:center;font-weight:900;font-size:14px;margin-bottom:5mm}.序號框{border:2px solid #b4121b;background:#fff1f1;padding:4mm;text-align:center;margin-bottom:5mm}.序號框 small{display:block;font-weight:800;color:#7a2d31}.序號框 strong{display:block;font-size:24px;letter-spacing:1.5px;color:#a00912;margin-top:1mm}.格{display:grid;grid-template-columns:30mm 1fr;border-top:1.5px solid #333;border-left:1.5px solid #333}.格>div{border-right:1.5px solid #333;border-bottom:1.5px solid #333;padding:2.6mm;min-height:10mm;font-size:13px;line-height:1.45}.名{font-weight:900;background:#f3f3f3;display:flex;align-items:center}.大{font-size:17px;font-weight:900}.原因{min-height:20mm}.狀態{display:inline-block;border:2px solid ${是否結案?'#367a50':'#b4121b'};color:${是否結案?'#367a50':'#b4121b'};font-weight:1000;padding:1.5mm 3mm;border-radius:999px}.簽名{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:5mm}.簽名 div{height:24mm;border:1.5px solid #333;padding:2mm;font-size:12px}.底{margin-top:4mm;text-align:center;font-size:10px;color:#555;line-height:1.5}.底 b{color:#b4121b}.不可{margin-top:5mm;border:2px dashed #b4121b;padding:3mm;text-align:center;color:#b4121b;font-weight:1000;font-size:15px}.no-print{margin:8px auto;text-align:center}.no-print button{font-size:18px;padding:10px 18px;border:0;border-radius:10px;background:#b4121b;color:#fff;font-weight:900}@media print{.no-print{display:none}.牌{page-break-inside:avoid}}
    </style></head><body><div class="牌"><span class="孔 左"></span><span class="孔 右"></span><div class="標題">5S 紅牌</div><div class="警語">非必要品／待處置物品識別卡</div><div class="序號框"><small>實體掛牌序號</small><strong>${轉義(掛牌序號)}</strong><small>系統紅牌編號：${轉義(紅牌.紅牌編號)}</small></div><div class="格">
      <div class="名">物品名稱</div><div class="大">${轉義(紅牌.物品名稱 || '未填')}</div>
      <div class="名">規格型號</div><div>${轉義(紅牌.規格型號 || '—')}</div>
      <div class="名">數量</div><div>${轉義(紅牌.數量 || '')} ${轉義(紅牌.單位 || '')}</div>
      <div class="名">掛牌日期</div><div>${轉義(紅牌.掛牌日 || '未填')}</div>
      <div class="名">部門／區域</div><div>${轉義(紅牌.部門 || '')}｜${轉義(紅牌.區域 || '')}</div>
      <div class="名">紅牌原因</div><div class="原因">${轉義(紅牌.紅牌原因 || '未填')}</div>
      <div class="名">暫存位置</div><div>${轉義(紅牌.暫存位置 || '未填')}</div>
      <div class="名">處置建議</div><div>${轉義(紅牌.處置建議 || '待會審')}</div>
      <div class="名">責任部門</div><div>${轉義(紅牌.責任部門 || '待指派')}</div>
      <div class="名">責任人</div><div>${轉義(紅牌.責任人 || '待指派')}</div>
      <div class="名">預定處置日</div><div class="大">${轉義(紅牌.預定處置日 || '未設定')}</div>
      <div class="名">案件狀態</div><div><span class="狀態">${轉義(狀態)}</span></div>
      <div class="名">盤點編號</div><div>${轉義(紅牌.盤點編號 || '—')}</div>
    </div><div class="簽名"><div><b>掛牌人</b><br><br>${轉義(建立人.姓名 || '')}</div><div><b>責任人簽名</b></div><div><b>複查／結案</b><br><br>${轉義(紅牌.複查人 || '')}</div></div><div class="不可">處置完成並經核准前，不得移回原工作區</div><div class="底">第 ${第幾次} 次列印｜列印時間 ${轉義(完整時間())}<br><b>化新精密｜智慧5S管理平台 v${版本}</b>｜中央資料可追溯</div></div><div class="no-print"><button onclick="window.print()">🖨 再次開啟列印</button></div></body></html>`;
  }

  async function 執行列印(紅牌編號) {
    const 視窗 = window.open('', '智慧5S紅牌列印');
    if (!視窗) { 顯示提示('瀏覽器阻擋列印視窗，請允許彈出式視窗後再試'); return; }
    視窗.document.write('<!doctype html><html lang="zh-Hant-TW"><meta charset="utf-8"><body style="font-family:sans-serif;padding:30px"><h2>正在產生 5S 現場紅牌…</h2><p>正在取得掛牌序號與中央資料。</p></body></html>');
    try {
      const 紅牌 = await 取得紅牌資料(紅牌編號);
      const seq = await 取得或建立掛牌序號(紅牌);
      const 第幾次 = seq.既有列印次數 + 1;
      await 寫入列印紀錄(紅牌, seq.掛牌序號, 第幾次);
      視窗.document.open();
      視窗.document.write(列印HTML(紅牌, seq.掛牌序號, 第幾次));
      視窗.document.close();
      視窗.focus();
      setTimeout(() => { try { 視窗.print(); } catch (_) {} }, 450);
      顯示提示(`紅牌 ${seq.掛牌序號} 已產生，可直接列印掛現場`);
    } catch (e) {
      視窗.document.open();
      視窗.document.write(`<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:30px"><h2>紅牌列印失敗</h2><p>${轉義(e && e.message ? e.message : e)}</p></body>`);
      視窗.document.close();
      顯示提示(`紅牌列印失敗：${e && e.message ? e.message : e}`);
    }
  }

  function 目前彈窗紅牌編號() {
    if (文字(document.getElementById('彈窗標題')?.textContent) !== '紅牌處置') return '';
    return 文字(document.getElementById('彈窗副標')?.textContent).split('｜')[0].trim();
  }

  function 注入列印按鈕() {
    const 編號 = 目前彈窗紅牌編號();
    const 內容 = document.getElementById('彈窗內容');
    if (!編號 || !內容) return;
    const 舊 = document.getElementById('紅牌列印操作');
    if (舊 && 舊.dataset.紅牌編號 === 編號) return;
    if (舊) 舊.remove();
    const 區 = document.createElement('div');
    區.id = '紅牌列印操作';
    區.dataset.紅牌編號 = 編號;
    區.style.cssText = 'margin-top:14px;padding:12px;border:1px solid #efc4c4;background:#fff5f5;border-radius:14px';
    區.innerHTML = `<div style="font-weight:900;color:#9d1d25;margin-bottom:7px">🖨 現場實體紅牌</div><div class="提示文字" style="margin-bottom:9px">列印版型為 A5 直式；第一次列印自動產生 RP-日期-流水號，同一紅牌重印沿用同一掛牌序號。</div><button id="列印現場紅牌" class="主要按鈕 滿版" type="button">🖨 列印／另存 PDF</button>`;
    內容.appendChild(區);
    document.getElementById('列印現場紅牌')?.addEventListener('click', () => 執行列印(編號));
  }

  function 初始化() {
    注入列印按鈕();
    const 目標 = document.getElementById('彈窗遮罩') || document.body;
    new MutationObserver(() => setTimeout(注入列印按鈕, 0)).observe(目標, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化); else 初始化();
  全域.智慧5S_紅牌列印 = Object.freeze({ 版本, 執行列印 });
})(window);
