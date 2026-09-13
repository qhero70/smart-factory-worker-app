// 合成資料：模擬每次執行固定的讀取快照，HTTP 使用實際後端寫入共享資料。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const source = read('smart-factory-command-center/01_GAS後端/智慧5S_正式部署驗收_v1391.gs');
const backend = read('smart-factory-command-center/01_GAS後端/智慧5S_POST寫入修復_v1390.gs');
const entry = read('smart-factory-command-center/01_GAS後端/GAS_後端入口.gs');
const fixture = read('tests/智慧5S同步驗證.cjs');
const Sheet = vm.runInNewContext(fixture.slice(fixture.indexOf('class 模擬分頁'), fixture.indexOf('function 建立後端')) + '\n模擬分頁;', {斷言:assert});
function setup() {
  const live = new Sheet(['驗收編號','狀態','備註','更新時間']);
  const props = new Map();
  const db = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  let serial = 0, badJSONP = false;
  let 回呼變換 = 文字=>文字;
  const 請求紀錄=[];
  const back = vm.createContext({Date, console,
    ContentService:{MimeType:{JSON:'application/json',JAVASCRIPT:'application/javascript'},
      createTextOutput:文字=>({getContent:()=>文字,setMimeType(){return this;}})},
    智慧5S_iOS_JSONP輸出_(){throw new Error('5S 讀取不得再委派給未驗證的外部輸出函式');},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    SpreadsheetApp:{openById:id=>{assert.equal(id,db);return {getSheetByName:()=>live};},flush(){}}
  });
  vm.runInContext(entry,back);
  vm.runInContext(backend,back);
  function invocation() {
    const snapshot = new Sheet([...live.列[0]],structuredClone(live.列.slice(1)));
    snapshot.getSheetId = () => 1581701305;
    const context = vm.createContext({Date, console:{log(){}},
      Utilities:{getUuid:()=>`synthetic-${++serial}`},
      PropertiesService:{getUserProperties:()=>({setProperty:(k,v)=>props.set(k,v),getProperty:k=>props.get(k)})},
      SpreadsheetApp:{openById:()=>({getSheetByName:()=>snapshot}),flush(){}},
      UrlFetchApp:{fetch(url,options){
        請求紀錄.push(options.method);
        let result;
        if(options.method==='get') {
          const params = new URL(url).searchParams;
          assert.equal(params.get('api'),'讀取分頁資料');
          assert.equal(params.get('spreadsheetId'),db);
          // 呼叫完整 doGet 及正式回呼輸出，不由替身拼接 JSONP 成功回覆。
          result = back.doGet({parameter:Object.fromEntries(params)}).getContent();
          if(badJSONP && params.has('callback')) result = result.replace(params.get('callback')+'(','wrong(');
          if(params.has('callback')) result = 回呼變換(result,params.get('callback'));
        } else if(typeof options.payload==='object') {
          result = JSON.stringify({成功:true,已就緒:true,主庫ID:db});
        } else {
          const request = JSON.parse(options.payload);
          result = JSON.stringify(request.events ? {已接收:true,事件數:0} : back.智慧5S_POST通用接收_(request));
        }
        return {getResponseCode:()=>200,getContentText:()=>result};
      }}
    });
    vm.runInContext(source,context);
    return context;
  }
  return {live,props,invocation,請求紀錄,breakJSONP(){badJSONP=true;},
    設定回呼變換(函式){回呼變換=函式;}};
}
test('跨 HTTP 寫入後必須另行讀回，完整後端及 GET/JSONP 驗收通過',()=>{
  const s=setup(), first=s.invocation();
  assert.match(first.驗證_智慧5S正式部署_v1391().驗收,/尚未全部完成/);
  assert.equal(s.live.列.length,2);
  assert.equal(s.live.列[1][1],'更新驗收通過');
  assert.throws(()=>first.驗證_智慧5S正式讀回_v1391(),/不可在同一次/);
  assert.equal(s.invocation().驗證_智慧5S正式讀回_v1391().驗收,'通過');
});
test('真實讀回不符仍失敗，不放寬狀態檢查',()=>{
  const s=setup();s.invocation().驗證_智慧5S正式部署_v1391();
  s.live.列[1][1]='未更新';
  assert.throws(()=>s.invocation().驗證_智慧5S正式讀回_v1391(),/狀態讀回不符/);
});
test('主鍵重複仍失敗',()=>{
  const s=setup();s.invocation().驗證_智慧5S正式部署_v1391();
  s.live.列.push([...s.live.列[1]]);
  assert.throws(()=>s.invocation().驗證_智慧5S正式讀回_v1391(),/主鍵筆數應為 1/);
});
test('沒有第一階段證據不得通過',()=>{
  assert.throws(()=>setup().invocation().驗證_智慧5S正式讀回_v1391(),/請先執行第一階段/);
});
test('JSONP 回呼錯誤阻擋最終通過',()=>{
  const s=setup();s.invocation().驗證_智慧5S正式部署_v1391();s.breakJSONP();
  assert.throws(()=>s.invocation().驗證_智慧5S正式讀回_v1391(),/JSONP 未回傳指定回呼/);
});

