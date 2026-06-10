/**
 * 智慧製造中央作戰指揮中心｜正式主後端
 * 版本：v1.6.6｜報工V2照片班別時間修正版 + LINE Bot + 不良代碼主檔
 *
 * 正式入口：
 * 1. 報工頁：GAS Web App URL?page=07_報工作業V2
 * 2. LINE Bot Webhook：GAS Web App URL
 *
 * 本檔是唯一正式 doGet / doPost 入口。
 */

const 系統設定 = {
  系統名稱: '智慧製造中央作戰指揮中心',
  版本: 'v1.6.6_報工V2照片班別時間修正版_LINEBot_不良代碼主檔',
  時區: 'Asia/Taipei',
  主資料庫ID: '',
  LINE_CHANNEL_ACCESS_TOKEN: '',
  報工頁面參數: '?page=07_報工作業V2'
};

const 正式工作表規格 = {
  '00_系統設定': ['項目', '數值', '備註', '最後更新時間'],
  '01_人員主檔': ['工號', '姓名', '部門', '組別', '職稱', '班別', 'LINE_USER_ID', '啟用', '備註', '更新時間'],
  '02_產品主檔': ['產品編號', '客戶品號', '品名', '分類', '標準工時_秒', '標準產能_班', '啟用', '備註', '更新時間'],
  '03_機台主檔': ['機台編號', '機台名稱', '區域', '組別', '型號', '加工材質', '另裝配備', '狀態', '啟用', '更新時間'],
  '04_工站主檔': ['工站代碼', '工站名稱', '產品編號', '機台編號清單', '標準人力', '標準產能_班', '啟用', '備註', '更新時間'],
  '05_共用資料': ['資料類型', '代碼', '名稱', '排序', '啟用', '備註'],
  '05_不良代碼主檔': ['分類', '不良代碼', '不良名稱', '英文名稱', '備註'],
  '09_報工': ['報工編號', '時間戳', '作業日', '工號', '姓名', '班別', '是否加班', '加班類型', '作業員照片網址', '作業員縮圖網址', '作業員照片檔案ID', '產品編號', '客戶品號', '品名', '產品照片網址', '產品縮圖網址', '產品照片檔案ID', '工站名稱', '報工工站名稱', '工序', '工序清單', '機台清單', '主機台', '機台照片清單JSON', '今日共做數', '不良數', '實際良品數', '不良率', '開始時間', '結束時間', '實際工時', '不良類別', '不良代碼', '不良原因', '異常類型', '備註', '現場照片JSON', '來源', '狀態', '更新時間'],
  '09_不良紀錄': ['流水號', '報工編號', '時間戳', '作業日', '工號', '姓名', '班別', '產品編號', '客戶品號', '品名', '工站名稱', '工序', '機台編號', '工單編號', '不良類別', '不良代碼', '不良名稱', '不良數量', '不良率', '責任歸屬', '異常類型', '說明', '照片JSON', '照片網址', '來源', '狀態'],
  '10_工單主檔': ['工單編號', '產品編號', '品名', '計畫量', '已完成量', '不良量', '開始日', '預計完工日', '優先級', '狀態', '備註', '更新時間'],
  '10_排程需求池': ['需求編號', '來源', '產品編號', '品名', '需求量', '交期', '建議工站', '建議機台', '需求人力', '狀態', '更新時間'],
  'LINE_指令設定': ['指令', '名稱', '回覆類型', '目標模組', '啟用', '排序', '備註'],
  '系統_操作紀錄': ['時間戳', '操作者', '動作', '目標', '結果', '備註']
};

function doGet(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};
  const page = 文字_(p.page || p.頁面 || p.p);
  const action = 文字_(p.action || p.動作);
  if (page) return 輸出HTML_(正規化頁面名稱_(page));
  if (action) return 輸出JSON_(處理API請求_(action, p));
  return 輸出JSON_(健康檢查());
}

function doPost(e) {
  const p = 解析POST_(e);
  if (p && p.events && Array.isArray(p.events)) return 處理LINEWebhook_(p);
  return 輸出JSON_(處理API請求_(p.action || p.動作 || '健康檢查', p));
}

function 正規化頁面名稱_(page) {
  const map = {
    '07_報工作業V2': '07_報工作業V2',
    '07_報工作業v2': '07_報工作業V2',
    '報工作業V2': '07_報工作業V2',
    '報工作業v2': '07_報工作業V2',
    'work-report-v2': '07_報工作業V2'
  };
  return map[文字_(page)] || 文字_(page);
}

