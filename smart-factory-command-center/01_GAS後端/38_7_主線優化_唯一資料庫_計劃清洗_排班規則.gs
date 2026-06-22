/**
 * 38.7｜主線優化核心模組
 * 專案：智慧製造中央作戰指揮中心
 * 版本：v1.7.5_38.7
 *
 * 主線：生產計劃表清洗 → 10_排程需求池 → 自動排程 → 今日派班 → PWA 報工。
 * 39 暫停；26 每日推播不重做。
 */

const 主線優化38_7設定 = {
  版本: 'v1.7.5_38.7_主線優化',
  排班規則分頁: '19_人員排班規則',
  今日派班分頁: '20_今日派班',
  清洗紀錄分頁: '18_生產計劃清洗紀錄'
};

const 主線優化38_7表規格 = {
  '19_人員排班規則': ['工號','姓名','角色類型','預設班別','可排班','可加班','專責工站','專責產品','專責機台','限制工站','限制產品','限制機台','備註','更新時間'],
  '20_今日派班': ['派班編號','作業日','班別','工號','姓名','產品編號','客戶品號','品名','工站名稱','機台編號','需求量','預計數量','狀態','來源需求編號','備註','更新時間'],
  '18_生產計劃清洗紀錄': ['清洗編號','時間戳','來源分頁','來源列號','產品編號','客戶品號','原始品名','修正品名','需求量','交期','建議工站','建議機台','狀態','備註']
};

function 主線優化38_7_嘗試處理動作_(payload) {
  var p = payload || {};
  var action = 主線優化38_7文字_(p.action || p['動作']);
  var map = {
    '健康檢查_主線優化38_7': function(){ return 健康檢查_主線優化38_7(); },
    '初始化_主線優化38_7': function(){ return 初始化_主線優化38_7(); },
    '初始化_唯一資料庫鎖定38_7': function(){ return 初始化_唯一資料庫鎖定38_7(); },
    '初始化_19_人員排班規則': function(){ return 初始化_19_人員排班規則(); },
    '清洗生產計劃表38_7': function(){ return 清洗生產計劃表38_7(p); },
    '自動排程38_7': function(){ return 自動排程38_7(p); },
    '取得今日任務38_7': function(){ return 取得今日任務38_7(p); },
    '取得主線儀表板38_7': function(){ return 取得主線儀表板38_7(p); },
    '測試_主線優化38_7': function(){ return 測試_主線優化38_7(); }
  };
  if (!map[action]) return null;
  return map[action]();
}

function 健康檢查_主線優化38_7() {
  return {
    成功: true,
    模組: '38.7_主線優化核心模組',
    版本: 主線優化38_7設定.版本,
    主線: '生產計劃表清洗→排程需求池→自動排程→今日派班→PWA報工',
    不做39: true,
    時間: new Date()
  };
}

function 初始化_主線優化38_7() {
  var ss = 取得試算表_();
  Object.keys(主線優化38_7表規格).forEach(function(name){ 建立或修復表_(ss, name, 主線優化38_7表規格[name]); });
  var db = 初始化_唯一資料庫鎖定38_7();
  var rules = 初始化_19_人員排班規則();
  return { 成功: true, 訊息: '38.7 主線優化初始化完成', 唯一資料庫: db, 排班規則: rules, 版本: 主線優化38_7設定.版本 };
}

function 初始化_唯一資料庫鎖定38_7() {
  var ss = 取得試算表_();
  var id = ss.getId();
  PropertiesService.getScriptProperties().setProperty('智慧製造_SPREADSHEET_ID', id);
  var sh = 建立或修復表_(ss, '00_系統設定', ['項目','數值','備註','最後更新時間']);
  主線優化38_7設定值_(sh, '智慧製造_SPREADSHEET_ID', id, '唯一主資料庫 ID，禁止初始化另建新試算表');
  主線優化38_7設定值_(sh, '主線優化版本', 主線優化38_7設定.版本, '38.7 主線優化');
  return { 成功: true, 主資料庫ID: id, 訊息: '已鎖定唯一主資料庫，初始化只修復分頁，不另建新試算表' };
}

