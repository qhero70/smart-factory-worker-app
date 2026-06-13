/**
 * 19_派班需求與自動派班正式模組
 * 專案：製造部智慧製造應用總部
 * 階段：10_工單工序明細 → 10_派班需求池 → 10_每日派班表
 *
 * 目的：
 * 1. 先暫停途程補齊，改以「派班可用」為主線。
 * 2. 從已拆出的有效工序建立派班需求。
 * 3. 排除「未設定途程 / 待工程補途程」資料，避免錯派。
 * 4. 依人員主檔與工站關聯資料自動派班。
 * 5. 找不到合適人員時標記為「待人工派班」，不阻斷流程。
 *
 * 注意：
 * 本檔不包含 doGet / doPost，避免搶正式 Web App 入口。
 */

var 派班_試算表ID_ = '1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ';

var 派班_工作表名稱_ = {
  工序明細: '10_工單工序明細',
  派班需求池: '10_派班需求池',
  每日派班表: '10_每日派班表',
  派班紀錄: '10_派班紀錄',
  派班參數: '10_派班參數設定',
  人員主檔: '01_人員主檔',
  工站途程: '08_工站途程機台主檔'
};

var 派班_工站關聯候選分頁_ = [
  '04_工站關聯資料',
  '04_工站關聯',
  '04_工站關聯寫入核檢',
  '04_工站關聯寫入後核',
  '04_工站關聯寫入檢核',
  '員工工站排班表'
];

var 派班_欄位_ = {
  派班需求池: [
    '派班需求編號','工序明細編號','工單編號','來源需求編號','批次編號','產品編號','客戶品號','品名','需求日期','派班日期','班別','交期風險','優先級',
    '途程順序','報工工站名稱','工站名稱','工序','工序清單','機台編號清單','主機台','區域清單','需求人力','計畫量','剩餘量','標準產能','標準工時_秒',
    '候選人員','候選人數','派班狀態','唯一鍵','備註','建立時間','更新時間'
  ],
  每日派班表: [
    '派班編號','派班日期','班別','工號','姓名','部門','組別','報工工站名稱','工站名稱','工序','工序明細編號','工單編號','產品編號','客戶品號','品名',
    '主機台','機台編號清單','區域清單','計畫量','派工量','標準產能','預計開始時間','預計結束時間','派班來源','派班狀態','報工狀態','備註','建立時間','更新時間'
  ],
  派班紀錄: [
    '派班批次','時間戳','動作','來源筆數','需求筆數','派班筆數','待人工派班','略過筆數','錯誤筆數','狀態','訊息','建立時間'
  ],
  派班參數: ['項目','數值','備註','更新時間']
};

var 派班_預設參數_ = [
  ['預設班別','早班','需求沒有班別時使用',派班_現在_()],
  ['早班開始','08:00','每日派班表預計開始時間',派班_現在_()],
  ['早班結束','16:50','每日派班表預計結束時間',派班_現在_()],
  ['大夜班開始','23:00','每日派班表預計開始時間',派班_現在_()],
  ['大夜班結束','07:50','每日派班表預計結束時間',派班_現在_()],
  ['加班開始','17:20','加班預設開始時間',派班_現在_()],
  ['加班結束','20:20','加班預設結束時間',派班_現在_()],
  ['同人同班每日最多派班數','1','避免一人同日同班多工站',派班_現在_()],
  ['同機同班每日最多派班數','1','避免同機同日同班重複佔用',派班_現在_()],
  ['允許無人需求保留','Y','無候選人員時仍保留待人工派班',派班_現在_()]
];

function 初始化_10_派班系統() {
  var ss = 派班_取得試算表_();
  var sh需求 = 派班_確保工作表_(ss, 派班_工作表名稱_.派班需求池, 派班_欄位_.派班需求池);
  var sh派班 = 派班_確保工作表_(ss, 派班_工作表名稱_.每日派班表, 派班_欄位_.每日派班表);
  var sh紀錄 = 派班_確保工作表_(ss, 派班_工作表名稱_.派班紀錄, 派班_欄位_.派班紀錄);
  var sh參數 = 派班_確保工作表_(ss, 派班_工作表名稱_.派班參數, 派班_欄位_.派班參數);
  派班_補預設參數_(sh參數);
  return {
    ok: true,
    message: '10_派班系統初始化完成',
    工作表: [sh需求.getName(), sh派班.getName(), sh紀錄.getName(), sh參數.getName()],
    時間: 派班_現在_()
  };
}

