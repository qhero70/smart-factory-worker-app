/**
 * 化新精密｜智慧5S 正式回呼「唯讀診斷」1.0.0
 * 新增一個「智慧5S_正式回呼唯讀診斷」指令碼檔，貼入本檔全部內容。
 * 儲存後只執行「診斷_智慧5S正式回呼」；不用部署，也不用重跑第一階段。
 * 不要覆蓋 GAS 後端入口、doGet、doPost 或既有驗收工具。
 * 僅以讀取參數檢查既有 5S_連線驗收，請求上限 10 筆。
 * 不寫入試算表／屬性、不新增驗收列、不發通知、不接觸手機資料。
 * 不輸出回覆原文、資料列、Cookie、權杖或重新導向網址；不執行回覆程式。
 * 診斷完成不等於正式驗收通過；將最後四行「5S唯讀診斷」記錄提供核對。
 * API 依據：https://developers.google.com/apps-script/reference/url-fetch/http-response
 * https://developers.google.com/apps-script/reference/content/text-output
 */

function 智慧5S回呼診斷_設定_() {
  return {
    網址:'https://script.google.com/macros/s/AKfycby2ghuwkxTr1kbt2bU9D3U24O55c6GhcabA1IhDC67OEw86pH6MjS3nnBMASnjEmggw/exec',
    主庫ID:'19osmTlQQ9obDmVvmv5uphFHRwCtd2pkFhe6p3pYMSn8',
    分頁:'5S_連線驗收',回呼:'smart5s_verify_1391'
  };
}

function 診斷_智慧5S正式回呼() {
  var 設定 = 智慧5S回呼診斷_設定_();
  var 編輯器 = {有doGet:typeof doGet==='function',
    有1394輸出函式:typeof 主檔_智慧5S讀取輸出_==='function',
    doGet含1394接點:false};
  try {
    if (編輯器.有doGet) {
      // 僅觀察目前生效函式；不列印來源、不假設能由此查出全部重複定義。
      編輯器.doGet含1394接點 = Function.prototype.toString.call(doGet)
        .indexOf('主檔_智慧5S讀取輸出_')>=0;
      var 參數 = 智慧5S回呼診斷_參數_(設定,true);
      var 多值 = {};
      Object.keys(參數).forEach(function (鍵) { 多值[鍵]=[參數[鍵]]; });
      var 本機輸出 = doGet({parameter:參數,parameters:多值,
        queryString:智慧5S回呼診斷_查詢_(參數),contentLength:-1,pathInfo:''});
      if (!本機輸出 || typeof 本機輸出.getContent!=='function') {
        編輯器.回覆 = {格式:'沒有可讀文字輸出'};
      } else {
        編輯器.回覆 = 智慧5S回呼診斷_分類_(本機輸出.getContent(),設定);
        編輯器.回覆.MIME = typeof 本機輸出.getMimeType==='function' ?
          智慧5S回呼診斷_安全MIME_(本機輸出.getMimeType()) : '未提供';
      }
    }
  } catch (錯誤) {
    編輯器.回覆 = 智慧5S回呼診斷_例外_(錯誤);
  }
  console.log('5S唯讀診斷 1/4 編輯器 '+JSON.stringify(編輯器));
  // 兩條正式讀取各一次，互不因對方失敗而省略；不 POST、不重試。
  var 正式GET = 智慧5S回呼診斷_HTTP_(設定,false);
  console.log('5S唯讀診斷 2/4 正式GET '+JSON.stringify(正式GET));
  var 正式JSONP = 智慧5S回呼診斷_HTTP_(設定,true);
  console.log('5S唯讀診斷 3/4 正式JSONP '+JSON.stringify(正式JSONP));
  var 結果 = {工具版本:'1.0.0',狀態:'診斷完成，不代表正式驗收通過',
    初步判讀:智慧5S回呼診斷_判讀_(編輯器,正式JSONP),
    手機資料:'未讀取、未同步、未清除',
    下一步:'提供本次四行 5S唯讀診斷 記錄，先不要重新部署或重跑寫入驗收'};
  console.log('5S唯讀診斷 4/4 摘要 '+JSON.stringify(結果));
  return {摘要:結果,編輯器:編輯器,正式GET:正式GET,正式JSONP:正式JSONP};
}

function 智慧5S回呼診斷_參數_(設定, 使用JSONP) {
  // 全部值使用字串，與真正的 Web App e.parameter 一致。
  var 參數 = {action:'sheetData',動作:'sheetData',api:'讀取分頁資料',
    spreadsheetId:設定.主庫ID,試算表識別碼:設定.主庫ID,
    sheet:設定.分頁,sheetName:設定.分頁,分頁名稱:設定.分頁,工作表名稱:設定.分頁,
    limit:'10',上限:'10',query:'',查詢:'',_:String(Date.now())};
  if (使用JSONP) 參數.callback = 設定.回呼;
  return 參數;
}

