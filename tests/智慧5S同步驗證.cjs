// 僅使用合成資料及記憶體替身；不連 Google、不讀取手機資料。
const 測試 = require('node:test');
const 斷言 = require('node:assert/strict');
const 檔案 = require('node:fs');
const 路徑 = require('node:path');
const 虛擬機 = require('node:vm');
const 根目錄 = 路徑.resolve(__dirname, '..');
const 後端文字 = 檔案.readFileSync(路徑.join(根目錄,'smart-factory-command-center/01_GAS後端/智慧5S_POST寫入修復_v1390.gs'),'utf8');
const 前端文字 = 檔案.readFileSync(路徑.join(根目錄,'docs/5s/智慧5S資料庫.js'),'utf8');
const 正式主庫 = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
const 複製 = 值 => structuredClone(值);

class 模擬分頁 {
  constructor(欄位, 資料列=[]) { this.列=[欄位,...資料列]; this.公式={}; this.寫入次數=0; }
  getLastColumn() { return this.列[0].length; }
  getLastRow() { return this.列.length; }
  getMaxRows() { return 1000; }
  getRange(列號, 欄號, 列數=1, 欄數=1) {
    const 表=this;
    return {
      getRow:()=>列號,
      getValues:()=>Array.from({length:列數},(_,列)=>Array.from({length:欄數},(_,欄)=>表.列[列號+列-1]?.[欄號+欄-1]??'')),
      getDisplayValues() { return this.getValues().map(列=>列.map(String)); },
      getFormulas:()=>Array.from({length:列數},(_,列)=>Array.from({length:欄數},(_,欄)=>表.公式[`${列號+列}:${欄號+欄}`]||'')),
      setValues(矩陣) {
        表.寫入次數++;
        矩陣.forEach((列,列序)=>列.forEach((值,欄序)=>{
          const 序=列號+列序-1, 欄=欄號+欄序-1, 鍵=`${序+1}:${欄+1}`;
          表.列[序] ||= [];
          delete 表.公式[鍵];
          if (typeof 值==='string' && 值.startsWith("'")) 值=值.slice(1);
          else if (typeof 值==='string' && 值.startsWith('=')) { 表.公式[鍵]=值; 值=3; }
          表.列[序][欄]=值;
        }));
      },
      createTextFinder(文字) {
        const 搜尋={
          useRegularExpression(值) { 斷言.equal(值,false); return this; },
          matchEntireCell(值) { 斷言.equal(值,true); return this; },
          matchCase(值) { 斷言.equal(值,true); return this; },
          findAll() {
            const 結果=[];
            for(let 序=0;序<列數;序++) if(String(表.列[列號+序-1]?.[欄號-1]??'')===文字) 結果.push({getRow:()=>列號+序});
            return 結果;
          }
        };
        return 搜尋;
      }
    };
  }
}

function 建立後端() {
  const 分頁=new 模擬分頁(['巡檢單號','狀態','備註','合計']);
  let 持鎖=false;
  const 環境=虛擬機.createContext({Date,console,
    LockService:{getScriptLock:()=>({waitLock:()=>{if(持鎖)throw Error('鎖忙碌');持鎖=true;},releaseLock:()=>{持鎖=false;}})},
    SpreadsheetApp:{openById:編號=>{斷言.equal(編號,正式主庫);return {getSheetByName:名稱=>名稱==='5S_巡檢主檔'?分頁:null};},flush:()=>{}}
  });
  虛擬機.runInContext(後端文字,環境);
  return {分頁,環境,接收:請求=>環境.智慧5S_POST通用接收_(請求)};
}
function 請求(識別碼='合成-001',備註='合成測試資料') {
  return {action:'appendRow',spreadsheetId:正式主庫,sheet:'5S_巡檢主檔',headers:['巡檢單號','狀態','備註'],values:[識別碼,'待處理',備註]};
}
function 工作(序) {
  const 參數=請求('合成-'+String(序).padStart(3,'0'));
  return {工作類型:'新增',分頁名稱:參數.sheet,欄位:參數.headers,值:參數.values,
    本機識別碼:'本機-'+序,建立時間:'2026-09-09T00:00:00.000Z',嘗試次數:2,最後錯誤:'先前連線失敗'};
}

