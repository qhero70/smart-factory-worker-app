/**
 * v3.6.0 正式交付總包、合併 PDF、交接清單 PDF 與部署後健康檢查排程工具
 * 用途：合併正式部署手冊與封版報告、匯出交接清單 PDF、產生正式上線總包 ZIP、建立每日健康檢查排程。
 * 使用方式：與 v3_5 工具放同一個 Apps Script 專案。
 */

const V3_6_交付總包表 = '00_正式交付總包紀錄';
const V3_6_健康排程表 = '00_部署後健康檢查排程';
const V3_6_健康紀錄表 = '00_部署後健康檢查紀錄';

const V3_6_交付總包欄位 = ['總包編號','建立時間','系統版本','總包類型','總包狀態','檔名','檔案連結','內容摘要','備註','更新時間'];
const V3_6_健康排程欄位 = ['排程編號','建立時間','排程名稱','排程狀態','執行頻率','執行時間','觸發器ID','通知方式','最後執行時間','備註','更新時間'];
const V3_6_健康紀錄欄位 = ['紀錄編號','執行時間','系統版本','健康狀態','系統總檢查結果','缺少工作表數','缺少函數數','錯誤訊息','通知結果','備註','更新時間'];

function 升級_v3_6_正式交付總包表() {
  v3_6_建立表與欄位_(V3_6_交付總包表, V3_6_交付總包欄位, '#0e7490');
  v3_6_建立表與欄位_(V3_6_健康排程表, V3_6_健康排程欄位, '#15803d');
  v3_6_建立表與欄位_(V3_6_健康紀錄表, V3_6_健康紀錄欄位, '#7c3aed');
  return { 成功: true, 版本: 'v3.6.0', 訊息: 'v3.6 正式交付總包與健康檢查表已建立/更新' };
}

function 匯出_v3_6_正式部署手冊與封版報告合併PDF() {
  升級_v3_6_正式交付總包表();
  const manual = v3_6_取最新欄位_('00_正式部署手冊紀錄', '手冊內容') || '尚未產生正式部署手冊。';
  const release = v3_6_取最新欄位_('00_正式上線封版報告', '報告內容') || '尚未產生正式上線封版報告。';
  const text = `【智慧製造中央作戰指揮中心｜正式交付合併文件 v3.6.0】\n\n==============================\n一、正式部署手冊\n==============================\n${manual}\n\n==============================\n二、正式上線封版報告\n==============================\n${release}`;
  const fileName = '智慧製造中央作戰指揮中心_正式部署手冊與封版報告合併PDF_' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '.pdf';
  const url = v3_6_文字匯出PDF_(fileName, text);
  const row = v3_6_寫入交付總包_('合併PDF', '已產生', fileName, url, '正式部署手冊與封版報告合併 PDF');
  return { 成功: true, 版本: 'v3.6.0', 訊息: '合併 PDF 已匯出', 檔名: fileName, 連結: url, 紀錄: row };
}

function 匯出_v3_6_交接清單PDF() {
  升級_v3_6_正式交付總包表();
  const list = 表格轉物件_('00_正式上線交接清單');
  if (!list.length && typeof 建立_v3_5_正式上線交接清單 === 'function') 建立_v3_5_正式上線交接清單();
  const rows = 表格轉物件_('00_正式上線交接清單');
  const text = `【智慧製造中央作戰指揮中心｜正式上線交接清單 v3.6.0】\n\n${rows.map((x, i) => `${i + 1}. ${x['交接類別']}｜${x['交接項目']}｜狀態：${x['交接狀態']}｜負責人：${x['負責人'] || ''}\n驗收標準：${x['驗收標準'] || ''}\n處理紀錄：${x['處理紀錄'] || ''}\n`).join('\n')}`;
  const fileName = '智慧製造中央作戰指揮中心_正式上線交接清單_' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '.pdf';
  const url = v3_6_文字匯出PDF_(fileName, text);
  const row = v3_6_寫入交付總包_('交接清單PDF', '已產生', fileName, url, '正式上線交接清單 PDF');
  return { 成功: true, 版本: 'v3.6.0', 訊息: '交接清單 PDF 已匯出', 檔名: fileName, 連結: url, 紀錄: row };
}

