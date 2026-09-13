// 回覆只在本機測試引擎驗證等價性；正式驗收解析器不執行回覆程式。
const 測試=require('node:test');
const 斷言=require('node:assert/strict');
const 檔案=require('node:fs');
const 路徑=require('node:path');
const 虛擬機=require('node:vm');
const 原碼=檔案.readFileSync(路徑.join(__dirname,'../smart-factory-command-center/01_GAS後端/智慧5S_正式部署驗收_v1391.gs'),'utf8');
const 環境=虛擬機.createContext({});
虛擬機.runInContext(原碼,環境);
const 回呼='smart5s_verify_1391';
const 資料={成功:true,資料:[{驗收編號:'驗收-合成',備註:'括號 ); /* 註解 */ \\ 引號 " 與 Unicode \u2028\u2029'}]};
const 內容=JSON.stringify(資料);
const 直接=回呼+'('+內容+');';
const 保護='/**/typeof '+回呼+" === 'function' && "+直接;
const 解析=(文字,名稱=回呼)=>環境.智慧5S驗收解析JSONP_(文字,名稱);
測試('以診斷線索重現：前導註解＋typeof 保護只增加 49 字元，舊字首檢查會拒絕',()=>{
  斷言.equal(保護.length-直接.length,49);
  斷言.equal(保護.startsWith(回呼+'('),false);
  const 結果=解析(保護);
  斷言.equal(結果.外框,'函式存在保護回呼');斷言.equal(結果.前導註解數,1);
  斷言.equal(JSON.stringify(結果.資料),內容);
});
測試('直接和受保護回呼在本機瀏覽器語法測試中都恰好回呼一次',()=>{
  for (const 文字 of [直接,保護]) {
    const 收到=[];
    虛擬機.runInNewContext(文字,{[回呼]:值=>收到.push(值)});
    斷言.equal(收到.length,1);
    斷言.equal(JSON.stringify(收到[0]),JSON.stringify(解析(文字).資料));
  }
  斷言.doesNotThrow(()=>虛擬機.runInNewContext(保護,{}));
});
測試('可接受空白、單雙引號與前導註解，但不更動 JSON 中括號、註解文字和特殊字元',()=>{
  for (const 文字 of [直接,回呼+' ( '+內容+' ) ;',
    '\uFEFF \n/* 前導 */\n// 第二段\n'+保護,
    'typeof '+回呼+' === "function" && '+直接,
    'typeof '+回呼+"==='function'&&"+回呼+'('+內容+')']) {
    斷言.equal(JSON.stringify(解析(文字).資料),內容);
  }
});
測試('條件與呼叫都必須是同一回呼；錯誤條件、替代分支與不同回呼一律拒絕',()=>{
  const 不接受=[
    'wrong('+內容+');',
    'typeof wrong === "function" && '+直接,
    'typeof '+回呼+' === "function" && wrong('+內容+');',
    'typeof '+回呼+' !== "function" && '+直接,
    'typeof '+回呼+' === "object" && '+直接,
    'typeof '+回呼+' === "function" || '+直接,
    'false && '+直接,
    'typeof '+回呼+' === "function" ? '+直接+' : null',
    'window.'+直接,
    保護+';'+直接,
    保護+'another();'
  ];
  for (const 文字 of 不接受) 斷言.throws(()=>解析(文字),/驗收未通過/);
});
測試('HTML、純 JSON、非 JSON 參數與任意腳本不會當成回呼成功，也不會被執行',()=>{
  環境.危險=0;
  const 不接受=[內容,'<html>登入</html>',回呼+'((危險=1));',
    回呼+'({成功:true});',回呼+'('+內容+','+內容+');',
    '危險=1;'+直接,直接+'危險=1;',回呼+'(null);',回呼+'([]);',
    回呼+'("資料");',回呼+'(true);',回呼+'('+內容+'); // 其他尾碼'];
  for (const 文字 of 不接受) 斷言.throws(()=>解析(文字),/驗收未通過/);
  斷言.equal(環境.危險,0);
  斷言.doesNotMatch(原碼,/\beval\s*\(|new\s+Function\s*\(/);
});
測試('每種行終止符後的指令都必須被檢查，不能藏在被剝除的行註解中',()=>{
  for (const 換行 of ['\n','\r','\r\n','\u2028','\u2029']) {
    斷言.equal(JSON.stringify(解析('// 註解'+換行+直接).資料),內容);
    斷言.throws(()=>解析('// 註解'+換行+'危險=1;'+直接),/驗收未通過/);
  }
  斷言.throws(()=>解析('/* 未結束 '+直接),/驗收未通過/);
  斷言.throws(()=>解析('/**/'.repeat(21)+直接),/驗收未通過/);
});
測試('ASCII 協議回呼中的美元符號須正確跳脫，拒絕非法指定回呼',()=>{
  const 名稱='$驗收';
  斷言.throws(()=>解析(名稱+'('+內容+');',名稱),/名稱不合法/);
  const 合法='$smart5s_1391';
  斷言.equal(JSON.stringify(解析(合法+'('+內容+');',合法).資料),內容);
  for (const 名 of ['bad.name','a);danger();//','a[0]','',null]) {
    斷言.throws(()=>解析(直接,名),/名稱不合法/);
  }
});
