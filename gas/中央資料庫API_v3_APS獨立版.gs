/**
 * 智慧製造中央作戰資料庫 API v3｜APS 自動排程獨立版
 * 用法：新的中央資料庫 GAS 專案可直接整份取代 Code.gs。
 * 主線：清洗器 → 10_排程需求池 → APS自動排程V1 → 11_自動排程結果 / 13_拆工單結果 / 14_資源負荷甘特 / 15_排程警示
 */

const 系統名稱 = '智慧製造中央作戰資料庫_BOM排程版';
const 系統版本 = 'v3_APS自動排程獨立版';
const 屬性_資料庫ID = '智慧製造中央作戰資料庫_ID';

const 資料表欄位 = {
  '00_系統設定': ['設定鍵','設定值','說明','最後更新'],
  '00_寫入紀錄': ['時間戳','批次ID','來源','工作表','寫入筆數','狀態','備註'],
  '01_產品主檔': ['產品編號','客戶品號','品名','產品類型','組裝類別','是否為主件','是否有BOM','預設工站','主機台','啟用','備註'],
  '02_BOM明細主檔': ['BOM主鍵_PK','BOM版本','層級','上層產品編號_FK','主件料號','主件品名','主件客戶品號','子件料號','子件名稱','子件客戶品號','子件類型','來源','單位','用量','損耗率','啟用','來源檔案'],
  '03_BOM樹狀展開': ['樹狀ID','BOM版本','層級','路徑','主件料號','主件品名','子件料號','子件名稱','用量','來源','備註'],
  '04_庫存在製入庫': ['料號','品名','庫存量','在製量','預計入庫量','已分配量','可用量','資料來源','更新時間','備註'],
  '05_計劃每日明細': ['區域','產品編號','客戶品號','品名','工單','日期','類型','數量','期初庫存','產能8H','CTB狀態','來源工作表','來源列號'],
  '06_本月彙總': ['區域','產品編號','客戶品號','品名','本月計畫量','本月產出量','本月需求量','供料量','可用量','還需加工量','達成率','訂單已滿足','最近出貨日','產能8H','主機台','CTB狀態','Tier','備註'],
  '07_出貨訂單': ['訂單號','區域','產品編號','客戶品號','品名','需求日期','需求數量','產能8H','狀態','來源'],
  '08_BOM需求展開': ['需求編號','父需求編號','階層','主件料號','主件品名','子件料號','子件名稱','子件類型','來源','單位用量','損耗率','成品需求量','子件需求量','需求日期','來源BOM_PK','狀態'],
  '09_CTB齊套檢查': ['需求編號','料號','品名','需求量','庫存量','在製量','預計入庫量','已分配量','可用量','缺口','CTB狀態','處置建議','最晚到料日','備註'],
  '10_排程需求池': ['需求編號','來源','區域','產品編號','客戶品號','品名','需求日期','需求數量','期初庫存','本月產出量','供料量','可用量','還需加工量','產能8H','建議開工日','建議完工日','主機台','急迫性','CTB狀態','狀態','備註'],
  '11_自動排程結果': ['排程ID','需求編號','工單號','工單類型','產品編號','品名','需求數量','排程數量','產能8H','每日班數','OEE','需天數','預計開始','預計完成','主機台','人員班別','前置依賴','CTB狀態','排程狀態','備註'],
  '12_資源參數': ['參數/資源ID','類型','名稱','可用量/數值','單位','適用產品/工站','啟用','備註'],
  '13_拆工單結果': ['工單號','來源需求編號','工單類型','父工單號','產品編號','品名','數量','單位','預計開始','預計完成','最後工序','入庫觸發','狀態','備註'],
  '14_資源負荷甘特': ['日期','班別','資源類型','資源ID','需求編號','工單號','產品編號','品名','工單類型','排程數量','負荷小時','換線分鐘','CTB狀態','狀態','備註'],
  '15_排程警示': ['時間戳','等級','需求編號','產品編號','品名','警示類型','警示內容','處置建議','狀態'],
  'A1_工站機台能力': ['產品關鍵字','工站','機台群組','主機台','每日班數','OEE','啟用','備註'],
  'A2_換線時間矩陣': ['共用機台編號','前產品工藝代碼','後產品工藝代碼','換線時間_分鐘','啟用','備註'],
  'A3_人員技能矩陣': ['工號','姓名','班別','可工作工站','可操作機台','加班許可','技能等級','啟用','備註'],
  'A4_LR成套規則': ['成套群組','L料號','R料號','合流工站','批量規則','啟用','備註'],
  '90_匯入原始資料': ['時間戳','來源','資料類型','JSON內容'],
  '91_BOM檢查清單': ['檢查項目','狀態','筆數','說明','最後更新']
};

