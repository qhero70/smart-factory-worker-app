(function(){
  'use strict';
  const 版本 = 'v1.2.2_DOM補強';
  let 主檔 = null;
  const 文字 = v => String(v ?? '').trim();
  const $ = id => document.getElementById(id);
  const $$ = q => Array.from(document.querySelectorAll(q));

  function 取值(row, keys){
    row = row || {};
    for(const k of keys){
      if(row[k] !== undefined && row[k] !== null && 文字(row[k]) !== '') return row[k];
    }
    return '';
  }

  function 圖片(v){
    let s = 文字(v);
    if(!s) return '';
    s = s.replace(/^=IMAGE\(/i,'').replace(/["'()]/g,'').trim();
    const u = s.match(/https?:\/\/[^\s,，;；]+/i);
    if(u) s = u[0];
    const id = s.match(/[-\w]{25,}/);
    if(id) return 'https://drive.google.com/thumbnail?id=' + id[0] + '&sz=w900';
    return s;
  }

  function 班別(v){
    const t = 文字(v);
    if(t.includes('中')) return '中班';
    if(t.includes('大夜') || t.includes('夜')) return '大夜班';
    if(t.includes('早')) return '早班';
    return t;
  }

  function 本地時間(){
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  }

  function 資料區(){
    const d = 主檔?.data || 主檔?.資料 || 主檔 || {};
    return d;
  }

  function 人員清單(){
    const d = 資料區();
    return d.人員 || d.人員主檔 || d.staff || [];
  }

  function 群組清單(){
    const d = 資料區();
    return d.報工工站群組 || d.途程工站群組 || d.workItems || [];
  }

  async function 載入主檔(){
    if(主檔 || !window.GAS橋接器 || !window.GAS橋接器.取得報工初始資料) return 主檔;
    try{ 主檔 = await window.GAS橋接器.取得報工初始資料(); }catch(e){}
    return 主檔;
  }

  function 補人員照片(){
    const list = 人員清單();
    if(!list.length) return;
    $$('.人員卡片').forEach(card => {
      if(card.querySelector('img')) return;
      const txt = card.textContent || '';
      const p = list.find(x => txt.includes(文字(x.工號 || x.員工編號)) || txt.includes(文字(x.姓名 || x.中文名)));
      if(!p) return;
      const url = 圖片(取值(p, ['人員照片網址','人員照片縮圖網址','人員照片','照片網址','縮圖網址','作業員照片網址','作業員縮圖網址','人員照片檔案ID','Google檔案ID','照片檔案ID']));
      if(!url) return;
      const head = card.querySelector('.頭像圈');
      if(head) head.innerHTML = '<img src="' + url + '" loading="lazy" referrerpolicy="no-referrer">';
    });
  }

  function 補選人班別(){
    const select = $('班別');
    if(!select) return;
    const list = 人員清單();
    const selected = document.querySelector('.人員卡片.選中');
    if(!selected) return;
    const txt = selected.textContent || '';
    const p = list.find(x => txt.includes(文字(x.工號 || x.員工編號)) || txt.includes(文字(x.姓名 || x.中文名)));
    const s = 班別(取值(p, ['班別','班次','工作班別','班別名稱']));
    if(!s) return;
    if(!Array.from(select.options).some(o => o.value === s || o.textContent === s)){
      const opt = document.createElement('option'); opt.value = s; opt.textContent = s; select.appendChild(opt);
    }
    if(select.value !== s){
      select.value = s;
      select.dispatchEvent(new Event('input', {bubbles:true}));
      select.dispatchEvent(new Event('change', {bubbles:true}));
    }
  }

  function 補時間(){
    const now = 本地時間();
    ['開始時間','結束時間'].forEach(id => {
      const el = $(id);
      if(el && !el.value){ el.value = now; el.dispatchEvent(new Event('input',{bubbles:true})); }
    });
  }

  function 建工站區(){
    if($('工站補強選單')) return;
    const label = Array.from(document.querySelectorAll('label')).find(x => x.textContent.includes('機台照片'));
    const parent = label ? label.parentElement : document.querySelector('[data-page="工件"] .卡片');
    if(!parent) return;
    const box = document.createElement('div');
    box.id = '工站補強區';
    box.innerHTML = '<label>工站選擇 / Station Select</label><select id="工站補強選單"><option value="">請先選擇產品</option></select><div class="小字" id="工站補強提示">選產品後可切換同產品工站。</div>';
    parent.insertBefore(box, label);
    $('工站補強選單').addEventListener('change', function(){
      const key = this.value;
      if(!key) return;
      const card = $$('.產品卡片').find(c => c.textContent.includes(key));
      if(card) card.click();
    });
  }

  function 更新工站區(){
    const sel = $('工站補強選單');
    if(!sel) return;
    const chosen = document.querySelector('.產品卡片.選中');
    if(!chosen) return;
    const txt = chosen.textContent || '';
    const groups = 群組清單();
    const hit = groups.find(g => txt.includes(文字(g.產品編號)) || txt.includes(文字(g.品名)) || txt.includes(文字(g.客戶品號)));
    if(!hit) return;
    const rows = groups.filter(g => (hit.產品編號 && g.產品編號 === hit.產品編號) || (hit.客戶品號 && g.客戶品號 === hit.客戶品號) || (hit.品名 && g.品名 === hit.品名));
    sel.innerHTML = rows.map(g => {
      const label = [g.工站名稱 || g.報工工站名稱, g.工序, g.主機台].filter(Boolean).join('｜') || '未指定工站';
      return '<option value="' + label.replace(/"/g,'') + '">' + label + '</option>';
    }).join('');
    const tip = $('工站補強提示');
    if(tip) tip.textContent = '此產品可選工站：' + rows.length + ' 筆';
  }

  async function 執行(){
    await 載入主檔();
    補人員照片();
    補選人班別();
    補時間();
    建工站區();
    更新工站區();
    const s = $('狀態卡');
    if(s && !s.textContent.includes('DOM補強')) s.textContent += '｜DOM補強';
  }

  document.addEventListener('click', () => setTimeout(執行, 160), true);
  window.addEventListener('load', () => setTimeout(執行, 600));
  setTimeout(執行, 1200);
  setInterval(執行, 2500);
})();
