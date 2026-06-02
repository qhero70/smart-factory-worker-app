/**
 * v3.7.0 GitHub Release Tag、正式總包對照、部署後 7 日觀察報告與健康異常自動修補工具
 * 用途：建立 GitHub Release 對照、產生部署後 7 日觀察報告、健康異常自動建立修補任務。
 * 使用方式：與 v3_6 工具放同一個 Apps Script 專案。
 */

const V3_7_Release對照表 = '00_GitHubRelease對照';
const V3_7_觀察報告表 = '00_部署後7日觀察報告';
const V3_7_健康異常修補表 = '00_健康異常修補紀錄';

const V3_7_Release欄位 = ['Release編號','建立時間','系統版本','GitHub倉庫','Tag名稱','Release名稱','Release狀態','Release網址','目標CommitSHA','正式總包編號','正式總包檔案','正式總包連結','備註','更新時間'];
const V3_7_觀察欄位 = ['觀察編號','建立時間','系統版本','觀察起日','觀察迄日','觀察天數','健康檢查次數','正常次數','異常次數','最近健康狀態','未完成修補數','重測失敗數','觀察結論','報告內容','更新時間'];
const V3_7_健康異常欄位 = ['異常編號','建立時間','來源健康紀錄編號','健康狀態','錯誤摘要','已建立錯誤回報','錯誤編號','修補編號','處理狀態','備註','更新時間'];

function 升級_v3_7_Release觀察與異常修補表() {
  v3_7_建立表與欄位_(V3_7_Release對照表, V3_7_Release欄位, '#0369a1');
  v3_7_建立表與欄位_(V3_7_觀察報告表, V3_7_觀察欄位, '#7c3aed');
  v3_7_建立表與欄位_(V3_7_健康異常修補表, V3_7_健康異常欄位, '#be123c');
  return { 成功: true, 版本: 'v3.7.0', 訊息: 'v3.7 Release、7日觀察與異常修補表已建立/更新' };
}

function 建立_v3_7_GitHubReleaseTag(資料) {
  升級_v3_7_Release觀察與異常修補表();
  資料 = 資料 || {};
  const repo = v3_7_讀設定_('GITHUB_REPO_FULL_NAME') || 'qhero70/smart-factory-worker-app';
  const token = v3_7_讀設定_('GITHUB_TOKEN');
  const tag = 資料.Tag名稱 || 'v3.7.0';
  const name = 資料.Release名稱 || '智慧製造中央作戰指揮中心 ' + tag;
  const sha = 資料.目標CommitSHA || '';
  const latestPkg = v3_7_最新總包_();
  const body = `正式上線總包：${latestPkg['檔名'] || ''}\n總包連結：${latestPkg['檔案連結'] || ''}\n\n版本內容：\n- GitHub Release Tag 對照\n- 正式總包對照\n- 部署後 7 日觀察報告\n- 健康異常自動建立修補任務`;

  if (!token) {
    const row = v3_7_寫Release對照_({ repo, tag, name, status: '草稿', url: '', sha, pkg: latestPkg, note: '未設定 GITHUB_TOKEN，僅產生 Release 草稿' });
    return { 成功: true, 版本: 'v3.7.0', 訊息: '未設定 GITHUB_TOKEN，已建立 Release 草稿對照', Release草稿: { tag_name: tag, name, body }, 對照紀錄: row };
  }

  const payload = { tag_name: tag, name, body, draft: false, prerelease: false };
  if (sha) payload.target_commitish = sha;
  const res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/releases', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  const out = JSON.parse(res.getContentText() || '{}');
  if (code < 200 || code >= 300) {
    const row = v3_7_寫Release對照_({ repo, tag, name, status: '建立失敗', url: '', sha, pkg: latestPkg, note: JSON.stringify(out).slice(0, 300) });
    return { 成功: false, 版本: 'v3.7.0', 狀態碼: code, 回應: out, 對照紀錄: row };
  }
  const row = v3_7_寫Release對照_({ repo, tag, name, status: '已建立', url: out.html_url || '', sha, pkg: latestPkg, note: '' });
  return { 成功: true, 版本: 'v3.7.0', 訊息: 'GitHub Release 已建立', Release網址: out.html_url, 對照紀錄: row };
}

