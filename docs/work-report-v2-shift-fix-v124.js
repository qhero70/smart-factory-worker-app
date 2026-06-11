(function(){
  'use strict';

  const 版本 = 'v1.2.6_無中班強制早班修正';
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

    // 目前 01_人員主檔實際使用：早班 + 大夜班，沒有中班。
    // 因此前端若看到「中班」，先視為舊邏輯誤判，全部改回早班；只有明確 NIGHT / 大夜 才顯示大夜班。
    if(班別名稱.includes('大夜') || 班別名稱.includes('夜') || 班別代碼 === 'NIGHT' || 班別代碼 === 'N' || 原始班別.includes('大夜') || 原始班別.includes('夜') || compact.includes('2300') || compact.includes('3150') || compact.includes('0315') || compact.includes('0750')) return '大夜班';
    return '早班';
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
    if(班別 === '大夜班') card.classList.add('班夜');
    else card.classList.add('班早');
    const tag = card.querySelector('.班標');
    if(tag) tag.textContent = 班別;
  }

  function 確保班別選單(班別){
    const select = $('班別');
    if(!select || !班別) return;
    ['早班','大夜班'].forEach(s => {
      if(!Array.from(select.options).some(o => o.value === s || o.textContent === s)){
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
      }
    });
  }

  function 修正畫面班別(){
    $$('.人員卡片').forEach(card => {
      const p = 找人員(card);
      let s = p ? 判斷班別(p) : '';
      // 如果後端沒有原始班別欄位，仍強制把畫面上的中班改成早班。
      if(!s){
        const tagText = 文字(card.querySelector('.班標')?.textContent || '');
        s = tagText.includes('大夜') || tagText.includes('夜') ? '大夜班' : '早班';
      }
      確保班別選單(s);
      設定卡片班別(card, s);
    });

    const selected = document.querySelector('.人員卡片.選中');
    const select = $('班別');
    if(select){
      let s = '早班';
      if(selected){
        const p = 找人員(selected);
        s = p ? 判斷班別(p) : (文字(selected.querySelector('.班標')?.textContent).includes('大夜') ? '大夜班' : '早班');
      }
      確保班別選單(s);
      if(select.value === '自動判斷' || select.value === '中班' || !select.value || selected){
        select.value = s;
        select.dispatchEvent(new Event('input', {bubbles:true}));
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }
    }

    const status = $('狀態卡');
    if(status && !status.textContent.includes('無中班v126')){
      status.textContent += '｜無中班v126';
    }
  }

  async function 執行(){
    await 載入主檔();
    修正畫面班別();
  }

  window.addEventListener('load', () => setTimeout(執行, 800));
  document.addEventListener('click', () => setTimeout(執行, 120), true);
  document.addEventListener('change', () => setTimeout(執行, 120), true);
  setTimeout(執行, 800);
  setTimeout(執行, 1800);
  setInterval(執行, 1000);
})();
