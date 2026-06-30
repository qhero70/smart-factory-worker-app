/* 製一組報工 V4｜中央資料庫同步橋接 461
 * 目的：不改 V4 UI、不改原報工流程。
 * 做法：包住 GAS橋接器.寫入報工，原本報工成功/送出後，同步寫入中央資料庫 19_現場報工回寫，並觸發報工扣工單。
 */
(function(){
  'use strict';
  const 中央URL_KEY = '智慧製造_GAS資料庫_API_URL';
  const 狀態_KEY = '報工V4_中央資料庫同步狀態';

  function 文字(v){ return String(v == null ? '' : v).trim(); }
  function 數字(v){ const n = Number(String(v == null ? '' : v).replace(/[,，]/g,'')); return isFinite(n) ? n : 0; }
  function 取(obj, keys){
    obj = obj || {};
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
    }
    return '';
  }
  function 中央URL(){
    let u = 文字(localStorage.getItem(中央URL_KEY));
    if (!u) return '';
    if (!u.endsWith('/exec')) u = u.replace(/\/+$/,'') + '/exec';
    return u;
  }
  function 記錄狀態(text, obj){
    try { localStorage.setItem(狀態_KEY, JSON.stringify({ 時間:new Date().toISOString(), 訊息:text, 資料:obj || null })); } catch(e) {}
    console.log('[報工V4中央同步]', text, obj || '');
  }
  function 轉中央報工(payload){
    payload = payload || {};
    const 良品 = 數字(取(payload, ['良品數','良品','良品數量','完成數','產出數量','本次良品','okQty','goodQty','good_qty']));
    const 不良 = 數字(取(payload, ['不良數','不良','不良數量','NG數','ngQty','badQty','bad_qty']));
    return {
      action:'寫入現場報工V1',
      來源:'work-report-v4-460',
      派班ID:文字(取(payload, ['派班ID','派班編號','dispatchId','dispatch_id'])),
      工單號:文字(取(payload, ['工單號','工單','製令','製令單號','工單編號','mo','MO','workOrder','work_order'])),
      工號:文字(取(payload, ['工號','員工工號','人員工號','作業員工號','operatorId','employeeId'])),
      姓名:文字(取(payload, ['姓名','員工姓名','人員姓名','作業員','operatorName','employeeName'])),
      工站:文字(取(payload, ['工站','工序','站別','工作中心','station','process'])),
      機台:文字(取(payload, ['機台','機台編號','設備','設備編號','machine','machineId'])),
      產品編號:文字(取(payload, ['產品編號','產品料號','料號','品號','productId','productCode'])),
      品名:文字(取(payload, ['品名','產品名稱','productName'])),
      工單類型:文字(取(payload, ['工單類型','類型','workOrderType'])) || 'PROD',
      良品數:良品,
      不良數:不良,
      工時_分鐘:數字(取(payload, ['工時_分鐘','工時分鐘','加工分鐘','作業分鐘','minutes','workMinutes'])),
      報工狀態:'有效',
      備註:文字(取(payload, ['備註','remark','note']))
    };
  }
  async function 呼叫中央(body){
    const u = 中央URL();
    if (!u) { 記錄狀態('略過：尚未設定中央資料庫 GAS URL'); return {略過:true}; }
    const res = await fetch(u, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(body),
      redirect:'follow'
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch(e) { return { ok:false, success:false, raw:text.slice(0,800) }; }
  }
  async function 同步中央(payload){
    const data = 轉中央報工(payload);
    if (!data.工單號) {
      記錄狀態('略過：本筆報工沒有工單號，無法扣工單', data);
      return;
    }
    try {
      const w = await 呼叫中央(data);
      記錄狀態('已送中央 19_現場報工回寫', w);
      try {
        const d = await 呼叫中央({ action:'執行報工扣工單V1', 來源:'work-report-v4-460-auto' });
        記錄狀態('已觸發中央報工扣工單', d);
      } catch(e2) {
        記錄狀態('扣工單觸發失敗：' + (e2.message || e2));
      }
    } catch(e) {
      記錄狀態('同步中央失敗：' + (e.message || e), data);
    }
  }
  function 安裝(){
    if (!window.GAS橋接器 || typeof window.GAS橋接器.寫入報工 !== 'function') return false;
    if (window.GAS橋接器.__中央資料庫同步461) return true;
    const 原寫入報工 = window.GAS橋接器.寫入報工;
    window.GAS橋接器.寫入報工 = async function(payload){
      const result = await 原寫入報工.apply(this, arguments);
      // 不阻塞現場報工，中央同步背景執行
      setTimeout(() => 同步中央(payload), 80);
      return result;
    };
    window.GAS橋接器.__中央資料庫同步461 = true;
    記錄狀態('已安裝：報工V4 → 中央資料庫同步橋接 461');
    return true;
  }
  let 次數 = 0;
  const timer = setInterval(() => {
    次數++;
    if (安裝() || 次數 > 80) clearInterval(timer);
  }, 250);
  window.addEventListener('load', () => setTimeout(安裝, 500));
})();
