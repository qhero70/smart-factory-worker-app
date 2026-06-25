/*
 * 製一組報工表單 V4｜UX 穩定補強 v4.2.7
 * 只做前端互動補強，不刪原 HTML / CSS / JS，不改 V3 報工 payload 與扣工單流程。
 * 修正項目：
 * 1. 選產品後工站快選更明顯。
 * 2. 今日共做數不預設 0。
 * 3. 不良數與不良分配不預設 0。
 * 4. 不良原因顯示英文。
 * 5. 不良原因數量分配總和不可超過總不良數。
 */
(function(){
  'use strict';
  var VER = 'v4.2.7_工站快選_數量不預設_不良分配強制防呆';

  var 人員照片 = {
    fhfi546:'https://drive.google.com/thumbnail?id=1jW_-zSDXCHcJBe66dviCl063WQw8V1Fl&sz=w500',
    fhft606:'https://drive.google.com/thumbnail?id=1R2VU1fDHlVp9La2hg1dIfxIxYnt2Rbed&sz=w500',
    fhft560:'https://drive.google.com/thumbnail?id=1FRPcRXVXZf2McWcXoqFgbIuKu34eN3Sg&sz=w500',
    fhft562:'https://drive.google.com/thumbnail?id=1yzBgcJU9eIBFwivtik9KomZwXHkFU5qL&sz=w500',
    fhfi562:'https://drive.google.com/thumbnail?id=1x1YIk3OSYiHtrfbHzbGFFuhAboXghr-_&sz=w500',
    fhfi531:'https://drive.google.com/thumbnail?id=1qcATMZvaVAYdqN1BjVbytcYIHmq3YmBD&sz=w500',
    fhfi573:'https://drive.google.com/thumbnail?id=1L-ip7mulIe43qICfwbtP1gzJrJTrndYO&sz=w500',
    fhfg272:'https://drive.google.com/thumbnail?id=1L-ip7mulIe43qICfwbtP1gzJrJTrndYO&sz=w500',
    fhfi691:'https://drive.google.com/thumbnail?id=1B8r4Yr52YSZYonkaMPGbbn6hO6_noU7Y&sz=w500',
    fhft578:'https://drive.google.com/thumbnail?id=1S91mQs3gX1J3oIvy2AkQhyTo5MZUDnX3&sz=w500',
    fhft582:'https://drive.google.com/thumbnail?id=1xMhtXQ3Sr_wZtfQJ_hlFsSIHA8fDdhcg&sz=w500'
  };

  var 產品照片 = {
    A503203008:'https://drive.google.com/thumbnail?id=1I6O1zGcDkqxGo4lP65OI0o4GnlXBV9_B&sz=w900',
    A401800000:'https://drive.google.com/thumbnail?id=12JgM6j8_KipUKdz_nhXIV_rbfYJ21hCC&sz=w900',
    A402301020:'https://drive.google.com/thumbnail?id=1ZEqwxEZmZuu5ZNv-pCvO_8nf7mM0tMjw&sz=w900',
    A402300020:'https://drive.google.com/thumbnail?id=1l0BaMP7WyiEi9s1XjyzaZHJTXFd2KVJ5&sz=w900',
    Z907500010:'https://drive.google.com/thumbnail?id=17rcFPqGjO0WN1m4SrFddMoeXuMqLZiS9&sz=w900',
    Z005300000:'https://drive.google.com/thumbnail?id=1H1HaUy0gDyW6Cv7oyp4z0xuBgI452Yqq&sz=w900',
    Z004400000:'https://drive.google.com/thumbnail?id=1anfvWzMKyBiBnIYpJEm4XIzYJ3S1IHBm&sz=w900',
    Z907403008:'https://drive.google.com/thumbnail?id=1je6tB0_pnYDxxoXaawlt_1U-H4_tkJai&sz=w900'
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

  var 英文不良 = {
    Z01:'Material Crack', Z02:'Sand Porosity', Z03:'Surface Scratch', Z04:'Material Dent', Z05:'Casting Defect',
    Y01:'Inner Diameter Out of Tolerance', Y02:'Outer Diameter Out of Tolerance', Y03:'Length Out of Tolerance',
    Y04:'Surface Roughness', Y05:'Thread Defect', Y06:'Position Out of Tolerance', Y07:'Burr', Y08:'Chamfer Defect', Y09:'Hole Position'
  };

  function $(id){ return document.getElementById(id); }
  function txt(v){ return String(v == null ? '' : v).trim(); }
  function esc(s){ return txt(s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function numOrNull(v){ var s=txt(v); if(s==='') return null; var n=Number(s); return isFinite(n) ? n : null; }
  function setVal(id,v){ var el=$(id); if(el) el.value = v == null ? '' : v; }
  function getNG(){ var n=numOrNull(($('ngQty')||{}).value); return n == null ? 0 : Math.max(0,n); }
  function getTotal(){ var n=numOrNull(($('totalQty')||{}).value); return n == null ? null : Math.max(0,n); }

  function 補照片(data){
    data = data || {};
    (data.人員 || []).forEach(function(p){
      var id = txt(p.工號).toLowerCase();
      if(人員照片[id]){ p.照片網址 = p.照片網址 || 人員照片[id]; p.縮圖網址 = p.縮圖網址 || 人員照片[id]; }
    });
    var routes = data.報工工站群組 || data.途程工站群組 || [];
    routes.forEach(function(g){
      var pu = 產品照片[txt(g.產品編號)] || g.產品縮圖網址 || g.產品照片網址 || '';
      if(pu){ g.產品照片網址 = g.產品照片網址 || pu; g.產品縮圖網址 = g.產品縮圖網址 || pu; }
      (g.機台清單 || []).forEach(function(m){
        var mu = 機台照片[txt(m.機台編號 || m.主機台)] || m.縮圖網址 || m.照片網址 || '';
        if(mu){ m.照片網址 = m.照片網址 || mu; m.縮圖網址 = m.縮圖網址 || mu; }
      });
    });
    data.報工工站群組 = routes;
    data.途程工站群組 = routes;
    return data;
  }

  function 補英文不良資料(){
    if(!window.DB) return;
    DB.ngReasons = DB.ngReasons || {Z:[],Y:[]};
    ['Z','Y'].forEach(function(k){
      DB.ngReasons[k] = DB.ngReasons[k] || [];
      DB.ngReasons[k].forEach(function(r){ if(!r.英文名稱 && 英文不良[r.代碼]) r.英文名稱 = 英文不良[r.代碼]; });
    });
    if(!DB.ngReasons.Z.length){
      DB.ngReasons.Z = [
        {代碼:'Z01',名稱:'素材裂縫',英文名稱:英文不良.Z01},
        {代碼:'Z02',名稱:'加工砂孔',英文名稱:英文不良.Z02},
        {代碼:'Z03',名稱:'外觀刮傷',英文名稱:英文不良.Z03}
      ];
    }
    if(!DB.ngReasons.Y.length){
      DB.ngReasons.Y = [
        {代碼:'Y01',名稱:'內徑超差',英文名稱:英文不良.Y01},
        {代碼:'Y02',名稱:'外徑超差',英文名稱:英文不良.Y02},
        {代碼:'Y09',名稱:'孔位',英文名稱:英文不良.Y09}
      ];
    }
  }

  function 注入樣式(){
    if(document.getElementById('v4_427_style')) return;
    var s=document.createElement('style');
    s.id='v4_427_style';
    s.textContent = [
      '.person-card{min-height:188px!important;padding:8px!important;justify-content:flex-start!important}',
      '.person-card .avatar-ring{width:100%!important;height:96px!important;border-radius:18px!important;overflow:hidden!important}',
      '.person-card .avatar-ring img{width:100%!important;height:100%!important;border-radius:18px!important;object-fit:cover!important;object-position:center 28%!important}',
      '.person-card .person-id{font-size:13px!important;font-weight:900!important;color:#174ea6!important;background:rgba(66,133,244,.12)!important;border-radius:999px!important;padding:3px 10px!important;display:inline-block!important;letter-spacing:.3px!important}',
      '.v4-station-pop{margin:14px 0 10px;padding:14px;border:2px solid rgba(25,103,210,.36);border-radius:22px;background:linear-gradient(135deg,#fff7d6,#e8f0fe);box-shadow:0 10px 28px rgba(25,103,210,.14)}',
      '.v4-station-title{font-size:16px;font-weight:950;color:#174ea6;margin-bottom:9px;line-height:1.5}',
      '.v4-station-hint{font-size:12px;font-weight:800;color:#8a5b00;margin-bottom:10px}',
      '.v4-station-card{width:100%;text-align:left;border:2px solid rgba(66,133,244,.26);border-radius:18px;background:rgba(255,255,255,.94);padding:13px;margin:9px 0;font-weight:950;color:#202124;box-shadow:0 4px 14px rgba(0,0,0,.06)}',
      '.v4-station-card b{font-size:16px;color:#202124}.v4-station-card small{display:block;margin-top:4px;color:#5f6368;font-weight:800;line-height:1.45}',
      '.v4-station-card.selected{border-color:#34a853;background:#e6f4ea;box-shadow:0 8px 20px rgba(52,168,83,.18)}',
      '.v4-qty-empty{color:#80868b!important}',
      '#totalQty,#ngQty,.qty-input{font-weight:900!important;font-size:18px!important}',
      '.defect-row select option{font-weight:700}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function 清空數量預設(){
    var total=$('totalQty'), ng=$('ngQty');
    if(total && (total.value === '0' || total.getAttribute('placeholder') === '0')){ total.value=''; total.placeholder='請輸入今日共做數，不預設 0'; }
    if(ng && (ng.value === '0' || ng.getAttribute('placeholder') === '0')){ ng.value=''; ng.placeholder='不良數可留空，不預設 0'; }
    ['displayTotal','displayNG','displayGood'].forEach(function(id){ var el=$(id); if(el && el.textContent === '0'){ el.textContent='—'; el.classList.add('v4-qty-empty'); } });
  }

  function 強制分配不超過不良數(優先保留ID){
    if(!window.STATE || !Array.isArray(STATE.defectRows)) return;
    var limit = getNG();
    var rows = STATE.defectRows;
    if(limit <= 0){
      rows.forEach(function(r){ r.qty=''; });
    } else {
      var used = 0;
      rows.forEach(function(r){
        var q = Number(r.qty || 0);
        if(!isFinite(q) || q < 0) q = 0;
        var allow = Math.max(0, limit - used);
        if(q > allow) q = allow;
        r.qty = q === 0 ? '' : q;
        used += q;
      });
    }
    rows.forEach(function(r){ var input=document.querySelector('#defectRow_'+r.id+' .qty-input'); if(input) input.value = r.qty || ''; });
  }

  function 重算數量顯示(){
    var totalRaw = txt(($('totalQty')||{}).value);
    var ngRaw = txt(($('ngQty')||{}).value);
    var total = numOrNull(totalRaw);
    var ng = numOrNull(ngRaw);
    if(total != null && ng != null && ng > total){ ng = total; setVal('ngQty', total); }
    強制分配不超過不良數();
    var dTotal=$('displayTotal'), dNG=$('displayNG'), dGood=$('displayGood');
    if(dTotal){ dTotal.textContent = total == null ? '—' : total; dTotal.classList.toggle('v4-qty-empty', total == null); }
    if(dNG){ dNG.textContent = ng == null ? '—' : ng; dNG.classList.toggle('v4-qty-empty', ng == null); }
    if(dGood){
      if(total == null){ dGood.textContent = '—'; dGood.classList.add('v4-qty-empty'); }
      else { dGood.textContent = Math.max(total - (ng || 0), 0); dGood.classList.remove('v4-qty-empty'); }
    }
    if(total && total > 0 && typeof markStepDone === 'function') markStepDone();
    if(typeof updateDefectSummaryDisplay === 'function') updateDefectSummaryDisplay();
    if(typeof updateDefectSyncNotice === 'function') updateDefectSyncNotice();
    if(typeof updatePreview === 'function') updatePreview();
    if(typeof updateConfirmSummary === 'function') updateConfirmSummary();
  }

  function 建立工站快選(){
    var sel=$('workstationSelect');
    if(!sel || !window.STATE) return;
    var list = STATE.productGroupList || [];
    var old=$('v4StationQuickPicker');
    if(old) old.remove();
    if(!list.length) return;
    var box=document.createElement('div');
    box.id='v4StationQuickPicker';
    box.className='v4-station-pop';
    box.innerHTML = '<div class="v4-station-title">👇 請選擇此產品的報工工站 / Tap Workstation</div>' +
      '<div class="v4-station-hint">選完產品後必須選工站。點下面卡片即可帶入工序與機台。</div>' +
      list.map(function(g,i){
        var m=(g.機台清單||[]).map(function(x){return x.機台編號;}).filter(Boolean).join('、') || g.主機台 || '';
        return '<button type="button" class="v4-station-card ripple" data-station-index="'+i+'"><b>'+esc(g.報工工站名稱||g.工站名稱||'報工工站')+'</b><small>工序：'+esc(g.工序範圍||g.工序||'—')+'｜機台：'+esc(m||'—')+'</small></button>';
      }).join('');
    sel.parentNode.insertBefore(box, sel.nextSibling);
    box.querySelectorAll('.v4-station-card').forEach(function(btn){
      btn.addEventListener('click', function(){
        var i=this.getAttribute('data-station-index');
        sel.value=String(i);
        if(typeof onWorkstationChange === 'function') onWorkstationChange();
        box.querySelectorAll('.v4-station-card').forEach(function(b){b.classList.remove('selected');});
        this.classList.add('selected');
        try { this.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e) {}
        if(typeof roar === 'function') roar('✅','已選定工站 / Workstation Selected', this.innerText.replace(/\n/g,'｜'), 'success');
      });
    });
    try { box.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e) {}
  }

  function 重建不良列(){
    var container=$('defectContainer');
    if(!container || !window.STATE) return;
    補英文不良資料();
    if(!STATE.defectRows.length){
      container.innerHTML='<div class="caption" style="padding:6px;">尚無分配項目 / No allocation items yet</div>';
      if(typeof updateDefectSummaryDisplay === 'function') updateDefectSummaryDisplay();
      return;
    }
    function options(k){
      var list=(DB.ngReasons&&DB.ngReasons[k])||[];
      return list.map(function(x){
        var en=x.英文名稱||英文不良[x.代碼]||'';
        return '<option value="'+esc(x.代碼+'|'+k)+'">'+esc(x.代碼+'｜'+x.名稱+(en?' / '+en:''))+'</option>';
      }).join('');
    }
    container.innerHTML = STATE.defectRows.map(function(row){
      return '<div class="defect-row" id="defectRow_'+row.id+'">'+
        '<button class="defect-delete-btn ripple" onclick="deleteDefectRow('+row.id+')">✕</button>'+ 
        '<select style="flex:2;min-width:0;" onchange="onDefectReasonChange('+row.id+',this.value)">'+
          '<option value="">── 選擇不良原因 / Select Defect Reason ──</option>'+ 
          '<optgroup label="Z 素材 / 外觀 Material / Appearance">'+options('Z')+'</optgroup>'+ 
          '<optgroup label="Y 加工 / 尺寸 Machining / Dimension">'+options('Y')+'</optgroup>'+ 
        '</select>'+ 
        '<input class="qty-input" type="number" min="0" value="'+esc(row.qty||'')+'" inputmode="numeric" placeholder="數量" oninput="onDefectQtyChange('+row.id+',this.value)" onchange="onDefectQtyChange('+row.id+',this.value)">'+
      '</div>';
    }).join('');
    STATE.defectRows.forEach(function(row){
      if(!row.code) return;
      var sel=document.querySelector('#defectRow_'+row.id+' select');
      if(sel) sel.value=row.code+'|'+row.category;
    });
    if(typeof updateDefectSummaryDisplay === 'function') updateDefectSummaryDisplay();
  }

  function 啟用修正(){
    注入樣式();

    var oldOnDataLoaded = window.onDataLoaded;
    if(typeof oldOnDataLoaded === 'function'){
      window.onDataLoaded = function(data){
        data = 補照片(data || {});
        oldOnDataLoaded(data);
        補英文不良資料();
        setTimeout(function(){清空數量預設(); 重建不良列();},80);
      };
    }

    window.reloadData = function(){
      if(typeof showLoading === 'function') showLoading(true);
      callBackend('取得報工作業v2初始資料', null, function(data){
        if(typeof V4資料對接_標準化初始資料_ === 'function') data = V4資料對接_標準化初始資料_(data || {});
        window.onDataLoaded(補照片(data || {}));
      }, function(err){
        var reason = (err && err.message) ? err.message : String(err || 'Load failed');
        var fb = null;
        try { if(window.V4_EARLY_FETCH_GUARD && typeof window.V4_EARLY_FETCH_GUARD.保底資料 === 'function') fb = window.V4_EARLY_FETCH_GUARD.保底資料(reason); } catch(e) {}
        if(fb){
          if(typeof V4資料對接_標準化初始資料_ === 'function') fb = V4資料對接_標準化初始資料_(fb);
          window.onDataLoaded(補照片(fb));
          if(typeof showLoading === 'function') showLoading(false);
          if(typeof roar === 'function') roar('✅','保底主檔已載入 / Fallback Loaded','GAS 第一次讀取失敗，但 V4 可先操作人員、產品、工站。','success');
        }else{
          if(typeof showLoading === 'function') showLoading(false);
          if(typeof roar === 'function') roar('❌','讀取失敗 / Load Failed', reason, 'error');
        }
      });
    };

    var oldSelectProduct = window.selectProduct;
    if(typeof oldSelectProduct === 'function'){
      window.selectProduct = function(key){
        oldSelectProduct(key);
        setTimeout(建立工站快選,60);
        setTimeout(建立工站快選,250);
      };
    }

    window.addDefectRow = function(){
      if(!window.STATE) return;
      window.defectRowIdCounter = (window.defectRowIdCounter || 0) + 1;
      STATE.defectRows.push({ id: window.defectRowIdCounter, category:'', code:'', name:'', enName:'', qty:'' });
      重建不良列();
    };

    window.renderDefectRows = 重建不良列;

    window.onDefectReasonChange = function(id, value){
      var row = (STATE.defectRows || []).find(function(r){return r.id === id;});
      if(!row) return;
      var parts = String(value||'').split('|');
      row.code = parts[0] || '';
      row.category = parts[1] || '';
      var list = row.category === 'Z' ? (DB.ngReasons.Z || []) : (DB.ngReasons.Y || []);
      var found = list.find(function(x){return x.代碼 === row.code;});
      row.name = found ? (found.名稱 || '') : '';
      row.enName = found ? (found.英文名稱 || 英文不良[row.code] || '') : (英文不良[row.code] || '');
      強制分配不超過不良數(id);
      if(typeof updateDefectSummaryDisplay === 'function') updateDefectSummaryDisplay();
      if(typeof updatePreview === 'function') updatePreview();
      if(typeof updateConfirmSummary === 'function') updateConfirmSummary();
    };

    window.onDefectQtyChange = function(id, value){
      var row = (STATE.defectRows || []).find(function(r){return r.id === id;});
      if(!row) return;
      var input = document.querySelector('#defectRow_'+id+' .qty-input');
      var limit = getNG();
      var other = (STATE.defectRows || []).reduce(function(s,r){return s + (r.id === id ? 0 : Number(r.qty || 0));},0);
      var max = Math.max(0, limit - other);
      var q = Math.max(0, Number(value || 0) || 0);
      if(limit <= 0) q = 0;
      if(q > max) q = max;
      row.qty = q === 0 ? '' : q;
      if(input) input.value = row.qty || '';
      if(typeof updateDefectSummaryDisplay === 'function') updateDefectSummaryDisplay();
      if(typeof updatePreview === 'function') updatePreview();
      if(typeof updateConfirmSummary === 'function') updateConfirmSummary();
    };

    window.updateDefectSummaryDisplay = function(){
      var box=$('defectSummary'); if(!box || !window.STATE) return;
      var ngRaw = txt(($('ngQty')||{}).value);
      var totalNG = getNG();
      var allocated = (STATE.defectRows || []).reduce(function(s,r){return s + (Number(r.qty)||0);},0);
      if(!ngRaw && allocated <= 0){ box.classList.add('hidden'); return; }
      var diff = totalNG - allocated;
      var ok = allocated <= totalNG;
      box.innerHTML = '📊 不良分配：<b>'+allocated+'</b> / 總不良：<b>'+(ngRaw || '未填')+'</b>（<span style="color:'+(ok?'var(--g-green)':'var(--g-red)')+'">'+(ok ? '✓ 不會超過 / Guarded' : '已自動限制')+'</span>）'+(diff>0?'｜剩餘未分配：'+diff+' pcs':'');
      box.classList.remove('hidden');
    };

    window.calcQty = 重算數量顯示;

    var oldReset = window.resetAfterSubmit;
    if(typeof oldReset === 'function'){
      window.resetAfterSubmit = function(){ oldReset(); setTimeout(function(){ setVal('totalQty',''); setVal('ngQty',''); 清空數量預設(); },30); };
    }

    window.addEventListener('load', function(){
      setTimeout(function(){清空數量預設(); 重建不良列();},500);
      setTimeout(function(){清空數量預設(); 重建不良列();},1200);
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 啟用修正);
  else 啟用修正();

  console.log('V4 UX stable patch loaded', VER);
})();
