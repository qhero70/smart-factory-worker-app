/**
 * 從 Apps Script 編輯器手動執行本函式，驗證「既有部署」的真實 HTTP POST。
 * 僅在同一主庫的「5S_連線驗收」留下合成驗收資料；不修改巡檢紀錄、不發送通知。
 * 不建 Web App、不初始化正式分頁、不刪除驗收紀錄。
 * 此檔備妥不代表已執行；以執行紀錄及主庫讀回結果為準。
 */
function 驗證_智慧5S正式部署_v1391() {
  var 網址 = 'https://script.google.com/macros/s/AKfycby2ghuwkxTr1kbt2bU9D3U24O55c6GhcabA1IhDC67OEw86pH6MjS3nnBMASnjEmggw/exec';
  var 主庫ID = '19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8';
  var 分頁名稱 = '5S_連線驗收';
  var 欄位 = ['驗收編號','狀態','備註','更新時間'];
  var 驗收編號 = '驗收-' + Utilities.getUuid();
  var 時間 = new Date().toISOString();
  function 要求(條件, 訊息) { if (!條件) throw new Error('驗收未通過：' + 訊息); }
  function 發送(參數) {
    var 回應 = UrlFetchApp.fetch(網址, {method:'post',contentType:'text/plain;charset=utf-8',
      payload:JSON.stringify(參數),followRedirects:true,muteHttpExceptions:true});
    要求(回應.getResponseCode()===200,'HTTP 狀態非 200');
    try { return JSON.parse(回應.getContentText()); }
    catch (錯誤) { throw new Error('驗收未通過：正式部署未回傳 JSON'); }
  }
  function 核對收據(收據, 動作) {
    要求(收據.成功===true && 收據.ok===true && 收據.success===true,'未確認寫入成功');
    要求(收據.協定==='SMART5S_RECEIPT_1391' && 收據.主庫ID===主庫ID,'收據協定或主庫不符');
    要求(收據.action===動作 && 收據.sheet===分頁名稱,'收據動作或分頁不符');
    要求(收據.主鍵值===驗收編號 && 收據.rowNumber>=2,'收據主鍵或列號不符');
  }
  var 健康 = 發送({action:'智慧5S_寫入健康檢查'});
  要求(健康.協定==='SMART5S_RECEIPT_1391' && 健康.主庫ID===主庫ID,'既有部署尚未更新');
  var 主庫 = SpreadsheetApp.openById(主庫ID);
  var 分頁 = 主庫.getSheetByName(分頁名稱);
  if (!分頁) {
    分頁 = 主庫.insertSheet(分頁名稱);
    分頁.getRange(1,1,1,欄位.length).setValues([欄位]);
    分頁.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  要求(JSON.stringify(分頁.getRange(1,1,1,4).getDisplayValues()[0])===JSON.stringify(欄位),'驗收分頁表頭不符');
  var 原列數 = 分頁.getLastRow();
  var 新增參數 = {action:'appendRow',spreadsheetId:主庫ID,sheet:分頁名稱,headers:欄位,
    values:[驗收編號,'新增驗收','合成連線驗收資料，非正式巡檢',時間]};
  var 新增 = 發送(新增參數);
  核對收據(新增,'appendRow');
  var 重送 = 發送(新增參數);
  核對收據(重送,'appendRow');
  要求(重送.重複請求===true && 重送.rowNumber===新增.rowNumber,'新增重送未防重');
  var 更新 = 發送({action:'updateRow',spreadsheetId:主庫ID,sheet:分頁名稱,rowNumber:999999,
    headers:['驗收編號','狀態'],values:[驗收編號,'更新驗收通過']});
  核對收據(更新,'updateRow');
  var 更新重送 = 發送({action:'updateRow',spreadsheetId:主庫ID,sheet:分頁名稱,rowNumber:999999,
    headers:['驗收編號','狀態'],values:[驗收編號,'更新驗收通過']});
  核對收據(更新重送,'updateRow');
  要求(更新.rowNumber===新增.rowNumber && 更新重送.rowNumber===新增.rowNumber,'更新未以主鍵定位');
  var 衝突 = 發送(Object.assign({},新增參數,{values:[驗收編號,'不同內容','故意衝突',時間]}));
  要求(衝突.成功===false && 衝突.ok===false,'主鍵衝突未停止寫入');
  var 錯庫 = 發送(Object.assign({},新增參數,{試算表識別碼:'驗收用錯誤主庫'}));
  要求(錯庫.成功===false,'錯誤主庫未停止寫入');
  var 讀回 = 分頁.getRange(新增.rowNumber,1,1,4).getDisplayValues()[0];
  要求(讀回[0]===驗收編號 && 讀回[1]==='更新驗收通過','正式主庫讀回不符');
  要求(讀回[2]===新增參數.values[2] && 讀回[3]===時間,'更新覆寫未指定欄位');
  要求(分頁.getLastRow()===原列數+1,'新增或更新重送產生重複列');
  var LINE空事件 = 發送({events:[]});
  要求(LINE空事件.已接收===true && LINE空事件.事件數===0,'LINE 空事件路由異常');
  // V4 採既有表單協定；只查詢連線狀態，不新增報工。
  var V4回應 = UrlFetchApp.fetch(網址,{method:'post',payload:{action:'查詢報工V4對接',payload:'{}'},
    followRedirects:true,muteHttpExceptions:true});
  var V4資料 = JSON.parse(V4回應.getContentText());
  要求(V4資料.成功===true && V4資料.已就緒===true,'V4 唯讀路由異常');
  var 結果 = {驗收:'通過',版本:健康.版本,主庫ID:主庫ID,驗收分頁:分頁名稱,驗收編號:驗收編號,
    新增:true,新增重送防重:true,更新:true,更新重送:true,衝突拒收:true,錯庫拒收:true,
    正式讀回:true,LINE空事件:true,V4唯讀:true,新增列數:1,
    手機56筆:'尚待原手機同步畫面及正式紀錄核對'};
  console.log(JSON.stringify(結果));
  return 結果;
}