const PWA對應分頁 = {
  'BOM明細':'02_BOM明細主檔','每日明細':'05_計劃每日明細','本月彙總':'06_本月彙總','出貨訂單':'07_出貨訂單','BOM需求展開':'08_BOM需求展開','CTB齊套檢查':'09_CTB齊套檢查','排程需求池':'10_排程需求池','自動排程結果':'11_自動排程結果','拆工單結果':'13_拆工單結果'
};

function doGet(e){
  const cb=e&&e.parameter&&e.parameter.callback;
  try{
    const action=String((e&&e.parameter&&(e.parameter.action||e.parameter.動作||e.parameter.method))||'status');
    let r;
    if(action==='初始化'||action==='init') r=初始化_智慧製造中央作戰資料庫();
    else if(action==='自檢'||action==='health'||action==='check') r=自檢_智慧製造中央作戰資料庫();
    else if(action==='讀取排程摘要') r=讀取排程摘要_();
    else if(action==='schema') r=成功_({系統:系統名稱,版本:系統版本,資料表欄位});
    else r=成功_({訊息:'API 已啟動',系統:系統名稱,版本:系統版本,時間:new Date().toISOString(),資料庫ID:取得資料庫ID_不建立()});
    return 輸出JSON_(r,cb);
  }catch(err){return 輸出JSON_(失敗_(err),cb)}
}

function doPost(e){
  try{
    const body=解析請求_(e);
    const action=String(body.action||body.動作||body.method||'寫入資料庫快照');
    let r;
    if(action==='初始化'||action==='init') r=初始化_智慧製造中央作戰資料庫();
    else if(action==='自檢'||action==='health'||action==='check') r=自檢_智慧製造中央作戰資料庫();
    else if(action==='寫入資料庫快照'||action==='uploadDatabase') r=寫入資料庫快照_(body);
    else if(action==='執行自動排程V1'||action==='runAPS') r=執行自動排程V1_(body);
    else if(action==='清空分頁') r=清空指定分頁_(body.sheet||body.分頁);
    else r=失敗_('未知 action：'+action);
    return 輸出JSON_(r);
  }catch(err){return 輸出JSON_(失敗_(err))}
}

function 初始化_智慧製造中央作戰資料庫(){
  const ss=取得資料庫_必要時建立_();
  Object.keys(資料表欄位).forEach(n=>建立或校正分頁_(ss,n,資料表欄位[n]));
  寫入系統設定_(ss);初始化APS參數_(ss);SpreadsheetApp.flush();
  return 成功_({訊息:'初始化完成',資料庫名稱:ss.getName(),資料庫ID:ss.getId(),資料庫網址:ss.getUrl(),分頁數:Object.keys(資料表欄位).length});
}

function 自檢_智慧製造中央作戰資料庫(){
  const ss=取得資料庫_必要時建立_();
  const 分頁檢查=Object.keys(資料表欄位).map(n=>{const sh=ss.getSheetByName(n);return{分頁:n,存在:!!sh,資料列:sh?Math.max(0,sh.getLastRow()-1):0,欄數:sh?sh.getLastColumn():0}});
  return 成功_({訊息:'自檢完成',資料庫ID:ss.getId(),資料庫網址:ss.getUrl(),分頁檢查});
}

