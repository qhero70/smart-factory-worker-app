/**
 * 化新精密｜智慧5S 正式部署驗收，工具修訂 1.3.9.5
 * 完整覆蓋原「智慧5S_正式部署驗收_v1391.gs」。
 * 目前第一階段已通過：只執行「驗證_智慧5S正式讀回_v1391」。
 * 可沿用工具 1.3.9.2 已通過的同一批次，不用新增驗收列。
 * 只有從未通過第一階段時，才先執行「驗證_智慧5S正式部署_v1391」。
 * 兩步必須分開執行，避免沿用跨 HTTP 寫入前的試算表讀取快取。
 * 本次僅修正驗收工具，不改正式入口、不需重新部署。
 * JSONP 接受直接回呼，以及同一回呼的 typeof 函式存在保護。
 * 僅解析 JSON，不執行回覆腳本；主鍵、狀態、備註及時間仍逐項核對。
 * 僅使用同一主庫的合成驗收紀錄，不清除手機資料、不發送通知。
 * 協議參考：https://developers.google.com/apps-script/guides/content#serving_jsonp_in_web_pages
 */
var 智慧5S驗收本次執行已寫入_ = false;

function 智慧5S驗收設定_() {
  return {
    網址:'https://script.google.com/macros/s/AKfycby2ghuwkxTr1kbt2bU9D3U24O55c6GhcabA1IhDC67OEw86pH6MjS3nnBMASnjEmggw/exec',
    主庫ID:'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8',
    分頁名稱:'5S_連線驗收',欄位:['驗收編號','狀態','備註','更新時間'],
    收據協定:'SMART5S_RECEIPT_1391',工具修訂:'1.3.9.5',
    紀錄鍵:'智慧5S_正式驗收_v1391_最近批次'
  };
}
function 智慧5S驗收要求_(條件, 訊息) {
  if (!條件) throw new Error('驗收未通過：' + 訊息);
}
function 智慧5S驗收保存_(紀錄) {
  PropertiesService.getUserProperties().setProperty(
    智慧5S驗收設定_().紀錄鍵, JSON.stringify(紀錄));
}
function 智慧5S驗收POST_(設定, 參數) {
  var 回應 = UrlFetchApp.fetch(設定.網址,{
    method:'post',contentType:'text/plain;charset=utf-8',
    payload:JSON.stringify(參數),followRedirects:true,muteHttpExceptions:true
  });
  智慧5S驗收要求_(回應.getResponseCode()===200,'POST 的 HTTP 狀態非 200');
  try { return JSON.parse(回應.getContentText()); }
  catch (錯誤) { throw new Error('驗收未通過：POST 未回傳 JSON'); }
}
function 智慧5S驗收核對收據_(收據, 動作, 紀錄) {
  var 設定 = 智慧5S驗收設定_();
  智慧5S驗收要求_(收據 && 收據.成功===true && 收據.ok===true &&
    收據.success===true,'未確認寫入成功');
  智慧5S驗收要求_(收據.協定===設定.收據協定 &&
    收據.主庫ID===設定.主庫ID,'收據協定或主庫不符');
  智慧5S驗收要求_(收據.action===動作 && 收據.sheet===設定.分頁名稱,
    '收據動作或分頁不符');
  智慧5S驗收要求_(收據.主鍵欄位==='驗收編號' &&
    收據.主鍵值===紀錄.驗收編號 && Number.isInteger(收據.rowNumber) &&
    收據.rowNumber>=2,'收據主鍵或列號不符');
}

