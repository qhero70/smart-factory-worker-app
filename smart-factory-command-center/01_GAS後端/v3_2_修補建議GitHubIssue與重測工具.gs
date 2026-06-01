/**
 * v3.2.0 修補建議、GitHub Issue 與重測工具
 * 用途：自動分析修補建議、建立 GitHub Issue 草稿/正式 Issue、記錄修補任務與 Commit 對照、產生重測清單。
 * 使用方式：與 v3_1_上線測試錯誤回報與修補任務工具.gs 放同一個 Apps Script 專案。
 */

const V3_2_對照表 = '00_修補GitHub對照';
const V3_2_重測表 = '00_修補重測清單';
const V3_2_對照欄位 = ['對照編號','建立時間','修補編號','GitHub倉庫','Issue標題','Issue編號','Issue網址','CommitSHA','Commit網址','對照狀態','備註','更新時間'];
const V3_2_重測欄位 = ['重測編號','建立時間','修補編號','來源錯誤編號','重測項目','重測類型','重測狀態','重測結果','重測時間','備註','更新時間'];

function 升級_v3_2_修補GitHub與重測表() {
  v3_2_建立表與欄位_(V3_2_對照表, V3_2_對照欄位, '#0369a1');
  v3_2_建立表與欄位_(V3_2_重測表, V3_2_重測欄位, '#15803d');
  return { 成功: true, 版本: 'v3.2.0', 訊息: '修補 GitHub 對照與重測表已建立/更新' };
}

function 產生_v3_2_修補建議(修補編號) {
  const task = v3_2_找修補任務_(修補編號);
  if (!task) return { 成功: false, 訊息: '找不到修補任務：' + 修補編號 };
  const type = String(task['修補類型'] || '一般修補');
  const summary = String(task['問題摘要'] || '');
  const result = {
    成功: true,
    版本: 'v3.2.0',
    修補編號,
    修補類型: type,
    問題摘要: summary,
    建議檢查檔案: v3_2_建議檔案_(type, summary),
    建議處理步驟: v3_2_建議步驟_(type, summary),
    建議測試項目: v3_2_建議測試_(type, summary),
    Issue草稿: v3_2_建立Issue草稿_(task)
  };
  return result;
}

function 建立_v3_2_GitHubIssue草稿(修補編號) {
  const task = v3_2_找修補任務_(修補編號);
  if (!task) return { 成功: false, 訊息: '找不到修補任務：' + 修補編號 };
  return { 成功: true, 版本: 'v3.2.0', 草稿: v3_2_建立Issue草稿_(task) };
}

function 建立_v3_2_GitHubIssue(修補編號) {
  升級_v3_2_修補GitHub與重測表();
  const task = v3_2_找修補任務_(修補編號);
  if (!task) return { 成功: false, 訊息: '找不到修補任務：' + 修補編號 };
  const repo = v3_2_讀設定_('GITHUB_REPO_FULL_NAME') || 'qhero70/smart-factory-worker-app';
  const token = v3_2_讀設定_('GITHUB_TOKEN');
  const draft = v3_2_建立Issue草稿_(task);
  if (!token) {
    return { 成功: false, 訊息: '尚未設定 GITHUB_TOKEN，先回傳 Issue 草稿', GitHub倉庫: repo, 草稿: draft };
  }
  const url = 'https://api.github.com/repos/' + repo + '/issues';
  const payload = { title: draft.標題, body: draft.內容, labels: ['上線修補', task['優先級'] || '一般', task['修補類型'] || '一般修補'] };
  const res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText() || '{}');
  if (code < 200 || code >= 300) return { 成功: false, 訊息: 'GitHub Issue 建立失敗', 狀態碼: code, 回應: body, 草稿: draft };
  const row = {
    對照編號: 'MAP-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    建立時間: new Date(),
    修補編號,
    GitHub倉庫: repo,
    Issue標題: draft.標題,
    Issue編號: body.number || '',
    Issue網址: body.html_url || '',
    CommitSHA: '',
    Commit網址: '',
    對照狀態: 'Issue已建立',
    備註: '',
    更新時間: new Date()
  };
  v3_2_追加物件列_(V3_2_對照表, row);
  return { 成功: true, 訊息: 'GitHub Issue 已建立', Issue編號: body.number, Issue網址: body.html_url, 對照: row };
}

function 登記_v3_2_修補Commit(修補編號, CommitSHA, 備註) {
  升級_v3_2_修補GitHub與重測表();
  const repo = v3_2_讀設定_('GITHUB_REPO_FULL_NAME') || 'qhero70/smart-factory-worker-app';
  const row = {
    對照編號: 'MAP-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    建立時間: new Date(),
    修補編號,
    GitHub倉庫: repo,
    Issue標題: '',
    Issue編號: '',
    Issue網址: '',
    CommitSHA: CommitSHA || '',
    Commit網址: CommitSHA ? ('https://github.com/' + repo + '/commit/' + CommitSHA) : '',
    對照狀態: CommitSHA ? 'Commit已登記' : '待登記',
    備註: 備註 || '',
    更新時間: new Date()
  };
  v3_2_追加物件列_(V3_2_對照表, row);
  return { 成功: true, 訊息: '修補 Commit 已登記', 對照: row };
}

