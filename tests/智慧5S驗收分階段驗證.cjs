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
const fixture = read('tests/智慧5S同步驗證.cjs');
const Sheet = vm.runInNewContext(fixture.slice(fixture.indexOf('class 模擬分頁'), fixture.indexOf('function 建立後端')) + '\n模擬分頁;', {斷言:assert});
function setup() {
  const live = new Sheet(['驗收編號','狀態','備註','更新時間']);
  const props = new Map();
  const db = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  let serial = 0, badJSONP = false;
  const back = vm.createContext({Date, console,
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    SpreadsheetApp:{openById:id=>{assert.equal(id,db);return {getSheetByName:()=>live};},flush(){}}
  });
  vm.runInContext(backend,back);
  function invocation() {
    const snapshot = new Sheet([...live.列[0]],structuredClone(live.列.slice(1)));
    snapshot.getSheetId = () => 1581701305;
    const context = vm.createContext({Date, console:{log(){}},
      Utilities:{getUuid:()=>`synthetic-${++serial}`},
      PropertiesService:{getUserProperties:()=>({setProperty:(k,v)=>props.set(k,v),getProperty:k=>props.get(k)})},
      SpreadsheetApp:{openById:()=>({getSheetByName:()=>snapshot}),flush(){}},
      UrlFetchApp:{fetch(url,options){
        let result;
        if(options.method==='get') {
          const params = new URL(url).searchParams;
          assert.equal(params.get('api'),'讀取分頁資料');
          assert.equal(params.get('spreadsheetId'),db);
          result = JSON.stringify({成功:true,headers:live.列[0],rows:live.列.slice(1)});
          if(params.has('callback')) result = (badJSONP?'wrong':params.get('callback'))+'('+result+');';
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
  return {live,props,invocation,breakJSONP(){badJSONP=true;}};
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