function 產生_v3_6_正式上線總包ZIP() {
  升級_v3_6_正式交付總包表();
  const packageId = 'PKG-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss');
  const summary = 取得_v3_6_正式交付總包總覽();
  const release = v3_6_取最新欄位_('00_正式上線封版報告', '報告內容') || '';
  const manual = v3_6_取最新欄位_('00_正式部署手冊紀錄', '手冊內容') || '';
  const handoff = v3_6_CSV_(表格轉物件_('00_正式上線交接清單'));
  const versionLog = v3_6_CSV_(表格轉物件_('00_版本鎖定紀錄'));
  const delivery = v3_6_CSV_(表格轉物件_(V3_6_交付總包表));
  const health = v3_6_CSV_(表格轉物件_(V3_6_健康紀錄表));
  const blobs = [
    Utilities.newBlob(release, 'text/plain', '01_正式上線封版報告.txt'),
    Utilities.newBlob(manual, 'text/plain', '02_正式部署手冊.txt'),
    Utilities.newBlob(handoff, 'text/csv', '03_正式上線交接清單.csv'),
    Utilities.newBlob(versionLog, 'text/csv', '04_版本鎖定紀錄.csv'),
    Utilities.newBlob(delivery, 'text/csv', '05_正式交付總包紀錄.csv'),
    Utilities.newBlob(health, 'text/csv', '06_部署後健康檢查紀錄.csv'),
    Utilities.newBlob(JSON.stringify(summary, null, 2), 'application/json', '00_正式交付總包總覽.json')
  ];
  const zip = Utilities.zip(blobs, '智慧製造中央作戰指揮中心_正式上線總包_' + packageId + '.zip');
  const file = DriveApp.createFile(zip);
  const row = v3_6_寫入交付總包_('正式上線總包ZIP', '已產生', file.getName(), file.getUrl(), '包含封版報告、部署手冊、交接清單、版本鎖定與健康檢查紀錄');
  return { 成功: true, 版本: 'v3.6.0', 訊息: '正式上線總包 ZIP 已產生', 總包編號: packageId, 檔名: file.getName(), 連結: file.getUrl(), 紀錄: row };
}

function 建立_v3_6_部署後每日健康檢查排程() {
  升級_v3_6_正式交付總包表();
  刪除_v3_6_健康檢查觸發器_();
  const trigger = ScriptApp.newTrigger('執行_v3_6_部署後每日健康檢查').timeBased().everyDays(1).atHour(8).create();
  const row = {
    排程編號: 'HEALTH-SCH-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    建立時間: new Date(),
    排程名稱: '部署後每日健康檢查',
    排程狀態: '啟用',
    執行頻率: '每日',
    執行時間: '08:00',
    觸發器ID: trigger.getUniqueId(),
    通知方式: 'LINE / 表格紀錄',
    最後執行時間: '',
    備註: '由 v3.6.0 建立',
    更新時間: new Date()
  };
  v3_6_追加物件列_(V3_6_健康排程表, row);
  return { 成功: true, 版本: 'v3.6.0', 訊息: '部署後每日健康檢查排程已建立', 排程: row };
}

function 停用_v3_6_部署後每日健康檢查排程() {
  const count = 刪除_v3_6_健康檢查觸發器_();
  v3_6_追加物件列_(V3_6_健康排程表, {
    排程編號: 'HEALTH-OFF-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    建立時間: new Date(),
    排程名稱: '部署後每日健康檢查',
    排程狀態: '停用',
    執行頻率: '每日',
    執行時間: '08:00',
    觸發器ID: '',
    通知方式: '無',
    最後執行時間: '',
    備註: '已刪除觸發器數：' + count,
    更新時間: new Date()
  });
  return { 成功: true, 版本: 'v3.6.0', 訊息: '部署後每日健康檢查排程已停用', 刪除觸發器數: count };
}