function 派班_產生需求池(payload) {
  payload = payload || {};
  var ss = 派班_取得試算表_();
  var sh工序 = ss.getSheetByName(派班_工作表名稱_.工序明細);
  if (!sh工序 || sh工序.getLastRow() < 2) return { ok: false, message: '10_工單工序明細沒有資料，無法產生派班需求池' };

  var sh需求 = 派班_重建空白工作表_(ss, 派班_工作表名稱_.派班需求池, 派班_欄位_.派班需求池);
  var sh紀錄 = 派班_確保工作表_(ss, 派班_工作表名稱_.派班紀錄, 派班_欄位_.派班紀錄);
  var sh參數 = 派班_確保工作表_(ss, 派班_工作表名稱_.派班參數, 派班_欄位_.派班參數);
  派班_補預設參數_(sh參數);

  var params = 派班_讀參數_(sh參數);
  var 工序Rows = 派班_讀工作表物件_(sh工序).rows.map(function(x){ return x.data; });
  var 人員 = 派班_讀人員_(ss);
  var skillIndex = 派班_建立工站人員索引_(ss, 人員);

  var append = [];
  var skipped = 0;
  var now = 派班_現在_();
  var batch = payload['派班批次'] || ('DISPATCH-REQ-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));

  工序Rows.forEach(function(r, idx) {
    var 工序明細編號 = String(r['工序明細編號'] || '').trim();
    var 工單編號 = String(r['工單編號'] || '').trim();
    var station = String(r['報工工站名稱'] || r['工站名稱'] || '').trim();
    var process = String(r['工序'] || r['工序清單'] || '').trim();
    var status = String(r['狀態'] || '').trim();
    var qty = Number(r['剩餘量'] || r['計畫量'] || 0);

    if (!工序明細編號 || !工單編號) { skipped++; return; }
    if (qty <= 0) { skipped++; return; }
    if (station.indexOf('未設定') >= 0 || process.indexOf('待工程補途程') >= 0) { skipped++; return; }
    if (status === '已完成' || status === '取消' || status === '已派班') { skipped++; return; }

    var dispatchDate = 派班_日期文字_(r['建議開工日'] || r['需求日期'] || r['預計完工日'] || new Date());
    var shift = String(r['班別'] || params['預設班別'] || '早班').trim();
    var candidates = 派班_找候選人_(skillIndex, r, shift);
    var unique = 派班_去重候選人_(candidates);
    var id = 'DREQ-' + ('000000' + (append.length + 1)).slice(-6);

    var obj = {
      '派班需求編號': id,
      '工序明細編號': 工序明細編號,
      '工單編號': 工單編號,
      '來源需求編號': r['來源需求編號'] || '',
      '批次編號': r['批次編號'] || '',
      '產品編號': r['產品編號'] || '',
      '客戶品號': r['客戶品號'] || '',
      '品名': r['品名'] || '',
      '需求日期': 派班_日期文字_(r['需求日期'] || ''),
      '派班日期': dispatchDate,
      '班別': shift,
      '交期風險': r['交期風險'] || '',
      '優先級': 派班_判斷優先級_(r),
      '途程順序': r['途程順序'] || '',
      '報工工站名稱': station,
      '工站名稱': r['工站名稱'] || station,
      '工序': r['工序'] || '',
      '工序清單': r['工序清單'] || process,
      '機台編號清單': r['機台編號清單'] || '',
      '主機台': r['主機台'] || 派班_第一機台_(r['機台編號清單']),
      '區域清單': r['區域清單'] || '',
      '需求人力': Number(r['需求人力'] || 1),
      '計畫量': Number(r['計畫量'] || qty),
      '剩餘量': qty,
      '標準產能': r['標準產能'] || '',
      '標準工時_秒': r['標準工時_秒'] || '',
      '候選人員': unique.map(function(u){ return u.工號 + '/' + u.姓名; }).join('、'),
      '候選人數': unique.length,
      '派班狀態': unique.length ? '待派班' : '待人工派班',
      '唯一鍵': 工序明細編號 + '｜' + dispatchDate + '｜' + shift,
      '備註': unique.length ? '' : '找不到工站關聯人員或同班別人員',
      '建立時間': now,
      '更新時間': now
    };

    append.push(派班_欄位_.派班需求池.map(function(h){ return 派班_正規值_(obj[h]); }));
  });

  if (append.length) {
    sh需求.getRange(2, 1, append.length, 派班_欄位_.派班需求池.length).setValues(append);
    派班_套格式_(sh需求);
  }

  var msg = '已建立派班需求 ' + append.length + ' 筆，略過 ' + skipped + ' 筆';
  派班_寫紀錄_(sh紀錄, batch, '產生派班需求池', 工序Rows.length, append.length, 0, 0, skipped, 0, '成功', msg);

  return { ok: true, message: msg, 來源工序筆數: 工序Rows.length, 派班需求筆數: append.length, 略過筆數: skipped, 時間: now };
}

function 派班_自動派班(payload) {
  payload = payload || {};
  var ss = 派班_取得試算表_();
  var sh需求 = ss.getSheetByName(派班_工作表名稱_.派班需求池);
  if (!sh需求 || sh需求.getLastRow() < 2) return { ok: false, message: '10_派班需求池沒有資料，請先執行 測試_產生派班需求池()' };

  var sh派班 = 派班_重建空白工作表_(ss, 派班_工作表名稱_.每日派班表, 派班_欄位_.每日派班表);
  var sh紀錄 = 派班_確保工作表_(ss, 派班_工作表名稱_.派班紀錄, 派班_欄位_.派班紀錄);
  var sh參數 = 派班_確保工作表_(ss, 派班_工作表名稱_.派班參數, 派班_欄位_.派班參數);
  派班_補預設參數_(sh參數);

  var params = 派班_讀參數_(sh參數);
  var maxPerson = Number(params['同人同班每日最多派班數'] || 1);
  var maxMachine = Number(params['同機同班每日最多派班數'] || 1);
  var 人員 = 派班_讀人員_(ss);
  var skillIndex = 派班_建立工站人員索引_(ss, 人員);
  var dataObj = 派班_讀工作表物件_(sh需求);
  var headers = dataObj.headers;
  var rows = dataObj.rows;

  rows.sort(function(a, b) {
    return 派班_排序分數_(a.data) - 派班_排序分數_(b.data);
  });

  var usedPerson = {};
  var usedMachine = {};
  var append = [];
  var demandUpdates = [];
  var manual = 0;
  var skipped = 0;
  var errors = 0;
  var now = 派班_現在_();
  var batch = payload['派班批次'] || ('DISPATCH-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMddHHmmss'));

  rows.forEach(function(item) {
    var r = item.data || {};
    var status = String(r['派班狀態'] || '').trim();
    if (status === '已派班' || status === '取消') { skipped++; return; }

    try {
      var need = Math.max(Number(r['需求人力'] || 1), 1);
      var date = 派班_日期文字_(r['派班日期'] || new Date());
      var shift = String(r['班別'] || params['預設班別'] || '早班').trim();
      var candidates = 派班_找候選人_(skillIndex, r, shift);
      var selected = [];
      for (var i = 0; i < candidates.length && selected.length < need; i++) {
        var p = candidates[i];
        var pKey = date + '｜' + shift + '｜' + p.工號;
        if ((usedPerson[pKey] || 0) >= maxPerson) continue;
        selected.push(p);
        usedPerson[pKey] = (usedPerson[pKey] || 0) + 1;
      }

      var machine = String(r['主機台'] || 派班_第一機台_(r['機台編號清單']) || '').trim();
      var machineOk = true;
      if (machine) {
        var mKey = date + '｜' + shift + '｜' + machine;
        if ((usedMachine[mKey] || 0) >= maxMachine) machineOk = false;
        else usedMachine[mKey] = (usedMachine[mKey] || 0) + 1;
      }

      if (!selected.length || !machineOk) {
        manual++;
        demandUpdates.push({ rowIndex: item.rowIndex, status: '待人工派班', note: !selected.length ? '無可用人員' : '機台同班已滿' });
        return;
      }

      selected.forEach(function(p, idx) {
        var dispatchId = 'DSP-' + date.replace(/[^0-9]/g, '') + '-' + ('0000' + (append.length + 1)).slice(-4);
        var timePair = 派班_班別時間_(shift, params);
        var obj = {
          '派班編號': dispatchId,
          '派班日期': date,
          '班別': shift,
          '工號': p.工號,
          '姓名': p.姓名,
          '部門': p.部門,
          '組別': p.組別,
          '報工工站名稱': r['報工工站名稱'] || '',
          '工站名稱': r['工站名稱'] || r['報工工站名稱'] || '',
          '工序': r['工序'] || r['工序清單'] || '',
          '工序明細編號': r['工序明細編號'] || '',
          '工單編號': r['工單編號'] || '',
          '產品編號': r['產品編號'] || '',
          '客戶品號': r['客戶品號'] || '',
          '品名': r['品名'] || '',
          '主機台': machine,
          '機台編號清單': r['機台編號清單'] || machine,
          '區域清單': r['區域清單'] || '',
          '計畫量': r['計畫量'] || 0,
          '派工量': Math.ceil(Number(r['剩餘量'] || r['計畫量'] || 0) / selected.length),
          '標準產能': r['標準產能'] || '',
          '預計開始時間': date + ' ' + timePair.start,
          '預計結束時間': date + ' ' + timePair.end,
          '派班來源': '系統自動派班',
          '派班狀態': '已派班',
          '報工狀態': '未報工',
          '備註': idx === 0 ? '' : '同需求第 ' + (idx + 1) + ' 人',
          '建立時間': now,
          '更新時間': now
        };
        append.push(派班_欄位_.每日派班表.map(function(h){ return 派班_正規值_(obj[h]); }));
      });

      demandUpdates.push({ rowIndex: item.rowIndex, status: '已派班', note: '已派 ' + selected.length + ' 人' });
    } catch (err) {
      errors++;
      demandUpdates.push({ rowIndex: item.rowIndex, status: '派班錯誤', note: err.message });
    }
  });

  if (append.length) {
    sh派班.getRange(2, 1, append.length, 派班_欄位_.每日派班表.length).setValues(append);
    派班_套格式_(sh派班);
  }

  派班_回寫需求狀態_(sh需求, headers, demandUpdates, now);

  var msg = '已派班 ' + append.length + ' 筆，待人工派班 ' + manual + ' 筆，略過 ' + skipped + ' 筆，錯誤 ' + errors + ' 筆';
  派班_寫紀錄_(sh紀錄, batch, '自動派班', rows.length, 0, append.length, manual, skipped, errors, append.length ? '成功' : '無新增', msg);

  return { ok: true, message: msg, 派班筆數: append.length, 待人工派班: manual, 略過筆數: skipped, 錯誤筆數: errors, 時間: now };
}

