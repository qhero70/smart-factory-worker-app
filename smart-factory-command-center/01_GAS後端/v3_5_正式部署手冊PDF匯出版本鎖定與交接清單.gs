/**
 * v3.5.0 正式部署手冊、封版 PDF、版本鎖定與交接清單工具
 * 用途：自動產生部署手冊、匯出封版 PDF、封版後版本鎖定、正式上線交接清單。
 * 使用方式：與 v3_4 工具放同一個 Apps Script 專案。
 */

const V3_5_部署手冊表 = '00_正式部署手冊紀錄';
const V3_5_版本鎖定表 = '00_版本鎖定紀錄';
const V3_5_交接清單表 = '00_正式上線交接清單';

const V3_5_部署手冊欄位 = ['手冊編號','建立時間','系統版本','手冊狀態','手冊內容','PDF檔名','PDF連結','備註','更新時間'];
const V3_5_版本鎖定欄位 = ['鎖定編號','鎖定時間','系統版本','鎖定狀態','封版編號','封版狀態','鎖定人','鎖定原因','GitHubCommitSHA','備註','更新時間'];
const V3_5_交接清單欄位 = ['交接編號','建立時間','交接類別','交接項目','交接狀態','負責人','驗收標準','處理紀錄','完成時間','備註','更新時間'];

function 升級_v3_5_正式部署交接表() {
  v3_5_建立表與欄位_(V3_5_部署手冊表, V3_5_部署手冊欄位, '#0f766e');
  v3_5_建立表與欄位_(V3_5_版本鎖定表, V3_5_版本鎖定欄位, '#7c2d12');
  v3_5_建立表與欄位_(V3_5_交接清單表, V3_5_交接清單欄位, '#1d4ed8');
  return { 成功: true, 版本: 'v3.5.0', 訊息: 'v3.5 正式部署手冊、版本鎖定與交接清單表已建立/更新' };
}

function 產生_v3_5_正式部署手冊() {
  升級_v3_5_正式部署交接表();
  const lock = 取得_v3_5_版本鎖定狀態();
  let release = { 封版狀態: '尚未產生', 報告: '' };
  try {
    const list = 表格轉物件_('00_正式上線封版報告');
    const latest = list[list.length - 1];
    if (latest) release = { 封版狀態: latest['封版狀態'] || '', 報告: latest['報告內容'] || '' };
  } catch (e) {}
  const manual = v3_5_部署手冊文字_(release, lock);
  const id = 'MAN-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss');
  const row = {
    手冊編號: id,
    建立時間: new Date(),
    系統版本: 'v3.5.0',
    手冊狀態: '已產生',
    手冊內容: manual,
    PDF檔名: '',
    PDF連結: '',
    備註: '',
    更新時間: new Date()
  };
  v3_5_追加物件列_(V3_5_部署手冊表, row);
  return { 成功: true, 版本: 'v3.5.0', 手冊編號: id, 手冊: manual };
}

function 匯出_v3_5_封版報告PDF(封版編號) {
  升級_v3_5_正式部署交接表();
  const reports = 表格轉物件_('00_正式上線封版報告');
  const target = 封版編號 ? reports.find(x => String(x['封版編號']) === String(封版編號)) : reports[reports.length - 1];
  if (!target) return { 成功: false, 訊息: '找不到封版報告，請先執行 產生_v3_4_正式上線封版報告()' };
  const text = target['報告內容'] || JSON.stringify(target, null, 2);
  const fileName = `智慧製造中央作戰指揮中心_封版報告_${target['封版編號'] || Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss')}.pdf`;
  const url = v3_5_文字匯出PDF_(fileName, text);
  return { 成功: true, 版本: 'v3.5.0', 訊息: '封版報告 PDF 已匯出', 檔名: fileName, 連結: url, 封版編號: target['封版編號'] || '' };
}

