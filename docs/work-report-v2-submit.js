(function(){
  const 狀態欄位 = ['待送出','送出中','已送出','送出失敗'];
  let 初始資料 = { 人員:[], 產品:[], 工站:[], 機台:[], 不良代號:[] };

  function $(id){ return document.getElementById(id); }
  function 文字(value){ return String(value ?? '').trim(); }
  function 顯示(id, value){ const el=$(id); if(el) el.textContent = value; }
  function 輸出(value){ const el=$('系統訊息'); if(el) el.textContent = typeof value === 'string' ? value : JSON.stringify(value,null,2); }

  function 轉陣列(data, keys){
    if (Array.isArray(data)) return data;
    for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
    return [];
  }

  function 正規化初始資料(raw){
    const data = raw?.data || raw?.資料 || raw || {};
    初始資料 = {
      人員: 轉陣列(data, ['人員','人員主檔','staff','persons']),
      產品: 轉陣列(data, ['產品','產品主檔','products']),
      工站: 轉陣列(data, ['工站','工站主檔','stations']),
      機台: 轉陣列(data, ['機台','機台主檔','machines']),
      不良代號: 轉陣列(data, ['不良代號','不良代碼','不良主檔','defects'])
    };
    return 初始資料;
  }

  function 取欄(row, names){
    if(!row || typeof row !== 'object') return '';
    for (const name of names) {
      if (row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== '') return row[name];
    }
    return '';
  }

  function 建選項(selectId, rows, valueNames, labelNames, placeholder){
    const select = $(selectId);
    if(!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    rows.forEach((row, index) => {
      const value = 文字(取欄(row, valueNames)) || `第${index+1}筆`;
      const labelParts = labelNames.map(names => 文字(取欄(row, Array.isArray(names) ? names : [names]))).filter(Boolean);
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = labelParts.length ? labelParts.join('｜') : value;
      opt.dataset.index = String(index);
      select.appendChild(opt);
    });
  }

  function 建立不良分配(){
    const box = $('不良分配區');
    if(!box) return;
    box.innerHTML = '';
    const defects = 初始資料.不良代號.slice(0,80);
    if(!defects.length){
      box.innerHTML = '<p class="提示">尚未載入不良代號；仍可先送出良品報工。</p>';
      return;
    }
    defects.forEach((row, index) => {
      const code = 文字(取欄(row, ['不良代號','不良代碼','代碼','代號','code'])) || `D${index+1}`;
      const zh = 文字(取欄(row, ['中文名稱','不良名稱','名稱','name'])) || code;
      const en = 文字(取欄(row, ['英文名稱','英文','english','en'])) || '';
      const div = document.createElement('div');
      div.className = '不良列';
      div.innerHTML = `<div><b>${code}</b><span>${zh}${en ? '｜' + en : ''}</span></div><input inputmode="numeric" pattern="[0-9]*" min="0" type="number" data-code="${code}" data-zh="${zh}" data-en="${en}" placeholder="0">`;
      box.appendChild(div);
    });
  }

  function 依產品篩工站(){
    const 產品編號 = $('產品編號').value;
    const filtered = 初始資料.工站.filter(row => {
      const rowProduct = 文字(取欄(row, ['產品編號','料號','產品','productNo','product']));
      return !產品編號 || !rowProduct || rowProduct === 產品編號;
    });
    建選項('工站編號', filtered.length ? filtered : 初始資料.工站, ['工站編號','工站代號','工站名稱','stationId','station'], [['工站編號','工站代號'],['工站名稱','名稱'],['製程說明','說明']], '請選擇工站');
  }

  function 依工站篩機台(){
    const 工站編號 = $('工站編號').value;
    const filtered = 初始資料.機台.filter(row => {
      const station = 文字(取欄(row, ['工站編號','工站代號','工站名稱','stationId','station']));
      return !工站編號 || !station || station === 工站編號;
    });
    建選項('機台編號', filtered.length ? filtered : 初始資料.機台, ['機台編號','機台代號','設備編號','machineId','machine'], [['機台編號','機台代號','設備編號'],['機台名稱','名稱'],['區域','位置']], '請選擇機台');
  }

  function 自動班別(){
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 17) return '早班';
    if (hour >= 17 && hour < 24) return '中班';
    return '大夜班';
  }

  function 取得選取資料(selectId, source){
    const select = $(selectId);
    const opt = select?.selectedOptions?.[0];
    if(!opt || opt.dataset.index === undefined) return null;
    return source[Number(opt.dataset.index)] || null;
  }

  function 收集不良分配(){
    return Array.from(document.querySelectorAll('#不良分配區 input[data-code]')).map(input => ({
      不良代號: input.dataset.code,
      不良名稱: input.dataset.zh,
      英文名稱: input.dataset.en,
      數量: Number(input.value || 0)
    })).filter(item => item.數量 > 0);
  }

  function 收集Payload(){
    const 人員資料 = 取得選取資料('工號', 初始資料.人員) || {};
    const 產品資料 = 取得選取資料('產品編號', 初始資料.產品) || {};
    const 工站資料 = 取得選取資料('工站編號', 初始資料.工站) || {};
    const 機台資料 = 取得選取資料('機台編號', 初始資料.機台) || {};
    const 不良分配 = 收集不良分配();
    const 產出數量 = Number($('產出數量').value || 0);
    const 不良總數 = 不良分配.reduce((sum,item)=>sum+Number(item.數量||0),0);
    return {
      來源: 'GitHub Pages PWA',
      版本: window.PWA_CONFIG?.VERSION || 'v1.0.0',
      時間戳: new Date().toISOString(),
      班別: $('班別').value || 自動班別(),
      工號: $('工號').value,
      姓名: 文字(取欄(人員資料, ['姓名','人員姓名','name'])) || $('工號').selectedOptions[0]?.textContent || '',
      產品編號: $('產品編號').value,
      客戶品號: 文字(取欄(產品資料, ['客戶品號','客戶料號'])),
      品名: 文字(取欄(產品資料, ['品名','產品名稱','name'])),
      工站編號: $('工站編號').value,
      工站名稱: 文字(取欄(工站資料, ['工站名稱','名稱'])),
      機台編號: $('機台編號').value,
      機台名稱: 文字(取欄(機台資料, ['機台名稱','名稱'])),
      產出數量,
      不良總數,
      良品數量: Math.max(產出數量 - 不良總數, 0),
      不良分配,
      照片備註: $('照片備註').value,
      送出狀態: '待送出'
    };
  }

  function 驗證(payload){
    const 缺 = [];
    if(!payload.工號) 缺.push('工號');
    if(!payload.產品編號) 缺.push('產品');
    if(!payload.工站編號) 缺.push('工站');
    if(!payload.機台編號) 缺.push('機台');
    if(!payload.產出數量 || payload.產出數量 <= 0) 缺.push('產出數量');
    if(payload.不良總數 > payload.產出數量) 缺.push('不良總數不可大於產出數量');
    if(缺.length) throw new Error('請確認：' + 缺.join('、'));
  }

  async function 載入初始資料(){
    try{
      輸出('載入報工 V2 初始資料中...');
      const raw = await window.GAS橋接器.取得報工初始資料();
      正規化初始資料(raw);
      建選項('工號', 初始資料.人員, ['工號','員工編號','id'], [['工號','員工編號'],['姓名','name'],['部門'],['組別']], '請選擇人員');
      建選項('產品編號', 初始資料.產品, ['產品編號','料號','productNo'], [['產品編號','料號'],['客戶品號'],['品名','產品名稱']], '請選擇產品');
      建選項('工站編號', 初始資料.工站, ['工站編號','工站代號','工站名稱'], [['工站編號','工站代號'],['工站名稱','名稱']], '請選擇工站');
      建選項('機台編號', 初始資料.機台, ['機台編號','機台代號','設備編號'], [['機台編號','機台代號','設備編號'],['機台名稱','名稱']], '請選擇機台');
      建立不良分配();
      顯示('載入狀態', `人員 ${初始資料.人員.length}｜產品 ${初始資料.產品.length}｜工站 ${初始資料.工站.length}｜機台 ${初始資料.機台.length}｜不良 ${初始資料.不良代號.length}`);
      輸出(raw);
    }catch(e){
      顯示('載入狀態','載入失敗');
      輸出('❌ 初始資料載入失敗：' + e.message);
    }
  }

  async function 送出報工(){
    try{
      const payload = 收集Payload();
      驗證(payload);
      payload.送出狀態 = '送出中';
      顯示('送出狀態','送出中');
      輸出(payload);
      const result = await window.GAS橋接器.寫入報工(payload);
      payload.送出狀態 = '已送出';
      顯示('送出狀態','已送出');
      輸出(result);
    }catch(e){
      顯示('送出狀態','送出失敗');
      輸出('❌ 送出失敗：' + e.message);
    }
  }

  function 初始化頁面(){
    $('班別').value = 自動班別();
    $('產品編號').addEventListener('change', 依產品篩工站);
    $('工站編號').addEventListener('change', 依工站篩機台);
    $('重新載入').addEventListener('click', 載入初始資料);
    $('送出報工').addEventListener('click', 送出報工);
    顯示('送出狀態', 狀態欄位[0]);
    載入初始資料();
  }

  window.報工V2 = { 載入初始資料, 送出報工, 收集Payload, 正規化初始資料 };
  window.addEventListener('load', 初始化頁面);
})();
