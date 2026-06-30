/* 生產計劃表清洗器｜GAS 資料庫橋接 v2 相容版
 * 修正：初始化失敗訊息不明、舊 API success:true 被誤判、GET/JSONP/CORS 相容。
 */
(function(){
  'use strict';
  const 設定鍵='智慧製造_GAS資料庫_API_URL';
  const d=id=>document.getElementById(id);
  const 文=v=>String(v==null?'':v).trim();
  function ok(obj){return !!(obj && (obj.ok===true || obj.success===true || obj.成功===true || obj.status==='ok' || obj.狀態==='OK'));}
  function msg(obj){return 文(obj && (obj.錯誤 || obj.error || obj.message || obj.訊息 || obj.raw)) || '未知錯誤';}
  function 狀態(t,type){
    const box=d('訊息區'); if(box){box.className='訊息 '+(type===false?'錯':type===true?'好':'');box.textContent=t;}
    const top=d('狀態文字'); if(top) top.textContent=String(t).split('\n')[0];
    const bottom=d('底部狀態'); if(bottom) bottom.textContent=String(t).split('\n')[0];
  }
  function 取URL(){return localStorage.getItem(設定鍵)||''}
  function 存URL(u){localStorage.setItem(設定鍵,u)}
  function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function 工具列(){
    if(d('GAS資料庫工具列'))return;
    const css=document.createElement('style');css.textContent='.gasbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}.gasbar input{min-width:min(100%,460px);flex:1;border:1px solid #dbeafe;border-radius:12px;padding:10px;font-weight:800}.gasbar .gasnote{font-size:12px;color:#64748b;width:100%;line-height:1.55}.gasbar code{background:#eef5ff;border-radius:8px;padding:2px 5px;color:#0b3a75}';document.head.appendChild(css);
    const target=d('結果區')||document.querySelector('main')||document.body;
    const card=document.createElement('section');card.className='卡';card.id='GAS資料庫工具列';
    card.innerHTML='<h2>Google Sheets 中央資料庫</h2><div class="gasbar"><input id="GAS_URL_輸入" placeholder="貼上 GAS Web App /exec URL" value="'+esc(取URL())+'"><button class="鈕" id="GAS_儲存URL">儲存URL</button><button class="鈕" id="GAS_GET測試">GET測試</button><button class="鈕" id="GAS_初始化">初始化資料庫</button><button class="主鈕" id="GAS_上傳資料庫">上傳中央資料庫</button><div class="gasnote">若看到「初始化失敗」，通常是 Apps Script 沒有重新部署新版本，或舊 doPost 回傳格式不同。本版會顯示完整回應。</div></div>';
    target.parentNode.insertBefore(card,target.nextSibling);
    d('GAS_儲存URL').onclick=()=>{存URL(文(d('GAS_URL_輸入').value));狀態('✅ 已儲存 GAS Web App URL。',true)};
    d('GAS_GET測試').onclick=GET測試;
    d('GAS_初始化').onclick=初始化;
    d('GAS_上傳資料庫').onclick=上傳;
  }
  function url(){const u=文(d('GAS_URL_輸入')?d('GAS_URL_輸入').value:取URL());if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(u))throw new Error('請貼上 GAS Web App 的 /exec URL，不是 Apps Script 編輯器網址，也不是 /dev。');存URL(u);return u;}
  async function fetchJSON(u,opt){
    const res=await fetch(u,opt||{redirect:'follow'});
    const text=await res.text();
    try{return JSON.parse(text)}catch(e){return {ok:res.ok,success:res.ok,raw:text,statusCode:res.status}}
  }
  function jsonp(action){
    return new Promise((resolve,reject)=>{
      const cb='__GAS_CB_'+Date.now()+'_'+Math.floor(Math.random()*9999);
      const s=document.createElement('script');
      window[cb]=function(data){delete window[cb];s.remove();resolve(data)};
      s.onerror=function(){delete window[cb];s.remove();reject(new Error('JSONP 載入失敗，請確認 Web App 存取權限是「任何人」。'))};
      s.src=url()+'?action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(cb)+'&t='+Date.now();
      document.body.appendChild(s);
      setTimeout(()=>{if(window[cb]){delete window[cb];s.remove();reject(new Error('JSONP逾時，GAS可能尚未重新部署新版本。'))}},20000);
    });
  }
  async function GET測試(){
    try{狀態('📡 GET 測試中...',null);let ans;try{ans=await fetchJSON(url()+'?action=status&t='+Date.now())}catch(e){ans=await jsonp('status')}狀態('✅ GET 測試完成：\n'+JSON.stringify(ans,null,2).slice(0,1200),ok(ans));}
    catch(e){狀態('❌ GET 測試失敗：\n'+(e.message||e),false)}
  }
  async function 初始化(){
    try{
      狀態('📡 正在初始化資料庫...',null);
      let ans;
      try{ans=await fetchJSON(url()+'?action=初始化&t='+Date.now())}catch(e){ans=await jsonp('初始化')}
      if(!ok(ans)) throw new Error(msg(ans)+'\n完整回應：'+JSON.stringify(ans).slice(0,1000));
      狀態('✅ 初始化完成。\n資料庫網址：'+(ans.資料庫網址||'未回傳')+'\n分頁數：'+(ans.分頁數||''),true);
    }catch(e){狀態('❌ 初始化失敗：\n'+(e.message||e)+'\n\n處理：Apps Script 右上角「部署 → 管理部署作業 → 編輯鉛筆 → 版本選新版本 → 部署」。',false)}
  }
  function 快照(){
    if(typeof window.匯出資料庫資料==='function')return window.匯出資料庫資料();
    const local=localStorage.getItem('智慧製造中央作戰資料庫V24');
    if(local){try{const o=JSON.parse(local);if(o&&o.DB){return {BOM明細:o.DB.BOM明細||[],每日明細:o.DB.每日明細||[],本月彙總:o.DB.本月彙總||[],出貨訂單:o.DB.出貨訂單||[],BOM需求展開:o.DB.BOM需求展開||[],CTB齊套檢查:o.DB.CTB齊套檢查||[],排程需求池:o.DB.排程需求池||[],自動排程結果:o.DB.自動排程結果||[],拆工單結果:o.DB.拆工單結果||[]}}}catch(e){}}
    if(window.DB){return {BOM明細:window.DB.BOM明細||[],每日明細:window.DB.每日明細||[],本月彙總:window.DB.本月彙總||[],出貨訂單:window.DB.出貨訂單||[],BOM需求展開:window.DB.BOM需求展開||[],CTB齊套檢查:window.DB.CTB齊套檢查||[],排程需求池:window.DB.排程需求池||[],自動排程結果:window.DB.自動排程結果||[],拆工單結果:window.DB.拆工單結果||[]}}
    return {};
  }
  async function 上傳(){
    try{
      const tables=快照(); const total=Object.values(tables).reduce((a,b)=>a+(Array.isArray(b)?b.length:0),0);
      if(!total)throw new Error('目前沒有可上傳資料，請先上傳生產計劃表與 BOM。');
      狀態('📡 正在上傳中央資料庫，資料列：'+total,null);
      const ans=await fetchJSON(url(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'寫入資料庫快照',source:'PWA_V2.6',batchId:'PWA_'+new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14),mode:'replace',payload:{tables}}),redirect:'follow'});
      if(!ok(ans))throw new Error(msg(ans)+'\n完整回應：'+JSON.stringify(ans).slice(0,1000));
      const lines=(ans.寫入結果||[]).map(x=>x.工作表+'：'+x.寫入筆數+'筆').join('\n');
      狀態('✅ 上傳完成。\n批次：'+(ans.批次ID||'')+'\n'+lines+'\n資料庫：'+(ans.資料庫網址||''),true);
    }catch(e){狀態('❌ 上傳失敗：\n'+(e.message||e),false)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',工具列);else工具列();window.addEventListener('load',工具列);
})();