function 驗證_智慧5S正式部署_v1391() {
  智慧5S驗收本次執行已寫入_ = true;
  var 設定 = 智慧5S驗收設定_();
  var 紀錄 = {
    工具修訂:設定.工具修訂,階段:'HTTP測試進行中',
    主庫ID:設定.主庫ID,分頁名稱:設定.分頁名稱,
    驗收編號:'驗收-'+Utilities.getUuid(),時間:new Date().toISOString(),
    備註:'合成連線驗收資料，非正式巡檢',
    預期狀態:'更新驗收通過',檢查:{}
  };
  // 先記錄本批次；失敗時不會把上一批次的結果當成這次成功。
  智慧5S驗收保存_(紀錄);
  try {
    var 健康 = 智慧5S驗收POST_(設定,{action:'智慧5S_寫入健康檢查'});
    智慧5S驗收要求_(健康.成功===true && 健康.協定===設定.收據協定 &&
      健康.主庫ID===設定.主庫ID && 健康.版本==='1.3.9.1',
      '指定的既有部署尚未提供 1.3.9.1 寫入收據');
    紀錄.寫入版本 = 健康.版本;
    var 主庫 = SpreadsheetApp.openById(設定.主庫ID);
    var 分頁 = 主庫.getSheetByName(設定.分頁名稱);
    if (!分頁) {
      分頁 = 主庫.insertSheet(設定.分頁名稱);
      分頁.getRange(1,1,1,4).setValues([設定.欄位]);
      分頁.setFrozenRows(1);
      SpreadsheetApp.flush();
    }
    智慧5S驗收要求_(JSON.stringify(分頁.getRange(1,1,1,4).getDisplayValues()[0])===
      JSON.stringify(設定.欄位),'驗收分頁表頭不符');
    紀錄.分頁ID = 分頁.getSheetId();
    智慧5S驗收保存_(紀錄);
    var 新增參數 = {action:'appendRow',spreadsheetId:設定.主庫ID,
      sheet:設定.分頁名稱,headers:設定.欄位,
      values:[紀錄.驗收編號,'新增驗收',紀錄.備註,紀錄.時間]};
    var 新增 = 智慧5S驗收POST_(設定,新增參數);
    智慧5S驗收核對收據_(新增,'appendRow',紀錄);
    紀錄.列號 = 新增.rowNumber;
    紀錄.檢查.新增 = true;
    var 重送 = 智慧5S驗收POST_(設定,新增參數);
    智慧5S驗收核對收據_(重送,'appendRow',紀錄);
    智慧5S驗收要求_(重送.重複請求===true &&
      重送.rowNumber===紀錄.列號,'新增重送未防重');
    紀錄.檢查.新增重送防重 = true;
    var 更新參數 = {action:'updateRow',spreadsheetId:設定.主庫ID,
      sheet:設定.分頁名稱,rowNumber:999999,
      headers:['驗收編號','狀態'],values:[紀錄.驗收編號,紀錄.預期狀態]};
    var 更新 = 智慧5S驗收POST_(設定,更新參數);
    智慧5S驗收核對收據_(更新,'updateRow',紀錄);
    智慧5S驗收要求_(更新.rowNumber===紀錄.列號,'更新未以主鍵定位');
    紀錄.檢查.更新 = true;
    var 更新重送 = 智慧5S驗收POST_(設定,更新參數);
    智慧5S驗收核對收據_(更新重送,'updateRow',紀錄);
    智慧5S驗收要求_(更新重送.rowNumber===紀錄.列號,'更新重送列號不符');
    紀錄.檢查.更新重送 = true;
    var 衝突 = 智慧5S驗收POST_(設定,Object.assign({},新增參數,{
      values:[紀錄.驗收編號,'不同內容','故意衝突',紀錄.時間]}));
    智慧5S驗收要求_(衝突.成功===false && 衝突.ok===false &&
      衝突.success===false,'主鍵衝突未停止寫入');
    紀錄.檢查.衝突拒收 = true;
    var 錯庫 = 智慧5S驗收POST_(設定,Object.assign({},新增參數,{
      試算表識別碼:'驗收用錯誤主庫'}));
    智慧5S驗收要求_(錯庫.成功===false && 錯庫.ok===false &&
      錯庫.success===false,'錯誤主庫未停止寫入');
    紀錄.檢查.錯庫拒收 = true;
    var LINE空事件 = 智慧5S驗收POST_(設定,{events:[]});
    智慧5S驗收要求_(LINE空事件.已接收===true &&
      LINE空事件.事件數===0,'LINE 空事件路由異常');
    紀錄.檢查.LINE空事件 = true;
    var V4回應 = UrlFetchApp.fetch(設定.網址,{
      method:'post',payload:{action:'查詢報工V4對接',payload:'{}'},
      followRedirects:true,muteHttpExceptions:true});
    智慧5S驗收要求_(V4回應.getResponseCode()===200,'V4 HTTP 狀態非 200');
    var V4資料 = JSON.parse(V4回應.getContentText());
    智慧5S驗收要求_(V4資料.成功===true && V4資料.已就緒===true &&
      V4資料.主庫ID===設定.主庫ID,'V4 唯讀路由異常');
    紀錄.檢查.V4唯讀 = true;
    // 此處不再沿用上方的「分頁」物件讀取跨 HTTP 更新後的資料。
    紀錄.階段 = '等待獨立讀回';
    智慧5S驗收保存_(紀錄);
    var 結果 = {驗收:'第一階段通過，尚未全部完成',工具修訂:設定.工具修訂,
      寫入版本:紀錄.寫入版本,驗收編號:紀錄.驗收編號,列號:紀錄.列號,
      檢查:紀錄.檢查,下一步:'等本次執行結束，再從函式選單執行「驗證_智慧5S正式讀回_v1391」',
      手機56筆:'尚未同步'};
    console.log(JSON.stringify(結果));
    return 結果;
  } catch (錯誤) {
    紀錄.階段 = 'HTTP測試未通過';
    紀錄.錯誤 = String(錯誤.message || 錯誤).slice(0,500);
    智慧5S驗收保存_(紀錄);
    console.log(JSON.stringify({驗收:'未通過',階段:紀錄.階段,
      驗收編號:紀錄.驗收編號,已通過:紀錄.檢查,錯誤:紀錄.錯誤}));
    throw 錯誤;
  }
}