function 派班_回寫需求狀態_(sh, headers, updates, now) {
  var cStatus = headers.indexOf('派班狀態') + 1;
  var cNote = headers.indexOf('備註') + 1;
  var cUpdate = headers.indexOf('更新時間') + 1;
  updates.forEach(function(u) {
    if (cStatus > 0) sh.getRange(u.rowIndex, cStatus).setValue(u.status);
    if (cNote > 0 && u.note) sh.getRange(u.rowIndex, cNote).setValue(u.note);
    if (cUpdate > 0) sh.getRange(u.rowIndex, cUpdate).setValue(now);
  });
}

function 派班_讀人員_(ss) {
  var sh = ss.getSheetByName(派班_工作表名稱_.人員主檔);
  if (!sh || sh.getLastRow() < 2) return [];
  return 派班_讀工作表物件_(sh).rows.map(function(x){
    var r = x.data || {};
    return {
      工號: 派班_文字取值_(r, ['工號','員工編號','員工工號','id']),
      姓名: 派班_文字取值_(r, ['姓名','中文名','名字','name']),
      部門: 派班_文字取值_(r, ['部門','單位','dept']),
      組別: 派班_文字取值_(r, ['組別','班組','group']),
      職稱: 派班_文字取值_(r, ['職稱','職位','title']),
      班別: 派班_標準班別_(派班_文字取值_(r, ['班別','班次','工作班別','班別名稱','上班時段'])),
      啟用: String(r['啟用'] || '是').trim()
    };
  }).filter(function(p){ return (p.工號 || p.姓名) && p.啟用 !== '否'; });
}

