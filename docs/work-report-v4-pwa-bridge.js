/* 智慧製造報工作業 V4 PWA 資料橋接層
 * 保留 V4 上傳版 HTML / CSS / JS 主體，只補：
 * pwa-config.js、gas-bridge.js、GitHub Pages/PWA 資料橋接、V3 派班報工 payload、09_報工、09_不良紀錄同步。
 */
(function(){
  'use strict';
  var 版本 = 'v4.2.0_pwa_bridge_force_report_write';

  var 原始 = {
    callBackend: window.callBackend,
    onDataLoaded: window.onDataLoaded
  };

  var 正式途程備援 = [
    ['A503200000','ACW1799230','OIL PUMP ASSY AGCO 66/74','組裝','OP110','84','84、1063、204、1103、1059'],
    ['A503200000','ACW1799230','OIL PUMP ASSY AGCO 66/74','測試油轉','OP120','1100','1100、1082、1057'],
    ['Z005900000','119717-21650','V-PULLEY CRANKSHAFT','自動化','OP110','1101','1101'],
    ['Z005900000','119717-21650','V-PULLEY CRANKSHAFT','(精)車床N/C+M/C加工','OP140','1064','1064'],
    ['Z005900000','119717-21650','V-PULLEY CRANKSHAFT','研磨','OP170','1098','1098、348、347、1072'],
    ['A002900000','148928-01751','12AY MOUNTING FOOT 沉頭43','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'],
    ['A002900000','148928-01751','12AY MOUNTING FOOT 沉頭43','清洗+目視','OP130','77','77'],
    ['Z907200000','148960-01653','12AY MOUNTING FOOT M16','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'],
    ['Z907200000','148960-01653','12AY MOUNTING FOOT M16','清洗+目視','OP130','77','77'],
    ['Z907100000','1A8310-14250','GEAR BOX, FRONT L','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'],
    ['Z907100000','1A8310-14250','GEAR BOX, FRONT L','試漏(水/氣)','OP140','482','482、478、296、292、396、535'],
    ['Z907100000','1A8310-14250','GEAR BOX, FRONT L','清洗+目視','OP150','77','77'],
    ['Z907000000','1A8310-14240','GEAR BOX, FRONT R','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'],
    ['Z907000000','1A8310-14240','GEAR BOX, FRONT R','清洗+目視','OP150','77','77'],
    ['A900200000','ACX2946990','OIL PUMP AP50','組裝','OP110','84','84、1063、204、1103、1059'],
    ['A900200000','ACX2946990','OIL PUMP AP50','測試油轉','OP150','1100','1100、1082、1057']
  ];

  function 是AppsScript環境(){
    return typeof google !== 'undefined' && google.script && google.script.run;
  }
  function 取Action(name, fallback){
    var cfg = window.PWA_CONFIG || {};
    return (cfg.API_ACTIONS && cfg.API_ACTIONS[name]) || fallback || name;
  }
  function 取值(obj, keys){
    obj = obj || {};
    for (var i=0;i<keys.length;i++){
      var v = obj[keys[i]];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }
  function 取陣列(obj, keys){
    obj = obj || {};
    for (var i=0;i<keys.length;i++) if (Array.isArray(obj[keys[i]])) return obj[keys[i]];
    for (var k in obj) if (Array.isArray(obj[k]) && keys.some(function(x){ return String(k).indexOf(x) >= 0; })) return obj[k];
    return [];
  }
  function norm(v){ return String(v || '').replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }
  function z(n){ return String(n).padStart(2,'0'); }
  function 今天(){ var d=new Date(); return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); }
  function 現在ID(){ var d=new Date(); return d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+'_'+z(d.getHours())+z(d.getMinutes())+z(d.getSeconds()); }
  function 解析工單(text){ var m=String(text||'').match(/(?:來源工單|工單編號|工單|WO)\s*[=：:]\s*(WO_[A-Za-z0-9_-]+)/i); return m&&m[1]?m[1]:''; }
  function 成功(res){
    if (!res || typeof res !== 'object') return false;
    if (res.成功 === true || res.success === true || res.ok === true || res.status === 'ok') return true;
    return false;
  }
  function 標準化回應(res){
    res = res || {};
    if (res.成功 === undefined) res.成功 = !!(res.success || res.ok || res.status === 'ok');
    if (!res.訊息) res.訊息 = res.message || res.msg || res.error || (res.成功 ? '完成' : '未回傳成功狀態');
    if (!res.報工編號) res.報工編號 = res.reportId || res.報工ID || res.流水號 || res.id || '';
    return res;
  }
  function 讀今日任務(){
    var keys = ['NEXUS_OS_今日報工任務','智慧製造_今日報工任務','今日報工任務'];
    for (var i=0;i<keys.length;i++){
      var raw = sessionStorage.getItem(keys[i]) || localStorage.getItem(keys[i]);
      if (!raw) continue;
      try { return JSON.parse(raw); } catch(e) {}
    }
    return null;
  }

  function 轉機台清單(raw, main){
    if (Array.isArray(raw)) return raw.map(function(m){ return typeof m === 'string' ? {機台編號:m,設備名稱:'機台'+m} : m; });
    if (typeof raw === 'string' && raw.trim().charAt(0) === '[') { try { return JSON.parse(raw); } catch(e){} }
    return String(raw || main || '').split(/[、,，;；\s]+/).filter(Boolean).map(function(id){ return {機台編號:id,設備名稱:'機台'+id}; });
  }
  function 標準化工站群組(g){
    g = Object.assign({}, g || {});
    g.產品編號 = 取值(g, ['產品編號','料號','品號']);
    g.客戶品號 = 取值(g, ['客戶品號','客戶料號']);
    g.品名 = 取值(g, ['品名','產品名稱']);
    g.報工工站名稱 = 取值(g, ['報工工站名稱','工站名稱','建議工站','工站']);
    g.工序範圍 = 取值(g, ['工序範圍','工序','OP','作業順序']);
    g.主機台 = 取值(g, ['主機台','主機台編號','機台編號','建議機台']);
    g.機台清單 = 轉機台清單(g.機台清單 || g.機台編號清單 || g.可用機台, g.主機台).map(function(m){
      m = Object.assign({}, m || {});
      m.機台編號 = 取值(m, ['機台編號','主機台','設備編號','編號']) || g.主機台;
      m.設備名稱 = m.設備名稱 || m.機台名稱 || ('機台'+m.機台編號);
      m.照片網址 = m.照片網址 || m.縮圖網址 || '';
      m.縮圖網址 = m.縮圖網址 || m.照片網址 || '';
      return m;
    }).filter(function(m){ return !!m.機台編號; });
    g.產品照片網址 = g.產品照片網址 || g.產品縮圖網址 || '';
    g.產品縮圖網址 = g.產品縮圖網址 || g.產品照片網址 || '';
    g.顯示名稱 = g.顯示名稱 || [g.報工工站名稱,g.工序範圍,g.主機台].filter(Boolean).join('｜');
    return g;
  }
  function 建立途程備援(){
    return 正式途程備援.map(function(r){ return 標準化工站群組({產品編號:r[0],客戶品號:r[1],品名:r[2],報工工站名稱:r[3],工序範圍:r[4],主機台:r[5],機台清單:r[6]}); });
  }
  function 標準化初始資料(raw){
    raw = raw || {};
    var out = Object.assign({}, raw);
    if (out.成功 === undefined) out.成功 = !!(out.success || out.ok || Array.isArray(out.人員) || Array.isArray(out.people));
    out.人員 = 取陣列(raw, ['人員','people','staff','人員主檔','01_人員主檔']);
    out.報工工站群組 = 取陣列(raw, ['報工工站群組','途程工站群組','工站群組','routes','途程','08_工站途程機台主檔']).map(標準化工站群組);
    if (!out.報工工站群組.length) out.報工工站群組 = 建立途程備援();
    out.不良原因 = out.不良原因 || raw.defects || raw.不良代號 || {Z:[],Y:[]};
    out.不良原因.Z = out.不良原因.Z || [];
    out.不良原因.Y = out.不良原因.Y || [];
    if (!out.不良原因.Z.length && !out.不良原因.Y.length) out.不良原因 = {Z:[{代碼:'Z01',名稱:'素材裂縫',英文名稱:'Surface Crack'},{代碼:'Z02',名稱:'加工砂孔',英文名稱:'Sand Porosity'}],Y:[{代碼:'Y01',名稱:'內徑超差',英文名稱:'Inner Diameter OOT'},{代碼:'Y02',名稱:'外徑超差',英文名稱:'Outer Diameter OOT'}]};
    out.異常類型 = Array.isArray(out.異常類型) ? out.異常類型 : ['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'];
    out.班別清單 = Array.isArray(out.班別清單) ? out.班別清單 : [{名稱:'早班',值:'早班'},{名稱:'中班',值:'中班'},{名稱:'大夜班',值:'大夜班'}];
    out.筆數 = out.筆數 || {};
    out.筆數.人員 = out.筆數.人員 || out.人員.length;
    out.筆數.報工工站群組 = out.筆數.報工工站群組 || out.報工工站群組.length;
    return out;
  }

  function 套用今日任務(){
    var task = 讀今日任務();
    if (!task || !window.DB || !window.STATE) return;
    STATE.今日派班任務 = task;
    var emp = 取值(task, ['工號','員工編號']);
    if (emp && Array.isArray(DB.persons) && typeof window.selectPerson === 'function') {
      var pi = DB.persons.findIndex(function(p){ return String(p.工號 || p.員工編號 || '').trim().toUpperCase() === String(emp).trim().toUpperCase(); });
      if (pi >= 0) selectPerson(pi);
    }
    var code = 取值(task, ['產品編號','料號']);
    var name = 取值(task, ['品名','產品名稱']);
    var group = (DB.workstationGroups || []).find(function(g){ return norm(g.產品編號) === norm(code) || (name && String(g.品名 || '').trim() === String(name).trim()); });
    if (group && typeof window.selectProduct === 'function') {
      selectProduct((group.產品編號 || '') + '|' + (group.品名 || ''));
      var station = 取值(task, ['工站名稱','報工工站名稱','工站']);
      var machine = 取值(task, ['機台編號','主機台','機台']);
      var idx = (STATE.productGroupList || []).findIndex(function(g){
        var stationOk = !station || String(g.報工工站名稱 || g.工站名稱 || '').indexOf(station) >= 0 || String(station).indexOf(g.報工工站名稱 || '') >= 0;
        var machineOk = !machine || JSON.stringify(g.機台清單 || []).indexOf(String(machine)) >= 0 || String(g.主機台 || '').indexOf(String(machine)) >= 0;
        return stationOk && machineOk;
      });
      if (idx >= 0 && typeof window.setVal === 'function' && typeof window.onWorkstationChange === 'function') { setVal('workstationSelect', String(idx)); onWorkstationChange(); }
    }
    var shift = 取值(task, ['班別']);
    if (shift && typeof window.setVal === 'function') setVal('shiftSelect', shift);
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof updateConfirmSummary === 'function') updateConfirmSummary();
  }

  function 轉V3報工Payload(d, task){
    d = d || {};
    task = task || {};
    var total = Number(d.今日共做數 || d.產出數量 || 0);
    var bad = Number(d.不良數 || d.不良數量 || 0);
    var good = Number(d.實際良品數 || Math.max(0, total - bad));
    var workOrder = 取值(task, ['工單編號','來源工單編號','工單']) || 解析工單(task.備註) || d.工單編號 || '';
    var reportId = d.報工編號 || ('RG_PWA_' + 現在ID());
    return Object.assign({}, d, {
      來源:'GitHub Pages PWA 報工作業V4',
      版本:版本,
      報工編號:reportId,
      流水號:reportId,
      派班編號:取值(task, ['派班編號']) || d.派班編號 || '',
      來源派班編號:取值(task, ['派班編號']) || d.派班編號 || '',
      來源需求編號:取值(task, ['來源需求編號','需求編號']) || d.來源需求編號 || '',
      工單編號:workOrder,
      作業日:取值(task, ['作業日','日期']) || d.作業日 || 今天(),
      工號:d.工號 || 取值(task, ['工號']),
      姓名:d.姓名 || 取值(task, ['姓名']),
      班別:d.班別 || 取值(task, ['班別']),
      產品編號:d.產品編號 || 取值(task, ['產品編號']),
      客戶品號:d.客戶品號 || 取值(task, ['客戶品號']),
      品名:d.品名 || 取值(task, ['品名']),
      工站名稱:d.報工工站名稱 || d.工站名稱 || 取值(task, ['工站名稱','工站']),
      報工工站名稱:d.報工工站名稱 || d.工站名稱 || 取值(task, ['工站名稱','工站']),
      機台編號:d.主機台 || d.機台編號 || 取值(task, ['機台編號','機台']),
      今日共做數:total,
      報工數量:total,
      產出數量:total,
      不良數量:bad,
      不良數:bad,
      實際良品數:good,
      良品數量:good,
      狀態:'完成',
      NEXUS派班報工:取值(task,['派班編號']) ? '是' : '否',
      NEXUS任務版本:'V4_接V3',
      備註:[d.備註 || '', task.派班編號 ? ('V4沿用V3派班報工扣工單；來源派班=' + task.派班編號) : 'V4一般報工'].filter(Boolean).join('；')
    });
  }
  function 補齊不良Payload(d){
    var task = 讀今日任務() || (window.STATE && STATE.今日派班任務) || {};
    var base = 轉V3報工Payload(d || {}, task);
    return Object.assign({}, d || {}, base, { 不良同步來源:'V4報工送出後同步09_不良紀錄' });
  }
  async function PWA呼叫(fn, arg){
    if (!window.GAS橋接器) throw new Error('找不到 gas-bridge.js，請確認 pwa-config.js、gas-bridge.js 已載入。');
    if (fn === '取得報工作業v2初始資料') return 標準化初始資料(await GAS橋接器.取得報工初始資料());
    if (fn === '寫入報工作業v2') {
      var task = 讀今日任務() || (window.STATE && STATE.今日派班任務) || {};
      var payload = 轉V3報工Payload(arg || {}, task);
      var actions = payload.派班編號 ? [取Action('寫入今日派班報工','寫入今日派班報工'), 取Action('寫入報工作業v2','寫入報工作業v2')] : [取Action('寫入報工作業v2','寫入報工作業v2')];
      var errors = [];
      for (var i=0;i<actions.length;i++){
        try {
          var res = 標準化回應(await GAS橋接器.POST(actions[i], payload, {timeoutMs:18000}));
          if (成功(res)) return res;
          errors.push(actions[i] + '：' + (res.訊息 || JSON.stringify(res).slice(0,180)));
        } catch(e) { errors.push(actions[i] + '：' + (e.message || String(e))); }
      }
      throw new Error('報工未寫入，所有後端動作失敗：' + errors.join('；'));
    }
    if (fn === '寫入不良紀錄v2') {
      var badPayload = 補齊不良Payload(arg || {});
      var badActions = [取Action('寫入不良紀錄v2','寫入不良紀錄v2'), '寫入不良紀錄38_7', '寫入不良紀錄'];
      var badErrors = [];
      for (var j=0;j<badActions.length;j++){
        try {
          var r = 標準化回應(await GAS橋接器.POST(badActions[j], badPayload, {timeoutMs:18000}));
          if (成功(r)) return r;
          badErrors.push(badActions[j] + '：' + (r.訊息 || JSON.stringify(r).slice(0,180)));
        } catch(ex) { badErrors.push(badActions[j] + '：' + (ex.message || String(ex))); }
      }
      throw new Error('不良紀錄未同步：' + badErrors.join('；'));
    }
    var method = arg == null ? 'GET' : 'POST';
    return 標準化回應(await GAS橋接器.呼叫(fn, arg || {}, {method:method}));
  }

  window.callBackend = function(fn, arg, ok, fail){
    if (是AppsScript環境() && typeof 原始.callBackend === 'function') return 原始.callBackend(fn, arg, ok, fail);
    PWA呼叫(fn, arg).then(function(res){ if (typeof ok === 'function') ok(res); }).catch(function(err){
      if (typeof fail === 'function') fail(err);
      else if (typeof window.roar === 'function') roar('⚠️','PWA資料橋接錯誤', err.message || String(err), 'error');
      else console.error(err);
    });
  };
  window.onDataLoaded = function(data){
    data = 標準化初始資料(data);
    if (typeof 原始.onDataLoaded === 'function') 原始.onDataLoaded(data);
    setTimeout(套用今日任務, 80);
  };
  window.V4_PWA_資料橋接 = {版本:版本, 標準化初始資料:標準化初始資料, 轉V3報工Payload:轉V3報工Payload, 讀今日任務:讀今日任務, 套用今日任務:套用今日任務};
  console.log('V4 PWA 資料橋接已啟用：', 版本);
})();
