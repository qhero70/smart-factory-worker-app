/**
 * v3.4.0 重測失敗再開修補、GitHub Issue 狀態回寫、Commit 影響範圍比對與正式上線封版報告
 * 用途：將修補驗收閉環化，重測失敗可再開修補任務，Issue 狀態可回寫，Commit 可比對影響範圍，最後產出封版報告。
 * 使用方式：與 v3_1 / v3_2 / v3_3 工具放同一個 Apps Script 專案。
 */

const V3_4_Commit影響範圍表 = '00_Commit影響範圍';
const V3_4_封版報告表 = '00_正式上線封版報告';
const V3_4_Commit影響欄位 = ['影響編號','建立時間','比對類型','GitHub倉庫','BaseSHA','HeadSHA','CommitSHA','檔案路徑','變更狀態','新增行','刪除行','變更行','檔案URL','備註','更新時間'];
const V3_4_封版欄位 = ['封版編號','建立時間','系統版本','封版狀態','錯誤總數','修補任務總數','修補完成率','重測總數','重測通過率','未完成數','重測失敗數','GitHub對照數','Commit影響檔案數','報告內容','更新時間'];

function 升級_v3_4_封版與影響範圍表() {
  v3_4_建立表與欄位_(V3_4_Commit影響範圍表, V3_4_Commit影響欄位, '#0f766e');
  v3_4_建立表與欄位_(V3_4_封版報告表, V3_4_封版欄位, '#b45309');
  v3_4_補GitHub對照欄位_();
  return { 成功: true, 版本: 'v3.4.0', 訊息: 'v3.4 封版、Issue 回寫與 Commit 影響範圍表已建立/更新' };
}

function 重測失敗_v3_4_再開修補任務(重測編號) {
  if (typeof 升級_v3_1_上線測試錯誤表 === 'function') 升級_v3_1_上線測試錯誤表();
  const retests = 表格轉物件_('00_修補重測清單');
  const row = retests.find(x => String(x['重測編號']) === String(重測編號));
  if (!row) return { 成功: false, 訊息: '找不到重測編號：' + 重測編號 };
  if (String(row['重測狀態'] || '') !== '失敗') return { 成功: false, 訊息: '此重測項目不是失敗狀態，不建立新修補任務' };

  const errId = 'REERR-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
  const err = {
    錯誤編號: errId,
    回報時間: new Date(),
    來源頁面: 'retest-board.html',
    測試類型: '重測失敗',
    測試項目: row['重測項目'] || '',
    錯誤等級: '高',
    錯誤狀態: '待判斷',
    錯誤訊息: row['重測結果'] || '重測失敗，需要再開修補任務',
    GAS網址: '',
    使用者: '',
    備註: '由重測失敗自動再開，來源重測編號：' + 重測編號,
    原始資料: JSON.stringify(row),
    更新時間: new Date()
  };
  v3_4_追加物件列_('00_上線測試錯誤回報', err);
  const task = 建立_v3_1_上線修補任務_(err);
  return { 成功: true, 版本: 'v3.4.0', 訊息: '重測失敗已再開修補任務', 來源重測編號: 重測編號, 錯誤編號: errId, 修補任務: task };
}

function 掃描_v3_4_重測失敗自動再開修補任務() {
  const retests = 表格轉物件_('00_修補重測清單');
  const tasks = 表格轉物件_('00_上線修補任務');
  const opened = [];
  retests.filter(x => String(x['重測狀態'] || '') === '失敗').forEach(r => {
    const existed = tasks.some(t => String(t['問題摘要'] || '').includes(String(r['重測編號'])) || String(t['來源錯誤編號'] || '').includes(String(r['重測編號'])));
    if (!existed) opened.push(重測失敗_v3_4_再開修補任務(r['重測編號']));
  });
  return { 成功: true, 版本: 'v3.4.0', 新開修補數: opened.length, 結果: opened };
}

function 同步_v3_4_GitHubIssue狀態(Issue編號) {
  升級_v3_4_封版與影響範圍表();
  const repo = v3_4_讀設定_('GITHUB_REPO_FULL_NAME') || 'qhero70/smart-factory-worker-app';
  const token = v3_4_讀設定_('GITHUB_TOKEN');
  if (!Issue編號) return { 成功: false, 訊息: '缺少 Issue 編號' };
  if (!token) return { 成功: false, 訊息: '尚未設定 GITHUB_TOKEN，無法查詢 GitHub Issue 狀態' };
  const url = 'https://api.github.com/repos/' + repo + '/issues/' + Issue編號;
  const res = UrlFetchApp.fetch(url, { method: 'get', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true });
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText() || '{}');
  if (code < 200 || code >= 300) return { 成功: false, 狀態碼: code, 回應: body };
  v3_4_更新Issue對照列_(Issue編號, body);
  return { 成功: true, 版本: 'v3.4.0', Issue編號, Issue狀態: body.state, Issue網址: body.html_url, 標題: body.title, 更新時間: body.updated_at };
}