function 輸出HTML_(檔名) {
  let output = HtmlService.createHtmlOutputFromFile(檔名)
    .setTitle(檔名 === '07_報工作業V2' ? '07_報工作業V2' : 系統設定.系統名稱)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  if (檔名 !== '07_報工作業V2') return output;
  const html = output.getContent();
  const patch = 取得報工作業V2前端保護補強JS_();
  return HtmlService.createHtmlOutput(html.replace('</body>', patch + '\n</body>'))
    .setTitle('07_報工作業V2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function 取得報工作業V2前端保護補強JS_() {
  return `<script>
(function(){
  function $id(id){return document.getElementById(id);}
  window.取圖片網址 = function(v){
    var s=String(v||'').trim();
    if(!s) return '';
    if(s.indexOf('data:image/')===0) return s;
    var m=s.match(/[-\\w]{25,}/);
    if(s.indexOf('drive.google.com')>=0 && m) return 'https://drive.google.com/thumbnail?id='+m[0]+'&sz=w320';
    if(!/^https?:\/\//i.test(s) && m) return 'https://drive.google.com/thumbnail?id='+m[0]+'&sz=w320';
    return s;
  };
  window.判斷目前班別 = function(){
    var d=new Date(), hm=d.getHours()*100+d.getMinutes();
    if(hm>=750 && hm<1650) return '早班';
    if(hm>=1650 || hm<110) return '中班';
    return '大夜班';
  };
  window.推估班別 = function(v){
    var t=String(v||'').toLowerCase();
    if(!t) return window.判斷目前班別();
    if(t.indexOf('中')>=0 || t.indexOf('1650')>=0 || t.indexOf('16:50')>=0) return '中班';
    if(t.indexOf('大夜')>=0 || t.indexOf('夜')>=0 || t.indexOf('2300')>=0 || t.indexOf('23:00')>=0 || t.indexOf('315')>=0 || t.indexOf('03:15')>=0) return '大夜班';
    if(t.indexOf('加班')>=0) return '加班';
    if(t.indexOf('早')>=0 || t.indexOf('0800')>=0 || t.indexOf('08:00')>=0) return '早班';
    return window.判斷目前班別();
  };
  window.設定預設時間 = function(force){
    var now=new Date();
    var local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
    if($id('開始時間') && (force || !$id('開始時間').value)) $id('開始時間').value=local;
    if($id('結束時間') && (force || !$id('結束時間').value)) $id('結束時間').value=local;
    if(typeof window.計算工時==='function') window.計算工時();
  };
  window.圖片HTML = function(url,text){
    var src=window.取圖片網址(url);
    var safeText=String(text||'無圖').replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m];});
    return src ? '<img src="'+src+'" onerror="this.outerHTML=\'<div class=無圖>'+safeText+'</div>\'">' : '<div class="無圖">'+safeText+'</div>';
  };
  var oldLoad = window.資料載入完成;
  if(typeof oldLoad==='function'){
    window.資料載入完成=function(data){
      oldLoad(data);
      setTimeout(function(){window.設定預設時間(false);},50);
      setTimeout(function(){window.設定預設時間(false);},500);
    };
  }
  var oldTab = window.切換頁籤;
  if(typeof oldTab==='function'){
    window.切換頁籤=function(name){
      oldTab(name);
      if(name==='產出') setTimeout(function(){window.設定預設時間(false);},30);
    };
  }
  window.addEventListener('load',function(){
    setTimeout(function(){window.設定預設時間(true);},50);
    setTimeout(function(){window.設定預設時間(false);},800);
  });
})();
</script>`;
}

function 處理API請求_(action, p) {
  try {
    const a = 文字_(action);
    const map = {
      '健康檢查': () => 健康檢查(),
      '初始化': () => 初始化_智慧製造中央作戰指揮中心(),
      '主檔檢查': () => 主檔檢查(),
      '取得報工作業v2初始資料': () => 取得報工作業v2初始資料(),
      '寫入報工作業v2': () => 寫入報工作業v2(p),
      '寫入不良紀錄v2': () => 寫入不良紀錄v2(p),
      '戰情': () => 取得戰情(),
      'AI摘要': () => 取得AI摘要(),
      '指令': () => 取得LINE指令說明_()
    };
    if (!map[a]) return { 成功: false, 訊息: '未知動作：' + a, 可用動作: Object.keys(map) };
    return map[a]();
  } catch (err) {
    return { 成功: false, 訊息: err.message, 堆疊: err.stack };
  }
}

function 健康檢查() {
  return { 成功: true, 系統: 系統設定.系統名稱, 版本: 系統設定.版本, 時間: new Date(), LINEBot: '已整併', 報工V2: '已整併', 不良代碼主檔: '05_不良代碼主檔' };
}

function 初始化_智慧製造中央作戰指揮中心() {
  const ss = 取得試算表_();
  Object.keys(正式工作表規格).forEach(name => 建立或修復表_(ss, name, 正式工作表規格[name]));
  初始化LINE指令_();
  記錄操作_('系統', '初始化', '正式工作表', '完成', 系統設定.版本);
  return { 成功: true, 訊息: '初始化完成', 版本: 系統設定.版本 };
}

function 初始化LINE指令_() {
  const sh = 取得試算表_().getSheetByName('LINE_指令設定');
  if (!sh || sh.getLastRow() > 1) return;
  sh.getRange(2, 1, 5, 7).setValues([
    ['主檔檢查', '檢查主檔筆數', '文字', '主檔中心', '是', 1, ''],
    ['戰情', '取得今日戰情', '文字', 'AI戰情中心', '是', 2, ''],
    ['AI摘要', '取得AI摘要', '文字', 'AI戰情中心', '是', 3, ''],
    ['報工', '取得報工入口', '文字', '09_報工系統', '是', 4, ''],
    ['指令', '取得可用指令', '文字', 'LINE Bot', '是', 5, '']
  ]);
}

function 取得報工作業v2初始資料() {
  const 人員 = 讀表_('01_人員主檔').filter(r => 文字_(r.啟用 || '是') !== '否').map(r => {
    const photo = 取照片資料_(r, ['縮圖網址', '作業員縮圖網址', '照片網址', '作業員照片網址', '圖片網址', '頭像網址', '大頭照網址', '照片', '大頭照'], ['Google檔案ID', '作業員照片檔案ID', '照片檔案ID', '圖片檔案ID', '大頭照檔案ID', 'DriveFileID', 'fileId', '檔案ID']);
    return {
      工號: 取值_(r, ['工號', '員工編號', '員工工號']),
      姓名: 取值_(r, ['姓名', '中文名', '名字']),
      部門: 取值_(r, ['部門']),
      組別: 取值_(r, ['組別']),
      職稱: 取值_(r, ['職稱', '職位']),
      班別: 標準化班別_(取值_(r, ['班別', '班次', '工作班別', '班別名稱', '上班時段'])),
      原始班別: 取值_(r, ['班別', '班次', '工作班別', '班別名稱', '上班時段']),
      啟用: r.啟用 || '是',
      人員類型: r.人員類型 || r.類別 || r.部門 || '現場人員',
      照片網址: photo.照片網址,
      縮圖網址: photo.縮圖網址,
      Google檔案ID: photo.檔案ID,
      條碼: r.條碼 || r.工牌號 || r.卡號 || ''
    };
  });
  const 產品 = 讀表_('02_產品主檔');
  const 機台 = 讀表_('03_機台主檔');
  const 工站 = 讀正式工站來源_();
  const 共用 = 讀表_('05_共用資料');
  const 報工工站群組 = 建立報工工站群組_(產品, 工站, 機台);
  const 不良原因 = 讀不良代碼主檔_();
  return {
    成功: true,
    版本: 系統設定.版本,
    作業日: 取得作業日_(),
    人員,
    報工工站群組,
    途程工站群組: 報工工站群組,
    班別清單: 取班別清單_(共用, 人員),
    異常類型: 取共用值清單_(共用, '停機原因', ['無異常 / Normal', '設備異常', '機台停機 / Machine Down', '待料 / Waiting Material', '換刀 / Tool Change', '品質確認 / Quality Check', '其他 / Others']),
    不良原因,
    筆數: { 人員: 人員.length, 報工工站群組: 報工工站群組.length, 產品: 產品.length, 工站機台關聯: 機台.length, 照片索引: 計算照片索引筆數_(人員, 產品, 機台), 不良代碼: (不良原因.Z.length + 不良原因.Y.length) }
  };
}

function 寫入報工作業v2(data) {
  data = data || {};
  const ss = 取得試算表_();
  const sh = 建立或修復表_(ss, '09_報工', 正式工作表規格['09_報工']);
  const headers = 取表頭_(sh);
  const 今日共做數 = Number(data.今日共做數 || 0);
  const 不良數 = Number(data.不良數 || 0);
  const 實際良品數 = Number(data.實際良品數 || Math.max(今日共做數 - 不良數, 0));
  if (!文字_(data.工號)) throw new Error('請選擇作業員，工號不可空白');
  if (!文字_(data.產品編號) && !文字_(data.品名)) throw new Error('請選擇產品');
  if (!文字_(data.報工工站名稱) && !文字_(data.工站名稱)) throw new Error('請選擇報工工站');
  if (今日共做數 <= 0) throw new Error('今日共做數必須大於 0');
  if (不良數 < 0) throw new Error('不良數不可小於 0');
  if (不良數 > 今日共做數) throw new Error('不良數不可大於今日共做數');
  const now = new Date();
  const 報工編號 = data.報工編號 || 產生流水號_('RFV2');
  const obj = {
    報工編號, 時間戳: now, 作業日: 取得作業日_(), 工號: data.工號 || '', 姓名: data.姓名 || '',
    班別: data.班別 && data.班別 !== '自動判斷' ? data.班別 : 判斷化新班別_(),
    是否加班: data.是否加班 || '否', 加班類型: data.加班類型 || '無',
    作業員照片網址: data.作業員照片網址 || '', 作業員縮圖網址: data.作業員縮圖網址 || '', 作業員照片檔案ID: data.作業員照片檔案ID || '',
    產品編號: data.產品編號 || '', 客戶品號: data.客戶品號 || '', 品名: data.品名 || '',
    產品照片網址: data.產品照片網址 || '', 產品縮圖網址: data.產品縮圖網址 || '', 產品照片檔案ID: data.產品照片檔案ID || '',
    工站名稱: data.工站名稱 || data.報工工站名稱 || '', 報工工站名稱: data.報工工站名稱 || data.工站名稱 || '',
    工序: data.工序 || '', 工序清單: data.工序清單 || data.工序 || '', 機台清單: data.機台清單 || '', 主機台: data.主機台 || '',
    機台照片清單JSON: JSON.stringify(data.機台照片清單 || []),
    今日共做數, 不良數, 實際良品數, 不良率: 今日共做數 ? 不良數 / 今日共做數 : 0,
    開始時間: data.開始時間 || '', 結束時間: data.結束時間 || '', 實際工時: data.實際工時 || '',
    不良類別: data.不良類別 || '無', 不良代碼: data.不良代碼 || '', 不良原因: data.不良原因 || '', 異常類型: data.異常類型 || '', 備註: data.備註 || '',
    現場照片JSON: JSON.stringify(data.現場照片清單 || []), 來源: 'GAS_HTML_07_報工作業V2_v1.6.6', 狀態: '有效', 更新時間: now
  };
  sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
  同步不良紀錄_(obj, data);
  if (data.工單編號) 更新工單完成量_(data.工單編號, 實際良品數, 不良數);
  記錄操作_('報工作業V2', '寫入09_報工', 報工編號, '完成', JSON.stringify({ 工號: obj.工號, 產品編號: obj.產品編號, 今日共做數, 不良數, 實際良品數 }));
  return { 成功: true, 訊息: '報工作業V2已寫入09_報工', 報工編號, 目標分頁: '09_報工', 作業日: obj.作業日, 班別: obj.班別, 今日共做數, 不良數, 實際良品數 };
}

function 寫入不良紀錄v2(data) {
  data = data || {};
  if (!Number(data.不良數 || 0) && !文字_(data.不良代碼) && !文字_(data.不良原因)) return { 成功: true, 訊息: '無不良資料，略過寫入' };
  const 報工編號 = 文字_(data.報工編號);
  if (報工編號 && 檢查不良紀錄已存在_(報工編號, data.不良代碼, data.不良數)) return { 成功: true, 訊息: '不良紀錄已存在，避免重複寫入', 報工編號 };
  const row = 建立不良紀錄物件_(data, 報工編號 || '');
  寫入不良紀錄物件_(row);
  return { 成功: true, 訊息: '不良紀錄已寫入', 報工編號, 流水號: row.流水號 };
}

function 同步不良紀錄_(obj, data) {
  if (Number(obj.不良數 || 0) <= 0 && !文字_(obj.不良代碼) && !文字_(obj.不良原因)) return;
  if (obj.報工編號 && 檢查不良紀錄已存在_(obj.報工編號, obj.不良代碼, obj.不良數)) return;
  寫入不良紀錄物件_(建立不良紀錄物件_(Object.assign({}, data, obj), obj.報工編號 || ''));
}

function 建立不良紀錄物件_(data, 報工編號) {
  const 不良數 = Number(data.不良數 || data.不良數量 || 0);
  const 今日共做數 = Number(data.今日共做數 || 0);
  return {
    流水號: 產生流水號_('NG'), 報工編號: 報工編號 || data.報工編號 || '', 時間戳: new Date(), 作業日: data.作業日 || 取得作業日_(),
    工號: data.工號 || '', 姓名: data.姓名 || '', 班別: data.班別 || '', 產品編號: data.產品編號 || '', 客戶品號: data.客戶品號 || '', 品名: data.品名 || '',
    工站名稱: data.工站名稱 || data.報工工站名稱 || '', 工序: data.工序 || data.工序清單 || '', 機台編號: data.主機台 || data.機台清單 || '', 工單編號: data.工單編號 || '',
    不良類別: data.不良類別 || '', 不良代碼: data.不良代碼 || '', 不良名稱: data.不良原因 || data.不良名稱 || '', 不良數量: 不良數, 不良率: data.不良率 !== undefined ? data.不良率 : (今日共做數 ? 不良數 / 今日共做數 : ''),
    責任歸屬: data.責任歸屬 || data.不良類別 || '', 異常類型: data.異常類型 || '', 說明: data.備註 || data.說明 || '', 照片JSON: JSON.stringify(data.現場照片清單 || []), 照片網址: data.照片網址 || '', 來源: '07_報工作業V2_v1.6.6', 狀態: '有效'
  };
}

function 寫入不良紀錄物件_(row) {
  const sh = 建立或修復表_(取得試算表_(), '09_不良紀錄', 正式工作表規格['09_不良紀錄']);
  const headers = 取表頭_(sh);
  sh.appendRow(headers.map(h => row[h] !== undefined ? row[h] : ''));
}

function 檢查不良紀錄已存在_(報工編號, 不良代碼, 不良數) {
  const sh = 取得試算表_().getSheetByName('09_不良紀錄');
  if (!sh || sh.getLastRow() < 2 || !報工編號) return false;
  const values = sh.getDataRange().getValues();
  const h = values[0].map(String);
  const c報工 = h.indexOf('報工編號'), c代碼 = h.indexOf('不良代碼'), c數量 = h.indexOf('不良數量');
  if (c報工 < 0) return false;
  for (let i = 1; i < values.length; i++) {
    if (文字_(values[i][c報工]) === 文字_(報工編號)) {
      if (c代碼 < 0 || 文字_(values[i][c代碼]) === 文字_(不良代碼 || '')) return true;
      if (c數量 >= 0 && Number(values[i][c數量] || 0) === Number(不良數 || 0)) return true;
    }
  }
  return false;
}

function 讀正式工站來源_() {
  const ss = 取得試算表_();
  const 候選 = ['08_工站途程機台主檔', '08_工站途程機台主檔建立工具', '04_工站主檔'];
  for (const name of 候選) {
    const sh = ss.getSheetByName(name);
    if (sh && sh.getLastRow() > 1) return 讀表_(name);
  }
  return [];
}

function 建立報工工站群組_(產品, 工站, 機台) {
  const 產品Map = {};
  產品.forEach(p => { const id = 文字_(p.產品編號); if (id) 產品Map[id] = p; });
  return 工站.map(g => {
    const 產品編號 = 取值_(g, ['產品編號', '料號', '品號']);
    const p = 產品Map[產品編號] || {};
    const pPhoto = 取照片資料_(p, ['產品縮圖網址', '縮圖網址', '產品照片網址', '照片網址', '圖片網址', '產品圖片網址'], ['產品照片檔案ID', '照片檔案ID', 'Google檔案ID', '圖片檔案ID', 'DriveFileID']);
    const 機台清單 = 拆字串_(取值_(g, ['機台清單', '機台編號清單', '機台編號', '主機台'])).map(id => {
      const m = 機台.find(x => 文字_(x.機台編號) === id) || {};
      const mPhoto = 取照片資料_(m, ['機台縮圖網址', '縮圖網址', '機台照片網址', '照片網址', '圖片網址'], ['機台照片檔案ID', '照片檔案ID', 'Google檔案ID', '圖片檔案ID', 'DriveFileID']);
      return { 機台編號: id, 區域: m.區域 || '', 機台型號: m.型號 || m.機台型號 || '', 設備名稱: m.機台名稱 || m.設備名稱 || '', 照片網址: mPhoto.照片網址, 縮圖網址: mPhoto.縮圖網址, Google檔案ID: mPhoto.檔案ID };
    });
    const 工站名稱 = 取值_(g, ['報工工站名稱', '工站名稱']);
    const 工序 = 取值_(g, ['工序', '工站代碼', '工序範圍']);
    return {
      產品編號, 客戶品號: 取值_(g, ['客戶品號']) || p.客戶品號 || '', 品名: 取值_(g, ['品名']) || p.品名 || '',
      產品照片網址: pPhoto.照片網址, 產品縮圖網址: pPhoto.縮圖網址, 產品照片檔案ID: pPhoto.檔案ID,
      工站名稱, 報工工站名稱: 工站名稱, 工序, 工序範圍: 工序, 工序清單: 工序 ? 拆字串_(工序) : [],
      標準產能: 取值_(g, ['標準產能', '標準產能_班']) || p.標準產能_班 || p['8小時標準產能'] || '', 標準工時_秒: p.標準工時_秒 || '',
      機台清單, 主機台: 機台清單[0] ? 機台清單[0].機台編號 : '', 顯示名稱: [工站名稱, 工序, 機台清單.map(m => m.機台編號).join('、')].filter(Boolean).join('｜')
    };
  }).filter(x => x.產品編號 || x.品名 || x.報工工站名稱);
}

function 讀不良代碼主檔_() {
  const rows = 讀表_('05_不良代碼主檔');
  const result = { Z: [], Y: [] };
  rows.forEach(r => {
    const 分類 = 文字_(r.分類 || r['分類']).toUpperCase();
    const 代碼 = 文字_(r.不良代碼 || r['不良代碼'] || r.代碼);
    const 名稱 = 文字_(r.不良名稱 || r['不良名稱'] || r.名稱);
    const 英文名稱 = 文字_(r.英文名稱 || r['英文名稱']);
    const 備註 = 文字_(r.備註 || r['備註']);
    const key = 分類 || (代碼 ? 代碼.charAt(0).toUpperCase() : '');
    if (!代碼 || !名稱) return;
    if (!result[key]) result[key] = [];
    result[key].push({ 代碼, 名稱, 英文名稱, 備註 });
  });
  if (!result.Z.length && !result.Y.length) return 預設不良代碼_();
  result.Z.sort((a, b) => a.代碼.localeCompare(b.代碼, 'zh-Hant', { numeric: true }));
  result.Y.sort((a, b) => a.代碼.localeCompare(b.代碼, 'zh-Hant', { numeric: true }));
  return result;
}

function 預設不良代碼_() {
  return { Z: [{ 代碼: 'Z01', 名稱: '缺肉', 英文名稱: 'Short Shot' }, { 代碼: 'Z02', 名稱: '加工砂孔', 英文名稱: 'Machining Blowhole' }], Y: [{ 代碼: 'Y01', 名稱: '內徑', 英文名稱: 'Inner Dia.' }, { 代碼: 'Y09', 名稱: '孔位', 英文名稱: 'Hole Pos.' }, { 代碼: 'Y13', 名稱: '饒隙', 英文名稱: 'Clearance' }] };
}

function 更新工單完成量_(工單編號, 良品數, 不良數) {
  const sh = 取得試算表_().getSheetByName('10_工單主檔');
  if (!sh || !工單編號 || sh.getLastRow() < 2) return;
  const values = sh.getDataRange().getValues();
  const h = values[0].map(String);
  const c工單 = h.indexOf('工單編號'), c完成 = h.indexOf('已完成量'), c不良 = h.indexOf('不良量'), c計畫 = h.indexOf('計畫量'), c狀態 = h.indexOf('狀態'), c更新 = h.indexOf('更新時間');
  if (c工單 < 0) return;
  for (let r = 1; r < values.length; r++) {
    if (文字_(values[r][c工單]) === 文字_(工單編號)) {
      const done = Number(values[r][c完成] || 0) + Number(良品數 || 0);
      const ng = Number(values[r][c不良] || 0) + Number(不良數 || 0);
      if (c完成 >= 0) sh.getRange(r + 1, c完成 + 1).setValue(done);
      if (c不良 >= 0) sh.getRange(r + 1, c不良 + 1).setValue(ng);
      if (c更新 >= 0) sh.getRange(r + 1, c更新 + 1).setValue(new Date());
      if (c狀態 >= 0 && c計畫 >= 0) sh.getRange(r + 1, c狀態 + 1).setValue(done >= Number(values[r][c計畫] || 0) ? '已完成' : '進行中');
      return;
    }
  }
}

function 主檔檢查() {
  const result = Object.keys(正式工作表規格).map(name => { const sh = 取得試算表_().getSheetByName(name); return { 分頁: name, 存在: !!sh, 筆數: sh ? Math.max(sh.getLastRow() - 1, 0) : 0 }; });
  return { 成功: true, 版本: 系統設定.版本, 結果: result };
}

function 取得戰情() { const rows = 讀表_('09_報工'); const 今日 = 取得作業日_(); const today = rows.filter(r => 文字_(r.作業日) === 今日); return { 成功: true, 作業日: 今日, 今日報工筆數: today.length, 今日共做數: 加總_(today, '今日共做數'), 今日良品數: 加總_(today, '實際良品數'), 今日不良數: 加總_(today, '不良數') }; }
function 取得AI摘要() { const x = 取得戰情(); return { 成功: true, 摘要: `今日報工 ${x.今日報工筆數} 筆，共做 ${x.今日共做數}，良品 ${x.今日良品數}，不良 ${x.今日不良數}。`, 建議: ['先確認未報工工站', '不良數大於0時追蹤不良原因'] }; }

function 處理LINEWebhook_(payload) { const events = payload.events || []; events.forEach(ev => { if (ev.type === 'message' && ev.message && ev.message.type === 'text') { const text = 文字_(ev.message.text); const reply = 產生LINE文字回覆_(text); 回覆LINE_(ev.replyToken, reply); } }); return ContentService.createTextOutput('OK'); }
function 產生LINE文字回覆_(text) { const t = 文字_(text).toLowerCase(); if (!t || t === '指令' || t === 'help') return 取得LINE指令說明_().文字; if (t.includes('主檔') || t.includes('檢查')) return 格式化主檔檢查LINE_(); if (t.includes('戰情') || t.includes('狀況') || t.includes('kpi')) return 格式化戰情LINE_(); if (t.includes('ai') || t.includes('摘要')) return 格式化AI摘要LINE_(); if (t.includes('報工')) return 產生報工入口LINE_(); return '🏭 智慧製造中央作戰指揮中心\n\n可輸入：\n1. 主檔檢查\n2. 戰情\n3. AI摘要\n4. 報工\n5. 指令'; }
function 取得LINE指令說明_() { return { 成功: true, 文字: '🏭 智慧製造中央作戰指揮中心｜LINE 指令\n\n主檔檢查：查看人員、產品、機台、工站、不良代碼筆數\n戰情：查看今日報工與不良概況\nAI摘要：查看今日重點摘要\n報工：取得報工作業V2入口\n指令：顯示本說明' }; }
function 格式化主檔檢查LINE_() { const data = 主檔檢查().結果 || []; const map = {}; data.forEach(x => map[x.分頁] = x.筆數 || 0); return '📋 主檔檢查\n' + '01_人員主檔：' + (map['01_人員主檔'] || 0) + ' 筆\n' + '02_產品主檔：' + (map['02_產品主檔'] || 0) + ' 筆\n' + '03_機台主檔：' + (map['03_機台主檔'] || 0) + ' 筆\n' + '04_工站主檔：' + (map['04_工站主檔'] || 0) + ' 筆\n' + '05_不良代碼主檔：' + (map['05_不良代碼主檔'] || 0) + ' 筆\n' + '09_報工：' + (map['09_報工'] || 0) + ' 筆'; }
function 格式化戰情LINE_() { const x = 取得戰情(); return '📊 今日戰情\n作業日：' + x.作業日 + '\n報工筆數：' + x.今日報工筆數 + '\n今日共做：' + x.今日共做數 + '\n實際良品：' + x.今日良品數 + '\n不良數：' + x.今日不良數; }
function 格式化AI摘要LINE_() { const x = 取得AI摘要(); return '🤖 AI摘要\n' + x.摘要 + '\n\n建議：\n- ' + x.建議.join('\n- '); }
function 產生報工入口LINE_() { return '📝 報工作業V2入口\n請開啟 GAS Web App：\n' + 系統設定.報工頁面參數 + '\n\n完整網址格式：\n你的WebAppURL?page=07_報工作業V2'; }
function 回覆LINE_(replyToken, text) { const token = 文字_(系統設定.LINE_CHANNEL_ACCESS_TOKEN); if (!token || !replyToken) return; UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify({ replyToken, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] }), muteHttpExceptions: true }); }