function 初始化_19_人員排班規則() {
  var ss = 取得試算表_();
  var sh = 建立或修復表_(ss, 主線優化38_7設定.排班規則分頁, 主線優化38_7表規格['19_人員排班規則']);
  var headers = 取表頭_(sh);
  var rows = 讀表_(主線優化38_7設定.排班規則分頁);
  var exists = {};
  rows.forEach(function(r){ if (主線優化38_7文字_(r.工號)) exists[主線優化38_7文字_(r.工號).toLowerCase()] = true; });
  var now = new Date();
  var data = 主線優化38_7預設排班規則_();
  var append = [];
  data.forEach(function(r){
    var id = 主線優化38_7文字_(r.工號).toLowerCase();
    if (!id || exists[id]) return;
    r.更新時間 = now;
    append.push(headers.map(function(h){ return r[h] !== undefined ? r[h] : ''; }));
  });
  if (append.length) sh.getRange(sh.getLastRow()+1, 1, append.length, headers.length).setValues(append);
  return { 成功: true, 分頁: 主線優化38_7設定.排班規則分頁, 新增筆數: append.length, 規則總數: Math.max(sh.getLastRow()-1, 0) };
}

function 清洗生產計劃表38_7(p) {
  p = p || {};
  var sourceName = 主線優化38_7文字_(p.來源分頁 || p.sheet || p.分頁) || 主線優化38_7尋找生產計劃表_();
  if (!sourceName) return { 成功: false, 訊息: '找不到生產計劃表，請建立分頁：生產計劃表 或 原始生產計劃表' };
  var raw = 讀表_(sourceName);
  var products = 主線優化38_7建立產品索引_();
  var routes = 主線優化38_7建立途程索引_();
  var ss = 取得試算表_();
  var pool = 建立或修復表_(ss, '10_排程需求池', ['需求編號','來源','產品編號','品名','需求量','交期','建議工站','建議機台','需求人力','狀態','更新時間']);
  var log = 建立或修復表_(ss, 主線優化38_7設定.清洗紀錄分頁, 主線優化38_7表規格['18_生產計劃清洗紀錄']);
  var poolHeaders = 取表頭_(pool);
  var logHeaders = 取表頭_(log);
  var now = new Date();
  var 作業日 = typeof 取得作業日_ === 'function' ? 取得作業日_() : Utilities.formatDate(now, 'Asia/Taipei', 'yyyy-MM-dd');
  var added = 0, fixed = 0, failed = 0;
  var poolRows = [];
  var logRows = [];
  raw.forEach(function(r, idx){
    var 產品編號 = 主線優化38_7取值_(r, ['產品編號','料號','品號','產品料號','Item','ITEM','item']);
    var 客戶品號 = 主線優化38_7取值_(r, ['客戶品號','客戶料號','客戶品番','Customer PN','客戶PN']);
    var 原始品名 = 主線優化38_7取值_(r, ['品名','產品名稱','名稱','品名規格']);
    var 需求量 = Number(主線優化38_7取值_(r, ['需求量','訂單欠量','數量','計畫量','排產數','未交量']) || 0);
    var 交期 = 主線優化38_7取值_(r, ['交期','出貨日','預計出貨日','需求日','日期']) || 作業日;
    if (!產品編號 && !客戶品號 && !原始品名) return;
    var hit = 主線優化38_7找產品_(products, 產品編號, 客戶品號, 原始品名);
    var 修正品名 = hit && hit.品名 ? hit.品名 : 原始品名;
    if (修正品名 && 修正品名 !== 原始品名) fixed++;
    if (!修正品名 || 修正品名 === 產品編號) failed++;
    var route = 主線優化38_7找途程_(routes, 產品編號 || (hit && hit.產品編號), 客戶品號 || (hit && hit.客戶品號));
    var reqId = 'REQ-' + Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + (idx + 2);
    var poolObj = {
      需求編號: reqId,
      來源: '38.7_生產計劃清洗:' + sourceName,
      產品編號: 產品編號 || (hit && hit.產品編號) || '',
      品名: 修正品名 || '',
      需求量: 需求量 || '',
      交期: 交期,
      建議工站: route.工站 || '',
      建議機台: route.機台 || '',
      需求人力: route.需求人力 || '',
      狀態: '待排程',
      更新時間: now
    };
    poolRows.push(poolHeaders.map(function(h){ return poolObj[h] !== undefined ? poolObj[h] : ''; }));
    var logObj = { 清洗編號: reqId, 時間戳: now, 來源分頁: sourceName, 來源列號: r.__列號 || (idx+2), 產品編號: poolObj.產品編號, 客戶品號: 客戶品號 || (hit && hit.客戶品號) || '', 原始品名: 原始品名, 修正品名: 修正品名, 需求量: 需求量 || '', 交期: 交期, 建議工站: poolObj.建議工站, 建議機台: poolObj.建議機台, 狀態: 修正品名 ? '已清洗' : '待人工確認', 備註: hit ? '由02_產品主檔修正' : '找不到產品主檔對應' };
    logRows.push(logHeaders.map(function(h){ return logObj[h] !== undefined ? logObj[h] : ''; }));
    added++;
  });
  if (poolRows.length) pool.getRange(pool.getLastRow()+1, 1, poolRows.length, poolHeaders.length).setValues(poolRows);
  if (logRows.length) log.getRange(log.getLastRow()+1, 1, logRows.length, logHeaders.length).setValues(logRows);
  return { 成功: true, 來源分頁: sourceName, 寫入需求池: added, 品名修正: fixed, 待人工確認: failed, 訊息: '生產計劃表已清洗並寫入 10_排程需求池' };
}

