/**
 * 07_報工作業v2_化新班別規則_短版.gs
 * 化新班別工時計算：早班 08:00-16:50，中班 16:50-01:40，夜班 23:00-07:50
 * 中班休息：19:00-19:30、21:30-21:40、23:30-23:40
 */
function 取得化新班別規則_報工v2(){
  return {
    早班:{開始:'08:00',結束:'16:50',休息:[['10:00','10:10'],['12:10','12:40'],['14:40','14:50']]},
    中班:{開始:'16:50',結束:'01:40',休息:[['19:00','19:30'],['21:30','21:40'],['23:30','23:40']]},
    夜班:{開始:'23:00',結束:'07:50',休息:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']]}
  };
}
function 計算化新班別工時_報工v2(班別, 結束時間){
  const 規則表=取得化新班別規則_報工v2();
  const 班=正規化班別_報工v2(班別||'早班');
  const 結束=結束時間?new Date(結束時間):new Date();
  const 區間=建立化新班別區間_報工v2(班,結束,規則表[班]);
  const 開始=區間.開始;
  const 班別下班=區間.結束;
  const 休息扣除分鐘=計算休息扣除_報工v2(開始,結束,區間.休息);
  const 實際分鐘=Math.max(0,Math.round((結束-開始)/60000)-休息扣除分鐘);
  const 正常結束=結束<班別下班?結束:班別下班;
  const 正常休息=計算休息扣除_報工v2(開始,正常結束,區間.休息);
  let 正常分鐘=Math.max(0,Math.round((正常結束-開始)/60000)-正常休息);
  if(正常分鐘>480)正常分鐘=480;
  let 加班分鐘=Math.max(0,實際分鐘-正常分鐘);
  let 是否加班='否';
  let 加班類型='無';
  const 星期=開始.getDay();
  if(星期===0||星期===6){
    是否加班='是';
    加班分鐘=實際分鐘;
    正常分鐘=0;
    加班類型=星期===0?'例假日加班':'休息日加班';
  }else if(加班分鐘>0){
    是否加班='是';
    加班類型='班後加班';
  }
  return {
    成功:true,
    班別:班,
    作業日:格式日期_報工v2(開始),
    開始時間:格式日期時間_報工v2(開始),
    結束時間:格式日期時間_報工v2(結束),
    班別上班時間:格式日期時間_報工v2(開始),
    班別下班時間:格式日期時間_報工v2(班別下班),
    實際工時:小數2_報工v2(實際分鐘/60),
    正常工時:小數2_報工v2(正常分鐘/60),
    加班工時:小數2_報工v2(加班分鐘/60),
    休息扣除分鐘:休息扣除分鐘,
    是否加班:是否加班,
    加班類型:加班類型,
    報工時間規則:'化新班別工時計算_v2'
  };
}
function 套用化新班別工時_報工v2(資料){
  資料=資料||{};
  const calc=計算化新班別工時_報工v2(資料.班別||'早班',資料.結束時間||new Date());
  資料.作業日=calc.作業日;
  資料.開始時間=calc.開始時間;
  資料.結束時間=calc.結束時間;
  資料.實際工時=calc.實際工時;
  資料.正常工時=calc.正常工時;
  資料.加班工時=calc.加班工時;
  資料.休息扣除分鐘=calc.休息扣除分鐘;
  資料.是否加班=calc.是否加班;
  資料.加班類型=calc.加班類型;
  資料.班別上班時間=calc.班別上班時間;
  資料.班別下班時間=calc.班別下班時間;
  資料.報工時間規則=calc.報工時間規則;
  return 資料;
}
function 寫入報工作業v2_化新班別版(資料){
  return 寫入報工作業v2(套用化新班別工時_報工v2(資料||{}));
}
function 測試化新班別規則_報工v2(){
  const r=取得化新班別規則_報工v2();
  Logger.log(JSON.stringify(r,null,2));
  return {成功:true,規則:r,測試時間:new Date()};
}
function 測試化新班別工時計算_報工v2(){
  const result={
    早班正常:計算化新班別工時_報工v2('早班','2026-06-09T16:50:00'),
    早班加班:計算化新班別工時_報工v2('早班','2026-06-09T19:00:00'),
    中班正常:計算化新班別工時_報工v2('中班','2026-06-10T01:40:00'),
    夜班正常:計算化新班別工時_報工v2('夜班','2026-06-10T07:50:00')
  };
  Logger.log(JSON.stringify(result,null,2));
  return result;
}
function 正規化班別_報工v2(v){
  const t=String(v||'').trim();
  if(t.indexOf('夜')>=0||t.indexOf('大夜')>=0)return '夜班';
  if(t.indexOf('中')>=0)return '中班';
  return '早班';
}
function 建立化新班別區間_報工v2(班,參考,規則){
  const d=new Date(參考.getFullYear(),參考.getMonth(),參考.getDate());
  const list=[建立單日班別區間_報工v2(d,規則),建立單日班別區間_報工v2(加天_報工v2(d,-1),規則),建立單日班別區間_報工v2(加天_報工v2(d,1),規則)];
  for(let i=0;i<list.length;i++){
    if(參考>=list[i].開始&&參考<=加分鐘_報工v2(list[i].結束,360))return list[i];
  }
  return list[0];
}
function 建立單日班別區間_報工v2(d,規則){
  const 開始=合併日期時間_報工v2(d,規則.開始);
  let 結束=合併日期時間_報工v2(d,規則.結束);
  if(結束<=開始)結束=加天_報工v2(結束,1);
  const 休息=規則.休息.map(x=>{
    let a=合併日期時間_報工v2(d,x[0]);
    let b=合併日期時間_報工v2(d,x[1]);
    if(a<開始)a=加天_報工v2(a,1);
    if(b<=a)b=加天_報工v2(b,1);
    return [a,b];
  });
  return {開始:開始,結束:結束,休息:休息};
}
function 計算休息扣除_報工v2(a,b,休息){
  if(!a||!b||b<=a)return 0;
  let total=0;
  (休息||[]).forEach(x=>{
    const s=Math.max(a.getTime(),x[0].getTime());
    const e=Math.min(b.getTime(),x[1].getTime());
    if(e>s)total+=Math.round((e-s)/60000);
  });
  return total;
}
function 合併日期時間_報工v2(d,hm){
  const p=String(hm).split(':').map(Number);
  return new Date(d.getFullYear(),d.getMonth(),d.getDate(),p[0],p[1],0,0);
}
function 加天_報工v2(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function 加分鐘_報工v2(d,n){return new Date(d.getTime()+n*60000);}
function 小數2_報工v2(n){return Math.round(Number(n||0)*100)/100;}
function 格式日期_報工v2(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd');}
function 格式日期時間_報工v2(d){return Utilities.formatDate(new Date(d),Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss');}
