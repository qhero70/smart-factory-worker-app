/* 化新報工 V4｜v4.9.1 班別 / 作業日 / 加班工時正式規則
 * 資料源：⭐智慧工廠主資料庫｜19_人員排班規則
 * 原則：兩班制預設早班/中班；夜班只在夏日電價或調班啟用時使用；休息不算工時。
 */
(function(){
  'use strict';
  if(window.__HUAXIN_SHIFT_RULES_491__) return;
  window.__HUAXIN_SHIFT_RULES_491__ = true;

  const 正常工時分鐘 = 480;
  const 作業日切換 = '06:10';
  const 班別規則 = {
    '早班': { 代碼:'DAY', 名稱:'早班', 開始:'08:00', 結束:'16:50', 跨日:false, 休息:[['10:00','10:10'],['12:10','12:40'],['14:40','14:50']] },
    '中班': { 代碼:'SWING', 名稱:'中班', 開始:'16:50', 結束:'01:40', 跨日:true, 休息:[['18:50','19:00'],['21:00','21:30'],['23:30','23:40']] },
    '夜班': { 代碼:'NIGHT', 名稱:'夜班', 開始:'23:00', 結束:'07:50', 跨日:true, 休息:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']] }
  };

  function E(id){ return document.getElementById(id); }
  function V(id){ const el=E(id); return el ? String(el.value||'') : ''; }
  function setV(id,v){ const el=E(id); if(el) el.value = v; }
  function pad(n){ return String(n).padStart(2,'0'); }
  function 分鐘(t){ const p=String(t||'00:00').split(':').map(Number); return (p[0]||0)*60+(p[1]||0); }
  function fmtDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function fmtSlash(d){ return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`; }
  function dtLocal(d){ return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
  function cloneDate(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
  function 加日(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function 時段文字(h){ if(h>=0&&h<6)return'凌晨'; if(h>=6&&h<12)return'早上'; if(h>=12&&h<18)return'中午'; return'晚上'; }
  function 目前作業日基準(){
    const now = new Date();
    const base = cloneDate(now);
    if(now.getHours()*60+now.getMinutes() < 分鐘(作業日切換)) base.setDate(base.getDate()-1);
    return base;
  }
  function 班別名稱(raw){
    const s=String(raw||'').trim().toUpperCase();
    if(!s) return '早班';
    if(s.includes('NIGHT') || s.includes('大夜') || s.includes('夜班') || s === '夜') return '夜班';
    if(s.includes('SWING') || s.includes('中班') || s === '中') return '中班';
    return '早班';
  }
  function 目前班別(){
    const op = window.STATE && STATE.operator ? STATE.operator : {};
    return 班別名稱(op.班別名稱 || op.班別 || V('shiftSelect') || '早班');
  }
  function span(base, time, rule){
    const d = cloneDate(base);
    if(rule && rule.跨日 && 分鐘(time) < 分鐘(rule.開始)) d.setDate(d.getDate()+1);
    const [h,m] = String(time).split(':').map(Number);
    d.setHours(h||0, m||0, 0, 0);
    return d;
  }
  function 班別時間範圍(rule, base){
    const s = span(base, rule.開始, rule);
    let e = span(base, rule.結束, rule);
    if(e <= s) e.setDate(e.getDate()+1);
    return [s,e];
  }
  function overlapMin(a1,a2,b1,b2){
    const s=Math.max(a1.getTime(),b1.getTime());
    const e=Math.min(a2.getTime(),b2.getTime());
    return Math.max(0, Math.round((e-s)/60000));
  }
  function 計算工時(start,end,rule){
    if(!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) return null;
    if(end <= start) end = new Date(end.getTime()+24*60*60000);
    const base = cloneDate(start);
    const [班始,班終] = 班別時間範圍(rule, base);
    let 休息扣除 = 0;
    (rule.休息||[]).forEach(r=>{
      let rs = span(base, r[0], rule);
      let re = span(base, r[1], rule);
      if(re <= rs) re.setDate(re.getDate()+1);
      休息扣除 += overlapMin(start,end,rs,re);
    });
    const 總分鐘 = Math.max(0, Math.round((end-start)/60000));
    const 淨分鐘 = Math.max(0, 總分鐘 - 休息扣除);
    const 超出班前 = start < 班始;
    const 超出班後 = end > 班終;
    const 是否加班 = 超出班前 || 超出班後 || 淨分鐘 > 正常工時分鐘;
    const 正常分鐘 = Math.min(淨分鐘, 正常工時分鐘);
    const 加班分鐘 = 是否加班 ? Math.max(0, 淨分鐘 - 正常工時分鐘) : 0;
    return {總分鐘,休息扣除,淨分鐘,正常分鐘,加班分鐘,是否加班,班始,班終,rule};
  }
  function 套用加班欄位(calc){
    if(!calc) return;
    setV('workingHours', (calc.淨分鐘/60).toFixed(2) + ' hrs');
    if(E('overtimeSelect')) setV('overtimeSelect', calc.是否加班 ? '是' : '否');
    if(E('overtimeType')) setV('overtimeType', calc.是否加班 ? (V('overtimeType') && V('overtimeType')!=='無' ? V('overtimeType') : '平日加班') : '無');
    if(window.STATE){
      STATE.化新工時計算 = {
        班別代碼: calc.rule.代碼,
        班別名稱: calc.rule.名稱,
        班別開始時間: calc.rule.開始,
        班別結束時間: calc.rule.結束,
        正常工時分鐘: calc.正常分鐘,
        加班工時分鐘: calc.加班分鐘,
        休息扣除分鐘: calc.休息扣除,
        實際工時分鐘: calc.淨分鐘,
        是否加班: calc.是否加班 ? '是' : '否',
        加班類型: calc.是否加班 ? '平日加班' : '無'
      };
    }
  }
  function 作業日FromDate(d){
    const x=new Date(d);
    const cutoff=分鐘(作業日切換);
    if(x.getHours()*60+x.getMinutes() < cutoff) x.setDate(x.getDate()-1);
    return fmtDate(x);
  }
  function 更新頂欄上線時間(){
    let el=E('work-date-display');
    const status=E('statusPill');
    if(!el && status){
      el=document.createElement('div');
      el.id='work-date-display';
      el.style.cssText='margin-top:6px;font-size:11px;font-weight:800;color:rgba(255,255,255,.92);letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      status.insertAdjacentElement('afterend', el);
    }
    if(!el) return;
    const now=new Date();
    const 班 = (window.STATE && STATE.operator) ? 目前班別() : '未選班別';
    const 顯示作業日 = fmtSlash(目前作業日基準());
    el.textContent = `${班}｜${時段文字(now.getHours())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}｜作業日 ${顯示作業日}`;
  }

  function patch(){
    if(typeof window.buildShiftSelect === 'function' && !window.__HUAXIN_BUILD_SHIFT_PATCHED__){
      window.__HUAXIN_BUILD_SHIFT_PATCHED__=true;
      window.buildShiftSelect=function(){
        const s=E('shiftSelect'); if(!s) return;
        const selected = 目前班別();
        const list = selected==='夜班' ? ['早班','中班','夜班'] : ['早班','中班'];
        s.innerHTML='';
        list.forEach(x=>s.add(new Option(x,x)));
        s.value = selected==='夜班' ? '夜班' : selected;
      };
    }
    window.getShiftRule=function(){
      const name=目前班別();
      const r=班別規則[name]||班別規則['早班'];
      return {name:r.名稱,start:r.開始,end:r.結束,overnight:r.跨日,hrs:8,休息:r.休息,代碼:r.代碼};
    };
    window.toDateTimeVal=function(time,nextDay){
      const base=目前作業日基準();
      const d=cloneDate(base);
      if(nextDay) d.setDate(d.getDate()+1);
      const [h,m]=String(time||'00:00').split(':').map(Number);
      d.setHours(h||0,m||0,0,0);
      return dtLocal(d);
    };
    window.setDefaultTimes=function(update=true){
      const r=班別規則[目前班別()]||班別規則['早班'];
      setV('shiftSelect', r.名稱);
      setV('startTime', window.toDateTimeVal(r.開始, false));
      setV('endTime', window.toDateTimeVal(r.結束, r.跨日));
      const calc = 計算工時(new Date(V('startTime')), new Date(V('endTime')), r);
      套用加班欄位(calc);
      if(update){ try{updatePreview();updateConfirmSummary();}catch(e){} }
    };
    window.calcWorkingHours=function(){
      const r=班別規則[班別名稱(V('shiftSelect'))]||班別規則['早班'];
      const calc=計算工時(new Date(V('startTime')), new Date(V('endTime')), r);
      套用加班欄位(calc);
      try{ updatePreview(); updateConfirmSummary(); }catch(e){}
    };
    if(typeof window.selectPerson==='function' && !window.__HUAXIN_SELECT_PERSON_SHIFT_PATCHED__){
      window.__HUAXIN_SELECT_PERSON_SHIFT_PATCHED__=true;
      const old=window.selectPerson;
      window.selectPerson=function(){
        const res=old.apply(this,arguments);
        setTimeout(()=>{ try{ buildShiftSelect(); window.setDefaultTimes(true); 更新頂欄上線時間(); }catch(e){} }, 60);
        return res;
      };
    }
    if(typeof window.buildReportData==='function' && !window.__HUAXIN_BUILD_REPORT_SHIFT_PATCHED__){
      window.__HUAXIN_BUILD_REPORT_SHIFT_PATCHED__=true;
      const oldBuild=window.buildReportData;
      window.buildReportData=function(){
        const d=oldBuild.apply(this,arguments);
        const r=班別規則[班別名稱(V('shiftSelect'))]||班別規則['早班'];
        const calc=計算工時(new Date(V('startTime')), new Date(V('endTime')), r);
        if(calc){
          const opDate = 作業日FromDate(new Date(V('startTime')||Date.now()));
          d.作業日=opDate; d.workDate=opDate;
          d.班別=r.名稱;
          d.是否加班=calc.是否加班?'是':'否';
          d.加班類型=calc.是否加班?(d.加班類型&&d.加班類型!=='無'?d.加班類型:'平日加班'):'無';
          d.班別代碼=r.代碼; d.班別開始時間=r.開始; d.班別結束時間=r.結束;
          d.正常工時分鐘=calc.正常分鐘; d.加班工時分鐘=calc.加班分鐘; d.休息扣除分鐘=calc.休息扣除; d.實際工時分鐘=calc.淨分鐘;
          d.output=d.output||{};
          Object.assign(d.output,{workDate:opDate,shift:r.名稱,normalMinutes:calc.正常分鐘,overtimeMinutes:calc.加班分鐘,breakDeductMinutes:calc.休息扣除,netWorkingMinutes:calc.淨分鐘,isOvertime:calc.是否加班});
          d.operator=d.operator||{}; d.operator.shift=r.名稱;
        }
        return d;
      };
    }
  }
  function boot(){ patch(); 更新頂欄上線時間(); setInterval(更新頂欄上線時間,1000); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  setTimeout(patch,300); setTimeout(patch,1000); setInterval(patch,1500);
})();
