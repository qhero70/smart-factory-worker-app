/**
 * 29_主管戰情看板入口整合正式模組
 * 專案：製造部智慧製造應用總部
 * 版本：v29.1.0
 *
 * 目的：
 * 1. 提供 LINE Bot「主管戰情」指令回覆內容。
 * 2. 提供首頁 / 報工 PWA / Rich Menu 統一入口網址。
 * 3. 不改報工核心、不改資料庫欄位。
 */

var 主管戰情入口_URL_ = 'https://qhero70.github.io/smart-factory-worker-app/manager-war-room-v28.html?v=29';
var 總部首頁_URL_ = 'https://qhero70.github.io/smart-factory-worker-app/?v=30';
var 報工PWA_URL_ = 'https://qhero70.github.io/smart-factory-worker-app/work-report-v2.html?v=250';

function 主管戰情入口_嘗試處理動作_(payload) {
  payload = payload || {};
  var action = String(payload.action || payload['動作'] || '').trim();
  if (action === '主管戰情入口健康檢查') return { ok: true, 模組: '29_主管戰情看板入口整合', 版本: 'v29.1.0', 時間: 主管戰情入口_現在_() };
  if (action === '取得主管戰情入口') return 取得主管戰情入口(payload);
  if (action === '取得主管戰情LINE訊息') return 取得主管戰情LINE訊息(payload);
  return null;
}

function 取得主管戰情入口(payload) {
  payload = payload || {};
  return {
    ok: true,
    message: '取得主管戰情入口完成',
    版本: 'v29.1.0',
    入口: {
      總部首頁: 總部首頁_URL_,
      主管戰情看板: 主管戰情入口_URL_,
      報工PWA: 報工PWA_URL_
    },
    指令: ['主管戰情','戰情看板','主管看板','每日戰情'],
    時間: 主管戰情入口_現在_()
  };
}

function 取得主管戰情LINE訊息(payload) {
  payload = payload || {};
  var date = String(payload['作業日'] || '').trim() || 主管戰情入口_日期文字_(new Date());
  var url = 主管戰情入口_URL_ + '&date=' + encodeURIComponent(date);
  return {
    ok: true,
    type: 'text',
    text: '📊 主管戰情看板\n作業日：' + date + '\n\n' + url + '\n\n可查看：AI摘要、風險清單、未報工追蹤、工站效率、自動化與LINE推播狀態。',
    url: url,
    時間: 主管戰情入口_現在_()
  };
}

function 主管戰情入口_是否主管戰情指令_(text) {
  text = String(text || '').trim();
  return ['主管戰情','戰情看板','主管看板','每日戰情','戰情'].indexOf(text) >= 0;
}

function 主管戰情入口_處理LINE文字_(text) {
  if (!主管戰情入口_是否主管戰情指令_(text)) return null;
  return 取得主管戰情LINE訊息({});
}

function 主管戰情入口_日期文字_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  var s = String(v).replace(/^['"]|['"]$/g, '').trim();
  var m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s;
}

function 主管戰情入口_現在_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}

function 測試_主管戰情入口健康檢查() { return 主管戰情入口_嘗試處理動作_({ action: '主管戰情入口健康檢查' }); }
function 測試_取得主管戰情入口() { return 主管戰情入口_嘗試處理動作_({ action: '取得主管戰情入口' }); }
function 測試_取得主管戰情LINE訊息() { return 主管戰情入口_嘗試處理動作_({ action: '取得主管戰情LINE訊息' }); }
