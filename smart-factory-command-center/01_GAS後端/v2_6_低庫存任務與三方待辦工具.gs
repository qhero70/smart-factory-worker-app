/**
 * v2.6.0 低庫存任務與三方待辦工具
 * 用途：素材低於安全庫存時，自動建立生管/採購/製造三方待辦任務，並可推播 LINE 低庫存清單。
 * 使用方式：貼到同一個 Apps Script 專案後，先執行 升級_v2_6_跨部門待辦任務表()
 */

const v2_6_待辦任務欄位 = [
  '任務編號','建立時間','任務來源','任務類型','負責單位','負責人','優先級','任務狀態',
  '共用素材編號','共用素材名稱','目前庫存','安全庫存','可分配數量','缺口數量',
  '最近需求交期','採購前置天數','最晚採購日','建議動作','處理紀錄','完成時間','更新時間'
];

function 升級_v2_6_跨部門待辦任務表() {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName('10_跨部門待辦任務');
  if (!sh) sh = ss.insertSheet('10_跨部門待辦任務');
  const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  const 新增 = [];
  v2_6_待辦任務欄位.forEach(欄名 => {
    if (!現有.includes(欄名)) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(欄名);
      新增.push(欄名);
    }
  });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
  sh.autoResizeColumns(1, sh.getLastColumn());
  記錄操作_('系統升級', '升級_v2_6_跨部門待辦任務表', '10_跨部門待辦任務', '完成', 新增.join('、'));
  return { 成功: true, 版本: 'v2.6.0', 訊息: '跨部門待辦任務表升級完成', 新增欄位: 新增 };
}

function 掃描_v2_6_低庫存自動建立任務() {
  升級_v2_6_跨部門待辦任務表();
  const 素材 = 表格轉物件_('10_共用素材主檔').filter(x => String(x['狀態'] || '啟用') !== '停用');
  const 現有任務 = 表格轉物件_('10_跨部門待辦任務').filter(x => String(x['任務狀態'] || '') !== '完成');
  const 建立結果 = [];
  素材.forEach(x => {
    const 現庫 = Number(x['目前庫存'] || 0);
    const 安全 = Number(x['安全庫存'] || 0);
    const 可分配 = Number(x['可分配數量'] || 0);
    if (安全 <= 0) return;
    if (現庫 > 安全 && 可分配 > 0) return;
    const exists = 現有任務.some(t => String(t['共用素材編號']) === String(x['共用素材編號']) && String(t['任務類型']) === '低庫存補料');
    if (exists) return;
    const info = v2_6_計算素材採購時程_(x['共用素材編號'], Number(x['採購前置天數'] || 0));
    const 缺口 = Math.max(安全 - 現庫, 0);
    const 任務 = {
      任務編號: 'TASK-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100),
      建立時間: new Date(),
      任務來源: '低庫存自動掃描',
      任務類型: '低庫存補料',
      負責單位: '採購',
      負責人: '',
      優先級: info.Tier等級 === 'Tier 1' ? '高' : info.Tier等級 === 'Tier 2' ? '中' : '一般',
      任務狀態: '待處理',
      共用素材編號: x['共用素材編號'] || '',
      共用素材名稱: x['共用素材名稱'] || '',
      目前庫存: 現庫,
      安全庫存: 安全,
      可分配數量: 可分配,
      缺口數量: 缺口,
      最近需求交期: info.最近需求交期 || '',
      採購前置天數: Number(x['採購前置天數'] || 0),
      最晚採購日: info.最晚採購日 || '',
      建議動作: v2_6_建議動作_(x, info, 缺口),
      處理紀錄: '',
      完成時間: '',
      更新時間: new Date()
    };
    v2_6_追加任務_(任務);
    建立結果.push(任務);
  });
  記錄操作_('跨部門任務', '掃描_v2_6_低庫存自動建立任務', '低庫存', '完成', JSON.stringify({ 建立數: 建立結果.length }));
  return { 成功: true, 版本: 'v2.6.0', 訊息: '低庫存任務掃描完成', 建立數: 建立結果.length, 任務: 建立結果 };
}

