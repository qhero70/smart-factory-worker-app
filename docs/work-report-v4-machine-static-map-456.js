/* 製一組報工表單 V4｜靜態機台清單強制覆蓋 v4.5.6
 * 只修：主機台下拉與機台卡片顯示 08_工站途程機台主檔「機台清單」欄位。
 * 這版不再依賴 gviz 或前段正規化結果，直接以正式主庫 08 表 A:H 匯出的機台清單對照覆蓋畫面。
 */
(function(){
  'use strict';
  var 版本='v4.5.6_static_machine_list_force';
  var RAW=`
07821108	M/C加工	OP110,OP120,OP130	1044、1046、1045
A203700010	M/C加工+水末測試	OP110,OP120,OP130	1044、1046、292
B200200000	M/C加工	OP110,OP120,OP130	1069、1070、3軸雷刻機
A500900000	車床加工+M/C加工	OP110,OP120,OP130	171、449、406
A401800000	車床加工+M/C加工	OP110,OP120,OP130	171、170、406
A406000000	車床+M/C	OP110,OP120,OP130,OP140	449、450、436
A505500000	M/C加工	OP110,OP120,OP130	496、486、1044
A503203008	M/C加工	OP110,OP120	1088、1089
A503302008	M/C加工	OP110,OP120	1088、1089
A503402008	M/C加工	OP110,OP120	1088、1089
A801902008	M/C加工	OP110,OP120	1086、1087
A900208008	M/C加工	OP110,OP120	1088、1089
A801910008	M/C加工	OP110,OP120	1088、1089
A302500000	車床+M/C	OP110,OP120,OP130	171、449、406
A303700000	車床加工+M/C加工	OP110,OP120,OP130,OP140	451、1075
A204200000	M/C加工	OP110,OP120	451、1075
Z907100000	M/C加工	OP110,OP120,OP130	487、1035、1027
Z907000000	M/C加工	OP110,OP120,OP130	487、1035、1027
A503201008	M/C加工	OP110,OP120	1026、1040、1041
A503301008	M/C加工	OP110,OP120	1026、1040、1041
A801901018	M/C加工	OP110,OP120	496、1062
A801901008	M/C加工	OP110,OP120	496、1062
A703701000	車床加工	OP110	99、105、66、300
A703701000	研磨	OP130	1098、36
A703701000	M/C加工	OP140,OP150,OP160,OP170	497、368、438
Z703600000	車床加工	OP110	66、99、105、300
Z703600000	研磨	OP130	1098、36
Z703600000	M/C加工	OP140,OP150,OP160,OP170	497、368、438
A703600000	車床加工	OP110	99、105、66、300
A703600000	研磨	OP130	1098、36
A703600000	M/C加工	OP140,OP150,OP160,OP170	497、368、438
B300200000	車床加工	OP110,OP120	1023、1024
Z914000000	M/C加工	OP110,OP120	1045、1046
Z913900000	M/C加工	OP110,OP120	1044、1046
A900200000	組裝	OP110 ,OP120,OP130	1103、1104、1105
A801900000	M/C加工	OP110,OP120,OP130	1103、1104、1105
A503200000	組裝	OP110	1059、1074
A503400000	組裝	OP110	1059、1074
A900201008	M/C加工	OP110,OP120	496、1062
A303800000	車床+M/C	OP110,OP120,OP130,OP140	451、1075
A916000000	車床加工+M/C加工+空氣測試漏	OP110,OP120,OP130,OP140	450、1075
Z916100000	車床+M/C+空氣試漏	OP110,OP120,OP130	451、450、1075
A203500000	車床+M/C	OP110,OP120,OP130,OP140	451、1075
Z916200000	車床+M/C+空氣試漏	OP110,OP120,OP130	450、1075、478
Z704300000	車床加工	OP110,OP120	485、486
Z005900000	自動化	OP110,OP120	1101、1102
Z005900000	（精）車床N/C+M/C加工	OP140,OP150,OP160	1064、1083、1073
B300300000	M/C加工+水末測試	OP110,OP120,OP130	1044、1046、292
`;
  function $(id){return document.getElementById(id)}
  function t(v){return String(v==null?'':v).trim()}
  function n(v){return t(v).replace(/[^A-Za-z0-9]/g,'').toUpperCase()}
  function split(v){return t(v).split(/[、,，;；\s]+/).map(t).filter(Boolean)}
  function val(o,ks){o=o||{};for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v!=null&&t(v)!=='')return t(v)}return ''}
  var MAP=RAW.trim().split('\n').map(function(line){var p=line.split('\t');return {產品:n(p[0]),工站:n(p[1]),工序:n(p[2]),ids:split(p[3])}});
  function machine(id){
    var hit=null;
    try{hit=(DB.機台清單||DB.machines||DB.machineList||[]).find(function(m){return n(m.機台編號||m.設備編號||m.編號)===n(id)})}catch(e){}
    hit=hit||{};
    return {機台編號:t(hit.機台編號||hit.設備編號||id),設備名稱:t(hit.設備名稱||hit.機台名稱||('機台'+id)),機台名稱:t(hit.機台名稱||hit.設備名稱||('機台'+id)),區域:t(hit.區域||hit.廠區||hit.位置),機台型號:t(hit.機台型號||hit.型號),照片網址:t(hit.照片網址||hit.縮圖網址),縮圖網址:t(hit.縮圖網址||hit.照片網址)};
  }
  function currentGroup(){try{var s=$('workstationSelect');var i=s?s.value:'';return i===''?null:(STATE.productGroupList||[])[Number(i)]}catch(e){return null}}
  function findIds(g){
    if(!g)return [];
    var prod=n(($('productCode')||{}).value||val(g,['產品編號']));
    var st=n(val(g,['報工工站名稱','工站名稱']));
    var op=n(val(g,['工序範圍','工序']));
    var hit=MAP.find(function(r){return r.產品===prod&&r.工站===st&&r.工序===op})
         || MAP.find(function(r){return r.產品===prod&&r.工序===op})
         || MAP.find(function(r){return r.產品===prod&&r.工站===st});
    if(hit)return hit.ids;
    var ids=[];
    if(Array.isArray(g.機台編號清單))ids=g.機台編號清單;
    else if(typeof g.機台清單原始==='string')ids=split(g.機台清單原始);
    else if(Array.isArray(g.機台清單))ids=g.機台清單.map(function(m){return t(m.機台編號||m.設備編號||m.編號)}).filter(Boolean);
    return ids.length?ids:split(val(g,['主機台','主機台編號','機台編號']));
  }
  function forceRender(ids){
    var sel=$('mainMachineSelect');
    if(sel){sel.innerHTML='';ids.forEach(function(id){sel.add(new Option(id,id))});if(ids[0])sel.value=ids[0]}
    var grid=$('machineListGrid');
    if(grid){grid.innerHTML=ids.map(function(id){return '<div class="machine-card selected" data-machine="'+id+'"><div class="machine-no-img">無機台照</div><div class="machine-number">'+id+'</div><div class="machine-info">機台'+id+'</div></div>'}).join('')}
  }
  function apply(){
    var g=currentGroup(); if(!g)return;
    var ids=findIds(g); if(!ids.length)return;
    var list=ids.map(machine);
    g.機台編號清單=ids;g.機台清單原始=ids.join('、');g.機台清單=list;
    try{STATE.currentWorkstation=g}catch(e){}
    if(typeof buildMachineSelect==='function')buildMachineSelect(list);
    if(typeof renderMachineGrid==='function')renderMachineGrid(list);
    forceRender(ids);
    try{if(typeof roar==='function')roar('🏭','已改用機台清單欄位','機台：'+ids.join('、'),'success')}catch(e){}
  }
  function fixOptionText(){
    try{var sel=$('workstationSelect');if(!sel||!STATE.productGroupList)return;STATE.productGroupList.forEach(function(g,i){var ids=findIds(g);if(ids.length&&sel.options[i+1])sel.options[i+1].text=[val(g,['報工工站名稱','工站名稱']),val(g,['工序範圍','工序']),ids.join('、')].filter(Boolean).join('｜')})}catch(e){}
  }
  function install(){
    var s=$('workstationSelect');
    if(s&&!s.__v456){s.addEventListener('change',function(){setTimeout(apply,50);setTimeout(apply,300)},true);s.__v456=true;}
    if(typeof onWorkstationChange==='function'&&!onWorkstationChange.__v456){var old=onWorkstationChange;window.onWorkstationChange=function(){var r=old.apply(this,arguments);setTimeout(apply,60);setTimeout(apply,300);return r};window.onWorkstationChange.__v456=true;}
    if(typeof selectProduct==='function'&&!selectProduct.__v456){var oldp=selectProduct;window.selectProduct=function(){var r=oldp.apply(this,arguments);setTimeout(fixOptionText,400);return r};window.selectProduct.__v456=true;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.addEventListener('load',function(){install();setTimeout(fixOptionText,1000)});
  setInterval(install,1500);
  console.log('V4 static machine map force loaded',版本);
})();