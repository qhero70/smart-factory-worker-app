(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S UI / UX 優化 v1.2.2
   * 重點：
   * 1. 移除會監看全頁 class 變化的高成本 MutationObserver，避免 iPhone 選單切換延遲。
   * 2. 盤點位置改成本機固定分類，選區域後立即出現，不再等待兩張試算表讀取。
   * 3. 區域與巡檢卡依 A4→A5→A6→A7→A8→B2→B5、機台號碼自然排序。
   * 4. DOM 補強僅在頁面新增節點時以 requestAnimationFrame 合併執行。
   * 5. 保留收合、波紋、等待、Fullscreen、長資料精簡等既有體驗。
   */

  const 版本 = '1.2.2';
  const 入口版本 = '1220';
  const 已處理長區段 = new WeakSet();
  const 區域順序 = ['A4','A5','A6','A7','A8','B2','B5'];
  const 自然排序器 = new Intl.Collator('zh-Hant-TW', { numeric: true, sensitivity: 'base' });
  let 補強排程 = 0;

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function Roar(類型, 內容, 標題) {
    const r = 全域.智慧5SRoar;
    if (r && typeof r[類型] === 'function') return r[類型](內容, 標題);
  }
  function 區域根(v) {
    const s = 文字(v).toUpperCase();
    const m = s.match(/(?:^|\b)([ABC]\d{1,2})(?:-|\b)/);
    return m ? m[1] : '';
  }
  function 區域比較(a, b) {
    const av = 文字(a && (a.value || a.區域代碼 || a.textContent || a));
    const bv = 文字(b && (b.value || b.區域代碼 || b.textContent || b));
    const ar = 區域根(av), br = 區域根(bv);
    const ai = 區域順序.indexOf(ar), bi = 區域順序.indexOf(br);
    const ax = ai < 0 ? 999 : ai, bx = bi < 0 ? 999 : bi;
    if (ax !== bx) return ax - bx;
    const aRootOnly = av === ar ? 0 : 1, bRootOnly = bv === br ? 0 : 1;
    if (aRootOnly !== bRootOnly) return aRootOnly - bRootOnly;
    return 自然排序器.compare(av, bv);
  }

  function 整理區域選單(select) {
    if (!select || select.tagName !== 'SELECT') return;
    const 原始 = Array.from(select.options);
    if (原始.length < 3) return;
    const signature = 原始.map(o => o.value).join('|');
    if (select.dataset.排序簽章 === signature) return;
    const current = select.value;
    const placeholder = 原始.find(o => !文字(o.value));
    const items = 原始.filter(o => 文字(o.value)).map(o => ({ value:o.value, label:o.textContent }));
    items.sort((a,b) => 區域比較(a.value,b.value) || 自然排序器.compare(a.label,b.label));
    const groups = new Map();
    items.forEach(item => {
      const root = 區域根(item.value) || '其他';
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(item);
    });
    select.innerHTML = '';
    if (placeholder) {
      const o = document.createElement('option'); o.value=''; o.textContent=placeholder.textContent; select.appendChild(o);
    }
    const keys = Array.from(groups.keys()).sort((a,b) => {
      const ai=區域順序.indexOf(a), bi=區域順序.indexOf(b);
      if (ai>=0 || bi>=0) return (ai<0?999:ai)-(bi<0?999:bi);
      return 自然排序器.compare(a,b);
    });
    keys.forEach(root => {
      const g = document.createElement('optgroup');
      g.label = root === '其他' ? '其他區域' : `${root} 區`;
      groups.get(root).forEach(item => {
        const o=document.createElement('option'); o.value=item.value; o.textContent=item.label; g.appendChild(o);
      });
      select.appendChild(g);
    });
    if (current && Array.from(select.options).some(o => o.value === current)) select.value = current;
    select.dataset.排序簽章 = Array.from(select.options).map(o => o.value).join('|');
  }

  function 排序巡檢區域卡片() {
    const root = document.getElementById('頁面內容');
    if (!root) return;
    const cards = Array.from(root.querySelectorAll('[data-區域索引].區域卡'));
    if (cards.length < 2) return;
    const parent = cards[0].parentElement;
    if (!parent || parent.dataset.已排序區域卡 === String(cards.length)) return;
    cards.sort((a,b) => {
      const ac = 文字(a.querySelector('.區域代碼')?.textContent || a.textContent);
      const bc = 文字(b.querySelector('.區域代碼')?.textContent || b.textContent);
      return 區域比較(ac,bc);
    }).forEach(card => parent.appendChild(card));
    parent.dataset.已排序區域卡 = String(cards.length);
  }

  function 建立位置選項(select, value, label) {
    const o = document.createElement('option'); o.value=value; o.textContent=label; select.appendChild(o);
  }

  function 更新盤點位置選項() {
    const area = document.getElementById('盤點區域');
    const pos = document.getElementById('盤點位置');
    if (!area || !pos || pos.tagName !== 'SELECT') return;
    整理區域選單(area);
    const code = 文字(area.value);
    const old = 文字(pos.value);
    pos.innerHTML = '';
    建立位置選項(pos,'', code ? '請選擇位置' : '請先選擇區域');
    pos.disabled = !code;
    if (!code) return;

    const 標準位置 = [
      ['機台／工位本體','01｜機台／工位本體'],
      ['操作面／機台前方','02｜操作面／機台前方'],
      ['文件板／作業標準','03｜文件板／作業標準'],
      ['工作台／作業台','04｜工作台／作業台'],
      ['工具／耗材區','05｜工具／耗材區'],
      ['治具區','06｜治具區'],
      ['檢具／量具區','07｜檢具／量具區'],
      ['投入料框區','08｜投入料框區'],
      ['產出料框區','09｜產出料框區'],
      ['在製品暫存區','10｜在製品暫存區'],
      ['踏台／站位區','11｜踏台／站位區'],
      ['機台旁／周邊地面','12｜機台旁／周邊地面'],
      ['共用通道','13｜共用通道'],
      ['紅牌暫存區','14｜紅牌暫存區']
    ];
    const g=document.createElement('optgroup'); g.label=`${code}｜標準位置（依作業順序）`;
    標準位置.forEach(([v,l]) => { const o=document.createElement('option'); o.value=v; o.textContent=l; g.appendChild(o); });
    pos.appendChild(g);
    建立位置選項(pos,'__自訂__','15｜其他／自訂位置');
    if (old && Array.from(pos.options).some(o=>o.value===old)) pos.value=old;
    切換自訂位置();
  }

  function 切換自訂位置() {
    const select=document.getElementById('盤點位置');
    if (!select || select.tagName!=='SELECT') return;
    let input=document.getElementById('盤點自訂位置');
    if (select.value==='__自訂__') {
      if (!input) {
        input=document.createElement('input');
        input.id='盤點自訂位置'; input.className='輸入框 UIUX自訂位置'; input.type='text';
        input.placeholder='請輸入實際位置，例如：1044 左側料框'; input.autocomplete='off';
        select.insertAdjacentElement('afterend',input);
      }
      input.classList.remove('隱藏'); input.required=true;
      requestAnimationFrame(()=>input.focus());
    } else if (input) {
      input.required=false; input.classList.add('隱藏');
    }
  }

  function 改造盤點位置() {
    const form=document.getElementById('盤點表單');
    const old=document.getElementById('盤點位置');
    if (!form || !old || form.dataset.uiux完成==='122') return;
    form.dataset.uiux完成='122'; form.classList.add('UIUX盤點表單');
    let select=old;
    if (old.tagName!=='SELECT') {
      select=document.createElement('select');
      select.id='盤點位置'; select.name=old.name||'位置'; select.className='選擇框 UIUX位置選擇'; select.required=true;
      old.replaceWith(select);
    }
    select.onchange=切換自訂位置;
    const area=document.getElementById('盤點區域');
    if (area) {
      整理區域選單(area);
      area.onchange=更新盤點位置選項;
    }
    const locationField=select.closest('.欄位群');
    if (locationField && !locationField.querySelector('.UIUX欄位提示')) {
      locationField.insertAdjacentHTML('beforeend','<small class="UIUX欄位提示">位置採固定順序，不需等待資料庫；先選區域，再選現場位置。</small>');
    }
    const steps=[
      ['盤點區域','1','區域與位置','先定位'],
      ['盤點物品名稱','2','物品資料','再填物品'],
      ['盤點頻率','3','頻率與必要性','做判定'],
      ['盤點照片檔案','4','照片與送出','最後確認']
    ];
    steps.forEach(([id,no,title,tag])=>{
      const field=document.getElementById(id)?.closest('.欄位群');
      if(!field||field.previousElementSibling?.classList.contains('表單步驟標題'))return;
      const h=document.createElement('div'); h.className='表單步驟標題';
      h.innerHTML=`<span>${no}</span><div><b>${title}</b><small>${tag}</small></div>`;
      field.parentNode.insertBefore(h,field);
    });
    const necessary=document.getElementById('盤點必要性');
    if(necessary){
      const refresh=()=>{
        form.classList.toggle('判定非必要',necessary.value==='非必要');
        document.getElementById('盤點判定理由')?.closest('.欄位群')?.classList.toggle('UIUX必填提示',necessary.value==='非必要');
      };
      necessary.onchange=refresh; refresh();
    }
    form.querySelector('.按鈕列')?.classList.add('UIUX固定送出列');
    form.addEventListener('submit',e=>{
      const s=document.getElementById('盤點位置');
      if(s?.value==='__自訂__'){
        const custom=文字(document.getElementById('盤點自訂位置')?.value);
        if(!custom){e.preventDefault();e.stopImmediatePropagation();Roar('警告','請填寫自訂位置。','位置尚未完成');return;}
        const o=document.createElement('option');o.value=custom;o.textContent=custom;s.appendChild(o);s.value=custom;
      }
    },true);
    更新盤點位置選項();
  }

  function 加入卡片收合() {
    document.querySelectorAll('.卡片標題列').forEach(header=>{
      const card=header.closest('.卡片');
      if(!card||header.dataset.uiux收合)return;
      header.dataset.uiux收合='1';
      const btn=document.createElement('button'); btn.type='button'; btn.className='收合按鈕 無波紋'; btn.setAttribute('aria-expanded','true'); btn.innerHTML='<span>⌃</span>';
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();const closed=card.classList.toggle('已收合');btn.setAttribute('aria-expanded',String(!closed));btn.innerHTML=`<span>${closed?'⌄':'⌃'}</span>`;};
      header.appendChild(btn);
    });
  }

  function 加入主視覺收合() {
    document.querySelectorAll('.主視覺').forEach(box=>{
      if(box.dataset.uiux收合)return;
      box.dataset.uiux收合='1';box.classList.add('可收合主視覺');
      const btn=document.createElement('button');btn.type='button';btn.className='主視覺收合按鈕 無波紋';btn.textContent='收合';
      btn.onclick=()=>{const c=box.classList.toggle('已收合');btn.textContent=c?'展開':'收合';};box.appendChild(btn);
    });
  }

  function 壓縮超長機台內容() {
    const root=document.getElementById('頁面內容'); if(!root)return;
    root.querySelectorAll('section,.卡片,.清單').forEach(el=>{
      if(已處理長區段.has(el)||el.closest('.彈窗'))return;
      const txt=文字(el.textContent); if(txt.length<700)return;
      const count=(txt.match(/機台\s*\d+/g)||[]).length; if(count<12)return;
      已處理長區段.add(el);el.classList.add('UIUX長資料區','已精簡');
      const b=document.createElement('button');b.type='button';b.className='次要按鈕 UIUX展開長資料 無波紋';b.textContent=`顯示全部（${count} 台）`;
      b.onclick=()=>{const compact=el.classList.toggle('已精簡');b.textContent=compact?`顯示全部（${count} 台）`:'收合機台清單';};el.appendChild(b);
    });
  }

  function 波紋(e,btn){
    if(!btn||btn.classList.contains('無波紋'))return;
    const r=btn.getBoundingClientRect(),span=document.createElement('span'),size=Math.max(r.width,r.height);
    span.className='按鍵波紋';span.style.width=span.style.height=`${size}px`;span.style.left=`${(e.clientX||r.left+r.width/2)-r.left-size/2}px`;span.style.top=`${(e.clientY||r.top+r.height/2)-r.top-size/2}px`;btn.appendChild(span);setTimeout(()=>span.remove(),520);
  }

  function 補按鍵互動(){
    if(document.documentElement.dataset.uiuxButton122)return;
    document.documentElement.dataset.uiuxButton122='1';
    document.addEventListener('pointerdown',e=>{const b=e.target.closest('button,.主要按鈕,.次要按鈕,.危險按鈕');if(!b||b.disabled)return;b.classList.add('按壓中');波紋(e,b);},true);
    const clear=e=>e.target.closest('button,.主要按鈕,.次要按鈕,.危險按鈕')?.classList.remove('按壓中');
    document.addEventListener('pointerup',clear,true);document.addEventListener('pointercancel',clear,true);
    document.addEventListener('click',e=>{
      const b=e.target.closest('.主要按鈕,.危險按鈕,button[type="submit"]');
      if(!b||b.disabled||b.classList.contains('收合按鈕')||b.closest('.底部導航'))return;
      b.classList.add('載入中');setTimeout(()=>b.classList.remove('載入中'),420);
    },true);
  }

  function 是Standalone(){return!!(navigator.standalone||window.matchMedia?.('(display-mode: standalone)').matches);}
  async function 切換全螢幕(){
    try{
      if(document.fullscreenElement){if(document.exitFullscreen)await document.exitFullscreen();return;}
      if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();return;}
      if(是Standalone())return Roar('資訊','目前已是PWA獨立顯示模式。','全螢幕');
      Roar('警告','iPhone Safari 未開放此全螢幕API，請使用加入主畫面的PWA模式。','顯示模式');
    }catch(e){Roar('警告',`全螢幕切換失敗：${文字(e.message||e)}`,'顯示模式');}
  }
  function 補全螢幕按鈕(){
    const bar=document.querySelector('.狀態列');if(!bar||document.getElementById('全螢幕按鈕'))return;
    const b=document.createElement('button');b.type='button';b.id='全螢幕按鈕';b.className='全螢幕按鈕 無波紋';b.title='切換全螢幕';b.textContent='⛶';b.onclick=切換全螢幕;
    bar.insertBefore(b,document.getElementById('Roar事件按鈕')||document.getElementById('使用者頭像')||null);
  }
  function 更新紅牌列印文字(){document.querySelectorAll('[data-rp-action="print"]').forEach(b=>{if(!b.dataset.a4半張){b.dataset.a4半張='1';b.textContent='🖨 A4半張（A5）含QR列印';}});}

  function 執行補強(){
    改造盤點位置();排序巡檢區域卡片();加入卡片收合();加入主視覺收合();壓縮超長機台內容();補全螢幕按鈕();更新紅牌列印文字();
  }
  function 排程補強(){
    if(補強排程)return;
    補強排程=requestAnimationFrame(()=>{補強排程=0;執行補強();});
  }
  function 更新離線版本(){
    if(!('serviceWorker'in navigator))return;
    navigator.serviceWorker.register(`./離線服務.js?v=${入口版本}`,{scope:'./'}).then(reg=>reg.update().catch(()=>{})).catch(err=>console.warn('v1.2.2 Service Worker 更新失敗',err));
  }
  function 初始化(){
    補按鍵互動();更新離線版本();排程補強();
    ['頁面內容','彈窗內容'].forEach(id=>{const root=document.getElementById(id);if(!root)return;const obs=new MutationObserver(排程補強);obs.observe(root,{childList:true,subtree:true});});
    document.addEventListener('change',e=>{
      if(e.target?.id==='盤點區域')更新盤點位置選項();
      if(e.target?.id==='盤點位置')切換自訂位置();
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',初始化,{once:true});else初始化();
  全域.智慧5SUIUX=Object.freeze({版本,更新盤點位置選項,切換全螢幕,執行補強,整理區域選單,排序巡檢區域卡片});
})(window);
