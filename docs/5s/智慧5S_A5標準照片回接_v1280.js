(function(全域){
  'use strict';
  const 版本='1.2.8-A5照片回接';
  const 目標機台=['1044','1046','1045'];
  function 文字(v){return String(v==null?'':v).trim();}
  function 轉義(v){return 文字(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function db(){return 全域.智慧5S資料庫||null;}
  function 設頁首(){
    const t=document.getElementById('頁面標題');
    const s=document.getElementById('頁面副標');
    if(t)t.textContent='5S 可視化標準管理';
    if(s)s.textContent='A5｜1044 → 1046 → 1045｜標準照片與候選版本';
  }
  function 注入樣式(){
    if(document.getElementById('A5標準照片回接樣式'))return;
    const st=document.createElement('style');st.id='A5標準照片回接樣式';st.textContent=`
      .A5照頁{display:grid;gap:14px;padding-bottom:18px}.A5照英雄{background:linear-gradient(135deg,#123f2e,#1f825b 65%,#7a244a);color:#fff;border-radius:24px;padding:18px}.A5照英雄 h2{margin:0 0 6px}.A5照英雄 p{margin:0;line-height:1.6;color:rgba(255,255,255,.86)}
      .A5照篩選{display:flex;gap:7px;overflow-x:auto;padding:2px 0}.A5照篩選 button{flex:0 0 auto;border:1px solid #dce7e1;background:#fff;color:#345344;border-radius:999px;padding:9px 13px;font-weight:900}.A5照篩選 button.作用中{background:#176b47;color:#fff;border-color:#176b47}
      .A5照統計{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.A5照統計 article{background:#fff;border:1px solid #e0e9e4;border-radius:18px;padding:12px}.A5照統計 small{display:block;color:#75827b;font-weight:800}.A5照統計 b{display:block;margin-top:3px;font-size:1.45rem;color:#173f2f}
      .A5照網格{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.A5照片卡{background:#fff;border:1px solid #e0e9e4;border-radius:18px;overflow:hidden;box-shadow:0 7px 18px rgba(24,65,47,.05)}.A5照片卡 img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#eef2ef}.A5照片內容{padding:11px}.A5照片內容 h4{margin:0 0 4px;color:#173f2f;font-size:.93rem}.A5照片內容 p{margin:3px 0;color:#75827b;font-size:.72rem;line-height:1.45}.A5照片標籤{display:inline-block;border-radius:999px;padding:4px 7px;font-size:.65rem;font-weight:900;background:#eef7f2;color:#176b47}.A5照片標籤.待重拍{background:#fff0e3;color:#ad5b18}.A5照片標籤.錯誤{background:#fde9ea;color:#b22a32}.A5照片連結{display:inline-block;margin-top:6px;color:#176b47;font-weight:900;font-size:.72rem;text-decoration:none}.A5照空{background:#fff;border:1px dashed #d7e2dc;border-radius:18px;padding:28px;text-align:center;color:#7b8981}
      @media(max-width:430px){.A5照網格{grid-template-columns:1fr}.A5照統計{grid-template-columns:repeat(3,1fr)}}
    `;document.head.appendChild(st);
  }
  function 狀態標籤(x){
    const 可=文字(x.可作標準候選)==='是';
    const 重=文字(x.需改善後重拍)==='是';
    if(可&&!重)return ['V001候選',''];
    if(可&&重)return ['待改善重拍','待重拍'];
    if(!可&&重)return ['錯誤示例','錯誤'];
    return ['現況基線',''];
  }
  function 機台符合(x,filter){
    const m=文字(x.機台編號);
    if(filter==='全部')return m.includes('1044')||m.includes('1046')||m.includes('1045')||m==='共用';
    if(filter==='共用')return m==='共用'||m.includes('/');
    return m===filter||m.split('/').includes(filter);
  }
  async function 讀取(name){
    const d=db(); if(!d||typeof d.讀取分頁!=='function')throw new Error('中央資料庫尚未就緒');
    const r=await d.讀取分頁(name,5000); return Array.isArray(r&&r.資料)?r.資料:[];
  }
  async function 開啟(filter){
    filter=filter||'全部';設頁首();注入樣式();
    const 容器=document.getElementById('頁面內容');if(!容器)return;
    容器.innerHTML='<div class="A5照頁"><div class="A5照英雄"><h2>A5 標準照片載入中</h2><p>正在回接 2026-08-22 的 1044／1046／1045 現場照片基線…</p></div></div>';
    try{
      const [現場,主檔]=await Promise.all([讀取('5S_現場照片清冊'),讀取('5S_標準照片主檔')]);
      const a5=現場.filter(x=>文字(x.主區域)==='A5'&&機台符合(x,filter));
      const 候選=a5.filter(x=>文字(x.可作標準候選)==='是'&&文字(x.需改善後重拍)!=='是');
      const 待重拍=a5.filter(x=>文字(x.需改善後重拍)==='是');
      const 已建主檔=主檔.filter(x=>文字(x.區域代碼)==='A5'&&(文字(x.子區域代碼).includes('1044')||文字(x.子區域代碼).includes('1046')||文字(x.子區域代碼).includes('1045')||文字(x.子區域代碼)==='A5-共用'));
      const cards=a5.map(x=>{
        const [標,cls]=狀態標籤(x);const thumb=文字(x.縮圖網址);const link=文字(x.Drive網址);
        return `<article class="A5照片卡">${thumb?`<img src="${轉義(thumb)}" alt="${轉義(x.機台編號)} ${轉義(x.子類型)}" loading="lazy">`:''}<div class="A5照片內容"><span class="A5照片標籤 ${cls}">${標}</span><h4>${轉義(x.機台編號||'A5共用')}｜${轉義(x.子類型||x.圖片類型||'現場照片')}</h4><p>${轉義(x.照片編號)}${x.工序?'｜'+轉義(x.工序):''}</p><p>${轉義(x.觀察重點||'')}</p>${link?`<a class="A5照片連結" href="${轉義(link)}" target="_blank" rel="noopener">查看 Drive 原圖 →</a>`:''}</div></article>`;
      }).join('');
      容器.innerHTML=`<div class="A5照頁"><section class="A5照英雄"><h2>A5｜1044 → 1046 → 1045</h2><p>保留原始現場照片基線，並區分「V001候選／待改善重拍／錯誤示例」。尚未核准的候選照片不會被誤標為正式生效標準。</p></section><div class="A5照篩選">${['全部','1044','1046','1045','共用'].map(v=>`<button type="button" data-A5機台="${v}" class="${filter===v?'作用中':''}">${v}</button>`).join('')}</div><section class="A5照統計"><article><small>現場照片</small><b>${a5.length}</b></article><article><small>V001候選</small><b>${候選.length}</b></article><article><small>待改善重拍</small><b>${待重拍.length}</b></article></section><section><div style="font-weight:900;color:#173f2f;margin:2px 0 9px">已建標準主檔候選：${已建主檔.length} 筆</div><div class="A5照網格">${cards||'<div class="A5照空">目前沒有符合條件的照片</div>'}</div></section></div>`;
      容器.querySelectorAll('[data-A5機台]').forEach(b=>b.onclick=()=>開啟(b.getAttribute('data-A5機台')));
    }catch(e){
      容器.innerHTML=`<div class="A5照頁"><section class="A5照英雄"><h2>A5 標準照片暫時無法讀取</h2><p>${轉義(e&&e.message?e.message:e)}</p></section><button class="主要按鈕" type="button" id="A5照片重試">重新載入</button></div>`;
      document.getElementById('A5照片重試').onclick=()=>開啟(filter);
    }
  }
  function 攔截(e){
    const b=e.target&&e.target.closest?e.target.closest('[data-視覺頁="標準"]'):null;if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();開啟('全部');
  }
  document.addEventListener('click',攔截,true);
  全域.智慧5SA5標準照片回接=Object.freeze({版本,開啟});
})(window);
