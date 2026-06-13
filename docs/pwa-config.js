window.PWA_CONFIG={
  GAS_WEB_APP_URL:'https://script.google.com/macros/s/AKfycbweSKwcREbv-5R5E1ZIj_XOZDGQzRPCdoOAy2uTkhMwZTZoIv-GtpQi0PF8ahdb6KEJ/exec',
  APP_NAME:'製造部智慧製造應用總部',
  VERSION:'v2.1.34_完整中英文合併穩定版',
  SPREADSHEET_ID:'1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS:8000,
  API_ACTIONS:{健康檢查:'健康檢查',主檔檢查:'主檔檢查',取得報工作業v2初始資料:'取得報工作業v2初始資料',寫入報工作業v2:'寫入報工作業v2',寫入不良紀錄v2:'寫入不良紀錄v2',手動重刷_主檔照片:'手動重刷_主檔照片'}
};

(function(){
  'use strict';
  const 正式版號='243';
  const 班別時間表={
    早班:{顯示:'早班',英文:'Day Shift',開始:'08:00',結束:'16:50',跨日:false,休息:[['10:00','10:10'],['12:10','12:40'],['14:40','14:50']]},
    中班:{顯示:'中班',英文:'Swing Shift',開始:'16:50',結束:'01:40',跨日:true,休息:[['18:50','19:00'],['21:00','21:30'],['23:30','23:40']]},
    大夜班:{顯示:'夜班',英文:'Night Shift',開始:'23:00',結束:'07:50',跨日:true,休息:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']]},
    夜班:{顯示:'夜班',英文:'Night Shift',開始:'23:00',結束:'07:50',跨日:true,休息:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']]}
  };
  const 手動狀態={開始時間:false,結束時間:false};
  let 正在程式更新=false;
  let 已綁定=false;
  let 已修正橋接器=false;

  function $(id){return document.getElementById(id);}
  function $$(selector){return Array.from(document.querySelectorAll(selector));}
  function 補零(n){return String(n).padStart(2,'0');}
  function 日期字串(d){return d.getFullYear()+'-'+補零(d.getMonth()+1)+'-'+補零(d.getDate());}
  function 日期時間字串(d){return 日期字串(d)+'T'+補零(d.getHours())+':'+補零(d.getMinutes());}
  function 由日期時間字串(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d;}
  function 加天(d,days){const x=new Date(d.getTime());x.setDate(x.getDate()+days);return x;}
  function 分鐘差(a,b){return Math.round((b.getTime()-a.getTime())/60000);}
  function 重疊分鐘(a1,a2,b1,b2){const s=Math.max(a1.getTime(),b1.getTime());const e=Math.min(a2.getTime(),b2.getTime());return e>s?Math.round((e-s)/60000):0;}
  function 寫文字(el,text){if(el&&el.textContent!==text)el.textContent=text;}
  function 寫HTML(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html;}
  function 寫值(el,value){if(el&&el.value!==value)el.value=value;}
  function 主詞(text){return String(text||'').replace(/\*/g,'').split('/')[0].trim().replace(/\s+/g,'');}

  function 正規化班別(value){
    const text=String(value||'').replace(/\s+/g,'').toUpperCase();
    if(text.includes('中班')||text.includes('SWING')||text.includes('1650')||text.includes('0140'))return '中班';
    if(text.includes('大夜')||text.includes('夜班')||text.includes('夜')||text.includes('NIGHT')||text.includes('2300')||text.includes('0750'))return '大夜班';
    return '早班';
  }
  function 取班別(){
    const select=$('班別');
    if(select&&select.value)return 正規化班別(select.value);
    const p=window.智慧製造報工狀態&&window.智慧製造報工狀態.選定人員;
    return 正規化班別(p&&(p.班別||p.班次||p.原始班別)||'早班');
  }
  function 取作業日(){
    const raw=String($('作業日')&&$('作業日').value||'').trim().replaceAll('/','-');
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
    const d=new Date();
    const shift=取班別();
    const hhmm=d.getHours()*100+d.getMinutes();
    if(shift==='中班'&&hhmm<140)d.setDate(d.getDate()-1);
    if(shift==='大夜班'&&hhmm<750)d.setDate(d.getDate()-1);
    if(shift==='早班'&&hhmm<600)d.setDate(d.getDate()-1);
    return 日期字串(d);
  }
  function 由作業日與時間(dateText,timeText,shiftStartText){
    const m=String(timeText||'00:00').match(/^(\d{1,2}):(\d{2})$/);
    const d=new Date(String(dateText||取作業日())+'T00:00:00');
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
    const key=正規化班別(班別||取班別());
    const rule=班別時間表[key]||班別時間表.早班;
    const 作業日=取作業日();
    const 開始=由作業日與時間(作業日,rule.開始);
    let 結束=由作業日與時間(作業日,rule.結束,rule.開始);
    while(結束<=開始)結束=加天(結束,1);
    const 休息=rule.休息.map(pair=>{
      let s=由作業日與時間(作業日,pair[0],rule.開始);
      let e=由作業日與時間(作業日,pair[1],rule.開始);
      while(e<=s)e=加天(e,1);
      return [s,e];
    });
    return {key,rule,作業日,開始,結束,休息};
  }
  function 計算化新工時(){
    const schedule=建立班別時間();
    let start=由日期時間字串($('開始時間')&&$('開始時間').value)||schedule.開始;
    let end=由日期時間字串($('結束時間')&&$('結束時間').value)||schedule.結束;
    while(end<=start)end=加天(end,1);
    const 原始分鐘=Math.max(0,分鐘差(start,end));
    const 休息分鐘=schedule.休息.reduce((sum,p)=>sum+重疊分鐘(start,end,p[0],p[1]),0);
    const 實際分鐘=Math.max(0,原始分鐘-休息分鐘);
    return {schedule,start,end,原始分鐘,休息分鐘,實際分鐘};
  }
  function 確保班別選項(){
    const el=$('班別');
    if(!el||el.dataset.穩定班別版本===正式版號)return;
    const current=取班別();
    el.innerHTML='<option value="早班">早班 / Day Shift 08:00-16:50</option><option value="中班">中班 / Swing Shift 16:50-01:40</option><option value="大夜班">夜班 / Night Shift 23:00-07:50</option>';
    el.value=current;
    if(!el.value)el.value='早班';
    el.dataset.穩定班別版本=正式版號;
  }
  function 套用班別時間(force){
    const start=$('開始時間');
    const end=$('結束時間');
    if(!start||!end)return;
    const schedule=建立班別時間();
    正在程式更新=true;
    if(force||!手動狀態.開始時間||!start.value)寫值(start,日期時間字串(schedule.開始));
    if(force||!手動狀態.結束時間||!end.value)寫值(end,日期時間字串(schedule.結束));
    const workDate=$('作業日');
    if(workDate)寫值(workDate,schedule.作業日);
    正在程式更新=false;
    套用工時計算();
  }
  function 套用工時計算(){
    const result=計算化新工時();
    正在程式更新=true;
    const end=$('結束時間');
    if(end)寫值(end,日期時間字串(result.end));
    const work=$('實際工時');
    if(work)寫值(work,String(result.實際分鐘));
    const workDate=$('作業日');
    if(workDate)寫值(workDate,result.schedule.作業日);
    正在程式更新=false;
    window.智慧製造報工時間狀態={版本:正式版號,開始時間:$('開始時間')&&$('開始時間').value||'',結束時間:$('結束時間')&&$('結束時間').value||'',原始分鐘:result.原始分鐘,休息分鐘:result.休息分鐘,實際工時_分:result.實際分鐘};
  }
  function 綁定時間(){
    if(已綁定)return;
    已綁定=true;
    ['開始時間','結束時間'].forEach(id=>{
      const el=$(id);
      if(!el)return;
      el.addEventListener('input',()=>{if(!正在程式更新){手動狀態[id]=true;套用工時計算();}},true);
      el.addEventListener('change',()=>{if(!正在程式更新){手動狀態[id]=true;套用工時計算();}},true);
    });
    const shift=$('班別');
    if(shift)shift.addEventListener('change',()=>{手動狀態.開始時間=false;手動狀態.結束時間=false;setTimeout(()=>套用班別時間(true),0);},true);
    document.addEventListener('click',e=>{
      if(e.target&&e.target.closest('.人員卡片,.常用人員,[data-tab="產出"]')){
        setTimeout(()=>{手動狀態.開始時間=false;手動狀態.結束時間=false;套用班別時間(false);},220);
      }
    },true);
  }
  function 修正送出Payload(){
    const bridge=window.GAS橋接器;
    if(已修正橋接器||!bridge||typeof bridge.寫入報工!=='function')return;
    已修正橋接器=true;
    const 原始寫入報工=bridge.寫入報工.bind(bridge);
    bridge.寫入報工=function(payload){
      const result=計算化新工時();
      const next=Object.assign({},payload||{});
      next.作業日=result.schedule.作業日;
      next.開始時間=$('開始時間')&&$('開始時間').value||next.開始時間;
      next.結束時間=$('結束時間')&&$('結束時間').value||next.結束時間;
      next.實際工時=result.實際分鐘;
      next.實際工時_分=result.實際分鐘;
      next.休息扣除_分=result.休息分鐘;
      next.是否加班=$('是否加班')&&$('是否加班').value||next.是否加班||'否';
      next.加班類型=$('加班類型')&&$('加班類型').value||next.加班類型||'無';
      return 原始寫入報工(next);
    };
  }
  function 設定選項雙語(select,map){
    if(!select)return;
    const keep=select.value;
    let changed=false;
    Array.from(select.options||[]).forEach(o=>{
      const raw=String(o.value||o.textContent||'').split('/')[0].trim();
      if(map[raw]){
        if(o.value!==raw){o.value=raw;changed=true;}
        if(o.textContent!==map[raw]){o.textContent=map[raw];changed=true;}
      }
    });
    if(changed&&keep)select.value=String(keep).split('/')[0].trim();
  }
  function 套用完整中英文合併版(){
    document.title='製造部．報工系統 / Manufacturing Work Report System';
    寫文字(document.querySelector('.標題'),'🏭 製造部．報工系統 / Manufacturing Work Report');
    寫文字(document.querySelector('.副標'),'化新智慧製造HS / Huaxin Smart Manufacturing HS');

    const tabMap={人員:'👤<br>人員 / Operator',工件:'🔧<br>工件 / Workpiece',產出:'📊<br>產出 / Output',品質:'🔍<br>品質 / Quality'};
    Object.keys(tabMap).forEach(k=>{const el=document.querySelector('[data-tab="'+k+'"]');if(el)寫HTML(el,tabMap[k]);});

    const labelMap={
      '班別':'班別 / Shift','作業日':'作業日 / Work Date','工站選擇':'工站選擇 / Station Select','機台照片':'機台照片 / Machine Photos',
      '今日共做數':'今日共做數 / Total Quantity','不良數量':'不良數量 / Defect Quantity','實際良品數':'實際良品數 / Good Quantity',
      '開始時間':'開始時間 / Start Time','結束時間':'結束時間 / End Time','實際工時_分':'實際工時_分 / Actual Work Minutes',
      '是否加班':'是否加班 / Overtime','加班類型':'加班類型 / Overtime Type','不良原因數量分配':'不良原因數量分配 / Defect Reason Allocation',
      '異常類型':'異常類型 / Abnormal Type','責任歸屬':'責任歸屬 / Responsibility','異常開始時間':'異常開始時間 / Abnormal Start Time',
      '異常結束時間':'異常結束時間 / Abnormal End Time','照片備註':'照片備註 / Photo Notes','現場照片':'現場照片 / Site Photos'
    };
    $$('label').forEach(label=>{const key=主詞(label.textContent);if(labelMap[key])寫文字(label,labelMap[key]);});

    const sectionPairs=[
      ['👤 選定人員','👤 選定人員 / Selected Operator'],['🔧 工件與工站','🔧 工件與工站 / Workpiece & Station'],
      ['📊 產出與工時','📊 產出與工時 / Output & Work Time'],['🔍 品質與不良','🔍 品質與不良 / Quality & Defects'],
      ['🧾 報工預覽','🧾 報工預覽 / Work Report Preview'],['🧾 系統訊息','🧾 系統訊息 / System Message']
    ];
    $$('.區標').forEach(el=>{const t=String(el.textContent||'').replace(/\s+/g,' ').trim();sectionPairs.forEach(p=>{if(t.includes(p[0])&&!t.includes('/'))寫文字(el,p[1]);});});

    const placeholders={
      搜尋人員:'搜尋人員姓名、工號 / Search operator name or ID...',搜尋工件:'搜尋工件品名、料號 / Search workpiece name or part No...',
      今日共做數:'請輸入總數 / Enter total quantity',快速不良數:'不良數 / Defect quantity',實際良品數:'自動計算 / Auto calculated',
      照片備註:'輸入異常描述、照片說明、現場備註 / Enter abnormal notes, photo notes, site remarks...',掃碼手動輸入:'無法掃描時，可手動輸入 / Enter manually if scan fails'
    };
    Object.keys(placeholders).forEach(id=>{const el=$(id);if(el&&el.placeholder!==placeholders[id])el.placeholder=placeholders[id];});

    設定選項雙語($('是否加班'),{否:'否 / No',是:'是 / Yes'});
    設定選項雙語($('加班類型'),{無:'無 / None',平日加班:'平日加班 / Weekday OT',假日加班:'假日加班 / Holiday OT',臨時加班:'臨時加班 / Temporary OT'});
    設定選項雙語($('異常類型'),{'無異常':'無異常 / Normal',設備異常:'設備異常 / Equipment Abnormal','機台停機':'機台停機 / Machine Down','待料':'待料 / Waiting Material','換刀':'換刀 / Tool Change','品質確認':'品質確認 / Quality Check','其他':'其他 / Others'});
    設定選項雙語($('責任歸屬'),{無:'無 / None',製造:'製造 / Manufacturing',素材:'素材 / Material',外包:'外包 / Outsourcing',設備:'設備 / Equipment',生技:'生技 / Process Engineering',其他:'其他 / Others'});

    寫文字($('上一步'),'← 上一步 / Previous');
    寫文字($('下一步'),'下一步 / Next →');
    寫文字($('送出報工'),'確認送出 / Confirm Submit');
    寫文字($('新增不良'),'＋ 新增不良分配 / Add Defect Allocation');
    寫文字($('拍照鈕'),'📸 拍照 / Camera');
    寫文字($('選圖鈕'),'🖼 選圖 / Gallery');
    寫文字($('清除照片鈕'),'🗑 清除 / Clear');
    寫文字($('掃碼取消'),'關閉 / Close');
    寫文字($('掃碼重啟'),'重掃 / Rescan');
    寫文字($('掃碼送出'),'套用 / Apply');

    const personBtn=$('人員下拉按鈕');
    if(personBtn){
      const n=personBtn.querySelector('.下拉姓名');
      const d=personBtn.querySelector('.下拉資料');
      if(n&&n.textContent==='請選擇人員')寫文字(n,'請選擇人員 / Select Operator');
      if(d&&d.textContent.indexOf('/')<0)寫文字(d,'點擊展開人員圖片卡片清單 / Tap to open operator photo list');
    }
    const productBtn=$('產品下拉按鈕');
    if(productBtn){
      const n=productBtn.querySelector('.下拉產品名');
      const d=productBtn.querySelector('.下拉產品資料');
      if(n&&n.textContent==='請選擇產品')寫文字(n,'請選擇產品 / Select Product');
      if(d&&d.textContent.indexOf('/')<0)寫文字(d,'點擊展開產品圖片卡片清單 / Tap to open product photo list');
    }

    const full=$('全螢幕鈕');if(full)full.title='全螢幕 / Full Screen';
    const refresh=$('重整鈕');if(refresh)refresh.title='更新 / Refresh';
  }
  function 穩定送出按鈕(){寫文字($('送出報工'),'確認送出 / Confirm Submit');}
  function 啟動(){
    確保班別選項();
    綁定時間();
    修正送出Payload();
    套用完整中英文合併版();
    套用班別時間(false);
    穩定送出按鈕();
  }
  document.addEventListener('DOMContentLoaded',function(){
    啟動();
    [300,900,1600,2600,4200].forEach(ms=>setTimeout(啟動,ms));
    setInterval(()=>{修正送出Payload();穩定送出按鈕();},3000);
  });
})();