function 寫入資料庫快照_(body){
  const ss=取得資料庫_必要時建立_();
  const payload=body.payload||body.DB||body.data||{};
  const batch=body.batchId||body.批次ID||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
  const source=body.source||body.來源||'PWA_生產計劃表清洗器';
  const mode=body.mode||body.寫入模式||'replace';
  const tables=payload.tables||payload.sheets||payload.DB||payload;
  const out=[];
  Object.keys(PWA對應分頁).forEach(k=>{const sn=PWA對應分頁[k];const rows=取表資料_(tables,k);if(!Array.isArray(rows))return;const c=寫入物件陣列_(ss,sn,rows,mode==='append'?'append':'replace');out.push({工作表:sn,來源鍵:k,寫入筆數:c});寫入紀錄_(ss,batch,source,sn,c,'完成',mode)});
  建立或校正分頁_(ss,'90_匯入原始資料',資料表欄位['90_匯入原始資料']).appendRow([new Date(),source,'資料庫快照',JSON.stringify(payload).slice(0,45000)]);
  更新BOM檢查清單_(ss);SpreadsheetApp.flush();
  return 成功_({訊息:'資料庫快照寫入完成',批次ID:batch,資料庫ID:ss.getId(),資料庫網址:ss.getUrl(),寫入結果:out});
}

