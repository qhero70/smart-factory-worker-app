

/**
 * 07_報工作業v2_GAS入口.gs
 * 智慧製造中央作戰指揮中心｜報工作業 v2｜途程工站群組全量版 (完美對齊前端 V3 版本)
 *
 * 主資料來源：
 * 1. 2025途程表_產品途程表_含工序補齊：產品 → 報工工站群組 → 多工序
 * 2. 06_途程主檔：補產品編號、客戶品號
 * 3. 04_工站機台關聯：依產品 + 工序群組帶出多機台
 * 4. 06_照片資料庫：人員頭像、產品照片、機台照片
 *
 * 注意：本檔不宣告 doGet / doPost，不影響 LINE Bot 與正式 Web App 主入口。
 */


var 報工作業v2_設定 = {
  HTML檔名: '07_報工作業v2',
  人員主檔: '01_人員主檔',
  途程工站群組: '2025途程表_產品途程表_含工序補齊',
  途程主檔: '06_途程主檔',
  工站產品關聯: '04_工站產品關聯',
  工站機台關聯: '04_工站機台關聯',
  工站班別產能: '04_工站班別產能',
  報工紀錄: '09_報工紀錄',
  照片資料庫: '06_照片資料庫',
  報工照片根資料夾名稱: '06_照片資料庫_報工作業v2',
  人員照片資料夾名稱: '人員照片',
  產品照片資料夾名稱: '產品照片',
  機台照片資料夾名稱: '機台照片',
  工站照片資料夾名稱: '工站照片'
};


function 開啟報工作業v2() {
  return HtmlService.createHtmlOutputFromFile(報工作業v2_設定.HTML檔名)
    .setTitle('報工作業 v2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function 顯示報工作業v2側邊欄() {
  var 畫面 = HtmlService.createHtmlOutputFromFile(報工作業v2_設定.HTML檔名)
    .setTitle('報工作業 v2');
  SpreadsheetApp.getUi().showSidebar(畫面);
}


function 測試開啟報工作業v2入口() {
  return { 成功: true, 訊息: '報工作業 v2 GAS 入口已載入', 測試時間: new Date() };
}


function 取得報工作業v2初始資料() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var 照片索引 = 建立照片索引_報工v2_(ss);


  var 人員 = 讀取工作表為物件陣列_(ss, 報工作業v2_設定.人員主檔)
    .map(整理人員資料_)
    .filter(function(r){ return r.工號 || r.姓名; })
    .map(function(r){
      var p = 取照片資料_報工v2_(照片索引, '人員照片', r.工號);
      r.照片網址 = r.照片網址 || p.照片網址 || '';
      r.縮圖網址 = r.縮圖網址 || p.縮圖網址 || r.照片網址 || '';
      r.Google檔案ID = r.Google檔案ID || p.Google檔案ID || '';
      return r;
    });


  var 途程主檔 = 讀取06途程主檔_報工v2_(ss);
  var 品名索引 = 建立品名補充索引_報工v2_(途程主檔);
  
  var 機台關聯 = 讀取工作表為物件陣列_(ss, 報工作業v2_設定.工站機台關聯)
    .map(整理工站機台關聯_)
    .map(function(r){
      var p = 取照片資料_報工v2_(照片索引, '機台照片', r.機台編號);
      r.照片網址 = r.照片網址 || p.照片網址 || '';
      r.縮圖網址 = r.縮圖網址 || p.縮圖網址 || r.照片網址 || '';
      r.Google檔案ID = r.Google檔案ID || p.Google檔案ID || '';
      return r;
    });
    
  var 工站產品關聯 = 讀取工作表為物件陣列_(ss, 報工作業v2_設定.工站產品關聯)
    .map(整理工站產品關聯_)
    .map(function(r){
      var p = 取照片資料_報工v2_(照片索引, '產品照片', r.產品編號);
      r.照片網址 = r.照片網址 || p.照片網址 || '';
      r.縮圖網址 = r.縮圖網址 || p.縮圖網址 || r.照片網址 || '';
      r.Google檔案ID = r.Google檔案ID || p.Google檔案ID || '';
      return r;
    });
    
  var 工站班別產能 = 讀取工作表為物件陣列_(ss, 報工作業v2_設定.工站班別產能).map(整理工站班別產能_);


  var 途程工站群組 = 建立途程工站群組_報工v2_(ss, 品名索引, 機台關聯, 照片索引);


  return {
    成功: true,
    來源: '07_報工作業v2_GAS入口_途程工站群組全量版_前端完全對齊',
    更新時間: new Date().toISOString(),
    筆數: {
      人員: 人員.length,
      途程工站群組: 途程工站群組.length,
      途程主檔: 途程主檔.length,
      工站產品關聯: 工站產品關聯.length,
      工站機台關聯: 機台關聯.length,
      工站班別產能: 工站班別產能.length,
      照片索引: 照片索引._筆數 || 0
    },
    人員: 人員,
    途程工站群組: 途程工站群組,
    途程主檔: 途程主檔,
    工站產品關聯: 工站產品關聯,
    工站機台關聯: 機台關聯,
    工站班別產能: 工站班別產能,
    班別清單: 取得班別清單_(),
    不良原因: 取得不良原因清單_(),
    異常類型: 取得異常類型清單_()
  };
}


