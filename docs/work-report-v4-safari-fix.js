/*
 * 報工作業 V4｜iOS Safari / PWA Load Failed 保底層
 * 目的：GAS 初始資料讀取被 iOS Safari / 內嵌瀏覽器擋住時，不讓畫面停在讀取失敗。
 * 原則：不改 V4 原 HTML/CSS/JS，只攔截「取得報工作業v2初始資料」並補正式可操作主檔。
 */
(function(){
  'use strict';
  var 版本 = 'v4.1.4_safari_load_failed_fallback';
  var 前一層CallBackend = window.callBackend;

  function 讀任務(){
    var keys = ['NEXUS_OS_今日報工任務','智慧製造_今日報工任務','今日報工任務'];
    for (var i=0;i<keys.length;i++) {
      var raw = sessionStorage.getItem(keys[i]) || localStorage.getItem(keys[i]);
      if (!raw) continue;
      try { return JSON.parse(raw); } catch(e) {}
    }
    return null;
  }

  function 人員清單(){
    var base = [
      ['fhfi546','黃俊偉','早班','作業員'],
      ['fhft606','艾爾迪','大夜班','作業員'],
      ['fhft560','里查','早班','作業員'],
      ['fhfi562','艾德華','早班','作業員'],
      ['fhfi531','駱德祥','早班','作業員'],
      ['fhfi573','黃嘉欣','早班','工程師'],
      ['fhfg272','陳瑞彬','早班','工程師'],
      ['fhfi691','石郡浩','早班','助理工程師'],
      ['fhfs287','李宇家','早班','助理工程師'],
      ['fhft667','林于傑','早班','作業員'],
      ['fhfg268','黃貫全','早班','作業員'],
      ['fhfs213','李德亨','早班','作業員']
    ].map(function(r){ return {工號:r[0], 姓名:r[1], 班別:r[2], 部門:'製造部', 組別:'製一組', 職稱:r[3], 啟用:'是'}; });

    var task = 讀任務();
    if (task && task.工號 && !base.some(function(p){ return String(p.工號).toUpperCase() === String(task.工號).toUpperCase(); })) {
      base.unshift({
        工號:task.工號,
        姓名:task.姓名 || task.作業員 || '今日任務人員',
        班別:task.班別 || '早班',
        部門:'製造部',
        組別:'製一組',
        職稱:'作業員',
        啟用:'是'
      });
    }
    return base;
  }

  function 機台清單(str, photoMap){
    return String(str || '').split(/[、,，;；\s]+/).filter(Boolean).map(function(id){
      return {
        機台編號:id,
        設備名稱:'機台' + id,
        照片網址:(photoMap && photoMap[id]) || '',
        縮圖網址:(photoMap && photoMap[id]) || ''
      };
    });
  }

  function 工站群組(){
    var photo = {
      '77':'', '84':'', '489':'', '1100':'', '1101':'', '1064':'', '1098':'', '482':''
    };
    var rows = [
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

    var task = 讀任務();
    if (task && (task.產品編號 || task.品名)) {
      rows.unshift([
        task.產品編號 || '',
        task.客戶品號 || '',
        task.品名 || task.產品名稱 || '',
        task.工站名稱 || task.報工工站名稱 || '今日派班工站',
        task.工序 || task.OP || '',
        task.機台編號 || task.主機台 || '',
        task.機台編號 || task.主機台 || ''
      ]);
    }

    return rows.map(function(r){
      return {
        產品編號:r[0],
        客戶品號:r[1],
        品名:r[2],
        工站名稱:r[3],
        報工工站名稱:r[3],
        工序:r[4],
        工序範圍:r[4],
        工序清單:r[4] ? [r[4]] : [],
        主機台:r[5],
        機台清單:機台清單(r[6], photo),
        顯示名稱:[r[3], r[4], r[5]].filter(Boolean).join('｜'),
        產品照片網址:'',
        產品縮圖網址:''
      };
    });
  }

  function 保底資料(errorText){
    return {
      成功:true,
      success:true,
      fallback:true,
      版本:版本,
      訊息:'GAS 初始資料讀取失敗，已啟用 V4 本機保底主檔。' + (errorText ? ' 原因：' + errorText : ''),
      作業日:new Date().toISOString().slice(0,10),
      人員:人員清單(),
      報工工站群組:工站群組(),
      途程工站群組:工站群組(),
      班別清單:[{名稱:'早班',值:'早班'},{名稱:'中班',值:'中班'},{名稱:'大夜班',值:'大夜班'}],
      異常類型:['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],
      不良原因:{
        Z:[{代碼:'Z01',名稱:'素材裂縫'},{代碼:'Z02',名稱:'加工砂孔'},{代碼:'Z03',名稱:'外觀刮傷'}],
        Y:[{代碼:'Y01',名稱:'內徑超差'},{代碼:'Y02',名稱:'外徑超差'},{代碼:'Y03',名稱:'長度超差'}]
      },
      筆數:{人員:人員清單().length, 報工工站群組:工站群組().length, 產品:0, 工站機台關聯:0, 照片索引:0, 不良代碼:6}
    };
  }

  window.callBackend = function(fn, arg, ok, fail){
    if (fn === '取得報工作業v2初始資料') {
      var 已回應 = false;
      function safeOk(data){
        已回應 = true;
        data = data || {};
        var noData = data.成功 === false || data.success === false || !Array.isArray(data.人員) || !data.人員.length || !Array.isArray(data.報工工站群組) || !data.報工工站群組.length;
        if (noData) return ok && ok(保底資料(data.訊息 || data.message || 'GAS 回傳空主檔'));
        return ok && ok(data);
      }
      function safeFail(err){
        已回應 = true;
        if (typeof window.roar === 'function') roar('🟡','讀取失敗已保底','GAS 讀取失敗，已切換本機可報工主檔。', 'warn');
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

  window.V4_SAFARI_FIX = {版本:版本, 保底資料:保底資料};
  console.log('V4 Safari Load Failed 保底層已啟用：', 版本);
})();
