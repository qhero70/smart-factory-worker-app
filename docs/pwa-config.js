window.PWA_CONFIG={
  GAS_WEB_APP_URL:'https://script.google.com/macros/s/AKfycbweSKwcREbv-5R5E1ZIj_XOZDGQzRPCdoOAy2uTkhMwZTZoIv-GtpQi0PF8ahdb6KEJ/exec',
  APP_NAME:'製造部智慧製造應用總部',
  VERSION:'v2.1.29_報工保護正式版',
  SPREADSHEET_ID:'1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS:8000,
  API_ACTIONS:{健康檢查:'健康檢查',主檔檢查:'主檔檢查',取得報工作業v2初始資料:'取得報工作業v2初始資料',寫入報工作業v2:'寫入報工作業v2',寫入不良紀錄v2:'寫入不良紀錄v2',手動重刷_主檔照片:'手動重刷_主檔照片'}
};

(function(){
  'use strict';

  const 正式版號='235';
  const 班別時間表={
    早班:{開始:'07:50',結束:'16:50',跨日:false},
    大夜班:{開始:'23:00',結束:'07:50',跨日:true}
  };
  const 手動狀態={開始時間:false,結束時間:false};
  let 正在程式更新=false;
  let 已綁定時間控制=false;
  let 已綁定不良保護=false;
  let 已綁定右上更新=false;
  let 已綁定掃碼=false;
  let 上次班別='';
  let 掃碼串流=null;
  let 掃碼計時器=null;
  let 掃碼類型='';

  function $(id){return document.getElementById(id);}
  function $$(selector){return Array.from(document.querySelectorAll(selector));}

  function 補零(n){return String(n).padStart(2,'0');}

  function 日期字串(d){
    return d.getFullYear()+'-'+補零(d.getMonth()+1)+'-'+補零(d.getDate());
  }

  function 日期時間字串(d){
    return 日期字串(d)+'T'+補零(d.getHours())+':'+補零(d.getMinutes());
  }

  function 由日期時間字串建日期(value){
    if(!value)return null;
    const d=new Date(value);
    return Number.isNaN(d.getTime())?null:d;
  }

  function 由作業日與時間建日期(dateText,timeText){
    const m=String(timeText||'00:00').match(/^(\d{1,2}):(\d{2})$/);
    const d=new Date(String(dateText||今天作業日())+'T00:00:00');
    if(Number.isNaN(d.getTime()))return new Date();
    d.setHours(Number(m?m[1]:0),Number(m?m[2]:0),0,0);
    return d;
  }

  function 加天(d,days){
    const x=new Date(d.getTime());
    x.setDate(x.getDate()+days);
    return x;
  }

  function 今天作業日(){
    const d=new Date();
    const hhmm=d.getHours()*100+d.getMinutes();
    if(hhmm<610)d.setDate(d.getDate()-1);
    return 日期字串(d);
  }

  function 取作業日(){
    const raw=String($('作業日')?.value||'').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:今天作業日();
  }

  function 正規化班別(value){
    const text=String(value||'').replace(/\s+/g,'').toUpperCase();
    if(text.includes('大夜')||text.includes('夜')||text.includes('NIGHT')||text.includes('2300')||text.includes('0750'))return '大夜班';
    return '早班';
  }

  function 取班別(){
    const raw=$('班別')?.value || window.智慧製造報工狀態?.選定人員?.班別 || '早班';
    return 正規化班別(raw);
  }

  function 建立班別時間(班別){
    const 規則=班別時間表[正規化班別(班別)]||班別時間表.早班;
    const 作業日=取作業日();
    const 開始=由作業日與時間建日期(作業日,規則.開始);
    let 結束=由作業日與時間建日期(作業日,規則.結束);
    if(規則.跨日||結束<=開始)結束=加天(結束,1);
    return {開始:日期時間字串(開始),結束:日期時間字串(結束),規則};
  }

  function 設值(id,value){
    const el=$(id);
    if(!el || el.value===value)return false;
    el.value=value;
    el.dataset.時間控制自動='1';
    return true;
  }

  function 發送欄位事件(el){
    if(!el)return;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function 發送時間變更事件(){
    正在程式更新=true;
    ['開始時間','結束時間'].forEach(id=>發送欄位事件($(id)));
    正在程式更新=false;
  }

  function 補正手動跨日(){
    const start=$('開始時間');
    const end=$('結束時間');
    if(!start||!end||!start.value||!end.value)return false;
    const s=由日期時間字串建日期(start.value);
    let e=由日期時間字串建日期(end.value);
    if(!s||!e)return false;
    if(e>s)return false;
    while(e<=s)e=加天(e,1);
    正在程式更新=true;
    end.value=日期時間字串(e);
    end.dataset.時間控制跨日='1';
    正在程式更新=false;
    return true;
  }

  function 計算並回寫工時(){
    const out=$('實際工時');
    const start=$('開始時間');
    const end=$('結束時間');
    if(!out||!start||!end)return;
    const s=由日期時間字串建日期(start.value);
    const e=由日期時間字串建日期(end.value);
    if(!s||!e){out.value='';return;}
    const minutes=Math.round((e.getTime()-s.getTime())/60000);
    out.value=minutes>0?String(minutes):'';
  }

  function 套用班別時間(來源){
    const start=$('開始時間');
    const end=$('結束時間');
    if(!start||!end)return;
    const 班別=取班別();
    const 目標=建立班別時間(班別);
    let changed=false;

    正在程式更新=true;
    if(!手動狀態.開始時間)changed=設值('開始時間',目標.開始)||changed;
    if(!手動狀態.結束時間)changed=設值('結束時間',目標.結束)||changed;
    正在程式更新=false;

    const fixed=補正手動跨日();
    計算並回寫工時();
    if(changed||fixed)發送時間變更事件();
    計算並回寫工時();

    const 作業日=$('作業日');
    if(作業日&&!作業日.value)作業日.value=取作業日();

    window.智慧製造報工時間狀態={
      版本:正式版號,
      來源:來源||'自動',
      班別,
      開始時間:start.value,
      結束時間:end.value,
      實際工時_分:$('實際工時')?.value||'',
      手動狀態:{...手動狀態}
    };
  }

  function 標記手動(id){
    if(正在程式更新)return;
    手動狀態[id]=true;
    const el=$(id);
    if(el)el.dataset.時間控制手動='1';
    setTimeout(()=>{
      const fixed=補正手動跨日();
      計算並回寫工時();
      if(fixed)發送時間變更事件();
      計算並回寫工時();
    },0);
  }

  function 檢查班別異動(){
    const 班別=取班別();
    if(班別!==上次班別){
      上次班別=班別;
      套用班別時間('班別異動');
    }else{
      補正手動跨日();
      計算並回寫工時();
    }
  }

  function 綁定時間控制(){
    if(已綁定時間控制)return;
    已綁定時間控制=true;

    ['開始時間','結束時間'].forEach(id=>{
      const el=$(id);
      if(!el)return;
      el.addEventListener('input',()=>標記手動(id),true);
      el.addEventListener('change',()=>標記手動(id),true);
    });

    $('班別')?.addEventListener('change',()=>setTimeout(()=>套用班別時間('手動切換班別'),0),true);

    document.addEventListener('click',e=>{
      if(e.target.closest('.人員卡片,.常用人員,[data-tab="產出"],#下一步,#上一步')){
        setTimeout(()=>套用班別時間('人員或頁面切換'),180);
        setTimeout(()=>套用班別時間('人員或頁面切換二次確認'),520);
      }
    },true);

    document.addEventListener('touchend',e=>{
      if(e.target.closest('.人員卡片,.常用人員,[data-tab="產出"],#下一步,#上一步')){
        setTimeout(()=>套用班別時間('觸控切換'),220);
      }
    },true);

    setTimeout(()=>套用班別時間('初始化'),250);
    setTimeout(()=>套用班別時間('初始化二次確認'),1200);
    setInterval(檢查班別異動,900);
  }

  function 取數字(value){
    const raw=String(value??'').replace(/,/g,'').trim();
    if(raw==='')return 0;
    const n=Number(raw);
    return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
  }

  function 寫數字(input,value){
    if(!input)return false;
    const next=value>0?String(value):'';
    if(input.value===next)return false;
    input.value=next;
    return true;
  }

  function 不良分配行清單(){
    return $$('.不良行').map(row=>({row,input:row.querySelector('.不良數量')})).filter(x=>x.input);
  }

  function 不良分配合計(){
    return 不良分配行清單().reduce((sum,item)=>sum+取數字(item.input.value),0);
  }

  function 顯示不良防呆訊息(text){
    const el=$('系統訊息');
    if(!el||!text)return;
    const old=String(el.textContent||'');
    if(old.includes(text))return;
    el.textContent=text+'\n'+old;
  }

  function 同步不良分配上限(來源){
    const totalInput=$('快速不良數');
    if(!totalInput)return;
    const rows=不良分配行清單();
    if(!rows.length)return;

    let total=取數字(totalInput.value);
    let sum=不良分配合計();
    const totalRaw=String(totalInput.value||'').trim();

    if(totalRaw===''&&sum>0){
      if(寫數字(totalInput,sum))發送欄位事件(totalInput);
      total=sum;
    }

    rows.forEach((item,index)=>{
      const other=rows.reduce((acc,x,i)=>acc+(i===index?0:取數字(x.input.value)),0);
      item.input.max=String(Math.max(0,total-other));
      item.input.min='0';
    });

    if(total>0&&sum>total){
      let overflow=sum-total;
      rows.slice().reverse().forEach(item=>{
        if(overflow<=0)return;
        const current=取數字(item.input.value);
        const reduce=Math.min(current,overflow);
        if(reduce>0){
          const next=current-reduce;
          if(寫數字(item.input,next))發送欄位事件(item.input);
          overflow-=reduce;
        }
      });
      顯示不良防呆訊息('⚠️ 不良原因分配合計不可大於不良數量，系統已自動修正。');
    }

    sum=不良分配合計();
    window.智慧製造不良分配狀態={
      版本:正式版號,
      來源:來源||'自動',
      不良數量:取數字(totalInput.value),
      分配合計:sum,
      合格:sum<=取數字(totalInput.value)
    };
  }

  function 綁定不良分配保護(){
    if(已綁定不良保護)return;
    已綁定不良保護=true;

    document.addEventListener('input',e=>{
      if(e.target?.id==='快速不良數'||e.target?.classList?.contains('不良數量'))setTimeout(()=>同步不良分配上限('輸入'),0);
    },true);

    document.addEventListener('change',e=>{
      if(e.target?.id==='快速不良數'||e.target?.classList?.contains('不良數量')||e.target?.classList?.contains('不良選單'))setTimeout(()=>同步不良分配上限('變更'),0);
    },true);

    document.addEventListener('click',e=>{
      if(e.target?.id==='新增不良'||e.target?.classList?.contains('刪除鈕'))setTimeout(()=>同步不良分配上限('新增或刪除'),120);
      if(e.target?.id==='送出報工'){
        同步不良分配上限('送出前檢查');
        const total=取數字($('快速不良數')?.value);
        const sum=不良分配合計();
        if(sum>total){
          e.preventDefault();
          e.stopPropagation();
          if(e.stopImmediatePropagation)e.stopImmediatePropagation();
          顯示不良防呆訊息('❌ 不良原因分配合計不可大於不良數量，請先修正後再送出。');
        }
      }
    },true);

    setInterval(()=>同步不良分配上限('定時保護'),1200);
    setTimeout(()=>同步不良分配上限('初始化'),800);
  }

  async function 清理快取並重整(){
    const btn=$('重整鈕');
    if(btn){btn.disabled=true;btn.textContent='⟳';}
    const status=$('狀態卡');
    if(status)status.textContent='🟡 更新中｜重新載入最新正式版 '+正式版號;
    try{
      if('serviceWorker'in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg=>reg.update().catch(()=>{})));
      }
      if(window.caches){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>/smart|factory|worker|pwa|報工|製造/i.test(k)).map(k=>caches.delete(k).catch(()=>{})));
      }
    }catch(error){
      console.warn('更新快取略過',error);
    }
    const url=new URL(location.href);
    url.searchParams.set('v',正式版號);
    url.searchParams.set('更新時間',String(Date.now()));
    location.replace(url.toString());
  }

  function 綁定右上更新(){
    if(已綁定右上更新)return;
    const btn=$('重整鈕');
    if(!btn)return;
    已綁定右上更新=true;
    btn.title='更新到最新正式版';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      清理快取並重整();
    },true);
  }

  function 停止掃碼(){
    if(掃碼計時器){clearInterval(掃碼計時器);掃碼計時器=null;}
    if(掃碼串流){掃碼串流.getTracks().forEach(t=>t.stop());掃碼串流=null;}
    const video=$('掃碼預覽');
    if(video){try{video.pause();}catch(_){ } video.srcObject=null;}
  }

  function 關閉掃碼(){
    停止掃碼();
    $('掃碼視窗')?.classList.remove('顯示');
    const input=$('掃碼手動輸入');
    if(input)input.value='';
  }

  function 套用掃碼值(raw){
    const text=String(raw||'').trim();
    if(!text)return;
    if(掃碼類型==='人員'){
      const cards=$$('.人員卡片');
      const hit=cards.find(card=>String(card.dataset.id||'').trim()===text)||cards.find(card=>(card.textContent||'').includes(text));
      if(hit){hit.click();關閉掃碼();return;}
      alert('找不到人員：'+text);
      return;
    }

    const products=$$('.產品卡片');
    let hit=products.find(card=>String(card.dataset.key||'').split('|').some(v=>v.trim()===text));
    if(!hit)hit=products.find(card=>(card.textContent||'').includes(text));
    if(hit){hit.click();關閉掃碼();return;}

    const search=$('搜尋工件');
    if(search){
      search.value=text;
      發送欄位事件(search);
      setTimeout(()=>{
        const again=$$('.產品卡片').find(card=>(card.textContent||'').includes(text)||String(card.dataset.key||'').includes(text));
        if(again){again.click();關閉掃碼();}
        else alert('找不到產品：'+text);
      },300);
    }else alert('找不到產品：'+text);
  }

  async function 啟動掃碼(type){
    掃碼類型=type==='人員'?'人員':'工件';
    停止掃碼();
    const modal=$('掃碼視窗');
    const video=$('掃碼預覽');
    const title=$('掃碼標題');
    const info=$('掃碼說明');
    const input=$('掃碼手動輸入');
    if(title)title.textContent=掃碼類型==='人員'?'人員掃碼':'產品掃碼';
    if(info)info.textContent='正在開啟相機...';
    if(input)input.value='';
    if(modal)modal.classList.add('顯示');

    if(!video||!navigator.mediaDevices?.getUserMedia){
      if(info)info.textContent='此裝置無法開啟相機，請用下方手動輸入。';
      return;
    }

    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      掃碼串流=stream;
      video.srcObject=stream;
      await video.play();

      if('BarcodeDetector'in window){
        const detector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e']});
        if(info)info.textContent='請將條碼 / QR Code 對準框內。';
        掃碼計時器=setInterval(async()=>{
          try{
            const codes=await detector.detect(video);
            const raw=codes?.[0]?.rawValue||'';
            if(raw){if(input)input.value=raw;套用掃碼值(raw);}
          }catch(_){ }
        },650);
      }else{
        if(info)info.textContent='相機已開啟；此手機瀏覽器不支援自動辨識時，請在下方手動輸入後按套用。';
      }
    }catch(error){
      if(info)info.textContent='無法開啟相機：'+(error?.message||error)+'。請檢查相機權限，或用下方手動輸入。';
    }
  }

  function 綁定掃碼保護(){
    if(已綁定掃碼)return;
    const buttons=$$('[data-scan]');
    if(!buttons.length)return;
    已綁定掃碼=true;

    document.addEventListener('click',e=>{
      const btn=e.target.closest('[data-scan]');
      if(!btn)return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      啟動掃碼(btn.dataset.scan);
    },true);

    $('掃碼取消')?.addEventListener('click',e=>{e.preventDefault();關閉掃碼();},true);
    $('掃碼重啟')?.addEventListener('click',e=>{e.preventDefault();啟動掃碼(掃碼類型||'工件');},true);
    $('掃碼送出')?.addEventListener('click',e=>{e.preventDefault();套用掃碼值($('掃碼手動輸入')?.value);},true);
    $('掃碼手動輸入')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();套用掃碼值(e.target.value);}},true);
    window.addEventListener('beforeunload',停止掃碼);
  }

  function 載入正式樣式(){
    if(document.getElementById('報工正式樣式'))return;
    const x=document.createElement('link');
    x.id='報工正式樣式';
    x.rel='stylesheet';
    x.href='./work-report-v2-ui.css?v='+正式版號;
    document.head.appendChild(x);
  }

  function 人員下拉正式化(){
    const list=document.getElementById('人員列表');
    if(!list)return;
    let control=document.getElementById('人員下拉控制');
    if(!control){
      control=document.createElement('div');
      control.id='人員下拉控制';
      control.className='人員下拉正式';
      control.innerHTML='<button id="人員下拉按鈕" type="button"><span class="下拉頭像">👤</span><span><span class="下拉姓名">請選擇人員</span><span class="下拉資料">點擊展開人員圖片卡片清單</span></span><span class="下拉箭頭">⌄</span></button>';
      list.parentNode.insertBefore(control,list);
    }
    const btn=document.getElementById('人員下拉按鈕');
    if(btn&&!btn.dataset.ok){
      btn.dataset.ok='1';
      btn.onclick=function(e){
        if(e)e.preventDefault();
        document.body.classList.add('人員下拉展開');
      };
    }
    const selected=list.querySelector('.人員卡片.選中');
    if(selected){
      const name=control.querySelector('.下拉姓名');
      const data=control.querySelector('.下拉資料');
      const pic=control.querySelector('.下拉頭像');
      const img=selected.querySelector('.頭像圈 img');
      if(name)name.textContent=(selected.querySelector('.人名')||{}).textContent||'已選人員';
      if(data)data.textContent=((selected.querySelector('.人工號')||{}).textContent||'')+'｜'+((selected.querySelector('.班標')||{}).textContent||'');
      if(pic)pic.innerHTML=img?'<img src="'+img.src+'" alt="">':'👤';
    }
    if(!list.dataset.close){
      list.dataset.close='1';
      list.addEventListener('click',function(e){
        if(e.target.closest('.人員卡片'))setTimeout(function(){
          document.body.classList.remove('人員下拉展開');
          人員下拉正式化();
          套用班別時間('選定人員');
        },160);
      },true);
    }
  }

  function 執行正式補強(){
    載入正式樣式();
    人員下拉正式化();
    綁定時間控制();
    綁定不良分配保護();
    綁定右上更新();
    綁定掃碼保護();
  }

  document.addEventListener('DOMContentLoaded',function(){
    setInterval(執行正式補強,1000);
    setTimeout(執行正式補強,250);
    setTimeout(執行正式補強,1200);
  });
})();
