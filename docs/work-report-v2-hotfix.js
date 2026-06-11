(function(){
  'use strict';

  const 熱修正版 = 'v1.0.4_完整UI照片不良框修正';
  let 掃碼串流 = null;
  let 掃碼停止 = false;
  let 原始收集Payload = null;
  let 現場照片清單 = [];
  let 已攔截送出 = false;

  function $(id){ return document.getElementById(id); }
  function 文字(v){ return String(v ?? '').trim(); }
  function 數字(v){ const n = Number(v || 0); return isNaN(n) ? 0 : n; }
  function $$(q){ return Array.from(document.querySelectorAll(q)); }

  function 更新版本顯示(){
    const el = $('版本標籤');
    if(el && !el.textContent.includes(熱修正版)) el.textContent = `${el.textContent}｜${熱修正版}`;
  }

  function 顯示提示(msg){
    const el = $('頂部狀態');
    if(el) el.textContent = msg;
    const log = $('系統訊息');
    if(log) log.textContent = msg + '\n' + log.textContent;
  }

  function 目前分頁(){
    return document.querySelector('.分頁 button.active')?.dataset.tab || window.報工PWA?.狀態?.當前分頁 || '人員';
  }

  function 建立完整樣式(){
    if($('完整UI補強樣式')) return;
    const style = document.createElement('style');
    style.id = '完整UI補強樣式';
    style.textContent = `
      .完整補強卡{background:var(--surface);border:1.5px solid var(--border);border-radius:22px;padding:16px;margin:14px 0;box-shadow:var(--shadow)}
      .完整補強標題{font-size:18px;font-weight:900;margin-bottom:12px;display:flex;align-items:center;gap:8px}.完整補強標題 small{font-size:12px;color:var(--sub)}
      .完整數量列{display:grid;grid-template-columns:1fr 1fr;gap:12px}.完整數量列 input{font-size:24px;font-weight:900;text-align:center}.不良輸入{color:var(--danger)!important;border-color:var(--warning)!important;background:var(--warning-bg)!important}.良品輸入{color:var(--success)!important;background:rgba(22,163,74,.10)!important}
      .分配摘要補強{margin-top:10px;padding:12px;border-radius:16px;background:var(--primary-light);border:1px solid rgba(59,130,246,.35);font-weight:900;color:var(--primary);text-align:center;line-height:1.6}
      .照片工具列{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}.照片工具鈕{border:1.5px solid var(--border);border-radius:16px;background:var(--surface-alt);color:var(--text);font-weight:900;padding:12px 8px}.照片工具鈕.危險{border-color:var(--danger);color:var(--danger);background:var(--danger-bg)}
      .照片格{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:360px;overflow:auto}.照片項目{position:relative;border:1.5px solid var(--border);border-radius:16px;overflow:hidden;aspect-ratio:1/1;background:var(--surface-alt)}.照片項目 img{width:100%;height:100%;object-fit:cover}.照片項目 button{position:absolute;top:5px;right:5px;border:0;border-radius:10px;background:rgba(0,0,0,.65);color:#fff;width:28px;height:28px;font-weight:900}.照片項目 span{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.62);color:#fff;font-size:10px;padding:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .掃碼遮罩{position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,.96);display:none;align-items:center;justify-content:center;padding:18px;color:#fff}.掃碼遮罩.顯示{display:flex}.掃碼面板{width:min(520px,100%);background:#0f172a;border:1px solid #334155;border-radius:24px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.5)}.掃碼標題{font-size:22px;font-weight:900;margin-bottom:10px}.掃碼說明{color:#cbd5e1;font-size:14px;line-height:1.6;margin-bottom:12px}#掃碼影片{width:100%;aspect-ratio:1/1;border-radius:18px;background:#020617;object-fit:cover;border:2px dashed #60a5fa}.掃碼按鈕列{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.掃碼按鈕{border:0;border-radius:16px;padding:14px;font-weight:900;font-size:16px}.掃碼主鈕{background:#3b82f6;color:white}.掃碼次鈕{background:#1e293b;color:white;border:1px solid #475569}
      .底部{grid-template-columns:1fr 1fr!important}.底部 #下一步{display:none!important}.底部 #送出報工{display:block!important}.底部 #上一步{font-size:18px}
      @media(max-width:560px){.完整數量列{grid-template-columns:1fr}.照片工具列{grid-template-columns:1fr}.照片格{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function 建立掃碼視窗(){
    if($('掃碼遮罩')) return;
    建立完整樣式();
    const div = document.createElement('div');
    div.id = '掃碼遮罩';
    div.className = '掃碼遮罩';
    div.innerHTML = `<div class="掃碼面板">
      <div class="掃碼標題">📷 掃碼輸入</div>
      <div class="掃碼說明" id="掃碼說明">請將條碼 / QR Code 對準畫面中央。若手機瀏覽器不支援即時辨識，可按「手動輸入」。</div>
      <video id="掃碼影片" muted playsinline></video>
      <div class="掃碼按鈕列"><button class="掃碼按鈕 掃碼次鈕" id="掃碼手動">手動輸入</button><button class="掃碼按鈕 掃碼主鈕" id="掃碼關閉">關閉</button></div>
    </div>`;
    document.body.appendChild(div);
    $('掃碼關閉').addEventListener('click', 關閉掃碼);
  }

  function 關閉掃碼(){
    掃碼停止 = true;
    if(掃碼串流){ 掃碼串流.getTracks().forEach(t => t.stop()); 掃碼串流 = null; }
    const mask = $('掃碼遮罩');
    if(mask) mask.classList.remove('顯示');
  }

  function 寫入掃碼結果(target, value){
    const text = 文字(value);
    if(!text) return;
    const inputId = target === '人員' ? '搜尋人員' : '搜尋工件';
    const input = $(inputId);
    if(input){
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles:true }));
    }
    setTimeout(() => {
      const list = target === '人員' ? Array.from(document.querySelectorAll('.人員卡片')) : Array.from(document.querySelectorAll('.產品卡片'));
      const hit = list.find(card => 文字(card.dataset.id || card.dataset.key) === text) || list.find(card => card.textContent.includes(text));
      if(hit) hit.click();
      顯示提示(`✅ 掃碼完成：${text}`);
    }, 150);
  }

  async function 載入ZXing(){
    if(window.ZXingBrowser) return true;
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@zxing/browser@latest';
      script.onload = () => resolve(!!window.ZXingBrowser);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
      setTimeout(() => resolve(!!window.ZXingBrowser), 3500);
    });
  }

  async function 開啟掃碼(target){
    建立掃碼視窗();
    const mask = $('掃碼遮罩');
    const video = $('掃碼影片');
    const manual = $('掃碼手動');
    const desc = $('掃碼說明');
    掃碼停止 = false;
    mask.classList.add('顯示');
    desc.textContent = target === '人員' ? '請掃描工號條碼 / QR Code。' : '請掃描產品編號、品名條碼或客戶品號。';
    manual.onclick = () => {
      const v = prompt(target === '人員' ? '請輸入工號或姓名' : '請輸入產品編號、品名或客戶品號', '');
      if(v) 寫入掃碼結果(target, v);
      關閉掃碼();
    };
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ manual.click(); return; }
    try{
      掃碼串流 = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:'environment' } }, audio:false });
      video.srcObject = 掃碼串流;
      await video.play();
      if('BarcodeDetector' in window){
        const detector = new BarcodeDetector({ formats:['qr_code','code_128','code_39','ean_13','ean_8','itf','upc_a','upc_e'] });
        const loop = async () => {
          if(掃碼停止) return;
          try{
            const codes = await detector.detect(video);
            if(codes && codes.length){ 寫入掃碼結果(target, codes[0].rawValue || codes[0].displayValue || ''); 關閉掃碼(); return; }
          }catch(e){}
          requestAnimationFrame(loop);
        };
        loop();
        return;
      }
      const ok = await 載入ZXing();
      if(ok && window.ZXingBrowser?.BrowserMultiFormatReader){
        const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
        reader.decodeFromVideoElement(video, (result) => {
          if(result && !掃碼停止){ 寫入掃碼結果(target, result.getText()); reader.reset && reader.reset(); 關閉掃碼(); }
        });
        return;
      }
      desc.textContent = '此瀏覽器暫不支援即時掃碼辨識，請按「手動輸入」。';
    }catch(e){ desc.textContent = '相機開啟失敗，請確認瀏覽器相機權限，或按「手動輸入」。'; }
  }

  function 綁定掃碼按鈕(){
    const buttons = Array.from(document.querySelectorAll('.掃碼鈕'));
    buttons.forEach((btn, index) => {
      if(btn.dataset.hotfixScan === '1') return;
      btn.dataset.hotfixScan = '1';
      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        開啟掃碼(index === 0 ? '人員' : '工件');
      }, true);
    });
  }

  function 修正班別選取後帶入(){
    const list = $('人員列表');
    if(!list || list.dataset.hotfixShift === '1') return;
    list.dataset.hotfixShift = '1';
    list.addEventListener('click', () => {
      setTimeout(() => {
        const state = window.報工PWA?.狀態;
        const person = state?.選取人員;
        const select = $('班別');
        if(person && select){
          const shift = 文字(person.班別 || person.班次 || person.工作班別 || person.班別名稱);
          if(shift){
            if(!Array.from(select.options).some(o => o.value === shift)){
              const opt = document.createElement('option'); opt.value = shift; opt.textContent = shift; select.appendChild(opt);
            }
            select.value = shift;
            select.dispatchEvent(new Event('change', { bubbles:true }));
          }
        }
      }, 80);
    }, true);
  }

  function 建立完整產出UI(){
    if($('完整產出補強')) return;
    const page = document.querySelector('[data-page="產出"] .卡片');
    if(!page) return;
    const total = $('今日共做數');
    const box = document.createElement('div');
    box.id = '完整產出補強';
    box.className = '完整補強卡';
    box.innerHTML = `<div class="完整補強標題">📊 產出與不良數量 <small>Output / NG Qty</small></div>
      <div class="完整數量列">
        <div><label class="必填">不良數量 / NG Qty</label><input id="快速不良數量" class="不良輸入" type="number" inputmode="numeric" min="0" value="0" placeholder="輸入不良數量"></div>
        <div><label>實際良品數 / Good Qty</label><input id="快速良品數量" class="良品輸入" readonly value="0"></div>
      </div>
      <div id="分配摘要補強" class="分配摘要補強">良品 = 今日共做數 - 不良數量。品質頁仍可細分 Y/Z 不良原因。</div>`;
    if(total && total.parentElement) total.parentElement.insertAdjacentElement('afterend', box);
    ['快速不良數量','今日共做數'].forEach(id => $(id)?.addEventListener('input', 更新完整預覽));
  }

  function 建立完整照片UI(){
    if($('完整照片區')) return;
    const page = document.querySelector('[data-page="品質"] .卡片');
    if(!page) return;
    const note = $('照片備註');
    const box = document.createElement('div');
    box.id = '完整照片區';
    box.className = '完整補強卡';
    box.innerHTML = `<div class="完整補強標題">📸 現場照片 <small>Take Photo / Upload</small></div>
      <div class="照片工具列">
        <button type="button" class="照片工具鈕" id="拍照鈕">📸 拍照</button>
        <button type="button" class="照片工具鈕" id="選圖鈕">🖼 選圖</button>
        <button type="button" class="照片工具鈕 危險" id="清除照片鈕">🗑 清除</button>
      </div>
      <input id="照片拍照" type="file" accept="image/*" capture="environment" multiple style="display:none">
      <input id="照片選檔" type="file" accept="image/*" multiple style="display:none">
      <div id="照片格" class="照片格"></div>
      <div id="照片計數" class="小字" style="margin-top:8px;text-align:center">0 / 12 張照片</div>`;
    if(note) note.closest('label') ? note.insertAdjacentElement('afterend', box) : page.appendChild(box);
    else page.appendChild(box);
    $('拍照鈕').addEventListener('click', () => $('照片拍照').click());
    $('選圖鈕').addEventListener('click', () => $('照片選檔').click());
    $('清除照片鈕').addEventListener('click', () => { 現場照片清單 = []; 渲染照片(); 更新完整預覽(); });
    $('照片拍照').addEventListener('change', e => 讀取照片(e.target.files, '拍照'));
    $('照片選檔').addEventListener('change', e => 讀取照片(e.target.files, '選檔'));
  }

  function 讀取照片(files, source){
    const list = Array.from(files || []).slice(0, Math.max(0, 12 - 現場照片清單.length));
    list.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        現場照片清單.push({ base64:e.target.result, mime:file.type || 'image/jpeg', 檔名:file.name || `${source}_${Date.now()}.jpg`, 備註:$('照片備註')?.value || '', 來源:source, 時間戳:new Date().toISOString() });
        渲染照片(); 更新完整預覽();
      };
      reader.readAsDataURL(file);
    });
    if($('照片拍照')) $('照片拍照').value = '';
    if($('照片選檔')) $('照片選檔').value = '';
  }

  function 渲染照片(){
    const grid = $('照片格');
    if(!grid) return;
    grid.innerHTML = 現場照片清單.map((p,i) => `<div class="照片項目"><img src="${p.base64}" alt="照片${i+1}"><button type="button" data-del-photo="${i}">×</button><span>${文字(p.備註 || p.檔名 || '現場照片')}</span></div>`).join('');
    grid.querySelectorAll('[data-del-photo]').forEach(btn => btn.addEventListener('click', () => { 現場照片清單.splice(Number(btn.dataset.delPhoto),1); 渲染照片(); 更新完整預覽(); }));
    const count = $('照片計數');
    if(count) count.textContent = `${現場照片清單.length} / 12 張照片`;
  }

  function 讀取不良分配數(){
    return $$('#不良分配區 .不良分配行').reduce((sum,row) => sum + 數字(row.querySelector('input')?.value), 0);
  }

  function 取得完整Payload(){
    const base = (原始收集Payload || window.報工PWA?.收集Payload || (() => ({})))();
    const output = 數字($('今日共做數')?.value || base.今日共做數 || base.產出數量);
    const quickNG = 數字($('快速不良數量')?.value);
    const allocated = 讀取不良分配數();
    const ng = Math.max(quickNG, allocated, 數字(base.不良數));
    const good = Math.max(output - ng, 0);
    let defects = Array.isArray(base.不良分配) ? base.不良分配.slice() : [];
    const defectSum = defects.reduce((s,x)=>s+數字(x.數量),0);
    if(ng > defectSum){
      defects.push({ 分類:'快速不良', 不良代號:'', 不良名稱:'未選不良原因', 英文名稱:'Unclassified NG', 數量:ng - defectSum });
    }
    return Object.assign({}, base, {
      今日共做數: output,
      產出數量: output,
      不良數: ng,
      不良總數: ng,
      實際良品數: good,
      良品數量: good,
      不良率: output ? ng / output : 0,
      不良分配: defects,
      現場照片清單: 現場照片清單,
      照片數量: 現場照片清單.length,
      照片備註: $('照片備註')?.value || base.照片備註 || base.備註 || '',
      備註: $('照片備註')?.value || base.備註 || ''
    });
  }

  function 更新完整預覽(){
    const p = 取得完整Payload();
    if($('快速良品數量')) $('快速良品數量').value = p.實際良品數 || 0;
    if($('預覽產出')) $('預覽產出').textContent = p.今日共做數 || 0;
    if($('預覽不良')) $('預覽不良').textContent = p.不良數 || 0;
    if($('預覽良品')) $('預覽良品').textContent = p.實際良品數 || 0;
    const summary = $('分配摘要補強');
    if(summary) summary.textContent = `今日共做 ${p.今日共做數 || 0}｜不良 ${p.不良數 || 0}｜實際良品 ${p.實際良品數 || 0}｜照片 ${現場照片清單.length} 張`;
    if($('報工預覽JSON')) $('報工預覽JSON').textContent = JSON.stringify(p,null,2);
  }

  function 攔截送出按鈕(){
    if(已攔截送出) return;
    const btn = $('送出報工');
    if(!btn) return;
    已攔截送出 = true;
    document.addEventListener('click', async e => {
      const target = e.target.closest('#送出報工');
      if(!target) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if(目前分頁() !== '品質'){
        $('下一步')?.click();
        return;
      }
      const payload = 取得完整Payload();
      const errors = [];
      if(!payload.工號) errors.push('請選擇作業員');
      if(!payload.產品編號 && !payload.品名) errors.push('請選擇工件 / 產品');
      if(!payload.報工工站名稱 && !payload.工站名稱) errors.push('請選擇報工工站');
      if(!payload.今日共做數 || payload.今日共做數 <= 0) errors.push('今日共做數必須大於 0');
      if(payload.不良數 > payload.今日共做數) errors.push('不良數不可大於今日共做數');
      if(errors.length){ 顯示提示('❌ ' + errors.join('；')); return; }
      try{
        target.disabled = true; target.textContent = '送出中...';
        顯示提示('📤 報工送出中...');
        const result = await window.GAS橋接器.寫入報工(payload);
        顯示提示('✅ 報工成功：已寫入 09_報工 / 09_不良紀錄');
        const log = $('系統訊息'); if(log) log.textContent = '✅ 報工成功\n' + JSON.stringify(result,null,2);
      }catch(err){
        顯示提示('❌ 報工失敗：' + err.message);
      }finally{
        target.disabled = false; target.textContent = '確認送出';
      }
    }, true);
  }

  function 更新底部主按鈕(){
    const btn = $('送出報工');
    if(!btn) return;
    btn.textContent = 目前分頁() === '品質' ? '確認送出' : '下一步 →';
  }

  function 啟動(){
    if(!原始收集Payload && window.報工PWA?.收集Payload) 原始收集Payload = window.報工PWA.收集Payload;
    建立完整樣式();
    更新版本顯示();
    綁定掃碼按鈕();
    修正班別選取後帶入();
    建立完整產出UI();
    建立完整照片UI();
    攔截送出按鈕();
    更新底部主按鈕();
    更新完整預覽();
  }

  window.addEventListener('load', () => setTimeout(啟動, 500));
  document.addEventListener('visibilitychange', () => { if(!document.hidden) setTimeout(啟動, 300); });
  setInterval(啟動, 1200);
})();