function 執行自動排程V1_(body){
  const ss=取得資料庫_必要時建立_();初始化APS參數_(ss);
  const 需求=讀表_(ss,'10_排程需求池');
  const BOM展開=讀表_(ss,'08_BOM需求展開');
  const CTB=讀表_(ss,'09_CTB齊套檢查');
  const 能力=讀表_(ss,'A1_工站機台能力');
  const 換線=讀表_(ss,'A2_換線時間矩陣');
  const 人員=讀表_(ss,'A3_人員技能矩陣');
  const LR規則=讀表_(ss,'A4_LR成套規則');
  const 每日班數=Number(body.每日班數||body.dailyShifts||2);
  const 預設OEE=Number(body.OEE||body.oee||0.75);
  const 允許週末=String(body.週末可生產||body.weekend||'true')!=='false';
  const childRed=建立父需求缺料索引_(BOM展開,CTB);
  const machineLast={}; const 甘特=[]; const 排程=[]; const 工單=[]; const 警示=[];
  let sid=0;
  const sorted=需求.filter(r=>取(r,'需求編號')).sort((a,b)=>排序分數_(b)-排序分數_(a));
  sorted.forEach(req=>{
    const id=取(req,'需求編號'); const code=取(req,'產品編號'); const name=取(req,'品名');
    const due=取日期_(req,'需求日期')||今日_(); const qty=最大數_(req,'還需加工量','需求數量');
    const cap=Number(取(req,'產能8H')||0); const tier=取(req,'急迫性')||'Tier 4';
    const ctb=childRed[id]?'紅燈':(取(req,'CTB狀態')||'綠燈');
    const route=找能力_(能力,req); const machine=route.主機台||取(req,'主機台')||'待工站主檔對應';
    const oee=Number(route.OEE||預設OEE); const shifts=Number(route.每日班數||每日班數);
    const perDay=cap>0?cap*shifts*oee:0; const days=perDay>0?Math.max(1,Math.ceil(qty/perDay)):999;
    const start=倒推工作日_(due,days+2,允許週末); const end=往後工作日_(start,days-1,允許週末);
    const setup=計算換線分鐘_(換線,machine,machineLast[machine],code); machineLast[machine]=code;
    const pair=偵測LR_(req,LR規則);
    let status='可排'; let note='APS_V1：倒推排程；機台='+machine+'；每日產能='+perDay.toFixed(1);
    if(ctb==='紅燈'){status='缺料暫停';note+='；CTB紅燈，不排近期，需先處理缺料';警示.push(警示列_('高',id,code,name,'CTB紅燈','物料未齊，不可直接排近期','先處理09_CTB齊套檢查缺口'))}
    if(cap<=0){status='待產能主檔';警示.push(警示列_('中',id,code,name,'產能缺失','產能8H為0，無法精準排程','補02_產品主檔或工站能力產能'))}
    if(pair.群組) note+='；L/R群組='+pair.群組+'，合流需取最晚完工';
    排程.push({排程ID:'SCH'+String(++sid).padStart(5,'0'),需求編號:id,工單號:'MO-'+id,工單類型:'PROD',產品編號:code,品名:name,需求數量:取(req,'需求數量'),排程數量:qty,產能8H:cap,每日班數:shifts,OEE:oee,需天數:days,預計開始:start,預計完成:end,主機台:machine,人員班別:找人員_(人員,route.工站,machine),前置依賴:childRed[id]?'BOM/CTB紅燈':'BOM/CTB綠燈',CTB狀態:ctb,排程狀態:status,備註:note});
    工單.push(工單列_('MO-'+id,id,'PROD','',code,name,qty,start,end,'完工','否',status,note));
    分日甘特_(甘特,{start,end,days,shifts,machine,id,code,name,qty,cap,setup,ctb,status,allowWeekend:允許週末});
    const packDay=往後工作日_(end,1,允許週末); const loadDay=due;
    排程.push({排程ID:'SCH'+String(++sid).padStart(5,'0'),需求編號:id,工單號:'PK-'+id,工單類型:'PACK',產品編號:code,品名:name,需求數量:取(req,'需求數量'),排程數量:取(req,'需求數量'),產能8H:0,每日班數:shifts,OEE:oee,需天數:1,預計開始:packDay,預計完成:packDay,主機台:'包裝',人員班別:'待派班',前置依賴:'MO-'+id,CTB狀態:ctb,排程狀態:status==='可排'?'待排':status,備註:'包裝工單'});
    排程.push({排程ID:'SCH'+String(++sid).padStart(5,'0'),需求編號:id,工單號:'LD-'+id,工單類型:'LOAD',產品編號:code,品名:name,需求數量:取(req,'需求數量'),排程數量:取(req,'需求數量'),產能8H:0,每日班數:shifts,OEE:oee,需天數:1,預計開始:loadDay,預計完成:loadDay,主機台:'出貨',人員班別:'待派班',前置依賴:'PK-'+id,CTB狀態:ctb,排程狀態:status==='可排'?'待排':status,備註:'出貨裝載'});
    工單.push(工單列_('PK-'+id,id,'PACK','MO-'+id,code,name,取(req,'需求數量'),packDay,packDay,'包裝完成','否',status,'包裝'));
    工單.push(工單列_('LD-'+id,id,'LOAD','PK-'+id,code,name,取(req,'需求數量'),loadDay,loadDay,'出貨完成','否',status,'出貨裝載'));
  });
  補LR警示_(sorted,警示,LR規則);
  寫入物件陣列_(ss,'11_自動排程結果',排程,'replace');
  寫入物件陣列_(ss,'13_拆工單結果',工單,'replace');
  寫入物件陣列_(ss,'14_資源負荷甘特',甘特,'replace');
  寫入物件陣列_(ss,'15_排程警示',警示,'replace');
  寫入紀錄_(ss,'APS_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss'),'GAS_APS_V1','11_自動排程結果',排程.length,'完成','CTB/LR/換線/甘特');
  SpreadsheetApp.flush();
  return 成功_({訊息:'APS自動排程V1完成',排程筆數:排程.length,工單筆數:工單.length,甘特筆數:甘特.length,警示筆數:警示.length,資料庫網址:ss.getUrl()});
}

