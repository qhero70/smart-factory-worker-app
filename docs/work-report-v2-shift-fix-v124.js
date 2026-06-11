(function(){
  'use strict';

  const 版本 = 'v1.2.4_班別強制修正';
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

  function 判斷班別(row){
    const 班別名稱 = 文字(取值(row, ['班別名稱','標準班別','顯示班別']));
    const 班別代碼 = 清字(取值(row, ['班別代碼','班別CODE','shiftCode']));
    const 原始班別 = 文字(取值(row, ['班別','班次','工作班別','原始班別','班別時間']));
    const compact = 清字(班別名稱 + ' ' + 班別代碼 + ' ' + 原始班別);

    // 你的 01_人員主檔：化新早班(0800~1650)、DAY、早班。這些全部必須回早班。
    if(班別名稱.includes('早') || 班別代碼 === 'DAY' || 班別代碼 === 'D' || 原始班別.includes('早') || compact.includes('0800')) return '早班';
    if(班別名稱.includes('大夜') || 班別名稱.includes('夜') || 班別代碼 === 'NIGHT' || 班別代碼 === 'N' || 原始班別.includes('大夜') || 原始班別.includes('夜') || compact.includes('2300') || compact.includes('3150') || compact.includes('0315')) return '大夜班';
    if(班別名稱.includes('中') || 班別代碼 === 'MID' || 班別代碼 === 'M' || 班別代碼 === 'SWING' || 原始班別.includes('中')) return '中班';

    // 只有沒有 0800、也沒有早班字樣時，1650 才能代表中班。
    if(compact.includes('1650') && !compact.includes('0800')) return '中班';
    return 原始班別 || 班別名稱 || '';
  }

  function 人員清單(){
    const d = 主檔?.data || 主檔?.資料 || 主檔 || {};
    return d.人員 || d.人員主檔 || d.staff || [];
  }

  async function 載入主檔(){
    if(主檔) return 主檔;
    if(!window.GAS橋接器 || !window.GAS橋接器.取得報工初始資料) return null;
    try{
      主檔 = await window.GAS橋接器.取得報工初始資料();
    }catch(e){
      console.warn('[報工PWA班別修正] 載入主檔失敗', e);
    }
    return 主檔;
  }

  function 找人員(card){
    const txt = 清字(card ? card.textContent : '');
    if(!txt) return null;
    return 人員清單().find(p => {
      const 工號 = 清字(取值(p, ['工號','員工編號','員工工號','員工代號','人員編號','id']));
      const 姓名 = 清字(取值(p, ['姓名','中文名','名字','name']));
      return (工號 && txt.includes(工號)) || (姓名 && txt.includes(姓名));
    }) || null;
  }

  function 設定卡片班別(card, 班別){
    if(!card || !班別) return;
    card.classList.remove('班早','班中','班夜');
    if(班別 === '早班') card.classList.add('班早');
    if(班別 === '中班') card.classList.add('班中');
    if(班別 === '大夜班') card.classList.add('班夜');
    const tag = card.querySelector('.班標');
    if(tag) tag.textContent = 班別;
  }

  function 確保班別選單(班別){
    const select = $('班別');
    if(!select || !班別) return;
    if(!Array.from(select.options).some(o => o.value === 班別 || o.textContent === 班別)){
      const opt = document.createElement('option');
      opt.value = 班別;
      opt.textContent = 班別;
      select.appendChild(opt);
    }
  }

  function 修正畫面班別(){
    const list = 人員清單();
    if(!list.length) return;
    $$('.人員卡片').forEach(card => {
      const p = 找人員(card);
      if(!p) return;
      const s = 判斷班別(p);
      確保班別選單(s);
      設定卡片班別(card, s);
    });

    const selected = document.querySelector('.人員卡片.選中');
    const select = $('班別');
    if(selected && select){
      const p = 找人員(selected);
      const s = 判斷班別(p);
      if(s){
        確保班別選單(s);
        select.value = s;
        select.dispatchEvent(new Event('input', {bubbles:true}));
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }
    }

    const status = $('狀態卡');
    if(status && !status.textContent.includes('班別v124')){
      status.textContent += '｜班別v124';
    }
  }

  async function 執行(){
    await 載入主檔();
    修正畫面班別();
  }

  window.addEventListener('load', () => setTimeout(執行, 800));
  document.addEventListener('click', () => setTimeout(執行, 120), true);
  document.addEventListener('change', () => setTimeout(執行, 120), true);
  setTimeout(執行, 1200);
  setInterval(執行, 1800);
})();
