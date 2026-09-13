// 不連線 Google：兩個合成資料庫故意放同名分頁，防止讀到舊庫仍被判成功。
const 測試 = require('node:test');
const 斷言 = require('node:assert/strict');
const 檔案 = require('node:fs');
const 路徑 = require('node:path');
const 虛擬機 = require('node:vm');
const 根目錄 = 路徑.resolve(__dirname,'..');
const 入口文字 = 檔案.readFileSync(路徑.join(根目錄,'smart-factory-command-center/01_GAS後端/GAS_後端入口.gs'),'utf8');
const 正式庫 = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
const 舊共用庫 = '1RCTepxN0PMDwJp5HMBEQtVl6R6ynUP4UVaVPcPhFoq0';
const 正式列 = ['驗收-合成最新','更新驗收通過','合成資料','2026-09-11T00:00:00.000Z'];
function 建立環境(選項={}) {
  const 開啟紀錄=[];
  const 欄位=['驗收編號','狀態','備註','更新時間'];
  const 環境=虛擬機.createContext({Date,
    SpreadsheetApp:{openById(編號){
      開啟紀錄.push(編號);
      斷言.ok([正式庫,舊共用庫].includes(編號));
      return {getSheetByName(名稱){
        if (選項.正式缺分頁 && 編號===正式庫) return null;
        const 矩陣=編號===正式庫
          ? [欄位,...(選項.正式空表?[]:[正式列])]
          : [欄位,['驗收-舊庫紀錄','舊狀態','舊資料','舊時間']];
        return {getLastRow:()=>矩陣.length,getLastColumn:()=>4,
          getRange:(列,欄,列數,欄數)=>({getValues:()=>矩陣.slice(列-1,列-1+列數).map(值=>值.slice(欄-1,欄-1+欄數))})};
      }};
    }}
  });
  虛擬機.runInContext(入口文字,環境);
  return {環境,開啟紀錄,讀取:參數=>環境.主檔_API路由(Object.assign({api:'讀取分頁資料',分頁名稱:'5S_連線驗收'},參數))};
}
測試('5S 讀取與正式寫入使用同庫，不被同名舊分頁誤導',()=>{
  const {讀取,開啟紀錄}=建立環境();
  const 結果=讀取({spreadsheetId:正式庫,試算表識別碼:正式庫,sheet:'5S_連線驗收',sheetName:'5S_連線驗收'});
  斷言.equal(結果.成功,true);
  斷言.equal(結果.主庫ID,正式庫);
  斷言.equal(結果.讀取版本,'1.3.9.3');
  斷言.equal(結果.資料.length,1);
  斷言.equal(結果.資料[0].驗收編號,正式列[0]);
  斷言.deepEqual(開啟紀錄,[正式庫]);
});
測試('省略主庫參數仍讀正式庫，兩種錯庫參數都拒收',()=>{
  const 正常=建立環境();
  斷言.equal(正常.讀取().主庫ID,正式庫);
  for(const 鍵 of ['spreadsheetId','試算表識別碼']) {
    const {讀取,開啟紀錄}=建立環境();
    斷言.equal(讀取({[鍵]:舊共用庫}).成功,false);
    斷言.deepEqual(開啟紀錄,[]);
  }
});
測試('分頁別名衝突停止讀取',()=>{
  const {讀取,開啟紀錄}=建立環境();
  斷言.equal(讀取({sheet:'5S_其他分頁'}).成功,false);
  斷言.deepEqual(開啟紀錄,[]);
});
測試('正式分頁缺少或空表不會回頭讀舊庫',()=>{
  const 缺表=建立環境({正式缺分頁:true});
  斷言.equal(缺表.讀取().成功,false);
  斷言.deepEqual(缺表.開啟紀錄,[正式庫]);
  const 空表=建立環境({正式空表:true});
  const 結果=空表.讀取();
  斷言.equal(結果.成功,true);
  斷言.equal(結果.主庫ID,正式庫);
  斷言.equal(結果.資料.length,0);
  斷言.deepEqual(空表.開啟紀錄,[正式庫]);
});
測試('其他分頁維持既有共用連線及回傳內容',()=>{
  const {讀取,開啟紀錄}=建立環境();
  const 結果=讀取({分頁名稱:'01_人員主檔'});
  斷言.equal(結果.成功,true);
  斷言.equal(結果.資料[0].驗收編號,'驗收-舊庫紀錄');
  斷言.deepEqual(開啟紀錄,[舊共用庫]);
});