function 匯出_v3_5_正式部署手冊PDF(手冊編號) {
  升級_v3_5_正式部署交接表();
  const manuals = 表格轉物件_(V3_5_部署手冊表);
  const target = 手冊編號 ? manuals.find(x => String(x['手冊編號']) === String(手冊編號)) : manuals[manuals.length - 1];
  if (!target) return { 成功: false, 訊息: '找不到部署手冊，請先執行 產生_v3_5_正式部署手冊()' };
  const fileName = `智慧製造中央作戰指揮中心_正式部署手冊_${target['手冊編號']}.pdf`;
  const url = v3_5_文字匯出PDF_(fileName, target['手冊內容'] || '');
  v3_5_更新手冊PDF_(target['手冊編號'], fileName, url);
  return { 成功: true, 版本: 'v3.5.0', 訊息: '正式部署手冊 PDF 已匯出', 檔名: fileName, 連結: url, 手冊編號: target['手冊編號'] || '' };
}

function 鎖定_v3_5_封版版本(資料) {
  升級_v3_5_正式部署交接表();
  const lockNow = 取得_v3_5_版本鎖定狀態();
  if (lockNow.已鎖定) return { 成功: false, 版本: 'v3.5.0', 訊息: '版本已鎖定，不重複鎖定', 目前鎖定: lockNow };
  const reports = 表格轉物件_('00_正式上線封版報告');
  const latest = reports[reports.length - 1] || {};
  const row = {
    鎖定編號: 'LOCK-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    鎖定時間: new Date(),
    系統版本: (資料 && 資料.系統版本) || 'v3.5.0',
    鎖定狀態: '已鎖定',
    封版編號: (資料 && 資料.封版編號) || latest['封版編號'] || '',
    封版狀態: latest['封版狀態'] || '',
    鎖定人: (資料 && 資料.鎖定人) || '',
    鎖定原因: (資料 && 資料.鎖定原因) || '正式上線封版鎖定',
    GitHubCommitSHA: (資料 && 資料.GitHubCommitSHA) || '',
    備註: (資料 && 資料.備註) || '',
    更新時間: new Date()
  };
  v3_5_追加物件列_(V3_5_版本鎖定表, row);
  return { 成功: true, 版本: 'v3.5.0', 訊息: '版本已鎖定', 鎖定紀錄: row };
}

function 解除_v3_5_封版版本鎖定(原因) {
  升級_v3_5_正式部署交接表();
  const row = {
    鎖定編號: 'UNLOCK-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    鎖定時間: new Date(),
    系統版本: 'v3.5.0',
    鎖定狀態: '已解除',
    封版編號: '',
    封版狀態: '',
    鎖定人: '',
    鎖定原因: 原因 || '人工解除版本鎖定',
    GitHubCommitSHA: '',
    備註: '',
    更新時間: new Date()
  };
  v3_5_追加物件列_(V3_5_版本鎖定表, row);
  return { 成功: true, 版本: 'v3.5.0', 訊息: '版本鎖定已解除', 紀錄: row };
}

function 取得_v3_5_版本鎖定狀態() {
  try {
    const list = 表格轉物件_(V3_5_版本鎖定表);
    const latest = list[list.length - 1];
    return { 成功: true, 版本: 'v3.5.0', 已鎖定: !!latest && latest['鎖定狀態'] === '已鎖定', 最新紀錄: latest || null };
  } catch (e) {
    return { 成功: true, 版本: 'v3.5.0', 已鎖定: false, 最新紀錄: null };
  }
}