function 智慧5S回呼診斷_查詢_(參數) {
  return Object.keys(參數).map(function (鍵) {
    return encodeURIComponent(鍵)+'='+encodeURIComponent(參數[鍵]);
  }).join('&');
}

function 智慧5S回呼診斷_HTTP_(設定, 使用JSONP) {
  try {
    var 參數 = 智慧5S回呼診斷_參數_(設定,使用JSONP);
    var 回應 = UrlFetchApp.fetch(設定.網址+'?'+智慧5S回呼診斷_查詢_(參數),{
      method:'get',followRedirects:true,muteHttpExceptions:true});
    var 結果 = 智慧5S回呼診斷_分類_(回應.getContentText(),設定);
    結果.HTTP = 回應.getResponseCode();
    var 標頭 = 回應.getAllHeaders();
    var MIME鍵 = Object.keys(標頭).filter(function (鍵) {
      return 鍵.toLowerCase()==='content-type';
    })[0];
    結果.MIME = MIME鍵 ? 智慧5S回呼診斷_安全MIME_(標頭[MIME鍵]) : '未提供';
    return 結果;
  } catch (錯誤) {
    return 智慧5S回呼診斷_例外_(錯誤);
  }
}

function 智慧5S回呼診斷_安全MIME_(值) {
  // 不輸出任意標頭值或其參數。
  var MIME = String(Array.isArray(值) ? 值[0] : 值).split(';')[0].trim().toLowerCase();
  return ['application/json','application/javascript','text/javascript','text/html',
    'text/plain','application/octet-stream','json','javascript','html','text'].indexOf(MIME)>=0 ?
    MIME : '其他格式';
}

function 智慧5S回呼診斷_分類_(原文, 設定) {
  var 文字 = String(原文);
  var 修整 = 文字.replace(/^\uFEFF/,'').trim();
  var 結果 = {字元數:文字.length,格式:'其他文字',
    指定字首吻合:修整.indexOf(設定.回呼+'(')===0,
    原驗收外框符合:修整.indexOf(設定.回呼+'(')===0 && /\);?$/.test(修整),
    含BOM:文字.charAt(0)==='\uFEFF',前導註解數:0};
  if (!修整) { 結果.格式='空白回覆'; return 結果; }
  try {
    var 純JSON = JSON.parse(修整);
    結果.格式='JSON';
    結果.資料摘要=智慧5S回呼診斷_資料摘要_(純JSON,設定);
    return 結果;
  } catch (忽略純JSON) {}
  var 主體 = 修整;
  // 只移除開頭註解以分類，不放寬原驗收斷言，不執行任何回覆程式。
  for (var 次數=0;次數<20;次數++) {
    var 註解 = /^(?:\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))/.exec(主體);
    if (!註解) break;
    結果.前導註解數++;
    主體 = 主體.slice(註解[0].length).trim();
  }
  if (/^<(?:!doctype\s+html|html\b|head\b|body\b|title\b|div\b|script\b|!--)/i.test(主體)) {
    結果.格式='HTML';
    結果.頁面線索={
      登入提示:/accounts\.google\.com|sign\s*in|登入|登录|type\s*=\s*["']password/i.test(主體),
      權限提示:/access denied|permission|authorization|unauthorized|權限|授權|拒絕存取/i.test(主體),
      程式錯誤提示:/Script function not found|ReferenceError|TypeError|Exception|發生錯誤/i.test(主體),
      配額提示:/quota|too many times|配額|超過.*次數/i.test(主體),
      含指定回呼文字:主體.indexOf(設定.回呼)>=0};
    return 結果;
  }
  var 回呼開頭 = /^([A-Za-z_$][0-9A-Za-z_$]*(?:\.[A-Za-z_$][0-9A-Za-z_$]*)*)\s*\(/.exec(主體);
  if (回呼開頭) {
    結果.回傳回呼 = 回呼開頭[1].length<=80 ? 回呼開頭[1] : '名稱過長已省略';
    結果.回呼名稱相符 = 回呼開頭[1]===設定.回呼;
    結果.名稱後有空白 = 回呼開頭[0]!==回呼開頭[1]+'(';
    var 結尾 = /\)\s*;?\s*$/.exec(主體);
    if (結尾) {
      try {
        var JSONP資料 = JSON.parse(主體.slice(回呼開頭[0].length,結尾.index));
        結果.格式='JSONP';
        結果.資料摘要=智慧5S回呼診斷_資料摘要_(JSONP資料,設定);
        return 結果;
      } catch (忽略JSONP資料) {}
    }
    結果.格式='回呼樣式但資料不可解析';
  }
  結果.其他外框線索={含指定回呼文字:主體.indexOf(設定.回呼)>=0,
    含typeof保護:/^typeof\b/.test(主體),含try外框:/^try\s*\{/.test(主體),
    含防劫持前綴:/^\)\]\}'/.test(主體)};
  return 結果;
}

