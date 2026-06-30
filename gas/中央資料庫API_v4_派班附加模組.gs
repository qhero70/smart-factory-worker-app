/**
 * 智慧製造中央作戰資料庫 API v4.1｜自動派班附加模組修正版
 * 修正：Cannot read properties of undefined (reading 'length')
 * 原因：v3 主程式的「資料表欄位」尚未登記 16/17/18 三張派班表。
 * 用法：用本檔完整取代舊的「中央資料庫API_v4_派班附加模組.gs」，重新部署新版本。
 */

function 派班V1_確保欄位_(){
  if (typeof 資料表欄位 === 'undefined') throw new Error('找不到 v3 主程式的「資料表欄位」，請確認已使用中央資料庫API_v3_APS獨立版.gs。');
  資料表欄位['16_自動派班結果'] = ['派班ID','日期','班別','工號','姓名','工站','機台','工單號','產品編號','品名','工單類型','排程數量','預計開始','預計完成','技能等級','派班狀態','備註'];
  資料表欄位['17_人員負荷表'] = ['日期','班別','工號','姓名','派班筆數','負荷小時','可用小時','負荷率','狀態','備註'];
  資料表欄位['18_派班警示'] = ['時間戳','等級','日期','班別','工單號','產品編號','品名','警示類型','警示內容','處置建議','狀態'];
}

function 執行自動派班V1_(body){
  派班V1_確保欄位_();
  const ss=取得資料庫_必要時建立_();
  建立或校正分頁_(ss,'16_自動派班結果',資料表欄位['16_自動派班結果']);
  建立或校正分頁_(ss,'17_人員負荷表',資料表欄位['17_人員負荷表']);
  建立或校正分頁_(ss,'18_派班警示',資料表欄位['18_派班警示']);

  const 排程=讀表_(ss,'11_自動排程結果');
  const 人員表=讀表_(ss,'A3_人員技能矩陣');
  const 人員=(Array.isArray(人員表)?人員表:[]).filter(r=>取(r,'啟用')!=='否');
  const 派班=[]; const 負荷={}; const 警示=[];
  let id=0;

  const 可用人員=人員.length?人員:[{
    工號:'待補人員',姓名:'待派班',班別:'日班',可工作工站:'全部',可操作機台:'全部',加班許可:'否',技能等級:'待確認',啟用:'是',備註:'A3_人員技能矩陣尚未建立'
  }];

  (Array.isArray(排程)?排程:[])
    .filter(r=>取(r,'工單類型')==='PROD'||取(r,'工單類型')==='PACK'||取(r,'工單類型')==='LOAD')
    .forEach(r=>{
      const start=取日期_(r,'預計開始')||今日_();
      const end=取日期_(r,'預計完成')||start;
      const station=取(r,'工單類型')==='PACK'?'包裝':取(r,'工單類型')==='LOAD'?'出貨':'加工';
      const machine=取(r,'主機台')||station;
      const person=選派人員_(可用人員,station,machine,start,負荷);
      const key=[start,person.班別,person.工號].join('|');
      if(!負荷[key])負荷[key]={日期:start,班別:person.班別,工號:person.工號,姓名:person.姓名,派班筆數:0,負荷小時:0,可用小時:8,備註:''};
      負荷[key].派班筆數++;
      負荷[key].負荷小時+=取(r,'工單類型')==='PROD'?8:2;
      派班.push({
        派班ID:'DSP'+String(++id).padStart(5,'0'),日期:start,班別:person.班別,工號:person.工號,姓名:person.姓名,工站:station,機台:machine,
        工單號:取(r,'工單號'),產品編號:取(r,'產品編號'),品名:取(r,'品名'),工單類型:取(r,'工單類型'),排程數量:取(r,'排程數量'),
        預計開始:start,預計完成:end,技能等級:person.技能等級,派班狀態:person.工號==='待補人員'?'待人工派班':'已派班',備註:取(r,'CTB狀態')==='紅燈'?'CTB紅燈，僅預派，不可開工':''
      });
      if(person.工號==='待補人員')警示.push(派班警示_('中',start,person.班別,取(r,'工單號'),取(r,'產品編號'),取(r,'品名'),'無可用人員','A3_人員技能矩陣無符合人員','補人員技能或人工派班'));
    });

  const loadRows=Object.values(負荷).map(x=>{
    x.負荷率=x.可用小時?x.負荷小時/x.可用小時:0;
    x.狀態=x.負荷率>1?'超載':'正常';
    if(x.負荷率>1)警示.push(派班警示_('高',x.日期,x.班別,'','','','人員超載',x.姓名+' 負荷率 '+Math.round(x.負荷率*100)+'%','調整派班或加班'));
    return x;
  });

  寫入物件陣列_(ss,'16_自動派班結果',派班,'replace');
  寫入物件陣列_(ss,'17_人員負荷表',loadRows,'replace');
  寫入物件陣列_(ss,'18_派班警示',警示,'replace');
  寫入紀錄_(ss,'DSP_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss'),'GAS_DISPATCH_V1','16_自動派班結果',派班.length,'完成','自動派班V1_v4.1');
  SpreadsheetApp.flush();
  return 成功_({訊息:'自動派班V1完成',版本:'v4.1',派班筆數:派班.length,人員負荷筆數:loadRows.length,警示筆數:警示.length,資料庫網址:ss.getUrl()});
}

function 選派人員_(list,station,machine,date,load){
  const safe=Array.isArray(list)?list:[];
  const candidates=safe.filter(p=>{
    const s=取(p,'可工作工站')||''; const m=取(p,'可操作機台')||'';
    return s==='全部'||m==='全部'||s.includes(station)||m.includes(machine)||station==='包裝'||station==='出貨';
  });
  const pool=candidates.length?candidates:safe;
  if(!pool.length) return {工號:'待補人員',姓名:'待派班',班別:'日班',技能等級:'待確認'};
  pool.sort((a,b)=>目前負荷_(a,date,load)-目前負荷_(b,date,load));
  const p=pool[0];
  return {工號:取(p,'工號')||'待補人員',姓名:取(p,'姓名')||'待派班',班別:取(p,'班別')||'日班',技能等級:取(p,'技能等級')||'待確認'};
}

function 目前負荷_(p,date,load){
  const key=[date,取(p,'班別')||'日班',取(p,'工號')||'待補人員'].join('|');
  return load[key]?Number(load[key].負荷小時||0):0;
}

function 派班警示_(level,date,shift,mo,code,name,type,msg,sug){
  return {時間戳:new Date(),等級:level,日期:date,班別:shift,工單號:mo,產品編號:code,品名:name,警示類型:type,警示內容:msg,處置建議:sug,狀態:'未處理'};
}