function 建立_v3_5_正式上線交接清單() {
  升級_v3_5_正式部署交接表();
  const existing = 表格轉物件_(V3_5_交接清單表);
  if (existing.length > 0) return { 成功: true, 版本: 'v3.5.0', 訊息: '交接清單已存在', 交接清單: existing };
  const items = [
    ['系統部署','GAS Web App 已重新部署','可取得最新版 Web App URL 且健康檢查成功'],
    ['系統部署','GitHub Pages 首頁可開啟','docs/index.html 可正常進入所有模組'],
    ['系統部署','LINE Webhook 已設定','LINE 輸入版本 / 健康檢查 / 封版報告可回覆'],
    ['資料庫','初始化_v3_0_正式上線 已執行','核心資料表與 v3.5 表皆存在'],
    ['測試驗收','system-test 全頁測試已執行','核心頁面與核心 API 測試通過'],
    ['修補驗收','上線修補任務已處理','fix-dashboard 修補完成率符合封版要求'],
    ['重測驗收','重測清單已處理','重測失敗數為 0 或已再開修補任務'],
    ['GitHub','Issue / Commit 證據已整理','Issue 狀態回寫與 Commit 影響範圍已記錄'],
    ['文件交付','封版報告已產生','release-board 已產生正式上線封版報告'],
    ['文件交付','封版 PDF 已匯出','Google Drive 可開啟封版報告 PDF'],
    ['文件交付','正式部署手冊已產生','部署手冊內容可供交接使用'],
    ['封版管理','版本已鎖定','00_版本鎖定紀錄 顯示已鎖定'],
    ['交接完成','主管 / 使用者已確認','交接狀態全部完成']
  ];
  const rows = items.map((x, i) => ({
    交接編號: 'HAND-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + String(i + 1).padStart(2, '0'),
    建立時間: new Date(),
    交接類別: x[0],
    交接項目: x[1],
    交接狀態: '待確認',
    負責人: '',
    驗收標準: x[2],
    處理紀錄: '',
    完成時間: '',
    備註: '',
    更新時間: new Date()
  }));
  rows.forEach(r => v3_5_追加物件列_(V3_5_交接清單表, r));
  return { 成功: true, 版本: 'v3.5.0', 訊息: '正式上線交接清單已建立', 筆數: rows.length, 交接清單: rows };
}

function 更新_v3_5_交接清單狀態(交接編號, 交接狀態, 負責人, 處理紀錄, 備註) {
  const sh = 取得試算表_().getSheetByName(V3_5_交接清單表);
  if (!sh) return { 成功: false, 訊息: '找不到交接清單表' };
  const data = sh.getDataRange().getValues();
  const h = data[0];
  const idx = {}; h.forEach((x, i) => idx[x] = i);
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx['交接編號']]) === String(交接編號)) {
      if (idx['交接狀態'] !== undefined) sh.getRange(r + 1, idx['交接狀態'] + 1).setValue(交接狀態 || '待確認');
      if (idx['負責人'] !== undefined) sh.getRange(r + 1, idx['負責人'] + 1).setValue(負責人 || '');
      if (idx['處理紀錄'] !== undefined) sh.getRange(r + 1, idx['處理紀錄'] + 1).setValue(處理紀錄 || '');
      if (idx['備註'] !== undefined) sh.getRange(r + 1, idx['備註'] + 1).setValue(備註 || '');
      if (idx['完成時間'] !== undefined && 交接狀態 === '完成') sh.getRange(r + 1, idx['完成時間'] + 1).setValue(new Date());
      if (idx['更新時間'] !== undefined) sh.getRange(r + 1, idx['更新時間'] + 1).setValue(new Date());
      return { 成功: true, 版本: 'v3.5.0', 訊息: '交接狀態已更新' };
    }
  }
  return { 成功: false, 訊息: '找不到交接編號：' + 交接編號 };
}

function 取得_v3_5_正式交接總覽() {
  升級_v3_5_正式部署交接表();
  const manuals = 表格轉物件_(V3_5_部署手冊表);
  const locks = 表格轉物件_(V3_5_版本鎖定表);
  const hand = 表格轉物件_(V3_5_交接清單表);
  const done = hand.filter(x => x['交接狀態'] === '完成').length;
  return {
    成功: true,
    版本: 'v3.5.0',
    統計: {
      手冊數: manuals.length,
      鎖定紀錄數: locks.length,
      交接項目數: hand.length,
      交接完成數: done,
      交接完成率: hand.length ? Math.round(done / hand.length * 1000) / 10 : 0,
      目前鎖定: 取得_v3_5_版本鎖定狀態().已鎖定 ? '已鎖定' : '未鎖定'
    },
    部署手冊: manuals.slice(-20).reverse(),
    版本鎖定: locks.slice(-20).reverse(),
    交接清單: hand
  };
}