function 驗證_智慧5S正式讀回_v1391() {
  智慧5S驗收要求_(!智慧5S驗收本次執行已寫入_,
    '請等第一階段結束，再從函式選單另行執行讀回；不可在同一次執行中直接呼叫');
  var 設定 = 智慧5S驗收設定_();
  var 保存 = PropertiesService.getUserProperties().getProperty(設定.紀錄鍵);
  智慧5S驗收要求_(!!保存,'請先執行第一階段「驗證_智慧5S正式部署_v1391」');
  var 紀錄 = JSON.parse(保存);
  // 舊工具的第一階段證據仍有效；只接受已知相同資料協議的版本。
  智慧5S驗收要求_((紀錄.工具修訂===設定.工具修訂 || 紀錄.工具修訂==='1.3.9.2') &&
    (紀錄.階段==='等待獨立讀回' || 紀錄.階段==='驗收通過') &&
    紀錄.主庫ID===設定.主庫ID && 紀錄.分頁名稱===設定.分頁名稱,
    '本批次第一階段尚未通過或設定不符');
  var 必要 = ['新增','新增重送防重','更新','更新重送','衝突拒收','錯庫拒收','LINE空事件','V4唯讀'];
  智慧5S驗收要求_(紀錄.檢查 && 必要.every(function (鍵) { return 紀錄.檢查[鍵]===true; }),
    '本批次缺少 HTTP 驗收證據');
  var 階段 = '正式主庫獨立讀回';
  try {
    var 主庫 = SpreadsheetApp.openById(設定.主庫ID);
    var 分頁 = 主庫.getSheetByName(設定.分頁名稱);
    智慧5S驗收要求_(分頁 && 分頁.getSheetId()===紀錄.分頁ID,'驗收分頁身分不符');
    智慧5S驗收要求_(JSON.stringify(分頁.getRange(1,1,1,4).getDisplayValues()[0])===
      JSON.stringify(設定.欄位),'驗收分頁表頭不符');
    智慧5S驗收要求_(分頁.getLastRow()>=2,'驗收分頁沒有資料列');
    var 命中 = 分頁.getRange(2,1,分頁.getLastRow()-1,1)
      .createTextFinder(紀錄.驗收編號).useRegularExpression(false)
      .matchEntireCell(true).matchCase(true).findAll();
    智慧5S驗收要求_(命中.length===1,'驗收主鍵筆數應為 1，實際為 '+命中.length);
    智慧5S驗收要求_(命中[0].getRow()===紀錄.列號,'實際主鍵列號與收據不符');
    var 值 = 分頁.getRange(紀錄.列號,1,1,4).getValues()[0];
    智慧5S驗收核對內容_(設定.欄位.reduce(function (物件, 欄, 序) {
      物件[欄] = 值[序]; return 物件;
    },{}),紀錄);
    紀錄.檢查.正式讀回 = true;
    紀錄.檢查.主鍵唯一 = true;
    階段 = '正式 GET 讀取';
    智慧5S驗收核對GET_(設定,紀錄,false);
    紀錄.檢查.GET讀取 = true;
    階段 = '正式 JSONP 讀取';
    var 回呼驗收 = 智慧5S驗收核對GET_(設定,紀錄,true);
    紀錄.檢查.JSONP讀取 = true;
    紀錄.JSONP外框 = 回呼驗收.外框;
    紀錄.讀回工具修訂 = 設定.工具修訂;
    紀錄.階段 = '驗收通過';
    紀錄.完成時間 = new Date().toISOString();
    智慧5S驗收保存_(紀錄);
    var 結果 = {驗收:'通過',寫入版本:紀錄.寫入版本,工具修訂:設定.工具修訂,
      主庫ID:設定.主庫ID,驗收分頁:設定.分頁名稱,驗收編號:紀錄.驗收編號,
      列號:紀錄.列號,檢查:紀錄.檢查,本批驗收主鍵筆數:1,
      第一階段工具修訂:紀錄.工具修訂,JSONP外框:紀錄.JSONP外框,
      手機56筆:'尚待原手機同步畫面及正式紀錄核對'};
    console.log(JSON.stringify(結果));
    return 結果;
  } catch (錯誤) {
    console.log(JSON.stringify({驗收:'未通過',階段:階段,
      驗收編號:紀錄.驗收編號,已通過:紀錄.檢查,
      錯誤:String(錯誤.message || 錯誤).slice(0,500)}));
    throw 錯誤;
  }
}