function v2_6_計算素材採購時程_(共用素材編號, 採購前置天數) {
  const 需求 = 表格轉物件_('10_排程需求池')
    .filter(x => String(x['狀態'] || '待排程') !== '完成')
    .filter(x => String(x['共用素材編號'] || '') === String(共用素材編號 || ''))
    .sort((a, b) => v2_6_日期差_(a['交期'] || a['預計完工日']) - v2_6_日期差_(b['交期'] || b['預計完工日']));
  if (!需求.length) return { 最近需求交期: '', 最晚採購日: '', Tier等級: 'Tier 4' };
  const 最近交期 = 需求[0]['交期'] || 需求[0]['預計完工日'];
  const due = new Date(最近交期);
  if (isNaN(due)) return { 最近需求交期: 最近交期, 最晚採購日: '', Tier等級: 'Tier 4' };
  due.setDate(due.getDate() - Number(採購前置天數 || 0));
  return {
    最近需求交期: 最近交期,
    最晚採購日: Utilities.formatDate(due, 'Asia/Taipei', 'yyyy-MM-dd'),
    Tier等級: v2_6_計算Tier_(最近交期)
  };
}

function v2_6_建議動作_(素材, info, 缺口) {
  const name = 素材['共用素材名稱'] || '';
  const part = 素材['共用素材編號'] || '';
  if (info.Tier等級 === 'Tier 1') return `急件：${part} ${name} 低庫存，請採購立即確認到貨日，缺口 ${缺口}。`;
  if (info.Tier等級 === 'Tier 2') return `請採購確認 ${part} ${name} 補料進度，最晚採購日 ${info.最晚採購日 || '未定'}。`;
  return `請依安全庫存補料 ${part} ${name}，避免後續排程缺料。`;
}

function v2_6_追加任務_(obj) {
  const ss = 取得試算表_();
  const sh = ss.getSheetByName('10_跨部門待辦任務');
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(header.map(h => obj[h] !== undefined ? obj[h] : ''));
}

function 更新_v2_6_待辦任務狀態(任務編號, 新狀態, 處理紀錄, 負責人) {
  const ss = 取得試算表_();
  const sh = ss.getSheetByName('10_跨部門待辦任務');
  const data = sh.getDataRange().getValues();
  const header = data[0];
  const idx = {}; header.forEach((h, i) => idx[h] = i);
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx['任務編號']]) === String(任務編號)) {
      if (idx['任務狀態'] !== undefined) sh.getRange(r + 1, idx['任務狀態'] + 1).setValue(新狀態);
      if (idx['處理紀錄'] !== undefined) sh.getRange(r + 1, idx['處理紀錄'] + 1).setValue(處理紀錄 || '');
      if (idx['負責人'] !== undefined && 負責人) sh.getRange(r + 1, idx['負責人'] + 1).setValue(負責人);
      if (idx['完成時間'] !== undefined && 新狀態 === '完成') sh.getRange(r + 1, idx['完成時間'] + 1).setValue(new Date());
      if (idx['更新時間'] !== undefined) sh.getRange(r + 1, idx['更新時間'] + 1).setValue(new Date());
      return { 成功: true, 訊息: '任務狀態已更新' };
    }
  }
  return { 成功: false, 訊息: '找不到任務編號' };
}

function 推播_v2_6_LINE低庫存清單(目標ID) {
  const result = 掃描_v2_6_低庫存自動建立任務();
  const text = 產生LINE_低庫存文字_() + `\n\n本次新增任務：${result.建立數}`;
  if (!目標ID) return { 成功: false, 訊息: '缺少 LINE 目標ID', 預覽: text };
  if (!系統設定.LINE_CHANNEL_ACCESS_TOKEN) return { 成功: false, 訊息: '尚未設定 LINE_CHANNEL_ACCESS_TOKEN', 預覽: text };
  const payload = { to: 目標ID, messages: [{ type: 'text', text }] };
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + 系統設定.LINE_CHANNEL_ACCESS_TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  return { 成功: true, 狀態碼: res.getResponseCode(), 回應: res.getContentText(), 新增任務: result.建立數 };
}

function v2_6_日期差_(日期字串) {
  if (!日期字串) return 99999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(日期字串); if (isNaN(d)) return 99999;
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function v2_6_計算Tier_(交期) {
  const d = v2_6_日期差_(交期);
  if (d <= 7) return 'Tier 1';
  if (d <= 14) return 'Tier 2';
  if (d <= 21) return 'Tier 3';
  return 'Tier 4';
}

function 測試_v2_6_低庫存任務掃描() {
  return 掃描_v2_6_低庫存自動建立任務();
}