function 建立本機儲存(既有工作=[]) {
  const 資料=new Map(既有工作.map(工作=>[工作.本機識別碼,複製(工作)]));
  let 升級次數=0;
  return {資料,get 升級次數(){return 升級次數;},介面:{
    open(名稱,版本) {
      斷言.equal(名稱,'智慧5S本機資料庫');斷言.equal(版本,1);
      const 請求={};
      setTimeout(()=>請求.onsuccess({target:{result:{
        createObjectStore(){升級次數++;throw Error('不得重建既有資料表');},
        transaction(表名,模式){
          斷言.equal(表名,'待同步佇列');
          const 交易={objectStore:()=>({
            put(工作){斷言.equal(模式,'readwrite');資料.set(工作.本機識別碼,複製(工作));setTimeout(()=>交易.oncomplete?.(),0);},
            delete(識別碼){斷言.equal(模式,'readwrite');資料.delete(識別碼);setTimeout(()=>交易.oncomplete?.(),0);},
            getAll(){const 讀取={};setTimeout(()=>{讀取.result=[...資料.values()].map(複製);讀取.onsuccess();},0);return 讀取;}
          })};return 交易;
        }
      }}}),0);
      return 請求;
    }
  }};
}
function 建立前端(儲存,抓取) {
  const 視窗={智慧5S設定:{試算表識別碼:正式主庫,後端網址:'https://example.invalid/exec',請求逾時毫秒:2000}};
  const 環境=虛擬機.createContext({window:視窗,navigator:{onLine:true},indexedDB:儲存.介面,
    localStorage:{getItem:()=>''},crypto:require('node:crypto').webcrypto,fetch:抓取,
    AbortController,setTimeout,clearTimeout,URL,console});
  虛擬機.runInContext(前端文字,環境);
  return 視窗.智慧5S資料庫;
}
const 回應=資料=>({ok:true,status:200,text:async()=>JSON.stringify(資料)});