function v3_5_部署手冊文字_(release, lock) {
  return `【智慧製造中央作戰指揮中心｜正式部署手冊 v3.5.0】\n\n一、系統定位\n本系統為製造部智慧製造中央作戰指揮中心，整合 GitHub Pages、Google Apps Script、Google Sheets、LINE Bot、任務修補、封版報告與交接清單。\n\n二、正式部署順序\n1. 將 01_GAS後端 全部 .gs 檔貼入同一個 Apps Script 專案。\n2. 以 v3_0_GAS主控入口與LINE最終整合版.gs 作為唯一 doGet / doPost 入口。\n3. 執行 初始化_v3_0_正式上線()。\n4. 重新部署 GAS Web App。\n5. 將 Web App URL 貼到 GitHub Pages 各頁面。\n6. LINE Webhook 使用同一個 GAS Web App URL。\n7. 開啟 docs/system-test.html 執行全頁測試。\n8. 若有錯誤，使用 docs/fix-board.html 與 docs/retest-board.html 修補與重測。\n9. 使用 docs/release-board.html 產生封版報告。\n10. 使用 docs/handoff-board.html 交接並鎖定版本。\n\n三、GitHub Pages 入口\n首頁：docs/index.html\n測試：docs/system-test.html\n修補：docs/fix-board.html\n重測：docs/retest-board.html\n封版：docs/release-board.html\n交接：docs/handoff-board.html\n\n四、LINE 指令\n版本\n健康檢查\n上線檢查\n修補報告\n修補週報\n修補月報\n封版報告\n\n五、目前封版狀態\n封版狀態：${release.封版狀態 || '尚未產生'}\n版本鎖定：${lock.已鎖定 ? '已鎖定' : '未鎖定'}\n\n六、交接標準\n1. system-test 核心測試完成。\n2. 修補任務無高風險未完成。\n3. 重測失敗項目已再開修補或處理完成。\n4. 封版報告已產生。\n5. 封版 PDF 與部署手冊 PDF 已留存。\n6. 版本鎖定紀錄已建立。\n7. 正式上線交接清單全部完成。`;
}

function v3_5_文字匯出PDF_(fileName, text) {
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

function v3_5_更新手冊PDF_(手冊編號, 檔名, 連結) {
  const sh = 取得試算表_().getSheetByName(V3_5_部署手冊表);
  if (!sh) return;
  const data = sh.getDataRange().getValues();
  const h = data[0];
  const idx = {}; h.forEach((x, i) => idx[x] = i);
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx['手冊編號']]) === String(手冊編號)) {
      if (idx['PDF檔名'] !== undefined) sh.getRange(r + 1, idx['PDF檔名'] + 1).setValue(檔名 || '');
      if (idx['PDF連結'] !== undefined) sh.getRange(r + 1, idx['PDF連結'] + 1).setValue(連結 || '');
      if (idx['更新時間'] !== undefined) sh.getRange(r + 1, idx['更新時間'] + 1).setValue(new Date());
    }
  }
}

function v3_5_建立表與欄位_(表名, 欄位, color) {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName(表名);
  if (!sh) sh = ss.insertSheet(表名);
  const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  欄位.forEach(h => { if (!現有.includes(h)) sh.getRange(1, sh.getLastColumn() + 1).setValue(h); });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#0f766e').setFontColor('#ffffff');
}

function v3_5_追加物件列_(表名, obj) {
  const sh = 取得試算表_().getSheetByName(表名);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(header.map(h => obj[h] !== undefined ? obj[h] : ''));
}
