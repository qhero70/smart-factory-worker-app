(() => {
  'use strict';

  const 版本 = 'v2.0.0_正式整合版_無補丁_無中班';
  const 狀態 = { 人員: [], 產品: [], 群組: [], 機台: [], 不良群組: { Y: [], Z: [] }, 選人: null, 選產品: null, 選工件: null, 頁: '人員', 照片: [] };
  const $ = id => document.getElementById(id);
  const $$ = q => Array.from(document.querySelectorAll(q));
  const 文字 = v => String(v ?? '').trim();
  const 數字 = v => Number(v || 0) || 0;
  const 逸出 = s => 文字(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  function 取值(row, keys) {
    for (const key of keys) if (row && row[key] !== undefined && row[key] !== null && 文字(row[key]) !== '') return row[key];
    return '';
  }

  function 陣列(data, keys) {
    if (Array.isArray(data)) return data;
    for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
    return [];
  }

  function 圖片網址(value) {
    let s = 文字(value);
    if (!s) return '';
    s = s.replace(/^=IMAGE\(/i, '').replace(/["'()]/g, '').trim();
    const url = s.match(/https?:\/\/[^\s,，;；]+/i);
    if (url) s = url[0];
    if (s.startsWith('data:image/')) return s;
    const id = s.match(/[-\w]{25,}/);
    if (id) return 'https://drive.google.com/thumbnail?id=' + id[0] + '&sz=w900';
    return s;
  }

  function 圖片HTML(url, alt) {
    const src = 圖片網址(url);
    if (!src) return '<div class="無圖">📦</div>';
    return `<img src="${逸出(src)}" alt="${逸出(alt)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;無圖&quot;>📦</div>'">`;
  }

  function 判斷班別(rowOrValue) {
    if (rowOrValue && typeof rowOrValue === 'object') {
      const name = 文字(取值(rowOrValue, ['班別名稱', '標準班別', '顯示班別']));
      const code = 文字(取值(rowOrValue, ['班別代碼', '班別CODE', 'shiftCode'])).toUpperCase();
      const raw = 文字(取值(rowOrValue, ['班別', '班次', '工作班別', '原始班別', '班別時間']));
      const all = (name + ' ' + code + ' ' + raw).replace(/\s+/g, '').toUpperCase();
      if (name.includes('大夜') || name.includes('夜') || code === 'NIGHT' || code === 'N' || raw.includes('大夜') || raw.includes('夜') || all.includes('2300') || all.includes('3150') || all.includes('0315') || all.includes('0750')) return '大夜班';
      return '早班';
    }
    const t = 文字(rowOrValue);
    const all = t.replace(/\s+/g, '').toUpperCase();
    if (t.includes('大夜') || t.includes('夜') || all.includes('NIGHT') || all.includes('2300') || all.includes('3150') || all.includes('0315') || all.includes('0750')) return '大夜班';
    return '早班';
  }

  function 班別樣式(shift) { return 判斷班別(shift) === '大夜班' ? '班夜' : '班早'; }
  function 本地時間() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  function 作業日() { const d = new Date(); const hm = d.getHours() * 100 + d.getMinutes(); if (hm < 610) d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function 顯示載入(text) { $('載入文字').textContent = text; $('載入遮罩').classList.add('顯示'); }
  function 關閉載入() { $('載入遮罩').classList.remove('顯示'); }
  function 訊息(text, data) { $('系統訊息').textContent = data ? text + '\n' + JSON.stringify(data, null, 2) : text; }
  function 狀態列(text) { $('狀態卡').textContent = text; }

  function 正規化資料(raw) {
    const data = raw?.data || raw?.資料 || raw || {};

    狀態.人員 = 陣列(data, ['人員', '人員主檔', 'staff']).map(r => ({
      ...r,
      工號: 文字(取值(r, ['工號', '員工編號', '員工工號', 'id'])),
      姓名: 文字(取值(r, ['姓名', '中文名', '名字', 'name'])),
      部門: 文字(取值(r, ['部門', '單位', 'dept'])),
      組別: 文字(取值(r, ['組別', '班組', 'group'])),
      職稱: 文字(取值(r, ['職稱', '職位', 'title'])),
      班別: 判斷班別(r),
      照片: 圖片網址(取值(r, ['人員照片網址', '人員縮圖網址', '人員照片縮圖網址', '人員照片', '照片網址', '縮圖網址', '作業員照片網址', '作業員縮圖網址', '頭像網址', '圖片網址', '人員照片檔案ID', 'Google檔案ID', '照片檔案ID', '檔案ID']))
    })).filter(x => x.工號 || x.姓名);

    狀態.產品 = 陣列(data, ['產品', '產品主檔', 'products']).map(r => ({
      ...r,
      產品編號: 文字(取值(r, ['產品編號', '料號', '品號', '產品料號'])),
      客戶品號: 文字(取值(r, ['客戶品號', '客戶料號'])),
      品名: 文字(取值(r, ['品名', '產品名稱', 'name'])),
      產品照片: 圖片網址(取值(r, ['產品主圖網址', '產品主圖縮圖網址', '產品照片網址', '產品縮圖網址', '產品主圖', '產品照片', '前視圖網址', '側視圖網址', '俯視圖網址', '照片網址', '圖片網址', '產品照片檔案ID', 'Google檔案ID']))
    })).filter(x => x.產品編號 || x.品名 || x.客戶品號);

    狀態.機台 = 陣列(data, ['機台', '機台主檔', 'machines']).map(r => ({
      ...r,
      機台編號: 文字(取值(r, ['機台編號', '機台代號', '設備編號'])),
      機台名稱: 文字(取值(r, ['機台名稱', '設備名稱', '名稱'])),
      照片: 圖片網址(取值(r, ['機台照片', '機台照片網址', '照片網址', '縮圖網址', '機台照片檔案ID', 'Google檔案ID']))
    })).filter(x => x.機台編號 || x.機台名稱);

    let groups = 陣列(data, ['報工工站群組', '途程工站群組', '工件工站', 'workItems']);
    if (!groups.length) groups = 狀態.產品.map(p => ({ ...p, 工站名稱: '未指定工站' }));
    狀態.群組 = groups.map(正規化群組).filter(x => x.產品編號 || x.品名 || x.工站名稱);

    const bad = data.不良原因;
    if (bad && typeof bad === 'object' && !Array.isArray(bad)) 狀態.不良群組 = bad;
    else {
      const list = 陣列(data, ['不良代號', '不良代碼', '不良主檔', 'defects']);
      狀態.不良群組 = list.reduce((a, x) => {
        const code = 文字(取值(x, ['不良代號', '不良代碼', '代碼']));
        const key = 文字(取值(x, ['分類'])) || code.charAt(0) || 'Z';
        (a[key] || (a[key] = [])).push({ 代碼: code, 名稱: 文字(取值(x, ['不良名稱', '中文名稱', '名稱'])), 英文名稱: 文字(取值(x, ['英文名稱', '英文'])) });
        return a;
      }, { Y: [], Z: [] });
    }
  }

  function 找產品(row) {
    const keys = [文字(取值(row, ['產品編號', '料號', '品號'])), 文字(取值(row, ['客戶品號', '客戶料號'])), 文字(取值(row, ['品名', '產品名稱']))].filter(Boolean);
    return 狀態.產品.find(p => [p.產品編號, p.客戶品號, p.品名].some(k => k && keys.includes(k))) || {};
  }

  function 正規化群組(row) {
    const p = 找產品(row);
    const machineText = 文字(取值(row, ['機台清單', '機台編號清單', '機台編號', '主機台']));
    const ids = Array.isArray(row.機台清單) ? row.機台清單.map(x => 文字(x.機台編號 || x.主機台 || x)) : machineText.split(/[、,，;；\s]+/).filter(Boolean);
    const machines = ids.map(id => { const m = 狀態.機台.find(x => x.機台編號 === id) || {}; return { 機台編號: id, 機台名稱: m.機台名稱 || id, 照片: m.照片 || '' }; });
    return {
      ...row,
      產品編號: 文字(取值(row, ['產品編號', '料號', '品號'])) || p.產品編號 || '',
      客戶品號: 文字(取值(row, ['客戶品號', '客戶料號'])) || p.客戶品號 || '',
      品名: 文字(取值(row, ['品名', '產品名稱'])) || p.品名 || '',
      產品照片: 圖片網址(取值(row, ['產品主圖網址', '產品主圖縮圖網址', '產品照片網址', '產品縮圖網址', '產品主圖', '產品照片', '前視圖網址', '側視圖網址', '俯視圖網址'])) || p.產品照片 || '',
      工站名稱: 文字(取值(row, ['報工工站名稱', '工站名稱', '名稱', '工站編號', '工站代碼'])) || '未指定工站',
      工序: 文字(取值(row, ['工序', '工序範圍', '工序清單'])),
      主機台: 文字(取值(row, ['主機台'])) || (machines[0]?.機台編號 || ''),
      機台清單: machines
    };
  }

  async function 載入資料() {
    顯示載入('載入主檔中...');
    try {
      const raw = await window.GAS橋接器.取得報工初始資料();
      正規化資料(raw);
      重新繪製();
      const productPhotoCount = 狀態.群組.filter(x => x.產品照片).length;
      const machinePhotoCount = 狀態.群組.reduce((sum, g) => sum + (g.機台清單 || []).filter(m => m.照片).length, 0);
      狀態列(`🟢 PWA 已連線｜人員:${狀態.人員.length}｜工站:${狀態.群組.length}｜照片:產品${productPhotoCount}/機台${machinePhotoCount}｜${版本}`);
      訊息('✅ 主檔載入完成', { 人員: 狀態.人員.length, 產品: 狀態.產品.length, 工站: 狀態.群組.length, 產品照片: productPhotoCount, 機台照片: machinePhotoCount });
    } catch (err) {
      狀態列('🔴 載入失敗｜' + err.message);
      訊息('❌ ' + err.message);
    } finally { 關閉載入(); }
  }

  function 重新繪製() { 繪班別(); 繪人員(); 繪產品(); 繪工站(); 繪機台(); 繪不良(); 更新預覽(); }
  function 繪班別() { $('班別').innerHTML = ['早班', '大夜班', '加班'].map(x => `<option>${x}</option>`).join(''); $('班別').value = 狀態.選人?.班別 || '早班'; $('作業日').value = 作業日(); }

  function 繪人員() {
    const q = 文字($('搜尋人員').value).toLowerCase();
    $('常用列').innerHTML = 狀態.人員.slice(0, 8).map(p => `<button class="常用人員" data-id="${逸出(p.工號)}">${逸出(p.姓名 || p.工號)}</button>`).join('');
    $('常用列').querySelectorAll('button').forEach(b => b.onclick = () => 選人(b.dataset.id));
    const rows = 狀態.人員.filter(p => !q || [p.工號, p.姓名, p.班別].join(' ').toLowerCase().includes(q));
    $('人員列表').innerHTML = rows.map(p => `<button class="人員卡片 ${班別樣式(p.班別)} ${狀態.選人?.工號 === p.工號 ? '選中' : ''}" data-id="${逸出(p.工號)}"><span class="班標">${逸出(p.班別)}</span><div class="頭像圈">${p.照片 ? 圖片HTML(p.照片, p.姓名) : 逸出((p.姓名 || p.工號 || '?').charAt(0))}</div><div class="人名">${逸出(p.姓名)}</div><div class="人工號">${逸出(p.工號)}</div></button>`).join('') || '<div class="空狀態">找不到人員</div>';
    $('人員列表').querySelectorAll('.人員卡片').forEach(b => b.onclick = () => 選人(b.dataset.id));
  }
  function 選人(id) { 狀態.選人 = 狀態.人員.find(p => p.工號 === id) || null; if (狀態.選人) $('班別').value = 狀態.選人.班別 || '早班'; 繪人員(); 更新預覽(); }

  const 產品Key = g => [g.產品編號, g.客戶品號, g.品名].map(文字).join('|');
  const 群組Key = g => [g.產品編號, g.客戶品號, g.品名, g.工站名稱, g.工序, g.主機台].map(文字).join('|');

  function 繪產品() {
    const q = 文字($('搜尋工件').value).toLowerCase();
    const map = new Map();
    狀態.群組.forEach(g => { if (!map.has(產品Key(g))) map.set(產品Key(g), g); });
    const rows = Array.from(map.values()).filter(g => !q || [g.產品編號, g.客戶品號, g.品名].join(' ').toLowerCase().includes(q));
    $('產品列表').innerHTML = rows.map(g => `<button class="產品卡片 ${狀態.選產品 && 產品Key(狀態.選產品) === 產品Key(g) ? '選中' : ''}" data-key="${逸出(產品Key(g))}"><div class="產品圖">${g.產品照片 ? 圖片HTML(g.產品照片, g.品名) : '📦'}</div><div class="產品資訊"><div class="產品名">${逸出(g.品名 || g.產品編號)}</div><div class="產品副">${逸出(g.產品編號)}｜${逸出(g.客戶品號)}</div></div></button>`).join('') || '<div class="空狀態">找不到產品</div>';
    $('產品列表').querySelectorAll('.產品卡片').forEach(b => b.onclick = () => 選產品(b.dataset.key));
  }
  function 選產品(key) { 狀態.選產品 = 狀態.群組.find(g => 產品Key(g) === key) || null; 狀態.選工件 = null; 繪產品(); 繪工站(); 更新預覽(); }

  function 繪工站() {
    const select = $('工站選擇');
    if (!狀態.選產品) { select.innerHTML = '<option value="">請先選擇產品</option>'; $('工站提示').textContent = '選產品後會列出此產品可報工工站。'; $('機台清單').innerHTML = '<div class="空狀態">請先選擇產品與工站</div>'; return; }
    const rows = 狀態.群組.filter(g => 產品Key(g) === 產品Key(狀態.選產品));
    select.innerHTML = rows.map(g => `<option value="${逸出(群組Key(g))}">${逸出([g.工站名稱, g.工序, g.主機台].filter(Boolean).join('｜') || '未指定工站')}</option>`).join('');
    if (!狀態.選工件) 狀態.選工件 = rows[0] || null;
    if (狀態.選工件) select.value = 群組Key(狀態.選工件);
    $('工站提示').textContent = '此產品可選工站：' + rows.length + ' 筆';
    繪機台();
  }
  function 繪機台() { const g = 狀態.選工件; if (!g) { $('機台清單').innerHTML = '<div class="空狀態">請先選擇工站</div>'; return; } const rows = g.機台清單 || []; $('機台清單').innerHTML = rows.map(m => `<div class="機台卡">${m.照片 ? 圖片HTML(m.照片, m.機台編號) : '<div class="無圖">無機圖</div>'}<div class="機台號">${逸出(m.機台編號)}</div><div class="小字">${逸出(m.機台名稱 || '')}</div></div>`).join('') || '<div class="空狀態">此工站未設定機台</div>'; }

  function 填不良選單(select) { const cur = select.value; let html = '<option value="">— 選擇不良原因 —</option>'; Object.keys(狀態.不良群組 || {}).sort().forEach(k => { html += `<optgroup label="${逸出(k)} 類">`; html += (狀態.不良群組[k] || []).map(x => { const code = 文字(x.代碼 || x.不良代號); const name = 文字(x.名稱 || x.不良名稱); const en = 文字(x.英文名稱 || x.英文); return `<option value="${逸出(code)}" data-cat="${逸出(k)}" data-name="${逸出(name)}" data-en="${逸出(en)}">${逸出([code, name, en].filter(Boolean).join('｜'))}</option>`; }).join(''); html += '</optgroup>'; }); select.innerHTML = html; if (cur) select.value = cur; }
  function 新增不良() { const div = document.createElement('div'); div.className = '不良行'; div.innerHTML = '<select class="不良選單"></select><input class="不良數量" type="number" min="0" inputmode="numeric" value="0"><button class="刪除鈕" type="button">×</button>'; $('不良分配區').appendChild(div); 填不良選單(div.querySelector('select')); div.querySelector('select').onchange = 更新預覽; div.querySelector('input').oninput = 更新預覽; div.querySelector('button').onclick = () => { if ($$('.不良行').length > 1) div.remove(); else { div.querySelector('select').value = ''; div.querySelector('input').value = '0'; } 更新預覽(); }; }
  function 繪不良() { if (!$$('.不良行').length) 新增不良(); $$('.不良選單').forEach(填不良選單); }
  function 取不良() { return $$('.不良行').map(row => { const select = row.querySelector('select'); const opt = select.selectedOptions[0]; const qty = 數字(row.querySelector('input').value); return { 分類: 文字(opt?.dataset.cat || (select.value || '').charAt(0)), 不良代號: 文字(select.value), 不良名稱: 文字(opt?.dataset.name), 英文名稱: 文字(opt?.dataset.en), 數量: qty }; }).filter(x => x.數量 > 0 && x.不良代號); }
  function 工時計算() { const s = $('開始時間').value, e = $('結束時間').value; if (!s || !e) return ''; const m = (new Date(e) - new Date(s)) / 60000; return m > 0 ? Math.round(m) : ''; }

  function 組Payload() { const p = 狀態.選人 || {}, g = 狀態.選工件 || {}, defects = 取不良(); const out = 數字($('今日共做數').value); const ng = Math.max(數字($('快速不良數').value), defects.reduce((sum, x) => sum + 數字(x.數量), 0)); const good = Math.max(out - ng, 0); const first = defects[0] || {}; return { 來源: 'GitHub_Pages_PWA_正式整合版', 版本, 作業日: 作業日(), 工號: p.工號 || '', 姓名: p.姓名 || '', 班別: $('班別').value || p.班別 || '早班', 作業員照片網址: p.照片 || '', 產品編號: g.產品編號 || '', 客戶品號: g.客戶品號 || '', 品名: g.品名 || '', 產品照片網址: g.產品照片 || '', 工站名稱: g.工站名稱 || '', 報工工站名稱: g.工站名稱 || '', 工序: g.工序 || '', 主機台: g.主機台 || '', 機台清單: (g.機台清單 || []).map(m => m.機台編號).join('、'), 機台照片清單: (g.機台清單 || []).map(m => ({ 機台編號: m.機台編號, 照片網址: m.照片 || '' })), 今日共做數: out, 產出數量: out, 不良數: ng, 實際良品數: good, 開始時間: $('開始時間').value, 結束時間: $('結束時間').value, 實際工時: 工時計算(), 是否加班: $('是否加班').value, 加班類型: $('加班類型').value, 不良類別: ng > 0 ? (first.分類 || $('責任歸屬').value) : '無', 不良代碼: first.不良代號 || '', 不良原因: first.不良名稱 || '', 不良分配: defects, 異常類型: $('異常類型').value, 責任歸屬: $('責任歸屬').value, 異常開始時間: $('異常開始時間').value, 異常結束時間: $('異常結束時間').value, 照片備註: $('照片備註').value, 備註: $('照片備註').value, 現場照片清單: 狀態.照片, 照片數量: 狀態.照片.length, 狀態: '有效' }; }
  function 更新預覽() { const p = 組Payload(); $('實際工時').value = p.實際工時; $('實際良品數').value = p.實際良品數; $('卡產出').textContent = p.今日共做數; $('卡不良').textContent = p.不良數; $('卡良品').textContent = p.實際良品數; $('報工預覽').textContent = JSON.stringify(p, null, 2); }
  function 補時間() { const now = 本地時間(); if (!$('開始時間').value) $('開始時間').value = now; if (!$('結束時間').value) $('結束時間').value = now; }
  function 切頁(tab) { 狀態.頁 = tab; $$('.分頁 button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); $$('.頁面').forEach(s => s.classList.toggle('隱藏', s.dataset.page !== tab)); if (tab === '產出') 補時間(); $('送出報工').textContent = tab === '品質' ? '確認送出' : '送出預覽'; 更新預覽(); scrollTo({ top: 0, behavior: 'smooth' }); }

  async function 送出() { const p = 組Payload(); const errors = []; if (!p.工號) errors.push('請選擇作業員'); if (!p.品名 && !p.產品編號) errors.push('請選擇產品'); if (!p.報工工站名稱) errors.push('請選擇工站'); if (!p.今日共做數) errors.push('今日共做數必須大於 0'); if (p.不良數 > p.今日共做數) errors.push('不良數不可大於今日共做數'); if (errors.length) { 訊息('❌ ' + errors.join('；')); return; } 顯示載入('送出報工中...'); try { const r = await window.GAS橋接器.寫入報工(p); 訊息('✅ 報工成功', r); 狀態列('🟢 報工成功｜' + 版本); } catch (err) { 訊息('❌ 報工失敗：' + err.message, p); } finally { 關閉載入(); } }
  function 讀照片(files, source) { Array.from(files || []).slice(0, 12 - 狀態.照片.length).forEach(f => { const reader = new FileReader(); reader.onload = e => { 狀態.照片.push({ base64: e.target.result, mime: f.type || 'image/jpeg', 檔名: f.name || source + '_' + Date.now() + '.jpg', 來源: source, 備註: $('照片備註').value, 時間戳: new Date().toISOString() }); 繪照片(); 更新預覽(); }; reader.readAsDataURL(f); }); }
  function 繪照片() { $('照片格').innerHTML = 狀態.照片.map((p, i) => `<div class="照片項"><img src="${p.base64}"><button data-i="${i}">×</button></div>`).join(''); $('照片格').querySelectorAll('button').forEach(b => b.onclick = () => { 狀態.照片.splice(Number(b.dataset.i), 1); 繪照片(); 更新預覽(); }); $('照片計數').textContent = 狀態.照片.length + ' / 12 張照片'; }

  function 綁定() { $$('.分頁 button').forEach(b => b.onclick = () => 切頁(b.dataset.tab)); $('搜尋人員').oninput = 繪人員; $('搜尋工件').oninput = 繪產品; $('工站選擇').onchange = () => { 狀態.選工件 = 狀態.群組.find(g => 群組Key(g) === $('工站選擇').value) || null; 繪機台(); 更新預覽(); }; ['今日共做數', '快速不良數', '開始時間', '結束時間', '班別', '是否加班', '加班類型', '異常類型', '責任歸屬', '異常開始時間', '異常結束時間', '照片備註'].forEach(id => $(id).addEventListener('input', 更新預覽)); $('新增不良').onclick = () => { 新增不良(); 更新預覽(); }; $('下一步').onclick = () => { const order = ['人員', '工件', '產出', '品質']; 切頁(order[Math.min(order.indexOf(狀態.頁) + 1, 3)]); }; $('上一步').onclick = () => { const order = ['人員', '工件', '產出', '品質']; 切頁(order[Math.max(order.indexOf(狀態.頁) - 1, 0)]); }; $('送出報工').onclick = () => 狀態.頁 === '品質' ? 送出() : $('下一步').click(); $('重整鈕').onclick = 載入資料; $('全螢幕鈕').onclick = () => document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); $('拍照鈕').onclick = () => $('照片拍照').click(); $('選圖鈕').onclick = () => $('照片選檔').click(); $('清除照片鈕').onclick = () => { 狀態.照片 = []; 繪照片(); 更新預覽(); }; $('照片拍照').onchange = e => { 讀照片(e.target.files, '拍照'); e.target.value = ''; }; $('照片選檔').onchange = e => { 讀照片(e.target.files, '選圖'); e.target.value = ''; }; }
  function 初始化() { 綁定(); $('作業日').value = 作業日(); 補時間(); 切頁('人員'); 載入資料(); if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {}); }
  window.addEventListener('load', 初始化);
})();