function 取得試算表_() { if (系統設定.主資料庫ID) return SpreadsheetApp.openById(系統設定.主資料庫ID); const ss = SpreadsheetApp.getActiveSpreadsheet(); if (!ss) throw new Error('請將此 Apps Script 綁定到智慧製造中央作戰指揮中心資料庫，或填入主資料庫ID'); return ss; }
function 建立或修復表_(ss, name, headers) { let sh = ss.getSheetByName(name); if (!sh) sh = ss.insertSheet(name); if (sh.getLastRow() < 1 || !文字_(sh.getRange(1, 1).getValue())) sh.getRange(1, 1, 1, headers.length).setValues([headers]); const nowHeaders = 取表頭_(sh); const miss = headers.filter(h => !nowHeaders.includes(h)); if (miss.length) sh.getRange(1, sh.getLastColumn() + 1, 1, miss.length).setValues([miss]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff'); return sh; }
function 讀表_(name) { const sh = 取得試算表_().getSheetByName(name); if (!sh || sh.getLastRow() < 2) return []; const values = sh.getDataRange().getValues(); const headers = values.shift().map(String); return values.filter(r => r.some(v => v !== '')).map((r, idx) => { const o = { __列號: idx + 2 }; headers.forEach((h, i) => o[h] = r[i]); return o; }); }
function 取表頭_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String); }
function 解析POST_(e) { if (!e || !e.postData || !e.postData.contents) return e && e.parameter ? e.parameter : {}; try { return JSON.parse(e.postData.contents); } catch (err) { return e.parameter || {}; } }
function 輸出JSON_(obj) { return ContentService.createTextOutput(JSON.stringify(obj, null, 2)).setMimeType(ContentService.MimeType.JSON); }
function 記錄操作_(操作者, 動作, 目標, 結果, 備註) { try { const sh = 建立或修復表_(取得試算表_(), '系統_操作紀錄', 正式工作表規格['系統_操作紀錄']); sh.appendRow([new Date(), 操作者, 動作, 目標, 結果, 備註 || '']); } catch (e) {} }
function 取得作業日_() { const now = new Date(); const hh = Number(Utilities.formatDate(now, 系統設定.時區, 'H')); const mm = Number(Utilities.formatDate(now, 系統設定.時區, 'm')); const d = new Date(now); if (hh < 6 || (hh === 6 && mm < 10)) d.setDate(d.getDate() - 1); return Utilities.formatDate(d, 系統設定.時區, 'yyyy-MM-dd'); }
function 判斷化新班別_() { const hm = Number(Utilities.formatDate(new Date(), 系統設定.時區, 'HHmm')); if (hm >= 750 && hm < 1650) return '早班'; if (hm >= 1650 || hm < 110) return '中班'; return '大夜班'; }
function 產生流水號_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), 系統設定.時區, 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100); }
function 文字_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function 拆字串_(s) { return 文字_(s).split(/[,，、\s]+/).map(x => x.trim()).filter(Boolean); }
function 取值_(obj, keys) { for (const k of keys) if (文字_(obj[k])) return 文字_(obj[k]); return ''; }
function 加總_(rows, key) { return rows.reduce((s, r) => s + Number(r[key] || 0), 0); }
function 轉Google圖片網址_(v) { const s = 文字_(v); if (!s) return ''; if (s.indexOf('data:image/') === 0) return s; const m = s.match(/[-\w]{25,}/); if (s.indexOf('drive.google.com') >= 0 && m) return 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=w320'; if (!/^https?:\/\//i.test(s) && m) return 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=w320'; return s; }
function 取照片資料_(obj, urlKeys, idKeys) { let url = 取值_(obj, urlKeys || []); let id = 取值_(obj, idKeys || []); if (!id) { const m = 文字_(url).match(/[-\w]{25,}/); if (m && 文字_(url).indexOf('drive.google.com') >= 0) id = m[0]; } const normalized = 轉Google圖片網址_(url || id); return { 照片網址: normalized, 縮圖網址: normalized, 檔案ID: id }; }
function 標準化班別_(v) { const t = 文字_(v); if (!t) return 判斷化新班別_(); if (t.indexOf('中') >= 0 || t.indexOf('1650') >= 0 || t.indexOf('16:50') >= 0) return '中班'; if (t.indexOf('大夜') >= 0 || t.indexOf('夜') >= 0 || t.indexOf('2300') >= 0 || t.indexOf('23:00') >= 0 || t.indexOf('315') >= 0 || t.indexOf('03:15') >= 0) return '大夜班'; if (t.indexOf('加班') >= 0) return '加班'; if (t.indexOf('早') >= 0 || t.indexOf('0800') >= 0 || t.indexOf('08:00') >= 0) return '早班'; return t; }
function 取班別清單_(rows, 人員) { const base = 取共用清單_(rows, '班別', ['自動判斷', '早班', '中班', '大夜班', '加班']); const set = {}; base.forEach(x => set[x.值 || x.名稱] = x.名稱 || x.值); ['早班', '中班', '大夜班', '加班'].forEach(x => set[x] = x); 人員.forEach(r => { if (r.班別) set[r.班別] = r.班別; }); return Object.keys(set).map(k => ({ 名稱: set[k], 值: k })); }
function 取共用清單_(rows, type, defaults) { const list = rows.filter(x => 文字_(x.資料類型) === type && 文字_(x.啟用 || '是') !== '否').sort((a, b) => Number(a.排序 || 999) - Number(b.排序 || 999)).map(x => ({ 名稱: x.名稱 || x.代碼, 值: x.名稱 || x.代碼 })); return list.length ? list : defaults.map(x => ({ 名稱: x, 值: x })); }
function 取共用值清單_(rows, type, defaults) { const list = 取共用清單_(rows, type, defaults).map(x => x.值 || x.名稱); return list.length ? list : defaults; }
function 計算照片索引筆數_(人員, 產品, 機台) { let n = 0; 人員.forEach(x => { if (x.照片網址 || x.縮圖網址 || x.Google檔案ID) n++; }); 產品.forEach(x => { const p = 取照片資料_(x, ['產品縮圖網址', '縮圖網址', '產品照片網址', '照片網址', '圖片網址'], ['產品照片檔案ID', '照片檔案ID', 'Google檔案ID']); if (p.照片網址 || p.檔案ID) n++; }); 機台.forEach(x => { const p = 取照片資料_(x, ['機台縮圖網址', '縮圖網址', '機台照片網址', '照片網址', '圖片網址'], ['機台照片檔案ID', '照片檔案ID', 'Google檔案ID']); if (p.照片網址 || p.檔案ID) n++; }); return n; }
