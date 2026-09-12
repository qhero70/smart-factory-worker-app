// 僅本機替身測試；不連外、不修改正式資料或手機。
const 測試=require('node:test');
const 斷言=require('node:assert/strict');
const 檔案=require('node:fs');
const 路徑=require('node:path');
const 虛擬機=require('node:vm');
const 目錄=路徑.resolve(__dirname,'../smart-factory-command-center/01_GAS後端');
const 程式=檔案.readFileSync(路徑.join(目錄,'智慧5S_正式回呼唯讀診斷_v1.gs'),'utf8');
const 入口=檔案.readFileSync(路徑.join(目錄,'GAS_後端入口.gs'),'utf8');
const 主庫='19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
const 回呼='smart5s_verify_1391';
const 秘密='SYNTHETIC_SECRET_DO_NOT_LOG';
const 資料={成功:true,主庫ID:主庫,讀取版本:'1.3.9.3',筆數:1,
  資料:[{驗收編號:'驗收-合成資料',狀態:'更新驗收通過',備註:秘密}]};
function HTTP(文字,代碼=200,標頭={'Content-Type':'application/javascript; charset=utf-8'}) {
  return {getContentText:()=>文字,getResponseCode:()=>代碼,getAllHeaders:()=>標頭};
}
function 環境(附加={}) {
  const 日誌=[];
  const 拒絕服務=new Proxy({}, {get(){throw new Error('唯讀診斷不得呼叫寫入服務');}});
  const 內容=虛擬機.createContext({console:{log:文字=>日誌.push(文字)},
    PropertiesService:拒絕服務,SpreadsheetApp:拒絕服務,ScriptApp:拒絕服務,
    MailApp:拒絕服務,GmailApp:拒絕服務,CacheService:拒絕服務,
    ...附加});
  虛擬機.runInContext(程式,內容);
  return {內容,日誌,設定:內容.智慧5S回呼診斷_設定_(),
    分類:文字=>內容.智慧5S回呼診斷_分類_(文字,內容.智慧5S回呼診斷_設定_())};
}
測試('診斷不定義入口、不修改驗收工具，所有請求為固定驗收分頁與 10 筆上限',()=>{
  斷言.doesNotMatch(程式,/function\s+(?:doGet|doPost|驗證_智慧5S正式部署_v1391|驗證_智慧5S正式讀回_v1391)\s*\(/);
  斷言.doesNotMatch(程式,/\b(?:SpreadsheetApp|PropertiesService|ScriptApp|MailApp|GmailApp|CacheService)\b/);
  const {內容,設定}=環境();
  for (const 是否回呼 of [false,true]) {
    const 參數=內容.智慧5S回呼診斷_參數_(設定,是否回呼);
    斷言.equal(參數.api,'讀取分頁資料');斷言.equal(參數.action,'sheetData');
    for (const 鍵 of ['sheet','sheetName','分頁名稱','工作表名稱']) 斷言.equal(參數[鍵],'5S_連線驗收');
    斷言.equal(參數.spreadsheetId,主庫);斷言.equal(參數.試算表識別碼,主庫);
    斷言.equal(參數.limit,'10');斷言.equal(參數.上限,'10');
    斷言.equal(參數.callback,是否回呼 ? 回呼 : undefined);
    斷言.ok(Object.values(參數).every(值=>typeof 值==='string'));
  }
});
測試('精確 JSONP 只記錄回呼與非敏感摘要，不輸出資料列',()=>{
  const 結果=環境().分類(回呼+'('+JSON.stringify(資料)+');');
  斷言.equal(結果.格式,'JSONP');斷言.equal(結果.回呼名稱相符,true);
  斷言.equal(結果.原驗收外框符合,true);
  斷言.equal(結果.資料摘要.外層.資料列數,1);
  斷言.equal(結果.資料摘要.外層.主庫吻合,true);
  斷言.doesNotMatch(JSON.stringify(結果),new RegExp(秘密+'|驗收-合成資料'));
});
測試('純 JSON 與後端失敗旗標保留，不誤報為 JSONP 成功',()=>{
  const 結果=環境().分類(JSON.stringify({...資料,成功:false,ok:false,error:秘密}));
  斷言.equal(結果.格式,'JSON');斷言.equal(結果.原驗收外框符合,false);
  斷言.equal(結果.資料摘要.外層.成功,false);
  斷言.equal(結果.資料摘要.外層.含錯誤欄位,true);
  斷言.doesNotMatch(JSON.stringify(結果),new RegExp(秘密));
});
測試('錯誤回呼與名稱後空白可以分辨，不改原驗收外框判定',()=>{
  const 工具=環境();
  const 錯名=工具.分類('different_callback('+JSON.stringify(資料)+');');
  斷言.equal(錯名.格式,'JSONP');斷言.equal(錯名.回傳回呼,'different_callback');
  斷言.equal(錯名.回呼名稱相符,false);
  const 空白=工具.分類(回呼+' \n('+JSON.stringify(資料)+');');
  斷言.equal(空白.回呼名稱相符,true);斷言.equal(空白.名稱後有空白,true);
  斷言.equal(空白.原驗收外框符合,false);
});
測試('BOM 與前後空白符合舊規則，前導註解則只辨認、不放寬',()=>{
  const 工具=環境();
  const 本文=回呼+'('+JSON.stringify(資料)+');';
  const BOM=工具.分類('\uFEFF \n'+本文+'\n');
  斷言.equal(BOM.含BOM,true);斷言.equal(BOM.原驗收外框符合,true);
  const 註解=工具.分類('/* '+秘密+' */\n// 第二段\n'+本文);
  斷言.equal(註解.格式,'JSONP');斷言.equal(註解.前導註解數,2);
  斷言.equal(註解.回呼名稱相符,true);斷言.equal(註解.原驗收外框符合,false);
  斷言.doesNotMatch(JSON.stringify(註解),new RegExp(秘密));
});
測試('只解析 JSON，不執行任意 callback 內容或尾隨程式',()=>{
  const 工具=環境();
  工具.內容.危險=0;
  for (const 字串 of [回呼+'((危險=1));',回呼+'({"ok":true});危險=1',回呼+'({"ok":true});another();']) {
    const 結果=工具.分類(字串);
    斷言.equal(結果.格式,'回呼樣式但資料不可解析');
  }
  斷言.equal(工具.內容.危險,0);
});
測試('HTML 登入／權限／程式錯誤僅記錄布林線索，不輸出原文',()=>{
  const HTML='<!doctype html><title>'+秘密+'</title><body>Sign in accounts.google.com '+
    'permission ReferenceError quota <input type="password" value="'+秘密+'"></body>';
  const 結果=環境().分類(HTML);
  斷言.equal(結果.格式,'HTML');
  斷言.ok(結果.頁面線索.登入提示);斷言.ok(結果.頁面線索.權限提示);
  斷言.ok(結果.頁面線索.程式錯誤提示);斷言.ok(結果.頁面線索.配額提示);
  斷言.doesNotMatch(JSON.stringify(結果),new RegExp(秘密+'|accounts\\.google\\.com'));
});
測試('空白、未知文字、JSON 字串與超長回呼不洩漏回覆原文',()=>{
  const 工具=環境();
  斷言.equal(工具.分類(' ').格式,'空白回覆');
  斷言.equal(工具.分類(秘密).格式,'其他文字');
  for (const 文字 of [JSON.stringify(秘密),'null','true',回呼+'('+JSON.stringify(秘密)+');',
    'x'.repeat(90)+'('+JSON.stringify(資料)+');']) {
    斷言.doesNotMatch(JSON.stringify(工具.分類(文字)),new RegExp(秘密+'|x{90}'));
  }
});
測試('目前入口可 JSONP、正式部署純 JSON 時清楚區分，且只發兩次 GET',()=>{
  const 請求=[];
  const 目前入口=function doGet(e) {
    斷言.equal(e.parameter.limit,'10');
    斷言.equal(e.parameters.callback[0],回呼);
    return 主檔_智慧5S讀取輸出_(e.parameter);
  };
  function 主檔_智慧5S讀取輸出_() { return {getContent:()=>回呼+'('+JSON.stringify(資料)+');',getMimeType:()=> 'JAVASCRIPT'}; }
  const 工具=環境({doGet:目前入口,主檔_智慧5S讀取輸出_,
    UrlFetchApp:{fetch:(網址,選項)=>{請求.push({網址,選項});return HTTP(JSON.stringify(資料));}}});
  const 結果=工具.內容.診斷_智慧5S正式回呼();
  斷言.equal(工具.內容.doGet,目前入口);
  斷言.equal(結果.編輯器.doGet含1394接點,true);
  斷言.equal(結果.編輯器.回覆.格式,'JSONP');
  斷言.equal(請求.length,2);斷言.equal(工具.日誌.length,4);
  斷言.match(結果.摘要.初步判讀,/編輯器可產生指定回呼.*正式網址回傳純 JSON/);
  for (const 請 of 請求) {
    斷言.equal(請.選項.method,'get');斷言.equal(請.選項.followRedirects,true);
    斷言.equal(請.選項.muteHttpExceptions,true);斷言.equal(請.選項.payload,undefined);
    斷言.equal(new URL(請.網址).searchParams.get('sheet'),'5S_連線驗收');
    斷言.equal(new URL(請.網址).searchParams.get('limit'),'10');
    斷言.equal(請.網址.split('?')[0],工具.設定.網址);
  }
  斷言.equal(new URL(請求[0].網址).searchParams.has('callback'),false);
  斷言.equal(new URL(請求[1].網址).searchParams.get('callback'),回呼);
});
測試('缺少 doGet 仍獨立檢查兩條正式路徑，不虛構入口檢查成功',()=>{
  let 次數=0;
  const 工具=環境({UrlFetchApp:{fetch:()=>{次數++;return HTTP(JSON.stringify(資料));}}});
  const 結果=工具.內容.診斷_智慧5S正式回呼();
  斷言.equal(結果.編輯器.有doGet,false);斷言.equal(次數,2);
  斷言.equal(結果.正式GET.HTTP,200);斷言.equal(結果.正式JSONP.HTTP,200);
});
測試('入口及第一條連線例外不遮蔽第二條，錯誤訊息與其他標頭不外洩',()=>{
  let 次數=0;
  const 工具=環境({doGet(){throw new TypeError('not a function '+秘密);},
    UrlFetchApp:{fetch:()=>{
      if (++次數===1) throw new Error('connection timeout https://example.invalid/'+秘密);
      return HTTP('<html>Sign in '+秘密+'</html>',403,{'cOnTeNt-TyPe':['text/html; secret='+秘密],
        'Set-Cookie':秘密,Location:'https://example.invalid/'+秘密});
    }}});
  const 結果=工具.內容.診斷_智慧5S正式回呼();
  斷言.equal(結果.編輯器.回覆.格式,'執行例外');斷言.equal(結果.編輯器.回覆.線索.缺少函式,true);
  斷言.equal(結果.正式GET.格式,'執行例外');斷言.equal(結果.正式GET.線索.連線,true);
  斷言.equal(結果.正式JSONP.HTTP,403);斷言.equal(結果.正式JSONP.MIME,'text/html');
  斷言.match(結果.摘要.初步判讀,/非 200/);
  斷言.equal(次數,2);斷言.equal(工具.日誌.length,4);
  斷言.doesNotMatch(JSON.stringify(工具.日誌),new RegExp(秘密+'|Set-Cookie|example\\.invalid'));
});
測試('帶 typeof 防護的其他程式外框只留下結構線索，仍不執行回覆',()=>{
  const 本文='typeof '+回呼+' === "function" && '+回呼+'('+JSON.stringify(資料)+');';
  const 結果=環境().分類(本文);
  斷言.equal(結果.格式,'其他文字');
  斷言.equal(結果.原驗收外框符合,false);
  斷言.equal(結果.其他外框線索.含typeof保護,true);
  斷言.equal(結果.其他外框線索.含指定回呼文字,true);
  斷言.doesNotMatch(JSON.stringify(結果),new RegExp(秘密));
});
測試('直接使用完整 1394 入口；全部格式正確仍不宣告正式驗收或手機同步完成',()=>{
  const 表格=[['驗收編號','狀態','備註','更新時間'],['驗收-本機','更新驗收通過',秘密,'2026-09-11T06:30:00.000Z']];
  const 存取=[];
  const 工具=環境({
    ContentService:{MimeType:{JSON:'JSON',JAVASCRIPT:'JAVASCRIPT'},createTextOutput(文字){
      return {getContent:()=>文字,setMimeType(MIME){this.MIME=MIME;return this;},getMimeType(){return this.MIME;}};
    }},
    SpreadsheetApp:{openById:庫=>{存取.push(庫);return {getSheetByName:頁=>{
      斷言.equal(頁,'5S_連線驗收');
      return {getLastRow:()=>2,getLastColumn:()=>4,getRange:(列,欄,列數,欄數)=>({
        getValues:()=>表格.slice(列-1,列-1+列數).map(值=>值.slice(欄-1,欄-1+欄數))
      })};
    }};}},
    UrlFetchApp:{fetch:(網址)=>{
      const 回=工具.內容.doGet({parameter:Object.fromEntries(new URL(網址).searchParams)});
      return HTTP(回.getContent(),200,{'Content-Type':回.MIME==='JSON'?'application/json':'application/javascript'});
    }}
  });
  虛擬機.runInContext(入口,工具.內容);
  const 結果=工具.內容.診斷_智慧5S正式回呼();
  斷言.equal(結果.編輯器.有1394輸出函式,true);
  斷言.equal(結果.編輯器.doGet含1394接點,true);
  斷言.equal(結果.編輯器.回覆.格式,'JSONP');
  斷言.equal(結果.正式GET.格式,'JSON');
  斷言.equal(結果.正式JSONP.格式,'JSONP');
  斷言.equal(結果.正式JSONP.原驗收外框符合,true);
  斷言.equal(結果.摘要.狀態,'診斷完成，不代表正式驗收通過');
  斷言.equal(結果.摘要.手機資料,'未讀取、未同步、未清除');
  斷言.ok(存取.every(庫=>庫===主庫));斷言.equal(存取.length,3);
  斷言.doesNotMatch(JSON.stringify(工具.日誌),new RegExp(秘密));
});