function 初始化APS參數_(ss){
  Object.keys(資料表欄位).forEach(n=>建立或校正分頁_(ss,n,資料表欄位[n]));
  if(讀表_(ss,'12_資源參數').length===0){寫入物件陣列_(ss,'12_資源參數',[{ '參數/資源ID':'每日班數','類型':'排程參數','名稱':'每日班數','可用量/數值':2,'單位':'班','適用產品/工站':'全部','啟用':'是','備註':'預設'},{'參數/資源ID':'OEE','類型':'排程參數','名稱':'OEE','可用量/數值':0.75,'單位':'比例','適用產品/工站':'全部','啟用':'是','備註':'Availability×Performance×Quality'}],'append')}
  if(讀表_(ss,'A1_工站機台能力').length===0){寫入物件陣列_(ss,'A1_工站機台能力',[{'產品關鍵字':'','工站':'預設加工','機台群組':'待工站主檔對應','主機台':'待工站主檔對應','每日班數':2,'OEE':0.75,'啟用':'是','備註':'未建立工站能力時使用'}],'append')}
  if(讀表_(ss,'A2_換線時間矩陣').length===0){寫入物件陣列_(ss,'A2_換線時間矩陣',[{'共用機台編號':'*','前產品工藝代碼':'*','後產品工藝代碼':'*','換線時間_分鐘':30,'啟用':'是','備註':'預設不同產品換線30分鐘'}],'append')}
}