function 建立途程工站群組_報工v2_(ss, 品名索引, 機台關聯, 照片索引) {
  var rows = 讀取工作表為物件陣列_(ss, 報工作業v2_設定.途程工站群組)
    .map(function(r){
      return {
        品名: 取第一個值_(r, ['品名','產品名稱']),
        順序: 取第一個值_(r, ['順序','製程順序']),
        工站名稱: 取第一個值_(r, ['工站名稱','報工工站','工站']),
        工序編號_補齊: 取第一個值_(r, ['工序編號_補齊','工序編號','工序','OP'])
      };
    })
    .filter(function(r){ return r.品名 && r.工站名稱 && r.工序編號_補齊; });


  return rows.map(function(r){
    var 補 = 品名索引[標準文字_(r.品名)] || {};
    var 工序清單 = 拆工序清單_報工v2_(r.工序編號_補齊);
    var machines = 依途程群組找機台_報工v2_(r, 補, 工序清單, 機台關聯, 照片索引);
    var productPhoto = 取照片資料_報工v2_(照片索引, '產品照片', 補.產品編號) || {};
    if (!productPhoto.照片網址) productPhoto = 取照片資料_報工v2_(照片索引, '產品照片', 補.客戶品號) || {};
    if (!productPhoto.照片網址) productPhoto = 取照片資料_報工v2_(照片索引, '產品照片', r.品名) || {};


    return {
      群組ID: [補.產品編號 || '', r.品名, r.順序, r.工站名稱, r.工序編號_補齊].join('|'),
      產品編號: 補.產品編號 || '',
      客戶品號: 補.客戶品號 || '',
      品名: r.品名,
      順序: r.順序,
      報工工站名稱: r.工站名稱,
      工站名稱: r.工站名稱,
      工序: r.工序編號_補齊,
      工序清單: 工序清單,
      工序範圍: 建立工序範圍文字_報工v2_(工序清單),
      機台清單: machines,
      機台編號清單: machines.map(function(m){ return m.機台編號; }).filter(Boolean),
      區域清單: 去重陣列_(machines.map(function(m){ return m.區域; }).filter(Boolean)),
      產品照片網址: productPhoto.照片網址 || '',
      產品縮圖網址: productPhoto.縮圖網址 || productPhoto.照片網址 || '',
      產品照片檔案ID: productPhoto.Google檔案ID || '',
      顯示名稱: r.工站名稱 + '｜' + 建立工序範圍文字_報工v2_(工序清單) + (machines.length ? '｜' + machines.map(function(m){ return m.機台編號; }).filter(Boolean).join('、') : '')
    };
  });
}


