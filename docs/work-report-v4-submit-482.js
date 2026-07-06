/* 報工作業 V4 submit v4.8.8：寫入 09_報工 / 09_不良紀錄
 * 鎖定正式主資料庫；機台清單固定吃 08_工站途程機台主檔；避免前端誤判未確認。
 */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function S(v){return String(v==null?'':v).trim()}
function n(v){const x=Number(S(v).replace(/,/g,''));return isFinite(x)?x:0}
function toast(title,msg,type){if(window.v4Toast)window.v4Toast(title,msg,type);else alert(title+'\n'+(msg||''))}
function getState(){return window.V4_STATE||{}}
function machineListText(route){
  route=route||{};
  if(Array.isArray(route.機台清單)&&route.機台清單.length){return route.機台清單.map(m=>S(m.機台編號||m.主機台||m)).filter(Boolean).join(',')}
  if(Array.isArray(route.機台編號清單)&&route.機台編號清單.length){return route.機台編號清單.map(S).filter(Boolean).join(',')}
  return S(route.機台編號||route.機台清單||route.主機台||'')
}
function makeReportId(st){const op=(st.operator&&st.operator.工號)||E('personId')?.value||'NA';const prod=(st.product&&st.product.產品編號)||E('productCode')?.value||'NA';const d=new Date();const ts=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0'),String(d.getHours()).padStart(2,'0'),String(d.getMinutes()).padStart(2,'0'),String(d.getSeconds()).padStart(2,'0')].join('');return `RPT-${ts}-${op}-${prod}`}
function readDefects(){const st=getState();const rows=[];document.querySelectorAll('.defect-row').forEach(row=>{const sel=row.querySelector('select');const qty=row.querySelector('.qty-input');const q=n(qty&&qty.value);if(!sel||!sel.value||q<=0)return;const d=(st.defectMap&&st.defectMap[sel.value])||{};rows.push({不良代碼:d.代碼||sel.value,不良名稱:d.名稱||sel.selectedOptions[0]?.textContent||'',英文名稱:d.英文名稱||'',不良數量:q,責任歸屬:d.責任歸屬||'',分類:d.分類||String(d.代碼||sel.value).slice(0,1)})});return rows}
function validate(){const total=n(E('totalQty')?.value),ng=n(E('ngQty')?.value);const defects=readDefects();const sum=defects.reduce((a,b)=>a+n(b.不良數量),0);if(!E('personId')?.value)return '請先選擇作業員';if(!E('productCode')?.value)return '請先選擇產品';if(!E('workstationSelect')?.value)return '請先選擇報工工站';if(total<=0)return '請輸入今日共做數';if(ng<0)return '不良數不可小於 0';if(ng>total)return '不良數不可大於共做數';if(sum>ng)return '不良分配數量不可超過 Step 3 的不良數';if(ng>0&&sum!==ng)return '不良分配總數需等於 Step 3 的不良數';return ''}
function buildPayload(){
  const st=getState();
  const total=n(E('totalQty')?.value),ng=n(E('ngQty')?.value),good=Math.max(0,total-ng);const defects=readDefects();
  const reportId=makeReportId(st);
  const op=st.operator||{},prod=st.product||{},route=st.route||{},machine=st.machine||{};
  return {reportId,報工編號:reportId,workDate:window.V4Bridge?.today?.()||'',作業日:window.V4Bridge?.today?.()||'',operator:{employeeId:S(op.工號||E('personId')?.value),operatorName:S(op.姓名||E('personName')?.value),shift:S(op.班別||E('shift')?.value||'早班')},product:{productCode:S(prod.產品編號||E('productCode')?.value),customerPartNo:S(prod.客戶品號||E('customerPartNo')?.value),productName:S(prod.品名||E('productName')?.value)},workstation:{workstationName:S(route.工站名稱||route.報工工站名稱||E('workstationSelect')?.selectedOptions?.[0]?.textContent||''),processRange:S(route.工序範圍||route.工序||E('processRange')?.value),machineList:machineListText(route),mainMachine:S(machine.機台編號||machine.主機台||E('mainMachineSelect')?.value)},output:{totalQty:total,ngQty:ng,goodQty:good,startTime:S(E('startTime')?.value),endTime:S(E('endTime')?.value),workingHours:S(E('workingHours')?.value||'8 hrs')},quality:{defects,defectSummary:defects.map(d=>`${d.分類||''}類 ${d.不良代碼} ${d.不良名稱} × ${d.不良數量} pcs`).join('；')},photos:window.V4_PHOTOS||[],remarks:S(E('remarks')?.value),source:'PWA_V4.8.8_LOCKED_UIUX'};
}
function responseIsSuccess(res){
  if(!res)return false;
  if(res.ok===true||res.成功===true||res.success===true)return true;
  if(S(res.reportId||res.報工編號))return true;
  const msg=S(res.訊息||res.message||res.status||'');
  return /成功|完成|已寫入|正式寫入|append|submitted|written|already_exists/i.test(msg);
}
function responseMessage(res,p){return S((res&&(res.訊息||res.message))||'')||`報工編號：${(res&&(res.reportId||res.報工編號))||p.reportId}`}
async function submit(){
  const err=validate();if(err){toast('不能送出 / Not ready',err,'error');return}
  const p=buildPayload();
  const ok=confirm(`確認送出報工？ / Confirm submit?\n\n實際良品：${p.output.goodQty} pcs\n不良數：${p.output.ngQty} pcs`);
  if(!ok)return;
  document.body.classList.add('submitting');
  try{
    const res=await window.V4Bridge.submitReport(p);
    if(responseIsSuccess(res)){
      const rid=(res&&(res.reportId||res.報工編號))||p.reportId;
      toast('報工已送出 / Submitted',`報工編號：${rid}\n已送往正式主資料庫 09_報工、09_不良紀錄`,'success');
      if(typeof window.resetFlow==='function')window.resetFlow();
    }else{
      toast('寫入未確認 / Submit not confirmed',responseMessage(res,p)||'GAS 未確認寫入，請檢查 Web App URL 與部署權限。','error');
    }
  }catch(e){toast('寫入失敗 / Submit failed',S(e.message||e),'error')}
  finally{document.body.classList.remove('submitting')}
}
window.submitWorkReportV4=submit;
document.addEventListener('click',function(e){const btn=e.target.closest('[data-submit-v4],#submitReportBtn');if(btn){e.preventDefault();submit()}});
})();
