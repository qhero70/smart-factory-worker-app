/*
 * work-report-v2-dispatch-guard-ui-249.js
 * 製造部智慧製造應用總部｜今日派班防呆提示優化
 *
 * 目的：
 * 1. 22_派班報工防重複超量保護已成功阻擋連點、重送、超量時，前端不再只顯示「派班報工失敗」。
 * 2. 將可預期的防呆阻擋改成「防呆已阻擋」，避免現場誤判系統故障。
 * 3. 不改原報工 core，不改 248 派班外掛邏輯，只做訊息層修正。
 */
(function () {
  'use strict';

  var VERSION = '249';
  var BLOCK_KEYWORDS = [
    'RECENT_DUPLICATE_REPORT',
    'DUPLICATE_DISPATCH_REPORT',
    'OVER_REMAINING_QTY',
    '疑似連點或重送',
    '不允許重複扣量',
    '良品數不可超過工序剩餘量'
  ];

  function $(id) { return document.getElementById(id); }

  function isGuardBlock(text) {
    text = String(text || '');
    return BLOCK_KEYWORDS.some(function (k) { return text.indexOf(k) >= 0; });
  }

  function normalizeMessage(text) {
    text = String(text || '').trim();
    text = text.replace(/^派班報工失敗：/, '');
    if (text.indexOf('RECENT_DUPLICATE_REPORT') >= 0 || text.indexOf('疑似連點或重送') >= 0) {
      return '防呆已阻擋：疑似連點或重送，系統未重複扣量。請刷新後確認報工紀錄。';
    }
    if (text.indexOf('DUPLICATE_DISPATCH_REPORT') >= 0 || text.indexOf('不允許重複扣量') >= 0) {
      return '防呆已阻擋：此派班已完成或已報工，系統未重複扣量。';
    }
    if (text.indexOf('OVER_REMAINING_QTY') >= 0 || text.indexOf('良品數不可超過工序剩餘量') >= 0) {
      return '防呆已阻擋：良品數超過工序剩餘量，系統未扣量。';
    }
    return '防呆已阻擋：' + text;
  }

  function patchStatus() {
    var el = $('派班狀態');
    if (!el) return;
    var raw = el.textContent || '';
    if (!isGuardBlock(raw)) return;
    var msg = normalizeMessage(raw);
    if (el.textContent !== msg) el.textContent = msg;
    el.style.color = '#facc15';
    el.style.background = 'rgba(250,204,21,.10)';
    el.style.border = '1px solid rgba(250,204,21,.35)';
    el.style.borderRadius = '10px';
    el.style.padding = '8px 10px';
  }

  function boot() {
    var timer = setInterval(function () {
      var el = $('派班狀態');
      if (!el) return;
      clearInterval(timer);
      patchStatus();
      var mo = new MutationObserver(patchStatus);
      mo.observe(el, { childList: true, characterData: true, subtree: true });
      window.__派班防呆提示優化版本 = VERSION;
    }, 250);
    setTimeout(function () { clearInterval(timer); }, 10000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