function 派班_建立工站人員索引_(ss, people) {
  var idx = { byStation: {}, all: people };
  派班_工站關聯候選分頁_.forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    var rows = 派班_讀工作表物件_(sh).rows.map(function(x){ return x.data; });
    rows.forEach(function(r) {
      var station = 派班_文字取值_(r, ['報工工站名稱','工站名稱','工站','站別','名稱']);
      var product = 派班_文字取值_(r, ['產品編號','料號','產品料號']);
      var customer = 派班_文字取值_(r, ['客戶品號','客戶料號']);
      var nameList = 派班_文字取值_(r, ['主作業員','備援作業員','作業員','人員','姓名','主/備作業員']);
      var idList = 派班_文字取值_(r, ['主作業員工號','備援作業員工號','工號','員工工號','作業員工號']);
      var candidates = 派班_解析候選人_(people, idList, nameList);
      if (!candidates.length) return;
      var keys = [
        派班_Key_(product, customer, station),
        派班_Key_(product, '', station),
        派班_Key_('', customer, station),
        派班_Key_('', '', station)
      ];
      keys.forEach(function(k){ if (!k) return; if (!idx.byStation[k]) idx.byStation[k] = []; idx.byStation[k] = idx.byStation[k].concat(candidates); });
    });
  });
  return idx;
}

