(function (全域) {
  'use strict';

  /**
   * 化新精密｜智慧5S管理平台
   * 紅牌 QR 掃碼與處置閉環 v1.1.8
   *
   * 功能：
   * 1. 紅牌可列印 A5 含 QR 實體掛牌。
   * 2. QR 僅帶入紅牌編號與掛牌序號，不帶入敏感內容。
   * 3. iPhone 相機掃 QR 後可直接開啟該紅牌案件。
   * 4. 現場人員可「開始處理」→「拍處置後照片並送複查」。
   * 5. 主管確認處置後照片後才可結案。
   * 6. 所有動作寫入 5S_紅牌處置歷程，形成可追溯閉環。
   */

  const 版本 = '1.1.8';
  const 設定 = 全域.智慧5S設定;
  const 資料庫 = 全域.智慧5S資料庫;
  if (!設定 || !資料庫) return;

  const 分頁 = {
    紅牌: 設定.分頁.紅牌追蹤 || '5S_紅牌追蹤',
    列印: 設定.分頁.紅牌列印紀錄 || '5S_紅牌列印紀錄',
    歷程: 設定.分頁.紅牌處置歷程 || '5S_紅牌處置歷程',
    照片: 設定.分頁.照片 || '5S_照片'
  };

  const 列印欄位 = ['列印紀錄編號','紅牌編號','掛牌序號','掛牌日','列印時間','列印人工號','列印人姓名','列印版型','列印用途','備註'];
  const 歷程欄位 = ['歷程編號','紅牌編號','掛牌序號','動作','原狀態','新狀態','執行人工號','執行人姓名','執行時間','說明','照片編號','裝置識別碼'];
  const 照片欄位 = ['照片編號','參照類型','參照單號','區域代碼','上傳人工號','拍攝時間','資料摘要','儲存方式','照片資料'];

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 數值(v, 預設) { const n = Number(v); return Number.isFinite(n) ? n : (預設 || 0); }
  function 轉義(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function 補零(n, 位數) { return String(n).padStart(位數 || 2, '0'); }
  function 現在() { return new Date(); }
  function 日期字串(d) { const x = d || 現在(); return `${x.getFullYear()}-${補零(x.getMonth()+1)}-${補零(x.getDate())}`; }
  function 完整時間(d) { const x = d || 現在(); return `${日期字串(x)} ${補零(x.getHours())}:${補零(x.getMinutes())}:${補零(x.getSeconds())}`; }
  function 日期緊縮(v) {
    const s = 文字(v).replace(/\D/g, '').slice(0, 8);
    if (s.length === 8) return s;
    const d = 現在();
    return `${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}`;
  }
  function 識別碼(前綴) {
    const d = 現在();
    const t = `${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}${補零(d.getHours())}${補零(d.getMinutes())}${補零(d.getSeconds())}`;
    return `${前綴}-${t}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  }
  function 目前使用者() {
    try { return JSON.parse(localStorage.getItem('智慧5S_目前使用者') || '{}') || {}; }
    catch (_) { return {}; }
  }
  function 裝置識別碼() { return localStorage.getItem('智慧5S_裝置識別碼') || ''; }
  function 是主管() {
    const u = 目前使用者();
    return 文字(u.系統角色) === '主管' || /營運長|總經理|經理|副理|課長|主任|主管/.test(文字(u.職稱));
  }
  function 提示(msg, 類型) {
    const n = document.getElementById('通知');
    if (!n) { alert(msg); return; }
    n.textContent = msg;
    n.className = `通知 顯示${類型 ? ` ${類型}` : ''}`;
    clearTimeout(提示.計時器);
    提示.計時器 = setTimeout(() => { n.className = '通知'; }, 3600);
  }

  async function 讀分頁(名稱, 上限) {
    const r = await 資料庫.讀取分頁(名稱, 上限 || 設定.讀取上限 || 5000);
    return { 欄位: r.欄位 || [], 資料: Array.isArray(r.資料) ? r.資料 : [] };
  }
  async function 新增列(名稱, 欄位, 物件) {
    return 資料庫.送出或排隊({ 工作類型:'新增', 分頁名稱:名稱, 欄位, 值:欄位.map(k => 物件[k] ?? '') });
  }
  async function 更新列(名稱, 欄位, 列) {
    if (!列 || !列._列號) throw new Error('資料缺少列號，請重新讀取');
    return 資料庫.送出或排隊({ 工作類型:'更新', 分頁名稱:名稱, 列號:列._列號, 欄位, 值:欄位.map(k => 列[k] ?? '') });
  }

  async function 找紅牌(紅牌編號, 掛牌序號) {
    let id = 文字(紅牌編號);
    if (!id && 掛牌序號) {
      const p = await 讀分頁(分頁.列印, 5000);
      const hit = p.資料.find(x => 文字(x.掛牌序號) === 文字(掛牌序號));
      if (hit) id = 文字(hit.紅牌編號);
    }
    if (!id) throw new Error('找不到紅牌編號');
    const r = await 讀分頁(分頁.紅牌, 5000);
    const row = r.資料.find(x => 文字(x.紅牌編號) === id);
    if (!row) throw new Error(`中央資料庫找不到紅牌：${id}`);
    return { 紅牌: row, 欄位: r.欄位 };
  }

  async function 取得或建立掛牌序號(紅牌) {
    const p = await 讀分頁(分頁.列印, 5000).catch(() => ({資料:[]}));
    const 同牌 = p.資料.filter(x => 文字(x.紅牌編號) === 文字(紅牌.紅牌編號));
    const 已有 = 同牌.find(x => 文字(x.掛牌序號));
    if (已有) return { 序號: 文字(已有.掛牌序號), 次數: 同牌.length };
    const 日期碼 = 日期緊縮(紅牌.掛牌日);
    const 前綴 = `RP-${日期碼}-`;
    let 最大 = 0;
    p.資料.forEach(x => {
      const s = 文字(x.掛牌序號);
      if (!s.startsWith(前綴)) return;
      const n = Number(s.slice(前綴.length));
      if (Number.isFinite(n)) 最大 = Math.max(最大, n);
    });
    return { 序號: `${前綴}${補零(最大 + 1, 3)}`, 次數: 0 };
  }

  async function 記錄列印(紅牌, 掛牌序號, 第幾次) {
    const u = 目前使用者();
    return 新增列(分頁.列印, 列印欄位, {
      列印紀錄編號: 識別碼('5S-PRT'), 紅牌編號: 紅牌.紅牌編號, 掛牌序號,
      掛牌日: 紅牌.掛牌日, 列印時間: 完整時間(), 列印人工號: u.工號 || '', 列印人姓名: u.姓名 || '',
      列印版型: 'A5直式含QR', 列印用途: '現場實體掛牌', 備註: `第${第幾次}次列印｜智慧5S v${版本}`
    });
  }

  async function 記錄歷程(紅牌, 掛牌序號, 動作, 原狀態, 新狀態, 說明, 照片編號) {
    const u = 目前使用者();
    return 新增列(分頁.歷程, 歷程欄位, {
      歷程編號: 識別碼('5S-RPH'), 紅牌編號: 紅牌.紅牌編號, 掛牌序號: 掛牌序號 || '',
      動作, 原狀態, 新狀態, 執行人工號: u.工號 || '', 執行人姓名: u.姓名 || '', 執行時間: 完整時間(),
      說明: 說明 || '', 照片編號: 照片編號 || '', 裝置識別碼: 裝置識別碼()
    });
  }

  function 建立掃碼網址(紅牌編號, 掛牌序號) {
    const u = new URL('./index.html', location.href);
    u.search = '';
    u.searchParams.set('頁面', '紅牌');
    u.searchParams.set('紅牌編號', 紅牌編號);
    u.searchParams.set('掛牌序號', 掛牌序號);
    u.searchParams.set('來源', '紅牌QR');
    u.searchParams.set('v', '1180');
    return u.href;
  }

  function 列印版面(紅牌, 掛牌序號, 掃碼網址, 第幾次) {
    const qr = `https://quickchart.io/qr?size=220&margin=1&ecLevel=M&text=${encodeURIComponent(掃碼網址)}`;
    const 狀態 = 文字(紅牌.案件狀態) || '待處置';
    const 已結 = /已結案|已完成|作廢/.test(狀態);
    return `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${轉義(掛牌序號)}｜5S紅牌</title><style>
      @page{size:A5 portrait;margin:6mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Microsoft JhengHei","PingFang TC",sans-serif}.牌{min-height:196mm;border:4px solid #b4121b;padding:6mm;position:relative}.孔{position:absolute;top:4mm;width:8mm;height:8mm;border:2px solid #b4121b;border-radius:50%;background:#fff}.孔.左{left:6mm}.孔.右{right:6mm}.標題{text-align:center;color:#b4121b;font-size:29px;font-weight:1000;letter-spacing:5px;margin:1mm 0}.警語{text-align:center;font-weight:900;font-size:13px;margin-bottom:3mm}.上區{display:grid;grid-template-columns:1fr 34mm;gap:3mm;align-items:stretch}.序號框{border:2px solid #b4121b;background:#fff1f1;padding:3mm;text-align:center}.序號框 small{display:block;font-weight:800;color:#7a2d31}.序號框 strong{display:block;font-size:21px;letter-spacing:1px;color:#a00912;margin:1mm 0}.QR{border:2px solid #b4121b;padding:1.5mm;display:flex;align-items:center;justify-content:center;flex-direction:column}.QR img{width:29mm;height:29mm}.QR small{font-size:7px;text-align:center}.格{display:grid;grid-template-columns:28mm 1fr;border-top:1.5px solid #333;border-left:1.5px solid #333;margin-top:3mm}.格>div{border-right:1.5px solid #333;border-bottom:1.5px solid #333;padding:2.2mm;min-height:9mm;font-size:12.2px;line-height:1.35}.名{font-weight:900;background:#f3f3f3;display:flex;align-items:center}.大{font-size:16px;font-weight:900}.原因{min-height:17mm}.狀態{display:inline-block;border:2px solid ${已結?'#367a50':'#b4121b'};color:${已結?'#367a50':'#b4121b'};font-weight:1000;padding:1mm 3mm;border-radius:999px}.簽名{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;margin-top:3mm}.簽名 div{height:20mm;border:1.5px solid #333;padding:2mm;font-size:11px}.不可{margin-top:3mm;border:2px dashed #b4121b;padding:2.5mm;text-align:center;color:#b4121b;font-weight:1000;font-size:13px}.底{text-align:center;font-size:8.5px;color:#555;margin-top:2mm}.no-print{text-align:center;margin:8px}.no-print button{font-size:18px;padding:10px 18px;border:0;border-radius:10px;background:#b4121b;color:#fff;font-weight:900}@media print{.no-print{display:none}.牌{page-break-inside:avoid}}
      </style></head><body><div class="牌"><span class="孔 左"></span><span class="孔 右"></span><div class="標題">5S 紅牌</div><div class="警語">非必要品／待處置物品識別卡</div><div class="上區"><div class="序號框"><small>實體掛牌序號</small><strong>${轉義(掛牌序號)}</strong><small>系統紅牌：${轉義(紅牌.紅牌編號)}</small><small>第 ${第幾次} 次列印</small></div><div class="QR"><img src="${qr}" alt="掃碼查看紅牌" onerror="this.style.display='none';this.nextElementSibling.textContent='QR暫時無法產生，請輸入掛牌序號查詢';"><small>iPhone 相機掃碼<br>查看／處置此紅牌</small></div></div><div class="格">
      <div class="名">物品名稱</div><div class="大">${轉義(紅牌.物品名稱 || '未填')}</div>
      <div class="名">規格型號</div><div>${轉義(紅牌.規格型號 || '—')}</div>
      <div class="名">數量</div><div>${轉義(紅牌.數量 || '')} ${轉義(紅牌.單位 || '')}</div>
      <div class="名">掛牌日期</div><div>${轉義(紅牌.掛牌日 || '未填')}</div>
      <div class="名">部門／區域</div><div>${轉義(紅牌.部門 || '')}｜${轉義(紅牌.區域 || '')}</div>
      <div class="名">紅牌原因</div><div class="原因">${轉義(紅牌.紅牌原因 || '待補')}</div>
      <div class="名">暫存位置</div><div>${轉義(紅牌.暫存位置 || '待設定')}</div>
      <div class="名">處置建議</div><div>${轉義(紅牌.處置建議 || '待決議')}</div>
      <div class="名">責任部門／人</div><div>${轉義(紅牌.責任部門 || '')}｜${轉義(紅牌.責任人 || '待指派')}</div>
      <div class="名">預定處置日</div><div>${轉義(紅牌.預定處置日 || '未設定')}</div>
      <div class="名">案件狀態</div><div><span class="狀態">${轉義(狀態)}</span></div>
      <div class="名">盤點編號</div><div>${轉義(紅牌.盤點編號 || '—')}</div>
      </div><div class="簽名"><div>掛牌人：<br><br>日期：</div><div>責任人：<br><br>日期：</div><div>複查／結案：<br><br>日期：</div></div><div class="不可">處置完成並經主管複查前，不得移回原工作區</div><div class="底">智慧5S v${版本}｜若 QR 無法使用，可在「紅牌」頁輸入掛牌序號查詢：${轉義(掛牌序號)}</div></div><div class="no-print"><button onclick="window.print()">列印 A5 紅牌</button></div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),900));<\/script></body></html>`;
  }

  async function 列印含QR(紅牌編號) {
    const w = window.open('', '_blank');
    if (!w) return 提示('瀏覽器阻擋新視窗，請允許彈出視窗後重試', '警告');
    w.document.write('<p style="font-family:sans-serif;padding:24px">正在建立含 QR 紅牌，請稍候…</p>');
    try {
      const { 紅牌 } = await 找紅牌(紅牌編號, '');
      const s = await 取得或建立掛牌序號(紅牌);
      const 第幾次 = s.次數 + 1;
      await 記錄列印(紅牌, s.序號, 第幾次).catch(() => null);
      const link = 建立掃碼網址(紅牌.紅牌編號, s.序號);
      w.document.open(); w.document.write(列印版面(紅牌, s.序號, link, 第幾次)); w.document.close();
      提示(`已建立含QR紅牌：${s.序號}`);
    } catch (e) {
      w.document.open(); w.document.write(`<p style="font-family:sans-serif;padding:24px;color:#b4121b">紅牌列印失敗：${轉義(e.message)}</p>`); w.document.close();
      提示(`紅牌列印失敗：${e.message}`, '錯誤');
    }
  }

  async function 開始處理(紅牌編號) {
    try {
      const r = await 找紅牌(紅牌編號, '');
      const 原 = 文字(r.紅牌.案件狀態) || '待處置';
      if (/已結案|已完成|作廢/.test(原)) return 提示('此紅牌已結案或作廢，不能再開始處理', '警告');
      if (原 === '處理中' || 原 === '待複查') return 提示(`目前狀態已是「${原}」`);
      const s = await 取得或建立掛牌序號(r.紅牌).catch(() => ({序號:''}));
      const 新列 = Object.assign({}, r.紅牌, { 案件狀態:'處理中' });
      await 更新列(分頁.紅牌, r.欄位, 新列);
      await 記錄歷程(r.紅牌, s.序號, '開始處理', 原, '處理中', '現場開始處置紅牌物品', '');
      提示('紅牌已進入「處理中」');
      setTimeout(() => location.reload(), 700);
    } catch (e) { 提示(`開始處理失敗：${e.message}`, '錯誤'); }
  }

  function 讀檔(file) {
    return new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file); });
  }
  function 載入影像(src) {
    return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
  }
  async function 壓縮照片(file) {
    const 原 = await 讀檔(file);
    const img = await 載入影像(原);
    let 最大邊 = 1100;
    let 品質 = 0.72;
    const 上限 = 數值(設定.照片最大字元, 42000);
    for (let 次 = 0; 次 < 10; 次 += 1) {
      const 比 = Math.min(1, 最大邊 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * 比)); c.height = Math.max(1, Math.round(img.height * 比));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', 品質);
      if (data.length <= 上限) return data;
      if (品質 > 0.38) 品質 -= 0.08; else 最大邊 = Math.round(最大邊 * 0.82);
    }
    throw new Error('照片壓縮後仍過大，請重新拍攝或縮小照片');
  }

  async function 拍照送複查(紅牌編號) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.setAttribute('capture', 'environment');
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        提示('正在壓縮並上傳處置後照片…');
        const data = await 壓縮照片(file);
        const r = await 找紅牌(紅牌編號, '');
        const 原 = 文字(r.紅牌.案件狀態) || '待處置';
        if (/已結案|已完成|作廢/.test(原)) throw new Error('此紅牌已結案或作廢');
        const 說明 = 文字(prompt('請輸入處置結果（例：已退庫、已移轉、已報廢、核准保留）', '已完成現場處置'));
        if (!說明) throw new Error('送複查前必須填寫處置結果');
        const pic = 識別碼('5S-RP-PIC');
        const u = 目前使用者();
        await 新增列(分頁.照片, 照片欄位, {
          照片編號: pic, 參照類型:'紅牌處置後', 參照單號:r.紅牌.紅牌編號, 區域代碼:r.紅牌.區域代碼 || '',
          上傳人工號:u.工號 || '', 拍攝時間:完整時間(), 資料摘要:`${r.紅牌.物品名稱 || ''}｜${說明}`,
          儲存方式:'試算表壓縮資料', 照片資料:data
        });
        const s = await 取得或建立掛牌序號(r.紅牌).catch(() => ({序號:''}));
        const 證據 = `照片編號：${pic}｜${說明}`;
        const 新列 = Object.assign({}, r.紅牌, { 案件狀態:'待複查', 處置結果證據:證據 });
        await 更新列(分頁.紅牌, r.欄位, 新列);
        await 記錄歷程(r.紅牌, s.序號, '拍照送複查', 原, '待複查', 說明, pic);
        提示('處置後照片已上傳，案件已送主管複查');
        setTimeout(() => location.reload(), 850);
      } catch (e) { 提示(`送複查失敗：${e.message}`, '錯誤'); }
    };
    input.click();
  }

  async function 主管結案(紅牌編號) {
    try {
      if (!是主管()) return 提示('只有主管角色可以執行紅牌最終結案', '警告');
      const r = await 找紅牌(紅牌編號, '');
      const 原 = 文字(r.紅牌.案件狀態) || '';
      if (原 !== '待複查') return 提示(`目前狀態為「${原 || '未設定'}」，需先拍處置後照片並送複查`, '警告');
      const p = await 讀分頁(分頁.照片, 10000);
      const photos = p.資料.filter(x => 文字(x.參照類型) === '紅牌處置後' && 文字(x.參照單號) === 文字(紅牌編號));
      if (!photos.length) return 提示('找不到處置後照片，不允許結案', '警告');
      const 說明 = 文字(prompt('主管複查結果／結案說明', '現場確認改善完成，同意結案'));
      if (!說明) return 提示('結案前必須填寫複查結果', '警告');
      if (!confirm(`確認將紅牌「${r.紅牌.物品名稱}」結案？\n\n結案後仍保留完整歷程與照片追溯。`)) return;
      const u = 目前使用者();
      const 新列 = Object.assign({}, r.紅牌, {
        案件狀態:'已結案', 實際處置日:日期字串(), 複查人:u.姓名 || '',
        處置結果證據:`${文字(r.紅牌.處置結果證據)}｜主管複查：${說明}`,
        逾期天數: 計算逾期(r.紅牌.預定處置日)
      });
      await 更新列(分頁.紅牌, r.欄位, 新列);
      const s = await 取得或建立掛牌序號(r.紅牌).catch(() => ({序號:''}));
      await 記錄歷程(r.紅牌, s.序號, '主管複查結案', 原, '已結案', 說明, photos[photos.length - 1].照片編號 || '');
      提示('主管複查完成，紅牌已結案');
      setTimeout(() => location.reload(), 850);
    } catch (e) { 提示(`主管結案失敗：${e.message}`, '錯誤'); }
  }

  function 計算逾期(期限) {
    if (!期限) return 0;
    const t = new Date(`${期限}T23:59:59`);
    if (Number.isNaN(t.getTime())) return 0;
    return Math.max(0, Math.ceil((Date.now() - t.getTime()) / 86400000));
  }

  async function 案件卡HTML(紅牌, 掛牌序號) {
    let 歷程 = [];
    try {
      const h = await 讀分頁(分頁.歷程, 10000);
      歷程 = h.資料.filter(x => 文字(x.紅牌編號) === 文字(紅牌.紅牌編號)).slice(-5).reverse();
    } catch (_) {}
    const 結案 = /已結案|已完成|作廢/.test(文字(紅牌.案件狀態));
    const 動作 = 結案 ? '' : `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="主要按鈕" data-rp-action="start" data-rp-id="${轉義(紅牌.紅牌編號)}">開始處理</button><button class="主要按鈕" data-rp-action="photo" data-rp-id="${轉義(紅牌.紅牌編號)}">📷 拍處置後照片／送複查</button>${是主管() ? `<button class="主要按鈕" data-rp-action="close" data-rp-id="${轉義(紅牌.紅牌編號)}">✅ 主管複查結案</button>` : ''}</div>`;
    const h = 歷程.length ? `<div style="margin-top:14px"><b>最近處置歷程</b>${歷程.map(x => `<div style="padding:8px 0;border-bottom:1px solid #ddd;font-size:13px"><b>${轉義(x.動作)}</b>｜${轉義(x.原狀態)} → ${轉義(x.新狀態)}<br><span style="color:#666">${轉義(x.執行時間)}｜${轉義(x.執行人姓名)}｜${轉義(x.說明)}</span></div>`).join('')}</div>` : '';
    return `<section id="紅牌掃碼案件卡" class="卡片 紅牌卡" style="margin-bottom:14px;border:2px solid #b4121b"><div class="紅牌編號">${轉義(掛牌序號 || 紅牌.紅牌編號)}</div><h2 style="margin:10px 0 4px">${轉義(紅牌.物品名稱)}</h2><div class="卡片副標">${轉義(紅牌.區域)}｜${轉義(紅牌.數量)} ${轉義(紅牌.單位)}</div><div class="改善描述">紅牌原因：${轉義(紅牌.紅牌原因 || '待補')}</div><div class="改善描述">處置建議：${轉義(紅牌.處置建議 || '待決議')}</div><div class="改善描述">處置證據：${轉義(紅牌.處置結果證據 || '尚未上傳')}</div><div class="改善資訊"><span class="標籤 黃">${轉義(紅牌.案件狀態 || '待處置')}</span><span class="標籤">期限：${轉義(紅牌.預定處置日 || '未設定')}</span></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="次要按鈕" data-rp-action="print" data-rp-id="${轉義(紅牌.紅牌編號)}">🖨 A5含QR列印</button></div>${動作}${h}</section>`;
  }

  async function 顯示掃碼案件() {
    const q = new URLSearchParams(location.search);
    const id = 文字(q.get('紅牌編號'));
    const serial = 文字(q.get('掛牌序號'));
    if (!id && !serial) return;
    const app = document.getElementById('應用程式');
    if (!app || app.classList.contains('隱藏')) return;
    const main = document.getElementById('頁面內容');
    if (!main || document.getElementById('紅牌掃碼案件卡')) return;
    try {
      const r = await 找紅牌(id, serial);
      let s = serial;
      if (!s) s = (await 取得或建立掛牌序號(r.紅牌)).序號;
      const wrap = document.createElement('div'); wrap.innerHTML = await 案件卡HTML(r.紅牌, s);
      main.prepend(wrap.firstElementChild);
    } catch (e) {
      const box = document.createElement('section'); box.id='紅牌掃碼案件卡'; box.className='卡片'; box.innerHTML=`<b>紅牌掃碼查詢失敗</b><p>${轉義(e.message)}</p>`; main.prepend(box);
    }
  }

  function 補強紅牌頁() {
    const 標題 = 文字(document.getElementById('頁面標題')?.textContent);
    const main = document.getElementById('頁面內容');
    if (!main || !標題.includes('紅牌') || document.getElementById('紅牌序號查詢列')) return;
    const box = document.createElement('section'); box.id='紅牌序號查詢列'; box.className='卡片'; box.style.marginBottom='12px';
    box.innerHTML = `<div style="font-weight:900;margin-bottom:7px">🔎 實體掛牌序號查詢</div><div style="display:flex;gap:8px"><input id="紅牌掛牌序號輸入" class="輸入框" placeholder="例：RP-20260822-001 或系統紅牌編號"><button class="次要按鈕" data-rp-action="lookup">查詢</button></div><div class="提示文字" style="margin-top:6px">QR 無法辨識時，可直接輸入掛牌序號追溯。</div>`;
    main.prepend(box);
  }

  function 補強紅牌詳情() {
    const overlay = document.getElementById('彈窗遮罩');
    const content = document.getElementById('彈窗內容');
    const sub = 文字(document.getElementById('彈窗副標')?.textContent);
    if (!overlay || overlay.classList.contains('隱藏') || !content || document.getElementById('紅牌閉環工具')) return;
    const id = sub.split('｜')[0].trim();
    if (!id || (!/^RP-|^5S-/.test(id))) return;
    const tools = document.createElement('div'); tools.id='紅牌閉環工具'; tools.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid #ddd';
    tools.innerHTML = `<div style="font-weight:900;margin-bottom:8px">🏷 實體紅牌閉環</div><div class="按鈕列"><button class="次要按鈕" data-rp-action="print" data-rp-id="${轉義(id)}">🖨 A5含QR列印</button><button class="次要按鈕" data-rp-action="start" data-rp-id="${轉義(id)}">開始處理</button><button class="次要按鈕" data-rp-action="photo" data-rp-id="${轉義(id)}">📷 拍處置後照片／送複查</button>${是主管() ? `<button class="主要按鈕" data-rp-action="close" data-rp-id="${轉義(id)}">✅ 主管複查結案</button>` : ''}</div><div class="提示文字" style="margin-top:7px">含QR紅牌掃碼後可直接回到此案件；結案前強制要求處置後照片。</div>`;
    content.appendChild(tools);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rp-action]'); if (!b) return;
    const act = b.dataset.rpAction; const id = 文字(b.dataset.rpId);
    if (act === 'print') 列印含QR(id);
    if (act === 'start') 開始處理(id);
    if (act === 'photo') 拍照送複查(id);
    if (act === 'close') 主管結案(id);
    if (act === 'lookup') {
      const v = 文字(document.getElementById('紅牌掛牌序號輸入')?.value);
      if (!v) return 提示('請輸入掛牌序號或紅牌編號', '警告');
      const u = new URL(location.href); u.searchParams.set('頁面','紅牌');
      if (/^RP-\d{8}-\d{3}$/i.test(v)) { u.searchParams.set('掛牌序號',v); u.searchParams.delete('紅牌編號'); }
      else { u.searchParams.set('紅牌編號',v); u.searchParams.delete('掛牌序號'); }
      u.searchParams.set('來源','紅牌查詢'); location.href = u.href;
    }
  });

  function 初始化() {
    const observer = new MutationObserver(() => { 補強紅牌頁(); 補強紅牌詳情(); 顯示掃碼案件(); });
    observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    setInterval(() => { 補強紅牌頁(); 補強紅牌詳情(); 顯示掃碼案件(); }, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化); else 初始化();
  全域.智慧5S_紅牌掃碼閉環 = Object.freeze({ 版本, 列印含QR, 開始處理, 拍照送複查, 主管結案 });
})(window);