function 自動排程38_7(p) {
  p = p || {};
  var ss = 取得試算表_();
  var today = 主線優化38_7文字_(p.作業日) || (typeof 取得作業日_ === 'function' ? 取得作業日_() : Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'));
  var poolRows = 讀表_('10_排程需求池').filter(function(r){
    var st = 主線優化38_7文字_(r.狀態 || '待排程');
    return st === '' || st === '待排程' || st === '待排' || st === '未排';
  });
  var rules = 讀表_(主線優化38_7設定.排班規則分頁);
  if (!rules.length) 初始化_19_人員排班規則();
  rules = 讀表_(主線優化38_7設定.排班規則分頁);
  var workers = rules.filter(主線優化38_7可排班_);
  var sh = 建立或修復表_(ss, 主線優化38_7設定.今日派班分頁, 主線優化38_7表規格['20_今日派班']);
  var headers = 取表頭_(sh);
  var now = new Date();
  var rows = [];
  var skipped = 0;
  poolRows.forEach(function(req, idx){
    var worker = 主線優化38_7選人_(workers, req);
    if (!worker) { skipped++; return; }
    var obj = {
      派班編號: 'DSP-' + today.replace(/-/g,'') + '-' + (idx + 1),
      作業日: today,
      班別: worker.預設班別 || '自動',
      工號: worker.工號,
      姓名: worker.姓名,
      產品編號: req.產品編號 || '',
      客戶品號: req.客戶品號 || '',
      品名: req.品名 || '',
      工站名稱: req.建議工站 || '',
      機台編號: req.建議機台 || '',
      需求量: req.需求量 || '',
      預計數量: req.需求量 || '',
      狀態: '待報工',
      來源需求編號: req.需求編號 || '',
      備註: '38.7 自動排程；幹部不排班、留停不排班、學生不加班、專責優先',
      更新時間: now
    };
    rows.push(headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; }));
  });
  if (rows.length) sh.getRange(sh.getLastRow()+1, 1, rows.length, headers.length).setValues(rows);
  return { 成功: true, 作業日: today, 需求筆數: poolRows.length, 派班筆數: rows.length, 未派筆數: skipped, 訊息: '已建立今日派班任務' };
}

