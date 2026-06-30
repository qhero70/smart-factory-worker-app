/* 生產計劃表清洗器｜APS 自動排程橋接 v1
 * 新增按鈕：執行 APS 自動排程 V1
 * 後端 action：執行自動排程V1
 */
(function(){
  'use strict';
  const URL_KEY='智慧製造_GAS資料庫_API_URL';
  const d=id=>document.getElementById(id);
  const text=v=>String(v==null?'':v).trim();
  function state(msg, ok){
    const box=d('訊息區'); if(box){box.className='訊息 '+(ok===false?'錯':ok===true?'好':''); box.textContent=msg;}
    const top=d('狀態文字'); if(top) top.textContent=String(msg).split('\n')[0];
    const bottom=d('底部狀態'); if(bottom) bottom.textContent=String(msg).split('\n')[0];
  }
  function apiUrl(){
    let u=text((d('GAS_URL_輸入')&&d('GAS_URL_輸入').value)||localStorage.getItem(URL_KEY));
    if(!u) throw new Error('請先貼上 GAS Web App /exec URL。');
    if(!u.endsWith('/exec')) u=u.replace(/\/+$/,'')+'/exec';
    localStorage.setItem(URL_KEY,u);
    if(d('GAS_URL_輸入')) d('GAS_URL_輸入').value=u;
    return u;
  }
  async function post(payload){
    const res=await fetch(apiUrl(),{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow'});
    const raw=await res.text();
    try{return JSON.parse(raw)}catch(e){return{ok:false,success:false,error:'回傳不是JSON',raw:raw.slice(0,1000)}}
  }
  function ok(o){return !!(o&&(o.ok===true||o.success===true||o.成功===true))}
  function addButton(){
    if(d('APS_執行按鈕')) return;
    const gas=d('GAS資料庫工具列');
    const target=gas?gas.querySelector('.gasbar'):(document.querySelector('.底 .工具')||document.body);
    const btn=document.createElement('button');
    btn.id='APS_執行按鈕';
    btn.className='主鈕';
    btn.type='button';
    btn.textContent='執行 APS 自動排程 V1';
    btn.onclick=runAPS;
    target.appendChild(btn);
    const note=document.createElement('div');
    note.className='gasnote';
    note.textContent='APS V1 會讀取 Google Sheets 的 10_排程需求池，重新寫入 11_自動排程結果、13_拆工單結果、14_資源負荷甘特、15_排程警示。';
    target.appendChild(note);
  }
  async function runAPS(){
    try{
      const daily=Number((d('每日班數')&&d('每日班數').value)||2);
      const oee=Number((d('OEE')&&d('OEE').value)||0.75);
      const weekend=!!(d('週末可生產')&&d('週末可生產').checked);
      state('🧠 APS 自動排程 V1 執行中...\n讀取 10_排程需求池、CTB、BOM，請稍等。', null);
      const ans=await post({action:'執行自動排程V1',source:'PWA_APS_V1',每日班數:daily,OEE:oee,週末可生產:weekend});
      if(!ok(ans)) throw new Error(ans.錯誤||ans.error||ans.raw||'APS 執行失敗');
      state('✅ APS 自動排程 V1 完成。\n排程筆數：'+(ans.排程筆數||0)+'\n工單筆數：'+(ans.工單筆數||0)+'\n甘特筆數：'+(ans.甘特筆數||0)+'\n警示筆數：'+(ans.警示筆數||0)+'\n資料庫：'+(ans.資料庫網址||''), true);
    }catch(err){ state('❌ APS 自動排程 V1 失敗：\n'+(err.message||err)+'\n\n處理：確認 GAS 已換成「中央資料庫API_v3_APS獨立版.gs」，並重新部署新版本。', false); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(addButton,900)); else setTimeout(addButton,900);
  window.addEventListener('load',()=>setTimeout(addButton,1200));
})();
