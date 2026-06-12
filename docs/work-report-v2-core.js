(() => {
  'use strict';

  /**
   * docs/work-report-v2-core.js
   * 智慧製造中央作戰指揮中心｜07_報工作業 V2
   * 正式覆寫版：v2.0.1_UI照片修正_核心覆寫完成
   *
   * 修正重點：
   * 1. 班別只允許：早班 / 大夜班
   * 2. 移除班別選單中的中班 / 加班
   * 3. 人員照片放大顯示
   * 4. 點擊人員照片不消失
   * 5. 選定人員區塊顯示照片
   * 6. 人名與工號清楚可讀
   * 7. 保留報工、工站、產品、機台、不良、照片、送出流程
   */

  const 系統版本 = 'v2.0.1_UI照片修正_核心覆寫完成';
  const 允許班別 = ['早班', '大夜班'];

  const 狀態 = {
    頁面: '人員',
    人員: [],
    產品: [],
    機台: [],
    工站群組: [],
    不良群組: { Y: [], Z: [] },
    選定人員: null,
    選定產品: null,
    選定工站: null,
    現場照片清單: []
  };

  const $ = id => document.getElementById(id);
  const $$ = selector => Array.from(document.querySelectorAll(selector));

  const 文字 = value => String(value ?? '').trim();
  const 數字 = value => {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  };

  const 安全文字 = value => {
    return 文字(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  };

  const 取元素值 = id => {
    const el = $(id);
    return el ? el.value : '';
  };

  const 設元素值 = (id, value) => {
    const el = $(id);
    if (el) el.value = value ?? '';
  };

  const 設文字 = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value ?? '';
  };

  const 設HTML = (id, html) => {
    const el = $(id);
    if (el) el.innerHTML = html ?? '';
  };

  const 加事件 = (id, eventName, handler) => {
    const el = $(id);
    if (el) el.addEventListener(eventName, handler);
  };

  function 取值(row, keys) {
    if (!row) return '';
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && 文字(row[key]) !== '') {
        return row[key];
      }
    }
    return '';
  }

  function 取陣列(data, keys) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  }

  function 正規化圖片網址(value) {
    let raw = 文字(value);
    if (!raw) return '';

    raw = raw
      .replace(/^=IMAGE\(/i, '')
      .replace(/^image\(/i, '')
      .replace(/[()"']/g, '')
      .trim();

    const urlMatch = raw.match(/https?:\/\/[^\s,，;；]+/i);
    if (urlMatch) raw = urlMatch[0];

    if (raw.startsWith('data:image/')) return raw;

    const driveId = raw.match(/[-\w]{25,}/);
    if (driveId) {
      return `https://drive.google.com/thumbnail?id=${driveId[0]}&sz=w900`;
    }

    return raw;
  }

  function 圖片HTML(url, alt, fallbackText) {
    const src = 正規化圖片網址(url);
    if (!src) return 安全文字(fallbackText || '📷');

    return `
      <img
        src="${安全文字(src)}"
        alt="${安全文字(alt || '')}"
        loading="lazy"
        referrerpolicy="no-referrer"
        decoding="async"
      >
    `;
  }

  function 判斷班別(rowOrValue) {
    if (rowOrValue && typeof rowOrValue === 'object') {
      const name = 文字(取值(rowOrValue, [
        '班別名稱',
        '標準班別',
        '顯示班別'
      ]));

      const code = 文字(取值(rowOrValue, [
        '班別代碼',
        '班別CODE',
        'shiftCode',
        '班別Code'
      ])).toUpperCase();

      const raw = 文字(取值(rowOrValue, [
        '班別',
        '班次',
        '工作班別',
        '原始班別',
        '班別時間'
      ]));

      const all = `${name}${code}${raw}`.replace(/\s+/g, '').toUpperCase();

      if (
        name.includes('大夜') ||
        name.includes('夜') ||
        raw.includes('大夜') ||
        raw.includes('夜') ||
        code === 'NIGHT' ||
        code === 'N' ||
        all.includes('NIGHT') ||
        all.includes('2300') ||
        all.includes('3150') ||
        all.includes('0315') ||
        all.includes('0750')
      ) {
        return '大夜班';
      }

      return '早班';
    }

    const value = 文字(rowOrValue);
    const all = value.replace(/\s+/g, '').toUpperCase();

    if (
      value.includes('大夜') ||
      value.includes('夜') ||
      all.includes('NIGHT') ||
      all.includes('2300') ||
      all.includes('3150') ||
      all.includes('0315') ||
      all.includes('0750')
    ) {
      return '大夜班';
    }

    return '早班';
  }

  function 班別CSS(班別) {
    return 判斷班別(班別) === '大夜班' ? '班夜' : '班早';
  }

  function 今天作業日() {
    const d = new Date();
    const hhmm = d.getHours() * 100 + d.getMinutes();

    if (hhmm < 610) {
      d.setDate(d.getDate() - 1);
    }

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function 本地日期時間() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function 顯示載入(text) {
    設文字('載入文字', text || '處理中...');
    const mask = $('載入遮罩');
    if (mask) mask.classList.add('顯示');
  }

  function 關閉載入() {
    const mask = $('載入遮罩');
    if (mask) mask.classList.remove('顯示');
  }

  function 顯示訊息(text, data) {
    const el = $('系統訊息');
    if (!el) return;

    if (data === undefined) {
      el.textContent = text;
      return;
    }

    el.textContent = `${text}\n${JSON.stringify(data, null, 2)}`;
  }

  function 更新狀態列(text) {
    設文字('狀態卡', text);
  }

  function 套用正式UI修正() {
    if ($('正式核心UI修正樣式')) return;

    const style = document.createElement('style');
    style.id = '正式核心UI修正樣式';
    style.textContent = `
      .頁首{
        padding:8px 12px 9px !important;
        min-height:auto !important;
      }

      .標題{
        font-size:18px !important;
        line-height:1.18 !important;
        margin:0 !important;
      }

      .狀態卡{
        font-size:12px !important;
        padding:6px 8px !important;
        border-radius:12px !important;
      }

      .人員列表{
        display:grid !important;
        grid-template-columns:repeat(auto-fill,minmax(150px,1fr)) !important;
        gap:14px !important;
      }

      .人員卡片{
        min-height:210px !important;
        padding:14px 10px 12px !important;
        border-radius:22px !important;
        background:#ffffff !important;
        border:2px solid #d9e6f7 !important;
        color:#15243a !important;
        box-shadow:0 10px 24px rgba(20,36,58,.10) !important;
      }

      .人員卡片.選中{
        border-color:#0b74ff !important;
        box-shadow:0 0 0 4px rgba(11,116,255,.15),0 14px 32px rgba(11,116,255,.18) !important;
        transform:translateY(-1px);
      }

      .頭像圈{
        width:128px !important;
        height:128px !important;
        border-radius:50% !important;
        overflow:hidden !important;
        margin:8px auto 10px !important;
        display:flex !important;
        align-items:center !important;
        justify-content:center !important;
        background:#eaf3ff !important;
        color:#0b74ff !important;
        font-size:44px !important;
        font-weight:900 !important;
        border:3px solid #ffffff !important;
        box-shadow:0 8px 18px rgba(20,36,58,.18) !important;
      }

      .頭像圈 img{
        width:100% !important;
        height:100% !important;
        object-fit:cover !important;
        display:block !important;
      }

      .人名{
        font-size:20px !important;
        font-weight:900 !important;
        line-height:1.2 !important;
        color:#101d31 !important;
        text-align:center !important;
      }

      .人工號{
        margin-top:4px !important;
        font-size:15px !important;
        font-weight:800 !important;
        color:#50637f !important;
        text-align:center !important;
        letter-spacing:.3px !important;
      }

      .班標{
        position:absolute !important;
        top:10px !important;
        right:10px !important;
        font-size:12px !important;
        font-weight:900 !important;
        padding:5px 8px !important;
        border-radius:999px !important;
        background:#eaf3ff !important;
        color:#0756c7 !important;
      }

      .人員卡片.班夜 .班標{
        background:#211d4d !important;
        color:#ffffff !important;
      }

      .選定人員卡{
        display:flex !important;
        align-items:center !important;
        gap:14px !important;
        padding:12px !important;
        border-radius:20px !important;
        background:#f7fbff !important;
        border:1px solid #d4e0f0 !important;
      }

      .選定人員照片{
        width:86px !important;
        height:86px !important;
        border-radius:50% !important;
        overflow:hidden !important;
        display:flex !important;
        align-items:center !important;
        justify-content:center !important;
        flex:0 0 auto !important;
        background:#eaf3ff !important;
        color:#0b74ff !important;
        font-size:34px !important;
        font-weight:900 !important;
        box-shadow:0 8px 20px rgba(20,36,58,.14) !important;
      }

      .選定人員照片 img{
        width:100% !important;
        height:100% !important;
        object-fit:cover !important;
        display:block !important;
      }

      .選定人員姓名{
        font-size:22px !important;
        font-weight:950 !important;
        color:#101d31 !important;
        line-height:1.2 !important;
      }

      .選定人員資料{
        margin-top:6px !important;
        font-size:15px !important;
        font-weight:750 !important;
        line-height:1.55 !important;
        color:#465a78 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function 正規化資料(raw) {
    const data = raw?.data || raw?.資料 || raw || {};

    狀態.人員 = 取陣列(data, ['人員', '人員主檔', 'staff', '人員清單']).map(row => {
      const 工號 = 文字(取值(row, [
        '工號',
        '員工編號',
        '員工工號',
        'id',
        'ID'
      ]));

      const 姓名 = 文字(取值(row, [
        '姓名',
        '中文名',
        '名字',
        'name',
        'Name'
      ]));

      return {
        ...row,
        工號,
        姓名,
        部門: 文字(取值(row, ['部門', '單位', 'dept', 'Dept'])),
        組別: 文字(取值(row, ['組別', '班組', 'group', 'Group'])),
        職稱: 文字(取值(row, ['職稱', '職位', 'title', 'Title'])),
        班別: 判斷班別(row),
        照片: 正規化圖片網址(取值(row, [
          '人員照片網址',
          '人員縮圖網址',
          '人員照片縮圖網址',
          '人員照片',
          '照片網址',
          '縮圖網址',
          '作業員照片網址',
          '作業員縮圖網址',
          '頭像網址',
          '圖片網址',
          '人員照片檔案ID',
          'Google檔案ID',
          '照片檔案ID',
          '檔案ID'
        ]))
      };
    }).filter(p => p.工號 || p.姓名);

    狀態.產品 = 取陣列(data, ['產品', '產品主檔', 'products', '產品清單']).map(row => {
      return {
        ...row,
        產品編號: 文字(取值(row, [
          '產品編號',
          '料號',
          '品號',
          '產品料號'
        ])),
        客戶品號: 文字(取值(row, [
          '客戶品號',
          '客戶料號'
        ])),
        品名: 文字(取值(row, [
          '品名',
          '產品名稱',
          'name',
          'Name'
        ])),
        產品照片: 正規化圖片網址(取值(row, [
          '產品主圖網址',
          '產品主圖縮圖網址',
          '產品照片網址',
          '產品縮圖網址',
          '產品主圖',
          '產品照片',
          '前視圖網址',
          '側視圖網址',
          '俯視圖網址',
          '照片網址',
          '圖片網址',
          '產品照片檔案ID',
          'Google檔案ID'
        ]))
      };
    }).filter(p => p.產品編號 || p.客戶品號 || p.品名);

    狀態.機台 = 取陣列(data, ['機台', '機台主檔', 'machines', '機台清單']).map(row => {
      return {
        ...row,
        機台編號: 文字(取值(row, [
          '機台編號',
          '機台代號',
          '設備編號'
        ])),
        機台名稱: 文字(取值(row, [
          '機台名稱',
          '設備名稱',
          '名稱'
        ])),
        照片: 正規化圖片網址(取值(row, [
          '機台照片',
          '機台照片網址',
          '照片網址',
          '縮圖網址',
          '機台照片檔案ID',
          'Google檔案ID'
        ]))
      };
    }).filter(m => m.機台編號 || m.機台名稱);

    let groups = 取陣列(data, [
      '報工工站群組',
      '途程工站群組',
      '工件工站',
      'workItems',
      '工站關聯'
    ]);

    if (!groups.length) {
      groups = 狀態.產品.map(p => ({
        ...p,
        工站名稱: '未指定工站'
      }));
    }

    狀態.工站群組 = groups
      .map(正規化工站群組)
      .filter(g => g.產品編號 || g.品名 || g.工站名稱);

    const badObject = data.不良原因 || data.不良群組;

    if (badObject && typeof badObject === 'object' && !Array.isArray(badObject)) {
      狀態.不良群組 = badObject;
    } else {
      const list = 取陣列(data, [
        '不良代號',
        '不良代碼',
        '不良主檔',
        'defects'
      ]);

      狀態.不良群組 = list.reduce((acc, row) => {
        const code = 文字(取值(row, [
          '不良代號',
          '不良代碼',
          '代碼'
        ]));

        const group = 文字(取值(row, ['分類', '類別'])) || code.charAt(0) || 'Z';

        if (!acc[group]) acc[group] = [];

        acc[group].push({
          代碼: code,
          名稱: 文字(取值(row, [
            '不良名稱',
            '中文名稱',
            '名稱'
          ])),
          英文名稱: 文字(取值(row, [
            '英文名稱',
            '英文'
          ]))
        });

        return acc;
      }, { Y: [], Z: [] });
    }
  }

  function 找產品(row) {
    const keys = [
      文字(取值(row, ['產品編號', '料號', '品號'])),
      文字(取值(row, ['客戶品號', '客戶料號'])),
      文字(取值(row, ['品名', '產品名稱']))
    ].filter(Boolean);

    return 狀態.產品.find(p => {
      return [p.產品編號, p.客戶品號, p.品名].some(k => k && keys.includes(k));
    }) || {};
  }

  function 正規化工站群組(row) {
    const product = 找產品(row);

    const machineText = 文字(取值(row, [
      '機台清單',
      '機台編號清單',
      '機台編號',
      '主機台'
    ]));

    const ids = Array.isArray(row.機台清單)
      ? row.機台清單.map(x => 文字(x.機台編號 || x.主機台 || x)).filter(Boolean)
      : machineText.split(/[、,，;；\s]+/).filter(Boolean);

    const machines = ids.map(id => {
      const found = 狀態.機台.find(m => m.機台編號 === id) || {};
      return {
        機台編號: id,
        機台名稱: found.機台名稱 || id,
        照片: found.照片 || ''
      };
    });

    return {
      ...row,
      產品編號: 文字(取值(row, ['產品編號', '料號', '品號'])) || product.產品編號 || '',
      客戶品號: 文字(取值(row, ['客戶品號', '客戶料號'])) || product.客戶品號 || '',
      品名: 文字(取值(row, ['品名', '產品名稱'])) || product.品名 || '',
      產品照片: 正規化圖片網址(取值(row, [
        '產品主圖網址',
        '產品主圖縮圖網址',
        '產品照片網址',
        '產品縮圖網址',
        '產品主圖',
        '產品照片',
        '前視圖網址',
        '側視圖網址',
        '俯視圖網址'
      ])) || product.產品照片 || '',
      工站名稱: 文字(取值(row, [
        '報工工站名稱',
        '工站名稱',
        '名稱',
        '工站編號',
        '工站代碼'
      ])) || '未指定工站',
      工序: 文字(取值(row, [
        '工序',
        '工序範圍',
        '工序清單'
      ])),
      主機台: 文字(取值(row, ['主機台'])) || machines[0]?.機台編號 || '',
      機台清單: machines
    };
  }

  function 產品Key(g) {
    return [g.產品編號, g.客戶品號, g.品名].map(文字).join('|');
  }

  function 工站Key(g) {
    return [
      g.產品編號,
      g.客戶品號,
      g.品名,
      g.工站名稱,
      g.工序,
      g.主機台
    ].map(文字).join('|');
  }

  async function 載入資料() {
    顯示載入('載入主檔中...');

    try {
      if (!globalThis.GAS橋接器 || typeof globalThis.GAS橋接器.取得報工初始資料 !== 'function') {
        throw new Error('GAS橋接器未載入，請確認 docs/app.html 或 work-report-v2.html 已載入橋接器設定。');
      }

      const raw = await globalThis.GAS橋接器.取得報工初始資料();

      正規化資料(raw);
      重新繪製();

      const 人員照片數 = 狀態.人員.filter(x => x.照片).length;
      const 產品照片數 = 狀態.工站群組.filter(x => x.產品照片).length;
      const 機台照片數 = 狀態.工站群組.reduce((sum, g) => {
        return sum + (g.機台清單 || []).filter(m => m.照片).length;
      }, 0);

      更新狀態列(
        `🟢 PWA 已連線｜人員:${狀態.人員.length}｜工站:${狀態.工站群組.length}｜照片:人員${人員照片數}/產品${產品照片數}/機台${機台照片數}｜${系統版本}`
      );

      顯示訊息('✅ 主檔載入完成', {
        人員: 狀態.人員.length,
        人員照片: 人員照片數,
        產品: 狀態.產品.length,
        工站: 狀態.工站群組.length,
        產品照片: 產品照片數,
        機台照片: 機台照片數,
        班別: 允許班別
      });
    } catch (error) {
      更新狀態列(`🔴 載入失敗｜${error.message}`);
      顯示訊息(`❌ ${error.message}`);
    } finally {
      關閉載入();
    }
  }

  function 重新繪製() {
    繪班別();
    繪人員();
    繪選定人員();
    繪產品();
    繪工站();
    繪機台();
    繪不良();
    更新預覽();
  }

  function 繪班別() {
    const select = $('班別');
    if (!select) return;

    select.innerHTML = 允許班別
      .map(name => `<option value="${安全文字(name)}">${安全文字(name)}</option>`)
      .join('');

    const selected = 狀態.選定人員?.班別;
    select.value = 允許班別.includes(selected) ? selected : '早班';

    設元素值('作業日', 今天作業日());
  }

  function 繪人員() {
    const q = 文字(取元素值('搜尋人員')).toLowerCase();

    const 常用 = 狀態.人員.slice(0, 8);
    設HTML('常用列', 常用.map(p => {
      return `<button class="常用人員" type="button" data-id="${安全文字(p.工號)}">${安全文字(p.姓名 || p.工號)}</button>`;
    }).join(''));

    const 常用列 = $('常用列');
    if (常用列) {
      常用列.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => 選人(btn.dataset.id));
      });
    }

    const rows = 狀態.人員.filter(p => {
      if (!q) return true;
      return [p.工號, p.姓名, p.班別, p.部門, p.組別]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    const html = rows.map(p => {
      const selected = 狀態.選定人員?.工號 === p.工號 ? '選中' : '';
      const fallback = (p.姓名 || p.工號 || '?').charAt(0);
      const img = p.照片
        ? 圖片HTML(p.照片, p.姓名 || p.工號, fallback)
        : 安全文字(fallback);

      return `
        <button
          class="人員卡片 ${班別CSS(p.班別)} ${selected}"
          type="button"
          data-id="${安全文字(p.工號)}"
        >
          <span class="班標">${安全文字(p.班別)}</span>
          <div class="頭像圈">${img}</div>
          <div class="人名">${安全文字(p.姓名 || '未命名')}</div>
          <div class="人工號">${安全文字(p.工號 || '')}</div>
        </button>
      `;
    }).join('');

    設HTML('人員列表', html || '<div class="空狀態">找不到人員</div>');

    const list = $('人員列表');
    if (list) {
      list.querySelectorAll('.人員卡片').forEach(btn => {
        btn.addEventListener('click', () => 選人(btn.dataset.id));
      });
    }
  }

  function 選人(id) {
    狀態.選定人員 = 狀態.人員.find(p => p.工號 === id) || null;

    if (狀態.選定人員) {
      const 班別 = 允許班別.includes(狀態.選定人員.班別)
        ? 狀態.選定人員.班別
        : '早班';

      設元素值('班別', 班別);
    }

    繪班別();
    繪人員();
    繪選定人員();
    更新預覽();
  }

  function 繪選定人員() {
    const box = $('選定人員資訊');
    if (!box) return;

    const p = 狀態.選定人員;

    if (!p) {
      box.innerHTML = '<div class="小字" style="margin-bottom:10px">尚未選定人員。請點選上方人員卡片。</div>';
      return;
    }

    const fallback = (p.姓名 || p.工號 || '?').charAt(0);
    const img = p.照片
      ? 圖片HTML(p.照片, p.姓名 || p.工號, fallback)
      : 安全文字(fallback);

    box.innerHTML = `
      <div class="選定人員卡">
        <div class="選定人員照片">${img}</div>
        <div>
          <div class="選定人員姓名">${安全文字(p.姓名 || '未命名')}</div>
          <div class="選定人員資料">
            工號：${安全文字(p.工號 || '')}<br>
            班別：${安全文字(p.班別 || '早班')}<br>
            ${安全文字([p.部門, p.組別, p.職稱].filter(Boolean).join('｜'))}
          </div>
        </div>
      </div>
    `;
  }

  function 繪產品() {
    const q = 文字(取元素值('搜尋工件')).toLowerCase();
    const map = new Map();

    狀態.工站群組.forEach(g => {
      const key = 產品Key(g);
      if (!map.has(key)) map.set(key, g);
    });

    const rows = Array.from(map.values()).filter(g => {
      if (!q) return true;
      return [g.產品編號, g.客戶品號, g.品名]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    const html = rows.map(g => {
      const selected = 狀態.選定產品 && 產品Key(狀態.選定產品) === 產品Key(g)
        ? '選中'
        : '';

      return `
        <button
          class="產品卡片 ${selected}"
          type="button"
          data-key="${安全文字(產品Key(g))}"
        >
          <div class="產品圖">
            ${g.產品照片 ? 圖片HTML(g.產品照片, g.品名, '📦') : '📦'}
          </div>
          <div class="產品資訊">
            <div class="產品名">${安全文字(g.品名 || g.產品編號 || '未命名產品')}</div>
            <div class="產品副">${安全文字(g.產品編號 || '')}｜${安全文字(g.客戶品號 || '')}</div>
          </div>
        </button>
      `;
    }).join('');

    設HTML('產品列表', html || '<div class="空狀態">找不到產品</div>');

    const list = $('產品列表');
    if (list) {
      list.querySelectorAll('.產品卡片').forEach(btn => {
        btn.addEventListener('click', () => 選產品(btn.dataset.key));
      });
    }
  }

  function 選產品(key) {
    狀態.選定產品 = 狀態.工站群組.find(g => 產品Key(g) === key) || null;
    狀態.選定工站 = null;

    繪產品();
    繪工站();
    更新預覽();
  }

  function 繪工站() {
    const select = $('工站選擇');
    if (!select) return;

    if (!狀態.選定產品) {
      select.innerHTML = '<option value="">請先選擇產品</option>';
      設文字('工站提示', '選產品後會列出此產品可報工工站。');
      設HTML('機台清單', '<div class="空狀態">請先選擇產品與工站</div>');
      return;
    }

    const rows = 狀態.工站群組.filter(g => {
      return 產品Key(g) === 產品Key(狀態.選定產品);
    });

    select.innerHTML = rows.map(g => {
      const label = [g.工站名稱, g.工序, g.主機台].filter(Boolean).join('｜') || '未指定工站';
      return `<option value="${安全文字(工站Key(g))}">${安全文字(label)}</option>`;
    }).join('');

    if (!狀態.選定工站) {
      狀態.選定工站 = rows[0] || null;
    }

    if (狀態.選定工站) {
      select.value = 工站Key(狀態.選定工站);
    }

    設文字('工站提示', `此產品可選工站：${rows.length} 筆`);
    繪機台();
  }

  function 繪機台() {
    const g = 狀態.選定工站;

    if (!g) {
      設HTML('機台清單', '<div class="空狀態">請先選擇工站</div>');
      return;
    }

    const rows = g.機台清單 || [];

    const html = rows.map(m => {
      return `
        <div class="機台卡">
          ${m.照片 ? 圖片HTML(m.照片, m.機台編號, '無機圖') : '<div class="無圖">無機圖</div>'}
          <div class="機台號">${安全文字(m.機台編號 || '')}</div>
          <div class="小字">${安全文字(m.機台名稱 || '')}</div>
        </div>
      `;
    }).join('');

    設HTML('機台清單', html || '<div class="空狀態">此工站未設定機台</div>');
  }

  function 填不良選單(select) {
    if (!select) return;

    const current = select.value;
    let html = '<option value="">— 選擇不良原因 —</option>';

    Object.keys(狀態.不良群組 || {}).sort().forEach(group => {
      html += `<optgroup label="${安全文字(group)} 類">`;

      html += (狀態.不良群組[group] || []).map(item => {
        const code = 文字(item.代碼 || item.不良代號 || item.不良代碼);
        const name = 文字(item.名稱 || item.不良名稱 || item.中文名稱);
        const en = 文字(item.英文名稱 || item.英文);

        const label = [code, name, en].filter(Boolean).join('｜');

        return `
          <option
            value="${安全文字(code)}"
            data-cat="${安全文字(group)}"
            data-name="${安全文字(name)}"
            data-en="${安全文字(en)}"
          >${安全文字(label)}</option>
        `;
      }).join('');

      html += '</optgroup>';
    });

    select.innerHTML = html;
    if (current) select.value = current;
  }

  function 新增不良() {
    const area = $('不良分配區');
    if (!area) return;

    const div = document.createElement('div');
    div.className = '不良行';
    div.innerHTML = `
      <select class="不良選單"></select>
      <input class="不良數量" type="number" min="0" inputmode="numeric" value="0">
      <button class="刪除鈕" type="button">×</button>
    `;

    area.appendChild(div);

    const select = div.querySelector('.不良選單');
    const qty = div.querySelector('.不良數量');
    const remove = div.querySelector('.刪除鈕');

    填不良選單(select);

    select.addEventListener('change', 更新預覽);
    qty.addEventListener('input', 更新預覽);

    remove.addEventListener('click', () => {
      const rows = $$('.不良行');

      if (rows.length > 1) {
        div.remove();
      } else {
        select.value = '';
        qty.value = '0';
      }

      更新預覽();
    });
  }

  function 繪不良() {
    if (!$$('.不良行').length) {
      新增不良();
    }

    $$('.不良選單').forEach(填不良選單);
  }

  function 取不良分配() {
    return $$('.不良行').map(row => {
      const select = row.querySelector('.不良選單');
      const qtyInput = row.querySelector('.不良數量');
      const option = select?.selectedOptions?.[0];

      const code = 文字(select?.value);
      const qty = 數字(qtyInput?.value);

      return {
        分類: 文字(option?.dataset.cat || code.charAt(0)),
        不良代號: code,
        不良名稱: 文字(option?.dataset.name),
        英文名稱: 文字(option?.dataset.en),
        數量: qty
      };
    }).filter(x => x.不良代號 && x.數量 > 0);
  }

  function 計算工時分鐘() {
    const start = 取元素值('開始時間');
    const end = 取元素值('結束時間');

    if (!start || !end) return '';

    const minutes = (new Date(end) - new Date(start)) / 60000;

    return minutes > 0 ? Math.round(minutes) : '';
  }

  function 組報工Payload() {
    const person = 狀態.選定人員 || {};
    const station = 狀態.選定工站 || {};
    const defects = 取不良分配();

    const total = 數字(取元素值('今日共做數'));
    const quickNg = 數字(取元素值('快速不良數'));
    const detailNg = defects.reduce((sum, item) => sum + 數字(item.數量), 0);

    const ng = Math.max(quickNg, detailNg);
    const good = Math.max(total - ng, 0);
    const firstDefect = defects[0] || {};

    const 班別 = 允許班別.includes(取元素值('班別'))
      ? 取元素值('班別')
      : '早班';

    return {
      來源: 'GitHub_Pages_PWA_正式整合版',
      版本: 系統版本,
      作業日: 今天作業日(),

      工號: person.工號 || '',
      姓名: person.姓名 || '',
      班別,
      作業員照片網址: person.照片 || '',

      產品編號: station.產品編號 || '',
      客戶品號: station.客戶品號 || '',
      品名: station.品名 || '',
      產品照片網址: station.產品照片 || '',

      工站名稱: station.工站名稱 || '',
      報工工站名稱: station.工站名稱 || '',
      工序: station.工序 || '',
      主機台: station.主機台 || '',

      機台清單: (station.機台清單 || []).map(m => m.機台編號).join('、'),
      機台照片清單: (station.機台清單 || []).map(m => ({
        機台編號: m.機台編號,
        照片網址: m.照片 || ''
      })),

      今日共做數: total,
      產出數量: total,
      不良數: ng,
      實際良品數: good,

      開始時間: 取元素值('開始時間'),
      結束時間: 取元素值('結束時間'),
      實際工時: 計算工時分鐘(),

      是否加班: 取元素值('是否加班'),
      加班類型: 取元素值('加班類型'),

      不良類別: ng > 0 ? (firstDefect.分類 || 取元素值('責任歸屬')) : '無',
      不良代碼: firstDefect.不良代號 || '',
      不良原因: firstDefect.不良名稱 || '',
      不良分配: defects,

      異常類型: 取元素值('異常類型'),
      責任歸屬: 取元素值('責任歸屬'),
      異常開始時間: 取元素值('異常開始時間'),
      異常結束時間: 取元素值('異常結束時間'),

      照片備註: 取元素值('照片備註'),
      備註: 取元素值('照片備註'),
      現場照片清單: 狀態.現場照片清單,
      照片數量: 狀態.現場照片清單.length,

      狀態: '有效'
    };
  }

  function 更新預覽() {
    const payload = 組報工Payload();

    設元素值('實際工時', payload.實際工時);
    設元素值('實際良品數', payload.實際良品數);

    設文字('卡產出', payload.今日共做數);
    設文字('卡不良', payload.不良數);
    設文字('卡良品', payload.實際良品數);

    const preview = $('報工預覽');
    if (preview) {
      preview.textContent = JSON.stringify(payload, null, 2);
    }
  }

  function 補預設時間() {
    const now = 本地日期時間();

    if (!取元素值('開始時間')) 設元素值('開始時間', now);
    if (!取元素值('結束時間')) 設元素值('結束時間', now);
  }

  function 切頁(page) {
    狀態.頁面 = page;

    $$('.分頁 button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === page);
    });

    $$('.頁面').forEach(section => {
      section.classList.toggle('隱藏', section.dataset.page !== page);
    });

    if (page === '產出') {
      補預設時間();
    }

    const submit = $('送出報工');
    if (submit) {
      submit.textContent = page === '品質' ? '確認送出' : '送出預覽';
    }

    更新預覽();

    try {
      scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {
      scrollTo(0, 0);
    }
  }

  async function 送出報工() {
    const payload = 組報工Payload();
    const errors = [];

    if (!payload.工號) errors.push('請選擇作業員');
    if (!payload.品名 && !payload.產品編號) errors.push('請選擇產品');
    if (!payload.報工工站名稱) errors.push('請選擇工站');
    if (!payload.今日共做數) errors.push('今日共做數必須大於 0');
    if (payload.不良數 > payload.今日共做數) errors.push('不良數不可大於今日共做數');

    if (errors.length) {
      顯示訊息(`❌ ${errors.join('；')}`);
      return;
    }

    顯示載入('送出報工中...');

    try {
      if (!globalThis.GAS橋接器 || typeof globalThis.GAS橋接器.寫入報工 !== 'function') {
        throw new Error('GAS橋接器未提供寫入報工方法。');
      }

      const result = await globalThis.GAS橋接器.寫入報工(payload);

      顯示訊息('✅ 報工成功', result);
      更新狀態列(`🟢 報工成功｜${系統版本}`);
    } catch (error) {
      顯示訊息(`❌ 報工失敗：${error.message}`, payload);
      更新狀態列(`🔴 報工失敗｜${error.message}`);
    } finally {
      關閉載入();
    }
  }

  function 讀照片(files, source) {
    const list = Array.from(files || []);
    const remain = Math.max(12 - 狀態.現場照片清單.length, 0);

    list.slice(0, remain).forEach(file => {
      const reader = new FileReader();

      reader.onload = event => {
        狀態.現場照片清單.push({
          base64: event.target.result,
          mime: file.type || 'image/jpeg',
          檔名: file.name || `${source}_${Date.now()}.jpg`,
          來源: source,
          備註: 取元素值('照片備註'),
          時間戳: new Date().toISOString()
        });

        繪照片();
        更新預覽();
      };

      reader.readAsDataURL(file);
    });
  }

  function 繪照片() {
    const html = 狀態.現場照片清單.map((photo, index) => {
      return `
        <div class="照片項">
          <img src="${安全文字(photo.base64)}" alt="現場照片${index + 1}">
          <button type="button" data-index="${index}">×</button>
        </div>
      `;
    }).join('');

    設HTML('照片格', html);
    設文字('照片計數', `${狀態.現場照片清單.length} / 12 張照片`);

    const grid = $('照片格');
    if (grid) {
      grid.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = Number(btn.dataset.index);
          狀態.現場照片清單.splice(index, 1);
          繪照片();
          更新預覽();
        });
      });
    }
  }

  function 綁定事件() {
    $$('.分頁 button').forEach(btn => {
      btn.addEventListener('click', () => 切頁(btn.dataset.tab));
    });

    加事件('搜尋人員', 'input', 繪人員);
    加事件('搜尋工件', 'input', 繪產品);

    加事件('工站選擇', 'change', () => {
      狀態.選定工站 = 狀態.工站群組.find(g => {
        return 工站Key(g) === 取元素值('工站選擇');
      }) || null;

      繪機台();
      更新預覽();
    });

    [
      '今日共做數',
      '快速不良數',
      '開始時間',
      '結束時間',
      '班別',
      '是否加班',
      '加班類型',
      '異常類型',
      '責任歸屬',
      '異常開始時間',
      '異常結束時間',
      '照片備註'
    ].forEach(id => {
      加事件(id, 'input', 更新預覽);
      加事件(id, 'change', 更新預覽);
    });

    加事件('新增不良', 'click', () => {
      新增不良();
      更新預覽();
    });

    加事件('下一步', 'click', () => {
      const order = ['人員', '工件', '產出', '品質'];
      const index = order.indexOf(狀態.頁面);
      切頁(order[Math.min(index + 1, order.length - 1)]);
    });

    加事件('上一步', 'click', () => {
      const order = ['人員', '工件', '產出', '品質'];
      const index = order.indexOf(狀態.頁面);
      切頁(order[Math.max(index - 1, 0)]);
    });

    加事件('送出報工', 'click', () => {
      if (狀態.頁面 === '品質') {
        送出報工();
      } else {
        const next = $('下一步');
        if (next) next.click();
      }
    });

    加事件('重整鈕', 'click', 載入資料);

    加事件('全螢幕鈕', 'click', () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    });

    加事件('拍照鈕', 'click', () => {
      const input = $('照片拍照');
      if (input) input.click();
    });

    加事件('選圖鈕', 'click', () => {
      const input = $('照片選檔');
      if (input) input.click();
    });

    加事件('清除照片鈕', 'click', () => {
      狀態.現場照片清單 = [];
      繪照片();
      更新預覽();
    });

    加事件('照片拍照', 'change', event => {
      讀照片(event.target.files, '拍照');
      event.target.value = '';
    });

    加事件('照片選檔', 'change', event => {
      讀照片(event.target.files, '選圖');
      event.target.value = '';
    });
  }

  function 初始化() {
    套用正式UI修正();
    綁定事件();

    設元素值('作業日', 今天作業日());
    補預設時間();
    繪班別();
    切頁('人員');

    載入資料();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', 初始化);
})();
