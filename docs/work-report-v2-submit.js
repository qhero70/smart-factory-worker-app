(function(){
  'use strict';

  const 版本 = 'v1.0.2_照片班別修正';
  const 狀態 = {
    原始資料:null,
    人員:[],
    報工工站群組:[],
    產品:[],
    工站:[],
    機台:[],
    不良清單:[],
    不良群組:{Y:[],Z:[]},
    班別清單:['自動判斷','早班','中班','大夜班','加班'],
    異常類型:['無異常 / Normal','設備異常','機台停機 / Machine Down','待料 / Waiting Material','換刀 / Tool Change','品質確認 / Quality Check','其他 / Others'],
    選取人員:null,
    選取工站:null,
    當前分頁:'人員',
    送出中:false
  };

  const $ = id => document.getElementById(id);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const 文字 = value => String(value ?? '').trim();
  const 數字 = value => Number(value || 0) || 0;

  function 取欄(row, names){
    if(!row || typeof row !== 'object') return '';
    for(const name of names){
      if(row[name] !== undefined && row[name] !== null && 文字(row[name]) !== '') return row[name];
    }
    return '';
  }

  function 轉陣列(data, keys){
    if(Array.isArray(data)) return data;
    for(const key of keys){
      if(Array.isArray(data?.[key])) return data[key];
    }
    return [];
  }

  function 安全HTML(value){
    return 文字(value).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function 本地日期文字(date){
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function 取圖片網址(value){
    let s = 文字(value);
    if(!s) return '';
    s = s.replace(/^=IMAGE\(/i,'').replace(/["'()]/g,'').trim();
    const urlHit = s.match(/https?:\/\/[^\s,，;；]+/i);
    if(urlHit) s = urlHit[0];
    if(s.indexOf('data:image/') === 0) return s;
    const m = s.match(/[-\w]{25,}/);
    if(s.indexOf('drive.google.com') >= 0 && m) return 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=w800';
    if(!/^https?:\/\//i.test(s) && m) return 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=w800';
    return s;
  }

  function 圖片HTML(url, text, className){
    const src = 取圖片網址(url);
    const cls = className || '無圖';
    const safe = 安全HTML(text || '無圖');
    if(!src) return `<div class="${cls}">${safe}</div>`;
    return `<img src="${安全HTML(src)}" alt="${safe}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;${cls}&quot;>${safe}</div>'">`;
  }

  function 顯示訊息(message, detail){
    const box = $('系統訊息');
    if(!box) return;
    box.textContent = detail ? message + '\n' + (typeof detail === 'string' ? detail : JSON.stringify(detail,null,2)) : message;
  }

  function 設定狀態(text){
    const el = $('頂部狀態');
    if(el) el.textContent = text;
  }

  function 作業日(){
    const now = new Date();
    const d = new Date(now);
    const hm = now.getHours() * 100 + now.getMinutes();
    if(hm < 610) d.setDate(d.getDate() - 1);
    return 本地日期文字(d);
  }

  function 判斷班別(){
    const d = new Date();
    const hm = d.getHours() * 100 + d.getMinutes();
    if(hm >= 750 && hm < 1650) return '早班';
    if(hm >= 1650 || hm < 110) return '中班';
    return '大夜班';
  }

  function 標準化班別(value){
    const t = 文字(value);
    if(!t) return '';
    if(t === '自動判斷') return '自動判斷';
    if(t.includes('中') || t.includes('1650') || t.includes('16:50')) return '中班';
    if(t.includes('大夜') || t.includes('夜') || t.includes('2300') || t.includes('23:00') || t.includes('315') || t.includes('03:15')) return '大夜班';
    if(t.includes('加班')) return '加班';
    if(t.includes('早') || t.includes('0800') || t.includes('08:00')) return '早班';
    return t;
  }

  function 取得送出班別(){
    const selected = 文字($('班別')?.value);
    if(selected && selected !== '自動判斷') return 標準化班別(selected);
    return 標準化班別(狀態.選取人員?.班別) || 判斷班別();
  }

  function 班別樣式(班別){
    const b = 標準化班別(班別) || 判斷班別();
    if(b === '早班') return '班早';
    if(b === '中班') return '班中';
    if(b === '大夜班') return '班夜';
    return '班早';
  }

  function 補班別選項(value){
    const v = 標準化班別(value);
    if(!v) return;
    if(!狀態.班別清單.includes(v)) 狀態.班別清單.push(v);
    const select = $('班別');
    if(select && !Array.from(select.options).some(o => o.value === v)){
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    }
  }

  function 正規化初始資料(raw){
    const data = raw?.data || raw?.資料 || raw || {};
    狀態.原始資料 = raw;
    狀態.人員 = 轉陣列(data, ['人員','人員主檔','staff','persons']).map(r => {
      const 班別值 = 標準化班別(取欄(r, ['班別','班次','工作班別','班別名稱','原始班別'])) || 判斷班別();
      return {
        ...r,
        工號: 文字(取欄(r, ['工號','員工編號','員工工號','id'])),
        姓名: 文字(取欄(r, ['姓名','中文名','名字','name'])),
        部門: 文字(取欄(r, ['部門','單位','dept'])),
        組別: 文字(取欄(r, ['組別','班組','group'])),
        職稱: 文字(取欄(r, ['職稱','職位','title'])),
        班別: 班別值,
        照片網址: 取圖片網址(取欄(r, ['人員照片','照片網址','縮圖網址','作業員照片網址','作業員縮圖網址','圖片網址','頭像網址'])),
        縮圖網址: 取圖片網址(取欄(r, ['縮圖網址','人員縮圖','作業員縮圖網址','照片網址','人員照片'])),
        Google檔案ID: 文字(取欄(r, ['Google檔案ID','照片檔案ID','作業員照片檔案ID','檔案ID']))
      };
    }).filter(r => r.工號 || r.姓名);

    const groups = 轉陣列(data, ['報工工站群組','途程工站群組','工件工站','workItems']);
    const products = 轉陣列(data, ['產品','產品主檔','products']).map(正規化產品);
    const stations = 轉陣列(data, ['工站','工站主檔','stations']);
    const machines = 轉陣列(data, ['機台','機台主檔','machines']).map(正規化機台);
    狀態.產品 = products;
    狀態.工站 = stations;
    狀態.機台 = machines;
    狀態.報工工站群組 = (groups.length ? groups : 建立簡易報工工站群組(products, stations, machines)).map(正規化報工工站群組).filter(g => g.產品編號 || g.品名 || g.報工工站名稱);

    const defectGrouped = data.不良原因 || data.defectGroups || null;
    if(defectGrouped && typeof defectGrouped === 'object' && !Array.isArray(defectGrouped)){
      狀態.不良群組 = defectGrouped;
      狀態.不良清單 = Object.keys(defectGrouped).flatMap(key => (defectGrouped[key] || []).map(x => 正規化不良(x, key)));
    }else{
      狀態.不良清單 = 轉陣列(data, ['不良代號','不良代碼','不良主檔','defects']).map(x => 正規化不良(x));
      狀態.不良群組 = 狀態.不良清單.reduce((acc,item) => {
        const key = item.分類 || (item.不良代號 ? item.不良代號.charAt(0).toUpperCase() : '其他');
        if(!acc[key]) acc[key] = [];
        acc[key].push({代碼:item.不良代號, 名稱:item.不良名稱, 英文名稱:item.英文名稱, 備註:item.備註});
        return acc;
      }, {Y:[],Z:[]});
    }

    狀態.班別清單 = 轉陣列(data, ['班別清單','shifts']).map(x => typeof x === 'string' ? x : (x.值 || x.名稱)).map(標準化班別).filter(Boolean);
    ['自動判斷','早班','中班','大夜班','加班'].forEach(x => { if(!狀態.班別清單.includes(x)) 狀態.班別清單.push(x); });
    狀態.人員.forEach(p => 補班別選項(p.班別));

    狀態.異常類型 = 轉陣列(data, ['異常類型','abnormalTypes']).map(x => typeof x === 'string' ? x : (x.值 || x.名稱)).filter(Boolean);
    if(!狀態.異常類型.length) 狀態.異常類型 = ['無異常 / Normal','設備異常','機台停機 / Machine Down','待料 / Waiting Material','換刀 / Tool Change','品質確認 / Quality Check','其他 / Others'];
  }

  function 正規化產品(r){
    const 產品編號 = 文字(取欄(r, ['產品編號','料號','品號','產品料號','productNo']));
    const 主圖 = 取圖片網址(取欄(r, ['產品主圖','產品照片網址','產品縮圖網址','照片網址','縮圖網址','圖片網址','主圖','產品圖片網址']));
    const 三視圖 = 取圖片網址(取欄(r, ['產品三視圖','三視圖','三視圖網址','產品三視圖網址']));
    return {
      ...r,
      產品編號,
      客戶品號: 文字(取欄(r, ['客戶品號','客戶料號'])),
      品名: 文字(取欄(r, ['品名','產品名稱','name'])),
      產品照片網址: 主圖,
      產品縮圖網址: 主圖,
      產品主圖: 主圖,
      產品三視圖: 三視圖,
      產品照片檔案ID: 文字(取欄(r, ['產品照片檔案ID','Google檔案ID','照片檔案ID','檔案ID']))
    };
  }

  function 正規化機台(r){
    const 機台編號 = 文字(取欄(r, ['機台編號','機台代號','設備編號','machineId']));
    const 圖 = 取圖片網址(取欄(r, ['機台照片','機台照片網址','照片網址','縮圖網址','機台縮圖網址','圖片網址']));
    return {
      ...r,
      機台編號,
      機台名稱: 文字(取欄(r, ['機台名稱','設備名稱','名稱','machineName'])) || 機台編號,
      工站編號: 文字(取欄(r, ['工站編號','工站代碼','工站代號','工站名稱'])),
      區域: 文字(取欄(r, ['區域','位置','area'])),
      型號: 文字(取欄(r, ['型號','機台型號'])),
      照片網址: 圖,
      縮圖網址: 圖,
      機台照片: 圖
    };
  }

  function 正規化報工工站群組(r){
    const 產品編號 = 文字(取欄(r, ['產品編號','料號','品號','productNo']));
    const product = 狀態.產品.find(p => p.產品編號 === 產品編號 || (p.客戶品號 && p.客戶品號 === 取欄(r,['客戶品號'])) || (p.品名 && p.品名 === 取欄(r,['品名','產品名稱']))) || {};
    const 機台清單Raw = Array.isArray(r.機台清單) ? r.機台清單 : [];
    const 機台字串 = 文字(取欄(r, ['機台清單','機台編號清單','機台編號','主機台']));
    let ids = 機台清單Raw.length ? 機台清單Raw.map(x => 文字(x.機台編號 || x.主機台 || x)) : 機台字串.split(/[、,，;；\s]+/).filter(Boolean);
    const 工站名稱 = 文字(取欄(r, ['報工工站名稱','工站名稱','名稱'])) || 文字(取欄(r, ['工站編號','工站代碼']));
    const 工站代碼 = 文字(取欄(r, ['工站編號','工站代碼','工站代號']));
    if(!ids.length){
      ids = 狀態.機台.filter(m => [m.工站編號, m.工站名稱].some(v => 文字(v) && [工站代碼, 工站名稱].includes(文字(v)))).map(m => m.機台編號);
    }
    const machines = ids.map(id => {
      const found = 狀態.機台.find(m => m.機台編號 === id) || {};
      const rawMachine = 機台清單Raw.find(x => 文字(x.機台編號 || x.主機台 || x) === id) || {};
      return {
        機台編號:id,
        設備名稱: found.機台名稱 || 文字(取欄(rawMachine, ['設備名稱','機台名稱','名稱'])) || id,
        區域: found.區域 || 文字(取欄(rawMachine, ['區域','位置'])) || 文字(取欄(r, ['區域','區域清單'])),
        機台型號: found.型號 || 文字(取欄(rawMachine, ['型號','機台型號'])),
        照片網址: found.照片網址 || 取圖片網址(取欄(rawMachine, ['機台照片','機台照片網址','照片網址','縮圖網址'])) || 取圖片網址(取欄(r, ['機台照片網址','照片網址'])),
        縮圖網址: found.縮圖網址 || found.照片網址 || 取圖片網址(取欄(rawMachine, ['縮圖網址','機台縮圖網址','照片網址']))
      };
    });
    const 工序 = 文字(取欄(r, ['工序','工序範圍','工序清單','工站代碼']));
    const productPhoto = 取圖片網址(取欄(r, ['產品照片網址','產品縮圖網址','產品主圖','照片網址','圖片網址'])) || product.產品照片網址 || product.產品主圖 || product.產品縮圖網址;
    return {
      ...r,
      產品編號,
      客戶品號: 文字(取欄(r, ['客戶品號','客戶料號'])) || product.客戶品號 || '',
      品名: 文字(取欄(r, ['品名','產品名稱','name'])) || product.品名 || '',
      產品照片網址: productPhoto,
      產品縮圖網址: productPhoto,
      產品主圖: productPhoto,
      產品三視圖: 取圖片網址(取欄(r, ['產品三視圖','三視圖'])) || product.產品三視圖 || '',
      產品照片檔案ID: 文字(取欄(r, ['產品照片檔案ID','Google檔案ID','照片檔案ID'])) || product.產品照片檔案ID || '',
      工站名稱,
      報工工站名稱: 工站名稱,
      工序,
      工序範圍: 文字(取欄(r, ['工序範圍'])) || 工序,
      工序清單: Array.isArray(r.工序清單) ? r.工序清單 : (工序 ? 工序.split(/[、,，;；\s]+/).filter(Boolean) : []),
      標準產能: 文字(取欄(r, ['標準產能','標準產能_班','8小時標準產能'])) || product['8小時標準產能'] || '',
      標準工時_秒: 文字(取欄(r, ['標準工時_秒','標準工時'])) || product.標準工時_秒 || '',
      機台清單: machines,
      主機台: 文字(取欄(r, ['主機台'])) || (machines[0] ? machines[0].機台編號 : ''),
      顯示名稱: [工站名稱, 工序, machines.map(m => m.機台編號).join('、')].filter(Boolean).join('｜')
    };
  }

  function 建立簡易報工工站群組(products, stations, machines){
    if(stations.length){
      return stations.map(s => {
        const productNo = 文字(取欄(s,['產品編號','料號','品號']));
        const p = products.find(x => x.產品編號 === productNo) || {};
        return {
          ...s,
          產品編號: productNo,
          客戶品號: 取欄(s,['客戶品號']) || p.客戶品號 || '',
          品名: 取欄(s,['品名','產品名稱']) || p.品名 || '',
          產品照片網址: 取圖片網址(取欄(s,['產品照片網址','產品主圖','照片網址'])) || p.產品照片網址 || p.產品主圖 || '',
          產品縮圖網址: 取圖片網址(取欄(s,['產品縮圖網址','縮圖網址','產品照片網址'])) || p.產品縮圖網址 || p.產品照片網址 || p.產品主圖 || '',
          產品三視圖: 取圖片網址(取欄(s,['產品三視圖','三視圖'])) || p.產品三視圖 || ''
        };
      });
    }
    return products.map(p => ({...p, 報工工站名稱:'未指定工站', 工站名稱:'未指定工站'}));
  }

  function 正規化不良(x, category){
    const code = 文字(取欄(x, ['不良代號','不良代碼','代號','代碼','code'])) || 文字(x.代碼);
    return {
      分類: 文字(category || 取欄(x,['分類','category'])) || (code ? code.charAt(0).toUpperCase() : ''),
      不良代號: code,
      不良名稱: 文字(取欄(x, ['不良名稱','中文名稱','名稱','name'])) || 文字(x.名稱),
      英文名稱: 文字(取欄(x, ['英文名稱','英文','english','en'])),
      備註: 文字(取欄(x, ['備註','說明']))
    };
  }

  async function 載入初始資料(){
    try{
      設定狀態('載入主檔中...');
      顯示訊息('載入報工主檔中...');
      const raw = await window.GAS橋接器.取得報工初始資料();
      正規化初始資料(raw);
      渲染全部();
      設定狀態(`PWA 已連線｜人員:${狀態.人員.length}｜工站:${狀態.報工工站群組.length}｜照片:${統計照片數()}｜目標:09_報工`);
      顯示訊息('✅ 主檔載入完成', {人員:狀態.人員.length, 報工工站群組:狀態.報工工站群組.length, 產品照片:狀態.報工工站群組.filter(x=>x.產品照片網址).length, 機台照片:狀態.報工工站群組.reduce((s,g)=>s+(g.機台清單||[]).filter(m=>m.照片網址||m.縮圖網址).length,0), 不良代號:狀態.不良清單.length});
    }catch(e){
      設定狀態('PWA 載入失敗');
      顯示訊息('❌ 初始資料載入失敗：' + e.message);
    }
  }

  function 統計照片數(){
    const p = 狀態.報工工站群組.filter(x => x.產品照片網址 || x.產品縮圖網址).length;
    const m = 狀態.報工工站群組.reduce((s,g)=>s+(g.機台清單||[]).filter(x=>x.照片網址||x.縮圖網址).length,0);
    return `產品${p}/機台${m}`;
  }

  function 渲染全部(){
    $('版本標籤').textContent = `${window.PWA_CONFIG?.VERSION || 'v1.0.0'}｜${版本}`;
    $('作業日顯示').value = 作業日();
    $('班別').innerHTML = 狀態.班別清單.map(x => `<option value="${安全HTML(x)}">${安全HTML(x)}</option>`).join('');
    $('班別').value = '自動判斷';
    $('異常類型').innerHTML = 狀態.異常類型.map(x => `<option value="${安全HTML(x)}">${安全HTML(x)}</option>`).join('');
    渲染人員();
    渲染工站();
    渲染機台();
    渲染不良分配();
    更新預覽();
  }

  function 渲染人員(){
    const q = 文字($('搜尋人員')?.value).toLowerCase();
    const box = $('人員列表');
    const rows = 狀態.人員.filter(p => !q || [p.工號,p.姓名,p.部門,p.組別,p.班別].join(' ').toLowerCase().includes(q));
    box.innerHTML = rows.map(p => {
      const selected = 狀態.選取人員 && 狀態.選取人員.工號 === p.工號;
      const avatar = p.縮圖網址 || p.照片網址;
      return `<button type="button" class="人員卡片 ${班別樣式(p.班別)} ${selected?'選中':''}" data-id="${安全HTML(p.工號)}">
        <span class="班標">${安全HTML(p.班別 || '')}</span><span class="選取標記">✓</span>
        <div class="頭像圈">${avatar ? 圖片HTML(avatar,p.姓名) : 安全HTML((p.姓名 || p.工號 || '?').charAt(0))}</div>
        <div class="人名">${安全HTML(p.姓名 || '未命名')}</div><div class="人工號">${安全HTML(p.工號)}</div>
      </button>`;
    }).join('') || '<p class="空狀態">找不到人員</p>';
  }

  function 渲染工站(){
    const q = 文字($('搜尋工件')?.value).toLowerCase();
    const box = $('工件列表');
    const rows = 狀態.報工工站群組.filter(g => !q || [g.產品編號,g.客戶品號,g.品名,g.報工工站名稱,g.工序,g.主機台].join(' ').toLowerCase().includes(q));
    box.innerHTML = rows.map(g => {
      const key = 工站Key(g);
      const selected = 狀態.選取工站 && 工站Key(狀態.選取工站) === key;
      const photo = g.產品縮圖網址 || g.產品照片網址 || g.產品主圖;
      return `<button type="button" class="產品卡片 ${selected?'選中':''}" data-key="${安全HTML(key)}">
        <div class="產品縮圖">${photo ? 圖片HTML(photo,g.品名,'無產品圖') : '<span>📦</span>'}</div>
        <div class="產品名稱大">${安全HTML(g.品名 || g.產品編號 || '未命名產品')}</div>
        <div class="產品編號小">${安全HTML(g.產品編號 || '')}${g.客戶品號 ? '｜' + 安全HTML(g.客戶品號) : ''}</div>
        <div class="產品編號小">${安全HTML(g.報工工站名稱 || '')}${g.主機台 ? '｜' + 安全HTML(g.主機台) : ''}</div>
      </button>`;
    }).join('') || '<p class="空狀態">找不到工件 / 工站</p>';
  }

  function 工站Key(g){return [g.產品編號,g.客戶品號,g.報工工站名稱,g.工序,g.主機台].map(文字).join('|');}

  function 渲染機台(){
    const box = $('機台清單');
    const g = 狀態.選取工站;
    if(!g){ box.innerHTML = '<p class="空狀態">請先選擇工件與工站</p>'; return; }
    const machines = g.機台清單 || [];
    box.innerHTML = machines.map(m => `<div class="機台卡">
      ${m.照片網址 || m.縮圖網址 ? 圖片HTML(m.照片網址 || m.縮圖網址, m.機台編號, '無機圖') : '<div class="無機圖">無機圖</div>'}
      <div class="機台號">${安全HTML(m.機台編號 || '')}</div>
      <div class="小字">${安全HTML(m.設備名稱 || '')}${m.區域 ? '｜' + 安全HTML(m.區域) : ''}</div>
    </div>`).join('') || '<p class="空狀態">此工站未設定機台照片或機台清單</p>';
  }

  function 渲染不良分配(){
    const box = $('不良分配區');
    if(!box.children.length) 新增不良分配列();
    $$('#不良分配區 .不良原因選單').forEach(select => 填入不良選項(select));
  }

  function 填入不良選項(select){
    const current = select.value;
    const groups = 狀態.不良群組 || {};
    let html = '<option value="">— 選擇不良原因 —</option>';
    Object.keys(groups).sort().forEach(key => {
      const list = groups[key] || [];
      if(!list.length) return;
      html += `<optgroup label="${安全HTML(key)} 類">`;
      html += list.map(item => {
        const code = 文字(item.代碼 || item.不良代號 || item.不良代碼);
        const name = 文字(item.名稱 || item.不良名稱);
        const en = 文字(item.英文名稱);
        const label = [code, name].filter(Boolean).join('｜') + (en ? '｜' + en : '');
        return `<option value="${安全HTML(code)}" data-name="${安全HTML(name)}" data-en="${安全HTML(en)}" data-category="${安全HTML(key)}">${安全HTML(label)}</option>`;
      }).join('');
      html += '</optgroup>';
    });
    select.innerHTML = html;
    if(current) select.value = current;
  }

  function 新增不良分配列(){
    const box = $('不良分配區');
    const row = document.createElement('div');
    row.className = '不良分配行';
    row.innerHTML = `<button type="button" class="刪除分配">×</button><select class="不良原因選單"></select><input class="數量欄" type="number" inputmode="numeric" min="0" placeholder="0" value="0">`;
    box.appendChild(row);
    填入不良選項(row.querySelector('select'));
  }

  function 收集不良分配(){
    return $$('#不良分配區 .不良分配行').map(row => {
      const select = row.querySelector('select');
      const opt = select.selectedOptions[0];
      const qty = 數字(row.querySelector('input').value);
      return {
        不良代號: 文字(select.value),
        不良名稱: 文字(opt?.dataset.name || opt?.textContent || ''),
        英文名稱: 文字(opt?.dataset.en || ''),
        分類: 文字(opt?.dataset.category || (select.value || '').charAt(0)),
        數量: qty
      };
    }).filter(x => x.不良代號 && x.數量 > 0);
  }

  function 收集Payload(){
    const p = 狀態.選取人員 || {};
    const g = 狀態.選取工站 || {};
    const 不良分配 = 收集不良分配();
    const 今日共做數 = 數字($('今日共做數').value);
    const 不良數 = 不良分配.reduce((s,x)=>s+數字(x.數量),0);
    const 實際良品數 = Math.max(今日共做數 - 不良數,0);
    const firstNg = 不良分配[0] || {};
    const 班別 = 取得送出班別();
    const 開始時間 = $('開始時間').value || '';
    const 結束時間 = $('結束時間').value || '';
    const 實際工時 = 計算工時();
    return {
      action:'寫入報工作業v2',
      來源:'GitHub_Pages_PWA_work-report-v2_GAS07同規則',
      版本,
      作業日: 作業日(),
      工號:p.工號 || '',
      姓名:p.姓名 || '',
      班別,
      是否加班: 班別 === '加班' ? '是' : '否',
      加班類型: 班別 === '加班' ? '加班' : '無',
      作業員照片網址:p.照片網址 || '',
      作業員縮圖網址:p.縮圖網址 || p.照片網址 || '',
      作業員照片檔案ID:p.Google檔案ID || '',
      產品編號:g.產品編號 || '',
      客戶品號:g.客戶品號 || '',
      品名:g.品名 || '',
      產品照片網址:g.產品照片網址 || g.產品主圖 || '',
      產品縮圖網址:g.產品縮圖網址 || g.產品照片網址 || g.產品主圖 || '',
      產品照片檔案ID:g.產品照片檔案ID || '',
      工站名稱:g.工站名稱 || g.報工工站名稱 || '',
      報工工站名稱:g.報工工站名稱 || g.工站名稱 || '',
      工序:g.工序 || '',
      工序清單:Array.isArray(g.工序清單) ? g.工序清單.join('、') : (g.工序清單 || g.工序 || ''),
      機台清單:(g.機台清單 || []).map(m => m.機台編號).filter(Boolean).join('、'),
      主機台:g.主機台 || ((g.機台清單 || [])[0]?.機台編號 || ''),
      機台照片清單:(g.機台清單 || []).map(m => ({機台編號:m.機台編號, 照片網址:m.照片網址 || '', 縮圖網址:m.縮圖網址 || ''})),
      今日共做數,
      不良數,
      實際良品數,
      不良率: 今日共做數 ? 不良數 / 今日共做數 : 0,
      開始時間,
      結束時間,
      實際工時,
      不良類別: 不良數 > 0 ? (firstNg.分類 || 'PWA不良分配') : '無',
      不良代碼:firstNg.不良代號 || '',
      不良原因:firstNg.不良名稱 || '',
      不良分配,
      異常類型:$('異常類型').value || '無異常 / Normal',
      備註:$('照片備註').value || '',
      照片備註:$('照片備註').value || '',
      現場照片清單:[],
      狀態:'有效'
    };
  }

  function 驗證(payload){
    const errors = [];
    if(!payload.工號) errors.push('請選擇作業員');
    if(!payload.產品編號 && !payload.品名) errors.push('請選擇工件 / 產品');
    if(!payload.報工工站名稱 && !payload.工站名稱) errors.push('請選擇報工工站');
    if(!payload.主機台 && !payload.機台清單) errors.push('請選擇含機台的工站');
    if(payload.今日共做數 <= 0) errors.push('今日共做數必須大於 0');
    if(payload.不良數 < 0) errors.push('不良數不可小於 0');
    if(payload.不良數 > payload.今日共做數) errors.push('不良數不可大於今日共做數');
    if(errors.length) throw new Error(errors.join('；'));
  }

  function 計算工時(){
    const s = $('開始時間')?.value;
    const e = $('結束時間')?.value;
    if(!s || !e) return '';
    const ms = new Date(e).getTime() - new Date(s).getTime();
    if(isNaN(ms) || ms <= 0) return '';
    return Math.round(ms / 60000);
  }

  function 更新預覽(){
    const payload = 收集Payload();
    $('作業日顯示').value = payload.作業日 || 作業日();
    $('預覽工號').textContent = payload.工號 || '-';
    $('預覽產品').textContent = payload.品名 || payload.產品編號 || '-';
    $('預覽工站').textContent = payload.報工工站名稱 || '-';
    $('預覽產出').textContent = payload.今日共做數 || 0;
    $('預覽不良').textContent = payload.不良數 || 0;
    $('預覽良品').textContent = payload.實際良品數 || 0;
    $('報工預覽JSON').textContent = JSON.stringify(payload,null,2);
  }

  async function 送出報工(){
    if(狀態.送出中) return;
    try{
      const payload = 收集Payload();
      驗證(payload);
      狀態.送出中 = true;
      $('送出報工').disabled = true;
      $('送出報工').textContent = '送出中...';
      設定狀態('報工送出中...');
      顯示訊息('送出資料：', payload);
      const result = await window.GAS橋接器.寫入報工(payload);
      設定狀態('報工已送出');
      顯示訊息('✅ 報工成功，已寫入 09_報工 / 09_不良紀錄', result);
    }catch(e){
      設定狀態('報工失敗');
      顯示訊息('❌ 報工失敗：' + e.message);
    }finally{
      狀態.送出中 = false;
      $('送出報工').disabled = false;
      $('送出報工').textContent = '確認送出';
    }
  }

  function 切換分頁(name){
    狀態.當前分頁 = name;
    $$('.分頁 button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
    $$('.分頁內容').forEach(sec => sec.classList.toggle('隱藏', sec.dataset.page !== name));
    更新預覽();
    setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),30);
  }

  function 下一步(){
    const order = ['人員','工件','產出','品質'];
    const i = order.indexOf(狀態.當前分頁);
    if(i < order.length - 1) 切換分頁(order[i+1]);
  }

  function 上一步(){
    const order = ['人員','工件','產出','品質'];
    const i = order.indexOf(狀態.當前分頁);
    if(i > 0) 切換分頁(order[i-1]);
  }

  function 設定預設時間(){
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
    if($('開始時間') && !$('開始時間').value) $('開始時間').value = local;
    if($('結束時間') && !$('結束時間').value) $('結束時間').value = local;
    if($('作業日顯示')) $('作業日顯示').value = 作業日();
  }

  function 綁定事件(){
    $('搜尋人員').addEventListener('input', 渲染人員);
    $('搜尋工件').addEventListener('input', 渲染工站);
    $('人員列表').addEventListener('click', e => {
      const card = e.target.closest('.人員卡片');
      if(!card) return;
      狀態.選取人員 = 狀態.人員.find(p => p.工號 === card.dataset.id) || null;
      if(狀態.選取人員?.班別){
        補班別選項(狀態.選取人員.班別);
        $('班別').value = 狀態.選取人員.班別;
      }else{
        $('班別').value = '自動判斷';
      }
      渲染人員(); 更新預覽();
    });
    $('工件列表').addEventListener('click', e => {
      const card = e.target.closest('.產品卡片');
      if(!card) return;
      狀態.選取工站 = 狀態.報工工站群組.find(g => 工站Key(g) === card.dataset.key) || null;
      渲染工站(); 渲染機台(); 更新預覽();
    });
    $('不良分配區').addEventListener('click', e => {
      if(e.target.classList.contains('刪除分配')){
        const rows = $$('#不良分配區 .不良分配行');
        if(rows.length > 1) e.target.closest('.不良分配行').remove();
        else { e.target.closest('.不良分配行').querySelector('select').value=''; e.target.closest('.不良分配行').querySelector('input').value='0'; }
        更新預覽();
      }
    });
    $('不良分配區').addEventListener('change', 更新預覽);
    $('不良分配區').addEventListener('input', 更新預覽);
    $('新增不良').addEventListener('click', () => { 新增不良分配列(); 更新預覽(); });
    ['班別','今日共做數','開始時間','結束時間','異常類型','照片備註'].forEach(id => $(id).addEventListener('input', 更新預覽));
    ['開始時間','結束時間','班別','異常類型'].forEach(id => $(id).addEventListener('change', 更新預覽));
    $$('.分頁 button').forEach(btn => btn.addEventListener('click', () => 切換分頁(btn.dataset.tab)));
    $('下一步').addEventListener('click', 下一步);
    $('上一步').addEventListener('click', 上一步);
    $('重新載入').addEventListener('click', 載入初始資料);
    $('送出報工').addEventListener('click', 送出報工);
  }

  function 初始化(){
    設定預設時間();
    綁定事件();
    切換分頁('人員');
    載入初始資料();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }

  window.報工PWA = {狀態, 載入初始資料, 收集Payload, 送出報工, 切換分頁};
  window.addEventListener('load', 初始化);
})();