function 取得今日任務38_7(p) {
  p = p || {};
  var today = 主線優化38_7文字_(p.作業日) || (typeof 取得作業日_ === 'function' ? 取得作業日_() : Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'));
  var 工號 = 主線優化38_7文字_(p.工號 || p.id || p.workerId).toLowerCase();
  var rows = 讀表_(主線優化38_7設定.今日派班分頁).filter(function(r){ return 主線優化38_7文字_(r.作業日) === today; });
  if (工號) rows = rows.filter(function(r){ return 主線優化38_7文字_(r.工號).toLowerCase() === 工號; });
  return { 成功: true, 作業日: today, 筆數: rows.length, 任務: rows };
}

function 取得主線儀表板38_7(p) {
  var today = (p && p.作業日) || (typeof 取得作業日_ === 'function' ? 取得作業日_() : Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'));
  var dispatch = 讀表_(主線優化38_7設定.今日派班分頁).filter(function(r){ return 主線優化38_7文字_(r.作業日) === today; });
  var reported = dispatch.filter(function(r){ return 主線優化38_7文字_(r.狀態).indexOf('已') >= 0; }).length;
  return { 成功: true, 作業日: today, 今日派班數: dispatch.length, 已報工: reported, 未報工: Math.max(dispatch.length - reported, 0), 版本: 主線優化38_7設定.版本 };
}

function 測試_主線優化38_7() {
  return { 成功: true, 測試: 'OK', 版本: 主線優化38_7設定.版本, 必要分頁: Object.keys(主線優化38_7表規格) };
}

function 主線優化38_7設定值_(sh, key, value, note) {
  var values = sh.getDataRange().getValues();
  for (var i=1;i<values.length;i++) {
    if (主線優化38_7文字_(values[i][0]) === key) {
      sh.getRange(i+1,2,1,3).setValues([[value, note || '', new Date()]]);
      return;
    }
  }
  sh.appendRow([key, value, note || '', new Date()]);
}

function 主線優化38_7預設排班規則_() {
  return [
    {工號:'fhfg268',姓名:'黃寶全',角色類型:'作業員',預設班別:'',可排班:'是',可加班:'否',專責工站:'K/N,DE,DEL',專責產品:'',專責機台:'369',限制工站:'',限制產品:'',限制機台:'',備註:'專責 K/N DE DEL 機台369，不加班'},
    {工號:'fhfg272',姓名:'陳瑞彬',角色類型:'幹部/工程師',預設班別:'早班',可排班:'否',可加班:'否',備註:'幹部工程師，不排班'},
    {工號:'fhfi531',姓名:'駱德祥',角色類型:'作業員',預設班別:'',可排班:'是',可加班:'是',專責工站:'清洗,MP2,MP4,T11',備註:'清洗專責 MP2/4 T11，可加班'},
    {工號:'fhfi546',姓名:'黃俊偉',角色類型:'作業員',預設班別:'',可排班:'是',可加班:'是',專責工站:'除毛頭,拋光,倒鐵屑',限制工站:'除毛頭,拋光,倒鐵屑',備註:'只能做除毛頭、拋光、倒鐵屑'},
    {工號:'fhfi559',姓名:'韋雲華',角色類型:'作業員',預設班別:'',可排班:'是',可加班:'是',專責工站:'全檢,MP2,MP4,T11,ROTOR',備註:'2H 專責全檢，偏轉 MP2/MP4/T11 ROTOR 全檢'},
    {工號:'fhfi573',姓名:'黃嘉欣',角色類型:'幹部/工程師',預設班別:'大夜班',可排班:'否',可加班:'否',備註:'幹部工程師，不排班'},
    {工號:'fhfi591',姓名:'彭小雲',角色類型:'作業員',預設班別:'',可排班:'是',可加班:'是',專責工站:'MP2,MP4',備註:'MP2/MP4 專責 2H'},
    {工號:'fhfi594',姓名:'張淑美',角色類型:'作業員',預設班別:'',可排班:'是',可加班:'是',專責工站:'MP2,MP4',備註:'MP2/MP4 專責 2H'},
    {工號:'黃秀惠',姓名:'黃秀惠',角色類型:'作業員',預設班別:'',可排班:'是',可加班:'是',專責工站:'T11,ROTOR,全檢',備註:'T11 各種 ROTOR 全檢，可加班 2H'},
    {工號:'fhfi676',姓名:'鍾聿桓',角色類型:'幹部/主任',預設班別:'早班',可排班:'否',可加班:'否',備註:'幹部主任，不排班'},
    {工號:'fhfi691',姓名:'石郡浩',角色類型:'幹部/助理工程師',預設班別:'早班',可排班:'否',可加班:'否',備註:'幹部助理工程師，不排班'},
    {工號:'郭孟學',姓名:'郭孟學',角色類型:'幹部/助理工程師',預設班別:'早班',可排班:'否',可加班:'否',備註:'幹部助理工程師，不排班'},
    {工號:'fhfs308',姓名:'紀約翰',角色類型:'學生',預設班別:'早班',可排班:'是',可加班:'否',專責工站:'Sasano,水末試漏,清洗,29*8/10車床',備註:'學生不加班'},
    {工號:'fhfs309',姓名:'羅杰邑',角色類型:'學生',預設班別:'早班',可排班:'是',可加班:'否',專責工站:'Sasano,水末試漏,清洗',備註:'學生不加班'},
    {工號:'fhfs312',姓名:'卓索恩',角色類型:'學生',預設班別:'早班',可排班:'否',可加班:'否',備註:'留職停薪，不排班'},
    {工號:'fhfs313',姓名:'葉唯安',角色類型:'學生',預設班別:'早班',可排班:'否',可加班:'否',備註:'留職停薪，不排班'},
    {工號:'fhfs316',姓名:'馬友真',角色類型:'學生',預設班別:'早班',可排班:'是',可加班:'否',專責工站:'Sasano,水末試漏,清洗',備註:'學生不加班'},
    {工號:'fhfs317',姓名:'吳雷曼',角色類型:'學生',預設班別:'早班',可排班:'否',可加班:'否',備註:'留職停薪，不排班'},
    {工號:'fhfs318',姓名:'林言相',角色類型:'學生',預設班別:'早班',可排班:'否',可加班:'否',備註:'留職停薪，不排班'},
    {工號:'fhft667',姓名:'林于傑',角色類型:'作業員',預設班別:'',可排班:'是',可加班:'否',專責工站:'小米組裝,大米組裝',備註:'專責小米、大米組裝，不加班'}
  ];
}

function 主線優化38_7可排班_(r) {
  var role = 主線優化38_7文字_(r.角色類型 + ' ' + r.備註);
  if (主線優化38_7文字_(r.可排班) === '否') return false;
  if (role.indexOf('幹部') >= 0 || role.indexOf('工程師') >= 0 || role.indexOf('主任') >= 0 || role.indexOf('助理工程師') >= 0) return false;
  if (role.indexOf('留職停薪') >= 0 || role.indexOf('留停') >= 0) return false;
  return true;
}

function 主線優化38_7選人_(workers, req) {
  if (!workers || !workers.length) return null;
  var text = 主線優化38_7文字_([req.品名, req.產品編號, req.建議工站, req.建議機台].join(' ')).toLowerCase();
  var best = workers[0], bestScore = -1;
  workers.forEach(function(w){
    var score = 0;
    ['專責工站','專責產品','專責機台'].forEach(function(k){
      主線優化38_7拆_(w[k]).forEach(function(x){ if (x && text.indexOf(x.toLowerCase()) >= 0) score += 10; });
    });
    if (score > bestScore) { bestScore = score; best = w; }
  });
  return best;
}

function 主線優化38_7尋找生產計劃表_() {
  var ss = 取得試算表_();
  var names = ['生產計劃表','生產計畫表','原始生產計劃表','原始生產計畫表','生管生產計劃表','生管生產計畫表'];
  for (var i=0;i<names.length;i++) if (ss.getSheetByName(names[i])) return names[i];
  return '';
}

function 主線優化38_7建立產品索引_() {
  var rows = 讀表_('02_產品主檔');
  var idx = { both:{}, product:{}, customer:{}, name:{} };
  rows.forEach(function(r){
    var p = 主線優化38_7文字_(r.產品編號);
    var c = 主線優化38_7文字_(r.客戶品號);
    var n = 主線優化38_7文字_(r.品名);
    if (p && c) idx.both[(p+'|'+c).toLowerCase()] = r;
    if (p) idx.product[p.toLowerCase()] = r;
    if (c) idx.customer[c.toLowerCase()] = r;
    if (n) idx.name[n.toLowerCase()] = r;
  });
  return idx;
}

function 主線優化38_7找產品_(idx, p, c, n) {
  p = 主線優化38_7文字_(p); c = 主線優化38_7文字_(c); n = 主線優化38_7文字_(n);
  if (p && c && idx.both[(p+'|'+c).toLowerCase()]) return idx.both[(p+'|'+c).toLowerCase()];
  if (p && idx.product[p.toLowerCase()]) return idx.product[p.toLowerCase()];
  if (c && idx.customer[c.toLowerCase()]) return idx.customer[c.toLowerCase()];
  if (n && idx.name[n.toLowerCase()]) return idx.name[n.toLowerCase()];
  return null;
}

function 主線優化38_7建立途程索引_() {
  var rows = 讀表_('08_工站途程機台主檔');
  var idx = { product:{}, both:{} };
  rows.forEach(function(r){
    var p = 主線優化38_7文字_(r.產品編號), c = 主線優化38_7文字_(r.客戶品號);
    var obj = { 工站: r.報工工站名稱 || r.工站名稱 || '', 機台: r.主機台 || r.機台編號清單 || '', 需求人力: r.需求人力 || '' };
    if (p) idx.product[p.toLowerCase()] = obj;
    if (p && c) idx.both[(p+'|'+c).toLowerCase()] = obj;
  });
  return idx;
}

function 主線優化38_7找途程_(idx, p, c) {
  p = 主線優化38_7文字_(p); c = 主線優化38_7文字_(c);
  if (p && c && idx.both[(p+'|'+c).toLowerCase()]) return idx.both[(p+'|'+c).toLowerCase()];
  if (p && idx.product[p.toLowerCase()]) return idx.product[p.toLowerCase()];
  return { 工站:'', 機台:'', 需求人力:'' };
}

function 主線優化38_7取值_(obj, keys) {
  for (var i=0;i<keys.length;i++) if (主線優化38_7文字_(obj[keys[i]])) return 主線優化38_7文字_(obj[keys[i]]);
  return '';
}
function 主線優化38_7文字_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function 主線優化38_7拆_(s) { return 主線優化38_7文字_(s).split(/[,，、\s]+/).map(function(x){ return x.trim(); }).filter(Boolean); }
