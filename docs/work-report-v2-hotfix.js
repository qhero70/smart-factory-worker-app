(function(){
  'use strict';

  const 熱修正版 = 'v1.0.3_照片班別掃碼修正';
  let 掃碼串流 = null;
  let 掃碼停止 = false;

  function $(id){ return document.getElementById(id); }
  function 文字(v){ return String(v ?? '').trim(); }

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

  function 建立掃碼視窗(){
    if($('掃碼遮罩')) return;
    const style = document.createElement('style');
    style.textContent = `
      .掃碼遮罩{position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,.96);display:none;align-items:center;justify-content:center;padding:18px;color:#fff}
      .掃碼遮罩.顯示{display:flex}.掃碼面板{width:min(520px,100%);background:#0f172a;border:1px solid #334155;border-radius:24px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
      .掃碼標題{font-size:22px;font-weight:900;margin-bottom:10px}.掃碼說明{color:#cbd5e1;font-size:14px;line-height:1.6;margin-bottom:12px}
      #掃碼影片{width:100%;aspect-ratio:1/1;border-radius:18px;background:#020617;object-fit:cover;border:2px dashed #60a5fa}.掃碼按鈕列{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
      .掃碼按鈕{border:0;border-radius:16px;padding:14px;font-weight:900;font-size:16px}.掃碼主鈕{background:#3b82f6;color:white}.掃碼次鈕{background:#1e293b;color:white;border:1px solid #475569}
    `;
    document.head.appendChild(style);
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

    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      manual.click();
      return;
    }

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
            if(codes && codes.length){
              寫入掃碼結果(target, codes[0].rawValue || codes[0].displayValue || '');
              關閉掃碼();
              return;
            }
          }catch(e){}
          requestAnimationFrame(loop);
        };
        loop();
        return;
      }

      const ok = await 載入ZXing();
      if(ok && window.ZXingBrowser?.BrowserMultiFormatReader){
        const reader = new window.ZXingBrowser.BrowserMultiFormatReader();
        reader.decodeFromVideoElement(video, (result, err) => {
          if(result && !掃碼停止){
            寫入掃碼結果(target, result.getText());
            reader.reset && reader.reset();
            關閉掃碼();
          }
        });
        return;
      }

      desc.textContent = '此瀏覽器暫不支援即時掃碼辨識，請按「手動輸入」。';
    }catch(e){
      desc.textContent = '相機開啟失敗，請確認瀏覽器相機權限，或按「手動輸入」。';
    }
  }

  function 綁定掃碼按鈕(){
    const buttons = Array.from(document.querySelectorAll('.掃碼鈕'));
    buttons.forEach((btn, index) => {
      if(btn.dataset.hotfixScan === '1') return;
      btn.dataset.hotfixScan = '1';
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
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

  function 啟動(){
    更新版本顯示();
    綁定掃碼按鈕();
    修正班別選取後帶入();
  }

  window.addEventListener('load', () => setTimeout(啟動, 500));
  document.addEventListener('visibilitychange', () => { if(!document.hidden) setTimeout(啟動, 300); });
  setInterval(啟動, 2000);
})();
