(function (全域) {
  'use strict';

  /**
   * 製一｜智慧5S Roar 事件通知中心 v1.2.0
   * - 使用 CustomEvent('智慧5S:Roar') 作為統一事件匯流排。
   * - 即時浮動通知、事件中心、未讀數、震動與可選提示音。
   * - 監聽網路、全螢幕與既有系統通知，不干擾原本流程。
   */

  const 版本 = '1.2.0';
  const 儲存鍵 = '智慧5S_Roar事件';
  const 最多保留 = 40;
  let 事件 = [];
  let 已允許聲音 = false;

  function 文字(v) { return String(v == null ? '' : v).trim(); }
  function 轉義(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function 現在() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  function 識別碼() { return `ROAR-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }

  function 讀取歷史() {
    try {
      const arr = JSON.parse(localStorage.getItem(儲存鍵) || '[]');
      事件 = Array.isArray(arr) ? arr.slice(0, 最多保留) : [];
    } catch (_) { 事件 = []; }
  }
  function 儲存歷史() {
    try { localStorage.setItem(儲存鍵, JSON.stringify(事件.slice(0, 最多保留))); } catch (_) {}
  }

  function 類型圖示(type) {
    if (type === '成功') return '✓';
    if (type === '警告') return '!';
    if (type === '錯誤') return '×';
    return 'i';
  }

  function 確保介面() {
    if (!document.getElementById('Roar浮動區')) {
      const 容器 = document.createElement('div');
      容器.id = 'Roar浮動區';
      容器.className = 'Roar浮動區';
      容器.setAttribute('aria-live', 'polite');
      document.body.appendChild(容器);
    }

    const 狀態列 = document.querySelector('.狀態列');
    if (狀態列 && !document.getElementById('Roar事件按鈕')) {
      const b = document.createElement('button');
      b.id = 'Roar事件按鈕';
      b.type = 'button';
      b.className = 'Roar事件按鈕';
      b.setAttribute('aria-label', '開啟Roar事件通知中心');
      b.innerHTML = '<span aria-hidden="true">🔔</span><span id="Roar未讀數" class="Roar未讀數 隱藏">0</span>';
      b.addEventListener('click', 開啟中心);
      const 頭像 = document.getElementById('使用者頭像');
      狀態列.insertBefore(b, 頭像 || null);
    }
  }

  function 更新未讀() {
    確保介面();
    const n = 事件.filter(x => !x.已讀).length;
    const badge = document.getElementById('Roar未讀數');
    if (!badge) return;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.toggle('隱藏', n === 0);
  }

  function 震動(type) {
    if (!navigator.vibrate) return;
    try {
      if (type === '錯誤') navigator.vibrate([90,50,120]);
      else if (type === '警告') navigator.vibrate([70,40,70]);
      else navigator.vibrate(45);
    } catch (_) {}
  }

  function 提示音(type) {
    if (!已允許聲音) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = type === '錯誤' ? 330 : type === '警告' ? 520 : 720;
      gain.gain.setValueAtTime(.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .16);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + .17);
      setTimeout(() => ctx.close && ctx.close(), 300);
    } catch (_) {}
  }

  function 顯示浮動(item) {
    確保介面();
    const box = document.getElementById('Roar浮動區');
    if (!box) return;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `Roar浮動通知 Roar-${item.類型}`;
    el.innerHTML = `<span class="Roar圖示">${類型圖示(item.類型)}</span><span class="Roar文案"><b>${轉義(item.標題)}</b><small>${轉義(item.內容)}</small></span><span class="Roar關閉">×</span>`;
    el.addEventListener('click', () => {
      item.已讀 = true; 儲存歷史(); 更新未讀();
      el.classList.add('離場'); setTimeout(() => el.remove(), 180);
    });
    box.prepend(el);
    setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.add('離場'); setTimeout(() => el.remove(), 180);
    }, item.持續毫秒 || 4200);
  }

  function 接收(detail) {
    detail = detail || {};
    const item = {
      編號: detail.編號 || 識別碼(),
      類型: detail.類型 || '資訊',
      標題: 文字(detail.標題) || '智慧5S事件',
      內容: 文字(detail.內容),
      時間: detail.時間 || 現在(),
      來源: detail.來源 || 'PWA',
      已讀: false,
      持續毫秒: Number(detail.持續毫秒) || 4200
    };
    事件.unshift(item);
    事件 = 事件.slice(0, 最多保留);
    儲存歷史(); 更新未讀();
    if (!detail.只記錄) 顯示浮動(item);
    if (detail.震動 !== false) 震動(item.類型);
    if (detail.聲音) 提示音(item.類型);
    return item;
  }

  function 發送(detail) {
    const d = typeof detail === 'string' ? { 內容: detail } : (detail || {});
    document.dispatchEvent(new CustomEvent('智慧5S:Roar', { detail: d }));
  }
  function 成功(內容, 標題) { 發送({ 類型:'成功', 標題:標題 || '完成', 內容 }); }
  function 警告(內容, 標題) { 發送({ 類型:'警告', 標題:標題 || '請注意', 內容 }); }
  function 錯誤(內容, 標題) { 發送({ 類型:'錯誤', 標題:標題 || '操作失敗', 內容, 聲音:true }); }
  function 資訊(內容, 標題) { 發送({ 類型:'資訊', 標題:標題 || '智慧5S', 內容 }); }

  function 中心HTML() {
    const list = 事件.length ? 事件.map(x => `<article class="Roar事件列 ${x.已讀 ? '已讀' : ''}">
      <span class="Roar圖示 Roar-${轉義(x.類型)}">${類型圖示(x.類型)}</span>
      <div><b>${轉義(x.標題)}</b><p>${轉義(x.內容 || '—')}</p><small>${轉義(x.時間)}｜${轉義(x.來源)}</small></div>
    </article>`).join('') : '<div class="Roar空狀態">目前沒有事件通知</div>';
    return `<div class="Roar抽屜標題"><div><b>Roar 事件通知</b><small>即時掌握巡檢、紅牌、連線與系統事件</small></div><button type="button" class="Roar關閉抽屜" aria-label="關閉">×</button></div>
      <div class="Roar抽屜操作"><button type="button" data-roar="read">全部已讀</button><button type="button" data-roar="clear">清除紀錄</button></div><div class="Roar事件清單">${list}</div>`;
  }

  function 開啟中心() {
    確保介面();
    let mask = document.getElementById('Roar抽屜遮罩');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'Roar抽屜遮罩';
      mask.className = 'Roar抽屜遮罩';
      mask.innerHTML = '<aside id="Roar抽屜" class="Roar抽屜" role="dialog" aria-modal="true" aria-label="Roar事件通知"></aside>';
      document.body.appendChild(mask);
      mask.addEventListener('click', e => { if (e.target === mask) 關閉中心(); });
    }
    document.getElementById('Roar抽屜').innerHTML = 中心HTML();
    mask.classList.add('顯示');
    const close = mask.querySelector('.Roar關閉抽屜'); if (close) close.onclick = 關閉中心;
    mask.querySelector('[data-roar="read"]')?.addEventListener('click', () => {
      事件.forEach(x => x.已讀 = true); 儲存歷史(); 更新未讀(); 開啟中心();
    });
    mask.querySelector('[data-roar="clear"]')?.addEventListener('click', () => {
      事件 = []; 儲存歷史(); 更新未讀(); 開啟中心();
    });
  }
  function 關閉中心() { document.getElementById('Roar抽屜遮罩')?.classList.remove('顯示'); }

  function 監聽核心通知() {
    const n = document.getElementById('通知');
    if (!n || n.dataset.roar監聽) return;
    n.dataset.roar監聽 = '1';
    let 上次 = '';
    const obs = new MutationObserver(() => {
      const msg = 文字(n.textContent);
      if (!msg || msg === 上次 || !n.classList.contains('顯示')) return;
      上次 = msg;
      const 類型 = n.classList.contains('警告') ? '警告' : n.classList.contains('錯誤') ? '錯誤' : '資訊';
      接收({ 類型, 標題:'系統訊息', 內容:msg, 來源:'核心', 只記錄:true, 震動:false });
    });
    obs.observe(n, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['class'] });
  }

  document.addEventListener('智慧5S:Roar', e => 接收(e.detail || {}));
  window.addEventListener('online', () => 發送({ 類型:'成功', 標題:'網路已恢復', 內容:'智慧5S已恢復連線，可繼續同步資料。', 來源:'網路' }));
  window.addEventListener('offline', () => 發送({ 類型:'警告', 標題:'目前離線', 內容:'資料會先保留在裝置，恢復網路後再同步。', 來源:'網路', 聲音:true }));
  document.addEventListener('fullscreenchange', () => 發送({ 類型:'資訊', 標題:'顯示模式', 內容:document.fullscreenElement ? '已進入全螢幕模式' : '已退出全螢幕模式', 來源:'全螢幕', 震動:false }));
  document.addEventListener('pointerdown', () => { 已允許聲音 = true; }, { once:true, passive:true });

  function 初始化() {
    讀取歷史(); 確保介面(); 更新未讀(); 監聽核心通知();
    const obs = new MutationObserver(() => { 確保介面(); 監聽核心通知(); });
    obs.observe(document.documentElement, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 初始化); else 初始化();

  全域.智慧5SRoar = Object.freeze({ 版本, 發送, 成功, 警告, 錯誤, 資訊, 開啟中心, 關閉中心 });
})(window);