function 執行_v3_6_部署後每日健康檢查() {
  升級_v3_6_正式交付總包表();
  let result, status = '正常', msg = '';
  try {
    result = 系統總檢查_v3_0_();
    const missingSheets = (result.缺少工作表 || []).length;
    const missingFns = (result.函數狀態 || []).filter(x => x.狀態 !== '已載入').length;
    if (!result.成功 || missingSheets || missingFns) status = '異常';
    msg = JSON.stringify(result).slice(0, 4500);
    v3_6_追加物件列_(V3_6_健康紀錄表, {
      紀錄編號: 'HEALTH-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
      執行時間: new Date(),
      系統版本: result.版本 || 'v3.6.0',
      健康狀態: status,
      系統總檢查結果: msg,
      缺少工作表數: missingSheets,
      缺少函數數: missingFns,
      錯誤訊息: '',
      通知結果: v3_6_健康檢查通知_(status, result),
      備註: '',
      更新時間: new Date()
    });
  } catch (err) {
    status = '異常';
    v3_6_追加物件列_(V3_6_健康紀錄表, {
      紀錄編號: 'HEALTH-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
      執行時間: new Date(),
      系統版本: 'v3.6.0',
      健康狀態: status,
      系統總檢查結果: '',
      缺少工作表數: '',
      缺少函數數: '',
      錯誤訊息: err.message,
      通知結果: v3_6_健康檢查通知_(status, { 訊息: err.message }),
      備註: '',
      更新時間: new Date()
    });
  }
  return { 成功: status === '正常', 版本: 'v3.6.0', 健康狀態: status, 結果: result || null };
}

function 取得_v3_6_正式交付總包總覽() {
  升級_v3_6_正式交付總包表();
  const deliveries = 表格轉物件_(V3_6_交付總包表);
  const schedules = 表格轉物件_(V3_6_健康排程表);
  const health = 表格轉物件_(V3_6_健康紀錄表);
  return {
    成功: true,
    版本: 'v3.6.0',
    統計: {
      交付檔案數: deliveries.length,
      健康排程紀錄數: schedules.length,
      健康檢查紀錄數: health.length,
      最近健康狀態: health.length ? health[health.length - 1]['健康狀態'] : '尚未執行'
    },
    正式交付總包: deliveries.slice(-100).reverse(),
    健康檢查排程: schedules.slice(-20).reverse(),
    健康檢查紀錄: health.slice(-100).reverse()
  };
}

function v3_6_健康檢查通知_(status, result) {
  try {
    if (typeof 推播LINE文字_ === 'function') {
      推播LINE文字_(`【部署後每日健康檢查】\n狀態：${status}\n版本：${result.版本 || 'v3.6.0'}\n時間：${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss')}`);
      return 'LINE已嘗試推播';
    }
  } catch (e) { return 'LINE推播失敗：' + e.message; }
  return '僅寫入表格紀錄';
}

function v3_6_寫入交付總包_(type, status, fileName, url, summary) {
  const row = {
    總包編號: 'DEL-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    建立時間: new Date(),
    系統版本: 'v3.6.0',
    總包類型: type,
    總包狀態: status,
    檔名: fileName || '',
    檔案連結: url || '',
    內容摘要: summary || '',
    備註: '',
    更新時間: new Date()
  };
  v3_6_追加物件列_(V3_6_交付總包表, row);
  return row;
}

function v3_6_取最新欄位_(表名, 欄位) {
  try {
    const list = 表格轉物件_(表名);
    const latest = list[list.length - 1];
    return latest ? latest[欄位] || '' : '';
  } catch (e) { return ''; }
}

function v3_6_文字匯出PDF_(fileName, text) {
  const doc = DocumentApp.create(fileName.replace(/\.pdf$/i, ''));
  const body = doc.getBody();
  String(text || '').split('\n').forEach(line => body.appendParagraph(line));
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  const pdf = file.getAs(MimeType.PDF).setName(fileName);
  const out = DriveApp.createFile(pdf);
  file.setTrashed(true);
  return out.getUrl();
}

function v3_6_CSV_(rows) {
  rows = rows || [];
  if (!rows.length) return '';
  const hs = Object.keys(rows[0]);
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  return [hs.map(esc).join(','), ...rows.map(r => hs.map(h => esc(r[h])).join(','))].join('\n');
}

function 刪除_v3_6_健康檢查觸發器_() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  triggers.forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === '執行_v3_6_部署後每日健康檢查') {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  });
  return count;
}

function v3_6_建立表與欄位_(表名, 欄位, color) {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName(表名);
  if (!sh) sh = ss.insertSheet(表名);
  const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  欄位.forEach(h => { if (!現有.includes(h)) sh.getRange(1, sh.getLastColumn() + 1).setValue(h); });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#0f766e').setFontColor('#ffffff');
}

function v3_6_追加物件列_(表名, obj) {
  const sh = 取得試算表_().getSheetByName(表名);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(header.map(h => obj[h] !== undefined ? obj[h] : ''));
}