function 智慧5S驗收核對內容_(資料, 紀錄) {
  智慧5S驗收要求_(String(資料.驗收編號 || '')===紀錄.驗收編號,'讀回主鍵不符');
  智慧5S驗收要求_(資料.狀態===紀錄.預期狀態,
    '狀態讀回不符；預期「'+紀錄.預期狀態+'」，實際「'+String(資料.狀態)+'」');
  智慧5S驗收要求_(資料.備註===紀錄.備註,'更新改動了未指定的備註');
  var 時間 = 資料.更新時間 instanceof Date ? 資料.更新時間.toISOString() : String(資料.更新時間);
  智慧5S驗收要求_(時間===紀錄.時間,'更新改動了未指定的時間');
}
function 智慧5S驗收核對GET_(設定, 紀錄, 使用JSONP) {
  // 與原 PWA 相同的雙協議參數；僅讀取合成驗收分頁。
  var 參數 = {action:'sheetData',動作:'sheetData',api:'讀取分頁資料',
    spreadsheetId:設定.主庫ID,試算表識別碼:設定.主庫ID,
    sheet:設定.分頁名稱,sheetName:設定.分頁名稱,
    分頁名稱:設定.分頁名稱,工作表名稱:設定.分頁名稱,
    limit:1000,上限:1000,query:'',查詢:'',_:Utilities.getUuid()};
  var 回呼 = 'smart5s_verify_1391'; // 固定協議要求 ASCII 回呼名稱。
  if (使用JSONP) 參數.callback = 回呼;
  var 查詢 = Object.keys(參數).map(function (鍵) {
    return encodeURIComponent(鍵)+'='+encodeURIComponent(String(參數[鍵]));
  }).join('&');
  var 回應 = UrlFetchApp.fetch(設定.網址+'?'+查詢,{
    method:'get',followRedirects:true,muteHttpExceptions:true});
  智慧5S驗收要求_(回應.getResponseCode()===200,'GET 的 HTTP 狀態非 200');
  var 文字 = 回應.getContentText().replace(/^\uFEFF/,'').trim();
  var 回傳;
  var 回呼解析;
  if (使用JSONP) {
    回呼解析 = 智慧5S驗收解析JSONP_(文字,回呼);
    回傳 = 回呼解析.資料;
  } else {
    try { 回傳 = JSON.parse(文字); }
    catch (錯誤) { throw new Error('驗收未通過：GET 未回傳可解析資料'); }
  }
  var 主體 = 回傳;
  ['結果','result','data'].some(function (鍵) {
    if (回傳 && 回傳[鍵] && typeof 回傳[鍵]==='object' && !Array.isArray(回傳[鍵])) {
      主體 = 回傳[鍵]; return true;
    }
    return false;
  });
  [回傳,主體].forEach(function (物件) {
    智慧5S驗收要求_(物件 && typeof 物件==='object' &&
      物件.成功!==false && 物件.ok!==false && 物件.success!==false &&
      !物件.error && !物件.錯誤,'GET 回傳失敗');
    智慧5S驗收要求_(物件.主庫ID===undefined || 物件.主庫ID===設定.主庫ID,
      'GET 回傳主庫不符');
  });
  var 欄位 = 主體.headers || 主體.欄位 || 主體.表頭 || 主體.columns ||
    回傳.headers || 回傳.欄位 || 回傳.表頭 || 回傳.columns || [];
  var 列 = 主體.rows || 主體.資料列 || 主體.資料 || 主體.data ||
    回傳.rows || 回傳.資料列 || 回傳.資料 || 回傳.data || [];
  智慧5S驗收要求_(Array.isArray(欄位) && Array.isArray(列),'GET 資料列格式不符');
  var 物件列 = 列.map(function (項) {
    if (項 && typeof 項==='object' && !Array.isArray(項) &&
        !Array.isArray(項.values) && !Array.isArray(項.值)) return 項;
    var 值 = Array.isArray(項) ? 項 :
      (項 && Array.isArray(項.values) ? 項.values : (項 && 項.值 || []));
    return 欄位.reduce(function (物件, 欄, 序) { 物件[欄]=值[序]; return 物件; },{});
  });
  var 命中 = 物件列.filter(function (項) { return 項.驗收編號===紀錄.驗收編號; });
  智慧5S驗收要求_(命中.length===1,'GET 未讀回唯一的本批驗收主鍵');
  智慧5S驗收核對內容_(命中[0],紀錄);
  return {外框:使用JSONP ? 回呼解析.外框 : '一般JSON'};
}

