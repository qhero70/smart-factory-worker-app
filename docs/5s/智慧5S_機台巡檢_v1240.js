(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S 機台巡檢 v1.2.4
   * 核心原則：
   * 1. 77 台機台一機一檔：MCHK-{區域}-{機台}
   * 2. 共用「清單-可視化0-4」20項母版，不複製1540筆標準
   * 3. 每次巡檢：1張主單 + 20筆固定明細（01~20）
   * 4. 評分固定：4/3/2/1/0；低於滿分必須填原因與拍照
   */
  const 版本 = '1.2.4';
  const 設定 = 全域.智慧5S設定;
  const 資料庫 = 全域.智慧5S資料庫;
  const 區域順序 = ['A4','A5','A6','A7','A8','B2','B5'];
  const 使用者鍵 = '智慧5S_目前使用者';

  const 巡檢主檔欄位 = ['巡檢單號','區域代碼','區域名稱','檢查清單代碼','巡檢人工號','巡檢人姓名','巡檢日期','開始時間','送出時間','總得分','最高總分','得分率','異常項數','狀態','裝置識別碼','備註','建立時間'];
  const 巡檢明細欄位 = ['明細編號','巡檢單號','項目代碼','5S分類','檢查內容','得分','最高分','權重','是否異常','異常原因','照片資料','改善單號','建立時間'];
  const 改善單欄位 = ['改善單號','來源類型','來源單號','區域代碼','區域名稱','5S分類','問題標題','問題說明','嚴重度','負責人工號','負責人姓名','期限','狀態','改善前照片','改善後照片','驗證人工號','驗證時間','驗證結果','結案時間','逾期天數','建立時間','更新時間'];
  const 改善歷程欄位 = ['歷程編號','改善單號','動作','原狀態','新狀態','執行人工號','執行人姓名','執行時間','說明'];
  const 照片欄位 = ['照片編號','參照類型','參照單號','區域代碼','上傳人工號','拍攝時間','資料摘要','儲存方式','照片資料'];
  const 通知欄位 = ['通知編號','通知場景','對象類型','對象識別碼','訊息類型','內容摘要','狀態','送出時間','錯誤訊息','去重鍵'];

  const 狀態 = {
    設定清單: [],
    項目母版: [],
    區域主檔: [],
    人員: [],
    篩選區域: '全部',
    搜尋: '',
    巡檢: null,
    已載入: false,
    載入中: false
  };

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 數值(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d == null ? 0 : d); }
  function 轉義(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function 補零(n) { return String(n).padStart(2, '0'); }
  function 現在() { return new Date(); }
  function 日期字串(d) { d = d instanceof Date ? d : new Date(d || Date.now()); return `${d.getFullYear()}-${補零(d.getMonth()+1)}-${補零(d.getDate())}`; }
  function 完整時間(d) { d = d instanceof Date ? d : new Date(d || Date.now()); return `${日期字串(d)} ${補零(d.getHours())}:${補零(d.getMinutes())}:${補零(d.getSeconds())}`; }
  function 日期加天(d, days) { const x = new Date(d); x.setDate(x.getDate() + Number(days || 0)); return 日期字串(x); }
  function 隨機碼(prefix) { const d = 現在(); return `${prefix}-${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}${補零(d.getHours())}${補零(d.getMinutes())}${補零(d.getSeconds())}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
  function 使用者() { try { return JSON.parse(localStorage.getItem(使用者鍵) || 'null') || {}; } catch (_) { return {}; } }
  function 裝置碼() { let id = localStorage.getItem('智慧5S_裝置識別碼'); if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : 隨機碼('裝置'); localStorage.setItem('智慧5S_裝置識別碼', id); } return id; }
  function 發Roar(類型, 標題, 內容) { if (全域.智慧5SRoar && 全域.智慧5SRoar.發送) 全域.智慧5SRoar.發送({類型,標題,內容,來源:'機台巡檢'}); }
  function 主內容() { return document.getElementById('頁面內容'); }

  function 注入樣式() {
    if (document.getElementById('機台巡檢1240樣式')) return;
    const s = document.createElement('style');
    s.id = '機台巡檢1240樣式';
    s.textContent = `
      .MCHK頁{padding-bottom:18px}.MCHK工具列{display:flex;gap:8px;overflow:auto;padding:4px 0 10px;scrollbar-width:none}.MCHK工具列::-webkit-scrollbar{display:none}.MCHK區域鈕{flex:none;border:1px solid #dbe7df;background:#fff;color:#617169;border-radius:999px;padding:9px 14px;font-weight:900}.MCHK區域鈕.作用中{background:#176b47;color:#fff;border-color:#176b47}.MCHK搜尋{width:100%;border:1px solid #dce5df;border-radius:16px;background:#fff;padding:13px 14px;font-weight:800;outline:none}.MCHK搜尋:focus{border-color:#176b47;box-shadow:0 0 0 4px rgba(23,107,71,.10)}
      .MCHK機台清單{display:grid;gap:10px}.MCHK機台卡{width:100%;text-align:left;border:1px solid #dce5df;background:#fff;border-radius:19px;padding:15px;box-shadow:0 8px 22px rgba(22,64,42,.06);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.MCHK機台卡 b{display:block;font-size:.98rem;color:#17221b}.MCHK機台卡 small{display:block;color:#6b786f;margin-top:4px;line-height:1.45}.MCHK開始{padding:8px 11px;border-radius:999px;background:#e0f4e8;color:#176b47;font-weight:950;font-size:.72rem}
      .MCHK頁頭{position:sticky;top:62px;z-index:560;margin:-4px 0 12px;padding:12px;border-radius:18px;background:rgba(247,250,248,.96);backdrop-filter:blur(14px);border:1px solid #dfe7e2}.MCHK頁頭上{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.MCHK頁頭 b{font-size:.92rem}.MCHK頁頭 small{display:block;margin-top:4px;color:#68766e}.MCHK進度{height:9px;background:#e4ebe6;border-radius:99px;overflow:hidden;margin-top:10px}.MCHK進度 span{display:block;height:100%;background:linear-gradient(90deg,#176b47,#3bb47c);transition:width .22s ease}
      .MCHK項目卡{background:#fff;border:1px solid #dce5df;border-radius:24px;padding:18px;box-shadow:0 12px 30px rgba(22,64,42,.08)}.MCHK項目卡.異常{border-color:#e8b0b0;background:#fffafa}.MCHK題頭{display:flex;gap:12px}.MCHK序號{width:44px;height:44px;border-radius:14px;background:#7b213f;color:#fff;display:grid;place-items:center;font-weight:950;flex:none}.MCHK題目{font-size:1.05rem;font-weight:950;line-height:1.55}.MCHK基準{font-size:.75rem;color:#69766f;line-height:1.6;margin-top:5px}.MCHK標籤列{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.MCHK標籤{padding:5px 9px;border-radius:99px;background:#edf3ef;color:#5f7066;font-size:.67rem;font-weight:900}.MCHK標籤.代碼{background:#e8f1fb;color:#25669b}
      .MCHK評分{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:18px}.MCHK分數{border:1px solid #d9e2dc;background:#f7f9f8;border-radius:15px;min-height:64px;font-weight:950;color:#5f6f66;padding:8px 2px}.MCHK分數 b{display:block;font-size:1.18rem}.MCHK分數 small{font-size:.62rem}.MCHK分數.選中{color:#fff;border-color:transparent;transform:translateY(-2px);box-shadow:0 8px 18px rgba(20,60,40,.16)}.MCHK分數[data-score="4"].選中{background:#168756}.MCHK分數[data-score="3"].選中{background:#2d70c9}.MCHK分數[data-score="2"].選中{background:#d99018}.MCHK分數[data-score="1"].選中{background:#b94a48}.MCHK分數[data-score="0"].選中{background:#d64545}
      .MCHK異常區{margin-top:16px;padding-top:14px;border-top:1px dashed #e4b9b9;display:grid;gap:10px}.MCHK異常區.隱藏{display:none!important}.MCHK文字{width:100%;min-height:92px;border:1px solid #dce5df;border-radius:15px;padding:12px;background:#fff;font:inherit}.MCHK拍照{min-height:52px;border:1px dashed #8fb3a0;border-radius:15px;background:#f1f8f4;color:#176b47;font-weight:950;display:flex;align-items:center;justify-content:center}.MCHK照片{width:100%;max-height:260px;object-fit:cover;border-radius:16px}.MCHK操作{display:grid;grid-template-columns:1fr 1.4fr;gap:9px;margin-top:14px}.MCHK操作 button{border:0;border-radius:16px;min-height:50px;font-weight:950}.MCHK返回{background:#edf3ef;color:#4f6257}.MCHK下一步{background:#176b47;color:#fff}.MCHK取消{width:100%;margin-top:10px;border:0;background:transparent;color:#a13b3b;font-weight:850;padding:10px}
      .MCHK結果{text-align:center;padding:28px 18px}.MCHK結果大字{font-size:2.8rem;font-weight:950;color:#176b47}.MCHK結果 small{display:block;color:#68766e;margin-top:6px}.MCHK結果按鈕{margin-top:18px;border:0;border-radius:16px;background:#176b47;color:#fff;font-weight:950;padding:13px 20px}
      @media(max-width:390px){.MCHK評分{gap:5px}.MCHK分數{min-height:60px}.MCHK分數 small{font-size:.56rem}.MCHK題目{font-size:.98rem}.MCHK序號{width:40px;height:40px}}
    `;
    document.head.appendChild(s);
  }

  async function 讀分頁(name, limit) {
    const r = await 資料庫.讀取分頁(name, limit || 設定.讀取上限 || 5000);
    return Array.isArray(r && r.資料) ? r.資料 : [];
  }

  async function 載入設定(強制) {
    if (狀態.已載入 && !強制) return;
    if (狀態.載入中) return;
    狀態.載入中 = true;
    try {
      const [機台, 項目, 區域, 人員] = await Promise.all([
        讀分頁(設定.分頁.機台巡檢設定 || '5S_機台巡檢設定', 1000),
        讀分頁(設定.分頁.檢查項目 || '5S_檢查項目', 500),
        讀分頁(設定.分頁.區域主檔 || '5S_區域主檔', 1000),
        讀分頁(設定.分頁.人員主檔 || '01_人員主檔', 1000)
      ]);
      狀態.設定清單 = 機台.filter(r => 文字(r.設定狀態) !== '停用' && 文字(r.啟用狀態) !== '否');
      狀態.項目母版 = 項目.filter(r => 文字(r.啟用) !== '否');
      狀態.區域主檔 = 區域;
      狀態.人員 = 人員;
      狀態.已載入 = true;
    } finally { 狀態.載入中 = false; }
  }

  function 排序機台(a,b) {
    const ai = 區域順序.indexOf(文字(a.主區域)), bi = 區域順序.indexOf(文字(b.主區域));
    if (ai !== bi) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    return 文字(a.機台編號).localeCompare(文字(b.機台編號), 'zh-Hant-TW', {numeric:true});
  }

  async function 開啟() {
    const root = 主內容();
    if (!root || !設定 || !資料庫) return;
    注入樣式();
    document.querySelectorAll('.導航按鈕').forEach(b => b.classList.toggle('作用中', (b.dataset.page || b.dataset.頁面) === '巡檢'));
    const title = document.getElementById('頁面標題'), sub = document.getElementById('頁面副標');
    if (title) title.textContent = '機台20項行動巡檢';
    if (sub) sub.textContent = '一機一檔｜4/3/2/1/0｜異常照片與改善閉環';
    root.innerHTML = '<div class="空狀態"><div class="空狀態圖示">⏳</div><b>載入77台機台巡檢設定</b><span>正在同步20項0-4母版</span></div>';
    try { await 載入設定(false); 顯示機台清單(); }
    catch (e) { root.innerHTML = `<div class="卡片"><div class="空狀態"><div class="空狀態圖示">⚠️</div><b>巡檢設定載入失敗</b><span>${轉義(e.message || e)}</span><button id="MCHK重試" class="主要按鈕" style="margin-top:14px">重新載入</button></div></div>`; document.getElementById('MCHK重試').onclick=()=>{狀態.已載入=false;開啟();}; }
  }

  function 顯示機台清單() {
    const root = 主內容(); if (!root) return;
    const areas = [...new Set(狀態.設定清單.map(r=>文字(r.主區域)).filter(Boolean))].sort((a,b)=>區域順序.indexOf(a)-區域順序.indexOf(b));
    let rows = 狀態.設定清單.slice().sort(排序機台);
    if (狀態.篩選區域 !== '全部') rows = rows.filter(r=>文字(r.主區域)===狀態.篩選區域);
    if (狀態.搜尋) { const q=狀態.搜尋.toLowerCase(); rows=rows.filter(r=>[r.機台編號,r.機台名稱,r.機台巡檢檔號,r['5S子區域代碼']].some(x=>文字(x).toLowerCase().includes(q))); }
    const cards = rows.map((r,i)=>`<button type="button" class="MCHK機台卡" data-mchk="${轉義(r.機台巡檢檔號)}"><div><b>${轉義(r.主區域)}｜機台 ${轉義(r.機台編號)}｜${轉義(r.機台名稱)}</b><small>${轉義(r.機台巡檢檔號)}｜${轉義(r.清單版本||'V1.0')}｜${轉義(r.點檢序號範圍||'01-20')}</small></div><span class="MCHK開始">開始 20 項</span></button>`).join('');
    root.innerHTML = `<section class="MCHK頁"><section class="主視覺"><h2>77台機台，一機一份巡檢檔</h2><p>20項標準只維護一份母版。選擇機台後，每次巡檢自動建立主單與01～20明細，不再複製1540筆標準。</p></section><div class="區段標題"><div><h2>選擇機台</h2><p>目前 ${rows.length} 台｜總計 ${狀態.設定清單.length} 台</p></div><button id="MCHK更新" class="次要按鈕 小按鈕">更新</button></div><div class="MCHK工具列"><button class="MCHK區域鈕 ${狀態.篩選區域==='全部'?'作用中':''}" data-area="全部">全部</button>${areas.map(a=>`<button class="MCHK區域鈕 ${狀態.篩選區域===a?'作用中':''}" data-area="${a}">${a}</button>`).join('')}</div><input id="MCHK搜尋" class="MCHK搜尋" placeholder="搜尋機台號碼、名稱或MCHK檔號" value="${轉義(狀態.搜尋)}"><div class="MCHK機台清單" style="margin-top:10px">${cards || '<div class="空狀態">找不到符合條件的機台</div>'}</div></section>`;
    root.querySelectorAll('[data-area]').forEach(b=>b.onclick=()=>{狀態.篩選區域=b.dataset.area;顯示機台清單();});
    document.getElementById('MCHK搜尋').oninput=e=>{狀態.搜尋=e.target.value; clearTimeout(顯示機台清單.t); 顯示機台清單.t=setTimeout(顯示機台清單,120);};
    document.getElementById('MCHK更新').onclick=async()=>{狀態.已載入=false; await 載入設定(true); 顯示機台清單(); 發Roar('成功','巡檢設定已更新',`已載入 ${狀態.設定清單.length} 台機台`);};
    root.querySelectorAll('[data-mchk]').forEach(b=>b.onclick=()=>開始巡檢(狀態.設定清單.find(r=>文字(r.機台巡檢檔號)===b.dataset.mchk)));
  }

  function 開始巡檢(machine) {
    if (!machine) return;
    const listCode = 文字(machine.檢查清單代碼) || '清單-可視化0-4';
    const items = 狀態.項目母版.filter(r=>文字(r.檢查清單代碼)===listCode && 文字(r.啟用)!=='否').sort((a,b)=>數值(a.順序)-數值(b.順序)).map(r=>({資料:r,分數:null,原因:'',照片:''}));
    if (!items.length) { 發Roar('警告','沒有點檢項目',`${listCode} 尚未建立母版`); return; }
    狀態.巡檢={機台:machine,項目:items,索引:0,開始時間:完整時間(現在()),備註:''};
    顯示單項();
  }

  function 顯示單項() {
    const root=主內容(), ins=狀態.巡檢; if(!root||!ins)return;
    const idx=ins.索引, item=ins.項目[idx], d=item.資料, max=數值(d.最高分,4);
    const percent=Math.round((idx/ins.項目.length)*100);
    const scores=max===4?[[4,'符合'],[3,'輕微'],[2,'明顯'],[1,'嚴重'],[0,'失控']]:[[5,'符合'],[3,'輕微'],[1,'異常'],[0,'重大']];
    const selected=item.分數;
    const abnormal=selected!==null && selected<max;
    root.innerHTML=`<section class="MCHK頁"><div class="MCHK頁頭"><div class="MCHK頁頭上"><div><b>${轉義(ins.機台.主區域)}｜機台 ${轉義(ins.機台.機台編號)}｜${轉義(ins.機台.機台名稱)}</b><small>${轉義(ins.機台.機台巡檢檔號)}｜${轉義(ins.機台.清單版本||'V1.0')}</small></div><b>${idx+1} / ${ins.項目.length}</b></div><div class="MCHK進度"><span style="width:${Math.round(((idx+1)/ins.項目.length)*100)}%"></span></div></div><article class="MCHK項目卡 ${abnormal?'異常':''}"><div class="MCHK題頭"><div class="MCHK序號">${補零(idx+1)}</div><div><div class="MCHK題目">${轉義(d.檢查內容)}</div><div class="MCHK基準">${轉義(d.判定基準)}</div><div class="MCHK標籤列"><span class="MCHK標籤">${轉義(d['5S分類'])}</span><span class="MCHK標籤 代碼">${轉義(d.項目代碼)}</span></div></div></div><div class="MCHK評分">${scores.map(([s,t])=>`<button type="button" class="MCHK分數 ${selected===s?'選中':''}" data-score="${s}"><b>${s}</b><small>${t}</small></button>`).join('')}</div><div id="MCHK異常區" class="MCHK異常區 ${abnormal?'':'隱藏'}"><textarea id="MCHK原因" class="MCHK文字" placeholder="請說明不符合位置、現況與需改善內容">${轉義(item.原因)}</textarea><label class="MCHK拍照">📷 拍攝異常現況<input id="MCHK照片檔" type="file" accept="image/*" capture="environment" hidden></label>${item.照片?`<img class="MCHK照片" src="${item.照片}" alt="異常現況">`:''}<small style="color:#7a6666">低於滿分必須填原因並拍照，才能進下一項。</small></div></article><div class="MCHK操作"><button id="MCHK上一步" class="MCHK返回" ${idx===0?'disabled':''}>← 上一項</button><button id="MCHK下一步" class="MCHK下一步">${idx===ins.項目.length-1?'完成並送出':'下一項 →'}</button></div><button id="MCHK取消" class="MCHK取消">取消本次巡檢</button></section>`;
    root.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>{item.分數=Number(b.dataset.score); 顯示單項();});
    const reason=document.getElementById('MCHK原因'); if(reason) reason.oninput=e=>{item.原因=e.target.value;};
    const file=document.getElementById('MCHK照片檔'); if(file) file.onchange=async e=>{try{item.照片=await 壓縮照片(e.target.files[0]);顯示單項();發Roar('成功','照片已完成','異常現況已壓縮暫存');}catch(err){發Roar('錯誤','照片處理失敗',err.message||String(err));}};
    document.getElementById('MCHK上一步').onclick=()=>{if(idx>0){ins.索引--;顯示單項();}};
    document.getElementById('MCHK下一步').onclick=()=>下一步();
    document.getElementById('MCHK取消').onclick=()=>{if(confirm('確定放棄本次尚未送出的20項巡檢？')){狀態.巡檢=null;顯示機台清單();}};
  }

  function 下一步() {
    const ins=狀態.巡檢,item=ins.項目[ins.索引],max=數值(item.資料.最高分,4);
    if(item.分數===null){發Roar('警告','尚未評分',`第 ${ins.索引+1} 項請先選擇分數`);return;}
    if(item.分數<max&&!文字(item.原因)){發Roar('警告','請填異常原因',`第 ${ins.索引+1} 項低於滿分`);return;}
    if(item.分數<max&&!item.照片){發Roar('警告','請拍異常照片',`第 ${ins.索引+1} 項低於滿分`);return;}
    if(ins.索引<ins.項目.length-1){ins.索引++;顯示單項();return;}
    送出巡檢();
  }

  async function 壓縮照片(file) {
    if(!file) throw new Error('沒有選擇照片');
    const img=await new Promise((ok,fail)=>{const r=new FileReader();r.onerror=()=>fail(new Error('無法讀取照片'));r.onload=()=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>fail(new Error('照片格式無法處理'));im.src=r.result;};r.readAsDataURL(file);});
    let edge=900, quality=.68, result='';
    for(let i=0;i<12;i++){
      const ratio=Math.min(1,edge/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*ratio));c.height=Math.max(1,Math.round(img.height*ratio));const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);result=c.toDataURL('image/jpeg',quality);if(result.length<=Number(設定.照片最大字元||42000))return result;if(quality>.38)quality-=.07;else edge=Math.round(edge*.78);
    }
    throw new Error('照片仍過大，請靠近拍攝');
  }

  function 巡檢單號(machine) { const d=現在(); return `5S-CHK-${文字(machine['5S子區域代碼']||`${machine.主區域}-${machine.機台編號}`)}-${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}-${補零(d.getHours())}${補零(d.getMinutes())}${補零(d.getSeconds())}`; }
  function 值列(fields,obj){return fields.map(k=>obj[k]==null?'':obj[k]);}
  async function 新增(sheet,fields,obj){return 資料庫.送出或排隊({工作類型:'新增',分頁名稱:sheet,欄位:fields,值:值列(fields,obj)});}

  async function 送出巡檢() {
    const ins=狀態.巡檢; if(!ins)return;
    for(let i=0;i<ins.項目.length;i++){const it=ins.項目[i],max=數值(it.資料.最高分,4);if(it.分數===null||it.分數<max&&(!文字(it.原因)||!it.照片)){ins.索引=i;顯示單項();發Roar('警告','巡檢尚未完整',`第 ${i+1} 項資料未完成`);return;}}
    const root=主內容(),user=使用者(),machine=ins.機台,areaCode=文字(machine['5S子區域代碼']||`${machine.主區域}-${machine.機台編號}`),area=狀態.區域主檔.find(r=>文字(r.區域代碼)===areaCode)||{},number=巡檢單號(machine),time=完整時間(現在());
    root.innerHTML='<div class="空狀態"><div class="空狀態圖示">⏳</div><b>正在建立巡檢主單與20筆明細</b><span>異常項目會同步建立改善單與照片證據</span></div>';
    let total=0,maxTotal=0,abnormal=0,synced=0,queued=0;
    ins.項目.forEach(it=>{const w=數值(it.資料.權重,1),max=數值(it.資料.最高分,4);total+=it.分數*w;maxTotal+=max*w;if(it.分數<max)abnormal++;});
    const rate=maxTotal?Math.round(total/maxTotal*1000)/10:0;
    const main={巡檢單號:number,區域代碼:areaCode,區域名稱:文字(area.區域名稱)||`${machine.主區域}｜機台 ${machine.機台編號}｜${machine.機台名稱}`,檢查清單代碼:文字(machine.檢查清單代碼)||'清單-可視化0-4',巡檢人工號:文字(user.工號),巡檢人姓名:文字(user.姓名),巡檢日期:日期字串(現在()),開始時間:ins.開始時間,送出時間:time,總得分:total,最高總分:maxTotal,得分率:rate,異常項數:abnormal,狀態:'已送出',裝置識別碼:裝置碼(),備註:`${machine.機台巡檢檔號}｜${machine.清單版本||'V1.0'}`,建立時間:time};
    try{
      let r=await 新增(設定.分頁.巡檢主檔,巡檢主檔欄位,main); if(r&&r.已排隊)queued++;else synced++;
      for(let i=0;i<ins.項目.length;i++){
        const it=ins.項目[i],d=it.資料,max=數值(d.最高分,4),isBad=it.分數<max,detailNo=`${number}-${補零(i+1)}`,improveNo=isBad?隨機碼('5S-KZN'):'';
        r=await 新增(設定.分頁.巡檢明細,巡檢明細欄位,{明細編號:detailNo,巡檢單號:number,項目代碼:d.項目代碼,'5S分類':d['5S分類'],檢查內容:d.檢查內容,得分:it.分數,最高分:max,權重:數值(d.權重,1),是否異常:isBad?'是':'否',異常原因:it.原因,照片資料:it.照片,改善單號:improveNo,建立時間:time});if(r&&r.已排隊)queued++;else synced++;
        if(it.照片){r=await 新增(設定.分頁.照片,照片欄位,{照片編號:隨機碼('5S-PIC'),參照類型:'巡檢異常',參照單號:detailNo,區域代碼:areaCode,上傳人工號:user.工號,拍攝時間:time,資料摘要:d.檢查內容,儲存方式:'試算表壓縮資料',照片資料:it.照片});if(r&&r.已排隊)queued++;else synced++;}
        if(isBad){
          const severity=it.分數<=1?'高':(it.分數===2?'中':'低'),ownerId=文字(area.區域負責人工號),owner=狀態.人員.find(p=>文字(p.工號)===ownerId)||{};
          const improve={改善單號:improveNo,來源類型:'巡檢異常',來源單號:detailNo,區域代碼:areaCode,區域名稱:main.區域名稱,'5S分類':d['5S分類'],問題標題:d.檢查內容,問題說明:it.原因,嚴重度:severity,負責人工號:ownerId,負責人姓名:文字(owner.姓名),期限:日期加天(現在(),設定.改善期限天數||7),狀態:'待改善',改善前照片:it.照片,改善後照片:'',驗證人工號:'',驗證時間:'',驗證結果:'',結案時間:'',逾期天數:0,建立時間:time,更新時間:time};
          r=await 新增(設定.分頁.改善單,改善單欄位,improve);if(r&&r.已排隊)queued++;else synced++;
          r=await 新增(設定.分頁.改善歷程,改善歷程欄位,{歷程編號:隨機碼('5S-HIS'),改善單號:improveNo,動作:'建立改善單',原狀態:'',新狀態:'待改善',執行人工號:user.工號,執行人姓名:user.姓名,執行時間:time,說明:it.原因});if(r&&r.已排隊)queued++;else synced++;
          if(severity==='高'){r=await 新增(設定.分頁.通知紀錄,通知欄位,{通知編號:隨機碼('5S-MSG'),通知場景:'重大巡檢異常',對象類型:'LINE群組',對象識別碼:文字(area.LINE群組識別碼),訊息類型:'待推播',內容摘要:`【5S重大異常】${main.區域名稱}｜${d.檢查內容}`,狀態:'待發送',送出時間:'',錯誤訊息:'',去重鍵:`${number}-${d.項目代碼}`});if(r&&r.已排隊)queued++;else synced++;}
        }
      }
      狀態.巡檢=null;
      root.innerHTML=`<div class="MCHK結果"><div style="font-size:58px">${rate>=Number(設定.及格分數||85)?'✅':'⚠️'}</div><div class="MCHK結果大字">${Math.round(rate)}%</div><b>${轉義(number)}</b><small>異常 ${abnormal} 項｜同步 ${synced} 筆｜離線排隊 ${queued} 筆</small><small>${轉義(machine.機台巡檢檔號)}｜20項明細已固定編號01～20</small><button id="MCHK回清單" class="MCHK結果按鈕">巡檢下一台</button></div>`;
      document.getElementById('MCHK回清單').onclick=顯示機台清單;
      發Roar('成功','機台巡檢已完成',`${machine.主區域}-${machine.機台編號}｜${Math.round(rate)}%｜異常${abnormal}項`);
    }catch(err){root.innerHTML=`<div class="卡片"><div class="空狀態"><div class="空狀態圖示">⚠️</div><b>巡檢送出中斷</b><span>${轉義(err.message||err)}</span><button id="MCHK回巡檢" class="主要按鈕" style="margin-top:14px">回到巡檢</button></div></div>`;document.getElementById('MCHK回巡檢').onclick=顯示單項;發Roar('錯誤','巡檢送出失敗',err.message||String(err));}
  }

  function 攔截入口(e) {
    const target=e.target.closest&&e.target.closest('.導航按鈕,[data-快速動作],[data-動作]'); if(!target)return;
    const page=target.dataset.page||target.dataset.頁面||target.dataset.快速動作||target.dataset.動作;
    if(page!=='巡檢'&&page!=='前往巡檢')return;
    e.preventDefault();e.stopImmediatePropagation();開啟();
  }

  function 啟動() {
    注入樣式();
    document.addEventListener('click',攔截入口,true);
    const title=document.getElementById('頁面標題');
    if(title){new MutationObserver(()=>{if(title.textContent==='5S 行動巡檢'&&!document.querySelector('.MCHK頁'))setTimeout(開啟,0);}).observe(title,{childList:true,subtree:true,characterData:true});}
    const q=new URLSearchParams(location.search); if(q.get('頁面')==='巡檢')setTimeout(開啟,350);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',啟動,{once:true});else 啟動();
  全域.智慧5S機台巡檢=Object.freeze({版本,開啟,重新載入:async()=>{狀態.已載入=false;await 開啟();}});
})(window);