function 派班_找候選人_(idx, r, shift) {
  var product = String(r['產品編號'] || '').trim();
  var customer = String(r['客戶品號'] || '').trim();
  var station = String(r['報工工站名稱'] || r['工站名稱'] || '').trim();
  var keys = [
    派班_Key_(product, customer, station),
    派班_Key_(product, '', station),
    派班_Key_('', customer, station),
    派班_Key_('', '', station)
  ];
  var candidates = [];
  keys.forEach(function(k){ if (idx.byStation[k]) candidates = candidates.concat(idx.byStation[k]); });
  if (!candidates.length) candidates = idx.all || [];
  candidates = 派班_去重候選人_(candidates);
  var sameShift = candidates.filter(function(p){ return !shift || !p.班別 || p.班別 === shift; });
  return sameShift.length ? sameShift : candidates;
}

function 派班_解析候選人_(people, idText, nameText) {
  var tokens = [];
  String(idText || '').split(/[、,，;；\s\/]+/).filter(Boolean).forEach(function(x){ tokens.push(x); });
  String(nameText || '').split(/[、,，;；\s\/]+/).filter(Boolean).forEach(function(x){ tokens.push(x); });
  var out = [];
  tokens.forEach(function(t) {
    var p = people.find(function(x){ return x.工號 === t || x.姓名 === t || (t && x.姓名 && x.姓名.indexOf(t) >= 0); });
    if (p) out.push(p);
  });
  return 派班_去重候選人_(out);
}

function 派班_去重候選人_(list) {
  var seen = {};
  var out = [];
  (list || []).forEach(function(p) {
    var key = p.工號 || p.姓名;
    if (!key || seen[key]) return;
    seen[key] = true;
    out.push(p);
  });
  return out;
}

function 派班_Key_(product, customer, station) {
  if (!product && !customer && !station) return '';
  return [product || '', customer || '', station || ''].join('｜');
}

function 派班_排序分數_(r) {
  var date = 派班_日期文字_(r['派班日期'] || r['需求日期'] || '2999-12-31').replace(/[^0-9]/g, '');
  var risk = String(r['交期風險'] || '').indexOf('高') >= 0 ? 0 : 1;
  var pri = String(r['優先級'] || '').indexOf('高') >= 0 ? 0 : 1;
  return Number(date || 29991231) * 10 + risk + pri;
}