/**
 * 嚴格辨識兩種等價的回呼外框，不以任意腳本執行換取驗收成功。
 * 1. 指定回呼(JSON);
 * 2. typeof 指定回呼 === 'function' && 指定回呼(JSON);
 * 可有前導註解／空白；條件與實際呼叫都必須使用同一指定回呼。
 * 回呼內只能是 JSON；其他條件、第二個指令或錯誤回呼一律拒絕。
 */
function 智慧5S驗收解析JSONP_(原文, 回呼) {
  智慧5S驗收要求_(typeof 回呼==='string' && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(回呼),
    'JSONP 驗收回呼名稱不合法');
  var 文字 = String(原文).replace(/^\uFEFF/,'').trim();
  var 註解數 = 0;
  // 不對全文刪註解，以免誤改 JSON 字串；涵蓋 JavaScript 四種行終止符。
  for (var 次數=0;次數<20;次數++) {
    var 註解 = /^(?:\/\*[\s\S]*?\*\/|\/\/[^\r\n\u2028\u2029]*(?:\r\n|[\r\n\u2028\u2029]|$))/.exec(文字);
    if (!註解) break;
    註解數++;
    文字 = 文字.slice(註解[0].length).trim();
  }
  var 安全回呼 = 回呼.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  var 外框 = '直接回呼';
  if (/^typeof\b/.test(文字)) {
    var 保護樣式 = new RegExp('^typeof\\s+'+安全回呼+'\\s*===\\s*([\"\'])function\\1\\s*&&\\s*');
    var 保護 = 保護樣式.exec(文字);
    智慧5S驗收要求_(!!保護,'JSONP 回呼保護條件不符或使用其他回呼');
    外框 = '函式存在保護回呼';
    文字 = 文字.slice(保護[0].length);
  }
  var 開頭 = new RegExp('^'+安全回呼+'\\s*\\(').exec(文字);
  var 結尾 = /\)\s*;?$/.exec(文字);
  智慧5S驗收要求_(!!開頭 && !!結尾 && 結尾.index>=開頭[0].length,
    'JSONP 未回傳指定回呼或含額外指令');
  var 資料;
  try { 資料 = JSON.parse(文字.slice(開頭[0].length,結尾.index)); }
  catch (錯誤) { throw new Error('驗收未通過：JSONP 回呼內不是單一 JSON 資料'); }
  智慧5S驗收要求_(資料 && typeof 資料==='object' && !Array.isArray(資料),
    'JSONP 回呼內不是資料物件');
  return {資料:資料,外框:外框,前導註解數:註解數};
}
