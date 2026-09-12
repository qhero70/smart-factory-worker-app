// 合成資料驗證完整 doGet → ContentService → 瀏覽器回呼；不連外、不碰手機資料。
const 測試=require('node:test');
const 斷言=require('node:assert/strict');
const 檔案=require('node:fs');
const 路徑=require('node:path');
const 虛擬機=require('node:vm');
const 根目錄=路徑.resolve(__dirname,'..');
const 入口=檔案.readFileSync(路徑.join(根目錄,'smart-factory-command-center/01_GAS後端/GAS_後端入口.gs'),'utf8');
const 手機程式=檔案.readFileSync(路徑.join(根目錄,'docs/5s/智慧5S資料庫.js'),'utf8');
const 正式庫='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
const 測試參數={api:'讀取分頁資料',sheetName:'5S_連線驗收',spreadsheetId:正式庫};
function 建立環境() {
  const 表格=[['驗收編號','狀態','備註','更新時間'],
    ['驗收-回呼測試','更新驗收通過','</script>合成資料\u2028\u2029','2026-09-11T06:30:00.000Z']];
  let 其他輸出次數=0;
  const 環境=虛擬機.createContext({Date,
    ContentService:{MimeType:{JSON:'application/json',JAVASCRIPT:'application/javascript'},
      createTextOutput(文字){return {getContent:()=>文字,setMimeType(格式){this.格式=格式;return this;}};}},
    智慧5S_iOS_JSONP輸出_(){其他輸出次數++;return {getContent:()=> '原共用輸出'};},
    SpreadsheetApp:{openById:()=>({getSheetByName:()=>({
      getLastRow:()=>表格.length,getLastColumn:()=>4,
      getRange:(列,欄,列數,欄數)=>({getValues:()=>表格.slice(列-1,列-1+列數).map(值=>值.slice(欄-1,欄-1+欄數))})
    })})}
  });
  虛擬機.runInContext(入口,環境);
  return {環境,表格,get 其他輸出次數(){return 其他輸出次數;},
    讀取:參數=>環境.doGet({parameter:Object.assign({},測試參數,參數)})};
}
測試('完整 doGet 精確呼叫指定函式一次，資料與特殊字元完整保留',()=>{
  const 測試環境=建立環境();
  const 回應=測試環境.讀取({callback:'smart5s_verify_1391'});
  斷言.equal(回應.格式,'application/javascript');
  const 收到=[];
  虛擬機.runInNewContext(回應.getContent(),{smart5s_verify_1391:資料=>收到.push(資料)});
  斷言.equal(收到.length,1);
  斷言.equal(收到[0].資料[0].備註,測試環境.表格[1][2]);
  斷言.equal(收到[0].主庫ID,正式庫);
  斷言.equal(測試環境.其他輸出次數,0);
});
測試('沒有回呼時保留一般 JSON 讀取',()=>{
  const 回應=建立環境().讀取();
  斷言.equal(回應.格式,'application/json');
  斷言.equal(JSON.parse(回應.getContent()).資料[0].驗收編號,'驗收-回呼測試');
});
測試('非法回呼與互相矛盾的回呼參數拒絕執行',()=>{
  for(const 參數 of [{callback:'bad);throw new Error(1)//'}, {callback:'a',回呼:'b'}]) {
    const 回應=建立環境().讀取(參數);
    斷言.equal(回應.格式,'application/json');
    const 資料=JSON.parse(回應.getContent());
    斷言.equal(資料.成功,false);斷言.equal(資料.ok,false);斷言.equal(資料.success,false);
  }
});
測試('錯庫拒收及 TextOutput 的失敗結果不被包裝為成功',()=>{
  const 測試環境=建立環境();
  const 回應=測試環境.讀取({spreadsheetId:'錯誤主庫',callback:'check_error'});
  let 收到;
  虛擬機.runInNewContext(回應.getContent(),{check_error:資料=>{收到=資料;}});
  斷言.equal(收到.成功,false);
  const 第二=測試環境.環境.主檔_智慧5S讀取輸出_({getContent:()=>'{"成功":false,"訊息":"合成失敗"}'},{callback:'check_error'});
  虛擬機.runInNewContext(第二.getContent(),{check_error:資料=>{收到=資料;}});
  斷言.equal(收到.成功,false);斷言.equal(收到.訊息,'合成失敗');
});
測試('其他 API 維持原輸出函式',()=>{
  const 測試環境=建立環境();
  const 回應=測試環境.讀取({api:'取得人員清單',sheetName:'01_人員主檔',callback:'other_callback'});
  斷言.equal(回應.getContent(),'原共用輸出');
  斷言.equal(測試環境.其他輸出次數,1);
});
for (const 使用保護回呼 of [false,true]) {
測試('原 PWA 一般網路讀取失敗後，透過真正的 doGet '+(使用保護回呼?'及保護回呼':'直接回呼')+'讀回資料並清理腳本',async()=>{
  const 後端=建立環境();
  let 腳本數=0,清除數=0,一般請求數=0;
  const 手機=虛擬機.createContext({URL,AbortController,setTimeout,clearTimeout,
    navigator:{onLine:true},localStorage:{getItem:()=>''},
    智慧5S設定:{後端網址:'https://example.invalid/exec',試算表識別碼:正式庫,請求逾時毫秒:1000,讀取上限:10},
    fetch:async()=>{一般請求數++;throw new TypeError('Failed to fetch');}
  });
  手機.window=手機;
  手機.document={createElement:()=>({}),head:{
    removeChild(元素){清除數++;元素.parentNode=null;},
    appendChild(元素){
      腳本數++;元素.parentNode=this;
      const 參數=Object.fromEntries(new URL(元素.src).searchParams);
      斷言.match(參數.callback,/^smart5s_jsonp_/);
      const 回應=後端.環境.doGet({parameter:參數});
      斷言.equal(回應.格式,'application/javascript');
      const 文字=使用保護回呼 ? '/**/typeof '+參數.callback+" === 'function' && "+回應.getContent() : 回應.getContent();
      虛擬機.runInContext(文字,手機);
    }
  }};
  虛擬機.runInContext(手機程式,手機);
  const 結果=await 手機.智慧5S資料庫.讀取分頁('5S_連線驗收',10);
  斷言.equal(結果.資料[0].驗收編號,'驗收-回呼測試');
  斷言.equal(一般請求數,1);斷言.equal(腳本數,1);斷言.equal(清除數,1);
  斷言.equal(Object.keys(手機).filter(鍵=>鍵.startsWith('smart5s_jsonp_')).length,0);
});
}