function 受保護外框(文字,回呼) {
  return '/**/typeof '+回呼+" === 'function' && "+文字;
}
function 調整批次(狀態,修改) {
  const 鍵='智慧5S_正式驗收_v1391_最近批次';
  const 紀錄=JSON.parse(狀態.props.get(鍵));
  修改(紀錄);
  狀態.props.set(鍵,JSON.stringify(紀錄));
}
test('1.3.9.2 的既有批次可讀回受保護 JSONP；不重跑 POST 或增加驗收列',()=>{
  const 狀態=setup();
  狀態.invocation().驗證_智慧5S正式部署_v1391();
  調整批次(狀態,紀錄=>{紀錄.工具修訂='1.3.9.2';});
  狀態.設定回呼變換(受保護外框);
  const 先前請求數=狀態.請求紀錄.length;
  const 先前資料=JSON.stringify(狀態.live.列);
  const 結果=狀態.invocation().驗證_智慧5S正式讀回_v1391();
  assert.equal(結果.驗收,'通過');assert.equal(結果.工具修訂,'1.3.9.5');
  assert.equal(結果.第一階段工具修訂,'1.3.9.2');
  assert.equal(結果.JSONP外框,'函式存在保護回呼');
  assert.deepEqual(狀態.請求紀錄.slice(先前請求數),['get','get']);
  assert.equal(JSON.stringify(狀態.live.列),先前資料);
  assert.match(結果.手機56筆,/尚待原手機/);
});
test('未知舊工具版本及缺少 HTTP 檢查的舊批次仍拒絕',()=>{
  for (const 修改 of [紀錄=>{紀錄.工具修訂='0.0.0';},
    紀錄=>{紀錄.工具修訂='1.3.9.2';delete 紀錄.檢查.衝突拒收;},
    紀錄=>{紀錄.工具修訂='1.3.9.2';delete 紀錄.檢查;}]) {
    const 狀態=setup();狀態.invocation().驗證_智慧5S正式部署_v1391();
    調整批次(狀態,修改);
    const 原請求數=狀態.請求紀錄.length;
    assert.throws(()=>狀態.invocation().驗證_智慧5S正式讀回_v1391(),/第一階段尚未通過|缺少 HTTP 驗收證據/);
    assert.equal(狀態.請求紀錄.length,原請求數);
  }
});
test('受保護 JSONP 的假成功、錯庫、重複主鍵及錯欄位值仍阻擋通過',()=>{
  const 情境=[
    資料=>{資料.成功=false;},
    資料=>{資料.主庫ID='錯誤主庫';},
    資料=>{資料.資料.push({...資料.資料[0]});},
    資料=>{資料.資料[0].驗收編號='不是本批次';},
    資料=>{資料.資料[0].狀態='新增驗收';},
    資料=>{資料.資料[0].備註='非原始備註';},
    資料=>{資料.資料[0].更新時間='錯誤時間';}
  ];
  for (const 修改 of 情境) {
    const 狀態=setup();狀態.invocation().驗證_智慧5S正式部署_v1391();
    狀態.設定回呼變換((文字,回呼)=>{
      const 資料=JSON.parse(文字.slice(回呼.length+1,-2));修改(資料);
      return 受保護外框(回呼+'('+JSON.stringify(資料)+');',回呼);
    });
    assert.throws(()=>狀態.invocation().驗證_智慧5S正式讀回_v1391(),/驗收未通過/);
    const 保存=JSON.parse([...狀態.props.values()][0]);
    assert.equal(保存.階段,'等待獨立讀回');
    assert.notEqual(保存.檢查.JSONP讀取,true);
  }
});
