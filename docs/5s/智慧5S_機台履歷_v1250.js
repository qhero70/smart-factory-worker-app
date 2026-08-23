(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S 機台履歷 v1.2.5
   * - 以 MCHK-{區域}-{機台} 為永久履歷檔號。
   * - 串聯巡檢主單、20項明細、改善、紅牌、照片與責任區。
   * - 只在使用者開啟履歷時讀取資料，避免增加首頁與巡檢頁負擔。
   */
  const 版本='1.2.5';
  const 設定=全域.智慧5S設定;
  const 資料庫=全域.智慧5S資料庫;
  const 快取=new Map();
  const 快取毫秒=30000;

  function 文字(v){return String(v==null?'':v).trim();}
  function 數值(v,d){const n=parseFloat(String(v==null?'':v).replace('%',''));return Number.isFinite(n)?n:(d||0);}
  function 轉義(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function 未結案(v){return !['已結案','已完成','已處置','作廢','取消'].includes(文字(v));}
  function 第一值(row,keys){for(const k of keys){if(row&&文字(row[k]))return 文字(row[k]);}return'';}
  function 含任一(row,targets){const hay=Object.values(row||{}).map(文字).join('|');return targets.some(x=>x&&hay.includes(x));}
  function 日期值(row){return Date.parse(第一值(row,['送出時間','建立時間','巡檢日期','更新時間','掛牌日','拍攝時間'])||'')||0;}

  async function 讀分頁(name,limit){
    if(!name)return[];
    const key=`${name}:${limit||5000}`;const now=Date.now();const hit=快取.get(key);
    if(hit&&now-hit.t<快取毫秒)return hit.data;
    const r=await 資料庫.讀取分頁(name,limit||5000);
    const data=Array.isArray(r&&r.資料)?r.資料:[];快取.set(key,{t:now,data});return data;
  }

  function 注入樣式(){
    if(document.getElementById('機台履歷1250樣式'))return;
    const s=document.createElement('style');s.id='機台履歷1250樣式';s.textContent=`
      .MH履歷鈕{justify-self:end;margin:-5px 8px 3px 0;border:1px solid #d6e5dd;background:#f4faf6;color:#176b47;border-radius:999px;min-height:38px;padding:7px 13px;font-weight:950;font-size:.72rem;box-shadow:0 5px 14px rgba(23,107,71,.08)}
      .MH遮罩{position:fixed;inset:0;z-index:2147482500;background:rgba(7,28,20,.52);backdrop-filter:blur(6px);display:flex;justify-content:flex-end;align-items:stretch}
      .MH面板{width:min(720px,100%);height:100%;overflow:auto;background:#f4f7f5;padding:calc(14px + env(safe-area-inset-top)) 14px calc(24px + env(safe-area-inset-bottom));box-shadow:-24px 0 56px rgba(4,30,19,.24)}
      .MH頭{position:sticky;top:calc(-14px - env(safe-area-inset-top));z-index:4;margin:calc(-14px - env(safe-area-inset-top)) -14px 14px;padding:calc(14px + env(safe-area-inset-top)) 14px 12px;background:rgba(248,251,249,.96);backdrop-filter:blur(16px);border-bottom:1px solid #d9e5df;display:flex;gap:10px;align-items:flex-start}.MH頭>div{flex:1;min-width:0}.MH頭 b{font-size:1.05rem}.MH頭 small{display:block;color:#6a7a71;margin-top:4px;line-height:1.5}.MH關閉{width:42px;min-width:42px;height:42px;border:0;border-radius:14px;background:#e7efea;color:#38574b;font-size:22px;font-weight:900}
      .MH摘要{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.MH數卡{background:#fff;border:1px solid #dce5df;border-radius:18px;padding:13px}.MH數卡 small{display:block;color:#718178;font-size:.68rem;font-weight:850}.MH數卡 b{display:block;font-size:1.55rem;margin-top:6px}.MH數卡 span{display:block;font-size:.65rem;margin-top:4px;color:#789087}
      .MH卡{background:#fff;border:1px solid #dce5df;border-radius:20px;padding:15px;margin-top:11px;box-shadow:0 8px 24px rgba(22,64,42,.06)}.MH卡標題{display:flex;justify-content:space-between;gap:8px;align-items:center}.MH卡標題 b{font-size:.93rem}.MH卡標題 span{font-size:.65rem;color:#789087}.MH空{color:#819289;text-align:center;padding:20px 8px;font-size:.76rem}
      .MH趨勢{width:100%;height:100px;margin-top:8px}.MH趨勢 polyline{fill:none;stroke:#176b47;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.MH趨勢 .基準{stroke:#d99018;stroke-width:1.5;stroke-dasharray:5 5}.MH趨勢 circle{fill:#fff;stroke:#176b47;stroke-width:2}.MH趨勢文字{display:flex;justify-content:space-between;color:#718178;font-size:.64rem;margin-top:-4px}
      .MH列表{display:grid;gap:7px;margin-top:10px}.MH列{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 0;border-bottom:1px dashed #e1e8e3}.MH列:last-child{border-bottom:0}.MH列 b{font-size:.78rem}.MH列 small{display:block;color:#718178;font-size:.67rem;line-height:1.45;margin-top:2px}.MH徽章{padding:5px 9px;border-radius:999px;background:#edf4ef;color:#176b47;font-size:.65rem;font-weight:900}.MH徽章.警{background:#fff0d9;color:#a76400}.MH徽章.危{background:#fde7e7;color:#b52b2b}
      .MH責任{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.MH責任>div{background:#f7faf8;border-radius:14px;padding:10px}.MH責任 small{display:block;color:#77877e;font-size:.65rem}.MH責任 b{display:block;margin-top:4px;font-size:.82rem}
      .MH載入{display:grid;place-items:center;min-height:45vh;color:#5d7469;text-align:center}.MH載入 b{display:block;margin-top:10px}
      @media(max-width:520px){.MH摘要{grid-template-columns:repeat(2,minmax(0,1fr))}.MH面板{padding-left:10px;padding-right:10px}.MH頭{margin-left:-10px;margin-right:-10px;padding-left:10px;padding-right:10px}.MH責任{grid-template-columns:1fr}.MH數卡 b{font-size:1.35rem}}
    `;document.head.appendChild(s);
  }

  function 趨勢SVG(rows){
    if(!rows.length)return'<div class="MH空">尚無巡檢分數可繪製</div>';
    const data=rows.slice().reverse().slice(-10);const w=320,h=90,p=12;
    const pts=data.map((r,i)=>{const x=data.length===1?w/2:p+i*(w-2*p)/(data.length-1);const val=Math.max(0,Math.min(100,數值(r.得分率)));const y=h-p-(val/100)*(h-2*p);return{x,y,val,date:第一值(r,['巡檢日期','送出時間']).slice(5,10)};});
    const line=pts.map(x=>`${x.x.toFixed(1)},${x.y.toFixed(1)}`).join(' ');const y85=h-p-.85*(h-2*p);
    return `<svg class="MH趨勢" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line class="基準" x1="${p}" y1="${y85}" x2="${w-p}" y2="${y85}"></line><polyline points="${line}"></polyline>${pts.map(x=>`<circle cx="${x.x}" cy="${x.y}" r="3.5"><title>${轉義(x.date)} ${x.val}%</title></circle>`).join('')}</svg><div class="MH趨勢文字"><span>${轉義(pts[0].date||'')}</span><span>85分基準</span><span>${轉義(pts[pts.length-1].date||'')}</span></div>`;
  }

  function 找責任(row,code,machine){
    return row.find(r=>[r.責任區代碼,r.子區域代碼,r.區域代碼,r['5S子區域代碼']].some(v=>文字(v)===code))||row.find(r=>含任一(r,[code,machine]))||{};
  }

  async function 建立資料(mchk){
    const 機台表=await 讀分頁(設定.分頁.機台巡檢設定||'5S_機台巡檢設定',1000);
    const machine=機台表.find(r=>文字(r.機台巡檢檔號)===mchk);if(!machine)throw new Error(`找不到 ${mchk} 機台巡檢設定`);
    const code=文字(machine['5S子區域代碼'])||`${文字(machine.主區域)}-${文字(machine.機台編號)}`;const no=文字(machine.機台編號);
    const results=await Promise.allSettled([
      讀分頁(設定.分頁.巡檢主檔||'5S_巡檢主檔',5000),讀分頁(設定.分頁.巡檢明細||'5S_巡檢明細',5000),讀分頁(設定.分頁.改善單||'5S_改善單',5000),讀分頁(設定.分頁.紅牌追蹤||'5S_紅牌追蹤',5000),讀分頁(設定.分頁.照片||'5S_照片',5000),讀分頁(設定.分頁.責任區主檔||'5S_責任區主檔',3000)
    ]);
    const val=i=>results[i].status==='fulfilled'?results[i].value:[];
    const masters=val(0).filter(r=>文字(r.區域代碼)===code||含任一(r,[mchk,code])).sort((a,b)=>日期值(b)-日期值(a));
    const ids=new Set(masters.map(r=>文字(r.巡檢單號)).filter(Boolean));
    const details=val(1).filter(r=>ids.has(文字(r.巡檢單號))).sort((a,b)=>日期值(b)-日期值(a));
    const detailIds=new Set(details.map(r=>文字(r.明細編號)).filter(Boolean));
    const improves=val(2).filter(r=>文字(r.區域代碼)===code||ids.has(文字(r.來源單號))||detailIds.has(文字(r.來源單號))||含任一(r,[mchk,code])).sort((a,b)=>日期值(b)-日期值(a));
    const reds=val(3).filter(r=>文字(r.區域代碼)===code||含任一(r,[mchk,code,`機台${no}`,`機台 ${no}`,no])).sort((a,b)=>日期值(b)-日期值(a));
    const refs=new Set([...ids,...detailIds,...improves.map(r=>文字(r.改善單號)),...reds.map(r=>文字(r.紅牌編號))].filter(Boolean));
    const photos=val(4).filter(r=>文字(r.區域代碼)===code||refs.has(文字(r.參照單號))||含任一(r,[mchk,code])).sort((a,b)=>日期值(b)-日期值(a));
    const responsibility=找責任(val(5),code,no);
    return{machine,code,masters,details,improves,reds,photos,responsibility};
  }

  function 常發異常(details){
    const map=new Map();details.forEach(r=>{const max=數值(r.最高分,4),score=數值(r.得分,max);const abnormal=['是','Y','TRUE','1'].includes(文字(r.是否異常).toUpperCase())||score<max;if(!abnormal)return;const code=第一值(r,['項目代碼','檢查項目代碼'])||'未編號';const x=map.get(code)||{code,count:0,text:第一值(r,['檢查內容','項目內容'])};x.count++;map.set(code,x);});return[...map.values()].sort((a,b)=>b.count-a.count).slice(0,5);
  }

  function 顯示(data){
    注入樣式();關閉();const {machine,code,masters,details,improves,reds,photos,responsibility}=data;
    const latest=masters[0]||{};const score=latest.得分率!==undefined?`${Math.round(數值(latest.得分率))}%`:'—';const openImp=improves.filter(r=>未結案(r.狀態));const openRed=reds.filter(r=>未結案(第一值(r,['案件狀態','狀態'])));const top=常發異常(details);
    const 主責=第一值(responsibility,['主要負責人','主責人','責任人','負責人姓名'])||'待指派';const 代理=第一值(responsibility,['代理人','備援人員','備援負責人'])||'—';const 主管=第一值(responsibility,['主管','主管姓名','複核主管'])||'—';const 頻率=第一值(responsibility,['稽核頻率','巡檢頻率'])||第一值(machine,['初始巡檢頻率'])||'—';
    const recent=masters.slice(0,6).map(r=>`<div class="MH列"><div><b>${轉義(第一值(r,['巡檢日期','送出時間'])||'未標日期')}</b><small>${轉義(r.巡檢單號)}｜${轉義(r.巡檢人姓名||'')}</small></div><span class="MH徽章 ${數值(r.得分率)>=85?'':'警'}">${Math.round(數值(r.得分率))}%</span></div>`).join('');
    const abnormal=top.map(x=>`<div class="MH列"><div><b>${轉義(x.code)}｜${轉義(x.text||'異常項目')}</b></div><span class="MH徽章 危">${x.count} 次</span></div>`).join('');
    const imp=openImp.slice(0,6).map(r=>`<div class="MH列"><div><b>${轉義(r.改善單號||'改善')}</b><small>${轉義(r.問題標題||r.問題說明||'')}</small></div><span class="MH徽章 警">${轉義(r.狀態||'未結')}</span></div>`).join('');
    const red=openRed.slice(0,6).map(r=>`<div class="MH列"><div><b>${轉義(r.紅牌編號||'紅牌')}｜${轉義(r.物品名稱||'')}</b><small>${轉義(r.暫存位置||r.區域||'')}</small></div><span class="MH徽章 危">${轉義(第一值(r,['案件狀態','狀態'])||'待處置')}</span></div>`).join('');
    const mask=document.createElement('div');mask.id='MH機台履歷遮罩';mask.className='MH遮罩';mask.innerHTML=`<aside class="MH面板" role="dialog" aria-modal="true" aria-label="機台5S電子履歷"><div class="MH頭"><div><b>${轉義(machine.主區域)}｜機台 ${轉義(machine.機台編號)}｜${轉義(machine.機台名稱)}</b><small>${轉義(machine.機台巡檢檔號)}｜${轉義(code)}｜${轉義(machine.清單版本||'V1.0')}</small></div><button class="MH關閉" type="button" aria-label="關閉">×</button></div><section class="MH摘要"><div class="MH數卡"><small>最近分數</small><b>${score}</b><span>${轉義(firstDate(latest)||'尚無巡檢')}</span></div><div class="MH數卡"><small>巡檢累計</small><b>${masters.length}</b><span>正式主單</span></div><div class="MH數卡"><small>未結改善</small><b>${openImp.length}</b><span>需持續追蹤</span></div><div class="MH數卡"><small>紅牌未結</small><b>${openRed.length}</b><span>現場待處置</span></div></section><section class="MH卡"><div class="MH卡標題"><b>📈 最近10次分數趨勢</b><span>85分為管理基準</span></div>${趨勢SVG(masters)}</section><section class="MH卡"><div class="MH卡標題"><b>👤 責任與巡檢設定</b><span>${轉義(頻率)}</span></div><div class="MH責任"><div><small>主要負責人</small><b>${轉義(主責)}</b></div><div><small>代理人</small><b>${轉義(代理)}</b></div><div><small>主管</small><b>${轉義(主管)}</b></div><div><small>照片證據</small><b>${photos.length} 張</b></div></div></section><section class="MH卡"><div class="MH卡標題"><b>⚠️ 常發異常 TOP5</b><span>依歷史20項明細統計</span></div><div class="MH列表">${abnormal||'<div class="MH空">尚無異常歷史</div>'}</div></section><section class="MH卡"><div class="MH卡標題"><b>🛠 未結改善</b><span>${openImp.length} 件</span></div><div class="MH列表">${imp||'<div class="MH空">目前沒有未結改善</div>'}</div></section><section class="MH卡"><div class="MH卡標題"><b>🏷 紅牌案件</b><span>${openRed.length} 件未結</span></div><div class="MH列表">${red||'<div class="MH空">目前沒有未結紅牌</div>'}</div></section><section class="MH卡"><div class="MH卡標題"><b>📋 最近巡檢紀錄</b><span>${masters.length} 次</span></div><div class="MH列表">${recent||'<div class="MH空">尚無巡檢紀錄</div>'}</div></section></aside>`;
    document.body.appendChild(mask);document.body.dataset.mhOverflow=document.body.style.overflow||'';document.body.style.overflow='hidden';mask.querySelector('.MH關閉').onclick=關閉;mask.addEventListener('click',e=>{if(e.target===mask)關閉();});
  }
  function firstDate(r){return 第一值(r,['巡檢日期','送出時間','建立時間']).slice(0,10);}
  function 關閉(){const m=document.getElementById('MH機台履歷遮罩');if(m)m.remove();if(document.body){document.body.style.overflow=document.body.dataset.mhOverflow||'';delete document.body.dataset.mhOverflow;}}

  async function 開啟機台履歷(mchk){
    注入樣式();關閉();const loading=document.createElement('div');loading.id='MH機台履歷遮罩';loading.className='MH遮罩';loading.innerHTML='<aside class="MH面板"><div class="MH載入"><div><div style="font-size:38px">📚</div><b>正在建立機台5S電子履歷</b><small>串聯巡檢、改善、紅牌、照片與責任區…</small></div></div></aside>';document.body.appendChild(loading);
    try{const data=await 建立資料(mchk);顯示(data);}catch(err){loading.remove();if(全域.智慧5SRoar&&全域.智慧5SRoar.錯誤)全域.智慧5SRoar.錯誤(err.message,'機台履歷載入失敗');else alert(err.message);}
  }

  function 補強履歷按鈕(){
    document.querySelectorAll('.MCHK機台卡[data-mchk]').forEach(card=>{const next=card.nextElementSibling;if(next&&next.classList.contains('MH履歷鈕'))return;const b=document.createElement('button');b.type='button';b.className='MH履歷鈕';b.dataset.mh=card.dataset.mchk;b.textContent='📚 查看5S履歷';card.insertAdjacentElement('afterend',b);});
  }
  function 排程補強(delay){setTimeout(補強履歷按鈕,delay||80);}

  document.addEventListener('click',e=>{const h=e.target.closest?.('.MH履歷鈕');if(h){e.preventDefault();e.stopPropagation();開啟機台履歷(h.dataset.mh);return;}if(e.target.closest?.('.導航按鈕[data-page="巡檢"],.導航按鈕[data-頁面="巡檢"],.MCHK區域鈕,#MCHK更新')){排程補強(120);排程補強(380);}} ,true);
  document.addEventListener('input',e=>{if(e.target&&e.target.id==='MCHK搜尋')排程補強(220);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')關閉();});
  [300,800,1600].forEach(排程補強);
  注入樣式();
  全域.智慧5S機台履歷=Object.freeze({版本,開啟機台履歷,補強履歷按鈕,清除快取:()=>快取.clear()});
})(window);
