'use strict';
const 測試=require('node:test');
const 斷言=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../docs/tool-change-pwa');
const gasPath=path.resolve(__dirname,'../smart-factory-command-center/01_GAS後端');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const front=fs.readFileSync(path.join(root,'刀具表精靈_工件高解析雲端管理.js'),'utf8');
const backend=fs.readFileSync(path.join(gasPath,'刀具表三視圖雲端照片.gs'),'utf8');
const router=fs.readFileSync(path.join(gasPath,'刀具表正式資料連線.gs'),'utf8');

測試('GAS 獨立照片模組不會建立第二個 doPost 或 LINE 路由',()=>{
  斷言.doesNotThrow(()=>new Function(backend));
  斷言.doesNotThrow(()=>new Function(router));
  斷言.ok(router.includes("動作.indexOf('刀具表_照片') === 0"));
  斷言.ok(router.includes('刀具三視圖_接收請求_(請求, 方法)'));
  斷言.ok(!/function\s+doPost\s*\(/.test(backend));
  斷言.ok(!/function\s+doGet\s*\(/.test(backend));
});
測試('私有資料夾、登入者、SHA256 和授權碼必備',()=>{
  斷言.ok(backend.includes('DriveApp.Access.PRIVATE'));
  斷言.ok(backend.includes('getSharingAccess()'));
  斷言.ok(backend.includes('刀具三視圖_驗證授權_(參數.授權碼)'));
  斷言.ok(backend.includes("qhero1982@gmail.com"));
  斷言.ok(backend.includes("1au_lydLX3NAEwEs8lzLF58iJ5uzKveYQ"));
  斷言.ok(backend.includes("刀具表照片授權碼_SHA256"));
  斷言.ok(backend.includes('Utilities.DigestAlgorithm.SHA_256'));
  斷言.ok(backend.includes('function 管理員_產生工件三視圖授權碼_()'));
  斷言.ok(!backend.includes("|| '1234'"));
});
測試('四個照片 API 保持 POST 私密讀取和查核',()=>{
  for(const api of ['刀具表_照片設定','刀具表_照片上傳','刀具表_照片查核','刀具表_照片讀取'])
    斷言.ok(backend.includes(api),api);
  斷言.ok(backend.includes("if (方法 !== 'POST')"));
  斷言.ok(backend.includes('刀具三視圖_檔案屬於照片庫_'));
  斷言.ok(backend.includes('window.parent.postMessage('));
});
測試('PWA 新增授權上傳並保留原本手動分享功能',()=>{
  斷言.doesNotThrow(()=>new Function(front));
  斷言.ok(front.includes('function 正式照片上傳_(key)'));
  斷言.ok(front.includes('window.分享三視圖原圖_'));
  斷言.ok(front.includes('刀具表_照片查核'));
  斷言.ok(front.includes("form.method='POST'"));
  斷言.ok(front.includes('檔案ID:result.檔案ID'));
  斷言.ok(html.includes('id="工件高清授權碼"'));
  for(const key of ['正視圖','俯視圖','側視圖'])
    斷言.ok(html.includes("onclick=\"正式照片上傳_('"+key+"')\""));
  斷言.ok(front.includes('appData.工件三視圖雲端檔案'));
  斷言.ok(html.includes('saveCurrentToFormalSheets(false)'));
});
測試('網站離線快取最新版大圖腳本，不依賴固定版本數字',()=>{
  const x=/src="\.\/刀具表精靈_工件高解析雲端管理\.js\?版本=(\d+)"/.exec(html);
  斷言.ok(x);
  斷言.ok(sw.includes('工件高解析雲端管理.js?版本='+x[1]));
  const c=/href="\.\/刀具表精靈_介面優化\.css\?版本=(\d+)"/.exec(html);
  斷言.ok(c);
  斷言.ok(sw.includes('介面優化.css?版本='+c[1]));
});
