/*
 * work-report-v2-dispatch-addon-248.js
 * 製造部智慧製造應用總部｜報工 PWA 今日派班外掛修正版
 * 重點：修正 GAS 舊式 success:false 包裝回應被誤判成 0 筆的問題。
 */
(function () {
  'use strict';

  var 版本 = '21.2.0';
  var state = { list: [], selected: null, filter: { 工號: '', 班別: '', 工站: '' } };

  function $(id) { return document.getElementById(id); }
  function txt(v) { return String(v == null ? '' : v).trim(); }
  function num(v) { var n = Number(v || 0); return isNaN(n) ? 0 : n; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function esc(s) {
    return txt(s).replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; });
  }
  function gasUrl() { return txt((window.PWA_CONFIG || {}).GAS_WEB_APP_URL); }

  function api(payload) {
    var url = gasUrl();
    if (!url) return Promise.reject(new Error('GAS_WEB_APP_URL 未設定'));
    return fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload || {})
    }).then(function (r) { return r.text(); }).then(function (raw) {
      var res;
      try { res = JSON.parse(raw); }
      catch (err) { throw new Error('GAS 回傳不是 JSON：' + raw.slice(0, 120)); }

      if (res && res.success === false) {
        throw new Error((res.message || 'GAS 回覆失敗') + (res.error ? '｜' + res.error : ''));
      }
      if (res && res.ok === false) {
        throw new Error(res.message || 'GAS 回覆失敗');
      }
      return res || {};
    });
  }

  function normalizeDispatch(res) {
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    if (res.data && Array.isArray(res.data.今日派班)) return res.data.今日派班;
    if (Array.isArray(res.今日派班)) return res.今日派班;
    if (Array.isArray(res.items)) return res.items;
    return [];
  }

  function injectCss() {
    if ($('今日派班外掛樣式248')) return;
    var s = document.createElement('style');
    s.id = '今日派班外掛樣式248';
    s.textContent = [
      '#今日派班外掛{margin:12px 0 14px;padding:14px;border-radius:20px;border:1px solid rgba(0,210,255,.45);background:linear-gradient(135deg,rgba(0,210,255,.13),rgba(15,20,35,.88));box-shadow:0 14px 34px rgba(0,0,0,.32),0 0 22px rgba(0,210,255,.12);color:#fff}',
      '#今日派班外掛 *{box-sizing:border-box}',
      '.派班外掛標題{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}',
      '.派班外掛標題 b{font-size:16px;font-weight:1000;color:#7ae9ff}',
      '.派班外掛標題 small{font-size:11px;color:#8b9cb0;font-weight:900}',
      '.派班工具列{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;margin:10px 0}',
      '.派班工具列 input,.派班工具列 select{height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.28);color:#fff;padding:0 10px;font-weight:900}',
      '.派班工具列 button,.派班送出列 button,.派班卡 button{border:1px solid rgba(0,210,255,.5);background:rgba(0,210,255,.14);color:#7ae9ff;border-radius:12px;font-weight:1000;padding:10px 12px}',
      '.派班狀態列{font-size:12px;color:#cbd5e1;font-weight:900;margin:8px 0;white-space:pre-wrap;line-height:1.5}',
      '.派班清單{display:grid;grid-template-columns:1fr;gap:10px;max-height:360px;overflow:auto;padding-right:2px}',
      '.派班卡{border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.28);border-radius:16px;padding:12px;display:grid;gap:8px}',
      '.派班卡.選中{border-color:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.18),0 0 24px rgba(34,197,94,.14)}',
      '.派班卡主{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}',
      '.派班卡主 b{font-size:15px;color:#fff;font-weight:1000}',
      '.派班卡主 span{font-size:11px;color:#facc15;font-weight:1000;white-space:nowrap}',
      '.派班卡次{font-size:12px;color:#cbd5e1;font-weight:800;line-height:1.5}',
      '.派班標籤列{display:flex;gap:6px;flex-wrap:wrap}',
      '.派班標籤{font-size:11px;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:3px 8px;background:rgba(255,255,255,.06);color:#e2e8f0;font-weight:900}',
      '.派班報工面板{margin-top:12px;padding:12px;border-radius:16px;border:1px solid rgba(34,197,94,.4);background:rgba(34,197,94,.08)}',
      '.派班報工面板.隱藏{display:none}',
      '.派班報工格{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}',
      '.派班報工格 label{display:block;font-size:12px;color:#8b9cb0;font-weight:1000;margin-bottom:5px}',
      '.派班報工格 input{width:100%;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.3);color:#fff;padding:0 12px;font-size:18px;font-weight:1000;text-align:center}',
      '.派班送出列{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.派班送出列 button.primary{background:linear-gradient(135deg,#06b6d4,#22c55e);color:#031014;border:0}',
      '@media(max-width:520px){.派班工具列{grid-template-columns:1fr 1fr}.派班工具列 button{grid-column:1/-1}.派班報工格{grid-template-columns:1fr}.派班送出列{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function setStatus(message, error) {
    var el = $('派班狀態');
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? '#ff8a8a' : '#cbd5e1';
  }

  function buildPanel() {
    if ($('今日派班外掛')) return;
    injectCss();
    var box = document.createElement('section');
    box.id = '今日派班外掛';
    box.innerHTML = [
      '<div class="派班外掛標題"><div><b>今日派班</b><br><small>派班報工外掛 v' + 版本 + '｜不影響報工流程</small></div><button type="button" id="派班重新整理">刷新</button></div>',
      '<div class="派班工具列">',
      '<input id="派班篩選工號" placeholder="工號 / 留空全部">',
      '<select id="派班篩選班別"><option value="">全部班別</option><option>早班</option><option>大夜班</option><option>加班</option></select>',
      '<input id="派班篩選工站" placeholder="工站 / 留空全部">',
      '<button type="button" id="派班查詢">查詢</button>',
      '</div>',
      '<div id="派班狀態" class="派班狀態列">尚未載入今日派班。</div>',
      '<div id="派班清單" class="派班清單"></div>',
      '<div id="派班報工面板" class="派班報工面板 隱藏">',
      '<div class="派班外掛標題"><b>派班報工</b><small id="派班選中摘要"></small></div>',
      '<div class="派班報工格"><div><label>良品數</label><input id="派班良品數" type="number" min="0" inputmode="numeric"></div><div><label>不良數</label><input id="派班不良數" type="number" min="0" inputmode="numeric" value="0"></div></div>',
      '<div class="派班報工格"><div><label>工號</label><input id="派班報工工號"></div><div><label>姓名</label><input id="派班報工姓名"></div></div>',
      '<div class="派班報工格"><div style="grid-column:1/-1"><label>備註</label><input id="派班報工備註"></div></div>',
      '<div class="派班送出列"><button type="button" id="派班取消選取">取消選取</button><button type="button" class="primary" id="派班報工送出">送出派班報工</button></div>',
      '</div>'
    ].join('');
    var anchor = document.querySelector('.外框') || document.body;
    var header = anchor.querySelector('.頁首');
    if (header && header.nextSibling) anchor.insertBefore(box, header.nextSibling);
    else anchor.insertBefore(box, anchor.firstChild);

    $('派班重新整理').addEventListener('click', loadDispatch);
    $('派班查詢').addEventListener('click', function () {
      state.filter.工號 = txt($('派班篩選工號').value);
      state.filter.班別 = txt($('派班篩選班別').value);
      state.filter.工站 = txt($('派班篩選工站').value);
      loadDispatch();
    });
    $('派班取消選取').addEventListener('click', clearSelected);
    $('派班報工送出').addEventListener('click', submitReport);
  }

  function loadDispatch() {
    setStatus('讀取今日派班中...');
    api({
      action: '取得今日派班作業',
      作業日: today(),
      工號: state.filter.工號,
      班別: state.filter.班別,
      報工工站名稱: state.filter.工站,
      只取未報工: true
    }).then(function (res) {
      state.list = normalizeDispatch(res);
      renderList();
      setStatus('今日可報工派班：' + state.list.length + ' 筆');
    }).catch(function (err) {
      state.list = [];
      renderList();
      setStatus('今日派班讀取失敗：' + err.message + '\n請確認 GAS 主程式 doPost 已接入「今日派班報工_嘗試處理動作_」並重新部署 Web App。', true);
    });
  }

  function renderList() {
    var el = $('派班清單');
    if (!el) return;
    el.innerHTML = '';
    if (!state.list.length) {
      el.innerHTML = '<div class="派班卡"><div class="派班卡次">今天沒有可報工派班資料。</div></div>';
      return;
    }
    state.list.forEach(function (r, i) {
      var card = document.createElement('div');
      card.className = '派班卡';
      card.dataset.index = i;
      card.innerHTML = [
        '<div class="派班卡主"><b>' + esc(r.品名 || r.產品編號 || '未命名產品') + '</b><span>' + esc(r.班別 || '') + '</span></div>',
        '<div class="派班卡次">' + esc(r.報工工站名稱 || r.工站名稱 || '') + '｜' + esc(r.工序 || '') + '</div>',
        '<div class="派班卡次">工單：' + esc(r.工單編號 || '') + '<br>派班：' + esc(r.今日派班編號 || '') + '</div>',
        '<div class="派班標籤列"><span class="派班標籤">' + esc(r.工號 || '-') + ' ' + esc(r.姓名 || '') + '</span><span class="派班標籤">機台 ' + esc(r.主機台 || r.機台編號清單 || '-') + '</span><span class="派班標籤">派工 ' + esc(r.派工量 || 0) + '</span></div>',
        '<button type="button">選這筆報工</button>'
      ].join('');
      card.querySelector('button').addEventListener('click', function () { selectDispatch(i); });
      el.appendChild(card);
    });
  }

  function selectDispatch(i) {
    state.selected = state.list[i] || null;
    Array.prototype.forEach.call(document.querySelectorAll('.派班卡'), function (x) { x.classList.remove('選中'); });
    var card = document.querySelector('.派班卡[data-index="' + i + '"]');
    if (card) card.classList.add('選中');
    if (!state.selected) return;
    $('派班報工面板').classList.remove('隱藏');
    $('派班選中摘要').textContent = txt(state.selected.今日派班編號) + '｜' + txt(state.selected.工單編號);
    $('派班良品數').value = num(state.selected.派工量 || state.selected.計畫量 || 0) || '';
    $('派班不良數').value = 0;
    $('派班報工工號').value = txt(state.selected.工號);
    $('派班報工姓名').value = txt(state.selected.姓名);
    fillCoreFields(state.selected);
  }

  function clearSelected() {
    state.selected = null;
    if ($('派班報工面板')) $('派班報工面板').classList.add('隱藏');
    Array.prototype.forEach.call(document.querySelectorAll('.派班卡'), function (x) { x.classList.remove('選中'); });
  }

  function submitReport() {
    var r = state.selected;
    if (!r) { setStatus('請先選擇一筆今日派班。', true); return; }
    var good = num($('派班良品數').value);
    var bad = num($('派班不良數').value);
    if (good + bad <= 0) { setStatus('良品數 + 不良數 必須大於 0。', true); return; }
    $('派班報工送出').disabled = true;
    setStatus('送出派班報工中...');
    api({
      action: '寫入今日派班報工',
      今日派班編號: r.今日派班編號,
      工號: txt($('派班報工工號').value) || r.工號 || '',
      姓名: txt($('派班報工姓名').value) || r.姓名 || '',
      良品數: good,
      不良數: bad,
      備註: txt($('派班報工備註').value)
    }).then(function (res) {
      setStatus('派班報工完成：' + (res.報工編號 || 'OK'));
      clearSelected();
      return loadDispatch();
    }).catch(function (err) {
      setStatus('派班報工失敗：' + err.message, true);
    }).finally(function () {
      $('派班報工送出').disabled = false;
    });
  }

  function fillCoreFields(r) {
    [
      ['工號', r.工號], ['姓名', r.姓名], ['人員', r.姓名],
      ['產品編號', r.產品編號], ['客戶品號', r.客戶品號], ['品名', r.品名],
      ['機台', r.主機台 || r.機台編號清單], ['主機台', r.主機台],
      ['工站', r.報工工站名稱 || r.工站名稱], ['工序', r.工序], ['工單', r.工單編號]
    ].forEach(function (p) { tryFill(p[0], p[1]); });
  }

  function tryFill(keyword, value) {
    value = txt(value);
    if (!value) return;
    var controls = Array.prototype.slice.call(document.querySelectorAll('input,select,textarea'));
    var target = controls.find(function (el) {
      var id = txt(el.id), name = txt(el.name), ph = txt(el.getAttribute('placeholder')), aria = txt(el.getAttribute('aria-label'));
      var labelText = '';
      if (el.id && window.CSS && CSS.escape) {
        var label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (label) labelText = txt(label.textContent);
      }
      return (id + ' ' + name + ' ' + ph + ' ' + aria + ' ' + labelText).indexOf(keyword) >= 0;
    });
    if (!target) return;
    if (target.tagName === 'SELECT') {
      var opts = Array.prototype.slice.call(target.options || []);
      var opt = opts.find(function (o) { return txt(o.value) === value || txt(o.textContent) === value || txt(o.textContent).indexOf(value) >= 0; });
      if (opt) target.value = opt.value;
    } else {
      target.value = value;
    }
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function boot() {
    buildPanel();
    setTimeout(loadDispatch, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
