window.PWA_CONFIG={
  GAS_WEB_APP_URL:'https://script.google.com/macros/s/AKfycbweSKwcREbv-5R5E1ZIj_XOZDGQzRPCdoOAy2uTkhMwZTZoIv-GtpQi0PF8ahdb6KEJ/exec',
  APP_NAME:'製造部智慧製造應用總部',
  VERSION:'v2.1.30_化新班別工時正式版',
  SPREADSHEET_ID:'1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS:8000,
  API_ACTIONS:{健康檢查:'健康檢查',主檔檢查:'主檔檢查',取得報工作業v2初始資料:'取得報工作業v2初始資料',寫入報工作業v2:'寫入報工作業v2',寫入不良紀錄v2:'寫入不良紀錄v2',手動重刷_主檔照片:'手動重刷_主檔照片'}
};

(function(){
  'use strict';

  const 正式版號='237';
  const 班別時間表={
    早班:{顯示:'早班',開始:'08:00',結束:'16:50',跨日:false,休息:[['10:00','10:10'],['12:10','12:40'],['14:40','14:50']]},
    中班:{顯示:'中班',開始:'16:50',結束:'01:40',跨日:true,休息:[['18:50','19:00'],['21:00','21:30'],['23:30','23:40']]},
    夜班:{顯示:'夜班',開始:'23:00',結束:'07:50',跨日:true,休息:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']]},
    大夜班:{顯示:'夜班',開始:'23:00',結束:'07:50',跨日:true,休息:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']]}
  };
  const 班別選項=[
    {value:'早班',text:'早班 08:00-16:50'},
    {value:'中班',text:'中班 16:50-01:40'},
    {value:'大夜班',text:'夜班 23:00-07:50'}
  ];
  const 手動狀態={開始時間:false,結束時間:false};
  let 正在程式更新=false;
  let 已綁定時間控制=false;
  let 已綁定不良保護=false;
  let 已綁定右上更新=false;
  let 已綁定掃碼=false;
  let 已修正橋接器=false;
  let 上次班別='';
  let 掃碼串流=null;
  let 掃碼計時器=null;
  let 掃碼類型='';

  function $(id){return document.getElementById(id);}
  function $$(selector){return Array.from(document.querySelectorAll(selector));}
  function 補零(n){return String(n).padStart(2,'0');}
  function 日期字串(d){return d.getFullYear()+'-'+補零(d.getMonth()+1)+'-'+補零(d.getDate());}
  function 日期時間字串(d){return 日期字串(d)+'T'+補零(d.getHours())+':'+補零(d.getMinutes());}
  function 由日期時間字串建日期(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d;}
  function 加天(d,days){const x=new Date(d.getTime());x.setDate(x.getDate()+days);return x;}
  function 分鐘差(a,b){return Math.round((b.getTime()-a.getTime())/60000);}
  function 重疊分鐘(a1,a2,b1,b2){const s=Math.max(a1.getTime(),b1.getTime());const e=Math.min(a2.getTime(),b2.getTime());return e>s?Math.round((e-s)/60000):0;}
  function 時段文字(小時){if(小時>=0&&小時<6)return '凌晨';if(小時>=6&&小時<12)return '早上';if(小時>=12&&小時<18)return '中午';return '晚上';}

  function 正規化班別(value){
    const text=String(value||'').replace(/\s+/g,'').toUpperCase();
    if(text.includes('中班')||text==='MIDDLE'||text==='M'||text.includes('1650')||text.includes('0140'))return '中班';
    if(text.includes('大夜')||text.includes('夜班')||text.includes('夜')||text.includes('NIGHT')||text==='N'||text.includes('2300')||text.includes('0750'))return '大夜班';
    return '早班';
  }

  function 班別顯示名稱(班別){return (班別時間表[正規化班別(班別)]||班別時間表.早班).顯示;}

  function 目前班別原值(){
    const select=$('班別');
    if(select&&select.value)return select.value;
    const p=window.智慧製造報工狀態&&window.智慧製造報工狀態.選定人員;
    if(p&&(p.班別||p.班次||p.原始班別))return p.班別||p.班次||p.原始班別;
    const card=document.querySelector('.人員卡片.選中 .班標');
    if(card&&card.textContent)return card.textContent;
    return '早班';
  }

  function 取班別(){return 正規化班別(目前班別原值());}

  function 確保班別選項(){
    const select=$('班別');
    if(!select)return;
    const current=select.value||取班別();
    const currentText=String(current||'');
    const normalized=正規化班別(currentText);
    const html=班別選項.map(o=>'<option value="'+o.value+'">'+o.text+'</option>').join('');
    if(select.dataset.化新班別選項!==正式版號||select.options.length<3){
      select.innerHTML=html;
      select.dataset.化新班別選項=正式版號;
    }
    select.value=normalized==='夜班'?'大夜班':normalized;
    if(!select.value)select.value='早班';
  }

  function 化新作業日(班別){
    const now=new Date();
    const shift=正規化班別(班別||取班別());
    const hhmm=now.getHours()*100+now.getMinutes();
    const d=new Date(now.getTime());
    if(shift==='中班'&&hhmm<140)d.setDate(d.getDate()-1);
    if((shift==='大夜班'||shift==='夜班')&&hhmm<750)d.setDate(d.getDate()-1);
    if(shift==='早班'&&hhmm<600)d.setDate(d.getDate()-1);
    return 日期字串(d);
  }

  function 取作業日(){
    const raw=String($('作業日')&&$('作業日').value||'').trim().replaceAll('/','-');
    return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:化新作業日();
  }

  function 由作業日與時間建日期(dateText,timeText,shiftStartText){
    const m=String(timeText||'00:00').match(/^(\d{1,2}):(\d{2})$/);
    const d=new Date(String(dateText||化新作業日())+'T00:00:00');
    if(Number.isNaN(d.getTime()))return new Date();
    d.setHours(Number(m?m[1]:0),Number(m?m[2]:0),0,0);
    if(shiftStartText){
      const sm=String(shiftStartText).match(/^(\d{1,2}):(\d{2})$/);
      const startMinutes=Number(sm?sm[1]:0)*60+Number(sm?sm[2]:0);
      const thisMinutes=Number(m?m[1]:0)*60+Number(m?m[2]:0);
      if(thisMinutes<startMinutes)d.setDate(d.getDate()+1);
    }
    return d;
  }

  function 建立班別時間(班別){
    const key=正規化班別(班別);
    const rule=班別時間表[key]||班別時間表.早班;
    const 作業日=取作業日();
    const 開始=由作業日與時間建日期(作業日,rule.開始);
    let 結束=由作業日與時間建日期(作業日,rule.結束,rule.開始);
    if(rule.跨日||結束<=開始){while(結束<=開始)結束=加天(結束,1);}
    const 休息=rule.休息.map(pair=>{
      let s=由作業日與時間建日期(作業日,pair[0],rule.開始);
      let e=由作業日與時間建日期(作業日,pair[1],rule.開始);
      while(e<=s)e=加天(e,1);
      return [s,e];
    });
    return {班別:key,規則:rule,作業日,開始,結束,休息};
  }

  function 計算化新工時(開始字串,結束字串,班別){
    let start=由日期時間字串建日期(開始字串);
    let end=由日期時間字串建日期(結束字串);
    const schedule=建立班別時間(班別);
    if(!start)start=schedule.開始;
    if(!end)end=schedule.結束;
    while(end<=start)end=加天(end,1);
    const 原始分鐘=Math.max(0,分鐘差(start,end));
    const 休息分鐘=schedule.休息.reduce((sum,p)=>sum+重疊分鐘(start,end,p[0],p[1]),0);
    const 實際分鐘=Math.max(0,原始分鐘-休息分鐘);
    const 標準工時分鐘=480;
    const 工作日=start.getDay();
    const 週末=工作日===0||工作日===6;
    const 班內原始=重疊分鐘(start,end,schedule.開始,schedule.結束);
    const 班內休息=schedule.休息.reduce((sum,p)=>sum+重疊分鐘(start,end,p[0],p[1]),0);
    const 班內工作=Math.max(0,班內原始-班內休息);
    const 加班分鐘=週末?實際分鐘:Math.max(0,實際分鐘-Math.min(班內工作,標準工時分鐘));
    const 超過下班=end>schedule.結束;
    const 早於上班=start<schedule.開始;
    const 是否加班=週末||加班分鐘>0||超過下班||早於上班;
    return {開始:start,結束:end,作業日:schedule.作業日,班別:班別顯示名稱(schedule.班別),實際分鐘,休息分鐘,原始分鐘,加班分鐘,是否加班,加班類型:是否加班?(週末?'假日加班':'平日加班'):'無'};
  }

  function 設值(id,value){const el=$(id);if(!el||el.value===value)return false;el.value=value;return true;}
  function 發送欄位事件(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}

  function 套用班別時間(來源){
    確保班別選項();
    const start=$('開始時間');
    const end=$('結束時間');
    if(!start||!end)return;
    const 班別=取班別();
    const schedule=建立班別時間(班別);
    let changed=false;
    正在程式更新=true;
    if(!手動狀態.開始時間)changed=設值('開始時間',日期時間字串(schedule.開始))||changed;
    if(!手動狀態.結束時間)changed=設值('結束時間',日期時間字串(schedule.結束))||changed;
    const 作業日=$('作業日');
    if(作業日)作業日.value=schedule.作業日;
    正在程式更新=false;
    套用化新工時計算(來源||'班別時間');
    if(changed){正在程式更新=true;發送欄位事件(start);發送欄位事件(end);正在程式更新=false;}
  }

  function 套用化新工時計算(來源){
    const start=$('開始時間');
    const end=$('結束時間');
    const work=$('實際工時');
    if(!start||!end||!work)return;
    const result=計算化新工時(start.value,end.value,取班別());
    正在程式更新=true;
    if(end.value!==日期時間字串(result.結束))end.value=日期時間字串(result.結束);
    work.value=String(result.實際分鐘);
    const ot=$('是否加班');
    if(ot)ot.value=result.是否加班?'是':'否';
    const otType=$('加班類型');
    if(otType)otType.value=result.加班類型;
    const 作業日=$('作業日');
    if(作業日)作業日.value=result.作業日;
    正在程式更新=false;
    window.智慧製造報工時間狀態={版本:正式版號,來源:來源||'化新工時',班別:result.班別,開始時間:start.value,結束時間:end.value,原始分鐘:result.原始分鐘,休息分鐘:result.休息分鐘,實際工時_分:result.實際分鐘,是否加班:result.是否加班?'是':'否',加班類型:result.加班類型,加班分鐘:result.加班分鐘};
    更新預覽工時欄位(result);
  }

  function 更新預覽工時欄位(result){
    const preview=$('報工預覽');
    if(!preview||!preview.textContent||preview.textContent.trim().charAt(0)!=='{')return;
    try{
      const obj=JSON.parse(preview.textContent);
      obj.班別=result.班別;
      obj.作業日=result.作業日;
      obj.開始時間=$('開始時間')&&$('開始時間').value||obj.開始時間;
      obj.結束時間=$('結束時間')&&$('結束時間').value||obj.結束時間;
      obj.實際工時=result.實際分鐘;
      obj.實際工時_分=result.實際分鐘;
      obj.休息扣除_分=result.休息分鐘;
      obj.是否加班=result.是否加班?'是':'否';
      obj.加班類型=result.加班類型;
      obj.加班分鐘=result.加班分鐘;
      preview.textContent=JSON.stringify(obj,null,2);
    }catch(_){ }
  }

  function 標記手動(id){
    if(正在程式更新)return;
    手動狀態[id]=true;
    const el=$(id);if(el)el.dataset.時間控制手動='1';
    setTimeout(()=>套用化新工時計算('手動修改時間'),0);
  }

  function 檢查班別異動(){
    確保班別選項();
    const 班別=取班別();
    if(班別!==上次班別){上次班別=班別;手動狀態.開始時間=false;手動狀態.結束時間=false;套用班別時間('班別異動');}
    else 套用化新工時計算('定時工時計算');
  }

  function 綁定時間控制(){
    if(已綁定時間控制)return;
    已綁定時間控制=true;
    ['開始時間','結束時間'].forEach(id=>{const el=$(id);if(!el)return;el.addEventListener('input',()=>標記手動(id),true);el.addEventListener('change',()=>標記手動(id),true);});
    $('班別')&&$('班別').addEventListener('change',()=>{手動狀態.開始時間=false;手動狀態.結束時間=false;setTimeout(()=>套用班別時間('手動切換班別'),0);},true);
    document.addEventListener('click',e=>{if(e.target.closest('.人員卡片,.常用人員,[data-tab="產出"],#下一步,#上一步')){setTimeout(()=>套用班別時間('人員或頁面切換'),220);setTimeout(()=>套用班別時間('二次確認'),620);}},true);
    document.addEventListener('touchend',e=>{if(e.target.closest('.人員卡片,.常用人員,[data-tab="產出"],#下一步,#上一步'))setTimeout(()=>套用班別時間('觸控切換'),260);},true);
    setTimeout(()=>套用班別時間('初始化'),250);
    setTimeout(()=>套用班別時間('初始化二次確認'),1200);
    setInterval(檢查班別異動,900);
  }

  function 修正送出Payload(){
    const bridge=window.GAS橋接器;
    if(已修正橋接器||!bridge||typeof bridge.寫入報工!=='function')return;
    已修正橋接器=true;
    const 原始寫入報工=bridge.寫入報工.bind(bridge);
    bridge.寫入報工=function(payload){
      const result=計算化新工時($('開始時間')&&$('開始時間').value,$('結束時間')&&$('結束時間').value,取班別());
      const next=Object.assign({},payload||{});
      next.班別=result.班別;
      next.作業日=result.作業日;
      next.開始時間=$('開始時間')&&$('開始時間').value||next.開始時間;
      next.結束時間=$('結束時間')&&$('結束時間').value||next.結束時間;
      next.實際工時=result.實際分鐘;
      next.實際工時_分=result.實際分鐘;
      next.休息扣除_分=result.休息分鐘;
      next.是否加班=result.是否加班?'是':'否';
      next.加班類型=result.加班類型;
      next.加班分鐘=result.加班分鐘;
      return 原始寫入報工(next);
    };
  }

  function 取數字(value){const raw=String(value==null?'':value).replace(/,/g,'').trim();if(raw==='')return 0;const n=Number(raw);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
  function 寫數字(input,value){if(!input)return false;const next=value>0?String(value):'';if(input.value===next)return false;input.value=next;return true;}
  function 不良分配行清單(){return $$('.不良行').map(row=>({row,input:row.querySelector('.不良數量')})).filter(x=>x.input);}
  function 不良分配合計(){return 不良分配行清單().reduce((sum,item)=>sum+取數字(item.input.value),0);}
  function 顯示不良防呆訊息(text){const el=$('系統訊息');if(!el||!text)return;const old=String(el.textContent||'');if(old.includes(text))return;el.textContent=text+'\n'+old;}

  function 同步不良分配上限(來源){
    const totalInput=$('快速不良數');if(!totalInput)return;
    const rows=不良分配行清單();if(!rows.length)return;
    let total=取數字(totalInput.value);let sum=不良分配合計();const totalRaw=String(totalInput.value||'').trim();
    if(totalRaw===''&&sum>0){if(寫數字(totalInput,sum))發送欄位事件(totalInput);total=sum;}
    rows.forEach((item,index)=>{const other=rows.reduce((acc,x,i)=>acc+(i===index?0:取數字(x.input.value)),0);item.input.max=String(Math.max(0,total-other));item.input.min='0';});
    if(total>0&&sum>total){let overflow=sum-total;rows.slice().reverse().forEach(item=>{if(overflow<=0)return;const current=取數字(item.input.value);const reduce=Math.min(current,overflow);if(reduce>0){const next=current-reduce;if(寫數字(item.input,next))發送欄位事件(item.input);overflow-=reduce;}});顯示不良防呆訊息('⚠️ 不良原因分配合計不可大於不良數量，系統已自動修正。');}
    sum=不良分配合計();
    window.智慧製造不良分配狀態={版本:正式版號,來源:來源||'自動',不良數量:取數字(totalInput.value),分配合計:sum,合格:sum<=取數字(totalInput.value)};
  }

  function 綁定不良分配保護(){
    if(已綁定不良保護)return;已綁定不良保護=true;
    document.addEventListener('input',e=>{if(e.target&&(e.target.id==='快速不良數'||e.target.classList.contains('不良數量')))setTimeout(()=>同步不良分配上限('輸入'),0);},true);
    document.addEventListener('change',e=>{if(e.target&&(e.target.id==='快速不良數'||e.target.classList.contains('不良數量')||e.target.classList.contains('不良選單')))setTimeout(()=>同步不良分配上限('變更'),0);},true);
    document.addEventListener('click',e=>{if(e.target&&(e.target.id==='新增不良'||e.target.classList.contains('刪除鈕')))setTimeout(()=>同步不良分配上限('新增或刪除'),120);if(e.target&&e.target.id==='送出報工'){同步不良分配上限('送出前檢查');const total=取數字($('快速不良數')&&$('快速不良數').value);const sum=不良分配合計();if(sum>total){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();顯示不良防呆訊息('❌ 不良原因分配合計不可大於不良數量，請先修正後再送出。');}}},true);
    setInterval(()=>同步不良分配上限('定時保護'),1200);setTimeout(()=>同步不良分配上限('初始化'),800);
  }

  async function 清理快取並重整(){
    const btn=$('重整鈕');if(btn){btn.disabled=true;btn.textContent='⟳';}
    const status=$('狀態卡');if(status)status.textContent='🟡 更新中｜重新載入最新正式版 '+正式版號;
    try{if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(reg=>reg.update().catch(()=>{})));}if(window.caches){const keys=await caches.keys();await Promise.all(keys.filter(k=>/smart|factory|worker|pwa|報工|製造/i.test(k)).map(k=>caches.delete(k).catch(()=>{})));}}catch(error){console.warn('更新快取略過',error);}
    const url=new URL(location.href);url.searchParams.set('v',正式版號);url.searchParams.set('更新時間',String(Date.now()));location.replace(url.toString());
  }
  function 綁定右上更新(){if(已綁定右上更新)return;const btn=$('重整鈕');if(!btn)return;已綁定右上更新=true;btn.title='更新到最新正式版 '+正式版號;btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();清理快取並重整();},true);}

  function 停止掃碼(){if(掃碼計時器){clearInterval(掃碼計時器);掃碼計時器=null;}if(掃碼串流){掃碼串流.getTracks().forEach(t=>t.stop());掃碼串流=null;}const video=$('掃碼預覽');if(video){try{video.pause();}catch(_){ }video.srcObject=null;}}
  function 關閉掃碼(){停止掃碼();$('掃碼視窗')&&$('掃碼視窗').classList.remove('顯示');const input=$('掃碼手動輸入');if(input)input.value='';}
  function 套用掃碼值(raw){const text=String(raw||'').trim();if(!text)return;if(掃碼類型==='人員'){const cards=$$('.人員卡片');const hit=cards.find(card=>String(card.dataset.id||'').trim()===text)||cards.find(card=>(card.textContent||'').includes(text));if(hit){hit.click();關閉掃碼();return;}alert('找不到人員：'+text);return;}const products=$$('.產品卡片');let hit=products.find(card=>String(card.dataset.key||'').split('|').some(v=>v.trim()===text));if(!hit)hit=products.find(card=>(card.textContent||'').includes(text));if(hit){hit.click();關閉掃碼();return;}const search=$('搜尋工件');if(search){search.value=text;發送欄位事件(search);setTimeout(()=>{const again=$$('.產品卡片').find(card=>(card.textContent||'').includes(text)||String(card.dataset.key||'').includes(text));if(again){again.click();關閉掃碼();}else alert('找不到產品：'+text);},300);}else alert('找不到產品：'+text);}
  async function 啟動掃碼(type){掃碼類型=type==='人員'?'人員':'工件';停止掃碼();const modal=$('掃碼視窗');const video=$('掃碼預覽');const title=$('掃碼標題');const info=$('掃碼說明');const input=$('掃碼手動輸入');if(title)title.textContent=掃碼類型==='人員'?'人員掃碼':'產品掃碼';if(info)info.textContent='正在開啟相機...';if(input)input.value='';if(modal)modal.classList.add('顯示');if(!video||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){if(info)info.textContent='此裝置無法開啟相機，請用下方手動輸入。';return;}try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});掃碼串流=stream;video.srcObject=stream;await video.play();if('BarcodeDetector'in window){const detector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e']});if(info)info.textContent='請將條碼 / QR Code 對準框內。';掃碼計時器=setInterval(async()=>{try{const codes=await detector.detect(video);const raw=codes&&codes[0]&&codes[0].rawValue||'';if(raw){if(input)input.value=raw;套用掃碼值(raw);}}catch(_){ }},650);}else{if(info)info.textContent='相機已開啟；此手機瀏覽器不支援自動辨識時，請在下方手動輸入後按套用。';}}catch(error){if(info)info.textContent='無法開啟相機：'+(error&&error.message||error)+'。請檢查相機權限，或用下方手動輸入。';}}
  function 綁定掃碼保護(){if(已綁定掃碼)return;const buttons=$$('[data-scan]');if(!buttons.length)return;已綁定掃碼=true;document.addEventListener('click',e=>{const btn=e.target.closest('[data-scan]');if(!btn)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();啟動掃碼(btn.dataset.scan);},true);$('掃碼取消')&&$('掃碼取消').addEventListener('click',e=>{e.preventDefault();關閉掃碼();},true);$('掃碼重啟')&&$('掃碼重啟').addEventListener('click',e=>{e.preventDefault();啟動掃碼(掃碼類型||'工件');},true);$('掃碼送出')&&$('掃碼送出').addEventListener('click',e=>{e.preventDefault();套用掃碼值($('掃碼手動輸入')&&$('掃碼手動輸入').value);},true);$('掃碼手動輸入')&&$('掃碼手動輸入').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();套用掃碼值(e.target.value);}},true);window.addEventListener('beforeunload',停止掃碼);}

  function 載入正式樣式(){if(document.getElementById('報工正式樣式'))return;const x=document.createElement('link');x.id='報工正式樣式';x.rel='stylesheet';x.href='./work-report-v2-ui.css?v='+正式版號;document.head.appendChild(x);}
  function 人員下拉正式化(){const list=$('人員列表');if(!list)return;let control=$('人員下拉控制');if(!control){control=document.createElement('div');control.id='人員下拉控制';control.className='人員下拉正式';control.innerHTML='<button id="人員下拉按鈕" type="button"><span class="下拉頭像">👤</span><span><span class="下拉姓名">請選擇人員</span><span class="下拉資料">點擊展開人員圖片卡片清單</span></span><span class="下拉箭頭">⌄</span></button>';list.parentNode.insertBefore(control,list);}const btn=$('人員下拉按鈕');if(btn&&!btn.dataset.ok){btn.dataset.ok='1';btn.onclick=function(e){if(e)e.preventDefault();document.body.classList.add('人員下拉展開');};}const selected=list.querySelector('.人員卡片.選中');if(selected){const name=control.querySelector('.下拉姓名');const data=control.querySelector('.下拉資料');const pic=control.querySelector('.下拉頭像');const img=selected.querySelector('.頭像圈 img');if(name)name.textContent=(selected.querySelector('.人名')||{}).textContent||'已選人員';if(data)data.textContent=((selected.querySelector('.人工號')||{}).textContent||'')+'｜'+((selected.querySelector('.班標')||{}).textContent||'');if(pic)pic.innerHTML=img?'<img src="'+img.src+'" alt="">':'👤';}if(!list.dataset.close){list.dataset.close='1';list.addEventListener('click',function(e){if(e.target.closest('.人員卡片'))setTimeout(function(){document.body.classList.remove('人員下拉展開');人員下拉正式化();手動狀態.開始時間=false;手動狀態.結束時間=false;套用班別時間('選定人員');},160);},true);}}

  function 更新頂欄時間(){
    const now=new Date();const 班別=班別顯示名稱(取班別());const 時=補零(now.getHours());const 分=補零(now.getMinutes());const 秒=補零(now.getSeconds());const 作業日=取作業日().replace(/-/g,'/');
    const text=班別+'｜'+時段文字(now.getHours())+' '+時+':'+分+':'+秒+'｜作業日 '+作業日;
    const el=$('work-date-display');if(el)el.textContent=text;
  }

  function 執行正式補強(){載入正式樣式();人員下拉正式化();確保班別選項();綁定時間控制();綁定不良分配保護();綁定右上更新();綁定掃碼保護();修正送出Payload();更新頂欄時間();}

  document.addEventListener('DOMContentLoaded',function(){setInterval(執行正式補強,1000);setTimeout(執行正式補強,250);setTimeout(執行正式補強,1200);});
})();
