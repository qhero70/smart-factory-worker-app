/*
 * 報工作業 V4｜Early Fetch Guard v4.1.8
 * 目的：必須在 work-report-v4.html 原始 JS 執行前載入。
 * 只攔截 GAS 初始資料讀取失敗，不改 V4 原 HTML/CSS/JS 主體。
 */
(function(){
  'use strict';
  var VER='v4.1.8_early_fetch_guard';
  var originalFetch=window.fetch ? window.fetch.bind(window) : null;

  function z(n){return String(n).padStart(2,'0');}
  function today(){var d=new Date();return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());}
  function readTask(){
    var keys=['NEXUS_OS_今日報工任務','智慧製造_今日報工任務','今日報工任務'];
    for(var i=0;i<keys.length;i++){
      var raw=sessionStorage.getItem(keys[i])||localStorage.getItem(keys[i]);
      if(!raw)continue;
      try{return JSON.parse(raw);}catch(e){}
    }
    return null;
  }
  function person(id,name,shift,job){return {工號:id,姓名:name,部門:'製造部',組別:'製一組',職稱:job||'作業員',班別:shift||'早班',啟用:'是',照片網址:'',縮圖網址:''};}
  function machines(text){
    return String(text||'').split(/[、,，;；\s]+/).filter(Boolean).map(function(id){
      return {機台編號:id,設備名稱:'機台'+id,照片網址:'',縮圖網址:''};
    });
  }
  function route(prod,cust,name,station,op,main,machineText){
    return {產品編號:prod,客戶品號:cust,品名:name,工站名稱:station,報工工站名稱:station,工序:op,工序範圍:op,工序清單:op?[op]:[],主機台:main,機台清單:machines(machineText||main),產品照片網址:'',產品縮圖網址:'',顯示名稱:[station,op,main].filter(Boolean).join('｜')};
  }
  function fallbackData(reason){
    var persons=[
      person('fhfi546','黃俊偉','早班'),person('fhft606','艾爾迪','大夜班'),person('fhft560','里查','早班'),person('fhfi562','艾德華','早班'),person('fhfi531','駱德祥','早班'),person('fhfi573','黃嘉欣','早班','工程師'),person('fhfg272','陳瑞彬','早班','工程師'),person('fhfi691','石郡浩','早班','助理工程師'),person('fhft578','莫里','早班'),person('fhft582','阿本','早班'),person('fhft590','安東尼','早班'),person('fhft604','路比托','早班'),person('fhft609','班尼','早班')
    ];
    var task=readTask();
    if(task&&task.工號&&!persons.some(function(p){return String(p.工號).toUpperCase()===String(task.工號).toUpperCase();})){
      persons.unshift(person(task.工號,task.姓名||task.作業員||'今日任務人員',task.班別||'早班'));
    }
    var routes=[
      route('A503200000','ACW1799230','OIL PUMP ASSY AGCO 66/74','組裝','OP110','84','84、1063、204、1103、1059'),
      route('A503200000','ACW1799230','OIL PUMP ASSY AGCO 66/74','測試油轉','OP120','1100','1100、1082、1057'),
      route('Z005900000','119717-21650','V-PULLEY CRANKSHAFT','自動化','OP110','1101','1101'),
      route('Z005900000','119717-21650','V-PULLEY CRANKSHAFT','(精)車床N/C+M/C加工','OP140','1064','1064'),
      route('Z005900000','119717-21650','V-PULLEY CRANKSHAFT','研磨','OP170','1098','1098、348、347、1072'),
      route('A002900000','148928-01751','12AY MOUNTING FOOT 沉頭43','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'),
      route('A002900000','148928-01751','12AY MOUNTING FOOT 沉頭43','清洗+目視','OP130','77','77'),
      route('Z907200000','148960-01653','12AY MOUNTING FOOT M16','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'),
      route('Z907200000','148960-01653','12AY MOUNTING FOOT M16','清洗+目視','OP130','77','77'),
      route('Z907100000','1A8310-14250','GEAR BOX, FRONT L','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'),
      route('Z907100000','1A8310-14250','GEAR BOX, FRONT L','試漏(水/氣)','OP140','482','482、478、296、292、396、535'),
      route('Z907100000','1A8310-14250','GEAR BOX, FRONT L','清洗+目視','OP150','77','77'),
      route('Z907000000','1A8310-14240','GEAR BOX, FRONT R','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'),
      route('Z907000000','1A8310-14240','GEAR BOX, FRONT R','清洗+目視','OP150','77','77'),
      route('A900200000','ACX2946990','OIL PUMP AP50','組裝','OP110','84','84、1063、204、1103、1059'),
      route('A900200000','ACX2946990','OIL PUMP AP50','測試油轉','OP150','1100','1100、1082、1057')
    ];
    if(task&&(task.產品編號||task.品名)){
      routes.unshift(route(task.產品編號||'',task.客戶品號||'',task.品名||task.產品名稱||'',task.工站名稱||task.報工工站名稱||'今日派班工站',task.工序||task.OP||'',task.機台編號||task.主機台||'',task.機台編號||task.主機台||''));
    }
    return {成功:true,success:true,ok:true,fallback:true,版本:VER,訊息:'GAS 初始資料讀取失敗，已啟用完整 V4 保底資料。'+(reason?' 原因：'+reason:''),作業日:today(),人員:persons,報工工站群組:routes,途程工站群組:routes,班別清單:[{名稱:'早班',值:'早班'},{名稱:'中班',值:'中班'},{名稱:'大夜班',值:'大夜班'}],異常類型:['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],不良原因:{Z:[{代碼:'Z01',名稱:'素材裂縫'},{代碼:'Z02',名稱:'加工砂孔'},{代碼:'Z03',名稱:'外觀刮傷'}],Y:[{代碼:'Y01',名稱:'內徑超差'},{代碼:'Y02',名稱:'外徑超差'},{代碼:'Y09',名稱:'孔位'}]},筆數:{人員:persons.length,報工工站群組:routes.length,產品:routes.length,工站機台關聯:routes.length,照片索引:0,不良代碼:6}};
  }
  function isInitRequest(input,init){
    var s='';
    try{s+=typeof input==='string'?input:(input&&input.url)||'';}catch(e){}
    try{s+=' '+(init&&init.body?String(init.body):'');}catch(e){}
    return /取得報工作業v2初始資料|action=([^&]*%E5%8F%96%E5%BE%97%E5%A0%B1%E5%B7%A5)/.test(s);
  }
  function makeResponse(reason){
    return Promise.resolve(new Response(JSON.stringify(fallbackData(reason)),{status:200,statusText:'OK',headers:{'Content-Type':'application/json;charset=utf-8'}}));
  }
  window.fetch=function(input,init){
    if(isInitRequest(input,init)){
      if(!originalFetch)return makeResponse('瀏覽器無 fetch');
      return originalFetch(input,init).then(function(res){return res;}).catch(function(err){return makeResponse(err&&err.message?err.message:String(err||'Load failed'));});
    }
    return originalFetch?originalFetch(input,init):Promise.reject(new Error('fetch unavailable'));
  };
  window.V4_EARLY_FETCH_GUARD={版本:VER,保底資料:fallbackData};
  console.log('V4 Early Fetch Guard loaded',VER);
})();