function 產生_v3_7_部署後7日觀察報告() {
  升級_v3_7_Release觀察與異常修補表();
  const today = new Date();
  const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const health = 表格轉物件_('00_部署後健康檢查紀錄').filter(x => {
    const d = new Date(x['執行時間']);
    return d >= start && d <= today;
  });
  const tasks = 表格轉物件_('00_上線修補任務');
  const retests = 表格轉物件_('00_修補重測清單');
  const normal = health.filter(x => x['健康狀態'] === '正常').length;
  const abnormal = health.filter(x => x['健康狀態'] === '異常').length;
  const unfinished = tasks.filter(x => x['修補狀態'] !== '完成').length;
  const retestFail = retests.filter(x => x['重測狀態'] === '失敗').length;
  const latestStatus = health.length ? health[health.length - 1]['健康狀態'] : '尚未執行';
  const conclusion = abnormal === 0 && unfinished === 0 && retestFail === 0 ? '觀察穩定，可維持正式上線' : '仍需追蹤異常與未完成修補';
  const text = `【智慧製造中央作戰指揮中心｜部署後7日觀察報告】\n\n系統版本：v3.7.0\n觀察區間：${Utilities.formatDate(start, 'Asia/Taipei', 'yyyy-MM-dd')}～${Utilities.formatDate(today, 'Asia/Taipei', 'yyyy-MM-dd')}\n健康檢查次數：${health.length}\n正常次數：${normal}\n異常次數：${abnormal}\n最近健康狀態：${latestStatus}\n未完成修補數：${unfinished}\n重測失敗數：${retestFail}\n\n觀察結論：${conclusion}\n\n建議：\n1. 若有異常，請執行「健康異常自動修補」。\n2. 若未完成修補數大於 0，請回到 fix-board 處理。\n3. 若重測失敗數大於 0，請回到 retest-board 或 release-board 再開修補。`;
  const row = {
    觀察編號: 'OBS-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    建立時間: new Date(), 系統版本: 'v3.7.0',
    觀察起日: Utilities.formatDate(start, 'Asia/Taipei', 'yyyy-MM-dd'),
    觀察迄日: Utilities.formatDate(today, 'Asia/Taipei', 'yyyy-MM-dd'),
    觀察天數: 7, 健康檢查次數: health.length, 正常次數: normal, 異常次數: abnormal,
    最近健康狀態: latestStatus, 未完成修補數: unfinished, 重測失敗數: retestFail,
    觀察結論: conclusion, 報告內容: text, 更新時間: new Date()
  };
  v3_7_追加物件列_(V3_7_觀察報告表, row);
  return { 成功: true, 版本: 'v3.7.0', 觀察結論: conclusion, 報告: text, 紀錄: row };
}