function 派班_判斷優先級_(r) {
  var risk = String(r['交期風險'] || '').trim();
  if (risk.indexOf('高') >= 0) return '高';
  if (risk.indexOf('中') >= 0) return '中';
  return '一般';
}

function 派班_第一機台_(text) {
  return String(text || '').split(/[、,，;；\s]+/).filter(Boolean)[0] || '';
}

function 派班_班別時間_(shift, params) {
  shift = String(shift || '').trim();
  if (shift.indexOf('大夜') >= 0) return { start: params['大夜班開始'] || '23:00', end: params['大夜班結束'] || '07:50' };
  if (shift.indexOf('加班') >= 0) return { start: params['加班開始'] || '17:20', end: params['加班結束'] || '20:20' };
  return { start: params['早班開始'] || '08:00', end: params['早班結束'] || '16:50' };
}

function 派班_標準班別_(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (s.indexOf('夜') >= 0) return '大夜班';
  if (s.indexOf('加班') >= 0) return '加班';
  if (s.indexOf('早') >= 0) return '早班';
  return s;
}

function 派班_讀參數_(sh) {
  var obj = {};
  if (!sh || sh.getLastRow() < 2) return obj;
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var k = String(values[i][0] || '').trim();
    if (k) obj[k] = values[i][1];
  }
  return obj;
}

function 派班_補預設參數_(sh) {
  var values = sh.getDataRange().getValues();
  var exists = {};
  for (var i = 1; i < values.length; i++) exists[String(values[i][0] || '').trim()] = true;
  var append = [];
  派班_預設參數_.forEach(function(r){ if (!exists[String(r[0])]) append.push(r); });
  if (append.length) sh.getRange(sh.getLastRow() + 1, 1, append.length, 4).setValues(append);
}

function 派班_讀工作表物件_(sh) {
  var values = sh.getDataRange().getValues();
  var headers = values[0].map(function(v){ return String(v || '').trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var empty = true;
    var obj = {};
    headers.forEach(function(h, c){ obj[h] = values[i][c]; if (values[i][c] !== '' && values[i][c] !== null) empty = false; });
    if (!empty) rows.push({ rowIndex: i + 1, data: obj });
  }
  return { headers: headers, rows: rows };
}

function 派班_文字取值_(r, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = r[keys[i]];
    if (v !== null && typeof v !== 'undefined' && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function 派班_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var s = String(v).replace(/^['"]|['"]$/g, '').trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function 派班_取得試算表_() {
  var id = PropertiesService.getScriptProperties().getProperty('智慧製造_SPREADSHEET_ID') || 派班_試算表ID_;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到 Google Sheets');
  return ss;
}

function 派班_重建空白工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  派班_套格式_(sh);
  return sh;
}

function 派班_確保工作表_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0].map(function(v){ return String(v || '').trim(); });
  var missing = headers.filter(function(h){ return current.indexOf(h) < 0; });
  if (missing.length) sh.getRange(1, sh.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  派班_套格式_(sh);
  return sh;
}

function 派班_套格式_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0b5394').setFontColor('#ffffff');
  try { sh.autoResizeColumns(1, Math.min(sh.getLastColumn(), 20)); } catch (err) {}
}

function 派班_寫紀錄_(sh, batch, action, sourceCount, demandCount, dispatchCount, manualCount, skipped, errors, status, message) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, 12).setValues([[
    batch, new Date(), action, sourceCount || 0, demandCount || 0, dispatchCount || 0, manualCount || 0, skipped || 0, errors || 0, status || '', message || '', 派班_現在_()
  ]]);
}

function 派班_正規值_(v) {
  if (v === null || typeof v === 'undefined') return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function 派班_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_初始化_10_派班系統() {
  return 初始化_10_派班系統();
}

function 測試_產生派班需求池() {
  return 派班_產生需求池({});
}

function 測試_自動派班() {
  return 派班_自動派班({});
}