function 依途程群組找機台_報工v2_(群組, 補, 工序清單, 機台關聯, 照片索引) {
  var 品名Key = 標準文字_(群組.品名);
  var 工序Map = {};
  工序清單.forEach(function(op){ 工序Map[標準文字_(op)] = true; });


  var matches = 機台關聯.filter(function(m){
    var sameProduct = false;
    if (補.產品編號 && 標準文字_(m.產品編號) === 標準文字_(補.產品編號)) sameProduct = true;
    if (補.客戶品號 && 標準文字_(m.客戶品號) === 標準文字_(補.客戶品號)) sameProduct = true;
    if (標準文字_(m.品名) === 品名Key) sameProduct = true;
    if (!sameProduct) return false;


    var op = 標準文字_(m.工序);
    if (op && 工序Map[op]) return true;
    if (標準文字_(m.工站名稱) === 標準文字_(群組.工站名稱)) return true;
    return false;
  });


  var seen = {};
  return matches.map(function(m){
    var no = m.機台編號 || m.設備名稱 || '';
    var photo = 取照片資料_報工v2_(照片索引, '機台照片', no);
    return {
      機台編號: no,
      設備名稱: m.設備名稱 || '',
      區域: m.區域 || '',
      機台型號: m.機台型號 || '',
      工序: m.工序 || '',
      工站名稱: m.工站名稱 || 群組.工站名稱,
      照片網址: m.照片網址 || photo.照片網址 || '',
      縮圖網址: m.縮圖網址 || photo.縮圖網址 || photo.照片網址 || '',
      Google檔案ID: m.Google檔案ID || photo.Google檔案ID || ''
    };
  }).filter(function(m){
    var key = 標準文字_(m.機台編號 + '|' + m.工序);
    if (seen[key]) return false;
    seen[key] = true;
    return !!m.機台編號;
  });
}


function 讀取06途程主檔_報工v2_(ss) {
  var sh = ss.getSheetByName(報工作業v2_設定.途程主檔);
  if (!sh) return [];
  var values = sh.getDataRange().getDisplayValues();
  if (!values || values.length < 2) return [];
  var headerIndex = 0;
  for (var i = 0; i < Math.min(values.length, 10); i++) {
    if (values[i].indexOf('產品編號') >= 0 && values[i].indexOf('品名') >= 0) { headerIndex = i; break; }
  }
  var header = values[headerIndex].map(function(v){ return String(v || '').trim(); });
  var out = [];
  for (var r = headerIndex + 1; r < values.length; r++) {
    var obj = {};
    header.forEach(function(h, c){ if (h) obj[h] = String(values[r][c] || '').trim(); });
    if (obj.品名 || obj.產品編號) {
      out.push({
        產品編號: obj.產品編號 || '',
        品名: obj.品名 || '',
        客戶品號: obj.客戶品號 || '',
        順序: obj.順序 || '',
        工站名稱: obj.工站名稱 || '',
        工序編號: obj.工序編號 || obj.工序 || '',
        標準工時_分鐘: obj.標準工時_分鐘 || '',
        是否關鍵工序: obj.是否關鍵工序 || '',
        備註: obj.備註 || ''
      });
    }
  }
  return out;
}


function 建立品名補充索引_報工v2_(途程主檔) {
  var index = {};
  途程主檔.forEach(function(r){
    var key = 標準文字_(r.品名);
    if (!key) return;
    if (!index[key]) index[key] = { 產品編號: r.產品編號 || '', 客戶品號: r.客戶品號 || '' };
    if (!index[key].產品編號 && r.產品編號) index[key].產品編號 = r.產品編號;
    if (!index[key].客戶品號 && r.客戶品號) index[key].客戶品號 = r.客戶品號;
  });
  return index;
}


