(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S 紅牌列印退出修復 v1.2.6
   * 1. 攔截既有 A5 含QR列印，補上「返回智慧5S／列印／關閉」。
   * 2. iPhone Safari 取消列印後不再停在無法退出的空白列印頁。
   * 3. QR 與返回網址一律使用目前 PWA 入口版本碼。
   * 4. 中央紅牌主檔暫時查不到時，允許以目前畫面資料產生識別卡；處置/結案仍由原閉環模組控管。
   */
  const 版本 = '1.2.6';
  const 設定 = 全域.智慧5S設定 || {};
  const 資料庫 = 全域.智慧5S資料庫;
  if (!資料庫) return;

  const 入口版本 = String(設定.入口版本碼 || '1260').trim() || '1260';
  const 分頁 = 設定.分頁 || {};
  const 紅牌分頁 = 分頁.紅牌追蹤 || '5S_紅牌追蹤';
  const 列印分頁 = 分頁.紅牌列印紀錄 || '5S_紅牌列印紀錄';
  const 列印欄位 = ['列印紀錄編號','紅牌編號','掛牌序號','掛牌日','列印時間','列印人工號','列印人姓名','列印版型','列印用途','備註'];

  function 文字(v){ return String(v == null ? '' : v).trim(); }
  function 轉義(v){ return String(v == null ? '' : v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function 補零(n,w){ return String(n).padStart(w || 2,'0'); }
  function 現在(){ return new Date(); }
  function 日期字串(d){ const x=d||現在(); return `${x.getFullYear()}-${補零(x.getMonth()+1)}-${補零(x.getDate())}`; }
  function 完整時間(){ const x=現在(); return `${日期字串(x)} ${補零(x.getHours())}:${補零(x.getMinutes())}:${補零(x.getSeconds())}`; }
  function 日期緊縮(v){ const s=文字(v).replace(/\D/g,'').slice(0,8); if(s.length===8)return s; const d=現在(); return `${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}`; }
  function 識別碼(prefix){ const d=現在(); return `${prefix}-${d.getFullYear()}${補零(d.getMonth()+1)}${補零(d.getDate())}${補零(d.getHours())}${補零(d.getMinutes())}${補零(d.getSeconds())}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }
  function 目前使用者(){ try{return JSON.parse(localStorage.getItem('智慧5S_目前使用者')||'{}')||{};}catch(_){return{};} }

  async function 讀分頁(name,limit){
    const r=await 資料庫.讀取分頁(name,limit||5000);
    return {欄位:(r&&r.欄位)||[],資料:r&&Array.isArray(r.資料)?r.資料:[]};
  }

  function 從目前畫面取得紅牌(id){
    const card=document.querySelector('#彈窗內容 .紅牌卡,#紅牌掃碼案件卡,.紅牌卡');
    if(!card) return null;
    const 副標=文字(card.querySelector('.卡片副標')?.textContent || document.getElementById('彈窗副標')?.textContent);
    const desc=Array.from(card.querySelectorAll('.改善描述')).map(x=>文字(x.textContent));
    const tags=Array.from(card.querySelectorAll('.標籤')).map(x=>文字(x.textContent));
    const info=副標.split('｜').map(文字);
    const qty=(info[1]||'').match(/^([^\s]+)\s*(.*)$/)||[];
    const modalSub=文字(document.getElementById('彈窗副標')?.textContent);
    const areaFromModal=modalSub.split('｜').slice(1).join('｜').trim();
    return {
      紅牌編號:id,
      掛牌日:'',
      盤點編號:'',
      部門:'製造部',
      區域: info[0] || areaFromModal || '',
      物品名稱:文字(card.querySelector('h2')?.textContent)||'未填',
      規格型號:'—',
      數量:qty[1]||'',
      單位:qty[2]||'',
      紅牌原因:(desc.find(x=>x.startsWith('紅牌原因：'))||'').replace(/^紅牌原因：/,''),
      暫存位置:(desc.find(x=>x.startsWith('暫存位置：'))||'').replace(/^暫存位置：/,''),
      處置建議:(desc.find(x=>x.startsWith('處置建議：'))||'').replace(/^處置建議：/,''),
      責任部門:'製造部',
      責任人:'待指派',
      預定處置日:(tags.find(x=>x.startsWith('期限：'))||'').replace(/^期限：/,''),
      案件狀態:tags.find(x=>/待處置|處理中|待複查|已結案|已完成/.test(x))||'待處置',
      _畫面備援:true
    };
  }

  async function 取得紅牌(id){
    try{
      const r=await 讀分頁(紅牌分頁,5000);
      const row=r.資料.find(x=>文字(x.紅牌編號)===文字(id));
      if(row) return row;
    }catch(e){ console.warn('紅牌列印修復：中央紅牌讀取失敗',e); }
    const ui=從目前畫面取得紅牌(id);
    if(ui) return ui;
    throw new Error(`中央資料庫找不到紅牌：${id}`);
  }

  async function 取得掛牌序號(red){
    let rows=[];
    try{ rows=(await 讀分頁(列印分頁,5000)).資料; }catch(_){ rows=[]; }
    const same=rows.filter(x=>文字(x.紅牌編號)===文字(red.紅牌編號));
    const old=same.find(x=>文字(x.掛牌序號));
    if(old) return {序號:文字(old.掛牌序號),次數:same.length};
    const prefix=`RP-${日期緊縮(red.掛牌日)}-`;
    let max=0;
    rows.forEach(x=>{const s=文字(x.掛牌序號);if(!s.startsWith(prefix))return;const n=Number(s.slice(prefix.length));if(Number.isFinite(n))max=Math.max(max,n);});
    return {序號:`${prefix}${補零(max+1,3)}`,次數:0};
  }

  async function 記錄列印(red,serial,count){
    const u=目前使用者();
    const data={
      列印紀錄編號:識別碼('5S-PRT'),紅牌編號:文字(red.紅牌編號),掛牌序號:serial,掛牌日:文字(red.掛牌日),
      列印時間:完整時間(),列印人工號:文字(u.工號),列印人姓名:文字(u.姓名),列印版型:'A5直式含QR',列印用途:'現場實體掛牌',
      備註:`第${count}次列印｜智慧5S v${版本}${red._畫面備援?'｜中央主檔查無資料，使用畫面備援':''}`
    };
    return 資料庫.送出或排隊({工作類型:'新增',分頁名稱:列印分頁,欄位:列印欄位,值:列印欄位.map(k=>data[k]??'')});
  }

  function 系統網址(page){
    const u=new URL('./index.html',location.href);u.search='';u.searchParams.set('頁面',page||'紅牌');u.searchParams.set('v',入口版本);return u.href;
  }
  function 掃碼網址(id,serial){
    const u=new URL(系統網址('紅牌'));u.searchParams.set('紅牌編號',id);u.searchParams.set('掛牌序號',serial);u.searchParams.set('來源','紅牌QR');return u.href;
  }

  function 工具列HTML(backUrl){
    return `<div class="列印工具 no-print"><button type="button" onclick="返回智慧5S()">← 返回智慧5S</button><button class="主" type="button" onclick="window.print()">🖨 列印 A5 紅牌</button><button type="button" onclick="關閉列印頁()">✕ 關閉</button></div><script>const 智慧5S返回網址=${JSON.stringify(backUrl)};function 返回智慧5S(){try{if(window.opener&&!window.opener.closed){window.opener.focus();window.close();setTimeout(()=>{if(!window.closed)location.href=智慧5S返回網址},180);return;}}catch(e){}location.href=智慧5S返回網址;}function 關閉列印頁(){try{window.close();}catch(e){}setTimeout(()=>{if(!window.closed)location.href=智慧5S返回網址},180);}<\/script>`;
  }

  function 列印HTML(red,serial,count){
    const back=系統網址('紅牌');
    const qr=`https://quickchart.io/qr?size=220&margin=1&ecLevel=M&text=${encodeURIComponent(掃碼網址(red.紅牌編號,serial))}`;
    const status=文字(red.案件狀態)||'待處置';const closed=/已結案|已完成|作廢/.test(status);
    return `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${轉義(serial)}｜5S紅牌</title><style>
      @page{size:A5 portrait;margin:6mm}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Microsoft JhengHei","PingFang TC",sans-serif}.列印工具{position:sticky;top:0;z-index:9999;display:grid;grid-template-columns:1fr 1.2fr .8fr;gap:7px;padding:calc(8px + env(safe-area-inset-top)) 8px 8px;background:rgba(255,255,255,.96);border-bottom:1px solid #ddd;backdrop-filter:blur(12px)}.列印工具 button{min-height:44px;border:1px solid #c8d1cc;border-radius:12px;background:#f3f6f4;color:#27352e;font-weight:900;font-size:13px}.列印工具 .主{background:#b4121b;color:#fff;border-color:#b4121b}.牌{min-height:196mm;border:4px solid #b4121b;padding:6mm;position:relative}.孔{position:absolute;top:4mm;width:8mm;height:8mm;border:2px solid #b4121b;border-radius:50%;background:#fff}.孔.左{left:6mm}.孔.右{right:6mm}.標題{text-align:center;color:#b4121b;font-size:29px;font-weight:1000;letter-spacing:5px;margin:1mm 0}.警語{text-align:center;font-weight:900;font-size:13px;margin-bottom:3mm}.上區{display:grid;grid-template-columns:1fr 34mm;gap:3mm}.序號框{border:2px solid #b4121b;background:#fff1f1;padding:3mm;text-align:center}.序號框 small{display:block;font-weight:800;color:#7a2d31}.序號框 strong{display:block;font-size:21px;color:#a00912;margin:1mm 0}.QR{border:2px solid #b4121b;padding:1.5mm;display:flex;align-items:center;justify-content:center;flex-direction:column}.QR img{width:29mm;height:29mm}.QR small{font-size:7px;text-align:center}.格{display:grid;grid-template-columns:28mm 1fr;border-top:1.5px solid #333;border-left:1.5px solid #333;margin-top:3mm}.格>div{border-right:1.5px solid #333;border-bottom:1.5px solid #333;padding:2.2mm;min-height:9mm;font-size:12.2px;line-height:1.35}.名{font-weight:900;background:#f3f3f3;display:flex;align-items:center}.大{font-size:16px;font-weight:900}.原因{min-height:17mm}.狀態{display:inline-block;border:2px solid ${closed?'#367a50':'#b4121b'};color:${closed?'#367a50':'#b4121b'};font-weight:1000;padding:1mm 3mm;border-radius:999px}.簽名{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;margin-top:3mm}.簽名 div{height:20mm;border:1.5px solid #333;padding:2mm;font-size:11px}.不可{margin-top:3mm;border:2px dashed #b4121b;padding:2.5mm;text-align:center;color:#b4121b;font-weight:1000;font-size:13px}.底{text-align:center;font-size:8.5px;color:#555;margin-top:2mm}.備援{margin-top:2mm;text-align:center;font-size:8px;color:#9a6b00}.底部工具{margin:10px 8px calc(12px + env(safe-area-inset-bottom))}.底部工具 .列印工具{position:static;padding:0;border:0;background:none}@media(max-width:430px){.列印工具{grid-template-columns:1fr 1fr}.列印工具 button:last-child{grid-column:1/-1}.牌{border-width:3px}}@media print{.no-print,.底部工具{display:none!important}.牌{page-break-inside:avoid;margin:0}}
    </style></head><body>${工具列HTML(back)}<div class="牌"><span class="孔 左"></span><span class="孔 右"></span><div class="標題">5S 紅牌</div><div class="警語">非必要品／待處置物品識別卡</div><div class="上區"><div class="序號框"><small>實體掛牌序號</small><strong>${轉義(serial)}</strong><small>系統紅牌：${轉義(red.紅牌編號)}</small><small>第 ${count} 次列印</small></div><div class="QR"><img src="${qr}" alt="掃碼查看紅牌"><small>iPhone 相機掃碼<br>查看／處置此紅牌</small></div></div><div class="格">
      <div class="名">物品名稱</div><div class="大">${轉義(red.物品名稱||'未填')}</div><div class="名">規格型號</div><div>${轉義(red.規格型號||'—')}</div><div class="名">數量</div><div>${轉義(red.數量||'')} ${轉義(red.單位||'')}</div><div class="名">掛牌日期</div><div>${轉義(red.掛牌日||'未填')}</div><div class="名">部門／區域</div><div>${轉義(red.部門||'')}｜${轉義(red.區域||'')}</div><div class="名">紅牌原因</div><div class="原因">${轉義(red.紅牌原因||'待補')}</div><div class="名">暫存位置</div><div>${轉義(red.暫存位置||'待設定')}</div><div class="名">處置建議</div><div>${轉義(red.處置建議||'待決議')}</div><div class="名">責任部門／人</div><div>${轉義(red.責任部門||'')}｜${轉義(red.責任人||'待指派')}</div><div class="名">預定處置日</div><div>${轉義(red.預定處置日||'未設定')}</div><div class="名">案件狀態</div><div><span class="狀態">${轉義(status)}</span></div><div class="名">盤點編號</div><div>${轉義(red.盤點編號||'—')}</div></div><div class="簽名"><div>掛牌人：<br><br>日期：</div><div>責任人：<br><br>日期：</div><div>複查／結案：<br><br>日期：</div></div><div class="不可">處置完成並經主管複查前，不得移回原工作區</div><div class="底">智慧5S v${版本}｜若 QR 無法使用，可在「紅牌」頁輸入掛牌序號查詢：${轉義(serial)}</div>${red._畫面備援?'<div class="備援">本次列印採目前畫面資料備援；請後續確認中央紅牌主檔同步。</div>':''}</div><div class="底部工具 no-print">${工具列HTML(back)}</div><script>window.addEventListener('load',()=>setTimeout(()=>{try{window.print()}catch(e){}},850));<\/script></body></html>`;
  }

  function 錯誤HTML(message){
    const back=系統網址('紅牌');
    return `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>紅牌列印失敗</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"PingFang TC","Microsoft JhengHei",sans-serif;background:#f7f8f7;color:#222}.列印工具{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:calc(10px + env(safe-area-inset-top)) 10px 10px;background:#fff;border-bottom:1px solid #ddd}.列印工具 button{min-height:46px;border:0;border-radius:12px;font-weight:900}.列印工具 button:first-child{background:#176b47;color:#fff}.錯誤卡{margin:28px 16px;padding:20px;border:1px solid #efcaca;border-radius:16px;background:#fff}.錯誤卡 h2{color:#b4121b}.錯誤卡 p{line-height:1.7;word-break:break-word}</style></head><body><div class="列印工具"><button onclick="location.href=${JSON.stringify(back)}">← 返回智慧5S</button><button onclick="關閉列印頁()">✕ 關閉</button></div><div class="錯誤卡"><h2>紅牌列印失敗</h2><p>${轉義(message)}</p><p>此頁已補上返回功能；可回到智慧5S紅牌頁重新同步後再列印。</p></div><script>const 智慧5S返回網址=${JSON.stringify(back)};function 關閉列印頁(){try{window.close()}catch(e){}setTimeout(()=>{if(!window.closed)location.href=智慧5S返回網址},180)}<\/script></body></html>`;
  }

  async function 執行新版列印(id){
    id=文字(id);if(!id)return;
    const w=window.open('','_blank');
    if(!w){ alert('瀏覽器阻擋列印視窗，請允許彈出式視窗後再試'); return; }
    w.document.write(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;padding:28px">正在建立 A5 紅牌…</body>`);
    try{
      const red=await 取得紅牌(id);const s=await 取得掛牌序號(red);const count=s.次數+1;
      await 記錄列印(red,s.序號,count).catch(e=>console.warn('列印紀錄暫存失敗',e));
      w.document.open();w.document.write(列印HTML(red,s.序號,count));w.document.close();
    }catch(e){w.document.open();w.document.write(錯誤HTML(e&&e.message?e.message:e));w.document.close();}
  }

  function 目前紅牌編號(){
    const sub=文字(document.getElementById('彈窗副標')?.textContent).split('｜')[0].trim();
    if(/^5S-|^RP-/i.test(sub))return sub;
    return 文字(document.querySelector('[data-rp-action="print"]')?.dataset.rpId);
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-rp-action="print"],#列印現場紅牌');
    if(!b)return;
    const id=文字(b.dataset.rpId)||目前紅牌編號();
    if(!id)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    執行新版列印(id);
  },true);

  全域.智慧5S紅牌列印退出修復=Object.freeze({版本,執行新版列印});
})(window);
