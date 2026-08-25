(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S 稽核標準 0821 v1.3.1
   * 來源：《工廠5S稽核表0821》
   * 正式規則：5S五大類 × 每類5項 = 25項；每項0~4分；等權重；總分100分。
   */
  const 版本 = '1.3.1';
  const 清單版本 = 'V2.0-0821';
  const 評分 = Object.freeze({
    0: '沒有標準，現場混亂',
    1: '有標準，但大多未執行',
    2: '有執行，但多數不符合',
    3: '大致符合標準，少數缺失',
    4: '完全符合標準，且有持續改善'
  });

  function 文字(v){ return String(v == null ? '' : v).trim(); }
  function 取得評等(score){
    const n = Number(score) || 0;
    if (n >= 90) return {等級:'A',區間:'90～100 分',處置:'表揚，可作為示範區',類別:'A'};
    if (n >= 80) return {等級:'B',區間:'80～89 分',處置:'通過，持續維持',類別:'B'};
    if (n >= 70) return {等級:'C',區間:'70～79 分',處置:'需改善，一週內提出對策',類別:'C'};
    if (n >= 60) return {等級:'D',區間:'60～69 分',處置:'不合格，兩週內完成改善並複查',類別:'D'};
    return {等級:'E',區間:'60 分以下',處置:'嚴重不合格，列管追蹤',類別:'E'};
  }

  function 注入樣式(){
    if (document.getElementById('5S稽核0821樣式1310')) return;
    const s = document.createElement('style');
    s.id = '5S稽核0821樣式1310';
    s.textContent = `
      .MCHK分數 small{display:none!important}
      .MCHK分數::after{display:block;margin-top:3px;font-size:.54rem;line-height:1.15;font-weight:900;white-space:normal}
      .MCHK分數[data-score="4"]::after{content:'完全符合'}
      .MCHK分數[data-score="3"]::after{content:'大致符合'}
      .MCHK分數[data-score="2"]::after{content:'多數不符'}
      .MCHK分數[data-score="1"]::after{content:'大多未執行'}
      .MCHK分數[data-score="0"]::after{content:'沒有標準'}
      .稽核0821說明{background:#fff;border:1px solid #dce7e1;border-radius:18px;padding:12px;margin:0 0 12px;box-shadow:0 6px 18px rgba(19,70,47,.05)}
      .稽核0821說明 strong{display:block;color:#173f2f;margin-bottom:7px}.稽核0821分數列{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
      .稽核0821分數列 span{border-radius:11px;padding:7px 4px;text-align:center;background:#f4f7f5;color:#596a61;font-size:.60rem;line-height:1.28;font-weight:850}.稽核0821分數列 b{display:block;font-size:.92rem;color:#173f2f}
      .稽核0821評等{margin:14px auto 0;max-width:520px;border-radius:20px;padding:16px;text-align:left;border:1px solid #dce7e1;background:#fff;box-shadow:0 8px 24px rgba(18,64,43,.07)}
      .稽核0821評等頭{display:flex;align-items:center;gap:12px}.稽核0821等級{width:58px;height:58px;border-radius:17px;display:grid;place-items:center;font-size:1.65rem;font-weight:950;color:#fff;background:#176b47}.稽核0821評等.C .稽核0821等級{background:#d58b13}.稽核0821評等.D .稽核0821等級{background:#b9583c}.稽核0821評等.E .稽核0821等級{background:#b42d3c}.稽核0821評等 h3{margin:0;color:#173f2f}.稽核0821評等 p{margin:4px 0 0;color:#6b786f;line-height:1.5;font-size:.82rem}
      .稽核0821版次{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#e8f4ed;color:#176b47;padding:5px 9px;font-size:.68rem;font-weight:900;margin-top:8px}
      @media(max-width:390px){.稽核0821分數列 span{font-size:.54rem;padding:6px 2px}.MCHK分數::after{font-size:.50rem}}
    `;
    document.head.appendChild(s);
  }

  function 建評分說明(){
    const div = document.createElement('section');
    div.className = '稽核0821說明';
    div.innerHTML = `<strong>📋 工廠5S稽核表0821｜25項／100分</strong><div class="稽核0821分數列">${[0,1,2,3,4].map(n=>`<span><b>${n}分</b>${評分[n]}</span>`).join('')}</div><div class="稽核0821版次">正式評分版本 ${清單版本}</div>`;
    return div;
  }

  function 修補機台清單(root){
    root.querySelectorAll('.MCHK機台卡 .MCHK開始').forEach(el=>{ if (文字(el.textContent).includes('20')) el.textContent='開始 25 項'; });
    root.querySelectorAll('.MCHK機台卡 small').forEach(el=>{
      let t = 文字(el.textContent).replace(/V1\.0/g,清單版本).replace(/01-20/g,'01-25');
      if (t !== 文字(el.textContent)) el.textContent=t;
    });
    root.querySelectorAll('.主視覺 p').forEach(el=>{
      if (!文字(el.textContent).includes('20項')) return;
      el.textContent='依《工廠5S稽核表0821》正式執行：整理、整頓、清掃、清潔／標準化、素養，各5項，共25項。每項0～4分、等權重，總分100分。';
    });
  }

  function 修補單項(root){
    const card = root.querySelector('.MCHK項目卡');
    if (!card) return;
    if (!root.querySelector('.稽核0821說明')) {
      const pageHead = root.querySelector('.MCHK頁頭');
      if (pageHead) pageHead.insertAdjacentElement('afterend', 建評分說明());
    }
    const base = card.querySelector('.MCHK基準');
    if (base && !文字(base.textContent).includes('沒有標準')) {
      base.textContent='0=沒有標準，現場混亂；1=有標準，但大多未執行；2=有執行，但多數不符合；3=大致符合標準，少數缺失；4=完全符合標準，且有持續改善';
    }
  }

  function 修補送出中(root){
    root.querySelectorAll('.空狀態 b,.空狀態 span').forEach(el=>{
      const t=文字(el.textContent);
      if (t.includes('20筆明細')) el.textContent=t.replace('20筆明細','25筆明細');
    });
  }

  function 修補結果(root){
    const result = root.querySelector('.MCHK結果');
    if (!result) return;
    result.querySelectorAll('small').forEach(el=>{
      const t=文字(el.textContent);
      if (t.includes('20項明細') || t.includes('01～20')) el.textContent=`25項明細已固定編號01～25｜正式評分版本 ${清單版本}`;
    });
    if (result.querySelector('.稽核0821評等')) return;
    const big = result.querySelector('.MCHK結果大字');
    const score = Number((文字(big&&big.textContent).match(/[\d.]+/)||['0'])[0]);
    const g = 取得評等(score);
    const div=document.createElement('section');
    div.className=`稽核0821評等 ${g.類別}`;
    div.innerHTML=`<div class="稽核0821評等頭"><div class="稽核0821等級">${g.等級}</div><div><h3>${g.區間}</h3><p>${g.處置}</p></div></div><div class="稽核0821版次">《工廠5S稽核表0821》｜${清單版本}</div>`;
    const btn=result.querySelector('.MCHK結果按鈕');
    if (btn) result.insertBefore(div,btn); else result.appendChild(div);
  }

  function 修補(root){
    if (!root) return;
    修補機台清單(root);
    修補單項(root);
    修補送出中(root);
    修補結果(root);
  }

  function 啟動(){
    注入樣式();
    const root=document.getElementById('頁面內容');
    if (!root) return;
    let pending=false;
    const schedule=()=>{
      if (pending) return; pending=true;
      requestAnimationFrame(()=>{pending=false;修補(root);});
    };
    修補(root);
    const observer=new MutationObserver(schedule);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',e=>{
      const b=e.target&&e.target.closest?e.target.closest('[data-page="巡檢"],[data-頁面="巡檢"]'):null;
      if (b) setTimeout(schedule,80);
    },true);
    全域.智慧5S稽核0821觀察器=observer;
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',啟動,{once:true}); else 啟動();
  全域.智慧5S稽核標準0821=Object.freeze({版本,清單版本,評分,取得評等,修補});
})(window);
