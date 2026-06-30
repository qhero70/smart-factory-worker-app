/* 生產計劃表清洗器 V3.2｜固定控制列 + 自動派班
 * 固定顯示：GAS URL、GET測試、初始化、上傳、APS、自動派班。
 */
(function(){
  'use strict';
  const KEY='智慧製造_GAS資料庫_API_URL';
  const d=id=>document.getElementById(id);
  const t=v=>String(v==null?'':v).trim();
  function 狀態(msg, ok){
    const box=d('訊息區');
    if(box){ box.className='訊息 '+(ok===false?'錯':ok===true?'好':''); box.textContent=msg; }
    const top=d('狀態文字'); if(top) top.textContent=String(msg).split('\n')[0];
    const bottom=d('底部狀態'); if(bottom) bottom.textContent=String(msg).split('\n')[0];
  }
  function 正URL(u){
    u=t(u).replace(/\s+/g,'');
    if(!u) throw new Error('請貼上 GAS Web App /exec URL。');
    if(!u.startsWith('https://script.google.com/macros/s/')) throw new Error('URL 開頭不對，必須是 https://script.google.com/macros/s/');
    if(u.includes('/dev')) throw new Error('這是 /dev 測試網址，請改用正式 /exec。');
    if(!u.endsWith('/exec')) u=u.replace(/\/+$/,'')+'/exec';
    return u;
  }
  function url(){
    const input=d('V32_GAS_URL');
    const u=正URL((input&&input.value)||localStorage.getItem(KEY));
    localStorage.setItem(KEY,u);
    if(input) input.value=u;
    return u;
  }
  function ok(o){ return !!(o&&(o.ok===true||o.success===true||o.成功===true)); }
  function err(o){ return t(o&&(o.錯誤||o.error||o.message||o.訊息||o.raw))||'未知錯誤'; }
  async function getJSON(action){
    const r=await fetch(url()+'?action='+encodeURIComponent(action)+'&t='+Date.now(),{redirect:'follow'});
    const raw=await r.text();
    try{return JSON.parse(raw)}catch(e){return {ok:false,success:false,error:'回傳不是 JSON，可能 URL 錯或尚未重新部署。',raw:raw.slice(0,1000)}}
  }
  async function postJSON(payload){
    const r=await fetch(url(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});
    const raw=await r.text();
    try{return JSON.parse(raw)}catch(e){return {ok:false,success:false,error:'回傳不是 JSON，可能 URL 錯或尚未重新部署。',raw:raw.slice(0,1000)}}
  }
  function 快照(){
    const local=localStorage.getItem('智慧製造中央作戰資料庫V24');
    if(local){
      try{
        const o=JSON.parse(local);
        if(o&&o.DB){
          return {
            BOM明細:o.DB.BOM明細||[], 每日明細:o.DB.每日明細||[], 本月彙總:o.DB.本月彙總||[], 出貨訂單:o.DB.出貨訂單||[],
            BOM需求展開:o.DB.BOM需求展開||[], CTB齊套檢查:o.DB.CTB齊套檢查||[], 排程需求池:o.DB.排程需求池||[],
            自動排程結果:o.DB.自動排程結果||[], 拆工單結果:o.DB.拆工單結果||[]
          };
        }
      }catch(e){}
    }
    return {};
  }
  function 建立(){
    if(d('V32_CONTROL')) return;
    const css=document.createElement('style');
    css.textContent='.v32{background:#fff;border:1px solid #dbeafe;border-radius:22px;padding:16px;margin:12px auto;max-width:1280px;box-shadow:0 10px 28px rgba(15,23,42,.08)}.v32 h2{font-size:19px;margin:0 0 10px;font-weight:1000}.v32grid{display:grid;grid-template-columns:1fr;gap:10px}.v32 input{width:100%;border:1px solid #dbeafe;border-radius:14px;padding:12px;font-size:14px;font-weight:800}.v32buttons{display:flex;gap:8px;flex-wrap:wrap}.v32 .note{font-size:12px;color:#64748b;line-height:1.55}.v32 button{border:none;border-radius:14px;padding:11px 13px;font-weight:1000}.v32 .pri{background:linear-gradient(135deg,#0b74ff,#06b6d4);color:#fff}.v32 .dark{background:linear-gradient(135deg,#0f172a,#334155);color:#fff}.v32 .sec{background:#e8f0ff;color:#0b3a75}@media(max-width:700px){.v32{margin:10px 14px}.v32buttons button{flex:1 1 45%;font-size:13px}}';
    document.head.appendChild(css);
    const panel=document.createElement('section');
    panel.id='V32_CONTROL';
    panel.className='v32';
    panel.innerHTML='<h2>Google Sheets / APS / 派班控制列 V3.2</h2><div class="v32grid"><input id="V32_GAS_URL" placeholder="貼上 GAS Web App /exec URL" value="'+(localStorage.getItem(KEY)||'')+'"><div class="v32buttons"><button class="sec" id="V32_SAVE">儲存URL</button><button class="sec" id="V32_GET">GET測試</button><button class="sec" id="V32_INIT">初始化資料庫</button><button class="pri" id="V32_UPLOAD">上傳中央資料庫</button><button class="pri" id="V32_APS">執行 APS 自動排程 V1</button><button class="dark" id="V32_DISPATCH">執行自動派班 V1</button></div><div class="note">順序：GET測試 → 上傳中央資料庫 → APS自動排程 → 自動派班。派班會寫入 16_自動派班結果、17_人員負荷表、18_派班警示。</div></div>';
    const main=document.querySelector('main')||document.body;
    main.insertBefore(panel, main.firstChild);
    d('V32_SAVE').onclick=()=>{try{const u=url();狀態('✅ 已儲存URL：\n'+u,true)}catch(e){狀態('❌ URL錯誤：\n'+(e.message||e),false)}};
    d('V32_GET').onclick=async()=>{try{狀態('📡 GET測試中...',null);const ans=await getJSON('status');if(!ok(ans))throw new Error(err(ans)+'\n完整回應：'+JSON.stringify(ans).slice(0,1200));狀態('✅ GET測試成功：\n'+JSON.stringify(ans,null,2).slice(0,1200),true)}catch(e){狀態('❌ GET測試失敗：\n'+(e.message||e),false)}};
    d('V32_INIT').onclick=async()=>{try{狀態('📡 初始化資料庫中...',null);const ans=await getJSON('初始化');if(!ok(ans))throw new Error(err(ans));狀態('✅ 初始化完成。\n資料庫：'+(ans.資料庫網址||'')+'\n分頁數：'+(ans.分頁數||''),true)}catch(e){狀態('❌ 初始化失敗：\n'+(e.message||e),false)}};
    d('V32_UPLOAD').onclick=async()=>{try{const tables=快照();const total=Object.values(tables).reduce((a,b)=>a+(Array.isArray(b)?b.length:0),0);if(!total)throw new Error('目前沒有本機快照資料，請先上傳生產計劃表與 BOM，或先按「儲存本機資料庫快照」。');狀態('📡 上傳中央資料庫中，資料列：'+total,null);const ans=await postJSON({action:'寫入資料庫快照',source:'PWA_V3.2',batchId:'PWA_'+new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14),mode:'replace',payload:{tables}});if(!ok(ans))throw new Error(err(ans));const lines=(ans.寫入結果||[]).map(x=>x.工作表+'：'+x.寫入筆數+'筆').join('\n');狀態('✅ 上傳完成。\n批次：'+(ans.批次ID||'')+'\n'+lines,true)}catch(e){狀態('❌ 上傳失敗：\n'+(e.message||e),false)}};
    d('V32_APS').onclick=async()=>{try{const daily=Number((d('每日班數')&&d('每日班數').value)||2);const oee=Number((d('OEE')&&d('OEE').value)||0.75);const weekend=!!(d('週末可生產')&&d('週末可生產').checked);狀態('🧠 APS 自動排程 V1 執行中...',null);const ans=await postJSON({action:'執行自動排程V1',source:'PWA_V3.2',每日班數:daily,OEE:oee,週末可生產:weekend});if(!ok(ans))throw new Error(err(ans));狀態('✅ APS 自動排程 V1 完成。\n排程筆數：'+(ans.排程筆數||0)+'\n工單筆數：'+(ans.工單筆數||0)+'\n甘特筆數：'+(ans.甘特筆數||0)+'\n警示筆數：'+(ans.警示筆數||0)+'\n資料庫：'+(ans.資料庫網址||''),true)}catch(e){狀態('❌ APS失敗：\n'+(e.message||e),false)}};
    d('V32_DISPATCH').onclick=async()=>{try{狀態('👥 自動派班 V1 執行中...\n讀取 11_自動排程結果 與 A3_人員技能矩陣。',null);const ans=await postJSON({action:'執行自動派班V1',source:'PWA_V3.2'});if(!ok(ans))throw new Error(err(ans));狀態('✅ 自動派班 V1 完成。\n派班筆數：'+(ans.派班筆數||0)+'\n人員負荷筆數：'+(ans.人員負荷筆數||0)+'\n警示筆數：'+(ans.警示筆數||0)+'\n資料庫：'+(ans.資料庫網址||''),true)}catch(e){狀態('❌ 自動派班 V1 失敗：\n'+(e.message||e)+'\n\n確認：GAS 已加入「中央資料庫API_v4_派班附加模組.gs」，且 doPost 已支援 action=執行自動派班V1，並重新部署新版本。',false)}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',建立);else建立();
  window.addEventListener('load',()=>setTimeout(建立,500));
})();
