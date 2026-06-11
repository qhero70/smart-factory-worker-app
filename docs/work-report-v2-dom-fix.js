(function(){
  'use strict';
  const 版本 = 'v1.2.3_DOM補強_人員照片班別工站';
  let 主檔 = null;
  const 文字 = v => String(v ?? '').trim();
  const 清字 = v => 文字(v).replace(/\s+/g, '').toUpperCase();
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
    if(s.indexOf('data:image/') === 0) return s;
    const id = s.match(/[-\w]{25,}/);
    if(id) return 'https://drive.google.com/thumbnail?id=' + id[0] + '&sz=w900';
    return s;
  }

  function 班別(v){
    const t = 文字(v);
    if(!t) return '';
    if(t.includes('中') || t.includes('1650') || t.includes('16:50')) return '中班';
    if(t.includes('大夜') || t.includes('夜') || t.includes('2300') || t.includes('23:00') || t.includes('0315') || t.includes('03:15')) return '大夜班';
    if(t.includes('早') || t.includes('0800') || t.includes('08:00')) return '早班';
    if(t.includes('加班')) return '加班';
    return t;
  }

  function 現在班別(){
    const d = new Date();
    const hm = d.getHours() * 100 + d.getMinutes();
    if(hm >= 750 && hm < 1650) return '早班';
    if(hm >= 1650 || hm < 110) return '中班';
    return '大夜班';
  }

  function 本地時間(){
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  }

  function 資料區(){
    return 主檔?.data || 主檔?.資料 || 主檔 || {};
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

  function 人員鍵(row){
    return [
      取值(row, ['工號','員工編號','員工工號','員工代號','人員編號','id']),
      取值(row, ['姓名','中文名','名字','name'])
    ].map(文字).filter(Boolean);
  }

  function 找人員(card){
    const txt = 清字(card ? card.textContent : '');
    if(!txt) return null;
    return 人員清單().find(p => 人員鍵(p).some(k => k && txt.includes(清字(k)))) || null;
  }

  function 人員照片(row){
    return 圖片(取值(row, [
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
    ]));
  }

  function 補人員照片(){
    const list = 人員清單();
    if(!list.length) return;
    $$('.人員卡片').forEach(card => {
      if(card.querySelector('img')) return;
      const p = 找人員(card);
      if(!p) return;
      const url = 人員照片(p);
      if(!url) return;
      const head = card.querySelector('.頭像圈');
      if(head) head.innerHTML = '<img src="' + url + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">';
    });
  }

  function 補班別選項(){
    const select = $('班別');
    if(!select) return;
    ['早班','中班','大夜班','加班'].forEach(s => {
      if(!Array.from(select.options).some(o => o.value === s || o.textContent === s)){
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
      }
    });
  }

  function 補選人班別(){
    const select = $('班別');
    if(!select) return;
    補班別選項();
    const selected = document.querySelector('.人員卡片.選中');
    let s = '';
    if(selected){
      const tag = selected.querySelector('.班標');
      s = 班別(tag ? tag.textContent : '');
      if(!s){
        const p = 找人員(selected);
        s = 班別(取值(p, ['班別','班次','工作班別','班別名稱','原始班別']));
      }
    }
    if(!s && (select.value === '自動判斷' || !select.value)) s = 現在班別();
    if(!s) return;
    if(!Array.from(select.options).some(o => o.value === s || o.textContent === s)){
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
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
      if(!el) return;
      if(!el.value){
        el.value = now;
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
  }

  function 產品鍵(g){
    return [g?.產品編號, g?.客戶品號, g?.品名, g?.產品名稱].map(文字).filter(Boolean);
  }

  function 工站標籤(g){
    return [g?.工站名稱 || g?.報工工站名稱, g?.工序 || g?.工序範圍, g?.主機台].filter(Boolean).map(文字).join('｜') || '未指定工站';
  }

  function 找目前產品群組(){
    const chosen = document.querySelector('.產品卡片.選中');
    if(!chosen) return null;
    const txt = 清字(chosen.textContent);
    return 群組清單().find(g => 產品鍵(g).some(k => k && txt.includes(清字(k)))) || null;
  }

  function 建工站區(){
    if($('工站補強選單')) return;
    const label = Array.from(document.querySelectorAll('label')).find(x => x.textContent.includes('機台照片'));
    const parent = label ? label.parentElement : document.querySelector('[data-page="工件"] .卡片');
    if(!parent) return;
    const box = document.createElement('div');
    box.id = '工站補強區';
    box.style.margin = '12px 0';
    box.innerHTML = '<label>工站選擇 / Station Select</label><select id="工站補強選單"><option value="">請先選擇產品</option></select><div class="小字" id="工站補強提示" style="margin-top:6px">選產品後可切換同產品工站。</div>';
    parent.insertBefore(box, label || parent.firstChild);
    $('工站補強選單').addEventListener('change', function(){
      const key = this.value;
      if(!key) return;
      const g = 群組清單().find(x => 建群組Key(x) === key);
      if(!g) return;
      const labelText = 工站標籤(g);
      const pKeys = 產品鍵(g).map(清字);
      const candidates = $$('.產品卡片');
      const card = candidates.find(c => {
        const txt = 清字(c.textContent);
        return pKeys.some(k => k && txt.includes(k)) && 清字(labelText).split('｜').filter(Boolean).some(t => txt.includes(t));
      }) || candidates.find(c => pKeys.some(k => k && 清字(c.textContent).includes(k)));
      if(card) card.click();
    });
  }

  function 建群組Key(g){
    return [g?.產品編號, g?.客戶品號, g?.品名, g?.工站名稱 || g?.報工工站名稱, g?.工序 || g?.工序範圍, g?.主機台].map(文字).join('|');
  }

  function 更新工站區(){
    const sel = $('工站補強選單');
    if(!sel) return;
    const hit = 找目前產品群組();
    if(!hit) return;
    const rows = 群組清單().filter(g => {
      return (hit.產品編號 && g.產品編號 === hit.產品編號) ||
             (hit.客戶品號 && g.客戶品號 === hit.客戶品號) ||
             (hit.品名 && g.品名 === hit.品名);
    });
    sel.innerHTML = rows.map(g => '<option value="' + 建群組Key(g).replace(/"/g,'&quot;') + '">' + 工站標籤(g) + '</option>').join('') || '<option value="">此產品沒有其他工站</option>';
    const currentKey = 建群組Key(hit);
    if(Array.from(sel.options).some(o => o.value === currentKey)) sel.value = currentKey;
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

  document.addEventListener('click', () => setTimeout(執行, 180), true);
  document.addEventListener('change', () => setTimeout(執行, 120), true);
  window.addEventListener('load', () => setTimeout(執行, 600));
  setTimeout(執行, 1200);
  setInterval(執行, 2500);
})();
