/*
 * 報工作業 V4｜Safari 保底資料 + V4 UX 正式優化層
 * 版本：v4.2.5_照片卡片_工站快選_不良分配防呆
 * 原則：不刪 V4 原 HTML/CSS/JS，只以外掛方式補資料、補照片、補互動防呆。
 */
(function(){
  'use strict';

  var 版本 = 'v4.2.5_ux_photo_station_defect_guard';
  var 前一層CallBackend = window.callBackend;

  var 人員照片 = {
    fhfi546:'https://drive.google.com/thumbnail?id=1jW_-zSDXCHcJBe66dviCl063WQw8V1Fl&sz=w900',
    fhft606:'https://drive.google.com/thumbnail?id=1R2VU1fDHlVp9La2hg1dIfxIxYnt2Rbed&sz=w900',
    fhft560:'https://drive.google.com/thumbnail?id=1FRPcRXVXZf2McWcXoqFgbIuKu34eN3Sg&sz=w900',
    fhft562:'https://drive.google.com/thumbnail?id=1yzBgcJU9eIBFwivtik9KomZwXHkFU5qL&sz=w900',
    fhfi562:'https://drive.google.com/thumbnail?id=1x1YIk3OSYiHtrfbHzbGFFuhAboXghr-_&sz=w900',
    fhfi531:'https://drive.google.com/thumbnail?id=1qcATMZvaVAYdqN1BjVbytcYIHmq3YmBD&sz=w900',
    fhfi573:'https://drive.google.com/thumbnail?id=1L-ip7mulIe43qICfwbtP1gzJrJTrndYO&sz=w900',
    fhfg272:'https://drive.google.com/thumbnail?id=1L-ip7mulIe43qICfwbtP1gzJrJTrndYO&sz=w900',
    fhfi691:'https://drive.google.com/thumbnail?id=1B8r4Yr52YSZYonkaMPGbbn6hO6_noU7Y&sz=w900',
    fhft578:'https://drive.google.com/thumbnail?id=1S91mQs3gX1J3oIvy2AkQhyTo5MZUDnX3&sz=w900',
    fhft582:'https://drive.google.com/thumbnail?id=1xMhtXQ3Sr_wZtfQJ_hlFsSIHA8fDdhcg&sz=w900',
    fhfb047:'https://drive.google.com/thumbnail?id=1MHjbWLRbGeVR16VzuqEi7LAsU6jH64PW&sz=w900'
  };

  var 產品照片 = {
    A503203008:'https://drive.google.com/thumbnail?id=1I6O1zGcDkqxGo4lP65OI0o4GnlXBV9_B&sz=w900',
    A401800000:'https://drive.google.com/thumbnail?id=12JgM6j8_KipUKdz_nhXIV_rbfYJ21hCC&sz=w900',
    A402301020:'https://drive.google.com/thumbnail?id=1ZEqwxEZmZuu5ZNv-pCvO_8nf7mM0tMjw&sz=w900',
    A402300020:'https://drive.google.com/thumbnail?id=1l0BaMP7WyiEi9s1XjyzaZHJTXFd2KVJ5&sz=w900',
    Z907403008:'https://drive.google.com/thumbnail?id=1je6tB0_pnYDxxoXaawlt_1U-H4_tkJai&sz=w900',
    Z907500010:'https://drive.google.com/thumbnail?id=17rcFPqGjO0WN1m4SrFddMoeXuMqLZiS9&sz=w900',
    Z916300000:'https://drive.google.com/thumbnail?id=1N_LadssPxVwlUqJ7TLMosSvUbsDuxR0O&sz=w900',
    Z005300000:'https://drive.google.com/thumbnail?id=1H1HaUy0gDyW6Cv7oyp4z0xuBgI452Yqq&sz=w900',
    Z004400000:'https://drive.google.com/thumbnail?id=1anfvWzMKyBiBnIYpJEm4XIzYJ3S1IHBm&sz=w900'
  };

  var 機台照片 = {
    77:'https://drive.google.com/thumbnail?id=1Q6V44wBAFkXcUXbfX2Xk-6g5lPmSgf0F&sz=w900',
    1072:'https://drive.google.com/thumbnail?id=1tswECGJpdkfjHzHfaXy79bBGhMEDrLZB&sz=w900',
    390:'https://drive.google.com/thumbnail?id=1fbQZs1DCfLNz64ENo_TwOKndpTdg1o9k&sz=w900',
    397:'https://drive.google.com/thumbnail?id=1VVjF1PZ6XOIBeTiLLRWa6eJTB1VNagFT&sz=w900',
    424:'https://drive.google.com/thumbnail?id=1d4onFkHXAKSBGoZlx-dwbREgvl0D4cJF&sz=w900',
    1061:'https://drive.google.com/thumbnail?id=1fwkelwLkr4ogG0wbbBzutBkIIvMT0Fy6&sz=w900',
    129:'https://drive.google.com/thumbnail?id=1r7gX_ZBKSAigsnBC1nJ648mzm2eIArZB&sz=w900',
    447:'https://drive.google.com/thumbnail?id=13Eq4rl5V8jgO1wKCLr1EsDt3qnu49mlN&sz=w900',
    334:'https://drive.google.com/thumbnail?id=1AVgs69xyXSLuWPM29g9fKSMcQDRomchL&sz=w900',
    1071:'https://drive.google.com/thumbnail?id=1rknzLeQ69kfKRIjShWMWm-V7VSQ26CQW&sz=w900',
    387:'https://drive.google.com/thumbnail?id=1YGs9Z3k2LCVJ1sEdNVTr27r2YpXm69NY&sz=w900',
    204:'https://drive.google.com/thumbnail?id=1DApcuqdreyehEEHsAJaB45Qp8aPrRD69&sz=w900'
  };

  var 不良英文 = {
    Z01:'Material Crack', Z02:'Sand Porosity', Z03:'Surface Scratch', Z04:'Burr', Z05:'Dent', Z06:'Missing Material', Z07:'Deformation', Z08:'Rust', Z09:'Casting Defect',
    Y01:'Inner Diameter Out of Tolerance', Y02:'Outer Diameter Out of Tolerance', Y03:'Length Out of Tolerance', Y04:'Surface Roughness', Y05:'Flatness Out of Tolerance', Y06:'Runout Out of Tolerance', Y07:'Thread Defect', Y08:'Chamfer Defect', Y09:'Hole Position', Y10:'Machining Miss', Y11:'Tap Broken', Y12:'Tool Mark'
  };
  var 不良名稱英文 = {
    '素材裂縫':'Material Crack','加工砂孔':'Sand Porosity','外觀刮傷':'Surface Scratch','缺肉':'Missing Material','毛邊':'Burr','碰傷':'Dent','變形':'Deformation','鏽蝕':'Rust',
    '內徑超差':'Inner Diameter Out of Tolerance','外徑超差':'Outer Diameter Out of Tolerance','長度超差':'Length Out of Tolerance','表面粗糙度':'Surface Roughness','孔位':'Hole Position','孔位偏移':'Hole Position Offset','牙孔':'Thread Hole Defect','攻牙':'Tapping Defect','加工漏失':'Machining Miss'
  };

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }
  function id(v){ return String(v == null ? '' : v).trim(); }
  function toPhotoUrl(v){
    var s = id(v); if(!s) return '';
    var m = s.match(/[-\w]{25,}/);
    if(m) return 'https://drive.google.com/thumbnail?id=' + m[0] + '&sz=w900';
    return s;
  }

  function 讀任務(){
    var keys = ['NEXUS_OS_今日報工任務','智慧製造_今日報工任務','今日報工任務'];
    for (var i=0;i<keys.length;i++) {
      var raw = sessionStorage.getItem(keys[i]) || localStorage.getItem(keys[i]);
      if (!raw) continue;
      try { return JSON.parse(raw); } catch(e) {}
    }
    return null;
  }

  function 補照片到人員(p){
    p = Object.assign({}, p || {});
    var key = id(p.工號 || p.員工編號);
    var u = toPhotoUrl(p.縮圖網址 || p.照片網址 || p.作業員照片網址 || 人員照片[key]);
    p.工號 = key || p.工號 || '';
    p.照片網址 = p.照片網址 || u;
    p.縮圖網址 = p.縮圖網址 || u;
    return p;
  }

  function 補照片到工站群組(g){
    g = Object.assign({}, g || {});
    var pid = id(g.產品編號 || g.料號);
    var pu = toPhotoUrl(g.產品縮圖網址 || g.產品照片網址 || 產品照片[pid]);
    g.產品照片網址 = g.產品照片網址 || pu;
    g.產品縮圖網址 = g.產品縮圖網址 || pu;
    var rawList = Array.isArray(g.機台清單) ? g.機台清單 : String(g.機台清單 || g.機台編號清單 || g.主機台 || '').split(/[、,，;；\s]+/).filter(Boolean).map(function(x){ return {機台編號:x}; });
    g.機台清單 = rawList.map(function(m){
      if (typeof m === 'string') m = {機台編號:m};
      m = Object.assign({}, m || {});
      var mid = id(m.機台編號 || m.主機台 || m.編號 || g.主機台);
      var mu = toPhotoUrl(m.縮圖網址 || m.照片網址 || 機台照片[mid]);
      m.機台編號 = mid;
      m.照片網址 = m.照片網址 || mu;
      m.縮圖網址 = m.縮圖網址 || mu;
      m.設備名稱 = m.設備名稱 || m.機台名稱 || ('機台' + mid);
      return m;
    }).filter(function(m){ return !!m.機台編號; });
    return g;
  }

  function 補不良英文(data){
    data = data || {};
    var ng = data.不良原因 || data.ngReasons || {Z:[],Y:[]};
    ['Z','Y'].forEach(function(cat){
      ng[cat] = Array.isArray(ng[cat]) ? ng[cat] : [];
      ng[cat] = ng[cat].map(function(x){
        x = Object.assign({}, x || {});
        var code = id(x.代碼 || x.code);
        var name = id(x.名稱 || x.不良名稱 || x.name);
        x.代碼 = code; x.名稱 = name;
        x.英文名稱 = id(x.英文名稱 || x.enName || x.english || 不良英文[code] || 不良名稱英文[name] || 'Defect');
        return x;
      });
    });
    if (!ng.Z.length) ng.Z = [
      {代碼:'Z01',名稱:'素材裂縫',英文名稱:'Material Crack'},
      {代碼:'Z02',名稱:'加工砂孔',英文名稱:'Sand Porosity'},
      {代碼:'Z03',名稱:'外觀刮傷',英文名稱:'Surface Scratch'},
      {代碼:'Z04',名稱:'毛邊',英文名稱:'Burr'}
    ];
    if (!ng.Y.length) ng.Y = [
      {代碼:'Y01',名稱:'內徑超差',英文名稱:'Inner Diameter Out of Tolerance'},
      {代碼:'Y02',名稱:'外徑超差',英文名稱:'Outer Diameter Out of Tolerance'},
      {代碼:'Y03',名稱:'長度超差',英文名稱:'Length Out of Tolerance'},
      {代碼:'Y04',名稱:'表面粗糙度',英文名稱:'Surface Roughness'},
      {代碼:'Y09',名稱:'孔位',英文名稱:'Hole Position'}
    ];
    data.不良原因 = ng;
    return data;
  }

  function 補資料(data){
    data = data || {};
    data.人員 = (data.人員 || data.people || []).map(補照片到人員);
    var groups = data.報工工站群組 || data.途程工站群組 || data.routes || [];
    data.報工工站群組 = groups.map(補照片到工站群組);
    data.途程工站群組 = data.報工工站群組;
    data = 補不良英文(data);
    data.筆數 = data.筆數 || {};
    data.筆數.人員 = data.人員.length;
    data.筆數.報工工站群組 = data.報工工站群組.length;
    data.筆數.工站機台關聯 = data.報工工站群組.length;
    data.筆數.照片索引 = Object.keys(人員照片).length + Object.keys(產品照片).length + Object.keys(機台照片).length;
    return data;
  }

  function 人員清單(){
    var base = [
      ['fhfi546','黃俊偉','早班','作業員'],['fhft606','艾爾迪','大夜班','作業員'],['fhft560','里查','早班','作業員'],['fhfi562','黃秀惠','早班','作業員'],['fhft562','艾德華','早班','作業員'],['fhfi531','駱德祥','早班','作業員'],['fhfi573','黃嘉欣','早班','工程師'],['fhfg272','陳瑞彬','早班','工程師'],['fhfi691','石郡浩','早班','助理工程師'],['fhft578','莫里','早班','作業員'],['fhft582','阿本','早班','作業員']
    ].map(function(r){ return 補照片到人員({工號:r[0], 姓名:r[1], 班別:r[2], 部門:'製造部', 組別:'製一組', 職稱:r[3], 啟用:'是'}); });
    var task = 讀任務();
    if (task && task.工號 && !base.some(function(p){ return id(p.工號).toUpperCase() === id(task.工號).toUpperCase(); })) {
      base.unshift(補照片到人員({工號:task.工號, 姓名:task.姓名 || task.作業員 || '今日任務人員', 班別:task.班別 || '早班', 部門:'製造部', 組別:'製一組', 職稱:'作業員', 啟用:'是'}));
    }
    return base;
  }

  function 機台清單(str){
    return String(str || '').split(/[、,，;；\s]+/).filter(Boolean).map(function(mid){ return 補照片到工站群組({主機台:mid, 機台清單:[{機台編號:mid}]}).機台清單[0]; });
  }

  function 工站群組(){
    var rows = [
      ['A002900000','148928-01751','12AY MOUNTING FOOT 沉頭43 (489)','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'],
      ['A002900000','148928-01751','12AY MOUNTING FOOT 沉頭43 (489)','清洗+目視','OP130','77','77'],
      ['Z907200000','148960-01653','12AY MOUNTING FOOT M16 (489)','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'],
      ['Z907200000','148960-01653','12AY MOUNTING FOOT M16 (489)','清洗+目視','OP130','77','77'],
      ['A500900000','1A8060-32310','CARRIER,DIFFERENTIA (大) 171→449→406','車床加工+M/C加工','OP110','171','171、451、449'],
      ['A500900000','1A8060-32310','CARRIER,DIFFERENTIA (大) 171→449→406','清洗+目視','OP140','77','77'],
      ['A401800000','1A8042-32310','CARRIER,DIFFERENTIAL (小) 170→171→406','車床加工+M/C加工','OP110','171','171、451、449'],
      ['A401800000','1A8042-32310','CARRIER,DIFFERENTIAL (小) 170→171→406','清洗+目視','OP140','77','77'],
      ['A503203008','ACW1799170','COVER FOR O/P AGCO 66/74待組 (5034共線)','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'],
      ['Z907400020','837081039','FRONT COVER ASSEMBLY(大米) (設變)','組裝','OP110','84','84、1063、204、1103、1059'],
      ['Z907500010','837081039','FRONT COVER ASSEMBLY(小米)','組裝','OP110','84','84、1063、204、1103、1059'],
      ['Z907100000','1A8310-14250','GEAR BOX, FRONT L','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'],
      ['Z907100000','1A8310-14250','GEAR BOX, FRONT L','清洗+目視','OP150','77','77'],
      ['A900200000','ACX2946990','OIL PUMP AP50 (AP3K 4CYL)','組裝','OP110','84','84、1063、204、1103、1059'],
      ['A503200000','ACW1799230','OIL PUMP ASSY AGCO 66/74','組裝','OP110','84','84、1063、204、1103、1059'],
      ['A503200000','ACW1799230','OIL PUMP ASSY AGCO 66/74','測試油轉','OP120','1100','1100、1082、1057'],
      ['Z005900000','119717-21650','V-PULLEY CRANKSHAFT (1064→1072→1073→1083)','自動化','OP110','1101','1101'],
      ['Z005900000','119717-21650','V-PULLEY CRANKSHAFT (1064→1072→1073→1083)','(精)車床N/C+M/C加工','OP140','1064','1064'],
      ['Z005900000','119717-21650','V-PULLEY CRANKSHAFT (1064→1072→1073→1083)','研磨','OP170','1098','1098、348、347、1072']
    ];
    var task = 讀任務();
    if (task && (task.產品編號 || task.品名)) {
      rows.unshift([task.產品編號 || '', task.客戶品號 || '', task.品名 || task.產品名稱 || '', task.工站名稱 || task.報工工站名稱 || '今日派班工站', task.工序 || task.OP || '', task.機台編號 || task.主機台 || '', task.機台編號 || task.主機台 || '']);
    }
    return rows.map(function(r){
      return 補照片到工站群組({產品編號:r[0],客戶品號:r[1],品名:r[2],工站名稱:r[3],報工工站名稱:r[3],工序:r[4],工序範圍:r[4],主機台:r[5],機台清單:機台清單(r[6]),顯示名稱:[r[3],r[4],r[5]].filter(Boolean).join('｜')});
    });
  }

  function 保底資料(errorText){
    return 補資料({
      成功:true, success:true, fallback:true, 版本:版本,
      訊息:'GAS 初始資料讀取失敗，已啟用 V4 本機保底主檔。' + (errorText ? ' 原因：' + errorText : ''),
      作業日:new Date().toISOString().slice(0,10),
      人員:人員清單(), 報工工站群組:工站群組(), 途程工站群組:工站群組(),
      班別清單:[{名稱:'早班',值:'早班'},{名稱:'中班',值:'中班'},{名稱:'大夜班',值:'大夜班'}],
      異常類型:['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],
      不良原因:{
        Z:[{代碼:'Z01',名稱:'素材裂縫'},{代碼:'Z02',名稱:'加工砂孔'},{代碼:'Z03',名稱:'外觀刮傷'},{代碼:'Z04',名稱:'毛邊'}],
        Y:[{代碼:'Y01',名稱:'內徑超差'},{代碼:'Y02',名稱:'外徑超差'},{代碼:'Y03',名稱:'長度超差'},{代碼:'Y04',名稱:'表面粗糙度'},{代碼:'Y09',名稱:'孔位'}]
      }
    });
  }

  window.callBackend = function(fn, arg, ok, fail){
    if (fn === '取得報工作業v2初始資料') {
      var 已回應 = false;
      function safeOk(data){
        已回應 = true;
        data = 補資料(data || {});
        var noData = data.成功 === false || data.success === false || !Array.isArray(data.人員) || !data.人員.length || !Array.isArray(data.報工工站群組) || !data.報工工站群組.length;
        if (noData) return ok && ok(保底資料(data.訊息 || data.message || 'GAS 回傳空主檔'));
        return ok && ok(data);
      }
      function safeFail(err){
        已回應 = true;
        if (typeof window.roar === 'function') window.roar('🟡','讀取失敗已保底','GAS 讀取失敗，已切換本機可報工主檔。', 'warning');
        return ok && ok(保底資料(err && err.message ? err.message : String(err || 'Load failed')));
      }
      try {
        if (typeof 前一層CallBackend === 'function') 前一層CallBackend(fn, arg, safeOk, safeFail);
        else safeFail(new Error('找不到前一層 callBackend'));
      } catch(e) { safeFail(e); }
      setTimeout(function(){ if (!已回應) safeFail(new Error('GAS 初始資料逾時')); }, 8000);
      return;
    }
    return 前一層CallBackend.apply(this, arguments);
  };

  function 注入CSS(){
    var css = `
      .person-card{min-height:188px!important;padding:8px!important;align-items:stretch!important;justify-content:flex-start!important;gap:6px!important;}
      .person-card .avatar-ring{width:100%!important;height:96px!important;border-radius:18px!important;overflow:hidden!important;font-size:30px!important;box-shadow:inset 0 0 0 2px rgba(66,133,244,.18)!important;}
      .person-card .avatar-ring img{width:100%!important;height:100%!important;border-radius:18px!important;object-fit:cover!important;object-position:center 28%!important;display:block!important;}
      .person-card .person-name{font-size:15px!important;font-weight:900!important;line-height:1.15!important;color:#202124!important;}
      .person-card .person-id{font-size:13px!important;font-weight:900!important;letter-spacing:.5px!important;color:#1967d2!important;background:rgba(66,133,244,.10)!important;border-radius:999px!important;padding:3px 8px!important;display:inline-block!important;align-self:center!important;}
      .recent-chip .mini-avatar img{object-fit:cover!important;}
      .v4-station-pop{margin-top:12px;padding:12px;border:2px solid rgba(66,133,244,.24);border-radius:20px;background:rgba(232,240,254,.74);box-shadow:0 8px 24px rgba(66,133,244,.10);}
      .v4-station-title{font-size:14px;font-weight:900;color:#1967d2;margin-bottom:8px;}
      .v4-station-grid{display:grid;grid-template-columns:1fr;gap:8px;}
      .v4-station-card{border:2px solid rgba(66,133,244,.25);border-radius:16px;background:rgba(255,255,255,.90);padding:12px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.05);}
      .v4-station-card.selected{border-color:#34a853;background:#e6f4ea;box-shadow:0 0 0 3px rgba(52,168,83,.18);}
      .v4-station-main{font-size:18px;font-weight:900;color:#202124;}
      .v4-station-sub{font-size:13px;font-weight:800;color:#5f6368;margin-top:4px;}
      #totalQty,#ngQty{font-weight:900!important;font-size:18px!important;}
      .defect-row select option{font-size:14px;}
    `;
    var st = document.createElement('style'); st.id='v4ux425-style'; st.textContent = css; document.head.appendChild(st);
  }

  function 套用資料後優化(){
    try { 補不良英文({不良原因:DB.ngReasons}); DB.ngReasons = 補不良英文({不良原因:DB.ngReasons}).不良原因; } catch(e) {}
    try { if (g('totalQty')) g('totalQty').placeholder = '輸入今日共做數，不預設 / Required'; } catch(e) {}
    try { if (g('ngQty')) { g('ngQty').value = ''; g('ngQty').placeholder = '輸入不良數，可留空 / Blank = 0'; } } catch(e) {}
    try { if (g('displayTotal')) g('displayTotal').textContent = '—'; if (g('displayNG')) g('displayNG').textContent = '—'; if (g('displayGood')) g('displayGood').textContent = '—'; } catch(e) {}
    try { if (typeof buildPersonGrid === 'function') buildPersonGrid(); } catch(e) {}
    try { if (typeof buildProductGrid === 'function') buildProductGrid(); } catch(e) {}
  }

  var 原onDataLoaded = window.onDataLoaded;
  if (typeof 原onDataLoaded === 'function') {
    window.onDataLoaded = function(data){
      原onDataLoaded(補資料(data));
      setTimeout(套用資料後優化, 0);
    };
  }

  var 原selectProduct = window.selectProduct;
  if (typeof 原selectProduct === 'function') {
    window.selectProduct = function(key){
      原selectProduct(key);
      setTimeout(function(){ V4UX_渲染工站快選(); }, 30);
    };
  }

  var 原onWorkstationChange = window.onWorkstationChange;
  if (typeof 原onWorkstationChange === 'function') {
    window.onWorkstationChange = function(){
      原onWorkstationChange();
      setTimeout(V4UX_同步工站快選選取, 0);
    };
  }

  window.V4UX_渲染工站快選 = function(){
    var s = g('workstationSelect'); if(!s) return;
    var list = (STATE && STATE.productGroupList) || [];
    var box = g('v4StationQuickPicker');
    if (!box) { box = document.createElement('div'); box.id = 'v4StationQuickPicker'; box.className = 'v4-station-pop'; s.parentNode.insertBefore(box, s.nextSibling); }
    if (!list.length) { box.innerHTML = '<div class="v4-station-title">請先選擇產品</div>'; return; }
    box.innerHTML = '<div class="v4-station-title">👇 請選擇此產品的報工工站 / Tap a station</div><div class="v4-station-grid">' +
      list.map(function(gr,i){
        var machines = (gr.機台清單 || []).map(function(m){ return m.機台編號; }).filter(Boolean).join('、') || gr.主機台 || '';
        return '<div class="v4-station-card" data-i="'+i+'" onclick="V4UX_選工站('+i+')"><div class="v4-station-main">'+esc(gr.報工工站名稱 || gr.工站名稱 || '未命名工站')+'</div><div class="v4-station-sub">'+esc([gr.工序範圍 || gr.工序, machines].filter(Boolean).join('｜'))+'</div></div>';
      }).join('') + '</div>';
    s.size = Math.min(Math.max(list.length + 1, 2), 5);
    try { s.focus(); if (s.showPicker) s.showPicker(); } catch(e) {}
    box.scrollIntoView({behavior:'smooth', block:'nearest'});
  };

  window.V4UX_選工站 = function(i){
    var s = g('workstationSelect'); if(!s) return;
    s.value = String(i);
    if (typeof onWorkstationChange === 'function') onWorkstationChange();
    s.size = 1;
    V4UX_同步工站快選選取();
    if (typeof roar === 'function') roar('🔧','已選擇工站 / Station Selected', s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : '', 'success');
  };

  window.V4UX_同步工站快選選取 = function(){
    var s = g('workstationSelect');
    var now = s ? String(s.value || '') : '';
    document.querySelectorAll('.v4-station-card').forEach(function(c){ c.classList.toggle('selected', c.getAttribute('data-i') === now); });
  };

  window.calcQty = function(){
    var totalEl = g('totalQty'), ngEl = g('ngQty');
    var totalRaw = totalEl ? totalEl.value.trim() : '';
    var ngRaw = ngEl ? ngEl.value.trim() : '';
    var total = totalRaw === '' ? 0 : Math.max(0, Number(totalRaw) || 0);
    var ng = ngRaw === '' ? 0 : Math.max(0, Number(ngRaw) || 0);
    if (ngRaw !== '' && totalRaw !== '' && ng > total) { ng = total; ngEl.value = String(total); }
    var good = Math.max(total - ng, 0);
    if (g('displayTotal')) g('displayTotal').textContent = totalRaw === '' ? '—' : total;
    if (g('displayNG')) g('displayNG').textContent = ngRaw === '' ? '—' : ng;
    if (g('displayGood')) g('displayGood').textContent = totalRaw === '' ? '—' : good;
    if (totalRaw !== '' && total > 0 && typeof markStepDone === 'function') markStepDone();
    V4UX_限制不良分配();
    if (typeof updateDefectSummaryDisplay === 'function') updateDefectSummaryDisplay();
    if (typeof updateDefectSyncNotice === 'function') updateDefectSyncNotice();
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof updateConfirmSummary === 'function') updateConfirmSummary();
  };

  window.addDefectRow = function(){
    try { var idn = ++defectRowIdCounter; STATE.defectRows.push({ id:idn, category:'', code:'', name:'', enName:'', qty:'' }); renderDefectRows(); } catch(e) {}
  };

  window.onDefectQtyChange = function(rowId, value){
    var row = (STATE.defectRows || []).find(function(r){ return r.id === rowId; });
    if (!row) return;
    row.qty = String(value || '').trim() === '' ? '' : Math.max(0, Math.floor(Number(value) || 0));
    var changed = V4UX_限制不良分配(rowId);
    if (changed && typeof roar === 'function') roar('⚠️','不良分配已自動限制','分配數不可超過不良總數。', 'warning');
    if (changed && typeof renderDefectRows === 'function') renderDefectRows();
    if (typeof updateDefectSummaryDisplay === 'function') updateDefectSummaryDisplay();
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof updateConfirmSummary === 'function') updateConfirmSummary();
  };

  window.V4UX_限制不良分配 = function(triggerId){
    try {
      var totalNG = Number((g('ngQty') && g('ngQty').value) || 0) || 0;
      var used = 0, changed = false;
      (STATE.defectRows || []).forEach(function(r){
        var q = r.qty === '' ? 0 : Math.max(0, Math.floor(Number(r.qty) || 0));
        var allow = Math.max(0, totalNG - used);
        if (q > allow) { r.qty = allow > 0 ? allow : ''; q = allow; changed = true; }
        used += q;
      });
      return changed;
    } catch(e) { return false; }
  };

  window.renderDefectRows = function(){
    var container = g('defectContainer'); if (!container) return;
    if (!STATE.defectRows.length) { container.innerHTML = '<div class="caption" style="padding:6px;">尚無分配項目 / No allocation items yet</div>'; updateDefectSummaryDisplay(); return; }
    補不良英文({不良原因:DB.ngReasons});
    function opts(cat){
      return (DB.ngReasons[cat] || []).map(function(x){
        var en = x.英文名稱 || 不良英文[x.代碼] || 不良名稱英文[x.名稱] || 'Defect';
        return '<option value="'+esc(x.代碼+'|'+cat)+'">'+esc(x.代碼+'｜'+x.名稱+' / '+en)+'</option>';
      }).join('');
    }
    container.innerHTML = STATE.defectRows.map(function(row){
      var v = row.qty === undefined || row.qty === null ? '' : row.qty;
      return '<div class="defect-row" id="defectRow_'+row.id+'"><button class="defect-delete-btn ripple" onclick="deleteDefectRow('+row.id+')">✕</button><select style="flex:2;min-width:0;" onchange="onDefectReasonChange('+row.id+',this.value)"><option value="">── 選擇不良原因 / Select Defect Reason ──</option><optgroup label="Z 素材 / 外觀 Material / Appearance">'+opts('Z')+'</optgroup><optgroup label="Y 加工 / 尺寸 Machining / Dimension">'+opts('Y')+'</optgroup></select><input class="qty-input" type="number" min="0" value="'+esc(v)+'" inputmode="numeric" placeholder="數量" onchange="onDefectQtyChange('+row.id+',this.value)" oninput="onDefectQtyChange('+row.id+',this.value)"></div>';
    }).join('');
    STATE.defectRows.forEach(function(row){ if(!row.code) return; var sel = document.querySelector('#defectRow_'+row.id+' select'); if(sel) sel.value = row.code + '|' + row.category; });
    updateDefectSummaryDisplay();
  };

  window.updateDefectSummaryDisplay = function(){
    var box = g('defectSummary'); if (!box) return;
    var ngRaw = g('ngQty') ? g('ngQty').value.trim() : '';
    var totalNG = Number(ngRaw || 0) || 0;
    var allocated = (STATE.defectRows || []).reduce(function(s,r){ return s + (Number(r.qty)||0); }, 0);
    if (ngRaw === '' && allocated === 0) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    if (ngRaw === '') { box.innerHTML = '📊 請先填不良總數，再分配原因數量 / Enter NG qty first'; return; }
    var diff = totalNG - allocated;
    var color = diff === 0 ? 'var(--g-green)' : 'var(--g-red)';
    box.innerHTML = '📊 分配總和：<b>'+allocated+'</b> / 總不良：<b>'+totalNG+'</b>（<span style="color:'+color+'">'+(diff===0?'✓ 已平衡 / Balanced':'尚可分配 '+diff+' pcs')+'</span>）';
  };

  var 原resetAfterSubmit = window.resetAfterSubmit;
  if (typeof 原resetAfterSubmit === 'function') {
    window.resetAfterSubmit = function(){
      原resetAfterSubmit();
      setTimeout(function(){
        if (g('totalQty')) g('totalQty').value = '';
        if (g('ngQty')) g('ngQty').value = '';
        try { STATE.defectRows = []; addDefectRow(); } catch(e) {}
        calcQty();
      }, 0);
    };
  }

  注入CSS();
  setTimeout(套用資料後優化, 500);
  window.V4_SAFARI_FIX = {版本:版本, 保底資料:保底資料, 補資料:補資料};
  console.log('V4 Safari / UX 補強層已啟用：', 版本);
})();