function 同步_v3_4_全部GitHubIssue狀態() {
  const list = 表格轉物件_('00_修補GitHub對照').filter(x => x['Issue編號']);
  const result = list.map(x => 同步_v3_4_GitHubIssue狀態(x['Issue編號']));
  return { 成功: true, 版本: 'v3.4.0', 同步數: result.length, 結果: result };
}

function 比對_v3_4_單一Commit影響範圍(CommitSHA) {
  升級_v3_4_封版與影響範圍表();
  const repo = v3_4_讀設定_('GITHUB_REPO_FULL_NAME') || 'qhero70/smart-factory-worker-app';
  const token = v3_4_讀設定_('GITHUB_TOKEN');
  if (!CommitSHA) return { 成功: false, 訊息: '缺少 CommitSHA' };
  if (!token) return { 成功: false, 訊息: '尚未設定 GITHUB_TOKEN，無法查詢 Commit 影響範圍' };
  const url = 'https://api.github.com/repos/' + repo + '/commits/' + CommitSHA;
  const res = UrlFetchApp.fetch(url, { method: 'get', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true });
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText() || '{}');
  if (code < 200 || code >= 300) return { 成功: false, 狀態碼: code, 回應: body };
  const files = body.files || [];
  files.forEach(f => v3_4_寫入Commit影響_(repo, '單一Commit', '', '', CommitSHA, f));
  return { 成功: true, 版本: 'v3.4.0', CommitSHA, 影響檔案數: files.length, 檔案: files.map(f => ({ 檔案路徑: f.filename, 變更狀態: f.status, 新增行: f.additions, 刪除行: f.deletions, 變更行: f.changes })) };
}

function 比對_v3_4_Commit影響範圍(BaseSHA, HeadSHA) {
  升級_v3_4_封版與影響範圍表();
  const repo = v3_4_讀設定_('GITHUB_REPO_FULL_NAME') || 'qhero70/smart-factory-worker-app';
  const token = v3_4_讀設定_('GITHUB_TOKEN');
  if (!BaseSHA || !HeadSHA) return { 成功: false, 訊息: '缺少 BaseSHA 或 HeadSHA' };
  if (!token) return { 成功: false, 訊息: '尚未設定 GITHUB_TOKEN，無法比對 Commit 影響範圍' };
  const url = 'https://api.github.com/repos/' + repo + '/compare/' + BaseSHA + '...' + HeadSHA;
  const res = UrlFetchApp.fetch(url, { method: 'get', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true });
  const code = res.getResponseCode();
  const body = JSON.parse(res.getContentText() || '{}');
  if (code < 200 || code >= 300) return { 成功: false, 狀態碼: code, 回應: body };
  const files = body.files || [];
  files.forEach(f => v3_4_寫入Commit影響_(repo, '區間比對', BaseSHA, HeadSHA, '', f));
  return { 成功: true, 版本: 'v3.4.0', BaseSHA, HeadSHA, 狀態: body.status, ahead_by: body.ahead_by, behind_by: body.behind_by, 影響檔案數: files.length, 檔案: files.map(f => ({ 檔案路徑: f.filename, 變更狀態: f.status, 新增行: f.additions, 刪除行: f.deletions, 變更行: f.changes })) };
}

function 產生_v3_4_正式上線封版報告() {
  升級_v3_4_封版與影響範圍表();
  const d = 取得_v3_3_修補完成率儀表板資料();
  const s = d.統計;
  const impacts = 表格轉物件_(V3_4_Commit影響範圍表);
  const 未完成 = (d.修補任務 || []).filter(x => x['修補狀態'] !== '完成');
  const 重測失敗 = (d.重測清單 || []).filter(x => x['重測狀態'] === '失敗');
  const status = 未完成.length === 0 && 重測失敗.length === 0 ? '可封版' : '暫不封版';
  const text = `【智慧製造中央作戰指揮中心｜正式上線封版報告】\n\n系統版本：v3.4.0\n封版狀態：${status}\n建立時間：${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss')}\n\n一、修補總覽\n錯誤總數：${s.錯誤總數}\n修補任務總數：${s.修補任務總數}\n修補完成：${s.修補完成}\n修補未完成：${s.修補未完成}\n修補完成率：${s.修補完成率}%\n\n二、重測總覽\n重測總數：${s.重測總數}\n重測通過：${s.重測通過}\n重測失敗：${s.重測失敗}\n重測待測：${s.重測待測}\n重測通過率：${s.重測通過率}%\n\n三、GitHub 與 Commit 證據\nGitHub 對照數：${s.GitHub對照數}\nCommit 影響檔案數：${impacts.length}\n\n四、封版判斷\n${status === '可封版' ? '目前沒有未完成修補任務與重測失敗項目，可進入正式封版。' : '仍有未完成修補任務或重測失敗項目，暫不建議封版。'}\n\n五、未完成修補任務\n${未完成.slice(0, 20).map((x, i) => `${i + 1}. ${x['優先級']}｜${x['修補類型']}｜${x['修補狀態']}｜${x['問題摘要']}`).join('\n') || '無'}\n\n六、重測失敗項目\n${重測失敗.slice(0, 20).map((x, i) => `${i + 1}. ${x['修補編號']}｜${x['重測項目']}｜${x['重測結果'] || ''}`).join('\n') || '無'}\n\n七、建議\n1. 若封版狀態為「暫不封版」，請先處理高優先修補任務。\n2. 重測失敗項目請用 retest-board 或 fix-board 再開修補任務。\n3. 封版前請回 system-test.html 執行全部測試。`;
  const row = {
    封版編號: 'REL-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    建立時間: new Date(),
    系統版本: 'v3.4.0',
    封版狀態: status,
    錯誤總數: s.錯誤總數,
    修補任務總數: s.修補任務總數,
    修補完成率: s.修補完成率,
    重測總數: s.重測總數,
    重測通過率: s.重測通過率,
    未完成數: 未完成.length,
    重測失敗數: 重測失敗.length,
    GitHub對照數: s.GitHub對照數,
    Commit影響檔案數: impacts.length,
    報告內容: text,
    更新時間: new Date()
  };
  v3_4_追加物件列_(V3_4_封版報告表, row);
  return { 成功: true, 版本: 'v3.4.0', 封版狀態: status, 封版編號: row.封版編號, 報告: text };
}