function 掃描_v3_7_健康異常自動建立修補任務() {
  升級_v3_7_Release觀察與異常修補表();
  if (typeof 升級_v3_1_上線測試錯誤表 === 'function') 升級_v3_1_上線測試錯誤表();
  const health = 表格轉物件_('00_部署後健康檢查紀錄').filter(x => x['健康狀態'] === '異常');
  const existed = 表格轉物件_(V3_7_健康異常修補表);
  const out = [];
  health.forEach(h => {
    const id = h['紀錄編號'];
    if (existed.some(x => String(x['來源健康紀錄編號']) === String(id))) return;
    const errId = 'HEALTH-ERR-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    const err = {
      錯誤編號: errId, 回報時間: new Date(), 來源頁面: 'delivery-board.html',
      測試類型: '部署後健康檢查', 測試項目: '每日健康檢查異常', 錯誤等級: '高', 錯誤狀態: '待判斷',
      錯誤訊息: h['錯誤訊息'] || h['系統總檢查結果'] || '部署後健康檢查異常',
      GAS網址: '', 使用者: '', 備註: '來源健康紀錄：' + id, 原始資料: JSON.stringify(h), 更新時間: new Date()
    };
    v3_7_追加物件列_('00_上線測試錯誤回報', err);
    const task = typeof 建立_v3_1_上線修補任務_ === 'function' ? 建立_v3_1_上線修補任務_(err) : null;
    const row = {
      異常編號: 'ABN-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
      建立時間: new Date(), 來源健康紀錄編號: id, 健康狀態: h['健康狀態'],
      錯誤摘要: String(err.錯誤訊息).slice(0, 300), 已建立錯誤回報: '是', 錯誤編號: errId,
      修補編號: task && task['修補編號'] ? task['修補編號'] : '', 處理狀態: '已開修補', 備註: '', 更新時間: new Date()
    };
    v3_7_追加物件列_(V3_7_健康異常修補表, row);
    out.push(row);
  });
  return { 成功: true, 版本: 'v3.7.0', 新增修補數: out.length, 結果: out };
}

function 取得_v3_7_Release觀察總覽() {
  升級_v3_7_Release觀察與異常修補表();
  const rel = 表格轉物件_(V3_7_Release對照表);
  const obs = 表格轉物件_(V3_7_觀察報告表);
  const abn = 表格轉物件_(V3_7_健康異常修補表);
  return { 成功: true, 版本: 'v3.7.0', 統計: { Release數: rel.length, 觀察報告數: obs.length, 健康異常修補數: abn.length }, Release對照: rel.slice(-50).reverse(), 觀察報告: obs.slice(-50).reverse(), 健康異常修補: abn.slice(-100).reverse() };
}

function v3_7_寫Release對照_(o) {
  const row = {
    Release編號: 'REL-GH-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss'),
    建立時間: new Date(), 系統版本: 'v3.7.0', GitHub倉庫: o.repo || '', Tag名稱: o.tag || '', Release名稱: o.name || '',
    Release狀態: o.status || '', Release網址: o.url || '', 目標CommitSHA: o.sha || '',
    正式總包編號: o.pkg ? o.pkg['總包編號'] || '' : '', 正式總包檔案: o.pkg ? o.pkg['檔名'] || '' : '', 正式總包連結: o.pkg ? o.pkg['檔案連結'] || '' : '',
    備註: o.note || '', 更新時間: new Date()
  };
  v3_7_追加物件列_(V3_7_Release對照表, row);
  return row;
}

function v3_7_最新總包_() {
  try {
    const list = 表格轉物件_('00_正式交付總包紀錄').filter(x => x['總包類型'] === '正式上線總包ZIP');
    return list[list.length - 1] || {};
  } catch (e) { return {}; }
}

function v3_7_讀設定_(key) {
  try {
    const list = 表格轉物件_('00_系統設定');
    const r = list.find(x => String(x['設定項目'] || x['項目'] || x['Key']) === String(key));
    return r ? (r['設定值'] || r['數值'] || r['Value'] || '') : '';
  } catch (e) { return ''; }
}

function v3_7_建立表與欄位_(表名, 欄位, color) {
  const ss = 取得試算表_();
  let sh = ss.getSheetByName(表名);
  if (!sh) sh = ss.insertSheet(表名);
  const 現有 = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].filter(String);
  欄位.forEach(h => { if (!現有.includes(h)) sh.getRange(1, sh.getLastColumn() + 1).setValue(h); });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground(color || '#0f766e').setFontColor('#ffffff');
}

function v3_7_追加物件列_(表名, obj) {
  const sh = 取得試算表_().getSheetByName(表名);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(header.map(h => obj[h] !== undefined ? obj[h] : ''));
}