function 寫入報工作業v2(資料) {
  if (!資料) throw new Error('沒有收到報工資料');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var 報工表 = 取得或建立報工紀錄表_(ss);
  var 照片表 = 取得或建立照片資料庫表_(ss);


  var 今日共做數 = 轉數字_(資料.今日共做數);
  var 不良數 = 轉數字_(資料.不良數);
  var 實際良品數 = 轉數字_(資料.實際良品數) || Math.max(今日共做數 - 不良數, 0);
  var 不良率 = 轉數字_(資料.不良率) || (今日共做數 > 0 ? 不良數 / 今日共做數 : 0);
  
  var 報工編號 = 產生報工編號_();
  var 時間戳 = new Date();
  var 作業日 = 取得作業日_(時間戳);
  var 照片上傳結果 = 儲存報工照片清單_(資料.現場照片清單 || 資料.照片清單 || [], { 
    報工編號: 報工編號, 
    作業日: 作業日, 
    工號: 資料.工號, 
    產品編號: 資料.產品編號, 
    機台清單: 資料.機台清單 
  });


  照片上傳結果.forEach(function(item){
    照片表.appendRow([
      item.照片ID, item.時間戳, item.作業日, item.報工編號, item.照片類型,
      item.對應主鍵, item.檔案名稱, item.Google檔案ID, item.照片網址,
      item.縮圖網址, item.MIME類型, item.檔案大小, '是', item.備註
    ]);
  });


  // 完美對齊 40 個欄位，100% 對稱前端拋送的 JSON 物件
  報工表.appendRow([
    報工編號, 時間戳, 作業日,
    安全文字_(資料.工號), 安全文字_(資料.姓名), 安全文字_(資料.班別), 安全文字_(資料.是否加班), 安全文字_(資料.加班類型),
    安全文字_(資料.作業員照片網址), 安全文字_(資料.作業員縮圖網址), 安全文字_(資料.作業員照片檔案ID),
    安全文字_(資料.產品編號), 安全文字_(資料.客戶品號), 安全文字_(資料.品名),
    安全文字_(資料.產品照片網址), 安全文字_(資料.產品縮圖網址), 安全文字_(資料.產品照片檔案ID),
    安全文字_(資料.工站名稱), 安全文字_(資料.報工工站名稱), 安全文字_(資料.工序), 安全文字_(資料.工序清單),
    安全文字_(資料.機台清單), 安全文字_(資料.主機台), JSON.stringify(資料.機台照片清單 || []),
    今日共做數, 不良數, 實際良品數, 不良率,
    安全文字_(資料.開始時間), 安全文字_(資料.結束時間), 安全文字_(資料.實際工時),
    安全文字_(資料.不良類別), 安全文字_(資料.不良代碼), 安全文字_(資料.不良原因), 安全文字_(資料.異常類型), 安全文字_(資料.備註),
    照片上傳結果.map(function(x){return x.照片類型 + ':' + x.照片網址;}).join('\n'),
    照片上傳結果.map(function(x){return x.Google檔案ID;}).join(','),
    '報工作業v3_對齊版', '正常'
  ]);


  return { 
    成功: true, 
    訊息: '報工資料已寫入 09_報工紀錄', 
    報工編號: 報工編號, 
    作業日: 作業日, 
    今日共做數: 今日共做數, 
    不良數: 不良數, 
    實際良品數: 實際良品數, 
    不良率: 不良率, 
    照片數: 照片上傳結果.length, 
    寫入時間: new Date().toISOString() 
  };
}