function 智慧5S回呼診斷_資料摘要_(資料, 設定) {
  if (資料===null) return {型別:'null'};
  if (Array.isArray(資料)) return {型別:'array',陣列長度:資料.length};
  if (typeof 資料!=='object') return {型別:typeof 資料};
  var 主體 = 資料;
  var 摘要 = {型別:'object'};
  ['結果','result','data'].some(function (鍵) {
    if (資料[鍵] && typeof 資料[鍵]==='object' && !Array.isArray(資料[鍵])) {
      主體=資料[鍵];摘要.包裝層=鍵;return true;
    }
    return false;
  });
  [資料,主體].forEach(function (物件, 序) {
    if (序===1 && 主體===資料) return;
    var 層 = {};
    ['成功','ok','success'].forEach(function (鍵) {
      if (物件[鍵]!==undefined) 層[鍵]=typeof 物件[鍵]==='boolean' ? 物件[鍵] : '非布林值';
    });
    層.含錯誤欄位=!!(物件.error || 物件.錯誤);
    層.主庫吻合=物件.主庫ID===undefined ? '未提供' : 物件.主庫ID===設定.主庫ID;
    ['讀取版本','版本'].forEach(function (鍵) {
      if (物件[鍵]!==undefined) {
        var 版本=String(物件[鍵]);
        層[鍵]=版本.length<=24 && /^\d+(?:\.\d+){1,4}$/.test(版本) ? 版本 : '非版本號，已省略';
      }
    });
    if (Number.isInteger(物件.筆數) && 物件.筆數>=0) 層.筆數=物件.筆數;
    ['rows','資料列','資料','data'].some(function (鍵) {
      if (Array.isArray(物件[鍵])) { 層.資料列欄位=鍵;層.資料列數=物件[鍵].length;return true; }
      return false;
    });
    摘要[序===0 ? '外層' : '內層']=層;
  });
  return 摘要;
}

function 智慧5S回呼診斷_例外_(錯誤) {
  var 文字=String(錯誤 && 錯誤.message || 錯誤);
  var 名稱=錯誤 && 錯誤.name;
  return {格式:'執行例外',錯誤類型:['Error','TypeError','ReferenceError','SyntaxError'].indexOf(名稱)>=0 ? 名稱 : '其他例外',
    線索:{權限:/permission|authorization|unauthorized|權限|授權/i.test(文字),
      缺少函式:/not defined|not a function|function not found|找不到.*函式/i.test(文字),
      配額:/quota|too many|配額|超過.*次數/i.test(文字),
      連線:/timeout|timed out|DNS|SSL|connection|逾時|連線/i.test(文字)},
    原文:'未輸出，避免帶出網址或敏感資料'};
}

function 智慧5S回呼診斷_判讀_(編輯器, 正式) {
  if (正式.格式==='執行例外') return '正式回呼請求未取得可分類回覆，需核對例外線索';
  if (正式.HTTP!==200) return '正式回呼 HTTP 狀態非 200，需核對狀態與頁面線索';
  if (正式.格式==='HTML') return '正式回呼請求收到 HTML，並非指定 JSONP；頁面線索僅供定位';
  if (正式.格式==='JSON') {
    return 編輯器.回覆 && 編輯器.回覆.原驗收外框符合 ?
      '編輯器可產生指定回呼，但正式網址回傳純 JSON；需核對正式部署與目前入口是否一致' :
      '正式網址回傳純 JSON；需核對目前入口是否處理 callback，不能由此單獨認定未部署';
  }
  if (正式.格式==='JSONP') {
    if (!正式.回呼名稱相符) return '正式網址回傳另一個回呼名稱，與原驗收要求不符';
    if (!正式.原驗收外框符合) return '回呼名稱相符，但空白或前導註解等外框差異不符合現有驗收；尚未驗證資料內容';
    return '本次回呼外框符合原驗收要求；不代表資料值正確或手機同步完成';
  }
  return '正式回覆不是可解析的 JSONP；先核對格式，不修改驗收成功條件';
}