function 讀取排程摘要_(){const ss=取得資料庫_必要時建立_();return 成功_({資料庫網址:ss.getUrl(),需求池:讀表_(ss,'10_排程需求池').length,排程結果:讀表_(ss,'11_自動排程結果').length,甘特:讀表_(ss,'14_資源負荷甘特').length,警示:讀表_(ss,'15_排程警示').length})}
function 建立父需求缺料索引_(bom,ctb){const red={};const bomMap={};bom.forEach(b=>{bomMap[取(b,'需求編號')]=取(b,'父需求編號')});ctb.forEach(c=>{if(取(c,'CTB狀態')==='紅燈'){const parent=bomMap[取(c,'需求編號')];if(parent)red[parent]=true}});return red}
function 分日甘特_(out,o){let d=new Date(o.start);let days=0;while(days<o.days){if(o.allowWeekend||![0,6].includes(d.getDay())){out.push({日期:fmt_(d),班別:'全部',資源類型:'機台',資源ID:o.machine,需求編號:o.id,工單號:'MO-'+o.id,產品編號:o.code,品名:o.name,工單類型:'PROD',排程數量:Math.ceil(o.qty/o.days),負荷小時:8*o.shifts,換線分鐘:days===0?o.setup:0,CTB狀態:o.ctb,狀態:o.status,備註:o.status==='缺料暫停'?'紅燈不排近期':'日負荷'});days++}d.setDate(d.getDate()+1)}}
function 找能力_(rows,req){const code=取(req,'產品編號'),name=取(req,'品名');let hit=rows.find(r=>取(r,'啟用')!=='否'&&取(r,'產品關鍵字')&&(code.includes(取(r,'產品關鍵字'))||name.includes(取(r,'產品關鍵字'))));return hit||rows.find(r=>取(r,'啟用')!=='否')||{}}
function 計算換線分鐘_(rows,machine,prev,next){if(!prev||prev===next)return 0;const hit=rows.find(r=>(取(r,'共用機台編號')===machine||取(r,'共用機台編號')==='*')&&(取(r,'前產品工藝代碼')===prev||取(r,'前產品工藝代碼')==='*')&&(取(r,'後產品工藝代碼')===next||取(r,'後產品工藝代碼')==='*')&&取(r,'啟用')!=='否');return Number(hit&&取(hit,'換線時間_分鐘')||30)}
function 找人員_(rows,station,machine){const hit=rows.find(r=>取(r,'啟用')!=='否'&&(取(r,'可工作工站').includes(station)||取(r,'可操作機台').includes(machine)));return hit?[取(hit,'姓名'),取(hit,'班別')].filter(Boolean).join('/'):'待派班'}
function 偵測LR_(req,rules){const code=取(req,'產品編號'),name=取(req,'品名');const explicit=rules.find(r=>取(r,'啟用')!=='否'&&(取(r,'L料號')===code||取(r,'R料號')===code));if(explicit)return{群組:取(explicit,'成套群組')};if(/\b(LH|RH|LEFT|RIGHT|L\/R)\b/i.test(name+code))return{群組:(name+code).replace(/LH|RH|LEFT|RIGHT|L\/R/ig,'LR')};return{群組:''}}
function 補LR警示_(reqs,warnings,rules){const group={};reqs.forEach(r=>{const p=偵測LR_(r,rules);if(p.群組){group[p.群組]=group[p.群組]||[];group[p.群組].push(r)}});Object.keys(group).forEach(g=>{if(group[g].length===1)warnings.push(警示列_('中',取(group[g][0],'需求編號'),取(group[g][0],'產品編號'),取(group[g][0],'品名'),'L/R成套不完整','偵測到單邊件，尚未找到配對需求','確認A4_LR成套規則或生產計劃表是否缺另一邊'))})}
function 警示列_(level,id,code,name,type,msg,sug){return{時間戳:new Date(),等級:level,需求編號:id,產品編號:code,品名:name,警示類型:type,警示內容:msg,處置建議:sug,狀態:'未處理'}}
function 工單列_(mo,id,type,parent,code,name,qty,start,end,last,inbound,status,note){return{工單號:mo,來源需求編號:id,工單類型:type,父工單號:parent,產品編號:code,品名:name,數量:qty,單位:'PC',預計開始:start,預計完成:end,最後工序:last,入庫觸發:inbound,狀態:status,備註:note}}
function 排序分數_(r){const tier=取(r,'急迫性');return (tier==='Tier 1'?10000:tier==='Tier 2'?5000:tier==='Tier 3'?1000:0)+Number(取(r,'還需加工量')||0)}
function 今日_(){return fmt_(new Date())} function fmt_(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd')}
function 倒推工作日_(date,days,weekend){let d=new Date(date),n=0;while(n<days){d.setDate(d.getDate()-1);if(weekend||![0,6].includes(d.getDay()))n++}return fmt_(d)}
function 往後工作日_(date,days,weekend){let d=new Date(date),n=0;while(n<days){d.setDate(d.getDate()+1);if(weekend||![0,6].includes(d.getDay()))n++}return fmt_(d)}
function 取日期_(r,k){return String(取(r,k)||'').slice(0,10)} function 最大數_(r,a,b){return Math.max(Number(取(r,a)||0),Number(取(r,b)||0),0)}
function 取(r,k){return r&&r[k]!=null?String(r[k]).trim():''}
function 讀表_(ss,name){const sh=ss.getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];const v=sh.getDataRange().getValues();const h=v.shift().map(String);return v.filter(row=>row.some(x=>x!==''&&x!=null)).map(row=>{const o={};h.forEach((k,i)=>o[k]=row[i]);return o})}
function 取表資料_(tables,key){if(!tables)return null;if(Array.isArray(tables[key]))return tables[key];const a={'BOM明細':['BOM明細','02_BOM明細主檔'],'每日明細':['每日明細','05_計劃每日明細'],'本月彙總':['本月彙總','06_本月彙總'],'出貨訂單':['出貨訂單','07_出貨訂單'],'BOM需求展開':['BOM需求展開','08_BOM需求展開'],'CTB齊套檢查':['CTB齊套檢查','09_CTB齊套檢查'],'排程需求池':['排程需求池','10_排程需求池'],'自動排程結果':['自動排程結果','11_自動排程結果'],'拆工單結果':['拆工單結果','13_拆工單結果']}[key]||[key];for(let i=0;i<a.length;i++)if(Array.isArray(tables[a[i]]))return tables[a[i]];return null}
function 寫入物件陣列_(ss,name,rows,mode){const h=資料表欄位[name];const sh=建立或校正分頁_(ss,name,h);if(mode==='replace'&&sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();if(!rows.length)return 0;const vals=rows.map(r=>h.map(k=>轉值_(r[k])));sh.getRange(Math.max(sh.getLastRow()+1,2),1,vals.length,h.length).setValues(vals);return vals.length}
function 轉值_(v){if(v==null)return'';if(typeof v==='object')return JSON.stringify(v);return v}
function 清空指定分頁_(name){if(!name||!資料表欄位[name])return 失敗_('分頁不存在或不可清空：'+name);const ss=取得資料庫_必要時建立_();const sh=建立或校正分頁_(ss,name,資料表欄位[name]);if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();return 成功_({訊息:'已清空：'+name})}
function 取得資料庫_必要時建立_(){const props=PropertiesService.getScriptProperties();let id=props.getProperty(屬性_資料庫ID);if(id){try{return SpreadsheetApp.openById(id)}catch(e){props.deleteProperty(屬性_資料庫ID)}}try{const active=SpreadsheetApp.getActiveSpreadsheet();if(active){props.setProperty(屬性_資料庫ID,active.getId());return active}}catch(e){}const ss=SpreadsheetApp.create(系統名稱+'_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss'));props.setProperty(屬性_資料庫ID,ss.getId());return ss}
function 取得資料庫ID_不建立(){return PropertiesService.getScriptProperties().getProperty(屬性_資料庫ID)||''}
function 建立或校正分頁_(ss,name,headers){let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getMaxColumns()<headers.length)sh.insertColumnsAfter(sh.getMaxColumns(),headers.length-sh.getMaxColumns());sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0b3a75').setFontColor('#ffffff');sh.setFrozenRows(1);return sh}
function 寫入系統設定_(ss){const sh=建立或校正分頁_(ss,'00_系統設定',資料表欄位['00_系統設定']);const data=[['系統名稱',系統名稱,'中央資料庫名稱',new Date()],['資料庫ID',ss.getId(),'Google Sheets ID',new Date()],['版本',系統版本,'APS獨立版',new Date()],['預設寫入模式','replace','PWA每次上傳以快照取代',new Date()]];if(sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();sh.getRange(2,1,data.length,data[0].length).setValues(data)}
function 寫入紀錄_(ss,batch,source,sheet,count,status,note){建立或校正分頁_(ss,'00_寫入紀錄',資料表欄位['00_寫入紀錄']).appendRow([new Date(),batch,source,sheet,count,status,note||''])}
function 更新BOM檢查清單_(ss){const rows=讀表_(ss,'02_BOM明細主檔').length;寫入物件陣列_(ss,'91_BOM檢查清單',[{檢查項目:'BOM明細筆數',狀態:rows>0?'OK':'警告',筆數:rows,說明:'02_BOM明細主檔資料列數',最後更新:new Date()}],'replace')}
function 解析請求_(e){if(!e||!e.postData||!e.postData.contents)return e&&e.parameter?e.parameter:{};const raw=e.postData.contents;try{return JSON.parse(raw)}catch(err){}const p=e.parameter||{};if(p.payload)return JSON.parse(p.payload);throw new Error('無法解析請求內容，請使用 JSON POST。')}
function 成功_(o){o=o||{};o.ok=true;o.success=true;o.成功=true;return o} function 失敗_(err){const m=String(err&&err.message||err||'未知錯誤');return{ok:false,success:false,成功:false,錯誤:m,error:m}}
function 輸出JSON_(obj,cb){const t=JSON.stringify(obj);if(cb)return ContentService.createTextOutput(String(cb)+'('+t+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.JSON)}