function 測試途程工站群組_報工v2() {
  var data = 取得報工作業v2初始資料();
  var result = { 成功: true, 途程工站群組筆數: data.筆數.途程工站群組, 前10筆: data.途程工站群組.slice(0, 10) };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function 測試06照片索引_報工v2() {
  var index = 建立照片索引_報工v2_(SpreadsheetApp.getActiveSpreadsheet());
  var result = { 成功: true, 照片索引總筆數: index._筆數 || 0, 人員照片筆數: Object.keys(index.人員照片 || {}).length, 產品照片筆數: Object.keys(index.產品照片 || {}).length, 機台照片筆數: Object.keys(index.機台照片 || {}).length, 工站照片筆數: Object.keys(index.工站照片 || {}).length, 人員照片前5筆: Object.keys(index.人員照片 || {}).slice(0,5), 產品照片前5筆: Object.keys(index.產品照片 || {}).slice(0,5), 機台照片前5筆: Object.keys(index.機台照片 || {}).slice(0,5), 測試時間: new Date() };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function 重建06照片資料庫索引_從Drive資料夾() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = 取得或建立照片資料庫表_(ss);
  sh.clear();
  var header = ['照片ID','時間戳','作業日','報工編號','照片類型','對應主鍵','檔案名稱','Google檔案ID','照片網址','縮圖網址','MIME類型','檔案大小','啟用','備註'];
  sh.getRange(1,1,1,header.length).setValues([header]);
  sh.setFrozenRows(1);
  var cfgs = [
    {資料夾名稱:報工作業v2_設定.人員照片資料夾名稱,照片類型:'人員照片',說明:'檔名請用工號'},
    {資料夾名稱:報工作業v2_設定.產品照片資料夾名稱,照片類型:'產品照片',說明:'檔名請用產品編號'},
    {資料夾名稱:報工作業v2_設定.機台照片資料夾名稱,照片類型:'機台照片',說明:'檔名請用機台編號'},
    {資料夾名稱:報工作業v2_設定.工站照片資料夾名稱,照片類型:'工站照片',說明:'檔名請用工站代碼'}
  ];
  var rows = [], report = [];
  cfgs.forEach(function(cfg){
    var folders = DriveApp.getFoldersByName(cfg.資料夾名稱), folderCount = 0, photoCount = 0;
    while (folders.hasNext()) {
      folderCount++;
      var files = folders.next().getFiles();
      while (files.hasNext()) {
        var file = files.next(), mime = file.getMimeType(), name = file.getName();
        if (!/^image\//i.test(mime)) continue;
        photoCount++;
        var id = file.getId();
        try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
        rows.push(['PH' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmssSSS') + '_' + String(rows.length + 1).padStart(4,'0'), new Date(), '', '', cfg.照片類型, 標準化照片主鍵_報工v2_(name), name, id, 'https://drive.google.com/file/d/' + id + '/view', 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800', mime, file.getSize(), '是', 'Drive資料夾自動索引｜' + cfg.資料夾名稱 + '｜' + cfg.說明]);
      }
    }
    report.push({資料夾名稱:cfg.資料夾名稱,照片類型:cfg.照片類型,找到資料夾數:folderCount,找到照片數:photoCount});
  });
  if (rows.length) sh.getRange(2,1,rows.length,header.length).setValues(rows);
  return {成功:true, 訊息:'06_照片資料庫索引已重建', 寫入筆數: rows.length, 掃描報告: report};
}


function 建立照片索引_報工v2_(ss) {
  var sh = ss.getSheetByName(報工作業v2_設定.照片資料庫);
  var index = {_筆數:0, 人員照片:{}, 產品照片:{}, 機台照片:{}, 工站照片:{}};
  if (!sh || sh.getLastRow() < 2) return index;
  var data = sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getDisplayValues();
  var header = data[0].map(function(v){return String(v || '').trim();});
  var pos = {}; header.forEach(function(h,i){if(h) pos[h]=i;});
  for (var r=1;r<data.length;r++) {
    var row = data[r];
    var type = 取照片欄位值_報工v2_(row,pos,['照片類型','類型']);
    var key = 標準化照片主鍵_報工v2_(取照片欄位值_報工v2_(row,pos,['對應主鍵','對應編號','工號','產品編號','機台編號']));
    var enabled = 取照片欄位值_報工v2_(row,pos,['啟用','狀態']) || '是';
    if (!type || !key || enabled === '否' || enabled === '停用') continue;
    var id = 取照片欄位值_報工v2_(row,pos,['Google檔案ID','Google檔案Id','檔案ID','File ID']);
    var url = 取照片欄位值_報工v2_(row,pos,['照片網址','圖片網址','檔案網址','URL']);
    var thumb = 取照片欄位值_報工v2_(row,pos,['縮圖網址','縮圖','Thumbnail']);
    if (!id && url) id = 從Drive網址取檔案ID_報工v2_(url);
    if (!url && id) url = 'https://drive.google.com/file/d/' + id + '/view';
    if (!thumb && id) thumb = 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800';
    if (!url && !thumb) continue;
    if (!index[type]) index[type] = {};
    index[type][key] = {照片類型:type, 對應主鍵:key, Google檔案ID:id, 照片網址:url, 縮圖網址:thumb || url};
    index._筆數++;
  }
  return index;
}


function 取照片資料_報工v2_(idx, type, key) {
  var k = 標準化照片主鍵_報工v2_(key);
  return (idx && idx[type] && k && idx[type][k]) ? idx[type][k] : {};
}


function 取照片欄位值_報工v2_(row,pos,names){ for(var i=0;i<names.length;i++){ if(pos[names[i]]!==undefined){ var v=String(row[pos[names[i]]]||'').trim(); if(v) return v; } } return ''; }
function 標準化照片主鍵_報工v2_(v){ return String(v||'').trim().replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i,'').toUpperCase(); }
function 從Drive網址取檔案ID_報工v2_(url){ var t=String(url||'').trim(), m; if(!t) return ''; m=t.match(/\/file\/d\/([^/]+)/); if(m&&m[1]) return m[1]; m=t.match(/[?&]id=([^&]+)/); return m&&m[1]?m[1]:''; }


function 儲存報工照片清單_(list, meta) {
  var out = [];
  if (!list || !Array.isArray(list) || list.length === 0) return out;
  var root = 取得或建立Drive資料夾_(報工作業v2_設定.報工照片根資料夾名稱);
  var day = 取得或建立子資料夾_(root, meta.作業日 || 取得作業日_(new Date()));
  var folder = 取得或建立子資料夾_(day, meta.報工編號);
  list.forEach(function(p,i){
    if(!p || !p.Base64) return;
    var mime = p.MIME類型 || 'image/jpeg', ext = mime.indexOf('png') >= 0 ? 'png' : 'jpg';
    var filename = [meta.報工編號, 安全文字_(p.照片類型 || '報工照片'), 安全文字_(meta.產品編號 || meta.工號 || meta.報工編號).replace(/[\\/:*?"<>|#%&{}$!@`']/g,'_'), String(i+1).padStart(2,'0')].join('_') + '.' + ext;
    var bytes = Utilities.base64Decode(p.Base64);
    var file = folder.createFile(Utilities.newBlob(bytes, mime, filename));
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
    var id = file.getId();
    out.push({照片ID:'PH' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmssSSS') + '_' + String(i+1), 時間戳:new Date(), 作業日:meta.作業日, 報工編號:meta.報工編號, 照片類型:安全文字_(p.照片類型 || '報工照片'), 對應主鍵:meta.報工編號, 檔案名稱:filename, Google檔案ID:id, 照片網址:'https://drive.google.com/file/d/' + id + '/view', 縮圖網址:'https://drive.google.com/thumbnail?id=' + id + '&sz=w800', MIME類型:mime, 檔案大小:bytes.length, 備註:安全文字_(p.備註 || '')});
  });
  return out;
}


function 取得或建立Drive資料夾_(name){ var it=DriveApp.getFoldersByName(name); return it.hasNext()?it.next():DriveApp.createFolder(name); }
function 取得或建立子資料夾_(parent,name){ var it=parent.getFoldersByName(name); return it.hasNext()?it.next():parent.createFolder(name); }


function 取得或建立報工紀錄表_(ss) {
  var sh = ss.getSheetByName(報工作業v2_設定.報工紀錄) || ss.insertSheet(報工作業v2_設定.報工紀錄);
  // 對齊的 40 個欄位，涵蓋所有前端上報資料
  var h = [
    '報工編號','時間戳','作業日',
    '工號','姓名','班別','是否加班','加班類型',
    '作業員照片網址','作業員縮圖網址','作業員照片檔案ID',
    '產品編號','客戶品號','品名',
    '產品照片網址','產品縮圖網址','產品照片檔案ID',
    '工站名稱','報工工站名稱','工序','工序清單',
    '機台清單','主機台','機台照片清單',
    '今日共做數','不良數','實際良品數','不良率',
    '開始時間','結束時間','實際工時',
    '不良類別','不良代碼','不良原因','異常類型','備註',
    '現場照片網址','現場照片檔案ID',
    '來源','狀態'
  ];
  sh.getRange(1,1,1,h.length).setValues([h]); 
  sh.setFrozenRows(1); 
  return sh;
}


function 取得或建立照片資料庫表_(ss) { 
  var sh=ss.getSheetByName(報工作業v2_設定.照片資料庫)||ss.insertSheet(報工作業v2_設定.照片資料庫); 
  if(sh.getLastRow()===0){ 
    var h=['照片ID','時間戳','作業日','報工編號','照片類型','對應主鍵','檔案名稱','Google檔案ID','照片網址','縮圖網址','MIME類型','檔案大小','啟用','備註']; 
    sh.getRange(1,1,1,h.length).setValues([h]); 
    sh.setFrozenRows(1); 
  } 
  return sh; 
}


function 讀取工作表為物件陣列_(ss, name){ 
  var sh=ss.getSheetByName(name); 
  if(!sh||sh.getLastRow()<2) return []; 
  var data=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getDisplayValues(); 
  var h=data[0].map(function(v){return String(v||'').trim();}); 
  return data.slice(1).map(function(row,i){
    var o={_列號:i+2}; 
    h.forEach(function(k,c){if(k) o[k]=String(row[c]||'').trim();}); 
    return o;
  }).filter(function(o){
    return Object.keys(o).some(function(k){return k !== '_列號' && String(o[k]||'').trim() !== '';});
  }); 
}


function 整理人員資料_(r){ 
  return {
    _列號:r._列號||'', 
    工號:取第一個值_(r,['工號','員工編號','人員編號','ID','Employee ID']), 
    姓名:取第一個值_(r,['姓名','人員姓名','中文名','Name']), 
    英文名:取第一個值_(r,['英文名','English Name']), 
    部門:取第一個值_(r,['部門','單位']), 
    組別:取第一個值_(r,['組別','課別']), 
    職稱:取第一個值_(r,['職稱','職務']), 
    班別:取第一個值_(r,['班別','班別名稱','預設班別']), 
    照片網址:取第一個值_(r,['照片網址','頭像網址','圖片網址']), 
    縮圖網址:取第一個值_(r,['縮圖網址','頭像縮圖']), 
    Google檔案ID:取第一個值_(r,['Google檔案ID','檔案ID']),
    啟用:取第一個值_(r,['啟用','狀態'])||'是'
  }; 
}


function 整理工站產品關聯_(r){ 
  return {
    _列號:r._列號||'', 
    產品編號:取第一個值_(r,['產品編號','料號','產品料號']), 
    客戶品號:取第一個值_(r,['客戶品號','客戶料號']), 
    品名:取第一個值_(r,['品名','產品名稱']), 
    工序:取第一個值_(r,['工序','OP','製程']), 
    工站代碼:取第一個值_(r,['工站代碼','工站編號']), 
    工站名稱:取第一個值_(r,['工站名稱','工站']), 
    照片網址:取第一個值_(r,['照片網址','產品照片','圖片網址']), 
    縮圖網址:取第一個值_(r,['縮圖網址','產品縮圖']), 
    Google檔案ID:取第一個值_(r,['Google檔案ID','檔案ID']),
    啟用:取第一個值_(r,['啟用','狀態'])||'是'
  }; 
}


function 整理工站機台關聯_(r){ 
  return {
    _列號:r._列號||'', 
    工站代碼:取第一個值_(r,['工站代碼','工站編號']), 
    工站名稱:取第一個值_(r,['工站名稱','工站']), 
    產品編號:取第一個值_(r,['產品編號','料號','產品料號']), 
    客戶品號:取第一個值_(r,['客戶品號','客戶料號']), 
    品名:取第一個值_(r,['品名','產品名稱']), 
    工序:取第一個值_(r,['工序','OP','製程']), 
    工序類型:取第一個值_(r,['工序類型','製程類型']), 
    區域:取第一個值_(r,['區域','廠區']), 
    機台編號:取第一個值_(r,['機台編號','機台','設備編號']), 
    設備名稱:取第一個值_(r,['設備名稱','機台名稱']), 
    機台型號:取第一個值_(r,['機台型號','型號']), 
    照片網址:取第一個值_(r,['照片網址','機台照片','圖片網址']), 
    縮圖網址:取第一個值_(r,['縮圖網址','機台縮圖']), 
    Google檔案ID:取第一個值_(r,['Google檔案ID','檔案ID']),
    啟用:取第一個值_(r,['啟用','狀態'])||'是'
  }; 
}


function 整理工站班別產能_(r){ 
  return {
    _列號:r._列號||'', 
    產品編號:取第一個值_(r,['產品編號','料號','產品料號']), 
    客戶品號:取第一個值_(r,['客戶品號','客戶料號']), 
    品名:取第一個值_(r,['品名','產品名稱']), 
    工站代碼:取第一個值_(r,['工站代碼','工站編號']), 
    工站名稱:取第一個值_(r,['工站名稱','工站']), 
    工序:取第一個值_(r,['工序','OP','製程']), 
    班別:取第一個值_(r,['班別','班別名稱'])||'早班', 
    標準產能:取第一個值_(r,['標準產能','班別產能','8小時標準產能','產能']), 
    標準工時_秒:取第一個值_(r,['標準工時_秒','標準工時']), 
    啟用:取第一個值_(r,['啟用','狀態'])||'是'
  }; 
}


function 取得班別清單_(){ return [{值:'自動判斷',名稱:'自動判斷 / Auto'},{值:'早班',名稱:'早班 / Day Shift'},{值:'中班',名稱:'中班 / Middle Shift'},{值:'大夜班',名稱:'大夜班 / Night Shift'},{值:'加班',名稱:'加班 / Overtime'}]; }
function 取得異常類型清單_(){ return ['無異常 / Normal','機台停機 / Machine Down','待料 / Waiting Material','換刀 / Tool Change','品質確認 / Quality Check','人員支援 / Manpower Support','換線 / Line Change','其他 / Others']; }
function 取得不良原因清單_(){ 
  return {
    Z:[{代碼:'Z01',名稱:'缺肉',英文:'Short Shot'},{代碼:'Z02',名稱:'加工砂孔',英文:'Machining Blowhole'},{代碼:'Z03',名稱:'黑皮',英文:'Black Skin'},{代碼:'Z04',名稱:'落砂',英文:'Sand Drop'},{代碼:'Z05',名稱:'變形',英文:'Deformation'},{代碼:'Z06',名稱:'錯模',英文:'Mismatch'},{代碼:'Z07',名稱:'試漏',英文:'Leakage Test'},{代碼:'Z08',名稱:'生鏽',英文:'Rust'},{代碼:'Z09',名稱:'裂痕',英文:'Crack'},{代碼:'Z98',名稱:'託外加工不良',英文:'Outsource NG'},{代碼:'Z99',名稱:'素材不良退料',英文:'Material Return'}],
    Y:[{代碼:'Y01',名稱:'內徑',英文:'Inner Dia.'},{代碼:'Y02',名稱:'外徑',英文:'Outer Dia.'},{代碼:'Y03',名稱:'平坦度',英文:'Flatness'},{代碼:'Y04',名稱:'螺牙',英文:'Thread'},{代碼:'Y05',名稱:'碰傷',英文:'Dent/Scratch'},{代碼:'Y06',名稱:'震刀',英文:'Chatter Mark'},{代碼:'Y11',名稱:'刀具斷',英文:'Broken Tool'},{代碼:'Y13',名稱:'饒隙',英文:'Clearance'},{代碼:'Y15',名稱:'換線',英文:'Line Change'},{代碼:'Y24',名稱:'刀具異常',英文:'Tool NG'},{代碼:'Y30',名稱:'試漏',英文:'Leakage Test'},{代碼:'Y33',名稱:'擦痕',英文:'Scratch'}]
  }; 
}


function 取得作業日_(d){ 
  d=new Date(d); 
  var h=d.getHours(), m=d.getMinutes(); 
  if(h<6||(h===6&&m<10)) d.setDate(d.getDate()-1); 
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); 
}


function 產生報工編號_(){ 
  return 'WR' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmssSSS'); 
}


function 取第一個值_(row,names){ 
  for(var i=0;i<names.length;i++){ 
    var k=names[i]; 
    if(row[k]!==undefined && row[k]!==null && String(row[k]).trim() !== '') 
      return String(row[k]).trim(); 
  } 
  return ''; 
}


function 安全文字_(v){ return v===undefined||v===null?'':String(v).trim(); }
function 轉數字_(v){ var n=Number(v); return isNaN(n)?0:n; }
function 標準文字_(v){ return String(v||'').trim().toUpperCase().replace(/\s+/g,' '); }
function 拆工序清單_報工v2_(text){ return String(text||'').split(/[、,，;；\s]+/).map(function(v){return v.trim();}).filter(Boolean); }
function 建立工序範圍文字_報工v2_(ops){ if(!ops||!ops.length) return ''; if(ops.length===1) return ops[0]; return ops[0] + '~' + ops[ops.length-1]; }
function 去重陣列_(arr){ var s={}, out=[]; (arr||[]).forEach(function(v){ if(v && !s[v]){s[v]=true; out.push(v);} }); return out; }