function 建立_v3_2_修補完成重測清單(修補編號) {
  升級_v3_2_修補GitHub與重測表();
  const task = v3_2_找修補任務_(修補編號);
  if (!task) return { 成功: false, 訊息: '找不到修補任務：' +修補編號 };
  const tests = v3_2_建議測試_(task['修補類型'], task['問題摘要']);
  const rows = tests.map(item => ({
    重測編號: 'RETEST-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100),
    建立時間: new Date(),
    修補編號,
    來源錯誤編號: task['來源錯誤編號'] || '',
    重測項目: item,
    重測類型: task['修補類型'] || '',
    重測狀態: '待重測',
    重測結果: '',
    重測時間: '',
    備註: '',
    更新時間: new Date()
  }));
  rows.forEach(r => v3_2_追加物件列_(V3_2_重測表, r));
  return { 成功: true, 版本: 'v3.2.0', 訊息: '重測清單已建立', 筆數: rows.length, 重測清單: rows };
}

function 取得_v3_2_修補GitHub總覽() {
  升級_v3_2_修補GitHub與重測表();
  return {
    成功: true,
    版本: 'v3.2.0',
    GitHub對照: 表格轉物件_(V3_2_對照表).slice(-100).reverse(),
    重測清單: 表格轉物件_(V3_2_重測表).slice(-100).reverse()
  };
}

function v3_2_建立Issue草稿_(task) {
  const title = `[上線修補][${task['優先級'] || '一般'}][${task['修補類型'] || '一般修補'}] ${String(task['問題摘要'] || '').slice(0, 80)}`;
  const 建議 = v3_2_建議步驟_(task['修補類型'], task['問題摘要']).map((x, i) => `${i + 1}. ${x}`).join('\n');
  const 測試 = v3_2_建議測試_(task['修補類型'], task['問題摘要']).map(x => `- [ ] ${x}`).join('\n');
  const body = `## 修補任務\n\n- 修補編號：${task['修補編號'] || ''}\n- 來源錯誤：${task['來源錯誤編號'] || ''}\n- 修補類型：${task['修補類型'] || ''}\n- 優先級：${task['優先級'] || ''}\n- 修補狀態：${task['修補狀態'] || ''}\n\n## 問題摘要\n\n${task['問題摘要'] || ''}\n\n## 建議處理\n\n${建議}\n\n## 驗收測試\n\n${測試}\n\n## 備註\n\n由智慧製造中央作戰指揮中心 v3.2.0 產生。`;
  return { 標題: title, 內容: body };
}

function v3_2_找修補任務_(修補編號) {
  const tasks = 表格轉物件_('00_上線修補任務');
  return tasks.find(x => String(x['修補編號']) === String(修補編號));
}

function v3_2_建議檔案_(type, summary) {
  if (/LINE/.test(type)) return ['v3_0_GAS主控入口與LINE最終整合版.gs','LINEBot_FlexMessage主選單.gs'];
  if (/GAS/.test(type)) return ['v3_0_GAS主控入口與LINE最終整合版.gs','對應 action 的 GAS 工具檔'];
  if (/GitHub Pages/.test(type)) return ['docs/index.html','docs/system-test.html','錯誤對應的 docs/*.html'];
  if (/資料表/.test(type)) return ['v3_0_GAS主控入口與LINE最終整合版.gs','資料表升級工具 gs'];
  return ['錯誤對應模組'];
}

function v3_2_建議步驟_(type, summary) {
  if (/LINE/.test(type)) return ['確認 LINE Webhook URL 是否使用最新 GAS Web App URL','確認 LINE_CHANNEL_ACCESS_TOKEN 是否設定','確認 doPost 沒有重複定義','輸入「版本 / 健康檢查 / 修補報告」實測'];
  if (/GAS/.test(type)) return ['確認 Apps Script 已貼入所有 v1.0~v3.2 後端檔案','確認 action 名稱與函數名稱完全一致','重新部署 Web App 並更新前端 GAS URL','在 system-test.html 重新測 API'];
  if (/GitHub Pages/.test(type)) return ['確認 docs 檔案存在','確認首頁入口 href 路徑正確','確認 GitHub Pages 已部署最新 commit','重新整理瀏覽器快取後重測'];
  if (/資料表/.test(type)) return ['執行 初始化_v3_0_正式上線()','確認智慧工廠主資料庫分頁名稱一致','確認欄位列在第 1 列','重新執行 system-test'];
  return ['閱讀錯誤訊息','定位對應檔案','修正後登記 Commit','建立重測清單並重測'];
}

function v3_2_建議測試_(type, summary) {
  if (/LINE/.test(type)) return ['LINE 輸入「版本」可回覆','LINE 輸入「健康檢查」可回覆','LINE 輸入「修補報告」可回覆'];
  if (/GAS/.test(type)) return ['system-test API 全部通過','健康檢查成功','系統總檢查無缺少核心函數'];
  if (/GitHub Pages/.test(type)) return ['system-test 頁面測試全通過','首頁所有入口可開啟','修補頁與測試頁可互相跳轉'];
  if (/資料表/.test(type)) return ['初始化函數執行成功','系統總檢查無缺少工作表','對應頁面可讀取資料'];
  return ['執行 system-test.html 全部測試','確認原錯誤項目通過','更新修補任務為完成'];
}

function v3_2_讀設定_(key) {
  try {
    const list = 表格轉物件_('00_系統設定');
    const r = list.find(x => String(x['設定項目'] || x['項目'] || x['Key']) === String(key));
    return r ? (r['設定值'] || r['數值'] || r['Value'] || '') : '';
  } catch (e) { return ''; }
}

function v3_2_建立表與欄位_(表名, 欄位, color) {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName(表名);
  if (!sh) sh = ss.insertSheet(表名);
  const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  欄位.forEach(h => { if (!現有.includes(h)) sh.getRange(1, sh.getLastColumn() + 1).setValue(h); });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#0f766e').setFontColor('#ffffff');
}

function v3_2_追加物件列_(表名, obj) {
  const sh = 取得試算表_().getSheetByName(表名);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(header.map(h => obj[h] !== undefined ? obj[h] : ''));
}
