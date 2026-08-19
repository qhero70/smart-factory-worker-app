(function (全域) {
  'use strict';

  const 模組版本 = '1.0.8';
  let 監看器 = null;
  let 更新計時器 = null;

  function 文字(值) { return String(值 ?? '').trim(); }
  function 轉義(值) {
    return String(值 ?? '').replace(/[&<>'\"]/g, 字元 => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'})[字元]);
  }
  function 今天字串() {
    const 現在 = new Date();
    return `${現在.getFullYear()}-${String(現在.getMonth()+1).padStart(2,'0')}-${String(現在.getDate()).padStart(2,'0')}`;
  }
  function 日期字串(值) {
    return 文字(值).slice(0,10).replace(/\//g,'-');
  }
  function 解析日期(值) {
    const 內容 = 日期字串(值);
    const 符合 = 內容.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    return 符合 ? new Date(Number(符合[1]), Number(符合[2])-1, Number(符合[3]), 12, 0, 0) : null;
  }
  function 本週星期一() {
    const 現在 = new Date();
    const 星期 = 現在.getDay() === 0 ? 7 : 現在.getDay();
    const 星期一 = new Date(現在.getFullYear(), 現在.getMonth(), 現在.getDate()-(星期-1), 0,0,0);
    return 星期一;
  }
  function 是否測試資料(列) {
    const 合併 = [列.巡檢單號,列.巡檢人工號,列.巡檢人姓名,列.裝置識別碼,列.備註].map(文字).join('｜');
    return 合併.includes('智慧5S自動驗收') || 合併.includes('SYSTEM-5S-TEST') || 合併.includes('SYSTEM-ACCEPTANCE') || 合併.includes('TEST_ONLY');
  }
  function 區域鍵(列) { return 文字(列.區域代碼 || 列.區域 || 列.區域名稱).replace(/\s+/g,''); }

  function 注入樣式() {
    if (document.getElementById('智慧5S巡檢覆蓋樣式')) return;
    const 樣式 = document.createElement('style');
    樣式.id = '智慧5S巡檢覆蓋樣式';
    樣式.textContent = `
      .巡檢覆蓋區{margin:0 0 18px;padding:18px;border-radius:24px;background:#fff;border:1px solid rgba(16,24,40,.08);box-shadow:0 14px 38px rgba(16,24,40,.07)}
      .巡檢覆蓋標題列{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.巡檢覆蓋標題列 h2{margin:0 0 4px;font-size:1.12rem;color:#18251f}.巡檢覆蓋標題列 p{margin:0;color:#667085;font-size:.78rem;line-height:1.5}.巡檢覆蓋版本{padding:5px 8px;border-radius:999px;background:#eef8f2;color:#176b47;font-weight:900;font-size:.7rem}
      .巡檢覆蓋摘要{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:14px}.巡檢覆蓋卡{padding:12px;border-radius:16px;background:#f7faf8;border:1px solid #e5ece8}.巡檢覆蓋卡 small{display:block;color:#667085;font-size:.69rem;font-weight:700}.巡檢覆蓋卡 b{display:block;margin-top:5px;font-size:1.35rem;color:#173f30}.巡檢覆蓋卡 span{display:block;margin-top:2px;color:#7a8580;font-size:.66rem}.巡檢覆蓋卡.危險{background:#fff1f0;border-color:#ffd5d1}.巡檢覆蓋卡.危險 b{color:#b42318}.巡檢覆蓋卡.警告{background:#fff8e9;border-color:#ffe5aa}.巡檢覆蓋卡.警告 b{color:#b54708}.巡檢覆蓋卡.正常{background:#eef9f2;border-color:#cfead9}.巡檢覆蓋卡.正常 b{color:#167647}
      .巡檢進度條{height:12px;border-radius:999px;background:#edf1ee;overflow:hidden;margin:2px 0 14px}.巡檢進度值{height:100%;border-radius:999px;background:linear-gradient(90deg,#1f9d65,#43c27f);transition:width .35s ease}.巡檢進度值.低{background:linear-gradient(90deg,#e0473e,#f17667)}.巡檢進度值.中{background:linear-gradient(90deg,#efa51f,#f7c24d)}
      .巡檢分組標題{margin:14px 0 8px;font-size:.78rem;font-weight:900;color:#354d42}.巡檢分組標題 span{font-weight:700;color:#7a8580}
      .今日巡檢清單{display:grid;gap:8px}.今日巡檢項{display:grid;grid-template-columns:minmax(0,1fr) 104px;gap:10px;align-items:center;padding:11px 12px;border-radius:15px;border:1px solid #e8ece9;background:#fbfcfb}.今日巡檢項 strong{display:block;font-size:.86rem;color:#18251f}.今日巡檢項 small{display:block;margin-top:3px;color:#667085;font-size:.68rem}.今日巡檢狀態{text-align:center;padding:6px 8px;border-radius:999px;font-size:.72rem;font-weight:900}.今日巡檢狀態.完成{background:#eaf8ef;color:#167647}.今日巡檢狀態.待辦{background:#fff3df;color:#b54708}.今日巡檢狀態.週期{background:#eef3ff;color:#3559a8}
      .巡檢覆蓋說明{margin-top:11px;padding:10px 12px;border-radius:14px;background:#f5f7f6;color:#68746e;font-size:.69rem;line-height:1.55}
      @media(max-width:720px){.巡檢覆蓋摘要{grid-template-columns:repeat(2,minmax(0,1fr))}.巡檢覆蓋區{padding:14px;border-radius:20px}}
    `;
    document.head.appendChild(樣式);
  }

  async function 讀取資料() {
    const 設定 = 全域.智慧5S設定;
    const 資料庫 = 全域.智慧5S資料庫;
    if (!設定 || !資料庫 || typeof 資料庫.讀取分頁 !== 'function') return null;
    const [區域結果,巡檢結果,參數結果] = await Promise.all([
      資料庫.讀取分頁(設定.分頁.區域主檔,設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.巡檢主檔,設定.讀取上限),
      資料庫.讀取分頁(設定.分頁.系統參數,500)
    ]);
    const 區域 = (Array.isArray(區域結果.資料)?區域結果.資料:[]).filter(列=>文字(列.啟用)!=='否');
    const 巡檢 = (Array.isArray(巡檢結果.資料)?巡檢結果.資料:[]).filter(列=>!是否測試資料(列)&&文字(列.狀態)!=='作廢');
    const 參數 = {};
    (Array.isArray(參數結果.資料)?參數結果.資料:[]).forEach(列=>{ const 鍵=文字(列.參數鍵); if(鍵) 參數[鍵]=文字(列.參數值); });
    return {區域,巡檢,參數};
  }

  function 計算(資料) {
    const 今天 = 今天字串();
    const 週起 = 本週星期一();
    const 今日已巡 = new Set();
    const 本週已巡 = new Set();
    const 今日 = new Date();
    const 星期 = 今日.getDay()===0?7:今日.getDay();
    const 每週截止星期 = Number(資料.參數['每週巡檢截止星期']||5);

    資料.巡檢.forEach(列=>{
      const 鍵 = 區域鍵(列);
      if(!鍵) return;
      const 日期 = 解析日期(列.巡檢日期||列.送出時間||列.建立時間);
      if(!日期) return;
      if(日期字串(列.巡檢日期||列.送出時間||列.建立時間)===今天) 今日已巡.add(鍵);
      if(日期.getTime()>=週起.getTime() && 日期.getTime()<=今日.getTime()) 本週已巡.add(鍵);
    });

    const 每日清單=[];
    const 每週清單=[];
    資料.區域.forEach(列=>{
      const 代碼=文字(列.區域代碼), 名稱=文字(列.區域名稱||代碼), 頻率=文字(列.巡檢頻率||'每日');
      const 鍵=代碼.replace(/\s+/g,'');
      if(頻率==='每週') 每週清單.push({區域代碼:代碼,區域名稱:名稱,巡檢頻率:頻率,已完成:本週已巡.has(鍵),已到截止:星期>=每週截止星期});
      else 每日清單.push({區域代碼:代碼,區域名稱:名稱,巡檢頻率:頻率,已完成:今日已巡.has(鍵)});
    });

    const 每日完成數=每日清單.filter(列=>列.已完成).length;
    const 每日應巡數=每日清單.length;
    const 每日覆蓋率=每日應巡數?Math.round(每日完成數/每日應巡數*100):100;
    const 每日待巡數=Math.max(0,每日應巡數-每日完成數);
    const 每週完成數=每週清單.filter(列=>列.已完成).length;
    const 每週待巡數=每週清單.filter(列=>列.已到截止&&!列.已完成).length;
    return {今天,每日清單,每週清單,每日完成數,每日應巡數,每日覆蓋率,每日待巡數,每週完成數,每週待巡數,每週截止星期};
  }

  function 建立HTML(結果) {
    const 覆蓋類別=結果.每日覆蓋率>=90?'正常':(結果.每日覆蓋率>=60?'警告':'危險');
    const 進度類別=結果.每日覆蓋率>=90?'':(結果.每日覆蓋率>=60?'中':'低');
    const 每日HTML=結果.每日清單.map(列=>`<div class="今日巡檢項"><div><strong>${轉義(列.區域名稱)}</strong><small>${轉義(列.區域代碼)}｜頻率：每日</small></div><span class="今日巡檢狀態 ${列.已完成?'完成':'待辦'}">${列.已完成?'✓ 今日已巡':'待巡檢'}</span></div>`).join('');
    const 每週HTML=結果.每週清單.map(列=>`<div class="今日巡檢項"><div><strong>${轉義(列.區域名稱)}</strong><small>${轉義(列.區域代碼)}｜頻率：每週｜截止星期 ${結果.每週截止星期}</small></div><span class="今日巡檢狀態 ${列.已完成?'完成':(列.已到截止?'待辦':'週期')}">${列.已完成?'✓ 本週已巡':(列.已到截止?'本週待巡':'本週未到期')}</span></div>`).join('');
    return `<section id="智慧5S巡檢覆蓋" class="巡檢覆蓋區"><div class="巡檢覆蓋標題列"><div><h2>🧭 巡檢覆蓋與今日任務</h2><p>每日巡檢與每週巡檢分開管理，避免週期不同造成主管 KPI 誤判。</p></div><span class="巡檢覆蓋版本">v${模組版本}</span></div><div class="巡檢覆蓋摘要"><div class="巡檢覆蓋卡"><small>每日應巡</small><b>${結果.每日應巡數}</b><span>今日納管區域</span></div><div class="巡檢覆蓋卡 正常"><small>今日已巡</small><b>${結果.每日完成數}</b><span>正式巡檢紀錄</span></div><div class="巡檢覆蓋卡 ${覆蓋類別}"><small>今日覆蓋率</small><b>${結果.每日覆蓋率}%</b><span>${轉義(結果.今天)}</span></div><div class="巡檢覆蓋卡 ${結果.每日待巡數?'警告':'正常'}"><small>今日待巡</small><b>${結果.每日待巡數}</b><span>不含每週區域</span></div></div><div class="巡檢進度條"><div class="巡檢進度值 ${進度類別}" style="width:${Math.max(0,Math.min(100,結果.每日覆蓋率))}%"></div></div><div class="巡檢分組標題">📅 每日巡檢 <span>${結果.每日完成數}/${結果.每日應巡數}</span></div><div class="今日巡檢清單">${每日HTML||'<div class="巡檢覆蓋說明">目前沒有每日巡檢區域。</div>'}</div><div class="巡檢分組標題">🗓 本週巡檢 <span>${結果.每週完成數}/${結果.每週清單.length}</span></div><div class="今日巡檢清單">${每週HTML||'<div class="巡檢覆蓋說明">目前沒有每週巡檢區域。</div>'}</div><div class="巡檢覆蓋說明">LINE 提醒依中央參數在 10:30、13:30、15:30 三段檢查。完成巡檢後不再建立後續提醒；每週區域只在設定的截止星期後才列為本週欠巡。系統驗收與作廢資料自動排除。</div></section>`;
  }

  async function 更新() {
    const 內容=document.getElementById('頁面內容');
    if(!內容||!document.querySelector('.導航按鈕[data-頁面="首頁"].作用中')) return;
    try{
      const 資料=await 讀取資料();
      if(!資料) return;
      const 結果=計算(資料);
      const 舊=document.getElementById('智慧5S巡檢覆蓋');
      if(舊) 舊.remove();
      const 容器=document.createElement('div');
      容器.innerHTML=建立HTML(結果);
      const 趨勢=document.getElementById('智慧5S趨勢分析');
      if(趨勢&&趨勢.parentNode) 趨勢.parentNode.insertBefore(容器.firstElementChild,趨勢.nextSibling);
      else 內容.appendChild(容器.firstElementChild);
    }catch(錯誤){ console.warn('智慧5S巡檢覆蓋更新失敗',錯誤); }
  }

  function 啟動(){
    注入樣式();
    setTimeout(更新,1200);
    if(監看器) return;
    const 內容=document.getElementById('頁面內容');
    if(!內容) return;
    監看器=new MutationObserver(()=>{clearTimeout(更新計時器);更新計時器=setTimeout(更新,450);});
    監看器.observe(內容,{childList:true,subtree:false});
    document.addEventListener('click',事件=>{const 按鈕=事件.target.closest&&事件.target.closest('.導航按鈕[data-頁面="首頁"]');if(按鈕)setTimeout(更新,650);});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',啟動); else 啟動();
  全域.智慧5S巡檢覆蓋=Object.freeze({版本:模組版本,更新});
})(window);
