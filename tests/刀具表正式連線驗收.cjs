const 測試 = require('node:test');
const 斷言 = require('node:assert/strict');
const 虛擬機 = require('node:vm');
const 檔案 = require('node:fs');
const 路徑 = require('node:path');
const 程式 = 檔案.readFileSync(路徑.join(__dirname,'../smart-factory-command-center/01_GAS後端/刀具表正式資料連線.gs'),'utf8');
function 環境() {
  const 分頁 = new Map(); let 故障表 = '', 已故障 = false;
  class 表格 {
    constructor(名,值){this.名=名;this.值=值;}
    getLastRow(){let n=this.值.length;while(n && !this.值[n-1].some(v=>v!==''))n--;return n;}
    getLastColumn(){return Math.max(1,...this.值.map(r=>r.length));}
    getMaxRows(){return 10000;} getMaxColumns(){return 30;}
    getDataRange(){return this.getRange(1,1,Math.max(this.getLastRow(),1),this.getLastColumn());}
    getRange(r,c,n=1,m=1){const 表=this;return {
      getValues(){return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>表.值[r+i-1]?.[c+j-1]??''));},
      setValues(值){if(故障表===表.名&&!已故障){已故障=true;throw Error('注入寫入失敗');}值.forEach((列,i)=>列.forEach((v,j)=>{表.值[r+i-1]??=[];表.值[r+i-1][c+j-1]=v;}));},
      clearContent(){for(let i=r-1;i<r+n-1;i++)for(let j=c-1;j<c+m-1;j++)if(表.值[i])表.值[i][j]='';}
    };}
  }
  const 主庫={getSheetByName:n=>分頁.get(n)||null,insertSheet(n){const s=new 表格(n,[['']]);分頁.set(n,s);return s;},deleteSheet:s=>分頁.delete(s.名)};
  const 上下文={console,SpreadsheetApp:{openById(id){斷言.equal(id,'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8');return 主庫;},flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput(字){return {字,setMimeType(){return this;},getContent(){return this.字;}};}}};
  虛擬機.createContext(上下文);虛擬機.runInContext(程式,上下文);
  分頁.set('刀具表_索引',new 表格('刀具表_索引',[Array.from(上下文.刀具表索引欄位_)]));
  分頁.set('刀具表_明細',new 表格('刀具表_明細',[Array.from(上下文.刀具表明細欄位_)]));
  return {上下文,分頁,故障(n){故障表=n;},呼叫(api,方法='GET',資料={}){return JSON.parse(上下文.刀具表正式接收_({parameter:{api,...資料}},方法).getContent());}};
}
function 資料(修改={}){return {刀具表ID:'T123',分頁名稱:'5279_OP10',快照:{type:1,partName:'5279',tools:[],_formalRevision:'R1'},基本:{品名:'5279'},明細:[{刀號:'T01',N工序:'N1',照片URL:''}],...修改};}
測試('一般 LINE／報工請求不被接手；GET 不可寫入',()=>{const e=環境();斷言.equal(e.上下文.刀具表正式接收_({parameter:{action:'appendRow'}},'POST'),null);斷言.equal(e.呼叫('刀具表_儲存').成功,false);斷言.equal(e.分頁.size,2);});
測試('空庫成功回傳零筆；僅載入已登記刀具表',()=>{const e=環境();斷言.equal(e.呼叫('刀具表_清單').資料.length,0);斷言.equal(e.呼叫('刀具表_載入','GET',{分頁名稱:'01_人員主檔'}).成功,false);});
測試('同一刀具表重送與修改只保留一筆索引及最新明細',()=>{const e=環境();e.上下文.刀具表正式儲存_(資料());e.上下文.刀具表正式儲存_(資料({明細:[{刀號:'T02'}]}));斷言.equal(e.呼叫('刀具表_清單').資料.length,1);const r=e.呼叫('刀具表_載入','GET',{分頁名稱:'5279_OP10'});斷言.equal(r.資料.length,2);斷言.equal(r.資料[1].刀號,'T02');});
測試('同名其他刀具表／正式分頁不可覆寫',()=>{const e=環境();e.上下文.刀具表正式儲存_(資料());斷言.throws(()=>e.上下文.刀具表正式儲存_(資料({刀具表ID:'T999'})),/同名/);斷言.throws(()=>e.上下文.刀具表正式儲存_(資料({分頁名稱:'01_人員主檔'})),/保留名稱/);e.分頁.set('BODY_OP20',{getLastColumn:()=>1,getRange:()=>({getValues:()=>[['既有製造資料']]}) ,getDataRange:()=>({getValues:()=>[['既有製造資料'],['不可覆寫']]})});斷言.throws(()=>e.上下文.刀具表正式儲存_(資料({分頁名稱:'BODY_OP20'})),/阻止覆寫/);});
測試('跨表寫入失敗會還原並移除尚未完成的新產品表',()=>{const e=環境();e.故障('刀具表_索引');斷言.throws(()=>e.上下文.刀具表正式儲存_(資料()),/注入寫入失敗/);斷言.equal(e.呼叫('刀具表_清單').資料.length,0);斷言.equal(e.分頁.get('刀具表_明細').getLastRow(),1);斷言.equal(e.分頁.has('5279_OP10'),false);});
測試('超長內容與非法回呼被拒絕；欄位防止公式執行',()=>{const e=環境();斷言.throws(()=>e.上下文.刀具表正式儲存_(資料({快照:{type:1,x:'x'.repeat(46000)}})),/過長/);const r=e.上下文.刀具表正式接收_({parameter:{api:'刀具表_狀態',callback:'x);alert(1)//'}},'GET').getContent();斷言.equal(JSON.parse(r).成功,false);斷言.equal(e.上下文.刀具表純文字_('=IMPORTXML("x")'),"'=IMPORTXML(\"x\")");});
