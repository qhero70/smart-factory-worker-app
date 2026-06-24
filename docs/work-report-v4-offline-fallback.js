(function(){
'use strict';
var previous=window.callBackend;
var version='v4.2.1_initial_load_fallback';
function p(id,n,shift){return {工號:id,姓名:n,部門:'製造部',組別:'製一組',職稱:'作業員',班別:shift||'早班',啟用:'是',照片網址:'',縮圖網址:''};}
function r(prod,cust,name,station,op,main,machines){return {產品編號:prod,客戶品號:cust,品名:name,報工工站名稱:station,工站名稱:station,工序範圍:op,工序:op,主機台:main,機台清單:String(machines||main||'').split(/[、,，;；\s]+/).filter(Boolean).map(function(id){return {機台編號:id,設備名稱:'機台'+id,照片網址:'',縮圖網址:''};}),產品照片網址:'',產品縮圖網址:'',顯示名稱:[station,op,main].filter(Boolean).join('｜')};}
function data(err){
var persons=[p('fhfi573','黃嘉欣'),p('fhfi676','鍾聿桓'),p('fhfi546','黃俊偉'),p('fhft606','艾爾迪','大夜班'),p('fhft560','里查'),p('fhft562','艾德華'),p('fhfi531','駱德祥'),p('fhft578','莫里'),p('fhft582','阿本'),p('fhft590','安東尼'),p('fhft604','路比托'),p('fhft609','班尼')];
var routes=[r('A302500000','','COVER REAR (神崎) 17 1/449→406','車床+M/C','OP110','449','449、406'),r('A503200000','ACW1799230','OIL PUMP ASSY AGCO 66/74','組裝','OP110','84','84、1063、204、1103、1059'),r('A503200000','ACW1799230','OIL PUMP ASSY AGCO 66/74','測試油轉','OP120','1100','1100、1082、1057'),r('Z005900000','119717-21650','V-PULLEY CRANKSHAFT','自動化','OP110','1101','1101'),r('Z005900000','119717-21650','V-PULLEY CRANKSHAFT','(精)車床N/C+M/C加工','OP140','1064','1064'),r('A002900000','148928-01751','12AY MOUNTING FOOT 沉頭43','M/C加工','OP110','489','489、1044、1075、1016、1069、496、1088'),r('A002900000','148928-01751','12AY MOUNTING FOOT 沉頭43','清洗+目視','OP130','77','77')];
return {成功:true,success:true,版本:version,離線備援:true,讀取錯誤:String(err&&err.message||err||''),作業日:new Date().toISOString().slice(0,10),人員:persons,報工工站群組:routes,途程工站群組:routes,班別清單:[{名稱:'早班',值:'早班'},{名稱:'中班',值:'中班'},{名稱:'大夜班',值:'大夜班'}],異常類型:['無異常','支援調度','材質異常','換刀','機台停機','待料','品質確認','其他'],不良原因:{Z:[{代碼:'Z01',名稱:'缺肉'},{代碼:'Z02',名稱:'加工砂孔'}],Y:[{代碼:'Y01',名稱:'內徑超差'},{代碼:'Y09',名稱:'孔位'}]},筆數:{人員:persons.length,報工工站群組:routes.length}};
}
window.callBackend=function(fn,arg,ok,fail){
 if(fn!=='取得報工作業v2初始資料') return previous?previous(fn,arg,ok,fail):(fail&&fail(new Error('callBackend未初始化')));
 var done=false;
 function pass(x){done=true;if(typeof ok==='function')ok(x);}
 function fallback(e){if(done)return;console.warn('V4初始資料讀取失敗，啟用備援',e);pass(data(e));}
 if(!previous)return fallback(new Error('callBackend未初始化'));
 try{return previous(fn,arg,pass,fallback);}catch(e){return fallback(e);}
};
window.V4_初始資料備援={版本:version,產生:data};
})();