測試('新增與相同內容重送只寫一列，保留同一收據',()=>{
  const 後端=建立後端(), 參數=請求();
  const 首次=後端.接收({postData:{contents:JSON.stringify(參數)}}), 重送=後端.接收(參數);
  斷言.equal(首次.成功,true);斷言.equal(重送.重複請求,true);
  斷言.equal(重送.rowNumber,首次.rowNumber);斷言.equal(後端.分頁.寫入次數,1);
});
測試('相同主鍵內容衝突不得回覆成功或覆寫',()=>{
  const 後端=建立後端();後端.接收(請求());
  const 結果=後端.接收(請求('合成-001','不同內容'));
  斷言.equal(結果.成功,false);斷言.match(結果.訊息,/不同內容/);斷言.equal(後端.分頁.寫入次數,1);
});
測試('更新以主鍵找到資料，忽略過時列號且保留其他公式',()=>{
  const 後端=建立後端();後端.接收(請求());
  後端.分頁.getRange(2,4).setValues([['=SUM(1,2)']]);
  const 結果=後端.接收({action:'updateRow',sheet:'5S_巡檢主檔',rowNumber:9999,headers:['巡檢單號','狀態'],values:['合成-001','已更新']});
  斷言.equal(結果.成功,true);斷言.equal(結果.rowNumber,2);
  斷言.equal(後端.分頁.列[1][2],'合成測試資料');斷言.equal(後端.分頁.公式['2:4'],'=SUM(1,2)');
});
測試('更新缺少主鍵、主鍵不存在或主鍵重複皆不誤寫',()=>{
  const 後端=建立後端();後端.接收(請求());
  const 基本={action:'updateRow',sheet:'5S_巡檢主檔',rowNumber:2,headers:['狀態'],values:['已更新']};
  斷言.equal(後端.接收(基本).成功,false);
  斷言.equal(後端.接收({...請求('不存在'),action:'updateRow'}).成功,false);
  後端.分頁.列.push([...後端.分頁.列[1]]);
  斷言.equal(後端.接收({...請求(),action:'updateRow'}).成功,false);斷言.equal(後端.分頁.寫入次數,1);
});
測試('LINE、報工及非 5S 新增仍交回原路由',()=>{
  const 後端=建立後端();
  斷言.equal(後端.接收({events:[]}),null);
  斷言.equal(後端.接收({postData:{contents:JSON.stringify({events:[]})}}),null);
  斷言.equal(後端.接收({...請求(),sheet:'09_報工'}),null);
  斷言.equal(後端.接收({parameter:{action:'查詢報工V4對接',payload:'{}'}}),null);
  斷言.equal(後端.分頁.寫入次數,0);
});
測試('api 與中文動作相容，明確失敗不可被成功包裝掩蓋',()=>{
  const 後端=建立後端();const 參數=請求();delete 參數.action;參數.api='新增分頁資料';
  斷言.equal(後端.接收(參數).成功,true);
  後端.環境.智慧5S_嘗試處理動作_=參數=>{斷言.equal(參數.action,'智慧5S_測試');return {成功:false,訊息:'未成功'};};
  const 結果=後端.接收({api:'智慧5S_測試'});斷言.equal(結果.ok,false);斷言.equal(結果.success,false);
});
測試('錯庫、分頁參數衝突、錯欄及資料長度不符均不寫入',()=>{
  const 後端=建立後端();
  for(const 參數 of [{...請求(),試算表識別碼:'錯庫'},{...請求(),sheetName:'5S_其他'},
    {...請求(),headers:['巡檢單號','不存在'],values:['合成-001','值']},
    {...請求(),values:['合成-001']},{...請求(),headers:['巡檢單號','巡檢單號','備註']}]) {
    斷言.equal(後端.接收(參數).成功,false);
  }
  斷言.equal(後端.分頁.寫入次數,0);
});
測試('公式字串寫為純文字；重送判定一致；過長欄位拒收',()=>{
  const 後端=建立後端();const 參數=請求('合成-001','=IMPORTDATA("https://example.invalid")');
  斷言.equal(後端.接收(參數).成功,true);斷言.equal(後端.接收(參數).重複請求,true);
  斷言.equal(後端.分頁.公式['2:3'],undefined);
  斷言.equal(後端.接收(請求('合成-002','字'.repeat(45001))).成功,false);
});
測試('合成的 56 筆舊佇列完整同步，無資料庫升級及重複列',async()=>{
  const 後端=建立後端(), 儲存=建立本機儲存(Array.from({length:56},(_,序)=>工作(序)));
  const 前端=建立前端(儲存,async(_,選項)=>回應(後端.接收({postData:{contents:選項.body}})));
  const 結果=await 前端.同步佇列();
  斷言.deepEqual(JSON.parse(JSON.stringify(結果)),{成功:56,失敗:0,剩餘:0});
  斷言.equal(後端.分頁.寫入次數,56);斷言.equal(儲存.升級次數,0);
});
測試('錯誤及不相符收據保留完整原始工作，重新載入仍存在',async()=>{
  const 原始=工作(1),儲存=建立本機儲存([原始]);
  const 前端=建立前端(儲存,async()=>回應({已接收:true}));
  const 結果=await 前端.同步佇列();斷言.equal(結果.剩餘,1);斷言.equal(結果.成功,0);
  const 重開=建立前端(儲存,async()=>{throw Error('Failed to fetch');});
  const 保留=(await 重開.佇列全部())[0];
  斷言.deepEqual(保留.值,原始.值);斷言.equal(保留.本機識別碼,原始.本機識別碼);斷言.equal(保留.嘗試次數,3);
});
測試('伺服器已寫入但回覆遺失：重送一筆且不重複',async()=>{
  const 後端=建立後端(),儲存=建立本機儲存([工作(1)]);let 首次=true;
  const 前端=建立前端(儲存,async(_,選項)=>{
    const 結果=後端.接收({postData:{contents:選項.body}});
    if(首次){首次=false;throw Object.assign(Error('timeout'),{name:'AbortError'});}return 回應(結果);
  });
  斷言.equal((await 前端.同步佇列()).剩餘,1);
  斷言.equal((await 前端.同步佇列()).成功,1);
  斷言.equal(後端.分頁.寫入次數,1);斷言.equal(儲存.資料.size,0);
});
測試('新工作先保存，網路錯誤後仍能重送',async()=>{
  const 儲存=建立本機儲存();const 前端=建立前端(儲存,async()=>{
    斷言.equal(儲存.資料.size,1);throw Error('Failed to fetch');
  });
  const 結果=await 前端.送出或排隊(工作(1));
  斷言.equal(結果.已排隊,true);斷言.equal(結果.已同步,false);斷言.equal((await 前端.佇列全部()).length,1);
});
測試('連點同步只執行一次，部分失敗只移除成功項目',async()=>{
  const 後端=建立後端(),儲存=建立本機儲存([工作(1),工作(2),工作(3)]);let 次數=0;
  const 前端=建立前端(儲存,async(_,選項)=>{次數++;const 參數=JSON.parse(選項.body);
    return 回應(參數.values[0]==='合成-002'?{success:false}:後端.接收(參數));});
  const 結果=await Promise.all([前端.同步佇列(),前端.同步佇列()]);
  斷言.equal(次數,3);斷言.equal(結果[0].成功,2);斷言.equal(結果[1].剩餘,1);
  斷言.deepEqual([...儲存.資料.keys()],['本機-2']);
});
測試('錯庫、錯動作、錯主鍵、HTTP 錯誤及字串成功旗標不可清除佇列',async()=>{
  const 修改=[回覆=>({...回覆,主庫ID:'其他庫'}),回覆=>({...回覆,action:'updateRow'}),
    回覆=>({...回覆,主鍵值:'其他單號'}),回覆=>({...回覆,成功:'true'}),回覆=>({...回覆,rowNumber:'2'})];
  for(const 改 of 修改){
    const 後端=建立後端(),儲存=建立本機儲存([工作(1)]);
    const 前端=建立前端(儲存,async(_,選項)=>回應(改(後端.接收(JSON.parse(選項.body)))));
    斷言.equal((await 前端.同步佇列()).剩餘,1);
  }
  const 儲存=建立本機儲存([工作(1)]), 後端=建立後端();
  const 前端=建立前端(儲存,async(_,選項)=>({...回應(後端.接收(JSON.parse(選項.body))),ok:false,status:503}));
  斷言.equal((await 前端.同步佇列()).剩餘,1);
});
測試('新版離線服務啟用不刪快取，優先使用本版資源',async()=>{
  const 程式=檔案.readFileSync(路徑.join(根目錄,'docs/5s/離線服務.js'),'utf8');
  const 事件={};let 接管=0;
  const 環境=虛擬機.createContext({self:{addEventListener:(名,函式)=>事件[名]=函式,clients:{claim:async()=>{接管++;}}},
    caches:{open:async()=>({match:async()=>({版本:'本版'})}),match:async()=>{throw Error('不應先取舊版');},delete:()=>{throw Error('不得清除快取');}}});
  虛擬機.runInContext(程式,環境);
  await new Promise(完成=>事件.activate({waitUntil:程序=>程序.then(完成)}));
  斷言.equal(接管,1);斷言.equal((await 環境.取得快取回應('設定.js')).版本,'本版');
});