function 取得_v3_4_封版總覽() {
  升級_v3_4_封版與影響範圍表();
  return {
    成功: true,
    版本: 'v3.4.0',
    封版報告: 表格轉物件_(V3_4_封版報告表).slice(-50).reverse(),
    Commit影響範圍: 表格轉物件_(V3_4_Commit影響範圍表).slice(-200).reverse()
  };
}

function v3_4_寫入Commit影響_(repo, type, base, head, commit, f) {
  v3_4_追加物件列_(V3_4_Commit影響範圍表, {
    影響編號: 'IMP-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100),
    建立時間: new Date(),
    比對類型: type,
    GitHub倉庫: repo,
    BaseSHA: base || '',
    HeadSHA: head || '',
    CommitSHA: commit || '',
    檔案路徑: f.filename || '',
    變更狀態: f.status || '',
    新增行: f.additions || 0,
    刪除行: f.deletions || 0,
    變更行: f.changes || 0,
    檔案URL: f.blob_url || '',
    備註: '',
    更新時間: new Date()
  });
}

function v3_4_更新Issue對照列_(issueNo, body) {
  const ss = 取得試算表_();
  const sh = ss.getSheetByName('00_修補GitHub對照');
  if (!sh) return;
  const data = sh.getDataRange().getValues();
  const h = data[0];
  const idx = {}; h.forEach((x, i) => idx[x] = i);
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idx['Issue編號']]) === String(issueNo)) {
      if (idx['Issue狀態'] !== undefined) sh.getRange(r + 1, idx['Issue狀態'] + 1).setValue(body.state || '');
      if (idx['Issue標籤'] !== undefined) sh.getRange(r + 1, idx['Issue標籤'] + 1).setValue((body.labels || []).map(x => x.name).join(','));
      if (idx['Issue更新時間'] !== undefined) sh.getRange(r + 1, idx['Issue更新時間'] + 1).setValue(body.updated_at || '');
      if (idx['回寫時間'] !== undefined) sh.getRange(r + 1, idx['回寫時間'] + 1).setValue(new Date());
    }
  }
}

function v3_4_補GitHub對照欄位_() {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName('00_修補GitHub對照');
  if (!sh && typeof 升級_v3_2_修補GitHub與重測表 === 'function') {
    升級_v3_2_修補GitHub與重測表();
    sh = ss.getSheetByName('00_修補GitHub對照');
  }
  if (!sh) return;
  const need = ['Issue狀態','Issue標籤','Issue更新時間','回寫時間'];
  const h = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  need.forEach(x => { if (!h.includes(x)) sh.getRange(1, sh.getLastColumn() + 1).setValue(x); });
}

function v3_4_建立表與欄位_(表名, 欄位, color) {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName(表名);
  if (!sh) sh = ss.insertSheet(表名);
  const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  欄位.forEach(h => { if (!現有.includes(h)) sh.getRange(1, sh.getLastColumn() + 1).setValue(h); });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#0f766e').setFontColor('#ffffff');
}

function v3_4_追加物件列_(表名, obj) {
  const sh = 取得試算表_().getSheetByName(表名);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(header.map(h => obj[h] !== undefined ? obj[h] : ''));
}

function v3_4_讀設定_(key) {
  try {
    const list = 表格轉物件_('00_系統設定');
    const r = list.find(x => String(x['設定項目'] || x['項目'] || x['Key']) === String(key));
    return r ? (r['設定值'] || r['數值'] || r['Value'] || '') : '';
  } catch (e) { return ''; }
}
